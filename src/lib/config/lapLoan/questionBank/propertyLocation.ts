/**
 * Property Area & Location Questions
 * Page: propertyLocation_LAP
 *
 * Questions vary by area type:
 *   ALL:               q1_propertyAreaType, q6_floodDisasterZone
 *   PLANNED_AUTHORITY:  q2_societyStatus, q3_pendingSocietyDues
 *   Non-planned:        q4_approachRoadWidth, q5_restrictedZone
 *     (CONVERTED_RESIDENTIAL, OLD_MUNICIPAL, LOCAL_COLONY, UNKNOWN)
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';
import { PROPERTY_AREA_TYPE_BASE_OPTIONS } from '../../schema/propertyAreaTypeOptions.js';

// Area type constants for showWhen conditions
const NON_PLANNED_AREAS = ['CONVERTED_RESIDENTIAL', 'OLD_MUNICIPAL', 'LOCAL_COLONY', 'UNKNOWN'];

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
	question: 'Which type of area is this property located in?',
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
				then: 'Converted land and local colony areas are frequently on bank negative lists for LAP. Even if the city is serviceable, the specific locality may be excluded. Ensure the exact pincode is entered for accurate lender matching during evaluation.'
			}
		]
	}
};

// ---------------------------------------------------------------------------
// PLANNED AREA questions — society/association context
// ---------------------------------------------------------------------------

export const q2_societyStatus: RawSchemaQuestion = {
	id: 'q2_societyStatus',
	bindsTo_template: 'societyStatus',
	contextKey: 'societyStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	uiMeta: { icon: 'Building2' },
	required: true,
	question: 'Is the property part of a registered society or association?',
	description:
		"<div class='info-box'>For LAP, lenders require a No Objection Certificate (NOC) from the cooperative society or apartment association to create the mortgage. The NOC process varies by society type.</div>",
	options: [
		{
			label: 'Registered Cooperative Society',
			value: 'COOPERATIVE',
			uiMeta: { icon: 'Circle' },
			icon: 'Users',
			labelDescription: 'Society registered under state cooperative act'
		},
		{
			label: 'Apartment Owners Association (AOA)',
			value: 'AOA',
			uiMeta: { icon: 'Circle' },
			icon: 'Building',
			labelDescription: 'Registered under Apartment Ownership Act or society act'
		},
		{
			label: 'RWA (Resident Welfare Association)',
			value: 'RWA',
			uiMeta: { icon: 'Circle' },
			icon: 'Home',
			labelDescription: 'Informal or semi-formal residents group'
		},
		{
			label: 'No society / Independent property',
			value: 'NONE',
			uiMeta: { icon: 'Circle' },
			icon: 'User',
			labelDescription: 'Standalone house, villa, or plot — no society involvement'
		}
	],
	showWhen: {
		
			 '==': [{ var: 'propertyAreaType' }, 'PLANNED_AUTHORITY'] ,
			
	
	},
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'societyStatus' }, 'COOPERATIVE'] },
				then: 'Cooperative society NOC is mandatory for LAP. Some societies charge a transfer fee (0.5-1% of loan amount). Check with the society secretary early.'
			}
		]
	}
};

export const q3_pendingSocietyDues: RawSchemaQuestion = {
	id: 'q3_pendingSocietyDues',
	bindsTo_template: 'pendingSocietyDues',
	contextKey: 'pendingSocietyDues',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	uiMeta: { icon: 'Receipt' },
	required: true,
	question: 'Are there any pending dues to the society or development authority?',
	description:
		"<div class='info-box'>Pending maintenance charges, transfer fees, or authority dues can delay or block NOC issuance. Lenders may require a no-dues certificate.</div>",
	options: [
		{
			label: 'No pending dues',
			value: 'CLEAR',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2',
			labelDescription: 'All maintenance and authority charges are up to date'
		},
		{
			label: 'Minor dues pending',
			value: 'MINOR',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertCircle',
			labelDescription: 'Small amounts pending — can be cleared quickly'
		},
		{
			label: 'Significant dues pending',
			value: 'SIGNIFICANT',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle',
			labelDescription: 'Large pending amounts — may delay NOC'
		},
		{
			label: 'Not sure',
			value: 'UNKNOWN',
			uiMeta: { icon: 'Circle' },
			icon: 'HelpCircle',
			labelDescription: 'Need to check with society/authority'
		}
	],
	showWhen: {
		and: [
			{ '==': [{ var: 'propertyAreaType' }, 'PLANNED_AUTHORITY'] },
			{ in: [{ var: 'societyStatus' }, ['COOPERATIVE', 'AOA', 'RWA']] }
		]
	},
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'pendingSocietyDues' }, 'SIGNIFICANT'] },
				then: 'Significant pending dues will block NOC issuance. Society or authority dues must be cleared before the lender can proceed with mortgage creation.'
			}
		]
	}
};

// ---------------------------------------------------------------------------
// NON-PLANNED AREA questions — infrastructure & zoning risks
// Shown for: CONVERTED_RESIDENTIAL, OLD_MUNICIPAL, LOCAL_COLONY, UNKNOWN
// ---------------------------------------------------------------------------

export const q4_approachRoadWidth: RawSchemaQuestion = {
	id: 'q4_approachRoadWidth',
	bindsTo_template: 'approachRoadWidth',
	contextKey: 'approachRoadWidth',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	uiMeta: { icon: 'Route' },
	required: true,
	question: 'What is the width of the approach road to the property?',
	description:
		"<div class='info-box'>Some lenders require a minimum approach road width (typically 12 ft or more) for independent properties. Narrow access can limit options.</div>",
	options: [
		{
			label: 'Wide (20 ft+)',
			value: 'WIDE_20_PLUS',
			uiMeta: { icon: 'Circle' },
			icon: 'ArrowLeftRight',
			labelDescription: 'Main road or wide internal road'
		},
		{
			label: 'Standard (12–20 ft)',
			value: 'STANDARD_12_20',
			uiMeta: { icon: 'Circle' },
			icon: 'MoveHorizontal',
			labelDescription: 'Most lenders accept this width'
		},
		{
			label: 'Narrow (8–12 ft)',
			value: 'NARROW_8_12',
			uiMeta: { icon: 'Circle' },
			icon: 'Shrink',
			labelDescription: 'Some lenders may restrict — common in older areas'
		},
		{
			label: 'Very Narrow (< 8 ft)',
			value: 'VERY_NARROW_UNDER_8',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle',
			labelDescription: 'Limited lender options — mostly NBFCs only'
		}
	],
	showWhen: {
		in: [{ var: 'propertyAreaType' }, NON_PLANNED_AREAS]
	},
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'approachRoadWidth' }, 'VERY_NARROW_UNDER_8'] },
				then: 'Properties with approach road under 8 ft are rejected by most banks. Only select NBFCs and housing finance companies may consider at lower LTV.'
			},
			{
				case: { '==': [{ var: 'approachRoadWidth' }, 'NARROW_8_12'] },
				then: 'Narrow approach roads may reduce lender options. Some banks have a minimum 12 ft road width policy for independent properties.'
			}
		]
	}
};

export const q5_restrictedZone: RawSchemaQuestion = {
	id: 'q5_restrictedZone',
	bindsTo_template: 'restrictedZone',
	contextKey: 'restrictedZone',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	uiMeta: { icon: 'ShieldAlert' },
	required: true,
	question: 'Is the property in any restricted or special zone?',
	description:
		"<div class='info-box'>Properties in restricted zones are either rejected outright or have very limited lender options. If unsure, select 'No restriction' — the lender's legal team will verify during processing.</div>",
	options: [
		{
			label: 'No restriction',
			value: 'NONE',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2',
			labelDescription: 'Standard residential / commercial area'
		},
		{
			label: 'Cantonment / Defence area',
			value: 'CANTONMENT',
			uiMeta: { icon: 'Circle' },
			icon: 'Shield',
			labelDescription: 'Defence ministry controlled land'
		},
		{
			label: 'CRZ (Coastal Regulation Zone)',
			value: 'CRZ',
			uiMeta: { icon: 'Circle' },
			icon: 'Waves',
			labelDescription: 'Within coastal regulation boundary'
		},
		{
			label: 'Tribal / Adivasi area',
			value: 'TRIBAL',
			uiMeta: { icon: 'Circle' },
			icon: 'TreePine',
			labelDescription: 'Scheduled tribe land with transfer restrictions'
		},
		{
			label: 'Heritage / Protected monument zone',
			value: 'HERITAGE',
			uiMeta: { icon: 'Circle' },
			icon: 'Landmark',
			labelDescription: 'ASI / state heritage zone with construction restrictions'
		},
		{
			label: 'Airport / Flyover height restriction',
			value: 'AIRPORT',
			uiMeta: { icon: 'Circle' },
			icon: 'Plane',
			labelDescription: 'Height restriction zone near airport or flyover approach'
		}
	],
	showWhen: {
		in: [{ var: 'propertyAreaType' }, NON_PLANNED_AREAS]
	},
	warning: {
		condition: [
			{
				case: {
					in: [{ var: 'restrictedZone' }, ['CANTONMENT', 'TRIBAL']]
				},
				then: 'Cantonment and Tribal land properties are rejected by virtually all lenders due to transfer restrictions. Financing is extremely unlikely.'
			},
			{
				case: { '==': [{ var: 'restrictedZone' }, 'CRZ'] },
				then: 'CRZ properties face strict restrictions. Only properties in CRZ-II (commercial zone) with valid CRZ clearance may be considered by select lenders.'
			},
			{
				case: { '==': [{ var: 'restrictedZone' }, 'HERITAGE'] },
				then: 'Heritage zone properties have construction/modification restrictions. Lenders may approve existing structures but not new construction.'
			},
			{
				case: { '==': [{ var: 'restrictedZone' }, 'AIRPORT'] },
				then: 'Airport height restriction zone — affects property valuation and future development potential. Most lenders accept with verified clearance.'
			}
		]
	}
};

// ---------------------------------------------------------------------------
// ALL AREAS — flood/disaster zone
// ---------------------------------------------------------------------------

export const q6_floodDisasterZone: RawSchemaQuestion = {
	id: 'q6_floodDisasterZone',
	bindsTo_template: 'floodDisasterZone',
	contextKey: 'floodDisasterZone',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	uiMeta: { icon: 'CloudRain' },
	required: true,
	question: 'Is the property in a flood-prone or disaster-prone area?',
	description:
		"<div class='info-box'>Properties in frequently flooded or disaster-prone areas may face higher insurance requirements and lower valuations from lenders.</div>",
	options: [
		{
			label: 'No — safe area',
			value: 'No',
			uiMeta: { icon: 'Circle' },
			icon: 'CheckCircle2',
			labelDescription: 'No known flood or disaster risk'
		},
		{
			label: 'Yes — flood prone',
			value: 'FLOOD',
			uiMeta: { icon: 'Circle' },
			icon: 'Droplets',
			labelDescription: 'Area experiences regular waterlogging or flooding'
		},
		{
			label: 'Yes — earthquake / landslide zone',
			value: 'SEISMIC',
			uiMeta: { icon: 'Circle' },
			icon: 'Mountain',
			labelDescription: 'In a seismic zone or landslide-prone hilly area'
		},
		{
			label: 'Not sure',
			value: 'UNKNOWN',
			uiMeta: { icon: 'Circle' },
			icon: 'HelpCircle',
			labelDescription: 'Unsure about the risk classification'
		}
	],
	showWhen: {
		'!=': [{ var: 'propertyAreaType' }, '']
	},
	warning: {
		condition: [
			{
				case: { '==': [{ var: 'floodDisasterZone' }, 'FLOOD'] },
				then: 'Flood-prone properties may require additional insurance and face reduced valuations. Some lenders add 0.25-0.50% to the interest rate.'
			},
			{
				case: { '==': [{ var: 'floodDisasterZone' }, 'SEISMIC'] },
				then: 'Properties in high seismic zones need earthquake-resistant construction certification. Lenders may require structural stability report.'
			}
		]
	}
};

/** Returns all questions for the Property Area & Location page */
export function getPropertyLocationLapQuestions(): RawSchemaQuestion[] {
	return [
		q1_propertyAreaType,
		// Planned area: society + dues
		q2_societyStatus,
		q3_pendingSocietyDues,
		// Non-planned: road width + restricted zone
		q4_approachRoadWidth,
		q5_restrictedZone,
		// All areas: flood/disaster
		q6_floodDisasterZone
	];
}
