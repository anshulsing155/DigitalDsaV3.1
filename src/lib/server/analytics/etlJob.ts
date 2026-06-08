/**
 * DATA-4 — Analytics ETL job.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md §6–§8.
 *
 * Reads operational cases, de-identifies each via buildAnalyticsCase, and
 * upserts the result into the analytics warehouse. Designed to run nightly
 * from a Vercel cron (Slice 7), or on demand from a script.
 *
 * Dependency-injection design: every external touchpoint (Mongo reads/writes,
 * payload decryption, enrichment, clock) is passed in as a function. The
 * endpoint wires these to real collections; tests pass plain mocks. The job
 * body itself has no imports of Mongo or CSFLE — it's pure orchestration.
 *
 * Resilience (spec §6 "Error handling"):
 *   - A case with no snapshot, or an empty/undecryptable payload, is SKIPPED
 *     (counted, logged) — never blocks other cases.
 *   - A case that throws during transform is ERRORED (counted, logged) — also
 *     never blocks other cases.
 *   - If the whole run throws before recording its audit row, no row is
 *     written, so the NEXT run reuses the previous successful cursor and
 *     reprocesses — safe because upserts are idempotent (spec §6).
 *
 * Incremental cursor: each run reads the most recent FINISHED run's
 * `started_at` and processes only cases changed since (`updated_at > cursor`).
 * First-ever run has no cursor → processes everything (the one-time backfill,
 * spec Q2).
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { Case } from '$lib/types/case.js';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder.js';
import type { EnrichedPayload } from '$lib/ruleEngine/payloadEnricher.js';
import type { AnalyticsCaseDoc, AnalyticsEtlRunDoc } from './types.js';
import { buildAnalyticsCase } from './buildAnalyticsCase.js';

/** The minimal snapshot shape the job needs (matches FormSnapshot's relevant fields). */
export interface EtlSnapshot {
	payload?: Record<string, unknown> | null;
	payload_encrypted?: unknown | null;
	version: number;
}

/**
 * Minimal logger surface — matches the app's ConsoleLogger contract
 * (`$lib/server/logger`): structured `meta` object first, then a message
 * string. Both required, which is exactly how every call site below uses it.
 */
interface EtlLogger {
	info(meta: object, message: string): void;
	warn(meta: object, message: string): void;
	error(meta: object, message: string): void;
}

export interface AnalyticsEtlDeps {
	/** Whether the job is allowed to run (gated by ANALYTICS_ETL_ENABLED). */
	enabled: boolean;
	/** Clock — injected so tests are deterministic. */
	now: Date;
	/** The most recent FINISHED run's started_at, or null on first-ever run. */
	findLastSuccessfulCursor: () => Promise<Date | null>;
	/** Eligible cases changed since `cursor` (null = all). Excludes sample + intake. */
	findEligibleCases: (cursor: Date | null) => Promise<Case[]>;
	/** Latest FormSnapshot for a case (highest version), or null if none. */
	findLatestSnapshot: (caseId: string) => Promise<EtlSnapshot | null>;
	/** Transparently decrypt the payload (resolveSnapshotPayload). */
	resolvePayload: (snapshot: EtlSnapshot) => Promise<Record<string, unknown> | null>;
	/** Enrich the raw payload into the _computed-bearing shape. */
	enrich: (payload: LoanApplicationPayload) => EnrichedPayload;
	/** Upsert one analytics row, keyed by case_id. */
	upsertRow: (row: AnalyticsCaseDoc) => Promise<void>;
	/** Persist the run audit row. */
	recordRun: (run: AnalyticsEtlRunDoc) => Promise<void>;
	logger: EtlLogger;
}

export interface AnalyticsEtlResult {
	enabled: boolean;
	run_id: string | null;
	cases_processed: number;
	cases_skipped: number;
	cases_errored: number;
}

/** Build a human-readable, sortable, unique-enough run id from the clock. */
function makeRunId(now: Date): string {
	return `etl-${now.toISOString()}`;
}

function isEmptyPayload(payload: Record<string, unknown> | null): boolean {
	return payload === null || Object.keys(payload).length === 0;
}

/**
 * Run one ETL pass. Returns the run statistics; also persists an audit row
 * (unless the job is disabled, in which case it's a pure no-op).
 */
export async function runAnalyticsEtl(deps: AnalyticsEtlDeps): Promise<AnalyticsEtlResult> {
	if (!deps.enabled) {
		deps.logger.info({}, '[analytics-etl] skipped — ANALYTICS_ETL_ENABLED is not "true"');
		return { enabled: false, run_id: null, cases_processed: 0, cases_skipped: 0, cases_errored: 0 };
	}

	const runId = makeRunId(deps.now);
	const startedAt = deps.now;

	const cursor = await deps.findLastSuccessfulCursor();
	const cases = await deps.findEligibleCases(cursor);
	deps.logger.info(
		{ runId, cursor, candidate_count: cases.length },
		'[analytics-etl] starting run'
	);

	let processed = 0;
	let skipped = 0;
	let errored = 0;

	for (const caseDoc of cases) {
		try {
			const snapshot = await deps.findLatestSnapshot(caseDoc.case_id);
			if (!snapshot) {
				skipped++;
				continue;
			}

			const payload = await deps.resolvePayload(snapshot);
			if (isEmptyPayload(payload)) {
				// Payload missing, empty, or undecryptable (e.g. a missing DEK).
				// Skip + retry next run (spec §6 / Q3) — never fail the run.
				skipped++;
				deps.logger.warn(
					{ runId, case_id: caseDoc.case_id },
					'[analytics-etl] empty/undecryptable payload — skipping for this run'
				);
				continue;
			}

			// payload is the decrypted form payload, structurally a
			// LoanApplicationPayload. TS can't narrow Record<string,unknown> to it
			// directly (insufficient overlap), so cast via unknown — the runtime
			// shape is guaranteed by resolveSnapshotPayload + the operational schema.
			const enriched = deps.enrich(payload as unknown as LoanApplicationPayload);
			const row = buildAnalyticsCase({
				caseDoc,
				payload: enriched,
				snapshotVersion: snapshot.version,
				etlRunId: runId,
				etlWrittenAt: deps.now
			});
			await deps.upsertRow(row);
			processed++;
		} catch (err) {
			// One bad case must not sink the run (spec §6). Count + log + move on.
			errored++;
			deps.logger.error(
				{ err, runId, case_id: caseDoc.case_id },
				'[analytics-etl] case transform failed — counted as errored'
			);
		}
	}

	const runDoc: AnalyticsEtlRunDoc = {
		run_id: runId,
		started_at: startedAt,
		finished_at: deps.now,
		cases_processed: processed,
		cases_skipped: skipped,
		cases_errored: errored
	};
	await deps.recordRun(runDoc);

	deps.logger.info(
		{ runId, processed, skipped, errored },
		'[analytics-etl] run complete'
	);

	return {
		enabled: true,
		run_id: runId,
		cases_processed: processed,
		cases_skipped: skipped,
		cases_errored: errored
	};
}
