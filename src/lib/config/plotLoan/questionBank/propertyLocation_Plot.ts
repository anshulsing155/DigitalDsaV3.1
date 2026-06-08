/**
 * Plot Area & Location Questions
 * Page: propertyLocation_Plot
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';
import { PROPERTY_AREA_TYPE_BASE_OPTIONS } from '../../schema/propertyAreaTypeOptions.js';

export const q1_propertyAreaType: RawSchemaQuestion = {
	id: 'q1_propertyAreaType',
	bindsTo_template: 'propertyAreaType',
	contextKey: 'propertyAreaType',
	type: 'select',
	selectClass: 'mt-[1rem] md:mt-[2rem]',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select Area Type',
		icon: 'map-pin'
	},
	required: true,
	question: 'Which type of area is this plot located in?',
	description:
		"<div class='info-title'><span class='info-icon blue'>📍</span> Property Area Type</div><div class='info-box highlight'>The surrounding area helps determine which lenders can finance the property.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Choose the option that best matches how the area looks and is commonly described.</div>",
	options: PROPERTY_AREA_TYPE_BASE_OPTIONS,

	// FG-2 #15: Negative area detection — remind DSAs that specific localities
	// may be on bank negative lists even if the broader city/pincode is serviceable.
	warning: {
		condition: [
			{
				case: {
					in: [{ var: 'propertyAreaType' }, ['CONVERTED_RESIDENTIAL', 'LOCAL_COLONY']]
				},
				then: 'Converted land and local colony areas are frequently on bank negative lists for plot loans. Even if the city is serviceable, the specific locality may be excluded. Ensure the exact pincode is entered for accurate lender matching during evaluation.'
			}
		]
	}
};

export const q3_landUseClassification: RawSchemaQuestion = {
	id: 'q3_landUseClassification',
	bindsTo_template: 'landUseClassification',
	contextKey: 'landUseClassification',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'radio_fields',
	uiMeta: {
		icon: 'land-plot'
	},
	required: true,
	question: 'What is the land use classification of this plot?',
	description:
		"<div class='info-title'><span class='info-icon blue'>🏗️</span> Land Use Classification</div><div class='info-box highlight'>Land classification determines whether the plot is financeable. Agricultural land CANNOT be financed through standard bank loans — NA conversion must be completed first.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Check the 7/12 extract, Patta, or revenue records for the official land classification. If converted, keep the NA Sanad/order ready.</div>",
	options: [
		{
			label: 'Residential',
			value: 'residential',
			icon: 'Home'
		},
		{
			label: 'Commercial',
			value: 'commercial',
			icon: 'Building2'
		},
		{
			label: 'Agricultural',
			value: 'agricultural',
			icon: 'Wheat',
			showWhen: {
				'!': {
					in: [{ var: 'propertyAreaType' }, ['PLANNED_AUTHORITY']]
				}
			}
		},
		{
			label: 'Industrial',
			value: 'industrial',
			icon: 'Factory',
			showWhen: {
				'!': {
					in: [{ var: 'propertyAreaType' }, ['PLANNED_AUTHORITY']]
				}
			}
		},
		{
			label: 'Mixed Use',
			value: 'mixed_use',
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
	},
	warning: {
		condition: [
			{
				case: {
					'==': [
						{
							var: 'landUseClassification'
						},
						'agricultural'
					]
				},
				then: 'Agricultural land cannot be financed through standard bank loans. NA (Non-Agricultural) conversion must be completed first. If conversion is in progress, the loan can only be processed after the NA Sanad/order is obtained.'
			},
			{
				case: {
					'==': [
						{
							var: 'landUseClassification'
						},
						'industrial'
					]
				},
				then: 'Industrial plot financing is handled as a project/business loan by most lenders. Standard plot loan products may not be available. Consider applying under Business Loan if this is for commercial/industrial use.'
			}
		]
	}
};

/** Returns all questions for the Plot Area & Location page */
export function getPropertyLocationPlotQuestions(): RawSchemaQuestion[] {
	return [q1_propertyAreaType, q3_landUseClassification];
}
