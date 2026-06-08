/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: affordability back-calculation gating shape lock
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * The RE-7 affordability back-calculator (evaluationEngine.ts ~line 1560-1632)
 * computes max-affordable property cost when the DSA hasn't found a property
 * yet. It must be gated by TWO conditions:
 *
 *   1. `propertyIdentified === false` (strict equality, not falsy) —
 *      same Pitfall #43 concern as the offered-amount override; LAP/Plot
 *      coerce propertyIdentified to false because the question isn't asked,
 *      and we don't want the affordability calculator firing for them.
 *
 *   2. `isSecuredLoan(loanName)` — affordability is property-backed and does
 *      not apply to unsecured products. A regression that drops this guard
 *      would attempt to back-calculate "property cost" for Personal /
 *      Business / Professional loans, which have no property at all.
 *
 * Additionally, the per-lender card count (eligibility-only / +dpConstrained /
 * +bridge) MUST be selected via `selectAffordabilityScenarios()` — not the raw
 * `calculateAffordability()` result. The behavioral test
 * `affordabilityScenarioGating.test.ts` covers the selector's card-count
 * semantics. This test locks the engine-side wiring so a refactor that
 * bypasses the selector (assigning raw calculator output to `ev.affordability`)
 * fails fast.
 *
 * THIS TEST
 * ─────────
 * Static source-code scan of `evaluationEngine.ts`. Asserts:
 *   - The affordability block uses BOTH strict `propertyIdentified === false`
 *     AND `isSecuredLoan` in its gating expression.
 *   - `selectAffordabilityScenarios` is imported from the affordabilityCalculator
 *     module (whether top-level or dynamic).
 *   - Every `ev.affordability =` assignment in the file routes through
 *     `selectAffordabilityScenarios(`, never assigning a raw
 *     `calculateAffordability()` return value directly.
 *
 * Per Pitfall #66, all regexes target USAGE shapes, never bare identifiers.
 *
 * Companion: CLAUDE.md Pitfall #43; behavioral coverage in the sibling
 * `affordabilityScenarioGating.test.ts` (pure selector unit) and
 * `propertyNotIdentifiedTrafficLight.test.ts` (end-to-end).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENGINE_PATH = 'src/lib/ruleEngine/evaluationEngine.ts';

function stripComments(src: string): string {
	const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, '');
	return noBlock.replace(/\/\/[^\n]*/g, '');
}

const rawSrc = readFileSync(resolve(process.cwd(), ENGINE_PATH), 'utf8');
const codeOnly = stripComments(rawSrc);

describe('affordability back-calculation — gating shape (Pitfall #43)', () => {
	it('derives an unidentified-property bool from STRICT propertyIdentified === false', () => {
		// The block at ~line 1565 assigns `isPropertyUnidentified = tx.propertyIdentified === false`.
		// Loose-equality / falsy form would coerce LAP/Plot to "unidentified" since they
		// don't ask the question, and the affordability calculator would fire on them.
		const strict = /(?:isPropertyUnidentified|propertyUnidentified)\s*=\s*[^;]*propertyIdentified\s*===\s*false/;
		expect(
			strict.test(codeOnly),
			`evaluationEngine.ts must derive the unidentified-property bool from strict 'propertyIdentified === false' equality. A falsy check would fire for LAP/Plot (where the question isn't asked and undefined coerces to false). See Pitfall #43.`
		).toBe(true);
	});

	it('the affordability block gates on BOTH the unidentified-property bool AND a secured-loan check', () => {
		// Direct anchor: find the if-guard that opens the affordability block.
		// We expect a single `if (...isPropertyUnidentified...isSecured...)` form
		// (or vice-versa) that wraps the back-calculator.
		//
		// Pattern: an `if (` followed by an expression containing both
		// `isPropertyUnidentified` and `isSecured` (any order), terminated by `)`.
		// `[^)]` keeps the match scoped to a single condition expression — won't
		// accidentally stretch into the body or following code.
		const guardA = /if\s*\(\s*[^)]*isPropertyUnidentified[^)]*isSecured[^)]*\)/;
		const guardB = /if\s*\(\s*[^)]*isSecured[^)]*isPropertyUnidentified[^)]*\)/;

		expect(
			guardA.test(codeOnly) || guardB.test(codeOnly),
			`Expected an 'if (isPropertyUnidentified && isSecured)' (or reversed) guard wrapping the affordability back-calc block. Without BOTH guards: the back-calculator would run on identified-property cases (wasteful, semantically wrong) or run for unsecured loans which have no property at all.`
		).toBe(true);

		// And the supporting bool assignments must exist somewhere above. Already
		// covered by the strict-equality test for isPropertyUnidentified; here we
		// add the parallel check for isSecured = isSecuredLoan(...).
		expect(
			/isSecured\s*=\s*isSecuredLoan\s*\(/.test(codeOnly),
			`The 'isSecured' bool used in the affordability guard must be derived from isSecuredLoan(loanName) — the canonical product-class helper. A bespoke check (e.g. by comparing loanName strings inline) drifts from the rest of the engine.`
		).toBe(true);
	});
});

describe('affordability back-calculation — selector wiring (Pitfall #43)', () => {
	it('imports selectAffordabilityScenarios from the affordabilityCalculator module', () => {
		// The current engine uses a dynamic `await import('./affordabilityCalculator.js')`
		// to keep the calculator out of the eager-load path. Accept both static and
		// dynamic import shapes — both must reference the same module specifier
		// (with or without .js suffix).
		const dynamicImport = /import\s*\(\s*['"](?:\.\.?\/)*affordabilityCalculator(?:\.js)?['"]\s*\)/;
		const staticImport = /import\s*{[^}]*selectAffordabilityScenarios[^}]*}\s*from\s*['"](?:\.\.?\/)*affordabilityCalculator(?:\.js)?['"]/;

		const hasImport = dynamicImport.test(codeOnly) || staticImport.test(codeOnly);
		expect(
			hasImport,
			`evaluationEngine.ts must import selectAffordabilityScenarios from './affordabilityCalculator' (static or dynamic). If the module path changed, update this lock.`
		).toBe(true);

		// And the destructure / named-import must include the symbol.
		expect(
			/selectAffordabilityScenarios/.test(codeOnly),
			`The symbol 'selectAffordabilityScenarios' must appear in evaluationEngine.ts.`
		).toBe(true);
	});

	it('every ev.affordability assignment routes through selectAffordabilityScenarios(', () => {
		// Find every `ev.affordability =` (or `.affordability =`) assignment.
		// Each one must IMMEDIATELY be followed by a `selectAffordabilityScenarios(`
		// call on the right-hand side. We accept whitespace/newlines between
		// the `=` and the call (the actual code wraps the call across lines).
		const assignRegex = /\bev\.affordability\s*=\s*(\S[\s\S]{0,60}?)\(/g;
		const sites: Array<{ idx: number; rhs: string }> = [];
		let m: RegExpExecArray | null;
		while ((m = assignRegex.exec(codeOnly)) !== null) {
			sites.push({ idx: m.index, rhs: m[1] });
		}

		expect(
			sites.length,
			`Expected at least one 'ev.affordability = ...' assignment in evaluationEngine.ts (the per-lender attach point for affordability scenarios).`
		).toBeGreaterThan(0);

		for (const site of sites) {
			// Strip whitespace from the RHS function-name capture. The rhs string
			// is everything between `=` and the opening `(` — should resolve to
			// the function being called.
			const calleeName = site.rhs.trim();
			expect(
				calleeName.endsWith('selectAffordabilityScenarios'),
				`'ev.affordability =' assignment at offset ${site.idx} must call selectAffordabilityScenarios, but found callee: '${calleeName}'. A raw calculateAffordability() result bypasses the card-count gating (sanctionType / wantsPlBridge) and surfaces scenarios the DSA didn't opt into. See Pitfall #43.`
			).toBe(true);
		}
	});

	it('does NOT assign a raw calculateAffordability() return value directly to ev.affordability', () => {
		// Defensive companion to the previous test — catches the
		// `ev.affordability = calculateAffordability(...)` shape explicitly.
		const forbidden = /\bev\.affordability\s*=\s*calculateAffordability\s*\(/;
		expect(
			forbidden.test(codeOnly),
			`'ev.affordability = calculateAffordability(...)' is forbidden. The raw calculator returns ALL three scenarios (eligibility, dpConstrained, bridge) regardless of what the DSA asked for. Always route through selectAffordabilityScenarios(fullResult, { sanctionType, wantsPlBridge }) so the card count follows the form answers.`
		).toBe(false);
	});
});
