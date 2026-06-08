/**
 * DATA-1 — priceBand + kAnonymityThreshold unit tests.
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §4 + §9.
 *
 * priceBand drives the Mongo $gte / $lte range; kAnonymityThreshold
 * decides when to suppress geography results — both privacy-load-bearing.
 */

import { describe, it, expect } from 'vitest';
import {
	priceBand,
	kAnonymityThreshold,
	LUXURY_THRESHOLD,
	K_THRESHOLD_STANDARD,
	K_THRESHOLD_LUXURY
} from '$lib/server/data1/priceBand';

describe('priceBand', () => {
	it('returns ±40% bucketed band around target_price', () => {
		// target = ₹2 Cr → 0.6 * 2 Cr = ₹1.2 Cr, 1.4 * 2 Cr = ₹2.8 Cr
		const band = priceBand(20_000_000);
		expect(band.lower).toBe(12_000_000);
		expect(band.upper).toBe(28_000_000);
	});

	it('floors both ends to the ₹10k bucket granularity', () => {
		// target = ₹1,87,43,200 → low = 0.6 * 1.874 Cr = 1.12 Cr (already at 10k)
		const band = priceBand(18_743_200);
		expect(band.lower % 10_000).toBe(0);
		expect(band.upper % 10_000).toBe(0);
	});

	it('returns a degenerate (0, 0) band for non-positive / non-finite input', () => {
		expect(priceBand(0)).toEqual({ lower: 0, upper: 0 });
		expect(priceBand(-1)).toEqual({ lower: 0, upper: 0 });
		expect(priceBand(NaN)).toEqual({ lower: 0, upper: 0 });
	});

	it('produces an upper bound at or above the luxury threshold for ≥ ₹3 Cr targets', () => {
		// ₹3 Cr target → upper = 1.4 * 3 Cr = ₹4.2 Cr > LUXURY_THRESHOLD.
		const band = priceBand(30_000_000);
		expect(band.upper).toBeGreaterThanOrEqual(LUXURY_THRESHOLD);
	});
});

describe('kAnonymityThreshold', () => {
	it('returns the standard threshold (5) for sub-luxury bands', () => {
		const band = priceBand(20_000_000); // upper = 2.8 Cr < 3 Cr
		expect(kAnonymityThreshold(band)).toBe(K_THRESHOLD_STANDARD);
		expect(kAnonymityThreshold(band)).toBe(5);
	});

	it('returns the luxury threshold (10) when the upper band crosses ₹3 Cr', () => {
		const band = priceBand(25_000_000); // upper = 3.5 Cr ≥ 3 Cr
		expect(kAnonymityThreshold(band)).toBe(K_THRESHOLD_LUXURY);
		expect(kAnonymityThreshold(band)).toBe(10);
	});

	it('boundary: a target whose UPPER band lands exactly at ₹3 Cr uses luxury threshold', () => {
		// target * 1.4 = LUXURY_THRESHOLD → target = LUXURY_THRESHOLD / 1.4
		const target = Math.ceil(LUXURY_THRESHOLD / 1.4 / 10_000) * 10_000;
		const band = priceBand(target);
		expect(band.upper).toBeGreaterThanOrEqual(LUXURY_THRESHOLD);
		expect(kAnonymityThreshold(band)).toBe(K_THRESHOLD_LUXURY);
	});
});
