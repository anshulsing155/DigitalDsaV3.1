/**
 * GET  /api/admin/policy-engine/negative-areas — List all NBFC negative areas
 * POST /api/admin/policy-engine/negative-areas — Upsert negative areas for a lender
 */

import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import logger from '$lib/server/logger.js';
import {
	apiError,
	apiOk,
	apiServerError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { NbfcNegativeAreas } from '$lib/database/mongo.js';
import { rateLimit } from '$lib/server/rateLimiter.js';

export const GET: RequestHandler = async ({ locals, request }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	// Rate limit: 10 requests per minute per user
	const getMobileNumber = locals.user?.mobileNumber || 'anon';
	const getIsLimited = await rateLimit(getMobileNumber, {
		maxRequests: 10,
		windowMs: 60_000,
		identifier: `negative-areas:${getMobileNumber}`
	});
	if (getIsLimited) {
		return apiError('Too many requests. Please try again later.', 429);
	}

	try {
		const docs = await NbfcNegativeAreas.find(
			{},
			{
				projection: {
					lender_id: 1,
					lender_name: 1,
					negative_areas: 1,
					updated_at: 1,
					updated_by: 1
				}
			}
		)
			.sort({ lender_name: 1 })
			.toArray();
		// Serialize ObjectIds to strings for JSON safety
		const serialized = docs.map((d) => ({ ...d, _id: d._id!.toString() }));
		return apiOk(serialized);
	} catch (err) {
		return apiServerError(err, 'Failed to fetch negative areas');
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	// Rate limit: 10 requests per minute per user
	const postMobileNumber = locals.user?.mobileNumber || 'anon';
	const postIsLimited = await rateLimit(postMobileNumber, {
		maxRequests: 10,
		windowMs: 60_000,
		identifier: `negative-areas:${postMobileNumber}`
	});
	if (postIsLimited) {
		return apiError('Too many requests. Please try again later.', 429);
	}

	try {
		const parsed = await parseJsonBody<{
			lender_id: string;
			lender_name: string;
			negative_areas: Array<{
				state: string;
				cities?: string[];
				localities?: string[];
			}>;
		}>(request);

		if (!parsed.ok) return parsed.response;

		const { lender_id, lender_name, negative_areas } = parsed.data;
		if (!lender_id || !lender_name || !Array.isArray(negative_areas)) {
			return apiError('lender_id, lender_name, and negative_areas are required', 400);
		}

		// Validate each area has a state
		for (const area of negative_areas) {
			if (!area.state?.trim()) {
				return apiError('Each negative area must have a state', 400);
			}
		}

		const now = new Date();
		await NbfcNegativeAreas.updateOne(
			{ lender_id },
			{
				$set: {
					lender_name,
					negative_areas,
					updated_at: now,
					updated_by: locals.user?.name ?? 'admin'
				}
			},
			{ upsert: true }
		);

		logger.info({ lender_id, areaCount: negative_areas.length }, 'NBFC negative areas updated');

		return apiOk({ lender_id, areas_count: negative_areas.length });
	} catch (err) {
		return apiServerError(err, 'Failed to upsert negative areas');
	}
};
