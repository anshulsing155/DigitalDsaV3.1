/**
 * DATA-3 — ImageKit delete wrapper.
 *
 * The retry policy and outcome classification are the load-bearing parts
 * of sub-session (c). Tests pass a fake ImageKit client + a no-op sleep so
 * we can exercise the retry loop in milliseconds, not minutes.
 */

import { describe, it, expect, vi } from 'vitest';
import {
	attemptDelete,
	deleteWithRetry,
	DEFAULT_RETRY_DELAYS_MS,
	type ImagekitDeleteClient,
	type ImagekitDeleteOutcome
} from '$lib/server/data3/imagekitDelete';

function fakeClient(impl: (fileId: string) => Promise<unknown>): ImagekitDeleteClient {
	return { files: { delete: impl } };
}

function httpError(status: number, message = 'http error'): Error & { status: number } {
	const e = new Error(message) as Error & { status: number };
	e.status = status;
	return e;
}

describe('attemptDelete — single-call classification', () => {
	it('200 → success', async () => {
		const client = fakeClient(async () => ({}));
		const r = await attemptDelete(client, 'IK-abc');
		expect(r.kind).toBe('success');
	});

	it('404 → already_deleted (file already gone, treated as success per spec §8)', async () => {
		const client = fakeClient(async () => {
			throw httpError(404, 'Not found');
		});
		const r = await attemptDelete(client, 'IK-abc');
		expect(r.kind).toBe('already_deleted');
	});

	it('500 → transient_failure', async () => {
		const client = fakeClient(async () => {
			throw httpError(500, 'Internal server error');
		});
		const r = await attemptDelete(client, 'IK-abc');
		expect(r.kind).toBe('transient_failure');
		if (r.kind === 'transient_failure') expect(r.error_code).toBe('IMAGEKIT_500');
	});

	it('503 → transient_failure', async () => {
		const client = fakeClient(async () => {
			throw httpError(503);
		});
		const r = await attemptDelete(client, 'IK-abc');
		expect(r.kind).toBe('transient_failure');
	});

	it('401 → permanent_failure (bad credentials, no retry)', async () => {
		const client = fakeClient(async () => {
			throw httpError(401, 'Unauthorized');
		});
		const r = await attemptDelete(client, 'IK-abc');
		expect(r.kind).toBe('permanent_failure');
		if (r.kind === 'permanent_failure') expect(r.error_code).toBe('IMAGEKIT_401');
	});

	it('400 → permanent_failure (malformed fileId)', async () => {
		const client = fakeClient(async () => {
			throw httpError(400);
		});
		const r = await attemptDelete(client, 'bad');
		expect(r.kind).toBe('permanent_failure');
	});

	it('network error (no status) → transient_failure with code NETWORK', async () => {
		const client = fakeClient(async () => {
			throw new Error('ECONNRESET');
		});
		const r = await attemptDelete(client, 'IK-abc');
		expect(r.kind).toBe('transient_failure');
		if (r.kind === 'transient_failure') expect(r.error_code).toBe('NETWORK');
	});

	it('reads status from `statusCode` field (driver variation)', async () => {
		const client = fakeClient(async () => {
			const e = new Error('alt shape') as Error & { statusCode: number };
			e.statusCode = 500;
			throw e;
		});
		const r = await attemptDelete(client, 'IK-abc');
		expect(r.kind).toBe('transient_failure');
		if (r.kind === 'transient_failure') expect(r.error_code).toBe('IMAGEKIT_500');
	});

	it('reads status from `response.status` (third driver variation)', async () => {
		const client = fakeClient(async () => {
			const e = new Error('wrapped') as Error & { response: { status: number } };
			e.response = { status: 404 };
			throw e;
		});
		const r = await attemptDelete(client, 'IK-abc');
		expect(r.kind).toBe('already_deleted');
	});
});

describe('deleteWithRetry — policy behavior', () => {
	// Each test creates its own `noSleep` fake so call counts don't leak
	// across cases. A shared `vi.fn` at describe scope was the trap that
	// caused 3 false positives during initial development.

	it('immediate success after one attempt', async () => {
		const noSleep = vi.fn(async () => {});
		const client = fakeClient(async () => ({ ok: true }));
		const r = await deleteWithRetry({ client, fileId: 'IK-abc', sleep: noSleep });
		expect(r.kind).toBe('success');
		if (r.kind === 'success') expect(r.attempts).toBe(1);
		expect(noSleep).not.toHaveBeenCalled();
	});

	it('already-deleted on first attempt → resolves without retry', async () => {
		const noSleep = vi.fn(async () => {});
		const client = fakeClient(async () => {
			throw httpError(404);
		});
		const r = await deleteWithRetry({ client, fileId: 'IK-abc', sleep: noSleep });
		expect(r.kind).toBe('already_deleted');
		if (r.kind === 'already_deleted') expect(r.attempts).toBe(1);
		expect(noSleep).not.toHaveBeenCalled();
	});

	it('transient → success on second attempt', async () => {
		const noSleep = vi.fn(async () => {});
		let calls = 0;
		const client = fakeClient(async () => {
			calls++;
			if (calls < 2) throw httpError(500);
			return { ok: true };
		});
		const r = await deleteWithRetry({ client, fileId: 'IK-abc', sleep: noSleep });
		expect(r.kind).toBe('success');
		if (r.kind === 'success') expect(r.attempts).toBe(2);
		expect(noSleep).toHaveBeenCalledTimes(1);
	});

	it('all 4 attempts (initial + 3 retries) fail transiently → abandoned', async () => {
		const noSleep = vi.fn(async () => {});
		const client = fakeClient(async () => {
			throw httpError(503);
		});
		const r = await deleteWithRetry({ client, fileId: 'IK-abc', sleep: noSleep });
		expect(r.kind).toBe('abandoned');
		if (r.kind === 'abandoned') {
			expect(r.attempts).toBe(4); // 1 initial + 3 retries
			expect(r.error_code).toBe('IMAGEKIT_503');
		}
		expect(noSleep).toHaveBeenCalledTimes(3); // sleeps BETWEEN attempts
	});

	it('permanent failure on first attempt → abandoned immediately, no retries', async () => {
		const noSleep = vi.fn(async () => {});
		const client = fakeClient(async () => {
			throw httpError(401);
		});
		const r = await deleteWithRetry({ client, fileId: 'IK-abc', sleep: noSleep });
		expect(r.kind).toBe('abandoned');
		if (r.kind === 'abandoned') {
			expect(r.attempts).toBe(1);
			expect(r.error_code).toBe('IMAGEKIT_401');
		}
		expect(noSleep).not.toHaveBeenCalled();
	});

	it('reports each attempt to onAttempt hook in order', async () => {
		const noSleep = vi.fn(async () => {});
		let calls = 0;
		const client = fakeClient(async () => {
			calls++;
			if (calls < 3) throw httpError(500);
			return { ok: true };
		});

		const seen: Array<{ n: number; kind: ImagekitDeleteOutcome['kind'] }> = [];
		const onAttempt = vi.fn(async (n: number, outcome: ImagekitDeleteOutcome) => {
			seen.push({ n, kind: outcome.kind });
		});

		await deleteWithRetry({ client, fileId: 'IK-abc', sleep: noSleep, onAttempt });

		expect(seen).toEqual([
			{ n: 1, kind: 'transient_failure' },
			{ n: 2, kind: 'transient_failure' },
			{ n: 3, kind: 'success' }
		]);
	});

	it('honors a custom retry delay schedule', async () => {
		const noSleep = vi.fn(async () => {});
		const client = fakeClient(async () => {
			throw httpError(500);
		});
		const r = await deleteWithRetry({
			client,
			fileId: 'IK-abc',
			retryDelaysMs: [1, 2], // only 2 retries; total 3 attempts
			sleep: noSleep
		});
		expect(r.kind).toBe('abandoned');
		if (r.kind === 'abandoned') expect(r.attempts).toBe(3);
		expect(noSleep).toHaveBeenCalledTimes(2);
	});

	it('default retry delays match the spec (10s / 60s / 300s)', () => {
		expect(DEFAULT_RETRY_DELAYS_MS).toEqual([10_000, 60_000, 300_000]);
	});

	it('sleeps with the correct durations between attempts', async () => {
		const client = fakeClient(async () => {
			throw httpError(500);
		});
		const sleepCalls: number[] = [];
		const sleep = vi.fn(async (ms: number) => {
			sleepCalls.push(ms);
		});

		await deleteWithRetry({
			client,
			fileId: 'IK-abc',
			retryDelaysMs: [100, 200, 300],
			sleep
		});

		expect(sleepCalls).toEqual([100, 200, 300]);
	});
});
