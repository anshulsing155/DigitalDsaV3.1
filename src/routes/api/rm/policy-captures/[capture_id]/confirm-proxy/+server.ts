/**
 * POST /api/rm/policy-captures/[capture_id]/confirm-proxy
 * ═══════════════════════════════════════════════════════════════════
 * A.2 Slice 3 — the target RM confirms a policy an admin captured on their
 * behalf (Gap A). Flips `provenance.source_type` from `admin_manual_proxy` to
 * `rm_confirmed` and stamps `confirmed_at` / `confirmed_by`.
 *
 * Purely a trust/audit overlay — it does NOT change the capture's status or
 * submit a draft into review (that stays the admin's action, Slices 1-2).
 * Status-independent: confirmable in any status as long as it's still an
 * unconfirmed admin proxy.
 *
 * Auth: RM role. Ownership-gated to the RM's own captures (capture_id + rm_id)
 * so one RM can never confirm another's — SEC-5 boundary intact.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { PolicyCaptures, PolicyAuditLogs } from '$lib/database/mongo.js';
import { resolveRmDoc } from '$lib/server/rmHelpers.js';
import { canConfirmProxy } from '$lib/types/policyCapture.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';

export const POST: RequestHandler = async ({ locals, params, getClientAddress }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const limited = await rateLimit(getClientAddress(), {
		maxRequests: 30,
		windowMs: 60 * 60 * 1000,
		identifier: `confirm-proxy:${locals.user!.id}`
	});
	if (limited) return apiError('Too many requests. Please try again later.', 429);

	try {
		const rmDoc = await resolveRmDoc(locals.user!);
		if (!rmDoc?._id) return apiError('RM profile not found', 404);
		const rmId = rmDoc._id.toString();

		// Ownership gate: the capture must belong to this RM.
		const capture = await PolicyCaptures.findOne({
			capture_id: params.capture_id,
			rm_id: rmId
		});
		if (!capture) return apiError('Capture not found', 404);

		if (!canConfirmProxy(capture.provenance)) {
			return apiError('This capture is not an unconfirmed admin proxy — nothing to confirm');
		}

		const now = new Date();
		await PolicyCaptures.updateOne(
			{ capture_id: params.capture_id, rm_id: rmId },
			{
				$set: {
					'provenance.source_type': 'rm_confirmed',
					'provenance.confirmed_at': now,
					'provenance.confirmed_by': rmId,
					updated_at: now
				}
			}
		);

		await PolicyAuditLogs.insertOne({
			target_type: 'rm_submission',
			target_id: capture.capture_id,
			action: 'rm_submission_status_changed',
			actor_id: rmId,
			actor_name: capture.rm_name,
			actor_role: 'rm',
			details: {
				event: 'proxy_capture_confirmed',
				captured_by: capture.provenance?.captured_by,
				lender_id: capture.lender_id,
				product_type: capture.product_type
			},
			created_at: now
		} as never);

		logger.info({ rmId, capture_id: capture.capture_id }, 'proxy_capture_confirmed');

		return apiOk({ source_type: 'rm_confirmed', confirmed_at: now.toISOString() });
	} catch (err) {
		return apiServerError(err, 'Failed to confirm proxy capture');
	}
};
