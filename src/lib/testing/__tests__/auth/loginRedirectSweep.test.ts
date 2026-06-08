/**
 * ═══════════════════════════════════════════════════════════════════════════
 * /login throw sweep — deep-link preservation across all auth-bounce sites
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Companion sweep to the deep-link OTP redirect fix (0372e6c6). The auth
 * layouts at `(app)/+layout.server.ts` and `dashboard/+layout.server.ts`
 * preserve the deep-link via `?redirect=<pathname+search>`, but several
 * page-level loads independently throw `redirect(302, '/login')` and were
 * dropping the deep-link.
 *
 * Sweep decisions:
 *   • Communication page (dashboard/dsa/communication) — real deep-link
 *     destination, REDIRECT PARAM ADDED to all three throw sites.
 *   • Onboarding flows — onboarding IS the destination after login, and
 *     `login.svelte` already routes new/incomplete users back to the right
 *     onboarding path with the original deep-link preserved. Adding a
 *     redirect param here would round-trip uselessly or risk a loop.
 *     BARE THROW INTENTIONALLY KEPT, with explanatory comments.
 *
 * THIS TEST
 * ─────────
 * Layer 1 — communication-page redirect sites:
 *   the load function accepts `url`; computes `loginWithRedirect` from
 *   `url.pathname + url.search`; every `throw redirect(302, ...)` in this
 *   file targets `loginWithRedirect` (NOT bare `/login`).
 *
 * Layer 2 — onboarding intentional non-changes:
 *   each onboarding throw is documented with the rationale comment
 *   pointing back at the layout-side comment. Catches a future cleanup
 *   that removes the comment + adds a redirect (looping the user back
 *   to the same onboarding page).
 *
 * Companion: src/lib/utils/safeRedirectPath.ts +
 *   auth/safeRedirectPath.test.ts + auth/deepLinkOtpRedirect.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const COMM_PATH = resolve('src/routes/dashboard/dsa/communication/+page.server.ts');
const ONBOARDING_LAYOUT_PATH = resolve('src/routes/(onboarding)/+layout.server.ts');
const DSA_ONBOARDING_PATH = resolve('src/routes/(onboarding)/dsa-onboarding/+page.server.ts');
const RM_ONBOARDING_PATH = resolve('src/routes/(onboarding)/rm-onboarding/+page.server.ts');

describe('/login throw sweep', () => {
	// ── Layer 1: communication page preserves deep-link ─────────────────

	describe('dashboard/dsa/communication — every /login throw preserves redirect', () => {
		const src = readFileSync(COMM_PATH, 'utf-8');

		it('load function destructures `url` from the event', () => {
			// Required to compute the redirect param. A future refactor that
			// drops `url` from the destructure silently regresses to bare
			// throws.
			expect(src).toMatch(/load:\s*PageServerLoad\s*=\s*async\s*\(\{[^}]*\burl\b[^}]*\}\)\s*=>/);
		});

		it('computes loginWithRedirect from url.pathname + url.search', () => {
			expect(src).toMatch(
				/encodeURIComponent\(url\.pathname \+ url\.search\)/
			);
			expect(src).toMatch(
				/const loginWithRedirect\s*=\s*`\/login\?redirect=\$\{returnTo\}`/
			);
		});

		it('every /login throw uses loginWithRedirect (no bare /login left)', () => {
			// Count: 3 throws in this file, all should target loginWithRedirect.
			const bareLoginThrows = src.match(/throw redirect\(302,\s*['"]\/login['"]\)/g) ?? [];
			expect(
				bareLoginThrows.length,
				`Communication page has ${bareLoginThrows.length} bare /login throws — should be 0 (all should use loginWithRedirect to preserve the deep-link).`
			).toBe(0);

			const redirectedThrows = src.match(/throw redirect\(302,\s*loginWithRedirect\)/g) ?? [];
			expect(redirectedThrows.length).toBe(3);
		});
	});

	// ── Layer 2: onboarding intentional non-changes ─────────────────────

	describe('(onboarding) bare throws are intentional and documented', () => {
		const sites: [string, string][] = [
			['(onboarding)/+layout.server.ts', ONBOARDING_LAYOUT_PATH],
			['(onboarding)/dsa-onboarding/+page.server.ts', DSA_ONBOARDING_PATH],
			['(onboarding)/rm-onboarding/+page.server.ts', RM_ONBOARDING_PATH]
		];

		for (const [label, path] of sites) {
			it(`${label} carries an explanatory comment for the bare /login throw`, () => {
				const src = readFileSync(path, 'utf-8');
				// Bare throw must still be present (we're NOT adding redirect
				// here intentionally).
				expect(src).toMatch(/throw redirect\(302,\s*['"]\/login['"]\)/);
				// And the comment must reference the rationale so a future
				// cleanup-by-pattern-match doesn't silently start appending
				// ?redirect= and create a loop.
				expect(
					src.toLowerCase(),
					`${label}: bare /login throw is intentional but the rationale comment is missing. Without it a future sweep might add ?redirect= and loop the user back through onboarding.`
				).toMatch(/no \?redirect=|bare \/login throw|onboarding is the destination/);
			});
		}
	});
});
