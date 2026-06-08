import type { Applicant, LoanValidationResult } from '$lib/types/formTypes';

export function validateLoanForm(applicant: Applicant): LoanValidationResult {
	const errors: string[] = [];

	const loanType = applicant.currentLoanType ?? '';
	const bankName = applicant.currentBankName ?? '';
	const selectedToClose = applicant.currentSelectedToClose ?? '';
	const emi = applicant.currentEmi ?? '';
	const totalLimit = applicant.currentTotalLimit ?? '';
	const tenure = applicant.currentTenure ?? '';
	const interestRate = applicant.currentInterestRate ?? '';

	// Required fields
	if (!loanType) errors.push('Loan Type is required');
	if (!bankName) errors.push('Bank Name is required');
	if (!selectedToClose) errors.push('Closure plan is required');

	// Loan-specific numeric validation
	if (loanType && ['OD Limit', 'CC Limit', 'Dropline OD'].includes(loanType)) {
		const limit = parseFloat(totalLimit);
		if (isNaN(limit) || limit <= 0) {
			errors.push('Total Limit must be a positive number');
		}
	} else if (loanType) {
		const emiValue = parseFloat(emi);
		if (isNaN(emiValue) || emiValue <= 0) {
			errors.push('EMI must be a positive number');
		}
	}

	// Tenure validation
	const tenureValue = parseInt(tenure);
	if (isNaN(tenureValue) || tenureValue <= 0) {
		errors.push('Tenure must be a positive number');
	}

	// Interest rate validation
	const rate = parseFloat(interestRate);
	if (isNaN(rate) || rate <= 0 || rate > 99) {
		errors.push('Interest rate must be between 0.1% and 99%');
	}

	return { isValid: errors.length === 0, errors };
}
