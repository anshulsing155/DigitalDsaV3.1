import jsonLogic from 'json-logic-js';
import { bankData } from '$lib/config/bankSelection/bankName';

export function getOptions(
	question: any,
	combinedAnswers: any,
	stateOptions: any[],
	allStateOptions: any[]
) {
	if (question.id === 'q2_propertyStateName' || question.id === 'q4_propertyStateName') {
		return stateOptions;
	} else if ('q5_residenceStateName' == question.id) {
		return allStateOptions;
	}

	if (
		['q4_bankName', 'q2_bankName', 'q_sellerLoanBankName', 'q3_sellerCurrentLender'].includes(
			question.id
		)
	) {
		return bankData.filter((bankType) => bankType.Classification !== 'NBFC');
	}

	if (question.id === 'q_newTenure') {
		let minAge = 1;
		let maxAge = 30;

		return Array.from({ length: maxAge - minAge + 1 }, (_, i) => {
			const age = i + minAge;
			return { label: age.toString(), value: age.toString() };
		});
	}

	if (question.id === 'q_topTenure') {
		let minAge = 1;
		let maxAge = combinedAnswers?.newTenure >= 15 ? 15 : (combinedAnswers.newTenure ?? 15);

		return Array.from({ length: maxAge - minAge + 1 }, (_, i) => {
			const age = i + minAge;
			return { label: age.toString(), value: age.toString() };
		});
	}

	if (
		question.id === 'q_selectSingleBank' ||
		question.id === 'q9_selectSingleBank' ||
		question.id === 'q9_sellerCurrentLender'
	) {
		return bankData;
	}

	if (question.id === 'q_age') {
		let minAge = 18;
		let maxAge = 75;

		return Array.from({ length: maxAge - minAge + 1 }, (_, i) => {
			const age = i + minAge;
			return { label: age.toString(), value: age.toString() };
		});
	}

	return (
		question.options
			?.filter((opt: any) => {
				if (!opt.showWhen) return true;
				return jsonLogic.apply(opt.showWhen, combinedAnswers);
			})
			.map((opt: any) => ({
				label: opt.label as string,
				value: opt.value as string | number
			})) ?? []
	);
}
