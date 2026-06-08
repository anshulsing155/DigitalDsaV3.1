/**
 * Regression lock — verify-otp must NOT call check-dsa internally
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Code-review M3 (CODE-REVIEW-2026-05-29.md) flagged a redundant internal
 * `fetch('/api/auth/check-dsa', ...)` sub-request inside verify-otp's POST
 * handler. The client's `loginWithRole` calls check-dsa explicitly right after
 * verify-otp returns, so the internal call's token writes were always
 * immediately overwritten by the client's call. Effects:
 *
 *   • 2× DB writes per login (real perf overhead)
 *   • The `activeTokenIds` rolling-window array filled at 2× rate, halving
 *     the effective multi-device session capacity from 10 → 5
 *   • 12 total DB lookups across verify-otp + detect-roles + check-dsa for
 *     ONE login event, with verify-otp's 4 lookups fully duplicated by
 *     detect-roles' 4 lookups
 *
 * The fix was to remove the internal sub-request entirely; verify-otp now
 * only verifies the OTP with MSG91 + sets verifiedMobile + role cookies.
 *
 * This test locks the regression at source-pattern level. Per CLAUDE.md
 * Pitfall #66, the negative-check regex targets the USAGE shape (the literal
 * `fetch('/api/auth/check-dsa'` call site + the consumer variable name from
 * the removed block), NOT a bare `check-dsa` string match. A bare match would
 * trip on this very test file's documentation, on git commit messages, and on
 * the CLAUDE.md grep recipe — destroying the institutional memory the lock is
 * designed to preserve.
 *
 * Authoritative location: CLAUDE.md §4 (no grep recipe needed — this test is
 * the contract).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const VERIFY_OTP_SOURCE_PATH = resolve(
	process.cwd(),
	'src/routes/api/auth/verify-otp/+server.ts'
);
const VERIFY_OTP_SRC = readFileSync(VERIFY_OTP_SOURCE_PATH, 'utf8');

describe('verify-otp — must NOT call check-dsa internally (code-review M3 regression lock)', () => {
	it('does not contain an internal fetch call to /api/auth/check-dsa', () => {
		// USAGE shape: a literal call to `fetch('/api/auth/check-dsa'` — the
		// exact form the removed redundant sub-request took. Catches both
		// quote styles. Will NOT trip on the explanatory JSDoc comment in the
		// same file (which mentions check-dsa by name but not as a fetch call
		// site) or on this test file's own narrative.
		expect(VERIFY_OTP_SRC).not.toMatch(/fetch\(\s*['"`]\/api\/auth\/check-dsa['"`]/);
	});

	it('does not declare a userCheckResponse variable (signal of the removed block)', () => {
		// `userCheckResponse` was the parsed body of the removed sub-request.
		// Its presence as a variable declaration would mean the internal call
		// has been re-introduced.
		expect(VERIFY_OTP_SRC).not.toMatch(/\buserCheckResponse\s*=/);
	});

	it('does not contain userData destructuring from check-dsa (removed payload consumer)', () => {
		// `userData.userExists` and `userData.user` were the only fields the
		// endpoint consumed from the removed sub-request. The previous
		// response also leaked them onwards to the client (who never read
		// them). Their reappearance is a regression signal.
		expect(VERIFY_OTP_SRC).not.toMatch(/userData\.userExists/);
		expect(VERIFY_OTP_SRC).not.toMatch(/userData\.user\b/);
	});

	it('still imports apiOk for the simplified success response', () => {
		// USAGE shape — the `apiOk` named import line. The simplified handler
		// returns `apiOk({})`; removing the import would break the build,
		// but a future migration to a different response helper that drops
		// the success-envelope contract would silently break the client
		// (which checks `verifyResult.success`).
		expect(VERIFY_OTP_SRC).toMatch(/\bapiOk\b/);
	});

	it('still sets the verifiedMobile cookie (load-bearing for onboarding gate)', () => {
		// USAGE shape — the literal cookie name in a `cookies.set` call.
		// The verifiedMobile cookie is consumed by the onboarding layout
		// + detect-roles + signup as proof-of-OTP. Its removal would break
		// the new-user signup → onboarding flow.
		expect(VERIFY_OTP_SRC).toMatch(/cookies\.set\(\s*['"`]verifiedMobile['"`]/);
	});

	it('still sets the role cookie (load-bearing for new-user onboarding gate)', () => {
		// USAGE shape — the literal cookie name in a `cookies.set` call.
		// (onboarding)/+layout.server.ts reads this cookie as a fallback
		// when locals.user is briefly nil during signup → onboarding
		// navigation. For existing users it's harmlessly overwritten by
		// check-dsa with the user's actual role ('dsa' / 'rm' / 'admin').
		expect(VERIFY_OTP_SRC).toMatch(/cookies\.set\(\s*['"`]role['"`]/);
	});
});
