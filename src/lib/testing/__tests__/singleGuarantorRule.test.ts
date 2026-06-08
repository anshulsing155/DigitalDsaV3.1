/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: at most one guarantor per loan (secured loans, derived from flags)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * Owner-clarified 2026-05-28: on secured loans (Home Loan / LAP / Plot Loan)
 * the Guarantor role is DERIVED, not explicitly picked. Any applicant whose
 * `onEMI === false AND onProperty === false` IS the guarantor — see
 * `src/lib/utils/applicantRoleUtils.ts:deriveIndividualClassification` line
 * ~448 which returns `'guarantor_financial'` for that exact combination.
 *
 * The domain rule "a loan can have AT MOST ONE guarantor" therefore really
 * means "at most one applicant in the case has both flags set to No". Two
 * such applicants = two guarantors, which the rule engine and the Guarantor
 * Eligibility Assessment spec (docs/specs/GUARANTOR-ELIGIBILITY-ASSESSMENT-SPEC.md)
 * do not support.
 *
 * FIX (2026-05-28)
 * ────────────────
 * Cross-applicant validator in `src/lib/utils/crossStepValidator.ts`:
 *   - For SECURED loans only, count applicants with onEMI=No + onProperty=No.
 *   - If count >= 2, emit a blocking `error` for every duplicate beyond the
 *     first, indexed to the offending applicant so the UI highlights it.
 *   - Company applicants are skipped (they cannot be a guarantor).
 *   - Unsecured loans are untouched — their guarantor mechanism is different
 *     (explicit role pick), deferred to the v1 guarantor-assessment build.
 *
 * THIS TEST
 * ─────────
 * Behavioral matrix across SECURED loans (must fire) and unsecured loans
 * (must NOT fire), single-guarantor allow-through, mixed Yes/No
 * combinations, plus a static-scan ensuring the validator references the
 * new id 'multiple_guarantors' and gates on isSecuredLoan.
 *
 * Companion: CLAUDE.md §3 Pitfall (Two guarantors silently allowed on
 * secured loans, 2026-05-28).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runCrossFieldValidation } from '$lib/utils/crossStepValidator';

function indiv(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		id: 'a' + Math.random().toString(36).slice(2, 8),
		applicantType: 'Individual',
		fullName: 'Person ' + Math.floor(Math.random() * 1000),
		age: 35,
		gender: 'Male',
		maritalStatus: 'Single',
		creditScore: 750,
		onEMI: true,
		onProperty: true,
		selectedIncomeProfiles: ['salaried_regular'],
		incomeEntries: [
			{ id: 'ie1', profileType: 'salaried_regular', income: { grossMonthlySalary: 100000 } }
		],
		...overrides
	};
}

describe('Single-guarantor rule — Pitfall: two guarantors silently allowed', () => {
	describe('SECURED loans — block two onEMI=No+onProperty=No applicants', () => {
		for (const loanName of ['Home Loan', 'Loan Against Property', 'Plot Loan']) {
			it(`${loanName} with 2 guarantors raises a blocking error indexed to the 2nd`, () => {
				const applicants = [
					indiv({ onEMI: true, onProperty: true, fullName: 'Borrower' }),
					indiv({ onEMI: false, onProperty: false, fullName: 'Legit Guarantor' }),
					indiv({ onEMI: false, onProperty: false, fullName: 'Duplicate Guarantor' })
				];
				const result = runCrossFieldValidation(applicants, { loanName });
				const dupErrs = result.errors.filter((e) => e.id === 'multiple_guarantors');
				expect(dupErrs.length).toBe(1);
				expect(dupErrs[0].applicantIndex).toBe(2); // the duplicate, not the legit
				expect(dupErrs[0].applicantName).toBe('Duplicate Guarantor');
				expect(dupErrs[0].severity).toBe('error');
				expect(dupErrs[0].message.toLowerCase()).toContain('only one guarantor');
			});

			it(`${loanName} with 3 guarantors raises 2 errors (flagging both duplicates)`, () => {
				const applicants = [
					indiv({ onEMI: true, onProperty: true, fullName: 'Borrower' }),
					indiv({ onEMI: false, onProperty: false, fullName: 'Legit Guarantor' }),
					indiv({ onEMI: false, onProperty: false, fullName: 'Dup 1' }),
					indiv({ onEMI: false, onProperty: false, fullName: 'Dup 2' })
				];
				const result = runCrossFieldValidation(applicants, { loanName });
				const dupErrs = result.errors.filter((e) => e.id === 'multiple_guarantors');
				expect(dupErrs.length).toBe(2);
				expect(dupErrs.map((e) => e.applicantIndex).sort()).toEqual([2, 3]);
			});
		}
	});

	describe('SECURED loans — single guarantor is permitted', () => {
		for (const loanName of ['Home Loan', 'Loan Against Property', 'Plot Loan']) {
			it(`${loanName} with exactly 1 onEMI=No+onProperty=No applicant — no error`, () => {
				const applicants = [
					indiv({ onEMI: true, onProperty: true, fullName: 'Borrower' }),
					indiv({ onEMI: false, onProperty: false, fullName: 'Guarantor' })
				];
				const result = runCrossFieldValidation(applicants, { loanName });
				expect(result.errors.find((e) => e.id === 'multiple_guarantors')).toBeUndefined();
			});
		}
	});

	describe('SECURED loans — mixed onEMI/onProperty combos other than No+No', () => {
		it('Two applicants both with onEMI=No+onProperty=Yes does NOT trigger the rule', () => {
			// onProperty=Yes alone = co_applicant_non_financial, NOT a guarantor.
			const applicants = [
				indiv({ onEMI: true, onProperty: true }),
				indiv({ onEMI: false, onProperty: true }),
				indiv({ onEMI: false, onProperty: true })
			];
			const result = runCrossFieldValidation(applicants, { loanName: 'Home Loan' });
			expect(result.errors.find((e) => e.id === 'multiple_guarantors')).toBeUndefined();
		});

		it('Two applicants with onEMI=Yes+onProperty=No does NOT trigger', () => {
			// onEMI=Yes alone = co_applicant_financial, NOT a guarantor.
			const applicants = [
				indiv({ onEMI: true, onProperty: true }),
				indiv({ onEMI: true, onProperty: false }),
				indiv({ onEMI: true, onProperty: false })
			];
			const result = runCrossFieldValidation(applicants, { loanName: 'Home Loan' });
			expect(result.errors.find((e) => e.id === 'multiple_guarantors')).toBeUndefined();
		});
	});

	describe('SECURED loans — string flag values normalize correctly', () => {
		it('"No"/"No" string storage treated the same as boolean false', () => {
			// Some legacy paths persist these as strings.
			const applicants = [
				indiv({ onEMI: 'Yes', onProperty: 'Yes' }),
				indiv({ onEMI: 'No', onProperty: 'No' }),
				indiv({ onEMI: 'No', onProperty: 'No' })
			];
			const result = runCrossFieldValidation(applicants, { loanName: 'Home Loan' });
			expect(result.errors.filter((e) => e.id === 'multiple_guarantors').length).toBe(1);
		});
	});

	describe('SECURED loans — Company applicants are skipped', () => {
		it('Two companies with onEMI=No+onProperty=No do NOT trigger (companies cannot guarantee)', () => {
			const applicants = [
				indiv({ onEMI: true, onProperty: true }),
				{
					id: 'c1',
					applicantType: 'Company',
					companyName: 'Acme Pvt Ltd',
					onEMI: false,
					onProperty: false
				},
				{
					id: 'c2',
					applicantType: 'Company',
					companyName: 'Beta Pvt Ltd',
					onEMI: false,
					onProperty: false
				}
			];
			const result = runCrossFieldValidation(applicants, { loanName: 'Home Loan' });
			expect(result.errors.find((e) => e.id === 'multiple_guarantors')).toBeUndefined();
		});
	});

	describe('UNSECURED loans — rule does NOT fire (different role mechanism, deferred)', () => {
		for (const loanName of ['Business Loan', 'Personal Loan', 'Professional Loan']) {
			it(`${loanName} with 2 onEMI=No+onProperty=No applicants — no multiple_guarantors error`, () => {
				const applicants = [
					indiv({ onEMI: true, onProperty: true }),
					indiv({ onEMI: false, onProperty: false }),
					indiv({ onEMI: false, onProperty: false })
				];
				const result = runCrossFieldValidation(applicants, { loanName });
				expect(result.errors.find((e) => e.id === 'multiple_guarantors')).toBeUndefined();
			});
		}
	});

	describe('static-scan: validator wires the new error id', () => {
		const filePath = resolve(process.cwd(), 'src/lib/utils/crossStepValidator.ts');
		const source = readFileSync(filePath, 'utf-8');

		it('crossStepValidator.ts references multiple_guarantors error id', () => {
			expect(
				source.includes("'multiple_guarantors'") || source.includes('"multiple_guarantors"'),
				'crossStepValidator.ts no longer references the multiple_guarantors error id. ' +
					'A loan with 2+ implicit guarantors will pass validation silently and the rule ' +
					'engine will hit undefined behavior. ' +
					'See CLAUDE.md §3 Pitfall (Two guarantors silently allowed on secured loans).'
			).toBe(true);
		});

		it('the multiple_guarantors block is gated on isSecuredLoan', () => {
			const blockIdx = source.indexOf('multiple_guarantors');
			expect(blockIdx, 'multiple_guarantors not found').toBeGreaterThan(-1);
			const before = source.slice(Math.max(0, blockIdx - 1200), blockIdx);
			expect(
				/if\s*\(\s*isSecuredLoan\s*\)/.test(before),
				'multiple_guarantors error is not gated on isSecuredLoan — risk of misfire ' +
					'on unsecured loans where the role mechanism is different. ' +
					'See CLAUDE.md §3 Pitfall (Two guarantors silently allowed on secured loans).'
			).toBe(true);
		});
	});
});
