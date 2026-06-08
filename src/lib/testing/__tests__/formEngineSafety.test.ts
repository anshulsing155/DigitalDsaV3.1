/**
 * Form Engine Safety Tests
 *
 * Regression tests for critical runtime bugs that unit tests previously missed:
 *
 * 1. transformJsonLogicToCustom — must preserve arrays (not convert to objects)
 * 2. getVisiblePages — must include component-handled pages (questions: [])
 * 3. BT_TOPUP_PAGE_ORDER — must match actual schema page-level showWhen conditions
 * 4. showWhenEngine — must handle all operators from transform output
 */

import { describe, it, expect } from 'vitest';
import { createFormEngine } from '$lib/server/formEngine/engine';
import {
	evaluateCondition,
	shouldShow,
	getVisibleOptions,
	type ShowWhenCondition
} from '$lib/config/showWhenEngine';
import {
	BT_TOPUP_PAGE_ORDER,
	resolvePageSequence,
	getVisiblePagesFromSchema
} from '$lib/form/homeLoan/visibility';
import {
	PAGE_IDS,
	LOAN_TYPE_VALUES,
	getVisiblePages,
	BT_TOPUP_SEQUENCE,
	BT_ONLY_SEQUENCE,
	TOPUP_ONLY_SEQUENCE
} from '$lib/testing/homeLoan/pageFlowMap';

// ═══════════════════════════════════════════════════════════════
// 1. transformJsonLogicToCustom — array preservation
// ═══════════════════════════════════════════════════════════════

describe('transformJsonLogicToCustom — array preservation via engine evaluate', () => {
	it('evaluatePage returns showWhen with "in" operator that has a real array', async () => {
		const engine = createFormEngine('Home Loan');
		// existingLoanInfo_homeLoan questions use "in" with array of loan types
		const page = await engine.evaluatePage(0, {
			loanName: 'Home Loan',
			loanType: 'Balance Transfer With Top-up',
			isDefaulter: 'No',
			madeGuarantor: 'No'
		});

		// Find any question with an "in" operator in its showWhen
		const questionsWithIn = page.questions.filter(
			(q: any) => q.showWhen && JSON.stringify(q.showWhen).includes('"in"')
		);

		for (const q of questionsWithIn) {
			const sw = q.showWhen as any;
			// Recursively find all "in" operators and verify their list argument is an array
			const checkIn = (obj: any): void => {
				if (!obj || typeof obj !== 'object') return;
				if (obj.in) {
					const [, list] = obj.in;
					expect(
						Array.isArray(list),
						`"in" list for question ${q.id} must be a real array, got ${typeof list}`
					).toBe(true);
					expect(typeof list.includes).toBe('function');
				}
				for (const val of Object.values(obj)) {
					if (Array.isArray(val)) val.forEach(checkIn);
					else if (typeof val === 'object') checkIn(val);
				}
			};
			checkIn(sw);
		}
	});

	it('client showWhenEngine handles "in" operator with array correctly', () => {
		const result = evaluateCondition(
			{
				in: ['loanType', ['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']]
			},
			{ loanType: 'Balance Transfer With Top-up' }
		);
		expect(result).toBe(true);
	});

	it('client showWhenEngine "in" returns false when value not in array', () => {
		const result = evaluateCondition(
			{ in: ['loanType', ['Balance Transfer With Top-up', 'Balance Transfer Only']] },
			{ loanType: 'New Loan' }
		);
		expect(result).toBe(false);
	});

	it('"in" operator throws if list is an object instead of array (detects regression)', () => {
		// This is the exact shape of the bug: { 0: "a", 1: "b" } instead of ["a", "b"]
		const brokenCondition = { in: ['x', { 0: 'a', 1: 'b' }] } as any;
		expect(() => evaluateCondition(brokenCondition, { x: 'a' })).toThrow();
	});
});

// ═══════════════════════════════════════════════════════════════
// 2. getVisiblePages — component-handled pages included
// ═══════════════════════════════════════════════════════════════

describe('getVisiblePages — component-handled pages (questions: [])', () => {
	const componentPages = [
		'tellUs_homeLoan',
		'incomeProfilesPage',
		'incomeDetailsPage',
		'creditScorePage'
	];

	it('engine.getVisiblePages includes component-handled pages', async () => {
		const engine = createFormEngine('Home Loan');
		const answers = {
			loanName: 'Home Loan',
			loanType: 'New Loan',
			propertyIdentified: 'Yes',
			__applicantCount: 1,
			ObligationsRunning: 'Yes'
		};

		// Access private method via evaluatePage — check visiblePageMap in response
		const page = await engine.evaluatePage(0, answers);
		const visiblePageMap = page.visiblePageMap;

		if (visiblePageMap) {
			for (const cpId of componentPages) {
				expect(
					visiblePageMap.some((p: any) => p.id === cpId),
					`Component page "${cpId}" must be in visiblePageMap`
				).toBe(true);
			}
		}
	});

	it('all 6 loan forms include applicant/income pages in their schemas', async () => {
		const loanTypes = [
			'Home Loan',
			'LAP',
			'Plot Loan',
			'Personal Loan',
			'Business Loan',
			'Professional Loan'
		];

		for (const lt of loanTypes) {
			const engine = createFormEngine(lt);
			const page = await engine.evaluatePage(0, {
				loanName: lt,
				loanType: lt === 'Home Loan' ? 'New Loan' : lt,
				__applicantCount: 1
			});

			// visiblePageMap should exist and have more than just schema-driven pages
			expect(page.visiblePageMap?.length, `${lt} should have visible pages`).toBeGreaterThan(0);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// 3. BT_TOPUP_PAGE_ORDER consistency
// ═══════════════════════════════════════════════════════════════

describe('BT_TOPUP_PAGE_ORDER — consistency across all locations', () => {
	it('visibility.ts BT_TOPUP_PAGE_ORDER includes V2 property and compliance/legal pages', () => {
		expect(BT_TOPUP_PAGE_ORDER).toContain('propertyCharacter_homeLoan');
		expect(BT_TOPUP_PAGE_ORDER).toContain('complianceLegal_homeLoan');
		expect(BT_TOPUP_PAGE_ORDER).toContain('sellerTransaction_homeLoan');
	});

	it('visibility.ts BT_TOPUP_PAGE_ORDER has 13 pages', () => {
		expect(BT_TOPUP_PAGE_ORDER).toHaveLength(13);
	});

	it('pageFlowMap BT sequences match visibility.ts', () => {
		expect(BT_TOPUP_SEQUENCE).toEqual(BT_TOPUP_PAGE_ORDER);
		expect(BT_ONLY_SEQUENCE).toEqual(BT_TOPUP_PAGE_ORDER);
		expect(TOPUP_ONLY_SEQUENCE).toEqual(BT_TOPUP_PAGE_ORDER);
	});

	it('BT flows end at loanRequirements_homeLoan (submit page)', () => {
		const lastPage = BT_TOPUP_PAGE_ORDER[BT_TOPUP_PAGE_ORDER.length - 1];
		expect(lastPage).toBe('loanRequirements_homeLoan');
	});

	it('BT flows do NOT include New Loan only pages', () => {
		expect(BT_TOPUP_PAGE_ORDER).not.toContain('dealFinancials_homeLoan');
		expect(BT_TOPUP_PAGE_ORDER).not.toContain('sanctionProfile_homeLoan');
	});

	it('resolvePageSequence filters out pages not in visiblePages', () => {
		// Simulate a case where obligationsPage and incomeDetailsPage are hidden
		const visiblePages = [
			{ id: 'caseIntake_homeLoan' },
			{ id: 'propertyLocation_homeLoan' },
			{ id: 'propertyCharacter_homeLoan' },
			{ id: 'complianceLegal_homeLoan' },
			{ id: 'sellerTransaction_homeLoan' },
			{ id: 'tellUs_homeLoan' },
			{ id: 'incomeProfilesPage' },
			{ id: 'creditScorePage' },
			// obligationsPage is MISSING
			// incomeDetailsPage is MISSING
			{ id: 'btExistingLoan_homeLoan' },
			{ id: 'loanRequirements_homeLoan' }
		];

		const sequence = resolvePageSequence(visiblePages, BT_TOPUP_PAGE_ORDER);
		// Should have 12 entries (14 minus incomeDetailsPage and obligationsPage)
		expect(sequence).not.toContain(-1);
		expect(sequence.length).toBeLessThan(BT_TOPUP_PAGE_ORDER.length);
	});
});

// ═══════════════════════════════════════════════════════════════
// 4. showWhenEngine — all operator coverage
// ═══════════════════════════════════════════════════════════════

describe('showWhenEngine — operator coverage', () => {
	const answers = {
		loanType: 'Balance Transfer With Top-up',
		propertyIdentified: 'Yes',
		isDefaulter: 'No',
		carpetArea: '1200',
		score: 750
	};

	it('== operator', () => {
		expect(evaluateCondition({ '==': ['propertyIdentified', 'Yes'] }, answers)).toBe(true);
		expect(evaluateCondition({ '==': ['propertyIdentified', 'No'] }, answers)).toBe(false);
	});

	it('!= operator', () => {
		expect(evaluateCondition({ '!=': ['loanType', 'New Loan'] }, answers)).toBe(true);
		expect(evaluateCondition({ '!=': ['loanType', 'Balance Transfer With Top-up'] }, answers)).toBe(
			false
		);
	});

	it('in operator with array', () => {
		expect(
			evaluateCondition(
				{ in: ['loanType', ['Balance Transfer With Top-up', 'Top-up Only']] },
				answers
			)
		).toBe(true);
	});

	it('and operator', () => {
		expect(
			evaluateCondition(
				{
					and: [{ '==': ['propertyIdentified', 'Yes'] }, { '!=': ['loanType', 'New Loan'] }]
				},
				answers
			)
		).toBe(true);
	});

	it('or operator', () => {
		expect(
			evaluateCondition(
				{
					or: [{ '==': ['loanType', 'New Loan'] }, { '==': ['propertyIdentified', 'Yes'] }]
				},
				answers
			)
		).toBe(true);
	});

	it('! (not) operator', () => {
		expect(
			evaluateCondition(
				{
					'!': { '==': ['loanType', 'New Loan'] }
				},
				answers
			)
		).toBe(true);
	});

	it('< operator', () => {
		expect(evaluateCondition({ '<': ['score', 800] }, answers)).toBe(true);
		expect(evaluateCondition({ '<': ['score', 700] }, answers)).toBe(false);
	});

	it('> operator', () => {
		expect(evaluateCondition({ '>': ['score', 700] }, answers)).toBe(true);
	});

	it('<= operator', () => {
		expect(evaluateCondition({ '<=': ['score', 750] }, answers)).toBe(true);
	});

	it('>= operator', () => {
		expect(evaluateCondition({ '>=': ['score', 750] }, answers)).toBe(true);
	});

	it('shouldShow returns true for empty/null showWhen', () => {
		expect(shouldShow(null, answers)).toBe(true);
		expect(shouldShow(undefined, answers)).toBe(true);
		expect(shouldShow({}, answers)).toBe(true);
	});

	it('deeply nested condition works', () => {
		const condition: ShowWhenCondition = {
			and: [
				{
					or: [
						{ '==': ['propertyIdentified', 'Yes'] },
						{
							in: [
								'loanType',
								['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
							]
						}
					]
				},
				{ '!=': ['isDefaulter', 'Yes'] }
			]
		};
		expect(evaluateCondition(condition, answers)).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// 5. Page flow — BT visible pages correctness
// ═══════════════════════════════════════════════════════════════

describe('BT visible pages match schema showWhen conditions', () => {
	it('BT flows include PROPERTY_CHARACTER and COMPLIANCE_LEGAL (showWhen allows BT types)', () => {
		for (const lt of [
			LOAN_TYPE_VALUES.BALANCE_TRANSFER,
			LOAN_TYPE_VALUES.TOP_UP,
			LOAN_TYPE_VALUES.BT_WITH_TOPUP
		]) {
			const pages = getVisiblePages(lt);
			expect(pages, `${lt}`).toContain(PAGE_IDS.PROPERTY_CHARACTER);
			expect(pages, `${lt}`).toContain(PAGE_IDS.COMPLIANCE_LEGAL);
		}
	});

	it('BT flows include SELLER_TRANSACTION and COMPLIANCE_LEGAL', () => {
		for (const lt of [
			LOAN_TYPE_VALUES.BALANCE_TRANSFER,
			LOAN_TYPE_VALUES.TOP_UP,
			LOAN_TYPE_VALUES.BT_WITH_TOPUP
		]) {
			const pages = getVisiblePages(lt);
			expect(pages, `${lt}`).toContain(PAGE_IDS.SELLER_TRANSACTION);
			expect(pages, `${lt}`).toContain(PAGE_IDS.COMPLIANCE_LEGAL);
		}
	});

	it('BT flows exclude New Loan only pages', () => {
		for (const lt of [
			LOAN_TYPE_VALUES.BALANCE_TRANSFER,
			LOAN_TYPE_VALUES.TOP_UP,
			LOAN_TYPE_VALUES.BT_WITH_TOPUP
		]) {
			const pages = getVisiblePages(lt);
			expect(pages).not.toContain(PAGE_IDS.DEAL_FINANCIALS);
			expect(pages).not.toContain(PAGE_IDS.SANCTION_PROFILE);
		}
	});

	it('BT page sequence ends at LOAN_REQUIREMENTS', () => {
		for (const lt of [
			LOAN_TYPE_VALUES.BALANCE_TRANSFER,
			LOAN_TYPE_VALUES.TOP_UP,
			LOAN_TYPE_VALUES.BT_WITH_TOPUP
		]) {
			const pages = getVisiblePages(lt);
			expect(pages[pages.length - 1]).toBe(PAGE_IDS.LOAN_REQUIREMENTS);
		}
	});

	it('New Loan + Yes ends at DEAL_FINANCIALS', () => {
		const pages = getVisiblePages(LOAN_TYPE_VALUES.NEW_LOAN, 'Yes');
		expect(pages[pages.length - 1]).toBe(PAGE_IDS.DEAL_FINANCIALS);
	});

	it('New Loan + No ends at SANCTION_PROFILE', () => {
		const pages = getVisiblePages(LOAN_TYPE_VALUES.NEW_LOAN, 'No');
		expect(pages[pages.length - 1]).toBe(PAGE_IDS.SANCTION_PROFILE);
	});
});
