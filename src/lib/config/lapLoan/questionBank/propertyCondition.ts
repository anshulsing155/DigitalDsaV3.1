/**
 * Property Condition & Compliance Questions
 * Page: propertyCondition_LAP
 *
 * Category-aware: Questions adapt based on categoryOfProperty
 * (Residential / Commercial / Industrial / Mixed).
 *
 * Structure:
 *   1. Area-type compliance variants (q1a–q1e) — shared across all categories
 *   2. Shared questions (zone, NA, tax, revenue) — all categories
 *   3. Residential-only questions (OC/CC, building plan, RERA, unauthorized additions)
 *   4. Industrial-specific questions (factory plan, CTE/CTO, fire NOC, license)
 *   5. Commercial-specific questions (trade license, fire NOC, unauthorized additions)
 *   6. Colony/panchayat questions — shared (already area-gated)
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';

// ── Helper constants ────────────────────────────────────────────────────
const RESIDENTIAL_OR_MIXED = ['Residential', 'Mixed'];
const COMMERCIAL_OR_MIXED = ['Commercial', 'Mixed'];
const INDUSTRIAL_CONSTRUCTION = ['Factory', 'Industrial Shed', 'Warehouse'];
const COMMERCIAL_CONSTRUCTION = ['Shop', 'Office', 'Building', 'Flat'];

// ═══════════════════════════════════════════════════════════════════════
// 1. AREA-TYPE COMPLIANCE VARIANTS (shared — all categories)
// ═══════════════════════════════════════════════════════════════════════

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
	question: 'Is the property built as per the development authority\u2019s sanctioned plan?',
	description:
		"<div class='info-title'><span class='info-icon blue'>\ud83c\udfdb\ufe0f</span> Property Compliance \u2014 Planned Area</div><div class='info-box highlight'>In planned/authority areas, lenders check whether construction follows the approved layout and sanctioned plan from DDA/MHADA/BDA/HUDA or similar authority.</div><div class='info-box tip'><span class='bold'>\ud83d\udca1 Tip:</span> Not fully compliant does not mean rejection \u2014 some NBFCs fund deviated properties at different terms.</div>",
	options: [
		{
			label: 'Yes \u2014 fully as per approved plan',
			value: 'fully_compliant',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ThumbsUp'
		},
		{
			label: 'Minor deviations from approved plan',
			value: 'authorized_not_per_plan',
			helperText: 'Small differences like balcony enclosure, staircase variation',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'AlertTriangle'
		},
		{
			label: 'Major deviations or no approved plan',
			value: 'not_authorized',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ThumbsDown'
		}
	],
	showWhen: {
		and: [
			{
				'==': [
					{
						var: 'propertyAreaType'
					},
					'PLANNED_AUTHORITY'
				]
			},
			{
				'!=': [
					{
						var: 'constructionType'
					},
					''
				]
			},
			{
				'!=': [
					{
						var: 'constructionType'
					},
					'Plot'
				]
			}
		]
	},
	warning: {
		condition: [
			{
				case: {
					in: [
						{
							var: 'propertyComplianceStatus'
						},
						['authorized_not_per_plan', 'not_authorized']
					]
				},
				then: 'Properties with deviations from approved plan have fewer lender options. Select NBFCs may still process at adjusted terms.'
			}
		]
	}
};

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
	question: 'Has the land been formally converted from agricultural to non-agricultural (NA) use?',
	description:
		"<div class='info-title'><span class='info-icon blue'>\ud83c\udfdb\ufe0f</span> Property Compliance \u2014 Converted Land</div><div class='info-box highlight'>Banks require confirmed NA (Non-Agricultural) conversion before financing any property on converted land \u2014 whether residential, commercial, or industrial. Without this, the property is treated as agricultural land which no lender will finance.</div>",
	options: [
		{
			label: 'Yes \u2014 NA order received and registered',
			value: 'fully_compliant',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ThumbsUp'
		},
		{
			label: 'Conversion applied but still pending',
			value: 'authorized_not_per_plan',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'AlertTriangle'
		},
		{
			label: 'No \u2014 still agricultural / not converted',
			value: 'not_authorized',
			riskType: 'NON_NA_LAND',
			riskSignal: {
				severity: 'critical',
				message: 'No major bank will finance non-NA land. Only select NBFCs may consider.',
				category: 'property_risk'
			},
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ThumbsDown'
		}
	],
	showWhen: {
		and: [
			{
				'==': [
					{
						var: 'propertyAreaType'
					},
					'CONVERTED_RESIDENTIAL'
				]
			},
			{
				'!=': [
					{
						var: 'constructionType'
					},
					''
				]
			},
			{
				'!=': [
					{
						var: 'constructionType'
					},
					'Plot'
				]
			}
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [
						{
							var: 'propertyComplianceStatus'
						},
						'authorized_not_per_plan'
					]
				},
				then: 'NA conversion is still pending \u2014 loan processing will be on hold until conversion is complete. High-risk status for lenders.'
			},
			{
				case: {
					'==': [
						{
							var: 'propertyComplianceStatus'
						},
						'not_authorized'
					]
				},
				then: 'Non-NA land \u2014 ineligible for financing. The land must be converted from agricultural use before any lender can process this loan.'
			}
		]
	}
};

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
		"<div class='info-title'><span class='info-icon blue'>\ud83c\udfdb\ufe0f</span> Property Compliance \u2014 Municipal Area</div><div class='info-box highlight'>For properties in old municipal/city areas, lenders verify municipal records, property tax, and building permission history.</div>",
	options: [
		{
			label: 'Yes \u2014 proper municipal records and building permission',
			value: 'fully_compliant',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ThumbsUp'
		},
		{
			label: 'Municipal area but original plan has deviations',
			value: 'authorized_not_per_plan',
			helperText: 'Extra floor, balcony extension, unauthorized room addition',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'AlertTriangle'
		},
		{
			label: 'No formal building permission or municipal records',
			value: 'not_authorized',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ThumbsDown'
		}
	],
	showWhen: {
		and: [
			{
				'==': [
					{
						var: 'propertyAreaType'
					},
					'OLD_MUNICIPAL'
				]
			},
			{
				'!=': [
					{
						var: 'constructionType'
					},
					''
				]
			},
			{
				'!=': [
					{
						var: 'constructionType'
					},
					'Plot'
				]
			}
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [
						{
							var: 'propertyComplianceStatus'
						},
						'authorized_not_per_plan'
					]
				},
				then: 'Minor deviations in municipal areas are common. Some banks and most NBFCs can still process with adjusted valuation.'
			}
		]
	}
};

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
		"<div class='info-title'><span class='info-icon blue'>\ud83c\udfdb\ufe0f</span> Property Compliance \u2014 Local Colony</div><div class='info-box highlight'>Properties in village/panchayat areas are evaluated based on whether the colony or layout has been officially recognized. Regularized colonies have more lender options.</div>",
	options: [
		{
			label: 'Yes \u2014 colony is regularized with proper records',
			value: 'fully_compliant',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ThumbsUp'
		},
		{
			label: 'Regularization applied or partially approved',
			value: 'authorized_not_per_plan',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'AlertTriangle'
		},
		{
			label: 'Not regularized / informal settlement',
			value: 'not_authorized',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ThumbsDown'
		}
	],
	showWhen: {
		'==': [
			{
				var: 'propertyAreaType'
			},
			'LOCAL_COLONY'
		]
	},
	warning: {
		condition: [
			{
				// FG-2 #17: Non-authorized property needs at minimum a registered sale deed
				// to have any legal standing — without it, no lender can create a mortgage.
				case: {
					'==': [
						{
							var: 'propertyComplianceStatus'
						},
						'not_authorized'
					]
				},
				then: 'Non-regularized colony properties are not accepted by banks. Specialized housing finance companies (Aavas, Grihashakti) may consider at higher interest rates and lower LTV. A registered sale deed is the absolute minimum requirement — without it, no lender can establish legal standing or create a mortgage.'
			}
		]
	}
};

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
		"<div class='info-title'><span class='info-icon blue'>\ud83c\udfdb\ufe0f</span> Property Compliance Status</div><div class='info-box highlight'>This determines which lenders (banks vs NBFCs) can process the application.</div><div class='info-box tip'><span class='bold'>\ud83d\udca1 Tip:</span> Not fully compliant does not mean rejection \u2014 some NBFCs fund non-authorized or deviated properties at different terms.</div>",
	options: [
		{
			label: 'Yes \u2014 authorized area, as per approved plan',
			value: 'fully_compliant',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ThumbsUp'
		},
		{
			label: 'Authorized area, but not as per plan',
			value: 'authorized_not_per_plan',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'AlertTriangle'
		},
		{
			label: 'Not in government-authorized area',
			value: 'not_authorized',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ThumbsDown'
		}
	],
	showWhen: {
		or: [
			{
				'==': [
					{
						var: 'propertyAreaType'
					},
					'UNKNOWN'
				]
			},
			{
				'==': [
					{
						var: 'propertyAreaType'
					},
					''
				]
			}
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
				// FG-2 #17: Non-authorized property requires a registered sale deed
				// as minimum legal standing — without it, even NBFCs cannot proceed.
				case: {
					'==': [{ var: 'propertyComplianceStatus' }, 'not_authorized']
				},
				then: 'Non-authorized properties have very limited lender options (select NBFCs only). A registered sale deed is the absolute minimum requirement to establish legal standing — without it, no lender can verify ownership or create a mortgage.'
			}
		]
	}
};

// ═══════════════════════════════════════════════════════════════════════
// 2. SHARED QUESTIONS (all categories)
// ═══════════════════════════════════════════════════════════════════════

export const q6_naConversionStatus: RawSchemaQuestion = {
	id: 'q6_naConversionStatus',
	bindsTo_template: 'naConversionStatus',
	contextKey: 'naConversionStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'What is the current status of the NA (Non-Agricultural) conversion order?',
	description:
		"<div class='info-title'><span class='info-icon blue'>\ud83d\udcdc</span> NA Conversion Status</div><div class='info-box highlight'>The NA order from the District Collector\u2019s office is the key document proving land use has been changed from agricultural to non-agricultural. Required for all property types \u2014 residential, commercial, and industrial.</div>",
	options: [
		{
			label: 'NA order received and registered',
			value: 'REGISTERED',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'CheckCircle2'
		},
		{
			label: 'Application submitted, order pending',
			value: 'APPLIED',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Clock'
		},
		{
			label: 'Not yet applied',
			value: 'NOT_STARTED',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Ban'
		},
		{
			label: 'Already in non-agricultural zone (no conversion needed)',
			value: 'NOT_REQUIRED',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'FileText'
		}
	],
	showWhen: {
		and: [
			{
				'==': [
					{
						var: 'propertyAreaType'
					},
					'CONVERTED_RESIDENTIAL'
				]
			},
			{
				'!=': [
					{
						var: 'propertyComplianceStatus'
					},
					''
				]
			}
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [
						{
							var: 'naConversionStatus'
						},
						'NOT_STARTED'
					]
				},
				then: 'Without NA conversion, no lender can process this loan. The conversion process typically takes 2\u20136 months.'
			}
		]
	}
};

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
		"<div class='info-title'><span class='info-icon blue'>\ud83d\uddfa\ufe0f</span> Zone Classification</div><div class='info-box highlight'>Zone classification determines permissible construction type and affects lender policies. Ensure the zone matches the property\u2019s actual use.</div>",
	options: [
		{
			label: 'Residential zone',
			value: 'RESIDENTIAL',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Home'
		},
		{
			label: 'Commercial zone',
			value: 'COMMERCIAL',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Building2'
		},
		{
			label: 'Industrial zone',
			value: 'INDUSTRIAL',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Factory'
		},
		{
			label: 'Mixed use (residential + commercial)',
			value: 'MIXED_USE',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Layers'
		}
	],
	showWhen: {
		or: [
			{
				and: [
					{
						'!=': [{ var: 'propertyComplianceStatus' }, '']
					},
					{
						'!=': [{ var: 'propertyComplianceStatus' }, 'not_authorized']
					},
					{
						in: [
							{ var: 'propertyAreaType' },
							['PLANNED_AUTHORITY', 'CONVERTED_RESIDENTIAL', 'OLD_MUNICIPAL']
						]
					}
				]
			},
			{
				'==': [{ var: 'constructionType' }, 'Plot']
			}
		]
	},
	warning: {
		condition: [
			{
				case: {
					and: [
						{ '==': [{ var: 'zoneClassification' }, 'RESIDENTIAL'] },
						{ '==': [{ var: 'categoryOfProperty' }, 'Industrial'] }
					]
				},
				then: 'Zone mismatch: Industrial property in a residential zone. Lenders will flag this \u2014 verify if the zone has been reclassified or if industrial use is permitted under a special order.'
			},
			{
				case: {
					and: [
						{ '==': [{ var: 'zoneClassification' }, 'RESIDENTIAL'] },
						{ '==': [{ var: 'categoryOfProperty' }, 'Commercial'] }
					]
				},
				then: 'Zone mismatch: Commercial property in a residential zone. Some lenders may restrict commercial loans on residential-zoned land. Verify lender policy.'
			},
			{
				case: {
					and: [
						{ '==': [{ var: 'zoneClassification' }, 'INDUSTRIAL'] },
						{ in: [{ var: 'categoryOfProperty' }, ['Residential', 'Mixed']] }
					]
				},
				then: 'Zone mismatch: Residential property in an industrial zone. Lenders may reduce LTV or reject \u2014 residential properties in industrial zones face valuation challenges.'
			},
			{
				case: {
					and: [
						{ '==': [{ var: 'zoneClassification' }, 'COMMERCIAL'] },
						{ '==': [{ var: 'categoryOfProperty' }, 'Industrial'] }
					]
				},
				then: 'Industrial property in a commercial zone \u2014 verify if heavy industrial use is permitted. Light industrial (warehouse/godown) is usually acceptable in commercial zones.'
			}
		]
	}
};

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
		"<div class='info-title'><span class='info-icon green'>\ud83d\udcb0</span> Municipal Tax Status</div><div class='info-box highlight'>Regular tax payment history proves the property is recognized by the municipal body \u2014 an important signal for lenders.</div>",
	options: [
		{
			label: 'Yes \u2014 paid regularly and up to date',
			value: 'PAID_REGULAR',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'CheckCircle2'
		},
		{
			label: 'Paid but with gaps or arrears',
			value: 'PAID_IRREGULAR',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'AlertCircle'
		},
		{
			label: 'Not paid / no tax records',
			value: 'UNPAID',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Ban'
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
		and: [
			{
				or: [
					{
						'!=': [{ var: 'propertyComplianceStatus' }, '']
					},
					{
						'!=': [{ var: 'zoneClassification' }, '']
					}
				]
			},
			{
				'!=': [
					{
						var: 'constructionType'
					},
					''
				]
			}
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [
						{
							var: 'municipalTaxStatus'
						},
						'UNPAID'
					]
				},
				then: 'Properties without municipal tax records are difficult to finance. Clearing arrears and obtaining tax receipts is recommended before applying.'
			}
		]
	}
};

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
		"<div class='info-title'><span class='info-icon blue'>\ud83d\udcd1</span> Revenue Records</div><div class='info-box highlight'>Revenue records (7/12 extract in Maharashtra, Khata in Karnataka, Patta in Tamil Nadu, Jamabandi in Rajasthan/Punjab) are the primary proof of land ownership in village/panchayat areas.</div>",
	options: [
		{
			label: 'Available and up to date',
			value: 'AVAILABLE_CURRENT',
			helperText: '7/12, Khata, Patta, RTC \u2014 whichever applies in your state',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'CheckCircle2'
		},
		{
			label: 'Available but not updated recently',
			value: 'AVAILABLE_OUTDATED',
			helperText: 'Records exist but mutation or name transfer pending',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'AlertCircle'
		},
		{
			label: 'Not available or unclear',
			value: 'NOT_AVAILABLE',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Ban'
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
		and: [
			{
				'!=': [
					{
						var: 'propertyComplianceStatus'
					},
					''
				]
			},
			{
				in: [
					{
						var: 'propertyAreaType'
					},
					['CONVERTED_RESIDENTIAL', 'LOCAL_COLONY']
				]
			}
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [
						{
							var: 'revenueRecordStatus'
						},
						'NOT_AVAILABLE'
					]
				},
				then: 'Properties without revenue records are extremely difficult to finance. Even specialized NBFCs require some form of ownership documentation.'
			}
		]
	}
};

// ═══════════════════════════════════════════════════════════════════════
// 3. RESIDENTIAL-ONLY QUESTIONS (Residential / Mixed)
// ═══════════════════════════════════════════════════════════════════════

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
		"<div class='info-title'><span class='info-icon blue'>\ud83d\udccb</span> OC / CC Status</div><div class='info-box highlight'>Most banks require OC/CC for processing. Without OC, lenders may consider the property legally incomplete.</div>",
	options: [
		{
			label: 'Yes, both OC and CC',
			value: 'BOTH',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ClipboardList'
		},
		{
			label: 'Only CC available',
			value: 'CC_ONLY',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'FileText'
		},
		{
			label: 'Neither available',
			value: 'NONE',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Ban'
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
		and: [
			{
				'!=': [{ var: 'propertyComplianceStatus' }, 'not_authorized']
			},
			{
				'!=': [{ var: 'propertyComplianceStatus' }, '']
			},
			{
				in: [{ var: 'constructionType' }, ['Flat', 'Floor', 'Building', 'Office', 'Shop']]
			},
			{
				in: [
					{ var: 'propertyAreaType' },
					['PLANNED_AUTHORITY', 'CONVERTED_RESIDENTIAL', 'OLD_MUNICIPAL']
				]
			},
			{
				in: [{ var: 'categoryOfProperty' }, RESIDENTIAL_OR_MIXED]
			}
		]
	}
};

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
		"<div class='info-title'><span class='info-icon blue'>\ud83c\udfdb\ufe0f</span> Building Plan Approval</div><div class='info-box highlight'>For independent houses, lenders check whether construction followed a plan sanctioned by the local authority.</div>",
	options: [
		{
			label: 'Yes, with approved plan',
			value: 'APPROVED',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'ClipboardList'
		},
		{
			label: 'Partially approved / Deviations exist',
			value: 'PARTIAL',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'AlertTriangle'
		},
		{
			label: 'No approved plan',
			value: 'NO_PLAN',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Ban'
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
		and: [
			{
				'!=': [{ var: 'propertyComplianceStatus' }, 'not_authorized']
			},
			{
				'!=': [{ var: 'propertyComplianceStatus' }, '']
			},
			{
				'!=': [{ var: 'constructionType' }, 'Plot']
			},
			{
				'!=': [{ var: 'constructionType' }, '']
			},
			{
				in: [
					{ var: 'propertyAreaType' },
					['PLANNED_AUTHORITY', 'CONVERTED_RESIDENTIAL', 'OLD_MUNICIPAL']
				]
			},
			{
				in: [{ var: 'categoryOfProperty' }, RESIDENTIAL_OR_MIXED]
			}
		]
	}
};

export const q5_reraRegistrationStatus: RawSchemaQuestion = {
	id: 'q5_reraRegistrationStatus',
	bindsTo_template: 'reraRegistrationStatus',
	contextKey: 'reraRegistrationStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'Is the property / project RERA registered?',
	description:
		"<div class='info-title'><span class='info-icon green'>\ud83c\udfe2</span> RERA Registration</div><div class='info-box highlight'>RERA registration is mandatory for residential projects over 500 sq.m. Banks verify RERA number before sanctioning loans.</div>",
	options: [
		{
			label: 'Yes \u2014 RERA registered',
			value: 'REGISTERED',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'CheckCircle2'
		},
		{
			label: 'No \u2014 not registered',
			value: 'NOT_REGISTERED',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'AlertTriangle'
		},
		{
			label: 'Exempted (less than 500 sq.m. / 8 units)',
			value: 'EXEMPTED',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'FileText'
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
		and: [
			{
				in: [{ var: 'propertyAreaType' }, ['PLANNED_AUTHORITY', 'CONVERTED_RESIDENTIAL']]
			},
			{
				'!=': [{ var: 'propertyComplianceStatus' }, '']
			},
			{
				in: [{ var: 'constructionType' }, ['Flat', 'Floor', 'Row House']]
			},
			{
				in: [{ var: 'categoryOfProperty' }, RESIDENTIAL_OR_MIXED]
			}
		]
	},
	warning: {
		condition: [
			{
				case: {
					and: [
						{
							'==': [{ var: 'reraRegistrationStatus' }, 'NOT_REGISTERED']
						},
						{
							'==': [{ var: 'PropertyStage' }, 'Under Construction']
						}
					]
				},
				then: 'Banks will not finance under-construction projects without RERA registration. Verify with the builder.'
			}
		]
	}
};

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
		"<div class='info-title'><span class='info-icon red'>\ud83d\udea7</span> Unauthorized Additions</div><div class='info-box highlight'>Extra floors, room additions, or balcony enclosures without permission are common in older areas. The extent affects lender decisions and valuation.</div>",
	options: [
		{
			label: 'No unauthorized additions',
			value: 'NONE',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'CheckCircle2'
		},
		{
			label: 'Minor additions (balcony enclosure, extra room)',
			value: 'MINOR',
			helperText: "Small changes that don't alter the building footprint significantly",
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'AlertCircle'
		},
		{
			label: 'Major additions (extra floor, significant extension)',
			value: 'MAJOR',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'AlertTriangle'
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
		and: [
			{
				'!=': [{ var: 'propertyComplianceStatus' }, '']
			},
			{
				'!=': [{ var: 'constructionType' }, 'Plot']
			},
			{
				'!=': [{ var: 'constructionType' }, '']
			},
			{
				in: [
					{ var: 'propertyAreaType' },
					['PLANNED_AUTHORITY', 'CONVERTED_RESIDENTIAL', 'OLD_MUNICIPAL']
				]
			},
			{
				in: [{ var: 'categoryOfProperty' }, RESIDENTIAL_OR_MIXED]
			}
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

// ═══════════════════════════════════════════════════════════════════════
// 4. INDUSTRIAL-SPECIFIC QUESTIONS
// ═══════════════════════════════════════════════════════════════════════

export const q_factoryPlanApproval: RawSchemaQuestion = {
	id: 'q_factoryPlanApproval',
	bindsTo_template: 'factoryPlanApproval',
	contextKey: 'factoryPlanApproval',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'Has the factory / industrial layout been approved by the competent authority?',
	description:
		"<div class='info-title'><span class='info-icon blue'>\ud83c\udfed</span> Factory Plan Approval</div><div class='info-box highlight'>Industrial properties need layout approval from MIDC, GIDC, RIICO, or the relevant state industrial development authority. This is the equivalent of a building plan sanction for industrial premises.</div>",
	options: [
		{
			label: 'Yes \u2014 approved by industrial/development authority',
			value: 'APPROVED',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'Partially approved / some permissions pending',
			value: 'PARTIAL',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
		},
		{
			label: 'No approval / not applied',
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
	showWhen: {
		and: [
			{ '==': [{ var: 'categoryOfProperty' }, 'Industrial'] },
			{ '!=': [{ var: 'propertyComplianceStatus' }, ''] },
			{ '!=': [{ var: 'constructionType' }, 'Plot'] },
			{ '!=': [{ var: 'constructionType' }, ''] }
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'factoryPlanApproval' }, 'NO_PLAN']
				},
				then: 'Industrial properties without layout approval from the competent authority face very limited financing options. Most banks will reject outright.'
			}
		]
	}
};

export const q_cteCtoStatus: RawSchemaQuestion = {
	id: 'q_cteCtoStatus',
	bindsTo_template: 'cteCtoStatus',
	contextKey: 'cteCtoStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'What is the CTE / CTO status from the State Pollution Control Board?',
	description:
		"<div class='info-title'><span class='info-icon green'>\ud83c\udf3f</span> Pollution Board Consent</div><div class='info-box highlight'>CTE (Consent to Establish) is needed before setting up operations. CTO (Consent to Operate) is needed to run the unit. Both are mandatory for most industrial activities and lenders verify these before financing.</div>",
	options: [
		{
			label: 'Both CTE and CTO obtained and valid',
			value: 'BOTH_VALID',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'CTE obtained, CTO pending',
			value: 'CTE_ONLY',
			uiMeta: { icon: 'Circle' },
			icon: 'Clock'
		},
		{
			label: 'Had CTE/CTO but expired',
			value: 'EXPIRED',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
		},
		{
			label: 'Never obtained',
			value: 'NONE',
			uiMeta: { icon: 'Circle' },
			icon: 'Ban'
		},
		{
			label: 'Not required (exempt category)',
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
			{ '==': [{ var: 'categoryOfProperty' }, 'Industrial'] },
			{ in: [{ var: 'constructionType' }, INDUSTRIAL_CONSTRUCTION] }
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'cteCtoStatus' }, 'NONE']
				},
				then: 'Operating without Pollution Board consent is illegal. No lender will finance an industrial unit without at least a CTE. Obtain consent before applying.'
			},
			{
				case: {
					'==': [{ var: 'cteCtoStatus' }, 'EXPIRED']
				},
				then: 'Expired CTE/CTO must be renewed before any lender can process the loan. Renewal typically takes 1\u20133 months.'
			}
		]
	}
};

export const q_fireNocIndustrial: RawSchemaQuestion = {
	id: 'q_fireNocIndustrial',
	bindsTo_template: 'fireNocStatus',
	contextKey: 'fireNocStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'Does the industrial premises have a valid Fire NOC from the fire department?',
	description:
		"<div class='info-title'><span class='info-icon red'>\ud83d\udd25</span> Fire NOC Status</div><div class='info-box highlight'>Fire NOC is mandatory for factories, warehouses, and industrial sheds. Lenders verify this as part of legal and safety due diligence.</div>",
	options: [
		{
			label: 'Yes \u2014 valid and current',
			value: 'VALID',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'Had NOC but expired',
			value: 'EXPIRED',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
		},
		{
			label: 'Never obtained',
			value: 'NOT_OBTAINED',
			uiMeta: { icon: 'Circle' },
			icon: 'Ban'
		},
		{
			label: 'Not required (small premises / exempt)',
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
			{ '==': [{ var: 'categoryOfProperty' }, 'Industrial'] },
			{ '!=': [{ var: 'constructionType' }, 'Plot'] },
			{ '!=': [{ var: 'constructionType' }, ''] }
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'fireNocStatus' }, 'NOT_OBTAINED']
				},
				then: 'Industrial premises without Fire NOC face higher insurance costs and lender reluctance. Obtain NOC before applying for best terms.'
			}
		]
	}
};

export const q_industrialLicenseStatus: RawSchemaQuestion = {
	id: 'q_industrialLicenseStatus',
	bindsTo_template: 'industrialLicenseStatus',
	contextKey: 'industrialLicenseStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'What is the factory / industrial license status?',
	description:
		"<div class='info-title'><span class='info-icon blue'>\ud83c\udfed</span> Factory License</div><div class='info-box highlight'>Factory license under the Factories Act is required for manufacturing units with 10+ workers (with power) or 20+ workers (without power). Lenders verify license validity as part of due diligence.</div>",
	options: [
		{
			label: 'Active and valid',
			value: 'ACTIVE',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'Application pending',
			value: 'APPLIED',
			uiMeta: { icon: 'Circle' },
			icon: 'Clock'
		},
		{
			label: 'Expired / not renewed',
			value: 'EXPIRED',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
		},
		{
			label: 'No license',
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
	showWhen: {
		and: [
			{ '==': [{ var: 'categoryOfProperty' }, 'Industrial'] },
			{ in: [{ var: 'constructionType' }, ['Factory', 'Industrial Shed']] }
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'industrialLicenseStatus' }, 'NONE']
				},
				then: 'Unlicensed industrial units have limited financing options. Banks may reject; NBFCs may consider at significantly lower LTV.'
			},
			{
				case: {
					'==': [{ var: 'industrialLicenseStatus' }, 'EXPIRED']
				},
				then: 'Expired factory license must be renewed before lender can proceed. Renewal is usually straightforward if operations are compliant.'
			}
		]
	}
};

export const q_industrialUnauthorizedModifications: RawSchemaQuestion = {
	id: 'q_industrialUnauthorizedModifications',
	bindsTo_template: 'unauthorizedAdditions',
	contextKey: 'unauthorizedAdditions',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'Are there any unauthorized structural modifications to the industrial premises?',
	description:
		"<div class='info-title'><span class='info-icon red'>\ud83d\udea7</span> Unauthorized Modifications</div><div class='info-box highlight'>Additional sheds, mezzanine floors, or structural extensions without approval from the industrial authority affect valuation and lender acceptance.</div>",
	options: [
		{
			label: 'No unauthorized modifications',
			value: 'NONE',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'Minor modifications (temporary sheds, minor extensions)',
			value: 'MINOR',
			helperText: 'Temporary structures or small extensions that can be regularized',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertCircle'
		},
		{
			label: 'Major modifications (extra unit, structural additions without permission)',
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
			{ '==': [{ var: 'categoryOfProperty' }, 'Industrial'] },
			{ '!=': [{ var: 'propertyComplianceStatus' }, ''] },
			{ '!=': [{ var: 'constructionType' }, 'Plot'] },
			{ '!=': [{ var: 'constructionType' }, ''] }
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'unauthorizedAdditions' }, 'MAJOR']
				},
				then: 'Major unauthorized modifications to industrial premises significantly reduce lender options. Regularization with the industrial authority is recommended before applying.'
			}
		]
	}
};

// ═══════════════════════════════════════════════════════════════════════
// 5. COMMERCIAL-SPECIFIC QUESTIONS
// ═══════════════════════════════════════════════════════════════════════

export const q_shopEstablishmentLicense: RawSchemaQuestion = {
	id: 'q_shopEstablishmentLicense',
	bindsTo_template: 'shopEstablishmentLicense',
	contextKey: 'shopEstablishmentLicense',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'Does the premises have a valid Shop & Establishment / Trade License?',
	description:
		"<div class='info-title'><span class='info-icon blue'>\ud83c\udfea</span> Trade License</div><div class='info-box highlight'>Shop & Establishment Act registration and trade license from the municipal body are basic commercial compliance documents. Lenders verify these to confirm the property is being used for authorized commercial purposes.</div>",
	options: [
		{
			label: 'Yes \u2014 valid and current',
			value: 'VALID',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'Expired / not renewed',
			value: 'EXPIRED',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
		},
		{
			label: 'Not obtained',
			value: 'NOT_OBTAINED',
			uiMeta: { icon: 'Circle' },
			icon: 'Ban'
		},
		{
			label: 'Not required (vacant / self-use)',
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
			{ in: [{ var: 'categoryOfProperty' }, COMMERCIAL_OR_MIXED] },
			{ in: [{ var: 'constructionType' }, COMMERCIAL_CONSTRUCTION] }
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'shopEstablishmentLicense' }, 'NOT_OBTAINED']
				},
				then: 'Operating without a trade license may affect lender confidence in the property\u2019s commercial viability. Obtain registration before applying for best terms.'
			}
		]
	}
};

export const q_fireNocCommercial: RawSchemaQuestion = {
	id: 'q_fireNocCommercial',
	bindsTo_template: 'fireNocStatus',
	contextKey: 'fireNocStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'Does the commercial premises have a valid Fire NOC?',
	description:
		"<div class='info-title'><span class='info-icon red'>\ud83d\udd25</span> Fire NOC Status</div><div class='info-box highlight'>Fire NOC is mandatory for commercial buildings, offices, and shops above a certain size. Lenders verify this as part of safety due diligence.</div>",
	options: [
		{
			label: 'Yes \u2014 valid and current',
			value: 'VALID',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'Had NOC but expired',
			value: 'EXPIRED',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
		},
		{
			label: 'Never obtained',
			value: 'NOT_OBTAINED',
			uiMeta: { icon: 'Circle' },
			icon: 'Ban'
		},
		{
			label: 'Not required (small premises / exempt)',
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
			{ '==': [{ var: 'categoryOfProperty' }, 'Commercial'] },
			{ in: [{ var: 'constructionType' }, ['Building', 'Office', 'Shop']] }
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'fireNocStatus' }, 'NOT_OBTAINED']
				},
				then: 'Commercial premises without Fire NOC face higher insurance costs and lender reluctance. Obtain NOC before applying for best terms.'
			}
		]
	}
};

export const q_commercialUnauthorizedAdditions: RawSchemaQuestion = {
	id: 'q_commercialUnauthorizedAdditions',
	bindsTo_template: 'unauthorizedAdditions',
	contextKey: 'unauthorizedAdditions',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'Are there any unauthorized modifications to the commercial premises?',
	description:
		"<div class='info-title'><span class='info-icon red'>\ud83d\udea7</span> Unauthorized Modifications</div><div class='info-box highlight'>Structural changes, mezzanine additions, or facade modifications without municipal approval affect property valuation and lender acceptance.</div>",
	options: [
		{
			label: 'No unauthorized modifications',
			value: 'NONE',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'Minor modifications (partition changes, AC ducting, signage)',
			value: 'MINOR',
			helperText: 'Non-structural changes that don\u2019t affect the building footprint',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertCircle'
		},
		{
			label: 'Major modifications (mezzanine floor, structural extension)',
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
			{ '==': [{ var: 'categoryOfProperty' }, 'Commercial'] },
			{ '!=': [{ var: 'propertyComplianceStatus' }, ''] },
			{ '!=': [{ var: 'constructionType' }, 'Plot'] },
			{ '!=': [{ var: 'constructionType' }, ''] }
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'unauthorizedAdditions' }, 'MAJOR']
				},
				then: 'Major unauthorized modifications to commercial premises significantly reduce lender options. Banks will likely reject; select NBFCs may consider at lower LTV.'
			}
		]
	}
};

// ═══════════════════════════════════════════════════════════════════════
// 6. COLONY / PANCHAYAT QUESTIONS (shared — already area-gated)
// ═══════════════════════════════════════════════════════════════════════

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
		"<div class='info-title'><span class='info-icon blue'>\ud83c\udfe18\ufe0f</span> Colony Regularization</div><div class='info-box highlight'>Many villages and panchayat areas have colonies that were developed informally but later regularized by state government orders. Regularized colonies are accepted by more lenders.</div>",
	options: [
		{
			label: 'Yes \u2014 officially regularized',
			value: 'REGULARIZED',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'CheckCircle2'
		},
		{
			label: 'Regularization applied/in progress',
			value: 'PENDING',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Clock'
		},
		{
			label: 'Not regularized',
			value: 'NOT_REGULARIZED',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Ban'
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
				var: 'propertyAreaType'
			},
			'LOCAL_COLONY'
		]
	}
};

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
		"<div class='info-title'><span class='info-icon green'>\ud83c\udfe1</span> Gram Panchayat Permission</div><div class='info-box highlight'>In panchayat areas, the Gram Panchayat is the local authority that grants building permission. This serves as proof of authorized construction.</div>",
	options: [
		{
			label: 'Yes \u2014 GP permission obtained',
			value: 'YES',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'CheckCircle2'
		},
		{
			label: 'No permission obtained',
			value: 'NO',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Ban'
		},
		{
			label: 'Not required (pre-existing old construction)',
			value: 'NOT_REQUIRED',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'FileText'
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
				var: 'propertyAreaType'
			},
			'LOCAL_COLONY'
		]
	}
};

// ═══════════════════════════════════════════════════════════════════════
// EXPORT — all questions for the page
// ═══════════════════════════════════════════════════════════════════════

/** Returns all questions for the Property Condition & Compliance page */
export function getPropertyConditionLapQuestions(): RawSchemaQuestion[] {
	return [
		// Area-type compliance (shared)
		q1a_propertyComplianceStatus_planned,
		q1b_propertyComplianceStatus_converted,
		q1c_propertyComplianceStatus_municipal,
		q1d_propertyComplianceStatus_colony,
		q1e_propertyComplianceStatus_unknown,
		// Shared questions
		q6_naConversionStatus,
		q7_zoneClassification,
		q8_municipalTaxStatus,
		q10_revenueRecordStatus,
		// Residential-only
		q2_ocCcAvailable,
		q3_municipalApproval,
		q5_reraRegistrationStatus,
		q9_unauthorizedAdditions,
		// Industrial-specific
		q_factoryPlanApproval,
		q_cteCtoStatus,
		q_fireNocIndustrial,
		q_industrialLicenseStatus,
		q_industrialUnauthorizedModifications,
		// Commercial-specific
		q_shopEstablishmentLicense,
		q_fireNocCommercial,
		q_commercialUnauthorizedAdditions,
		// Colony/panchayat (shared, area-gated)
		q11_colonyRegularizationStatus,
		q12_gramPanchayatPermission
	];
}
