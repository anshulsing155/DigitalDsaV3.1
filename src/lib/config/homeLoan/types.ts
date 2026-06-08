/**
 * Home Loan — Domain Types & Helpers
 *
 * Re-exports shared schema infrastructure and adds home-loan-specific
 * domain types (LoanType, PropertyAreaType, PurchaseType, etc.).
 */

// Shared infrastructure — all question bank files import from here
export type {
	RulesLogic,
	RawSchema,
	RawSchemaQuestion,
	RawSchemaPage,
	RawSchemaOption,
	SwitchArray
} from '../schema/schemaTypes.js';

export { jl } from '../schema/jsonLogicHelpers.js';

// ---------------------------------------------------------------------------
// Domain value types
// ---------------------------------------------------------------------------

/** Loan type values used in schema conditions */
export type LoanType =
	| 'New Loan'
	| 'Balance Transfer Only'
	| 'Balance Transfer With Top-up'
	| 'Top-up Only';

/** Property area type values */
export type PropertyAreaType =
	| 'PLANNED_AUTHORITY'
	| 'CONVERTED_RESIDENTIAL'
	| 'OLD_MUNICIPAL'
	| 'LOCAL_COLONY'
	| 'UNKNOWN';

/** Purchase type values */
export type PurchaseType =
	| 'direct_from_builder'
	| 'direct_from_authority'
	| 'resale_normal'
	| 'resale_endorsement';

/** Transaction context that drives question selection and gating */
export interface TransactionContext {
	loanType: LoanType;
	purchaseType?: PurchaseType;
	areaType?: PropertyAreaType;
	propertyIdentified?: boolean;
}

/** Flow definition -- ordered list of page IDs for a loan type */
export interface FlowDefinition {
	loanType: LoanType;
	pages: string[];
	description: string;
}

/** Policy gate categories for organizing questions */
export type PolicyGateCategory =
	| 'area_policy'
	| 'project_policy'
	| 'transaction_policy'
	| 'property_condition'
	| 'legal_clearance'
	| 'counterparty_risk'
	| 'applicant_eligibility'
	| 'deal_structuring';

// ---------------------------------------------------------------------------
// Frequently-used loan type groupings
// ---------------------------------------------------------------------------

/** All BT and Top-up loan types (used frequently in showWhen to gate out) */
export const BT_TOPUP_TYPES: LoanType[] = [
	'Balance Transfer With Top-up',
	'Balance Transfer Only',
	'Top-up Only'
];

/** BT-only loan types (no standalone top-up) */
export const BT_ONLY_TYPES: LoanType[] = ['Balance Transfer Only', 'Balance Transfer With Top-up'];

/** All resale purchase types */
export const ALL_RESALE_TYPES: PurchaseType[] = ['resale_normal', 'resale_endorsement'];
