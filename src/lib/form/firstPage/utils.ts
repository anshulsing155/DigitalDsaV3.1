export { resolveDynamicText } from '$lib/utils/resolveDynamicText';

export function getOptionValue(value: any, answers: any) {
	return typeof value === 'object' && value.var ? (answers[value.var] ?? '') : value;
}

export function NoteWorthyMessage(answers: any) {
	switch (answers.loanName) {
		case 'Personal Loan':
			return 'Personal loan is intended for salaried people as well as Directors of the Pvt Ltd companies, who receive regular monthly salary.';
		case 'Business Loan':
			return 'Business loans are exclusively for <span class="font-titleMedium"> GST registered business entities</span>, with a minimum of three years’ filed ITRs.';
		case 'Professional Loan':
			return 'Professional loan is intended for self-employed professionals i.e. CA, CS, MBBS, Dentist, Lawyer or Architect.';
		default:
			return null;
	}
}
