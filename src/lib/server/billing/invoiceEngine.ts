/**
 * D.2 — Invoice generation engine
 * ══════════════════════════════════════════════════════════════════════
 * Generates one GST invoice per successful BillingTransaction. Called
 * from `chargeEngine.handleSuccess` after the BillingTransaction has
 * been persisted (per spec R10 — invoices issued AFTER charge succeeds).
 *
 * Three things this module does:
 *
 *   1. Atomic gapless counter — `getNextInvoiceSeq(fy)` increments the
 *      InvoiceCounters doc for the financial year and returns the new
 *      value. Concurrent calls get strictly-increasing values, no skips.
 *
 *   2. Tax computation — `computeInvoiceMoney(total_paise, taxKind)`
 *      back-computes the taxable value from a GST-inclusive total
 *      (₹3,999 → ₹3,389 taxable + ₹610 IGST, or split as CGST+SGST).
 *      Rounding-with-adjustment guarantees components always sum to
 *      total (one paisa drift on a back-calc is the bug we avoid).
 *
 *   3. Persistence — assembles the InvoiceDoc, inserts into Invoices.
 *      Idempotent on `billing_transaction_id` (unique index): a
 *      concurrent second call gets E11000, caught + treated as success.
 *
 * Skipped on:
 *   - `is_test_auth: true` rows (₹1 verification debits + their refunds —
 *     not revenue, not invoiceable)
 *   - failed/refunded transactions (engine should not be called on these)
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §D.2 +
 *       docs/specs/D-1-RECURRING-BILLING-SPEC.md R10 (gapless numbering) +
 *       docs/adr/0019-pricing-inclusive-of-gst.md
 * ══════════════════════════════════════════════════════════════════════
 */

import { ObjectId } from 'mongodb';
import { Invoices, InvoiceCounters, DsaApplications } from '$lib/database/mongo';
import {
	getBillingSellerInfo,
	HSN_SAC_SAAS,
	INVOICE_NUMBER_PREFIX
} from '$lib/config/billingSellerInfo';
import { PLANS, type PlanId } from '$lib/config/billing';
import type { InvoiceDoc, TaxKind } from '$lib/types/invoice';
import { writeBillingAuditLog } from './billingAuditLog';
import logger from '$lib/server/logger';

// ── FY calculation ────────────────────────────────────────────────────

/**
 * Indian financial year for a given date.
 *
 * FY runs April 1 → March 31. So:
 *   - 2026-04-01 → '2026-27'
 *   - 2027-01-15 → '2026-27'
 *   - 2027-03-31 → '2026-27'
 *   - 2027-04-01 → '2027-28'
 *
 * Always computed in IST because that's the legal jurisdiction. A charge
 * at 11:30 PM IST on March 31 must invoice into the OLD FY, not the new
 * one — UTC math would put it in April.
 */
export function fyForDate(d: Date): string {
	// Convert to IST by adding +5:30 to the UTC components, then read calendar.
	const istOffset = 5.5 * 60 * 60 * 1000;
	const ist = new Date(d.getTime() + istOffset);
	const year = ist.getUTCFullYear();
	const month = ist.getUTCMonth() + 1; // 1-12

	// April-December → FY starts THIS year. Jan-March → FY started LAST year.
	const fyStart = month >= 4 ? year : year - 1;
	const fyEnd = fyStart + 1;

	// Format as 'YYYY-YY' (e.g. '2026-27')
	return `${fyStart}-${String(fyEnd).slice(-2)}`;
}

/** Counter doc _id for a given FY. */
function counterIdForFy(fy: string): string {
	return `fy_${fy}`;
}

// ── Counter (atomic gapless sequence) ─────────────────────────────────

/**
 * Atomically increment + return the next invoice sequence number for the
 * given FY. Idempotency: two concurrent calls cannot return the same
 * value (MongoDB's $inc + findOneAndUpdate is atomic).
 *
 * Upsert: if no counter doc exists for this FY, one is created starting
 * at value=1 (the FIRST call after a new FY begins gets 1). The upsert
 * race is handled by MongoDB internally — both concurrent first-callers
 * still get distinct values (one creates with 1, the other increments to 2).
 *
 * @returns the new counter value (1, 2, 3, ...) — never 0
 */
export async function getNextInvoiceSeq(fy: string): Promise<number> {
	const result = await InvoiceCounters.findOneAndUpdate(
		{ _id: counterIdForFy(fy) },
		{ $inc: { value: 1 } },
		{ upsert: true, returnDocument: 'after' }
	);
	if (!result || typeof result.value !== 'number') {
		throw new Error(`getNextInvoiceSeq(${fy}): counter findOneAndUpdate returned no doc`);
	}
	return result.value;
}

/**
 * Format a numeric sequence into the canonical invoice-number string.
 *   formatInvoiceNumber('2026-27', 42) → 'DDSA/2026-27/00042'
 *
 * Zero-padded to 5 digits — supports up to 99,999 invoices/FY without
 * collision. Beyond that we'd want a different format; cross that bridge
 * if we ever come to it.
 */
export function formatInvoiceNumber(fy: string, seq: number): string {
	const padded = String(seq).padStart(5, '0');
	return `${INVOICE_NUMBER_PREFIX}/${fy}/${padded}`;
}

// ── Tax computation ────────────────────────────────────────────────────

/**
 * GST inclusive total → taxable + tax components, all in paise.
 *
 * Inclusive math:
 *   taxable = round(total / 1.18)
 *   tax     = total - taxable          ← adjustment ensures sum invariant
 *
 *   For intra_state: cgst = round(tax / 2); sgst = tax - cgst
 *   For inter_state: igst = tax
 *
 * Why we don't use the obvious `taxable * 0.09` for CGST — rounding twice
 * (once for taxable, once for each tax component) can leave a 1-paise
 * drift between taxable + cgst + sgst and the original total. Computing
 * tax = total - taxable then splitting it preserves the invariant.
 *
 * For ₹3,999 total (399900 paise):
 *   - taxable = round(399900 / 1.18) = round(338898.305...) = 338898
 *   - tax     = 399900 - 338898 = 61002
 *   - intra:  cgst = round(61002 / 2) = 30501; sgst = 61002 - 30501 = 30501; sum 399900 ✓
 *   - inter:  igst = 61002; sum 399900 ✓
 *
 * Exported separately from generateInvoice() so the unit tests can lock
 * the rounding behavior in isolation.
 */
export interface InvoiceMoney {
	taxable_paise: number;
	cgst_paise: number;
	sgst_paise: number;
	igst_paise: number;
	total_paise: number;
}

export function computeInvoiceMoney(total_paise: number, taxKind: TaxKind): InvoiceMoney {
	// Indian standard GST rate for SaaS is 18%. Multiplier for inclusive
	// back-calc is 1.18; if the rate ever changes (NEVER easily), update here.
	const GST_RATE = 0.18;
	const taxable = Math.round(total_paise / (1 + GST_RATE));
	const tax = total_paise - taxable;

	let cgst = 0;
	let sgst = 0;
	let igst = 0;

	// B2C uses the same tax math as intra/inter (it's about WHO not HOW),
	// but for our system we treat 'b2c_no_gstin' as effectively b2c-inter
	// (IGST split) because the buyer's state is most often unknown for
	// B2C (no GSTIN → no state-of-supply line). The PDF strips the buyer
	// GSTIN row in this case but the tax breakdown stays.
	if (taxKind === 'intra_state') {
		cgst = Math.round(tax / 2);
		sgst = tax - cgst; // adjustment: ensures cgst + sgst == tax
	} else {
		// inter_state OR b2c_no_gstin
		igst = tax;
	}

	return {
		taxable_paise: taxable,
		cgst_paise: cgst,
		sgst_paise: sgst,
		igst_paise: igst,
		total_paise: total_paise
	};
}

// ── Tax-kind resolution ────────────────────────────────────────────────

/**
 * Decide the tax category for a charge given the buyer's GSTIN/state and
 * the seller's state. Inputs are case-insensitive; output is the
 * three-state TaxKind union.
 *
 *   buyer GSTIN missing                            → 'b2c_no_gstin'
 *   buyer state present AND == seller state         → 'intra_state'
 *   otherwise (state differs OR buyer state missing) → 'inter_state'
 *
 * The "missing buyer state default to inter" is a safer choice for the
 * seller — IGST is uniformly 18% so we don't under-charge the GST liability.
 * If the buyer later supplies a state and it turns out to be intra, the
 * correction is a credit-note + reissue (D.3 handles this).
 */
export function resolveTaxKind(
	buyerGstin: string | undefined,
	buyerState: string | undefined,
	sellerState: string
): TaxKind {
	if (!buyerGstin) return 'b2c_no_gstin';
	if (!buyerState) return 'inter_state';
	const buyer = buyerState.trim().toUpperCase();
	const seller = sellerState.trim().toUpperCase();
	return buyer === seller ? 'intra_state' : 'inter_state';
}

// ── Generation (main entry) ────────────────────────────────────────────

export interface GenerateInvoiceInput {
	billing_transaction_id: ObjectId;
	dsa_id: ObjectId;
	subscription_id?: ObjectId;
	attempt_id?: string;
	plan_id: PlanId;
	/** The actual amount charged (in paise). MUST equal BillingTransaction.amount_paise. */
	amount_paise: number;
	/** Cycle start — used for the line description on the PDF. */
	cycle_start?: Date;
	/** Cycle end — same. */
	cycle_end?: Date;
	/** Override issue_date for testing / backdating; defaults to now. */
	issue_date?: Date;
}

export interface GenerateInvoiceResult {
	ok: true;
	invoice: InvoiceDoc;
}

/**
 * Generate the invoice for one successful charge. Reads the DSA's state +
 * GSTIN from DsaApplications, computes the tax split, atomically gets the
 * next FY sequence number, inserts the InvoiceDoc, writes an audit row.
 *
 * Idempotent: if an invoice for this billing_transaction_id already
 * exists (concurrent webhook + cron race, e.g.), the unique index trips
 * E11000 → we look up + return the existing invoice instead of throwing.
 *
 * Errors propagate to the caller — chargeEngine treats invoice generation
 * as best-effort (failures log loudly + reconcile cron flags drift) so
 * the underlying charge isn't rolled back if invoice generation hits a
 * transient DB issue.
 */
export async function generateInvoice(
	input: GenerateInvoiceInput
): Promise<GenerateInvoiceResult> {
	// Look up buyer details (state, GSTIN, legal name for line item).
	const dsa = await DsaApplications.findOne(
		{ _id: input.dsa_id },
		{ projection: { name: 1, gstNumber: 1, workingCity: 1, state: 1 } }
	);
	if (!dsa) {
		throw new Error(
			`generateInvoice: DsaApplications doc not found for dsa_id=${input.dsa_id.toString()}`
		);
	}

	const seller = getBillingSellerInfo();
	const buyerGstin = dsa.gstNumber?.trim().toUpperCase() || undefined;
	// DsaApplications has both `state` (legacy field) and `workingCity` —
	// neither directly stores state CODE; we treat the value as a state
	// NAME for matching. resolveTaxKind compares case-insensitively.
	// TODO future: introduce a normalized state_code field on DsaApplications.
	const buyerStateRaw = (dsa.state as string | undefined) || undefined;
	const taxKind = resolveTaxKind(buyerGstin, buyerStateRaw, seller.state_code);

	const money = computeInvoiceMoney(input.amount_paise, taxKind);

	const issue_date = input.issue_date ?? new Date();
	const fy = fyForDate(issue_date);

	// Atomic gapless counter — guaranteed unique seq within this FY.
	const seq = await getNextInvoiceSeq(fy);
	const invoice_number = formatInvoiceNumber(fy, seq);

	const planName = PLANS[input.plan_id].name;
	const description = input.cycle_start
		? `${planName} Plan — monthly subscription (${input.cycle_start.toISOString().slice(0, 10)} to ${
				input.cycle_end ? input.cycle_end.toISOString().slice(0, 10) : 'next cycle'
			})`
		: `${planName} Plan — monthly subscription`;

	const doc: InvoiceDoc = {
		invoice_number,
		invoice_seq: seq,
		fy,
		dsa_id: input.dsa_id,
		billing_transaction_id: input.billing_transaction_id,
		...(input.subscription_id && { subscription_id: input.subscription_id }),
		...(input.attempt_id && { attempt_id: input.attempt_id }),
		issue_date,
		total_paise: money.total_paise,
		taxable_paise: money.taxable_paise,
		cgst_paise: money.cgst_paise,
		sgst_paise: money.sgst_paise,
		igst_paise: money.igst_paise,
		gstin_seller: seller.gstin,
		...(buyerGstin && { gstin_buyer: buyerGstin }),
		tax_kind: taxKind,
		seller_state_code: seller.state_code,
		...(buyerStateRaw && { buyer_state_code: buyerStateRaw }),
		hsn_sac: HSN_SAC_SAAS,
		plan_id: input.plan_id,
		description,
		...(input.cycle_start && { cycle_start: input.cycle_start }),
		...(input.cycle_end && { cycle_end: input.cycle_end }),
		seller_legal_name: seller.legal_name,
		seller_address: seller.address,
		created_at: new Date()
	};

	try {
		const insertResult = await Invoices.insertOne(doc);
		doc._id = insertResult.insertedId;
	} catch (err) {
		const e = err as { code?: number };
		if (e.code === 11000) {
			// Race: another concurrent call already inserted for this txn.
			// Return the existing row instead of throwing — the caller's
			// idempotency contract is preserved.
			const existing = await Invoices.findOne({
				billing_transaction_id: input.billing_transaction_id
			});
			if (existing) {
				logger.info(
					{
						billing_transaction_id: input.billing_transaction_id.toString(),
						existing_invoice_number: existing.invoice_number
					},
					'generateInvoice: E11000 on insert — returning existing invoice (race won by another caller)'
				);
				return { ok: true, invoice: existing };
			}
		}
		throw err;
	}

	// Audit log — money-retention path (6yr per §11 Q1). Caller does NOT
	// receive a failure if audit-log write fails; that's a non-blocking
	// observability concern.
	try {
		await writeBillingAuditLog({
			event_class: 'admin_action', // closest existing class — TODO add 'invoice_issued' to the enum
			event_name: 'invoice.issued',
			dsa_id: input.dsa_id,
			actor: 'system',
			payload: {
				invoice_number,
				billing_transaction_id: input.billing_transaction_id.toString(),
				total_paise: money.total_paise,
				taxable_paise: money.taxable_paise,
				tax_kind: taxKind,
				fy,
				seq
			}
		});
	} catch (err) {
		logger.error(
			{ invoice_number, err: (err as Error).message },
			'generateInvoice: audit log write failed (non-fatal — invoice doc is the source of truth)'
		);
	}

	return { ok: true, invoice: doc };
}
