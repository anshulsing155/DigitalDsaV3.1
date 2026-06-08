/**
 * DATA-2 — revocation token HMAC unit tests.
 * Spec: docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md §3 / §9.
 *
 * Privacy-critical: the token IS the authentication for customer self-
 * revocation. A bug that lets an attacker forge a valid token (or that
 * leaks the pepper via timing) would let attackers revoke arbitrary
 * customers' consent.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	generateRevocationToken,
	verifyRevocationToken
} from '$lib/server/data2/revocationToken';

const TEST_PEPPER = 'a'.repeat(64); // 64 hex chars — well above the 32-char floor
const INPUTS = {
	vault_entry_id: '661b2c3d4e5f6a7b8c9d0e1f',
	dsa_id: '5a4b3c2d1e0f9a8b7c6d5e4f',
	mobile_hash: 'sha256:9aebcdef0123456789abcdef0123456789abcdef'
};

beforeAll(() => {
	process.env.DATA2_TOKEN_PEPPER = TEST_PEPPER;
});

afterAll(() => {
	delete process.env.DATA2_TOKEN_PEPPER;
});

describe('generateRevocationToken', () => {
	it('returns a 32-hex-char string', () => {
		const tok = generateRevocationToken(INPUTS);
		expect(tok).toMatch(/^[0-9a-f]{32}$/);
	});

	it('is deterministic — same inputs always produce the same token', () => {
		const t1 = generateRevocationToken(INPUTS);
		const t2 = generateRevocationToken(INPUTS);
		expect(t1).toBe(t2);
	});

	it('produces different tokens when ANY input changes', () => {
		const base = generateRevocationToken(INPUTS);
		const diffEntry = generateRevocationToken({ ...INPUTS, vault_entry_id: '6'.repeat(24) });
		const diffDsa = generateRevocationToken({ ...INPUTS, dsa_id: '7'.repeat(24) });
		const diffMobile = generateRevocationToken({ ...INPUTS, mobile_hash: 'different' });
		expect(diffEntry).not.toBe(base);
		expect(diffDsa).not.toBe(base);
		expect(diffMobile).not.toBe(base);
	});

	it('throws when DATA2_TOKEN_PEPPER is missing', () => {
		const saved = process.env.DATA2_TOKEN_PEPPER;
		delete process.env.DATA2_TOKEN_PEPPER;
		try {
			expect(() => generateRevocationToken(INPUTS)).toThrow(/DATA2_TOKEN_PEPPER/);
		} finally {
			process.env.DATA2_TOKEN_PEPPER = saved;
		}
	});

	it('throws when DATA2_TOKEN_PEPPER is too short', () => {
		const saved = process.env.DATA2_TOKEN_PEPPER;
		process.env.DATA2_TOKEN_PEPPER = 'too-short';
		try {
			expect(() => generateRevocationToken(INPUTS)).toThrow(/too short|DATA2_TOKEN_PEPPER/);
		} finally {
			process.env.DATA2_TOKEN_PEPPER = saved;
		}
	});
});

describe('verifyRevocationToken', () => {
	it('accepts a correctly-derived token', () => {
		const tok = generateRevocationToken(INPUTS);
		expect(verifyRevocationToken(tok, INPUTS)).toBe(true);
	});

	it('rejects a tampered token (single char changed)', () => {
		const tok = generateRevocationToken(INPUTS);
		// Flip the last character — any flip should fail
		const last = tok[tok.length - 1];
		const flipped = last === '0' ? '1' : '0';
		const tampered = tok.slice(0, -1) + flipped;
		expect(verifyRevocationToken(tampered, INPUTS)).toBe(false);
	});

	it('rejects a token for different inputs', () => {
		const tokForA = generateRevocationToken(INPUTS);
		const inputsB = { ...INPUTS, vault_entry_id: '6'.repeat(24) };
		// Trying to verify A's token against B's inputs MUST fail.
		expect(verifyRevocationToken(tokForA, inputsB)).toBe(false);
	});

	it('rejects empty / wrong-length / non-string tokens', () => {
		expect(verifyRevocationToken('', INPUTS)).toBe(false);
		expect(verifyRevocationToken('short', INPUTS)).toBe(false);
		expect(verifyRevocationToken('a'.repeat(33), INPUTS)).toBe(false);
		// @ts-expect-error — runtime defense
		expect(verifyRevocationToken(null, INPUTS)).toBe(false);
		// @ts-expect-error
		expect(verifyRevocationToken(undefined, INPUTS)).toBe(false);
	});

	it('fails closed when pepper is missing (does not crash)', () => {
		const tok = generateRevocationToken(INPUTS);
		const saved = process.env.DATA2_TOKEN_PEPPER;
		delete process.env.DATA2_TOKEN_PEPPER;
		try {
			expect(verifyRevocationToken(tok, INPUTS)).toBe(false);
		} finally {
			process.env.DATA2_TOKEN_PEPPER = saved;
		}
	});
});
