/**
 * Case Intake questions for home loan (page: caseIntake_homeLoan).
 *
 * 2 questions:
 *   q1_priorAssessmentHistory — switch-based dynamic text by loanType
 *   q2_propertyIdentified     — simple radio, gated to New Loan only
 *
 * Source of truth: homeLoanSchemaV2.json pages[0]
 */

import type { RawSchemaQuestion } from '../types.js';

// ---------------------------------------------------------------------------
// q1 — Prior Assessment History
// ---------------------------------------------------------------------------

export const q1_priorAssessmentHistory: RawSchemaQuestion = {
	id: 'q1_priorAssessmentHistory',
	bindsTo_template: 'priorAssessmentHistory',
	contextKey: 'priorAssessmentHistory',
	type: 'radio',
	radioClass: 'mt-[2rem] md:mt-[3rem]',
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	uiMeta: { icon: 'ClipboardList' },
	required: true,

	// Dynamic question text — varies by loan type
	question: {
		switch: [
			{
				case: { '==': [{ var: 'loanType' }, 'Top-up Only'] },
				then: 'Has this property been recently assessed for top-up eligibility?'
			},
			{
				case: {
					in: [{ var: 'loanType' }, ['Balance Transfer Only', 'Balance Transfer With Top-up']]
				},
				then: 'Was this property assessed during the original home loan?'
			}
		],
		default: 'Has this property been assessed for loan eligibility in the past?'
	} as unknown as string, // SwitchArray with default — cast required for type compat

	// Dynamic description — varies by loan type
	description: {
		switch: [
			{
				case: { '==': [{ var: 'loanType' }, 'Top-up Only'] },
				then: "<div class='info-title'><span class='info-icon'>💡</span> Prior Top-up Assessment</div><div class='info-box'>This helps us understand if any recent reports are available for the top-up evaluation.</div>"
			},
			{
				case: {
					in: [{ var: 'loanType' }, ['Balance Transfer Only', 'Balance Transfer With Top-up']]
				},
				then: "<div class='info-title'><span class='info-icon'>💡</span> Original Loan Assessment</div><div class='info-box'>This helps us reference earlier assessments and check for any changes since original approval.</div>"
			}
		],
		default:
			"<div class='info-title'><span class='info-icon'>💡</span> Prior Assessment</div><div class='info-box'>This helps us understand if any earlier reports or assessments are available for reference.</div>"
	} as unknown as string,

	options: [
		{
			label: 'First assessment',
			value: 'first_assessment',
			uiMeta: { icon: 'Circle' },
			icon: 'Star'
		},
		{
			label: 'Assessed by 1-2 lenders',
			value: 'assessed_1_2',
			uiMeta: { icon: 'Circle' },
			icon: 'Users',
			// Top-up: lender count isn't meaningful — property already assessed
			showWhen: { '!=': [{ var: 'loanType' }, 'Top-up Only'] }
		},
		{
			label: 'Assessed by 3+ lenders',
			value: 'assessed_3_plus',
			uiMeta: { icon: 'Circle' },
			icon: 'UserPlus',
			// Top-up: lender count isn't meaningful — property already assessed
			showWhen: { '!=': [{ var: 'loanType' }, 'Top-up Only'] }
		},
		{
			label: 'Previously rejected',
			value: 'previously_rejected',
			uiMeta: { icon: 'Circle' },
			icon: 'AlertTriangle'
		}
	],

	// Contextual warning for high-risk selections
	warning: {
		condition: [
			{
				case: {
					in: [{ var: 'priorAssessmentHistory' }, ['assessed_3_plus', 'previously_rejected']]
				},
				then: "Cases with multiple prior assessments or rejections may have limited lender options. We'll match you with lenders who specialize in such cases."
			}
		]
	}
};

// ---------------------------------------------------------------------------
// q2 — Property Identified
// ---------------------------------------------------------------------------

export const q2_propertyIdentified: RawSchemaQuestion = {
	id: 'q2_propertyIdentified',
	bindsTo_template: 'propertyIdentified',
	contextKey: 'propertyIdentified',
	type: 'radio',
	radioClass: 'mt-8 md:mt-12',
	
	optionContainerClass: 'grid md:grid-cols-2 gap-3',
	uiGroup: 'loan_details',
	required: true,

	question: 'Has the property been identified?',

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

	// Only shown for New Loan (BT/Top-up always have an identified property)
	showWhen: { '==': [{ var: 'loanType' }, 'New Loan'] }
};

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

/** All intake questions in page order */
export function getIntakeQuestions(): RawSchemaQuestion[] {
	return [q1_priorAssessmentHistory, q2_propertyIdentified];
}
