/**
 * DATA-4 — income bracketing unit tests.
 * Spec: docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md §5 / §9.
 *
 * Input is MONTHLY income; bands are ANNUAL (×12) — see incomeBracket.ts.
 */

import { describe, it, expect } from 'vitest';
import { incomeBracket } from '$lib/server/analytics/incomeBracket';

describe('incomeBracket', () => {
	it('buckets on annualized income (monthly × 12)', () => {
		expect(incomeBracket(15_000)).toBe('<2L'); // ₹1.8L/yr
		expect(incomeBracket(50_000)).toBe('5L-10L'); // ₹6L/yr
		expect(incomeBracket(100_000)).toBe('10L-20L'); // ₹12L/yr
		expect(incomeBracket(500_000)).toBe('>50L'); // ₹60L/yr
	});

	it('is lower-inclusive at band boundaries', () => {
		// ₹2L annual exactly = monthly 200000/12 → falls in '2L-5L'
		expect(incomeBracket((2 * 100_000) / 12)).toBe('2L-5L');
		// Just under ₹2L annual → '<2L'
		expect(incomeBracket((2 * 100_000 - 12) / 12)).toBe('<2L');
		// ₹50L annual exactly → top band '>50L'
		expect(incomeBracket((50 * 100_000) / 12)).toBe('>50L');
	});

	it('returns null for zero / negative / non-finite / missing income', () => {
		expect(incomeBracket(0)).toBeNull();
		expect(incomeBracket(-5000)).toBeNull();
		expect(incomeBracket(Number.NaN)).toBeNull();
		expect(incomeBracket(null)).toBeNull();
		expect(incomeBracket(undefined)).toBeNull();
	});
});
