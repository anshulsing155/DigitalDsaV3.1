/**
 * Loan Processing Location — Personal Loan
 * Page: locationPage
 *
 * Unlike secured loans (which anchor on the property location), Personal Loan
 * has no property. The natural anchor is the city where the DSA wants the
 * case processed — typically the applicant's residence, but often different
 * (works in Bangalore, family signs in the village; or vice versa). Capturing
 * "processing location" here lets co-applicants on the Applicants page mark
 * their residence as Same city / Different city same state / Different state
 * relative to this anchor — same UX as secured loans, just a different
 * anchor noun.
 *
 * Field names (`residenceStateName`/`residenceCityName`/`residencePincode`)
 * are unchanged for backward compat — only the question framing shifts.
 */

import type { RawSchemaQuestion } from '../../schema/schemaTypes.js';
import { buildResidenceLocationQuestion } from '../../schema/locationQuestions.js';

// ---------------------------------------------------------------------------
// q_residenceLocation — Compound location (State + City + Pincode)
// Stored as `residenceStateName` / `residenceCityName` / `residencePincode`;
// represents the **processing-branch city**, not necessarily the applicant's
// home. Per-applicant residence is captured on the Applicants page relative
// to this anchor.
// ---------------------------------------------------------------------------

export const q_residenceLocation: RawSchemaQuestion = buildResidenceLocationQuestion({
	question: 'From which city do you want this loan to be processed?',
	description:
		'Pick the city where you want this loan processed — typically the applicant’s residence, but it can be the workplace city or a major metro for wider branch coverage. Co-applicants will mark their own residence relative to this city on the Applicants page.',
	selectClass: 'mt-[2rem] md:mt-[3rem]'
});

/** Returns all questions for the Residence Location page.
 *  Salary bank question removed — depends on employmentType from next page.
 */
export function getLocationPageQuestions(): RawSchemaQuestion[] {
	return [q_residenceLocation];
}
