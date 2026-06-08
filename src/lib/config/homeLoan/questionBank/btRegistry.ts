import type { RawSchemaQuestion } from '../types.js';

/**
 * BT Registry & Possession questions.
 *
 * Originally on a dedicated `btRegistry_homeLoan` page (page-level showWhen hid
 * the entire page for New Loan). Now merged into the Location page (Session 32),
 * so each question must have its own BT-gating showWhen.
 *
 * Covers registry status, possession/demand status, and outstanding demand amount.
 * Only shown for BT/Top-up loan types.
 *
 * Form Optimization Tier 1.2: q4_sixMonthsPassedAfterRegistry removed --
 * redundant because DSA already enters loanDisbursementDate earlier in the form,
 * and whether 6 months have passed is derivable via date math.
 */

/** JSON-Logic condition: loan type is any BT or Top-up variant */
const IS_BT_TOPUP = {
	in: [
		{ var: 'loanType' },
		['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
	]
};

export function getBtRegistryQuestions(): RawSchemaQuestion[] {
	return [
		// ── q1: Is Registry Done ────────────────────────────────────────
		{
			id: 'q1_isRegistryDone',
			bindsTo_template: 'isRegistryDone',
			contextKey: 'isRegistryDone',
			type: 'radio',
			radioClass: 'mt-[1rem] md:mt-[2rem]',
			
			optionContainerClass: 'grid md:grid-cols-2 gap-3',
			uiGroup: 'loan_details',
			required: true,
			question: 'Has the property registry been done in the name of the owner(s)?',
			options: [
				{
					label: 'Yes',
					value: 'Yes',
					uiMeta: { icon: 'Circle' },
					icon: 'ThumbsUp'
				},
				{
					label: 'No',
					value: 'No',
					uiMeta: { icon: 'Circle' },
					icon: 'ThumbsDown'
				}
			],
			// Previously gated by page-level showWhen; now needs own BT check
			showWhen: IS_BT_TOPUP,

			// FG-2 #9: Registry <6 months warning — the original sixMonthsPassedAfterRegistry
			// question was removed (Form Optimization Tier 1.2, derivable from disbursement date).
			// This warning reminds DSAs that registry vintage matters for BT eligibility.
			warning: {
				condition: [
					{
						case: {
							and: [
								{ '==': [{ var: 'isRegistryDone' }, 'Yes'] },
								// Cross-reference btEmisPaid: if registry is done but very few EMIs paid,
								// the registry is likely recent and compliance docs may not yet be ready.
								{ '!=': [{ var: 'btEmisPaid' }, ''] },
								{ '<': [{ var: 'btEmisPaid' }, 6] }
							]
						},
						then: 'Registry is done but fewer than 6 EMIs have been paid — this indicates the registry is very recent. Most lenders require at least 6 months post-registry before processing a balance transfer. Compliance documents (mutation, EC update) may also not be ready yet.'
					}
				]
			}
		},

		// ── q2: Possession & Builder Demand Status ──────────────────────
		{
			id: 'q2_bt_possessionAndDemandStatus',
			bindsTo_template: 'bt_possessionAndDemandStatus',
			contextKey: 'bt_possessionAndDemandStatus',
			type: 'radio',
			radioClass: 'mt-8 md:mt-12',
			
			optionContainerClass: 'grid gap-3',
			uiGroup: 'loan_details',
			required: true,
			question: 'What is the current possession and builder demand status?',
			description:
				"<div class='info-title'><span class='info-icon blue'>\ud83d\udccb</span> Possession & Demand Status</div><div class='info-box highlight'>This combined question helps lenders assess the BT case complexity \u2014 whether you have possession AND whether the builder has pending demands.</div>",
			options: [
				{
					label: 'Have possession, no pending demand',
					value: 'POSSESSION_NO_DEMAND',
					uiMeta: { icon: 'Circle' },
					icon: 'CheckCircle2'
				},
				{
					label: 'Have possession, demand pending',
					value: 'POSSESSION_WITH_DEMAND',
					uiMeta: { icon: 'Circle' },
					icon: 'AlertCircle'
				},
				{
					label: 'No possession, no demand',
					value: 'NO_POSSESSION_NO_DEMAND',
					uiMeta: { icon: 'Circle' },
					icon: 'Clock'
				},
				{
					label: 'No possession, demand pending',
					value: 'NO_POSSESSION_WITH_DEMAND',
					uiMeta: { icon: 'Circle' },
					icon: 'AlertTriangle'
				}
			],
			showWhen: {
				and: [IS_BT_TOPUP, { '==': [{ var: 'isRegistryDone' }, 'No'] }]
			}
		},

		// ── q3: Outstanding Demand Amount ────────────────────────────────
		{
			id: 'q3_bt_outstandingDemandAmount',
			bindsTo_template: 'bt_outstandingDemandAmount',
			contextKey: 'bt_outstandingDemandAmount',
			type: 'currency',
			textFieldClass: 'mt-8 md:mt-12',
			uiGroup: 'inputNumber',
			uiMeta: {
				placeholder: 'Enter demanded amount'
			},
			required: true,
			minLimit: 0,
			maxLimit: 9999999999,
			question: 'What is the total outstanding demand amount from the builder?',
			validation: {
				condition: [
					{
						case: { '<=': [{ var: 'bt_outstandingDemandAmount' }, 12000] },
						then: 'For amounts under \u20b912,000, this is generally considered insignificant.'
					}
				]
			},
			showWhen: {
				and: [
					IS_BT_TOPUP,
					{ '==': [{ var: 'isRegistryDone' }, 'No'] },
					{
						or: [
							{
								'==': [{ var: 'bt_possessionAndDemandStatus' }, 'POSSESSION_WITH_DEMAND']
							},
							{
								'==': [{ var: 'bt_possessionAndDemandStatus' }, 'NO_POSSESSION_WITH_DEMAND']
							}
						]
					}
				]
			}
		}

		// ── q4: 6 Months Passed After Registry -- REMOVED (Form Optimization Tier 1.2)
		// Redundant: DSA already enters loanDisbursementDate earlier in the form.
		// Whether 6 months have passed is derivable via date math from disbursement date.
		// The warning about <6 months already exists on the disbursement date question.
	];
}
