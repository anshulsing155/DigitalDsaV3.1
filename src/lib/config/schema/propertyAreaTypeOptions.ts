/**
 * Shared property-area-type options for `q1_propertyAreaType`.
 *
 * Used by:
 *   - lapLoan/questionBank/propertyLocation.ts
 *   - plotLoan/questionBank/propertyLocation_Plot.ts
 *
 * NOT used by homeLoan — its q1_propertyAreaType has an additional
 * `NOT_DECIDED` option and a `showWhen` override on `UNKNOWN` based on
 * `propertyIdentified`. Keep that file's options inline for clarity.
 *
 * Why a shared constant rather than a full question-factory:
 *   The literal duplication is the 5 option entries below — labels,
 *   values, helperText. Question text, description, warning, and
 *   showWhen all legitimately differ per loan type (LAP says "this
 *   property", Plot says "this plot", warnings reference loan-product-
 *   specific guidance). A factory hiding those differences would couple
 *   things that should evolve independently.
 *
 *   Single source of truth for the option taxonomy; per-loan-type wrapping
 *   stays explicit.
 */

import type { RawSchemaOption } from './schemaTypes.js';

export const PROPERTY_AREA_TYPE_BASE_OPTIONS: RawSchemaOption[] = [
	{
		label: 'Planned / Development Authority Area',
		value: 'PLANNED_AUTHORITY',
		helperText: 'approved layout, township, large housing society'
	},
	{
		label: 'Converted Land / Approved Residential Use',
		value: 'CONVERTED_RESIDENTIAL',
		helperText: 'earlier agricultural or village land, now residential'
	},
	{
		label: 'Old Municipal Area / Traditional Mohalla',
		value: 'OLD_MUNICIPAL',
		helperText: 'inside city limits, older houses, narrow streets'
	},
	{
		label: 'Local Colony / Village / Panchayat Area',
		value: 'LOCAL_COLONY',
		helperText: 'non-planned or organic development'
	},
	{
		label: 'Not sure',
		value: 'UNKNOWN',
		helperText: "I'm not certain about the area classification"
	}
];
