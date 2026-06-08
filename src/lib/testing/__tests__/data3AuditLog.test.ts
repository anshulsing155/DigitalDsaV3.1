/**
 * DATA-3 — Audit-log write helpers.
 *
 * `recordDeletionStart` writes the in-flight audit row BEFORE the ImageKit
 * call. `recordDeletionOutcome` flips it to success/failed after.
 *
 * Tests use a fake collection so we don't touch Atlas. Duplicate-key handling
 * is the load-bearing case: a re-issued (case_id, doc_id, attempt_n) tuple
 * triggers the unique-index error and must surface as `{ ok: false,
 * reason: 'duplicate' }` — not propagate as an exception.
 */

import { describe, it, expect, vi } from 'vitest';
import {
	recordDeletionStart,
	recordDeletionOutcome,
	scrubResponse,
	type ArtifactDeletionLogCollection,
	type RecordDeletionStartArgs
} from '$lib/server/data3/auditLog';

function fakeCollection(
	overrides: Partial<ArtifactDeletionLogCollection> = {}
): ArtifactDeletionLogCollection {
	return {
		insertOne: vi.fn(async () => ({ acknowledged: true, insertedId: 'fake-id' as never })),
		updateOne: vi.fn(async () => ({
			acknowledged: true,
			matchedCount: 1,
			modifiedCount: 1,
			upsertedCount: 0,
			upsertedId: null
		})),
		findOne: vi.fn(async () => null),
		...overrides
	} as ArtifactDeletionLogCollection;
}

const baseStartArgs = (overrides: Partial<RecordDeletionStartArgs> = {}): RecordDeletionStartArgs => ({
	case_id: 'CASE-001',
	lender_application_id: 'LA-001',
	document_checklist_id: 'DOC-001',
	doc_type: 'bank_statement_3m',
	tier: 'financial',
	file_id: 'IK-abc123',
	file_size: 102400,
	file_type: 'application/pdf',
	uploaded_at: new Date('2026-04-01T00:00:00.000Z'),
	reason: 'verified_floor_elapsed',
	extraction_status_at_delete: 'deletion_pending',
	verified_at: new Date('2026-04-15T00:00:00.000Z'),
	retention_floor_days: 30,
	actor: 'system_sweep',
	actor_id: null,
	attempt_n: 1,
	now: new Date('2026-05-16T00:00:00.000Z'),
	...overrides
});

describe('recordDeletionStart — happy path', () => {
	it('inserts the audit row with status="in_flight"', async () => {
		const insertOne = vi.fn(async () => ({
			acknowledged: true,
			insertedId: 'inserted-1' as never
		}));
		const col = fakeCollection({ insertOne });

		const result = await recordDeletionStart(col, baseStartArgs());

		expect(result.ok).toBe(true);
		if (result.ok) expect(result.id).toBe('inserted-1');
		expect(insertOne).toHaveBeenCalledOnce();
		const inserted = (insertOne.mock.calls[0] as unknown as [Record<string, unknown>])[0];
		expect(inserted.status).toBe('in_flight');
		expect(inserted.completed_at).toBeNull();
		expect(inserted.imagekit_response).toBeNull();
	});

	it('preserves every input field in the inserted document', async () => {
		const insertOne = vi.fn(async () => ({ acknowledged: true, insertedId: 'x' as never }));
		const col = fakeCollection({ insertOne });

		await recordDeletionStart(col, baseStartArgs({ attempt_n: 3, actor: 'admin', actor_id: 'admin-42' }));

		const inserted = (insertOne.mock.calls[0] as unknown as [Record<string, unknown>])[0];
		expect(inserted.attempt_n).toBe(3);
		expect(inserted.actor).toBe('admin');
		expect(inserted.actor_id).toBe('admin-42');
		expect(inserted.file_id).toBe('IK-abc123');
		expect(inserted.tier).toBe('financial');
	});
});

describe('recordDeletionStart — duplicate-key handling', () => {
	it('returns ok=false, reason=duplicate when index 11000 trips', async () => {
		const err: Error & { code?: number } = new Error('E11000 duplicate key');
		err.code = 11000;
		const insertOne = vi.fn(async () => {
			throw err;
		});
		const col = fakeCollection({ insertOne });

		const result = await recordDeletionStart(col, baseStartArgs());

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('duplicate');
	});

	it('returns ok=false, reason=mongo_error for non-duplicate failures', async () => {
		const err = new Error('Atlas timeout');
		const insertOne = vi.fn(async () => {
			throw err;
		});
		const col = fakeCollection({ insertOne });

		const result = await recordDeletionStart(col, baseStartArgs());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.reason).toBe('mongo_error');
			expect(result.error).toBe(err);
		}
	});

	it('treats codeName === "DuplicateKey" as duplicate (driver-version-safe)', async () => {
		const err: Error & { codeName?: string } = new Error('dup');
		err.codeName = 'DuplicateKey';
		const insertOne = vi.fn(async () => {
			throw err;
		});
		const col = fakeCollection({ insertOne });

		const result = await recordDeletionStart(col, baseStartArgs());

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('duplicate');
	});
});

describe('recordDeletionOutcome', () => {
	const baseId = 'audit-row-1';

	it('flips an in-flight row to success', async () => {
		const updateOne = vi.fn(async () => ({
			acknowledged: true,
			matchedCount: 1,
			modifiedCount: 1,
			upsertedCount: 0,
			upsertedId: null
		}));
		const col = fakeCollection({ updateOne });

		const result = await recordDeletionOutcome(col, {
			id: baseId,
			now: new Date('2026-05-16T10:00:00.000Z'),
			outcome: { status: 'success', imagekit_response: '200 OK' }
		});

		expect(result.ok).toBe(true);
		expect(updateOne).toHaveBeenCalledOnce();
		const [, update] = updateOne.mock.calls[0] as unknown as [unknown, { $set: Record<string, unknown> }];
		expect(update.$set.status).toBe('success');
		expect(update.$set.imagekit_response).toBe('200 OK');
		expect(update.$set.error_code).toBeUndefined();
	});

	it('flips an in-flight row to failed and captures error_code', async () => {
		const updateOne = vi.fn(async () => ({
			acknowledged: true,
			matchedCount: 1,
			modifiedCount: 1,
			upsertedCount: 0,
			upsertedId: null
		}));
		const col = fakeCollection({ updateOne });

		await recordDeletionOutcome(col, {
			id: baseId,
			now: new Date(),
			outcome: { status: 'failed', error_code: 'IMAGEKIT_5XX', imagekit_response: '503' }
		});

		const [, update] = updateOne.mock.calls[0] as unknown as [unknown, { $set: Record<string, unknown> }];
		expect(update.$set.status).toBe('failed');
		expect(update.$set.error_code).toBe('IMAGEKIT_5XX');
		expect(update.$set.imagekit_response).toBe('503');
	});

	it('returns ok=false when the row is not found', async () => {
		const updateOne = vi.fn(async () => ({
			acknowledged: true,
			matchedCount: 0,
			modifiedCount: 0,
			upsertedCount: 0,
			upsertedId: null
		}));
		const col = fakeCollection({ updateOne });

		const result = await recordDeletionOutcome(col, {
			id: 'missing-id',
			now: new Date(),
			outcome: { status: 'success', imagekit_response: null }
		});

		expect(result.ok).toBe(false);
	});

	it('returns ok=false on Mongo error', async () => {
		const err = new Error('Mongo down');
		const updateOne = vi.fn(async () => {
			throw err;
		});
		const col = fakeCollection({ updateOne });

		const result = await recordDeletionOutcome(col, {
			id: 'x',
			now: new Date(),
			outcome: { status: 'success', imagekit_response: null }
		});

		expect(result.ok).toBe(false);
		expect(result.error).toBe(err);
	});
});

describe('scrubResponse', () => {
	it('returns null for null/undefined', () => {
		expect(scrubResponse(null)).toBeNull();
		expect(scrubResponse(undefined)).toBeNull();
	});

	it('stringifies Error → "name: message"', () => {
		const e = new Error('something exploded');
		expect(scrubResponse(e)).toBe('Error: something exploded');
	});

	it('preserves named error types', () => {
		class CustomError extends Error {
			override name = 'CustomError';
		}
		expect(scrubResponse(new CustomError('boom'))).toBe('CustomError: boom');
	});

	it('JSON-stringifies plain objects', () => {
		expect(scrubResponse({ statusCode: 404, body: 'not found' })).toBe(
			'{"statusCode":404,"body":"not found"}'
		);
	});

	it('passes strings through unchanged', () => {
		expect(scrubResponse('200 OK')).toBe('200 OK');
	});

	it('caps output at 2 KB with ellipsis', () => {
		const huge = 'x'.repeat(5000);
		const out = scrubResponse(huge);
		expect(out).not.toBeNull();
		expect(out!.length).toBeLessThanOrEqual(2048);
		expect(out!.endsWith('...')).toBe(true);
	});

	it('falls back to String() for non-serializable values', () => {
		const circular: Record<string, unknown> = {};
		circular.self = circular;
		const out = scrubResponse(circular);
		expect(typeof out).toBe('string');
		expect(out!.length).toBeGreaterThan(0);
	});
});
