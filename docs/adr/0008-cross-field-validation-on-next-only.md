# ADR-0008 — Cross-field validation fires on Next-click only, not per-keystroke

**Status**: Accepted
**Date**: 2026-05-16
**Session**: S104

---

## Context

Schema questions can carry `validation.condition` JSON-Logic rules that reference derived variables (e.g. `_maxPossibleEmis` computed from `loanDisbursementDate`). These rules can only be evaluated server-side — the engine's `validatePage` materializes the derived vars from `payloadEnricher`, then runs JSON-Logic. The client surfaces the result via `serverPage.validationErrors` after a round-trip through `/api/form/evaluate`.

Pitfall #21 was discovered at S103 (2026-05-15): all 6 loan pages had a `debouncedEvaluate(pageIndex)` function defined but never invoked from `updateAnswerByKey`, so cross-field rules silently let users advance with invalid data — the error appeared only after a Next-then-Back round-trip. The S103 fix wired `debouncedEvaluate(currentPageIndex)` into `updateAnswerByKey` on every keystroke with a 300ms window.

Cost of the per-keystroke wiring (surfaced at S104):

- Typing in number fields felt sluggish. 300ms is shorter than normal digit cadence (200–400ms between keys), so the debounce fired mid-stream and the server response re-rendered the form on top of in-progress input. User report: "every input entry is lagging so much, a minor delay reset the number."
- `formState.replaceLoanData(...)` performs `_jsonEquals` (deep stringify) on every keystroke. With a non-trivial answer tree this is ~5–15ms per call, and the spread-spread-write pattern allocates a new full-tree object every time.
- Every server response updates `serverPage` → re-derives `visibleQuestions` → input components re-render. Cumulative cost compounds the user-felt lag.

S104 hot-fixed the window to 1500ms (commit `586d5c07`). User pushed back architecturally: the diagnosis was correct (cross-field errors must surface before Next) but the cure was wrong — the actual race is only at navigation time. Showing errors mid-typing is a UX flourish, not a correctness requirement.

## Decision

**Server-side cross-field validation fires only at Next-click, not per-keystroke. `updateAnswerByKey` does NOT call `debouncedEvaluate`.**

Concretely (commit `ba0a6ef5`):

- Stripped `debouncedEvaluate(currentPageIndex)` from `updateAnswerByKey` in all 6 loan pages.
- Inverted the `loanPageValidationTiming.test.ts` contract — now asserts `updateAnswerByKey` does NOT contain a `debouncedEvaluate(` call. The 1500ms-window guard from the hot-fix commit was removed (no longer applicable).
- The Next-click flush already existed: `onNext` runs `await evaluateOnServer(currentPageIndex)` + `await tick()` before consulting `isNextEnabled`, and `isNextEnabled` checks `serverPage?.validationErrors?.length`. Invalid data blocks Next.
- The `debouncedEvaluate` function is preserved in each page file for any ad-hoc flush use (currently only the Next-click path), but is not invoked from input handlers.

What stays client-side and instant:

- **Field-level validation** — max/min, required, format, type, max-length. All evaluated in TextField / input components without a server call.
- **Within-page progressive disclosure (`showWhen`)** — `deriveVisibleQuestions(serverPage, ...)` filters the server's question set through `shouldShowEncoded` on every reactive read of `formState.loanData`. Adding/hiding questions as the user fills in radio/select answers happens instantly with no server round-trip.

What waits for Next-click:

- **Cross-field rules** that need server-derived variables (e.g. "EMIs paid > months since disbursement", "outstanding > sanctioned amount"). These show up at navigation time. If any fire, `isNextEnabled` is false, the Next button stays disabled, and the inline errors render against their fields.

Pitfall #21 in `docs/PITFALLS.md` redrafted to reflect the corrected design.

## Consequences

- **No typing lag, no mid-input clobbering.** Single biggest UX win — typing in any field is silent until the user pauses and clicks Next.
- **Server load drops dramatically.** Pre-S104, a 10-character entry fired 1 request per ~300ms; now it fires 1 request at Next. Network + serialization + Mongo round-trip costs eliminated for every interim keystroke.
- **No race between fast Next-clicks and pending debounces.** The hot-fix commit had to add explicit awaits inside `onNext` to close this race; the race no longer exists since nothing's queued.
- **Cross-field errors appear at the natural transition point.** User completes a page, clicks Next, sees any cross-field errors right there. Compared to the pre-S104 behavior where errors only appeared after Next-then-Back, this is strictly better; compared to the S103 per-keystroke behavior, this loses immediate feedback during entry but gains the lag-free typing UX.
- **The pattern generalizes.** For other "expensive validation that depends on multiple fields", reach for Next-click flush before considering input-debounced. Field-level rules stay where they are.

## Alternatives Considered

- **Field blur trigger** (fire `evaluateOnServer` when the user leaves a field) — better than per-keystroke, but still N round-trips per page (one per filled field). Doesn't add anything over the Next-click pattern since the user can't navigate without clicking Next anyway.
- **Throttled debounce with longer window** (e.g. 3000ms) — still vulnerable to "user pauses and we re-render on top of their input." Just delays the same failure mode.
- **Optimistic local cross-field validation** (re-implement the server's `validatePage` on the client) — duplicates the rule engine, drifts over time, no actual UX benefit since we already have the Next-click flush.

## References

- Pitfall #21 (`docs/PITFALLS.md`) — full wrong/right/why narrative with the inverted contract pinned by `loanPageValidationTiming.test.ts`.
- ADR-0007 — silent loan-switch — same session, same principle: prefer minimal UI interruption when the underlying invariant holds.
- Commits `0d6eaf97` (S103 — original per-keystroke wiring), `586d5c07` (S104 hot-fix to 1500ms), `ba0a6ef5` (S104 retraction — this ADR's decision).
