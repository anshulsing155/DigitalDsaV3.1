/**
 * Architectural invariant: every cron endpoint lives under /api/cron/*
 * ══════════════════════════════════════════════════════════════════
 * BACKGROUND
 * ──────────
 * 2026-05-27: surfaced during D.1 S6 close — four endpoints structurally
 * acted as crons (gated by `x-cron-secret` header against CRON_SECRET
 * env var) but lived OUTSIDE the `/api/cron/*` path prefix:
 *
 *   /api/billing/trial-reminder
 *   /api/notifications/digest
 *   /api/pms/cron/renewal-check
 *   /api/pms/cron/publish-scheduled
 *
 * hooks.server.ts's CSRF middleware skip only matches paths starting
 * with `/api/cron/` (and `/api/webhook/` per the same-day SES bounce
 * webhook work). Any external scheduler (cron-job.org, Vercel Cron)
 * attempting to POST to the four paths above received a 403 because
 * CSRF validation ran first and rejected the token-less request.
 *
 * Symptom: silent failure. The endpoints' own `x-cron-secret` check
 * never fires because the request short-circuits in middleware. To an
 * operator wiring an external scheduler, this looks identical to a
 * misconfigured CRON_SECRET — the diagnostic signal is misleading.
 *
 * This is the same class of bug as the 2026-05-27 morning fix for
 * cron-job.org URLs hitting apex `rinn.in` with a 308 redirect — both
 * cases involved a request never reaching the intended endpoint code.
 *
 * THE FIX
 * ───────
 * Move all four endpoints under `/api/cron/*`:
 *
 *   /api/billing/trial-reminder       -> /api/cron/billing-trial-reminder
 *   /api/notifications/digest         -> /api/cron/notifications-digest
 *   /api/pms/cron/renewal-check       -> /api/cron/pms-renewal-check
 *   /api/pms/cron/publish-scheduled   -> /api/cron/pms-publish-scheduled
 *
 * The directory-rename approach (via git mv) preserves history and
 * resolves the CSRF-skip mismatch architecturally — no allowlist
 * special-cases, no per-endpoint annotations. Every cron lives in one
 * canonical place; every contributor adding a new one inherits the
 * skip automatically.
 *
 * THIS TEST
 * ─────────
 * Recursive scan of `src/routes/api/`. Any +server.ts file that:
 *   (a) references the string `CRON_SECRET` in env reads, OR
 *   (b) accesses `x-cron-secret` from request headers
 * MUST live under `src/routes/api/cron/`. A file matching the criteria
 * but located elsewhere fails the test with a precise pointer to the
 * offending path and the file it needs to move to.
 *
 * Companion: cronCsrfSkip.test.ts locks the middleware-side skip rule.
 * This file locks the route-placement convention that makes the skip
 * cover all crons by default.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';

const API_ROOT = resolve(process.cwd(), 'src/routes/api');
const CRON_ROOT_RELATIVE = 'cron';

/** Walk src/routes/api/** and return every +server.ts file's full path. */
function walkServerFiles(dir: string, acc: string[] = []): string[] {
	const entries = readdirSync(dir);
	for (const entry of entries) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			walkServerFiles(full, acc);
		} else if (entry === '+server.ts') {
			acc.push(full);
		}
	}
	return acc;
}

/**
 * True if the file's source uses the cron-secret auth pattern — defined
 * specifically as reading the `x-cron-secret` HTTP HEADER from the
 * request. Just mentioning `CRON_SECRET` in a comment or importing it
 * for an unrelated purpose is NOT sufficient (false positives caught
 * during the 2026-05-27 lock — `admin/inactive-report` has the string
 * in a comment but is admin-auth-gated, not cron-secret-gated).
 *
 * Both casing variants are accepted because Headers.get() is case-
 * insensitive at runtime but devs may write either `x-cron-secret` or
 * `X-Cron-Secret`.
 */
function usesCronSecret(src: string): boolean {
	// The cron-secret pattern is: `headers.get('x-cron-secret')` or
	// equivalent direct header access. Captures the cron contract more
	// precisely than a CRON_SECRET env-var reference (which can appear
	// in helper modules, comments, runbooks, etc.).
	return /headers\.get\(\s*['"]x-cron-secret['"]\s*\)/i.test(src);
}

/** Relative-from-api-root path with forward-slash separators (cross-platform). */
function apiRelativePath(fullPath: string): string {
	return relative(API_ROOT, fullPath).split(/[\\/]/).join('/');
}

describe('Architectural invariant: cron endpoints live under /api/cron/*', () => {
	const allServerFiles = walkServerFiles(API_ROOT);

	it('walks the API tree and finds +server.ts files', () => {
		// Defensive: if the walker found nothing, the test below would
		// trivially pass — that would be a worse silent failure than the
		// thing we're trying to lock. Pin a sanity floor.
		expect(allServerFiles.length).toBeGreaterThan(30);
	});

	it('every cron-secret-using endpoint lives under /api/cron/*', () => {
		const offenders: string[] = [];

		for (const filePath of allServerFiles) {
			const apiRel = apiRelativePath(filePath);
			const src = readFileSync(filePath, 'utf8');

			if (!usesCronSecret(src)) continue;

			// The file uses CRON_SECRET — verify it lives under cron/.
			// apiRel is e.g. 'cron/billing-charge/+server.ts' or
			// 'billing/trial-reminder/+server.ts'.
			if (!apiRel.startsWith(`${CRON_ROOT_RELATIVE}/`)) {
				offenders.push(apiRel);
			}
		}

		expect(
			offenders,
			'Found cron-secret-gated endpoint(s) outside /api/cron/*. ' +
				'These endpoints will silently 403 on external scheduler POSTs ' +
				'because hooks.server.ts CSRF middleware does not skip non-cron paths. ' +
				'Move them under src/routes/api/cron/ via `git mv` (preserves history). ' +
				'See cronEndpointPathConvention.test.ts header for the full background.\n' +
				'Offenders:\n  - ' +
				offenders.join('\n  - ')
		).toEqual([]);
	});

	it('the three 2026-05-27 moves still live at the cron paths', () => {
		// Concrete proof the architectural fix landed and stayed:
		// the new paths must exist + still use cron-secret auth.
		//
		// Originally four endpoints were moved (2026-05-27). The legacy
		// `billing-trial-reminder` was retired in D.1 S8-skip cleanup
		// (2026-05-28) — archived to `cron/_archived/billing-trial-reminder/`.
		// The remaining three stay live and must keep the cron-secret gate.
		const expectedMoves = [
			'cron/notifications-digest/+server.ts',
			'cron/pms-renewal-check/+server.ts',
			'cron/pms-publish-scheduled/+server.ts'
		];

		for (const expected of expectedMoves) {
			const fullPath = resolve(API_ROOT, expected);
			let src: string;
			try {
				src = readFileSync(fullPath, 'utf8');
			} catch {
				expect.fail(
					`Expected ${expected} to exist after the 2026-05-27 architectural fix. ` +
						'If it was moved BACK to a non-cron path, the CSRF middleware will 403 it. ' +
						'Revert the move or update this test if the path naming was intentionally changed.'
				);
				continue;
			}
			expect(
				usesCronSecret(src),
				`${expected} no longer uses CRON_SECRET — if the endpoint is no longer a cron, ` +
					'remove it from this test\'s expectedMoves list (and consider moving it out ' +
					'of /api/cron/ since the path prefix is meant to signal "cron-secret-gated").'
			).toBe(true);
		}
	});
});
