/**
 * DATA-4 — age computation + bracketing unit tests.
 * Spec: docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md §5 / §9.
 */

import { describe, it, expect } from 'vitest';
import { computeAge, ageBracket } from '$lib/server/analytics/ageBracket';

describe('computeAge', () => {
	const asOf = new Date('2024-06-15');

	it('computes whole-year age when the birthday has already passed this year', () => {
		expect(computeAge(new Date('1994-01-01'), asOf)).toBe(30);
	});

	it('subtracts a year when the birthday has not yet occurred this year', () => {
		expect(computeAge(new Date('1994-12-01'), asOf)).toBe(29);
	});

	it('treats the exact birthday as the new age (lower-inclusive)', () => {
		expect(computeAge(new Date('1994-06-15'), asOf)).toBe(30);
	});

	it('accepts an ISO date string', () => {
		expect(computeAge('1990-06-15', asOf)).toBe(34);
	});

	it('returns null for a future DOB, invalid date, or missing input', () => {
		expect(computeAge(new Date('2030-01-01'), asOf)).toBeNull();
		expect(computeAge('not-a-date', asOf)).toBeNull();
		expect(computeAge(null)).toBeNull();
		expect(computeAge(undefined)).toBeNull();
	});
});

describe('ageBracket', () => {
	it('buckets into lower-inclusive 5-year bands', () => {
		expect(ageBracket(30)).toBe('30-35');
		expect(ageBracket(34)).toBe('30-35');
		expect(ageBracket(29)).toBe('25-30');
		expect(ageBracket(25)).toBe('25-30');
		expect(ageBracket(0)).toBe('0-5');
	});

	it('returns null for invalid / negative / missing age', () => {
		expect(ageBracket(null)).toBeNull();
		expect(ageBracket(undefined)).toBeNull();
		expect(ageBracket(-1)).toBeNull();
		expect(ageBracket(Number.NaN)).toBeNull();
	});
});
