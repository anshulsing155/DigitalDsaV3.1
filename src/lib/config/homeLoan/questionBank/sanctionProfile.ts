import type { RawSchemaQuestion } from '../types.js';

/**
 * Pre-Sanction Profile questions for the `sanctionProfile_homeLoan` page.
 *
 * 5 questions covering loan term (capped at 25yr for pre-sanction),
 * sanction calculation method, down payment, and personal loan bridging.
 * Only shown when property is NOT yet identified (New Loan + propertyIdentified=No).
 *
 * Source of truth: homeLoanSchemaV2.json — sanctionProfile_homeLoan page
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
// q2 — Sanction Calculation Method
// ---------------------------------------------------------------------------

export const q2_sanctionType: RawSchemaQuestion = {
	id: 'q2_sanctionType',
	bindsTo_template: 'sanctionType',
	contextKey: 'sanctionType',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,

	question: 'How should we calculate the maximum sanctioned amount?',

	options: [
		{
			label: 'Based On Eligibility',
			value: 'Based On Eligibility',
			uiMeta: { icon: 'Circle' },
			icon: 'Gauge'
		},
		{
			label: 'Based on Downpayment',
			value: 'Based on Downpayment',
			uiMeta: { icon: 'Circle' },
			icon: 'IndianRupee'
		}
	]
};

// ---------------------------------------------------------------------------
// q3 — Down Payment (Pre-Sanction)
// ---------------------------------------------------------------------------

export const q3_deposit: RawSchemaQuestion = {
	id: 'q3_deposit',
	bindsTo_template: 'deposit',
	contextKey: 'deposit',
	type: 'currency',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter down payment budget'
	},
	required: true,
	minLimit: 0,
	maxLimit: 9999999999,

	question: 'How much down payment can you make?',

	showWhen: {
		'==': [{ var: 'sanctionType' }, 'Based on Downpayment']
	}
};

// ---------------------------------------------------------------------------
// q4 — Personal Loan Bridge Option
// ---------------------------------------------------------------------------

export const q4_withPersonalLoan: RawSchemaQuestion = {
	id: 'q4_withPersonalLoan',
	bindsTo_template: 'withPersonalLoan',
	contextKey: 'withPersonalLoan',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,

	question: 'Would you like to see personal loan options that can bridge the down payment gap?',

	description:
		"<div class='info-box highlight'>If your eligibility is high but down payment falls short, a personal loan can bridge the gap and make the property attainable.</div>",

	options: [
		{
			label: 'Yes, show options',
			value: 'Yes',
			uiMeta: { icon: 'Circle' },
			icon: 'ThumbsUp'
		},
		{
			label: 'No thanks',
			value: 'No',
			uiMeta: { icon: 'Circle' },
			icon: 'ThumbsDown'
		}
	],

	showWhen: {
		and: [
			{ '==': [{ var: 'sanctionType' }, 'Based on Downpayment'] },
			{ '!=': [{ var: 'deposit' }, ''] }
		]
	}
};

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

/** All pre-sanction profile questions in page order */
export function getSanctionProfileQuestions(): RawSchemaQuestion[] {
	return [
		q1_mortgageYear,
		q1a_mortgageYearCustom,
		q2_sanctionType,
		q3_deposit,
		q4_withPersonalLoan
	];
}
