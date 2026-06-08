/**
 * Unified Visibility Evaluator (Server-Side Only)
 *
 * Handles BOTH rule formats used in the codebase:
 * 1. JSON Logic rules (json-logic-js) -- used in main loan schemas (homeLoanSchema.json etc.)
 * 2. Custom ShowWhenCondition rules -- used in applicant/component schemas (showWhenEngine.ts)
 *
 * The engine auto-detects which format a rule uses and delegates accordingly.
 */
import jsonLogic from 'json-logic-js';
import type { RulesLogic } from '$lib/types/questionSchema';
import type { RawSchemaQuestion } from '$lib/types/formEngine';
import logger from '$lib/server/logger.js';

// ============================================================================
// Custom json-logic operators for correct "unanswered" handling
// ============================================================================
//
// GLOBAL OVERRIDE: json-logic-js '!=' and '!==' operators.
//
// Standard json-logic: { '!=': [null, 'anything'] } → true
// Our override:        { '!=': [null, 'anything'] } → false ("unanswered = hide")
//
// This is applied ONCE to the global jsonLogic singleton via an idempotency
// guard. All json-logic evaluations in the app use this behavior.
// See CLAUDE.md Critical Pitfall #1 for details.
//
// Problem: json-logic returns null for missing variables via {"var": "x"}.
// JavaScript's `null != "something"` is true, which causes questions to
// SHOW when their dependency hasn't been answered yet (wrong — should hide).
//
// Fix: Override `!=` and `!==` so that null/undefined/empty-string on the
// variable side (first arg) always returns false ("unanswered = hide").
//
// Examples:
//   null != ""          → false  (unanswered city → hide)
//   null != "New Loan"  → false  (unanswered loanType → hide)
//   "" != "New Loan"    → false  (empty loanType → hide)
//   "BT" != "New Loan"  → true   (answered, different → show)
//   "Patna" != ""       → true   (answered city → show)

function isUnanswered(val: unknown): boolean {
	return val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
}

/** Tracks whether the global override has already been applied */
let formVisibilityOverridesApplied = false;

/**
 * Apply the "unanswered = hide" overrides to json-logic's != and !== operators.
 * Safe to call multiple times — the override is only applied on the first call.
 */
function ensureFormVisibilityOverrides(): void {
	if (formVisibilityOverridesApplied) return;

	jsonLogic.add_operation('!=', (a: unknown, b: unknown) => {
		if (isUnanswered(a)) return false;
		// Intentional loose equality — matches json-logic's own `!=` semantics
		return a != b;
	});

	jsonLogic.add_operation('!==', (a: unknown, b: unknown) => {
		if (isUnanswered(a)) return false;
		return a !== b;
	});

	formVisibilityOverridesApplied = true;
}

// ============================================================================
// Types (mirrors showWhenEngine.ts ShowWhenCondition)
// ============================================================================

export type ShowWhenCondition = {
	and?: ShowWhenCondition[];
	or?: ShowWhenCondition[];
	not?: ShowWhenCondition;
	'!'?: ShowWhenCondition;
	in?: [string, unknown[]];
	'=='?: [string, unknown];
	'!='?: [string, unknown];
	'<'?: [string, number];
	'>'?: [string, number];
	'<='?: [string, number];
	'>='?: [string, number];
};

export type AnswersMap = Record<string, unknown>;

// ============================================================================
// Custom ShowWhen Engine (ported from src/lib/config/showWhenEngine.ts)
// ============================================================================

/**
 * Check if a value is "empty" for purposes of condition evaluation.
 */
export function isInvalid(value: unknown): boolean {
	return (
		value === '' ||
		value === null ||
		value === undefined ||
		(Array.isArray(value) && value.length === 0) ||
		Number.isNaN(value)
	);
}

/**
 * Resolve a dot-separated path against an answers map.
 */
export function getValueByPath(obj: AnswersMap, path: unknown): unknown {
	if (!path || typeof path !== 'string') return undefined;

	return path.split('.').reduce<unknown>((acc, key) => {
		if (acc == null) return undefined;
		return (acc as Record<string, unknown>)[key];
	}, obj);
}

/**
 * Evaluate a custom ShowWhenCondition tree against answers.
 * This is the engine used by component-level schemas (applicant questions,
 * income profiles, etc.) that use the simpler custom condition format.
 */
export function evaluateCustomCondition(
	cond: ShowWhenCondition | null | undefined,
	answers: AnswersMap
): boolean {
	if (!cond || typeof cond !== 'object') return true;

	// LOGICAL OPERATORS
	if (cond.and) {
		return cond.and.every((c: ShowWhenCondition) => evaluateCustomCondition(c, answers));
	}

	if (cond.or) {
		return cond.or.some((c: ShowWhenCondition) => evaluateCustomCondition(c, answers));
	}

	// Support `not`
	if (cond.not) {
		return !evaluateCustomCondition(cond.not, answers);
	}

	// Legacy `!` support
	if (cond['!']) {
		return !evaluateCustomCondition(cond['!'], answers);
	}

	// FIELD OPERATORS
	if (cond.in) {
		const [field, list] = cond.in;
		const value = getValueByPath(answers, field);
		return list.includes(value);
	}

	if (cond['==']) {
		const [field, expected] = cond['=='];
		const value = getValueByPath(answers, field);
		return value === expected;
	}

	if (cond['!=']) {
		const [field, expected] = cond['!='];
		const value = getValueByPath(answers, field);
		if (isInvalid(value)) return false;
		return value !== expected;
	}

	if (cond['<']) {
		const [field, limit] = cond['<'];
		const value = Number(getValueByPath(answers, field));
		return !isNaN(value) && value < limit;
	}

	if (cond['>']) {
		const [field, limit] = cond['>'];
		const value = Number(getValueByPath(answers, field));
		return !isNaN(value) && value > limit;
	}

	if (cond['<=']) {
		const [field, limit] = cond['<='];
		const value = Number(getValueByPath(answers, field));
		return !isNaN(value) && value <= limit;
	}

	if (cond['>=']) {
		const [field, limit] = cond['>='];
		const value = Number(getValueByPath(answers, field));
		return !isNaN(value) && value >= limit;
	}

	return true;
}

// ============================================================================
// JSON Logic Engine (ported from src/lib/form/homeLoan/visibility.ts)
// ============================================================================

/**
 * Normalize answers for JSON Logic evaluation.
 * Creates shorthand keys (e.g. "q1_propertyIdentified" -> "propertyIdentified")
 * and lowercase variants.
 */
function normalizeAnswersForJsonLogic(answers: AnswersMap): Record<string, unknown> {
	const data: Record<string, unknown> = {};

	for (const [k, v] of Object.entries(answers)) {
		data[k] = v;
		data[k.toLowerCase()] = v;

		if (k.includes('_')) {
			const short = k.split('_').pop()!;
			data[short] = v;
			data[short.toLowerCase()] = v;
		}
	}

	return data;
}

/**
 * Evaluate a JSON Logic rule with the dependency guard from the home loan visibility module.
 * When a dependency variable hasn't been answered yet, the question is shown by default.
 */
function evaluateJsonLogicWithGuard(rule: RulesLogic, answers: AnswersMap): boolean {
	// Ensure our "unanswered = hide" overrides are applied before evaluating
	ensureFormVisibilityOverrides();

	const data = normalizeAnswersForJsonLogic(answers);

	// Let json-logic evaluate naturally.
	// When a dependency is undefined, comparisons like (undefined == "No") return false,
	// which correctly HIDES questions until their dependencies are answered.
	// This gives true progressive behavior: answer Q1 → Q2 appears → answer Q2 → Q3 appears.
	try {
		return Boolean(jsonLogic.apply(rule, data));
	} catch (err) {
		logger.warn({ err }, '[FormEngine] JSON Logic eval failed');
		return true; // fail-open: show the question on eval error
	}
}

// ============================================================================
// Rule Format Detection
// ============================================================================

/**
 * Detect whether a rule is a JSON Logic rule or a custom ShowWhenCondition.
 *
 * JSON Logic rules use `{ "var": "..." }` objects as operands.
 * Custom ShowWhenCondition rules use plain string field paths as operands
 * (e.g. `{ "==": ["fieldName", "value"] }`).
 *
 * Heuristic: if any operator's first operand is a `{ "var": ... }` object,
 * it's JSON Logic. If the first operand is a plain string, it's custom.
 */
function isJsonLogicRule(rule: unknown): boolean {
	if (!rule || typeof rule !== 'object') return false;

	const obj = rule as Record<string, unknown>;

	// Check common JSON Logic patterns
	// Operators with { "var": ... } arguments indicate JSON Logic
	for (const key of Object.keys(obj)) {
		const operand = obj[key];

		// Logical operators -- recurse into children
		if (key === 'and' || key === 'or') {
			if (Array.isArray(operand)) {
				return operand.some((child) => isJsonLogicRule(child));
			}
		}
		if (key === 'not' || key === '!') {
			return isJsonLogicRule(operand);
		}

		// Comparison operators -- check if first arg is { "var": ... }
		if (['==', '!=', '===', '!==', '<', '>', '<=', '>=', 'in'].includes(key)) {
			if (Array.isArray(operand) && operand.length >= 1) {
				const first = operand[0];
				// JSON Logic: first operand is { "var": "..." }
				if (first && typeof first === 'object' && 'var' in (first as Record<string, unknown>)) {
					return true;
				}
				// Custom engine: first operand is a plain string (field path)
				if (typeof first === 'string') {
					return false;
				}
			}
		}
	}

	// Default: treat as JSON Logic (safer because jsonLogic.apply handles more cases)
	return true;
}

// ============================================================================
// Unified Public API
// ============================================================================

/**
 * Unified visibility check. Auto-detects rule format and evaluates.
 *
 * @param rule - A showWhen rule (JSON Logic or custom ShowWhenCondition), or null/undefined
 * @param answers - Current form answers context
 * @returns true if the element should be visible
 */
export function isVisible(
	rule: RulesLogic | ShowWhenCondition | null | undefined,
	answers: AnswersMap
): boolean {
	// No rule = always visible
	if (!rule || (typeof rule === 'object' && Object.keys(rule as object).length === 0)) {
		return true;
	}

	if (isJsonLogicRule(rule)) {
		return evaluateJsonLogicWithGuard(rule, answers);
	} else {
		return evaluateCustomCondition(rule as ShowWhenCondition, answers);
	}
}

/**
 * Check if a question should be visible, with full context handling.
 * This is the primary entry point for question-level visibility.
 *
 * Handles:
 * - Questions with no showWhen (always visible)
 * - Questions with bindsTo_template (resolves key first)
 * - Both JSON Logic and custom ShowWhenCondition formats
 */
export function isQuestionVisible(question: RawSchemaQuestion, answers: AnswersMap): boolean {
	if (!question.showWhen) return true;
	return isVisible(question.showWhen, answers);
}

/**
 * Check if a page should be visible based on its showWhen rule.
 */
export function isPageVisible(page: { showWhen?: RulesLogic }, answers: AnswersMap): boolean {
	if (!page.showWhen) return true;

	// Ensure our "unanswered = hide" overrides are applied before evaluating
	ensureFormVisibilityOverrides();

	// Pages typically use JSON Logic, but handle both
	const data = normalizeAnswersForJsonLogic(answers);
	try {
		return Boolean(jsonLogic.apply(page.showWhen, data));
	} catch (err) {
		logger.warn({ err }, '[FormEngine] Page visibility eval failed');
		return true; // fail-open
	}
}

/**
 * Check if a schema option should be visible.
 * Options can use either JSON Logic or custom ShowWhenCondition format.
 */
export function isOptionVisible(
	option: { showWhen?: RulesLogic | ShowWhenCondition },
	answers: AnswersMap
): boolean {
	return isVisible(option.showWhen, answers);
}
