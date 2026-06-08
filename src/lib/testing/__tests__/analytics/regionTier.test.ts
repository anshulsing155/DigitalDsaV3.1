/**
 * DATA-4 — city → region tier lookup unit tests.
 * Spec: docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md §5 / §9 / Q6.
 */

import { describe, it, expect } from 'vitest';
import { regionTier } from '$lib/server/analytics/regionTier';

describe('regionTier', () => {
	it('maps metros to Tier 1 (case-insensitive, alias-aware)', () => {
		expect(regionTier('Mumbai')).toBe('Tier 1');
		expect(regionTier('mumbai')).toBe('Tier 1');
		expect(regionTier('Bangalore')).toBe('Tier 1');
		expect(regionTier('Bengaluru')).toBe('Tier 1');
		expect(regionTier('New Delhi')).toBe('Tier 1');
	});

	it('maps large non-metros to Tier 2', () => {
		expect(regionTier('Indore')).toBe('Tier 2');
		expect(regionTier('Gurugram')).toBe('Tier 2');
		expect(regionTier('Vizag')).toBe('Tier 2');
	});

	it('treats a non-empty unrecognised city as Tier 3', () => {
		expect(regionTier('Bhuj')).toBe('Tier 3');
		expect(regionTier('SomeSmallTown')).toBe('Tier 3');
	});

	it('returns null for empty / whitespace / missing input', () => {
		expect(regionTier('')).toBeNull();
		expect(regionTier('   ')).toBeNull();
		expect(regionTier(null)).toBeNull();
		expect(regionTier(undefined)).toBeNull();
	});
});
