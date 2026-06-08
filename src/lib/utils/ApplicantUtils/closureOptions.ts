import type { Question, Option, Answers, LoanEntry, Applicant } from '$lib/types/formTypes';

const closureOptions: Option[] = [
	{
		label: 'Self-funded (before loan disbursement)',
		value: 'Self-funded (before loan disbursement)'
	},

	{ label: 'Settle by this Top-up amount', value: 'Will be closed by Top-up amount' },
	{ label: 'Keep Running', value: 'Keep Running' }
];

export function selectToClose(loanType: string) {
	if (loanType == 'New Loan' || loanType == 'Balance Transfer Only') {
		return closureOptions.filter((_, index) => index !== 1);
	}
	// 'Start Fresh with New Loan' was retired in S213 (D8 sunset, ADR-0024).
	// formSchema.json q4_loanType "Start Fresh" option's VALUE now writes
	// canonical 'New Loan' (label stays "Start Fresh with New Loan" for UX).
	// So the branch above (`loanType == 'New Loan'`) catches what used to flow
	// here. The legacy 'Start Fresh with New Loan' literal is gone from the
	// codebase. MongoDB count query (scripts/d8-count-start-fresh-legacy.mjs)
	// verified zero stored cases used the legacy value before sunset.
	if (loanType == 'Debt Consolidation with Extra Funds') {
		return closureOptions.map((item, index) =>
			index == 1
				? { label: 'Settle by this New Loan', value: 'Will be closed by Top-up amount' }
				: item
		);
	}
	return closureOptions;
}
