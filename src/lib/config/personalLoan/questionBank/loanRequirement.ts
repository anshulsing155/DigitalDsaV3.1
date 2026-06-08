/**
 * Loan Requirements Questions
 * Page: loanRequirementPage
 *
 * Facility-aware: questions adapt based on facilityType (Term/OD/DOD/CC)
 * and loanType (New Loan / Debt Consolidation / DC with Extra Funds).
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';

// ── Reusable JSON-Logic fragments ──────────────────────────────────────────
const IS_CREDIT_LINE = {
	in: [
		{ var: 'facilityType' },
		[
			'Overdraft (OD)',
			'Drop-line OverDraft (DOD)',
			'Cash Credit (CC)',
			'Flexi Drop-line OverDraft (Flexi DOD)'
		]
	]
};
const IS_DC = { '==': [{ var: 'loanType' }, 'Debt Consolidation'] };
const IS_DC_EXTRA = { '==': [{ var: 'loanType' }, 'Debt Consolidation with Extra Funds'] };
const IS_DC_ANY = {
	in: [{ var: 'loanType' }, ['Debt Consolidation', 'Debt Consolidation with Extra Funds']]
};

export const q0_loanPurpose: RawSchemaQuestion = {
	id: 'q0_loanPurpose',
	bindsTo_template: 'loanPurpose',
	contextKey: 'loanPurpose',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'target'
	},
	required: true,
	question: {
		switch: [
			{
				case: IS_DC_EXTRA,
				then: 'What will the extra funds be used for?'
			},
			{
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: 'What is the primary purpose of this loan?'
			}
		]
	},
	description: {
		switch: [
			{
				case: IS_DC_EXTRA,
				then: "<div class='info-title'><span class='info-icon green'>🎯</span> Extra Funds Purpose</div><div class='info-box highlight'>The primary purpose (debt consolidation) is already set. Select what the <span class='bold'>additional funds</span> will be used for.</div>"
			},
			{
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: "<div class='info-title'><span class='info-icon green'>🎯</span> Loan Purpose</div><div class='info-box highlight'>Helps match with lenders who specialize in your type of requirement.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Some lenders offer better rates for specific purposes like medical or education.</div>"
			}
		]
	},
	options: [
		{
			label: 'Medical / Healthcare',
			value: 'medical',
			icon: 'Heart'
		},
		{
			label: 'Education / Training',
			value: 'education',
			icon: 'GraduationCap'
		},
		{
			label: 'Home Renovation',
			value: 'home_renovation',
			icon: 'Paintbrush'
		},
		{
			label: 'Wedding / Family Event',
			value: 'wedding',
			icon: 'PartyPopper'
		},
		{
			label: 'Travel',
			value: 'travel',
			icon: 'Plane'
		},
		{
			label: 'Consumer Purchase',
			value: 'consumer_purchase',
			icon: 'ShoppingCart'
		},
		{
			label: 'Other Personal Need',
			value: 'other',
			icon: 'CircleDot'
		}
	],
	// Hide for pure Debt Consolidation — purpose is implicit (debt consolidation)
	// Show for New Loan (all purposes) and DC+Extra (extra funds purpose)
	showWhen: { '!=': [{ var: 'loanType' }, 'Debt Consolidation'] },
	warning: {
		condition: [
			{
				case: {
					and: [
						IS_CREDIT_LINE,
						{ in: [{ var: 'loanPurpose' }, ['medical', 'education', 'wedding', 'home_renovation']] }
					]
				},
				then: 'Medical, education, wedding, and renovation needs require structured EMI repayment \u2014 not revolving credit (OD/CC). Consider switching to a Term Loan.'
			}
		]
	}
};

export const q1_loanTenure: RawSchemaQuestion = {
	id: 'q1_loanTenure',
	bindsTo_template: 'loanTenure',
	contextKey: 'loanTenure',
	type: 'select',
	uiGroup: 'select_fields',
	selectClass: 'mt-8 md:mt-12',
	uiMeta: {
		placeholder: 'Select tenure in years',
		icon: 'calendar'
	},
	required: true,
	question: {
		switch: [
			{
				case: IS_CREDIT_LINE,
				then: 'What is the desired facility period?'
			},
			{
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: 'Preferred loan tenure'
			}
		]
	},
	descriptionHeader: {
		switch: [
			{
				case: IS_CREDIT_LINE,
				then: 'Select the desired facility tenure. Credit facilities are typically renewed annually by the bank.'
			},
			{
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: 'Choose the preferred repayment duration. Shorter tenure means higher EMI but less total interest.'
			}
		]
	},
	description: {
		switch: [
			{
				case: IS_CREDIT_LINE,
				then: "<div class='info-title'><span class='info-icon green'>📅</span> Facility Period</div><div class='info-box highlight'>Select the desired facility tenure. Credit facilities (OD/CC) are typically renewed annually.</div><div class='visual-diagram'><div class='diagram-row'><span class='bold'>OD / CC:</span> <span class='diagram-value'>Annual renewal, interest on utilized amount</span></div><div class='diagram-row'><span class='bold'>Drop-line OD:</span> <span class='diagram-value'>Limit reduces over the period</span></div></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Most banks offer OD/CC with 1-year renewable periods. DOD tenures are typically 3-5 years.</div>"
			},
			{
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: "<div class='info-title'><span class='info-icon green'>📅</span> Loan Tenure Selection</div><div class='info-box highlight'>Choose the preferred loan repayment duration (1-7 years).</div><div class='visual-diagram'><div class='diagram-row'><span class='bold'>Shorter Tenure:</span> <span class='diagram-value'>Higher EMI, Less Interest</span></div><div class='diagram-row'><span class='bold'>Longer Tenure:</span> <span class='diagram-value'>Lower EMI, More Interest</span></div></div><div class='stats-row'><div class='stat'><span class='stat-value'>1-3 yrs</span><span class='stat-label'>Short Term</span></div><div class='stat'><span class='stat-value'>4-5 yrs</span><span class='stat-label'>Medium Term</span></div><div class='stat'><span class='stat-value'>6-7 yrs</span><span class='stat-label'>Long Term</span></div></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Balance EMI affordability with total interest cost when selecting tenure.</div>"
			}
		]
	},
	options: [
		{ label: '1', value: '1' },
		{ label: '2', value: '2' },
		{ label: '3', value: '3' },
		{ label: '4', value: '4' },
		{ label: '5', value: '5' },
		{ label: '6', value: '6' },
		{ label: '7', value: '7' }
	],
	// Show when purpose is answered (New Loan / DC+Extra flow)
	// OR when loanType is pure DC (purpose question is hidden, skip to tenure)
	showWhen: {
		or: [{ '!=': [{ var: 'loanPurpose' }, ''] }, IS_DC]
	},
	warning: {
		condition: [
			{
				case: {
					and: [
						{ in: [{ var: 'facilityType' }, ['Overdraft (OD)', 'Cash Credit (CC)']] },
						{ '>': [{ var: 'loanTenure' }, 1] }
					]
				},
				then: 'OD/CC facilities renew annually. A tenure beyond 1 year means the bank must agree to renew each year \u2014 not guaranteed.'
			},
			{
				case: {
					and: [{ '==': [{ var: 'loanPurpose' }, 'medical'] }, { '>=': [{ var: 'loanTenure' }, 5] }]
				},
				then: 'Medical expenses are one-time costs. A 5+ year tenure means significantly more interest paid. Consider 1\u20133 years to minimize total cost.'
			}
		]
	}
};

export const q2_loanAmount: RawSchemaQuestion = {
	id: 'q2_loanAmount',
	bindsTo_template: 'loanAmount',
	contextKey: 'loanAmount',
	type: 'currency',
	textClass: 'mt-8 md:mt-12',
	uiMeta: {
		placeholder: 'Enter amount in rupees'
	},
	required: false,
	minLimit: 25000,
	maxLimit: 100000000,
	question: {
		switch: [
			{
				case: { and: [IS_DC, IS_CREDIT_LINE] },
				then: 'What is the existing facility limit to be taken over?'
			},
			{
				case: IS_DC,
				then: 'Expected consolidation amount (if known)'
			},
			{
				case: { and: [IS_DC_EXTRA, IS_CREDIT_LINE] },
				then: 'What enhancement amount is needed above the current limit?'
			},
			{
				case: IS_DC_EXTRA,
				then: 'What extra amount is needed above consolidation?'
			},
			{
				case: IS_CREDIT_LINE,
				then: 'What credit limit is required?'
			},
			{
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: 'What loan amount is needed?'
			}
		]
	},
	description: {
		switch: [
			{
				case: IS_DC_ANY,
				then: "<div class='info-title'><span class='info-icon green'>₹</span> Takeover Amount</div><div class='info-box highlight'>Enter the existing facility amount to be taken over. Leave blank if not yet confirmed.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Check the latest sanction letter or account statement for the exact outstanding/limit.</div>"
			},
			{
				case: IS_CREDIT_LINE,
				then: "<div class='info-title'><span class='info-icon green'>₹</span> Credit Limit Required</div><div class='info-box highlight'>Enter the credit limit needed. Leave blank for maximum eligible limit.</div><div class='info-box tip'><span class='bold'>💡 Consider:</span> Monthly expenses, existing EMIs, and cash flow needs when deciding the limit.</div>"
			},
			{
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: "<div class='info-title'><span class='info-icon green'>₹</span> Desired Loan Amount</div><div class='info-box highlight'>Enter the loan amount required for personal needs. Leave blank for maximum eligible amount.</div><div class='stats-row'><div class='stat'><span class='stat-value'>₹1L+</span><span class='stat-label'>Minimum</span></div><div class='stat'><span class='stat-value'>Up to 30x Salary</span><span class='stat-label'>Typical Max</span></div></div><div class='info-box tip'><span class='bold'>💡 Consider:</span> Monthly salary, existing EMIs, and essential expenses when deciding the amount.</div><div class='info-box warning'><span class='bold'>⚠️ Note:</span> Final sanctioned amount depends on CIBIL score, salary, and lender assessment.</div>"
			}
		]
	},
	validation: {
		condition: [
			{
				case: {
					'<': [{ var: 'loanAmount' }, 100000]
				},
				then: 'Please enter minimum 1 lakh amount'
			}
		]
	},
	showWhen: {
		'!=': [{ var: 'loanTenure' }, '']
	}
};

export const q3_urgencyLevel: RawSchemaQuestion = {
	id: 'q3_urgencyLevel',
	bindsTo_template: 'urgencyLevel',
	contextKey: 'urgencyLevel',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-3 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'clock'
	},
	required: false,
	question: {
		switch: [
			{
				case: IS_DC_ANY,
				then: 'How urgently is the takeover needed?'
			},
			{
				case: IS_CREDIT_LINE,
				then: 'How urgently is the facility needed?'
			},
			{
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: 'How urgently is the loan needed?'
			}
		]
	},
	description:
		"<div class='info-title'><span class='info-icon orange'>⏰</span> Urgency Assessment</div><div class='info-box highlight'>Helps prioritize your application and match with lenders who offer faster processing.</div>",
	options: [
		{
			label: 'Immediately (within 1 week)',
			value: 'immediate',
			icon: 'Zap'
		},
		{
			label: 'Soon (within 1 month)',
			value: 'soon',
			icon: 'Clock'
		},
		{
			label: 'Planning ahead',
			value: 'planning',
			icon: 'Calendar'
		}
	],
	showWhen: {
		'!=': [{ var: 'loanTenure' }, '']
	},
	// Session 33: Item 20 — warn when urgent but no amount specified
	warning: {
		condition: [
			{
				case: {
					and: [
						{ '==': [{ var: 'urgencyLevel' }, 'immediate'] },
						{
							or: [
								{ '==': [{ var: 'loanAmount' }, ''] },
								{ '==': [{ var: 'loanAmount' }, 0] },
								{ '!': [{ var: 'loanAmount' }] }
							]
						}
					]
				},
				then: 'Immediate urgency selected but loan amount not specified \u2014 lenders need an amount to process urgent applications. Please enter at least an approximate amount.'
			}
		]
	}
};

/** Returns all questions for the Loan Requirements page */
export function getLoanRequirementPageQuestions(): RawSchemaQuestion[] {
	return [q0_loanPurpose, q1_loanTenure, q2_loanAmount];
}
