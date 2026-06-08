/**
 * Loan-Switch Orchestrator — single chokepoint for `loanName` transitions.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Replaces ad-hoc cleanup in `/form/how-can-we-help/+page.svelte` where
 * `migrateApplicantsToRecoveryOnLoanSwitch` was called directly. That helper
 * cleared 3 of ~7 loan-scoped stores and silently left the rest stale, which
 * produced "wrong-loan UI bleeds into freshly-chosen loan" bugs (Noteworthy
 * banner, Resume modal, structure question option-level showWhen, etc.).
 *
 * Public surface
 * ──────────────
 *   • `switchLoanType(prevLoan, nextLoan)` — atomic transition. Snapshots
 *     wholesale into the undo blob (for the post-switch modal), parks
 *     non-applicant state per-loan, migrates applicants to the recovery bin,
 *     and clears every registered owner. Caller checks
 *     `hasMeaningfulPriorData(prevLoan)` first to decide whether to show the
 *     Confirmation modal.
 *   • `undoLastSwitch()` — restores wholesale from the undo blob. Used by
 *     the post-switch modal's "Go Back" button. Returns true if an undo was
 *     applied, false if the blob was already consumed/cleared.
 *   • `commitLastSwitch()` — discards the undo blob. Called when the user
 *     dismisses the modal or the timer expires.
 *   • `resumeParkedLoan(loanName)` — restores non-applicant state + loanData
 *     subtree from a parked entry. Used by the "Saved work" strip on the
 *     picker. Applicants stay in the recovery bin; user re-adds them via
 *     the standard Restore modal on the applicant page (cross-loan
 *     matching is the recovery bin's purpose).
 *   • `hasMeaningfulPriorData(prevLoan)` — heuristic for the Confirmation
 *     modal: true when there's enough prior work that an accidental switch
 *     would be a real loss.
 *
 * Registry vs Orchestrator
 * ────────────────────────
 * The registry (`loanSwitchRegistry.ts`) is pure — knows nothing about loans.
 * THIS file imports the domain stores and registers owners at module load.
 * Picker / form pages import only the orchestrator's public functions. That
 * one-way arrow avoids cycles even though formState transitively reaches
 * back into relationshipStore + incomeProfileStore.
 *
 * v1 scope (today)
 * ────────────────
 * In-memory parking only — survives the tab session, dies on tab close.
 * Cross-tab / cross-device resume via the case-snapshot API is v2.
 */

import { get } from 'svelte/store';
import { formState } from '$lib/state/form.svelte';
import { applicantState } from '$lib/state/applicant.svelte';
import { userFormConformationState } from '$lib/stores/userFormConformation.svelte';
import {
	userRelationships,
	userReciprocalRelationships,
	clearAllRelationships
} from '$lib/components/relationship-capture/relationshipStore';
import { incomeProfileStore } from '$lib/stores/incomeProfileStore';
import { restoreIntentState } from '$lib/stores/restoreApplicantIntent.svelte';
import { migrateApplicantsToRecoveryOnLoanSwitch } from '$lib/utils/loanTypeChangeCleanup.svelte';
import { loanParkingState, type ParkedLoanEntry, type UndoBlob } from '$lib/state/loanParking.svelte';
import {
	registerLoanSwitchOwner,
	dumpAllForPark,
	clearAllForLoanSwitch,
	restoreAllFromPark
} from '$lib/utils/loanSwitchRegistry';
import type { Relationship } from '$lib/components/relationship-capture/types';
import type { Applicant } from '$lib/types/formTypes';

// ─── Owner registrations ────────────────────────────────────────────────────
// Each register call wires one global store into the chokepoint. Adding a new
// loan-scoped store later means adding ONE entry here — impossible to forget
// across N consumer files like before.

// `formState.applicants` — wholesale dump/clear/restore. The
// `migrateApplicantsToRecoveryOnLoanSwitch` helper handles the recovery-bin
// side-effect; here we use a plain replace so undo can roll back wholesale
// without the bin getting double-populated. The orchestrator calls
// `migrateApplicantsToRecoveryOnLoanSwitch` separately at commit time.
registerLoanSwitchOwner('formState.applicants', {
	dumpForPark: () => $state.snapshot(formState.applicants),
	clearForLoanSwitch: () => formState.replaceApplicants([]),
	restoreFromPark: (blob) => formState.replaceApplicants(blob as Applicant[])
});

// `formState.applicationData` — the global per-application answers map.
// Distinct from `loanData[loanName]` (the per-loan answers); applicationData
// holds cross-loan settings like applicantCount, isCoApplicant flags, etc.
registerLoanSwitchOwner('formState.applicationData', {
	dumpForPark: () => $state.snapshot(formState.applicationData),
	clearForLoanSwitch: () => {
		formState.applicationData = {} as typeof formState.applicationData;
	},
	restoreFromPark: (blob) => {
		formState.applicationData = blob as typeof formState.applicationData;
	}
});

// `userFormConformationState` — the lightweight "current loan + first page"
// hint store used by the wizard. Clears via its own `reset()`.
registerLoanSwitchOwner('userFormConformationState', {
	dumpForPark: () => ({
		loanName: userFormConformationState.loanName,
		firstPageData: $state.snapshot(userFormConformationState.firstPageData)
	}),
	clearForLoanSwitch: () => userFormConformationState.reset(),
	restoreFromPark: (blob) => {
		const b = blob as { loanName: string; firstPageData: Record<string, unknown> };
		userFormConformationState.set({ loanName: b.loanName, firstPageData: b.firstPageData });
	}
});

// `relationshipStore` — both user-defined and reciprocal arrays. Reads via
// `get()` (writable bridge), writes via `.set()` on each store, with the
// canonical helper for the clear path.
registerLoanSwitchOwner('relationshipStore', {
	dumpForPark: () => ({
		user: get(userRelationships),
		reciprocal: get(userReciprocalRelationships)
	}),
	clearForLoanSwitch: () => clearAllRelationships(),
	restoreFromPark: (blob) => {
		const b = blob as { user: Relationship[]; reciprocal: Relationship[] };
		userRelationships.set(b.user ?? []);
		userReciprocalRelationships.set(b.reciprocal ?? []);
	}
});

// `incomeProfileStore` — clear-only (v1). The store's public API exposes
// `clearAll()` but no bulk-set primitive, and income profiles are re-derived
// from form answers anyway as the user re-navigates the income page after
// restore. Snapshot returns an empty marker so restore is a no-op.
registerLoanSwitchOwner('incomeProfileStore', {
	dumpForPark: () => null,
	clearForLoanSwitch: () => incomeProfileStore.clearAll(),
	restoreFromPark: () => {
		/* re-derived on next income-page mount */
	}
});

// `applicantState.restoreAskedKeys` + `deniedRecoveryUUIDs` — UI memory for
// suppressing already-prompted restore modals (Pitfall #30). Clear-only on
// switch — re-arming detection on the new loan is the correct behavior. If
// the user undoes, these caches re-arm too, which means at worst the user
// sees one re-prompt; that's a tiny price for avoiding stale-state.
registerLoanSwitchOwner('applicantState.askedAndDenied', {
	dumpForPark: () => null,
	clearForLoanSwitch: () => {
		applicantState.clearAllRestoreAsked();
		applicantState.clearAllDeniedUUIDs();
	},
	restoreFromPark: () => {
		/* re-armed; no restore needed */
	}
});

// `restoreIntentState` — the open restore-applicant modal + its matches and
// director/slot context. This is loan-scoped UI state: a restore modal (or its
// pending director/slot context) left open while the user switches loans would
// bleed the prior loan's applicant context into the new flow (bug P3, Pitfall
// #38). Clear-only — there's nothing meaningful to park, and the new loan
// re-arms its own detection.
registerLoanSwitchOwner('restoreIntentState', {
	dumpForPark: () => null,
	clearForLoanSwitch: () => {
		restoreIntentState.reset();
		restoreIntentState.clearConfirmed();
		restoreIntentState.clearCancelled();
	},
	restoreFromPark: () => {
		/* re-armed on the new loan; no restore needed */
	}
});

// Per-loan page indices (`currentPageIndex` for Home Loan, `lapPageIndex` for
// LAP, etc.) — these track where the user left off in EACH loan's wizard, but
// without registration here they survive every loan switch. The user-reported
// bug (2026-05-28): submit Home Loan → back-nav → switch to Plot Loan → switch
// back → click Next on picker → land on Home Loan's LAST page directly. Root
// cause: `formState.currentPageIndex` stays at the post-submit last-page value
// (e.g. 10) across the entire switch chain because nothing clears it. The
// next loan +page.svelte mount sees this and `computePageIndexOnRemount`
// happily restores it, dropping the user on a page that the now-stale form
// state (empty applicants from the recovery bin migration) can't support —
// causing the sidebar mismatch + Next-button label bug + loader stall.
// Dump for park (undo restores exactly); clear-on-switch (fresh slate);
// restore from park works for both undo and parked-loan resume.
registerLoanSwitchOwner('formState.pageIndices', {
	dumpForPark: () => ({
		currentPageIndex: formState.currentPageIndex,
		applicantPageIndex: formState.applicantPageIndex,
		lapPageIndex: formState.lapPageIndex,
		plotLoanPageIndex: formState.plotLoanPageIndex,
		businessLoanPageIndex: formState.businessLoanPageIndex,
		personalLoanPageIndex: formState.personalLoanPageIndex,
		professionalLoanPageIndex: formState.professionalLoanPageIndex
	}),
	clearForLoanSwitch: () => {
		formState.currentPageIndex = 0;
		formState.applicantPageIndex = 0;
		formState.lapPageIndex = 0;
		formState.plotLoanPageIndex = 0;
		formState.businessLoanPageIndex = 0;
		formState.personalLoanPageIndex = 0;
		formState.professionalLoanPageIndex = 0;
	},
	restoreFromPark: (blob) => {
		const b = blob as Record<string, number>;
		if (typeof b.currentPageIndex === 'number') formState.currentPageIndex = b.currentPageIndex;
		if (typeof b.applicantPageIndex === 'number') formState.applicantPageIndex = b.applicantPageIndex;
		if (typeof b.lapPageIndex === 'number') formState.lapPageIndex = b.lapPageIndex;
		if (typeof b.plotLoanPageIndex === 'number') formState.plotLoanPageIndex = b.plotLoanPageIndex;
		if (typeof b.businessLoanPageIndex === 'number')
			formState.businessLoanPageIndex = b.businessLoanPageIndex;
		if (typeof b.personalLoanPageIndex === 'number')
			formState.personalLoanPageIndex = b.personalLoanPageIndex;
		if (typeof b.professionalLoanPageIndex === 'number')
			formState.professionalLoanPageIndex = b.professionalLoanPageIndex;
	}
});

// `formState.applicantsPayload` + `backHistory` + `pageIndexObject` — peer
// transient buffers to `formState.applicants` that aren't covered by the
// `formState.pageIndices` block above (that block holds the 7 per-loan
// currentPageIndex values; these three are different state shapes). All three
// are loan-scoped and rebuildable from authoritative state on the new loan:
//   • applicantsPayload — payload mirror rebuilt by applicantFormManager on
//     every Add/Edit/Remove pass. No meaningful park value.
//   • backHistory — per-loan navigation stack of {url, timestamp} entries.
//     Stale entries point at the prior loan's wizard URLs; clearing on switch
//     prevents browser-back from landing the user in a stale loan's URL space.
//   • pageIndexObject — array of {pageId, index, completed} entries. Currently
//     only consumed by `_archived/routes/applicantForm/*` (no live consumers),
//     but the field shape persists to localStorage so we can't drop it safely;
//     clearing on switch prevents revived archived code from inheriting cross-
//     loan stale state if those routes ever return.
// Pitfall #38 risk class: same as the originally-registered owners — partial
// cleanup is the bug shape that the registry exists to eliminate. Clear-only
// — restore-from-park is a no-op (new loan rebuilds these from authoritative
// state, identical reasoning to incomeProfileStore above).
registerLoanSwitchOwner('formState.transientBuffers', {
	dumpForPark: () => null,
	clearForLoanSwitch: () => {
		formState.replaceApplicantsPayload([]);
		formState.backHistory = [];
		formState.replacePageIndexObject([]);
	},
	restoreFromPark: () => {
		/* re-derived/re-armed on the new loan; no restore needed */
	}
});

// ─── Public surface ─────────────────────────────────────────────────────────

/**
 * Heuristic — does the previous loan have enough answered data that an
 * accidental switch would be a real loss? Drives the Confirmation modal.
 *
 * Returns true if any of:
 *   • There's at least one applicant on the form
 *   • The previous loan's answer subtree has any key beyond `loanName`
 *   • userFormConformationState.firstPageData has any key
 */
export function hasMeaningfulPriorData(prevLoan: string): boolean {
	if (!prevLoan) return false;

	if (formState.applicants.length > 0) return true;

	const loanData = formState.loanData as Record<string, unknown>;
	const subtree = loanData[prevLoan];
	if (subtree && typeof subtree === 'object') {
		const keys = Object.keys(subtree as Record<string, unknown>).filter((k) => k !== 'loanName');
		if (keys.length > 0) return true;
	}

	if (Object.keys(userFormConformationState.firstPageData).length > 0) return true;

	return false;
}

/**
 * Heuristic summary for the resume-strip and confirmation-modal copy —
 * "X applicants, Y pages filled".
 */
export function summarizePriorState(prevLoan: string): { applicantCount: number; pagesFilled: number } {
	const applicantCount = formState.applicants.length;
	const loanData = formState.loanData as Record<string, unknown>;
	const subtree = (loanData[prevLoan] ?? {}) as Record<string, unknown>;
	// "Pages filled" is a rough heuristic — count distinct top-level answer
	// keys in the loan's subtree (minus the loanName marker). Each page
	// typically contributes 2-5 keys, but exact page count would require a
	// page→key map; this approximation is fine for the resume-strip copy.
	const pagesFilled = Object.keys(subtree).filter((k) => k !== 'loanName').length;
	return { applicantCount, pagesFilled };
}

/**
 * Atomic loan-type transition.
 *
 * 1. Snapshot wholesale into `loanParkingState.lastSwitchUndo` so the
 *    post-switch modal's "Go Back" can roll everything back.
 * 2. Dump non-applicant owners' state into `loanParkingState.parkedLoans[prevLoan]`
 *    (with a display sketch for the resume strip).
 * 3. Migrate applicants to the recovery bin via the existing helper so the
 *    new loan's Restore modal can offer them for name-matched re-adding.
 * 4. Call every registered owner's `clearForLoanSwitch()` for a clean slate.
 *
 * Caller is responsible for then:
 *   • Updating `formState.loanData.loanName` (the picker page does this
 *     immediately after this call via its existing `updateAnswerByKey`).
 *   • Showing the undo modal.
 */
export function switchLoanType(prevLoan: string, nextLoan: string): void {
	if (!prevLoan || prevLoan === nextLoan) return;

	const ownerDump = dumpAllForPark();
	const loanData = $state.snapshot(formState.loanData) as Record<string, unknown>;

	// Build undo blob — wholesale, EVERYTHING needed to restore exactly as-was.
	const undoBlob: UndoBlob = {
		prevLoan,
		nextLoan,
		appliedAt: Date.now(),
		ownerDump,
		loanData
	};
	loanParkingState.lastSwitchUndo = undoBlob;

	// Build park entry — non-applicant state + the per-loan answer subtree.
	// Applicants are intentionally EXCLUDED here because they live in the
	// recovery bin after the migrate step below; resuming a parked loan
	// re-uses the standard recovery flow rather than wholesale restoration.
	const parkOwnerDump = { ...ownerDump };
	delete parkOwnerDump['formState.applicants'];

	const loanSubtree = (loanData[prevLoan] ?? {}) as Record<string, unknown>;
	const parkEntry: ParkedLoanEntry = {
		loanName: prevLoan,
		parkedAt: Date.now(),
		ownerDump: parkOwnerDump,
		loanDataSubtree: loanSubtree,
		display: summarizePriorState(prevLoan)
	};
	loanParkingState.parkedLoans = {
		...loanParkingState.parkedLoans,
		[prevLoan]: parkEntry
	};

	// Migrate applicants out (recovery bin) + clear all registered owners.
	migrateApplicantsToRecoveryOnLoanSwitch(prevLoan);
	clearAllForLoanSwitch();
}

/**
 * Roll back the last switch wholesale. Used by the post-switch Undo modal.
 *
 * Restores from `lastSwitchUndo`:
 *   • formState.loanData (the entire map, so prev-loan's subtree is reachable again)
 *   • Every registered owner's pre-switch state
 *
 * Side-effect we DON'T undo (v1): applicants moved to the recovery bin by
 * `switchLoanType` stay there. The applicants list is restored in formState
 * via the owner registry, so the user sees them as active. The recovery-bin
 * duplicates are harmless for same-loan match detection; future tweak (v2)
 * could prune them by uuid.
 *
 * @returns true if an undo was applied, false if no undo blob existed
 */
export function undoLastSwitch(): boolean {
	const blob = loanParkingState.lastSwitchUndo;
	if (!blob) return false;

	formState.replaceLoanData(blob.loanData);
	restoreAllFromPark(blob.ownerDump);
	// Remove the parked entry we just rolled back (it's no longer "parked").
	if (blob.prevLoan in loanParkingState.parkedLoans) {
		const next = { ...loanParkingState.parkedLoans };
		delete next[blob.prevLoan];
		loanParkingState.parkedLoans = next;
	}
	loanParkingState.lastSwitchUndo = null;
	return true;
}

/**
 * Discard the undo blob without rolling back. Called when the user dismisses
 * the post-switch modal, clicks "Continue", or the auto-expire timer fires.
 */
export function commitLastSwitch(): void {
	loanParkingState.lastSwitchUndo = null;
}

/**
 * Reset the per-loan saved page index for the given loan name.
 *
 * Use case: the user changes a variant-shaping answer (`loanType`,
 * `facilityType`, `loanVariant`) within the SAME loan name on the
 * picker page. Variant change reshapes the visible-page set — a saved index
 * from the prior variant points at a semantically different page in the new
 * variant, so "Continue Where I Left Off" lands the user somewhere
 * meaningless. Resetting the index to 0 forces resume to land on page 1 of
 * the new variant's flow. (Pitfall #41.)
 *
 * This is NOT a full `switchLoanType` — applicants, relationships, income
 * profiles, and applicationData stay intact. Only the per-loan navigation
 * cursor resets.
 *
 * No-op for unknown loan names (defensive — callers may pass a stale string).
 */
const PAGE_INDEX_FIELD_BY_LOAN: Record<
	string,
	'currentPageIndex' | 'lapPageIndex' | 'plotLoanPageIndex' | 'businessLoanPageIndex' | 'personalLoanPageIndex' | 'professionalLoanPageIndex'
> = {
	'Home Loan': 'currentPageIndex',
	'Loan Against Property': 'lapPageIndex',
	'Plot and Construction Loan': 'plotLoanPageIndex',
	'Plot Loan': 'plotLoanPageIndex',
	'Personal Loan': 'personalLoanPageIndex',
	'Business Loan': 'businessLoanPageIndex',
	'Business Loan - Unsecured': 'businessLoanPageIndex',
	'Professional Loan': 'professionalLoanPageIndex'
};

export function resetLoanPageIndex(loanName: string): void {
	const field = PAGE_INDEX_FIELD_BY_LOAN[loanName];
	if (!field) return;
	formState[field] = 0;
}

/**
 * Resume a previously-parked loan from the "Saved work" strip on the
 * picker. Restores non-applicant state + the per-loan answer subtree;
 * applicants stay in the recovery bin and surface on the applicant page
 * via the existing Restore modal.
 *
 * @returns true if a parked entry was restored, false if none existed
 */
export function resumeParkedLoan(loanName: string): boolean {
	const entry = loanParkingState.parkedLoans[loanName];
	if (!entry) return false;

	// Re-hydrate the per-loan subtree into loanData.
	const currentLoanData = $state.snapshot(formState.loanData) as Record<string, unknown>;
	formState.replaceLoanData({
		...currentLoanData,
		[loanName]: entry.loanDataSubtree as Record<string, unknown>,
		loanName
	});

	// Re-hydrate non-applicant owners.
	restoreAllFromPark(entry.ownerDump);

	// Consume the parked entry.
	const next = { ...loanParkingState.parkedLoans };
	delete next[loanName];
	loanParkingState.parkedLoans = next;
	return true;
}
