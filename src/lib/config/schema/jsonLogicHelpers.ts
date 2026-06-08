/**
 * JSON-Logic Condition Helpers
 *
 * Shorthand builders for JSON-Logic conditions used in showWhen rules,
 * validation rules, and option visibility across all loan type schemas.
 *
 * Usage:
 *   jl.eq('loanType', 'New Loan')          => { "==": [{ "var": "loanType" }, "New Loan"] }
 *   jl.and(jl.eq('a', 1), jl.neq('b', '')) => { "and": [{ "==": ... }, { "!=": ... }] }
 */

import type { RulesLogic } from './schemaTypes.js';

export const jl = {
	eq: (varName: string, value: string | number): RulesLogic => ({
		'==': [{ var: varName }, value]
	}),
	neq: (varName: string, value: string | number | ''): RulesLogic => ({
		'!=': [{ var: varName }, value]
	}),
	inArr: (varName: string, values: (string | number)[]): RulesLogic => ({
		in: [{ var: varName }, values]
	}),
	notInArr: (varName: string, values: (string | number)[]): RulesLogic => ({
		'!in': [{ var: varName }, values]
	}),
	notEmpty: (varName: string): RulesLogic => ({ '!=': [{ var: varName }, ''] }),
	and: (...conditions: RulesLogic[]): RulesLogic => ({ and: conditions }),
	or: (...conditions: RulesLogic[]): RulesLogic => ({ or: conditions }),
	not: (condition: RulesLogic): RulesLogic => ({ '!': condition }),
	lte: (varName: string, value: number): RulesLogic => ({
		'<=': [{ var: varName }, value]
	})
} as const;
