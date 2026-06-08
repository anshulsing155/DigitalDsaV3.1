import type { Question, Applicant } from '$lib/types/formTypes';

export function getTitleValidationError(question: Question, applicant: Applicant): string | null {
	if (question.uiMeta?.showTitleDropdown) {
		const selectedTitle = applicant['title'];

		if (
			!selectedTitle &&
			(applicant.hasOwnProperty('fullName') || applicant.hasOwnProperty('directorName')) &&
			(applicant.fullName !== '' || applicant.directorName !== '')
		) {
			return 'Please select a title';
		}
	}

	return null;
}
