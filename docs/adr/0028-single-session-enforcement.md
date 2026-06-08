---
type: adr
epic: SEC-10
status: accepted
last_verified: 2026-06-05
related_specs: [SINGLE-SESSION-ENFORCEMENT-SPEC, POST-AUDIT-IMPLEMENTATION-MASTER-SPEC]
test_coverage:
  - src/lib/testing/__tests__/sessionRegistryDualWrite.test.ts
  - src/lib/testing/__tests__/sessionConflict.test.ts
  - src/lib/testing/__tests__/sessionConflictMatrix.test.ts
  - src/lib/testing/__tests__/checkDsaConflictGate.test.ts
  - src/lib/testing/__tests__/sessionStatusPollerCanonical.test.ts
owner: tech@digitaldsa.com
---

# ADR-0028 — Single-session login enforcement: C-strict philosophy

**Status**: Accepted (S224, 2026-06-04). Commits A + B + B-audit + C all
shipped — schema extension, conflict detection, post-B audit fixes, and
the kicked-side poll + KickedToast + `/api/auth/session-status` endpoint
are on `main`. Production behavior remains gated on the operator setting
`SESSION_ENFORCEMENT_KICK_ENABLED='true'` on the `rinn` Vercel project
(Production + Preview + Development). Until then the code paths run dark:
detection emits telemetry but no modal, no kick. The flag flip is the
only remaining step before live enforcement.

**Decision**: When a logged-in user attempts a new login from a
**different device** OR a **different browser on the same device**, the
new-login flow is interrupted with a confirmation modal. The user
explicitly chooses to continue (signing out the previous session) or
cancel. Multiple tabs in the same browser remain free. Web and the
Capacitor Android app are independent surfaces and never conflict with
each other. There is **no per-user opt-out** — enforcement is always on.

---

## Context

The S218 testing user surfaced the requirement: "kick out other sessions
when a new login happens, with a confirmation warning that detects
device (different machine) vs browser (different browser on same machine)
vs tab (same browser, different tab)."

The existing implementation in `hooks.server.ts` (lines 118-144) already
performs **device-switch nuke**: when an access token's `tokenId` isn't
in the user's `activeTokenIds` array, the session is cleared. This was
adequate for the original multi-browser-per-device support but does NOT
satisfy the spec's three requirements:

1. **Detect granular conflict type** (device vs browser vs tab).
2. **Show a confirmation modal** giving the user agency at new-login time.
3. **Force-logout the kicked session** with visible feedback (toast,
   redirect), not a silent next-request 401.

**Data-model context** (S223 reframe, 2026-06-04): the per-session registry
this feature needs already exists as the `Sessions` collection (E.3 —
"Active devices" UI, shipped S206). The original SEC-10 spec draft
predated discovery of E.3 and proposed an embedded `user_sessions[]`
array on each user collection — which would have introduced a third
parallel session-tracking surface (`activeTokenIds[]` + `Sessions`
collection + new embedded array). Rejected in favor of extending the
existing Sessions collection with three optional fields
(`device_fingerprint`, `browser_fingerprint`, `client_class`) plus
one new `revoke_reason` value (`'kicked_by_new_login'`). Aligns with
MEMORY.md "no over-engineering / canonical reuse" and CLAUDE.md §16
Rule 11 (fix at source, not in consumers). The spec was rewritten
accordingly; this ADR's lock-pattern section reflects the new shape.

Three product philosophies were considered:

### Option A — One session, period
Every new login auto-kicks the old session. No modal, no choice.

- ✅ Simplest mental model. Stops account-sharing dead.
- ❌ Punishes legitimate device-switching. A DSA who moves from office
     laptop to home laptop loses her active form-fill mid-flow.
- ❌ Doesn't satisfy the S218 spec's "confirmation warning" requirement.

### Option B — Transparency only
All concurrent sessions allowed. Banners and emails notify the user of
new logins.

- ✅ Zero friction for legitimate users.
- ❌ Doesn't actually prevent account-sharing — just makes it visible.
     A subscriber sharing credentials doesn't care if a banner shows.
- ❌ Doesn't satisfy the S218 spec's "kick out other sessions"
     requirement.

### Option C — Granular enforcement with user choice (chosen)
Detect device/browser/tab via client-side fingerprint. Modal on
device-or-browser conflict; tab-on-tab silent. New login wins after
explicit user confirmation. Two sub-variants:

- **C-soft** — same as above, plus per-user opt-out toggle in account
  settings. Casual users can disable. Paranoid users opt in.
- **C-strict** — always-on enforcement; no opt-out. Clearer security
  posture, more false positives accepted.

S219 owner decision: **C-strict**.

---

## Decision

C-strict. Reasoning:

1. **The whole point is enforcement**. C-soft turns into "transparency
   plus an unused toggle" for the 80% of users who never touch settings.
   The opt-out undermines the policy and adds UI surface to maintain.
2. **The DSA platform is a paid B2B SaaS**. Subscription-fraud via
   credential-sharing is a real revenue leak; security-posture clarity
   trumps marginal UX friction.
3. **False positives are visible and recoverable**. An incognito-tab or
   browser-update false positive shows a modal → user clicks "Continue
   here" → done in ~3 seconds. It's not a silent breakage; it's a
   slightly-annoying speed bump on the affected path.
4. **The friction is concentrated on edge cases**. Mainline DSA flow
   (laptop, same browser, all day) sees zero modals. Only the rare
   "switch from incognito to normal" or "Chrome → Firefox" patterns get
   interrupted.

---

## Consequences

### Positive
- Security posture clear and uniform across the DSA fleet.
- No settings-UI surface to maintain (no opt-out toggle).
- Audit log uniformly populated — every conflict is observable.

### Negative
- False positives are not avoidable per-user. A DSA who frequently
  switches between Chrome and Firefox on the same laptop will see modals
  every time.
- Incognito-tab use is friction-laden. A DSA testing something in
  incognito gets kicked off main session unless they click through.
- Capacitor app reinstalls reset the fingerprint (see Risk R7 in spec).
  First post-reinstall login will look like a new device.

### Neutral / accepted trade-offs
- Detection is fingerprint-based, not authoritative. We accept that a
  user with two identical devices (same OS, same browser, same timezone,
  same screen) can defeat the system. The goal is to raise the friction
  for casual sharing, not to defeat determined adversaries.
- The poll endpoint runs every 8 seconds per authenticated user. Modest
  load (mitigated by partial index); explicitly accepted.

---

## Alternatives considered & rejected

### Per-user opt-out (C-soft)
Rejected per the reasoning above. Brief notes:
- Most users won't touch the setting → de-facto silent enforcement for
  the 80%, which is what C-strict delivers anyway, minus the maintenance
  cost
- The opt-out itself becomes a customer-support escalation point ("how
  do I disable this?") — the simpler "no opt-out" answer is easier to
  staff

### WebSocket / SSE for instant kick notification
Rejected for v1. 8-second poll is adequate (the kicked session keeps
working for ~5-10s after kick, which is a minor inconvenience and not a
security hole — they're holding a still-valid access token but their
refresh chain is broken). WS adds:
- Vercel sticky-connection overhead
- Infra for connection registry across function instances
- A separate failure mode (WS drop) that needs the poll as backup anyway

Reconsidering if v1 telemetry shows the 8s window is problematic.

### IP-based conflict detection
Rejected. Mobile networks shift IPs constantly (cellular handoff, WiFi
roaming, VPN toggles). False-positive rate would be unacceptably high.

### Server-side UA parsing instead of client-side fingerprinting
Rejected. Sending raw UA strings to the server in every login request +
storing them in the DB is a small but real privacy issue. Client-side
SHA-256 hashing means the server only sees opaque hex digests. Less
leakage, less log pollution.

### Account-shareable seat licenses (the "non-technical solution")
Out of scope. Pricing changes are a separate decision; this ADR is
about the technical enforcement model assuming the existing
single-seat-per-account pricing.

---

## Lock pattern

The spec (`docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md`) defines lock
tests for each of the 3 implementation commits:

- Commit A: `sessionRegistryDualWrite.test.ts` — every login site calls
  `recordSession()` with the new `device_fingerprint`, `browser_fingerprint`,
  and `client_class` fields populated from the request body, AND continues
  to populate `activeTokenIds[]` on the user document.
- Commit B: `sessionConflictMatrix.test.ts` — exhaustive 5-case
  conflict-detection matrix over Sessions rows.
- Commit C: `sessionStatusPollerCanonical.test.ts` — `(app)/+layout.svelte`
  and `dashboard/+layout.svelte` contain the canonical poller wiring.

Per CLAUDE.md §17 frontmatter convention, this ADR's status moves from
`proposed` → `active` when Commit C lands AND the kick switch flips
on production (Vercel `rinn` project).

---

## Sunset trigger

This decision sunsets when one of the following holds:
- **WebSocket / SSE realtime push** becomes available across Vercel
  functions (or we migrate off Vercel). At that point, the 8s poll
  should be replaced with push for better UX. New ADR required.
- **Pricing model changes** to per-seat or per-device licensing,
  obsoleting the single-session enforcement need. Separate decision.

No date-based sunset — this is a stable architectural choice tied to the
business model, not a workaround.

---

## Related

- Spec: [`docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md`](../specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md)
- ADR-0026 (3-layer once-per-lifetime exposure marker) — similar
  dual-write migration pattern
- POST-AUDIT-IMPLEMENTATION-MASTER-SPEC §E.3 — original "Active devices"
  spec that shipped the `Sessions` collection this feature extends
- `src/lib/types/session.ts` — `SessionDoc` extended in Commit A
- `src/lib/server/account/sessions.ts` — `recordSession` extended in
  Commit A
- `hooks.server.ts:118-144` — existing `activeTokenIds[]` enforcement
  (unchanged in Commit A; sunsets 30 days post-Commit-C)
- `src/lib/services/jwtService.ts` — token issuance, unchanged
  (existing `tokenId` claim flows into `Sessions.session_id`)
