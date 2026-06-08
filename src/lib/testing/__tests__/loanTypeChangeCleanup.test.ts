/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: loan-type change moves applicants to recovery bin + clears state
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * `formState.applicants` is GLOBAL across loan types — a Plot Loan's Company +
 * Director applicants persist when the user goes back and starts a Personal /
 * Business Loan. Pre-S103, that meant:
 *
 *   - Issue #4 (Business Loan + Sole Prop): the Plot Loan's OPC company
 *     stayed visible in the new Business Loan applicant list alongside the
 *     new Sole Prop proprietor.
 *   - Issue #3 (Personal Loan + Director restore): the auto-created
 *     `director_company` entry from the prior Plot Loan forced the user's
 *     selectedIncomeProfiles to include 'director_company'. Picking Salaried
 *     in Personal Loan kept the Next button disabled.
 *
 * The fix: on loan-type change in `/form/how-can-we-help`, move every
 * applicant to the recovery bin (so name-match restore still works in the
 * new loan) and clear formState.applicants, relationships, and the income
 * profile store.
 *
 * THIS TEST
 * ─────────
 * Verifies the scope-mapping `recoveryScopeForLoan()`. The full migration
 * helper is invoked from the page on loan-type change; mocking the entire
 * formState/applicantState/incomeProfileStore graph is fragile, so we test
 * the pure mapping here and rely on the page-level integration to wire it.
 *
 * Companion: CLAUDE.md §3 Pitfall #20, §4 grep recipe.
 */

import { describe, it, expect } from 'vitest';
import { recoveryScopeForLoan } from '$lib/utils/loanTypeChangeCleanup.svelte';

describe('recoveryScopeForLoan', () => {
	it('secured loans (Home/LAP/Plot) map Individual → secured::individual', () => {
		expect(recoveryScopeForLoan('Home Loan', 'Individual')).toBe('secured::individual');
		expect(recoveryScopeForLoan('LAP', 'Individual')).toBe('secured::individual');
		expect(recoveryScopeForLoan('Plot Loan', 'Individual')).toBe('secured::individual');
	});

	it('secured loans map Company → secured::company', () => {
		expect(recoveryScopeForLoan('Home Loan', 'Company')).toBe('secured::company');
		expect(recoveryScopeForLoan('LAP', 'Company')).toBe('secured::company');
		expect(recoveryScopeForLoan('Plot Loan', 'Company')).toBe('secured::company');
	});

	it('Personal Loan: Individual → personal::individual, Company → undefined (no PL company flow)', () => {
		expect(recoveryScopeForLoan('Personal Loan', 'Individual')).toBe('personal::individual');
		expect(recoveryScopeForLoan('Personal Loan', 'Company')).toBeUndefined();
	});

	it('Business Loan: Individual + Company scopes', () => {
		expect(recoveryScopeForLoan('Business Loan', 'Individual')).toBe('business::individual');
		expect(recoveryScopeForLoan('Business Loan', 'Company')).toBe('business::company');
	});

	it('Professional Loan: Individual + Company scopes', () => {
		expect(recoveryScopeForLoan('Professional Loan', 'Individual')).toBe('professional::individual');
		expect(recoveryScopeForLoan('Professional Loan', 'Company')).toBe('professional::company');
	});

	it('unknown loan types return undefined (no scope = no recovery filter)', () => {
		expect(recoveryScopeForLoan('Unknown', 'Individual')).toBeUndefined();
		expect(recoveryScopeForLoan('', 'Company')).toBeUndefined();
	});
});
