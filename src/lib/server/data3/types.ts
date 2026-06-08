/**
 * DATA-3 — Type definitions for the file-deletion-after-extraction pipeline.
 *
 * See docs/specs/DATA-3-FILE-DELETION-SPEC.md for the full design.
 *
 * Three concerns live in this file:
 *   1. `ExtractionStatus` — the 12-state taxonomy that drives the state machine.
 *   2. `ArtifactDeletionLog` — the audit-ledger row written for every deletion attempt.
 *   3. `DocumentRetentionOverride` — the "DSA opted this document into indefinite retention" record.
 *
 * Everything here is interfaces + literal unions. No runtime code.
 */

import type { ObjectId } from 'mongodb';

// ============================================================================
// Extraction status — the per-document state machine state
// ============================================================================

/**
 * The lifecycle status of an uploaded document with respect to extraction and
 * eventual deletion. Stored on `DocumentChecklistItem.extraction_status`.
 *
 *   - `uploaded`              file received, no extraction attempt yet
 *   - `extracting`            Gemini call in flight or queued
 *   - `extracted`             extraction completed, DSA confirmation pending
 *   - `partial`               extraction completed with gaps, DSA action needed
 *   - `failed`                extraction errored (LLM error / unreadable input)
 *   - `verified`              DSA confirmed (or 14d auto-verify floor elapsed)
 *   - `retained_indefinite`   explicit DSA opt-out from auto-deletion
 *   - `deletion_pending`      verified + retention floor elapsed, queued for sweep
 *   - `deletion_in_flight`    ImageKit delete in progress
 *   - `deleted`               terminal — file gone, audit row written
 *   - `deletion_failed`       ImageKit error, retry scheduled
 *   - `deletion_abandoned`    3 retries exhausted, manual intervention needed
 */
export type ExtractionStatus =
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

/**
 * Events the state machine consumes. Each event maps to a transition arrow in
 * the diagram in docs/specs/DATA-3-FILE-DELETION-SPEC.md §4.
 */
export type ExtractionEvent =
	| { type: 'extractionStarted' }
	| { type: 'extractionCompleted'; confidence: number; allRequiredFieldsPresent: boolean }
	| { type: 'extractionFailed'; error: string }
	| { type: 'dsaConfirmed' }
	| { type: 'dsaOptOut' } // → retained_indefinite
	| { type: 'autoVerifyFloorElapsed' } // 14 days post-extraction with no DSA action
	| { type: 'verifyGatePassed' } // verified + retention floor + locked + billed (per §5)
	| { type: 'deletionStarted' }
	| { type: 'deletionSucceeded' }
	| { type: 'deletionFailed' } // single attempt failed; retry will follow
	| { type: 'deletionAbandoned' }; // retries exhausted

/**
 * Document tier — drives the retention-floor calculation. Mapping from `doc_id`
 * to tier lives in `retentionFloor.ts`.
 */
export type DocumentTier =
	| 'financial' // bank statements, ITRs, salary slips, Form 16 — 30 days
	| 'kyc' // PAN card, Aadhaar card, photo — 90 days
	| 'property' // sale deed, agreement — 180 days
	| 'high_stakes'; // DSA-tagged "needs long retention" — 365 days

// ============================================================================
// Extracted-fields envelope (carried on DocumentChecklistItem)
// ============================================================================

/**
 * Container for fields the LLM lifted out of a document. The shape of
 * `fields` is document-type-specific (bank statement vs ITR vs salary slip);
 * we don't lock it here because each schema lives next to its extractor.
 *
 * `confidence` is the LLM-reported floor across all required fields. The
 * verify gate G2 reads this directly. Optional fields don't contribute.
 */
export interface ExtractedFieldsEnvelope {
	fields: Record<string, unknown>;
	confidence: number; // 0..1
	extracted_at: Date;
	extractor_version: string; // e.g. 'gemini-2.5-flash@2026-05-16'
}

// ============================================================================
// ArtifactDeletionLog — audit ledger collection row
// ============================================================================

/**
 * One row per deletion attempt — the audit trail of "did we delete this file
 * and why". Written BEFORE the ImageKit call (audit-log-first ordering per
 * spec §8). On a successful delete the row's `status` flips to `success`. On
 * failure it flips to `failed`; retries write NEW rows with incremented
 * `attempt_n`. After 3 failures the document's checklist row goes to
 * `deletion_abandoned` (terminal).
 *
 * Compound unique index on `(case_id, document_checklist_id, attempt_n)`
 * enforces "one row per attempt" — `recordDeletionAttempt` relies on the
 * resulting duplicate-key error for idempotency.
 */
export interface ArtifactDeletionLog {
	_id?: ObjectId;

	// What was deleted
	case_id: string;
	lender_application_id: string;
	document_checklist_id: string; // doc_id from DocumentChecklistItem
	doc_type: string; // e.g. 'bank_statement_3m'
	tier: DocumentTier;
	file_id: string; // ImageKit fileId, preserved for forensic lookup
	file_size: number;
	file_type: string;
	uploaded_at: Date;

	// Why it was deleted
	reason: 'verified_floor_elapsed' | 'abandoned_case_purge' | 'admin_force_delete';
	extraction_status_at_delete: ExtractionStatus;
	verified_at: Date | null;
	retention_floor_days: number;

	// Who triggered it
	actor: 'system_sweep' | 'admin' | 'cron';
	actor_id: string | null; // admin user_id if actor === 'admin', else null

	// Operational
	attempt_n: number; // 1 on first try, 2/3 on retry
	status: 'in_flight' | 'success' | 'failed';
	imagekit_response: string | null; // raw SDK response or scrubbed error msg
	error_code: string | null; // e.g. 'IMAGEKIT_404', 'IMAGEKIT_5XX', 'NETWORK'
	started_at: Date;
	completed_at: Date | null;
}

// ============================================================================
// DocumentRetentionOverride — explicit DSA opt-out from auto-deletion
// ============================================================================

/**
 * When a DSA explicitly tags a document as "do not auto-delete" (active
 * dispute, regulator-paused matter, etc.). Excludes the document from all
 * sweeps. Auto-clears 365 days post-creation unless re-applied — guards
 * against quiet permanent retention.
 *
 * Unique index on `(case_id, document_checklist_id)`. A second tag write
 * updates `last_renewed_at` rather than creating a duplicate row.
 */
export interface DocumentRetentionOverride {
	_id?: ObjectId;

	case_id: string;
	lender_application_id: string;
	document_checklist_id: string;

	reason: string; // free-text DSA-supplied justification
	tagged_at: Date;
	tagged_by_dsa_id: string;
	last_renewed_at: Date; // refreshed each time the DSA re-confirms
	expires_at: Date; // tagged_at + 365 days; sweep clears at this point
	is_active: boolean; // true while inside the 365-day window
}

// ============================================================================
// Sweep-job input snapshot — pulled from cases for batch processing
// ============================================================================

/**
 * Compact projection of one document-checklist row plus its case-level context.
 * The sweep job materializes this from the cases collection, then hands a
 * batch of these to the deletion pipeline. Decouples the sweep query from
 * the pipeline so we can unit-test pipeline behaviour with hand-built rows.
 */
export interface SweepCandidate {
	case_id: string;
	lender_application_id: string;
	document_checklist_id: string;
	doc_type: string;
	tier: DocumentTier;
	file_id: string;
	file_size: number;
	file_type: string;
	uploaded_at: Date;
	extraction_status: ExtractionStatus;
	verified_at: Date | null;

	// Case-level context needed by verify gate G4
	case_is_locked: boolean;
	case_is_billed: boolean;
}
