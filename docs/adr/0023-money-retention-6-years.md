# ADR-0023 — 6-Year Retention for Money Records

**Status**: Accepted
**Date**: 2026-05-30
**Decided by**: Owner (this session) + statutory floor (Income Tax Act + GST)
**Companion docs**: `docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md` §E.4

---

## Context

The platform stores financial records — billing transactions, GST invoices, subscription state, charge attempts, billing audit logs, reconciliation runs. Two pressures meet on these records:

1. **Statutory retention** under Indian law:
   - **Income Tax Act, §44AA(3) + Rule 6F(5)** — books of account and supporting documents retained for **6 financial years** from the end of the relevant assessment year (effectively ~6 years from the transaction's FY-end).
   - **CGST Act, §36** — accounts and records retained for **6 years** from the due date of the annual return.

2. **User-driven deletion** under DPDP §13 — the user expects "delete my account" to delete everything.

These collide. Existing infrastructure made the collision worse:
- BillingAuditLogs previously inherited the 2-year audit-log TTL pattern (since reverted, but the risk pattern remains: someone could re-add a short TTL to a money collection without realising).
- The DATA-3 document-sweep + DATA-2 grace-period-hard-delete + 2-year audit TTL all operate on PII/operational data with NO statutory retention floor — perfectly correct in their scope, but a hazard if a future developer assumed the same TTL pattern applies to money records.
- `/api/auth/delete-account/+server.ts` currently archives only the user document (DsaApplications → deletedDsa with 30-day TTL). Money records stay in their collections by virtue of not being explicitly touched. That's the right behaviour today — but it's fragile because nothing in the code SAYS so. A "let's clean up everything on account delete" refactor would silently violate the 6-year obligation.

There's also no policy doc the legal/CA team can point at when asked "how do we ensure GST audits 2+ years from now still find their invoices?"

## Decision

Adopt a **6-year retention** policy for money records, codified in three layers:

### Layer 1 — code-as-policy

A new pure module `src/lib/server/retention/moneyRetention.ts`:

- `MONEY_RETENTION_YEARS = 6` constant. "Configurable per legal advice" via a one-line change + ADR amendment if CA's interpretation diverges (e.g. some interpretations argue 8 years for company-tax cases).
- `MONEY_COLLECTIONS` runtime collection-name array. Adding a new financial collection in the future = add it here, and the structural protections kick in automatically.
- `MONEY_COLLECTION_VAR_NAMES` PascalCase counterpart for the static-scan tests.
- `getMoneyRetentionExpiry(fyEndDate)` and `fyEndForDate(txDate)` helpers — the eventual 6-year-expired sweep cron uses these against each row's anchor date.

### Layer 2 — static-scan CI locks

- **`moneyCollectionsTtlAbsence.test.ts`** — walks `src/lib/database/mongo.ts` for every `<MoneyCollection>.createIndex(...)` call. Fails CI if any options-arg contains `expireAfterSeconds` set to less than 6 years in seconds (~189M). Also fails on non-literal values (e.g. `expireAfterSeconds: TTL_FROM_CONFIG`) so the bound is statically verifiable.
- **`accountDeletionPreservesMoney.test.ts`** — scans the account-lifecycle handlers (delete-account, detect-roles, restore-account) and asserts none calls `deleteOne | deleteMany | drop | findOneAndDelete | updateMany-with-$unset` on any money collection. Cross-cutting sweep also walks `src/routes/api/auth` and `src/routes/api/admin/users` for new files referencing `deletedDsa | deletedRm | deletedPc` — any new file there must be added to `ACCOUNT_LIFECYCLE_FILES` (failing fast on undocumented lifecycle paths).

Per Pitfall #66, both lock tests target USAGE shapes (`<Var>.createIndex(`, `<Var>.deleteOne(`) rather than bare identifiers, so removal-history comments + ADR cross-references don't trip the scans.

### Layer 3 — DPDP §13 lawful-basis carve-out

Money records survive account closure for the statutory window. The user's CPI fields (name, GSTIN, etc.) inside money records may eventually be minimized post-active-window (pending CA sign-off on what residual fields are legally required vs PII-minimizable), but the records themselves stay put. This is a lawful-basis exception under DPDP §13 — documented here so the legal team has a citation when explaining to a user requesting deletion.

The E.1 data export already mentions this in its README (`buildReadme()` in `src/lib/server/account/dataExport.ts`): _"Money records (billing, invoices) are subject to a 6-year statutory retention obligation under the Income Tax Act — they are exported here but cannot be deleted on account closure until that window expires."_

## Money collections (current scope)

| Collection | Variable | Scope |
|---|---|---|
| `billingTransactions` | `BillingTransactions` | All payment attempts (legacy one-time + D.1 recurring) |
| `billingSubscriptions` | `BillingSubscriptions` | Subscription state + mandate metadata |
| `chargeAttempts` | `ChargeAttempts` | Per-attempt audit (D.1 S4 retry chain) |
| `billingAuditLogs` | `BillingAuditLogs` | Money-event audit log (separate from general audit log) |
| `invoices` | `Invoices` | D.2 GST invoices |
| `invoiceCounters` | `InvoiceCounters` | D.2 per-FY gapless seq counters |
| `reconciliationRuns` | `ReconciliationRuns` | D.1 S7 daily reconciliation history |

Explicitly **not** in scope:

- `processedWebhookEvents` — operational idempotency cache, not a financial record. Stores only `{provider_event_id, processed_at}` for dedup; actual money state lives in `BillingTransactions` / `ChargeAttempts`. Its 18-month TTL (D.1 spec §6 critique P3-3) is intentional and operationally correct for DR replay windows.
- `cronLocks` — operational concurrency lock; ~5-minute TTL.
- D-later collections (payout / TDS / 16A) — append to `MONEY_COLLECTIONS` when those collections land.

## Alternatives considered

### A. Per-collection TTL of exactly 6 years

Add `expireAfterSeconds: 6 * 365 * 24 * 60 * 60` to each money collection. Auto-cleanup at expiry.

**Rejected because**: (a) the 6-year window starts at the END of the financial year, not the transaction date — a single TTL on `created_at` would expire some rows up to ~11 months too early. (b) The future sweep cron needs to apply business logic (e.g. don't delete invoices for cases still under active dispute) that a blunt TTL can't express. (c) Day-1 we don't NEED any sweep — the system started writing billing in 2026, earliest expiry is 2033.

### B. Move money records to a separate "permanent" database

Spec didn't propose this. Operationally heavy — separate cluster, separate backup window, separate access controls. Overkill for our scale.

### C. No code enforcement; rely on a runbook

Operator runbook would say "don't delete money records". Brittle — relies on the runbook being read every time someone writes a deletion path. The CI locks catch the regression in seconds; a runbook catches it after a GST audit.

## Consequences

### Good

- Statutory compliance baked into the type system + CI gates. A future regression that adds a short TTL or sweeps money records during account deletion fails CI immediately, with a pointer to this ADR in the failure message.
- Single source of truth for "what counts as a money record" — `MONEY_COLLECTIONS`. Adding a new financial collection in the future = one-line append, structural protections inherit automatically.
- Account-deletion path's existing (correct) behaviour is now locked. Refactors that "clean up everything" can't silently violate retention.
- Legal team has a citation (this ADR + the constants module) for user-facing communications.

### Bad

- One real find from the TTL-absence lock test: `ProcessedWebhookEvents` carries an 18-month TTL. After analysis, it's intentionally NOT classified as a money record (it's the dedup cache, not the financial state) — but this was a moment of "is this a violation or not?" that required judgement. Future contributors adding new collections will face the same call.
- The 6-year sweep cron is deferred (no rows old enough to delete until 2033). When eventually built, the sweep needs to know the business rules around active disputes / pending refunds — a non-trivial extension.

### Deferred to future ADRs

- **6-year sweep cron** itself. Will need a separate ADR covering: anchor-date per collection (`created_at` vs `issue_date` vs FY-end), business rules around active disputes, deletion mechanism (hard delete vs archive-to-cold-storage), audit row generation for each deletion.
- **Post-active-window PII minimization** on Invoices (GSTIN, buyer name) — pending CA sign-off on what residual fields are legally required vs PII-minimizable. The current invoice has GSTIN + buyer name; once the active window passes, can we redact those while keeping the row alive? CA call.
- **D-later collections** (payout / TDS / 16A records) — append to `MONEY_COLLECTIONS` when those collections land. The lock tests will then scan them automatically.

## Verification

- `pnpm test:unit -- --run src/lib/testing/__tests__/retention/` — both lock tests green.
- Manual review of `/api/auth/delete-account/+server.ts` — confirmed it only touches DsaApplications/Applicant + their deleted-* archives; never references any money collection. Locked by `accountDeletionPreservesMoney.test.ts`.
- TTL audit of all 7 money collections in `mongo.ts` — none has `expireAfterSeconds`. Locked by `moneyCollectionsTtlAbsence.test.ts`.
