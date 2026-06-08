import type { RawSchemaQuestion } from '../types.js';

/**
 * Deal & Financials questions for the `dealFinancials_homeLoan` page.
 *
 * 11 questions covering property acquisition, loan term, three-cost model
 * (market value, deal value, registry value), down payment, advance, and
 * registration timeline.
 *
 * Source of truth: homeLoanSchemaV2.json — dealFinancials_homeLoan page
 */

// ---------------------------------------------------------------------------
// q1 — Auction / Property Acquisition Status
// ---------------------------------------------------------------------------

export const q1_auctionPropertyStatus: RawSchemaQuestion = {
	id: 'q1_auctionPropertyStatus',
	bindsTo_template: 'auctionPropertyStatus',
	contextKey: 'auctionPropertyStatus',
	type: 'radio',
	radioClass: 'mt-[1rem] md:mt-[2rem]',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'loan_details',
	groupId: 'deal_loan_setup',
	groupTitle: 'Loan Setup',
	uiMeta: { icon: 'Gavel' },
	required: true,

	question: 'How was this property acquired?',

	options: [
		{
			label: 'Standard purchase',
			value: 'STANDARD',
			uiMeta: { icon: 'Circle' },
			icon: 'ShoppingBag'
		},
		{
			label: 'Auction — terms accepted',
			value: 'AUCTION_AWARE',
			uiMeta: { icon: 'Circle' },
			icon: 'Gavel'
		},
		{
			label: 'Auction — terms unclear',
			value: 'AUCTION_UNAWARE',
			uiMeta: { icon: 'Circle' },
			icon: 'CircleAlert'
		}
	]
};

// ---------------------------------------------------------------------------
// q2 — Preferred Loan Term
// ---------------------------------------------------------------------------

export const q2_mortgageYear: RawSchemaQuestion = {
	id: 'q2_mortgageYear',
	bindsTo_template: 'mortgageYear',
	contextKey: 'mortgageYear',
	type: 'radio',
	groupId: 'deal_loan_setup',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3',
	uiGroup: 'loan_details',
	uiMeta: { icon: 'CalendarRange' },
	required: true,

	question: 'Preferred loan term?',

	description:
		"<div class='info-title'><i data-lucide='calendar' class='inline-block h-4 w-4'></i> Loan Term</div><div class='info-box highlight'>Select a quick-pick or choose 'Other' to enter a custom term (5\u201340 years).</div><div class='info-box tip'><span class='bold'>\ud83d\udca1 \"Max possible\":</span> Rule engine calculates per-lender maximum based on youngest applicant's age and lender policy.</div>",

	options: [
		{ label: '10 yrs', value: '10', icon: 'Calendar' },
		{ label: '15 yrs', value: '15', icon: 'Calendar' },
		{ label: '20 yrs', value: '20', icon: 'Calendar' },
		{ label: '25 yrs', value: '25', icon: 'Calendar' },
		{ label: '30 yrs', value: '30', icon: 'Calendar' },
		{ label: 'Max possible', value: 'MAX', icon: 'CalendarRange' },
		{ label: 'Other', value: 'OTHER', icon: 'PenLine' }
	],

	showWhen: {
		'!=': [{ var: 'auctionPropertyStatus' }, '']
	},

	// FG-2 #7: Warn when property age + requested tenure risks exceeding the
	// typical 40-year total property age limit imposed by most lenders.
	warning: {
		condition: [
			{
				case: {
					and: [
						{ '==': [{ var: 'propertyAge' }, '30+'] },
						{ in: [{ var: 'mortgageYear' }, ['20', '25', '30', 'MAX']] }
					]
				},
				then: 'Property is over 30 years old — total property age at loan maturity will likely exceed the 40-year limit imposed by most lenders. Shorter tenure recommended.'
			},
			{
				case: {
					and: [
						{ '==': [{ var: 'propertyAge' }, '26-30'] },
						{ in: [{ var: 'mortgageYear' }, ['25', '30', 'MAX']] }
					]
				},
				then: 'Property is 26–30 years old. A 25+ year tenure may push total property age beyond the typical 40-year limit at loan maturity.'
			}
		]
	}
};

// ---------------------------------------------------------------------------
// q2a — Custom Loan Term
// ---------------------------------------------------------------------------

export const q2a_mortgageYearCustom: RawSchemaQuestion = {
	id: 'q2a_mortgageYearCustom',
	groupId: 'deal_loan_setup',
	bindsTo_template: 'mortgageYearCustom',
	contextKey: 'mortgageYearCustom',
	type: 'text',
	uiType: 'number',
	textFieldClass: 'mt-4 md:mt-6',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter years (5-40)',
		icon: 'calendar',
		showNumberInWords: false
	},
	required: true,
	minLimit: 5,
	maxLimit: 40,

	question: 'Enter custom loan term (in years)',

	validation: {
		condition: [
			{
				case: {
					or: [
						{ '<': [{ var: 'mortgageYearCustom' }, 5] },
						{ '>': [{ var: 'mortgageYearCustom' }, 40] }
					]
				},
				then: 'Loan term must be between 5 and 40 years.'
			}
		]
	},

	showWhen: {
		'==': [{ var: 'mortgageYear' }, 'OTHER']
	}
};

// ---------------------------------------------------------------------------
// q3 — Market Value
// ---------------------------------------------------------------------------

export const q3_marketValue: RawSchemaQuestion = {
	id: 'q3_marketValue',
	groupId: 'deal_property_values',
	groupTitle: 'Property Valuation & Payment',
	bindsTo_template: 'marketValue',
	contextKey: 'marketValue',
	type: 'currency',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter market value'
	},
	required: true,
	minLimit: 500000,
	maxLimit: 9999999999,

	question: 'Estimated current market value of the property?',

	// Tier 3.1: Group header introduces the 4-value property financials block
	// (market value, deal value, registry value, down payment) as a cohesive unit
	descriptionHeader:
		'Enter all four property values below. The system uses these to calculate LTV (Loan-to-Value) and LCR (Loan-to-Cost Ratio) — the key metrics lenders use for sanction amount.',

	description:
		"<div class='info-title !items-start'><i data-lucide='chartLine' class='inline-block h-4 w-4'></i> Market Value</div><div class='info-box highlight'>Check average price for similar properties in same project/area on 99acres, MagicBricks, Housing.com \u2014 3rd party evaluators use the same approach.</div><div class='info-box note'><span class='bold'>Purpose:</span> LTTV calculation \u2014 what banks use to determine sanctionable amount.</div>",

	validation: {
		condition: [
			{
				case: { '<': [{ var: 'marketValue' }, 2500000] },
				then: 'Minimum property value for our services is \u20b925 Lakhs.'
			}
		]
	},

	showWhen: {
		and: [
			{ '!=': [{ var: 'mortgageYear' }, ''] },
			{
				or: [
					{ '!=': [{ var: 'mortgageYear' }, 'OTHER'] },
					{ '!=': [{ var: 'mortgageYearCustom' }, ''] }
				]
			}
		]
	}
};

// ---------------------------------------------------------------------------
// q4 — Deal Value (dynamic question text)
// ---------------------------------------------------------------------------

export const q4_propCost: RawSchemaQuestion = {
	id: 'q4_propCost',
	groupId: 'deal_property_values',
	bindsTo_template: 'propCost',
	contextKey: 'propCost',
	type: 'currency',
	// Tier 3.1: Tighter spacing — groups with market value above as part of
	// the property financials visual block
	textFieldClass: 'mt-4 md:mt-6',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter deal value'
	},
	required: true,
	minLimit: 500000,
	maxLimit: 9999999999,

	question: {
		switch: [
			{
				case: {
					in: [{ var: 'purchaseType' }, ['resale_normal', 'resale_endorsement']]
				},
				then: 'Agreed deal value with seller?'
			},
			{
				default: 'Agreed total cost with builder?'
			}
		]
	} as unknown as string, // SwitchArray with default — cast required for type compat

	description:
		"<div class='info-box highlight'>Total amount agreed between parties, including any cash component.</div>",

	validation: {
		condition: [
			{
				case: { '<': [{ var: 'propCost' }, 2500000] },
				then: 'Minimum deal value for our services is \u20b925 Lakhs.'
			}
		]
	},

	showWhen: {
		'!=': [{ var: 'marketValue' }, '']
	}
};

// ---------------------------------------------------------------------------
// q5 — Registry Value
// ---------------------------------------------------------------------------

export const q5_registryValue: RawSchemaQuestion = {
	id: 'q5_registryValue',
	groupId: 'deal_property_values',
	bindsTo_template: 'registryValue',
	contextKey: 'registryValue',
	type: 'currency',
	// Tier 3.1: Tighter spacing — part of the property financials visual block
	textFieldClass: 'mt-4 md:mt-6',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter registration value'
	},
	required: true,
	minLimit: 100000,
	maxLimit: 9999999999,

	question: 'Expected registration value?',

	description:
		"<div class='info-title !items-start'><i data-lucide='fileText' class='inline-block h-4 w-4'></i> Registry Value</div><div class='info-box highlight'>Value at which property will be registered. Generally at or above Ready Reckoner / Circle Rate.</div><div class='info-box note'><span class='bold'>Purpose:</span> LCR calculation \u2014 lenders structure loan tranches using this value.</div>",

	validation: {
		condition: [
			{
				case: { '>': [{ var: 'registryValue' }, { var: 'propCost' }] },
				then: 'Registry value is typically \u2264 deal value. Please verify.'
			}
		]
	},

	showWhen: {
		'!=': [{ var: 'propCost' }, '']
	}
};

// ---------------------------------------------------------------------------
// q6 — Down Payment
// ---------------------------------------------------------------------------

export const q6_deposit: RawSchemaQuestion = {
	id: 'q6_deposit',
	groupId: 'deal_property_values',
	bindsTo_template: 'deposit',
	contextKey: 'deposit',
	type: 'currency',
	// Tier 3.1: Tighter spacing — completes the property financials visual block
	textFieldClass: 'mt-4 md:mt-6',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter down payment amount'
	},
	required: true,
	minLimit: 0,
	maxLimit: 9999999999,

	question: 'Available down payment amount?',

	validation: {
		condition: [
			{
				case: { '>': [{ var: 'deposit' }, { '*': [0.9, { var: 'propCost' }] }] },
				then: 'Down payment should not exceed 90% of the deal value.'
			}
		]
	},

	showWhen: {
		'!=': [{ var: 'registryValue' }, '']
	}
};

// ---------------------------------------------------------------------------
// q6a — Advance in Agreement
// ---------------------------------------------------------------------------

export const q6a_advanceInAgreement: RawSchemaQuestion = {
	id: 'q6a_advanceInAgreement',
	groupId: 'deal_timeline',
	groupTitle: 'Advance & Registration',
	bindsTo_template: 'advanceInAgreement',
	contextKey: 'advanceInAgreement',
	type: 'currency',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter advance amount (if any)'
	},
	required: false,
	minLimit: 0,
	maxLimit: 9999999999,

	question: 'Advance already paid to seller as per agreement?',

	description:
		"<div class='info-title !items-start'><i data-lucide='piggyBank' class='inline-block h-4 w-4'></i> Advance in Agreement</div><div class='info-box highlight'>Amount already paid to seller as token/advance/bayana during agreement signing. This is deducted from the registry-time disbursement.</div><div class='info-box note'><span class='bold'>Leave blank or enter 0</span> if no advance was paid.</div>",

	validation: {
		condition: [
			{
				case: { '>': [{ var: 'advanceInAgreement' }, { var: 'deposit' }] },
				then: 'Advance amount cannot exceed the down payment.'
			}
		]
	},

	showWhen: {
		and: [{ '!=': [{ var: 'deposit' }, ''] }, { '>': [{ var: 'deposit' }, 0] }]
	}
};

// ---------------------------------------------------------------------------
// q7 — Registry Timeline
// ---------------------------------------------------------------------------

export const q7_registryTimeline: RawSchemaQuestion = {
	id: 'q7_registryTimeline',
	groupId: 'deal_timeline',
	bindsTo_template: 'registryTimeline',
	contextKey: 'registryTimeline',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	uiMeta: { icon: 'CalendarDays' },
	required: true,

	question: 'When is property registration planned?',

	options: [
		{
			label: 'Within 1 month',
			value: 'WITHIN_1_MONTH',
			uiMeta: { icon: 'Circle' },
			icon: 'Clock'
		},
		{
			label: '1\u20133 months',
			value: '1_3_MONTHS',
			uiMeta: { icon: 'Circle' },
			icon: 'CalendarRange'
		},
		{
			label: '3\u20136 months',
			value: '3_6_MONTHS',
			uiMeta: { icon: 'Circle' },
			icon: 'CalendarClock'
		},
		{
			label: 'Specific date',
			value: 'SPECIFIC_DATE',
			uiMeta: { icon: 'Circle' },
			icon: 'CalendarHeart'
		}
	],

	showWhen: {
		'!=': [{ var: 'deposit' }, '']
	}
};

// ---------------------------------------------------------------------------
// q7a — Planned Registration Month
// ---------------------------------------------------------------------------

export const q7a_registryPlannedDate: RawSchemaQuestion = {
	id: 'q7a_registryPlannedDate',
	groupId: 'deal_timeline',
	bindsTo_template: 'registryPlannedDate',
	contextKey: 'registryPlannedDate',
	type: 'text',
	// uiType: 'monthYear' routes through DatePickerYearAndMonth in the page renderer
	// (matches q3_loanDisbursementDate pattern in existingLoan.ts). A plain text input
	// here forced users to hand-type "YYYY-MM" with no picker — unusable on mobile.
	uiType: 'monthYear',
	textFieldClass: 'mt-4 md:mt-6',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Select planned registration month',
		icon: 'calendar',
		// Forward-planning question: allow current year through current+2.
		// introduceMonthIndia: 0 lets users pick any month in minYear — the
		// MonthYearModal default of 6 would silently disable Jan–May.
		minYear: new Date().getFullYear(),
		maxYear: new Date().getFullYear() + 2,
		introduceMonthIndia: 0,
		// PITFALL: without futureOnly, the picker accepts past months in the
		// current year (the existing maxYear-based guard only fires when
		// currentYear === maxYear, and maxYear here is currentYear+2). DSAs
		// could pick "Jan-2026" on a 2026-05-28 session — a date already 4
		// months in the past. futureOnly=true disables every month strictly
		// earlier than today within the picker. See CLAUDE.md §3 Pitfall
		// (Planned registration month accepts past months, 2026-05-28).
		futureOnly: true
	},
	required: true,

	question: 'Planned registration month',

	showWhen: {
		'==': [{ var: 'registryTimeline' }, 'SPECIFIC_DATE']
	}
};

// ---------------------------------------------------------------------------
// q7b — Reason for Specific Date
// ---------------------------------------------------------------------------

export const q7b_registryDateReason: RawSchemaQuestion = {
	id: 'q7b_registryDateReason',
	bindsTo_template: 'registryDateReason',
	contextKey: 'registryDateReason',
	type: 'select',
	selectClass: 'mt-4 md:mt-6',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select reason for specific date',
		icon: 'info'
	},
	required: true,

	question: 'Why a specific date?',

	options: [
		{ label: 'Auspicious day', value: 'AUSPICIOUS' },
		{ label: 'Anniversary', value: 'ANNIVERSARY' },
		{ label: 'Birthday', value: 'BIRTHDAY' },
		{ label: 'Tax planning', value: 'TAX_PLANNING' },
		{ label: 'Festive season', value: 'FESTIVE' },
		{ label: 'Other', value: 'OTHER' }
	],

	showWhen: {
		'==': [{ var: 'registryTimeline' }, 'SPECIFIC_DATE']
	}
};

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

/** All deal & financials questions in page order */
export function getDealFinancialsQuestions(): RawSchemaQuestion[] {
	return [
		q1_auctionPropertyStatus,
		q2_mortgageYear,
		q2a_mortgageYearCustom,
		q3_marketValue,
		q4_propCost,
		q5_registryValue,
		q6_deposit,
		q6a_advanceInAgreement,
		q7_registryTimeline,
		q7a_registryPlannedDate
		// q7b_registryDateReason — REMOVED (Form Optimization Tier 2.1)
		// Zero rule engine consumers, zero lender impact.
	];
}
