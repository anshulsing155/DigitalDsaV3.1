/**
 * DATA-4 — Income bracketing.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md §5.
 *
 * The operational store holds MONTHLY income (CSFLE-encrypted). The analytics
 * store keeps the exact monthly figure (`borrower_income_exact`) plus a
 * bracket for segment queries. The bracket bands (₹2L / ₹5L / ₹10L / ₹20L /
 * ₹50L) are the standard ANNUAL income bands Indian lenders segment on, so we
 * annualize (×12) before bucketing — bracketing the monthly figure against
 * annual bands would collapse nearly every salaried borrower into '<2L' and
 * destroy the segmentation. (Decision recorded in the spec's open-question Q
 * resolution; see also the field row in §5.)
 * ══════════════════════════════════════════════════════════════════════════════
 */

const LAKH = 100_000;
const MONTHS_PER_YEAR = 12;

// Upper bounds (exclusive) for each labelled band, in annual rupees. The last
// band ('>50L') is open-ended. Lower-inclusive: exactly ₹2L annual → '2L-5L'.
const ANNUAL_BANDS: Array<{ ltAnnual: number; label: string }> = [
	{ ltAnnual: 2 * LAKH, label: '<2L' },
	{ ltAnnual: 5 * LAKH, label: '2L-5L' },
	{ ltAnnual: 10 * LAKH, label: '5L-10L' },
	{ ltAnnual: 20 * LAKH, label: '10L-20L' },
	{ ltAnnual: 50 * LAKH, label: '20L-50L' }
];
const TOP_BAND_LABEL = '>50L';

/**
 * Map a MONTHLY income figure to its annual income bracket label.
 *
 * Defensive: non-positive / non-finite input returns null (the caller stores
 * null rather than bucketing missing income as '<2L', which would be a
 * misleading data point).
 *
 * @example
 *   incomeBracket(50_000)   → '5L-10L'   // ₹6L/year
 *   incomeBracket(15_000)   → '<2L'      // ₹1.8L/year
 *   incomeBracket(500_000)  → '>50L'     // ₹60L/year
 *   incomeBracket(0)        → null
 */
export function incomeBracket(monthlyIncome: number | null | undefined): string | null {
	if (monthlyIncome === null || monthlyIncome === undefined) return null;
	if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) return null;

	const annual = monthlyIncome * MONTHS_PER_YEAR;
	for (const band of ANNUAL_BANDS) {
		if (annual < band.ltAnnual) return band.label;
	}
	return TOP_BAND_LABEL;
}
