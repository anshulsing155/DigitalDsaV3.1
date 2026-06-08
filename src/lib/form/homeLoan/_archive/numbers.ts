import { ToWords } from 'to-words';
import { roundNum } from '$lib/utils/roundNumber';

const toWords = new ToWords();

export function handleNumberInput(
	value: number | number[] | null,
	question: any,
	updateAnswer: (q: any, v: any) => void,
	setNumberWordsMap: (update: (old: Record<string, string>) => Record<string, string>) => void
) {
	updateAnswer(question, value);

	if (typeof value === 'number' && !isNaN(value)) {
		setNumberWordsMap((prev) => ({
			...prev,
			[question.id]: `${toWords.convert(value)}`
		}));
	} else {
		setNumberWordsMap((prev) => ({
			...prev,
			[question.id]: ''
		}));
	}
}

export function downpaymentPercentage(currentAnswers: any) {
	const propCost = parseFloat(currentAnswers?.propertyCost || 0);
	const dealValue = parseFloat(currentAnswers?.dealValue || 0);
	const deposit = parseFloat(currentAnswers?.downPayment || 0);
	let baseAmount = 0;
	if (propCost > 0) {
		baseAmount = propCost;
	} else if (dealValue > 0) {
		baseAmount = dealValue;
	}
	if (!baseAmount || !deposit) return null;
	const depositPercent = ((deposit / baseAmount) * 100).toFixed(0);
	const loanPercent = (100 - Number(depositPercent)).toFixed(0);
	if (Number(depositPercent) < 0 || Number(depositPercent) > 90) return null;

	return {
		depositPercent: Number(depositPercent),
		loanPercent: Number(loanPercent)
	};
}

export function computeRequiredDownPayment(currentAnswers: any): number {
	let requireDownPayment = 0;

	if (currentAnswers.purchaseType == 'Direct Sale') {
		if (currentAnswers.propertyCost <= 3333333) {
			requireDownPayment = +Math.ceil(currentAnswers.propertyCost * 0.1).toFixed(0);
		} else if (currentAnswers.propertyCost > 3333333 && currentAnswers.propertyCost <= 9375000) {
			requireDownPayment = +Math.ceil(currentAnswers.propertyCost * 0.2).toFixed(0);
		} else if (currentAnswers.propertyCost > 9375000) {
			requireDownPayment = +Math.ceil(currentAnswers.propertyCost * 0.25).toFixed(0);
		}
	} else if (currentAnswers.purchaseType == 'Resale') {
		if (currentAnswers.dealValue <= 3333333) {
			requireDownPayment = +Math.ceil(currentAnswers.dealValue * 0.1).toFixed(0);
		} else if (currentAnswers.dealValue > 3333333 && currentAnswers.dealValue < 9375000) {
			requireDownPayment = +Math.ceil(currentAnswers.dealValue * 0.2).toFixed(0);
		} else if (currentAnswers.dealValue > 9375000) {
			requireDownPayment = +Math.ceil(currentAnswers.dealValue * 0.25).toFixed(0);
		}
	}

	return requireDownPayment;
}

export function computeATSValues(currentAnswers: any, requireDownPayment: number) {
	const result: any = {};

	if (
		currentAnswers.isATSReady == 'No' &&
		currentAnswers.ourSuggestionOrBySelf == 'Suggestion Required'
	) {
		if (currentAnswers.purchaseType == 'Direct Sale') {
			result.propertyValueAsPerATS = roundNum(
				(currentAnswers.propertyCost - requireDownPayment) / 1.5,
				100
			);
			result.downpaymentByOwn = roundNum(result.propertyValueAsPerATS * 0.1, 100);
		} else if (currentAnswers.purchaseType == 'Resale') {
			result.propertyValueAsPerATS = roundNum(
				(currentAnswers.dealValue - requireDownPayment) / 1.5,
				100
			);
			result.downpaymentByOwn = roundNum(result.propertyValueAsPerATS * 0.1, 100);
		}
	}

	return result;
}
