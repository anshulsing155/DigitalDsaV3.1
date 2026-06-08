import type { RawSchemaQuestion } from '../types.js';

/**
 * Existing Loan Details questions for the `btExistingLoan_homeLoan` page.
 *
 * 10 questions covering sanction amount, loan account, disbursement date,
 * interest rate type, EMI bounce history, principal outstanding, existing
 * interest rate, remaining tenure, current lender, and current EMI.
 * Only shown for BT/Top-up loan types.
 *
 * Source of truth: homeLoanSchemaV2.json btExistingLoan_homeLoan page.
 * Extracted verbatim — every showWhen, validation, UI class, uiMeta,
 * and description preserved exactly.
 */

// ---------------------------------------------------------------------------
// q1 — Sanction Amount
// ---------------------------------------------------------------------------

export const q1_sanctionAmount: RawSchemaQuestion = {
	id: 'q1_sanctionAmount',
	groupId: 'bt_vintage',
	groupTitle: 'Loan Vintage',
	bindsTo_template: 'sanctionAmount',
	contextKey: 'sanctionAmount',
	type: 'currency',
	valueType: 'number',
	textFieldClass: 'mt-[1rem] md:mt-[2rem]',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter the amount'
	},
	required: true,
	minLimit: 1000000,
	maxLimit: 9999999999,
	question: 'What was the original sanction amount when the loan was taken?',
	validation: {
		condition: [
			{
				case: {
					'<': [{ var: 'sanctionAmount' }, 1000000]
				},
				then: 'Amount cannot be less than \u20B910 Lakhs.'
			},
			{
				case: {
					'>': [{ var: 'sanctionAmount' }, 9999999999]
				},
				then: 'Enter a valid amount.'
			}
		]
	},
	showWhen: {
		in: [
			{ var: 'loanType' },
			['Top-up Only', 'Balance Transfer Only', 'Balance Transfer With Top-up']
		]
	}
};

// ---------------------------------------------------------------------------
// q2 — Loan Account Number (optional)
// ---------------------------------------------------------------------------

export const q2_loanAccountNumber: RawSchemaQuestion = {
	id: 'q2_loanAccountNumber',
	bindsTo_template: 'loanAccountNumber',
	contextKey: 'loanAccountNumber',
	type: 'text',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter your loan account number',
		icon: 'hash'
	},
	required: false,
	question: 'Existing home loan account number (optional)',
	description:
		"<div class='info-box highlight'>This is for operational use during case submission. You can add it later if not available now.</div>",
	showWhen: {
		'!=': [{ var: 'sanctionAmount' }, '']
	}
};

// ---------------------------------------------------------------------------
// q3 — Loan Disbursement Date
// ---------------------------------------------------------------------------

export const q3_loanDisbursementDate: RawSchemaQuestion = {
	id: 'q3_loanDisbursementDate',
	groupId: 'bt_vintage',
	bindsTo_template: 'loanDisbursementDate',
	contextKey: 'loanDisbursementDate',
	type: 'text',
	uiType: 'monthYear',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Select month and year',
		icon: 'calendar',
		minYear: 2000
	},
	required: true,
	question: 'When was this loan originally disbursed?',
	description:
		"<div class='info-title'><span class='info-icon blue'>\uD83D\uDCC5</span> Disbursement Date</div><div class='info-box highlight'>Select the month and year of original disbursement. This determines loan vintage.</div><div class='info-box warning'><span class='bold'>\u26A0\uFE0F Important:</span> Most lenders require at least <strong>6 EMI payments</strong> before considering a balance transfer.</div>",
	showWhen: {
		'!=': [{ var: 'sanctionAmount' }, '']
	}
};

// ---------------------------------------------------------------------------
// q3b — Number of EMIs Paid (Session 33: Item 8)
// ---------------------------------------------------------------------------

export const q3b_btEmisPaid: RawSchemaQuestion = {
	id: 'q3b_btEmisPaid',
	groupId: 'bt_vintage',
	bindsTo_template: 'btEmisPaid',
	contextKey: 'btEmisPaid',
	type: 'text',
	uiType: 'number',
	// Tier 3.2: Tighter spacing — visually groups with disbursement date above
	// to form a cohesive "loan vintage" block
	textFieldClass: 'mt-4 md:mt-6',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Number of EMIs paid so far',
		icon: 'hash',
		showNumberInWords: false
	},
	required: true,
	// 0 is legitimate — fresh disbursement may have zero EMIs paid yet.
	// Warning fires for <6, but Next must remain enabled so the user sees lender list.
	minLimit: 0,
	// 480 = 40-year ceiling. Few lenders offer 40-year tenures, and an EMI count
	// only reaches this high if tenure was extended mid-loan (rate hikes, EMI
	// step-down). The real guardrail is the cross-field check against
	// `_maxPossibleEmis` below \u2014 this is just a sanity cap.
	maxLimit: 480,
	question: 'How many EMIs have been paid on this loan so far?',
	description:
		"<div class='info-title'><span class='info-icon blue'>\uD83D\uDCCA</span> Loan Vintage</div><div class='info-box highlight'>EMI count determines <strong>loan vintage</strong> \u2014 the repayment track record lenders evaluate for BT eligibility. This should match the disbursement date entered above.</div><div class='info-box tip'><span class='bold'>\uD83D\uDCA1 Tip:</span> Cross-check with your CIBIL report or the lender's repayment schedule for the exact count.</div>",
	validation: {
		condition: [
			{
				case: {
					or: [{ '<': [{ var: 'btEmisPaid' }, 0] }, { '>': [{ var: 'btEmisPaid' }, 480] }]
				},
				then: 'Enter a valid number of EMIs (0\u2013480).'
			},
			{
				case: {
					and: [
						{ '>': [{ var: '_maxPossibleEmis' }, 0] },
						{ '>': [{ var: 'btEmisPaid' }, { var: '_maxPossibleEmis' }] }
					]
				},
				then: 'EMIs paid cannot exceed the months since disbursement. Please verify the disbursement date or EMI count.'
			}
		]
	},
	warning: {
		condition: [
			{
				case: {
					and: [
						{ '>': [{ var: '_maxPossibleEmis' }, 0] },
						{ '>': [{ var: 'btEmisPaid' }, { var: '_maxPossibleEmis' }] }
					]
				},
				then: 'EMIs paid exceeds the months since disbursement. Please check the disbursement date or EMI count.'
			},
			{
				case: {
					and: [{ '>=': [{ var: 'btEmisPaid' }, 0] }, { '<': [{ var: 'btEmisPaid' }, 6] }]
				},
				then: 'Less than 6 EMIs paid \u2014 most lenders require a minimum of 6 EMI payments before considering a balance transfer. Very few options available.'
			},
			{
				case: {
					and: [{ '>=': [{ var: 'btEmisPaid' }, 6] }, { '<': [{ var: 'btEmisPaid' }, 12] }]
				},
				then: 'Between 6\u201311 EMIs paid. Some lenders may process but most prefer 12+ EMIs for better terms.'
			}
		]
	},
	showWhen: {
		'!=': [{ var: 'loanDisbursementDate' }, '']
	}
};

// ---------------------------------------------------------------------------
// q4 — Interest Rate Type (BT + Top-up flows)
// ---------------------------------------------------------------------------

export const q4_interestRateType: RawSchemaQuestion = {
	id: 'q4_interestRateType',
	groupId: 'bt_vintage',
	bindsTo_template: 'interestRateType',
	contextKey: 'interestRateType',
	type: 'radio',
	// Tier 3.2: Tighter spacing — completes the disbursement→EMIs→rate-type vintage block
	radioClass: 'mt-4 md:mt-6',
	
	optionContainerClass: 'grid md:grid-cols-3 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'What type of interest rate is your current home loan on?',
	description:
		"<div class='info-title'><span class='info-icon gold'>\uD83D\uDCCA</span> Interest Rate Type</div><div class='info-box highlight'>Fixed-rate loans may attract 2\u20134% foreclosure penalty. Floating-rate loans have zero foreclosure charges (RBI rule).</div>",
	options: [
		{
			label: 'Floating Rate',
			value: 'FLOATING',
			uiMeta: { icon: 'Circle' },
			icon: 'TrendingUp'
		},
		{
			label: 'Fixed Rate',
			value: 'FIXED',
			uiMeta: { icon: 'Circle' },
			icon: 'Lock'
		},
		{
			label: 'Not sure',
			value: 'UNKNOWN',
			uiMeta: { icon: 'Circle' },
			icon: 'HelpCircle'
		}
	],
	showWhen: {
		and: [
			{ '!=': [{ var: 'loanDisbursementDate' }, ''] },
			{
				in: [
					{ var: 'loanType' },
					['Balance Transfer Only', 'Balance Transfer With Top-up', 'Top-up Only']
				]
			}
		]
	}
};

// ---------------------------------------------------------------------------
// q5 — EMI Bounce History
// ---------------------------------------------------------------------------

export const q5_emiBounceHistory: RawSchemaQuestion = {
	id: 'q5_emiBounceHistory',
	groupId: 'bt_vintage',
	bindsTo_template: 'emiBounceHistory',
	contextKey: 'emiBounceHistory',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'How many EMI bounces have occurred in the last 12 months on this loan?',
	description:
		"<div class='info-title'><span class='info-icon orange'>\u26A0\uFE0F</span> EMI Repayment Track Record</div><div class='info-box highlight'>A clean track record on the specific loan being transferred significantly improves BT approval chances and may qualify for FOIR waiver.</div>",
	options: [
		{
			label: 'No bounces (clean track)',
			value: '0',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: '1 bounce',
			value: '1',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertCircle'
		},
		{
			label: '2 bounces',
			value: '2',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
		},
		{
			label: '3 or more bounces',
			value: '3+',
			uiMeta: { icon: 'Circle' },
			icon: 'Ban'
		}
	],
	showWhen: {
		'!=': [{ var: 'interestRateType' }, '']
	}
};

// ---------------------------------------------------------------------------
// q6 — Principal Outstanding
// ---------------------------------------------------------------------------

export const q6_principalOutstanding: RawSchemaQuestion = {
	id: 'q6_principalOutstanding',
	groupId: 'bt_current_terms',
	groupTitle: 'Current Terms',
	bindsTo_template: 'principalOutstanding',
	contextKey: 'principalOutstanding',
	type: 'currency',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter current outstanding amount'
	},
	required: true,
	minLimit: 500000,
	maxLimit: 9999999999,
	question: 'What is the outstanding principal as of today?',
	description:
		"<div class='info-title'><span class='info-icon blue'>\uD83D\uDCB0</span> Principal Outstanding</div><div class='info-box highlight'>Enter the <strong>current outstanding principal</strong> from the latest loan statement or lender app. Do not include interest accrued for the current month.</div><div class='info-box tip'><span class='bold'>\uD83D\uDCA1 Where to find this:</span> Check the lender\u2019s mobile app, net banking portal, or call customer care. The latest statement will show the exact principal balance.</div>",
	validation: {
		condition: [
			{
				case: {
					'<': [{ var: 'principalOutstanding' }, 500000]
				},
				then: 'Minimum principal outstanding is \u20B95 Lakhs.'
			},
			{
				case: {
					'>': [{ var: 'principalOutstanding' }, { var: 'sanctionAmount' }]
				},
				then: 'Outstanding amount cannot exceed the sanction amount.'
			}
		]
	},
	showWhen: {
		'!=': [{ var: 'emiBounceHistory' }, '']
	}
};

// ---------------------------------------------------------------------------
// q7 — Existing Interest Rate
// ---------------------------------------------------------------------------

export const q7_existingInterestRate: RawSchemaQuestion = {
	id: 'q7_existingInterestRate',
	groupId: 'bt_current_terms',
	bindsTo_template: 'existingInterestRate',
	contextKey: 'existingInterestRate',
	type: 'text',
	uiType: 'number',
	fieldType: 'percentage',
	textFieldClass: 'mt-4 md:mt-6',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter current interest rate',
		icon: 'percent',
		showNumberInWords: false
	},
	required: true,
	minLimit: 1,
	maxLimit: 40,
	question: 'What is the current interest rate with the existing lender?',

	// Tier 3.3: Dynamic description referencing the rate type selected earlier,
	// so the DSA sees contextual guidance without scrolling back
	description: {
		switch: [
			{
				case: { '==': [{ var: 'interestRateType' }, 'FIXED'] },
				then: "<div class='info-box highlight'>Enter the <strong>fixed interest rate</strong> from the loan agreement. Fixed-rate loans may attract 2\u20134% foreclosure penalty on balance transfer.</div>"
			},
			{
				case: { '==': [{ var: 'interestRateType' }, 'FLOATING'] },
				then: "<div class='info-box highlight'>Enter the <strong>current floating rate</strong>. This changes periodically \u2014 check the latest bank statement or online portal for the effective rate.</div>"
			},
			{
				default:
					"<div class='info-box highlight'>Enter the interest rate from your latest loan statement. If unsure whether fixed or floating, check the original sanction letter.</div>"
			}
		]
	} as unknown as string, // SwitchArray — cast required for type compat

	validation: {
		condition: [
			{
				case: {
					or: [
						{ '<': [{ var: 'existingInterestRate' }, 1] },
						{ '>': [{ var: 'existingInterestRate' }, 40] }
					]
				},
				then: 'Interest rate must be between 1% and 40%.'
			}
		]
	},
	showWhen: {
		'!=': [{ var: 'principalOutstanding' }, '']
	}
};

// ---------------------------------------------------------------------------
// q8 — Remaining Tenure
// ---------------------------------------------------------------------------

export const q8_remainingTenure: RawSchemaQuestion = {
	id: 'q8_remainingTenure',
	groupId: 'bt_current_terms',
	bindsTo_template: 'remainingTenure',
	contextKey: 'remainingTenure',
	type: 'text',
	uiType: 'number',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter remaining tenure in months',
		icon: 'calendar',
		showNumberInWords: false
	},
	required: true,
	minLimit: 12,
	maxLimit: 420,
	question: 'What is the remaining tenure to close the loan? (in months)',
	validation: {
		condition: [
			{
				case: {
					or: [
						{ '<': [{ var: 'remainingTenure' }, 12] },
						{ '>': [{ var: 'remainingTenure' }, 420] }
					]
				},
				then: 'Remaining tenure must be between 12 and 420 months (35 years).'
			}
		]
	},
	// Session 33: Item 7 — warn when old property + long remaining tenure exceeds typical limit
	warning: {
		condition: [
			{
				case: {
					and: [
						{ '==': [{ var: 'propertyAge' }, '30+'] },
						{ '>': [{ var: 'remainingTenure' }, 60] }
					]
				},
				then: 'Property is over 30 years old with 5+ years remaining tenure. Total property age at loan end will exceed 35 years \u2014 most lenders cap at 40 years.'
			},
			{
				case: {
					and: [
						{ '==': [{ var: 'propertyAge' }, '26-30'] },
						{ '>': [{ var: 'remainingTenure' }, 120] }
					]
				},
				then: 'Property is 26\u201330 years old with 10+ years remaining tenure. Property age at loan end may exceed the typical 40-year limit.'
			},
			{
				case: {
					and: [
						{ '>': [{ var: 'btEmisPaid' }, 0] },
						{ '>': [{ '+': [{ var: 'btEmisPaid' }, { var: 'remainingTenure' }] }, 480] }
					]
				},
				then: 'Total loan tenure (EMIs paid + remaining) exceeds 40 years. Please verify \u2014 most lenders cap home loan tenure at 30\u201340 years.'
			}
		]
	},
	showWhen: {
		'!=': [{ var: 'existingInterestRate' }, '']
	}
};

// ---------------------------------------------------------------------------
// q9 — Select Current Lender (Bank)
// NOTE: This ID (q9_selectSingleBank) is hardcoded in optionResolver.ts
//       for dynamic bank option injection. Do NOT rename.
// ---------------------------------------------------------------------------

export const q9_selectSingleBank: RawSchemaQuestion = {
	id: 'q9_selectSingleBank',
	groupId: 'bt_current_terms',
	bindsTo_template: 'selectSingleBank',
	contextKey: 'selectSingleBank',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select your bank',
		icon: 'landmark'
	},
	required: true,
	question: 'Which lender is the current home loan with?',
	showWhen: {
		'!=': [{ var: 'remainingTenure' }, '']
	}
};

// ---------------------------------------------------------------------------
// q10 — Current Monthly EMI
// ---------------------------------------------------------------------------

export const q10_includedCurrentEMIsAmount: RawSchemaQuestion = {
	id: 'q10_includedCurrentEMIsAmount',
	groupId: 'bt_current_terms',
	bindsTo_template: 'includedCurrentEMIsAmount',
	contextKey: 'includedCurrentEMIsAmount',
	type: 'currency',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter current EMI amount'
	},
	required: true,
	minLimit: 1000,
	maxLimit: 10000000,
	limit: 'emiLimit',
	limitCheckerText: 'EMI should be around \u20B9',
	question: 'What is the current monthly EMI of this home loan?',
	validation: {
		condition: [
			{
				case: {
					'>': [{ var: 'includedCurrentEMIsAmount' }, 10000000]
				},
				then: 'Please enter a valid EMI amount.'
			},
			// Cross-field plausibility: EMI ≥ 90% of (principal / tenure-in-months).
			// Anything below the zero-interest floor is mathematically impossible.
			{
				case: {
					and: [
						{ '>': [{ var: 'principalOutstanding' }, 0] },
						{ '>': [{ var: 'remainingTenure' }, 0] },
						{
							'<': [
								{ var: 'includedCurrentEMIsAmount' },
								{
									'*': [
										0.9,
										{ '/': [{ var: 'principalOutstanding' }, { var: 'remainingTenure' }] }
									]
								}
							]
						}
					]
				},
				then: 'EMI looks too low for this principal and remaining tenure — even at 0% interest you would need ₹(principal ÷ months). Please re-check.'
			},
			// Cross-field upper sanity: EMI ≤ 1.6 × (principal / tenure-in-months).
			{
				case: {
					and: [
						{ '>': [{ var: 'principalOutstanding' }, 0] },
						{ '>': [{ var: 'remainingTenure' }, 0] },
						{
							'>': [
								{ var: 'includedCurrentEMIsAmount' },
								{
									'*': [
										1.6,
										{ '/': [{ var: 'principalOutstanding' }, { var: 'remainingTenure' }] }
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
		'!=': [{ var: 'selectSingleBank' }, '']
	}
};

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

/** All existing loan questions in page order */
export function getExistingLoanQuestions(): RawSchemaQuestion[] {
	return [
		q1_sanctionAmount,
		// q2_loanAccountNumber removed — operational detail, not needed at assessment stage
		q3_loanDisbursementDate,
		// FG-2 #8: Re-added — EMI count is critical for BT eligibility (<6 EMIs = most lenders reject).
		// Deriving from disbursement date is unreliable (partial months, moratorium, prepayments).
		q3b_btEmisPaid,
		q4_interestRateType,
		q5_emiBounceHistory,
		q6_principalOutstanding,
		q7_existingInterestRate,
		q8_remainingTenure,
		q9_selectSingleBank,
		q10_includedCurrentEMIsAmount
	];
}
