/**
 * EMI Share Calculator
 *
 * Computes each applicant's share of a shared obligation.
 * Credit bureau reports show the FULL EMI against every person on a loan.
 * For FOIR, the burden must be split — this module provides the equal-split
 * default and proof-based override.
 */

/**
 * Parses borrowerCount to number. Accepts string ('4+' → 4) or number.
 * The payload builder now emits borrowerCount as an integer for the lender API,
 * but legacy / raw runtime data may still be a string ('1', '4+'). Handle both.
 */
export function parseBorrowerCount(val: string | number | undefined | null): number {
	if (val == null || val === '') return 1;
	if (typeof val === 'number') return Number.isFinite(val) && val >= 1 ? Math.floor(val) : 1;
	const trimmed = String(val).replace('+', '').trim();
	const parsed = parseInt(trimmed, 10);
	return isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

/**
 * Core share computation — determines the applicant's EMI/limit share
 * for FOIR calculation.
 *
 * Precedence:
 * 1. role = Guarantor | Name Lender → 0
 * 2. emiMethod = 'Full from co-borrower' → 0
 * 3. emiPaidBy set and ≠ 'self' → 0
 * 4. borrowerCount = 1 or missing → full raw amount
 * 5. hasProofOverride = true + monthlyShare filled → override value
 * 6. Default: rawAmount / borrowerCount (equal split)
 */
export function computeApplicantEmiShare(entry: {
	role?: string;
	emiMethod?: string;
	emiPaidBy?: string;
	borrowerCount?: string | number;
	hasProofOverride?: boolean;
	monthlyShare?: string;
	emi?: string;
	totalLimit?: string;
	obligationType?: string;
	/** 6-way classification (when available, takes precedence over role) */
	applicantClassification?: string;
}): number {
	// Rule 0: Classification-aware — non-financial roles carry no burden
	if (
		entry.applicantClassification === 'co_applicant_non_financial' ||
		entry.applicantClassification === 'non_applicant_cibil_only' ||
		entry.applicantClassification === 'guarantor_non_financial'
	) {
		return 0;
	}
	// guarantor_financial / non_applicant_full_financial: carries obligations for independent assessment (normal share calculation)
	// co_applicant_financial: normal share calculation

	// Rule 1: Guarantor / Name Lender → no burden (legacy path)
	if (
		!entry.applicantClassification &&
		(entry.role === 'Guarantor' || entry.role === 'Name Lender')
	) {
		return 0;
	}

	// Rule 2: Full from co-borrower → no burden
	if (entry.emiMethod === 'Full from co-borrower') {
		return 0;
	}

	// Rule 3: Someone else pays → no burden
	if (entry.emiPaidBy && entry.emiPaidBy !== 'self') {
		return 0;
	}

	// Determine raw amount (EMI for term loans, totalLimit for credit lines)
	const isCreditLine = entry.obligationType === 'credit_line';
	const rawAmount = parseFloat((isCreditLine ? entry.totalLimit : entry.emi) || '0');

	if (rawAmount <= 0) return 0;

	const count = parseBorrowerCount(entry.borrowerCount);

	// Rule 4: Single borrower → full amount
	if (count <= 1) return rawAmount;

	// Rule 5: Proof override with valid monthlyShare
	if (entry.hasProofOverride && entry.monthlyShare) {
		const override = parseFloat(entry.monthlyShare.replace(/,/g, ''));
		if (!isNaN(override) && override >= 0) return override;
	}

	// Rule 6: Equal split
	return Math.round(rawAmount / count);
}
