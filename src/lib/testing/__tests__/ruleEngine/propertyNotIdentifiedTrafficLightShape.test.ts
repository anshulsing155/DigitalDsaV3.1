/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: property-not-identified offered-amount + traffic-light shape lock
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * Pitfall #43 — Sanction-letter view leaks into LAP/Plot. The engine has TWO
 * code paths that branch on `propertyIdentified === false`:
 *
 *   1. Offered-amount override (evaluationEngine.ts ~line 1055-1060):
 *      when no property is identified for a Home Loan, the offered amount is
 *      the applicant's FOIR-eligible amount (income-based pre-approval), not
 *      the (zero) requested amount.
 *
 *   2. Traffic-light gate (evaluationEngine.ts ~line 1118):
 *      when no property is identified, the light is judged on income
 *      eligibility (foirEligibleAmount > 0) instead of the standard
 *      offeredAmount >= requestedAmount comparison.
 *
 * Both branches MUST use:
 *   (a) Strict `=== false` equality — not `!propertyIdentified`, which would
 *       fire for any falsy value (undefined, null, 0).
 *   (b) The offered-amount override MUST also gate on `!propertyCost` —
 *       LAP/Plot don't ask the "is property identified?" question, so
 *       `toBoolean(undefined) === false` coerces propertyIdentified to false
 *       even when the loan has a real propertyCost. Without the propertyCost
 *       companion, every LAP/Plot evaluation would silently override the
 *       offered amount with the FOIR-eligible figure — wrong number, wrong
 *       traffic light.
 *
 * The existing behavioral test (propertyNotIdentifiedTrafficLight.test.ts)
 * runs evaluatePayload end-to-end with Home Loan fixtures. It cannot catch
 * a refactor that drops the `!propertyCost` companion guard, because the
 * behavior is only wrong for LAP/Plot fixtures it doesn't exercise.
 *
 * THIS TEST
 * ─────────
 * Static source-code scan of `evaluationEngine.ts`. Asserts:
 *   - The offered-amount override block is wrapped in an if containing BOTH
 *     `propertyIdentified === false` AND a propertyCost falsy check, on the
 *     same boolean expression.
 *   - The traffic-light gate uses strict `=== false`.
 *   - The forbidden falsy-coerce shape `!payload.loanTransaction.propertyIdentified`
 *     does not appear in executable code (Pitfall #43's exact regression mode).
 *
 * Per Pitfall #66, all regexes target USAGE shapes, never bare identifiers.
 *
 * Companion: CLAUDE.md Pitfall #43; behavioral coverage in the sibling
 * `propertyNotIdentifiedTrafficLight.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENGINE_PATH = 'src/lib/ruleEngine/evaluationEngine.ts';

/**
 * Strip single-line `//` comments and `/* ... *​/` block comments from a TS
 * source string so regex assertions don't trip on text intentionally
 * describing the forbidden shape. Returns code-only text — string literals
 * and identifiers are preserved.
 *
 * Not a full TS parser; sufficient because evaluationEngine.ts uses plain
 * `//` + `/* *​/` comments and no commented-out code blocks with the
 * patterns we care about.
 */
function stripComments(src: string): string {
	// Block comments first — non-greedy, multiline.
	const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, '');
	// Then line comments — anything from `//` to end of line.
	return noBlock.replace(/\/\/[^\n]*/g, '');
}

const rawSrc = readFileSync(resolve(process.cwd(), ENGINE_PATH), 'utf8');
const codeOnly = stripComments(rawSrc);

describe('propertyNotIdentified — offered-amount override double gate (Pitfall #43)', () => {
	it('contains exactly one offered-amount FOIR-eligible override assignment', () => {
		// We anchor the test on the ONE legitimate site. If a future refactor
		// adds a second `offeredAmount = foirEligibleAmount` assignment, this
		// test will fail loudly — forcing the author to either consolidate or
		// extend this lock to scan the new site too.
		const matches = codeOnly.match(/offeredAmount\s*=\s*foirEligibleAmount/g) ?? [];
		expect(
			matches.length,
			`Expected exactly one 'offeredAmount = foirEligibleAmount' assignment in evaluationEngine.ts (the property-not-identified override at ~line 1060). Found ${matches.length}. If a new assignment was added, extend this lock to scan both sites for the double-gate invariant.`
		).toBe(1);
	});

	it('the override is wrapped in an if that gates on BOTH propertyIdentified === false AND a propertyCost falsy check', () => {
		// Window: take the 300 chars BEFORE the assignment. The guarding `if (...)`
		// expression must live in that window. Both guard clauses must be present.
		const assignIdx = codeOnly.indexOf('offeredAmount = foirEligibleAmount');
		expect(assignIdx).toBeGreaterThan(0);

		const guardWindow = codeOnly.slice(Math.max(0, assignIdx - 300), assignIdx);

		expect(
			/propertyIdentified\s*===\s*false/.test(guardWindow),
			`The property-not-identified override must gate on strict 'propertyIdentified === false'. Loose-equality / falsy checks (e.g. '!propertyIdentified') would fire for LAP/Plot where the question is never asked (toBoolean(undefined) === false). See Pitfall #43.`
		).toBe(true);

		expect(
			/!\s*[a-zA-Z_.]*propertyCost/.test(guardWindow),
			`The property-not-identified override MUST also gate on '!propertyCost' (or '!payload.loanTransaction.propertyCost'). LAP/Plot legitimately have propertyCost > 0 but coerce propertyIdentified to false because the question is never asked — without this companion guard the override fires on LAP/Plot and reports the wrong sanctioned amount. See Pitfall #43.`
		).toBe(true);
	});
});

describe('propertyNotIdentified — traffic-light gate uses strict equality (Pitfall #43)', () => {
	it('the income-eligibility traffic-light branch uses propertyIdentified === false', () => {
		// The traffic-light gate is the only `else if` that flips to the
		// foirEligibleAmount > 0 ternary. Find the ternary, then verify the
		// preceding guard uses strict equality.
		const ternaryIdx = codeOnly.indexOf(`foirEligibleAmount > 0 ? 'green' : 'red'`);
		expect(
			ternaryIdx,
			`Expected the income-eligibility traffic-light branch \`foirEligibleAmount > 0 ? 'green' : 'red'\` in evaluationEngine.ts. If renamed or restructured, this lock must follow.`
		).toBeGreaterThan(0);

		const guardWindow = codeOnly.slice(Math.max(0, ternaryIdx - 300), ternaryIdx);
		expect(
			/propertyIdentified\s*===\s*false/.test(guardWindow),
			`Traffic-light gate must use strict 'propertyIdentified === false'. Loose '!propertyIdentified' would catch undefined/null/0 — every LAP/Plot evaluation would judge on income only and over-approve in the GREEN bucket. See Pitfall #43.`
		).toBe(true);
	});
});

describe('propertyNotIdentified — forbidden falsy-coerce shape absent (Pitfall #43)', () => {
	it('does not use `!payload.loanTransaction.propertyIdentified` anywhere in executable code', () => {
		// The original Pitfall #43 bug shape. A future refactor that
		// "simplifies" the strict-equality check back to the bang form re-opens
		// the LAP/Plot leak. We strip comments first so the explanatory text
		// in this file (which references the forbidden shape) doesn't false-fire.
		const forbidden = /!\s*payload\.loanTransaction\.propertyIdentified/;
		expect(
			forbidden.test(codeOnly),
			`evaluationEngine.ts contains '!payload.loanTransaction.propertyIdentified' — the falsy-coerce shape Pitfall #43 protects against. Use strict 'payload.loanTransaction.propertyIdentified === false' instead. The bang form fires for any falsy value (undefined, null, 0) which incorrectly catches LAP/Plot where the question is never asked.`
		).toBe(false);
	});

	it('does not use the loose-bang form `!isPropertyUnidentified` short-circuit either (defensive)', () => {
		// The block at ~line 1565 derives `isPropertyUnidentified` from the
		// strict check. A future refactor could plausibly invert and use
		// `!isPropertyUnidentified` somewhere — that's fine if the source bool
		// is strict-derived, but worth a defensive note for the reviewer.
		// We don't fail on this; we just confirm the source bool uses strict.
		expect(
			/isPropertyUnidentified\s*=\s*[^;]*propertyIdentified\s*===\s*false/.test(codeOnly),
			`The derived bool 'isPropertyUnidentified' should be assigned from 'propertyIdentified === false' (strict). If this changed to a falsy check, every downstream use inherits the bug.`
		).toBe(true);
	});
});
