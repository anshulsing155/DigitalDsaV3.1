/**
 * Lender Policy System — Barrel Export
 * ══════════════════════════════════════════════════════════════════
 */

// Types
export type {
	IndianState,
	CoverageType,
	CityTier,
	LenderGeoCoverage,
	DataSource,
	Sourced,
	LoanProduct,
	LenderMasterEntry,
	ProductNameMapping,
	ExtendedPolicyData
} from './types';

export { ALL_INDIA_STATES, ALL_LOAN_PRODUCTS } from './types';

// Geo Scorer (rank + tag, never filter)
export {
	scoreLenderGeoPresence,
	scoreLendersByGeo,
	getPresenceSummary,
	classifyCityTier,
	extractApplicantState,
	extractApplicantCity,
	METRO_CITIES,
	TIER1_CITIES,
	PRESENCE_CHIP_LABELS,
	PRESENCE_CHIP_COLORS
} from './geoFilter';

export type { PresenceChip, GeoPresenceResult, ScoredLender } from './geoFilter';

// Lender Directory
export {
	LENDER_DIRECTORY,
	LENDER_BY_ID,
	LENDER_BY_NAME,
	getLendersForProduct,
	getLendersInState
} from './lenderDirectory';

// Category Defaults
export { CATEGORY_DEFAULTS, getCategoryDefaults } from './categoryDefaults';
export type { CategoryPolicyConfig } from './categoryDefaults';

// Rule Builders (helpers)
export {
	makeEligibilityRules,
	makeCibilRules,
	makeFoirRules,
	makeFullIncomeRules,
	makeLtvRules,
	makeObligationRules,
	makeTenureRules,
	makeRoiRules,
	makeFeeRules,
	makeNriGate,
	makeCompanyGate,
	makeStandardCibilDeviation,
	makeStandardPolicies
} from './helpers';

// Compiler
export { compileRuleDocs, compileFromDirectory } from './compiler';

// Compile All
export { compileAllLenders, compileAllLendersDetailed, getCompilationStats } from './compileAll';
export type { CompiledLenderOutput } from './compileAll';

// Lender Overrides
export { LENDER_OVERRIDES, LENDER_OVERRIDE_ENTRIES, applyOverride } from './lenderOverrides';
export type { LenderOverride, LenderOverrideEntry } from './lenderOverrides';

// Seed Function (MongoDB)
export { seedCompiledLenders } from './seedCompiledLenders';
