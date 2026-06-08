/**
 * E.4 — Money-record retention policy
 * ══════════════════════════════════════════════════════════════════════
 * Declares the 6-year statutory retention for financial records as
 * code-as-policy. The point isn't to BUILD a 6-year sweep (that's a
 * future cron — see "Deferred" below); the point is to PREVENT early
 * deletion. Two mechanisms enforce this:
 *
 *   1. No money collection carries a short TTL index. Locked by
 *      `moneyCollectionsTtlAbsence.test.ts` — fails CI if any future
 *      `createIndex({...}, {expireAfterSeconds: <less than 6yr>})` lands
 *      on a money collection.
 *
 *   2. Account-deletion flows (DSA / RM / admin self-delete) MUST NOT
 *      delete from any money collection. The user document gets archived
 *      to deletedDsa/deletedRm with 30-day TTL; money records stay put.
 *      Locked by `accountDeletionPreservesMoney.test.ts` — fails CI if
 *      any account-deletion handler calls deleteOne/deleteMany on a
 *      money collection.
 *
 * Statutory basis (India):
 *   • Income Tax Act, Section 44AA(3) + Rule 6F(5) — books of account
 *     and supporting documents retained for 6 financial years from the
 *     end of the relevant AY (~6 years actual).
 *   • CGST Act, Section 36 — retain accounts + records for 6 years from
 *     the due date of the annual return.
 *
 * The 6-year window starts at the END of the financial year of the
 * transaction (NOT the transaction date). India's FY runs April 1 →
 * March 31, so a transaction on 15 May 2026 has its retention clock
 * start on 31 March 2027 and expire on 31 March 2033.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §E.4
 * ADR:  docs/adr/0023-money-retention-6-years.md
 *
 * Deferred to follow-up:
 *   • The 6-year-expired sweep cron itself (no rows are old enough yet
 *     — system started writing billing in 2026, earliest expiry is 2033).
 *   • Post-window minimization of GSTIN / buyer name on Invoices —
 *     pending CA sign-off on what residual fields are legally required
 *     vs PII-minimizable after the active window.
 */

/**
 * Years of retention. Owner-locked at the Income Tax Act default;
 * CA can flex this via a single-line code change + ADR amendment if
 * their interpretation differs.
 */
export const MONEY_RETENTION_YEARS = 6;

/**
 * MongoDB collection names that hold money records. Updating this list
 * is the contract for "what counts as a money record". Both lock tests
 * read this constant — adding a new financial collection in the future
 * means adding its name here AND the structural protections kick in
 * automatically.
 *
 * NOTE: names match the runtime collection strings in src/lib/database/
 * mongo.ts, NOT the exported variable names (which are PascalCase).
 * The lock tests scan source for the variable-name usage forms.
 */
export const MONEY_COLLECTIONS = [
	// D.1 — Recurring billing core
	'billingTransactions',
	'billingSubscriptions',
	'chargeAttempts',
	'billingAuditLogs',
	// D.2 — GST invoicing
	'invoices',
	'invoiceCounters',
	// D.1 S7 — Reconciliation
	'reconciliationRuns'
	// D-later additions (payout/TDS/16A) — append when those collections land.
] as const;

/**
 * Intentionally NOT in MONEY_COLLECTIONS, with rationale:
 *
 *   • processedWebhookEvents — operational idempotency cache, not a
 *     financial record. Stores only {provider_event_id, processed_at}
 *     for dedup; the actual money state lives in BillingTransactions /
 *     ChargeAttempts. Its 18-month TTL (D.1 spec §6 critique P3-3) is
 *     intentional and operationally correct for DR replay windows.
 *   • cronLocks — operational concurrency lock; ~5-minute TTL.
 *   • billingDunningEmailLogs / dunning state on BillingSubscriptions —
 *     not separate collections; embedded in BillingSubscriptions which
 *     IS retained.
 *
 * If a future ADR decides any of these IS a money record, move it into
 * MONEY_COLLECTIONS (and MONEY_COLLECTION_VAR_NAMES) and the TTL-absence
 * lock will immediately flag the existing short TTL.
 */

export type MoneyCollectionName = (typeof MONEY_COLLECTIONS)[number];

/**
 * Variable names (exported from mongo.ts) that the lock tests scan for.
 * Kept in lockstep with MONEY_COLLECTIONS via paired ordering — index
 * N here = index N above. The TTL-absence lock walks every Collection
 * variable here and asserts no expireAfterSeconds appears on its
 * createIndex calls.
 */
export const MONEY_COLLECTION_VAR_NAMES = [
	'BillingTransactions',
	'BillingSubscriptions',
	'ChargeAttempts',
	'BillingAuditLogs',
	'Invoices',
	'InvoiceCounters',
	'ReconciliationRuns'
] as const;

export type MoneyCollectionVarName = (typeof MONEY_COLLECTION_VAR_NAMES)[number];

/**
 * Compute the earliest legal deletion date for a transaction whose
 * "financial year end" is `fyEndDate`. India's FY ends 31 March of
 * each year — callers should pass the 31 March that follows the
 * transaction date.
 *
 *   getMoneyRetentionExpiry(new Date('2026-03-31'))  →  2032-03-31
 *
 * The future 6-year sweep cron will compare each row's anchor date
 * against `now > retentionExpiry` to decide what to purge.
 */
export function getMoneyRetentionExpiry(fyEndDate: Date): Date {
	const d = new Date(fyEndDate);
	d.setUTCFullYear(d.getUTCFullYear() + MONEY_RETENTION_YEARS);
	return d;
}

/**
 * Given an arbitrary transaction date, return the FY-end UTC date that
 * starts its retention clock. India FY is 1 April → 31 March: a Jan
 * transaction belongs to the FY ending in the SAME calendar year; an
 * April-onwards transaction belongs to the FY ending NEXT calendar year.
 *
 *   fyEndForDate(new Date('2026-05-15'))  →  2027-03-31
 *   fyEndForDate(new Date('2027-01-10'))  →  2027-03-31
 */
export function fyEndForDate(txDate: Date): Date {
	const year = txDate.getUTCFullYear();
	const month = txDate.getUTCMonth(); // 0-indexed: 0=Jan, 2=Mar, 3=Apr
	// Months Jan–Mar (0,1,2) belong to FY ending 31 Mar of the SAME year.
	// Months Apr–Dec (3..11) belong to FY ending 31 Mar of the NEXT year.
	const fyEndYear = month <= 2 ? year : year + 1;
	return new Date(Date.UTC(fyEndYear, 2, 31)); // March = month index 2
}

/**
 * Convenience composite: compute the retention-expiry date from any
 * transaction date in one call. Sweep cron uses this against each row's
 * created_at / issue_date / charged_at to decide what's expired.
 */
export function getRetentionExpiryFromTxDate(txDate: Date): Date {
	return getMoneyRetentionExpiry(fyEndForDate(txDate));
}
