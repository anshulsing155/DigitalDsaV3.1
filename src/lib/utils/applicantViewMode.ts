/**
 * Single canonical decision for the applicant view mode.
 *
 * A loan renders in the **single-applicant inline / flattened** view ONLY when
 * there is exactly one applicant AND that applicant is an **Individual** (a
 * Personal-loan borrower, or a sole-proprietor business). Everything else uses
 * the **multi-applicant cards + modal** view:
 *   - 2+ applicants, OR
 *   - a Company applicant (its directors/partners are co-applicants; a company
 *     is never a "single person", even when it is the only entry on the case
 *     because its directors are nested inside the company record).
 *
 * This replaces scattered count-based checks (`applicants.length === 1`) that
 * mistook a lone Company for a single person and routed it into a half-built
 * single-applicant flow. Use this everywhere the single/multi view is decided
 * so the two surfaces (+page.svelte and IncomePageNew) can never drift.
 *
 * See CLAUDE.md (Business Loan applicant model) + Pitfall on count-based
 * single/multi mistakes.
 */
export function rendersAsSingleApplicant(
	applicants: ReadonlyArray<{ applicantType?: string }> | undefined | null
): boolean {
	const list = applicants ?? [];
	return list.length <= 1 && list[0]?.applicantType !== 'Company';
}
