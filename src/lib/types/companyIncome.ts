/**
 * Company Income Types
 * ═══════════════════════════════════════════════════════════════════
 * Structured income data for Company applicants captured through
 * 4 mediums: ITR, GST, Banking, Cash.
 *
 * Lenders pick whichever medium gives the highest eligible loan amount,
 * so DSAs are encouraged to fill all applicable mediums.
 * ═══════════════════════════════════════════════════════════════════
 */

// ── Business Category ────────────────────────────────────────────

/** The 4 lender-aligned business categories (SENP classification) */
export type BusinessCategoryType = 'manufacturing' | 'trading' | 'services' | 'commission_agency';

/** A selected category with its revenue share percentage */
export interface BusinessCategoryEntry {
	category: BusinessCategoryType;
	/** Revenue contribution percentage (all entries should roughly total 100) */
	revenueShare: number;
}

// ── Income Mediums ───────────────────────────────────────────────

/** ITR-based income: 3-year financials */
export interface CompanyITRIncome {
	years: CompanyITRYear[];
}

export interface CompanyITRYear {
	/** Fiscal year label e.g. "2023-24" */
	year: string;
	/** Net profit as per ITR (₹) */
	netProfit?: number;
	/** Depreciation + Interest as per ITR (₹) */
	depreciation?: number;
	/** Gross receipts / total revenue (₹) */
	grossReceipts?: number;
	/** Whether ITR was filed for this year */
	itrFiled?: boolean;
}

/** GST revenue-based income */
export interface CompanyGSTIncome {
	/** GST registration date (month-year string e.g. "2020-07") */
	registrationDate?: string;
	years: CompanyGSTYear[];
	/** Partial current FY GST turnover (collected when ≥3 months of FY completed) */
	currentFYTurnover?: number | null;
}

export interface CompanyGSTYear {
	/** Fiscal year label */
	year: string;
	/** GST turnover / gross receipts for this year (₹) */
	turnover?: number;
}

/** Banking-based income */
export interface CompanyBankingIncome {
	/** Average current account balance over 12 months (₹) */
	avgBalance?: number;
	/** Number of current accounts */
	accountCount?: string;
	/** Has CC/OD (Cash Credit / Overdraft) facility */
	hasCCOD?: boolean;
	/** CC/OD sanctioned limit (₹) */
	ccodLimit?: number;
}

/** Cash income */
export interface CompanyCashIncome {
	/** Average daily cash sales (₹) */
	dailySales?: number;
	/** How cash is collected */
	collectionMethod?: 'counter_sales' | 'door_to_door' | 'digital_cash_mix';
}

/** Complete company income data across all 4 mediums */
export interface CompanyIncomeData {
	itr: CompanyITRIncome;
	gst: CompanyGSTIncome;
	banking: CompanyBankingIncome;
	cash: CompanyCashIncome;
}

// ── Medium Completion Utilities ──────────────────────────────────

export type CompanyIncomeMedium = 'itr' | 'gst' | 'banking' | 'cash';

/** Check if a specific income medium has been filled (0 is valid — means "not applicable") */
export function isMediumComplete(
	income: CompanyIncomeData | undefined,
	medium: CompanyIncomeMedium,
	/** Pass applicant's gstStatus to determine if GST turnover is required */
	gstStatus?: string,
	/** Pass business vintage for ITR zero-year auto-complete */
	businessVintage?: string
): boolean {
	if (!income) return false;

	switch (medium) {
		case 'itr': {
			// Business < 1 year old → 0 ITR years available → auto-complete
			if (businessVintage && getMaxITRYears(businessVintage) === 0) return true;
			const years = income.itr?.years ?? [];

			// Gate 1: any year with itrFiled === true MUST have all 3 amounts filled.
			// User-reported 2026-05-26 (BL Income modal Issue 3b screenshot): the
			// FY2025-26 row had ITR Filed checked but Net Profit / Depreciation /
			// Gross Receipts were all empty, and the Income tab still completed.
			const itrCheckedButEmpty = years.some(
				(y) =>
					y.itrFiled === true &&
					(y.netProfit == null || y.depreciation == null || y.grossReceipts == null)
			);
			if (itrCheckedButEmpty) return false;

			// Gate 2: no year may have Net Profit > Gross Receipts (impossible —
			// profit can't exceed the revenue it came from). User-reported 2026-05-26
			// (BL Income modal Issue 3a screenshot): NP ₹26L / GR ₹22L and Next was
			// still enabled. CustomIncomeTable's fieldErrors already flags this for
			// the per-form Save path, but the Company income modal's tab-completion
			// went through this separate hasAllMediumsComplete codepath which only
			// did the "some year has data" check.
			const profitExceedsRevenue = years.some(
				(y) =>
					y.netProfit != null &&
					y.grossReceipts != null &&
					y.grossReceipts > 0 &&
					y.netProfit > y.grossReceipts
			);
			if (profitExceedsRevenue) return false;

			// Gate 3: cash profit (NP + Depreciation) > 1.1x Turnover is implausible.
			// Mirrors the 10% tolerance in CustomIncomeTable line ~431 (rounding +
			// minor other-income headroom; true data-entry errors still caught).
			const cashProfitExceedsRevenue = years.some((y) => {
				if (y.netProfit == null || y.depreciation == null || y.grossReceipts == null) return false;
				if (y.grossReceipts <= 0) return false;
				return y.netProfit + y.depreciation > y.grossReceipts * 1.1;
			});
			if (cashProfitExceedsRevenue) return false;

			// Gate 4 (original "at least one valid year" requirement): netProfit must
			// be filled; netProfit===0 is OK (no business activity); non-zero needs
			// grossReceipts>0. Catches the "₹24L profit / ₹0 turnover" inconsistency
			// reported 2026-05-18.
			return years.some((y) => {
				if (y.netProfit == null) return false;
				if (y.netProfit === 0) return true;
				return y.grossReceipts != null && y.grossReceipts > 0;
			});
		}
		case 'gst': {
			const isRegistered =
				gstStatus === 'registered_regular' || gstStatus === 'registered_composition';
			if (!isRegistered) return true; // Not GST-registered → auto-complete
			// GST-registered but 0 completed FYs and current FY not yet showable → nothing to fill → auto-complete
			const regDate = income.gst?.registrationDate;
			if (regDate && getCompletedFYCount(regDate) === 0) return true;
			// GST-registered: need registration date + at least one year with turnover data
			// Accepts: completed FY turnover in itr.years.grossReceipts, gst.years.turnover, or currentFYTurnover
			const hasGSTTurnover = (income.gst?.years ?? []).some((y) => y.turnover != null);
			const hasITRTurnover = (income.itr?.years ?? []).some((y) => y.grossReceipts != null);
			const hasCurrentFY = income.gst?.currentFYTurnover != null;
			return !!regDate && (hasGSTTurnover || hasITRTurnover || hasCurrentFY);
		}
		case 'banking':
			return income.banking?.avgBalance != null;
		case 'cash':
			// Required — enter 0 if the business doesn't deal in cash.
			// null/undefined = not yet answered; 0 = explicitly "no cash income" (valid).
			return income.cash?.dailySales != null;
	}
}

/** ALL 4 income mediums must be filled (put 0 if not relevant) */
export function hasAllMediumsComplete(
	income: CompanyIncomeData | undefined,
	gstStatus?: string,
	businessVintage?: string
): boolean {
	if (!income) return false;
	const mediums: CompanyIncomeMedium[] = ['itr', 'gst', 'banking', 'cash'];
	return mediums.every((m) => isMediumComplete(income, m, gstStatus, businessVintage));
}

/** @deprecated Use hasAllMediumsComplete — all mediums required */
export function hasAnyMediumComplete(
	income: CompanyIncomeData | undefined,
	gstStatus?: string,
	businessVintage?: string
): boolean {
	return hasAllMediumsComplete(income, gstStatus, businessVintage);
}

/** Get list of completed mediums */
export function getCompletedMediums(
	income: CompanyIncomeData | undefined,
	gstStatus?: string,
	businessVintage?: string
): CompanyIncomeMedium[] {
	if (!income) return [];
	const mediums: CompanyIncomeMedium[] = ['itr', 'gst', 'banking', 'cash'];
	return mediums.filter((m) => isMediumComplete(income, m, gstStatus, businessVintage));
}

/** Create empty CompanyIncomeData structure */
export function createEmptyCompanyIncome(): CompanyIncomeData {
	return {
		itr: { years: [] },
		gst: { registrationDate: undefined, years: [] },
		banking: {},
		cash: {}
	};
}

// ── Business Vintage → ITR Year Utilities ──────────────────────

/**
 * Map business vintage answer to maximum ITR years available.
 *
 * Accepts multiple value formats used across the codebase:
 *   Company profile:   'less_1', '1_2', '2_3', '3_5', '5_10', 'over_10'
 *   Income sources:    '1' (<1yr), '2' (1-2yr), '3' (2-3yr), '3plus' (>3yr)
 *   Practice/Freelance: 'lt_1y', '1_2y', '2_3y', 'gt_3y'
 */
export function getMaxITRYears(businessVintage: string | undefined): number {
	switch (businessVintage) {
		// Company profile format
		case 'less_1':
			return 0;
		case '1_2':
			return 1;
		case '2_3':
			return 2;
		case '3_5':
			return 3;
		case '5_10':
		case 'over_10':
			return 4;

		// Income source format (business_owner specifics)
		case '1':
			return 0; // Less than 1 year
		case '2':
			return 1; // 1-2 years
		case '3':
			return 2; // 2-3 years
		case '3plus':
			return 3; // More than 3 years

		// Practice / Freelance format
		case 'lt_1y':
			return 0; // Less than 1 year
		case '1_2y':
			return 1; // 1-2 years
		case '2_3y':
			return 2; // 2-3 years
		case 'gt_3y':
			return 3; // More than 3 years

		default:
			return 4; // not answered yet → show all
	}
}

/**
 * Check if ITR for a given FY is likely available.
 * ITR for FY X (e.g. 2024-25) is typically filed by September of the next year (Sep 2025).
 * Returns true if current date is past September of fyStartYear + 1.
 */
export function isITRAvailableForFY(fyStartYear: number, now = new Date()): boolean {
	const filingDeadlineYear = fyStartYear + 1;
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1; // 1-indexed
	if (currentYear > filingDeadlineYear) return true;
	if (currentYear === filingDeadlineYear && currentMonth >= 10) return true; // After September
	return false;
}

/**
 * Count completed financial years with FULL GST data since registration.
 *
 * A FY is "fully covered" only if the business was GST-registered before
 * that FY started (April 1). The registration FY itself is partial — GST
 * records only exist from the registration month onward, not the full year.
 * Exception: registration in April = full FY coverage (registered at start).
 *
 * The CURRENT (ongoing) FY is never counted — it hasn't ended yet.
 *
 * Example: GST registered Feb 2025, today April 2026
 *   → FY 2024-25 is partial (Feb–Mar only) → skip
 *   → FY 2025-26 is fully covered (Apr 2025–Mar 2026) and completed → count 1
 *   → FY 2026-27 is current → skip
 *   → returns 1
 */
export function getCompletedFYCount(gstRegDate: string | undefined): number {
	if (!gstRegDate) return 0;
	const parts = gstRegDate.split('-');
	if (parts.length < 2) return 0;

	const month = new Date(`${parts[0]} 1, ${parts[1]}`).getMonth() + 1;
	const year = parseInt(parts[1]);
	if (isNaN(year)) return 0;

	// FY that contains the registration date
	const regFYStart = month >= 4 ? year : year - 1;

	// First FY with a FULL year of GST data:
	// - If registered in April (month 4), the registration FY itself is full
	// - Otherwise, the next FY (starting the following April) is the first full one
	const firstFullFYStart = month === 4 ? regFYStart : regFYStart + 1;

	// Current FY start (the FY we're in now — not yet completed)
	const today = new Date();
	const currentFYStart = today.getMonth() + 1 >= 4 ? today.getFullYear() : today.getFullYear() - 1;

	// Count only completed FYs (current FY excluded since it's ongoing)
	return Math.max(0, currentFYStart - firstFullFYStart);
}

/** Generate last N fiscal years (most recent first) — only COMPLETED FYs */
export function getRecentFinancialYears(count = 4, date = new Date()): string[] {
	const years: string[] = [];
	const currentYear = date.getFullYear();
	const currentMonth = date.getMonth() + 1;
	const startYear = currentMonth >= 4 ? currentYear : currentYear - 1;

	for (let i = 0; i < count; i++) {
		const fyStart = startYear - i - 1;
		const fyEnd = startYear - i;
		years.push(`FY${fyStart}-${fyEnd.toString().slice(-2)}`);
	}
	return years;
}

// ── Current FY utilities (shared across all loan types) ─────────

/**
 * Get the current financial year label.
 * Indian FY runs April–March (e.g., FY2025-26 for Apr 2025–Mar 2026)
 */
export function getCurrentFY(date = new Date()): string {
	const currentYear = date.getFullYear();
	const currentMonth = date.getMonth() + 1;
	const fyStart = currentMonth >= 4 ? currentYear : currentYear - 1;
	return `FY${fyStart}-${(fyStart + 1).toString().slice(-2)}`;
}

/**
 * How many months have been completed in the current FY.
 * Indian FY starts April. E.g., in March 2026 → FY2025-26, 11 months completed (Apr–Feb).
 */
export function getCurrentFYMonthsCompleted(date = new Date()): number {
	const month = date.getMonth() + 1; // 1-12
	// FY starts April (month 4). In April, 0 months completed; in March, 11 completed.
	return month >= 4 ? month - 4 : month + 8;
}

/**
 * Whether to show the current FY row for data collection.
 * Rule: show if ≥3 months of the current FY have been completed.
 * This applies universally — company ITR/GST, individual income, professional gross receipts.
 */
export function shouldShowCurrentFY(date = new Date()): boolean {
	return getCurrentFYMonthsCompleted(date) >= 3;
}

/**
 * Get the last completed month name in the current FY.
 * E.g., in March 2026 → "February 2026"
 */
export function getCurrentFYLastCompletedMonth(date = new Date()): string {
	const months = [
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
	// Last completed month = previous month
	const prevMonthIdx = date.getMonth() === 0 ? 11 : date.getMonth() - 1;
	const year = date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear();
	return `${months[prevMonthIdx]} ${year}`;
}

/**
 * Get the short label for current FY partial period.
 * E.g., "Apr–Feb 2026 (11 months)"
 */
export function getCurrentFYPartialLabel(date = new Date()): string {
	const months = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec'
	];
	const completed = getCurrentFYMonthsCompleted(date);
	if (completed <= 0) return '';
	// Last completed month
	const prevMonthIdx = date.getMonth() === 0 ? 11 : date.getMonth() - 1;
	const year = date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear();
	return `Apr–${months[prevMonthIdx]} ${year} (${completed} months)`;
}
