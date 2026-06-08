/**
 * Your Loan Requirements Questions
 * Page: loanRequirementPage
 *
 * Facility-aware: questions adapt based on facilityType (Term/OD/DOD/CC)
 * and loanType (New Loan / Debt Consolidation / DC with Extra Funds).
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';

// ── Reusable JSON-Logic fragments ──────────────────────────────────────────
// IS_CREDIT_LINE: standard 3-facility credit-line gate (OD / DOD / CC).
//
// Intentionally OMITS 'Flexi Drop-line OverDraft (Flexi DOD)' even though the
// facilityType selector in commonPage.json:178-181 offers it as a fourth
// unsecured-loan facility. Reason: Flexi DOD has a 2-year interest-only window
// (per commonPage.json:181 labelDescription) that doesn't match the standard
// amortization assumptions baked into the downstream gates this constant drives
// (loanPurpose adaptive copy, EMI / DC-related question reveals, etc.).
//
// Sunset trigger: when product confirms Flexi DOD should share the standard
// credit-line gating, OR when Flexi DOD gets its own constant / gate path.
// Until then, this omission is load-bearing — adding 'Flexi Drop-line
// OverDraft (Flexi DOD)' to the array would silently change form behavior for
// Flexi DOD applicants.
const IS_CREDIT_LINE = {
	in: [
		{ var: 'facilityType' },
		['Overdraft (OD)', 'Drop-line OverDraft (DOD)', 'Cash Credit (CC)']
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
				then: 'What is the primary purpose of this business loan?'
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
				then: "<div class='info-title'><span class='info-icon green'>🎯</span> Loan Purpose</div><div class='info-box highlight'>Helps match with lenders who specialize in your type of business requirement.</div>"
			}
		]
	},
	options: [
		{
			label: 'Working Capital',
			value: 'working_capital',
			icon: 'Wallet'
		},
		{
			label: 'Business Expansion',
			value: 'expansion',
			icon: 'TrendingUp'
		},
		{
			label: 'Equipment / Machinery',
			value: 'equipment',
			icon: 'Cog'
		},
		{
			label: 'Inventory / Stock',
			value: 'inventory',
			icon: 'Package'
		},

		{
			label: 'New Project / Venture',
			value: 'new_project',
			icon: 'Rocket'
		},
		{
			label: 'Other Business Need',
			value: 'other',
			icon: 'CircleDot'
		}
	],
	// Hide for pure Debt Consolidation — purpose is implicit (debt restructuring)
	// Show for New Loan (all purposes) and DC+Extra (extra funds purpose)
	showWhen: { '!=': [{ var: 'loanType' }, 'Debt Consolidation'] },
	warning: {
		condition: [
			{
				case: {
					and: [
						IS_CREDIT_LINE,
						{ in: [{ var: 'loanPurpose' }, ['equipment', 'inventory', 'new_project']] }
					]
				},
				then: 'Equipment, inventory, and project loans require term financing with fixed EMIs \u2014 not revolving credit (OD/CC). Consider switching to a Term Loan for this purpose.'
			}
		]
	}
};

export const q1_loanTenure: RawSchemaQuestion = {
	id: 'q1_loanTenure',
	bindsTo_template: 'loanTenure',
	contextKey: 'loanTenure',
	type: 'tenure-select',
	tenureUnit: 'years',
	minLimit: 1,
	maxLimit: 7,
	selectClass: 'mt-8 md:mt-12',
	required: true,
	question: {
		switch: [
			{
				// Credit-line facilities (OD/DOD/CC) — no fixed EMI, annual renewal
				case: IS_CREDIT_LINE,
				then: 'What is the desired facility period?'
			},
			{
				// Term loan — traditional EMI-based tenure
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: 'How long would you like your loan term to be?'
			}
		]
	},
	description: {
		switch: [
			{
				case: IS_CREDIT_LINE,
				then: "<div class='info-title'><span class='info-icon green'>📅</span> Facility Period</div><div class='info-box highlight'>Select the desired facility tenure. Credit facilities (OD/CC) are typically renewed annually by the bank.</div><div class='visual-diagram'><div class='diagram-row'><span class='bold'>OD / CC:</span> <span class='diagram-value'>Annual renewal, interest on utilized amount</span></div><div class='diagram-row'><span class='bold'>Drop-line OD:</span> <span class='diagram-value'>Limit reduces over the period</span></div></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Most banks offer OD/CC with 1-year renewable periods. DOD tenures are typically 3-5 years.</div>"
			},
			{
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: "<div class='info-title'><span class='info-icon green'>📅</span> Loan Tenure Selection</div><div class='info-box highlight'>Choose the preferred loan repayment duration (1-7 years).</div><div class='visual-diagram'><div class='diagram-row'><span class='bold'>Shorter Tenure:</span> <span class='diagram-value'>Higher EMI, Less Interest</span></div><div class='diagram-row'><span class='bold'>Longer Tenure:</span> <span class='diagram-value'>Lower EMI, More Interest</span></div></div><div class='stats-row'><div class='stat'><span class='stat-value'>1-3 yrs</span><span class='stat-label'>Short Term</span></div><div class='stat'><span class='stat-value'>4-5 yrs</span><span class='stat-label'>Medium Term</span></div><div class='stat'><span class='stat-value'>6-7 yrs</span><span class='stat-label'>Long Term</span></div></div><div class='info-box tip'><span class='bold'>💡 Tip:</span> This can be adjusted later based on final eligibility and lender offers.</div>"
			}
		]
	},
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
	required: true,
	question: {
		switch: [
			// ── Takeover (DC) paths ──
			{
				// DC + Credit-line → existing facility limit
				case: { and: [IS_DC, IS_CREDIT_LINE] },
				then: 'What is the existing facility limit to be taken over?'
			},
			{
				// DC + Term loan → consolidation amount
				case: IS_DC,
				then: 'Expected consolidation amount (if known)'
			},
			// ── Enhancement (DC+Extra) paths ──
			{
				// DC+Extra + Credit-line → enhancement above current limit
				case: { and: [IS_DC_EXTRA, IS_CREDIT_LINE] },
				then: 'What enhancement amount is needed above the current limit?'
			},
			{
				// DC+Extra + Term loan → extra amount
				case: IS_DC_EXTRA,
				then: 'Please specify the extra loan amount needed'
			},
			// ── New facility paths ──
			{
				// New + Credit-line → credit limit
				case: IS_CREDIT_LINE,
				then: 'What credit limit is required?'
			},
			{
				// New + Term loan (default)
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: 'Enter your desired loan amount'
			}
		]
	},
	description: {
		switch: [
			{
				case: IS_DC_ANY,
				then: "<div class='info-title'><span class='info-icon green'>₹</span> Takeover Amount</div><div class='info-box highlight'>Enter the existing facility amount to be taken over. Use a best-estimate if the exact figure isn't confirmed yet.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Check the latest sanction letter or account statement for the exact outstanding/limit.</div><div class='info-box warning'><span class='bold'>⚠️ Note:</span> Final takeover amount depends on the new lender's assessment and NOC from the existing bank.</div>"
			},
			{
				case: IS_CREDIT_LINE,
				then: "<div class='info-title'><span class='info-icon green'>₹</span> Credit Limit Required</div><div class='info-box highlight'>Enter the credit limit needed (minimum ₹1L).</div><div class='stats-row'><div class='stat'><span class='stat-value'>₹1L+</span><span class='stat-label'>Minimum</span></div><div class='stat'><span class='stat-value'>Based on Turnover</span><span class='stat-label'>Maximum</span></div></div><div class='info-box tip'><span class='bold'>💡 Consider:</span> Working capital cycle, peak inventory, and receivable patterns when deciding the limit.</div>"
			},
			{
				case: { '!=': [{ var: 'loanType' }, ''] },
				then: "<div class='info-title'><span class='info-icon green'>₹</span> Desired Loan Amount</div><div class='info-box highlight'>Enter the loan amount required for business purposes (minimum ₹1L).</div><div class='stats-row'><div class='stat'><span class='stat-value'>₹1L+</span><span class='stat-label'>Minimum</span></div><div class='stat'><span class='stat-value'>Based on ITR</span><span class='stat-label'>Maximum</span></div></div><div class='info-box tip'><span class='bold'>💡 Consider:</span> Monthly cash flow, existing obligations, and business expansion plans when deciding the amount.</div><div class='info-box warning'><span class='bold'>⚠️ Note:</span> Final sanctioned amount depends on business turnover, profitability, and lender assessment.</div>"
			}
		]
	},
	minLimit: 100000,
	maxLimit: 500000000,
	showWhen: {
		'!=': [{ var: 'loanTenure' }, '']
	},
	// FG-2 #27: Warn when loan amount significantly exceeds turnover.
	// Fixed: option values were mismatched (below_10l/10l_to_25l → below_25l).
	warning: {
		condition: [
			{
				case: {
					and: [
						{ '==': [{ var: 'annualTurnoverRange' }, 'below_25l'] },
						{ '>': [{ var: 'loanAmount' }, 5000000] }
					]
				},
				then: 'Loan amount (\u20b950L+) is 2x or more of annual turnover (below \u20b925L) \u2014 will likely fail FOIR check with most lenders. Consider reducing loan amount or showing additional income sources.'
			},
			{
				case: {
					and: [
						{ '==': [{ var: 'annualTurnoverRange' }, '25l_to_50l'] },
						{ '>': [{ var: 'loanAmount' }, 10000000] }
					]
				},
				then: 'Loan amount is high relative to annual turnover (\u20b925\u201350L). Lenders will scrutinize FOIR closely \u2014 ensure strong profit margins and minimal existing obligations.'
			}
		]
	}
};

/**
 * @deprecated Replaced by `q6_banksOfCurrentAccount` on the Business Location page,
 * which captures all banking relationships (CA / OD / CC) in one multi-select.
 * CC/OD facility specifics (limit, EMI, lender) are captured separately in the
 * Obligations section. Hidden via showWhen: never. Kept for backward compat
 * with saved forms.
 */
export const q4_existingBankRelationship: RawSchemaQuestion = {
	id: 'q4_existingBankRelationship',
	bindsTo_template: 'existingBankRelationship',
	contextKey: 'existingBankRelationship',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'handshake'
	},
	required: false,
	question: 'Does the business have an existing banking relationship (CC/OD/term loan)?',
	options: [
		{ label: 'Yes — active CC/OD/loan with a bank', value: 'yes', icon: 'CheckCircle' },
		{ label: 'No — no existing banking facility', value: 'no', icon: 'MinusCircle' }
	],
	// Hidden — superseded by q6_banksOfCurrentAccount on the Location page
	showWhen: { '==': [{ var: '__never__' }, 'true'] }
};

/** @deprecated Replaced by current account capture — per-loan lender already in Obligations.
 * Kept for backward compat with saved forms. Hidden via showWhen: never. */
export const q5_dcExistingBank: RawSchemaQuestion = {
	id: 'q5_dcExistingBank',
	bindsTo_template: 'dcExistingBank',
	contextKey: 'dcExistingBank',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select existing bank',
		icon: 'landmark'
	},
	required: false,
	question: 'Which bank/NBFC is the existing facility with?',
	// Hidden — per-loan lender is already captured in the Obligations section
	showWhen: { '==': [{ var: '__never__' }, 'true'] },
	options: []
};

// ── Current Account Capture (replaces dcExistingBank for DC flows) ────────

/**
 * @deprecated Duplicate of `bp_hasCurrentAccount` (Business Proprietorship income
 * specifics), which is the canonical capture used by the rule engine + lender
 * payload. The string-typed Loan Requirements version was redundant.
 * Hidden via showWhen: never.
 */
export const q5a_hasCurrentAccount: RawSchemaQuestion = {
	id: 'q5a_hasCurrentAccount_business',
	bindsTo_template: 'hasCurrentAccount',
	contextKey: 'hasCurrentAccount',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'Does the applicant have any current / savings accounts used for business?',
	options: [
		{ label: 'Yes', value: 'Yes', icon: 'CheckCircle' },
		{ label: 'No', value: 'No', icon: 'MinusCircle' }
	],
	// Hidden — superseded by income-profile capture + Location-page multi-select
	showWhen: { '==': [{ var: '__never__' }, 'true'] }
};

/**
 * @deprecated Superseded by `q6_banksOfCurrentAccount` on the Business Location
 * page. Hidden via showWhen: never.
 */
export const q5b_currentAccountBanks: RawSchemaQuestion = {
	id: 'q5b_currentAccountBanks_business',
	bindsTo_template: 'currentAccountBanks',
	contextKey: 'banksName',
	type: 'multiple-select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select bank(s)',
		icon: 'landmark'
	},
	required: true,
	question: 'Which banks does the applicant hold current / business accounts with?',
	options: [],
	// Hidden — superseded by q6_banksOfCurrentAccount on the Location page
	showWhen: { '==': [{ var: '__never__' }, 'true'] }
};

/** Returns all questions for the Your Loan Requirements page */
export function getLoanRequirementPageQuestions(): RawSchemaQuestion[] {
	// q4_existingBankRelationship, q5_dcExistingBank, q5a_hasCurrentAccount, q5b_currentAccountBanks
	// are intentionally excluded — superseded by the q6_banksOfCurrentAccount multi-select on the
	// Business Location page and the per-income-source `bp_hasCurrentAccount` capture. The exports
	// are retained (with showWhen: never) for backward compat with saved forms.
	return [q0_loanPurpose, q1_loanTenure, q2_loanAmount];
}
