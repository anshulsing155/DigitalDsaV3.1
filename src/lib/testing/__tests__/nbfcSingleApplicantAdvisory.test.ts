/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: NBFC single-applicant advisory fires on SECURED loans only
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * User-reported 2026-05-28 (Business Loan → Sole Proprietorship screenshot):
 * an advisory banner reading
 *   "Many NBFC lenders require at least 2 applicants for unsecured loans.
 *    Consider adding a family co-applicant or guarantor..."
 * appeared on a BL → Sole Prop case. The advisory was firing on every
 * unsecured loan (BL / Personal / Professional) with a single non-Company
 * applicant.
 *
 * The business intent of this advisory is the INVERSE: NBFC HFCs that
 * finance secured loans (Home Loan / LAP / Plot Loan) prefer ≥2 applicants
 * for risk diversification on mortgage-backed lending. Unsecured NBFCs do
 * not enforce a 2-applicant minimum — single-applicant unsecured cases are
 * normal in that segment.
 *
 * FIX (2026-05-28)
 * ────────────────
 * `runCrossFieldValidation` in src/lib/utils/crossStepValidator.ts now
 * gates the `nbfc_min_applicant` advisory on `isSecuredLoan` (Home Loan /
 * LAP / Plot Loan) instead of `isUnsecured`. Company-applicant exemption is
 * preserved — a Pvt Ltd applying for HL doesn't need a personal
 * co-applicant. Message text updated to reflect HFC + secured-mortgage
 * context.
 *
 * THIS TEST
 * ─────────
 * Behavioral assertions across the loan-type matrix + a static-scan
 * confirming the gate variable is `isSecuredLoan`, not `isUnsecured`.
 *
 * Companion: CLAUDE.md §3 Pitfall (NBFC advisory mis-fired on unsecured,
 * 2026-05-28).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runCrossFieldValidation } from '$lib/utils/crossStepValidator';

function singleIndividual() {
	return [
		{
			id: 'a1',
			applicantType: 'Individual',
			fullName: 'Test User',
			age: 35,
			gender: 'Male',
			maritalStatus: 'Single',
			creditScore: 750,
			onEMI: true,
			onProperty: true,
			selectedIncomeProfiles: ['salaried_regular'],
			incomeEntries: [
				{
					id: 'ie1',
					profileType: 'salaried_regular',
					income: { grossMonthlySalary: 100000 }
				}
			]
		}
	];
}

function singleCompany() {
	return [
		{
			id: 'a1',
			applicantType: 'Company',
			companyName: 'Test Pvt Ltd',
			companyType: 'Pvt Ltd',
			registrationCountry: 'India',
			onEMI: true,
			onProperty: false,
			selectedIncomeProfiles: [],
			incomeEntries: []
		}
	];
}

describe('NBFC single-applicant advisory — Pitfall: secured-only gate', () => {
	describe('SECURED loans: single Individual applicant SHOULD see the advisory', () => {
		for (const loanName of ['Home Loan', 'Loan Against Property', 'Plot Loan']) {
			it(`${loanName} (single Individual) → advisory fires`, () => {
				const result = runCrossFieldValidation(singleIndividual() as Record<string, unknown>[], {
					loanName
				});
				const advisory = result.warnings.find((w) => w.id === 'nbfc_min_applicant');
				expect(
					advisory,
					`${loanName} single Individual should surface the NBFC advisory`
				).toBeDefined();
			});
		}
	});

	describe('SECURED loans: single Company applicant should NOT see the advisory', () => {
		for (const loanName of ['Home Loan', 'Loan Against Property', 'Plot Loan']) {
			it(`${loanName} (single Company) → advisory suppressed`, () => {
				const result = runCrossFieldValidation(singleCompany() as Record<string, unknown>[], {
					loanName
				});
				const advisory = result.warnings.find((w) => w.id === 'nbfc_min_applicant');
				expect(
					advisory,
					`${loanName} single Company shouldn't see the advisory (entity is its own legal counterparty)`
				).toBeUndefined();
			});
		}
	});

	describe('UNSECURED loans: single applicant should NEVER see the advisory', () => {
		for (const loanName of ['Business Loan', 'Personal Loan', 'Professional Loan']) {
			it(`${loanName} (single Individual) → advisory suppressed`, () => {
				const result = runCrossFieldValidation(singleIndividual() as Record<string, unknown>[], {
					loanName
				});
				const advisory = result.warnings.find((w) => w.id === 'nbfc_min_applicant');
				expect(
					advisory,
					`${loanName} single Individual should NOT see the secured-loan advisory`
				).toBeUndefined();
			});
		}
	});

	describe('static-scan: gate variable is isSecuredLoan, not isUnsecured', () => {
		it('crossStepValidator.ts gates nbfc_min_applicant on isSecuredLoan', () => {
			const filePath = resolve(process.cwd(), 'src/lib/utils/crossStepValidator.ts');
			const source = readFileSync(filePath, 'utf-8');

			// Find the block — must reference isSecuredLoan in the condition guarding the push
			const blockIdx = source.indexOf("nbfc_min_applicant");
			expect(blockIdx, 'nbfc_min_applicant advisory block not found').toBeGreaterThan(-1);

			// Look at the ~600 chars before the push call — the if-guard is in there
			const before = source.slice(Math.max(0, blockIdx - 600), blockIdx);

			expect(
				/if\s*\(\s*isSecuredLoan\s*&&/.test(before),
				'crossStepValidator.ts no longer gates the NBFC advisory on isSecuredLoan. ' +
					'Re-firing on unsecured loans is the documented regression. ' +
					'See CLAUDE.md §3 Pitfall (NBFC advisory mis-fired on unsecured).'
			).toBe(true);
		});
	});
});
