# Session 60 — Payload Integrity Audit (Continuation)

## Quick Context

Session 59 was massive (14 commits): RM dashboard redesign, landing page glassmorphism, 9 form bug fixes, income profile fixes, and started the payload integrity audit. Phase 2A (per-applicant fields) is complete. This session continues the remaining phases.

**Read these files in order:**
1. `CLAUDE.md` — architectural truth, conventions
2. `docs/SESSION-HANDOFF.md` — Session 59 summary, active payload work
3. `C:\Users\OJ\.claude\plans\twinkling-riding-galaxy.md` — detailed 4-phase plan
4. This prompt — Session 60 priorities

**Current state:** `main` branch | 0 type errors | 9,292 tests (76 files) | Latest commit: `984fba01`

---

## What's Done (Phase 2A)

20+ per-applicant fields now mapped in `src/lib/utils/payloadBuilder/applicantPayload.ts`:
- Education, religion, casteCategory, hasDisability
- Credit history: creditHistoryStatus, defaultSettlementStatus, emiBounceCount, recentEnquiryCount, bounceReason
- Professional: professionalCategory, practiceType, registrationStatus
- Director linkage: linkedCompanyId, ownershipPercent, directorRole
- Multi-applicant: onEMI, onProperty
- NRI: nriCountry
- Residence: ownedResidentialProperties, applicantResidencePattern

Types updated in `src/lib/utils/payloadBuilder/types.ts`.

---

## Session 60 Priorities (in order)

### Priority 1: Phase 2B — Map Missing Loan-Level Fields

**File:** `src/lib/utils/payloadBuilder/loanTransaction.ts`

Add extraction for fields captured in forms but not in payload:
- Business/Professional: `banksOfCurrentAccount`, `existingBankRelationship`, `businessIndustrySector`, `numberOfEmployees`, `dcExistingBank`
- Top-up: `topUpAmount`, `topUpPurpose`, `topUpTenure`
- Personal: `urgencyLevel`
- Verify all property compliance fields are mapped (many already are — check lines 185-266)

Also check `src/lib/utils/payloadBuilder/types.ts` `LoanTransactionPayload` for any typed-but-unmapped fields.

### Priority 2: Phase 1 — Pre-Submit Reconciler

**Create:** `src/lib/utils/payloadBuilder/preSubmitReconciler.ts`

Pure function: takes `formState.applicants[]` + `applicantDataStore` snapshot → returns reconciled applicants array with:
- Income entries from whichever source has more data
- Obligations merged and deduped
- Credit score synced
- `ObligationsRunning` flag matched to actual obligation count

**Integrate into all 6 form submit handlers:**
- `src/routes/(app)/form/home-loan/+page.svelte`
- `src/routes/(app)/form/lap/+page.svelte`
- `src/routes/(app)/form/plot-loan/+page.svelte`
- `src/routes/(app)/form/unsecure-loan/personal-loan/+page.svelte`
- `src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte`
- `src/routes/(app)/form/unsecure-loan/professional-loan/+page.svelte`

**Server-side safety net** in `src/routes/api/evaluate-and-persist/+server.ts`:
- Log warning if `applicants[].incomeEntries` is empty but `selectedIncomeProfiles` is non-empty

### Priority 3: Phase 3 — Automated Payload Completeness Tests

**Create:** `src/lib/testing/__tests__/payloadCompleteness.test.ts`
- For each loan type: build mock formState → call `buildLoanPayload()` → assert all expected fields present
- Test single-applicant, multi-applicant, and company+director scenarios

**Create:** `src/lib/testing/__tests__/preSubmitReconciler.test.ts`
- Normal, diverged, dedup, and edge cases

### Priority 4: Phase 4 — Documentation & Standing Instructions

**Update** `docs/PAYLOAD_DOCUMENTATION.md` with complete field mapping tables.

**Add to `CLAUDE.md`** standing instruction:
> **Payload integrity (CRITICAL)**: Every form question change (add/remove/rename/reorder) MUST be verified against the payload builder. Check: (1) The field's bindsTo key is extracted in `payloadBuilder/loanTransaction.ts` or `applicantPayload.ts`. (2) The `LoanApplicationPayload` type includes the field. (3) The `payloadCompleteness.test.ts` covers it. If a field is intentionally excluded from the payload, document it in `PAYLOAD_DOCUMENTATION.md`.

---

## Key Architecture Reference

### Payload Pipeline
```
Client: formState.toJSON() → POST /api/evaluate-and-persist
Server: buildPayloadFromFormState() → buildLoanPayload()
  → buildLoanTransactionPayload(loanAnswers)     [loan-level fields]
  → buildApplicantPayload(applicant) × N          [per-applicant fields]
  → enrichPayload()                               [computed derivations]
  → evaluatePayload()                             [rule engine]
```

### Two Data Stores (Desync Risk)
| Store | Storage Key | Contains |
|---|---|---|
| `formState.applicants[]` | `applicants-store-data` | Basic fields + incomeEntries + obligations |
| `applicantDataStore` | `applicant-data-store` | Income entries + obligations + credit (separate) |

Both stores are written to simultaneously by `IncomePageNew.svelte`, but they can diverge on session reload (different sessionStorage keys).

### Payload Builder Files
| File | Purpose |
|---|---|
| `payloadBuilder/loanTransaction.ts` | Loan-level field extraction |
| `payloadBuilder/applicantPayload.ts` | Per-applicant field extraction |
| `payloadBuilder/incomePayload.ts` | Income entries + financials |
| `payloadBuilder/obligationPayload.ts` | Obligation cleaning |
| `payloadBuilder/activityProfiles.ts` | Employment profile mapping |
| `payloadBuilder/sanitizers.ts` | Type conversion helpers |
| `payloadBuilder/types.ts` | TypeScript interfaces |

---

## Coding Standards (MANDATORY)

1. Human-readable variable names
2. Step-by-step with comments
3. Small focused files (~200-300 lines max)
4. Never delete files — move to `_archive/`
5. Always stay on `main` branch
6. **Payload integrity**: Every form change MUST verify payload capture
7. **Never patch, fix at source**: Use `migrateApplicantKeys.ts` for key renames
8. **Locked field pattern**: Read-only badge, not disabled inputs
9. **Income completeness**: Use `hasIncomeData()` from `incomeTabState.ts`
