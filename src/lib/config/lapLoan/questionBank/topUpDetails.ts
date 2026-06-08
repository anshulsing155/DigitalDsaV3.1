/**
 * Balance Transfer & Top-Up Questions
 * Page: topUpDetailsPage
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';

export const q1_propCost: RawSchemaQuestion = {
	id: 'q1_propCost',
	bindsTo_template: 'propCost',
	contextKey: 'propCost',
	type: 'currency',
	textClass: 'mt-[1rem] md:mt-[2rem]',
	uiMeta: {
		placeholder: 'Enter property cost'
	},
	required: true,
	minLimit: 500000,
	maxLimit: 9999999999,
	question: 'What would you estimate the current value of the property?',
	description:
		"<div class='info-title'><span class='info-icon gold'>🏠</span> Property Valuation</div><div class='info-box highlight'>Enter your best estimate of the current market value of your property.</div><div class='stats-row'><div class='stat'><div class='stat-value'>60-70%</div><div class='stat-label'>Typical LTV for LAP</div></div><div class='stat'><div class='stat-value'>7-14 days</div><div class='stat-label'>Valuation Process</div></div></div><div class='info-box note'><span class='bold'>📊 How Lenders Value Property:</span><ul><li>Physical inspection by empaneled valuer</li><li>Comparison with recent sales in area</li><li>Circle rate consideration</li><li>Property condition assessment</li></ul></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Provide a realistic estimate. The lender's valuation will determine your final eligible loan amount, so overestimating won't help your case.</div>",
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
				then: 'We do not provide services for the property value less than 20 lakh.'
			}
		]
	}
};

export const q_btLoanPurpose: RawSchemaQuestion = {
	id: 'q_btLoanPurpose',
	groupId: 'lap_topup_details',
	groupTitle: 'Top-Up Details',
	bindsTo_template: 'loanPurpose',
	contextKey: 'loanPurpose',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select purpose of top-up',
		icon: 'target'
	},
	required: true,
	question: 'What is the primary purpose of the additional funds (top-up)?',
	description:
		"<div class='info-title'><span class='info-icon gold'>🎯</span> Top-Up Purpose</div><div class='info-box highlight'>Lenders are required to document the purpose of the additional funds as part of regulatory compliance.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Choose the option that best describes your primary use of the top-up amount.</div>",
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
		and: [
			{
				in: [
					{
						var: 'loanType'
					},
					['Balance Transfer With Top-up', 'Top-up Only']
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

export const q2_topUpAmount: RawSchemaQuestion = {
	id: 'q2_topUpAmount',
	groupId: 'lap_topup_details',
	bindsTo_template: 'topUpAmount',
	contextKey: 'topUpAmount',
	type: 'currency',
	textClass: 'mt-8 md:mt-12',
	uiMeta: {
		placeholder: 'Enter your required amount'
	},
	required: true,
	minLimit: 100000,
	maxLimit: 9999999999,
	question: 'Please specify the required Top-up amount?',
	description:
		"<div class='info-title'><span class='info-icon blue'>💵</span> Top-Up Loan Amount</div><div class='info-box highlight'>A top-up is additional loan amount over and above your existing outstanding principal.</div><div class='visual-diagram'><div class='diagram-row'><span class='diagram-value'>Property Value</span> ₹1,00,00,000</div><div class='diagram-row'><span class='diagram-value'>Max LTV (65%)</span> ₹65,00,000</div><div class='diagram-row'><span class='diagram-value'>Outstanding Principal</span> - ₹35,00,000</div><div class='info-divider'></div><div class='diagram-row'><span class='diagram-value bold'>Possible Top-Up</span> = ₹30,00,000</div></div><div class='info-box note'><span class='bold'>📋 Top-Up Eligibility Factors:</span><ul><li>Current property market value</li><li>Your repayment track record</li><li>Income & existing obligations</li><li>Lender's LTV policy</li></ul></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Top-up amounts vary by lender. We'll show you the best available options based on your profile.</div>",
	showWhen: {
		and: [
			{
				in: [
					{
						var: 'loanType'
					},
					['Balance Transfer With Top-up', 'Top-up Only']
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
	},
	validation: {
		condition: [
			{
				case: {
					'<': [
						{
							var: 'topUpAmount'
						},
						500000
					]
				},
				then: 'Lenders do not accept loan applications below 5 lakh. You should try for personal loan / Business loan for such low amount.'
			},
			{
				case: {
					'>=': [
						{
							var: 'topUpAmount'
						},
						{
							var: 'propCost'
						}
					]
				},
				then: 'Top-up amount should be less than property value.'
			}
		]
	}
};

export const q_topTenure: RawSchemaQuestion = {
	id: 'q_topTenure',
	groupId: 'lap_topup_details',
	bindsTo_template: 'mortgageYear',
	contextKey: 'mortgageYear',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select loan tenure in years',
		icon: 'calendar'
	},
	required: true,
	question: {
		switch: [
			{
				case: {
					'==': [
						{
							var: 'loanType'
						},
						'Top-up Only'
					]
				},
				then: 'What loan term would you prefer with this top-up?'
			},
			{
				case: {
					'!=': [
						{
							var: 'loanType'
						},
						'Top-up Only'
					]
				},
				then: 'What loan term would you prefer with the new lender?'
			}
		]
	},
	description:
		"<div class='info-title'><span class='info-icon green'>📅</span> Loan Tenure Selection</div><div class='info-box highlight'>Choose how long you want to repay your loan - from 5 to 15 years.</div><div class='stats-row'><div class='stat'><div class='stat-value'>5 Years</div><div class='stat-label'>Min Tenure</div></div><div class='stat'><div class='stat-value'>15 Years</div><div class='stat-label'>Max Tenure</div></div></div><div class='visual-diagram'><div class='diagram-row'><span class='diagram-value'>Shorter Tenure</span></div><div class='diagram-row'>✅ Less total interest | ❌ Higher EMI</div><div class='info-divider'></div><div class='diagram-row'><span class='diagram-value'>Longer Tenure</span></div><div class='diagram-row'>✅ Lower EMI | ❌ More total interest</div></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Choose a tenure that keeps your EMI within 40-50% of your monthly income for comfortable repayment. You can always prepay later to close the loan early!</div>",
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
	showWhen: {
		and: [
			{
				'!=': [
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

/** Returns all questions for the Balance Transfer & Top-Up page */
export function getTopUpDetailsPageQuestions(): RawSchemaQuestion[] {
	return [q1_propCost, q_btLoanPurpose, q2_topUpAmount, q_topTenure];
}
