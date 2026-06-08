/**
 * D.2 — GST Invoice types
 * ══════════════════════════════════════════════════════════════════════
 * Every successful subscription charge generates one Invoice row. Refunds
 * (D.3) will issue credit notes against the original invoice — that's a
 * separate doc-shape, slotted for later.
 *
 * Pricing convention (locked 2026-05-28 — see ADR-0019): plan prices are
 * INCLUSIVE of GST. The DSA pays the price they see (₹3,999/mo for Pro);
 * the invoice back-computes the taxable value (price ÷ 1.18) and the tax
 * components. This keeps the Subscribe UI honest — no "+ GST" surprise.
 *
 * Tax split (Indian GST regime):
 *   - Buyer state == seller state → intra-state → CGST 9% + SGST 9%
 *   - Buyer state != seller state → inter-state → IGST 18%
 *   - Buyer state missing       → default to inter-state (safer; refund/
 *     correction path can fix later)
 *   - Buyer GSTIN missing       → B2C invoice (no buyer-side GSTIN line);
 *     tax split still applies based on state
 *
 * All money amounts are stored in PAISE (integer). The PDF renderer
 * converts to rupees at display time. Sum invariant: taxable + cgst +
 * sgst + igst == total. Rounding is handled in invoiceEngine so the
 * components always sum to the original total (rounding-with-adjustment).
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §D.2 +
 *       docs/adr/0019-pricing-inclusive-of-gst.md
 * ══════════════════════════════════════════════════════════════════════
 */

import type { ObjectId } from 'mongodb';
import type { PlanId } from '$lib/config/billing';

/**
 * Tax category for an invoice — drives the visible breakdown and which
 * fields carry non-zero values.
 *
 *   - 'intra_state' → CGST + SGST set; IGST is 0
 *   - 'inter_state' → IGST set; CGST + SGST are 0
 *   - 'b2c_no_gstin' → no buyer GSTIN line on the PDF; tax split still
 *     applies based on state (B2C is about WHO, not HOW MUCH)
 */
export type TaxKind = 'intra_state' | 'inter_state' | 'b2c_no_gstin';

export interface InvoiceDoc {
	_id?: ObjectId;
	/**
	 * Gapless sequential number per financial year. Format:
	 * "DDSA/2026-27/00001" — prefix is configurable but defaults to "DDSA".
	 * The numeric tail is zero-padded to 5 digits (supports up to 99,999
	 * invoices per FY; we'll cross that bridge if we ever come to it).
	 *
	 * Generated via atomic findOneAndUpdate on the InvoiceCounters
	 * collection — see invoiceEngine.generateInvoice. R10 of the D.1 spec:
	 * gapless numbering is a legal GST requirement; skips are catastrophic
	 * at audit time.
	 */
	invoice_number: string;
	/** Numeric sequence within the FY (1, 2, 3, ...) — for sorting + admin reports. */
	invoice_seq: number;
	/** Financial year string ("2026-27"). April 1 — March 31. */
	fy: string;

	/** Owning DSA (buyer). */
	dsa_id: ObjectId;
	/** The BillingTransaction this invoice settles. Unique — one invoice per txn. */
	billing_transaction_id: ObjectId;
	/** Optional links for traceability — set when applicable. */
	subscription_id?: ObjectId;
	attempt_id?: string;

	/**
	 * When this invoice was issued. Always AFTER the charge has settled at
	 * the provider (per spec R10). Drives the "issue_date" field on the PDF.
	 */
	issue_date: Date;

	// ── Money breakdown (all in paise; integer) ────────────────────
	/** Total amount the DSA was actually charged. Equals BillingTransaction.amount_paise. */
	total_paise: number;
	/** Taxable value = total ÷ 1.18 (inclusive pricing). */
	taxable_paise: number;
	/** Intra-state — Central GST 9%. Zero for inter-state. */
	cgst_paise: number;
	/** Intra-state — State GST 9%. Zero for inter-state. */
	sgst_paise: number;
	/** Inter-state — Integrated GST 18%. Zero for intra-state. */
	igst_paise: number;

	// ── GST identification ────────────────────────────────────────
	gstin_seller: string;
	/** Buyer's GSTIN if registered, else undefined (B2C). */
	gstin_buyer?: string;
	tax_kind: TaxKind;
	/** 2-letter state code of the seller — drives the intra/inter decision. */
	seller_state_code: string;
	/** 2-letter state code of the buyer — undefined when not known (defaults to inter). */
	buyer_state_code?: string;

	// ── Description / classification ──────────────────────────────
	/** GST HSN/SAC code. Default '998314' (SaaS / Information Technology Services). */
	hsn_sac: string;
	/** Plan name displayed on the PDF line item ("Pro"). */
	plan_id: PlanId;
	/** Human-readable line description ("Pro Plan — monthly subscription"). */
	description: string;
	/** Cycle the charge covers — start of the billing period. */
	cycle_start?: Date;
	/** Cycle end (inclusive of the day; usually +1 month from cycle_start). */
	cycle_end?: Date;

	// ── Cached seller info at issue time ───────────────────────────
	// Why cached: if you ever change your registered address / legal name,
	// historical invoices must STILL show what was on them at issue time
	// (legal requirement). Stamped from billingSellerInfo at generation.
	seller_legal_name: string;
	seller_address: string;

	// ── Audit / lifecycle ──────────────────────────────────────────
	created_at: Date;
	/** Set when a credit note has been issued against this invoice (D.3). */
	credit_noted_at?: Date;
	credit_note_id?: ObjectId;
}

/**
 * Atomic per-FY counter document. Lives in `InvoiceCounters` collection.
 * Single doc per financial year; the `_id` is the FY string.
 *
 *   _id: 'fy_2026-27'
 *   value: 42
 *
 * Increment via:
 *   await InvoiceCounters.findOneAndUpdate(
 *     { _id: 'fy_2026-27' },
 *     { $inc: { value: 1 } },
 *     { upsert: true, returnDocument: 'after' }
 *   )
 *
 * The atomic findOneAndUpdate + $inc + upsert pattern is the standard
 * MongoDB "gapless counter" — no two concurrent calls can return the same
 * value, even under E11000 race (the upsert side handles the first insert).
 */
export interface InvoiceCounterDoc {
	_id: string; // 'fy_2026-27' format
	value: number;
}
