/**
 * Applicant Role Validation
 * ═══════════════════════════════════════════════════════════════════
 * Pure utility for validating applicant roles (On Property / On EMI)
 * in secured loan flows. Handles guarantor exemptions, NRI pensioner
 * rules, and global role distribution checks.
 *
 * Extracted from AddApplicant.svelte for reuse and testability.
 */

import type { LegacyApplicant } from '$lib/stores/loanData';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ShouldShowFn = (...args: any[]) => boolean;

/** Check if an applicant is a pure guarantor (not on property or EMI) */
export function isGuarantorApplicant(a: LegacyApplicant, hasRoleQuestions: boolean): boolean {
	if (!hasRoleQuestions) return false;

	// New classification system — check first (takes precedence)
	// Guarantors and non-applicants (both=No) are exempt from role distribution rules
	const classification = (a as Record<string, unknown>).applicantClassification as
		| string
		| undefined;
	if (
		classification === 'guarantor_financial' ||
		classification === 'guarantor_non_financial' ||
		classification === 'non_applicant_full_financial' ||
		classification === 'non_applicant_cibil_only'
	) {
		return true;
	}

	// Legacy check (backward compat for old saved forms)
	return (
		a.applicantType === 'Individual' &&
		a.isGuarantor === 'Yes' &&
		a.onProperty !== true &&
		a.onEMI !== true
	);
}

/**
 * Compute the BT applicant-structure role-distribution warning, or '' when valid.
 *
 * The existing total-count check (in applicantFormManager.btMismatchWarning) only
 * compares `actualCount === btExpectedCount`. A user who declared 1 guarantor +
 * 0 co-applicants could add 2 Co-Applicants and pass the count check while having
 * zero applicants marked as Guarantor. This helper handles the ROLE distribution.
 *
 * Pure function — caller passes the role classifier so this stays import-light.
 * See CLAUDE.md Pitfall #34.
 *
 * @param typed Applicants with applicantType set (already filtered by caller)
 * @param btCoApplicantCount Declared co-applicants on the existing loan
 * @param btGuarantorCount Declared guarantors on the existing loan
 * @param isGuarantorFn Returns true when an applicant classifies as guarantor
 * @returns Warning message, or '' if role distribution is consistent
 */
export function computeBtRoleMismatchWarning(
	typed: LegacyApplicant[],
	btCoApplicantCount: number,
	btGuarantorCount: number,
	isGuarantorFn: (a: LegacyApplicant) => boolean
): string {
	if (typed.length === 0) return '';
	const actualGuarantors = typed.filter((a) => isGuarantorFn(a)).length;
	if (actualGuarantors === btGuarantorCount) return '';

	const noun = (n: number) => (n === 1 ? 'guarantor' : 'guarantors');
	if (btGuarantorCount > 0 && actualGuarantors === 0) {
		return `Existing loan declares ${btGuarantorCount} ${noun(btGuarantorCount)}, but no applicant is marked as Guarantor below. Edit one applicant's role to "Guarantor" so the structure matches.`;
	}
	if (btGuarantorCount === 0 && actualGuarantors > 0) {
		return `No guarantor declared on the existing loan, but ${actualGuarantors} applicant${actualGuarantors > 1 ? 's are' : ' is'} marked as Guarantor below. Either increase the Guarantor count above or change the applicant's role.`;
	}
	return `Existing loan declares ${btGuarantorCount} ${noun(btGuarantorCount)}, but ${actualGuarantors} ${noun(actualGuarantors)} marked below. Adjust either the count or the applicant roles to match.`;
	// btCoApplicantCount currently unused — kept in the signature for future
	// co-applicant-count validation symmetry (would mirror the guarantor branch).
	void btCoApplicantCount;
}

/**
 * Check whether the global role error should be cleared.
 * Returns true when role distribution is valid, false when invalid.
 *
 * Rules:
 * - Unsecured loans: always valid (no onProperty/onEMI)
 * - Single NRI Pensioner: invalid
 * - Single applicant: both onProperty AND onEMI must be true
 * - Multiple: each non-guarantor needs at least one role; group needs both roles covered
 */
export function shouldClearGlobalRoleError(
	applicants: LegacyApplicant[],
	hasRoleQuestions: boolean
): boolean {
	if (!hasRoleQuestions) return true;

	const typed = applicants.filter((a) => a.applicantType && !isTrulyEmpty(a));

	if (typed.length === 0) return true;

	if (typed.length === 1 && typed[0].isNRI == 'Yes' && typed[0].employmentType == 'Pensioner') {
		return false;
	}

	// Single applicant — BOTH must be true, but only check when both fields have been answered
	if (typed.length === 1) {
		const a = typed[0];
		const propertyAnswered = a.onProperty === true || a.onProperty === false;
		const emiAnswered = a.onEMI === true || a.onEMI === false;
		if (!propertyAnswered || !emiAnswered) return true;
		return a.onProperty === true && a.onEMI === true;
	}

	// Multiple applicants — NRI Pensioner-only group is invalid
	if (typed.every((a) => a.employmentType == 'Pensioner' && a.isNRI == 'Yes')) {
		return false;
	}

	// Separate guarantors from non-guarantors
	const nonGuarantors = typed.filter((a) => !isGuarantorApplicant(a, hasRoleQuestions));

	// Each non-guarantor must have at least one role (onProperty or onEMI)
	const eachHasRole = nonGuarantors.every((a) => a.onProperty === true || a.onEMI === true);
	if (!eachHasRole) return false;

	// At least one non-guarantor must be On Property AND at least one must be On EMI
	const hasOnProperty = nonGuarantors.some((a) => a.onProperty === true);
	const hasOnEMI = nonGuarantors.some((a) => a.onEMI === true);

	return hasOnProperty && hasOnEMI;
}

/** Check if applicant card is complete enough to show role validation errors */
export function isCardReadyForRoleValidation(applicant: LegacyApplicant): boolean {
	return applicant.onProperty !== undefined && applicant.onEMI !== undefined;
}

/**
 * Get applicant status for table display.
 * Returns 'complete' if all visible required fields are answered, 'pending' otherwise.
 */
export function getApplicantStatus(
	applicant: LegacyApplicant,
	_index: number,
	appData: Record<string, unknown>,
	configQuestions: any[],
	shouldShowFn: ShouldShowFn
): 'complete' | 'pending' {
	if (!applicant.applicantType) return 'pending';

	const visibleQs = configQuestions.filter(
		(q) =>
			q.key !== 'applicantType' && shouldShowFn(q.showWhen as any, { ...applicant, ...appData })
	);

	for (const q of visibleQs) {
		if (q.key === 'applicantType') continue;
		const val = applicant[q.key];
		if (val === undefined || val === null || val === '') return 'pending';
	}

	return 'complete';
}

/**
 * Generate the appropriate role validation error message for validateStep.
 * Returns empty string if roles are valid.
 */
export function getRoleValidationError(
	applicants: LegacyApplicant[],
	hasRoleQuestions: boolean
): string {
	if (shouldClearGlobalRoleError(applicants, hasRoleQuestions)) return '';

	if (applicants.length === 1) {
		if ((applicants[0] as any).isNRI == 'Yes' && applicants[0].employmentType == 'Pensioner') {
			return 'Single NRI Pensioner applicants is not allowed.';
		}
		return 'For a single applicant, both On Property and On EMI must be marked Yes.';
	}

	// Multiple applicants
	const nonGuarantors = applicants.filter((a) => !isGuarantorApplicant(a, hasRoleQuestions));

	if (applicants.every((a: any) => a.employmentType == 'Pensioner' && a.isNRI == 'Yes')) {
		return 'All applicants cannot be NRI pensioners.';
	}

	// Company must be on Property (collateral) or EMI (borrower).
	// If neither, the company has no role — add the people as Individual co-applicants
	// instead. The income page already warns about company financials for high-stake individuals.
	const companyBothNo = nonGuarantors.find(
		(a) => a.applicantType === 'Company' && a.onProperty === false && a.onEMI === false
	);
	if (companyBothNo) {
		return 'Company must be on Property or EMI. If the company is not on the loan, add the directors as Individual co-applicants instead.';
	}

	// Individual applicants (except guarantors) must be on property or EMI
	if (!nonGuarantors.every((a) => a.onProperty === true || a.onEMI === true)) {
		return 'Each applicant (except guarantors) must be marked Yes for at least one of: On Property or On EMI.';
	}

	if (!nonGuarantors.some((a) => a.onProperty === true)) {
		return 'At least one applicant must be marked Yes for On Property.';
	}

	if (!nonGuarantors.some((a) => a.onEMI === true)) {
		return 'At least one applicant must be marked Yes for On EMI.';
	}

	return 'Each applicant (except guarantors) must be marked Yes for at least one of: On Property or On EMI.';
}

/** Internal helper — check if applicant has no meaningful data */
function isTrulyEmpty(applicant: LegacyApplicant): boolean {
	const meaningfulKeys = Object.keys(applicant).filter(
		(k) => !['hasError', 'shake', 'id', 'touchedFields'].includes(k)
	);

	return meaningfulKeys.every((k) => {
		const val = applicant[k];
		if (typeof val === 'boolean' || val === null) return false;
		return val === undefined || val === '';
	});
}
