---
type: reference
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
related_adrs: [ADR-0020]
related_specs: [TECH-DEBT-CLEANUP-2026-05-31.md]
---

# Offers Architecture — how loan offers are calculated, stored, and shown

This document captures the end-to-end pipeline that takes a DSA's filled-in loan form and turns it into a list of lender offers the DSA can pitch to the customer. Written at S214 (2026-06-02) as part of TECH-DEBT-CLEANUP §3 D7 — archiving the dormant `bank-loan-management` surface required clarifying that nothing in the live flow depends on it.

## TL;DR

Offers are produced by an **internal rule engine** running on our server, persisted to **MongoDB** as versioned snapshots, and displayed on the case's **`/dashboard/dsa/cases/[case_id]/results`** page. There is exactly ONE live pipeline. Any code path that references an external `bank-loan-management.vercel.app` API or browser `localStorage` for offer storage is **dormant / archived** — see §6 below for the historical sidebar.

## The live pipeline — step by step

### 1. DSA fills the form

Live routes: `src/routes/(app)/form/{loan-type}/+page.svelte` (one per loan family — `home-loan`, `lap`, `plot-loan`, `unsecure-loan/personal-loan`, `unsecure-loan/business-loan`, `unsecure-loan/professional-loan`).

State management uses Svelte 5 runes. Form answers flow into `formState` (a runed store backed by localStorage for resume-after-refresh). Custom-component pages (Applicants / Income Profiles / Income Details / Credit Score / Obligations) write directly to `applicantDataStore`; schema-driven pages write to `formState.loanData[loanName]`.

### 2. DSA clicks "Show Offers"

The submit handler at the bottom of each form's `+page.svelte` calls `confirmAndSubmit()` (defined in `src/lib/utils/confirmAndSubmit.ts`). This thin UI wrapper opens a pre-submit `ConfirmModal`:

> "Ready to submit? — Please double-check every detail. Once submitted, this counts as one submission under your monthly plan…"

The modal is the "last look" gate. Cancellation returns to the form silently. Confirmation falls through to `submitFormForEvaluation()`.

### 3. UX inversion — `/evaluating` takes over

`submitFormForEvaluation()` (in `src/lib/utils/formSubmitHandler.ts`) does NOT make the API call. Instead it:

1. Stashes the submission options to `sessionStorage` under key `qbc.pendingSubmission` (via `safeSessionStorage`).
2. Calls `goto('/evaluating')`.

The 2026-05-30 QBC UX inversion split the network call away from the form page. `/evaluating/+page.svelte` reads the stash and decides which view to render:

- **animation** — normal evaluation; shows the rotating "calculating offers" spinner
- **save-prompt** — server returned 402 `quota_buffer_available`; asks DSA "save to buffer or upgrade?"
- **upgrade-required** — server returned 402 `quota_fully_exhausted`; offers upgrade only
- **saved-to-buffer** — quota-blocked case persisted at stage='quota_blocked'; routes back to dashboard

This single-spinner model replaced the prior form-spinner→evaluating-spinner double-flash.

### 4. The actual API call — `callEvaluateAndPersist()`

`/evaluating/+page.svelte` calls `callEvaluateAndPersist(submission)` (also exported from `formSubmitHandler.ts`). This is the function that does the round-trip:

```typescript
await secureFetch('/api/evaluate-and-persist', {
    method: 'POST',
    body: JSON.stringify({
        loanType: submission.loanType,
        loanDisplayName: submission.loanDisplayName,
        formState: submission.formStateJson,
        relationships: submission.relationships,
        editCaseId: submission.editCaseId || undefined,
        ...(submission.saveToBuffer && { save_to_buffer: true })
    })
});
```

`secureFetch` handles CSRF + 401-retry-with-refresh-token plumbing.

### 5. Server-side evaluation — `/api/evaluate-and-persist/+server.ts`

The endpoint is the heart of the pipeline. Auth: DSA + Admin. Rate limit: 10 evals/min/user.

Steps performed in order (in a single endpoint hit, no client orchestration):

#### 5a. Build the canonical payload

```typescript
const payload = buildLoanPayload(loanAnswers, applicationData, allApplicants, opts);
```

`buildLoanPayload` (in `src/lib/utils/payloadBuilder/`) flattens the form's runed state into a `LoanApplicationPayload` — the canonical shape the rule engine consumes. Per ADR-0020: `loanName` = product, `loanType` = scope, `facilityType` = facility, `loanVariant` = product-variant. No PascalCase. No legacy translation.

#### 5b. Resolve plan + quota state (QBC gate)

The server reads the DSA's `billingSubscriptions` doc to determine their plan and current usage. Depending on the quota state, one of three things happens:

- **Under quota** → fall through to evaluation.
- **402 `quota_buffer_available`** → return immediately with structured upgrade prompt + buffer state. The case is NOT persisted yet. DSA's `/evaluating` page renders the save-prompt view.
- **402 `quota_fully_exhausted`** → return immediately with upgrade-required prompt. DSA's `/evaluating` page renders the upgrade-required view.

If `save_to_buffer === true` (DSA confirmed via save-prompt), the server proceeds to persist the case at `stage='quota_blocked'`, returns a success response with `quota_blocked: true`, and skips actual evaluation (no LenderResultsSnapshot written).

#### 5c. Run the rule engine

```typescript
const lenderResults = evaluatePayload(payload, activeRuleDocs);
```

`evaluatePayload` (in `src/lib/ruleEngine/evaluationEngine.ts`) loops over every active lender's `ParsedLenderRuleDocument` and produces, per lender:

- A traffic-light verdict (GREEN / AMBER / RED)
- The offered loan amount (capped by FOIR / LTV / requested / lender caps)
- Estimated EMI + interest rate
- Per-rule pass/fail breakdown for surfaces that want to explain the verdict
- Recommended improvements + alternative loan products

The engine reads:

- Lender rule docs from MongoDB collection `LenderRuleArtifacts` (`status='active'` filter)
- The canonical payload from step 5a
- Engine-internal config (haircuts, FOIR limits per income bracket, etc.)

The engine has 7 components: eligibility gates, income assessment (12 income types with bank-specific haircuts), EMI/FOIR/LTV calculations, deviation recovery (red → amber), discomfort analysis. Per CLAUDE.md §9 — never simplify these; they are the business moat.

#### 5d. Compute the change-delta (for resubmits / version-2+ cases)

If `editCaseId` was passed, the server loads the prior `LenderResultsSnapshot` for the same case and computes per-lender `changeDelta` annotations — "amount up ₹2L, EMI down ₹1.2k, ROI same" — so the DSA can see what changed compared to the prior submission.

#### 5e. Persist three documents atomically (best-effort)

```typescript
await Cases.insertOne({ case_id, dsa_id, stage: 'intake', /* ... */ });
await FormSnapshots.insertOne({
    case_id,
    version: 1,           // or N+1 for resubmits
    payload_hash,         // SHA-256 of canonical payload
    payload: <CSFLE-encrypted form state>,
    applicationData,
    created_at
});
await LenderResultsSnapshots.insertOne({
    case_id,
    version: 1,           // or N+1
    payload_hash,
    lender_results: [...],  // one entry per lender
    summary: { /* counts of green/amber/red, top offer, etc. */ },
    created_at
});
```

Per AD-02 / AD-05: **every edit creates a new version; snapshots are never overwritten**. Resubmits create version N+1 entries; prior versions remain queryable forever for audit.

CSFLE (Client-Side Field-Level Encryption) wraps PII in the payload column; the rule-engine output itself is non-PII (lender names + amounts + verdicts), so it's stored plain.

#### 5f. Side-effects

- Timeline event created (`createTimelineEvent`) for the case audit log.
- DSA email recipient resolved + queued (sent via `mailer` — currently AWS SES via `sesProvider.ts`).
- Background eligibility-sync fired-and-forgotten (`/api/cases/{caseId}/eligibility-sync`).

#### 5g. Response

```json
{
    "success": true,
    "data": {
        "caseId": "HL-2026-001234",
        "offerCount": 7,
        "amountRequested": 6000000,
        "tenureYears": 20
    }
}
```

### 6. Animation + navigation

`/evaluating` renders an animation timed roughly to `offerCount × per-offer-duration` (~3 seconds for a typical 7-offer case). When done, it navigates to:

```
/dashboard/dsa/cases/{caseId}/results
```

### 7. Display — `/dashboard/dsa/cases/[case_id]/results`

Server-side `+page.server.ts` load:

```typescript
const latest = await LenderResultsSnapshots.findOne(
    { case_id: caseId },
    { sort: { version: -1 } }  // latest version per case
);
```

The page renders `LenderComparisonTable.svelte` — sortable / filterable comparison of all lenders, with per-lender verdict (GREEN / AMBER / RED), offered amount, EMI, interest rate, key gating fails, and CTA buttons (apply / share with customer / view details).

DSA can also view prior versions via the case's version selector — useful when comparing "before edit" vs "after edit" outputs.

## Data flow summary

```
Form (DSA browser, Svelte runes)
    │
    ▼
confirmAndSubmit() — ConfirmModal
    │
    ▼
submitFormForEvaluation() — stash to sessionStorage, goto /evaluating
    │
    ▼
/evaluating reads stash → callEvaluateAndPersist()
    │
    ▼
POST /api/evaluate-and-persist
    │  ┌── builds canonical payload via buildLoanPayload()
    │  ├── checks quota (subscription + buffer state)
    │  ├── runs evaluatePayload() against active LenderRuleArtifacts
    │  ├── computes change delta vs prior version (if editCaseId)
    │  ├── persists Cases + FormSnapshots + LenderResultsSnapshots
    │  ├── fires timeline event + DSA email + eligibility sync
    │  └── returns { caseId, offerCount, amountRequested, tenureYears }
    │
    ▼
/evaluating animation (3 sec) → goto /dashboard/dsa/cases/{caseId}/results
    │
    ▼
results page reads LenderResultsSnapshots.findOne({ case_id, version: -1 })
    │
    ▼
LenderComparisonTable renders sortable / filterable lender list
```

## Storage map

| Collection | Purpose | Mutability | PII |
|---|---|---|---|
| `Cases` | Case metadata (case_id, dsa_id, stage, label, timeline pointers) | Status changes; never deleted | Customer name in label (encrypted) |
| `FormSnapshots` | Immutable form-state snapshot per submission | Append-only (versioned) | Yes — payload column CSFLE-encrypted |
| `LenderResultsSnapshots` | Per-version lender evaluation outputs | Append-only (versioned) | No (lender names + amounts only) |
| `LenderRuleArtifacts` | Parsed lender rule documents | Mutable (artifact lifecycle: draft / active / superseded) | No |
| `TimelineEvents` | Per-case audit log | Append-only | Action context only |
| `billingSubscriptions` | DSA plan + cycle state for QBC quota gates | Updated each cycle | No |

## Why there are no "external API offers"

A common misconception (rooted in the now-archived `homeLoanApi.ts`): "offers come from a third-party API." **They do not.** The rule engine is in-process on our server. Lender rule documents are stored in our MongoDB. The offered amounts, rates, and verdicts are computed entirely server-side using deterministic rule-doc evaluation.

This is by design — see CLAUDE.md §2 (Non-Negotiable Invariants):

> All business logic runs server-side only — client renders only.

External APIs would mean (a) latency at submit time, (b) a third-party dependency on our critical path, (c) opaque scoring we can't explain to DSAs. None of those are acceptable.

## The dormant `bank-loan-management` surface — historical context

Long ago (pre-rule-engine era), an early prototype of DigitalDSA submitted form data to an external Vercel-hosted service at `bank-loan-management.vercel.app/api/loan-offers`. That service returned offer JSON which the prototype stored in browser `localStorage`. Two routes (`/topup-loan-offers` and `/balance-transfer-offers`) rendered the stored data.

That entire surface was superseded by the in-process rule engine well before the 2026-05-31 nomenclature rename. The actual external service is no longer maintained. But three artifacts remained in the live tree until S214:

1. **`src/lib/services/homeLoanApi.ts`** — defined the API contract (`HomeLoanApplication` interface with PascalCase fields) + three submit functions (`submitHomeLoanApplication` etc.) + six storage helpers (`getStored…OffersOf*` / `clearStored…Offers`). The submit functions were **never called from anywhere in the tree** post-rule-engine. The storage helpers were called by the two offer routes (next item) but had nothing writing the storage keys, so they always returned `[]`.

2. **`src/routes/(app)/(offers)/topup-loan-offers/+page.svelte` + `balance-transfer-offers/+page.svelte`** — rendered offers from localStorage. Since nothing wrote the storage keys, both pages permanently rendered the empty / fallback state. `routes.ts` defined `OFFERS.TOPUP` and `OFFERS.BALANCE_TRANSFER` URL constants but no code in the tree navigated to either — they were unreachable routes.

3. **Outbound payload-shape shims in `lap/+page.svelte:928-1016` + `plot-loan/+page.svelte:946-1072`** — these files built `formattedPayload` / `payloadNew` objects with PascalCase fields (`LoanName`, `LoanType`, `LAPType`, `PlotLoanActivity`) — the shape `homeLoanApi.ts` originally consumed. The objects were never sent anywhere — they were only used for client-side existence-check validation (`if (!payload.loanTransaction.LoanName) errors.push(...)`). The actual submission used `confirmAndSubmit()` (the live flow described above) which builds its payload server-side via `buildLoanPayload`. So the shims were validation scaffolding wearing API-payload costumes.

S214 (2026-06-02) closed all three under TECH-DEBT-CLEANUP-2026-05-31 §3 D7 — see ADR-0024 + the S214 commit body for the archival rationale and zero-importer proof. `homeLoanApi.ts` moved to `src/lib/services/_archive/`. The two offer routes moved to `_archived_<name>/` per Pitfall #63's compile-still-must-pass rule. The shims were collapsed into direct `combinedAnswers.loanName` / `.loanType` existence checks.

## Reading list — code pointers

- **Form pages**: `src/routes/(app)/form/*/+page.svelte` (6 per-loan-family files)
- **Submit shim**: `src/lib/utils/confirmAndSubmit.ts`
- **Stash + nav**: `src/lib/utils/formSubmitHandler.ts` (`submitFormForEvaluation`, `callEvaluateAndPersist`)
- **Evaluating page**: `src/routes/(app)/evaluating/+page.svelte`
- **Server endpoint**: `src/routes/api/evaluate-and-persist/+server.ts`
- **Payload builder**: `src/lib/utils/payloadBuilder/` (loanTransaction, applicantPayload, obligationPayload, incomePayload, etc.)
- **Rule engine**: `src/lib/ruleEngine/evaluationEngine.ts` (+ payloadEnricher, incomeAssessor, emiCalculator, resultBuilder, ruleValidator)
- **Storage**: `src/lib/database/mongo.js` (collection accessors), `src/lib/server/csfle/` (encryption)
- **Results page**: `src/routes/dashboard/dsa/cases/[case_id]/results/+page.{svelte,server.ts}`
- **Lender comparison**: `src/lib/components/dashboard/LenderComparisonTable.svelte`

## Related ADRs and specs

- **ADR-0020** — Loan field nomenclature (canonical 4-field vocabulary)
- **ADR-0022** — Per-Plan Quota-Blocked Save Buffer (QBC) — explains the buffer-state machinery in §5b
- **ADR-0024** — Loan-vocabulary distinctions, dual-tenure deferral — explains why `loanType` carries different scope vocabularies for secured vs unsecured loans, all routed through the same `evaluatePayload`
- **`docs/RULE-ENGINE-SPECIFICATION.md`** — full rule engine internals (49KB)
- **`docs/ARCHITECTURE.md` §9** — rule engine summary in broader system context
- **`docs/specs/_archive/TECH-DEBT-CLEANUP-2026-05-31.md` §3 D7** — bank-loan-management archival (S214; spec shipped + archived S215)

## Future evolution

Once the per-lender `bt_topup_treatment` flag (deferred from S213, see PITFALLS.md #69) ships, the rule engine will branch its dual-tenure / single-tenure math per lender's actual backend treatment. That's an engine-internal change — no impact on the data flow described here.

Once the unsecured DC+Extra payload bridge (also deferred — see TECH-DEBT-CLEANUP-2026-05-31 §6) ships, `buildLoanPayload` will derive `principalOutstanding` + `topUpAmount` + tenures for unsecured DC+Extra cases from per-obligation `selectedToClose` flags + the Loan Requirements page's loanAmount field. Again, payload-builder-internal — no flow change.
