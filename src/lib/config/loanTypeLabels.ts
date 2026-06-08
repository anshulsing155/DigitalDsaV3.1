/**
 * Canonical loan-type display labels (Audit B.2).
 * ════════════════════════════════════════════════════════════════════
 * `Case.loan.type` is a free string that, across the data, holds a MIX of
 * forms: mostly human ("Home Loan"), a few raw enums ("home_loan"), and some
 * legitimate variant strings ("Plot Loan Only", "Balance Transfer"). This is
 * the single place that turns any of those into a display label, applied at the
 * server-load boundary so no consumer ever renders a raw enum (CLAUDE.md §16
 * rule 11 — fix at source, not per-consumer).
 *
 * `loanTypeLabel` is IDEMPOTENT: a value that's already a human label comes back
 * unchanged ("Home Loan" → "Home Loan"), and a raw enum is canonicalised
 * ("home_loan" → "Home Loan"). Unknown / variant values title-case gracefully
 * so a new enum never shows as raw snake_case.
 *
 * Display-only — filtering/queries stay keyed on the raw stored value. No DB
 * migration (owner decision 2026-05-21). i18n (hi/mr) deferred to Epic H: when
 * wired, resolve these values through `t()`.
 */

/** Raw/normalised key → canonical English label. */
const LOAN_TYPE_LABELS: Record<string, string> = {
	home_loan: 'Home Loan',
	lap: 'Loan Against Property',
	plot_loan: 'Plot & Construction Loan',
	personal_loan: 'Personal Loan',
	business_loan: 'Business Loan',
	professional_loan: 'Professional Loan'
};

/** Title-case a snake/kebab/space value: "home_loan" → "Home Loan". */
function titleCase(value: string): string {
	return value
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Display label for any stored `loan.type` value. Idempotent and
 * leak-proof — never returns a raw snake_case value.
 */
export function loanTypeLabel(raw: string | null | undefined): string {
	if (!raw) return '';
	// Normalise to the map key form ("Home Loan" / "HOME-LOAN" → "home_loan").
	const key = raw.toLowerCase().replace(/[\s-]+/g, '_');
	if (LOAN_TYPE_LABELS[key]) return LOAN_TYPE_LABELS[key];
	// Already-human or variant value (e.g. "Plot Loan Only", "Balance Transfer")
	// — keep it, just tidy casing/separators.
	return titleCase(raw);
}

export { LOAN_TYPE_LABELS };
