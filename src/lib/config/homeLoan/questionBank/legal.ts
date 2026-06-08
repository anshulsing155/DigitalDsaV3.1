/**
 * Legal Verification questions for home loan (page: legalVerification_homeLoan).
 *
 * 7 questions:
 *   q1a-q1e  documentationReadiness - 5 area-specific multi-select checklists (shared contextKey)
 *   q3       nocFromPreviousLender  - BT/Top-up only
 *   q4       titleChainStatus       - title chain verification
 *   q5       encumbranceCertStatus  - encumbrance certificate
 *   q6       successionStatus       - inherited property succession
 *   q7       revenueRecordMutation  - revenue record mutation
 *
 * Session 32: q1a-q1e converted from vague radio to multi-select with specific
 * area-appropriate document checklists. Value stored as array of document codes.
 */

import type { RawSchemaQuestion } from '../types.js';

// ---------------------------------------------------------------------------
// q1a - Documentation: Planned Authority
// ---------------------------------------------------------------------------

export const q1a_documentationReadiness_planned: RawSchemaQuestion = {
	id: 'q1a_documentationReadiness_planned',
	bindsTo_template: 'documentationReadiness',
	contextKey: 'documentationReadiness',
	type: 'multiple-select',
	multipleSelectClass: 'mt-[1rem] md:mt-[2rem]',
	uiGroup: 'loan_details',
	required: true,

	question: 'Which property documents are available?',
	description:
		"<div class='info-title'><i data-lucide='file-text' class='inline-block h-4 w-4'></i> Documentation — Planned Area</div><div class='info-box highlight dark:text-gray-400'>Select all documents the DSA/customer currently has. Lenders verify these before sanctioning.</div>",

	options: [
		{ label: 'Sale deed / conveyance deed', value: 'SALE_DEED' },
		{ label: 'OC (Occupancy Certificate)', value: 'OC' },
		{ label: 'CC (Completion Certificate)', value: 'CC' },
		{ label: 'Allotment letter', value: 'ALLOTMENT_LETTER' },
		{ label: 'Builder-buyer agreement', value: 'BUILDER_AGREEMENT' },
		{ label: 'Society share certificate / NOC', value: 'SOCIETY_CERT' },
		{ label: 'Property tax receipts', value: 'TAX_RECEIPTS' },
		{ label: 'Encumbrance certificate', value: 'EC' },
		{ label: 'Approved building plan', value: 'BUILDING_PLAN' },
		{ label: 'None collected yet', value: 'NONE', exclusive: true }
	],

	showWhen: {
		'==': [{ var: 'propertyAreaType' }, 'PLANNED_AUTHORITY']
	}
};

// ---------------------------------------------------------------------------
// q1b - Documentation: Converted Residential
// ---------------------------------------------------------------------------

export const q1b_documentationReadiness_converted: RawSchemaQuestion = {
	id: 'q1b_documentationReadiness_converted',
	bindsTo_template: 'documentationReadiness',
	contextKey: 'documentationReadiness',
	type: 'multiple-select',
	multipleSelectClass: 'mt-[1rem] md:mt-[2rem]',
	uiGroup: 'loan_details',
	required: true,

	question: 'Which property documents are available?',
	description:
		"<div class='info-title'><i data-lucide='file-text' class='inline-block h-4 w-4'></i> Documentation — Converted Land</div><div class='info-box highlight dark:text-gray-400'>Select all documents currently in hand. NA order and zone certificate are critical for converted land.</div>",

	options: [
		{ label: 'Sale deed / conveyance deed', value: 'SALE_DEED' },
		{
			label: 'NA conversion order',
			value: 'NA_ORDER',
			// Only show when NA is fully compliant — can't have the order if pending/not applied
			showWhen: { '==': [{ var: 'propertyComplianceStatus' }, 'fully_compliant'] }
		},
		{
			label: 'Zone certificate',
			value: 'ZONE_CERT',
			// Only show when NA is compliant or already residential — no zone cert without conversion
			showWhen: {
				in: [{ var: 'propertyComplianceStatus' }, ['fully_compliant', 'already_residential']]
			}
		},
		{ label: 'Revenue records (7/12, Khata, Patta)', value: 'REVENUE_RECORDS' },
		{ label: 'Building plan approval', value: 'BUILDING_PLAN' },
		{ label: 'Property tax receipts', value: 'TAX_RECEIPTS' },
		{ label: 'Encumbrance certificate', value: 'EC' },
		{ label: 'None collected yet', value: 'NONE', exclusive: true }
	],

	showWhen: {
		'==': [{ var: 'propertyAreaType' }, 'CONVERTED_RESIDENTIAL']
	}
};

// ---------------------------------------------------------------------------
// q1c - Documentation: Old Municipal
// ---------------------------------------------------------------------------

export const q1c_documentationReadiness_municipal: RawSchemaQuestion = {
	id: 'q1c_documentationReadiness_municipal',
	bindsTo_template: 'documentationReadiness',
	contextKey: 'documentationReadiness',
	type: 'multiple-select',
	multipleSelectClass: 'mt-[1rem] md:mt-[2rem]',
	uiGroup: 'loan_details',
	required: true,

	question: 'Which property documents are available?',
	description:
		"<div class='info-title'><i data-lucide='file-text' class='inline-block h-4 w-4'></i> Documentation — Municipal Area</div><div class='info-box highlight dark:text-gray-400'>Select all documents currently in hand. Municipal tax receipts and building permission are key.</div>",

	options: [
		{ label: 'Sale deed / conveyance deed', value: 'SALE_DEED' },
		{ label: 'Municipal tax receipts', value: 'TAX_RECEIPTS' },
		{ label: 'Building permission / sanctioned plan', value: 'BUILDING_PLAN' },
		{ label: 'Property card (city survey)', value: 'PROPERTY_CARD' },
		{ label: 'Encumbrance certificate', value: 'EC' },
		{ label: 'Succession / inheritance documents', value: 'SUCCESSION_DOCS' },
		{ label: 'None collected yet', value: 'NONE', exclusive: true }
	],

	showWhen: {
		and: [
			{ '==': [{ var: 'propertyAreaType' }, 'OLD_MUNICIPAL'] },
			{ in: [{ var: 'constructionType' }, ['Flat', 'House']] }
		]
	}
};

// ---------------------------------------------------------------------------
// q1d - Documentation: Local Colony
// ---------------------------------------------------------------------------

export const q1d_documentationReadiness_colony: RawSchemaQuestion = {
	id: 'q1d_documentationReadiness_colony',
	bindsTo_template: 'documentationReadiness',
	contextKey: 'documentationReadiness',
	type: 'multiple-select',
	multipleSelectClass: 'mt-[1rem] md:mt-[2rem]',
	uiGroup: 'loan_details',
	required: true,

	question: 'Which property documents are available?',
	description:
		"<div class='info-title'><i data-lucide='file-text' class='inline-block h-4 w-4'></i> Documentation — Local Colony</div><div class='info-box highlight dark:text-gray-400'>Select all documents currently in hand. Revenue records and GP permission are critical for village/panchayat properties.</div>",

	options: [
		{ label: 'Sale deed / conveyance deed', value: 'SALE_DEED' },
		{ label: 'Revenue records (7/12, Khata, Patta)', value: 'REVENUE_RECORDS' },
		{ label: 'Gram panchayat permission', value: 'GP_PERMISSION' },
		{ label: 'Colony regularization certificate', value: 'REGULARIZATION_CERT' },
		{ label: 'Property tax receipts', value: 'TAX_RECEIPTS' },
		{ label: 'Encumbrance certificate', value: 'EC' },
		{ label: 'None collected yet', value: 'NONE', exclusive: true }
	],

	showWhen: {
		'==': [{ var: 'propertyAreaType' }, 'LOCAL_COLONY']
	}
};

// ---------------------------------------------------------------------------
// q1e - Documentation: Unknown / Not Set
// ---------------------------------------------------------------------------

export const q1e_documentationReadiness_unknown: RawSchemaQuestion = {
	id: 'q1e_documentationReadiness_unknown',
	bindsTo_template: 'documentationReadiness',
	contextKey: 'documentationReadiness',
	type: 'multiple-select',
	multipleSelectClass: 'mt-[1rem] md:mt-[2rem]',
	uiGroup: 'loan_details',
	required: true,

	question: 'Which property documents are available?',
	description:
		"<div class='info-title'><i data-lucide='file-text' class='inline-block h-4 w-4'></i> Documentation Readiness</div><div class='info-box highlight dark:text-gray-400'>Select all documents currently in hand. This helps assess how quickly the loan file can be prepared.</div>",

	options: [
		{ label: 'Sale deed / conveyance deed', value: 'SALE_DEED' },
		{ label: 'Property tax receipts', value: 'TAX_RECEIPTS' },
		{ label: 'Approved building plan', value: 'BUILDING_PLAN' },
		{ label: 'Encumbrance certificate', value: 'EC' },
		{ label: 'Revenue records', value: 'REVENUE_RECORDS' },
		{ label: 'None collected yet', value: 'NONE', exclusive: true }
	],

	showWhen: {
		or: [
			{ '==': [{ var: 'propertyAreaType' }, 'UNKNOWN'] },
			{ '==': [{ var: 'propertyAreaType' }, ''] }
		]
	}
};

// ---------------------------------------------------------------------------
// q3 - NOC from Previous Lender (BT/Top-up only)
// ---------------------------------------------------------------------------

export const q3_nocFromPreviousLender: RawSchemaQuestion = {
	id: 'q3_nocFromPreviousLender',
	bindsTo_template: 'nocFromPreviousLender',
	contextKey: 'nocFromPreviousLender',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,

	question: 'Has the NOC from the previous lender been received?',
	description:
		"<div class='info-box highlight dark:text-gray-400'>Required if property has an existing loan — confirms previous lender will clear the lien.</div>",

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
		},
		{
			label: 'Not applicable',
			value: 'N/A',
			uiMeta: { icon: 'Circle' },
			icon: 'HelpCircle'
		}
	],

	showWhen: {
		and: [
			{ '!=': [{ var: 'documentationReadiness' }, ''] },
			{
				in: [
					{ var: 'loanType' },
					['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
				]
			}
		]
	}
};

// ---------------------------------------------------------------------------
// q4 - Title Chain Status
// ---------------------------------------------------------------------------

export const q4_titleChainStatus: RawSchemaQuestion = {
	id: 'q4_titleChainStatus',
	bindsTo_template: 'titleChainStatus',
	contextKey: 'titleChainStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,

	question: 'Is the ownership chain (title chain) clear and complete?',
	description:
		"<div class='info-title'><i data-lucide='link' class='inline-block h-4 w-4'></i> Title Chain Verification</div><div class='info-box highlight dark:text-gray-400'>Lenders verify the ownership chain for at least 13–30 years. Each transfer must be properly documented with registered sale deeds. Gaps in the chain can cause loan rejection.</div>",

	options: [
		{
			label: 'Clear — complete and unbroken chain',
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
		and: [
			{ '!=': [{ var: 'documentationReadiness' }, ''] },
			{
				in: [
					{ var: 'propertyAreaType' },
					['CONVERTED_RESIDENTIAL', 'OLD_MUNICIPAL', 'LOCAL_COLONY', 'UNKNOWN']
				]
			}
		]
	},

	warning: {
		condition: [
			{
				case: { '==': [{ var: 'titleChainStatus' }, 'CURRENT_OK_PREV_MISSING'] },
				then: 'Missing previous ownership chain reduces lender options. Some NBFCs may still process with additional legal verification.'
			}
		]
	}
};

// ---------------------------------------------------------------------------
// q4b - Title Chain Follow-up: How were current docs lost?
// Session 32: Shown only when titleChainStatus = CURRENT_MISSING.
// If lost by owner → hard blocker (no lender can process).
// ---------------------------------------------------------------------------

export const q4b_titleDocsMissingReason: RawSchemaQuestion = {
	id: 'q4b_titleDocsMissingReason',
	bindsTo_template: 'titleDocsMissingReason',
	contextKey: 'titleDocsMissingReason',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid gap-3',
	uiGroup: 'loan_details',
	required: true,

	question: 'How were the current ownership documents lost?',
	description:
		"<div class='info-title'><i data-lucide='triangle-alert' class='inline-block h-4 w-4 text-yellow-500'></i> Missing Ownership Documents</div><div class='info-box highlight dark:text-gray-400'>Original ownership documents are critical for any secured loan. The reason they are missing determines whether a lender can proceed.</div>",

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
		'==': [{ var: 'titleChainStatus' }, 'CURRENT_MISSING']
	},

	warning: {
		condition: [
			{
				case: { '==': [{ var: 'titleDocsMissingReason' }, 'LOST_BY_OWNER'] },
				then: 'No lender can process a secured loan without original ownership documents. A duplicate from the registrar does not replace the original — the property may already be privately mortgaged, which won’t appear in official records. Only option: purchase with own funds, then apply for LAP later.'
			},
			{
				case: { '==': [{ var: 'titleDocsMissingReason' }, 'LOST_BY_LENDER'] },
				then: 'If the previous lender lost the documents, they are legally liable to provide a certified copy and indemnity bond. Some lenders can still process with this documentation.'
			}
		]
	}
};

// ---------------------------------------------------------------------------
// q5 - Encumbrance Certificate Status
// ---------------------------------------------------------------------------

export const q5_encumbranceCertStatus: RawSchemaQuestion = {
	id: 'q5_encumbranceCertStatus',
	bindsTo_template: 'encumbranceCertStatus',
	contextKey: 'encumbranceCertStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,

	question: 'Has the Encumbrance Certificate (EC) been obtained and verified?',
	description:
		"<div class='info-title'><i data-lucide='search' class='inline-block h-4 w-4'></i> Encumbrance Certificate</div><div class='info-box highlight dark:text-gray-400'>The EC from the Sub-Registrar’s office proves the property is free from mortgages, liens, and legal claims. Banks typically require 13–30 years of EC.</div>",

	options: [
		{
			label: 'EC obtained — no encumbrances found',
			value: 'CLEAR',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'Existing liens or mortgages on property',
			value: 'ENCUMBERED',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
		},
		{
			label: 'EC not yet obtained',
			value: 'NOT_OBTAINED',
			uiMeta: { icon: 'Circle' },
			icon: 'Clock'
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
			{ '!=': [{ var: 'titleChainStatus' }, ''] },
			// Hide when case is dead (docs lost by owner — no lender can proceed)
			{ '!=': [{ var: 'titleDocsMissingReason' }, 'LOST_BY_OWNER'] }
		]
	},

	warning: {
		condition: [
			{
				case: { '==': [{ var: 'encumbranceCertStatus' }, 'ENCUMBERED'] },
				then: 'Existing encumbrances must be cleared before a new loan can be sanctioned. For BT cases, the existing lien will be cleared as part of the balance transfer.'
			}
		]
	}
};

// ---------------------------------------------------------------------------
// q6 - Succession Status (inherited properties, resale only)
// ---------------------------------------------------------------------------

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
		"<div class='info-title'><i data-lucide='chart-no-axes-combined' class='inline-block h-4 w-4'></i> Succession Status</div><div class='info-box highlight dark:text-gray-400'>For inherited properties, lenders require succession certificate, legal heir certificate, probate of will, or partition deed — depending on how the property was inherited.</div>",

	options: [
		{
			label: 'Not inherited — purchased directly',
			value: 'NOT_INHERITED',
			uiMeta: { icon: 'Circle' },
			icon: 'FileText'
		},
		{
			label: 'Inherited — succession documents complete',
			value: 'SUCCESSION_COMPLETE',
			helperText: 'Succession certificate, will probate, or mutation done',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'Inherited — succession not yet complete',
			value: 'SUCCESSION_PENDING',
			uiMeta: { icon: 'Circle' },
			icon: 'Clock'
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
			{ '!=': [{ var: 'encumbranceCertStatus' }, ''] },
			// Hide when case is dead (docs lost by owner)
			{ '!=': [{ var: 'titleDocsMissingReason' }, 'LOST_BY_OWNER'] },
			{
				in: [{ var: 'purchaseType' }, ['resale_normal', 'resale_endorsement', 'Resale']]
			},
			{
				in: [
					{ var: 'propertyAreaType' },
					['CONVERTED_RESIDENTIAL', 'OLD_MUNICIPAL', 'LOCAL_COLONY', 'UNKNOWN']
				]
			}
		]
	},

	warning: {
		condition: [
			{
				case: { '==': [{ var: 'successionStatus' }, 'SUCCESSION_PENDING'] },
				then: 'Incomplete succession documentation will delay or prevent loan processing. Succession certificate or mutation must be completed first.'
			}
		]
	}
};

// ---------------------------------------------------------------------------
// q7 - Revenue Record Mutation
// ---------------------------------------------------------------------------

export const q7_revenueRecordMutation: RawSchemaQuestion = {
	id: 'q7_revenueRecordMutation',
	bindsTo_template: 'revenueRecordMutation',
	contextKey: 'revenueRecordMutation',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,

	question: 'Is the property mutation (name transfer in revenue records) up to date?',
	description:
		"<div class='info-title'><i data-lucide='notebook-pen' class='inline-block h-4 w-4'></i> Revenue Record Mutation</div><div class='info-box highlight dark:text-gray-400'>Mutation (Dakhil Kharij) reflects the current owner’s name in government revenue records. Lenders verify this to confirm the seller’s right to sell.</div>",

	options: [
		{
			label: 'Yes — mutation done, records reflect current owner',
			value: 'MUTATED',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'Mutation applied but pending',
			value: 'MUTATION_PENDING',
			uiMeta: { icon: 'Circle' },
			icon: 'Clock'
		},
		{
			label: 'Not mutated — records show previous owner',
			value: 'NOT_MUTATED',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
		},
		{
			label: 'Not applicable (new construction from builder)',
			value: 'NOT_REQUIRED',
			uiMeta: { icon: 'Circle' },
			icon: 'FileText'
		}
	],

	showWhen: {
		and: [
			{
				in: [
					{ var: 'propertyAreaType' },
					['CONVERTED_RESIDENTIAL', 'OLD_MUNICIPAL', 'LOCAL_COLONY', 'UNKNOWN']
				]
			},
			{ '!=': [{ var: 'encumbranceCertStatus' }, ''] },
			// Hide when case is dead (docs lost by owner)
			{ '!=': [{ var: 'titleDocsMissingReason' }, 'LOST_BY_OWNER'] },
			// Hide when NA not applied or still pending — land is still agricultural, mutation irrelevant
			{
				'!': {
					in: [{ var: 'propertyComplianceStatus' }, ['not_authorized', 'authorized_not_per_plan']]
				}
			}
		]
	},

	warning: {
		condition: [
			{
				case: { '==': [{ var: 'revenueRecordMutation' }, 'NOT_MUTATED'] },
				then: 'Revenue records not showing the current owner can delay or block loan processing. Mutation is typically required before disbursement.'
			}
		]
	}
};

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

/** All legal verification questions in page order */
export function getLegalQuestions(): RawSchemaQuestion[] {
	return [
		q1a_documentationReadiness_planned,
		q1b_documentationReadiness_converted,
		q1c_documentationReadiness_municipal,
		q1d_documentationReadiness_colony,
		q1e_documentationReadiness_unknown,
		q3_nocFromPreviousLender,
		q4_titleChainStatus,
		q4b_titleDocsMissingReason,
		q5_encumbranceCertStatus,
		q6_successionStatus,
		q7_revenueRecordMutation
	];
}
