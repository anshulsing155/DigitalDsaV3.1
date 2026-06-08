import type { RawSchemaQuestion } from '../types.js';

/**
 * Property Condition & Compliance questions for the `propertyCondition_homeLoan` page.
 *
 * 16 questions covering property compliance status (5 area-type variants),
 * OC/CC, building plan approval, authority possession, RERA, NA conversion,
 * zone classification, municipal tax, unauthorized additions, revenue records,
 * colony regularization, gram panchayat permission, construction progress,
 * expected completion, builder track record, and project approvals.
 *
 * Extracted verbatim from homeLoanSchemaV2.json -- every showWhen, warning,
 * validation, UI class, uiMeta, option, and description preserved exactly.
 */

// ── q1a: Property Compliance — Planned Authority ────────────────────────
export const q1a_propertyComplianceStatus_planned: RawSchemaQuestion = {
	id: 'q1a_propertyComplianceStatus_planned',
	bindsTo_template: 'propertyComplianceStatus',
	contextKey: 'propertyComplianceStatus',
	type: 'radio',
	radioClass: 'mt-[1rem] md:mt-[2rem]',
	labelClass: 'text-black',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question:
		'Is the property built as per the development authority’s sanctioned building plan?',
	description:
		"<div class='info-title'><i data-lucide='landmark' class='inline-block h-4 w-4'></i> Property Compliance — Planned Area</div><div class='info-box highlight dark:text-gray-400'>In planned/authority areas, lenders check whether construction follows the approved layout and sanctioned plan from DDA/MHADA/BDA/HUDA or similar authority.</div><div class='info-box tip dark:text-gray-400'><span class='bold'><i data-lucide='lightbulb' class='inline-block text-yellow-500 h-4 w-4'></i> Tip:</span> Not fully compliant does not mean rejection — some NBFCs fund deviated properties at different terms.</div>",
	options: [
		{
			label: 'Yes — fully as per approved plan',
			value: 'fully_compliant',
			uiMeta: { icon: 'Circle' },
			icon: 'ThumbsUp'
		},
		{
			label: 'Minor deviations from approved plan',
			value: 'authorized_not_per_plan',
			helperText: 'Small differences like balcony enclosure, staircase variation',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
		},
		{
			label: 'Major deviations or no approved plan',
			value: 'not_authorized',
			helperText:
				'Extra floor, significant FSI violation, or construction without any sanctioned plan',
			uiMeta: { icon: 'Circle' },
			icon: 'ThumbsDown'
		}
	],
	showWhen: {
		and: [
			{ '==': [{ var: 'propertyAreaType' }, 'PLANNED_AUTHORITY'] },
			{ in: [{ var: 'constructionType' }, ['Flat', 'House']] },
			{ '!=': [{ var: 'purchaseType' }, 'direct_from_authority'] }
		]
	},
	warning: {
		condition: [
			{
				case: {
					in: [{ var: 'propertyComplianceStatus' }, ['authorized_not_per_plan', 'not_authorized']]
				},
				then: 'Properties with deviations from approved plan have fewer lender options. Select NBFCs may still process at adjusted terms.'
			}
		]
	}
};

// ── q1b: Property Compliance — Converted Residential ────────────────────
// Session 32: Merged with q6_naConversionStatus — single question now captures
// NA conversion status including "Already in residential zone" option.
export const q1b_propertyComplianceStatus_converted: RawSchemaQuestion = {
	id: 'q1b_propertyComplianceStatus_converted',
	bindsTo_template: 'propertyComplianceStatus',
	contextKey: 'propertyComplianceStatus',
	type: 'radio',
	radioClass: 'mt-[1rem] md:mt-[2rem]',
	labelClass: 'text-black',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question:
		'Has the land been formally converted from agricultural to residential use (NA conversion)?',
	description:
		"<div class='info-title'><i data-lucide='landmark' class='inline-block h-4 w-4'></i> Property Compliance — Converted Land</div><div class='info-box highlight dark:text-gray-400'>Banks require confirmed NA (Non-Agricultural) conversion before financing any property on converted land. Without this, the property is treated as agricultural — which no bank will finance.</div>",
	options: [
		{
			label: 'Yes — NA order received and registered',
			value: 'fully_compliant',
			uiMeta: { icon: 'Circle' },
			icon: 'ThumbsUp'
		},
		{
			label: 'Application submitted, order pending',
			value: 'authorized_not_per_plan',
			uiMeta: { icon: 'Circle' },
			icon: 'Clock'
		},
		{
			label: 'Not yet applied',
			value: 'not_authorized',
			riskType: 'NON_NA_LAND',
			riskSignal: {
				severity: 'critical',
				message: 'No major bank will finance non-NA land. Only select NBFCs may consider.',
				category: 'property_risk'
			},
			uiMeta: { icon: 'Circle' },
			icon: 'Ban'
		},
		{
			label: 'Already in residential zone (no conversion needed)',
			value: 'already_residential',
			uiMeta: { icon: 'Circle' },
			icon: 'FileText'
		}
	],
	showWhen: {
		and: [
			{ '==': [{ var: 'propertyAreaType' }, 'CONVERTED_RESIDENTIAL'] },
			{ in: [{ var: 'constructionType' }, ['Flat', 'House']] }
		]
	},
	warning: {
		condition: [
			{
				case: {
					and: [
						{ '==': [{ var: 'propertyComplianceStatus' }, 'authorized_not_per_plan'] },
						{ '==': [{ var: 'PropertyStage' }, 'Ready To Move'] }
					]
				},
				then: 'Contradiction: You selected "Ready To Move" but NA conversion is still pending. A property cannot be RTM without completed NA conversion. Please verify PropertyStage.'
			},
			{
				case: {
					'==': [{ var: 'propertyComplianceStatus' }, 'authorized_not_per_plan']
				},
				then: 'NA conversion is still pending — loan processing will be on hold until conversion is complete. High-risk status for lenders.'
			},
			{
				case: {
					'==': [{ var: 'propertyComplianceStatus' }, 'not_authorized']
				},
				then: 'Without NA conversion, no lender can process this loan. The conversion process typically takes 2–6 months.'
			}
		]
	}
};

// ── q1c: Property Compliance — Old Municipal ────────────────────────────
export const q1c_propertyComplianceStatus_municipal: RawSchemaQuestion = {
	id: 'q1c_propertyComplianceStatus_municipal',
	bindsTo_template: 'propertyComplianceStatus',
	contextKey: 'propertyComplianceStatus',
	type: 'radio',
	radioClass: 'mt-[1rem] md:mt-[2rem]',
	labelClass: 'text-black',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'Is the property within municipal limits with valid municipal records?',
	description:
		"<div class='info-title'><i data-lucide='landmark' class='inline-block h-4 w-4'></i> Property Compliance — Municipal Area</div><div class='info-box highlight dark:text-gray-400'>For properties in old municipal/city areas, lenders verify municipal records, property tax, and building permission history.</div>",
	options: [
		{
			label: 'Yes — proper municipal records and building permission',
			value: 'fully_compliant',
			uiMeta: { icon: 'Circle' },
			icon: 'ThumbsUp'
		},
		{
			label: 'Municipal area but original plan has deviations',
			value: 'authorized_not_per_plan',
			helperText: 'Extra floor, balcony extension, unauthorized room addition',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
		},
		{
			label: 'No formal building permission or municipal records',
			value: 'not_authorized',
			uiMeta: { icon: 'Circle' },
			icon: 'ThumbsDown'
		}
	],
	showWhen: {
		and: [
			{ '==': [{ var: 'propertyAreaType' }, 'OLD_MUNICIPAL'] },
			{ in: [{ var: 'constructionType' }, ['Flat', 'House',"Floor"]] }
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'propertyComplianceStatus' }, 'authorized_not_per_plan']
				},
				then: 'Minor deviations in municipal areas are common. Some banks and most NBFCs can still process with adjusted valuation.'
			}
		]
	}
};

// ── q1d: Property Compliance — Local Colony ─────────────────────────────
export const q1d_propertyComplianceStatus_colony: RawSchemaQuestion = {
	id: 'q1d_propertyComplianceStatus_colony',
	bindsTo_template: 'propertyComplianceStatus',
	contextKey: 'propertyComplianceStatus',
	type: 'radio',
	radioClass: 'mt-[1rem] md:mt-[2rem]',
	labelClass: 'text-black',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'Is the colony officially recognised or regularized by the government?',
	description:
		"<div class='info-title'><i data-lucide='landmark' class='inline-block h-4 w-4'></i> Property Compliance — Local Colony</div><div class='info-box highlight dark:text-gray-400'>Properties in village/panchayat areas are evaluated based on whether the colony or layout has been officially recognized. Regularized colonies have more lender options.</div>",
	options: [
		{
			label: 'Yes — colony is regularized with proper records',
			value: 'fully_compliant',
			uiMeta: { icon: 'Circle' },
			icon: 'ThumbsUp'
		},
		{
			label: 'Regularization applied or partially approved',
			value: 'authorized_not_per_plan',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
		},
		{
			label: 'Not regularized / informal settlement',
			value: 'not_authorized',
			uiMeta: { icon: 'Circle' },
			icon: 'ThumbsDown'
		}
	],
	showWhen: {
		'==': [{ var: 'propertyAreaType' }, 'LOCAL_COLONY']
	},
	warning: {
		condition: [
			{
				// FG-2 #17: Non-authorized property requires a registered sale deed as minimum
				// legal standing — without it, no lender (even NBFC) can establish ownership chain.
				case: {
					'==': [{ var: 'propertyComplianceStatus' }, 'not_authorized']
				},
				then: 'Non-regularized colony properties are not accepted by banks. Specialized housing finance companies (Aavas, Grihashakti) may consider at higher interest rates and lower LTV. A registered sale deed is the absolute minimum requirement — without it, no lender can establish legal standing or ownership chain.'
			}
		]
	}
};

// ── q1e: Property Compliance — Unknown / Empty ──────────────────────────
export const q1e_propertyComplianceStatus_unknown: RawSchemaQuestion = {
	id: 'q1e_propertyComplianceStatus_unknown',
	bindsTo_template: 'propertyComplianceStatus',
	contextKey: 'propertyComplianceStatus',
	type: 'radio',
	radioClass: 'mt-[1rem] md:mt-[2rem]',
	labelClass: 'text-black',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'Is the property in a government-authorized area and built as per approved plan?',
	description:
		"<div class='info-title'><i data-lucide='landmark' class='inline-block h-4 w-4'></i>  Property Compliance Status</div><div class='info-box highlight dark:text-gray-400'>This determines which lenders (banks vs NBFCs) can process the application.</div><div class='info-box tip dark:text-gray-400'><span class='bold'><i data-lucide='lightbulb' class='inline-block h-4 w-4 text-yellow-500'></i> Tip:</span> Not fully compliant does not mean rejection — some NBFCs fund non-authorized or deviated properties at different terms.</div>",
	options: [
		{
			label: 'Yes — authorized area, as per approved plan',
			value: 'fully_compliant',
			uiMeta: { icon: 'Circle' },
			icon: 'ThumbsUp'
		},
		{
			label: 'Authorized area, but not as per plan',
			value: 'authorized_not_per_plan',
			helperText: 'Balcony enclosure, extra room, staircase change, or similar deviations',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
		},
		{
			label: 'Not in government-authorized area',
			value: 'not_authorized',
			helperText: 'Village land, non-regularized colony, or no government planning authority',
			uiMeta: { icon: 'Circle' },
			icon: 'ThumbsDown'
		}
	],
	showWhen: {
		or: [
			{ '==': [{ var: 'propertyAreaType' }, 'UNKNOWN'] },
			{ '==': [{ var: 'propertyAreaType' }, ''] }
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'propertyComplianceStatus' }, 'authorized_not_per_plan']
				},
				then: 'Properties that are not fully compliant may still be eligible for funding through select NBFCs. Fewer lenders will appear in the results, but options are available.'
			},
			{
				// FG-2 #17: Non-authorized property requires at minimum a registered sale deed
				// to establish any legal standing — without it, even NBFCs cannot proceed.
				case: {
					'==': [{ var: 'propertyComplianceStatus' }, 'not_authorized']
				},
				then: 'Non-authorized properties have very limited lender options (select NBFCs only). A registered sale deed is the absolute minimum requirement to establish legal standing — without it, no lender can verify ownership or create a mortgage.'
			}
		]
	}
};

// ── q2: OC/CC Available ─────────────────────────────────────────────────
export const q2_ocCcAvailable: RawSchemaQuestion = {
	id: 'q2_ocCcAvailable',
	bindsTo_template: 'ocCcAvailable',
	contextKey: 'ocCcAvailable',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question:
		'Has the building received its OC (Occupancy Certificate) / CC (Completion Certificate)?',
	description:
		"<div class='info-title'><i data-lucide='clipboard-list' class='inline-block h-4 w-4'></i> OC / CC Status</div><div class='info-box highlight dark:text-gray-400'>Most banks require OC/CC for processing. Without OC, lenders may consider the property legally incomplete.</div>",
	options: [
		{
			label: 'Yes, both OC and CC',
			value: 'BOTH',
			uiMeta: { icon: 'Circle' },
			icon: 'ClipboardList'
		},
		{
			label: 'Only CC available',
			value: 'CC_ONLY',
			uiMeta: { icon: 'Circle' },
			icon: 'FileText'
		},
		{
			label: 'Neither available',
			value: 'NONE',
			uiMeta: { icon: 'Circle' },
			icon: 'Ban'
		},
		{
			label: 'Not sure',
			value: 'UNKNOWN',
			uiMeta: { icon: 'Circle' },
			icon: 'HelpCircle'
		}
	],
	// Session 32: Removed redundant outer PropertyStage=RTM check that blocked BT+UC+Registry path
	showWhen: {
		and: [
			{ '!=': [{ var: 'propertyComplianceStatus' }, 'not_authorized'] },
			{
				or: [
					{ '!=': [{ var: 'propertyAreaType' }, 'CONVERTED_RESIDENTIAL'] },
					{ '==': [{ var: 'propertyComplianceStatus' }, 'fully_compliant'] }
				]
			},
			{ in: [{ var: 'constructionType' }, ['Flat', 'Floor']] },
			{
				or: [
					{ '==': [{ var: 'PropertyStage' }, 'Ready To Move'] },
					{
						and: [
							{
								in: [
									{ var: 'loanType' },
									['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
								]
							},
							{ '==': [{ var: 'isRegistryDone' }, 'Yes'] }
						]
					}
				]
			}
		]
	}
};

// ── q3: Municipal Approval (House) ──────────────────────────────────────
export const q3_municipalApproval: RawSchemaQuestion = {
	id: 'q3_municipalApproval',
	bindsTo_template: 'municipalApproval',
	contextKey: 'municipalApproval',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'Was the house built with a sanctioned building plan from the local authority?',
	description:
		"<div class='info-title'><i data-lucide='landmark' class='inline-block h-4 w-4'></i>  Building Plan Approval</div><div class='info-box highlight dark:text-gray-400'>For independent houses, lenders check whether construction followed a plan sanctioned by the local authority.</div>",
	options: [
		{
			label: 'Yes, with approved plan',
			value: 'APPROVED',
			uiMeta: { icon: 'Circle' },
			icon: 'ClipboardList'
		},
		{
			label: 'Partially approved / Deviations exist',
			value: 'PARTIAL',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
		},
		{
			label: 'No approved plan',
			value: 'NO_PLAN',
			uiMeta: { icon: 'Circle' },
			icon: 'Ban'
		},
		{
			label: 'Not sure',
			value: 'UNKNOWN',
			uiMeta: { icon: 'Circle' },
			icon: 'HelpCircle'
		}
	],
	// Session 32: Removed redundant outer PropertyStage=RTM check
	showWhen: {
		and: [
			{ '!=': [{ var: 'propertyComplianceStatus' }, 'not_authorized'] },
			{
				or: [
					{ '!=': [{ var: 'propertyAreaType' }, 'CONVERTED_RESIDENTIAL'] },
					{ '==': [{ var: 'propertyComplianceStatus' }, 'fully_compliant'] }
				]
			},
			{ '==': [{ var: 'constructionType' }, 'House'] },
			{
				or: [
					{ '==': [{ var: 'PropertyStage' }, 'Ready To Move'] },
					{
						and: [
							{
								in: [
									{ var: 'loanType' },
									['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
								]
							},
							{ '==': [{ var: 'isRegistryDone' }, 'Yes'] }
						]
					}
				]
			}
		]
	}
};

// ── q4: Authority Possession (OC/CC issued) ─────────────────────────────
export const q4_isPossessionOfferedByAuthority: RawSchemaQuestion = {
	id: 'q4_isPossessionOfferedByAuthority',
	bindsTo_template: 'isPossessionOfferedByAuthority',
	contextKey: 'isPossessionOfferedByAuthority',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'Has the authority granted possession (OC/CC issued)?',
	description:
		"<div class='info-title'><i data-lucide='clipboard-list' class='inline-block h-4 w-4'></i> Authority Possession Status</div><div class='info-box highlight dark:text-gray-400'>This refers to official government certification — not possession offered directly by the builder.</div>",
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
	// Session 32: Flattened redundant nested AND
	showWhen: {
		and: [
			{ '!=': [{ var: 'propertyComplianceStatus' }, 'not_authorized'] },
			{
				or: [
					{ '!=': [{ var: 'propertyAreaType' }, 'CONVERTED_RESIDENTIAL'] },
					{ '==': [{ var: 'propertyComplianceStatus' }, 'fully_compliant'] }
				]
			},
			{ '==': [{ var: 'loanType' }, 'New Loan'] },
			{
				in: [{ var: 'purchaseType' }, ['direct_from_builder', 'direct_from_authority']]
			},
			{ '==': [{ var: 'PropertyStage' }, 'Ready To Move'] }
		]
	}
};

// ── q5: RERA Registration Status ────────────────────────────────────────
export const q5_reraRegistrationStatus: RawSchemaQuestion = {
	id: 'q5_reraRegistrationStatus',
	bindsTo_template: 'reraRegistrationStatus',
	contextKey: 'reraRegistrationStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'Is the project registered under RERA?',
	description:
		"<div class='info-title'><i data-lucide='landmark' class='inline-block h-4 w-4'></i> RERA Registration</div><div class='info-box highlight dark:text-gray-400'>RERA registration is mandatory for projects over 500 sq.m. Banks verify RERA number before sanctioning loans for under-construction properties.</div>",
	options: [
		{
			label: 'Yes — RERA registered',
			value: 'REGISTERED',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'No — not registered',
			value: 'NOT_REGISTERED',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
		},
		{
			label: 'Exempted (less than 500 sq.m. / 8 units)',
			value: 'EXEMPTED',
			uiMeta: { icon: 'Circle' },
			icon: 'FileText'
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
			{ '==': [{ var: 'propertyAreaType' }, 'PLANNED_AUTHORITY'] },
			{
				in: [
					{ var: 'loanType' },
					['New Loan', 'Balance Transfer Only', 'Balance Transfer With Top-up']
				]
			}
		]
	},
	warning: {
		condition: [
			{
				case: {
					and: [
						{ '==': [{ var: 'reraRegistrationStatus' }, 'NOT_REGISTERED'] },
						{ '==': [{ var: 'PropertyStage' }, 'Under Construction'] }
					]
				},
				then: 'Banks will not finance under-construction projects without RERA registration. Verify with the builder.'
			}
		]
	}
};

// ── q6: NA Conversion Status — REMOVED (Session 32) ─────────────────────
// Merged into q1b_propertyComplianceStatus_converted above.
// The naConversionStatus bindsTo key is no longer used; propertyComplianceStatus
// now captures the same information with 'already_residential' value.

// ── q7: Zone Classification ─────────────────────────────────────────────
export const q7_zoneClassification: RawSchemaQuestion = {
	id: 'q7_zoneClassification',
	bindsTo_template: 'zoneClassification',
	contextKey: 'zoneClassification',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'What is the zone classification of this land?',
	description:
		"<div class='info-title'><i data-lucide='map' class='inline-block h-4 w-4'></i> Zone Classification</div><div class='info-box highlight dark:text-gray-400'>Zone classification determines permissible construction type. Lenders prefer residential or mixed-use zones.</div>",
	options: [
		{
			label: 'Residential zone',
			value: 'RESIDENTIAL',
			uiMeta: { icon: 'Circle' },
			icon: 'Home'
		},
		{
			label: 'Commercial zone',
			value: 'COMMERCIAL',
			uiMeta: { icon: 'Circle' },
			icon: 'Building2'
		},
		{
			label: 'Mixed use (residential + commercial)',
			value: 'MIXED_USE',
			uiMeta: { icon: 'Circle' },
			icon: 'Layers'
		}
	],
	showWhen: {
		and: [
			{ '==': [{ var: 'propertyAreaType' }, 'CONVERTED_RESIDENTIAL'] },
			// Hide when "Already in residential zone" — zone is implicitly RESIDENTIAL
			{ '!=': [{ var: 'propertyComplianceStatus' }, 'already_residential'] },
			{
				in: [
					{ var: 'loanType' },
					['New Loan', 'Balance Transfer Only', 'Balance Transfer With Top-up']
				]
			}
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'zoneClassification' }, 'COMMERCIAL']
				},
				then: 'Commercial-zoned property: Some lenders may restrict residential loans on commercial-zoned land. Verify lender policy.'
			}
		]
	}
};

// ── q8: Municipal Tax Status ────────────────────────────────────────────
export const q8_municipalTaxStatus: RawSchemaQuestion = {
	id: 'q8_municipalTaxStatus',
	bindsTo_template: 'municipalTaxStatus',
	contextKey: 'municipalTaxStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'Is the municipal/property tax being paid regularly?',
	description:
		"<div class='info-title'><i data-lucide='piggy-bank' class='inline-block h-4 w-4 text-yellow-500'></i> Municipal Tax Status</div><div class='info-box highlight dark:text-gray-400'>Regular tax payment history proves the property is recognized by the municipal body — an important signal for lenders.</div>",
	options: [
		{
			label: 'Yes — paid regularly and up to date',
			value: 'PAID_REGULAR',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'Paid but with gaps or arrears',
			value: 'PAID_IRREGULAR',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertCircle'
		},
		{
			label: 'Not paid / no tax records',
			value: 'UNPAID',
			uiMeta: { icon: 'Circle' },
			icon: 'Ban'
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
			{
				and: [
					{ '==': [{ var: 'propertyAreaType' }, 'OLD_MUNICIPAL'] },
					{ '!=': [{ var: 'propertyComplianceStatus' }, ''] }
				]
			},
			{ in: [{ var: 'constructionType' }, ['Flat', 'House']] }
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'municipalTaxStatus' }, 'UNPAID']
				},
				then: 'Properties without municipal tax records are difficult to finance. Clearing arrears and obtaining tax receipts is recommended before applying.'
			}
		]
	}
};

// ── q9: Unauthorized Additions ──────────────────────────────────────────
export const q9_unauthorizedAdditions: RawSchemaQuestion = {
	id: 'q9_unauthorizedAdditions',
	bindsTo_template: 'unauthorizedAdditions',
	contextKey: 'unauthorizedAdditions',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'Are there any unauthorized additions or modifications to the property?',
	description:
		"<div class='info-title'><i data-lucide='shield-off' class='inline-block h-4 w-4 text-red-500'></i> Unauthorized Additions</div><div class='info-box highlight dark:text-gray-400'>Extra floors, room additions, or balcony enclosures without permission are common in older areas. The extent affects lender decisions and valuation.</div>",
	options: [
		{
			label: 'No unauthorized additions',
			value: 'NONE',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'Minor additions (balcony enclosure, extra room)',
			value: 'MINOR',
			helperText: "Small changes that don't alter the building footprint significantly",
			uiMeta: { icon: 'Circle' },
			icon: 'AlertCircle'
		},
		{
			label: 'Major additions (extra floor, significant extension)',
			value: 'MAJOR',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
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
			{
				and: [
					{ '==': [{ var: 'propertyAreaType' }, 'OLD_MUNICIPAL'] },
					{ '!=': [{ var: 'municipalTaxStatus' }, ''] }
				]
			},
			{ '==': [{ var: 'PropertyStage' }, 'Ready To Move'] }
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'unauthorizedAdditions' }, 'MAJOR']
				},
				then: 'Major unauthorized construction significantly reduces lender options. Banks will likely reject; select NBFCs may consider at lower LTV and higher rates.'
			}
		]
	}
};

// ── q10: Revenue Record Status ──────────────────────────────────────────
export const q10_revenueRecordStatus: RawSchemaQuestion = {
	id: 'q10_revenueRecordStatus',
	bindsTo_template: 'revenueRecordStatus',
	contextKey: 'revenueRecordStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'What is the status of revenue records for this property?',
	description:
		"<div class='info-title'><i data-lucide='scroll-text' class='inline-block h-4 w-4'></i> Revenue Records</div><div class='info-box highlight dark:text-gray-400'>Revenue records (7/12 extract in Maharashtra, Khata in Karnataka, Patta in Tamil Nadu, Jamabandi in Rajasthan/Punjab) are the primary proof of land ownership in village/panchayat areas.</div>",
	options: [
		{
			label: 'Available and up to date',
			value: 'AVAILABLE_CURRENT',
			helperText: '7/12, Khata, Patta, RTC — whichever applies in your state',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'Available but not updated recently',
			value: 'AVAILABLE_OUTDATED',
			helperText: 'Records exist but mutation or name transfer pending',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertCircle'
		},
		{
			label: 'Not available or unclear',
			value: 'NOT_AVAILABLE',
			uiMeta: { icon: 'Circle' },
			icon: 'Ban'
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
			{ '==': [{ var: 'propertyAreaType' }, 'LOCAL_COLONY'] },
			{ '!=': [{ var: 'propertyComplianceStatus' }, ''] }
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'revenueRecordStatus' }, 'NOT_AVAILABLE']
				},
				then: 'Properties without revenue records are extremely difficult to finance. Even specialized NBFCs require some form of ownership documentation.'
			}
		]
	}
};

// ── q11: Colony Regularization Status ───────────────────────────────────
export const q11_colonyRegularizationStatus: RawSchemaQuestion = {
	id: 'q11_colonyRegularizationStatus',
	bindsTo_template: 'colonyRegularizationStatus',
	contextKey: 'colonyRegularizationStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'Has this colony/layout been regularized by the government?',
	description:
		"<div class='info-title'><i data-lucide='fence' class='inline-block h-4 w-4'></i> Colony Regularization</div><div class='info-box highlight dark:text-gray-400'>Many villages and panchayat areas have colonies that were developed informally but later regularized by state government orders. Regularized colonies are accepted by more lenders.</div>",
	options: [
		{
			label: 'Yes — officially regularized',
			value: 'REGULARIZED',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'Regularization applied/in progress',
			value: 'PENDING',
			uiMeta: { icon: 'Circle' },
			icon: 'Clock'
		},
		{
			label: 'Not regularized',
			value: 'NOT_REGULARIZED',
			uiMeta: { icon: 'Circle' },
			icon: 'Ban'
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
			{ '==': [{ var: 'propertyAreaType' }, 'LOCAL_COLONY'] },
			{ '!=': [{ var: 'revenueRecordStatus' }, ''] }
		]
	}
};

// ── q12: Gram Panchayat Permission ──────────────────────────────────────
export const q12_gramPanchayatPermission: RawSchemaQuestion = {
	id: 'q12_gramPanchayatPermission',
	bindsTo_template: 'gramPanchayatPermission',
	contextKey: 'gramPanchayatPermission',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'Has the Gram Panchayat issued permission for this construction?',
	description:
		"<div class='info-title'><i data-lucide='tent-tree' class='inline-block h-4 w-4'></i> Gram Panchayat Permission</div><div class='info-box highlight dark:text-gray-400'>In panchayat areas, the Gram Panchayat is the local authority that grants building permission. This serves as proof of authorized construction.</div>",
	options: [
		{
			label: 'Yes — GP permission obtained',
			value: 'YES',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'No permission obtained',
			value: 'NO',
			uiMeta: { icon: 'Circle' },
			icon: 'Ban'
		},
		{
			label: 'Not required (pre-existing old construction)',
			value: 'NOT_REQUIRED',
			uiMeta: { icon: 'Circle' },
			icon: 'FileText'
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
			{ '==': [{ var: 'propertyAreaType' }, 'LOCAL_COLONY'] },
			{ '!=': [{ var: 'colonyRegularizationStatus' }, ''] }
		]
	}
};

// ── q13: Construction Progress ──────────────────────────────────────────
export const q13_constructionProgress: RawSchemaQuestion = {
	id: 'q13_constructionProgress',
	bindsTo_template: 'constructionProgress',
	contextKey: 'constructionProgress',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid gap-3',
	required: true,
	question: 'What is the current construction status?',
	options: [
		{
			label: 'Just started — early stage',
			value: 'EARLY',
			helperText: 'Foundation or initial structure work',
			icon: 'HardHat'
		},
		{
			label: 'Halfway through — work in progress',
			value: 'MID',
			helperText: 'Structure up, internal work pending',
			icon: 'Building2'
		},
		{
			label: 'Almost done — finishing stage',
			value: 'NEAR_COMPLETE',
			helperText: 'Painting, fixtures, final touches',
			icon: 'Paintbrush'
		},
		{
			label: 'Construction done — OC/CC awaited',
			value: 'DONE_AWAITING_OC',
			helperText: 'Building complete, waiting for occupancy certificate',
			icon: 'ClipboardCheck'
		}
	],
	showWhen: {
		'==': [{ var: 'PropertyStage' }, 'Under Construction']
	}
};

// ── q14: Expected Completion Date ───────────────────────────────────────
export const q14_expectedCompletionDate: RawSchemaQuestion = {
	id: 'q14_expectedCompletionDate',
	bindsTo_template: 'expectedCompletionDate',
	contextKey: 'expectedCompletionDate',
	type: 'month-year',
	uiGroup: 'date_fields',
	required: false,
	question: 'When is the project expected to be completed?',
	description:
		"<div class='info-title'><span class='info-icon blue'>📅</span> Expected Completion</div><div class='info-box highlight dark:text-gray-400'>Expected completion date helps determine loan tenure and disbursement schedule.</div>",
	showWhen: {
		and: [
			{ '==': [{ var: 'PropertyStage' }, 'Under Construction'] },
			{ in: [{ var: 'constructionType' }, ['Flat', 'Floor']] }
		]
	}
};

// ── Aggregated export ───────────────────────────────────────────────────
/**
 * Returns compliance questions only (no UC construction questions).
 * UC questions (q13-q16) moved to propertyCharacter page (Session 32).
 */
export function getPropertyConditionQuestions(): RawSchemaQuestion[] {
	return [
		q1a_propertyComplianceStatus_planned,
		q1b_propertyComplianceStatus_converted,
		q1c_propertyComplianceStatus_municipal,
		q1d_propertyComplianceStatus_colony,
		q1e_propertyComplianceStatus_unknown,
		q2_ocCcAvailable,
		q3_municipalApproval,
		q4_isPossessionOfferedByAuthority,
		// q6_naConversionStatus removed — merged into q1b (Session 32)
		q7_zoneClassification,
		q8_municipalTaxStatus,
		q9_unauthorizedAdditions,
		q10_revenueRecordStatus,
		q11_colonyRegularizationStatus,
		q12_gramPanchayatPermission
	];
}
