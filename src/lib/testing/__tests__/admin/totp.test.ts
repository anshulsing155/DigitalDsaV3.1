/**
 * E.2 — Admin TOTP helpers unit tests
 * ══════════════════════════════════════════════════════════════════
 *   - generateSecret produces enough entropy + base32 shape
 *   - verifyToken accepts current code; tolerates ±1 step; rejects ±2+
 *   - verifyToken rejects malformed / wrong-length / non-numeric inputs
 *   - generateRecoveryCodes shape (count, format, uniqueness)
 *   - hashRecoveryCode is deterministic + normalizes whitespace/dashes/case
 *   - findMatchingRecoveryHash constant-time-walks the list
 *   - computeLockoutState rolls the window correctly
 *
 * Pure helpers — no DB, no network. Fast.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi } from 'vitest';
import { generateSync } from 'otplib';
import {
	generateSecret,
	buildOtpauthUrl,
	verifyToken,
	generateRecoveryCodes,
	hashRecoveryCode,
	findMatchingRecoveryHash,
	computeLockoutState,
	TOTP_ISSUER,
	RECOVERY_CODE_COUNT,
	LOCKOUT_THRESHOLD,
	LOCKOUT_WINDOW_MS
} from '$lib/server/admin/totp';

// ── Secret generation ──────────────────────────────────────────

describe('generateSecret', () => {
	it('returns a non-empty base32 string', () => {
		const s = generateSecret();
		expect(typeof s).toBe('string');
		expect(s.length).toBeGreaterThanOrEqual(16); // 160-bit secret in base32 ≈ 32 chars
		expect(s).toMatch(/^[A-Z2-7]+$/);
	});

	it('produces a different secret each call (entropy sanity)', () => {
		const a = generateSecret();
		const b = generateSecret();
		expect(a).not.toBe(b);
	});
});

// ── otpauth URL ────────────────────────────────────────────────

describe('buildOtpauthUrl', () => {
	it('encodes issuer + account label + secret in the standard format', () => {
		const url = buildOtpauthUrl('admin@example.com', 'JBSWY3DPEHPK3PXP');
		expect(url).toMatch(/^otpauth:\/\/totp\//);
		expect(url).toContain(TOTP_ISSUER);
		expect(url).toContain('admin%40example.com'); // URI-encoded @
		expect(url).toContain('secret=JBSWY3DPEHPK3PXP');
		expect(url).toContain(`issuer=${TOTP_ISSUER}`);
	});
});

// ── verifyToken ────────────────────────────────────────────────

describe('verifyToken', () => {
	const secret = generateSecret();

	function tokenAt(offsetSteps: number): string {
		// otplib v13 expects epoch in SECONDS (not ms). Build at synthetic
		// offset (steps × 30s) and return the 6-digit token.
		const epochSeconds = Math.floor(Date.now() / 1000) + offsetSteps * 30;
		return generateSync({
			strategy: 'totp',
			secret,
			algorithm: 'sha1',
			digits: 6,
			period: 30,
			epoch: epochSeconds
		});
	}

	it('accepts the current token', () => {
		expect(verifyToken(secret, tokenAt(0))).toBe(true);
	});

	it('accepts ±1 step drift', () => {
		expect(verifyToken(secret, tokenAt(-1))).toBe(true);
		expect(verifyToken(secret, tokenAt(+1))).toBe(true);
	});

	it('rejects ±2 steps drift (outside tolerance window)', () => {
		expect(verifyToken(secret, tokenAt(-2))).toBe(false);
		expect(verifyToken(secret, tokenAt(+2))).toBe(false);
	});

	it('normalizes whitespace + dashes in user input', () => {
		const t = tokenAt(0);
		const spaced = `${t.slice(0, 3)} ${t.slice(3)}`;
		const dashed = `${t.slice(0, 3)}-${t.slice(3)}`;
		expect(verifyToken(secret, spaced)).toBe(true);
		expect(verifyToken(secret, dashed)).toBe(true);
	});

	it('rejects non-numeric / wrong-length / empty / non-string inputs', () => {
		expect(verifyToken(secret, '12345')).toBe(false); // 5 digits
		expect(verifyToken(secret, '1234567')).toBe(false); // 7 digits
		expect(verifyToken(secret, 'abcdef')).toBe(false);
		expect(verifyToken(secret, '')).toBe(false);
		expect(verifyToken(secret, '   ')).toBe(false);
		// @ts-expect-error — typing is string-only; coverage for runtime garbage
		expect(verifyToken(secret, null)).toBe(false);
		// @ts-expect-error — same
		expect(verifyToken(secret, undefined)).toBe(false);
	});

	it('rejects everything when the stored secret is empty / falsy', () => {
		expect(verifyToken('', tokenAt(0))).toBe(false);
		// @ts-expect-error — same
		expect(verifyToken(null, tokenAt(0))).toBe(false);
	});
});

// ── Recovery codes ─────────────────────────────────────────────

describe('generateRecoveryCodes', () => {
	it('generates RECOVERY_CODE_COUNT (8) codes by default', () => {
		const codes = generateRecoveryCodes();
		expect(codes.length).toBe(RECOVERY_CODE_COUNT);
		expect(RECOVERY_CODE_COUNT).toBe(8);
	});

	it('formats each as xxxx-xxxx-xxxx-xxxx', () => {
		const codes = generateRecoveryCodes(3);
		for (const c of codes) {
			expect(c).toMatch(/^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/);
		}
	});

	it('all codes unique across a batch', () => {
		const codes = generateRecoveryCodes(8);
		expect(new Set(codes).size).toBe(8);
	});
});

describe('hashRecoveryCode', () => {
	it('is deterministic — same code → same hash', () => {
		const c = 'abcd-ef01-2345-6789';
		expect(hashRecoveryCode(c)).toBe(hashRecoveryCode(c));
	});

	it('normalizes whitespace + dashes + case before hashing', () => {
		const canonical = hashRecoveryCode('abcd-ef01-2345-6789');
		expect(hashRecoveryCode('ABCD-EF01-2345-6789')).toBe(canonical);
		expect(hashRecoveryCode('abcdef0123456789')).toBe(canonical);
		expect(hashRecoveryCode(' abcd ef01 2345 6789 ')).toBe(canonical);
	});

	it('produces a 64-char hex digest (SHA-256)', () => {
		const h = hashRecoveryCode('abcd-ef01-2345-6789');
		expect(h).toMatch(/^[0-9a-f]{64}$/);
	});
});

describe('findMatchingRecoveryHash', () => {
	it('returns the matching hash when the code is in the list', () => {
		const codes = generateRecoveryCodes(3);
		const hashes = codes.map(hashRecoveryCode);
		expect(findMatchingRecoveryHash(codes[1], hashes)).toBe(hashes[1]);
	});

	it('returns null when the code is not in the list', () => {
		const codes = generateRecoveryCodes(3);
		const hashes = codes.map(hashRecoveryCode);
		const stranger = generateRecoveryCodes(1)[0];
		expect(findMatchingRecoveryHash(stranger, hashes)).toBeNull();
	});

	it('normalizes input case + dashes before lookup', () => {
		const codes = generateRecoveryCodes(2);
		const hashes = codes.map(hashRecoveryCode);
		// User types in uppercase without dashes
		const variant = codes[0].toUpperCase().replace(/-/g, '');
		expect(findMatchingRecoveryHash(variant, hashes)).toBe(hashes[0]);
	});

	it('returns null on empty list', () => {
		expect(findMatchingRecoveryHash('anything', [])).toBeNull();
	});

	it('skips malformed entries in storage instead of throwing', () => {
		const codes = generateRecoveryCodes(2);
		const hashes = codes.map(hashRecoveryCode);
		const dirtyList = [...hashes, 'not-a-hash', 'tooshort'];
		expect(findMatchingRecoveryHash(codes[0], dirtyList)).toBe(hashes[0]);
	});
});

// ── Lockout state ──────────────────────────────────────────────

describe('computeLockoutState', () => {
	const now = new Date('2026-06-15T12:00:00Z');

	it('not locked out when there are no recent failed attempts', () => {
		const { state, trimmedAttempts } = computeLockoutState([], now);
		expect(state.isLockedOut).toBe(false);
		expect(state.recentFailureCount).toBe(0);
		expect(trimmedAttempts).toEqual([]);
	});

	it('not locked out when failures are stale (outside the window)', () => {
		const stale = new Date(now.getTime() - LOCKOUT_WINDOW_MS - 1000);
		const { state, trimmedAttempts } = computeLockoutState(
			[stale, stale, stale, stale, stale],
			now
		);
		expect(state.isLockedOut).toBe(false);
		expect(state.recentFailureCount).toBe(0);
		expect(trimmedAttempts).toEqual([]); // all stale are trimmed
	});

	it('locks out at exactly LOCKOUT_THRESHOLD recent failures', () => {
		const fresh = new Date(now.getTime() - 60 * 1000);
		const attempts = Array(LOCKOUT_THRESHOLD).fill(fresh);
		const { state } = computeLockoutState(attempts, now);
		expect(state.isLockedOut).toBe(true);
		expect(state.recentFailureCount).toBe(LOCKOUT_THRESHOLD);
		expect(state.unlocksAt).toBeDefined();
	});

	it('unlocksAt = oldest-attempt + WINDOW_MS', () => {
		const oldestFresh = new Date(now.getTime() - 10 * 60 * 1000);
		const newer = new Date(now.getTime() - 1 * 60 * 1000);
		const attempts = [oldestFresh, newer, newer, newer, newer];
		const { state } = computeLockoutState(attempts, now);
		expect(state.unlocksAt!.getTime()).toBe(
			oldestFresh.getTime() + LOCKOUT_WINDOW_MS
		);
	});

	it('mixed stale + fresh attempts only count the fresh', () => {
		const stale = new Date(now.getTime() - LOCKOUT_WINDOW_MS - 5000);
		const fresh = new Date(now.getTime() - 30_000);
		const attempts = [stale, stale, fresh, fresh, fresh];
		const { state } = computeLockoutState(attempts, now);
		expect(state.recentFailureCount).toBe(3);
		expect(state.isLockedOut).toBe(false);
	});

	it('handles undefined failed_attempts gracefully', () => {
		const { state, trimmedAttempts } = computeLockoutState(undefined, now);
		expect(state.isLockedOut).toBe(false);
		expect(trimmedAttempts).toEqual([]);
	});
});

// ── TOTP_ISSUER constant (locked) ──────────────────────────────

describe('TOTP_ISSUER', () => {
	it('is "DigitalDSA" (changing this orphans every existing enrollment)', () => {
		expect(TOTP_ISSUER).toBe('DigitalDSA');
	});
});
