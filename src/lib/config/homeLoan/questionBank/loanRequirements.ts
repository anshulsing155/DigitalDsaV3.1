import type { RawSchemaQuestion } from '../types.js';

/**
 * Loan Requirements questions for the `loanRequirements_homeLoan` page.
 *
 * Loan term + top-up tenure, amount, and purpose.
 * Only shown for BT/Top-up loan types.
 *
 * Source of truth: homeLoanSchemaV2.json — loanRequirements_homeLoan page
 */

// ---------------------------------------------------------------------------
// q1 — Preferred Loan Term (Pre-Sanction — max 25yr)
// ---------------------------------------------------------------------------

export const q1_mortgageYear: RawSchemaQuestion = {
	id: 'q1_mortgageYear',
	bindsTo_template: 'mortgageYear',
	contextKey: 'mortgageYear',
	type: 'radio',
	radioClass: 'mt-[1rem] md:mt-[2rem]',
	optionContainerClass: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3',
	uiGroup: 'loan_details',
	uiMeta: { icon: 'CalendarRange' },
	required: true,

	question: 'Preferred loan term?',

	description:
		"<div class='info-box highlight'>Max 25 years for pre-sanction (no property = conservative assessment).</div>",

	options: [
		{ label: '10 yrs', value: '10', icon: 'Calendar' },
		{ label: '15 yrs', value: '15', icon: 'Calendar' },
		{ label: '20 yrs', value: '20', icon: 'Calendar' },
		{ label: '25 yrs', value: '25', icon: 'Calendar' },
		{ label: 'Max possible', value: 'MAX', icon: 'CalendarRange' },
		{ label: 'Other', value: 'OTHER', icon: 'PenLine' }
	]
};

// ---------------------------------------------------------------------------
// q1a — Custom Loan Term (Pre-Sanction — 5-25yr)
// ---------------------------------------------------------------------------

export const q1a_mortgageYearCustom: RawSchemaQuestion = {
	id: 'q1a_mortgageYearCustom',
	bindsTo_template: 'mortgageYearCustom',
	contextKey: 'mortgageYearCustom',
	type: 'text',
	uiType: 'number',
	textFieldClass: 'mt-4 md:mt-6',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter years (5-25)',
		icon: 'calendar',
		showNumberInWords: false
	},
	required: true,
	minLimit: 5,
	maxLimit: 25,

	question: 'Enter custom loan term (in years)',

	validation: {
		condition: [
			{
				case: {
					or: [
						{ '<': [{ var: 'mortgageYearCustom' }, 5] },
						{ '>': [{ var: 'mortgageYearCustom' }, 25] }
					]
				},
				then: 'Loan term must be between 5 and 25 years for pre-sanction.'
			}
		]
	},

	showWhen: {
		'==': [{ var: 'mortgageYear' }, 'OTHER']
	}
};

// ---------------------------------------------------------------------------
// q4 — Top-up Tenure
// ---------------------------------------------------------------------------

export const q4_topUpTenure: RawSchemaQuestion = {
	id: 'q4_topUpTenure',
	bindsTo_template: 'topUpTenure',
	contextKey: 'topUpTenure',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select top-up tenure',
		icon: 'calendar'
	},
	required: true,

	question: 'How long would you like the top-up loan term to be?',

	options: [
		{ label: '10 yrs', value: '10' },
		{ label: '15 yrs', value: '15' },
		{ label: '20 yrs', value: '20' },
		{ label: '25 yrs', value: '25' },
		{ label: '30 yrs', value: '30' },
		{ label: 'Max possible', value: 'MAX' }
	],

	showWhen: {
		in: [{ var: 'loanType' }, ['Top-up Only', 'Balance Transfer With Top-up']]
	}
};

// ---------------------------------------------------------------------------
// q5 — Top-up Amount
// ---------------------------------------------------------------------------

export const q5_topUpAmount: RawSchemaQuestion = {
	id: 'q5_topUpAmount',
	bindsTo_template: 'topUpAmount',
	contextKey: 'topUpAmount',
	type: 'currency',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter required top-up amount'
	},
	required: true,
	minLimit: 100000,
	maxLimit: 9999999999,
	limit: 'sanctionLimit',
	limitCheckerText: 'Based on LTV and property value, you can enter up to \u20b9',

	question: 'What is the required top-up amount?',

	validation: {
		condition: [
			{
				case: { '<': [{ var: 'topUpAmount' }, 500000] },
				then: 'Lenders do not accept top-up below \u20b95 Lakhs.'
			}
		]
	},

	showWhen: {
		and: [
			{
				in: [{ var: 'loanType' }, ['Top-up Only', 'Balance Transfer With Top-up']]
			},
			{
				or: [{ '!=': [{ var: 'topUpTenure' }, ''] }, { '!=': [{ var: 'mortgageYear' }, ''] }]
			}
		]
	}
};

// ---------------------------------------------------------------------------
// q6 — Top-up Purpose
// ---------------------------------------------------------------------------

export const q6_topUpPurpose: RawSchemaQuestion = {
	id: 'q6_topUpPurpose',
	bindsTo_template: 'topUpPurpose',
	contextKey: 'topUpPurpose',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select purpose of top-up',
		icon: 'target'
	},
	required: true,

	question: 'What is the purpose of the top-up loan?',

	options: [
		{ label: 'Home Renovation / Repair', value: 'RENOVATION' },
		{ label: 'Home Extension / Additional Construction', value: 'EXTENSION' },
		{ label: 'Home Furnishing / Interior', value: 'FURNISHING' },
		{ label: 'Medical Expenses', value: 'MEDICAL' },
		{ label: 'Education', value: 'EDUCATION' },
		{ label: 'Business / Working Capital', value: 'BUSINESS' },
		{ label: 'Debt Consolidation', value: 'DEBT_CONSOLIDATION' },
		{ label: 'Wedding / Family Event', value: 'WEDDING' },
		{ label: 'Personal / Other', value: 'PERSONAL' }
	],

	showWhen: {
		and: [
			{
				in: [{ var: 'loanType' }, ['Top-up Only', 'Balance Transfer With Top-up']]
			},
			{ '!=': [{ var: 'topUpAmount' }, ''] }
		]
	}
};

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

/** All loan requirements questions in page order */
export function getLoanRequirementsQuestions(): RawSchemaQuestion[] {
	return [q1_mortgageYear, q1a_mortgageYearCustom, q4_topUpTenure, q5_topUpAmount, q6_topUpPurpose];
}
