# Dashboard Wiring & Hardening Plan — 2026-04-25

**Author:** Claude (Opus 4.7) + Prashant
**Status:** Planning — implementation not yet started
**Scope:** DSA, RM, and Admin dashboards. Identifies broken, half-built, misaligned, and polish-level gaps. Proposes batched implementation with explicit guards and rollback paths.

---

## 1. Executive Summary

A three-dashboard audit surfaced **55 distinct findings** that fall into four severity buckets. The single dominant theme is **CSRF protection drift**: ~18 client-side mutating calls bypass the `secureFetch` wrapper, including most of the PMS encode wizard. The second theme is **PMS upload UX is half-built** — the encode and delta wizards expect pasted text, the file-upload mode is a "coming soon" placeholder, and the Policy Library lender cards are non-clickable, leaving RMs with no discoverable path from "lender added" to "first encode". A third theme is **two AI providers diverging silently**: the legacy admin parser uses Google Gemini via `AI_API_KEY`, while the new PMS pipeline uses OpenAI via `OPENAI_API_KEY`, and the user has been told only one needs setting.

**Findings tally:**

| Severity | DSA | RM | Admin | Cross-cutting | Total |
|---|---|---|---|---|---|
| BROKEN | 3 | 4 | 5 | — | **12** |
| HALF-BUILT | 6 | 7 | 9 | — | **22** |
| MISALIGNED | 2 | 4 | 6 | — | **12** |
| POLISH | 3 | 4 | 2 | — | **9** |
| **Total** | **14** | **19** | **22** | — | **55** |

Cross-cutting issues (counted within their home dashboard, not double-counted): CSRF coverage, env-var documentation, admin impersonation banner placement, legacy↔PMS parser confusion.

**Recommended approach:** five sequential batches, each landing as one commit, type-check + tests green, no batch larger than ~10 file changes. **Total estimated effort: 8-12 hours of focused work.** Implementation does not start until this plan is signed off.

---

## 2. Methodology

Three parallel `Explore` agents audited their respective dashboards with the same finding template (`[SEVERITY] file:line — problem — fix`). They were briefed to be concrete (no speculation), to grep for known anti-patterns (`fetch(` without `secureFetch`, raw `console.log`, `state_referenced_locally`), and to verify role guards on `+page.server.ts` files.

**What this audit does NOT cover:**
- PMS Phase 8 (evaluation engine wiring) — separate spec, see memory note `project_pms_plan.md`.
- Server-side rule engine internals.
- E2E test coverage for fixed flows (will be addressed per-batch).
- Performance, accessibility deep-dive, or i18n completeness.
- Mobile (Capacitor) flows beyond what's web-rendered.

---

## 3. Findings

### 3.1 RM Dashboard (19 findings)

#### BROKEN

| # | File:Line | Problem | Fix |
|---|---|---|---|
| R-B-1 | `dashboard/rm/submissions/new/+page.svelte:42` | Raw `fetch()` POST to `/api/rm/submissions` — no CSRF token. | Replace with `secureFetch` from `$lib/utils/csrf`. |
| R-B-2 | `dashboard/rm/review/[version_id]/+page.svelte:100` | Raw `fetch()` POST to `/api/rm/review/:id/respond` — no CSRF. | Same. |
| R-B-3 | `dashboard/rm/communication/+page.svelte:220` | Raw `fetch()` POST to `/api/rm/threads/:id/messages` — no CSRF. | Same. |
| R-B-4 | `dashboard/rm/dsa-search/+page.svelte:38, 70` | Raw `fetch()` for preferred-DSAs and search-DSAs. Inconsistent with broadcasts page line 52. | Same. |

#### HALF-BUILT

| # | File:Line | Problem | Fix |
|---|---|---|---|
| R-H-1 | `dashboard/rm/policies/[lenderId]/[product]/encode/_steps/Step0Setup.svelte:126-136` | File-upload mode is a placeholder — only paste-text works. Pipeline endpoint accepts text-only. | Implement real PDF upload + server-side text extraction (`pdfjs-dist`). See §6.4. |
| R-H-2 | `dashboard/rm/policies/[lenderId]/[product]/delta/_steps/Step0Upload.svelte:70-83` | Filename says "Step0Upload" but UI is paste-text only. | Same as R-H-1, applied to delta wizard. |
| R-H-3 | `dashboard/rm/policies/+page.svelte:72-100` | Active assignment lender rows render as plain `<div>` — no link to detail/encode/edit/delta wizards. | Wrap in `<a href="/dashboard/rm/policies/{lenderId}/home">` and add product picker on the lender detail page. |
| R-H-4 | `dashboard/rm/policy-capture/+page.svelte` | Legacy feature, possibly orphaned. No clear connection to the modern PMS Policies workflow. | Confirm with stakeholder; if dead, move to `_archive/`. |
| R-H-5 | `dashboard/rm/review/[version_id]/+page.svelte` | Page exists but no in-app navigation paths to it from cases, policies, or notifications. | Either wire from notifications/inbox or archive if unused. |
| R-H-6 | `dashboard/rm/cases/[case_id]/+page.svelte` | Case detail has no CTAs to "assign to lender" or "submit policy update" — case↔policy linkage is implicit. | Add explicit linkage section (out of this batch's scope; flag to product). |
| R-H-7 | `dashboard/rm/submissions/[submission_id]/+page.svelte` | Detail page exists but new-submission flow may not actually populate it. | Trace data flow from submissions/new → submission_id detail; fix or archive. |

#### MISALIGNED

| # | File:Line | Problem | Fix |
|---|---|---|---|
| R-M-1 | `dashboard/rm/communication/+page.svelte:66` | Svelte 5 `state_referenced_locally` warning on `initThreadId`. | Convert to `$derived(...)` from `$page.url.searchParams`. |
| R-M-2 | `dashboard/rm/policies/onboard-lender/+page.svelte:9, 19` | Two `state_referenced_locally` warnings — `selectedLenderId` and `purpose` capture initial value only. | `purpose = $derived(...)`; `selectedLenderId` initialized via `untrack(() => ...)` since it must be user-mutable. |
| R-M-3 | `dashboard/rm/policies/[lenderId]/[product]/encode/+page.svelte` (multiple lines: 94, 116, 153, 197, 241, 309, 330) | Encode wizard uses raw `fetch()` for `/api/pms/pipeline`, `/api/pms/policies`, `/api/pms/otp/*`. | Replace all with `secureFetch`. |
| R-M-4 | `dashboard/rm/policies/[lenderId]/[product]/edit/+page.svelte:84` | Save-to-draft PATCH uses raw `fetch()`. | `secureFetch`. |

#### POLISH

| # | File:Line | Problem | Fix |
|---|---|---|---|
| R-P-1 | `dashboard/rm/dsa-search/+page.svelte:27-31, 84-86` | Silent failures — no toast/feedback on network errors. | Add minimal error toast or inline error state. |
| R-P-2 | `dashboard/rm/policies/[lenderId]/[product]/delta/+page.svelte:56` | Raw `fetch()` on apply-delta POST. | `secureFetch`. |
| R-P-3 | `dashboard/rm/cases/[case_id]/+page.svelte` | Likely missing structured error handling on data fetches. | Audit during Batch 5 (polish). |
| R-P-4 | `dashboard/rm/policies/+page.svelte:156-171` | Empty-state CTA leads to onboard-lender, but no contextual help on what happens after onboarding. | Add 1-line subtext "After verification, you can upload your bank's policy document". |

### 3.2 DSA Dashboard (14 findings)

#### BROKEN

| # | File:Line | Problem | Fix |
|---|---|---|---|
| D-B-1 | `dashboard/dsa/shared-links/+page.svelte:95` | Raw `fetch()` POST to `/api/share-link/revoke`. | `secureFetch`. |
| D-B-2 | `dashboard/dsa/profile/+page.svelte:29, 47` | `handleSave()` and `handleComplete()` POST to `/api/onboarding/dsa-onboarding-v2` with raw `fetch()`. | `secureFetch` on both. |
| D-B-3 | `dashboard/dsa/cases/[case_id]/file-builder/+page.svelte:130` | Auto-save `performSave()` PATCH `/api/cases/{id}/file-config` — raw `fetch()`. | `secureFetch`. |

#### HALF-BUILT

| # | File:Line | Problem | Fix |
|---|---|---|---|
| D-H-1 | `dashboard/dsa/analytics/+page.server.ts:19` | No explicit `requireRole(locals, 'dsa')`. Layout parent has it, but defense-in-depth is missing. | Add explicit guard. |
| D-H-2 | `dashboard/dsa/crm/+page.server.ts:182` | Same as D-H-1. | Add `requireRole`. |
| D-H-3 | `dashboard/dsa/profile/+page.server.ts:9` | Same. | Add `requireRole`. |
| D-H-4 | `dashboard/dsa/shared-links/+page.server.ts:17-19` | Uses `if (!locals.user)` instead of `requireRole`. | Replace with `requireRole(locals, 'dsa')`. |
| D-H-5 | `dashboard/dsa/rm-contacts/+page.server.ts:18-20` | Same. | Same. |
| D-H-6 | `dashboard/dsa/communication/+page.server.ts:14` | No explicit role guard. | Add. |

#### MISALIGNED

| # | File:Line | Problem | Fix |
|---|---|---|---|
| D-M-1 | `dashboard/dsa/crm/leads/+page.svelte:61, 86` | `createLead()` uses raw `fetch()`; `convertLead()` uses `secureFetch`. Inconsistent. | Wrap line 61. |
| D-M-2 | `dashboard/dsa/team/+page.svelte:33, 56, others` | `createTeam()` and `inviteMember()` use raw `fetch()`; `removeMember()`/`toggleSuspend()` use `secureFetch`. | Wrap both. |

#### POLISH

| # | File:Line | Problem | Fix |
|---|---|---|---|
| D-P-1 | `dashboard/dsa/+page.svelte:29` | DSA doc cast to `any`. | Define explicit interface or use `unknown` + type guard. |
| D-P-2 | `dashboard/dsa/profile/+page.server.ts:100, 104, 105` | Three more `any` casts on DSA doc. | Define `DsaOnboardingV2` interface; replace casts. |
| D-P-3 | `dashboard/dsa/cases/[case_id]/results/+page.svelte:42` | `// svelte-ignore state_referenced_locally` — verify it's actually needed. | Read context; either keep with comment explaining WHY or refactor to `$derived`. |

### 3.3 Admin Dashboard (22 findings)

#### BROKEN

| # | File:Line | Problem | Fix |
|---|---|---|---|
| A-B-1 | `dashboard/admin/users/+page.svelte:47-50` | `toggleSuspend()` PATCH with raw `fetch()`. | `secureFetch`. |
| A-B-2 | `dashboard/admin/+page.svelte:191` | `seedTestData()` POST with raw `fetch()`. | `secureFetch`. |
| A-B-3 | `dashboard/admin/policies/[artifact_id]/+page.svelte:62` | `callAction()` for parse/publish/review uses raw `fetch()`. | `secureFetch`. |
| A-B-4 | `dashboard/admin/policies/[artifact_id]/+page.svelte:102` | DELETE artifact uses raw `fetch()`. | `secureFetch`. |
| A-B-5 | `api/admin/policies/[artifact_id]/reparse/+server.ts:100` | On AI failure, status silently reverts to `in_review`. Admin sees no failure indication on reload. | Set `status: 'parse_error'` and surface message in response. |

#### HALF-BUILT

| # | File:Line | Problem | Fix |
|---|---|---|---|
| A-H-1 | `dashboard/admin/policies/approvals/+page.svelte:72, 96` | `callVersionAction()` and `callSubmissionAction()` use raw `fetch()`. | `secureFetch`. |
| A-H-2 | `dashboard/admin/rm-assignments/+page.svelte:82, 111` | `confirmTransfer()` and `suspendAssignment()` use raw `fetch()`. | `secureFetch`. |
| A-H-3 | `dashboard/admin/settings/+page.svelte:102, 132, 158, 191, 218` | API key + system config mutations all raw `fetch()`. | `secureFetch` everywhere. |
| A-H-4 | `dashboard/admin/policies/pms/[policyId]/+page.svelte:31-34` | `compareBlocked` UI gates "Run comparison" but discrepancy details are never shown. Dead-end. | Add discrepancy panel + "Mark as reviewed" action. (Larger work — flag for product.) |
| A-H-5 | `dashboard/admin/settings/+page.server.ts` | Permission check for API key mutations may not match API guard `requireAdminPermission(locals, 'system_settings')`. | Audit + align. |
| A-H-6 | `dashboard/admin/+layout.svelte` | Admin layout does NOT render `<AdminImpersonationBanner>` even when `locals.adminActingAs` is set. RM layout does. | Add banner. |
| A-H-7 | `dashboard/admin/users/+page.svelte:56` | `catch { }` swallows suspend errors silently. | Surface error to user. |
| A-H-8 | `dashboard/admin/policies/[artifact_id]/+page.svelte` (multiple) | Parse/reparse response missing `fields_count`, `average_confidence`, `critical_errors`. Admin can't tell what was parsed without drilling into Mongo. | Extend response shape. |
| A-H-9 | `.env.example` | Missing `OPENAI_API_KEY`, `PMS_SIGNING_SECRET`, `AI_API_KEY`, `AI_PROVIDER`, `AI_MODEL`. | User must add manually (Claude Code policy blocks dotfile edits). |

#### MISALIGNED

| # | File:Line | Problem | Fix |
|---|---|---|---|
| A-M-1 | `api/admin/policies/[artifact_id]/parse/+server.ts:13` & `reparse/+server.ts:13` | Legacy parser uses Gemini via `aiService.ts`. Confusion: user paid for OpenAI, but legacy parser still calls Gemini. | Decision needed: (a) switch legacy to OpenAI by setting `AI_PROVIDER=openai`, or (b) deprecate legacy parser entirely. |
| A-M-2 | `dashboard/admin/policies/pms/[policyId]/+page.svelte:31-34` | Comparison flow looks correct (uses `secureFetch`) but PMS endpoints are not under `/api/admin/`. Cross-trust-domain risk if PMS middleware doesn't validate admin role. | Verify `/api/pms/policies/[id]/approve|reject|legacy-compare` handlers re-check admin role. |
| A-M-3 | `dashboard/admin/+page.svelte:65-87` | Custom `fetchWithTimeout()` wrapper inconsistent with rest of codebase. | Replace with `secureFetch` (which has timeout handling internally). |
| A-M-4 | `dashboard/admin/rm-management/+page.svelte` | Triggers admin→RM impersonation, but admin layout shows no banner. Inconsistent UX. | See A-H-6. |
| A-M-5 | Cross-cutting | No clear "Back to Admin" CTA when admin is impersonating an RM. User must know about impersonation cookie or use an admin-side "Stop Impersonation" button. | Confirm `<AdminImpersonationBanner>` has the exit CTA, and surface it on admin dashboard too. |
| A-M-6 | `docs/specs/PMS-IMPLEMENTATION-PLAN.md` & code | Legacy admin policy authoring vs PMS review have overlapping responsibilities; admin sees two parsing flows with no UI guidance on which is current. | Add tooltip/banner explaining "PMS is the active flow; legacy is read-only" once Phase 8 ships. |

#### POLISH

| # | File:Line | Problem | Fix |
|---|---|---|---|
| A-P-1 | `dashboard/admin/+page.svelte:65-87` | Custom timeout wrapper. | Replace per A-M-3. |
| A-P-2 | `dashboard/admin/users/+page.svelte:56` | Silent error catch. | Surface error per A-H-7. |

---

## 4. Cross-Cutting Themes

### 4.1 CSRF coverage drift
**18 mutating client-side calls bypass `secureFetch`** across all three dashboards, despite the recent `5219c90c` "secureFetch sweep" commit which fixed 7 of them. The PMS encode wizard alone has at least 7 raw `fetch()` calls. **Why it matters:** any authenticated user can be tricked into POSTing a state-changing request from a third-party site. The hooks-level CSRF check rejects requests without the token; raw `fetch()` calls fail with a 403 in production but appear to work in dev when the token is set in cookies. The recent S89 commit fixed 3 such 403s on `/api/set-role` for exactly this reason — the lesson didn't propagate.

### 4.2 PMS upload story is text-only
The encode and delta wizards expect raw policy text (paste from PDF viewer). The "file upload" mode is a placeholder. The pipeline endpoints (`/api/pms/pipeline*`) accept `string`, not `FormData` or `application/pdf`. This is **fine for an MVP** but is the user's biggest discoverability blocker right now. Adding real PDF→text extraction is feature work, not just wiring; included in Batch 4 as optional.

### 4.3 Two AI providers, one .env
- `aiService.ts` (legacy admin): `AI_PROVIDER`/`AI_API_KEY`/`AI_MODEL`. Currently configured for Gemini, timing out at 30s.
- `aiPipeline.ts` + `deltaPipeline.ts` (PMS): `OPENAI_API_KEY`. Working.
**Recommendation:** unify on OpenAI by setting `AI_PROVIDER=openai` and `AI_API_KEY=<same OpenAI key>`. Document in `.env.example`. Plan to deprecate `aiService.ts` once PMS Phase 8 ships.

### 4.4 Admin impersonation banner missing on admin layout
RM layout renders `<AdminImpersonationBanner>` when `locals.adminActingAs` is set. Admin layout does not. Inconsistent — admin is left with a stale role state if they navigate back from impersonation.

### 4.5 Role guards inconsistent at `+page.server.ts` level
Several DSA pages rely on the layout-level guard alone. The layout guard works, but defense-in-depth (and explicit guards on each `+page.server.ts`) makes role drift easier to spot during code review.

---

## 5. Solution Approach

The plan uses **five sequential batches**, each scoped to land as a single commit with type-check + tests green:

1. **Batch 1 — CSRF sweep (high-priority, low-risk).** Replace all 18 raw `fetch()` mutations with `secureFetch`. Type-check, run unit tests, manually click through each fixed flow in dev.
2. **Batch 2 — Role guards + Svelte 5 reactivity.** Add explicit `requireRole` to the 9 DSA pages missing it. Fix the 3 `state_referenced_locally` warnings. Replace the 4 `any` casts with explicit interfaces.
3. **Batch 3 — Navigation + dead-end fixes.** Wire RM Policy Library lender cards (R-H-3). Add admin impersonation banner to admin layout (A-H-6). Surface parse errors instead of silent revert (A-B-5). Wire empty-state subtexts.
4. **Batch 4 — PMS PDF upload (optional, feature-level).** Add `<input type="file" accept="application/pdf">` to encode + delta Step 0. Server-side parse with `pdfjs-dist`. Feed extracted text to existing pipeline. Keep paste-text as fallback. Stretch goal — only do if Batches 1-3 land cleanly with time to spare.
5. **Batch 5 — Polish + documentation.** Add `OPENAI_API_KEY`, `PMS_SIGNING_SECRET`, `AI_API_KEY`, `AI_PROVIDER`, `AI_MODEL` notes to a doc that user can paste into `.env.example`. Document legacy↔PMS parser distinction. Confirm `policy-capture` archival decision. Update `docs/SESSION-HANDOFF.md` and `docs/CHANGELOG.md`.

**Sequencing rationale:** CSRF first because production-critical and lowest risk of regression. Role guards second because adjacent and shares review attention. Navigation third because user-facing impact is highest. Upload fourth because it's the only feature-level change and benefits from prior batches landing cleanly. Polish + docs last.

---

## 6. Implementation Plan with Guards

### 6.1 Batch 1 — CSRF Sweep

**Files to edit (15):**

```
src/routes/dashboard/rm/submissions/new/+page.svelte
src/routes/dashboard/rm/review/[version_id]/+page.svelte
src/routes/dashboard/rm/communication/+page.svelte
src/routes/dashboard/rm/dsa-search/+page.svelte
src/routes/dashboard/rm/policies/[lenderId]/[product]/encode/+page.svelte
src/routes/dashboard/rm/policies/[lenderId]/[product]/edit/+page.svelte
src/routes/dashboard/rm/policies/[lenderId]/[product]/delta/+page.svelte
src/routes/dashboard/dsa/shared-links/+page.svelte
src/routes/dashboard/dsa/profile/+page.svelte
src/routes/dashboard/dsa/cases/[case_id]/file-builder/+page.svelte
src/routes/dashboard/dsa/crm/leads/+page.svelte
src/routes/dashboard/dsa/team/+page.svelte
src/routes/dashboard/admin/users/+page.svelte
src/routes/dashboard/admin/+page.svelte
src/routes/dashboard/admin/policies/[artifact_id]/+page.svelte
src/routes/dashboard/admin/policies/approvals/+page.svelte
src/routes/dashboard/admin/rm-assignments/+page.svelte
src/routes/dashboard/admin/settings/+page.svelte
```

**Pattern (per file):**
```svelte
// before
import {} from '...';
const res = await fetch('/api/...', { method: 'POST', body: JSON.stringify(...) });

// after
import { secureFetch } from '$lib/utils/csrf';
const res = await secureFetch('/api/...', { method: 'POST', body: JSON.stringify(...) });
```

**Guards & checks:**
- After each file: type-check passes (`pnpm exec svelte-check --tsconfig ./tsconfig.json --threshold error`).
- After all files: full `pnpm check` (target: 0 errors, baseline 36 warnings).
- After all files: `pnpm test:unit` (target: 10,099+ passing).
- Manual smoke test in `pnpm dev`: at least one mutating action per dashboard tested live in browser. Verify the request includes `x-csrf-token` header in DevTools Network tab.
- **Risk:** if `secureFetch` was already imported under a different alias, double-import warning. Grep `secureFetch` before adding.
- **Rollback:** single commit; `git revert <sha>` if any flow breaks.

### 6.2 Batch 2 — Role Guards + Reactivity

**Files (12):**
```
src/routes/dashboard/dsa/analytics/+page.server.ts
src/routes/dashboard/dsa/crm/+page.server.ts
src/routes/dashboard/dsa/profile/+page.server.ts
src/routes/dashboard/dsa/shared-links/+page.server.ts
src/routes/dashboard/dsa/rm-contacts/+page.server.ts
src/routes/dashboard/dsa/communication/+page.server.ts
src/routes/dashboard/rm/policies/onboard-lender/+page.svelte
src/routes/dashboard/rm/communication/+page.svelte
src/routes/dashboard/dsa/+page.svelte
src/routes/dashboard/dsa/profile/+page.server.ts (any-cast removal)
src/routes/dashboard/dsa/cases/[case_id]/results/+page.svelte (verify suppression)
src/lib/types/<dsa-onboarding>.ts (new — optional, if interface justifies a file)
```

**Pattern (role guard):**
```ts
// before
export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');
  // ...
};

// after
import { requireRole } from '$lib/server/guards';
export const load = async ({ locals }) => {
  requireRole(locals, 'dsa');
  // ...
};
```

**Pattern (Svelte 5 reactivity):**
```svelte
// before (warns)
let selectedLenderId = $state<string>(data.preselectedLenderId ?? '');
const purpose = (data.purpose as 'onboarding' | 'monthly_renewal') ?? 'onboarding';

// after (no warning, reactive where needed, intentional capture where not)
import { untrack } from 'svelte';
let selectedLenderId = $state<string>(untrack(() => data.preselectedLenderId ?? ''));
const purpose = $derived<'onboarding' | 'monthly_renewal'>(
  (data.purpose as 'onboarding' | 'monthly_renewal') ?? 'onboarding'
);
```

**Guards:**
- Type-check + tests after each file.
- Verify `requireRole` doesn't break impersonation (admin acting as DSA must still pass `requireRole(locals, 'dsa')`); guards.ts:66-67 already short-circuits for admin.
- For `$derived` conversions, smoke-test the page to confirm reactivity matches user expectation.
- **Risk:** `untrack` inside `$state` initializer requires `import { untrack } from 'svelte'` — verify no naming conflict.

### 6.3 Batch 3 — Navigation & Dead-End Fixes

**Files (6):**
```
src/routes/dashboard/rm/policies/+page.svelte (lender card → link)
src/routes/dashboard/admin/+layout.svelte (impersonation banner)
src/routes/api/admin/policies/[artifact_id]/reparse/+server.ts (parse_error status)
src/routes/dashboard/admin/policies/[artifact_id]/+page.svelte (display parse_error)
src/routes/dashboard/rm/policies/+page.svelte (empty-state subtext)
src/routes/dashboard/admin/users/+page.svelte (surface suspend errors)
```

**Pattern (lender card → link):**
```svelte
// before
{#each activeAssignments as assignment (assignment.id)}
  <div class="flex items-center gap-4 px-5 py-4">
    ...
  </div>
{/each}

// after
{#each activeAssignments as assignment (assignment.id)}
  <a
    href="/dashboard/rm/policies/{assignment.lenderId}/home"
    class="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
  >
    ...
  </a>
{/each}
```

**Decision needed:** default product is `home` (most common starting product). Better: show product picker on the lender detail page. Detail page already exists at `[lenderId]/[product]/+page.svelte`. Confirm the detail page surfaces all 6 products before linking from the index card.

**Pattern (admin banner):**
```svelte
// in dashboard/admin/+layout.svelte
import AdminImpersonationBanner from '$lib/components/AdminImpersonationBanner.svelte';
const adminActingAs = $derived(($page.data as any).adminActingAs);
const targetName = $derived(($page.data as any).user?.name);

{#if adminActingAs}
  <AdminImpersonationBanner adminName={adminActingAs.name} {targetName} />
{/if}
```

**Pattern (parse_error status):**
```ts
// before (reparse/+server.ts:100)
catch (err) {
  await db.collection('policyArtifacts').updateOne({ _id }, { $set: { status: 'in_review' } });
  return apiServerError(err, 'reparse');
}

// after
catch (err) {
  await db.collection('policyArtifacts').updateOne(
    { _id },
    {
      $set: {
        status: 'parse_error',
        last_parse_error: { message: err instanceof Error ? err.message : 'Unknown', at: new Date() }
      }
    }
  );
  logger.error({ err, artifactId: _id }, 'reparse failed');
  return apiServerError(err, 'reparse');
}
```

Then admin UI displays `last_parse_error.message` in a banner so the failure is visible.

**Guards:**
- Type-check + tests.
- Manually verify lender card click goes to a working detail page (not a 500).
- Verify admin banner only renders when `adminActingAs` is non-null (avoids visual noise in normal admin sessions).
- Verify parse_error banner shows in admin UI after a forced failure (e.g., kill OpenAI key briefly).

### 6.4 Batch 4 — PDF Upload (Optional)

**Files (3-4):**
```
src/routes/dashboard/rm/policies/[lenderId]/[product]/encode/_steps/Step0Setup.svelte
src/routes/dashboard/rm/policies/[lenderId]/[product]/delta/_steps/Step0Upload.svelte
src/routes/api/pms/extract-pdf/+server.ts (NEW)
src/lib/server/pms/pdfExtractor.ts (NEW)
```

**Approach:**
- Client: `<input type="file" accept="application/pdf">`. On select, POST as `FormData` to `/api/pms/extract-pdf` (10MB max).
- Server: `pdfjs-dist` (package may already be a transitive dep; check `package.json`. If not, add via `pnpm add pdfjs-dist` and document in CHANGELOG). Extract text. Return `{ text: string, pageCount: number, fileName: string }`.
- Client populates the existing textarea with extracted text. RM reviews + edits before clicking "Start parsing".

**Guards:**
- File size check on client AND server (defense in depth).
- MIME type check on server (don't trust `Content-Type` header alone — inspect magic bytes).
- Rate-limit extract endpoint (5/min/IP).
- Error path: extraction fails → user can still paste manually.
- **Don't:** auto-submit extracted text to the pipeline. RM must review it first (sometimes PDF extraction loses structure).
- **Risk:** `pdfjs-dist` is heavy. Lazy-import in extract route only.

### 6.5 Batch 5 — Polish & Docs

**Files (2-3):**
```
docs/SESSION-HANDOFF.md (update active plan)
docs/CHANGELOG.md (append batch entries)
docs/specs/ENV-VARIABLES.md (NEW or extend existing) — for user to paste into .env.example
```

**Content:** document required env vars with descriptions, defaults, and failure modes. Note that `.env.example` cannot be edited by Claude Code (dotfile policy); user copies the doc into `.env.example` manually.

---

## 7. Dos and Don'ts (from CLAUDE.md + code review patterns)

### Dos

1. **DO** use `secureFetch` from `$lib/utils/csrf` for every state-changing client-side request (POST/PATCH/PUT/DELETE).
2. **DO** use `apiOk()` / `apiError()` / `apiServerError()` from `$lib/server/apiResponse` in API routes — no raw `Response` returns.
3. **DO** use `logger` from `$lib/server/logger` — never bare `console`.
4. **DO** use `requireRole(locals, 'dsa'|'rm'|'admin')` from `$lib/server/guards` at the top of every `+page.server.ts` `load` and every `/api/**/+server.ts` POST/PATCH/DELETE.
5. **DO** verify the execution path (memory: "Execution Path Verification — TOP PRIORITY") before claiming a fix is done — grep callers, confirm component renders in target flow.
6. **DO** use Svelte 5 runes (`$state`, `$derived`, `$effect`) in new and edited code. Use `untrack(() => ...)` for explicit one-time captures inside `$state` initializers.
7. **DO** keep batches small — one commit per batch, type-check + tests green between batches.
8. **DO** write commit messages that follow the repo style: `<type>(<scope>): <summary>`. No "Co-Authored-By" lines.
9. **DO** test UI changes in `pnpm dev` by clicking through the actual user flow before reporting "done" (memory: E2E testing is expensive — verify before claiming).
10. **DO** use human-readable variable names (memory: `maxAffordableProperty` not `mAP`).

### Don'ts

1. **DON'T** call `fetch` at module scope or in store initializers (CLAUDE.md Pitfall #4). Always inside `onMount`, event handlers, or `load` functions.
2. **DON'T** delete files. Move to `_archive/` (memory + CLAUDE.md). Applies to `policy-capture` if confirmed dead.
3. **DON'T** add features beyond what each batch requires (CLAUDE.md "Doing tasks"). No surrounding refactors.
4. **DON'T** add error handling for impossible scenarios (CLAUDE.md). Validate at boundaries only.
5. **DON'T** add comments that explain *what* — only *why* (CLAUDE.md). Identifiers should self-document.
6. **DON'T** simplify income profiling (CLAUDE.md Invariant) — out of scope but worth restating.
7. **DON'T** use `process.env.NODE_ENV` for security gates. Use `dev` from `$app/environment` (compile-time tree-shaken).
8. **DON'T** create or switch git branches (CLAUDE.md Rule #8). Stay on `main`.
9. **DON'T** push to remote without explicit user authorization.
10. **DON'T** modify `.git/config`, `.env`, or other dotfiles (Claude Code policy + CLAUDE.md).
11. **DON'T** skip hooks (`--no-verify`) or bypass signing (CLAUDE.md). Investigate hook failures.
12. **DON'T** use `JSON.parse(JSON.stringify())` for cloning — use `securedClone()` / `$state.snapshot()` / `structuredClone()` per the table in CLAUDE.md.
13. **DON'T** mock the database in tests that should hit a real DB (memory pattern: mocked tests masked broken migration).

### Code Review Patterns to Apply

- **Field passthrough:** every new schema field must be added to `RawSchemaQuestion` → `toClientQuestion()` → `ClientQuestion`. Same for options. Server-explicit allowlist; missing fields are silently `undefined` on client.
- **Server↔client parity:** if a feature exists for one role (e.g., RM), confirm consistent treatment for analogous role (DSA, Admin) before merging.
- **Single ↔ multi applicant parity** (memory): IncomePageNew has two render paths. Any income/obligation/credit-score change must be verified in both.
- **Locked field pattern** (memory): when a field is disabled because pre-set elsewhere, render a **read-only badge**, not a disabled input. Validation must count pre-set value as answered.
- **Never patch — fix at source** (memory): if a field key is renamed, update `migrateApplicantKeys.ts` once, don't add ad-hoc fallbacks in every consumer.

---

## 8. Test & Sign-off Plan

### Per-batch checklist

- [ ] All targeted files edited.
- [ ] `pnpm exec svelte-check --tsconfig ./tsconfig.json --threshold error` → 0 errors.
- [ ] `pnpm check` → 0 errors, ≤ baseline warnings.
- [ ] `pnpm test:unit` → all passing (current baseline 10,099).
- [ ] Manual smoke test in `pnpm dev` for at least one user flow per touched dashboard.
- [ ] CSRF spot-check: open DevTools Network tab, click a fixed mutation, verify `x-csrf-token` header is present.
- [ ] Single commit per batch with conventional message style.
- [ ] User signs off before next batch.

### End-to-end sign-off (after all 5 batches)

- [ ] All 55 findings closed (file:line crossed off this document).
- [ ] `docs/CHANGELOG.md` appended with one entry per batch.
- [ ] `docs/SESSION-HANDOFF.md` updated with new "current state" snapshot.
- [ ] No regressions in DSA loan application wizard (sample case end-to-end).
- [ ] No regressions in RM PMS encode flow (testddsa@<domain> + 000000 + paste sample text → Pass 6 success).
- [ ] No regressions in admin policy approval flow.
- [ ] No new `console.log` / `console.error` in committed code.
- [ ] No new raw `fetch(` calls for mutating endpoints.

---

## 9. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `secureFetch` import name collision in some files | Low | Low | Grep before adding. Resolve with aliasing if needed. |
| Adding `requireRole` breaks impersonation | Low | Medium | `guards.ts:66-67` already short-circuits for admin. Verify with admin→DSA flow before commit. |
| Lender card → link breaks if detail page 500s | Medium | Medium | Test detail page renders for at least one lender before wiring index. |
| PDF extraction fails for scanned PDFs | High | Low (paste fallback exists) | Document in user-facing copy: "Scanned PDFs may need manual paste." |
| Removing `fetchWithTimeout` changes timeout behavior | Low | Low | `secureFetch` has its own timeout; verify default matches. |
| Hooks fail mid-batch | Low | High | If pre-commit hook fails, fix root cause then create new commit. **Never** `--amend` (CLAUDE.md). |
| User context window fills during multi-batch session | Medium | Medium | Hand off to next session via `SESSION-HANDOFF.md` if memory hits 90% (memory rule). |
| Sandbox NTFS git locks (CLAUDE.md Pitfall #6) | Medium | Low | Run the `mv .git/HEAD.lock` workaround before each commit. |

---

## 10. Open Questions (Need User Decision Before Implementation)

1. **Q-1:** Is `policy-capture` (RM dashboard) dead? If yes → archive in Batch 5. If no → spec it separately.
2. **Q-2:** Default product on lender card click — `home`, or product picker? Recommend product picker if `[lenderId]/[product]/+page.svelte` is product-aware; otherwise default `home` and add picker later.
3. **Q-3:** `aiService.ts` legacy parser — switch to OpenAI (`AI_PROVIDER=openai` in `.env`) or deprecate entirely? Recommend switch now, deprecate after PMS Phase 8.
4. **Q-4:** Batch 4 (PDF upload) — green-light or defer? Recommend green-light only if Batches 1-3 land in one session.
5. **Q-5:** A-H-4 (PMS comparison dead-end discrepancy panel) — wire in Batch 3 or punt to a separate spec? Recommend punt; it's product work, not wiring.
6. **Q-6:** R-H-6 / R-H-7 (case↔policy linkage on RM cases page) — in scope or out? Recommend out — feature work, not wiring.

---

## 11. Appendix — File Change Summary

**Total files touched across all batches: ~30**

| Batch | Files | Severity covered |
|---|---|---|
| 1 — CSRF sweep | 18 | All BROKEN + most MISALIGNED CSRF |
| 2 — Guards + reactivity | 9 | Most HALF-BUILT (role guards) + R-M-1, R-M-2, polish |
| 3 — Navigation | 6 | R-H-3, A-H-6, A-B-5, A-H-7, A-P-2 |
| 4 — PDF upload (optional) | 4 | R-H-1, R-H-2 |
| 5 — Polish + docs | 3 | A-H-9, miscellaneous |

**Findings NOT addressed by this plan (deferred):**
- A-H-4 (PMS comparison discrepancy panel) — product work
- R-H-6, R-H-7 (case↔policy linkage) — product work
- R-H-4, R-H-5 (orphaned RM pages) — needs stakeholder confirmation
- A-M-6 (legacy↔PMS parser tooltip) — depends on Phase 8

---

**END OF PLAN**
