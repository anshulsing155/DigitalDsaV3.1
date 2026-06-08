/**
 * In-progress income-source draft buffer.
 * ═══════════════════════════════════════════════════════════════════
 * IncomeSourceForm holds a half-filled income entry (profile type, entity
 * name, specifics, amounts, evidence) in local component `$state` until the
 * user clicks "Add to Profile". Navigating to another wizard step UNMOUNTS the
 * form, so that local state — and the user's typing — was silently lost
 * (docs/reviews/E2E-TEST-2026-05-23.md, Recurring issue-class #6).
 *
 * This module is a tiny in-memory buffer (a Map, module-scoped) that survives
 * the component's unmount/remount within the same SPA session, so the form can
 * rehydrate the draft when the user comes back. It is intentionally NOT
 * persisted to storage: committed entries already round-trip through the normal
 * applicant state; this only covers the transient "typing but not yet added"
 * window. The buffer is keyed per applicant (+ who is filling) so two
 * applicants' drafts never collide, and is cleared the moment the entry is
 * committed or the form is reset/cancelled.
 *
 * Pure functions (no runes) so the persistence contract is unit-testable.
 */

import type { IncomeProfileType } from '$lib/types/incomeProfile';

export interface IncomeSourceDraft {
	currentProfileType: IncomeProfileType | '';
	entityName: string;
	specificsAnswers: Record<string, unknown>;
	incomeAnswers: Record<string, unknown>;
	evidenceAnswers: Record<string, unknown>;
	companyLinkedSelection: boolean;
	selectedCompanyId: string | undefined;
	useOtherCompany: boolean;
	// CustomIncomeTable's bind:answers bridge object. The financial table data
	// (FY netProfit / depreciation / GST turnover arrays) lives under
	// `tableAnswers.financialTable` and is the source CustomIncomeTable
	// re-derives from on mount via `let data = $derived(ensureDataShape(answers[questionId]))`.
	// Without this in the draft, a Previous→back navigation loses the table —
	// the parallel `incomeAnswers.financialsTable` round-trip exists but
	// suffers a mount-time race where CustomIncomeTable initializes from an
	// empty `tableAnswers` before the rehydration $effect populates
	// `incomeAnswers.financialsTable`. Saving tableAnswers as well lets the
	// rehydration path restore the bind object directly. Optional for backward
	// compat with any pre-fix saved drafts (rare — in-memory only).
	tableAnswers?: Record<string, unknown>;
}

const drafts = new Map<string, IncomeSourceDraft>();

/**
 * Build the per-applicant draft key. `filledBy` separates the DSA and
 * applicant-facing forms; the applicant id (falling back to index) scopes the
 * draft to one applicant so switching applicants never leaks a draft across.
 */
export function incomeDraftKey(filledBy: string, applicantId: string | number | undefined): string {
	return `${filledBy}:${applicantId ?? 'unknown'}`;
}

/**
 * Does this draft hold meaningful in-progress content worth restoring?
 * The default-empty evidence/company flags alone do NOT count — only a chosen
 * profile type, a typed entity name, or any specifics/income answers do.
 */
export function isDraftMeaningful(draft: IncomeSourceDraft): boolean {
	return (
		draft.currentProfileType !== '' ||
		draft.entityName.trim() !== '' ||
		Object.keys(draft.specificsAnswers ?? {}).length > 0 ||
		Object.keys(draft.incomeAnswers ?? {}).length > 0 ||
		// The financial table writes through CustomIncomeTable's bind, which
		// lives in `tableAnswers.financialTable`. Treat any typed FY data as
		// meaningful even when the other answer buckets are still empty.
		hasFinancialTableData(draft.tableAnswers)
	);
}

function hasFinancialTableData(tableAnswers: Record<string, unknown> | undefined): boolean {
	const financial = (tableAnswers?.financialTable ?? null) as
		| {
				netProfitArray?: Array<string | number>;
				depreciationArray?: Array<string | number>;
				turnOverArray?: Array<string | number>;
				currentFYTurnover?: string | number;
		  }
		| null;
	if (!financial) return false;
	const filledCell = (arr?: Array<string | number>): boolean =>
		Array.isArray(arr) && arr.some((v) => v !== '' && v !== null && v !== undefined);
	return (
		filledCell(financial.netProfitArray) ||
		filledCell(financial.depreciationArray) ||
		filledCell(financial.turnOverArray) ||
		(financial.currentFYTurnover !== '' &&
			financial.currentFYTurnover !== null &&
			financial.currentFYTurnover !== undefined)
	);
}

/** Persist (or clear, if empty) the in-progress draft for an applicant. */
export function saveIncomeSourceDraft(key: string, draft: IncomeSourceDraft): void {
	if (isDraftMeaningful(draft)) {
		drafts.set(key, draft);
	} else {
		drafts.delete(key);
	}
}

/** Retrieve a saved draft, or undefined when none exists. */
export function loadIncomeSourceDraft(key: string): IncomeSourceDraft | undefined {
	return drafts.get(key);
}

/** Drop the draft (called when the entry is committed or the form is reset). */
export function clearIncomeSourceDraft(key: string): void {
	drafts.delete(key);
}

/** Test-only: wipe all drafts. */
export function __resetIncomeSourceDrafts(): void {
	drafts.clear();
}
