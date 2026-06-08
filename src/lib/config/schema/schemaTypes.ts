/**
 * Shared Schema Types
 *
 * Convenience re-exports of canonical schema types from $lib/types.
 * Question bank files across ALL loan types import from here.
 */

export type { RulesLogic } from '$lib/types/questionSchema.js';
export type {
	RawSchema,
	RawSchemaQuestion,
	RawSchemaPage,
	RawSchemaOption,
	RiskSignal,
	SwitchArray
} from '$lib/types/formEngine.js';
