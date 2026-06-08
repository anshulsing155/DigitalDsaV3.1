/**
 * RE-2 Payload Enricher
 *
 * Pre-computes derived fields from the loan payload that JSON-Logic rules
 * can reference via `_computed.*` paths. Runs once per evaluation, before
 * any rule evaluation.
 *
 * All computed fields are read-only aggregates — they never modify the
 * original payload data.
 */

import type {
	LoanApplicationPayload,
	LoanTransactionPayload,
	ApplicantPayload,
	CleanIncomeEntry,
	RelationshipEntry
} from '$lib/utils/payloadBuilder.js';
import { ENRICHER_CREDIT_LINE_FACTOR, canonicalLoanName } from './systemConfig.js';
import { computeApplicantEmiShare } from '$lib/utils/emiShareCalculator.js';
import { selectYoungest, selectBestEmployment } from './applicantSelectors.js';
import { deriveCompanyFamilyControl } from '$lib/utils/familyControlDerivation.js';
import type { DirectorInfo } from '$lib/types/form.js';
import type {
	Relationship,
	RelationType,
	RelationshipCategory
} from '$lib/components/relationship-capture/types.js';

// ============================================================================
// COMPUTED FIELDS INTERFACE
// ============================================================================

export interface ComputedFields {
	_total_gross_monthly: number;
	_total_obligations_monthly: number;
	_applicant_count: number;
	_has_co_applicant: boolean;
	_primary_age: number;
	_primary_employment: string;
	_is_business_file: boolean;
	_is_salaried_file: boolean;
	_max_cibil: number;
	_min_cibil: number;
	_total_vintage_years: number;
	_income_source_count: number;
	_income_profile_types: string[];

	/**
	 * Unsecured facility type: "Term Loan" | "Overdraft (OD)" | "Drop-line OverDraft (DOD)" | "Cash Credit (CC)"
	 * Empty string for secured loans.
	 */
	_facility_type: string;

	/**
	 * Whether this is a credit-line facility (OD/DOD/CC) vs a term loan.
	 * Credit lines have different calculation treatment:
	 * - Interest on utilized amount only (not full limit)
	 * - FOIR counts % of limit, not EMI
	 * - No fixed EMI schedule
	 */
	_is_credit_line_facility: boolean;

	/** Whether any applicant has isNonEarning = true (no_current_income selected) */
	_has_non_earner: boolean;

	/** Sum of EMIs where emiPaidBy is set and != 'self' (third-party payment arrangements) */
	_third_party_emi_total: number;

	/**
	 * Per-entry income signals — one record per income entry across all applicants.
	 *
	 * Carries the monthly income figure the engine used PLUS metadata lenders
	 * (and the file builder) need to make informed decisions:
	 *
	 *  - `trend` (`'growing' | 'flat' | 'declining'`): YoY trend computed
	 *    from all valid filed-year cells for multi-year profiles (business
	 *    proprietorship / professional practice). Null when there's < 2
	 *    filed years.
	 *  - `limited_vintage`: true when only 1 valid filed-year cell exists.
	 *    Lender rules may want to require ≥2 filed ITRs.
	 *  - `is_foreign_salaried`: true for `director_company` /
	 *    `business_partnership` entries that went down the form's
	 *    foreign-firm / foreign-company salaried path. Lenders that don't
	 *    accept foreign income can gate on this.
	 *  - `gross_monthly`: only populated for foreign-salaried entries —
	 *    `monthly_income` uses NET (credited-in-India), this is the gross
	 *    pre-foreign-tax figure for reference.
	 *
	 * Indexable by JSON-Logic rules via `var: "_computed._income_signals"`.
	 */
	_income_signals: IncomeSignal[];

	/**
	 * Sum of foreign-salaried entries' NET monthly income (the figure
	 * already contributing to `_total_gross_monthly`). Lenders can subtract
	 * this from `_total_gross_monthly` to evaluate domestic income alone.
	 */
	_total_foreign_salaried_monthly_net: number;

	/**
	 * Sum of foreign-salaried entries' GROSS monthly income (pre-foreign-tax).
	 * Some lenders evaluate on gross with their own haircut.
	 */
	_total_foreign_salaried_monthly_gross: number;
}

/**
 * Per-entry income signal record emitted into `_computed._income_signals`.
 * See ComputedFields docstring for field semantics.
 */
export interface IncomeSignal {
	applicant_index: number;
	entry_index: number;
	profile_type: string;
	entity_name: string;
	monthly_income: number;
	trend?: 'growing' | 'flat' | 'declining';
	limited_vintage?: boolean;
	is_foreign_salaried?: boolean;
	gross_monthly?: number;
}

/**
 * Derived boolean fields the enricher writes onto the top-level enriched payload.
 * These are "Yes"/"No" strings consumed by JSON-Logic rules as boolean gates.
 * Written at the payload root (not inside loanTransaction) for backward compat.
 */
interface EnricherDerivedFields {
	naConversionComplete?: string;
	isResidentialZone?: string;
	isSelfOccupied?: string;
	isInvestmentProperty?: string;
	hasMunicipalTaxRecords?: string;
	hasUnauthorizedConstruction?: string;
	hasRevenueRecords?: string;
	isColonyRegularized?: string;
	encumbranceCertificateVerified?: string;
	ownershipChainComplete?: string;
	isPoaSale?: string;
	isInheritedProperty?: string;
	poaRegistered?: string;
	isAgreementPoaDeal?: string;
	isRecentRegistry?: string;
	isAuthorityFullyPaid?: string;
	hasAllotmentLetter?: string;
	hasPossessionCert?: string;
	hasAuthorityDues?: string;
	isNonRERA_UC?: string;
	isDefaulter?: string;
	madeGuarantor?: string;
	isSCST?: string;
	hasDisabledApplicant?: string;
}

export type EnrichedPayload = LoanApplicationPayload &
	EnricherDerivedFields & { _computed: ComputedFields };

// ============================================================================
// GROSS INCOME EXTRACTION FROM INCOME ENTRIES
// ============================================================================

/**
 * For multi-year ITR profiles (`business_proprietorship`, `professional_practice`),
 * a position in the financialsTable counts as a "valid filed year" only when
 * BOTH gates are met:
 *
 *   1. `itrFiled[i] === true` — operator confirmed ITR for that year is filed
 *   2. `netProfitArray[i]` is a real number (not "", null, undefined, NaN)
 *
 * The double gate matters because the form can ship inconsistent state — e.g.,
 * `itrFiled: [true, true, true, true]` with `netProfitArray: [35L, 34L, 30L, ""]`
 * (operator skipped the oldest year's value but left the flag set). Trusting
 * one signal alone would mis-classify the empty cell as filed. Trusting both
 * filters this out gracefully.
 *
 * Position 0 = MOST RECENT year per form column ordering.
 */
function isValidFiledYear(
	netProfitArray: unknown[],
	itrFiled: unknown[],
	index: number
): boolean {
	const filed = itrFiled[index] === true;
	const value = netProfitArray[index];
	const numeric = typeof value === 'number' && Number.isFinite(value);
	return filed && numeric;
}

/**
 * Walk the financialsTable positions (most-recent → oldest) and collect every
 * cell that passes the `isValidFiledYear` double-gate.
 *
 * The returned array preserves order (position 0 first), so downstream consumers
 * can take `slice(0, 2)` for the income calc and use the full list for trend.
 *
 * If `itrFiled` is missing or shorter than `netProfitArray`, falls back to
 * treating any numeric cell as filed — the operator hasn't yet been migrated
 * to the per-year itrFiled UX, so the legacy "any numeric value = filed"
 * heuristic is the safest default for backward compat.
 */
function collectValidFiledYears(inc: Record<string, unknown>): number[] {
	const ft = inc.financialsTable as
		| { netProfitArray?: unknown[]; itrFiled?: unknown[] }
		| undefined;
	if (!ft) return [];

	const netProfit = Array.isArray(ft.netProfitArray) ? ft.netProfitArray : [];
	const itrFiled = Array.isArray(ft.itrFiled) ? ft.itrFiled : [];

	// Backward-compat: pre-migration payloads have no itrFiled array. Treat
	// every numeric cell as filed in that case.
	const hasItrFiledSignal = itrFiled.length > 0;

	const valid: number[] = [];
	for (let i = 0; i < netProfit.length; i++) {
		if (hasItrFiledSignal) {
			if (isValidFiledYear(netProfit, itrFiled, i)) {
				valid.push(netProfit[i] as number);
			}
		} else {
			const v = netProfit[i];
			if (typeof v === 'number' && Number.isFinite(v)) {
				valid.push(v);
			}
		}
	}
	return valid;
}

/**
 * Standard Indian DSA underwriting rule: monthly income for a multi-year
 * self-employed profile = average of the LAST TWO FILED ITRs, divided by 12.
 *
 * Rationale (per owner, 2026-05-29):
 *  - One ITR alone is unreliable — could be a spike or dip.
 *  - Earlier years (3rd, 4th, current-FY-in-progress) are collected for
 *    trend / vintage signal, not for income calc.
 *  - If only 1 filed ITR exists, use it AND raise `limitedVintage` so lender
 *    rules can decide acceptance (some allow with haircut, some reject).
 *  - Loss years (negative net profit) DO enter the average — the operator's
 *    choice was "(a) average them" rather than dropping or rejecting, so a
 *    loss year reduces but doesn't disqualify business income.
 *
 * Negative averages (two consecutive loss years) clamp to 0 — negative monthly
 * income makes no sense for downstream FOIR / EMI calcs.
 */
function computeMultiYearMonthly(inc: Record<string, unknown>): {
	monthly: number;
	limitedVintage: boolean;
} {
	const valid = collectValidFiledYears(inc);
	if (valid.length === 0) return { monthly: 0, limitedVintage: false };

	const usedForCalc = valid.slice(0, 2);
	const sum = usedForCalc.reduce((a, b) => a + b, 0);
	const annualAverage = sum / usedForCalc.length;
	const monthly = Math.max(0, annualAverage / 12);

	return { monthly, limitedVintage: valid.length === 1 };
}

/**
 * Compute YoY trend signal across ALL valid filed years for a multi-year
 * profile. Returns `null` when fewer than 2 valid years exist.
 *
 * Algorithm:
 *  - Walk consecutive pairs (position i, position i+1). Position 0 is most
 *    recent → pair is (newer, older).
 *  - YoY % change = (newer - older) / older. Skip pairs where older === 0
 *    (% undefined, would skew the average).
 *  - Average YoY % across all pairs.
 *  - Threshold: > +5% → 'growing', < -5% → 'declining', in-between → 'flat'.
 *
 * The 5% threshold accounts for normal YoY noise in self-employed income
 * (rounding, single-month-of-billing shifts). 3% would be too sensitive,
 * 10% would miss real growth signals on stable businesses.
 */
function computeIncomeTrend(
	inc: Record<string, unknown>
): 'growing' | 'flat' | 'declining' | null {
	const valid = collectValidFiledYears(inc);
	if (valid.length < 2) return null;

	const yoyChanges: number[] = [];
	for (let i = 0; i < valid.length - 1; i++) {
		const newer = valid[i];
		const older = valid[i + 1];
		if (older === 0) continue;
		yoyChanges.push((newer - older) / older);
	}
	if (yoyChanges.length === 0) return null;

	const avgYoY = yoyChanges.reduce((a, b) => a + b, 0) / yoyChanges.length;
	if (avgYoY > 0.05) return 'growing';
	if (avgYoY < -0.05) return 'declining';
	return 'flat';
}

/**
 * Detect when a `director_company` / `business_partnership` entry came from
 * the form's salaried-path (DIRECTOR_SALARIED_PATH / PARTNER_SALARIED_PATH —
 * foreign-company director, foreign-firm partner, professional director on
 * a listed-company payroll).
 *
 * Signature: `grossMonthlySalary` is set AND none of the standard-path keys
 * (`drawsSalary`, `receivesProfit`, `monthlySalaryAmount`,
 * `averageProfitPerWithdrawal`) are populated. The form's mutually-exclusive
 * showWhen ensures one path or the other — so this signature reliably
 * identifies foreign-context entries.
 */
function isForeignSalariedEntry(entry: CleanIncomeEntry): boolean {
	if (entry.profileType !== 'director_company' && entry.profileType !== 'business_partnership') {
		return false;
	}
	const inc = entry.income as Record<string, unknown>;
	const hasGross =
		typeof inc.grossMonthlySalary === 'number' && Number.isFinite(inc.grossMonthlySalary);
	if (!hasGross) return false;
	const hasStandardKeys =
		inc.drawsSalary !== undefined ||
		inc.receivesProfit !== undefined ||
		inc.monthlySalaryAmount !== undefined ||
		inc.averageProfitPerWithdrawal !== undefined;
	return !hasStandardKeys;
}

/**
 * Extracts gross monthly income from a single CleanIncomeEntry based on profileType.
 */
function extractGrossFromEntry(entry: CleanIncomeEntry): number {
	const inc = entry.income;

	switch (entry.profileType) {
		case 'salaried_regular':
		case 'salaried_contractual':
			return (inc.grossMonthlySalary as number) ?? (inc.netMonthlySalary as number) ?? 0;

		case 'business_proprietorship':
			// Monthly income = average of LAST TWO FILED ITRs / 12 (per
			// `computeMultiYearMonthly`). Earlier years + current-FY-in-progress
			// data is collected for trend/vintage signal but NOT used in the
			// income calc — owner policy, 2026-05-29.
			return computeMultiYearMonthly(inc).monthly;

		case 'business_partnership':
		case 'director_company': {
			let monthly = 0;
			if (inc.drawsSalary && inc.monthlySalaryAmount) {
				monthly += inc.monthlySalaryAmount as number;
			}
			if (inc.receivesProfit && inc.averageProfitPerWithdrawal) {
				const freq = inc.profitFrequency as string;
				const perWithdrawal = inc.averageProfitPerWithdrawal as number;
				const annualFactor =
					freq === 'monthly' ? 12 : freq === 'quarterly' ? 4 : freq === 'half_yearly' ? 2 : 1;
				monthly += (perWithdrawal * annualFactor) / 12;
			}
			// Foreign-salaried path: form's DIRECTOR_SALARIED_PATH /
			// PARTNER_SALARIED_PATH emits `grossMonthlySalary` +
			// `netMonthlySalary` ONLY — none of the standard-path
			// `drawsSalary` / `receivesProfit` keys are populated.
			//
			// Use NET (post-foreign-tax, credited-in-India) as the income
			// figure — that's what lenders evaluate for foreign salary.
			// Falls back to gross if net wasn't captured (older data,
			// or operator didn't fill it).
			//
			// `isForeignSalariedEntry` detection + `_total_foreign_salaried_*`
			// totals + per-entry `is_foreign_salaried` flag are produced in
			// `enrichPayload` so lender rules can apply differential
			// haircut / acceptance per their own policy.
			if (monthly === 0) {
				monthly =
					(inc.netMonthlySalary as number) ?? (inc.grossMonthlySalary as number) ?? 0;
			}
			return monthly;
		}

		case 'professional_practice':
			// Same rule as `business_proprietorship`. Schedule-BP of the
			// personal ITR; form (profileFormConfig.ts PROFESSIONAL_INCOME_FIELDS)
			// emits a multi-year `financialsTable` with `netProfitArray` +
			// `depreciationArray` + `grossReceipts` + per-year `itrFiled` flag.
			// Pre-fix the legacy flat-field reads returned 0 for every case →
			// no offers (team bug report, 2026-05-29 — Pitfall #67).
			return computeMultiYearMonthly(inc).monthly;

		case 'pension':
			return (inc.monthlyPensionAmount as number) ?? 0;

		case 'rental_income':
			return (inc.monthlyRentAmount as number) ?? 0;

		case 'freelance_consulting':
			return (inc.averageMonthlyFreelanceIncome as number) ?? 0;

		case 'agriculture_income':
			return ((inc.averageAnnualAgricultureIncome as number) ?? 0) / 12;

		case 'investment_income':
			return ((inc.averageAnnualInvestmentIncome as number) ?? 0) / 12;

		default:
			return 0;
	}
}

/**
 * Extracts total gross monthly income from an applicant.
 * Prefers incomeEntries[] when available, falls back to flat fields.
 */
function extractApplicantGrossMonthly(applicant: ApplicantPayload): number {
	if (applicant.incomeEntries && applicant.incomeEntries.length > 0) {
		return applicant.incomeEntries.reduce((sum, entry) => sum + extractGrossFromEntry(entry), 0);
	}

	// Fallback to flat fields (backward compatibility)
	if (applicant.applicantType === 'Company') {
		if (applicant.financials?.netProfit && applicant.financials.netProfit.length > 0) {
			const profits = applicant.financials.netProfit;
			return profits.reduce((a, b) => a + b, 0) / profits.length / 12;
		}
		return 0;
	}

	return applicant.netIncome ?? applicant.grossIncome ?? 0;
}

// ============================================================================
// OBLIGATION EXTRACTION
// ============================================================================

function extractTotalObligationsMonthly(applicants: ApplicantPayload[]): number {
	let total = 0;
	for (const a of applicants) {
		if (!a.obligations) continue;
		for (const obl of a.obligations) {
			// When applicantEmiShare is computed, use it (respects equal split / proof override / zero for guarantors)
			if (typeof obl.applicantEmiShare === 'number') {
				const share = obl.applicantEmiShare;
				const emi = parseFloat(obl.emi || '0');
				if (emi > 0) {
					// Term loan: share IS the monthly burden
					total += share;
				} else {
					// Credit line: share is the limit share — apply factor
					total += share * ENRICHER_CREDIT_LINE_FACTOR;
				}
			} else {
				// Fallback: raw EMI / limit (backward compat for entries without share)
				const emi = parseFloat(obl.emi || '0');
				if (emi > 0) {
					total += emi;
				} else {
					const limit = parseFloat(obl.totalLimit || '0');
					if (limit > 0) total += limit * ENRICHER_CREDIT_LINE_FACTOR;
				}
			}
		}
	}
	return total;
}

// ============================================================================
// VINTAGE EXTRACTION
// ============================================================================

function extractMaxVintageYears(applicants: ApplicantPayload[]): number {
	let max = 0;
	for (const a of applicants) {
		if (a.incomeEntries) {
			for (const entry of a.incomeEntries) {
				if (entry.evidence.vintageYears && entry.evidence.vintageYears > max) {
					max = entry.evidence.vintageYears;
				}
			}
		}
	}
	return max;
}

// ============================================================================
// INCOME PROFILE TYPE COLLECTION
// ============================================================================

function collectIncomeProfileTypes(applicants: ApplicantPayload[]): string[] {
	const types = new Set<string>();
	for (const a of applicants) {
		if (a.incomeEntries) {
			for (const entry of a.incomeEntries) {
				types.add(entry.profileType);
			}
		}
	}
	return [...types];
}

function countIncomeSources(applicants: ApplicantPayload[]): number {
	let count = 0;
	for (const a of applicants) {
		if (a.incomeEntries) {
			count += a.incomeEntries.length;
		}
	}
	return count;
}

// ============================================================================
// THIRD-PARTY EMI TOTAL
// ============================================================================

function computeThirdPartyEmiTotal(applicants: ApplicantPayload[]): number {
	let total = 0;
	for (const a of applicants) {
		if (!a.obligations) continue;
		for (const obl of a.obligations) {
			if (obl.emiPaidBy && obl.emiPaidBy !== 'self') {
				const emi = parseFloat(obl.emi || '0');
				if (emi > 0) {
					total += emi;
				} else {
					const limit = parseFloat(obl.totalLimit || '0');
					if (limit > 0) total += limit * ENRICHER_CREDIT_LINE_FACTOR;
				}
			}
		}
	}
	return Math.round(total);
}

// ============================================================================
// MAIN ENRICHMENT FUNCTION
// ============================================================================

const BUSINESS_EMPLOYMENT_TYPES = new Set(['Self-employed(Professional)', 'Self-employed(Other)']);

const SALARIED_EMPLOYMENT_TYPES = new Set(['Salaried(Private)', 'Salaried(Government)']);

/**
 * Enriches a loan application payload with computed derived fields.
 * Returns a shallow copy with `_computed` attached.
 *
 * The enriched payload is intended for JSON-Logic rule evaluations so rules
 * can reference derived fields like `_computed._is_business_file`.
 *
 * `opts.now` lets callers inject the "current time" used by time-derived
 * fields (`loanVintageMonths` when recomputed during enrichment). Production
 * omits it (defaults to real `new Date()`); tests pass a frozen date. Locked
 * by `payloadBuilderTimeInjection.test.ts` per CLAUDE.md §16.16. Added
 * 2026-06-01 (S210, TECH-DEBT-CLEANUP D-incoming-4 Level-3 fix).
 */
export function enrichPayload(
	payload: LoanApplicationPayload,
	opts?: { now?: Date }
): EnrichedPayload {
	const applicants = payload.allApplicantDetails ?? [];
	// Use purpose-specific selectors instead of blind applicants[0]
	const looseApplicants = applicants as unknown as Record<string, unknown>[];
	const youngestApplicant = selectYoungest(looseApplicants);
	const bestEmploymentApplicant = selectBestEmployment(looseApplicants);

	// Server-side recompute of applicantEmiShare — NEVER trust client values (PB-5)
	// Deep clone obligations before mutation to prevent cross-lender contamination
	// when the same payload is evaluated against multiple lenders
	for (const a of applicants) {
		if (!a.obligations) continue;
		a.obligations = structuredClone(a.obligations);
		for (const obl of a.obligations) {
			// Access fields not on formal ObligationEntry type (runtime MongoDB data)
			const oblRecord = obl as unknown as Record<string, unknown>;
			obl.applicantEmiShare = computeApplicantEmiShare({
				role: obl.role,
				emiMethod: obl.emiMethod,
				emiPaidBy: obl.emiPaidBy,
				borrowerCount: obl.borrowerCount,
				hasProofOverride: oblRecord.hasProofOverride as boolean | undefined,
				monthlyShare: oblRecord.monthlyShare as string | undefined,
				emi: obl.emi,
				totalLimit: obl.totalLimit,
				obligationType: obl.obligationType,
				applicantClassification: a.applicantClassification
			});
		}
	}

	let totalGrossMonthly = 0;
	let maxCibil = 0;
	let minCibil = Infinity;

	// Per-entry signals: trend / limited-vintage / foreign-salaried metadata.
	// Walks every income entry across all applicants (not just pooled) so
	// downstream consumers can reason about each entry independently.
	const incomeSignals: IncomeSignal[] = [];
	let totalForeignSalariedNet = 0;
	let totalForeignSalariedGross = 0;

	for (let aIdx = 0; aIdx < applicants.length; aIdx++) {
		const a = applicants[aIdx];
		// Only pool income from financial co-applicants (or legacy applicants without classification)
		const cls = a.applicantClassification;
		const isPooled = !cls || cls === 'co_applicant_financial';
		if (isPooled) {
			totalGrossMonthly += extractApplicantGrossMonthly(a);
		}
		const cibil = a.creditScore ?? 0;
		if (cibil > maxCibil) maxCibil = cibil;
		if (cibil < minCibil) minCibil = cibil;

		// Emit per-entry signals.
		if (Array.isArray(a.incomeEntries)) {
			for (let eIdx = 0; eIdx < a.incomeEntries.length; eIdx++) {
				const entry = a.incomeEntries[eIdx];
				const monthly = Math.round(extractGrossFromEntry(entry));

				const signal: IncomeSignal = {
					applicant_index: aIdx,
					entry_index: eIdx,
					profile_type: entry.profileType,
					entity_name: entry.entityName ?? '',
					monthly_income: monthly
				};

				// Multi-year profiles get trend + limited-vintage signals.
				if (
					entry.profileType === 'business_proprietorship' ||
					entry.profileType === 'professional_practice'
				) {
					const inc = entry.income as Record<string, unknown>;
					const { limitedVintage } = computeMultiYearMonthly(inc);
					const trend = computeIncomeTrend(inc);
					if (trend) signal.trend = trend;
					if (limitedVintage) signal.limited_vintage = true;
				}

				// Foreign salaried path (director/partner) gets the foreign
				// flag + the gross monthly figure for lender reference.
				// `monthly_income` itself already uses NET via the enricher
				// branch above; gross is exposed separately for lenders that
				// evaluate on gross with their own haircut.
				if (isForeignSalariedEntry(entry)) {
					signal.is_foreign_salaried = true;
					const inc = entry.income as Record<string, unknown>;
					const gross =
						typeof inc.grossMonthlySalary === 'number' &&
						Number.isFinite(inc.grossMonthlySalary)
							? (inc.grossMonthlySalary as number)
							: monthly;
					signal.gross_monthly = Math.round(gross);

					// Pooled entries contribute to the foreign-salaried totals.
					// Non-pooled (e.g., guarantor) entries are still flagged
					// in signals but excluded from totals — same convention
					// as `_total_gross_monthly`.
					if (isPooled) {
						totalForeignSalariedNet += monthly;
						totalForeignSalariedGross += Math.round(gross);
					}
				}

				incomeSignals.push(signal);
			}
		}
	}

	if (minCibil === Infinity) minCibil = 0;

	const isBusinessFile = applicants.some((a) => BUSINESS_EMPLOYMENT_TYPES.has(a.employmentType));
	const bestEmpType = String(bestEmploymentApplicant?.employmentType ?? '');
	const isSalariedFile = bestEmpType
		? SALARIED_EMPLOYMENT_TYPES.has(bestEmpType as ApplicantPayload['employmentType'])
		: false;

	// Facility type for unsecured loans (Term Loan / OD / DOD / CC)
	const rawFacilityType = payload.loanTransaction?.facilityType ?? '';
	const CREDIT_LINE_FACILITIES = new Set([
		'Overdraft (OD)',
		'Drop-line OverDraft (DOD)',
		'Cash Credit (CC)',
		'Flexi Drop-line OverDraft (Flexi DOD)'
	]);

	const computed: ComputedFields = {
		_total_gross_monthly: Math.round(totalGrossMonthly),
		_total_obligations_monthly: Math.round(extractTotalObligationsMonthly(applicants)),
		_applicant_count: applicants.length,
		_has_co_applicant: applicants.length > 1,
		_primary_age: Number(youngestApplicant?.age) || 0,
		_primary_employment: String(bestEmploymentApplicant?.employmentType ?? 'unknown'),
		_is_business_file: isBusinessFile,
		_is_salaried_file: isSalariedFile,
		_max_cibil: maxCibil,
		_min_cibil: minCibil,
		_total_vintage_years: extractMaxVintageYears(applicants),
		_income_source_count: countIncomeSources(applicants),
		_income_profile_types: collectIncomeProfileTypes(applicants),
		_facility_type: rawFacilityType,
		_is_credit_line_facility: CREDIT_LINE_FACILITIES.has(rawFacilityType),
		_has_non_earner: applicants.some((a) => a.isNonEarning === true),
		_third_party_emi_total: computeThirdPartyEmiTotal(applicants),
		_income_signals: incomeSignals,
		_total_foreign_salaried_monthly_net: Math.round(totalForeignSalariedNet),
		_total_foreign_salaried_monthly_gross: Math.round(totalForeignSalariedGross)
	};

	// ============================================================================
	// BACKWARD COMPATIBILITY: Derive legacy fields from merged form questions
	// ============================================================================
	// The form now uses merged questions (creditHistoryStatus, propertyComplianceStatus,
	// incomeDocAvailable) but the rule engine may still reference the legacy field names
	// (isDefaulter, madeGuarantor, approvedByAuthority, asPerMap, payslips, Form16Available).
	// We derive these from the new merged values so both old and new payloads work.

	const enriched: EnrichedPayload & Record<string, unknown> = { ...payload, _computed: computed };

	// ============================================================================
	// HOME LOAN REDESIGN: Three-Cost Model Derivations
	// ============================================================================

	// Cast to allow dynamic field access — the payload arrives from MongoDB with extra form
	// fields beyond what LoanTransactionPayload formally declares. The enricher reads/writes
	// these dynamic fields for backward compatibility derivations.
	const lt = enriched.loanTransaction as LoanTransactionPayload & Record<string, unknown>;

	// ── Backward compat: derive legacy fields from merged form questions ──
	// Must read from lt (loanTransaction), not enriched — form data is nested there.

	// creditHistoryStatus → isDefaulter + madeGuarantor
	const creditHistory = lt?.creditHistoryStatus as string | undefined;
	if (creditHistory && !lt.isDefaulter) {
		lt.isDefaulter = ['defaulter', 'both'].includes(creditHistory) ? 'Yes' : 'No';
		lt.madeGuarantor = ['guarantor', 'both'].includes(creditHistory) ? 'Yes' : 'No';
	}

	// propertyComplianceStatus → approvedByAuthority + asPerMap
	const compliance = lt?.propertyComplianceStatus as string | undefined;
	if (compliance && !lt.approvedByAuthority) {
		lt.approvedByAuthority = compliance === 'not_authorized' ? 'No' : 'Yes';
		lt.asPerMap = compliance === 'fully_compliant' ? 'Yes' : 'No';
	}

	// incomeDocAvailable → payslips + Form16Available
	const incomeDocs = lt?.incomeDocAvailable as string | undefined;
	if (incomeDocs && !lt.payslips) {
		lt.payslips = ['both', 'payslips_only'].includes(incomeDocs) ? 'Yes' : 'No';
		lt.Form16Available = ['both', 'form16_only'].includes(incomeDocs) ? 'Yes' : 'No';
	}

	// Market value → pass through as new rule engine key
	if (lt?.marketValue != null) {
		lt.marketValue = Number(lt.marketValue);
	}

	// Registry value → new key + backward compat with old ATS key
	if (lt?.registryValue != null) {
		lt.registryValue = Number(lt.registryValue);
		// Old ATS key: ONLY set atsValue = registryValue when marketValue is NOT present
		// (V1/LAP path where registryValue is the comparison value for LTV).
		// V2 path has explicit marketValue for LTV — registryValue is for LCR only.
		if (!lt.atsValue && !lt.marketValue) {
			lt.atsValue = lt.registryValue;
		}
	}

	// Advance in agreement → ensure numeric
	if (lt?.advanceInAgreement != null) {
		lt.advanceInAgreement = Number(lt.advanceInAgreement);
	}

	// ============================================================================
	// AREA-SPECIFIC PROPERTY COMPLIANCE & LEGAL DERIVATIONS
	// ============================================================================

	// For CONVERTED_RESIDENTIAL, Q1b answer implicitly determines NA conversion status.
	// Q6 (naConversionStatus) is now hidden — derive it from propertyComplianceStatus.
	let naConversionStatus = lt?.naConversionStatus as string | undefined;
	const propertyAreaType = lt?.propertyAreaType as string | undefined;
	const propertyComplianceStatus = lt?.propertyComplianceStatus as string | undefined;
	if (
		propertyAreaType === 'CONVERTED_RESIDENTIAL' &&
		propertyComplianceStatus &&
		!naConversionStatus
	) {
		if (propertyComplianceStatus === 'fully_compliant') naConversionStatus = 'REGISTERED';
		else if (propertyComplianceStatus === 'authorized_not_per_plan') naConversionStatus = 'APPLIED';
		else if (propertyComplianceStatus === 'not_authorized') naConversionStatus = 'NOT_STARTED';
	}
	if (naConversionStatus) {
		enriched.naConversionComplete = naConversionStatus === 'REGISTERED' ? 'Yes' : 'No';
	}

	const zoneClassification = lt?.zoneClassification as string | undefined;
	if (zoneClassification) {
		enriched.isResidentialZone = zoneClassification === 'RESIDENTIAL' ? 'Yes' : 'No';
	}

	// Property usage intent
	const propertyUsageIntent = lt?.propertyUsageIntent as string | undefined;
	if (propertyUsageIntent) {
		enriched.isSelfOccupied = propertyUsageIntent === 'self_occupied' ? 'Yes' : 'No';
		enriched.isInvestmentProperty = propertyUsageIntent === 'investment' ? 'Yes' : 'No';
	}

	const municipalTaxStatus = lt?.municipalTaxStatus as string | undefined;
	if (municipalTaxStatus) {
		enriched.hasMunicipalTaxRecords = ['PAID_REGULAR', 'PAID_IRREGULAR'].includes(
			municipalTaxStatus
		)
			? 'Yes'
			: 'No';
	}

	const unauthorizedAdditions = lt?.unauthorizedAdditions as string | undefined;
	if (unauthorizedAdditions) {
		enriched.hasUnauthorizedConstruction = ['MINOR', 'MAJOR'].includes(unauthorizedAdditions)
			? 'Yes'
			: 'No';
	}

	const revenueRecordStatus = lt?.revenueRecordStatus as string | undefined;
	if (revenueRecordStatus) {
		enriched.hasRevenueRecords = ['AVAILABLE_CURRENT', 'AVAILABLE_OUTDATED'].includes(
			revenueRecordStatus
		)
			? 'Yes'
			: 'No';
	}

	const colonyRegularizationStatus = lt?.colonyRegularizationStatus as string | undefined;
	if (colonyRegularizationStatus) {
		enriched.isColonyRegularized = colonyRegularizationStatus === 'REGULARIZED' ? 'Yes' : 'No';
	}

	const encumbranceCertStatus = lt?.encumbranceCertStatus as string | undefined;
	if (encumbranceCertStatus) {
		enriched.encumbranceCertificateVerified = encumbranceCertStatus === 'CLEAR' ? 'Yes' : 'No';
	}

	const titleChainStatus = lt?.titleChainStatus as string | undefined;
	if (titleChainStatus) {
		enriched.ownershipChainComplete = titleChainStatus === 'CLEAR' ? 'Yes' : 'No';
	}

	// ── Seller & Transaction Derivations ──
	const sellerOwnershipType = lt?.sellerOwnershipType as string | undefined;
	if (sellerOwnershipType) {
		enriched.isPoaSale = sellerOwnershipType === 'POA_HOLDER' ? 'Yes' : 'No';
	}

	const propertyAcquisitionMethod = lt?.propertyAcquisitionMethod as string | undefined;
	if (sellerOwnershipType || propertyAcquisitionMethod) {
		enriched.isInheritedProperty =
			sellerOwnershipType === 'INHERITED' || propertyAcquisitionMethod === 'INHERITED'
				? 'Yes'
				: 'No';
	}

	const poaRegistrationStatus = lt?.poaRegistrationStatus as string | undefined;
	if (poaRegistrationStatus) {
		enriched.poaRegistered = poaRegistrationStatus === 'REGISTERED' ? 'Yes' : 'No';
	}

	if (propertyAcquisitionMethod) {
		enriched.isAgreementPoaDeal = propertyAcquisitionMethod === 'AGREEMENT_POA' ? 'Yes' : 'No';
	}

	const lastRegistryDuration = lt?.lastRegistryDuration as string | undefined;
	if (lastRegistryDuration) {
		enriched.isRecentRegistry = ['underSixMonths', 'underOneYear'].includes(lastRegistryDuration)
			? 'Yes'
			: 'No';
	}

	// ── Authority Purchase Derivations ──
	const authorityPaymentStatus = lt?.authorityPaymentStatus as string | undefined;
	if (authorityPaymentStatus) {
		enriched.isAuthorityFullyPaid = authorityPaymentStatus === 'FULLY_PAID' ? 'Yes' : 'No';
	}

	const allotmentLetterStatus = lt?.allotmentLetterStatus as string | undefined;
	if (allotmentLetterStatus) {
		enriched.hasAllotmentLetter = ['ORIGINAL_AVAILABLE', 'COPY_AVAILABLE'].includes(
			allotmentLetterStatus
		)
			? 'Yes'
			: 'No';
	}

	const possessionCertificateStatus = lt?.possessionCertificateStatus as string | undefined;
	if (possessionCertificateStatus) {
		enriched.hasPossessionCert =
			possessionCertificateStatus === 'POSSESSION_CERT_AVAILABLE' ? 'Yes' : 'No';
	}

	const authorityDuesStatus = lt?.authorityDuesStatus as string | undefined;
	if (authorityDuesStatus) {
		enriched.hasAuthorityDues = ['MINOR_DUES', 'MAJOR_DUES'].includes(authorityDuesStatus)
			? 'Yes'
			: 'No';
	}

	// Derive eliminated ATS flow keys for backward compat
	if (lt?.propertyCost != null && lt?.registryValue != null) {
		if (!lt.isDifferATSAndPropertyValue) {
			lt.isDifferATSAndPropertyValue = Number(lt.propertyCost) !== Number(lt.registryValue);
		}
	}

	// BT path: market value → propertyCost backward compat
	const isBTPath =
		lt?.loanType === 'Balance Transfer Only' ||
		lt?.loanType === 'Balance Transfer With Top-up' ||
		lt?.loanType === 'Top-up Only';
	if (isBTPath && lt?.marketValue != null && !lt?.propertyCost) {
		lt.propertyCost = Number(lt.marketValue);
	}

	// ============================================================================
	// RERA GATE: Under Construction without RERA → banks excluded (NBFCs only)
	// ============================================================================
	// Only relevant for Home Loan and Plot Loan where RERA applies.
	// LAP is always an existing property, so RERA status is irrelevant.

	const RERA_APPLICABLE_LOANS = ['Home Loan', 'Plot and Construction Loan'];
	// Normalize through canonicalLoanName so the gate fires regardless of whether
	// `evaluatePayload` has already rewritten the form-facing 'Plot Loan' alias
	// or whether the enricher is being called standalone (tests, direct callers).
	const loanNameForRera = lt?.loanName ? canonicalLoanName(String(lt.loanName)) : undefined;
	if (loanNameForRera && RERA_APPLICABLE_LOANS.includes(loanNameForRera)) {
		const propertyStage = lt?.PropertyStage as string | undefined;
		const reraStatus = lt?.reraRegistrationStatus as string | undefined;

		// Non-RERA under-construction property: banks cannot process, only NBFCs/HFCs
		if (propertyStage === 'Under Construction' && reraStatus === 'NOT_REGISTERED') {
			enriched.isNonRERA_UC = 'Yes';
		}
	}

	// ============================================================================
	// HOME LOAN REDESIGN: Loan Vintage (from disbursement date)
	// ============================================================================

	if (lt?.loanDisbursementDate && typeof lt.loanDisbursementDate === 'string') {
		const parts = lt.loanDisbursementDate.split('-').map(Number);
		if (parts.length >= 2 && parts[0] > 0 && parts[1] > 0) {
			// Time injection per S210: `opts.now` makes this deterministic for
			// tests; production defaults to real `new Date()`.
			const now = opts?.now ?? new Date();
			lt.loanVintageMonths = (now.getFullYear() - parts[0]) * 12 + (now.getMonth() + 1 - parts[1]);
		}
	}

	// ============================================================================
	// HOME LOAN REDESIGN: Auction Property (merged 3 → 1 question)
	// ============================================================================

	const auctionStatus = lt?.auctionPropertyStatus as string | undefined;
	if (auctionStatus && lt) {
		if (!lt.auctionedProperty) {
			lt.auctionedProperty = auctionStatus === 'STANDARD' ? 'No' : 'Yes';
		}
		if (!lt.understandsAsIsBasis) {
			lt.understandsAsIsBasis =
				auctionStatus === 'AUCTION_AWARE'
					? 'Yes'
					: auctionStatus === 'AUCTION_UNAWARE'
						? 'No'
						: undefined;
		}
	}

	// ============================================================================
	// HOME LOAN REDESIGN: Purchase Type Backward Compat
	// ============================================================================

	// Normalize purchaseType: V2 plot loans use plotSource, V1 uses purchaseType
	const rawPt = (lt?.purchaseType || lt?.plotSource) as string | undefined;
	if (rawPt && lt) {
		if (!lt.purchaseType) lt.purchaseType = rawPt;
		if (rawPt === 'direct_from_builder' || rawPt === 'direct_from_authority') {
			lt.purchaseType = 'Direct Sale';
			lt.isAuthorityPurchase = rawPt === 'direct_from_authority';
		} else if (rawPt === 'resale_normal' || rawPt === 'resale_endorsement') {
			lt.purchaseType = 'Resale';
			lt.isEndorsement = rawPt === 'resale_endorsement';
		} else if (['authority_allotment', 'developer_project'].includes(rawPt)) {
			lt.purchaseType = 'Direct Sale';
		} else if (
			[
				'approved_layout',
				'revenue_site',
				'individual_resale',
				'landowner_purchase',
				'inherited_partition'
			].includes(rawPt)
		) {
			lt.purchaseType = 'Resale';
		}
	}

	// ============================================================================
	// HOME LOAN REDESIGN: Documentation Readiness (merged 3 legal → 1)
	// ============================================================================

	const docReady = lt?.documentationReadiness as string | undefined;
	if (docReady && lt) {
		if (!lt.ownershipChainComplete) {
			lt.ownershipChainComplete = docReady === 'ALL_READY' ? 'Yes' : 'No';
		}
		if (!lt.originalDocumentsAvailable) {
			lt.originalDocumentsAvailable = docReady === 'ALL_READY' ? 'Yes' : 'No';
		}
		if (!lt.encumbranceCertificateVerified) {
			lt.encumbranceCertificateVerified =
				docReady === 'ALL_READY' || docReady === 'PARTIAL' ? 'Yes' : 'No';
		}
	}

	// ============================================================================
	// HOME LOAN REDESIGN: Property Dispute (graduated → boolean compat)
	// ============================================================================

	const disputeStatus = lt?.propertyDisputeStatus as string | undefined;
	if (disputeStatus && lt && !lt.noLegalDispute) {
		lt.noLegalDispute = disputeStatus === 'CLEAR' ? 'Yes' : 'No';
	}

	// ============================================================================
	// HOME LOAN REDESIGN: BT Possession & Demand (merged 2 → 1)
	// ============================================================================

	const btStatus = lt?.bt_possessionAndDemandStatus as string | undefined;
	if (btStatus && lt) {
		if (!lt.isPossessionOfferedByAuthority) {
			lt.isPossessionOfferedByAuthority = btStatus.startsWith('POSSESSION_') ? 'Yes' : 'No';
		}
		if (!lt.isAnyDemandFromTheBuilder) {
			lt.isAnyDemandFromTheBuilder = btStatus.endsWith('_WITH_DEMAND') ? 'Yes' : 'No';
		}
	}

	// ============================================================================
	// HOME LOAN REDESIGN: Seller Fields Backward Compat (V2 → V1 key names)
	// ============================================================================

	const sellerOnLoan = lt?.sellerOnLoan as string | undefined;
	if (sellerOnLoan && lt) {
		if (!lt.isPropertyOnLoan) {
			lt.isPropertyOnLoan = sellerOnLoan;
		}
	}
	const sellerOutstanding = lt?.sellerOutstandingAmount as number | undefined;
	if (sellerOutstanding != null && lt && !lt.foreclosureAmount) {
		lt.foreclosureAmount = sellerOutstanding;
	}
	const sellerLender = lt?.sellerCurrentLender as string | undefined;
	if (sellerLender && lt && !lt.sellerLoanBankName) {
		lt.sellerLoanBankName = sellerLender;
	}

	// ============================================================================
	// HOME LOAN REDESIGN: Mortgage Year "OTHER" Resolution
	// ============================================================================

	// Unsecured loans use loanTenure; secured loans use mortgageYear. Normalize early.
	if (lt?.loanTenure && !lt?.mortgageYear) {
		lt.mortgageYear = lt.loanTenure;
	}

	if (lt?.mortgageYear === 'OTHER' && lt?.mortgageYearCustom) {
		lt.effectiveMortgageYear = Number(lt.mortgageYearCustom);
	} else if (lt?.mortgageYear === 'MAX') {
		lt.effectiveMortgageYear = 'MAX';
	} else if (lt?.mortgageYear) {
		lt.effectiveMortgageYear = Number(lt.mortgageYear);
	}

	// ============================================================================
	// HOME LOAN REDESIGN: Residence Pattern (graduated → boolean compat)
	// ============================================================================

	if (applicants.length > 0) {
		const allSameCity = applicants.every((a) => a.applicantResidencePattern === 'SAME_CITY');
		const anyHasPattern = applicants.some((a) => a.applicantResidencePattern != null);
		if (anyHasPattern && lt && !lt.residenceSameAsProperty) {
			lt.residenceSameAsProperty = allSameCity;
		}
	}

	// ============================================================================
	// HOME LOAN REDESIGN: Per-Applicant Credit → Case-Level Aggregation
	// ============================================================================

	if (applicants.length > 0) {
		const anyDefaulter = applicants.some(
			(a) => a.creditHistoryStatus === 'defaulter' || a.creditHistoryStatus === 'both'
		);
		const anyGuarantor = applicants.some(
			(a) => a.creditHistoryStatus === 'guarantor' || a.creditHistoryStatus === 'both'
		);

		if (!enriched.isDefaulter && (anyDefaulter || anyGuarantor)) {
			enriched.isDefaulter = anyDefaulter ? 'Yes' : 'No';
			enriched.madeGuarantor = anyGuarantor ? 'Yes' : 'No';
		}
	}

	// ── SC/ST + Disability Derivations ──────────────────────────────
	const hasSCSTApplicant = applicants.some(
		(a) => a.casteCategory === 'SC' || a.casteCategory === 'ST'
	);
	if (!enriched.isSCST) enriched.isSCST = hasSCSTApplicant ? 'Yes' : 'No';

	const hasDisabledApplicant = applicants.some((a) => a.hasDisability === 'Yes');
	if (!enriched.hasDisabledApplicant)
		enriched.hasDisabledApplicant = hasDisabledApplicant ? 'Yes' : 'No';

	// ── MNC/Listed Company Signal Derivation ────────────────────────
	// When works_for_reputed_org is true, company_100plus_employees is
	// definitionally true (MNCs/listed firms always have 100+ employees).
	// The form hides this question for MNC employees, so we auto-derive it.
	for (const a of applicants) {
		const applicantRecord = a as unknown as Record<string, unknown>;
		const details = applicantRecord.salariedActivityDetails as Record<string, unknown> | undefined;
		if (details?.works_for_reputed_org === true && details.company_100plus_employees == null) {
			details.company_100plus_employees = true;
		}
	}

	// ============================================================================
	// COMPANY FAMILY-CONTROL DERIVATION
	// ============================================================================
	// For each Company applicant with directors, compute family-control status
	// by analyzing director-to-director relationships from the relationship step.

	const payloadRelationships = payload.relationships;
	if (payloadRelationships && payloadRelationships.length > 0) {
		// Convert RelationshipEntry (index-based) to Relationship (ID-based)
		// so the derivation function can match directors by ID.
		const relationshipsAsIdBased: Relationship[] = payloadRelationships
			.map((r) => {
				const fromApplicant = applicants[r.fromIndex];
				const toApplicant = applicants[r.toIndex];
				if (!fromApplicant || !toApplicant) return null;
				// Applicant records from MongoDB may include an `id` field not on the formal type
				const fromRecord = fromApplicant as unknown as Record<string, unknown>;
				const toRecord = toApplicant as unknown as Record<string, unknown>;
				return {
					id: `${r.fromIndex}-${r.toIndex}`,
					fromId: (fromRecord.id as string) ?? String(r.fromIndex),
					toId: (toRecord.id as string) ?? String(r.toIndex),
					relationType: r.relationType as RelationType,
					category: (r.category ?? 'non_family') as RelationshipCategory,
					source: 'user-defined' as const,
					// S210 time injection: explicit `now` keeps inferred-relationship
					// timestamps deterministic when callers (tests) supply a frozen time.
					createdAt: opts?.now ?? new Date()
				};
			})
			.filter(Boolean) as Relationship[];

		for (const a of applicants) {
			if (a.applicantType !== 'Company') continue;
			// ApplicantPayload.directors uses payload DirectorInfo; deriveCompanyFamilyControl
			// expects form DirectorInfo. At runtime these are compatible (same shape from MongoDB).
			const directors = (a.directors ?? []) as unknown as DirectorInfo[];
			if (directors.length === 0) continue;

			// `id` may be present from MongoDB but is not on the formal ApplicantPayload type
			const companyId = ((a as unknown as Record<string, unknown>).id as string) ?? '';
			const result = deriveCompanyFamilyControl(companyId, directors, relationshipsAsIdBased);

			a.companyProfile = {
				familyControlled: result.familyControlled,
				familyStakePercent: result.familyStakePercent,
				familyDominance: result.familyDominance,
				familyClusterSize: result.familyClusterSize,
				totalDirectors: result.totalDirectors,
				outsiderCount: result.outsiderCount,
				familyClusterIds: result.familyClusterIds
			};
		}
	}

	return enriched as EnrichedPayload;
}

// Re-export for use in incomeAssessorV2
export { extractGrossFromEntry };
