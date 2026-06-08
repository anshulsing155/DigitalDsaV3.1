/**
 * POST /api/admin/policies/proxy-capture
 * ═══════════════════════════════════════════════════════════════════
 * A.2 / Gap A — create a policy capture on an RM's behalf.
 *
 * For paper-based RMs (PSU banks, small NBFCs) who WhatsApp/fax/email a
 * policy sheet instead of using the portal. The admin keys it in; the capture
 * is owned by the target RM (real or an admin-created stub) and tagged with
 * `provenance.source_type = 'admin_manual_proxy'`. It then enters the SAME
 * review/approval queue as RM-submitted captures — provenance is the only
 * difference.
 *
 * Creates an EMPTY capture (lender + product + geo); the admin fills the
 * policy fields in the wizard afterward (autosave via the admin-scoped
 * capture endpoints — Slice 2).
 *
 * Auth: admin role + `rule_authoring` permission. Rate-limited 30/hr/admin.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { requireRoleApi, requireAdminPermission, blockDemoWrite } from '$lib/server/guards.js';
import { PolicyCaptures, Lenders, PolicyAuditLogs, rmApplications } from '$lib/database/mongo.js';
import type { ProductType } from '$lib/types/policyEngine.js';
import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';
import { createDefaultPolicyCaptureData } from '$lib/types/policyCapture.js';
import { createProxyRmStub } from '$lib/server/rmHelpers.js';
import { decryptUserPii } from '$lib/server/csfle/index.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { apiOk, apiError, apiServerError, apiValidationError, parseJsonBody } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';

const VALID_PRODUCT_TYPES = Object.keys(PRODUCT_TYPE_LABELS) as ProductType[];

const rmRefSchema = z.discriminatedUnion('mode', [
	z.object({ mode: z.literal('existing'), rmId: z.string().trim().min(1).max(64) }),
	z.object({
		mode: z.literal('stub'),
		name: z.string().trim().min(2).max(100),
		bankName: z.string().trim().min(1).max(100),
		// Mobile required: rmApplications.mobileNumber is a non-sparse unique index.
		mobile: z.coerce.number().int().gte(1_000_000_000).lte(9_999_999_999),
		email: z.string().trim().email().max(120).optional()
	})
]);

const bodySchema = z.object({
	rmRef: rmRefSchema,
	arrivalChannel: z.enum(['whatsapp', 'email', 'fax', 'phone', 'in_person']),
	referenceNote: z.string().trim().max(280).optional(),
	lender_id: z.string().trim().min(1).max(64),
	product_type: z.string().trim(),
	geo_state: z.string().trim().max(100).optional()
});

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const limited = await rateLimit(getClientAddress(), {
		maxRequests: 30,
		windowMs: 60 * 60 * 1000,
		identifier: `proxy-capture:${locals.user!.id}`
	});
	if (limited) return apiError('Too many captures. Please try again later.', 429);

	const parsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!parsed.ok) return parsed.response;
	const validation = bodySchema.safeParse(parsed.data);
	if (!validation.success) {
		return apiValidationError('Invalid proxy-capture request', validation.error.flatten());
	}
	const { rmRef, arrivalChannel, referenceNote, lender_id, product_type, geo_state } =
		validation.data;

	if (!VALID_PRODUCT_TYPES.includes(product_type as ProductType)) {
		return apiError('Valid product_type is required');
	}

	try {
		const lender = await Lenders.findOne({ lender_id });
		if (!lender) return apiError('Lender not found', 404);

		// Resolve the target RM — existing or a freshly-created stub.
		let rmId: string;
		let rmName: string;
		if (rmRef.mode === 'existing') {
			let rmDoc;
			try {
				rmDoc = await rmApplications.findOne({ _id: new ObjectId(rmRef.rmId) });
			} catch {
				return apiError('Invalid rmId', 400);
			}
			if (!rmDoc?._id) return apiError('RM not found', 404);
			const decrypted = await decryptUserPii(rmDoc);
			rmId = rmDoc._id.toString();
			rmName = decrypted?.name || decrypted?.bankName || 'RM';
		} else {
			const stub = await createProxyRmStub({
				name: rmRef.name,
				bankName: rmRef.bankName,
				mobile: rmRef.mobile,
				email: rmRef.email
			});
			rmId = stub.rmId;
			rmName = stub.rmName;
		}

		const now = new Date();
		const capture_id = `CAP-${now.getFullYear()}-${rmId.slice(-4)}-${Date.now().toString(36)}`;
		const adminId = locals.user!.id;

		const doc = {
			capture_id,
			rm_id: rmId,
			rm_name: rmName,
			provenance: {
				source_type: 'admin_manual_proxy' as const,
				captured_by: adminId,
				captured_for_rm: rmId,
				arrival_channel: arrivalChannel,
				reference_note: referenceNote,
				captured_at: now
			},
			lender_id,
			lender_name: lender.lender_name,
			classification: lender.classification,
			product_type: product_type as ProductType,
			geo_state: geo_state || undefined,
			product_variants: [],
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

		const result = await PolicyCaptures.insertOne(doc as never);

		await PolicyAuditLogs.insertOne({
			target_type: 'rm_submission',
			target_id: capture_id,
			action: 'rm_submission_created',
			actor_id: adminId,
			actor_name: locals.user!.name,
			actor_role: 'admin',
			details: {
				event: 'policy_captured_on_behalf',
				captured_for_rm: rmId,
				lender_id,
				product_type,
				arrival_channel: arrivalChannel
			},
			created_at: now
		} as never);

		logger.info({ adminId, rmId, capture_id }, 'policy_captured_on_behalf');

		return apiOk({ _id: result.insertedId.toString(), captureId: capture_id, rmId }, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to create proxy capture');
	}
};
