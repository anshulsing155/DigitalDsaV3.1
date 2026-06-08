/**
 * GET / POST  /api/cases/[case_id]/lender-applications/[lender_app_id]/documents
 * ══════════════════════════════════════════════════════════════════
 * Document checklist management for a lender application.
 *
 * GET:  List documents with computed freshness / expiry info.
 * POST: Add a single document to the checklist.
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

const addDocumentSchema = z.object({
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

// ── GET — List document checklist ───────────────────────────────

export const GET: RequestHandler = async ({ params, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'cases_view');
	if (permDenied) return permDenied;

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

		const found = findLenderApp(ownership.caseDoc, params.lender_app_id);
		if (!found) {
			return apiError('Lender application not found', 404);
		}

		// Compute freshness for each document
		const documentsWithFreshness = (found.lenderApp.document_checklist || []).map(
			(doc: DocumentChecklistItem) => computeFreshness(doc)
		);

		return apiOk(documentsWithFreshness);
	} catch (err) {
		return apiServerError(err, 'Failed to fetch documents');
	}
};

// ── POST — Add a document ───────────────────────────────────────

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
		const parsed = addDocumentSchema.safeParse(jsonParsed.data);
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

		const { doc_name, category, is_mandatory, description, validity } = parsed.data;
		const now = new Date();
		const docId = crypto.randomUUID();

		// Build the new document checklist item
		const newDoc: DocumentChecklistItem = {
			doc_id: docId,
			doc_name,
			category,
			is_mandatory,
			...(description ? { description } : {}),
			status: 'not_started',
			status_updated_at: now,
			...(validity
				? {
						validity: {
							...(validity.valid_from ? { valid_from: validity.valid_from } : {}),
							...(validity.valid_until ? { valid_until: validity.valid_until } : {}),
							is_fresh: true,
							freshness_rule_days: validity.freshness_rule_days ?? 0
						}
					}
				: {})
		};

		const prefix = `lender_applications.${found.index}`;

		// Push to document_checklist
		await Cases.updateOne(
			{ case_id: params.case_id },
			{
				$push: { [`${prefix}.document_checklist`]: newDoc },
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
			`Document "${doc_name}" added to ${found.lenderApp.lender_name} checklist`,
			{
				lender_name: found.lenderApp.lender_name,
				doc_id: docId,
				doc_name,
				category,
				action: 'added'
			}
		);

		return apiOk(newDoc, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to add document');
	}
};
