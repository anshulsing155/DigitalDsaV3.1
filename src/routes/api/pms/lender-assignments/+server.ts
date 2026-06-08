/**
 * GET /api/pms/lender-assignments
 * Returns the authenticated RM's own lender assignments with statuses.
 * Admins can pass ?rmUserId=... to fetch any RM's assignments.
 */
import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { RmLenderAssignments } from '$lib/database/mongo.js';
import { LENDER_BY_ID } from '$lib/config/lenderPolicies/lenderDirectory.js';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireRoleApi(locals, ['rm', 'admin']);
	if (denied) return denied;

	const userRole = locals.role || locals.user?.role || 'user';

	let targetUserId = locals.user!.id;

	// Admin can query any RM's assignments
	if (userRole === 'admin') {
		const queryUserId = url.searchParams.get('rmUserId');
		if (queryUserId) targetUserId = queryUserId;
	}

	try {
		const assignments = await RmLenderAssignments.find({ rmUserId: targetUserId })
			.sort({ onboardedAt: -1 })
			.toArray();

		// Enrich each assignment with lender details and renewal status
		const enriched = assignments.map((a) => {
			const lender = LENDER_BY_ID.get(a.lenderId);
			const daysUntilRenewal = Math.ceil(
				(a.nextVerificationDueBy.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
			);

			return {
				...a,
				lenderDisplayName: lender?.lenderName ?? a.lenderName,
				lenderClassification: lender?.classification ?? null,
				daysUntilRenewal,
				renewalOverdue: daysUntilRenewal < 0,
				renewalDueSoon: daysUntilRenewal >= 0 && daysUntilRenewal <= 7
			};
		});

		return apiOk({ assignments: enriched });
	} catch (err) {
		return apiServerError(err, 'pms lender assignments list');
	}
};
