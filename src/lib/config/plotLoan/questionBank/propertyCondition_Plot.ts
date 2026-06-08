/**
 * Plot Condition & Compliance Questions
 * Page: propertyCondition_Plot
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';

export const q1a_propertyComplianceStatus_planned: RawSchemaQuestion = {
	id: 'q1a_propertyComplianceStatus_planned',
	bindsTo_template: 'propertyComplianceStatus',
	contextKey: 'propertyComplianceStatus',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	labelClass: 'text-black',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'shield-check'
	},
	required: true,
	question:
		'Is this plot in an approved layout with development authority / municipal corporation approval?',
	description:
		"<div class='info-title'><span class='info-icon blue'>🏛️</span> Plot Compliance — Development Authority Area</div><div class='info-box highlight'>Plots in approved layouts by development authorities (DDA, HUDA, BDA, etc.) have the highest lender acceptance. Allotment letter + possession letter is usually sufficient documentation.</div>",
	options: [
		{
			label: 'Yes — approved layout, all permissions in place',
			value: 'fully_compliant',
			icon: 'CheckCircle'
		},
		{
			label: 'Approved area but some permissions pending',
			value: 'authorized_not_per_plan',
			icon: 'AlertTriangle'
		},
		{
			label: 'Not in an approved / authorized layout',
			value: 'not_authorized',
			icon: 'XCircle'
		}
	],
	showWhen: {
		'==': [
			{
				var: 'propertyAreaType'
			},
			'PLANNED_AUTHORITY'
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
						'not_authorized'
					]
				},
				then: 'Plots not in an approved layout face significantly limited financing options. Only select NBFCs may consider this. Proceed with caution.'
			}
		]
	}
};

export const q1b_propertyComplianceStatus_converted: RawSchemaQuestion = {
	id: 'q1b_propertyComplianceStatus_converted',
	bindsTo_template: 'propertyComplianceStatus',
	contextKey: 'propertyComplianceStatus',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	labelClass: 'text-black',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'shield-check'
	},
	required: true,
	question:
		'Has this plot been fully converted from agricultural to non-agricultural (NA) use with valid conversion order?',
	description:
		"<div class='info-title'><span class='info-icon gold'>⚠️</span> Plot Compliance — Converted Land</div><div class='info-box highlight'>NA (Non-Agricultural) conversion is <strong>mandatory</strong> for bank financing. Without a valid NA Sanad/order, no bank or NBFC will process this loan.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Keep the NA conversion order / Sanad ready. State-specific: Maharashtra (NA order from Collector), Karnataka (DC conversion), Gujarat (NA Sanad from Mamlatdar).</div>",
	options: [
		{
			label: 'Yes — fully converted with NA Sanad/order',
			value: 'fully_compliant',
			icon: 'CheckCircle'
		},
		{
			label: 'Conversion applied but still pending',
			value: 'authorized_not_per_plan',
			icon: 'Clock'
		},
		{
			label: 'Not converted — still agricultural land',
			value: 'not_authorized',
			icon: 'XCircle'
		}
	],
	showWhen: {
		'==': [
			{
				var: 'propertyAreaType'
			},
			'CONVERTED_RESIDENTIAL'
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
				then: 'NA conversion is still pending. Loan processing can begin but disbursement will be held until the conversion order is obtained. Keep the application reference number ready.'
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
				then: 'Unconverted agricultural land CANNOT be financed through standard bank loans. NA conversion must be completed before any lender will process this application.'
			}
		]
	}
};

export const q1c_propertyComplianceStatus_municipal: RawSchemaQuestion = {
	id: 'q1c_propertyComplianceStatus_municipal',
	bindsTo_template: 'propertyComplianceStatus',
	contextKey: 'propertyComplianceStatus',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	labelClass: 'text-black',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'shield-check'
	},
	required: true,
	question:
		'Is this plot within municipal corporation limits with proper layout approval and building permission zone?',
	description:
		"<div class='info-title'><span class='info-icon blue'>🏛️</span> Plot Compliance — Municipal Area</div><div class='info-box highlight'>Plots within municipal limits with proper zoning and layout approval have good lender acceptance. Municipal property records and tax receipts are key documents.</div>",
	options: [
		{
			label: 'Yes — within municipal limits, proper layout approval',
			value: 'fully_compliant',
			icon: 'CheckCircle'
		},
		{
			label: 'Within municipal limits but layout approval unclear',
			value: 'authorized_not_per_plan',
			icon: 'AlertTriangle'
		},
		{
			label: 'Outside municipal limits / no proper approval',
			value: 'not_authorized',
			icon: 'XCircle'
		}
	],
	showWhen: {
		'==': [
			{
				var: 'propertyAreaType'
			},
			'OLD_MUNICIPAL'
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
						'not_authorized'
					]
				},
				then: 'Plots outside municipal limits or without proper layout approval face limited financing options. Only select NBFCs may consider this.'
			}
		]
	}
};

export const q1d_propertyComplianceStatus_colony: RawSchemaQuestion = {
	id: 'q1d_propertyComplianceStatus_colony',
	bindsTo_template: 'propertyComplianceStatus',
	contextKey: 'propertyComplianceStatus',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	labelClass: 'text-black',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'shield-check'
	},
	required: true,
	question:
		'Is this colony / layout authorized by the development authority? Has the layout been approved?',
	description:
		"<div class='info-title'><span class='info-icon gold'>⚠️</span> Plot Compliance — Colony / Village Area</div><div class='info-box highlight'>Plots in unauthorized colonies or unapproved layouts are extremely difficult to finance. Regularization status is critical for lender acceptance.</div>",
	options: [
		{
			label: 'Yes — colony is authorized / regularized',
			value: 'fully_compliant',
			icon: 'CheckCircle'
		},
		{
			label: 'Colony regularization in progress',
			value: 'authorized_not_per_plan',
			icon: 'Clock'
		},
		{
			label: 'Unauthorized colony / not regularized',
			value: 'not_authorized',
			icon: 'XCircle'
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
				case: {
					'==': [
						{
							var: 'propertyComplianceStatus'
						},
						'not_authorized'
					]
				},
				then: 'Plots in unauthorized colonies are rejected by virtually all lenders. Colony regularization must be completed or at least formally initiated before any bank will consider financing.'
			}
		]
	}
};

export const q1e_propertyComplianceStatus_unknown: RawSchemaQuestion = {
	id: 'q1e_propertyComplianceStatus_unknown',
	bindsTo_template: 'propertyComplianceStatus',
	contextKey: 'propertyComplianceStatus',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	labelClass: 'text-black',
	optionContainerClass: 'grid gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'shield-check'
	},
	required: true,
	question:
		"Is the plot's legal status clear — does it have any form of government / municipal approval?",
	description:
		"<div class='info-title'><span class='info-icon gold'>⚠️</span> Plot Compliance — Status Unknown</div><div class='info-box highlight'>If the area type is unclear, the plot's legal and approval status becomes even more critical. Lenders will require clear documentation of the plot's authorization.</div>",
	options: [
		{
			label: 'Yes — has some form of government approval',
			value: 'fully_compliant',
			icon: 'CheckCircle'
		},
		{
			label: 'Partial or unclear approval status',
			value: 'authorized_not_per_plan',
			icon: 'AlertTriangle'
		},
		{
			label: 'No government approval / authorization',
			value: 'not_authorized',
			icon: 'XCircle'
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
					'==': [
						{
							var: 'propertyComplianceStatus'
						},
						'not_authorized'
					]
				},
				then: 'Plots without any form of government approval are not financeable by standard lenders. Explore options to obtain at least basic municipal or panchayat approval before applying.'
			}
		]
	}
};

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
		'<div class=’info-title’><span class=’info-icon blue’>📜</span> NA Conversion Status</div><div class=’info-box highlight’>The NA order from the District Collector’s office is the key document proving land use has been changed from agricultural to non-agricultural. Required regardless of intended use — residential, commercial, or industrial.</div>',
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
				'!=': [{ var: 'propertyComplianceStatus' }, '']
			},
			{
				in: [{ var: 'propertyAreaType' }, ['CONVERTED_RESIDENTIAL', 'LOCAL_COLONY', 'UNKNOWN', '']]
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
				then: 'Without NA conversion, no lender can process this loan. The conversion process typically takes 2-6 months.'
			}
		]
	}
};

// FG-2 #13: Boundary demarcation question for NA conversion cases.
// Lenders require clear plot boundaries before financing — especially important
// when land is being converted from agricultural (boundaries are often informal).
export const q6b_boundaryDemarcation: RawSchemaQuestion = {
	id: 'q6b_boundaryDemarcation',
	bindsTo_template: 'boundaryDemarcation',
	contextKey: 'boundaryDemarcation',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'Are the plot boundaries clearly demarcated and documented?',
	description:
		"<div class='info-title'><span class='info-icon blue'>📏</span> Boundary Demarcation</div><div class='info-box highlight'>Lenders require clear, surveyed plot boundaries before financing. Agricultural land conversions often have informal or disputed boundaries — proper demarcation is mandatory.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Government-surveyed boundaries with stone/pillar markers carry more weight than self-declared fencing.</div>",
	options: [
		{
			label: 'Yes — surveyed with official markers',
			value: 'SURVEYED',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2'
		},
		{
			label: 'Fenced / walled but not officially surveyed',
			value: 'FENCED_ONLY',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertCircle'
		},
		{
			label: 'No clear boundaries',
			value: 'NONE',
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
	// Show when NA conversion is in progress or completed (converted land needs boundary proof)
	showWhen: {
		and: [
			{ '!=': [{ var: 'naConversionStatus' }, ''] },
			{
				in: [{ var: 'propertyAreaType' }, ['CONVERTED_RESIDENTIAL', 'LOCAL_COLONY', 'UNKNOWN']]
			}
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [{ var: 'boundaryDemarcation' }, 'NONE']
				},
				then: 'Plots without clear boundaries cannot be valued by lenders. A government survey and demarcation is typically required before loan processing can begin.'
			},
			{
				case: {
					'==': [{ var: 'boundaryDemarcation' }, 'FENCED_ONLY']
				},
				then: 'Self-fenced boundaries may not satisfy lender requirements. Recommend obtaining an official survey and demarcation certificate from the local revenue authority.'
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
	question: 'What is the status of revenue records (7/12, Patta, Khata, RTC) for this plot?',
	description:
		"<div class='info-box highlight'>Revenue records are <strong>always required</strong> for plot loans — they confirm land ownership, classification, and mutation status. State-specific: 7/12 extract (MH/GJ), Patta/Chitta (TN), RTC (KA), Jamabandi (PB/HR/RJ).</div>",
	options: [
		{
			label: 'Available and up to date',
			value: 'AVAILABLE_CURRENT',
			helperText: '7/12, Khata, Patta, RTC — whichever applies in your state',
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
		'!=': [
			{
				var: 'propertyComplianceStatus'
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

export const q8_layoutApprovalStatus: RawSchemaQuestion = {
	id: 'q8_layoutApprovalStatus',
	bindsTo_template: 'layoutApprovalStatus',
	contextKey: 'layoutApprovalStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'map'
	},
	required: true,
	question: 'What type of layout approval does this plot have?',
	description:
		'Layout approval type determines the level of lender acceptance. Planning authority approved layouts get the best terms.',
	options: [
		{
			label: 'Approved by planning authority (TP scheme)',
			value: 'planning_authority',
			icon: 'CheckCircle'
		},
		{
			label: 'Approved by development authority',
			value: 'development_authority',
			icon: 'Building'
		},
		{
			label: 'Revenue layout (no planning approval)',
			value: 'revenue_layout',
			icon: 'FileWarning'
		},
		{
			label: 'Approval status unknown',
			value: 'unknown',
			icon: 'HelpCircle'
		}
	],
	showWhen: {
		'!=': [
			{
				var: 'propertyComplianceStatus'
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
							var: 'layoutApprovalStatus'
						},
						'revenue_layout'
					]
				},
				then: 'Revenue layouts are not approved by planning authorities. Most banks refuse to finance plots in revenue layouts. Only select NBFCs may consider this.'
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
		"<div class='info-title'><span class='info-icon blue'>🗺️</span> Zone Classification</div><div class='info-box highlight'>Zone classification determines permissible construction type. Lenders prefer residential or mixed-use zones.</div>",
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
				'!=': [
					{
						var: 'propertyComplianceStatus'
					},
					'not_authorized'
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
							var: 'zoneClassification'
						},
						'COMMERCIAL'
					]
				},
				then: 'Commercial-zoned property: Some lenders may restrict residential loans on commercial-zoned land. Verify lender policy.'
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
		"<div class='info-title'><span class='info-icon green'>🏢</span> RERA Registration</div><div class='info-box highlight'>RERA registration is mandatory for projects over 500 sq.m. Banks verify RERA number before sanctioning loans for under-construction properties.</div>",
	options: [
		{
			label: 'Yes — RERA registered',
			value: 'REGISTERED',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'CheckCircle2'
		},
		{
			label: 'No — not registered',
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
		'==': [
			{
				var: 'purchaseType'
			},
			'direct_from_developer'
		]
	},
	warning: {
		condition: [
			{
				case: {
					'==': [
						{
							var: 'reraRegistrationStatus'
						},
						'NOT_REGISTERED'
					]
				},
				then: 'RERA registration is mandatory for developer projects over 500 sq.m. Unregistered projects face limited lender options. Verify registration status with the developer.'
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
	question: 'Is the property tax / land revenue tax being paid regularly for this plot?',
	description:
		"<div class='info-title'><span class='info-icon green'>💰</span> Municipal Tax Status</div><div class='info-box highlight'>Regular tax payment history proves the property is recognized by the municipal body — an important signal for lenders.</div>",
	options: [
		{
			label: 'Yes — paid regularly and up to date',
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
		'!=': [
			{
				var: 'propertyComplianceStatus'
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

export const q12_accessRoadStatus: RawSchemaQuestion = {
	id: 'q12_accessRoadStatus',
	bindsTo_template: 'accessRoadStatus',
	contextKey: 'accessRoadStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'route'
	},
	required: true,
	question: 'What is the road access to this plot?',
	description:
		'Road access is assessed during bank physical verification and affects plot valuation significantly.',
	options: [
		{
			label: 'Public road (12ft+ wide)',
			value: 'public_road',
			icon: 'CheckCircle'
		},
		{
			label: 'Shared / private road',
			value: 'shared_road',
			icon: 'AlertTriangle'
		},
		{
			label: 'Narrow lane (< 12ft)',
			value: 'narrow_lane',
			icon: 'AlertTriangle'
		},
		{
			label: 'No proper road access',
			value: 'no_access',
			icon: 'XCircle'
		}
	],
	showWhen: {
		'!=': [
			{
				var: 'propertyComplianceStatus'
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
							var: 'accessRoadStatus'
						},
						'no_access'
					]
				},
				then: 'Plots without proper road access are extremely difficult to finance. Banks require access for physical verification and valuation. This may result in loan rejection by most lenders.'
			}
		]
	}
};

export const q13_developmentStatus: RawSchemaQuestion = {
	id: 'q13_developmentStatus',
	bindsTo_template: 'developmentStatus',
	contextKey: 'developmentStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'construction'
	},
	required: true,
	question: 'What is the infrastructure development status of the area?',
	description:
		'Infrastructure availability (water, electricity, drainage, road) affects plot valuation and lender willingness.',
	options: [
		{
			label: 'Fully developed (water, electricity, drainage)',
			value: 'fully_developed',
			icon: 'CheckCircle2'
		},
		{
			label: 'Partially developed',
			value: 'partially_developed',
			icon: 'AlertTriangle'
		},
		{
			label: 'Undeveloped',
			value: 'undeveloped',
			icon: 'XCircle'
		},
		{
			label: 'Under development',
			value: 'under_development',
			icon: 'Loader'
		}
	],
	showWhen: {
		'!=': [
			{
				var: 'propertyComplianceStatus'
			},
			''
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
	question: 'Are there any unauthorized structures or constructions on this plot?',
	description:
		"<div class='info-box highlight'>Even vacant plots may have temporary structures, boundary encroachments, or unauthorized constructions that affect valuation and legal status.</div>",
	options: [
		{
			label: 'No unauthorized structures',
			value: 'NONE',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'CheckCircle2'
		},
		{
			label: 'Minor encroachments (temporary shed, fencing beyond boundary)',
			value: 'MINOR',
			helperText: 'Small structures or boundary deviations that can be removed or regularized',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'AlertCircle'
		},
		{
			label: 'Major unauthorized construction (permanent structure on plot)',
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
		'!=': [
			{
				var: 'propertyComplianceStatus'
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
							var: 'unauthorizedAdditions'
						},
						'MAJOR'
					]
				},
				then: 'Major unauthorized construction significantly reduces lender options. Banks will likely reject; select NBFCs may consider at lower LTV and higher rates.'
			}
		]
	}
};

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
		"<div class='info-title'><span class='info-icon blue'>🏘️</span> Colony Regularization</div><div class='info-box highlight'>Many villages and panchayat areas have colonies that were developed informally but later regularized by state government orders. Regularized colonies are accepted by more lenders.</div>",
	options: [
		{
			label: 'Yes — officially regularized',
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
	question: 'Does this plot have Gram Panchayat NOC or layout permission?',
	description:
		"<div class='info-title'><span class='info-icon green'>🏡</span> Gram Panchayat Permission</div><div class='info-box highlight'>In panchayat areas, the Gram Panchayat is the local authority that can issue NOC or layout approval for plots. This serves as proof of authorized land use.</div>",
	options: [
		{
			label: 'Yes — GP permission / NOC obtained',
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
			label: 'Not required (within municipal limits)',
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

/** Returns all questions for the Plot Condition & Compliance page */
export function getPropertyConditionPlotQuestions(): RawSchemaQuestion[] {
	return [
		q1a_propertyComplianceStatus_planned,
		q1b_propertyComplianceStatus_converted,
		q1c_propertyComplianceStatus_municipal,
		q1d_propertyComplianceStatus_colony,
		q1e_propertyComplianceStatus_unknown,
		q6_naConversionStatus,
		q6b_boundaryDemarcation,
		q10_revenueRecordStatus,
		q8_layoutApprovalStatus,
		q5_reraRegistrationStatus,
		q8_municipalTaxStatus,
		q12_accessRoadStatus,
		q13_developmentStatus,
		q9_unauthorizedAdditions,
		q11_colonyRegularizationStatus,
		q12_gramPanchayatPermission
	];
}
