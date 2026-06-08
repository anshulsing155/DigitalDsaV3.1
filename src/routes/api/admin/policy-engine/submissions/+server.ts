/**
 * GET /api/admin/policy-engine/submissions
 * List all RM submissions (admin view with filters).
 */

import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiOk, apiServerError } from '$lib/server/apiResponse.js';
import { RMSubmissions } from '$lib/database/mongo.js';
import type { RMSubmissionStatus } from '$lib/types/policyEngine.js';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	try {
		const status = url.searchParams.get('status') as RMSubmissionStatus | null;
		const urgency = url.searchParams.get('urgency');
		const lender_id = url.searchParams.get('lender_id');

		const filter: Record<string, unknown> = {};
		if (status) filter.status = status;
		if (urgency) filter.urgency = urgency;
		if (lender_id) filter.lender_id = lender_id;

		const submissions = await RMSubmissions.find(filter)
			.sort({ created_at: -1 })
			.limit(100)
			.toArray();

		return apiOk(
			submissions.map((s) => ({
				...s,
				_id: s._id.toString(),
				resulting_version_id: s.resulting_version_id?.toString() || null,
				created_at: s.created_at ? new Date(s.created_at).toISOString() : null,
				updated_at: s.updated_at ? new Date(s.updated_at).toISOString() : null
			}))
		);
	} catch (err) {
		return apiServerError(err, 'Failed to list submissions');
	}
};
