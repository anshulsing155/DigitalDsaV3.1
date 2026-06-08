/**
 * PATCH / DELETE  /api/cases/[case_id]/lender-applications/[lender_app_id]/documents/[doc_id]
 * ══════════════════════════════════════════════════════════════════
 * Single document management within a lender application checklist.
 *
 * PATCH:  Update document status, upload info, validity, or notes.
 * DELETE: Remove a document from the checklist.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { Cases } from '$lib/database/mongo.js';
import { documentStatusEnum } from '$lib/schemas/case.schema.js';
import {
	resolveEffectiveDsaId,
	verifyCaseOwnership,
	createTimelineEvent
} from '$lib/server/caseHelpers.js';
import type { DocumentChecklistItem } from '$lib/types/case.js';
import { blockDemoWrite, requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import {
	apiOk,
	apiError,
	apiValidationError,
	apiServerError,
	parseJsonBody
} from '$lib/server/apiResponse.js';

// ── Schemas ─────────────────────────────────────────────────────

const updateDocumentSchema = z.object({
	status: documentStatusEnum.optional(),
	upload: z
		.object({
			file_url: z.string().min(1),
			file_id: z.string().min(1),
			file_type: z.string().min(1),
			file_size: z.number().positive()
		})
		.optional(),
	validity: z
		.object({
			valid_from: z.coerce.date().optional(),
			valid_until: z.coerce.date().optional(),
			freshness_rule_days: z.number().int().min(0).optional()
		})
		.optional(),
	dsa_notes: z.string().optional()
});

// ── Helper: find lender app and its index ───────────────────────

function findLenderApp(caseDoc: any, lenderAppId: string) {
	const index = caseDoc.lender_applications.findIndex(
		(la: any) => la.lender_application_id === lenderAppId
	);
	if (index === -1) return null;
	return { index, lenderApp: caseDoc.lender_applications[index] };
}

// ── Helper: compute freshness fields for a document ─────────────

function computeFreshness(doc: DocumentChecklistItem) {
	const now = new Date();
	const validUntil = doc.validity?.valid_until ? new Date(doc.validity.valid_until) : null;

	const is_expiring_soon = validUntil
		? validUntil.getTime() - now.getTime() < 15 * 24 * 60 * 60 * 1000
		: false;

	const is_expired = validUntil ? validUntil < now : false;

	const days_until_expiry = validUntil
		? Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
		: null;

	return {
		...doc,
		is_expiring_soon,
		is_expired,
		days_until_expiry
	};
}

// ── PATCH — Update a document ───────────────────────────────────

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'cases_edit');
	if (permDenied) return permDenied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		// Validate input
		const parsed = updateDocumentSchema.safeParse(jsonParsed.data);
		if (!parsed.success) {
			return apiValidationError('Validation failed', parsed.error.flatten());
		}

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

		// Find the document by doc_id
		const docIndex = found.lenderApp.document_checklist.findIndex(
			(d: DocumentChecklistItem) => d.doc_id === params.doc_id
		);
		if (docIndex === -1) {
			return apiError('Document not found', 404);
		}

		const existingDoc = found.lenderApp.document_checklist[docIndex];
		const now = new Date();
		const prefix = `lender_applications.${found.index}.document_checklist.${docIndex}`;

		const $set: Record<string, any> = {
			[`lender_applications.${found.index}.updated_at`]: now,
			updated_at: now
		};

		const { status: newStatus, upload, validity, dsa_notes } = parsed.data;
		let effectiveStatus = newStatus;
		let statusChanged = false;
		let documentUploaded = false;

		// If upload is provided and status is not explicitly 'uploaded', auto-set to 'uploaded'
		if (upload && effectiveStatus !== 'uploaded') {
			effectiveStatus = 'uploaded';
		}

		// Handle status change
		if (effectiveStatus && effectiveStatus !== existingDoc.status) {
			$set[`${prefix}.status`] = effectiveStatus;
			$set[`${prefix}.status_updated_at`] = now;
			statusChanged = true;
		}

		// Handle upload
		if (upload) {
			$set[`${prefix}.upload`] = {
				file_url: upload.file_url,
				file_id: upload.file_id,
				file_type: upload.file_type,
				file_size: upload.file_size,
				uploaded_at: now
			};
			documentUploaded = true;
		}

		// Handle validity updates
		if (validity) {
			const existingValidity = existingDoc.validity || {
				is_fresh: true,
				freshness_rule_days: 0
			};

			const updatedValidity: Record<string, any> = {
				is_fresh: existingValidity.is_fresh,
				freshness_rule_days: validity.freshness_rule_days ?? existingValidity.freshness_rule_days
			};

			if (validity.valid_from !== undefined) {
				updatedValidity.valid_from = validity.valid_from;
			} else if (existingValidity.valid_from) {
				updatedValidity.valid_from = existingValidity.valid_from;
			}

			if (validity.valid_until !== undefined) {
				updatedValidity.valid_until = validity.valid_until;
			} else if (existingValidity.valid_until) {
				updatedValidity.valid_until = existingValidity.valid_until;
			}

			// Recompute is_fresh based on valid_until
			if (updatedValidity.valid_until) {
				const validUntil = new Date(updatedValidity.valid_until);
				updatedValidity.is_fresh = validUntil > now;
			}

			$set[`${prefix}.validity`] = updatedValidity;
		}

		// Handle dsa_notes
		if (dsa_notes !== undefined) {
			$set[`${prefix}.dsa_notes`] = dsa_notes;
		}

		await Cases.updateOne({ case_id: params.case_id, dsa_id: result.dsaId }, { $set });

		// Create timeline event
		if (documentUploaded) {
			await createTimelineEvent(
				params.case_id,
				'document_uploaded',
				`Document "${existingDoc.doc_name}" uploaded for ${found.lenderApp.lender_name}`,
				{
					lender_name: found.lenderApp.lender_name,
					doc_id: params.doc_id,
					doc_name: existingDoc.doc_name,
					file_type: upload!.file_type,
					file_size: upload!.file_size
				}
			);
		} else if (statusChanged) {
			await createTimelineEvent(
				params.case_id,
				'document_status_changed',
				`Document "${existingDoc.doc_name}" status changed from "${existingDoc.status}" to "${effectiveStatus}" for ${found.lenderApp.lender_name}`,
				{
					lender_name: found.lenderApp.lender_name,
					doc_id: params.doc_id,
					doc_name: existingDoc.doc_name,
					from_status: existingDoc.status,
					to_status: effectiveStatus
				}
			);
		}

		// Re-fetch the updated document to return
		const updatedCase = await Cases.findOne({ case_id: params.case_id, dsa_id: result.dsaId });
		const updatedLenderApp = updatedCase?.lender_applications.find(
			(la) => la.lender_application_id === params.lender_app_id
		);
		const updatedDoc = updatedLenderApp?.document_checklist.find((d) => d.doc_id === params.doc_id);

		if (!updatedDoc) {
			return apiError('Failed to retrieve updated document', 500);
		}

		return apiOk(computeFreshness(updatedDoc));
	} catch (err) {
		return apiServerError(err, 'Failed to update document');
	}
};

// ── DELETE — Remove a document ──────────────────────────────────

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'cases_edit');
	if (permDenied) return permDenied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
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

		// Find the document to get its name for the timeline event
		const doc = found.lenderApp.document_checklist.find(
			(d: DocumentChecklistItem) => d.doc_id === params.doc_id
		);
		if (!doc) {
			return apiError('Document not found', 404);
		}

		const now = new Date();
		const prefix = `lender_applications.${found.index}.document_checklist`;

		// Remove using $pull on the nested array
		await Cases.updateOne(
			{ case_id: params.case_id, dsa_id: result.dsaId },
			{
				$pull: { [prefix]: { doc_id: params.doc_id } } as any,
				$set: {
					[`lender_applications.${found.index}.updated_at`]: now,
					updated_at: now
				}
			}
		);

		// Create timeline event
		await createTimelineEvent(
			params.case_id,
			'document_status_changed',
			`Document "${doc.doc_name}" removed from ${found.lenderApp.lender_name} checklist`,
			{
				lender_name: found.lenderApp.lender_name,
				doc_id: params.doc_id,
				doc_name: doc.doc_name,
				action: 'removed'
			}
		);

		return apiOk({ doc_id: params.doc_id, removed: true });
	} catch (err) {
		return apiServerError(err, 'Failed to delete document');
	}
};
