/**
 * DELETE / POST  /api/rm/sample-data
 * ═══════════════════════════════════════════════════════════════════
 * Manage sample data for the authenticated RM.
 *
 * DELETE: Clear all sample cases, communication threads, and timeline
 *         events created by the seeder for this RM.
 *
 * POST:   Re-seed sample data (clears existing sample data first).
 *         Useful for demo resets.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { getLenderNameFromDomain } from '$lib/config/lenderDomains.js';
import { ObjectId } from 'mongodb';
import {
	rmApplications,
	Cases,
	CommunicationThreads,
	TimelineEvents,
	FormSnapshots,
	LenderResultsSnapshots,
	CaseTasks
} from '$lib/database/mongo.js';
import { seedRMSampleData } from '$lib/server/rmSampleDataSeeder.js';
import logger from '$lib/server/logger.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';

// ── Helper: clear sample data for an RM ──────────────────────────

async function clearRMSampleData(rmId: ObjectId): Promise<number> {
	// Find threads with SAMPLE-RM- case IDs for this RM
	const sampleThreads = await CommunicationThreads.find(
		{ rm_id: rmId, case_id: { $regex: /^SAMPLE-RM-/ } },
		{ projection: { case_id: 1 } }
	).toArray();

	const sampleCaseIds = sampleThreads.map((t) => t.case_id);

	if (sampleCaseIds.length === 0) {
		return 0;
	}

	// Delete cases and all related data in parallel
	const [casesResult] = await Promise.all([
		Cases.deleteMany({ case_id: { $in: sampleCaseIds } }),
		CommunicationThreads.deleteMany({ rm_id: rmId, case_id: { $regex: /^SAMPLE-RM-/ } }),
		TimelineEvents.deleteMany({ case_id: { $in: sampleCaseIds } }),
		FormSnapshots.deleteMany({ case_id: { $in: sampleCaseIds } }),
		LenderResultsSnapshots.deleteMany({ case_id: { $in: sampleCaseIds } }),
		CaseTasks.deleteMany({ case_id: { $in: sampleCaseIds } })
	]);

	return casesResult.deletedCount;
}

// ── DELETE — Clear all sample data ───────────────────────────────

export const DELETE: RequestHandler = async ({ locals }) => {
	// Role guard — only RMs (and admins) can manage RM sample data
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		// SEC-2: encrypted-first lookup. Only `_id` is read below — no
		// decrypt needed for the DELETE flow.
		const rm = await findUserByMobile(rmApplications, locals.user!.mobileNumber);

		if (!rm) {
			return apiError('RM profile not found', 404);
		}

		const deletedCount = await clearRMSampleData(rm._id!);

		return apiOk({ deleted_count: deletedCount });
	} catch (err) {
		return apiServerError(err, 'Failed to clear sample data');
	}
};

// ── POST — Re-seed sample data ──────────────────────────────────

export const POST: RequestHandler = async ({ locals }) => {
	// Role guard — only RMs (and admins) can re-seed RM sample data
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		// SEC-2: encrypted-first lookup; decrypt so name + rmOfficialEmail
		// fields used below are plaintext.
		const rmRaw = await findUserByMobile(rmApplications, locals.user!.mobileNumber);
		const rm = await decryptUserPii(rmRaw);

		if (!rm) {
			return apiError('RM profile not found', 404);
		}

		// Clear existing sample data first
		await clearRMSampleData(rm._id!);

		// Re-seed fresh sample data
		const rmEmail =
			(rm.rmOfficialEmail as string | undefined) || ((rm as any).officialEmail as string) || '';
		const rmBank = (rm.bankName as string) || getLenderNameFromDomain(rmEmail) || '';
		await seedRMSampleData(rm._id!, (rm.name as string) || 'RM', rmBank);

		return apiOk();
	} catch (err) {
		return apiServerError(err, 'Failed to re-seed sample data');
	}
};
