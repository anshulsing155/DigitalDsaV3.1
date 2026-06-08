/**
 * GET / POST  /api/cases/[case_id]/lender-applications
 * ══════════════════════════════════════════════════════════════════
 * List and add lender applications for a case.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { Cases } from '$lib/database/mongo.js';
import {
	resolveEffectiveDsaId,
	verifyCaseOwnership,
	createTimelineEvent
} from '$lib/server/caseHelpers.js';
import type { LenderApplication } from '$lib/types/case.js';
import { blockDemoWrite, requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import {
	apiOk,
	apiError,
	apiValidationError,
	apiServerError,
	parseJsonBody
} from '$lib/server/apiResponse.js';

const addLenderSchema = z.object({
	lender_id: z.string().min(1, 'lender_id is required'),
	lender_name: z.string().min(1, 'lender_name is required'),
	rm_contact_id: z.string().optional()
});

// ── GET — List lender applications ──────────────────────────────

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

		return apiOk(ownership.caseDoc.lender_applications);
	} catch (err) {
		return apiServerError(err, 'Failed to fetch lender applications');
	}
};

// ── POST — Add lender application ───────────────────────────────

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
		const parsed = addLenderSchema.safeParse(jsonParsed.data);
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
		const { lender_id, lender_name, rm_contact_id } = parsed.data;

		// Check if lender already exists in this case
		const alreadyExists = caseDoc.lender_applications.some((la) => la.lender_id === lender_id);
		if (alreadyExists) {
			return apiError(`Lender "${lender_name}" is already added to this case`, 409);
		}

		const now = new Date();
		const lenderAppId = crypto.randomUUID();

		// ── Build lender application ────────────────────────────
		const newLenderApp: LenderApplication = {
			lender_application_id: lenderAppId,
			lender_id,
			lender_name,
			status: 'selected',
			status_history: [
				{
					from: 'selected',
					to: 'selected',
					timestamp: now
				}
			],
			document_checklist: [],
			queries: [],
			file_snapshots: [],
			...(rm_contact_id ? { rm_contact_id: rm_contact_id as any } : {}),
			created_at: now,
			updated_at: now
		};

		// ── Update case ─────────────────────────────────────────
		const updateOps: Record<string, any> = {
			$push: { lender_applications: newLenderApp },
			$set: { updated_at: now }
		};

		// If this is the first lender, set as primary
		if (caseDoc.lender_applications.length === 0) {
			updateOps.$set.primary_lender_id = lenderAppId;
		}

		await Cases.updateOne({ case_id: params.case_id, dsa_id: result.dsaId }, updateOps);

		// ── Create timeline event ───────────────────────────────
		await createTimelineEvent(params.case_id, 'lender_added', `${lender_name} added as lender`, {
			lender_id,
			lender_name,
			lender_application_id: lenderAppId
		});

		return apiOk(newLenderApp, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to add lender application');
	}
};
