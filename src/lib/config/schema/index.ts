/**
 * Shared Schema Infrastructure
 *
 * Central exports for all loan type composition layers.
 */

export type {
	RulesLogic,
	RawSchema,
	RawSchemaQuestion,
	RawSchemaPage,
	RawSchemaOption,
	SwitchArray
} from './schemaTypes.js';

export { jl } from './jsonLogicHelpers.js';

export {
	buildApplicantPage,
	buildApplicantProfilePage,
	buildIncomeProfilesPage,
	buildIncomeDetailsPage,
	buildCreditScorePage,
	buildObligationsPage
} from './customComponentPages.js';
