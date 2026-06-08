/**
 * Admin Parallel Records — auto-create DSA, RM, and All-Lender assignments
 * for admin users.
 *
 * Why: admins need to test every flow (DSA forms, RM policies, RM dashboard,
 * etc.) and "edit any bank's policy" — but the underlying mobile-based
 * lookups (resolveDsaId, rmApplications.findOne) only succeed if a matching
 * record exists at the admin's mobileNumber, and the PMS RM dashboard lists
 * lenders from RmLenderAssignments. Without these, an admin hitting a DSA-
 * only API returns "DSA profile not found" and an admin switching to RM
 * mode lands on an empty dashboard.
 *
 * What this helper does, idempotently:
 *   1. DSA mirror — create DsaApplications doc at admin.mobileNumber if missing
 *   2. RM mirror  — create rmApplications doc at admin.mobileNumber if missing.
 *                   NO email-domain validation runs (admin.email need not
 *                   match any lender domain); bankName is left empty.
 *   3. All-Lenders assignments — for every lender in LENDER_DIRECTORY, ensure
 *                   an RmLenderAssignment row exists with rmUserId = admin._id
 *                   and status='active'. Admin's RM session (locals.user.id =
 *                   admin's _id when in RM mode via top-right switcher) thus
 *                   sees every lender in the RM dashboard.
 *
 *   Both mirrors and assignment rows carry `isAdminMirror: true` for audit
 *   distinguishability from real DSA/RM accounts.
 *
 * Note on PMS route gates: admins ALSO get a route-level bypass via
 * `locals.adminPermissions` (see /api/pms/policies/[id]/+server.ts and
 * siblings). The assignment rows are belt-and-braces — they cover UI
 * consumers that read RmLenderAssignments directly (e.g., dashboard lender
 * lists) and provide a fallback if a new route is added without the bypass.
 *
 * Safe to call repeatedly — existence checks fire first; creation/upsert
 * is idempotent.
 */

import {
	DsaApplications,
	rmApplications,
	RmLenderAssignments
} from '$lib/database/mongo.js';
import { LENDER_DIRECTORY } from '$lib/config/lenderPolicies/lenderDirectory.js';
import logger from '$lib/server/logger.js';
import { findUserByMobile, encryptUserPii } from '$lib/server/csfle/index.js';

interface AdminInfo {
	/** Admin user's MongoDB _id as string — used as rmUserId in assignment rows. */
	adminId: string;
	mobileNumber: number;
	name: string;
	email?: string;
}

interface EnsureResult {
	dsaCreated: boolean;
	rmCreated: boolean;
	lenderAssignmentsCreated: number;
}

export async function ensureAdminParallelRecords(admin: AdminInfo): Promise<EnsureResult> {
	const mobile = Number(admin.mobileNumber);

	let dsaCreated = false;
	let rmCreated = false;
	let lenderAssignmentsCreated = 0;

	// ── DSA mirror ────────────────────────────────────────────────────
	// SEC-2: encrypted-first lookup + encrypted insert.
	const existingDsa = await findUserByMobile(DsaApplications, mobile);
	if (!existingDsa) {
		const now = new Date();
		const dsaDoc = await encryptUserPii({
			name: admin.name || 'Admin',
			email: admin.email || '',
			mobileNumber: mobile,
			role: 'dsa',
			onboardingCompleted: true,
			accountStatus: 'active',
			isAdminMirror: true,
			lastActiveAt: now,
			usedCoins: 0,
			availableCoins: 0,
			createdAt: now,
			updatedAt: now
		});
		await DsaApplications.insertOne(dsaDoc as any);
		dsaCreated = true;
	}

	// ── RM mirror ─────────────────────────────────────────────────────
	const existingRm = await findUserByMobile(rmApplications, mobile);
	if (!existingRm) {
		const now = new Date();
		const rmDoc = await encryptUserPii({
			name: admin.name || 'Admin',
			email: admin.email || '',
			mobileNumber: mobile,
			gender: '',
			age: 0,
			role: 'rm',
			onboardingCompleted: true,
			accountStatus: 'active',
			isAdminMirror: true,
			// Deliberately NO bankName/officialEmail — email-domain auto-derivation
			// does not apply to admins.
			bankName: '',
			lastActiveAt: now,
			usedCoins: 0,
			availableCoins: 0,
			createdAt: now,
			updatedAt: now
		});
		await rmApplications.insertOne(rmDoc as any);
		rmCreated = true;
	}

	// ── All-Lenders assignments ───────────────────────────────────────
	// rmUserId uses admin._id (NOT the RM mirror's _id) because when admin
	// uses the top-right role switcher to switch to RM mode, hooks.server.ts
	// keeps locals.user.id = admin's _id. The RM dashboard / route lookups
	// use that locals.user.id as rmUserId, so the assignment rows must key
	// on admin's _id for the lookups to find them.
	const now = new Date();
	const nextVerificationDueBy = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 yr — admins don't need monthly re-verification

	// Find which lender assignments are already present for this admin so we
	// only insert the missing ones (idempotent + cheap).
	const existing = await RmLenderAssignments.find(
		{ rmUserId: admin.adminId, status: 'active' },
		{ projection: { lenderId: 1 } }
	).toArray();
	const existingLenderIds = new Set(existing.map((e) => e.lenderId));

	const newAssignments = LENDER_DIRECTORY.filter(
		(l) => !existingLenderIds.has(l.lenderId)
	).map((lender) => ({
		rmUserId: admin.adminId,
		lenderId: lender.lenderId,
		lenderName: lender.lenderName,
		officialBankEmail: admin.email || '',
		status: 'active' as const,
		isAdminMirror: true,
		onboardedAt: now,
		lastMonthlyVerifiedAt: now,
		nextVerificationDueBy,
		suspendedAt: null,
		suspendedReason: null,
		transferredTo: null,
		transferredAt: null
	}));

	if (newAssignments.length > 0) {
		await RmLenderAssignments.insertMany(newAssignments as any);
		lenderAssignmentsCreated = newAssignments.length;
	}

	if (dsaCreated || rmCreated || lenderAssignmentsCreated > 0) {
		logger.info(
			{
				mobileNumber: mobile,
				name: admin.name,
				dsaCreated,
				rmCreated,
				lenderAssignmentsCreated
			},
			'Auto-created admin parallel records'
		);
	}

	return { dsaCreated, rmCreated, lenderAssignmentsCreated };
}
