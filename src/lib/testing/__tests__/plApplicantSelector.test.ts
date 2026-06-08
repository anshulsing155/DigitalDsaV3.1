/**
 * Tests for PL Applicant Selector
 * ═══════════════════════════════════════════════════════════════════
 * Validates that selectBestPlApplicant correctly evaluates applicants
 * for personal loan bridge eligibility in multi-applicant scenarios.
 *
 * Test scenarios:
 *   1. Single applicant — returns that applicant
 *   2. Two applicants — picks higher CIBIL
 *   3. Company applicant excluded
 *   4. No eligible applicants (all low CIBIL) — returns null
 *   5. Age boundary cases (21, 60, 61)
 *   6. Tie-breaking by income when CIBIL is equal
 *   7. Employment type weighting (salaried > self-employed)
 *   8. Missing creditScore defaults to 0 (ineligible)
 */

import { describe, it, expect } from 'vitest';
import { selectBestPlApplicant } from '$lib/ruleEngine/plApplicantSelector';
import type { PlAssignmentResult } from '$lib/ruleEngine/plApplicantSelector';

// ============================================================================
// HELPERS — Factory functions for test applicants
// ============================================================================

function makeIndividual(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		applicantType: 'Individual',
		fullName: 'Test Person',
		creditScore: 750,
		age: 35,
		employmentType: 'Salaried(Private)',
		grossIncome: 80000,
		isNonEarning: false,
		...overrides
	};
}

function makeCompany(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		applicantType: 'Company',
		fullName: 'Test Corp Pvt Ltd',
		creditScore: 0,
		age: 0,
		employmentType: 'unknown',
		grossIncome: 500000,
		...overrides
	};
}

// ============================================================================
// 1. SINGLE APPLICANT
// ============================================================================

describe('PL Applicant Selector', () => {
	describe('single applicant scenarios', () => {
		it('returns the only eligible applicant', () => {
			const applicants = [makeIndividual({ fullName: 'Rahul Sharma', creditScore: 780 })];
			const result = selectBestPlApplicant(applicants);

			expect(result.selectedIndex).toBe(0);
			expect(result.evaluations).toHaveLength(1);
			expect(result.evaluations[0].isEligible).toBe(true);
			expect(result.evaluations[0].displayName).toBe('Rahul Sharma');
			expect(result.selectionReason).toContain('Rahul Sharma selected');
			expect(result.selectionReason).toContain('only eligible applicant');
		});

		it('returns null when single applicant is ineligible', () => {
			const applicants = [makeIndividual({ creditScore: 600 })];
			const result = selectBestPlApplicant(applicants);

			expect(result.selectedIndex).toBeNull();
			expect(result.evaluations).toHaveLength(1);
			expect(result.evaluations[0].isEligible).toBe(false);
			expect(result.selectionReason).toContain('No applicant meets minimum');
		});
	});

	// ============================================================================
	// 2. TWO APPLICANTS — PICKS HIGHER CIBIL
	// ============================================================================

	describe('multi-applicant CIBIL comparison', () => {
		it('selects applicant with higher CIBIL score', () => {
			const applicants = [
				makeIndividual({ fullName: 'Low CIBIL Person', creditScore: 720, age: 35 }),
				makeIndividual({ fullName: 'High CIBIL Person', creditScore: 820, age: 35 })
			];
			const result = selectBestPlApplicant(applicants);

			expect(result.selectedIndex).toBe(1);
			expect(result.evaluations).toHaveLength(2);
			// Both should be eligible
			expect(result.evaluations[0].isEligible).toBe(true);
			expect(result.evaluations[1].isEligible).toBe(true);
			// Higher CIBIL should have higher composite score
			expect(result.evaluations[1].compositeScore).toBeGreaterThan(
				result.evaluations[0].compositeScore
			);
			expect(result.selectionReason).toContain('High CIBIL Person selected');
			expect(result.selectionReason).toContain('chosen over 1 other eligible');
		});
	});

	// ============================================================================
	// 3. COMPANY APPLICANT EXCLUDED
	// ============================================================================

	describe('Company applicant exclusion', () => {
		it('skips Company applicants and selects only Individual', () => {
			const applicants = [
				makeCompany({ fullName: 'ABC Corp' }),
				makeIndividual({ fullName: 'Individual Person', creditScore: 750 })
			];
			const result = selectBestPlApplicant(applicants);

			expect(result.selectedIndex).toBe(1);
			// Only the Individual should be in evaluations
			expect(result.evaluations).toHaveLength(1);
			expect(result.evaluations[0].applicantIndex).toBe(1);
			expect(result.evaluations[0].displayName).toBe('Individual Person');
		});

		it('returns null when only Company applicants exist', () => {
			const applicants = [makeCompany(), makeCompany()];
			const result = selectBestPlApplicant(applicants);

			expect(result.selectedIndex).toBeNull();
			expect(result.evaluations).toHaveLength(0);
		});
	});

	// ============================================================================
	// 4. NO ELIGIBLE APPLICANTS (ALL LOW CIBIL)
	// ============================================================================

	describe('no eligible applicants', () => {
		it('returns null when all applicants have low CIBIL', () => {
			const applicants = [
				makeIndividual({ fullName: 'Person A', creditScore: 650 }),
				makeIndividual({ fullName: 'Person B', creditScore: 680 }),
				makeIndividual({ fullName: 'Person C', creditScore: 550 })
			];
			const result = selectBestPlApplicant(applicants);

			expect(result.selectedIndex).toBeNull();
			expect(result.evaluations).toHaveLength(3);
			// All should be marked ineligible
			result.evaluations.forEach((ev) => {
				expect(ev.isEligible).toBe(false);
				expect(ev.reasons).toEqual(
					expect.arrayContaining([expect.stringContaining('below minimum 700')])
				);
			});
		});

		it('returns null for empty applicant array', () => {
			const result = selectBestPlApplicant([]);

			expect(result.selectedIndex).toBeNull();
			expect(result.evaluations).toHaveLength(0);
		});
	});

	// ============================================================================
	// 5. AGE BOUNDARY CASES
	// ============================================================================

	describe('age boundary cases', () => {
		it('age 21 is eligible (minimum boundary)', () => {
			const applicants = [makeIndividual({ age: 21 })];
			const result = selectBestPlApplicant(applicants);

			expect(result.selectedIndex).toBe(0);
			expect(result.evaluations[0].isEligible).toBe(true);
			expect(result.evaluations[0].reasons).toEqual(
				expect.arrayContaining([expect.stringContaining('within eligible range 21-60')])
			);
		});

		it('age 60 is eligible (maximum boundary)', () => {
			const applicants = [makeIndividual({ age: 60 })];
			const result = selectBestPlApplicant(applicants);

			expect(result.selectedIndex).toBe(0);
			expect(result.evaluations[0].isEligible).toBe(true);
		});

		it('age 61 is ineligible (exceeds maximum)', () => {
			const applicants = [makeIndividual({ age: 61 })];
			const result = selectBestPlApplicant(applicants);

			expect(result.selectedIndex).toBeNull();
			expect(result.evaluations[0].isEligible).toBe(false);
			expect(result.evaluations[0].reasons).toEqual(
				expect.arrayContaining([expect.stringContaining('exceeds maximum 60')])
			);
		});

		it('age 20 is ineligible (below minimum)', () => {
			const applicants = [makeIndividual({ age: 20 })];
			const result = selectBestPlApplicant(applicants);

			expect(result.selectedIndex).toBeNull();
			expect(result.evaluations[0].isEligible).toBe(false);
			expect(result.evaluations[0].reasons).toEqual(
				expect.arrayContaining([expect.stringContaining('below minimum 21')])
			);
		});

		it('age 35 scores higher than age 55 (peak vs declining)', () => {
			const applicants = [
				makeIndividual({ fullName: 'Young', age: 35, creditScore: 750 }),
				makeIndividual({ fullName: 'Older', age: 55, creditScore: 750 })
			];
			const result = selectBestPlApplicant(applicants);

			// Same CIBIL and income — age factor should differentiate
			const youngEval = result.evaluations.find((e) => e.displayName === 'Young')!;
			const olderEval = result.evaluations.find((e) => e.displayName === 'Older')!;
			expect(youngEval.compositeScore).toBeGreaterThan(olderEval.compositeScore);
		});
	});

	// ============================================================================
	// 6. TIE-BREAKING BY INCOME WHEN CIBIL IS EQUAL
	// ============================================================================

	describe('tie-breaking by income', () => {
		it('selects higher income when CIBIL and age are identical', () => {
			const applicants = [
				makeIndividual({
					fullName: 'Low Income',
					creditScore: 750,
					age: 35,
					grossIncome: 50000,
					employmentType: 'Salaried(Private)'
				}),
				makeIndividual({
					fullName: 'High Income',
					creditScore: 750,
					age: 35,
					grossIncome: 150000,
					employmentType: 'Salaried(Private)'
				})
			];
			const result = selectBestPlApplicant(applicants);

			expect(result.selectedIndex).toBe(1);
			expect(result.selectionReason).toContain('High Income selected');

			const lowEval = result.evaluations.find((e) => e.displayName === 'Low Income')!;
			const highEval = result.evaluations.find((e) => e.displayName === 'High Income')!;
			expect(highEval.compositeScore).toBeGreaterThan(lowEval.compositeScore);
		});
	});

	// ============================================================================
	// 7. EMPLOYMENT TYPE WEIGHTING
	// ============================================================================

	describe('employment type weighting', () => {
		it('salaried scores higher than self-employed (same CIBIL/age/income)', () => {
			const applicants = [
				makeIndividual({
					fullName: 'Self Employed',
					creditScore: 750,
					age: 35,
					grossIncome: 100000,
					employmentType: 'Self-employed(Other)'
				}),
				makeIndividual({
					fullName: 'Salaried',
					creditScore: 750,
					age: 35,
					grossIncome: 100000,
					employmentType: 'Salaried(Private)'
				})
			];
			const result = selectBestPlApplicant(applicants);

			expect(result.selectedIndex).toBe(1);

			const selfEmpEval = result.evaluations.find((e) => e.displayName === 'Self Employed')!;
			const salariedEval = result.evaluations.find((e) => e.displayName === 'Salaried')!;
			expect(salariedEval.compositeScore).toBeGreaterThan(selfEmpEval.compositeScore);
		});

		it('government salaried scores equal to private salaried', () => {
			const applicants = [
				makeIndividual({
					fullName: 'Govt',
					creditScore: 750,
					age: 35,
					grossIncome: 100000,
					employmentType: 'Salaried(Government)'
				}),
				makeIndividual({
					fullName: 'Pvt',
					creditScore: 750,
					age: 35,
					grossIncome: 100000,
					employmentType: 'Salaried(Private)'
				})
			];
			const result = selectBestPlApplicant(applicants);

			const govtEval = result.evaluations.find((e) => e.displayName === 'Govt')!;
			const pvtEval = result.evaluations.find((e) => e.displayName === 'Pvt')!;
			expect(govtEval.compositeScore).toBe(pvtEval.compositeScore);
		});

		it('Self-employed(Businessman) scores equal to other self-employed types', () => {
			const applicants = [
				makeIndividual({
					fullName: 'Businessman',
					creditScore: 750,
					age: 35,
					grossIncome: 100000,
					employmentType: 'Self-employed(Businessman)'
				}),
				makeIndividual({
					fullName: 'Professional',
					creditScore: 750,
					age: 35,
					grossIncome: 100000,
					employmentType: 'Self-employed(Professional)'
				})
			];
			const result = selectBestPlApplicant(applicants);

			const bizEval = result.evaluations.find((e) => e.displayName === 'Businessman')!;
			const profEval = result.evaluations.find((e) => e.displayName === 'Professional')!;
			// Both should get 0.7 employment score → same composite
			expect(bizEval.compositeScore).toBe(profEval.compositeScore);
		});

		it('unknown employment type gets lower score than salaried', () => {
			const applicants = [
				makeIndividual({
					fullName: 'Unknown Type',
					creditScore: 750,
					age: 35,
					grossIncome: 100000,
					employmentType: 'Freelancer'
				}),
				makeIndividual({
					fullName: 'Salaried',
					creditScore: 750,
					age: 35,
					grossIncome: 100000,
					employmentType: 'Salaried(Private)'
				})
			];
			const result = selectBestPlApplicant(applicants);

			const unknownEval = result.evaluations.find((e) => e.displayName === 'Unknown Type')!;
			const salariedEval = result.evaluations.find((e) => e.displayName === 'Salaried')!;
			expect(salariedEval.compositeScore).toBeGreaterThan(unknownEval.compositeScore);
		});
	});

	// ============================================================================
	// 8. MISSING CREDIT SCORE
	// ============================================================================

	describe('missing creditScore handling', () => {
		it('missing creditScore defaults to 0 (ineligible)', () => {
			const applicants = [
				makeIndividual({
					fullName: 'No CIBIL',
					creditScore: undefined,
					age: 35,
					grossIncome: 100000
				})
			];
			const result = selectBestPlApplicant(applicants);

			expect(result.selectedIndex).toBeNull();
			expect(result.evaluations[0].creditScore).toBe(0);
			expect(result.evaluations[0].isEligible).toBe(false);
		});

		it('creditScore of 0 is treated as ineligible', () => {
			const applicants = [makeIndividual({ creditScore: 0 })];
			const result = selectBestPlApplicant(applicants);

			expect(result.selectedIndex).toBeNull();
			expect(result.evaluations[0].isEligible).toBe(false);
		});
	});

	// ============================================================================
	// 9. EDGE CASES
	// ============================================================================

	describe('edge cases', () => {
		it('non-earning applicant is ineligible regardless of CIBIL', () => {
			const applicants = [
				makeIndividual({
					creditScore: 800,
					age: 35,
					grossIncome: 0,
					isNonEarning: true
				})
			];
			const result = selectBestPlApplicant(applicants);

			expect(result.selectedIndex).toBeNull();
			expect(result.evaluations[0].isEligible).toBe(false);
			expect(result.evaluations[0].reasons).toEqual(
				expect.arrayContaining([expect.stringContaining('No income')])
			);
		});

		it('zero income is ineligible even with good CIBIL', () => {
			const applicants = [
				makeIndividual({
					creditScore: 800,
					age: 35,
					grossIncome: 0,
					isNonEarning: false
				})
			];
			const result = selectBestPlApplicant(applicants);

			expect(result.selectedIndex).toBeNull();
			expect(result.evaluations[0].isEligible).toBe(false);
		});

		it('preserves original applicant index when Company is filtered out', () => {
			const applicants = [
				makeCompany(), // index 0 — skipped
				makeIndividual({ fullName: 'B' }), // index 1
				makeCompany(), // index 2 — skipped
				makeIndividual({ fullName: 'D', creditScore: 800 }) // index 3
			];
			const result = selectBestPlApplicant(applicants);

			// Should select index 3 (higher CIBIL), not a filtered index
			expect(result.selectedIndex).toBe(3);
			expect(result.evaluations).toHaveLength(2);
			expect(result.evaluations[0].applicantIndex).toBe(1);
			expect(result.evaluations[1].applicantIndex).toBe(3);
		});

		it('handles applicant with incomeEntries instead of grossIncome', () => {
			const applicants = [
				makeIndividual({
					fullName: 'Entry Income',
					creditScore: 750,
					grossIncome: 0,
					incomeEntries: [
						{ income: { grossMonthlySalary: 60000 } },
						{ income: { monthlyRentAmount: 15000 } }
					]
				})
			];
			const result = selectBestPlApplicant(applicants);

			expect(result.selectedIndex).toBe(0);
			expect(result.evaluations[0].monthlyIncome).toBe(75000);
			expect(result.evaluations[0].isEligible).toBe(true);
		});

		it('compositeScore reflects all four factors', () => {
			const applicants = [
				makeIndividual({
					creditScore: 900, // max CIBIL → 1.0 normalized
					age: 35, // peak age → 1.0 factor
					grossIncome: 200000, // at cap → 1.0 normalized
					employmentType: 'Salaried(Private)' // 1.0 employment score
				})
			];
			const result = selectBestPlApplicant(applicants);

			// All factors maxed out: 0.40 + 0.30 + 0.15 + 0.15 = 1.0
			expect(result.evaluations[0].compositeScore).toBe(1.0);
		});

		it('multiple ineligibility reasons are all captured', () => {
			const applicants = [
				makeIndividual({
					creditScore: 500,
					age: 65,
					grossIncome: 0,
					isNonEarning: true
				})
			];
			const result = selectBestPlApplicant(applicants);

			const reasons = result.evaluations[0].reasons;
			expect(reasons).toEqual(
				expect.arrayContaining([
					expect.stringContaining('CIBIL 500 below minimum'),
					expect.stringContaining('Age 65 exceeds maximum'),
					expect.stringContaining('No income')
				])
			);
		});
	});

	// ════════════════════════════════════════════════════════════════
	// Director/partner income fields
	// ════════════════════════════════════════════════════════════════
	describe('director/partner income extraction', () => {
		it('recognises monthlySalaryAmount from director salary entries', () => {
			const applicants = [
				makeIndividual({
					fullName: 'Director A',
					grossIncome: 0,
					incomeEntries: [{ income: { monthlySalaryAmount: 120000 } }]
				})
			];
			const result = selectBestPlApplicant(applicants);
			expect(result.selectedIndex).toBe(0);
			expect(result.evaluations[0].monthlyIncome).toBe(120000);
		});

		it('recognises averageProfitPerWithdrawal from partner profit entries', () => {
			const applicants = [
				makeIndividual({
					fullName: 'Partner B',
					grossIncome: 0,
					incomeEntries: [{ income: { averageProfitPerWithdrawal: 95000 } }]
				})
			];
			const result = selectBestPlApplicant(applicants);
			expect(result.selectedIndex).toBe(0);
			expect(result.evaluations[0].monthlyIncome).toBe(95000);
		});

		it('sums director salary and partner profit from multiple entries', () => {
			const applicants = [
				makeIndividual({
					fullName: 'Multi-Income Director',
					grossIncome: 0,
					incomeEntries: [
						{ income: { monthlySalaryAmount: 60000 } },
						{ income: { averageProfitPerWithdrawal: 40000 } }
					]
				})
			];
			const result = selectBestPlApplicant(applicants);
			expect(result.evaluations[0].monthlyIncome).toBe(100000);
		});
	});
});
