import jsonLogic from 'json-logic-js';

interface Question {
	showWhen?: Record<string, unknown>;
	[key: string]: unknown;
}

export function isVisible(
	question: Question,
	applicantData: Record<string, unknown>,
	globalAnswers: Record<string, unknown>,
	applicantIsNRI: string,
	tellUsWhoIsApplying: string
): boolean {
	if (!question.showWhen) return true;

	const context = {
		...globalAnswers,
		...applicantData,
		currentApplicantIndex: globalAnswers.applicantIndex ?? globalAnswers.currentApplicantIndex ?? 0,
		ApplicantIsNRI: globalAnswers.ApplicantIsNRI ?? applicantIsNRI,
		tellUsApplying: globalAnswers.tellUsApplying ?? tellUsWhoIsApplying,
		GPADetails: applicantData.GPADetails ?? globalAnswers.GPADetails ?? []
	};

	return Boolean(jsonLogic.apply(question.showWhen, context));
}
