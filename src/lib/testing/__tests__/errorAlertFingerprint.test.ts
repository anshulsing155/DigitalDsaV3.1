/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: SSR error alerts with status < 500 (bot probes + intentional
 *           load-function 404s) share a single dedup fingerprint and a
 *           1-hour dedup window. Everything else (genuine 5xx + client-side
 *           exceptions) keeps the original per-path/per-stack-frame
 *           fingerprint and the 15-minute window.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * 2026-06-01: production inbox was flooded ~weekly by bot reconnaissance.
 * The Vercel deploys at https://www.rinn.in (rinn team) showed batches of 12+
 * "[DigitalDSA SSR] Not found: <path>" emails arriving within seconds — one
 * per probe path (e.g. /_next/static/buildManifest.js, /config/application.
 * properties, /.aws/credentials, /storage/logs/laravel.log).
 *
 * Each path generates a distinct fingerprint under the original rule, so the
 * 15-minute per-fingerprint dedup never fires across a scanner's path-sweep.
 * The 30/hour global cap absorbs the first 30 emails and then silently drops
 * the rest — including any genuine 5xx errors that happen to land in the
 * same hour. The cap-burn is the real cost: real bugs disappear during scan
 * campaigns.
 *
 * WHY A LOCK TEST
 * ───────────────
 * The fingerprint logic is a hot path with no observable signal in normal
 * dev (you only notice it broke if scanner emails start arriving again). If
 * a future refactor accidentally drops the sub-500 collapse — say someone
 * "cleans up" the unused `status` field, or splits fingerprint() into per-
 * source helpers and forgets the sub-500 branch — there's nothing else in
 * the codebase that would catch it before production traffic. The cost of
 * the regression is real inbox damage + silently-dropped real alerts during
 * the next scan campaign. Per CLAUDE.md §16 #14, "new lock tests that replace
 * recurring manual audit work" are a legitimate new-file justification.
 *
 * WHAT THIS TEST GUARDS
 * ─────────────────────
 *   1. SSR + status 404 collapses to SUB500_NOISE_FP regardless of path.
 *   2. SSR + status 401 / 403 also collapse to SUB500_NOISE_FP.
 *   3. SSR + status 500 / 503 keep their per-path/per-stack fingerprint.
 *   4. Client errors keep per-path fingerprints even if a status is set
 *      (defence: client errors are JS exceptions, status is semantically
 *      meaningless there — must not collapse).
 *   5. The collapsed bucket gets the 1-hour window via dedupWindowFor().
 *   6. Missing status defaults to the alert path (safer than silent suppress).
 */

import { describe, it, expect } from 'vitest';
import {
	fingerprint,
	dedupWindowFor,
	SUB500_NOISE_FP,
	type ErrorAlertPayload
} from '$lib/server/errorAlert';

// Compose a payload with sensible defaults so each test only spells out the
// fields it actually exercises.
function makePayload(overrides: Partial<ErrorAlertPayload> = {}): ErrorAlertPayload {
	return {
		source: 'ssr',
		message: 'Not found: /some/path',
		path: '/some/path',
		timestamp: '2026-06-01T00:00:00.000Z',
		...overrides
	};
}

describe('errorAlert fingerprint — sub-500 collapse', () => {
	it('SSR 404 on /foo and SSR 404 on /bar share the SUB500_NOISE_FP bucket', () => {
		const a = fingerprint(makePayload({ status: 404, path: '/foo' }));
		const b = fingerprint(makePayload({ status: 404, path: '/bar' }));
		expect(a).toBe(SUB500_NOISE_FP);
		expect(b).toBe(SUB500_NOISE_FP);
		expect(a).toBe(b);
	});

	it('SSR 401 collapses to SUB500_NOISE_FP', () => {
		const fp = fingerprint(makePayload({ status: 401, path: '/dashboard/admin' }));
		expect(fp).toBe(SUB500_NOISE_FP);
	});

	it('SSR 403 collapses to SUB500_NOISE_FP', () => {
		const fp = fingerprint(makePayload({ status: 403, path: '/api/admin/users' }));
		expect(fp).toBe(SUB500_NOISE_FP);
	});

	it('SSR 499 (last sub-500) still collapses', () => {
		// 499 isn't standard but some proxies use it; the rule is < 500, not == 4xx.
		const fp = fingerprint(makePayload({ status: 499, path: '/x' }));
		expect(fp).toBe(SUB500_NOISE_FP);
	});
});

describe('errorAlert fingerprint — 5xx is NOT collapsed', () => {
	it('SSR 500 on different paths produces different fingerprints', () => {
		const a = fingerprint(makePayload({ status: 500, path: '/foo', stack: 'Error\n    at f (foo.ts:1:1)' }));
		const b = fingerprint(makePayload({ status: 500, path: '/bar', stack: 'Error\n    at g (bar.ts:1:1)' }));
		expect(a).not.toBe(b);
		expect(a).not.toBe(SUB500_NOISE_FP);
		expect(b).not.toBe(SUB500_NOISE_FP);
	});

	it('SSR 503 keeps per-path fingerprinting', () => {
		const fp = fingerprint(makePayload({ status: 503, path: '/api/billing' }));
		expect(fp).not.toBe(SUB500_NOISE_FP);
		expect(fp).toContain('/api/billing');
	});

	it('SSR with missing status defaults to alert path (per ErrorAlertPayload contract)', () => {
		// Defensive: if upstream forgets to pass status, we must NOT collapse
		// silently — a missed real error is worse than an extra scanner email.
		const fp = fingerprint(makePayload({ path: '/critical' }));
		expect(fp).not.toBe(SUB500_NOISE_FP);
		expect(fp).toContain('/critical');
	});
});

describe('errorAlert fingerprint — client errors never collapse', () => {
	it('client error with status 404 keeps per-path fingerprint', () => {
		// Client errors are JS exceptions thrown in the browser. They have no
		// HTTP status semantically, and the alerter must not collapse them even
		// if some caller accidentally passes one. The status check is gated on
		// `source === 'ssr'`.
		const fp = fingerprint(makePayload({ source: 'client', status: 404, path: '/x' }));
		expect(fp).not.toBe(SUB500_NOISE_FP);
		expect(fp.startsWith('client|')).toBe(true);
	});

	it('two client errors on the same path with different stacks differ', () => {
		const a = fingerprint(
			makePayload({ source: 'client', path: '/x', stack: 'TypeError\n    at a (a.ts:1)' })
		);
		const b = fingerprint(
			makePayload({ source: 'client', path: '/x', stack: 'TypeError\n    at b (b.ts:1)' })
		);
		expect(a).not.toBe(b);
	});
});

describe('errorAlert dedup window selection', () => {
	const FIFTEEN_MIN = 15 * 60 * 1000;
	const ONE_HOUR = 60 * 60 * 1000;

	it('SUB500_NOISE_FP gets the 1-hour window', () => {
		expect(dedupWindowFor(SUB500_NOISE_FP)).toBe(ONE_HOUR);
	});

	it('a per-path 5xx fingerprint gets the 15-minute window', () => {
		const fp = fingerprint(
			makePayload({ status: 500, path: '/x', stack: 'Error\n    at f (f.ts:1)' })
		);
		expect(dedupWindowFor(fp)).toBe(FIFTEEN_MIN);
	});

	it('a client fingerprint gets the 15-minute window', () => {
		const fp = fingerprint(makePayload({ source: 'client', path: '/x' }));
		expect(dedupWindowFor(fp)).toBe(FIFTEEN_MIN);
	});
});
