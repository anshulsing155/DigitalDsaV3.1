/**
 * Loan Parking State — in-memory store for parked loan applications.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * When a user changes loan type on `/form/how-can-we-help` with meaningful
 * prior data, the chokepoint (`loanSwitchOrchestrator`) parks the prior
 * loan's full state here so the user can resume it later by clicking the
 * "Saved work" strip on the picker — or undo the switch immediately via the
 * post-switch modal.
 *
 * Storage scope: **in-memory only**. Survives within the tab session, dies
 * on tab close. Per the CLAUDE.md §2 invariant "all business logic runs
 * server-side only — client renders only", customer PII never lives in
 * localStorage / sessionStorage. Cross-tab + cross-device resume is a v2
 * concern that will integrate with the existing case-snapshot API.
 *
 * Scoping by application: today the picker page is pre-case-creation, so
 * "this application" is implicitly "this tab session." Once a case is
 * created, the picker page is rarely revisited; if a future redesign brings
 * the user back to it post-case, the parking will continue to live per-tab
 * but the same caseId context will still apply.
 */

interface ParkedLoanEntry {
	/** Loan name this entry represents (e.g. "Personal Loan"). Matches the key. */
	loanName: string;
	/** Wall-clock when the user parked this loan. */
	parkedAt: number;
	/** Opaque dump from `loanSwitchRegistry.dumpAllForPark()`. */
	ownerDump: Record<string, unknown>;
	/**
	 * Snapshot of `formState.loanData[loanName]` — the per-loan answer
	 * subtree. Kept separately because formState's loanData map is not part
	 * of the registry owner graph (registry handles cross-loan global state;
	 * loanData is per-loan and the picker page reads it via $derived).
	 */
	loanDataSubtree: unknown;
	/**
	 * Display sketch for the resume strip — pre-computed at park time so the
	 * picker doesn't have to introspect the parked dump.
	 */
	display: {
		applicantCount: number;
		pagesFilled: number;
	};
}

interface UndoBlob {
	prevLoan: string;
	nextLoan: string;
	appliedAt: number;
	ownerDump: Record<string, unknown>;
	loanData: Record<string, unknown>;
}

class LoanParkingState {
	/**
	 * Per-loan parked entries. Keyed by loan name (e.g. "Personal Loan").
	 * At most one entry per loan — re-parking the same loan replaces.
	 */
	parkedLoans = $state<Record<string, ParkedLoanEntry>>({});

	/**
	 * Wholesale snapshot of the pre-switch state, used by the post-switch
	 * Undo modal. Cleared when the user dismisses the modal or after the
	 * timeout expires. Distinct from `parkedLoans` because Undo restores
	 * EVERYTHING (including applicants), whereas `parkedLoans` skips
	 * applicants (they live in the recovery bin and surface via the
	 * existing per-applicant restore flow).
	 */
	lastSwitchUndo = $state<UndoBlob | null>(null);

	/** Test-only — clear everything. */
	_resetForTests(): void {
		this.parkedLoans = {};
		this.lastSwitchUndo = null;
	}
}

export const loanParkingState = new LoanParkingState();
export type { ParkedLoanEntry, UndoBlob };
