/**
 * A few check points ! Questions
 * Page: collateral_free_selectionPage
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';

export const q5_applicantIsNRI: RawSchemaQuestion = {
	id: "q5_applicantIsNRI",
	bindsTo_template: "applicantIsNRI",
	contextKey: "applicantIsNRI",
	type: "radio",
	uiGroup: "radio_fields",
	radioClass: "mt-8 md:mt-12",
	labelClass: "text-black",
	optionContainerClass: "grid md:grid-cols-2 gap-3",
	required: true,
	question: "Does applicant currently live outside India or hold NRI status?",
	options: [
		{
			label: "Yes",
			value: "Yes",
			flagKey: {
				applicantIsNRI: true
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
				applicantIsNRI: false
			},
			uiMeta: {
				icon: "Circle"
			},
			icon: "ThumbsDown"
		}
	],
	showWhen: {
		"!=": [
			{
				var: "creditHistoryStatus"
			},
			""
		]
	},
	validation: {
		condition: [
			{
				case: {
					"==": [
						{
							var: "applicantIsNRI"
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

/** Returns all questions for the A few check points ! page */
export function getCollateralFreeSelectionpageQuestions(): RawSchemaQuestion[] {
	return [
		q5_applicantIsNRI
	];
}
