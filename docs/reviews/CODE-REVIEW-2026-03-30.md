# Code Review — 2026-03-30

**Scope:** ~100 commits from `edc4246e` to `32a346c4` (Sessions 35-45: maintenance refactors, director management, stakeholder engine, EMI share, company wizard UX)
**Reviewer:** Automated daily review
**Focus:** Non-Prashant commits + security-relevant changes in core financial logic

---

## Commits by External Contributors (Not Prashant)

| Hash | Author | Summary |
|------|--------|---------|
| `7b63b563` | Anshul Singh | builder and project selection implemented |
| `2a046b89` | Mrityunjay Kumar | LAP showWhen conditions for zone/tax questions |

---

## CRITICAL Issues

### 1. `applicantEmiShare` trusted from client — FOIR manipulation possible

**Commits:** `94bf2226`, obligation payload pipeline
**Confidence:** 92%
**Files:** `obligationPayload.ts:62`, `payloadEnricher.ts:163-172`, `incomeAssessor.ts:288-300`

`computeApplicantEmiShare()` runs client-side in `UnsecuredObligation.svelte`, and the result passes through `cleanObligationEntries()` to the rule engine without server-side recomputation. A DSA could craft `applicantEmiShare: 1` on a 50,000 EMI, making FOIR appear near-zero and inflating eligibility.

All inputs needed to recompute (`emi`, `borrowerCount`, `role`, `emiMethod`) are already in the payload. **Fix:** Recompute `applicantEmiShare` server-side in `cleanObligationEntries()` or `payloadEnricher.ts` using `computeApplicantEmiShare()`, ignoring the client value.

### 2. Silent `new ObjectId()` on parse failure creates random IDs in queries

**Commit:** `7b63b563` (Anshul)
**Confidence:** 95%
**File:** `engineContext.ts:280, 331`

```ts
try { return new ObjectId(id); } catch { return new ObjectId(); }
```

When a malformed ID is encountered, a random ObjectId is created and included in `$in` queries. This masks data integrity issues and could theoretically match unintended documents. **Fix:** Filter out invalid IDs instead of generating random ones.

---

## IMPORTANT Issues

### 3. New `/api/form/builder-projects` endpoint skips project conventions

**Commit:** `7b63b563` (Anshul)
**Confidence:** 90%
**File:** `src/routes/api/form/builder-projects/+server.ts`

- Uses raw `json()` instead of `apiOk()`/`apiError()`/`apiServerError()`
- Error at line 114 exposes raw `err.message` to client (information leak)
- Missing `typeof builder !== 'string'` type guard on `projects` action (could throw TypeError)

Auth guard (`requireAuthApi`) and `parseJsonBody` are correctly used.

### 4. `{@html question.description}` XSS risk in home-loan page

**Commit:** `7b63b563` (Anshul)
**Confidence:** 82%
**File:** `src/routes/(app)/form/home-loan/+page.svelte:2102`

Only this form page renders `question.description` via `{@html}`. Since `resolveText()` interpolates answer values into description templates, a user-entered state/city name containing `<script>` tags could execute. Other form pages pass `description` as a prop to components that escape it.

### 5. MongoDB regex injection in `/api/cases` search

**Pre-existing, noted during `a3bc3dea` review**
**Confidence:** 85%
**File:** `src/routes/api/cases/+server.ts:73`

```ts
const searchRegex = { $regex: search, $options: 'i' };
```

User-supplied `search` param used directly as regex without escaping. Enables ReDoS via catastrophic backtracking patterns. Authenticated-only, but should still escape special chars.

### 6. Silent exception swallowing in engineContext.ts

**Commit:** `7b63b563` (Anshul)
**Confidence:** 85%
**File:** `engineContext.ts:291, 344, ~413, ~467`

All `catch` blocks return empty arrays with no `logger.error()` call. If the `brokerData` database is unreachable, builder/project lookups silently fail with no trace in logs.

### 7. `countDocuments({ limit: 1 })` — limit option ignored by driver

**Commit:** `7b63b563` (Anshul)
**Confidence:** 80%
**File:** `engineContext.ts:457-465`

MongoDB driver's `countDocuments` does not accept `limit`. The option is silently ignored, causing a full collection scan. Use `findOne({ projection: { _id: 1 } })` instead.

---

## Minor / Informational

### 8. LAP showWhen — Plot properties skip compliance but show tax question

**Commit:** `2a046b89` (Mrityunjay)
**Confidence:** 85%

For `constructionType = 'Plot'`, none of the compliance variants fire (they all exclude Plot). But `municipalTaxStatus` becomes visible via the `zoneClassification != ''` branch. This means Plots have tax status but no compliance status — confirm this is intentional and the rule engine handles it.

### 9. E11000 retry loop — correctly bounded (no issue)

**Commit:** `a3bc3dea`

Retry loop is bounded at 5 attempts with proper `lastErr` re-throw on exhaustion. No infinite loop risk.

---

## What Was Done Well

- **Auth guards consistent:** All new API endpoints use `requireAuthApi(locals)`. No auth bypass found.
- **`parseJsonBody` used correctly** in builder-projects endpoint.
- **`escapeRegex()` applied** to all user-supplied strings in builder/project MongoDB queries — prevents regex injection there.
- **EMI share calculator is well-tested:** 22 unit tests cover the computation logic. The issue is purely about where it runs (client vs server).
- **Stakeholder management** (`5cc3aff0`): Family dominance is derived entirely server-side. No client manipulation possible.
- **Company wizard UX** (`32a346c4`): No new API endpoints. All mutation through existing guarded routes.
- **Director linking** (`4766f157`): Pure utilities called server-side in evaluate-and-persist pipeline.

---

## Action Items

| # | Severity | Owner | Action |
|---|----------|-------|--------|
| 1 | Critical | Prashant | Recompute `applicantEmiShare` server-side in payload pipeline |
| 2 | Critical | Anshul | Fix `new ObjectId()` fallback in `engineContext.ts` |
| 3 | Important | Anshul | Refactor builder-projects to use `apiOk`/`apiError`/`apiServerError` |
| 4 | Important | Anshul | Remove `{@html question.description}` from home-loan page |
| 5 | Important | Prashant | Escape regex in `/api/cases` search query |
| 6 | Important | Anshul | Add `logger.error()` to all catch blocks in `engineContext.ts` |
| 7 | Important | Anshul | Replace `countDocuments` with `findOne` for existence checks |
| 8 | Minor | Mrityunjay | Confirm Plot→tax-status path is intentional (no compliance status) |
