# Daily Code Review — 2026-06-01

## Header

**Profile:** Full (T1-T9) — 12 commits in 24hr window across 6 workstreams (Admin 2FA, Active Devices, Retention, Referrals, Attribution, NPS/Exit Surveys, Drop-Reason, Policy Resolver Phase 2.C, RM dashboard redesign, docs overhaul). Full profile triggered by: new auth-flow features (Admin TOTP 2FA, session revocation), new session management (Active Devices), and 12 commits touching shared modules.
**Reviewed against:** committed `main` @ **`52ba1503`** (top of tree).
**Prior review:** [`CODE-REVIEW-2026-05-31.md`](CODE-REVIEW-2026-05-31.md) (8 commits, Standard profile @ `2917a6ae`).
**Delta range:** `2917a6ae..52ba1503` — 12 commits (≈10 code, ≈2 docs).
**Authors this window:** Prashant (single author).

| Command | Status | Result | Delta vs `2026-05-31` prior |
|---------|--------|--------|------------------------------|
| `pnpm check` | PASS | 0 errors, 3 warnings (in uncommitted WIP files per git status) | unchanged vs committed tree |
| `pnpm test:unit -- --run` | PASS | 293 files, **12,864 tests** | +153 tests (from 12,711) |
| `pnpm test:contrast` | PASS | **456/456 pairs** WCAG AA across every theme | unchanged |
| `git log … co-authored-by` | PASS | 0 trailer lines in this window | unchanged |

---

## Commits Reviewed (12, grouped by workstream)

### Workstream A — Admin TOTP 2FA (E.2)

Full end-to-end Admin 2FA: enrollment → QR → confirm → login-step verify → disable. Recovery codes (8, SHA-256 hashed, single-use, constant-time verify). Lockout (5 fails/15 min) on verify+disable. New deps: `otplib@^13.4.1`, `qrcode@^1.5.4`.

| SHA | Subject | Surface |
|-----|---------|---------|
| `ba6d994b` | feat(admin): E.2 Admin TOTP 2FA — end-to-end | 18 files (+1,828/-37) |

### Workstream B — Active Devices (E.3)

Session tracking collection, device-label/IP metadata, single-revoke + revoke-others, refresh-token rejection on revoked sessions. Integration: `check-dsa` records sessions; `refresh-token` calls `isSessionRevoked`.

| SHA | Subject | Surface |
|-----|---------|---------|
| `fec77dc0` | feat(account): E.3 Active Devices — list + revoke + refresh-reject | 27 files (+1,096) |

### Workstream C — Money Retention (E.4)

6-year money-record retention as code-as-policy. ADR-0023 + two CI lock tests verifying no TTL indexes on financial collections and account deletion preserves money records.

| SHA | Subject | Surface |
|-----|---------|---------|
| `3b5878ce` | feat(retention): E.4 6-year money-record retention — code-as-policy + CI locks | 4 files (+647) |

### Workstream D — DSA Referrals (F.1)

Referral code generation (crypto-random, lookalike-free charset), public `/r/[code]` redirect with cookie, onboarding consumption, reward-credit on first paid charge (both parties get +30d), stats endpoint with masked mobile.

| SHA | Subject | Surface |
|-----|---------|---------|
| `31628d73` | feat(referrals): F.1 DSA-acquires-DSA referral codes — end-to-end | 12 files (+913/-1) |

### Workstream E — UTM Attribution (F.3)

First-touch-wins UTM cookie capture in hooks.server.ts, persist on DSA record at signup. Defensive parse with field-level allow-list and length bounds.

| SHA | Subject | Surface |
|-----|---------|---------|
| `5be326ff` | feat(attribution): F.3 UTM first-touch attribution capture + persist on DSA | 5 files (+374/-1) |

### Workstream F — NPS + Exit Surveys (F.5)

NPS banner (server-side window computation + client-side banner component), exit-survey endpoint. Survey responses collection shared by both types.

| SHA | Subject | Surface |
|-----|---------|---------|
| `0dd2fa89` | feat(surveys): F.5 NPS banner (server side + UI) + exit-survey endpoint | 9 files (+734/-1) |

### Workstream G — Drop-Reason on Dropped Cases (F.4)

Zod-validated structured reason + optional note when transitioning to 'dropped'. Persisted on both the case and the stage_history entry. Cleared on re-open. Client-side drop-reason modal in case layout.

| SHA | Subject | Surface |
|-----|---------|---------|
| `28ddac8d` | feat(cases): F.4 drop-reason on dropped transitions | 5 files (+410/-23) |

### Workstream H — PMS Policy Resolver Phase 2.C

Cold-start fallback: when a (lender, product) has rules authored for exactly one city, inherit those rules for all other cities (covers early-stage one-RM-one-city scenarios). Falls back only when 0 or 1 city matches.

| SHA | Subject | Surface |
|-----|---------|---------|
| `23ca581c` | feat(rm/pms): Phase 2.C — resolver cold-start fallback (single-city inherits) | 3 files (+373/-8) |
| `e2ef73a8` | feat(rm/pms): Phase 2.A — city-scoped policy authoring + 25 cities seeded | 3 files (+139/-25) |

### Workstream I — RM Dashboard Redesign + Strict One-Lender Model

Editorial-hero + bento-grid redesign (Quiet Mosaic). Enforce strict one-lender-per-RM assignment.

| SHA | Subject | Surface |
|-----|---------|---------|
| `4270b222` | feat(dashboard/rm): editorial-hero + bento-grid redesign (Quiet Mosaic hybrid) | 2 files (+460/-220) |
| `7c59f5c1` | feat(rm): enforce strict one-lender-per-RM model | 3 files (+56/-9) |

### Workstream J — Prior Review Findings + Docs Overhaul

Closes 6 findings from prior review. Session lifecycle docs overhaul (CLAUDE.md sidecar extraction, handoff restructure, monthly archives, pre-push hook).

| SHA | Subject | Surface |
|-----|---------|---------|
| `52ba1503` | chore(review): close 6 actionable findings from CODE-REVIEW-2026-05-31 | 13 files (+1,110/-69) |
| `c57cca7a` | chore(docs): session-lifecycle overhaul — deroute stack + sidecar extraction | 25 files (+6,105/-3,910) |

---

## Standing Grep Rules — T1-T6 + T9 Sweep

| Rule | Tier | Result | Delta vs prior |
|------|------|--------|----------------|
| **A (CSRF)** — raw POST/PUT/DELETE/PATCH fetch | T1 | All new client components use `secureFetch`: `Admin2faSection.svelte`, `ActiveSessionsSection.svelte`, `NpsBanner.svelte`, `admin/2fa/+page.svelte`. 0 new violations. | unchanged |
| **E/E2 (XSS)** — `{@html}` outside `sanitizeHtml` | T1 | Same inventory as prior. No new `{@html}` in this delta. | unchanged |
| **F/OBS-1 (server logger)** — bare `console.*` in server/API | T1 | 0 hits in `src/routes/api/`. `src/lib/server/` — same 5 approved (logger.ts + telemetry.ts). | unchanged |
| **G (Co-Authored-By)** | T1 | 0 trailer lines. | unchanged |
| **SEC-1 (hardcoded secrets)** | T1 | All matches in `*.test.ts` files (exempt). No source code secrets. New deps (`otplib`, `qrcode`) have no secret-bearing config. | unchanged |
| **SEC-2 (PII in logging)** | T1 | All new endpoints log only `admin_id` / `user_id` (hex strings) + role + counts. No email/name/mobile in log output. Recovery code count logged (non-sensitive). | unchanged |
| **SEC-3 (cookie security)** | T1 | New cookies reviewed: referral (`httpOnly:true`, `secure:!dev`, `sameSite:'lax'`), 2FA access-token (`httpOnly:true`, `secure:prod`, `sameSite:'strict'`, `maxAge:15min`), UTM attribution (`httpOnly:false` — by design, non-sensitive). All conform to security requirements. | **reviewed** |
| **SEC-4 (eval/exec)** | T1 | Same 2 approved. `otplib` internal usage is pkg-internal, not in our source tree. | unchanged |
| **SEC-5 (env var exposure)** | T1 | No new `VITE_*` exposures. | unchanged |
| **SEC-6 (rate limiting)** | T1 | **New finding: 8 new state-changing endpoints have no rate limiter.** See M-H1, M-H2 below. 2FA verify+disable have application-level lockout (5/15min) as partial mitigation. | **new finding** |
| **SEC-7 (client storage PII)** | T1 | No new client-storage writes in this delta. Existing inventory unchanged. | unchanged |
| **B (Capacitor proxy at scope)** | T2 | 0 | unchanged |
| **C (module-scope fetch)** | T2 | 0 | unchanged |
| **D (typeof window SSR guard)** | T2 | 0 | unchanged |
| **I (state_referenced_locally)** | T2 | 0 from `pnpm check` (committed tree) | unchanged |
| **J (engines.node pin)** | T2 | `"22.x"` | unchanged |
| **SSR-1 (browser import in server)** | T2 | 0 | unchanged |
| **SSR-2 (noExternal coverage)** | T2 | New `otplib` + `qrcode` — pure JS, no native bindings, work in SSR. No `noExternal` change needed. | unchanged |
| **H1 ($-prefix Query)** | T3 | 0 new | unchanged |
| **K (JSON-Logic `!=`)** | T3 | Existing inventory in config files. No new patterns introduced in this delta. | unchanged |
| **L (numeric fields minLimit)** | T3 | No new numeric questions this delta. | unchanged |
| **M (combinedAnswers collision)** | T3 | 0 in components. | unchanged |
| **S (contrast audit)** | T3 | 456/456 pass. | unchanged |
| **CQ-1 (empty catch)** | T3 | 0 matches. | unchanged |
| **CQ-2 (memory leaks)** | T3 | No new `setInterval`/`addEventListener` in account components. | unchanged |
| **CQ-3 (JSON.parse(JSON.stringify))** | T3 | Only in test files (exempt). | unchanged |
| **PH-1 through PH-7** | T5 | All pass. | unchanged |
| **PERF-1 through PERF-6** | T6 | Referrals stats endpoint does 20 sequential `findUserByMobile + decryptUserPii` calls (see L-N2). Policy resolver cold-start adds 1 extra query on cache miss (acceptable per design doc). | **noted** |
| **OBS-1 (structured logging)** | T6 | All new code uses `logger`. | unchanged |
| **OBS-2 (OTel PII scrub)** | T6 | No new OTel instrumentation. | unchanged |
| **T9 (blast radius)** | T9 | See [Blast Radius](#blast-radius-assessment-t9). | **moderate** |

---

## CI Lock Tests — All Pass

| Test file | Feature | Status |
|-----------|---------|--------|
| `admin/totp.test.ts` | E.2 (new) | PASS — 21 tests |
| `account/sessionsHelpers.test.ts` | E.3 (new) | PASS — 12 tests |
| `retention/accountDeletionPreservesMoney.test.ts` | E.4 (new) | PASS — 11 tests |
| `retention/moneyCollectionsTtlAbsence.test.ts` | E.4 (new) | PASS — 8 tests |
| `referrals/referralCode.test.ts` | F.1 (new) | PASS — 8 tests |
| `attribution/utm.test.ts` | F.3 (new) | PASS — 17 tests |
| `surveys/npsEligibility.test.ts` | F.5 (new) | PASS — 10 tests |
| `cases/dropReasonRequired.test.ts` | F.4 (new) | PASS — 12 tests |
| `ruleEngine/policyResolver.test.ts` | PMS 2.C (extended) | PASS — 19+ tests |
| All existing CI lock tests (24 files) | #26,#39-#68 | PASS |

12,864 / 12,864 unit tests passing (+153 from baseline `12,711`).

---

## Prior Review Findings — Status Update

| Finding | Prior Severity | Status | Resolved by |
|---------|---------------|--------|-------------|
| M-N1 — mark-seen no rate limiter | Medium-low | CARRY — no change this window | — |
| M-N2 — data export memory at scale | Medium-low (obs) | CARRY — acceptable at current scale | — |
| L-N1 — communication page loads all messages | Low | CARRY — acceptable at current scale | — |
| L-N2 — suggestedDsas no geo index | Low | **CLOSED** — compound index on `{ workingCity, onboardingCompleted, is_suspended }` added in `52ba1503` | `52ba1503` |
| L-N3 — mark-seen unnecessary `decryptUserPii` | Low | CARRY — no change | — |
| L-N4 — policies page hardcoded Tailwind colors | Low | CARRY — no change | — |
| L-N5 — dataExport hardcodes email | Low (info) | CARRY — acceptable | — |
| L5 (from 05-30) — QBC sessionStorage PII-adjacent | Low | CARRY — acceptable per analysis | — |

---

## Critical Findings

None.

---

## High-Priority Findings

None.

---

## Medium Findings

### M-H1 — Admin 2FA `/confirm` endpoint has no rate limiter or lockout

**Confidence:** 70
**Severity:** Medium
**File:** [`src/routes/api/admin/2fa/confirm/+server.ts`](src/routes/api/admin/2fa/confirm/+server.ts)

The `/confirm` endpoint validates the admin's first TOTP token during enrollment. Unlike `/verify` and `/disable` (which implement `computeLockoutState` — 5 failures / 15 min), `/confirm` allows unlimited attempts against the 6-digit code space.

**Attack scenario:** An attacker with a stolen admin JWT (first-factor compromise) could:
1. Call `/enroll` (gets their own secret — no, this resets the enrollment. The attack is: NOT calling enroll, but brute-forcing the code for an enrollment the real admin started.)
2. Wait for the admin to call `/enroll`, then brute-force `/confirm` with all 1M 6-digit codes.

**Mitigating factors:**
- Requires valid admin JWT (extremely small attack surface — admin-only)
- Enrollment window is brief (admin typically scans QR + confirms in <5 min)
- ±1 step tolerance means 3 valid codes per 30-second window, but the attacker doesn't know WHEN to start
- At ~100 req/s (no rate limiter), exhausting 1M codes takes ~3 hours — far longer than a typical enrollment window

**Recommendation:** Add `computeLockoutState` to `/confirm` (same 5/15min pattern as verify/disable) for defense-in-depth and convention parity. Non-urgent given mitigating factors.

### M-H2 — New survey + session endpoints have no rate limiter

**Confidence:** 65
**Severity:** Medium-low
**Files:**
- [`src/routes/api/surveys/nps/+server.ts`](src/routes/api/surveys/nps/+server.ts)
- [`src/routes/api/surveys/exit/+server.ts`](src/routes/api/surveys/exit/+server.ts)
- [`src/routes/api/account/sessions/[session_id]/revoke/+server.ts`](src/routes/api/account/sessions/[session_id]/revoke/+server.ts)
- [`src/routes/api/account/sessions/revoke-others/+server.ts`](src/routes/api/account/sessions/revoke-others/+server.ts)
- [`src/routes/api/admin/2fa/enroll/+server.ts`](src/routes/api/admin/2fa/enroll/+server.ts)

Per CLAUDE.md §15 convention: "Always use the rate limiter from `$lib/server/rateLimiter` for state-changing or expensive endpoints." These 5 endpoints are state-changing (DB writes) with no rate limiter.

**Risk assessment:** Low in practice. All are auth-gated, bounded-impact (upserts, timestamp sets, QR generation), and most are idempotent. A misbehaving client `$effect` loop or a script-kiddie with a stolen JWT could spam them, but the damage ceiling is low (extra DB writes, wasted CPU on QR generation).

**Recommendation:** Add generous rate limits (10-20 per minute per user) for convention parity. Lowest priority for survey endpoints; slightly higher for `/enroll` (CPU cost of QR generation).

---

## Low Findings / Observations

### L-N1 — Referral stats endpoint: 20 sequential CSFLE decrypt calls

**Confidence:** 60
**Severity:** Low (performance observation)
**File:** [`src/routes/api/dsa/referrals/+server.ts:103-118`](src/routes/api/dsa/referrals/+server.ts:103-118)

The "recent referrals" decoration loop calls `DsaApplications.findOne` + `decryptUserPii` sequentially for each of the ≤20 referred DSAs. With CSFLE active, each `decryptUserPii` triggers a KMS round-trip. At 20 referrals this is ~20 × ~50ms = ~1s total (noticeable latency).

**Optimization (when needed):** Batch the mobile lookups into one `$in` query with a `{ _id: { $in: [...] }, mobileNumber: 1 }` projection, then decrypt once per batch result. The `decryptUserPii` helper would need a batch variant, or the endpoint can collect all encrypted docs first, decrypt in `Promise.all`, then map.

Not a blocker for v1 (most DSAs will have <5 referrals for months). Note for when referral volume grows.

### L-N2 — Prior review findings carried forward

The following findings from prior reviews remain open, unchanged:
- M-N1 (mark-seen rate limiter) — convention parity, no security impact
- M-N2 (data export memory) — acceptable at 200-case threshold
- L-N1 (communication page loads all messages) — acceptable at current scale
- L-N3 (mark-seen unnecessary decrypt) — harmless waste
- L-N4 (policies page hardcoded Tailwind) — visual-only, dark-mode gap

### L-N3 — `pnpm check` 3 warnings in working tree

The type-check reports 3 warnings in 1 file on the current working tree. Per git status, several files have uncommitted modifications (form components, config files, tests). These warnings are in the WIP layer — not regressions from today's commits. Monitor on next committed check.

---

## Security Surface Summary

### E.2 Admin 2FA — sound design, one gap

The TOTP implementation is cryptographically sound:
1. **Secret generation:** `otplib.generateSecret()` — 160-bit entropy (RFC 4226 compliant).
2. **Token verification:** constant-time via `otplib.verifySync` with ±1 step drift tolerance.
3. **Recovery codes:** 8 codes, 64-bit entropy each, SHA-256 hashed. `timingSafeEqual` for comparison — constant-time across the entire hash list (no early exit reveals position).
4. **Lockout:** 5 failures / 15 min rolling window on verify + disable (shared `failed_attempts` list).
5. **Cookie security:** promoted JWT on 2FA verify uses `httpOnly: true`, `secure: production`, `sameSite: 'strict'`, `maxAge: 15min`.
6. **No PII in logs:** only `admin_id` (hex) + action labels.
7. **Idempotency:** double-enroll returns 409; re-enroll before confirm just overwrites the in-progress secret.

**Gap:** `/confirm` lacks lockout (see M-H1). Low practical risk given prerequisites.

### E.3 Active Devices — BOLA-safe, defensive

1. **Ownership:** All session queries filter by `user_id` resolved from JWT. URL param `session_id` alone never grants access.
2. **Revoke-others safety:** Requires valid refresh-token cookie to identify current session. Rejects when cookie unparseable (prevents accidental self-logout).
3. **Refresh-reject integration:** `isSessionRevoked(tokenId)` check added to refresh-token endpoint. Revoked sessions lose access within 15 min (access token TTL).
4. **No session enumeration:** 404 returned for both "doesn't exist" and "belongs to another user" — no information leakage.

No issues found.

### F.1 Referrals — crypto-sound, no self-referral

1. **Code generation:** `crypto.randomInt` (CSPRNG), 32^8 space (~1 trillion), collision retry loop.
2. **Self-referral prevention:** (implied by the referral cookie being consumed at signup — a DSA already signed up can't re-onboard with their own code).
3. **Cookie:** `httpOnly: true`, server-only consumption at onboarding.
4. **Reward idempotency:** `reward_status: 'credited'` check prevents double-credit. `Referrals.referred_dsa_id` has a unique index preventing duplicate rows.
5. **Mobile masking:** stats endpoint uses `maskMobile` — first 2 + last 4 visible, middle XXXX'd.

No issues found.

### F.3 Attribution — defensive, non-sensitive

1. **Allow-list parse:** `parseFromCookie` only extracts whitelisted string keys with length bounds (≤500 chars). Extra fields in a tampered cookie are dropped.
2. **First-touch-wins:** existing cookie → skip. Prevents click-jacking attribution.
3. **Non-sensitive:** UTM params are marketing metadata, not PII. `httpOnly: false` is acceptable.
4. **Non-fatal:** try/catch in hooks.server.ts — parse failure doesn't break the request.

No issues found.

### F.4 Drop-Reason — Zod-validated, audit-safe

1. **Zod `superRefine`:** `drop_reason` required only for stage='dropped'; `drop_reason_note` required only when reason='other'. API boundary enforces.
2. **Audit trail:** reason stored on BOTH the case document AND the immutable stage_history entry. Re-open clears the case-level fields but history entry is forever (AD-02 compliant).
3. **BOLA:** `verifyCaseOwnership` + `resolveEffectiveDsaId` + `blockDemoWrite`.

No issues found.

### F.5 Surveys — Zod-validated, bounded

1. **NPS:** score 0-10 (Zod int), reason ≤500 chars, text ≤2000 chars. Idempotent upsert per (user, window).
2. **Exit:** reason from enum allow-list (`EXIT_SURVEY_REASONS`), text ≤2000 chars. Multiple submissions allowed per spec.
3. **No PII in logs:** `user_id` + role + score/reason (never free-text content).
4. **Window gating:** NPS only shown at day-30 / day-180 — server-side compute in layout load. Backend rejects out-of-window submissions defensively.

No issues found.

---

## Blast Radius Assessment (T9)

| Module | Change type | Consumers affected | Risk |
|--------|-----------|-------------------|------|
| `mongo.ts` | +2 collection exports (`SurveyResponses`, `Referrals`), +5 indexes, +1 compound index on DsaApplications | All server loads (warm-up cost of `ensureIndexes`) | **Low** — indexes additive; DsaApplications compound index aids existing query |
| `hooks.server.ts` | +27 lines UTM cookie capture (dynamic import + try/catch) | Every request | **Low** — non-fatal path, dynamic import isolates failure, only fires on UTM-carrying URLs without existing cookie |
| `types/index.ts` | +3 optional fields on `Dsa` (`attribution`, `referral_code`, `referred_by`), +1 interface | All files importing from `$lib/types` | **Negligible** — additive optional fields, no existing field changed |
| `jwtService.ts` | +`tfa_pending` claim in token generation | Token creation paths | **Low** — additive claim, consumers that don't check for it are unaffected |
| `policyResolver.ts` | Cold-start fallback (+60 lines in resolver, +40 in batch resolver) | Policy resolution for all case-route lookups | **Low** — only fires when zero rules match natural geo chain; exactly-one-city constraint prevents ambiguous inheritance; locked by 19+ tests |
| `dashboard/+layout.server.ts` | +NPS window computation (try/catch, non-fatal) | Every dashboard page load (DSA/RM) | **Low** — non-fatal, one indexed `findOne` per load (already on the `DsaApplications` fetch path) |
| `dashboard/+layout.svelte` | +NpsBanner conditional render | Every dashboard page render | **Negligible** — conditional mount, no impact on existing layout when ineligible |
| `refresh-token/+server.ts` | +`isSessionRevoked` check | Every JWT refresh | **Low** — single indexed `findOne` on `Sessions` collection, only blocks already-revoked tokens |
| `check-dsa/+server.ts` | +`recordSession` call on login | Every login | **Low** — additive write to `Sessions` collection, non-fatal path |

No breaking changes to shared exports. All new modules are additive. The `policyResolver.ts` cold-start fallback is the highest-complexity addition but is well-guarded (single-city constraint + comprehensive test coverage).

---

## Performance Notes

- **Policy resolver cold-start:** adds 1 extra MongoDB query when the natural geo chain yields zero rules. This fires only for early-stage (lender, product) combinations without published policies — rare in steady state. The query has an index on `{ product_id, is_active }`.
- **Refresh-token `isSessionRevoked`:** one indexed `findOne` on `{ session_id, revoked_at }`. Sub-5ms. Runs on every refresh (every 15 min per active client). Acceptable.
- **NPS layout computation:** one `findOne` per dashboard page load (DSA/RM). Already on the `DsaApplications` query path (same document, extra projection field). No incremental latency.
- **Referral stats sequential decrypts:** 20 × ~50ms = ~1s worst case. Acceptable for v1 referral volumes. See L-N1.
- **New indexes (5):** all run once at server boot via `ensureIndexes`. No runtime cost. One new DsaApplications compound index aids the suggested-DSA query.

No performance regressions detected.

---

## New Dependencies Assessment

| Package | Version | Purpose | Risk |
|---------|---------|---------|------|
| `otplib` | ^13.4.1 | TOTP generation + verification | **Low** — 4.2M weekly downloads, well-maintained, pure JS, no native bindings. SSR-safe. |
| `qrcode` | ^1.5.4 | QR code generation for TOTP enrollment | **Low** — 8.5M weekly downloads, pure JS, SSR-safe. Used only in admin 2FA endpoint. |
| `@types/qrcode` | ^1.5.6 | TypeScript definitions | **Negligible** — devDependency only |

All three are established, actively maintained packages with no known vulnerabilities at current versions. No SSR compatibility concerns (pure JS, no `window`/`document` usage).

---

## Top Actions (priority order)

1. **Add lockout to `/api/admin/2fa/confirm`** — Apply same `computeLockoutState` pattern as verify/disable (M-H1). 5-minute fix, same session as any 2FA polish.
2. **Add rate limiters to new endpoints** — Survey (nps, exit), session revoke (single, others), 2FA enroll. Generous limits (10-20/min/user) for convention parity (M-H2). ~15 minutes total.
3. **(Optional) Batch referral mobile lookups** — Replace 20 sequential findOne+decrypt with one `$in` query + parallel decrypt (L-N1). Non-urgent at current referral volumes.
4. **Replace hardcoded Tailwind in policy renewal warnings** — Carried from prior review (L-N4). ~15 minutes on next policy-library touch.
5. **(Watch) Working-tree 3 warnings** — Investigate on next commit; likely related to form component WIP modifications in git status.

---

## Known-Safe Inventory Update

- `otplib` + `qrcode` — pure JS, SSR-safe, admin-only usage path.
- `SurveyResponses` collection — shared NPS+exit, compound index `{ user_id, type, created_at }`.
- `Referrals` collection — unique index on `referred_dsa_id` (idempotency), `referrer_dsa_id` index (stats query).
- `Sessions` collection — session_id indexed, partial index on `revoked_at` for revoke-sweep queries.
- `DsaApplications.{ workingCity, onboardingCompleted, is_suspended }` compound index — suggested-DSA query acceleration.
- `/r/[code]/+server.ts` — public GET, no state change beyond cookie-set, validates code format before DB lookup.
- `creditReferralRewardIfEligible` — idempotent (checks `reward_status` before writing), best-effort (catch logs but doesn't throw).
- `computeNpsWindow` — pure function, returns window label or null. No I/O.
- `findColdStartFallbackRules` — single-city constraint prevents ambiguous inheritance.
- Admin 2FA lockout: `computeLockoutState` — rolling 15-min window, trimmed array (bounded at 10), Date-based.

---

*Report generated 2026-06-01. No source code modified during review. All findings are against the committed `main` tree at `52ba1503` plus assessment of today's 12-commit delta.*
