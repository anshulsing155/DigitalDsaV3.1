/**
 * Obligation/debt processing utilities.
 */

import type { ObligationEntry } from './types.js';
import { toNumber } from './sanitizers.js';
import { generateId } from '$lib/utils.js';

/** Loan types that are credit lines (revolving credit) rather than term loans */
export const CREDIT_LINE_TYPES = new Set(['CC Limit', 'OD Limit', 'Dropline OD']);

/**
 * Cleans obligation entries - removes formatted/UI fields and empty entries.
 * Supports both the new unified obligations[] array and legacy split arrays.
 *
 * IMPORTANT: Respects the guarantor-only mode. When user says ObligationsRunning=No
 * but isGuarantorOnOtherLoan=Yes, only guarantor-role entries should reach the payload.
 * Co-borrower entries are hidden in UI but were previously leaking into the rule engine,
 * causing inflated EMI/FOIR calculations.
 */
export function cleanObligationEntries(rawApplicant: Record<string, unknown>): ObligationEntry[] {
	// Prefer unified obligations array; fall back to legacy split arrays
	let entries: unknown[];
	if (Array.isArray(rawApplicant.obligations)) {
		entries = rawApplicant.obligations;
	} else {
		entries = [
			...(Array.isArray(rawApplicant.tableLoanEntries) ? rawApplicant.tableLoanEntries : []),
			...(Array.isArray(rawApplicant.tableLimitEntries) ? rawApplicant.tableLimitEntries : [])
		];
	}

	if (entries.length === 0) return [];

	// Guarantor-only mode: user said "no running obligations" but "yes guarantor on other loan"
	// Only guarantor-role entries should be included — co-borrower entries must be excluded
	// to prevent inflated EMI/FOIR in rule engine calculations
	const isGuarantorOnlyMode =
		rawApplicant.ObligationsRunning === 'No' && rawApplicant.isGuarantorOnOtherLoan === 'Yes';

	return entries
		.filter(
			(entry): entry is Record<string, unknown> =>
				entry !== null && typeof entry === 'object' && 'loanType' in entry
		)
		.filter((entry) => {
			// In guarantor-only mode, exclude non-guarantor entries
			if (isGuarantorOnlyMode && String(entry.role ?? '') !== 'guarantor') {
				return false;
			}
			return true;
		})
		.map((entry) => {
			const loanType = String(entry.loanType ?? '');
			const obligationType = entry.obligationType
				? (String(entry.obligationType) as 'term_loan' | 'credit_line')
				: CREDIT_LINE_TYPES.has(loanType)
					? 'credit_line'
					: 'term_loan';
			const isCreditLine = obligationType === 'credit_line';

			// borrowerCount: lender API expects an integer (raw sometimes a string).
			// Convert to number; drop if invalid/zero.
			const borrowerCountNum =
				entry.borrowerCount != null && entry.borrowerCount !== ''
					? Number(entry.borrowerCount)
					: undefined;

			return {
				id: String(entry.id ?? generateId()),
				obligationType,
				loanType,
				bankName: String(entry.bankName ?? ''),
				selectedToClose: String(entry.selectedToClose ?? 'Keep running'),
				emi: String(toNumber(entry.emi) ?? '0'),
				tenure: String(entry.tenure ?? ''),
				interestRate: String(entry.interestRate ?? ''),

				// ── Term-loan-only fields ──
				...(!isCreditLine && entry.principalOutstanding
					? { principalOutstanding: String(toNumber(entry.principalOutstanding) ?? entry.principalOutstanding) }
					: {}),

				// ── Credit-line-only fields (CC / OD / Dropline OD) ──
				// Previously emitted unconditionally — caused term loans like Gold Loan
				// to carry meaningless totalLimit/remainingLimit/utilizedAmount fields
				// in the lender payload. Restrict to credit lines.
				...(isCreditLine
					? {
							totalLimit: String(toNumber(entry.totalLimit) ?? '0'),
							remainingLimit: String(toNumber(entry.remainingLimit) ?? '0'),
							utilizedAmount: String(toNumber(entry.utilizedAmount) ?? '0')
						}
					: {}),
				...(entry.sanctionedLimit ? { sanctionedLimit: String(entry.sanctionedLimit) } : {}),
				...(entry.sanctionedTenure ? { sanctionedTenure: String(entry.sanctionedTenure) } : {}),
				...(entry.remainingTenure ? { remainingTenure: String(entry.remainingTenure) } : {}),

				// ── Payment / role metadata ──
				...(entry.emiPaidBy ? { emiPaidBy: String(entry.emiPaidBy) } : {}),
				...(entry.emiPaymentMode ? { emiPaymentMode: String(entry.emiPaymentMode) } : {}),
				...(entry.emiPaidByName ? { emiPaidByName: String(entry.emiPaidByName) } : {}),
				...(entry.role ? { role: String(entry.role) } : {}),
				...(borrowerCountNum != null && Number.isFinite(borrowerCountNum) && borrowerCountNum > 0
					? { borrowerCount: borrowerCountNum }
					: {}),
				...(entry.emiResponsibility ? { emiResponsibility: String(entry.emiResponsibility) } : {}),
				...(entry.evidence ? { evidence: String(entry.evidence) } : {}),
				...(entry.emiDelayHistory ? { emiDelayHistory: String(entry.emiDelayHistory) } : {}),
				...(entry.emiMethod ? { emiMethod: String(entry.emiMethod) } : {}),
				...(entry.applicantEmiShare != null
					? { applicantEmiShare: Number(entry.applicantEmiShare) }
					: {}),
				...(entry.hasProofOverride != null ? { hasProofOverride: !!entry.hasProofOverride } : {}),
				...(entry.monthlyShare ? { monthlyShare: String(entry.monthlyShare) } : {}),
				...(entry.loanCapacity || entry.capacity
					? { loanCapacity: String(entry.loanCapacity || entry.capacity) }
					: {}),
				...(typeof entry.ownershipPercent === 'number'
					? { ownershipPercent: Number(entry.ownershipPercent) }
					: {})
			};
		})
		.filter((entry) => entry.loanType);
}
