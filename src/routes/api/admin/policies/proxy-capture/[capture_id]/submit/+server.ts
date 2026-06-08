/**
 * POST /api/admin/policies/proxy-capture/[capture_id]/submit
 * ═══════════════════════════════════════════════════════════════════
 * A.2 — submit an admin proxy capture into the SAME review queue as
 * RM-submitted captures. Admin-scoped, guarded to `admin_manual_proxy`
 * captures only.
 *
 * Auth: admin role + `rule_authoring` permission.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { requireRoleApi, requireAdminPermission, blockDemoWrite } from '$lib/server/guards.js';
import { PolicyCaptures, PolicyAuditLogs } from '$lib/database/mongo.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';

const PROXY_FILTER = (captureId: string) => ({
	capture_id: captureId,
	'provenance.source_type': 'admin_manual_proxy'
});

export const POST: RequestHandler = async ({ locals, params, getClientAddress }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const limited = await rateLimit(getClientAddress(), {
		maxRequests: 30,
		windowMs: 60 * 60 * 1000,
		identifier: `proxy-capture-submit:${locals.user!.id}`
	});
	if (limited) return apiError('Too many submissions. Please try again later.', 429);

	try {
		const capture = await PolicyCaptures.findOne(PROXY_FILTER(params.capture_id));
		if (!capture) return apiError('Proxy capture not found', 404);
		if (capture.status !== 'draft') return apiError('Only draft captures can be submitted');

		const core = capture.data.core_parameters;
		if (!core || (core.roi === null && core.max_foir === null && core.max_tenure_months === null)) {
			return apiError('Please fill at least some core parameters before submitting');
		}

		const now = new Date();
		await PolicyCaptures.updateOne(PROXY_FILTER(params.capture_id), {
			$set: { status: 'submitted', updated_at: now }
		});

		await PolicyAuditLogs.insertOne({
			target_type: 'rm_submission',
			target_id: capture.capture_id,
			action: 'rm_submission_status_changed',
			actor_id: locals.user!.id,
			actor_name: locals.user!.name,
			actor_role: 'admin',
			details: {
				event: 'proxy_capture_submitted',
				from: 'draft',
				to: 'submitted',
				captured_for_rm: capture.provenance?.captured_for_rm,
				lender_id: capture.lender_id,
				product_type: capture.product_type
			},
			created_at: now
		} as never);

		return apiOk({ status: 'submitted' });
	} catch (err) {
		return apiServerError(err, 'Failed to submit proxy capture');
	}
};
