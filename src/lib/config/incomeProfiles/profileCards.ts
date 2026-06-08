/**
 * Income Profile Card Definitions
 * ═══════════════════════════════════════════════════════════════════
 * Defines the selectable income profile cards shown in Tab 1.
 * Each card represents a category of income the applicant can declare.
 *
 * Rules:
 * - Applicant can select MULTIPLE profiles (multi-select)
 * - 'no_current_income' is EXCLUSIVE — cannot combine with earning profiles
 * - Cash income is ONLY allowed for business/self-employed profiles
 * - Each selected profile generates a form in Tab 2
 * ═══════════════════════════════════════════════════════════════════
 */

import type { IncomeProfileCard, IncomeProfileType } from '$lib/types/incomeProfile';

export const INCOME_PROFILE_CARDS: IncomeProfileCard[] = [
	{
		type: 'salaried_regular',
		label: 'Salaried - Regular',
		description: 'Full-time employment (Govt / Private / PSU)',
		icon: 'Building2',
		category: 'employment_business',
		allowsCashIncome: false,
		exclusive: false
	},
	{
		type: 'salaried_contractual',
		label: 'Salaried - Contractual',
		description: 'Third-party payroll, staffing agency, contract',
		icon: 'FileText',
		category: 'employment_business',
		allowsCashIncome: false,
		exclusive: false
	},
	{
		type: 'business_proprietorship',
		label: 'Business Owner',
		description: 'Sole proprietorship / Individual business',
		icon: 'Store',
		category: 'employment_business',
		allowsCashIncome: true,
		exclusive: false,
		showWhen: {
			'==': ['isNRI', 'No']
		}
	},
	{
		type: 'business_partnership',
		label: 'Partner in Firm',
		description: 'Partner in Partnership / LLP firm',
		icon: 'Handshake',
		category: 'employment_business',
		allowsCashIncome: false,
		exclusive: false,
		showWhen: {
			'==': ['isNRI', 'No']
		}
	},
	{
		type: 'director_company',
		label: 'Director in Company',
		description: 'Director in Pvt Ltd / OPC / Public Ltd',
		icon: 'Briefcase',
		category: 'employment_business',
		allowsCashIncome: false,
		exclusive: false,
		// NRI directors of Indian companies ARE valid for secured loans —
		// the company is Indian even if the director lives abroad.
		// For unsecured loans the NRI restriction still applies via the
		// profile compatibility cleanup in IncomePageNew ($effect block).
		showWhen: {
			or: [
				{ '==': ['isNRI', 'No'] },
				// NRI + linked to a company = director of Indian company (allowed in secured)
				{ '!=': ['__linkedCompanyCount', 0] }
			]
		}
	},
	{
		type: 'professional_practice',
		label: 'Professional Practice',
		description: 'Doctor, CA, Lawyer, Architect with own practice',
		icon: 'Stethoscope',
		category: 'employment_business',
		allowsCashIncome: true,
		exclusive: false,
		showWhen: {
			and: [
				{ '==': ['isNRI', 'No'] },
				// Lenders require professional qualification — hide for 12th/10th/below.
				// Values match educationOptions in ApplicantProfilePage.svelte exactly:
				// '12th_pass' / '10th_pass' / 'below_10th'. Earlier camelCase values
				// (twelvePass / tenPass / belowTen) were a typo that silently never
				// matched, leaving Professional Practice visible to all education levels.
				// showWhenEngine.ts treats the first arg as a path string directly —
				// no { var: ... } wrapping needed (matches the '==' / 'in' pattern used
				// elsewhere in this file).
				{ not: { in: ['education', ['12th_pass', '10th_pass', 'below_10th']] } }
			]
		}
	},
	{
		type: 'pension',
		label: 'Pension',
		description: 'Government / Military / Corporate pension',
		icon: 'Landmark',
		category: 'employment_business',
		allowsCashIncome: false,
		exclusive: false
	},
	{
		type: 'rental_income',
		label: 'Rental Income',
		description: 'Income from rented property',
		icon: 'Home',
		category: 'other_income',
		allowsCashIncome: false,
		exclusive: false
	},
	{
		type: 'freelance_consulting',
		label: 'Freelance / Consulting',
		description: 'Project-based, gig work, consulting',
		icon: 'Laptop',
		category: 'other_income',
		allowsCashIncome: false,
		exclusive: false
	},
	{
		type: 'agriculture_income',
		label: 'Agriculture Income',
		description: 'Farm income, crop production',
		icon: 'Sprout',
		category: 'other_income',
		allowsCashIncome: false,
		exclusive: false,
		showWhen: {
			'==': ['isNRI', 'No']
		}
	},
	{
		type: 'investment_income',
		label: 'Investment Income',
		description: 'Dividends, interest, capital gains',
		icon: 'TrendingUp',
		category: 'other_income',
		allowsCashIncome: false,
		exclusive: false
	},
	{
		type: 'no_current_income',
		label: 'No Current Income',
		description: 'HomeMaker, Student, Between jobs, Maternity',
		icon: 'UserX',
		category: 'other_income',
		allowsCashIncome: false,
		exclusive: true,
		showWhen: {
			and: [{ '==': ['isNRI', 'No'] }, { '!=': ['onEMI', true] }]
		}
	}
];

// ═══════════════════════════════════════════════════════════════════
// NO-INCOME REASON SUBCATEGORY
// ═══════════════════════════════════════════════════════════════════

export const NO_INCOME_REASON_OPTIONS = [
	{ label: 'Homemaker', value: 'homemaker' },
	{ label: 'Student', value: 'student' },
	{ label: 'Retired (No Pension)', value: 'retired_no_pension' },
	{ label: 'Between Jobs / Unemployed', value: 'between_jobs' },
	{ label: 'Dependent Minor', value: 'dependent_minor' }
];

/**
 * Get profile card definition by type
 */
export function getProfileCard(type: IncomeProfileType): IncomeProfileCard | undefined {
	return INCOME_PROFILE_CARDS.find((card) => card.type === type);
}

/**
 * Get all earning profile types (excludes 'no_current_income')
 */
export function getEarningProfileTypes(): IncomeProfileType[] {
	return INCOME_PROFILE_CARDS.filter((card) => !card.exclusive).map((card) => card.type);
}

// ═══════════════════════════════════════════════════════════════════
// LOAN-TYPE AWARE PROFILE ORDERING
// ═══════════════════════════════════════════════════════════════════
// Each unsecured loan type has a set of "recommended" profiles that
// appear first in the selector. All other profiles remain visible
// but are sorted below the recommended ones. This is purely a UX
// convenience — it does NOT restrict profile selection.

/** Profiles most relevant per unsecured loan type */
const RECOMMENDED_BY_LOAN: Record<string, IncomeProfileType[]> = {
	'Personal Loan': ['salaried_regular', 'salaried_contractual', 'professional_practice'],
	'Professional Loan': ['professional_practice', 'salaried_regular', 'salaried_contractual'],
	'Business Loan': [
		'business_proprietorship',
		'business_partnership',
		'director_company',
		'professional_practice'
	]
};

/**
 * Returns profile cards ordered by loan-type relevance.
 * Recommended profiles appear first, then remaining profiles
 * in their original order. This is strictly cosmetic — all
 * profiles are still selectable.
 *
 * @param loanName - e.g. "Personal Loan", "Business Loan"
 * @returns Sorted copy of INCOME_PROFILE_CARDS with `recommended` flag
 */
export function getProfileCardsForLoan(
	loanName?: string
): (IncomeProfileCard & { recommended: boolean })[] {
	const recommended = loanName ? (RECOMMENDED_BY_LOAN[loanName] ?? []) : [];
	const recommendedSet = new Set(recommended);

	// Tag each card with recommended flag
	const tagged = INCOME_PROFILE_CARDS.map((card) => ({
		...card,
		recommended: recommendedSet.has(card.type)
	}));

	// Sort: recommended first (preserving original order within groups)
	if (recommended.length === 0) return tagged;

	const first = tagged.filter((c) => c.recommended);
	const rest = tagged.filter((c) => !c.recommended);
	return [...first, ...rest];
}

/**
 * Check if a profile type allows cash income declaration
 */
export function allowsCashIncome(type: IncomeProfileType): boolean {
	return getProfileCard(type)?.allowsCashIncome ?? false;
}

/**
 * Derive the legacy employmentType from selected profiles.
 * This keeps backward compatibility with existing data structures
 * and lender submission formats.
 *
 * Priority order:
 * 1. If has salaried_regular → 'Salaried(Private)' or 'Salaried(Government)'
 * 2. If has professional_practice → 'Self-employed(Professional)'
 * 3. If has business_proprietorship or business_partnership → 'Self-employed(Other)'
 * 4. If has director_company → 'Self-employed(Other)'
 * 5. If has pension only → 'Pensioner'
 * 6. If no_current_income → 'HomeMaker'
 * 7. Fallback → 'Others'
 *
 * Note: The sub-type (Government vs Private) is determined from the
 * salaried specifics within the income source entry.
 */
export function deriveLegacyEmploymentType(
	selectedProfiles: IncomeProfileType[],
	specifics?: Record<string, unknown>
): string {
	if (selectedProfiles.includes('salaried_regular')) {
		// Check if government employee from specifics
		const isGovt = specifics?.employerType === 'government' || specifics?.employerType === 'psu';
		return isGovt ? 'Salaried(Government)' : 'Salaried(Private)';
	}
	if (selectedProfiles.includes('salaried_contractual')) {
		return 'Salaried(Private)';
	}
	if (selectedProfiles.includes('professional_practice')) {
		return 'Self-employed(Professional)';
	}
	if (
		selectedProfiles.includes('business_proprietorship') ||
		selectedProfiles.includes('business_partnership') ||
		selectedProfiles.includes('director_company')
	) {
		return 'Self-employed(Other)';
	}
	if (selectedProfiles.includes('pension')) {
		return 'Pensioner';
	}
	if (selectedProfiles.includes('no_current_income')) {
		const reason = specifics?.noIncomeReason as string;
		if (reason === 'retired_no_pension') return 'Pensioner';
		if (reason === 'student') return 'Student';
		return 'HomeMaker'; // homemaker, between_jobs, dependent_minor
	}
	return 'Others';
}

// ═══════════════════════════════════════════════════════════════════
// AUTO-SELECTION FOR UNSECURED LOANS
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns the income profile(s) to auto-select (pre-check) when
 * adding an applicant in an unsecured loan form.
 *
 * Called from AddApplicantPersonal / Business / Professional when
 * saving a new applicant to formState.applicants[].
 */
export function getAutoSelectedProfiles(context: {
	loanCategory: 'personal' | 'business' | 'professional';
	applicantType: 'Individual' | 'Company';
	businessEntityType?: string;
}): IncomeProfileType[] {
	// Companies don't have personal income profiles
	if (context.applicantType === 'Company') return [];

	switch (context.loanCategory) {
		case 'business': {
			if (context.businessEntityType === 'proprietorship') return ['business_proprietorship'];
			if (context.businessEntityType === 'partnership' || context.businessEntityType === 'llp')
				return ['business_partnership'];
			// private_limited, opc
			return ['director_company'];
		}
		case 'professional':
			return ['professional_practice'];
		default:
			return [];
	}
}

/**
 * Validate profile selection rules:
 * - 'no_current_income' cannot be combined with earning profiles
 * - At least one profile must be selected
 */
export function validateProfileSelection(selectedProfiles: IncomeProfileType[]): {
	valid: boolean;
	error?: string;
} {
	if (selectedProfiles.length === 0) {
		return { valid: false, error: 'Please select at least one income source' };
	}

	if (selectedProfiles.includes('no_current_income') && selectedProfiles.length > 1) {
		return {
			valid: false,
			error: '"No Current Income" cannot be combined with other income sources'
		};
	}

	return { valid: true };
}
