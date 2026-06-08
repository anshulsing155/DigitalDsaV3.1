/**
 * POST  /api/cases/[case_id]/lender-applications/[lender_app_id]/documents/apply-template
 * ══════════════════════════════════════════════════════════════════
 * Apply a lender-specific document template to a lender application.
 *
 * Looks up a pre-defined template by lender name, skips documents
 * that already exist (by doc_name match), and adds the rest.
 * ══════════════════════════════════════════════════════════════════
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { Cases } from '$lib/database/mongo.js';
import {
	resolveEffectiveDsaId,
	verifyCaseOwnership,
	createTimelineEvent
} from '$lib/server/caseHelpers.js';
import { LENDER_DOCUMENT_TEMPLATES } from '$lib/server/data/documentTemplates.js';
import type { DocumentChecklistItem } from '$lib/types/case.js';
import { blockDemoWrite, requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import {
	apiError,
	apiValidationError,
	apiServerError,
	parseJsonBody
} from '$lib/server/apiResponse.js';

// ── Schemas ─────────────────────────────────────────────────────

const applyTemplateSchema = z.object({
	lender_name: z.string().optional()
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

// ── POST — Apply lender document template ───────────────────────

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
		const parsed = applyTemplateSchema.safeParse(jsonParsed.data);
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

		// Determine lender name — use provided name or auto-detect from lender app
		const lenderName = parsed.data.lender_name || found.lenderApp.lender_name;

		// Look up the template
		const template = LENDER_DOCUMENT_TEMPLATES[lenderName];
		if (!template) {
			const availableLenders = Object.keys(LENDER_DOCUMENT_TEMPLATES);
			// left: extra top-level `available_lenders` key beyond success/error —
			// nesting it would change the shape and break the client.
			return json(
				{
					success: false,
					error: `No document template found for lender "${lenderName}"`,
					available_lenders: availableLenders
				},
				{ status: 404 }
			);
		}

		// Get existing doc names to avoid duplicates
		const existingDocNames = new Set(
			(found.lenderApp.document_checklist || []).map((d: DocumentChecklistItem) => d.doc_name)
		);

		const now = new Date();

		// Build new documents, skipping any that already exist by name
		const newDocs: DocumentChecklistItem[] = [];
		for (const tmpl of template) {
			if (existingDocNames.has(tmpl.doc_name)) {
				continue; // Skip — already exists
			}

			const docId = crypto.randomUUID();
			const newDoc: DocumentChecklistItem = {
				doc_id: docId,
				doc_name: tmpl.doc_name,
				category: tmpl.category,
				is_mandatory: tmpl.is_mandatory,
				...(tmpl.description ? { description: tmpl.description } : {}),
				status: 'not_started',
				status_updated_at: now,
				...(tmpl.freshness_rule_days > 0
					? {
							validity: {
								is_fresh: true,
								freshness_rule_days: tmpl.freshness_rule_days
							}
						}
					: {})
			};

			newDocs.push(newDoc);
		}

		if (newDocs.length === 0) {
			// All template documents already exist — return the current checklist
			const currentChecklist = (found.lenderApp.document_checklist || []).map(
				(doc: DocumentChecklistItem) => computeFreshness(doc)
			);
			// left: extra top-level `message` key alongside data — nesting it under
			// data would change the shape and break the client.
			return json({
				success: true,
				data: currentChecklist,
				message: 'All template documents already exist in the checklist'
			});
		}

		const prefix = `lender_applications.${found.index}`;

		// Push all new documents at once
		await Cases.updateOne(
			{ case_id: params.case_id, dsa_id: result.dsaId },
			{
				$push: { [`${prefix}.document_checklist`]: { $each: newDocs } } as any,
				$set: {
					[`${prefix}.updated_at`]: now,
					updated_at: now
				}
			}
		);

		// Create timeline event
		await createTimelineEvent(
			params.case_id,
			'document_status_changed',
			`Applied "${lenderName}" document template: ${newDocs.length} document(s) added to ${found.lenderApp.lender_name} checklist`,
			{
				lender_name: found.lenderApp.lender_name,
				template_name: lenderName,
				action: 'template_applied',
				added_count: newDocs.length,
				skipped_count: template.length - newDocs.length,
				doc_names: newDocs.map((d) => d.doc_name)
			}
		);

		// Re-fetch to return the complete updated checklist
		const updatedCase = await Cases.findOne({ case_id: params.case_id, dsa_id: result.dsaId });
		const updatedLenderApp = updatedCase?.lender_applications.find(
			(la) => la.lender_application_id === params.lender_app_id
		);

		const completeChecklist = (updatedLenderApp?.document_checklist || []).map(
			(doc: DocumentChecklistItem) => computeFreshness(doc)
		);

		// left: extra top-level `summary` key alongside data — nesting it under data
		// would change the shape and break the client.
		return json(
			{
				success: true,
				data: completeChecklist,
				summary: {
					template_name: lenderName,
					total_in_template: template.length,
					added: newDocs.length,
					skipped_existing: template.length - newDocs.length
				}
			},
			{ status: 201 }
		);
	} catch (err) {
		return apiServerError(err, 'Failed to apply document template');
	}
};
