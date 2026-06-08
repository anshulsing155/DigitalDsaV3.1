/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: "Close by this new loan" hidden on BT-only / New-Loan flows
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * User-reported 2026-05-28 (Plot Loan BT-only screenshot with team annotation):
 * the "Close by this new loan" closure-plan option appeared for an existing
 * obligation on a Plot Loan BT-only flow. BT-only just transfers the existing
 * mortgage to a new lender; no extra cash is disbursed, so it cannot be used
 * to pay off a SEPARATE obligation. The option was mis-offered.
 *
 * Same bug applied to Home Loan BT-only and Plot Loan BT-only (the two
 * mortgage-product BT-only flows). LAP is exempt because LAP releases cash
 * against the property collateral; even a LAP BT gives the customer cash and
 * can close other obligations.
 *
 * ROOT CAUSE
 * ──────────
 * `getClosureOptionsFiltered` in `src/lib/config/obligationOptions.ts` used
 * `loanVariant.includes(v)` against a `closureVariants` list that contained
 * the bare substring `'Balance Transfer'`. This matched BOTH
 * `'Balance Transfer Only'` (the user-stored value for HL/Plot BT-only)
 * and `'Balance Transfer With Top-up'` (which should still show the option,
 * because the Top-up component DOES release extra cash). The loose substring
 * approach was the root mechanism.
 *
 * Similarly, `.includes('Top-up')` was matching both `'Top-up Only'` (should
 * show) and `'Balance Transfer With Top-up'` (should show — same answer,
 * but only by coincidence).
 *
 * FIX (2026-05-28)
 * ────────────────
 * Replaced the substring `.some(includes)` with an exact-membership Set
 * (`CLOSURE_ALLOWED_VARIANTS`). The new set explicitly includes the variants
 * that release extra cash:
 *   - 'Debt Consolidation'
 *   - 'Debt Consolidation with Extra Funds'
 *   - 'Balance Transfer With Top-up'
 *   - 'Top-up Only'
 *   - OD/CC takeover + enhancement variants
 * And explicitly excludes 'Balance Transfer Only' and 'New Loan'.
 *
 * THIS TEST
 * ─────────
 * The full variant matrix, asserting the option is shown / hidden as
 * expected for each combination. Plus a static-scan rejecting the legacy
 * loose-substring pattern from being re-added.
 *
 * Companion: CLAUDE.md §3 Pitfall (BT-only wrongly offering Close-by-loan,
 * 2026-05-28).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getClosureOptionsFiltered } from '$lib/config/obligationOptions';

function hasCloseByLoan(
	loanType: string,
	loanVariant: string,
	applicantType: 'Individual' | 'Company' = 'Individual',
	caseHasCompany = false
): boolean {
	const opts = getClosureOptionsFiltered(
		'co_applicant',
		loanType,
		loanVariant,
		applicantType,
		caseHasCompany
	);
	return opts.some((o) => o.label === 'Close by this new loan');
}

describe('Close-by-this-new-loan gating — Pitfall: BT-only wrongly offering closure', () => {
	describe('Home Loan variants', () => {
		it('New Loan: no Close-by-loan (no extra funds released)', () => {
			expect(hasCloseByLoan('Home Loan', 'New Loan')).toBe(false);
		});
		it('Balance Transfer Only: no Close-by-loan (just refinances existing)', () => {
			expect(hasCloseByLoan('Home Loan', 'Balance Transfer Only')).toBe(false);
		});
		it('Top-up Only: Close-by-loan available (extra cash released)', () => {
			expect(hasCloseByLoan('Home Loan', 'Top-up Only')).toBe(true);
		});
		it('Balance Transfer With Top-up: Close-by-loan available', () => {
			expect(hasCloseByLoan('Home Loan', 'Balance Transfer With Top-up')).toBe(true);
		});
	});

	describe('Plot Loan variants (PlotLoanActivity values land in loanVariant)', () => {
		it('New Loan: no Close-by-loan', () => {
			expect(hasCloseByLoan('Plot Loan', 'New Loan')).toBe(false);
		});
		it('Balance Transfer Only: no Close-by-loan (the reported bug)', () => {
			expect(hasCloseByLoan('Plot Loan', 'Balance Transfer Only')).toBe(false);
		});
	});

	describe('LAP — always Close-by-loan (loan against property releases cash)', () => {
		it('LAP New Loan: Close-by-loan available', () => {
			expect(hasCloseByLoan('Loan Against Property', 'New Loan')).toBe(true);
		});
		it('LAP Balance Transfer Only: Close-by-loan available', () => {
			expect(hasCloseByLoan('Loan Against Property', 'Balance Transfer Only')).toBe(true);
		});
		it('LAP Top-up Only: Close-by-loan available', () => {
			expect(hasCloseByLoan('Loan Against Property', 'Top-up Only')).toBe(true);
		});
		it('LAP Balance Transfer With Top-up: Close-by-loan available', () => {
			expect(hasCloseByLoan('Loan Against Property', 'Balance Transfer With Top-up')).toBe(true);
		});
	});

	describe('Unsecured DC routes', () => {
		it('Personal Loan Debt Consolidation: Close-by-loan available', () => {
			expect(hasCloseByLoan('Personal Loan', 'Debt Consolidation')).toBe(true);
		});
		it('Business Loan Debt Consolidation with Extra Funds: available', () => {
			expect(hasCloseByLoan('Business Loan', 'Debt Consolidation with Extra Funds')).toBe(true);
		});
	});

	describe('static-scan: legacy loose substring pattern is gone', () => {
		const filePath = resolve(process.cwd(), 'src/lib/config/obligationOptions.ts');
		const source = readFileSync(filePath, 'utf-8');

		it('getClosureOptionsFiltered no longer uses loanVariant.includes(...) for closure gating', () => {
			const fnStart = source.indexOf('export function getClosureOptionsFiltered');
			expect(fnStart, 'getClosureOptionsFiltered not found').toBeGreaterThan(-1);
			const fnBody = source.slice(fnStart, fnStart + 3000);

			// Strip comments before checking. The bug was the EXECUTABLE call
			// `loanVariant.includes('Balance Transfer')` — we allow the same text
			// to appear in PITFALL comments documenting the historical bug.
			const noLineComments = fnBody.replace(/\/\/[^\n]*\n/g, '\n');
			const noBlockComments = noLineComments.replace(/\/\*[\s\S]*?\*\//g, '');

			expect(
				/loanVariant\.includes\s*\(/.test(noBlockComments),
				'getClosureOptionsFiltered has reverted to loanVariant.includes(...) — ' +
					'this caused the BT-only bug (substring "Balance Transfer" matched both ' +
					'"Balance Transfer Only" and "Balance Transfer With Top-up"). Use ' +
					'CLOSURE_ALLOWED_VARIANTS.has(loanVariant) instead. ' +
					'See CLAUDE.md §3 Pitfall (BT-only wrongly offering Close-by-loan).'
			).toBe(false);

			expect(
				/CLOSURE_ALLOWED_VARIANTS/.test(noBlockComments),
				'getClosureOptionsFiltered must reference CLOSURE_ALLOWED_VARIANTS — ' +
					'the exact-membership Set introduced as the fix. See CLAUDE.md §3 Pitfall.'
			).toBe(true);
		});
	});
});
