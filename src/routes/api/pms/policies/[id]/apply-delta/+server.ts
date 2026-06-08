/**
 * POST /api/pms/policies/[id]/apply-delta
 *
 * Phase 5 Entry B — saves an RM's reviewed delta decisions by:
 *   1. Forking the published policy into a new draft
 *   2. Applying the accepted deltas to the draft's sections
 *   3. Recording PendingChange entries with reason: 'delta_parse'
 *
 * Returns the new draft's id + lockVersion so Step 2 can run OTP submit.
 *
 * Body:
 *   acceptedDeltas: Array<{ sectionKey, fieldKey, newValue, rmDecision, editedValue? }>
 *     — only 'accepted' or 'edited' deltas; 'rejected' are omitted by client
 */

import type { RequestHandler } from './$types';
import {
	apiOk,
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { RmLenderAssignments } from '$lib/database/mongo.js';
import {
	applyDeltaRevision,
	getPolicyById,
	PolicyNotFoundError,
	PolicyStatusError
} from '$lib/server/pms/policyService.js';
import logger from '$lib/server/logger.js';
import { z } from 'zod';

// DX-2: Zod replaces the hand-rolled per-delta loop. Locks rmDecision
// to the two valid values (was previously a free-form string check).
// Service-layer applyDeltaRevision will reject empty arrays at the
// section-fetch step, so we don't enforce .min(1) here — letting an
// empty array through is harmless (it just returns the unchanged draft).
const deltaSchema = z.object({
	sectionKey: z.string().min(1),
	fieldKey: z.string().min(1),
	newValue: z.unknown(),
	rmDecision: z.enum(['accepted', 'edited']),
	editedValue: z.unknown().optional()
});

const postRequestSchema = z.object({
	acceptedDeltas: z.array(deltaSchema)
});

export const POST: RequestHandler = async ({ locals, request, params }) => {
	const denied = requireRoleApi(locals, ['rm', 'admin']);
	if (denied) return denied;

	const { id: policyId } = params;
	const userId = locals.user!.id;

	const body = await parseJsonBody<Record<string, unknown>>(request);
	if (!body.ok) return body.response;

	const validated = postRequestSchema.safeParse(body.data);
	if (!validated.success) {
		return apiValidationError('Invalid request body', validated.error.flatten());
	}
	const { acceptedDeltas } = validated.data;

	logger.info(
		{ policyId, userId, deltaCount: acceptedDeltas.length },
		'[PMS apply-delta] Applying delta revision'
	);

	try {
		// SEC-5 batch 4 BOLA fix: route-layer RM-lender-assignment check before
		// the service-layer fork. Mirrors the same gate in revise/+server.ts.
		// Without this, the role guard alone would let an RM call apply-delta
		// against any published policy and create a draft for a lender they
		// aren't assigned to — corrupting the real RM's revision flow.
		// Admin bypass — see /api/pms/policies/[id]/+server.ts for full
		// rationale. Admin in any activeRole (including 'rm' via role
		// switcher) gets unrestricted access to every bank's policy.
		const isAdmin =
			locals.user!.activeRole === 'admin' || locals.adminPermissions !== undefined;
		if (!isAdmin) {
			const source = await getPolicyById(policyId);
			const assignment = await RmLenderAssignments.findOne({
				rmUserId: userId,
				lenderId: source.lenderId,
				status: 'active'
			});
			if (!assignment) {
				return apiError('You are not assigned to this lender', 403);
			}
		}

		const draft = await applyDeltaRevision(policyId, acceptedDeltas, userId);

		return apiOk({
			draftId: draft._id.toString(),
			lockVersion: draft.lockVersion,
			pendingChangeCount: draft.pendingChanges.length
		});
	} catch (err) {
		if (err instanceof PolicyNotFoundError) return apiError('Policy not found', 404);
		if (err instanceof PolicyStatusError) return apiError(err.message, 422);
		return apiServerError(err);
	}
};
