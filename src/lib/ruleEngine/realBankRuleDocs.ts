/**
 * RE-4.3: Real Indian Bank Rule Documents
 *
 * Seven realistic ParsedLenderRuleDocument objects modelling actual Indian lender
 * policies for Home Loan, LAP, and Business Loan products.
 *
 * Banks covered:
 *   1. HDFC Bank        (PVT)  — India's largest private-sector housing lender
 *   2. ICICI Bank       (PVT)  — Second-largest private-sector bank
 *   3. Axis Bank        (PVT)  — Third-largest private-sector bank
 *   4. SBI              (GOV)  — India's largest public-sector bank
 *   5. Bajaj Housing    (NBFC) — NBFC with widest age/tenure allowance
 *   6. Tata Capital     (NBFC) — NBFC with balanced risk appetite
 *   7. LIC Housing Fin  (NBFC) — Housing finance company, conservative LTV
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

function makeObligationRules(prefix: string): ParsedObligationRule[] {
	return [
		{
			rule_id: `${prefix}-obl-term`,
			obligation_type: 'term_loan',
			treatment: {
				count_factor: 1.0,
				ignore_if_closing: true
			},
			confidence: 0.95,
			source_excerpt: 'Term loans at 100%, ignore if closing'
		},
		{
			rule_id: `${prefix}-obl-credit`,
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

function makeNriGate(prefix: string): ParsedRule {
	return {
		rule_id: `${prefix}-nri-gpa`,
		description: 'NRI applicants require GPA details',
		tier: 'hard_gate',
		logic: { '!!': [{ var: 'allApplicantDetails.0.gpaDetails' }] },
		applies_when: { '==': [{ var: 'allApplicantDetails.0.isNRI' }, true] },
		fail_message: 'NRI applicants must provide GPA details',
		fail_category: 'nri_requirement',
		confidence: 0.85,
		source_excerpt: 'NRI: GPA required'
	};
}

function makeCompanyGate(prefix: string, minYears: number): ParsedRule {
	return {
		rule_id: `${prefix}-company-vintage`,
		description: `Company must be at least ${minYears} years old`,
		tier: 'hard_gate',
		logic: { '>=': [{ var: 'allApplicantDetails.0.age' }, minYears] },
		applies_when: { '==': [{ var: 'allApplicantDetails.0.applicantType' }, 'Company'] },
		fail_message: `Company must have minimum ${minYears} years of operations`,
		fail_category: 'company_vintage',
		confidence: 0.85,
		source_excerpt: `Company vintage: min ${minYears} years`
	};
}

function makeStandardIncomeRules(
	prefix: string,
	opts: {
		professionalHaircut: number;
		businessHaircut: number;
		pensionHaircut: number;
		rentalHaircut: number;
		rentalMaxContrib: number;
	}
): ParsedIncomeRule[] {
	return [
		{
			rule_id: `${prefix}-inc-salaried`,
			income_profile_type: 'salaried_regular',
			accepted: true,
			haircut_percent: 0,
			computation_method: 'net_salary',
			confidence: 0.95,
			source_excerpt: 'Salaried: 100% of net salary'
		},
		{
			rule_id: `${prefix}-inc-govt`,
			income_profile_type: 'salaried_government',
			accepted: true,
			haircut_percent: 0,
			computation_method: 'net_salary',
			confidence: 0.95,
			source_excerpt: 'Government salaried: 100% of net salary'
		},
		{
			rule_id: `${prefix}-inc-professional`,
			income_profile_type: 'professional_practice',
			accepted: true,
			haircut_percent: opts.professionalHaircut,
			computation_method: 'avg_net_profit',
			confidence: 0.9,
			source_excerpt: `Professional: ${100 - opts.professionalHaircut}% of avg net profit`
		},
		{
			rule_id: `${prefix}-inc-business`,
			income_profile_type: 'business_proprietorship',
			accepted: true,
			haircut_percent: opts.businessHaircut,
			computation_method: 'avg_net_profit',
			confidence: 0.85,
			source_excerpt: `Business: ${100 - opts.businessHaircut}% of avg net profit`
		},
		{
			rule_id: `${prefix}-inc-pension`,
			income_profile_type: 'pension',
			accepted: true,
			haircut_percent: opts.pensionHaircut,
			computation_method: 'pension_amount',
			confidence: 0.95,
			source_excerpt: `Pension: ${100 - opts.pensionHaircut}% of pension`
		},
		{
			rule_id: `${prefix}-inc-rental`,
			income_profile_type: 'rental_income',
			accepted: true,
			haircut_percent: opts.rentalHaircut,
			max_contribution_percent: opts.rentalMaxContrib,
			computation_method: 'rent_amount',
			confidence: 0.85,
			source_excerpt: `Rental: ${100 - opts.rentalHaircut}% of rent, max ${opts.rentalMaxContrib}% of total`
		},
		{
			rule_id: `${prefix}-inc-unemployed`,
			income_profile_type: 'no_current_income',
			accepted: false,
			haircut_percent: 100,
			computation_method: 'none',
			confidence: 0.95,
			source_excerpt: 'Unemployed: Not accepted'
		}
	];
}

// ============================================================================
// LENDER 1: HDFC BANK (PVT)
// ============================================================================

export const HDFC_BANK: ParsedLenderRuleDocument = {
	lender_id: 'hdfc-bank',
	lender_name: 'HDFC Bank',
	classification: 'PVT',
	loan_types: ['Home Loan', 'Loan Against Property'],

	sections: {
		eligibility: [
			{
				rule_id: 'hdfc-elig-age',
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
				rule_id: 'hdfc-cibil-min',
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
				rule_id: 'hdfc-foir-high',
				description: 'FOIR cap 60% for income above 1.5L',
				tier: 'computed',
				logic: {
					if: [{ '>': [{ var: '_computed._total_gross_monthly' }, 150000] }, 0.6, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 60% for income > 1.5L'
			},
			{
				rule_id: 'hdfc-foir-mid',
				description: 'FOIR cap 50% for income 50K-1.5L',
				tier: 'computed',
				logic: {
					if: [
						{
							and: [
								{ '>=': [{ var: '_computed._total_gross_monthly' }, 50000] },
								{ '<=': [{ var: '_computed._total_gross_monthly' }, 150000] }
							]
						},
						0.5,
						null
					]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 50% for income 50K-1.5L'
			},
			{
				rule_id: 'hdfc-foir-low',
				description: 'FOIR cap 45% for income below 50K',
				tier: 'computed',
				logic: {
					if: [{ '<': [{ var: '_computed._total_gross_monthly' }, 50000] }, 0.45, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 45% for income < 50K'
			}
		],
		income_assessment: makeStandardIncomeRules('hdfc', {
			professionalHaircut: 15,
			businessHaircut: 25,
			pensionHaircut: 0,
			rentalHaircut: 30,
			rentalMaxContrib: 50
		}),
		ltv: [
			{
				rule_id: 'hdfc-ltv-low',
				description: 'LTV 90% for loans under 30L',
				tier: 'parameter',
				logic: { '<': [{ var: 'loanTransaction.loanAmount' }, 3000000] },
				parameter_key: 'max_ltv',
				parameter_value: 90,
				confidence: 0.9,
				source_excerpt: 'LTV: 90% for < 30L'
			},
			{
				rule_id: 'hdfc-ltv-mid',
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
				rule_id: 'hdfc-ltv-high',
				description: 'LTV 75% for loans above 75L',
				tier: 'parameter',
				logic: { '>': [{ var: 'loanTransaction.loanAmount' }, 7500000] },
				parameter_key: 'max_ltv',
				parameter_value: 75,
				confidence: 0.9,
				source_excerpt: 'LTV: 75% for > 75L'
			},
			{
				rule_id: 'hdfc-max-lcr',
				description: 'Maximum LCR 90% (Loan to Registry Value)',
				tier: 'parameter' as const,
				logic: { '!!': [true] },
				parameter_key: 'max_lcr',
				parameter_value: 90,
				confidence: 0.85,
				source_excerpt: 'LCR up to 90%'
			}
		],
		obligation_treatment: makeObligationRules('hdfc'),
		property: null,
		transaction: null,
		tenure: [
			{
				rule_id: 'hdfc-tenure-max',
				description: 'Max tenure 30 years',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_tenure_months',
				parameter_value: 360,
				confidence: 0.95,
				source_excerpt: 'Max tenure: 30 years'
			},
			{
				rule_id: 'hdfc-age-maturity',
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
				rule_id: 'hdfc-roi-premium',
				description: 'ROI 8.50% for CIBIL 780+',
				tier: 'parameter',
				logic: { '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 780] },
				parameter_key: 'roi',
				parameter_value: 8.5,
				confidence: 0.9,
				source_excerpt: 'ROI: 8.50% for CIBIL 780+'
			},
			{
				rule_id: 'hdfc-roi-standard',
				description: 'ROI 8.75% for CIBIL 750-779',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 750] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 780] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 8.75,
				confidence: 0.85,
				source_excerpt: 'ROI: 8.75% for CIBIL 750-779'
			},
			{
				rule_id: 'hdfc-roi-base',
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
				rule_id: 'hdfc-roi-fallback',
				description: 'ROI 9.85% fallback for CIBIL below 700',
				tier: 'parameter',
				logic: { '<': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
				parameter_key: 'roi',
				parameter_value: 9.85,
				confidence: 0.8,
				source_excerpt: 'ROI: 9.85% for CIBIL < 700 (if gate passes via deviation)'
			}
		],
		fees: [
			{
				rule_id: 'hdfc-fee-processing',
				description: 'Processing fee 0.50%',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'processing_fee_percent',
				parameter_value: 0.5,
				confidence: 0.9,
				source_excerpt: 'Processing: 0.50%'
			}
		],
		disbursement: null,
		documentation: null,
		nri: [makeNriGate('hdfc')],
		company: [makeCompanyGate('hdfc', 3)],
		balance_transfer: null,
		top_up: null
	},

	deviations: [
		{
			deviation_id: 'hdfc-dev-cibil',
			description: 'CIBIL relaxed to 650 for income above 2L',
			deviates_from: 'hdfc-cibil-min',
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
			policy_key: 'processing_fee_percent',
			label: 'Processing Fee',
			value: 0.5,
			display_on_offer_card: true,
			category: 'processing_fee'
		},
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
			policy_key: 'nri_gpa_eligible_relationships',
			label: 'Eligible GPA Relationships',
			value: ['Parents', 'Spouse', 'Siblings', 'Children'],
			display_on_offer_card: true,
			category: 'nri'
		}
	]
};

// ============================================================================
// LENDER 2: ICICI BANK (PVT)
// ============================================================================

export const ICICI_BANK: ParsedLenderRuleDocument = {
	lender_id: 'icici-bank',
	lender_name: 'ICICI Bank',
	classification: 'PVT',
	loan_types: ['Home Loan', 'Loan Against Property'],

	sections: {
		eligibility: [
			{
				rule_id: 'icici-elig-age',
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
				rule_id: 'icici-cibil-min',
				description: 'Minimum CIBIL score 650',
				tier: 'hard_gate',
				logic: {
					'>=': [{ var: 'allApplicantDetails.0.creditScore' }, 650]
				},
				fail_message: 'CIBIL score must be 650 or above',
				fail_category: 'cibil_threshold',
				confidence: 0.95,
				source_excerpt: 'Min CIBIL: 650'
			},
			{
				rule_id: 'icici-cibil-nri',
				description: 'NRI applicants require minimum CIBIL score 700',
				tier: 'hard_gate',
				logic: {
					'>=': [{ var: 'allApplicantDetails.0.creditScore' }, 700]
				},
				applies_when: { '==': [{ var: 'allApplicantDetails.0.isNRI' }, true] },
				fail_message: 'NRI applicants require CIBIL score 700 or above',
				fail_category: 'cibil_threshold',
				confidence: 0.9,
				source_excerpt: 'NRI Min CIBIL: 700'
			}
		],
		foir: [
			{
				rule_id: 'icici-foir-high',
				description: 'FOIR cap 65% for income above 2L',
				tier: 'computed',
				logic: {
					if: [{ '>': [{ var: '_computed._total_gross_monthly' }, 200000] }, 0.65, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 65% for income > 2L'
			},
			{
				rule_id: 'icici-foir-mid',
				description: 'FOIR cap 55% for income 75K-2L',
				tier: 'computed',
				logic: {
					if: [
						{
							and: [
								{ '>=': [{ var: '_computed._total_gross_monthly' }, 75000] },
								{ '<=': [{ var: '_computed._total_gross_monthly' }, 200000] }
							]
						},
						0.55,
						null
					]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 55% for income 75K-2L'
			},
			{
				rule_id: 'icici-foir-low',
				description: 'FOIR cap 50% for income below 75K',
				tier: 'computed',
				logic: {
					if: [{ '<': [{ var: '_computed._total_gross_monthly' }, 75000] }, 0.5, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 50% for income < 75K'
			}
		],
		income_assessment: makeStandardIncomeRules('icici', {
			professionalHaircut: 10,
			businessHaircut: 20,
			pensionHaircut: 0,
			rentalHaircut: 30,
			rentalMaxContrib: 50
		}),
		ltv: [
			{
				rule_id: 'icici-ltv-low',
				description: 'LTV 90% for loans under 30L',
				tier: 'parameter',
				logic: { '<': [{ var: 'loanTransaction.loanAmount' }, 3000000] },
				parameter_key: 'max_ltv',
				parameter_value: 90,
				confidence: 0.9,
				source_excerpt: 'LTV: 90% for < 30L'
			},
			{
				rule_id: 'icici-ltv-mid',
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
				rule_id: 'icici-ltv-high',
				description: 'LTV 75% for loans above 75L',
				tier: 'parameter',
				logic: { '>': [{ var: 'loanTransaction.loanAmount' }, 7500000] },
				parameter_key: 'max_ltv',
				parameter_value: 75,
				confidence: 0.9,
				source_excerpt: 'LTV: 75% for > 75L'
			},
			{
				rule_id: 'icici-max-lcr',
				description: 'Maximum LCR 90% (Loan to Registry Value)',
				tier: 'parameter' as const,
				logic: { '!!': [true] },
				parameter_key: 'max_lcr',
				parameter_value: 90,
				confidence: 0.85,
				source_excerpt: 'LCR up to 90%'
			}
		],
		obligation_treatment: makeObligationRules('icici'),
		property: null,
		transaction: null,
		tenure: [
			{
				rule_id: 'icici-tenure-max',
				description: 'Max tenure 30 years',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_tenure_months',
				parameter_value: 360,
				confidence: 0.95,
				source_excerpt: 'Max tenure: 30 years'
			},
			{
				rule_id: 'icici-age-maturity',
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
				rule_id: 'icici-roi-premium',
				description: 'ROI 8.75% for CIBIL 780+',
				tier: 'parameter',
				logic: { '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 780] },
				parameter_key: 'roi',
				parameter_value: 8.75,
				confidence: 0.9,
				source_excerpt: 'ROI: 8.75% for CIBIL 780+'
			},
			{
				rule_id: 'icici-roi-standard',
				description: 'ROI 8.90% for CIBIL 750-779',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 750] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 780] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 8.9,
				confidence: 0.85,
				source_excerpt: 'ROI: 8.90% for CIBIL 750-779'
			},
			{
				rule_id: 'icici-roi-base',
				description: 'ROI 9.25% for CIBIL 700-749',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 750] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 9.25,
				confidence: 0.85,
				source_excerpt: 'ROI: 9.25% for CIBIL 700-749'
			},
			{
				rule_id: 'icici-roi-sub',
				description: 'ROI 9.65% for CIBIL 650-699',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 650] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 700] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 9.65,
				confidence: 0.85,
				source_excerpt: 'ROI: 9.65% for CIBIL 650-699'
			},
			{
				rule_id: 'icici-roi-fallback',
				description: 'ROI 9.90% fallback for CIBIL below 650',
				tier: 'parameter',
				logic: { '<': [{ var: 'allApplicantDetails.0.creditScore' }, 650] },
				parameter_key: 'roi',
				parameter_value: 9.9,
				confidence: 0.8,
				source_excerpt: 'ROI: 9.90% for CIBIL < 650 (if gate passes via deviation)'
			}
		],
		fees: [
			{
				rule_id: 'icici-fee-processing',
				description: 'Processing fee 0.50%',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'processing_fee_percent',
				parameter_value: 0.5,
				confidence: 0.9,
				source_excerpt: 'Processing: 0.50%'
			}
		],
		disbursement: null,
		documentation: null,
		nri: [makeNriGate('icici')],
		company: [makeCompanyGate('icici', 3)],
		balance_transfer: null,
		top_up: null
	},

	deviations: [
		{
			deviation_id: 'icici-dev-cibil',
			description: 'CIBIL relaxed to 600 for income above 1.5L',
			deviates_from: 'icici-cibil-min',
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
			policy_key: 'processing_fee_percent',
			label: 'Processing Fee',
			value: 0.5,
			display_on_offer_card: true,
			category: 'processing_fee'
		},
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
			policy_key: 'nri_gpa_eligible_relationships',
			label: 'Eligible GPA Relationships',
			value: ['Parents', 'Spouse', 'Siblings'],
			display_on_offer_card: true,
			category: 'nri'
		}
	]
};

// ============================================================================
// LENDER 3: AXIS BANK (PVT)
// ============================================================================

export const AXIS_BANK: ParsedLenderRuleDocument = {
	lender_id: 'axis-bank',
	lender_name: 'Axis Bank',
	classification: 'PVT',
	loan_types: ['Home Loan', 'Loan Against Property'],

	sections: {
		eligibility: [
			{
				rule_id: 'axis-elig-age',
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
				rule_id: 'axis-cibil-min',
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
				rule_id: 'axis-foir-high',
				description: 'FOIR cap 70% for income above 2L',
				tier: 'computed',
				logic: {
					if: [{ '>': [{ var: '_computed._total_gross_monthly' }, 200000] }, 0.7, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 70% for income > 2L'
			},
			{
				rule_id: 'axis-foir-mid',
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
				rule_id: 'axis-foir-low',
				description: 'FOIR cap 55% for income below 75K',
				tier: 'computed',
				logic: {
					if: [{ '<': [{ var: '_computed._total_gross_monthly' }, 75000] }, 0.55, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 55% for income < 75K'
			}
		],
		income_assessment: makeStandardIncomeRules('axis', {
			professionalHaircut: 15,
			businessHaircut: 25,
			pensionHaircut: 5,
			rentalHaircut: 30,
			rentalMaxContrib: 50
		}),
		ltv: [
			{
				rule_id: 'axis-ltv-low',
				description: 'LTV 90% for loans under 30L',
				tier: 'parameter',
				logic: { '<': [{ var: 'loanTransaction.loanAmount' }, 3000000] },
				parameter_key: 'max_ltv',
				parameter_value: 90,
				confidence: 0.9,
				source_excerpt: 'LTV: 90% for < 30L'
			},
			{
				rule_id: 'axis-ltv-mid',
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
				rule_id: 'axis-ltv-high',
				description: 'LTV 75% for loans above 75L',
				tier: 'parameter',
				logic: { '>': [{ var: 'loanTransaction.loanAmount' }, 7500000] },
				parameter_key: 'max_ltv',
				parameter_value: 75,
				confidence: 0.9,
				source_excerpt: 'LTV: 75% for > 75L'
			},
			{
				rule_id: 'axis-max-lcr',
				description: 'Maximum LCR 85% (Loan to Registry Value)',
				tier: 'parameter' as const,
				logic: { '!!': [true] },
				parameter_key: 'max_lcr',
				parameter_value: 85,
				confidence: 0.85,
				source_excerpt: 'LCR up to 85%'
			}
		],
		obligation_treatment: makeObligationRules('axis'),
		property: null,
		transaction: null,
		tenure: [
			{
				rule_id: 'axis-tenure-max',
				description: 'Max tenure 30 years',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_tenure_months',
				parameter_value: 360,
				confidence: 0.95,
				source_excerpt: 'Max tenure: 30 years'
			},
			{
				rule_id: 'axis-age-maturity',
				description: 'Max age at maturity 60',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_age_at_maturity',
				parameter_value: 60,
				confidence: 0.95,
				source_excerpt: 'Age at maturity: max 60 years'
			}
		],
		roi: [
			{
				rule_id: 'axis-roi-premium',
				description: 'ROI 8.70% for CIBIL 780+',
				tier: 'parameter',
				logic: { '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 780] },
				parameter_key: 'roi',
				parameter_value: 8.7,
				confidence: 0.9,
				source_excerpt: 'ROI: 8.70% for CIBIL 780+'
			},
			{
				rule_id: 'axis-roi-standard',
				description: 'ROI 8.90% for CIBIL 750-779',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 750] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 780] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 8.9,
				confidence: 0.85,
				source_excerpt: 'ROI: 8.90% for CIBIL 750-779'
			},
			{
				rule_id: 'axis-roi-base',
				description: 'ROI 9.35% for CIBIL 700-749',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 750] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 9.35,
				confidence: 0.85,
				source_excerpt: 'ROI: 9.35% for CIBIL 700-749'
			},
			{
				rule_id: 'axis-roi-fallback',
				description: 'ROI 10.10% fallback for CIBIL below 700',
				tier: 'parameter',
				logic: { '<': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
				parameter_key: 'roi',
				parameter_value: 10.1,
				confidence: 0.8,
				source_excerpt: 'ROI: 10.10% for CIBIL < 700 (if gate passes via deviation)'
			}
		],
		fees: [
			{
				rule_id: 'axis-fee-processing',
				description: 'Processing fee 1.00%',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'processing_fee_percent',
				parameter_value: 1.0,
				confidence: 0.9,
				source_excerpt: 'Processing: 1.00%'
			}
		],
		disbursement: null,
		documentation: null,
		nri: [makeNriGate('axis')],
		company: [makeCompanyGate('axis', 3)],
		balance_transfer: null,
		top_up: null
	},

	deviations: [
		{
			deviation_id: 'axis-dev-cibil',
			description: 'CIBIL relaxed to 650 for income above 2L',
			deviates_from: 'axis-cibil-min',
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
			policy_key: 'processing_fee_percent',
			label: 'Processing Fee',
			value: 1.0,
			display_on_offer_card: true,
			category: 'processing_fee'
		},
		{
			policy_key: 'max_age',
			label: 'Maximum Age at Maturity',
			value: 60,
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
			policy_key: 'nri_gpa_eligible_relationships',
			label: 'Eligible GPA Relationships',
			value: ['Parents', 'Spouse', 'Siblings', 'Children'],
			display_on_offer_card: true,
			category: 'nri'
		}
	]
};

// ============================================================================
// LENDER 4: SBI (GOV)
// ============================================================================

export const SBI_BANK: ParsedLenderRuleDocument = {
	lender_id: 'sbi',
	lender_name: 'State Bank of India',
	classification: 'GOV',
	loan_types: ['Home Loan', 'Loan Against Property', 'Business Loan'],

	sections: {
		eligibility: [
			{
				rule_id: 'sbi-elig-age',
				description: 'Applicant age must be 18-70 (individuals only)',
				tier: 'hard_gate',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.age' }, 18] },
						{ '<=': [{ var: 'allApplicantDetails.0.age' }, 70] }
					]
				},
				applies_when: INDIVIDUAL_ONLY,
				fail_message: 'Primary applicant age must be 18-70 years',
				fail_category: 'age_limit',
				confidence: 0.95,
				source_excerpt: 'Age: 18-70 years (individuals)'
			}
		],
		cibil: [
			{
				rule_id: 'sbi-cibil-min',
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
				rule_id: 'sbi-foir-high',
				description: 'FOIR cap 55% for income above 1L',
				tier: 'computed',
				logic: {
					if: [{ '>': [{ var: '_computed._total_gross_monthly' }, 100000] }, 0.55, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 55% for income > 1L'
			},
			{
				rule_id: 'sbi-foir-mid',
				description: 'FOIR cap 50% for income 50K-1L',
				tier: 'computed',
				logic: {
					if: [
						{
							and: [
								{ '>=': [{ var: '_computed._total_gross_monthly' }, 50000] },
								{ '<=': [{ var: '_computed._total_gross_monthly' }, 100000] }
							]
						},
						0.5,
						null
					]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 50% for income 50K-1L'
			},
			{
				rule_id: 'sbi-foir-low',
				description: 'FOIR cap 45% for income below 50K',
				tier: 'computed',
				logic: {
					if: [{ '<': [{ var: '_computed._total_gross_monthly' }, 50000] }, 0.45, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 45% for income < 50K'
			}
		],
		income_assessment: makeStandardIncomeRules('sbi', {
			professionalHaircut: 15,
			businessHaircut: 30,
			pensionHaircut: 0,
			rentalHaircut: 30,
			rentalMaxContrib: 50
		}),
		ltv: [
			{
				rule_id: 'sbi-ltv-low',
				description: 'LTV 90% for loans under 30L',
				tier: 'parameter',
				logic: { '<': [{ var: 'loanTransaction.loanAmount' }, 3000000] },
				parameter_key: 'max_ltv',
				parameter_value: 90,
				confidence: 0.9,
				source_excerpt: 'LTV: 90% for < 30L'
			},
			{
				rule_id: 'sbi-ltv-mid',
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
				rule_id: 'sbi-ltv-high',
				description: 'LTV 75% for loans above 75L',
				tier: 'parameter',
				logic: { '>': [{ var: 'loanTransaction.loanAmount' }, 7500000] },
				parameter_key: 'max_ltv',
				parameter_value: 75,
				confidence: 0.9,
				source_excerpt: 'LTV: 75% for > 75L'
			},
			{
				rule_id: 'sbi-max-lcr',
				description: 'Maximum LCR 90% (Loan to Registry Value)',
				tier: 'parameter' as const,
				logic: { '!!': [true] },
				parameter_key: 'max_lcr',
				parameter_value: 90,
				confidence: 0.85,
				source_excerpt: 'LCR up to 90%'
			}
		],
		obligation_treatment: makeObligationRules('sbi'),
		property: null,
		transaction: null,
		tenure: [
			{
				rule_id: 'sbi-tenure-max',
				description: 'Max tenure 30 years',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_tenure_months',
				parameter_value: 360,
				confidence: 0.95,
				source_excerpt: 'Max tenure: 30 years'
			},
			{
				rule_id: 'sbi-age-maturity',
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
				rule_id: 'sbi-roi-premium',
				description: 'ROI 8.00% for CIBIL 780+',
				tier: 'parameter',
				logic: { '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 780] },
				parameter_key: 'roi',
				parameter_value: 8.0,
				confidence: 0.9,
				source_excerpt: 'ROI: 8.00% for CIBIL 780+'
			},
			{
				rule_id: 'sbi-roi-standard',
				description: 'ROI 8.25% for CIBIL 750-779',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 750] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 780] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 8.25,
				confidence: 0.85,
				source_excerpt: 'ROI: 8.25% for CIBIL 750-779'
			},
			{
				rule_id: 'sbi-roi-base',
				description: 'ROI 8.50% for CIBIL 700-749',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 750] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 8.5,
				confidence: 0.85,
				source_excerpt: 'ROI: 8.50% for CIBIL 700-749'
			},
			{
				rule_id: 'sbi-roi-sub',
				description: 'ROI 9.00% for CIBIL 650-699',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 650] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 700] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 9.0,
				confidence: 0.85,
				source_excerpt: 'ROI: 9.00% for CIBIL 650-699'
			},
			{
				rule_id: 'sbi-roi-fallback',
				description: 'ROI 9.15% fallback for CIBIL below 650',
				tier: 'parameter',
				logic: { '<': [{ var: 'allApplicantDetails.0.creditScore' }, 650] },
				parameter_key: 'roi',
				parameter_value: 9.15,
				confidence: 0.8,
				source_excerpt: 'ROI: 9.15% for CIBIL < 650 (if gate passes via deviation)'
			}
		],
		fees: [
			{
				rule_id: 'sbi-fee-processing',
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
		nri: [makeNriGate('sbi')],
		company: [makeCompanyGate('sbi', 2)],
		balance_transfer: null,
		top_up: null
	},

	deviations: [
		{
			deviation_id: 'sbi-dev-cibil',
			description: 'CIBIL relaxed to 600 for income above 1L',
			deviates_from: 'sbi-cibil-min',
			condition: {
				and: [
					{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 600] },
					{ '>': [{ var: '_computed._total_gross_monthly' }, 100000] }
				]
			},
			approval_authority: 'branch_manager',
			max_deviation: 'CIBIL 600-649',
			probability_modifier: -0.15,
			confidence: 0.8,
			source_excerpt: 'Deviation: CIBIL relax to 600 for income > 1L'
		}
	],

	policies: [
		{
			policy_key: 'processing_fee_percent',
			label: 'Processing Fee',
			value: 0.35,
			display_on_offer_card: true,
			category: 'processing_fee'
		},
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
			policy_key: 'nri_gpa_eligible_relationships',
			label: 'Eligible GPA Relationships',
			value: ['Parents', 'Spouse', 'Siblings', 'Children', 'In-Laws'],
			display_on_offer_card: true,
			category: 'nri'
		}
	]
};

// ============================================================================
// LENDER 5: BAJAJ HOUSING FINANCE (NBFC)
// ============================================================================

export const BAJAJ_HOUSING: ParsedLenderRuleDocument = {
	lender_id: 'bajaj-housing',
	lender_name: 'Bajaj Housing Finance',
	classification: 'NBFC',
	loan_types: ['Home Loan', 'Loan Against Property', 'Business Loan'],

	sections: {
		eligibility: [
			{
				rule_id: 'bajaj-elig-age',
				description: 'Applicant age must be 23-75 (individuals only)',
				tier: 'hard_gate',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.age' }, 23] },
						{ '<=': [{ var: 'allApplicantDetails.0.age' }, 75] }
					]
				},
				applies_when: INDIVIDUAL_ONLY,
				fail_message: 'Primary applicant age must be 23-75 years',
				fail_category: 'age_limit',
				confidence: 0.95,
				source_excerpt: 'Age: 23-75 years (individuals)'
			}
		],
		cibil: [
			{
				rule_id: 'bajaj-cibil-min',
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
				rule_id: 'bajaj-foir-high',
				description: 'FOIR cap 60% for income above 1.5L',
				tier: 'computed',
				logic: {
					if: [{ '>': [{ var: '_computed._total_gross_monthly' }, 150000] }, 0.6, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 60% for income > 1.5L'
			},
			{
				rule_id: 'bajaj-foir-mid',
				description: 'FOIR cap 55% for income 75K-1.5L',
				tier: 'computed',
				logic: {
					if: [
						{
							and: [
								{ '>=': [{ var: '_computed._total_gross_monthly' }, 75000] },
								{ '<=': [{ var: '_computed._total_gross_monthly' }, 150000] }
							]
						},
						0.55,
						null
					]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 55% for income 75K-1.5L'
			},
			{
				rule_id: 'bajaj-foir-low',
				description: 'FOIR cap 50% for income below 75K',
				tier: 'computed',
				logic: {
					if: [{ '<': [{ var: '_computed._total_gross_monthly' }, 75000] }, 0.5, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 50% for income < 75K'
			}
		],
		income_assessment: makeStandardIncomeRules('bajaj', {
			professionalHaircut: 10,
			businessHaircut: 20,
			pensionHaircut: 5,
			rentalHaircut: 30,
			rentalMaxContrib: 50
		}),
		ltv: [
			{
				rule_id: 'bajaj-ltv-low',
				description: 'LTV 90% for loans under 30L',
				tier: 'parameter',
				logic: { '<': [{ var: 'loanTransaction.loanAmount' }, 3000000] },
				parameter_key: 'max_ltv',
				parameter_value: 90,
				confidence: 0.9,
				source_excerpt: 'LTV: 90% for < 30L'
			},
			{
				rule_id: 'bajaj-ltv-mid',
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
				rule_id: 'bajaj-ltv-high',
				description: 'LTV 75% for loans above 75L',
				tier: 'parameter',
				logic: { '>': [{ var: 'loanTransaction.loanAmount' }, 7500000] },
				parameter_key: 'max_ltv',
				parameter_value: 75,
				confidence: 0.9,
				source_excerpt: 'LTV: 75% for > 75L'
			},
			{
				rule_id: 'bajaj-max-lcr',
				description: 'Maximum LCR 85% (Loan to Registry Value)',
				tier: 'parameter' as const,
				logic: { '!!': [true] },
				parameter_key: 'max_lcr',
				parameter_value: 85,
				confidence: 0.85,
				source_excerpt: 'LCR up to 85%'
			}
		],
		obligation_treatment: makeObligationRules('bajaj'),
		property: null,
		transaction: null,
		tenure: [
			{
				rule_id: 'bajaj-tenure-max',
				description: 'Max tenure 40 years',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_tenure_months',
				parameter_value: 480,
				confidence: 0.95,
				source_excerpt: 'Max tenure: 40 years'
			},
			{
				rule_id: 'bajaj-age-maturity',
				description: 'Max age at maturity 75',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_age_at_maturity',
				parameter_value: 75,
				confidence: 0.95,
				source_excerpt: 'Age at maturity: max 75 years'
			}
		],
		roi: [
			{
				rule_id: 'bajaj-roi-premium',
				description: 'ROI 8.25% for CIBIL 800+',
				tier: 'parameter',
				logic: { '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 800] },
				parameter_key: 'roi',
				parameter_value: 8.25,
				confidence: 0.9,
				source_excerpt: 'ROI: 8.25% for CIBIL 800+'
			},
			{
				rule_id: 'bajaj-roi-standard',
				description: 'ROI 8.75% for CIBIL 750-799',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 750] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 800] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 8.75,
				confidence: 0.85,
				source_excerpt: 'ROI: 8.75% for CIBIL 750-799'
			},
			{
				rule_id: 'bajaj-roi-base',
				description: 'ROI 9.50% for CIBIL 700-749',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 750] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 9.5,
				confidence: 0.85,
				source_excerpt: 'ROI: 9.50% for CIBIL 700-749'
			},
			{
				rule_id: 'bajaj-roi-fallback',
				description: 'ROI 10.25% fallback for CIBIL below 700',
				tier: 'parameter',
				logic: { '<': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
				parameter_key: 'roi',
				parameter_value: 10.25,
				confidence: 0.8,
				source_excerpt: 'ROI: 10.25% for CIBIL < 700 (if gate passes via deviation)'
			}
		],
		fees: [
			{
				rule_id: 'bajaj-fee-processing',
				description: 'Processing fee 2.00%',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'processing_fee_percent',
				parameter_value: 2.0,
				confidence: 0.9,
				source_excerpt: 'Processing: 2.00%'
			}
		],
		disbursement: null,
		documentation: null,
		nri: [makeNriGate('bajaj')],
		company: [makeCompanyGate('bajaj', 3)],
		balance_transfer: null,
		top_up: null
	},

	deviations: [
		{
			deviation_id: 'bajaj-dev-cibil',
			description: 'CIBIL relaxed to 650 for income above 3L',
			deviates_from: 'bajaj-cibil-min',
			condition: {
				and: [
					{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 650] },
					{ '>': [{ var: '_computed._total_gross_monthly' }, 300000] }
				]
			},
			approval_authority: 'regional_head',
			max_deviation: 'CIBIL 650-699',
			probability_modifier: -0.15,
			confidence: 0.8,
			source_excerpt: 'Deviation: CIBIL relax to 650 for income > 3L (regional head approval)'
		}
	],

	policies: [
		{
			policy_key: 'processing_fee_percent',
			label: 'Processing Fee',
			value: 2.0,
			display_on_offer_card: true,
			category: 'processing_fee'
		},
		{
			policy_key: 'max_age',
			label: 'Maximum Age at Maturity',
			value: 75,
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
			policy_key: 'nri_gpa_eligible_relationships',
			label: 'Eligible GPA Relationships',
			value: ['Parents', 'Spouse'],
			display_on_offer_card: true,
			category: 'nri'
		}
	]
};

// ============================================================================
// LENDER 6: TATA CAPITAL (NBFC)
// ============================================================================

export const TATA_CAPITAL: ParsedLenderRuleDocument = {
	lender_id: 'tata-capital',
	lender_name: 'Tata Capital',
	classification: 'NBFC',
	loan_types: ['Home Loan', 'Loan Against Property', 'Business Loan'],

	sections: {
		eligibility: [
			{
				rule_id: 'tata-elig-age',
				description: 'Applicant age must be 24-65 (individuals only)',
				tier: 'hard_gate',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.age' }, 24] },
						{ '<=': [{ var: 'allApplicantDetails.0.age' }, 65] }
					]
				},
				applies_when: INDIVIDUAL_ONLY,
				fail_message: 'Primary applicant age must be 24-65 years',
				fail_category: 'age_limit',
				confidence: 0.95,
				source_excerpt: 'Age: 24-65 years (individuals)'
			}
		],
		cibil: [
			{
				rule_id: 'tata-cibil-min',
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
				rule_id: 'tata-foir-high',
				description: 'FOIR cap 60% for income above 1.5L',
				tier: 'computed',
				logic: {
					if: [{ '>': [{ var: '_computed._total_gross_monthly' }, 150000] }, 0.6, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 60% for income > 1.5L'
			},
			{
				rule_id: 'tata-foir-mid',
				description: 'FOIR cap 55% for income 75K-1.5L',
				tier: 'computed',
				logic: {
					if: [
						{
							and: [
								{ '>=': [{ var: '_computed._total_gross_monthly' }, 75000] },
								{ '<=': [{ var: '_computed._total_gross_monthly' }, 150000] }
							]
						},
						0.55,
						null
					]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 55% for income 75K-1.5L'
			},
			{
				rule_id: 'tata-foir-low',
				description: 'FOIR cap 50% for income below 75K',
				tier: 'computed',
				logic: {
					if: [{ '<': [{ var: '_computed._total_gross_monthly' }, 75000] }, 0.5, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 50% for income < 75K'
			}
		],
		income_assessment: makeStandardIncomeRules('tata', {
			professionalHaircut: 15,
			businessHaircut: 25,
			pensionHaircut: 5,
			rentalHaircut: 30,
			rentalMaxContrib: 50
		}),
		ltv: [
			{
				rule_id: 'tata-ltv-low',
				description: 'LTV 90% for loans under 30L',
				tier: 'parameter',
				logic: { '<': [{ var: 'loanTransaction.loanAmount' }, 3000000] },
				parameter_key: 'max_ltv',
				parameter_value: 90,
				confidence: 0.9,
				source_excerpt: 'LTV: 90% for < 30L'
			},
			{
				rule_id: 'tata-ltv-mid',
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
				rule_id: 'tata-ltv-high',
				description: 'LTV 70% for loans above 75L',
				tier: 'parameter',
				logic: { '>': [{ var: 'loanTransaction.loanAmount' }, 7500000] },
				parameter_key: 'max_ltv',
				parameter_value: 70,
				confidence: 0.9,
				source_excerpt: 'LTV: 70% for > 75L (stricter than RBI guideline)'
			},
			{
				rule_id: 'tata-max-lcr',
				description: 'Maximum LCR 80% (Loan to Registry Value)',
				tier: 'parameter' as const,
				logic: { '!!': [true] },
				parameter_key: 'max_lcr',
				parameter_value: 80,
				confidence: 0.85,
				source_excerpt: 'LCR up to 80%'
			}
		],
		obligation_treatment: makeObligationRules('tata'),
		property: null,
		transaction: null,
		tenure: [
			{
				rule_id: 'tata-tenure-max',
				description: 'Max tenure 30 years',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_tenure_months',
				parameter_value: 360,
				confidence: 0.95,
				source_excerpt: 'Max tenure: 30 years'
			},
			{
				rule_id: 'tata-age-maturity',
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
				rule_id: 'tata-roi-premium',
				description: 'ROI 8.75% for CIBIL 780+',
				tier: 'parameter',
				logic: { '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 780] },
				parameter_key: 'roi',
				parameter_value: 8.75,
				confidence: 0.9,
				source_excerpt: 'ROI: 8.75% for CIBIL 780+'
			},
			{
				rule_id: 'tata-roi-standard',
				description: 'ROI 9.00% for CIBIL 750-779',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 750] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 780] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 9.0,
				confidence: 0.85,
				source_excerpt: 'ROI: 9.00% for CIBIL 750-779'
			},
			{
				rule_id: 'tata-roi-base',
				description: 'ROI 9.50% for CIBIL 700-749',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 750] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 9.5,
				confidence: 0.85,
				source_excerpt: 'ROI: 9.50% for CIBIL 700-749'
			},
			{
				rule_id: 'tata-roi-sub',
				description: 'ROI 10.00% for CIBIL 650-699',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 650] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 700] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 10.0,
				confidence: 0.85,
				source_excerpt: 'ROI: 10.00% for CIBIL 650-699'
			},
			{
				rule_id: 'tata-roi-fallback',
				description: 'ROI 10.50% fallback for CIBIL below 650',
				tier: 'parameter',
				logic: { '<': [{ var: 'allApplicantDetails.0.creditScore' }, 650] },
				parameter_key: 'roi',
				parameter_value: 10.5,
				confidence: 0.8,
				source_excerpt: 'ROI: 10.50% for CIBIL < 650 (if gate passes via deviation)'
			}
		],
		fees: [
			{
				rule_id: 'tata-fee-processing',
				description: 'Processing fee 2.00%',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'processing_fee_percent',
				parameter_value: 2.0,
				confidence: 0.9,
				source_excerpt: 'Processing: 2.00%'
			}
		],
		disbursement: null,
		documentation: null,
		nri: [makeNriGate('tata')],
		company: [makeCompanyGate('tata', 3)],
		balance_transfer: null,
		top_up: null
	},

	deviations: [
		{
			deviation_id: 'tata-dev-cibil',
			description: 'CIBIL relaxed to 600 for income above 2L',
			deviates_from: 'tata-cibil-min',
			condition: {
				and: [
					{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 600] },
					{ '>': [{ var: '_computed._total_gross_monthly' }, 200000] }
				]
			},
			approval_authority: 'credit_committee',
			max_deviation: 'CIBIL 600-649',
			probability_modifier: -0.15,
			confidence: 0.8,
			source_excerpt: 'Deviation: CIBIL relax to 600 for income > 2L (credit committee)'
		}
	],

	policies: [
		{
			policy_key: 'processing_fee_percent',
			label: 'Processing Fee',
			value: 2.0,
			display_on_offer_card: true,
			category: 'processing_fee'
		},
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
			policy_key: 'nri_gpa_eligible_relationships',
			label: 'Eligible GPA Relationships',
			value: ['Parents', 'Spouse', 'Siblings'],
			display_on_offer_card: true,
			category: 'nri'
		}
	]
};

// ============================================================================
// LENDER 7: LIC HOUSING FINANCE (NBFC / HFC)
// ============================================================================

export const LIC_HFL: ParsedLenderRuleDocument = {
	lender_id: 'lic-hfl',
	lender_name: 'LIC Housing Finance',
	classification: 'NBFC',
	loan_types: ['Home Loan', 'Loan Against Property', 'Business Loan'],

	sections: {
		eligibility: [
			{
				rule_id: 'lic-elig-age',
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
				source_excerpt: 'Age: 21-60 years (salaried individuals)'
			}
		],
		cibil: [
			{
				rule_id: 'lic-cibil-min',
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
				rule_id: 'lic-foir-high',
				description: 'FOIR cap 60% for income above 1.5L',
				tier: 'computed',
				logic: {
					if: [{ '>': [{ var: '_computed._total_gross_monthly' }, 150000] }, 0.6, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 60% for income > 1.5L'
			},
			{
				rule_id: 'lic-foir-mid',
				description: 'FOIR cap 55% for income 50K-1.5L',
				tier: 'computed',
				logic: {
					if: [
						{
							and: [
								{ '>=': [{ var: '_computed._total_gross_monthly' }, 50000] },
								{ '<=': [{ var: '_computed._total_gross_monthly' }, 150000] }
							]
						},
						0.55,
						null
					]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 55% for income 50K-1.5L'
			},
			{
				rule_id: 'lic-foir-low',
				description: 'FOIR cap 50% for income below 50K',
				tier: 'computed',
				logic: {
					if: [{ '<': [{ var: '_computed._total_gross_monthly' }, 50000] }, 0.5, null]
				},
				confidence: 0.9,
				source_excerpt: 'FOIR: 50% for income < 50K'
			}
		],
		income_assessment: makeStandardIncomeRules('lic', {
			professionalHaircut: 15,
			businessHaircut: 25,
			pensionHaircut: 0,
			rentalHaircut: 30,
			rentalMaxContrib: 50
		}),
		ltv: [
			{
				rule_id: 'lic-ltv-low',
				description: 'LTV 85% for loans under 20L (conservative)',
				tier: 'parameter',
				logic: { '<': [{ var: 'loanTransaction.loanAmount' }, 2000000] },
				parameter_key: 'max_ltv',
				parameter_value: 85,
				confidence: 0.9,
				source_excerpt: 'LTV: 85% for < 20L (conservative)'
			},
			{
				rule_id: 'lic-ltv-mid',
				description: 'LTV 80% for loans 20L-75L',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'loanTransaction.loanAmount' }, 2000000] },
						{ '<=': [{ var: 'loanTransaction.loanAmount' }, 7500000] }
					]
				},
				parameter_key: 'max_ltv',
				parameter_value: 80,
				confidence: 0.9,
				source_excerpt: 'LTV: 80% for 20L-75L'
			},
			{
				rule_id: 'lic-ltv-high',
				description: 'LTV 75% for loans above 75L',
				tier: 'parameter',
				logic: { '>': [{ var: 'loanTransaction.loanAmount' }, 7500000] },
				parameter_key: 'max_ltv',
				parameter_value: 75,
				confidence: 0.9,
				source_excerpt: 'LTV: 75% for > 75L'
			},
			{
				rule_id: 'lic-max-lcr',
				description: 'Maximum LCR 85% (Loan to Registry Value)',
				tier: 'parameter' as const,
				logic: { '!!': [true] },
				parameter_key: 'max_lcr',
				parameter_value: 85,
				confidence: 0.85,
				source_excerpt: 'LCR up to 85%'
			}
		],
		obligation_treatment: makeObligationRules('lic'),
		property: null,
		transaction: null,
		tenure: [
			{
				rule_id: 'lic-tenure-max',
				description: 'Max tenure 30 years',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_tenure_months',
				parameter_value: 360,
				confidence: 0.95,
				source_excerpt: 'Max tenure: 30 years'
			},
			{
				rule_id: 'lic-age-maturity',
				description: 'Max age at maturity 60',
				tier: 'parameter',
				logic: { '!!': [true] },
				parameter_key: 'max_age_at_maturity',
				parameter_value: 60,
				confidence: 0.95,
				source_excerpt: 'Age at maturity: max 60 years'
			}
		],
		roi: [
			{
				rule_id: 'lic-roi-premium',
				description: 'ROI 8.00% for CIBIL 800+',
				tier: 'parameter',
				logic: { '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 800] },
				parameter_key: 'roi',
				parameter_value: 8.0,
				confidence: 0.9,
				source_excerpt: 'ROI: 8.00% for CIBIL 800+'
			},
			{
				rule_id: 'lic-roi-standard',
				description: 'ROI 8.15% for CIBIL 750-799',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 750] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 800] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 8.15,
				confidence: 0.85,
				source_excerpt: 'ROI: 8.15% for CIBIL 750-799'
			},
			{
				rule_id: 'lic-roi-base',
				description: 'ROI 8.40% for CIBIL 700-749',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 750] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 8.4,
				confidence: 0.85,
				source_excerpt: 'ROI: 8.40% for CIBIL 700-749'
			},
			{
				rule_id: 'lic-roi-sub',
				description: 'ROI 8.65% for CIBIL 650-699',
				tier: 'parameter',
				logic: {
					and: [
						{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 650] },
						{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 700] }
					]
				},
				parameter_key: 'roi',
				parameter_value: 8.65,
				confidence: 0.85,
				source_excerpt: 'ROI: 8.65% for CIBIL 650-699'
			},
			{
				rule_id: 'lic-roi-fallback',
				description: 'ROI 9.50% fallback for CIBIL below 650',
				tier: 'parameter',
				logic: { '<': [{ var: 'allApplicantDetails.0.creditScore' }, 650] },
				parameter_key: 'roi',
				parameter_value: 9.5,
				confidence: 0.8,
				source_excerpt: 'ROI: 9.50% for CIBIL < 650 (if gate passes via deviation)'
			}
		],
		fees: [
			{
				rule_id: 'lic-fee-processing',
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
		nri: [makeNriGate('lic')],
		company: [makeCompanyGate('lic', 3)],
		balance_transfer: null,
		top_up: null
	},

	deviations: [
		{
			deviation_id: 'lic-dev-cibil',
			description: 'CIBIL relaxed to 600 for income above 1.5L',
			deviates_from: 'lic-cibil-min',
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
			policy_key: 'processing_fee_percent',
			label: 'Processing Fee',
			value: 0.25,
			display_on_offer_card: true,
			category: 'processing_fee'
		},
		{
			policy_key: 'max_age',
			label: 'Maximum Age at Maturity',
			value: 60,
			display_on_offer_card: false,
			category: 'eligibility'
		},
		{
			policy_key: 'turnaround_days',
			label: 'Expected Turnaround',
			value: '10-15 working days',
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
			policy_key: 'nri_gpa_eligible_relationships',
			label: 'Eligible GPA Relationships',
			value: ['Parents', 'Spouse', 'Siblings'],
			display_on_offer_card: true,
			category: 'nri'
		}
	]
};

// ============================================================================
// ALL REAL BANK DOCUMENTS
// ============================================================================

export const ALL_REAL_BANK_RULE_DOCS: ParsedLenderRuleDocument[] = [
	HDFC_BANK,
	ICICI_BANK,
	AXIS_BANK,
	SBI_BANK,
	BAJAJ_HOUSING,
	TATA_CAPITAL,
	LIC_HFL
];

// ============================================================================
// SEED FUNCTION
// ============================================================================

export async function seedRealBankRuleDocuments(): Promise<{ inserted: number; skipped: number }> {
	const artifacts = [
		{
			artifact_id: 'hdfc-bank-hl-v1',
			lender_id: 'hdfc-bank',
			lender_name: 'HDFC Bank',
			classification: 'PVT' as const,
			loan_types: HDFC_BANK.loan_types,
			json_logic: HDFC_BANK as unknown as Record<string, unknown>,
			human_readable:
				'HDFC Bank rules for Home Loan and LAP. CIBIL 700+, age 21-65, 3-tier FOIR (45/50/60%), 4-tier ROI by CIBIL (8.50-9.85%), processing fee 0.50%.'
		},
		{
			artifact_id: 'icici-bank-hl-v1',
			lender_id: 'icici-bank',
			lender_name: 'ICICI Bank',
			classification: 'PVT' as const,
			loan_types: ICICI_BANK.loan_types,
			json_logic: ICICI_BANK as unknown as Record<string, unknown>,
			human_readable:
				'ICICI Bank rules for Home Loan and LAP. CIBIL 650+ (NRI 700+), age 21-65, 3-tier FOIR (50/55/65%), 5-tier ROI by CIBIL (8.75-9.90%), processing fee 0.50%.'
		},
		{
			artifact_id: 'axis-bank-hl-v1',
			lender_id: 'axis-bank',
			lender_name: 'Axis Bank',
			classification: 'PVT' as const,
			loan_types: AXIS_BANK.loan_types,
			json_logic: AXIS_BANK as unknown as Record<string, unknown>,
			human_readable:
				'Axis Bank rules for Home Loan and LAP. CIBIL 700+, age 21-60, 3-tier FOIR (55/60/70% — highest in market), 4-tier ROI by CIBIL (8.70-10.10%), processing fee 1.00%.'
		},
		{
			artifact_id: 'sbi-hl-v1',
			lender_id: 'sbi',
			lender_name: 'State Bank of India',
			classification: 'GOV' as const,
			loan_types: SBI_BANK.loan_types,
			json_logic: SBI_BANK as unknown as Record<string, unknown>,
			human_readable:
				'SBI rules for Home Loan, LAP and Business Loan. CIBIL 650+, age 18-70 (widest range), 3-tier FOIR (45/50/55%), 5-tier ROI by CIBIL (8.00-9.15%), processing fee 0.35%.'
		},
		{
			artifact_id: 'bajaj-housing-hl-v1',
			lender_id: 'bajaj-housing',
			lender_name: 'Bajaj Housing Finance',
			classification: 'NBFC' as const,
			loan_types: BAJAJ_HOUSING.loan_types,
			json_logic: BAJAJ_HOUSING as unknown as Record<string, unknown>,
			human_readable:
				'Bajaj Housing Finance rules for Home Loan, LAP and Business Loan. CIBIL 700+, age 23-75, max tenure 40yr, 3-tier FOIR (50/55/60%), 4-tier ROI by CIBIL (8.25-10.25%), processing fee 2.00%.'
		},
		{
			artifact_id: 'tata-capital-hl-v1',
			lender_id: 'tata-capital',
			lender_name: 'Tata Capital',
			classification: 'NBFC' as const,
			loan_types: TATA_CAPITAL.loan_types,
			json_logic: TATA_CAPITAL as unknown as Record<string, unknown>,
			human_readable:
				'Tata Capital rules for Home Loan, LAP and Business Loan. CIBIL 650+, age 24-65, 3-tier FOIR (50/55/60%), 5-tier ROI by CIBIL (8.75-10.50%), LTV 70% for >75L (stricter), processing fee 2.00%.'
		},
		{
			artifact_id: 'lic-hfl-hl-v1',
			lender_id: 'lic-hfl',
			lender_name: 'LIC Housing Finance',
			classification: 'NBFC' as const,
			loan_types: LIC_HFL.loan_types,
			json_logic: LIC_HFL as unknown as Record<string, unknown>,
			human_readable:
				'LIC Housing Finance rules for Home Loan, LAP and Business Loan. CIBIL 650+, age 21-60, conservative LTV (85% for <20L), 3-tier FOIR (50/55/60%), 5-tier ROI by CIBIL (8.00-9.50%), processing fee 0.25%.'
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
					parsed_by: 'system:real-bank-seed',
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
