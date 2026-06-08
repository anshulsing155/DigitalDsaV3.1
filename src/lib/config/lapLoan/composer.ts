/**
 * Loan Against Property Schema Composer
 *
 * Replaces the monolithic JSON schema with a TypeScript composition layer.
 * Produces the exact same RawSchema output.
 */
import type { RawSchema } from '../schema/schemaTypes.js';
import { getAllPages } from './pages.js';

/** Compose the complete Loan Against Property schema. */
export function composeLapLoanSchema(): RawSchema {
	return {
		formId: 'lapSchemaV2',
		title: 'Loan Against Property Application',
		pages: getAllPages()
	};
}
