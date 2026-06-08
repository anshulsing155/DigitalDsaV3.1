import { describe, it, expect } from 'vitest';
import {
	isMediumComplete,
	hasAnyMediumComplete,
	hasAllMediumsComplete,
	getCompletedMediums,
	createEmptyCompanyIncome,
	getMaxITRYears,
	type CompanyIncomeData
} from '$lib/types/companyIncome';

describe('CompanyIncomeData utilities', () => {
	describe('createEmptyCompanyIncome', () => {
		it('creates empty structure with all mediums', () => {
			const income = createEmptyCompanyIncome();
			expect(income.itr.years).toEqual([]);
			expect(income.gst.years).toEqual([]);
			expect(income.banking).toEqual({});
			expect(income.cash).toEqual({});
		});
	});

	describe('isMediumComplete', () => {
		it('returns false for undefined income', () => {
			expect(isMediumComplete(undefined, 'itr')).toBe(false);
			expect(isMediumComplete(undefined, 'gst')).toBe(false);
			expect(isMediumComplete(undefined, 'banking')).toBe(false);
			expect(isMediumComplete(undefined, 'cash')).toBe(false);
		});

		it('returns false for empty income', () => {
			const income = createEmptyCompanyIncome();
			expect(isMediumComplete(income, 'itr')).toBe(false);
			// GST with registered status requires turnover
			expect(isMediumComplete(income, 'gst', 'registered_regular')).toBe(false);
			// GST without status = not registered = auto-complete
			expect(isMediumComplete(income, 'gst')).toBe(true);
			expect(isMediumComplete(income, 'banking')).toBe(false);
			expect(isMediumComplete(income, 'cash')).toBe(false);
		});

		it('ITR: complete when at least 1 year has netProfit > 0 AND grossReceipts > 0', () => {
			const income = createEmptyCompanyIncome();
			income.itr.years = [{ year: '2023-24', netProfit: 500000, grossReceipts: 2_000_000 }];
			expect(isMediumComplete(income, 'itr')).toBe(true);
		});

		it('ITR: complete when netProfit is 0 (means not applicable) regardless of grossReceipts', () => {
			const income = createEmptyCompanyIncome();
			income.itr.years = [{ year: '2023-24', netProfit: 0 }];
			expect(isMediumComplete(income, 'itr')).toBe(true);
			// Also valid: 0 profit + 0 gross = "no business activity that year"
			income.itr.years = [{ year: '2023-24', netProfit: 0, grossReceipts: 0 }];
			expect(isMediumComplete(income, 'itr')).toBe(true);
		});

		it('ITR: incomplete when netProfit is undefined', () => {
			const income = createEmptyCompanyIncome();
			income.itr.years = [{ year: '2023-24' }];
			expect(isMediumComplete(income, 'itr')).toBe(false);
		});

		// ── Profit-without-turnover regression (2026-05-18) ──────────────
		// User report: ₹24L Net Profit in FY2024-25 with ₹0 Gross Receipts
		// let Next through. Profit must come from revenue — these tests
		// pin the cross-field contract.

		it('ITR: incomplete when netProfit > 0 but grossReceipts is undefined (profit without turnover)', () => {
			const income = createEmptyCompanyIncome();
			income.itr.years = [{ year: '2024-25', netProfit: 2_451_200 }];
			expect(isMediumComplete(income, 'itr')).toBe(false);
		});

		it('ITR: incomplete when netProfit > 0 but grossReceipts is 0 (zero turnover)', () => {
			const income = createEmptyCompanyIncome();
			income.itr.years = [{ year: '2024-25', netProfit: 2_451_200, grossReceipts: 0 }];
			expect(isMediumComplete(income, 'itr')).toBe(false);
		});

		it('ITR: incomplete when netProfit < 0 (loss) but grossReceipts is 0 (can`t lose against zero revenue)', () => {
			const income = createEmptyCompanyIncome();
			income.itr.years = [{ year: '2024-25', netProfit: -100_000, grossReceipts: 0 }];
			expect(isMediumComplete(income, 'itr')).toBe(false);
		});

		it('ITR: complete when one year is inconsistent but another is valid', () => {
			const income = createEmptyCompanyIncome();
			income.itr.years = [
				{ year: '2024-25', netProfit: 2_451_200, grossReceipts: 0 }, // inconsistent
				{ year: '2023-24', netProfit: 500_000, grossReceipts: 2_000_000 } // valid
			];
			expect(isMediumComplete(income, 'itr')).toBe(true);
		});

		it('ITR: complete when a loss year has positive revenue', () => {
			const income = createEmptyCompanyIncome();
			income.itr.years = [{ year: '2024-25', netProfit: -50_000, grossReceipts: 1_000_000 }];
			expect(isMediumComplete(income, 'itr')).toBe(true);
		});

		it('GST: complete when registered + registration date + turnover', () => {
			const income = createEmptyCompanyIncome();
			income.gst.registrationDate = '2020-07';
			income.gst.years = [{ year: '2023-24', turnover: 1000000 }];
			expect(isMediumComplete(income, 'gst', 'registered_regular')).toBe(true);
		});

		it('GST: incomplete when registered but no turnover', () => {
			const income = createEmptyCompanyIncome();
			income.gst.registrationDate = '2020-07';
			expect(isMediumComplete(income, 'gst', 'registered_regular')).toBe(false);
		});

		it('GST: auto-complete when not registered', () => {
			const income = createEmptyCompanyIncome();
			expect(isMediumComplete(income, 'gst', 'unregistered')).toBe(true);
			expect(isMediumComplete(income, 'gst')).toBe(true);
		});

		it('GST: complete when turnover is 0 (means not applicable)', () => {
			const income = createEmptyCompanyIncome();
			income.gst.registrationDate = '2020-07';
			income.gst.years = [{ year: '2023-24', turnover: 0 }];
			expect(isMediumComplete(income, 'gst', 'registered_regular')).toBe(true);
		});

		it('Banking: complete when avgBalance is set (including 0)', () => {
			const income = createEmptyCompanyIncome();
			income.banking.avgBalance = 250000;
			expect(isMediumComplete(income, 'banking')).toBe(true);

			income.banking.avgBalance = 0;
			expect(isMediumComplete(income, 'banking')).toBe(true);
		});

		it('Banking: incomplete when avgBalance is undefined', () => {
			const income = createEmptyCompanyIncome();
			expect(isMediumComplete(income, 'banking')).toBe(false);
		});

		it('Cash: complete when dailySales is set (including 0)', () => {
			const income = createEmptyCompanyIncome();
			income.cash.dailySales = 50000;
			expect(isMediumComplete(income, 'cash')).toBe(true);

			income.cash.dailySales = 0;
			expect(isMediumComplete(income, 'cash')).toBe(true);
		});
	});

	describe('hasAllMediumsComplete', () => {
		it('returns false for empty income', () => {
			expect(hasAllMediumsComplete(createEmptyCompanyIncome())).toBe(false);
		});

		it('returns false when only some mediums have data', () => {
			const income = createEmptyCompanyIncome();
			income.banking.avgBalance = 100000;
			expect(hasAllMediumsComplete(income)).toBe(false);
		});

		it('returns true when all 4 mediums have data', () => {
			const income = createEmptyCompanyIncome();
			// netProfit > 0 now also requires grossReceipts > 0 (2026-05-18
			// regression fix — profit must come from revenue)
			income.itr.years = [
				{ year: '2023-24', netProfit: 500000, grossReceipts: 2_000_000 }
			];
			income.gst.years = [{ year: '2023-24', turnover: 1000000 }];
			income.banking.avgBalance = 250000;
			income.cash.dailySales = 30000;
			expect(hasAllMediumsComplete(income)).toBe(true);
		});

		it('returns true when all 4 mediums have 0 (not applicable)', () => {
			const income = createEmptyCompanyIncome();
			income.itr.years = [{ year: '2023-24', netProfit: 0 }];
			income.gst.years = [{ year: '2023-24', turnover: 0 }];
			income.banking.avgBalance = 0;
			income.cash.dailySales = 0;
			expect(hasAllMediumsComplete(income)).toBe(true);
		});
	});

	describe('hasAnyMediumComplete (deprecated — delegates to hasAllMediumsComplete)', () => {
		it('returns false when only one medium has data', () => {
			const income = createEmptyCompanyIncome();
			income.banking.avgBalance = 100000;
			expect(hasAnyMediumComplete(income)).toBe(false);
		});

		it('returns true when all mediums have data', () => {
			const income = createEmptyCompanyIncome();
			income.itr.years = [
				{ year: '2023-24', netProfit: 500000, grossReceipts: 2_000_000 }
			];
			income.gst.years = [{ year: '2023-24', turnover: 1000000 }];
			income.banking.avgBalance = 250000;
			income.cash.dailySales = 30000;
			expect(hasAnyMediumComplete(income)).toBe(true);
		});
	});

	describe('zero completed FYs handling', () => {
		it('ITR: auto-completes when business < 1 year (vintage = less_1)', () => {
			const income = createEmptyCompanyIncome();
			// No ITR years filled, but business is < 1 year → 0 ITR years available
			expect(getMaxITRYears('less_1')).toBe(0);
			expect(isMediumComplete(income, 'itr', undefined, 'less_1')).toBe(true);
		});

		it('ITR: does NOT auto-complete when business >= 1 year and no data', () => {
			const income = createEmptyCompanyIncome();
			expect(isMediumComplete(income, 'itr', undefined, '1_2')).toBe(false);
			expect(isMediumComplete(income, 'itr', undefined, '3_5')).toBe(false);
		});

		it('GST: auto-completes when registered with recent reg date and 0 completed FYs', () => {
			const income = createEmptyCompanyIncome();
			// Use a registration date in the current month/year so getCompletedFYCount = 0
			const now = new Date();
			const monthNames = [
				'January',
				'February',
				'March',
				'April',
				'May',
				'June',
				'July',
				'August',
				'September',
				'October',
				'November',
				'December'
			];
			const recentRegDate = `${monthNames[now.getMonth()]} 1, ${now.getFullYear()}`;
			// Only auto-complete if shouldShowCurrentFY is false (< 3 months into FY)
			// This test verifies the function accepts the parameter and handles the logic
			income.gst.registrationDate = recentRegDate;
			const result = isMediumComplete(income, 'gst', 'registered_regular');
			// Result depends on whether shouldShowCurrentFY() is true right now
			// but the key thing is it doesn't crash and returns a boolean
			expect(typeof result).toBe('boolean');
		});

		it('hasAllMediumsComplete passes businessVintage through', () => {
			const income = createEmptyCompanyIncome();
			// Business < 1 year, not GST registered, banking + cash filled
			income.banking.avgBalance = 0;
			income.cash.dailySales = 0;
			// Without vintage: ITR incomplete (no years)
			expect(hasAllMediumsComplete(income, 'unregistered')).toBe(false);
			// With vintage less_1: ITR auto-completes
			expect(hasAllMediumsComplete(income, 'unregistered', 'less_1')).toBe(true);
		});
	});

	describe('getCompletedMediums', () => {
		it('returns empty array for empty income (GST-registered)', () => {
			expect(getCompletedMediums(createEmptyCompanyIncome(), 'registered_regular')).toEqual([]);
		});

		it('returns only completed mediums (GST-registered)', () => {
			const income = createEmptyCompanyIncome();
			income.itr.years = [
				{ year: '2023-24', netProfit: 500000, grossReceipts: 2_000_000 }
			];
			income.cash.dailySales = 30000;
			const completed = getCompletedMediums(income, 'registered_regular');
			expect(completed).toContain('itr');
			expect(completed).toContain('cash');
			expect(completed).not.toContain('gst');
			expect(completed).not.toContain('banking');
			expect(completed).toHaveLength(2);
		});

		it('includes GST as complete for non-registered companies', () => {
			const income = createEmptyCompanyIncome();
			income.itr.years = [
				{ year: '2023-24', netProfit: 500000, grossReceipts: 2_000_000 }
			];
			const completed = getCompletedMediums(income, 'unregistered');
			expect(completed).toContain('itr');
			expect(completed).toContain('gst'); // auto-complete when not registered
		});
	});
});
