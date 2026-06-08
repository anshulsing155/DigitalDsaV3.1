/**
 * Credit History Check Questions
 * Page: creditHistoryPage
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';

export const q1_creditHistory: RawSchemaQuestion = {
	id: "q1_creditHistory",
	bindsTo_template: "creditHistoryStatus",
	contextKey: "creditHistoryStatus",
	type: "radio",
	uiGroup: "loan_details",
	radioClass: "mt-[2rem] md:mt-[3rem]",
	optionContainerClass: "grid md:grid-cols-2 gap-3",
	uiMeta: {
		icon: "shield-alert"
	},
	required: true,
	question: "Has any applicant been involved in a loan default, settlement, or acted as guarantor on an unpaid loan?",
	description: "<div class='info-title'><span class='info-icon gold'>🛡️</span> Credit History Check</div><div class='info-box highlight'>This helps lenders assess creditworthiness. A history of defaults, settlements, or acting as guarantor on defaulted loans may affect lender eligibility.</div><div class='info-box tip'><span class='bold'>💡 Tip:</span> Being honest helps find the right lenders who can work with the applicant's credit history.</div>",
	options: [
		{
			label: "None — clean record",
			value: "clean",
			icon: "ThumbsUp"
		},
		{
			label: "Yes — involved in default or settlement",
			value: "defaulter",
			icon: "AlertTriangle"
		},
		{
			label: "Yes — was guarantor on unpaid/settled loan",
			value: "guarantor",
			icon: "AlertTriangle"
		},
		{
			label: "Both — default/settlement AND guarantor",
			value: "both",
			icon: "AlertTriangle"
		}
	],
	warning: {
		condition: [
			{
				case: {
					in: [
						{
							var: "creditHistoryStatus"
						},
						["defaulter", "guarantor", "both"]
					]
				},
				then: "A prior loan default or settlement where applicant acted as a guarantor may also affect lender eligibility. If no offers appear, applicant may explore our DSA pool, where a few DSAs may assist subject to additional fees or risk mitigation, such as collateral."
			}
		]
	}
};

/** Returns all questions for the Credit History Check page */
export function getCreditHistoryPageQuestions(): RawSchemaQuestion[] {
	return [
		q1_creditHistory
	];
}
