import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Audit BUG-G regression — Resale down-payment boundary at ₹93,75,000.
 *
 * Before the fix, `home-loan/+page.svelte` had:
 *   if (deal <= 3333333)        { dp = deal * 0.10; }
 *   else if (deal <  9375000)   { dp = deal * 0.20; }   ← strict `<`
 *   else if (deal >  9375000)   { dp = deal * 0.25; }
 *
 * At exactly `deal === 9375000` neither branch fired (both bounds are
 * strict on the wrong side), so `requireDownPayment` stayed at its
 * initial value (0 from the outer effect's reset, or stale from the
 * prior reactive run). The non-Resale block immediately above the
 * Resale block already used `<=` — only Resale had this off-by-one.
 *
 * Concrete impact: a Resale deal at EXACTLY ₹93,75,000 (a round 75 lakh
 * × 1.25 — not uncommon in tier-1 cities) showed the wrong minimum DP.
 *
 * Why a static source scan instead of a full Svelte component test:
 *   The calculation runs inside a `$effect` that reacts to
 *   `currentAnswers.purchaseType` + `currentAnswers.dealValue`. Driving
 *   it from a unit test would need a full Svelte test-environment +
 *   form-state mock — much heavier than the invariant being protected.
 *   The static scan asserts the literal `<=` is in place after the
 *   3333333 branch (the 20% band middle bound), and the file's
 *   integration is already exercised by the existing 12,000+ unit tests
 *   that don't directly touch this effect.
 */

const HOME_LOAN_PAGE = resolve(
	__dirname,
	'../../../routes/(app)/form/home-loan/+page.svelte'
);

describe('Resale down-payment boundary at ₹93,75,000 (Audit BUG-G)', () => {
	const source = readFileSync(HOME_LOAN_PAGE, 'utf-8');

	// The Resale DP block can be uniquely identified by the `deal` variable —
	// the non-Resale block uses `cost` (`if (cost <= 3333333) {...}`). Match
	// only those comparisons that involve `deal` against the 9375000 boundary,
	// regardless of which surrounding block they live in. If a future refactor
	// moves the Resale logic into a helper function, the boundary comparison
	// still has to be `deal <= 9375000` — the test stays accurate.

	it('contains `deal <= 9375000` for the 20% band upper bound (the fix)', () => {
		// The fix: at exactly ₹93,75,000 the deal must fall into the 20% bucket,
		// not the 25% bucket.
		expect(source).toMatch(/deal\s*<=\s*9375000/);
	});

	it('does NOT use strict `deal < 9375000` anywhere (regression guard)', () => {
		// The pre-fix bug. If a future refactor reintroduces strict-less-than
		// on this boundary, the test fires before the regression ships.
		expect(source).not.toMatch(/deal\s*<\s*9375000/);
	});

	it('uses `deal > 9375000` for the 25% band (not `>=`)', () => {
		// Together with `<= 9375000` above, this means the ₹93,75,000 boundary
		// belongs to ONLY the 20% band — no double-count.
		expect(source).toMatch(/deal\s*>\s*9375000/);
	});

	it('does NOT use `deal >= 9375000` (would double-count the boundary into the 25% band)', () => {
		expect(source).not.toMatch(/deal\s*>=\s*9375000/);
	});

	it('preserves the lower boundary `deal <= 3333333` (10% band — was always correct)', () => {
		expect(source).toMatch(/deal\s*<=\s*3333333/);
	});
});
