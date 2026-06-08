# DATA-2 — Consented BT/DC Outreach Vault (Design Spec)

**Status**: Design only — implementation queued after SEC-2 ships (per ADR-0006)
**Roadmap item**: DATA-2 in [`ARCHITECTURE-EVOLUTION.md`](../ARCHITECTURE-EVOLUTION.md) — P0, 1–2 weeks
**Companion ADR**: [ADR-0006](../adr/0006-data-segregation-and-sequencing.md) — sequencing: DATA-3 → SEC-2 → **DATA-2** → DATA-1
**Encryption dependency**: [ADR-0005](../adr/0005-mongodb-field-level-encryption.md) + [SEC-2-CSFLE-PLAN.md](SEC-2-CSFLE-PLAN.md). DATA-2 must not go live until SEC-2 is in production.
**Compliance anchor**: DPDP Act 2023 §6 (consent), §7 (purpose limitation), §12 (right to erasure), §13 (grievance redressal)
**Author**: 2026-05-18

---

## Section Index

1. [Why this exists](#1-why-this-exists)
2. [Non-negotiable invariants](#2-non-negotiable-invariants)
3. [Consent model](#3-consent-model)
4. [Collection schema](#4-collection-schema)
5. [Consent state machine](#5-consent-state-machine)
6. [API surface](#6-api-surface)
7. [DSA UX — case-close flow](#7-dsa-ux--case-close-flow)
8. [Eligibility query](#8-eligibility-query)
9. [Revocation flow](#9-revocation-flow)
10. [DPDP compliance checklist](#10-dpdp-compliance-checklist)
11. [Implementation skeleton](#11-implementation-skeleton)
12. [Test plan](#12-test-plan)
13. [Risks and open questions](#13-risks-and-open-questions)

---

## 1. Why this exists

A DSA who closes a Home Loan at 9.25% today has a lead worth revisiting in 18 months if rates fall to 8.50%. Today, that customer's contact details live only in the case payload — and once a case is closed, there is no structured way for the DSA to ask "which of my past customers could benefit from a Balance Transfer (BT) right now?" The answer requires:

1. The customer's mobile number (to reach out)
2. Their original loan profile: amount, ROI, lender, tenure (to compute BT benefit)
3. Evidence that the customer consented to being contacted for exactly this purpose

This vault provides all three, with consent as the gate that determines whether (1) and (2) are retained at all.

**Use cases covered:**
- **BT outreach**: rate-drop alert to customers on higher rates
- **DC outreach**: Direct Conversion — customer on a competitor product who matches a better product on this platform
- **Top-up suggestion**: customer on an existing loan who has equity headroom for a top-up

**What this vault is NOT:**
- Not a CRM (no interaction log, no deal pipeline — that's `Leads` and `CRMLenders`)
- Not a shared/global RM resource — this is DSA-private (AD-04 RM centralization does NOT apply here)
- Not a marketing list — purpose is strictly limited to BT/DC/top-up outreach for the same customer, same DSA

---

## 2. Non-negotiable invariants

1. **No save without uploaded consent doc** — the API returns `400` if `consent_doc_ref` is absent. No exceptions, no deferred upload.
2. **SEC-2 encryption before launch** — `OutreachVault` must be created on the SEC-2 encrypted fabric. No plaintext window. Pre-launch staging can use a dev-only unencrypted stub, but the production collection creation script must use QE.
3. **DSA-private** — a DSA can only read, modify, and query their own vault entries. No cross-DSA leakage. BOLA guard on every route.
4. **Revocation is immediate** — a revoked entry is suppressed from all eligibility queries within the same request cycle. No eventual consistency for revocations.
5. **Purpose-locked** — vault entries may only be used for BT/DC/top-up outreach for the same customer. Using them for any other purpose is a DPDP §7 violation. The consent template must name these three purposes explicitly.
6. **No vault entry survives its consent** — when consent expires or is revoked, the entry enters a 90-day grace period and is then hard-deleted. Grace period allows the DSA to re-obtain consent before data is gone.
7. **Separate from DATA-1** — this collection is never anonymized into the market intelligence dataset. The two vaults serve different purposes and have different regulatory treatment.

---

## 3. Consent model

### What counts as valid consent

A vault entry is only retained when ALL of the following are true at save time:

| Gate | Requirement |
|---|---|
| **C1 — Document present** | `consent_doc_ref.imagekit_file_id` is non-null and the ImageKit asset is reachable |
| **C2 — Template version known** | `consent_doc_ref.template_version` matches a known version in the platform consent registry (starts at `v1`). Unknown versions are rejected. |
| **C3 — Signed date recorded** | `consent_signed_at` is a date in the past (not future-dated, not more than 90 days ago at save time) |
| **C4 — Revocation channel on doc** | The template version is known to include the revocation URL (platform-enforced at template registration — not re-validated per save) |

If any gate fails, the API returns `400` with a structured error identifying which gate(s) failed. The UX pre-validates C1–C3 before the DSA can submit.

### Consent document storage

- **ImageKit folder**: `/consent-docs/{dsa_id}/{vault_entry_id}/` (one file per entry, no overwrite — new consent = new entry)
- **Accepted file types**: PDF, JPG, PNG (same as case document uploads)
- **Max file size**: 10 MB (matching existing upload limits in the document-checklist flow)
- **Template versions**: tracked in a server-side map `CONSENT_TEMPLATE_VERSIONS` in `src/lib/server/data2/consentTemplates.ts`. Adding a new version requires a code change (prevents DSAs from uploading arbitrary unsigned templates).
- **What the v1 template must contain** (content TBD by user, but structurally must include): customer name, mobile, loan reference, DSA name, the three permitted purposes (BT / DC / top-up), a clear revocation channel (URL or contact), and a signature line.

### Revocation channel

The consent doc must list a revocation URL. The platform provides this at `https://app.digitaldsa.com/consent/revoke?token={revocation_token}`. The `revocation_token` is a HMAC-signed, non-guessable token derived from `(vault_entry_id, dsa_id, customer_mobile_hash)` — generated at vault entry creation, embedded in the case PDF footer alongside the standard 7 disclaimers (AD-11).

---

## 4. Collection schema

**Collection name**: `OutreachVault` (per ADR-0006 naming)
**Encryption**: Under the user's "PII only" directive (2026-05-18), only the customer's mobile number is encrypted in this vault. Loan profile fields (lender, ROI, sanctioned amount, tenure) are not PII on their own and stay plain so the eligibility query can run as a normal MongoDB filter. Mobile is encrypted via CSFLE deterministic mode (equality-queryable) — see [SEC-2-CSFLE-PLAN.md](SEC-2-CSFLE-PLAN.md).

```ts
interface OutreachVaultEntry {
  _id: ObjectId;

  // Ownership
  dsa_id: ObjectId;                  // DSA who owns this entry — BOLA anchor
  case_id: string;                   // Source case (e.g. "HL-2026-0042") — reference only, case not deleted on revoke

  // Customer contact — encrypted (CSFLE deterministic — enables equality lookup)
  mobile: string;                    // CSFLE-deterministic. "Has this mobile been vaulted by this DSA?" check works via findOne.

  // Loan profile — NOT encrypted (non-PII; enables direct MongoDB filter in eligibility query)
  loan_profile: {
    loan_type: string;               // 'Home Loan' | 'LAP' | 'Personal Loan' etc.
    lender_id: string;               // ObjectId string ref to Lenders collection
    lender_name: string;             // Denormalized for display
    sanctioned_amount: number;       // ₹ at sanction
    sanctioned_roi: number;          // % p.a. at sanction — the key field for BT eligibility
    tenure_months: number;
    disbursement_date?: Date;        // null if not yet disbursed at vault-save time
  };

  // Consent audit trail
  consent_doc_ref: {
    imagekit_file_id: string;        // ImageKit asset ID for the uploaded consent doc
    imagekit_url: string;            // CDN URL (stored for DSA viewing, not for customer access)
    template_version: string;        // e.g. 'v1'
    uploaded_at: Date;
  };
  consent_signed_at: Date;           // Date on the customer-signed document
  consent_expiry?: Date;             // Optional: if the consent template specifies a maximum validity period. null = no expiry (until revoked).
  revocation_token: string;          // HMAC token embedded in case PDF for customer self-revocation. Non-null at creation.

  // Consent state
  consent_status: 'active' | 'revoked' | 'expired';
  revoked_at?: Date;                 // Set when customer or DSA triggers revocation
  revoked_by?: 'customer_self' | 'dsa' | 'admin' | 'system_expiry';
  revocation_notes?: string;         // Free text (e.g. customer complaint reference)
  grace_period_ends_at?: Date;       // Set at revoke time: revoked_at + 90 days. Hard-delete after this.

  // Lifecycle
  created_at: Date;
  updated_at: Date;
}
```

### Indexes

| Index | Fields | Type | Purpose |
|---|---|---|---|
| Primary | `_id` | unique | Standard |
| BOLA scope | `(dsa_id, _id)` | compound | All DSA-scoped reads — every API route filters on both |
| Mobile lookup | `(dsa_id, mobile)` | compound, CSFLE-deterministic | "Has this mobile been vaulted by this DSA?" check at save |
| Eligibility sweep | `(dsa_id, consent_status, loan_profile.sanctioned_roi)` | compound | BT eligibility queries — filtered on `active` status + ROI threshold |
| Revocation token | `revocation_token` | unique | Customer self-revoke lookup |
| Grace-period sweep | `(consent_status, grace_period_ends_at)` | sparse | Cron: find entries past grace period for hard-delete |
| Case ref | `case_id` | sparse | Cross-reference: find vault entries linked to a case (e.g. for DPDP erasure cascade) |

---

## 5. Consent state machine

```
            ┌──────────────────────────┐
            │   (no entry)             │
            └────────────┬─────────────┘
                         │ POST /btdc-vault (all C1–C4 gates pass)
                         ▼
            ┌──────────────────────────┐
            │   active                 │  Entry visible in eligibility queries
            └────────────┬─────────────┘
                         │
         ┌───────────────┼─────────────────────┐
         │               │                     │
         ▼               ▼                     ▼
  Customer self-   DSA revokes           consent_expiry
  revokes via      via API               date reached
  revocation_token                       (system cron)
         │               │                     │
         └───────────────▼─────────────────────┘
                         │
            ┌────────────▼─────────────┐
            │   revoked                │  Suppressed from all queries immediately
            │   grace_period_ends_at   │  = revoked_at + 90 days
            └────────────┬─────────────┘
                         │
            DSA re-obtains consent within
            grace period → new vault entry
            (separate document, new _id)
                         │
            Grace period ends (cron sweep)
                         │
                         ▼
            ┌──────────────────────────┐
            │   (hard deleted)         │  Document unset from ImageKit, Mongo doc deleted
            │                          │  ConsentRevocationLog row written (kept 7 years)
            └──────────────────────────┘
```

There is no `pending` or `draft` state. Either the consent gate passes at save time and the entry is `active`, or the API rejects. There is intentionally no deferred-consent path.

---

## 6. API surface

All routes live under `/api/dsa/btdc-vault`. All require `requireAuth` guard. All state-changing routes use `secureFetch` on the client side (CSRF).

### `POST /api/dsa/btdc-vault`

Save a new vault entry. Validates consent gates C1–C4. Encrypts `mobile` + `loan_profile` fields via the QE-configured client (SEC-2). Checks for duplicate `(dsa_id, mobile)` — if active entry exists, returns `409` with a pointer to the existing entry ID (DSA should revoke the old one first, or update it by creating a new entry after the old is revoked).

Request body: `{ case_id, mobile, loan_profile: { loan_type, lender_id, lender_name, sanctioned_amount, sanctioned_roi, tenure_months, disbursement_date? }, consent_doc_ref: { imagekit_file_id, imagekit_url, template_version, uploaded_at }, consent_signed_at, consent_expiry? }`

Response `200`: `{ entry_id, revocation_token, consent_status: 'active' }`
Response `400`: `{ error, failed_gates: string[] }` — which of C1–C4 failed
Response `409`: `{ error: 'duplicate_mobile', existing_entry_id }` — active entry for this mobile already exists

### `GET /api/dsa/btdc-vault`

List all vault entries owned by the authenticated DSA. Supports pagination (`?page=1&limit=20`). Returns entries with `mobile` and `loan_profile` decrypted. Excludes revoked entries by default; add `?include_revoked=true` to include.

### `GET /api/dsa/btdc-vault/:id`

Single entry by `_id`. Enforces `dsa_id === req.locals.dsa_id` (BOLA guard). Returns full entry including consent doc metadata.

### `POST /api/dsa/btdc-vault/:id/revoke`

DSA-initiated revocation. Sets `consent_status: 'revoked'`, `revoked_at: now`, `revoked_by: 'dsa'`, `grace_period_ends_at: now + 90 days`. Immediately suppressed from eligibility queries. Does NOT delete the Mongo doc yet — that happens at grace-period end via the sweep cron.

Body: `{ reason?: string }` — optional free-text note.

### `GET /api/dsa/btdc-vault/eligible`

Query vault for BT/DC opportunities. DSA-scoped (own entries only). Filters: `consent_status: 'active'` AND `loan_profile.sanctioned_roi >= current_rate_floor + 0.5`.

Query params: `?current_rate_floor=8.5&loan_type=Home+Loan&min_amount=5000000`

Returns entries where the stored ROI is at least 50 basis points above `current_rate_floor`, sorted descending by ROI gap. The platform does not compute current market rates — the DSA supplies `current_rate_floor` based on their knowledge of available offers.

---

## 7. DSA UX — case-close flow

The vault entry point is the case-close transition screen — when a DSA moves a case from `processing` or `sanctioned` to `closed` (or `disbursed`).

**Flow (mobile-friendly, single-modal):**

1. DSA taps "Close case" on the case dashboard.
2. Before the close confirmation, a full-screen step appears: "Save customer for future BT/DC opportunities?"
3. A short explainer: "If the customer has signed a consent form, you can save their contact for future rate alerts. Without consent, we cannot save their details."
4. **If DSA taps "Skip":** proceed to case close, no vault entry created. No data retained.
5. **If DSA taps "Save for later":**
   - Sub-step 1: Upload consent doc (file picker — PDF/JPG/PNG, same component as document-checklist upload).
   - Sub-step 2: Enter consent signed date (date picker, max 90 days ago).
   - Sub-step 3: Optional — set consent expiry date (leave blank for no expiry).
   - Validation inline: if any consent gate fails, show which gate and what to fix. "Next" button disabled until all gates pass.
   - Sub-step 4: Confirmation screen showing what will be saved (mobile masked: `+91 XXXXX12345`, loan type, rate, lender name) + a note: "A revocation link will appear in the customer's case PDF."
   - Confirm → `POST /api/dsa/btdc-vault` → on success, proceed to case close.
6. If `POST` returns `409` (duplicate mobile): "You already have an active vault entry for this customer. Revoking the old one and saving this new one? [Revoke old + Save new] [Cancel]"

**Pre-save dialog wording** (exact phrasing for DPDP compliance): "By saving, you confirm the customer has signed a consent form authorising DigitalDSA to contact them for Balance Transfer, Direct Conversion, or Top-Up offers. The customer can withdraw consent at any time via the link in their case document."

---

## 8. Eligibility query

The `eligible` endpoint implements this SQL-equivalent filter:

```
SELECT * FROM OutreachVault
WHERE dsa_id = :authenticated_dsa_id
  AND consent_status = 'active'
  AND (consent_expiry IS NULL OR consent_expiry > NOW())
  AND loan_profile.loan_type = :loan_type          -- optional filter
  AND loan_profile.sanctioned_roi >= :current_rate_floor + 0.5
  AND loan_profile.sanctioned_amount >= :min_amount  -- optional filter
ORDER BY (loan_profile.sanctioned_roi - :current_rate_floor) DESC
```

**Why 0.5% floor**: a BT transfer typically involves processing fees, legal charges, and DSA time. Below 50 bps differential, the net benefit to the customer is marginal and outreach may be perceived as spam. This threshold is a platform default — it is NOT configurable per entry. If the user wants to change it, it changes in `src/lib/server/data2/eligibilityQuery.ts` as a named constant.

**Implementation note**: under the user's "PII only" directive (2026-05-18), `sanctioned_roi` and the other loan-profile fields are stored as plain numbers, NOT encrypted. The eligibility filter therefore runs as a direct MongoDB predicate — no in-memory decrypt+filter pass needed. Only `mobile` is encrypted, and the eligibility query does not filter on mobile.

---

## 9. Revocation flow

### Customer self-revocation (via PDF link)

1. Customer opens the case PDF and taps the revocation URL: `https://app.digitaldsa.com/consent/revoke?token={revocation_token}`
2. A public (unauthenticated) landing page verifies the HMAC token. On valid token: show a confirmation screen with the customer name (first name only, from `consent_doc_ref` metadata — no mobile displayed), the DSA name, and the three purposes being revoked.
3. Customer taps "Withdraw Consent" → `POST /api/public/consent-revoke` (token in body, no auth required). Server verifies HMAC, sets `consent_status: 'revoked'`, `revoked_by: 'customer_self'`, `grace_period_ends_at: now + 90 days`.
4. Customer sees: "Your consent has been withdrawn. {DSA Name} will no longer contact you for these offers."
5. No account required. No OTP. The HMAC token IS the authentication.

### DSA-initiated revocation

Via `POST /api/dsa/btdc-vault/:id/revoke`. Same effect — entry is suppressed immediately, grace period starts.

### Grace-period hard-delete (cron)

A daily sweep cron at `/api/cron/data2-revoke-sweep` (guarded by `requireCronSecret`) runs:

1. Finds `OutreachVault` entries where `consent_status: 'revoked'` AND `grace_period_ends_at <= now`.
2. For each: delete the ImageKit consent doc (same retry/backoff pattern as DATA-3's `imagekitDelete.ts`).
3. Write a `ConsentRevocationLog` row (see §11) before any deletion — same audit-log-first pattern as DATA-3.
4. Hard-delete the `OutreachVault` Mongo doc.

The grace period gives the DSA 90 days to obtain a fresh consent from the customer (if they still want to retain the entry) before the data is gone. It also provides a 90-day window for the customer to contact a grievance officer if they believe revocation was not processed correctly.

---

## 10. DPDP compliance checklist

| Requirement | How DATA-2 meets it |
|---|---|
| **§6 — Consent must be free, specific, informed, unconditional, unambiguous** | Consent gate C1–C4 enforces a physical signed document. "Skip" path is equally easy (no dark pattern nudging toward consent). |
| **§6 — Consent must be as easy to withdraw as to give** | Revocation link in PDF (one tap, no account, no OTP). `POST /btdc-vault/:id/revoke` for DSA-side. |
| **§7 — Purpose limitation** | `loan_profile` is used ONLY by the eligibility query for BT/DC/top-up outreach. No joins into CRM, no aggregation into DATA-1, no RM-portal access. |
| **§7 — No processing beyond consent scope** | The consent template names exactly three purposes. The API does not expose `mobile` in any context except the single-entry DSA view — never in bulk exports, never in eligibility query results (eligibility returns entry metadata, not raw mobile). |
| **§11 / §12 — Right to access and correction** | Customer can request their stored data via the grievance contact on the consent template. A `GET /api/public/consent-data?token={revocation_token}` endpoint (TBD — see §13 open questions) would return what is stored. |
| **§12 — Right to erasure** | Revocation triggers hard-delete within 90 days. No resurrection path. `ConsentRevocationLog` is retained (7 years, no PII) for regulatory audit. |
| **§13 — Grievance redressal** | Grievance officer contact details printed on the consent template and in the case PDF footer. Grievance channel: `consent-grievance@digitaldsa.com` (to be set up — see open questions). |
| **Retention limitation** | Entries without explicit expiry are retained only while `consent_status: 'active'`. The platform has no "permanent retention" path for vault entries. |
| **Data minimisation** | Only three fields from the case are vaulted: mobile, loan_type/lender/ROI/amount/tenure. No applicant name, no address, no PAN/Aadhaar. |

---

## 11. Implementation skeleton

**New module**: `src/lib/server/data2/` (mirrors `src/lib/server/data3/`)

**New files (implementation sub-sessions):**

| File | Purpose |
|---|---|
| `src/lib/server/data2/types.ts` | `OutreachVaultEntry`, `ConsentDocRef`, `ConsentStatus`, `ConsentRevocationLog` TypeScript interfaces |
| `src/lib/server/data2/consentTemplates.ts` | `CONSENT_TEMPLATE_VERSIONS` registry; `validateConsentGates(payload) → { valid, failed_gates }` |
| `src/lib/server/data2/revocationToken.ts` | `generateRevocationToken(entry_id, dsa_id, mobile_hash) → string`; `verifyRevocationToken(token) → { entry_id, dsa_id } \| null` — HMAC-based, constant-time comparison |
| `src/lib/server/data2/eligibilityQuery.ts` | `queryEligible(dsa_id, params) → OutreachVaultEntry[]` — in-memory ROI filter post-decrypt |
| `src/lib/server/data2/revocationLog.ts` | `recordRevocation(payload) → ConsentRevocationLog` — audit-log-first write |
| `src/lib/server/data2/gracePeriodSweep.ts` | Cron body: find expired revocations, delete ImageKit + Mongo, write log |
| `src/lib/database/migrations/0043_data2_collections.ts` | Creates `OutreachVault` collection with QE-enabled schema; creates `ConsentRevocationLog` collection; creates all indexes |
| `src/routes/api/dsa/btdc-vault/+server.ts` | `GET` (list) + `POST` (save) |
| `src/routes/api/dsa/btdc-vault/[id]/+server.ts` | `GET` (one) |
| `src/routes/api/dsa/btdc-vault/[id]/revoke/+server.ts` | `POST` (revoke) |
| `src/routes/api/dsa/btdc-vault/eligible/+server.ts` | `GET` (eligibility query) |
| `src/routes/api/public/consent-revoke/+server.ts` | `POST` (customer self-revoke — unauthenticated, HMAC-gated) |
| `src/routes/api/cron/data2-revoke-sweep/+server.ts` | Cron entry point (guarded by `requireCronSecret`) |
| `src/lib/database/mongo.ts` | Add `OutreachVault` and `ConsentRevocationLog` collection exports |

**New collection: `ConsentRevocationLog`** (analogous to `ArtifactDeletionLog` in DATA-3):

```ts
interface ConsentRevocationLog {
  _id: ObjectId;
  vault_entry_id: ObjectId;   // The entry that was deleted
  dsa_id: ObjectId;           // Owning DSA
  case_id: string;            // Source case reference
  consent_template_version: string;
  consent_signed_at: Date;
  revoked_at: Date;
  revoked_by: 'customer_self' | 'dsa' | 'admin' | 'system_expiry';
  grace_period_ends_at: Date;
  hard_deleted_at: Date;      // Set when Mongo doc is destroyed
  imagekit_deletion_status: 'success' | 'failed' | 'already_gone';
  actor: 'system_sweep' | 'admin' | 'cron';
  created_at: Date;
}
```

No PII in this log. It records that consent was revoked and the entry destroyed, but not the mobile or loan details. 7-year retention per RBI audit-trail guidance.

---

## 12. Test plan

**Unit tests** (`src/lib/testing/__tests__/`):

| Test | What it proves |
|---|---|
| `consentGateValidation.test.ts` | C1: missing `imagekit_file_id` → 400 + `failed_gates: ['C1']`; C2: unknown template version → 400; C3: future-dated `consent_signed_at` → 400; C4: N/A (template-level, no per-entry check) |
| `revocationToken.test.ts` | Generate → verify roundtrip; tampered token → null; expired token (if time-bounded — TBD §13) → null |
| `eligibilityQuery.test.ts` | 0.5% floor applied correctly; revoked entries excluded; expired entries excluded; loan_type filter applied |
| `gracePeriodSweep.test.ts` | Entry past grace period → deleted; entry within grace period → skipped; ImageKit 404 on delete → treated as success; audit log written before ImageKit call |
| `duplicateMobileGuard.test.ts` | Saving second active entry for same (dsa_id, mobile) → 409 |

**Integration tests** (against test Atlas cluster):

| Test | What it proves |
|---|---|
| Full save → revoke → sweep cycle | Entry goes `active` → `revoked` → hard-deleted; log written |
| Customer self-revoke via HMAC token | Public endpoint processes revocation without auth; wrong token → 400 |
| BOLA: DSA-A cannot read DSA-B's entries | `GET /btdc-vault/:id` with wrong `dsa_id` → 404 (not 403 — no information leakage on existence) |
| Eligibility query in-memory filter | 10 seeded entries, 3 above threshold → returns exactly those 3 |

**E2E tests** (Playwright):

| Scenario | Coverage |
|---|---|
| Case-close with "Skip" | No vault entry created; case closes cleanly |
| Case-close with consent upload | Full flow; vault entry appears in DSA vault list |
| Consent gate failure in UX | Upload wrong file type → inline error; future date → inline error |
| Vault list shows correct entries | DSA sees own entries only; masked mobile |

---

## 13. Risks and open questions

### Risks

1. **SEC-2 delay cascades to DATA-2.** If SEC-2 implementation slips, DATA-2 cannot launch encrypted. Do not ship DATA-2 to production on an unencrypted `OutreachVault` — the PII density makes this the highest-risk collection on the platform. Mitigation: track SEC-2 implementation separately; begin DATA-2 code work in parallel but gate the collection creation script on SEC-2 completion.

2. **In-memory eligibility filter scales poorly.** The current design decrypts all `active` entries for a DSA and filters in-memory (§8). For a DSA with 500+ vault entries this is acceptable. At 5,000+ entries, the per-request decrypt overhead becomes noticeable. Mitigation plan: add a plaintext `roi_bucket` field (rounded to nearest 0.5%, non-PII) if this becomes a real problem — revisit at 500+ entries per DSA in production data.

3. **HMAC token for revocation is long-lived.** The revocation token embedded in the PDF has no expiry in the current design. If the PDF is re-shared years later, the token still works. This is intentional (customers should always be able to revoke), but means a stale PDF can trigger a revocation. Mitigation: customer confirmation screen before revocation processes; DSA gets a notification on revocation.

4. **Cascade with DATA-3 deletion.** If a customer who consented to vault outreach also has documents being processed by DATA-3, a full DPDP erasure request must cascade through both `OutreachVault` and `ArtifactDeletionLog`. A future ADR should specify the cross-system erasure orchestrator (referenced in ADR-0006 §Risks).

### Open questions

1. **Consent template content** — exact wording is TBD by user. The spec assumes `v1` exists; the implementation cannot proceed until the template is drafted and approved.

2. **Customer data-access endpoint** — DPDP §11 gives data principals the right to know what is stored about them. The spec notes a `GET /api/public/consent-data?token={revocation_token}` endpoint but does not fully specify it. Should it return the loan profile (exposing ROI back to the customer)? What about DSA name? Needs a UX decision before implementation.

3. **Grievance officer identity** — the consent template and PDF footer must name a grievance officer and provide a contact. `consent-grievance@digitaldsa.com` is a placeholder. The actual person/team responsible must be designated before launch.

4. **Consent expiry default** — the schema allows `consent_expiry` but does not mandate one. DPDP does not specify a maximum retention period for this class of data. Should the platform enforce a default expiry (e.g. 3 years) if none is set? This is a product decision.

5. **Re-consent UX** — when a DSA wants to re-save a customer after revocation (within the 90-day grace period), the spec says "new entry after old is revoked." The UX for this (revoke old + save new in one flow vs two-step manual) is not designed.

6. **Audit notification to DSA on customer self-revocation** — the platform should notify the DSA when a customer self-revokes (so they stop outreach attempts). Notification channel (in-app, email) and timing TBD.

---

## Appendix A — Cross-references

| Concept | Source of truth |
|---|---|
| QE encryption setup | [`SEC-2-ATLAS-QE-PLAN.md`](SEC-2-ATLAS-QE-PLAN.md) + [`docs/adr/0005-mongodb-field-level-encryption.md`](../adr/0005-mongodb-field-level-encryption.md) |
| DATA-* sequencing rationale | [`docs/adr/0006-data-segregation-and-sequencing.md`](../adr/0006-data-segregation-and-sequencing.md) |
| DATA-3 structure (analog) | [`docs/specs/DATA-3-FILE-DELETION-SPEC.md`](DATA-3-FILE-DELETION-SPEC.md) |
| DATA-1 (sibling vault) | [`DATA-1-LEAD-ATTRIBUTION-SPEC.md`](DATA-1-LEAD-ATTRIBUTION-SPEC.md) |
| Case type (vault source payload) | [`src/lib/types/case.ts`](../../src/lib/types/case.ts) |
| Collection registry | [`src/lib/database/mongo.ts`](../../src/lib/database/mongo.ts) |
| Roadmap item | [`docs/ARCHITECTURE-EVOLUTION.md`](../ARCHITECTURE-EVOLUTION.md) — DATA-2 row |
| PDF footer disclaimers (AD-11) | `src/lib/server/pdfBuilder/` — revocation token embed point |
| Existing encryption utility | `src/lib/server/encryption.ts` — extend for HMAC token generation |

---

*This spec is design-only. No implementation code ships with this document. Sub-sessions are sequenced after SEC-2 completes per ADR-0006.*
