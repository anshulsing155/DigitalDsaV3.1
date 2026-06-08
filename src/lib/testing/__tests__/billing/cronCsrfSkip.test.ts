/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: every /api/cron/* endpoint must be SKIPPED by the global CSRF
 *           validator in hooks.server.ts (external schedulers can't carry
 *           a CSRF token; the endpoints have their own x-cron-secret auth)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * 2026-05-27 D.1 S3 cron-job.org wiring surfaced a latent pre-existing bug:
 * hooks.server.ts's validateCSRF() had no exemption for /api/cron/* routes.
 * Every cron endpoint (billing-pending-cleanup, data2-revoke-sweep,
 * data3-sweep, analytics-etl, and the new S3 billing-charge +
 * billing-charge-reminder) was silently 403-ing on real external scheduler
 * POSTs. The bug had hidden because:
 *   - the older crons (data2/data3/analytics) had never been wired to a
 *     production scheduler — they only run in dev where CSRF is skipped
 *     for localhost
 *   - the S2.1 billing-pending-cleanup smoke ran from local dev (skipped)
 *     and from ngrok (which the CSRF skip-on-localhost branch handles)
 *   - it took the first real cron-job.org → rinn.in POST to surface it
 *
 * The fix added a prefix-match skip for /api/cron/ in validateCSRF before
 * the publicEndpoints array check. That fix is what THIS test locks.
 *
 * SAFETY OF THE SKIP
 * ──────────────────
 * Every cron handler validates the `x-cron-secret` header against
 * `env.CRON_SECRET` (32+ char hex per Pitfall #60) and returns 401 on
 * mismatch. Without that header, the endpoint short-circuits BEFORE any
 * work happens. The CSRF skip doesn't open new attack surface — it just
 * lets the per-endpoint CRON_SECRET check do its job.
 *
 * THIS TEST
 * ─────────
 * Source-pattern scan of hooks.server.ts. Asserts that validateCSRF
 * contains a prefix-match skip for `/api/cron/` BEFORE the publicEndpoints
 * allowlist is consulted (ordering matters — a future contributor
 * shouldn't accidentally move the cron skip below an early-return).
 *
 * Same enforcement model as preSubmitConfirmWiring (Pitfall #47),
 * chargeEngineIdempotency (Pitfall #61), and the other static-source-pattern
 * scans.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HOOKS_PATH = resolve(process.cwd(), 'src/hooks.server.ts');

describe('hooks.server.ts CSRF skip for /api/webhook/ endpoints (SES bounce SNS)', () => {
	const src = readFileSync(HOOKS_PATH, 'utf8');

	it('validateCSRF skips /api/webhook/ prefix', () => {
		expect(src).toMatch(
			/url\.pathname\.startsWith\(\s*['"]\/api\/webhook\/['"]\s*\)[\s\S]{0,200}?return\s+true/
		);
	});
});

describe('hooks.server.ts CSRF skip for /api/cron/ endpoints', () => {
	const src = readFileSync(HOOKS_PATH, 'utf8');

	it('validateCSRF skips /api/cron/ prefix', () => {
		// Pattern: a `startsWith('/api/cron/')` check followed by `return true`
		// in the validateCSRF function. Be tolerant of formatting.
		expect(src).toMatch(
			/url\.pathname\.startsWith\(\s*['"]\/api\/cron\/['"]\s*\)[\s\S]{0,200}?return\s+true/
		);
	});

	it('the /api/cron/ skip appears BEFORE the publicEndpoints allowlist (ordering)', () => {
		const cronSkipIdx = src.indexOf("url.pathname.startsWith('/api/cron/')");
		const publicEndpointsIdx = src.indexOf('const publicEndpoints');
		expect(cronSkipIdx).toBeGreaterThan(-1);
		expect(publicEndpointsIdx).toBeGreaterThan(-1);
		expect(
			cronSkipIdx,
			'The /api/cron/ skip must appear before publicEndpoints declaration. ' +
				'If a future contributor moves it below, cron endpoints with paths that ' +
				'do NOT match an entry in publicEndpoints will 403 on external scheduler POSTs.'
		).toBeLessThan(publicEndpointsIdx);
	});

	it('the /api/cron/ skip is inside validateCSRF, not in some other function', () => {
		const cronSkipIdx = src.indexOf("url.pathname.startsWith('/api/cron/')");
		// Walk back to find the enclosing function. validateCSRF is the
		// CSRF function — confirm we're in it.
		const beforeChunk = src.slice(0, cronSkipIdx);
		const lastFnStart = beforeChunk.lastIndexOf('function validateCSRF');
		const anyOtherFnStart = beforeChunk.lastIndexOf('function ');
		expect(
			lastFnStart,
			'The /api/cron/ skip must live inside the validateCSRF function. ' +
				'If a refactor moved it to a different helper, the CSRF gate is no longer applying the skip.'
		).toBe(anyOtherFnStart);
	});
});
