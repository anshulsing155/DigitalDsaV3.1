---
type: adr
epic: SEC-10
status: accepted
last_verified: 2026-06-05
related_specs: [SINGLE-SESSION-ENFORCEMENT-SPEC]
related_adrs: [ADR-0028]
test_coverage:
  - src/lib/testing/__tests__/sessionStatusPollerCanonical.test.ts
owner: tech@digitaldsa.com
---

# ADR-0033 — Adaptive polling cadence + BroadcastChannel leader election for SEC-10 session-status

**Status**: Accepted
**Date**: 2026-06-05
**Session**: S229

## Context

The SEC-10 single-session enforcement (ADR-0028) ships two complementary kick mechanisms:

1. **Hook-level instant kick** — `hooks.server.ts` checks `Sessions.isSessionRevoked(tokenId)` on every authenticated request and `throw redirect(303, '/?reason=kicked')` if set. Zero added latency for ACTIVE users.

2. **Client-side poller** — `/api/auth/session-status` polled every 3 seconds from the authenticated layouts. The only signal an IDLE tab has that it's been kicked.

Originally the poller cadence was `SESSION_POLL_MS = 3000` flat — every authenticated tab, every 3 seconds, forever. Owner directly set the 3-second cadence (tightened from spec's 8s) for "kick the other device IMMEDIATELY" UX in the post-login window where cross-device login conflicts actually happen.

S229 surfaced two issues with the flat-3s design during a production performance investigation:

- **Steady-state polling traffic is significant.** 20 requests/minute per authenticated tab. After S229's Vercel region pin (Mumbai functions, 95ms per session-status response) the per-poll cost is small, but the cumulative wall-time and bandwidth at scale (~100 concurrent DSAs) is not trivial.
- **Multi-tab amplification.** A user with 5 dashboard tabs open generates 5× the polling traffic, even though all tabs share the same browser cookies and would all be kicked by the same revoke event.

Two independent AI architecture reviews (S229 conversation, 2026-06-05) converged on a hybrid evolution that preserves the "kick immediately" UX while reducing polling traffic by ~80-95%.

## Decision

Evolve the poller from flat-3s to a two-layer adaptive design:

### Layer 1 — Adaptive cadence (visibility + age-aware)

The poll interval becomes a function of (a) how long ago the poller started and (b) whether the tab is currently visible:

| Tab state | Cadence | Constant |
|---|---|---|
| First 2 minutes after start | **3 seconds** | `SESSION_POLL_MS = 3000` |
| After 2 min, visible (focused) | **5 seconds** | `FOCUSED_POLL_MS = 5000` |
| After 2 min, hidden (background) | **20 seconds** | `HIDDEN_POLL_MS = 20_000` |
| `visibilitychange` → visible | immediate poll | (event-driven) |
| `focus` event | immediate poll | (event-driven) |

The 2-minute initial window (`INITIAL_POLL_WINDOW_MS = 120_000`) is preserved at the 3-second cadence because:

- Cross-device login conflicts cluster in the **post-login window**. A user who logs in elsewhere typically does so within seconds-to-minutes of opening the new device.
- After 2 minutes, conflicts are rare — the relaxed cadence (5s/20s) is appropriate.
- Owner's "kick immediately" UX is satisfied **for the case that actually matters**.

The 5s focused / 20s hidden split exploits the fact that **the user can't see the kicked-toast on a backgrounded tab anyway**. The visibilitychange listener fires an immediate poll on return-to-visible, so the user never actually waits 20s after refocusing — they see the kicked state as fast as their browser can reach the server (now ~95ms post-region-pin).

### Layer 2 — BroadcastChannel leader election (cross-tab dedup)

Multiple tabs of the same browser elect ONE leader to poll via a lowest-tabId-wins protocol over a shared `BroadcastChannel('digitaldsa.session-poller')`:

```
Tab 1 (tabId=A) ── leader, polls server
        │
        ├── 'heartbeat' broadcasts every poll
        ├── 'revoked' broadcast when kick detected
        ▼
Tab 2 (tabId=B) ── follower, no polling
Tab 3 (tabId=C) ── follower, no polling
```

- On `start()`, each tab generates a random tabId (`crypto.randomUUID()`).
- Tab broadcasts `claim` after a 100ms quiet period to avoid race-bombing.
- Lowest tabId wins; higher-tabId tabs step down to follower role.
- Leader heartbeats with each poll. Followers track last-seen-heartbeat.
- If a follower hasn't heard a heartbeat in `LEADER_HEARTBEAT_TIMEOUT_MS = 30_000` (~30s), it re-claims leadership.
- When leader detects a revoke, it `postMessage`s `{type: 'revoked', reason, at}` — followers receive INSTANTLY (sub-millisecond cross-tab) and call `handleKick()` without their own server round-trip.

This reduces polling for power users with N tabs from N × per-tab-cadence → 1 × per-tab-cadence.

### Why this is safe

The hook-level revoke check in `hooks.server.ts` (security boundary) is **unchanged**. Active users are kicked instantly on any authenticated request — this is the actual security guarantee. The poller is purely UX: it's how an IDLE tab (zero user interaction) learns it's been kicked.

Relaxing poll cadence has zero security impact — only a UX impact (how fast an idle screen updates itself). Even if the BroadcastChannel coordination fails entirely:
- Revoked users cannot successfully perform authenticated actions (hook catches them).
- Refresh-token rotation refuses revoked sessions.
- The session is functionally dead the moment the database revoke lands.

The only thing the poller affects is how quickly a tab the user is STARING at (without interacting with) updates itself.

### What the leader-election protects against

| Scenario | Behavior |
|---|---|
| Single tab open | Tab is its own leader; identical to pre-S229 except for adaptive cadence |
| Multiple tabs open | One leader polls; others receive broadcast |
| Leader closes / crashes | Followers detect via heartbeat timeout (~30s) and re-elect |
| Multiple tabs open simultaneously | 100ms quiet-period + lowest-tabId tiebreak resolves within ~100ms |
| BroadcastChannel unavailable (very old browser) | Fall back to per-tab polling (same as pre-S229) |
| Same browser, different windows | Same BroadcastChannel namespace; coordinated |
| Different browsers / private browsing | Different storage contexts; each gets its own leader (correct) |

## Consequences

### Positive

- **~80-95% reduction in polling traffic** vs flat-3s-per-tab design at scale (combination of adaptive cadence + cross-tab dedup).
- **Faster perceived kick UX on tab-return** — the visibilitychange listener fires an immediate poll, faster than today's "wait for next 3s tick" behavior.
- **Same security guarantee** — the middleware kick is the actual security boundary; relaxing the poller affects UX only.
- **Defense-in-depth across tabs** — a kick detected by ANY leader propagates to ALL same-browser tabs sub-millisecond via BroadcastChannel.
- **Reversible** — single-file revert restores the prior flat-3s behavior.

### Negative

- **Implementation complexity** added: state machine + cross-tab protocol. Lock tests cover the structural commitments; behavioral tests would need full DOM/MessageEvent mocking which is deferred.
- **Idle-tab kick UX during the post-initial-window degrades from 3s → 5s** (focused) or 3s → 20s (hidden). Owner approves the trade-off because the hook covers active users and the visibilitychange listener covers tab-return-to-visible.
- **Leader-election adds a 100ms quiet period at start**. First poll fires ~100ms later than pre-S229. Negligible.
- **Heartbeat broadcast on every poll** = small additional in-tab work. Cost is microscopic (postMessage with a 3-field object).

### Neutral / accepted trade-offs

- **BroadcastChannel doesn't cross devices** — by design. The leader election only dedups WITHIN a single browser. Cross-device kicks still go through the server (which is correct — that's where the security boundary lives).
- **Multiple browsers / incognito each get their own leader.** This is the right behavior — they're independent session contexts.
- **`document.visibilityState` is checked at scheduleNext-time**, not just on visibilitychange. A tab visible at start that gets backgrounded mid-session correctly drops to HIDDEN_POLL_MS on its next tick.

## Alternatives Considered

### Server-Sent Events (SSE) — true push from server

Open a streaming connection from the tab; server pushes events when revokes happen. Sub-100ms instant delivery.

Rejected for current platform:
- Vercel Hobby's 10-second function execution cap means SSE connections time out and reconnect every 10s anyway → 6 reconnects/minute, just trading polling cost for reconnection cost.
- Needs server-side pub/sub layer (Redis pub/sub or MongoDB Change Streams) to translate database writes into per-session-id events.
- Reconnect handling on the client adds complexity (event-id resumption, gap detection).
- Significant infrastructure investment for a single "session kicked" event.

**Worth revisiting** when the platform supports durable realtime connections (Vercel Pro 60s functions are still reconnect-y; a Render/AWS Node container would be a proper home for SSE).

### WebSockets — bidirectional persistent connection

Rejected — Vercel serverless doesn't support persistent WebSocket connections natively. Would require separate WS infrastructure (managed service like Pusher/Ably/Soketi or a long-running Node process). Heaviest option, justified only when many real-time features are planned.

### Long-polling

Hold an HTTP request open until either revoke or timeout. Effectively SSE without the streaming primitive.

Rejected for the same reason as SSE — the 10-second cap means timeouts reconnect every 10s anyway, providing no advantage over the adaptive polling decision.

### Native push (Web Push API + service worker)

Requires user permission grant + push subscription management. Disproportionate UX cost for a session-kick use case. Rejected.

### Flat 60-second polling

Suggested in an external review as a simple "reduce frequency" win. Rejected — it would silently regress the owner's "kick immediately" direction for the post-login window where conflicts actually cluster. 60s window means a kicked user could keep working for up to 60s, exactly the failure mode SEC-10 was designed to prevent.

The adaptive design preserves the 3s cadence for the post-login window where conflicts happen, and only relaxes after 2 minutes — when conflicts are rare and the platform's cost matters more.

## Sunset trigger

This ADR sunsets when one of the following holds:

- The codebase migrates to a platform with durable realtime connections (Render adapter-node per ADR-0027, or comparable). At that point SSE or WebSockets become viable and this polling-based design can be replaced by true push. New ADR required.
- A measurement reveals the adaptive cadence isn't actually saving the predicted traffic (e.g. most users are active enough that the hook covers them and the poll never fires). At that point the polling could be removed entirely on cost-benefit grounds.

No date-based sunset — this is a structural choice tied to current platform constraints.

## References

- ADR-0028 — Single-session login enforcement (original SEC-10 design)
- ADR-0027 — Render adapter-node migration (deferred until platform need)
- Spec: `docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md` §6.2 (polling section)
- Implementation: `src/lib/utils/sessionStatusPoller.svelte.ts`
- Lock test: `src/lib/testing/__tests__/sessionStatusPollerCanonical.test.ts`
- CHANGELOG entry S229 (2026-06-05): full per-commit narrative including the AI architecture-review convergence that produced this design
