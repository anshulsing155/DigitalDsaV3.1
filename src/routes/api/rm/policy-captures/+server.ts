/**
 * GET/POST /api/rm/policy-captures
 * List and create RM policy captures.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { rmApplications, PolicyCaptures, Lenders, PolicyAuditLogs } from '$lib/database/mongo.js';
import { getLenderNameFromDomain } from '$lib/config/lenderDomains.js';
import type { ProductType } from '$lib/types/policyEngine.js';
import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';
import { createDefaultPolicyCaptureData } from '$lib/types/policyCapture.js';
import logger from '$lib/server/logger.js';
import { parseJsonBody, apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';

const VALID_PRODUCT_TYPES = Object.keys(PRODUCT_TYPE_LABELS) as ProductType[];

export const GET: RequestHandler = async ({ locals }) => {
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
			return apiOk([]);
		}

		const captures = await PolicyCaptures.find({ rm_id: rmDoc._id.toString() })
			.sort({ updated_at: -1 })
			.limit(50)
			.toArray();

		return apiOk(
			captures.map((c) => ({
				...c,
				_id: c._id.toString(),
				resulting_version_id: c.resulting_version_id?.toString() || null
			}))
		);
	} catch (err) {
		return apiServerError(err, 'Failed to list policy captures');
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
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

		const bodyParsed = await parseJsonBody<Record<string, unknown>>(request);
		if (!bodyParsed.ok) return bodyParsed.response;
		const body = bodyParsed.data;

		// Validate required fields
		if (!body.lender_id || typeof body.lender_id !== 'string') {
			return apiError('lender_id is required');
		}
		if (!body.product_type || !VALID_PRODUCT_TYPES.includes(body.product_type as ProductType)) {
			return apiError('Valid product_type is required');
		}

		// Verify lender exists
		const lender = await Lenders.findOne({ lender_id: body.lender_id });
		if (!lender) {
			return apiError('Lender not found', 404);
		}

		const now = new Date();
		const capture_id = `CAP-${now.getFullYear()}-${rmDoc._id.toString().slice(-4)}-${Date.now().toString(36)}`;

		const rmName =
			rmDoc.name ||
			rmDoc.bankName ||
			getLenderNameFromDomain(rmDoc.rmOfficialEmail || (rmDoc as any).officialEmail || '') ||
			'RM';

		const geoState =
			typeof body.geo_state === 'string' && body.geo_state.length <= 100
				? body.geo_state
				: undefined;
		const geoCity =
			typeof body.geo_city === 'string' && body.geo_city.length <= 100 ? body.geo_city : undefined;

		const doc = {
			capture_id,
			rm_id: rmDoc._id.toString(),
			rm_name: rmName,
			lender_id: body.lender_id,
			lender_name: lender.lender_name,
			classification: lender.classification,
			product_type: body.product_type as ProductType,
			geo_state: geoState,
			geo_city: geoCity,
			product_variants: [] as Array<{
				bank_product_name: string;
				bank_product_code?: string;
				target_segment?: string;
				segment_conditions?: string[];
				is_vanilla: boolean;
			}>,
			status: 'draft' as const,
			current_step: 0,
			completed_steps: [] as number[],
			completion_percent: 0,
			data: createDefaultPolicyCaptureData(),
			unknown_fields: [] as string[],
			document_ids: [] as string[],
			created_at: now,
			updated_at: now
		};

		const result = await PolicyCaptures.insertOne(doc as any);

		await PolicyAuditLogs.insertOne({
			target_type: 'rm_submission',
			target_id: capture_id,
			action: 'rm_submission_created',
			actor_id: rmDoc._id.toString(),
			actor_name: rmName,
			actor_role: 'rm',
			details: {
				lender_id: body.lender_id,
				product_type: body.product_type,
				type: 'policy_capture'
			},
			created_at: now
		} as any);

		return apiOk({ _id: result.insertedId.toString(), capture_id }, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to create policy capture');
	}
};
