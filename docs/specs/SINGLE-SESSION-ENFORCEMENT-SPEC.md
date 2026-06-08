---
type: spec
epic: SEC-10
status: draft
last_verified: 2026-06-04
related_adrs: [ADR-0028]
related_specs: [POST-AUDIT-IMPLEMENTATION-MASTER-SPEC]
owner: tech@digitaldsa.com
---

# Single-Session Login Enforcement — Specification

**Status**: Draft (S219, 2026-06-02). Authored after S218 surfaced the
"kick out other sessions on new login" requirement from the testing user.
Implementation scheduled as 3-commit feature in a future session;
estimated ~16 hours (2 working days).

**S223 reframe (2026-06-04)**: data-model rewritten to extend the existing
`Sessions` collection (E.3 — "Active devices", shipped S206) instead of
introducing a new embedded `user_sessions[]` array. The original draft
predates discovery that E.3 had already shipped a per-session registry
covering 80% of the data this spec needs. Avoiding a third parallel
registry is consistent with MEMORY.md "no over-engineering / canonical
reuse" and CLAUDE.md §16 Rule 11 (fix at source, not in consumers).
Implementation impact: smaller diff for Commit A, no new helper module,
unchanged philosophy + UI + fingerprinting + telemetry.

**Decision record**: [ADR-0028](../adr/0028-single-session-enforcement.md)
captures the philosophy choice (C-strict) and the major trade-off
(false-positive friction accepted in exchange for clearer security
posture).

---

## 1. Goal & Non-Goals

### Goal
A logged-in user holds at most **one active web session per device-browser
combination** at any time. A new login from a different device OR a
different browser on the same device triggers a confirmation modal; the
user explicitly chooses whether to continue (signing out the other) or
cancel. Multiple tabs in the same browser remain free (they share a JWT
cookie anyway — no real conflict). Web and the Capacitor Android app are
treated as independent client classes and never conflict with each other.

### Non-goals
- Real-time WebSocket / Server-Sent Events. Detection on the kicked side
  uses a short poll (~8 seconds) — adequate for the use case and
  Vercel-serverless friendly.
- Per-user opt-out. Enforcement is global; admins can investigate
  individual cases via the audit log.
- Account-sharing prevention via heuristics ("this account is being used
  in 4 cities in 1 hour"). That belongs to a separate fraud-detection
  ticket if/when needed.
- IP-based fingerprinting. Mobile networks shift IPs constantly; using IP
  as a fingerprint signal produces unacceptable false-positive rates.

---

## 2. Philosophy: C-strict

Three product philosophies were considered at design time (see ADR-0028
for the full discussion):

- **A — One session, period**: every new login auto-kicks the old one,
  no modal. Simplest but punishes legitimate device-switching.
- **B — Transparency only**: multiple sessions allowed; user gets
  banners noting new logins. Doesn't actually prevent abuse.
- **C — Granular enforcement with user choice (chosen)**: detect
  device/browser/tab; modal only on device-or-browser conflict;
  new login wins after user confirms. Tab-on-tab is silent.

C-strict adds: **no per-user opt-out**. Always-on enforcement gives a
clearer security posture at the cost of more false positives from
incognito tabs and browser updates. Accepted trade-off per S219 owner
decision.

---

## 3. Data Model

### 3.1 Per-session registry — extend the existing `Sessions` collection

The `Sessions` collection shipped under E.3 ("Active devices" UI, S206)
already stores one row per refresh-token issuance, keyed on
`session_id` (= the refresh JWT `tokenId` claim). Its current shape
(see [`src/lib/types/session.ts`](../../src/lib/types/session.ts)):

```typescript
interface SessionDoc {
  session_id: string;            // = refresh JWT tokenId
  user_id: ObjectId;
  user_role: 'dsa' | 'rm' | 'admin' | 'applicant';
  user_agent: string;            // raw UA, forensic
  device_label: string;          // "Chrome on Windows"
  ip_country?: string | null;
  ip_country_region?: string | null;
  ip_city?: string | null;
  created_at: Date;
  last_seen_at: Date;
  revoked_at?: Date | null;
  revoke_reason?: 'user_action' | 'revoke_others' | 'token_reuse_detected' | null;
}
```

This spec **extends** that shape rather than introducing a parallel
embedded `user_sessions[]` array on user documents. Three additions:

```typescript
// Added by SEC-10 / ADR-0028:
device_fingerprint?: string;     // SHA-256 hex (64 chars), client-derived
browser_fingerprint?: string;    // SHA-256 hex (64 chars), client-derived
client_class?: 'web' | 'android';// Capacitor android vs browser web

// Existing revoke_reason union extended with one new value:
revoke_reason?:
  | 'user_action'
  | 'revoke_others'
  | 'token_reuse_detected'
  | 'kicked_by_new_login';       // new — emitted by /api/auth/login-confirm
```

All three new fields are optional during the dual-write window — legacy
rows written before SEC-10 lacks them, and conflict detection (§4) treats
absence-of-fingerprint as "never conflicts" (same logic as the original
`device_fingerprint='legacy'` placeholder).

Sessions remain append-only with soft-delete via `revoked_at`. No FIFO
trim on the collection itself; the existing `activeTokenIds[]` array on
user docs keeps its `$slice: -10` bound for the device-switch-nuke
enforcement in `hooks.server.ts:122`.

### 3.2 Index

The `Sessions` collection already carries every index this spec needs
(see [`mongo.ts:1174-1182`](../../src/lib/database/mongo.ts)):
- `{ session_id: 1 }` unique → tokenId lookup (Commit C poll endpoint).
- `{ user_id: 1, last_seen_at: -1 }` → "Active devices" UI list.
- `{ user_id: 1, revoked_at: 1 }` (partial) → conflict-detection query
  (`find({ user_id, revoked_at: null })` in §4).

**No new index migration is required for SEC-10.** The fingerprint fields
themselves are not indexed (they're compared in app code over the small
per-user result set, ≤10 active sessions per user).

### 3.3 Migration

The existing `activeTokenIds: string[]` field on `DsaApplications` /
`rmApplications` / `AdminUsers` stays alive for 30 days (dual-write) —
same migration pattern as ADR-0026's 3-layer marker:

- **During dual-write window**: every login continues to populate
  `activeTokenIds[]` (legacy device-switch nuke in `hooks.server.ts:122`
  unchanged) AND extends the Sessions-row insert (`recordSession()` in
  [`src/lib/server/account/sessions.ts`](../../src/lib/server/account/sessions.ts))
  with the new fingerprint + client_class fields. `hooks.server.ts`
  enforcement reads only `activeTokenIds[]` — no change.
- **Backfill script**: a one-shot `scripts/sec10-backfill-session-fingerprints.mjs`
  walks Sessions rows with `revoked_at == null` and missing fingerprint
  fields, setting `device_fingerprint = 'legacy'` + `browser_fingerprint = 'legacy'`
  + `client_class = 'web'`. These rows never trigger conflicts (no fresh
  fingerprint matches the literal `'legacy'`) but preserve the row's
  presence for the "Active devices" UI and audit continuity.
- **30 days post-Commit-C**: drop `activeTokenIds` from the three user
  collections via a separate migration commit + ADR sunset trigger. At
  that point `hooks.server.ts:122` enforcement migrates to
  `isSessionRevoked()` (already implemented) — single canonical store.

---

## 4. Conflict Detection Logic

On every login attempt (after OTP verification), the server queries
`Sessions.find({ user_id, revoked_at: null })` and compares the incoming
fingerprint vs each returned row:

| Match conditions | Conflict type | Modal? |
|------------------|---------------|--------|
| Same `client_class` + same `device_fingerprint` + same `browser_fingerprint` + same JWT cookie | Same tab | None — no-op |
| Same `client_class` + same `device_fingerprint` + same `browser_fingerprint` + different cookie | Same browser, different tab | **Silent** |
| Same `client_class` + same `device_fingerprint` + different `browser_fingerprint` | Browser conflict | **Modal** |
| Different `device_fingerprint` (same `client_class`) | Device conflict | **Modal** |
| Different `client_class` | Cross-platform — no conflict | None |

The conflict-resolution helper lives in `src/lib/server/auth/sessionConflict.ts`
and is unit-tested with a fixture matrix of all 5 conditions.

---

## 5. Login Flow

**B.0 (S223) clarification**: the existing login flow already has
**three** endpoints, separated by a 2026-05-29 code-review fix that
guards re-merger via the `verifyOtpNoInternalCheckDsa.test.ts` lock test:

1. `POST /api/auth/verify-otp` — validates the OTP via MSG91, sets
   the `verifiedMobile` cookie. Returns `{}` only; NO tokens, NO user
   lookup, NO Sessions row. **Unchanged by this spec.**
2. `POST /api/auth/detect-roles` — discovers which roles (DSA/RM/Admin)
   this mobile is registered for. **Unchanged by this spec.**
3. `POST /api/auth/check-dsa` — mints tokens, calls `recordSession()`
   (extended in Commit A to forward fingerprints). **This is where
   conflict detection lands** — see Step 1 below.

The "Step 1 / Step 2" model in the rest of this section refers to the
*conflict-resolution* sub-flow, not the broader 3-endpoint login flow.

### Step 1: check-dsa (token issuance + conflict detection)
```
POST /api/auth/check-dsa
  body: {
    mobileNumber: string,
    preferredRole?: 'dsa' | 'rm' | 'admin',
    hardwareFingerprint?: string,  // existing field — device-switch nuke
    deviceFingerprint: string,     // SEC-10 — SHA-256 hex from client
    browserFingerprint: string,    // SEC-10 — SHA-256 hex from client
    clientClass: 'web' | 'android' // SEC-10
  }

  Success (no conflict):
    200 { ok: true, user, tokens }  -- today's response shape

  Conflict:
    200 { status: 'session_conflict',
          existing_sessions: [
            { id: string, ua_summary: string, last_seen_at: ISO,
              conflict_type: 'device' | 'browser' }
          ],
          pending_login_token: string  -- short-lived JWT, 5min TTL
        }
```

The `pending_login_token` is a server-signed JWT carrying:
- `userId` of the would-be-loggee
- `tokenId` for the new session
- `kick_eligible_session_ids: string[]` (the IDs of sessions the user
  can choose to kick from this modal)
- `iat`, `exp` (5 minutes)

### Step 2: Confirm
```
POST /api/auth/login-confirm
  body: {
    pending_login_token: string,
    kick_session_ids: string[]  -- subset of kick_eligible_session_ids
  }

  Server:
    1. Verify pending_login_token signature + not-expired
    2. Validate kick_session_ids ⊆ kick_eligible_session_ids
    3. Mark each kicked session: revoked_at=now, revoked_reason='kicked_by_new_login'
    4. Call `recordSession()` to insert the new Sessions row with
       fingerprint + client_class fields populated
    5. Issue new access + refresh JWT cookies
    6. Return { ok: true, user, tokens }
```

If the user clicks "Cancel" on the modal, the client simply discards
`pending_login_token` and returns to the login screen. No server call
required.

---

## 6. Kicked-Session Detection (short poll)

### 6.1 Endpoint
```
GET /api/auth/session-status

  200 { active: true }
  401 { revoked: {
          reason: 'kicked_by_new_login' | 'logout' | 'expired',
          kicked_by_ua_summary?: string,    -- which session kicked this one
          at: ISO timestamp
        }
      }
```

Implementation: parse the refresh JWT's `tokenId` from the cookie, look
up `Sessions.findOne({ session_id: tokenId })`. If `revoked_at` is set,
return 401 with the metadata (`reason` derived from `revoke_reason`,
mapping `'kicked_by_new_login'` → `'kicked_by_new_login'`, others →
`'logout'` / `'expired'` as appropriate). Otherwise call the existing
`updateSessionLastSeen()` helper (throttled to once per 5 min per session,
matching the existing activity-tracking throttle in `hooks.server.ts`)
and return 200.

### 6.2 Client poller

Add `useSessionPoller` hook (or `$effect`-based composable) to
`src/routes/(app)/+layout.svelte` and `src/routes/dashboard/+layout.svelte`
— covers every authenticated route.

```typescript
// Pseudo-code
$effect(() => {
  if (!authState.isAuthenticated) return;
  const POLL_MS = 8000;

  const tick = async () => {
    if (document.visibilityState !== 'visible') return; // throttle when hidden
    try {
      const res = await fetch('/api/auth/session-status');
      if (res.status === 401) {
        const { revoked } = await res.json();
        showKickedToast(revoked);
        await new Promise(r => setTimeout(r, 5000));
        clearAuthState();
        window.location.href = '/login?reason=kicked';
      }
    } catch { /* network blip — ignore */ }
  };

  const id = setInterval(tick, POLL_MS);
  return () => clearInterval(id);
});
```

### 6.3 Poll cost analysis

At 1,000 concurrently-active DSAs polling every 8s = ~125 req/sec
extra load. The Sessions collection's existing unique index on
`{ session_id: 1 }` makes each poll one indexed findOne. Acceptable
for Vercel + Atlas.

Throttle when tab hidden via `document.visibilityState`. Pause entirely
when the JWT cookie is missing.

---

## 7. UI Components

### 7.1 `SessionConflictModal.svelte` — new component

Shown when `verify-otp` returns `status: 'session_conflict'`.

**Content**:
- Title: "You're already signed in"
- Body: "Your DigitalDSA account is open in another window."
- List each `existing_sessions[]` entry:
  - Icon based on `conflict_type` (laptop for device, browser for browser)
  - `ua_summary` (e.g. "Chrome 130 on Windows")
  - "Last active: {relative-time}"
  - Checkbox (defaults checked) so user can select which to sign out
- Buttons:
  - **Primary**: "Continue here & sign out the other(s)" — POSTs
    `/api/auth/login-confirm` with checked session IDs
  - **Secondary**: "Cancel" — closes modal, returns to login screen

### 7.2 `KickedToast.svelte` — new component

Shown when `/api/auth/session-status` returns 401.

**Content**:
- Headline: "You've been signed out"
- Body: "Your account was used to sign in on a {device|browser}."
- Subtext: "{kicked_by_ua_summary} · {at, relative}"
- Auto-dismiss + redirect after 5s. No primary CTA.

---

## 8. Fingerprinting Source (client)

Stable signals only — never volatile ones:

```typescript
async function buildFingerprints(): Promise<{
  device: string;
  browser: string;
  uaSummary: string;
}> {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const screen = `${window.screen.width}x${window.screen.height}@${window.screen.colorDepth}`;

  // Parse UA → family + major version (ignore minor/patch — too volatile)
  const { family, majorVersion, os } = parseUaFamily(ua);

  const deviceSeed = `${platform}|${tz}|${screen}|${os}`;
  const browserSeed = `${family}|${majorVersion}|${os}`;

  return {
    device: await sha256Hex(deviceSeed),
    browser: await sha256Hex(browserSeed),
    uaSummary: `${family} ${majorVersion} on ${os}`
  };
}
```

Hash on the client BEFORE sending. The server only sees opaque SHA-256
hex — privacy win (no raw UA in logs / spans / DB).

`parseUaFamily` is ~200 lines hand-rolled (no dependency) — extracts UA
family (Chrome, Firefox, Safari, Edge) + major version + OS (Windows,
macOS, Linux, iOS, Android).

`sha256Hex` uses Web Crypto API (`crypto.subtle.digest`).

For the Capacitor Android app: use a persistent device ID via
`capacitor-secure-storage-plugin` (generate UUID on first launch, never
changes). Set `clientClass: 'android'`.

---

## 9. Implementation Plan (3 commits)

Per CLAUDE.md §16 Rule 14 — each commit independently shippable.

### Commit A: Schema extension + per-login dual-write (~3 hr)
- Extend `SessionDoc` in [`src/lib/types/session.ts`](../../src/lib/types/session.ts)
  with the three optional fields from §3.1
  (`device_fingerprint`, `browser_fingerprint`, `client_class`) and add
  `'kicked_by_new_login'` to the `revoke_reason` union.
- Extend `recordSession()` in [`src/lib/server/account/sessions.ts`](../../src/lib/server/account/sessions.ts)
  to accept + persist the three new inputs. Old callers that don't pass
  them write rows with the fields absent (acceptable — see §3.3).
- Update every login site that calls `recordSession()` to forward the
  fingerprint + client_class from the request body:
  - `/api/auth/check-dsa/+server.ts` (the call site today per E.3)
  - `/api/auth/verify-otp/+server.ts` (if it issues tokens directly — to
    re-verify at Commit-A time; spec §5 has it issuing a `session_conflict`
    response in Commit B, so the Commit-A write here is the new-row path
    when no conflict is detected)
  - `hooks.server.ts` refresh-token issuance path — **DEFERRED out of
    Commit A** (S223 decision). `recordSession` is NOT called on refresh
    today (only `updateSessionLastSeen`), and capturing fresh fingerprints
    during rotation would require the client to send them in a header on
    every authenticated request — meaningful client-side work + per-request
    payload cost for a signal we only use at login time. Conflict detection
    (Commit B) fires at login, not refresh. Revisit only if soak-week
    metrics show high false-positive rates from stale rotation-time data.
    See §13 OQ-5.
- Leave the existing `activeTokenIds[]` writes + the `hooks.server.ts:122`
  device-switch-nuke enforcement UNCHANGED — that's the legacy compat
  shim per §3.3. Both writes run side-by-side.
- Backfill script `scripts/sec10-backfill-session-fingerprints.mjs` —
  walk pre-SEC-10 Sessions rows with missing fingerprints and write
  `'legacy'` placeholders (see §3.3). One-shot, idempotent.
- Lock test: `sessionRegistryDualWrite.test.ts` — asserts every login
  call site calls `recordSession()` with the three new fields populated
  from the request body (and that `activeTokenIds[]` continues to be
  populated at the same sites).

### Commit B: Conflict detection + modal (~6 hr)
- New helper `src/lib/server/auth/sessionConflict.ts` — pure function
  `detectConflict(existingSessions: SessionDoc[], incoming): ConflictReport`
  with the 5-case matrix from §4. Operates over Sessions rows fetched via
  `Sessions.find({ user_id, revoked_at: null })`. Unit-tested exhaustively.
- Update `/api/auth/check-dsa/+server.ts` to (B.0-corrected):
  - Use the existing sanitized fingerprints from Commit A
  - Query Sessions for active rows for the resolved user
  - Run conflict detection
  - On conflict: return `session_conflict` shape + signed
    `pending_login_token`. **Skip** token minting + recordSession +
    cookie sets — those happen in login-confirm. This applies
    symmetrically at all 6 branches (admin-preferred, rm-preferred,
    dsa-default, rm-default, applicant-default, admin-default).
- New endpoint `/api/auth/login-confirm/+server.ts` — verifies pending
  token, marks kicked Sessions rows
  (`{ revoked_at: now, revoke_reason: 'kicked_by_new_login' }`), issues
  new tokens, calls `recordSession()` with the fingerprint payload for
  the new session row.
- New component `SessionConflictModal.svelte`
- Client login flow: handle `session_conflict` response, show modal,
  on confirm POST `/login-confirm`
- Add client-side fingerprint helper `src/lib/utils/sessionFingerprint.ts`
- Lock test: `sessionConflictMatrix.test.ts` — exhaustive 5-case matrix
- **Soak for 1 week**: enforcement disabled by env flag
  `SESSION_ENFORCEMENT_KICK_ENABLED='false'`. **Conservative
  interpretation (S223+1)**: during soak, conflict detection runs
  silently — emits `event: 'session.conflict_detected'` telemetry for
  the admin dashboard but does NOT return the session_conflict
  response. The user sees a normal successful login; no modal, no
  kick. The flag flip at Commit C is what makes the modal + kick go
  live simultaneously. Earlier draft language ("modal shows, login-
  confirm processes, revoke gated") would have produced a confusing
  UX where the user clicks "Continue here" and nothing observable
  happens. Counting conflicts from server-side telemetry alone gives
  the same soak-metric coverage without polluting production traffic
  with weird modal experiences.

### Commit C: Flip the switch + kicked-side poll (~4 hr)
- Set `SESSION_ENFORCEMENT_KICK_ENABLED='true'` on Vercel (rinn project,
  Production + Preview + Development)
- New endpoint `/api/auth/session-status/+server.ts`
- New component `KickedToast.svelte`
- Add `useSessionPoller` to `(app)/+layout.svelte` and
  `dashboard/+layout.svelte`
- ADR-0028 status flips from `proposed` to `active`
- Lock test: `sessionStatusPollerCanonical.test.ts` — asserts
  `+layout.svelte` files contain the canonical poller wiring

---

## 10. Risk Register

| # | Risk | Likelihood | Mitigation |
|---|------|------------|------------|
| R1 | Browser updates change UA → false-positive "browser conflict" | High | Hash only UA **family + major version**, not full version string. Loses precision on legitimate "browser update" detection but cuts the noisier false-positive class |
| R2 | Incognito tab looks like a new browser | Medium | Accepted — incognito IS a separate browser context. Document in user-facing FAQ |
| R3 | Mobile (Capacitor) + web simultaneously open by same user | High | `client_class` separates them; never conflict across web ↔ android |
| R4 | Poll cost at scale (8s × N DSAs) | Low | Partial index makes the indexed-findOne cheap. Throttle on `document.visibilityState !== 'visible'` |
| R5 | Pending login token theft / replay | Low | 5-min TTL, single-use (track via Redis or `used_pending_tokens` collection with TTL index). Server-signed JWT |
| R6 | Pre-SEC-10 Sessions rows lack fingerprint fields | Medium | Backfill script writes `'legacy'` placeholders (never matches a fresh hash → never conflicts → silently preserved for "Active devices" UI). Sessions rows for users who never logged in pre-SEC-10 simply don't exist yet — first login creates a fingerprinted row |
| R7 | Capacitor app reinstall changes fingerprint | Low | Use `capacitor-secure-storage-plugin` for persistent device ID across reinstalls (Android keystore-backed) |
| R8 | Session-conflict modal in middle of OTP flow → bad UX | Medium | Modal only AFTER OTP verified — user is already committed. Document this trade-off |
| R9 | Network blip causes false 401 from poller | Low | Client treats network errors as no-op (no kick); only explicit 401 triggers kick UX |
| R10 | Soak week reveals high false-positive rate | Medium | Soak via env flag — kick disabled but conflicts logged. Admin dashboard surfaces the rate; tune fingerprint heuristics before flipping |

---

## 11. Verification

Per CLAUDE.md §5 Done Checklist:

1. **Type check**: `pnpm check` 0 errors after each commit
2. **Tests**: all new lock tests pass; full suite green
3. **Behavioral verification on staging** before Commit C kicks in:
   - 2 browsers same machine → expect modal on second login
   - Same browser, second tab via Cmd-T → expect no modal
   - Different OS → expect modal
   - Web → Capacitor app → expect no conflict (different client_class)
   - Soak metrics: kick count per day, false-positive reports (admin
     dashboard)
4. **Audit log**: every kick produces a structured `logger.info` line
   with `event: 'session.kicked'`, `userId`, `kicked_session_id`,
   `kicker_ua_summary`. Drives the operator dashboard
5. **Manual smoke (post-flip)**:
   - Log in on browser A → log in on browser B → confirm modal → click
     Continue → expect A to be logged out within 8s via poller
   - Log in on browser A → log in on browser B → click Cancel → expect
     both still working
   - Log in on web → log in on Capacitor app → expect no modal on either
     side

---

## 12. Telemetry

All session events go through structured `logger.info` with `event` field:

| Event | When | Fields |
|-------|------|--------|
| `session.created` | Successful login | userId, tokenId, ua_summary, client_class, conflict_detected (bool) |
| `session.conflict_detected` | verify-otp returns session_conflict | userId, conflict_type, existing_session_count |
| `session.conflict_resolved` | login-confirm completes | userId, kicked_session_count, kept_session_count |
| `session.conflict_cancelled` | (no server event — client-only) — but admin dashboard can infer from unused pending_login_token TTLs |
| `session.kicked` | A session is revoked by login-confirm | userId, kicked_tokenId, kicked_ua_summary, kicker_tokenId, kicker_ua_summary |
| `session.poll_revoked` | Poll endpoint returns 401 | userId, tokenId, reason |
| `session.logout` | Explicit /api/auth/logout | userId, tokenId |

These drive an admin dashboard widget that surfaces:
- Daily kick count
- Per-user kick count (top 10 users with most session conflicts → likely
  account-sharing)
- Conflict-type distribution (device vs browser)

OTel span promotion deferred until dashboards are built (matching the
QBC pattern from ADR-0022 OQ-3).

---

## 13. Open Questions

These are intentionally unresolved at draft stage; resolved during the
Commit B soak week or Commit A kickoff:

- **OQ-1**: Should "logout from all devices" be a separate user-facing
  action? (Settings → Security → "Sign out everywhere") Recommended: yes,
  but separate ticket. Doesn't block this feature.
- **OQ-2**: What UA summary should appear for Capacitor app sessions?
  "DigitalDSA app on Android 13" is unambiguous but cluttered. Cleaner:
  "DigitalDSA Android app". Decide at Commit B implementation time.
- **OQ-3**: Should the admin dashboard expose "kick" as a manual admin
  action (per-user "force logout this DSA" button)? Useful for support
  but adds scope. Recommended: yes, but separate ticket.
- **OQ-4**: Should kicked-toast show **which other session** kicked it
  (showing `ua_summary`)? Privacy nuance — exposes the device label of
  the other session to the kicked session. Default: yes (it's the same
  user account; transparency is fine). Confirm at Commit C UX review.
- **OQ-5** (S223): Should refresh-token rotation in `hooks.server.ts`
  also capture fresh fingerprints + update the existing Sessions row?
  Deferred at Commit A — conflict detection runs at login, not refresh,
  so the signal isn't currently used. Revisit if Commit B soak metrics
  show high false-positive rates suggesting stale fingerprints are
  causing problems. If reopened, would need a client-side header on
  every authenticated request (significant work) + server-side parse
  + sanitize in `hooks.server.ts`.

---

## 14. Related

- ADR-0028: [Single-Session Login Enforcement — C-strict philosophy](../adr/0028-single-session-enforcement.md)
- ADR-0026: 3-layer once-per-lifetime exposure marker — similar dual-write migration pattern
- POST-AUDIT-IMPLEMENTATION-MASTER-SPEC §E.3 — original "Active devices" spec; this spec extends its data model rather than introducing a parallel one
- `src/lib/types/session.ts` — `SessionDoc` shape (Commit A extends)
- `src/lib/server/account/sessions.ts` — canonical session writer (`recordSession`, `updateSessionLastSeen`, `isSessionRevoked` — Commit A extends `recordSession`)
- `src/lib/database/mongo.ts:1174-1182` — Sessions collection + indexes (no new index required for SEC-10)
- `hooks.server.ts:118-144` — existing multi-browser device-enforcement via `activeTokenIds[]` (unchanged in Commit A; sunsets 30 days post-Commit-C)
- `src/lib/services/jwtService.ts` — token issuance, unchanged for this feature (`tokenId` already flows into `session_id`)
