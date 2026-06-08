/**
 * Income and financial data extraction utilities.
 */

import type { CleanIncomeEntry, FinancialsData } from './types.js';
import { toNumber } from './sanitizers.js';

/**
 * Extracts structured income entries from the applicant's incomeEntries array.
 * Each entry preserves profileType, entityName, income amounts, and evidence.
 *
 * IMPORTANT: Only includes entries whose profileType is in selectedIncomeProfiles.
 * When a DSA deselects a profile type (e.g. removes "rental_income"), those entries
 * must NOT reach the rule engine — otherwise deselected income inflates FOIR/eligibility.
 */
export function extractIncomeEntries(rawApplicant: Record<string, unknown>): CleanIncomeEntry[] {
	const entries = rawApplicant.incomeEntries;
	if (!Array.isArray(entries) || entries.length === 0) return [];

	// Filter to only include entries whose profile type the user actively selected.
	// If selectedIncomeProfiles is not set (legacy data), include all entries for backward compat.
	const selectedProfiles = rawApplicant.selectedIncomeProfiles;
	const hasProfileFilter = Array.isArray(selectedProfiles) && selectedProfiles.length > 0;

	const visibleEntries = hasProfileFilter
		? entries.filter((e: Record<string, unknown>) => {
				const profileType = String(e.profileType ?? '');
				return selectedProfiles.includes(profileType);
			})
		: entries;

	return visibleEntries.map((e: Record<string, unknown>) => ({
		profileType: String(e.profileType ?? ''),
		entityName: String(e.entityName ?? ''),
		income: (e.income as Record<string, unknown>) ?? {},
		evidence: {
			itrFiled: Boolean((e.evidence as Record<string, unknown>)?.itrFiled),
			hasDocumentaryEvidence: Boolean(
				(e.evidence as Record<string, unknown>)?.hasDocumentaryEvidence
			),
			vintageYears: toNumber((e.evidence as Record<string, unknown>)?.vintageYears) ?? undefined
		}
	}));
}

/**
 * Extracts financials data from the table format
 */
export function extractFinancials(
	tableData: Record<string, unknown> | undefined
): FinancialsData | undefined {
	if (!tableData) return undefined;

	const grossReceipts = Array.isArray(tableData.grossReceipts)
		? tableData.grossReceipts.map((v) => toNumber(v) ?? 0).filter((v) => v > 0)
		: [];

	const netProfitSource = Array.isArray(tableData.netProfit)
		? tableData.netProfit
		: Array.isArray(tableData.netProfitArray)
			? tableData.netProfitArray
			: [];
	const netProfit = (netProfitSource as unknown[])
		.map((v: unknown) => toNumber(v) ?? 0)
		.filter((v: number) => v > 0);

	const depreciationSource = Array.isArray(tableData.depreciation)
		? tableData.depreciation
		: Array.isArray(tableData.depreciationArray)
			? tableData.depreciationArray
			: [];
	const depreciation = (depreciationSource as unknown[]).map((v: unknown) => toNumber(v) ?? 0);

	const itrFiled = Array.isArray(tableData.itrFiled)
		? tableData.itrFiled.filter((v): v is string => typeof v === 'string' && v.length > 0)
		: [];

	if (grossReceipts.length === 0 && netProfit.length === 0) return undefined;

	return { grossReceipts, netProfit, depreciation, itrFiled };
}
