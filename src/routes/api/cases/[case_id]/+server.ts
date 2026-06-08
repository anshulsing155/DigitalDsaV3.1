/**
 * GET / PATCH / DELETE  /api/cases/[case_id]
 * ══════════════════════════════════════════════════════════════════
 * Single case operations: read, update, and archive (soft delete).
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import {
	Cases,
	TimelineEvents,
	FormSnapshots,
	LenderResultsSnapshots,
	CaseTasks
} from '$lib/database/mongo.js';
import { caseUpdateSchema } from '$lib/schemas/case.schema.js';
import { validateTransition } from '$lib/server/stagePipeline.js';
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

// ── Helper: cascade-flag related data when a case is archived ──
// Marks timeline events, form snapshots, evaluations, and tasks
// so they can be filtered out of active queries without hard-deleting.
async function cascadeArchiveRelatedData(caseId: string): Promise<void> {
	const archiveFilter = { case_id: caseId };
	const archiveUpdate = { $set: { is_archived: true } };

	await Promise.all([
		TimelineEvents.updateMany(archiveFilter, archiveUpdate),
		FormSnapshots.updateMany(archiveFilter, archiveUpdate),
		LenderResultsSnapshots.updateMany(archiveFilter, archiveUpdate),
		CaseTasks.updateMany(archiveFilter, archiveUpdate)
	]);
}

// ── GET — Get single case ───────────────────────────────────────

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

		return apiOk(ownership.caseDoc);
	} catch (err) {
		return apiServerError(err, 'Failed to fetch case');
	}
};

// ── PATCH — Update case ─────────────────────────────────────────

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
		// Validate with caseUpdateSchema
		const parsed = caseUpdateSchema.safeParse(jsonParsed.data);
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
		const data = parsed.data;
		const now = new Date();

		// ── Build update ────────────────────────────────────────
		const $set: Record<string, any> = { updated_at: now };
		const $push: Record<string, any> = {};

		// Stage change validation
		if (data.stage && data.stage !== caseDoc.stage) {
			const transition = validateTransition(caseDoc.stage, data.stage);
			if (!transition.valid) {
				return apiError(transition.error ?? 'Invalid stage transition', 400);
			}

			$set.stage = data.stage;
			$push.stage_history = {
				from: caseDoc.stage,
				to: data.stage,
				timestamp: now
			};

			// Create timeline event for stage change
			await createTimelineEvent(
				params.case_id,
				'stage_changed',
				`Stage changed from ${caseDoc.stage} to ${data.stage}`,
				{ from: caseDoc.stage, to: data.stage }
			);
		}

		// Copy over non-stage fields. A manual label edit locks the label so the
		// B.1 backfill/auto-regeneration never clobbers the DSA's chosen title.
		if (data.label !== undefined) {
			$set.label = data.label;
			$set.label_is_custom = true;
		}
		if (data.loan !== undefined) {
			// Merge loan fields (partial update using dot notation)
			if (data.loan.type !== undefined) $set['loan.type'] = data.loan.type;
			if (data.loan.amount_required !== undefined)
				$set['loan.amount_required'] = data.loan.amount_required;
			if (data.loan.tenure_years !== undefined) $set['loan.tenure_years'] = data.loan.tenure_years;
			if (data.loan.purpose !== undefined) $set['loan.purpose'] = data.loan.purpose;
		}
		if (data.primary_lender_id !== undefined) $set.primary_lender_id = data.primary_lender_id;
		if (data.optional_contact !== undefined) $set.optional_contact = data.optional_contact;
		if (data.source !== undefined) $set.source = data.source;
		if (data.notes !== undefined) $set.notes = data.notes;
		if (data.is_archived !== undefined) $set.is_archived = data.is_archived;
		if (data.is_sample !== undefined) $set.is_sample = data.is_sample;

		// ── Cascade archive to related data when archiving via PATCH ──
		if (data.is_archived === true) {
			await cascadeArchiveRelatedData(params.case_id);
		}

		// ── Execute update ──────────────────────────────────────
		const update: Record<string, any> = { $set };
		if (Object.keys($push).length > 0) {
			update.$push = $push;
		}

		await Cases.updateOne({ case_id: params.case_id, dsa_id: result.dsaId }, update);

		// Fetch and return updated document
		const updated = await Cases.findOne({ case_id: params.case_id, dsa_id: result.dsaId });

		return apiOk(updated);
	} catch (err) {
		return apiServerError(err, 'Failed to update case');
	}
};

// ── DELETE — Archive case (soft delete) ─────────────────────────

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

		const now = new Date();

		// Soft delete: set is_archived = true
		await Cases.updateOne(
			{ case_id: params.case_id, dsa_id: result.dsaId },
			{ $set: { is_archived: true, updated_at: now } }
		);

		// Cascade archive flag to related data (timeline, snapshots, evaluations, tasks)
		await cascadeArchiveRelatedData(params.case_id);

		// Create timeline event
		await createTimelineEvent(params.case_id, 'case_updated', 'Case archived', {
			action: 'archived'
		});

		return apiOk({ case_id: params.case_id, is_archived: true });
	} catch (err) {
		return apiServerError(err, 'Failed to archive case');
	}
};
