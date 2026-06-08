import type { ApplicationData } from '$lib/schemas/applicationDataSchema';
import clientLogger from '$lib/utils/clientLogger';
import type { Question } from '$lib/types/questionSchema';
import * as jsonLogic from 'json-logic-js';
const apply = jsonLogic.apply;

/**
 * Ensures all questions have a schemaVersion.
 * @param questions - Raw questions from JSON.
 * @returns Questions with schemaVersion added if missing.
 */
function normalizeQuestions(questions: Question[]): Question[] {
	return questions.map((q) => ({
		...q,

		derivedLogicGroup: q.derivedLogicGroup || ''
	})) as Question[];
}

/**
 * Derives flag keys for FlowContext based on ApplicationData and questions.
 * Includes flags from showWhen, contextKey, and option flagKeys.
 * @param data - The ApplicationData containing user inputs.
 * @param questions - Array of questions from form-questions.json.
 * @returns Array of flag keys (e.g., ['isSecuredLoan', 'hasCar']).
 */
export function deriveFlagKeys(data: ApplicationData, questions: Question[]): string[] {
	const normalizedQuestions = normalizeQuestions(questions);
	const flags: string[] = [];

	for (const question of normalizedQuestions) {
		// Add flags from showWhen conditions
		if (question.showWhen) {
			try {
				const isVisible = apply(question.showWhen, data);
				if (isVisible && question.bindsTo) {
					flags.push(`is${question.bindsTo.split('.').pop()}`);
				}
			} catch (err) {
				clientLogger.error({ err }, `Error evaluating showWhen for ${question.id}:`);
			}
		}

		// Add flags from contextKey
		if (question.contextKey) {
			const contextValue = data[question.contextKey];
			if (contextValue) {
				flags.push(`has${contextValue.charAt(0).toUpperCase() + contextValue.slice(1)}`);
			}
		}

		// Add flags from selected radio option's flagKeys
		if (question.type === 'radio' && question.options && question.bindsTo) {
			const selectedValue = data[question.bindsTo];
			const selectedOption = question.options.find((option) => option.value === selectedValue);
			if (selectedOption?.flagKeys) {
				flags.push(...selectedOption.flagKeys);
			}
		}
	}

	return [...new Set(flags)]; // Remove duplicates
}
