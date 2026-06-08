/**
 * obligationClosureScrub.ts — Journey-dependent closure-plan validation
 * ════════════════════════════════════════════════════════════════════
 *
 * The set of valid `selectedToClose` values is journey-dependent. Switching
 * journey families (e.g. Personal-DC → Plot-New) leaves stored values that
 * are no longer in the visible-options list — Saved Obligations chips show
 * stale labels, form has no option selected, Next-disabled validators silently
 * pass because they only check "has value", not "value ∈ visible options".
 *
 * This module provides pure helpers for detecting and clearing such drift.
 * Wired into `applicantRestoreHandler.commitApplicantRestore` (cross-loan
 * restore scrubs against target journey) and exposed for any future
 * journey-change cleanup paths.
 *
 * See CLAUDE.md Pitfall #31.
 */

import { CLOSURE_OPTIONS, getClosureOptionsFiltered } from '$lib/config/obligationOptions';
import type { ObligationRole } from '$lib/types/obligation';

/**
 * True when an obligation's `selectedToClose` is among the visible closure
 * options for the (role, obligation.loanType, journey loanVariant) context.
 *
 * Note: `getClosureOptionsFiltered` takes the OBLIGATION's loanType (e.g.
 * "Car Loan", "Home Loan") — used internally for the LAP special case —
 * NOT the journey's loan product. The journey contribution is via
 * `loanVariant` ("New Loan", "Debt Consolidation", "Top-up", etc.) which
 * decides whether "Close by this new loan" is visible.
 *
 * Empty / undefined / unset returns `true` — "user hasn't picked yet" isn't
 * an invalid value, just an incomplete one. Next-disabled gates handle the
 * required-ness check separately; this helper is only about "is the stored
 * value still legal for the current journey".
 */
export function isClosureValueValid(
	selectedToClose: string | null | undefined,
	role: ObligationRole | string | null | undefined,
	obligationLoanType: string,
	journeyLoanVariant: string
): boolean {
	const sel = String(selectedToClose ?? '').trim();
	if (!sel) return true;
	// Only KNOWN canonical options are subject to journey-validity. Unknown
	// values (test fixtures, hand-written garbage, future enums) aren't
	// "stale" — they're a different problem; let route-specific completion
	// checks handle them. The stale-detection here is specifically for
	// "value was valid in source journey, no longer visible in target journey".
	const isKnownOption = CLOSURE_OPTIONS.some((o) => o.value === sel);
	if (!isKnownOption) return true;
	const r = ((role as string | undefined)?.trim() || 'co-applicant') as ObligationRole;
	const visible = getClosureOptionsFiltered(r, obligationLoanType, journeyLoanVariant);
	return visible.some((o) => o.value === sel);
}

/**
 * If an obligation's `selectedToClose` is no longer among the current journey's
 * visible options, clear it so the form re-asks. Other fields are preserved.
 *
 * Returns the same reference when no change is needed — callers can use
 * reference identity to detect "anything scrubbed".
 */
export function scrubObligationForJourney<T extends Record<string, unknown>>(
	obligation: T,
	journeyLoanVariant: string
): T {
	const sel = String(obligation?.selectedToClose ?? '');
	if (!sel) return obligation;
	const obligationLoanType = String(obligation.loanType ?? '');
	if (
		isClosureValueValid(
			sel,
			obligation.role as string | undefined,
			obligationLoanType,
			journeyLoanVariant
		)
	) {
		return obligation;
	}
	return { ...obligation, selectedToClose: '' };
}

/**
 * Batch scrub for an obligations array. Returns the same array reference when
 * nothing changed (caller can compare to skip downstream re-writes).
 */
export function scrubObligationsForJourney<T extends Record<string, unknown>>(
	obligations: T[] | null | undefined,
	journeyLoanVariant: string
): T[] {
	if (!obligations || obligations.length === 0) return obligations ?? [];
	let changed = false;
	const next = obligations.map((o) => {
		const scrubbed = scrubObligationForJourney(o, journeyLoanVariant);
		if (scrubbed !== o) changed = true;
		return scrubbed;
	});
	return changed ? next : obligations;
}
