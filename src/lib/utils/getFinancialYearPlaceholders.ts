import { getCurrentFYStartYear } from './dateUtils';

export function getFinancialYearPlaceholders(financialYearDecision: 'Yes' | 'No') {
	const today = new Date();
	const month = today.getMonth() + 1;
	const currentFYStartYear = getCurrentFYStartYear();

	let fyPlaceholders: string[] = [];

	if (month <= 3) {
		// Jan–Mar → previous 3 FYs
		fyPlaceholders = [
			`FY${currentFYStartYear - 2}-${(currentFYStartYear - 1).toString().slice(-2)}`,
			`FY${currentFYStartYear - 3}-${(currentFYStartYear - 2).toString().slice(-2)}`,
			`FY${currentFYStartYear - 4}-${(currentFYStartYear - 3).toString().slice(-2)}`
		];
	} else if (month >= 10) {
		// Oct–Dec → current + previous 2 FYs
		fyPlaceholders = [
			`FY${currentFYStartYear - 1}-${currentFYStartYear.toString().slice(-2)}`,
			`FY${currentFYStartYear - 2}-${(currentFYStartYear - 1).toString().slice(-2)}`,
			`FY${currentFYStartYear - 3}-${(currentFYStartYear - 2).toString().slice(-2)}`
		];
	} else {
		// Between Apr–Sep → depends on ITR filing decision
		if (financialYearDecision === 'Yes') {
			fyPlaceholders = [
				`FY${currentFYStartYear - 1}-${currentFYStartYear.toString().slice(-2)}`,
				`FY${currentFYStartYear - 2}-${(currentFYStartYear - 1).toString().slice(-2)}`,
				`FY${currentFYStartYear - 3}-${(currentFYStartYear - 2).toString().slice(-2)}`
			];
		} else {
			fyPlaceholders = [
				`FY${currentFYStartYear - 2}-${(currentFYStartYear - 1).toString().slice(-2)}`,
				`FY${currentFYStartYear - 3}-${(currentFYStartYear - 2).toString().slice(-2)}`,
				`FY${currentFYStartYear - 4}-${(currentFYStartYear - 3).toString().slice(-2)}`
			];
		}
	}

	return fyPlaceholders;
}
