import { describe, it, expect } from 'vitest';
import { suggestPrimaryApplicant } from '$lib/ruleEngine/suggestPrimaryApplicant';

// ── Helper: build a minimal applicant record ──────────────────────
function makeApplicant(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		applicantType: 'Individual',
		fullName: 'Test Applicant',
		age: 35,
		creditScore: 750,
		grossIncome: 100_000,
		employmentType: 'Salaried(Private)',
		...overrides
	};
}

describe('suggestPrimaryApplicant', () => {
	// ── Returns null when no suggestion needed ────────────────────
	describe('returns null (no suggestion)', () => {
		it('single applicant — nothing to compare', () => {
			const result = suggestPrimaryApplicant([makeApplicant({ fullName: 'Alice' })], 'Home Loan');
			expect(result).toBeNull();
		});

		it('professional loan — profession constraint locks [0]', () => {
			const result = suggestPrimaryApplicant(
				[
					makeApplicant({ fullName: 'Alice', creditScore: 600 }),
					makeApplicant({ fullName: 'Bob', creditScore: 850 })
				],
				'Professional Loan'
			);
			expect(result).toBeNull();
		});

		it('current [0] is already the strongest', () => {
			const result = suggestPrimaryApplicant(
				[
					makeApplicant({ fullName: 'Alice', creditScore: 850, grossIncome: 200_000 }),
					makeApplicant({ fullName: 'Bob', creditScore: 650, grossIncome: 50_000 })
				],
				'Home Loan'
			);
			expect(result).toBeNull();
		});

		it('two applicants with very similar scores (below threshold)', () => {
			const result = suggestPrimaryApplicant(
				[
					makeApplicant({ fullName: 'Alice', creditScore: 760, grossIncome: 100_000 }),
					makeApplicant({ fullName: 'Bob', creditScore: 770, grossIncome: 105_000 })
				],
				'Home Loan'
			);
			// Difference too small — within 10% threshold
			expect(result).toBeNull();
		});

		it('all Company applicants — no individuals to compare', () => {
			const result = suggestPrimaryApplicant(
				[
					makeApplicant({ applicantType: 'Company', fullName: 'Corp A' }),
					makeApplicant({ applicantType: 'Company', fullName: 'Corp B' })
				],
				'Business Loan'
			);
			expect(result).toBeNull();
		});

		it('only one Individual among Company applicants', () => {
			const result = suggestPrimaryApplicant(
				[
					makeApplicant({ fullName: 'Alice' }),
					makeApplicant({ applicantType: 'Company', fullName: 'Corp A' })
				],
				'Home Loan'
			);
			expect(result).toBeNull();
		});
	});

	// ── Returns suggestion when reorder would help ────────────────
	describe('suggests reorder', () => {
		it('second applicant has much higher CIBIL', () => {
			const result = suggestPrimaryApplicant(
				[
					makeApplicant({ fullName: 'Alice', creditScore: 600, grossIncome: 80_000 }),
					makeApplicant({ fullName: 'Bob', creditScore: 850, grossIncome: 150_000 })
				],
				'Home Loan'
			);
			expect(result).not.toBeNull();
			expect(result!.suggestedIndex).toBe(1);
			expect(result!.suggestedName).toBe('Bob');
			expect(result!.currentName).toBe('Alice');
			expect(result!.reason).toContain('Bob');
		});

		it('third applicant is strongest among three', () => {
			const result = suggestPrimaryApplicant(
				[
					makeApplicant({ fullName: 'Alice', creditScore: 650, grossIncome: 50_000, age: 55 }),
					makeApplicant({ fullName: 'Bob', creditScore: 700, grossIncome: 80_000, age: 40 }),
					makeApplicant({ fullName: 'Carol', creditScore: 850, grossIncome: 180_000, age: 35 })
				],
				'Home Loan'
			);
			expect(result).not.toBeNull();
			expect(result!.suggestedIndex).toBe(2);
			expect(result!.suggestedName).toBe('Carol');
		});

		it('works for LAP loan type', () => {
			const result = suggestPrimaryApplicant(
				[
					makeApplicant({ fullName: 'Alice', creditScore: 600 }),
					makeApplicant({ fullName: 'Bob', creditScore: 850 })
				],
				'Loan Against Property'
			);
			expect(result).not.toBeNull();
			expect(result!.suggestedIndex).toBe(1);
		});

		it('reason mentions CIBIL when it is the key advantage', () => {
			const result = suggestPrimaryApplicant(
				[
					makeApplicant({ fullName: 'Alice', creditScore: 550, grossIncome: 100_000 }),
					makeApplicant({ fullName: 'Bob', creditScore: 850, grossIncome: 100_000 })
				],
				'Home Loan'
			);
			expect(result).not.toBeNull();
			expect(result!.reason).toContain('CIBIL');
		});

		it('reason mentions income when it is the key advantage', () => {
			const result = suggestPrimaryApplicant(
				[
					makeApplicant({ fullName: 'Alice', creditScore: 750, grossIncome: 30_000 }),
					makeApplicant({ fullName: 'Bob', creditScore: 750, grossIncome: 200_000 })
				],
				'Home Loan'
			);
			expect(result).not.toBeNull();
			expect(result!.reason).toContain('income');
		});
	});

	// ── Skips Company applicants correctly ─────────────────────────
	describe('handles mixed Individual/Company applicants', () => {
		it('suggests reorder among individuals, ignoring Companies', () => {
			const result = suggestPrimaryApplicant(
				[
					makeApplicant({ fullName: 'Weak Individual', creditScore: 600, grossIncome: 40_000 }),
					makeApplicant({ applicantType: 'Company', fullName: 'Corp A' }),
					makeApplicant({ fullName: 'Strong Individual', creditScore: 850, grossIncome: 180_000 })
				],
				'Home Loan'
			);
			expect(result).not.toBeNull();
			expect(result!.suggestedIndex).toBe(2);
			expect(result!.suggestedName).toBe('Strong Individual');
		});
	});

	// ── Edge cases ────────────────────────────────────────────────
	describe('edge cases', () => {
		it('empty applicants array', () => {
			expect(suggestPrimaryApplicant([], 'Home Loan')).toBeNull();
		});

		it('applicants with missing fields default gracefully', () => {
			const result = suggestPrimaryApplicant(
				[
					{ applicantType: 'Individual' },
					makeApplicant({ fullName: 'Bob', creditScore: 850, grossIncome: 150_000 })
				],
				'Home Loan'
			);
			// First applicant has 0 for everything, second is clearly better
			expect(result).not.toBeNull();
			expect(result!.suggestedIndex).toBe(1);
		});

		it('scores array is populated for all individuals', () => {
			const result = suggestPrimaryApplicant(
				[
					makeApplicant({ fullName: 'Alice', creditScore: 600, grossIncome: 40_000 }),
					makeApplicant({ fullName: 'Bob', creditScore: 850, grossIncome: 180_000 })
				],
				'Home Loan'
			);
			expect(result).not.toBeNull();
			expect(result!.scores).toHaveLength(2);
			expect(result!.scores[0].name).toBe('Alice');
			expect(result!.scores[1].name).toBe('Bob');
			// Bob should have higher composite score
			const aliceScore = result!.scores.find((s) => s.name === 'Alice')!.compositeScore;
			const bobScore = result!.scores.find((s) => s.name === 'Bob')!.compositeScore;
			expect(bobScore).toBeGreaterThan(aliceScore);
		});
	});
});
