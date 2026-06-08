/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: when the user picks "Not this person" / "different applicant" in
 *           RestoreApplicantModal, the in-flight Individual is stamped with
 *           __independentOfSameName, and every downstream auto-link path that
 *           name-merges directors into standalone Individuals MUST skip her.
 *
 * Without this contract, two intentionally-distinct same-named applicants
 * (a Company's director Rita + a standalone Individual Rita) collapse into a
 * single director sub-row: the standalone Individual gets `linkedCompanyId`
 * stamped by one of three auto-link paths, then the sortedApplicantEntries
 * filter (applicantFormManager.svelte.ts) correctly hides her as a sub-row.
 * Result: applicants.length stays at 5, the visible table renders 3 rows,
 * and the user has no way to find the missing rows.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BUG (S106, 2026-05-18, user-reported via screenshots)
 * ─────────────────────────────────────────────────────
 *   1. User on Plot Loan creates Company "Acer" with directors Rita + Sita.
 *      (Two auto-created Individuals appear as sub-rows under Acer.)
 *   2. User adds two MORE standalone Individuals also named Rita + Sita.
 *   3. RestoreApplicantModal pops up offering to restore the existing Ritas.
 *      User clicks "Not this person" → intent is "different applicant."
 *   4. User opens income for standalone Rita, picks "Director in Company"
 *      with company name "acer". SameCompanyPromptModal asks "is this the
 *      same company?" — user confirms.
 *   5. Returns to Who's Applying. Console: applicants.length === 5.
 *      Visible table: 3 rows (Acer + 2 director sub-rows). The standalone
 *      Ritas/Sitas have silently been stamped linkedCompanyId === acer.id
 *      and are filtered out as director sub-rows.
 *
 * ROOT CAUSE
 * ──────────
 * The "different applicant" choice from RestoreApplicantModal was a runtime
 * intent only — never persisted on the new Individual. Three downstream
 * auto-link paths then treat any same-name Individual as fair game:
 *   A. DirectorCards.svelte — syncDirectorsToFormState / commitDirectorsToState
 *      merge by `normalizeName(fullName)`, overwriting the standalone with
 *      director data including linkedCompanyId.
 *   B. applicantFormManager.svelte.ts (new-company sync) — links an Individual
 *      whose income-entry entityName matches a newly-arrived Company name.
 *   C. applicantRestoreHandler.ts (relinkDirectorsAndCompanies, Scenario B)
 *      — when a Company is restored, name-matches any unlinked Individual
 *      against the restored Company's directors[] and stamps linkedCompanyId.
 *
 * FIX
 * ───
 * Persist the intent on the applicant. `handleRestoreModalCancel()` stamps
 * `__independentOfSameName: true` on the in-flight Individual at
 * `restoreIntentState.currentIndex`. Each of the three auto-link sites then
 * checks the flag and skips flagged Individuals.
 *
 * THIS TEST
 * ─────────
 *   1. Calls real `handleRestoreModalCancel()` against formState + intent
 *      state — asserts the flag lands on the right slot.
 *   2. Source-pattern check on the 3 guard sites — protects against refactors
 *      that drop the guard and silently re-introduce the 5→3 collapse.
 *
 * Why source-pattern (not behavioral) for guards: the guard sites are deep
 * inside Svelte 5 rune-state classes ($effect → untrack → mutating
 * formState.replaceApplicants), or are local functions inside .svelte files
 * not exported. Driving them behaviorally requires a full component mount
 * harness. The pattern check catches the regression class (someone removing
 * the `__independentOfSameName` early-return) at zero mount cost.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formState } from '$lib/state/form.svelte';
import { applicantState } from '$lib/state/applicant.svelte';
import { restoreIntentState } from '$lib/stores/restoreApplicantIntent.svelte';
import { handleRestoreModalCancel } from '$lib/utils/directorRestoreHandler';

function resetState(): void {
	formState.replaceApplicants([]);
	formState.replaceLoanData({});
	formState.applicationData = {} as typeof formState.applicationData;
	applicantState.clearAll();
	restoreIntentState.reset();
	restoreIntentState.clearConfirmed();
	restoreIntentState.clearCancelled();
}

describe('handleRestoreModalCancel — stamps __independentOfSameName on the in-flight Individual', () => {
	beforeEach(resetState);

	it('stamps the flag on the Individual at currentIndex', () => {
		formState.replaceApplicants([
			// Slot 0: the user just added this — name clashes with an existing director.
			{
				id: 'standalone-rita',
				applicantType: 'Individual',
				fullName: 'Rita',
				age: '33',
				gender: 'female'
			} as any
		]);

		restoreIntentState.set({
			open: true,
			currentIndex: 0,
			matches: [
				{
					uuid: 'match-rita-existing',
					displayName: 'Rita (Director of Acer)',
					deletedAt: 0,
					data: { applicantType: 'Individual', fullName: 'Rita' }
				}
			]
		});

		handleRestoreModalCancel();

		// The flag must land on the in-flight slot — that's how downstream
		// auto-link paths know to leave this person alone.
		expect(formState.applicants[0].__independentOfSameName).toBe(true);

		// Modal state should be reset (open=false), but flag persists.
		expect(restoreIntentState.open).toBe(false);
	});

	it('is a no-op when currentIndex is undefined (defensive)', () => {
		formState.replaceApplicants([
			{ id: 'a1', applicantType: 'Individual', fullName: 'Solo' } as any
		]);
		restoreIntentState.set({ open: true, currentIndex: undefined, matches: [] });

		expect(() => handleRestoreModalCancel()).not.toThrow();
		expect(formState.applicants[0].__independentOfSameName).toBeUndefined();
	});

	it('is a no-op when currentIndex points past the array (push-new without push)', () => {
		formState.replaceApplicants([
			{ id: 'a1', applicantType: 'Individual', fullName: 'Solo' } as any
		]);
		// applicants.length === 1; currentIndex === 1 means "the next push slot".
		// Safer to skip than to stamp the wrong record. The user's reported flow
		// always pre-pushes before the modal opens, so this branch is a safety net.
		restoreIntentState.set({ open: true, currentIndex: 1, matches: [] });

		handleRestoreModalCancel();
		expect(formState.applicants).toHaveLength(1);
		expect(formState.applicants[0].__independentOfSameName).toBeUndefined();
	});

	it('does not stamp on Company applicants (flag is Individual-only)', () => {
		// Companies aren't subject to director-merge so the flag would be a no-op.
		// Stamping it anyway would clutter state with a flag that has no meaning.
		formState.replaceApplicants([
			{ id: 'co-1', applicantType: 'Company', fullName: 'Acer Inc' } as any
		]);
		restoreIntentState.set({ open: true, currentIndex: 0, matches: [] });

		handleRestoreModalCancel();
		expect(formState.applicants[0].__independentOfSameName).toBeUndefined();
	});

	it('does not re-stamp an already-flagged applicant (no state churn)', () => {
		formState.replaceApplicants([
			{
				id: 'a1',
				applicantType: 'Individual',
				fullName: 'Rita',
				__independentOfSameName: true
			} as any
		]);
		const before = formState.applicants[0];

		restoreIntentState.set({ open: true, currentIndex: 0, matches: [] });
		handleRestoreModalCancel();

		// Same object reference — replaceApplicants was not called for this slot.
		expect(formState.applicants[0]).toBe(before);
	});
});

describe('source-pattern guards — auto-link sites must consult __independentOfSameName', () => {
	// These pattern checks protect the three guard sites against silent removal
	// during refactors. The grep recipes in CLAUDE.md §4 can also surface a
	// regression manually, but a unit test is faster feedback.

	function read(rel: string): string {
		return readFileSync(resolve(process.cwd(), rel), 'utf8');
	}

	it('DirectorCards.svelte: both name-merge sites check the flag', () => {
		const src = read('src/lib/components/DirectorCards.svelte');
		// Two occurrences expected — syncDirectorsToFormState + commitDirectorsToState.
		// Both run name-only existingIdx lookups that previously merged the standalone.
		const matches = src.match(/if\s*\(\s*a\.__independentOfSameName\s*\)\s*return\s+false/g);
		expect(matches?.length ?? 0).toBeGreaterThanOrEqual(2);
	});

	it('applicantFormManager.svelte.ts: new-company sync skips flagged Individuals', () => {
		const src = read('src/lib/components/applicantFormManager.svelte.ts');
		// The guard must appear before the executable __pendingCompanyLink read
		// (not a comment / type-cast reference). Look for the cast pattern that
		// only appears in the runtime check: `applicant.__pendingCompanyLink as string`.
		const idxGuard = src.search(/if\s*\(\s*applicant\.__independentOfSameName\s*\)\s*continue/);
		const idxPendingLinkRead = src.indexOf('applicant.__pendingCompanyLink as string');
		expect(idxGuard).toBeGreaterThan(-1);
		expect(idxPendingLinkRead).toBeGreaterThan(-1);
		// Guard must short-circuit the loop iteration BEFORE the pending-link
		// check runs — otherwise a stale __pendingCompanyLink (set during an
		// earlier restore) could still stamp linkedCompanyId on a flagged Individual.
		expect(idxGuard).toBeLessThan(idxPendingLinkRead);
	});

	it('applicantRestoreHandler.ts: director-name relink (Scenario B) skips flagged Individuals', () => {
		const src = read('src/lib/utils/applicantRestoreHandler.ts');
		// The Scenario B "match by director name" block must include the flag check
		// in its guarding condition — `!applicant.linkedCompanyId && !applicant.__independentOfSameName`.
		expect(src).toMatch(/!applicant\.linkedCompanyId\s*&&\s*!applicant\.__independentOfSameName/);
	});

	it('handleRestoreModalCancel: stamps via formState.replaceApplicants (not a transient mutation)', () => {
		const src = read('src/lib/utils/directorRestoreHandler.ts');
		// Stamping must go through replaceApplicants — direct mutation of the
		// rune-state array bypasses Svelte reactivity and silently fails to
		// re-render the Who's Applying table.
		const fnStart = src.indexOf('export function handleRestoreModalCancel');
		expect(fnStart).toBeGreaterThan(-1);
		const fnBody = src.slice(fnStart, fnStart + 2000);
		expect(fnBody).toMatch(/__independentOfSameName:\s*true/);
		expect(fnBody).toMatch(/formState\.replaceApplicants/);
	});
});
