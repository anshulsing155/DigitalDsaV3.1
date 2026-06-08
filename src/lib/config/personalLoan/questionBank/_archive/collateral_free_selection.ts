/**
 * Eligibility Check Questions
 * Page: collateral_free_selectionPage
 *
 * Income documentation question removed — premature without employment type context.
 * Credit history dependency removed — credit history is captured in CreditScoreSection.
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';

/**
 * Income documentation question — ARCHIVED from active flow.
 * Kept as export for reference but not included in page questions.
 * Reason: This question appears before employment type is known (set on applicant page),
 * making options like "payslips" vs "ITR" meaningless at this stage.
 */
export const q_incomeDocumentation: RawSchemaQuestion = {
	id: "q_incomeDocumentation",
	bindsTo_template: "incomeDocAvailable",
	contextKey: "incomeDocAvailable",
	type: "radio",
	radioClass: "mt-8 md:mt-12",
	labelClass: "text-black",
	optionContainerClass: "grid gap-3",
	uiGroup: "radio_fields",
	required: true,
	question: "What income documentation is available?",
	description: "<div class='info-title'><span class='info-icon blue'>📄</span> Income Documentation</div><div class='info-box highlight'>Select what income proof documents are available for the applicant.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Having both payslips and Form 16 gives the best chances of approval and better rates.</div>",
	options: [
		{
			label: "Both payslips and Form 16",
			value: "both",
			uiMeta: {
				icon: "Circle"
			},
			icon: "ThumbsUp"
		},
		{
			label: "Payslips only",
			value: "payslips_only",
			uiMeta: {
				icon: "Circle"
			},
			icon: "FileText"
		},
		{
			label: "Form 16 only",
			value: "form16_only",
			uiMeta: {
				icon: "Circle"
			},
			icon: "FileText"
		},
		{
			label: "ITR available (self-employed / professional)",
			value: "itr_available",
			uiMeta: {
				icon: "Circle"
			},
			icon: "FileText"
		},
		{
			label: "Bank statement available (12 months)",
			value: "bank_statement_available",
			uiMeta: {
				icon: "Circle"
			},
			icon: "FileText"
		},
		{
			label: "Neither available",
			value: "neither",
			uiMeta: {
				icon: "Circle"
			},
			icon: "ThumbsDown"
		}
	],
	showWhen: {
		and: [
			{
				"==": [
					{
						var: "loanName"
					},
					"Personal Loan"
				]
			},
			{
				"!=": [
					{
						var: "creditHistoryStatus"
					},
					""
				]
			}
		]
	}
};

export const q5_applicantIsNRI: RawSchemaQuestion = {
	id: "q5_applicantIsNRI",
	bindsTo_template: "ApplicantIsNRI",
	contextKey: "ApplicantIsNRI",
	type: "radio",
	uiGroup: "radio_fields",
	radioClass: "mt-[2rem] md:mt-[3rem]",
	labelClass: "text-black",
	optionContainerClass: "grid md:grid-cols-2 gap-3",
	required: true,
	question: "Is the primary applicant currently residing outside India (NRI)?",
	descriptionHeader: "NRI applicants are not supported for personal loans at this time.",
	options: [
		{
			label: "Yes",
			value: "Yes",
			flagKey: {
				ApplicantIsNRI: true
			},
			uiMeta: {
				icon: "Circle"
			},
			icon: "ThumbsUp"
		},
		{
			label: "No",
			value: "No",
			flagKey: {
				ApplicantIsNRI: false
			},
			uiMeta: {
				icon: "Circle"
			},
			icon: "ThumbsDown"
		}
	],
	validation: {
		condition: [
			{
				case: {
					"==": [
						{
							var: "ApplicantIsNRI"
						},
						"Yes"
					]
				},
				then: "We regret to inform you that your request cannot be processed at this time as the applicant is NRI."
			}
		]
	},
	description: "<div class='info-title'><span class='info-icon blue'>🌏</span> NRI Status</div><div class='info-box highlight'>If the applicant is an NRI, a General Power of Attorney (GPA) holder in India will be needed for documentation and verification.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Ensure the GPA holder's documents (Aadhaar, PAN, address proof) are ready if the applicant is NRI.</div>"
};

/** Returns all questions for the Eligibility Check page.
 *  Income documentation removed — captured contextually after employment type is known.
 *  Credit history removed — captured in CreditScoreSection component.
 */
export function getCollateralFreeSelectionpageQuestions(): RawSchemaQuestion[] {
	return [
		q5_applicantIsNRI
	];
}
