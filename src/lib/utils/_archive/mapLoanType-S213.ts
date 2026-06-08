/**
 * ════════════════════════════════════════════════════════════════════
 * ARCHIVED 2026-06-02 (S213, TECH-DEBT-CLEANUP D9 — ADR-0024)
 *
 * Was: src/lib/utils/mapLoanType.ts
 *
 * Reason: this function was imported in 3 unsecured form +page.svelte files
 * (personal-loan, business-loan, professional-loan) but never invoked
 * anywhere in those files (or anywhere else in the live tree). Confirmed
 * with:
 *   Grep "mapLoanType\(" src/  → zero matches (only the function definition)
 *   Grep "import.*mapLoanType" src/  → 3 phantom imports, removed in S213
 *
 * Conceptual concern (recorded for the historical record): the function's
 * mapping `'Debt Consolidation' → 'Balance Transfer'` would have been
 * incorrect even if invoked. Per ADR-0024, DC (multi-bank consolidation
 * into one) and BT (one-bank-to-one-bank transfer of a single existing
 * loan) are operationally distinct loan scopes — not the same thing under
 * different names. Treating them as interchangeable would conflate two
 * different lender-policy paths.
 *
 * The 'Start Fresh with New Loan' fallback referenced in the original
 * docstring below was also retired in S213 (D8 sunset) — formSchema.json
 * q4_loanType now writes canonical 'New Loan' directly.
 *
 * Restore path: git show <pre-S213-sha>:src/lib/utils/mapLoanType.ts
 * ════════════════════════════════════════════════════════════════════
 *
 * Original docstring follows:
 *
 * Maps loan type + obligation status to the submission LoanType value.
 * Shared across all unsecured loan form pages (personal, business, professional).
 *
 * Pre-form loanType values:
 *   "New Loan" → New Loan
 *   "Debt Consolidation" → Balance Transfer (consolidate existing loans)
 *   "Debt Consolidation with Extra Funds" → Balance Transfer (consolidate + extra)
 *   "Start Fresh with New Loan" → New Loan (legacy value, kept for backward compat)
 */
export function mapLoanType(loanType: string | undefined, obligation: string): string {
	// Debt consolidation variants → Balance Transfer
	switch (loanType) {
		case 'Debt Consolidation':
		case 'Debt Consolidation with Extra Funds':
			return 'Balance Transfer';
	}

	// No obligations or fresh loan → New Loan
	return 'New Loan';
}
