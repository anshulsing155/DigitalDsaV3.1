/**
 * resolveDynamicText — canonical client-side implementation
 *
 * Resolves dynamic text fields from the form schema:
 * 1. "switch" arrays — conditional text based on JSON-Logic rules
 * 2. Template placeholders — `{variableName}` replaced with answer values
 *
 * Server-side code should use `resolveText()` from `$lib/server/formEngine/textResolver.ts`
 * which adds financial-year placeholders and structured logging on top of this logic.
 */
import jsonLogic from 'json-logic-js';

interface SwitchCondition {
	case: Record<string, unknown>;
	then: DynamicField;
}

interface DynamicFieldWithSwitch {
	switch: SwitchCondition[];
}

type DynamicField = string | DynamicFieldWithSwitch | Record<string, unknown> | null | undefined;

function isDynamicFieldWithSwitch(field: object): field is DynamicFieldWithSwitch {
	return 'switch' in field && Array.isArray((field as DynamicFieldWithSwitch).switch);
}

/**
 * Replace `{variableName}` placeholders with values from answers.
 * Leaves the placeholder as-is if the variable isn't found.
 */
function resolveTemplatePlaceholders(text: string, answers: Record<string, unknown>): string {
	return text.replace(/\{([^}]+)\}/g, (match, key: string) => {
		const value = answers[key];
		return value !== undefined && value !== null ? String(value) : match;
	});
}

/**
 * Resolve a dynamic text field that may be:
 * - A plain string (possibly with `{key}` template placeholders)
 * - A switch/case object (JSON-Logic conditions → text)
 * - null/undefined (returns empty string)
 */
export function resolveDynamicText(field: DynamicField, answers: Record<string, unknown>): string {
	if (!field) return '';

	if (typeof field === 'string') {
		return resolveTemplatePlaceholders(field, answers);
	}

	if (typeof field === 'object' && isDynamicFieldWithSwitch(field)) {
		for (const condition of field.switch) {
			if (jsonLogic.apply(condition.case, answers)) {
				return resolveDynamicText(condition.then, answers);
			}
		}
		return '';
	}

	return typeof field === 'object' ? JSON.stringify(field) : '';
}
