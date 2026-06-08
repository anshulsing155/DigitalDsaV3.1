import { goto } from '$app/navigation';
import { LOAN_TYPE_FORM_ROUTES } from '$lib/config/routes.js';

export function goNextRoute(answers: any, user: any) {
	user.loanName = answers.loanName;
	user.firstPageData = answers;

	const route = LOAN_TYPE_FORM_ROUTES[answers.loanName];
	if (route) {
		goto(route);
	}
}
