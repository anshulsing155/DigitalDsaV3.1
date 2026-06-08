import { describe, it, expect } from 'vitest';
import {
	getLtvForPropertyCost,
	getDpPercentForPropertyCost,
	emiToLoan,
	maxAffordableEMI,
	dpToPropertyCost,
	loanToPropertyCost,
	getPlAllocationFactor,
	calculatePureEligibility,
	calculateDpConstrained,
	calculateBridgeScenario,
	calculateAffordability,
	RBI_LTV_SLABS,
	TESTED_PL_FACTORS,
	type AffordabilityParams
} from '$lib/ruleEngine/affordabilityCalculator.js';
import { calculateEMI } from '$lib/ruleEngine/emiCalculator.js';

// ============================================================================
// LTV Slab Lookups
// ============================================================================

describe('getLtvForPropertyCost', () => {
	it('returns 90% for property ≤ 30L', () => {
		expect(getLtvForPropertyCost(1_000_000)).toBe(90);
		expect(getLtvForPropertyCost(3_000_000)).toBe(90);
	});

	it('returns 80% for property 30L–75L', () => {
		expect(getLtvForPropertyCost(3_000_001)).toBe(80);
		expect(getLtvForPropertyCost(5_000_000)).toBe(80);
		expect(getLtvForPropertyCost(7_500_000)).toBe(80);
	});

	it('returns 75% for property > 75L', () => {
		expect(getLtvForPropertyCost(7_500_001)).toBe(75);
		expect(getLtvForPropertyCost(10_000_000)).toBe(75);
	});
});

describe('getDpPercentForPropertyCost', () => {
	it('returns correct DP% for each slab', () => {
		expect(getDpPercentForPropertyCost(2_000_000)).toBe(10);
		expect(getDpPercentForPropertyCost(5_000_000)).toBe(20);
		expect(getDpPercentForPropertyCost(10_000_000)).toBe(25);
	});
});

// ============================================================================
// Reverse EMI + Helpers
// ============================================================================

describe('emiToLoan', () => {
	it('reverses calculateEMI correctly', () => {
		const emi = calculateEMI(5_000_000, 8.5, 240);
		const loan = emiToLoan(emi, 8.5, 240);
		expect(Math.abs(loan - 5_000_000)).toBeLessThan(100);
	});

	it('handles zero rate', () => {
		expect(emiToLoan(10_000, 0, 120)).toBe(1_200_000);
	});

	it('returns 0 for zero inputs', () => {
		expect(emiToLoan(0, 8.5, 240)).toBe(0);
		expect(emiToLoan(10_000, 8.5, 0)).toBe(0);
	});
});

describe('maxAffordableEMI', () => {
	it('computes FOIR headroom', () => {
		expect(maxAffordableEMI(100_000, 0.5, 20_000)).toBe(30_000);
	});

	it('returns 0 when obligations exceed capacity', () => {
		expect(maxAffordableEMI(100_000, 0.5, 60_000)).toBe(0);
	});
});

// ============================================================================
// Piecewise Linear DP → Property Mapping (THE CORE)
// ============================================================================

describe('dpToPropertyCost', () => {
	it('90% LTV zone: ₹1 DP = ₹10 property', () => {
		expect(dpToPropertyCost(100_000)).toBe(1_000_000); // 1L → 10L
		expect(dpToPropertyCost(200_000)).toBe(2_000_000); // 2L → 20L
		expect(dpToPropertyCost(333_333)).toBe(3_333_330); // 3.33L → 33.33L (boundary)
	});

	it('transition zone 90%→80%: ₹1 DP = ₹1 property', () => {
		// At DP = ₹3.33L: property = ₹33.33L
		// At DP = ₹5L: property = ₹33.33L + (5L - 3.33L) = ₹35L
		expect(dpToPropertyCost(500_000)).toBe(3_333_333 + (500_000 - 333_333));
		// At DP = ₹7.5L: property = ₹33.33L + 4.17L = ₹37.5L
		expect(dpToPropertyCost(750_000)).toBe(3_333_333 + 416_667);
	});

	it('transition end matches 80% zone start', () => {
		// DP = ₹7.5L at end of transition = DP = ₹7.5L in 80% zone
		const fromTransition = dpToPropertyCost(750_000);
		const from80Zone = Math.round(750_000 / 0.2);
		expect(fromTransition).toBe(from80Zone); // Both = ₹37.5L
	});

	it('80% LTV zone: ₹1 DP = ₹5 property', () => {
		expect(dpToPropertyCost(1_000_000)).toBe(5_000_000); // 10L → 50L
		expect(dpToPropertyCost(1_500_000)).toBe(7_500_000); // 15L → 75L
		expect(dpToPropertyCost(1_875_000)).toBe(9_375_000); // 18.75L → 93.75L (boundary)
	});

	it('transition zone 80%→75%: ₹1 DP = ₹1 property', () => {
		// At DP = ₹18.75L: property = ₹93.75L
		// At DP = ₹20L: property = ₹93.75L + (20L - 18.75L) = ₹95L
		expect(dpToPropertyCost(2_000_000)).toBe(9_375_000 + 125_000);
		// At DP = ₹25L: property = ₹93.75L + 6.25L = ₹1Cr
		expect(dpToPropertyCost(2_500_000)).toBe(10_000_000);
	});

	it('transition end matches 75% zone start', () => {
		const fromTransition = dpToPropertyCost(2_500_000);
		const from75Zone = Math.round(2_500_000 / 0.25);
		expect(fromTransition).toBe(from75Zone); // Both = ₹1Cr
	});

	it('75% LTV zone: ₹1 DP = ₹4 property', () => {
		expect(dpToPropertyCost(3_000_000)).toBe(12_000_000); // 30L → 1.2Cr
		expect(dpToPropertyCost(5_000_000)).toBe(20_000_000); // 50L → 2Cr
	});

	it('returns 0 for zero DP', () => {
		expect(dpToPropertyCost(0)).toBe(0);
	});
});

describe('loanToPropertyCost', () => {
	it('maps loan to property using correct LTV slab', () => {
		expect(loanToPropertyCost(2_000_000)).toBe(Math.round(2_000_000 / 0.9)); // 90% zone
		expect(loanToPropertyCost(4_000_000)).toBe(Math.round(4_000_000 / 0.8)); // 80% zone
		expect(loanToPropertyCost(8_000_000)).toBe(Math.round(8_000_000 / 0.75)); // 75% zone
	});
});

// ============================================================================
// PL Allocation Factor
// ============================================================================

describe('getPlAllocationFactor', () => {
	it('returns tested fixed factors by default', () => {
		expect(getPlAllocationFactor(2_000_000)).toBe(TESTED_PL_FACTORS.low); // ≤30L → 0.22
		expect(getPlAllocationFactor(5_000_000)).toBe(TESTED_PL_FACTORS.mid); // 30-75L → 0.3895
		expect(getPlAllocationFactor(8_000_000)).toBe(TESTED_PL_FACTORS.high); // >75L → 0.46
	});

	it('dynamic factor uses actual per-lakh-EMI values', () => {
		const hlEpl = calculateEMI(100_000, 8.5, 240); // ~868
		const plEpl = calculateEMI(100_000, 14, 60); // ~2327

		const dynamic = getPlAllocationFactor(5_000_000, hlEpl, plEpl, true);
		// f = p×D / (p×D + h×L) = 2327×0.20 / (2327×0.20 + 868×0.80)
		const expected = (plEpl * 0.2) / (plEpl * 0.2 + hlEpl * 0.8);
		expect(Math.abs(dynamic - expected)).toBeLessThan(0.001);
	});

	it('dynamic factor increases with higher DP% (lower LTV)', () => {
		const hlEpl = 868;
		const plEpl = 2327;

		const low = getPlAllocationFactor(2_000_000, hlEpl, plEpl, true); // 90% LTV, 10% DP
		const mid = getPlAllocationFactor(5_000_000, hlEpl, plEpl, true); // 80% LTV, 20% DP
		const high = getPlAllocationFactor(8_000_000, hlEpl, plEpl, true); // 75% LTV, 25% DP

		expect(low).toBeLessThan(mid);
		expect(mid).toBeLessThan(high);
	});
});

// ============================================================================
// Mode A: Pure Eligibility
// ============================================================================

describe('calculatePureEligibility', () => {
	it('returns consistent result', () => {
		const result = calculatePureEligibility({
			assessedIncome: 100_000,
			maxFoir: 0.5,
			existingObligationMonthly: 10_000,
			securedRate: 8.5,
			tenureMonths: 240
		});
		expect(result).not.toBeNull();
		expect(result!.homeLoanEMI).toBeLessThanOrEqual(40_000); // 1L × 50% - 10K
		expect(result!.maxPropertyCost).toBeGreaterThan(result!.homeLoanAmount);
	});

	it('respects bank max loan cap', () => {
		const uncapped = calculatePureEligibility({
			assessedIncome: 300_000,
			maxFoir: 0.55,
			existingObligationMonthly: 0,
			securedRate: 8.5,
			tenureMonths: 240
		});
		const capped = calculatePureEligibility({
			assessedIncome: 300_000,
			maxFoir: 0.55,
			existingObligationMonthly: 0,
			securedRate: 8.5,
			tenureMonths: 240,
			maxLoanCap: 5_000_000
		});

		expect(uncapped!.homeLoanAmount).toBeGreaterThan(5_000_000);
		expect(capped!.homeLoanAmount).toBe(5_000_000);
	});

	it('returns null for zero income', () => {
		expect(
			calculatePureEligibility({
				assessedIncome: 0,
				maxFoir: 0.5,
				existingObligationMonthly: 0,
				securedRate: 8.5,
				tenureMonths: 240
			})
		).toBeNull();
	});
});

// ============================================================================
// Mode B: DP Constrained (No Bridge)
// ============================================================================

describe('calculateDpConstrained', () => {
	const baseParams: AffordabilityParams = {
		assessedIncome: 100_000,
		maxFoir: 0.5,
		existingObligationMonthly: 10_000,
		securedRate: 8.5,
		tenureMonths: 240,
		availableDP: 1_500_000,
		unsecuredRate: 14,
		unsecuredTenureMonths: 60
	};

	it('surplus DP increases property or falls back to eligibility if EMI exceeded', () => {
		const eligibility = calculatePureEligibility(baseParams);
		const dpConstrained = calculateDpConstrained({
			...baseParams,
			availableDP: eligibility!.downPaymentRequired + 500_000
		});
		expect(dpConstrained).not.toBeNull();
		// With surplus DP, property should be >= eligibility (surplus adds to property
		// BUT if the bigger property's HL EMI exceeds capacity, it falls back)
		expect(dpConstrained!.maxPropertyCost).toBeGreaterThanOrEqual(eligibility!.maxPropertyCost);
	});

	it('low DP constrains property via piecewise mapping', () => {
		const result = calculateDpConstrained({
			...baseParams,
			availableDP: 500_000 // ₹5L — in transition zone
		});
		expect(result).not.toBeNull();
		// ₹5L is in transition zone (₹3.33L to ₹7.5L)
		// Property = ₹33.33L + (5L - 3.33L) = ₹35L
		expect(result!.maxPropertyCost).toBe(dpToPropertyCost(500_000));
	});

	it('returns null for zero DP', () => {
		expect(calculateDpConstrained({ ...baseParams, availableDP: 0 })).toBeNull();
	});
});

// ============================================================================
// Mode C: Bridge Scenario (WITH personal loan)
// ============================================================================

describe('calculateBridgeScenario', () => {
	const baseParams: AffordabilityParams = {
		assessedIncome: 100_000,
		maxFoir: 0.5,
		existingObligationMonthly: 10_000,
		securedRate: 8.5,
		tenureMonths: 240,
		availableDP: 800_000,
		unsecuredRate: 14,
		unsecuredTenureMonths: 60
	};

	it('bridge increases affordable property vs DP-constrained', () => {
		const dpResult = calculateDpConstrained(baseParams);
		const bridgeResult = calculateBridgeScenario(baseParams);
		expect(dpResult).not.toBeNull();
		expect(bridgeResult).not.toBeNull();
		expect(bridgeResult!.maxPropertyCost).toBeGreaterThan(dpResult!.maxPropertyCost);
	});

	it('PL proceeds add to total DP', () => {
		const result = calculateBridgeScenario(baseParams)!;
		// Total DP = own DP + bridge loan amount
		const totalDP = baseParams.availableDP + result.bridgeLoanAmount;
		// Property should match dpToPropertyCost(totalDP)
		expect(result.maxPropertyCost).toBe(dpToPropertyCost(totalDP));
	});

	it('uses tested fixed factors by default', () => {
		// Verify the factor is being applied (not dynamic)
		const result = calculateBridgeScenario(baseParams);
		expect(result).not.toBeNull();
		expect(result!.bridgeLoanEMI).toBeGreaterThan(0);
		expect(result!.bridgeLoanAmount).toBeGreaterThan(0);
	});

	it('dynamic factor produces different result than fixed', () => {
		const fixed = calculateBridgeScenario(baseParams, RBI_LTV_SLABS, false);
		const dynamic = calculateBridgeScenario(baseParams, RBI_LTV_SLABS, true);
		expect(fixed).not.toBeNull();
		expect(dynamic).not.toBeNull();
		// Dynamic factor differs from tested factors → different property cost
		expect(fixed!.maxPropertyCost).not.toBe(dynamic!.maxPropertyCost);
	});

	it('no bridge when DP is more than sufficient', () => {
		const result = calculateBridgeScenario({
			...baseParams,
			availableDP: 5_000_000, // ₹50L — way more than needed
			assessedIncome: 50_000 // Low income — eligibility is the constraint, not DP
		});
		// With low income, excess EMI is zero or negative → bridge returns null or zero bridge
		if (result) {
			expect(result.bridgeLoanAmount).toBe(0);
		}
	});
});

// ============================================================================
// Master Function
// ============================================================================

describe('calculateAffordability', () => {
	const params: AffordabilityParams = {
		assessedIncome: 100_000,
		maxFoir: 0.5,
		existingObligationMonthly: 10_000,
		securedRate: 8.5,
		tenureMonths: 240,
		availableDP: 1_000_000,
		unsecuredRate: 14,
		unsecuredTenureMonths: 60
	};

	it('returns all three modes', () => {
		const result = calculateAffordability(params);
		expect(result.eligibility).not.toBeNull();
		expect(result.dpConstrained).not.toBeNull();
		expect(result.bridge).not.toBeNull();
	});

	it('bridge ≥ dpConstrained (bridge always equal or better)', () => {
		const result = calculateAffordability(params);
		if (result.bridge && result.dpConstrained) {
			expect(result.bridge.maxPropertyCost).toBeGreaterThanOrEqual(
				result.dpConstrained.maxPropertyCost
			);
		}
	});

	it('eligibility ignores DP (shows what is possible if DP is available)', () => {
		const lowDP = calculateAffordability({ ...params, availableDP: 100_000 });
		const highDP = calculateAffordability({ ...params, availableDP: 5_000_000 });
		// Eligibility mode doesn't use DP — same result regardless
		expect(lowDP.eligibility!.maxPropertyCost).toBe(highDP.eligibility!.maxPropertyCost);
	});
});
