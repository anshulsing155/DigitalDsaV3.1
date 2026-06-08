/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Deep-link OTP redirect — login flow validation locks
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * When a logged-out user pastes a deep-link URL like
 *   /dashboard/dsa/cases/68311abc123
 * into a fresh tab, the auth-bounce layout sends them to
 *   /login?redirect=/dashboard/dsa/cases/68311abc123
 * Post-OTP login should land them BACK at the deep-link, not on the
 * default dashboard. That UX was broken three ways:
 *
 *   1. The success-path navigation site (login.svelte ~line 526) read
 *      `redirectUrl` directly with NO same-origin validation, exposing
 *      an open-redirect vulnerability (?redirect=https://evil.com would
 *      send the user to evil.com after a successful login).
 *   2. The "onboarding required" branches at ~lines 488 and ~515 dropped
 *      the redirect param, sending the user to the role-appropriate
 *      onboarding page and then to the default dashboard — the
 *      deep-link was forgotten across the onboarding round-trip.
 *   3. dashboard/+layout.server.ts captured `url.pathname` only —
 *      losing any query string the deep-link carried (e.g. ?status=stuck
 *      on the cases list). (app)/+layout.server.ts already did this
 *      correctly; the inconsistency was the gap.
 *
 * THIS TEST
 * ─────────
 * Layer 1 — login source-pattern locks:
 *   imports safeRedirectPath helper; success site routes through it;
 *   both onboarding branches preserve the redirect via isSafeRedirectPath
 *   guard; legacy isSafeRedirect (domain allowlist) is gone.
 *
 * Layer 2 — dashboard auth-bounce parity with (app):
 *   captures pathname + search in the redirect param so query-string-
 *   bearing deep-links survive.
 *
 * Companion: src/lib/utils/safeRedirectPath.ts + the standalone helper
 * tests in safeRedirectPath.test.ts (which lock the validation rules
 * themselves).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOGIN_PATH = resolve('src/routes/(auth)/login/+page.svelte');
const DASHBOARD_LAYOUT_PATH = resolve('src/routes/dashboard/+layout.server.ts');
const APP_LAYOUT_PATH = resolve('src/routes/(app)/+layout.server.ts');

describe('Deep-link OTP redirect — login flow validation', () => {
	const loginSrc = readFileSync(LOGIN_PATH, 'utf-8');

	// ── Layer 1: login source-pattern locks ──────────────────────────────

	describe('login.svelte — safeRedirectPath wiring', () => {
		it('imports both safeRedirectPath and isSafeRedirectPath', () => {
			expect(loginSrc).toMatch(
				/import \{ safeRedirectPath, isSafeRedirectPath \} from ['"]\$lib\/utils\/safeRedirectPath['"]/
			);
		});

		it('success path routes through safeRedirectPath (NOT bare redirectUrl)', () => {
			// The vulnerability was `window.location.href = redirectUrl !==
			// 'dashboard' ? redirectUrl : dashboardPath`. After the fix the
			// navigation must go through `safeRedirectPath(redirectUrl, dashboardPath)`
			// — no other shape preserves the open-redirect protection.
			expect(loginSrc).toMatch(/safeRedirectPath\(redirectUrl,\s*dashboardPath\)/);
		});

		it('success path does NOT bypass safeRedirectPath', () => {
			// Negative-check: catches a future regression that re-introduces
			// the bare `window.location.href = redirectUrl ...` shape.
			// Targets the EXACT vulnerable expression to avoid tripping on
			// the legitimate safeRedirectPath call.
			expect(loginSrc).not.toMatch(
				/window\.location\.href\s*=\s*redirectUrl\s*!==\s*['"]dashboard['"]\s*\?/
			);
		});

		it('legacy isSafeRedirect (domain allowlist) is gone', () => {
			// The legacy helper matched the host but didn't enforce same-origin
			// PATHS and was never actually called on the post-login nav site.
			// A re-add would suggest someone misread the audit — fail loudly.
			expect(loginSrc).not.toMatch(/function isSafeRedirect\(/);
			expect(loginSrc).not.toMatch(/allowedDomains\s*=/);
		});

		it('!userExists onboarding branch preserves redirect via isSafeRedirectPath guard', () => {
			// The earlier shape unconditionally appended `?redirect=${redirectUrl}`
			// to the onboarding URL — which propagated whatever was in the URL
			// (open-redirect at the next nav site). Guard now gates the append.
			expect(loginSrc).toMatch(
				/!checkData\.userExists[\s\S]+?isSafeRedirectPath\(redirectUrl\)[\s\S]+?onboardingPath/
			);
		});

		it('onboardingCompleted=false branch preserves redirect via the same guard', () => {
			// Earlier shape hardcoded `window.location.href = onboardingPath`
			// (dropped redirect entirely). Now the guarded variant attaches
			// it when safe.
			expect(loginSrc).toMatch(
				/onboardingCompleted === false[\s\S]+?isSafeRedirectPath\(redirectUrl\)[\s\S]+?onboardingPath/
			);
		});
	});

	// ── Layer 2: dashboard auth-bounce parity ────────────────────────────

	describe('dashboard/+layout.server.ts — capture pathname + search', () => {
		const dashboardSrc = readFileSync(DASHBOARD_LAYOUT_PATH, 'utf-8');
		const appSrc = readFileSync(APP_LAYOUT_PATH, 'utf-8');

		it('dashboard auth-bounce captures url.pathname + url.search (parity with (app))', () => {
			expect(dashboardSrc).toMatch(/encodeURIComponent\(url\.pathname \+ url\.search\)/);
		});

		it('(app) auth-bounce still uses pathname + search (regression guard)', () => {
			// If the parallel layout ever loses the pattern, the parity above
			// becomes meaningless. Lock both ends.
			expect(appSrc).toMatch(/url\.pathname \+ url\.search/);
		});

		it('dashboard does NOT use the lossy url.pathname-only shape', () => {
			// The exact bug shape — captures the path but drops the query.
			// Catches a future revert.
			expect(dashboardSrc).not.toMatch(
				/encodeURIComponent\(url\.pathname\)\s*[;,]/
			);
		});
	});
});
