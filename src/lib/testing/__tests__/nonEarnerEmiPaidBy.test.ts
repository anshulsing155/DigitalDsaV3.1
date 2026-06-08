import { describe, it, expect } from 'vitest';
import {
	deriveLegacyEmploymentType,
	NO_INCOME_REASON_OPTIONS
} from '$lib/config/incomeProfiles/profileCards';
import { computeSectionCompletion } from '$lib/utils/incomeTabState';

// ═══════════════════════════════════════════════════════════════════
// 1. NO_INCOME_REASON_OPTIONS
// ═══════════════════════════════════════════════════════════════════

describe('NO_INCOME_REASON_OPTIONS', () => {
	it('should contain 5 reason options', () => {
		expect(NO_INCOME_REASON_OPTIONS).toHaveLength(5);
	});

	it('should have all expected values', () => {
		const values = NO_INCOME_REASON_OPTIONS.map((o) => o.value);
		expect(values).toContain('homemaker');
		expect(values).toContain('student');
		expect(values).toContain('retired_no_pension');
		expect(values).toContain('between_jobs');
		expect(values).toContain('dependent_minor');
	});
});

// ═══════════════════════════════════════════════════════════════════
// 2. deriveLegacyEmploymentType with noIncomeReason
// ═══════════════════════════════════════════════════════════════════

describe('deriveLegacyEmploymentType with noIncomeReason', () => {
	it('should return "Student" for no_current_income + student reason', () => {
		expect(deriveLegacyEmploymentType(['no_current_income'], { noIncomeReason: 'student' })).toBe(
			'Student'
		);
	});

	it('should return "Pensioner" for no_current_income + retired_no_pension reason', () => {
		expect(
			deriveLegacyEmploymentType(['no_current_income'], { noIncomeReason: 'retired_no_pension' })
		).toBe('Pensioner');
	});

	it('should return "HomeMaker" for no_current_income + homemaker reason', () => {
		expect(deriveLegacyEmploymentType(['no_current_income'], { noIncomeReason: 'homemaker' })).toBe(
			'HomeMaker'
		);
	});

	it('should return "HomeMaker" for no_current_income + between_jobs reason', () => {
		expect(
			deriveLegacyEmploymentType(['no_current_income'], { noIncomeReason: 'between_jobs' })
		).toBe('HomeMaker');
	});

	it('should return "HomeMaker" for no_current_income + dependent_minor reason', () => {
		expect(
			deriveLegacyEmploymentType(['no_current_income'], { noIncomeReason: 'dependent_minor' })
		).toBe('HomeMaker');
	});

	it('should return "HomeMaker" for no_current_income without reason (backward compat)', () => {
		expect(deriveLegacyEmploymentType(['no_current_income'])).toBe('HomeMaker');
	});

	it('should return "HomeMaker" for no_current_income with empty specifics', () => {
		expect(deriveLegacyEmploymentType(['no_current_income'], {})).toBe('HomeMaker');
	});
});

// ═══════════════════════════════════════════════════════════════════
// 3. incomeTabState completion — noIncomeReason required
// ═══════════════════════════════════════════════════════════════════

describe('computeSectionCompletion — noIncomeReason', () => {
	const baseApplicant = {
		applicantType: 'Individual',
		education: 'graduate',
		religion: 'hindu',
		casteCategory: 'General',
		ownedResidentialProperties: '1',
		hasDisability: 'No',
		applicantResidencePattern: 'SAME_CITY',
		creditScore: 750,
		creditFactorsAnswered: true,
		ObligationsRunning: 'No'
	};

	it('should mark income_profiles INCOMPLETE when no_current_income selected but noIncomeReason missing', () => {
		const applicant = {
			...baseApplicant,
			selectedIncomeProfiles: ['no_current_income']
		};
		const result = computeSectionCompletion(applicant);
		expect(result.income_profiles).toBe(false);
	});

	it('should mark income_profiles COMPLETE when no_current_income selected AND noIncomeReason provided', () => {
		const applicant = {
			...baseApplicant,
			selectedIncomeProfiles: ['no_current_income'],
			noIncomeReason: 'homemaker'
		};
		const result = computeSectionCompletion(applicant);
		expect(result.income_profiles).toBe(true);
	});

	it('should not require noIncomeReason for earning profiles', () => {
		const applicant = {
			...baseApplicant,
			selectedIncomeProfiles: ['salaried_regular']
		};
		const result = computeSectionCompletion(applicant);
		expect(result.income_profiles).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════════
// 4. incomeTabState completion — emiPaidBy required for non-earner obligations
// ═══════════════════════════════════════════════════════════════════

describe('computeSectionCompletion — emiPaidBy for non-earner obligations', () => {
	const baseApplicant = {
		applicantType: 'Individual',
		education: 'graduate',
		religion: 'hindu',
		casteCategory: 'General',
		ownedResidentialProperties: '1',
		hasDisability: 'No',
		applicantResidencePattern: 'SAME_CITY',
		creditScore: 750,
		creditFactorsAnswered: true,
		selectedIncomeProfiles: ['no_current_income'],
		noIncomeReason: 'homemaker'
	};

	it('should mark obligations_details INCOMPLETE when non-earner has obligations without emiPaidBy', () => {
		const applicant = {
			...baseApplicant,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: '1',
					obligationType: 'term_loan',
					loanType: 'Personal Loan',
					bankName: 'SBI',
					selectedToClose: 'Keep running',
					emi: '10000',
					tenure: '24',
					interestRate: '12'
				}
			]
		};
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(false);
	});

	it('should mark obligations_details COMPLETE when non-earner obligations have emiPaidBy', () => {
		const applicant = {
			...baseApplicant,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: '1',
					obligationType: 'term_loan',
					loanType: 'Personal Loan',
					bankName: 'SBI',
					selectedToClose: 'Keep running',
					emi: '10000',
					tenure: '24',
					interestRate: '12',
					emiPaidBy: 'spouse'
				}
			]
		};
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(true);
	});

	it('should not require emiPaidBy when applicant has earning profiles', () => {
		const applicant = {
			...baseApplicant,
			selectedIncomeProfiles: ['salaried_regular'],
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: '1',
					obligationType: 'term_loan',
					loanType: 'Personal Loan',
					bankName: 'SBI',
					selectedToClose: 'Keep running',
					emi: '10000',
					tenure: '24',
					interestRate: '12'
					// No emiPaidBy — should still pass for earners
				}
			]
		};
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(true);
	});

	it('should mark obligations_details COMPLETE when non-earner says ObligationsRunning = No and isGuarantor = No', () => {
		const applicant = {
			...baseApplicant,
			ObligationsRunning: 'No',
			isGuarantorOnOtherLoan: 'No'
		};
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(true);
	});

	it('should mark obligations_details INCOMPLETE when ObligationsRunning = No but guarantor question unanswered', () => {
		const applicant = {
			...baseApplicant,
			ObligationsRunning: 'No'
		};
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(false);
	});

	it('should mark obligations_details INCOMPLETE when all non-earner obligations have emiPaidBy but one is missing', () => {
		const applicant = {
			...baseApplicant,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: '1',
					obligationType: 'term_loan',
					loanType: 'Home Loan',
					bankName: 'SBI',
					selectedToClose: 'Keep running',
					emi: '20000',
					tenure: '120',
					interestRate: '8',
					emiPaidBy: 'spouse'
				},
				{
					id: '2',
					obligationType: 'term_loan',
					loanType: 'Personal Loan',
					bankName: 'HDFC',
					selectedToClose: 'Keep running',
					emi: '5000',
					tenure: '12',
					interestRate: '15'
					// Missing emiPaidBy
				}
			]
		};
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(false);
	});
});
