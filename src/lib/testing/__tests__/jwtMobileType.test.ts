/**
 * JWT mobile-number type round-trip — SEC-2 M1 regression net.
 *
 * After SEC-2 Phase A/B, CSFLE deterministic encryption stores the
 * mobile number as a STRING. The JWT claim must round-trip the same
 * type, otherwise downstream `locals.user.mobileNumber === doc.mobileNumber`
 * checks silently fail across the encryption boundary (the JWT side
 * would be a number, the DB side a string).
 *
 * Before this fix, signup passed `Number(mobileStr)` to generateTokenPair
 * — so the JWT carried a number while the DB carried a string. These
 * tests lock in the new contract: whatever type goes in is what comes
 * out, with no silent coercion.
 *
 * Reference: docs/reviews/CODE-REVIEW-2026-05-19.md §Findings.M1
 */

import { describe, it, expect, vi } from 'vitest';

// jwtService reads JWT_SECRET / JWT_REFRESH_SECRET from $env/static/private.
// Provide test-only values so verification can succeed in this suite.
vi.mock('$env/static/private', () => ({
	JWT_SECRET: 'test-jwt-secret-for-mobile-type-roundtrip',
	JWT_REFRESH_SECRET: 'test-refresh-secret-for-mobile-type-roundtrip'
}));

import jwt from 'jsonwebtoken';
import { generateTokenPair } from '$lib/services/jwtService.js';

describe('JWT mobile-number type round-trip (SEC-2 M1)', () => {
	it('preserves a string mobileNumber across the JWT round-trip', () => {
		const tokens = generateTokenPair(
			'user-id-123',
			'',
			'9876543210', // string form — what CSFLE stores in DB
			'',
			'token-id-1'
		);

		const decoded = jwt.decode(tokens.accessToken) as Record<string, unknown> | null;
		expect(decoded).toBeTruthy();
		expect(decoded?.mobileNumber).toBe('9876543210');
		// Strict type check — a regression here would mean jwt silently
		// coerced the string to a number, which is the exact bug M1
		// fixed at the signup-route level.
		expect(typeof decoded?.mobileNumber).toBe('string');
	});

	it('still accepts a numeric mobileNumber for legacy callers', () => {
		// Existing callers (check-dsa, dsa-onboarding, etc.) still pass
		// `dsaUser.mobileNumber` which is typed as number in the DB types.
		// Widening the param to `string | number` must not break them.
		const tokens = generateTokenPair(
			'user-id-456',
			'',
			9876543210,
			'',
			'token-id-2'
		);

		const decoded = jwt.decode(tokens.accessToken) as Record<string, unknown> | null;
		expect(decoded).toBeTruthy();
		expect(decoded?.mobileNumber).toBe(9876543210);
		expect(typeof decoded?.mobileNumber).toBe('number');
	});

	it('produces a verifiable token regardless of mobile type', () => {
		// Verification must succeed for both forms — the signature is
		// computed over the JSON-stringified payload, so number-vs-string
		// produces different tokens but each must be independently valid.
		const stringTokens = generateTokenPair('u1', '', '9876543210', '', 't1');
		const numberTokens = generateTokenPair('u2', '', 9876543210, '', 't2');

		const stringVerified = jwt.verify(
			stringTokens.accessToken,
			'test-jwt-secret-for-mobile-type-roundtrip',
			{ issuer: 'auth-system', audience: 'auth-client' }
		);
		const numberVerified = jwt.verify(
			numberTokens.accessToken,
			'test-jwt-secret-for-mobile-type-roundtrip',
			{ issuer: 'auth-system', audience: 'auth-client' }
		);

		expect((stringVerified as Record<string, unknown>).mobileNumber).toBe('9876543210');
		expect((numberVerified as Record<string, unknown>).mobileNumber).toBe(9876543210);
	});
});
