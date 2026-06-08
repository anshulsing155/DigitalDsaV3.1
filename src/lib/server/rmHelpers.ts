/**
 * RM (Relationship Manager) server helpers
 * ══════════════════════════════════════════════════════════════════
 * Shared between `+page.server.ts` load functions and `+server.ts`
 * API routes that need the same RM-doc resolution logic. Extracting
 * here avoids duplicating the mobile-number fallback path or
 * importing across `+server.ts` boundaries (anti-pattern in SvelteKit).
 * ══════════════════════════════════════════════════════════════════
 */

import { ObjectId } from 'mongodb';
import { rmApplications } from '$lib/database/mongo.js';
import { findUserByMobile, decryptUserPii, encryptUserPii } from '$lib/server/csfle/index.js';
import { getLenderNameFromDomain } from '$lib/config/lenderDomains.js';
import logger from '$lib/server/logger.js';

/** The client-facing RM profile shape (Settings page + complete-profile API). */
export interface RmProfileView {
	name: string;
	email: string;
	rmOfficialEmail: string;
	workingCity: string;
	bankName: string;
	designation: string;
	mobileNumber: number;
	preferred_language: string;
	profileStatus: 'profile_incomplete' | 'active';
	memberSince: string;
}

/**
 * Map a decrypted rmApplications doc to the client-facing profile shape.
 * Single source of truth so the Settings load and the complete-profile
 * endpoint never drift apart.
 */
export function shapeRmProfile(rmDoc: Record<string, any>): RmProfileView {
	const officialEmail = rmDoc.rmOfficialEmail || rmDoc.officialEmail || '';
	return {
		name: rmDoc.name || '',
		email: rmDoc.email || '',
		rmOfficialEmail: officialEmail,
		workingCity: rmDoc.workingCity || '',
		bankName: rmDoc.bankName || getLenderNameFromDomain(officialEmail) || '',
		designation: rmDoc.designation || '',
		mobileNumber: rmDoc.mobileNumber,
		preferred_language: rmDoc.preferred_language || 'en',
		profileStatus: rmDoc.profileStatus || 'active',
		memberSince: rmDoc.createdAt ? new Date(rmDoc.createdAt).toISOString() : ''
	};
}

/**
 * Resolve an RM document from the auth user. Tries `_id` first
 * (treating `user.id` as an ObjectId string); falls back to mobile-number
 * lookup for legacy users whose `user.id` isn't a valid ObjectId.
 *
 * Returns `null` if no RM document matches — callers should treat
 * that as "RM profile not found" (404 in API responses, empty data
 * in page loads).
 */
export async function resolveRmDoc(user: NonNullable<App.Locals['user']>) {
	try {
		const doc = await rmApplications.findOne({ _id: new ObjectId(user.id) });
		if (doc) return decryptUserPii(doc);
	} catch {
		// `user.id` isn't a valid ObjectId — fall through to mobile lookup.
	}

	// Legacy fallback: some RM users were created with a non-ObjectId `id`
	// but a mobile number that matches the rmApplications document.
	// SEC-2: dual-query helper handles encrypted + plaintext; decrypt
	// for callers that read PII fields (name, email, bankName, etc.).
	const doc = await findUserByMobile(rmApplications, user.mobileNumber);
	return decryptUserPii(doc);
}

/**
 * Ensure an RM document exists for this user, creating a minimal stub if not.
 * (A.1 — auto-provision.) Returns the decrypted RM doc, same shape as
 * `resolveRmDoc`.
 *
 * Why this exists: a user can hold the RM *role* without an `rmApplications`
 * document — an admin-mirror account, or anyone granted RM via `/api/set-role`.
 * Those users used to hit "Profile not found" on their own Settings page. This
 * guarantees a doc exists (real or stub) so the dashboard always has something
 * to render.
 *
 * Idempotent: if a doc already exists (by `_id` or mobile) it's returned
 * untouched. Otherwise a stub is upserted with `profileStatus:
 * 'profile_incomplete'` for the user to complete via the setup form. The
 * upsert + `$setOnInsert` makes concurrent set-role/settings-load calls safe —
 * the second caller matches the first's insert instead of duplicating (and the
 * unique mobileNumber index is the backstop; a dup-key race is caught and
 * re-resolved).
 *
 * The stub is keyed by the user's `_id` when that's a valid ObjectId (so an
 * admin-mirror user's later `_id` lookups succeed) — exactly the dev-account
 * case (9811556664 granted RM via set-role).
 */
export async function ensureRmProfile(user: NonNullable<App.Locals['user']>) {
	const existing = await resolveRmDoc(user);
	if (existing) return existing;

	const now = new Date();
	const mobileNum = Number(user.mobileNumber);

	// Key the stub by _id when possible (admin-mirror id), else by mobile.
	let filter: Record<string, unknown>;
	try {
		filter = { _id: new ObjectId(user.id) };
	} catch {
		filter = { mobileNumber: { $in: [mobileNum, user.mobileNumber] } };
	}

	// name/email are CSFLE-encrypted PII — encrypt before insert (no-op when
	// CSFLE is disabled). Empty strings round-trip cleanly.
	const encryptedPii = await encryptUserPii({ name: '', email: user.email || '' });
	const setOnInsert = {
		...encryptedPii,
		mobileNumber: mobileNum,
		bankName: '',
		workingCity: '',
		designation: '',
		role: 'rm',
		onboardingCompleted: false,
		profileStatus: 'profile_incomplete' as const,
		provisioned_by: 'auto_role_grant' as const,
		usedCoins: 0,
		availableCoins: 0,
		createdAt: now
	};

	try {
		await rmApplications.updateOne(filter, { $setOnInsert: setOnInsert }, { upsert: true });
	} catch (err) {
		// Concurrent insert / unique-mobile dup-key — the doc exists now, fall
		// through to re-resolve rather than fail.
		logger.warn({ err, userId: user.id }, 'ensureRmProfile upsert race — re-resolving');
	}

	return resolveRmDoc(user);
}

/**
 * Create an rmApplications stub for an RM who is NOT on the platform, on an
 * admin's behalf (A.2 / Gap A). Distinct from `ensureRmProfile`, which
 * provisions for the *acting* user — here the admin creates a doc for a third
 * party. Idempotent by mobile: if a doc with this mobile already exists it's
 * reused (returns `isNew: false`) rather than violating the unique index.
 *
 * Mobile is required (the rmApplications.mobileNumber unique index is
 * non-sparse, so stubs can't share a null mobile). name/email are encrypted.
 */
export async function createProxyRmStub(input: {
	name: string;
	bankName: string;
	mobile: number;
	email?: string;
}): Promise<{ rmId: string; rmName: string; isNew: boolean }> {
	const existing = await findUserByMobile(rmApplications, String(input.mobile));
	if (existing?._id) {
		const decrypted = await decryptUserPii(existing);
		return {
			rmId: existing._id.toString(),
			rmName: decrypted?.name || input.name,
			isNew: false
		};
	}

	const now = new Date();
	const encryptedPii = await encryptUserPii({ name: input.name, email: input.email || '' });
	const doc = {
		...encryptedPii,
		mobileNumber: input.mobile,
		bankName: input.bankName,
		workingCity: '',
		designation: '',
		role: 'rm',
		onboardingCompleted: false,
		profileStatus: 'profile_incomplete' as const,
		provisioned_by: 'admin_proxy' as const,
		usedCoins: 0,
		availableCoins: 0,
		createdAt: now
	};
	const res = await rmApplications.insertOne(doc as never);
	return { rmId: res.insertedId.toString(), rmName: input.name, isNew: true };
}

/**
 * Returns the RM's preferred-DSA list as plain strings (not ObjectIds).
 * Empty array if the RM doc doesn't exist or has no preferred DSAs.
 *
 * Used by:
 *   - GET /api/rm/preferred-dsas (API consumer for client mutations)
 *   - /dashboard/rm/dsa-search +page.server.ts (SSR initial load)
 */
export async function getPreferredDsaIds(
	user: NonNullable<App.Locals['user']>
): Promise<string[]> {
	const rmDoc = await resolveRmDoc(user);
	if (!rmDoc?.preferred_dsa_ids) return [];
	return rmDoc.preferred_dsa_ids.map((id: ObjectId) => id.toString());
}
