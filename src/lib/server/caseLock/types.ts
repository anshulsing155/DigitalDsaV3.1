/**
 * Case Lock — Shared Types
 * ══════════════════════════════════════════════════════════════════
 * Types used by the lock operations, API endpoints, and eventually
 * the UI modals. Kept separate from the Case type (which stays
 * unchanged until full feature integration).
 *
 * See: docs/specs/DOCUMENT-PARSER-FORM-INTEGRATION.md §3.1
 * ══════════════════════════════════════════════════════════════════
 */

import type { ObjectId } from 'mongodb';
import type { DaTierId } from '$lib/types/monthlyAssessmentUsage';
import type { EditImpact } from './editImpact';

// ── Lock State (stored as case.lock in MongoDB) ────────────────

/**
 * A locked applicant's identity snapshot.
 * PAN is never stored raw in the lock — only as SHA-256 hash.
 */
export interface CaseLockApplicant {
	/** Position: 0 = primary, 1 = co-app-1, etc. */
	applicant_slot: number;
	/** Role of this applicant */
	role: 'primary' | 'co_applicant' | 'guarantor';
	/** SHA-256 hash of the PAN (never raw PAN in the lock document) */
	pan_hash: string;
	/** Relationship to primary (e.g. 'self', 'spouse', 'father') */
	relationship: string;
}

/**
 * An entry in the lock's edit history.
 * Records every major edit that triggered an unlock-and-relock.
 */
export interface CaseLockEditEntry {
	at: Date;
	by_dsa_id: string;
	fields_changed: string[];
	impact: EditImpact;
	quota_charged: boolean;
	/** Only populated when impact === 'major' (new fingerprint after relock) */
	new_fingerprint?: string;
}

/**
 * The full lock state stored on a case document.
 * Null means the case has never been locked.
 */
export interface CaseLockState {
	is_locked: boolean;
	locked_at: Date | null;
	/** SHA-256 fingerprint of the loan identity at lock time */
	fingerprint_sha256: string;
	/** Loan type at the time of lock (for audit / display) */
	loan_type_at_lock: string;
	/** Loan amount at the time of lock */
	amount_at_lock: number;
	/** Quantized amount bucket: floor(amount / 5L) * 5L */
	amount_bucket: number;
	/** Applicant identity snapshots at lock time */
	applicants_at_lock: CaseLockApplicant[];
	/** History of major edits (unlock-and-relock events) */
	edit_history: CaseLockEditEntry[];
}

// ── Operation Arguments ────────────────────────────────────────

/**
 * Input for the initial lock operation.
 * The caller (API endpoint) resolves these from the case doc + request.
 */
export interface LockCaseArgs {
	/** The case's unique case_id (e.g. 'HL-2026-0042') */
	caseId: string;
	/** The DSA's ObjectId */
	dsaId: ObjectId;
	/** The DSA's current DA tier */
	tier: DaTierId;
	/** Current loan type from the case */
	loanType: string;
	/** Current loan amount from the case */
	loanAmount: number;
	/** All applicants with their raw PAN numbers */
	applicants: Array<{
		pan: string;
		role: 'primary' | 'co_applicant' | 'guarantor';
		relationship: string;
	}>;
}

/**
 * Input for the unlock-and-relock operation (major edit path).
 */
export interface UnlockAndRelockArgs {
	/** The case's unique case_id */
	caseId: string;
	/** The DSA performing the edit */
	dsaId: ObjectId;
	/** The DSA's current DA tier */
	tier: DaTierId;
	/** NEW loan type (after the edit) */
	loanType: string;
	/** NEW loan amount (after the edit) */
	loanAmount: number;
	/** NEW applicants (after the edit) */
	applicants: Array<{
		pan: string;
		role: 'primary' | 'co_applicant' | 'guarantor';
		relationship: string;
	}>;
	/** Reason codes from classifyEdit() explaining why this is major */
	reasons: string[];
}

// ── Operation Results ──────────────────────────────────────────

export interface LockCaseSuccess {
	ok: true;
	/** The lock state written to the case */
	lock: CaseLockState;
	/** Whether this was an idempotent no-op (same fingerprint) */
	was_idempotent: boolean;
}

export interface LockCaseFailure {
	ok: false;
	reason: 'quota_exhausted' | 'already_locked_different_fingerprint' | 'not_doc_upload_mode' | 'case_not_found';
	/** Current quota consumed (for UI display) */
	consumed?: number;
	/** Total available quota (for UI display) */
	total?: number;
	/** Whether the DSA can buy a top-up to resolve */
	can_topup?: boolean;
}

export type LockCaseResult = LockCaseSuccess | LockCaseFailure;

export interface UnlockAndRelockSuccess {
	ok: true;
	/** The updated lock state */
	lock: CaseLockState;
}

export interface UnlockAndRelockFailure {
	ok: false;
	reason: 'quota_exhausted' | 'case_not_locked' | 'not_doc_upload_mode' | 'case_not_found';
	consumed?: number;
	total?: number;
	can_topup?: boolean;
}

export type UnlockAndRelockResult = UnlockAndRelockSuccess | UnlockAndRelockFailure;
