/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: Existing-Loans (obligations) page surfaces a reason when Next disabled
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * Pre-S103 (Issue #8, 2026-05-15): on the Existing Loans page in Personal /
 * Business / Professional Loan flows, a DC-route user could fill an obligation
 * entry and find the Next button disabled with NO indication of why. The
 * underlying validation in `computeSectionCompletion` requires at least one
 * obligation with `selectedToClose === 'Will be closed by Top-up amount'`
 * (labeled "Close by this new loan" in the UI) — but if the user didn't pick
 * that closure plan, the button just silently disables.
 *
 * `getObligationsDisabledReason(applicant, options)` mirrors the gating logic
 * in `computeSectionCompletion`'s obligations_details branch and returns a
 * user-facing message OR '' when nothing is blocking. The 3 unsecured loan
 * pages wire this to FormNavigationBar's `disabledReason` prop.
 *
 * THIS TEST
 * ─────────
 * Exhaustively covers the gating cases. Any future change to
 * `computeSectionCompletion`'s obligations_details logic must reflect here in
 * lockstep — otherwise the reason text drifts from the actual gate.
 *
 * Companion: CLAUDE.md §3 Pitfall #26.
 */

import { describe, it, expect } from 'vitest';
import { getObligationsDisabledReason } from '$lib/utils/incomeTabState';

describe('getObligationsDisabledReason', () => {
	describe('Debt Consolidation routes', () => {
		const dc = { loanScope: 'Debt Consolidation' };

		it("returns '' when at least one obligation has 'Close by this new loan'", () => {
			const applicant = {
				obligations: [
					{ selectedToClose: 'Will be closed by Top-up amount' },
					{ selectedToClose: 'Will continue separately' }
				]
			};
			expect(getObligationsDisabledReason(applicant, dc)).toBe('');
		});

		it("returns a clear reason when obligation is filled but closure plan is wrong", () => {
			// Reproduces Issue #8 exactly: user filled one obligation but didn't
			// pick "Close by this new loan", so Next was silently disabled.
			const applicant = {
				obligations: [{ selectedToClose: 'Will continue separately' }]
			};
			const reason = getObligationsDisabledReason(applicant, dc);
			expect(reason).toContain('Close by this new loan');
			expect(reason).not.toBe('');
		});

		it('returns a clear prompt when there are no obligations yet', () => {
			const reason = getObligationsDisabledReason({ obligations: [] }, dc);
			expect(reason).toContain('Debt Consolidation');
			expect(reason).toContain('at least one');
		});

		it("returns '' when applicant is debt-free but another applicant in the case has the closure", () => {
			// Joint DC case: debt-free co-applicant doesn't have to invent debt
			const applicant = { obligations: [] };
			expect(
				getObligationsDisabledReason(applicant, { ...dc, caseHasDcClosure: true })
			).toBe('');
		});

		it("matches 'Debt Consolidation with Extra Funds' too", () => {
			const applicant = { obligations: [{ selectedToClose: 'Wrong option' }] };
			expect(
				getObligationsDisabledReason(applicant, {
					loanScope: 'Debt Consolidation with Extra Funds'
				})
			).toContain('Close by this new loan');
		});
	});

	describe('Non-DC routes', () => {
		it("returns '' when ObligationsRunning='Yes' and at least one entry exists", () => {
			const applicant = {
				ObligationsRunning: 'Yes',
				obligations: [{ bankName: 'SBI' }]
			};
			expect(getObligationsDisabledReason(applicant)).toBe('');
		});

		it("prompts to add at least one entry when ObligationsRunning='Yes' but no entries", () => {
			const applicant = { ObligationsRunning: 'Yes', obligations: [] };
			expect(getObligationsDisabledReason(applicant)).toContain('add at least one');
		});

		it("returns '' when ObligationsRunning='No' and isGuarantor='No'", () => {
			expect(
				getObligationsDisabledReason({
					ObligationsRunning: 'No',
					isGuarantorOnOtherLoan: 'No'
				})
			).toBe('');
		});

		it("prompts to answer guarantor question when ObligationsRunning='No' and guarantor not answered", () => {
			expect(
				getObligationsDisabledReason({ ObligationsRunning: 'No' })
			).toContain('guarantor');
		});

		it("prompts to add guarantor obligation when isGuarantor='Yes' but no guarantor-role entries", () => {
			const applicant = {
				ObligationsRunning: 'No',
				isGuarantorOnOtherLoan: 'Yes',
				obligations: [{ role: 'co_borrower' }]
			};
			expect(getObligationsDisabledReason(applicant)).toContain('Guarantor');
		});

		it('prompts to answer the running-obligations question when neither answered', () => {
			expect(getObligationsDisabledReason({})).toContain('running obligations');
		});

		it("requires emiPaidBy on every obligation for non-earner", () => {
			const applicant = {
				ObligationsRunning: 'Yes',
				selectedIncomeProfiles: ['no_current_income'],
				obligations: [{ bankName: 'SBI', emiPaidBy: 'spouse' }, { bankName: 'HDFC' }]
			};
			expect(getObligationsDisabledReason(applicant)).toContain('EMI paid by');
		});
	});
});
