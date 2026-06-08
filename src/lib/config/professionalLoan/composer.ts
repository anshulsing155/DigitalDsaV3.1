/**
 * Professional Loan Schema Composer
 *
 * Replaces the monolithic JSON schema with a TypeScript composition layer.
 * Produces the exact same RawSchema output.
 */
import type { RawSchema } from '../schema/schemaTypes.js';
import { getAllPages } from './pages.js';

/** Compose the complete Professional Loan schema. */
export function composeProfessionalLoanSchema(): RawSchema {
	return {
		formId: 'professionalLoanSchemaV2',
		title: 'Professional Loan Application',
		pages: getAllPages()
	};
}
