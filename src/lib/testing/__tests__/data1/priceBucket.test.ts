/**
 * DATA-1 — priceBucket / loanAmountBucket unit tests.
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §2.3 / §2.4 / §12.
 *
 * Floor-to-₹10,000 is the privacy-load-bearing contract. A bug here would
 * leak exact transaction values into the vault.
 */

import { describe, it, expect } from 'vitest';
import { priceBucket, loanAmountBucket } from '$lib/server/data1/priceBucket';

describe('priceBucket', () => {
	it('floors a non-multiple-of-10k value down to the nearest ₹10k', () => {
		expect(priceBucket(18_743_200)).toBe(18_740_000);
	});

	it('leaves an exact multiple of ₹10k unchanged', () => {
		expect(priceBucket(20_000_000)).toBe(20_000_000);
	});

	it('returns 0 for sub-₹10k input (the floor)', () => {
		expect(priceBucket(9_999)).toBe(0);
	});

	it('returns 0 for zero / negative / NaN / Infinity (defensive)', () => {
		expect(priceBucket(0)).toBe(0);
		expect(priceBucket(-1)).toBe(0);
		expect(priceBucket(NaN)).toBe(0);
		expect(priceBucket(Infinity)).toBe(0);
	});

	it('handles ₹10 Cr correctly (no overflow / floating-point drift)', () => {
		expect(priceBucket(100_000_000)).toBe(100_000_000);
		expect(priceBucket(100_005_000)).toBe(100_000_000);
	});
});

describe('loanAmountBucket', () => {
	it('shares the same rule as priceBucket (alias)', () => {
		expect(loanAmountBucket(8_756_400)).toBe(priceBucket(8_756_400));
		expect(loanAmountBucket(8_756_400)).toBe(8_750_000);
	});
});
