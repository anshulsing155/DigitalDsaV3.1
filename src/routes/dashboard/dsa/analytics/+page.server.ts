/**
 * Analytics Page — Server Load
 * ══════════════════════════════════════════════════════════════════
 * Loads scorecard + policy alerts data for the DSA analytics page.
 * ══════════════════════════════════════════════════════════════════
 */

import type { PageServerLoad } from './$types';
import { Cases, DsaApplications } from '$lib/database/mongo';
import { computeScorecard } from '$lib/server/scorecardEngine';
import { generatePolicyAlerts, SAMPLE_POLICY_ALERTS } from '$lib/server/policyAlerts';
import logger from '$lib/server/logger.js';
import type { Scorecard } from '$lib/server/scorecardEngine';
import type { PolicyAlert } from '$lib/server/policyAlerts';
import { DEMO_USER_ID } from '$lib/services/jwtService';
import { getDemoAnalyticsData } from '$lib/server/demoDataLoaders';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers';
import { requireRole } from '$lib/server/guards';

export const load: PageServerLoad = async ({ parent, locals }) => {
	requireRole(locals, 'dsa');
	const parentData = await parent();
	const user = parentData.user;

	// ── Demo mode: return in-memory data, skip MongoDB ───────────
	if (user?.id === DEMO_USER_ID) {
		return getDemoAnalyticsData();
	}

	// Default empty response
	const emptyResponse = {
		scorecard: null as Scorecard | null,
		policyAlerts: [] as PolicyAlert[],
		hasData: false
	};

	if (!user?.id) {
		return emptyResponse;
	}

	try {
		// Resolve DSA profile (team-aware)
		const dsaResult = await resolveEffectiveDsaId(locals);
		if (!dsaResult.ok) {
			return emptyResponse;
		}
		const dsaId = dsaResult.dsaId;

		// Load DSA doc for scorecard computation
		const dsaDoc = await DsaApplications.findOne({ _id: dsaId });

		if (!dsaDoc) {
			return emptyResponse;
		}

		// Load all cases for this DSA (projected — excludes heavy blobs)
		const allCases = await Cases.find(
			{ dsa_id: dsaId },
			{
				projection: {
					'lender_applications.file_config': 0,
					'lender_applications.file_snapshots': 0,
					'lender_applications.eligibility_snapshot': 0,
					'lender_applications.offer_details': 0,
					'lender_applications.payout_info': 0,
					'lender_applications.lender_tracking': 0,
					lender_selections: 0,
					form_snapshot_version: 0,
					form_snapshot_hash: 0,
					results_snapshot_version: 0,
					results_snapshot_hash: 0,
					notes: 0,
					optional_contact: 0
				}
			}
		).toArray();

		// Compute scorecard
		const scorecard = computeScorecard(allCases, dsaDoc);

		// Generate policy alerts (active non-archived cases only)
		const activeCases = allCases.filter((c) => !c.is_archived);
		const policyAlerts = generatePolicyAlerts(activeCases, SAMPLE_POLICY_ALERTS);

		return {
			scorecard,
			policyAlerts,
			hasData: allCases.length > 0
		};
	} catch (error) {
		logger.error({ err: error }, 'Analytics page load error');
		return emptyResponse;
	}
};
