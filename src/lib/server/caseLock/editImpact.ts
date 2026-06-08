/**
 * Case Lock — Edit Impact Classifier
 * ══════════════════════════════════════════════════════════════════
 * Classifies proposed case edits as 'minor' (silently allowed) or
 * 'major' (requires re-lock + quota charge). This runs server-side
 * only (per AD-15 / Decision 4.1).
 *
 * // 🟡 PHASE-3-DESIGN-DECISIONS Decision 2.1 may change post-beta
 * // — see docs/specs/PHASE-3-DESIGN-DECISIONS.md §2
 * // Current "major" definition uses 5 field triggers. Beta DSA
 * // edit-pattern data may show boundaries are too loose/tight.
 * // When revisiting: update MAJOR_EDIT_TRIGGERS below + add new
 * // reason strings. All consumers read reasons[] programmatically.
 *
 * See: docs/specs/DOCUMENT-PARSER-FORM-INTEGRATION.md §4.2
 * Decision 2.1 🟡 — definition of "major edit" (5 fields)
 * Decision 3.1 — ₹5L bucket size (used in amount comparison)
 * ══════════════════════════════════════════════════════════════════
 */

// ── Types ───────────────────────────────────────────────────────

export type EditImpact = 'minor' | 'major';

export interface EditImpactResult {
	/** Whether this edit is minor (free) or major (costs quota) */
	impact: EditImpact;
	/**
	 * Human-readable reason codes explaining WHY this is major.
	 * Empty array for minor edits.
	 * Used by the UI to show specific messaging (Decision 4.2 forward-note).
	 */
	reasons: string[];
}

/**
 * Minimal case shape needed for edit classification.
 * We only look at the fields that can trigger a major edit —
 * not the full Case document (keeps coupling minimal).
 */
export interface CaseEditSnapshot {
	loan_type: string;
	loan_amount: number;
	/** Applicants with their PAN numbers */
	applicants: Array<{ pan: string }>;
	/** Property state — only relevant for secured loans */
	property_state?: string | null;
}

// ── Constants ───────────────────────────────────────────────────

/**
 * Amount bucket size in INR (₹5L). Must match fingerprint.ts.
 * Decision 3.1 — ₹5L bucket size confirmed.
 */
const AMOUNT_BUCKET_SIZE = 500_000;

/**
 * Percentage threshold for amount change to be "major".
 * >10% change is major regardless of bucket crossing.
 * Decision 2.1 🟡 — "amount changed > ±10% OR crosses ₹5L bucket"
 */
const AMOUNT_PERCENT_THRESHOLD = 0.10;

// ── Core Function ───────────────────────────────────────────────

/**
 * Classify a proposed edit as minor or major.
 *
 * Major edit triggers (Decision 2.1 🟡):
 *   1. Loan type changed
 *   2. Applicant count changed (added or removed)
 *   3. PAN swapped at any applicant slot
 *   4. Loan amount changed >±10% OR crosses a ₹5L bucket boundary
 *   5. Property state changed (secured loans only)
 *
 * Everything else is minor: address, phone, employer name, tenure,
 * ROI, amount within ±10% same bucket, etc.
 *
 * @param before - The case state BEFORE the edit
 * @param after - The case state AFTER the proposed edit
 * @returns Impact classification with reasons
 */
export function classifyEdit(before: CaseEditSnapshot, after: CaseEditSnapshot): EditImpactResult {
	const reasons: string[] = [];

	// ── Trigger 1: Loan type changed ─────────────────────────────
	if (normalizeString(before.loan_type) !== normalizeString(after.loan_type)) {
		reasons.push('loan_type_changed');
	}

	// ── Trigger 2 & 3: Applicant changes ─────────────────────────
	// Count change = major (applicant added or removed)
	if (before.applicants.length !== after.applicants.length) {
		reasons.push('applicant_count_changed');
	} else {
		// Same count — check for PAN swaps at any slot
		for (let i = 0; i < before.applicants.length; i++) {
			const beforePan = normalizePan(before.applicants[i]?.pan);
			const afterPan = normalizePan(after.applicants[i]?.pan);
			if (beforePan !== afterPan) {
				reasons.push(`applicant_${i}_pan_changed`);
			}
		}
	}

	// ── Trigger 4: Amount major change ───────────────────────────
	// Major if: percentage delta > 10% OR crosses a ₹5L bucket boundary
	const amountReasons = classifyAmountChange(before.loan_amount, after.loan_amount);
	if (amountReasons) {
		reasons.push(amountReasons);
	}

	// ── Trigger 5: Property state changed ────────────────────────
	// Only relevant when both before and after have a property state
	// (i.e. secured loans). If the before case had no property state
	// and the after case adds one, that's typically setting initial
	// data (not a "change") — so we check both are non-empty.
	const beforeState = normalizeString(before.property_state || '');
	const afterState = normalizeString(after.property_state || '');
	if (beforeState && afterState && beforeState !== afterState) {
		reasons.push('property_state_changed');
	}

	return {
		impact: reasons.length > 0 ? 'major' : 'minor',
		reasons
	};
}

// ── Helpers ─────────────────────────────────────────────────────

/**
 * Classify amount change as major or null (minor).
 * Major if: >±10% OR crosses a ₹5L bucket boundary.
 */
function classifyAmountChange(beforeAmt: number, afterAmt: number): string | null {
	// Skip if amounts are identical or both zero
	if (beforeAmt === afterAmt) return null;
	if (beforeAmt === 0 && afterAmt === 0) return null;

	// Guard against division by zero (before was 0, now non-zero = always major)
	if (beforeAmt === 0) return 'amount_major_change';

	// Check percentage threshold (>10% change)
	const percentDelta = Math.abs(afterAmt - beforeAmt) / beforeAmt;
	if (percentDelta > AMOUNT_PERCENT_THRESHOLD) {
		return 'amount_major_change';
	}

	// Check bucket boundary crossing
	const beforeBucket = Math.floor(beforeAmt / AMOUNT_BUCKET_SIZE);
	const afterBucket = Math.floor(afterAmt / AMOUNT_BUCKET_SIZE);
	if (beforeBucket !== afterBucket) {
		return 'amount_major_change';
	}

	// Amount change is within ±10% AND same bucket = minor
	return null;
}

/** Normalize a string for comparison (lowercase, trimmed) */
function normalizeString(value: string): string {
	return value.toLowerCase().trim();
}

/** Normalize PAN for comparison (uppercase, trimmed, handle undefined) */
function normalizePan(pan: string | undefined | null): string {
	return (pan || '').toUpperCase().trim();
}

// ── Utility Exports ─────────────────────────────────────────────

/**
 * Quick check: is this edit major? (convenience wrapper)
 */
export function isMajorEdit(before: CaseEditSnapshot, after: CaseEditSnapshot): boolean {
	return classifyEdit(before, after).impact === 'major';
}

/**
 * Exported for testing and for fingerprint.ts alignment.
 * Both modules must use the same bucket size.
 */
export { AMOUNT_BUCKET_SIZE, AMOUNT_PERCENT_THRESHOLD };
