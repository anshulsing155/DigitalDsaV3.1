/**
 * Payload Filtering Tests
 * ═══════════════════════════════════════════════════════════════
 * Verifies that the payload builder correctly filters entries based on
 * user-visible state — deselected income profiles and guarantor-only mode
 * must NOT leak into the rule engine payload.
 */

import { describe, it, expect } from 'vitest';
import { extractIncomeEntries } from '$lib/utils/payloadBuilder/incomePayload';
import { cleanObligationEntries } from '$lib/utils/payloadBuilder/obligationPayload';
import { buildApplicantPayload } from '$lib/utils/payloadBuilder/applicantPayload';

// ═══════════════════════════════════════════════════════════════
// Income Payload — selectedIncomeProfiles filtering
// ═══════════════════════════════════════════════════════════════
describe('extractIncomeEntries — selectedIncomeProfiles filtering', () => {
	const salariedEntry = {
		profileType: 'salaried_regular',
		entityName: 'Acme Corp',
		income: { grossMonthlySalary: 50000 },
		evidence: { itrFiled: true, hasDocumentaryEvidence: true }
	};

	const rentalEntry = {
		profileType: 'rental_income',
		entityName: 'Flat A',
		income: { monthlyRentAmount: 20000 },
		evidence: { itrFiled: false, hasDocumentaryEvidence: false }
	};

	const businessEntry = {
		profileType: 'director_company',
		entityName: 'My Pvt Ltd',
		income: { netProfit: 100000 },
		evidence: { itrFiled: true, hasDocumentaryEvidence: true }
	};

	it('includes only entries matching selectedIncomeProfiles', () => {
		const applicant = {
			incomeEntries: [salariedEntry, rentalEntry, businessEntry],
			selectedIncomeProfiles: ['salaried_regular', 'director_company']
		};

		const result = extractIncomeEntries(applicant);
		expect(result).toHaveLength(2);
		expect(result.map((e) => e.profileType)).toEqual(['salaried_regular', 'director_company']);
	});

	it('excludes deselected income profiles from payload', () => {
		// User had rental + salaried, then deselected rental
		const applicant = {
			incomeEntries: [salariedEntry, rentalEntry],
			selectedIncomeProfiles: ['salaried_regular']
		};

		const result = extractIncomeEntries(applicant);
		expect(result).toHaveLength(1);
		expect(result[0].profileType).toBe('salaried_regular');
	});

	it('includes all entries when selectedIncomeProfiles is not set (backward compat)', () => {
		// Legacy data may not have selectedIncomeProfiles
		const applicant = {
			incomeEntries: [salariedEntry, rentalEntry]
		};

		const result = extractIncomeEntries(applicant);
		expect(result).toHaveLength(2);
	});

	it('includes all entries when selectedIncomeProfiles is empty array (backward compat)', () => {
		const applicant = {
			incomeEntries: [salariedEntry, rentalEntry],
			selectedIncomeProfiles: []
		};

		const result = extractIncomeEntries(applicant);
		expect(result).toHaveLength(2);
	});

	it('returns empty when no entries match selected profiles', () => {
		const applicant = {
			incomeEntries: [rentalEntry],
			selectedIncomeProfiles: ['salaried_regular']
		};

		const result = extractIncomeEntries(applicant);
		expect(result).toHaveLength(0);
	});

	it('returns empty when incomeEntries is empty', () => {
		const applicant = {
			incomeEntries: [],
			selectedIncomeProfiles: ['salaried_regular']
		};

		const result = extractIncomeEntries(applicant);
		expect(result).toHaveLength(0);
	});
});

// ═══════════════════════════════════════════════════════════════
// Obligation Payload — guarantor-only mode filtering
// ═══════════════════════════════════════════════════════════════
describe('cleanObligationEntries — guarantor-only mode', () => {
	const coBorrowerEntry = {
		id: 'obl1',
		loanType: 'Home Loan',
		role: 'co_applicant',
		emi: '50000',
		bankName: 'SBI',
		selectedToClose: 'Keep running'
	};

	const guarantorEntry = {
		id: 'obl2',
		loanType: 'Car Loan',
		role: 'guarantor',
		emi: '15000',
		bankName: 'HDFC',
		selectedToClose: 'Keep running'
	};

	it('includes all entries in standard obligations mode', () => {
		const applicant = {
			obligations: [coBorrowerEntry, guarantorEntry],
			ObligationsRunning: 'Yes'
		};

		const result = cleanObligationEntries(applicant);
		expect(result).toHaveLength(2);
	});

	it('includes only guarantor entries in guarantor-only mode', () => {
		// User said No to running obligations but Yes to being a guarantor
		const applicant = {
			obligations: [coBorrowerEntry, guarantorEntry],
			ObligationsRunning: 'No',
			isGuarantorOnOtherLoan: 'Yes'
		};

		const result = cleanObligationEntries(applicant);
		expect(result).toHaveLength(1);
		expect(result[0].loanType).toBe('Car Loan');
		expect(result[0].role).toBe('guarantor');
	});

	it('excludes co-borrower entries in guarantor-only mode to prevent inflated FOIR', () => {
		const applicant = {
			obligations: [coBorrowerEntry, coBorrowerEntry, guarantorEntry],
			ObligationsRunning: 'No',
			isGuarantorOnOtherLoan: 'Yes'
		};

		const result = cleanObligationEntries(applicant);
		// Only the guarantor entry should survive
		expect(result).toHaveLength(1);
		expect(result[0].role).toBe('guarantor');
	});

	it('includes all entries when ObligationsRunning is No and guarantor is also No', () => {
		// No obligations at all — shouldn't reach this code path normally
		// (applicantPayload.ts gates on hasExistingObligations), but if it does,
		// no special filtering applies
		const applicant = {
			obligations: [coBorrowerEntry],
			ObligationsRunning: 'No',
			isGuarantorOnOtherLoan: 'No'
		};

		const result = cleanObligationEntries(applicant);
		expect(result).toHaveLength(1);
	});

	it('filters entries without any role in guarantor-only mode', () => {
		// Entry with no role set — should be excluded in guarantor-only mode
		const noRoleEntry = {
			id: 'obl3',
			loanType: 'Personal Loan',
			emi: '10000',
			bankName: 'ICICI',
			selectedToClose: 'Keep running'
		};

		const applicant = {
			obligations: [noRoleEntry, guarantorEntry],
			ObligationsRunning: 'No',
			isGuarantorOnOtherLoan: 'Yes'
		};

		const result = cleanObligationEntries(applicant);
		expect(result).toHaveLength(1);
		expect(result[0].role).toBe('guarantor');
	});
});

// ═══════════════════════════════════════════════════════════════
// buildApplicantPayload — obligations gate for guarantor-only
// ═══════════════════════════════════════════════════════════════
describe('buildApplicantPayload — guarantor-only obligation inclusion', () => {
	it('includes guarantor obligations even when ObligationsRunning is No', () => {
		const applicant: Record<string, unknown> = {
			applicantType: 'Individual',
			fullName: 'Test User',
			age: 30,
			gender: 'Male',
			employmentType: 'Salaried(Private)',
			creditScore: 750,
			ObligationsRunning: 'No',
			isGuarantorOnOtherLoan: 'Yes',
			obligations: [
				{
					id: 'g1',
					loanType: 'Business Loan',
					role: 'guarantor',
					emi: '25000',
					bankName: 'BOB',
					selectedToClose: 'Keep running'
				}
			]
		};

		const payload = buildApplicantPayload(applicant, 0);
		// hasExistingObligations should be false (ObligationsRunning=No)
		expect(payload.hasExistingObligations).toBe(false);
		// But obligations should still be present (guarantor-only mode)
		expect(payload.obligations).toBeDefined();
		expect(payload.obligations).toHaveLength(1);
		expect(payload.obligations![0].role).toBe('guarantor');
	});

	it('excludes co-borrower obligations in guarantor-only mode at payload level', () => {
		const applicant: Record<string, unknown> = {
			applicantType: 'Individual',
			fullName: 'Test User',
			age: 30,
			gender: 'Male',
			employmentType: 'Salaried(Private)',
			creditScore: 750,
			ObligationsRunning: 'No',
			isGuarantorOnOtherLoan: 'Yes',
			obligations: [
				{
					id: 'co1',
					loanType: 'Home Loan',
					role: 'co_applicant',
					emi: '50000',
					bankName: 'SBI',
					selectedToClose: 'Keep running'
				},
				{
					id: 'g1',
					loanType: 'Car Loan',
					role: 'guarantor',
					emi: '15000',
					bankName: 'HDFC',
					selectedToClose: 'Keep running'
				}
			]
		};

		const payload = buildApplicantPayload(applicant, 0);
		expect(payload.obligations).toHaveLength(1);
		expect(payload.obligations![0].loanType).toBe('Car Loan');
	});

	it('does NOT include obligations when both ObligationsRunning=No and isGuarantor=No', () => {
		const applicant: Record<string, unknown> = {
			applicantType: 'Individual',
			fullName: 'Test User',
			age: 30,
			gender: 'Male',
			employmentType: 'Salaried(Private)',
			creditScore: 750,
			ObligationsRunning: 'No',
			isGuarantorOnOtherLoan: 'No',
			obligations: [
				{
					id: 'co1',
					loanType: 'Home Loan',
					role: 'co_applicant',
					emi: '50000',
					bankName: 'SBI',
					selectedToClose: 'Keep running'
				}
			]
		};

		const payload = buildApplicantPayload(applicant, 0);
		// No obligations should be included at all
		expect(payload.obligations).toBeUndefined();
	});
});

// ═══════════════════════════════════════════════════════════════
// buildApplicantPayload — income filtering through full pipeline
// ═══════════════════════════════════════════════════════════════
describe('buildApplicantPayload — income profile filtering end-to-end', () => {
	it('only includes selected income profiles in final payload', () => {
		const applicant: Record<string, unknown> = {
			applicantType: 'Individual',
			fullName: 'Test DSA',
			age: 35,
			gender: 'Female',
			employmentType: 'Self-employed(Other)',
			creditScore: 700,
			ObligationsRunning: 'No',
			selectedIncomeProfiles: ['salaried_regular'],
			incomeEntries: [
				{
					profileType: 'salaried_regular',
					entityName: 'Corp A',
					income: { grossMonthlySalary: 60000 },
					evidence: { itrFiled: true, hasDocumentaryEvidence: true }
				},
				{
					// This was deselected — should NOT appear in payload
					profileType: 'rental_income',
					entityName: 'Flat B',
					income: { monthlyRentAmount: 25000 },
					evidence: { itrFiled: false, hasDocumentaryEvidence: false }
				}
			]
		};

		const payload = buildApplicantPayload(applicant, 0);
		expect(payload.incomeEntries).toHaveLength(1);
		expect(payload.incomeEntries![0].profileType).toBe('salaried_regular');
	});
});
