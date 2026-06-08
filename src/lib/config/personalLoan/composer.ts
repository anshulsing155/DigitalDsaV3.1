/**
 * Personal Loan Schema Composer
 *
 * Replaces the monolithic JSON schema with a TypeScript composition layer.
 * Produces the exact same RawSchema output.
 */
import type { RawSchema } from '../schema/schemaTypes.js';
import { getAllPages } from './pages.js';

/** Compose the complete Personal Loan schema. */
export function composePersonalLoanSchema(): RawSchema {
	return {
		formId: 'personalLoanSchemaV2',
		title: 'Personal Loan Application',
		pages: getAllPages()
	};
}
