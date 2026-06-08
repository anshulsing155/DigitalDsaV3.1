/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: `resetLoanPageIndex` clears the saved per-loan page cursor for a
 * variant-shaping answer change inside the same loan name. (Pitfall #41.)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Pre-fix, the picker mutated `loanType` / `PlotLoanActivity` /
 * `unSecureLoanType` in place. The per-loan page index — keyed by loan NAME,
 * not by variant — stayed at the index the user was on in the prior variant
 * (e.g. New Loan obligation page 7). The new variant's page set is different
 * (DC drops the No/No obligation question and replaces it with an entries
 * table); resuming to index 7 in DC landed the user on a different page than
 * the one they left, and a "Previous" hop from there showed apparently-blank
 * fields because the page no longer existed in this shape.
 *
 * This test exercises the helper directly — the unit guarantees that the
 * helper resets the right field for each loan name. The picker-level wiring
 * (how-can-we-help calls the helper on variant-shaping key change) is
 * verified via the integration grep recipe in CLAUDE.md §4.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { formState } from '$lib/state/form.svelte';
import { resetLoanPageIndex } from '$lib/utils/loanSwitchOrchestrator.svelte';

function seedAllPageIndices(value: number): void {
	formState.currentPageIndex = value;
	formState.lapPageIndex = value;
	formState.plotLoanPageIndex = value;
	formState.businessLoanPageIndex = value;
	formState.personalLoanPageIndex = value;
	formState.professionalLoanPageIndex = value;
}

describe('resetLoanPageIndex (Pitfall #41)', () => {
	beforeEach(() => {
		seedAllPageIndices(0);
	});

	it('Business Loan - Unsecured: resets businessLoanPageIndex; other indices untouched', () => {
		seedAllPageIndices(7);
		resetLoanPageIndex('Business Loan - Unsecured');
		expect(formState.businessLoanPageIndex).toBe(0);
		expect(formState.personalLoanPageIndex).toBe(7);
		expect(formState.professionalLoanPageIndex).toBe(7);
		expect(formState.plotLoanPageIndex).toBe(7);
		expect(formState.lapPageIndex).toBe(7);
		expect(formState.currentPageIndex).toBe(7);
	});

	it('Business Loan alias maps to the same businessLoanPageIndex', () => {
		seedAllPageIndices(5);
		resetLoanPageIndex('Business Loan');
		expect(formState.businessLoanPageIndex).toBe(0);
	});

	it('Personal Loan: resets personalLoanPageIndex only', () => {
		seedAllPageIndices(4);
		resetLoanPageIndex('Personal Loan');
		expect(formState.personalLoanPageIndex).toBe(0);
		expect(formState.businessLoanPageIndex).toBe(4);
	});

	it('Professional Loan: resets professionalLoanPageIndex only', () => {
		seedAllPageIndices(3);
		resetLoanPageIndex('Professional Loan');
		expect(formState.professionalLoanPageIndex).toBe(0);
	});

	it('Plot Loan + Plot and Construction alias both reset plotLoanPageIndex', () => {
		seedAllPageIndices(8);
		resetLoanPageIndex('Plot Loan');
		expect(formState.plotLoanPageIndex).toBe(0);

		seedAllPageIndices(2);
		resetLoanPageIndex('Plot and Construction Loan');
		expect(formState.plotLoanPageIndex).toBe(0);
	});

	it('LAP: resets lapPageIndex only', () => {
		seedAllPageIndices(9);
		resetLoanPageIndex('Loan Against Property');
		expect(formState.lapPageIndex).toBe(0);
		expect(formState.currentPageIndex).toBe(9);
	});

	it('Home Loan: resets currentPageIndex (home loan stores under the legacy field)', () => {
		seedAllPageIndices(11);
		resetLoanPageIndex('Home Loan');
		expect(formState.currentPageIndex).toBe(0);
		expect(formState.lapPageIndex).toBe(11);
	});

	it('Unknown loan name: no-op, all indices preserved', () => {
		seedAllPageIndices(10);
		resetLoanPageIndex('Mortgage With Hyperdrive');
		expect(formState.businessLoanPageIndex).toBe(10);
		expect(formState.personalLoanPageIndex).toBe(10);
		expect(formState.currentPageIndex).toBe(10);
	});

	it('Empty loan name: no-op (defensive — callers may pass stale empty string)', () => {
		seedAllPageIndices(12);
		resetLoanPageIndex('');
		expect(formState.businessLoanPageIndex).toBe(12);
	});
});
