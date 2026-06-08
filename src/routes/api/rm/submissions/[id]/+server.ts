/**
 * GET/PATCH /api/rm/submissions/[id]
 * Get or update a single RM submission.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { rmApplications, RMSubmissions } from '$lib/database/mongo.js';
import { parseJsonBody, apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;

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
		if (!rmDoc?._id) {
			return apiError('RM profile not found', 404);
		}

		const submission = await RMSubmissions.findOne({
			submission_id: params.id,
			rm_id: rmDoc._id.toString()
		});

		if (!submission) {
			return apiError('Submission not found', 404);
		}

		return apiOk({
			...submission,
			_id: submission._id.toString(),
			resulting_version_id: submission.resulting_version_id?.toString() || null
		});
	} catch (err) {
		return apiServerError(err, 'Failed to get submission');
	}
};

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
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
		if (!rmDoc?._id) {
			return apiError('RM profile not found', 404);
		}

		const submission = await RMSubmissions.findOne({
			submission_id: params.id,
			rm_id: rmDoc._id.toString()
		});

		if (!submission) {
			return apiError('Submission not found', 404);
		}

		// Only allow updates on submitted/clarification_needed
		if (!['submitted', 'clarification_needed'].includes(submission.status)) {
			return apiError('Cannot update submission in current status', 400);
		}

		const bodyParsed = await parseJsonBody<Record<string, unknown>>(request);
		if (!bodyParsed.ok) return bodyParsed.response;
		const body = bodyParsed.data;
		const updates: Record<string, unknown> = { updated_at: new Date() };

		if (body.description !== undefined) updates.description = (body.description as string).trim();
		if (body.document_ids !== undefined) updates.document_ids = body.document_ids;
		if (body.product_type !== undefined) updates.product_type = body.product_type;
		if (body.variation_slug !== undefined) updates.variation_slug = body.variation_slug;
		if (body.geo_state !== undefined) updates.geo_state = body.geo_state;
		if (body.geo_city !== undefined) updates.geo_city = body.geo_city;

		// Defense-in-depth: scope the write to (submission_id, rm_id). The
		// findOne above is the BOLA gate; this keeps the write safe even if
		// someone removes the gate in a future refactor.
		await RMSubmissions.updateOne(
			{ submission_id: params.id, rm_id: rmDoc._id.toString() },
			{ $set: updates }
		);

		return apiOk({ submission_id: params.id, updated: true });
	} catch (err) {
		return apiServerError(err, 'Failed to update submission');
	}
};
