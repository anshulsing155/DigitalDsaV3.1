/**
 * POST /api/pms/policies/[id]/legacy-compare
 * Admin-only. Runs field-by-field comparison between the published PMS policy
 * and the legacy TS rule doc for the same lender. Persists the result into
 * PolicyDocument.legacyComparison so the admin review UI can render it.
 *
 * Not idempotent — can be re-run after resolvedAt is set (overwrites previous run).
 * Re-run is blocked while discrepancies exist but resolvedAt is null (forces
 * the admin to resolve or discard before comparing again).
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { PmsLenderPolicies } from '$lib/database/mongo.js';
import {
	getPolicyById,
	PolicyNotFoundError
} from '$lib/server/pms/policyService.js';
import { compareLegacyVsPms } from '$lib/server/pms/legacyCompare.js';

export const POST: RequestHandler = async ({ locals, params }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;

	const { id } = params;
	const adminId = locals.user!.id;

	try {
		const policy = await getPolicyById(id);

		// Policy must be published to compare against a live legacy entry
		if (policy.status !== 'published') {
			return apiError(
				'Only published policies can be compared against legacy entries. Approve and publish first.',
				422
			);
		}

		// Block re-run while prior comparison is unresolved
		if (
			policy.legacyComparison !== null &&
			policy.legacyComparison.resolvedAt === null &&
			policy.legacyComparison.discrepancies.length > 0
		) {
			return apiError(
				'A previous comparison has unresolved discrepancies. Resolve them before re-running.',
				409
			);
		}

		// Run the pure comparison
		const { discrepancies, legacyFound } = await compareLegacyVsPms(
			policy.lenderId,
			policy.loanProduct,
			policy
		);

		if (!legacyFound) {
			return apiError(
				`No legacy rule document found for lender "${policy.lenderId}" product "${policy.loanProduct}". ` +
					'Nothing to compare against — this lender may be PMS-native.',
				404
			);
		}

		// Persist result into the policy document
		const now = new Date();
		await PmsLenderPolicies.updateOne(
			{ _id: policy._id },
			{
				$set: {
					legacyComparison: {
						comparedAt: now,
						discrepancies,
						resolvedAt: null,
						resolvedBy: null
					},
					updatedBy: adminId,
					updatedAt: now
				}
			}
		);

		logger.info(
			{ policyId: id, discrepancyCount: discrepancies.length, ranBy: adminId },
			'PMS legacy comparison run'
		);

		return apiOk({
			discrepancyCount: discrepancies.length,
			discrepancies,
			comparedAt: now.toISOString(),
			message:
				discrepancies.length === 0
					? 'No discrepancies found — PMS and legacy are in sync.'
					: `${discrepancies.length} discrepanc${discrepancies.length === 1 ? 'y' : 'ies'} found. Review and resolve in the Changes tab.`
		});
	} catch (err) {
		if (err instanceof PolicyNotFoundError) return apiError('Policy not found', 404);
		return apiServerError(err, 'pms legacy-compare');
	}
};
