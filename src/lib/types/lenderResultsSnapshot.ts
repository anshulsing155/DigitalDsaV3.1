// Lender Results Snapshot Types — Versioned Evaluation Records
import type { ObjectId } from 'mongodb';
import type { LenderResultsData } from './lenderResults.js';

// ============================================================================
// SELECTION STATE — per-lender, per-case (mutable, lives on Case document)
// ============================================================================

export type LenderSelectionState = 'neutral' | 'shortlisted' | 'selected';

export interface LenderSelection {
	lender_application_id: string;
	state: LenderSelectionState;
	updated_at: Date;
}

// ============================================================================
// PER-LENDER CHANGE TRACKING (pre-computed at snapshot creation)
// ============================================================================

export interface LenderChangeDelta {
	lender_application_id: string;
	lender_name: string;
	/** Previous traffic light (from prior version) */
	prev_traffic_light?: 'green' | 'amber' | 'red' | 'grey';
	/** Current traffic light */
	curr_traffic_light: 'green' | 'amber' | 'red' | 'grey';
	/** True if lender was red/amber/grey in prev version and is now green */
	is_new_contender: boolean;
	/** True if this lender did not exist in the previous version */
	is_newly_added: boolean;
	/** Numeric changes for key metrics */
	changes: {
		offered_amount?: { prev: number; curr: number; delta: number };
		roi?: { prev: number; curr: number; delta: number };
		emi?: { prev: number; curr: number; delta: number };
		tenure_months?: { prev: number; curr: number; delta: number };
		approval_probability?: { prev: number; curr: number; delta: number };
	};
	/** Human-readable reason for the change */
	change_reason?: string;
}

// ============================================================================
// EVALUATION TRIGGER
// ============================================================================

export type EvalTrigger = 'initial_submit' | 'form_edit' | 'manual_refresh' | 'policy_update';

// ============================================================================
// LENDER RESULTS SNAPSHOT — immutable, versioned evaluation record
// ============================================================================

export interface LenderResultsSnapshot {
	_id?: ObjectId;
	case_id: string;
	version: number;
	/** Complete results payload (immutable once written) */
	payload: LenderResultsData;
	/** SHA-256 of JSON.stringify(payload) for tamper detection */
	payload_hash: string;
	/** Which form snapshot version was used as input */
	source_form_snapshot_version: number;
	/** Hash of the source form snapshot payload */
	source_form_snapshot_hash: string;
	/** Per-lender deltas compared to the previous version (empty for v1) */
	change_deltas: LenderChangeDelta[];
	/** Why this evaluation was triggered */
	trigger: EvalTrigger;
	/** Optional human note about what changed */
	change_summary?: string;
	created_by: ObjectId;
	created_at: Date;
	/**
	 * F2 (2026-06-05): cached projection of the source FormSnapshot's
	 * assessment fields (`assessmentStatus`, `assessmentLenders`,
	 * `rejectionReasons`). Phase 2 already decrypts the FormSnapshot to run
	 * the engine; we stash these scalar/array projections into the results
	 * snapshot at write time so the results-data API endpoint can render
	 * the page without a second FormSnapshot load + CSFLE decrypt.
	 *
	 * NOT a source of truth — the FormSnapshot remains canonical. This is a
	 * derived cache keyed by `source_form_snapshot_version` (snapshots are
	 * immutable, so the cache can never go stale relative to its source).
	 *
	 * Optional / nullable: snapshots created BEFORE F2 shipped won't have
	 * this field. results-data falls back to the original FormSnapshot
	 * decrypt path on absence — no migration required.
	 */
	form_assessment_cache?: {
		assessmentStatus: string;
		previouslyRejectedLenders: string[];
		rejectionReasons: string[];
	};
}

// ============================================================================
// POLICY STALENESS CHECK RESULT
// ============================================================================

export interface LenderPolicyStaleness {
	lender_name: string;
	/** When the lender's policy was last known to be updated */
	policy_last_updated: Date;
	/** When this case's results were last computed */
	results_computed_at: Date;
	/** True if policy_last_updated > results_computed_at */
	is_stale: boolean;
}
