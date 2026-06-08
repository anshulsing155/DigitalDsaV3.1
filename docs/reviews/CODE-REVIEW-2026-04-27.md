# Daily Code Review — 2026-04-27 (Comprehensive 4-Day Sweep)

**Scope:** All commits 2026-04-23 → 2026-04-27 (4-day window). Consolidates findings from prior daily reviews 2026-04-25 / 2026-04-26 plus a deep review of the latest pushed commit `5d749020`. Includes one **new Critical finding** in the latest commit.

**Standing grep rules (Rules A–D):** All 4 executed. Rules B, C, D clean (no matches). Rule A: same known-safe inventory as 2026-04-26 review (auth pre-session, GET, archived). One regression: new GET `await fetch` calls in `personal-loan` and `business-loan` pages added by `5d749020` are snapshot loaders (GET) — safe.

---

## Commits Reviewed (last 4 days, newest first)

| Commit | Author | Subject | Verdict |
|--------|--------|---------|---------|
| `5d749020` | Prashant | feat(form): wire applicantProfilePage for personal + business loan | **Critical bug found** — see Critical #NEW |
| `0c4ffcfa` | Prashant | fix(nav): goto() in 5 non-auth navigations | Clean |
| `6ea8d3e3` | Prashant | test(pms): unit tests for keyRegistry | Clean |
| `1b702bea` | Prashant | feat(admin): Registry Health link | Clean |
| `a1c09e7a` | Prashant | feat(pms): Phase 11 — form key lifecycle | **Critical #4 + 4 High** (carry from 04-26) |
| `8f058116` | Prashant | fix(ux): goto() in RM policy detail | Clean |
| `ffa894c9` | Prashant | feat(pms): Phase 9 — DSA suggestion flow | **Critical #2 + #3 + 3 High** (carry from 04-26) |
| `4ebb955a` | Prashant | fix(rule-engine): per-lender PL rate | **Medium #3** (carry from 04-26) |
| `da94c863` | Prashant | fix(ux): goto() in admin policy detail | **Medium #2** (carry from 04-26 indentation) |
| `71477192` | Prashant | feat(results): affordability overview banner | Clean |
| `5ee57dce` | Prashant | feat(pms): Phase 7 JSON Editor | **Critical #1 + 3 High** (carry from 04-26) |
| `46535f24` | Prashant | fix(pms/security): OTP hardening | Clean |
| `a7adc7b3` | tech@digitaldsa | batch 7 final CSRF + Pitfall #9 sweep | Clean |
| `ee149db7` | tech@digitaldsa | batch 6b window.* sweep | Clean |
| `21939913` | tech@digitaldsa | batch 6 CSRF + Pitfall #9 sweep | Clean |
| `228128a1` | tech@digitaldsa | batch 5 env validation + ENV-VARIABLES.md | Clean |
| `edee3ae8` | tech@digitaldsa | batch 3b window.* guard | Clean |
| `ce8ea9e6` | tech@digitaldsa | batch 3 navigation/parse-error/timeout | Clean |
| `2ae789c7` | tech@digitaldsa | batch 2 role guards + reactivity | Clean |
| `dc5373c2` | tech@digitaldsa | batch 1 secureFetch sweep across dashboards | Clean |
| `1c252121` | Prashant | feat(ux): themed unsaved-nav modal | Clean |
| `ad072166` | Prashant | fix(ssr): broken `typeof window` → `$page.url` (6 form pages) | Clean — fixes Pitfall #9 |
| `5402aa1b` | **Mrityunjay** (teammate) | merge branch | Clean (merge only) |
| `dd4ffa4c` | **Mrityunjay** (teammate) | Add "Floor" to municipal compliance showWhen | Logically correct, **Low #2** (mixed quotes) |
| `bc6e08cf` | Prashant | docs: capture S94 thenable-proxy trap in CLAUDE.md | Clean |
| `2ff2d747` | Prashant | fix(capacitor): wrap Preferences in envelope | Clean — fixes Pitfall #8 |
| `03525995` | Prashant | fix(sweep): Capacitor lazy + reload→invalidateAll | Clean |
| `5476c119` | Prashant | fix(pms/security): address 2026-04-25 findings | Clean (remediation) |

---

## NEW — Critical Finding (today's commit `5d749020`)

### Critical #NEW — DC Personal Loan: Profile page Next button stuck (confidence: 90)

**Files:**
- [`ApplicantProfilePage.svelte:538-558`](src/lib/components/ApplicantProfilePage.svelte:538) — auto-fill `$effect`
- [`ApplicantProfilePage.svelte:560-598`](src/lib/components/ApplicantProfilePage.svelte:560) — completion check
- [`personalLoan/pages.ts:8-9, 133-145`](src/lib/config/personalLoan/pages.ts:8) — DC flow ordering

**The bug:** Personal Loan DC flow (loanType "Debt Consolidation" or "DC with Extra Funds", single non-NRI Individual) cannot advance past the new Profile page.

**Mechanism:**
1. DC visible page order is `LoanReq → Applicant → **Profile** → Income → Credit → Obligations → **LocationDC**`. Profile renders BEFORE LocationDC.
2. Auto-fill `$effect` reads `residenceStateName`/`residenceCityName` from case-level loan data. In DC flow at the Profile step, both are empty.
3. The `$effect` early-returns: `if (!anchorState || !anchorCity) return;` — silent bail-out, leaves `applicantResidencePattern`/`applicantResidenceState`/`applicantResidenceCity` unset.
4. The residence-pattern UI is hidden for Personal Loan non-NRI (`isPersonalLoan && !isNRI`) — user has no manual escape.
5. Completion check at line 571: `if (a.isNRI !== 'Yes' && !a.applicantResidencePattern) return false;` — fails. Next button disabled forever.

**No pre-fill mechanism rescues DC**: `applicantsBin` restore only restores applicant-level fields, not loan-level location answers. No recovery path pre-populates `residenceStateName`.

**Affected paths:** DC + DC-with-Extra-Funds Personal Loan, single Individual applicant, non-NRI. Probably 100% of DC PL flows once this commit ships.

**Fix options (pick one):**
- **A (preferred):** In DC flow, place `applicantProfilePage` AFTER `locationPageDC` instead of before. Update `getAllPages()` ordering and the showWhen gates accordingly.
- **B:** Auto-fill `applicantResidencePattern = 'SAME_CITY'` even when anchor data is missing, so the completion check passes; rely on LocationDC to set state/city later, and add an `$effect` that re-syncs the per-applicant residence fields when `residenceStateName`/`residenceCityName` change.
- **C:** Don't hide the residence question when anchor data is missing — fall back to manual fill.

**Verification gap:** Commit message says "10,192 tests passing" but no test exercises the DC Personal Loan flow's Profile page. Add a unit test or e2e to prevent regression.

---

## Carry-Forward Critical Findings (from 2026-04-26)

### Critical #1 — JSON Editor: `lockVersion` parsed but never enforced

**File:** [`admin-json-edit/+server.ts:127-130`](src/routes/api/pms/policies/[id]/admin-json-edit/+server.ts:127), [`policyService.ts:adminJsonEditPolicy`](src/lib/server/pms/policyService.ts)

Two admins can both load the same published policy, both submit edits, and the second silently overwrites the first. Every other PMS write path gates on `lockVersion` — only this one doesn't. Source commit `5ee57dce`.

### Critical #2 — Suggestion dedup index missing `unique: true`

**File:** [`mongo.ts:718-720`](src/lib/database/mongo.ts:718)

```ts
await PolicySuggestions.createIndex(
    { lenderId: 1, loanProduct: 1, fieldPath: 1, submittedBy: 1 },
    { sparse: true }  // ← no unique: true
);
```

Comment says "one suggestion per DSA per field per lender per month" but the index doesn't enforce uniqueness. POST handler's `code === 11000` catch is dead code. Source commit `ffa894c9`.

### Critical #3 — RM can resolve/read suggestions for any lender (API auth bypass)

**Files:**
- [`suggestions/[id]/+server.ts:16-62`](src/routes/api/pms/suggestions/[id]/+server.ts:16) — PATCH
- [`suggestions/+server.ts:37-47`](src/routes/api/pms/suggestions/+server.ts:37) — GET

Both endpoints check `requireRoleApi(locals, ['rm', 'admin'])` but don't verify RM-to-lender assignment. UI loader checks assignment correctly, but API is wide open — any RM can hit endpoints directly with arbitrary `lenderId`. Source commit `ffa894c9`.

### Critical #4 — Registry health checker reads non-existent fields

**File:** [`registryIntegrityChecker.ts:133,139`](src/lib/server/pms/registryIntegrityChecker.ts:133)

Projection requests `intendedKeyPath` (doesn't exist; type has `proposedKeyPath`) and `addedAt` (doesn't exist; type has `createdAt`). Result: `futureQueueReady` is always `[]`, "ready to encode" detection silently broken. `new Date(undefined)` produces `Invalid Date`. Source commit `a1c09e7a`.

### Critical #5 — Missing Zod validation in PMS-to-Engine adapter (4th consecutive review)

**File:** [`pmsToEngineAdapter.ts:11`](src/lib/server/pms/pmsToEngineAdapter.ts:11)

File header still references `validateAdapterOutput` which does not exist. No runtime validation on adapter output. Malformed PMS `foir.salaried` stored as string `"50"` produces `NaN` from `/100` division → silent eligibility errors. **Highest debt item in the codebase. Carry-forwarded for 4 consecutive reviews.**

---

## High Findings (Open)

| # | Finding | File | Source |
|---|---------|------|--------|
| H1 | No rate limit on JSON Editor POST | [`admin-json-edit/+server.ts`](src/routes/api/pms/policies/[id]/admin-json-edit/+server.ts) | `5ee57dce` |
| H2 | No rate limit on suggestion POST | [`suggestions/+server.ts:80`](src/routes/api/pms/suggestions/+server.ts:80) | `ffa894c9` |
| H3 | `lockVersion` not Zod-validated (only TS-cast) | [`admin-json-edit/+server.ts:127`](src/routes/api/pms/policies/[id]/admin-json-edit/+server.ts:127) | `5ee57dce` |
| H4 | `currentValue`/`suggestedValue` stored without type/size limit | [`suggestions/+server.ts:106`](src/routes/api/pms/suggestions/+server.ts:106) | `ffa894c9` |
| H5 | CI gate script (`check-registry-integrity.cjs`) not wired into CI or `package.json` | [`scripts/check-registry-integrity.cjs`](scripts/check-registry-integrity.cjs) | `a1c09e7a` |
| H6 | CI Rule B will fail for 4 keys (`onProperty`, `onEMI`, `isDefaulter`, `relationshipType`) when wired | [`scripts/check-registry-integrity.cjs:127`](scripts/check-registry-integrity.cjs:127) | `a1c09e7a` |
| H7 | `isDefaulter` declared `type: 'boolean'` but actual value is `'Yes'`/`'No'` string | [`keyRegistry.ts:201`](src/lib/config/pms/keyRegistry.ts:201) | `a1c09e7a` |

---

## Medium Findings (Open)

| # | Finding | File | Source |
|---|---------|------|--------|
| M1 | JSON Editor per-keystroke double-parse of original snapshot | [`json-editor/+page.svelte:21`](src/routes/dashboard/admin/policies/pms/[policyId]/json-editor/+page.svelte:21) | `5ee57dce` |
| M2 | Indentation broken on import line (column 0 instead of tab) | [`[policyId]/+page.svelte:5`](src/routes/dashboard/admin/policies/pms/[policyId]/+page.svelte:5) | `da94c863` |
| M3 | `ev.classification as LenderClassification` without `?? 'PVT'` fallback | [`discomfortAnalyzer.ts:432`](src/lib/ruleEngine/discomfortAnalyzer.ts:432) | `4ebb955a` |
| M4 | Suggestion display: hardcoded `"..."` wraps `dsaNote` (doubles when note starts/ends with quote) | [`suggestions/+page.svelte:172`](src/routes/dashboard/rm/policies/[lenderId]/[product]/suggestions/+page.svelte:172) | `ffa894c9` |
| M5 | CI script `countChangelogEntries()` defined but never called (dead code) | [`scripts/check-registry-integrity.cjs:157`](scripts/check-registry-integrity.cjs:157) | `a1c09e7a` |
| M6 | Registry health UI `rerun()` fires the health check twice per click | [`registry-health/+page.svelte:13`](src/routes/dashboard/admin/policies/registry-health/+page.svelte:13) | `1b702bea` |
| M7 | `age` key — registry says "primary applicant age", changelog says "youngest applicant age". One must be wrong; matters for AI prompts | [`keyRegistry.ts:247`](src/lib/config/pms/keyRegistry.ts:247) vs [`registryChangelog.ts:167`](src/lib/config/pms/registryChangelog.ts:167) | `a1c09e7a` |
| M8 | CIBIL floor applied twice for PMS docs (sections.cibil hard_gate + cibil_floor synthetic gate) — produces GREY instead of RED/AMBER | PMS adapter | older |
| M9 | In-memory rate limiter `MAX_WINDOW_MS = 10min` < OTP verify `windowMs = 15min` — silent rate-limit reset at ~10min | [`rateLimiter.ts:14`](src/lib/server/rateLimiter.ts:14) | older |
| M10 | Partial-resolve duplicate PendingChange records — no dedup on `$push: { $each: [...] }` | PMS service | older |
| M11 | JSON-Logic `override.condition` from MongoDB passed verbatim to `jsonLogic.apply()` — no depth/structure validation | PMS adapter | older |

---

## Low Findings (Open)

| # | Finding | File | Source |
|---|---------|------|--------|
| L1 | `schemaUtils.ts` raw `fetch` POST + bare `console.error` (3 sites) | [`schemaUtils.ts:15,33,63,93`](src/lib/utils/schemaUtils.ts:15) | older |
| L2 | Teammate mixed quote styles in JSON-Logic array (`"Floor"` vs `'Flat'`/`'House'`) + missing comma space | [`propertyCondition.ts:193`](src/lib/config/homeLoan/questionBank/propertyCondition.ts:193) | `dd4ffa4c` |

---

## Recent Themes (4-day retrospective)

### Theme 1: SSR fragility — Vite 7 partial `window` (Pitfall #9)

**S95 batches 1–7** (commits `dc5373c2` → `a7adc7b3`) systematically replaced broken `typeof window !== 'undefined'` guards. Vite 7 SSR exposes a partial `window` object — `typeof window` returns `false` on server but `window.location`/`window.matchMedia` are `undefined`, crashing 6 form pages with `Cannot read properties of undefined (reading 'href')`. Fix: `browser` from `$app/environment` + `$page.url` in templates.

**Status:** Comprehensive sweep complete. CLAUDE.md Pitfall #9 documents the trap. Daily review Step 0 auto-flags new occurrences. Current grep: 0 matches. Pattern is contained.

### Theme 2: CSRF — raw `fetch()` on mutating endpoints

**S95 batches 1, 6, 7** (commits `dc5373c2`, `21939913`, `a7adc7b3`) systematically replaced raw `fetch` POSTs with `secureFetch`. Triggered by repeated 403 incidents on `/api/set-role`, `/api/admin/upload`, `/api/devices/register`.

**Status:** All known mutating endpoints converted. Remaining `await fetch(` matches are either GET (safe), pre-auth flows (no session), external APIs, or archived. Only `schemaUtils.ts` (Low #1) is a genuine carry-forward. Pattern is contained.

### Theme 3: Capacitor SSR + thenable-proxy traps (S94)

`2ff2d747` + `bc6e08cf` documented and fixed CLAUDE.md Pitfall #8 — async functions returning Capacitor `Proxy` namespaces directly. `await` unwraps the Proxy via the intercepted `.then`, throwing `"X.then() is not implemented on web"`. Fix: envelope pattern (`return { Preferences: mod.Preferences }`).

**Status:** Rule D grep added to standing daily review. Currently 0 matches. Pattern is contained.

### Theme 4: PMS Phase 7/9/11 — large feature drops

Three large PMS features shipped in quick succession (`5ee57dce`, `ffa894c9`, `a1c09e7a` + `1b702bea`). Each landed with consistent issues:

- Missing rate limits on new POST endpoints
- TypeScript-only validation (no Zod) on body fields
- API-side authorization gaps (UI loader checks assignment, API doesn't)
- Field-name mismatches between TS types and projections (Critical #4)

This pattern suggests a need for a **PMS endpoint checklist** before merge. See "Top 3 actions" #4 below.

### Theme 5: Production Vercel/Node deployment traps (S88)

Several commits in the 4-day window are S88-era residue or carry context: `engines.node` major-version pinning (Pitfall #7), gsap CommonJS interop, error alerting. All addressed and documented.

---

## Summary

| Severity | New (today) | Carry-Forward | Total Open |
|----------|-------------|---------------|------------|
| Critical | **1** | 5 | **6** |
| High | 0 | 7 | 7 |
| Medium | 0 | 11 | 11 |
| Low | 0 | 2 | 2 |
| Teammate | 0 | 1 | 1 |

---

## Top 4 Actions for Next Session

1. **🔴 BLOCKER — Fix DC Personal Loan Profile-page stuck Next button (Critical #NEW).** Reorder pages so `applicantProfilePage` comes AFTER `locationPageDC` in DC flow, OR auto-fill `applicantResidencePattern='SAME_CITY'` unconditionally and add a re-sync `$effect` that triggers when `residenceStateName`/`City` change. Affected paths are 100% of DC PL traffic — the commit should not stay in production unfixed for long. Add an e2e covering DC PL → Profile → Next.

2. **Fix suggestion authorization + dedup (Critical #2 + #3, High #1 + #2 + #4).** Add `unique: true` to the [`PolicySuggestions` index](src/lib/database/mongo.ts:718). Add RM-to-lender assignment checks to GET and PATCH suggestion API endpoints. Add rate limits to suggestion POST and JSON Editor POST. Restrict `currentValue`/`suggestedValue` to `string` with size cap.

3. **Fix registry health checker field names + `isDefaulter` type (Critical #4, High #6 + #7).** Change projection to `{ proposedKeyPath: 1, createdAt: 1 }`, read `item.proposedKeyPath`/`item.createdAt`. Change `isDefaulter` to `type: 'enum', enumValues: ['Yes', 'No']`. Wire CI script into `package.json` + `.github/workflows/ci.yml`. Extend `scanFormBindsTos()` to include applicant JSON configs.

4. **Implement Zod validation in `pmsToEngineAdapter.ts` (Critical #5 — 4th consecutive review).** This has been carry-forwarded too long. The promised `validateAdapterOutput` must exist. Without it, malformed PMS values silently produce `NaN` and wrong eligibility. **If only ONE thing gets done next session, this is it.**

**Quick wins (same session, <30 min total):**
- Wire CI script (High #5) — adds `pnpm check:registry`
- Fix `rerun()` double-call (Medium #6) — remove the discarded API call
- Fix indentation (Medium #2) — single-character fix
- Add `?? 'PVT'` fallback at both classification cast sites (Medium #3)
- Resolve `age` key documentation conflict (Medium #7)

---

## Process Note

Tracking the same Critical (#5 Zod validation) across 4 consecutive daily reviews suggests the daily-review format alone isn't surfacing this work. Consider:
- Promoting it to a hard "do-not-merge-PMS-features-until-fixed" gate, OR
- Spawning a dedicated session task to close it (estimate: 2–3 hours).
