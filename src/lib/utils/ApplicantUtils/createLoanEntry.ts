import type { Applicant, LoanEntry, ObligationType } from '$lib/types/formTypes';
import { formatNumber } from '$lib/i18n';
import { generateId } from '$lib/utils.js';

/** Loan types that are credit lines (revolving credit) rather than term loans */
const CREDIT_LINE_TYPES = new Set(['CC Limit', 'OD Limit', 'Dropline OD']);

/** Determine obligation type based on loan type string */
function deriveObligationType(loanType: string): ObligationType {
	return CREDIT_LINE_TYPES.has(loanType) ? 'credit_line' : 'term_loan';
}

export function createLoanEntry(applicant: Applicant): LoanEntry {
	const loanType = applicant.currentLoanType ?? '';
	return {
		id: generateId(),
		obligationType: deriveObligationType(loanType),
		loanType,
		bankName: applicant.currentBankName ?? '',
		selectedToClose: applicant.currentSelectedToClose ?? '',
		emi: applicant.currentEmi ?? '',
		emiFormatted: applicant.currentEmi ? formatNumber(parseFloat(applicant.currentEmi)) : '',
		totalLimit: applicant.currentTotalLimit ?? '',
		totalLimitFormatted: applicant.currentTotalLimit
			? formatNumber(parseFloat(applicant.currentTotalLimit))
			: '',
		tenure: applicant.currentTenure ?? '',
		interestRate: applicant.currentInterestRate ?? '',
		sanctionedLimit: applicant.currentSanctionedLimit || '',
		sanctionedTenure: applicant.currentSanctionedTenure || '',
		remainingLimit: applicant.currentRemainingLimit || '',
		remainingLimitFormatted: '',
		remainingTenure: '',
		utilizedAmount: applicant.currentUtilizedAmount || '',
		utilizedAmountFormatted: ''
	};
}

export function clearLoanForm(applicant: Applicant): void {
	const fieldsToClear = [
		'currentLoanType',
		'currentBankName',
		'currentSelectedToClose',
		'currentEmi',
		'currentTotalLimit',
		'currentTenure',
		'currentInterestRate',
		'currentSanctionedLimit',
		'currentSanctionedTenure',
		'currentUtilizedAmount',
		'currentRemainingLimit',
		'sanctionedLimit',
		'sanctionedTenure',
		'utilizedAmount',
		'remainingLimit'
	];

	for (const field of fieldsToClear) {
		delete applicant[field];
	}
}
