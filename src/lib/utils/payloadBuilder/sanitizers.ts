/**
 * Type conversion and sanitization utilities for payload building.
 */

/**
 * Converts Indian number string to number
 * @example "12,50,000" → 1250000
 */
export function toNumber(value: unknown): number | null {
	if (value === null || value === undefined || value === '') return null;
	if (typeof value === 'number') return isNaN(value) ? null : value;
	if (typeof value === 'string') {
		const cleaned = value.replace(/,/g, '').trim();
		if (cleaned === '') return null;
		const num = Number(cleaned);
		return isNaN(num) ? null : num;
	}
	return null;
}

/**
 * Safely gets boolean value from various input types
 */
export function toBoolean(value: unknown): boolean {
	if (typeof value === 'boolean') return value;
	if (value === 'Yes' || value === 'yes' || value === 'true' || value === '1') return true;
	return false;
}

/**
 * Derives title/salutation from gender and marital status.
 * Male → "Mr.", Female married/widow → "Mrs.", Female otherwise → "Ms."
 */
export function deriveTitle(gender: string, maritalStatus: string): string | undefined {
	const g = gender?.toLowerCase();
	const m = maritalStatus?.toLowerCase();
	if (g === 'male') return 'Mr.';
	if (g === 'female') {
		if (m && ['married', 'widowed'].includes(m)) return 'Mrs.';
		return 'Ms.';
	}
	return undefined;
}
