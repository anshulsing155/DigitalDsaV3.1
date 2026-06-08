/**
 * Free-trial abuse-defense module
 * ══════════════════════════════════════════════════════════════════════
 * Enforces ONE-TRIAL-PER-DSA across three identifiers (mobile, PAN, GST)
 * via the `TrialIdentifierBlocklist` collection.
 *
 * Why three identifiers (defense-in-depth): any single one can be gamed
 * by a determined abuser. The combination is what makes the gate solid —
 * faking all three at once requires actual identity fraud, which is the
 * bank's KYC problem to solve, not ours.
 *
 *   - Mobile catches the obvious case (same person, same phone)
 *   - PAN catches the "use a different phone" case
 *   - GST catches the "I changed my PAN but it's the same business" case
 *
 * Identifiers are stored HASHED (SHA-256 with a server-side pepper) so
 * the collection can be queried without holding a second plaintext copy
 * of PII. The pepper comes from env var `TRIAL_PEPPER`; in non-prod we
 * fall back to a hardcoded dev pepper with a warning so local development
 * works without env setup. Prod MUST set this — see the `getPepper()`
 * comment for why hardcoding the prod pepper is rejected.
 *
 * Spec: D-1-RECURRING-BILLING-SPEC.md §4 S8 (skipped) addendum (trial)
 * ══════════════════════════════════════════════════════════════════════
 */

import { createHash } from 'node:crypto';
import { ObjectId, type ObjectId as MObjectId } from 'mongodb';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { DsaApplications, TrialIdentifierBlocklist } from '$lib/database/mongo';
import logger from '$lib/server/logger';

// ── Pepper resolution ─────────────────────────────────────────────────

/**
 * Returns the server-side pepper used as a salt for SHA-256(value || pepper).
 *
 * Production: requires env var `TRIAL_PEPPER` to be set. If missing, we
 * THROW because silently falling back to a known-default in prod would
 * make the blocklist forgeable (anyone who knows our default could
 * pre-compute matching hashes).
 *
 * Dev / test: falls back to a stable dev pepper so local flows work
 * without env setup. We emit a one-time warning on first use.
 *
 * Not exported — the only consumer is `hashIdentifier()` below.
 */
let warnedAboutDevPepper = false;
function getPepper(): string {
	const fromEnv = env.TRIAL_PEPPER;
	if (fromEnv && fromEnv.length >= 16) return fromEnv;

	if (dev) {
		if (!warnedAboutDevPepper) {
			logger.warn(
				'TRIAL_PEPPER not set (or <16 chars) — falling back to dev pepper. ' +
					'Set TRIAL_PEPPER in .env for production. This warning fires once per process.'
			);
			warnedAboutDevPepper = true;
		}
		return 'ddsa-trial-dev-pepper-do-not-use-in-prod';
	}

	// Production with missing/short pepper is a misconfiguration — fail
	// fast rather than silently using a guessable default.
	throw new Error(
		'TRIAL_PEPPER env var must be set to at least 16 chars in production. ' +
			'See src/lib/server/billing/trialEligibility.ts for context.'
	);
}

// ── Identifier normalization ──────────────────────────────────────────

/** All identifier kinds the trial gate recognizes. */
export type IdentifierKind = 'mobile' | 'pan' | 'gst' | 'device';

/**
 * Normalize a raw value (mobile / PAN / GST / device) into the canonical
 * form we hash. Cross-DSA matching depends on this — if one DSA stores
 * "AAAAA1234A" and another "aaaaa1234a", we want both to produce the
 * same hash.
 *
 *   - Whitespace stripped
 *   - Uppercased (PAN + GST are case-insensitive by spec)
 *   - Non-digit chars stripped from mobile (handles +91/0 prefix, dashes)
 *   - Mobile reduced to 10 digits — strip the country code if it's there
 *   - Device IDs are UUIDv4 (lowercase, hyphenated) — normalized to lowercase
 *     + whitespace-stripped; length floor 16 to reject obviously-bogus input
 *
 * Returns null when normalization would yield an empty / too-short string,
 * which lets callers decide what to do (e.g., PAN missing → ineligible,
 * GST missing → just skip that identifier, device missing → gate falls
 * back to 3-identifier mode).
 */
export function normalizeIdentifier(
	kind: IdentifierKind,
	raw: string | number | null | undefined
): string | null {
	if (raw === null || raw === undefined) return null;
	const asStr = String(raw).trim();
	if (asStr.length === 0) return null;

	if (kind === 'mobile') {
		// Strip everything except digits. Indian mobile = 10 digits;
		// if we have 11+ digits assume a country code is prefixed and
		// keep only the LAST 10 (more reliable than detecting +91).
		const digits = asStr.replace(/\D/g, '');
		const last10 = digits.length > 10 ? digits.slice(-10) : digits;
		return last10.length === 10 ? last10 : null;
	}

	if (kind === 'pan') {
		// PAN format: 5 letters + 4 digits + 1 letter. Uppercase, no whitespace.
		const cleaned = asStr.replace(/\s+/g, '').toUpperCase();
		// Be permissive at the normalization layer — the caller is responsible
		// for validity. We just want a stable hash input.
		return cleaned.length >= 10 ? cleaned : null;
	}

	if (kind === 'gst') {
		// GSTIN format: 15 alphanumeric chars. Uppercase, no whitespace.
		const cleaned = asStr.replace(/\s+/g, '').toUpperCase();
		return cleaned.length >= 15 ? cleaned : null;
	}

	if (kind === 'device') {
		// Client-supplied UUID. Lowercase canonicalization so a client that
		// sent "ABCD-..." doesn't mismatch the stored hash of "abcd-...".
		// Length floor 16 rejects obviously-bogus input (true UUIDv4 = 36 chars).
		const cleaned = asStr.replace(/\s+/g, '').toLowerCase();
		return cleaned.length >= 16 ? cleaned : null;
	}

	return null;
}

// ── Hashing ────────────────────────────────────────────────────────────

/**
 * SHA-256(normalized_value || pepper) → 64-char lowercase hex.
 * Returns null when the value couldn't be normalized.
 *
 * Exported so the admin override endpoint can compute a hash for a
 * specific identifier when revoking an entry.
 */
export function hashIdentifier(
	kind: IdentifierKind,
	raw: string | number | null | undefined
): string | null {
	const normalized = normalizeIdentifier(kind, raw);
	if (!normalized) return null;
	return createHash('sha256').update(normalized + getPepper()).digest('hex');
}

// ── Eligibility check ──────────────────────────────────────────────────

export interface TrialEligibilityResult {
	eligible: boolean;
	/**
	 * When `eligible: false`, which identifier matched a prior trial.
	 *
	 * For the 3 PII identifiers (mobile / pan / gst) the value is surfaced
	 * to admin tooling ONLY — not to the DSA, because leaking which one
	 * matched teaches abusers what to change. For `'device'`, the value
	 * IS exposed to the DSA via the friendly note ("this device has been
	 * used for a free trial") — that's already obvious to them since they
	 * are using the device, so no info is leaked.
	 */
	blockingIdentifier?: IdentifierKind;
	/**
	 * When `eligible: false` and `blockingIdentifier` set, the dsa_id that
	 * originally claimed this identifier. Useful for support / fraud
	 * investigation; never surfaced to DSAs.
	 */
	originalClaimDsaId?: MObjectId;
	/**
	 * When `eligible: false` for a REASON other than blocklist match
	 * (missing PAN, deleted DSA doc, etc.) — sets this with a stable
	 * code so the UI can render the right hint.
	 *
	 *   - 'pan_missing'  — DSA hasn't completed onboarding yet
	 *   - 'dsa_not_found' — locals.user out of sync with DsaApplications
	 */
	reason?: 'pan_missing' | 'dsa_not_found';
}

export interface CheckTrialEligibilityOptions {
	/**
	 * Client-supplied device ID (UUIDv4 from localStorage / sessionStorage).
	 * Optional — omit when the client couldn't generate one (incognito mode,
	 * locked-down corporate browser, server-to-server call). When omitted,
	 * the gate falls back to the 3 PII identifiers only.
	 */
	device_id?: string | null;
}

/**
 * Decide whether a DSA can claim a new trial. Reads their identifiers
 * from `DsaApplications`, hashes them, and checks the blocklist.
 *
 * Returns `{ eligible: true }` ONLY when all of these hold:
 *   - DSA doc exists in `DsaApplications` (locals.user is in sync)
 *   - DSA has a `panNumber` (we treat PAN as required for trial — see
 *     §4 S8 cleanup notes; mobile-only would be too easy to game)
 *   - No matching hash exists in the blocklist for mobile / PAN / GST
 *
 * Performance: 1 DSA read + up to 3 indexed blocklist reads. Safe to
 * call inline from a request handler.
 */
export async function checkTrialEligibility(
	dsa_id: MObjectId | string,
	options: CheckTrialEligibilityOptions = {}
): Promise<TrialEligibilityResult> {
	const id = typeof dsa_id === 'string' ? new ObjectId(dsa_id) : dsa_id;

	const dsa = await DsaApplications.findOne(
		{ _id: id },
		{ projection: { mobileNumber: 1, panNumber: 1, gstNumber: 1 } }
	);
	if (!dsa) {
		return { eligible: false, reason: 'dsa_not_found' };
	}

	const mobileHash = hashIdentifier('mobile', dsa.mobileNumber);
	const panHash = hashIdentifier('pan', dsa.panNumber);
	const gstHash = hashIdentifier('gst', dsa.gstNumber);
	const deviceHash = hashIdentifier('device', options.device_id);

	// PAN required — without it the trial gate is too weak. We surface
	// this to the UI so the DSA gets a clear "complete onboarding to start
	// trial" prompt rather than a confusing silent denial.
	if (!panHash) {
		return { eligible: false, reason: 'pan_missing' };
	}

	// Check each identifier in turn. Order = PII first (mobile/PAN/GST),
	// device last. Rationale: PII identifiers are stronger signals (they're
	// tied to identity); device is an additional "lazy abuser" layer.
	// Returning the first PII match (instead of falling through to device)
	// keeps the admin-side `originalClaimDsaId` pointing at the right row.
	const checks: Array<{ kind: IdentifierKind; hash: string | null }> = [
		{ kind: 'mobile', hash: mobileHash },
		{ kind: 'pan', hash: panHash },
		{ kind: 'gst', hash: gstHash },
		{ kind: 'device', hash: deviceHash }
	];

	for (const { kind, hash } of checks) {
		if (!hash) continue; // GST + device are optional — skip if missing
		const existing = await TrialIdentifierBlocklist.findOne({
			identifier_kind: kind,
			identifier_hash: hash,
			revoked_at: { $exists: false } // admin overrides set revoked_at
		});
		if (existing) {
			return {
				eligible: false,
				blockingIdentifier: kind,
				originalClaimDsaId: existing.dsa_id
			};
		}
	}

	return { eligible: true };
}

// ── Grant recording ────────────────────────────────────────────────────

export interface RecordTrialGrantOptions {
	dsa_id: MObjectId | string;
	source?: 'auto' | 'admin_override';
	override_audit_id?: MObjectId;
	/**
	 * Client-supplied device ID (raw, unhashed) captured at subscribe-click
	 * time. Webhook handler passes this from the pending sub's
	 * `pending_device_id_hash` field — except we DON'T pass plaintext via
	 * the sub doc, we pass the already-computed hash via the alternate
	 * `device_id_hash` field below. Keeping both forms so callers can use
	 * whichever they have at hand.
	 */
	device_id?: string | null;
	/**
	 * Pre-computed hash. Use when the caller already has the hash (e.g.
	 * webhook reading `pending_device_id_hash` off the sub doc). Mutually
	 * exclusive with `device_id` — if both are provided, `device_id_hash`
	 * wins.
	 */
	device_id_hash?: string | null;
}

/**
 * Insert blocklist rows for every identifier this DSA has at grant time.
 * Called from the mandate-authorized webhook handler ONLY when the
 * subscription was created as a trial (`is_trial: true`).
 *
 * Idempotency: the unique compound index `(identifier_kind, identifier_hash)`
 * means duplicate inserts (e.g., concurrent webhook deliveries) get
 * E11000 — we catch and treat as success. This is safe because the value
 * being inserted is identical (same DSA, same identifier).
 *
 * Returns the count of NEW rows inserted (for observability — typically 3
 * for an auto trial with all 3 identifiers, less if GST is absent).
 */
export async function recordTrialGrant(
	options: RecordTrialGrantOptions
): Promise<{ inserted: number }> {
	const id = typeof options.dsa_id === 'string' ? new ObjectId(options.dsa_id) : options.dsa_id;

	const dsa = await DsaApplications.findOne(
		{ _id: id },
		{ projection: { mobileNumber: 1, panNumber: 1, gstNumber: 1 } }
	);
	if (!dsa) {
		logger.error(
			{ dsa_id: id.toString() },
			'recordTrialGrant called with no matching DsaApplications doc — no rows inserted'
		);
		return { inserted: 0 };
	}

	const hashes: Array<{ kind: IdentifierKind; hash: string }> = [];
	const mobileHash = hashIdentifier('mobile', dsa.mobileNumber);
	if (mobileHash) hashes.push({ kind: 'mobile', hash: mobileHash });
	const panHash = hashIdentifier('pan', dsa.panNumber);
	if (panHash) hashes.push({ kind: 'pan', hash: panHash });
	const gstHash = hashIdentifier('gst', dsa.gstNumber);
	if (gstHash) hashes.push({ kind: 'gst', hash: gstHash });

	// Device hash — caller can pass the precomputed hash (cheaper if the
	// webhook handler already has it persisted on the sub doc) OR pass the
	// raw device_id and let this helper compute it.
	const deviceHash =
		options.device_id_hash ?? hashIdentifier('device', options.device_id);
	if (deviceHash) hashes.push({ kind: 'device', hash: deviceHash });

	const now = new Date();
	let inserted = 0;
	for (const { kind, hash } of hashes) {
		try {
			await TrialIdentifierBlocklist.insertOne({
				identifier_kind: kind,
				identifier_hash: hash,
				dsa_id: id,
				granted_at: now,
				source: options.source ?? 'auto',
				...(options.override_audit_id && { override_audit_id: options.override_audit_id })
			});
			inserted++;
		} catch (err) {
			// E11000 duplicate key — another concurrent insert beat us, or this
			// identifier was already on the blocklist (e.g., admin re-grant
			// without revoking). Either way, the gate semantics are preserved
			// (one row exists; future eligibility checks will see it). Logged
			// once for observability.
			const e = err as { code?: number; message?: string };
			if (e.code === 11000) {
				logger.info(
					{ dsa_id: id.toString(), kind },
					'trial blocklist: duplicate key on insert (concurrent or pre-existing) — skipped'
				);
				continue;
			}
			logger.error(
				{ dsa_id: id.toString(), kind, err: e.message },
				'trial blocklist: unexpected insert failure'
			);
			// Don't throw — partial inserts are still useful. The eligibility
			// check on the next attempt will see whatever DID land.
		}
	}

	return { inserted };
}
