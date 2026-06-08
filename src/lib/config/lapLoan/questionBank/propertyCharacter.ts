/**
 * Property Character Questions
 * Page: propertyCharacter_LAP
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';

export const q1_categoryOfProperty: RawSchemaQuestion = {
	id: 'q1_categoryOfProperty',
	bindsTo_template: 'categoryOfProperty',
	contextKey: 'categoryOfProperty',
	type: 'radio',
	radioClass: 'mt-[1rem] md:mt-[2rem]',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'What category of property is being offered as collateral?',
	description:
		"<div class='info-title'><span class='info-icon blue'>🏢</span> Property Category</div><div class='info-box highlight'>Residential properties get the best LAP terms (60-70% LTV). Commercial (50-60%) and industrial (40-55%) have lower LTV and fewer lender options.</div>",
	options: [
		{
			label: 'Residential',
			value: 'Residential',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Home'
		},
		{
			label: 'Commercial',
			value: 'Commercial',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Building2'
		},
		{
			label: 'Industrial',
			value: 'Industrial',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'Factory'
		},
		{
			label: 'Mixed-use (Residential + Commercial)',
			value: 'Mixed',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'LayoutGrid'
		}
	],
	showWhen: {
		'!=': [
			{
				var: 'propertyAreaType'
			},
			''
		]
	}
};

export const q2_constructionType: RawSchemaQuestion = {
	id: 'q2_constructionType',
	bindsTo_template: 'constructionType',
	contextKey: 'constructionType',
	type: 'select',
	uiGroup: 'select_fields',
	selectClass: 'mt-8 md:mt-12',
	uiMeta: {
		placeholder: 'Choose Construction Type',
		icon: 'construction'
	},
	required: true,
	question: 'What type of construction is it?',
	options: [
		{
			label: 'House / Villa',
			value: 'House',
			showWhen: {
				in: [
					{
						var: 'categoryOfProperty'
					},
					['Residential', 'Mixed']
				]
			}
		},
		{
			label: 'Independent Floor',
			value: 'Floor',
			showWhen: {
				in: [
					{
						var: 'categoryOfProperty'
					},
					['Residential', 'Mixed']
				]
			}
		},
		{
			label: 'Flat (Apartment)',
			value: 'Flat',
			showWhen: {
				in: [
					{
						var: 'categoryOfProperty'
					},
					['Residential', 'Commercial', 'Mixed']
				]
			}
		},
		{
			label: 'Row House',
			value: 'Row House',
			showWhen: {
				in: [
					{
						var: 'categoryOfProperty'
					},
					['Residential', 'Mixed']
				]
			}
		},
		{
			label: 'Shop / Showroom',
			value: 'Shop',
			showWhen: {
				in: [
					{
						var: 'categoryOfProperty'
					},
					['Commercial', 'Mixed']
				]
			}
		},
		{
			label: 'Office Space',
			value: 'Office',
			showWhen: {
				in: [
					{
						var: 'categoryOfProperty'
					},
					['Commercial', 'Mixed']
				]
			}
		},
		{
			label: 'Commercial Building',
			value: 'Building',
			showWhen: {
				'==': [
					{
						var: 'categoryOfProperty'
					},
					'Commercial'
				]
			}
		},
		{
			label: 'Warehouse / Godown',
			value: 'Warehouse',
			showWhen: {
				in: [
					{
						var: 'categoryOfProperty'
					},
					['Commercial', 'Industrial']
				]
			}
		},
		{
			label: 'Factory / Manufacturing Unit',
			value: 'Factory',
			showWhen: {
				'==': [
					{
						var: 'categoryOfProperty'
					},
					'Industrial'
				]
			}
		},
		{
			label: 'Industrial Shed',
			value: 'Industrial Shed',
			showWhen: {
				'==': [
					{
						var: 'categoryOfProperty'
					},
					'Industrial'
				]
			}
		},
		{
			label: 'Vacant Plot (with boundary wall)',
			value: 'Plot'
		}
	],
	showWhen: {
		'!=': [
			{
				var: 'categoryOfProperty'
			},
			''
		]
	},
	warning: {
		condition: [
			{
				// Session 33: Item 10 — Mixed-use needs both residential + commercial details
				case: {
					and: [
						{ '==': [{ var: 'categoryOfProperty' }, 'Mixed'] },
						{ '!=': [{ var: 'constructionType' }, ''] }
					]
				},
				then: 'Mixed-use property: lenders will assess both residential and commercial portions separately. Some lenders may not finance mixed-use properties, and LTV will typically be based on the lower-value component.'
			},
			{
				case: {
					'==': [
						{
							var: 'constructionType'
						},
						'Plot'
					]
				},
				then: 'Very few lenders offer LAP on vacant plots. Expect limited options and lower LTV (40-50%).'
			}
		]
	}
};

export const q3_propertyType: RawSchemaQuestion = {
	id: 'q3_propertyType',
	bindsTo_template: 'propertyType',
	contextKey: 'propertyType',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	required: true,
	question: 'What is the type of ownership for this property?',
	description:
		"<div class='info-title'><span class='info-icon gold'>📜</span> Ownership Type</div><div class='info-box highlight'>Freehold properties get better loan terms. Leasehold with less than 20 years remaining is nearly impossible to finance.</div>",
	options: [
		{
			label: 'Freehold',
			value: 'Free Hold',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'FileText'
		},
		{
			label: 'Leasehold',
			value: 'Lease Hold',
			uiMeta: {
				icon: 'Circle'
			},
			icon: 'FileKey'
		}
	],
	showWhen: {
		'!=': [
			{
				var: 'constructionType'
			},
			''
		]
	}
};

export const q4_leaseRemainingPeriod: RawSchemaQuestion = {
	id: 'q4_leaseRemainingPeriod',
	bindsTo_template: 'leaseRemainingPeriod',
	contextKey: 'leaseRemainingPeriod',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select remaining lease period',
		icon: 'calendar'
	},
	required: true,
	question: 'How many years are remaining on the lease?',
	options: [
		{
			label: 'More than 30 years',
			value: 'MORE_THAN_30'
		},
		{
			label: '20 to 30 years',
			value: '20_TO_30'
		},
		{
			label: '10 to 20 years',
			value: '10_TO_20'
		},
		{
			label: 'Less than 10 years',
			value: 'LESS_THAN_10'
		}
	],
	showWhen: {
		'==': [
			{
				var: 'propertyType'
			},
			'Lease Hold'
		]
	},
	warning: {
		condition: [
			{
				case: {
					in: [
						{
							var: 'leaseRemainingPeriod'
						},
						['10_TO_20', 'LESS_THAN_10']
					]
				},
				then: 'Leasehold properties with less than 20 years remaining are extremely difficult to finance. Most banks will reject.'
			}
		]
	}
};

export const q3_propertyAge: RawSchemaQuestion = {
	id: 'q3_propertyAge',
	bindsTo_template: 'propertyAge',
	contextKey: 'propertyAge',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select Property Age',
		icon: 'calendar'
	},
	required: true,
	question: 'How old is this property?',
	description:
		"<div class='info-title'><span class='info-icon blue'>🏠</span> Property Age</div><div class='info-box highlight'>The age of the property affects loan eligibility, maximum tenure, and valuation.</div>",
	options: [
		{
			label: 'New (0–5 years)',
			value: '0-5'
		},
		{
			label: '6–10 years',
			value: '6-10'
		},
		{
			label: '11–15 years',
			value: '11-15'
		},
		{
			label: '16–20 years',
			value: '16-20'
		},
		{
			label: '21–25 years',
			value: '21-25'
		},
		{
			label: '26–30 years',
			value: '26-30'
		},
		{
			label: 'Over 30 years',
			value: '30+'
		}
	],
	showWhen: {
		and: [
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

	// FG-2 #16: Cross-validate property age against property type and leasehold tenure.
	// Very old properties (26+ years) have structural concerns that affect valuation and LTV.
	// Also warn if property age pushes total age beyond typical 40-year lender limit.
	warning: {
		condition: [
			{
				case: {
					and: [
						{ in: [{ var: 'propertyAge' }, ['30+']] },
						{ '==': [{ var: 'propertyType' }, 'Lease Hold'] }
					]
				},
				then: 'Property is over 30 years old and leasehold — most lenders will decline. Total property age at loan maturity will likely exceed limits, and structural depreciation further reduces valuation.'
			},
			{
				case: {
					'==': [{ var: 'propertyAge' }, '30+']
				},
				then: 'Property is over 30 years old — expect reduced valuation, lower LTV (40-50%), and fewer lender options. Structural assessment may be required. Total property age at loan end must stay within 40 years.'
			},
			{
				case: {
					'==': [{ var: 'propertyAge' }, '26-30']
				},
				then: 'Property is 26-30 years old — loan tenure will be capped so total property age at maturity does not exceed 40 years. Structural assessment likely required.'
			}
		]
	}
};

export const q4_carpetArea: RawSchemaQuestion = {
	id: 'q4_carpetArea',
	bindsTo_template: 'carpetArea',
	contextKey: 'carpetArea',
	type: 'text',
	uiType: 'number',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter carpet / plot area',
		showAreaUnitDropdown: true,
		showNumberInWords: true,
		maxLength: 6
	},
	required: true,
	minLimit: 100,
	maxLimit: 50000,
	question: 'What is the carpet area / plot area?',
	description:
		"<div class='info-title'><span class='info-icon blue'>📏</span> Carpet / Plot Area</div><div class='info-box highlight'>For constructed properties, enter carpet area (usable floor area). For plots, enter total plot area. Primary metric for valuation.</div>",
	validation: {
		condition: [
			{
				case: {
					'<': [
						{
							var: 'carpetArea'
						},
						100
					]
				},
				then: 'Carpet area seems too low. Please enter the area in square feet.'
			},
			{
				case: {
					'>': [
						{
							var: 'carpetArea'
						},
						50000
					]
				},
				then: 'Please enter a valid carpet area in square feet.'
			}
		]
	},
	showWhen: {
		'!=': [
			{
				var: 'constructionType'
			},
			''
		]
	}
};

export const q7_builtArea: RawSchemaQuestion = {
	id: 'q7_builtArea',
	bindsTo_template: 'builtArea',
	contextKey: 'builtArea',
	type: 'text',
	uiType: 'number',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter built-up area',
		showAreaUnitDropdown: true,
		showNumberInWords: true,
		maxLength: 5
	},
	required: false,
	minLimit: 100,
	maxLimit: 50000,
	question: 'Built-up area (if known)',
	showWhen: {
		in: [
			{
				var: 'constructionType'
			},
			['Flat', 'Floor', 'Building', 'Office']
		]
	}
};

/** Returns all questions for the Property Character page */
export function getPropertyCharacterLapQuestions(): RawSchemaQuestion[] {
	return [
		q1_categoryOfProperty,
		q2_constructionType,
		q3_propertyType,
		q4_leaseRemainingPeriod,
		q3_propertyAge,
		q4_carpetArea,
		q7_builtArea
	];
}
