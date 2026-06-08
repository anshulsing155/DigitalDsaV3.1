/**
 * Lender Results Helper Functions
 * ══════════════════════════════════════════════════════════════════
 * Pure functions for change delta computation, policy staleness checks,
 * and result comparison. No database calls — fully testable.
 * ══════════════════════════════════════════════════════════════════
 */

import type { LenderResultsData, LenderResult } from '$lib/types/lenderResults.js';
import type { LenderChangeDelta, LenderPolicyStaleness } from '$lib/types/lenderResultsSnapshot.js';

// ============================================================================
// COMPUTE CHANGE DELTAS
// ============================================================================

/**
 * Compares two LenderResultsData payloads and produces per-lender deltas.
 * Returns empty array when prevPayload is null (version 1).
 */
export function computeChangeDeltas(
	prevPayload: LenderResultsData | null,
	currPayload: LenderResultsData
): LenderChangeDelta[] {
	if (!prevPayload) return [];

	const prevMap = new Map<string, LenderResult>();
	for (const result of prevPayload.results) {
		prevMap.set(result.lender_application_id, result);
	}

	const deltas: LenderChangeDelta[] = [];

	for (const curr of currPayload.results) {
		const prev = prevMap.get(curr.lender_application_id);

		if (!prev) {
			// Newly added lender
			deltas.push({
				lender_application_id: curr.lender_application_id,
				lender_name: curr.lender_name,
				curr_traffic_light: curr.traffic_light,
				is_new_contender: false,
				is_newly_added: true,
				changes: {}
			});
			continue;
		}

		const changes: LenderChangeDelta['changes'] = {};
		let hasChanges = false;

		// Compare offered_amount
		if (prev.offered_amount !== curr.offered_amount) {
			changes.offered_amount = {
				prev: prev.offered_amount,
				curr: curr.offered_amount,
				delta: curr.offered_amount - prev.offered_amount
			};
			hasChanges = true;
		}

		// Compare ROI
		if (prev.roi !== curr.roi) {
			changes.roi = {
				prev: prev.roi,
				curr: curr.roi,
				delta: curr.roi - prev.roi
			};
			hasChanges = true;
		}

		// Compare EMI
		if (prev.emi !== curr.emi) {
			changes.emi = {
				prev: prev.emi,
				curr: curr.emi,
				delta: curr.emi - prev.emi
			};
			hasChanges = true;
		}

		// Compare tenure
		if (prev.tenure_months !== curr.tenure_months) {
			changes.tenure_months = {
				prev: prev.tenure_months,
				curr: curr.tenure_months,
				delta: curr.tenure_months - prev.tenure_months
			};
			hasChanges = true;
		}

		// Compare approval probability
		if (prev.key_metrics.approval_probability !== curr.key_metrics.approval_probability) {
			changes.approval_probability = {
				prev: prev.key_metrics.approval_probability,
				curr: curr.key_metrics.approval_probability,
				delta: curr.key_metrics.approval_probability - prev.key_metrics.approval_probability
			};
			hasChanges = true;
		}

		// Check for traffic light change
		const trafficLightChanged = prev.traffic_light !== curr.traffic_light;

		// New contender: was red/amber/grey, now green
		const isNewContender =
			(prev.traffic_light === 'red' ||
				prev.traffic_light === 'amber' ||
				prev.traffic_light === 'grey') &&
			curr.traffic_light === 'green';

		if (hasChanges || trafficLightChanged) {
			deltas.push({
				lender_application_id: curr.lender_application_id,
				lender_name: curr.lender_name,
				prev_traffic_light: prev.traffic_light,
				curr_traffic_light: curr.traffic_light,
				is_new_contender: isNewContender,
				is_newly_added: false,
				changes
			});
		}
	}

	return deltas;
}

// ============================================================================
// CHECK POLICY STALENESS
// ============================================================================

/**
 * For each lender, checks if there's a policy update after the results were computed.
 */
export function checkPolicyStaleness(
	resultsComputedAt: Date,
	policyUpdates: Array<{ lender_name: string; updated_at: Date }>
): LenderPolicyStaleness[] {
	return policyUpdates.map((policy) => ({
		lender_name: policy.lender_name,
		policy_last_updated: policy.updated_at,
		results_computed_at: resultsComputedAt,
		is_stale: policy.updated_at > resultsComputedAt
	}));
}

// ============================================================================
// SUMMARIZE DELTAS
// ============================================================================

/**
 * Produces a human-readable summary of change deltas.
 */
export function summarizeDeltas(deltas: LenderChangeDelta[]): string {
	if (deltas.length === 0) return 'No changes detected.';

	const parts: string[] = [];

	const newContenders = deltas.filter((d) => d.is_new_contender);
	if (newContenders.length > 0) {
		parts.push(
			`${newContenders.length} new contender${newContenders.length > 1 ? 's' : ''}: ${newContenders.map((d) => d.lender_name).join(', ')}`
		);
	}

	const newlyAdded = deltas.filter((d) => d.is_newly_added);
	if (newlyAdded.length > 0) {
		parts.push(
			`${newlyAdded.length} newly added: ${newlyAdded.map((d) => d.lender_name).join(', ')}`
		);
	}

	const changed = deltas.filter((d) => !d.is_new_contender && !d.is_newly_added);
	if (changed.length > 0) {
		parts.push(`${changed.length} offer${changed.length > 1 ? 's' : ''} updated`);
	}

	return parts.join('. ') + '.';
}
