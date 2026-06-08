/**
 * Lock test — /api/cron/keep-warm must use the unified CRON_SECRET /
 * x-cron-secret auth pattern, not the retired HEALTH_PING_SECRET /
 * x-warm-secret pair.
 *
 * Background (S221+1, 2026-06-03):
 * The S219 keep-warm work introduced (a) a separate `HEALTH_PING_SECRET`
 * env var + `x-warm-secret` header, and (b) put the endpoint at
 * `/api/health` outside the `/api/cron/*` prefix that the existing
 * architectural lock (cronEndpointPathConvention.test.ts) requires for
 * any cron-secret-gated route. Owner called both out as redundant.
 *
 * S221+1 unification:
 *   - Auth → uses CRON_SECRET + x-cron-secret (same as billing crons)
 *   - Path → git mv'd from /api/health to /api/cron/keep-warm so the
 *     architectural lock passes by virtue of compliance, not exemption
 *
 * This lock test asserts:
 *   - The keep-warm endpoint exists at /api/cron/keep-warm
 *   - It reads env.CRON_SECRET (not env.HEALTH_PING_SECRET)
 *   - It expects the x-cron-secret header (not x-warm-secret)
 *   - The retired names don't appear in the file at all (catches a
 *     half-done future refactor that swaps one and forgets the other)
 *   - The setup-cron-jobs.mjs script has a keepwarm-health entry that
 *     points at the new path
 *
 * If a future refactor reintroduces a separate keep-warm secret or
 * relocates the endpoint outside /api/cron/, this test trips.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const KEEP_WARM_ENDPOINT_PATH = resolve(
	process.cwd(),
	'src/routes/api/cron/keep-warm/+server.ts'
);
const SETUP_SCRIPT_PATH = resolve(process.cwd(), 'scripts/setup-cron-jobs.mjs');

describe('/api/cron/keep-warm — locked to unified CRON_SECRET pattern', () => {
	const src = readFileSync(KEEP_WARM_ENDPOINT_PATH, 'utf8');

	it('reads env.CRON_SECRET (the shared cron-endpoint secret)', () => {
		expect(src).toMatch(/env\.CRON_SECRET/);
	});

	it('expects the x-cron-secret header on the request', () => {
		expect(src).toMatch(/['"]x-cron-secret['"]/);
	});

	it('does NOT reference the retired HEALTH_PING_SECRET env var', () => {
		// Half-done refactors (one site swapped, another forgotten) would
		// silently break auth — this catches them.
		expect(src).not.toMatch(/HEALTH_PING_SECRET/);
	});

	it('does NOT reference the retired x-warm-secret header', () => {
		expect(src).not.toMatch(/x-warm-secret/);
	});

	it('still implements the secret-gated DB ping pattern (preserves anti-abuse)', () => {
		// Without the secret, the endpoint still wakes the function but
		// skips the DB call — anti-crawler protection. If a future refactor
		// drops the gate, every random internet hit would burn a Mongo ping.
		expect(src).toMatch(/shouldPingDb/);
		expect(src).toMatch(/db:\s*['"]skipped['"]/);
	});
});

describe('scripts/setup-cron-jobs.mjs — keepwarm-health entry', () => {
	const src = readFileSync(SETUP_SCRIPT_PATH, 'utf8');

	it('has a keepwarm-health job entry', () => {
		expect(src).toMatch(/title:\s*['"]keepwarm-health['"]/);
	});

	it('keep-warm entry uses GET (not POST like the billing crons)', () => {
		// Pull the keepwarm-health spec block and assert requestMethodHttp: 'GET'.
		const block = src.match(/title:\s*['"]keepwarm-health['"][\s\S]*?\n\t\}/);
		expect(block).not.toBeNull();
		expect(block![0]).toMatch(/requestMethodHttp:\s*['"]GET['"]/);
	});

	it('keep-warm entry points at /api/cron/keep-warm (under the cron prefix)', () => {
		const block = src.match(/title:\s*['"]keepwarm-health['"][\s\S]*?\n\t\}/);
		expect(block![0]).toMatch(/\/api\/cron\/keep-warm/);
		// The old /api/health URL must NOT be the target — that would put
		// the endpoint outside the architectural cron-prefix lock.
		expect(block![0]).not.toMatch(/\/api\/health(?![/-])/);
	});

	it('keep-warm entry uses Asia/Kolkata tz with business-hours range', () => {
		const block = src.match(/title:\s*['"]keepwarm-health['"][\s\S]*?\n\t\}/);
		expect(block![0]).toMatch(/timezone:\s*['"]Asia\/Kolkata['"]/);
		// hours array should include 9 (start) and 22 (last hour).
		expect(block![0]).toMatch(/hours:\s*\[[^\]]*\b9\b[^\]]*\b22\b/);
	});

	it('keep-warm entry has tight 8s timeout (vs default 60s for billing crons)', () => {
		const block = src.match(/title:\s*['"]keepwarm-health['"][\s\S]*?\n\t\}/);
		expect(block![0]).toMatch(/requestTimeoutSec:\s*8/);
	});
});
