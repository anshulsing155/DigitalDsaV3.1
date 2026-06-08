/**
 * Obligation Logic Tests
 * ═══════════════════════════════════════════════════════════════════
 * Comprehensive tests for obligation-related pure functions:
 *   1. EMI calculation (standard formula)
 *   2. FOIR-eligible amount with obligations
 *   3. Credit line FOIR treatment
 *   4. EMI share computation (role, split, overrides)
 *   5. Obligation payload cleaning
 *   6. Obligation completion checks (incomeTabState)
 *   7. Obligation dedup edge cases
 *   8. Obligation options filtering
 *   9. Obligation enrichment (total monthly obligation extraction)
 *
 * All tests use realistic Indian financial data (INR values, typical
 * EMIs, FOIR limits as used by Indian banks).
 * ═══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';

// ── EMI & FOIR calculations ──
import {
	calculateEMI,
	calculateFoirEligibleAmount,
	calculateCreditLineFoirEligibleLimit
} from '$lib/ruleEngine/emiCalculator';

// ── EMI share logic ──
import { parseBorrowerCount, computeApplicantEmiShare } from '$lib/utils/emiShareCalculator';

// ── Obligation payload cleaning ──
import {
	cleanObligationEntries,
	CREDIT_LINE_TYPES
} from '$lib/utils/payloadBuilder/obligationPayload';

// ── Obligation completion checks ──
import { computeSectionCompletion, computeCompanyCompletion } from '$lib/utils/incomeTabState';

// ── Obligation options & helpers ──
import {
	deriveFacilityType,
	getLoanTypesForApplicant,
	getClosureOptionsFiltered,
	shortEvidence,
	isInstaLoan
} from '$lib/config/obligationOptions';

// ── Obligation enhancement options (capacity, entity) ──
import {
	getFilteredCapacityOptions,
	needsCapacityEntity
} from '$lib/config/incomeProfiles/obligationEnhancements';

// ── Obligation dedup ──
import { detectObligationDuplicates } from '$lib/utils/obligationDedup';

// ── Obligation types ──
import { createEmptyObligationEntry } from '$lib/types/obligation';

// ── System config ──
import { ENRICHER_CREDIT_LINE_FACTOR } from '$lib/ruleEngine/systemConfig';

// ============================================================================
// 1. EMI CALCULATION — Standard Indian loan formula
// ============================================================================

describe('EMI Calculation — Indian loan scenarios', () => {
	it('calculates EMI for a typical ₹50L home loan at 8.5% for 20 years', () => {
		// ₹50,00,000 principal, 8.5% annual rate, 240 months
		// Expected EMI ≈ ₹43,391 (standard formula)
		const emi = calculateEMI(5_000_000, 8.5, 240);
		expect(emi).toBeGreaterThan(43_000);
		expect(emi).toBeLessThan(44_000);
	});

	it('calculates EMI for a ₹10L personal loan at 14% for 5 years', () => {
		// Personal loans are typically high-rate, short-tenure
		const emi = calculateEMI(1_000_000, 14, 60);
		expect(emi).toBeGreaterThan(23_000);
		expect(emi).toBeLessThan(24_000);
	});

	it('calculates EMI for a ₹25L LAP at 10% for 15 years', () => {
		const emi = calculateEMI(2_500_000, 10, 180);
		expect(emi).toBeGreaterThan(26_000);
		expect(emi).toBeLessThan(27_500);
	});

	it('returns 0 for zero principal', () => {
		expect(calculateEMI(0, 8.5, 240)).toBe(0);
	});

	it('returns 0 for zero tenure', () => {
		expect(calculateEMI(5_000_000, 8.5, 0)).toBe(0);
	});

	it('returns 0 for negative principal', () => {
		expect(calculateEMI(-1_000_000, 8.5, 240)).toBe(0);
	});

	it('handles zero interest rate (interest-free EMI)', () => {
		// 0% interest = simple division: ₹12,00,000 / 12 months = ₹1,00,000
		const emi = calculateEMI(1_200_000, 0, 12);
		expect(emi).toBe(100_000);
	});

	it('higher rate → higher EMI for same principal and tenure', () => {
		const emiLow = calculateEMI(5_000_000, 8, 240);
		const emiHigh = calculateEMI(5_000_000, 10, 240);
		expect(emiHigh).toBeGreaterThan(emiLow);
	});

	it('shorter tenure → higher EMI for same principal and rate', () => {
		const emiLong = calculateEMI(5_000_000, 8.5, 240);
		const emiShort = calculateEMI(5_000_000, 8.5, 120);
		expect(emiShort).toBeGreaterThan(emiLong);
	});
});

// ============================================================================
// 2. FOIR-ELIGIBLE AMOUNT — How obligations reduce eligibility
// ============================================================================

describe('FOIR-Eligible Amount — obligation impact on eligibility', () => {
	it('no obligations → full FOIR headroom available', () => {
		// Income ₹1,00,000/month, FOIR 50%, no obligations, 8.5%, 20 years
		// Max EMI = ₹50,000
		const eligible = calculateFoirEligibleAmount(100_000, 0.5, 0, 8.5, 240);
		// Reverse-calculated principal from ₹50K EMI should be ~₹57.6L
		expect(eligible).toBeGreaterThan(5_500_000);
		expect(eligible).toBeLessThan(6_000_000);
	});

	it('existing ₹20K obligation reduces eligible amount', () => {
		// Income ₹1L, FOIR 50%, ₹20K obligation → max new EMI = ₹30K
		const withoutObl = calculateFoirEligibleAmount(100_000, 0.5, 0, 8.5, 240);
		const withObl = calculateFoirEligibleAmount(100_000, 0.5, 20_000, 8.5, 240);

		// With ₹20K obligation, eligible amount should be ~60% of without
		expect(withObl).toBeLessThan(withoutObl);
		expect(withObl).toBeGreaterThan(0);

		// Rough check: ₹30K EMI → ~₹34.5L eligible
		expect(withObl).toBeGreaterThan(3_000_000);
		expect(withObl).toBeLessThan(3_800_000);
	});

	it('obligations exceeding FOIR cap → zero eligibility', () => {
		// Income ₹1L, FOIR 50% (cap = ₹50K), obligations = ₹55K → negative headroom
		const eligible = calculateFoirEligibleAmount(100_000, 0.5, 55_000, 8.5, 240);
		expect(eligible).toBe(0);
	});

	it('obligations exactly at FOIR cap → zero eligibility', () => {
		// Income ₹1L, FOIR 50% (cap = ₹50K), obligations = ₹50K → zero headroom
		const eligible = calculateFoirEligibleAmount(100_000, 0.5, 50_000, 8.5, 240);
		expect(eligible).toBe(0);
	});

	it('zero income → zero eligibility regardless of obligations', () => {
		const eligible = calculateFoirEligibleAmount(0, 0.5, 0, 8.5, 240);
		expect(eligible).toBe(0);
	});

	it('higher FOIR limit → more eligibility at same obligations', () => {
		// Banks with 60% FOIR allow more borrowing than 40% FOIR
		const foir40 = calculateFoirEligibleAmount(100_000, 0.4, 10_000, 8.5, 240);
		const foir60 = calculateFoirEligibleAmount(100_000, 0.6, 10_000, 8.5, 240);
		expect(foir60).toBeGreaterThan(foir40);
	});
});

// ============================================================================
// 3. CREDIT LINE FOIR TREATMENT
// ============================================================================

describe('Credit Line FOIR Treatment — OD/CC obligations in FOIR', () => {
	it('credit line limit of ₹10L at 5% factor → ₹50K counted in FOIR', () => {
		// Banks count 5% of credit line limit as monthly obligation
		// ₹10L OD at 5% = ₹50,000/month FOIR burden
		// With ₹1L income, 50% FOIR, ₹50K already consumed → 0 headroom
		const eligible = calculateCreditLineFoirEligibleLimit(100_000, 0.5, 0, 0.05);
		// Max limit = (₹1L * 0.5) / 0.05 = ₹10L
		expect(eligible).toBe(1_000_000);
	});

	it('existing obligations reduce credit line eligibility', () => {
		// ₹1L income, 50% FOIR, ₹20K existing obligations, 5% factor
		// Headroom = ₹50K - ₹20K = ₹30K
		// Max credit line = ₹30K / 0.05 = ₹6L
		const eligible = calculateCreditLineFoirEligibleLimit(100_000, 0.5, 20_000, 0.05);
		expect(eligible).toBe(600_000);
	});

	it('zero income → zero credit line eligibility', () => {
		const eligible = calculateCreditLineFoirEligibleLimit(0, 0.5, 0, 0.05);
		expect(eligible).toBe(0);
	});

	it('zero factor → zero eligibility (division protection)', () => {
		const eligible = calculateCreditLineFoirEligibleLimit(100_000, 0.5, 0, 0);
		expect(eligible).toBe(0);
	});

	it('ENRICHER_CREDIT_LINE_FACTOR is 5% (0.05)', () => {
		// Verify the system constant matches expectations
		expect(ENRICHER_CREDIT_LINE_FACTOR).toBe(0.05);
	});
});

// ============================================================================
// 4. EMI SHARE COMPUTATION — Multi-borrower obligation splitting
// ============================================================================

describe('EMI Share Computation — borrower count parsing', () => {
	it('parses "1" → 1', () => expect(parseBorrowerCount('1')).toBe(1));
	it('parses "2" → 2', () => expect(parseBorrowerCount('2')).toBe(2));
	it('parses "3" → 3', () => expect(parseBorrowerCount('3')).toBe(3));
	it('parses "4+" → 4', () => expect(parseBorrowerCount('4+')).toBe(4));
	it('empty string → 1 (default)', () => expect(parseBorrowerCount('')).toBe(1));
	it('undefined → 1', () => expect(parseBorrowerCount(undefined)).toBe(1));
	it('null → 1', () => expect(parseBorrowerCount(null)).toBe(1));
	it('"0" → 1 (invalid count floors to 1)', () => expect(parseBorrowerCount('0')).toBe(1));
	it('"-1" → 1 (negative floors to 1)', () => expect(parseBorrowerCount('-1')).toBe(1));
	it('"abc" → 1 (non-numeric)', () => expect(parseBorrowerCount('abc')).toBe(1));
});

describe('EMI Share Computation — term loan share calculation', () => {
	it('single borrower gets full EMI burden', () => {
		const share = computeApplicantEmiShare({
			emi: '45000',
			borrowerCount: '1',
			obligationType: 'term_loan'
		});
		expect(share).toBe(45_000);
	});

	it('two borrowers split EMI equally', () => {
		// ₹45K EMI / 2 borrowers = ₹22,500 each
		const share = computeApplicantEmiShare({
			emi: '45000',
			borrowerCount: '2',
			obligationType: 'term_loan'
		});
		expect(share).toBe(22_500);
	});

	it('three borrowers split EMI equally (rounded)', () => {
		// ₹50K EMI / 3 borrowers = ₹16,667 (rounded)
		const share = computeApplicantEmiShare({
			emi: '50000',
			borrowerCount: '3',
			obligationType: 'term_loan'
		});
		expect(share).toBe(16_667);
	});

	it('guarantor gets zero burden (legacy role path)', () => {
		// Guarantors are not liable for EMI (unless there is a default)
		const share = computeApplicantEmiShare({
			emi: '45000',
			borrowerCount: '1',
			role: 'Guarantor',
			obligationType: 'term_loan'
		});
		expect(share).toBe(0);
	});

	it('Name Lender gets zero burden (legacy role path)', () => {
		const share = computeApplicantEmiShare({
			emi: '45000',
			borrowerCount: '1',
			role: 'Name Lender',
			obligationType: 'term_loan'
		});
		expect(share).toBe(0);
	});

	it('non-financial co-applicant classification → zero burden', () => {
		// 4-way classification takes precedence over legacy role
		const share = computeApplicantEmiShare({
			emi: '45000',
			borrowerCount: '1',
			applicantClassification: 'co_applicant_non_financial',
			obligationType: 'term_loan'
		});
		expect(share).toBe(0);
	});

	it('non-financial guarantor classification → zero burden', () => {
		const share = computeApplicantEmiShare({
			emi: '45000',
			borrowerCount: '1',
			applicantClassification: 'guarantor_non_financial',
			obligationType: 'term_loan'
		});
		expect(share).toBe(0);
	});

	it('financial co-applicant classification → normal share', () => {
		// co_applicant_financial should get normal share calculation
		const share = computeApplicantEmiShare({
			emi: '45000',
			borrowerCount: '2',
			applicantClassification: 'co_applicant_financial',
			obligationType: 'term_loan'
		});
		expect(share).toBe(22_500);
	});

	it('financial guarantor classification → normal share', () => {
		// guarantor_financial carries obligations for independent assessment
		const share = computeApplicantEmiShare({
			emi: '45000',
			borrowerCount: '2',
			applicantClassification: 'guarantor_financial',
			obligationType: 'term_loan'
		});
		expect(share).toBe(22_500);
	});

	it('emiMethod "Full from co-borrower" → zero burden', () => {
		const share = computeApplicantEmiShare({
			emi: '45000',
			borrowerCount: '1',
			emiMethod: 'Full from co-borrower',
			obligationType: 'term_loan'
		});
		expect(share).toBe(0);
	});

	it('emiPaidBy "spouse" → zero burden', () => {
		// If someone else pays the EMI, this applicant has no FOIR burden
		const share = computeApplicantEmiShare({
			emi: '45000',
			borrowerCount: '1',
			emiPaidBy: 'spouse',
			obligationType: 'term_loan'
		});
		expect(share).toBe(0);
	});

	it('emiPaidBy "self" → normal share calculation', () => {
		const share = computeApplicantEmiShare({
			emi: '45000',
			borrowerCount: '2',
			emiPaidBy: 'self',
			obligationType: 'term_loan'
		});
		expect(share).toBe(22_500);
	});

	it('emiPaidBy "business_account" → zero burden', () => {
		const share = computeApplicantEmiShare({
			emi: '45000',
			borrowerCount: '1',
			emiPaidBy: 'business_account',
			obligationType: 'term_loan'
		});
		expect(share).toBe(0);
	});

	it('proof override with valid monthlyShare → uses override value', () => {
		// When bank statement proof shows ₹30K actual payment (not the ₹25K equal split)
		const share = computeApplicantEmiShare({
			emi: '50000',
			borrowerCount: '2',
			hasProofOverride: true,
			monthlyShare: '30000',
			obligationType: 'term_loan'
		});
		expect(share).toBe(30_000);
	});

	it('proof override with empty monthlyShare → fallback to equal split', () => {
		const share = computeApplicantEmiShare({
			emi: '50000',
			borrowerCount: '2',
			hasProofOverride: true,
			monthlyShare: '',
			obligationType: 'term_loan'
		});
		expect(share).toBe(25_000);
	});

	it('proof override with formatted monthlyShare (commas) → parses correctly', () => {
		// Users may type "30,000" with comma separator
		const share = computeApplicantEmiShare({
			emi: '50000',
			borrowerCount: '2',
			hasProofOverride: true,
			monthlyShare: '30,000',
			obligationType: 'term_loan'
		});
		expect(share).toBe(30_000);
	});

	it('zero EMI → zero share regardless of borrower count', () => {
		const share = computeApplicantEmiShare({
			emi: '0',
			borrowerCount: '2',
			obligationType: 'term_loan'
		});
		expect(share).toBe(0);
	});

	it('missing borrowerCount → defaults to 1 (full amount)', () => {
		const share = computeApplicantEmiShare({
			emi: '45000',
			obligationType: 'term_loan'
		});
		expect(share).toBe(45_000);
	});
});

describe('EMI Share Computation — credit line share calculation', () => {
	it('credit line uses totalLimit instead of EMI', () => {
		// CC with ₹5L limit, single holder → ₹5L share
		const share = computeApplicantEmiShare({
			totalLimit: '500000',
			borrowerCount: '1',
			obligationType: 'credit_line'
		});
		expect(share).toBe(500_000);
	});

	it('credit line split between 2 holders', () => {
		// OD with ₹10L limit, 2 borrowers → ₹5L each
		const share = computeApplicantEmiShare({
			totalLimit: '1000000',
			borrowerCount: '2',
			obligationType: 'credit_line'
		});
		expect(share).toBe(500_000);
	});

	it('credit line guarantor → zero share', () => {
		const share = computeApplicantEmiShare({
			totalLimit: '500000',
			borrowerCount: '1',
			role: 'Guarantor',
			obligationType: 'credit_line'
		});
		expect(share).toBe(0);
	});
});

// ============================================================================
// 5. OBLIGATION PAYLOAD CLEANING
// ============================================================================

describe('Obligation Payload Cleaning — cleanObligationEntries', () => {
	it('cleans a valid term loan entry', () => {
		const cleaned = cleanObligationEntries({
			obligations: [
				{
					id: 'obl-1',
					loanType: 'Home Loan',
					bankName: 'HDFC Bank',
					selectedToClose: 'Keep running',
					emi: 45000,
					totalLimit: 0,
					tenure: '240',
					interestRate: '8.5'
				}
			]
		});

		expect(cleaned).toHaveLength(1);
		expect(cleaned[0].loanType).toBe('Home Loan');
		expect(cleaned[0].bankName).toBe('HDFC Bank');
		expect(cleaned[0].obligationType).toBe('term_loan');
		expect(cleaned[0].emi).toBe('45000');
	});

	it('derives credit_line type for OD Limit', () => {
		const cleaned = cleanObligationEntries({
			obligations: [
				{
					loanType: 'OD Limit',
					bankName: 'SBI',
					totalLimit: 1000000,
					selectedToClose: 'Keep running'
				}
			]
		});

		expect(cleaned).toHaveLength(1);
		expect(cleaned[0].obligationType).toBe('credit_line');
	});

	it('derives credit_line type for CC Limit', () => {
		const cleaned = cleanObligationEntries({
			obligations: [
				{
					loanType: 'CC Limit',
					bankName: 'Kotak',
					totalLimit: 500000,
					selectedToClose: 'Keep running'
				}
			]
		});

		expect(cleaned[0].obligationType).toBe('credit_line');
	});

	it('derives credit_line type for Dropline OD', () => {
		const cleaned = cleanObligationEntries({
			obligations: [
				{
					loanType: 'Dropline OD',
					bankName: 'Axis Bank',
					totalLimit: 2000000,
					selectedToClose: 'Keep running'
				}
			]
		});

		expect(cleaned[0].obligationType).toBe('credit_line');
	});

	it('CREDIT_LINE_TYPES set contains correct loan types', () => {
		expect(CREDIT_LINE_TYPES.has('CC Limit')).toBe(true);
		expect(CREDIT_LINE_TYPES.has('OD Limit')).toBe(true);
		expect(CREDIT_LINE_TYPES.has('Dropline OD')).toBe(true);
		expect(CREDIT_LINE_TYPES.has('Home Loan')).toBe(false);
		expect(CREDIT_LINE_TYPES.has('Personal Loan')).toBe(false);
	});

	it('filters out entries without loanType', () => {
		const cleaned = cleanObligationEntries({
			obligations: [
				{ loanType: 'Home Loan', bankName: 'SBI', emi: 30000 },
				{ bankName: 'ICICI' }, // missing loanType — should be filtered
				{ loanType: '', bankName: 'Axis' } // empty loanType — should be filtered
			]
		});

		expect(cleaned).toHaveLength(1);
		expect(cleaned[0].bankName).toBe('SBI');
	});

	it('handles legacy split arrays (tableLoanEntries + tableLimitEntries)', () => {
		const cleaned = cleanObligationEntries({
			tableLoanEntries: [{ loanType: 'Home Loan', bankName: 'SBI', emi: 30000 }],
			tableLimitEntries: [{ loanType: 'CC Limit', bankName: 'ICICI', totalLimit: 200000 }]
		});

		expect(cleaned).toHaveLength(2);
		expect(cleaned[0].loanType).toBe('Home Loan');
		expect(cleaned[1].loanType).toBe('CC Limit');
	});

	it('prefers unified obligations array over legacy split arrays', () => {
		// If both are present, only the unified array is used
		const cleaned = cleanObligationEntries({
			obligations: [{ loanType: 'Personal Loan', bankName: 'Axis', emi: 15000 }],
			tableLoanEntries: [{ loanType: 'Home Loan', bankName: 'SBI', emi: 30000 }]
		});

		// Only the unified obligations entry should be present
		expect(cleaned).toHaveLength(1);
		expect(cleaned[0].loanType).toBe('Personal Loan');
	});

	it('returns empty array for applicant with no obligations', () => {
		const cleaned = cleanObligationEntries({});
		expect(cleaned).toHaveLength(0);
	});

	it('preserves optional fields when present', () => {
		const cleaned = cleanObligationEntries({
			obligations: [
				{
					loanType: 'Home Loan',
					bankName: 'HDFC',
					emi: 45000,
					role: 'co_applicant',
					borrowerCount: '2',
					hasProofOverride: true,
					monthlyShare: '30000',
					emiPaidBy: 'self',
					applicantEmiShare: 30000,
					ownershipPercent: 50
				}
			]
		});

		expect(cleaned).toHaveLength(1);
		expect(cleaned[0].role).toBe('co_applicant');
		// borrowerCount is now emitted as a number (integer) for lender API compatibility.
		expect(cleaned[0].borrowerCount).toBe(2);
		expect((cleaned[0] as any).hasProofOverride).toBe(true);
		expect((cleaned[0] as any).monthlyShare).toBe('30000');
		expect(cleaned[0].applicantEmiShare).toBe(30000);
		expect(cleaned[0].ownershipPercent).toBe(50);
	});

	it('generates ID when missing from entry', () => {
		const cleaned = cleanObligationEntries({
			obligations: [{ loanType: 'Personal Loan', bankName: 'SBI', emi: 20000 }]
		});

		// Should have a generated ID (non-empty string)
		expect(cleaned[0].id).toBeTruthy();
		expect(typeof cleaned[0].id).toBe('string');
	});
});

// ============================================================================
// 6. OBLIGATION COMPLETION CHECKS — incomeTabState
// ============================================================================

describe('Obligation Completion — Individual applicant', () => {
	// Helper: minimal applicant with required fields for computeSectionCompletion
	function makeIndividual(overrides: Record<string, unknown> = {}): Record<string, unknown> {
		return {
			applicantType: 'Individual',
			fullName: 'Test Person',
			gender: 'Male',
			age: 35,
			maritalStatus: 'Married',
			selectedIncomeProfiles: ['salaried_regular'],
			incomeEntries: [
				{
					profileType: 'salaried_regular',
					income: { grossMonthlySalary: 100000 }
				}
			],
			creditScore: 750,
			creditFactors: 'no_issues',
			...overrides
		};
	}

	it('ObligationsRunning = "No" + isGuarantor = "No" → obligations tab complete', () => {
		const applicant = makeIndividual({ ObligationsRunning: 'No', isGuarantorOnOtherLoan: 'No' });
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(true);
	});

	it('ObligationsRunning = "No" but guarantor question unanswered → incomplete', () => {
		const applicant = makeIndividual({ ObligationsRunning: 'No' });
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(false);
	});

	it('ObligationsRunning = "No" + guarantor = "Yes" but no guarantor-role entry → incomplete', () => {
		const applicant = makeIndividual({
			ObligationsRunning: 'No',
			isGuarantorOnOtherLoan: 'Yes',
			obligations: [{ loanType: 'Personal Loan', bankName: 'SBI', role: 'co_borrower' }]
		});
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(false);
	});

	it('ObligationsRunning = "No" + guarantor = "Yes" with guarantor-role entry → complete', () => {
		const applicant = makeIndividual({
			ObligationsRunning: 'No',
			isGuarantorOnOtherLoan: 'Yes',
			obligations: [{ loanType: 'Personal Loan', bankName: 'SBI', role: 'guarantor' }]
		});
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(true);
	});

	it('ObligationsRunning = "Yes" + guarantor = "Yes" but no guarantor-role entry → incomplete', () => {
		const applicant = makeIndividual({
			ObligationsRunning: 'Yes',
			isGuarantorOnOtherLoan: 'Yes',
			obligations: [{ loanType: 'Home Loan', bankName: 'SBI', emi: '30000', role: 'co_borrower' }]
		});
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(false);
	});

	it('ObligationsRunning = "Yes" + guarantor = "Yes" with guarantor-role entry → complete', () => {
		const applicant = makeIndividual({
			ObligationsRunning: 'Yes',
			isGuarantorOnOtherLoan: 'Yes',
			obligations: [
				{ loanType: 'Home Loan', bankName: 'SBI', emi: '30000', role: 'co_borrower' },
				{ loanType: 'Car Loan', bankName: 'HDFC', emi: '15000', role: 'guarantor' }
			]
		});
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(true);
	});

	it('ObligationsRunning = "Yes" with entries → complete', () => {
		const applicant = makeIndividual({
			ObligationsRunning: 'Yes',
			obligations: [{ loanType: 'Home Loan', bankName: 'SBI', emi: '30000' }]
		});
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(true);
	});

	it('ObligationsRunning = "Yes" without entries → incomplete', () => {
		const applicant = makeIndividual({
			ObligationsRunning: 'Yes',
			obligations: []
		});
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(false);
	});

	it('ObligationsRunning not answered → incomplete', () => {
		const applicant = makeIndividual({});
		// ObligationsRunning is undefined
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(false);
	});

	it('ObligationsRunning = "Yes" with legacy tableLoanEntries → complete', () => {
		const applicant = makeIndividual({
			ObligationsRunning: 'Yes',
			tableLoanEntries: [{ loanType: 'Personal Loan', bankName: 'ICICI', emi: '20000' }]
		});
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(true);
	});

	it('ObligationsRunning = "Yes" with legacy tableLimitEntries → complete', () => {
		const applicant = makeIndividual({
			ObligationsRunning: 'Yes',
			tableLimitEntries: [{ loanType: 'CC Limit', bankName: 'Kotak', totalLimit: '500000' }]
		});
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(true);
	});

	it('Debt Consolidation variant requires closure plan entry', () => {
		// DC route: must have at least one entry with "Will be closed by Top-up amount"
		const applicant = makeIndividual({
			ObligationsRunning: 'Yes',
			obligations: [
				{
					loanType: 'Personal Loan',
					bankName: 'HDFC',
					emi: '20000',
					selectedToClose: 'Keep running' // NOT closing by new loan
				}
			]
		});
		const result = computeSectionCompletion(applicant, {
			loanScope: 'Debt Consolidation'
		});
		expect(result.obligations_details).toBe(false);
	});

	it('Debt Consolidation variant with correct closure plan → complete', () => {
		const applicant = makeIndividual({
			ObligationsRunning: 'Yes',
			obligations: [
				{
					loanType: 'Personal Loan',
					bankName: 'HDFC',
					emi: '20000',
					selectedToClose: 'Will be closed by Top-up amount'
				}
			]
		});
		const result = computeSectionCompletion(applicant, {
			loanScope: 'Debt Consolidation'
		});
		expect(result.obligations_details).toBe(true);
	});

	it('Non-earner with obligations must have emiPaidBy on every entry', () => {
		// No-income applicant declaring obligations: must specify who pays each EMI
		const applicant = makeIndividual({
			selectedIncomeProfiles: ['no_current_income'],
			incomeEntries: [],
			ObligationsRunning: 'Yes',
			obligations: [
				{
					loanType: 'Home Loan',
					bankName: 'SBI',
					emi: '30000'
					// emiPaidBy NOT set — should be incomplete
				}
			]
		});
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(false);
	});

	it('Non-earner with obligations and emiPaidBy set → complete', () => {
		const applicant = makeIndividual({
			selectedIncomeProfiles: ['no_current_income'],
			incomeEntries: [],
			ObligationsRunning: 'Yes',
			obligations: [
				{
					loanType: 'Home Loan',
					bankName: 'SBI',
					emi: '30000',
					emiPaidBy: 'spouse'
				}
			]
		});
		const result = computeSectionCompletion(applicant);
		expect(result.obligations_details).toBe(true);
	});

	it('skippable applicant → all tabs auto-complete', () => {
		// Minor non-family directors in large companies are skippable
		const applicant = makeIndividual({});
		const result = computeSectionCompletion(applicant, { skippable: true });
		expect(result.obligations_details).toBe(true);
		expect(result.profile).toBe(true);
		expect(result.credit_score).toBe(true);
	});
});

describe('Obligation Completion — Company applicant', () => {
	it('ObligationsRunning = "No" → complete', () => {
		const company: Record<string, unknown> = {
			applicantType: 'Company',
			companyName: 'ABC Pvt Ltd',
			businessCategory: 'Manufacturing',
			constitution: 'Private Limited',
			dateOfIncorporation: '2015-01-01',
			businessNature: 'Electronics',
			isGST: 'Yes',
			businessPremises: 'Owned',
			teamSize: '20',
			creditScore: 700,
			creditFactors: 'no_issues',
			ObligationsRunning: 'No'
		};
		const result = computeCompanyCompletion(company);
		expect(result.obligations_details).toBe(true);
	});

	it('ObligationsRunning = "Yes" with entries → complete', () => {
		const company: Record<string, unknown> = {
			applicantType: 'Company',
			companyName: 'ABC Pvt Ltd',
			businessCategory: 'Manufacturing',
			constitution: 'Private Limited',
			dateOfIncorporation: '2015-01-01',
			businessNature: 'Electronics',
			isGST: 'Yes',
			businessPremises: 'Owned',
			teamSize: '20',
			creditScore: 700,
			creditFactors: 'no_issues',
			ObligationsRunning: 'Yes',
			obligations: [{ loanType: 'Business Loan - Unsecured', bankName: 'ICICI', emi: '80000' }]
		};
		const result = computeCompanyCompletion(company);
		expect(result.obligations_details).toBe(true);
	});

	it('ObligationsRunning not answered → incomplete', () => {
		const company: Record<string, unknown> = {
			applicantType: 'Company',
			companyName: 'ABC Pvt Ltd'
		};
		const result = computeCompanyCompletion(company);
		expect(result.obligations_details).toBe(false);
	});
});

// ============================================================================
// 7. OBLIGATION DEDUP — Extended edge cases
// ============================================================================

describe('Obligation Dedup — extended edge cases', () => {
	it('mixed obligation sources (loans + limits) on same person → warning', () => {
		// Person has a loan entry in one applicant slot and a credit card in another
		const applicants = [
			{
				applicantType: 'Individual',
				fullName: 'Meera Patel',
				tableLoanEntries: [{ lenderName: 'HDFC Bank' }]
			},
			{
				applicantType: 'Individual',
				fullName: 'Meera Patel',
				tableLimitEntries: [{ lenderName: 'HDFC Bank' }]
			}
		];
		const warnings = detectObligationDuplicates(applicants);
		expect(warnings).toHaveLength(1);
		expect(warnings[0].personName).toBe('Meera Patel');
	});

	it('legacy obligations array with bankName field → detected', () => {
		const applicants = [
			{
				applicantType: 'Individual',
				fullName: 'Rahul Sharma',
				obligations: [{ bankName: 'Axis Bank' }]
			},
			{
				applicantType: 'Individual',
				fullName: 'Rahul Sharma',
				tableLoanEntries: [{ lenderName: 'Axis Bank' }]
			}
		];
		const warnings = detectObligationDuplicates(applicants);
		expect(warnings).toHaveLength(1);
	});

	it('Company + Individual with same name → no warning (Company excluded)', () => {
		const applicants = [
			{
				applicantType: 'Company',
				fullName: 'Kumar Enterprises',
				tableLoanEntries: [{ lenderName: 'SBI' }]
			},
			{
				applicantType: 'Individual',
				fullName: 'Kumar Enterprises',
				tableLoanEntries: [{ lenderName: 'SBI' }]
			}
		];
		// Company applicants are excluded from dedup
		const warnings = detectObligationDuplicates(applicants);
		expect(warnings).toHaveLength(0);
	});

	it('multiple overlapping lenders for same person → one warning per lender', () => {
		const applicants = [
			{
				applicantType: 'Individual',
				fullName: 'Priya Singh',
				tableLoanEntries: [
					{ lenderName: 'HDFC Bank' },
					{ lenderName: 'ICICI Bank' },
					{ lenderName: 'SBI' }
				]
			},
			{
				applicantType: 'Individual',
				fullName: 'Priya Singh',
				tableLoanEntries: [{ lenderName: 'HDFC Bank' }, { lenderName: 'SBI' }]
			}
		];
		const warnings = detectObligationDuplicates(applicants);
		// Two lenders overlap: HDFC Bank and SBI
		expect(warnings).toHaveLength(2);
		const lenders = warnings.map((w) => w.lender).sort();
		expect(lenders).toEqual(['hdfc bank', 'sbi']);
	});

	it('person with empty fullName → no warning', () => {
		const applicants = [
			{
				applicantType: 'Individual',
				fullName: '',
				tableLoanEntries: [{ lenderName: 'SBI' }]
			},
			{
				applicantType: 'Individual',
				fullName: '',
				tableLoanEntries: [{ lenderName: 'SBI' }]
			}
		];
		const warnings = detectObligationDuplicates(applicants);
		// Empty names normalize to '' which is falsy → skipped
		expect(warnings).toHaveLength(0);
	});

	it('lender name normalization: case + whitespace → still detected', () => {
		const applicants = [
			{
				applicantType: 'Individual',
				fullName: 'Test User',
				tableLoanEntries: [{ lenderName: '  HDFC  Bank  ' }]
			},
			{
				applicantType: 'Individual',
				fullName: 'Test User',
				tableLoanEntries: [{ lenderName: 'hdfc bank' }]
			}
		];
		const warnings = detectObligationDuplicates(applicants);
		expect(warnings).toHaveLength(1);
	});
});

// ============================================================================
// 8. OBLIGATION OPTIONS & HELPERS
// ============================================================================

describe('Obligation Options — facility type derivation', () => {
	it('Home Loan → term_loan', () => {
		expect(deriveFacilityType('Home Loan')).toBe('term_loan');
	});

	it('Personal Loan → term_loan', () => {
		expect(deriveFacilityType('Personal Loan')).toBe('term_loan');
	});

	it('OD Limit → credit_line', () => {
		expect(deriveFacilityType('OD Limit')).toBe('credit_line');
	});

	it('CC Limit → credit_line', () => {
		expect(deriveFacilityType('CC Limit')).toBe('credit_line');
	});

	it('Dropline OD → dropline', () => {
		expect(deriveFacilityType('Dropline OD')).toBe('dropline');
	});

	it('unknown loan type → defaults to term_loan', () => {
		expect(deriveFacilityType('Unknown Loan')).toBe('term_loan');
	});
});

describe('Obligation Options — loan types for applicant type', () => {
	it('Individual cannot see company-only loan types', () => {
		const individualTypes = getLoanTypesForApplicant('Individual');
		const companyOnlyValues = individualTypes.filter((t) => t.companyOnly);
		expect(companyOnlyValues).toHaveLength(0);
	});

	it('Company cannot see individual-only loan types', () => {
		const companyTypes = getLoanTypesForApplicant('Company');
		const individualOnlyValues = companyTypes.filter((t) => t.individualOnly);
		expect(individualOnlyValues).toHaveLength(0);
	});

	it('Individual sees Personal Loan', () => {
		const types = getLoanTypesForApplicant('Individual');
		expect(types.some((t) => t.value === 'Personal Loan')).toBe(true);
	});

	it('Company does NOT see Personal Loan (individual-only)', () => {
		const types = getLoanTypesForApplicant('Company');
		expect(types.some((t) => t.value === 'Personal Loan')).toBe(false);
	});

	it('Company sees Business Loan - Secured (company-only)', () => {
		const types = getLoanTypesForApplicant('Company');
		expect(types.some((t) => t.value === 'Business Loan - Secured')).toBe(true);
	});

	it('Individual does NOT see Business Loan - Secured (company-only)', () => {
		const types = getLoanTypesForApplicant('Individual');
		expect(types.some((t) => t.value === 'Business Loan - Secured')).toBe(false);
	});

	it('both types see Home Loan (shared)', () => {
		const individual = getLoanTypesForApplicant('Individual');
		const company = getLoanTypesForApplicant('Company');
		expect(individual.some((t) => t.value === 'Home Loan')).toBe(true);
		expect(company.some((t) => t.value === 'Home Loan')).toBe(true);
	});
});

describe('Obligation Options — closure options filtering', () => {
	it('guarantor role → only "Not my liability"', () => {
		const options = getClosureOptionsFiltered('guarantor', 'Home Loan', 'New Loan');
		expect(options).toHaveLength(1);
		expect(options[0].value).toMatch(/^Not my/);
	});

	it('co-applicant on new loan → no "Close from top-up" option', () => {
		const options = getClosureOptionsFiltered('co_applicant', 'Home Loan', 'New Loan');
		const hasTopUp = options.some((o) => o.value.startsWith('Will be closed'));
		expect(hasTopUp).toBe(false);
	});

	it('co-applicant on BT+Top-up variant → "Close from top-up" available', () => {
		// PITFALL UPDATE (2026-05-28): canonical variant is exact-match
		// 'Balance Transfer With Top-up'. The legacy loose 'Balance Transfer'
		// substring no longer matches — BT-only ('Balance Transfer Only')
		// correctly excludes the option (no extra funds released).
		const options = getClosureOptionsFiltered(
			'co_applicant',
			'Home Loan',
			'Balance Transfer With Top-up'
		);
		const hasTopUp = options.some((o) => o.value.startsWith('Will be closed'));
		expect(hasTopUp).toBe(true);
	});

	it('co-applicant on BT-only variant → "Close from top-up" NOT available (no extra funds)', () => {
		const options = getClosureOptionsFiltered(
			'co_applicant',
			'Home Loan',
			'Balance Transfer Only'
		);
		const hasTopUp = options.some((o) => o.value.startsWith('Will be closed'));
		expect(hasTopUp).toBe(false);
	});

	it('co-applicant on DC variant → "Close from top-up" available, relabeled', () => {
		const options = getClosureOptionsFiltered('co_applicant', 'Home Loan', 'Debt Consolidation');
		const topUp = options.find((o) => o.value.startsWith('Will be closed'));
		expect(topUp).toBeDefined();
		expect(topUp!.label).toBe('Close by this new loan');
	});

	it('LAP always has closure option regardless of variant', () => {
		// LAP is commonly used to close existing loans
		const options = getClosureOptionsFiltered('co_applicant', 'Loan Against Property', 'New Loan');
		const hasTopUp = options.some((o) => o.value.startsWith('Will be closed'));
		expect(hasTopUp).toBe(true);
	});

	it('Insta Loan never has closure option even on DC variant', () => {
		// Lenders won't DC for insta loans
		const options = getClosureOptionsFiltered('co_applicant', 'Insta Loan', 'Debt Consolidation');
		const hasTopUp = options.some((o) => o.value.startsWith('Will be closed'));
		expect(hasTopUp).toBe(false);
	});
});

describe('Obligation Options — helper functions', () => {
	it('isInstaLoan returns true for Insta Loan', () => {
		expect(isInstaLoan('Insta Loan')).toBe(true);
	});

	it('isInstaLoan returns false for other loan types', () => {
		expect(isInstaLoan('Home Loan')).toBe(false);
		expect(isInstaLoan('Personal Loan')).toBe(false);
	});

	it('shortEvidence returns correct abbreviations', () => {
		expect(shortEvidence('sanction_and_statement')).toBe('SL+BS');
		expect(shortEvidence('statement_only')).toBe('BS');
		expect(shortEvidence('sanction_only')).toBe('SL');
		expect(shortEvidence('cibil_only')).toBe('CIBIL');
		expect(shortEvidence('no_documents')).toBe('No docs');
	});

	it('needsCapacityEntity: director/partner/proprietor need entity', () => {
		expect(needsCapacityEntity('as_director')).toBe(true);
		expect(needsCapacityEntity('as_partner')).toBe(true);
		expect(needsCapacityEntity('as_proprietor')).toBe(true);
	});

	it('needsCapacityEntity: individual does not need entity', () => {
		expect(needsCapacityEntity('individual')).toBe(false);
	});

	it('getFilteredCapacityOptions hides director option without director_company profile', () => {
		const options = getFilteredCapacityOptions(['salaried_regular']);
		expect(options.some((o) => o.value === 'as_director')).toBe(false);
		expect(options.some((o) => o.value === 'individual')).toBe(true);
	});

	it('getFilteredCapacityOptions shows director option with director_company profile', () => {
		const options = getFilteredCapacityOptions(['director_company']);
		expect(options.some((o) => o.value === 'as_director')).toBe(true);
	});
});

// ============================================================================
// 9. OBLIGATION TYPE FACTORY
// ============================================================================

describe('Obligation Type Factory — createEmptyObligationEntry', () => {
	it('creates entry with correct defaults', () => {
		const entry = createEmptyObligationEntry();
		expect(entry.id).toBe('');
		expect(entry.loanType).toBe('');
		expect(entry.bankName).toBe('');
		expect(entry.role).toBe('co_applicant');
		expect(entry.borrowerCount).toBe(1);
		expect(entry.emiResponsibility).toBe('full');
		expect((entry as any).hasProofOverride).toBe(false);
		expect(entry.evidence).toBe('no_documents');
		expect(entry.selectedToClose).toBe('Keep running');
	});

	it('includes timestamps', () => {
		const entry = createEmptyObligationEntry();
		expect(entry.createdAt).toBeDefined();
		expect(entry.updatedAt).toBeDefined();
		// Timestamps should be valid ISO strings
		expect(new Date(entry.createdAt!).toISOString()).toBe(entry.createdAt);
	});
});

// ============================================================================
// 10. OBLIGATION CLOSURE IMPACT ON RUNNING TOTAL
// ============================================================================

describe('Obligation Closure Impact — self-funded closure exclusion', () => {
	// The payloadEnricher extracts total obligations from applicants.
	// Obligations marked for closure should NOT count in running total
	// because the loan would be closed before disbursement.
	// This is validated through the EMI share + closure plan interaction.

	it('EMI share for running obligation → normal calculation', () => {
		const share = computeApplicantEmiShare({
			emi: '30000',
			borrowerCount: '1',
			obligationType: 'term_loan'
		});
		expect(share).toBe(30_000);
	});

	it('EMI share for Guarantor/Paper liability → zero (not counted)', () => {
		// "Not my actual liability" entries get role=Guarantor
		const share = computeApplicantEmiShare({
			emi: '30000',
			borrowerCount: '1',
			role: 'Guarantor',
			obligationType: 'term_loan'
		});
		expect(share).toBe(0);
	});
});

// ============================================================================
// 11. MULTI-APPLICANT OBLIGATION POOLING — FOIR calculation context
// ============================================================================

describe('Multi-Applicant Obligation Pooling — FOIR context', () => {
	// In DigitalDSA, obligations from ALL applicants are summed for FOIR.
	// Each applicant's share is computed independently, then totaled.

	it('two applicants with different obligations → combined burden', () => {
		// Applicant 1: ₹30K EMI (single borrower)
		const share1 = computeApplicantEmiShare({
			emi: '30000',
			borrowerCount: '1',
			obligationType: 'term_loan'
		});

		// Applicant 2: ₹20K EMI (shared with someone outside the application)
		const share2 = computeApplicantEmiShare({
			emi: '20000',
			borrowerCount: '2',
			obligationType: 'term_loan'
		});

		const totalObligation = share1 + share2;
		// ₹30K + ₹10K = ₹40K total FOIR burden
		expect(totalObligation).toBe(40_000);
	});

	it('husband-wife co-applicants with shared loan → split correctly', () => {
		// Same home loan (₹50K EMI) appears in both applicants' obligations
		// Each claims 2 borrowers → ₹25K each
		const husbandShare = computeApplicantEmiShare({
			emi: '50000',
			borrowerCount: '2',
			obligationType: 'term_loan'
		});

		const wifeShare = computeApplicantEmiShare({
			emi: '50000',
			borrowerCount: '2',
			obligationType: 'term_loan'
		});

		// Combined: ₹25K + ₹25K = ₹50K (the full EMI, not double-counted)
		expect(husbandShare + wifeShare).toBe(50_000);
	});

	it('one applicant earner, one non-earner with spouse-paid EMI', () => {
		// Non-earner marks emiPaidBy = "spouse" → zero burden
		const earnerShare = computeApplicantEmiShare({
			emi: '30000',
			borrowerCount: '1',
			emiPaidBy: 'self',
			obligationType: 'term_loan'
		});

		const nonEarnerShare = computeApplicantEmiShare({
			emi: '30000',
			borrowerCount: '1',
			emiPaidBy: 'spouse',
			obligationType: 'term_loan'
		});

		// Only the earner's burden counts
		expect(earnerShare).toBe(30_000);
		expect(nonEarnerShare).toBe(0);
	});

	it('mixed term loan + credit line obligations pooled correctly', () => {
		// Term loan: ₹40K EMI, split between 2
		const termLoanShare = computeApplicantEmiShare({
			emi: '40000',
			borrowerCount: '2',
			obligationType: 'term_loan'
		});

		// Credit line: ₹8L limit, single holder
		const creditLineShare = computeApplicantEmiShare({
			totalLimit: '800000',
			borrowerCount: '1',
			obligationType: 'credit_line'
		});

		// Term loan share: ₹20K
		expect(termLoanShare).toBe(20_000);
		// Credit line share: ₹8L (the limit share — factor applied later by enricher)
		expect(creditLineShare).toBe(800_000);

		// In FOIR, the enricher applies 5% factor to credit line:
		// ₹20K + (₹8L × 0.05) = ₹20K + ₹40K = ₹60K total obligation
		const totalForFoir = termLoanShare + creditLineShare * ENRICHER_CREDIT_LINE_FACTOR;
		expect(totalForFoir).toBe(60_000);
	});
});

// ============================================================================
// 12. OBLIGATION DATA VALIDATION EDGE CASES
// ============================================================================

describe('Obligation Data Validation — edge cases', () => {
	it('NaN EMI string → NaN share (parseFloat passthrough)', () => {
		// NOTE: The function does not guard against non-numeric strings that are truthy.
		// parseFloat('not-a-number') returns NaN, and NaN <= 0 is false,
		// so it falls through to the raw amount return. Consumers should
		// validate input before calling computeApplicantEmiShare.
		const share = computeApplicantEmiShare({
			emi: 'not-a-number',
			borrowerCount: '1',
			obligationType: 'term_loan'
		});
		expect(share).toBeNaN();
	});

	it('empty EMI string → 0 share', () => {
		const share = computeApplicantEmiShare({
			emi: '',
			borrowerCount: '1',
			obligationType: 'term_loan'
		});
		expect(share).toBe(0);
	});

	it('negative EMI → 0 share (no negative burden)', () => {
		const share = computeApplicantEmiShare({
			emi: '-5000',
			borrowerCount: '1',
			obligationType: 'term_loan'
		});
		expect(share).toBe(0);
	});

	it('very large EMI (₹10L/month) → computes correctly', () => {
		// Large corporate loans can have very high EMIs
		const share = computeApplicantEmiShare({
			emi: '1000000',
			borrowerCount: '2',
			obligationType: 'term_loan'
		});
		expect(share).toBe(500_000);
	});

	it('credit line with zero totalLimit → 0 share', () => {
		const share = computeApplicantEmiShare({
			totalLimit: '0',
			borrowerCount: '1',
			obligationType: 'credit_line'
		});
		expect(share).toBe(0);
	});

	it('credit line with missing totalLimit → 0 share', () => {
		const share = computeApplicantEmiShare({
			borrowerCount: '1',
			obligationType: 'credit_line'
		});
		expect(share).toBe(0);
	});

	it('term loan ignores totalLimit, uses emi', () => {
		// For term loans, only the emi field matters
		const share = computeApplicantEmiShare({
			emi: '25000',
			totalLimit: '1000000', // should be ignored
			borrowerCount: '1',
			obligationType: 'term_loan'
		});
		expect(share).toBe(25_000);
	});

	it('credit line ignores emi, uses totalLimit', () => {
		const share = computeApplicantEmiShare({
			emi: '25000', // should be ignored
			totalLimit: '500000',
			borrowerCount: '1',
			obligationType: 'credit_line'
		});
		expect(share).toBe(500_000);
	});
});

// ============================================================================
// 13. REALISTIC SCENARIO — Full obligation lifecycle
// ============================================================================

describe('Realistic Scenario — DSA filing a home loan case', () => {
	it('salaried couple with existing car loan and credit card', () => {
		// Husband: ₹1.2L/month salary, car loan ₹18K EMI (shared with wife)
		// Wife: ₹80K/month salary, credit card ₹3L limit (single holder)
		// Applying for ₹60L home loan at 8.5%, 20 years

		// Step 1: Calculate each obligation share
		const husbandCarLoanShare = computeApplicantEmiShare({
			emi: '18000',
			borrowerCount: '2',
			emiPaidBy: 'self',
			obligationType: 'term_loan'
		});
		expect(husbandCarLoanShare).toBe(9_000);

		const wifeCarLoanShare = computeApplicantEmiShare({
			emi: '18000',
			borrowerCount: '2',
			emiPaidBy: 'self',
			obligationType: 'term_loan'
		});
		expect(wifeCarLoanShare).toBe(9_000);

		const wifeCreditCardShare = computeApplicantEmiShare({
			totalLimit: '300000',
			borrowerCount: '1',
			obligationType: 'credit_line'
		});
		expect(wifeCreditCardShare).toBe(300_000);

		// Step 2: Total obligation for FOIR
		// Term loans: husband ₹9K + wife ₹9K = ₹18K
		// Credit line: ₹3L × 5% = ₹15K
		const totalObligation =
			husbandCarLoanShare + wifeCarLoanShare + wifeCreditCardShare * ENRICHER_CREDIT_LINE_FACTOR;
		expect(totalObligation).toBe(33_000);

		// Step 3: Combined income = ₹2L/month
		const combinedIncome = 120_000 + 80_000;

		// Step 4: FOIR-eligible amount with 50% cap
		const eligible = calculateFoirEligibleAmount(combinedIncome, 0.5, totalObligation, 8.5, 240);

		// Max new EMI = ₹2L × 0.5 - ₹33K = ₹67K
		// Reverse-calculate principal from ₹67K EMI at 8.5%, 20yr
		expect(eligible).toBeGreaterThan(7_000_000);
		expect(eligible).toBeLessThan(8_000_000);
		// Couple can afford ~₹77L home loan — enough for ₹60L application
	});

	it('self-employed with high existing obligations hitting FOIR wall', () => {
		// Self-employed: ₹3L/month assessed income
		// Existing: ₹1.2L/month in term loan EMIs + ₹10L OD limit
		// FOIR cap: 65% for self-employed

		const termLoanBurden = 120_000; // Already computed shares
		const creditLineBurden = 1_000_000 * ENRICHER_CREDIT_LINE_FACTOR; // ₹10L × 5% = ₹50K
		const totalObligation = termLoanBurden + creditLineBurden;

		expect(totalObligation).toBe(170_000);

		// Max EMI capacity = ₹3L × 0.65 = ₹1.95L
		// Available for new loan = ₹1.95L - ₹1.7L = ₹25K
		const eligible = calculateFoirEligibleAmount(300_000, 0.65, totalObligation, 9, 180);

		// ₹25K EMI at 9%, 15yr → ~₹23.9L eligible
		expect(eligible).toBeGreaterThan(2_000_000);
		expect(eligible).toBeLessThan(3_000_000);
	});
});
