/**
 * DATA-4 — Age computation + 5-year bracketing.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md §5.
 *
 * The operational store holds a date-of-birth (CSFLE-encrypted). The
 * analytics store keeps the exact integer age (useful on its own) plus a
 * 5-year bracket for grouping queries. The raw DOB never crosses over —
 * a date of birth is identifying, an age is not.
 *
 * Bracket convention is lower-inclusive: a borrower who just turned 30 lands
 * in '30-35', not '25-30'. So bracket(age) = `${floor(age/5)*5}-${that+5}`.
 * ══════════════════════════════════════════════════════════════════════════════
 */

const BRACKET_SPAN_YEARS = 5;

/**
 * Compute integer age in whole years from a date of birth as of `asOf`
 * (defaults to now). Decrements by one if this year's birthday hasn't
 * happened yet, so the value matches how a human would state their age.
 *
 * Defensive: invalid / future / non-date input returns null — the caller
 * stores null rather than a nonsensical age.
 *
 * @example
 *   computeAge(new Date('1994-01-01'), new Date('2024-01-01')) → 30
 *   computeAge(new Date('1994-06-01'), new Date('2024-01-01')) → 29  // pre-birthday
 */
export function computeAge(dob: Date | string | null | undefined, asOf: Date = new Date()): number | null {
	if (dob === null || dob === undefined) return null;
	const born = dob instanceof Date ? dob : new Date(dob);
	if (Number.isNaN(born.getTime())) return null;
	if (born.getTime() > asOf.getTime()) return null; // DOB in the future — bad data

	let age = asOf.getFullYear() - born.getFullYear();
	// Subtract a year if the birthday hasn't occurred yet this calendar year.
	const monthDiff = asOf.getMonth() - born.getMonth();
	const beforeBirthdayThisYear =
		monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < born.getDate());
	if (beforeBirthdayThisYear) age -= 1;

	if (age < 0) return null; // guards leap-day / same-day edge cases
	return age;
}

/**
 * Map an integer age to its 5-year bracket label (lower-inclusive).
 *
 * Defensive: null / NaN / negative input returns null.
 *
 * @example
 *   ageBracket(30) → '30-35'
 *   ageBracket(29) → '25-30'
 *   ageBracket(0)  → '0-5'
 *   ageBracket(null) → null
 */
export function ageBracket(age: number | null | undefined): string | null {
	if (age === null || age === undefined || !Number.isFinite(age) || age < 0) return null;
	const lower = Math.floor(age / BRACKET_SPAN_YEARS) * BRACKET_SPAN_YEARS;
	return `${lower}-${lower + BRACKET_SPAN_YEARS}`;
}
