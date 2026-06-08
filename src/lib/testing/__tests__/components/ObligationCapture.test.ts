/**
 * ObligationCapture — Component behavior tests
 * ══════════════════════════════════════════════════════════════════
 * These tests exercise the real production code that ObligationCapture.svelte
 * imports — `hasPendingValidEntry` and `computeEmiMismatch` live in
 * src/lib/components/obligationCaptureLogic.ts. The component wraps them in
 * `$derived.by(...)` for reactivity but the algorithms ARE the imports.
 *
 * Pre-2026-06-05, the form-validity and EMI-mismatch describes redefined
 * these helpers inline and asserted against the copy — a tautology the
 * audit caught. The 2026-06-05 cleanup extracted the algorithms into a
 * pure module so both the component and these tests consume the same code.
 *
 * To add true DOM-level rendering tests in future, install
 * @testing-library/svelte (v5+) and replace with render() calls — the other
 * concerns (field visibility, role/closure options) would benefit most.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
	getLoanTypesForApplicant,
	deriveFacilityType,
	getClosureOptionsFiltered,
	LOAN_TYPE_OPTIONS,
	ROLE_OPTIONS,
	EVIDENCE_OPTIONS,
	EMI_PAID_BY_OPTIONS
} from '$lib/config/obligationOptions';
import {
	hasPendingValidEntry,
	computeEmiMismatch
} from '$lib/components/obligationCaptureLogic';

// ── Test 1: Home Loan obligation shows EMI-based fields (term loan facility) ──
describe('ObligationCapture — field visibility for Home Loan obligation type', () => {

	it('OD Limit maps to credit_line facility, which shows sanctioned limit instead of EMI', () => {
		// When facilityType is credit_line the component hides EMI/tenure and shows limit inputs.
		// OD Limit is the standard revolving credit obligation type.
		const facilityType = deriveFacilityType('OD Limit');
		expect(facilityType).toBe('credit_line');
	});

});

// ── Test 2: Done/Next button validity — exercises real obligationCaptureLogic ──
describe('ObligationCapture — pending form validity (drives Done/Next button)', () => {
	const empty = { emi: '', tenure: '', sanctionedLimit: '' };

	it('button is disabled when loanType is set but bankName is missing', () => {
		expect(hasPendingValidEntry({ ...empty, loanType: 'Home Loan', bankName: '' })).toBe(false);
	});

	it('button is disabled when Home Loan EMI is below minimum (1000)', () => {
		expect(
			hasPendingValidEntry({
				...empty,
				loanType: 'Home Loan',
				bankName: 'HDFC Bank',
				emi: '500',
				tenure: '180'
			})
		).toBe(false);
	});

	it('button is enabled when Home Loan has valid loan type, bank, EMI, and tenure', () => {
		expect(
			hasPendingValidEntry({
				...empty,
				loanType: 'Home Loan',
				bankName: 'HDFC Bank',
				emi: '25000',
				tenure: '180'
			})
		).toBe(true);
	});

	it('button is disabled for OD Limit (credit line) when sanctioned limit is below 10,000', () => {
		expect(
			hasPendingValidEntry({
				...empty,
				loanType: 'OD Limit',
				bankName: 'ICICI Bank',
				sanctionedLimit: '5000'
			})
		).toBe(false);
	});

	it('button is enabled for OD Limit (credit line) when sanctioned limit is at least 10,000', () => {
		expect(
			hasPendingValidEntry({
				...empty,
				loanType: 'OD Limit',
				bankName: 'ICICI Bank',
				sanctionedLimit: '50000'
			})
		).toBe(true);
	});

	// Locks the dropline-specific EMI minimum that the pre-extraction inline test
	// copy did NOT mirror — production requires both sanctioned limit ≥ 10k AND
	// emi ≥ 1000 on dropline facilities (e.g. "Dropline OD").
	it('button is disabled for Dropline OD when sanctioned limit passes but EMI is missing', () => {
		expect(
			hasPendingValidEntry({
				loanType: 'Dropline OD',
				bankName: 'ICICI Bank',
				sanctionedLimit: '50000',
				emi: '',
				tenure: ''
			})
		).toBe(false);
	});

	it('button is enabled for Dropline OD when sanctioned limit and EMI both pass', () => {
		expect(
			hasPendingValidEntry({
				loanType: 'Dropline OD',
				bankName: 'ICICI Bank',
				sanctionedLimit: '50000',
				emi: '5000',
				tenure: ''
			})
		).toBe(true);
	});
});

// ── Test 3: EMI cross-check — exercises real obligationCaptureLogic ──
describe('ObligationCapture — EMI cross-check warning logic', () => {
	const baseInput = {
		loanType: 'Home Loan',
		principalOutstanding: '5000000',
		tenure: '180',
		interestRate: '8.5',
		emi: '43000'
	};

	it('no warning when fields are incomplete (missing tenure)', () => {
		const result = computeEmiMismatch({ ...baseInput, tenure: '' });
		expect(result.triggered).toBe(false);
		expect(result.calculatedEmi).toBe(0);
		expect(result.difference).toBe(0);
	});

	// The remaining cases lock the actual production threshold + math. If anyone
	// drifts the ₹500 cutoff or the EMI formula, these flip.
	it('no warning when entered EMI is within ₹500 of calculated', () => {
		// ₹50L principal · 8.5% · 180mo → calculated EMI ≈ ₹49,237.
		// Entering ₹49,500 (off by ~₹263) is inside the tolerance.
		const result = computeEmiMismatch({ ...baseInput, emi: '49500' });
		expect(result.triggered).toBe(false);
	});

	it('warning triggers when entered EMI differs by more than ₹500', () => {
		const result = computeEmiMismatch({ ...baseInput, emi: '43000' });
		expect(result.triggered).toBe(true);
		expect(result.calculatedEmi).toBeGreaterThan(0);
		expect(result.difference).toBeGreaterThan(500);
	});

	it('no warning on credit_line facility (not a term loan or dropline)', () => {
		const result = computeEmiMismatch({ ...baseInput, loanType: 'OD Limit' });
		expect(result.triggered).toBe(false);
		expect(result.calculatedEmi).toBe(0);
	});
});

// ── Test 4: Adding obligation type shows correct closure options ───────────
describe('ObligationCapture — closure options per obligation type', () => {
	it('co_applicant role on Home Loan shows Keep Running but NOT the guarantor "Not my liability" option', () => {
		const options = getClosureOptionsFiltered('co_applicant', 'Home Loan', '');
		const values = options.map((o) => o.value);
		// Co-applicants can keep the loan running or close it — standard options appear
		expect(values).toContain('Keep running');
		// Guarantor-specific option must NOT appear for co-applicants
		expect(values.some((v) => v.startsWith('Not my'))).toBe(false);
	});

	it('guarantor role shows "Not my liability" closure option', () => {
		const options = getClosureOptionsFiltered('guarantor', 'Home Loan', '');
		const values = options.map((o) => o.value);
		expect(values.some((v) => v.includes('Not my'))).toBe(true);
	});

	it('BT+Top-up loan variant shows "close by this new loan" closure option (not shown for standard loans)', () => {
		// PITFALL UPDATE (2026-05-28): closure-options filter now uses exact-
		// membership match against CLOSURE_ALLOWED_VARIANTS. Canonical variant
		// strings are 'Balance Transfer With Top-up' (cash released → option
		// shown) and 'Balance Transfer Only' (no cash → option hidden). The
		// legacy loose substring 'Balance Transfer' no longer matches.
		const btOptions = getClosureOptionsFiltered(
			'co_applicant',
			'Home Loan',
			'Balance Transfer With Top-up'
		);
		const standardOptions = getClosureOptionsFiltered('co_applicant', 'Home Loan', '');

		// BT+Top-up variant includes the "close by this new loan" option
		const btValues = btOptions.map((o) => o.value);
		expect(btValues.some((v) => v.startsWith('Will be closed'))).toBe(true);

		// Standard loan (New Loan, empty variant) does NOT include that option
		const standardValues = standardOptions.map((o) => o.value);
		expect(standardValues.some((v) => v.startsWith('Will be closed'))).toBe(false);
	});
});

// ── Test 5: Structure test — component labels and options exist ────────────
describe('ObligationCapture — expected loan type options and role options are present', () => {
	it('Individual applicant type sees standard loan types including Home Loan and Vehicle Loan', () => {
		const options = getLoanTypesForApplicant('Individual');
		const values = options.map((o) => o.value);
		// Individual-accessible loan types that must always be present
		expect(values).toContain('Home Loan');
		expect(values).toContain('Vehicle Loan');
		expect(values).toContain('Personal Loan');
	});

	it('Company applicant type does NOT see individual-only obligation types', () => {
		const options = getLoanTypesForApplicant('Company');
		const values = options.map((o) => o.value);
		// Personal Loan is marked individualOnly — companies cannot carry it
		expect(values).not.toContain('Personal Loan');
		// Gold Loan is also individual-only
		expect(values).not.toContain('Gold Loan');
	});

	it('ROLE_OPTIONS includes co_applicant and guarantor', () => {
		const values = ROLE_OPTIONS.map((o) => o.value);
		expect(values).toContain('co_applicant');
		expect(values).toContain('guarantor');
	});

	it('EVIDENCE_OPTIONS contains documented evidence options and a no-documents fallback', () => {
		const values = EVIDENCE_OPTIONS.map((o) => o.value);
		// Sanction letter or bank statement options are available (documented evidence)
		expect(values).toContain('sanction_and_statement');
		// A no-documents option exists for cases where applicant has no proof yet
		expect(values).toContain('no_documents');
	});

	it('EMI_PAID_BY_OPTIONS includes self and co_applicant', () => {
		const values = EMI_PAID_BY_OPTIONS.map((o) => o.value);
		expect(values).toContain('self');
		expect(values).toContain('co_applicant');
	});

	it('LOAN_TYPE_OPTIONS is non-empty and all entries have label and value', () => {
		expect(LOAN_TYPE_OPTIONS.length).toBeGreaterThan(0);
		for (const option of LOAN_TYPE_OPTIONS) {
			expect(option.label).toBeTruthy();
			expect(option.value).toBeTruthy();
		}
	});
});
