/**
 * Shared server-side utilities.
 * Small, focused helper functions used across API routes.
 */

/**
 * Escape special regex characters in user input to prevent injection.
 * Use this whenever building a RegExp from user-provided search strings.
 */
export function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
