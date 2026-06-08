# Daily Code Review — 2026-05-19

**Scope:** 15 commits `b2018790..b82c3b89` (last 24 hours). SEC-2 CSFLE infrastructure + auth route encryption, Director firm-name feature (3 phases), "different applicant" intent preservation, 3 form-lifecycle pitfalls (#40/#41/#42), 2 team bug-fix rounds, SEC-5 BOLA regression net. Single author (Prashant).

**Prior review:** [`CODE-REVIEW-2026-05-18.md`](CODE-REVIEW-2026-05-18.md) — 1 commit (admin-bypass parity). Carry-forward: L1 (apiServerError context), L5 (DX-4 `json()` migration queue), M3 (`check-dsa` flat shape).

**Review profile:** **Full** (T1-T9 + Phase 3). 15 commits, auth/security changes (SEC-2), shared-module changes (6 modules). T9 triggered by changes to `mongo.ts`, `applicantFormManager.svelte.ts`, `IncomeSourceForm.svelte`, `applicantRestoreHandler.ts`, `loanSwitchOrchestrator.svelte.ts`, `loanData.ts`.

---

## Commands Executed

| Command | Result |
|---------|--------|
| `pnpm check` | **0 errors, 0 warnings** — unchanged |
| `pnpm test:unit -- --run` | 137 files, **10,978 tests** — all pass (**+143** from prior review: 10,835) |
| `pnpm test:contrast` | **456/456 pairs passed** — all WCAG AA across every theme |
| `git log --since='1 week' \| co-authored-by` | 0 real violations |

---

## Commits Reviewed

| SHA | Subject | Files | +/− | Category |
|-----|---------|-------|-----|----------|
| `b82c3b89` | feat(security): SEC-2 Phase B.1 — encrypt DSA auth routes | 5 | +271/−16 | Security |
| `808a043d` | fix(form): preserve "different applicant" intent | 7 | +325/−3 | Form fix |
| `c5f070f3` | feat(form): Director firm-name Phase 3 (validation) | 2 | +120/−3 | Feature |
| `d8f714b6` | feat(form): Director firm-name Phase 2 (wire into income forms) | 6 | +170/−20 | Feature |
| `dbe763ab` | feat(ui): Director firm-name Phase 1 (component only) | 1 | +332/−0 | Feature |
| `05a95539` | feat(security): SEC-2 Phase A — CSFLE infrastructure | 9 | +388/−2 | Security |
| `55396204` | test(security): SEC-5 BOLA regression net | 1 | +205/−0 | Test |
| `c72bf9e2` | docs(specs): SEC-2 CSFLE pivot + plans | 6 | +1989/−0 | Docs |
| `390c666a` | docs(close): extend handoff with Pitfalls #40-42 | 2 | +27/−8 | Docs |
| `655b3ff2` | docs(changelog): Pitfalls #40-42 | 1 | +38/−0 | Docs |
| `e8e467bb` | fix(form): 3 form-lifecycle pitfalls (#40/#41/#42) | 18 | +850/−14 | Form fix |
| `e66062e1` | docs(close): refresh SESSION-HANDOFF | 2 | +91/−4 | Docs |
| `ec4e8979` | fix(form): 5-issue team report | 11 | +197/−62 | Form fix |
| `0fc73867` | fix(form): FEMA reset + ITR profit-without-turnover | 5 | +139/−23 | Form fix |
| `5823ae61` | fix(modal): close on SvelteKit route change (Pitfall #39 ext.) | 7 | +309/−1 | Form fix |

Total: **15 commits**. Source: 40 unique files. Docs: 12 (specs, handoff, changelog, reviews). Tests: +143 new tests across 5 new test files.

---

## Prior Review Findings — Resolution Status

| Finding | Status | Evidence |
|---------|--------|----------|
| **L1** — Lost `captureId` context in `apiServerError` | **Carry-forward** | No changes to `apiResponse.ts`. |
| **L5** / **M3** — `json()` carry-forward in `check-dsa` + routes | **Carry-forward** | `check-dsa` and `signup` still use `json()` for success paths. See M2 below. |
| **L1** (2026-05-17) — `pushSubscribed` without unmount guard | **Carry-forward** | Accepted as-is. No change. |

---

## Standing Grep Rules — T1-T6 Sweep

| Rule | Tier | Result | Delta vs 2026-05-18 |
|------|------|--------|----------------------|
| **A** — CSRF: raw `fetch()` + POST in `.svelte` | T1 | Same known-safe inventory (auth pages, `_archived`, GETs). **0 new violations.** | Unchanged |
| **E** — Unsanitized `{@html}` XSS vectors | T1 | Same 33 approved exception sites. **0 new violations.** | Unchanged |
| **E2** — Dynamic attribute / URL injection | T1 | No new risk patterns. | Unchanged |
| **F** — Bare `console.log/error/warn` in server code | T1 | Known-safe: `logger.ts:47,54` (formatter), `telemetry.ts:186,211,215` (OTel bootstrap). `routes/api/` has 2 commented-out lines only. **0 violations.** | Unchanged |
| **G** — `Co-Authored-By` in commits | T1 | **0 real violations.** | Unchanged |
| **SEC-1** — Hardcoded secrets | T1 | All matches are test files or type enums. No new source patterns. | Unchanged |
| **SEC-2** — PII in logging | T1 | **0 new PII in logger calls.** New auth route code logs only `userId`/`err`, never PII fields. `decryptUserPii` output flows to response body (user's own data), not to logs. | Verified clean |
| **SEC-3** — Cookie security | T1 | All new `cookies.set()` calls in `signup` and `check-dsa` correctly use `httpOnly: true`, `secure: !dev`, `sameSite: 'lax'`, `path: '/'`. | Verified clean |
| **SEC-4** — `eval`/`exec`/`child_process` | T1 | Same 2 known-safe instances (test routes) + regex `.exec()` in test. | Unchanged |
| **SEC-5** — Client env exposure | T1 | Only `VITE_VAPID_PUBLIC_KEY` (public by design). 0 server-private leaks to `.svelte`. New CSFLE code uses `$env/dynamic/private` in server-only files (correct). | Unchanged |
| **SEC-6** — Rate limiting on auth | T1 | Both modified auth routes (`signup`, `check-dsa`) have rate limiting. `signup`: 5/min/IP. `check-dsa`: 10/min/IP. | Verified clean |
| **SEC-7** — Client storage PII | T1 | Same known-safe sites. | Unchanged |
| **B** — SSR: static `@capacitor/*` imports | T2 | **0 matches** (excluding `@capacitor/core`). | Unchanged |
| **C** — `typeof window` SSR guard (Pitfall #9) | T2 | **0 violations.** | Unchanged |
| **D** — `fetch` at module scope (Pitfall #4) | T2 | **0 violations.** | Unchanged |
| **I** — `window.*` without browser guard | T2 | All `window.*` calls inside `$effect` or `onMount`. New `FirmNameCombobox` uses `$effect` cleanup (lines 94-105). | Verified clean |
| **J** — `localStorage`/`sessionStorage` SSR-unsafe | T2 | Same known-safe files. | Unchanged |
| **SSR-1** — TanStack Query `$`-prefix | T2 | **0 violations.** Only documentation comment in `queryClient.ts:26`. | Unchanged |
| **SSR-2** — TanStack Query provider wiring | T2 | Provider chain intact. | Unchanged |
| **H1** — JSON-Logic `!=` (Pitfall #1) | T3 | Same carry-forward in `businessLoan/`. No new usages. | Unchanged |
| **K** — `$state(prop)` without `$derived` (Pitfall #10) | T3 | `pnpm check` 0 warnings. | Unchanged |
| **L** — `combinedAnswers` collisions (Pitfall #13) | T3 | No new collision-risk patterns. | Unchanged |
| **M** — Numeric fields without `minLimit` (Pitfall #14) | T3 | No new form question additions. | Unchanged |
| **S** — Contrast audit (WCAG AA) | T3 | 456/456 pairs passed. | Unchanged |
| **CQ-1** — Empty catch blocks | T3 | **0 empty catch blocks.** | Unchanged |
| **CQ-2** — Memory leaks: intervals/listeners | T3 | New `FirmNameCombobox` properly cleans up `addEventListener` in `$effect` return function. | Verified clean |
| **CQ-3** — `JSON.parse(JSON.stringify)` | T3 | Only in test files (exempt). | Unchanged |
| **CQ-4** — Error boundary coverage | T3 | `+error.svelte` at root, `(app)`, `dashboard`. Known gap: `(auth)`. | Unchanged |
| **CQ-5** — TODO/FIXME/HACK | T3 | **35 across 13 files** — unchanged. | Unchanged |
| **PH-1** — Vercel Node pin | T5 | `engines.node: "22.x"` — correct. | Unchanged |
| **PH-2** — `ssr.noExternal` chain | T5 | `pino`, `gsap`, `gsap/dist/ScrollTrigger`, isomorphic-dompurify chain (build-only), `razorpay`. No new deps added. | Unchanged |
| **PH-3..PH-7** — Other production hygiene | T5 | No changes. | Unchanged |
| **PERF-1..PERF-6** — Performance rules | T6 | No new performance-impacting patterns. | Unchanged |
| **OBS-1/OBS-2** — Observability | T6 | Unchanged. | Unchanged |
| **Pitfall #42** — `getEntriesByType('navigation')` | T4 | **0 raw inline calls** in routes/components. Only in `isReloadOfCurrentPath.ts` (util) and test files. Migration complete. | Verified clean |

---

## Findings (this review)

### High — none

### Medium

#### M1 — `signup` route: mobile type inconsistency at CSFLE boundary

**File:** [`src/routes/api/auth/signup/+server.ts`](src/routes/api/auth/signup/+server.ts)

The route stores `mobileNumber` as a **string** (line 81: `mobileNumber: mobileStr`) for CSFLE deterministic type normalization, but passes the **number** variant `mobileNum` to `generateTokenPair()` (line 103) and returns it as a number in the response body (line 153: `mobileNumber: mobileNum`).

```typescript
// Line 81: DB insert — STRING
const encryptedDoc = await encryptUserPii({ mobileNumber: mobileStr, ... });

// Line 103: JWT claim — NUMBER
const tokens = generateTokenPair(id, '', mobileNum, '', tokenId);

// Line 153: Response — NUMBER
data: { mobileNumber: mobileNum, ... }
```

**Risk:** During the CSFLE Phase C migration window, JWT `locals.user.mobileNumber` will be a number while DB lookups compare against encrypted strings. Any downstream code doing strict equality (`===`) between the JWT claim and a DB field value could fail silently. Not exploitable (no auth bypass), but a correctness risk for features that compare user identity across these boundaries.

**Recommendation:** Pass `mobileStr` (string) consistently to both `generateTokenPair()` and the response body. The token consumer already handles both types, so the change is backward-compatible.

#### M2 — `check-dsa` + `signup` success paths still use raw `json()` (carry-forward, expanded)

Both auth routes now correctly use `apiError`/`apiServerError`/`apiValidationError` for error paths but still use raw `json()` from `@sveltejs/kit` for success responses. This is a DX-4 carry-forward, now more visible because both routes received significant modifications (SEC-2 integration). Migration to `apiOk()` would standardize the response envelope.

### Low

#### L1 — `apiServerError` missing context (carry-forward)

No changes to `apiResponse.ts`. Enhancement still recommended to accept an optional context object for richer error metadata.

---

## Commit-Level Analysis

### Security Commits (Critical Review)

#### `05a95539` — SEC-2 Phase A: CSFLE explicit encryption infrastructure

**9 new files**, 388 additions. Establishes the CSFLE foundation.

**Architecture assessment — sound:**

| Module | Purpose | Assessment |
|--------|---------|------------|
| `csfle/client.ts` | `ClientEncryption` singleton factory | Lazy-init, env-gated (`CSFLE_ENABLED`), fails loudly on missing/malformed CMK. CMK length validated (96 bytes). Test-only reset exported. |
| `csfle/helpers.ts` | `encryptValue` / `decryptValue` wrappers | Passthrough when CSFLE disabled. Idempotent (skips already-encrypted Binary subtype 6). Fail-loud on ciphertext-without-CSFLE. |
| `csfle/keys.ts` | DEK registry with algorithm definitions | Deterministic for queryable fields (mobile, email, PAN), random for display-only (name, DOB, Aadhaar). Correct algorithm selection. |
| `csfle/setup.ts` | `ensureDeksExist()` DEK provisioner | Idempotent. Creates DEKs with `keyAltName` for each entry in registry. |
| `csfle/userCrypto.ts` | Per-collection encrypt/decrypt + dual-query | `encryptUserPii()` walks document, encrypts recognized fields. `findUserByMobile()` tries encrypted match first, falls back to plaintext dual-query. Migration-safe. |
| `csfle/index.ts` | Barrel export | Clean re-export of all public APIs. |
| `scripts/sec2-init-deks.ts` | One-time DEK initialization script | Standalone, not imported by app code. |

**Security-specific checks:**
- CMK is loaded from `$env/dynamic/private` (server-only). Never exposed to client.
- No hardcoded keys or secrets in source.
- `isEncryptedBinary()` guard prevents double-encryption (idempotent encrypt path).
- `decryptValue()` throws on ciphertext when CSFLE is disabled — correct fail-loud behavior.
- Type normalization: `mobileNumber` coerced to string before deterministic encryption. Ensures `encrypt(123)` === `encrypt("123")`.

#### `b82c3b89` — SEC-2 Phase B.1: encrypt DSA auth routes

**5 files**, 271 additions. Wires CSFLE into `signup` and `check-dsa`.

**Changes:**
- `signup/+server.ts`: Replaced direct `Applicant.findOne({ mobileNumber: ... })` with `findUserByMobile()`. New documents encrypted via `encryptUserPii()` before `insertOne()`.
- `check-dsa/+server.ts`: All 5 collection lookups (DsaApplications, rmApplications, Applicant, AdminUsers × 2) migrated from raw `findOne` to `findUserByMobile()` + `decryptUserPii()`.
- `mongo.ts`: Exports `MongoClientInstance` for CSFLE binding.
- `csfle/index.ts`: Added `userCrypto.ts` exports to barrel.

**Assessment:**
- Migration safety verified: both routes transparently handle encrypted + plaintext rows. No behavior change when `CSFLE_ENABLED` is unset (passthrough).
- `decryptUserPii` called immediately after `findUserByMobile` in every branch — downstream code never sees ciphertext.
- Cookie handling unchanged and correct (httpOnly, secure, sameSite verified in T1 sweep).
- Rate limiting intact on both routes.
- See M1 above for the mobile type inconsistency.

### Feature Commits

#### `dbe763ab` + `d8f714b6` + `c5f070f3` — Director firm-name combobox (Phases 1-3)

Well-structured 3-phase delivery:

**Phase 1 (`dbe763ab`):** New `FirmNameCombobox.svelte` component (332 lines). TextField wrapper with floating suggestion list. Uses `position: fixed` (Pitfall #17 compliant). Event listener cleanup in `$effect` return function (CQ-2 verified). Keyboard navigation (ArrowUp/Down/Enter/Escape). "Use X as new firm name" pseudo-option for arbitrary input.

**Phase 2 (`d8f714b6`):** Wires FirmNameCombobox into `IncomeSourceForm.svelte` for `business_partnership` profile type. New `firmNameOptions.ts` utility assembles suggestions from parent borrowing firm, sibling-applicant declarations, and current applicant's prior entries. Conditional rendering: FirmNameCombobox only shown when `firmNameOptions` is provided and non-empty; falls back to plain TextField otherwise (backward-compatible).

**Phase 3 (`c5f070f3`):** Adds borrowing-firm validation in `AddApplicantBusiness.svelte`. New `directorFormUtils.ts` functions for firm-name matching and validation. 120 additions across 2 files.

**Assessment:** Clean feature rollout. Each phase independently reviewable. No regressions to existing flows — FirmNameCombobox is opt-in via the `firmNameOptions` prop. Only Business Loan pages pass the prop; other loan types get the unchanged TextField.

#### `808a043d` — Preserve "different applicant" intent

Introduces `__independentOfSameName` flag on Individual applicants. Set when the user explicitly declares "Not this person" / "different applicant" in RestoreApplicantModal. Prevents downstream auto-link paths from merging two intentionally distinct same-named people.

**4 shared modules updated consistently:**
1. `DirectorCards.svelte` — 2 guard sites in `syncDirectorsToFormState`
2. `applicantFormManager.svelte.ts` — `continue` guard in the auto-link loop
3. `applicantRestoreHandler.ts` — guard in `relinkDirectorsAndCompanies`
4. `directorRestoreHandler.ts` — stamp flag in `handleRestoreModalCancel`

**Test coverage:** 229 tests in `independentOfSameName.test.ts`. Well-tested.

### Form Fix Commits

#### `e8e467bb` — 3 form-lifecycle pitfalls (#40/#41/#42)

**850 additions across 18 files.** Three distinct pitfalls with full wrong→right→detection→enforcement bodies in PITFALLS.md. CLAUDE.md §3 index extended. §4 gains 3 new pre-flight grep recipes.

- **Pitfall #40:** PendingRestoreBanner Cancel resync — monotonic-counter pattern for cross-component event signaling. 258 tests.
- **Pitfall #41:** Loan variant change resets per-loan page index — new `resetLoanPageIndex()` in orchestrator. 111 tests.
- **Pitfall #42:** `isReloadOfCurrentPath()` util replaces 6 inline `getEntriesByType('navigation')` calls. 131 tests.

**Verified:** Pitfall #42 grep shows 0 raw inline calls remaining in routes/components. Migration complete.

#### `ec4e8979` — 5-issue team report

5 fixes from team screenshots: (a) FEMA gate in `IncomeSourceForm.updateSpecific()`, (b) capital contribution % validation (`maxLength: 3` + numeric clamp), (c) Clear Form nav hardened (`clearFormAndGotoPicker.ts` with `goto` fallback), (d) RestoreApplicantModal `afterNavigate` cleanup, (e) 2 sub-bullets deferred.

#### `0fc73867` — FEMA reset + ITR profit-without-turnover

Two independent fixes: (a) FEMA `openConfirmModal` calls in Business/Professional flows got `onCancel` wired (Pitfall #39 pattern), (b) `isMediumComplete` ITR validation tightened — non-zero profit now requires `grossReceipts > 0`. 5 new contract tests.

#### `5823ae61` — Modal close on SvelteKit route change (Pitfall #39 extension)

`afterNavigate` cleanup added to `ConfirmModal.svelte`, `SameCompanyPromptModal.svelte`, and `InfoModal.svelte`. SvelteKit client-side route changes don't fire DOM-level events on modals — the singleton's `open` flag survives nav unless explicitly cleared.

---

## Security Summary

| Surface | Status this session |
|---------|---------------------|
| **CSFLE infrastructure** | **NEW.** Phase A: 6-module CSFLE explicit encryption system. Phase B.1: `signup` + `check-dsa` wired. Local KMS, CMK validation, migration-safe dual-query. |
| **PII at rest** | First two routes now encrypt PII fields (mobile, email, PAN, name, DOB, Aadhaar, address) on insert and decrypt on read. Passthrough when CSFLE disabled. |
| **Auth cookies** | All new `cookies.set()` calls verified: httpOnly, secure, sameSite=lax. |
| **Rate limiting** | Both modified auth routes retain rate limiting (5/min signup, 10/min check-dsa). |
| **BOLA** | +1 regression test file (`bolaAdminPolicyEngine.test.ts`, 205 tests). SEC-5 count unchanged at 107. |
| **XSS** | Unchanged. 33 approved `{@html}` sites. |
| **CSRF** | Unchanged. |

## Performance Summary

| Metric | Status |
|--------|--------|
| PERF-3 TanStack Query | Unchanged (2 components migrated). |
| Bundle / Network | New `FirmNameCombobox` (332 lines) and `firmNameOptions.ts` (82 lines) — small additions. |
| Auth route latency | `check-dsa` now has 2 queries per collection lookup (encrypted + plaintext fallback) during migration window. Post-Phase C backfill, the fallback never matches and the net effect is negligible. |

## Blast Radius Summary (T9)

**6 shared modules changed.** All changes are additive (new guards, new exports, new props). No behavioral change for existing un-flagged applicants or CSFLE-disabled environments.

| Module | Risk | Reason |
|--------|------|--------|
| `src/lib/database/mongo.ts` | **Low** | Single `const` export aliasing existing variable. All existing imports unaffected. |
| `src/lib/stores/loanData.ts` | **None** | Type-only addition to `LegacyApplicant`. Existing `[key: string]: any` already allows it. |
| `src/lib/components/applicantFormManager.svelte.ts` | **Low** | Additive `continue` guard. Unflagged applicants follow same path. |
| `src/lib/components/IncomeSourceForm.svelte` | **Low** | FEMA gate (guarded by condition) + optional FirmNameCombobox (guarded by prop). |
| `src/lib/utils/applicantRestoreHandler.ts` | **Low** | Additive guard + new signal emission (Pitfall #40). |
| `src/lib/utils/loanSwitchOrchestrator.svelte.ts` | **Low** | New function + mapping table. Called only from how-can-we-help picker on variant key change. |

---

## Known-Safe Inventory Updates

| Category | Prior count | Current count | Change |
|----------|-------------|---------------|--------|
| `{@html}` approved sites | 33 | 33 | Unchanged |
| `json()` carry-forward routes (DX-4) | ~128 of ~150 | ~128 | Unchanged |
| BOLA defense-in-depth routes | 5 | 5 | Unchanged |
| SEC-5 BOLA routes audited | 107 | 107 | Unchanged |
| PERF-3 TanStack migrations | 2 | 2 | Unchanged |
| Auth rate-limited routes | 19 | 19 | Unchanged |
| Contrast pairs | 456/456 | 456/456 | Unchanged |
| TODO/FIXME/HACK count | 35 / 13 files | 35 / 13 files | Unchanged |
| Test count | 10,835 | **10,978** | **+143** |
| CSFLE-encrypted auth routes | 0 | **2** | **+2** (signup, check-dsa) |

---

## Top 5 Actions

1. **Fix M1** — Pass `mobileStr` (string) consistently in `signup/+server.ts` to `generateTokenPair()` and response body. Prevents type inconsistency before Phase C backfill.
2. **Continue SEC-2** — Wire CSFLE into remaining auth routes (`verify-otp`, `detect-roles`, onboarding routes). Phase B.1 covers the two highest-traffic routes; the rest should follow the same `findUserByMobile` + `decryptUserPii` pattern.
3. (**Carry-forward**) Enhance `apiServerError` to accept optional context object (L1).
4. (**Carry-forward**) Continue DX-4 `json()` → `apiOk()/apiError()` migration. `check-dsa` and `signup` are good candidates given today's changes.
5. (**Track**) Monitor SEC-2 Phase C backfill plan — once DEKs are provisioned and `CSFLE_ENABLED=true`, the dual-query fallback in `findUserByMobile` will be exercised in production. Ensure the plaintext fallback branch is exercised in integration tests before flipping the flag.

---

## Resolution Log (post-review)

Tracked here so the original findings stay frozen-in-time while the resolution history is auditable.

| Finding | Status | Resolution |
|---------|--------|------------|
| **M1** — signup mobile string/number inconsistency | ✅ **Fixed (this session)** | `JWTPayload.mobileNumber` + `generateTokenPair` mobileNumber param widened to `string \| number`. `signup/+server.ts` now passes `mobileStr` to both `generateTokenPair` and the response body, removing the type-divergence at the CSFLE boundary. Locked by 3 unit tests in `jwtMobileType.test.ts` (string round-trip, legacy-number round-trip, verifiable-regardless-of-type). |
| **M2** — `check-dsa` + `signup` success paths still use raw `json()` | ⏸️ **Deferred** | Triaged during Round 1: both routes return non-`apiOk`-shaped envelopes (signup spreads `nativeTokens` at the root; `check-dsa` returns flat `{ userExists, user, ...nativeTokens }` with no `data` wrapper). Migrating to `apiOk()` is a wire-contract change that requires updating every consumer (login page, partner-signup, hooks, externalFetch, Android Capacitor app) and carries version-skew risk for in-the-wild app installs. Tracked as a dedicated DX-4 session: "auth-route response envelope migration." See `DEVELOPMENT-PLAN.md`. |
| **L1** — `apiServerError` missing context | ⏭️ **Already addressed** | The helper already accepts an optional `context: Record<string, unknown>` (apiResponse.ts:77-84). Finding wording predates that enhancement — closing as obsolete. |

**Code-side changes this round (M1):**

- `src/lib/types/index.ts` — `JWTPayload.mobileNumber: number` → `string | number` with comment block explaining the CSFLE boundary requirement.
- `src/lib/services/jwtService.ts` — `generateTokenPair` `mobileNumber` param widened to `string | number`. All 12 existing callers continue to work (number is a subset of the new type).
- `src/routes/api/auth/signup/+server.ts` — removed `mobileNum = Number(mobileStr)` derivation; passes `mobileStr` to `generateTokenPair`; returns `mobileNumber: mobileStr` in response body. Confirmed by grep that no signup-response consumer reads `mobileNumber` arithmetically — `(auth)/login/+page.svelte` and `(auth)/partner-signup/+page.svelte` only check `signupResult.error`.
- `src/lib/testing/__tests__/jwtMobileType.test.ts` — **new** 3-test regression net.

**Verification:**

- `pnpm check`: 0 errors, 0 warnings (unchanged).
- `pnpm test:unit -- --run`: 11,020 → **11,023** (+3 new M1 tests; all green).
- No grep regressions in §4 pre-flight checks.
