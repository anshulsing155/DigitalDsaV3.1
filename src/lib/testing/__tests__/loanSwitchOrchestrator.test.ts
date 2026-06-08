/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: `switchLoanType` is the atomic chokepoint for loan-type transitions
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Pre-S104, switching loan type on `/form/how-can-we-help` called
 * `migrateApplicantsToRecoveryOnLoanSwitch` directly. That helper cleared
 * applicants + relationships + income profiles, but silently left
 * `userFormConformationState`, `applicantState.restoreAskedKeys`,
 * `applicantState.deniedRecoveryUUIDs`, and `formState.applicationData`
 * untouched. Result: a freshly-chosen Plot Loan rendered the prior Personal
 * Loan's Noteworthy banner, structure question (via combinedAnswers stale
 * aliases), and resume modal (afterNavigate read prior loanName).
 *
 * The orchestrator + registry pattern means EVERY loan-scoped store
 * registers itself once; the chokepoint iterates them. Adding a new store
 * later is a one-line addition rather than another sprinkle of stale-state
 * patches.
 *
 * THIS TEST
 * ─────────
 * Integration test against the real `formState` / `applicantState` /
 * `userFormConformationState` singletons. Verifies:
 *
 *   • `switchLoanType` clears every registered owner
 *   • `lastSwitchUndo` blob captures the wholesale pre-switch state
 *   • `parkedLoans[prev]` captures non-applicant state for the resume strip
 *   • `undoLastSwitch` restores wholesale (loanData + applicants + everything)
 *   • `commitLastSwitch` discards the undo blob
 *   • `resumeParkedLoan` restores non-applicant state + per-loan answer subtree
 *   • `hasMeaningfulPriorData` heuristic — true for non-trivial prior state,
 *     false for blank slate
 *
 * Companion: CLAUDE.md §3 Pitfall #38, §4 grep recipe.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { formState } from '$lib/state/form.svelte';
import { applicantState } from '$lib/state/applicant.svelte';
import { userFormConformationState } from '$lib/stores/userFormConformation.svelte';
import { userRelationships } from '$lib/components/relationship-capture/relationshipStore';
import { get } from 'svelte/store';
import { loanParkingState } from '$lib/state/loanParking.svelte';
import {
	switchLoanType,
	undoLastSwitch,
	commitLastSwitch,
	resumeParkedLoan,
	hasMeaningfulPriorData,
	summarizePriorState
} from '$lib/utils/loanSwitchOrchestrator.svelte';
import type { Applicant } from '$lib/types/formTypes';
import type { Relationship } from '$lib/components/relationship-capture/types';

// Fixture: minimal Individual applicant. `buildMatchSignature` needs
// fullName + gender + maritalStatus + age; missing any of those four returns
// null and the recovery-bin migration silently skips that applicant.
function makeApplicant(overrides: Partial<Applicant> = {}): Applicant {
	return {
		id: 'app-' + Math.random().toString(36).slice(2, 10),
		applicantType: 'Individual',
		fullName: 'Test Applicant',
		age: '35',
		gender: 'male',
		maritalStatus: 'single',
		...overrides
	} as Applicant;
}

function resetAllOwners(): void {
	formState.replaceApplicants([]);
	formState.replaceLoanData({});
	formState.applicationData = {} as typeof formState.applicationData;
	userFormConformationState.reset();
	userRelationships.set([]);
	// clearAll() also empties recoveryBin — important for the migrate-count test
	// because removeToRecovery overwrites on identical matchSignature, so
	// leftover entries from prior tests would cause +2 → +1 collision counts.
	applicantState.clearAll();
	loanParkingState._resetForTests();
}

describe('loanSwitchOrchestrator', () => {
	beforeEach(() => {
		resetAllOwners();
	});

	// ── hasMeaningfulPriorData ────────────────────────────────────────────────

	describe('hasMeaningfulPriorData', () => {
		it('returns false on a blank slate', () => {
			expect(hasMeaningfulPriorData('Personal Loan')).toBe(false);
		});

		it('returns false when prevLoan is empty (initial selection)', () => {
			formState.replaceApplicants([makeApplicant({ fullName: 'Anyone' })]);
			expect(hasMeaningfulPriorData('')).toBe(false);
		});

		it('returns true when at least one applicant is present', () => {
			formState.replaceApplicants([makeApplicant()]);
			expect(hasMeaningfulPriorData('Personal Loan')).toBe(true);
		});

		it('returns true when the prev-loan answer subtree has answered keys', () => {
			formState.replaceLoanData({
				loanName: 'Personal Loan',
				'Personal Loan': { loanName: 'Personal Loan', loanType: 'New Loan' }
			});
			expect(hasMeaningfulPriorData('Personal Loan')).toBe(true);
		});

		it('returns false when the prev-loan subtree has ONLY the loanName marker', () => {
			formState.replaceLoanData({
				loanName: 'Personal Loan',
				'Personal Loan': { loanName: 'Personal Loan' }
			});
			expect(hasMeaningfulPriorData('Personal Loan')).toBe(false);
		});
	});

	// ── summarizePriorState ──────────────────────────────────────────────────

	describe('summarizePriorState', () => {
		it('counts applicants and answered keys', () => {
			formState.replaceApplicants([makeApplicant(), makeApplicant()]);
			formState.replaceLoanData({
				loanName: 'Personal Loan',
				'Personal Loan': { loanName: 'Personal Loan', loanType: 'New Loan', loanAmount: 500000 }
			});
			const s = summarizePriorState('Personal Loan');
			expect(s.applicantCount).toBe(2);
			expect(s.pagesFilled).toBe(2); // loanType + loanAmount (loanName excluded)
		});
	});

	// ── switchLoanType: clears every owner ───────────────────────────────────

	describe('switchLoanType — clears every owner', () => {
		beforeEach(() => {
			formState.replaceApplicants([
				makeApplicant({ fullName: 'John Doe' }),
				makeApplicant({ fullName: 'Jane Doe' })
			]);
			formState.replaceLoanData({
				loanName: 'Personal Loan',
				'Personal Loan': { loanName: 'Personal Loan', loanType: 'New Loan' }
			});
			userFormConformationState.set({
				loanName: 'Personal Loan',
				firstPageData: { stepCompleted: true }
			});
			userRelationships.set([{ id: 'r1' } as Relationship]);
			applicantState.markRestoreAsked('some::detection::key');
		});

		it('clears formState.applicants', () => {
			switchLoanType('Personal Loan', 'Plot Loan');
			expect(formState.applicants).toHaveLength(0);
		});

		it('clears userFormConformationState', () => {
			switchLoanType('Personal Loan', 'Plot Loan');
			expect(userFormConformationState.loanName).toBe('');
			expect(Object.keys(userFormConformationState.firstPageData)).toHaveLength(0);
		});

		it('clears relationships', () => {
			switchLoanType('Personal Loan', 'Plot Loan');
			expect(get(userRelationships)).toHaveLength(0);
		});

		it('clears applicantState.restoreAskedKeys', () => {
			switchLoanType('Personal Loan', 'Plot Loan');
			expect(applicantState.hasRestoreAsked('some::detection::key')).toBe(false);
		});

		it('migrates applicants to the recovery bin', () => {
			// removeToRecovery() collapses duplicate signatures, so the inner-describe
			// beforeEach used distinct names — both should land separately.
			const beforeCount = applicantState.recoveryBin.length;
			switchLoanType('Personal Loan', 'Plot Loan');
			expect(applicantState.recoveryBin.length).toBe(beforeCount + 2);
		});

		it('is a no-op when prev === next', () => {
			switchLoanType('Personal Loan', 'Personal Loan');
			expect(formState.applicants).toHaveLength(2);
		});

		it('is a no-op when prev is empty (initial selection)', () => {
			switchLoanType('', 'Plot Loan');
			expect(formState.applicants).toHaveLength(2);
		});
	});

	// ── switchLoanType: capture for undo ─────────────────────────────────────

	describe('switchLoanType — captures undo blob', () => {
		it('sets lastSwitchUndo with prev/next loan names', () => {
			formState.replaceApplicants([makeApplicant()]);
			formState.replaceLoanData({
				loanName: 'Personal Loan',
				'Personal Loan': { loanName: 'Personal Loan' }
			});

			switchLoanType('Personal Loan', 'Plot Loan');

			expect(loanParkingState.lastSwitchUndo).not.toBeNull();
			expect(loanParkingState.lastSwitchUndo?.prevLoan).toBe('Personal Loan');
			expect(loanParkingState.lastSwitchUndo?.nextLoan).toBe('Plot Loan');
		});

		it('parks the prior loan in parkedLoans with display sketch', () => {
			formState.replaceApplicants([makeApplicant(), makeApplicant()]);
			formState.replaceLoanData({
				loanName: 'Personal Loan',
				'Personal Loan': { loanName: 'Personal Loan', loanType: 'New Loan', loanAmount: 500000 }
			});

			switchLoanType('Personal Loan', 'Plot Loan');

			const parked = loanParkingState.parkedLoans['Personal Loan'];
			expect(parked).toBeDefined();
			expect(parked.loanName).toBe('Personal Loan');
			expect(parked.display.applicantCount).toBe(2);
			expect(parked.display.pagesFilled).toBe(2);
		});
	});

	// ── undoLastSwitch ───────────────────────────────────────────────────────

	describe('undoLastSwitch', () => {
		it('restores applicants wholesale', () => {
			formState.replaceApplicants([makeApplicant({ fullName: 'Restored Doe' })]);
			formState.replaceLoanData({
				loanName: 'Personal Loan',
				'Personal Loan': { loanName: 'Personal Loan' }
			});

			switchLoanType('Personal Loan', 'Plot Loan');
			expect(formState.applicants).toHaveLength(0);

			const applied = undoLastSwitch();
			expect(applied).toBe(true);
			expect(formState.applicants).toHaveLength(1);
			expect(formState.applicants[0].fullName).toBe('Restored Doe');
		});

		it('restores loanData wholesale', () => {
			formState.replaceLoanData({
				loanName: 'Personal Loan',
				'Personal Loan': { loanName: 'Personal Loan', loanType: 'New Loan' }
			});

			switchLoanType('Personal Loan', 'Plot Loan');
			undoLastSwitch();

			expect(formState.loanData.loanName).toBe('Personal Loan');
			const subtree = (formState.loanData as Record<string, any>)['Personal Loan'];
			expect(subtree.loanType).toBe('New Loan');
		});

		it('restores userFormConformationState', () => {
			userFormConformationState.set({
				loanName: 'Personal Loan',
				firstPageData: { marker: 'pre-switch' }
			});

			switchLoanType('Personal Loan', 'Plot Loan');
			undoLastSwitch();

			expect(userFormConformationState.loanName).toBe('Personal Loan');
			expect(userFormConformationState.firstPageData.marker).toBe('pre-switch');
		});

		it('restores relationships', () => {
			userRelationships.set([{ id: 'r1' } as Relationship, { id: 'r2' } as Relationship]);

			switchLoanType('Personal Loan', 'Plot Loan');
			undoLastSwitch();

			expect(get(userRelationships)).toHaveLength(2);
		});

		it('clears the undo blob after applying', () => {
			formState.replaceApplicants([makeApplicant()]);
			switchLoanType('Personal Loan', 'Plot Loan');
			undoLastSwitch();
			expect(loanParkingState.lastSwitchUndo).toBeNull();
		});

		it('removes the parked entry that was just rolled back', () => {
			formState.replaceLoanData({
				loanName: 'Personal Loan',
				'Personal Loan': { loanName: 'Personal Loan', loanType: 'New Loan' }
			});
			switchLoanType('Personal Loan', 'Plot Loan');
			expect(loanParkingState.parkedLoans['Personal Loan']).toBeDefined();
			undoLastSwitch();
			expect(loanParkingState.parkedLoans['Personal Loan']).toBeUndefined();
		});

		it('returns false when no undo blob exists', () => {
			expect(undoLastSwitch()).toBe(false);
		});
	});

	// ── commitLastSwitch ─────────────────────────────────────────────────────

	describe('commitLastSwitch', () => {
		it('discards the undo blob without rolling back', () => {
			formState.replaceApplicants([makeApplicant()]);
			switchLoanType('Personal Loan', 'Plot Loan');
			expect(loanParkingState.lastSwitchUndo).not.toBeNull();

			commitLastSwitch();

			expect(loanParkingState.lastSwitchUndo).toBeNull();
			// applicants still cleared — no rollback
			expect(formState.applicants).toHaveLength(0);
		});
	});

	// ── resumeParkedLoan ─────────────────────────────────────────────────────

	describe('resumeParkedLoan', () => {
		it('restores non-applicant state + per-loan subtree, consumes the parked entry', () => {
			formState.replaceLoanData({
				loanName: 'Personal Loan',
				'Personal Loan': { loanName: 'Personal Loan', loanType: 'New Loan', loanAmount: 800000 }
			});
			userFormConformationState.set({
				loanName: 'Personal Loan',
				firstPageData: { marker: 'parked' }
			});

			switchLoanType('Personal Loan', 'Plot Loan');
			commitLastSwitch(); // simulate the user dismissing the undo modal

			// Confirm parked entry exists
			expect(loanParkingState.parkedLoans['Personal Loan']).toBeDefined();

			const restored = resumeParkedLoan('Personal Loan');
			expect(restored).toBe(true);

			// loanData subtree restored under the same key
			expect((formState.loanData as Record<string, any>)['Personal Loan'].loanAmount).toBe(800000);
			expect(formState.loanData.loanName).toBe('Personal Loan');

			// Non-applicant state restored
			expect(userFormConformationState.firstPageData.marker).toBe('parked');

			// Parked entry consumed
			expect(loanParkingState.parkedLoans['Personal Loan']).toBeUndefined();
		});

		it('returns false when no parked entry exists for that loan', () => {
			expect(resumeParkedLoan('Home Loan')).toBe(false);
		});

		it('does NOT restore applicants (they live in recovery bin)', () => {
			formState.replaceApplicants([makeApplicant({ fullName: 'Bin Resident' })]);

			switchLoanType('Personal Loan', 'Plot Loan');
			commitLastSwitch();

			// Plot Loan is the active loan, applicants should be empty
			expect(formState.applicants).toHaveLength(0);

			resumeParkedLoan('Personal Loan');

			// Resume doesn't auto-restore applicants — they're in recovery bin
			expect(formState.applicants).toHaveLength(0);
			// Recovery bin still holds them (caller will go through the Restore modal)
			expect(applicantState.recoveryBin.length).toBeGreaterThan(0);
		});
	});
});
