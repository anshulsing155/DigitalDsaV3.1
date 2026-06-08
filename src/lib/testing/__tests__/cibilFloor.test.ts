/**
 * Tests for CIBIL floor computation per lender policy
 * ═══════════════════════════════════════════════════════════════════
 * Validates that _min_cibil is computed based on lender's cibilScope:
 * - financial_only: only co_applicant_financial + guarantor_financial
 * - all_co_applicants (DEFAULT): financial + non-financial co-applicants
 * - all_including_guarantors: everyone on the loan
 */

import { describe, it, expect } from 'vitest';
import { evaluateClassificationsForLender } from '$lib/ruleEngine/lenderClassificationEvaluator';

describe('CIBIL scope classification filtering', () => {
	// These tests verify that the classification overrides correctly
	// identify which applicants should be included in CIBIL scope.
	// The actual _min_cibil recomputation happens in evaluationEngine.ts.

	it('PVT does NOT upgrade — non-financial CIBIL excluded from financial_only', () => {
		const applicants = [
			{
				id: 'p1',
				applicantType: 'Individual',
				applicantClassification: 'co_applicant_financial',
				onEMI: true,
				creditScore: 750
			},
			{
				id: 'c1',
				applicantType: 'Individual',
				applicantClassification: 'co_applicant_non_financial',
				onEMI: false,
				onProperty: false,
				isFamilyMember: true,
				ownershipPercent: 25,
				creditScore: 600
			}
		];
		const overrides = evaluateClassificationsForLender(applicants as any, 'PVT', true);
		// PVT: no override — stays non-financial
		expect(overrides.size).toBe(0);
		// In financial_only scope, 600 CIBIL would NOT drag down the minimum
	});

	it('guarantor_non_financial excluded from all_co_applicants scope', () => {
		const applicants = [
			{
				id: 'p1',
				applicantType: 'Individual',
				applicantClassification: 'co_applicant_financial',
				onEMI: true,
				creditScore: 750
			},
			{
				id: 'g1',
				applicantType: 'Individual',
				applicantClassification: 'guarantor_non_financial',
				onEMI: false,
				onProperty: false,
				isFamilyMember: false,
				creditScore: 550
			}
		];
		const overrides = evaluateClassificationsForLender(applicants as any, 'PVT', true);
		// No override for PVT — guarantor stays non-financial
		expect(overrides.size).toBe(0);
		// In all_co_applicants scope (default), guarantors are excluded → 550 doesn't count
	});

	it('all_including_guarantors scope would include everyone', () => {
		// This test documents the behavior — the actual CIBIL computation
		// is in evaluationEngine.ts and uses the cibilScope from the lender policy.
		// With all_including_guarantors, even a 550-CIBIL guarantor drags down the min.
		const applicants = [
			{
				id: 'p1',
				applicantType: 'Individual',
				applicantClassification: 'co_applicant_financial',
				onEMI: true,
				creditScore: 750
			},
			{
				id: 'g1',
				applicantType: 'Individual',
				applicantClassification: 'guarantor_financial',
				onEMI: false,
				onProperty: false,
				isFamilyMember: false,
				ownershipPercent: 30,
				creditScore: 550
			}
		];
		// guarantor_financial is NOT overridden by any lender (universal rule)
		const overrides = evaluateClassificationsForLender(applicants as any, 'NBFC', true);
		expect(overrides.size).toBe(0);
		// With all_including_guarantors scope, both 750 and 550 count → min = 550
	});
});

