/**
 * Text Resolver (Server-Side Only)
 *
 * Resolves dynamic text patterns found in question text and descriptions:
 * 1. "switch" arrays -- conditional text based on JSON Logic rules
 * 2. Template placeholders -- `{variableName}` patterns
 * 3. Financial year placeholders -- `{{currentFinancialYear}}`, `{{thisYear}}`, etc.
 *
 * Historical port source was `src/lib/form/homeLoan/schema.ts`, now archived at
 * `$lib/form/_archive/homeLoan-schema.ts` (session S77b-4B, 2026-04-21 — the
 * source file had zero live importers at archive time). The canonical CLIENT
 * version of `resolveDynamicText` lives at `$lib/utils/resolveDynamicText.ts`;
 * this server copy exists for the same singleton-boundary reason documented
 * on `resolveBindsTo` in `engine.ts` and on `isQuestionVisible` in
 * `visibility.ts` (see RESOLUTION-PLAN §4A + CLAUDE.md Pitfall #1).
 */
import jsonLogic from 'json-logic-js';
import type { SwitchArray } from '$lib/types/formEngine';
import type { AnswersMap } from './visibility';
import logger from '$lib/server/logger.js';

// ============================================================================
// Switch Array Resolution
// ============================================================================

/**
 * Check if a value is a "switch" array pattern.
 * These are objects like: { "switch": [{ "case": {...}, "then": "text" }, ...] }
 */
export function isSwitchArray(value: unknown): value is SwitchArray {
	return (
		typeof value === 'object' &&
		value !== null &&
		'switch' in value &&
		Array.isArray((value as SwitchArray).switch)
	);
}

/**
 * Evaluate a switch array against the current answers context.
 * Returns the `then` value of the first matching case, or empty string if none match.
 */
function evaluateSwitchArray(switchArray: SwitchArray, answers: AnswersMap): string {
	let inlineDefault: string | undefined;

	for (const entry of switchArray.switch) {
		// Handle inline default: { "default": "text" } (no case key)
		if (!('case' in entry) && 'default' in entry) {
			inlineDefault = (entry as unknown as { default: string }).default;
			continue;
		}
		try {
			if (jsonLogic.apply(entry.case, answers)) {
				// The "then" value might itself contain template placeholders
				return resolveTemplatePlaceholders(entry.then, answers);
			}
		} catch (err) {
			logger.warn({ err }, '[FormEngine] Switch case eval failed');
		}
	}

	// Fallback: sibling "default" key or inline default entry
	const fallback = switchArray.default ?? inlineDefault;
	if (fallback) {
		return resolveTemplatePlaceholders(fallback, answers);
	}
	return '';
}

// ============================================================================
// Template Placeholder Resolution
// ============================================================================

/**
 * Replace `{variableName}` placeholders in text with values from answers.
 * Leaves the placeholder as-is if the variable isn't found.
 */
function resolveTemplatePlaceholders(text: string, answers: AnswersMap): string {
	return text.replace(/\{([^}]+)\}/g, (match, key: string) => {
		const val = answers[key];
		return val !== undefined && val !== null ? String(val) : match;
	});
}

// ============================================================================
// Financial Year Helpers
// ============================================================================

/**
 * Get financial year strings relative to current date.
 * Indian financial year: April to March.
 */
export function getFinancialYears(date = new Date()) {
	const currentYear = date.getFullYear();
	const currentMonth = date.getMonth() + 1;
	const startYear = currentMonth >= 4 ? currentYear : currentYear - 1;

	const fyEnd = startYear + 1;
	const thisYear = `FY${startYear}-${fyEnd.toString().slice(-2)}`;
	const previousYear = `FY${startYear - 1}-${(fyEnd - 1).toString().slice(-2)}`;
	const twoYearsAgo = `FY${startYear - 2}-${(fyEnd - 2).toString().slice(-2)}`;
	const threeYearsAgo = `FY${startYear - 3}-${(fyEnd - 3).toString().slice(-2)}`;

	return { thisYear, previousYear, twoYearsAgo, threeYearsAgo, fyStartYear: startYear };
}

/**
 * Replace financial year placeholders in text.
 */
function resolveFinancialYearPlaceholders(text: string): string {
	const { thisYear, previousYear, twoYearsAgo, threeYearsAgo, fyStartYear } = getFinancialYears();

	return text
		.replace(/\{\{currentFinancialYear\}\}/g, `${fyStartYear - 1}-${fyStartYear}`)
		.replace(/\{\{thisYear\}\}/g, thisYear)
		.replace(/\{\{previousYear\}\}/g, previousYear)
		.replace(/\{\{twoYearsAgo\}\}/g, twoYearsAgo)
		.replace(/\{\{threeYearsAgo\}\}/g, threeYearsAgo);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Resolve text that may be a plain string, a switch array, or contain placeholders.
 *
 * @param text - The raw text value from the schema (string or SwitchArray)
 * @param answers - Current form answers for context
 * @returns Resolved plain string
 */
export function resolveText(
	text: string | SwitchArray | undefined | null,
	answers: AnswersMap
): string {
	if (!text) return '';

	// Handle switch array pattern
	if (typeof text === 'object' && isSwitchArray(text)) {
		const resolved = evaluateSwitchArray(text, answers);
		return resolveFinancialYearPlaceholders(resolved);
	}

	// Handle plain string with possible placeholders
	if (typeof text === 'string') {
		let result = resolveTemplatePlaceholders(text, answers);
		result = resolveFinancialYearPlaceholders(result);
		return result;
	}

	// Fallback: stringify unknown types
	return typeof text === 'object' ? JSON.stringify(text) : '';
}

/**
 * Resolve a dynamic field that uses the switch/case pattern for validation or warnings.
 * Returns an array of resolved strings (one per matching case).
 *
 * Historical port source was `src/lib/form/homeLoan/validation.ts`, now
 * archived at `$lib/form/_archive/homeLoan-validation.ts` (session S77b-4B,
 * 2026-04-21 — the source file had zero live importers at archive time).
 * This server implementation is the canonical one; do not resurrect the
 * archived client copy. See `docs/RESOLUTION-PLAN.md` §4B (CLOSED).
 */
export function resolveDynamicMessages(field: unknown, answers: AnswersMap): string[] {
	if (!field) return [];
	if (typeof field === 'string') return [field];

	if (Array.isArray(field)) {
		const messages: string[] = [];
		for (const condition of field) {
			try {
				if (jsonLogic.apply(condition.case, answers)) {
					messages.push(...resolveDynamicMessages(condition.then, answers));
				}
			} catch {
				// skip failed conditions
			}
		}
		return messages;
	}

	if (
		typeof field === 'object' &&
		field !== null &&
		'switch' in field &&
		Array.isArray((field as { switch: unknown[] }).switch)
	) {
		const messages: string[] = [];
		for (const condition of (field as { switch: Array<{ case: unknown; then: unknown }> }).switch) {
			try {
				if (jsonLogic.apply(condition.case, answers)) {
					messages.push(...resolveDynamicMessages(condition.then, answers));
				}
			} catch {
				// skip failed conditions
			}
		}
		return messages;
	}

	return typeof field === 'object' ? [JSON.stringify(field)] : [];
}

/**
 * Resolve option labels that might contain financial year placeholders.
 */
export function resolveOptionLabel(label: string | { var: string }, answers: AnswersMap): string {
	if (typeof label === 'object' && 'var' in label) {
		const val = answers[label.var];
		return val !== undefined && val !== null ? String(val) : '';
	}

	// Switch array pattern: { switch: [...], default: "..." }
	if (typeof label === 'object' && isSwitchArray(label)) {
		return evaluateSwitchArray(label, answers);
	}

	if (typeof label === 'string') {
		return resolveFinancialYearPlaceholders(label);
	}

	return String(label);
}
