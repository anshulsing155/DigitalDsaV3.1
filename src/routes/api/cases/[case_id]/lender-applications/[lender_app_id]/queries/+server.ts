/**
 * GET / POST / PATCH  /api/cases/[case_id]/lender-applications/[lender_app_id]/queries
 * ══════════════════════════════════════════════════════════════════
 * Query management for a lender application.
 *
 * GET:   List queries with computed days_open.
 * POST:  Raise a new query.
 * PATCH: Respond to or resolve a query.
 * ══════════════════════════════════════════════════════════════════
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { Cases } from '$lib/database/mongo.js';
import { queryCategoryEnum } from '$lib/schemas/case.schema.js';
import { canTransitionTo } from '$lib/server/stagePipeline.js';
import {
	resolveEffectiveDsaId,
	verifyCaseOwnership,
	createTimelineEvent
} from '$lib/server/caseHelpers.js';
import type { LenderQuery } from '$lib/types/case.js';
import { blockDemoWrite, requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import {
	apiOk,
	apiError,
	apiValidationError,
	apiServerError,
	parseJsonBody
} from '$lib/server/apiResponse.js';

// ── Schemas ─────────────────────────────────────────────────────

const addQuerySchema = z.object({
	query_text: z.string().min(1, 'query_text is required'),
	category: queryCategoryEnum,
	deadline: z.coerce.date().optional()
});

const updateQuerySchema = z.object({
	query_id: z.string().min(1, 'query_id is required'),
	action: z.enum(['respond', 'resolve']),
	response_text: z.string().optional(),
	attachments: z.array(z.string()).optional()
});

// ── Helper: compute days_open ───────────────────────────────────

function computeDaysOpen(raisedAt: Date): number {
	const now = new Date();
	return Math.floor((now.getTime() - new Date(raisedAt).getTime()) / (1000 * 60 * 60 * 24));
}

// ── Helper: find lender app and its index ───────────────────────

function findLenderApp(caseDoc: any, lenderAppId: string) {
	const index = caseDoc.lender_applications.findIndex(
		(la: any) => la.lender_application_id === lenderAppId
	);
	if (index === -1) return null;
	return { index, lenderApp: caseDoc.lender_applications[index] };
}

// ── GET — List queries ──────────────────────────────────────────

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

		// Compute days_open for each query
		const queriesWithDays = found.lenderApp.queries.map((q: LenderQuery) => ({
			...q,
			days_open: q.status === 'resolved' ? q.days_open : computeDaysOpen(q.raised_at)
		}));

		return apiOk(queriesWithDays);
	} catch (err) {
		return apiServerError(err, 'Failed to fetch queries');
	}
};

// ── POST — Add a query ──────────────────────────────────────────

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
		const parsed = addQuerySchema.safeParse(jsonParsed.data);
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

		const { query_text, category, deadline } = parsed.data;
		const now = new Date();
		const queryId = crypto.randomUUID();

		// ── Build query ─────────────────────────────────────────
		const newQuery: LenderQuery = {
			query_id: queryId,
			query_text,
			category,
			raised_at: now,
			...(deadline ? { deadline } : {}),
			status: 'open',
			days_open: 0
		};

		const prefix = `lender_applications.${found.index}`;

		// ── Update case ─────────────────────────────────────────
		const updateOps: Record<string, any> = {
			$push: { [`${prefix}.queries`]: newQuery },
			$set: {
				[`${prefix}.updated_at`]: now,
				updated_at: now
			}
		};

		// Auto-transition case to 'query' stage if not already there
		if (caseDoc.stage !== 'query' && canTransitionTo(caseDoc.stage, 'query')) {
			updateOps.$set.stage = 'query';
			updateOps.$push.stage_history = {
				from: caseDoc.stage,
				to: 'query',
				timestamp: now,
				notes: `Auto-transitioned: query raised by ${found.lenderApp.lender_name}`
			};

			await createTimelineEvent(
				params.case_id,
				'stage_changed',
				`Stage auto-changed from ${caseDoc.stage} to query`,
				{ from: caseDoc.stage, to: 'query', auto: true }
			);
		}

		await Cases.updateOne({ case_id: params.case_id, dsa_id: result.dsaId }, updateOps);

		// ── Create timeline event ───────────────────────────────
		await createTimelineEvent(
			params.case_id,
			'query_raised',
			`Query raised by ${found.lenderApp.lender_name}: ${query_text.substring(0, 100)}`,
			{
				lender_name: found.lenderApp.lender_name,
				query_id: queryId,
				category
			}
		);

		return apiOk(newQuery, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to add query');
	}
};

// ── PATCH — Respond to or resolve a query ───────────────────────

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'cases_edit');
	if (permDenied) return permDenied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const jsonParsedPatch = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsedPatch.ok) return jsonParsedPatch.response;

	try {
		// Validate input
		const parsed = updateQuerySchema.safeParse(jsonParsedPatch.data);
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

		const { query_id, action, response_text, attachments } = parsed.data;

		// Find the query
		const queryIndex = found.lenderApp.queries.findIndex(
			(q: LenderQuery) => q.query_id === query_id
		);

		if (queryIndex === -1) {
			return apiError('Query not found', 404);
		}

		const query = found.lenderApp.queries[queryIndex];
		const now = new Date();
		const prefix = `lender_applications.${found.index}.queries.${queryIndex}`;

		// ── Build update ────────────────────────────────────────
		const $set: Record<string, any> = {
			[`lender_applications.${found.index}.updated_at`]: now,
			updated_at: now
		};

		if (action === 'respond') {
			if (query.status === 'resolved') {
				return apiError('Cannot respond to a resolved query', 400);
			}

			$set[`${prefix}.status`] = 'responded';
			$set[`${prefix}.response`] = {
				text: response_text || '',
				attachments: attachments || [],
				responded_at: now
			};
			$set[`${prefix}.days_open`] = computeDaysOpen(query.raised_at);

			await createTimelineEvent(
				params.case_id,
				'query_responded',
				`Query responded for ${found.lenderApp.lender_name}`,
				{
					lender_name: found.lenderApp.lender_name,
					query_id
				}
			);
		} else if (action === 'resolve') {
			$set[`${prefix}.status`] = 'resolved';
			$set[`${prefix}.days_open`] = computeDaysOpen(query.raised_at);

			// If a response is also provided, set it
			if (response_text) {
				$set[`${prefix}.response`] = {
					text: response_text,
					attachments: attachments || [],
					responded_at: now
				};
			}

			await createTimelineEvent(
				params.case_id,
				'query_resolved',
				`Query resolved for ${found.lenderApp.lender_name}`,
				{
					lender_name: found.lenderApp.lender_name,
					query_id
				}
			);
		}

		await Cases.updateOne({ case_id: params.case_id, dsa_id: result.dsaId }, { $set });

		// ── Check if all queries are resolved ───────────────────
		// Re-fetch case to get latest state
		const updatedCase = await Cases.findOne({ case_id: params.case_id, dsa_id: result.dsaId });
		if (updatedCase && updatedCase.stage === 'query') {
			const allResolved = updatedCase.lender_applications.every((la) =>
				la.queries.every((q) => q.status === 'resolved')
			);

			if (allResolved && canTransitionTo('query', 'processing')) {
				// Return suggestion to transition back to processing
				// left: extra top-level `suggestion` key beyond success/data — nesting it
				// under data would change the response shape and break the client.
				return json({
					success: true,
					data: updatedCase.lender_applications
						.find((la) => la.lender_application_id === params.lender_app_id)
						?.queries.find((q) => q.query_id === query_id),
					suggestion: {
						action: 'stage_transition',
						message:
							'All queries are resolved. Consider transitioning the case back to "processing" stage.',
						target_stage: 'processing'
					}
				});
			}
		}

		// Return the updated query
		const updatedLenderApp = updatedCase?.lender_applications.find(
			(la) => la.lender_application_id === params.lender_app_id
		);
		const updatedQuery = updatedLenderApp?.queries.find((q) => q.query_id === query_id);

		return apiOk(updatedQuery);
	} catch (err) {
		return apiServerError(err, 'Failed to update query');
	}
};
