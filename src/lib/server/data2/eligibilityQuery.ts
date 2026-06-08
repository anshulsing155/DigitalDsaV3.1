/**
 * DATA-2 — BT/DC eligibility query (DSA-scoped).
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md §4 + §8.
 *
 * Given the DSA's id + a query (loan_type filter, current rate floor, etc.),
 * returns the DSA's own vault entries that look like BT candidates —
 * customers whose stored ROI is at least `BT_FLOOR_BPS` basis points above
 * the supplied current_rate_floor.
 *
 * The 50-bps floor is the platform-wide minimum benefit threshold below which
 * BT outreach is unprofitable for the customer (processing fees, legal
 * charges, DSA time eat the differential). To change it: edit the constant
 * here. NOT configurable per entry.
 *
 * Since loan_profile.sanctioned_roi is stored as plain numbers (per the
 * "PII only" directive — see PII-RETENTION-POLICY-SPEC.md), the threshold
 * filter runs as a direct MongoDB predicate. No in-memory decrypt+filter
 * pass needed.
 *
 * Returned entries always include the encrypted mobile field — the endpoint
 * shell decrypts before sending to the client.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { Collection, ObjectId } from 'mongodb';
import type { OutreachVaultEntry, VaultLoanType } from './types.js';

/** Basis-points floor below which BT outreach is considered non-viable. */
export const BT_FLOOR_BPS = 0.5;

/** How many candidates to return at most — same as DATA-1 routing for consistency. */
export const MAX_CANDIDATES = 50;

export interface EligibilityInput {
	dsa_id: ObjectId;
	/** Current available rate the DSA could re-place the customer at (% p.a.). */
	current_rate_floor: number;
	/** Optional: filter to one loan type only. */
	loan_type?: VaultLoanType;
	/** Optional: minimum sanctioned amount (₹) — useful to skip tiny loans not worth re-placing. */
	min_amount?: number;
}

/**
 * Run the eligibility query. Returns up to MAX_CANDIDATES vault entries
 * sorted by descending ROI gap (the most-benefit-to-customer candidates
 * come first).
 *
 * The returned entries still carry the encrypted `mobile` field — the
 * endpoint shell is responsible for decrypting before sending the response.
 */
export async function findEligibleCandidates(
	vault: Collection<OutreachVaultEntry>,
	input: EligibilityInput,
	asOf: Date = new Date()
): Promise<OutreachVaultEntry[]> {
	if (!Number.isFinite(input.current_rate_floor) || input.current_rate_floor <= 0) {
		return [];
	}

	const minRoi = input.current_rate_floor + BT_FLOOR_BPS;

	// Build the filter. The `consent_expiry` check uses $or so entries with
	// no expiry (null/absent) AND entries whose expiry is still in the
	// future both pass.
	const filter: Record<string, unknown> = {
		dsa_id: input.dsa_id,
		consent_status: 'active',
		'loan_profile.sanctioned_roi': { $gte: minRoi },
		$or: [
			{ consent_expiry: { $exists: false } },
			{ consent_expiry: null },
			{ consent_expiry: { $gt: asOf } }
		]
	};

	if (input.loan_type) {
		filter['loan_profile.loan_type'] = input.loan_type;
	}
	if (input.min_amount !== undefined && Number.isFinite(input.min_amount)) {
		filter['loan_profile.sanctioned_amount'] = { $gte: input.min_amount };
	}

	const entries = await vault
		.find(filter, {
			projection: { revocation_token: 0 } // never include the customer-PDF token in any response
		})
		.sort({ 'loan_profile.sanctioned_roi': -1 })
		.limit(MAX_CANDIDATES)
		.toArray();

	return entries;
}
