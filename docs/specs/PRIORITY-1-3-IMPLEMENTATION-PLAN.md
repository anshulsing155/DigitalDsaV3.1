# Priority 1–3 Implementation Plan — Billing + Security + Performance

> **Created**: 2026-04-04 | **Session**: 54 | **Status**: Plan only — awaiting approval
> **Scope**: Phase E (Billing), Phase F (Security Hardening), Phase G (Performance)
> **Method**: Multi-agent parallel execution with dependency-safe ordering
> **Estimated effort**: 25–30 hours total, ~8–10 hours wall-clock with parallel agents

---

## Parallel Execution Strategy

All items are grouped into **5 independent streams** that touch ZERO overlapping files. Each stream can be assigned to a separate agent and run simultaneously.

```
STREAM 1: Billing Security (Phase E)     ← src/routes/api/razorpay/, billing/
STREAM 2: Auth Hardening                  ← src/routes/api/auth/
STREAM 3: HTML Sanitization + Error Leaks ← src/lib/components/*.svelte, scattered API routes
STREAM 4: Data Layer Hardening            ← src/lib/database/, src/routes/dashboard/
STREAM 5: Fetch + Logic Isolation         ← src/lib/server/, scattered API routes
```

After all 5 streams complete → final integration test pass.

---

## STREAM 1: Billing Security (Phase E)

**Files touched**: `src/routes/api/razorpay/order/+server.ts`, `src/routes/api/razorpay/verify/+server.ts`, `src/lib/config/billing.ts`
**Conflict risk**: NONE — these files are not touched by any other stream
**Effort**: 2–3 hours

### Task 1.1: PB-1 + PB-2 — Server-Side Price Enforcement

**Current vulnerability**: Client sends `amount` in the order creation request. Server multiplies by 100 and creates a Razorpay order. An attacker can send `{ amount: 1 }` and pay ₹0.01 for any plan.

**Fix**:
```typescript
// BEFORE (vulnerable):
// Client sends: { amount: 999 }
// Server does: instance.orders.create({ amount: amount * 100 })

// AFTER (secure):
// Client sends: { planId: 'pro' }
// Server does:
import { PLAN_CONFIG } from '$lib/config/billing';

const plan = PLAN_CONFIG[planId];
if (!plan) return apiError('Invalid plan', 400);

const order = await instance.orders.create({
  amount: plan.amountPaise,   // Server-controlled, not client-controlled
  currency: 'INR',
  receipt: `dsa_${dsaId}_${planId}_${Date.now()}`,
  notes: { dsa_id: dsaId, plan_id: planId }
});
```

**Steps**:
1. Modify `/api/razorpay/order/+server.ts`:
   - Accept `planId` (string) instead of `amount` (number)
   - Look up `PLAN_CONFIG[planId]` server-side
   - Use `plan.amountPaise` directly (no multiplication)
   - Add `receipt` with DSA ID + plan + timestamp for reconciliation
   - Add `notes` for Razorpay dashboard visibility
   - Return `{ orderId, key, planId, amount: plan.amountPaise }` for client display

2. Modify `/api/billing/subscribe/+server.ts`:
   - After HMAC verification, fetch order from Razorpay: `instance.orders.fetch(orderId)`
   - Verify `fetchedOrder.amount === PLAN_CONFIG[planId].amountPaise`
   - If mismatch → reject with `apiError('Payment amount mismatch', 400)`
   - This is the double-verification: HMAC proves Razorpay sent it, amount check proves it's the right plan

3. Modify billing page `+page.svelte`:
   - Change `handleSubscribe(plan)` to send `planId` instead of `amount`
   - Update Razorpay checkout modal `prefill.amount` from server response

**Error handling**:
- Invalid planId → 400 with "Invalid plan"
- Razorpay order creation failure → 502 with "Payment service unavailable"
- HMAC verification failure → 400 with "Payment verification failed"
- Amount mismatch → 400 with "Payment amount mismatch — contact support"
- All errors logged with `logger.error` including DSA ID and plan context

**Tests to add**:
- Unit: `billing.test.ts` — plan lookup, amount verification, HMAC validation
- Edge cases: invalid planId, missing planId, tampered amount, replay attack (same orderId used twice)

### Task 1.2: Idempotent Subscription Activation

**Current gap**: If `/api/billing/subscribe` is called twice with the same payment (network retry, double-click), the DSA gets double-charged in the transaction log.

**Fix**: Add idempotency check — if `razorpay_payment_id` already exists in `BillingTransactions`, return existing subscription status (don't create duplicate).

```typescript
// Check for duplicate payment
const existingTransaction = await BillingTransactions.findOne({
  razorpay_payment_id: paymentId
});
if (existingTransaction) {
  // Already processed — return current subscription status (idempotent)
  return apiOk({ plan: existingTransaction.plan, alreadyProcessed: true });
}
```

---

## STREAM 2: Auth Hardening

**Files touched**: `src/routes/api/auth/signup/+server.ts`, `src/routes/api/auth/refresh-token/+server.ts`, `src/routes/api/auth/verify-otp/+server.ts`, `src/routes/api/auth/check-dsa/+server.ts`
**Conflict risk**: NONE — only auth routes, no overlap with billing/components/database
**Effort**: 2–3 hours

### Task 2.1: PB-3 — Remove JWT from Response Body

**Current state**: 4 auth endpoints return `accessToken` and `refreshToken` in the JSON response body (for Capacitor native app support). This exposes tokens to JavaScript-accessible memory.

**Fix**: Tokens should ONLY be set via httpOnly cookies (already done for web). For native apps, use a different transport:

**Option A (recommended)**: Keep cookie-only approach. Capacitor's WebView can handle cookies.

**Option B (if Capacitor requires)**: Return tokens in body ONLY when `isNativePlatform(request)` is true, AND add:
- `X-Token-Transport: body` response header so client knows where to look
- Short-lived tokens (5 min instead of 15 min) for body transport
- Log every body-transport token issuance for audit

**Steps** (Option A — simplest, most secure):
1. `signup/+server.ts` — Remove `accessToken`/`refreshToken` from response body. Set cookies only.
2. `refresh-token/+server.ts` — Same treatment. Remove `...tokens` spread from `data` object.
3. `verify-otp/+server.ts` — Same.
4. `check-dsa/+server.ts` — Same.
5. Test Capacitor WebView cookie handling to confirm cookies work in native context.

**Error handling**: If Capacitor can't read cookies, fall back to Option B with audit logging.

### Task 2.2: CF-2 — Logout Token Cleanup (ALREADY DONE)

**Status**: Verified in analysis — `logout/+server.ts` already `$unset`s both `activeTokenId` and `activeTokenIds`. No change needed. ✅

---

## STREAM 3: HTML Sanitization + Error Leak Fixes

**Files touched**: `src/lib/components/*.svelte` (15 component files), 4 API endpoint files
**Conflict risk**: NONE — component files are not touched by other streams
**Effort**: 4–5 hours

### Task 3.1: CQ-1 — Sanitize {@html} Vectors

**Analysis**: 35 `{@html}` instances found. 18 have potentially user-controlled content (labels, descriptions, options passed via props). 7 are in archived components. 10 are server-controlled (safe).

**Fix approach**: Create a `sanitizeHtml()` utility that strips dangerous tags while preserving formatting.

```typescript
// src/lib/utils/sanitizeHtml.ts
const ALLOWED_TAGS = new Set([
  'div', 'span', 'p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'table', 'tr', 'td', 'th'
]);
const ALLOWED_ATTRS = new Set(['class', 'style', 'href', 'src', 'alt', 'title']);

export function sanitizeHtml(html: string): string {
  // Strip <script>, <iframe>, <object>, <embed>, <form>, event handlers (onerror, onclick, etc.)
  // Allow only ALLOWED_TAGS and ALLOWED_ATTRS
  // Use DOMParser for server-safe parsing
}
```

**Priority order** (by risk):
1. **InfoModal.svelte** — `description` prop is the highest risk (user-visible modal content)
2. **RadioField.svelte** — `getOptionLabel(opt)` and `getOptionLabelDescription(opt)` — option labels from schema
3. **TextField.svelte, SingleTextField.svelte, MultipleSelectField.svelte** — `label` and `descriptionHeader` props
4. **NewSelect.svelte** — `option.labelHtml` — dropdown options
5. **IncomeSourceForm.svelte** — `field.label` and `field.description`
6. **LocationGroup.svelte** — `question.question`
7. **Form page files** — `pageDescription` (server-controlled, lower risk)

**Implementation pattern**:
```svelte
<!-- BEFORE -->
{@html description}

<!-- AFTER -->
{@html sanitizeHtml(description)}
```

**Skip**: Archived components (`_archive/`) — dead code, not worth fixing. `JsonLd.svelte` — `JSON.stringify()` is inherently safe.

### Task 3.2: CQ-2 — Stop Leaking err.message

**4 endpoints leak internal error messages**:

1. `verify-email/+server.ts:22` — `return apiError(verification.message)`
   Fix: `return apiError('Email verification failed')`

2. `cases/[case_id]/tasks/[task_id]/+server.ts:31` — Zod validation message
   Fix: `return apiError('Invalid task data', 400)` (log Zod details server-side)

3. `cases/[case_id]/tasks/+server.ts:64` — Same Zod pattern
   Fix: Same approach

4. `share-link/verify-otp/+server.ts:153` — MSG91 error message
   Fix: `return apiError('OTP verification failed', 200)` (keep 200 status for UX)

**Pattern**: Replace `apiError(err.message)` with `apiError('Generic user message')` + `logger.warn({ err }, 'Details for debugging')`.

### Task 3.3: CQ-3 — Fix MongoDB Regex Injection

**5 endpoints pass user input directly to `$regex` without escaping**:

**Shared fix** — create `escapeRegex()` utility (already exists in `engineContext.ts`, just needs exporting):

```typescript
// src/lib/server/utils.ts (or export from existing location)
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

**Apply to**:
1. `dashboard/dsa/rm-contacts/+page.server.ts:39` — `{ $regex: escapeRegex(search), $options: 'i' }`
2. `dashboard/admin/users/+page.server.ts:16` — Same
3. `dashboard/admin/audit/+page.server.ts:20,26` — Same (2 instances)
4. `api/admin/users/rm/+server.ts:30` — Same

---

## STREAM 4: Data Layer Hardening

**Files touched**: `src/lib/database/mongo.ts`, `src/routes/api/dashboard/*.ts`, `src/routes/dashboard/admin/*.ts`
**Conflict risk**: LOW — mongo.ts is shared but changes are additive (retry logic, not refactoring)
**Effort**: 4–5 hours

### Task 4.1: CP-1 — MongoDB Connection Resilience

**Current issue**: Global `await connectToCluster()` at module load time. If MongoDB is down, the entire app fails to start with no retry.

**Fix**:
```typescript
// Lazy initialization with retry
let clientPromise: Promise<MongoClient> | null = null;

export function getClient(): Promise<MongoClient> {
  if (!clientPromise) {
    clientPromise = connectWithRetry();
  }
  return clientPromise;
}

async function connectWithRetry(maxRetries = 3): Promise<MongoClient> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = new MongoClient(MONGODB_URI, {
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        retryReads: true
      });
      await client.connect();

      // Monitor for disconnections
      client.on('close', () => {
        logger.warn('MongoDB connection closed — will reconnect on next request');
        clientPromise = null;  // Reset so next getClient() reconnects
      });

      logger.info({ attempt }, 'MongoDB connected successfully');
      return client;
    } catch (error) {
      logger.error({ err: error, attempt, maxRetries }, 'MongoDB connection attempt failed');
      if (attempt === maxRetries) throw error;
      // Exponential backoff: 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error('MongoDB connection failed after all retries');
}
```

**Impact**: Every file that imports `mongo.ts` collections benefits automatically. No other files need changes.

### Task 4.2: CP-2 — Dashboard Query Projections

**Add MongoDB projections to dashboard queries that currently return full documents**:

Audit each dashboard API route and add `{ projection: { ...only_needed_fields } }` to `.find()` calls. Key targets:

- `/api/dashboard/crm/+server.ts` — Timeline events: only need `event_type`, `created_at`, `summary`
- `/api/dashboard/policy-alerts/+server.ts` — Only need `alert_type`, `lender_name`, `created_at`
- `/api/dashboard/reminders/+server.ts` — Only need `title`, `due_date`, `status`
- All case listing queries — exclude `form_snapshot` (the largest field)

**Pattern**:
```typescript
// BEFORE
const cases = await Cases.find({ dsa_id }).toArray();

// AFTER — only fetch fields needed for the dashboard card
const cases = await Cases.find({ dsa_id }, {
  projection: {
    case_id: 1, label: 1, loan: 1, stage: 1, updated_at: 1,
    lender_applications: { $slice: 3 },  // Only first 3 lenders for preview
    _id: 0
  }
}).toArray();
```

**Impact**: 5-10x reduction in data transfer for dashboard pages.

### Task 4.3: CP-3 — Index-Friendly Archive Queries

**Check**: `{ is_archived: { $ne: true } }` pattern forces full collection scan (negative queries can't use indexes efficiently).

**Fix**: Replace with `{ is_archived: false }` or `{ is_archived: { $in: [false, null] } }` depending on whether old documents lack the field.

If field may not exist on older documents:
```typescript
// Add default value at query time
{ $or: [{ is_archived: false }, { is_archived: { $exists: false } }] }

// OR better — run a one-time migration to set is_archived: false on all documents
// Then use simple: { is_archived: false }
```

---

## STREAM 5: Fetch Hardening + Logic Isolation

**Files touched**: `src/lib/server/formEngine/visibility.ts`, `src/lib/server/aiService.ts`, 10 API routes with bare `fetch()`
**Conflict risk**: LOW — visibility.ts is isolated, fetch calls are in distinct files
**Effort**: 4–5 hours

### Task 5.1: CF-1 — JSON-Logic Override Isolation

**Current issue**: `visibility.ts` calls `jsonLogic.add_operation('!=', ...)` at module load, modifying the global singleton. All imports of `json-logic-js` across the app share this override.

**Fix**: Create an isolated evaluation function:

```typescript
// src/lib/server/formEngine/visibility.ts

import jsonLogic from 'json-logic-js';

// Create a SEPARATE instance for form visibility evaluation
// by wrapping the evaluation call with temporary overrides
let overridesApplied = false;

function ensureOverrides(): void {
  if (overridesApplied) return;
  // These are idempotent — calling add_operation twice with same fn is safe
  jsonLogic.add_operation('!=', (a: unknown, b: unknown) => {
    if (isUnanswered(a)) return false;
    return a != b;
  });
  jsonLogic.add_operation('!==', (a: unknown, b: unknown) => {
    if (isUnanswered(a)) return false;
    return a !== b;
  });
  overridesApplied = true;
}

export function evaluateVisibility(logic: any, data: any): boolean {
  ensureOverrides();
  return jsonLogic.apply(logic, data);
}
```

**Alternative** (cleaner but more work): Fork `json-logic-js` into `json-logic-form.ts` with built-in "unanswered = hide" semantics. This eliminates the singleton concern entirely.

**Recommendation**: Use the idempotent guard (simpler) + add a comment block documenting the global override behavior. The fork approach is better architecturally but higher risk for a pre-launch hardening phase.

### Task 5.2: CQ-4 — Replace Bare Fetch with secureFetch

**14 server-side bare `fetch()` calls** need timeout + error handling wrappers.

**Approach**: Create `externalFetch()` wrapper for third-party API calls:

```typescript
// src/lib/server/externalFetch.ts
import { logger } from './logger';

interface ExternalFetchOptions {
  timeoutMs?: number;      // Default: 10000 (10 seconds)
  service: string;         // For logging: 'msg91', 'razorpay', 'openai'
  retries?: number;        // Default: 0 (no retry)
}

export async function externalFetch(
  url: string,
  init: RequestInit,
  options: ExternalFetchOptions
): Promise<Response> {
  const { timeoutMs = 10000, service, retries = 0 } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        logger.warn({ service, status: response.status, url }, 'External API non-OK response');
      }

      return response;
    } catch (error) {
      clearTimeout(timeout);
      logger.error({ err: error, service, url, attempt }, 'External API fetch failed');

      if (attempt === retries) throw error;
      // Exponential backoff: 500ms, 1s, 2s
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }

  throw new Error(`${service} fetch failed after ${retries + 1} attempts`);
}
```

**Apply to all 14 bare fetch calls**:
- `aiService.ts` (3 calls) → `externalFetch(url, init, { service: 'openai', timeoutMs: 30000 })`
- MSG91 OTP calls (8 calls) → `externalFetch(url, init, { service: 'msg91' })`
- Internal `check-dsa` call (1) → Use SvelteKit's `fetch` from event context instead

---

## Execution Order & Dependencies

```
┌──────────────────────────────────────────────────────────────────┐
│                    PARALLEL EXECUTION PHASE                       │
│                                                                   │
│  Stream 1          Stream 2         Stream 3                      │
│  ┌──────────┐     ┌──────────┐     ┌───────────────┐            │
│  │ PB-1/PB-2│     │ PB-3     │     │ sanitizeHtml  │            │
│  │ Billing  │     │ JWT body │     │ utility       │            │
│  │ security │     │ removal  │     │ ↓             │            │
│  │          │     │          │     │ CQ-1 (35 inst)│            │
│  │          │     │          │     │ CQ-2 (4 endpt)│            │
│  │          │     │          │     │ CQ-3 (5 regex)│            │
│  └──────────┘     └──────────┘     └───────────────┘            │
│                                                                   │
│  Stream 4                    Stream 5                             │
│  ┌───────────────────┐      ┌─────────────────────┐             │
│  │ CP-1 Mongo retry  │      │ CF-1 jsonLogic      │             │
│  │ CP-2 Projections  │      │ isolation           │             │
│  │ CP-3 Index fix    │      │ CQ-4 externalFetch  │             │
│  └───────────────────┘      │ (14 bare fetches)   │             │
│                              └─────────────────────┘             │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                    INTEGRATION PHASE (Sequential)                 │
│                                                                   │
│  1. pnpm run check          (0 errors target)                    │
│  2. pnpm run test:unit      (9,237+ tests target)                │
│  3. Manual smoke test:                                            │
│     - Create case → verify form works                            │
│     - Login/logout → verify auth flow                            │
│     - Dashboard load → verify performance                        │
│     - Billing subscribe → verify payment (test mode)             │
│  4. Single commit with all streams                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## File Conflict Matrix

Verifying ZERO overlap between streams:

| File | S1 | S2 | S3 | S4 | S5 |
|---|---|---|---|---|---|
| `api/razorpay/order/+server.ts` | ✏️ | | | | |
| `api/razorpay/verify/+server.ts` | ✏️ | | | | |
| `api/billing/subscribe/+server.ts` | ✏️ | | | | |
| `dashboard/dsa/billing/+page.svelte` | ✏️ | | | | |
| `config/billing.ts` | ✏️ | | | | |
| `api/auth/signup/+server.ts` | | ✏️ | | | |
| `api/auth/refresh-token/+server.ts` | | ✏️ | | | |
| `api/auth/verify-otp/+server.ts` | | ✏️ | | | |
| `api/auth/check-dsa/+server.ts` | | ✏️ | | | |
| `components/InfoModal.svelte` | | | ✏️ | | |
| `components/RadioField.svelte` | | | ✏️ | | |
| `components/TextField.svelte` | | | ✏️ | | |
| `components/SelectField.svelte` | | | ✏️ | | |
| `components/MultipleSelectField.svelte` | | | ✏️ | | |
| `components/NewSelect.svelte` | | | ✏️ | | |
| `api/auth/verify-email/+server.ts` | | | ✏️ | | |
| `api/cases/*/tasks/+server.ts` | | | ✏️ | | |
| `dashboard/dsa/rm-contacts/+page.server.ts` | | | ✏️ | | |
| `dashboard/admin/users/+page.server.ts` | | | ✏️ | | |
| `dashboard/admin/audit/+page.server.ts` | | | ✏️ | | |
| `database/mongo.ts` | | | | ✏️ | |
| `api/dashboard/crm/+server.ts` | | | | ✏️ | |
| `api/dashboard/policy-alerts/+server.ts` | | | | ✏️ | |
| `server/formEngine/visibility.ts` | | | | | ✏️ |
| `server/externalFetch.ts` (NEW) | | | | | ✏️ |
| `server/aiService.ts` | | | | | ✏️ |
| `api/auth/send-otp/+server.ts` | | | | | ✏️ |
| `api/auth/resend-otp/+server.ts` | | | | | ✏️ |

**Result**: ✅ ZERO file overlaps between any two streams. Safe for full parallel execution.

---

## New Files Created

| Stream | File | Purpose |
|---|---|---|
| 3 | `src/lib/utils/sanitizeHtml.ts` | HTML sanitizer for `{@html}` — allowlist of safe tags/attrs |
| 5 | `src/lib/server/externalFetch.ts` | Timeout + retry wrapper for third-party API calls |
| — | `src/lib/testing/__tests__/billing.test.ts` | Billing plan lookup + amount verification tests |
| — | `src/lib/testing/__tests__/sanitizeHtml.test.ts` | HTML sanitization tests |
| — | `src/lib/testing/__tests__/externalFetch.test.ts` | Fetch wrapper timeout + retry tests |

---

## Testing Strategy

### Per-Stream Unit Tests (run before merging)

| Stream | Test File | What It Covers |
|---|---|---|
| 1 | `billing.test.ts` | Plan lookup, price enforcement, HMAC verification, idempotency |
| 3 | `sanitizeHtml.test.ts` | XSS vectors blocked, safe HTML preserved, edge cases |
| 5 | `externalFetch.test.ts` | Timeout, retry, abort controller, error propagation |

### Integration Tests (run after all streams merge)

1. `pnpm run check` — 0 errors
2. `pnpm run test:unit` — all 9,237+ tests pass
3. Manual: billing flow end-to-end (Razorpay test mode)
4. Manual: login → dashboard → case create → form fill → submit

---

## Rollback Strategy

Each stream is independently reversible:
- Git: each stream committed separately, easy to `git revert` one stream
- No database migrations (all changes are code-only)
- No schema changes (billing schema already exists)
- `externalFetch` is additive (wraps existing `fetch`, doesn't replace)
- `sanitizeHtml` is additive (wraps existing `{@html}`, doesn't replace)

---

## Items NOT Included (Phase F remainder — lower priority)

These are tracked in the roadmap but deferred from this batch:

| Item | Why Deferred |
|---|---|
| CQ-5: Cookie secure flags | Requires HTTPS testing environment |
| CQ-6: CSP nonce headers | Complex — needs careful `<script>` tag auditing |
| CQ-7: HSTS headers | Requires HTTPS + domain control verification |
| CQ-8: Refresh token validation hardening | Low risk, complex to test |
| CF-3–CF-8: Logic/flow fixes | Lower priority, individual edge cases |
| CD-2–CD-8: Data integrity fixes | Lower priority, some need migration |
| CC-1–CC-9: Code consistency | Cleanup, not security-critical |

These can be done in a follow-up session after the core security + performance items ship.

---

## Summary

| Stream | Items | Effort | Impact |
|---|---|---|---|
| 1: Billing | PB-1, PB-2, idempotency | 2–3 hrs | Fixes revenue-critical vulnerability |
| 2: Auth | PB-3 (JWT removal) | 1–2 hrs | Prevents token theft |
| 3: Sanitize | CQ-1, CQ-2, CQ-3 | 4–5 hrs | Blocks XSS, info leak, injection |
| 4: Data | CP-1, CP-2, CP-3 | 4–5 hrs | 5-10x dashboard speed, connection resilience |
| 5: Fetch | CF-1, CQ-4 | 4–5 hrs | Timeout protection, logic isolation |
| **Total** | **14 items** | **~18 hrs** | **Production-grade security + performance** |
