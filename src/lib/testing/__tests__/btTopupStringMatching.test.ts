import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Audit BUG-D regression — resultBuilder.ts loanType string matching.
 *
 * Before the fix, two functions in `resultBuilder.ts` used strict equality
 * against the bare strings `'Balance Transfer'` and `'Top-up'`:
 *   • `buildTrancheBreakdown` (line ~564) — skips for BT/Top-up cases
 *   • `buildBTAppreciation`   (line ~704) — runs ONLY for BT/Top-up cases
 *
 * The actual form-side `loanType` values are
 * `'Balance Transfer Only'` / `'Balance Transfer With Top-up'` / `'Top-up Only'`.
 * Strict equality never matched, so:
 *   • The tranche breakdown (a New-Loan-only artifact: amount disbursed in
 *     stages of construction) was being rendered FOR BT cases too.
 *   • The BT property-appreciation signal NEVER rendered for any DSA case.
 *
 * Fix: substring match via `lt.includes('Balance Transfer')` / `lt.includes('Top-up')`.
 *
 * This static scan locks the contract — if a future refactor reintroduces
 * strict equality on the bare strings inside resultBuilder.ts, this test
 * fails before the regression ships.
 */

const RESULT_BUILDER_PATH = resolve(__dirname, '../../../lib/ruleEngine/resultBuilder.ts');

describe('resultBuilder.ts BT/Top-up string matching (Audit BUG-D)', () => {
	const source = readFileSync(RESULT_BUILDER_PATH, 'utf-8');

	it('does NOT use strict equality on bare "Balance Transfer" string', () => {
		// Strict equality on the bare string was the bug. Both === and !==
		// patterns are bad. Allow .includes() / startsWith() / substring forms.
		const strictEqualityMatches = source.match(
			/(?:===|!==)\s*['"]Balance Transfer['"](?!\s*(?:Only|With|\w))/g
		);
		expect(strictEqualityMatches, 'strict equality on bare "Balance Transfer" found').toBeNull();
	});

	it('does NOT use strict equality on bare "Top-up" string (without "Only" / "With")', () => {
		const strictEqualityMatches = source.match(
			/(?:===|!==)\s*['"]Top-up['"](?!\s*(?:Only|With|\w))/g
		);
		expect(strictEqualityMatches, 'strict equality on bare "Top-up" found').toBeNull();
	});

	it('uses substring matching (.includes) for the BT/Top-up branch in buildTrancheBreakdown', () => {
		// Locate the buildTrancheBreakdown function body and check it uses .includes
		const trancheMatch = source.match(/export function buildTrancheBreakdown[\s\S]+?\n}/);
		expect(trancheMatch, 'buildTrancheBreakdown function not found').not.toBeNull();
		const trancheBody = trancheMatch![0];
		expect(
			trancheBody.includes(".includes('Balance Transfer')") ||
				trancheBody.includes('.includes("Balance Transfer")')
		).toBe(true);
	});

	it('uses substring matching (.includes) for the BT/Top-up branch in buildBTAppreciation', () => {
		const apprMatch = source.match(/export function buildBTAppreciation[\s\S]+?\n}/);
		expect(apprMatch, 'buildBTAppreciation function not found').not.toBeNull();
		const apprBody = apprMatch![0];
		expect(
			apprBody.includes(".includes('Balance Transfer')") ||
				apprBody.includes('.includes("Balance Transfer")')
		).toBe(true);
	});
});
