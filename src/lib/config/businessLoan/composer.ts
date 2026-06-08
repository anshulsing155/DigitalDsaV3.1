/**
 * Business Loan Schema Composer
 *
 * Replaces the monolithic JSON schema with a TypeScript composition layer.
 * Produces the exact same RawSchema output.
 */
import type { RawSchema } from '../schema/schemaTypes.js';
import { getAllPages } from './pages.js';

/** Compose the complete Business Loan schema. */
export function composeBusinessLoanSchema(): RawSchema {
	return {
		formId: 'businessLoanSchemaV2',
		title: 'Business Loan Application',
		pages: getAllPages()
	};
}
