/**
 * Pre-Submit Reconciler — Merge applicantDataStore into formState
 * ══════════════════════════════════════════════════════════════════
 * Safety net for data divergence between two stores that manage
 * overlapping applicant data (income, obligations, credit score).
 *
 * Problem: `formState.applicants` and `applicantDataStore` can diverge
 * after partial session reloads. Income entries and obligations are
 * written to BOTH stores simultaneously during normal form interaction,
 * but they use different sessionStorage keys and different data shapes.
 *
 * Solution: Before submission, merge the "source of truth" data from
 * `applicantDataStore` (structured, with soft-delete) into
 * `formState.applicants` (flat array, used by payload builder).
 *
 * Priority: `applicantDataStore` wins for income/obligations
 * (it's the dedicated manager for those concerns).
 * Identity fields (name, age, etc.) stay in formState (unchanged).
 * ══════════════════════════════════════════════════════════════════
 */

import type { IncomeSourceEntry, EnhancedLoanEntry } from '$lib/types/incomeProfile';

// ── Types ────────────────────────────────────────────────────────

/** Minimal interface for formState — avoids importing the full class */
interface FormStatelike {
	applicants: Array<Record<string, unknown>>;
}

/** Minimal interface for applicantDataStore */
interface ApplicantStoreLike {
	applicants: Record<
		string,
		{
			incomeEntries: {
				active: Record<string, IncomeSourceEntry[]>;
			};
			incomeProfiles: {
				selectedProfiles: string[];
			};
			creditScore: {
				score?: number;
				range?: string;
				source?: string;
			};
			obligations: {
				active: EnhancedLoanEntry[];
			};
		}
	>;
	flushPersist: () => void;
}

// ── Reconciliation Result ────────────────────────────────────────

interface ReconcileResult {
	/** Number of applicants whose income entries were updated */
	incomeUpdated: number;

	/** Number of applicants whose obligations were updated */
	obligationsUpdated: number;

	/** Number of applicants whose credit score was updated */
	creditUpdated: number;

	/** True if any data was changed */
	hadChanges: boolean;
}

// ── Core Reconciler ──────────────────────────────────────────────

/**
 * Merge structured applicant data back into formState before submission.
 *
 * Call this just before `formState.toJSON()` in the submit handler.
 * Mutates `formState.applicants` in-place (safe — submit happens next).
 *
 * @param formState - The formState instance (or its applicants array)
 * @param store - The applicantDataStore instance
 * @returns Summary of what was reconciled
 */
export function reconcileBeforeSubmit(
	formState: FormStatelike,
	store: ApplicantStoreLike
): ReconcileResult {
	const result: ReconcileResult = {
		incomeUpdated: 0,
		obligationsUpdated: 0,
		creditUpdated: 0,
		hadChanges: false
	};

	// Flush any pending debounced writes from the store first
	store.flushPersist();

	for (let i = 0; i < formState.applicants.length; i++) {
		const applicant = formState.applicants[i];
		const applicantId = (applicant.id ?? applicant.applicantId ?? '') as string;

		if (!applicantId) continue;

		const storeData = store.applicants[applicantId];
		if (!storeData) continue;

		// ── 1. Reconcile income entries ──────────────────────────
		// Flatten all active income entries from the store (keyed by profile type)
		// into a single array matching formState's flat format
		const storeIncomeEntries: IncomeSourceEntry[] = [];
		for (const profileType of storeData.incomeProfiles.selectedProfiles) {
			const entries = storeData.incomeEntries.active[profileType];
			if (entries && entries.length > 0) {
				storeIncomeEntries.push(...entries);
			}
		}

		const formIncomeEntries = (applicant.incomeEntries ?? []) as IncomeSourceEntry[];

		// Only update if the store has MORE or DIFFERENT entries
		// (store is source of truth for income — it handles soft-delete properly)
		if (storeIncomeEntries.length > 0 && !arraysMatchByIds(formIncomeEntries, storeIncomeEntries)) {
			applicant.incomeEntries = storeIncomeEntries;
			result.incomeUpdated++;
			result.hadChanges = true;
		}

		// ── 2. Reconcile selected profiles ──────────────────────
		if (storeData.incomeProfiles.selectedProfiles.length > 0) {
			applicant.selectedIncomeProfiles = storeData.incomeProfiles.selectedProfiles;
		}

		// ── 3. Reconcile obligations ────────────────────────────
		const storeObligations = storeData.obligations.active ?? [];
		const formObligations = (applicant.obligations ?? []) as EnhancedLoanEntry[];

		// Store wins for obligations — it tracks add/edit/delete properly.
		// Compare by count: store has more complete data after user edits.
		if (storeObligations.length > 0 && storeObligations.length !== formObligations.length) {
			applicant.obligations = storeObligations;
			result.obligationsUpdated++;
			result.hadChanges = true;
		}

		// Also sync the ObligationsRunning flag if store has obligations
		if (storeObligations.length > 0 && applicant.ObligationsRunning !== 'Yes') {
			applicant.ObligationsRunning = 'Yes';
		}

		// ── 4. Reconcile credit score ───────────────────────────
		const storeCreditScore = storeData.creditScore;
		if (storeCreditScore?.score && storeCreditScore.score > 0) {
			const currentScore = (applicant.cibilScore as number) ?? 0;
			if (currentScore !== storeCreditScore.score) {
				applicant.cibilScore = storeCreditScore.score;
				applicant.creditScoreRange = storeCreditScore.range;
				applicant.creditScoreSource = storeCreditScore.source;
				result.creditUpdated++;
				result.hadChanges = true;
			}
		}
	}

	return result;
}

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Check if two arrays of entries match by their IDs (order-independent).
 * Avoids unnecessary overwrites when data is already in sync.
 */
function arraysMatchByIds(
	a: Array<{ id?: string; entryId?: string }>,
	b: Array<{ id?: string; entryId?: string }>
): boolean {
	if (a.length !== b.length) return false;

	const idsA = new Set(a.map((entry) => entry.id ?? entry.entryId ?? ''));
	const idsB = new Set(b.map((entry) => entry.id ?? entry.entryId ?? ''));

	if (idsA.size !== idsB.size) return false;

	for (const id of idsA) {
		if (!idsB.has(id)) return false;
	}
	return true;
}
