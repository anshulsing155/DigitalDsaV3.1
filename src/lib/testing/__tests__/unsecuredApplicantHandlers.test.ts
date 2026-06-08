/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: deselecting an income profile drops its income entries.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * `handleProfileSelectionChange` in `unsecuredApplicantHandlers.ts` is the
 * single-applicant Personal/Business/Professional-loan handler for income
 * profile selection. When the user picks Salaried + Investment, fills entries
 * for both, goes back, deselects Investment, and advances again — the
 * Investment entry MUST be removed so it doesn't linger on Income Details.
 *
 * Pre-fix (Issue #6, 2026-05-15): this handler updated `selectedIncomeProfiles`
 * but left `incomeEntries` untouched, so the deselected profile's entries
 * silently persisted. This was a parity regression — the equivalent handler
 * in IncomePageNew (multi-applicant) and the inline handlers in the 3 secured
 * loan pages all filter on deselect. Only the unsecured single-applicant
 * helper drifted.
 *
 * Companion: CLAUDE.md §3 Pitfall #24.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { formState } from '$lib/state/form.svelte';
import { handleProfileSelectionChange } from '$lib/utils/unsecuredApplicantHandlers';
import type { IncomeSourceEntry, IncomeProfileType } from '$lib/types/incomeProfile';

function makeEntry(id: string, profileType: IncomeProfileType): IncomeSourceEntry {
	return {
		id,
		profileType,
		entityName: 'Test Source',
		specifics: {},
		income: { gross: 50000 }
	} as unknown as IncomeSourceEntry;
}

describe('handleProfileSelectionChange — single-applicant unsecured handler', () => {
	beforeEach(() => {
		// Reset to a single applicant with TWO income entries (Salaried + Investment).
		formState.replaceApplicants([
			{
				id: 'applicant-1',
				applicantType: 'Individual',
				fullName: 'Test Applicant',
				selectedIncomeProfiles: ['salaried_regular', 'investment_income'],
				incomeEntries: [
					makeEntry('e1', 'salaried_regular'),
					makeEntry('e2', 'investment_income')
				]
			}
		]);
	});

	it('keeps incomeEntries whose profileType is still selected', () => {
		handleProfileSelectionChange(['salaried_regular', 'investment_income']);
		const entries = (formState.applicants[0]?.incomeEntries ?? []) as IncomeSourceEntry[];
		expect(entries).toHaveLength(2);
	});

	it('drops incomeEntries whose profileType was deselected (Issue #6)', () => {
		// User deselects investment_income — its entry must be removed
		handleProfileSelectionChange(['salaried_regular']);
		const entries = (formState.applicants[0]?.incomeEntries ?? []) as IncomeSourceEntry[];
		expect(entries, 'investment_income entry must be dropped on deselect').toHaveLength(1);
		expect(entries[0].profileType).toBe('salaried_regular');
	});

	it('drops ALL entries when every profile is deselected', () => {
		handleProfileSelectionChange([]);
		const entries = (formState.applicants[0]?.incomeEntries ?? []) as IncomeSourceEntry[];
		expect(entries).toHaveLength(0);
	});

	it('updates selectedIncomeProfiles to the new list', () => {
		handleProfileSelectionChange(['salaried_regular']);
		expect(formState.applicants[0]?.selectedIncomeProfiles).toEqual(['salaried_regular']);
	});

	// ── Stash + auto-restore on reselect (S104, Issue 2 — 2026-05-16) ────────

	it('reselecting a deselected profile auto-restores its previously-entered entries', () => {
		// 1. Start with both profiles + their entries (from beforeEach)
		// 2. Deselect investment_income — its entry stashes
		handleProfileSelectionChange(['salaried_regular']);
		expect(
			(formState.applicants[0]?.incomeEntries as IncomeSourceEntry[])?.length,
			'investment entry dropped from active list on deselect'
		).toBe(1);

		// 3. Reselect investment_income — its entry must come back
		handleProfileSelectionChange(['salaried_regular', 'investment_income']);
		const entries = (formState.applicants[0]?.incomeEntries ?? []) as IncomeSourceEntry[];
		expect(entries, 'active list now holds both restored entries').toHaveLength(2);
		const types = entries.map((e) => e.profileType).sort();
		expect(types).toEqual(['investment_income', 'salaried_regular']);
	});

	it('stash survives independent deselect+reselect cycles for separate profiles', () => {
		// Deselect both, one at a time
		handleProfileSelectionChange(['salaried_regular']); // investment stashed
		handleProfileSelectionChange([]); // salaried stashed too

		// Reselect just investment_income — only its entry should come back
		handleProfileSelectionChange(['investment_income']);
		let entries = (formState.applicants[0]?.incomeEntries ?? []) as IncomeSourceEntry[];
		expect(entries, 'only investment restored, salaried still stashed').toHaveLength(1);
		expect(entries[0].profileType).toBe('investment_income');

		// Reselect salaried — its entry should also come back
		handleProfileSelectionChange(['investment_income', 'salaried_regular']);
		entries = (formState.applicants[0]?.incomeEntries ?? []) as IncomeSourceEntry[];
		expect(entries, 'both restored').toHaveLength(2);
	});

	it('restoring does not duplicate when an entry with the same id was added in between', () => {
		// Deselect investment_income — its entry (id=e2) is stashed
		handleProfileSelectionChange(['salaried_regular']);

		// Manually add an investment entry with the same id (simulates re-fill
		// via add flow before the user noticed the deselect)
		const list = [...formState.applicants];
		const existing = ((list[0] as any).incomeEntries ?? []) as IncomeSourceEntry[];
		list[0] = { ...list[0], incomeEntries: [...existing, makeEntry('e2', 'investment_income')] };
		formState.replaceApplicants(list);

		// Reselect investment_income — stashed e2 must NOT add a second copy
		handleProfileSelectionChange(['salaried_regular', 'investment_income']);
		const entries = (formState.applicants[0]?.incomeEntries ?? []) as IncomeSourceEntry[];
		const investmentEntries = entries.filter((e) => e.profileType === 'investment_income');
		expect(investmentEntries, 'e2 not duplicated').toHaveLength(1);
	});

	it('clears the stash key after a successful restore (no double-restore)', () => {
		// Deselect investment_income — entry stashed
		handleProfileSelectionChange(['salaried_regular']);
		// Reselect → restores
		handleProfileSelectionChange(['salaried_regular', 'investment_income']);
		// Deselect again, but this time the stashed e2 has already been put back
		// into incomeEntries, so the active filter will hold it temporarily until
		// the next deselect. Re-deselecting should re-stash from the active list.
		handleProfileSelectionChange(['salaried_regular']);
		// Reselect once more — should still work without ghosting
		handleProfileSelectionChange(['salaried_regular', 'investment_income']);
		const entries = (formState.applicants[0]?.incomeEntries ?? []) as IncomeSourceEntry[];
		const investmentEntries = entries.filter((e) => e.profileType === 'investment_income');
		expect(investmentEntries, 'still one investment entry, no double-restore').toHaveLength(1);
	});

	it('returns the right shape when the applicant has no prior entries', () => {
		formState.replaceApplicants([
			{
				id: 'applicant-1',
				applicantType: 'Individual',
				fullName: 'Fresh Applicant',
				selectedIncomeProfiles: [],
				incomeEntries: []
			}
		]);
		handleProfileSelectionChange(['salaried_regular']);
		const entries = (formState.applicants[0]?.incomeEntries ?? []) as IncomeSourceEntry[];
		expect(entries).toHaveLength(0);
		expect(formState.applicants[0]?.selectedIncomeProfiles).toEqual(['salaried_regular']);
	});
});
