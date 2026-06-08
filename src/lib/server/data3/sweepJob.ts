/**
 * DATA-3 — Daily sweep job over verified-and-floor-elapsed document rows.
 *
 * The sweep runs once per day (Vercel cron) and processes a capped batch
 * (default 500 rows) to avoid hammering ImageKit and to bound a single
 * run's blast radius. The flow per row:
 *
 *   1. Match candidates: cases with at least one document_checklist row
 *      where extraction_status='verified' AND verified_at + floor <= now.
 *   2. For each candidate, check the verify gate one more time (G4 — case
 *      lock / billing may have changed since verified_at). Skip on fail.
 *   3. Check for active DocumentRetentionOverride row. Skip if found.
 *   4. recordDeletionStart (audit-log-first, returns _id on success).
 *   5. deleteWithRetry against ImageKit.
 *   6. recordDeletionOutcome with final status.
 *   7. Mongo $unset of upload.file_url + upload.file_id, $set deleted_at +
 *      extraction_status='deleted' (or 'deletion_abandoned' on retry-exhaust).
 *
 * Env flag short-circuit: if `DATA3_DELETION_ENABLED !== 'true'`, the sweep
 * loads but does NOT perform deletions. Audit candidates are logged to the
 * structured logger so we can observe the queue depth before flipping the
 * flag in production.
 *
 * Everything I/O is injected so this file can be unit-tested without Atlas
 * or ImageKit.
 */

import type { Collection } from 'mongodb';
import type {
	ArtifactDeletionLog,
	DocumentRetentionOverride,
	SweepCandidate
} from './types.js';
import type { Case } from '$lib/types/case.js';
import { deleteWithRetry, type ImagekitDeleteClient } from './imagekitDelete.js';
import { recordDeletionStart, recordDeletionOutcome } from './auditLog.js';
import { classifyDocument, retentionFloorDays, hasRetentionFloorElapsed } from './retentionFloor.js';

/**
 * Logger interface — matches the project's `$lib/server/logger` ConsoleLogger
 * shape exactly (variadic: pino-style `(obj, msg)` or simple `(msg, meta?)`).
 * Test fakes assign `vi.fn()` which is compatible with any function shape.
 */
type SweepLogFn = (
	...args: [message: string, meta?: unknown] | [meta: object, message: string]
) => void;
export interface SweepLogger {
	info: SweepLogFn;
	warn: SweepLogFn;
	error: SweepLogFn;
}

export interface SweepDeps {
	/** Cases collection — sweep queries for verified+floor-elapsed candidates. */
	cases: Pick<Collection<Case>, 'find' | 'updateOne'>;
	/** ArtifactDeletionLog collection — passed through to auditLog helpers. */
	auditLogs: Parameters<typeof recordDeletionStart>[0];
	/** DocumentRetentionOverride collection — sweep consults for opt-outs. */
	overrides: Pick<Collection<DocumentRetentionOverride>, 'findOne'>;
	/** ImageKit client — production passes the default-export from $lib/imagekit/server. */
	imagekit: ImagekitDeleteClient;
	logger: SweepLogger;
	/** Env flag from $env/dynamic/private. Sweep no-ops when not 'true'. */
	enabledFlag: string | undefined;
	/** Clock pin — production passes `new Date()`, tests pass a fixed date. */
	now: Date;
	/** Hard cap on rows processed per run. Default 500. */
	batchLimit?: number;
	/** Override retry delays + sleeper for tests. */
	retryDelaysMs?: readonly number[];
	sleep?: (ms: number) => Promise<void>;
}

export interface SweepResult {
	enabled: boolean;
	candidates: number;
	deleted: number;
	already_deleted: number;
	skipped_gate: number;
	skipped_override: number;
	abandoned: number;
	errors: number;
}

/**
 * Main sweep entry. Iterates eligible documents and runs the deletion
 * pipeline on each.
 *
 * Returns the per-run counters so the cron handler can log them.
 */
export async function runSweep(deps: SweepDeps): Promise<SweepResult> {
	const result: SweepResult = {
		enabled: deps.enabledFlag === 'true',
		candidates: 0,
		deleted: 0,
		already_deleted: 0,
		skipped_gate: 0,
		skipped_override: 0,
		abandoned: 0,
		errors: 0
	};

	// Env-flag short-circuit. Dark-launch path: load + observe, don't delete.
	if (deps.enabledFlag !== 'true') {
		deps.logger.info(
			{ enabledFlag: deps.enabledFlag ?? 'unset' },
			'DATA-3 sweep: deletion disabled, observation-only run'
		);
		// Still count candidates so we see queue depth.
		const candidates = await collectCandidates(deps);
		result.candidates = candidates.length;
		return result;
	}

	const candidates = await collectCandidates(deps);
	result.candidates = candidates.length;

	deps.logger.info(
		{ candidates: candidates.length, batchLimit: deps.batchLimit ?? 500 },
		'DATA-3 sweep: candidates collected'
	);

	for (const candidate of candidates) {
		try {
			const outcome = await processCandidate(deps, candidate);
			switch (outcome) {
				case 'deleted':
					result.deleted++;
					break;
				case 'already_deleted':
					result.already_deleted++;
					break;
				case 'skipped_gate':
					result.skipped_gate++;
					break;
				case 'skipped_override':
					result.skipped_override++;
					break;
				case 'abandoned':
					result.abandoned++;
					break;
			}
		} catch (err) {
			result.errors++;
			deps.logger.error(
				{
					err,
					case_id: candidate.case_id,
					document_checklist_id: candidate.document_checklist_id
				},
				'DATA-3 sweep: unhandled error on candidate'
			);
		}
	}

	deps.logger.info({ ...result }, 'DATA-3 sweep: complete');
	return result;
}

/**
 * Query the cases collection for documents that are `verified` AND whose
 * retention floor has elapsed. Materializes a flat `SweepCandidate[]` —
 * decouples the iteration from the case-doc nesting.
 *
 * Capped at `batchLimit` (default 500).
 */
async function collectCandidates(deps: SweepDeps): Promise<SweepCandidate[]> {
	const batchLimit = deps.batchLimit ?? 500;
	const candidates: SweepCandidate[] = [];

	// Match any case with at least one checklist row in 'verified' state.
	// Per-row filtering (floor elapsed + gate) happens in JS because Mongo
	// can't easily filter array sub-elements by date arithmetic.
	const cursor = deps.cases.find({
		'lender_applications.document_checklist.extraction_status': 'verified'
	});

	for await (const caseDoc of cursor) {
		if (candidates.length >= batchLimit) break;

		const caseIsLocked = (caseDoc as unknown as Case).lock?.is_locked ?? false;
		// Treat "billed" as: case has a lock (locking consumes DA quota at lock time).
		// SEC-2 / DATA-3 spec G4 will refine this once payment-receipt linkage is in
		// place; for v1, "locked" implies "billed for the current fingerprint."
		const caseIsBilled = caseIsLocked;

		for (const la of (caseDoc as unknown as Case).lender_applications ?? []) {
			for (const dc of la.document_checklist ?? []) {
				if (dc.extraction_status !== 'verified') continue;
				if (!dc.upload?.file_id || !dc.upload?.file_url) continue;
				if (!dc.verified_at) continue;
				if (!hasRetentionFloorElapsed(dc.verified_at, dc.doc_id, deps.now)) continue;

				candidates.push({
					case_id: (caseDoc as unknown as Case).case_id,
					lender_application_id: la.lender_application_id,
					document_checklist_id: dc.doc_id,
					doc_type: dc.doc_id,
					tier: classifyDocument(dc.doc_id),
					file_id: dc.upload.file_id,
					file_size: dc.upload.file_size,
					file_type: dc.upload.file_type,
					uploaded_at: dc.upload.uploaded_at,
					extraction_status: 'verified',
					verified_at: dc.verified_at,
					case_is_locked: caseIsLocked,
					case_is_billed: caseIsBilled
				});

				if (candidates.length >= batchLimit) break;
			}
			if (candidates.length >= batchLimit) break;
		}
	}

	return candidates;
}

type ProcessOutcome =
	| 'deleted'
	| 'already_deleted'
	| 'skipped_gate'
	| 'skipped_override'
	| 'abandoned';

/**
 * Process one candidate: re-check gate + override, run deletion, write
 * audit row, update case doc. Returns the per-candidate outcome.
 */
async function processCandidate(
	deps: SweepDeps,
	candidate: SweepCandidate
): Promise<ProcessOutcome> {
	// Re-check G4 — case may have unlocked or billing may have changed
	// between verified_at and now. If so, skip this run.
	if (!candidate.case_is_locked || !candidate.case_is_billed) {
		deps.logger.info(
			{ case_id: candidate.case_id, document_checklist_id: candidate.document_checklist_id },
			'DATA-3 sweep: skipped — G4 gate (lock or billing) no longer holds'
		);
		return 'skipped_gate';
	}

	// Check for explicit DSA opt-out (retention override).
	const override = await deps.overrides.findOne({
		case_id: candidate.case_id,
		document_checklist_id: candidate.document_checklist_id,
		is_active: true,
		expires_at: { $gt: deps.now }
	});
	if (override) {
		deps.logger.info(
			{ case_id: candidate.case_id, document_checklist_id: candidate.document_checklist_id },
			'DATA-3 sweep: skipped — active retention override'
		);
		return 'skipped_override';
	}

	const floorDays = retentionFloorDays(candidate.document_checklist_id);

	// Audit-log first.
	const preWrite = await recordDeletionStart(deps.auditLogs, {
		case_id: candidate.case_id,
		lender_application_id: candidate.lender_application_id,
		document_checklist_id: candidate.document_checklist_id,
		doc_type: candidate.doc_type,
		tier: candidate.tier,
		file_id: candidate.file_id,
		file_size: candidate.file_size,
		file_type: candidate.file_type,
		uploaded_at: candidate.uploaded_at,
		reason: 'verified_floor_elapsed',
		extraction_status_at_delete: 'deletion_in_flight',
		verified_at: candidate.verified_at,
		retention_floor_days: floorDays,
		actor: 'system_sweep',
		actor_id: null,
		attempt_n: 1,
		now: deps.now
	});

	if (!preWrite.ok) {
		if (preWrite.reason === 'duplicate') {
			// Another sweep already started this row. Skip.
			return 'skipped_gate';
		}
		// Mongo error — do NOT call ImageKit per audit-log-first contract.
		deps.logger.error(
			{
				err: (preWrite as { error?: unknown }).error,
				case_id: candidate.case_id,
				document_checklist_id: candidate.document_checklist_id
			},
			'DATA-3 sweep: audit row insert failed, skipping ImageKit call'
		);
		throw (preWrite as { error?: unknown }).error ?? new Error('audit insert failed');
	}

	// Call ImageKit with retry policy.
	const deleteResult = await deleteWithRetry({
		client: deps.imagekit,
		fileId: candidate.file_id,
		retryDelaysMs: deps.retryDelaysMs,
		sleep: deps.sleep
	});

	// Record outcome.
	const outcomeArgs =
		deleteResult.kind === 'success' || deleteResult.kind === 'already_deleted'
			? {
					id: preWrite.id,
					now: deps.now,
					outcome: {
						status: 'success' as const,
						imagekit_response: deleteResult.imagekit_response
					}
				}
			: {
					id: preWrite.id,
					now: deps.now,
					outcome: {
						status: 'failed' as const,
						error_code: deleteResult.error_code,
						imagekit_response: deleteResult.lastError
					}
				};
	await recordDeletionOutcome(deps.auditLogs, outcomeArgs);

	// Update the case doc.
	if (deleteResult.kind === 'success' || deleteResult.kind === 'already_deleted') {
		await deps.cases.updateOne(
			{
				case_id: candidate.case_id,
				'lender_applications.lender_application_id': candidate.lender_application_id,
				'lender_applications.document_checklist.doc_id': candidate.document_checklist_id
			},
			{
				$unset: {
					'lender_applications.$[la].document_checklist.$[dc].upload.file_url': '',
					'lender_applications.$[la].document_checklist.$[dc].upload.file_id': ''
				},
				$set: {
					'lender_applications.$[la].document_checklist.$[dc].extraction_status': 'deleted',
					'lender_applications.$[la].document_checklist.$[dc].deleted_at': deps.now
				}
			},
			{
				arrayFilters: [
					{ 'la.lender_application_id': candidate.lender_application_id },
					{ 'dc.doc_id': candidate.document_checklist_id }
				]
			}
		);
		return deleteResult.kind === 'success' ? 'deleted' : 'already_deleted';
	}

	// Abandoned — mark the row, ops will investigate.
	await deps.cases.updateOne(
		{
			case_id: candidate.case_id,
			'lender_applications.lender_application_id': candidate.lender_application_id,
			'lender_applications.document_checklist.doc_id': candidate.document_checklist_id
		},
		{
			$set: {
				'lender_applications.$[la].document_checklist.$[dc].extraction_status':
					'deletion_abandoned'
			}
		},
		{
			arrayFilters: [
				{ 'la.lender_application_id': candidate.lender_application_id },
				{ 'dc.doc_id': candidate.document_checklist_id }
			]
		}
	);
	return 'abandoned';
}
