/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Pitfall #59 — Token refresh scheduler must fire eagerly + coalesce calls
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * REPRO (user 2026-05-26): "Error 401 / Your session has expired. Please
 * log in again." on `localhost:5173/form/how-can-we-help`. Pitfall #54
 * added a proactive scheduler but it WAITS 13 minutes for the first tick
 * — if the (app) layout mounts ≥3 min after login (user landed on
 * dashboard first), the access token's 15-min TTL expires before the
 * scheduler's first refresh runs.
 *
 * FIX
 * ───
 * 1. `startTokenRefreshScheduler` fires an immediate refresh on call,
 *    THEN schedules the next at T+13min from that success. No more
 *    13-minute gap between mount and first refresh.
 *
 * 2. `requestTokenRefresh()` exposes the in-flight-coalescing singleton
 *    so the scheduler + `secureFetch` 401-retry share one round-trip.
 *    Without coalescing, near-simultaneous calls would both POST the
 *    same (now-stale) refresh token. The second hits the endpoint's
 *    token-reuse detection — which nukes ALL sessions for that user
 *    (see /api/auth/refresh-token line 99-128).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestTokenRefresh } from '$lib/utils/csrf';

// Set up the browser stub — the module's `browser` import comes from
// `$app/environment`. The vitest config maps this to a known value, but
// we keep tests focused on the pure-coalescing logic which doesn't need
// the timer side-effects.

describe('requestTokenRefresh — singleton coalescing (Pitfall #59)', () => {
	let fetchSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchSpy = vi.fn(async () => {
			// Simulate the refresh-token endpoint: 200 OK + { success: true }.
			return new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		});
		globalThis.fetch = fetchSpy as unknown as typeof fetch;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('two concurrent callers share ONE fetch round-trip', async () => {
		// Fire two calls in parallel — the singleton should coalesce them.
		// Without coalescing, both would POST the same refresh token and
		// the server's token-reuse detection would nuke the session.
		const [a, b] = await Promise.all([requestTokenRefresh(), requestTokenRefresh()]);

		expect(a).toBe(true);
		expect(b).toBe(true);
		// EXACTLY ONE underlying fetch call — that's the contract.
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('sequential calls after the first completes each hit fetch fresh', async () => {
		await requestTokenRefresh();
		await requestTokenRefresh();
		// Two sequential calls = two fetches (singleton only coalesces concurrent calls).
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	it('returns false when the refresh endpoint reports success:false', async () => {
		fetchSpy.mockImplementationOnce(async () => {
			return new Response(JSON.stringify({ success: false, error: 'Refresh token expired' }), {
				status: 200
			});
		});
		const ok = await requestTokenRefresh();
		expect(ok).toBe(false);
	});

	it('returns false on a network error without throwing', async () => {
		fetchSpy.mockImplementationOnce(async () => {
			throw new TypeError('Network error');
		});
		const ok = await requestTokenRefresh();
		expect(ok).toBe(false);
	});

	it('clears the in-flight singleton after completion so future calls fire fresh', async () => {
		await requestTokenRefresh();
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		// A subsequent call should issue a NEW fetch (singleton was cleared
		// in the `finally`).
		await requestTokenRefresh();
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});
});

// ── Source-pattern lock — Pitfall #59 ──────────────────────────────────

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../../../..');

describe('Pitfall #59 source-pattern lock', () => {
	it('startTokenRefreshScheduler fires an immediate refresh (not just a setTimeout)', () => {
		const src = readFileSync(resolve(REPO_ROOT, 'src/lib/utils/csrf.ts'), 'utf8');
		// The function body must mention requestTokenRefresh BEFORE setTimeout —
		// i.e., an eager first-pass refresh. Strict: requestTokenRefresh()
		// must be invoked from inside startTokenRefreshScheduler.
		const fnMatch = src.match(
			/export function startTokenRefreshScheduler\(\)[\s\S]*?\n\}\n/
		);
		expect(fnMatch, 'startTokenRefreshScheduler not found').toBeTruthy();
		expect(fnMatch![0]).toMatch(/requestTokenRefresh\(/);
	});

	it('secureFetch uses requestTokenRefresh (not inline refreshInFlight assignment)', () => {
		const src = readFileSync(resolve(REPO_ROOT, 'src/lib/utils/csrf.ts'), 'utf8');
		// The 401-retry path inside secureFetch must use the public wrapper —
		// inline `refreshInFlight = attemptTokenRefresh()` re-opens the race.
		// Find the 401-retry block.
		expect(src).toMatch(/response\.status === 401[\s\S]{0,400}requestTokenRefresh\(/);
	});
});
