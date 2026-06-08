/**
 * Property & Applicant Location Questions
 * Page: propertyIdentificationPage
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';
import { buildPropertyLocationQuestion } from '../../schema/locationQuestions.js';

// ---------------------------------------------------------------------------
// q_propertyLocation — Compound location (State + City + Area + Pincode)
// Replaces q2_propertyStateName + q3_propertyCityName + q3b_propertyPincode
// ---------------------------------------------------------------------------

export const q_propertyLocation: RawSchemaQuestion = buildPropertyLocationQuestion({
	showWhen: { '!=': [{ var: 'loanType' }, ''] }
});

export const q4_applicantResidingInProperty: RawSchemaQuestion = {
	id: 'q4_applicantResidingInProperty',
	bindsTo_template: 'applicantResidingInProperty',
	contextKey: 'applicantResidingInProperty',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,
	question: 'Are any of the applicants currently residing in this property?',
	descriptionHeader:
		'This helps lenders understand if the property being mortgaged is self-occupied or used differently.',
	options: [
		{
			label: 'Yes',
			value: 'Yes',
			uiMeta: { icon: 'Circle' },
			icon: 'ThumbsUp',
			labelDescription: 'One or more applicants live in this property'
		},
		{
			label: 'No',
			value: 'No',
			uiMeta: { icon: 'Circle' },
			icon: 'ThumbsDown',
			labelDescription: 'No applicant resides in this property'
		}
	],
	showWhen: {
		'!=': [{ var: 'propertyCityName' }, '']
	}
};

// ---------------------------------------------------------------------------
// q5_propertyOccupancyStatus — What is the property's current status?
// Shown only when no applicant resides in the property.
// ---------------------------------------------------------------------------

export const q5_propertyOccupancyStatus: RawSchemaQuestion = {
	id: 'q5_propertyOccupancyStatus',
	bindsTo_template: 'propertyOccupancyStatus',
	contextKey: 'propertyOccupancyStatus',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	uiMeta: { icon: 'Building' },
	required: true,
	question: 'What is the current status of the property?',
	description:
		"<div class='info-box'>Property occupancy status affects LTV ratios and lender policies. Rented properties may require rental agreement documentation.</div>",
	options: [
		{
			label: 'Rented Out',
			value: 'rented_out',
			uiMeta: { icon: 'Circle' },
			icon: 'KeyRound',
			labelDescription: 'Property is rented to a tenant'
		},
		{
			label: 'Vacant',
			value: 'vacant',
			uiMeta: { icon: 'Circle' },
			icon: 'DoorOpen',
			labelDescription: 'Property is currently unoccupied'
		},
		{
			label: 'Commercial Use',
			value: 'commercial_use',
			uiMeta: { icon: 'Circle' },
			icon: 'Store',
			labelDescription: 'Property is used for business or commercial purposes'
		},
		{
			label: 'Mixed (Partially Rented)',
			value: 'mixed',
			uiMeta: { icon: 'Circle' },
			icon: 'LayoutGrid',
			labelDescription: 'Part of the property is rented, part is used differently'
		},
		{
			label: 'Given to Family / Relatives',
			value: 'family_use',
			uiMeta: { icon: 'Circle' },
			icon: 'Users',
			labelDescription: 'Occupied by family members who are not applicants'
		},
		{
			label: 'Other',
			value: 'other',
			uiMeta: { icon: 'Circle' },
			icon: 'HelpCircle',
			labelDescription: 'Does not fit the above categories'
		}
	],
	showWhen: {
		'==': [{ var: 'applicantResidingInProperty' }, 'No']
	}
};

// ---------------------------------------------------------------------------
// LEGACY: Old individual questions kept for optionResolver backward compat.
// NOT included in getPropertyIdentificationPageQuestions().
// ---------------------------------------------------------------------------

/** @deprecated Use q_propertyLocation instead. Kept for optionResolver backward compat. */
export const q2_propertyStateName: RawSchemaQuestion = {
	id: 'q2_propertyStateName',
	bindsTo_template: 'propertyStateName',
	contextKey: 'propertyStateName',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'State Property state',
		icon: 'map'
	},
	subLabel: 'State name',
	question: 'Where your property is located?',
	required: true,
	showWhen: {
		'!=': [{ var: 'loanType' }, '']
	}
};

/** @deprecated Use q_propertyLocation instead. Kept for optionResolver backward compat. */
export const q3_propertyCityName: RawSchemaQuestion = {
	id: 'q3_propertyCityName',
	bindsTo_template: 'propertyCityName',
	contextKey: 'propertyCityName',
	type: 'derivedSelect',
	derivedClass: 'mt-[0.1rem]',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select City name',
		icon: 'map-pin'
	},
	subLabel: 'City name',
	required: true,
	question: ''
};

/** @deprecated Use q_propertyLocation instead. Kept for optionResolver backward compat. */
export const q3b_propertyPincode: RawSchemaQuestion = {
	id: 'q3b_propertyPincode',
	bindsTo_template: 'propertyPincode',
	contextKey: 'propertyPincode',
	type: 'text',
	fieldType: 'pincode',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter 6-digit pincode',
		icon: 'map-pin'
	},
	required: false,
	question: 'Property pincode (if known)',
	descriptionHeader:
		'Accurate pincode helps identify negative areas for bank filtering — incorrect pincode may lead to wrong lender matches.',
	showWhen: {
		'!=': [{ var: 'propertyCityName' }, '']
	}
};

/** @deprecated Use q_residenceLocation instead. Kept for optionResolver backward compat. */
export const q5_residenceStateName: RawSchemaQuestion = {
	id: 'q5_residenceStateName',
	bindsTo_template: 'residenceStateName',
	contextKey: 'residenceStateName',
	type: 'select',
	selectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select residence state',
		icon: 'map'
	},
	subLabel: 'State name',
	question: 'Applicant residence location in India (State)',
	description:
		'Select the Indian state where the applicant currently resides. For NRI applicants, select the city of nearest family member or GPA (General Power of Attorney) holder.',
	required: true,
	showWhen: {
		'==': [{ var: 'residenceOptionSame' }, 'No']
	}
};

/** @deprecated Use q_residenceLocation instead. Kept for optionResolver backward compat. */
export const q6_residenceCityName: RawSchemaQuestion = {
	id: 'q6_residenceCityName',
	bindsTo_template: 'residenceCityName',
	contextKey: 'residenceCityName',
	type: 'derivedSelect',
	uiGroup: 'select_fields',
	derivedClass: 'mt-[0.1rem]',
	uiMeta: {
		placeholder: 'Select a City',
		icon: 'map-pin'
	},
	subLabel: 'City name',
	required: true,
	showWhen: {
		and: [
			{ '==': [{ var: 'residenceOptionSame' }, 'No'] },
			{ '!=': [{ var: 'residenceStateName' }, ''] }
		]
	},
	question: ''
};

/** @deprecated Use q_residenceLocation instead. Kept for optionResolver backward compat. */
export const q6b_residencePincode: RawSchemaQuestion = {
	id: 'q6b_residencePincode',
	bindsTo_template: 'residencePincode',
	contextKey: 'residencePincode',
	type: 'text',
	fieldType: 'pincode',
	textFieldClass: 'mt-8 md:mt-12',
	uiGroup: 'inputNumber',
	uiMeta: {
		placeholder: 'Enter 6-digit pincode',
		icon: 'map-pin'
	},
	required: false,
	question: 'Residence pincode (if known)',
	descriptionHeader: 'Helps verify applicant location for lender matching.',
	showWhen: {
		and: [
			{ '==': [{ var: 'residenceOptionSame' }, 'No'] },
			{ '!=': [{ var: 'residenceCityName' }, ''] }
		]
	}
};

/** Returns all questions for the Property & Applicant Location page */
export function getPropertyIdentificationPageQuestions(): RawSchemaQuestion[] {
	return [q_propertyLocation, q4_applicantResidingInProperty, q5_propertyOccupancyStatus];
}
