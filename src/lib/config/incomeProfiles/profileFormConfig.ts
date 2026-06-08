/**
 * Profile Form Configuration
 * ═══════════════════════════════════════════════════════════════════
 * Defines the specifics questions and income fields for each
 * income profile type. These are rendered dynamically in Tab 2
 * when the user selects a profile from the dropdown and fills the form.
 *
 * IMPORTANT: This file uses the SAME question/option structure as
 * existing config files (salariedQuestion.json, etc.) so that the
 * existing MultiSelectFieldWithSwitchButton, RadioField, SelectField,
 * TextField components can render them without modification.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { IncomeProfileType } from '$lib/types/incomeProfile';

// ============================================================================
// QUESTION TYPES used in specifics forms
// ============================================================================

export interface SpecificsQuestion {
	/** Unique question identifier */
	id: string;
	/** Key to store the answer under in specifics object */
	key: string;
	/** Question type: determines which component renders it */
	type:
		| 'radio'
		| 'select'
		| 'text'
		| 'number'
		| 'multiple-select'
		| 'calendar'
		| 'month-year'
		| 'percentage';
	/** Question text shown to user */
	question: string;
	/** Whether this question must be answered */
	required: boolean;
	/** Options for radio/select types */
	options?: {
		label: string;
		value: string | number | boolean;
		showWhen?: Record<string, unknown>;
	}[];
	/** Conditional visibility based on other specifics answers */
	showWhen?: Record<string, unknown>;
	/** Description or helper text (supports HTML) */
	description?: string;
	/** Description header text */
	descriptionHeader?: string;
	/** Icon name for the field */
	icon?: string;
	/** Placeholder text */
	placeholder?: string;
	/** Sub-label for select placeholder (generates "Select {subLabel}") */
	subLabel?: string;
	/** Show number in words below the field */
	showNumberInWords?: boolean;
	/** Maximum value (for number fields) */
	max?: number;
	/** Minimum value (for number fields) */
	min?: number;
	/** Max input length */
	maxLength?: number;
	/** Validation rules */
	validation?: Record<string, unknown>;
	/** Options description text */
	optionsDescription?: string;
	/** Error message when invalidated */
	errorMessage?: string;
	/** If true, answering 'false' invalidates / blocks this entry */
	invalidateOn?: boolean;
}

export interface IncomeField {
	/** Unique field identifier */
	id: string;
	/** Key to store the value under in income object */
	key: string;
	/** Field type */
	type: 'number' | 'select' | 'radio' | 'table';
	/** Field label */
	label: string;
	/** Whether required */
	required: boolean;
	/** Icon name */
	icon?: string;
	/** Placeholder */
	placeholder?: string;
	/** Sub-label for select placeholder (generates "Select {subLabel}") */
	subLabel?: string;
	/** Show number in words */
	showNumberInWords?: boolean;
	/** Conditional visibility */
	showWhen?: Record<string, unknown>;
	/** Description / helper text (supports HTML) */
	description?: string;
	/** Options for select/radio */
	options?: {
		label: string;
		value: string | number | boolean;
		showWhen?: Record<string, unknown>;
	}[];
	/** Validation */
	validation?: Record<string, unknown>;
	/** For table type — table meta config */
	uiMeta?: Record<string, unknown>;
	/** Min/Max */
	min?: number;
	max?: number;
}

// ============================================================================
// DROPDOWN LABELS & ENTITY NAME LABELS
// ============================================================================

const DROPDOWN_LABELS: Record<IncomeProfileType, string> = {
	salaried_regular: 'Salaried Employment',
	salaried_contractual: 'Contractual / Third-party Employment',
	business_proprietorship: 'Business (Proprietorship)',
	business_partnership: 'Partner in Firm',
	director_company: 'Director in Company',
	professional_practice: 'Professional Practice',
	pension: 'Pension Income',
	rental_income: 'Rental Income',
	freelance_consulting: 'Freelance / Consulting',
	agriculture_income: 'Agriculture Income',
	investment_income: 'Investment Income',
	no_current_income: 'No Current Income'
};

const ENTITY_NAME_LABELS: Record<IncomeProfileType, string> = {
	salaried_regular: 'Employer Name',
	salaried_contractual: 'Employer / Staffing Agency Name',
	business_proprietorship: 'Business / Firm Name',
	business_partnership: 'Partnership / LLP Firm Name',
	director_company: 'Company Name',
	professional_practice: 'Practice / Clinic Name',
	pension: 'Pension Source (Department / Organization)',
	rental_income: 'Property Description',
	freelance_consulting: 'Primary Client / Nature of Work',
	agriculture_income: 'Farm / Land Description',
	investment_income: 'Investment Type',
	no_current_income: ''
};

const ENTITY_NAME_PLACEHOLDERS: Record<IncomeProfileType, string> = {
	salaried_regular: 'Enter employer name',
	salaried_contractual: 'Enter employer or staffing agency name',
	business_proprietorship: 'Enter business or trade name',
	business_partnership: 'Enter partnership or LLP firm name',
	director_company: 'Enter company name',
	professional_practice: 'Enter practice or clinic name',
	pension: 'Enter department or organization name',
	rental_income: 'E.g., 2BHK Flat - Andheri West',
	freelance_consulting: 'E.g., IT Consulting, Content Writing',
	agriculture_income: 'E.g., 5 acres - Sugarcane - Pune',
	investment_income: 'E.g., Mutual Funds, FDs, Stocks',
	no_current_income: ''
};

export function getDropdownLabel(type: IncomeProfileType): string {
	return DROPDOWN_LABELS[type] ?? type;
}

export function getEntityNameLabel(type: IncomeProfileType): string {
	return ENTITY_NAME_LABELS[type] ?? 'Name / Description';
}

export function getEntityNamePlaceholder(type: IncomeProfileType): string {
	return ENTITY_NAME_PLACEHOLDERS[type] ?? 'Enter name';
}

// ============================================================================
// SPECIFICS QUESTIONS PER PROFILE TYPE
// ============================================================================

/**
 * Returns the specifics questions for a given profile type.
 * These are the yes/no confirmations and detail fields shown
 * in the "Specifics" section of the add-entry form.
 */
export function getSpecificsForProfile(type: IncomeProfileType): SpecificsQuestion[] {
	switch (type) {
		case 'salaried_regular':
			return SALARIED_REGULAR_SPECIFICS;
		case 'salaried_contractual':
			return SALARIED_CONTRACTUAL_SPECIFICS;
		case 'business_proprietorship':
			return BUSINESS_PROPRIETORSHIP_SPECIFICS;
		case 'business_partnership':
			return PARTNER_SPECIFICS;
		case 'director_company':
			return DIRECTOR_SPECIFICS;
		case 'professional_practice':
			return PROFESSIONAL_SPECIFICS;
		case 'pension':
			return PENSION_SPECIFICS;
		case 'rental_income':
			return RENTAL_SPECIFICS;
		case 'freelance_consulting':
			return FREELANCE_SPECIFICS;
		case 'agriculture_income':
			return AGRICULTURE_SPECIFICS;
		case 'investment_income':
			return INVESTMENT_SPECIFICS;
		case 'no_current_income':
			return NO_INCOME_SPECIFICS;
		default:
			return [];
	}
}

/**
 * Returns the income fields for a given profile type.
 * These are the financial amount inputs shown in the
 * "Income from this source" section of the add-entry form.
 */
export function getIncomeFieldsForProfile(type: IncomeProfileType): IncomeField[] {
	switch (type) {
		case 'salaried_regular':
		case 'salaried_contractual':
			return SALARIED_INCOME_FIELDS;
		case 'business_proprietorship':
			return BUSINESS_INCOME_FIELDS;
		case 'business_partnership':
			return PARTNER_INCOME_FIELDS;
		case 'director_company':
			return DIRECTOR_INCOME_FIELDS;
		case 'professional_practice':
			return PROFESSIONAL_INCOME_FIELDS;
		case 'pension':
			return PENSION_INCOME_FIELDS;
		case 'rental_income':
			return RENTAL_INCOME_FIELDS;
		case 'freelance_consulting':
			return FREELANCE_INCOME_FIELDS;
		case 'agriculture_income':
			return AGRICULTURE_INCOME_FIELDS;
		case 'investment_income':
			return INVESTMENT_INCOME_FIELDS;
		case 'no_current_income':
			return [];
		default:
			return [];
	}
}

// ============================================================================
// SALARIED (REGULAR) — Specifics
// Reuses existing salariedQuestion patterns with employer categorization
// ============================================================================

const SALARIED_REGULAR_SPECIFICS: SpecificsQuestion[] = [
	{
		id: 'sq_employerType',
		key: 'employerType',
		type: 'select',
		question: 'Employer type',
		required: true,
		icon: 'Building2',
		subLabel: 'employer type',
		options: [
			{ label: 'Private - Listed / MNC / Reputed', value: 'private_reputed' },
			{ label: 'Private - Unlisted / SME / Startup', value: 'private_other' },
			{ label: 'Private - Proprietorship / Partnership Firm', value: 'private_small' },
			{ label: 'Central Government / PSU', value: 'government' },
			{ label: 'State Government / PSU', value: 'state_government' },
			{ label: 'Defence / Paramilitary', value: 'defence' }
		]
	},
	{
		id: 'sq_employerSharesFinancials',
		key: 'employerSharesFinancials',
		type: 'select',
		question: 'Employer ready to share financials with bank?',
		required: true,
		icon: 'FileSpreadsheet',
		options: [
			{ label: 'Yes', value: 'Yes' },
			{ label: 'No', value: 'No' }
		],
		showWhen: {
			'==': ['employerType', 'private_small']
		}
	},
	{
		id: 'sq_companySize',
		key: 'companySize',
		type: 'select',
		question: 'Company has more than 100 employees?',
		required: true,
		icon: 'Users',
		options: [
			{ label: 'Yes', value: 'Yes' },
			{ label: 'No', value: 'No' }
		],
		showWhen: {
			'==': ['employerType', 'private_other']
		}
	},
	{
		id: 'sq_positionType',
		key: 'positionType',
		type: 'select',
		question: 'Employment position type',
		required: true,
		icon: 'UserCheck',
		subLabel: 'position type',
		// Government/Defence employees are always permanent — skip this question.
		// Auto-default handled via $effect in IncomeSourceForm.svelte.
		showWhen: {
			not: {
				in: ['employerType', ['government', 'state_government', 'defence']]
			}
		},
		options: [
			{ label: 'Permanent / Confirmed', value: 'permanent' },
			{ label: 'Probation', value: 'probation' }
		],
		description:
			'For contractual or third-party payroll, use the "Salaried - Contractual" income profile instead.'
	},
	{
		id: 'sq_pfDeducted',
		key: 'pfDeducted',
		type: 'select',
		question: 'PF gets deducted from salary?',
		required: true,
		icon: 'ShieldCheck',
		// Government/Defence always have PF — skip entirely.
		// Private-reputed: skip only if confirmed permanent.
		showWhen: {
			and: [
				{
					not: {
						in: ['employerType', ['government', 'state_government', 'defence']]
					}
				},
				{
					not: {
						and: [
							{ '==': ['employerType', 'private_reputed'] },
							{ '==': ['positionType', 'permanent'] }
						]
					}
				}
			]
		},
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'sq_salaryInBank',
		key: 'salaryInBank',
		type: 'select',
		question: 'Salary is credited regularly to a bank account?',
		required: true,
		icon: 'Landmark',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		],
		showWhen: {
			not: {
				in: ['employerType', ['government', 'state_government', 'defence', 'private_reputed']]
			}
		},
		invalidateOn: false,
		errorMessage:
			'Lenders only consider salary credited to a bank account. Cash salary is not accepted as documented income, even with ITR. Please verify the answer or choose a different income source.'
	},
	{
		id: 'sq_yearsWithEmployer',
		key: 'yearsWithEmployer',
		type: 'select',
		question: 'How long with current employer?',
		required: true,
		icon: 'Calendar',
		subLabel: 'duration',
		options: [
			{ label: 'Less than 6 months', value: 'lt_6m' },
			{ label: '6 months - 1 year', value: '6m_1y' },
			{ label: '1 - 2 years', value: '1_2y' },
			{ label: '2 - 5 years', value: '2_5y' },
			{ label: 'More than 5 years', value: 'gt_5y' }
		]
	},
	{
		id: 'sq_companyHas3YearsITR',
		key: 'companyHas3YearsITR',
		type: 'select',
		question: 'Has the employer company filed at least 3 years of Income Tax Returns (ITR)?',
		required: true,
		icon: 'FileCheck',
		options: [
			{ label: 'Yes', value: 'Yes' },
			{ label: 'No', value: 'No' },
			{ label: "Don't know", value: 'Unknown' }
		],
		showWhen: {
			and: [
				{ in: ['employerType', ['private_other', 'private_small']] },
				{ in: ['yearsWithEmployer', ['lt_6m', '6m_1y', '1_2y']] }
			]
		},
		description:
			'Banks typically require the employer company to have at least 3 years of ITR filing history (business vintage) for salary income to be considered. This helps confirm the company is established and stable.'
	},
	{
		id: 'sq_totalExperience',
		key: 'totalExperience',
		type: 'select',
		question: 'Total work experience',
		required: true,
		icon: 'Briefcase',
		subLabel: 'experience',
		options: [
			// Options filtered by yearsWithEmployer — total experience must be >= employer tenure
			{
				label: 'Less than 1 year',
				value: 'lt_1y',
				showWhen: { in: ['yearsWithEmployer', ['lt_6m', '6m_1y', '']] }
			},
			{
				label: '1 - 3 years',
				value: '1_3y',
				showWhen: { in: ['yearsWithEmployer', ['lt_6m', '6m_1y', '1_2y', '']] }
			},
			{ label: '3 - 5 years', value: '3_5y' },
			{ label: 'More than 5 years', value: 'gt_5y' }
		]
	},
	{
		id: 'sq_receivesForm16',
		key: 'receivesForm16',
		type: 'select',
		question: 'Receives Form 16 regularly?',
		required: true,
		icon: 'FileText',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		],
		showWhen: {
			not: {
				in: ['employerType', ['government', 'state_government', 'defence', 'private_reputed']]
			}
		}
	},
	{
		id: 'sq_itrFiled',
		key: 'itrFiled',
		type: 'select',
		question: 'Files Income Tax (ITR) regularly?',
		required: true,
		icon: 'FileCheck',
		// Government/Defence/Private-Reputed employees always file ITR — skip this question.
		// private_reputed includes MNCs and large companies where ITR filing is standard practice.
		// Intentional business decision: reduces friction for the majority case.
		showWhen: {
			not: {
				in: ['employerType', ['government', 'state_government', 'defence', 'private_reputed']]
			}
		},
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'sq_receivesBonus',
		key: 'receivesBonus',
		type: 'select',
		question: 'Receives performance bonus / incentive?',
		required: false,
		icon: 'Gift',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	// Defence-specific questions
	{
		id: 'sq_defencePosting',
		key: 'defencePosting',
		type: 'select',
		question: 'Posted in non-accessible / restricted area?',
		required: true,
		icon: 'MapPin',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		],
		showWhen: {
			'==': ['employerType', 'defence']
		}
	},
	{
		id: 'sq_alternateAddress',
		key: 'alternateAddress',
		type: 'select',
		question: 'Alternate address available for verification?',
		required: true,
		icon: 'Home',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		],
		showWhen: {
			and: [{ '==': ['employerType', 'defence'] }, { '==': ['defencePosting', true] }]
		}
	},
	{
		id: 'sq_pensionEligible',
		key: 'pensionEligible',
		type: 'select',
		question: 'Eligible for pension after retirement?',
		required: false,
		icon: 'Shield',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		],
		showWhen: {
			in: ['employerType', ['government', 'state_government', 'defence']]
		}
	}
];

// ============================================================================
// SALARIED (CONTRACTUAL) — Specifics
// ============================================================================

const SALARIED_CONTRACTUAL_SPECIFICS: SpecificsQuestion[] = [
	{
		id: 'sc_payrollType',
		key: 'payrollType',
		type: 'select',
		question: 'Payroll arrangement',
		required: true,
		icon: 'FileText',
		options: [
			{ label: 'Third-party payroll (staffing agency)', value: 'third_party' },
			{ label: 'Direct contract with employer', value: 'direct_contract' },
			{ label: 'Fixed-term employment', value: 'fixed_term' }
		],
		description:
			'Lenders may treat contractual employment as self-employed income. Ensure you have contract copies and bank statements as proof.'
	},
	{
		id: 'sc_contractDuration',
		key: 'contractDuration',
		type: 'select',
		question: 'Current contract duration remaining',
		required: true,
		icon: 'Calendar',
		options: [
			{ label: 'Less than 6 months', value: 'lt_6m' },
			{ label: '6 months - 1 year', value: '6m_1y' },
			{ label: '1 - 2 years', value: '1_2y' },
			{ label: 'More than 2 years', value: 'gt_2y' },
			{ label: 'Rolling / No fixed end', value: 'rolling' }
		]
	},
	{
		id: 'sc_salaryInBank',
		key: 'salaryInBank',
		type: 'select',
		question: 'Salary is credited regularly to a bank account?',
		required: true,
		icon: 'Landmark',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		],
		invalidateOn: false,
		errorMessage: 'Regular bank credits are required for processing.'
	},
	{
		id: 'sc_hasContractCopy',
		key: 'hasContractCopy',
		type: 'select',
		question: 'Contract / appointment letter available?',
		required: true,
		icon: 'FileText',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'sc_itrFiled',
		key: 'itrFiled',
		type: 'select',
		question: 'Files ITR regularly?',
		required: true,
		icon: 'FileCheck',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'sc_totalContractExperience',
		key: 'totalContractExperience',
		type: 'select',
		question: 'Total experience in contractual roles',
		required: true,
		icon: 'Briefcase',
		options: [
			{ label: 'Less than 1 year', value: 'lt_1y' },
			{ label: '1 - 2 years', value: '1_2y' },
			{ label: '2 - 3 years', value: '2_3y' },
			{ label: 'More than 3 years', value: 'gt_3y' }
		]
	}
];

// ============================================================================
// DIRECTOR IN COMPANY — Specifics
// ============================================================================

const DIRECTOR_SPECIFICS: SpecificsQuestion[] = [
	// ── R4 Gate Question 1: India or foreign ────────────────────────
	{
		id: 'dc_registeredInIndia',
		key: 'registeredInIndia',
		type: 'select',
		question: 'Is this company registered in India?',
		required: true,
		icon: 'Globe',
		options: [
			{ label: 'Yes, registered in India', value: true },
			{ label: 'No, foreign company', value: false }
		]
	},
	// ── Foreign path: capture country ──────────────────────────────
	{
		id: 'dc_foreignCountry',
		key: 'foreignCountry',
		type: 'text',
		question: 'Which country is this company based in?',
		required: true,
		icon: 'MapPin',
		placeholder: 'e.g. USA, UK, Singapore, UAE',
		showWhen: { '==': ['registeredInIndia', false] },
		description:
			'Foreign company income is verified via ITR and bank credit statements. No company co-applicant needed.'
	},
	// ── R4 Gate Question 2: Company type (Indian only) ─────────────
	{
		id: 'dc_companyType',
		key: 'companyType',
		type: 'select',
		question: 'Company type',
		required: true,
		icon: 'Building',
		showWhen: { '==': ['registeredInIndia', true] },
		options: [
			{ label: 'Private Limited', value: 'pvt_ltd' },
			{ label: 'One Person Company (OPC)', value: 'opc' },
			{ label: 'Public Limited (Unlisted)', value: 'public_ltd' },
			{ label: 'Listed / Large Public Company', value: 'listed_large_public' },
			{ label: 'Section 8 Company (Non-Profit)', value: 'section_8' }
		]
	},
	// ── R4 Gate Question 3: Equity holding (not for OPC/listed) ────
	{
		id: 'dc_hasEquity',
		key: 'hasEquity',
		type: 'select',
		question: 'Do you hold equity / ownership in this company?',
		required: true,
		icon: 'PieChart',
		showWhen: {
			and: [
				{ '==': ['registeredInIndia', true] },
				{ not: { in: ['companyType', ['opc', 'listed_large_public']] } }
			]
		},
		options: [
			{ label: 'Yes, I am a promoter / shareholder', value: true },
			{ label: 'No, I am a professional / independent director', value: false }
		],
		description:
			'Equity-holding directors require company financials for lender assessment. Professional/hired directors are treated as salaried.'
	},
	// ── Designation (Indian + equity-holding path only) ─────────────
	{
		id: 'dc_designation',
		key: 'designation',
		type: 'select',
		question: 'Your designation',
		required: true,
		icon: 'UserCheck',
		showWhen: {
			and: [
				{ '==': ['registeredInIndia', true] },
				{ not: { in: ['companyType', ['listed_large_public']] } },
				{ '==': ['hasEquity', true] }
			]
		},
		options: [
			{ label: 'Managing Director (MD)', value: 'md' },
			{ label: 'Whole-time Director', value: 'whole_time' },
			{ label: 'Additional Director', value: 'additional' },
			{ label: 'Nominee Director', value: 'nominee' },
			{ label: 'Independent Director', value: 'independent' }
		]
	},
	// ── Shareholding (equity-holding path only) ─────────────────────
	{
		id: 'dc_shareholding',
		key: 'shareholding',
		type: 'number',
		question: 'Your shareholding (%)',
		required: true,
		icon: 'PieChart',
		placeholder: 'Enter shareholding percentage',
		min: 1,
		max: 100,
		showWhen: {
			and: [
				{ '==': ['registeredInIndia', true] },
				{ not: { in: ['companyType', ['listed_large_public']] } },
				{ '==': ['hasEquity', true] }
			]
		},
		validation: {
			condition: [
				{
					case: { '<': [{ var: 'shareholding' }, 1] },
					shareholdingError: 'Shareholding must be at least 1%'
				},
				{
					case: { '>': [{ var: 'shareholding' }, 100] },
					shareholdingError: 'Shareholding cannot exceed 100%'
				}
			]
		}
	},
	// ── Active in operations (equity-holding path only) ─────────────
	{
		id: 'dc_activeInOperations',
		key: 'activeInOperations',
		type: 'select',
		question: 'Active in company operations?',
		required: true,
		icon: 'Activity',
		showWhen: {
			and: [
				{ '==': ['registeredInIndia', true] },
				{ not: { in: ['companyType', ['listed_large_public']] } },
				{ '==': ['hasEquity', true] }
			]
		},
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No (Sleeping / Inactive Director)', value: false }
		]
	},
	// ── Company profitable (equity-holding path only) ───────────────
	{
		id: 'dc_companyProfitable',
		key: 'companyProfitable',
		type: 'select',
		question: 'Company profitable for last 3 years?',
		required: true,
		icon: 'TrendingUp',
		showWhen: {
			and: [
				{ '==': ['registeredInIndia', true] },
				{ not: { in: ['companyType', ['listed_large_public']] } },
				{ '==': ['hasEquity', true] }
			]
		},
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	// ── Company shares financials (equity-holding path only) ────────
	{
		id: 'dc_companySharesFinancials',
		key: 'companySharesFinancials',
		type: 'select',
		question: 'Company ready to share financials with lender?',
		required: true,
		icon: 'FileSpreadsheet',
		showWhen: {
			and: [
				{ '==': ['registeredInIndia', true] },
				{ not: { in: ['companyType', ['listed_large_public']] } },
				{ '==': ['hasEquity', true] }
			]
		},
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	// ── ITR reflects income (equity-holding path only) ──────────────
	{
		id: 'dc_itrReflectsIncome',
		key: 'itrReflectsIncome',
		type: 'select',
		question: 'Your ITR reflects income from this company?',
		required: true,
		icon: 'FileCheck',
		showWhen: {
			and: [
				{ '==': ['registeredInIndia', true] },
				{ not: { in: ['companyType', ['listed_large_public']] } },
				{ '==': ['hasEquity', true] }
			]
		},
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	// ── CIN (all Indian companies, optional) ────────────────────────
	{
		id: 'dc_cin',
		key: 'cin',
		type: 'text',
		question: 'Company CIN (optional)',
		required: false,
		icon: 'Hash',
		placeholder: 'Enter Company Identification Number',
		showWhen: { '==': ['registeredInIndia', true] }
	}
];

// ============================================================================
// PARTNER IN FIRM — Specifics
// ============================================================================

const PARTNER_SPECIFICS: SpecificsQuestion[] = [
	// ── R4 Gate Question 1: India or foreign ────────────────────────
	{
		id: 'pf_registeredInIndia',
		key: 'registeredInIndia',
		type: 'select',
		question: 'Is this firm registered in India?',
		required: true,
		icon: 'Globe',
		options: [
			{ label: 'Yes, registered in India', value: true },
			{ label: 'No, foreign firm', value: false }
		]
	},
	// ── Foreign path: capture country ──────────────────────────────
	{
		id: 'pf_foreignCountry',
		key: 'foreignCountry',
		type: 'text',
		question: 'Which country is this firm based in?',
		required: true,
		icon: 'MapPin',
		placeholder: 'e.g. USA, UK, Singapore, UAE',
		showWhen: { '==': ['registeredInIndia', false] },
		description:
			'Foreign firm income is verified via ITR and bank credit statements. No firm co-applicant needed.'
	},
	// ── Firm type (Indian only) ────────────────────────────────────
	{
		id: 'pf_firmType',
		key: 'firmType',
		type: 'select',
		question: 'Firm type',
		required: true,
		icon: 'Handshake',
		showWhen: { '==': ['registeredInIndia', true] },
		options: [
			{ label: 'Partnership Firm', value: 'partnership' },
			{ label: 'Limited Liability Partnership (LLP)', value: 'llp' }
		]
	},
	// ── Partner role (Indian only) ─────────────────────────────────
	{
		id: 'pf_partnerType',
		key: 'partnerType',
		type: 'select',
		question: 'Your role as partner',
		required: true,
		icon: 'UserCheck',
		showWhen: { '==': ['registeredInIndia', true] },
		options: [
			{ label: 'Active / Working Partner', value: 'active' },
			{ label: 'Sleeping / Dormant Partner', value: 'sleeping' },
			{ label: 'Designated Partner (LLP)', value: 'designated' }
		]
	},
	// ── R4: Sleeping partner profit share threshold ─────────────────
	{
		id: 'pf_profitShareExceedsThreshold',
		key: 'profitShareExceedsThreshold',
		type: 'select',
		question: 'Does profit share from this firm exceed 30% of your total income?',
		required: true,
		icon: 'Percent',
		showWhen: {
			and: [{ '==': ['registeredInIndia', true] }, { '==': ['partnerType', 'sleeping'] }]
		},
		options: [
			{ label: 'Yes, significant income source', value: true },
			{ label: 'No, minor / passive income', value: false }
		],
		description:
			'If this firm accounts for more than 30% of total income, firm financials are required for lender assessment.'
	},
	// ── Capital contribution (Indian only) ─────────────────────────
	// `maxLength: 3` blocks input past "100" at the keystroke level — without
	// it the default `maxLength: 15` lets users paste 13-digit numbers (the
	// 2026-05-18 team report showed "11,11,11,55,55,55,555"). The min/max
	// bounds are also clamped numerically in IncomeSourceForm.svelte's
	// type='number' onInput handler — belt + suspenders.
	{
		id: 'pf_capitalContribution',
		key: 'capitalContribution',
		type: 'number',
		question: 'Your capital contribution (%)',
		required: true,
		icon: 'PieChart',
		placeholder: 'Enter your share percentage',
		min: 0,
		max: 100,
		maxLength: 3,
		showWhen: { '==': ['registeredInIndia', true] }
	},
	// ── GST registered (Indian only) ───────────────────────────────
	{
		id: 'pf_firmGstRegistered',
		key: 'firmGstRegistered',
		type: 'select',
		question: "Firm's GST registered?",
		required: true,
		icon: 'Receipt',
		showWhen: { '==': ['registeredInIndia', true] },
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	// ── Firm profitable (Indian only) ──────────────────────────────
	{
		id: 'pf_firmProfitable',
		key: 'firmProfitable',
		type: 'select',
		question: 'Firm profitable for last 3 years?',
		required: true,
		icon: 'TrendingUp',
		showWhen: { '==': ['registeredInIndia', true] },
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	// ── ITR reflects income (Indian only) ──────────────────────────
	{
		id: 'pf_itrReflectsIncome',
		key: 'itrReflectsIncome',
		type: 'select',
		question: 'Your ITR reflects partner income from this firm?',
		required: true,
		icon: 'FileCheck',
		showWhen: { '==': ['registeredInIndia', true] },
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	// ── LLPIN (LLP only, Indian) ───────────────────────────────────
	{
		id: 'pf_llpin',
		key: 'llpin',
		type: 'text',
		question: 'LLPIN (optional)',
		required: false,
		icon: 'Hash',
		placeholder: 'Enter LLP Identification Number',
		showWhen: {
			and: [{ '==': ['registeredInIndia', true] }, { '==': ['firmType', 'llp'] }]
		}
	}
];

// ============================================================================
// BUSINESS PROPRIETORSHIP — Specifics
// Reuses existing businessOtherQuestions patterns
// ============================================================================

const BUSINESS_PROPRIETORSHIP_SPECIFICS: SpecificsQuestion[] = [
	{
		id: 'bp_businessType',
		key: 'businessType',
		type: 'select',
		question: 'Primary source of business income',
		subLabel: 'business type',
		required: true,
		icon: 'Briefcase',
		options: [
			{ label: 'Manufacturer / Producer', value: 'manufacturing' },
			{ label: 'Trading / Retailer', value: 'trading' },
			{ label: 'B2B Services', value: 'b2b_services' },
			{ label: 'B2C Services', value: 'b2c_services' },
			{ label: 'Commission based business', value: 'commission' }
		]
	},
	{
		id: 'bp_gstRegistered',
		key: 'gstRegistered',
		type: 'select',
		question: 'Has valid GST registration?',
		required: true,
		icon: 'Receipt',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'bp_gstAddressSame',
		key: 'gstAddressSame',
		type: 'select',
		question: 'GST address same as actual business address?',
		required: true,
		icon: 'MapPin',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		],
		showWhen: { '==': ['gstRegistered', true] }
	},
	{
		id: 'bp_gstRegistrationDate',
		key: 'gstRegistrationDate',
		type: 'month-year',
		question: 'GST registration date',
		required: true,
		showWhen: { '==': ['gstRegistered', true] },
		min: 2017
	},
	{
		id: 'bp_hasCurrentAccount',
		key: 'hasCurrentAccount',
		type: 'select',
		question: 'Has active current account?',
		required: true,
		icon: 'Landmark',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'bp_hasSavingsAccount',
		key: 'hasSavingsAccount',
		type: 'select',
		question: 'Uses personal/family savings account for business?',
		required: true,
		icon: 'Wallet',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		],
		showWhen: { '==': ['hasCurrentAccount', false] }
	},
	{
		id: 'bp_itrFiled',
		key: 'itrFiled',
		type: 'select',
		question: 'Files ITR regularly (min 2 years)?',
		required: true,
		icon: 'FileCheck',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'bp_profitable3Years',
		key: 'profitable3Years',
		type: 'select',
		question: 'Has been profitable for last 3 years?',
		required: true,
		icon: 'TrendingUp',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		],
		showWhen: { '==': ['itrFiled', true] }
	},
	{
		id: 'bp_majorCashSales',
		key: 'majorCashSales',
		type: 'select',
		question: 'More than 40% of income is in cash?',
		required: true,
		icon: 'Banknote',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'bp_businessExperience',
		key: 'businessExperience',
		type: 'select',
		question: 'Years of experience in this business',
		required: true,
		icon: 'Calendar',
		options: [
			{ label: 'Less than 1 year', value: '1' },
			{ label: '1-2 years', value: '2' },
			{ label: '2-3 years', value: '3' },
			{ label: 'More than 3 years', value: '3plus' }
		]
	},
	{
		id: 'bp_seasonalBusiness',
		key: 'seasonalBusiness',
		type: 'select',
		question: 'Business is seasonal in nature?',
		required: false,
		icon: 'CloudSun',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'bp_fewClients',
		key: 'fewClients',
		type: 'select',
		question: 'Most income from 1-2 key clients?',
		required: false,
		icon: 'Users',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'bp_hasInventory',
		key: 'hasInventory',
		type: 'select',
		question: 'Maintains visible inventory or stock?',
		required: false,
		icon: 'Package',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		],
		showWhen: {
			in: ['businessType', ['manufacturing', 'trading']]
		}
	},
	{
		id: 'bp_hasFactory',
		key: 'hasFactory',
		type: 'select',
		question: 'Owns or rents a factory, workshop or warehouse?',
		required: false,
		icon: 'Factory',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		],
		showWhen: { '==': ['businessType', 'manufacturing'] }
	}
];

// ============================================================================
// PROFESSIONAL PRACTICE — Specifics
// ============================================================================

const PROFESSIONAL_SPECIFICS: SpecificsQuestion[] = [
	{
		id: 'pp_professionType',
		key: 'professionType',
		type: 'select',
		question: "Applicant's profession",
		required: true,
		icon: 'Stethoscope',
		options: [
			{ label: 'MBBS Doctor', value: 'MBBS Doctor' },
			{ label: 'Chartered Accountant (CA)', value: 'Chartered Accountant(CA)' },
			{ label: 'Lawyer', value: 'Lawyer' },
			{ label: 'Architect', value: 'Architect' }
		]
	},
	{
		id: 'pp_barCouncilChamber',
		key: 'barCouncilChamber',
		type: 'select',
		question: 'Is a chamber allotted by the Bar Association?',
		required: true,
		icon: 'Scale',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		],
		showWhen: { '==': ['professionType', 'Lawyer'] }
	},
	{
		id: 'pp_hasProfessionalLicense',
		key: 'hasProfessionalLicense',
		type: 'select',
		question: 'Has valid professional registration / license?',
		required: true,
		icon: 'Award',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'pp_registeredWithBody',
		key: 'registeredWithBody',
		type: 'select',
		question: 'Enrolled with Bar Council / ICAI / MCI / COA?',
		required: true,
		icon: 'BadgeCheck',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'pp_hasCommercialPremises',
		key: 'hasCommercialPremises',
		type: 'select',
		question: 'Operates from chamber / clinic / office?',
		required: true,
		icon: 'Building',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'pp_ownsPremises',
		key: 'ownsPremises',
		type: 'select',
		question: 'Clinic / chamber / office is owned?',
		required: false,
		icon: 'Home',
		options: [
			{ label: 'Yes (Owned)', value: true },
			{ label: 'No (Rented)', value: false }
		],
		showWhen: { '==': ['hasCommercialPremises', true] }
	},
	{
		id: 'pp_gstRegistered',
		key: 'gstRegistered',
		type: 'select',
		question: 'Has valid GST registration?',
		required: true,
		icon: 'Receipt',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'pp_gstRegistrationDate',
		key: 'gstRegistrationDate',
		type: 'month-year',
		question: 'GST registration date',
		required: true,
		showWhen: { '==': ['gstRegistered', true] },
		min: 2017
	},
	{
		id: 'pp_hasCurrentAccount',
		key: 'hasCurrentAccount',
		type: 'select',
		question: 'Has active current account?',
		required: true,
		icon: 'Landmark',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'pp_itrFiled',
		key: 'itrFiled',
		type: 'select',
		question: 'Files ITR regularly (min 2 years)?',
		required: true,
		icon: 'FileCheck',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'pp_majorCashSales',
		key: 'majorCashSales',
		type: 'select',
		question: 'More than 40% of income is in cash?',
		required: true,
		icon: 'Banknote',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'pp_practiceVintage',
		key: 'practiceVintage',
		type: 'select',
		question: 'Years of practice experience',
		required: true,
		icon: 'Calendar',
		options: [
			{ label: 'Less than 1 year', value: 'lt_1y' },
			{ label: '1-2 years', value: '1_2y' },
			{ label: '2-3 years', value: '2_3y' },
			{ label: 'More than 3 years', value: 'gt_3y' }
		]
	}
];

// ============================================================================
// PENSION — Specifics
// ============================================================================

const PENSION_SPECIFICS: SpecificsQuestion[] = [
	{
		id: 'pn_pensionType',
		key: 'pensionType',
		type: 'select',
		question: 'Type of pension',
		required: true,
		icon: 'Landmark',
		options: [
			{ label: 'Central Government Pension', value: 'central_govt' },
			{ label: 'State Government Pension', value: 'state_govt' },
			{ label: 'Defence / Paramilitary Pension', value: 'defence' },
			{ label: 'PSU Pension', value: 'psu' },
			{ label: 'Corporate / Private Pension', value: 'corporate' },
			{ label: 'VRS Pension', value: 'vrs' },
			{ label: 'Political Pension', value: 'political' },
			{ label: 'Family Pension', value: 'family' }
		]
	},
	{
		id: 'pn_pensionCreditedMonthly',
		key: 'pensionCreditedMonthly',
		type: 'select',
		question: 'Pension credited to bank account monthly?',
		required: true,
		icon: 'Landmark',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'pn_pensionRegular',
		key: 'pensionRegular',
		type: 'select',
		question: 'Pension credited regularly without delay?',
		required: true,
		icon: 'Clock',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		],
		showWhen: { '==': ['pensionCreditedMonthly', true] }
	},
	{
		id: 'pn_lifelongPension',
		key: 'lifelongPension',
		type: 'select',
		question: 'Pension is lifelong (not fixed tenure)?',
		required: true,
		icon: 'Shield',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'pn_pensionSlipAvailable',
		key: 'pensionSlipAvailable',
		type: 'select',
		question: 'Receives pension slip / PPO regularly?',
		required: true,
		icon: 'FileText',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'pn_pensionBankNationalised',
		key: 'pensionBankNationalised',
		type: 'select',
		question: 'Pension account is with nationalised bank?',
		required: false,
		icon: 'Landmark',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'pn_itrFiled',
		key: 'itrFiled',
		type: 'select',
		question: 'Pension is taxable and ITR filed regularly?',
		required: true,
		icon: 'FileCheck',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'pn_noPensionLoanDeduction',
		key: 'noPensionLoanDeduction',
		type: 'select',
		question: 'No pension loan deductions ongoing?',
		required: false,
		icon: 'CircleOff',
		options: [
			{ label: 'Yes (no deductions)', value: true },
			{ label: 'No (has deductions)', value: false }
		]
	},
	{
		id: 'pn_hasOtherActivity',
		key: 'hasOtherActivity',
		type: 'select',
		question: 'Have any active business or employment alongside pension?',
		required: false,
		icon: 'Briefcase',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		],
		description:
			'If yes, please go back and add that income profile as well for complete assessment.'
	}
];

// ============================================================================
// RENTAL INCOME — Specifics
// ============================================================================

const RENTAL_SPECIFICS: SpecificsQuestion[] = [
	{
		id: 'ri_propertyType',
		key: 'propertyType',
		type: 'select',
		question: 'Property type',
		required: true,
		icon: 'Home',
		options: [
			{ label: 'Residential (Flat / House / Apartment)', value: 'residential' },
			{ label: 'Commercial (Office / Shop / Godown)', value: 'commercial' },
			{ label: 'Land / Open Plot', value: 'land' }
		]
	},
	{
		id: 'ri_rentAgreementRegistered',
		key: 'rentAgreementRegistered',
		type: 'select',
		question: 'Rent agreement is registered?',
		required: true,
		icon: 'FileText',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		],
		description:
			'Most lenders require a registered rent agreement as proof. Without it, rental income may not be considered.'
	},
	{
		id: 'ri_ownershipProof',
		key: 'ownershipProof',
		type: 'select',
		question: 'Property ownership papers available?',
		required: true,
		icon: 'FileCheck',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'ri_propertyInWhoseName',
		key: 'propertyInWhoseName',
		type: 'select',
		question: 'Property is in whose name?',
		required: true,
		icon: 'User',
		options: [
			{ label: 'Self (applicant)', value: 'self' },
			{ label: 'Joint (with spouse / family)', value: 'joint' },
			{ label: 'Spouse only', value: 'spouse' },
			{ label: 'Family member', value: 'family' }
		]
	},
	{
		id: 'ri_itrReflectsRental',
		key: 'itrReflectsRental',
		type: 'select',
		question: 'Rental income reflected in ITR?',
		required: true,
		icon: 'FileCheck',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	}
];

// ============================================================================
// FREELANCE / CONSULTING — Specifics
// ============================================================================

const FREELANCE_SPECIFICS: SpecificsQuestion[] = [
	{
		id: 'fc_activeClients',
		key: 'activeClients',
		type: 'select',
		question: 'Active contracts / clients currently',
		required: true,
		icon: 'Users',
		options: [
			{ label: '1-2 clients', value: '1_2' },
			{ label: '3+ clients', value: '3_plus' },
			{ label: 'Project-based / Intermittent', value: 'intermittent' }
		]
	},
	{
		id: 'fc_freelanceVintage',
		key: 'freelanceVintage',
		type: 'select',
		question: 'How long have you been freelancing?',
		required: true,
		icon: 'Calendar',
		options: [
			{ label: 'Less than 1 year', value: 'lt_1y' },
			{ label: '1-2 years', value: '1_2y' },
			{ label: '2-3 years', value: '2_3y' },
			{ label: 'More than 3 years', value: 'gt_3y' }
		]
	},
	{
		id: 'fc_incomeReceivedVia',
		key: 'incomeReceivedVia',
		type: 'select',
		question: 'Income received via',
		required: true,
		icon: 'CreditCard',
		options: [
			{ label: 'Bank transfer (NEFT/RTGS/IMPS)', value: 'bank_transfer' },
			{ label: 'UPI payments', value: 'upi' },
			{ label: 'Mixed (bank + UPI + other)', value: 'mixed' },
			{ label: 'Cash dominant', value: 'cash' }
		]
	},
	{
		id: 'fc_itrFiled',
		key: 'itrFiled',
		type: 'select',
		question: 'ITR filed for freelance income?',
		required: true,
		icon: 'FileCheck',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		],
		description: 'Without ITR, freelance income may not be considered by lenders.'
	},
	{
		id: 'fc_gstRegistered',
		key: 'gstRegistered',
		type: 'select',
		question: 'GST registered for freelancing?',
		required: false,
		icon: 'Receipt',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'fc_clientBase',
		key: 'clientBase',
		type: 'select',
		question: 'Primary clients',
		subLabel: 'client type',
		required: false,
		icon: 'Globe',
		options: [
			{ label: 'Domestic', value: 'domestic' },
			{ label: 'International', value: 'international' },
			{ label: 'Both', value: 'both' }
		]
	}
];

// ============================================================================
// AGRICULTURE — Specifics
// ============================================================================

const AGRICULTURE_SPECIFICS: SpecificsQuestion[] = [
	{
		id: 'ag_landArea',
		key: 'landArea',
		type: 'number',
		question: 'Land area (in acres)',
		required: true,
		icon: 'Map',
		placeholder: 'Enter area in acres',
		maxLength: 5
	},
	{
		id: 'ag_cropType',
		key: 'cropType',
		type: 'text',
		question: 'Crop type / Activity',
		required: true,
		icon: 'Sprout',
		placeholder: 'E.g., Sugarcane, Cotton, Dairy'
	},
	{
		id: 'ag_seasonalPattern',
		key: 'seasonalPattern',
		type: 'select',
		question: 'Income pattern',
		required: true,
		icon: 'Calendar',
		options: [
			{ label: 'Seasonal (1-2 harvests/year)', value: 'seasonal' },
			{ label: 'Year-round (dairy, poultry, etc.)', value: 'year_round' },
			{ label: 'Mixed', value: 'mixed' }
		]
	},
	{
		id: 'ag_landRecordsAvailable',
		key: 'landRecordsAvailable',
		type: 'select',
		question: 'Land records (7/12 extract) available?',
		required: true,
		icon: 'FileText',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'ag_itrFiled',
		key: 'itrFiled',
		type: 'select',
		question: 'Agriculture income reflected in ITR?',
		required: false,
		icon: 'FileCheck',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		],
		description: 'Agriculture income is exempt from tax but should be declared in ITR.'
	}
];

// ============================================================================
// INVESTMENT INCOME — Specifics
// ============================================================================

const INVESTMENT_SPECIFICS: SpecificsQuestion[] = [
	{
		id: 'ii_investmentType',
		key: 'investmentType',
		type: 'select',
		question: 'Primary investment type',
		required: true,
		icon: 'TrendingUp',
		options: [
			{ label: 'Dividend Income', value: 'dividend' },
			{ label: 'Interest Income (FD, Bonds)', value: 'interest' },
			{ label: 'Capital Gains (Stocks, MF)', value: 'capital_gains' },
			{ label: 'Mixed (multiple types)', value: 'mixed' }
		]
	},
	{
		id: 'ii_itrReflects',
		key: 'itrReflects',
		type: 'select',
		question: 'Investment income reflected in ITR?',
		required: true,
		icon: 'FileCheck',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'ii_dematStatement',
		key: 'dematStatement',
		type: 'select',
		question: 'Demat / bank statement available as proof?',
		required: true,
		icon: 'FileText',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	}
];

// ============================================================================
// NO CURRENT INCOME — Specifics
// ============================================================================

const NO_INCOME_SPECIFICS: SpecificsQuestion[] = [
	{
		id: 'ni_wasEarningBefore',
		key: 'wasEarningBefore',
		type: 'select',
		question: 'Were you earning before?',
		required: true,
		icon: 'Clock',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No, never earned', value: false }
		]
	},
	{
		id: 'ni_previousIncomeSource',
		key: 'previousIncomeSource',
		type: 'select',
		question: 'Previous income source',
		required: true,
		icon: 'Briefcase',
		options: [
			{ label: 'Salaried (Govt / Private)', value: 'salaried' },
			{ label: 'Self-employed / Business', value: 'business' },
			{ label: 'Professional Practice', value: 'professional' },
			{ label: 'Other', value: 'other' }
		],
		showWhen: { '==': ['wasEarningBefore', true] }
	},
	{
		id: 'ni_breakReason',
		key: 'breakReason',
		type: 'select',
		question: 'Reason for current break',
		required: true,
		icon: 'Info',
		options: [
			{ label: 'Maternity / Childcare', value: 'maternity' },
			{ label: 'Health reasons', value: 'health' },
			{ label: 'Sabbatical / Career break', value: 'sabbatical' },
			{ label: 'Retired (without pension)', value: 'retired_without_pension' },
			{ label: 'VRS taken', value: 'vrs' },
			{ label: 'Between jobs', value: 'between_jobs' },
			{ label: 'Other', value: 'other' }
		],
		showWhen: { '==': ['wasEarningBefore', true] }
	},
	{
		id: 'ni_expectedToResume',
		key: 'expectedToResume',
		type: 'select',
		question: 'Expected to resume earning?',
		required: true,
		icon: 'Clock',
		options: [
			{ label: 'Yes, within 6 months', value: 'within_6_months' },
			{ label: 'Yes, within 1 year', value: 'within_1_year' },
			{ label: 'Unlikely', value: 'unlikely' },
			{ label: 'Not sure', value: 'not_sure' }
		],
		showWhen: { '==': ['wasEarningBefore', true] }
	},
	{
		id: 'ni_ownsProperty',
		key: 'ownsProperty',
		type: 'select',
		question: 'Owns any property or assets?',
		required: false,
		icon: 'Home',
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	}
];

// ============================================================================
// INCOME FIELDS PER PROFILE TYPE
// ============================================================================

const SALARIED_INCOME_FIELDS: IncomeField[] = [
	{
		id: 'si_grossSalary',
		key: 'grossMonthlySalary',
		type: 'number',
		label: 'Monthly Gross Salary',
		required: true,
		icon: 'IndianRupee',
		placeholder: 'Enter gross salary',
		showNumberInWords: true,
		description:
			"<div class='info-title'><span class='info-icon gold'>💰</span> Gross Income</div><div class='info-box highlight'>Total monthly salary <em>before</em> any deductions (Basic + HRA + Allowances).</div><div class='info-box tip'>Check your salary slip — labeled as <em>\"Gross Salary\"</em> or <em>\"Total Earnings\"</em>.</div>",
		validation: {
			condition: [
				{
					case: { '<': [{ var: 'grossMonthlySalary' }, 20000] },
					grossMonthlySalaryError: 'Gross salary should be at least ₹20,000'
				},
				{
					case: { '>': [{ var: 'grossMonthlySalary' }, 9999999999] },
					grossMonthlySalaryError: 'Enter a valid amount'
				}
			]
		}
	},
	{
		id: 'si_netSalary',
		key: 'netMonthlySalary',
		type: 'number',
		label: 'Monthly Net Salary (Take-home)',
		required: true,
		icon: 'IndianRupee',
		placeholder: 'Enter net salary',
		showNumberInWords: true,
		description:
			"<div class='info-title'><span class='info-icon blue'>🏦</span> Net Income</div><div class='info-box highlight'>Amount credited to your bank account after all deductions (PF, Tax, PT).</div><div class='info-box tip'>Check your bank statement for the salary credit amount.</div>",
		validation: {
			condition: [
				{
					case: { '<': [{ var: 'netMonthlySalary' }, 20000] },
					netMonthlySalaryError: 'Net salary should be at least ₹20,000'
				},
				{
					case: { '>': [{ var: 'netMonthlySalary' }, { var: 'grossMonthlySalary' }] },
					netMonthlySalaryError: 'Net salary cannot exceed gross salary'
				}
			]
		}
	},
	// ── Bonus / Incentive fields (shown when receivesBonus = true in specifics) ──
	{
		id: 'si_bonusFrequency',
		key: 'bonusFrequency',
		type: 'select',
		label: 'How often is bonus / incentive received?',
		required: true,
		icon: 'Calendar',
		subLabel: 'frequency',
		showWhen: { '==': ['receivesBonus', true] },
		options: [
			{ label: 'Monthly', value: 'monthly' },
			{ label: 'Quarterly', value: 'quarterly' },
			{ label: 'Half-yearly', value: 'half_yearly' },
			{ label: 'Annually', value: 'annually' }
		]
	},
	{
		id: 'si_bonusTimesReceived',
		key: 'bonusTimesReceived',
		type: 'select',
		label: 'How many times received so far?',
		required: true,
		icon: 'Hash',
		showWhen: { '==': ['receivesBonus', true] },
		options: [
			{ label: 'Just once (may limit assessment)', value: 'once' },
			{ label: '2–3 times', value: '2_3_times' },
			{ label: '4+ times (established pattern)', value: '4_plus' }
		]
	},
	{
		id: 'si_averageBonusAmount',
		key: 'averageBonusAmount',
		type: 'number',
		label: 'Average bonus / incentive amount per receipt',
		required: true,
		icon: 'IndianRupee',
		placeholder: 'Average from last 3–4 receipts',
		showNumberInWords: true,
		showWhen: { '==': ['receivesBonus', true] },
		description:
			"<div class='info-title'><span class='info-icon gold'>🎁</span> Bonus Amount</div><div class='info-box highlight'>Enter the average amount from the last 3–4 bonus receipts.</div><div class='info-box tip'>If received only once, enter that single amount. Note: single-receipt bonuses may have limited consideration in assessment.</div>",
		validation: {
			condition: [
				{
					case: { '<': [{ var: 'averageBonusAmount' }, 1000] },
					averageBonusAmountError: 'Amount must be at least ₹1,000'
				}
			]
		}
	}
];

/** showWhen condition for the standard director income path (Indian + equity-holding) */
const DIRECTOR_STANDARD_PATH = {
	and: [
		{ '==': ['registeredInIndia', true] },
		{ not: { in: ['companyType', ['listed_large_public']] } },
		{ '==': ['hasEquity', true] }
	]
};

/** showWhen condition for the salaried director path (foreign OR listed OR no equity) */
const DIRECTOR_SALARIED_PATH = {
	or: [
		{ '==': ['registeredInIndia', false] },
		{ '==': ['companyType', 'listed_large_public'] },
		{ '==': ['hasEquity', false] }
	]
};

const DIRECTOR_INCOME_FIELDS: IncomeField[] = [
	// ── Standard director path: salary + profit from company ────────
	{
		id: 'di_drawsSalary',
		key: 'drawsSalary',
		type: 'select',
		label: 'Draws structured salary from this company?',
		required: true,
		icon: 'Wallet',
		showWhen: DIRECTOR_STANDARD_PATH,
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'di_monthlySalary',
		key: 'monthlySalaryAmount',
		type: 'number',
		label: 'Monthly salary amount',
		required: true,
		icon: 'IndianRupee',
		placeholder: 'Enter monthly salary',
		showNumberInWords: true,
		showWhen: {
			and: [DIRECTOR_STANDARD_PATH, { '==': ['drawsSalary', true] }]
		},
		validation: {
			condition: [
				{
					case: { '<': [{ var: 'monthlySalaryAmount' }, 1000] },
					monthlySalaryAmountError: 'Salary must be at least ₹1,000'
				}
			]
		}
	},
	{
		id: 'di_receivesProfit',
		key: 'receivesProfit',
		type: 'select',
		label: 'Receives profit distribution / dividend?',
		required: true,
		icon: 'TrendingUp',
		showWhen: DIRECTOR_STANDARD_PATH,
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'di_profitFrequency',
		key: 'profitFrequency',
		type: 'select',
		label: 'Frequency of profit withdrawal',
		required: true,
		icon: 'Calendar',
		subLabel: 'frequency',
		showWhen: {
			and: [DIRECTOR_STANDARD_PATH, { '==': ['receivesProfit', true] }]
		},
		options: [
			{ label: 'Monthly', value: 'monthly' },
			{ label: 'Quarterly', value: 'quarterly' },
			{ label: 'Half-yearly', value: 'half_yearly' },
			{ label: 'Annually', value: 'annual' },
			{ label: 'As & When Required', value: 'as_and_when' }
		]
	},
	{
		id: 'di_avgProfitPerWithdrawal',
		key: 'averageProfitPerWithdrawal',
		type: 'number',
		label: 'Average amount per profit withdrawal',
		required: true,
		icon: 'IndianRupee',
		placeholder: 'Enter average profit per withdrawal',
		showNumberInWords: true,
		showWhen: {
			and: [DIRECTOR_STANDARD_PATH, { '==': ['receivesProfit', true] }]
		},
		validation: {
			condition: [
				{
					case: { '<': [{ var: 'averageProfitPerWithdrawal' }, 1000] },
					averageProfitPerWithdrawalError: 'Amount must be at least ₹1,000'
				}
			]
		}
	},
	// ── Salaried path: foreign company / listed / professional director ─
	{
		id: 'di_salariedGross',
		key: 'grossMonthlySalary',
		type: 'number',
		label: 'Monthly gross salary / CTC from this company',
		required: true,
		icon: 'IndianRupee',
		placeholder: 'Enter gross monthly salary in INR',
		showNumberInWords: true,
		showWhen: DIRECTOR_SALARIED_PATH,
		description: 'Gross salary or CTC as reported in appointment letter or salary slips.'
	},
	{
		id: 'di_salariedNet',
		key: 'netMonthlySalary',
		type: 'number',
		label: 'Monthly net salary (take-home)',
		required: true,
		icon: 'IndianRupee',
		placeholder: 'Enter net monthly take-home in INR',
		showNumberInWords: true,
		showWhen: DIRECTOR_SALARIED_PATH
	}
];

/** showWhen condition for standard partner path (Indian firm) */
const PARTNER_STANDARD_PATH = { '==': ['registeredInIndia', true] };

/** showWhen condition for foreign partner path (salaried treatment) */
const PARTNER_SALARIED_PATH = { '==': ['registeredInIndia', false] };

const PARTNER_INCOME_FIELDS: IncomeField[] = [
	// ── Standard partner path: remuneration + profit from Indian firm ─
	{
		id: 'pi_drawsRemuneration',
		key: 'drawsSalary',
		type: 'select',
		label: 'Draws remuneration / salary from firm?',
		required: true,
		icon: 'Wallet',
		showWhen: PARTNER_STANDARD_PATH,
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'pi_monthlyRemuneration',
		key: 'monthlySalaryAmount',
		type: 'number',
		label: 'Monthly remuneration amount',
		required: true,
		icon: 'IndianRupee',
		placeholder: 'Enter monthly remuneration',
		showNumberInWords: true,
		showWhen: {
			and: [PARTNER_STANDARD_PATH, { '==': ['drawsSalary', true] }]
		}
	},
	{
		id: 'pi_receivesProfit',
		key: 'receivesProfit',
		type: 'select',
		label: 'Receives profit share from firm?',
		required: true,
		icon: 'TrendingUp',
		showWhen: PARTNER_STANDARD_PATH,
		options: [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		]
	},
	{
		id: 'pi_profitFrequency',
		key: 'profitFrequency',
		type: 'select',
		label: 'Frequency of profit distribution',
		required: true,
		icon: 'Calendar',
		subLabel: 'frequency',
		showWhen: {
			and: [PARTNER_STANDARD_PATH, { '==': ['receivesProfit', true] }]
		},
		options: [
			{ label: 'Monthly', value: 'monthly' },
			{ label: 'Quarterly', value: 'quarterly' },
			{ label: 'Half-yearly', value: 'half_yearly' },
			{ label: 'Annually', value: 'annual' },
			{ label: 'As & When Required', value: 'as_and_when' }
		]
	},
	{
		id: 'pi_avgProfitPerWithdrawal',
		key: 'averageProfitPerWithdrawal',
		type: 'number',
		label: 'Average amount per profit distribution',
		required: true,
		icon: 'IndianRupee',
		placeholder: 'Enter average profit amount',
		showNumberInWords: true,
		showWhen: {
			and: [PARTNER_STANDARD_PATH, { '==': ['receivesProfit', true] }]
		}
	},
	// ── Salaried path: foreign firm partner income ──────────────────
	{
		id: 'pi_salariedGross',
		key: 'grossMonthlySalary',
		type: 'number',
		label: 'Monthly gross income / remuneration from this firm',
		required: true,
		icon: 'IndianRupee',
		placeholder: 'Enter gross monthly income in INR',
		showNumberInWords: true,
		showWhen: PARTNER_SALARIED_PATH,
		description: 'Income from foreign firm as reported in ITR and bank credit statements.'
	},
	{
		id: 'pi_salariedNet',
		key: 'netMonthlySalary',
		type: 'number',
		label: 'Monthly net income (after tax / deductions)',
		required: true,
		icon: 'IndianRupee',
		placeholder: 'Enter net monthly income in INR',
		showNumberInWords: true,
		showWhen: PARTNER_SALARIED_PATH
	}
];

const BUSINESS_INCOME_FIELDS: IncomeField[] = [
	{
		id: 'bi_financialsTable',
		key: 'financialsTable',
		type: 'table',
		label: 'Financial details (Profit, Depreciation, Turnover)',
		required: true,
		showWhen: {
			'==': ['itrFiled', true]
		},
		uiMeta: {
			headers: [],
			rows: [
				{
					label: 'ITR filed',
					field: 'itrFiled',
					icons: ['indian-rupee', 'indian-rupee', 'indian-rupee']
				},
				{
					label:
						'Net Profit / Loss <br /><p class="alertText font-paragraph text-black">(as per <span class="font-titleMedium inputText">ITR</span>)</p>',
					field: 'netProfitArray',
					icons: ['indian-rupee', 'indian-rupee', 'indian-rupee']
				},
				{
					label:
						'Depreciation + Interest <br /><p class="alertText font-paragraph text-black">(as per <span class="font-titleMedium inputText">ITR</span>)</p>',
					field: 'depreciationArray',
					icons: ['indian-rupee', 'indian-rupee', 'indian-rupee']
				},
				{
					label: 'GST Turnover / Gross Receipts',
					field: 'turnOverArray',
					icons: ['indian-rupee', 'indian-rupee', 'indian-rupee']
				}
			]
		}
	},
	{
		id: 'bi_avgBankBalance',
		key: 'averageBankBalance',
		type: 'number',
		label: 'Average balance in current account (12 months)',
		required: true,
		icon: 'IndianRupee',
		showNumberInWords: true,
		showWhen: {
			and: [{ '==': ['hasCurrentAccount', true] }, { '==': ['hasCcOd', false] }]
		},
		validation: {
			condition: [
				{
					case: { '<': [{ var: 'averageBankBalance' }, 20000] },
					averageBankBalanceError: 'Average balance should be at least ₹20,000'
				}
			]
		}
	},
	{
		id: 'bi_cashAmount',
		key: 'cashAmount',
		type: 'number',
		label: 'Average monthly cash sales (last FY)',
		required: true,
		icon: 'IndianRupee',
		showNumberInWords: true,
		showWhen: {
			'==': ['majorCashSales', true]
		},
		validation: {
			condition: [
				{
					case: { '<': [{ var: 'cashAmount' }, 20000] },
					cashAmountError: 'Cash sales must be at least ₹20,000'
				}
			]
		}
	}
];

const PROFESSIONAL_INCOME_FIELDS: IncomeField[] = [
	{
		id: 'pri_financialsTable',
		key: 'financialsTable',
		type: 'table',
		label: 'Financial details (Profit, Depreciation, Gross Receipts)',
		required: true,
		showWhen: {
			'==': ['itrFiled', true]
		},
		uiMeta: {
			rows: [
				{ label: 'Net Profit', field: 'netProfitArray' },
				{ label: 'Depreciation + Interest', field: 'depreciationArray' },
				{ label: 'Gross Receipts', field: 'grossReceipts' }
			]
		}
	},
	{
		id: 'pri_avgBankBalance',
		key: 'averageBankBalance',
		type: 'number',
		label: 'Average balance in current account (12 months)',
		required: true,
		icon: 'IndianRupee',
		showNumberInWords: true,
		showWhen: {
			and: [{ '==': ['hasCurrentAccount', true] }, { '==': ['hasCcOd', false] }]
		},
		validation: {
			condition: [
				{
					case: { '<': [{ var: 'averageBankBalance' }, 20000] },
					averageBankBalanceError: 'Average balance should be at least ₹20,000'
				}
			]
		}
	},
	{
		id: 'pri_cashAmount',
		key: 'cashAmount',
		type: 'number',
		label: 'Average monthly cash collections (last FY)',
		required: true,
		icon: 'IndianRupee',
		showNumberInWords: true,
		showWhen: {
			'==': ['majorCashSales', true]
		}
	}
];

const PENSION_INCOME_FIELDS: IncomeField[] = [
	{
		id: 'pni_monthlyPension',
		key: 'monthlyPensionAmount',
		type: 'number',
		label: 'Monthly total pensionable income (including DR)',
		required: true,
		icon: 'IndianRupee',
		placeholder: 'Enter monthly pension amount',
		showNumberInWords: true,
		description:
			"<div class='info-title'><span class='info-icon blue'>🏦</span> Pension Income</div><div class='info-box highlight'>Total monthly pension including Basic Pension + Dearness Relief (DR) + Medical Allowance.</div><div class='info-box tip'>Check your PPO or monthly pension slip from the bank/treasury.</div>",
		validation: {
			condition: [
				{
					case: { '<': [{ var: 'monthlyPensionAmount' }, 5000] },
					monthlyPensionAmountError: 'Pension amount should be at least ₹5,000'
				}
			]
		}
	}
];

const RENTAL_INCOME_FIELDS: IncomeField[] = [
	{
		id: 'rni_monthlyRent',
		key: 'monthlyRentAmount',
		type: 'number',
		label: 'Monthly rent received',
		required: true,
		icon: 'IndianRupee',
		placeholder: 'Enter monthly rent amount',
		showNumberInWords: true,
		validation: {
			condition: [
				{
					case: { '<': [{ var: 'monthlyRentAmount' }, 1000] },
					monthlyRentAmountError: 'Rent must be at least ₹1,000'
				}
			]
		}
	}
];

const FREELANCE_INCOME_FIELDS: IncomeField[] = [
	{
		id: 'fi_avgMonthlyIncome',
		key: 'averageMonthlyFreelanceIncome',
		type: 'number',
		label: 'Average monthly freelance income (last 12 months)',
		required: true,
		icon: 'IndianRupee',
		placeholder: 'Enter average monthly income',
		showNumberInWords: true,
		validation: {
			condition: [
				{
					case: { '<': [{ var: 'averageMonthlyFreelanceIncome' }, 5000] },
					averageMonthlyFreelanceIncomeError: 'Income must be at least ₹5,000'
				}
			]
		}
	}
];

const AGRICULTURE_INCOME_FIELDS: IncomeField[] = [
	{
		id: 'ai_annualIncome',
		key: 'averageAnnualAgricultureIncome',
		type: 'number',
		label: 'Average annual agriculture income',
		required: true,
		icon: 'IndianRupee',
		placeholder: 'Enter average annual income',
		showNumberInWords: true,
		description:
			'Enter the average annual income from agriculture. Monthly equivalent will be auto-calculated.',
		validation: {
			condition: [
				{
					case: { '<': [{ var: 'averageAnnualAgricultureIncome' }, 10000] },
					averageAnnualAgricultureIncomeError: 'Income must be at least ₹10,000'
				}
			]
		}
	}
];

const INVESTMENT_INCOME_FIELDS: IncomeField[] = [
	{
		id: 'ivi_annualIncome',
		key: 'averageAnnualInvestmentIncome',
		type: 'number',
		label: 'Average annual investment income',
		required: true,
		icon: 'IndianRupee',
		placeholder: 'Enter average annual income',
		showNumberInWords: true,
		description:
			'Include dividends, interest, and realized capital gains. Monthly equivalent will be auto-calculated.'
	}
];
