import type { RawSchemaQuestion } from '../../types.js';

/**
 * Builder counterparty questions.
 * Currently builder-specific questions (projectName, RERA, builderTrackRecord)
 * live in the propertyCondition question bank since they're about the property.
 * This module is reserved for future builder counterparty questions
 * (builder financial health, legal disputes, etc.)
 */
export function getBuilderQuestions(): RawSchemaQuestion[] {
	return [];
}
