/**
 * /api/pms/suggestions/[id]
 *
 * PATCH — RM or admin accepts or dismisses a DSA suggestion.
 *
 * Body: { resolution: 'accepted' | 'dismissed', reviewNote?: string }
 */

import type { RequestHandler } from './$types';
import { requireRoleApi, requireRmLenderAccess } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { PolicySuggestions } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	// Only RM and admin can resolve suggestions
	const guard = requireRoleApi(locals, ['rm', 'admin']);
	if (guard) return guard;

	const bodyResult = await parseJsonBody(request);
	if (!bodyResult.ok) return bodyResult.response;

	const body = bodyResult.data as Record<string, unknown>;
	const resolution = String(body.resolution ?? '');

	if (resolution !== 'accepted' && resolution !== 'dismissed') {
		return apiError('resolution must be "accepted" or "dismissed"', 400);
	}

	const reviewNote = body.reviewNote ? String(body.reviewNote).trim().slice(0, 500) : null;

	// Parse and validate the ObjectId
	let oid: ObjectId;
	try {
		oid = new ObjectId(params.id);
	} catch {
		return apiError('Invalid suggestion ID', 400);
	}

	try {
		// Load the suggestion first to verify the caller is authorized for its lender.
		// Without this check, the role guard alone allows any RM to resolve any
		// suggestion by guessing/iterating the ObjectId — UI loader checks assignment
		// but the API was previously wide open.
		const suggestion = await PolicySuggestions.findOne({ _id: oid });
		if (!suggestion) {
			return apiError('Suggestion not found', 404);
		}

		const [denied] = await requireRmLenderAccess(locals, suggestion.lenderId);
		if (denied) return denied;

		const result = await PolicySuggestions.updateOne(
			// Only allow resolving suggestions that are still pending
			{ _id: oid, status: 'pending' },
			{
				$set: {
					status: resolution,
					reviewedBy: locals.user!.id,
					reviewNote
				}
			}
		);

		if (result.matchedCount === 0) {
			return apiError('Suggestion not found or already resolved', 404);
		}

		return apiOk({ resolved: resolution });
	} catch (err) {
		logger.error({ err, id: params.id }, 'PATCH /api/pms/suggestions/[id] failed');
		return apiServerError('Failed to resolve suggestion');
	}
};
