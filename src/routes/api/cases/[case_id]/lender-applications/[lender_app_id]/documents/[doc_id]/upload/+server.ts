/**
 * POST  /api/cases/[case_id]/lender-applications/[lender_app_id]/documents/[doc_id]/upload
 * ══════════════════════════════════════════════════════════════════
 * Accepts multipart form data with a `file` field, uploads to ImageKit,
 * updates the document's `upload` field and sets status to 'uploaded'.
 * ══════════════════════════════════════════════════════════════════
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Cases } from '$lib/database/mongo.js';
import {
	resolveEffectiveDsaId,
	verifyCaseOwnership,
	createTimelineEvent
} from '$lib/server/caseHelpers.js';
import type { DocumentChecklistItem } from '$lib/types/case.js';
import { blockDemoWrite, requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import { apiOk, apiError } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { rateLimit } from '$lib/server/rateLimiter.js';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// ── Helper: find lender app and its index ───────────────────────

function findLenderApp(caseDoc: any, lenderAppId: string) {
	const index = caseDoc.lender_applications.findIndex(
		(la: any) => la.lender_application_id === lenderAppId
	);
	if (index === -1) return null;
	return { index, lenderApp: caseDoc.lender_applications[index] };
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	// Rate limit: 20 requests per minute per user
	const mobileNumber = locals.user?.mobileNumber || 'anon';
	const isLimited = await rateLimit(mobileNumber, {
		maxRequests: 20,
		windowMs: 60_000,
		identifier: `doc-upload:${mobileNumber}`
	});
	if (isLimited) {
		return apiError('Too many requests. Please try again later.', 429);
	}

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const permDenied = requireTeamPermission(locals, 'cases_edit');
	if (permDenied) return permDenied;

	try {
		// ── Resolve ImageKit (gracefully fail if not configured) ──
		let imagekit: any = null;
		try {
			const mod = await import('$lib/imagekit/server.js');
			imagekit = mod.default;
		} catch {
			// ImageKit not configured
		}

		if (!imagekit) {
			return apiError('Document upload requires ImageKit configuration. Contact admin.', 503);
		}

		// ── Auth + ownership check ──
		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}

		const ownership = await verifyCaseOwnership(params.case_id, result.dsaId);
		if (!ownership.ok) {
			const status = ownership.error === 'Case not found' ? 404 : 403;
			return apiError(ownership.error, status);
		}

		const caseDoc = ownership.caseDoc;
		const found = findLenderApp(caseDoc, params.lender_app_id);
		if (!found) {
			return apiError('Lender application not found', 404);
		}

		// ── Find the document by doc_id ──
		const docIndex = found.lenderApp.document_checklist.findIndex(
			(d: DocumentChecklistItem) => d.doc_id === params.doc_id
		);
		if (docIndex === -1) {
			return apiError('Document not found', 404);
		}

		const existingDoc = found.lenderApp.document_checklist[docIndex];

		// ── Parse multipart form data ──
		const form = await request.formData();
		const file = form.get('file') as File | null;

		if (!file) {
			return apiError('No file provided', 400);
		}

		// ── Validate file type ──
		if (!ALLOWED_TYPES.includes(file.type)) {
			return apiError(`Invalid file type "${file.type}". Allowed: PDF, JPEG, PNG, WebP.`, 400);
		}

		// ── Validate file size ──
		if (file.size > MAX_SIZE) {
			return apiError(
				`File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum: 10MB.`,
				400
			);
		}

		// ── Upload to ImageKit ──
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const base64 = buffer.toString('base64');
		const dataUri = `data:${file.type};base64,${base64}`;

		const uploadResult = await imagekit.files.upload({
			file: dataUri,
			fileName: file.name || `doc_${Date.now()}`,
			folder: `/documents/${params.case_id}/${params.lender_app_id}/`,
			useUniqueFileName: true
		});

		// ── Update document in MongoDB ──
		const now = new Date();
		const prefix = `lender_applications.${found.index}.document_checklist.${docIndex}`;

		const uploadData = {
			file_url: uploadResult.url,
			file_id: uploadResult.fileId,
			file_type: file.type,
			file_size: file.size,
			uploaded_at: now
		};

		const $set: Record<string, any> = {
			[`${prefix}.upload`]: uploadData,
			[`${prefix}.status`]: 'uploaded',
			[`${prefix}.status_updated_at`]: now,
			[`lender_applications.${found.index}.updated_at`]: now,
			updated_at: now
		};

		await Cases.updateOne({ case_id: params.case_id, dsa_id: result.dsaId }, { $set });

		// ── Create timeline event ──
		await createTimelineEvent(
			params.case_id,
			'document_uploaded',
			`Document "${existingDoc.doc_name}" uploaded for ${found.lenderApp.lender_name}`,
			{
				lender_name: found.lenderApp.lender_name,
				doc_id: params.doc_id,
				doc_name: existingDoc.doc_name,
				file_type: file.type,
				file_size: file.size
			}
		);

		return apiOk({
			doc_id: params.doc_id,
			upload: uploadData
		});
	} catch (err) {
		// left: catch returns an extra `details` key (raw error message) beyond the
		// standard success/error shape; apiServerError does not surface details to the client.
		logger.error({ err }, 'Document upload error');
		const message = err instanceof Error ? err.message : 'Unknown error';
		return json(
			{ success: false, error: 'Failed to upload document', details: message },
			{ status: 500 }
		);
	}
};
