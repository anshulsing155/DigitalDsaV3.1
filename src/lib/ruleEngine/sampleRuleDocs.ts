/**
 * RE-4.2: Sample Lender Rule Documents
 *
 * Three realistic ParsedLenderRuleDocument objects for integration testing.
 * Each models a different lender class (PVT, GOV, NBFC) with differentiated
 * policies so the 15 fixture profiles produce diverse traffic light outcomes.
 *
 * These are seeded into LenderRuleArtifacts with status:'active' so
 * loadActiveRuleDocuments() picks them up for evaluation.
 */

import type {
	ParsedLenderRuleDocument,
	ParsedRule,
	ParsedIncomeRule,
	ParsedObligationRule,
	ParsedDeviation,
	ParsedPolicy
} from './types.js';
import { LenderRuleArtifacts } from '$lib/database/mongo.js';

// ============================================================================
// SHARED HELPERS
// ============================================================================

const INDIVIDUAL_ONLY: Record<string, unknown> = {
	'==': [{ var: 'allApplicantDetails.0.applicantType' }, 'Individual']
};

function makeObligationRules(): ParsedObligationRule[] {
	return [
		{
			rule_id: '', // set per lender
			obligation_type: 'term_loan',
			treatment: {
				count_factor: 1.0,
				ignore_if_closing: true
			},
			confidence: 0.95,
			source_excerpt: 'Term loans at 100%, ignore if closing'
		},
		{
			rule_id: '', // set per lender
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
	];
}

// ============================================================================
// LENDER 1: SAMPLE PVT BANK (HDFC-like Private Bank)
// ============================================================================

export const SAMPLE_PVT_BANK: ParsedLenderRuleDocument = {
	lender_id: 'sample-pvt-bank',
	lender_name: 'Sample PVT Bank',
	classification: 'PVT',
	loan_types: ['Home Loan', 'Loan Against Property'],

	sections: {
		eligibility: [
			{
				rule_id: 'pvt-elig-age',
				description: 'Applicant age must be 23-58 (individuals only)',
				tier: 'hard_gate',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.age' }, 23] },
						{ '<=': [{ var: 'allApplicantDetails.0.age' }, 58] }
					]
				},
				applies_when: INDIVIDUAL_ONLY,
				fail_message: 'Primary applicant age must be 23-58 years',
				fail_category: 'age_limit',
				confidence: 0.95,
				source_excerpt: 'Age: 23-58 years (individuals)'
			}
		],
		cibil: [
			{
				rule_id: 'pvt-cibil-min',
				description: 'Minimum CIBIL score 700',
				tier: 'hard_gate',
				logic: {
					'>=': [{ var: 'allApplicantDetails.0.creditScore' }, 700]
				},
				fail_message: 'CIBIL score must be 700 or above',
				fail_category: 'cibil_threshold',
				confidence: 0.95,
				source_excerpt: 'Min CIBIL: 700'
			}
		],
		foir: [
			{
				rule_id: 'pvt-foir-high',
				description: 'FOIR cap 60% for income above 1L',
				tier: 'computed',
				logic: {
					if: [{ '>': [{ var: '_computed._total_gross_monthly' }, 100000] }, 0.6, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 60% for income > 1L'
			},
			{
				rule_id: 'pvt-foir-mid',
				description: 'FOIR cap 55% for income 50K-1L',
				tier: 'computed',
				logic: {
					if: [
						{
							and: [
								{ '>=': [{ var: '_computed._total_gross_monthly' }, 50000] },
								{ '<=': [{ var: '_computed._total_gross_monthly' }, 100000] }
							]
						},
						0.55,
						null
					]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 55% for income 50K-1L'
			},
			{
				rule_id: 'pvt-foir-low',
				description: 'FOIR cap 50% for income below 50K',
				tier: 'computed',
				logic: {
					if: [{ '<': [{ var: '_computed._total_gross_monthly' }, 50000] }, 0.5, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 50% for income < 50K'
			}
		],
		income_assessment: [
			{
				rule_id: 'pvt-inc-salaried',
				income_profile_type: 'salaried_regular',
				accepted: true,
				haircut_percent: 0,
				computation_method: 'net_salary',
				confidence: 0.95,
				source_excerpt: 'Salaried: 100% of net salary'
			},
			{
				rule_id: 'pvt-inc-govt',
				income_profile_type: 'salaried_government',
				accepted: true,
				haircut_percent: 0,
				computation_method: 'net_salary',
				confidence: 0.95,
				source_excerpt: 'Government salaried: 100% of net salary'
			},
			{
				rule_id: 'pvt-inc-professional',
				income_profile_type: 'professional_practice',
				accepted: true,
				haircut_percent: 15,
				computation_method: 'avg_net_profit',
				confidence: 0.9,
				source_excerpt: 'Professional: 85% of avg net profit'
			},
			{
				rule_id: 'pvt-inc-business',
				income_profile_type: 'business_proprietorship',
				accepted: true,
				haircut_percent: 25,
				computation_method: 'avg_net_profit',
				confidence: 0.85,
				source_excerpt: 'Business: 75% of avg net profit'
			},
			{
				rule_id: 'pvt-inc-pension',
				income_profile_type: 'pension',
				accepted: true,
				haircut_percent: 0,
				computation_method: 'pension_amount',
				confidence: 0.95,
				source_excerpt: 'Pension: 100% of pension'
			},
			{
				rule_id: 'pvt-inc-rental',
				income_profile_type: 'rental_income',
				accepted: true,
				haircut_percent: 30,
				max_contribution_percent: 50,
				computation_method: 'rent_amount',
				confidence: 0.85,
				source_excerpt: 'Rental: 70% of rent, max 50% of total'
			},
			{
				rule_id: 'pvt-inc-unemployed',
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
				rule_id: 'pvt-ltv-low',
				description: 'LTV 90% for loans under 30L',
				tier: 'parameter',
				logic: { '<': [{ var: 'loanTransaction.loanAmount' }, 3000000] },
				parameter_key: 'max_ltv',
				parameter_value: 90,
				confidence: 0.9,
				source_excerpt: 'LTV: 90% for < 30L (PMAY eligible)'
			},
			{
				rule_id: 'pvt-ltv-mid',
				description: 'LTV 80% for loans 30L-75L',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'loanTransaction.loanAmount' }, 3000000] },
						{ '<=': [{ var: 'loanTransaction.loanAmount' }, 7500000] }
					]
				},
				parameter_key: 'max_ltv',
				parameter_value: 80,
				confidence: 0.9,
				source_excerpt: 'LTV: 80% for 30L-75L'
			},
			{
				rule_id: 'pvt-ltv-high',
				description: 'LTV 75% for loans above 75L',
				tier: 'parameter',
				logic: { '>': [{ var: 'loanTransaction.loanAmount' }, 7500000] },
				parameter_key: 'max_ltv',
				parameter_value: 75,
				confidence: 0.9,
				source_excerpt: 'LTV: 75% for > 75L'
			},
			{
				rule_id: 'pvt-max-lcr',
				description: 'Maximum LCR 90% (Loan to Registry Value)',
				tier: 'parameter' as const,
				logic: { '!!': [true] },
				parameter_key: 'max_lcr',
				parameter_value: 90,
				confidence: 0.85,
				source_excerpt: 'LCR up to 90%'
			}
		],
		obligation_treatment: (() => {
			const rules = makeObligationRules();
			rules[0].rule_id = 'pvt-obl-term';
			rules[1].rule_id = 'pvt-obl-credit';
			return rules;
		})(),
		property: null,
		transaction: null,
		tenure: [
			{
				rule_id: 'pvt-tenure-max',
				description: 'Max tenure 30 years',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_tenure_months',
				parameter_value: 360,
				confidence: 0.95,
				source_excerpt: 'Max tenure: 30 years'
			},
			{
				rule_id: 'pvt-age-maturity',
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
				rule_id: 'pvt-roi-premium',
				description: 'ROI 8.35% for CIBIL 780+',
				tier: 'parameter',
				logic: { '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 780] },
				parameter_key: 'roi',
				parameter_value: 8.35,
				confidence: 0.9,
				source_excerpt: 'ROI: 8.35% for CIBIL 780+'
			},
			{
				rule_id: 'pvt-roi-standard',
				description: 'ROI 8.65% for CIBIL 750-779',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 750] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 780] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 8.65,
				confidence: 0.85,
				source_excerpt: 'ROI: 8.65% for CIBIL 750-779'
			},
			{
				rule_id: 'pvt-roi-base',
				description: 'ROI 9.15% for CIBIL 700-749',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 750] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 9.15,
				confidence: 0.85,
				source_excerpt: 'ROI: 9.15% for CIBIL 700-749'
			},
			{
				rule_id: 'pvt-roi-fallback',
				description: 'ROI 10.0% fallback for CIBIL below 700',
				tier: 'parameter',
				logic: { '<': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
				parameter_key: 'roi',
				parameter_value: 10.0,
				confidence: 0.8,
				source_excerpt: 'ROI: 10.0% for CIBIL < 700 (if gate passes via deviation)'
			}
		],
		fees: [
			{
				rule_id: 'pvt-fee-processing',
				description: 'Processing fee 0.35%',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'processing_fee_percent',
				parameter_value: 0.35,
				confidence: 0.9,
				source_excerpt: 'Processing: 0.35%'
			}
		],
		disbursement: null,
		documentation: null,
		nri: [
			{
				rule_id: 'pvt-nri-gpa',
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
			deviation_id: 'pvt-dev-cibil',
			description: 'CIBIL relaxed to 650 for income above 2L',
			deviates_from: 'pvt-cibil-min',
			condition: {
				and: [
					{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 650] },
					{ '>': [{ var: '_computed._total_gross_monthly' }, 200000] }
				]
			},
			approval_authority: 'branch_manager',
			max_deviation: 'CIBIL 650-699',
			probability_modifier: -0.1,
			confidence: 0.8,
			source_excerpt: 'Deviation: CIBIL relax to 650 for income > 2L'
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
			value: '7-10 working days',
			display_on_offer_card: true,
			category: 'service'
		},
		{
			policy_key: 'roi_type',
			label: 'Interest Rate Type',
			value: 'Floating',
			display_on_offer_card: true,
			category: 'roi_structure'
		},
		{
			policy_key: 'processing_fee_percent',
			label: 'Processing Fee',
			value: 0.35,
			display_on_offer_card: true,
			category: 'processing_fee'
		},
		{
			policy_key: 'nri_gpa_eligible_relationships',
			label: 'Eligible GPA Relationships',
			value: ['Parents', 'Spouse', 'Siblings', 'Children'],
			display_on_offer_card: true,
			category: 'nri'
		}
	]
};

// ============================================================================
// LENDER 2: SAMPLE GOV BANK (SBI-like Government Bank)
// ============================================================================

export const SAMPLE_GOV_BANK: ParsedLenderRuleDocument = {
	lender_id: 'sample-gov-bank',
	lender_name: 'Sample GOV Bank',
	classification: 'GOV',
	loan_types: ['Home Loan', 'Loan Against Property', 'Business Loan'],

	sections: {
		eligibility: [
			{
				rule_id: 'gov-elig-age',
				description: 'Applicant age must be 21-60 (individuals only)',
				tier: 'hard_gate',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.age' }, 21] },
						{ '<=': [{ var: 'allApplicantDetails.0.age' }, 60] }
					]
				},
				applies_when: INDIVIDUAL_ONLY,
				fail_message: 'Primary applicant age must be 21-60 years',
				fail_category: 'age_limit',
				confidence: 0.95,
				source_excerpt: 'Age: 21-60 years (individuals)'
			}
		],
		cibil: [
			{
				rule_id: 'gov-cibil-min',
				description: 'Minimum CIBIL score 650',
				tier: 'hard_gate',
				logic: {
					'>=': [{ var: 'allApplicantDetails.0.creditScore' }, 650]
				},
				fail_message: 'CIBIL score must be 650 or above',
				fail_category: 'cibil_threshold',
				confidence: 0.95,
				source_excerpt: 'Min CIBIL: 650'
			}
		],
		foir: [
			{
				rule_id: 'gov-foir-flat',
				description: 'FOIR cap 55% flat',
				tier: 'computed',
				logic: {
					if: [true, 0.55, null]
				},
				confidence: 0.95,
				source_excerpt: 'FOIR: 55% flat'
			}
		],
		income_assessment: [
			{
				rule_id: 'gov-inc-salaried',
				income_profile_type: 'salaried_regular',
				accepted: true,
				haircut_percent: 0,
				computation_method: 'net_salary',
				confidence: 0.95,
				source_excerpt: 'Salaried: 100% of net salary'
			},
			{
				rule_id: 'gov-inc-govt',
				income_profile_type: 'salaried_government',
				accepted: true,
				haircut_percent: 0,
				computation_method: 'net_salary',
				confidence: 0.95,
				source_excerpt: 'Government salaried: 100% of net salary'
			},
			{
				rule_id: 'gov-inc-professional',
				income_profile_type: 'professional_practice',
				accepted: true,
				haircut_percent: 20,
				computation_method: 'avg_net_profit',
				confidence: 0.9,
				source_excerpt: 'Professional: 80% of avg net profit'
			},
			{
				rule_id: 'gov-inc-business',
				income_profile_type: 'business_proprietorship',
				accepted: true,
				haircut_percent: 30,
				computation_method: 'avg_net_profit',
				confidence: 0.85,
				source_excerpt: 'Business: 70% of avg net profit'
			},
			{
				rule_id: 'gov-inc-pension',
				income_profile_type: 'pension',
				accepted: true,
				haircut_percent: 0,
				computation_method: 'pension_amount',
				confidence: 0.95,
				source_excerpt: 'Pension: 100% of pension'
			},
			{
				rule_id: 'gov-inc-rental',
				income_profile_type: 'rental_income',
				accepted: true,
				haircut_percent: 40,
				max_contribution_percent: 40,
				computation_method: 'rent_amount',
				confidence: 0.85,
				source_excerpt: 'Rental: 60% of rent, max 40% of total'
			},
			{
				rule_id: 'gov-inc-unemployed',
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
				rule_id: 'gov-ltv-low',
				description: 'LTV 80% for loans under 30L',
				tier: 'parameter',
				logic: { '<': [{ var: 'loanTransaction.loanAmount' }, 3000000] },
				parameter_key: 'max_ltv',
				parameter_value: 80,
				confidence: 0.9,
				source_excerpt: 'LTV: 80% for < 30L'
			},
			{
				rule_id: 'gov-ltv-mid',
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
			},
			{
				rule_id: 'gov-ltv-high',
				description: 'LTV 70% for loans above 75L',
				tier: 'parameter',
				logic: { '>': [{ var: 'loanTransaction.loanAmount' }, 7500000] },
				parameter_key: 'max_ltv',
				parameter_value: 70,
				confidence: 0.9,
				source_excerpt: 'LTV: 70% for > 75L'
			},
			{
				rule_id: 'gov-max-lcr',
				description: 'Maximum LCR 90% (Loan to Registry Value)',
				tier: 'parameter' as const,
				logic: { '!!': [true] },
				parameter_key: 'max_lcr',
				parameter_value: 90,
				confidence: 0.85,
				source_excerpt: 'LCR up to 90%'
			}
		],
		obligation_treatment: (() => {
			const rules = makeObligationRules();
			rules[0].rule_id = 'gov-obl-term';
			rules[1].rule_id = 'gov-obl-credit';
			return rules;
		})(),
		property: null,
		transaction: null,
		tenure: [
			{
				rule_id: 'gov-tenure-max',
				description: 'Max tenure 30 years',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_tenure_months',
				parameter_value: 360,
				confidence: 0.95,
				source_excerpt: 'Max tenure: 30 years'
			},
			{
				rule_id: 'gov-age-maturity',
				description: 'Max age at maturity 70',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_age_at_maturity',
				parameter_value: 70,
				confidence: 0.95,
				source_excerpt: 'Age at maturity: max 70 years'
			}
		],
		roi: [
			{
				rule_id: 'gov-roi-flat',
				description: 'ROI 8.25% flat',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'roi',
				parameter_value: 8.25,
				confidence: 0.95,
				source_excerpt: 'ROI: 8.25% flat for all profiles'
			}
		],
		fees: [
			{
				rule_id: 'gov-fee-processing',
				description: 'Processing fee 0.25%',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'processing_fee_percent',
				parameter_value: 0.25,
				confidence: 0.9,
				source_excerpt: 'Processing: 0.25%'
			}
		],
		disbursement: null,
		documentation: null,
		nri: [
			{
				rule_id: 'gov-nri-gpa',
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
		company: [
			{
				rule_id: 'gov-company-age',
				description: 'Company must be at least 2 years old',
				tier: 'hard_gate',
				logic: { '>=': [{ var: 'allApplicantDetails.0.age' }, 2] },
				applies_when: { '==': [{ var: 'allApplicantDetails.0.applicantType' }, 'Company'] },
				fail_message: 'Company must have minimum 2 years of operations',
				fail_category: 'company_vintage',
				confidence: 0.85,
				source_excerpt: 'Company vintage: min 2 years'
			}
		],
		balance_transfer: null,
		top_up: null
	},

	deviations: [
		{
			deviation_id: 'gov-dev-cibil',
			description: 'CIBIL relaxed to 600 for income above 1.5L',
			deviates_from: 'gov-cibil-min',
			condition: {
				and: [
					{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 600] },
					{ '>': [{ var: '_computed._total_gross_monthly' }, 150000] }
				]
			},
			approval_authority: 'branch_manager',
			max_deviation: 'CIBIL 600-649',
			probability_modifier: -0.15,
			confidence: 0.8,
			source_excerpt: 'Deviation: CIBIL relax to 600 for income > 1.5L'
		}
	],

	policies: [
		{
			policy_key: 'max_age',
			label: 'Maximum Age at Maturity',
			value: 70,
			display_on_offer_card: false,
			category: 'eligibility'
		},
		{
			policy_key: 'turnaround_days',
			label: 'Expected Turnaround',
			value: '15-20 working days',
			display_on_offer_card: true,
			category: 'service'
		},
		{
			policy_key: 'roi_type',
			label: 'Interest Rate Type',
			value: 'Floating',
			display_on_offer_card: true,
			category: 'roi_structure'
		},
		{
			policy_key: 'processing_fee_percent',
			label: 'Processing Fee',
			value: 0.25,
			display_on_offer_card: true,
			category: 'processing_fee'
		},
		{
			policy_key: 'nri_gpa_eligible_relationships',
			label: 'Eligible GPA Relationships',
			value: ['Parents', 'Spouse', 'Siblings', 'Children', 'In-Laws'],
			display_on_offer_card: true,
			category: 'nri'
		}
	]
};

// ============================================================================
// LENDER 3: SAMPLE NBFC (Bajaj-like Non-Banking Finance Company)
// ============================================================================

export const SAMPLE_NBFC: ParsedLenderRuleDocument = {
	lender_id: 'sample-nbfc',
	lender_name: 'Sample NBFC',
	classification: 'NBFC',
	loan_types: ['Home Loan', 'Business Loan'],

	sections: {
		eligibility: [
			{
				rule_id: 'nbfc-elig-age',
				description: 'Applicant age must be 21-65 (individuals only)',
				tier: 'hard_gate',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.age' }, 21] },
						{ '<=': [{ var: 'allApplicantDetails.0.age' }, 65] }
					]
				},
				applies_when: INDIVIDUAL_ONLY,
				fail_message: 'Primary applicant age must be 21-65 years',
				fail_category: 'age_limit',
				confidence: 0.95,
				source_excerpt: 'Age: 21-65 years (individuals)'
			}
		],
		cibil: [
			{
				rule_id: 'nbfc-cibil-min',
				description: 'Minimum CIBIL score 625',
				tier: 'hard_gate',
				logic: {
					'>=': [{ var: 'allApplicantDetails.0.creditScore' }, 625]
				},
				fail_message: 'CIBIL score must be 625 or above',
				fail_category: 'cibil_threshold',
				confidence: 0.95,
				source_excerpt: 'Min CIBIL: 625'
			}
		],
		foir: [
			{
				rule_id: 'nbfc-foir-high',
				description: 'FOIR cap 65% for income above 2L',
				tier: 'computed',
				logic: {
					if: [{ '>': [{ var: '_computed._total_gross_monthly' }, 200000] }, 0.65, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 65% for income > 2L'
			},
			{
				rule_id: 'nbfc-foir-mid',
				description: 'FOIR cap 60% for income 75K-2L',
				tier: 'computed',
				logic: {
					if: [
						{
							and: [
								{ '>=': [{ var: '_computed._total_gross_monthly' }, 75000] },
								{ '<=': [{ var: '_computed._total_gross_monthly' }, 200000] }
							]
						},
						0.6,
						null
					]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 60% for income 75K-2L'
			},
			{
				rule_id: 'nbfc-foir-low',
				description: 'FOIR cap 55% for income below 75K',
				tier: 'computed',
				logic: {
					if: [{ '<': [{ var: '_computed._total_gross_monthly' }, 75000] }, 0.55, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 55% for income < 75K'
			}
		],
		income_assessment: [
			{
				rule_id: 'nbfc-inc-salaried',
				income_profile_type: 'salaried_regular',
				accepted: true,
				haircut_percent: 0,
				computation_method: 'net_salary',
				confidence: 0.95,
				source_excerpt: 'Salaried: 100% of net salary'
			},
			{
				rule_id: 'nbfc-inc-govt',
				income_profile_type: 'salaried_government',
				accepted: true,
				haircut_percent: 0,
				computation_method: 'net_salary',
				confidence: 0.95,
				source_excerpt: 'Government salaried: 100% of net salary'
			},
			{
				rule_id: 'nbfc-inc-professional',
				income_profile_type: 'professional_practice',
				accepted: true,
				haircut_percent: 10,
				computation_method: 'avg_net_profit',
				confidence: 0.9,
				source_excerpt: 'Professional: 90% of avg net profit'
			},
			{
				rule_id: 'nbfc-inc-business',
				income_profile_type: 'business_proprietorship',
				accepted: true,
				haircut_percent: 20,
				computation_method: 'avg_net_profit',
				confidence: 0.85,
				source_excerpt: 'Business: 80% of avg net profit'
			},
			{
				rule_id: 'nbfc-inc-pension',
				income_profile_type: 'pension',
				accepted: true,
				haircut_percent: 5,
				computation_method: 'pension_amount',
				confidence: 0.9,
				source_excerpt: 'Pension: 95% of pension'
			},
			{
				rule_id: 'nbfc-inc-rental',
				income_profile_type: 'rental_income',
				accepted: true,
				haircut_percent: 25,
				max_contribution_percent: 40,
				computation_method: 'rent_amount',
				confidence: 0.85,
				source_excerpt: 'Rental: 75% of rent, max 40% of total'
			},
			{
				rule_id: 'nbfc-inc-unemployed',
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
				rule_id: 'nbfc-ltv-low',
				description: 'LTV 80% for loans under 50L',
				tier: 'parameter',
				logic: { '<': [{ var: 'loanTransaction.loanAmount' }, 5000000] },
				parameter_key: 'max_ltv',
				parameter_value: 80,
				confidence: 0.9,
				source_excerpt: 'LTV: 80% for < 50L'
			},
			{
				rule_id: 'nbfc-ltv-high',
				description: 'LTV 70% for loans 50L+',
				tier: 'parameter',
				logic: { '>=': [{ var: 'loanTransaction.loanAmount' }, 5000000] },
				parameter_key: 'max_ltv',
				parameter_value: 70,
				confidence: 0.9,
				source_excerpt: 'LTV: 70% for >= 50L'
			},
			{
				rule_id: 'nbfc-max-lcr',
				description: 'Maximum LCR 85% (Loan to Registry Value)',
				tier: 'parameter' as const,
				logic: { '!!': [true] },
				parameter_key: 'max_lcr',
				parameter_value: 85,
				confidence: 0.85,
				source_excerpt: 'LCR up to 85%'
			}
		],
		obligation_treatment: (() => {
			const rules = makeObligationRules();
			rules[0].rule_id = 'nbfc-obl-term';
			rules[1].rule_id = 'nbfc-obl-credit';
			return rules;
		})(),
		property: null,
		transaction: null,
		tenure: [
			{
				rule_id: 'nbfc-tenure-max',
				description: 'Max tenure 25 years',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_tenure_months',
				parameter_value: 300,
				confidence: 0.95,
				source_excerpt: 'Max tenure: 25 years'
			},
			{
				rule_id: 'nbfc-age-maturity',
				description: 'Max age at maturity 70',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_age_at_maturity',
				parameter_value: 70,
				confidence: 0.95,
				source_excerpt: 'Age at maturity: max 70 years'
			}
		],
		roi: [
			{
				rule_id: 'nbfc-roi-premium',
				description: 'ROI 9.5% for CIBIL 750+',
				tier: 'parameter',
				logic: { '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 750] },
				parameter_key: 'roi',
				parameter_value: 9.5,
				confidence: 0.9,
				source_excerpt: 'ROI: 9.5% for CIBIL 750+'
			},
			{
				rule_id: 'nbfc-roi-standard',
				description: 'ROI 10.5% for CIBIL 700-749',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 750] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 10.5,
				confidence: 0.85,
				source_excerpt: 'ROI: 10.5% for CIBIL 700-749'
			},
			{
				rule_id: 'nbfc-roi-base',
				description: 'ROI 11.5% for CIBIL 625-699',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 625] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 700] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 11.5,
				confidence: 0.85,
				source_excerpt: 'ROI: 11.5% for CIBIL 625-699'
			},
			{
				rule_id: 'nbfc-roi-fallback',
				description: 'ROI 13.0% fallback for CIBIL below 625',
				tier: 'parameter',
				logic: { '<': [{ var: 'allApplicantDetails.0.creditScore' }, 625] },
				parameter_key: 'roi',
				parameter_value: 13.0,
				confidence: 0.8,
				source_excerpt: 'ROI: 13.0% for CIBIL < 625 (if gate passes via deviation)'
			}
		],
		fees: [
			{
				rule_id: 'nbfc-fee-processing',
				description: 'Processing fee 1.0%',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'processing_fee_percent',
				parameter_value: 1.0,
				confidence: 0.9,
				source_excerpt: 'Processing: 1.0%'
			}
		],
		disbursement: null,
		documentation: null,
		nri: [
			{
				rule_id: 'nbfc-nri-gpa',
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
		company: [
			{
				rule_id: 'nbfc-company-age',
				description: 'Company must be at least 3 years old',
				tier: 'hard_gate',
				logic: { '>=': [{ var: 'allApplicantDetails.0.age' }, 3] },
				applies_when: { '==': [{ var: 'allApplicantDetails.0.applicantType' }, 'Company'] },
				fail_message: 'Company must have minimum 3 years of operations',
				fail_category: 'company_vintage',
				confidence: 0.85,
				source_excerpt: 'Company vintage: min 3 years'
			}
		],
		balance_transfer: null,
		top_up: null
	},

	deviations: [
		{
			deviation_id: 'nbfc-dev-cibil',
			description: 'CIBIL relaxed to 580 for income above 3L',
			deviates_from: 'nbfc-cibil-min',
			condition: {
				and: [
					{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 580] },
					{ '>': [{ var: '_computed._total_gross_monthly' }, 300000] }
				]
			},
			approval_authority: 'md_approval',
			max_deviation: 'CIBIL 580-624',
			probability_modifier: -0.2,
			confidence: 0.75,
			source_excerpt: 'Deviation: CIBIL relax to 580 for income > 3L (MD approval)'
		}
	],

	policies: [
		{
			policy_key: 'max_age',
			label: 'Maximum Age at Maturity',
			value: 70,
			display_on_offer_card: false,
			category: 'eligibility'
		},
		{
			policy_key: 'turnaround_days',
			label: 'Expected Turnaround',
			value: '5-7 working days',
			display_on_offer_card: true,
			category: 'service'
		},
		{
			policy_key: 'roi_type',
			label: 'Interest Rate Type',
			value: 'Floating',
			display_on_offer_card: true,
			category: 'roi_structure'
		},
		{
			policy_key: 'processing_fee_percent',
			label: 'Processing Fee',
			value: 1.0,
			display_on_offer_card: true,
			category: 'processing_fee'
		},
		{
			policy_key: 'nri_gpa_eligible_relationships',
			label: 'Eligible GPA Relationships',
			value: ['Parents', 'Spouse'],
			display_on_offer_card: true,
			category: 'nri'
		}
	]
};

// ============================================================================
// ALL SAMPLE DOCUMENTS
// ============================================================================

export const ALL_SAMPLE_RULE_DOCS: ParsedLenderRuleDocument[] = [
	SAMPLE_PVT_BANK,
	SAMPLE_GOV_BANK,
	SAMPLE_NBFC
];

// ============================================================================
// SEED FUNCTION
// ============================================================================

export async function seedSampleRuleDocuments(): Promise<{ inserted: number; skipped: number }> {
	const artifacts = [
		{
			artifact_id: 'sample-pvt-bank-hl-v1',
			lender_id: 'sample-pvt-bank',
			lender_name: 'Sample PVT Bank',
			classification: 'PVT' as const,
			loan_types: SAMPLE_PVT_BANK.loan_types,
			json_logic: SAMPLE_PVT_BANK as unknown as Record<string, unknown>,
			human_readable:
				'Sample private bank rules for Home Loan and LAP. CIBIL 700+, age 23-58, 3-tier FOIR, 3-tier ROI by CIBIL.'
		},
		{
			artifact_id: 'sample-gov-bank-hl-v1',
			lender_id: 'sample-gov-bank',
			lender_name: 'Sample GOV Bank',
			classification: 'GOV' as const,
			loan_types: SAMPLE_GOV_BANK.loan_types,
			json_logic: SAMPLE_GOV_BANK as unknown as Record<string, unknown>,
			human_readable:
				'Sample government bank rules for Home Loan, LAP and Business Loan. CIBIL 650+, age 21-60, flat 55% FOIR, flat 8.25% ROI.'
		},
		{
			artifact_id: 'sample-nbfc-hl-v1',
			lender_id: 'sample-nbfc',
			lender_name: 'Sample NBFC',
			classification: 'NBFC' as const,
			loan_types: SAMPLE_NBFC.loan_types,
			json_logic: SAMPLE_NBFC as unknown as Record<string, unknown>,
			human_readable:
				'Sample NBFC rules for Home Loan and Business Loan. CIBIL 625+, age 21-65, 3-tier FOIR, 3-tier ROI, higher fees.'
		}
	];

	let inserted = 0;
	let skipped = 0;
	const now = new Date();

	for (const art of artifacts) {
		const result = await LenderRuleArtifacts.updateOne(
			{ artifact_id: art.artifact_id },
			{
				$setOnInsert: {
					artifact_id: art.artifact_id,
					lender_id: art.lender_id,
					lender_name: art.lender_name,
					classification: art.classification,
					loan_types: art.loan_types,
					version: 1,
					status: 'active',
					json_logic: art.json_logic,
					human_readable: art.human_readable,
					confidence_scores: null,
					parse_iterations: [],
					rm_review: { queries: [] },
					source_document_urls: [],
					parsed_by: 'system:sample-seed',
					created_at: now,
					activated_at: now,
					updated_at: now
				}
			},
			{ upsert: true }
		);

		if (result.upsertedCount > 0) {
			inserted++;
		} else {
			skipped++;
		}
	}

	return { inserted, skipped };
}
