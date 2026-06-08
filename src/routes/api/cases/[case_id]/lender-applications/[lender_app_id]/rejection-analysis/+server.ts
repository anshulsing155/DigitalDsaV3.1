/**
 * GET  /api/cases/[case_id]/lender-applications/[lender_app_id]/rejection-analysis
 * ══════════════════════════════════════════════════════════════════
 * Returns rejection analysis with reroute suggestions and
 * prevention tips for a rejected lender application.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { resolveEffectiveDsaId, verifyCaseOwnership } from '$lib/server/caseHelpers.js';
import { analyzeRejection } from '$lib/server/rejectionAnalyzer.js';
import { bankData } from '$lib/config/bankSelection/bankName.js';
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
		const lenderAppId = params.lender_app_id;

		// Find the lender application
		const lenderApp = caseDoc.lender_applications.find(
			(la) => la.lender_application_id === lenderAppId
		);

		if (!lenderApp) {
			return apiError('Lender application not found', 404);
		}

		// Must be rejected
		if (lenderApp.status !== 'rejected') {
			return apiError(
				`Lender application is not rejected (current status: ${lenderApp.status})`,
				400
			);
		}

		// Build lender names list and classification map from bankData
		const allLenderNames = bankData.map((b) => b.value);
		const bankClassifications: Record<string, string> = {};
		for (const bank of bankData) {
			bankClassifications[bank.value] = bank.Classification;
		}

		const analysis = analyzeRejection(lenderApp, caseDoc, allLenderNames, bankClassifications);

		return apiOk(analysis);
	} catch (err) {
		return apiServerError(err, 'Failed to generate rejection analysis');
	}
};
