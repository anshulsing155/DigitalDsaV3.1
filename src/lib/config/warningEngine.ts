/**
 * Client-Side Warning Evaluator
 * ============================================================================
 * Evaluates warning conditions (JSON-Logic case/then arrays) on the client
 * for instant reactivity — warnings appear/disappear as the user changes
 * answers, without waiting for a server round-trip.
 *
 * Uses json-logic-js, same engine as showWhen evaluation.
 *
 * Session 32: Created to replace server-only warning evaluation.
 * ============================================================================
 */

import jsonLogic from 'json-logic-js';

/**
 * Evaluate a warning condition array against current answers.
 * Returns the first matching warning message, or null.
 *
 * @param conditions - Array of { case: JsonLogicRule, then: string } from schema
 * @param answers - Current form answers (combinedAnswers)
 * @returns Warning message string or null
 */
export function evaluateWarning(
	conditions: Array<{ case: unknown; then: string }> | undefined,
	answers: Record<string, unknown>
): string | null {
	if (!conditions || conditions.length === 0) return null;

	for (const entry of conditions) {
		if (!entry.case || !entry.then) continue;
		try {
			const result = jsonLogic.apply(entry.case as Parameters<typeof jsonLogic.apply>[0], answers);
			if (result) return entry.then;
		} catch {
			// Fail silent — don't show a warning if evaluation fails
		}
	}

	return null;
}
