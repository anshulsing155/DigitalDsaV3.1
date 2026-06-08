# DATA-4 — Analytics Warehouse v1 (Case-Feed Only)

> **Status:** Draft for review. No code changes until this is approved.
> **Author:** 2026-05-19 session
> **Scope:** Phase-6 (case-feed-only analytics ETL) extracted from the broader `PII-RETENTION-POLICY-SPEC.md` Part D, tightened to exactly what we're committing to ship now. Everything else from that bigger spec stays parked.

---

## Read me first

We are setting up a **second, separate database** alongside the existing operational MongoDB. The new database holds **de-identified copies** of case data — bucketed numbers, no names, no contact details, no PAN/Aadhaar in any form. Real PII never lands there.

This is **infrastructure only** for now. No dashboards in the product, no DSA-facing peer benchmarks, no internal BI dashboards. Just the de-identified data quietly accumulating each night. The reason to do this now even without dashboards: by the time you decide what dashboards to build (post-rollout, based on real DSA feedback), you'll have months of analytics data already ready — instead of starting from zero.

One sentence: **a nightly job reads operational cases, strips them of identifying details, and writes the cleaned-up rows to a new `digitaldsa_analytics` database that nothing else on the platform touches.**

---

## Section index

1. [What's in v1 and what's NOT](#1-whats-in-v1-and-whats-not)
2. [The two stores](#2-the-two-stores)
3. [The one-way bridge — `person_id`](#3-the-one-way-bridge--person_id)
4. [Schema for `analytics_cases`](#4-schema-for-analytics_cases)
5. [De-identification rules (per field)](#5-de-identification-rules-per-field)
6. [The ETL pipeline](#6-the-etl-pipeline)
7. [When the ETL writes a row + when it updates one](#7-when-the-etl-writes-a-row--when-it-updates-one)
8. [Operational runbook](#8-operational-runbook)
9. [Test plan](#9-test-plan)
10. [Open questions](#10-open-questions)
11. [Implementation slices](#11-implementation-slices)
12. [Cross-references](#12-cross-references)

---

## 1. What's in v1 and what's NOT

### In scope (v1)

- **One new MongoDB database**: `digitaldsa_analytics`, on the same Atlas cluster
- **One new collection**: `analytics_cases`
- **One nightly ETL job** that reads operational cases, de-identifies, writes to the new collection
- **One new environment variable**: `ANALYTICS_PEPPER` (the secret behind `person_id`)
- **De-identification helpers** for age, income, geography, employer industry (some leveraging DATA-1's bucketing utilities)
- **Idempotency**: re-running the ETL produces the same output
- **An audit row per ETL run** so we can answer "did last night's job complete? how many rows updated?"

### Not in v1 (deferred)

- `analytics_dsa` collection — DSA-derived analytics
- `analytics_rm` collection — RM-derived analytics
- Any product UI built on analytics data (DSA peer benchmark dashboards, internal BI dashboards)
- Real-time ETL via MongoDB Change Streams (nightly batch is enough for v1)
- BigQuery migration (start on Mongo, migrate later if volume justifies)
- Cross-tenant aggregation views

The deferred items don't require changes to anything in v1 — when we add them later, they'll plug in alongside without rework.

---

## 2. The two stores

| | Operational store | Analytics store (new) |
|---|---|---|
| Database name | `digitaldsa` | `digitaldsa_analytics` |
| Atlas cluster | Same | Same |
| Region | Mumbai | Mumbai |
| Contains real PII? | Yes, CSFLE-encrypted | **No, never** |
| Read by | App routes, every existing feature | The ETL job (writes) + future analytics dashboards (reads) |
| Written by | App routes, every existing feature | **Only the ETL job** |
| Backups | Atlas auto-backups | Atlas auto-backups (same policy) |
| Access control | DSA tenant isolation enforced per route | New `analytics-reader` and `analytics-writer` Atlas roles separate from app roles |

The single most important property: **the two stores share an Atlas cluster but otherwise have no overlap.** Different databases. Different access roles. Different write paths.

---

## 3. The one-way bridge — `person_id`

The structural privacy guarantee. Plain English:

- Every operational borrower record has a `pan_hash` — a SHA-256 hash of their PAN, salted with an operational pepper.
- The analytics record has a `person_id` — derived by **HMAC-SHA256** of the `pan_hash`, using a **different** secret called `ANALYTICS_PEPPER`, then truncated to **32 hex chars (128-bit)**. 128 bits keeps unique-borrower counts collision-safe at any realistic platform scale (a 64-bit id would start colliding in the low millions of borrowers). Matches DATA-2's revocation-token width.
- `ANALYTICS_PEPPER` is held by the ETL job only. The app routes don't know it. Anyone reading the analytics warehouse doesn't know it.

What this gives you:

- **Operational DB compromised:** attacker gets `pan_hash` values. Cannot compute `person_id` without `ANALYTICS_PEPPER` → cannot correlate analytics rows back to operational rows.
- **Analytics DB compromised:** attacker gets `person_id` values. Cannot reverse to `pan_hash` (HMAC is one-way) → cannot reach a real PAN.
- **Both DBs compromised:** still cannot reverse `person_id` to PAN. Brute force is computationally infeasible with both peppers unknown.

The two stores share **the fact** that two cases belong to the same borrower (so unique-people counts work), but never **who** that borrower is.

### Where the pepper lives

`ANALYTICS_PEPPER` is a new env var in `.env.local` (dev) and Vercel project secrets (production). It must be **at least 32 bytes of cryptographic-quality random data** (e.g. `openssl rand -hex 32`). Once set, it cannot be rotated without a re-derivation migration — same person → different `person_id` after rotation would break analytics continuity.

---

## 4. Schema for `analytics_cases`

One row per operational case. Document layout below — each comment captures plain-English purpose and source.

```typescript
interface AnalyticsCaseDoc {
  _id: ObjectId;

  // ── Provenance ──────────────────────────────────────────
  case_id: string;                  // operational Cases.case_id — same string, not a secret
  dsa_id: ObjectId;                 // operational Cases.dsa_id — internal ID, safe to keep
  person_id: string;                // HMAC-SHA256(ANALYTICS_PEPPER, pan_hash) — the one-way bridge

  // ── Timing ──────────────────────────────────────────────
  opened_at: Date;                  // Cases.created_at
  closed_at: Date | null;           // when case reached a final stage; null while open
  final_stage: 'disbursed' | 'closed' | 'rejected' | 'dropped' | null;
  current_stage: CaseStage;         // most recent value from Cases.stage; nullable closed_at

  // ── Loan basics ─────────────────────────────────────────
  loan_type: string;                // e.g. 'Home Loan' — already non-PII
  loan_amount_requested: number | null;  // exact
  loan_amount_eligible: number | null;   // exact (from rule engine output)
  loan_amount_sanctioned: number | null; // exact, if reached sanctioned stage
  loan_amount_disbursed: number | null;  // exact, if reached disbursed stage
  tenure_months: number | null;
  emi_amount: number | null;
  interest_rate_band: string | null;     // '8-9%' | '9-10%' | ... — bucketed for k-anonymity

  // ── Borrower demographics (bucketed — no identifying detail) ───
  borrower_age: number | null;           // exact integer (28, 42, etc.) — useful for analytics
  borrower_age_bracket: string | null;   // '25-30' | '30-35' | etc. — for grouping queries
  borrower_gender: string | null;        // if collected
  borrower_employment_type: string | null; // 'salaried' | 'self_employed' | 'business' | 'professional'
  borrower_industry: string | null;      // e.g. 'IT_Services' — derived from employer name via lookup
  borrower_income_exact: number | null;  // exact rupees
  borrower_income_bracket: string | null;  // '5L-10L' | '10L-20L' | etc.
  borrower_obligations_exact: number | null;
  borrower_obligation_ratio: number | null;  // ratio not raw amount
  borrower_existing_loans_count: number | null;

  // ── Geography (already-bucketed by construction) ────────
  borrower_pincode: string | null;       // 6-digit — already a 2-10 km² bucket
  borrower_city: string | null;
  borrower_state: string | null;
  borrower_region_tier: string | null;   // 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Rural'

  // ── Property (if applicable to the loan) ────────────────
  has_property: boolean | null;
  property_type: string | null;          // 'apartment' | 'independent' | 'plot' | 'commercial'
  property_value_exact: number | null;
  property_value_bracket: string | null;  // '20L-40L' | '40L-60L' | etc.
  property_pincode: string | null;        // 6-digit
  property_locality_bucket: string | null;  // 'Hiranandani Gardens Powai' — reuses DATA-1 bucket

  // ── Lender selection (the analytics gold) ───────────────
  recommended_banks: Array<{
    lender_id: string;
    score: number;
    reason: string;
  }> | null;
  selected_lender_id: string | null;     // null until sanctioned stage
  selection_reason: string | null;       // 'best_offer' | 'dsa_preference' | etc.

  // ── Reproducibility ─────────────────────────────────────
  engine_version: string | null;         // value of Cases.results_snapshot's engine version field
  payload_version: number | null;        // FormSnapshots version used for this row

  // ── ETL audit ───────────────────────────────────────────
  etl_run_id: string;                    // identifier of the ETL run that wrote this row
  etl_written_at: Date;                  // last time this row was upserted
}
```

### Indexes

| Index | Fields | Purpose |
|---|---|---|
| Primary | `_id` | Default |
| Source dedup | `case_id` (unique) | One analytics row per case maximum; upsert key |
| Person count | `person_id` | "How many unique borrowers" queries |
| DSA rollup | `(dsa_id, opened_at desc)` | DSA-specific aggregations |
| Time series | `opened_at desc` | "Cases opened in the last 30 days" queries |
| Bank rollup | `selected_lender_id` | Lender market-share queries |
| Geo rollup | `(borrower_state, borrower_city)` | Regional aggregations |
| Income segment | `borrower_income_bracket` | Income-segment queries |

---

## 5. De-identification rules (per field)

This is the heart of the privacy contract. Each field tells the ETL how to transform from "real value in operational store" to "bucketed value in analytics store."

> **2026-05-20 reconciliation (Slice 4):** the original table assumed a flat
> bindsTo-key payload with PAN, DOB, and a single `monthlyIncome`. The real
> `FormSnapshot.payload` is the structured `LoanApplicationPayload`
> (`loanTransaction` + `allApplicantDetails[]`, plus the rule-engine
> `_computed` aggregates). Critically, **PAN and DOB are intentionally absent
> from the payload**, and several fields (eligibility amount, EMI, interest
> rate, recommended banks) live on the eligibility result / Cases doc, not the
> payload. The table below is rewritten to the ACTUAL source keys read by
> `src/lib/server/analytics/buildAnalyticsCase.ts`. Demographic fields come
> from the PRIMARY applicant (`allApplicantDetails[0]`); financial aggregates
> are CASE-LEVEL totals from `_computed`.

| Source (operational) | Analytics field | Rule / v1 status |
|---|---|---|
| `Cases.case_id` | `case_id` | Passthrough — internal ID |
| `Cases.dsa_id` | `dsa_id` | Passthrough — internal ID |
| — (no clean PAN source) | `person_id` | **NULL in v1.** PAN is absent from the payload; a PAN hash exists only for doc-upload (locked) cases, and one-per-case attribution misrepresents multi-applicant loans. `personIdFromPanHash` stays ready for a future per-applicant bridge. (Decision 2026-05-20.) |
| `Cases.created_at` | `opened_at` | Passthrough |
| `Cases.stage_history` (first terminal transition) | `closed_at`, `final_stage` | First transition to `disbursed`/`closed`/`rejected`/`dropped` |
| `Cases.stage` | `current_stage` | Passthrough |
| `Cases.loan.type` | `loan_type` | Passthrough |
| `loanTransaction.loanAmount` (fallback `Cases.loan.amount_required`) | `loan_amount_requested` | Passthrough |
| eligibility result | `loan_amount_eligible` | **NULL in v1** — lives on the eligibility result, not the payload |
| `Cases.lender_applications[*].sanction.amount` (first) | `loan_amount_sanctioned` | Passthrough |
| `Cases.lender_applications[*].disbursement.total_amount` (first) | `loan_amount_disbursed` | Passthrough |
| `loanTransaction.tenureYears × 12` | `tenure_months` | Year→month |
| computed downstream | `emi_amount` | **NULL in v1** — not in payload |
| `sanction.roi` / eligibility | `interest_rate_band` | **NULL in v1** — not yet wired |
| `allApplicantDetails[0].age` | `borrower_age`, `borrower_age_bracket` | Direct integer age (DOB absent); `ageBracket()` 5-year bands |
| `allApplicantDetails[0].gender` | `borrower_gender` | Passthrough |
| `allApplicantDetails[0].employmentType` | `borrower_employment_type` | Passthrough (raw string) |
| `allApplicantDetails[0]` `businessIndustrySector`/`businessType`/`professionType`/`companyName` | `borrower_industry` | `industryLookup()`. **NULL for salaried** (no employer name in payload) |
| `_computed._total_gross_monthly` | `borrower_income_exact`, `borrower_income_bracket` | Exact monthly + `incomeBracket()` (annualized ×12 → `'<2L'`…`'>50L'`) |
| `_computed._total_obligations_monthly` | `borrower_obligations_exact`, `borrower_obligation_ratio` | Exact + ratio (`obligations / income`) |
| count of `allApplicantDetails[*].obligations` | `borrower_existing_loans_count` | Case-level count |
| `allApplicantDetails[0].applicantResidencePincode` | `borrower_pincode` | Passthrough — already a bucket |
| `allApplicantDetails[0].applicantResidenceCity` (fallback `loanTransaction.residenceCity`) | `borrower_city`, `borrower_region_tier` | Passthrough + `regionTier()` |
| `allApplicantDetails[0].applicantResidenceState` (fallback `loanTransaction.residenceState`) | `borrower_state` | Passthrough |
| `loanTransaction.propertyType`/`propertyCost`/`propertyPincode`/`propertyIdentified` | `has_property`, `property_type`, `property_value_exact`, `property_pincode` | Passthrough; `has_property` = any property signal present |
| — (no bracket helper / no area+project keys) | `property_value_bracket`, `property_locality_bucket` | **NULL in v1** |
| `LenderResultsSnapshots` recommendations | `recommended_banks` | **NULL in v1** — not passed to the orchestrator yet |
| `Cases.primary_lender_id` (fallback sanctioned app) | `selected_lender_id` | Passthrough |
| — | `selection_reason`, `engine_version` | **NULL in v1** — not tracked / not yet wired |
| ETL run | `payload_version`, `etl_run_id`, `etl_written_at` | Provenance set by the ETL |

### Fields that NEVER appear

These are explicitly forbidden in `analytics_cases`:

- `borrower_name` (any form)
- `borrower_mobile`
- `borrower_email`
- `borrower_pan` (real value OR last-4 OR hash)
- `borrower_aadhaar` (real value OR last-4 OR hash)
- `borrower_bank_account` (any form)
- `borrower_address_line1` (street-level detail)
- `employer_name` (raw — only the industry-category lookup result)
- Anything from `Cases.optional_contact`

The ETL job has a static-scan test that asserts none of these field names ever appear in any document written to `analytics_cases`. Belt + suspenders against future contributors accidentally widening the schema.

---

## 6. The ETL pipeline

### Trigger

**Nightly Vercel Cron** at a low-traffic hour (proposed 02:00 IST). The existing DATA-3 sweep endpoint (`/api/cron/data3-sweep`) is the pattern to follow: new endpoint at `/api/cron/analytics-etl`, configured via `vercel.json`.

### Pipeline (per run)

1. **Discover work.** Find every operational case where `updated_at` is newer than the last successful ETL run's `started_at`. This catches new cases AND existing cases whose stage changed during the day. First-ever run: process all cases.
2. **For each case:**
   a. Fetch the case from `Cases`
   b. Fetch the latest `FormSnapshots` row for this case (sort by `version` desc)
   c. `resolveSnapshotPayload(snapshot)` to decrypt the payload — this uses the existing CSFLE helper
   d. If decrypt fails OR payload is empty: log + skip the case for this run (will retry next night)
   e. Build the analytics row per the table in §5
   f. Compute `person_id` from `pan_hash`
   g. `upsert` into `analytics_cases` keyed by `case_id`
3. **Write the audit row** to a small `analytics_etl_runs` collection: `{ run_id, started_at, finished_at, cases_processed, cases_skipped, cases_errored }`
4. **Return** stats to the cron caller. Vercel logs them.

### Error handling

- One bad case logs an error + increments `cases_errored` but does NOT block other cases
- A case errored 3+ runs in a row gets flagged in the audit log for manual review
- If the ETL job itself crashes (e.g., DB connectivity), the run audit row carries `crashed: true` and the next run picks up from where the previous successful run left off (via the `updated_at` cursor)
- No partial state — every case is independently upserted, no transactions across cases

### Idempotency

- Same input case → same de-identified output (de-identification is deterministic)
- Re-running the ETL on the same case is a safe no-op (upsert by `case_id`)
- The `etl_run_id` field on each row makes it easy to spot "which run wrote this version" during debugging

---

## 7. When the ETL writes a row + when it updates one

### Inclusion criteria — which cases get analytics rows

A case becomes ETL-eligible when:
- `stage` is past `intake` (i.e., the form is at least started) **AND**
- A non-empty `FormSnapshots` row exists for the case **AND**
- `is_sample !== true` (sample/demo cases are excluded — they would skew analytics)

Cases in `intake` stage are skipped — too little data to analyze. They become eligible once they transition to `profiling`.

### Update triggers

A case's analytics row is updated when any of these change in operational:
- `stage` (so transitions to `submitted`, `sanctioned`, `disbursed`, etc. are reflected)
- The form payload (a new FormSnapshot version landed)
- A lender application's `sanction.amount` or `disbursement.total_amount` got set

Implementation: we don't try to detect granular changes — we just look at `Cases.updated_at`. If it's newer than the last ETL run, we re-process the case. This means an analytics row might get unnecessarily re-upserted if an unrelated field changed, but the cost is small and the simplicity is worth it.

### Archived cases

`is_archived === true` cases ARE still ETL'd — they're historical signal, and the de-identification removes the privacy concern. The analytics row carries `final_stage` and `closed_at` from the archive transition.

---

## 8. Operational runbook

### First-time setup

1. Generate `ANALYTICS_PEPPER`: `openssl rand -hex 32` (or equivalent). Store in `.env.local` (dev) and Vercel project secrets (production).
2. The new database + collection are created on first write — no manual provisioning needed.
3. Indexes are auto-created by `ensureIndexes()` in `src/lib/database/mongo.ts` on app startup (same pattern as existing collections).
4. Configure the Vercel Cron entry in `vercel.json`.

### Manual run (for debugging / backfill)

Two paths:
- **Hit the cron endpoint directly:** `POST /api/cron/analytics-etl` with the Vercel cron auth header
- **Run the script:** `node scripts/run-analytics-etl.mjs` — same code, runs locally against the same MongoDB

### Monitoring

- **Successful run:** `analytics_etl_runs` collection gets a row with `finished_at` set and `cases_processed > 0`
- **Failed run:** `crashed: true` on the audit row + a Vercel log entry
- **No-op run:** `cases_processed: 0` — fine if nothing changed that day

Watch for:
- Skipped count climbing → CSFLE decrypt failures (DEKs missing? rotated?)
- Errored count climbing → schema drift in operational data
- Run duration climbing → consider real-time ETL via Change Streams (deferred feature)

### Pepper rotation (rare)

**`ANALYTICS_PEPPER` should not be rotated routinely.** Rotation breaks `person_id` continuity — the same borrower would get a new `person_id` after rotation, breaking unique-person counts across the boundary.

If rotation is ever necessary (e.g., pepper compromise):
1. Generate new pepper
2. Re-derive `person_id` for every existing analytics row using the new pepper (one-time migration script)
3. Update the env var
4. Keep the old pepper available for one final ETL run to handle in-flight cases

This is a planned activity, not an emergency response. Document in a separate runbook if/when it happens.

---

## 9. Test plan

### Unit tests

| Test target | What it covers |
|---|---|
| `personIdHmac.test.ts` | HMAC produces 32-hex-char string (128-bit, collision-safe for unique-person counts — see §3), same input → same output, different pepper → different output, missing/short pepper throws, empty pan_hash throws |
| `ageBracket.test.ts` | Birthday math edges (just-turned-30 → '30-35'), invalid input → null |
| `incomeBracket.test.ts` | Boundary values (₹2L exactly → which bracket?), zero/negative |
| `industryLookup.test.ts` | Known employer names map correctly, unknown → 'other', empty → null |
| `regionTier.test.ts` | Known cities map correctly, unknown → null |
| `buildAnalyticsCase.test.ts` | Full transformation from synthetic Case + payload to analytics row; asserts no PII fields appear in output |

### Privacy contract test

A static-scan test (mirror of DATA-1's `vaultWritePathCheck.test.ts`):
- Scans every file in `src/lib/server/analytics/` for the forbidden field names from §5
- Fails if any code path could write `borrower_name`, `borrower_mobile`, etc. into `analytics_cases`

### Integration test

`analyticsEtl.test.ts` — mocks the operational collections, seeds 3-4 cases (one in each stage + one sample), runs the ETL, asserts the analytics rows match expected shape AND that the sample case was excluded.

---

## 10. Open questions

Decisions that need a call before implementation. Each is small enough to answer in a sentence.

**Q1.** Vercel Cron schedule — `0 2 * * *` (02:00 IST nightly)? **Resolved:** 02:00 IST = `30 20 * * *` UTC. Triggered by an external scheduler (POST + `x-cron-secret`), NOT a Vercel native cron (which is GET-only). See the runbook.

**Q2.** First-run scope — should the first ETL run process all existing cases (a big backfill), or only cases updated from cron-on date? Recommendation: backfill once, then incremental.

**Q3.** When the ETL hits a case where the payload is encrypted but no DEK exists (the `MongoCryptError` we saw earlier in this session) — fail-skip-retry, or fail-hard the run? Recommendation: fail-skip-retry, log loudly.

**Q4.** `is_sample` cases — confirm exclusion is correct. Are there real DSAs using sample-case mode for legitimate analytics?

**Q5.** Industry lookup table — start with a static map (~30 categories) baked into TypeScript? Or a `IndustryLookup` MongoDB collection that admins can edit? Recommendation: static map for v1; promote to admin-editable when there's a need.

**Q6.** Region tier table — same question. Recommendation: static map keyed by city → tier.

**Q7.** What about cases that never reach `submitted`? Some get dropped at `intake` or `profiling`. They're not very useful for lender-selection analytics but they ARE useful for funnel analytics ("of all cases started, what % reach submission?"). Recommendation: include them; the `final_stage` field tells the story.

**Q8.** Should we also build a tiny admin-facing UI page showing `analytics_etl_runs` (last 14 runs, status, durations)? Recommendation: yes, but as a separate ticket after the ETL itself is solid.

---

## 11. Implementation slices

> **Build status (2026-05-20):** Slices 1–6 shipped server-side (one commit
> each). Slice 7 reframed + Slice 8 delivered as the runbook (see note below).
> Production rollout is an operator action — the whole pipeline is dark until
> `ANALYTICS_ETL_ENABLED='true'`.

| Slice | What | Status |
|---|---|---|
| **1** | `ANALYTICS_PEPPER` env var + `personIdHmac` helper + unit tests | ✅ done |
| **2** | `analytics_cases` collection registration in `mongo.ts` + TypeScript types + indexes | ✅ done |
| **3** | De-identification helpers (`ageBracket`, `incomeBracket`, `industryLookup`, `regionTier`) + unit tests | ✅ done |
| **4** | `buildAnalyticsCase` orchestrator (pure function, takes Case + payload, returns analytics row) + tests | ✅ done (spec §5 reconciled to the real payload; `person_id` null in v1) |
| **5** | ETL job + `/api/cron/analytics-etl` endpoint + `analytics_etl_runs` audit collection | ✅ done (gated by `ANALYTICS_ETL_ENABLED`) |
| **6** | Privacy contract regression test (`analyticsForbiddenFields.test.ts`) | ✅ done |
| **7** | Scheduled trigger + smoke run | ⚪ runbook-documented, operator action — **no `vercel.json` native cron**: Vercel cron is GET-only, the endpoint is POST (matches DATA-2/DATA-3). Driven by an external scheduler at `30 20 * * *` UTC (= 02:00 IST). See the runbook. |
| **8** | Runbook + first scheduled run | ✅ runbook shipped (`docs/runbooks/DATA-4-ANALYTICS-ETL-RUNBOOK.md`); first run is an operator step |

Each slice is a separate commit reviewable on its own. Same pattern as DATA-1.

---

## 12. Cross-references

- `docs/specs/PII-RETENTION-POLICY-SPEC.md` Part D — the broader retention spec this is extracted from
- `docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md` — the locality-bucket + k-anonymity patterns reused here
- `docs/specs/DATA-3-FILE-DELETION-SPEC.md` — the cron-endpoint pattern this ETL follows
- `src/lib/server/csfle/snapshotCrypto.ts` — `resolveSnapshotPayload()` used by the ETL to decrypt form payloads
- `src/lib/server/data1/localityBucket.ts` — reused for `property_locality_bucket`
- `src/lib/database/mongo.ts` — where the new collection registration lands

---

*End of v1 spec. Awaiting review. Mark with section-level comments or "approve" / "revise this section." Implementation does not start until this is signed off.*
