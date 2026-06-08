/**
 * SEC-2 Phase C.2 — formSnapshots payload backfill engine.
 *
 * Mirrors `backfill.ts` (user-collection backfill) but specialized for
 * FormSnapshots — each row's PII surface is the ENTIRE payload field,
 * encrypted as one Binary value (Approach B from §4.4 of the plan).
 *
 * Operator-launched via `scripts/sec2-backfill-snapshots.ts`. Same
 * idempotency + resumability guarantees as the user backfill:
 *   - A row is "needs-backfill" iff `payload_encrypted` is null/undefined.
 *   - Cursor pagination by _id; resumable mid-batch.
 *   - Per-row audit entry written to CsfleBackfillAudit so the run can
 *     be reconstructed for compliance.
 *
 * Why a separate module instead of generalizing `backfillCollection`:
 *   The user-collection backfill produces a $set patch of multiple
 *   independent PII fields. The snapshot backfill produces a single
 *   field write (`payload_encrypted`). Different shapes, different
 *   audit semantics — easier to keep separate than to abstract over
 *   both.
 *
 * Reference: docs/specs/SEC-2-PHASE-C-PLAN.md §4.4 (Approach B migration plan).
 */

import type { Collection, ObjectId, WithId } from 'mongodb';
import type { FormSnapshot } from '$lib/types/formSnapshot.js';
import { encryptSnapshotPayload } from './snapshotCrypto.js';
import {
	type BackfillOptions,
	type BackfillBatchResult,
	type BackfillCollectionResult,
	defaultAuditWriter
} from './backfill.js';

/**
 * Walk FormSnapshots, encrypt the plaintext `payload` into
 * `payload_encrypted` for every row that doesn't already have it.
 * Returns the same shape as the user-collection backfill so the CLI
 * pretty-printer can be shared.
 *
 * When CSFLE is disabled, `encryptSnapshotPayload` returns null and
 * every row is counted as "skipped" (we don't write null over null —
 * that would be churn for no value). Per-run idempotency follows from
 * the "encrypted field already set" check.
 */
export async function backfillSnapshots(
	collection: Collection<FormSnapshot>,
	options: BackfillOptions
): Promise<BackfillCollectionResult> {
	const batchSize = options.batchSize ?? 500;
	const audit = options.auditWriter ?? defaultAuditWriter;
	const runId = options.runId ?? new Date().toISOString();
	const onBatch = options.onBatch;
	const startedAt = Date.now();

	const result: BackfillCollectionResult = {
		collection: 'formSnapshots',
		run_id: runId,
		total_read: 0,
		total_encrypted: 0,
		total_skipped: 0,
		total_errors: 0,
		duration_ms: 0,
		batches: []
	};

	let lastId: ObjectId | null = null;
	let batch_n = 0;

	for (;;) {
		const batchStart = Date.now();
		batch_n += 1;

		const filter = (lastId ? { _id: { $gt: lastId } } : {}) as Record<string, unknown>;
		const docs = (await collection
			.find(filter as never)
			.sort({ _id: 1 })
			.limit(batchSize)
			.toArray()) as WithId<FormSnapshot>[];

		if (docs.length === 0) break;

		const batchResult: BackfillBatchResult = {
			batch_n,
			range_start_id: docs[0]._id.toString(),
			range_end_id: docs[docs.length - 1]._id.toString(),
			read_count: docs.length,
			encrypted_count: 0,
			skipped_count: 0,
			error_count: 0,
			ms_elapsed: 0
		};

		for (const doc of docs) {
			try {
				// Skip if already backfilled. payload_encrypted being set to
				// ANY non-null value (including a falsy non-null like 0,
				// which shouldn't happen for a Binary) means a prior run or
				// new-write path already populated it.
				if (doc.payload_encrypted !== null && doc.payload_encrypted !== undefined) {
					batchResult.skipped_count += 1;
					continue;
				}

				// Skip rows with no plaintext payload — defensive guard.
				// Every snapshot SHOULD have a payload, but if a corrupt
				// row exists, we don't want the backfill to crash on
				// JSON.stringify(undefined).
				if (!doc.payload) {
					batchResult.skipped_count += 1;
					continue;
				}

				const encrypted = await encryptSnapshotPayload(
					doc.payload as Record<string, unknown>
				);
				if (encrypted === null) {
					// CSFLE disabled — passthrough mode. Don't write null
					// over null. Count as skipped to signal "operator
					// should re-run with CSFLE_ENABLED=true."
					batchResult.skipped_count += 1;
					continue;
				}

				await collection.updateOne(
					{ _id: doc._id } as never,
					{ $set: { payload_encrypted: encrypted } } as never
				);

				await audit.insertOne({
					collection: 'formSnapshots',
					row_id: doc._id as ObjectId,
					encrypted_fields: ['payload_encrypted'],
					ran_at: new Date(),
					ran_by: options.ranBy,
					run_id: runId
				});

				batchResult.encrypted_count += 1;
			} catch (err) {
				batchResult.error_count += 1;
				batchResult.ms_elapsed = Date.now() - batchStart;
				result.batches.push(batchResult);
				result.total_read += batchResult.read_count;
				result.total_encrypted += batchResult.encrypted_count;
				result.total_skipped += batchResult.skipped_count;
				result.total_errors += batchResult.error_count;
				result.duration_ms = Date.now() - startedAt;
				if (onBatch) onBatch(batchResult);
				throw err;
			}
		}

		batchResult.ms_elapsed = Date.now() - batchStart;
		result.batches.push(batchResult);
		result.total_read += batchResult.read_count;
		result.total_encrypted += batchResult.encrypted_count;
		result.total_skipped += batchResult.skipped_count;
		result.total_errors += batchResult.error_count;
		if (onBatch) onBatch(batchResult);

		lastId = docs[docs.length - 1]._id as ObjectId;
		if (docs.length < batchSize) break;
	}

	result.duration_ms = Date.now() - startedAt;
	return result;
}
