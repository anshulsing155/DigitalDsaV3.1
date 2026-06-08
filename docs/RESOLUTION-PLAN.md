# DigitalDSA — Full Resolution Plan
> Generated: 2026-04-20  
> Inputs: audit-report-2026-04-11.md (72 findings, 14 resolved), code-review tool output (S73), MEMORY.md pending list

---

## OVERALL STATUS SNAPSHOT

| Category | Total | Resolved | Open |
|---|---|---|---|
| Security (audit) | 8 | 8 | 0 open (SEC-7 fully closed in S75, SEC-8 closed in S75) |
| Performance | 11 | 8 | 3 open (3E, 3F, and remaining backlog after S76 3A–3D shipped) |
| Code Quality | 12 | 0 | 12 open |
| Duplication / Dead code | 9 | 1 | 8 open |
| Cross-Browser | 4 | 2 | 2 open |
| Dependencies | 4 | 1 | 3 open |
| SEO | 3 | 2 | 1 open |
| **New: Svelte-check** | 7 | 0 | 7 open |
| **New: ESLint errors** | ~4,451 | 0 | ~4,451 open |
| **New: Prettier drift** | ~120 files | 0 | ~120 open |
| **New: Test gaps** | 3 | 0 | 3 open |
| **Phase H (pre-launch)** | 3 | 0 | 3 open (deferred) |
| **New: A11y / UX gaps** | 6 | 0 | 6 open |

---

## TRIAGE KEY

```
🔴 MUST FIX before production launch
🟠 HIGH — fix this sprint, production risk or UX regression
🟡 MEDIUM — fix this month, quality / maintainability
🟢 LOW — backlog, no production risk
```

---

## BATCH 1 — Quick Wins (1 session, ~3–4 hrs) ✅ DONE (S74, 2026-04-20)
> Zero-risk mechanical fixes. All are single-file or single-command changes.  
> Do these first to clean the baseline before heavier refactors.
>
> **Status:** All 6 items shipped in S74 — see DEVELOPMENT-PLAN / CHANGELOG for per-item commits and plan-vs-reality divergences.

### 1A. Prettier formatting — 1 command 🟡
```bash
pnpm exec prettier --write .
```
**What:** Fixes ~120 files with formatting drift.  
**Why now:** Free baseline cleanup — no logic changes, reviewable in one diff.

---

### 1B. Svelte-check: `$state(prop)` → `$derived(prop)` — 7 warnings 🟡

| File | Line | Variable | Fix |
|---|---|---|---|
| `MonthYearModal.svelte` | 48 | `maxYearProp` | `$derived(maxYearProp)` |
| `PartPaymentPlanner.svelte` | 73–76 | `loanStartMonth` ×2, `tenureInMonths` | `$derived(...)` |
| `FlexibleEmiPlanner.svelte` | 62–65 | `loanStartMonth` ×2 | `$derived(...)` |
| `MonthYearInput.svelte` | 42 | `startYear` | `$derived(startYear)` |

**Pattern fix:** `let x = $state(someProp)` → `let x = $derived(someProp)`.  
These components live in the new tools/planner group (S73). Parents don't change props after mount so currently harmless, but semantically wrong.

---

### 1C. Bare `console.*` → structured logger — 9 files 🔴

Replace all bare `console.error/warn/log` with the project's `logger` import. CQ-1 through CQ-9.

| File | Type | Action |
|---|---|---|
| `src/lib/services/authService.ts:66` | `console.error` | → `logger.error` |
| `src/lib/services/sessionService.ts:47` | `console.warn/error` | → `logger.warn/error` |
| `src/lib/services/securityMonitor.ts:370` | `console.error` (CRITICAL ALERT) | → `logger.fatal` |
| `src/lib/services/homeLoanApi.ts:146` | `console.error` (×6) | → `logger.error` |
| `src/lib/services/otpStore.ts:72` | `console.error` | → `logger.error` + re-throw |
| `src/lib/components/Pensioner.svelte:59` | `console.log` | → remove (restore is silent op) |
| `src/lib/components/SalariedPerson.svelte:61` | `console.log` | → remove |
| `src/lib/components/SelfEmploymentOther.svelte:74` | `console.log` | → remove |
| `src/lib/components/SelfEmploymentProfessional.svelte:65` | `console.log` | → remove |
| `src/lib/components/UnemployedPerson.svelte:60` | `console.log` | → remove |

> **Note:** The 5 income component logs (`[Pensioner] Restored saved income profile`) are debug artifacts — just delete them. The service-layer ones (`authService`, `sessionService`, `securityMonitor`) are operational and need to become logger calls, not be deleted.

---

### 1D. Dead file archive — 9 files 🟡

Move these to `src/lib/components/_archive/` or `src/lib/utils/_archive/` per project convention:

```
src/lib/utils/ApplicantUtils/applicantKey.ts        (entirely commented out)
src/lib/utils/ApplicantUtils/computeCompletion.ts   (entirely commented out)
src/lib/utils/limitChecker.ts                       (only active line is unused import)
src/lib/components/Progress.svelte                  (never imported)
src/lib/components/ProgressBar.svelte               (never imported)
src/lib/components/Breadcrumb.svelte                (superseded by Breadcrumbs.svelte)
src/lib/utils/formUtils.ts                          (never imported, all 5 functions duplicated elsewhere)
src/lib/utils/hardwareFingerprint.ts                (exported fn never called)
src/lib/config/homeLoanSchema.json                  (superseded by TS composer)
```

---

### 1E. Filename typos — 2 files 🟡

| File | Typo | Fix |
|---|---|---|
| `src/lib/form/firstPage/visibilty.ts` | missing `i` | Rename to `visibility.ts`, update all imports |
| `src/lib/config/lapLoan/questionBank/topUpDetailst.ts` | extra `t` | Rename to `topUpDetails.ts`, update page ID + imports |

Search for all importers of each file and update in one pass.

---

### 1F. SEO — LAP stub title 🟢

File: `src/routes/(app)/form/lap/+page.svelte:1163`  
Change: `<Seo title="LAP " description="LAP loan" />`  
To: `<Seo title="Loan Against Property — DigitalDSA" description="Apply for a Loan Against Property. Compare offers from 30+ lenders." />`

---

## BATCH 2 — Security Hardening (1 session, ~2–3 hrs) ✅ DONE (S75, 2026-04-20)
> Two security items still open from the audit. Plus minor sec warnings.
>
> **Status:** All 5 items shipped in S75 — see DEVELOPMENT-PLAN / CHANGELOG for per-item commits. Divergences: 2B spec had `apiError` args reversed (actual signature is `apiError(message, status)`); 2C `newsletter/subscribe` already had rate limiting (plan stale); 2D expanded scope to `roleLabel` and the second email helper (`sendUserDeletionConfirmEmail`); 2E actual CSRF bypass location was line 416 (plan said 27).

### 2A. SEC-7: JWT in URL query param 🔴 ✅ DONE (`3a40b509`)

**File:** `src/routes/api/auth/validate-token/+server.ts:120`  
**Current:** `let token = url.searchParams.get('token')`  
**Fix:** Remove the query-param path entirely. The endpoint should only accept the token from the `Authorization: Bearer <token>` header or from the `accessToken` httpOnly cookie — not from the URL.  
Check callers first: grep for `/validate-token?token=` to confirm no legitimate client still uses the URL param path.

---

### 2B. SEC-8: Command injection in test runner (dev-only) 🟠 ✅ DONE (`0f6e0f92`)

**File:** `src/routes/api/test/run-vitest/+server.ts:22`  
**Current:** `` `npx vitest run --reporter=json "${pattern}"` `` — pattern is raw user input  
**Fix:** Allowlist characters: only allow `[a-zA-Z0-9\-_./]`. Reject anything else with `apiError(400, 'Invalid pattern')`.  
```typescript
if (pattern && !/^[\w\-./]+$/.test(pattern)) {
  return apiError(400, 'Invalid test pattern');
}
```

---

### 2C. Missing rate limits on 2 public endpoints 🟠 ✅ DONE (`0f687bad`)
> Note: `newsletter/subscribe` was already rate-limited when we looked — only `share-link/validate` needed the new limiter.

**Files:**
- `src/routes/api/newsletter/subscribe/+server.ts` — no rateLimit()
- `src/routes/api/share-link/validate/+server.ts` — no rateLimit()

Add `rateLimit()` calls at the top of each POST handler. Use the same pattern as sibling auth endpoints.

---

### 2D. User name unsanitized in delete-account email 🟡 ✅ DONE (`ffecea17`)
> Expanded scope: also sanitized `roleLabel` (used in both subject and body) and applied the same CRLF strip inside `sendUserDeletionConfirmEmail` — same injection surface.

**File:** `src/routes/api/auth/delete-account/+server.ts:161`  
Strip CRLF characters from `name` before interpolation into email subject and body:
```typescript
const safeName = name.replace(/[\r\n]/g, '');
```

---

### 2E. CSRF skipped in dev mode 🟡 ✅ DONE (`6b5a256b`)
> Final check also accepts `127.0.0.1` and `::1` so Capacitor / cross-stack dev still works.

**File:** `src/hooks.server.ts:27`  
Current: `if (dev) return true` — skips all CSRF in dev.  
Fix: Scope the bypass to localhost only:
```typescript
if (dev && event.url.hostname === 'localhost') return true;
```
This keeps dev ergonomics but protects tunnel/ngrok/staging deployments.

---

## BATCH 3 — Performance Hot Paths (1–2 sessions, ~6–8 hrs)
> These directly affect every user's perceived latency in production.
>
> **Status:** 3A–3D shipped in S76 (2026-04-20) — see DEVELOPMENT-PLAN / CHANGELOG for per-item commits and plan-vs-reality divergences. 3E–3F remain open (scheduled for S77 per prompt scope).

### 3A. Auth hook: primary-path DB waterfall 🟠 ✅ DONE (S76, `e0b3f7ba`)

**File:** `src/hooks.server.ts:207` (primary access-token path)  
**Current:** Sequential `Applicant.findOne` → `DsaApplications.findOne` → `RmApplications.findOne` → `Admin.findOne`  
**Fix:** Run all 4 in parallel and pick the first non-null result:
```typescript
const [applicant, dsa, rm, admin] = await Promise.all([
  Applicant.findOne({ _id: userId }),
  DsaApplications.findOne({ user_id: userId }),
  RmApplications.findOne({ user_id: userId }),
  Admins.findOne({ user_id: userId }),
]);
const userDoc = applicant ?? dsa ?? rm ?? admin;
```

---

### 3B. Cases: paginate in MongoDB, not in Node.js 🟠 ✅ DONE (S76, `eea9ee21` + `d333034c`)

**Files:**
- `src/routes/dashboard/dsa/cases/+page.server.ts:185`
- `src/routes/dashboard/dsa/+page.server.ts:281`

**Fix for cases list:** Add `skip` and `limit` to the MongoDB query. Expose `page` and `pageSize` as URL params. Return `{ cases, total, page, pageSize }`.

**Fix for dashboard stats:** Replace JS loops with a MongoDB aggregation `$group` pipeline to compute counts per status, per loan type, per lender directly in the DB.

---

### 3C. wizardState: memoize section completion 🟠 ✅ DONE (S76, `f5670ead`)

**File:** `src/lib/components/form-wizard/wizardState.svelte.ts:78`  
**Current:** `computeSectionCompletion` and `computeProgress` use triple-nested loops re-run on every reactive change.  
**Fix:** Use `$derived.by()` with a keyed cache. Completion for a page only changes when that page's answers change — not when other pages change. Structure:
```typescript
const pageCompletion = $derived.by(() => {
  const cache = new Map<string, boolean>();
  // compute once per page, cache by pageId
  return cache;
});
```

---

### 3D. Notifications digest: N+1 → batch $in query 🟠 ✅ DONE (N+1 → $in shipped in S73 `43c744ac`; PERF-013 digest window shipped in S76 `43bd4fb4`)

**File:** `src/routes/api/notifications/digest/+server.ts:47`  
**Current:** `for (const userGroup of unreadByUser) { await DsaApplications.findOne(...) }`  
**Fix:** Extract all user IDs first, then single `DsaApplications.find({ user_id: { $in: userIds } })`, then build a Map for lookups:
```typescript
const userIds = unreadByUser.map(g => g._id);
const dsaDocs = await DsaApplications.find({ user_id: { $in: userIds } }).toArray();
const dsaByUserId = new Map(dsaDocs.map(d => [d.user_id, d]));
```

---

### 3E. evaluationEngine: per-lender DB query → cache ✅ (S77a, `2ca35bfa` + `ea70973e`)

**File:** `src/lib/ruleEngine/evaluationEngine.ts:1040` (call site)
**Was:** `evaluations.map(async (ev) => resolvePoliciesForLender(ev.lender_id, ...))` — 3N queries for N lenders per evaluation (N× ProductVariations + N× PolicyRules + N× PolicyVersions).
**Done:** Added `resolvePoliciesForLenders` in `policyResolverBridge.ts` → `resolvePoliciesForMany` in `policyResolver.ts` → `matchVariationsForProducts` in `variationMatcher.ts`. Single batched pass with `$in` across the union of product_ids, matched variation_ids, and geo-scope IDs — 3N → 3 DB queries regardless of N. Single-lender path preserved via shared `buildResolvedPolicyFromRules` helper (byte-equivalent output). Cache-aware: already-cached queries served from cache and excluded from the DB round-trip.

---

### 3F. engineContext.ts: RERA 3-hop → cache ✅ (S77a, `c10f61b5`)

**Files:** `getBuildersForCity`, `getBuildersForState`, `getProjectsForBuilder`, `hasBuildersForCity` in `src/lib/server/formEngine/engineContext.ts`
**Done (cache-first, aggregation deferred):** Added per-function in-memory Map caches with 5-minute TTL. Cache keys are post-alias/post-sanitize/lowercased so "Gurgaon"/"Gurugram" share a slot. Empty results cached too so "no data for this city" queries skip the full probe chain on repeat. Delhi state-level fallback also caches under the city key.
**PERF-036 (bundled):** Hoisted `import { ObjectId } from 'mongodb'` to module top-level — removed the two dynamic `await import('mongodb')` statements in the lookup hot path. `toSafeObjectId(id)` no longer takes `ObjectIdClass`.
**Deferred:** The `$lookup` aggregation rewrite was dropped from S77a scope — the existing 3-hop code is correct and indexed, and the cache delivers the vast majority of the perf win (99%+ of calls within a 5-minute window become a Map lookup). Aggregation can be revisited if the cold path becomes a bottleneck.

---

## BATCH 4 — Duplication Consolidation (1 session, ~4–5 hrs)
> Three function families duplicated across the codebase. One bug fix must now be made 4–5 times. Fix the source.

### 4A. `isQuestionVisible` — ✅ CLOSED S77b (architectural, will not consolidate)

**Investigated S77b.** The three surviving copies are **not duplication** — they
encode three different semantics chosen deliberately for three different callers.
Consolidating any pair silently changes user-visible behaviour and/or payload
submission content. Git archaeology confirms the split was introduced on purpose
in `3acc7489` (anti-scraping / form guard system), which flipped only the
server-side copy to fail-hide while intentionally leaving the two client copies
on their existing semantics.

| File | Semantic | Caller | Why this copy exists |
|---|---|---|---|
| `src/lib/form/firstPage/visibility.ts` | **naive** `jsonLogic.apply(rule, full-answers)` | `how-can-we-help/+page.svelte` (first page: loanName + loanType radios) | Deps answered instantly on click; a dep guard is unnecessary. A prior "partial answers map" attempt (51a0335f) broke q4_loanType visibility and was reverted to this form. |
| `src/lib/form/homeLoan/visibility.ts` | **fail-OPEN dep guard** (show until dep answered) | `$lib/utils/payloadGrouping.ts` (via `cleanPayloadStore` + `loanTransaction` payload builder) | Must mirror what the client rendered, so `buildCleanAnswers` / `groupAnswersBySchema` never drop answers the user filled while a dep was briefly empty mid-render. |
| `src/lib/server/formEngine/visibility.ts` (canonical) | **fail-HIDE** via global `jsonLogic.add_operation('!=')` override | server form engine, anti-scraping budget, page-server loaders | Strict progressive reveal required by `formGuard.ts` session question-budget. A blank form would count every conditional question as visible under fail-open, instantly blowing the budget and defeating the anti-scraping design. |

**Additional constraint — singleton side effect:** the server module's `!=` /
`!==` overrides are installed via `jsonLogic.add_operation`, which mutates the
shared `jsonLogic` singleton process-wide. Merely importing the server module
from client code would flip every client JSON-Logic evaluation to fail-hide
semantics, including inline `jsonLogic.apply` calls elsewhere in the UI. This
is the structural reason the server module must stay server-only and the
client copies cannot just re-export it.

**Resolution taken (S77b-4A):**
1. Added explanatory headers to both client files (`homeLoan/visibility.ts` and
   `firstPage/visibility.ts`) pointing at commit `3acc7489`, CLAUDE.md Pitfall
   #1, and this plan entry so future passes don't try to consolidate.
2. The `formUtils.ts` copy was already archived in S74 — no action needed.
3. No importers touched. No behaviour change.

**Do not reopen without first reproducing the anti-scraping budget check and
the payload-cleaning parity with client rendering — both will silently regress
if the copies are merged.**

---

### 4B. `resolveBindsTo` — ✅ CLOSED S77b (two copies archived, three live copies documented)

**Survey result (S77b-4B, 2026-04-21):** the plan's "5 copies → 1" framing was over-counted and architecturally wrong. Physical survey at HEAD:

| File                                             | Status              | Signature | Why it exists                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------ | ------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/form/firstPage/schema.ts`               | LIVE                | 3-arg     | Canonical client resolver. Called by `how-can-we-help/+page.svelte` (loan-picker page) and transitively by anything in the form namespace.                                                                                                                                                                         |
| `src/lib/server/formEngine/engine.ts`            | LIVE                | 3-arg     | Canonical server resolver. Adds `locationConfig` pre-flatten branch (server sees compound location questions; client never does). Lives inside the `jsonLogic.add_operation` singleton-override boundary documented in §4A — importing server into client would flip client JSON-Logic semantics process-wide.   |
| `src/lib/components/ExistingLoanDetails.svelte`  | LIVE                | 2-arg     | Scoped inline copy for the existing-loan sub-form. Templates in that flow never reference `q1_loanName`, so the 3rd arg is not meaningful. Keeping the 2-arg signature prevents call sites from threading a stale loan context through a loan-type-agnostic flow.                                                 |
| `src/lib/form/homeLoan/schema.ts`                | ARCHIVED (S77b-4B)  | 3-arg     | ZERO live importers. Only inbound edge was sibling `homeLoan/validation.ts` (also dead). Body was byte-equivalent to firstPage's. Moved to `$lib/form/_archive/homeLoan-schema.ts` with archival header.                                                                                                         |
| `src/lib/form/homeLoan/validation.ts`            | ARCHIVED (S77b-4B)  | n/a       | ZERO live importers. Companion to the above — imported only the dead sibling. Moved to `$lib/form/_archive/homeLoan-validation.ts` with archival header.                                                                                                                                                         |
| `src/lib/utils/formUtils.ts`                     | ALREADY ARCHIVED S74 | —         | Pre-existing archive at `src/lib/utils/_archive/formUtils.ts`. Original plan listed it as live.                                                                                                                                                                                                                     |

**Why the per-loan-type namespace plan never shipped:** `homeLoan/schema.ts` was introduced in `895470dd` as the first of an intended 6-per-loan-type client namespace structure (homeLoan/, lap/, plot/, personal/, business/, professional/). Before the other 5 could be built, architecture pivoted to server-driven evaluation (`e0534f0e` + `3104d918`) and the client namespace plan was abandoned. Only `firstPage/` and `homeLoan/` ever existed; all 6 form pages now route through `$lib/server/formEngine/` and `$lib/utils/combinedAnswersMemo.ts`. The `// ✅ Home-loan-specific resolver` comment in the archived file was aspirational — the body stayed byte-equivalent to firstPage's because the specialisation never arrived. This is an **abandoned-migration artifact**, structurally different from §4A's active-invariant split.

**Resolution taken (S77b-4B):**
1. `git mv` both dead files to `src/lib/form/_archive/` with dated archival headers pointing at the introduction SHA (`895470dd`) and explaining zero-importer status per export.
2. Created `src/lib/form/_archive/README.md` mirroring the `src/lib/stores/_archive/README.md` convention (archive policy + per-file rationale).
3. Added a canonical-copy header to `src/lib/form/firstPage/schema.ts` explaining what the other two live copies are for and pointing at this plan entry + §4A + CLAUDE.md Pitfall #1.
4. Replaced thin "Ported from" comments in `src/lib/server/formEngine/engine.ts` (on both `resolveBindsTo` and `buildCombinedAnswers`) with rationale blocks naming the three structural reasons the server copy stays standalone: `locationConfig` branch, singleton-override boundary, multi-ingestion-point `loanName` key hygiene.
5. Updated `src/lib/server/formEngine/textResolver.ts` "Ported from" comments to point at the archive path (the original source files no longer exist at their pre-archive paths).
6. Added a scoped-inline-copy comment above `resolveBindsTo` in `src/lib/components/ExistingLoanDetails.svelte` explaining why the 2-arg signature is kept and pointing at the canonical header.
7. Zero behaviour change. Zero type-check change (tsconfig excludes `**/_archive/**`).

**Do not reopen without first:**
- Reproducing the `locationConfig` server-only pre-flatten path (compound location questions must resolve to `${prefix}StateName` before payload flattening).
- Reproducing the `jsonLogic.add_operation` singleton boundary from §4A (importing server-side into client bundles would flip client JSON-Logic semantics process-wide).
- Checking whether the existing-loan sub-form still uses the 2-arg signature (if it has been rewritten to pass `selectedLoan` through, the inline copy becomes collapsible into the canonical).

---

### 4C. `buildCombinedAnswers` — ✅ CLOSED S77b (three different algorithms, not three copies)

**Survey result (S77b-4C, 2026-04-21):** the plan's "3 copies → 1" framing was wrong at the algorithmic level, not just at the file-count level. The `homeLoan/schema.ts` copy already went with its file in §4B (zero live importers), so at survey time only two copies remained to consider. Physical inspection at HEAD showed the remaining two plus the server method are NOT substitutable for each other — each row in the matrix below differs from every other row in at least three of five dimensions:

| File                                    | Schema walk | Default injection | Applicant meta flags | flagKey resolution | locationConfig branch | Caller(s)                                                             |
| --------------------------------------- | ----------- | ----------------- | -------------------- | ------------------ | --------------------- | --------------------------------------------------------------------- |
| `src/lib/utils/combinedAnswersMemo.ts`  | ✗           | ✗                 | ✓                    | ✗                  | n/a (no schema)       | All 6 form pages (home, lap, plot, personal, business, professional). |
| `src/lib/form/firstPage/schema.ts`      | ✓           | ✓ (per type)      | ✗                    | ✗                  | ✗ (uses client resolver) | `src/routes/(app)/form/how-can-we-help/+page.svelte` only.          |
| `src/lib/server/formEngine/engine.ts`   | ✓           | ✗ (opposite)      | ✗                    | ✓                  | ✓ (via server resolver)  | Server engine — form eval + payload enrichment.                    |

**Why each variant's specialisation is load-bearing:**

1. **`combinedAnswersMemo.ts` (form pages)** — the six form pages use the fail-HIDE `!=` / `!==` server evaluator (§4A / CLAUDE.md Pitfall #1) which handles unanswered deps without needing type-specific defaults. What they DO need is applicant-derived meta flags (`__applicantCount`, `__allIndividualsNRI`, etc.) and shorthand aliases, paired with `stableReference()` for Svelte-5 $derived memoization. A flat merge is the right shape; walking the schema would be wasted work.

2. **`firstPage/schema.ts` (loan-picker)** — paired with the NAIVE `isQuestionVisible` evaluator from §4A (the loan-picker doesn't use the server override — there's no dep to guard, the deps are answered on click). For this to work on a blank form, every schema key must have a type-correct default; otherwise `{ "in": [...] }` showWhens throw on undefined vars and `{ "!": [{ "var": ... }] }` diverges between undefined and empty string. Default injection is REQUIRED for the naive evaluator. Applicants don't exist yet on the loan-picker, so no applicant meta flags.

3. **`server/engine.ts` (server)** — walks the schema but only copies real answers (opposite of #2 — defaults would pollute the submission payload). Adds `flagKey` resolution: selected radio/select options with a `flagKey: { ... }` object merge those pairs into combined answers so downstream showWhens can reference them. The contextKey-collision guard (boolean flagKey with key matching question's own `contextKey` is skipped) prevents the payload-breaking pattern where `true`/`false` overwrites the string answer `"Yes"`/`"No"`. Uses the server `resolveBindsTo` with the `locationConfig` pre-flatten branch (compound location questions don't exist client-side). Cannot be ported back to client because the server code lives inside the `jsonLogic.add_operation` singleton boundary.

**Resolution taken (S77b-4C):**

1. Added a detailed header block above `buildCombinedAnswers` in `src/lib/form/firstPage/schema.ts` explaining the schema-walk-with-defaults semantics, citing the naive-evaluator pairing from §4A, naming `how-can-we-help/+page.svelte` as the sole consumer, and pointing at this plan entry + the other two variants.
2. Extended the 4B-era header above the private `buildCombinedAnswers` method in `src/lib/server/formEngine/engine.ts` to enumerate the two server-only specialisations explicitly — (a) `locationConfig` pre-flatten branch, (b) flagKey resolution with the contextKey-collision guard — and note the "no default injection" opposite-to-#2 semantic.
3. Added a top-of-file "why three shapes, not three copies" block to `src/lib/utils/combinedAnswersMemo.ts` with the full differences matrix and pointers to the other two files + this plan entry.
4. No code changes. No behaviour change. No type-check change.

**Do not reopen without first:**

- Reproducing the naive-evaluator default-injection pairing (loan-picker page must keep working on a blank form against showWhens that use `{ "in": [...] }` and `{ "!": [...] }`).
- Reproducing the server flagKey + contextKey-collision guard (selected options with `flagKey` objects must merge their pairs into combined answers without overwriting the string contextKey answer with a boolean).
- Reproducing the `jsonLogic.add_operation` singleton boundary from §4A (server copy cannot move to shared client-reachable code).
- Verifying whether the loan-picker has migrated to server-driven evaluation (the same migration that subsumed the per-loan-type client namespaces in §4B). If so, `firstPage/schema.ts`'s variant can be archived — the default-injection is load-bearing only because the naive evaluator is.

---

### 4D. DEP-3: Complete `cleanPayloadStore` migration 🟡

**File:** `src/lib/stores/cleanPayloadStore.ts` — marked `@deprecated`, still imported by 6 form pages  
**Fix:** Go to each of the 6 form pages (professional-loan, lap, home-loan, plot-loan, business-loan, personal-loan) and replace the bridge import with the direct `$lib/state/form.svelte.ts` import. Then delete the bridge file.

---

### 4E. DEP-2: Unify two CSRF client implementations 🟡

**Files:** `src/lib/utils/csrf.ts` (reads `csrf-token`) and `src/lib/utils/csrfClient.ts` (reads `digitaldsa_csrf`)  
**Fix:** Pick one cookie name (whichever `hooks.server.ts` sets), update the one that reads the wrong name, then delete the other file. All API calls should flow through the single canonical client.

---

### 4F. DEP-4: Retire v1 DSA onboarding endpoint 🟡

**Files:** `src/routes/api/onboarding/dsa-onboarding/+server.ts` (v1) and `dsa-onboarding-v2/+server.ts` (v2)  
**Fix:** Find the caller in `layout.svelte` that still uses v1. Point it to v2. Add `throw error(410, 'Use v2')` to the v1 endpoint so old clients get a clear message. Archive v1 after confirming no active traffic.

---

## BATCH 5 — ESLint Cleanup (1 session, ~3–4 hrs)
> ~4,451 issues, but the breakdown makes this manageable in one focused session.

### 5A. `no-unused-vars` — ~200 errors 🟡

These are real code quality issues. Run:
```bash
pnpm exec eslint --rule '{"@typescript-eslint/no-unused-vars": "error"}' --fix src/
```
For variables that can't be auto-fixed: prefix with `_` if intentionally unused (e.g., `_event` in event handlers), or delete them.

---

### 5B. `svelte/require-each-key` — ~50 errors 🟡

Every `{#each items as item}` without a key causes full DOM churn on re-render.  
Fix pattern: `{#each items as item (item.id)}` or `{#each items as item, i (i)}` for ordered lists.  
This is the second most impactful ESLint fix after unused-vars.

---

### 5C. `svelte/no-unused-svelte-ignore` — ~30 errors 🟡

These are `<!-- svelte-ignore ... -->` comments for warnings that no longer exist (fixed in a prior session). Run the ESLint autofix:
```bash
pnpm exec eslint --fix --rule '{"svelte/no-unused-svelte-ignore": "error"}' src/
```

---

### 5D. `no-explicit-any` — ~1,400 errors 🟢

**Do NOT attempt to fix all 1,400 in one session.** This is the long-tail typing project (item #20 in MEMORY). Continue the existing incremental strategy:
- Priority files already done: payloadEnricher, evaluationEngine, incomeAssessor, fileConfigurator, crossStepValidator, applicantValidation, incomeTabState
- Next priority: `aiService.ts` (3 `any` in policy parsing → define Zod schema), `applicantFormManager.svelte.ts` (4 `as any[]` → type properly)
- Everything else: ongoing background work, ~5–10 files per session

---

### 5E. `misc` rules — ~50 errors 🟢

`prefer-const`, `no-case-declarations`, etc. Most are auto-fixable:
```bash
pnpm exec eslint --fix src/
```

---

## BATCH 6 — Cross-Browser + A11y (1 session, ~3–4 hrs)
> Mostly CSS and ARIA attribute additions — low-risk, high-correctness value.

### 6A. CSS: `color-mix()` without `@supports` — 2 files 🟡

**Files:** `CompanyIncomeTab.svelte:340`, `FormNavigationBar.svelte:274`  
```css
/* Before */
background: color-mix(in srgb, var(--icon-color) 12%, transparent);

/* After */
background: rgba(var(--icon-color-rgb), 0.12); /* fallback */
@supports (color: color-mix(in srgb, red 10%, blue)) {
  background: color-mix(in srgb, var(--icon-color) 12%, transparent);
}
```

---

### 6B. CSS: `:has()` without `@supports` — 2 files 🟡

**Files:** `CustomSelect.svelte:564`, `CustomIncomeTable.svelte:827`  
```css
@supports selector(:has(*)) {
  .custom-select-dropdown-wrapper:not(:has(...)) { ... }
}
```
Without the guard: provide a fallback style that works without `:has()`.

---

### 6C. iOS Safari `100vh` → `100dvh` fallback 🟡

**File:** `src/routes/(auth)/login/+page.svelte:682`  
```css
/* Before */
min-height: 100vh;

/* After */
min-height: 100vh;
min-height: 100dvh; /* overrides on browsers that support it */
```

---

### 6D. iOS auto-zoom on inputs 🟡

**File:** `src/app.html:5`  
```html
<!-- Before -->
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- After -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
```

---

### 6E. A11y: Touch targets below 44px 🟡

| File | Element | Fix |
|---|---|---|
| `src/routes/(onboarding)/+layout.svelte:155` | Back button `h-8 w-8` | → `h-11 w-11` (44px) |
| `src/lib/components/mobile/Topbar.svelte:63` | Logout button `p-2` | → `p-3` + `min-h-11 min-w-11` |
| `src/lib/components/mobile/Topbar.svelte:75` | Login link (no padding) | → `py-2 px-3` |

---

### 6F. A11y: Dashboard delete modal — no focus trap 🟡

**File:** `src/routes/dashboard/+layout.svelte:1169`  
Change from conditional `<div>` to native `<dialog>` element:
```svelte
<!-- Before: {#if showDeleteModal}<div ...> -->
<dialog bind:this={deleteDialog} class="...">
  <!-- content -->
</dialog>
```
Native `<dialog>` handles focus trap, Escape key, and backdrop click automatically.

---

### 6G. A11y: Offer page spinners — no ARIA 🟡

**Files:** 6 offer pages (home, business, personal, plot, LAP, professional)  
```html
<!-- Before -->
<div class="animate-spin ..."></div>

<!-- After -->
<div role="status" aria-label="Loading offers...">
  <div class="animate-spin ..."></div>
  <span class="sr-only">Loading offers...</span>
</div>
```

---

### 6H. A11y: `role="menubar"` on nav links — incorrect 🟡

**File:** `src/lib/components/landing/FloatingNav.svelte:133`  
Remove `role="menubar"` and `role="menuitem"` from scroll-anchor buttons. These are navigation links, not an application menu. Use `<nav>` + plain `<a>` or `<button>` elements.

---

## BATCH 7 — Test Coverage Gaps (1 session, ~4–6 hrs)
> Three specific gaps identified. Existing 9,909 tests all pass.

### 7A. `sameCompanySync` tie-breaking test 🟢

**File:** `sameCompanySync.test.ts`  
**Gap:** No test for identical `updatedAt` timestamps — tie-breaking logic untested.  
**Add:** Test where two entries have same `updatedAt`; verify deterministic result (e.g., alphabetical by applicant name or by array index).

---

### 7B. `stakeholderManagement` — `isDirectorSkippable` for MEDIUM family dominance 🟢

**File:** `stakeholderManagement.test.ts`  
**Gap:** `isDirectorSkippable` not tested for the MEDIUM family dominance case.  
**Add:** Test where family controls 20–50% stake (MEDIUM dominance) and verify `isDirectorSkippable` returns the correct boolean.

---

### 7C. `ObligationCapture.svelte` — component tests 🟢

**File:** No component tests for `src/lib/components/ObligationCapture.svelte` (1,115 lines)  
126 logic tests exist in separate test files. Need Svelte component tests for:
- EMI input renders correctly for each obligation type
- FOIR calculation displays on the UI
- Evidence upload trigger works
- Done button enabled/disabled state
- Error messages on invalid input

Use `@testing-library/svelte` pattern consistent with existing component tests.

---

## BATCH 8 — Phase H: Pre-Launch Critical (final session before go-live)
> **Do these LAST, right before production deploy. Not before.**

### 8A. 🔴 Rotate all 9 credentials (~2–3 hrs)

| Credential | Where | Action |
|---|---|---|
| MongoDB Atlas | `.env` → new cluster password | Rotate in Atlas dashboard → update `.env` |
| JWT secret | `.env` → `JWT_SECRET` | Generate new 256-bit secret → invalidates all sessions |
| JWT refresh secret | `.env` → `JWT_REFRESH_SECRET` | Same |
| Razorpay key + secret | `.env` | Razorpay dashboard → new key pair |
| MSG91 auth key | `.env` | MSG91 dashboard → regenerate |
| SMTP credentials | `.env` | Reset email account password |
| HMAC/CSRF secret | `.env` → `CSRF_SECRET` | Generate new random string |
| Encryption key | `.env` → `ENCRYPTION_KEY` | Generate new key (data re-encryption may be needed) |
| ImageKit private key | `.env` | ImageKit dashboard → regenerate |
| AI/Anthropic API key | `.env` | Anthropic console → new key |

---

### 8B. 🔴 Purge `.env` from git history (~30 min)

```bash
# Using BFG Repo-Cleaner (recommended over git filter-repo for this)
bfg --delete-files .env
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin main --force
```

After purge: rotate ALL credentials (8A) because the old values are already exposed.

---

### 8C. 🔴 Email hardening — Nodemailer → SES/SendGrid (~5–6 hrs + DNS wait)

Full spec: `docs/specs/EMAIL-HARDENING-PLAN.md`

Steps:
1. Set up SES/SendGrid account, verify `digitaldsa.com` sender domain
2. Configure SPF, DKIM, DMARC DNS records (24–48h propagation)
3. Replace `createTransporter()` / Nodemailer SMTP in `src/lib/server/email.ts` with the new provider's SDK
4. Test transactional emails (OTP, billing, notifications, delete-account)
5. Set up bounce webhook endpoint (TODO already in email.ts)

---

## BATCH 9 — Long-Tail Backlog (ongoing, low urgency)

These have no production risk. Pick off incrementally.

| Item | Effort | Notes |
|---|---|---|
| `any` type cleanup (~1,400 remaining) | ~10 hrs | 5–10 files per session, priority order in MEMORY |
| i18n replacement pass | ~10+ hrs | 374 keys defined, UI still hardcoded English |
| Affordability UI component | ~4–6 hrs | Calculator wired (S72), just needs Svelte display |
| Cross-lender PL rates | ~3–4 hrs | Replace hardcoded 15%/60mo |
| Rule engine `applicants[0]` → proper selection | ~4–6 hrs | Should use youngest/highest for age-at-maturity |
| Capacitor APK build | ~4–6 hrs | Android Studio + Play Store submission |
| `CQ-6`: jwtService.ts `generateId()` wrapper | ~15 min | Minor — low risk on Node 19+ |

---

## EXECUTION SCHEDULE — UPDATED 2026-04-22

### Completed (all done in Claude Code, not CoWork)

| Session | Batch | Status | What shipped |
|---|---|---|---|
| S74 | 1A–1F | ✅ DONE | Prettier, svelte-check, console.log removal, dead file archive, filename typos, SEO stub |
| S75 | 2A–2E | ✅ DONE | JWT URL param, test runner injection, 2 rate limits, CSRF dev scope, email injection |
| S76 | 3A–3D | ✅ DONE | Auth hook waterfall, cases DB pagination, wizard memoization, digest N+1 → $in |
| S77a | 3E–3F | ✅ DONE | Per-lender DB cache (3N→3 queries), RERA 3-hop in-memory cache |
| S77b | 4A–4C | ✅ DONE | `isQuestionVisible`, `resolveBindsTo`, `buildCombinedAnswers` — all found to be different algorithms, documented & closed (not consolidated) |
| S77c | 4D | ✅ DONE | Submission pipeline correctness bug fixed: Layer A+B filter (`payloadFilter.ts`), `cleanPayloadStore` migrated off raw memory, bridge archived |
| S77d | Phase 1.6 | ✅ DONE | Server-side parity: `evaluate-and-persist` now runs `buildFilteredAnswers` before `buildLoanPayload`; 9 tests across all 6 loan paths |
| S77e | Fixture factory | ✅ DONE | Schema-driven fixture factory, 37 journey scenarios locked with FM-1 byte-match assertions, `formPathScenarios.ts` −2,927 lines of hand-written payloads |
| S78 (NEW) | QA system | ✅ DONE | `deriveFixtureName()` (72 tests), `QaScenarios` MongoDB collection + 6 indexes, 5 API endpoints, scenario library UI, results detail UI, coverage map, FormShell dev-mode save button |
| S79 | S77f + Batches 4–7 | ✅ DONE | S77f Option A: 37×8=296 profiles via buildLoanPayload(); Batch 4E CSRF unified; Batch 5 ESLint ~60 fixes; Batch 6 A11y/CSS; Batch 7 +96 tests. **10,099 passing @ `c664649c`** |

### Open — Next Session

### Final (do last, right before production launch)

| Session | Batch | What |
|---|---|---|
| S-LAUNCH | 8A–8C | Credential rotation (9 secrets), `.env` git purge, Nodemailer → SES/SendGrid |

---

## DECISION NOTES

**Why Batch 1 before Security?**
Prettier + svelte-check are zero-logic changes. Running them first means subsequent security/perf diffs are clean and reviewable without noise.

**Why Phase H last?**
Credential rotation invalidates all active sessions — users get logged out. Email DNS changes take 24–48h to propagate. Scheduling this right before go-live minimizes the operational window where old credentials might still be in use.

**Why Performance before Duplication?**
Performance hot-paths (auth waterfall, cases load) have real user impact in production today. Duplication is a maintainability risk that doesn't cause failures.

**ESLint `any` types — why skip the bulk?**
1,400 `any` errors are noise from one rule. They compile fine, tests pass. The actual risk is concentrated in ~10 priority files (aiService, applicantFormManager, resultBuilder) — fix those individually in Batch 5D. Attempting all 1,400 in one pass is likely to introduce real regressions.

**Why S77f before ESLint/A11y?**
S77f touches testing infrastructure (syntheticGenerator + archetype files). ESLint/A11y touch component files. Zero file overlap — safe to run in parallel once S77f decision is locked. S77f goes first in the main thread because it requires a user decision before coding starts; the other tracks spawn as agents while S77f is being implemented.

**S78 deviation note (2026-04-22):**
The original S78 was planned as "Dep cleanup + ESLint sweep (4D + 4E + 4F + Batch 5)". In practice, S78 became the full QA scenario system (a new feature, not in the original plan), prompted by a fundamental rethink of how form-flow testing works vs. rule-engine testing. The planned S78 work (4E, 4F, Batch 5) is moved to the next session and will be done in parallel with Batch 6 and 7 agents.
