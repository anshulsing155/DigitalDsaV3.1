/**
 * PATCH  /api/cases/[case_id]/stage
 * ══════════════════════════════════════════════════════════════════
 * Dedicated stage transition endpoint.
 * Validates the transition using the stage pipeline, updates the
 * stage, adds to stage_history, and creates a timeline event.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { Cases } from '$lib/database/mongo.js';
import { caseStageEnum } from '$lib/schemas/case.schema.js';
import { validateTransition, getAvailableTransitions } from '$lib/server/stagePipeline.js';
import {
	resolveEffectiveDsaId,
	verifyCaseOwnership,
	createTimelineEvent
} from '$lib/server/caseHelpers.js';
import { blockDemoWrite, requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import logger from '$lib/server/logger.js';
import {
	apiOk,
	apiError,
	apiServerError,
	apiStructuredError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { createNotification } from '$lib/server/notifications.js';
import { DROP_REASONS, type DropReason } from '$lib/types/case.js';

// F.4 — drop_reason is required ONLY when stage === 'dropped'. Zod
// refinement enforces this at the API boundary so the UI can never
// drop a case without surfacing the structured reason. drop_reason_note
// is required only when drop_reason === 'other' (free-text fallback).
const stageUpdateSchema = z
	.object({
		stage: caseStageEnum,
		notes: z.string().optional(),
		drop_reason: z.enum(DROP_REASONS as readonly [DropReason, ...DropReason[]]).optional(),
		drop_reason_note: z.string().max(500).optional()
	})
	.superRefine((data, ctx) => {
		if (data.stage === 'dropped') {
			if (!data.drop_reason) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['drop_reason'],
					message:
						'A drop reason is required when moving a case to "Dropped". Pick one from the list (or "Other" with a note).'
				});
			}
			if (data.drop_reason === 'other' && !data.drop_reason_note?.trim()) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['drop_reason_note'],
					message:
						'When the drop reason is "Other", please add a short note explaining what happened.'
				});
			}
		}
	});

// ── PATCH — Update case stage ───────────────────────────────────

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
		const parsed = stageUpdateSchema.safeParse(jsonParsed.data);
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
		const { stage: targetStage, notes, drop_reason, drop_reason_note } = parsed.data;

		// ── Validate transition ─────────────────────────────────
		const transition = validateTransition(caseDoc.stage, targetStage);
		if (!transition.valid) {
			// Preserve the available_transitions hint in the 400 response so
			// the UI can render the allowed next steps for the DSA.
			return apiStructuredError(
				transition.error ?? 'Invalid stage transition',
				{ available_transitions: getAvailableTransitions(caseDoc.stage) },
				400
			);
		}

		const now = new Date();

		// ── Update case ─────────────────────────────────────────
		// F.4 — when moving to 'dropped', store the structured reason on
		// the case (for the Win/Loss aggregation query) AND on the
		// stage_history entry (immutable per AD-02, survives re-open).
		// When moving AWAY from 'dropped' (re-open), clear the top-level
		// fields so the case isn't surfaced in the dropped report — the
		// historical reason stays in stage_history forever.
		const isDropping = targetStage === 'dropped';
		const isReopening = caseDoc.stage === 'dropped' && targetStage !== 'dropped';

		const setFields: Record<string, unknown> = { stage: targetStage, updated_at: now };
		if (isDropping) {
			setFields.drop_reason = drop_reason;
			if (drop_reason_note) setFields.drop_reason_note = drop_reason_note;
		}
		const historyEntry: Record<string, unknown> = {
			from: caseDoc.stage,
			to: targetStage,
			timestamp: now
		};
		if (notes) historyEntry.notes = notes;
		if (isDropping && drop_reason) historyEntry.drop_reason = drop_reason;
		if (isDropping && drop_reason_note) historyEntry.drop_reason_note = drop_reason_note;

		const updateOps: Record<string, unknown> = {
			$set: setFields,
			$push: { stage_history: historyEntry }
		};
		if (isReopening) {
			updateOps.$unset = { drop_reason: '', drop_reason_note: '' };
		}

		await Cases.updateOne(
			{ case_id: params.case_id, dsa_id: result.dsaId },
			updateOps as Parameters<typeof Cases.updateOne>[1]
		);

		// ── Create timeline event ───────────────────────────────
		await createTimelineEvent(
			params.case_id,
			'stage_changed',
			`Stage changed from ${caseDoc.stage} to ${targetStage}${notes ? ': ' + notes : ''}`,
			{ from: caseDoc.stage, to: targetStage, notes }
		);

		// Fire-and-forget: create in-app notification for the DSA
		createNotification({
			user_id: result.dsaId.toString(),
			user_role: 'dsa',
			type: 'case_status',
			title: 'Case stage updated',
			message: `Case moved from ${caseDoc.stage} to ${targetStage}${notes ? ': ' + notes : ''}`,
			case_id: params.case_id,
			action_url: `/dashboard/dsa/cases/${params.case_id}`
		}).catch((err) => logger.warn({ err }, 'Failed to create stage change notification'));

		// Fetch and return updated document
		const updated = await Cases.findOne({ case_id: params.case_id, dsa_id: result.dsaId });

		return apiOk(updated);
	} catch (err) {
		return apiServerError(err, 'Failed to update case stage');
	}
};
