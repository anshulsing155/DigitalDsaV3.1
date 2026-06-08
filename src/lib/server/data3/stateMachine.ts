/**
 * DATA-3 — Pure state-machine transitions for `ExtractionStatus`.
 *
 * Every transition arrow from docs/specs/DATA-3-FILE-DELETION-SPEC.md §4 is
 * encoded here. No I/O. The function takes the current status + an event and
 * returns the next status. Unknown / impossible transitions return the
 * current status unchanged (safe no-op — protects against double-delivered
 * events from the sweep job).
 *
 * Verify-gate logic (G1..G4) lives in `verifyGate.ts`. The state machine
 * just consumes `verifyGatePassed` as an opaque event — it doesn't compute
 * the gates itself. This keeps the machine independent of the gate's
 * implementation details and easy to test.
 */

import type { ExtractionStatus, ExtractionEvent } from './types.js';

/**
 * Compute the next status given the current status + an event.
 *
 * @example
 *   nextStatus('uploaded', { type: 'extractionStarted' }) // → 'extracting'
 *   nextStatus('extracting', { type: 'extractionCompleted',
 *     confidence: 0.92, allRequiredFieldsPresent: true })  // → 'extracted'
 *   nextStatus('deleted', { type: 'deletionStarted' })     // → 'deleted' (no-op)
 *
 * Design notes:
 *
 * - Terminal states (`deleted`, `deletion_abandoned`, `retained_indefinite`)
 *   never transition out. If a stray event reaches a terminal-state row, we
 *   ignore it. This is the primary defense against the sweep job's retry
 *   loop re-attempting a row that's already done.
 *
 * - The `extractionCompleted` event has TWO outcomes depending on its payload:
 *     * high confidence + all required fields → `extracted`
 *     * otherwise → `partial`
 *   The threshold (0.85) is duplicated from verifyGate G2 because the state
 *   machine needs to fork at completion time, not at verify time.
 *
 * - `verifyGatePassed` is reachable from `extracted` (after DSA confirm or
 *   auto-verify floor) but NOT directly from `partial` / `failed`. Those
 *   need explicit DSA action first (re-extraction, manual fill, or DSA
 *   confirm of partial values which routes back through `dsaConfirmed`
 *   → `verified`).
 *
 * - `dsaConfirmed` from `partial` is the "DSA reviewed the gaps and is OK
 *   with what we have" path. It bumps the row to `verified` (not back to
 *   `extracted`). Same for `failed` if the DSA decides the failure is OK
 *   (e.g. unreadable scan and they'll re-upload later).
 */
export function nextStatus(current: ExtractionStatus, event: ExtractionEvent): ExtractionStatus {
	// ─── Terminal states: ignore all events ─────────────────────────────
	if (current === 'deleted' || current === 'deletion_abandoned') {
		return current;
	}

	// `retained_indefinite` is terminal w.r.t. the deletion pipeline, but
	// a DSA can re-tag/un-tag the override row externally. The status only
	// flips back via a deliberate dsaOptOut(false) flow, which is not part
	// of this v1 state machine — sub-session (b) ships only the opt-in side.
	if (current === 'retained_indefinite') {
		return current;
	}

	switch (event.type) {
		// ─── Extraction lifecycle ────────────────────────────────────────
		case 'extractionStarted':
			// Only meaningful from `uploaded` (fresh) or `failed` (retry).
			if (current === 'uploaded' || current === 'failed') return 'extracting';
			return current;

		case 'extractionCompleted':
			// Branch on confidence + completeness — see verifyGate G1/G2 for
			// the canonical thresholds. We duplicate the 0.85 floor here so
			// the state machine itself can fork on completion.
			if (current !== 'extracting') return current;
			if (event.allRequiredFieldsPresent && event.confidence >= 0.85) {
				return 'extracted';
			}
			return 'partial';

		case 'extractionFailed':
			if (current !== 'extracting') return current;
			return 'failed';

		// ─── DSA review ──────────────────────────────────────────────────
		case 'dsaConfirmed':
			// DSA explicitly accepted the current extraction (or its gaps).
			// Routes anything not-yet-verified to `verified`.
			if (
				current === 'extracted' ||
				current === 'partial' ||
				current === 'failed'
			) {
				return 'verified';
			}
			return current;

		case 'dsaOptOut':
			// "Do not auto-delete this one." Reachable from any pre-deletion
			// state. Once tagged, the document drops out of sweeps entirely
			// (override row + status terminal).
			if (
				current === 'uploaded' ||
				current === 'extracting' ||
				current === 'extracted' ||
				current === 'partial' ||
				current === 'failed' ||
				current === 'verified'
			) {
				return 'retained_indefinite';
			}
			return current;

		case 'autoVerifyFloorElapsed':
			// 14 days since `extracted` with no DSA action and no failure
			// flip. Treats DSA silence as implicit confirmation.
			if (current === 'extracted') return 'verified';
			return current;

		// ─── Deletion lifecycle ──────────────────────────────────────────
		case 'verifyGatePassed':
			// Gates G1..G4 all green. Queue for the next sweep.
			if (current === 'verified') return 'deletion_pending';
			return current;

		case 'deletionStarted':
			// Sweep picks up the row and starts the ImageKit call.
			if (current === 'deletion_pending' || current === 'deletion_failed') {
				return 'deletion_in_flight';
			}
			return current;

		case 'deletionSucceeded':
			if (current === 'deletion_in_flight') return 'deleted';
			return current;

		case 'deletionFailed':
			// Single attempt failed; retry will follow. Sweep job picks up
			// `deletion_failed` rows on the next pass via `deletionStarted`.
			if (current === 'deletion_in_flight') return 'deletion_failed';
			return current;

		case 'deletionAbandoned':
			// 3 retries exhausted. Manual intervention from ops only.
			if (current === 'deletion_failed' || current === 'deletion_in_flight') {
				return 'deletion_abandoned';
			}
			return current;

		default: {
			// Exhaustiveness check. Any new event added to the `ExtractionEvent`
			// union without a case branch trips this at compile time.
			const _exhaustive: never = event;
			return current;
		}
	}
}

/**
 * Helpers for callers that want to ask "is this row in a state where we'd
 * ever consider deleting it?" without re-implementing the predicate.
 */
export function isTerminal(status: ExtractionStatus): boolean {
	return (
		status === 'deleted' ||
		status === 'deletion_abandoned' ||
		status === 'retained_indefinite'
	);
}

export function isDeletionEligible(status: ExtractionStatus): boolean {
	// The sweep job's eligibility filter — only `verified` rows can be
	// promoted to `deletion_pending`, and only `deletion_pending` /
	// `deletion_failed` rows can enter `deletion_in_flight`.
	return (
		status === 'verified' ||
		status === 'deletion_pending' ||
		status === 'deletion_failed'
	);
}
