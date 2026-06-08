/**
 * GET  /api/cases/[case_id]/reminders
 * ══════════════════════════════════════════════════════════════════
 * Returns smart reminders for a specific case.
 * Sorted by priority (high first), then by created_at.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { resolveEffectiveDsaId, verifyCaseOwnership } from '$lib/server/caseHelpers.js';
import { generateReminders } from '$lib/server/reminderEngine.js';
import { requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';

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

		const caseDoc = ownership.caseDoc;
		const reminders = generateReminders(caseDoc);

		return apiOk({
			case_id: params.case_id,
			reminders,
			total: reminders.length
		});
	} catch (err) {
		return apiServerError(err, 'Failed to generate reminders');
	}
};
