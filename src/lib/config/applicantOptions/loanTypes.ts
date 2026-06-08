import type { Question, Option, Answers, LoanEntry, Applicant } from '$lib/types/formTypes';

export const personalLoanType: Option[] = [
	{ label: 'Home Loan', value: 'Home Loan' },
	{ label: 'Plot and Construction Loan', value: 'Plot and Construction Loan' },
	{ label: 'Loan Against Property', value: 'Loan Against Property' },
	{ label: 'Personal Loan', value: 'Personal Loan' },
	{ label: 'Vehicle Loan', value: 'Vehicle Loan' },
	{ label: 'Gold Loan', value: 'Gold Loan' },
	{ label: 'Credit Card Loan', value: 'Credit Card Loan' },
	{ label: 'Consumer Durable Loan', value: 'Consumer Durable Loan' },
	{ label: 'Education Loan', value: 'Education Loan' },
	{ label: 'Insta Loan', value: 'Insta Loan' },
	{ label: 'Business Loan - Unsecured', value: 'Business Loan - Unsecured' },
	{ label: 'OD Limit', value: 'OD Limit' },
	{ label: 'CC Limit in current A/C', value: 'CC Limit' },
	{ label: 'Dropline OD', value: 'Dropline OD' },
	{ label: 'Other Type Loan', value: 'Other Type Loan' }
];

export const businessLoanType: Option[] = [
	{ label: 'Business Loan - Unsecured', value: 'Business Loan - Unsecured' },
	{ label: 'Business Loan - Secured', value: 'Business Loan - Secured' },
	{ label: 'Loan Against Property', value: 'Loan Against Property' },
	{ label: 'Machinery Loan', value: 'Machinery Loan' },
	{ label: 'Vehicle Loan', value: 'Vehicle Loan' },
	{ label: 'Property Loan', value: 'Property Loan' },
	{ label: 'OD Limit', value: 'OD Limit' },
	{ label: 'CC Limit in current A/C', value: 'CC Limit' },
	{ label: 'Dropline OD', value: 'Dropline OD' },
	{ label: 'Other Type Loan', value: 'Other Type Loan' }
];
