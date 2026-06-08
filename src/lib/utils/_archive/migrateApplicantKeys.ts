/**
 * Migrate Legacy Applicant Key Names
 * ═══════════════════════════════════════════════════════════════════
 * Session 54 unified field keys (fullNameOfApplicant → fullName, etc.)
 * but old data persisted in localStorage/sessionStorage still uses
 * the old keys. This single function normalizes ALL legacy keys.
 *
 * Run this ONCE at every data boundary:
 *   - When loading applicants from storage (form.svelte.ts)
 *   - When restoring from recovery cache (applicantRestoreHandler.ts)
 *   - When creating recovery entries (applicantFormManager.svelte.ts)
 *
 * DO NOT add ad-hoc fallback checks elsewhere — fix here, fix once.
 * ═══════════════════════════════════════════════════════════════════
 */

/** Map of old key → new key. Add any future renames here. */
const LEGACY_KEY_MAP: Record<string, string> = {
	fullNameOfApplicant: 'fullName',
	FullNameApplicant: 'fullName',
	selectedAge: 'age'
};

/**
 * Migrate legacy keys on a single applicant record (mutates in-place).
 * Safe to call multiple times — only copies if the new key is missing.
 */
export function migrateApplicantKeys(applicant: Record<string, any>): void {
	if (!applicant || typeof applicant !== 'object') return;

	for (const [oldKey, newKey] of Object.entries(LEGACY_KEY_MAP)) {
		if (!applicant[newKey] && applicant[oldKey]) {
			applicant[newKey] = applicant[oldKey];
		}
	}
}

/**
 * Migrate legacy keys on an array of applicants (mutates in-place).
 * Returns the same array for chaining convenience.
 */
export function migrateAllApplicantKeys<T extends Record<string, any>>(
	applicants: T[]
): T[] {
	for (const applicant of applicants) {
		migrateApplicantKeys(applicant);
	}
	return applicants;
}
