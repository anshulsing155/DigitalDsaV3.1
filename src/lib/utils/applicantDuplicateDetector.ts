/**
 * Applicant Duplicate Detection
 * ═══════════════════════════════════════════════════════════════════
 * Pure utility for detecting duplicate applicants by comparing
 * key identity fields (name+age+gender for individuals,
 * companyName+companyType+businessType for companies).
 *
 * Extracted from AddApplicant.svelte for reuse and testability.
 */

import type { LegacyApplicant } from '$lib/stores/loanData';

/** Normalize a value to a lowercase trimmed string for comparison */
function normalize(v: unknown): string {
	return (v ?? '').toString().trim().toLowerCase();
}

/**
 * Find indexes of duplicate applicants in the list.
 * Two individuals match if they share name + age + gender.
 * Two companies match if they share companyName + companyType + businessType.
 * Returns a Set of all indexes that are part of a duplicate pair.
 */
export function findDuplicateApplicants(applicants: LegacyApplicant[]): Set<number> {
	const dup = new Set<number>();

	for (let i = 0; i < applicants.length; i++) {
		for (let j = i + 1; j < applicants.length; j++) {
			const a = applicants[i];
			const b = applicants[j];
			if (!a || !b) continue;

			// only same applicant type
			if (a.applicantType !== b.applicantType) continue;

			if (a.applicantType === 'Individual') {
				// Skip company-linked individuals — they're directors, not duplicates
				if (a.linkedCompanyId || b.linkedCompanyId) continue;

				if (
					normalize(a.fullName) === normalize(b.fullName) &&
					normalize(a.age) === normalize(b.age) &&
					normalize(a.gender) === normalize(b.gender)
				) {
					dup.add(i);
					dup.add(j);
				}
			} else {
				if (
					normalize(a.companyName) === normalize(b.companyName) &&
					normalize(a.companyType) === normalize(b.companyType) &&
					normalize(a.businessType) === normalize(b.businessType)
				) {
					dup.add(i);
					dup.add(j);
				}
			}
		}
	}

	return dup;
}

/**
 * Generate a user-facing error message for detected duplicates.
 * Returns empty string if no duplicates.
 */
export function getDuplicateErrorMessage(
	duplicateIndexes: Set<number>,
	applicants: LegacyApplicant[]
): string {
	if (duplicateIndexes.size === 0) return '';

	const duplicateTypes = Array.from(duplicateIndexes).map((idx) => applicants[idx]?.applicantType);

	const hasIndividuals = duplicateTypes.some((type) => type === 'Individual');
	const hasCompanies = duplicateTypes.some((type) => type === 'Company');

	if (hasIndividuals && hasCompanies) {
		return 'Two or more applicants have identical details. Each applicant must be unique.';
	} else if (hasIndividuals) {
		return 'Two or more applicants have identical details (name, age and gender). Each applicant must be unique.';
	} else if (hasCompanies) {
		return 'Two or more applicants have identical details (company name, type and business type). Each applicant must be unique.';
	}

	return '';
}
