/**
 * Applicant visibility helpers — canonical filter for "standalone applicant".
 *
 * The Who's Applying table hides Individual applicants whose `linkedCompanyId`
 * points to an existing Company applicant: those are rendered as sub-rows under
 * their parent company instead of standalone rows.
 *
 * Several wizard metadata counts (`__individualApplicantCount`, etc.) are read
 * by subsection `showWhen` rules — if those counts include director-linked
 * individuals while the table excludes them, downstream pages (e.g. the
 * Relationships subsection) appear when the user sees only one row, looking
 * like a phantom-applicant bug. Detected 2026-05-04: a Sole Proprietorship
 * Business Loan with one visible applicant was showing the Relationships page
 * because `__individualApplicantCount` counted three (one standalone + two
 * director-linked) while the table showed one.
 *
 * Use these helpers anywhere a count or dropdown should match the "Added
 * Applicants" table the user actually sees.
 */

export interface ApplicantLite {
	id?: string;
	applicantType?: string;
	linkedCompanyId?: string;
}

/**
 * True if the applicant is a standalone row in the Who's Applying table —
 * i.e. has an applicantType set, AND is not a director-linked sub-row of an
 * existing Company applicant. (If the linked company has been deleted, the
 * Individual is shown standalone — kept consistent with sortedApplicantEntries
 * in applicantFormManager.svelte.ts.)
 */
export function isStandaloneApplicant(
	applicant: ApplicantLite,
	allApplicants: ApplicantLite[]
): boolean {
	if (!applicant.applicantType) return false;
	const linkedId = applicant.linkedCompanyId;
	if (!linkedId) return true;
	const companyExists = allApplicants.some(
		(a) => a.id === linkedId && a.applicantType === 'Company'
	);
	return !companyExists;
}

/**
 * Count Individual applicants visible as standalone rows in the Who's Applying
 * table. Drives `__individualApplicantCount`, which gates subsection visibility
 * (e.g. the Relationships subsection).
 */
export function countStandaloneIndividuals(applicants: ApplicantLite[]): number {
	return applicants.filter(
		(a) => a.applicantType === 'Individual' && isStandaloneApplicant(a, applicants)
	).length;
}

/**
 * Income profiles that NRI applicants cannot have.
 *
 * Lenders cannot verify business or directorship income for NRIs — only
 * salaried NRI applicants are accepted in this product. Mirrors the
 * `showWhen: { '==': ['isNRI', 'No'] }` gates in profileCards.ts. When an
 * applicant flips isNRI from No to Yes, any of these profiles must be
 * cleared (with a confirmation prompt).
 *
 * Excludes `agriculture_income` and `no_current_income` even though both
 * are also NRI-gated — they're not "business" per the user's framing of
 * the rule, and adding them would broaden the prompt's scope.
 */
export const NRI_INCOMPATIBLE_BUSINESS_PROFILES: readonly string[] = [
	'business_proprietorship',
	'business_partnership',
	'director_company',
	'professional_practice'
] as const;

export function isNriIncompatibleBusinessProfile(profileType: string | undefined): boolean {
	return !!profileType && NRI_INCOMPATIBLE_BUSINESS_PROFILES.includes(profileType);
}
