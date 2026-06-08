/**
 * =============================================================================
 * LOAN APPLICATION PAYLOAD BUILDER — Re-export Barrel
 * =============================================================================
 * This file re-exports everything from the payloadBuilder/ directory.
 * All consumers importing from '$lib/utils/payloadBuilder' continue to work.
 *
 * The actual implementation is split into domain modules:
 *   payloadBuilder/types.ts          — Type definitions
 *   payloadBuilder/sanitizers.ts     — toNumber, toBoolean, deriveTitle
 *   payloadBuilder/activityProfiles.ts — Activity selection → profile builders
 *   payloadBuilder/incomePayload.ts  — Income & financial extraction
 *   payloadBuilder/obligationPayload.ts — Obligation/debt processing
 *   payloadBuilder/applicantPayload.ts — Single applicant payload builder
 *   payloadBuilder/loanTransaction.ts  — Loan transaction & orchestrators
 *   payloadBuilder/comparePayloads.ts  — Payload diff utility
 * =============================================================================
 */

export {
	// Types
	type ActivitySelections,
	type ObligationEntry,
	type FinancialsData,
	type DirectorInfo,
	type GPADetails,
	type CleanIncomeEntry,
	type RelationshipEntry,
	type ApplicantPayload,
	type LoanTransactionPayload,
	type LoanApplicationPayload,
	type StructuredPayload,

	// Sanitizers
	toNumber,
	toBoolean,
	deriveTitle,

	// Activity profiles
	extractSelectedOptions,
	hasAnySelected,
	buildSalariedProfile,
	buildGovernmentProfile,
	buildBusinessProfile,
	buildPensionProfile,
	buildLowCreditReasons,

	// Income
	extractIncomeEntries,
	extractFinancials,

	// Obligations
	CREDIT_LINE_TYPES,
	cleanObligationEntries,

	// Applicant payload
	resolveRelationship,
	buildApplicantPayload,

	// Loan transaction & orchestrators
	buildLoanTransactionPayload,
	buildLoanPayload,
	buildStructuredPayload,

	// Comparison utility
	comparePayloads
} from './payloadBuilder/index.js';

export default {
	buildLoanPayload,
	buildApplicantPayload,
	buildLoanTransactionPayload,
	comparePayloads
};

// Re-import for default export
import {
	buildLoanPayload,
	buildApplicantPayload,
	buildLoanTransactionPayload,
	comparePayloads
} from './payloadBuilder/index.js';
