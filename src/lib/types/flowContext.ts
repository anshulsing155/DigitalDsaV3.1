import { z } from 'zod';
import type { ApplicationData } from '$lib/schemas/applicationDataSchema';
import { deriveFlagKeys } from '$lib/utils/deriveFlagKeys';
import formQuestions from '$lib/data/form-questions.json';
import type { Question } from '$lib/types/questionSchema';

/**
 * Schema for FlowContext, representing the subset of ApplicationData used for form navigation and backend evaluation.
 */
export const FlowContextSchema = z
	.object({
		loanType: z.string().optional().describe('The type of loan selected by the user.'),
		currentStep: z.string().optional().describe('The current step in the form flow.'),
		flags: z
			.record(z.string(), z.boolean())
			.optional()
			.describe('Dynamic flags derived from user selections.'),
		sessionId: z.string().optional().describe('Unique session identifier for the form submission.')
	})
	.strict();

/**
 * Type definition for FlowContext, inferred from the schema.
 */
export type FlowContext = z.infer<typeof FlowContextSchema>;

/**
 * Extracts FlowContext from ApplicationData, including derived flags.
 * @param data - The full ApplicationData object.
 * @returns A FlowContext object containing the relevant subset of data.
 */
export function extractFlowContext(data: ApplicationData): FlowContext {
	const { loanType, currentStep, sessionId } = data;
	const flags = deriveFlagKeys(data, formQuestions as Question[]);
	return FlowContextSchema.parse({
		loanType,
		currentStep,
		flags: Object.fromEntries(flags.map((flag) => [flag, data[flag] || false])),
		sessionId
	});
}

/**
 * Merges FlowContext updates back into ApplicationData.
 * @param applicationData - The current ApplicationData object.
 * @param flowContext - The FlowContext updates to merge.
 * @returns Updated ApplicationData with FlowContext fields applied.
 */
export function mergeFlowContext(
	applicationData: ApplicationData,
	flowContext: FlowContext
): ApplicationData {
	return {
		...applicationData,
		loanType: flowContext.loanType || applicationData.loanType,
		currentStep: flowContext.currentStep || applicationData.currentStep,
		flags: flowContext.flags
			? { ...applicationData.flags, ...flowContext.flags }
			: applicationData.flags,
		sessionId: flowContext.sessionId || applicationData.sessionId
	};
}

/**
 * Validates FlowContext data against the schema.
 * @param data - The data to validate as FlowContext.
 * @returns The validated FlowContext object.
 * @throws ZodError if validation fails.
 */
export function validateFlowContext(data: unknown): FlowContext {
	return FlowContextSchema.parse(data);
}
