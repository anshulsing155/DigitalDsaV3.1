/**
 * Test-entity filter helpers (C.7).
 *
 * Centralises the detection + filtering of test/sample data that leaked
 * into production-shaped UI per the audit:
 *   - "Sample GOV Bank / NBFC / PVT Bank" injected at runtime by the rule
 *     engine
 *   - "SEC-5 R1 Test Lender A" seeded by a one-off SEC-5 test script
 *   - "E2E Test User / RM / Admin" upserted by /api/test/e2e-auth (dev-only
 *     endpoint, but rows persist in the shared MongoDB)
 *   - Free-text "xyz bank" / "testing" submissions in RM contacts (these
 *     are real user noise, not test artifacts — out of scope for the
 *     name-pattern filter; flagged for human review by the cleanup script)
 *
 * Two layers per spec C.7:
 *   1. **Standing filter** — every production-facing list query adds
 *      `PROD_ENTITY_FILTER` (matches docs where is_test is false or absent).
 *      In dev, surfaces show everything so the team can still test.
 *   2. **Name-pattern predicate** — `isTestEntityName()` catches leaks even
 *      on collections that don't carry an is_test marker yet (most don't —
 *      only Cases has is_sample today). Used at render-boundary filtering
 *      until a full backfill ships.
 *
 * A cleanup migration (`scripts/sanitize-test-data.ts`) is sketched in the
 * commit body as a follow-up — once it flags + sets is_test on the
 * existing test rows, the name-pattern predicate becomes belt-and-suspenders.
 */

import { dev } from '$app/environment';

/** Names that start with these prefixes are considered test entities.
 *  Patterns anchored to start-of-string so a real lender like "Sample Co
 *  Finance Pvt Ltd" (hypothetical) wouldn't be misidentified by a bare
 *  "sample" substring. Case-insensitive. */
const TEST_NAME_PREFIXES = /^(sample |sec5-r1-test-|test |e2e )/i;

/** Substrings that flag test entities anywhere in the name. Bounded by
 *  word boundaries to avoid false positives ("testing" matches; "attesting"
 *  doesn't). */
const TEST_NAME_SUBSTRINGS = /\bxyz bank\b|\btesting\b/i;

/** E2E auth fixture mobile numbers. Stamped by /api/test/e2e-auth at
 *  upsert time so the standing filter can exclude them in prod without
 *  doing string-name matching. */
export const E2E_TEST_MOBILE_NUMBERS = [9999900000, 9999900001, 9999900002] as const;

/** MongoDB filter clause: matches documents whose `is_test` is either
 *  false OR absent (the field was added by C.7; existing rows have no
 *  value and must not be filtered out). Applied via `$and` or spread
 *  into the parent filter. */
export const PROD_ENTITY_FILTER = { is_test: { $in: [false, null] } } as const;

/** Returns true when the supplied name matches any test-entity pattern.
 *  Used at render-boundary filtering for collections without an is_test
 *  marker. */
export function isTestEntityName(name: string | null | undefined): boolean {
	if (!name) return false;
	const trimmed = name.trim();
	if (!trimmed) return false;
	if (TEST_NAME_PREFIXES.test(trimmed)) return true;
	if (TEST_NAME_SUBSTRINGS.test(trimmed)) return true;
	return false;
}

/** Convenience for environment-aware filtering. In dev the team needs to
 *  see test entities (that's how they test); in prod they're hidden.
 *  Pure read of the `dev` flag — exported as a getter so callers don't
 *  import `$app/environment` themselves. */
export function shouldShowTestEntities(): boolean {
	return dev;
}

/** Filter an array of name-bearing items in-place semantics (returns a new
 *  array, doesn't mutate). When `shouldShowTestEntities()` is true,
 *  returns the input unchanged. */
export function filterTestEntities<T>(items: T[], getName: (item: T) => string | null | undefined): T[] {
	if (shouldShowTestEntities()) return items;
	return items.filter((item) => !isTestEntityName(getName(item)));
}
