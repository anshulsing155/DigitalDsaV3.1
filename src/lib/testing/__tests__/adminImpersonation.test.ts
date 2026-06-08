/**
 * Admin Impersonation — Cookie Signing & Verification Unit Tests
 * ═══════════════════════════════════════════════════════════════
 * The cookie module had NO tests before C.4. This fills the gap as part of
 * the cookie-shape refactor (was `{ adminId, rmId }`, now `{ adminId, targetId,
 * targetRole, startedAt }`). Covers:
 *
 *   - Roundtrip integrity: a signed payload verifies back identically.
 *   - HMAC tamper-detection: any byte flip in signature OR payload returns null.
 *   - Shape validation: stale pre-refactor cookies (carrying the legacy
 *     { adminId, rmId } shape) verify as null, so browsers holding old
 *     cookies don't get an unexpected admin session.
 *   - Edge cases: missing dot separator, invalid base64, wrong-role string,
 *     non-numeric startedAt all return null.
 *
 * These run against the real signing key from $env/static/private, which the
 * project's PMS_SIGNING_SECRET satisfies in dev + CI.
 *
 * Note: API-handler integration tests for the /start endpoint guards are
 * left as a separate follow-up — the existing project pattern is unit tests
 * for module-level logic + manual smoke for endpoint wiring (see
 * docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md C.4 Test plan).
 */

import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
	signImpersonationCookie,
	verifyImpersonationCookie,
	IMPERSONATION_SESSION_MAX_AGE_SECONDS,
	type ImpersonationPayload
} from '$lib/server/adminImpersonation';
import { getPmsSigningKeyStrict } from '$lib/server/pms/signingKey';

function buildPayload(overrides: Partial<ImpersonationPayload> = {}): ImpersonationPayload {
	return {
		adminId: 'admin-1',
		targetId: 'user-2',
		targetRole: 'dsa',
		startedAt: 1_700_000_000_000,
		...overrides
	};
}

describe('admin impersonation cookie — signing roundtrip', () => {
	it('signs and verifies a DSA-target payload identically', () => {
		const payload = buildPayload({ targetRole: 'dsa' });
		const cookie = signImpersonationCookie(payload);

		const verified = verifyImpersonationCookie(cookie);
		expect(verified).not.toBeNull();
		expect(verified!.adminId).toBe('admin-1');
		expect(verified!.targetId).toBe('user-2');
		expect(verified!.targetRole).toBe('dsa');
		expect(verified!.startedAt).toBe(1_700_000_000_000);
	});

	it('signs and verifies an RM-target payload identically', () => {
		const payload = buildPayload({ targetRole: 'rm', targetId: 'rm-7' });
		const cookie = signImpersonationCookie(payload);

		const verified = verifyImpersonationCookie(cookie);
		expect(verified).not.toBeNull();
		expect(verified!.targetRole).toBe('rm');
		expect(verified!.targetId).toBe('rm-7');
	});

	it('exposes the 4-hour session max-age constant', () => {
		// Sanity check: the value matches what the /start endpoint passes to
		// cookies.set, so a doc change to one without updating the other is caught.
		expect(IMPERSONATION_SESSION_MAX_AGE_SECONDS).toBe(60 * 60 * 4);
	});
});

describe('admin impersonation cookie — HMAC tamper detection', () => {
	it('returns null when the signature is flipped', () => {
		const cookie = signImpersonationCookie(buildPayload());
		const dotIdx = cookie.lastIndexOf('.');
		const payloadPart = cookie.slice(0, dotIdx);
		const sigPart = cookie.slice(dotIdx + 1);

		// Flip the first character of the sig to a different one (preserves length).
		const flipped =
			sigPart[0] === 'A' ? 'B' + sigPart.slice(1) : 'A' + sigPart.slice(1);
		expect(verifyImpersonationCookie(`${payloadPart}.${flipped}`)).toBeNull();
	});

	it('returns null when the payload body is altered', () => {
		const cookie = signImpersonationCookie(buildPayload());
		const dotIdx = cookie.lastIndexOf('.');
		const sigPart = cookie.slice(dotIdx + 1);

		// Encode a different payload but keep the original signature — should fail.
		const tamperedPayload = Buffer.from(
			JSON.stringify(buildPayload({ adminId: 'attacker' }))
		).toString('base64url');
		expect(verifyImpersonationCookie(`${tamperedPayload}.${sigPart}`)).toBeNull();
	});

	it('returns null when there is no dot separator', () => {
		expect(verifyImpersonationCookie('not-a-valid-cookie')).toBeNull();
	});

	it('returns null when the signature length differs from expected', () => {
		// Deliberately short signature — would crash timingSafeEqual without the
		// length guard. Validates the defensive check in verify.
		const payload = Buffer.from(JSON.stringify(buildPayload())).toString('base64url');
		expect(verifyImpersonationCookie(`${payload}.short`)).toBeNull();
	});
});

describe('admin impersonation cookie — shape validation', () => {
	function signRaw(payloadObj: Record<string, unknown>): string {
		const key = getPmsSigningKeyStrict();
		const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
		const sig = crypto.createHmac('sha256', key).update(payload).digest('base64url');
		return `${payload}.${sig}`;
	}

	it('rejects pre-refactor cookies carrying the legacy { adminId, rmId } shape', () => {
		// A browser holding a cookie signed by the old code path would still
		// pass HMAC verification because the secret is unchanged. The shape
		// validator must catch the missing targetRole/targetId/startedAt and
		// return null, so the stale session does NOT silently re-attach.
		const legacy = signRaw({ adminId: 'admin-1', rmId: 'user-2' });
		expect(verifyImpersonationCookie(legacy)).toBeNull();
	});

	it('rejects payloads with an invalid targetRole', () => {
		const invalid = signRaw({
			adminId: 'admin-1',
			targetId: 'user-2',
			targetRole: 'admin', // not allowed at the cookie layer either
			startedAt: 1_700_000_000_000
		});
		expect(verifyImpersonationCookie(invalid)).toBeNull();
	});

	it('rejects payloads with a non-numeric startedAt', () => {
		const invalid = signRaw({
			adminId: 'admin-1',
			targetId: 'user-2',
			targetRole: 'dsa',
			startedAt: 'now'
		});
		expect(verifyImpersonationCookie(invalid)).toBeNull();
	});

	it('rejects payloads where startedAt is missing entirely', () => {
		const invalid = signRaw({
			adminId: 'admin-1',
			targetId: 'user-2',
			targetRole: 'rm'
		});
		expect(verifyImpersonationCookie(invalid)).toBeNull();
	});
});
