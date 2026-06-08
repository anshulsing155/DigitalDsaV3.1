import { describe, it, expect } from 'vitest';
import { createCsrfToken, verifyCsrfToken } from '$lib/server/csrfTokens';

const TEST_SECRET = 'test-csrf-secret-key-for-unit-tests';

describe('CSRF Token Utility', () => {
	describe('createCsrfToken', () => {
		it('generates a token in salt-hmac format', () => {
			const token = createCsrfToken(TEST_SECRET);
			const parts = token.split('-');
			expect(parts).toHaveLength(2);
			// Salt = 16 bytes hex = 32 chars, HMAC-SHA256 = 32 bytes hex = 64 chars
			expect(parts[0]).toHaveLength(32);
			expect(parts[1]).toHaveLength(64);
		});

		it('generates unique tokens on each call', () => {
			const token1 = createCsrfToken(TEST_SECRET);
			const token2 = createCsrfToken(TEST_SECRET);
			expect(token1).not.toBe(token2);
		});
	});

	describe('verifyCsrfToken', () => {
		it('verifies a valid token', () => {
			const token = createCsrfToken(TEST_SECRET);
			expect(verifyCsrfToken(TEST_SECRET, token)).toBe(true);
		});

		it('rejects a token created with a different secret', () => {
			const token = createCsrfToken(TEST_SECRET);
			expect(verifyCsrfToken('wrong-secret', token)).toBe(false);
		});

		it('rejects a tampered token (modified HMAC)', () => {
			const token = createCsrfToken(TEST_SECRET);
			const [salt] = token.split('-');
			const tampered = `${salt}-${'a'.repeat(64)}`;
			expect(verifyCsrfToken(TEST_SECRET, tampered)).toBe(false);
		});

		it('rejects a tampered token (modified salt)', () => {
			const token = createCsrfToken(TEST_SECRET);
			const [, hmac] = token.split('-');
			const tampered = `${'b'.repeat(32)}-${hmac}`;
			expect(verifyCsrfToken(TEST_SECRET, tampered)).toBe(false);
		});

		it('rejects empty string', () => {
			expect(verifyCsrfToken(TEST_SECRET, '')).toBe(false);
		});

		it('rejects null/undefined', () => {
			expect(verifyCsrfToken(TEST_SECRET, null as any)).toBe(false);
			expect(verifyCsrfToken(TEST_SECRET, undefined as any)).toBe(false);
		});

		it('rejects token without separator', () => {
			expect(verifyCsrfToken(TEST_SECRET, 'no-separator-here')).toBe(false);
		});

		it('rejects token with wrong salt length', () => {
			expect(verifyCsrfToken(TEST_SECRET, `short-${'a'.repeat(64)}`)).toBe(false);
		});

		it('rejects token with wrong HMAC length', () => {
			expect(verifyCsrfToken(TEST_SECRET, `${'a'.repeat(32)}-short`)).toBe(false);
		});
	});

	describe('round-trip consistency', () => {
		it('verifies 100 generated tokens', () => {
			for (let i = 0; i < 100; i++) {
				const token = createCsrfToken(TEST_SECRET);
				expect(verifyCsrfToken(TEST_SECRET, token)).toBe(true);
			}
		});
	});
});
