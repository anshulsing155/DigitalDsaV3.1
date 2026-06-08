/**
 * Legal, Title & Occupation Questions
 * Page: propertyLegal_LAP
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
	question: 'Is this property inherited? If so, is the succession properly documented?',
	description:
		"<div class='info-title'><span class='info-icon blue'>🏠</span> Succession Status</div><div class='info-box highlight'>For inherited properties, lenders require succession certificate, legal heir certificate, probate of will, or partition deed — depending on how the property was inherited.</div>",
	options: [
		{
			label: 'Not inherited — purchased directly',
			value: 'NOT_INHERITED',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'FileText'
		},
		{
			label: 'Inherited — succession documents complete',
			value: 'SUCCESSION_COMPLETE',
			helperText: 'Succession certificate, will probate, or mutation done',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'CheckCircle2'
		},
		{
			label: 'Inherited — succession not yet complete',
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
		"<div class='info-title'><span class='info-icon blue'>📚</span> Original Documents</div><div class='info-box highlight'>Lender holds original documents as mortgage security. Without originals, no lender can process LAP.</div>",
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
	id: 'q4b_titleDocsMissingReason_lap',
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
		"<div class='info-title'><span class='info-icon gold'>🏦</span> Existing Mortgage</div><div class='info-box highlight'>If property already has a loan, this becomes a Balance Transfer case.</div>",
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
	showWhen: {
		'!=': [
			{
				var: 'ownershipChainComplete'
			},
			''
		]
	}
};

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
				var: 'noLegalDispute'
			},
			''
		]
	}
};

// q8_typeOfOccupationProperty — REMOVED: now captured earlier via
// applicantResidingInProperty (Yes→self-occupied) + propertyOccupancyStatus (No→rented/vacant/etc.)
// on the propertyIdentificationPage. Rental questions now trigger from propertyOccupancyStatus.

export const q9_rentalIncome: RawSchemaQuestion = {
	id: 'q9_rentalIncome',
	bindsTo_template: 'rentalIncome',
	contextKey: 'rentalIncome',
	type: 'currency',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Monthly rent amount'
	},
	required: true,
	minLimit: 0,
	maxLimit: 10000000,
	question: 'Monthly rental income from this property',
	showWhen: {
		in: [{ var: 'propertyOccupancyStatus' }, ['rented_out', 'mixed']]
	}
};

export const q10_rentalAgreementType: RawSchemaQuestion = {
	id: 'q10_rentalAgreementType',
	bindsTo_template: 'rentalAgreementType',
	contextKey: 'rentalAgreementType',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	required: false,
	question: 'What type of rental agreement is in place?',
	description:
		"<div class='info-title'><span class='info-icon blue'>📝</span> Rental Agreement</div><div class='info-box highlight'>Registered lease agreements are accepted as bankable income. Unregistered agreements may not be counted.</div>",
	options: [
		{
			label: 'Registered lease agreement',
			value: 'REGISTERED',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'FileCheck'
		},
		{
			label: 'Unregistered agreement',
			value: 'UNREGISTERED',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'FileText'
		},
		{
			label: 'No written agreement',
			value: 'NONE',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'File'
		}
	],
	showWhen: {
		in: [{ var: 'propertyOccupancyStatus' }, ['rented_out', 'mixed']]
	},
	warning: {
		condition: [
			{
				case: {
					in: [
						{
							var: 'rentalAgreementType'
						},
						['UNREGISTERED', 'NONE']
					]
				},
				then: 'Without a registered lease, most lenders will not count rental income towards repayment capacity.'
			}
		]
	}
};

/** Returns all questions for the Legal, Title & Occupation page */
export function getPropertyLegalLapQuestions(): RawSchemaQuestion[] {
	return [
		q1_propertyAcquisitionMethod,
		q6_successionStatus,
		q3_originalDocumentsAvailable,
		q4_ownershipChainComplete,
		q4b_titleDocsMissingReason,
		q5_existingEncumbrance,
		q6_noLegalDispute,
		q7_encumbranceCertificateVerified,
		// q8 removed — occupation now captured on propertyIdentificationPage
		q9_rentalIncome,
		q10_rentalAgreementType
	];
}
