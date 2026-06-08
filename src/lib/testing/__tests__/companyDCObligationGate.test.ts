/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Pitfall #58 — Corporate DC must consolidate company debt, not director debt
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * REPRO (user 2026-05-26):
 *   "if any company is coming for Debt consolidation, we capture its
 *    directors/partners income and obligations as well. But user not entered
 *    the companies obligation and instead entered directors / partners
 *    obligation and also selected to close that running loan by this loan.
 *    this is completely ridiculous behavior. Validation should seek
 *    obligation from company. even the director / partners obligations are
 *    there those cant be closed by this Debt consolidation as this is the
 *    loan to company. so we should not give option of close the loan by
 *    this loan in director and partner and also mandatory at least one
 *    loan to consolidate."
 *
 * TWO FIXES (intertwined):
 *
 * (a) `getClosureOptionsFiltered(role, loanType, loanScope, applicantType,
 *     caseHasCompany)` — when DC + caseHasCompany + applicantType !==
 *     'Company', drop "Will be closed by Top-up amount" so the toggle
 *     never appears on Director/Partner obligation forms.
 *
 * (b) `getCaseLevelDisabledReason()` — when case has Company applicant on
 *     DC route, require ≥1 Company-owned obligation marked for closure
 *     (not any applicant's obligation). Surface a specific message
 *     explaining the corporate-loan-cannot-close-personal-debt rule.
 */

import { describe, it, expect } from 'vitest';
import { getClosureOptionsFiltered } from '$lib/config/obligationOptions';
import { getCaseLevelDisabledReason } from '$lib/utils/incomeTabState';

const CLOSE = 'Will be closed by Top-up amount';

// ── Part A — getClosureOptionsFiltered filter behavior ─────────────────────

describe('getClosureOptionsFiltered — corporate DC director filter (Pitfall #58)', () => {
	it('Director on a corporate DC case does NOT see "Close by this loan"', () => {
		const opts = getClosureOptionsFiltered(
			'co_applicant',
			'Home Loan',
			'Debt Consolidation',
			'Individual',
			true /* caseHasCompany */
		);
		expect(opts.find((o) => o.value === CLOSE)).toBeUndefined();
	});

	it('Company applicant on a corporate DC case DOES see "Close by this loan"', () => {
		const opts = getClosureOptionsFiltered(
			'co_applicant',
			'Home Loan',
			'Debt Consolidation',
			'Company',
			true /* caseHasCompany */
		);
		const closure = opts.find((o) => o.value === CLOSE);
		expect(closure).toBeDefined();
	});

	it('Individual applicant on a non-company DC case (no company on case) DOES see "Close by this loan"', () => {
		const opts = getClosureOptionsFiltered(
			'co_applicant',
			'Personal Loan',
			'Debt Consolidation',
			'Individual',
			false /* caseHasCompany */
		);
		const closure = opts.find((o) => o.value === CLOSE);
		expect(closure).toBeDefined();
	});

	it('Non-DC routes (Balance Transfer With Top-up) leave director closure option intact', () => {
		// BT-with-Top-up semantics differ — the top-up component releases extra
		// cash that can legitimately close personal debt even when the case has
		// a Company. The DC corporate-Individual filter is DC-only.
		//
		// PITFALL UPDATE (2026-05-28): canonical variant is now exact-match
		// 'Balance Transfer With Top-up' (releases cash); 'Balance Transfer Only'
		// does NOT (no extra funds). Switched from the legacy loose string
		// 'Balance Transfer' which used to match both.
		const opts = getClosureOptionsFiltered(
			'co_applicant',
			'Home Loan',
			'Balance Transfer With Top-up',
			'Individual',
			true
		);
		const closure = opts.find((o) => o.value === CLOSE);
		expect(closure).toBeDefined();
	});

	it('Backward compatible — old 3-arg call signature still works (defaults apply)', () => {
		// applicantType defaults to 'Individual', caseHasCompany defaults to false
		const opts = getClosureOptionsFiltered('co_applicant', 'Home Loan', 'Debt Consolidation');
		const closure = opts.find((o) => o.value === CLOSE);
		expect(closure).toBeDefined();
	});
});

// ── Part B — getCaseLevelDisabledReason company-level requirement ──────────

describe('getCaseLevelDisabledReason — corporate DC requires company obligation (Pitfall #58)', () => {
	it('Company applicant + company obligation marked closed → no reason (pass)', () => {
		const applicants = [
			{
				applicantType: 'Company',
				obligations: [{ selectedToClose: CLOSE }]
			},
			{
				applicantType: 'Individual',
				obligations: [{ selectedToClose: 'Keep running' }]
			}
		];
		const reason = getCaseLevelDisabledReason(applicants, {
			loanScope: 'Debt Consolidation'
		});
		expect(reason).toBe('');
	});

	it('Company applicant + only DIRECTOR obligation marked closed → blocks', () => {
		const applicants = [
			{
				applicantType: 'Company',
				obligations: [{ selectedToClose: 'Keep running' }]
			},
			{
				applicantType: 'Individual',
				obligations: [{ selectedToClose: CLOSE }]
			}
		];
		const reason = getCaseLevelDisabledReason(applicants, {
			loanScope: 'Debt Consolidation'
		});
		expect(reason).toContain('COMPANY-level');
		expect(reason).toContain('director/partner');
	});

	it('Company applicant + no obligations at all → blocks with company-specific message', () => {
		const applicants = [
			{ applicantType: 'Company', obligations: [] },
			{ applicantType: 'Individual', obligations: [] }
		];
		const reason = getCaseLevelDisabledReason(applicants, {
			loanScope: 'Debt Consolidation'
		});
		expect(reason).toContain('company itself');
	});

	it('Non-company DC case + any applicant obligation closed → no reason (pass via fallthrough)', () => {
		const applicants = [
			{ applicantType: 'Individual', obligations: [{ selectedToClose: CLOSE }] }
		];
		const reason = getCaseLevelDisabledReason(applicants, {
			loanScope: 'Debt Consolidation'
		});
		expect(reason).toBe('');
	});

	it('Non-DC loanScope — case-level reason returns empty regardless', () => {
		const applicants = [{ applicantType: 'Company', obligations: [] }];
		const reason = getCaseLevelDisabledReason(applicants, { loanScope: 'New Loan' });
		expect(reason).toBe('');
	});
});
