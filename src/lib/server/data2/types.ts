/**
 * DATA-2 — Consented BT/DC Outreach Vault types.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md
 *
 * Vault stores DSA-private records of past customers who have signed
 * consent to be contacted for Balance Transfer, Direct Conversion, or
 * Top-up offers. Only `mobile` is encrypted (CSFLE deterministic, so
 * "have I vaulted this mobile" equality checks work); loan_profile fields
 * stay plain so the BT-eligibility query can run as a normal MongoDB filter.
 *
 * Privacy guarantees:
 *   - DSA-private: a vault entry is owned by exactly one DSA. No cross-DSA
 *     queries, no AD-04-style sharing.
 *   - Purpose-locked: entries may only be used for BT / DC / top-up
 *     outreach for the SAME customer. Anything else is a DPDP §7 violation.
 *   - Consent-gated: no entry exists without a stored, signed consent doc.
 *   - Revocable: customer can revoke via HMAC link in the case PDF; DSA
 *     can revoke via the API; both trigger immediate suppression + a
 *     90-day grace period before hard-delete.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { ObjectId } from 'mongodb';

/** Permitted loan_profile.loan_type values — matches the operational Case loan types. */
export type VaultLoanType =
	| 'Home Loan'
	| 'Loan Against Property'
	| 'Plot and Construction Loan'
	| 'Personal Loan'
	| 'Business Loan'
	| 'Professional Loan';

/** What state a vault entry is in. Drives suppression in eligibility queries. */
export type ConsentStatus = 'active' | 'revoked' | 'expired';

/** Who triggered a revocation — recorded for the audit trail. */
export type RevocationActor = 'customer_self' | 'dsa' | 'admin' | 'system_expiry';

/**
 * Reference to a stored consent document. The actual file lives in
 * ImageKit; the platform holds the file_id + URL + template-version metadata.
 */
export interface ConsentDocRef {
	/** ImageKit asset ID — opaque string, used to delete the file at hard-delete time. */
	imagekit_file_id: string;
	/** CDN URL — kept for DSA viewing. NOT exposed to customers (they revoke via the HMAC link, never see the doc URL). */
	imagekit_url: string;
	/** Template version — must match a known version in the platform's consent registry. */
	template_version: string;
	/** When the file was uploaded to ImageKit (separate from when the customer SIGNED it). */
	uploaded_at: Date;
}

/**
 * One row in the OutreachVault collection. See spec §4 for the field
 * narrative — the comments here are concise reminders, not the source
 * of truth for the encryption / retention policy.
 */
export interface OutreachVaultEntry {
	_id?: ObjectId;

	// ── Ownership ───────────────────────────────────────────────────
	/** Owning DSA. Every read query MUST filter by this. BOLA anchor. */
	dsa_id: ObjectId;
	/** Source case (e.g. "HL-2026-0042"). Reference only; the case is NOT deleted when the vault entry is revoked. */
	case_id: string;

	// ── Customer contact — encrypted ────────────────────────────────
	/**
	 * Customer mobile number. Stored via CSFLE deterministic encryption
	 * so "find existing entry for this mobile" works as an equality
	 * query. NEVER exposed in eligibility query results or bulk exports.
	 */
	mobile: string;

	// ── Loan profile — plaintext (non-PII, query-able) ──────────────
	/**
	 * The loan's commercial profile at sanctioned time. Used by the
	 * eligibility query to decide whether a customer is a BT candidate
	 * (e.g. their stored ROI is 0.5%+ above current market). NOT PII on
	 * its own — kept plain so the query is a direct MongoDB filter.
	 */
	loan_profile: {
		loan_type: VaultLoanType;
		lender_id: string;
		lender_name: string;
		sanctioned_amount: number;
		sanctioned_roi: number;
		tenure_months: number;
		disbursement_date?: Date;
	};

	// ── Consent audit trail ─────────────────────────────────────────
	consent_doc_ref: ConsentDocRef;
	/** Date the customer SIGNED the document. Must be ≤ today and ≤ 90 days old at save time. */
	consent_signed_at: Date;
	/** Optional — if the consent template fixes a validity period. Null = consent valid until revoked. */
	consent_expiry?: Date;
	/**
	 * HMAC token embedded in the case PDF footer. Customer clicks the
	 * link in the PDF → public endpoint verifies the token → revocation
	 * proceeds without auth. Generated at vault entry creation.
	 */
	revocation_token: string;

	// ── Consent state ───────────────────────────────────────────────
	consent_status: ConsentStatus;
	revoked_at?: Date;
	revoked_by?: RevocationActor;
	/** Free-text revocation reason (e.g. customer complaint reference). */
	revocation_notes?: string;
	/** Set at revoke time: revoked_at + 90 days. Sweep cron hard-deletes after this. */
	grace_period_ends_at?: Date;

	// ── Lifecycle ───────────────────────────────────────────────────
	created_at: Date;
	updated_at: Date;
}

/**
 * Audit row written when a vault entry's grace period ends and the
 * document is hard-deleted. Analogous to DATA-3's ArtifactDeletionLog.
 *
 * Carries NO PII — just the fact that an entry existed and was destroyed.
 * Kept indefinitely (proposed 7-year cap via TTL — see §C-2 open question
 * in PII-RETENTION-POLICY-SPEC).
 */
export interface ConsentRevocationLogEntry {
	_id?: ObjectId;
	vault_entry_id: ObjectId;
	dsa_id: ObjectId;
	case_id: string;
	consent_template_version: string;
	consent_signed_at: Date;
	revoked_at: Date;
	revoked_by: RevocationActor;
	grace_period_ends_at: Date;
	/** Set when the Mongo doc + ImageKit asset are gone. */
	hard_deleted_at: Date;
	imagekit_deletion_status: 'success' | 'failed' | 'already_gone';
	/** Who/what actually performed the hard-delete. Usually the sweep cron. */
	actor: 'system_sweep' | 'admin' | 'cron';
	created_at: Date;
}

/**
 * Result of validating a save payload against the C1–C4 consent gates.
 * Returned by `validateConsentGates()` — the API uses the failed gate
 * list to give the DSA a structured 400 response.
 */
export interface ConsentGateResult {
	valid: boolean;
	/** Gate identifiers that failed: 'C1' (doc present) | 'C2' (template version) | 'C3' (signed date) | 'C4' (template-level, rarely fails). */
	failed_gates: string[];
	/** Human-readable reasons paired with each failed gate. Useful for the DSA-facing error UI. */
	reasons: Record<string, string>;
}
