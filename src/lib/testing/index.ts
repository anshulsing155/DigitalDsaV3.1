/**
 * Test Data Management System - Main Entry Point
 *
 * @example
 * ```typescript
 * import {
 *   CombinationGenerator,
 *   ApplicantProfileGenerator,
 *   getTestDataStorage,
 *   QuickGenerators,
 *   PAGE_IDS,
 *   getPageSequence
 * } from '$lib/testing';
 * ```
 */

// Types
export * from './types/testData.types';

// Generators
export { ApplicantProfileGenerator, PropertyProfileGenerator } from './generators/profileGenerator';
export { CombinationGenerator, QuickGenerators } from './generators/combinationGenerator';

// Schema bridge — derived constants from JSON configs
// NOTE: schemaExtractor imports $lib/server/ JSON files (server-only).
// Do NOT re-export here — import directly from '$lib/testing/schema/schemaExtractor'
// in server-side code only. Client components should use dynamic imports.

// Storage — server-only (uses fs/promises), import directly:
//   import { getTestDataStorage } from '$lib/testing/storage/testDataStorage';

// Utility functions
export {
	createTestCase,
	createTestSuite,
	validateTestCase,
	getTestCaseStatistics,
	filterTestCases,
	sortTestCases,
	findSimilarTestCases
} from './utils/helpers';

// Home Loan flow map
export {
	PAGE_IDS,
	LOAN_TYPE_VALUES,
	QUESTIONS_BY_PAGE,
	SELECTORS,
	APPLICANT_STEPS,
	ROUTES,
	HAPPY_PATH_ANSWERS,
	getPageSequence,
	getVisiblePages,
	getApplicantStepSequence,
	usesBtNavigation
} from './homeLoan/pageFlowMap';

export type { PageId, HomeLoanType, QuestionDef } from './homeLoan/pageFlowMap';
