# DigitalDSA — CoWork Session Prompts

> Copy-paste prompts for running each resolution batch as a separate Claude CoWork session.  
> Each prompt is self-contained — CoWork sessions don't see this conversation's context.

---

## HOW TO USE THIS FILE

1. Open Claude CoWork
2. Create a new session for the batch you want to run
3. Select the **`DigitalDSA-V3`** repository as the working directory
4. Copy the entire prompt block (between `─── BEGIN PROMPT ───` and `─── END PROMPT ───`)
5. Paste as the first message
6. Let the session run; review the diff before merging

**Parallelism:** Sessions S74, S79, S80 can run in parallel (no file overlap). Sessions S75–S78 should run sequentially (they touch overlapping files). S81 (Phase H) must be last and must run alone.

**Context files every session must read first:**
- `CLAUDE.md` (project invariants)
- `docs/RESOLUTION-PLAN.md` (full context)
- `docs/SESSION-HANDOFF.md` (current state)

---

## SESSION S74 — Quick Wins & Baseline Cleanup
> Duration: 4–5 hrs · Risk: Low · Prereqs: None · Can run in parallel with S79, S80

─── BEGIN PROMPT ───

You are working on DigitalDSA-V3, a multi-lender loan orchestration platform (SvelteKit 5 + Svelte 5 runes, MongoDB, TypeScript strict).

**First, read these for context:**
1. `CLAUDE.md` — project invariants, non-negotiable rules, critical pitfalls
2. `docs/RESOLUTION-PLAN.md` — the full plan you are executing (read sections: BATCH 1, BATCH 2 skip, Execution Schedule row for S74)
3. `docs/SESSION-HANDOFF.md` — current state

**Your scope is BATCH 1 only** from the resolution plan. Do not touch anything else.

Execute in this order, committing after each sub-batch:

### 1A. Prettier formatting
Run: `pnpm exec prettier --write .`
Commit message: `chore: apply prettier formatting across codebase`

### 1B. Svelte 5 `$state(prop)` → `$derived(prop)` — 7 warnings
Fix the 7 `state_referenced_locally` warnings in these files:
- `src/lib/components/MonthYearModal.svelte:48` — `maxYearProp`
- `src/lib/components/PartPaymentPlanner.svelte:73-76` — `loanStartMonth` ×2, `tenureInMonths`
- `src/lib/components/FlexibleEmiPlanner.svelte:62-65` — `loanStartMonth` ×2
- `src/lib/components/MonthYearInput.svelte:42` — `startYear`

Pattern: change `let x = $state(someProp)` to `let x = $derived(someProp)`.

Verify with: `pnpm check` — should show 0 `state_referenced_locally` warnings.

Commit: `fix(svelte5): use $derived for prop-sourced state (fixes 7 warnings)`

### 1C. Bare console.* → structured logger — 9 files
**Server-side (use `logger` from `$lib/server/logger`):**
- `src/lib/services/authService.ts:66` — `console.error` → `logger.error({ err: error }, 'AuthService: Login error')`
- `src/lib/services/sessionService.ts:47,65+` — replace all console.warn/error. This is client-side; create or use `$lib/utils/clientLogger.ts` (a lightweight wrapper that POSTs to `/api/log`, or in dev uses `console` but in prod is a no-op). Check if this wrapper already exists before creating it.
- `src/lib/services/securityMonitor.ts:370` — `console.error('CRITICAL SECURITY ALERT:', alert)` → `logger.fatal({ alert }, 'CRITICAL SECURITY ALERT')` — if this file is client-side, POST the alert to a server endpoint that calls logger.fatal.
- `src/lib/services/homeLoanApi.ts:146` (and 5 more in the same file) — replace all `console.error` with clientLogger or remove if redundant
- `src/lib/services/otpStore.ts:72` — `console.error('OTP index creation warning:', error)` → `logger.error({ err: error }, 'OTP index creation failed')` + re-throw

**Client-side component debug logs (just delete — these are restore-path debug artifacts):**
- `src/lib/components/Pensioner.svelte:59`
- `src/lib/components/SalariedPerson.svelte:61`
- `src/lib/components/SelfEmploymentOther.svelte:74`
- `src/lib/components/SelfEmploymentProfessional.svelte:65`
- `src/lib/components/UnemployedPerson.svelte:60`

Verify: `pnpm exec eslint src/lib/services/ src/lib/components/Pensioner.svelte src/lib/components/SalariedPerson.svelte src/lib/components/SelfEmploymentOther.svelte src/lib/components/SelfEmploymentProfessional.svelte src/lib/components/UnemployedPerson.svelte` shows 0 `no-console` errors.

Commit: `chore: replace bare console.* with structured logger (9 files)`

### 1D. Archive dead files — 9 files
Move (do NOT delete; MEMORY says never delete, archive instead):
```
src/lib/utils/ApplicantUtils/applicantKey.ts        → src/lib/utils/ApplicantUtils/_archive/
src/lib/utils/ApplicantUtils/computeCompletion.ts   → src/lib/utils/ApplicantUtils/_archive/
src/lib/utils/limitChecker.ts                       → src/lib/utils/_archive/
src/lib/components/Progress.svelte                  → src/lib/components/_archive/
src/lib/components/ProgressBar.svelte               → src/lib/components/_archive/
src/lib/components/Breadcrumb.svelte                → src/lib/components/_archive/
src/lib/utils/formUtils.ts                          → src/lib/utils/_archive/
src/lib/utils/hardwareFingerprint.ts                → src/lib/utils/_archive/
src/lib/config/homeLoanSchema.json                  → src/lib/config/_archive/
```

Before each move: verify with Grep that no production file imports it. If any importer exists, DO NOT archive — report it and skip.

Commit: `chore: archive 9 dead/unused files`

### 1E. Filename typos — 2 files
1. `src/lib/form/firstPage/visibilty.ts` → rename to `visibility.ts`  
   Find all importers with: `Grep "firstPage/visibilty"` and update their import paths.
2. `src/lib/config/lapLoan/questionBank/topUpDetailst.ts` → rename to `topUpDetails.ts`  
   Find all importers with: `Grep "topUpDetailst"` and update.  
   Also: check `src/lib/config/lapLoan/pages.ts` for a page ID like `topUpDetailstPage` — rename that page ID too (but check it's not serialized anywhere in MongoDB first via Grep).

Commit: `fix: correct filename typos (visibility, topUpDetails)`

### 1F. SEO — LAP stub title
File: `src/routes/(app)/form/lap/+page.svelte:1163`  
Change: `<Seo title="LAP " description="LAP loan" />`  
To: `<Seo title="Loan Against Property — DigitalDSA" description="Apply for a Loan Against Property. Compare offers from 30+ lenders in India." />`

Commit: `fix(seo): replace LAP form stub title with proper SEO content`

### Verification (run at end)
```bash
pnpm check          # expect 0 errors, 0 state_referenced_locally warnings
pnpm test:unit      # expect 9,909 passing (or whatever the current baseline + 0 regressions)
```

### Update docs
Append a changelog entry to `docs/CHANGELOG.md` describing this batch.
Update `docs/DEVELOPMENT-PLAN.md` — mark Batch 1 items as complete.

**Branch:** `main` only. Do not create branches.  
**No Co-Authored-By lines in commits.**

─── END PROMPT ───

---

## SESSION S75 — Security Hardening
> Duration: 2–3 hrs · Risk: Medium · Prereqs: S74 complete · Sequential with S76, S77, S78

─── BEGIN PROMPT ───

You are working on DigitalDSA-V3. Read these first:
1. `CLAUDE.md`
2. `docs/RESOLUTION-PLAN.md` sections BATCH 2 (all of 2A–2E)
3. `docs/SESSION-HANDOFF.md`

**Your scope is BATCH 2 only.** Follow the plan strictly. After each sub-batch, verify and commit.

### 2A. SEC-7: Remove JWT from URL query param
File: `src/routes/api/auth/validate-token/+server.ts`  
Current (line ~120): `let token = url.searchParams.get('token')` — then falls back to cookie.

**Pre-fix research (mandatory):** Before removing the URL-param path, grep for all callers:
- `Grep "/validate-token?token"`
- `Grep "validate-token.*searchParams"`
- Check `src/lib/` for any client code that hits this endpoint with `?token=`

If any production client uses the URL-param path, DO NOT remove it silently. Instead:
- Log a deprecation warning using `logger.warn` when the URL-param path is used
- Open a follow-up task note in the commit message

If no production caller uses it, remove the URL-param path entirely — keep only the cookie/Authorization-header path.

Commit: `security: remove JWT from URL query param in validate-token (SEC-7)`

### 2B. SEC-8: Command injection allowlist in test runner
File: `src/routes/api/test/run-vitest/+server.ts:22`  
Dev-only endpoint (`if (!dev) throw error(404)`), but still vulnerable.

Add at the top of the handler, after the dev check:
```typescript
if (pattern && !/^[\w\-./]+$/.test(pattern)) {
  return apiError(400, 'Invalid test pattern');
}
```
Use `apiError` from `$lib/server/apiResponse` (per CLAUDE.md).

Commit: `security: allowlist pattern in dev test runner (SEC-8)`

### 2C. Rate-limit 2 missing public endpoints
Files:
- `src/routes/api/newsletter/subscribe/+server.ts`
- `src/routes/api/share-link/validate/+server.ts`

Add `rateLimit()` call at top of POST handler. Copy the pattern used in `src/routes/api/auth/restore-account/+server.ts`. Use an aggressive limit (e.g., 5 requests per minute per IP for both).

Commit: `security: add rate limiting to newsletter/subscribe and share-link/validate`

### 2D. Sanitize user name in delete-account email
File: `src/routes/api/auth/delete-account/+server.ts:161`  
Before interpolating `name` and `roleLabel` into the subject/body, strip CRLF:
```typescript
const safeName = String(name ?? '').replace(/[\r\n]/g, '');
const safeRole = String(roleLabel ?? '').replace(/[\r\n]/g, '');
```
Use `safeName`/`safeRole` in all template strings (subject + HTML body).

Commit: `security: strip CRLF from user name in delete-account email (prevents header injection)`

### 2E. Scope CSRF dev bypass to localhost only
File: `src/hooks.server.ts:27`  
Current: `if (dev) return true;`  
Replace with:
```typescript
if (dev && (event.url.hostname === 'localhost' || event.url.hostname === '127.0.0.1')) {
  return true;
}
```

Commit: `security: limit CSRF dev bypass to localhost (prevents bypass via tunnels/ngrok)`

### Verification
```bash
pnpm check          # 0 errors
pnpm test:unit      # 9,909+ passing
```

Add changelog entry. Update RESOLUTION-PLAN.md — mark BATCH 2 items done.  
**Branch:** `main`. No Co-Authored-By.

─── END PROMPT ───

---

## SESSION S76 — Performance Part 1 (Auth + Cases + Wizard + Digest)
> Duration: 6–8 hrs · Risk: Medium-High · Prereqs: S75 complete · Sequential with S77

─── BEGIN PROMPT ───

You are working on DigitalDSA-V3. Read first:
1. `CLAUDE.md` — especially "Execution Path Verification (TOP PRIORITY)" section
2. `docs/RESOLUTION-PLAN.md` sections BATCH 3 (3A–3D only; 3E/3F are in S77)
3. `docs/SESSION-HANDOFF.md`

**Your scope is sub-batches 3A, 3B, 3C, 3D only.** Do not touch rule engine (evaluationEngine / engineContext) — those are S77.

For each fix: (1) trace the execution path, (2) implement, (3) verify tests still pass, (4) commit separately.

### 3A. Auth hook: parallel DB lookups in primary path
File: `src/hooks.server.ts` around line 207 (in `setUserFromToken`).

**Trace first:** Read lines 200–290 to understand the current waterfall. There's already a `Promise.all` version at lines 57–63 in the refresh-token path — use that as a model.

**Fix:** Replace the sequential `Applicant.findOne` → `DsaApplications.findOne` → `RmApplications.findOne` → `Admins.findOne` chain with a single `Promise.all`. Pick the first non-null result.

**Critical:** The current code determines `userType` from WHICH collection returns the document. Preserve this logic — after `Promise.all`, check `applicant ? 'applicant' : dsa ? 'dsa' : rm ? 'rm' : admin ? 'admin' : null` and set `userType` accordingly.

Run `pnpm test:unit` to confirm auth-related tests still pass.

Commit: `perf(auth): parallelize 4-collection user lookup in primary auth path`

### 3B. Cases: MongoDB pagination
Files:
- `src/routes/dashboard/dsa/cases/+page.server.ts:185`
- `src/routes/dashboard/dsa/+page.server.ts:281` (dashboard stats)

**For cases list (3B.1):**
- Add URL params: `page` (default 1), `pageSize` (default 20, max 100)
- Use MongoDB `.skip((page-1) * pageSize).limit(pageSize)` on the query
- Also run a `Cases.countDocuments(filter)` in parallel to get `total`
- Return `{ cases, total, page, pageSize }` instead of just `{ cases }`
- Update the page component to accept the new props and render pagination UI

**For dashboard stats (3B.2):**
- Replace the in-memory loops with a single MongoDB aggregation:
  ```typescript
  Cases.aggregate([
    { $match: { dsa_id: dsaId, is_archived: { $in: [false, null] } } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ])
  ```
- Adapt the aggregation output to match the current stats structure

**Critical:** Before changing the page component, check if `+page.svelte` reads `data.cases.length` anywhere for logic (not just display). If yes, switch those usages to `data.total`.

Commit 1: `perf(cases): MongoDB pagination for cases list (skip/limit + countDocuments)`
Commit 2: `perf(dashboard): replace in-memory stats loop with MongoDB aggregation`

### 3C. wizardState: memoize section completion
File: `src/lib/components/form-wizard/wizardState.svelte.ts:78`

**Trace first:** Read the full file. Understand `computeSectionCompletion` and `computeProgress`. Note the 11+ `for (section → subsection → pageIds)` patterns.

**Approach:**
1. Extract per-page completion into a separate `computePageCompletion(pageId, answers, schema)` function — this can be memoized with a simple Map cache keyed by `pageId` + hash of that page's answers.
2. `computeSectionCompletion` and `computeProgress` should call `computePageCompletion` and aggregate, rather than repeating the inner logic.
3. For the reactive layer: use `$derived.by(() => { ... })` so completion only recomputes when its dependencies (schema or answers) change.

**Testing:** There are likely wizard state tests. Run `pnpm test:unit src/lib/components/form-wizard/` to verify no regressions.

Commit: `perf(wizard): memoize per-page completion to eliminate triple-nested loop on every keystroke`

### 3D. Notifications digest: batch with $in
File: `src/routes/api/notifications/digest/+server.ts:47`

**Fix:**
```typescript
// Extract user IDs from the aggregation result
const userIds = unreadByUser.map(g => g._id);

// Single batched query
const dsaDocs = await DsaApplications.find({ user_id: { $in: userIds } }).toArray();
const dsaByUserId = new Map(dsaDocs.map(d => [String(d.user_id), d]));

// Then use the Map inside the loop
for (const userGroup of unreadByUser) {
  const dsaDoc = dsaByUserId.get(String(userGroup._id));
  // ...
}
```

Also: look at `PERF-013` in the original audit — the aggregation currently matches on `{ read: false }` without a user_id filter, causing a full-collection scan. If the digest only needs users with >0 unread, keep the aggregation as-is; otherwise add a `created_at > digestWindow` filter.

Commit: `perf(notifications): batch DsaApplications lookup with $in in digest endpoint (N+1 → 1)`

### Verification
```bash
pnpm check           # 0 errors
pnpm test:unit       # all passing
pnpm build           # ensure no build-time regression
```

Manual smoke tests (if dev server available):
- Dashboard cases page loads, pagination works
- Dashboard stats render correctly
- Wizard form types smoothly (no jank on keystroke)

Update `docs/CHANGELOG.md` and `docs/RESOLUTION-PLAN.md`.  
**Branch:** `main`. No Co-Authored-By.

─── END PROMPT ───

---

## SESSION S77 — Performance Part 2 + Core Function Deduplication
> Duration: 5–6 hrs · Risk: High (touches core form engine) · Prereqs: S76 complete

─── BEGIN PROMPT ───

You are working on DigitalDSA-V3. Read first:
1. `CLAUDE.md` — especially "Critical Pitfalls" section (multi-select auto-clear, !=, server→client mapping)
2. `docs/RESOLUTION-PLAN.md` sections BATCH 3 (3E, 3F) and BATCH 4 (4A, 4B, 4C)
3. `docs/SESSION-HANDOFF.md`

**Your scope is 3E, 3F, 4A, 4B, 4C.**

**High-risk session:** These touch the form engine and rule engine. Run the full test suite (`pnpm test:unit`) after EACH sub-batch commit, not just at the end.

### 3E. evaluationEngine: batch per-lender policy queries
File: `src/lib/ruleEngine/evaluationEngine.ts:1001`

**Trace first:** Read from line ~950 to ~1100 to understand the current flow. Find `resolvePoliciesForLender` in `policyResolverBridge.ts`.

**Approach:**
1. Before the `evaluations.map(async (ev) => ...)` call, collect all `lender_id`s.
2. Fetch ALL relevant policies in a single `$in` query.
3. Build `policiesByLender: Map<lenderId, Policy[]>`.
4. Pass the map into the per-evaluation function so it can skip its own DB call.

**Check variationMatcher:** It was added in S72 and also queries the DB per-lender. Make sure it uses the same pre-fetched map.

Commit: `perf(rule-engine): batch per-lender policy queries with $in (N → 1)`

### 3F. engineContext RERA: aggregation pipeline + cache
File: `src/lib/server/formEngine/engineContext.ts`  
Three functions: `getBuildersForDistrict`, `getBuildersForState`, `getProjectsForBuilder`.

**For each:**
1. Replace the 3 sequential queries with a single aggregation using `$lookup`:
   ```typescript
   ReraProjects.aggregate([
     { $match: { district: districtId } },
     { $lookup: { from: 'ReraProjectCompanies', localField: '_id', foreignField: 'project_id', as: 'links' } },
     { $lookup: { from: 'ReraCompanies', localField: 'links.company_id', foreignField: '_id', as: 'companies' } },
     // Then shape the output
   ])
   ```
2. Add an in-memory cache: `const builderCache = new Map<string, { data: Builder[], expiresAt: number }>()`. TTL: 5 minutes. Key: `district:${districtId}` or `state:${state}`.

Also fix: `PERF-036` — the dynamic `await import('mongodb')` inside the hot function should be a top-level import.

Commit: `perf(rera): 3-hop query → single aggregation + 5min in-memory cache`

### 4A. Consolidate `isQuestionVisible` (4 copies → 1)
**Copies to remove (after rewiring):**
- `src/lib/utils/formUtils.ts:66` — already archived in S74; verify
- `src/lib/form/firstPage/visibilty.ts:5` → file was renamed to `visibility.ts` in S74
- `src/lib/form/homeLoan/visibility.ts:5`

**Canonical locations (keep these):**
- Server: `src/lib/server/formEngine/visibility.ts`
- Client: `src/lib/config/showWhenEngine.ts`

**Steps:**
1. Decide: is the canonical client version `showWhenEngine.ts` or should there be a new `$lib/utils/questionVisibility.ts`? Check what functions each consumer actually needs.
2. Find all importers of the duplicates: `Grep "isQuestionVisible"` across src/
3. Rewire imports to the canonical module
4. Delete (archive) the duplicates
5. Diff the 4 implementations first — verify they're functionally identical. If one has extra logic (e.g., the server version handles something client doesn't), document the merge.

**Critical:** CLAUDE.md says the server overrides `!=` / `!==` in JSON-Logic. The client version may not. Make sure the canonical module has the correct behavior for its consumer context.

Commit: `refactor(form-engine): consolidate isQuestionVisible (4 copies → 1 canonical)`

### 4B. Consolidate `resolveBindsTo` (5 copies → 1)
**Copies in:**
- `src/lib/form/firstPage/schema.ts`
- `src/lib/form/homeLoan/schema.ts`
- `src/lib/server/formEngine/engine.ts`
- `src/lib/components/ExistingLoanDetails.svelte`
- `src/lib/utils/formUtils.ts` (already archived if S74 ran — verify)

**Canonical:** Create `src/lib/config/schema/schemaHelpers.ts` if it doesn't exist, or use an existing shared module (check `src/lib/config/schema/` directory).

**Steps:** Same as 4A — diff the 5 impls, pick the most-correct one, move to canonical, rewire, delete.

Commit: `refactor(schema): consolidate resolveBindsTo (5 copies → 1 canonical)`

### 4C. Consolidate `buildCombinedAnswers` (3 copies → 1)
**Canonical:** `src/lib/utils/combinedAnswersMemo.ts`
**Remove:** `homeLoan/schema.ts` copy, `firstPage/schema.ts` copy.

Commit: `refactor(schema): consolidate buildCombinedAnswers (3 copies → 1 canonical)`

### Verification (run after EACH commit)
```bash
pnpm check           # 0 errors
pnpm test:unit       # expect full pass; if ANY test breaks, stop and investigate
```

Manual smoke: Run dev server, visit each loan type's form (home, LAP, plot, personal, business, professional), add an applicant, fill income — any divergence from prior behavior indicates a consolidation mistake.

Update `docs/CHANGELOG.md` and `docs/RESOLUTION-PLAN.md`.  
**Branch:** `main`. No Co-Authored-By.

─── END PROMPT ───

---

## SESSION S78 — Dep Cleanup + ESLint Sweep
> Duration: 4–5 hrs · Risk: Low-Medium · Prereqs: S77 complete

─── BEGIN PROMPT ───

You are working on DigitalDSA-V3. Read first:
1. `CLAUDE.md`
2. `docs/RESOLUTION-PLAN.md` sections BATCH 4 (4D, 4E, 4F) and BATCH 5 (5A, 5B, 5C, 5E — skip 5D)
3. `docs/SESSION-HANDOFF.md`

**Your scope: 4D, 4E, 4F, 5A, 5B, 5C, 5E. Do NOT attempt 5D (1,400 any errors) in this session.**

### 4D. Complete cleanPayloadStore migration
File: `src/lib/stores/cleanPayloadStore.ts` — marked `@deprecated`, still imported by 6 form pages.

1. Find importers: `Grep "cleanPayloadStore"`
2. Each of the 6 form page components (`professional-loan`, `lap`, `home-loan`, `plot-loan`, `business-loan`, `personal-loan` inside `src/routes/(app)/form/`) imports from this bridge. Replace each import with the direct target (check `cleanPayloadStore.ts` to see what it re-exports).
3. After all 6 are migrated, archive `cleanPayloadStore.ts` to `src/lib/stores/_archive/`.

Commit: `refactor: complete cleanPayloadStore migration (6 pages → direct imports, archive bridge)`

### 4E. Unify CSRF clients
Files: `src/lib/utils/csrf.ts` (reads `csrf-token`), `src/lib/utils/csrfClient.ts` (reads `digitaldsa_csrf`)

1. Check `src/hooks.server.ts` to see which cookie name the server sets (search for `cookies.set`). That's the canonical name.
2. Whichever file reads the OTHER (wrong) name: delete it or update it to read the canonical name.
3. Find all importers of both files. Consolidate to one.
4. Archive the removed file to `src/lib/utils/_archive/`.

Commit: `refactor: unify CSRF clients into single implementation`

### 4F. Retire v1 DSA onboarding endpoint
Files: `src/routes/api/onboarding/dsa-onboarding/+server.ts` (v1), `dsa-onboarding-v2/+server.ts` (v2)

1. Find callers of v1: `Grep "api/onboarding/dsa-onboarding[^-]"`
2. Update the caller (likely a layout.svelte or a client service) to use `-v2`.
3. Replace v1's handler with:
   ```typescript
   export const POST = async () => apiError(410, 'This endpoint is retired. Use /api/onboarding/dsa-onboarding-v2');
   ```
4. Add a note to `docs/CHANGELOG.md` about the v1 deprecation.

Commit: `refactor: retire v1 dsa-onboarding endpoint (410 Gone, v2 canonical)`

### 5A. ESLint: no-unused-vars (~200 errors)
Run:
```bash
pnpm exec eslint --rule '{"@typescript-eslint/no-unused-vars": "error"}' --fix src/
```

For remaining (non-auto-fixable) cases:
- Intentional unused callback params: prefix with `_` (e.g., `(_event, data) => {}`)
- Legit dead variables: delete
- Destructured-for-side-effect: add `// eslint-disable-next-line` with a reason

Run `pnpm check` afterward to ensure no TypeScript regression from deleted variables.

Commit: `chore: fix no-unused-vars ESLint errors (~200)`

### 5B. ESLint: svelte/require-each-key (~50 errors)
Run:
```bash
pnpm exec eslint --rule '{"svelte/require-each-key": "error"}' src/
```
This rule has no auto-fix. For each error:
- If each item has a stable unique ID: `{#each items as item (item.id)}`
- If no stable ID and order matters: `{#each items as item, i (i)}` — but be aware this reuses DOM nodes on reorder, which can break animations and form focus. Prefer generating a stable ID if possible.

Check the fix list against Svelte docs about keyed-each semantics; a bad key can be worse than no key.

Commit: `fix(svelte): add keys to {#each} blocks (~50 fixes for DOM stability)`

### 5C. ESLint: svelte/no-unused-svelte-ignore (~30 errors)
Run:
```bash
pnpm exec eslint --fix --rule '{"svelte/no-unused-svelte-ignore": "error"}' src/
```
Auto-fixable — should clean up all 30 in one pass.

Commit: `chore: remove obsolete svelte-ignore comments`

### 5E. Misc auto-fixable ESLint
```bash
pnpm exec eslint --fix src/
```
Run `pnpm check` after to catch any TypeScript regression.

Commit: `chore: auto-fix remaining ESLint issues (prefer-const, no-case-declarations, etc.)`

### Verification
```bash
pnpm check
pnpm test:unit
pnpm exec eslint src/ 2>&1 | grep -c "no-explicit-any" || true  # report count for reference
```

Report final ESLint error count in the commit summary. Expected: only `no-explicit-any` errors remain (long-tail, deferred).

Update `docs/CHANGELOG.md` and `docs/RESOLUTION-PLAN.md`.  
**Branch:** `main`. No Co-Authored-By.

─── END PROMPT ───

---

## SESSION S79 — Cross-Browser + A11y
> Duration: 3–4 hrs · Risk: Low · Prereqs: None (can run parallel with S74/S80)

─── BEGIN PROMPT ───

You are working on DigitalDSA-V3. Read first:
1. `CLAUDE.md`
2. `docs/RESOLUTION-PLAN.md` section BATCH 6 (6A–6H, all items)

**Your scope: all of BATCH 6.** CSS and ARIA changes only — no logic changes.

### 6A. color-mix() @supports fallback — 2 files
Files: `src/lib/components/CompanyIncomeTab.svelte:340`, `src/lib/components/form-wizard/FormNavigationBar.svelte:274`

Pattern (apply to each):
```css
/* Fallback for Safari < 16.2 */
background: rgba(196, 112, 112, 0.1);
@supports (background: color-mix(in srgb, red 10%, blue)) {
  background: color-mix(in srgb, var(--ddsa-error, #c47070) 10%, transparent);
}
```

Use sensible hex/rgba values matching the intent (12% of the CSS var's default).

Commit: `fix(css): add @supports fallback for color-mix() (Safari <16.2)`

### 6B. :has() @supports fallback — 2 files
Files: `src/lib/components/CustomSelect.svelte:564`, `src/lib/components/CustomIncomeTable.svelte:827`

Wrap the `:has()` rule in `@supports selector(:has(*))`. Provide a fallback rule without `:has()` if possible (e.g., using a state class added via `$effect`).

Commit: `fix(css): add @supports guard for :has() selector (Firefox <121)`

### 6C. 100vh → 100dvh fallback
File: `src/routes/(auth)/login/+page.svelte:682` and `:699`

```css
min-height: 100vh;
min-height: 100dvh;
```
(Modern browsers that support `dvh` will use the second declaration; older Safari will use the first.)

Commit: `fix(css): add 100dvh fallback for iOS Safari viewport height`

### 6D. Meta viewport maximum-scale
File: `src/app.html:5`

Change: `<meta name="viewport" content="width=device-width, initial-scale=1">`  
To: `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">`

Commit: `fix: prevent iOS auto-zoom on form inputs (viewport maximum-scale)`

### 6E. Touch targets ≥ 44px — 3 buttons
- `src/routes/(onboarding)/+layout.svelte:155` — Back button: `h-8 w-8` → `h-11 w-11` (44px)
- `src/lib/components/mobile/Topbar.svelte:63` — Logout: add `min-h-11 min-w-11` alongside existing `p-2`
- `src/lib/components/mobile/Topbar.svelte:75` — Login link: add `py-2 px-3 min-h-11`

Commit: `fix(a11y): increase touch targets to WCAG 2.5.5 minimum (44px)`

### 6F. Dashboard delete modal → focus trap
File: `src/routes/dashboard/+layout.svelte:1169`

Replace the conditional `{#if showDeleteModal}<div>` pattern with a bound `<dialog>` element:
```svelte
<dialog bind:this={deleteDialog} class="..." onclose={() => showDeleteModal = false}>
  <!-- existing content -->
</dialog>

<script>
  let deleteDialog: HTMLDialogElement;
  $effect(() => {
    if (showDeleteModal) deleteDialog?.showModal();
    else deleteDialog?.close();
  });
</script>
```
Native `<dialog>` gives you focus trap, Escape key, backdrop click handling for free. Test on Safari and Firefox after — `<dialog>` has good but not perfect support.

Commit: `fix(a11y): use native <dialog> for delete-account modal (adds focus trap)`

### 6G. Offer page spinners — ARIA live region
Files: 6 offer pages under `src/routes/(app)/(offers)/`:
- `home-loan-offers/+page.svelte`
- `business-offers/+page.svelte`
- `personal-loan-offers/+page.svelte`
- `plot-offers/+page.svelte`
- `lap-offers/+page.svelte`
- `professional-offers/+page.svelte`

Wrap each spinner:
```svelte
<div role="status" aria-live="polite" aria-label="Loading offers">
  <div class="animate-spin ..."></div>
  <span class="sr-only">Loading offers...</span>
</div>
```

Commit: `fix(a11y): add role=status + aria-live to offer page spinners`

### 6H. FloatingNav incorrect ARIA roles
File: `src/lib/components/landing/FloatingNav.svelte:128–140`

Remove `role="menubar"` from the container and `role="menuitem"` from the buttons. The element is a navigation link list, not an application menu.

Correct structure:
```svelte
<nav aria-label="Main navigation" class="nav-links">
  {#each links as link}
    <button onclick={() => scrollTo(link.target)}>{link.label}</button>
  {/each}
</nav>
```
Also fix the empty `alt=""` on the logo image (line 128) — change to `alt="DigitalDSA"`.

Commit: `fix(a11y): correct ARIA roles and logo alt on FloatingNav`

### Verification
```bash
pnpm check
pnpm test:unit
```
Manual: Run dev server, test Tab navigation through dashboard delete modal, verify no focus leak. Test offer pages in Safari/Chrome DevTools mobile emulator.

Update `docs/CHANGELOG.md` and `docs/RESOLUTION-PLAN.md`.  
**Branch:** `main`. No Co-Authored-By.

─── END PROMPT ───

---

## SESSION S80 — Test Coverage Gaps
> Duration: 4–6 hrs · Risk: Low · Prereqs: None (parallel-safe)

─── BEGIN PROMPT ───

You are working on DigitalDSA-V3. Read first:
1. `CLAUDE.md`
2. `docs/RESOLUTION-PLAN.md` section BATCH 7 (all)

**Your scope: 7A, 7B, 7C.** Add missing tests only — do not modify production code unless the test reveals a real bug (in which case, stop and report).

### 7A. sameCompanySync tie-breaking test
File: extend `src/lib/utils/companyManagement/sameCompanySync.test.ts` (or the current location — Grep for it).

**Gap:** No test for identical `updatedAt` timestamps.

Add a test: two applicant entries for the same company, both with `updatedAt = new Date('2026-01-01T00:00:00.000Z')`. Assert that the sync result is deterministic (e.g., always picks the one with smaller `applicant_id`, or always picks index 0). Read the current implementation to understand which tie-break rule is in place, then test that rule explicitly.

Commit: `test: add tie-breaking case for sameCompanySync (identical updatedAt)`

### 7B. stakeholderManagement isDirectorSkippable MEDIUM case
File: extend `src/lib/utils/stakeholderManagement.test.ts` (confirm path with Grep).

**Gap:** `isDirectorSkippable` has no test for MEDIUM family dominance (20%–50% stake).

Add tests for three cases:
- LOW (<20% family stake) — director NOT skippable
- MEDIUM (20–50%) — depends on the rule; read the source to determine expected behavior
- HIGH (>50%) — director skippable

Commit: `test: add MEDIUM family dominance cases for isDirectorSkippable`

### 7C. ObligationCapture component tests
File: create `src/lib/components/ObligationCapture.test.ts`

Use `@testing-library/svelte` pattern (find an example in any existing `*.test.ts` file under components).

Cover:
1. Component renders given minimal props (mount test)
2. EMI input accepts numeric and formats as INR
3. FOIR field displays correctly based on prop
4. Evidence upload button is rendered and clickable
5. Done button is disabled when required fields are empty
6. Done button enabled when all required fields filled
7. Error messages show for invalid EMI (negative, non-numeric)

Don't try to test all 1,115 lines. 7–10 tests covering the main user-visible states is enough for a first pass.

Commit: `test: add component tests for ObligationCapture (core UI states)`

### Verification
```bash
pnpm test:unit       # expect 9,909+ previous + new tests = higher count
pnpm check           # 0 errors
```

Report new test count in final summary.

Update `docs/CHANGELOG.md` and `docs/RESOLUTION-PLAN.md`.  
**Branch:** `main`. No Co-Authored-By.

─── END PROMPT ───

---

## SESSION S81 — Phase H: Pre-Launch Critical
> Duration: 8–10 hrs + 24–48h DNS wait · Risk: HIGH (affects production) · Prereqs: ALL prior sessions complete · **RUN ALONE**

⚠️ **Do not run this session in CoWork parallel with anything.** Run it last, in a dedicated window.

─── BEGIN PROMPT ───

You are executing Phase H of the DigitalDSA-V3 production launch checklist. This session rotates credentials and migrates email infrastructure. It WILL invalidate all active user sessions and WILL have a DNS propagation window of 24–48 hours.

**Pre-requisites (verify before starting):**
- All prior sessions (S74–S80) are complete and merged to main
- `pnpm check` shows 0 errors
- `pnpm test:unit` passes
- You have admin access to all third-party dashboards (Atlas, Razorpay, MSG91, ImageKit, Anthropic, domain DNS)
- A maintenance window has been announced to users

Read first:
1. `CLAUDE.md` — PRODUCTION BLOCKERS section
2. `docs/RESOLUTION-PLAN.md` section BATCH 8
3. `docs/specs/EMAIL-HARDENING-PLAN.md` — full email migration spec
4. `docs/SESSION-HANDOFF.md`

### 8A. Credentials rotation (sequential, one at a time)
For each credential below:
1. Generate a new value in the third-party dashboard
2. Update the corresponding `.env.production` (or your deployment secrets manager)
3. Deploy
4. Verify the new credential works end-to-end
5. Revoke the old credential in the dashboard

Order (least to most disruptive):
1. **AI/Anthropic API key** (least disruptive — background only)
2. **ImageKit private key**
3. **Razorpay key + secret**
4. **MSG91 auth key**
5. **SMTP credentials** (if still using before email migration in 8C)
6. **HMAC/CSRF secret** (`CSRF_SECRET` in env)
7. **Encryption key** — WARNING: if you have encrypted data at rest, decrypt with old key and re-encrypt with new
8. **JWT refresh secret** (`JWT_REFRESH_SECRET`) — invalidates all refresh tokens; all users will need to re-login
9. **JWT access secret** (`JWT_SECRET`) — same
10. **MongoDB Atlas password** — LAST and MOST DISRUPTIVE; update connection string in all environments simultaneously

Do NOT commit any credential to git.

### 8B. Git history purge
After 8A is complete and verified:

```bash
# Back up the current repo first
cp -r . ../DigitalDSA-V3.backup

# Purge .env from history
git clone --mirror <repo-url> repo.git
cd repo.git
bfg --delete-files .env
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Push force (this will require coordination — all team clones will need re-clone)
git push --force
```

After: ensure `.gitignore` has `.env` explicitly, and `.env.example` is present for documentation.

### 8C. Email hardening (Nodemailer → SES or SendGrid)
Follow the spec in `docs/specs/EMAIL-HARDENING-PLAN.md`. Key steps:
1. Create SES account (recommended — same AWS bill, better deliverability) or SendGrid
2. Add `digitaldsa.com` as a verified sender domain
3. Add SPF, DKIM, DMARC DNS records to domain registrar
4. Wait for DNS propagation (24–48h)
5. Replace the transporter in `src/lib/server/email.ts` with the SES SDK (`@aws-sdk/client-ses`)
6. Test: send a test email via each flow — OTP, billing, notifications, delete-account, share-with-rm
7. Wire up SES bounce webhook to the existing `handleEmailBounce` function (currently a TODO in email.ts)
8. Remove Nodemailer from dependencies once verified

Commit: `infra(email): migrate from Nodemailer SMTP to AWS SES with SPF/DKIM/DMARC`

### Verification checklist
- [ ] All 10 credentials rotated and old versions revoked
- [ ] `.env` purged from git history
- [ ] `.gitignore` blocks `.env`
- [ ] SPF/DKIM/DMARC propagated (check at `dig +short TXT digitaldsa.com`)
- [ ] Test email delivered successfully from each flow
- [ ] Bounce webhook receives test bounce
- [ ] `pnpm build` succeeds with new env
- [ ] Production deployment smoke tests pass

Mark MEMORY.md items PB-7 and PB-8 as COMPLETED. Move them from "Pre-Launch Critical" to "COMPLETED" section.

Update `docs/CHANGELOG.md` with a Session 81 entry describing the full Phase H completion.

**Branch:** `main`. No Co-Authored-By.

─── END PROMPT ───

---

## SESSION GUIDE — PARALLEL EXECUTION MATRIX

| Session | Can run parallel with | Must run after |
|---|---|---|
| S74 | S79, S80 | — |
| S75 | — | S74 |
| S76 | — | S75 |
| S77 | — | S76 |
| S78 | — | S77 |
| S79 | S74, S80 | — |
| S80 | S74, S79 | — |
| S81 | NONE | ALL |

**Recommended execution order:**

**Wave 1** (parallel in separate CoWork sessions):
- S74 — Quick wins
- S79 — A11y + CSS
- S80 — Test gaps

**Wave 2** (sequential):
- S75 — Security
- S76 — Performance part 1
- S77 — Performance part 2 + consolidation (HIGHEST RISK)
- S78 — Cleanup + ESLint

**Wave 3** (alone):
- S81 — Phase H (pre-launch)

**Total calendar time:** 1 week of focused work, plus 24–48h DNS wait for S81.

---

## CoWork BEST PRACTICES FOR THIS PROJECT

1. **Always worktree-isolated.** Use CoWork's isolated mode to avoid conflicts between parallel sessions.
2. **Read CLAUDE.md first every session.** Project invariants are strict.
3. **Run `pnpm check` and `pnpm test:unit` after EACH commit.** Regressions compound fast.
4. **Never delete files — archive to `_archive/`.** Project convention.
5. **Never touch `.env`.** Even accidentally opening it will surface in the diff.
6. **Commit granularly.** Each sub-batch in a prompt = one commit. Easier to revert.
7. **Branch: `main` only.** No feature branches.
8. **No Co-Authored-By lines in commits.** Explicit user preference.
9. **After each session, update `docs/CHANGELOG.md` and `docs/RESOLUTION-PLAN.md`.** Keep the master plan fresh.
10. **If a session is going long:** Stop at a clean commit boundary. Record state in `docs/SESSION-HANDOFF.md`. Let the next session resume.
