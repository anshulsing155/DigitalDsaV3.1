// Case Management Types
import type { ObjectId } from 'mongodb';

// ============================================================================
// CASE STAGE & STATUS TYPES
// ============================================================================

/**
 * Case stages — ordered roughly by the natural lifecycle.
 *
 * `quota_blocked` is a SPECIAL pre-intake stage: the DSA submitted but was
 * over their monthly plan limit, so the case is parked in their save buffer
 * (per-plan saveBuffer config). FormSnapshot is persisted, but no
 * LenderResultsSnapshot is computed (no compute burn). Auto-transitions to
 * `intake` (FIFO) when the DSA upgrades OR their monthly cycle resets.
 * See docs/specs/QUOTA-BLOCKED-CASES-SPEC.md.
 *
 * Code that ENUMERATES cases for normal operations (file builder, lender
 * sharing, results display) MUST filter out `quota_blocked` — those cases
 * have no LenderResultsSnapshot to read. The dashboard listing INCLUDES
 * them with a distinct "Awaiting processing" badge.
 */
export type CaseStage =
	| 'quota_blocked'
	| 'intake'
	| 'profiling'
	| 'file_building'
	| 'submitted'
	| 'processing'
	| 'query'
	| 'sanctioned'
	| 'disbursed'
	| 'rejected'
	| 'dropped'
	| 'closed';

export type LenderAppStatus =
	| 'selected'
	| 'file_building'
	| 'ready'
	| 'submitted'
	| 'processing'
	| 'query'
	| 'query_responded'
	| 'sanctioned'
	| 'disbursed'
	| 'rejected'
	| 'withdrawn';

// ============================================================================
// TRANSITION TYPES
// ============================================================================

export interface StageTransition {
	from: CaseStage;
	to: CaseStage;
	timestamp: Date;
	notes?: string;
	/**
	 * F.4 — captured on the to='dropped' transition only. Powers the
	 * CRM Win/Loss report. Immutable per AD-02 (snapshots never deleted),
	 * so re-opening a dropped case preserves the historical reason.
	 */
	drop_reason?: DropReason;
	drop_reason_note?: string;
}

/**
 * F.4 — structured drop reasons. Enum (not free text) so the CRM
 * Win/Loss report can aggregate. 'other' carries free text in
 * drop_reason_note.
 */
export type DropReason =
	| 'applicant_dropped' // Applicant went silent / changed mind
	| 'lender_rejected' // All viable lenders rejected
	| 'competitor_won' // Lost to another DSA / direct
	| 'qualification_failed' // Didn't qualify on income / credit / property
	| 'other'; // Free text required in drop_reason_note

export const DROP_REASONS: readonly DropReason[] = [
	'applicant_dropped',
	'lender_rejected',
	'competitor_won',
	'qualification_failed',
	'other'
] as const;

/** UI labels for the drop-reason dialog. */
export const DROP_REASON_LABELS: Record<DropReason, string> = {
	applicant_dropped: 'Applicant changed their mind / went silent',
	lender_rejected: 'Lender rejected',
	competitor_won: 'Lost to a competitor (another DSA / direct)',
	qualification_failed: "Didn't qualify",
	other: 'Other'
};

export interface StatusTransition {
	from: LenderAppStatus;
	to: LenderAppStatus;
	timestamp: Date;
	notes?: string;
}

// ============================================================================
// DOCUMENT & QUERY TYPES
// ============================================================================

export interface DocumentChecklistItem {
	doc_id: string;
	doc_name: string;
	category: 'identity' | 'income' | 'property' | 'lender_specific' | 'other';
	is_mandatory: boolean;
	description?: string;
	status: 'not_started' | 'requested' | 'received' | 'uploaded' | 'not_applicable';
	status_updated_at?: Date;
	upload?: {
		file_url: string;
		file_id: string;
		file_type: string;
		file_size: number;
		uploaded_at: Date;
	};
	validity?: {
		valid_from?: Date;
		valid_until?: Date;
		is_fresh: boolean;
		freshness_rule_days: number;
	};
	dsa_notes?: string;

	// ── DATA-3: extraction + deletion lifecycle ─────────────────────────
	// Drives the file-deletion-after-extraction state machine. See
	// `src/lib/server/data3/types.ts` and docs/specs/DATA-3-FILE-DELETION-SPEC.md.
	// All fields are optional — existing rows (pre-DATA-3) carry no
	// extraction status and are treated as `uploaded` until extraction lands.
	extraction_status?:
		| 'uploaded'
		| 'extracting'
		| 'extracted'
		| 'partial'
		| 'failed'
		| 'verified'
		| 'retained_indefinite'
		| 'deletion_pending'
		| 'deletion_in_flight'
		| 'deleted'
		| 'deletion_failed'
		| 'deletion_abandoned';

	extracted_fields?: {
		/** LLM-lifted structured fields. Shape varies by document type. */
		fields: Record<string, unknown>;
		/** Floor confidence across required fields (0..1). */
		confidence: number;
		extracted_at: Date;
		/** e.g. 'gemini-2.5-flash@2026-05-16' */
		extractor_version: string;
	};

	/** Set when DSA explicitly accepts the extraction OR the 14-day auto-verify floor elapses. */
	verified_at?: Date;

	/** Set when extraction_status transitions to 'deleted' — the audit row carries the rest. */
	deleted_at?: Date;
}

export interface LenderQuery {
	query_id: string;
	query_text: string;
	category: 'document' | 'clarification' | 'additional_info' | 'technical' | 'legal' | 'other';
	raised_at: Date;
	deadline?: Date;
	response?: {
		text: string;
		attachments?: string[];
		responded_at: Date;
	};
	status: 'open' | 'responded' | 'resolved';
	days_open: number;
}

// ============================================================================
// FILE CONFIG & SNAPSHOT TYPES
// ============================================================================

export interface FileConfig {
	source_payload_hash: string;
	source_snapshot_version: number;
	sections_visibility: Record<string, boolean>;
	display_mode: {
		income: 'consolidated' | 'detailed';
		obligations: 'consolidated' | 'detailed';
		applicants: 'consolidated' | 'individual';
	};
	dsa_notes: Record<string, string>;
	section_order: string[];
	pii_mode: 'stripped' | 'included';
	updated_at: Date;
}

export interface FileSnapshot {
	snapshot_id: string;
	type: 'review' | 'submission';
	file_url?: string;
	generated_at: Date;
	config_used: FileConfig;
}

// ============================================================================
// LENDER APPLICATION TYPE
// ============================================================================

export interface LenderApplication {
	lender_application_id: string;
	lender_id: string;
	lender_name: string;
	status: LenderAppStatus;
	status_history: StatusTransition[];
	lender_tracking?: {
		login_number?: string;
		login_date?: Date;
		technical_status?: 'pending' | 'ordered' | 'received' | 'positive' | 'negative';
		legal_status?: 'pending' | 'ordered' | 'received' | 'clear' | 'not_clear';
		credit_approval?: 'pending' | 'approved' | 'rejected' | 'conditional';
		conditions?: string[];
	};
	sanction?: {
		amount?: number;
		roi?: number;
		tenure_months?: number;
		sanction_date?: Date;
		sanction_letter_ref?: string;
		conditions?: string[];
	};
	disbursement?: {
		total_amount?: number;
		tranches?: Array<{
			tranche_number: number;
			amount: number;
			date: Date;
			reference?: string;
		}>;
	};
	rejection?: {
		reason_category?: string;
		reason_detail?: string;
		rejection_date?: Date;
		reroute_suggestions?: string[];
	};
	eligibility_snapshot?: {
		traffic_light: 'green' | 'amber' | 'red' | 'grey';
		message: string;
		computed_at: Date;
		offered_amount?: number;
		roi?: number;
		emi?: number;
		approval_probability?: number;
		foir?: number;
		ltv?: number;
	};
	document_checklist: DocumentChecklistItem[];
	queries: LenderQuery[];
	rm_contact_id?: ObjectId;
	file_config?: FileConfig;
	file_snapshots: FileSnapshot[];
	offer_details?: Record<string, any>;
	payout_info?: Record<string, any>;
	created_at: Date;
	updated_at: Date;
}

// ============================================================================
// MAIN CASE TYPE
// ============================================================================

export interface Case {
	_id?: ObjectId;
	case_id: string; // Auto: {PREFIX}-{YEAR}-{SEQ} e.g. HL-2026-0042
	dsa_id: ObjectId;
	label: string; // DSA's private reference (auto-generated name+city+type; B.1)
	/** True once a DSA manually edits the label — auto-regeneration must skip it (B.1). */
	label_is_custom?: boolean;
	loan: {
		type: string; // Home Loan, LAP, Personal Loan, etc.
		amount_required?: number;
		tenure_years?: number;
		purpose?: string;
	};
	stage: CaseStage;
	stage_history: StageTransition[];
	form_submission_id?: ObjectId;
	form_snapshot_version?: number;
	form_snapshot_hash?: string;
	results_snapshot_version?: number;
	results_snapshot_hash?: string;
	/**
	 * QBC — set when a quota_blocked case auto-transitions to 'intake' via
	 * `processBlockedCasesAfter` (upgrade or cycle reset). Audit marker
	 * answering "when was this case auto-unblocked?". Originally drove a
	 * 5-min cron pull for offer computation; that mechanism was retired
	 * 2026-05-30 in favor of INLINE eval inside processBlockedCasesAfter
	 * (the cron was over-architected for a ≤5-case-per-DSA workload).
	 * The field stays as an audit marker — useful for dashboard "saved on X"
	 * surfaces and for diagnosing cases that lack offers (failed inline eval).
	 */
	unblocked_at?: Date;
	/** Per-lender selection states (mutable, persists across re-evaluations) */
	lender_selections?: import('./lenderResultsSnapshot.js').LenderSelection[];
	lender_applications: LenderApplication[];
	primary_lender_id?: string;
	optional_contact?: {
		full_name?: string;
		mobile?: string;
		email?: string;
	};
	source?: {
		type?: 'walk-in' | 'builder' | 'ca' | 'referral' | 'online' | 'broker' | 'self';
		label?: string;
		source_contact_id?: string;
	};
	notes?: string;
	/**
	 * Assessment mode — 'manual' (DSA enters data) or 'doc_upload' (DSA uploads
	 * documents and the system parses + locks identity). Doc-upload mode is the
	 * only mode that participates in the case-lock + DA-quota billing flow.
	 * See: src/lib/server/caseLock/
	 */
	assessment_mode?: 'manual' | 'doc_upload';
	/**
	 * Doc-upload lock state. Present only when assessment_mode === 'doc_upload'
	 * and the case has been locked at least once. Null when never locked.
	 * Mutated via caseLock/operations.ts (lockCase, unlockAndRelockCase).
	 */
	lock?: import('../server/caseLock/types.js').CaseLockState | null;
	created_at: Date;
	updated_at: Date;
	is_archived: boolean;
	is_sample: boolean;
	/**
	 * F.4 — captured the most recent time this case moved to 'dropped'.
	 * Mirrors the value in stage_history's drop transition for fast
	 * aggregation in the CRM Win/Loss report (no $unwind required).
	 * Set on the drop transition; cleared if the case re-opens.
	 */
	drop_reason?: DropReason;
	drop_reason_note?: string;
	/**
	 * Client-generated UUID stamped onto the case at phase-1 creation time.
	 * Lets the server dedupe duplicate inserts caused by the silent auto-
	 * retry in /evaluating's handleFreshSubmission — if the first call's
	 * function actually completed (case inserted) but the gateway 504'd
	 * back to the client, the retry would otherwise create a second case
	 * with the same form data. Same idempotency_key from the client →
	 * server returns the already-created case instead.
	 *
	 * Window: 10 minutes from created_at. After that, the same key from
	 * the same DSA is treated as a fresh submission (effectively no
	 * dedupe on stale retries).
	 *
	 * Only set on new submissions (phase-1 create); never on edits.
	 */
	idempotency_key?: string;
}
