/**
 * Loan Amount & Tenure Questions
 * Page: loanRequirementPage
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';

export const q1_mortgageYear: RawSchemaQuestion = {
	id: 'q1_mortgageYear',
	groupId: 'lap_loan_structure',
	groupTitle: 'Loan Structure',
	bindsTo_template: 'mortgageYear',
	contextKey: 'mortgageYear',
	type: 'select',
	selectClass: 'mt-[1rem] md:mt-[2rem]',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select loan tenure in years',
		icon: 'calendar'
	},
	required: true,
	question: 'How long would you like your LAP term to be?',
	description:
		"<div class='info-title'><span class='info-icon gold'>⏱️</span> LAP Loan Term</div><div class='info-box highlight'>The loan term determines how long you'll take to repay your Loan Against Property.</div><div class='visual-diagram'><div class='diagram-row'><span class='diagram-value'>Example: ₹50 Lakh LAP @ 10%</span></div></div><div class='stats-row'><div class='stat'><div class='stat-value'>₹1,06,000</div><div class='stat-label'>EMI for 5 Yrs</div></div><div class='stat'><div class='stat-value'>₹66,000</div><div class='stat-label'>EMI for 10 Yrs</div></div><div class='stat'><div class='stat-value'>₹54,000</div><div class='stat-label'>EMI for 15 Yrs</div></div></div><div class='info-box note'><span class='bold'>📊 Interest Impact:</span><ul><li>5 Year Term → Total Interest: ~₹13.5 Lakh</li><li>10 Year Term → Total Interest: ~₹29 Lakh</li><li>15 Year Term → Total Interest: ~₹47 Lakh</li></ul></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Balance between affordable EMI and total interest cost. Most borrowers prefer 8-12 year terms. You can prepay anytime to save on interest!</div>",
	options: [
		{
			label: '5',
			value: '5'
		},
		{
			label: '6',
			value: '6'
		},
		{
			label: '7',
			value: '7'
		},
		{
			label: '8',
			value: '8'
		},
		{
			label: '9',
			value: '9'
		},
		{
			label: '10',
			value: '10'
		},
		{
			label: '11',
			value: '11'
		},
		{
			label: '12',
			value: '12'
		},
		{
			label: '13',
			value: '13'
		},
		{
			label: '14',
			value: '14'
		},
		{
			label: '15',
			value: '15'
		}
	],
	// Session 33: Item 11 — warn when leasehold tenure exceeds remaining lease
	warning: {
		condition: [
			{
				case: {
					and: [
						{ '==': [{ var: 'propertyType' }, 'Lease Hold'] },
						{ '==': [{ var: 'leaseRemainingPeriod' }, '10_TO_20'] },
						{ '>': [{ var: 'mortgageYear' }, 10] }
					]
				},
				then: 'Lease has 10\u201320 years remaining but loan tenure exceeds 10 years. Loan tenure must end well before lease expiry \u2014 lenders typically require a 5-year buffer.'
			},
			{
				case: {
					and: [
						{ '==': [{ var: 'propertyType' }, 'Lease Hold'] },
						{ '==': [{ var: 'leaseRemainingPeriod' }, 'LESS_THAN_10'] }
					]
				},
				then: 'Lease has less than 10 years remaining \u2014 no lender will finance a LAP with such a short lease period.'
			}
		]
	}
};

export const q_loanPurpose: RawSchemaQuestion = {
	id: 'q_loanPurpose',
	groupId: 'lap_loan_structure',
	bindsTo_template: 'loanPurpose',
	contextKey: 'loanPurpose',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select purpose of loan',
		icon: 'target'
	},
	required: true,
	question: 'What is the primary purpose of this loan?',
	description:
		"<div class='info-title'><span class='info-icon gold'>🎯</span> Loan Purpose</div><div class='info-box highlight'>Lenders are required to document the purpose of the loan as part of RBI regulatory compliance.</div><div class='info-box note'><span class='bold'>This helps in:</span><ul class='info-list'><li>Matching you with the right lender programs</li><li>Faster processing as purpose is pre-documented</li><li>Some lenders offer better rates for business use cases</li></ul></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Choose the option that best describes your primary use of the funds. If you have multiple purposes, select the one for which the majority of the amount will be used.</div>",
	options: [
		{
			label: 'Business Expansion / Working Capital',
			value: 'BUSINESS_EXPANSION'
		},
		{
			label: 'Personal Needs (Medical, Education, Wedding)',
			value: 'PERSONAL_NEEDS'
		},
		{
			label: 'Debt Consolidation',
			value: 'DEBT_CONSOLIDATION'
		},
		{
			label: 'Home Renovation / Improvement',
			value: 'HOME_RENOVATION'
		},
		{
			label: 'Purchase of Another Property',
			value: 'PROPERTY_PURCHASE'
		},
		{
			label: 'Investment / Asset Purchase',
			value: 'INVESTMENT'
		},
		{
			label: 'Other',
			value: 'OTHER'
		}
	],
	showWhen: {
		'!=': [
			{
				var: 'mortgageYear'
			},
			''
		]
	}
};

export const q3_propCost: RawSchemaQuestion = {
	id: 'q3_propCost',
	groupId: 'lap_amount',
	groupTitle: 'Amount & Property',
	bindsTo_template: 'propCost',
	contextKey: 'propCost',
	type: 'currency',
	textClass: 'mt-8 md:mt-12',
	uiGroup: 'loan_details',
	uiMeta: {
		placeholder: 'Enter property cost'
	},
	required: true,
	minLimit: 500000,
	maxLimit: 9999999999,
	question: 'What would you estimate the current value of the property?',
	description:
		"<div class='info-title'><span class='info-icon blue'>🏠</span> Current Property Value</div><div class='info-box highlight'>Enter the estimated current market value of your property being mortgaged.</div><div class='stats-row'><div class='stat'><div class='stat-value'>60-70%</div><div class='stat-label'>LTV Residential</div></div><div class='stat'><div class='stat-value'>50-60%</div><div class='stat-label'>LTV Commercial</div></div></div><div class='info-box note'><span class='bold'>📊 Valuation Factors:</span><ul><li>Location & neighborhood</li><li>Property age & condition</li><li>Construction quality</li><li>Amenities & facilities</li><li>Recent sales in the area</li></ul></div><div class='info-box warning'><span class='bold'>⚠️ Important:</span> Accurate numbers get you accurate offers! The lender will conduct independent valuation, and significant discrepancies may cause delays.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Check recent property sales in your area or consult a local property dealer for a realistic estimate.</div>",
	validation: {
		condition: [
			{
				case: {
					'<': [
						{
							var: 'propCost'
						},
						2000000
					]
				},
				then: 'We are providing services for the minimum loan amount of 20 Lakhs Hence the property cost should be more than 20 Lakhs.'
			}
		]
	},
	showWhen: {
		'!=': [
			{
				var: 'mortgageYear'
			},
			''
		]
	}
};

export const q3_loanAmount: RawSchemaQuestion = {
	id: 'q3_loanAmount',
	groupId: 'lap_amount',
	bindsTo_template: 'RequiredLoanAmount',
	contextKey: 'RequiredLoanAmount',
	type: 'currency',
	textClass: 'mt-8 md:mt-12',
	uiMeta: {
		placeholder: 'Enter your required amount'
	},
	required: true,
	minLimit: 100000,
	maxLimit: 9999999999,
	question: 'Please specify your desired loan amount.',
	description:
		"<div class='info-title'><span class='info-icon gold'>💰</span> Desired Loan Amount</div><div class='info-box highlight'>Specify how much funding you need from your Loan Against Property.</div><div class='visual-diagram'><div class='diagram-row'><span class='diagram-value'>Property Value</span> × <span class='diagram-value'>LTV %</span> = <span class='diagram-value'>Max Eligible</span></div><div class='diagram-row'>₹1 Crore × 65% = ₹65 Lakhs</div></div><div class='info-box note'><span class='bold'>📋 Eligibility Factors:</span><ul><li>Property valuation by lender</li><li>Your income & repayment capacity</li><li>Existing loan obligations (FOIR)</li><li>Credit score & history</li><li>Property type (Residential/Commercial)</li></ul></div><div class='stats-row'><div class='stat'><div class='stat-value'>40-50%</div><div class='stat-label'>Ideal EMI to Income</div></div><div class='stat'><div class='stat-value'>750+</div><div class='stat-label'>Good CIBIL Score</div></div></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Request only what you need. Lower loan amounts mean lower EMIs and better approval chances!</div>",
	validation: {
		condition: [
			{
				case: {
					'<': [
						{
							var: 'RequiredLoanAmount'
						},
						500000
					]
				},
				then: 'We do not provide services for the requirement value less than 5,00,000.'
			},
			{
				case: {
					'>=': [
						{
							var: 'RequiredLoanAmount'
						},
						{
							var: 'propCost'
						}
					]
				},
				then: 'Loan amount should not exceed property value.'
			}
		]
	},
	showWhen: {
		and: [
			{
				'!=': [
					{
						var: 'mortgageYear'
					},
					''
				]
			},
			{
				'!=': [
					{
						var: 'propCost'
					},
					''
				]
			}
		]
	}
};

export const q_dodMonthlyWithdrawal: RawSchemaQuestion = {
	id: 'q_dodMonthlyWithdrawal',
	groupId: 'lap_amount',
	bindsTo_template: 'dodMonthlyWithdrawal',
	contextKey: 'dodMonthlyWithdrawal',
	type: 'currency',
	textClass: 'mt-8 md:mt-12',
	uiGroup: 'text_fields',
	uiMeta: {
		placeholder: 'Expected monthly withdrawal'
	},
	required: false,
	minLimit: 0,
	maxLimit: 100000000,
	question:
		'What is your expected average monthly withdrawal from this overdraft facility? (Optional)',
	description:
		"<div class='info-title'><span class='info-icon blue'>💳</span> Expected Monthly Utilization</div><div class='info-box highlight'>For Drop-line OD, you only pay interest on the amount you actually use. Estimating monthly usage helps size the facility correctly.</div><div class='info-box note'><span class='bold'>How DOD works:</span><ul class='info-list'><li>Sanctioned limit reduces over time (drop-line)</li><li>Withdraw any amount up to the available limit</li><li>Pay interest only on the utilized amount</li><li>Repay and re-use within the available limit</li></ul></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> This is optional but helps lenders offer better terms. If unsure, you can leave this blank.</div>",
	showWhen: {
		and: [
			{
				'==': [
					{
						var: 'facilityType'
					},
					'Drop-line OverDraft (DOD)'
				]
			},
			{
				'==': [
					{
						var: 'loanType'
					},
					'New Loan'
				]
			},
			{
				'!=': [
					{
						var: 'propCost'
					},
					''
				]
			}
		]
	}
};

/** Returns all questions for the Loan Amount & Tenure page */
export function getLoanRequirementPageQuestions(): RawSchemaQuestion[] {
	return [q1_mortgageYear, q_loanPurpose, q3_propCost, q3_loanAmount, q_dodMonthlyWithdrawal];
}
