/**
 * DATA-4 — employer → industry lookup unit tests.
 * Spec: docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md §5 / §9 / Q5.
 */

import { describe, it, expect } from 'vitest';
import { industryLookup } from '$lib/server/analytics/industryLookup';

describe('industryLookup', () => {
	it('maps known employers to their industry category (case-insensitive)', () => {
		expect(industryLookup('Infosys Limited')).toBe('IT_Services');
		expect(industryLookup('infosys limited')).toBe('IT_Services');
		expect(industryLookup('HDFC Bank')).toBe('Banking_Finance');
		expect(industryLookup('Apollo Hospital')).toBe('Healthcare_Pharma');
		expect(industryLookup('Sharma Trading Co')).toBe('Retail_Trading');
		expect(industryLookup('Indian Railways')).toBe('Government_PSU');
	});

	it('returns "other" for a non-empty but unrecognised employer', () => {
		expect(industryLookup('Self employed plumber')).toBe('other');
		expect(industryLookup('Xyzzy')).toBe('other');
	});

	it('returns null for empty / whitespace / missing input', () => {
		expect(industryLookup('')).toBeNull();
		expect(industryLookup('   ')).toBeNull();
		expect(industryLookup(null)).toBeNull();
		expect(industryLookup(undefined)).toBeNull();
	});
});
