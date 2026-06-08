/**
 * C.7 — Test-entity filter helper unit tests.
 *
 * The predicate `isTestEntityName()` catches name-pattern test data that
 * leaked into production-shaped UI per the audit. Patterns:
 *   - Starts with "Sample " — hardcoded sampleRuleDocs (PVT / GOV / NBFC)
 *   - Starts with "sec5-r1-test-" — SEC-5 dev seed script artifacts
 *   - Starts with "Test " — E2E auth fixtures + generic test docs
 *   - Starts with "E2E " — E2E auth users
 *   - Contains "xyz bank" — real user noise submissions flagged for
 *     human review (the predicate is the trigger; the cleanup script
 *     never auto-deletes these)
 *   - Contains "testing" — same noise class
 *
 * False-positive guards (must NOT be flagged):
 *   - Real lenders containing substrings (e.g. "Attesting Bank" — the
 *     /b boundary blocks this; "samplewith…" — anchored prefix blocks)
 */

import { describe, it, expect } from 'vitest';
import {
	isTestEntityName,
	E2E_TEST_MOBILE_NUMBERS,
	PROD_ENTITY_FILTER
} from '$lib/server/testEntityFilter';

describe('isTestEntityName — name-pattern matches', () => {
	it.each([
		'Sample PVT Bank',
		'Sample GOV Bank',
		'Sample NBFC',
		'sample pvt bank' // case-insensitive
	])('flags hardcoded sample lender "%s"', (name) => {
		expect(isTestEntityName(name)).toBe(true);
	});

	it.each(['sec5-r1-test-lender-a', 'SEC5-R1-TEST-Foo'])(
		'flags SEC-5 dev seed lender "%s"',
		(name) => {
			expect(isTestEntityName(name)).toBe(true);
		}
	);

	it.each(['Test RM', 'Test User', 'test bank'])(
		'flags "Test " prefixed entity "%s"',
		(name) => {
			expect(isTestEntityName(name)).toBe(true);
		}
	);

	it.each(['E2E Test User', 'E2E Test RM', 'e2e test admin'])(
		'flags E2E fixture name "%s"',
		(name) => {
			expect(isTestEntityName(name)).toBe(true);
		}
	);

	it.each(['xyz bank', 'XYZ BANK', 'Something xyz bank Pvt Ltd'])(
		'flags user-noise "%s"',
		(name) => {
			expect(isTestEntityName(name)).toBe(true);
		}
	);

	it.each(['testing', 'Some testing entity', 'A bank testing thing'])(
		'flags "testing" noise "%s"',
		(name) => {
			expect(isTestEntityName(name)).toBe(true);
		}
	);
});

describe('isTestEntityName — false-positive guards', () => {
	it.each(['', '   ', null, undefined])('returns false for empty/null/whitespace input', (input) => {
		expect(isTestEntityName(input as string | null | undefined)).toBe(false);
	});

	it.each([
		'State Bank of India',
		'HDFC Bank',
		'ICICI Bank',
		'AU Small Finance Bank',
		'LIC Housing Finance',
		'Bajaj Finserv'
	])('does NOT flag real lender "%s"', (name) => {
		expect(isTestEntityName(name)).toBe(false);
	});

	it.each([
		// "Attesting" contains "testing" letters but should not match — \b
		// word-boundary anchor must prevent it.
		'Attesting Bank',
		// "samplewith" contains "sample" but not as a prefix-with-space —
		// the anchored "sample " prefix pattern must require the trailing
		// space.
		'samplewithnospace',
		// Real bank names that contain "test" without the word boundary
		// should also stay clean.
		'Greatest Bank Ever',
		'Manifestation Finance'
	])('does NOT misidentify "%s" via false substring', (name) => {
		expect(isTestEntityName(name)).toBe(false);
	});
});

describe('exported constants', () => {
	it('E2E_TEST_MOBILE_NUMBERS lists the three e2e-auth fixture mobiles', () => {
		// Spec-locked: changing these numbers without coordinating with
		// /api/test/e2e-auth would leak E2E rows into prod surfaces.
		expect(E2E_TEST_MOBILE_NUMBERS).toEqual([9999900000, 9999900001, 9999900002]);
	});

	it('PROD_ENTITY_FILTER matches docs where is_test is false OR absent', () => {
		// New rows (without is_test) must still pass the filter, otherwise
		// every legitimate document would be hidden. Spec-locked.
		expect(PROD_ENTITY_FILTER).toEqual({ is_test: { $in: [false, null] } });
	});
});
