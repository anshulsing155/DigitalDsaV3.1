/**
 * D.1 S3 — cronLock tests
 * ══════════════════════════════════════════════════════════════════
 * Covers acquire / extend / release / contention. Mongo CronLocks is
 * fully mocked. Same pattern as subscriptionStore.test.ts.
 *
 * The lifetime-of-batch heartbeat pattern (withCronLock) is left to
 * integration testing — it uses setInterval which fights timer mocks
 * across vitest's environment. The unit primitives are what we lock here.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindOneAndUpdate = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	CronLocks: {
		findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args)
	}
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import {
	acquireCronLock,
	extendCronLock,
	releaseCronLock,
	DEFAULT_LOCK_TTL_MS
} from '$lib/server/billing/cronLock';

beforeEach(() => {
	mockFindOneAndUpdate.mockReset();
});

describe('acquireCronLock', () => {
	it('returns a handle on success', async () => {
		mockFindOneAndUpdate.mockImplementation(async (_filter, update) => {
			// Echo back the assigned holder_id.
			return {
				name: 'billing-charge',
				holder_id: update.$set.holder_id,
				expires_at: update.$set.expires_at,
				released_at: null
			};
		});

		const handle = await acquireCronLock('billing-charge');

		expect(handle).not.toBeNull();
		expect(handle?.name).toBe('billing-charge');
		expect(handle?.holder_id).toMatch(/^[0-9a-f-]{36}$/); // UUID v4 shape
	});

	it('returns null on E11000 (contention)', async () => {
		mockFindOneAndUpdate.mockRejectedValue({ code: 11000, message: 'duplicate key' });
		const handle = await acquireCronLock('billing-charge');
		expect(handle).toBeNull();
	});

	it('returns null when findOneAndUpdate reports a different holder', async () => {
		// findOneAndUpdate returned a doc but with a different holder_id —
		// theoretical edge case but the code path is real (interleaving).
		mockFindOneAndUpdate.mockResolvedValue({
			name: 'billing-charge',
			holder_id: 'some-other-holder',
			expires_at: new Date(),
			released_at: null
		});
		const handle = await acquireCronLock('billing-charge');
		expect(handle).toBeNull();
	});

	it('rethrows non-E11000 errors', async () => {
		mockFindOneAndUpdate.mockRejectedValue(new Error('connection refused'));
		await expect(acquireCronLock('billing-charge')).rejects.toThrow('connection refused');
	});

	it('uses DEFAULT_LOCK_TTL_MS when ttl not specified', async () => {
		const now = new Date('2026-06-04T12:00:00Z');
		mockFindOneAndUpdate.mockImplementation(async (_filter, update) => ({
			name: 'billing-charge',
			holder_id: update.$set.holder_id,
			expires_at: update.$set.expires_at,
			released_at: null
		}));

		await acquireCronLock('billing-charge', undefined, now);

		const call = mockFindOneAndUpdate.mock.calls[0];
		const update = call[1] as { $set: { expires_at: Date } };
		expect(update.$set.expires_at.getTime()).toBe(now.getTime() + DEFAULT_LOCK_TTL_MS);
	});
});

describe('extendCronLock', () => {
	it('returns true when the lock is still ours', async () => {
		mockFindOneAndUpdate.mockResolvedValue({
			name: 'billing-charge',
			holder_id: 'my-id',
			expires_at: new Date(),
			released_at: null
		});
		const ok = await extendCronLock({ name: 'billing-charge', holder_id: 'my-id' });
		expect(ok).toBe(true);
		// Filter MUST include holder_id and released_at: null.
		const filter = mockFindOneAndUpdate.mock.calls[0][0] as Record<string, unknown>;
		expect(filter.holder_id).toBe('my-id');
		expect(filter.released_at).toBeNull();
	});

	it('returns false when the lock is no longer ours (heartbeat after hijack)', async () => {
		mockFindOneAndUpdate.mockResolvedValue(null);
		const ok = await extendCronLock({ name: 'billing-charge', holder_id: 'my-id' });
		expect(ok).toBe(false);
	});
});

describe('releaseCronLock', () => {
	it('returns true when the release succeeds', async () => {
		mockFindOneAndUpdate.mockResolvedValue({
			name: 'billing-charge',
			holder_id: 'my-id',
			released_at: new Date()
		});
		const ok = await releaseCronLock({ name: 'billing-charge', holder_id: 'my-id' });
		expect(ok).toBe(true);
	});

	it('returns false on no-op (lock was not ours)', async () => {
		mockFindOneAndUpdate.mockResolvedValue(null);
		const ok = await releaseCronLock({ name: 'billing-charge', holder_id: 'my-id' });
		expect(ok).toBe(false);
	});
});
