/**
 * DELETE / POST  /api/cases/sample-data
 * ═══════════════════════════════════════════════════════════════════
 * Manage sample data for the authenticated DSA.
 *
 * DELETE: Clear all sample cases, timeline events, and RM contacts
 *         created by the seeder for this DSA.
 *
 * POST:   Re-seed sample data (clears existing sample data first).
 *         Useful for demo resets.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { ObjectId } from 'mongodb';
import {
	DsaApplications,
	Cases,
	TimelineEvents,
	FormSnapshots,
	LenderResultsSnapshots,
	CaseTasks
} from '$lib/database/mongo.js';
import { seedSampleData } from '$lib/server/sampleDataSeeder.js';
import { blockDemoWrite, requireAuthApi } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';

// ── Helper: clear sample data for a DSA ──────────────────────────

async function clearSampleData(dsaId: ObjectId): Promise<number> {
	// Find all sample case_ids for this DSA
	const sampleCases = await Cases.find(
		{ dsa_id: dsaId, is_sample: true },
		{ projection: { case_id: 1 } }
	).toArray();

	const sampleCaseIds = sampleCases.map((c) => c.case_id);

	if (sampleCaseIds.length === 0) {
		return 0;
	}

	// Delete cases and all related data in parallel
	const [casesResult] = await Promise.all([
		Cases.deleteMany({ dsa_id: dsaId, is_sample: true }),
		TimelineEvents.deleteMany({ case_id: { $in: sampleCaseIds } }),
		FormSnapshots.deleteMany({ case_id: { $in: sampleCaseIds } }),
		LenderResultsSnapshots.deleteMany({ case_id: { $in: sampleCaseIds } }),
		CaseTasks.deleteMany({ case_id: { $in: sampleCaseIds } })
	]);

	return casesResult.deletedCount;
}

// ── DELETE — Clear all sample data ───────────────────────────────

export const DELETE: RequestHandler = async ({ locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		// SEC-2: encrypted-first lookup. Only `_id` is read below — no
		// decrypt needed for the DELETE flow.
		const dsa = await findUserByMobile(DsaApplications, locals.user!.mobileNumber);

		if (!dsa) {
			return apiError('DSA profile not found', 404);
		}

		const deletedCount = await clearSampleData(dsa._id!);

		return apiOk({ deleted_count: deletedCount });
	} catch (err) {
		return apiServerError(err, 'Failed to clear sample data');
	}
};

// ── POST — Re-seed sample data ──────────────────────────────────

export const POST: RequestHandler = async ({ locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		// SEC-2: encrypted-first lookup; decrypt so `dsa.name` is
		// plaintext when passed to the seeder.
		const dsaRaw = await findUserByMobile(DsaApplications, locals.user!.mobileNumber);
		const dsa = await decryptUserPii(dsaRaw);

		if (!dsa) {
			return apiError('DSA profile not found', 404);
		}

		// Clear existing sample data first
		await clearSampleData(dsa._id!);

		// Re-seed fresh sample data
		await seedSampleData(dsa._id!, (dsa.name as string) || 'DSA');

		return apiOk();
	} catch (err) {
		return apiServerError(err, 'Failed to re-seed sample data');
	}
};
