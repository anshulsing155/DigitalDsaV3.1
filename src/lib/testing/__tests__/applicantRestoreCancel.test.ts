/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: cancelling a pending restore rewinds formState AND signals
 *           cancellation so buffer-holding components (Business sole-prop's
 *           inline Proprietor form) can resync their local state.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BUG (S105, 2026-05-18, user-reported via screenshots)
 * ─────────────────────────────────────────────────────
 *   1. User on Business Loan → Sole Proprietorship, typed "qw" in Full Name.
 *   2. Matching Records Found modal surfaced "qwerty"; user clicked Restore.
 *   3. Green PendingRestoreBanner appeared with Cancel / Confirm & Load Data.
 *   4. User clicked Cancel.
 *   5. Expected: form reverts to just "qw" in Full Name, others empty.
 *      Actual: form still displayed qwerty/Male/78/Single. A subsequent Next
 *              would silently re-persist them — Cancel was effectively a no-op
 *              for the visible UI.
 *
 * ROOT CAUSE
 * ──────────
 * AddApplicantBusiness.svelte's Sole-Prop inline form binds to a LOCAL
 * `formApplicant` buffer, not directly to `formState.applicants`. A dedicated
 * $effect populates the buffer when the restore modal closes after a confirm.
 * `cancelApplicantRestore` correctly rewound `formState.applicants`, but
 * nothing told the buffer to resync — so the UI kept showing restored values.
 *
 * The 5 other form pages don't have this issue: Personal/Professional always
 * reset their inline form on modal close; Home/LAP/Plot render directly from
 * a multi-applicant table off `formState.applicants`.
 *
 * FIX
 * ───
 * Coordinate cancel via the existing `restoreIntentState` cross-component
 * bridge (same shape as the `wasConfirmed` mechanism):
 *   - restoreIntentState.cancelledAt: monotonic counter, bumped by
 *     cancelApplicantRestore()
 *   - restoreIntentState.cancelledIndex: which slot was cancelled
 *   - AddApplicantBusiness watches the counter; in sole-prop mode it resyncs
 *     formApplicant from the (rewound) slot, or resets if the slot was
 *     removed because previousSlot had no user data.
 *
 * THIS TEST
 * ─────────
 * Drives the real prefill → cancel sequence against formState and asserts:
 *   1. After cancel, formState.applicants[idx] equals previousSlot (with
 *      user-typed data preserved).
 *   2. restoreIntentState.cancelledAt incremented and cancelledIndex matches.
 *   3. When previousSlot had NO user data, the slot is removed entirely.
 *
 * Plus a source-pattern check that AddApplicantBusiness wires the
 * `cancelledAt` watcher — protects against refactors that drop the
 * subscription and silently re-introduce the regression.
 *
 * Companion: CLAUDE.md §3 / docs/PITFALLS.md — Pitfall #40.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formState } from '$lib/state/form.svelte';
import { applicantState } from '$lib/state/applicant.svelte';
import { restoreIntentState } from '$lib/stores/restoreApplicantIntent.svelte';
import {
	prefillApplicantRestore,
	cancelApplicantRestore,
	type RestoreMatchData
} from '$lib/utils/applicantRestoreHandler';

function resetState(): void {
	formState.replaceApplicants([]);
	formState.replaceLoanData({});
	formState.applicationData = {} as typeof formState.applicationData;
	applicantState.clearAll();
	// Reset both confirm + cancel signals between tests so counters and
	// indexes don't leak across cases.
	restoreIntentState.reset();
	restoreIntentState.clearConfirmed();
	restoreIntentState.clearCancelled();
}

function makeMatch(): RestoreMatchData {
	return {
		uuid: 'match-qwerty',
		displayName: 'qwerty',
		data: {
			applicantType: 'Individual',
			fullName: 'qwerty',
			age: '78',
			gender: 'Male',
			maritalStatus: 'Single',
			isNRI: 'No'
		}
	};
}

describe('cancelApplicantRestore — rewinds formState AND signals cancellation', () => {
	beforeEach(() => {
		resetState();
		// Business Loan Sole-Prop context: the unsecured branch in
		// prefillApplicantRestore reads applicationData.loanCategory to set
		// onEMI=true / onProperty=false. We're not asserting that here but
		// set it so the code path under test matches production.
		formState.applicationData = {
			loanCategory: 'business'
		} as unknown as typeof formState.applicationData;
	});

	it('reverts the slot to previousSlot when the user had typed something', () => {
		// Previous slot: user typed "qw" in Full Name before the modal opened.
		const previousSlot = {
			id: 'slot-1',
			applicantType: 'Individual' as const,
			fullName: 'qw',
			isNRI: 'No'
		} as any;
		formState.replaceApplicants([previousSlot]);

		// Caller sets currentIndex on the intent state before opening the modal.
		restoreIntentState.set({
			open: true,
			currentIndex: 0,
			matches: [],
			slotApplicantType: 'Individual'
		});

		// Phase 1 — prefill writes restored data into the slot.
		const result = prefillApplicantRestore(makeMatch());
		expect(result).not.toBeNull();
		expect(formState.applicants[0].fullName).toBe('qwerty');
		expect(formState.applicants[0].age).toBe('78');

		const beforeCancelTick = restoreIntentState.cancelledAt;

		// Phase 2 — user clicks Cancel on the PendingRestoreBanner.
		cancelApplicantRestore(result!.pending);

		// formState should be back to the typed-"qw" state.
		expect(formState.applicants).toHaveLength(1);
		expect(formState.applicants[0].fullName).toBe('qw');
		expect(formState.applicants[0].age).toBeUndefined();
		expect(formState.applicants[0].gender).toBeUndefined();
		expect(formState.applicants[0].maritalStatus).toBeUndefined();

		// And the cancel signal must have fired so subscribers (sole-prop
		// inline form) can resync their local buffer.
		expect(restoreIntentState.cancelledAt).toBe(beforeCancelTick + 1);
		expect(restoreIntentState.cancelledIndex).toBe(0);
	});

	it('removes the slot entirely when previousSlot had no user data', () => {
		// Previous slot: skeleton from "Add Applicant" with id only — no
		// fullName/age/education means the user never typed anything before
		// the Matching Records modal popped. On Cancel, the slot is removed
		// rather than reverted to an empty husk.
		const emptySlot = {
			id: 'slot-empty',
			applicantType: 'Individual' as const,
			isNRI: 'No'
		} as any;
		formState.replaceApplicants([emptySlot]);

		restoreIntentState.set({
			open: true,
			currentIndex: 0,
			matches: [],
			slotApplicantType: 'Individual'
		});

		const result = prefillApplicantRestore(makeMatch());
		expect(result).not.toBeNull();
		expect(formState.applicants).toHaveLength(1);

		cancelApplicantRestore(result!.pending);

		// No prior user data → slot removed entirely.
		expect(formState.applicants).toHaveLength(0);
		// Cancel signal still fires so subscribers can resync (here it would
		// trigger resetIndividualForm in AddApplicantBusiness).
		expect(restoreIntentState.cancelledIndex).toBe(0);
	});

	it('bumps cancelledAt monotonically across multiple cancels', () => {
		formState.replaceApplicants([
			{ id: 'a', applicantType: 'Individual', fullName: 'aa' } as any
		]);
		restoreIntentState.set({
			open: true,
			currentIndex: 0,
			matches: [],
			slotApplicantType: 'Individual'
		});
		const r1 = prefillApplicantRestore(makeMatch())!;
		const tick1 = restoreIntentState.cancelledAt;
		cancelApplicantRestore(r1.pending);
		const tick2 = restoreIntentState.cancelledAt;

		// Second restore-then-cancel cycle. previousSlot for the new prefill
		// is whatever cancel left behind (the original "aa" slot).
		restoreIntentState.set({
			open: true,
			currentIndex: 0,
			matches: [],
			slotApplicantType: 'Individual'
		});
		const r2 = prefillApplicantRestore(makeMatch())!;
		cancelApplicantRestore(r2.pending);
		const tick3 = restoreIntentState.cancelledAt;

		expect(tick2).toBe(tick1 + 1);
		expect(tick3).toBe(tick2 + 1);
	});

	it('clearCancelled() resets cancelledIndex but preserves the tick', () => {
		formState.replaceApplicants([
			{ id: 'a', applicantType: 'Individual', fullName: 'aa' } as any
		]);
		restoreIntentState.set({
			open: true,
			currentIndex: 0,
			matches: [],
			slotApplicantType: 'Individual'
		});
		const r = prefillApplicantRestore(makeMatch())!;
		cancelApplicantRestore(r.pending);

		const tickAfterCancel = restoreIntentState.cancelledAt;
		expect(restoreIntentState.cancelledIndex).toBe(0);

		restoreIntentState.clearCancelled();
		expect(restoreIntentState.cancelledIndex).toBeUndefined();
		// Tick is monotonic — it's the signal subscribers diff against. Don't
		// reset it on clear, or a future bump might look like a no-op.
		expect(restoreIntentState.cancelledAt).toBe(tickAfterCancel);
	});
});

describe('AddApplicantBusiness wires the cancelledAt watcher (source check)', () => {
	const src = readFileSync(
		resolve(process.cwd(), 'src/lib/components/AddApplicantBusiness.svelte'),
		'utf8'
	);

	it('reads restoreIntentState.cancelledAt inside an $effect', () => {
		// The sole-prop inline form holds local state derived from a confirmed
		// restore; without subscribing to cancelledAt, Cancel leaves stale
		// values on screen (the S105 user-reported bug). This grep is a
		// smell-check, not a hard contract — but the pairing of cancelledAt
		// + clearCancelled is what makes the fix work end-to-end.
		expect(
			src.includes('restoreIntentState.cancelledAt'),
			'AddApplicantBusiness must subscribe to restoreIntentState.cancelledAt to resync its inline Proprietor form after a PendingRestoreBanner Cancel. See docs/PITFALLS.md Pitfall #40.'
		).toBe(true);
		expect(
			src.includes('restoreIntentState.clearCancelled'),
			'AddApplicantBusiness must call restoreIntentState.clearCancelled() after consuming the signal so the same tick is not handled twice.'
		).toBe(true);
	});
});
