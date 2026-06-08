/**
 * QBC — Recompute offers for a quota-unblocked case
 * ══════════════════════════════════════════════════════════════════════
 * Called inline by `processBlockedCasesAfter` immediately after a case
 * transitions stage='quota_blocked' → 'intake'. Loads the latest
 * FormSnapshot, runs the rule engine, persists LenderResultsSnapshot,
 * updates the Case's results metadata.
 *
 * Why inline instead of a cron
 * ────────────────────────────
 * Earlier shipped as `/api/cron/process-unblocked-cases` (every 5 min
 * pulled by an `unblocked_at` marker). Reflexive pattern from the repo's
 * 8 billing/data crons. Calling out the over-architecture:
 *   • Upgrade endpoint: blocked count is bounded by saveBuffer (max 5
 *     on Pro). 5 × ~2s eval = ~10s extra response time. Acceptable for
 *     a one-time event; Vercel Pro 60s function limit gives headroom.
 *   • Cycle reset (inside chargeEngine.handleSuccess, already in a cron):
 *     adding inline eval just makes the cron slower, with zero user-
 *     facing latency.
 *   • Cron-based path required an `unblocked_at` marker + a 5-min poll
 *     interval + a 7th cron-job.org entry + the standard cron-lock /
 *     idempotency dance. All overhead for "eventual consistency in 5
 *     minutes" that the user-experience does not benefit from.
 * Inline is simpler AND faster. Failure recovery: a single case that
 * fails eval stays at stage='intake' without offers; the DSA's recourse
 * is "Edit form" which re-fires the normal evaluate-and-persist path.
 *
 * Best-effort
 * ───────────
 * Caller catches errors so a single eval failure doesn't dead-end the
 * surrounding batch (upgrade with 5 blocked cases — failure on case
 * #2 should not block #3, #4, #5).
 *
 * Spec: docs/specs/QUOTA-BLOCKED-CASES-SPEC.md §6.3 (revised — was cron-
 * based; now inline).
 */

import type { ObjectId } from 'mongodb';
import { Cases, FormSnapshots, LenderResultsSnapshots } from '$lib/database/mongo';
import { resolveSnapshotPayload } from '$lib/server/csfle/index';
import { evaluatePayload } from '$lib/ruleEngine/evaluationEngine';
import { _buildPayloadFromFormState } from '$lib/../routes/api/evaluate-and-persist/+server';
import { computePayloadHash } from '$lib/server/snapshotHelpers';
import { computeChangeDeltas } from '$lib/server/lenderResultsHelpers';
import logger from '$lib/server/logger';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder/types';

export interface RecomputeResult {
	status: 'success' | 'snapshot_missing' | 'eval_failed' | 'persist_failed';
	offerCount?: number;
	error?: string;
}

export async function recomputeOffersForUnblockedCase(
	caseId: string,
	dsaId: ObjectId,
	loanType: string
): Promise<RecomputeResult> {
	// 1. Load latest FormSnapshot.
	const snapshot = await FormSnapshots.findOne(
		{ case_id: caseId },
		{ sort: { version: -1 } }
	);
	if (!snapshot) {
		return { status: 'snapshot_missing', error: 'no FormSnapshot found' };
	}

	// 2. CSFLE-aware payload decrypt (passthrough when CSFLE disabled).
	let formState: Record<string, unknown>;
	try {
		formState = (await resolveSnapshotPayload(snapshot)) as Record<string, unknown>;
	} catch (err) {
		return { status: 'snapshot_missing', error: `payload decrypt failed: ${(err as Error).message}` };
	}

	// 3. Build clean payload — same helper that evaluate-and-persist uses.
	let cleanPayload: LoanApplicationPayload;
	try {
		cleanPayload = _buildPayloadFromFormState(
			formState as Parameters<typeof _buildPayloadFromFormState>[0],
			loanType,
			undefined
		);
	} catch (err) {
		return { status: 'eval_failed', error: `payload build failed: ${(err as Error).message}` };
	}

	// 4. Run rule engine.
	let results;
	try {
		results = await evaluatePayload(cleanPayload);
	} catch (err) {
		return { status: 'eval_failed', error: (err as Error).message };
	}

	// 5. Persist LenderResultsSnapshot (version-bump + change-deltas inline).
	const payload_hash = computePayloadHash(results as unknown as Record<string, unknown>);
	const now = new Date();
	const MAX_RETRIES = 3;
	let resultsVersion = 0;

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		const latest = await LenderResultsSnapshots.findOne(
			{ case_id: caseId },
			{ sort: { version: -1 } }
		);
		resultsVersion = latest ? latest.version + 1 : 1;
		const change_deltas = computeChangeDeltas(
			latest ? (latest.payload as typeof results) : null,
			results
		);
		try {
			await LenderResultsSnapshots.insertOne({
				case_id: caseId,
				version: resultsVersion,
				payload: results,
				payload_hash,
				created_by: dsaId,
				created_at: now,
				trigger: 'qbc_unblock_process',
				change_summary: 'Auto-processed after quota unblock',
				change_deltas
			} as unknown as Parameters<typeof LenderResultsSnapshots.insertOne>[0]);
			break;
		} catch (err) {
			if ((err as { code?: number }).code === 11000 && attempt < MAX_RETRIES - 1) continue;
			return {
				status: 'persist_failed',
				error: `LenderResultsSnapshot insert failed: ${(err as Error).message}`
			};
		}
	}

	// 6. Update Case results metadata. The `unblocked_at` marker stays as an
	//    audit field — "this case was auto-unblocked on X" — but doesn't
	//    drive any retry mechanism. Failures are surfaced via logger.warn
	//    and a missing LenderResultsSnapshot for the case_id.
	await Cases.updateOne(
		{ case_id: caseId },
		{
			$set: {
				results_snapshot_version: resultsVersion,
				results_snapshot_hash: payload_hash,
				updated_at: now
			}
		}
	);

	logger.info(
		{
			event: 'quota_blocked.offers_recomputed',
			case_id: caseId,
			offer_count: results.results.length,
			results_version: resultsVersion
		},
		'[QBC] Offers recomputed inline for unblocked case'
	);

	return { status: 'success', offerCount: results.results.length };
}
