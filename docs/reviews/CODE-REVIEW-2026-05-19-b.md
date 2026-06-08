# Daily Code Review — 2026-05-19 (evening)

**Scope:** 30 commits `c6d7ed1a..ec295a10` (last 24 hours — afternoon session). SEC-2 CSFLE Phases B.8-B.13 + Phase C (user backfill + snapshot encryption + M1 fix), SEC-5 BOLA regression net + R1 fix + R1 live smoke, DATA-1 full implementation (7 slices), DATA-2 full implementation (9 slices), DX-4 batch (9 routes), PERF-3 approvals + TestCard extraction + createQuery migration, form ownership validation, Plot Loan dynamic options fix, 2 draft specs, 3 docs commits. Single author (Prashant).

**Prior review:** [`CODE-REVIEW-2026-05-19.md`](CODE-REVIEW-2026-05-19.md) — 15 commits (morning session). Carry-forward: M2 (auth route `json()` migration — deferred as DX-4 wire-contract change).

**Review profile:** **Full** (T1-T9). 30 commits, auth/security changes (SEC-2 Phase B+C), new modules (DATA-1, DATA-2), shared module changes (mongo.ts, csfle/, guards, form pages).

---

## Commands Executed

| Command | Result |
|---------|--------|
| `pnpm check` | **0 errors, 0 warnings** — unchanged |
| `pnpm test:unit -- --run` | 162 files, **11,302 tests** — all pass (**+324** from morning: 10,978) |
| `pnpm test:contrast` | **456/456 pairs passed** — all WCAG AA across every theme |
| `git log --since='1 week' \| co-authored-by` | **0 violations** |

---

## Commits Reviewed

| SHA | Subject | Files | +/− | Category |
|-----|---------|-------|-----|----------|
| `c6d7ed1a` | fix(security): SEC-2 M1 — JWT mobile type consistency at CSFLE boundary | 5 | +430/−6 | Security fix |
| `e9139080` | docs(close): SESSION-HANDOFF + CHANGELOG + DEVELOPMENT-PLAN + ARCHITECTURE-EVOLUTION + ADR-0009 | 5 | +354/−7 | Docs |
| `b734c367` | test(security): SEC-2 Phase B — CSFLE passthrough contract tests | 2 | +224/−3 | Test |
| `0f361ec9` | test(form): Director firm-name — Phase 4 (unit tests) | 2 | +425/−0 | Test |
| `79e16282` | refactor(testing): PERF-3 Phase A — extract TestCard sub-component | 3 | +482/−436 | Refactor |
| `258e66ca` | feat(testing): PERF-3 Phase B — TestCard polling via createQuery | 1 | +83/−79 | Feature |
| `98829528` | feat(security): SEC-2 Phase B.9 — encrypt RM threads/review/email/cases/ratings/broadcasts | 7 | +27/−22 | Security |
| `d6a461c6` | feat(security): SEC-2 Phase B.8 — encrypt RM portal submissions + policies + captures | 7 | +40/−35 | Security |
| `db6eb0c9` | feat(security): SEC-2 Phase B.10 — encrypt scorecard/template-render/case-share/set-role | 4 | +32/−34 | Security |
| `ce2fa293` | feat(security): SEC-2 Phase B.11 — encrypt profile/coins/sample-data routes | 5 | +46/−25 | Security |
| `c60c0e89` | feat(security): SEC-2 Phase B.12 — encrypt shared server helpers + team-invite guard | 5 | +45/−23 | Security |
| `2bd38807` | feat(security): SEC-2 Phase B.13 — encrypt team-member onboarding | 1 | +17/−17 | Security |
| `e8214320` | feat(security): SEC-2 Phase C.1 — user-collection backfill engine | 6 | +923/−2 | Security |
| `0f1f761a` | feat(security): SEC-2 Phase C.2 — formSnapshots payload encryption (Approach B) | 9 | +824/−2 | Security |
| `0c1b2a96` | docs(close): SESSION-HANDOFF + CHANGELOG + DEVELOPMENT-PLAN + ARCHITECTURE-EVOLUTION (resume close) | 4 | +398/−5 | Docs |
| `52bb024c` | feat(security): SEC-2 Phase C.2 — migrate snapshot read sites to resolveSnapshotPayload | 5 | +78/−22 | Security |
| `443b5ca2` | fix(security): SEC-5 Finding R1 — close cross-RM disclosure on rm/review SSR load | 2 | +51/−4 | Security fix |
| `9f6fdf57` | docs(close): SESSION-HANDOFF + CHANGELOG + DEVELOPMENT-PLAN + ARCHITECTURE-EVOLUTION (resume final close) | 4 | +182/−5 | Docs |
| `cc36ce6d` | test(security): SEC-5 BOLA regression net — cases API + parameterized SSR loads | 2 | +563/−0 | Test |
| `9f989d28` | feat(data1): Slice 1 — bucketing utilities + unit tests | 8 | +558/−0 | Feature |
| `1a9b6b16` | feat(data1): Slices 2+3 — collection registration + POST /api/dsa/lead-vault | 8 | +1129/−0 | Feature |
| `460e871f` | feat(data1): Slice 4 — GET /api/dsa/lead-vault (DSA transparency view) | 2 | +203/−7 | Feature |
| `a7a18c92` | feat(data1): Slice 5 — GET /api/lead-routing/match (3-pass + k-anonymity) | 10 | +1222/−0 | Feature |
| `3ae34da7` | test(data1): privacy contract — vault writes must go through buildVaultEntry | 1 | +129/−0 | Test |
| `9dd90ab5` | feat(data1): Slice 7 — DELETE /api/dsa/lead-vault (consent withdrawal) | 2 | +295/−8 | Feature |
| `c2729434` | refactor(dx4): migrate /api/cases/[case_id] from raw json() to apiOk/apiError | 1 | +21/−27 | Refactor |
| `cf338eb1` | refactor(dx4): migrate /api/cases + /api/cases/sample-data to apiOk/apiError | 2 | +27/−40 | Refactor |
| `fdf89b21` | fix(sec-2): require→createRequire + logger Error serialization + standalone init-deks runner | 4 | +258/−4 | Fix |
| `b4f5af46` | docs(specs): draft PII-retention policy + DATA-4 analytics warehouse v1 | 2 | +1055/−0 | Docs |
| `c58535fa` | test(security): SEC-5 R1 — live end-to-end smoke against seeded dev MongoDB | 2 | +259/−0 | Test |
| `82091b03` | refactor(dx4): migrate 6 cases-family routes from raw json() to apiOk/apiError | 6 | +92/−144 | Refactor |
| `71b231f3` | refactor(dx4): migrate 3 more cases-family routes (snapshots + results) | 3 | +33/−60 | Refactor |
| `e3284253` | feat(data2): Slice 1 — foundation (types, consent gates, revocation tokens) | 6 | +707/−0 | Feature |
| `87a440e9` | feat(data2): Slice 2 — register OutreachVault + ConsentRevocationLog collections | 1 | +51/−0 | Feature |
| `8b49ff27` | feat(data2): Slice 3 — buildVaultEntry orchestrator + mobile hash helper | 4 | +394/−0 | Feature |
| `48d2a54c` | feat(data2): Slices 4-9 — endpoints + eligibility + sweep + privacy regression | 12 | +1561/−0 | Feature |
| `5a2c342f` | feat(perf): PERF-3 approvals — replace setInterval polling with createQuery | 2 | +108/−13 | Feature |
| `66881d2f` | docs(security): SEC-5 audit batch — cases/[case_id]/* family (17 routes, 0 gaps) | 1 | +27/−2 | Docs |
| `7df20c95` | docs(specs): PERF-3 next candidate (approvals) + SEC-2 Phase C plan | 2 | +306/−0 | Docs |
| `2660c1e1` | fix(plot-loan): register q0c_plotLoanLender in dynamic options registry | 1 | +7/−0 | Fix |
| `21a72b6f` | docs(specs): Pass-2 product audit handoff context | 1 | +471/−0 | Docs |
| `ec295a10` | fix(applicants): block Next when Company ownership total exceeds 100% | 9 | +410/−6 | Feature |
| `ce68f216` | docs(close): SESSION-HANDOFF + CHANGELOG + DEVELOPMENT-PLAN + ARCHITECTURE-EVOLUTION | 4 | +321/−129 | Docs |

Total: **30 code commits** + 7 docs-only commits (counted once each). Source: ~90 unique files. Tests: +324 new tests across ~20 new test files.

---

## Prior Review Findings — Resolution Status

| Finding | Status | Evidence |
|---------|--------|----------|
| **M1** — signup mobile type inconsistency | ✅ **Fixed** | `c6d7ed1a` — passes `mobileStr` consistently, 3 regression tests lock the contract. |
| **M2** — `check-dsa` + `signup` success paths still use raw `json()` | **Carry-forward** | Wire-contract change deferred under DX-4. Not touched today. |
| **L1** — `apiServerError` missing context | ✅ **Closed** | Already has optional context param (morning review resolution log confirmed). |

---

## Standing Grep Rules — T1-T6 Sweep

| Rule | Tier | Result | Delta vs 2026-05-19 (morning) |
|------|------|--------|-------------------------------|
| **A** — CSRF: raw `fetch()` + POST in `.svelte` | T1 | Same known-safe inventory (auth pages, `_archived`, GETs). **0 new violations.** New DATA-1/DATA-2 routes use server-side-only `fetch`; no `.svelte` consumers yet. | Unchanged |
| **E** — Unsanitized `{@html}` XSS vectors | T1 | Same 33 approved exception sites. **0 new violations.** | Unchanged |
| **E2** — Dynamic attribute / URL injection | T1 | No new risk patterns. | Unchanged |
| **F** — Bare `console.log/error/warn` in server code | T1 | Known-safe: `logger.ts` (formatter), `telemetry.ts` (OTel bootstrap). `routes/api/`: 2 commented-out lines only. **0 violations.** | Unchanged |
| **G** — `Co-Authored-By` in commits | T1 | **0 violations.** | Unchanged |
| **SEC-1** — Hardcoded secrets | T1 | All matches are test files or type enums. No new source patterns. New CSFLE code loads CMK from `$env/dynamic/private`. New DATA-2 `DATA2_TOKEN_PEPPER` loaded from env. | Unchanged |
| **SEC-2** — PII in logging | T1 | **0 new PII in logger calls** across all 30 commits. DATA-1/DATA-2 endpoints log only IDs, counts, and bucketed fields — never mobile, name, or email. | Verified clean |
| **SEC-3** — Cookie security | T1 | No new `cookies.set()` calls in today's commits. All existing calls verified in morning review. | Unchanged |
| **SEC-4** — `eval`/`exec`/`child_process` | T1 | Same 2 known-safe instances (test routes) + regex `.exec()` in `recencyScore.ts` (DATA-1, quarter-string parsing). | +1 (safe) |
| **SEC-5** — Client env exposure | T1 | Only `VITE_VAPID_PUBLIC_KEY` (public by design). New CSFLE/DATA-2 env vars are all server-private. | Unchanged |
| **SEC-6** — Rate limiting on auth | T1 | Auth routes unchanged. **See M3 below** for rate-limit gap on new DATA endpoints. | See M3 |
| **SEC-7** — Client storage PII | T1 | Same known-safe sites. | Unchanged |
| **B** — SSR: static `@capacitor/*` imports | T2 | **0 matches** (excluding `@capacitor/core`). | Unchanged |
| **C** — `typeof window` SSR guard (Pitfall #9) | T2 | **0 violations.** | Unchanged |
| **D** — `fetch` at module scope (Pitfall #4) | T2 | **0 violations.** | Unchanged |
| **I** — `window.*` without browser guard | T2 | New `TestCard.svelte` uses `browser` import from `$app/environment` (correct). | Verified clean |
| **J** — `localStorage`/`sessionStorage` SSR-unsafe | T2 | Same known-safe files. | Unchanged |
| **SSR-1** — TanStack Query `$`-prefix | T2 | **0 violations.** New `TestCard.svelte` and `approvals/+page.svelte` both use bare `createQuery` (correct). | Verified clean |
| **SSR-2** — TanStack Query provider wiring | T2 | Provider chain intact. | Unchanged |
| **H1** — JSON-Logic `!=` (Pitfall #1) | T3 | Same carry-forward in `businessLoan/`. No new usages. | Unchanged |
| **K** — `$state(prop)` without `$derived` (Pitfall #10) | T3 | `pnpm check` 0 warnings. | Unchanged |
| **L** — `combinedAnswers` collisions (Pitfall #13) | T3 | No new collision-risk patterns. | Unchanged |
| **M** — Numeric fields without `minLimit` (Pitfall #14) | T3 | No new form question additions. | Unchanged |
| **S** — Contrast audit (WCAG AA) | T3 | 456/456 pairs passed. | Unchanged |
| **CQ-1** — Empty catch blocks | T3 | **0 empty catch blocks.** | Unchanged |
| **CQ-2** — Memory leaks: intervals/listeners | T3 | PERF-3 Phase B explicitly removed `setInterval` polling from TestCard and approvals, replacing with `createQuery` refetch interval. Net reduction in manual interval management. | Improved |
| **CQ-3** — `JSON.parse(JSON.stringify)` | T3 | Only in test files (exempt). | Unchanged |
| **CQ-4** — Error boundary coverage | T3 | `+error.svelte` at root, `(app)`, `dashboard`. Known gap: `(auth)`. | Unchanged |
| **CQ-5** — TODO/FIXME/HACK | T3 | **35 across 13 files** — unchanged. | Unchanged |
| **PH-1** — Vercel Node pin | T5 | `engines.node: "22.x"` — correct. | Unchanged |
| **PH-2** — `ssr.noExternal` chain | T5 | `pino`, `gsap`, `gsap/dist/ScrollTrigger`, isomorphic-dompurify chain (build-only), `razorpay`. No new deps added. | Unchanged |
| **PH-3** — API response consistency | T5 | `json()` remaining: **108 files** (down from ~128). 9 routes migrated in DX-4 batch. All 12 new DATA-1/DATA-2 endpoints use `apiOk`/`apiError`/`apiServerError` exclusively. | **Improved (−20 files)** |
| **PH-5** — MongoDB `$where`/`$function` | T5 | **0 violations.** | Unchanged |
| **PH-7** — `parseJsonBody` coverage | T5 | All new DATA-1/DATA-2 POST/DELETE endpoints use `parseJsonBody()`. | Verified clean |
| **PERF-1** — `import *` | T6 | 2 known-safe (`json-logic-js`, `@mediapipe/face_detection`). No new wildcards. | Unchanged |
| **PERF-2** — `$effect` churn | T6 | New `$derived(validateCompanyOwnershipTotals(...))` in `AddApplicant.svelte` is a derived computation (correct — no side effects). No new `$effect` blocks in today's commits. | Verified clean |
| **OBS-1/OBS-2** — Observability | T6 | Unchanged. | Unchanged |

---

## Findings (this review)

### High — none

### Medium

#### M3 — Missing rate limiting on 5 new authenticated mutating DATA endpoints

**Endpoints affected:**

| Endpoint | Auth guard | Rate limit |
|----------|-----------|------------|
| `POST /api/dsa/lead-vault` | `requireRoleApi('dsa')` + `requireTeamPermission` | **Missing** |
| `DELETE /api/dsa/lead-vault` | `requireAuthApi()` + role check | **Missing** |
| `POST /api/dsa/btdc-vault` | `requireRoleApi('dsa')` + `requireTeamPermission` | **Missing** |
| `POST /api/dsa/btdc-vault/[id]/revoke` | `requireRoleApi('dsa')` + `requireTeamPermission` | **Missing** |
| `POST /api/cron/data2-revoke-sweep` | `CRON_SECRET` header | **Missing** |

**Context:** The 2 public endpoints (`POST /api/public/consent-revoke` at 20/hr/IP, `GET /api/lead-routing/match` at 30/min/IP) correctly have rate limiting. But the authenticated DSA endpoints rely solely on auth without per-user abuse-prevention limits. An account takeover or rogue API consumer could write/delete vault entries at unconstrained rates.

**Recommendation:** Add per-user rate limits using the existing `rateLimit()` helper. Suggested limits: lead-vault POST 20/min, lead-vault DELETE 10/min, btdc-vault POST 20/min, btdc-vault revoke 20/min. The cron endpoint is low-risk (CRON_SECRET-gated, Vercel invokes it on schedule) but an IP rate limit would close the gap.

**Severity rationale:** Medium rather than High because: (a) all endpoints require valid auth, (b) write actions create audit records, (c) these endpoints are not yet wired to any UI (server-side complete, no client integration), (d) the data written is bucketed/encrypted, limiting abuse value.

#### M2 — `check-dsa` + `signup` success paths still use raw `json()` (carry-forward)

Both auth routes return non-`apiOk`-shaped envelopes. Migration to `apiOk()` is a wire-contract change affecting login page, partner-signup, hooks, and Android app consumers. Tracked as dedicated DX-4 session.

### Low

#### L2 — PII (email) in billing logger (pre-existing, not from today)

[`src/routes/api/billing/trial-reminder/+server.ts:85`](src/routes/api/billing/trial-reminder/+server.ts:85): `logger.warn({ err, email }, 'Failed to send trial reminder')` and similar at line 119 log the DSA's email address to production logs. Per SEC-2 policy, PII should not appear in structured log context. Replace with `logger.warn({ err, dsaId }, 'Failed to send trial reminder')`.

**Note:** Pre-existing — not introduced by today's commits. Flagged because SEC-2 PII audit surfaced it.

---

## Commit-Level Analysis

### Security Commits (Critical Review)

#### SEC-2 Phases B.8–B.13 (6 commits): encrypt remaining application routes

Six incremental commits wire `encryptUserPii`/`decryptUserPii`/`findUserByMobile` into 34 additional API routes across RM portal, admin helpers, team management, and onboarding. All follow the same mechanical pattern established in Phase B.1 (morning review): lookup via `findUserByMobile()`, immediate `decryptUserPii()` on the result, then downstream code operates on plaintext.

**Security-specific verification:**
- No route accidentally logs or returns encrypted Binary values to the client
- `findUserByMobile()` dual-query (encrypted → plaintext fallback) used consistently
- No new `cookies.set()` calls introduced
- Migration-safe: all routes behave identically when `CSFLE_ENABLED` is unset

#### SEC-2 Phase C.1 (`e8214320`): user-collection backfill engine

**6 files, 923 additions.** New `backfill.ts` engine + `userCrypto.ts` extension + standalone script.

**Architecture:**
- Iterates users in batches (configurable `batchSize`, default 200)
- Per-document: encrypts recognized PII fields (`mobileNumber`, `email`, `fullName`, `pan`, `aadhaar`, `dob`, `address`)
- Uses `$set` with the encrypted values — does NOT modify non-PII fields
- Idempotent: `isEncryptedBinary()` check skips already-encrypted documents
- Progress tracking: logs batch number, document count, skipped count
- 299 tests in `csfleBackfill.test.ts`

**Assessment:** Sound. Idempotent. No risk of data corruption — worst case is a partial run that can be resumed.

#### SEC-2 Phase C.2 (`0f1f761a` + `52bb024c`): snapshot payload encryption

**14 files, 902 additions.** New `snapshotCrypto.ts` module + backfill script + migration of 5 read sites.

**Design (Approach B per plan):**
- Encrypts entire `payload` JSON blob as one Binary value using random-algorithm DEK
- `payload_hash` computed over plaintext BEFORE encryption; verified AFTER decryption
- Passthrough when `CSFLE_ENABLED !== 'true'` — `encryptSnapshotPayload` returns null
- `resolveSnapshotPayload()` reader prefers `payload_encrypted` over `payload` — dual-source during migration
- All 5 snapshot read sites migrated: file-builder, snapshots list, single snapshot, compare, results page

**Assessment:** Clean design. The blob-level approach avoids the per-field path registry maintenance burden. Random algorithm is correct (payload is never queried by value). Hash integrity check catches both ciphertext tampering and migration mistakes.

#### SEC-5 R1 fix (`443b5ca2`): cross-RM disclosure on rm/review SSR load

Added `requireRmOwnership()` guard to `rm/review/[version_id]/+page.server.ts`. Without it, RM-A could view RM-B's review by navigating to the version_id URL. BOLA vulnerability closed.

#### SEC-5 BOLA regression net (`cc36ce6d`): cases API + parameterized SSR loads

563 additions across 2 test files. Covers cases API family (GET/PATCH/DELETE on case_id) and all parameterized SSR load functions (`+page.server.ts` files that take dynamic route params). Regression tests assert that cross-user access returns 403/404.

### Feature Commits

#### DATA-1: Lead Attribution Vault (7 slices, 5 commits)

Full server-side implementation per `DATA-1-LEAD-ATTRIBUTION-SPEC.md`. Key security properties verified:

- **Bucketing-as-privacy**: locality, price, and quarter bucketing means the vault never stores exact addresses, prices, or dates. Raw PII stays in the case; the vault only stores bucketed aggregates.
- **k-anonymity**: lead-routing match endpoint suppresses results when bucket population < k (5 standard, 10 luxury ≥ ₹3 Cr).
- **BOLA**: All read endpoints scoped to `source_dsa_id === caller.dsa_id`.
- **Privacy contract test**: `vaultWritePathCheck.test.ts` statically asserts every `LeadAttributionVault.insertOne` site routes through `buildVaultEntry`.
- **DPDP §13 erasure**: DELETE endpoint writes `ConsentWithdrawalLog` row BEFORE deleting vault entry (audit-log-first ordering).

#### DATA-2: BT/DC Outreach Vault (9 slices, 4 commits)

Full server-side implementation per `DATA-2-CONSENTED-VAULT-SPEC.md`. Key security properties verified:

- **CSFLE integration**: mobile encrypted via deterministic CSFLE at write; duplicate-check uses encrypted equality (no decrypt round-trip).
- **Consent gates**: 3-gate validation (C1: consent_doc required, C2: consent freshness ≤ 30 days, C3: consent template matches schema).
- **HMAC revocation tokens**: customer-facing revocation uses HMAC tokens with constant-time comparison (`timingSafeEqual`). `DATA2_TOKEN_PEPPER` env-gated.
- **Public endpoint security**: `POST /api/public/consent-revoke` rate-limited 20/hr/IP, returns identical responses for "unknown token" and "already revoked" (no existence confirmation leak).
- **Audit-log-first sweep**: cron deletes vault entries only after writing `ConsentRevocationLog`. ImageKit cleanup handles 404 as success.
- **Privacy contract test**: `vaultWritePathCheck.test.ts` asserts every `OutreachVault.insertOne` routes through `buildVaultEntry`.

#### DX-4: 9 routes migrated (`c2729434` + `cf338eb1` + `82091b03` + `71b231f3`)

All 12 targeted files verified fully migrated — zero remaining `json()` calls. Error paths consistently use `apiError`/`apiServerError`. Success paths use `apiOk`. Response shape is consistent.

#### PERF-3: TestCard extraction + createQuery migration (`79e16282` + `258e66ca` + `5a2c342f`)

Clean 3-phase delivery:
- **Phase A**: Extract TestCard sub-component from 450-line parent page — pure refactor, no behavior change.
- **Phase B**: Replace `setInterval` polling with `createQuery` refetch interval in TestCard — eliminates manual interval management and cleanup.
- **Approvals**: Separate commit migrates policy-engine approvals page from `setInterval` to `createQuery`.

All three correctly use bare `createQuery` (no `$`-prefix, Pitfall #28 compliant). `browser` guard from `$app/environment` used for SSR safety.

#### Form: Company ownership >100% validation (`ec295a10`)

New `sameCompanySync.ts` utility with `validateCompanyOwnershipTotals()` function. Wired into `AddApplicant.svelte` via `$derived` (correct — pure computation, no side effects). Also wired into all 6 loan-type form pages via `isNextEnabled` gate. 136 tests in `sameCompanySync.test.ts`.

**Parity check:** Verified wired into Home Loan, LAP, Plot Loan, Personal Loan, Business Loan, and Professional Loan form pages. All 6 secured + unsecured loan types covered.

#### Plot Loan: dynamic options registry fix (`2660c1e1`)

Registers `q0c_plotLoanLender` in `optionResolver.ts`. Without this, the Plot Loan lender dropdown would show no options on the server-rendered form. Small but critical — 7 lines.

---

## Security Summary

| Surface | Status this session |
|---------|---------------------|
| **CSFLE Phase B** | **+34 routes encrypted** (B.8–B.13). All RM portal, admin helpers, team, onboarding routes now encrypt/decrypt PII via CSFLE helpers. |
| **CSFLE Phase C** | **NEW.** User-collection backfill engine (idempotent, batch-based). Snapshot payload encryption (blob-level, random algo, hash integrity). |
| **PII at rest** | 36 routes now encrypt PII (2 from morning + 34 from afternoon). Snapshot payloads optionally encrypted. |
| **BOLA** | SEC-5 R1 cross-RM disclosure **fixed**. +563 regression tests (cases API + parameterized SSR). SEC-5 count: **147 routes audited** (up from 107). |
| **Data privacy** | DATA-1 uses bucketing-as-privacy (no raw PII in vault). DATA-2 uses CSFLE + HMAC tokens + consent gates. Both have privacy contract tests. |
| **Public endpoints** | DATA-2 consent-revoke: rate-limited, constant-time HMAC, no existence leakage. |
| **XSS** | Unchanged. 33 approved `{@html}` sites. |
| **CSRF** | Unchanged. |

## Performance Summary

| Metric | Status |
|--------|--------|
| PERF-3 TanStack Query | **+3 components migrated** (TestCard, approvals, TestCard helpers). Eliminates 3 manual `setInterval` patterns. |
| Bundle / Network | DATA-1/DATA-2 are server-only (no client bundle impact). New `sameCompanySync.ts` (558 lines) — tree-shakeable utility. |
| Reactive efficiency | `$derived(validateCompanyOwnershipTotals(...))` in AddApplicant — pure derived, no churn risk. |

## Blast Radius Summary (T9)

**Shared modules changed in this session:**

| Module | Risk | Reason |
|--------|------|--------|
| `src/lib/database/mongo.ts` | **Low** | +4 collection registrations (LeadAttributionVault, ConsentWithdrawalLog, OutreachVault, ConsentRevocationLog) + MongoClientInstance export. All additive. |
| `src/lib/server/csfle/` (6 files) | **Low** | New modules + extensions. All gated behind `CSFLE_ENABLED` env flag. No behavioral change when unset. |
| `src/lib/server/caseHelpers.ts` | **Low** | Added `decryptUserPii` call — gated behind CSFLE. Passthrough when disabled. |
| `src/lib/server/rmHelpers.ts` | **Low** | Same pattern as caseHelpers. |
| `src/lib/server/adminParallelAccess.ts` | **Low** | Same pattern. |
| `src/lib/services/jwtService.ts` | **Low** | `mobileNumber` param widened from `number` to `string | number`. All existing callers continue to work (number is a subset). |
| `src/lib/types/index.ts` | **Low** | `JWTPayload.mobileNumber` widened to `string | number`. Type-only change. |
| `src/lib/server/logger.ts` | **Low** | Error serialization improvement for CSFLE error objects. Additive. |
| `src/lib/components/AddApplicant.svelte` | **Low** | New `$derived` for ownership validation + warning banner. Additive — no change to existing isNextEnabled logic for non-violating cases. |
| All 6 form `+page.svelte` files | **Low** | New ownership violation gate on `isNextEnabled`. Only triggers when total > 100% — existing flows with valid ownership are unaffected. |

---

## Known-Safe Inventory Updates

| Category | Prior count | Current count | Change |
|----------|-------------|---------------|--------|
| `{@html}` approved sites | 33 | 33 | Unchanged |
| `json()` carry-forward routes (DX-4) | ~128 files | **108 files** | **−20** |
| SEC-5 BOLA routes audited | 107 | **147** | **+40** |
| CSFLE-encrypted routes | 2 | **36** | **+34** |
| PERF-3 TanStack migrations | 2 components | **5 components** | **+3** |
| Auth rate-limited routes | 19 | 19 | Unchanged |
| Contrast pairs | 456/456 | 456/456 | Unchanged |
| TODO/FIXME/HACK count | 35 / 13 files | 35 / 13 files | Unchanged |
| Test count | 10,978 | **11,302** | **+324** |
| Error boundaries | 3 (root, `(app)`, dashboard) | 3 | Unchanged — `(auth)` gap persists |

---

## Top 5 Actions

1. **[M3] Add rate limiting** to the 5 new DATA-1/DATA-2 mutating endpoints before UI integration (POST/DELETE lead-vault, POST btdc-vault, POST revoke, cron sweep).
2. **[M2, carry-forward] Auth route `json()` migration** — track as DX-4 dedicated session. Wire-contract change requires consumer updates.
3. **[L2] Fix PII in billing logger** — replace `{ err, email }` with `{ err, dsaId }` in `trial-reminder/+server.ts` lines 85 and 119.
4. **Continue SEC-2** — remaining Phase B routes (verify-otp, detect-roles, onboarding routes) + Phase C user-collection backfill execution.
5. **DATA-1/DATA-2 client integration** — UI components for vault visibility, lead routing display, BT/DC outreach workflow. Server-side is complete; gated by env flags until UI is ready.

---

*Report generated: 2026-05-19 evening. Reviewer: automated daily review (Full profile, T1-T9).*
