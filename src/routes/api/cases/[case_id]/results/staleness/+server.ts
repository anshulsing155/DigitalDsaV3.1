/**
 * GET  /api/cases/[case_id]/results/staleness — Check policy staleness
 * ══════════════════════════════════════════════════════════════════
 * Checks if any lender policies have been updated since the most
 * recent evaluation. Returns a list of stale lenders so the DSA
 * knows when results should be re-evaluated.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { LenderResultsSnapshots, PolicyDocuments } from '$lib/database/mongo.js';
import { resolveEffectiveDsaId, verifyCaseOwnership } from '$lib/server/caseHelpers.js';
import { checkPolicyStaleness } from '$lib/server/lenderResultsHelpers.js';
import { requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';

// ── GET — Check if lender policies are stale ────────────────────

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

		// ── Load latest results snapshot ────────────────────────
		const latestSnapshot = await LenderResultsSnapshots.findOne(
			{ case_id: params.case_id },
			{ sort: { version: -1 }, projection: { created_at: 1, 'payload.results': 1 } }
		);

		if (!latestSnapshot) {
			return apiOk({
				stale_lenders: [],
				has_stale: false,
				message: 'No evaluation results yet'
			});
		}

		// ── Find policies created after the last evaluation ─────
		const policies = await PolicyDocuments.find(
			{ created_at: { $gt: latestSnapshot.created_at } },
			{ projection: { lender_name: 1, created_at: 1 } }
		).toArray();

		// ── Check staleness (pure function) ─────────────────────
		const policyUpdates = policies.map((p) => ({
			lender_name: p.lender_name,
			updated_at: p.created_at
		}));
		const allStaleness = checkPolicyStaleness(latestSnapshot.created_at, policyUpdates);
		const staleLenders = allStaleness.filter((s) => s.is_stale);

		return apiOk({
			stale_lenders: staleLenders,
			has_stale: staleLenders.length > 0,
			last_evaluated_at: latestSnapshot.created_at
		});
	} catch (err) {
		return apiServerError(err, 'Failed to check policy staleness');
	}
};
