/**
 * DATA-1 — recencyScore unit tests.
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §4.
 *
 * The composite ranking weight on recency is 0.6 — a bug here causes
 * the wrong DSAs to surface in routing. Privacy-adjacent rather than
 * privacy-load-bearing (no PII leak), but quality-load-bearing.
 */

import { describe, it, expect } from 'vitest';
import {
	recencyScore,
	quarterDelta,
	quarterFromDate
} from '$lib/server/data1/recencyScore';

describe('recencyScore', () => {
	it('returns 1.0 for the current quarter (zero delta)', () => {
		expect(recencyScore('2026-Q3', '2026-Q3')).toBe(1.0);
	});

	it('decays linearly: 0.85 at 1 quarter back', () => {
		expect(recencyScore('2026-Q2', '2026-Q3')).toBeCloseTo(0.85, 5);
	});

	it('decays linearly: 0.7 at 2 quarters back', () => {
		expect(recencyScore('2026-Q1', '2026-Q3')).toBeCloseTo(0.7, 5);
	});

	it('floors at 0.1 for entries 6+ quarters old', () => {
		// 2025-Q1 vs 2026-Q3 = 6 quarters back exactly → floor.
		expect(recencyScore('2025-Q1', '2026-Q3')).toBe(0.1);
		// 2024-Q4 vs 2026-Q3 = 7 quarters back → still floor.
		expect(recencyScore('2024-Q4', '2026-Q3')).toBe(0.1);
	});

	it('collapses future-dated entries to 1.0 (clock skew defense)', () => {
		// A 2027-Q1 entry in a 2026-Q3 query should not get a > 1.0 score.
		expect(recencyScore('2027-Q1', '2026-Q3')).toBe(1.0);
	});

	it('returns 0 for malformed entry quarter', () => {
		expect(recencyScore('not-a-quarter', '2026-Q3')).toBe(0);
		expect(recencyScore('2026', '2026-Q3')).toBe(0);
		expect(recencyScore('', '2026-Q3')).toBe(0);
	});

	it('returns 0 for malformed current-quarter', () => {
		expect(recencyScore('2026-Q1', 'not-a-quarter')).toBe(0);
	});
});

describe('quarterDelta', () => {
	it('zero for same quarter', () => {
		expect(quarterDelta('2026-Q3', '2026-Q3')).toBe(0);
	});

	it('positive for past entry', () => {
		expect(quarterDelta('2025-Q4', '2026-Q3')).toBe(3);
	});

	it('negative for future entry (clock skew)', () => {
		expect(quarterDelta('2026-Q4', '2026-Q3')).toBe(-1);
	});

	it('NaN on malformed input', () => {
		expect(quarterDelta('bad', '2026-Q3')).toBeNaN();
	});
});

describe('quarterFromDate', () => {
	it('returns the calendar quarter for a Date', () => {
		expect(quarterFromDate(new Date('2026-03-14T00:00:00Z'))).toBe('2026-Q1');
		expect(quarterFromDate(new Date('2026-07-01T00:00:00Z'))).toBe('2026-Q3');
	});
});
