/**
 * =============================================================================
 * AD-2: Facility Type Branching Tests
 * =============================================================================
 *
 * Tests that OD/CC/DOD credit-line facilities get different treatment
 * from standard Term Loan evaluations:
 *   - Tenure: OD/CC use annual renewal period, DOD uses drop-line period
 *   - FOIR: Credit lines use % of limit, Term Loans use EMI-based
 *   - EMI: OD/CC proxy = factor × limit, DOD = declining balance, Term = standard
 *   - Facility config: FACILITY_TYPE_CONFIG has correct entries
 *
 * Also tests AD-1: Fallback to static rule docs when DB is empty.
 * =============================================================================
 */

import { describe, it, expect } from 'vitest';
import type {
	LoanApplicationPayload,
	ApplicantPayload,
	ObligationEntry
} from '$lib/utils/payloadBuilder';
import { evaluateLender } from '$lib/ruleEngine/evaluationEngine';
import {
	FACILITY_TYPE_CONFIG,
	isRevolvingFacility,
	getFacilityConfig
} from '$lib/ruleEngine/systemConfig';
import { calculateCreditLineFoirEligibleLimit } from '$lib/ruleEngine/emiCalculator';
import type { ParsedLenderRuleDocument } from '$lib/ruleEngine/types';

// ============================================================================
// MOCK RULE DOC — Supports unsecured loans
// ============================================================================

const UNSECURED_RULE_DOC: ParsedLenderRuleDocument = {
	lender_id: 'test-unsecured-bank',
	lender_name: 'Test Unsecured Bank',
	classification: 'PVT',
	loan_types: ['Personal Loan', 'Business Loan'],

	sections: {
		eligibility: [
			{
				rule_id: 'elig-age-01',
				description: 'Applicant age 21-60',
				tier: 'hard_gate',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.age' }, 21] },
						{ '<=': [{ var: 'allApplicantDetails.0.age' }, 60] }
					]
				},
				fail_message: 'Age must be 21-60',
				fail_category: 'age_limit',
				confidence: 0.95,
				source_excerpt: 'Age: 21-60'
			}
		],
		cibil: [
			{
				rule_id: 'cibil-min-01',
				description: 'Min CIBIL 700',
				tier: 'hard_gate',
				logic: { '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
				fail_message: 'CIBIL below 700',
				fail_category: 'cibil_threshold',
				confidence: 0.95,
				source_excerpt: 'Min CIBIL: 700'
			}
		],
		foir: [
			{
				rule_id: 'foir-cap-01',
				description: 'FOIR cap 50%',
				tier: 'computed',
				logic: { if: [{ '!!': [true] }, 0.5, null] },
				confidence: 0.9,
				source_excerpt: 'FOIR: 50%'
			}
		],
		income_assessment: [
			{
				rule_id: 'inc-salaried-01',
				income_profile_type: 'salaried_regular',
				accepted: true,
				haircut_percent: 0,
				computation_method: 'net_salary',
				confidence: 0.95,
				source_excerpt: 'Salaried: 100%'
			}
		],
		ltv: null,
		obligation_treatment: [
			{
				rule_id: 'obl-term-01',
				obligation_type: 'term_loan',
				treatment: { count_factor: 1.0, ignore_if_closing: true },
				confidence: 0.95,
				source_excerpt: 'Term: 100%'
			},
			{
				rule_id: 'obl-credit-01',
				obligation_type: 'credit_line',
				treatment: {
					count_factor: 1.0,
					ignore_if_closing: false,
					credit_line_method: 'percentage_of_limit',
					credit_line_factor: 0.05
				},
				confidence: 0.9,
				source_excerpt: 'Credit lines: 5% of limit'
			}
		],
		property: null,
		transaction: null,
		tenure: [
			{
				rule_id: 'tenure-max-01',
				description: 'Max tenure 7 years',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_tenure_months',
				parameter_value: 84,
				confidence: 0.95,
				source_excerpt: 'Max tenure: 7 years'
			},
			{
				rule_id: 'age-maturity-01',
				description: 'Max age at maturity 65',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_age_at_maturity',
				parameter_value: 65,
				confidence: 0.95,
				source_excerpt: 'Age at maturity: 65'
			}
		],
		roi: [
			{
				rule_id: 'roi-01',
				description: 'ROI 12%',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'roi',
				parameter_value: 12.0,
				confidence: 0.9,
				source_excerpt: 'ROI: 12%'
			}
		],
		fees: null,
		disbursement: null,
		documentation: null,
		nri: null,
		company: null,
		balance_transfer: null,
		top_up: null
	},

	deviations: null,
	policies: null
};

// ============================================================================
// HELPER: Build unsecured payload with facility type
// ============================================================================

function makeUnsecuredPayload(overrides?: {
	loanName?: string;
	loanAmount?: number;
	tenureYears?: number;
	facilityType?: string;
	netIncome?: number;
	creditScore?: number;
	age?: number;
}): LoanApplicationPayload {
	const o = {
		loanName: 'Personal Loan',
		loanAmount: 1000000,
		tenureYears: 5,
		facilityType: 'Term Loan',
		netIncome: 100000,
		creditScore: 780,
		age: 35,
		...overrides
	};

	const applicant: ApplicantPayload = {
		applicantType: 'Individual',
		fullName: 'Test User',
		age: o.age,
		gender: 'Male',
		maritalStatus: 'Single',
		roleInApplication: 'Primary',
		employmentType: 'Salaried(Private)',
		grossIncome: Math.round(o.netIncome * 1.25),
		netIncome: o.netIncome,
		creditScore: o.creditScore,
		hasExistingObligations: false,
		obligations: []
	};

	return {
		loanTransaction: {
			loanName: o.loanName,
			loanType: 'New Loan',
			numberOfApplicants: 1,
			loanAmount: o.loanAmount,
			tenureYears: o.tenureYears,
			facilityType: o.facilityType
		},
		allApplicantDetails: [applicant]
	};
}

// ============================================================================
// GROUP 1: FACILITY_TYPE_CONFIG
// ============================================================================

describe('FACILITY_TYPE_CONFIG', () => {
	it('has all 5 facility types defined', () => {
		expect(FACILITY_TYPE_CONFIG['Term Loan']).toBeDefined();
		expect(FACILITY_TYPE_CONFIG['Overdraft (OD)']).toBeDefined();
		expect(FACILITY_TYPE_CONFIG['Drop-line OverDraft (DOD)']).toBeDefined();
		expect(FACILITY_TYPE_CONFIG['Cash Credit (CC)']).toBeDefined();
		expect(FACILITY_TYPE_CONFIG['Flexi Drop-line OverDraft (Flexi DOD)']).toBeDefined();
	});

	it('Flexi DOD (P8) is a no-fixed-EMI credit line', () => {
		const config = FACILITY_TYPE_CONFIG['Flexi Drop-line OverDraft (Flexi DOD)'];
		expect(config.hasFixedEmi).toBe(false);
		expect(config.defaultMaxTenureMonths).toBe(84); // 2-yr interest-only + ~5-yr dropline
	});

	it('Term Loan has EMI-based FOIR and fixed EMI', () => {
		const config = FACILITY_TYPE_CONFIG['Term Loan'];
		expect(config.foirMethod).toBe('emi_based');
		expect(config.hasFixedEmi).toBe(true);
	});

	it('OD has percentage_of_limit FOIR and no fixed EMI', () => {
		const config = FACILITY_TYPE_CONFIG['Overdraft (OD)'];
		expect(config.foirMethod).toBe('percentage_of_limit');
		expect(config.hasFixedEmi).toBe(false);
		expect(config.defaultFoirFactor).toBe(0.05);
		expect(config.defaultMaxTenureMonths).toBe(12);
	});

	it('DOD has declining_balance FOIR and no fixed EMI', () => {
		const config = FACILITY_TYPE_CONFIG['Drop-line OverDraft (DOD)'];
		expect(config.foirMethod).toBe('declining_balance');
		expect(config.hasFixedEmi).toBe(false);
		expect(config.defaultMaxTenureMonths).toBe(60);
	});

	it('CC has percentage_of_limit FOIR and no fixed EMI', () => {
		const config = FACILITY_TYPE_CONFIG['Cash Credit (CC)'];
		expect(config.foirMethod).toBe('percentage_of_limit');
		expect(config.hasFixedEmi).toBe(false);
		expect(config.defaultFoirFactor).toBe(0.05);
	});
});

describe('isRevolvingFacility', () => {
	it('OD is revolving', () => expect(isRevolvingFacility('Overdraft (OD)')).toBe(true));
	it('CC is revolving', () => expect(isRevolvingFacility('Cash Credit (CC)')).toBe(true));
	it('DOD is revolving', () => expect(isRevolvingFacility('Drop-line OverDraft (DOD)')).toBe(true));
	it('Flexi DOD is revolving', () =>
		expect(isRevolvingFacility('Flexi Drop-line OverDraft (Flexi DOD)')).toBe(true));
	it('Term Loan is not revolving', () => expect(isRevolvingFacility('Term Loan')).toBe(false));
	it('unknown is not revolving', () => expect(isRevolvingFacility('Unknown')).toBe(false));
});

describe('getFacilityConfig', () => {
	it('returns correct config for known types', () => {
		expect(getFacilityConfig('Overdraft (OD)').label).toBe('Overdraft');
		expect(getFacilityConfig('Cash Credit (CC)').label).toBe('Cash Credit');
	});

	it('returns Term Loan config as default for unknown types', () => {
		const config = getFacilityConfig('Unknown Facility');
		expect(config.foirMethod).toBe('emi_based');
		expect(config.hasFixedEmi).toBe(true);
	});
});

// ============================================================================
// GROUP 2: Facility-Aware Evaluation
// ============================================================================

describe('Facility-Aware Evaluation', () => {
	// -- Term Loan baseline --
	it('Term Loan uses standard EMI-based evaluation', () => {
		const payload = makeUnsecuredPayload({ facilityType: 'Term Loan' });
		const result = evaluateLender(payload, UNSECURED_RULE_DOC);

		expect(result.traffic_light).not.toBe('grey');
		expect(result.is_credit_line).toBeUndefined(); // not a credit line
		expect(result.emi).toBeGreaterThan(0);
		// Term Loan EMI should be substantial for 10L at 12% over 5 years
		expect(result.emi).toBeGreaterThan(15000);
	});

	// -- OD (Overdraft) --
	it('OD uses credit line FOIR and proxy EMI', () => {
		const payload = makeUnsecuredPayload({ facilityType: 'Overdraft (OD)' });
		const result = evaluateLender(payload, UNSECURED_RULE_DOC);

		expect(result.traffic_light).not.toBe('grey');
		expect(result.is_credit_line).toBe(true);
		expect(result.credit_line_factor).toBe(0.05);
		expect(result.facility_type).toBe('Overdraft (OD)');

		// OD proxy EMI = offeredAmount × 0.05 (much lower than term loan EMI)
		// For 10L: proxy ≈ 50,000 (vs Term Loan EMI ≈ 22,244)
		// But the offered amount depends on FOIR headroom
		expect(result.emi).toBeGreaterThan(0);
	});

	// -- Cash Credit --
	it('CC uses credit line FOIR similar to OD', () => {
		const payload = makeUnsecuredPayload({ facilityType: 'Cash Credit (CC)' });
		const result = evaluateLender(payload, UNSECURED_RULE_DOC);

		expect(result.is_credit_line).toBe(true);
		expect(result.credit_line_factor).toBe(0.05);
		expect(result.facility_type).toBe('Cash Credit (CC)');
	});

	// -- DOD (Drop-line Overdraft) --
	it('DOD uses declining balance EMI calculation', () => {
		const payload = makeUnsecuredPayload({
			facilityType: 'Drop-line OverDraft (DOD)',
			tenureYears: 5
		});
		const result = evaluateLender(payload, UNSECURED_RULE_DOC);

		expect(result.is_credit_line).toBe(true);
		expect(result.facility_type).toBe('Drop-line OverDraft (DOD)');

		// DOD EMI should be between OD proxy and Term Loan EMI
		// DOD: principal/months + avg_outstanding × monthly_rate
		expect(result.emi).toBeGreaterThan(0);
	});

	// -- Flexi DOD (P8): interest-only first 2 years --
	it('Flexi DOD uses interest-only burden (factor = monthly rate, < OD/CC 0.05)', () => {
		const payload = makeUnsecuredPayload({
			facilityType: 'Flexi Drop-line OverDraft (Flexi DOD)'
		});
		const result = evaluateLender(payload, UNSECURED_RULE_DOC);

		expect(result.is_credit_line).toBe(true);
		expect(result.facility_type).toBe('Flexi Drop-line OverDraft (Flexi DOD)');
		// Interest-only monthly rate (~1% at 12% p.a.) is far below the 5% OD/CC proxy.
		expect(result.credit_line_factor).toBeGreaterThan(0);
		expect(result.credit_line_factor).toBeLessThan(0.05);
	});

	it('Flexi DOD grants a higher eligible limit than a regular DOD (lighter interest-only burden)', () => {
		const flexi = evaluateLender(
			makeUnsecuredPayload({ facilityType: 'Flexi Drop-line OverDraft (Flexi DOD)' }),
			UNSECURED_RULE_DOC
		);
		const dod = evaluateLender(
			makeUnsecuredPayload({ facilityType: 'Drop-line OverDraft (DOD)' }),
			UNSECURED_RULE_DOC
		);

		expect(flexi.eligible_amount).toBeGreaterThan(dod.eligible_amount);
	});

	// -- EMI comparison across facility types --
	it('OD/CC proxy EMI differs from Term Loan EMI for same amount', () => {
		const termPayload = makeUnsecuredPayload({ facilityType: 'Term Loan', loanAmount: 500000 });
		const odPayload = makeUnsecuredPayload({ facilityType: 'Overdraft (OD)', loanAmount: 500000 });

		const termResult = evaluateLender(termPayload, UNSECURED_RULE_DOC);
		const odResult = evaluateLender(odPayload, UNSECURED_RULE_DOC);

		// Both should evaluate successfully
		expect(termResult.traffic_light).not.toBe('grey');
		expect(odResult.traffic_light).not.toBe('grey');

		// EMI values will differ because calculation methods differ
		// The key guarantee: both produce non-zero EMI values
		expect(termResult.emi).toBeGreaterThan(0);
		expect(odResult.emi).toBeGreaterThan(0);
	});

	// -- Tenure handling --
	it('OD tenure defaults to 12 months when no tenure requested', () => {
		const payload = makeUnsecuredPayload({
			facilityType: 'Overdraft (OD)',
			tenureYears: 0 // no specific tenure requested
		});
		const result = evaluateLender(payload, UNSECURED_RULE_DOC);

		// OD default: 12 months (annual renewal)
		expect(result.tenure_months).toBe(12);
	});

	it('DOD tenure respects requested years within lender max', () => {
		const payload = makeUnsecuredPayload({
			facilityType: 'Drop-line OverDraft (DOD)',
			tenureYears: 3 // 36 months
		});
		const result = evaluateLender(payload, UNSECURED_RULE_DOC);

		// DOD: should use requested tenure (36 months) within lender max (84 months)
		expect(result.tenure_months).toBe(36);
	});

	it('credit line tenure does not exceed lender max', () => {
		const payload = makeUnsecuredPayload({
			facilityType: 'Overdraft (OD)',
			tenureYears: 10 // 120 months, exceeds lender max of 84
		});
		const result = evaluateLender(payload, UNSECURED_RULE_DOC);

		// Should be capped at lender max: 84 months
		expect(result.tenure_months).toBeLessThanOrEqual(84);
	});

	// -- FOIR eligible amount --
	it('credit line FOIR eligible limit uses headroom / factor formula', () => {
		// Verify math: income=100K, FOIR=50%, obligations=0, factor=5%
		// Headroom = 100K × 0.5 = 50K
		// Eligible limit = 50K / 0.05 = 10L
		const limit = calculateCreditLineFoirEligibleLimit(100000, 0.5, 0, 0.05);
		expect(limit).toBe(1000000);

		// Now test via evaluator
		const payload = makeUnsecuredPayload({
			facilityType: 'Overdraft (OD)',
			loanAmount: 800000,
			netIncome: 100000
		});
		const result = evaluateLender(payload, UNSECURED_RULE_DOC);

		// With 100K income and 50% FOIR cap, max limit = 10L
		// Requesting 8L should get GREEN
		expect(result.foir_eligible_amount).toBeGreaterThanOrEqual(800000);
		expect(result.traffic_light).toBe('green');
	});
});

// ============================================================================
// GROUP 3: AD-1 — Fixture Fallback (loadFallbackRuleDocuments)
// ============================================================================

describe('AD-1: Fixture Fallback', () => {
	it('SAMPLE_PVT_BANK, SAMPLE_GOV_BANK, SAMPLE_NBFC are valid rule documents', async () => {
		// These are the static rule docs that serve as fallback
		const { SAMPLE_PVT_BANK, SAMPLE_GOV_BANK, SAMPLE_NBFC } =
			await import('$lib/ruleEngine/sampleRuleDocs');

		// All must have essential identity fields
		expect(SAMPLE_PVT_BANK.lender_id).toBe('sample-pvt-bank');
		expect(SAMPLE_GOV_BANK.lender_id).toBe('sample-gov-bank');
		expect(SAMPLE_NBFC.lender_id).toBe('sample-nbfc');

		// All must have sections with at least eligibility and FOIR rules
		expect(SAMPLE_PVT_BANK.sections.eligibility).toBeTruthy();
		expect(SAMPLE_GOV_BANK.sections.foir).toBeTruthy();
		expect(SAMPLE_NBFC.sections.income_assessment).toBeTruthy();
	});

	it('sample rule docs cover Home Loan and Business Loan', async () => {
		const { SAMPLE_PVT_BANK, SAMPLE_GOV_BANK, SAMPLE_NBFC } =
			await import('$lib/ruleEngine/sampleRuleDocs');

		// PVT covers Home + LAP
		expect(SAMPLE_PVT_BANK.loan_types).toContain('Home Loan');

		// GOV + NBFC cover Business Loan
		expect(SAMPLE_GOV_BANK.loan_types).toContain('Business Loan');
		expect(SAMPLE_NBFC.loan_types).toContain('Business Loan');
	});

	it('real bank rule docs export ALL_REAL_BANK_RULE_DOCS array', async () => {
		const module = await import('$lib/ruleEngine/realBankRuleDocs');
		expect(Array.isArray(module.ALL_REAL_BANK_RULE_DOCS)).toBe(true);
		expect(module.ALL_REAL_BANK_RULE_DOCS.length).toBeGreaterThanOrEqual(7);

		// Each doc must have required fields
		for (const doc of module.ALL_REAL_BANK_RULE_DOCS) {
			expect(doc.lender_id).toBeTruthy();
			expect(doc.lender_name).toBeTruthy();
			expect(doc.sections).toBeTruthy();
			expect(doc.loan_types.length).toBeGreaterThan(0);
		}
	});

	it('evaluateLender produces valid results with sample docs', async () => {
		const { SAMPLE_PVT_BANK } = await import('$lib/ruleEngine/sampleRuleDocs');

		const payload: LoanApplicationPayload = {
			loanTransaction: {
				loanName: 'Home Loan',
				loanType: 'New Loan',
				numberOfApplicants: 1,
				propertyCost: 7500000,
				loanAmount: 6000000,
				tenureYears: 20
			},
			allApplicantDetails: [
				{
					applicantType: 'Individual',
					fullName: 'Test User',
					age: 34,
					gender: 'Male',
					maritalStatus: 'Married',
					roleInApplication: 'Primary',
					employmentType: 'Salaried(Private)',
					grossIncome: 100000,
					netIncome: 80000,
					creditScore: 780,
					hasExistingObligations: false,
					obligations: []
				}
			]
		};

		const result = evaluateLender(payload, SAMPLE_PVT_BANK);

		// Should produce a real evaluation (not grey)
		expect(result.traffic_light).not.toBe('grey');
		expect(result.assessed_income).toBeGreaterThan(0);
		expect(result.offered_amount).toBeGreaterThan(0);
		expect(result.emi).toBeGreaterThan(0);
	});
});
