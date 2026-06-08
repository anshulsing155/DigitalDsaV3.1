/**
 * RE-2: Income Assessment V2 — Per-Entry Multi-Source Assessment
 *
 * Replaces the per-applicant single-source assessment with per-entry
 * multi-source assessment that reads `incomeEntries[]` (what the form produces).
 *
 * Key differences from V1 (incomeAssessor.ts):
 *  - Reads `applicant.incomeEntries[]` instead of flat fields
 *  - Per-source gross extraction via `extractGrossFromEntry()`
 *  - `assessment_logic` support for custom JSON-Logic income computation
 *  - `max_contribution_percent` enforcement on secondary sources
 *  - `calculate_then_sum` strategy support
 *  - Falls back to V1 behavior when `incomeEntries[]` is absent
 *
 * The original `incomeAssessor.ts` is kept as-is for backward compatibility.
 */

import type { ParsedIncomeRule, AssessedIncomeSource } from './types.js';
import type {
	LoanApplicationPayload,
	ApplicantPayload,
	CleanIncomeEntry
} from '$lib/utils/payloadBuilder.js';
import { extractGrossFromEntry } from './payloadEnricher.js';
import { extractGrossMonthlyIncome, mapEmploymentToProfileType } from './incomeAssessor.js';
import jsonLogic from 'json-logic-js';

// ============================================================================
// PER-ENTRY INCOME ASSESSMENT
// ============================================================================

/**
 * Assess a single income entry against a matching income rule.
 * Returns the assessed amount after applying haircut or assessment_logic.
 */
function assessSingleEntry(
	entry: CleanIncomeEntry,
	grossAmount: number,
	rule: ParsedIncomeRule | null,
	payload: LoanApplicationPayload
): { assessedAmount: number; haircutPercent: number; ruleId?: string } {
	if (!rule) {
		return { assessedAmount: grossAmount, haircutPercent: 0 };
	}

	// Check conditions (JSON-Logic) if present
	if (rule.conditions && Object.keys(rule.conditions).length > 0) {
		try {
			const conditionMet = !!jsonLogic.apply(rule.conditions, payload);
			if (!conditionMet) {
				return { assessedAmount: 0, haircutPercent: 100, ruleId: rule.rule_id };
			}
		} catch {
			return { assessedAmount: 0, haircutPercent: 100, ruleId: rule.rule_id };
		}
	}

	if (!rule.accepted) {
		return { assessedAmount: 0, haircutPercent: 100, ruleId: rule.rule_id };
	}

	// assessment_logic overrides haircut_percent when present
	if (rule.assessment_logic && Object.keys(rule.assessment_logic).length > 0) {
		try {
			const entryContext = {
				...payload,
				_entry: {
					profileType: entry.profileType,
					entityName: entry.entityName,
					...entry.income,
					evidence: entry.evidence,
					grossAmount
				}
			};
			const result = jsonLogic.apply(rule.assessment_logic, entryContext);
			if (typeof result === 'number' && result >= 0) {
				const effectiveHaircut = grossAmount > 0 ? Math.round((1 - result / grossAmount) * 100) : 0;
				return { assessedAmount: result, haircutPercent: effectiveHaircut, ruleId: rule.rule_id };
			}
		} catch {
			// Fall through to haircut_percent
		}
	}

	// Standard haircut
	const assessed = grossAmount * (1 - rule.haircut_percent / 100);
	return { assessedAmount: assessed, haircutPercent: rule.haircut_percent, ruleId: rule.rule_id };
}

/**
 * Find the matching income rule for a profile type.
 * Tries exact match first, then falls back to `*` wildcard.
 */
function findMatchingRule(
	profileType: string,
	incomeRules: ParsedIncomeRule[] | null
): ParsedIncomeRule | null {
	if (!incomeRules) return null;
	return (
		incomeRules.find((r) => r.income_profile_type === profileType) ??
		incomeRules.find((r) => r.income_profile_type === '*') ??
		null
	);
}

// ============================================================================
// V2 INCOME ASSESSMENT — MULTI-SOURCE PER APPLICANT
// ============================================================================

/**
 * Performs multi-applicant, multi-source income assessment using `incomeEntries[]`.
 *
 * For each non-guarantor applicant:
 *  - If `incomeEntries[]` exists, iterates over entries
 *  - For each entry: extracts gross, finds matching rule, applies haircut/assessment_logic
 *  - Applies `max_contribution_percent` cap on secondary sources
 *
 * Falls back to V1 behavior (flat field extraction) when `incomeEntries[]` is absent.
 */
export function assessIncomeV2(
	applicants: ApplicantPayload[],
	incomeRules: ParsedIncomeRule[] | null,
	payload: LoanApplicationPayload,
	classificationOverrides?: Map<number, string>
): { totalAssessed: number; sources: AssessedIncomeSource[] } {
	const sources: AssessedIncomeSource[] = [];
	let runningTotal = 0;

	for (let i = 0; i < applicants.length; i++) {
		const applicant = applicants[i];

		// Classification-aware income pooling:
		// - co_applicant_non_financial / non_applicant_cibil_only / guarantor_non_financial → zero income (not assessed)
		// - guarantor_financial / non_applicant_full_financial → assessed independently, NOT added to pool (final_amount=0)
		// - co_applicant_financial → normal flow (income added to pool)
		// Legacy fallback: roleInApplication === 'Guarantor' → zero income
		// Per-lender override: if this lender re-classifies the applicant, use that instead
		const storedClassification = (applicant as unknown as Record<string, unknown>)
			.applicantClassification as string | undefined;
		const classification = classificationOverrides?.get(i) ?? storedClassification;
		const skipIncome =
			classification === 'co_applicant_non_financial' ||
			classification === 'non_applicant_cibil_only' ||
			classification === 'guarantor_non_financial';
		const independentAssessment =
			classification === 'guarantor_financial' || classification === 'non_applicant_full_financial';

		if (skipIncome || (!classification && applicant.roleInApplication === 'Guarantor')) {
			sources.push({
				applicant_index: i,
				profile_type: mapEmploymentToProfileType(applicant.employmentType),
				gross_amount: 0,
				haircut_percent: 0,
				assessed_amount: 0,
				final_amount: 0
			});
			continue;
		}

		// Use incomeEntries[] if available
		if (applicant.incomeEntries && applicant.incomeEntries.length > 0) {
			for (let j = 0; j < applicant.incomeEntries.length; j++) {
				const entry = applicant.incomeEntries[j];
				const grossAmount = extractGrossFromEntry(entry);
				const matchingRule = findMatchingRule(entry.profileType, incomeRules);

				const { assessedAmount, haircutPercent, ruleId } = assessSingleEntry(
					entry,
					grossAmount,
					matchingRule,
					payload
				);

				// Apply max_contribution_percent cap on non-primary sources
				let finalAmount = assessedAmount;
				let cappedAt: number | undefined;
				if (matchingRule?.max_contribution_percent != null && runningTotal > 0) {
					const maxAllowed = runningTotal * (matchingRule.max_contribution_percent / 100);
					if (finalAmount > maxAllowed) {
						cappedAt = maxAllowed;
						finalAmount = maxAllowed;
					}
				}

				// Guarantor (Financial): assessed independently, NOT added to the eligibility pool.
				// Income is stored in assessed_amount for per-lender independent evaluation,
				// but final_amount = 0 so it doesn't inflate the primary borrower's eligibility.
				if (independentAssessment) {
					sources.push({
						applicant_index: i,
						profile_type: entry.profileType,
						gross_amount: grossAmount,
						haircut_percent: haircutPercent,
						assessed_amount: assessedAmount,
						capped_at: cappedAt,
						final_amount: 0,
						rule_id: ruleId
					});
				} else {
					runningTotal += finalAmount;
					sources.push({
						applicant_index: i,
						profile_type: entry.profileType,
						gross_amount: grossAmount,
						haircut_percent: haircutPercent,
						assessed_amount: assessedAmount,
						capped_at: cappedAt,
						final_amount: finalAmount,
						rule_id: ruleId
					});
				}
			}
		} else {
			// Fallback: V1 behavior — flat field extraction
			const profileType = mapEmploymentToProfileType(applicant.employmentType);
			const grossMonthly = extractGrossMonthlyIncome(applicant);
			const matchingRule = findMatchingRule(profileType, incomeRules);

			let assessedAmount: number;
			let haircutPercent: number;
			let ruleId: string | undefined;

			if (!matchingRule) {
				haircutPercent = 0;
				assessedAmount = grossMonthly;
			} else {
				ruleId = matchingRule.rule_id;
				if (!matchingRule.accepted) {
					haircutPercent = 100;
					assessedAmount = 0;
				} else {
					haircutPercent = matchingRule.haircut_percent;
					assessedAmount = grossMonthly * (1 - haircutPercent / 100);
				}
			}

			let finalAmount = assessedAmount;
			let cappedAt: number | undefined;
			if (matchingRule?.max_contribution_percent != null && runningTotal > 0) {
				const maxAllowed = runningTotal * (matchingRule.max_contribution_percent / 100);
				if (finalAmount > maxAllowed) {
					cappedAt = maxAllowed;
					finalAmount = maxAllowed;
				}
			}

			if (independentAssessment) {
				sources.push({
					applicant_index: i,
					profile_type: profileType,
					gross_amount: grossMonthly,
					haircut_percent: haircutPercent,
					assessed_amount: assessedAmount,
					capped_at: cappedAt,
					final_amount: 0,
					rule_id: ruleId
				});
			} else {
				runningTotal += finalAmount;
				sources.push({
					applicant_index: i,
					profile_type: profileType,
					gross_amount: grossMonthly,
					haircut_percent: haircutPercent,
					assessed_amount: assessedAmount,
					capped_at: cappedAt,
					final_amount: finalAmount,
					rule_id: ruleId
				});
			}
		}
	}

	return { totalAssessed: runningTotal, sources };
}
