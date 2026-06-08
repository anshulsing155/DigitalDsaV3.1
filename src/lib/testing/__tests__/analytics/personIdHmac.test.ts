/**
 * DATA-4 — `person_id` HMAC unit tests.
 * Spec: docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md §3 / §9.
 *
 * Privacy-critical: `person_id` is the one-way bridge that lets analytics
 * recognise the same borrower across cases WITHOUT being reversible to a PAN.
 * A bug that made it reversible (weak pepper accepted, pepper leaked into the
 * output) would let an analytics-DB reader correlate rows back to real people.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { personIdFromPanHash, PERSON_ID_LENGTH_HEX } from '$lib/server/analytics/personIdHmac';

const TEST_PEPPER = 'a'.repeat(64); // 64 hex chars — well above the 32-char floor
const PAN_HASH = 'b'.repeat(64); // a plausible SHA-256 hex digest

beforeAll(() => {
	process.env.ANALYTICS_PEPPER = TEST_PEPPER;
});

afterAll(() => {
	delete process.env.ANALYTICS_PEPPER;
});

describe('personIdFromPanHash', () => {
	it('returns a 32-hex-char string', () => {
		const id = personIdFromPanHash(PAN_HASH);
		expect(id).toMatch(/^[0-9a-f]{32}$/);
		expect(id.length).toBe(PERSON_ID_LENGTH_HEX);
	});

	it('is deterministic — same pan_hash always produces the same person_id', () => {
		expect(personIdFromPanHash(PAN_HASH)).toBe(personIdFromPanHash(PAN_HASH));
	});

	it('produces different ids for different pan_hashes', () => {
		const a = personIdFromPanHash(PAN_HASH);
		const b = personIdFromPanHash('c'.repeat(64));
		expect(a).not.toBe(b);
	});

	it('produces a different id under a different pepper (the bridge is pepper-bound)', () => {
		const underA = personIdFromPanHash(PAN_HASH);
		process.env.ANALYTICS_PEPPER = 'd'.repeat(64);
		try {
			const underB = personIdFromPanHash(PAN_HASH);
			expect(underB).not.toBe(underA);
		} finally {
			process.env.ANALYTICS_PEPPER = TEST_PEPPER;
		}
	});

	it('does not leak the pepper into the output', () => {
		const id = personIdFromPanHash(PAN_HASH);
		expect(id).not.toContain(TEST_PEPPER);
		expect(TEST_PEPPER).not.toContain(id);
	});

	it('throws when ANALYTICS_PEPPER is missing', () => {
		const saved = process.env.ANALYTICS_PEPPER;
		delete process.env.ANALYTICS_PEPPER;
		try {
			expect(() => personIdFromPanHash(PAN_HASH)).toThrow(/ANALYTICS_PEPPER/);
		} finally {
			process.env.ANALYTICS_PEPPER = saved;
		}
	});

	it('throws when ANALYTICS_PEPPER is too short', () => {
		const saved = process.env.ANALYTICS_PEPPER;
		process.env.ANALYTICS_PEPPER = 'too-short';
		try {
			expect(() => personIdFromPanHash(PAN_HASH)).toThrow(/too short|ANALYTICS_PEPPER/);
		} finally {
			process.env.ANALYTICS_PEPPER = saved;
		}
	});

	it('throws on empty / non-string pan_hash (no "person_id of nothing")', () => {
		expect(() => personIdFromPanHash('')).toThrow(/pan_hash/);
		// @ts-expect-error — runtime defense
		expect(() => personIdFromPanHash(null)).toThrow(/pan_hash/);
		// @ts-expect-error — runtime defense
		expect(() => personIdFromPanHash(undefined)).toThrow(/pan_hash/);
	});
});
