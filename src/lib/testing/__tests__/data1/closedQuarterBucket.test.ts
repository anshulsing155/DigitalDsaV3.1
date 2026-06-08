/**
 * DATA-1 — closedQuarterBucket unit tests.
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §2.5 / §12.
 *
 * Quarter granularity is the timing-attack defense (§9). A bug that wrote
 * exact dates would defeat the whole defense.
 */

import { describe, it, expect } from 'vitest';
import { closedQuarterBucket } from '$lib/server/data1/closedQuarterBucket';

describe('closedQuarterBucket', () => {
	describe('quarter boundaries', () => {
		it('March → Q1', () => {
			expect(closedQuarterBucket(new Date('2026-03-14T00:00:00Z'))).toBe('2026-Q1');
		});

		it('June → Q2', () => {
			expect(closedQuarterBucket(new Date('2026-06-30T23:59:59Z'))).toBe('2026-Q2');
		});

		it('September → Q3', () => {
			expect(closedQuarterBucket(new Date('2026-09-01T00:00:00Z'))).toBe('2026-Q3');
		});

		it('December → Q4', () => {
			expect(closedQuarterBucket(new Date('2026-12-31T23:59:59Z'))).toBe('2026-Q4');
		});

		it('January → Q1 (lower boundary)', () => {
			expect(closedQuarterBucket(new Date('2026-01-01T00:00:00Z'))).toBe('2026-Q1');
		});

		it('cross-year: Dec 2025 → 2025-Q4; Jan 2026 → 2026-Q1', () => {
			expect(closedQuarterBucket(new Date('2025-12-15T12:00:00Z'))).toBe('2025-Q4');
			expect(closedQuarterBucket(new Date('2026-01-05T12:00:00Z'))).toBe('2026-Q1');
		});
	});

	describe('input handling', () => {
		it('accepts an ISO string', () => {
			expect(closedQuarterBucket('2026-07-20T08:00:00Z')).toBe('2026-Q3');
		});

		it('returns empty string on invalid input', () => {
			expect(closedQuarterBucket(null)).toBe('');
			expect(closedQuarterBucket(undefined)).toBe('');
			expect(closedQuarterBucket('not-a-date')).toBe('');
			expect(closedQuarterBucket(new Date('invalid'))).toBe('');
		});
	});
});
