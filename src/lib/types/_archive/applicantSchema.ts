/**
 * Applicant Schema Types
 *
 * This file re-exports the canonical Applicant type from form.ts.
 * The ApplicantType is also defined in form.ts but re-exported here for convenience.
 *
 * For the full Applicant interface, import from './form' or this file.
 */

// Re-export canonical types from form.ts
export type { Applicant, ApplicantType } from './form';

/**
 * @deprecated Use Applicant from './form' instead.
 * This minimal interface is kept only for reference of what the original schema contained.
 * It should not be used in new code.
 */
export interface ApplicantSchemaMinimal {
	applicantType?: 'Individual' | 'Company';

	// Individual
	fullName?: string;
	applicantAge?: string;
	gender?: 'male' | 'female' | 'others';

	// Company
	companyName?: string;
	companyType?: string;

	// Common
	existingRoleOfPerson?: string;

	// UI helpers
	hasError?: boolean;
	shake?: boolean;
}
