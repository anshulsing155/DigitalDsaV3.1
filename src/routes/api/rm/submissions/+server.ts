/**
 * GET/POST /api/rm/submissions
 * List and create RM policy submissions.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { rmApplications, RMSubmissions, Lenders, PolicyAuditLogs } from '$lib/database/mongo.js';
import { getLenderNameFromDomain } from '$lib/config/lenderDomains.js';
import type { UrgencyLevel } from '$lib/types/policyEngine.js';
import { parseJsonBody, apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';

const VALID_URGENCY: UrgencyLevel[] = ['normal', 'urgent', 'critical'];

export const GET: RequestHandler = async ({ locals, url }) => {
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

		const status = url.searchParams.get('status');
		const filter: Record<string, unknown> = { rm_id: rmDoc._id.toString() };
		if (status) filter.status = status;

		const submissions = await RMSubmissions.find(filter)
			.sort({ created_at: -1 })
			.limit(50)
			.toArray();

		return apiOk(
			submissions.map((s) => ({
				...s,
				_id: s._id.toString(),
				resulting_version_id: s.resulting_version_id?.toString() || null
			}))
		);
	} catch (err) {
		return apiServerError(err, 'Failed to list submissions');
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
			return apiError('lender_id is required', 400);
		}
		if (
			!body.description ||
			typeof body.description !== 'string' ||
			body.description.trim().length < 10
		) {
			return apiError('description is required (min 10 characters)', 400);
		}

		const urgency: UrgencyLevel = VALID_URGENCY.includes(body.urgency as UrgencyLevel)
			? (body.urgency as UrgencyLevel)
			: 'normal';

		// Verify lender exists
		const lender = await Lenders.findOne({ lender_id: body.lender_id });
		if (!lender) {
			return apiError('Lender not found', 404);
		}

		const now = new Date();
		const submission_id = `SUB-${now.getFullYear()}-${rmDoc._id.toString().slice(-4)}-${Date.now().toString(36)}`;

		const doc = {
			submission_id,
			rm_id: rmDoc._id.toString(),
			rm_name:
				rmDoc.name ||
				rmDoc.bankName ||
				getLenderNameFromDomain(rmDoc.rmOfficialEmail || (rmDoc as any).officialEmail || '') ||
				'RM',
			lender_id: body.lender_id,
			lender_name: lender.lender_name,
			product_type: body.product_type || undefined,
			variation_slug: body.variation_slug || undefined,
			geo_state: body.geo_state || undefined,
			geo_city: body.geo_city || undefined,
			geo_zone_type: body.geo_zone_type || undefined,
			status: 'submitted' as const,
			urgency,
			description: body.description.trim(),
			document_ids: body.document_ids || [],
			created_at: now,
			updated_at: now
		};

		const result = await RMSubmissions.insertOne(doc as any);

		await PolicyAuditLogs.insertOne({
			target_type: 'rm_submission',
			target_id: submission_id,
			action: 'rm_submission_created',
			actor_id: rmDoc._id.toString(),
			actor_name: doc.rm_name,
			actor_role: 'rm',
			details: { lender_id: body.lender_id, urgency, product_type: body.product_type },
			created_at: now
		} as any);

		return apiOk({ _id: result.insertedId.toString(), submission_id }, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to create submission');
	}
};
