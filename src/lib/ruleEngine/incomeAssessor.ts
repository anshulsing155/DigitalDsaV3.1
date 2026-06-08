/**
 * =============================================================================
 * RE-2: Income Assessment & Obligation Computation Module
 * =============================================================================
 *
 * This module handles:
 *  1. Mapping employment types to income profile types
 *  2. Extracting gross monthly income from applicant data
 *  3. Obligation load computation across all applicants
 *  4. FOIR cap determination via json-logic rule evaluation
 *
 * NOTE: Multi-applicant income assessment (V2) is in incomeAssessorV2.ts.
 * The V1 assessIncome() function was removed — V2 is canonical.
 *
 * All financial computations use numbers (not strings). String-to-number
 * parsing happens at the boundary (e.g., obligation EMI/limit fields).
 * =============================================================================
 */

import type { ParsedObligationRule, ParsedRule, ObligationDetail } from './types.js';
import type { LoanApplicationPayload, ApplicantPayload } from '$lib/utils/payloadBuilder.js';
import jsonLogic from 'json-logic-js';
import { FALLBACK_OBLIGATION_COUNT_FACTOR, ENRICHER_CREDIT_LINE_FACTOR } from './systemConfig.js';

// =============================================================================
// 1. Employment Type to Income Profile Type Mapping
// =============================================================================

/**
 * Maps form employment type strings to the income_profile_type values
 * used in lender rule documents. These profile types determine which
 * income assessment rules apply to a given applicant.
 */
export function mapEmploymentToProfileType(employmentType: string): string {
	switch (employmentType) {
		case 'Salaried(Private)':
			return 'salaried_regular';
		case 'Salaried(Government)':
			return 'salaried_government';
		case 'Self-employed(Professional)':
			return 'professional_practice';
		case 'Self-employed(Other)':
			return 'business_proprietorship';
		case 'Pensioner':
			return 'pension';
		case 'Unemployed':
			return 'no_current_income';
		default:
			return 'unknown';
	}
}

// =============================================================================
// 2. Gross Monthly Income Extraction
// =============================================================================

/**
 * Extracts the gross monthly income from an applicant based on their
 * employment type and available data fields. Handles salaried, self-employed,
 * pensioner, unemployed, and company applicants.
 *
 * For self-employed and company applicants with financials, computes the
 * average of the last 2-3 years of net profit divided by 12.
 */
export function extractGrossMonthlyIncome(applicant: ApplicantPayload): number {
	// Company applicants use financial data regardless of employment type
	if (applicant.applicantType === 'Company') {
		if (applicant.financials?.netProfit && applicant.financials.netProfit.length > 0) {
			const profits = applicant.financials.netProfit;
			const sum = profits.reduce((acc, val) => acc + val, 0);
			return sum / profits.length / 12;
		}
		return 0;
	}

	const empType = applicant.employmentType;

	switch (empType) {
		case 'Salaried(Private)':
		case 'Salaried(Government)': {
			return applicant.netIncome ?? applicant.grossIncome ?? 0;
		}

		case 'Self-employed(Professional)':
		case 'Self-employed(Other)': {
			// Primary: average of last 2-3 years net profit from financials
			if (applicant.financials?.netProfit && applicant.financials.netProfit.length > 0) {
				const profits = applicant.financials.netProfit;
				const sum = profits.reduce((acc, val) => acc + val, 0);
				let monthly = sum / profits.length / 12;

				// Add monthly other income if present
				if (applicant.monthlyOtherIncome) {
					monthly += applicant.monthlyOtherIncome;
				}

				return monthly;
			}

			// Fallback to direct income fields
			return applicant.netIncome ?? applicant.grossIncome ?? 0;
		}

		case 'Pensioner': {
			return applicant.netIncome ?? applicant.grossIncome ?? 0;
		}

		case 'Unemployed': {
			return applicant.monthlyOtherIncome ?? 0;
		}

		default: {
			// Unknown employment type -- attempt best-effort extraction
			return applicant.netIncome ?? applicant.grossIncome ?? 0;
		}
	}
}

// =============================================================================
// 4. Obligation Load Computation
// =============================================================================

/**
 * Computes the total monthly obligation load across all applicants.
 *
 * For each applicant with existing obligations:
 *  - Parses EMI and limit values from strings to numbers
 *  - Applies obligation treatment rules (count factors, credit line factors)
 *  - Handles closing obligations (may be ignored per lender rules)
 *
 * Returns the total monthly obligation amount and per-obligation breakdowns.
 */
export function computeObligationLoad(
	applicants: ApplicantPayload[],
	obligationRules: ParsedObligationRule[] | null
): { totalMonthly: number; details: ObligationDetail[] } {
	const details: ObligationDetail[] = [];
	let totalMonthly = 0;

	for (let i = 0; i < applicants.length; i++) {
		const applicant = applicants[i];

		// Skip applicants without obligations
		if (applicant.hasExistingObligations !== true || !applicant.obligations) {
			continue;
		}

		for (let j = 0; j < applicant.obligations.length; j++) {
			const obl = applicant.obligations[j];
			const emi = parseFloat(obl.emi || '0');
			const totalLimit = parseFloat(obl.totalLimit || '0');
			const oblType = obl.obligationType;

			// Check if this obligation is marked for closure
			const isClosing = obl.selectedToClose !== 'Keep running';

			// Find matching obligation rule — prefer specific loan_type_filter match,
			// fall back to generic obligation_type match (e.g., bank sets 3% for OD
			// but default 5% for CC via two separate rules)
			const loanType = obl.loanType;
			const matchingRule = obligationRules
				? (obligationRules.find(
						(r) =>
							r.obligation_type === oblType && r.loan_type_filter && r.loan_type_filter === loanType
					) ??
					obligationRules.find((r) => r.obligation_type === oblType && !r.loan_type_filter) ??
					null)
				: null;

			// Business-paid exclusion
			if (obl.emiPaidBy === 'business_account') {
				details.push({
					applicant_index: i,
					obligation_index: j,
					type: oblType,
					loan_type: loanType,
					original_amount: oblType === 'term_loan' ? emi : totalLimit,
					counted_amount: 0,
					treatment_applied: 'business_paid_excluded',
					loan_capacity: obl.loanCapacity,
					ownership_split: 0
				});
				continue;
			}

			// Director/partner proportional split
			const loanCapacity = obl.loanCapacity;
			const ownershipPercent = obl.ownershipPercent;
			let capacityMultiplier = 1;
			if (
				(loanCapacity === 'as_director' || loanCapacity === 'as_partner') &&
				typeof obl.applicantEmiShare !== 'number' &&
				typeof ownershipPercent === 'number' &&
				ownershipPercent > 0 &&
				ownershipPercent < 100
			) {
				capacityMultiplier = ownershipPercent / 100;
			}

			let countedAmount: number;
			let treatmentApplied: string;

			// Handle closing obligations
			if (isClosing && matchingRule?.treatment.ignore_if_closing === true) {
				countedAmount = 0;
				treatmentApplied = 'ignored_closing';
			} else if (oblType === 'term_loan') {
				// Use applicantEmiShare when available (equal split / proof override / zero for guarantors)
				const baseEmi = typeof obl.applicantEmiShare === 'number' ? obl.applicantEmiShare : emi;
				// Use rule-specified factor; fallback to conservative 100% count (FALLBACK_OBLIGATION_COUNT_FACTOR)
				const countFactor =
					matchingRule?.treatment.count_factor ?? FALLBACK_OBLIGATION_COUNT_FACTOR;
				countedAmount = baseEmi * countFactor * capacityMultiplier;
				treatmentApplied = countFactor === 1 ? 'full' : `${countFactor * 100}%`;
			} else {
				// credit_line — use applicantEmiShare as limit share when available
				const baseLimit =
					typeof obl.applicantEmiShare === 'number' ? obl.applicantEmiShare : totalLimit;
				// Use rule-specified factor; fallback to conservative 5% (ENRICHER_CREDIT_LINE_FACTOR)
				const factor = matchingRule?.treatment.credit_line_factor ?? ENRICHER_CREDIT_LINE_FACTOR;
				countedAmount = baseLimit * factor * capacityMultiplier;
				treatmentApplied = `${factor * 100}%_of_limit`;
			}

			totalMonthly += countedAmount;

			details.push({
				applicant_index: i,
				obligation_index: j,
				type: oblType,
				loan_type: loanType,
				original_amount: oblType === 'term_loan' ? emi : totalLimit,
				counted_amount: countedAmount,
				treatment_applied: treatmentApplied,
				loan_capacity: loanCapacity,
				ownership_split: capacityMultiplier !== 1 ? capacityMultiplier : undefined
			});
		}
	}

	return { totalMonthly, details };
}

// =============================================================================
// 5. FOIR Cap Determination
// =============================================================================

/**
 * Determines the applicable FOIR (Fixed Obligation to Income Ratio) cap
 * by evaluating FOIR rules via json-logic against the loan payload.
 *
 * Rules are evaluated in order; the last matching rule wins (most specific).
 * The result is clamped to the 0-1 range.
 *
 * Returns `null` if no FOIR rules exist or none match — caller must handle
 * (evaluationEngine will check if max_foir was set by parameter extraction;
 * if still undefined → GREY the lender).
 *
 * FOIR rule logic typically uses the pattern:
 *   { "if": [condition, { "max_foir": 0.50 }, null] }
 * So jsonLogic.apply returns { "max_foir": 0.50 } or null.
 */
export function determineFoirCap(
	payload: LoanApplicationPayload,
	foirRules: ParsedRule[] | null
): number | null {
	if (!foirRules || foirRules.length === 0) {
		return null;
	}

	let cap: number | null = null;

	for (const rule of foirRules) {
		// Only process computed or parameter tier rules
		if (rule.tier !== 'computed' && rule.tier !== 'parameter') {
			continue;
		}

		// Check applies_when condition if present
		if (rule.applies_when != null) {
			try {
				const applies = jsonLogic.apply(rule.applies_when, payload);
				if (!applies) {
					continue;
				}
			} catch {
				// If condition evaluation fails, skip this rule
				continue;
			}
		}

		// Evaluate the rule logic against the payload
		try {
			const result = jsonLogic.apply(rule.logic, payload);

			if (result == null) {
				continue;
			}

			// Result is an object with a FOIR key (e.g., { max_foir: 0.50 })
			if (typeof result === 'object' && !Array.isArray(result)) {
				const resultObj = result as Record<string, unknown>;
				if ('max_foir' in resultObj && typeof resultObj.max_foir === 'number') {
					cap = resultObj.max_foir;
				}
			}

			// Result is a direct numeric FOIR value
			if (typeof result === 'number' && result >= 0 && result <= 1) {
				cap = result;
			}
		} catch {
			// If logic evaluation fails, skip this rule
			continue;
		}
	}

	// Clamp to valid range if a value was found
	return cap !== null ? Math.max(0, Math.min(1, cap)) : null;
}
