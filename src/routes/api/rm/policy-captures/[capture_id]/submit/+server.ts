/**
 * POST /api/rm/policy-captures/[capture_id]/submit
 * Submit a draft policy capture for admin review.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { rmApplications, PolicyCaptures, PolicyAuditLogs } from '$lib/database/mongo.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';

export const POST: RequestHandler = async ({ locals, params }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const user = locals.user!;
		let rmDoc;
		try {
			rmDoc = await rmApplications.findOne({ _id: new ObjectId(user.id) });
		} catch {
			// SEC-2: encrypted-first lookup; decrypt for downstream reads.
			const rmDocRaw = await findUserByMobile(rmApplications, user.mobileNumber);
			rmDoc = await decryptUserPii(rmDocRaw);
		}
		if (!rmDoc?._id) return apiError('RM profile not found', 404);

		const capture = await PolicyCaptures.findOne({
			capture_id: params.capture_id,
			rm_id: rmDoc._id.toString()
		});
		if (!capture) return apiError('Capture not found', 404);
		if (capture.status !== 'draft') {
			return apiError('Only draft captures can be submitted');
		}

		// Check at least core parameters are filled
		const core = capture.data.core_parameters;
		if (!core || (core.roi === null && core.max_foir === null && core.max_tenure_months === null)) {
			return apiError('Please fill at least some core parameters before submitting');
		}

		const now = new Date();
		await PolicyCaptures.updateOne(
			{ capture_id: params.capture_id, rm_id: rmDoc._id.toString() },
			{
				$set: {
					status: 'submitted',
					updated_at: now
				}
			}
		);

		await PolicyAuditLogs.insertOne({
			target_type: 'rm_submission',
			target_id: capture.capture_id,
			action: 'rm_submission_status_changed',
			actor_id: rmDoc._id.toString(),
			actor_name: capture.rm_name,
			actor_role: 'rm',
			details: {
				from: 'draft',
				to: 'submitted',
				type: 'policy_capture',
				lender_id: capture.lender_id,
				product_type: capture.product_type,
				completion_percent: capture.completion_percent,
				unknown_fields_count: capture.unknown_fields.length
			},
			created_at: now
		} as any);

		return apiOk({ status: 'submitted' });
	} catch (err) {
		return apiServerError(err, 'Failed to submit policy capture');
	}
};
