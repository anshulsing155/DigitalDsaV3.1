/**
 * ════════════════════════════════════════════════════════════════════
 * ARCHIVED 2026-06-02 (S213, TECH-DEBT-CLEANUP D8/D9 — ADR-0024)
 *
 * Was: src/lib/form/firstPage/rules.ts
 *
 * Reason: function was already a no-op (rules 1 and 2 obsoleted earlier
 * when explicit loanType selection landed on q4). After S213 the lone
 * caller in how-can-we-help/+page.svelte was removed too, leaving zero
 * importers — confirmed via:
 *   Grep "applyAutoLoanRules" src/ → only firstPage/rules.ts itself
 *
 * The historical "Start Fresh with New Loan" references throughout this
 * file are part of the D8 sunset story — q4_loanType now writes canonical
 * 'New Loan' directly, no auto-rewrite needed.
 *
 * Restore path: git show <pre-S213-sha>:src/lib/form/firstPage/rules.ts
 * ════════════════════════════════════════════════════════════════════
 *
 * Original docstring follows:
 *
 * Auto-loan rules applied at navigation time on the how-can-we-help page.
 *
 * Previously this function auto-set loanType for:
 *   1. Unsecured term loans with ObligationsRunning=No → "Start Fresh with New Loan"
 *   2. DOD selection → force "Start Fresh with New Loan"
 *
 * Both rules are now obsolete:
 *   - Rule 1: Users now explicitly choose loanType (New Loan / DC / DC+Extra)
 *     before the obligations question. The obligations question only shows when
 *     loanType == "New Loan", so auto-setting is redundant.
 *   - Rule 2: OD and DOD users now have their own facility-specific loanType
 *     options (New OD Facility, OD Takeover, etc.). Auto-overriding would
 *     clobber the user's explicit choice.
 *
 * Kept as a no-op to avoid breaking the caller in how-can-we-help/+page.svelte.
 */
export function applyAutoLoanRules(_answers: any, _update: (key: string, val: string) => void) {
	// No-op — user explicitly selects loanType via q4 options.
}
