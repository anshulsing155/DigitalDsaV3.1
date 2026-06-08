/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: clicking Restore in RestoreApplicantModal must never silently
 *           no-op when the restore was triggered from DirectorFormModal —
 *           even when the modal opened via a Professional Loan flow that
 *           previously bypassed the director-restore branch entirely.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * STRUCTURAL PARITY with businessLoanDirectorRestore.test.ts.
 *
 * Background: Business Loan had this bug fixed 2026-05-23 (Pvt Ltd → OPC →
 * Pvt Ltd → re-add same-named director → Restore silently no-op'd because
 * `prefillApplicantRestore` bailed with `currentIndex === undefined` and the
 * intent was not reset). Professional Loan had the EXACT same structural bug:
 * its `+page.svelte` onConfirm called `prefillApplicantRestore` directly with
 * no `handleRestoreModalConfirm` wrapper, and `AddApplicantProfessional` did
 * not export `applyDirectorRestore`. The belt-and-suspenders reset in
 * `prefillApplicantRestore` prevented the silent-hang, but the restore was
 * still being discarded instead of applied.
 *
 * FIX (this session)
 * ──────────────────
 *   1. `AddApplicantProfessional` exposes `applyDirectorRestore(...)`
 *      (mirrors BL; Prof-specific bit is the `co_applicant_non_financial`
 *      classification on linked Individuals — Professional Loan partners are
 *      always non-financial co-applicants).
 *   2. `professional-loan/+page.svelte` onConfirm now wraps with
 *      `handleRestoreModalConfirm` to dispatch director-context restores to
 *      the form ref.
 *   3. The pass-through in `ApplicantFormUnsecured` was already generic —
 *      activates automatically once step 1 lands.
 *
 * Companion: CLAUDE.md §3 / docs/PITFALLS.md — Pitfalls #32, #35, #36, #37
 * (restore-modal slot context) + #46 (director auto-income sync pairing).
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

describe('Professional Loan director restore — silent no-op regression guard', () => {
	beforeEach(() => {
		resetState();
		// Prof context — the unsecured branch in prefillApplicantRestore reads
		// applicationData.loanCategory to set onEMI/onProperty defaults.
		formState.applicationData = {
			loanCategory: 'professional'
		} as unknown as typeof formState.applicationData;
	});

	it('resets the modal when DirectorFormModal opens it with no currentIndex', () => {
		// Mirror DirectorFormModal: open with director-slot context but NO
		// currentIndex (target is a partner sub-form, not an applicants-list slot).
		// Recovery scope is 'professional::partner' for Professional Loan firms.
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
				companyId: 'firm-1',
				directorIdx: 0,
				companyName: 'Rajeev & Associates LLP',
				companyEntityType: 'LLP'
			}
		});

		expect(restoreIntentState.open).toBe(true);
		expect(restoreIntentState.currentIndex).toBeUndefined();
		expect(restoreIntentState.directorRestore).toBeDefined();

		// Pre-fix path: prefillApplicantRestore called directly without the
		// handleRestoreModalConfirm wrapper. Belt-and-suspenders reset must fire.
		const result = prefillApplicantRestore(buildRajeevMatch());

		expect(result).toBeNull();
		expect(restoreIntentState.open).toBe(false);
		expect(restoreIntentState.directorRestore).toBeUndefined();
		expect(restoreIntentState.matches).toBeUndefined();
	});

	it('does NOT reset on the normal applicant-list bail (currentIndex undefined, no directorRestore)', () => {
		expect(restoreIntentState.open).toBe(false);
		expect(restoreIntentState.directorRestore).toBeUndefined();

		const result = prefillApplicantRestore(buildRajeevMatch());

		expect(result).toBeNull();
		expect(restoreIntentState.open).toBe(false);
	});

	it('still works for normal applicants-list restores (currentIndex set, no directorRestore)', () => {
		// Happy path the bail must not interfere with — the Joint/Individual
		// applicant-list restore on Professional Loan.
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

describe('Professional Loan director restore — source-pattern checks', () => {
	function read(rel: string): string {
		return readFileSync(resolve(process.cwd(), rel), 'utf8');
	}

	it('AddApplicantProfessional.svelte exposes applyDirectorRestore', () => {
		const src = read('src/lib/components/AddApplicantProfessional.svelte');
		expect(
			/export function applyDirectorRestore\(/.test(src),
			'AddApplicantProfessional.svelte must expose applyDirectorRestore so the Prof Loan +page.svelte onConfirm can route director-modal restores through it. Without this, the Restore button on DirectorFormModal-triggered restores discards the restore (belt-and-suspenders reset closes the modal but never applies the data).'
		).toBe(true);
	});

	it('AddApplicantProfessional.applyDirectorRestore commits + syncs auto-income (Pitfall #46)', () => {
		const src = read('src/lib/components/AddApplicantProfessional.svelte');
		const fnIdx = src.indexOf('export function applyDirectorRestore');
		expect(fnIdx, 'applyDirectorRestore must exist before we can check its body').toBeGreaterThan(
			-1
		);
		const fnBody = src.slice(fnIdx, fnIdx + 5000);
		expect(
			/commitDirectorsToApplicants\(/.test(fnBody),
			'AddApplicantProfessional.applyDirectorRestore must invoke commitDirectorsToApplicants to write the restored partner back to formState.applicants. Without this, the restored data sits in the local directorForms array only and is invisible to the rest of the form.'
		).toBe(true);
		expect(
			/syncAutoIncomeEntries\(/.test(fnBody),
			'AddApplicantProfessional.applyDirectorRestore must pair commitDirectorsToApplicants with syncAutoIncomeEntries (CLAUDE.md Pitfall #46). Without it the Director-in-Company auto-row is never created and sourceCompanyId is lost — the income modal would lose the 4 locked specifics.'
		).toBe(true);
		expect(
			/applicantDataStore\.fromJSON/.test(fnBody),
			'AddApplicantProfessional.applyDirectorRestore must restore structured data (income/CIBIL/obligations) into applicantDataStore when present.'
		).toBe(true);
		expect(
			/co_applicant_non_financial/.test(fnBody),
			'AddApplicantProfessional.applyDirectorRestore must classify linked Individuals as co_applicant_non_financial — Professional Loan partners are non-financial co-applicants (parity with handleDirectorSave + validateStep).'
		).toBe(true);
	});

	it('professional-loan/+page.svelte onConfirm routes through handleRestoreModalConfirm', () => {
		const src = read('src/routes/(app)/form/unsecure-loan/professional-loan/+page.svelte');
		expect(
			/handleRestoreModalConfirm\(/.test(src),
			'professional-loan/+page.svelte must wrap its onConfirm with handleRestoreModalConfirm from directorRestoreHandler. Without this, director-modal-triggered restores call prefillApplicantRestore directly, which bails with null because currentIndex is undefined — restored data is discarded.'
		).toBe(true);
	});
});
