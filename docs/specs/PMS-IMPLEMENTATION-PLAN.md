# Policy Management System — Implementation Plan

**Status:** Finalized for build (v2 — post peer review)
**Date:** 2026-04-23
**Session:** S80 planning
**Spec reference:** `docs/specs/POLICY-MANAGEMENT-SYSTEM-SPEC.md`
**External repos reviewed:** `AI_Based_Bank_Management`, `DigitalDSA_Backend`
**Peer review:** 25 findings addressed (5 critical, 7 high, 8 medium, 2 low, 3 process). See §Review Log.

---

## Locked Decisions

| Decision | Choice |
|---|---|
| AI pipeline | OpenAI `gpt-4o-mini` — 6-pass architecture |
| Wizard structure | Linear stepper — no skip-forward |
| Confidence thresholds | Advisory only — never block submission |
| RM edit policy | All RM edits are drafts; admin approval required before any value goes live |
| Custom JSON-Logic | JSON editor in admin with conflict checker (scoped — see §2.6) |
| QA validation | 296 synthetic profiles via `variationGenerator.ts` (built S79) |
| Stale TS system | Lender-by-lender migration with discrepancy resolution before deletion |
| Manual entry path | Admin-only escape valve to bypass AI pipeline; reconciliation still mandatory |
| Claude API | NOT used for pipeline (separate billing from Max plan); Max plan for prompt engineering only |
| RM-lender assignment | Strict, OTP-gated via official bank email — monthly renewal + per-action gate |
| OTP infrastructure | Reuse existing `src/lib/services/otpStore.ts` (SHA-256 + timing-safe) — no new OTP collection |
| Optimistic locking | `lockVersion` on `PolicyDocument` — all writes check version match |
| Pipeline state | Persisted to DB on every RM action — wizard is fully resumable |
| Scheduled publish | `approved_scheduled` status + S71 cron promotion |

---

## Phase 0 — RM Identity & Lender Assignment System

Prerequisite for all PMS actions. No policy work possible without an active, verified assignment.

### 0.1 New MongoDB Collection: `rm_lender_assignments`

```typescript
interface RmLenderAssignment {
  _id: ObjectId;
  rmUserId: string;
  lenderId: string;                   // kebab-case: "hdfc-bank"
  lenderName: string;
  officialBankEmail: string;          // rm.john@hdfcbank.com — verified at onboarding
  status: 'active' | 'suspended' | 'pending_verification';
  onboardedAt: Date;
  lastMonthlyVerifiedAt: Date;
  nextVerificationDueBy: Date;        // rolling 30-day window
  suspendedAt: Date | null;
  suspendedReason: string | null;
  // RM offboarding (Review finding #12)
  transferredTo: string | null;       // rmUserId of replacement RM
  transferredAt: Date | null;
}
```

**No new OTP collection.** The existing `src/lib/services/otpStore.ts` + `emailOtps` collection is extended with an optional `context` field (Review finding #1 + #7):

```typescript
// Extension to existing OTP entry — no schema migration needed, additive only
interface PmsOtpContext {
  purpose: 'onboarding' | 'monthly_renewal' | 'policy_change' | 'lender_switch';
  lenderId: string;
  policyId?: string;     // required for policy_change purpose
  draftHash?: string;    // SHA-256 of draft content at time of OTP issue
}
// Stored as: otpStore.send(email, { context: PmsOtpContext })
// Verified as: otpStore.verify(email, otp, { context: PmsOtpContext })
```

This reuses `src/lib/services/otpStore.ts`'s existing SHA-256 + `crypto.timingSafeEqual` implementation, TTL auto-cleanup, exponential backoff, and 5-attempt lockout. No bcrypt anywhere.

### 0.2 `issuePmsOtpToken` — Bound to Policy + Draft Hash (Review finding #2)

```typescript
// Token payload includes policyId + draftHash — cannot be replayed on a different draft
export function issuePmsOtpToken(
  rmUserId: string,
  lenderId: string,
  purpose: string,
  policyId: string,
  draftHash: string        // SHA-256 of PolicyDocument at submission time
): string

export function verifyPmsOtpToken(
  token: string,
  lenderId: string,
  purpose: string,
  policyId: string,
  draftHash: string        // must match exactly what was in the token
): boolean
```

Submit endpoint: computes `currentDraftHash = sha256(JSON.stringify(policy.sections + policy.conditionalOverrides))`, passes it to `verifyPmsOtpToken`. Token issued for one draft cannot be used for another even if same lender.

### 0.3 lenderDirectory Extension

Add `officialEmailDomain: string` to each entry in `lenderDirectory.ts`:
```typescript
{ id: 'hdfc-bank', name: 'HDFC Bank', officialEmailDomain: 'hdfcbank.com', ... }
```

Lender count: derived programmatically from `lenderDirectory.ts` at runtime — never hardcoded. (Review finding #6 — count changes as lenders are added or removed.)

### 0.4 Lender Onboarding Flow (new RM → lender)

Route: `/dashboard/rm/policies/onboard-lender`

**Step 1 — Lender selection:** RM picks from `lenderDirectory`. Already-assigned lenders greyed out.

**Step 2 — Bank email entry:**
- RM types official bank email (e.g. `ramesh.sharma@hdfcbank.com`)
- Client + server: domain must match `lenderDirectory[lender].officialEmailDomain`
- Domain mismatch → error before any OTP sent
- On match → `otpStore.send(email, { context: { purpose: 'onboarding', lenderId } })`

**Step 3 — OTP entry:** 6-box input. Existing `src/lib/services/otpStore.ts` handles expiry (15 min), attempts (5 max), lockout. On success → `RmLenderAssignment` created, `status: 'active'`, `nextVerificationDueBy: now + 30d`.

**Step 4 — Confirmation:** "You are now assigned to HDFC Bank. Monthly verification due by [date]."

### 0.5 Monthly Renewal

Daily cron (S71 infrastructure) checks `nextVerificationDueBy < now + 7d` → sends renewal OTP to `officialBankEmail`. 7-day grace window before `status: 'suspended'`.

Banner in `/dashboard/rm/policies`:
```
⚠️ Your HDFC Bank verification is due in 3 days.  [Verify now →]
```

### 0.6 Per-Action OTP Gate (policy changes)

Every RM submission triggers an OTP check. The OTP is issued with `policyId` + `draftHash` in context. OTP modal opens on "Submit for Approval" click. On success → short-lived `pmsOtpToken` issued, passed as header on the submit request.

### 0.7 RM Offboarding / Lender Transfer (Review finding #12)

When RM leaves the bank:
1. Admin opens `/dashboard/admin/rm-assignments`
2. Selects RM → "Transfer lender assignment" → picks replacement RM from active RMs with same lender domain
3. `transferredTo`, `transferredAt` set on the old assignment; new `RmLenderAssignment` created for replacement RM
4. All open drafts for that lender: `updatedBy` unchanged (audit preserved), but `reconciliationAssignedTo` updated to the replacement RM
5. Replacement RM receives in-app notification: "You have been assigned HDFC Bank policies. N drafts are pending your review."

Admin can also force-remove an assignment without transfer (marks `status: 'suspended'`).

### 0.8 Notification Events for Phase 0 (Review finding #25)

| Event | Recipient | Channel |
|---|---|---|
| Renewal OTP due in 7 days | RM | Email + in-app (max 1/day) |
| Assignment suspended (30-day lapse) | RM | Email + in-app |
| Transfer received | Replacement RM | In-app |
| New DSA suggestion for their lender | RM | In-app |

---

## Phase 1 — Database Schema & Models

### 1.1 PolicyDocument (`lender_policies` collection)

```typescript
interface PolicyDocument {
  _id: ObjectId;
  lenderId: string;
  loanProduct: LoanProduct;
  version: number;                    // increments on each publish
  hash: string;                       // SHA-256 of compiled JSON-Logic
  status:
    | 'draft'
    | 'submitted'
    | 'approved_scheduled'            // future validFrom (Review finding #5)
    | 'approved'
    | 'published'
    | 'archived';
  validFrom: Date;
  validTo: Date | null;

  // Optimistic locking (Review finding #3)
  lockVersion: number;                // incremented on every write; clients must echo last-known value

  // Reconciliation ownership (Review finding #22)
  reconciliationAssignedTo: string;   // rmUserId or adminUserId responsible for Step 4 sign-off

  sections: {
    eligibility: EligibilityConfig;
    income: IncomeConfig;
    foir: FoirConfig;
    ltv: LtvConfig | null;
    obligations: ObligationConfig;
    tenure: TenureConfig;
    roi: RoiConfig;
    geo: GeoConfig;
    fees: FeeConfig;
  };

  conditionalOverrides: ConditionalOverride[];
  bankCardNotes: BankCardNote[];

  sourceDocument: {
    text: string;
    fileName: string;
    uploadedAt: Date;
    uploadedBy: string;
  };

  // Resumable pipeline state (Review finding #4)
  pipelineState: {
    currentStep: 0 | 1 | 2 | 3 | 4 | 5;
    pass1Result: Pass1Result | null;
    pass2Clauses: Pass2Clause[] | null;
    rmStep1Decisions: Record<string, 'in_scope' | 'out_of_scope' | 'bank_card' | string>;
    rmStep2Encodings: Partial<ConditionalOverride>[];
    pass4LastScore: number | null;
    lastSavedAt: Date;
    errorState: { step: number; message: string } | null;   // pipeline timeout/failure record
  } | null;

  reconciliation: ReconciliationRecord;

  aiPipelineRun: {
    mode: 'automated' | 'manual_entry';
    pass1Score: number | null;
    pass4ScoreBeforeCorrection: number | null;
    pass5Triggered: boolean;
    finalScore: number | null;
    passesExecuted: number;
    totalTokensUsed: number;
    ranAt: Date;
  } | null;

  legacyComparison: {
    comparedAt: Date;
    discrepancies: LegacyDiscrepancy[];
    resolvedAt: Date | null;
    resolvedBy: string | null;
  } | null;

  // Key registry health (Phase 11 — form change accommodation)
  registryHealthCheck: {
    ranAt: Date;
    staleKeys: string[];              // var paths referenced in overrides but no longer in registry
    status: 'healthy' | 'stale_keys_found';
  } | null;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  submittedBy: string | null;
  submittedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  scheduledPublishAt: Date | null;    // when approved_scheduled, the target validFrom
  publishedBy: string | null;
  publishedAt: Date | null;
  adminRejectionNote: string | null;
  adminRejectedAt: Date | null;
  adminClauseComments: { clauseId: string; comment: string }[];
}
```

### 1.2 ConditionalOverride

```typescript
interface ConditionalOverride {
  id: string;                         // uuid
  label: string;
  sourceClauseId: string;
  authoringMode: 'template' | 'custom_json' | 'bank_card';
  templateId: string | null;
  templateParams: Record<string, unknown> | null;
  condition: JsonLogicRule;
  effect: PolicyEffect;
  scope: ConditionScope;
  source: 'website' | 'rm_confirmed' | 'aggregator' | 'assumed';
  confidence: number;                 // 0.0–1.0 (RM-set)
  aiConfidence: number | null;        // Pass 3 AI confidence

  // Conflict check
  conflictCheck: {
    ranAt: Date;
    conflicts: ConflictRecord[];
    acknowledgedBy: string | null;
    acknowledgedAt: Date | null;
  } | null;

  // Admin co-approval for custom_json
  adminCoApproved: boolean;
  adminCoApprovedBy: string | null;
  adminCoApprovedAt: Date | null;

  notes: string;
  addedBy: string;
  addedAt: Date;
}

interface ConflictRecord {
  existingOverrideId: string;
  existingLabel: string;
  conflictType: 'same_field_override' | 'overlapping_scope';  // see §2.6 — honest scope
  description: string;
}

interface PolicyEffect {
  fieldPath: string;
  operation: 'set' | 'add' | 'multiply' | 'max' | 'min';
  value: number | string | boolean;
}
```

### 1.3 EvaluationResult Extension (Review finding #8)

Add to the existing per-lender `EvaluationResult` type in `src/lib/ruleEngine/evaluationEngine.ts`:

```typescript
// Added to existing EvaluationResult
pmsVersionId: string | null;         // PolicyDocument._id.toString() if policy came from PMS
pmsVersionNumber: number | null;     // PolicyDocument.version for human-readable reference
```

This field is stored in the case evaluation record, enabling historical reproducibility: "Re-run this evaluation → get the same result because we still have the exact policy version."

### 1.4 LegacyDiscrepancy + PendingChange

```typescript
interface LegacyDiscrepancy {
  field: string;
  legacyValue: unknown;
  pmsValue: unknown;
  resolution: 'pms_wins' | 'legacy_wins_pending_rm' | 'pending';  // legacy_wins now creates a pendingChange
  resolvedBy: string | null;
  resolvedAt: Date | null;
  note: string | null;
}

// Used when legacy value wins a discrepancy or admin resolves a stale-key situation
interface PendingChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  reason: 'legacy_comparison' | 'stale_key_remediation' | 'rm_edit' | 'admin_manual_entry';
  changedBy: string;
  changedAt: Date;
  rmAcknowledged: boolean;
  rmAcknowledgedAt: Date | null;
}
```

### 1.5 PolicySuggestion (`policy_suggestions`)

As in spec §3.5, plus deduplication (Review finding #17):

```typescript
// Unique sparse index: { lenderId, loanProduct, fieldPath, submittedBy } TTL 30d
// One suggestion per DSA per field per lender per month
interface PolicySuggestion {
  _id: ObjectId;
  lenderId: string;
  loanProduct: LoanProduct;
  clauseId: string | null;
  fieldPath: string | null;
  currentValue: unknown;
  suggestedValue: unknown;
  dsaNote: string;                    // min 20 chars, max 500 chars (server-enforced)
  caseReference: string | null;
  branchCity: string | null;
  status: 'pending' | 'accepted' | 'dismissed';
  reviewedBy: string | null;
  reviewNote: string | null;
  submittedBy: string;
  submittedAt: Date;
}
```

### 1.6 FutureEnhancementItem (`policy_future_queue`)

As in spec §3.6. No changes.

### 1.7 New Indexes

```
lender_policies:       { lenderId: 1, loanProduct: 1, status: 1 }
lender_policies:       { lenderId: 1, loanProduct: 1, version: -1 }
lender_policies:       { status: 1, scheduledPublishAt: 1 }     ← for cron promotion
rm_lender_assignments: { rmUserId: 1, lenderId: 1 } unique
rm_lender_assignments: { status: 1, nextVerificationDueBy: 1 }
policy_suggestions:    { lenderId: 1, loanProduct: 1, fieldPath: 1, submittedBy: 1 }  sparse TTL 30d
policy_future_queue:   { status: 1, 'lenderIds': 1 }
```

---

## Phase 2 — Server Foundation

### 2.1 New guards (add to `src/lib/server/guards.ts`)

```typescript
// Checks: activeRole === 'rm' AND has active assignment for lenderId AND OTP current
export async function requireRmLenderAccess(locals, lenderId): Promise<RmLenderAssignment>

// Verifies the short-lived OTP token on submit/publish endpoints
// Token is bound to policyId + draftHash — see §0.2
export function requirePmsOtpToken(request, lenderId, policyId, draftHash): void
```

### 2.2 Optimistic Locking Middleware (Review finding #3)

All `PATCH /api/pms/policies/[id]` and `POST /api/pms/policies/[id]/submit` requests must include `lockVersion` in the request body. Server:

```typescript
const doc = await db.collection('lender_policies').findOne({ _id });
if (doc.lockVersion !== requestBody.lockVersion) {
  return apiError(res, 409, 'Policy was modified by another session — please refresh and retry.');
}
// Proceed with write, increment lockVersion
await db.collection('lender_policies').updateOne(
  { _id, lockVersion: requestBody.lockVersion },   // atomic check-and-set
  { $set: { ...changes }, $inc: { lockVersion: 1 } }
);
```

Client shows: "This policy was updated while you were editing — please refresh." Draft is preserved; only the write is rejected.

### 2.3 API Routes (all under `/api/pms/`)

```
POST   /api/pms/otp/send                     — send PMS OTP (reuses src/lib/services/otpStore.ts)
POST   /api/pms/otp/verify                   — verify + issue bound pmsOtpToken

POST   /api/pms/lender-assignments/onboard   — create RM-lender assignment
GET    /api/pms/lender-assignments            — RM's own assignments + statuses
POST   /api/pms/lender-assignments/transfer  — admin transfers assignment between RMs
DELETE /api/pms/lender-assignments/[id]      — admin removes assignment

POST   /api/pms/pipeline/pass1               — normalize: terminology + relevance
POST   /api/pms/pipeline/pass2               — atomize + ambiguity flag
POST   /api/pms/pipeline/pass3               — encode: template matching + JSON-Logic
POST   /api/pms/pipeline/pass4               — verify encodings (0-100 score)
POST   /api/pms/pipeline/pass5               — correct: re-encode failing clauses
POST   /api/pms/pipeline/pass6               — reconstruct: NL from JSON-Logic
POST   /api/pms/pipeline/delta               — delta parse for change circulars

GET    /api/pms/policies                     — list policies
POST   /api/pms/policies                     — create draft
GET    /api/pms/policies/[id]                — single policy
PATCH  /api/pms/policies/[id]                — update draft (requires lockVersion)
POST   /api/pms/policies/[id]/submit         — RM submit (requires pmsOtpToken)
POST   /api/pms/policies/[id]/approve        — admin approve (sets approved_scheduled or approved)
POST   /api/pms/policies/[id]/reject         — admin reject with clause-level notes
POST   /api/pms/policies/[id]/publish        — admin publish immediately
POST   /api/pms/policies/[id]/rollback       — admin rollback (see §2.8)
POST   /api/pms/policies/[id]/manual-entry   — admin bypass AI pipeline (see §2.5)

GET    /api/pms/policies/[id]/qa-run         — fetch last QA run
POST   /api/pms/policies/[id]/qa-run         — trigger new QA run

GET    /api/pms/policies/[id]/legacy-compare — fetch legacy discrepancy report
POST   /api/pms/policies/[id]/legacy-compare — trigger comparison vs TypeScript policies

POST   /api/pms/overrides/conflict-check     — check override for conflicts

GET    /api/pms/dev-queue                    — list future enhancement items
POST   /api/pms/dev-queue                    — create/upsert item
PATCH  /api/pms/dev-queue/[id]/promote       — admin promotes to form question

GET    /api/pms/suggestions                  — DSA suggestions
POST   /api/pms/suggestions                  — DSA submits (deduplication enforced)
PATCH  /api/pms/suggestions/[id]             — RM/admin accepts or dismisses

GET    /api/pms/term-dictionary              — list canonical terms (read from TS file at runtime)
POST   /api/pms/term-dictionary/proposals    — admin proposes new entry (Review finding #23)
GET    /api/pms/term-dictionary/proposals    — list pending proposals

GET    /api/pms/registry/health              — key registry health check (Phase 11)
POST   /api/pms/registry/health              — trigger health scan across all published policies
```

### 2.4 Rate Limiting on Pipeline Endpoints (Review finding #15)

Apply existing `rateLimiter.ts` to all `/api/pms/pipeline/*` endpoints:

```typescript
// Per-RM: max 5 full pipeline runs (Pass 1+2) per 24 hours
// Per-endpoint: max 10 requests per minute per IP
// Circuit breaker: if a single session uses > 100,000 tokens → abort + alert admin
```

Token consumption per session logged to `aiPipelineRun.totalTokensUsed` in `PolicyDocument`.

### 2.5 AI Pipeline Module (`src/lib/server/pms/aiPipeline.ts`)

#### Pass 1 — Normalize: Terminology Resolution + Relevance Classification

Maps to Stage 0a + 0b. Context injected: term dictionary, out-of-scope category list.

Input: Raw policy text.

Output:
```typescript
interface Pass1Result {
  normalizedText: string;
  segments: {
    id: string;
    originalText: string;
    normalizedText: string;
    relevance: 'in_scope' | 'out_of_scope' | 'ambiguous';
    unknownTerms: string[];
  }[];
}
```

**Timeout:** 30 seconds. On timeout: save `pipelineState.errorState = { step: 0, message: 'Pass 1 timed out' }`, return structured error to client. Client shows "AI pipeline timed out — your draft is saved. Please try again." (Review finding #21)

Human pause: RM reviews in Wizard Step 1.

#### Pass 2 — Normalize: Atomization + Ambiguity Flagging

Maps to Stage 0c + 0d. Context injected: key registry for product, RM's Step 1 decisions.
Input: Only `in_scope` segments after RM review.

Output:
```typescript
interface Pass2Clause {
  id: string;
  originalText: string;
  normalizedText: string;
  atoms: {
    conditionText: string;
    candidateKeyPath: string | null;
    operator: string | null;
    value: unknown;
    scope: string | null;
  }[];
  outcome: { fieldPath: string | null; value: unknown };
  ambiguityFlags: {
    type: 'multiple_interpretations' | 'internal_conflict' | 'external_reference' | 'unmapped_key';
    description: string;
    interpretations?: string[];
  }[];
  tag: ClauseTag;
}
```

Timeout: 30 seconds. Same error-state pattern.

Human pause: RM reviews in Wizard Step 1 (merged with Pass 1 review — user sees one unified list).

#### Pass 3 — Encode

Maps to Stage 2. Context injected: key registry, template library (22 templates).
Input: Finalized RM-confirmed clause list.

**Server-side guard (Review finding #18):** Reject with HTTP 422 if any clause in the input has `relevance === 'ambiguous'`. Message: "N clauses are still marked as ambiguous. Please resolve all ambiguities in Step 1 before proceeding."

Output:
```typescript
interface Pass3Encoding {
  clauseId: string;
  mappable: boolean;
  preferredMode: 'template' | 'custom_json' | null;
  templateId: string | null;
  templateParams: Record<string, unknown> | null;
  rawCondition: JsonLogicRule | null;
  effect: PolicyEffect | null;
  scope: ConditionScope | null;
  confidence: number;
  unmappableReason: string | null;
  routingRecommendation: 'encode' | 'bank_card' | 'dev_queue';
}
```

Human pause: RM reviews in Wizard Step 2.

#### Pass 4 — Encoding Verification

Context: normalized clause list (Pass 2), RM's final encodings, key registry.

Validates: key paths in registry, exact numbers, logic matches IF-THEN structure, no hallucinations, all clauses have a decision.

Output:
```typescript
interface Pass4Result {
  overallScore: number;               // 0–100
  isValid: boolean;                   // score >= 85
  clauseScores: {
    clauseId: string;
    score: number;
    issues: {
      severity: 'critical' | 'high' | 'medium' | 'low';
      category: 'wrong_field' | 'hallucination' | 'missing' | 'wrong_value' | 'wrong_logic';
      description: string;
      policyQuote: string;
      correction: string;
    }[];
  }[];
  summary: string;
}
```

#### Pass 5 — Correction (conditional — only if score < 85 or any critical issue)

Fixes ONLY the listed issues from Pass 4. Output: same shape as Pass 3 for re-encoded clauses only. Merged with Pass 3 — corrected entries replace originals.

Pass 4 re-runs once after Pass 5. If score still < 85 → all remaining issues shown as advisory red-confidence badges. Maximum one correction cycle.

#### Pass 6 — Reconstruction

Maps to Stage 3.

- **Method A (deterministic, zero tokens):** Template-based overrides reconstructed from `templateId + params` using each template's canonical English description. Pure TypeScript.
- **Method B (AI prose):** All overrides sent to OpenAI → full NL policy document. 30-second timeout.

Output:
```typescript
interface Pass6Result {
  methodA: { clauseId: string; reconstructedText: string }[];
  methodB: string;
}
```

#### Trigger sequence

| When | Passes triggered |
|---|---|
| RM uploads document, clicks "Start Parsing" | Pass 1 → Pass 2 (sequential, one server action) |
| RM clicks "Proceed to Encoding" after Step 1 | Pass 3 |
| RM completes Step 2 (all clauses reviewed) | Pass 4 → Pass 5 if needed → Pass 4 re-verify |
| RM reaches Step 4 (Reconciliation) | Pass 6 (A: instant; B: spinner) |

#### State persistence on every step (Review finding #4)

Every RM action in the wizard (accepting a clause, saving an encoding, resolving an ambiguity) triggers a `PATCH /api/pms/policies/[id]` that saves `pipelineState`. On page mount, the wizard reads `pipelineState.currentStep` and resumes. A "Resume draft" link appears on `/dashboard/rm/policies/[lenderId]/[product]` for any policy with `pipelineState !== null && status === 'draft'`.

#### Token cost estimate (gpt-4o-mini)

| Pass | ~Tokens | Conditional |
|---|---|---|
| Pass 1 | 4,000–8,000 | Always |
| Pass 2 | 6,000–12,000 | Always |
| Pass 3 | 8,000–15,000 | Always |
| Pass 4 | 6,000–10,000 | Always |
| Pass 5 | 4,000–8,000 | Only if score < 85 |
| Pass 6B | 4,000–6,000 | Always |
| **Total (no Pass 5)** | **~28k–51k** | ~$0.10–0.25 |
| **Total (with Pass 5)** | **~32k–59k** | ~$0.12–0.30 |

Apply prompt caching on term dictionary and key registry (stable across all passes).

### 2.6 Manual Entry Path — Admin Escape Valve

**When to use:** AI pipeline produced unsatisfactory output, or Admin is pasting externally-prepared JSON (from claude.ai, a consultant, or a developer).

**Access:** Admin only. Button visible on pipeline result screen only when score < 85, or always accessible via the JSON Editor tab.

**Server endpoint:** `POST /api/pms/policies/[id]/manual-entry`

On receipt:
1. Schema-validate pasted JSON against `PolicyDocument` shape
2. Validate all `var` paths in `conditionalOverrides` against key registry for the product
3. Run conflict checker across all `conditionalOverrides`
4. Set `aiPipelineRun.mode: 'manual_entry'`
5. Set `reconciliationAssignedTo` — Admin must designate a responsible RM (Review finding #22)
6. All `reconciliation.clauses` → `status: 'pending'` — reconciliation Step 4 still required

**UI modal:**
```
┌────────────────────────────────────────────────────────────────┐
│  Manual Policy Entry                               [Admin]      │
│  ───────────────────────────────────────────────────────────── │
│  Paste PolicyDocument JSON (full or partial):                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ { "sections": { ... }, "conditionalOverrides": [ ... ] } │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Assign reconciliation to:  [Ramesh Sharma (HDFC Bank) ▼]       │
│                                                                  │
│  Validation:  ✓ Schema valid                                     │
│               ✓ All var paths in key registry                    │
│               ⚠ 1 conflict detected in overrides                 │
│               ℹ Reconciliation (Step 4) still required           │
│                                                                  │
│  [Load into editor →]                                            │
└────────────────────────────────────────────────────────────────┘
```

### 2.7 Conflict Checker (`src/lib/server/pms/conflictChecker.ts`) — Honest Scope (Review finding #9)

```typescript
function checkConflicts(
  newOverride: ConditionalOverride,
  existingOverrides: ConditionalOverride[]
): ConflictRecord[]
```

**What it detects reliably:**
1. **Same field, same scope:** Another override affects the same `effect.fieldPath` with identical or overlapping scope selector → definite `same_field_override` conflict.
2. **Same template, same scope:** Same `templateId` appears twice for the same scope → definite duplicate.
3. **Overlapping template scope:** Two overrides both derived from templates that share a scope and field, with parameter ranges that could overlap (e.g., two `FoirByIncomeBand` templates for the same employment type).

**What it does NOT attempt (documented limitation):**
Semantic satisfiability of arbitrary nested JSON-Logic conditions. For custom JSON-Logic with complex nested `and`/`or`/`in` conditions, the checker emits: *"These two overrides both affect `[field]` — manually verify their conditions don't overlap."* This is an advisory, not a conflict classification.

**Null-safety advisory (not a conflict):** `!=` / `!==` usage flagged as informational amber warning. Not a `ConflictRecord`. Not blocking.

### 2.8 Rollback Specification (Review finding #20)

`POST /api/pms/policies/[id]/rollback` — Admin only.

Behaviour:
1. Rollback is atomic: archives current published version (`validTo = now`, `status: 'archived'`), sets target version's `status: 'published'` with `validFrom: now` (not its original `validFrom`)
2. Version history records the rollback event with `{ rollbackFrom: versionN, rollbackTo: versionM, rolledBackBy, rolledBackAt }`
3. Evaluations already in progress reference their stored `pmsVersionId` — immutable, unaffected by rollback
4. DSAs with evaluations against the now-archived version within the last 7 days receive in-app notification: "HDFC Bank Home Loan policy was updated — your case results may have changed."

### 2.9 Scheduled Publish Cron (Review finding #5)

Add to existing S71 cron infrastructure:

```typescript
// Runs every minute (lightweight — simple DB query)
async function promoteScheduledPolicies() {
  const due = await db.collection('lender_policies').find({
    status: 'approved_scheduled',
    scheduledPublishAt: { $lte: new Date() }
  }).toArray();

  for (const policy of due) {
    // Atomic: archive existing published, promote scheduled
    await db.collection('lender_policies').bulkWrite([
      { updateOne: { filter: { lenderId: policy.lenderId, loanProduct: policy.loanProduct, status: 'published' },
                     update: { $set: { status: 'archived', validTo: new Date() } } } },
      { updateOne: { filter: { _id: policy._id },
                     update: { $set: { status: 'published', publishedAt: new Date() } } } }
    ]);
    // Notify assigned RM
    await sendInAppNotification(policy.reconciliationAssignedTo, 'policy_published', { policyId: policy._id });
  }
}
```

### 2.10 QA Runner (`src/lib/server/pms/qaRunner.ts`)

- Imports `variationGenerator.ts` (built S79)
- For each of 296 profiles: compiles new PMS policy, runs through `evaluationEngine.ts`, compares against previous published version result
- Also runs against TypeScript-compiled policy to detect conflicts during migration period

```typescript
interface QaRunResult {
  ranAt: Date;
  totalProfiles: 296;
  changedProfiles: number;
  flippedEligibility: number;
  results: {
    profileId: string;
    before: EvaluationResult;
    after: EvaluationResult;
    changed: boolean;
    changeTypes: ('eligibility' | 'foir' | 'roi' | 'tenure' | 'ltv')[];
    triggeringOverrideId: string | null;
  }[];
}
```

---

## Phase 3 — Term Dictionary

Location: `src/lib/config/pms/termDictionary.ts`

Static TypeScript file. Changes require code review. Admin proposes additions via `POST /api/pms/term-dictionary/proposals` → stored in `term_dictionary_proposals` collection → Dev merges after review. (Review finding #23 — no PATCH route that implies direct DB write.)

`GET /api/pms/term-dictionary` reads directly from the TS module at runtime — no DB round-trip.

Seed content: all §4.1–4.6 synonym tables from spec + V7 policy spec field mapping tables from `AI_Based_Bank_Management`.

---

## Phase 4 — RM Fresh Encode Wizard (6-step linear stepper)

### Route

```
/dashboard/rm/policies/[lenderId]/[product]/encode
  +page.svelte          — wizard shell
  +page.server.ts       — load/create draft, guard check, resume from pipelineState
```

Steps shown in left sidebar. Completed steps navigable backwards. Future steps locked. Any backwards navigation that modifies an encoding clears `reconciliation.signedOff` server-side (Review finding #19).

---

### Step 0 — Document Setup

Fields: Lender (locked), Loan product (locked), Source type, File upload or paste, Document date.

On "Start Parsing →":
- Draft created (`status: 'draft'`, `lockVersion: 0`, `pipelineState.currentStep: 0`)
- POST triggers Pass 1 + Pass 2 server-side (sequential, one action)
- Spinner: "Normalizing terminology… Classifying clauses… Atomizing conditions…"
- **Timeout: 30s per pass.** On timeout → `pipelineState.errorState` set → client shows: "AI pipeline timed out — your draft is saved. Please try again."
- On completion → `pipelineState.currentStep: 1`, wizard advances to Step 1

Admin-only alternative at this screen: "Manual entry →" button that opens the manual entry modal (§2.6).

---

### Step 1 — Clause Review

Unified view of Pass 1 + Pass 2 output: normalized segments with atomization shown per clause.

**Card anatomy:**
```
┌──────────────────────────────────────────────────────────┐
│ [IN-SCOPE]  [Confidence: 87%]              [⚠ Ambiguous] │
│ ──────────────────────────────────────────────────────── │
│ ORIGINAL:    "For takeover cases, self contribution ≥20%" │
│ NORMALIZED:  "For Balance Transfer, down payment ≥ 20%"  │
│                                                           │
│ Atoms: IF loanType = Balance Transfer                     │
│        THEN downPaymentPercent >= 0.20                    │
│ ──────────────────────────────────────────────────────── │
│  [✓ Accept]  [✎ Edit]  [🚫 Out of scope]  [🏦 Bank card] │
└──────────────────────────────────────────────────────────┘
```

Ambiguous clauses: yellow border. RM must resolve all before "Proceed to Encoding" is enabled (UI gate). Server-side: Pass 3 endpoint rejects with 422 if any clause has `relevance === 'ambiguous'` (Review finding #18).

Unknown terms panel: RM can suggest canonical mapping → proposal queued for admin.

On RM action: `pipelineState.rmStep1Decisions` saved immediately.

On "Proceed to Encoding →": triggers Pass 3.

---

### Step 2 — Encoding Review

Left sidebar: clause list with status dots. Main panel: three tabs per clause.

**Tab A — Template** (default if AI chose template, or if AI chose custom_json and a template match exists)

All 22 templates in a searchable dropdown. Parameters as typed form fields.

**Tab B — Custom JSON**

Behaviour depends on how the RM arrived here (Review finding #13):

- **RM manually switches from Template to Custom JSON:** Amber banner: "You are overriding the template suggestion. Please ensure your JSON-Logic is correct." Checkbox: "I confirm this custom JSON-Logic is correct" required.
- **AI returned `preferredMode: 'custom_json'` (no template found):** Editor renders open. Amber banner: "AI could not find a template for this clause — custom JSON was used. Review carefully." No checkbox required.

Both cases: CodeMirror editor with key registry validation (red underline for unregistered paths), null-safety linter (advisory amber for `!=`/`!==`), "Run conflict check" button.

**Tab C — Bank Card**

Plain-language note + applies-when + routing reason (`no_key_exists` or `queued_for_form_question`).

Progress bar: "14 / 22 clauses encoded"

On all clauses resolved: "Verifying encodings…" spinner (Pass 4 → Pass 5 if needed → Pass 4 re-verify).

Sign-off revocation: any encoding change after Step 4 sign-off → server automatically sets `reconciliation.signedOff = false` on the next PATCH. When RM returns to Step 4, they see: "Your sign-off was cleared because an encoding was modified. Please re-review." (Review finding #19)

---

### Step 3 — Missed Items

Two-column: Bank Card Notes (left) + Dev Queue items (right). No blocking condition.

Summary banner: "✓ 18 encoded · 🏦 3 bank card · 🔧 2 dev queue — All missed items documented."

---

### Step 4 — Reconciliation

Three-column table: Original | Reconstructed (Method A) | Status | Action.

**Sign-off flow:**
- Checkbox only appears when all non-excluded clauses are Matched
- Server verifies `reconciliation.signedOff === true` before accepting submit in Step 5
- Any subsequent encoding change (backwards navigation) clears `signedOff` (Review finding #19)

---

### Step 5 — Submit

Confidence summary (advisory only):
```
Overall policy confidence: 79%  [Review suggested]
Low confidence clauses:
  • "Rental income accepted up to 40% of total" — 52% — Source: Aggregator
  • "Pensioner max age: 70" — 58% — Source: Assumed
```

OTP Gate:
- Modal opens on "Submit for Approval" click
- OTP sent to `officialBankEmail` (reuses `src/lib/services/otpStore.ts`)
- 6-box input. On success → `pmsOtpToken` issued, bound to `policyId + draftHash`
- Submit endpoint verifies token + recomputes `draftHash` to confirm payload hasn't changed
- Status: `draft` → `submitted`

---

## Phase 5 — RM Edit Mode

### Route

```
/dashboard/rm/policies/[lenderId]/[product]/edit
```

### Entry A — Direct Field Edit

Section sidebar (9 sections). Each renders current published values as editable form:

```
FOIR Configuration                             [Source: Website ✓]
──────────────────────────────────────────────────────────────────
High income cap:    [65%]  above: [₹75,000/month]
Mid income cap:     [55%]
Low income cap:     [45%]
Source: [Website ▼]  Confidence: [88%]  Notes: [    ]

💬 1 DSA suggestion: "68% at Bandra — CA profile" — Ramesh, Case #HL-4821
                      [Accept → pre-fill 68%]  [Dismiss]

[Save to draft]   ← DRAFT label always shown; never live until admin approves
```

Every save: increments `lockVersion`, saves `pendingChange` record, notifies `reconciliationAssignedTo` RM if change was made by admin.

### Entry B — Delta Parse (Change Circular)

Upload circular → `POST /api/pms/pipeline/delta`. Delta size guard (Review finding #10):

```
Server: if (uploadSize / existingPolicy.sourceDocument.text.length) > 0.60 {
  return { warning: 'full_policy_detected', message: 'This upload appears to be a full policy document, not a change circular. Proceed as delta parse?' }
}
```

Client shows confirmation prompt. RM confirms → full delta pipeline runs. Mini wizard: only delta clauses, Steps 1–4 scoped to changes.

### "Legacy Wins" — Notify RM (Review finding #11)

When admin resolves a discrepancy as "Legacy wins" in the stale system audit, instead of silently overwriting:
1. `PendingChange` record created with `reason: 'legacy_comparison'`
2. `reconciliationAssignedTo` RM receives in-app notification: "HDFC Bank Home Loan — Admin restored a value from the legacy system. Please review and acknowledge."
3. RM acknowledges in their policy detail view: "Admin set `tenure.maxYears` to 30 (was 25, restored from legacy TypeScript policy). [Acknowledge]"
4. Only after RM acknowledgement: `pendingChange.rmAcknowledged = true`, policy can be published.

---

## Phase 6 — Admin Review & Approval

### Route

```
/dashboard/admin/policies/review/[policyId]
```

### Layout: sidebar + 3 tabs

**Sidebar:**
```
HDFC Bank — Home Loan (New)
Submitted by: Ramesh Sharma  ·  23 Apr 2026 14:32
Version 3  (live: v2)

Entry mode:  🤖 AI Pipeline (6-pass, score 88/100)
Confidence:  79% avg
Clauses:     18 encoded  ·  3 bank card  ·  2 dev queue

[Approve ▼]  [Reject with notes]
  └─ Approve & publish now
  └─ Approve & schedule for [date picker]   ← creates approved_scheduled status
```

**Tab 1 — Impact Report (296 QA profiles)**

"Run QA scenarios" button. Diff table — flipped rows clickable for full trace.

**Tab 2 — Reconciliation Log**

Clause-by-clause (read-only). Admin clause comments inline. Custom JSON-Logic overrides show co-approval widget.

**Tab 3 — Dev Queue & Missed Items**

Informational. Admin action for threshold-met items.

### Notification Events for Phase 6 (Review finding #25)

| Event | Recipient | Channel |
|---|---|---|
| Policy submitted for review | Admin (all) | In-app |
| Policy approved | RM | Email + in-app |
| Policy rejected | RM | Email + in-app (with clause comments) |
| Policy published (scheduled) | RM | In-app |
| QA run reveals unexpected flip | Admin | In-app |
| Legacy comparison — "legacy wins" resolution | RM | In-app |
| Rollback executed | RM + DSAs with recent evaluations | In-app |
| Dev queue threshold met (3 lenders) | Admin | In-app |

---

## Phase 7 — Admin Dev Queue & JSON Editor

### Dev Queue Page

Route: `/dashboard/admin/policies/dev-queue`

Table: Clause text | Lender count | Status | Action. Row expanded: lender list, suggested key/values/question.

### JSON Editor

Route: `/dashboard/admin/policies/[policyId]/json-editor`

Features: CodeMirror, schema validation, key registry validation, diff view, conflict checker, null-safety linter, optimistic locking (lockVersion in save).

Cannot save if schema validation fails. All saves create a new draft version (never live immediately).

### Gender Casing Normalization (Review finding #16)

The spec §11.7 flags that `gender` is stored as lowercase (`male`, `female`). Before any gender-conditional override goes into production:

**Decision required (before build — add to Open Items):** Confirm canonical casing for `gender`. Recommendation: keep lowercase to match existing stored data and avoid a data migration. Update all policy examples in both spec docs to use lowercase. Remove the "recommendation: capitalise" note from §11.7 or replace with "decision: lowercase is canonical, no migration needed."

This is not a migration task — it is a documentation clarification. Add this to the Open Items list.

---

## Phase 8 — Stale System Audit & Migration

### 8.1 Legacy Comparison Runner

Trigger: `POST /api/pms/policies/[id]/legacy-compare`

Server: calls `compiler.ts` with lender's TypeScript overrides → `compiledLegacyPolicy` → compare with `PolicyDocument.sections` field by field → `LegacyDiscrepancy[]`.

**Discrepancy table:**

| Field | Legacy Value | PMS Value | Resolution |
|---|---|---|---|
| eligibility.minCibil | 700 | 750 | [PMS wins] [Legacy wins → notifies RM] [Ask RM] |
| foir.highCap | 0.65 | 0.65 | ✓ Match |
| geo.excludedStates | ['J&K'] | [] | ⚠ PMS MISSING → [Legacy wins → notifies RM] |

"Legacy wins" → creates `PendingChange` + notifies RM (§5 / Review finding #11).

### 8.2 Deletion Gate

TypeScript entries not deleted until:
1. PMS policy for lender+product is `published`
2. Legacy comparison run and all discrepancies resolved + RM acknowledged all legacy-wins changes
3. Admin clicks "Mark legacy entries for removal"

Migration counter derived programmatically from lenderDirectory count (not hardcoded 77). (Review finding #6)

---

## Phase 9 — DSA Suggestion Flow

**Build dependency corrected:** Phase 9 depends on Phase 6 (requires at least one published policy). (Review finding #24)

DSA suggestion deduplication: unique sparse index `{ lenderId, loanProduct, fieldPath, submittedBy }` TTL 30 days. Server enforces: min 20 chars, max 500 chars on `dsaNote`. (Review finding #17)

---

## Phase 10 — Page Map

### RM pages

| Route | Purpose |
|---|---|
| `/dashboard/rm/policies` | Policy library — own lenders, status badges, renewal banners |
| `/dashboard/rm/policies/onboard-lender` | Lender onboarding wizard (bank email OTP) |
| `/dashboard/rm/policies/[lenderId]/[product]` | Policy detail — current values, pending changes, version history, "Resume draft" |
| `/dashboard/rm/policies/[lenderId]/[product]/encode` | Fresh encode wizard (6 steps, resumable) |
| `/dashboard/rm/policies/[lenderId]/[product]/edit` | Edit mode — direct fields or delta parse |
| `/dashboard/rm/policies/[lenderId]/[product]/suggestions` | DSA suggestion inbox |

### Admin pages

| Route | Purpose |
|---|---|
| `/dashboard/admin/policies` | Full policy library, all lenders |
| `/dashboard/admin/policies/review/[policyId]` | 4-panel approval review |
| `/dashboard/admin/policies/[policyId]/json-editor` | Raw JSON editor + conflict checker |
| `/dashboard/admin/policies/[policyId]/legacy-compare` | Stale system discrepancy resolution |
| `/dashboard/admin/policies/dev-queue` | Unmappable clause queue + form question promotion |
| `/dashboard/admin/policies/term-dictionary` | Canonical term management + proposals |
| `/dashboard/admin/policies/versions/[lenderId]` | Version history + rollback |
| `/dashboard/admin/rm-assignments` | Manage assignments, force-remove, transfer |
| `/dashboard/admin/registry-health` | Key registry health dashboard (Phase 11) |

---

## Phase 11 — Form Key Lifecycle Management

**This is the answer to: "What happens when the form changes?"**

The key registry is the contract between the form and the policy system. Every `var` path in every `ConditionalOverride` must resolve to a key in the key registry. When the form changes — a question is added, renamed, or deleted — this contract must be actively managed.

This phase does NOT rely on developer memory or discipline. Three enforcement layers (append-only registry + CI gate + admin dashboard) make the system self-protective.

---

### 11.1 Key Registry — Append-Only Rule

Location: `src/lib/config/pms/keyRegistry.ts`

**A row is NEVER deleted from this file.** Developers may only:
- Add a new entry (`deprecatedAt: null`)
- Update `deprecatedAt` + `deprecationReason` on an existing entry

Deleting a row = CI failure (§11.2 Rule A). Dead keys remain in the file forever, marked deprecated. This means even after a form question is long gone, admin can always see "this key existed, was deprecated on this date, for this reason."

```typescript
interface KeyRegistryEntry {
  path: string;                        // "allApplicantDetails.0.gender"
  type: 'string' | 'number' | 'boolean' | 'enum' | 'string[]';
  enumValues?: string[];               // valid values for enum type
  deprecatedEnumValues?: string[];     // old values no longer valid (§11.5)
  products: LoanProduct[] | 'all';
  source: 'form' | 'computed';         // form = buildLoanPayload(), computed = payloadEnricher.ts
  bindsTo: string;                     // the form question's bindsTo key
  addedAt: string;                     // ISO date
  deprecatedAt: string | null;         // ISO date — null = active
  deprecationReason: string | null;
  replacedBy: string | null;           // path of the replacement key if renamed/replaced
}
```

---

### 11.2 CI Gate (`scripts/check-registry-integrity.ts`)

Runs on every PR and as part of `pnpm check`. Three enforced rules — all automatic, no developer input needed:

**Rule A — No row deletion:**
Compares `keyRegistry.ts` against the previous committed version. If any entry that existed before is absent now → CI fails:
```
ERROR: Key 'allApplicantDetails.0.professionalCategory' was present in the last 
commit but is now missing from keyRegistry.ts. Rows may never be deleted — mark 
as deprecated instead.
```

**Rule B — Form/registry sync:**
Scans all `bindsTo` keys currently active in `src/lib/config/` form question banks. Any registry entry with `deprecatedAt: null` whose `bindsTo` key no longer appears in any form config → CI fails:
```
ERROR: Key 'allApplicantDetails.0.professionalCategory' is marked active in 
keyRegistry.ts but its bindsTo key 'professionalCategory' does not exist in any 
form question bank. Mark it deprecated before removing the form question.
```
This catches the case where a developer deletes the form question and forgets the registry entirely.

**Rule C — Changelog required:**
Every change to `keyRegistry.ts` (add, deprecate) must have a corresponding entry added to `registryChangelog.ts` in the same commit → CI fails if changelog is not updated:
```
ERROR: keyRegistry.ts was modified but registryChangelog.ts has no new entries. 
Add a changelog entry for every registry change.
```

---

### 11.3 Registry Changelog (`src/lib/config/pms/registryChangelog.ts`)

Append-only, version-controlled audit log. Ships with the build — no DB queries needed for admin history view.

```typescript
interface RegistryChangeEntry {
  key: string;
  action: 'added' | 'deprecated' | 'renamed' | 'enum_value_deprecated';
  at: string;                  // ISO date
  by: string;                  // developer email / github handle
  note: string;                // mandatory — why this change was made
  replacedBy?: string;         // for deprecated/renamed — what to use instead
  affectedProducts?: LoanProduct[] | 'all';
  oldEnumValue?: string;       // for enum_value_deprecated action
  newEnumValue?: string;
}

export const REGISTRY_CHANGELOG: RegistryChangeEntry[] = [
  // append entries here — oldest first, newest last
  {
    key: 'propCost',
    action: 'added',
    at: '2026-03-15',
    by: 'dev@digitaldsa.com',
    note: 'Direct sale property cost from buildLoanPayload()',
    affectedProducts: ['Home Loan', 'Loan Against Property', 'Plot and Construction Loan']
  },
  // example future entry:
  // {
  //   key: 'professionalCategory',
  //   action: 'deprecated',
  //   at: '2026-05-01',
  //   by: 'dev@digitaldsa.com',
  //   note: 'Removed from Professional Loan form — question replaced by professionType',
  //   replacedBy: 'professionType',
  //   affectedProducts: ['Professional Loan']
  // }
];
```

---

### 11.4 Registry Integrity Checker (`src/lib/server/pms/registryIntegrityChecker.ts`)

Runs automatically on every deploy (triggered at app startup) and via daily cron. Also manually triggerable from the admin dashboard.

```typescript
async function runRegistryHealthCheck(): Promise<RegistryHealthReport>

interface RegistryHealthReport {
  ranAt: Date;
  totalPoliciesScanned: number;
  healthyPolicies: number;
  stalePolicies: {
    policyId: string;
    lenderId: string;
    loanProduct: string;
    staleKeys: {
      keyPath: string;
      overrideId: string;
      overrideLabel: string;
      deprecatedAt: string;
      replacedBy: string | null;
    }[];
  }[];
  futureQueueReady: {
    keyPath: string;
    addedAt: string;
    queuedClauseCount: number;
  }[];
}
```

Scans every `var` path in every `ConditionalOverride` across all published policies. A key is "stale" if `deprecatedAt !== null` in the registry. Results are stored on the `PolicyDocument.registryHealthCheck` embedded field and surfaced in the admin dashboard.

---

### 11.5 When a New Question Is Added

Developer adds form question + new `KeyRegistryEntry` + `registryChangelog.ts` entry in the same PR. CI passes automatically. On next deploy:

- New key available in AI pipeline Passes 1–3, condition builder dropdown, conflict checker
- **Future Queue promotion:** Admin dashboard shows banner: *"Key `hasBISCertification` is now in the registry — 3 queued clauses can now be encoded. [Re-encode now →]"*
- "Re-encode now" → targeted re-encoding for those clauses only. Normal RM → admin approval flow.
- Existing published policies: zero impact.

**Zero downtime. Zero existing policy breakage.**

---

### 11.6 When a Question Is Deleted

**No developer discipline required.** The three layers catch every failure mode:

| Failure mode | Caught by |
|---|---|
| Dev deletes form question + registry row in one PR | CI Rule A (row deletion) — PR blocked |
| Dev deletes form question, leaves registry row (forgets deprecatedAt) | CI Rule B (bindsTo scan) — PR blocked |
| Dev sets deprecatedAt but forgets changelog entry | CI Rule C — PR blocked |
| Dev does everything right but policies still reference the key | Integrity checker flags on deploy → admin dashboard red banner |
| Dev bypasses CI somehow | Daily cron + deploy-time scan catches it |

**Correct flow (enforced by CI):**

1. Developer marks `deprecatedAt` + `deprecationReason` + `replacedBy` in `keyRegistry.ts`
2. Developer adds changelog entry in `registryChangelog.ts` — same commit
3. CI passes. PR merges. Deploy runs integrity checker automatically.
4. Admin dashboard shows affected policies with "Fix now →" links (see §11.8)
5. RM re-encodes affected overrides using the replacement key. Normal submit → approve → publish flow.
6. Once all affected policies are re-published clean: developer removes the form question (separate PR). CI Rule B now passes because `bindsTo` key is gone from both form config AND registry is already marked deprecated.

**The key row stays in `keyRegistry.ts` forever** — marked deprecated. Admin can always see the full history.

---

### 11.7 When an Enum Value Changes

1. Old value added to `deprecatedEnumValues` array on the `KeyRegistryEntry` (not removed from `enumValues` yet — still needed by existing policies)
2. New value added to `enumValues`
3. Changelog entry with `action: 'enum_value_deprecated'`, `oldEnumValue`, `newEnumValue`
4. CI passes. Integrity checker scans string literal matches of the old value in `ConditionalOverride.condition` JSON across all published policies.
5. Admin dashboard flags affected overrides. Condition builder highlights the old value in red with tooltip "This value is deprecated — use [newValue]."
6. RM updates the condition value → normal approval flow.
7. Once all policies re-published clean: old value removed from `enumValues` (separate PR).

---

### 11.8 When a Key Path Is Renamed

Add both entries in the same PR — old deprecated with `replacedBy`, new added:

```typescript
// keyRegistry.ts — both entries in same PR
{ path: 'loanTransaction.propCost', deprecatedAt: '2026-05-01',
  deprecationReason: 'renamed for clarity', replacedBy: 'loanTransaction.propertyValue' }

{ path: 'loanTransaction.propertyValue', addedAt: '2026-05-01', ... }
```

Integrity checker detects the 1:1 rename via `replacedBy`. Admin dashboard shows: *"2 overrides use `propCost` — auto-migrate to `propertyValue`?"* Auto-migration rewrites the `var` path string in stored JSON-Logic. RM reviews the updated override in the condition builder, admin approves as normal.

---

### 11.9 Registry Health Dashboard (`/dashboard/admin/registry-health`)

```
Key Registry Health                    Last scanned: 23 Apr 2026, 14:00
                                       [Run scan now]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 ACTION REQUIRED — 3 policies reference deprecated keys

  Key: allApplicantDetails.0.professionalCategory
  Deprecated: 1 May 2026  ·  Reason: "Removed, replaced by professionType"
  Replacement: professionType  ·  By: dev@digitaldsa.com

  ┌────────────────────────────────────────────────────────────┐
  │ HDFC Bank — Professional Loan (v4)                         │
  │ Override: "Professional category LTV boost"                │
  │ Condition uses: allApplicantDetails.0.professionalCategory │
  │                                     [Open policy & fix →]  │
  ├────────────────────────────────────────────────────────────┤
  │ ICICI Bank — Professional Loan (v2)                        │
  │ Override: "Category-based FOIR relaxation"                 │
  │                                     [Open policy & fix →]  │
  ├────────────────────────────────────────────────────────────┤
  │ Axis Bank — Professional Loan (v3)                         │
  │ Override: "Doctor LTV 90%"                                 │
  │                                     [Open policy & fix →]  │
  └────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ FUTURE QUEUE — New keys now encodeable

  Key: hasBISCertification  ·  Added: 20 Apr 2026
  3 clauses were queued waiting for this key.
                                     [Re-encode queued clauses →]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 72 policies healthy — all var paths active in registry

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REGISTRY CHANGELOG  (all time — from registryChangelog.ts)

  Date          Key                          Action      Products
  ──────────────────────────────────────────────────────────────
  01 May 2026   professionalCategory         DEPRECATED  Professional Loan
                → replaced by: professionType
                → by: dev@digitaldsa.com
                → "Question removed from form"
  20 Apr 2026   hasBISCertification          ADDED       Professional Loan
  15 Mar 2026   propCost                     ADDED       HL, LAP, Plot
  10 Jan 2026   netIncome                    ADDED       all products

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCAN LOG  (last 10 scans)

  23 Apr 2026 14:00  Auto (deploy)   3 stale  · 1 future-ready
  22 Apr 2026 14:00  Auto (cron)     3 stale  · 0 new
  21 Apr 2026 14:00  Auto (cron)     0 stale  · 0 new   ← was clean
  20 Apr 2026 09:15  Manual (admin)  0 stale  · 1 future-ready
```

The changelog panel reads directly from `registryChangelog.ts` — no DB queries. The scan log reads from the latest `registryHealthCheck` embedded field across all policies.

---

## Build Sequence (revised)

```
Phase 0  → Phase 1  → Phase 2                ← foundation (prerequisite for all)
Phase 2  → Phase 3  → Phase 4 Step 0         ← AI pipeline before wizard
Phase 3  → Phase 11 (keyRegistry.ts)         ← term dict and key registry both needed at Phase 2
Phase 4  → Phase 5                           ← fresh encode before edit mode
Phase 4  → Phase 6                           ← wizard before admin review
Phase 6  → Phase 7                           ← admin review before JSON editor
Phase 6  → Phase 9                           ← published policy required for DSA suggestions
Phase 2  → Phase 8                           ← API routes before stale audit
Phase 11 → ongoing (health checker runs on every deploy)
```

### Milestones

| # | Milestone | Phases complete |
|---|---|---|
| M1 | RM can onboard to a lender + monthly OTP | Phase 0 |
| M2 | AI parse produces resumable clause list in UI | Phase 2 + Step 0–1 |
| M3 | RM completes full 6-step wizard + submits | Phase 4 complete |
| M4 | Admin reviews, approves, publishes (including scheduled) | Phase 6 complete |
| M5 | Manual entry + JSON editor + conflict checker | Phase 7 complete |
| M6 | Legacy comparison + deletion gate operational | Phase 8 complete |
| M7 | Key registry health + form change accommodation live | Phase 11 complete |
| M8 | All lenders migrated, TypeScript entries deprecated | Phase 8 fully executed |

---

## Open Items (confirm before build starts)

1. **lenderDirectory:** Add `officialEmailDomain` to `lenderDirectory.ts` (TS), or manage in MongoDB collection?
2. **Monthly renewal cron:** Extend existing S71 cron or new dedicated PMS cron?
3. **RM notifications:** In-app (S71) + email, or in-app only for now?
4. **OpenAI key:** Confirm `OPENAI_API_KEY` is in `.env` (or needs to be added).
5. **Policy spec MD files:** Copy `home_Loan_new_policy.md` + related prompt files from `AI_Based_Bank_Management` into `src/lib/config/pms/policySpec/` as starting prompt templates?
6. **Gender casing:** Confirm lowercase (`male`, `female`) is canonical — no migration needed. Update spec §11.7 to reflect this decision. (Review finding #16)

---

## Review Log — Peer Review Findings (all addressed)

| # | Severity | Finding | Resolution |
|---|---|---|---|
| 1 | Critical | Duplicate OTP infrastructure | Reuse `src/lib/services/otpStore.ts` with context extension — no new collection |
| 2 | Critical | OTP token not bound to policy/draft — replay risk | Token includes `policyId + draftHash`; submit endpoint recomputes hash |
| 3 | Critical | No optimistic locking — concurrent edit corruption | `lockVersion` on `PolicyDocument`; atomic check-and-set on all writes |
| 4 | Critical | Pipeline intermediate state not persisted — session loss | `pipelineState` embedded field; saved on every RM action; wizard resumes |
| 5 | Critical | No scheduled publish | `approved_scheduled` status + cron promotion every minute |
| 6 | High | Lender count hardcoded (count changes as lenders are added/removed) | All counts derived programmatically from `lenderDirectory.ts` |
| 7 | High | bcrypt for OTP — wrong choice, adds native dependency | SHA-256 throughout, same as existing `src/lib/services/otpStore.ts` |
| 8 | High | `EvaluationResult` missing PMS version ID | `pmsVersionId` + `pmsVersionNumber` added to `EvaluationResult` type |
| 9 | High | Conflict checker claims semantic satisfiability — impossible | Scoped to same-field/same-scope detection only; complex JSON-Logic is advisory |
| 10 | High | Delta parse: no guard against accidental full-policy upload | Size ratio check (>60% of original) → confirmation prompt |
| 11 | High | "Legacy wins" silently overwrites RM values | Creates `PendingChange` + RM notification + RM acknowledgement required |
| 12 | High | No RM offboarding/transfer flow | `transferredTo` field + admin "Transfer assignment" action + draft reassignment |
| 13 | High | Custom JSON checkbox undefined when AI returns custom_json | Amber banner (no checkbox) when AI chose custom_json; checkbox only for RM manual override |
| 14 | Medium | bcrypt adds native dep — Vercel/Capacitor build risk | Removed — SHA-256 only |
| 15 | Medium | No rate limiting on pipeline endpoints | Existing `rateLimiter.ts` applied; per-RM 5 runs/day; 100k token circuit breaker |
| 16 | Medium | Gender casing task missing | Added to Open Items #6 — documentation decision, not migration |
| 17 | Medium | DSA suggestions: no dedup or rate limiting | Unique sparse index TTL 30d; min 20 / max 500 chars server-enforced |
| 18 | Medium | Pass 3 endpoint no server-side ambiguity guard | HTTP 422 if any ambiguous clause in input |
| 19 | Medium | Step 4 sign-off not revoked on encoding change | Any Step 2 change server-side clears `reconciliation.signedOff` |
| 20 | Medium | Rollback behaviour unspecified | Full rollback spec in §2.8 |
| 21 | Medium | No pipeline timeout handling | 30s per pass; `pipelineState.errorState` saved; client shows resume prompt |
| 22 | Medium | Manual entry has no reconciliation ownership | `reconciliationAssignedTo` field; admin must designate RM in manual entry modal |
| 23 | Medium | Term dictionary API routes inconsistent with code-managed design | Renamed to `/proposals`; GET reads from TS file; no PATCH |
| 24 | Low | Build sequence: Phase 9 depends on Phase 4 (should be Phase 6) | Corrected in build sequence |
| 25 | Low | No consolidated notification spec table | Full notification tables added to Phase 0 and Phase 6 |
