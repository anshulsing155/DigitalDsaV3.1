/**
 * Obligation Capture — Comprehensive logic & integration tests
 * ══════════════════════════════════════════════════════════════
 * Tests the obligation options, completion logic, EMI validation,
 * entry building, multi-applicant scenarios, and per-loan-type limits.
 *
 * These complement the existing 126 tests in obligationLogic.test.ts
 * which cover EMI calculation, FOIR, share computation, payload
 * cleaning, and basic completion. These tests focus on untested gaps.
 * ══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
	getLoanTypesForApplicant,
	deriveFacilityType,
	isInstaLoan,
	getClosureOptionsFiltered,
	LOAN_TYPE_OPTIONS,
	CLOSURE_OPTIONS,
	ROLE_OPTIONS,
	EVIDENCE_OPTIONS,
	EMI_PAID_BY_OPTIONS
} from '$lib/config/obligationOptions';
import { computeSectionCompletion } from '$lib/utils/incomeTabState';
import { computeCompanyCompletion } from '$lib/utils/incomeTabState';
import { calculateEMI } from '$lib/ruleEngine/emiCalculator';
import { cleanObligationEntries } from '$lib/utils/payloadBuilder/obligationPayload';
import { detectObligationDuplicates } from '$lib/utils/obligationDedup';
import { parseBorrowerCount } from '$lib/utils/emiShareCalculator';

// ── Helpers ───────────────────────────────────────────────────────

function makeIndividualApplicant(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		applicantType: 'Individual',
		fullName: 'Test Applicant',
		selectedIncomeProfiles: ['salaried'],
		incomeEntries: [],
		ObligationsRunning: 'No',
		isGuarantorOnOtherLoan: 'No',
		obligations: [],
		creditScore: 750,
		creditFactorsAnswered: true,
		...overrides
	};
}

function makeCompanyApplicant(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		applicantType: 'Company',
		fullName: 'Test Corp',
		ObligationsRunning: 'No',
		obligations: [],
		creditScore: 750,
		creditFactorsAnswered: true,
		...overrides
	};
}

function makeTermLoanEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		id: 'test-entry-1',
		loanType: 'Home Loan',
		bankName: 'SBI',
		emi: '45000',
		tenure: '240',
		interestRate: '8.5',
		principalOutstanding: '4500000',
		role: 'co_applicant',
		borrowerCount: '1',
		evidence: 'sanction_and_statement',
		selectedToClose: 'Keep running',
		emiPaidBy: 'self',
		emiDelayHistory: 'none',
		...overrides
	};
}

function makeCreditLineEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		id: 'test-entry-2',
		loanType: 'OD Limit',
		bankName: 'HDFC',
		sanctionedLimit: '1000000',
		utilizedAmount: '500000',
		role: 'co_applicant',
		borrowerCount: '1',
		evidence: 'statement_only',
		selectedToClose: 'Keep running',
		...overrides
	};
}

// ============================================================================
// 1. OBLIGATION OPTIONS FILTERING
// ============================================================================

describe('Obligation Options Filtering', () => {
	describe('getLoanTypesForApplicant', () => {
		it('Individual: excludes Company-only types (Business Secured, Machinery, CC Limit)', () => {
			const options = getLoanTypesForApplicant('Individual');
			const values = options.map((o) => o.value);
			expect(values).not.toContain('Business Loan - Secured');
			expect(values).not.toContain('Machinery Loan');
			expect(values).not.toContain('CC Limit');
		});

		it('Individual: includes Individual-only types (Personal, Gold, Education, Insta)', () => {
			const options = getLoanTypesForApplicant('Individual');
			const values = options.map((o) => o.value);
			expect(values).toContain('Personal Loan');
			expect(values).toContain('Gold Loan');
			expect(values).toContain('Education Loan');
			expect(values).toContain('Insta Loan');
		});

		it('Company: excludes Individual-only types (Personal, Gold, Credit Card, etc.)', () => {
			const options = getLoanTypesForApplicant('Company');
			const values = options.map((o) => o.value);
			expect(values).not.toContain('Personal Loan');
			expect(values).not.toContain('Gold Loan');
			expect(values).not.toContain('Credit Card Loan');
			expect(values).not.toContain('Consumer Durable Loan');
			expect(values).not.toContain('Education Loan');
			expect(values).not.toContain('Insta Loan');
		});

		it('Company: includes Company-only types (Business Secured, Machinery, CC Limit)', () => {
			const options = getLoanTypesForApplicant('Company');
			const values = options.map((o) => o.value);
			expect(values).toContain('Business Loan - Secured');
			expect(values).toContain('Machinery Loan');
			expect(values).toContain('CC Limit');
		});

		it('both types include common loans (Home, LAP, Vehicle, OD, Dropline)', () => {
			const individual = getLoanTypesForApplicant('Individual').map((o) => o.value);
			const company = getLoanTypesForApplicant('Company').map((o) => o.value);
			for (const common of [
				'Home Loan',
				'Loan Against Property',
				'Vehicle Loan',
				'OD Limit',
				'Dropline OD'
			]) {
				expect(individual).toContain(common);
				expect(company).toContain(common);
			}
		});
	});

	describe('deriveFacilityType', () => {
		it('Home Loan → term_loan', () => expect(deriveFacilityType('Home Loan')).toBe('term_loan'));
		it('Personal Loan → term_loan', () =>
			expect(deriveFacilityType('Personal Loan')).toBe('term_loan'));
		it('Vehicle Loan → term_loan', () =>
			expect(deriveFacilityType('Vehicle Loan')).toBe('term_loan'));
		it('Gold Loan → term_loan', () => expect(deriveFacilityType('Gold Loan')).toBe('term_loan'));
		it('Education Loan → term_loan', () =>
			expect(deriveFacilityType('Education Loan')).toBe('term_loan'));
		it('Insta Loan → term_loan', () => expect(deriveFacilityType('Insta Loan')).toBe('term_loan'));
		it('OD Limit → credit_line', () => expect(deriveFacilityType('OD Limit')).toBe('credit_line'));
		it('CC Limit → credit_line', () => expect(deriveFacilityType('CC Limit')).toBe('credit_line'));
		it('Dropline OD → dropline', () => expect(deriveFacilityType('Dropline OD')).toBe('dropline'));
		it('unknown type → term_loan (default)', () =>
			expect(deriveFacilityType('Unknown Fancy Loan')).toBe('term_loan'));
		it('empty string → term_loan (default)', () =>
			expect(deriveFacilityType('')).toBe('term_loan'));
	});

	describe('isInstaLoan', () => {
		it('Insta Loan → true', () => expect(isInstaLoan('Insta Loan')).toBe(true));
		it('Personal Loan → false', () => expect(isInstaLoan('Personal Loan')).toBe(false));
		it('empty → false', () => expect(isInstaLoan('')).toBe(false));
	});

	describe('getClosureOptionsFiltered', () => {
		it('guarantor → only "Not my liability" option', () => {
			const options = getClosureOptionsFiltered('guarantor', 'Home Loan', 'New Purchase');
			expect(options).toHaveLength(1);
			expect(options[0].value).toMatch(/^Not my/);
		});

		it('co-applicant regular → excludes "Not my liability"', () => {
			const options = getClosureOptionsFiltered('co_applicant', 'Home Loan', 'New Purchase');
			expect(options.every((o) => !o.value.startsWith('Not my'))).toBe(true);
		});

		it('co-applicant regular non-BT → excludes "Close from top-up"', () => {
			const options = getClosureOptionsFiltered('co_applicant', 'Home Loan', 'New Purchase');
			expect(options.every((o) => !o.value.startsWith('Will be closed'))).toBe(true);
		});

		it('DC variant → includes "Close from top-up" relabeled', () => {
			const options = getClosureOptionsFiltered('co_applicant', 'Home Loan', 'Debt Consolidation');
			const closureOpt = options.find((o) => o.value.startsWith('Will be closed'));
			expect(closureOpt).toBeDefined();
			expect(closureOpt!.label).toBe('Close by this new loan');
		});

		it('DC with Extra Funds → includes closure option', () => {
			const options = getClosureOptionsFiltered(
				'co_applicant',
				'Home Loan',
				'Debt Consolidation with Extra Funds'
			);
			expect(options.some((o) => o.value.startsWith('Will be closed'))).toBe(true);
		});

		// PITFALL UPDATE (2026-05-28): the closure-options filter switched from
		// loose substring matching to exact-membership in CLOSURE_ALLOWED_VARIANTS.
		// Canonical stored variants are 'Balance Transfer Only' (HIDES the option,
		// no extra funds) and 'Balance Transfer With Top-up' (SHOWS the option).
		// Legacy loose strings 'Balance Transfer' and 'Top-up' no longer match.
		it('BT-only variant → does NOT include closure option (no extra funds)', () => {
			const options = getClosureOptionsFiltered(
				'co_applicant',
				'Home Loan',
				'Balance Transfer Only'
			);
			expect(options.some((o) => o.value.startsWith('Will be closed'))).toBe(false);
		});

		it('BT+Top-up → includes closure option', () => {
			const options = getClosureOptionsFiltered(
				'co_applicant',
				'Home Loan',
				'Balance Transfer With Top-up'
			);
			expect(options.some((o) => o.value.startsWith('Will be closed'))).toBe(true);
		});

		it('Top-up Only variant → includes closure option', () => {
			const options = getClosureOptionsFiltered('co_applicant', 'Home Loan', 'Top-up Only');
			expect(options.some((o) => o.value.startsWith('Will be closed'))).toBe(true);
		});

		it('LAP always shows closure regardless of variant', () => {
			const options = getClosureOptionsFiltered(
				'co_applicant',
				'Loan Against Property',
				'New Purchase'
			);
			expect(options.some((o) => o.value.startsWith('Will be closed'))).toBe(true);
		});

		it('Insta Loan → excludes "Close from top-up" even in DC', () => {
			const options = getClosureOptionsFiltered('co_applicant', 'Insta Loan', 'Debt Consolidation');
			expect(options.every((o) => !o.value.startsWith('Will be closed'))).toBe(true);
		});

		// 'OD Takeover' / 'CC Takeover + Enhancement' are LABELS in
		// commonPage.json (q3_BTOptions) — their stored VALUES are the
		// canonical scope strings 'Debt Consolidation' and
		// 'Debt Consolidation with Extra Funds' respectively. Earlier the
		// CLOSURE_ALLOWED_VARIANTS Set defensively duplicated the labels;
		// post-audit (2026-05-31) the dead label-entries were removed and
		// these tests now exercise the real runtime values for the
		// OD Limit / CC Limit obligation product contexts.
		it('OD Takeover scenario (stored as "Debt Consolidation") → OD Limit obligation includes closure option', () => {
			const options = getClosureOptionsFiltered('co_applicant', 'OD Limit', 'Debt Consolidation');
			expect(options.some((o) => o.value.startsWith('Will be closed'))).toBe(true);
		});

		it('CC Takeover + Enhancement scenario (stored as "Debt Consolidation with Extra Funds") → CC Limit obligation includes closure', () => {
			const options = getClosureOptionsFiltered(
				'co_applicant',
				'CC Limit',
				'Debt Consolidation with Extra Funds'
			);
			expect(options.some((o) => o.value.startsWith('Will be closed'))).toBe(true);
		});
	});

	describe('option data integrity', () => {
		it('all LOAN_TYPE_OPTIONS have required fields', () => {
			for (const opt of LOAN_TYPE_OPTIONS) {
				expect(opt.label).toBeTruthy();
				expect(opt.value).toBeTruthy();
				expect(opt.icon).toBeTruthy();
				expect(['term_loan', 'credit_line', 'dropline']).toContain(opt.facility);
			}
		});

		it('ROLE_OPTIONS has exactly 2 roles', () => {
			expect(ROLE_OPTIONS).toHaveLength(2);
			expect(ROLE_OPTIONS.map((r) => r.value)).toEqual(['co_applicant', 'guarantor']);
		});

		it('EVIDENCE_OPTIONS has 5 levels', () => {
			expect(EVIDENCE_OPTIONS).toHaveLength(5);
		});

		it('EMI_PAID_BY_OPTIONS has 5 options', () => {
			expect(EMI_PAID_BY_OPTIONS).toHaveLength(5);
		});

		it('CLOSURE_OPTIONS has 4 options', () => {
			expect(CLOSURE_OPTIONS).toHaveLength(4);
		});
	});
});

// ============================================================================
// 2. COMPLETION LOGIC EDGE CASES
// ============================================================================

describe('Obligation Completion Logic', () => {
	describe('Individual applicant — DC route', () => {
		it('DC route: no "Close by new loan" entries → incomplete', () => {
			const applicant = makeIndividualApplicant({
				ObligationsRunning: 'Yes',
				obligations: [makeTermLoanEntry({ selectedToClose: 'Keep running' })]
			});
			const result = computeSectionCompletion(applicant, { loanScope: 'Debt Consolidation' });
			expect(result.obligations_details).toBe(false);
		});

		it('DC route: has "Close by new loan" entry → complete', () => {
			const applicant = makeIndividualApplicant({
				ObligationsRunning: 'Yes',
				obligations: [makeTermLoanEntry({ selectedToClose: 'Will be closed by Top-up amount' })]
			});
			const result = computeSectionCompletion(applicant, { loanScope: 'Debt Consolidation' });
			expect(result.obligations_details).toBe(true);
		});

		it('DC with Extra Funds: same closure requirement', () => {
			const applicant = makeIndividualApplicant({
				ObligationsRunning: 'Yes',
				obligations: [makeTermLoanEntry({ selectedToClose: 'Keep running' })]
			});
			const result = computeSectionCompletion(applicant, {
				loanScope: 'Debt Consolidation with Extra Funds'
			});
			expect(result.obligations_details).toBe(false);
		});
	});

	describe('Individual applicant — standard flow', () => {
		it('ObligationsRunning=Yes + 0 entries → incomplete', () => {
			const applicant = makeIndividualApplicant({ ObligationsRunning: 'Yes', obligations: [] });
			const result = computeSectionCompletion(applicant);
			expect(result.obligations_details).toBe(false);
		});

		it('ObligationsRunning=Yes + 1 entry → complete', () => {
			const applicant = makeIndividualApplicant({
				ObligationsRunning: 'Yes',
				obligations: [makeTermLoanEntry()]
			});
			const result = computeSectionCompletion(applicant);
			expect(result.obligations_details).toBe(true);
		});

		it('ObligationsRunning=Yes + guarantor=Yes + no guarantor entries → incomplete', () => {
			const applicant = makeIndividualApplicant({
				ObligationsRunning: 'Yes',
				isGuarantorOnOtherLoan: 'Yes',
				obligations: [makeTermLoanEntry({ role: 'co_applicant' })]
			});
			const result = computeSectionCompletion(applicant);
			expect(result.obligations_details).toBe(false);
		});

		it('ObligationsRunning=Yes + guarantor=Yes + has guarantor entry → complete', () => {
			const applicant = makeIndividualApplicant({
				ObligationsRunning: 'Yes',
				isGuarantorOnOtherLoan: 'Yes',
				obligations: [
					makeTermLoanEntry({ role: 'co_applicant' }),
					makeTermLoanEntry({
						id: 'g1',
						role: 'guarantor',
						selectedToClose: 'Not my actual liability (Guarantor/Paper only)'
					})
				]
			});
			const result = computeSectionCompletion(applicant);
			expect(result.obligations_details).toBe(true);
		});

		it('ObligationsRunning=No + guarantor unanswered → incomplete', () => {
			const applicant = makeIndividualApplicant({
				ObligationsRunning: 'No',
				isGuarantorOnOtherLoan: undefined
			});
			const result = computeSectionCompletion(applicant);
			expect(result.obligations_details).toBe(false);
		});

		it('ObligationsRunning=No + guarantor=No → complete', () => {
			const applicant = makeIndividualApplicant({
				ObligationsRunning: 'No',
				isGuarantorOnOtherLoan: 'No'
			});
			const result = computeSectionCompletion(applicant);
			expect(result.obligations_details).toBe(true);
		});

		it('ObligationsRunning=No + guarantor=Yes + no entries → incomplete', () => {
			const applicant = makeIndividualApplicant({
				ObligationsRunning: 'No',
				isGuarantorOnOtherLoan: 'Yes',
				obligations: []
			});
			const result = computeSectionCompletion(applicant);
			expect(result.obligations_details).toBe(false);
		});

		it('ObligationsRunning=No + guarantor=Yes + guarantor entry → complete', () => {
			const applicant = makeIndividualApplicant({
				ObligationsRunning: 'No',
				isGuarantorOnOtherLoan: 'Yes',
				obligations: [makeTermLoanEntry({ role: 'guarantor', selectedToClose: 'Not my actual liability (Guarantor/Paper only)' })]
			});
			const result = computeSectionCompletion(applicant);
			expect(result.obligations_details).toBe(true);
		});

		it('ObligationsRunning not set + guarantor=Yes + guarantor entry → complete', () => {
			const applicant = makeIndividualApplicant({
				ObligationsRunning: undefined,
				isGuarantorOnOtherLoan: 'Yes',
				obligations: [makeTermLoanEntry({ role: 'guarantor', selectedToClose: 'Not my actual liability (Guarantor/Paper only)' })]
			});
			const result = computeSectionCompletion(applicant);
			expect(result.obligations_details).toBe(true);
		});

		it('nothing answered → incomplete', () => {
			const applicant = makeIndividualApplicant({
				ObligationsRunning: undefined,
				isGuarantorOnOtherLoan: undefined
			});
			const result = computeSectionCompletion(applicant);
			expect(result.obligations_details).toBe(false);
		});
	});

	describe('Non-earner obligation completion', () => {
		it('non-earner + obligations without emiPaidBy → incomplete', () => {
			const applicant = makeIndividualApplicant({
				selectedIncomeProfiles: ['no_current_income'],
				ObligationsRunning: 'Yes',
				obligations: [makeTermLoanEntry({ emiPaidBy: undefined })]
			});
			const result = computeSectionCompletion(applicant);
			expect(result.obligations_details).toBe(false);
		});

		it('non-earner + all obligations have emiPaidBy → complete', () => {
			const applicant = makeIndividualApplicant({
				selectedIncomeProfiles: ['no_current_income'],
				ObligationsRunning: 'Yes',
				obligations: [
					makeTermLoanEntry({ emiPaidBy: 'spouse' }),
					makeTermLoanEntry({ id: 'e2', emiPaidBy: 'self' })
				]
			});
			const result = computeSectionCompletion(applicant);
			expect(result.obligations_details).toBe(true);
		});

		it('non-earner + mixed emiPaidBy (some set, some not) → incomplete', () => {
			const applicant = makeIndividualApplicant({
				selectedIncomeProfiles: ['no_current_income'],
				ObligationsRunning: 'Yes',
				obligations: [
					makeTermLoanEntry({ emiPaidBy: 'spouse' }),
					makeTermLoanEntry({ id: 'e2', emiPaidBy: '' })
				]
			});
			const result = computeSectionCompletion(applicant);
			expect(result.obligations_details).toBe(false);
		});
	});

	describe('Company applicant obligations', () => {
		it('ObligationsRunning=Yes + entry → complete', () => {
			const applicant = makeCompanyApplicant({
				ObligationsRunning: 'Yes',
				obligations: [makeCreditLineEntry()]
			});
			const result = computeCompanyCompletion(applicant);
			expect(result.obligations_details).toBe(true);
		});

		it('ObligationsRunning=Yes + no entries → incomplete', () => {
			const applicant = makeCompanyApplicant({
				ObligationsRunning: 'Yes',
				obligations: []
			});
			const result = computeCompanyCompletion(applicant);
			expect(result.obligations_details).toBe(false);
		});

		it('ObligationsRunning=No → complete', () => {
			const applicant = makeCompanyApplicant({ ObligationsRunning: 'No' });
			const result = computeCompanyCompletion(applicant);
			expect(result.obligations_details).toBe(true);
		});

		it('ObligationsRunning not set → incomplete', () => {
			const applicant = makeCompanyApplicant({ ObligationsRunning: undefined });
			const result = computeCompanyCompletion(applicant);
			expect(result.obligations_details).toBe(false);
		});

		it('Company + guarantor=Yes + no guarantor entries → incomplete', () => {
			const applicant = makeCompanyApplicant({
				ObligationsRunning: 'Yes',
				isGuarantorOnOtherLoan: 'Yes',
				obligations: [makeCreditLineEntry({ role: 'co_applicant' })]
			});
			const result = computeCompanyCompletion(applicant);
			expect(result.obligations_details).toBe(false);
		});
	});

	describe('legacy format support', () => {
		it('tableLoanEntries counts as having obligations', () => {
			const applicant = makeIndividualApplicant({
				ObligationsRunning: 'Yes',
				obligations: [],
				tableLoanEntries: [{ loanType: 'Home Loan', bankName: 'SBI', emi: '45000' }]
			});
			const result = computeSectionCompletion(applicant);
			expect(result.obligations_details).toBe(true);
		});

		it('tableLimitEntries counts as having obligations', () => {
			const applicant = makeIndividualApplicant({
				ObligationsRunning: 'Yes',
				obligations: [],
				tableLimitEntries: [{ loanType: 'OD Limit', bankName: 'HDFC', sanctionedLimit: '1000000' }]
			});
			const result = computeSectionCompletion(applicant);
			expect(result.obligations_details).toBe(true);
		});
	});
});

// ============================================================================
// 3. EMI VALIDATION CROSS-CHECK
// ============================================================================

describe('EMI Validation Cross-Check', () => {
	it('home loan EMI matches formula (₹50L @ 8.5% / 20yr)', () => {
		const expectedEmi = calculateEMI(5_000_000, 8.5, 240);
		// Standard home loan EMI should be ~₹43,391
		expect(expectedEmi).toBeGreaterThan(43_000);
		expect(expectedEmi).toBeLessThan(44_000);
	});

	it('personal loan EMI (₹10L @ 14% / 5yr)', () => {
		const emi = calculateEMI(1_000_000, 14, 60);
		// ~₹23,268
		expect(emi).toBeGreaterThan(23_000);
		expect(emi).toBeLessThan(24_000);
	});

	it('vehicle loan (₹8L @ 9% / 7yr)', () => {
		const emi = calculateEMI(800_000, 9, 84);
		expect(emi).toBeGreaterThan(12_000);
		expect(emi).toBeLessThan(14_000);
	});

	it('zero principal → 0 EMI', () => {
		expect(calculateEMI(0, 8.5, 240)).toBe(0);
	});

	it('zero tenure → 0 EMI', () => {
		expect(calculateEMI(5_000_000, 8.5, 0)).toBe(0);
	});

	it('zero rate → principal / tenure (interest-free)', () => {
		const emi = calculateEMI(1_200_000, 0, 12);
		expect(emi).toBe(100_000);
	});

	it('negative rate → returns a number (function handles gracefully)', () => {
		const emi = calculateEMI(1_000_000, -5, 60);
		expect(Number.isFinite(emi)).toBe(true);
	});

	it('very large principal (₹50Cr) → no overflow', () => {
		const emi = calculateEMI(500_000_000, 8.5, 360);
		expect(emi).toBeGreaterThan(3_500_000);
		expect(Number.isFinite(emi)).toBe(true);
	});

	it('short tenure (1 month) → principal + interest', () => {
		const emi = calculateEMI(100_000, 12, 1);
		// 100000 * (1 + 0.01) = 101000
		expect(emi).toBeGreaterThan(100_000);
		expect(emi).toBeLessThan(102_000);
	});

	it('EMI mismatch detection: entered EMI differs significantly from computed', () => {
		const computedEmi = calculateEMI(5_000_000, 8.5, 240);
		const enteredEmi = 45_000;
		const mismatch = Math.abs(computedEmi - enteredEmi);
		// Entered is ~₹1600 off → should trigger warning (≥₹500 threshold)
		expect(mismatch).toBeGreaterThan(500);
	});

	it('EMI within tolerance: entered EMI close to computed', () => {
		const computedEmi = calculateEMI(5_000_000, 8.5, 240);
		const enteredEmi = Math.round(computedEmi + 200);
		const mismatch = Math.abs(computedEmi - enteredEmi);
		expect(mismatch).toBeLessThan(500);
	});

	it('higher rate → higher EMI for same principal & tenure', () => {
		const lowRate = calculateEMI(1_000_000, 8, 120);
		const highRate = calculateEMI(1_000_000, 16, 120);
		expect(highRate).toBeGreaterThan(lowRate);
	});

	it('shorter tenure → higher EMI for same principal & rate', () => {
		const longTenure = calculateEMI(1_000_000, 10, 240);
		const shortTenure = calculateEMI(1_000_000, 10, 60);
		expect(shortTenure).toBeGreaterThan(longTenure);
	});
});

// ============================================================================
// 4. OBLIGATION ENTRY BUILDING & VALIDATION
// ============================================================================

describe('Obligation Entry Building & Cleaning', () => {
	it('valid term loan entry passes cleaning', () => {
		const raw = { obligations: [makeTermLoanEntry()] };
		const cleaned = cleanObligationEntries(raw);
		expect(cleaned).toHaveLength(1);
		expect(cleaned[0].loanType).toBe('Home Loan');
		expect(cleaned[0].obligationType).toBe('term_loan');
	});

	it('valid credit line entry passes cleaning', () => {
		const raw = { obligations: [makeCreditLineEntry()] };
		const cleaned = cleanObligationEntries(raw);
		expect(cleaned).toHaveLength(1);
		expect(cleaned[0].obligationType).toBe('credit_line');
	});

	it('Dropline OD gets obligationType = credit_line', () => {
		const raw = { obligations: [makeCreditLineEntry({ loanType: 'Dropline OD' })] };
		const cleaned = cleanObligationEntries(raw);
		expect(cleaned[0].obligationType).toBe('credit_line');
	});

	it('missing loanType → entry filtered out', () => {
		const raw = { obligations: [makeTermLoanEntry({ loanType: '' })] };
		const cleaned = cleanObligationEntries(raw);
		expect(cleaned).toHaveLength(0);
	});

	it('missing loanType (undefined) → entry filtered out', () => {
		const raw = { obligations: [makeTermLoanEntry({ loanType: undefined })] };
		const cleaned = cleanObligationEntries(raw);
		expect(cleaned).toHaveLength(0);
	});

	it('entry without id gets one auto-generated', () => {
		const raw = { obligations: [makeTermLoanEntry({ id: undefined })] };
		const cleaned = cleanObligationEntries(raw);
		expect(cleaned[0].id).toBeTruthy();
	});

	it('multiple entries — mix of valid and invalid', () => {
		const raw = {
			obligations: [
				makeTermLoanEntry({ loanType: 'Home Loan' }),
				makeTermLoanEntry({ loanType: '' }),
				makeCreditLineEntry({ loanType: 'OD Limit' })
			]
		};
		const cleaned = cleanObligationEntries(raw);
		expect(cleaned).toHaveLength(2);
	});

	it('legacy tableLoanEntries processed', () => {
		const raw = {
			tableLoanEntries: [{ loanType: 'Personal Loan', bankName: 'Axis', emi: '25000' }]
		};
		const cleaned = cleanObligationEntries(raw);
		expect(cleaned).toHaveLength(1);
		expect(cleaned[0].obligationType).toBe('term_loan');
	});

	it('legacy tableLimitEntries processed', () => {
		const raw = {
			tableLimitEntries: [{ loanType: 'OD Limit', bankName: 'HDFC', sanctionedLimit: '500000' }]
		};
		const cleaned = cleanObligationEntries(raw);
		expect(cleaned).toHaveLength(1);
		expect(cleaned[0].obligationType).toBe('credit_line');
	});

	it('unified obligations preferred over legacy arrays', () => {
		const raw = {
			obligations: [makeTermLoanEntry()],
			tableLoanEntries: [{ loanType: 'Personal Loan', bankName: 'Axis', emi: '25000' }]
		};
		const cleaned = cleanObligationEntries(raw);
		// Should use obligations, not legacy
		expect(cleaned).toHaveLength(1);
		expect(cleaned[0].loanType).toBe('Home Loan');
	});

	it('empty applicant → empty array', () => {
		expect(cleanObligationEntries({})).toHaveLength(0);
	});

	it('null obligations → empty array', () => {
		expect(cleanObligationEntries({ obligations: null })).toHaveLength(0);
	});
});

describe('Borrower Count Parsing', () => {
	it('"1" → 1', () => expect(parseBorrowerCount('1')).toBe(1));
	it('"2" → 2', () => expect(parseBorrowerCount('2')).toBe(2));
	it('"3" → 3', () => expect(parseBorrowerCount('3')).toBe(3));
	it('"4+" → 4', () => expect(parseBorrowerCount('4+')).toBe(4));
	it('empty string → 1', () => expect(parseBorrowerCount('')).toBe(1));
	it('undefined → 1', () => expect(parseBorrowerCount(undefined as unknown as string)).toBe(1));
	it('null → 1', () => expect(parseBorrowerCount(null as unknown as string)).toBe(1));
	it('"abc" → 1', () => expect(parseBorrowerCount('abc')).toBe(1));
	it('"0" → 1 (floors to minimum)', () => expect(parseBorrowerCount('0')).toBe(1));
});

// ============================================================================
// 5. MULTI-APPLICANT OBLIGATION SCENARIOS
// ============================================================================

describe('Multi-Applicant Obligation Dedup', () => {
	it('same person + same lender → warning', () => {
		const applicants = [
			makeIndividualApplicant({
				fullName: 'Rahul Sharma',
				obligations: [makeTermLoanEntry({ bankName: 'SBI' })]
			}),
			makeIndividualApplicant({
				fullName: 'Rahul Sharma',
				obligations: [makeTermLoanEntry({ bankName: 'SBI' })]
			})
		];
		const warnings = detectObligationDuplicates(applicants);
		expect(warnings.length).toBeGreaterThan(0);
	});

	it('same person + different lenders → no warning', () => {
		const applicants = [
			makeIndividualApplicant({
				fullName: 'Rahul Sharma',
				obligations: [makeTermLoanEntry({ bankName: 'SBI' })]
			}),
			makeIndividualApplicant({
				fullName: 'Rahul Sharma',
				obligations: [makeTermLoanEntry({ bankName: 'HDFC' })]
			})
		];
		const warnings = detectObligationDuplicates(applicants);
		expect(warnings).toHaveLength(0);
	});

	it('different persons + same lender → no warning', () => {
		const applicants = [
			makeIndividualApplicant({
				fullName: 'Rahul Sharma',
				obligations: [makeTermLoanEntry({ bankName: 'SBI' })]
			}),
			makeIndividualApplicant({
				fullName: 'Priya Sharma',
				obligations: [makeTermLoanEntry({ bankName: 'SBI' })]
			})
		];
		const warnings = detectObligationDuplicates(applicants);
		expect(warnings).toHaveLength(0);
	});

	it('Company applicants excluded from dedup', () => {
		const applicants = [
			makeCompanyApplicant({
				fullName: 'Corp Ltd',
				obligations: [makeTermLoanEntry({ bankName: 'SBI' })]
			}),
			makeCompanyApplicant({
				fullName: 'Corp Ltd',
				obligations: [makeTermLoanEntry({ bankName: 'SBI' })]
			})
		];
		const warnings = detectObligationDuplicates(applicants);
		expect(warnings).toHaveLength(0);
	});

	it('name normalization: "John Smith" = "john  smith" = " JOHN SMITH "', () => {
		const applicants = [
			makeIndividualApplicant({
				fullName: 'John Smith',
				obligations: [makeTermLoanEntry({ bankName: 'Axis' })]
			}),
			makeIndividualApplicant({
				fullName: '  john   smith  ',
				obligations: [makeTermLoanEntry({ bankName: 'Axis' })]
			})
		];
		const warnings = detectObligationDuplicates(applicants);
		expect(warnings.length).toBeGreaterThan(0);
	});

	it('three applicants, partial overlap → correct warnings', () => {
		const applicants = [
			makeIndividualApplicant({
				fullName: 'Rahul',
				obligations: [makeTermLoanEntry({ bankName: 'SBI' })]
			}),
			makeIndividualApplicant({
				fullName: 'Rahul',
				obligations: [makeTermLoanEntry({ bankName: 'SBI' })]
			}),
			makeIndividualApplicant({
				fullName: 'Priya',
				obligations: [makeTermLoanEntry({ bankName: 'HDFC' })]
			})
		];
		const warnings = detectObligationDuplicates(applicants);
		// Only Rahul↔Rahul overlap, not Priya
		expect(warnings.length).toBeGreaterThan(0);
		expect(warnings.every((w) => w.personName.toLowerCase().includes('rahul'))).toBe(true);
	});

	it('legacy tableLoanEntries format dedup', () => {
		const applicants = [
			makeIndividualApplicant({
				fullName: 'Rahul',
				obligations: [],
				tableLoanEntries: [{ loanType: 'Home Loan', bankName: 'SBI' }]
			}),
			makeIndividualApplicant({
				fullName: 'Rahul',
				obligations: [],
				tableLoanEntries: [{ loanType: 'Personal Loan', bankName: 'SBI' }]
			})
		];
		const warnings = detectObligationDuplicates(applicants);
		expect(warnings.length).toBeGreaterThan(0);
	});

	it('empty obligations across all applicants → no warnings', () => {
		const applicants = [
			makeIndividualApplicant({ obligations: [] }),
			makeIndividualApplicant({ obligations: [] })
		];
		const warnings = detectObligationDuplicates(applicants);
		expect(warnings).toHaveLength(0);
	});

	it('single applicant → no warnings (nothing to compare)', () => {
		const warnings = detectObligationDuplicates([
			makeIndividualApplicant({
				fullName: 'Solo',
				obligations: [makeTermLoanEntry({ bankName: 'SBI' })]
			})
		]);
		expect(warnings).toHaveLength(0);
	});
});

// ============================================================================
// 6. OBLIGATION LIMITS PER LOAN TYPE
// ============================================================================

describe('Obligation Facility Type Mapping', () => {
	it('all term loan types map correctly', () => {
		const termTypes = [
			'Home Loan',
			'Plot and Construction Loan',
			'Loan Against Property',
			'Personal Loan',
			'Vehicle Loan',
			'Gold Loan',
			'Credit Card Loan',
			'Consumer Durable Loan',
			'Education Loan',
			'Insta Loan',
			'Business Loan - Unsecured',
			'Business Loan - Secured',
			'Machinery Loan',
			'Other Type Loan'
		];
		for (const type of termTypes) {
			expect(deriveFacilityType(type)).toBe('term_loan');
		}
	});

	it('credit line types map correctly', () => {
		expect(deriveFacilityType('OD Limit')).toBe('credit_line');
		expect(deriveFacilityType('CC Limit')).toBe('credit_line');
	});

	it('dropline type maps correctly', () => {
		expect(deriveFacilityType('Dropline OD')).toBe('dropline');
	});

	it('every LOAN_TYPE_OPTIONS entry has consistent facility mapping', () => {
		for (const opt of LOAN_TYPE_OPTIONS) {
			const derived = deriveFacilityType(opt.value);
			expect(derived).toBe(opt.facility);
		}
	});

	it('Individual has more loan types than Company', () => {
		const individualCount = getLoanTypesForApplicant('Individual').length;
		const companyCount = getLoanTypesForApplicant('Company').length;
		expect(individualCount).toBeGreaterThan(companyCount);
	});

	it('at least 10 loan types available for Individual', () => {
		expect(getLoanTypesForApplicant('Individual').length).toBeGreaterThanOrEqual(10);
	});

	it('at least 6 loan types available for Company', () => {
		expect(getLoanTypesForApplicant('Company').length).toBeGreaterThanOrEqual(6);
	});

	it('Dropline OD available for both Individual and Company', () => {
		const individual = getLoanTypesForApplicant('Individual').map((o) => o.value);
		const company = getLoanTypesForApplicant('Company').map((o) => o.value);
		expect(individual).toContain('Dropline OD');
		expect(company).toContain('Dropline OD');
	});

	it('"Other" category available as catch-all for both', () => {
		const individual = getLoanTypesForApplicant('Individual').map((o) => o.value);
		const company = getLoanTypesForApplicant('Company').map((o) => o.value);
		expect(individual).toContain('Other Type Loan');
		expect(company).toContain('Other Type Loan');
	});
});
