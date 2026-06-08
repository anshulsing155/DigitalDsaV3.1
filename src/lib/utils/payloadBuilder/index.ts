/**
 * =============================================================================
 * PAYLOAD BUILDER — Barrel Export
 * =============================================================================
 * Re-exports all payload builder modules for clean imports.
 * =============================================================================
 */

// Types
export type {
	ActivitySelections,
	ObligationEntry,
	FinancialsData,
	DirectorInfo,
	GPADetails,
	CleanIncomeEntry,
	RelationshipEntry,
	ApplicantPayload,
	LoanTransactionPayload,
	LoanApplicationPayload,
	StructuredPayload
} from './types.js';

// Sanitizers
export { toNumber, toBoolean, deriveTitle } from './sanitizers.js';

// Activity profiles
export {
	extractSelectedOptions,
	hasAnySelected,
	buildSalariedProfile,
	buildGovernmentProfile,
	buildBusinessProfile,
	buildPensionProfile,
	buildLowCreditReasons
} from './activityProfiles.js';

// Income
export { extractIncomeEntries, extractFinancials } from './incomePayload.js';

// Obligations
export { CREDIT_LINE_TYPES, cleanObligationEntries } from './obligationPayload.js';

// Applicant payload
export { resolveRelationship, buildApplicantPayload } from './applicantPayload.js';

// Loan transaction & orchestrators
export {
	buildLoanTransactionPayload,
	buildLoanPayload,
	buildStructuredPayload
} from './loanTransaction.js';

// Comparison utility
export { comparePayloads } from './comparePayloads.js';
