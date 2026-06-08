# ADR-0007 — Loan-type switch is silent: no confirmation, no undo modal

**Status**: Accepted
**Date**: 2026-05-16
**Session**: S104

---

## Context

Pre-S104, `/form/how-can-we-help` called `migrateApplicantsToRecoveryOnLoanSwitch(prev)` directly when the user changed loan type. That helper cleared three of ~seven globally-scoped loan-dependent stores and left the rest stale — applicants migrated, but `userFormConformationState`, `applicantState.restoreAskedKeys`, `formState.applicationData`, and obligation enums bled across loans. Result: a freshly-picked Plot Loan rendered the prior Personal Loan's Noteworthy banner and option-level showWhen leftovers.

The S104 chokepoint v1 (`c1f87898`) fixed the state-leak architecturally — a registry pattern where every loan-scoped store registers with the orchestrator and `switchLoanType` iterates them all. Pitfall #38 captures the rule: "adding a new loan-scoped store later is a one-line addition rather than another sprinkle of stale-state patches."

Built on top of that, the v1 wrapped a destructive loan-type switch in a UX layer:

- **`LoanSwitchConfirmModal`** ("Change loan type?") — fired when the prior loan had meaningful data. Two buttons: "Save and change to Plot Loan" / "Stay on Personal Loan". Switch was deferred until the user confirmed.
- **`LoanSwitchUndoModal`** ("Loan type changed") — fired immediately after a destructive switch. 30-second auto-expire timer. Two buttons: "Continue with Plot Loan" / "Go back to Personal Loan".
- DOM-level radio snap-back on Cancel (browser-native click marked the just-clicked radio checked; controlled `checked={isSelected}` didn't roll back when `value` prop didn't change).

The design rationale at the time: a loan-switch is destructive enough that warning the user feels safer than failing silently.

## Decision

**Remove the confirmation + undo modal flow entirely. Switch is silent.**

User feedback at S104:
> "This pop up system is too rediculus. neither working as intended not doing what it says. i dont need this. user may change what he want and you just preserve as you do when he changes his options."

Clicking a different loan radio now calls `switchLoanType(prev, next)` immediately. The orchestrator's clear-and-park behavior is unchanged: applicants migrate to the recovery bin, non-applicant state parks under `loanParkingState.parkedLoans[prev]`, and the resume strip on the picker (the `loanParkingState.parkedLoans` map rendered above the loan-question grid) gives the user a non-blocking path back to their parked work.

The `pendingSwitch` $state, the undo timer, the modal components, the radio snap-back DOM helper, and the two `{#if}` blocks in `how-can-we-help/+page.svelte` were all stripped (commit `ab48258a`).

## Consequences

- **No friction on intentional switches.** The DSA can move between loan products without clicking through a confirm. For exploratory work this is the right default — exploring is the common case; deliberate switches are also common.
- **No friction on accidental switches.** Per the user, this is also fine: accidental switches are recoverable via the resume strip on the picker. Parked state survives in `loanParkingState.parkedLoans` until the user resumes or the tab closes.
- **No mid-session DOM hacks.** The radio snap-back DOM force-sync (a one-way `<input checked={x}>` workaround) is no longer needed — `switchLoanType` updates `formState.loanData` immediately so Svelte's reactivity rolls naturally to the new selection.
- **Orchestrator infrastructure retained.** The registry, `switchLoanType`, `undoLastSwitch`, `commitLastSwitch`, `lastSwitchUndo`, `hasMeaningfulPriorData`, and `summarizePriorState` remain in `loanSwitchOrchestrator.svelte.ts`. The 25 integration tests in `loanSwitchOrchestrator.test.ts` still pin clear/park/undo/resume semantics. If a future flow needs to bring back the undo, the primitive is available.
- **Modal component files retained.** Project rule: never delete files. `LoanSwitchConfirmModal.svelte` + `LoanSwitchUndoModal.svelte` sit unused on disk; restoring them is a 2-import + 2-block change in `how-can-we-help/+page.svelte` if the decision is reversed.

## Alternatives Considered

- **Lower-friction confirmation** (single-click toast instead of modal) — still a popup, still interrupts flow. Same fundamental objection.
- **Inline warning under the loan-question grid** (no popup, just a yellow banner "Your Personal Loan work is saved") — possible future enhancement, doesn't block the switch. Not implemented now because the resume strip already serves this purpose for parked loans.
- **Keep the undo modal, drop only the confirmation** — splits the friction in half but adds reactive complexity for partial benefit. Cleaner to remove both.

## References

- Pitfall #38 (`docs/PITFALLS.md`) — the registry pattern that makes silent switching safe.
- ADR-0008 — `Pitfall #21` retraction (Next-click validation only) — same session, same pattern: prefer minimal UI interruption when the underlying invariant can be maintained without it.
- Commits `c1f87898` (chokepoint v1 with modals), `d6778dd1` (radio snap-back fix on Cancel — addresses a symptom of the modal flow that this ADR makes moot), `ab48258a` (revert).
