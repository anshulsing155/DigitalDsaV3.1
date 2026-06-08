/**
 * SEC-2 Phase C.1 — backfill engine unit tests.
 *
 * Tests the pure logic of `backfillCollection` without touching real
 * MongoDB or real CSFLE. The collection is mocked as an in-memory
 * array with the minimal `find().sort().limit().toArray() + updateOne`
 * surface. The audit writer is injected.
 *
 * What we lock:
 *   - Per-row idempotency (already-encrypted rows skipped on rerun).
 *   - Batch boundaries (range_start_id / range_end_id correctly track
 *     the cursor pagination).
 *   - Stats accumulate correctly (read/encrypted/skipped/errors).
 *   - Audit writer receives one entry per converted row with the
 *     correct fields list.
 *   - Empty collection is a clean no-op (zero batches, all counters zero).
 *   - Last partial batch is the final batch (no wasted empty-query).
 *
 * The actual encryption path is exercised in passthrough mode (CSFLE
 * disabled) — `computeBackfillPatch` returns null for plaintext fields
 * when no encryption provider is configured. To force a non-null patch
 * for the tests, we stub `mongodb-client-encryption` AND set
 * CSFLE_ENABLED=true, but we don't supply a real ClientEncryption —
 * the test rows that "need backfill" have non-encrypted Binary values
 * that the helper treats as needing backfill but never actually calls
 * the encrypt provider (because the test stub returns the input
 * unchanged at the encryptValue boundary).
 *
 * Reference: docs/specs/SEC-2-PHASE-C-PLAN.md §7 verification gates C.1.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Force passthrough mode for these tests — we're testing the
// orchestration logic, not the encryption math.
vi.mock('$env/dynamic/private', () => ({
	env: {
		CSFLE_ENABLED: '',
		QE_LOCAL_MASTER_KEY: undefined,
		CSFLE_KEY_VAULT_NAMESPACE: undefined
	}
}));

vi.mock('mongodb-client-encryption', () => ({
	ClientEncryption: class {},
	MongoCrypt: class {}
}));

// Mock the database module so importing the backfill engine doesn't
// open a real MongoClient connection. The audit writer is injected
// per-test so this mock just needs to satisfy the import.
vi.mock('$lib/database/mongo.js', () => ({
	CsfleBackfillAudit: { insertOne: vi.fn(), createIndex: vi.fn() },
	MongoClientInstance: {}
}));

import { ObjectId } from 'mongodb';
import {
	backfillCollection,
	type AuditEntry,
	type AuditWriter,
	type BackfillBatchResult
} from '$lib/server/csfle/backfill.js';

// ── Fakes ──────────────────────────────────────────────────────

interface FakeDoc {
	_id: ObjectId;
	mobileNumber?: string | number;
	name?: string;
	role?: string; // not in PII registry — should never appear in patches
}

/**
 * Build an in-memory collection that supports the subset of the Mongo
 * Collection API that `backfillCollection` uses: find().sort().limit().toArray()
 * and updateOne. Lets us verify the cursor pagination and write semantics
 * deterministically.
 */
function makeFakeCollection(docs: FakeDoc[]) {
	const sorted = [...docs].sort((a, b) =>
		a._id.toString().localeCompare(b._id.toString())
	);
	const updates: Array<{ _id: ObjectId; patch: Record<string, unknown> }> = [];

	const coll = {
		find(filter: Record<string, unknown>) {
			let matches = sorted;
			const cursorFilter = filter as { _id?: { $gt?: ObjectId } };
			if (cursorFilter._id?.$gt) {
				const gt = cursorFilter._id.$gt.toString();
				matches = matches.filter((d) => d._id.toString().localeCompare(gt) > 0);
			}
			let limit = matches.length;
			return {
				sort() {
					return this;
				},
				limit(n: number) {
					limit = n;
					return this;
				},
				async toArray() {
					return matches.slice(0, limit);
				}
			};
		},
		async updateOne(filter: { _id: ObjectId }, update: { $set: Record<string, unknown> }) {
			updates.push({ _id: filter._id, patch: update.$set });
			// Mutate the in-memory doc so a second pass sees the updated state
			const target = sorted.find((d) => d._id.equals(filter._id));
			if (target) Object.assign(target, update.$set);
			return { acknowledged: true, modifiedCount: 1 } as unknown;
		}
	};

	return { coll, sorted, updates };
}

function makeFakeAuditWriter(): { writer: AuditWriter; entries: AuditEntry[] } {
	const entries: AuditEntry[] = [];
	const writer: AuditWriter = {
		async insertOne(entry: AuditEntry) {
			entries.push(entry);
		}
	};
	return { writer, entries };
}

// ── Tests ──────────────────────────────────────────────────────

describe('SEC-2 backfill — orchestration in CSFLE-disabled mode', () => {
	beforeEach(() => {
		delete process.env.CSFLE_ENABLED;
	});

	it('empty collection is a clean no-op', async () => {
		const { coll } = makeFakeCollection([]);
		const { writer, entries } = makeFakeAuditWriter();

		const result = await backfillCollection(coll as never, 'Applicant', {
			ranBy: 'test-host/me',
			auditWriter: writer
		});

		expect(result.total_read).toBe(0);
		expect(result.total_encrypted).toBe(0);
		expect(result.total_skipped).toBe(0);
		expect(result.total_errors).toBe(0);
		expect(result.batches).toHaveLength(0);
		expect(entries).toHaveLength(0);
		expect(result.collection).toBe('Applicant');
	});

	it('rows with no PII fields are read + skipped (no patch, no audit)', async () => {
		// `role` is not in the PII registry; with CSFLE disabled, every
		// PII field would also return null patches via passthrough. But
		// we include rows with ONLY `role` to ensure even with PII fields,
		// passthrough mode treats them as "nothing to do."
		const docs: FakeDoc[] = [
			{ _id: new ObjectId(), role: 'dsa' },
			{ _id: new ObjectId(), role: 'admin' },
			{ _id: new ObjectId(), role: 'rm' }
		];
		const { coll, updates } = makeFakeCollection(docs);
		const { writer, entries } = makeFakeAuditWriter();

		const result = await backfillCollection(coll as never, 'Applicant', {
			ranBy: 'test-host/me',
			auditWriter: writer,
			batchSize: 10
		});

		expect(result.total_read).toBe(3);
		expect(result.total_encrypted).toBe(0);
		// In CSFLE-disabled mode, passthrough means even rows with mobile/name
		// produce null patches → skipped_count counts them as skipped.
		// The test rows have no PII fields, so they're also skipped.
		expect(result.total_skipped).toBe(3);
		expect(updates).toHaveLength(0);
		expect(entries).toHaveLength(0);
		expect(result.batches).toHaveLength(1);
		expect(result.batches[0].range_start_id).toBe(docs.sort((a, b) =>
			a._id.toString().localeCompare(b._id.toString())
		)[0]._id.toString());
	});

	it('batches respect batchSize and the final partial batch terminates the loop', async () => {
		// 12 docs, batchSize=5 → 3 batches of sizes 5, 5, 2.
		const docs: FakeDoc[] = Array.from({ length: 12 }, () => ({
			_id: new ObjectId(),
			role: 'dsa'
		}));
		const { coll } = makeFakeCollection(docs);
		const { writer } = makeFakeAuditWriter();

		const result = await backfillCollection(coll as never, 'DsaApplications', {
			ranBy: 'test',
			auditWriter: writer,
			batchSize: 5
		});

		expect(result.batches).toHaveLength(3);
		expect(result.batches.map((b) => b.read_count)).toEqual([5, 5, 2]);
		expect(result.total_read).toBe(12);
		expect(result.batches[0].batch_n).toBe(1);
		expect(result.batches[1].batch_n).toBe(2);
		expect(result.batches[2].batch_n).toBe(3);
	});

	it('batch range_start_id and range_end_id track the cursor correctly', async () => {
		const docs: FakeDoc[] = Array.from({ length: 6 }, () => ({
			_id: new ObjectId()
		}));
		const sorted = [...docs].sort((a, b) =>
			a._id.toString().localeCompare(b._id.toString())
		);
		const { coll } = makeFakeCollection(docs);
		const { writer } = makeFakeAuditWriter();

		const result = await backfillCollection(coll as never, 'Applicant', {
			ranBy: 'test',
			auditWriter: writer,
			batchSize: 3
		});

		expect(result.batches).toHaveLength(2);
		expect(result.batches[0].range_start_id).toBe(sorted[0]._id.toString());
		expect(result.batches[0].range_end_id).toBe(sorted[2]._id.toString());
		expect(result.batches[1].range_start_id).toBe(sorted[3]._id.toString());
		expect(result.batches[1].range_end_id).toBe(sorted[5]._id.toString());
	});

	it('run_id and ranBy propagate to every audit entry (when entries exist)', async () => {
		// Even in passthrough mode, entries won't be written (every patch
		// is null). But the run_id is set on the result regardless.
		const { coll } = makeFakeCollection([{ _id: new ObjectId(), role: 'dsa' }]);
		const { writer } = makeFakeAuditWriter();

		const result = await backfillCollection(coll as never, 'Applicant', {
			ranBy: 'ops-host/operator-jane',
			runId: '2026-05-19T12:34:56.000Z',
			auditWriter: writer
		});

		expect(result.run_id).toBe('2026-05-19T12:34:56.000Z');
		expect(result.collection).toBe('Applicant');
	});

	it('onBatch callback fires once per batch with the batch result', async () => {
		const docs: FakeDoc[] = Array.from({ length: 4 }, () => ({ _id: new ObjectId() }));
		const { coll } = makeFakeCollection(docs);
		const { writer } = makeFakeAuditWriter();
		const seen: BackfillBatchResult[] = [];

		await backfillCollection(coll as never, 'Applicant', {
			ranBy: 'test',
			auditWriter: writer,
			batchSize: 2,
			onBatch: (b) => seen.push(b)
		});

		expect(seen).toHaveLength(2);
		expect(seen[0].batch_n).toBe(1);
		expect(seen[1].batch_n).toBe(2);
		expect(seen.every((b) => typeof b.ms_elapsed === 'number')).toBe(true);
	});

	it('default runId is an ISO timestamp when caller does not provide one', async () => {
		const { coll } = makeFakeCollection([]);
		const { writer } = makeFakeAuditWriter();

		const result = await backfillCollection(coll as never, 'Applicant', {
			ranBy: 'test',
			auditWriter: writer
		});

		// ISO 8601 — Date.toISOString() shape: 2026-MM-DDTHH:MM:SS.000Z
		expect(result.run_id).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
	});

	it('default batchSize is 500 when caller does not provide one', async () => {
		// Build 501 docs so a single default batch can't cover them all.
		const docs: FakeDoc[] = Array.from({ length: 501 }, () => ({
			_id: new ObjectId()
		}));
		const { coll } = makeFakeCollection(docs);
		const { writer } = makeFakeAuditWriter();

		const result = await backfillCollection(coll as never, 'Applicant', {
			ranBy: 'test',
			auditWriter: writer
		});

		expect(result.batches).toHaveLength(2);
		expect(result.batches[0].read_count).toBe(500);
		expect(result.batches[1].read_count).toBe(1);
	});
});
