/**
 * GET /api/dsa/btdc-vault/eligible — BT/DC eligibility query
 * ══════════════════════════════════════════════════════════════════
 * DATA-2 outreach: given a current available rate (DSA supplies it),
 * surface vault entries whose stored ROI is at least 50 bps above —
 * those are the customers worth reaching out to with a BT pitch.
 *
 * DSA-scoped. Returns decrypted mobile only because the entries are
 * the DSA's own (BOLA-safe by construction). Never includes
 * revocation_token in the response.
 *
 * Spec: docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md §4 + §8.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { type Binary } from 'mongodb';
import { OutreachVault, MongoClientInstance } from '$lib/database/mongo.js';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers.js';
import { requireRoleApi, requireTeamPermission } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError, apiValidationError } from '$lib/server/apiResponse.js';
import { decryptValue } from '$lib/server/csfle/index.js';
import { findEligibleCandidates } from '$lib/server/data2/eligibilityQuery.js';
import type { VaultLoanType } from '$lib/server/data2/types.js';

const querySchema = z.object({
	current_rate_floor: z.coerce.number().positive().max(50),
	loan_type: z
		.enum([
			'Home Loan',
			'Loan Against Property',
			'Plot and Construction Loan',
			'Personal Loan',
			'Business Loan',
			'Professional Loan'
		])
		.optional(),
	min_amount: z.coerce.number().positive().optional()
});

export const GET: RequestHandler = async ({ url, locals }) => {
	const roleDenied = requireRoleApi(locals, 'dsa');
	if (roleDenied) return roleDenied;

	const permDenied = requireTeamPermission(locals, 'cases_view');
	if (permDenied) return permDenied;

	const parsed = querySchema.safeParse({
		current_rate_floor: url.searchParams.get('current_rate_floor') ?? '',
		loan_type: url.searchParams.get('loan_type') ?? undefined,
		min_amount: url.searchParams.get('min_amount') ?? undefined
	});

	if (!parsed.success) {
		return apiValidationError('Validation failed', parsed.error.flatten());
	}

	try {
		const dsaResult = await resolveEffectiveDsaId(locals);
		if (!dsaResult.ok) return apiError(dsaResult.error, 404);

		const candidates = await findEligibleCandidates(OutreachVault, {
			dsa_id: dsaResult.dsaId,
			current_rate_floor: parsed.data.current_rate_floor,
			loan_type: parsed.data.loan_type as VaultLoanType | undefined,
			min_amount: parsed.data.min_amount
		});

		// Decrypt mobile per candidate. These are the DSA's own entries
		// so plaintext is acceptable in the response (same as the single-
		// entry GET).
		const decrypted = await Promise.all(
			candidates.map(async (c) => ({
				entry_id: c._id?.toString(),
				case_id: c.case_id,
				mobile: await decryptValue<string>(
					MongoClientInstance,
					c.mobile as unknown as Binary
				),
				loan_profile: c.loan_profile,
				consent_signed_at: c.consent_signed_at?.toISOString(),
				roi_gap_bps: c.loan_profile.sanctioned_roi - parsed.data.current_rate_floor
			}))
		);

		return apiOk({
			candidates: decrypted,
			query: {
				current_rate_floor: parsed.data.current_rate_floor,
				loan_type: parsed.data.loan_type,
				min_amount: parsed.data.min_amount
			},
			total: decrypted.length
		});
	} catch (err) {
		return apiServerError(err, 'Failed to query eligible vault entries');
	}
};
