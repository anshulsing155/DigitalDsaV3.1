# DATA-1 — DSA-Attributed Lead-Attribution Vault (Design Spec)

**Status**: Design only — implementation sequenced last per ADR-0006 (after DATA-3 done, SEC-2, DATA-2)
**Roadmap item**: DATA-1 in `ARCHITECTURE-EVOLUTION.md` — P1, 1–2 weeks
**Companion ADR**: `docs/adr/0006-data-segregation-and-sequencing.md` — sequencing decision
**Encryption dependency**: None. All DATA-1 vault fields are non-PII by design (bucketed price, bucketed locality, quarter-only dates, DSA back-ref). Bucketing IS the privacy mechanism — encryption would add cost without security benefit. The k-anonymity gate in §9 is the actual privacy protection.
**Author**: 2026-05-18

---

## Section Index

1. [Purpose — and how this differs from DATA-2](#1-purpose)
2. [Bucketing rules](#2-bucketing-rules)
3. [Collection schema — `LeadAttributionVault`](#3-collection-schema)
4. [Lead-routing query](#4-lead-routing-query)
5. [Referral fee integration points](#5-referral-fee-integration-points)
6. [API surface](#6-api-surface)
7. [DSA UX at case close](#7-dsa-ux-at-case-close)
8. [Customer disclosure language](#8-customer-disclosure-language)
9. [Privacy guarantees — k-anonymity analysis](#9-privacy-guarantees)
10. [Consent model](#10-consent-model)
11. [Encryption wiring (SEC-2 dependency)](#11-encryption-wiring)
12. [Test plan](#12-test-plan)
13. [Risks](#13-risks)
14. [Open questions](#14-open-questions)

---

## 1. Purpose

### What DATA-1 does

DATA-1 remembers that DSA X handled a home loan in the Powai Hiranandani area, ~₹1.9 Cr ticket, in Q1 2026, and successfully placed it with HDFC.

When a **new inbound customer** enters DigitalDSA looking for a home loan near Powai Hiranandani at ~₹2 Cr, the platform queries DATA-1 to find DSAs who have handled similar cases in that locality and price band. Those DSAs are surfaced as recommended contacts — they earn a referral fee when the new customer connects with them.

### What DATA-1 is NOT

DATA-1 is not anonymized market intelligence. ADR-0006 described it that way initially; this spec supersedes that description. The DSA back-reference (`source_dsa_id`) is the entire point — without it, there is nothing to route.

### How DATA-1 differs from DATA-2

| | DATA-1 (this spec) | DATA-2 |
|---|---|---|
| **Who is remembered** | The DSA — which cases they handled, in which localities | The customer — mobile + loan profile, consented to outreach |
| **Direction of action** | Route a NEW customer to the right DSA | Reach BACK OUT to a PAST customer with a new offer |
| **Customer PII stored** | None. DSA ID (internal ref). Bucketed geography + price only. | Customer mobile + loan profile (high-tier PII) |
| **Collection** | `LeadAttributionVault` | `OutreachVault` |
| **Encryption** | None — bucketed values are non-PII | Mobile encrypted per SEC-2; loan profile plain |
| **Trigger** | Case reaches `stage: 'sanctioned'` (see §14 Q1) | Customer opts in at BT/DC offer screen |

### AD-04 alignment

DATA-1 is the primary technical expression of AD-04 (centralized RM database — crowdsourced from all DSAs, shared globally, non-competitive). The vault is shared across DSAs: every DSA's closed-case signal is visible to the routing engine when matching inbound customers. This is intentional and non-competitive because the match is on geography + price bucket, not on any customer's identity.

---

## 2. Bucketing Rules

Bucketing reduces precision to protect address details while preserving routing signal. The deliberate trade-off: coarser buckets mean less precise routing but larger anonymity cohorts; finer buckets mean better routing but higher re-identification risk. Privacy wins ties.

### 2.1 Property Locality Bucket

| Input type | Bucket rule | Example input | Example bucket |
|---|---|---|---|
| Tower/complex address | Tower complex name + area name | "Flat 4B, Hiranandani Gardens, Powai, Mumbai 400076" | `"Hiranandani Gardens Powai"` |
| Named development | Development name + area | "Unit 201, Lodha Palava, Dombivali East" | `"Lodha Palava Dombivali"` |
| Lane address | Lane name + locality | "14A, Linking Road, Bandra West" | `"Linking Road Bandra West"` |
| Rural / village | Village + taluka | "Survey No. 45, Mhalunge, Mulshi Taluka" | `"Mhalunge Mulshi"` |

**Always dropped**: flat number, door number, survey number, building number, floor, wing letter, numeric street prefix.

**Parsing strategy** (server-side utility `src/lib/server/data1/localityBucket.ts`): regex pipeline applied in order — (1) strip flat/unit patterns `/(flat|unit|f-|apt\.?)\s*[\dA-Z]+/i`, (2) strip leading numeric tokens, (3) take first two comma-delimited non-numeric segments, (4) title-case + normalize whitespace. Deterministic: same address always produces the same bucket.

### 2.2 Property Pincode

Stored as-is (6-digit string). Pincode is already a geographic bucket (~2–10 km² in urban India). No further rounding. Encrypted for storage (deterministic QE, equality-queryable).

### 2.3 Property Price Bucket

Floor to nearest ₹10,000:

`price_bucket = Math.floor(raw_price / 10_000) * 10_000`

Example: ₹1,87,43,200 → ₹1,87,40,000. At a ₹2 Cr price point, ₹10k rounding is 0.05% precision loss — negligible for routing. Encrypted with QE range mode (queryable by range, not equality).

### 2.4 Loan Amount Bucket

Same rule: floor to nearest ₹10,000.

`loan_amount_bucket = Math.floor(raw_loan_amount / 10_000) * 10_000`

Encrypted with QE range mode. Used for secondary routing signal in future iterations; present in v1 schema but not in the v1 routing query.

### 2.5 Date Bucket

Quarter + year only. No exact date stored.

| Month | Quarter |
|---|---|
| Jan, Feb, Mar | Q1 |
| Apr, May, Jun | Q2 |
| Jul, Aug, Sep | Q3 |
| Oct, Nov, Dec | Q4 |

`closed_quarter = "${year}-Q${Math.ceil(month / 3)}"`

Example: 2026-03-14 → `"2026-Q1"`. Stored as clear string — it is not PII.

### 2.6 Precision vs Privacy Summary

Bucketing at these levels means a vault entry describes "a loan in this neighbourhood, approximately this price, in this quarter." It cannot identify a specific property or customer. The k-anonymity gate in the routing query (§4) enforces a cohort-size floor as an additional safeguard.

---

## 3. Collection Schema

### `LeadAttributionVault`

All fields stored as plaintext. Bucketing is the privacy mechanism (see §2 and §9).

```typescript
interface LeadAttributionVaultEntry {
  _id: ObjectId;

  // Source provenance
  source_case_id: string;       // cases.case_id — human-readable ref ("HL-2026-0042")
  source_dsa_id: ObjectId;      // DsaApplications._id — the DSA who handled the case
  closed_quarter: string;       // "2026-Q1"
  created_at: Date;             // when this vault entry was written

  // Loan classification
  loan_type: string;            // "Home Loan" | "LAP" | "Plot Loan" | etc.
  lender_selected: string;      // lender name (professional signal, not PII)

  // Geography (bucketed, plaintext)
  property_locality_bucket: string;   // e.g. "Hiranandani Gardens Powai"
  property_pincode: string;           // e.g. "400076"

  // Financials (bucketed, plaintext)
  property_price_bucket: number;      // ₹10k floor
  loan_amount_bucket: number;         // ₹10k floor

  // Consent
  consent_ref: string;          // doc_id of the signed consent document on the case
}
```

**Deliberately absent from the schema**: customer name, mobile, email, PAN, Aadhaar, full address, exact date, exact price, any field that could re-identify the customer.

### Indexes

| Index | Fields | Type | Purpose |
|---|---|---|---|
| Primary | `_id` | unique | Default |
| Source dedup | `source_case_id` | unique | One vault entry per case maximum |
| DSA audit | `(source_dsa_id, closed_quarter DESC)` | compound | DSA views own entries, recency-ordered |
| Routing core | `(loan_type, property_pincode, property_locality_bucket)` | compound | Core routing match — see §4 |
| Recency scan | `closed_quarter DESC` | single | Recency ranking across full vault |

The compound routing index works as a standard MongoDB index — no encryption-related complications. All fields are plaintext bucketed values.

---

## 4. Lead-Routing Query

### Input

A new inbound customer's property search intent:
- `loan_type` — e.g. `"Home Loan"`
- `search_pincode` — 6-digit string
- `search_locality` — raw text, e.g. `"Powai Hiranandani"` (run through `localityBucket()` before query)
- `target_price` — number in rupees, e.g. `20000000`

### Three-pass strategy

**Pass 1 — Pincode + loan type (precise)**

Match on `property_pincode` (equality) within a 40% price band around `target_price`.

SQL-equivalent:
```sql
SELECT
  source_dsa_id,
  COUNT(*) AS case_count,
  MAX(closed_quarter) AS most_recent_quarter,
  AVG(property_price_bucket) AS avg_price_bucket,
  ARRAY_AGG(DISTINCT lender_selected ORDER BY created_at DESC LIMIT 3) AS top_lenders
FROM LeadAttributionVault
WHERE
  loan_type = :loan_type
  AND property_pincode = :search_pincode
  AND property_price_bucket >= :price_lower      -- floor(target × 0.6 / 10000) × 10000
  AND property_price_bucket <= :price_upper      -- floor(target × 1.4 / 10000) × 10000
GROUP BY source_dsa_id
ORDER BY (0.6 * recency_score + 0.4 * normalized_case_count) DESC
LIMIT 5
```

Where:
- `price_lower = Math.floor(target_price * 0.6 / 10_000) * 10_000`
- `price_upper = Math.floor(target_price * 1.4 / 10_000) * 10_000`
- `recency_score` = 1.0 for current quarter; subtract 0.15 per quarter in the past; floor at 0.1 after 6 quarters
- `normalized_case_count` = this DSA's count ÷ max count in result set (value 0..1)

If Pass 1 returns ≥ 3 distinct DSAs, stop here.

**Pass 2 — Locality bucket + loan type (fuzzy fallback)**

Same query, replace `property_pincode = :search_pincode` with `property_locality_bucket = :bucketized_locality` (where `bucketized_locality = localityBucket(search_locality)`). Useful when the customer searches by a neighbourhood name that spans multiple pincodes.

If Pass 1 + Pass 2 combined returns ≥ 3 distinct DSAs, stop.

**Pass 3 — Loan type only (last resort)**

Remove all geography filters. Return top DSAs by case count for `loan_type` across the full vault. Surface to the user with label: "DSAs experienced in this loan type (no exact area match found)."

### k-anonymity suppression gate

Before returning any geography-level result (Pass 1 or 2), check total vault entries across all DSAs for this (geography bucket + price range): if total count < 5, suppress the geography results and jump directly to Pass 3. Log the suppression (no PII in log — just bucket values + count).

For `property_price_bucket >= 30_000_000` (≥ ₹3 Cr luxury tier), apply k ≥ 10 threshold instead of k ≥ 5.

### Result shape

```typescript
interface LeadRoutingCandidate {
  dsa_id: ObjectId;
  match_strength: 'pincode' | 'locality' | 'loan_type_only';
  case_count_in_area: number;
  most_recent_quarter: string;           // "2026-Q1"
  avg_price_bucket: number;
  top_lenders: string[];                 // up to 3 lender names — social proof
}
```

`dsa_id` is resolved to DSA display name + profile by the caller. The routing API returns only `dsa_id`; profile hydration is a separate query.

---

## 5. Referral Fee Integration Points

Referral fee escrow, settlement, and payout mechanics are out of scope for this spec. DATA-1 provides the data layer only. Integration points to wire in a future referral-fee spec:

1. **Lead acceptance event**: when a customer accepts a DSA recommendation, emit `{ new_case_id, attributed_dsa_id, routing_match_strength, matched_vault_entry_ids[] }`.
2. **Settlement trigger**: when the new customer's case reaches `stage: 'disbursed'`, a settlement job reads the lead-acceptance event to determine referral fee eligibility.
3. **DSA notification**: `attributed_dsa_id` receives in-app notification at acceptance time and at disbursement. Uses the existing `Notifications` collection (`src/lib/database/mongo.ts`).
4. **Customer disclosure gate**: the disclosure text from §8 must be shown and acknowledged (logged as a `DisclaimerAcceptance` row) before routing candidates are displayed.

---

## 6. API Surface

Three endpoints. All use `apiOk()` / `apiError()` / `apiServerError()` from `$lib/server/apiResponse`. All use `logger` from `$lib/server/logger`. All state-changing client calls use `secureFetch` from `$lib/utils/csrf`.

### `POST /api/dsa/lead-vault`

**Purpose**: Write a vault entry at case sanctioned/closed.
**Auth**: `requireAuthApi` + DSA role. `source_dsa_id` resolved from session — never from request body.
**Input**: `{ case_id: string }`
**Logic**:
1. Load case by `case_id`. Confirm `dsa_id` matches session user. 403 otherwise.
2. Confirm consent: the case must have a checklist item with `doc_name: 'data_usage_consent_v1'` and `status: 'uploaded'`. If missing → `apiError(400, 'CONSENT_REQUIRED')`.
3. Unique index on `source_case_id` prevents duplicates. If exists → `apiOk({ already_saved: true })`.
4. Extract + bucket all fields. Write to `LeadAttributionVault`.
5. Return `apiOk({ vault_entry_id })`.

### `GET /api/dsa/lead-vault`

**Purpose**: DSA transparency view — their own vault entries.
**Auth**: `requireAuthApi` + DSA role.
**Query params**: `page` (default 1), `limit` (default 20, max 50).
**Returns**: paginated list of the calling DSA's entries. Fields returned: `source_case_id`, `loan_type`, `closed_quarter`, `property_locality_bucket`, `property_pincode`, `property_price_bucket`, `lender_selected`, `created_at`. `source_dsa_id` omitted (always the caller).

### `GET /api/lead-routing/match`

**Purpose**: Internal — ranked DSA candidates for an inbound customer search.
**Auth**: `requireAuthApi`. Callable from DSA portal, RM portal, or future intake flow. DSA role not required.
**Query params**: `loan_type`, `pincode`, `locality` (free text), `target_price` (number).
**Logic**: three-pass query from §4. Returns up to 5 `LeadRoutingCandidate` objects (dsa_id only).
**Rate limit**: tighter than standard — this endpoint could be probed to map DSA coverage. Apply per-IP + per-session rate limiting via `$lib/server/rateLimiter`. Do not expose case counts verbatim if DSA has fewer than 3 matching entries (return `"1–2 cases"` as a string, not an integer, in that scenario).

---

## 7. DSA UX at Case Close

### The design question

DATA-1 and DATA-2 both require customer-signed consent. Two upload flows or one?

### Recommendation: single consent doc, two separate vault entries

A single consent document (uploaded once at case close) contains two independently optional checkboxes:

- [ ] "I consent to my property details (approximate area and price) being used to connect future customers with experienced advisors in this area." → triggers DATA-1 vault entry
- [ ] "I consent to being contacted in future with relevant loan offers." → triggers DATA-2 vault entry

The customer may check one, both, or neither. The signed document is stored once against the case as `doc_name: 'data_usage_consent_v1'`. The same `consent_ref` (the checklist item's `doc_id`) is stored in both vault entries.

**Why one doc, not two**: DSAs face friction with multi-step upload flows. One upload is the practical choice. The platform-issued consent template clearly separates the two purposes in plain language. The DSA is responsible for ensuring the customer understands before signing.

**DSA UI at case close** (new section in case-management flow, "Enable Lead Routing"):

- Two opt-in checkboxes as above
- Consent document upload widget (same component as other document uploads)
- If neither box is checked: soft warning "Without consent, this case won't contribute to lead routing"
- If boxes are checked but no upload: hard block with "Please upload the signed consent document before saving"

---

## 8. Customer Disclosure Language

### In the consent document (signed by past customer at case close)

> "Your property search details (approximate location and price range) may be used by DigitalDSA to connect future customers with advisors experienced in this area. Your name, contact details, PAN, Aadhaar, and exact address will NOT be stored or shared. Only an approximate area name and price range (rounded to the nearest ₹10,000) will be used. You may withdraw this consent at any time by contacting your advisor or writing to support@digitaldsa.com."

### On-screen before displaying routing results (shown to new inbound customer)

> "These advisor recommendations are based on experience with similar loans in this area. No personal information about past customers was used — only anonymized area and price data."

---

## 9. Privacy Guarantees — k-Anonymity Analysis

The routing query suppresses geography-level results when fewer than 5 vault entries exist for the queried geography + price band (k ≥ 10 for luxury ≥ ₹3 Cr). This is the enforcement mechanism.

**Urban markets** (Mumbai, Pune, Bengaluru): at pincode granularity with ₹10k price rounding, most pincodes have many similar-price transactions per quarter. k ≥ 5 cohorts are routine. Risk: low.

**Tier-2 / Tier-3 markets** (Nashik, Karad, Jalgaon): lower transaction density. A ₹40L LAP in a specific rural pincode may have fewer than 5 cases on the platform in any six-month window. The suppression gate redirects to Pass 3 (loan type only). Risk: moderate, mitigated.

**Luxury / niche** (₹5 Cr+ villas, niche commercial LAP): very thin cohorts even in major cities. The k ≥ 10 threshold for ≥ ₹3 Cr entries partially addresses this. A further mitigation: if only one DSA has ever handled a given locality + luxury price band, their match_strength result is suppressed regardless of k (returning one DSA from a thin cohort is functionally a de-anonymization of the underlying transaction).

**What is not anonymized**: `source_dsa_id` is clear in the vault — it is the routing key by design. A vault breach would reveal that DSA X handled cases in Hiranandani Gardens Powai in the ₹1.8–2.0 Cr band in Q1 2026. This is DSA professional activity, not customer personal data. The customer is not traceable from the vault entry.

**Quarter-level date bucketing**: prevents timing-based attacks. An adversary who knew locality + price + lender + quarter would still need to search public property registrar records to link to a specific transaction. Difficult but not impossible — the k-anonymity gate is the primary defense; date bucketing is defense-in-depth.

---

## 10. Consent Model

1. Customer signs the platform-issued consent document (physical or electronic per DPDP §6).
2. DSA uploads the signed document to the case checklist as `doc_name: 'data_usage_consent_v1'`.
3. `consent_ref` = the checklist item's `doc_id`. The vault write API validates this item exists, is `status: 'uploaded'`, and has a `upload.file_id` before writing any vault entry.
4. **Consent withdrawal** (DPDP §13 right to erasure): DSA notifies the platform. The vault entry is deleted. A `ConsentWithdrawalLog` row is written (analogous to `ArtifactDeletionLog` from DATA-3) to preserve the audit trail that data existed and was removed.
5. No consent = no vault entry. System-enforced, not a UI warning.

---

## 11. Encryption Wiring (Not Needed)

DATA-1 does NOT depend on SEC-2 and does NOT encrypt any of its fields. This is a deliberate choice:

- The vault stores ONLY bucketed, coarse values: locality (tower/lane name, no flat numbers), pincode (already a 2–10 km² bucket), price rounded to ₹10k, dates as quarter strings, and a DSA back-reference.
- None of these values are PII for a specific customer. They describe DSA professional activity, not customer identity.
- Bucketing IS the privacy mechanism. The k-anonymity suppression gate in §9 (k ≥ 5 standard, k ≥ 10 for ≥ ₹3 Cr) is the enforcement layer.
- Encrypting bucketed non-PII would add infrastructure cost (CSFLE setup, key management complexity, query overhead) for zero additional privacy benefit.

If at any point DATA-1 starts storing raw (non-bucketed) values, that decision triggers a re-design of this section — non-bucketed property/locality data WOULD be PII and would need encryption.

---

## 12. Test Plan

### Unit tests (~25) — `src/lib/testing/__tests__/data1/`

**`localityBucket.test.ts`** (~10 tests): tower + area extraction; lane + locality extraction; rural village + taluka; flat number stripped; floor designation stripped; numeric prefix stripped; idempotency (same input → same output on repeated calls); empty address → empty string; very short address (single word) → single word; unicode locality names preserved.

**`priceBucket.test.ts`** (~5 tests): standard case (₹1,87,43,200 → ₹1,87,40,000); exact multiple of ₹10k unchanged; sub-₹10k returns 0; zero returns 0; large value (₹10 Cr) correct floor.

**`closedQuarterBucket.test.ts`** (~5 tests): March → Q1; June → Q2; September → Q3; December → Q4; January → Q1 (boundary); cross-year (Dec 2025 → `"2025-Q4"`, Jan 2026 → `"2026-Q1"`).

**`leadRoutingQuery.test.ts`** (~5 tests): Pass 1 returns ≥3 distinct DSAs → Pass 2 not invoked; Pass 1 < 3 → Pass 2 invoked; k-anonymity gate: total cohort < 5 → suppressed, falls to Pass 3; luxury threshold: price ≥ ₹3 Cr → k ≥ 10 applied; recency decay: entry from 7 quarters ago ranks below entry from last quarter at same case count.

### API tests (~10)

- `POST /api/dsa/lead-vault` missing consent_ref → 400 `CONSENT_REQUIRED`
- `POST /api/dsa/lead-vault` duplicate `case_id` → `apiOk({ already_saved: true })`
- `POST /api/dsa/lead-vault` case belongs to different DSA → 403
- `POST /api/dsa/lead-vault` unauthenticated → 401
- `GET /api/dsa/lead-vault` pagination: page 2 returns different entries than page 1
- `GET /api/dsa/lead-vault` DSA A cannot see DSA B's entries
- `GET /api/lead-routing/match` unauthenticated → 401
- `GET /api/lead-routing/match` rate-limit headers present on response
- `GET /api/lead-routing/match` k-anonymity suppression: thin-cohort fixture → returns Pass 3 results only
- Consent withdrawal: vault entry deleted → subsequent routing query does not include suppressed DSA for that geography

---

## 13. Risks

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| Bucketing rules drift — someone adds a non-bucketed field to the vault | Medium | High | CI test asserting all `LeadAttributionVault` writes go through the `bucketVaultEntry()` helper; helper is the only place that touches the collection. Code review checklist. |
| Thin-market k-anonymity failure (niche geography or luxury price) | Medium | Medium | k ≥ 5 gate (k ≥ 10 luxury). Pass 3 fallback. Log all suppressions. Monitor suppression rate weekly after launch. |
| DSA uploads forged or unsigned consent document | Low | High | v1: platform-issued template, named PDF form — API validates `doc_name`. v2: digital signature layer (future). The consent gate prevents the case where no document is uploaded, but cannot verify a document's authenticity. Flag for legal review. |
| Locality bucket collisions (two different areas map to same bucket) | Low | Low | DSA can review their own entries via `GET /api/dsa/lead-vault`. A collision produces a false-positive routing match — suboptimal but harmless. Low priority. |
| Routing API probed to map DSA geographic coverage | Low | Medium | Per-IP + per-session rate limiting on `GET /api/lead-routing/match`. Return max 5 candidates. Obscure counts < 3 as `"1–2 cases"` (string, not integer). |
| DPDP §13 erasure requests not handled at scale | Low | High | Consent withdrawal flow in §10 is the v1 answer. A formal SAR (Subject Access Request) management workflow is a future feature. |

---

## 14. Open Questions

**Q1 — Trigger stage**: `sanctioned`, `disbursed`, or `closed`? Probable answer: `sanctioned` — lender approval is the clearest success signal. `Disbursed` is too late (tranche delays). `Closed` is ambiguous (rejected-closed uses the same stage). Write at first transition to `sanctioned`.

**Q2 — `lender_selected` in clear**: Could revealing lender + locality + price + quarter let a competitor infer DSA lender relationships? Lender name is professional data, not customer PII. Probable answer: keep it clear; the routing quality benefit (customers can see "this DSA has HDFC experience in your area") outweighs the competitive risk. Allow DSAs to null out `lender_selected` per entry if they object.

**Q3 — Backward population**: Backfill closed cases pre-DATA-1? DPDP §6 bars retroactive consent for past customers. Probable answer: no backfill. Accept thin vault signal for first 3–6 months post-launch.

**Q4 — DSA per-case opt-out**: Can a DSA withhold a case from the vault even if the customer consented? Probable answer: yes — the DSA must actively upload the consent document. If they don't upload it, no vault entry is written. No explicit opt-out toggle needed; inaction is the opt-out.

**Q5 — Multi-lender cases**: Which `lender_selected` value to store when multiple lender applications were sanctioned? Probable answer: the lender application that reached `disbursed` (or the first `sanctioned` if none disbursed yet), by `created_at` ascending.

---

## Appendix A — Cross-References

| Concept | Source |
|---|---|
| Sequencing rationale | `docs/adr/0006-data-segregation-and-sequencing.md` |
| Encryption strategy | Not applicable — DATA-1 stores only bucketed non-PII. See [SEC-2-CSFLE-PLAN.md](SEC-2-CSFLE-PLAN.md) for the platform's encryption approach (used by DATA-2 and primary collections, not DATA-1). |
| DATA-2 (outreach vault) | `docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md` |
| DATA-3 (file deletion) | `docs/specs/DATA-3-FILE-DELETION-SPEC.md` |
| Collection registry pattern | `src/lib/database/mongo.ts` |
| Case type (source shape) | `src/lib/types/case.ts` |
| API response helpers | `src/lib/server/apiResponse.ts` |
| CSRF fetch wrapper | `src/lib/utils/csrf.ts` (`secureFetch`) |
| Disclaimer/disclosure log | `src/lib/types/disclaimer.ts` (`DisclaimerAcceptance`) |
| AD-04 (centralized RM DB) | `CLAUDE.md` §13 |
| DPDP Act 2023 §6 (consent) | External — driver for mandatory consent gate |
| DPDP Act 2023 §13 (erasure) | External — driver for consent withdrawal flow |
