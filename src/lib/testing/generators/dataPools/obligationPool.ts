/**
 * Obligation Pool - Generate realistic existing obligations and BT details
 */

import type { ObligationEntry } from '$lib/utils/payloadBuilder.js';

/** Bank names for obligations — sampled from the main bank list */
const OBLIGATION_BANKS = [
	'HDFC Bank',
	'State Bank of India',
	'ICICI Bank',
	'Axis Bank',
	'Kotak Mahindra Bank',
	'Bank of Baroda',
	'Punjab National Bank',
	'Canara Bank',
	'Union Bank of India',
	'IDBI Bank',
	'Federal Bank',
	'Yes Bank',
	'Indusind Bank',
	'Bandhan Bank',
	'IDFC First Bank',
	'LIC Housing Finance',
	'Bajaj Finserv',
	'PNB Housing Finance'
];

interface ObligationTemplate {
	type: string;
	obligationType: 'term_loan' | 'credit_line';
	emiRange: [number, number];
	tenureRange: [number, number];
	rateRange: [number, number];
	limitRange?: [number, number];
}

const TERM_LOAN_TEMPLATES: Record<string, ObligationTemplate> = {
	'Home Loan': {
		type: 'Home Loan',
		obligationType: 'term_loan',
		emiRange: [15000, 80000],
		tenureRange: [120, 300],
		rateRange: [7, 10]
	},
	'Car Loan': {
		type: 'Car Loan',
		obligationType: 'term_loan',
		emiRange: [8000, 35000],
		tenureRange: [36, 84],
		rateRange: [7, 12]
	},
	'Personal Loan': {
		type: 'Personal Loan',
		obligationType: 'term_loan',
		emiRange: [5000, 30000],
		tenureRange: [12, 60],
		rateRange: [10, 18]
	},
	'Business Loan': {
		type: 'Business Loan',
		obligationType: 'term_loan',
		emiRange: [10000, 50000],
		tenureRange: [24, 84],
		rateRange: [10, 16]
	},
	'Education Loan': {
		type: 'Education Loan',
		obligationType: 'term_loan',
		emiRange: [5000, 25000],
		tenureRange: [60, 180],
		rateRange: [8, 12]
	}
};

const CREDIT_LINE_TEMPLATES: Record<string, ObligationTemplate> = {
	'Credit Card': {
		type: 'Credit Card',
		obligationType: 'credit_line',
		emiRange: [0, 0],
		tenureRange: [0, 0],
		rateRange: [0, 0],
		limitRange: [100000, 500000]
	},
	'OD Limit': {
		type: 'OD Limit',
		obligationType: 'credit_line',
		emiRange: [0, 0],
		tenureRange: [12, 12],
		rateRange: [9, 12],
		limitRange: [500000, 10000000]
	},
	'CC Limit': {
		type: 'CC Limit',
		obligationType: 'credit_line',
		emiRange: [0, 0],
		tenureRange: [0, 0],
		rateRange: [0, 0],
		limitRange: [200000, 1000000]
	}
};

export interface SeededRandom {
	next(): number;
	range(min: number, max: number): number;
	choice<T>(arr: readonly T[]): T;
	boolean(probability?: number): boolean;
}

export function generateObligations(
	rng: SeededRandom,
	count: number,
	incomeLevel: 'low' | 'mid' | 'high',
	profileId: string,
	employmentType?: string
): ObligationEntry[] {
	const obligations: ObligationEntry[] = [];
	const termLoanTypes = Object.keys(TERM_LOAN_TEMPLATES);

	// Filter credit line types based on employment type
	// CC Limit and OD Limit are business credit lines — only valid for self-employed
	const isSelfEmployed =
		employmentType === 'Self-employed(Professional)' || employmentType === 'Self-employed(Other)';
	const creditLineTypes = isSelfEmployed ? Object.keys(CREDIT_LINE_TEMPLATES) : ['Credit Card']; // Salaried/Govt/Pensioner only get Credit Cards

	for (let i = 0; i < count; i++) {
		const isCredit = i > 0 && rng.boolean(0.4);

		if (isCredit) {
			const typeKey = rng.choice(creditLineTypes);
			const template = CREDIT_LINE_TEMPLATES[typeKey];
			const limit = rng.range(template.limitRange![0], template.limitRange![1]);
			const utilization = rng.range(20, 80) / 100;

			obligations.push({
				id: `obl-${profileId}-${i + 1}`,
				obligationType: 'credit_line',
				loanType: template.type,
				bankName: rng.choice(OBLIGATION_BANKS),
				selectedToClose: 'Keep running',
				emi: '0',
				totalLimit: String(limit),
				tenure: String(template.tenureRange[0] || 0),
				interestRate: String(template.rateRange[0] || 0),
				utilizedAmount: String(Math.round(limit * utilization))
			});
		} else {
			const typeKey = rng.choice(termLoanTypes);
			const template = TERM_LOAN_TEMPLATES[typeKey];
			const multiplier = incomeLevel === 'high' ? 2 : incomeLevel === 'mid' ? 1 : 0.5;
			const emi = Math.round(rng.range(template.emiRange[0], template.emiRange[1]) * multiplier);
			const tenure = rng.range(template.tenureRange[0], template.tenureRange[1]);
			const remaining = rng.range(Math.min(6, tenure), tenure);
			const rate = rng.range(template.rateRange[0] * 100, template.rateRange[1] * 100) / 100;
			const closePlan = rng.choice([
				'Keep running',
				'Self-funded',
				'Keep running',
				'Keep running'
			] as const);

			obligations.push({
				id: `obl-${profileId}-${i + 1}`,
				obligationType: 'term_loan',
				loanType: template.type,
				bankName: rng.choice(OBLIGATION_BANKS),
				selectedToClose: closePlan,
				emi: String(emi),
				totalLimit: '0',
				tenure: String(tenure),
				interestRate: String(rate),
				remainingTenure: String(remaining)
			});
		}
	}

	return obligations;
}

export function generateBtDetails(
	rng: SeededRandom,
	propertyCost: number
): {
	currentBank: string;
	principalOutstanding: number;
	currentInterestRate: number;
	remainingTenure: number;
	currentEMI: number;
	currentPropertyValue: number;
	loanVintage: string;
	repaymentTrack: string;
	sixMonthsAfterRegistry: boolean;
} {
	const outstanding = Math.round((propertyCost * rng.range(40, 70)) / 100);
	const roi = rng.range(850, 1100) / 100;
	const remaining = rng.range(60, 240);
	const emi = Math.round(
		(((outstanding * roi) / 1200) * Math.pow(1 + roi / 1200, remaining)) /
			(Math.pow(1 + roi / 1200, remaining) - 1)
	);
	const vintages = ['1-3 years', '3-5 years', '5-7 years', '7+ years'] as const;
	const tracks = ['CLEAN', 'CLEAN', 'CLEAN', 'MINOR_IRREGULAR'] as const;

	return {
		currentBank: rng.choice(OBLIGATION_BANKS),
		principalOutstanding: outstanding,
		currentInterestRate: roi,
		remainingTenure: remaining,
		currentEMI: emi,
		currentPropertyValue: Math.round((propertyCost * rng.range(110, 140)) / 100),
		loanVintage: rng.choice(vintages),
		repaymentTrack: rng.choice(tracks),
		sixMonthsAfterRegistry: true
	};
}
