/**
 * Existing Loan Details Questions (Balance Transfer)
 * Page: existingDetailsPage
 *
 * Shown only when PlotLoanActivity === 'Balance Transfer Only'.
 * Captures current loan details for BT assessment.
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';

export const q1_principalOutstanding: RawSchemaQuestion = {
	id: 'q1_principalOutstanding',
	bindsTo_template: 'principalOutstanding',
	contextKey: 'principalOutstanding',
	type: 'currency',
	textClass: 'mt-[1rem] md:mt-[2rem]',
	uiGroup: 'text_fields',
	uiMeta: {
		placeholder: 'Enter outstanding amount'
	},
	required: true,
	minLimit: 10000,
	maxLimit: 9999999999,
	question: 'What is the total outstanding principal of the current loan on property, as on today?',
	description:
		"<div class='info-title'><span class='info-icon gold'>📊</span> Outstanding Principal Amount</div><div class='info-box highlight'>This is the remaining loan amount that you still owe to your current lender (not the total of remaining EMIs).</div><div class='info-divider'></div><div class='info-box warning'><span class='bold'>⚠️ Common Confusion:</span><ul class='info-list'><li><span class='bold'>Outstanding Principal</span> = Actual remaining loan amount</li><li><span class='bold'>NOT</span> = Total of remaining EMIs (includes future interest)</li></ul></div><div class='visual-diagram'><div class='diagram-row'><span class='diagram-label'>📋 Where to find?</span><span class='diagram-value'>Repayment Schedule</span></div><div class='diagram-row'><span class='diagram-label'>📞 Or ask</span><span class='diagram-value'>Your current lender</span></div></div><div class='info-box note'><span class='bold'>📌 Important:</span> If you have multiple loans on the property (plot loan, LAP, construction loan), enter the <span class='highlight-text'>combined outstanding amount</span> of all loans to be closed.</div>",
	validation: {
		condition: [
			{
				case: {
					'<': [{ var: 'principalOutstanding' }, 500000]
				},
				then: 'Please enter a minimum principal outstanding amount of 5 lakh.'
			}
		]
	}
};

export const q4_bankName: RawSchemaQuestion = {
	id: 'q4_bankName',
	bindsTo_template: 'bankName',
	contextKey: 'banksName',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select bank name',
		icon: 'landmark'
	},
	required: true,
	question: 'Please select the lender with whom your current loan is active.',
	showWhen: {
		'!=': [{ var: 'principalOutstanding' }, '']
	}
};

// Helper: btRemainingTenure is a string enum select (`<1`, `1`, `2`…`10`,
// `11-15`, `>15`). To run a JSON-Logic EMI-plausibility check (lower bound
// = principal / months_remaining), we need a months number per enum.
// The map below uses the literal year for single-year options and the
// bucket MIDPOINT for ranges (so the floor check stays generous and
// over-warns at the bucket edges are less likely). `<1` uses 6 months
// (midpoint of 0-12). `11-15` uses 13 years = 156 months. `>15` uses 16
// years = 192 months — going higher tightens the upper-bound test without
// much false-rejection risk because EMI/principal drops gently past 15
// years.
const TENURE_TO_MONTHS_SWITCH = {
	switch: [
		{ case: { '==': [{ var: 'btRemainingTenure' }, '<1'] }, then: 6 },
		{ case: { '==': [{ var: 'btRemainingTenure' }, '1'] }, then: 12 },
		{ case: { '==': [{ var: 'btRemainingTenure' }, '2'] }, then: 24 },
		{ case: { '==': [{ var: 'btRemainingTenure' }, '3'] }, then: 36 },
		{ case: { '==': [{ var: 'btRemainingTenure' }, '4'] }, then: 48 },
		{ case: { '==': [{ var: 'btRemainingTenure' }, '5'] }, then: 60 },
		{ case: { '==': [{ var: 'btRemainingTenure' }, '6'] }, then: 72 },
		{ case: { '==': [{ var: 'btRemainingTenure' }, '7'] }, then: 84 },
		{ case: { '==': [{ var: 'btRemainingTenure' }, '8'] }, then: 96 },
		{ case: { '==': [{ var: 'btRemainingTenure' }, '9'] }, then: 108 },
		{ case: { '==': [{ var: 'btRemainingTenure' }, '10'] }, then: 120 },
		{ case: { '==': [{ var: 'btRemainingTenure' }, '11-15'] }, then: 156 },
		{ case: { '==': [{ var: 'btRemainingTenure' }, '>15'] }, then: 192 }
	],
	default: 0
};

export const q2_btCurrentEmi: RawSchemaQuestion = {
	id: 'q2_btCurrentEmi',
	bindsTo_template: 'btCurrentEmi',
	contextKey: 'btCurrentEmi',
	type: 'currency',
	textClass: 'mt-8 md:mt-12',
	uiGroup: 'text_fields',
	uiMeta: {
		placeholder: 'Enter current EMI amount'
	},
	required: true,
	minLimit: 500,
	maxLimit: 10000000,
	question: 'What is the current monthly EMI amount?',
	description:
		"<div class='info-box highlight'>Enter the EMI you are currently paying to your existing lender. This helps assess savings potential through balance transfer.</div>",
	showWhen: {
		'!=': [{ var: 'bankName' }, '']
	},
	validation: {
		condition: [
			// Cross-field plausibility — lower bound (zero-interest floor):
			// EMI ≥ 0.9 × principal / months. Anything below is mathematically
			// impossible — the zero-interest floor is principal/months.
			// Tenure enum is mapped to months via TENURE_TO_MONTHS_SWITCH above;
			// fires only when both principal and tenure are answered (months > 0).
			{
				case: {
					and: [
						{ '>': [{ var: 'principalOutstanding' }, 0] },
						{ '>': [TENURE_TO_MONTHS_SWITCH, 0] },
						{
							'<': [
								{ var: 'btCurrentEmi' },
								{
									'*': [
										0.9,
										{ '/': [{ var: 'principalOutstanding' }, TENURE_TO_MONTHS_SWITCH] }
									]
								}
							]
						}
					]
				},
				then: 'EMI looks too low for this principal and remaining tenure — even at 0% interest the EMI would need to be at least the principal divided by the months remaining. Please re-check.'
			},
			// Cross-field plausibility — upper bound (typo catcher):
			// EMI ≤ 1.6 × principal / months. Catches typos like an extra zero
			// without false-rejecting legitimate high-rate / short-tenure cases.
			{
				case: {
					and: [
						{ '>': [{ var: 'principalOutstanding' }, 0] },
						{ '>': [TENURE_TO_MONTHS_SWITCH, 0] },
						{
							'>': [
								{ var: 'btCurrentEmi' },
								{
									'*': [
										1.6,
										{ '/': [{ var: 'principalOutstanding' }, TENURE_TO_MONTHS_SWITCH] }
									]
								}
							]
						}
					]
				},
				then: 'EMI looks too high for this principal and remaining tenure — please re-check (possible typo of an extra zero).'
			}
		]
	}
};

export const q3_btRemainingTenure: RawSchemaQuestion = {
	id: 'q3_btRemainingTenure',
	bindsTo_template: 'btRemainingTenure',
	contextKey: 'btRemainingTenure',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select remaining tenure',
		icon: 'calendar'
	},
	required: true,
	question: 'How many years are remaining on the current loan?',
	options: [
		{ label: 'Less than 1 year', value: '<1' },
		{ label: '1 year', value: '1' },
		{ label: '2 years', value: '2' },
		{ label: '3 years', value: '3' },
		{ label: '4 years', value: '4' },
		{ label: '5 years', value: '5' },
		{ label: '6 years', value: '6' },
		{ label: '7 years', value: '7' },
		{ label: '8 years', value: '8' },
		{ label: '9 years', value: '9' },
		{ label: '10 years', value: '10' },
		{ label: '11-15 years', value: '11-15' },
		{ label: 'More than 15 years', value: '>15' }
	],
	showWhen: {
		and: [{ '!=': [{ var: 'btCurrentEmi' }, null] }, { '!=': [{ var: 'btCurrentEmi' }, ''] }]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'btRemainingTenure' }, '<1']
				},
				then: 'With less than 1 year remaining, balance transfer may not be cost-effective after processing fees and charges. Evaluate carefully.'
			}
		]
	}
};

export const q5_btInterestRateType: RawSchemaQuestion = {
	id: 'q5_btInterestRateType',
	bindsTo_template: 'btInterestRateType',
	contextKey: 'btInterestRateType',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'What type of interest rate is on the current loan?',
	options: [
		{
			label: 'Floating rate',
			value: 'floating',
			icon: 'TrendingUp'
		},
		{
			label: 'Fixed rate',
			value: 'fixed',
			icon: 'Lock'
		},
		{
			label: 'Not sure',
			value: 'unknown',
			icon: 'HelpCircle'
		}
	],
	showWhen: {
		'!=': [{ var: 'btRemainingTenure' }, '']
	}
};

export const q6_btExistingInterestRate: RawSchemaQuestion = {
	id: 'q6_btExistingInterestRate',
	bindsTo_template: 'btExistingInterestRate',
	contextKey: 'btExistingInterestRate',
	type: 'text',
	uiType: 'number',
	fieldType: 'percentage',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'e.g. 9.5',
		icon: 'percent'
	},
	required: false,
	minLimit: 1,
	maxLimit: 30,
	question: 'What is the current interest rate? (if known)',
	description:
		"<div class='info-box highlight'>Enter the current interest rate on your existing loan. This helps calculate potential savings from balance transfer. Check your latest loan statement or online banking portal.</div>",
	showWhen: {
		'!=': [{ var: 'btInterestRateType' }, '']
	},
	validation: {
		condition: [
			{
				case: {
					and: [
						{ '!=': [{ var: 'btExistingInterestRate' }, ''] },
						{
							or: [
								{ '<': [{ var: 'btExistingInterestRate' }, 1] },
								{ '>': [{ var: 'btExistingInterestRate' }, 30] }
							]
						}
					]
				},
				then: 'Interest rate should be between 1% and 30%.'
			}
		]
	}
};

/** Returns all questions for the existing details page */
export function getExistingDetailsPageQuestions(): RawSchemaQuestion[] {
	return [
		q1_principalOutstanding,
		q4_bankName,
		q2_btCurrentEmi,
		q3_btRemainingTenure,
		q5_btInterestRateType,
		q6_btExistingInterestRate
	];
}
