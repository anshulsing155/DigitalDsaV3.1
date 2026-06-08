/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: clicking Restore in RestoreApplicantModal must never silently
 *           no-op when the restore was triggered from DirectorFormModal —
 *           even when the modal opened via a Business Loan flow that
 *           previously bypassed the director-restore branch entirely.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BUG (user-reported 2026-05-23)
 * ──────────────────────────────
 * Repro:
 *   1. Business Loan → New Loan → Pvt Ltd.
 *   2. Enter company details. Add multiple directors including one named
 *      "rajeev".
 *   3. Switch entity type from Pvt Ltd → OPC (OPC requires a single director,
 *      "rajeev" is deleted in the down-size picker → goes into the recovery
 *      bin under the `business::director` scope).
 *   4. Switch entity type back from OPC → Pvt Ltd.
 *   5. Add a director with the SAME name "rajeev". The matcher sees a recovery
 *      match → RestoreApplicantModal opens with `restoreIntentState.set({
 *        open: true, matches: [...], directorRestore: { companyId, ... }
 *      })`. Notably, `currentIndex` is NOT set — the target is a director
 *      sub-form, not an applicants-list slot.
 *   6. User clicks "Restore".
 *
 * Expected: rajeev's previously-entered data is restored into the new director
 * slot, the modal closes.
 * Actual (pre-fix): the modal stayed open. Restore was a silent no-op — no
 * error, no toast, no console output. Cancel was the only escape.
 *
 * ROOT CAUSE
 * ──────────
 * The BL +page.svelte onConfirm called only `prefillApplicantRestore(match)`.
 * That handler bails at its earliest guard when `currentIndex === undefined`:
 *
 *   const currentIndex = restoreIntentState.currentIndex;
 *   if (currentIndex === undefined || !restoredData) return null;
 *
 * Pre-fix this `return null` did NOT reset the intent. The modal's `open` prop
 * was bound to `restoreIntentState.open`, which stayed true → the modal sat
 * there. Secured-loan pages avoid this by wrapping their onConfirm with
 * `handleRestoreModalConfirm` (which checks `directorRestore` and routes to
 * `applyDirectorRestore` on the form ref) — the unsecured-loan pages were
 * never updated to do the same.
 *
 * FIX
 * ───
 *   1. `prefillApplicantRestore` now resets the intent when it bails with a
 *      `directorRestore` context set — belt-and-suspenders so the modal
 *      can never get stuck even if a caller forgets to wrap.
 *   2. The BL +page.svelte onConfirm now wraps with `handleRestoreModalConfirm`
 *      to dispatch director-context restores to the form ref.
 *   3. `AddApplicantBusiness` exposes `applyDirectorRestore(...)`.
 *   4. `ApplicantFormUnsecured` exposes a pass-through to the active step0.
 *
 * THIS TEST
 * ─────────
 * Drives the prefill-with-director-context bail path directly and asserts:
 *   1. When `directorRestore` is set and `currentIndex` is undefined,
 *      `prefillApplicantRestore` returns null AND resets the modal state
 *      (the silent-no-op symptom).
 *   2. The normal applicant-list restore path (with currentIndex set) still
 *      works — no regression in the secured-loan branch.
 *   3. Source-pattern check: AddApplicantBusiness exposes applyDirectorRestore,
 *      ApplicantFormUnsecured exposes the pass-through, and the BL +page.svelte
 *      onConfirm routes through handleRestoreModalConfirm. These collectively
 *      protect against refactors that drop the new wiring and silently
 *      re-introduce the regression.
 *
 * Companion: CLAUDE.md §3 / docs/PITFALLS.md — relates to Pitfalls #32, #35,
 * #36, #37 (restore-modal slot context).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formState } from '$lib/state/form.svelte';
import { applicantState } from '$lib/state/applicant.svelte';
import { restoreIntentState } from '$lib/stores/restoreApplicantIntent.svelte';
import {
	prefillApplicantRestore,
	type RestoreMatchData
} from '$lib/utils/applicantRestoreHandler';

function resetState(): void {
	formState.replaceApplicants([]);
	formState.replaceLoanData({});
	formState.applicationData = {} as typeof formState.applicationData;
	applicantState.clearAll();
	restoreIntentState.reset();
	restoreIntentState.clearConfirmed();
	restoreIntentState.clearCancelled();
}

// Build a recovery match for "rajeev" the way the matcher in DirectorFormModal
// would produce one — Individual applicant data, no live-match flag.
function buildRajeevMatch(): RestoreMatchData {
	return {
		uuid: 'recovery-rajeev',
		displayName: 'rajeev',
		data: {
			applicantType: 'Individual',
			fullName: 'rajeev',
			age: '22',
			gender: 'male',
			maritalStatus: 'single',
			isNRI: 'No'
		}
	};
}

describe('Business Loan director restore — silent no-op regression guard', () => {
	beforeEach(() => {
		resetState();
		// BL context — the unsecured branch in prefillApplicantRestore reads
		// applicationData.loanCategory to set onEMI/onProperty defaults.
		formState.applicationData = {
			loanCategory: 'business'
		} as unknown as typeof formState.applicationData;
	});

	it('resets the modal when DirectorFormModal opens it with no currentIndex', () => {
		// Mirror exactly what DirectorFormModal.svelte does at lines 325-336:
		// open the modal with director-slot context but NO currentIndex (because
		// the target is a director sub-form, not an applicants-list slot).
		restoreIntentState.set({
			open: true,
			matches: [
				{
					uuid: 'recovery-rajeev',
					displayName: 'rajeev',
					deletedAt: Date.now(),
					data: buildRajeevMatch().data
				}
			],
			directorRestore: {
				companyId: 'company-1',
				directorIdx: 0,
				companyName: 'Acme Pvt Ltd',
				companyEntityType: 'Private Limited'
			}
			// NOTE: currentIndex intentionally omitted — this is the user's
			// real-world scenario.
		});

		expect(restoreIntentState.open).toBe(true);
		expect(restoreIntentState.currentIndex).toBeUndefined();
		expect(restoreIntentState.directorRestore).toBeDefined();

		// Simulate the pre-fix BL onConfirm path: call prefillApplicantRestore
		// without first routing through handleRestoreModalConfirm.
		const result = prefillApplicantRestore(buildRajeevMatch());

		// Pre-fix this returned null AND left the modal open — the silent no-op.
		// Post-fix it still returns null (the wrapper should have handled it),
		// but it MUST also reset the intent so the modal closes instead of
		// hanging. This is the regression check.
		expect(result).toBeNull();
		expect(restoreIntentState.open).toBe(false);
		expect(restoreIntentState.directorRestore).toBeUndefined();
		expect(restoreIntentState.matches).toBeUndefined();
	});

	it('does NOT reset on the normal applicant-list bail (currentIndex undefined, no directorRestore)', () => {
		// Sanity check: when there's no director context AND no currentIndex,
		// we're in a "caller forgot to set up state" scenario, not a known
		// silently-broken path. Don't reset — that would mask the bug. The
		// modal won't be open in this case anyway because the caller never
		// `set({ open: true, ... })` properly.
		expect(restoreIntentState.open).toBe(false);
		expect(restoreIntentState.directorRestore).toBeUndefined();

		const result = prefillApplicantRestore(buildRajeevMatch());

		expect(result).toBeNull();
		// State remains untouched — we didn't reset something we didn't open.
		expect(restoreIntentState.open).toBe(false);
	});

	it('still works for normal applicants-list restores (currentIndex set, no directorRestore)', () => {
		// Regression-prevention for secured-loan / non-director applicant
		// restore. This is the happy path the bail must not interfere with.
		const previousSlot = {
			id: 'slot-r',
			applicantType: 'Individual' as const,
			fullName: 'r',
			isNRI: 'No'
		} as any;
		formState.replaceApplicants([previousSlot]);

		restoreIntentState.set({
			open: true,
			currentIndex: 0,
			matches: [],
			slotApplicantType: 'Individual'
		});

		const result = prefillApplicantRestore(buildRajeevMatch());

		expect(result).not.toBeNull();
		expect(result!.cardId).toBe('slot-r');
		expect(formState.applicants[0].fullName).toBe('rajeev');
		expect(formState.applicants[0].age).toBe('22');
	});
});

describe('Business Loan director restore — source-pattern checks', () => {
	function read(rel: string): string {
		return readFileSync(resolve(process.cwd(), rel), 'utf8');
	}

	it('AddApplicantBusiness.svelte exposes applyDirectorRestore', () => {
		const src = read('src/lib/components/AddApplicantBusiness.svelte');
		expect(
			/export function applyDirectorRestore\(/.test(src),
			'AddApplicantBusiness.svelte must expose applyDirectorRestore so the BL +page.svelte onConfirm can route director-modal restores through it. Without this, the Restore button on DirectorFormModal-triggered restores becomes a silent no-op.'
		).toBe(true);
	});

	it('AddApplicantBusiness.applyDirectorRestore commits directors via commitDirectorsToApplicants', () => {
		// Smell-check that the implementation actually persists changes to
		// formState.applicants — not just to the local directorForms array.
		// Without the commit, the linked Individual that holds restored
		// income/CIBIL/obligations data would never appear in the applicants
		// list, and the restored applicantDataStore entry would orphan.
		const src = read('src/lib/components/AddApplicantBusiness.svelte');
		const fnIdx = src.indexOf('export function applyDirectorRestore');
		expect(fnIdx, 'applyDirectorRestore must exist before we can check its body').toBeGreaterThan(
			-1
		);
		const fnBody = src.slice(fnIdx, fnIdx + 4000);
		expect(
			/commitDirectorsToApplicants\(/.test(fnBody),
			'AddApplicantBusiness.applyDirectorRestore must invoke commitDirectorsToApplicants to write the restored director back to formState.applicants. Without this, the restored data sits in the local directorForms array only and is invisible to the rest of the form.'
		).toBe(true);
		expect(
			/applicantDataStore\.fromJSON/.test(fnBody),
			'AddApplicantBusiness.applyDirectorRestore must restore structured data (income/CIBIL/obligations) into applicantDataStore when present.'
		).toBe(true);
	});

	it('ApplicantFormUnsecured.svelte exposes a pass-through applyDirectorRestore', () => {
		const src = read('src/lib/components/ApplicantFormUnsecured.svelte');
		expect(
			/export function applyDirectorRestore\(/.test(src),
			'ApplicantFormUnsecured.svelte must expose a pass-through applyDirectorRestore so the BL +page.svelte form ref (which binds to ApplicantFormUnsecured, not directly to AddApplicantBusiness) can route director restores down to the active step0.'
		).toBe(true);
	});

	it('business-loan/+page.svelte onConfirm routes through handleRestoreModalConfirm', () => {
		const src = read('src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte');
		expect(
			/handleRestoreModalConfirm\(/.test(src),
			'business-loan/+page.svelte must wrap its onConfirm with handleRestoreModalConfirm from directorRestoreHandler. Without this, director-modal-triggered restores call prefillApplicantRestore directly, which bails with null because currentIndex is undefined → modal stays open silently.'
		).toBe(true);
	});

	it('prefillApplicantRestore resets the intent when bailing with directorRestore set', () => {
		// Belt-and-suspenders source check — protect against regressions that
		// drop the safety net inside the early bail.
		const src = read('src/lib/utils/applicantRestoreHandler.ts');
		// The reset must happen INSIDE the currentIndex===undefined branch,
		// guarded by restoreIntentState.directorRestore — otherwise we'd reset
		// every time, including legitimate "caller didn't set state" cases.
		expect(
			/if \(restoreIntentState\.directorRestore\) \{\s*restoreIntentState\.reset\(\);/.test(src),
			'prefillApplicantRestore must reset restoreIntentState when bailing because currentIndex is undefined AND directorRestore is set. This prevents the modal from hanging forever when a page-level handler forgets to route through handleRestoreModalConfirm.'
		).toBe(true);
	});
});
