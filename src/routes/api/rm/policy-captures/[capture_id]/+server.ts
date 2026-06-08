/**
 * PATCH/DELETE /api/rm/policy-captures/[capture_id]
 * Auto-save draft data and delete captures.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { rmApplications, PolicyCaptures } from '$lib/database/mongo.js';
import { parseJsonBody, apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';

/** Allowlisted keys for the `data` sub-object (one per wizard step). */
const VALID_DATA_KEYS = new Set([
	'core_parameters',
	'eligibility',
	'credit_cibil',
	'income_assessment',
	'property_rules',
	'obligations',
	'bt_topup',
	'fees_policies',
	'deviations',
	'special_conditions'
]);

/** Resolve RM doc from locals — SEC-2: encrypted-first, plaintext-fallback. */
async function resolveRmDoc(locals: App.Locals) {
	const user = locals.user!;
	let rmDoc;
	try {
		rmDoc = await rmApplications.findOne({ _id: new ObjectId(user.id) });
	} catch {
		rmDoc = await findUserByMobile(rmApplications, user.mobileNumber);
	}
	return decryptUserPii(rmDoc);
}

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const rmDoc = await resolveRmDoc(locals);
		if (!rmDoc?._id) return apiError('RM profile not found', 404);

		const capture = await PolicyCaptures.findOne({
			capture_id: params.capture_id,
			rm_id: rmDoc._id.toString()
		});
		if (!capture) return apiError('Capture not found', 404);
		if (capture.status !== 'draft') return apiError('Only draft captures can be edited');

		const bodyParsed = await parseJsonBody<Record<string, unknown>>(request);
		if (!bodyParsed.ok) return bodyParsed.response;
		const body = bodyParsed.data;

		// Build update — only allow specific fields
		const update: Record<string, unknown> = { updated_at: new Date() };

		if (
			typeof body.current_step === 'number' &&
			Number.isInteger(body.current_step) &&
			body.current_step >= 0 &&
			body.current_step <= 9
		) {
			update.current_step = body.current_step;
		}
		if (
			Array.isArray(body.completed_steps) &&
			body.completed_steps.every(
				(s: unknown) => typeof s === 'number' && Number.isInteger(s) && s >= 0 && s <= 9
			)
		) {
			update.completed_steps = body.completed_steps;
		}
		if (
			typeof body.completion_percent === 'number' &&
			body.completion_percent >= 0 &&
			body.completion_percent <= 100
		) {
			update.completion_percent = body.completion_percent;
		}
		if (
			Array.isArray(body.unknown_fields) &&
			body.unknown_fields.every((f: unknown) => typeof f === 'string')
		) {
			update.unknown_fields = body.unknown_fields;
		}

		// Merge step data — deep set into data sub-object (allowlisted keys only)
		if (body.data && typeof body.data === 'object') {
			const dataUpdate = body.data as Record<string, unknown>;
			for (const [key, value] of Object.entries(dataUpdate)) {
				if (VALID_DATA_KEYS.has(key)) {
					update[`data.${key}`] = value;
				}
			}
		}

		await PolicyCaptures.updateOne(
			{ capture_id: params.capture_id, rm_id: rmDoc._id.toString() },
			{ $set: update }
		);

		return apiOk({ saved: true });
	} catch (err) {
		return apiServerError(err, 'Failed to save policy capture');
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const rmDoc = await resolveRmDoc(locals);
		if (!rmDoc?._id) return apiError('RM profile not found', 404);

		const capture = await PolicyCaptures.findOne({
			capture_id: params.capture_id,
			rm_id: rmDoc._id.toString()
		});
		if (!capture) return apiError('Capture not found', 404);
		if (capture.status !== 'draft') return apiError('Only draft captures can be deleted');

		await PolicyCaptures.deleteOne({ capture_id: params.capture_id, rm_id: rmDoc._id.toString() });
		return apiOk({ deleted: true });
	} catch (err) {
		return apiServerError(err, 'Failed to delete policy capture');
	}
};
