/**
 * Loan Entry Helpers — Delete & Edit operations on obligations[]
 * ===================================================================
 * Operates on the unified obligations[] array.
 * No computed totals — that is the Rule Engine's responsibility.
 * ===================================================================
 */

interface LoanEntry {
	id?: string;
	obligationType?: string;
	loanType?: string;
	bankName?: string;
	selectedToClose?: string;
	emi?: string;
	totalLimit?: string;
	sanctionedLimit?: string;
	remainingLimit?: string;
	utilizedAmount?: string;
	sanctionedTenure?: string;
	interestRate?: string;
	tenure?: string;
}

/**
 * Deletes an obligation entry by index from the unified obligations[] array.
 */
export function deleteLoanEntry(
	entryIdx: number,
	isLimit: boolean,
	answers: Record<string, unknown>
): Record<string, unknown> {
	// Support both old split arrays (backward compat) and new unified array
	if (Array.isArray(answers.obligations)) {
		const entries = answers.obligations as unknown[];
		answers.obligations = entries.filter((_: unknown, idx: number) => idx !== entryIdx);
	} else {
		// Fallback: old split arrays
		const key = isLimit ? 'tableLimitEntries' : 'tableLoanEntries';
		const entries = answers[key] as unknown[] | undefined;
		answers[key] = entries?.filter((_: unknown, idx: number) => idx !== entryIdx) ?? [];
	}

	return answers;
}

/**
 * Opens an existing obligation entry for editing and pre-fills form fields.
 */
export function editLoanEntry(
	entryIdx: number,
	isLimit: boolean,
	answers: Record<string, unknown>
): Record<string, unknown> {
	let loan: LoanEntry | undefined;

	if (Array.isArray(answers.obligations)) {
		loan = (answers.obligations as LoanEntry[])[entryIdx];
	} else {
		// Fallback: old split arrays
		const key = isLimit ? 'tableLimitEntries' : 'tableLoanEntries';
		const entries = answers[key] as LoanEntry[] | undefined;
		loan = entries?.[entryIdx];
	}

	if (!loan) return answers;

	// Remove the loan being edited from list
	deleteLoanEntry(entryIdx, isLimit, answers);

	// Prefill form fields
	answers.currentLoanType = loan.loanType;
	answers.currentBankName = loan.bankName;
	answers.currentSelectedToClose = loan.selectedToClose;
	answers.currentEmi = loan.emi;
	answers.currentTotalLimit = loan.totalLimit;
	answers.sanctionedLimit = loan.sanctionedLimit;
	answers.currentRemainingLimit = loan.remainingLimit;
	answers.currentUtilizedAmount = loan.utilizedAmount;
	answers.currentSanctionedTenure = loan.sanctionedTenure;
	answers.currentInterestRate = loan.interestRate;
	answers.currentTenure = loan.tenure;

	// Mark as being edited
	answers.editingLoanIdx = entryIdx;

	return answers;
}
