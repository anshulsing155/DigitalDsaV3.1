/**
 * Business Location Questions
 * Page: locationPage
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';
import { buildBusinessLocationQuestion } from '../../schema/locationQuestions.js';

// ---------------------------------------------------------------------------
// q_businessLocation — Compound location (State + City + Pincode)
// Replaces q1_businessStateName + q2_businessCityName + q2b_businessPincode
// ---------------------------------------------------------------------------

export const q_businessLocation: RawSchemaQuestion = buildBusinessLocationQuestion();

export const q6_banksOfCurrentAccount: RawSchemaQuestion = {
	id: 'q6_banksOfCurrentAccount',
	bindsTo_template: 'banksOfCurrentAccount',
	contextKey: 'banksOfCurrentAccount',
	type: 'multiple-select',
	multipleSelectClass: 'mt-8 md:mt-12',
	uiGroup: 'select_fields',
	uiMeta: {
		placeholder: 'Select banks'
	},
	required: true,
	question: 'Which banks does the business hold accounts or facilities with?',
	description:
		"<div class='info-title'><span class='info-icon blue'>🏦</span> Business Banking Relationships</div><div class='info-box highlight'>Select every bank the business actively uses — Current Account, Overdraft, Cash Credit, or any term loan. Lenders consider existing relationships a positive signal.</div><div class='info-box tip'><span class='bold'>💡 Note:</span> OD / CC / term-loan facility details (limit, EMI, lender) are captured separately in the Obligations section — here just pick the banks.</div>",
	options: 'bankNameJSON',
	showWhen: {
		and: [{ '!=': [{ var: 'businessCityName' }, ''] }, { '!=': [{ var: 'businessStateName' }, ''] }]
	}
};

/** Returns all questions for the Business Location page */
export function getLocationPageQuestions(): RawSchemaQuestion[] {
	return [q_businessLocation, q6_banksOfCurrentAccount];
}
