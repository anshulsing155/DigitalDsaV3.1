/**
 * Shared Applicant Form Validation
 * ═══════════════════════════════════════════════════════════════════
 * Validation functions shared between AddApplicantProfessional and
 * AddApplicantBusiness. Each form calls these with its own question
 * set and OPC/companyType context.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { ApplicantQuestion } from '$lib/config/applicantQuestions';
import { getMinDirectors } from '$lib/utils/directorFormUtils';

// ── Individual Field Validation ─────────────────────────────────

export interface IndividualValidationOptions {
	/** Whether professionalCategory is a required field (Professional Loan only) */
	requireProfessionalCategory?: boolean;
}

/**
 * Validate a single individual applicant field.
 * Returns error message or null if valid.
 */
export function validateIndividualField(
	key: string,
	value: unknown,
	options?: IndividualValidationOptions
): string | null {
	if (key === 'fullName') {
		if (!value || String(value).trim() === '') return 'Name is required';
		if (String(value).trim().length < 2) return 'Name must be at least 2 characters';
		if (/(.)\1{2,}/.test(String(value))) return 'Name should not contain repetitive characters';
	} else if (key === 'gender') {
		if (!value) return 'Gender is required';
	} else if (key === 'age') {
		if (!value || value === '' || value === 0) return 'Age is required';
		const num = Number(value);
		if (num < 18) return 'Age must be at least 18 years';
		if (num > 80) return 'Age must not be more than 80 years';
	} else if (key === 'maritalStatus') {
		if (!value) return 'Marital status is required';
	} else if (key === 'isNRI') {
		if (!value) return 'NRI status is required';
	} else if (key === 'professionalCategory' && options?.requireProfessionalCategory) {
		if (!value) return 'Professional category is required';
	}
	return null;
}

// ── Company Field Validation ────────────────────────────────────

export interface CompanyValidationContext {
	/** Whether this is an OPC (One Person Company) — skips count/relationship validation */
	isOPC: boolean;
	/** The company type string for min-directors check */
	companyType: string;
	/** Label for error messages: "Firm" (Professional) or "Company" (Business) */
	entityLabel?: string;
}

/**
 * Validate a single company/firm field.
 * Returns error message or null if valid.
 */
export function validateCompanyField(
	key: string,
	value: unknown,
	context: CompanyValidationContext
): string | null {
	const label = context.entityLabel ?? 'Company';

	if (key === 'companyName') {
		const name = String(value ?? '').trim();
		if (name === '') return `${label} name is required`;
		if (name.length < 2) return `${label} name must be at least 2 characters`;
		// Must have real content — a name made only of digits/punctuation
		// (e.g. "123", "....") is not a legitimate registered entity name.
		if (!/[a-zA-Z]/.test(name)) return `${label} name must contain letters`;
		// Reject filler runs of 3+ repeated punctuation (e.g. "omega.........").
		// Limited to non-alphanumeric chars so legitimate names with repeated
		// letters (e.g. "AAA Corp", "AT&T") are still accepted.
		if (/([^a-zA-Z0-9\s])\1{2,}/.test(name))
			return `${label} name has invalid repeated characters`;
	} else if (key === 'registrationCountry') {
		if (!value) return 'Country of registration is required';
		// PITFALL: foreign-registered companies are not supported by Indian
		// lenders (FEMA / NRI restrictions). The FEMA confirmation modal in
		// AddApplicantBusiness / AddApplicantProfessional warns the DSA on
		// selection, but the auto-save $effect would silently write
		// "Foreign Country" to formState BEFORE the user dismisses the modal —
		// dismissal via browser-back / Escape / route-change then left the
		// stale value persisted (visible after Next/Previous navigation).
		// Treating non-India as a validation error blocks the auto-save at
		// the source so formState is never polluted. The local companyForm
		// buffer still shows the selection until the resetToIndia callback
		// fires; on any dismissal path, both buffer and (still-clean)
		// formState revert. See CLAUDE.md §3 Pitfall (FEMA persistence
		// across navigation, 2026-05-28).
		if (String(value) !== 'India')
			return 'Foreign-registered companies are not supported. Select India or apply as an Individual (NRI/OCI).';
	} else if (key === 'companyType') {
		if (!value) return 'Firm type is required';
	} else if (key === 'numberOfDirectorsOrPartners') {
		if (!context.isOPC && (!value || value === '')) return 'Number of stakeholders is required';
		if (!context.isOPC && value) {
			const min = getMinDirectors(context.companyType);
			if (Number(value) < min)
				return `Minimum ${min} required for ${context.companyType || 'this entity type'}`;
		}
	} else if (key === 'hasRelatedDirectors') {
		if (!context.isOPC && !value) return 'Please specify if stakeholders are related';
	}
	return null;
}

// ── Bulk Error Collection ───────────────────────────────────────

/**
 * Collect all errors for an individual applicant across given questions.
 */
export function getIndividualErrors(
	applicant: Record<string, unknown>,
	questions: ApplicantQuestion[],
	options?: IndividualValidationOptions
): Record<string, string> {
	const errors: Record<string, string> = {};
	for (const q of questions) {
		const error = validateIndividualField(q.key, applicant[q.key], options);
		if (error) errors[q.key] = error;
	}
	return errors;
}

/**
 * Collect all errors for a company/firm applicant across given questions.
 */
export function getCompanyErrors(
	applicant: Record<string, unknown>,
	questions: ApplicantQuestion[],
	context: CompanyValidationContext
): Record<string, string> {
	const errors: Record<string, string> = {};
	for (const q of questions) {
		const error = validateCompanyField(q.key, applicant[q.key], context);
		if (error) errors[q.key] = error;
	}
	return errors;
}
