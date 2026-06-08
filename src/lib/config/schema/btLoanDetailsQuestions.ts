/**
 * Current Loan Details — shared across all 3 secured loans (Home, LAP, Plot)
 * for the Balance Transfer / Top-up flows. Mirrors the caseIntakeQuestions
 * pattern: one source of truth for the questions + a page builder.
 *
 * Canonical-keys convention (ADR-0015): every field name here matches the
 * corresponding key in `obligations` data wherever the concept overlaps —
 * `bankName`, `emi`, `principalOutstanding`, `interestRate` are the same
 * keys an unsecured DC flow uses to mark an obligation as `selectedToClose`.
 * This eliminates the historical drift where the payload builder had to
 * special-case three product-specific field names for the same fact (e.g.
 * `includedCurrentEMIsAmount` vs `btCurrentEmi`).
 *
 * Field selection rationale (per session sign-off 2026-05-25):
 *   - Loan account number INTENTIONALLY OMITTED — not needed at assessment
 *     stage; collected later if the loan moves to processing.
 *   - Disbursed amount (NOT sanctioned amount) — for under-construction
 *     property the bank sanctions a higher amount than is actually drawn in
 *     tranches; lender BT eligibility cares about what's actually outstanding,
 *     not the original on-paper sanction.
 *   - EMIs paid AND disbursement date are BOTH captured (Home Loan's existing
 *     convention) — derivation from date alone is unreliable due to
 *     moratorium periods, pre-EMI interest phases, and prepayments.
 *
 * Cross-field plausibility validators on the EMI question catch combinations
 * that pass per-field bounds but are mathematically impossible (Pitfall #50).
 */

import type { RawSchemaQuestion, RawSchemaPage, RulesLogic } from './schemaTypes.js';

// ── Show-when fragments shared across questions ────────────────────────────
// All fields show progressively — each depends on the previous being answered.

const HAS_BANK = { '!=': [{ var: 'bankName' }, ''] };
const HAS_DISBURSED = { '!=': [{ var: 'disbursedAmount' }, ''] };
const HAS_DISBURSEMENT_DATE = { '!=': [{ var: 'loanDisbursementDate' }, ''] };
const HAS_ORIGINAL_TENURE = { '!=': [{ var: 'originalTenure' }, ''] };
const HAS_PRINCIPAL = { '!=': [{ var: 'principalOutstanding' }, ''] };
const HAS_INTEREST = { '!=': [{ var: 'existingInterestRate' }, ''] };
const HAS_RATE_TYPE = { '!=': [{ var: 'interestRateType' }, ''] };
const HAS_REMAINING_TENURE = { '!=': [{ var: 'remainingTenure' }, ''] };
const HAS_EMI = { '!=': [{ var: 'includedCurrentEMIsAmount' }, ''] };

// ── 1. Bank Name ───────────────────────────────────────────────────────────

export const qBankName: RawSchemaQuestion = {
	id: 'q1_bankName',
	groupId: 'bt_lender_identity',
	groupTitle: 'Current Lender',
	bindsTo_template: 'bankName',
	contextKey: 'banksName',
	type: 'select',
	selectClass: 'mt-[1rem] md:mt-[2rem]',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select the current lender',
		icon: 'landmark'
	},
	required: true,
	question: 'Which lender holds the current loan?',
	description:
		"<div class='info-title'><span class='info-icon blue'>🏦</span> Current Lender</div><div class='info-box highlight'>This is the bank or NBFC currently holding the loan that will be transferred (and/or topped up).</div><div class='info-box tip'><span class='bold'>💡 Why this matters:</span> The new lender will need a No Objection Certificate (NOC) and payoff letter from this lender. Some lenders have stricter rules for taking over loans from specific lenders.</div>"
};

// ── 2. Disbursed Amount ────────────────────────────────────────────────────

export const qDisbursedAmount: RawSchemaQuestion = {
	id: 'q2_disbursedAmount',
	groupId: 'bt_original_terms',
	groupTitle: 'Original Loan Terms',
	bindsTo_template: 'disbursedAmount',
	contextKey: 'disbursedAmount',
	type: 'currency',
	textClass: 'mt-8 md:mt-12',
	uiGroup: 'text_fields',
	uiMeta: {
		placeholder: 'Enter the amount disbursed'
	},
	required: true,
	minLimit: 100000,
	maxLimit: 9999999999,
	question: 'What was the original disbursed loan amount?',
	description:
		"<div class='info-title'><span class='info-icon green'>💵</span> Original Disbursed Amount</div><div class='info-box highlight'>The actual amount the customer received from the lender — not the sanctioned amount on paper. For under-construction property, banks disburse in tranches, so this is typically lower than the sanctioned figure.</div><div class='info-box tip'><span class='bold'>💡 Where to find it:</span> Loan account statement, or the disbursement memo from the lender. Sum all tranches if disbursed in parts.</div><div class='info-box warning'><span class='bold'>⚠️ Common Mistake:</span> Don't confuse this with the sanctioned amount (the bank's approved cap). For top-up eligibility, the lender looks at how much principal has been paid down — which depends on the disbursed amount, not the sanctioned amount.</div>",
	showWhen: HAS_BANK
};

// ── 3. Disbursement Date ───────────────────────────────────────────────────

export const qDisbursementDate: RawSchemaQuestion = {
	id: 'q3_loanDisbursementDate',
	groupId: 'bt_original_terms',
	bindsTo_template: 'loanDisbursementDate',
	contextKey: 'loanDisbursementDate',
	type: 'text',
	uiType: 'monthYear',
	textClass: 'mt-8 md:mt-12',
	uiGroup: 'text_fields',
	uiMeta: {
		placeholder: 'MM/YYYY',
		icon: 'calendar'
	},
	required: true,
	question: 'When was the loan disbursed?',
	description:
		"<div class='info-title'><span class='info-icon blue'>📅</span> Disbursement Date</div><div class='info-box highlight'>The month and year when the customer first received money from this lender. For staggered disbursements, use the FIRST tranche date.</div><div class='info-box tip'><span class='bold'>💡 Why this matters:</span> Lenders use loan age to assess balance-transfer eligibility. Most lenders require at least 6–12 months of clean repayment history before they'll consider a transfer.</div>",
	showWhen: HAS_DISBURSED
};

// ── 4. Original Tenure ─────────────────────────────────────────────────────

export const qOriginalTenure: RawSchemaQuestion = {
	id: 'q4_originalTenure',
	groupId: 'bt_original_terms',
	bindsTo_template: 'originalTenure',
	contextKey: 'originalTenure',
	type: 'text',
	uiType: 'number',
	textClass: 'mt-8 md:mt-12',
	uiGroup: 'text_fields',
	uiMeta: {
		placeholder: 'Original tenure in months (e.g. 240 = 20 years)',
		icon: 'calendar'
	},
	required: true,
	minLimit: 12,
	maxLimit: 360,
	question: 'What was the ORIGINAL loan tenure (in months)?',
	description:
		"<div class='info-title'><span class='info-icon green'>📅</span> Original Loan Tenure</div><div class='info-box highlight'>The full duration of the loan when it was first sanctioned — NOT the remaining tenure (we'll ask that separately). Enter in months (e.g. 180 for 15 years, 240 for 20 years).</div><div class='info-box tip'><span class='bold'>💡 Helpful for cross-checks:</span> Disbursement date + original tenure tells us when the loan should close. We use this to validate the remaining tenure you enter below.</div>",
	showWhen: HAS_DISBURSEMENT_DATE,
	validation: {
		condition: [
			{
				case: {
					or: [
						{ '<': [{ var: 'originalTenure' }, 12] },
						{ '>': [{ var: 'originalTenure' }, 360] }
					]
				},
				then: 'Original tenure should be between 12 and 360 months (1 to 30 years). Anything outside this range is unusual for a secured loan.'
			}
		]
	}
};

// ── 5. Principal Outstanding ───────────────────────────────────────────────

export const qPrincipalOutstanding: RawSchemaQuestion = {
	id: 'q5_principalOutstanding',
	groupId: 'bt_current_terms',
	groupTitle: 'Current Status',
	bindsTo_template: 'principalOutstanding',
	contextKey: 'principalOutstanding',
	type: 'currency',
	textClass: 'mt-8 md:mt-12',
	uiGroup: 'text_fields',
	uiMeta: {
		placeholder: 'Enter outstanding principal (today)'
	},
	required: true,
	minLimit: 10000,
	maxLimit: 9999999999,
	question: 'What is the outstanding principal of the current loan as on today?',
	description:
		"<div class='info-title'><span class='info-icon blue'>💰</span> Outstanding Principal Amount</div><div class='info-box highlight'>The remaining principal you still owe to the current lender — excluding future interest. NOT the sum of remaining EMIs.</div><div class='visual-diagram'><div class='diagram-row'><span class='diagram-value'>Original Disbursed</span> ₹50,00,000</div><div class='diagram-row'><span class='diagram-value'>Principal Paid</span> - ₹15,00,000</div><div class='info-divider'></div><div class='diagram-row'><span class='diagram-value bold'>Outstanding Principal</span> = ₹35,00,000</div></div><div class='info-box warning'><span class='bold'>⚠️ Common Mistake:</span> Don't confuse this with total remaining EMIs (includes future interest). Outstanding principal is just the principal portion left.</div><div class='info-box tip'><span class='bold'>💡 Where to find it:</span> Most recent loan statement, app/net banking dashboard, or call customer care.</div>",
	showWhen: HAS_ORIGINAL_TENURE,
	validation: {
		condition: [
			{
				case: {
					'<': [{ var: 'principalOutstanding' }, 500000]
				},
				then: 'Please enter a minimum principal outstanding amount of ₹5 lakh.'
			},
			{
				case: {
					and: [
						{ '>': [{ var: 'disbursedAmount' }, 0] },
						{ '>': [{ var: 'principalOutstanding' }, { var: 'disbursedAmount' }] }
					]
				},
				then: 'Outstanding principal cannot exceed the original disbursed amount. Please re-check.'
			}
		]
	}
};

// ── 6. Existing Interest Rate ──────────────────────────────────────────────
// Key kept as `existingInterestRate` (not bare `interestRate`) for semantic
// clarity — on a BT page there are MULTIPLE rates in play (the existing
// lender's rate AND the prospective new lender's offered rate). The
// `existing` prefix removes ambiguity at every read site.

export const qExistingInterestRate: RawSchemaQuestion = {
	id: 'q6_existingInterestRate',
	groupId: 'bt_current_terms',
	bindsTo_template: 'existingInterestRate',
	contextKey: 'existingInterestRate',
	type: 'text',
	textClass: 'mt-8 md:mt-12',
	uiType: 'number',
	fieldType: 'percentage',
	uiGroup: 'text_fields',
	uiMeta: {
		placeholder: 'Current interest rate (%)',
		icon: 'percent'
	},
	required: true,
	minLimit: 1,
	maxLimit: 40,
	question: 'What is the current interest rate with the existing lender?',
	description:
		"<div class='info-title'><span class='info-icon gold'>%</span> Current Interest Rate</div><div class='info-box highlight'>The annualised interest rate currently charged on this loan. If the loan is floating-rate, use the rate reflected in the most recent EMI calculation.</div><div class='info-box tip'><span class='bold'>💡 Where to find it:</span> Recent loan statement, EMI schedule, or the lender's app/portal. For reset-based floating loans, this changes every quarter or year.</div>",
	showWhen: HAS_PRINCIPAL,
	validation: {
		condition: [
			{
				case: {
					or: [
						{ '<': [{ var: 'existingInterestRate' }, 1] },
						{ '>': [{ var: 'existingInterestRate' }, 40] }
					]
				},
				then: 'Interest rate must be between 1% and 40%. Anything outside this range is unusual.'
			}
		]
	}
};

// ── 7. Interest Rate Type ──────────────────────────────────────────────────

export const qInterestRateType: RawSchemaQuestion = {
	id: 'q7_interestRateType',
	groupId: 'bt_current_terms',
	bindsTo_template: 'interestRateType',
	contextKey: 'interestRateType',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'Is the rate fixed or floating?',
	description:
		"<div class='info-title'><span class='info-icon blue'>📊</span> Rate Type</div><div class='info-box highlight'>Fixed rate stays constant for the full tenure; floating rate moves with the lender's benchmark (typically Repo + spread).</div><div class='info-box tip'><span class='bold'>💡 Why this matters:</span> Fixed-rate loans usually have higher foreclosure penalties (2–4% of principal); floating-rate loans typically have nil foreclosure charges for individual borrowers.</div>",
	options: [
		{
			label: 'Floating',
			value: 'floating',
			labelDescription: 'Rate changes with lender benchmark — typical for most home/LAP/plot loans'
		},
		{
			label: 'Fixed',
			value: 'fixed',
			labelDescription: 'Rate locked for full tenure — less common; higher foreclosure penalties'
		}
	],
	showWhen: HAS_INTEREST
};

// ── 8. Remaining Tenure ────────────────────────────────────────────────────

export const qRemainingTenure: RawSchemaQuestion = {
	id: 'q8_remainingTenure',
	groupId: 'bt_current_terms',
	bindsTo_template: 'remainingTenure',
	contextKey: 'remainingTenure',
	type: 'text',
	textClass: 'mt-8 md:mt-12',
	uiType: 'number',
	uiGroup: 'text_fields',
	uiMeta: {
		placeholder: 'Remaining tenure in months',
		icon: 'calendar'
	},
	required: true,
	minLimit: 6,
	maxLimit: 360,
	question: 'How many months are remaining on the current loan?',
	description:
		"<div class='info-title'><span class='info-icon green'>⏳</span> Remaining Tenure</div><div class='info-box highlight'>Number of EMIs still due before the loan closes at the current lender. Enter in months.</div><div class='info-box tip'><span class='bold'>💡 Cross-check:</span> Disbursement date + original tenure − months elapsed should approximate remaining tenure. We surface a warning if the math doesn't reconcile.</div>",
	showWhen: HAS_RATE_TYPE,
	validation: {
		condition: [
			{
				case: {
					or: [
						{ '<': [{ var: 'remainingTenure' }, 6] },
						{ '>': [{ var: 'remainingTenure' }, 360] }
					]
				},
				then: 'Remaining tenure should be between 6 and 360 months (6 months to 30 years).'
			},
			{
				case: {
					and: [
						{ '>': [{ var: 'originalTenure' }, 0] },
						{ '>': [{ var: 'remainingTenure' }, { var: 'originalTenure' }] }
					]
				},
				then: 'Remaining tenure cannot exceed the original tenure. Please re-check.'
			}
		]
	}
};

// ── 9. Current EMI ─────────────────────────────────────────────────────────
// Key kept as `includedCurrentEMIsAmount` (verbose but unambiguous). The
// payload builders + rule engine + lender policies all read this exact key
// today; renaming would require ~30 cross-file edits with non-trivial silent-
// drop risk for a pure naming improvement.

export const qEmi: RawSchemaQuestion = {
	id: 'q9_includedCurrentEMIsAmount',
	groupId: 'bt_current_terms',
	bindsTo_template: 'includedCurrentEMIsAmount',
	contextKey: 'includedCurrentEMIsAmount',
	type: 'currency',
	textClass: 'mt-8 md:mt-12',
	uiGroup: 'text_fields',
	uiMeta: {
		placeholder: 'Current EMI amount'
	},
	required: true,
	minLimit: 500,
	maxLimit: 10000000,
	question: 'What is the current monthly EMI?',
	description:
		"<div class='info-title'><span class='info-icon gold'>💸</span> Current EMI</div><div class='info-box highlight'>The exact monthly instalment debited from the customer's account today. If part-prepayments have reduced the EMI recently, use the latest figure.</div><div class='info-box tip'><span class='bold'>💡 Cross-check:</span> EMI × remaining months should roughly equal the principal outstanding + remaining interest. We warn if the math is clearly off.</div>",
	showWhen: HAS_REMAINING_TENURE,
	validation: {
		condition: [
			// Cross-field plausibility — lower bound (zero-interest floor):
			// EMI ≥ 0.9 × (principal / remaining-months). Catches mathematically
			// impossible EMIs (e.g. ₹557 EMI on ₹23L principal / 22 months).
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
				then: 'EMI looks too low for this principal and remaining tenure — even at 0% interest the EMI would need to be at least the principal divided by the months remaining. Please re-check.'
			},
			// Cross-field plausibility — upper bound (typo catcher):
			// EMI ≤ 1.6 × (principal / remaining-months). Catches typos like an
			// extra zero without false-rejecting legitimate high-rate cases.
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
	}
};

// ── 10. EMIs Paid (count) ──────────────────────────────────────────────────
// Key kept as `btEmisPaid` — already canonical in Home Loan + payload builder
// + the typed casePayload contract.

export const qEmisPaid: RawSchemaQuestion = {
	id: 'q10_btEmisPaid',
	groupId: 'bt_repayment_history',
	groupTitle: 'Repayment History',
	bindsTo_template: 'btEmisPaid',
	contextKey: 'btEmisPaid',
	type: 'text',
	textClass: 'mt-8 md:mt-12',
	uiType: 'number',
	uiGroup: 'text_fields',
	uiMeta: {
		placeholder: 'Number of EMIs paid so far',
		icon: 'check-circle'
	},
	required: true,
	minLimit: 0,
	maxLimit: 360,
	question: 'How many EMIs has the customer paid so far?',
	description:
		"<div class='info-title'><span class='info-icon green'>✅</span> EMIs Paid</div><div class='info-box highlight'>Total instalments the customer has paid since the loan started. If a moratorium period applied, EXCLUDE those months — only count months where an EMI was actually debited.</div><div class='info-box warning'><span class='bold'>⚠️ Critical for BT eligibility:</span> Most lenders require at least 6 EMIs paid before they'll consider a balance transfer. Many require 12+. Less than 6 paid means very few BT options.</div><div class='info-box tip'><span class='bold'>💡 Why we ask (not derive):</span> Counting from disbursement date is unreliable — moratorium periods, pre-EMI interest phases (for under-construction property), and prepayments all distort the count. Better to ask directly.</div>",
	showWhen: HAS_EMI,
	validation: {
		condition: [
			{
				case: {
					and: [
						{ '>': [{ var: 'originalTenure' }, 0] },
						{ '>': [{ var: 'btEmisPaid' }, { var: 'originalTenure' }] }
					]
				},
				then: 'EMIs paid cannot exceed the original tenure. Please re-check.'
			}
		]
	},
	warning: {
		condition: [
			{
				case: { '<': [{ var: 'btEmisPaid' }, 6] },
				then: 'Most lenders require at least 6 EMIs paid before considering a balance transfer. With fewer than 6, BT options will be very limited.'
			},
			{
				case: {
					and: [
						{ '>=': [{ var: 'btEmisPaid' }, 6] },
						{ '<': [{ var: 'btEmisPaid' }, 12] }
					]
				},
				then: '6–11 EMIs paid is acceptable for some lenders but stricter banks require 12+. Expect a narrower BT lender shortlist.'
			}
		]
	}
};

// ── 11. EMI Bounce History ─────────────────────────────────────────────────
// Key kept as `emiBounceHistory` (specifically about bounces, NOT generic
// payment delays). The obligations entry's `emiDelayHistory` is conceptually
// adjacent but semantically different — bounce = NACH/cheque returned;
// delay = paid late. Keeping them as separate concepts.

export const qEmiBounceHistory: RawSchemaQuestion = {
	id: 'q11_emiBounceHistory',
	groupId: 'bt_repayment_history',
	bindsTo_template: 'emiBounceHistory',
	contextKey: 'emiBounceHistory',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-3 gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'How is the EMI payment track record in the last 12 months?',
	description:
		"<div class='info-title'><span class='info-icon green'>📋</span> Repayment Track Record</div><div class='info-box highlight'>Lenders check the past 12 months of EMI behaviour before approving a BT. A clean track record is the strongest predictor of approval; bounces or delays narrow options significantly.</div><div class='info-box note'><span class='bold'>What counts as a delay/bounce:</span><ul class='info-list'><li>EMI cheque/NACH/ECS returned (auto-debit failure)</li><li>EMI paid after the due date</li><li>Partial EMI paid instead of full amount</li></ul></div><div class='info-box tip'><span class='bold'>💡 Where to find it:</span> 12-month statement of the loan account, or the customer's bank statement showing the EMI debits.</div>",
	options: [
		{
			label: 'Clean — all EMIs on time',
			value: 'clean',
			icon: 'CheckCircle2',
			labelDescription: 'No bounces, no delays in the last 12 months'
		},
		{
			label: '1–2 irregular',
			value: 'minor',
			icon: 'AlertCircle',
			labelDescription: 'A few late payments or bounces — most lenders may still consider'
		},
		{
			label: '3 or more irregular',
			value: 'major',
			icon: 'AlertTriangle',
			labelDescription: 'Frequent issues — BT options will be severely limited'
		}
	],
	showWhen: HAS_EMI,
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'emiBounceHistory' }, 'minor'] },
				then: '1–2 irregular payments may limit options. Some NBFCs are flexible if recent months show improvement.'
			},
			{
				case: { '==': [{ var: 'emiBounceHistory' }, 'major'] },
				then: 'Frequent EMI bounces significantly reduce BT options. Very few lenders may consider, and terms will be less favourable.'
			}
		]
	}
};

// ── Page builder ───────────────────────────────────────────────────────────

/** Returns the canonical question list for the Current Loan Details page. */
export function getBtLoanDetailsQuestions(): RawSchemaQuestion[] {
	return [
		qBankName,
		qDisbursedAmount,
		qDisbursementDate,
		qOriginalTenure,
		qPrincipalOutstanding,
		qExistingInterestRate,
		qInterestRateType,
		qRemainingTenure,
		qEmi,
		qEmisPaid,
		qEmiBounceHistory
	];
}

/**
 * Build a Current Loan Details page for a secured-loan schema.
 *
 * @param pageId — schema page id (each loan keeps its existing page id so
 *   page-index restore + sidebar routing stay backward-compatible)
 * @param showWhen — JSON-Logic expression deciding when this page is
 *   visible. Typically `loanType` checks for Balance Transfer / Top-up
 *   scope values. Post-2026-05-31 rename (ADR-0020), every loan stores
 *   scope in `loanType` (Plot included — no longer the exception). Each
 *   loan still supplies its own gate because the set of valid scope
 *   values differs (Plot has only `New Loan` / `Balance Transfer Only`;
 *   Home/LAP also have `Balance Transfer With Top-up` / `Top-up Only`).
 */
export function buildBtLoanDetailsPage(
	pageId: string,
	showWhen: RulesLogic
): RawSchemaPage {
	return {
		id: pageId,
		title: 'Current Loan Details',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		showWhen,
		questions: getBtLoanDetailsQuestions()
	};
}
