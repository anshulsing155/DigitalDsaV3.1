/**
 * Unit test — SEC-10 pending-login-token sign + verify.
 *
 * Exercises the 5-min-TTL JWT used in the 2-step conflict-resolution flow:
 *
 *   - Round-trip: sign → verify recovers the original payload faithfully
 *   - Tampered signature → invalid_signature
 *   - Wrong audience claim → wrong_audience (defends against access-token
 *     replay since access tokens carry audience='auth-client')
 *   - Wrong issuer claim → invalid_signature
 *   - Expired token → expired
 *   - Malformed input (empty string, non-string, garbage) → malformed
 *   - Payload shape defense: well-signed-but-wrong-shape → malformed
 *
 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §5 + §10 R5
 */
import { describe, it, expect, vi } from 'vitest';

// Provide a stable test JWT_SECRET so the helper can sign + verify within
// the test. The other env vars in the module's import chain (none here)
// don't matter for this suite.
vi.mock('$env/static/private', () => ({
	JWT_SECRET: 'test-jwt-secret-for-pending-login-token-suite'
}));

import jwt from 'jsonwebtoken';
import {
	signPendingLoginToken,
	verifyPendingLoginToken,
	type PendingLoginPayload
} from '$lib/server/auth/pendingLoginToken';

// ── Fixture ────────────────────────────────────────────────────────────

function makePayload(overrides: Partial<PendingLoginPayload> = {}): PendingLoginPayload {
	return {
		userId: '507f1f77bcf86cd799439011',
		userRole: 'dsa',
		userCollection: 'DsaApplications',
		tokenId: 'pre-generated-token-id-uuid',
		kickEligibleSessionIds: ['sess-a', 'sess-b'],
		incomingFingerprints: {
			device_fingerprint: 'a'.repeat(64),
			browser_fingerprint: 'b'.repeat(64),
			client_class: 'web'
		},
		...overrides
	};
}

// ── Round-trip ─────────────────────────────────────────────────────────

describe('pendingLoginToken — round-trip', () => {
	it('sign → verify recovers every payload field', () => {
		const payload = makePayload();
		const token = signPendingLoginToken(payload);
		const result = verifyPendingLoginToken(token);

		expect(result.ok).toBe(true);
		if (!result.ok) return; // type guard

		expect(result.payload.userId).toBe(payload.userId);
		expect(result.payload.userRole).toBe(payload.userRole);
		expect(result.payload.userCollection).toBe(payload.userCollection);
		expect(result.payload.tokenId).toBe(payload.tokenId);
		expect(result.payload.kickEligibleSessionIds).toEqual(payload.kickEligibleSessionIds);
		expect(result.payload.incomingFingerprints.device_fingerprint).toBe(
			payload.incomingFingerprints.device_fingerprint
		);
		expect(result.payload.incomingFingerprints.browser_fingerprint).toBe(
			payload.incomingFingerprints.browser_fingerprint
		);
		expect(result.payload.incomingFingerprints.client_class).toBe('web');
	});

	it('preserves empty kickEligibleSessionIds array', () => {
		// Edge case — no kickable rows but the modal still wants to be
		// shown (verify the empty-array round-trips, not corrupted to null).
		const payload = makePayload({ kickEligibleSessionIds: [] });
		const token = signPendingLoginToken(payload);
		const result = verifyPendingLoginToken(token);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.payload.kickEligibleSessionIds).toEqual([]);
	});

	it('handles android client_class round-trip', () => {
		const payload = makePayload({
			incomingFingerprints: {
				device_fingerprint: 'c'.repeat(64),
				browser_fingerprint: 'd'.repeat(64),
				client_class: 'android'
			}
		});
		const token = signPendingLoginToken(payload);
		const result = verifyPendingLoginToken(token);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.payload.incomingFingerprints.client_class).toBe('android');
	});
});

// ── Tampering / wrong claims ───────────────────────────────────────────

describe('pendingLoginToken — rejects tampered or wrong-shape tokens', () => {
	it('tampered signature → invalid_signature', () => {
		const token = signPendingLoginToken(makePayload());
		// Flip the last char of the signature segment (last `.`-separated
		// part). JWT libraries treat this as an HMAC mismatch.
		const flipped = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
		const result = verifyPendingLoginToken(flipped);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toBe('invalid_signature');
	});

	it("wrong audience ('auth-client' — what access tokens use) → wrong_audience", () => {
		// Simulate an attacker presenting a leaked access token: same
		// secret, same issuer, but audience='auth-client'. The pending-
		// login verifier MUST reject it.
		const forged = jwt.sign(makePayload(), 'test-jwt-secret-for-pending-login-token-suite', {
			expiresIn: '5m',
			issuer: 'auth-system',
			audience: 'auth-client'
		});
		const result = verifyPendingLoginToken(forged);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toBe('wrong_audience');
	});

	it('wrong issuer → invalid_signature', () => {
		const forged = jwt.sign(makePayload(), 'test-jwt-secret-for-pending-login-token-suite', {
			expiresIn: '5m',
			issuer: 'some-other-system',
			audience: 'pending-login'
		});
		const result = verifyPendingLoginToken(forged);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		// jsonwebtoken bundles issuer mismatch into JsonWebTokenError;
		// the helper maps to invalid_signature since the audience matched.
		expect(result.reason).toBe('invalid_signature');
	});

	it('expired token → expired', () => {
		// Sign with negative expiresIn to produce an already-expired token.
		const expired = jwt.sign(makePayload(), 'test-jwt-secret-for-pending-login-token-suite', {
			expiresIn: '-1s',
			issuer: 'auth-system',
			audience: 'pending-login'
		});
		const result = verifyPendingLoginToken(expired);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toBe('expired');
	});
});

// ── Malformed input ────────────────────────────────────────────────────

describe('pendingLoginToken — malformed input', () => {
	it('empty string → malformed', () => {
		const result = verifyPendingLoginToken('');
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toBe('malformed');
	});

	it('non-string input → malformed', () => {
		const result = verifyPendingLoginToken(null as unknown as string);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toBe('malformed');
	});

	it('garbage string → invalid_signature', () => {
		// Not a JWT shape at all — but the catch-all path treats this as
		// a signature failure since the JWT library can't even parse it.
		const result = verifyPendingLoginToken('this.is.not-a-jwt');
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toBe('invalid_signature');
	});

	it('well-signed-but-wrong-shape payload → malformed', () => {
		// A future code change that loosens the payload contract would
		// hit this path. Sign a token missing required fields — verify
		// must refuse, not return a half-populated payload.
		const wrongShape = jwt.sign(
			{ unrelatedField: 'value' },
			'test-jwt-secret-for-pending-login-token-suite',
			{ expiresIn: '5m', issuer: 'auth-system', audience: 'pending-login' }
		);
		const result = verifyPendingLoginToken(wrongShape);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toBe('malformed');
	});

	it('invalid userCollection value → malformed', () => {
		// Defensive: a future code change that accidentally signs an
		// unrecognized collection name (or an attacker spinning up a
		// forged collection name) must be refused — login-confirm would
		// look up against an unknown collection otherwise.
		const badCollection = jwt.sign(
			{
				userId: 'x',
				userRole: 'dsa',
				userCollection: 'NotAValidCollection',
				tokenId: 't',
				kickEligibleSessionIds: [],
				incomingFingerprints: {}
			},
			'test-jwt-secret-for-pending-login-token-suite',
			{ expiresIn: '5m', issuer: 'auth-system', audience: 'pending-login' }
		);
		const result = verifyPendingLoginToken(badCollection);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toBe('malformed');
	});
});
