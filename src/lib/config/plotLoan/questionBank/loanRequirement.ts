/**
 * Your Loan Requirements Questions
 * Page: loanRequirementPage
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';

export const q1_mortgageYear: RawSchemaQuestion = {
	id: 'q1_mortgageYear',
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
	question: 'How long would you like your plot loan term to be?',
	description:
		"<div class='info-title'><span class='info-icon blue'>📅</span> Loan Tenure Selection</div><div class='info-box highlight'>Choose how long you want to repay your plot loan - typically <span class='bold'>5 to 15 years</span>.</div><div class='info-divider'></div><div class='visual-diagram'><div class='diagram-row'><span class='diagram-label'><span class='tag blue'>Shorter Tenure</span></span><span class='diagram-value'>Higher EMI, Less Interest</span></div><div class='diagram-row'><span class='diagram-label'><span class='tag green'>Longer Tenure</span></span><span class='diagram-value'>Lower EMI, More Interest</span></div></div><div class='stats-row'><div class='stat-item'><div class='stat-value'>⬆️</div><div class='stat-label'>Shorter = Save on Interest</div></div><div class='stat-item'><div class='stat-value'>⬇️</div><div class='stat-label'>Longer = Easier EMIs</div></div></div><div class='info-box tip'><span class='bold'>💡 Good News:</span> You can always prepay or change tenure later based on your financial situation!</div>",
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
	]
};

export const q2_propCost: RawSchemaQuestion = {
	id: 'q2_propCost',
	bindsTo_template: 'propCost',
	contextKey: 'propCost',
	type: 'currency',
	textClass: 'mt-8 md:mt-12',
	uiMeta: {
		placeholder: 'Enter property cost'
	},
	required: true,
	minLimit: 500000,
	maxLimit: 9999999999,
	validation: {
		condition: [
			{
				case: {
					'<': [
						{
							var: 'propCost'
						},
						2500000
					]
				},
				then: 'We are providing services for the minimum loan amount of 25 Lakhs Hence the property cost should be more than 25 Lakhs.'
			},
			{
				case: {
					'>': [
						{
							var: 'propCost'
						},
						999999999999999
					]
				},
				then: 'Enter a valid amount'
			}
		]
	},
	question: {
		switch: [
			{
				case: {
					and: [
						{
							in: [
								{
									var: 'loanVariant'
								},
								['Plot Loan Only', 'Plot & Construction Loan']
							]
						},
						{ in: [{ var: 'purchaseType' }, ['direct_from_authority', 'direct_from_developer']] }
					]
				},
				then: "About how much will the property you're buying, cost?"
			},
			{
				case: {
					or: [
						{
							'==': [
								{
									var: 'loanType'
								},
								'Balance Transfer Only'
							]
						},
						{
							'==': [
								{
									var: 'loanVariant'
								},
								'Construction Loan Only'
							]
						}
					]
				},
				then: 'What would you estimate the current value of your property?'
			},
			{
				case: {
					or: [
						{
							and: [
								{
									in: [
										{
											var: 'loanVariant'
										},
										['Plot Loan Only', 'Plot & Construction Loan']
									]
								},
								{ in: [{ var: 'purchaseType' }, ['resale']] }
							]
						},
						{
							'==': [
								{
									var: 'loanVariant'
								},
								'Plot & Equity Loan'
							]
						}
					]
				},
				then: 'What is the assessed market value of the property or the agreed-upon deal value with the seller?'
			}
		]
	},
	description: {
		switch: [
			{
				case: {
					and: [
						{
							in: [
								{
									var: 'loanVariant'
								},
								['Plot Loan Only', 'Plot & Construction Loan']
							]
						},
						{ in: [{ var: 'purchaseType' }, ['direct_from_authority', 'direct_from_developer']] }
					]
				},
				then: "<div class='info-title'><span class='info-icon gold'>💰</span> Property Cost</div><div class='info-box highlight'>Enter the total cost of the plot you're purchasing from the builder/authority.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Accurate numbers help us match you with the best loan offers. Include all charges mentioned in your quotation.</div>"
			},
			{
				case: {
					'==': [
						{
							var: 'loanType'
						},
						'Balance Transfer Only'
					]
				},
				then: "<div class='info-title'><span class='info-icon blue'>🏠</span> Current Property Value</div><div class='info-box highlight'>Enter your best estimate of the current market value of your property.</div><div class='info-box note'><span class='bold'>📌 How lenders evaluate:</span><ul class='info-list'><li>They conduct independent property valuation</li><li>Final loan amount based on their assessment</li><li>May differ from your estimate</li></ul></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Check recent sale prices of similar properties in your area for a realistic estimate.</div>"
			},
			{
				case: {
					and: [
						{
							in: [
								{
									var: 'loanVariant'
								},
								['Plot Loan Only', 'Plot & Construction Loan']
							]
						},
						{ in: [{ var: 'purchaseType' }, ['resale']] }
					]
				},
				then: "<div class='info-title'><span class='info-icon gold'>💰</span> Market Value / Deal Value</div><div class='info-box highlight'>Enter the agreed deal value with the seller or the assessed market value of the property.</div><div class='info-box warning'><span class='bold'>⚠️ Important to know:</span><ul class='info-list'><li>Lenders conduct their own property valuation</li><li>Their assessed value may differ from deal value</li><li>Loan amount will be based on lender's valuation</li></ul></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> If the lender's valuation is lower, you may need to arrange additional down payment.</div>"
			}
		]
	},
	showWhen: {
		or: [
			{
				'!=': [
					{
						var: 'mortgageYear'
					},
					''
				]
			}
		]
	}
};

export const q3_takeExtraLoanAmount: RawSchemaQuestion = {
	id: 'q3_takeExtraLoanAmount',
	bindsTo_template: 'takeExtraLoanAmount',
	contextKey: 'takeExtraLoanAmount',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	labelClass: 'text-black',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'Would you like to take Extra loan amount?',
	options: [
		{
			label: 'Yes',
			value: 'Yes',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ThumbsUp'
		},
		{
			label: 'No',
			value: 'No',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ThumbsDown'
		}
	],
	showWhen: {
		in: [
			{
				var: 'loanType'
			},
			['Balance Transfer Only']
		]
	}
};

export const q3_ConstructionArea: RawSchemaQuestion = {
	id: 'q3_ConstructionArea',
	bindsTo_template: 'ConstructionArea',
	contextKey: 'ConstructionArea',
	type: 'text',
	uiType: 'number',
	textClass: 'mt-8 md:mt-12',
	uiGroup: 'number_fields',
	uiMeta: {
		placeholder: 'Enter construction area',
		showAreaUnitDropdown: true,
		showNumberInWords: true,
		maxLength: 6
	},
	required: true,
	minLimit: 100,
	maxLimit: 1000000,
	question: 'What is the total construction area of the plot?',
	description:
		"<div class='info-title'><span class='info-icon gold'>📐</span> Total Construction Area</div><div class='info-box highlight'>Enter the total built-up area you plan to construct on your plot.</div><div class='info-divider'></div><div class='info-box note'><span class='bold'>📊 For Multi-Story Buildings:</span><br>Multiply constructable area by number of floors</div><div class='visual-diagram'><div class='diagram-row'><span class='diagram-label'>📏 Plot Area</span><span class='diagram-value'>2000 sq.ft (example)</span></div><div class='diagram-row'><span class='diagram-label'>🏗️ Constructable Area</span><span class='diagram-value'>1500 sq.ft</span></div><div class='diagram-row'><span class='diagram-label'>🏢 No. of Floors</span><span class='diagram-value'>1.5 floors</span></div><div class='diagram-row total'><span class='diagram-label'><span class='bold'>Total Construction</span></span><span class='diagram-value positive'>2250 sq.ft</span></div></div><div class='info-box tip'><span class='bold'>💡 Formula:</span> <span class='highlight-text'>Constructable Area x Number of Floors = Total Construction Area</span></div>",
	validation: {
		condition: [
			{
				case: {
					'>': [
						{
							var: 'ConstructionArea'
						},
						1000000
					]
				},
				then: 'Area should not be greater than 10 lakh'
			}
		]
	},
	showWhen: {
		or: [
			{
				and: [
					{
						in: [
							{
								var: 'loanType'
							},
							['New Loan']
						]
					},
					{
						in: [
							{
								var: 'loanVariant'
							},
							['Plot & Construction Loan', 'Construction Loan Only']
						]
					},
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
							null
						]
					}
				]
			},
			{
				and: [
					{
						in: [
							{
								var: 'loanType'
							},
							['Balance Transfer Only']
						]
					},
					{
						in: [
							{
								var: 'takeExtraLoanAmount'
							},
							['Yes']
						]
					},
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
							null
						]
					}
				]
			}
		]
	}
};

export const q4_requiredExtraAmount: RawSchemaQuestion = {
	id: 'q4_requiredExtraAmount',
	bindsTo_template: 'requiredExtraAmount',
	contextKey: 'requiredExtraAmount',
	type: 'currency',
	textClass: 'mt-8 md:mt-12',
	uiMeta: {
		placeholder: 'Enter estimate amount'
	},
	required: true,
	minLimit: 100000,
	maxLimit: 9999999999,
	question: 'Could you please provide the construction cost estimate?',
	description:
		"<div class='info-title'><span class='info-icon blue'>🏗️</span> Construction Cost Estimate</div><div class='info-box highlight'>Provide your best estimate for the total construction cost. This helps us calculate your loan eligibility.</div><div class='info-divider'></div><div class='visual-diagram'><div class='diagram-row'><span class='diagram-label'>📝 Your Estimate</span><span class='diagram-value'>What you provide</span></div><div class='diagram-row'><span class='diagram-label'>🔍 Lender's Assessment</span><span class='diagram-value'>Independent evaluation</span></div><div class='diagram-row total'><span class='diagram-label'><span class='bold'>Maximum Loan</span></span><span class='diagram-value positive'>Up to 80% of lender's estimate</span></div></div><div class='info-box warning'><span class='bold'>⚠️ Important:</span> Lenders conduct their own property and construction cost assessment. The final sanctioned amount may differ from your estimate.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Get quotes from contractors for a realistic construction estimate.</div>",
	showWhen: {
		or: [
			{
				and: [
					{
						in: [
							{
								var: 'loanType'
							},
							['New Loan']
						]
					},
					{
						in: [
							{
								var: 'loanVariant'
							},
							['Plot & Construction Loan', 'Construction Loan Only']
						]
					},
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
							null
						]
					},
					{
						'!=': [
							{
								var: 'ConstructionArea'
							},
							null
						]
					}
				]
			},
			{
				and: [
					{
						in: [
							{
								var: 'loanType'
							},
							['Balance Transfer Only']
						]
					},
					{
						in: [
							{
								var: 'takeExtraLoanAmount'
							},
							['Yes']
						]
					},
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
							null
						]
					},
					{
						'!=': [
							{
								var: 'ConstructionArea'
							},
							null
						]
					}
				]
			}
		]
	},
	validation: {
		condition: [
			{
				case: {
					and: [
						{
							'==': [
								{
									var: 'loanVariant'
								},
								'Construction Loan Only'
							]
						},
						{
							'<': [
								{
									var: 'requiredExtraAmount'
								},
								500000
							]
						}
					]
				},
				then: 'Please enter a minimum construction amount of 5 lakh.'
			}
		]
	}
};

export const q5_deposit: RawSchemaQuestion = {
	id: 'q5_deposit',
	bindsTo_template: 'deposit',
	contextKey: 'deposit',
	type: 'currency',
	textClass: 'mt-8 md:mt-12',
	uiMeta: {
		placeholder: 'Enter amount in rupees'
	},
	required: true,
	minLimit: 0,
	maxLimit: 9999999999,
	question: 'How much amount you have for the downpayment to purchase the plot?',
	validation: {
		condition: [
			{
				case: {
					'>': [
						{
							var: 'deposit'
						},
						{
							'*': [
								0.9,
								{
									var: 'propCost'
								}
							]
						}
					]
				},
				then: 'Your downpayment should not be greater than 90% of your property value.'
			}
		]
	},
	showWhen: {
		or: [
			{
				and: [
					{
						in: [
							{
								var: 'loanType'
							},
							['New Loan']
						]
					},
					{
						in: [
							{
								var: 'loanVariant'
							},
							['Plot Loan Only', 'Plot & Equity Loan']
						]
					},
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
							null
						]
					}
				]
			},
			{
				and: [
					{
						in: [
							{
								var: 'loanType'
							},
							['New Loan']
						]
					},
					{
						in: [
							{
								var: 'loanVariant'
							},
							['Plot & Construction Loan', 'Construction Loan Only']
						]
					},
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
							null
						]
					},
					{
						'!=': [
							{
								var: 'ConstructionArea'
							},
							null
						]
					},
					{
						'!=': [
							{
								var: 'requiredExtraAmount'
							},
							null
						]
					}
				]
			}
		]
	}
};

export const q5_differentATSandPV: RawSchemaQuestion = {
	id: 'q5_differentATSandPV',
	bindsTo_template: 'differentATSandPV',
	contextKey: 'differentATSandPV',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	labelClass: 'text-black',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		placeholder: 'Enter amount in rupees'
	},
	required: true,
	question:
		'If there is any difference between the "Property Value" and the "Agreement to Sell value" for the purpose of "registry"?',
	description:
		"<div class='info-title'><span class='info-icon red'>⚖️</span> Property Value vs ATS Value</div><div class='info-box highlight'>Sometimes the actual deal value differs from what's declared in the Agreement to Sell (ATS) document.</div><div class='info-divider'></div><div class='visual-diagram'><div class='diagram-row'><span class='diagram-label'>💰 Actual Property Value</span><span class='diagram-value'>Real transaction amount</span></div><div class='diagram-row'><span class='diagram-label'>📄 ATS/Sale Deed Value</span><span class='diagram-value'>Registered amount</span></div><div class='diagram-row'><span class='diagram-label'>📊 Stamp Duty Based On</span><span class='diagram-value'>ATS value or Circle Rate (higher)</span></div></div><div class='info-box warning'><span class='bold'>⚠️ Legal Advisory:</span><ul class='info-list'><li>Declaring lower value to save stamp duty is risky</li><li>May lead to legal complications in future</li><li>Can affect loan eligibility and tax benefits</li><li>Penalties if discovered by authorities</li></ul></div><div class='info-box tip'><span class='bold'>💡 Our Advice:</span> We strongly recommend declaring the <span class='highlight-text'>actual transaction value</span> for full legal compliance.</div>",
	options: [
		{
			label: 'Yes',
			value: 'Yes',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ThumbsUp'
		},
		{
			label: 'No',
			value: 'No',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ThumbsDown'
		}
	],
	showWhen: {
		or: [
			{
				and: [
					{
						in: [
							{
								var: 'loanVariant'
							},
							['Plot Loan Only']
						]
					},
					{ in: [{ var: 'purchaseType' }, ['direct_from_authority', 'direct_from_developer']] },
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
							null
						]
					},
					{
						'!=': [
							{
								var: 'deposit'
							},
							null
						]
					}
				]
			},
			{
				and: [
					{
						in: [
							{
								var: 'loanVariant'
							},
							['Plot & Construction Loan']
						]
					},
					{ in: [{ var: 'purchaseType' }, ['direct_from_authority', 'direct_from_developer']] },
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
							null
						]
					},
					{
						'!=': [
							{
								var: 'ConstructionArea'
							},
							null
						]
					},
					{
						'!=': [
							{
								var: 'requiredExtraAmount'
							},
							null
						]
					},
					{
						'!=': [
							{
								var: 'deposit'
							},
							null
						]
					}
				]
			}
		]
	}
};

export const q5_ATSReady: RawSchemaQuestion = {
	id: 'q5_ATSReady',
	bindsTo_template: 'ATSReady',
	contextKey: 'ATSReady',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	labelClass: 'text-black',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		placeholder: 'Enter amount in rupees'
	},
	required: true,
	question: 'Is your Agreement to Sell (ATS) ready?',
	options: [
		{
			label: 'Yes',
			value: 'Yes',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ThumbsUp'
		},
		{
			label: 'No',
			value: 'No',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ThumbsDown'
		}
	],
	showWhen: {
		or: [
			{
				and: [
					{
						in: [
							{
								var: 'loanVariant'
							},
							['Plot Loan Only']
						]
					},
					{
						or: [
							{
								and: [
									{
										in: [
											{ var: 'purchaseType' },
											['direct_from_authority', 'direct_from_developer']
										]
									},
									{
										in: [
											{
												var: 'differentATSandPV'
											},
											['Yes']
										]
									}
								]
							},
							{ in: [{ var: 'purchaseType' }, ['resale']] }
						]
					},
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
							null
						]
					},
					{
						'!=': [
							{
								var: 'deposit'
							},
							null
						]
					}
				]
			},
			{
				and: [
					{
						in: [
							{
								var: 'loanVariant'
							},
							['Plot & Construction Loan']
						]
					},
					{
						or: [
							{
								and: [
									{
										in: [
											{ var: 'purchaseType' },
											['direct_from_authority', 'direct_from_developer']
										]
									},
									{
										in: [
											{
												var: 'differentATSandPV'
											},
											['Yes']
										]
									}
								]
							},
							{ in: [{ var: 'purchaseType' }, ['resale']] }
						]
					},
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
							null
						]
					},
					{
						'!=': [
							{
								var: 'ConstructionArea'
							},
							null
						]
					},
					{
						'!=': [
							{
								var: 'requiredExtraAmount'
							},
							null
						]
					},
					{
						'!=': [
							{
								var: 'deposit'
							},
							null
						]
					}
				]
			},
			{
				and: [
					{
						in: [
							{
								var: 'loanVariant'
							},
							['Plot & Equity Loan']
						]
					},
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
							null
						]
					},
					{
						'!=': [
							{
								var: 'deposit'
							},
							null
						]
					}
				]
			}
		]
	}
};

export const q5_ATSvalue: RawSchemaQuestion = {
	id: 'q5_ATSvalue',
	bindsTo_template: 'ATSvalue',
	contextKey: 'ATSvalue',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	labelClass: 'text-black',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		placeholder: 'Enter amount in rupees'
	},
	required: true,
	question:
		'Would you like to know our suggestion for ATS value (Registry Value) or you will decide by yourself?',
	options: [
		{
			label: 'Suggestion Required',
			value: 'Suggestion Required',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Lightbulb'
		},
		{
			label: 'By Myself',
			value: 'By Myself',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'User'
		}
	],
	showWhen: {
		or: [
			{
				and: [
					{
						in: [
							{
								var: 'loanVariant'
							},
							['Plot Loan Only']
						]
					},
					{
						or: [
							{
								and: [
									{
										in: [
											{ var: 'purchaseType' },
											['direct_from_authority', 'direct_from_developer']
										]
									},
									{
										in: [
											{
												var: 'differentATSandPV'
											},
											['Yes']
										]
									}
								]
							},
							{ in: [{ var: 'purchaseType' }, ['resale']] }
						]
					},
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
							null
						]
					},
					{
						'!=': [
							{
								var: 'deposit'
							},
							null
						]
					},
					{
						'==': [
							{
								var: 'ATSReady'
							},
							'No'
						]
					}
				]
			},
			{
				and: [
					{
						in: [
							{
								var: 'loanVariant'
							},
							['Plot & Construction Loan']
						]
					},
					{
						or: [
							{
								and: [
									{
										in: [
											{ var: 'purchaseType' },
											['direct_from_authority', 'direct_from_developer']
										]
									},
									{
										in: [
											{
												var: 'differentATSandPV'
											},
											['Yes']
										]
									}
								]
							},
							{ in: [{ var: 'purchaseType' }, ['resale']] }
						]
					},
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
							null
						]
					},
					{
						'!=': [
							{
								var: 'ConstructionArea'
							},
							null
						]
					},
					{
						'!=': [
							{
								var: 'requiredExtraAmount'
							},
							null
						]
					},
					{
						'!=': [
							{
								var: 'deposit'
							},
							null
						]
					},
					{
						'==': [
							{
								var: 'ATSReady'
							},
							'No'
						]
					}
				]
			},
			{
				and: [
					{
						in: [
							{
								var: 'loanVariant'
							},
							['Plot & Equity Loan']
						]
					},
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
							null
						]
					},
					{
						'!=': [
							{
								var: 'deposit'
							},
							null
						]
					},
					{
						'==': [
							{
								var: 'ATSReady'
							},
							'No'
						]
					}
				]
			}
		]
	}
};

export const q5_agreementSellValue: RawSchemaQuestion = {
	id: 'q5_agreementSellValue',
	bindsTo_template: 'agreementSellValue',
	contextKey: 'agreementSellValue',
	type: 'currency',
	textClass: 'mt-8 md:mt-12',
	uiMeta: {
		placeholder: 'Enter sell value in rupees',
		readonly: true
	},
	required: true,
	minLimit: 0,
	maxLimit: 9999999999,
	question: {
		switch: [
			{
				case: {
					or: [
						{
							and: [
								{
									'==': [
										{
											var: 'ATSReady'
										},
										'No'
									]
								},
								{
									'==': [
										{
											var: 'ATSvalue'
										},
										'By Myself'
									]
								}
							]
						},
						{
							'==': [
								{
									var: 'ATSReady'
								},
								'Yes'
							]
						}
					]
				},
				then: "Property Value as per 'Agreement to Sell' (i.e. ATS document)?"
			},
			{
				case: {
					and: [
						{
							'==': [
								{
									var: 'ATSReady'
								},
								'No'
							]
						},
						{
							'==': [
								{
									var: 'ATSvalue'
								},
								'Suggestion Required'
							]
						}
					]
				},
				then: "The optimum Property Value for the 'Agreement to Sell' document is shown below."
			}
		]
	},
	description: {
		switch: [
			{
				case: {
					or: [
						{
							and: [
								{
									'==': [
										{
											var: 'ATSReady'
										},
										'No'
									]
								},
								{
									'==': [
										{
											var: 'ATSvalue'
										},
										'By Myself'
									]
								}
							]
						},
						{
							'==': [
								{
									var: 'ATSReady'
								},
								'Yes'
							]
						}
					]
				},
				then: "<div class='info-title'><span class='info-icon gold'>📄</span> ATS Property Value</div><div class='info-box highlight'>This is the property value mentioned in your Agreement to Sell document.</div><div class='visual-diagram'><div class='diagram-row'><span class='diagram-label'>📝 Registry Amount</span><span class='diagram-value'>Based on ATS value</span></div><div class='diagram-row'><span class='diagram-label'>💵 Stamp Duty</span><span class='diagram-value'>Calculated on this value</span></div></div><div class='info-box note'><span class='bold'>📌 Note:</span> Stamp duty is calculated on ATS value or circle rate, whichever is higher.</div>"
			},
			{
				case: {
					and: [
						{
							'==': [
								{
									var: 'ATSReady'
								},
								'No'
							]
						},
						{
							'==': [
								{
									var: 'ATSvalue'
								},
								'Suggestion Required'
							]
						}
					]
				},
				then: "<div class='info-title'><span class='info-icon green'>📐</span> Suggested ATS Value — generalized estimate</div><div class='info-box highlight'>This is a generalized safe-estimate so you can plan the case before a lender is finalized.</div><div class='info-box note'><span class='bold'>Why generalized:</span> Every lender caps the gap between the declared (registry / ATS) value and the actual market value differently — typically between <span class='bold'>1.4× and 2×</span> of the declared value. We suggest on the safer <span class='bold'>1.4×</span> end so the proposal works for most lender policies.</div><div class='info-box tip'><span class='bold'>Next step:</span> Once you finalize the lender, the exact ATS value will be refined as per that lender's specific policy. Final stamp duty also depends on circle-rate comparison.</div>"
			}
		]
	},
	validation: {
		condition: [
			{
				case: {
					'>': [
						{
							var: 'agreementSellValue'
						},
						{
							var: 'propCost'
						}
					]
				},
				then: "Property value as per 'Agreement to Sell' should not be more than the actual property value"
			}
		]
	},
	showWhen: {
		or: [
			{
				and: [
					{
						in: [
							{
								var: 'loanVariant'
							},
							['Plot Loan Only']
						]
					},
					{
						or: [
							{
								and: [
									{
										in: [
											{ var: 'purchaseType' },
											['direct_from_authority', 'direct_from_developer']
										]
									},
									{
										in: [
											{
												var: 'differentATSandPV'
											},
											['Yes']
										]
									}
								]
							},
							{ in: [{ var: 'purchaseType' }, ['resale']] }
						]
					},
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
							null
						]
					},
					{
						'!=': [
							{
								var: 'deposit'
							},
							null
						]
					},
					{
						or: [
							{
								'==': [
									{
										var: 'ATSReady'
									},
									'Yes'
								]
							},
							{
								and: [
									{
										'==': [
											{
												var: 'ATSReady'
											},
											'No'
										]
									},
									{
										'!=': [
											{
												var: 'ATSvalue'
											},
											''
										]
									}
								]
							}
						]
					}
				]
			},
			{
				and: [
					{
						in: [
							{
								var: 'loanVariant'
							},
							['Plot & Construction Loan']
						]
					},
					{
						or: [
							{
								and: [
									{
										in: [
											{ var: 'purchaseType' },
											['direct_from_authority', 'direct_from_developer']
										]
									},
									{
										in: [
											{
												var: 'differentATSandPV'
											},
											['Yes']
										]
									}
								]
							},
							{ in: [{ var: 'purchaseType' }, ['resale']] }
						]
					},
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
							null
						]
					},
					{
						'!=': [
							{
								var: 'ConstructionArea'
							},
							null
						]
					},
					{
						'!=': [
							{
								var: 'requiredExtraAmount'
							},
							null
						]
					},
					{
						'!=': [
							{
								var: 'deposit'
							},
							null
						]
					},
					{
						or: [
							{
								'==': [
									{
										var: 'ATSReady'
									},
									'Yes'
								]
							},
							{
								and: [
									{
										'==': [
											{
												var: 'ATSReady'
											},
											'No'
										]
									},
									{
										'!=': [
											{
												var: 'ATSvalue'
											},
											''
										]
									}
								]
							}
						]
					}
				]
			},
			{
				and: [
					{
						in: [
							{
								var: 'loanVariant'
							},
							['Plot & Equity Loan']
						]
					},
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
							null
						]
					},
					{
						'!=': [
							{
								var: 'deposit'
							},
							null
						]
					},
					{
						or: [
							{
								'==': [
									{
										var: 'ATSReady'
									},
									'Yes'
								]
							},
							{
								and: [
									{
										'==': [
											{
												var: 'ATSReady'
											},
											'No'
										]
									},
									{
										'!=': [
											{
												var: 'ATSvalue'
											},
											''
										]
									}
								]
							}
						]
					}
				]
			}
		]
	}
};

export const q5_depositAsPerATS: RawSchemaQuestion = {
	id: 'q5_depositAsPerATS',
	bindsTo_template: 'depositAsPerATS',
	contextKey: 'depositAsPerATS',
	type: 'currency',
	textClass: 'mt-8 md:mt-12',
	uiMeta: {
		placeholder: 'Enter amount in rupees',
		readonly: true
	},
	required: true,
	minLimit: 0,
	maxLimit: 9999999999,
	question: {
		switch: [
			{
				case: {
					or: [
						{
							and: [
								{
									'==': [
										{
											var: 'ATSReady'
										},
										'No'
									]
								},
								{
									'==': [
										{
											var: 'ATSvalue'
										},
										'By Myself'
									]
								}
							]
						},
						{
							'==': [
								{
									var: 'ATSReady'
								},
								'Yes'
							]
						}
					]
				},
				then: "Down Payment (own contribution amount) as per 'Agreement to Sell' document?"
			},
			{
				case: {
					and: [
						{
							'==': [
								{
									var: 'ATSReady'
								},
								'No'
							]
						},
						{
							'==': [
								{
									var: 'ATSvalue'
								},
								'Suggestion Required'
							]
						}
					]
				},
				then: "The optimum Down Payment for the 'Agreement to Sell' document is shown below."
			}
		]
	},
	description: {
		switch: [
			{
				case: {
					or: [
						{
							and: [
								{
									'==': [
										{
											var: 'ATSReady'
										},
										'No'
									]
								},
								{
									'==': [
										{
											var: 'ATSvalue'
										},
										'By Myself'
									]
								}
							]
						},
						{
							'==': [
								{
									var: 'ATSReady'
								},
								'Yes'
							]
						}
					]
				},
				then: ''
			},
			{
				case: {
					and: [
						{
							'==': [
								{
									var: 'ATSReady'
								},
								'No'
							]
						},
						{
							'==': [
								{
									var: 'ATSvalue'
								},
								'Suggestion Required'
							]
						}
					]
				},
				then: "<div class='info-title'><span class='info-icon green'>📐</span> Suggested Down Payment — generalized estimate</div><div class='info-box highlight'>This is a generalized safe-estimate aligned with the suggested ATS property value above.</div><div class='info-box note'><span class='bold'>Why generalized:</span> The exact down-payment expectation depends on the lender — every lender caps the declared-to-market gap differently (typically <span class='bold'>1.4× to 2×</span>). We suggest at the safer <span class='bold'>1.4×</span> end so the proposal works for most policies.</div><div class='info-box tip'><span class='bold'>Next step:</span> Once you finalize the lender, this down-payment figure will be refined to match that lender's LTV and ATS rules.</div>"
			}
		]
	},
	validation: {
		condition: [
			{
				case: {
					'>': [
						{
							var: 'depositAsPerATS'
						},
						{
							var: 'deposit'
						}
					]
				},
				then: 'This amount can not be more than the available deposit amount. Kindly change the value.'
			}
		]
	},
	showWhen: {
		or: [
			{
				and: [
					{
						in: [
							{
								var: 'loanVariant'
							},
							['Plot Loan Only']
						]
					},
					{
						or: [
							{
								and: [
									{
										in: [
											{ var: 'purchaseType' },
											['direct_from_authority', 'direct_from_developer']
										]
									},
									{
										in: [
											{
												var: 'differentATSandPV'
											},
											['Yes']
										]
									}
								]
							},
							{ in: [{ var: 'purchaseType' }, ['resale']] }
						]
					},
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
							null
						]
					},
					{
						'!=': [
							{
								var: 'deposit'
							},
							null
						]
					},
					{
						or: [
							{
								'==': [
									{
										var: 'ATSReady'
									},
									'Yes'
								]
							},
							{
								and: [
									{
										'==': [
											{
												var: 'ATSReady'
											},
											'No'
										]
									},
									{
										'!=': [
											{
												var: 'ATSvalue'
											},
											''
										]
									}
								]
							}
						]
					}
				]
			},
			{
				and: [
					{
						in: [
							{
								var: 'loanVariant'
							},
							['Plot & Construction Loan']
						]
					},
					{
						or: [
							{
								and: [
									{
										in: [
											{ var: 'purchaseType' },
											['direct_from_authority', 'direct_from_developer']
										]
									},
									{
										in: [
											{
												var: 'differentATSandPV'
											},
											['Yes']
										]
									}
								]
							},
							{ in: [{ var: 'purchaseType' }, ['resale']] }
						]
					},
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
							null
						]
					},
					{
						'!=': [
							{
								var: 'ConstructionArea'
							},
							null
						]
					},
					{
						'!=': [
							{
								var: 'requiredExtraAmount'
							},
							null
						]
					},
					{
						'!=': [
							{
								var: 'deposit'
							},
							null
						]
					},
					{
						or: [
							{
								'==': [
									{
										var: 'ATSReady'
									},
									'Yes'
								]
							},
							{
								and: [
									{
										'==': [
											{
												var: 'ATSReady'
											},
											'No'
										]
									},
									{
										'!=': [
											{
												var: 'ATSvalue'
											},
											''
										]
									}
								]
							}
						]
					}
				]
			},
			{
				and: [
					{
						in: [
							{
								var: 'loanVariant'
							},
							['Plot & Equity Loan']
						]
					},
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
							null
						]
					},
					{
						'!=': [
							{
								var: 'deposit'
							},
							null
						]
					},
					{
						or: [
							{
								'==': [
									{
										var: 'ATSReady'
									},
									'Yes'
								]
							},
							{
								and: [
									{
										'==': [
											{
												var: 'ATSReady'
											},
											'No'
										]
									},
									{
										'!=': [
											{
												var: 'ATSvalue'
											},
											''
										]
									}
								]
							}
						]
					}
				]
			}
		]
	}
};

/** Returns all questions for the Your Loan Requirements page */
export function getLoanRequirementPageQuestions(): RawSchemaQuestion[] {
	return [
		q1_mortgageYear,
		q2_propCost,
		q3_takeExtraLoanAmount,
		q3_ConstructionArea,
		q4_requiredExtraAmount,
		q5_deposit,
		q5_differentATSandPV,
		q5_ATSReady,
		q5_ATSvalue,
		q5_agreementSellValue,
		q5_depositAsPerATS
	];
}
