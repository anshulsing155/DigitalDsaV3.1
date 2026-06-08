/**
 * Practice Location Questions
 * Page: locationPage
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';
import { buildBusinessLocationQuestion } from '../../schema/locationQuestions.js';

// ---------------------------------------------------------------------------
// q_businessLocation — Compound location (State + City + Pincode)
// Replaces q4_businessStateName + q5_businessCityName + q5b_businessPincode
// ---------------------------------------------------------------------------

export const q_businessLocation: RawSchemaQuestion = buildBusinessLocationQuestion({
	question: 'Where is the primary practice located?',
	description:
		"<div class='info-box highlight'>Select the state and city where the <span class='bold'>primary applicant's</span> practice (clinic, office, firm) is located. This determines which lenders can service the loan and which branch handles processing.</div><div class='info-box tip'><span class='bold'>💡 Joint applicants:</span> If co-applicants practice elsewhere, their location will be captured separately during income verification.</div>"
});

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
	question: 'Which banks does the practice hold accounts or facilities with?',
	description:
		"<div class='info-title'><span class='info-icon blue'>🏦</span> Practice Banking Relationships</div><div class='info-box highlight'>Select every bank the practice actively uses — Current Account, Overdraft, Cash Credit, or any term loan. Lenders consider existing relationships a positive signal.</div><div class='info-box tip'><span class='bold'>💡 Note:</span> OD / CC / term-loan facility details (limit, EMI, lender) are captured separately in the Obligations section — here just pick the banks.</div>",
	options: 'bankNameJSON',
	showWhen: {
		and: [{ '!=': [{ var: 'businessStateName' }, ''] }, { '!=': [{ var: 'businessCityName' }, ''] }]
	}
};

/** Returns all questions for the Practice Location page */
export function getLocationPageQuestions(): RawSchemaQuestion[] {
	return [q_businessLocation, q6_banksOfCurrentAccount];
}
