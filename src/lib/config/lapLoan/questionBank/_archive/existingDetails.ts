/**
 * Current Loan Details Questions
 * Page: existingDetailsPage
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';

export const q1_principalOutstanding: RawSchemaQuestion = {
	id: 'q1_principalOutstanding',
	groupId: 'lap_existing_terms',
	groupTitle: 'Current Loan Terms',
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
	question: {
		switch: [
			{
				case: {
					or: [
						{
							and: [
								{
									'!=': [
										{
											var: 'LAPType'
										},
										''
									]
								},
								{
									'==': [
										{
											var: 'loanType'
										},
										'New Loan'
									]
								}
							]
						}
					]
				},
				then: 'What is the outstanding principal amount?'
			},
			{
				case: {
					or: [
						{
							and: [
								{
									'!=': [
										{
											var: 'LAPType'
										},
										''
									]
								},
								{
									in: [
										{
											var: 'loanType'
										},
										['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
									]
								}
							]
						}
					]
				},
				then: 'What is the outstanding principal of the current loan (LAP), as on today?'
			}
		]
	},
	description:
		"<div class='info-title'><span class='info-icon blue'>💰</span> Outstanding Principal Amount</div><div class='info-box highlight'>This is the remaining loan amount you still owe to your current lender (excluding interest).</div><div class='visual-diagram'><div class='diagram-row'><span class='diagram-value'>Original Loan</span> ₹50,00,000</div><div class='diagram-row'><span class='diagram-value'>Principal Paid</span> - ₹15,00,000</div><div class='info-divider'></div><div class='diagram-row'><span class='diagram-value bold'>Outstanding Principal</span> = ₹35,00,000</div></div><div class='info-box warning'><span class='bold'>⚠️ Common Mistake:</span> Don't confuse this with total remaining EMIs (which includes future interest). Outstanding principal is just the principal portion left.</div><div class='info-box tip'><span class='bold'>💡 Where to find it:</span><ul><li>📄 Loan Statement from your bank</li><li>📄 Schedule of Repayment document</li><li>📞 Call your current lender's customer care</li><li>💻 Check your net banking/app</li></ul></div>",
	validation: {
		condition: [
			{
				case: {
					'<': [
						{
							var: 'principalOutstanding'
						},
						500000
					]
				},
				then: 'Please enter a minimum principal outstanding amount of 5 lakh.'
			},
			{
				case: {
					'>': [
						{
							var: 'principalOutstanding'
						},
						9999999999
					]
				},
				then: 'Enter a valid amount'
			}
		]
	}
};

export const q2_existingInterestRate: RawSchemaQuestion = {
	id: 'q2_existingInterestRate',
	groupId: 'lap_existing_terms',
	bindsTo_template: 'existingInterestRate',
	contextKey: 'existingInterestRate',
	type: 'text',
	textClass: 'mt-8 md:mt-12',
	uiType: 'number',
	fieldType: 'percentage',
	uiGroup: 'text_fields',
	uiMeta: {
		placeholder: 'Enter existing interest rate',
		icon: 'percent'
	},
	required: true,
	minLimit: 1,
	maxLimit: 40,
	question: "What's the current interest rate with existing Lender?",
	showWhen: {
		'!=': [
			{
				var: 'principalOutstanding'
			},
			''
		]
	},
	validation: {
		condition: [
			{
				case: {
					or: [
						{
							'<': [
								{
									var: 'existingInterestRate'
								},
								1
							]
						},
						{
							'>': [
								{
									var: 'existingInterestRate'
								},
								40
							]
						}
					]
				},
				then: 'Interest rate must be between 1% to 40%. Any figure beyond this may be unreasonable to our AI.'
			}
		]
	}
};

export const q3_originalRemainingTenure: RawSchemaQuestion = {
	id: 'q3_originalRemainingTenure',
	groupId: 'lap_existing_terms',
	bindsTo_template: 'originalRemainingTenure',
	contextKey: 'remainingTenure',
	type: 'text',
	textClass: 'mt-8 md:mt-12]',
	uiType: 'number',
	uiGroup: 'text_fields',
	uiMeta: {
		placeholder: 'Enter remaining tenure',
		icon: 'calendar'
	},
	required: true,
	minLimit: 12,
	maxLimit: 180,
	question: "What's the remaining tenure to close the loan at existing Lender?(in Months)",
	showWhen: {
		and: [
			{
				'!=': [
					{
						var: 'principalOutstanding'
					},
					''
				]
			},
			{
				'!=': [
					{
						var: 'existingInterestRate'
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
					or: [
						{
							'<': [
								{
									var: 'originalRemainingTenure'
								},
								12
							]
						},
						{
							'>': [
								{
									var: 'originalRemainingTenure'
								},
								180
							]
						}
					]
				},
				then: 'Remaining tenure must be between 12 months (1 year) to 180 months (15 years) as remaining tenures. Any figure beyond this seems unreasonable.'
			}
		]
	}
};

export const q_loanVintage: RawSchemaQuestion = {
	id: 'q_loanVintage',
	groupId: 'lap_track_record',
	groupTitle: 'Track Record & Lender',
	bindsTo_template: 'loanVintage',
	contextKey: 'loanVintage',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select loan vintage',
		icon: 'calendar'
	},
	required: true,
	question: 'How long have you had this loan with your current lender?',
	description:
		"<div class='info-title'><span class='info-icon blue'>⏱️</span> Loan Vintage</div><div class='info-box highlight'>Most lenders require a minimum of 12 months of repayment history before accepting a balance transfer.</div><div class='info-box note'><span class='bold'>Why this matters:</span> Longer repayment history demonstrates financial discipline and improves your chances of getting better terms from the new lender.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Count from the first EMI payment date, not from the loan sanction date.</div>",
	options: [
		{
			label: 'Less than 6 months',
			value: 'LESS_THAN_6M'
		},
		{
			label: '6-12 months',
			value: '6_TO_12M'
		},
		{
			label: '1-2 years',
			value: '1_TO_2Y'
		},
		{
			label: '2-5 years',
			value: '2_TO_5Y'
		},
		{
			label: 'More than 5 years',
			value: 'MORE_THAN_5Y'
		}
	],
	showWhen: {
		and: [
			{
				'!=': [
					{
						var: 'principalOutstanding'
					},
					''
				]
			},
			{
				'!=': [
					{
						var: 'existingInterestRate'
					},
					''
				]
			},
			{
				'!=': [
					{
						var: 'originalRemainingTenure'
					},
					''
				]
			}
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [
						{
							var: 'loanVintage'
						},
						'LESS_THAN_6M'
					]
				},
				then: 'Most lenders require at least 12 months of repayment history for balance transfer. Very few lenders may accept loans less than 6 months old.'
			},
			{
				case: {
					'==': [
						{
							var: 'loanVintage'
						},
						'6_TO_12M'
					]
				},
				then: 'Some lenders require a minimum 12-month relationship. Limited options may be available for loans with 6-12 months vintage.'
			}
		]
	}
};

export const q_repaymentTrack: RawSchemaQuestion = {
	id: 'q_repaymentTrack',
	groupId: 'lap_track_record',
	bindsTo_template: 'repaymentTrack',
	contextKey: 'repaymentTrack',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	labelClass: 'text-black',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'Have all EMIs been paid on time in the last 12 months? (No bounces or delays)',
	description:
		"<div class='info-title'><span class='info-icon green'>✅</span> Repayment Track Record</div><div class='info-box highlight'>Lenders check your repayment discipline before accepting a balance transfer. A clean track record gets you better rates and higher chances of approval.</div><div class='info-box note'><span class='bold'>What counts as irregular:</span><ul class='info-list'><li>EMI bounce (cheque/NACH return)</li><li>Payment delayed beyond due date</li><li>Partial payment made instead of full EMI</li></ul></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Check your bank statement or loan account statement for EMI payment history over the last 12 months.</div>",
	options: [
		{
			label: 'Yes, all EMIs paid on time',
			value: 'CLEAN',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'CheckCircle2'
		},
		{
			label: '1-2 irregular payments',
			value: 'MINOR_IRREGULAR',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'AlertCircle'
		},
		{
			label: '3 or more irregular payments',
			value: 'MAJOR_IRREGULAR',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'AlertTriangle'
		}
	],
	showWhen: {
		and: [
			{
				'!=': [
					{
						var: 'principalOutstanding'
					},
					''
				]
			},
			{
				'!=': [
					{
						var: 'existingInterestRate'
					},
					''
				]
			},
			{
				'!=': [
					{
						var: 'originalRemainingTenure'
					},
					''
				]
			}
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [
						{
							var: 'repaymentTrack'
						},
						'MINOR_IRREGULAR'
					]
				},
				then: '1-2 irregular payments may limit your options. Some NBFCs are flexible on minor irregularities if recent months show improvement.'
			},
			{
				case: {
					'==': [
						{
							var: 'repaymentTrack'
						},
						'MAJOR_IRREGULAR'
					]
				},
				then: 'Frequent EMI bounces significantly reduce balance transfer options. Very few lenders may consider your application, and terms may be less favorable.'
			}
		]
	}
};

export const q4_bankName: RawSchemaQuestion = {
	id: 'q4_bankName',
	groupId: 'lap_track_record',
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
		and: [
			{
				'!=': [
					{
						var: 'principalOutstanding'
					},
					''
				]
			},
			{
				'!=': [
					{
						var: 'existingInterestRate'
					},
					''
				]
			},
			{
				'!=': [
					{
						var: 'originalRemainingTenure'
					},
					''
				]
			}
		]
	}
};

export const q5_includedCurrentEMIsAmount: RawSchemaQuestion = {
	id: 'q5_includedCurrentEMIsAmount',
	groupId: 'lap_track_record',
	bindsTo_template: 'includedCurrentEMIsAmount',
	contextKey: 'includedCurrentEMIsAmount',
	type: 'currency',
	textClass: 'mt-8 md:mt-12',
	uiGroup: 'text_fields',
	uiMeta: {
		placeholder: 'Enter EMI amount'
	},
	required: true,
	minLimit: 500,
	maxLimit: 10000000,
	question: "What's the current EMI?",
	validation: {
		condition: [
			{
				case: {
					'>': [
						{
							var: 'includedCurrentEMIsAmount'
						},
						999999999999
					]
				},
				then: 'Please enter a valid EMI amount.'
			},
			// Cross-field plausibility: EMI must be at least 90% of (principal / tenure-in-months).
			// The zero-interest floor is principal/tenure; any EMI below that is mathematically
			// impossible (can never fully repay). Allowing a 10% slack covers rounding +
			// partial-EMI quirks (e.g. odd first/last EMI).
			{
				case: {
					and: [
						{ '>': [{ var: 'principalOutstanding' }, 0] },
						{ '>': [{ var: 'originalRemainingTenure' }, 0] },
						{
							'<': [
								{ var: 'includedCurrentEMIsAmount' },
								{
									'*': [
										0.9,
										{
											'/': [{ var: 'principalOutstanding' }, { var: 'originalRemainingTenure' }]
										}
									]
								}
							]
						}
					]
				},
				then: 'EMI looks too low for this principal and remaining tenure — even at 0% interest you would need ₹(principal ÷ months). Please re-check.'
			},
			// Cross-field upper sanity: EMI shouldn't exceed 1.6 × (principal / tenure-in-months).
			// At 40% interest over a typical tenure the loaded EMI rarely exceeds 1.5×; 1.6×
			// catches typo amounts (e.g. ₹5,57,000 instead of ₹55,700) without false alarms
			// on legitimate high-rate / very-short-tenure cases.
			{
				case: {
					and: [
						{ '>': [{ var: 'principalOutstanding' }, 0] },
						{ '>': [{ var: 'originalRemainingTenure' }, 0] },
						{
							'>': [
								{ var: 'includedCurrentEMIsAmount' },
								{
									'*': [
										1.6,
										{
											'/': [{ var: 'principalOutstanding' }, { var: 'originalRemainingTenure' }]
										}
									]
								}
							]
						}
					]
				},
				then: 'EMI looks too high for this principal and remaining tenure — please re-check (possible typo of an extra zero).'
			}
		]
	},
	showWhen: {
		and: [
			{
				'!=': [
					{
						var: 'principalOutstanding'
					},
					''
				]
			},
			{
				'!=': [
					{
						var: 'existingInterestRate'
					},
					''
				]
			},
			{
				'!=': [
					{
						var: 'originalRemainingTenure'
					},
					''
				]
			},
			{
				'!=': [
					{
						var: 'bankName'
					},
					''
				]
			}
		]
	}
};

/** Returns all questions for the Current Loan Details page */
export function getExistingDetailsPageQuestions(): RawSchemaQuestion[] {
	return [
		q1_principalOutstanding,
		q2_existingInterestRate,
		q3_originalRemainingTenure,
		q_loanVintage,
		q_repaymentTrack,
		q4_bankName,
		q5_includedCurrentEMIsAmount
	];
}
