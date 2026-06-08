/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: the minimum-loan-amount floor (P9) is surfaced as a visible reason
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * 2026-05-23 E2E test (docs/reviews/E2E-TEST-2026-05-23.md, Recurring issue-class
 * #3): a Personal Loan for ₹1L (below the ₹2L floor) returned ALL lenders "Not
 * Eligible", but the per-lender reason was the generic "does not meet lender
 * requirements" and "What Shaped This Result" showed every factor green. The real
 * cause — the requested/eligible amount is below the product minimum — was invisible.
 *
 * Root cause: evaluationEngine sets a precise `traffic_light_message` for the floor
 * (a post-gate override that flips green→red with no failed gate), but
 * `buildTrafficLightMessage` re-derived the red message from gate_results (none
 * failed → generic), and `buildFactors` had no floor factor.
 *
 * THIS TEST
 * ─────────
 * Locks: (1) buildTrafficLightMessage honors the engine override message, and
 * (2) buildFactors adds a negative "Minimum Loan Amount" factor for it — while NOT
 * affecting normal gate-failure reds (where traffic_light_message is empty).
 */

import { describe, it, expect } from 'vitest';
import { buildTrafficLightMessage, buildFactors } from '$lib/ruleEngine/resultBuilder';
import type { LenderEvaluation } from '$lib/ruleEngine/types';

function makeEval(overrides: Partial<LenderEvaluation> = {}): LenderEvaluation {
	return {
		lender_id: 'test-lender',
		lender_name: 'Test Bank',
		classification: 'PVT',
		gate_results: [],
		all_gates_passed: true,
		failed_gate_ids: [],
		assessed_income: 60000,
		income_sources: [],
		obligation_load_monthly: 0,
		obligation_details: [],
		foir: 0.15,
		max_foir: 0.55,
		foir_eligible_amount: 100000,
		roi: 10.5,
		tenure_months: 12,
		eligible_amount: 100000,
		offered_amount: 100000,
		emi: 8800,
		deviations_applied: [],
		traffic_light: 'green',
		traffic_light_message: 'Eligible',
		approval_probability: 0,
		policies: [],
		...overrides
	} as LenderEvaluation;
}

const FLOOR_MSG = 'Eligible amount ₹1,00,000 is below the ₹2,00,000 minimum for Personal Loan';

describe('below-minimum floor reason (P9)', () => {
	describe('buildTrafficLightMessage', () => {
		it('returns the engine floor message instead of the generic one', () => {
			const evaluation = makeEval({ traffic_light: 'red', traffic_light_message: FLOOR_MSG });
			expect(buildTrafficLightMessage(evaluation)).toBe(FLOOR_MSG);
		});

		it('falls back to the failed-gate message for a normal red (no override message)', () => {
			const evaluation = makeEval({
				traffic_light: 'red',
				traffic_light_message: '',
				gate_results: [
					{
						rule_id: 'cibil-gate',
						section: 'cibil',
						passed: false,
						description: 'CIBIL check',
						fail_message: 'CIBIL below 700'
					}
				] as LenderEvaluation['gate_results']
			});
			expect(buildTrafficLightMessage(evaluation)).toBe('CIBIL below 700');
		});

		it('falls back to the generic message for a red with no override and no fail message', () => {
			const evaluation = makeEval({ traffic_light: 'red', traffic_light_message: '' });
			expect(buildTrafficLightMessage(evaluation)).toBe(
				'Not eligible - does not meet lender requirements'
			);
		});

		it('does not let an empty override mask the green message', () => {
			const evaluation = makeEval({ traffic_light: 'green', traffic_light_message: '' });
			expect(buildTrafficLightMessage(evaluation)).toBe('Eligible for full requested amount');
		});
	});

	describe('buildFactors', () => {
		it('adds a negative "Minimum Loan Amount" factor when red with the floor message', () => {
			const evaluation = makeEval({ traffic_light: 'red', traffic_light_message: FLOOR_MSG });
			const factors = buildFactors(evaluation);
			const floorFactor = factors.find((f) => f.id === 'minimum-loan-amount');
			expect(floorFactor).toBeDefined();
			expect(floorFactor?.impact).toBe('negative');
			expect(floorFactor?.description).toBe(FLOOR_MSG);
		});

		it('does NOT add the floor factor for a green result', () => {
			const factors = buildFactors(makeEval({ traffic_light: 'green' }));
			expect(factors.find((f) => f.id === 'minimum-loan-amount')).toBeUndefined();
		});

		it('does NOT add the floor factor for a normal red without an override message', () => {
			const factors = buildFactors(makeEval({ traffic_light: 'red', traffic_light_message: '' }));
			expect(factors.find((f) => f.id === 'minimum-loan-amount')).toBeUndefined();
		});
	});
});
