/**
 * F.1 — Referral code generator + format contract
 * ══════════════════════════════════════════════════════════════════
 * Pure-ish — exercises generateReferralCode (no DB) + locks the
 * character set + format. mintUniqueReferralCode requires DB and is
 * exercised by integration tests separately.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/database/mongo', () => ({
	DsaApplications: { findOne: vi.fn() }
}));

import {
	generateReferralCode,
	REFERRAL_CODE_REGEX
} from '$lib/server/referrals/referralCode';

describe('generateReferralCode — format', () => {
	it('is 8 characters long', () => {
		const code = generateReferralCode();
		expect(code.length).toBe(8);
	});

	it('uses only the curated character set [A-Z2-9]', () => {
		for (let i = 0; i < 50; i++) {
			expect(generateReferralCode()).toMatch(/^[A-Z2-9]+$/);
		}
	});

	it('never contains lookalike chars (0, O, 1, I, l)', () => {
		const codes = Array.from({ length: 500 }, () => generateReferralCode()).join('');
		expect(codes).not.toMatch(/[0OIl1]/);
	});

	it('passes the REFERRAL_CODE_REGEX', () => {
		for (let i = 0; i < 20; i++) {
			expect(REFERRAL_CODE_REGEX.test(generateReferralCode())).toBe(true);
		}
	});

	it('generates DIFFERENT codes on consecutive calls (entropy sanity)', () => {
		const a = generateReferralCode();
		const b = generateReferralCode();
		expect(a).not.toBe(b);
	});

	it('500 generations have negligible collisions', () => {
		const codes = new Set<string>();
		for (let i = 0; i < 500; i++) codes.add(generateReferralCode());
		// Birthday-bound: P(collision) at 500 / 32^8 is ~1.9e-7. Accept up
		// to 1 collision as statistically tolerable (probability ~9.4e-5).
		expect(codes.size).toBeGreaterThanOrEqual(499);
	});
});

describe('REFERRAL_CODE_REGEX', () => {
	it('rejects too-short strings', () => {
		expect(REFERRAL_CODE_REGEX.test('ABCD2345')).toBe(true);
		expect(REFERRAL_CODE_REGEX.test('ABCD234')).toBe(false);
		expect(REFERRAL_CODE_REGEX.test('ABCD23456')).toBe(false);
	});

	it('rejects lowercase', () => {
		expect(REFERRAL_CODE_REGEX.test('abcd2345')).toBe(false);
	});

	it('rejects lookalike chars', () => {
		expect(REFERRAL_CODE_REGEX.test('ABCDOIL1')).toBe(false);
		expect(REFERRAL_CODE_REGEX.test('ABCD2310')).toBe(false); // contains 1, 0
	});

	it('rejects symbols / dashes / spaces', () => {
		expect(REFERRAL_CODE_REGEX.test('ABCD-234')).toBe(false);
		expect(REFERRAL_CODE_REGEX.test('ABCD 234')).toBe(false);
		expect(REFERRAL_CODE_REGEX.test('ABCD234!')).toBe(false);
	});
});
