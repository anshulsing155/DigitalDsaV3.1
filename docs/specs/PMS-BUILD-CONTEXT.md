# PMS Build Session — Context & Instruction Manual

> **Read this at the start of every PMS build session.**
> This document is the single source of truth for how to build the Policy Management System
> in the DigitalDSA V3 codebase. It replaces verbal reminders. Follow it exactly.

---

## 1. What You Are Building

A **Policy Management System (PMS)** for DigitalDSA — a multi-lender loan orchestration
platform for DSAs in India. The PMS replaces manually-authored TypeScript policy files with
a UI-driven, RM/Admin-managed, version-controlled system.

**Full spec:** `docs/specs/POLICY-MANAGEMENT-SYSTEM-SPEC.md`
**Full plan:** `docs/specs/PMS-IMPLEMENTATION-PLAN.md`
**V7 Parser spec (AI prompt seed):** `src/lib/config/pms/policySpec/LOAN_POLICY_PARSER_SPEC_V7.md`

### Build sequence — follow this order, no skipping

```
Phase 0  (RM identity + lender OTP)          ← START HERE every new session
Phase 1  (MongoDB schema + indexes)
Phase 2  (server foundation: guards, API routes, 6-pass pipeline)
Phase 3  (term dictionary)
Phase 11 (key registry + CI gate)            ← needed before Phase 2 AI calls
Phase 4  (RM fresh encode wizard — 6-step)
Phase 5  (RM edit mode)
Phase 6  (admin review + approval)
Phase 7  (admin JSON editor + conflict checker)
Phase 8  (stale TypeScript audit)
Phase 9  (DSA suggestion flow)
```

**Before starting any phase:** Read the relevant phase section in `PMS-IMPLEMENTATION-PLAN.md`
in full. Never assume — the plan has the exact type definitions, API routes, UI layouts,
and data flows already specified.

---

## 2. Roles & Access (locked — do not deviate)

| Role | PMS Access |
|------|-----------|
| RM | Onboard to lenders, run encode wizard, submit drafts — never publish |
| Admin | Review, approve, reject, publish, JSON editor, registry health |
| DSA | Submit policy suggestions only — read-only on results |

- RM changes are **always drafts** — they never go live without admin approval
- Admin is the only role that can publish, rollback, or use the manual entry escape valve
- OTP via official bank email is required for every RM policy submission (per-action gate)
- Monthly OTP renewal via bank email maintains RM-lender assignment

---

## 3. Mandatory Technical Rules

### 3.1 Always Read Before Writing

Before writing any code:
1. Read `docs/SESSION-HANDOFF.md` — current state, what was done last session
2. Read the relevant phase from `docs/specs/PMS-IMPLEMENTATION-PLAN.md`
3. Grep for the file you're about to create/modify — it may already exist

### 3.2 File System Rules

- **Check `src/lib/components/_archive/`** before creating any new component — 16+ archived
- **Never create large monolithic files.** Target ~200–300 lines per file, one responsibility
- **Never delete files** — move to `_archive/` folder instead
- **Prefer editing existing files** over creating new ones
- When a module exceeds scope, refactor into sibling files in the same directory

### 3.3 Code Quality (non-negotiable)

- **Human-readable names.** `maxAffordableLoanAmount` not `mALA`. Anyone reading should
  understand without a glossary.
- **Step-by-step with comments for WHY.** Write code as clear sequential steps. Only comment
  non-obvious business rules or constraints — never comment what the code obviously does.
- **No unnecessary complexity.** `if/else` > ternary chains. Explicit > implicit.
- **No premature abstraction.** Three similar lines is better than a wrong abstraction.
- **No error handling for impossible scenarios.** Trust framework guarantees.
  Only validate at system boundaries (user input, external APIs).
- **No feature flags, backwards-compat shims, or deprecated wrappers.**
  Fix at source, delete dead code.

### 3.4 Execution Path Verification (CRITICAL — never skip)

**Before writing any fix or feature:**
1. Which `.svelte` component actually mounts for this flow? Grep for it in the route/parent.
2. Which file sets the data? Which reads it? Are they the same tree?
3. If adding `$effect` or reactive logic — confirm the component IS rendered for this specific
   loan type / role / flow.

**Before claiming done:**
1. Grep all callers/consumers of the changed function.
2. Confirm the component with your change is in the render tree for the target flow.
3. Static trace: "this function called from X → mounted by Y → renders for Z."
4. NEVER say "done" based on type-check alone — it does not prove runtime correctness.

---

## 4. Known Pitfalls — Memorize These

### Pitfall 1 — `!=` in JSON-Logic (form engine only)

`src/lib/server/formEngine/visibility.ts` overrides `!=` with "unanswered = hide" semantics:
- `null != "anything"` → `false` (standard returns `true`)

**This override applies ONLY to form visibility evaluation.**

For PMS policy rules (evaluated against fully-populated enriched payloads via
`evaluationEngine.ts`), `!=` behaves as standard JSON-Logic. Use it normally in policy rules:
```
✅ {"!=": [{"var": "ApplicantIsNRI"}, "Yes"]}  — correct in policy rules
✅ {"!": [{"var": "unsetFormField"}]}           — correct in form visibility only
```

### Pitfall 2 — Missing server→client field mapping → silent `undefined`

The server explicitly picks which fields to pass through. A missing field is silently
`undefined` on client — no error, no warning. When adding fields to PMS API responses:
- New field on server type → must be explicitly included in the response object
- New option field → `RawSchemaOption` → `toClientOption()` in `optionResolver.ts`
- New question field → `toClientQuestion()` in `engine.ts`
- **Never assume a field reaches the client automatically.**

### Pitfall 3 — Icon string vs component crash

Components accept both Lucide components AND string emojis. Rendering a string as
`<Icon size={18}/>` crashes the entire component tree silently.

```svelte
<!-- ALWAYS guard -->
{#if typeof icon === 'string'}
  <span>{icon}</span>
{:else}
  <icon size={18} />
{/if}
```

### Pitfall 4 — `fetch` at module scope → SSR failure

Never call `fetch`/`secureFetch` at module top-level, in reactive declarations, or in store
initialization. Always wrap in `onMount`, event handlers, or `load` functions.

### Pitfall 5 — NTFS git locks (Windows host)

Before every git write:
```bash
mv .git/HEAD.lock  .git/HEAD.lock.stale-$(date +%s%N)  2>/dev/null || true
mv .git/index.lock .git/index.lock.stale-$(date +%s%N) 2>/dev/null || true
```

### Pitfall 6 — Locked field display pattern

When a field is locked/pre-set by a prior step:
- NEVER render as a disabled radio/select
- Show a **read-only badge** with the value + "Set from [source]" note
- Validation MUST count the pre-set value as answered — Next button must be enabled

### Pitfall 7 — `!=` is for policy rules, `!` is for form visibility (summary)

Do not conflate the two. Policy rules: use `!=` freely. Form visibility: use `!` for
unset-field checks. These are different evaluation contexts.

---

## 5. Tech Stack — Exact Patterns to Use

### Svelte 5 (strict)

```svelte
<!-- Always use runes — never legacy stores in new code -->
let count = $state(0);
let doubled = $derived(count * 2);
$effect(() => { /* side effects */ });

<!-- Never use <svelte:component> in new code -->
<!-- Bridge for legacy: fromRune() in $lib/stores/_bridge.svelte.ts -->
```

### API Routes

Every API route must use these — no exceptions:

```typescript
import { apiOk, apiError, apiServerError, apiOkMessage, parseJsonBody }
  from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';  // NEVER bare console
import { requireAuth, requireRole, requireRmLenderAccess }
  from '$lib/server/guards.js';
import { rateLimiter } from '$lib/server/rateLimiter.js';

// Pattern for every route:
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const user = requireAuth(locals);          // throws if not authed
    requireRole(locals, 'rm');                 // throws if wrong role
    const body = await parseJsonBody(request); // throws on bad JSON

    // business logic here

    return apiOk(res, { data });
  } catch (err) {
    logger.error({ err }, 'pms.policy.submit failed');
    return apiServerError(res);
  }
};
```

### MongoDB

```typescript
// Native driver only — no ORM
import { db } from '$lib/database/mongo.js';
const collection = db.collection('lender_policies');

// Optimistic locking pattern (PMS-specific — mandatory for all policy writes):
const result = await collection.updateOne(
  { _id, lockVersion: requestBody.lockVersion },   // atomic check
  { $set: { ...changes }, $inc: { lockVersion: 1 } }
);
if (result.matchedCount === 0) {
  return apiError(res, 409, 'Policy was modified by another session — refresh and retry.');
}
```

### Data Cloning

| Scenario | Use |
|---|---|
| User-submitted / untrusted | `securedClone()` from `$lib/utils/securedClone` |
| Reactive `$state` → plain | `$state.snapshot()` |
| Trusted defaults / reset | `structuredClone()` |
| Shallow copy | `{ ...obj }` |
| Immutable audit snapshot | `securedFreeze()` |
| Deep equality | `securedEquals()` |
| **Never** | `JSON.parse(JSON.stringify())` — loses Dates, Maps, Sets |

### Logging

```typescript
// Always structured Pino — NEVER console.log/warn/error
logger.info({ lenderId, rmUserId }, 'pms.assignment.created');
logger.error({ err, policyId }, 'pms.pipeline.pass3.failed');
```

### Route Constants

Add all new PMS routes to `src/lib/config/routes.ts` — never hardcode paths in components.

---

## 6. PMS-Specific Architecture Rules

### 6.1 Key Registry — Append-Only (CRITICAL)

`src/lib/config/pms/keyRegistry.ts` rows are **NEVER deleted**. Only:
- Add new entries
- Update `deprecatedAt` + `deprecationReason` on existing entries

Every change requires a corresponding entry in `src/lib/config/pms/registryChangelog.ts`
(same commit). CI checks enforce both rules.

### 6.2 ConditionalOverride — Output of AI Pipeline Pass 3

The AI pipeline outputs `ConditionalOverride[]` — NOT the 25-section V7 format.
Each clause from Pass 2 → one `ConditionalOverride` with:
- `condition: JsonLogicRule` — WHEN does this apply
- `effect: PolicyEffect` — WHAT does it change (`fieldPath`, `operation`, `value`)
- `scope.applicantScope: 'primary' | 'any' | 'all'`
- `confidence: number` (0.0–1.0)
- `confirmationRequired[]` — ambiguities for RM to resolve
- `templateId` — if a V3 template matched (prefer templates over custom_json)

### 6.3 OTP Infrastructure — Reuse, Don't Rebuild

Reuse `src/lib/services/otpStore.ts` with context extension:
```typescript
// PMS OTP — extend existing context field
otpStore.send(email, { context: { purpose: 'policy_change', lenderId, policyId, draftHash } })
otpStore.verify(email, otp, { context: { purpose: 'policy_change', lenderId, policyId, draftHash } })
```
- SHA-256 + `crypto.timingSafeEqual` — already in `otpStore.ts`
- **No bcrypt. No new OTP collection.**
- Token is bound to `policyId + draftHash` — prevents replay across different drafts

### 6.4 Pipeline Passes — Separate API Routes, Sequential

Each of the 6 passes is a separate `POST /api/pms/pipeline/passN` endpoint.
- Never combine passes into one endpoint
- Each pass has a 30-second timeout — save `pipelineState.errorState` on timeout
- `pipelineState` saved to DB on every RM wizard action (resumable)
- Pass 3 rejects with HTTP 422 if any clause has `relevance === 'ambiguous'`

### 6.5 `!=` is Correct in Policy JSON-Logic

The policy evaluation engine (`evaluationEngine.ts`) uses `jsonLogic.apply()` against
fully-populated enriched payloads. All fields are present — no null gaps.
`!=` behaves as standard JSON-Logic. Use it freely in policy rules.

### 6.6 Lender Count — Never Hardcode

Always derive lender count programmatically from `lenderDirectory.ts` at runtime.
The count changes as lenders are added or removed — never hardcode any number.

### 6.7 All RM Edits Are Drafts

No RM action ever touches the `published` status. RM actions: `draft → submitted`.
Only admin can move to `approved`, `approved_scheduled`, or `published`.

---

## 7. UI/UX Rules

### 7.1 Design Philosophy — Bold & Premium

- Strong typography hierarchy — clear distinction between headings, labels, values
- High-contrast status indicators — green/amber/red with icons, never colour-only
- Dense but not cluttered — DSAs and RMs are power users, not consumers
- Progressive disclosure — show what's needed now, expand on demand
- Confident UI — no wishy-washy microcopy. "Submit for Admin Approval" not "Send?"

### 7.2 Wizard Rules (PMS Encode Wizard — Phase 4)

- **Linear stepper — no skip-forward.** Steps unlock sequentially.
- Step labels always visible in sidebar. Current step highlighted.
- "Save draft" available at every step — progress is never lost.
- Resume banner on policy listing: "Continue where you left off →"
- Every step shows a progress indicator (e.g. "14 / 22 clauses encoded")
- Errors shown inline at the field level — not just a top banner

### 7.3 Status Display

```
Policy statuses → display consistently:
draft              → grey   · "Draft"
submitted          → blue   · "Pending Review"
approved_scheduled → purple · "Scheduled · [date]"
approved           → teal   · "Approved"
published          → green  · "Live"
archived           → grey   · "Archived"
```

### 7.4 Confidence Levels — Advisory Only, Never Blocking

Confidence is shown as a percentage badge on each clause/override.
- ≥ 80%: green badge
- 60–79%: amber badge
- < 60%: red badge

**Never prevent submission based on confidence.** It is informational only.
The overall confidence summary on Step 5 is shown but does not gate the submit button.

### 7.5 Read-Only vs Editable Fields

- Locked/pre-set fields → read-only badge, never disabled input
- Admin-only fields → hidden from RM view entirely (not disabled)
- Draft fields → always show "DRAFT" label, never just unstyled

### 7.6 Error States

- Pipeline timeout: "AI pipeline timed out — your draft is saved. Please try again."
- Conflict detected: amber warning, not a hard block
- Stale key: red badge "Key no longer exists in form" with replacement suggestion
- Optimistic lock conflict: "This policy was updated while you were editing — please refresh."
  (preserve draft, reject only the write)

### 7.7 Notification Placement

- In-app notifications via S71 `Notifications` collection — already wired
- Email via MSG91 for OTP (reliable) — Nodemailer for non-OTP (deferred to S-LAUNCH)
- In-app only for policy status changes pre-S-LAUNCH

---

## 8. Patterns to Copy From Existing Code

Before building anything new, grep these existing implementations first:

| What you need | Where to look |
|---|---|
| OTP send/verify | `src/lib/services/otpStore.ts` |
| Auth guards | `src/lib/server/guards.ts` |
| Rate limiting | `src/lib/server/rateLimiter.ts` |
| API response helpers | `src/lib/server/apiResponse.ts` |
| In-app notifications | `src/routes/api/notifications/` |
| Cron endpoint pattern | `src/routes/api/notifications/digest/+server.ts` |
| Wizard stepper UI | `src/lib/components/form-wizard/FormShell.svelte` |
| CodeMirror / JSON editor | check `src/lib/components/` — may be archived |
| MongoDB collection access | `src/lib/database/mongo.ts` |
| Variation generator (296 QA profiles) | `src/lib/testing/variationGenerator.ts` |
| Evaluation engine | `src/lib/ruleEngine/evaluationEngine.ts` |
| Lender directory | `src/lib/config/lenderPolicies/lenderDirectory.ts` |

---

## 9. Where to Be Strict — No Shortcuts Allowed

| Area | Why strict |
|---|---|
| Key registry append-only | A deleted row can silently break live policy evaluation |
| Optimistic locking on all policy writes | Two RMs/admin tabs on same policy = data corruption without it |
| OTP bound to `policyId + draftHash` | Without binding, an OTP from one draft can submit a different draft |
| `pipelineState` saved on every action | A browser crash mid-wizard = lost work without this |
| `lockVersion` echoed on every PATCH | Must be checked atomically — not a soft check |
| No `!=` in form visibility, `!=` OK in policy | Different evaluation contexts — conflating = silent wrong results |
| Admin co-approval for `custom_json` overrides | Custom JSON bypasses template validation — needs second pair of eyes |
| Reconciliation sign-off clears on any encoding change | An RM who modifies an encoding after sign-off must re-sign-off |
| Rate limit pipeline endpoints (5 runs/day per RM) | Each pipeline run costs $0.10–0.30 — abuse prevention mandatory |
| Conflict checker honest scope | Only claim what it can actually detect — no false confidence |

---

## 10. Things to NOT Do

- Do NOT create a new OTP collection — reuse `src/lib/services/otpStore.ts` with context extension
- Do NOT use bcrypt for OTP — SHA-256 throughout (same as existing `otpStore.ts`)
- Do NOT hardcode lender count — derive from `lenderDirectory.ts` at runtime (count changes)
- Do NOT let RM directly publish — always draft → submitted → admin approval
- Do NOT block submission on confidence level — advisory only
- Do NOT use `console.log` — always `logger.info/warn/error` from `$lib/server/logger`
- Do NOT return raw `Response` from API routes — always `apiOk()` / `apiError()`
- Do NOT allow skip-forward in the wizard stepper
- Do NOT combine multiple pipeline passes into one API call
- Do NOT allow `custom_json` override without the amber warning banner + checkbox
- Do NOT call `fetch` at module scope — always `onMount` or event handlers
- Do NOT claim done based on type-check alone — trace the execution path
- Do NOT delete from `keyRegistry.ts` — append-only
- Do NOT use `JSON.parse(JSON.stringify())` — use `securedClone()` or `structuredClone()`
- Do NOT add Co-Authored-By lines to commits
- Do NOT create or switch branches — stay on `main`
- Do NOT add `OPENAI_API_KEY` to any committed file — `.env` only (add to `.env.example`)

---

## 11. Environment Variables Needed for PMS

Add to `.env` (not committed):
```
OPENAI_API_KEY=sk-...           # For 6-pass AI pipeline (Phases 2–5)
CRON_SECRET=...                 # Already exists in S71 cron — reuse same value
```

Add to `.env.example` (committed — no values):
```
CRON_SECRET=your_cron_secret_here
OPENAI_API_KEY=your_openai_api_key_here
```

---

## 12. Session Checklist — Run at Start of Every Session

```
[ ] Read docs/SESSION-HANDOFF.md — what was done last session, what's next
[ ] Read the target Phase section from docs/specs/PMS-IMPLEMENTATION-PLAN.md
[ ] Run: pnpm check — confirm 0 errors before touching anything
[ ] Run: git status — confirm on main, no stale changes
[ ] Before git write: clear NTFS locks (see CLAUDE.md §CRITICAL PITFALLS #6)
[ ] After completing each task: update docs/DEVELOPMENT-PLAN.md status
[ ] At end of session: update docs/SESSION-HANDOFF.md with what was done + next steps
```

---

## 13. Commit Rules

```bash
# Always inline identity — never modify .git/config
git -c user.name='Prashant' -c user.email='tech@digitaldsa.com' commit -m "..."

# NEVER add Co-Authored-By lines
# NEVER use --no-verify
# NEVER amend published commits
# Branch: main only
```

---

## 14. Quick Reference — PMS Data Types

```typescript
// Phase 0
interface RmLenderAssignment {
  _id: ObjectId; rmUserId: string; lenderId: string; lenderName: string;
  officialBankEmail: string;
  status: 'active' | 'suspended' | 'pending_verification';
  onboardedAt: Date; lastMonthlyVerifiedAt: Date; nextVerificationDueBy: Date;
  suspendedAt: Date | null; suspendedReason: string | null;
  transferredTo: string | null; transferredAt: Date | null;
}

// Phase 1 — policy status lifecycle
type PolicyStatus =
  | 'draft' | 'submitted' | 'approved_scheduled'
  | 'approved' | 'published' | 'archived';

// Phase 2 — effect of a conditional override
interface PolicyEffect {
  fieldPath: string;   // e.g. "ltv.maxPercent", "foir.maxPercent", "roi.basePercent"
  operation: 'set' | 'add' | 'multiply' | 'max' | 'min';
  value: number | string | boolean;
}

// Phase 11 — registry entry (append-only)
interface KeyRegistryEntry {
  path: string; type: 'string' | 'number' | 'boolean' | 'enum' | 'string[]';
  enumValues?: string[]; deprecatedEnumValues?: string[];
  products: LoanProduct[] | 'all'; source: 'form' | 'computed';
  bindsTo: string; addedAt: string;
  deprecatedAt: string | null; deprecationReason: string | null;
  replacedBy: string | null;
}
```

---

## 15. Additional Suggestions Before Build Starts

The following shell files should be created before Phase 0 build begins (takes 10 minutes,
saves confusion later):

1. **`src/lib/config/pms/keyRegistry.ts`** — typed empty shell with `KeyRegistryEntry`
   interface + empty `KEY_REGISTRY` array. Needed for Phase 2 AI pipeline context injection.

2. **`src/lib/config/pms/registryChangelog.ts`** — typed empty shell with
   `RegistryChangeEntry` interface + empty `REGISTRY_CHANGELOG` array.

3. **`src/lib/config/lenderPolicies/types.ts`** — add `officialEmailDomain: string` to
   `LenderMasterEntry` interface (Phase 0 needs it).

4. **`.env.example`** — add `CRON_SECRET` and `OPENAI_API_KEY` placeholder lines.

5. **`src/lib/config/pms/` directory** — already created (contains `policySpec/`).
   Also create empty `templates/` and `prompts/` subdirectories.

These are non-breaking additions. Creating them now means Phase 0 API routes can import
from them immediately without file-not-found errors.

---

*Last updated: 2026-04-24 (S84 complete — Phases 0–3 shipped. Phase 4 encode wizard is next: `/dashboard/rm/policies/[lenderId]/[product]/encode`)*
*Full plan: `docs/specs/PMS-IMPLEMENTATION-PLAN.md` · Full spec: `docs/specs/POLICY-MANAGEMENT-SYSTEM-SPEC.md`*
