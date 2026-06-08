/**
 * GET / PATCH  /api/cases/[case_id]/selections
 * ══════════════════════════════════════════════════════════════════
 * Read and update lender selection states (neutral / shortlisted / selected).
 * Selection state is mutable and lives on the Case document.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { Cases } from '$lib/database/mongo.js';
import { lenderSelectionUpdateSchema } from '$lib/schemas/lenderResultsSnapshot.schema.js';
import {
	resolveEffectiveDsaId,
	verifyCaseOwnership,
	createTimelineEvent
} from '$lib/server/caseHelpers.js';
import { blockDemoWrite, requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import {
	apiOk,
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import type { LenderSelection } from '$lib/types/lenderResultsSnapshot.js';

// ── GET — Get current selection states ──────────────────────────

export const GET: RequestHandler = async ({ params, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'results_view');
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

		return apiOk({ selections: ownership.caseDoc.lender_selections ?? [] });
	} catch (err) {
		return apiServerError(err, 'Failed to fetch selection states');
	}
};

// ── PATCH — Update selection states ─────────────────────────────

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'results_view');
	if (permDenied) return permDenied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		// Validate input
		const parsed = lenderSelectionUpdateSchema.safeParse(jsonParsed.data);
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

		const now = new Date();
		const existingSelections: LenderSelection[] = ownership.caseDoc.lender_selections ?? [];

		// ── Build new selection objects ──────────────────────────
		const incomingSelections: LenderSelection[] = parsed.data.selections.map((s) => ({
			lender_application_id: s.lender_application_id,
			state: s.state,
			updated_at: now
		}));

		// ── Merge: update existing entries or append new ones ────
		const mergedSelections = [...existingSelections];

		for (const incoming of incomingSelections) {
			const existingIndex = mergedSelections.findIndex(
				(sel) => sel.lender_application_id === incoming.lender_application_id
			);

			if (existingIndex !== -1) {
				mergedSelections[existingIndex] = incoming;
			} else {
				mergedSelections.push(incoming);
			}
		}

		// ── Update case document ────────────────────────────────
		await Cases.updateOne(
			{ case_id: params.case_id },
			{ $set: { lender_selections: mergedSelections, updated_at: now } }
		);

		// ── Create timeline events for state changes ────────────
		const timelinePromises: Promise<void>[] = [];

		for (const incoming of incomingSelections) {
			const existing = existingSelections.find(
				(sel) => sel.lender_application_id === incoming.lender_application_id
			);
			const previousState = existing?.state ?? 'neutral';

			// Skip if state did not actually change
			if (previousState === incoming.state) continue;

			const metadata = {
				lender_application_id: incoming.lender_application_id,
				state: incoming.state,
				previous_state: previousState
			};

			if (incoming.state === 'shortlisted') {
				timelinePromises.push(
					createTimelineEvent(
						params.case_id,
						'lender_shortlisted',
						`Lender ${incoming.lender_application_id} shortlisted`,
						metadata
					)
				);
			} else if (incoming.state === 'selected') {
				timelinePromises.push(
					createTimelineEvent(
						params.case_id,
						'lender_selected',
						`Lender ${incoming.lender_application_id} selected`,
						metadata
					)
				);
			} else if (incoming.state === 'neutral' && previousState !== 'neutral') {
				timelinePromises.push(
					createTimelineEvent(
						params.case_id,
						'lender_deselected',
						`Lender ${incoming.lender_application_id} deselected`,
						metadata
					)
				);
			}
		}

		await Promise.all(timelinePromises);

		return apiOk({ selections: mergedSelections });
	} catch (err) {
		return apiServerError(err, 'Failed to update selection states');
	}
};
