/**
 * Shared helpers for the 2-phase evaluate-and-persist flow
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Extracted from the original single-call /api/evaluate-and-persist endpoint
 * (2026-06-03 split per Option 1 — phase-1 persist + phase-2 evaluate). These
 * helpers are reused by BOTH phases so the persistence shape stays canonical:
 *
 *   - _buildPayloadFromFormState: client-form-state → engine-ready
 *     LoanApplicationPayload. Mirrors cleanPayloadStore.svelte.ts on the
 *     client. Used by phase 1 (to determine loanAmount/tenure for the
 *     response, even though the engine itself doesn't run there) AND by
 *     phase 2 (to rebuild the payload from the persisted FormSnapshot).
 *
 *   - createFormSnapshot: increments version, dual-writes plaintext +
 *     payload_encrypted via CSFLE, updates Cases pointer, writes timeline.
 *     Phase-1 only.
 *
 *   - persistResults: same retry+timeline pattern for LenderResultsSnapshots.
 *     Phase-2 only.
 *
 * Security note (split architecture invariant):
 *   Phase 2's API contract is `POST /api/cases/[case_id]/evaluate-offers`
 *   with NO body payload — the caseId comes from the URL, the form data is
 *   loaded from the persisted FormSnapshot. This file's _buildPayloadFromFormState
 *   is therefore called twice with DIFFERENT inputs:
 *     - phase 1: with the client-submitted formState (validated + persisted)
 *     - phase 2: with the formState READ BACK from FormSnapshot.payload
 *   Never use phase 2 to evaluate a payload sourced from the request body.
 *   See the lock test in upgradePromptWiring.test.ts.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ObjectId } from 'mongodb';
import { Cases, FormSnapshots, LenderResultsSnapshots } from '$lib/database/mongo.js';
import logger from '$lib/server/logger.js';
import { buildLoanPayload } from '$lib/utils/payloadBuilder/index.js';
import { buildFilteredAnswers } from '$lib/utils/payloadFilter.js';
import { computePayloadHash } from '$lib/server/snapshotHelpers.js';
import { computeChangeDeltas } from '$lib/server/lenderResultsHelpers.js';
import { encryptSnapshotPayload } from '$lib/server/csfle/index.js';
import { createTimelineEvent } from '$lib/server/caseHelpers.js';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder/types.js';
import type { LenderResultsData } from '$lib/types/lenderResults.js';

// ============================================================================
// PAYLOAD BUILDER (mirrors cleanPayloadStore on the client)
// ============================================================================

/**
 * Build LoanApplicationPayload from raw form state. Mirrors
 * `cleanPayloadStore.svelte.ts` → `currentLoanAnswers()` +
 * `currentFilteredView()` + `buildLoanPayload()`.
 *
 * Originally lived in /api/evaluate-and-persist/+server.ts; moved here so
 * phase 2 can re-run it against the FormSnapshot it loads from MongoDB.
 *
 * Schema null = Layer A passthrough; Layer B per-applicant gates are the
 * active enforcement today. Raw `formState` is never mutated —
 * buildFilteredAnswers returns a fresh projection.
 */
export function _buildPayloadFromFormState(
	formState: {
		loanData: Record<string, unknown>;
		applicationData: Record<string, unknown>;
		applicants: Record<string, unknown>[];
		[key: string]: unknown;
	},
	loanType: string,
	relationships?: Array<{
		fromId: string;
		toId: string;
		relationType: string;
		category?: string;
	}>
): LoanApplicationPayload {
	const loanName = (formState.applicationData?.loanName as string) ?? loanType;
	const loanData = formState.loanData ?? {};
	const rawLoanAnswers = (
		loanName && loanData[loanName] ? loanData[loanName] : loanData
	) as Record<string, unknown>;

	const rawApplicants = formState.applicants as Record<string, unknown>[];
	const applicationData = (formState.applicationData ?? {}) as Record<string, unknown>;

	const view = buildFilteredAnswers(null, rawLoanAnswers, rawApplicants);

	return buildLoanPayload(view.loanAnswers, view.applicants, applicationData, relationships);
}

// ============================================================================
// FORM SNAPSHOT (phase-1 owned)
// ============================================================================

/**
 * Insert a new FormSnapshot version. Retries on E11000 (concurrent version
 * race) up to 3 times. Updates the Cases pointer + writes a timeline event.
 *
 * SEC-2 Phase C.2: dual-writes plaintext `payload` AND encrypted
 * `payload_encrypted`. encryptSnapshotPayload returns null when CSFLE is
 * disabled — safe to deploy before the operator runs the DEK init script.
 *
 * Relationships note: callers should stash relationships into formState
 * before passing here (as `formState.__relationships`) so phase 2 can
 * recover them when rebuilding the LoanApplicationPayload. The phase-2
 * endpoint never receives relationships in a request body.
 */
export async function createFormSnapshot(
	caseId: string,
	dsaId: ObjectId,
	formState: Record<string, unknown>,
	changeSummary: string
): Promise<{ version: number; hash: string }> {
	const payload_hash = computePayloadHash(formState);
	const now = new Date();

	const MAX_RETRIES = 3;
	let version = 0;
	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		const latestSnapshot = await FormSnapshots.findOne(
			{ case_id: caseId },
			{ sort: { version: -1 }, projection: { version: 1 } }
		);
		version = latestSnapshot ? latestSnapshot.version + 1 : 1;

		try {
			const payload_encrypted = await encryptSnapshotPayload(formState as Record<string, unknown>);
			await FormSnapshots.insertOne({
				case_id: caseId,
				version,
				payload: formState,
				payload_encrypted,
				payload_hash,
				created_by: dsaId,
				created_at: now,
				change_summary: changeSummary
			} as any);
			break;
		} catch (err: any) {
			if (err?.code === 11000 && attempt < MAX_RETRIES - 1) {
				continue;
			}
			throw err;
		}
	}

	// F6 (2026-06-05): pointer update + timeline write are independent
	// (different collections, no causal dependency on each other's result).
	// Promise.all saves one round-trip's wall-clock vs the previous
	// sequential awaits — neither write changes behavior, only timing.
	// If either rejects the function still throws (Promise.all surfaces the
	// first rejection); same error semantics as before.
	await Promise.all([
		Cases.updateOne(
			{ case_id: caseId, dsa_id: dsaId },
			{
				$set: {
					form_snapshot_version: version,
					form_snapshot_hash: payload_hash,
					updated_at: now
				}
			}
		),
		createTimelineEvent(caseId, 'form_updated', `Form snapshot v${version} created`, {
			version,
			payload_hash,
			change_summary: changeSummary
		})
	]);

	return { version, hash: payload_hash };
}

// ============================================================================
// LENDER RESULTS SNAPSHOT (phase-2 owned)
// ============================================================================

/**
 * F2 (2026-06-05): assessment-data projection cached onto every
 * LenderResultsSnapshot at write time. Source-of-truth stays the
 * FormSnapshot's plaintext; this is the derived projection that the
 * results-data endpoint can read WITHOUT a second FormSnapshot load +
 * CSFLE decrypt. Keyed by source_form_snapshot_version which is
 * immutable, so the cache can never go stale relative to its source.
 *
 * Optional — callers that don't supply it (legacy callers, snapshots
 * written before F2 shipped) get a snapshot with no cache, and
 * results-data falls through to the FormSnapshot-decrypt path.
 */
export interface FormAssessmentCache {
	assessmentStatus: string;
	previouslyRejectedLenders: string[];
	rejectionReasons: string[];
}

/**
 * Insert a new LenderResultsSnapshot version. Same retry+timeline pattern
 * as createFormSnapshot. Computes change_deltas vs the previous results
 * snapshot so the dashboard can highlight what changed.
 */
export async function persistResults(
	caseId: string,
	dsaId: ObjectId,
	results: LenderResultsData,
	snapVersion: number,
	snapHash: string,
	trigger: 'initial_submit' | 'form_edit',
	changeSummary?: string,
	formAssessmentCache?: FormAssessmentCache
): Promise<void> {
	const payload_hash = computePayloadHash(results as unknown as Record<string, any>);
	const now = new Date();

	const MAX_RETRIES = 3;
	let version = 0;
	let change_deltas: ReturnType<typeof computeChangeDeltas> = [];

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		const latestSnapshot = await LenderResultsSnapshots.findOne(
			{ case_id: caseId },
			{ sort: { version: -1 } }
		);
		version = latestSnapshot ? latestSnapshot.version + 1 : 1;
		change_deltas = computeChangeDeltas(
			latestSnapshot ? (latestSnapshot.payload as LenderResultsData) : null,
			results
		);

		try {
			await LenderResultsSnapshots.insertOne({
				case_id: caseId,
				version,
				payload: results,
				payload_hash,
				source_form_snapshot_version: snapVersion,
				source_form_snapshot_hash: snapHash,
				change_deltas,
				trigger,
				created_by: dsaId,
				created_at: now,
				...(changeSummary ? { change_summary: changeSummary } : {}),
				// F2: derived assessment-cache projection (see JSDoc above).
				// Omitted entirely when caller didn't supply — old snapshots
				// stay shape-clean for any code path that does {$exists} checks.
				...(formAssessmentCache ? { form_assessment_cache: formAssessmentCache } : {})
			} as any);
			break;
		} catch (err: any) {
			if (err?.code === 11000 && attempt < MAX_RETRIES - 1) {
				logger.warn(
					{ caseId, version, attempt },
					'[evaluateAndPersistShared] E11000 on results snapshot — retrying with next version'
				);
				continue;
			}
			throw err;
		}
	}

	const eventType = version === 1 ? 'results_evaluated' : 'results_refreshed';

	// F6 (2026-06-05): same pattern as createFormSnapshot — pointer update
	// + timeline write are independent. Promise.all saves a round-trip.
	await Promise.all([
		Cases.updateOne(
			{ case_id: caseId, dsa_id: dsaId },
			{
				$set: {
					results_snapshot_version: version,
					results_snapshot_hash: payload_hash,
					updated_at: now
				}
			}
		),
		createTimelineEvent(
			caseId,
			eventType,
			`Lender results ${eventType === 'results_evaluated' ? 'evaluated' : 'refreshed'} (v${version})`,
			{
				version,
				payload_hash,
				source_form_snapshot_version: snapVersion,
				trigger,
				change_deltas_count: change_deltas.length,
				change_summary: changeSummary || undefined
			}
		)
	]);
}

// ============================================================================
// SHARED CONSTANTS (the relationships stash key)
// ============================================================================

/**
 * Where phase 1 stashes the request's `relationships` array inside the
 * formState object before it's persisted to FormSnapshot.payload. Phase 2
 * reads them back when rebuilding the LoanApplicationPayload.
 *
 * Using a `__`-prefixed key keeps it out of the typed surface and avoids
 * collisions with question bindings (which are camelCase or domain-scoped).
 */
export const FORM_STATE_RELATIONSHIPS_KEY = '__relationships';
