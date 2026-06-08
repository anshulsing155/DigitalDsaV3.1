/**
 * POST  /api/cases/[case_id]/lender-applications/[lender_app_id]/documents/bulk
 * ══════════════════════════════════════════════════════════════════
 * Bulk-add documents to a lender application's checklist.
 * Useful for applying lender-specific document templates in batch.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { Cases } from '$lib/database/mongo.js';
import { documentCategoryEnum } from '$lib/schemas/case.schema.js';
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

const bulkDocumentItemSchema = z.object({
	doc_name: z.string().min(1, 'doc_name is required'),
	category: documentCategoryEnum,
	is_mandatory: z.boolean(),
	description: z.string().optional(),
	validity: z
		.object({
			valid_from: z.coerce.date().optional(),
			valid_until: z.coerce.date().optional(),
			freshness_rule_days: z.number().int().min(0).optional()
		})
		.optional()
});

const bulkAddSchema = z.object({
	documents: z.array(bulkDocumentItemSchema).min(1, 'At least one document is required')
});

// ── Helper: find lender app and its index ───────────────────────

function findLenderApp(caseDoc: any, lenderAppId: string) {
	const index = caseDoc.lender_applications.findIndex(
		(la: any) => la.lender_application_id === lenderAppId
	);
	if (index === -1) return null;
	return { index, lenderApp: caseDoc.lender_applications[index] };
}

// ── POST — Bulk add documents ───────────────────────────────────

export const POST: RequestHandler = async ({ params, request, locals }) => {
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
		const parsed = bulkAddSchema.safeParse(jsonParsed.data);
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

		const now = new Date();

		// Build all new document checklist items
		const newDocs: DocumentChecklistItem[] = parsed.data.documents.map((docInput) => {
			const docId = crypto.randomUUID();
			const newDoc: DocumentChecklistItem = {
				doc_id: docId,
				doc_name: docInput.doc_name,
				category: docInput.category,
				is_mandatory: docInput.is_mandatory,
				...(docInput.description ? { description: docInput.description } : {}),
				status: 'not_started',
				status_updated_at: now,
				...(docInput.validity
					? {
							validity: {
								...(docInput.validity.valid_from
									? { valid_from: docInput.validity.valid_from }
									: {}),
								...(docInput.validity.valid_until
									? { valid_until: docInput.validity.valid_until }
									: {}),
								is_fresh: true,
								freshness_rule_days: docInput.validity.freshness_rule_days ?? 0
							}
						}
					: {})
			};
			return newDoc;
		});

		const prefix = `lender_applications.${found.index}`;

		// Push all documents at once using $each
		await Cases.updateOne(
			{ case_id: params.case_id },
			{
				$push: { [`${prefix}.document_checklist`]: { $each: newDocs } } as any,
				$set: {
					[`${prefix}.updated_at`]: now,
					updated_at: now
				}
			}
		);

		// Create a single timeline event summarizing the bulk add
		const docNames = newDocs.map((d) => d.doc_name);
		await createTimelineEvent(
			params.case_id,
			'document_status_changed',
			`${newDocs.length} document(s) bulk-added to ${found.lenderApp.lender_name} checklist`,
			{
				lender_name: found.lenderApp.lender_name,
				action: 'bulk_added',
				count: newDocs.length,
				doc_names: docNames
			}
		);

		return apiOk(newDocs, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to bulk-add documents');
	}
};
