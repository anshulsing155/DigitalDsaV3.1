/**
 * =============================================================================
 * RE-2: EVALUATION ENGINE — Unit Tests
 * =============================================================================
 *
 * Tests the complete evaluation pipeline:
 *   - EMI calculator (pure math)
 *   - Income assessment (haircuts, multi-applicant)
 *   - Obligation treatment (term loans, credit lines, closing)
 *   - FOIR (calculation, cap, eligible amount)
 *   - LTV (standard, ATS, unsecured skip)
 *   - Hard gates (pass/fail, applies_when, null sections)
 *   - Deviations (coverage, conditions, probability)
 *   - Traffic light (GREEN/AMBER/RED/GREY)
 *   - Factors & suggestions
 *   - Ratings (percentile-based, RED = poor)
 *   - Full pipeline (fixture profiles through evaluateLender)
 *   - Output contract (shape matches lenderResults.ts)
 *
 * =============================================================================
 */

import { describe, it, expect } from 'vitest';
import type {
	LoanApplicationPayload,
	ApplicantPayload,
	ObligationEntry
} from '$lib/utils/payloadBuilder';

// Core pipeline functions
import { evaluateLender, buildResults } from '$lib/ruleEngine/evaluationEngine.js';

// EMI calculator
import {
	calculateEMI,
	calculateFoirEligibleAmount,
	calculateLtvCappedAmount,
	calculateOfferedAmount,
	determineEffectiveTenure
} from '$lib/ruleEngine/emiCalculator.js';

// Income assessor
import {
	mapEmploymentToProfileType,
	extractGrossMonthlyIncome,
	computeObligationLoad,
	determineFoirCap
} from '$lib/ruleEngine/incomeAssessor.js';

// Result builder
import {
	buildFactors,
	buildSuggestions,
	assignRatings,
	calculateApprovalProbability,
	buildTrafficLightMessage,
	buildLenderResult,
	buildSummary
} from '$lib/ruleEngine/resultBuilder.js';

// Types
import type {
	ParsedLenderRuleDocument,
	ParsedRule,
	ParsedIncomeRule,
	ParsedObligationRule,
	ParsedDeviation,
	LenderEvaluation
} from '$lib/ruleEngine/types.js';

// Fixture profiles
import {
	fixture01_SalariedClean,
	fixture02_SalariedWithCarLoan,
	fixture03_SelfEmployedCA
} from './fixtureProfiles.test.js';

// ============================================================================
// MOCK RULE DOCUMENT — "Test Bank PVT"
// ============================================================================

function obligation(overrides: Partial<ObligationEntry> & { loanType: string }): ObligationEntry {
	return {
		id: 'test-obl-' + Math.random().toString(36).slice(2, 8),
		obligationType: 'term_loan',
		bankName: '',
		selectedToClose: 'Keep running',
		emi: '0',
		totalLimit: '0',
		tenure: '',
		interestRate: '',
		...overrides
	};
}

const MOCK_RULE_DOC: ParsedLenderRuleDocument = {
	lender_id: 'test-bank-pvt',
	lender_name: 'Test Bank PVT',
	classification: 'PVT',
	loan_types: ['Home Loan', 'Loan Against Property', 'Personal Loan'],

	sections: {
		eligibility: [
			{
				rule_id: 'elig-age-01',
				description: 'Applicant age must be between 21 and 60',
				tier: 'hard_gate',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.age' }, 21] },
						{ '<=': [{ var: 'allApplicantDetails.0.age' }, 60] }
					]
				},
				fail_message: 'Primary applicant age must be 21-60 years',
				fail_category: 'age_limit',
				confidence: 0.95,
				source_excerpt: 'Age: 21-60 years'
			}
		],
		cibil: [
			{
				rule_id: 'cibil-min-01',
				description: 'Minimum CIBIL score of 700',
				tier: 'hard_gate',
				logic: {
					'>=': [{ var: 'allApplicantDetails.0.creditScore' }, 700]
				},
				fail_message: 'CIBIL score below 700 minimum requirement',
				fail_category: 'cibil_threshold',
				confidence: 0.95,
				source_excerpt: 'Min CIBIL: 700'
			}
		],
		foir: [
			{
				rule_id: 'foir-cap-high',
				description: 'FOIR cap 55% for income above 50K',
				tier: 'computed',
				logic: {
					if: [{ '>': [{ var: 'allApplicantDetails.0.netIncome' }, 50000] }, 0.55, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 55% for income > 50K'
			},
			{
				rule_id: 'foir-cap-low',
				description: 'FOIR cap 50% for income below 50K',
				tier: 'computed',
				logic: {
					if: [{ '<=': [{ var: 'allApplicantDetails.0.netIncome' }, 50000] }, 0.5, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 50% for income <= 50K'
			}
		],
		income_assessment: [
			{
				rule_id: 'income-salaried-01',
				income_profile_type: 'salaried_regular',
				accepted: true,
				haircut_percent: 0,
				computation_method: 'net_salary',
				confidence: 0.95,
				source_excerpt: 'Salaried: 100% of net salary'
			},
			{
				rule_id: 'income-selfemployed-01',
				income_profile_type: 'professional_practice',
				accepted: true,
				haircut_percent: 20,
				computation_method: 'avg_net_profit',
				confidence: 0.9,
				source_excerpt: 'Professional: 80% of avg net profit'
			},
			{
				rule_id: 'income-business-01',
				income_profile_type: 'business_proprietorship',
				accepted: true,
				haircut_percent: 25,
				computation_method: 'avg_net_profit',
				confidence: 0.85,
				source_excerpt: 'Business: 75% of avg net profit'
			},
			{
				rule_id: 'income-pension-01',
				income_profile_type: 'pension',
				accepted: true,
				haircut_percent: 0,
				computation_method: 'pension_amount',
				confidence: 0.95,
				source_excerpt: 'Pension: 100% of pension'
			},
			{
				rule_id: 'income-unemployed-01',
				income_profile_type: 'no_current_income',
				accepted: false,
				haircut_percent: 100,
				computation_method: 'none',
				confidence: 0.95,
				source_excerpt: 'Unemployed: Not accepted'
			}
		] as ParsedIncomeRule[],
		ltv: [
			{
				rule_id: 'ltv-under-30l',
				description: 'LTV 80% for loans under 30L',
				tier: 'parameter',
				logic: { '<': [{ var: 'loanTransaction.loanAmount' }, 3000000] },
				parameter_key: 'max_ltv',
				parameter_value: 80,
				confidence: 0.9,
				source_excerpt: 'LTV: 80% for < 30L'
			},
			{
				rule_id: 'ltv-30l-75l',
				description: 'LTV 75% for loans 30L-75L',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'loanTransaction.loanAmount' }, 3000000] },
						{ '<=': [{ var: 'loanTransaction.loanAmount' }, 7500000] }
					]
				},
				parameter_key: 'max_ltv',
				parameter_value: 75,
				confidence: 0.9,
				source_excerpt: 'LTV: 75% for 30L-75L'
			}
		],
		obligation_treatment: [
			{
				rule_id: 'obl-term-01',
				obligation_type: 'term_loan',
				treatment: {
					count_factor: 1.0,
					ignore_if_closing: true
				},
				confidence: 0.95,
				source_excerpt: 'Term loans at 100%, ignore if closing'
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
				source_excerpt: 'Credit lines at 5% of limit'
			}
		] as ParsedObligationRule[],
		property: null,
		transaction: null,
		tenure: [
			{
				rule_id: 'tenure-max-01',
				description: 'Max tenure 30 years',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_tenure_months',
				parameter_value: 360,
				confidence: 0.95,
				source_excerpt: 'Max tenure: 30 years'
			},
			{
				rule_id: 'age-maturity-01',
				description: 'Max age at maturity 65',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_age_at_maturity',
				parameter_value: 65,
				confidence: 0.95,
				source_excerpt: 'Age at maturity: max 65 years'
			}
		],
		roi: [
			{
				rule_id: 'roi-high-cibil',
				description: 'ROI 8.5% for CIBIL 750+',
				tier: 'parameter',
				logic: { '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 750] },
				parameter_key: 'roi',
				parameter_value: 8.5,
				confidence: 0.9,
				source_excerpt: 'ROI: 8.5% for CIBIL 750+'
			},
			{
				rule_id: 'roi-low-cibil',
				description: 'ROI 9.5% for CIBIL below 750',
				tier: 'parameter',
				logic: { '<': [{ var: 'allApplicantDetails.0.creditScore' }, 750] },
				parameter_key: 'roi',
				parameter_value: 9.5,
				confidence: 0.85,
				source_excerpt: 'ROI: 9.5% for CIBIL < 750'
			}
		],
		fees: [
			{
				rule_id: 'fee-standard',
				description: 'Processing fee 0.5%',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'processing_fee_percent',
				parameter_value: 0.5,
				confidence: 0.9,
				source_excerpt: 'Processing: 0.5%'
			}
		],
		disbursement: null,
		documentation: null,
		nri: [
			{
				rule_id: 'nri-gate',
				description: 'NRI applicants require GPA',
				tier: 'hard_gate',
				logic: { '!!': [{ var: 'allApplicantDetails.0.gpaDetails' }] },
				applies_when: { '==': [{ var: 'allApplicantDetails.0.isNRI' }, true] },
				fail_message: 'NRI applicants must provide GPA details',
				fail_category: 'nri_requirement',
				confidence: 0.85,
				source_excerpt: 'NRI: GPA required'
			}
		],
		company: null,
		balance_transfer: null,
		top_up: null
	},

	deviations: [
		{
			deviation_id: 'dev-cibil-relax',
			description: 'CIBIL relaxed to 650 for income > 2L',
			deviates_from: 'cibil-min-01',
			condition: {
				'>': [{ var: 'allApplicantDetails.0.netIncome' }, 200000]
			},
			approval_authority: 'branch_manager',
			max_deviation: '50 points CIBIL',
			probability_modifier: -0.1,
			confidence: 0.8,
			source_excerpt: 'Deviation: CIBIL relax for high income'
		}
	],

	policies: [
		{
			policy_key: 'max_age',
			label: 'Maximum Age at Maturity',
			value: 65,
			display_on_offer_card: false,
			category: 'eligibility'
		},
		{
			policy_key: 'turnaround_days',
			label: 'Expected Turnaround',
			value: '10-15 working days',
			display_on_offer_card: true,
			category: 'service'
		}
	]
};

// Second mock lender for multi-lender tests
const MOCK_RULE_DOC_2: ParsedLenderRuleDocument = {
	...MOCK_RULE_DOC,
	lender_id: 'test-gov-bank',
	lender_name: 'Test Government Bank',
	classification: 'GOV',
	sections: {
		...MOCK_RULE_DOC.sections,
		cibil: [
			{
				rule_id: 'cibil-min-gov',
				description: 'Minimum CIBIL score of 650',
				tier: 'hard_gate',
				logic: { '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 650] },
				fail_message: 'CIBIL score below 650',
				fail_category: 'cibil_threshold',
				confidence: 0.95,
				source_excerpt: 'Min CIBIL: 650'
			}
		],
		roi: [
			{
				rule_id: 'roi-gov-standard',
				description: 'ROI 8.25% standard',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'roi',
				parameter_value: 8.25,
				confidence: 0.95,
				source_excerpt: 'ROI: 8.25% standard'
			}
		]
	},
	deviations: null
};

// ============================================================================
// HELPER: Build minimal payload
// ============================================================================

function makePayload(overrides?: {
	loanName?: string;
	loanAmount?: number;
	tenureYears?: number;
	propertyCost?: number;
	atsValue?: number;
	age?: number;
	creditScore?: number;
	netIncome?: number;
	employmentType?: string;
	obligations?: ObligationEntry[];
	hasObligations?: boolean;
	applicants?: ApplicantPayload[];
	excludedBanks?: string[];
}): LoanApplicationPayload {
	const defaults = {
		loanName: 'Home Loan',
		loanAmount: 6000000,
		tenureYears: 20,
		propertyCost: 7500000,
		age: 34,
		creditScore: 780,
		netIncome: 80000,
		employmentType: 'Salaried(Private)'
	};

	const o = { ...defaults, ...overrides };

	const applicant: ApplicantPayload = {
		applicantType: 'Individual',
		fullName: 'Test User',
		age: o.age,
		gender: 'Male',
		maritalStatus: 'Married',
		roleInApplication: 'Primary',
		employmentType: o.employmentType,
		grossIncome: Math.round(o.netIncome * 1.25),
		netIncome: o.netIncome,
		creditScore: o.creditScore,
		hasExistingObligations: o.hasObligations ?? (o.obligations != null && o.obligations.length > 0),
		obligations: o.obligations
	};

	return {
		loanTransaction: {
			loanName: o.loanName,
			loanType: 'New Loan',
			numberOfApplicants: o.applicants ? o.applicants.length : 1,
			propertyCost: o.propertyCost,
			atsValue: o.atsValue,
			loanAmount: o.loanAmount,
			tenureYears: o.tenureYears,
			excludedBanks: o.excludedBanks
		},
		allApplicantDetails: o.applicants ?? [applicant]
	};
}

// ============================================================================
// GROUP 1: EMI CALCULATOR
// ============================================================================

describe('EMI Calculator', () => {
	it('calculates correct EMI for standard home loan', () => {
		// 60L at 8.5% for 20 years (240 months)
		const emi = calculateEMI(6000000, 8.5, 240);
		// Expected ~52,099
		expect(emi).toBeGreaterThan(50000);
		expect(emi).toBeLessThan(55000);
	});

	it('returns 0 for zero principal', () => {
		expect(calculateEMI(0, 8.5, 240)).toBe(0);
	});

	it('returns 0 for zero tenure', () => {
		expect(calculateEMI(6000000, 8.5, 0)).toBe(0);
	});

	it('handles zero interest rate (simple division)', () => {
		const emi = calculateEMI(1200000, 0, 12);
		expect(emi).toBe(100000);
	});

	it('calculates correct EMI for known values', () => {
		// 10L at 10% for 10 years = EMI ~13,215
		const emi = calculateEMI(1000000, 10, 120);
		expect(emi).toBeGreaterThan(13000);
		expect(emi).toBeLessThan(14000);
	});

	it('handles single month tenure', () => {
		const emi = calculateEMI(100000, 12, 1);
		// Should be principal + 1 month interest ~ 101000
		expect(emi).toBeGreaterThan(100000);
		expect(emi).toBeLessThan(102000);
	});
});

describe('FOIR Eligible Amount', () => {
	it('reverse-calculates principal from max EMI', () => {
		// Income 80K, FOIR 55%, no obligations => max EMI 44K
		const amount = calculateFoirEligibleAmount(80000, 0.55, 0, 8.5, 240);
		expect(amount).toBeGreaterThan(5000000);
		expect(amount).toBeLessThan(6000000);
	});

	it('returns 0 when obligations exceed FOIR limit', () => {
		// Income 50K, FOIR 50%, obligations 25K => max EMI 0
		const amount = calculateFoirEligibleAmount(50000, 0.5, 25000, 8.5, 240);
		expect(amount).toBe(0);
	});

	it('handles zero interest rate', () => {
		const amount = calculateFoirEligibleAmount(100000, 0.55, 0, 0, 240);
		// max EMI 55K * 240 = 1.32Cr
		expect(amount).toBe(13200000);
	});

	it('returns 0 for zero income', () => {
		expect(calculateFoirEligibleAmount(0, 0.55, 0, 8.5, 240)).toBe(0);
	});
});

describe('LTV Capped Amount', () => {
	it('caps at max LTV of property cost', () => {
		const amount = calculateLtvCappedAmount(75, 7500000);
		expect(amount).toBe(5625000);
	});

	it('uses min of propertyCost and atsValue', () => {
		const amount = calculateLtvCappedAmount(75, 7500000, 6500000);
		expect(amount).toBe(4875000); // 75% of 65L
	});

	it('returns 0 for zero property cost', () => {
		expect(calculateLtvCappedAmount(75, 0)).toBe(0);
	});

	it('returns 0 for zero LTV', () => {
		expect(calculateLtvCappedAmount(0, 7500000)).toBe(0);
	});

	it('ignores atsValue of 0', () => {
		const amount = calculateLtvCappedAmount(80, 5000000, 0);
		expect(amount).toBe(4000000);
	});
});

describe('Offered Amount', () => {
	it('returns minimum of all constraints', () => {
		expect(calculateOfferedAmount(6000000, 5500000, 4875000)).toBe(4875000);
	});

	it('caps at requested amount', () => {
		expect(calculateOfferedAmount(3000000, 5500000, 4875000)).toBe(3000000);
	});

	it('works without LTV cap (unsecured)', () => {
		expect(calculateOfferedAmount(2000000, 3000000)).toBe(2000000);
	});

	it('returns 0 when FOIR eligible is 0', () => {
		expect(calculateOfferedAmount(6000000, 0, 4875000)).toBe(0);
	});
});

describe('Effective Tenure', () => {
	it('respects requested tenure', () => {
		expect(determineEffectiveTenure(20, 34, 65, 360)).toBe(240);
	});

	it('limits by age at maturity', () => {
		// 55yo, max 65 at maturity => 10 years max = 120 months
		expect(determineEffectiveTenure(20, 55, 65, 360)).toBe(120);
	});

	it('limits by lender max months', () => {
		expect(determineEffectiveTenure(30, 25, 65, 240)).toBe(240);
	});

	it('floors at 12 months', () => {
		expect(determineEffectiveTenure(0, 64, 65, 360)).toBe(12);
	});
});

// ============================================================================
// GROUP 2: INCOME ASSESSMENT
// ============================================================================

describe('Employment Type Mapping', () => {
	it('maps all known employment types', () => {
		expect(mapEmploymentToProfileType('Salaried(Private)')).toBe('salaried_regular');
		expect(mapEmploymentToProfileType('Salaried(Government)')).toBe('salaried_government');
		expect(mapEmploymentToProfileType('Self-employed(Professional)')).toBe('professional_practice');
		expect(mapEmploymentToProfileType('Self-employed(Other)')).toBe('business_proprietorship');
		expect(mapEmploymentToProfileType('Pensioner')).toBe('pension');
		expect(mapEmploymentToProfileType('Unemployed')).toBe('no_current_income');
	});

	it('returns unknown for unrecognized type', () => {
		expect(mapEmploymentToProfileType('Freelancer')).toBe('unknown');
	});
});

describe('Gross Income Extraction', () => {
	it('uses netIncome for salaried', () => {
		const income = extractGrossMonthlyIncome({
			applicantType: 'Individual',
			fullName: 'Test',
			age: 30,
			gender: 'Male',
			maritalStatus: 'Single',
			employmentType: 'Salaried(Private)',
			netIncome: 80000,
			grossIncome: 100000,
			creditScore: 750,
			hasExistingObligations: false
		});
		expect(income).toBe(80000);
	});

	it('uses financials average for self-employed', () => {
		const income = extractGrossMonthlyIncome({
			applicantType: 'Individual',
			fullName: 'Test',
			age: 40,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Self-employed(Other)',
			financials: {
				grossReceipts: [5000000, 6000000],
				netProfit: [1800000, 2400000],
				depreciation: [100000, 100000],
				itrFiled: ['FY23-24', 'FY22-23']
			},
			creditScore: 750,
			hasExistingObligations: false
		});
		// Avg net profit = (18L + 24L) / 2 = 21L / 12 = 175000
		expect(income).toBe(175000);
	});

	it('returns 0 for unemployed with no other income', () => {
		const income = extractGrossMonthlyIncome({
			applicantType: 'Individual',
			fullName: 'Test',
			age: 25,
			gender: 'Female',
			maritalStatus: 'Single',
			employmentType: 'Unemployed',
			creditScore: 0,
			hasExistingObligations: false
		});
		expect(income).toBe(0);
	});

	it('uses financials for Company applicant', () => {
		const income = extractGrossMonthlyIncome({
			applicantType: 'Company',
			fullName: 'ABC Pvt Ltd',
			age: 0,
			gender: 'Male',
			maritalStatus: 'Single',
			employmentType: 'Self-employed(Other)',
			companyName: 'ABC Pvt Ltd',
			financials: {
				grossReceipts: [10000000],
				netProfit: [3600000],
				depreciation: [200000],
				itrFiled: ['FY23-24']
			},
			creditScore: 0,
			hasExistingObligations: false
		});
		expect(income).toBe(300000); // 36L / 1 / 12
	});
});

// NOTE: V1 assessIncome() tests removed — function was deprecated and deleted.
// Multi-applicant income assessment is now tested in incomeAssessorV2.test.ts.

// ============================================================================
// GROUP 3: OBLIGATION TREATMENT
// ============================================================================

describe('Obligation Load Computation', () => {
	it('counts term loan EMI at 100%', () => {
		const applicants: ApplicantPayload[] = [
			{
				applicantType: 'Individual',
				fullName: 'Test',
				age: 30,
				gender: 'Male',
				maritalStatus: 'Single',
				employmentType: 'Salaried(Private)',
				creditScore: 750,
				hasExistingObligations: true,
				obligations: [obligation({ loanType: 'Car Loan', emi: '12000' })]
			}
		];

		const result = computeObligationLoad(
			applicants,
			MOCK_RULE_DOC.sections.obligation_treatment as ParsedObligationRule[]
		);

		expect(result.totalMonthly).toBe(12000);
		expect(result.details).toHaveLength(1);
		expect(result.details[0].treatment_applied).toBe('full');
	});

	it('counts credit line at 5% of limit', () => {
		const applicants: ApplicantPayload[] = [
			{
				applicantType: 'Individual',
				fullName: 'Test',
				age: 30,
				gender: 'Male',
				maritalStatus: 'Single',
				employmentType: 'Salaried(Private)',
				creditScore: 750,
				hasExistingObligations: true,
				obligations: [
					obligation({
						loanType: 'CC Limit',
						obligationType: 'credit_line',
						totalLimit: '500000'
					})
				]
			}
		];

		const result = computeObligationLoad(
			applicants,
			MOCK_RULE_DOC.sections.obligation_treatment as ParsedObligationRule[]
		);

		expect(result.totalMonthly).toBe(25000); // 5% of 5L
		expect(result.details[0].treatment_applied).toBe('5%_of_limit');
	});

	it('ignores closing obligations when rule says so', () => {
		const applicants: ApplicantPayload[] = [
			{
				applicantType: 'Individual',
				fullName: 'Test',
				age: 30,
				gender: 'Male',
				maritalStatus: 'Single',
				employmentType: 'Salaried(Private)',
				creditScore: 750,
				hasExistingObligations: true,
				obligations: [
					obligation({
						loanType: 'Personal Loan',
						emi: '15000',
						selectedToClose: 'Self-funded'
					})
				]
			}
		];

		const result = computeObligationLoad(
			applicants,
			MOCK_RULE_DOC.sections.obligation_treatment as ParsedObligationRule[]
		);

		expect(result.totalMonthly).toBe(0);
		expect(result.details[0].treatment_applied).toBe('ignored_closing');
	});

	it('handles no obligations', () => {
		const applicants: ApplicantPayload[] = [
			{
				applicantType: 'Individual',
				fullName: 'Test',
				age: 30,
				gender: 'Male',
				maritalStatus: 'Single',
				employmentType: 'Salaried(Private)',
				creditScore: 750,
				hasExistingObligations: false
			}
		];

		const result = computeObligationLoad(
			applicants,
			MOCK_RULE_DOC.sections.obligation_treatment as ParsedObligationRule[]
		);

		expect(result.totalMonthly).toBe(0);
		expect(result.details).toHaveLength(0);
	});

	it('parses string EMI values correctly', () => {
		const applicants: ApplicantPayload[] = [
			{
				applicantType: 'Individual',
				fullName: 'Test',
				age: 30,
				gender: 'Male',
				maritalStatus: 'Single',
				employmentType: 'Salaried(Private)',
				creditScore: 750,
				hasExistingObligations: true,
				obligations: [obligation({ loanType: 'Home Loan', emi: '45000.50' })]
			}
		];

		const result = computeObligationLoad(
			applicants,
			MOCK_RULE_DOC.sections.obligation_treatment as ParsedObligationRule[]
		);

		expect(result.totalMonthly).toBeCloseTo(45000.5);
	});

	it('handles null obligation rules (default treatment)', () => {
		const applicants: ApplicantPayload[] = [
			{
				applicantType: 'Individual',
				fullName: 'Test',
				age: 30,
				gender: 'Male',
				maritalStatus: 'Single',
				employmentType: 'Salaried(Private)',
				creditScore: 750,
				hasExistingObligations: true,
				obligations: [obligation({ loanType: 'Car Loan', emi: '10000' })]
			}
		];

		const result = computeObligationLoad(applicants, null);
		expect(result.totalMonthly).toBe(10000); // default count_factor 1.0
	});
});

// ============================================================================
// GROUP 4: FOIR
// ============================================================================

describe('FOIR Cap Determination', () => {
	it('returns 55% for high income (>50K)', () => {
		const payload = makePayload({ netIncome: 80000 });
		const cap = determineFoirCap(payload, MOCK_RULE_DOC.sections.foir as ParsedRule[]);
		// First rule (>50K) matches => 0.55, second rule (<=50K) does NOT match
		expect(cap).toBe(0.55);
	});

	it('returns 50% for low income (<=50K)', () => {
		const payload = makePayload({ netIncome: 40000 });
		const cap = determineFoirCap(payload, MOCK_RULE_DOC.sections.foir as ParsedRule[]);
		// First rule (>50K) does NOT match, second rule (<=50K) matches => 0.50
		expect(cap).toBe(0.5);
	});

	it('returns null with null rules (no default — caller must handle)', () => {
		const payload = makePayload();
		const cap = determineFoirCap(payload, null);
		expect(cap).toBe(null);
	});

	it('returns null with empty rules (no default — caller must handle)', () => {
		const payload = makePayload();
		const cap = determineFoirCap(payload, []);
		expect(cap).toBe(null);
	});
});

// ============================================================================
// GROUP 5: HARD GATES
// ============================================================================

describe('Hard Gate Evaluation', () => {
	it('passes all gates for clean salaried profile', () => {
		const payload = makePayload({ creditScore: 780, age: 34 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.all_gates_passed).toBe(true);
		expect(evaluation.failed_gate_ids).toHaveLength(0);
	});

	it('fails CIBIL gate for low score', () => {
		const payload = makePayload({ creditScore: 650, age: 34 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.all_gates_passed).toBe(false);
		expect(evaluation.failed_gate_ids).toContain('cibil-min-01');
	});

	it('fails age gate for too young', () => {
		const payload = makePayload({ age: 18, creditScore: 780 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.failed_gate_ids).toContain('elig-age-01');
	});

	it('fails age gate for too old', () => {
		const payload = makePayload({ age: 65, creditScore: 780 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.failed_gate_ids).toContain('elig-age-01');
	});

	it('skips NRI gate for non-NRI applicant', () => {
		const payload = makePayload({ creditScore: 780 });
		// Non-NRI applicant should NOT trigger NRI gate
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		// NRI gate should not appear in results at all (skipped via applies_when)
		const nriGate = evaluation.gate_results.find((g) => g.rule_id === 'nri-gate');
		expect(nriGate).toBeUndefined();
	});

	it('handles null sections gracefully', () => {
		// property and transaction sections are null in mock doc
		const payload = makePayload({ creditScore: 780 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		// Should not have any property/transaction gate results
		const propGates = evaluation.gate_results.filter(
			(g) => g.section === 'property' || g.section === 'transaction'
		);
		expect(propGates).toHaveLength(0);
	});
});

// ============================================================================
// GROUP 6: DEVIATIONS
// ============================================================================

describe('Deviation Checking', () => {
	it('applies CIBIL deviation for high income', () => {
		// CIBIL 680 (fails gate 700), income 250K (> 200K)
		const payload = makePayload({ creditScore: 680, netIncome: 250000 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.failed_gate_ids).toContain('cibil-min-01');
		expect(evaluation.deviations_applied).toHaveLength(1);
		expect(evaluation.deviations_applied[0].deviation_id).toBe('dev-cibil-relax');
		expect(evaluation.traffic_light).toBe('amber'); // Covered by deviation
	});

	it('does not apply deviation when condition fails', () => {
		// CIBIL 680 (fails gate), income 80K (< 200K, deviation condition fails)
		const payload = makePayload({ creditScore: 680, netIncome: 80000 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.failed_gate_ids).toContain('cibil-min-01');
		expect(evaluation.deviations_applied).toHaveLength(0);
		expect(evaluation.traffic_light).toBe('red');
	});

	it('applies probability modifier', () => {
		const payload = makePayload({ creditScore: 680, netIncome: 250000 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.deviations_applied[0].probability_modifier).toBe(-0.1);
	});

	it('no deviations when all gates pass', () => {
		const payload = makePayload({ creditScore: 780 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.deviations_applied).toHaveLength(0);
	});

	it('no deviations for lender with null deviations', () => {
		const payload = makePayload({ creditScore: 640 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC_2);

		expect(evaluation.deviations_applied).toHaveLength(0);
		expect(evaluation.traffic_light).toBe('red');
	});
});

// ============================================================================
// GROUP 7: TRAFFIC LIGHT
// ============================================================================

describe('Traffic Light Assignment', () => {
	it('GREEN when all gates pass and full amount offered', () => {
		// 100K income supports 60L at 8.5% for 20 years (EMI ~52K, FOIR ~52%)
		const payload = makePayload({ creditScore: 780, netIncome: 100000, loanAmount: 4000000 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.traffic_light).toBe('green');
		expect(evaluation.offered_amount).toBeGreaterThan(0);
	});

	it('AMBER when offered amount less than requested', () => {
		// Small income => offered < requested
		const payload = makePayload({ creditScore: 780, netIncome: 30000, loanAmount: 6000000 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		// 30K income * 0.50 FOIR cap = 15K max EMI => much less than 60L
		expect(evaluation.traffic_light).toBe('amber');
		expect(evaluation.offered_amount).toBeLessThan(6000000);
		expect(evaluation.offered_amount).toBeGreaterThan(0);
	});

	it('AMBER when gates fail but deviation covers them', () => {
		const payload = makePayload({ creditScore: 680, netIncome: 250000 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.traffic_light).toBe('amber');
	});

	it('RED when gates fail with no deviation coverage', () => {
		const payload = makePayload({ creditScore: 650, netIncome: 80000 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.traffic_light).toBe('red');
	});

	it('RED when offered amount is 0', () => {
		// No income => 0 eligible
		const payload = makePayload({ creditScore: 780, netIncome: 0 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.traffic_light).toBe('red');
	});

	it('GREY when loan type not supported', () => {
		const payload = makePayload({ loanName: 'Business Loan' });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		// Business Loan is not in mock doc's loan_types but actually it IS (Personal Loan)
		// Let me use a loan type that's NOT in the mock doc
		const payload2 = makePayload({ loanName: 'Professional Loan' });
		const evaluation2 = evaluateLender(payload2, MOCK_RULE_DOC);

		expect(evaluation2.traffic_light).toBe('grey');
		expect(evaluation2.traffic_light_message).toContain('not supported');
	});

	it('GREY when no applicants', () => {
		const payload = makePayload({ applicants: [] });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.traffic_light).toBe('grey');
	});
});

// ============================================================================
// GROUP 8: FACTORS & SUGGESTIONS
// ============================================================================

describe('Factor Building', () => {
	it('produces positive factors for passing gates', () => {
		const payload = makePayload({ creditScore: 780 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);
		const factors = buildFactors(evaluation);

		const positiveFactors = factors.filter((f) => f.impact === 'positive');
		expect(positiveFactors.length).toBeGreaterThan(0);
	});

	it('produces negative factors for failed gates', () => {
		const payload = makePayload({ creditScore: 650 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);
		const factors = buildFactors(evaluation);

		const negativeFactors = factors.filter((f) => f.impact === 'negative');
		expect(negativeFactors.length).toBeGreaterThan(0);
	});

	it('includes FOIR factor with metric', () => {
		const payload = makePayload({ creditScore: 780, netIncome: 80000 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);
		const factors = buildFactors(evaluation);

		const foirFactor = factors.find((f) => f.id === 'foir-check');
		expect(foirFactor).toBeDefined();
		expect(foirFactor!.metric?.label).toBe('FOIR');
	});

	it('includes CIBIL metric on cibil gate factor', () => {
		const payload = makePayload({ creditScore: 780 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);
		const factors = buildFactors(evaluation);

		const cibilFactor = factors.find((f) => f.category === 'credit');
		expect(cibilFactor).toBeDefined();
		expect(cibilFactor!.metric).toBeDefined();
	});

	it('assigns correct categories', () => {
		const payload = makePayload({ creditScore: 780 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);
		const factors = buildFactors(evaluation);

		const categories = new Set(factors.map((f) => f.category));
		// Should have at least profile (eligibility) and credit (cibil)
		expect(categories.has('profile')).toBe(true);
		expect(categories.has('credit')).toBe(true);
	});
});

describe('Suggestion Building', () => {
	it('produces deviation suggestions when deviations applied', () => {
		const payload = makePayload({ creditScore: 680, netIncome: 250000 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);
		const suggestions = buildSuggestions(evaluation, payload);

		const deviationSuggestion = suggestions.find((s) => s.id === 'dev-cibil-relax');
		expect(deviationSuggestion).toBeDefined();
	});

	it('suggests closing obligations when FOIR is high', () => {
		const payload = makePayload({
			creditScore: 780,
			netIncome: 50000,
			hasObligations: true,
			obligations: [obligation({ loanType: 'Car Loan', emi: '15000' })]
		});
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);
		const suggestions = buildSuggestions(evaluation, payload);

		const closeSuggestion = suggestions.find((s) => s.id === 'reduce-obligations');
		expect(closeSuggestion).toBeDefined();
	});
});

// ============================================================================
// GROUP 9: RATINGS
// ============================================================================

describe('Rating Assignment', () => {
	it('assigns ratings across multiple evaluations', () => {
		const payload1 = makePayload({ creditScore: 780, netIncome: 80000 });
		const payload2 = makePayload({ creditScore: 780, netIncome: 50000 });

		const eval1 = evaluateLender(payload1, MOCK_RULE_DOC);
		const eval2 = evaluateLender(payload2, MOCK_RULE_DOC_2);

		const ratings = assignRatings([eval1, eval2]);
		expect(ratings.size).toBe(2);

		// Both should have valid ratings
		const r1 = ratings.get('test-bank-pvt');
		expect(r1).toBeDefined();
		expect(['excellent', 'good', 'average', 'poor']).toContain(r1!.overall);
	});

	it('RED evaluations always get poor rating', () => {
		const payload = makePayload({ creditScore: 650, netIncome: 80000 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.traffic_light).toBe('red');

		const ratings = assignRatings([evaluation]);
		const rating = ratings.get('test-bank-pvt');
		expect(rating?.overall).toBe('poor');
	});

	it('single GREEN evaluation gets excellent', () => {
		const payload = makePayload({ creditScore: 780, netIncome: 100000, loanAmount: 4000000 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.traffic_light).toBe('green');

		const ratings = assignRatings([evaluation]);
		const rating = ratings.get('test-bank-pvt');
		expect(rating?.overall).toBe('excellent');
	});
});

describe('Approval Probability', () => {
	it('GREEN gives high probability (~0.88)', () => {
		const payload = makePayload({ creditScore: 780, netIncome: 100000, loanAmount: 4000000 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.traffic_light).toBe('green');

		const prob = calculateApprovalProbability(evaluation);
		expect(prob).toBeGreaterThanOrEqual(0.7);
		expect(prob).toBeLessThanOrEqual(1.0);
	});

	it('AMBER gives moderate probability (~0.55)', () => {
		const payload = makePayload({ creditScore: 680, netIncome: 250000 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.traffic_light).toBe('amber');

		const prob = calculateApprovalProbability(evaluation);
		expect(prob).toBeGreaterThanOrEqual(0.3);
		expect(prob).toBeLessThanOrEqual(0.6);
	});

	it('RED gives low probability (~0.05)', () => {
		const payload = makePayload({ creditScore: 650, netIncome: 80000 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.traffic_light).toBe('red');

		const prob = calculateApprovalProbability(evaluation);
		expect(prob).toBeLessThanOrEqual(0.1);
	});

	it('GREY gives 0 probability', () => {
		const payload = makePayload({ loanName: 'Professional Loan' });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.traffic_light).toBe('grey');

		const prob = calculateApprovalProbability(evaluation);
		expect(prob).toBe(0);
	});
});

// ============================================================================
// GROUP 10: TRAFFIC LIGHT MESSAGES
// ============================================================================

describe('Traffic Light Messages', () => {
	it('GREEN message mentions eligibility', () => {
		const payload = makePayload({ creditScore: 780, netIncome: 80000 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		const message = buildTrafficLightMessage(evaluation);
		expect(message.toLowerCase()).toContain('eligible');
	});

	it('AMBER with deviations mentions approval needed', () => {
		const payload = makePayload({ creditScore: 680, netIncome: 250000 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		const message = buildTrafficLightMessage(evaluation);
		expect(message.toLowerCase()).toContain('deviation');
	});

	it('RED message mentions not eligible or fail reason', () => {
		const payload = makePayload({ creditScore: 650, netIncome: 80000 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		const message = buildTrafficLightMessage(evaluation);
		expect(message.toLowerCase()).toMatch(/cibil|not eligible|below/);
	});

	it('GREY message mentions cannot evaluate', () => {
		const payload = makePayload({ loanName: 'Professional Loan' });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		const message = buildTrafficLightMessage(evaluation);
		expect(message.toLowerCase()).toContain('cannot evaluate');
	});
});

// ============================================================================
// GROUP 11: FULL PIPELINE (FIXTURE PROFILES)
// ============================================================================

describe('Full Pipeline — Fixture Profiles', () => {
	it('fixture01: Salaried 80K, CIBIL 780, HL 60L -> passes gates, AMBER due to FOIR cap', () => {
		const evaluation = evaluateLender(fixture01_SalariedClean, MOCK_RULE_DOC);

		// 80K income at 55% FOIR can support ~50.9L, less than 60L requested => AMBER
		expect(evaluation.traffic_light).toBe('amber');
		expect(evaluation.all_gates_passed).toBe(true);
		expect(evaluation.assessed_income).toBe(80000);
		expect(evaluation.roi).toBe(8.5); // CIBIL 780 >= 750
		expect(evaluation.offered_amount).toBeGreaterThan(0);
		expect(evaluation.offered_amount).toBeLessThan(6000000);
		expect(evaluation.emi).toBeGreaterThan(0);
	});

	it('fixture02: Salaried 65K, CIBIL 750, PL, car loan 12K EMI -> gates pass, AMBER', () => {
		const evaluation = evaluateLender(fixture02_SalariedWithCarLoan, MOCK_RULE_DOC);

		expect(evaluation.all_gates_passed).toBe(true);
		expect(evaluation.assessed_income).toBe(65000);
		expect(evaluation.obligation_load_monthly).toBe(12000);
		expect(evaluation.roi).toBe(8.5); // CIBIL 750 >= 750
		// With 65K income, 55% FOIR cap (>50K), 12K obligations => max EMI 23.75K
		// Personal Loan 5L at 8.5% for 3 years (36 months)
		expect(evaluation.offered_amount).toBeGreaterThan(0);
	});

	it('fixture03: Self-employed CA, HL 50L -> with haircut', () => {
		const evaluation = evaluateLender(fixture03_SelfEmployedCA, MOCK_RULE_DOC);

		// Professional practice gets 20% haircut
		expect(evaluation.income_sources[0].haircut_percent).toBe(20);
		expect(evaluation.assessed_income).toBeLessThan(evaluation.income_sources[0].gross_amount);
	});
});

// ============================================================================
// GROUP 12: BUILD RESULTS (multi-lender)
// ============================================================================

describe('Build Results', () => {
	it('builds valid LenderResultsData from evaluations', () => {
		const payload = makePayload({ creditScore: 780, netIncome: 80000 });
		const eval1 = evaluateLender(payload, MOCK_RULE_DOC);
		const eval2 = evaluateLender(payload, MOCK_RULE_DOC_2);

		const results = buildResults([eval1, eval2], payload);

		// Shape validation
		expect(results.summary).toBeDefined();
		expect(results.results).toBeInstanceOf(Array);
		expect(results.results).toHaveLength(2);
		expect(results.cross_sell).toEqual([]);
		expect(results.computed_at).toBeTruthy();
	});

	it('sorts results: GREEN before AMBER before RED', () => {
		const greenPayload = makePayload({ creditScore: 780, netIncome: 100000, loanAmount: 4000000 });
		const redPayload = makePayload({ creditScore: 640, netIncome: 80000 });

		const evalGreen = evaluateLender(greenPayload, MOCK_RULE_DOC);
		const evalRed = evaluateLender(redPayload, MOCK_RULE_DOC_2);

		const results = buildResults([evalRed, evalGreen], greenPayload);

		// Green should come first
		expect(results.results[0].traffic_light).toBe('green');
	});

	it('summary counts are accurate', () => {
		const payload = makePayload({ creditScore: 780, netIncome: 80000 });
		const eval1 = evaluateLender(payload, MOCK_RULE_DOC);
		const eval2 = evaluateLender(payload, MOCK_RULE_DOC_2);

		const results = buildResults([eval1, eval2], payload);

		expect(results.summary.total_lenders).toBe(2);
		expect(
			results.summary.green_count + results.summary.amber_count + results.summary.red_count
		).toBeLessThanOrEqual(results.summary.total_lenders);
	});

	it('best_amount from non-red results', () => {
		const payload = makePayload({ creditScore: 780, netIncome: 80000 });
		const eval1 = evaluateLender(payload, MOCK_RULE_DOC);
		const eval2 = evaluateLender(payload, MOCK_RULE_DOC_2);

		const results = buildResults([eval1, eval2], payload);

		expect(results.summary.best_amount.value).toBeGreaterThan(0);
		expect(results.summary.best_amount.lender).toBeTruthy();
	});
});

// ============================================================================
// GROUP 13: OUTPUT CONTRACT
// ============================================================================

describe('Output Contract Compliance', () => {
	it('LenderResult has all required fields', () => {
		const payload = makePayload({ creditScore: 780, netIncome: 80000 });
		const eval1 = evaluateLender(payload, MOCK_RULE_DOC);
		const results = buildResults([eval1], payload);
		const result = results.results[0];

		// Required string fields
		expect(typeof result.lender_application_id).toBe('string');
		expect(typeof result.lender_name).toBe('string');
		expect(typeof result.traffic_light).toBe('string');
		expect(typeof result.traffic_light_message).toBe('string');
		expect(typeof result.computed_at).toBe('string');

		// Required number fields
		expect(typeof result.eligible_amount).toBe('number');
		expect(typeof result.offered_amount).toBe('number');
		expect(typeof result.roi).toBe('number');
		expect(typeof result.emi).toBe('number');
		expect(typeof result.tenure_months).toBe('number');

		// Rating
		expect(['excellent', 'good', 'average', 'poor']).toContain(result.rating);

		// Metric ratings
		expect(['excellent', 'good', 'average', 'poor']).toContain(result.metric_ratings.amount);
		expect(['excellent', 'good', 'average', 'poor']).toContain(result.metric_ratings.roi);
		expect(['excellent', 'good', 'average', 'poor']).toContain(result.metric_ratings.emi);
		expect(['excellent', 'good', 'average', 'poor']).toContain(result.metric_ratings.tenure);

		// Arrays
		expect(Array.isArray(result.factors)).toBe(true);
		expect(Array.isArray(result.suggestions)).toBe(true);

		// Key metrics
		expect(typeof result.key_metrics.foir).toBe('number');
		expect(typeof result.key_metrics.net_income).toBe('number');
		expect(typeof result.key_metrics.cibil).toBe('number');
		expect(typeof result.key_metrics.approval_probability).toBe('number');
		expect(result.key_metrics.approval_probability).toBeGreaterThanOrEqual(0);
		expect(result.key_metrics.approval_probability).toBeLessThanOrEqual(1);
	});

	it('traffic_light values are valid enums', () => {
		const validLights = ['green', 'amber', 'red', 'grey'];

		const payload = makePayload({ creditScore: 780, netIncome: 80000 });
		const eval1 = evaluateLender(payload, MOCK_RULE_DOC);
		const results = buildResults([eval1], payload);

		for (const result of results.results) {
			expect(validLights).toContain(result.traffic_light);
		}
	});

	it('factor categories are valid', () => {
		const validCategories = ['income', 'credit', 'property', 'obligation', 'profile', 'policy'];

		const payload = makePayload({ creditScore: 780, netIncome: 80000 });
		const eval1 = evaluateLender(payload, MOCK_RULE_DOC);
		const results = buildResults([eval1], payload);

		for (const result of results.results) {
			for (const factor of result.factors) {
				expect(validCategories).toContain(factor.category);
			}
		}
	});

	it('numeric fields are non-negative', () => {
		const payload = makePayload({ creditScore: 780, netIncome: 80000 });
		const eval1 = evaluateLender(payload, MOCK_RULE_DOC);
		const results = buildResults([eval1], payload);
		const result = results.results[0];

		expect(result.eligible_amount).toBeGreaterThanOrEqual(0);
		expect(result.offered_amount).toBeGreaterThanOrEqual(0);
		expect(result.roi).toBeGreaterThanOrEqual(0);
		expect(result.emi).toBeGreaterThanOrEqual(0);
		expect(result.tenure_months).toBeGreaterThanOrEqual(0);
	});

	it('summary has correct loan_type and requested_amount', () => {
		const payload = makePayload({ creditScore: 780, netIncome: 80000, loanAmount: 6000000 });
		const eval1 = evaluateLender(payload, MOCK_RULE_DOC);
		const results = buildResults([eval1], payload);

		expect(results.summary.loan_type).toBe('Home Loan');
		expect(results.summary.requested_amount).toBe(6000000);
	});
});

// ============================================================================
// GROUP 14: PARAMETER EXTRACTION
// ============================================================================

describe('Parameter Extraction', () => {
	it('selects ROI based on CIBIL score', () => {
		const highCibil = makePayload({ creditScore: 780 });
		const evalHigh = evaluateLender(highCibil, MOCK_RULE_DOC);
		expect(evalHigh.roi).toBe(8.5);

		const lowCibil = makePayload({ creditScore: 720 });
		const evalLow = evaluateLender(lowCibil, MOCK_RULE_DOC);
		expect(evalLow.roi).toBe(9.5);
	});

	it('selects processing fee', () => {
		const payload = makePayload({ creditScore: 780 });
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);
		expect(evaluation.processing_fee_percent).toBe(0.5);
	});

	it('computes LTV-capped amount for secured loans', () => {
		const payload = makePayload({
			creditScore: 780,
			loanAmount: 6000000,
			propertyCost: 7500000
		});
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		// LTV 75% of 75L = 56.25L
		expect(evaluation.ltv_capped_amount).toBe(5625000);
	});

	it('skips LTV for unsecured loans', () => {
		const payload = makePayload({
			loanName: 'Personal Loan',
			creditScore: 780,
			loanAmount: 500000,
			propertyCost: undefined
		});
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.ltv_capped_amount).toBeUndefined();
		expect(evaluation.ltv).toBeUndefined();
	});
});

// ============================================================================
// P9 — Minimum loan amount floor by loan type
// ============================================================================

import { getMinimumLoanAmount } from '$lib/ruleEngine/systemConfig';

describe('P9 — minimum loan amount by loan type', () => {
	it('Business and Professional Loans floor at ₹5L', () => {
		expect(getMinimumLoanAmount('Business Loan')).toBe(500_000);
		expect(getMinimumLoanAmount('Professional Loan')).toBe(500_000);
	});

	it('Personal Loan floors at ₹2L', () => {
		expect(getMinimumLoanAmount('Personal Loan')).toBe(200_000);
	});

	it('Home / LAP / Plot floor at ₹10L', () => {
		expect(getMinimumLoanAmount('Home Loan')).toBe(1_000_000);
		expect(getMinimumLoanAmount('Loan Against Property')).toBe(1_000_000);
		expect(getMinimumLoanAmount('Plot and Construction Loan')).toBe(1_000_000);
	});

	it('unknown loan type → 0 (floor is a no-op, never a false RED)', () => {
		expect(getMinimumLoanAmount('Gold Loan')).toBe(0);
	});
});

describe('P9 — below-floor eligibility flags RED', () => {
	it('Personal Loan with tiny positive eligibility → RED with floor message', () => {
		// ~₹3K income → ~₹1.5K max EMI → eligible ≈ ₹1.7L, which is > 0 but below
		// the ₹2L Personal Loan minimum. Gates still pass (good CIBIL), so this
		// exercises the floor specifically, not a gate failure.
		const payload = makePayload({
			loanName: 'Personal Loan',
			creditScore: 780,
			netIncome: 3000,
			loanAmount: 1000000
		});
		const evaluation = evaluateLender(payload, MOCK_RULE_DOC);

		expect(evaluation.offered_amount).toBeGreaterThan(0);
		expect(evaluation.offered_amount).toBeLessThan(200_000);
		expect(evaluation.traffic_light).toBe('red');
		expect(evaluation.traffic_light_message.toLowerCase()).toContain('minimum');
	});
});
