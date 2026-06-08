import { describe, it, expect } from 'vitest';
import {
	selectAffordabilityScenarios,
	type AffordabilityResult,
	type BridgeResult
} from '$lib/ruleEngine/affordabilityCalculator.js';

/**
 * Regression guard for Problem 1 (A1): the number of Property Affordability
 * cards must follow the applicant's pre-sanction answers, NOT be auto-inferred.
 *
 *   'Based On Eligibility'                          → 1 card  (eligibility only)
 *   'Based on Downpayment'                          → 2 cards (eligibility + dpConstrained)
 *   'Based on Downpayment' + withPersonalLoan='Yes' → 3 cards (+ bridge)
 *
 * Before the fix, dpConstrained appeared whenever a deposit existed and the
 * bridge appeared whenever spare EMI existed — so users saw a PL bridge card
 * they never opted into. If that auto-inference ever returns, this fails.
 */

const eligibility: AffordabilityResult = {
	maxPropertyCost: 5_000_000,
	homeLoanAmount: 4_000_000,
	homeLoanEMI: 35_000,
	ltvPercent: 80,
	downPaymentRequired: 1_000_000,
	downPaymentPercent: 20,
	mode: 'eligibility'
};

const dpConstrained: AffordabilityResult = {
	maxPropertyCost: 3_000_000,
	homeLoanAmount: 2_400_000,
	homeLoanEMI: 21_000,
	ltvPercent: 80,
	downPaymentRequired: 600_000,
	downPaymentPercent: 20,
	mode: 'dp_constrained'
};

const bridge: BridgeResult = {
	maxPropertyCost: 4_200_000,
	homeLoanAmount: 3_360_000,
	homeLoanEMI: 29_000,
	ltvPercent: 80,
	downPaymentRequired: 840_000,
	downPaymentPercent: 20,
	mode: 'bridge',
	bridgeLoanAmount: 240_000,
	bridgeLoanEMI: 7_000,
	totalEMI: 36_000
};

const full = { eligibility, dpConstrained, bridge };

function count(s: ReturnType<typeof selectAffordabilityScenarios>): number {
	return [s.eligibility, s.dpConstrained, s.bridge].filter((x) => x !== null).length;
}

describe('selectAffordabilityScenarios — card count follows pre-sanction answers', () => {
	it('Based On Eligibility → 1 card (eligibility only)', () => {
		const s = selectAffordabilityScenarios(full, { sanctionType: 'Based On Eligibility' });
		expect(count(s)).toBe(1);
		expect(s.eligibility).not.toBeNull();
		expect(s.dpConstrained).toBeNull();
		expect(s.bridge).toBeNull();
	});

	it('Based on Downpayment without PL → 2 cards (eligibility + dpConstrained)', () => {
		const s = selectAffordabilityScenarios(full, {
			sanctionType: 'Based on Downpayment',
			wantsPlBridge: false
		});
		expect(count(s)).toBe(2);
		expect(s.eligibility).not.toBeNull();
		expect(s.dpConstrained).not.toBeNull();
		expect(s.bridge).toBeNull();
	});

	it('Based on Downpayment with PL → 3 cards (eligibility + dpConstrained + bridge)', () => {
		const s = selectAffordabilityScenarios(full, {
			sanctionType: 'Based on Downpayment',
			wantsPlBridge: true
		});
		expect(count(s)).toBe(3);
		expect(s.bridge).not.toBeNull();
	});

	it('never shows a bridge card when the math produced none, even if opted in', () => {
		const s = selectAffordabilityScenarios(
			{ eligibility, dpConstrained, bridge: null },
			{ sanctionType: 'Based on Downpayment', wantsPlBridge: true }
		);
		expect(s.bridge).toBeNull();
		expect(count(s)).toBe(2);
	});

	it('eligibility-basis ignores a stray PL opt-in (no DP card, no bridge)', () => {
		const s = selectAffordabilityScenarios(full, {
			sanctionType: 'Based On Eligibility',
			wantsPlBridge: true
		});
		expect(count(s)).toBe(1);
		expect(s.dpConstrained).toBeNull();
		expect(s.bridge).toBeNull();
	});

	it('missing sanctionType is treated as eligibility-only (safe default)', () => {
		const s = selectAffordabilityScenarios(full, {});
		expect(count(s)).toBe(1);
		expect(s.eligibility).not.toBeNull();
	});
});
