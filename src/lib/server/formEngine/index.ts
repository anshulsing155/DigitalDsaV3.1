/**
 * Server-Side Form Engine - Main Entry Point
 *
 * This module provides the complete server-side form engine for evaluating
 * form schemas, determining question visibility, validating answers,
 * and computing navigation/progress.
 *
 * IMPORTANT: This module can ONLY be imported from server-side code:
 * - +page.server.ts
 * - +server.ts
 * - hooks.server.ts
 * - Other files in $lib/server/
 *
 * The client NEVER receives:
 * - showWhen visibility rules
 * - validation thresholds
 * - full schema structures
 * - hidden questions/pages
 */

// Core engine
export { FormEngine, createFormEngine } from './engine';
export type { FormEngineOptions } from './engine';

// Schema loader
export {
	loadSchema,
	loadComponentSchema,
	getAvailableLoanTypes,
	getAvailableComponentSchemas
} from './schemaLoader';

// Visibility evaluator
export { isVisible, isQuestionVisible, isPageVisible, isOptionVisible } from './visibility';
export type { ShowWhenCondition, AnswersMap } from './visibility';

// Text resolver
export {
	resolveText,
	resolveDynamicMessages,
	resolveOptionLabel,
	getFinancialYears
} from './textResolver';

// Option resolver
export { resolveOptions } from './optionResolver';
