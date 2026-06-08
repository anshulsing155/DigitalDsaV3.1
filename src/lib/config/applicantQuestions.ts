/**
 * Shared Applicant Question Definitions
 * ═══════════════════════════════════════════════════════════════════
 * Base question arrays used by AddApplicantProfessional and
 * AddApplicantBusiness. Professional extends BASE_INDIVIDUAL_QUESTIONS
 * with professionalCategory; Business uses them as-is.
 * ═══════════════════════════════════════════════════════════════════
 */

export interface ApplicantQuestion {
	key: string;
	question: string;
	type: 'text' | 'select' | 'directorCountPicker';
	styleClass: string;
	icon: string;
	placeholder?: string;
	inputRestriction?: string;
	maxlength?: number;
	required: boolean;
	options: Array<{ label: string; value: string }>;
}

// ── Individual Questions (shared base) ──────────────────────────

export const BASE_INDIVIDUAL_QUESTIONS: ApplicantQuestion[] = [
	{
		key: 'fullName',
		question: 'Full Name',
		type: 'text',
		styleClass: 'col-span-2',
		icon: 'user',
		placeholder: 'Enter full name',
		inputRestriction: 'alphabet',
		maxlength: 50,
		required: true,
		options: []
	},
	{
		key: 'gender',
		question: 'Gender',
		type: 'select',
		styleClass: 'col-span-1',
		icon: 'venus-and-mars',
		required: true,
		options: [
			{ label: 'Male', value: 'male' },
			{ label: 'Female', value: 'female' }
		]
	},
	{
		key: 'age',
		question: 'Age',
		type: 'text',
		styleClass: 'col-span-1',
		icon: 'calendar',
		placeholder: 'Enter age',
		inputRestriction: 'numeric',
		maxlength: 2,
		required: true,
		options: []
	},
	{
		key: 'maritalStatus',
		question: 'Marital Status',
		type: 'select',
		styleClass: 'col-span-1',
		icon: 'users',
		required: true,
		options: [
			{ label: 'Single', value: 'single' },
			{ label: 'Married', value: 'married' },
			{ label: 'Divorced', value: 'divorced' },
			{ label: 'Separated', value: 'separated' },
			{ label: 'Widowed', value: 'widowed' }
		]
	},
	{
		key: 'isNRI',
		question: 'Is NRI?',
		type: 'select',
		styleClass: 'col-span-1',
		icon: 'flag',
		required: true,
		options: [
			{ label: 'Yes', value: 'Yes' },
			{ label: 'No', value: 'No' }
		]
	}
];

/** Professional Loan adds professionalCategory to the base questions */
export const PROFESSIONAL_CATEGORY_QUESTION: ApplicantQuestion = {
	key: 'professionalCategory',
	question: 'Professional Category',
	type: 'select',
	styleClass: 'col-span-2',
	icon: 'stethoscope',
	required: true,
	options: [
		{ label: 'Doctor / Medical', value: 'doctor' },
		{ label: 'Chartered Accountant (CA)', value: 'ca' },
		{ label: 'Lawyer / Advocate', value: 'lawyer' },
		{ label: 'Architect', value: 'architect' }
	]
};

// ── Company Questions ───────────────────────────────────────────

/** Professional Loan company questions (includes companyType selector) */
export const PROFESSIONAL_COMPANY_QUESTIONS: ApplicantQuestion[] = [
	{
		key: 'companyName',
		question: 'Firm / Company Name',
		type: 'text',
		styleClass: 'col-span-2',
		icon: 'building',
		placeholder: 'Registered firm name',
		inputRestriction: 'alphanumeric',
		maxlength: 50,
		required: true,
		options: []
	},
	{
		key: 'registrationCountry',
		question: 'Country of Registration',
		type: 'select',
		styleClass: 'col-span-1',
		icon: 'building-2',
		required: true,
		options: [
			{ label: 'India', value: 'India' },
			{ label: 'Foreign Country', value: 'Foreign' }
		]
	},
	{
		key: 'companyType',
		question: 'Firm Type',
		type: 'select',
		styleClass: 'col-span-1',
		icon: 'building-2',
		required: true,
		options: [
			{ label: 'Partnership Firm', value: 'Partnership Firm' },
			{ label: 'LLP', value: 'LLP' },
			{ label: 'Private Limited', value: 'Private Limited' },
			{ label: 'One Person Company (OPC)', value: 'One Person Company (OPC)' }
		]
	},
	{
		key: 'numberOfDirectorsOrPartners',
		question: 'Number of Stakeholders',
		type: 'directorCountPicker',
		styleClass: 'col-span-1',
		icon: 'users',
		required: true,
		options: []
	},
	{
		key: 'hasRelatedDirectors',
		question: 'Are any stakeholders related?',
		type: 'select',
		styleClass: 'col-span-2',
		icon: 'users',
		required: true,
		options: [
			{ label: 'Yes, some or all are related', value: 'yes' },
			{ label: 'No, none are related', value: 'no' }
		]
	}
];

/** Business Loan company questions (companyType auto-derived from entityType, not shown) */
export const BUSINESS_COMPANY_QUESTIONS: ApplicantQuestion[] = [
	{
		key: 'companyName',
		question: 'Company Name',
		type: 'text',
		styleClass: 'col-span-2',
		icon: 'building',
		placeholder: 'Registered company name',
		inputRestriction: 'alphanumeric',
		maxlength: 50,
		required: true,
		options: []
	},
	{
		key: 'registrationCountry',
		question: 'Country of Registration',
		type: 'select',
		styleClass: 'col-span-1',
		icon: 'building-2',
		required: true,
		options: [
			{ label: 'India', value: 'India' },
			{ label: 'Foreign Country', value: 'Foreign' }
		]
	},
	{
		key: 'numberOfDirectorsOrPartners',
		question: 'Number of Stakeholders',
		type: 'directorCountPicker',
		styleClass: 'col-span-1',
		icon: 'users',
		required: true,
		options: []
	},
	{
		key: 'hasRelatedDirectors',
		question: 'Are any stakeholders related?',
		type: 'select',
		styleClass: 'col-span-2',
		icon: 'users',
		required: true,
		options: [
			{ label: 'Yes, some or all are related', value: 'yes' },
			{ label: 'No, none are related', value: 'no' }
		]
	}
];
