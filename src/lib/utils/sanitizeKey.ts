/**
 * Converts a string into a safe key format by replacing spaces with underscores.
 * Returns an empty string if the input is undefined or empty.
 * @param value - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeKey(value: string | undefined): string {
	if (!value) return '';
	return value.replace(/\s+/g, '_');
}
