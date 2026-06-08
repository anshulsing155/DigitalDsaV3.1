/**
 * Legal, Title & Registration Questions
 * Page: propertyLegal_Plot
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';

export const q1_propertyAcquisitionMethod: RawSchemaQuestion = {
	id: 'q1_propertyAcquisitionMethod',
	bindsTo_template: 'propertyAcquisitionMethod',
	contextKey: 'propertyAcquisitionMethod',
	type: 'radio',
	radioClass: 'mt-[1rem] md:mt-[2rem]',
	
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'How did the current owner(s) acquire this property?',
	description:
		"<div class='info-title'><span class='info-icon gold'>📜</span> Acquisition Method</div><div class='info-box highlight'>GPA (Power of Attorney) transfers are rejected by most lenders after the Supreme Court ruling. Inherited properties need succession documents.</div>",
	options: [
		{
			label: 'Self-purchased (registered sale deed)',
			value: 'self_purchased',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'FileText'
		},
		{
			label: 'Inherited / Succession',
			value: 'inherited',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Users'
		},
		{
			label: 'Gift deed',
			value: 'gift_deed',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Gift'
		},
		{
			label: 'Partition deed',
			value: 'partition',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Split'
		},
		{
			label: 'Power of Attorney (GPA) transfer',
			value: 'gpa_transfer',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'AlertTriangle'
		}
	],
	warning: {
		condition: [
			{
				case: {
					'==': [
						{
							var: 'propertyAcquisitionMethod'
						},
						'gpa_transfer'
					]
				},
				then: 'GPA transfers are not legally valid sales (Supreme Court ruling). Most lenders will reject. Only specialized HFCs may consider at very high rates.'
			},
			{
				case: {
					'==': [
						{
							var: 'propertyAcquisitionMethod'
						},
						'inherited'
					]
				},
				then: 'Inherited properties need succession certificate / legal heir certificate / probate. All legal heirs must be co-applicants or provide NOC.'
			}
		]
	}
};

export const q6_successionStatus: RawSchemaQuestion = {
	id: 'q6_successionStatus',
	bindsTo_template: 'successionStatus',
	contextKey: 'successionStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'Is the succession / inheritance properly documented?',
	description:
		"<div class='info-title'><span class='info-icon blue'>🏠</span> Succession Status</div><div class='info-box highlight'>For inherited properties, lenders require succession certificate, legal heir certificate, probate of will, or partition deed — depending on how the property was inherited.</div>",
	options: [
		{
			label: 'Succession documents complete',
			value: 'SUCCESSION_COMPLETE',
			helperText: 'Succession certificate, will probate, or mutation done',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'CheckCircle2'
		},
		{
			label: 'Succession not yet complete',
			value: 'SUCCESSION_PENDING',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Clock'
		},
		{
			label: 'Not sure',
			value: 'UNKNOWN',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'HelpCircle'
		}
	],
	showWhen: {
		'==': [
			{
				var: 'propertyAcquisitionMethod'
			},
			'inherited'
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [
						{
							var: 'successionStatus'
						},
						'SUCCESSION_PENDING'
					]
				},
				then: 'Incomplete succession documentation will delay or prevent loan processing. Succession certificate or mutation must be completed first.'
			}
		]
	}
};

export const q3_originalDocumentsAvailable: RawSchemaQuestion = {
	id: 'q3_originalDocumentsAvailable',
	bindsTo_template: 'originalDocumentsAvailable',
	contextKey: 'originalDocumentsAvailable',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'Are the original property documents available?',
	description:
		"<div class='info-box highlight'>Lender holds original property documents as mortgage security. For plot loans, key originals include: sale deed/allotment letter, NA order (if converted), revenue records, encumbrance certificate, and approved layout plan.</div>",
	options: [
		{
			label: 'Yes, all originals available',
			value: 'Yes',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'CheckCircle2'
		},
		{
			label: 'No, originals not available',
			value: 'No',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'XCircle'
		}
	],
	showWhen: {
		'!=': [
			{
				var: 'propertyAcquisitionMethod'
			},
			''
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [
						{
							var: 'originalDocumentsAvailable'
						},
						'No'
					]
				},
				then: 'Original property documents are mandatory for mortgage creation. Without originals, no lender can process LAP.'
			}
		]
	}
};

// Session 32: Updated with clearer options matching home loan pattern
export const q4_ownershipChainComplete: RawSchemaQuestion = {
	id: 'q4_ownershipChainComplete',
	bindsTo_template: 'ownershipChainComplete',
	contextKey: 'ownershipChainComplete',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'Is the ownership chain (title chain) complete and traceable?',
	description:
		"<div class='info-title'><span class='info-icon blue'>\ud83d\udd17</span> Title Chain</div><div class='info-box highlight'>Lenders need an unbroken chain of ownership from original allotment/sale to current owner.</div>",
	options: [
		{
			label: 'Clear \u2014 complete and unbroken chain',
			value: 'CLEAR',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'Current docs available, previous chain missing',
			value: 'CURRENT_OK_PREV_MISSING',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertCircle'
		},
		{
			label: 'Current docs missing',
			value: 'CURRENT_MISSING',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
		},
		{
			label: 'Not sure / not yet verified',
			value: 'UNKNOWN',
			uiMeta: { icon: 'Circle' },
			icon: 'HelpCircle'
		}
	],
	showWhen: {
		'!=': [{ var: 'originalDocumentsAvailable' }, '']
	},
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'ownershipChainComplete' }, 'CURRENT_OK_PREV_MISSING'] },
				then: 'Missing previous ownership chain reduces lender options. Some NBFCs may still process with additional legal verification.'
			}
		]
	}
};

// Session 32: Follow-up for current docs missing
export const q4b_titleDocsMissingReason: RawSchemaQuestion = {
	id: 'q4b_titleDocsMissingReason_plot',
	bindsTo_template: 'titleDocsMissingReason',
	contextKey: 'titleDocsMissingReason',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'How were the current ownership documents lost?',
	description:
		"<div class='info-title'><span class='info-icon red'>\u26a0\ufe0f</span> Missing Ownership Documents</div><div class='info-box highlight'>Original ownership documents are critical for any secured loan. The reason they are missing determines whether a lender can proceed.</div>",
	options: [
		{
			label: 'Misplaced by previous lender',
			value: 'LOST_BY_LENDER',
			helperText: 'Original held by a bank/NBFC during a previous loan and not returned properly',
			uiMeta: { icon: 'Circle' },
			icon: 'Building2'
		},
		{
			label: 'Lost / never obtained by owner',
			value: 'LOST_BY_OWNER',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
		}
	],
	showWhen: {
		'==': [{ var: 'ownershipChainComplete' }, 'CURRENT_MISSING']
	},
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'titleDocsMissingReason' }, 'LOST_BY_OWNER'] },
				then: 'No lender can process a secured loan without original ownership documents. A duplicate from the registrar does not replace the original \u2014 the property may already be privately mortgaged, which won\u2019t appear in official records. Only option: purchase with own funds, then apply for LAP later.'
			},
			{
				case: { '==': [{ var: 'titleDocsMissingReason' }, 'LOST_BY_LENDER'] },
				then: 'If the previous lender lost the documents, they are legally liable to provide a certified copy and indemnity bond. Some lenders can still process with this documentation.'
			}
		]
	}
};

export const q5_existingEncumbrance: RawSchemaQuestion = {
	id: 'q5_existingEncumbrance',
	bindsTo_template: 'existingEncumbrance',
	contextKey: 'existingEncumbrance',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'Is there any existing loan / mortgage on this property?',
	description:
		"<div class='info-title'><span class='info-icon gold'>🏦</span> Existing Mortgage</div><div class='info-box highlight'>If the seller has a loan on this plot, the buyer's bank needs to handle foreclosure. This affects disbursement planning.</div>",
	options: [
		{
			label: 'No — property is free from any loan',
			value: 'No',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'CheckCircle2'
		},
		{
			label: 'Yes — existing mortgage on this property',
			value: 'Yes',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'AlertTriangle'
		}
	],
	// Only relevant for resale — direct from authority/developer has no prior owner loan
	showWhen: {
		and: [
			{ '!=': [{ var: 'ownershipChainComplete' }, ''] },
			{ '==': [{ var: 'purchaseType' }, 'resale'] }
		]
	}
};

/** @deprecated Removed — legal disputes are verified by lender's legal team, not DSA intake. Kept for backward compat. */
export const q6_noLegalDispute: RawSchemaQuestion = {
	id: 'q6_noLegalDispute',
	bindsTo_template: 'noLegalDispute',
	contextKey: 'noLegalDispute',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'Is the property free from any legal disputes or litigation?',
	options: [
		{
			label: 'Yes — no disputes',
			value: 'Yes',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'CheckCircle2'
		},
		{
			label: 'No — dispute exists',
			value: 'No',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'XCircle'
		}
	],
	showWhen: {
		'!=': [
			{
				var: 'existingEncumbrance'
			},
			''
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [
						{
							var: 'noLegalDispute'
						},
						'No'
					]
				},
				then: 'Properties under active litigation are rejected by ALL lenders. Dispute must be resolved first.'
			}
		]
	}
};

export const q7_encumbranceCertificateVerified: RawSchemaQuestion = {
	id: 'q7_encumbranceCertificateVerified',
	bindsTo_template: 'encumbranceCertificateVerified',
	contextKey: 'encumbranceCertificateVerified',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	required: false,
	question: 'Has an Encumbrance Certificate (EC) been obtained?',
	description:
		"<div class='info-title'><span class='info-icon blue'>📜</span> Encumbrance Certificate</div><div class='info-box highlight'>EC from sub-registrar shows 13-30 year transaction history. Clean EC confirms no hidden claims.</div>",
	options: [
		{
			label: 'Yes — clean EC',
			value: 'Yes',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'CheckCircle2'
		},
		{
			label: 'Not yet obtained',
			value: 'No',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Clock'
		}
	],
	showWhen: {
		'!=': [
			{
				var: 'existingEncumbrance'
			},
			''
		]
	}
};

export const q2_ifPropertyRegistered: RawSchemaQuestion = {
	id: 'q2_ifPropertyRegistered',
	bindsTo_template: 'ifPropertyRegistered',
	contextKey: 'ifPropertyRegistered',
	type: 'radio',
	labelClass: 'text-black',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	description:
		"<div class='info-title'><span class='info-icon red'>📝</span> Property Registration Status</div><div class='info-box warning'><span class='bold'>⚠️ Critical:</span> Registration status significantly impacts loan approval chances.</div><div class='info-divider'></div><div class='visual-diagram'><div class='diagram-row'><span class='diagram-label'><span class='tag green'>✅ Registered</span></span><span class='diagram-value'>Legally recorded with Sub-Registrar</span></div><div class='diagram-row'><span class='diagram-label'><span class='tag red'>❌ Unregistered</span></span><span class='diagram-value'>Only endorsement/builder transfer done</span></div></div><div class='info-box note'><span class='bold'>📌 Important:</span><ul class='info-list'><li>Unregistered properties have limited lender options</li><li>Legal requirements and disbursement procedures differ</li><li>We currently do not provide services for unregistered properties</li></ul></div><div class='info-box tip'><span class='bold'>💡 Recommendation:</span> Always verify registration with the local Sub-Registrar office before proceeding.</div>",
	question: {
		switch: [
			{
				case: {
					'==': [
						{
							var: 'loanType'
						},
						'Balance Transfer Only'
					]
				},
				then: 'Is the property registered in the name of the current owner(s)?'
			},
			{
				case: {
					'==': [
						{
							var: 'loanVariant'
						},
						'Construction Loan Only'
					]
				},
				then: 'Is the plot registered in the name of the property owner(s)?'
			},
			{
				case: {
					'==': [{ var: 'purchaseType' }, 'direct_from_authority']
				},
				then: 'Has the authority issued the allotment letter / lease deed for this plot?'
			},
			{
				case: {
					'==': [{ var: 'purchaseType' }, 'direct_from_developer']
				},
				then: 'Has the developer executed the agreement to sell for this plot?'
			}
		],
		default: 'Is the plot registered in the name of the seller(s)?'
	},
	options: [
		{
			label: 'Yes',
			value: 'Yes',
			flagKey: {
				isIfPropertyRegistered: true
			},
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ThumbsUp'
		},
		{
			label: 'No',
			value: 'No',
			flagKey: {
				isIfPropertyRegistered: false
			},
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ThumbsDown'
		}
	],
	warning: {
		condition: [
			{
				case: {
					'==': [
						{
							var: 'ifPropertyRegistered'
						},
						'No'
					]
				},
				then: 'Unregistered properties may not be accepted by many lenders, so your loan application could be declined.'
			}
		]
	},
	showWhen: {
		'!=': [
			{
				var: 'encumbranceCertificateVerified'
			},
			''
		]
	}
};

/** Pre-question: Does the customer plan to construct on this plot? */
export const q9a_constructionIntent: RawSchemaQuestion = {
	id: 'q9a_constructionIntent',
	bindsTo_template: 'constructionIntent',
	contextKey: 'constructionIntent',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'hard-hat'
	},
	required: true,
	question: 'Are there any construction plans for this plot?',
	description:
		"<div class='info-box highlight'>Banks treat 'plot only' and 'plot + future construction' differently for tenure, interest rates, and disbursement structure. Knowing construction intent helps match the right lender.</div>",
	options: [
		{
			label: 'Yes, construction is planned',
			value: 'Yes',
			icon: 'CheckCircle2'
		},
		{
			label: 'No, buying plot only',
			value: 'No',
			icon: 'XCircle'
		},
		{
			label: 'Not decided yet',
			value: 'not_decided',
			icon: 'HelpCircle'
		}
	],
	showWhen: {
		in: [{ var: 'loanVariant' }, ['Plot Loan Only', 'Plot & Equity Loan']]
	}
};

export const q9_constructionTimeline: RawSchemaQuestion = {
	id: 'q9_constructionTimeline',
	bindsTo_template: 'constructionTimeline',
	contextKey: 'constructionTimeline',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'calendar-clock'
	},
	required: true,
	question: 'When do you plan to start construction on this plot?',
	description:
		"<div class='info-box highlight'>Most banks mandate construction to begin within 2-3 years of plot loan disbursement. Failure to begin construction may result in interest rate increase or loan recall. This is a key underwriting consideration.</div>",
	options: [
		{
			label: 'Within 1 year',
			value: 'within_1_year',
			icon: 'Zap'
		},
		{
			label: '1–3 years',
			value: '1_to_3_years',
			icon: 'Clock'
		},
		{
			label: '3–5 years',
			value: '3_to_5_years',
			icon: 'Timer'
		},
		{
			label: 'No immediate plans',
			value: 'no_plans',
			icon: 'Infinity'
		}
	],
	// Only show when construction is planned or not yet decided
	showWhen: {
		and: [
			{ in: [{ var: 'loanVariant' }, ['Plot Loan Only', 'Plot & Equity Loan']] },
			{ in: [{ var: 'constructionIntent' }, ['Yes', 'not_decided']] }
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [
						{
							var: 'constructionTimeline'
						},
						'no_plans'
					]
				},
				then: 'Most banks require construction to begin within 2-3 years of plot loan disbursement. Failure to begin may result in interest rate increase or loan recall. Some lenders may decline applications with no construction plans.'
			},
			{
				case: {
					'==': [
						{
							var: 'constructionTimeline'
						},
						'3_to_5_years'
					]
				},
				then: 'A 3-5 year timeline is at the outer edge of most bank policies. Some lenders may impose additional conditions or higher rates for delayed construction.'
			}
		]
	}
};

// ---------------------------------------------------------------------------
// Resale Seller Questions (R5.3) — only shown for resale purchases
// ---------------------------------------------------------------------------

/** Which lender holds the seller's existing loan? */
export const q5a_sellerLoanLender: RawSchemaQuestion = {
	id: 'q5a_sellerLoanLender',
	bindsTo_template: 'sellerLoanLender',
	contextKey: 'banksName',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: "Select seller's lender",
		icon: 'landmark'
	},
	required: true,
	question: "Which lender holds the seller's existing loan on this plot?",
	description:
		"<div class='info-box highlight'>The buyer's bank needs to know who holds the lien. The foreclosure process and disbursement plan depend on the seller's lender.</div>",
	showWhen: {
		and: [
			{ '==': [{ var: 'existingEncumbrance' }, 'Yes'] },
			{ '==': [{ var: 'purchaseType' }, 'resale'] }
		]
	}
};

/** What is the approximate foreclosure / payoff amount? */
export const q5b_sellerForeclosureAmount: RawSchemaQuestion = {
	id: 'q5b_sellerForeclosureAmount',
	bindsTo_template: 'sellerForeclosureAmount',
	contextKey: 'sellerForeclosureAmount',
	type: 'text',
	uiType: 'number',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'number_fields',
	uiMeta: {
		placeholder: 'Enter approximate amount',
		showNumberInWords: true,
		currencySymbol: '₹',
		maxLength: 10
	},
	required: true,
	minLimit: 1,
	maxLimit: 9999999999,
	question: 'What is the approximate foreclosure / payoff amount?',
	description:
		"<div class='info-box highlight'>The outstanding loan amount the seller needs to pay off before or during the sale. This amount will be deducted from the sale proceeds. Banks often pay the foreclosure amount directly to the seller's lender.</div>",
	showWhen: {
		and: [
			{ '==': [{ var: 'existingEncumbrance' }, 'Yes'] },
			{ '==': [{ var: 'purchaseType' }, 'resale'] }
		]
	}
};

/** Is the seller or any co-owner an NRI? */
export const q5c_sellerIsNRI: RawSchemaQuestion = {
	id: 'q5c_sellerIsNRI',
	bindsTo_template: 'sellerIsNRI',
	contextKey: 'sellerIsNRI',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'Is the seller or any co-owner an NRI?',
	description:
		"<div class='info-box highlight'>NRI sellers have special TDS requirements under Section 195 (20-30% TDS vs 1% for residents). The buyer's bank needs to handle this. Missing this causes last-minute transaction blocks.</div>",
	options: [
		{
			label: 'No — all sellers are Indian residents',
			value: 'No',
			icon: 'CheckCircle2'
		},
		{
			label: 'Yes — one or more sellers are NRIs',
			value: 'Yes',
			icon: 'Globe'
		}
	],
	// Shown for all resale purchases — NRI TDS impacts regardless of existing loan
	showWhen: {
		'==': [{ var: 'purchaseType' }, 'resale']
	},
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'sellerIsNRI' }, 'Yes'] },
				then: "NRI seller requires TDS at 20-30% (Section 195). Buyer must obtain TAN and file TDS return. Bank will adjust disbursement for TDS deduction. Get the NRI seller's PAN and tax residency certificate."
			}
		]
	}
};

/** Has the seller obtained NOC from their lender? */
export const q5d_sellerLenderNOC: RawSchemaQuestion = {
	id: 'q5d_sellerLenderNOC',
	bindsTo_template: 'sellerLenderNOC',
	contextKey: 'sellerLenderNOC',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'Has the seller obtained a No-Objection Certificate (NOC) from their lender?',
	description:
		"<div class='info-box highlight'>Without NOC, the sale cannot proceed as the lien on the property must be released. The buyer's bank will coordinate with the seller's lender for direct payoff.</div>",
	options: [
		{
			label: 'Yes — NOC obtained',
			value: 'Yes',
			icon: 'CheckCircle2'
		},
		{
			label: 'No — NOC not yet obtained',
			value: 'No',
			icon: 'XCircle'
		},
		{
			label: 'Not yet — in process',
			value: 'not_yet',
			icon: 'Clock'
		}
	],
	showWhen: {
		and: [
			{ '==': [{ var: 'existingEncumbrance' }, 'Yes'] },
			{ '==': [{ var: 'purchaseType' }, 'resale'] }
		]
	},
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'sellerLenderNOC' }, 'No'] },
				then: "Without NOC, the lien cannot be released and the sale will be blocked. The buyer's bank may arrange direct foreclosure payment to the seller's lender. Get the seller to initiate NOC request immediately."
			}
		]
	}
};

/** Returns all questions for the Legal, Title & Registration page */
export function getPropertyLegalPlotQuestions(): RawSchemaQuestion[] {
	return [
		q1_propertyAcquisitionMethod,
		q6_successionStatus,
		q3_originalDocumentsAvailable,
		q4_ownershipChainComplete,
		q4b_titleDocsMissingReason,
		q5_existingEncumbrance,
		// Resale seller questions — shown when seller has existing loan or is NRI
		q5a_sellerLoanLender,
		q5b_sellerForeclosureAmount,
		q5c_sellerIsNRI,
		q5d_sellerLenderNOC,
		q7_encumbranceCertificateVerified,
		q2_ifPropertyRegistered,
		q9a_constructionIntent,
		q9_constructionTimeline
	];
}
