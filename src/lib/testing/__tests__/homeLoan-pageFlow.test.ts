import { describe, it, expect } from 'vitest';
import {
	PAGE_IDS,
	LOAN_TYPE_VALUES,
	getPageSequence,
	getVisiblePages,
	usesBtNavigation,
	getApplicantStepSequence,
	APPLICANT_STEPS,
	NEW_LOAN_SEQUENCE,
	PRE_SANCTION_SEQUENCE
} from '$lib/testing/homeLoan/pageFlowMap';

describe('Home Loan page sequences — New Loan paths', () => {
	it('New Loan (propertyIdentified=Yes) follows the 11-page sequence', () => {
		const sequence = getPageSequence(LOAN_TYPE_VALUES.NEW_LOAN, 'Yes');
		expect(sequence).toEqual([
			PAGE_IDS.CASE_INTAKE,
			PAGE_IDS.PROPERTY_LOCATION,
			PAGE_IDS.PROPERTY_CHARACTER,
			PAGE_IDS.COMPLIANCE_LEGAL,
			PAGE_IDS.SELLER_TRANSACTION,
			PAGE_IDS.APPLICANTS,
			PAGE_IDS.INCOME_PROFILES,
			PAGE_IDS.INCOME_DETAILS,
			PAGE_IDS.CREDIT_SCORE,
			PAGE_IDS.OBLIGATIONS,
			PAGE_IDS.DEAL_FINANCIALS
		]);
		expect(sequence).toHaveLength(11);
	});

	it('New Loan (propertyIdentified=No) follows the 7-page pre-sanction sequence', () => {
		const sequence = getPageSequence(LOAN_TYPE_VALUES.NEW_LOAN, 'No');
		expect(sequence).toEqual([
			PAGE_IDS.CASE_INTAKE,
			PAGE_IDS.APPLICANTS,
			PAGE_IDS.INCOME_PROFILES,
			PAGE_IDS.INCOME_DETAILS,
			PAGE_IDS.CREDIT_SCORE,
			PAGE_IDS.OBLIGATIONS,
			PAGE_IDS.SANCTION_PROFILE
		]);
		expect(sequence).toHaveLength(7);
	});
});

describe('Home Loan page sequences — BT / Top-up navigation flag', () => {
	it('Balance Transfer Only uses btTopUpSequence navigation', () => {
		expect(usesBtNavigation(LOAN_TYPE_VALUES.BALANCE_TRANSFER)).toBe(true);
	});

	it('Top-up Only uses btTopUpSequence navigation', () => {
		expect(usesBtNavigation(LOAN_TYPE_VALUES.TOP_UP)).toBe(true);
	});

	it('BT with Top-up uses btTopUpSequence navigation', () => {
		expect(usesBtNavigation(LOAN_TYPE_VALUES.BT_WITH_TOPUP)).toBe(true);
	});

	it('New Loan does NOT use btTopUpSequence navigation', () => {
		expect(usesBtNavigation(LOAN_TYPE_VALUES.NEW_LOAN)).toBe(false);
	});
});

describe('Home Loan visible pages — getVisiblePages', () => {
	it('New Loan + Yes includes property character, compliance/legal, seller, deal financials', () => {
		const pages = getVisiblePages(LOAN_TYPE_VALUES.NEW_LOAN, 'Yes');
		expect(pages).toContain(PAGE_IDS.PROPERTY_CHARACTER);
		expect(pages).toContain(PAGE_IDS.COMPLIANCE_LEGAL);
		expect(pages).toContain(PAGE_IDS.SELLER_TRANSACTION);
		expect(pages).toContain(PAGE_IDS.DEAL_FINANCIALS);
	});

	it('New Loan + No excludes property/deal pages and includes SANCTION_PROFILE', () => {
		const pages = getVisiblePages(LOAN_TYPE_VALUES.NEW_LOAN, 'No');
		expect(pages).not.toContain(PAGE_IDS.PROPERTY_CHARACTER);
		expect(pages).not.toContain(PAGE_IDS.COMPLIANCE_LEGAL);
		expect(pages).not.toContain(PAGE_IDS.SELLER_TRANSACTION);
		expect(pages).not.toContain(PAGE_IDS.DEAL_FINANCIALS);
		expect(pages).toContain(PAGE_IDS.SANCTION_PROFILE);
	});

	it('BT types include property character, BT existing loan and loan requirements', () => {
		const btTypes = [
			LOAN_TYPE_VALUES.BALANCE_TRANSFER,
			LOAN_TYPE_VALUES.TOP_UP,
			LOAN_TYPE_VALUES.BT_WITH_TOPUP
		] as const;

		for (const loanType of btTypes) {
			const pages = getVisiblePages(loanType);
			expect(pages, `${loanType} should include PROPERTY_CHARACTER`).toContain(
				PAGE_IDS.PROPERTY_CHARACTER
			);
			expect(pages, `${loanType} should include BT_EXISTING_LOAN`).toContain(
				PAGE_IDS.BT_EXISTING_LOAN
			);
			expect(pages, `${loanType} should include LOAN_REQUIREMENTS`).toContain(
				PAGE_IDS.LOAN_REQUIREMENTS
			);
		}
	});

	it('BT types include compliance/legal but exclude deal financials and sanction profile', () => {
		const btTypes = [
			LOAN_TYPE_VALUES.BALANCE_TRANSFER,
			LOAN_TYPE_VALUES.TOP_UP,
			LOAN_TYPE_VALUES.BT_WITH_TOPUP
		] as const;

		for (const loanType of btTypes) {
			const pages = getVisiblePages(loanType);
			expect(pages, `${loanType} should include COMPLIANCE_LEGAL`).toContain(
				PAGE_IDS.COMPLIANCE_LEGAL
			);
			expect(pages, `${loanType} should exclude DEAL_FINANCIALS`).not.toContain(
				PAGE_IDS.DEAL_FINANCIALS
			);
			expect(pages, `${loanType} should exclude SANCTION_PROFILE`).not.toContain(
				PAGE_IDS.SANCTION_PROFILE
			);
		}
	});

	it('all flows include income/credit/obligations pages', () => {
		const allFlows = [
			getVisiblePages(LOAN_TYPE_VALUES.NEW_LOAN, 'Yes'),
			getVisiblePages(LOAN_TYPE_VALUES.NEW_LOAN, 'No'),
			getVisiblePages(LOAN_TYPE_VALUES.BALANCE_TRANSFER),
			getVisiblePages(LOAN_TYPE_VALUES.TOP_UP),
			getVisiblePages(LOAN_TYPE_VALUES.BT_WITH_TOPUP)
		];

		for (const pages of allFlows) {
			expect(pages).toContain(PAGE_IDS.INCOME_PROFILES);
			expect(pages).toContain(PAGE_IDS.INCOME_DETAILS);
			expect(pages).toContain(PAGE_IDS.CREDIT_SCORE);
			expect(pages).toContain(PAGE_IDS.OBLIGATIONS);
		}
	});
});

describe('Home Loan page sequences — universal invariants', () => {
	it('APPLICANTS page is present in every sequence', () => {
		const allSequences = [
			getPageSequence(LOAN_TYPE_VALUES.NEW_LOAN, 'Yes'),
			getPageSequence(LOAN_TYPE_VALUES.NEW_LOAN, 'No'),
			getPageSequence(LOAN_TYPE_VALUES.BALANCE_TRANSFER),
			getPageSequence(LOAN_TYPE_VALUES.TOP_UP),
			getPageSequence(LOAN_TYPE_VALUES.BT_WITH_TOPUP)
		];

		for (const sequence of allSequences) {
			expect(sequence).toContain(PAGE_IDS.APPLICANTS);
		}
	});

	it('CASE_INTAKE page is always the first page in every sequence', () => {
		const allSequences = [
			getPageSequence(LOAN_TYPE_VALUES.NEW_LOAN, 'Yes'),
			getPageSequence(LOAN_TYPE_VALUES.NEW_LOAN, 'No'),
			getPageSequence(LOAN_TYPE_VALUES.BALANCE_TRANSFER),
			getPageSequence(LOAN_TYPE_VALUES.TOP_UP),
			getPageSequence(LOAN_TYPE_VALUES.BT_WITH_TOPUP)
		];

		for (const sequence of allSequences) {
			expect(sequence[0]).toBe(PAGE_IDS.CASE_INTAKE);
		}
	});
});

describe('Home Loan applicant step sequences', () => {
	it('getApplicantStepSequence(1) returns [0, 2] — skips relationships', () => {
		const steps = getApplicantStepSequence(1);
		expect(steps).toEqual([APPLICANT_STEPS.BASIC_DETAILS, APPLICANT_STEPS.INCOME_CREDIT]);
		expect(steps).toEqual([0, 2]);
	});

	it('getApplicantStepSequence(2) returns [0, 1, 2] — includes relationships', () => {
		const steps = getApplicantStepSequence(2);
		expect(steps).toEqual([
			APPLICANT_STEPS.BASIC_DETAILS,
			APPLICANT_STEPS.RELATIONSHIPS,
			APPLICANT_STEPS.INCOME_CREDIT
		]);
		expect(steps).toEqual([0, 1, 2]);
	});
});
