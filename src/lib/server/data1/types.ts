/**
 * DATA-1 — Lead Attribution Vault types.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §3 (collection schema)
 *
 * All vault fields are PLAINTEXT non-PII bucketed values. The bucketing
 * (rounded price, area-name locality, quarter-only date) is itself the
 * privacy mechanism — see spec §11 for why no encryption. The k-anonymity
 * gate in the routing query (§9) is the enforcement layer.
 *
 * Anything stored here that COULD re-identify a customer (full address,
 * exact price, exact date, name, mobile, PAN) is a spec violation and a
 * privacy bug — see the CI test `vaultEntryShape.test.ts` (to land in
 * Slice 3) that asserts the write path goes through `bucketVaultEntry()`.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { ObjectId } from 'mongodb';

/**
 * One row in `LeadAttributionVault`. Created at case `sanctioned` transition
 * when the customer's signed consent document is on file. Unique on
 * `source_case_id` — duplicate writes are no-ops.
 */
export interface LeadAttributionVaultEntry {
	_id?: ObjectId;

	// ── Source provenance ─────────────────────────────────────────────
	/** Human-readable case ref ("HL-2026-0042"). Unique. */
	source_case_id: string;
	/** DsaApplications._id — the DSA who handled the case. Routing key. */
	source_dsa_id: ObjectId;
	/** "2026-Q1" form — quarter the case closed. No exact date stored. */
	closed_quarter: string;
	/** When this vault entry was written. */
	created_at: Date;

	// ── Loan classification ───────────────────────────────────────────
	/** "Home Loan" | "LAP" | "Plot Loan" | "Personal Loan" | "Business Loan" | "Professional Loan" */
	loan_type: string;
	/** Lender name — professional signal, not customer PII. May be null on multi-lender disagreement. */
	lender_selected: string | null;

	// ── Geography (bucketed, plaintext) ───────────────────────────────
	/** Tower/area or lane/locality (no flat numbers, no door numbers). See localityBucket(). */
	property_locality_bucket: string;
	/** 6-digit pincode. Already a 2–10 km² bucket in urban India — no further rounding. */
	property_pincode: string;

	// ── Financials (bucketed, plaintext) ──────────────────────────────
	/** Property price floored to ₹10,000. */
	property_price_bucket: number;
	/** Loan amount floored to ₹10,000. Secondary routing signal — not used in v1 query. */
	loan_amount_bucket: number;

	// ── Consent provenance ────────────────────────────────────────────
	/** doc_id of the signed data_usage_consent_v1 row in the case's document_checklist. */
	consent_ref: string;
}

/**
 * One candidate returned by the lead-routing query (§4). The caller hydrates
 * DSA display name + profile from `dsa_id` — the vault never carries names.
 */
export interface LeadRoutingCandidate {
	dsa_id: ObjectId;
	/** Which pass matched. Pass 1 (precise) > Pass 2 (fuzzy) > Pass 3 (last resort). */
	match_strength: 'pincode' | 'locality' | 'loan_type_only';
	/** Number of vault entries this DSA has in the matching cohort. */
	case_count_in_area: number;
	/** Most recent quarter the DSA closed a similar case. */
	most_recent_quarter: string;
	/** Average property price across matching entries (already bucketed). */
	avg_price_bucket: number;
	/** Up to 3 lender names — social proof. */
	top_lenders: string[];
}

/**
 * One row in `ConsentWithdrawalLog` — written when a DSA notifies the
 * platform of a customer's DPDP §13 erasure request and the corresponding
 * vault entry is removed. Preserves the audit trail that data existed and
 * was removed (analogous to DATA-3's ArtifactDeletionLog).
 */
export interface ConsentWithdrawalLogEntry {
	_id?: ObjectId;
	/** Case the consent originated from. */
	source_case_id: string;
	/** DSA who held the case (and uploaded the consent). */
	source_dsa_id: ObjectId;
	/** What was deleted: bucketed values at time of deletion, for compliance audit. */
	deleted_snapshot: {
		loan_type: string;
		property_pincode: string;
		property_locality_bucket: string;
		closed_quarter: string;
	};
	/** Why — free-form, typed by the operator handling the request. */
	reason: string;
	/** When the deletion landed. */
	withdrawn_at: Date;
	/** User who processed the withdrawal. */
	withdrawn_by: string;
}
