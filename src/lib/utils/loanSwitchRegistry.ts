/**
 * Loan-Switch Registry — chokepoint for "all state owned by the current loan".
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The form has several global stores whose data is implicitly scoped to the
 * currently-selected loan: `formState.applicants`, `relationshipStore`,
 * `incomeProfileStore`, `userFormConformationState`,
 * `applicantState.restoreAskedKeys`, obligation `selectedToClose`, etc. Before
 * this registry existed, switching loan types on `/form/how-can-we-help`
 * cleared SOME of those (via `migrateApplicantsToRecoveryOnLoanSwitch`) and
 * silently left the rest stale — so a freshly-chosen Plot Loan rendered the
 * prior Personal Loan's Noteworthy banner, structure question, and resume
 * modal.
 *
 * The registry doesn't know about loans. It only knows it has N owners, each
 * of which can:
 *   • `dumpForPark()`   — snapshot its current state into an opaque blob
 *   • `clearForLoanSwitch()` — reset itself to the "fresh form" state
 *   • `restoreFromPark(blob)` — re-hydrate from a blob produced by dumpForPark
 *
 * The orchestrator (`loanSwitchOrchestrator.ts`) iterates owners and decides
 * when to dump, clear, and restore. The registry is pure — no domain imports,
 * no circular cycles. State owners register themselves from their own module
 * (or are registered centrally from the orchestrator) so each new
 * loan-scoped store has to opt in explicitly. Forgetting one is now a
 * one-line addition rather than another stale-state bug.
 */

export interface LoanSwitchOwner {
	/** Snapshot the owner's current state. Returned blob is opaque to the registry. */
	dumpForPark(): unknown;
	/** Reset the owner to its empty / "fresh form" state. */
	clearForLoanSwitch(): void;
	/** Re-hydrate from a blob previously returned by `dumpForPark()`. */
	restoreFromPark(blob: unknown): void;
}

/**
 * Map keyed by a stable owner id (e.g. `"formState.applicants"`). Ids are
 * arbitrary strings — they only need to be unique across the registry.
 */
const owners = new Map<string, LoanSwitchOwner>();

/**
 * Register an owner. Idempotent on the id — re-registering replaces the
 * prior entry, which is what HMR needs in dev (the module re-evaluates and
 * the new closures replace the old).
 */
export function registerLoanSwitchOwner(id: string, owner: LoanSwitchOwner): void {
	owners.set(id, owner);
}

/** Remove an owner. Mostly used in tests. */
export function unregisterLoanSwitchOwner(id: string): void {
	owners.delete(id);
}

/** Test-only — clear the entire registry. */
export function _clearRegistryForTests(): void {
	owners.clear();
}

/** Iterate every owner and collect its dump. */
export function dumpAllForPark(): Record<string, unknown> {
	const dump: Record<string, unknown> = {};
	for (const [id, owner] of owners) {
		dump[id] = owner.dumpForPark();
	}
	return dump;
}

/** Iterate every owner and call its clear. */
export function clearAllForLoanSwitch(): void {
	for (const owner of owners.values()) {
		owner.clearForLoanSwitch();
	}
}

/**
 * Re-hydrate every owner from a previously-collected dump. Owners whose id
 * is not present in the dump are left untouched — useful for forward-compat
 * with old parked blobs after new owners are added.
 */
export function restoreAllFromPark(dump: Record<string, unknown>): void {
	for (const [id, owner] of owners) {
		if (id in dump) {
			owner.restoreFromPark(dump[id]);
		}
	}
}

/** Number of registered owners. For tests + the meaningful-prior-state heuristic. */
export function getRegisteredOwnerIds(): string[] {
	return [...owners.keys()];
}
