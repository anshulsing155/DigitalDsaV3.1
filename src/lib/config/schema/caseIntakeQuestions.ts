/**
 * Shared Case Intake Questions — used by ALL 6 loan types as the first page.
 *
 * Captures the assessment status of the case:
 *   q1_assessmentStatus — Fresh / Rejected / Sanctioned-not-disbursed / Don't know
 *   q2_assessmentLenders — Multi-select: which lenders rejected or gave offer (shown for options 2 & 3)
 *   q3_rejectionReasons — Multi-select: why lender(s) rejected (shown for rejected)
 *   q4_sanctionNotDisbursedReasons — Multi-select: why sanction wasn't taken (shown for sanctioned_not_disbursed)
 *
 * Business logic:
 *   - Rejected lenders will be highlighted in the offer comparison view
 *   - Sanctioned lenders' offers can be compared against new lender offers
 *   - Rejection reasons help DSA understand weak points and prepare better applications
 *   - Sanction-not-disbursed reasons help DSA negotiate better terms with new lenders
 *   - Helps DSA detect if anything is being hidden by the loan seeker
 */

import type { RawSchemaQuestion, RawSchemaPage } from './schemaTypes.js';

// ── q1 — Assessment Status ─────────────────────────────────────────────────

export const q1_assessmentStatus: RawSchemaQuestion = {
	id: 'q1_assessmentStatus',
	bindsTo_template: 'assessmentStatus',
	contextKey: 'assessmentStatus',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	uiMeta: { icon: 'ClipboardList' },
	required: true,

	question: 'What is the current status of this case?',

	description:
		"<div class='text-labelText !m-0'><i data-lucide='lightbulb' class='inline-block h-5 w-5 text-yellow-400'></i>  Case Assessment Status</div><div class='info-box info-title'>Knowing the current stage helps us highlight relevant lenders and avoid those that have already declined or given an unsatisfactory offer.</div>",

	options: [
		{
			label: 'Fresh Assessment',
			value: 'fresh',
			uiMeta: { icon: 'Circle' },
			icon: 'Star',
			labelDescription: 'Not applied anywhere within the last 3 months'
		},
		{
			label: 'Rejected Recently',
			value: 'rejected',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle',
			labelDescription: 'Rejected by one or more lenders'
		},
		{
			label: 'Sanctioned, Not Disbursed',
			value: 'sanctioned_not_disbursed',
			uiMeta: { icon: 'Circle' },
			icon: 'CircleAlert',
			labelDescription: 'Got an offer but terms are not acceptable'
		},
		{
			label: "Don't Know",
			value: 'unknown',
			uiMeta: { icon: 'Circle' },
			icon: 'HelpCircle',
			labelDescription: 'Loan seeker has not shared prior history'
		}
	],

	warning: {
		condition: [
			{
				case: { '==': [{ var: 'assessmentStatus' }, 'unknown'] },
				then: 'Without prior history, some lenders may flag duplicate applications. Try to gather this information before submission.'
			}
		]
	}
};

// ── q2 — Lender Multi-Select (shown for rejected / sanctioned) ─────────────

export const q2_assessmentLenders: RawSchemaQuestion = {
	id: 'q2_assessmentLenders',
	bindsTo_template: 'assessmentLenders',
	contextKey: 'assessmentLenders',
	type: 'multiple-select',
	radioClass: 'mt-8 md:mt-12',
	multipleSelectClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	uiMeta: { icon: 'Building2' },
	required: true,
	placeholder: 'Select lender(s)',

	question: {
		switch: [
			{
				case: { '==': [{ var: 'assessmentStatus' }, 'rejected'] },
				then: 'Which lender(s) rejected the application?'
			},
			{
				case: { '==': [{ var: 'assessmentStatus' }, 'sanctioned_not_disbursed'] },
				then: 'Which lender(s) gave the sanction/offer?'
			}
		],
		default: 'Which lender(s) were involved?'
	} as unknown as string,

	description: {
		switch: [
			{
				case: { '==': [{ var: 'assessmentStatus' }, 'rejected'] },
				then: "<div class='info-box info-title'>These lenders will be flagged in the offer comparison so you can assess reasons and decide which to avoid.</div>"
			},
			{
				case: { '==': [{ var: 'assessmentStatus' }, 'sanctioned_not_disbursed'] },
				then: "<div class='info-box info-title'>These offers will be highlighted when comparing new lender offers — helps evaluate if the new terms are genuinely better.</div>"
			}
		],
		default: ''
	} as unknown as string,

	// Dynamic options from optionResolver (bank data)
	options: [],

	showWhen: {
		in: [{ var: 'assessmentStatus' }, ['rejected', 'sanctioned_not_disbursed']]
	}
};

// ── q3 — Rejection Reasons (shown when rejected) ────────────────────────────

export const q3_rejectionReasons: RawSchemaQuestion = {
	id: 'q3_rejectionReasons',
	bindsTo_template: 'rejectionReasons',
	contextKey: 'rejectionReasons',
	type: 'multiple-select',
	radioClass: 'mt-8 md:mt-12',
	multipleSelectClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	uiMeta: { icon: 'ShieldX' },
	required: true,
	placeholder: 'Select reason(s)',

	question: 'What was the reason for rejection?',

	description:
		"<div class='info-box info-title'>Understanding why the application was rejected helps prepare a stronger case for the next lender and avoid repeat issues.</div>",

	options: [
		{
			label: 'Low CIBIL / Credit Issues',
			value: 'low_cibil',
			uiMeta: { icon: 'Circle' },
			labelDescription: 'Low credit score, defaults, or adverse credit history'
		},
		{
			label: 'Insufficient Income / High FOIR',
			value: 'insufficient_income',
			uiMeta: { icon: 'Circle' },
			labelDescription: 'Income too low or existing obligations too high'
		},
		{
			label: 'Property / Collateral Issues',
			value: 'property_issues',
			uiMeta: { icon: 'Circle' },
			labelDescription: 'Title unclear, valuation gap, unapproved property, or legal issues'
		},
		{
			label: 'Incomplete Documentation',
			value: 'incomplete_docs',
			uiMeta: { icon: 'Circle' },
			labelDescription: 'Missing or insufficient documents submitted'
		},
		{
			label: 'Profile Mismatch',
			value: 'profile_mismatch',
			uiMeta: { icon: 'Circle' },
			labelDescription: 'Employment type, business vintage, or age not meeting policy'
		},
		{
			label: 'Other / Not Disclosed',
			value: 'other',
			uiMeta: { icon: 'Circle' },
			labelDescription: 'Reason not shared or does not fit above categories'
		}
	],

	showWhen: {
		'==': [{ var: 'assessmentStatus' }, 'rejected']
	}
};

// ── q4 — Sanction Not Disbursed Reasons (shown when sanctioned) ─────────────

export const q4_sanctionNotDisbursedReasons: RawSchemaQuestion = {
	id: 'q4_sanctionNotDisbursedReasons',
	bindsTo_template: 'sanctionNotDisbursedReasons',
	contextKey: 'sanctionNotDisbursedReasons',
	type: 'multiple-select',
	radioClass: 'mt-8 md:mt-12',
	multipleSelectClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	uiMeta: { icon: 'Scale' },
	required: true,
	placeholder: 'Select reason(s)',

	question: 'Why was the sanction not accepted?',

	description:
		"<div class='info-box info-title'>Knowing why a sanctioned offer was not taken helps negotiate better terms with new lenders and set realistic expectations.</div>",

	options: [
		{
			label: 'High Interest Rate',
			value: 'high_interest_rate',
			uiMeta: { icon: 'Circle' },
			labelDescription: 'Offered rate of interest was too high compared to expectations'
		},
		{
			label: 'Sanctioned Amount Too Low',
			value: 'low_sanction_amount',
			uiMeta: { icon: 'Circle' },
			labelDescription: 'Approved amount was significantly less than required'
		},
		{
			label: 'High Processing Fees / Charges',
			value: 'high_fees',
			uiMeta: { icon: 'Circle' },
			labelDescription: 'Processing fees, legal charges, or other costs were too high'
		},
		{
			label: 'Unfavorable Terms & Conditions',
			value: 'unfavorable_terms',
			uiMeta: { icon: 'Circle' },
			labelDescription: 'Prepayment penalties, lock-in period, or restrictive clauses'
		},
		{
			label: 'Property Not Approved',
			value: 'property_not_approved',
			uiMeta: { icon: 'Circle' },
			labelDescription: 'Lender did not approve the selected property'
		},
		{
			label: 'Other / Not Disclosed',
			value: 'other',
			uiMeta: { icon: 'Circle' },
			labelDescription: 'Reason not shared or does not fit above categories'
		}
	],

	showWhen: {
		'==': [{ var: 'assessmentStatus' }, 'sanctioned_not_disbursed']
	}
};

// ── Page builder ────────────────────────────────────────────────────────────

export function getCaseIntakeQuestions(): RawSchemaQuestion[] {
	return [
		q1_assessmentStatus,
		q2_assessmentLenders,
		q3_rejectionReasons,
		q4_sanctionNotDisbursedReasons
	];
}

export function buildCaseIntakePage(pageId: string): RawSchemaPage {
	return {
		id: pageId,
		title: 'Case Assessment',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getCaseIntakeQuestions()
	};
}
