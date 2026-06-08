/**
 * GET  /api/dashboard/policy-alerts
 * ══════════════════════════════════════════════════════════════════
 * Returns lender policy alerts with affected cases for the
 * authenticated DSA. Alerts are sorted by severity then date.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { Cases } from '$lib/database/mongo.js';
import { resolveDsaId } from '$lib/server/caseHelpers.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { generatePolicyAlerts, SAMPLE_POLICY_ALERTS } from '$lib/server/policyAlerts.js';

export const GET: RequestHandler = async ({ locals }) => {
	// Auth + role guard
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;

	try {
		const result = await resolveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}

		// Load all active (non-archived) cases for this DSA (projected to alert-used fields)
		const cases = await Cases.find(
			{
				dsa_id: result.dsaId,
				is_archived: { $in: [false, null] } as any
			},
			{
				projection: {
					_id: 1,
					case_id: 1,
					stage: 1,
					is_archived: 1,
					lender_applications: 1
				}
			}
		).toArray();

		// Generate alerts using sample alerts
		const alerts = generatePolicyAlerts(cases, SAMPLE_POLICY_ALERTS);

		return apiOk({
			alerts,
			total: alerts.length
		});
	} catch (err) {
		return apiServerError(err, 'Failed to generate policy alerts');
	}
};
