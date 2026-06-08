/**
 * Plot Loan Schema Composer
 *
 * Replaces the monolithic JSON schema with a TypeScript composition layer.
 * Produces the exact same RawSchema output.
 */
import type { RawSchema } from '../schema/schemaTypes.js';
import { getAllPages } from './pages.js';

/** Compose the complete Plot Loan schema. */
export function composePlotLoanSchema(): RawSchema {
	return {
		formId: 'plotLoanSchemaV2',
		title: 'Plot Loan Application',
		pages: getAllPages()
	};
}
