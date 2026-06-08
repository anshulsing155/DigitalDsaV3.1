import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Audit BUG-F regression — Top-up Only LTV total-exposure subtraction.
 *
 * Before the fix, `evaluationEngine.ts` computed
 *   ltvCappedAmount = calculateLtvCappedAmount(maxLtv, propertyCost, ...)
 * unconditionally. For Top-up Only loans (existing loan STAYS in place, the
 * top-up is ON TOP of it), this over-stated the available LTV headroom by
 * the principalOutstanding amount.
 *
 * Worked example:
 *   Property value ₹60L, max LTV 80% → overall cap ₹48L
 *   Existing outstanding ₹30L (stays with original lender)
 *   User requests ₹20L top-up
 *   Available top-up headroom = ₹48L − ₹30L = ₹18L
 *   Engine SHOULD offer ₹18L (AMBER); pre-fix it offered ₹20L (false GREEN)
 *
 * Why a static source scan instead of a full payload evaluation:
 *   The fix is a 5-line conditional inside the LTV block of `evaluatePayload`.
 *   A full payload-driven test would need a fixture with a complete LoanApplicationPayload
 *   + a synthetic rule doc + mocked params resolution — much heavier than the
 *   invariant being protected. The static scan checks that:
 *     1. The Top-up-Only loanType branch exists in the LTV block
 *     2. It subtracts `principalOutstanding` from `ltvCappedAmount`
 *     3. It uses `Math.max(0, ...)` to clamp (no negative caps)
 *     4. It does NOT also apply to BT+Top-up (per audit's own spot-check math —
 *        the takeover pays off the outstanding, so the new combined loan
 *        stands alone against the LTV cap)
 *
 * If this test fails, either:
 *   • The subtraction was reverted (regression — restore it), or
 *   • The conditional moved or was refactored (update this test to match
 *     the new structure, but verify the contract still holds end-to-end)
 *
 * Same source-pattern-scan style as monthPickerWiring.test.ts +
 * btTopupStringMatching.test.ts + archivedRouteStubInvariant.test.ts.
 */

const ENGINE_PATH = resolve(__dirname, '../../../lib/ruleEngine/evaluationEngine.ts');

describe('Top-up Only LTV total-exposure subtraction (Audit BUG-F)', () => {
	const source = readFileSync(ENGINE_PATH, 'utf-8');

	// Isolate the LTV block — between `let ltvCappedAmount: number | undefined;`
	// and the start of the LCR block (`// -- Step 6b: LCR computation`).
	const ltvBlockMatch = source.match(
		/let ltvCappedAmount: number \| undefined;[\s\S]+?(?=\/\/ -- Step 6b: LCR)/
	);

	it('isolates the LTV block successfully', () => {
		expect(ltvBlockMatch, 'LTV block not found in evaluationEngine.ts').not.toBeNull();
	});

	const ltvBlock = ltvBlockMatch![0];

	it('checks loanType for Top-up Only inside the LTV block', () => {
		// Must reference 'Top-up Only' explicitly. We allow either === or
		// .includes() patterns — the contract is "branch fires for Top-up Only."
		expect(ltvBlock).toMatch(/['"]Top-up Only['"]/);
	});

	it('subtracts principalOutstanding from the LTV cap for Top-up Only', () => {
		// Pattern: ltvCappedAmount = Math.max(0, ltvCappedAmount - <something including principalOutstanding>)
		// OR a similar shape with overallLtvCap. Accept any form that clamps non-negative
		// AND references principalOutstanding inside the conditional.
		expect(ltvBlock).toMatch(/principalOutstanding/);
		expect(ltvBlock).toMatch(/Math\.max\(0,\s*ltvCappedAmount\s*-/);
	});

	it('does NOT apply the subtraction to Balance Transfer With Top-up', () => {
		// Per audit's own spot-check math: BT+Top-up's takeover pays off the
		// existing outstanding, so the new combined loan stands alone against
		// the LTV cap. The subtraction must be gated to Top-up Only.
		// Smell test: the LTV block must NOT use a broad includes('Top-up') check
		// that would catch 'Balance Transfer With Top-up' too.
		const broadIncludesPattern = /\.includes\(\s*['"]Top-up['"]\s*\)/;
		expect(ltvBlock).not.toMatch(broadIncludesPattern);
	});

	it('clamps the subtracted cap non-negative (no negative LTV ceilings)', () => {
		// If outstanding > overall cap (e.g. property depreciated, big existing
		// loan), the available headroom is 0 — not a negative number. The
		// Math.max(0, ...) clamp must be present.
		expect(ltvBlock).toMatch(/Math\.max\(\s*0\s*,/);
	});
});
