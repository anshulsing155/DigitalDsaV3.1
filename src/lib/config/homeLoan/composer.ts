/**
 * Home Loan Schema Composer
 *
 * Replaces the monolithic homeLoanSchemaV2.json with a TypeScript
 * composition layer. Produces the exact same RawSchema output.
 */
import type { RawSchema } from './types.js';
import { getAllPages } from './pages.js';

/**
 * Compose the complete Home Loan schema.
 *
 * Returns a RawSchema with all 18 pages. Each page's showWhen
 * condition gates visibility at runtime — the composed output
 * is structurally identical to homeLoanSchemaV2.json.
 */
export function composeHomeLoanSchema(): RawSchema {
	return {
		formId: 'homeLoanSchemaV2',
		title: 'Home Loan Application',
		pages: getAllPages()
	};
}
