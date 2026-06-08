/**
 * SEC-2 Phase C.2 — snapshotCrypto + snapshot backfill tests.
 *
 * Two test surfaces:
 *
 *   1. snapshotCrypto helpers — passthrough-mode round-trip behavior,
 *      resolveSnapshotPayload precedence (encrypted wins when present,
 *      plaintext falls through when not), fail-loud guards on
 *      ciphertext-without-provider.
 *
 *   2. backfillSnapshots orchestration — idempotency (already-encrypted
 *      rows are skipped on rerun), missing-payload defensive guard,
 *      audit writer integration, batch boundaries.
 *
 * Encryption-active (real Binary subtype 6) tests require a live Atlas
 * cluster + DEKs — that lives in the separate nightly suite. These
 * tests pin the orchestration + passthrough contracts.
 *
 * Reference: docs/specs/SEC-2-PHASE-C-PLAN.md §7 verification gates C.2.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

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

vi.mock('$lib/database/mongo.js', () => ({
	CsfleBackfillAudit: { insertOne: vi.fn(), createIndex: vi.fn() },
	MongoClientInstance: {},
	FormSnapshots: {}
}));

import { Binary, ObjectId } from 'mongodb';
import {
	encryptSnapshotPayload,
	decryptSnapshotPayload,
	resolveSnapshotPayload
} from '$lib/server/csfle/snapshotCrypto.js';
import { backfillSnapshots } from '$lib/server/csfle/snapshotBackfill.js';
import type { AuditEntry, AuditWriter } from '$lib/server/csfle/backfill.js';

beforeEach(() => {
	delete process.env.CSFLE_ENABLED;
});

// ── snapshotCrypto helpers ────────────────────────────────────

describe('snapshotCrypto — CSFLE disabled (passthrough)', () => {
	it('encryptSnapshotPayload returns null when CSFLE_ENABLED is unset', async () => {
		const result = await encryptSnapshotPayload({ applicants: [{ name: 'Alice' }] });
		expect(result).toBeNull();
	});

	it('decryptSnapshotPayload returns null on null input', async () => {
		expect(await decryptSnapshotPayload(null)).toBeNull();
		expect(await decryptSnapshotPayload(undefined)).toBeNull();
	});

	it('decryptSnapshotPayload fail-loud when fed ciphertext while CSFLE is off', async () => {
		// Simulate a row written when encryption WAS active being read
		// back without the provider — must throw, not silently return null.
		const fakeCiphertext = new Binary(Buffer.from([0x06, 0x00, 0x01, 0x02]), 6);
		await expect(decryptSnapshotPayload(fakeCiphertext)).rejects.toThrow(
			/cannot decrypt/i
		);
	});
});

describe('snapshotCrypto — resolveSnapshotPayload precedence', () => {
	it('returns plaintext payload when payload_encrypted is null', async () => {
		const payload = { applicants: [{ name: 'Bob' }], loanAmount: 5_000_000 };
		const result = await resolveSnapshotPayload({ payload, payload_encrypted: null });
		expect(result).toEqual(payload);
	});

	it('returns plaintext payload when payload_encrypted is undefined', async () => {
		const payload = { caseId: 'X', loanType: 'home' };
		const result = await resolveSnapshotPayload({ payload });
		expect(result).toEqual(payload);
	});

	it('returns null when both fields are missing', async () => {
		const result = await resolveSnapshotPayload({});
		expect(result).toBeNull();
	});

	it('falls through to plaintext when decryptSnapshotPayload returns null in passthrough mode', async () => {
		// payload_encrypted: null + CSFLE disabled → resolver returns
		// the plaintext payload. (This is the migration-safe path: a
		// row written while CSFLE was disabled has payload_encrypted=null,
		// and the resolver correctly returns the plaintext.)
		const payload = { x: 1 };
		const result = await resolveSnapshotPayload({ payload, payload_encrypted: null });
		expect(result).toEqual(payload);
	});
});

// ── backfillSnapshots orchestration ──────────────────────────

interface FakeSnapshot {
	_id: ObjectId;
	case_id: string;
	version: number;
	payload?: Record<string, unknown> | null;
	payload_encrypted?: unknown | null;
}

function makeFakeSnapshotCollection(docs: FakeSnapshot[]) {
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
			const target = sorted.find((d) => d._id.equals(filter._id));
			if (target) Object.assign(target, update.$set);
			return { acknowledged: true, modifiedCount: 1 };
		}
	};

	return { coll, sorted, updates };
}

function makeAuditWriter(): { writer: AuditWriter; entries: AuditEntry[] } {
	const entries: AuditEntry[] = [];
	return {
		entries,
		writer: {
			async insertOne(entry: AuditEntry) {
				entries.push(entry);
			}
		}
	};
}

describe('backfillSnapshots — orchestration', () => {
	it('empty collection is a clean no-op', async () => {
		const { coll } = makeFakeSnapshotCollection([]);
		const { writer, entries } = makeAuditWriter();

		const result = await backfillSnapshots(coll as never, {
			ranBy: 'test',
			auditWriter: writer
		});

		expect(result.total_read).toBe(0);
		expect(result.total_encrypted).toBe(0);
		expect(result.total_skipped).toBe(0);
		expect(result.batches).toHaveLength(0);
		expect(entries).toHaveLength(0);
		expect(result.collection).toBe('formSnapshots');
	});

	it('rows missing payload are skipped defensively', async () => {
		// One row with no payload at all — backfill must not crash and
		// must NOT write a NULL/empty payload_encrypted on top.
		const docs: FakeSnapshot[] = [
			{ _id: new ObjectId(), case_id: 'CASE-001', version: 1, payload: null },
			{ _id: new ObjectId(), case_id: 'CASE-002', version: 1 } // payload is absent entirely
		];
		const { coll, updates } = makeFakeSnapshotCollection(docs);
		const { writer, entries } = makeAuditWriter();

		const result = await backfillSnapshots(coll as never, {
			ranBy: 'test',
			auditWriter: writer
		});

		expect(result.total_read).toBe(2);
		expect(result.total_encrypted).toBe(0);
		expect(result.total_skipped).toBe(2);
		expect(updates).toHaveLength(0);
		expect(entries).toHaveLength(0);
	});

	it('rows already encrypted are skipped on rerun (idempotency)', async () => {
		// Simulate a partial first run by marking some rows as already
		// having payload_encrypted set.
		const docs: FakeSnapshot[] = [
			{
				_id: new ObjectId(),
				case_id: 'CASE-001',
				version: 1,
				payload: { x: 1 },
				payload_encrypted: 'already-encrypted-binary-stub'
			},
			{
				_id: new ObjectId(),
				case_id: 'CASE-002',
				version: 1,
				payload: { x: 2 },
				payload_encrypted: 'also-already-encrypted'
			}
		];
		const { coll, updates } = makeFakeSnapshotCollection(docs);
		const { writer, entries } = makeAuditWriter();

		const result = await backfillSnapshots(coll as never, {
			ranBy: 'test',
			auditWriter: writer
		});

		expect(result.total_read).toBe(2);
		expect(result.total_encrypted).toBe(0);
		expect(result.total_skipped).toBe(2);
		expect(updates).toHaveLength(0);
		expect(entries).toHaveLength(0);
	});

	it('in passthrough mode, rows with plaintext payload but no encrypted are counted as skipped (not encrypted)', async () => {
		// CSFLE disabled → encryptSnapshotPayload returns null → row
		// counted as skipped (don't write null over null).
		const docs: FakeSnapshot[] = [
			{
				_id: new ObjectId(),
				case_id: 'CASE-001',
				version: 1,
				payload: { applicants: [{ name: 'Alice' }] }
			}
		];
		const { coll, updates } = makeFakeSnapshotCollection(docs);
		const { writer, entries } = makeAuditWriter();

		const result = await backfillSnapshots(coll as never, {
			ranBy: 'test',
			auditWriter: writer
		});

		expect(result.total_read).toBe(1);
		expect(result.total_encrypted).toBe(0);
		expect(result.total_skipped).toBe(1);
		expect(updates).toHaveLength(0);
		expect(entries).toHaveLength(0);
	});

	it('batch boundaries track cursor pagination correctly', async () => {
		const docs: FakeSnapshot[] = Array.from({ length: 7 }, () => ({
			_id: new ObjectId(),
			case_id: 'CASE-X',
			version: 1,
			payload: { x: 1 }
		}));
		const { coll } = makeFakeSnapshotCollection(docs);
		const { writer } = makeAuditWriter();

		const result = await backfillSnapshots(coll as never, {
			ranBy: 'test',
			auditWriter: writer,
			batchSize: 3
		});

		expect(result.batches).toHaveLength(3);
		expect(result.batches.map((b) => b.read_count)).toEqual([3, 3, 1]);
	});
});
