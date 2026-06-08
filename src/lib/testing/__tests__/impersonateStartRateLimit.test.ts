/**
 * Contract: the admin impersonate-start endpoint is rate-limited.
 * ═══════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * The /api/admin/impersonate/start endpoint creates a signed cookie that
 * lets the admin navigate the target user's dashboard. It writes a
 * PolicyAuditLog row per invocation and is gated to admin-only via
 * requireRoleApi(['admin']). Code review 2026-05-23 (finding F1) flagged
 * the absence of a rate-limit: a compromised admin account could burst
 * thousands of impersonations between detection and lockout — bounded
 * by the audit trail post-hoc but unbounded in real time.
 *
 * Defense-in-depth fix: cap to 30/hour per admin user id. 30 is generous
 * for legitimate troubleshooting (e.g. walking through a complex case
 * with a DSA on a support call) and tight enough to flag anomalies.
 *
 * THIS TEST
 * ─────────
 * Static source-code scan locking the wiring so a future refactor cannot
 * silently drop the rate-limit. Same approach as preSubmitConfirmWiring
 * and directorAutoIncomeWiring (Pitfalls #47 / #46).
 *
 * The /exit companion endpoint is intentionally NOT rate-limited — it
 * accepts any authenticated user (impersonating or not) and only clears
 * a cookie, so capping it would lock a DSA out of returning to admin.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const START_ENDPOINT = 'src/routes/api/admin/impersonate/start/+server.ts';

function readSource(relPath: string): string {
	return readFileSync(resolve(process.cwd(), relPath), 'utf-8');
}

describe('impersonate-start endpoint — rate-limit wiring (review F1 2026-05-23)', () => {
	const src = readSource(START_ENDPOINT);

	it('imports rateLimit from $lib/server/rateLimiter', () => {
		expect(src).toMatch(/import\s*\{\s*rateLimit\s*\}\s*from\s*['"]\$lib\/server\/rateLimiter/);
	});

	it('calls rateLimit before parsing the request body', () => {
		const rateLimitIdx = src.indexOf('await rateLimit(');
		const parseBodyIdx = src.indexOf('parseJsonBody<StartBody>');
		expect(rateLimitIdx).toBeGreaterThan(0);
		expect(parseBodyIdx).toBeGreaterThan(0);
		expect(rateLimitIdx).toBeLessThan(parseBodyIdx);
	});

	it('uses a per-admin identifier (not just IP) so different admins are bucketed independently', () => {
		expect(src).toMatch(/identifier:\s*[`'"]impersonate-start:\$\{locals\.user!?\.id\}/);
	});

	it('caps at 30 requests per hour', () => {
		// The numbers are intentional and review-blessed — flag any tightening
		// or loosening so the maintainer revisits the F1 rationale.
		expect(src).toMatch(/maxRequests:\s*30\b/);
		expect(src).toMatch(/windowMs:\s*60\s*\*\s*60\s*\*\s*1000\b/);
	});

	it('returns 429 with a user-readable message when rate-limited', () => {
		expect(src).toMatch(/apiError\([^,]+,\s*429\)/);
		expect(src).toMatch(/[Tt]oo many impersonation/);
	});

	it('uses getClientAddress from the SvelteKit handler args', () => {
		// Without this in the destructure, the rateLimit() call would have no
		// IP context. The identifier discriminates by user id so this is
		// belt-and-suspenders, but missing it would surface as a runtime
		// ReferenceError. Lock the pattern.
		expect(src).toMatch(/async\s*\(\s*\{[^}]*\bgetClientAddress\b[^}]*\}\s*\)/);
	});
});
