---
type: adr
epic: none
status: accepted
last_verified: 2026-06-02
related_specs: []
related_adrs: []
test_coverage: [src/lib/testing/__tests__/walkthroughAutoTriggerLifetime.test.ts]
owner: tech@digitaldsa.com
---

# ADR-0026 — Once-per-lifetime exposure marker pattern (3-layer persistence)

**Status**: Accepted
**Date**: 2026-06-02
**Session**: S218 (Product Guide once-per-lifetime fix)

## Context

A testing user reported 2026-06-02 that the Product Guide (intro walkthrough) re-appears on every dashboard reload, despite being dismissed previously. Owner restated the spec: *"automatically once only in lifetime, thereafter only when user seeks."*

The existing implementation gated the auto-trigger on **outcome flags** — `intro_completed` and `intro_dismissed_at`. Both are written fire-and-forget via PATCH `/api/walkthrough` after the user responds to the tour. Multiple failure modes resulted in the gate re-opening on the next reload:

1. **Write race against hard reload.** PATCH is async fire-and-forget; if the user hard-reloads immediately after dismissing, the DB write may not complete. The next page load reads stale state and re-fires the tour.
2. **Read-vs-write collection mismatch.** The PATCH endpoint routes writes by `locals.user.activeRole` — admin → AdminUsers, RM → rmApplications, DSA → DsaApplications. The `/dashboard/dsa/+layout.server.ts` read path queries only `DsaApplications`. An admin role-switched to DSA writes to AdminUsers but the layout reads from DsaApplications, so the marker never round-trips. The localStorage safety net helps but isn't load-bearing alone.
3. **Transient 5xx.** Network blip during the PATCH → server has no record. Next load auto-fires.

The localStorage safety net (single key `ddsa_intro_completed`) was meant to cover (1) and (3), but it tracked the same **outcome** semantic as the DB — "did the user respond?" — not the **exposure** semantic the spec actually wants — "has the system ever auto-shown this?".

The distinction matters: a user who dismissed the tour mid-step has responded (outcome=dismissed) but may not have seen the full content; a user who completed the tour has responded (outcome=completed) and seen everything. Both are signals of exposure. But the gate the spec describes is purely about exposure: once the system auto-shows the tour, it should never auto-show again, regardless of what the user did with it.

This same shape — "show this once, then only on user request" — recurs across features: NPS surveys, feature-discovery tooltips, onboarding hints, end-of-cycle billing prompts, beta-feature opt-in modals. A reusable pattern is worth documenting.

## Decision

Adopt a **three-layer once-per-lifetime exposure marker** pattern with **stamp-before-render** semantics:

**Layer 1 — Persistent DB field.** Add a `<feature>_auto_triggered_at: Date` field to the relevant user document. Survives browser changes, cache clears, device changes. Read-path query consumes it (read consistency the same as any other user-state field).

**Layer 2 — localStorage marker.** Synchronous write at the same moment the auto-trigger is requested. Survives reload within the same browser even when the DB write hasn't landed. Load-bearing for the reload-race case.

**Layer 3 — sessionStorage marker.** Synchronous write at the same moment. Survives client-side navigation within the same tab. Last-line defence for cases where localStorage is blocked (incognito, corporate policy, storage quota full).

**Stamp-before-render**: stamp all three markers SYNCHRONOUSLY the moment the system **requests** the auto-trigger, NOT after the user responds. This collapses the entire race window — by the time the user sees the modal, the gate is already permanently closed for that user.

**Init logic reads all three** and treats any one being set as "gate closed":

```
shouldAutoTrigger =
  !serverState.<feature>_auto_triggered_at &&
  !localStorage.<feature>_auto_triggered &&
  !sessionStorage.<feature>_auto_triggered &&
  /* feature-specific gates: not demo, not opted out, etc. */
```

If init finds the local markers set but the server disagrees, re-persist to server (covers the prior write-race window for users whose dismissal landed locally but not in DB).

**Outcome flags (completed, dismissed) remain** for analytics and for displaying "you completed this" indicators, but they are NOT part of the auto-trigger gate. The exposure marker is the strict gate.

## Consequences

**Enables:**
- Predictable once-per-lifetime semantics across all reload/race/persistence-failure scenarios
- Reusable shape for any future "show once" feature — copy the marker name, copy the three-layer pattern, done
- Test surface is small and predictable: every gate-open/closed permutation can be unit-tested without mocking timers or networks
- Stamp-before-render makes the test surface trivial: assertions just check the in-memory flag flips synchronously and the storage writes happened, no async wait needed

**Prevents:**
- Re-auto-trigger on hard reload (storage writes are synchronous)
- Re-auto-trigger when DB write fails (localStorage backup holds)
- Re-auto-trigger when localStorage is blocked (sessionStorage backup holds)
- Re-auto-trigger when read path queries the wrong collection (any local marker closes the gate regardless of server response)

**Tradeoffs accepted:**
- 3 storage keys per "show-once" feature instead of 1. Storage cost is negligible; mental cost is the three-layer pattern.
- A new tab can in principle auto-fire on its first load, since sessionStorage doesn't survive tab close. This is intentional — we don't want a user who closes the browser entirely to lose access to a tour they never actually saw. The DB + localStorage layers prevent re-fire after a reload in the SAME tab session, which is the user-reported failure mode.
- Re-persist-if-server-disagrees adds one extra PATCH per session when the server is stale. Idempotent server-side; cost is negligible. The alternative (don't re-persist) means users whose local marker held but DB didn't accumulate "ghost" non-persisted state forever.
- Outcome flags (completed, dismissed) are now belt-and-suspenders rather than load-bearing. They're cheap to keep (already in the schema) and useful for analytics. If a future audit decides exposure marker is sufficient on its own, the legacy outcome gates can be dropped.

## Alternatives Considered

**Retry the DB write with exponential backoff before user can reload.** Rejected: doesn't help the user who hard-reloads in the 50ms after dismissing. The synchronous storage writes are strictly safer.

**Use only localStorage (no DB layer).** Rejected: clearing browser cache shouldn't re-show a tour the user already saw; cross-browser/device consistency is a real UX expectation for "lifetime" semantics.

**Use only DB (no local backup).** Rejected: write race against hard reload is the bug we're fixing. Without a synchronous local write, this pattern doesn't solve the reported problem.

**Stamp the marker after the user dismisses/completes (not before render).** Rejected: that's the existing outcome-flag pattern that has the race window we're fixing. The whole point of stamp-before-render is to close the race entirely.

**Use a server-side "show once" mediator (request the trigger from API, server tracks the count).** Rejected: adds a round-trip on every dashboard load, fails-open if the API errors, and doesn't actually solve the race — the server still has to remember the user saw it via the same persistence chain, with the same failure modes.

**Force a synchronous PATCH-wait via `await fetch(...).then(navigate)`.** Rejected: blocks the UI thread during the network call, surfaces network errors to the user, and still doesn't help if the network is genuinely down.

## References

- Implementation: `src/lib/state/walkthrough.svelte.ts` (`markIntroAutoTriggered`, `shouldAutoTriggerIntro`, `_writeLocalAutoTriggered`, `_writeSessionAutoTriggered`)
- DB schema: `WalkthroughDbState.intro_auto_triggered_at` (`src/lib/config/walkthrough/types.ts`)
- API endpoint: `src/routes/api/walkthrough/+server.ts` (PATCH handler accepts `intro_auto_triggered`)
- Layout read: `src/routes/dashboard/dsa/+layout.server.ts` (surfaces `intro_auto_triggered_at` to client)
- Lock test: `src/lib/testing/__tests__/walkthroughAutoTriggerLifetime.test.ts` (14 tests across every gate permutation + reload races + idempotency)
- Originating bug report: 2026-06-02 user feedback "Product Guide keeps coming again and again when reloaded"
- CHANGELOG: 2026-06-02 (S218) — commit `5fe4327e`
