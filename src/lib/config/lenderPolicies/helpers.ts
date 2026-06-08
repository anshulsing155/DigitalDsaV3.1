/**
 * Rule Builders — Expanded helpers for generating ParsedRule objects
 * ══════════════════════════════════════════════════════════════════
 * Extracted from realBankRuleDocs.ts shared helpers and expanded to cover:
 *   - All 12 income profile types (was 7)
 *   - Personal/Business/Professional loan specific gates
 *   - Configurable parameters via CategoryDefaults
 *
 * Each builder takes a lender prefix (kebab-case) and config object,
 * returns typed rule arrays compatible with ParsedLenderRuleDocument.
 * ══════════════════════════════════════════════════════════════════
 */

import type {
	ParsedRule,
	ParsedIncomeRule,
	ParsedObligationRule,
	ParsedDeviation,
	ParsedPolicy
} from '$lib/ruleEngine/types';

// ============================================================================
// 1. ELIGIBILITY RULES
// ============================================================================

export interface EligibilityConfig {
	minAge: number; // e.g., 21
	maxAge: number; // e.g., 65
	minCibil: number; // e.g., 700
	acceptsNRI: boolean;
	acceptsCompany: boolean;
	companyMinVintageYears: number; // e.g., 3
}

const INDIVIDUAL_ONLY: Record<string, unknown> = {
	'==': [{ var: 'allApplicantDetails.0.applicantType' }, 'Individual']
};

export function makeEligibilityRules(
	prefix: string,
	cfg: EligibilityConfig,
	confidence: number = 0.85
): ParsedRule[] {
	return [
		{
			rule_id: `${prefix}-elig-age`,
			description: `Applicant age must be ${cfg.minAge}-${cfg.maxAge} (individuals only)`,
			tier: 'hard_gate',
			logic: {
				and: [
					{ '>=': [{ var: 'allApplicantDetails.0.age' }, cfg.minAge] },
					{ '<=': [{ var: 'allApplicantDetails.0.age' }, cfg.maxAge] }
				]
			},
			applies_when: INDIVIDUAL_ONLY,
			fail_message: `Primary applicant age must be ${cfg.minAge}-${cfg.maxAge} years`,
			fail_category: 'age_limit',
			confidence,
			source_excerpt: `Age: ${cfg.minAge}-${cfg.maxAge} years (individuals)`
		}
	];
}

// ============================================================================
// 2. CIBIL RULES
// ============================================================================

export function makeCibilRules(
	prefix: string,
	minCibil: number,
	confidence: number = 0.9
): ParsedRule[] {
	return [
		{
			rule_id: `${prefix}-cibil-min`,
			description: `Minimum CIBIL score ${minCibil}`,
			tier: 'hard_gate',
			logic: {
				'>=': [{ var: 'allApplicantDetails.0.creditScore' }, minCibil]
			},
			fail_message: `CIBIL score must be ${minCibil} or above`,
			fail_category: 'cibil_threshold',
			confidence,
			source_excerpt: `Min CIBIL: ${minCibil}`
		}
	];
}

// ============================================================================
// 3. FOIR RULES (3-tier income-slab based)
// ============================================================================

export interface FoirConfig {
	/** FOIR cap for monthly income > highThreshold */
	highCap: number; // e.g., 0.60
	/** Income threshold for high cap (monthly) */
	highThreshold: number; // e.g., 150000
	/** FOIR cap for income between lowThreshold and highThreshold */
	midCap: number; // e.g., 0.50
	/** Income threshold for low cap */
	lowThreshold: number; // e.g., 50000
	/** FOIR cap for income < lowThreshold */
	lowCap: number; // e.g., 0.45
}

export function makeFoirRules(
	prefix: string,
	cfg: FoirConfig,
	confidence: number = 0.85
): ParsedRule[] {
	return [
		{
			rule_id: `${prefix}-foir-high`,
			description: `FOIR cap ${cfg.highCap * 100}% for income above ${(cfg.highThreshold / 1000).toFixed(0)}K`,
			tier: 'computed',
			logic: {
				if: [
					{ '>': [{ var: '_computed._total_gross_monthly' }, cfg.highThreshold] },
					cfg.highCap,
					null
				]
			},
			confidence,
			source_excerpt: `FOIR: ${cfg.highCap * 100}% for income > ${(cfg.highThreshold / 1000).toFixed(0)}K`
		},
		{
			rule_id: `${prefix}-foir-mid`,
			description: `FOIR cap ${cfg.midCap * 100}% for income ${(cfg.lowThreshold / 1000).toFixed(0)}K-${(cfg.highThreshold / 1000).toFixed(0)}K`,
			tier: 'computed',
			logic: {
				if: [
					{
						and: [
							{ '>=': [{ var: '_computed._total_gross_monthly' }, cfg.lowThreshold] },
							{ '<=': [{ var: '_computed._total_gross_monthly' }, cfg.highThreshold] }
						]
					},
					cfg.midCap,
					null
				]
			},
			confidence,
			source_excerpt: `FOIR: ${cfg.midCap * 100}% for income ${(cfg.lowThreshold / 1000).toFixed(0)}K-${(cfg.highThreshold / 1000).toFixed(0)}K`
		},
		{
			rule_id: `${prefix}-foir-low`,
			description: `FOIR cap ${cfg.lowCap * 100}% for income below ${(cfg.lowThreshold / 1000).toFixed(0)}K`,
			tier: 'computed',
			logic: {
				if: [
					{ '<': [{ var: '_computed._total_gross_monthly' }, cfg.lowThreshold] },
					cfg.lowCap,
					null
				]
			},
			confidence,
			source_excerpt: `FOIR: ${cfg.lowCap * 100}% for income < ${(cfg.lowThreshold / 1000).toFixed(0)}K`
		}
	];
}

// ============================================================================
// 4. INCOME ASSESSMENT RULES — All 12 types
// ============================================================================

export interface IncomeConfig {
	professionalHaircut: number; // e.g., 15 (%)
	businessHaircut: number; // e.g., 25
	partnershipHaircut: number; // e.g., 30
	directorHaircut: number; // e.g., 25
	pensionHaircut: number; // e.g., 0
	rentalHaircut: number; // e.g., 30
	rentalMaxContrib: number; // e.g., 50 (% of total)
	freelanceHaircut: number; // e.g., 30
	agricultureHaircut: number; // e.g., 50
	investmentHaircut: number; // e.g., 50
	contractualHaircut: number; // e.g., 10
	acceptsAgriculture: boolean;
	acceptsInvestment: boolean;
	acceptsFreelance: boolean;
}

export function makeFullIncomeRules(
	prefix: string,
	cfg: IncomeConfig,
	confidence: number = 0.85
): ParsedIncomeRule[] {
	const rules: ParsedIncomeRule[] = [
		// ── Always accepted ──────────────────────────────────
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
			rule_id: `${prefix}-inc-contractual`,
			income_profile_type: 'salaried_contractual',
			accepted: true,
			haircut_percent: cfg.contractualHaircut,
			computation_method: 'net_salary',
			confidence,
			source_excerpt: `Contractual salaried: ${100 - cfg.contractualHaircut}% of net salary`
		},
		{
			rule_id: `${prefix}-inc-professional`,
			income_profile_type: 'professional_practice',
			accepted: true,
			haircut_percent: cfg.professionalHaircut,
			computation_method: 'avg_net_profit',
			confidence,
			source_excerpt: `Professional: ${100 - cfg.professionalHaircut}% of avg net profit`
		},
		{
			rule_id: `${prefix}-inc-business`,
			income_profile_type: 'business_proprietorship',
			accepted: true,
			haircut_percent: cfg.businessHaircut,
			computation_method: 'avg_net_profit',
			confidence,
			source_excerpt: `Business proprietorship: ${100 - cfg.businessHaircut}% of avg net profit`
		},
		{
			rule_id: `${prefix}-inc-partnership`,
			income_profile_type: 'business_partnership',
			accepted: true,
			haircut_percent: cfg.partnershipHaircut,
			computation_method: 'avg_net_profit',
			confidence,
			source_excerpt: `Partnership: ${100 - cfg.partnershipHaircut}% of avg net profit`
		},
		{
			rule_id: `${prefix}-inc-director`,
			income_profile_type: 'director_company',
			accepted: true,
			haircut_percent: cfg.directorHaircut,
			computation_method: 'salary_plus_dividend',
			confidence,
			source_excerpt: `Director: ${100 - cfg.directorHaircut}% of salary + dividends`
		},
		{
			rule_id: `${prefix}-inc-pension`,
			income_profile_type: 'pension',
			accepted: true,
			haircut_percent: cfg.pensionHaircut,
			computation_method: 'pension_amount',
			confidence: 0.95,
			source_excerpt: `Pension: ${100 - cfg.pensionHaircut}% of pension`
		},
		{
			rule_id: `${prefix}-inc-rental`,
			income_profile_type: 'rental_income',
			accepted: true,
			haircut_percent: cfg.rentalHaircut,
			max_contribution_percent: cfg.rentalMaxContrib,
			computation_method: 'rent_amount',
			confidence,
			source_excerpt: `Rental: ${100 - cfg.rentalHaircut}% of rent, max ${cfg.rentalMaxContrib}% of total`
		},
		// ── Conditionally accepted ───────────────────────────
		{
			rule_id: `${prefix}-inc-freelance`,
			income_profile_type: 'freelance_consulting',
			accepted: cfg.acceptsFreelance,
			haircut_percent: cfg.acceptsFreelance ? cfg.freelanceHaircut : 100,
			computation_method: cfg.acceptsFreelance ? 'avg_monthly_income' : 'none',
			confidence,
			source_excerpt: cfg.acceptsFreelance
				? `Freelance: ${100 - cfg.freelanceHaircut}% of avg monthly income`
				: 'Freelance income: Not accepted'
		},
		{
			rule_id: `${prefix}-inc-agriculture`,
			income_profile_type: 'agriculture_income',
			accepted: cfg.acceptsAgriculture,
			haircut_percent: cfg.acceptsAgriculture ? cfg.agricultureHaircut : 100,
			max_contribution_percent: cfg.acceptsAgriculture ? 30 : 0,
			computation_method: cfg.acceptsAgriculture ? 'annual_divided_12' : 'none',
			confidence: 0.8,
			source_excerpt: cfg.acceptsAgriculture
				? `Agriculture: ${100 - cfg.agricultureHaircut}% of annual / 12, max 30% of total`
				: 'Agriculture income: Not accepted'
		},
		{
			rule_id: `${prefix}-inc-investment`,
			income_profile_type: 'investment_income',
			accepted: cfg.acceptsInvestment,
			haircut_percent: cfg.acceptsInvestment ? cfg.investmentHaircut : 100,
			max_contribution_percent: cfg.acceptsInvestment ? 25 : 0,
			computation_method: cfg.acceptsInvestment ? 'annual_divided_12' : 'none',
			confidence: 0.8,
			source_excerpt: cfg.acceptsInvestment
				? `Investment: ${100 - cfg.investmentHaircut}% of annual / 12, max 25% of total`
				: 'Investment income: Not accepted'
		},
		// ── Never accepted ───────────────────────────────────
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

	return rules;
}

// ============================================================================
// 5. LTV RULES (3-tier loan-amount based) — Secured loans only
// ============================================================================

export interface LtvConfig {
	/** LTV for loans under lowThreshold */
	lowLtv: number; // e.g., 90 (%)
	lowThreshold: number; // e.g., 3000000
	/** LTV for loans between lowThreshold and highThreshold */
	midLtv: number; // e.g., 80
	highThreshold: number; // e.g., 7500000
	/** LTV for loans above highThreshold */
	highLtv: number; // e.g., 75
	/** Max LCR (loan to registry value) */
	maxLcr?: number; // e.g., 90
}

export function makeLtvRules(
	prefix: string,
	cfg: LtvConfig,
	confidence: number = 0.85
): ParsedRule[] {
	const rules: ParsedRule[] = [
		{
			rule_id: `${prefix}-ltv-low`,
			description: `LTV ${cfg.lowLtv}% for loans under ${(cfg.lowThreshold / 100000).toFixed(0)}L`,
			tier: 'parameter',
			logic: { '<': [{ var: 'loanTransaction.loanAmount' }, cfg.lowThreshold] },
			parameter_key: 'max_ltv',
			parameter_value: cfg.lowLtv,
			confidence,
			source_excerpt: `LTV: ${cfg.lowLtv}% for < ${(cfg.lowThreshold / 100000).toFixed(0)}L`
		},
		{
			rule_id: `${prefix}-ltv-mid`,
			description: `LTV ${cfg.midLtv}% for loans ${(cfg.lowThreshold / 100000).toFixed(0)}L-${(cfg.highThreshold / 100000).toFixed(0)}L`,
			tier: 'parameter',
			logic: {
				and: [
					{ '>=': [{ var: 'loanTransaction.loanAmount' }, cfg.lowThreshold] },
					{ '<=': [{ var: 'loanTransaction.loanAmount' }, cfg.highThreshold] }
				]
			},
			parameter_key: 'max_ltv',
			parameter_value: cfg.midLtv,
			confidence,
			source_excerpt: `LTV: ${cfg.midLtv}% for ${(cfg.lowThreshold / 100000).toFixed(0)}L-${(cfg.highThreshold / 100000).toFixed(0)}L`
		},
		{
			rule_id: `${prefix}-ltv-high`,
			description: `LTV ${cfg.highLtv}% for loans above ${(cfg.highThreshold / 100000).toFixed(0)}L`,
			tier: 'parameter',
			logic: { '>': [{ var: 'loanTransaction.loanAmount' }, cfg.highThreshold] },
			parameter_key: 'max_ltv',
			parameter_value: cfg.highLtv,
			confidence,
			source_excerpt: `LTV: ${cfg.highLtv}% for > ${(cfg.highThreshold / 100000).toFixed(0)}L`
		}
	];

	if (cfg.maxLcr !== undefined) {
		rules.push({
			rule_id: `${prefix}-max-lcr`,
			description: `Maximum LCR ${cfg.maxLcr}% (Loan to Registry Value)`,
			tier: 'parameter',
			logic: { '!!': [true] },
			parameter_key: 'max_lcr',
			parameter_value: cfg.maxLcr,
			confidence: 0.8,
			source_excerpt: `LCR up to ${cfg.maxLcr}%`
		});
	}

	return rules;
}

// ============================================================================
// 6. OBLIGATION RULES
// ============================================================================

export interface ObligationConfig {
	termLoanCountFactor: number; // e.g., 1.0
	ignoreIfClosing: boolean; // e.g., true
	creditLineMethod: 'percentage_of_limit' | 'actual_emi' | 'minimum_payment';
	creditLineFactor: number; // e.g., 0.05 (5% of limit)
}

export function makeObligationRules(
	prefix: string,
	cfg: ObligationConfig = {
		termLoanCountFactor: 1.0,
		ignoreIfClosing: true,
		creditLineMethod: 'percentage_of_limit',
		creditLineFactor: 0.05
	}
): ParsedObligationRule[] {
	return [
		{
			rule_id: `${prefix}-obl-term`,
			obligation_type: 'term_loan',
			treatment: {
				count_factor: cfg.termLoanCountFactor,
				ignore_if_closing: cfg.ignoreIfClosing
			},
			confidence: 0.95,
			source_excerpt: `Term loans at ${cfg.termLoanCountFactor * 100}%, ${cfg.ignoreIfClosing ? 'ignore if closing' : 'count even if closing'}`
		},
		{
			rule_id: `${prefix}-obl-credit`,
			obligation_type: 'credit_line',
			treatment: {
				count_factor: 1.0,
				ignore_if_closing: false,
				credit_line_method: cfg.creditLineMethod,
				credit_line_factor: cfg.creditLineFactor
			},
			confidence: 0.9,
			source_excerpt: `Credit lines at ${cfg.creditLineFactor * 100}% of limit`
		}
	];
}

// ============================================================================
// 7. TENURE RULES
// ============================================================================

export interface TenureConfig {
	maxTenureMonths: number; // e.g., 360 (30 years)
	maxAgeAtMaturity: number; // e.g., 65
}

export function makeTenureRules(
	prefix: string,
	cfg: TenureConfig,
	confidence: number = 0.9
): ParsedRule[] {
	return [
		{
			rule_id: `${prefix}-tenure-max`,
			description: `Max tenure ${cfg.maxTenureMonths / 12} years`,
			tier: 'parameter',
			logic: { '!!': [true] },
			parameter_key: 'max_tenure_months',
			parameter_value: cfg.maxTenureMonths,
			confidence,
			source_excerpt: `Max tenure: ${cfg.maxTenureMonths / 12} years`
		},
		{
			rule_id: `${prefix}-age-maturity`,
			description: `Max age at maturity ${cfg.maxAgeAtMaturity}`,
			tier: 'parameter',
			logic: { '!!': [true] },
			parameter_key: 'max_age_at_maturity',
			parameter_value: cfg.maxAgeAtMaturity,
			confidence,
			source_excerpt: `Age at maturity: max ${cfg.maxAgeAtMaturity} years`
		}
	];
}

// ============================================================================
// 8. ROI RULES (CIBIL-slab based)
// ============================================================================

export interface RoiConfig {
	/** ROI for CIBIL 780+ */
	premiumRate: number;
	/** ROI for CIBIL 750-779 */
	standardRate: number;
	/** ROI for CIBIL 700-749 */
	baseRate: number;
	/** ROI for CIBIL below 700 (if gate passes via deviation) */
	fallbackRate: number;
}

export function makeRoiRules(
	prefix: string,
	cfg: RoiConfig,
	confidence: number = 0.85
): ParsedRule[] {
	return [
		{
			rule_id: `${prefix}-roi-premium`,
			description: `ROI ${cfg.premiumRate}% for CIBIL 780+`,
			tier: 'parameter',
			logic: { '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 780] },
			parameter_key: 'roi',
			parameter_value: cfg.premiumRate,
			confidence,
			source_excerpt: `ROI: ${cfg.premiumRate}% for CIBIL 780+`
		},
		{
			rule_id: `${prefix}-roi-standard`,
			description: `ROI ${cfg.standardRate}% for CIBIL 750-779`,
			tier: 'parameter',
			logic: {
				and: [
					{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 750] },
					{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 780] }
				]
			},
			parameter_key: 'roi',
			parameter_value: cfg.standardRate,
			confidence,
			source_excerpt: `ROI: ${cfg.standardRate}% for CIBIL 750-779`
		},
		{
			rule_id: `${prefix}-roi-base`,
			description: `ROI ${cfg.baseRate}% for CIBIL 700-749`,
			tier: 'parameter',
			logic: {
				and: [
					{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
					{ '<': [{ var: 'allApplicantDetails.0.creditScore' }, 750] }
				]
			},
			parameter_key: 'roi',
			parameter_value: cfg.baseRate,
			confidence: 0.8,
			source_excerpt: `ROI: ${cfg.baseRate}% for CIBIL 700-749`
		},
		{
			rule_id: `${prefix}-roi-fallback`,
			description: `ROI ${cfg.fallbackRate}% fallback for CIBIL below 700`,
			tier: 'parameter',
			logic: { '<': [{ var: 'allApplicantDetails.0.creditScore' }, 700] },
			parameter_key: 'roi',
			parameter_value: cfg.fallbackRate,
			confidence: 0.75,
			source_excerpt: `ROI: ${cfg.fallbackRate}% for CIBIL < 700 (if gate passes via deviation)`
		}
	];
}

// ============================================================================
// 9. FEES RULES
// ============================================================================

export function makeFeeRules(
	prefix: string,
	processingFeePercent: number,
	confidence: number = 0.85
): ParsedRule[] {
	return [
		{
			rule_id: `${prefix}-fee-processing`,
			description: `Processing fee ${processingFeePercent}%`,
			tier: 'parameter',
			logic: { '!!': [true] },
			parameter_key: 'processing_fee_percent',
			parameter_value: processingFeePercent,
			confidence,
			source_excerpt: `Processing: ${processingFeePercent}%`
		}
	];
}

// ============================================================================
// 10. NRI GATE
// ============================================================================

export function makeNriGate(prefix: string): ParsedRule {
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

// ============================================================================
// 11. COMPANY GATE
// ============================================================================

export function makeCompanyGate(prefix: string, minYears: number): ParsedRule {
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

// ============================================================================
// 12. STANDARD DEVIATION — CIBIL relaxation
// ============================================================================

export function makeStandardCibilDeviation(
	prefix: string,
	minCibil: number,
	relaxedCibil: number,
	incomeThreshold: number
): ParsedDeviation {
	return {
		deviation_id: `${prefix}-dev-cibil`,
		description: `CIBIL relaxed to ${relaxedCibil} for income above ${(incomeThreshold / 100000).toFixed(1)}L`,
		deviates_from: `${prefix}-cibil-min`,
		condition: {
			and: [
				{ '>=': [{ var: 'allApplicantDetails.0.creditScore' }, relaxedCibil] },
				{ '>': [{ var: '_computed._total_gross_monthly' }, incomeThreshold] }
			]
		},
		approval_authority: 'branch_manager',
		max_deviation: `CIBIL ${relaxedCibil}-${minCibil - 1}`,
		probability_modifier: -0.1,
		confidence: 0.8,
		source_excerpt: `Deviation: CIBIL relax to ${relaxedCibil} for income > ${(incomeThreshold / 100000).toFixed(1)}L`
	};
}

// ============================================================================
// 13. STANDARD DISPLAY POLICIES
// ============================================================================

export function makeStandardPolicies(cfg: {
	processingFeePercent: number;
	maxAgeAtMaturity: number;
	turnaroundDays: string;
	roiType: 'Floating' | 'Fixed' | 'Floating (Linked to RLLR/EBLR)';
}): ParsedPolicy[] {
	return [
		{
			policy_key: 'processing_fee_percent',
			label: 'Processing Fee',
			value: cfg.processingFeePercent,
			display_on_offer_card: true,
			category: 'processing_fee'
		},
		{
			policy_key: 'max_age',
			label: 'Maximum Age at Maturity',
			value: cfg.maxAgeAtMaturity,
			display_on_offer_card: false,
			category: 'eligibility'
		},
		{
			policy_key: 'turnaround_days',
			label: 'Expected Turnaround',
			value: cfg.turnaroundDays,
			display_on_offer_card: true,
			category: 'service'
		},
		{
			policy_key: 'roi_type',
			label: 'Interest Rate Type',
			value: cfg.roiType,
			display_on_offer_card: true,
			category: 'roi_structure'
		}
	];
}
