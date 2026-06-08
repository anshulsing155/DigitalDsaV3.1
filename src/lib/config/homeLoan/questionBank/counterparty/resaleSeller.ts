import type { RawSchemaQuestion } from '../../types.js';

/**
 * Resale seller counterparty questions for the `sellerTransaction_homeLoan` page.
 *
 * Covers seller ownership, POA status, acquisition method, agreement+POA NBFC
 * workarounds, seller's existing loan, property registration, registry timing,
 * and pending builder demands.
 *
 * These questions apply to resale_normal and resale_endorsement purchase types.
 * Extracted verbatim from homeLoanSchemaV2.json — every showWhen, validation,
 * UI class, uiMeta, warning, riskType, and description preserved exactly.
 */
export function getResaleSellerQuestions(): RawSchemaQuestion[] {
	return [
		// ── q1: Seller Ownership Type ──────────────────────────────────
		{
			id: 'q1_sellerOwnershipType',
			bindsTo_template: 'sellerOwnershipType',
			contextKey: 'sellerOwnershipType',
			type: 'radio',
			radioClass: 'mt-[1rem] md:mt-[2rem]',
			
			optionContainerClass: 'grid md:grid-cols-2 gap-3',
			uiGroup: 'loan_details',
			required: true,
			question: 'Who is selling the property?',
			description:
				"<div class='info-title'><i data-lucide='user-round' class='inline-block h-4 w-4'></i> Seller Identity</div><div class='info-box highlight dark:text-gray-400'>The seller's ownership type affects title verification complexity and documentation requirements.</div><div class=\"info-box tip dark:text-gray-400\"><span class=\"bold\"><i data-lucide='lightbulb' class='inline-block h-4 w-4 text-yellow-500'></i> Endorsement Reminder:</span> For resale via endorsement, the seller is typically the builder or their nominee.</div>",
			options: [
				{
					label: 'Sole owner',
					value: 'SOLE_OWNER',
					uiMeta: { icon: 'Circle' },
					icon: 'User'
				},
				{
					label: 'Joint owners (2+)',
					value: 'JOINT_OWNERS',
					uiMeta: { icon: 'Circle' },
					icon: 'Users'
				},
				{
					label: 'Inherited \u2014 sold via legal heir(s)',
					value: 'INHERITED',
					uiMeta: { icon: 'Circle' },
					icon: 'PersonStanding'
				},
				{
					label: 'POA holder (power of attorney)',
					value: 'POA_HOLDER',
					uiMeta: { icon: 'Circle' },
					icon: 'HandFist'
				}
			],
			warning: {
				condition: [
					{
						case: {
							'==': [{ var: 'sellerOwnershipType' }, 'INHERITED']
						},
						then: 'Inherited properties require succession certificate or legal heir certificate. Title chain verification will be more thorough.'
					},
					{
						case: {
							'==': [{ var: 'sellerOwnershipType' }, 'POA_HOLDER']
						},
						then: 'POA-based sales require registered power of attorney. Most banks require the POA to be specifically for property sale, not a general POA.'
					}
				]
			},
			showWhen: {
				or: [
					{ '!=': [{ var: 'purchaseType' }, 'resale_endorsement'] },
					{ '==': [{ var: 'purchaseType' }, 'resale_endorsement'] }
				]
			}
		},

		// ── q2: POA Registration Status ────────────────────────────────
		{
			id: 'q2_poaRegistrationStatus',
			bindsTo_template: 'poaRegistrationStatus',
			contextKey: 'poaRegistrationStatus',
			type: 'radio',
			radioClass: 'mt-8 md:mt-12',
			
			optionContainerClass: 'grid md:grid-cols-2 gap-3',
			uiGroup: 'loan_details',
			required: true,
			question: 'Is the power of attorney registered?',
			description:
				"<div class='info-title'><i data-lucide='clipboard-list' class='inline-block h-4 w-4'></i> POA Registration</div><div class='info-box highlight dark:text-gray-400'>Registered POA (with sub-registrar) is mandatory for property transactions. Unregistered or notarized-only POA is not accepted by any major lender.</div>",
			options: [
				{
					label: 'Yes \u2014 registered with sub-registrar',
					value: 'REGISTERED',
					uiMeta: { icon: 'Circle' },
					icon: 'CheckCircle2'
				},
				{
					label: 'No \u2014 unregistered / notarized only',
					value: 'NOT_REGISTERED',
					uiMeta: { icon: 'Circle' },
					icon: 'XCircle',
					riskType: 'UNREGISTERED_POA',
					riskSignal: {
						severity: 'critical',
						message: 'Unregistered POA is not accepted by any major bank. Only NBFCs may consider.',
						category: 'property_risk'
					}
				},
				{
					label: 'Not sure',
					value: 'UNKNOWN',
					uiMeta: { icon: 'Circle' },
					icon: 'HelpCircle'
				}
			],
			showWhen: {
				'==': [{ var: 'sellerOwnershipType' }, 'POA_HOLDER']
			},
			warning: {
				condition: [
					{
						case: {
							'==': [{ var: 'poaRegistrationStatus' }, 'NOT_REGISTERED']
						},
						then: 'Unregistered POA is not accepted by any major lender for property transactions. This is a deal-breaker for financing.'
					},
					{
						case: {
							'==': [{ var: 'poaRegistrationStatus' }, 'UNKNOWN']
						},
						then: 'POA registration status must be verified before loan processing. Ask seller for the registered POA document.'
					}
				]
			}
		},

		// ── q3: Property Acquisition Method ────────────────────────────
		{
			id: 'q3_propertyAcquisitionMethod',
			bindsTo_template: 'propertyAcquisitionMethod',
			contextKey: 'propertyAcquisitionMethod',
			type: 'radio',
			radioClass: 'mt-8 md:mt-12',
			
			optionContainerClass: 'grid md:grid-cols-2 gap-3',
			uiGroup: 'loan_details',
			required: true,
			question: 'How did the seller acquire this property?',
			description:
				"<div class='info-title'><i data-lucide='scroll-text' class='inline-block h-4 w-4'></i>Acquisition Method</div><div class='info-box highlight dark:text-gray-400'>The way the seller acquired the property determines the title chain complexity and documentation requirements for the loan.</div>",
			options: [
				{
					label: 'Purchased (registered sale deed)',
					value: 'PURCHASED',
					uiMeta: { icon: 'Circle' },
					icon: 'Receipt'
				},
				{
					label: 'Inherited / family partition',
					value: 'INHERITED',
					uiMeta: { icon: 'Circle' },
					icon: 'Scale'
				},
				{
					label: 'Gift deed',
					value: 'GIFT_DEED',
					uiMeta: { icon: 'Circle' },
					icon: 'Gift'
				},
				{
					label: 'Government allotment / auction',
					value: 'GOVT_ALLOTMENT',
					uiMeta: { icon: 'Circle' },
					icon: 'Landmark'
				},
				{
					label: 'Agreement to Sell + POA (no registered sale deed)',
					value: 'AGREEMENT_POA',
					uiMeta: { icon: 'Circle' },
					icon: 'AlertOctagon',
					riskType: 'AGREEMENT_POA'
				}
			],
			warning: {
				condition: [
					{
						case: {
							'==': [{ var: 'propertyAcquisitionMethod' }, 'INHERITED']
						},
						then: 'Inherited property requires succession/legal heir certificate and consent of all legal heirs. Extra documentation and longer processing.'
					},
					{
						case: {
							'==': [{ var: 'propertyAcquisitionMethod' }, 'GIFT_DEED']
						},
						then: "Gift deed properties may have restricted transfer clauses. Lenders verify gift deed registration and donor's title before approval."
					},
					{
						case: {
							'==': [{ var: 'propertyAcquisitionMethod' }, 'GOVT_ALLOTMENT']
						},
						then: 'Government-allotted properties may have transfer restrictions or cooling periods. Original allotment letter and NOC from authority required.'
					},
					{
						case: {
							'==': [{ var: 'propertyAcquisitionMethod' }, 'AGREEMENT_POA']
						},
						then: 'After the Supreme Court ruling (Suraj Lamp & Industries, 2012), property transfer via Agreement to Sell + POA + Will + Revenue Receipt is not legally valid. No major bank will finance such deals. Only select NBFCs in certain areas may have workarounds.'
					}
				]
			},
			showWhen: {
				'!=': [{ var: 'purchaseType' }, 'direct_from_authority']
			}
		},

		// ── q4: Agreement+POA — Registry Willing? ──────────────────────
		{
			id: 'q4_agreementPoaRegistryWilling',
			bindsTo_template: 'agreementPoaRegistryWilling',
			contextKey: 'agreementPoaRegistryWilling',
			type: 'radio',
			radioClass: 'mt-8 md:mt-12',
			
			optionContainerClass: 'grid gap-3',
			uiGroup: 'loan_details',
			required: true,
			question: 'Are both seller and buyer willing to get the property registered first?',
			description:
				"<div class='info-title'><i data-lucide='notebook-pen' class='inline-block h-4 w-4'></i> Registration Recommendation</div><div class='info-box highlight dark:text-gray-400'>The seller must register the property via a proper sale deed. Registration will be at the consideration rate (Agreement to Sell value or circle/guideline rate, whichever is higher). Advise the DSA to explain this to both parties.</div>",
			options: [
				{
					label: 'Yes \u2014 both parties agree to register first, then apply for loan',
					value: 'YES',
					uiMeta: { icon: 'Circle' },
					icon: 'CheckCircle2'
				},
				{
					label: 'No \u2014 seller/buyer not willing to register',
					value: 'NO',
					uiMeta: { icon: 'Circle' },
					icon: 'XCircle'
				}
			],
			showWhen: {
				'==': [{ var: 'propertyAcquisitionMethod' }, 'AGREEMENT_POA']
			},
			warning: {
				condition: [
					{
						case: {
							'==': [{ var: 'agreementPoaRegistryWilling' }, 'YES']
						},
						then: 'Once the property is registered, this becomes a normal resale purchase. The case can proceed.'
					},
					{
						case: {
							'==': [{ var: 'agreementPoaRegistryWilling' }, 'NO']
						},
						then: 'Without registration, no major bank will finance this deal. Only select NBFCs in certain areas may have workarounds.'
					}
				]
			}
		},

		// ── q5: Agreement+POA — NBFC Known? ────────────────────────────
		{
			id: 'q5_agreementPoaNbfcKnown',
			bindsTo_template: 'agreementPoaNbfcKnown',
			contextKey: 'agreementPoaNbfcKnown',
			type: 'radio',
			radioClass: 'mt-8 md:mt-12',
			
			optionContainerClass: 'grid md:grid-cols-2 gap-3',
			uiGroup: 'loan_details',
			required: true,
			question: 'Do you know which NBFC finances unregistered Agreement+POA deals in this area?',
			options: [
				{
					label: 'Yes \u2014 I know an NBFC',
					value: 'Yes',
					uiMeta: { icon: 'Circle' },
					icon: 'CheckCircle2'
				},
				{
					label: "No \u2014 I don't know",
					value: 'No',
					uiMeta: { icon: 'Circle' },
					icon: 'XCircle',
					riskType: 'AGREEMENT_POA'
				}
			],
			showWhen: {
				'==': [{ var: 'agreementPoaRegistryWilling' }, 'NO']
			},
			warning: {
				condition: [
					{
						case: {
							'==': [{ var: 'agreementPoaNbfcKnown' }, 'No']
						},
						then: 'This case cannot proceed without confirmed NBFC financing for Agreement+POA deals in this area. Check with your network, contact RMs, or reach out to us.'
					}
				]
			}
		},

		// ── q6: Agreement+POA — NBFC Name ──────────────────────────────
		{
			id: 'q6_agreementPoaNbfcName',
			bindsTo_template: 'agreementPoaNbfcName',
			contextKey: 'agreementPoaNbfcName',
			type: 'text',
			textFieldClass: 'mt-8 md:mt-12',
			uiGroup: 'inputText',
			uiMeta: {
				placeholder: 'Enter NBFC name (e.g., Aavas, Grihashakti)'
			},
			required: true,
			question: 'Which NBFC finances this deal type in this area?',
			showWhen: {
				'==': [{ var: 'agreementPoaNbfcKnown' }, 'Yes']
			}
		},

		// ── q7: Seller On Loan ─────────────────────────────────────────
		{
			id: 'q7_sellerOnLoan',
			bindsTo_template: 'sellerOnLoan',
			contextKey: 'sellerOnLoan',
			type: 'radio',
			radioClass: 'mt-[1rem] md:mt-[2rem]',
			
			optionContainerClass: 'grid md:grid-cols-2 gap-3',
			uiGroup: 'loan_details',
			required: true,
			question: "Is the seller's property currently under a home loan?",
			description:
				"<div class='info-title'><i data-lucide='piggy-bank' class='inline-block h-4 w-4 text-yellow-500'></i> Seller's Existing Loan</div><div class='info-box highlight dark:text-gray-400'>If the seller has an active home loan on this property, it affects the transaction process and disbursement timeline.</div>",
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
			showWhen: {
				'!=': [{ var: 'purchaseType' }, 'direct_from_authority']
			}
		},

		// ── q8: Seller Outstanding Amount ──────────────────────────────
		{
			id: 'q8_sellerOutstandingAmount',
			bindsTo_template: 'sellerOutstandingAmount',
			contextKey: 'sellerOutstandingAmount',
			type: 'currency',
			textFieldClass: 'mt-8 md:mt-12',
			uiGroup: 'inputNumber',
			uiMeta: {
				placeholder: "Enter seller's outstanding amount"
			},
			required: true,
			minLimit: 0,
			maxLimit: 9999999999,
			question: "What is the approximate outstanding loan amount on the seller's property?",
			showWhen: {
				and: [
					{ '!=': [{ var: 'purchaseType' }, 'direct_from_authority'] },
					{ '==': [{ var: 'sellerOnLoan' }, 'Yes'] }
				]
			}
		},

		// ── q9: Seller Current Lender ──────────────────────────────────
		{
			id: 'q9_sellerCurrentLender',
			bindsTo_template: 'sellerCurrentLender',
			contextKey: 'sellerCurrentLender',
			type: 'select',
			selectClass: 'mt-8 md:mt-12',
			uiGroup: 'select_fields',
			uiMeta: {
				placeholder: "Select seller's current lender",
				icon: 'landmark'
			},
			required: true,
			question: 'Which lender does the seller currently have the loan with?',
			showWhen: {
				and: [
					{ '!=': [{ var: 'purchaseType' }, 'direct_from_authority'] },
					{ '==': [{ var: 'sellerOnLoan' }, 'Yes'] }
				]
			}
		},

		// ── q10: Property Registered in Seller's Name ──────────────────
		{
			id: 'q10_ifPropertyRegistered',
			bindsTo_template: 'ifPropertyRegistered',
			contextKey: 'ifPropertyRegistered',
			type: 'radio',
			radioClass: 'mt-8 md:mt-12',
			
			optionContainerClass: 'grid md:grid-cols-2 gap-3',
			uiGroup: 'loan_details',
			required: true,
			question: 'Is the property registered in the name of the seller(s)?',
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
			showWhen: {
				or: [
					{ '==': [{ var: 'sellerOnLoan' }, 'No'] },
					{
						and: [
							{ '==': [{ var: 'purchaseType' }, 'resale_endorsement'] },
							{ '!=': [{ var: 'purchaseType' }, ''] }
						]
					}
				]
			}
		},

		// ── q11: Last Registry Duration ────────────────────────────────
		{
			id: 'q11_lastRegistryDuration',
			bindsTo_template: 'lastRegistryDuration',
			contextKey: 'lastRegistryDuration',
			type: 'radio',
			radioClass: 'mt-8 md:mt-12',
			
			optionContainerClass: 'grid md:grid-cols-2 gap-3',
			uiGroup: 'loan_details',
			required: true,
			question: 'When was the registry done?',
			options: [
				{
					label: 'Within 6 months',
					value: 'underSixMonths',
					uiMeta: { icon: 'Circle' },
					icon: 'Calendar'
				},
				{
					label: 'Within a year',
					value: 'underOneYear',
					uiMeta: { icon: 'Circle' },
					icon: 'Calendar'
				},
				{
					label: 'Within 2 years',
					value: 'underTwoYears',
					uiMeta: { icon: 'Circle' },
					icon: 'Calendar'
				},
				{
					label: 'Before 2 years',
					value: 'moreThanTwoYears',
					uiMeta: { icon: 'Circle' },
					icon: 'Calendar'
				}
			],
			showWhen: {
				'==': [{ var: 'ifPropertyRegistered' }, 'Yes']
			}
		},

		// ── q12: Builder Demand Due ────────────────────────────────────
		{
			id: 'q12_isAnyBuilderDemand',
			bindsTo_template: 'isAnyBuilderDemand',
			contextKey: 'isAnyBuilderDemand',
			type: 'radio',
			radioClass: 'mt-8 md:mt-12',
			
			optionContainerClass: 'grid md:grid-cols-2 gap-3',
			uiGroup: 'loan_details',
			required: true,
			question: 'Is any demand from the builder due?',
			description:
				'<div class="info-title"><i data-lucide="alert-triangle" class="inline-block h-4 w-4 text-yellow-500"></i> Builder Demand Status</div><div class="info-box highlight dark:text-gray-400">For endorsement transfers, confirm if any builder demands (outstanding amounts, dues) are pending. These must be cleared before transfer.</div>',
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
			showWhen: {
				'!=': [{ var: 'purchaseType' }, 'direct_from_authority']
			}
		}
	];
}
