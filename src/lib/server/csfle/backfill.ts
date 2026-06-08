/**
 * SEC-2 Phase C.1 — User-collection backfill engine.
 *
 * Converts plaintext PII to ciphertext in the four user collections that
 * Phase B targets (Applicant / DsaApplications / rmApplications / AdminUsers).
 * Operator-launched via `scripts/sec2-backfill-users.ts`. Not on a cron —
 * this is a one-time-per-environment migration.
 *
 * Design pillars:
 *   - **Idempotent.** Per-row guard via `isEncryptedBinary` — already-encrypted
 *     fields pass through untouched. Crash mid-batch + rerun = no double-encrypt.
 *   - **Resumable.** Cursor pagination by `_id` (Mongo's natural BSON sort).
 *     Each batch logs the inclusive `range_end_id` so an operator restarting
 *     after a crash can verify which batches landed.
 *   - **Observable.** Per-batch and per-collection stats returned to the caller.
 *     The CLI wrapper just pretty-prints them; in a future automated scenario,
 *     the same return shape could feed a dashboard.
 *   - **Auditable.** Each converted row writes an entry to `CsfleBackfillAudit`
 *     with the actual fields encrypted. TTL 90 days on that collection.
 *
 * Migration safety:
 *   The dual-query path in `findUserByMobile` etc. handles half-encrypted
 *   collections — a row can be plaintext or ciphertext during the run and
 *   both lookup strategies find it. So the backfill does NOT require
 *   maintenance mode. Operator preference, not a correctness requirement.
 *
 * Reference: docs/specs/SEC-2-PHASE-C-PLAN.md §3.
 */

import type { Collection, Document, ObjectId, WithId } from 'mongodb';
import { CsfleBackfillAudit } from '$lib/database/mongo.js';
import { computeBackfillPatch, listBackfillableFields } from './userCrypto.js';

// ── Types ─────────────────────────────────────────────────────────

export interface BackfillBatchResult {
	batch_n: number;
	/** First _id read in this batch (inclusive). null when batch was empty. */
	range_start_id: string | null;
	/** Last _id read in this batch (inclusive). null when batch was empty. */
	range_end_id: string | null;
	read_count: number;
	encrypted_count: number;
	skipped_count: number;
	error_count: number;
	ms_elapsed: number;
}

export interface BackfillCollectionResult {
	collection: string;
	run_id: string;
	total_read: number;
	total_encrypted: number;
	total_skipped: number;
	total_errors: number;
	duration_ms: number;
	batches: BackfillBatchResult[];
}

export interface BackfillOptions {
	/** Free-form identifier for this run — recorded on every audit entry. */
	ranBy: string;
	/** Group id for this run — defaults to a fresh ISO timestamp. */
	runId?: string;
	/** Page size. 500 is a balance between memory and Mongo cursor cost. */
	batchSize?: number;
	/** Inject an audit writer for tests. Defaults to the real CsfleBackfillAudit collection. */
	auditWriter?: AuditWriter;
	/** Inject a logger. Defaults to console.log. The CLI wrapper passes its own pretty-printer. */
	onBatch?: (batch: BackfillBatchResult) => void;
}

export interface AuditWriter {
	insertOne(entry: AuditEntry): Promise<void>;
}

export interface AuditEntry {
	collection: string;
	row_id: ObjectId;
	encrypted_fields: string[];
	ran_at: Date;
	ran_by: string;
	run_id?: string;
}

// ── Default audit writer (production path) ────────────────────────

export const defaultAuditWriter: AuditWriter = {
	async insertOne(entry: AuditEntry) {
		await CsfleBackfillAudit.insertOne(entry);
	}
};

// ── Index management ──────────────────────────────────────────────

/**
 * Ensure the TTL index on `csfleBackfillAudit.ran_at` exists. Idempotent
 * — MongoDB's createIndex is a no-op if an identical index is already
 * present. Call this once at the top of every backfill run.
 *
 * 90 days = 90 * 24 * 60 * 60 = 7_776_000 seconds. The Mongo TTL monitor
 * sweeps expired entries every ~60s, so the audit collection self-prunes
 * without any cron/script involvement.
 */
export async function ensureAuditIndex(): Promise<void> {
	await CsfleBackfillAudit.createIndex(
		{ ran_at: 1 },
		{
			expireAfterSeconds: 90 * 24 * 60 * 60,
			name: 'ran_at_ttl_90d',
			background: true
		}
	);
}

// ── Core: backfill one collection ─────────────────────────────────

/**
 * Walk a collection, encrypt each row's plaintext PII, and write an audit
 * entry per converted row. Returns per-batch + per-collection stats.
 *
 * Safe to call when CSFLE is disabled — `computeBackfillPatch` will return
 * `null` for every row (passthrough mode treats every field as "already
 * appropriate"), so the function reads + skips every row without writing.
 * In practice the CLI refuses to start with CSFLE_ENABLED unset, so this
 * is a belt-and-suspenders guard.
 */
export async function backfillCollection<T extends Document>(
	collection: Collection<T>,
	collectionName: string,
	options: BackfillOptions
): Promise<BackfillCollectionResult> {
	const batchSize = options.batchSize ?? 500;
	const audit = options.auditWriter ?? defaultAuditWriter;
	const runId = options.runId ?? new Date().toISOString();
	const onBatch = options.onBatch;
	const startedAt = Date.now();

	const result: BackfillCollectionResult = {
		collection: collectionName,
		run_id: runId,
		total_read: 0,
		total_encrypted: 0,
		total_skipped: 0,
		total_errors: 0,
		duration_ms: 0,
		batches: []
	};

	// Cursor pagination by _id. lastId starts null and after each batch
	// holds the _id of the last document processed. The next batch
	// requests rows with _id > lastId, which is BSON-ordered. Index hit
	// is guaranteed (every collection has a _id index).
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
			.toArray()) as WithId<T>[];

		if (docs.length === 0) {
			// Empty terminal batch — we're done. Don't push to batches[];
			// nothing happened.
			break;
		}

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
				const patch = await computeBackfillPatch(doc as object);
				if (!patch) {
					// Every PII field on this row is already ciphertext (or
					// missing). Skip — idempotency guarantee in action.
					batchResult.skipped_count += 1;
					continue;
				}

				const fields = Object.keys(patch);
				await collection.updateOne(
					{ _id: doc._id } as never,
					{ $set: patch } as never
				);

				await audit.insertOne({
					collection: collectionName,
					row_id: doc._id as ObjectId,
					encrypted_fields: fields,
					ran_at: new Date(),
					ran_by: options.ranBy,
					run_id: runId
				});

				batchResult.encrypted_count += 1;
			} catch (err) {
				batchResult.error_count += 1;
				// Re-throw — the caller (CLI) decides whether to bail or continue.
				// Per the §3.7 risk matrix, we fail-loud on per-row errors
				// rather than silently dropping them.
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

		// Set up next batch — the last row's _id becomes the cursor.
		lastId = docs[docs.length - 1]._id as ObjectId;

		// If we read fewer than batchSize docs, this was the final partial
		// batch. Stop without the wasted empty-query at the end.
		if (docs.length < batchSize) break;
	}

	result.duration_ms = Date.now() - startedAt;
	return result;
}

// ── Re-export the field-list helper for the CLI's "what would change"
// reporting (operators sometimes want a dry-run-style sanity view). ──

export { listBackfillableFields };
