import { describe, it, expect } from 'vitest';
import {
	buildTrancheBreakdown,
	extractNriGpaPolicy,
	determineRegistryUrgency,
	buildBTAppreciation
} from '$lib/ruleEngine/resultBuilder';
import type { LenderEvaluation, ParsedPolicy } from '$lib/ruleEngine/types';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder/types';

// ============================================================================
// TEST HELPERS
// ============================================================================

/** Minimal evaluation factory */
function makeEval(overrides: Partial<LenderEvaluation> = {}): LenderEvaluation {
	return {
		lender_id: 'test-lender',
		lender_name: 'Test Bank',
		classification: 'PVT',
		gate_results: [],
		all_gates_passed: true,
		failed_gate_ids: [],
		assessed_income: 200000,
		income_sources: [],
		obligation_load_monthly: 0,
		obligation_details: [],
		foir: 40,
		max_foir: 55,
		foir_eligible_amount: 5500000,
		roi: 8.5,
		tenure_months: 240,
		eligible_amount: 5500000,
		offered_amount: 5500000,
		emi: 47312,
		deviations_applied: [],
		traffic_light: 'green',
		traffic_light_message: 'Eligible',
		approval_probability: 85,
		policies: [],
		...overrides
	} as LenderEvaluation;
}

/** Minimal payload factory */
function makePayload(
	txOverrides: Partial<LoanApplicationPayload['loanTransaction']> = {},
	applicants: Partial<LoanApplicationPayload['allApplicantDetails'][0]>[] = [{}]
): LoanApplicationPayload {
	return {
		loanTransaction: {
			loanName: 'Home Loan',
			loanType: 'Home Loan',
			numberOfApplicants: applicants.length,
			loanAmount: 5000000,
			tenureYears: 20,
			...txOverrides
		},
		allApplicantDetails: applicants.map((a, i) => ({
			applicantIndex: i,
			dateOfBirth: '1990-01-15',
			gender: 'male',
			educationLevel: 'graduate',
			incomeSources: [],
			obligations: [],
			...a
		}))
	} as LoanApplicationPayload;
}

// ============================================================================
// buildTrancheBreakdown
// ============================================================================

describe('buildTrancheBreakdown', () => {
	it('produces two tranches when registryValue < propertyCost and LCR cap applies', () => {
		const evaluation = makeEval({
			offered_amount: 5500000,
			lcr_capped_amount: 4500000,
			roi: 8.5
		});
		const payload = makePayload({
			loanType: 'Home Loan',
			propertyIdentified: true,
			registryValue: 5000000,
			propertyCost: 7000000
		});

		const result = buildTrancheBreakdown(evaluation, payload);

		expect(result).toBeDefined();
		expect(result!.structure_type).toBe('new_loan');
		expect(result!.tranches).toHaveLength(2);

		// Home loan tranche = min(offered=55L, lcrCap=45L) = 45L
		expect(result!.tranches[0].category).toBe('home_loan');
		expect(result!.tranches[0].amount).toBe(4500000);
		expect(result!.tranches[0].roi).toBe(8.5);
		expect(result!.tranches[0].timing).toBe('before_registry');

		// Additional tranche = 55L - 45L = 10L
		expect(result!.tranches[1].category).toBe('furniture_fixing');
		expect(result!.tranches[1].amount).toBe(1000000);
		expect(result!.tranches[1].roi).toBe(8.75); // +0.25%
		expect(result!.tranches[1].timing).toBe('after_registry');

		expect(result!.post_registry_gap).toBe(1000000);
		expect(result!.mitigation_guidance).toContain('10.0L');
		expect(result!.total_sanctioned).toBe(5500000);
	});

	it('returns undefined for Balance Transfer loans', () => {
		const evaluation = makeEval({ offered_amount: 5000000 });
		const payload = makePayload({ loanType: 'Balance Transfer' });
		expect(buildTrancheBreakdown(evaluation, payload)).toBeUndefined();
	});

	it('returns undefined when property is not identified', () => {
		const evaluation = makeEval({ offered_amount: 5000000 });
		const payload = makePayload({
			loanType: 'Home Loan',
			propertyIdentified: false,
			registryValue: 5000000,
			propertyCost: 7000000
		});
		expect(buildTrancheBreakdown(evaluation, payload)).toBeUndefined();
	});

	it('returns undefined when registryValue >= propertyCost (no under-registration)', () => {
		const evaluation = makeEval({ offered_amount: 5000000 });
		const payload = makePayload({
			loanType: 'Home Loan',
			propertyIdentified: true,
			registryValue: 7000000,
			propertyCost: 7000000
		});
		expect(buildTrancheBreakdown(evaluation, payload)).toBeUndefined();
	});

	it('produces single tranche when offered <= lcrCap', () => {
		const evaluation = makeEval({
			offered_amount: 4000000,
			lcr_capped_amount: 4500000,
			roi: 9.0
		});
		const payload = makePayload({
			loanType: 'Home Loan',
			propertyIdentified: true,
			registryValue: 5000000,
			propertyCost: 7000000
		});

		const result = buildTrancheBreakdown(evaluation, payload);

		expect(result).toBeDefined();
		expect(result!.tranches).toHaveLength(1);
		expect(result!.tranches[0].amount).toBe(4000000);
		expect(result!.post_registry_gap).toBe(0);
		expect(result!.mitigation_guidance).toBeUndefined();
	});

	it('propagates lcr_is_failsafe flag', () => {
		const evaluation = makeEval({
			offered_amount: 5500000,
			lcr_capped_amount: 4500000,
			lcr_is_failsafe: true
		});
		const payload = makePayload({
			loanType: 'Home Loan',
			propertyIdentified: true,
			registryValue: 5000000,
			propertyCost: 7000000
		});

		const result = buildTrancheBreakdown(evaluation, payload);
		expect(result).toBeDefined();
		expect(result!.lcr_is_failsafe).toBe(true);
	});
});

// ============================================================================
// extractNriGpaPolicy
// ============================================================================

describe('extractNriGpaPolicy', () => {
	it('returns formatted string when ALL applicants are NRI and policy exists', () => {
		const policy: ParsedPolicy = {
			policy_key: 'nri_gpa_eligible_relationships',
			label: 'NRI GPA Eligible Relationships',
			value: ['Parents', 'Spouse', 'Siblings'],
			display_on_offer_card: true,
			category: 'nri'
		};
		const evaluation = makeEval({
			lender_name: 'HDFC Bank',
			policies: [policy]
		});
		const payload = makePayload({}, [{ isNRI: true }, { isNRI: true }]);

		const result = extractNriGpaPolicy(evaluation, payload);
		expect(result).toBe("As per HDFC Bank's policy, Parents, Spouse, Siblings are eligible as GPA");
	});

	it('returns undefined when applicants are mixed NRI/resident', () => {
		const policy: ParsedPolicy = {
			policy_key: 'nri_gpa_eligible_relationships',
			label: 'NRI GPA Eligible Relationships',
			value: ['Parents', 'Spouse'],
			display_on_offer_card: true,
			category: 'nri'
		};
		const evaluation = makeEval({ policies: [policy] });
		const payload = makePayload({}, [{ isNRI: true }, { isNRI: false }]);

		expect(extractNriGpaPolicy(evaluation, payload)).toBeUndefined();
	});

	it('returns undefined when no NRI GPA policy in rule doc', () => {
		const evaluation = makeEval({ policies: [] });
		const payload = makePayload({}, [{ isNRI: true }]);

		expect(extractNriGpaPolicy(evaluation, payload)).toBeUndefined();
	});
});

// ============================================================================
// determineRegistryUrgency
// ============================================================================

describe('determineRegistryUrgency', () => {
	it('returns "urgent" for WITHIN_1_MONTH', () => {
		const payload = makePayload({ registryTimeline: 'WITHIN_1_MONTH' });
		expect(determineRegistryUrgency(payload)).toBe('urgent');
	});

	it('returns "normal" for 3_6_MONTHS', () => {
		const payload = makePayload({ registryTimeline: '3_6_MONTHS' });
		expect(determineRegistryUrgency(payload)).toBe('normal');
	});

	it('returns "normal" for 1_3_MONTHS', () => {
		const payload = makePayload({ registryTimeline: '1_3_MONTHS' });
		expect(determineRegistryUrgency(payload)).toBe('normal');
	});

	it('returns undefined when registryTimeline is not set', () => {
		const payload = makePayload({});
		expect(determineRegistryUrgency(payload)).toBeUndefined();
	});
});

// ============================================================================
// buildBTAppreciation
// ============================================================================

describe('buildBTAppreciation', () => {
	it('calculates strong appreciation for 80L vs 60L', () => {
		const payload = makePayload({
			loanType: 'Balance Transfer',
			marketValue: 8000000,
			currentPropertyValue: 6000000
		});

		const result = buildBTAppreciation(payload);
		expect(result).toBeDefined();
		// (80L - 60L) / 60L * 100 = 33.33%
		expect(result!.appreciation_percent).toBeCloseTo(33.33, 1);
		expect(result!.strength).toBe('strong');
		expect(result!.label).toContain('+');
		expect(result!.label).toContain('appreciation');
	});

	it('detects moderate appreciation (10-20%)', () => {
		const payload = makePayload({
			loanType: 'Balance Transfer',
			marketValue: 7000000,
			currentPropertyValue: 6000000
		});

		const result = buildBTAppreciation(payload);
		expect(result).toBeDefined();
		// (70L - 60L) / 60L * 100 = 16.67%
		expect(result!.appreciation_percent).toBeCloseTo(16.67, 1);
		expect(result!.strength).toBe('moderate');
	});

	it('detects negative appreciation (depreciation)', () => {
		const payload = makePayload({
			loanType: 'Balance Transfer',
			marketValue: 5000000,
			currentPropertyValue: 6000000
		});

		const result = buildBTAppreciation(payload);
		expect(result).toBeDefined();
		expect(result!.appreciation_percent).toBeLessThan(0);
		expect(result!.strength).toBe('negative');
		expect(result!.label).toContain('depreciation');
	});

	it('returns undefined when currentPropertyValue is missing', () => {
		const payload = makePayload({
			loanType: 'Balance Transfer',
			marketValue: 8000000
		});
		expect(buildBTAppreciation(payload)).toBeUndefined();
	});

	it('returns undefined for non-BT loan types', () => {
		const payload = makePayload({
			loanType: 'Home Loan',
			marketValue: 8000000,
			currentPropertyValue: 6000000
		});
		expect(buildBTAppreciation(payload)).toBeUndefined();
	});
});
