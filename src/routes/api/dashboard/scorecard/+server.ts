/**
 * GET  /api/dashboard/scorecard
 * ══════════════════════════════════════════════════════════════════
 * Computes the performance scorecard for the authenticated DSA.
 * Returns 8 metrics, overall score, insights, and trends.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { Cases, DsaApplications } from '$lib/database/mongo.js';
import { resolveDsaId } from '$lib/server/caseHelpers.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { computeScorecard } from '$lib/server/scorecardEngine.js';
import { findUserByMobile } from '$lib/server/csfle/index.js';

export const GET: RequestHandler = async ({ locals, url }) => {
	// Auth + role guard
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;

	try {
		const result = await resolveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}

		// Load all cases for this DSA (projected to fields used by scorecardEngine)
		const cases = await Cases.find(
			{ dsa_id: result.dsaId },
			{
				projection: {
					_id: 1,
					case_id: 1,
					stage: 1,
					stage_history: 1,
					created_at: 1,
					is_archived: 1,
					loan: 1,
					lender_applications: 1
				}
			}
		).toArray();

		// Load DSA application for onboarding goals/targets.
		// SEC-2: encrypted-first mobile lookup. The fields actually read
		// downstream (goals, section_b, files_per_month, etc.) are not in
		// the encrypted PII registry — no decrypt needed. We lose the
		// projection optimization (over-fetch the full doc) but at single-
		// DSA scale that's negligible.
		const dsaApp = await findUserByMobile(DsaApplications, locals.user!.mobileNumber);

		// Extract period_months from query param (default 1)
		const periodMonths = parseInt(url.searchParams.get('period') || '1', 10);

		// Compute scorecard
		const scorecard = computeScorecard(cases, dsaApp, {
			period_months: Math.min(Math.max(periodMonths, 1), 12) // clamp 1-12
		});

		return apiOk(scorecard);
	} catch (err) {
		return apiServerError(err, 'Failed to compute scorecard');
	}
};
