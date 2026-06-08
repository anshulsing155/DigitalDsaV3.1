/**
 * Schema Loader (Server-Side Only)
 *
 * Loads form schemas by loan type. All 6 loan types use TypeScript
 * composition layers in src/lib/config/{loanType}/ with question banks,
 * page builders, and composer functions.
 *
 * IMPORTANT: This module can ONLY be imported from server-side code
 * (+page.server.ts, +server.ts, hooks.server.ts, or other $lib/server/ files).
 */
import type { RawSchema } from '$lib/types/formEngine';

// ============================================================================
// Deep Freeze Utility
// ============================================================================

/**
 * Recursively freeze an object to prevent accidental mutation of cached schemas.
 */
function deepFreeze<T extends object>(obj: T): T {
	Object.freeze(obj);
	for (const value of Object.values(obj)) {
		if (value && typeof value === 'object' && !Object.isFrozen(value)) {
			deepFreeze(value);
		}
	}
	return obj;
}

// ============================================================================
// Schema Imports (static imports for reliable bundling)
// ============================================================================

import { composeHomeLoanSchema } from '$lib/config/homeLoan/composer.js';
import { composeLapLoanSchema } from '$lib/config/lapLoan/composer.js';
import { composePlotLoanSchema } from '$lib/config/plotLoan/composer.js';
import { composePersonalLoanSchema } from '$lib/config/personalLoan/composer.js';
import { composeBusinessLoanSchema } from '$lib/config/businessLoan/composer.js';
import { composeProfessionalLoanSchema } from '$lib/config/professionalLoan/composer.js';
import commonPageSchema from '$lib/config/commonPage.json';
import formSchema from '$lib/config/formSchema.json';

// Applicant/component schemas (single source of truth in $lib/config/)
import applicantQuestion from '$lib/config/applicantQuestion.json';
import applicantBasicDetails from '$lib/config/applicantBasicDetails.json';
import applicantBasicDetailsSecuredLoans from '$lib/config/applicantBasicDetailsSecuredLoans.json';
import salariedQuestion from '$lib/config/salariedQuestion.json';
import businessOtherQuestions from '$lib/config/businessOtherQuestions.json';
import businessQuestions from '$lib/config/businessQuestions.json';
import companyQuestion from '$lib/config/companyQuestion.json';
import companyBasicData from '$lib/config/companyBasicData.json';
import directorsQuestion from '$lib/config/directorsQuestion.json';
import directorTable from '$lib/config/directorTable.json';
import professionalQuestion from '$lib/config/professionalQuestion.json';
import pensionerPerson from '$lib/config/pensionerPerson.json';
import unemployedPerson from '$lib/config/unemployedPerson.json';
import GPAforNRI from '$lib/config/GPAforNRI.json';
import GPAOfNRIApplicant from '$lib/config/GPAOfNRIApplicant.json';
import obligation from '$lib/config/obligation.json';
// ============================================================================
// Loan Type -> Schema Mapping
// ============================================================================

/**
 * Map of loan type names (as selected in the form) to their main schemas.
 *
 * PERFORMANCE: Each compose function is called exactly once at module init.
 * The LAP entry reuses the same schema reference (not a second composition)
 * because schemas are frozen and never mutated — sharing is safe.
 *
 * After construction, all schemas are deep-frozen to prevent accidental
 * mutation. This cache persists for the lifetime of the server process,
 * eliminating per-request composition overhead.
 */
const lapSchema = composeLapLoanSchema();

const mainSchemaMap: Record<string, unknown> = {
	'Home Loan': composeHomeLoanSchema(),
	'Loan Against Property': lapSchema,
	LAP: lapSchema,
	'Plot Loan': composePlotLoanSchema(),
	'Personal Loan': composePersonalLoanSchema(),
	'Business Loan': composeBusinessLoanSchema(),
	'Professional Loan': composeProfessionalLoanSchema()
};

/**
 * Map of component/sub-schema names to their schemas.
 * These are used by the engine for applicant details, income profiling, etc.
 */
const componentSchemaMap: Record<string, unknown> = {
	commonPage: commonPageSchema,
	formSchema: formSchema,
	applicantQuestion: applicantQuestion,
	applicantBasicDetails: applicantBasicDetails,
	applicantBasicDetailsSecuredLoans: applicantBasicDetailsSecuredLoans,
	salariedQuestion: salariedQuestion,
	businessOtherQuestions: businessOtherQuestions,
	businessQuestions: businessQuestions,
	companyQuestion: companyQuestion,
	companyBasicData: companyBasicData,
	directorsQuestion: directorsQuestion,
	directorTable: directorTable,
	professionalQuestion: professionalQuestion,
	pensionerPerson: pensionerPerson,
	unemployedPerson: unemployedPerson,
	GPAforNRI: GPAforNRI,
	GPAOfNRIApplicant: GPAOfNRIApplicant,
	obligation: obligation
};

// Deep-freeze all cached schemas to prevent accidental mutation
for (const schema of Object.values(mainSchemaMap)) {
	if (schema && typeof schema === 'object' && !Object.isFrozen(schema)) {
		deepFreeze(schema as object);
	}
}
for (const schema of Object.values(componentSchemaMap)) {
	if (schema && typeof schema === 'object' && !Object.isFrozen(schema)) {
		deepFreeze(schema as object);
	}
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Load the main form schema for a loan type.
 *
 * @param loanType - The loan type name (e.g. "Home Loan", "LAP", "Plot Loan")
 * @returns The raw schema object
 * @throws Error if the loan type is not recognized
 */
export function loadSchema(loanType: string): RawSchema {
	const schema = mainSchemaMap[loanType];

	if (!schema) {
		throw new Error(
			`[FormEngine] Unknown loan type: "${loanType}". ` +
				`Available types: ${Object.keys(mainSchemaMap).join(', ')}`
		);
	}

	// Schema is frozen at module init — safe to return directly
	return schema as RawSchema;
}

/**
 * Load a component/sub-schema by name.
 *
 * @param name - The component schema name (e.g. "applicantBasicDetails", "obligation")
 * @returns The raw schema object
 * @throws Error if the schema name is not recognized
 */
export function loadComponentSchema(name: string): unknown {
	const schema = componentSchemaMap[name];

	if (!schema) {
		throw new Error(
			`[FormEngine] Unknown component schema: "${name}". ` +
				`Available: ${Object.keys(componentSchemaMap).join(', ')}`
		);
	}

	// Schema is frozen at module init — safe to return directly
	return schema;
}

/**
 * Get all available loan type names.
 */
export function getAvailableLoanTypes(): string[] {
	return Object.keys(mainSchemaMap);
}

/**
 * Get all available component schema names.
 */
export function getAvailableComponentSchemas(): string[] {
	return Object.keys(componentSchemaMap);
}
