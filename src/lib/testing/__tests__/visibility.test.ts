/**
 * Tests for the form-engine visibility module (Phase 3c audit cleanup).
 *
 * The most important thing this file does is install a GLOBAL OVERRIDE on
 * json-logic-js's `!=` and `!==` operators so that "unanswered = hide".
 * That override is documented as CLAUDE.md Critical Pitfall #1 — a regression
 * here would silently break form rendering across every loan type. These
 * tests lock the override behaviour down.
 *
 * Coverage:
 *   - isInvalid: pure utility used by both engines
 *   - getValueByPath: dot-path resolution against AnswersMap
 *   - evaluateCustomCondition: the bespoke ShowWhenCondition tree evaluator
 *     (and, or, not, !, in, ==, !=, <, >, <=, >=)
 *   - JSON Logic != / !== override (pitfall #1)
 *   - isVisible auto-detection between custom and JSON Logic formats
 *   - isQuestionVisible / isPageVisible / isOptionVisible public entries
 */

import { describe, it, expect } from 'vitest';
import {
	isInvalid,
	getValueByPath,
	evaluateCustomCondition,
	isVisible,
	isQuestionVisible,
	isPageVisible,
	isOptionVisible,
	type ShowWhenCondition,
	type AnswersMap
} from '$lib/server/formEngine/visibility';
import type { RawSchemaQuestion } from '$lib/types/formEngine';
import type { RulesLogic } from '$lib/types/questionSchema';

// ────────────────────────────────────────────────────────────────────────────
// isInvalid — empty-value detector used by the custom engine
// ────────────────────────────────────────────────────────────────────────────

describe('isInvalid', () => {
	it.each([
		['', 'empty string'],
		[null, 'null'],
		[undefined, 'undefined'],
		[[], 'empty array'],
		[NaN, 'NaN']
	])('returns true for %s (%s)', (val, _label) => {
		expect(isInvalid(val)).toBe(true);
	});

	it.each([
		['hello', 'non-empty string'],
		[0, 'zero'],
		[false, 'boolean false'],
		[[1], 'non-empty array'],
		[{}, 'object'],
		[' ', 'whitespace string (still has length)']
	])('returns false for %s (%s)', (val, _label) => {
		expect(isInvalid(val)).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// getValueByPath — dot-path resolution
// ────────────────────────────────────────────────────────────────────────────

describe('getValueByPath', () => {
	const answers: AnswersMap = {
		loanType: 'New Loan',
		applicant: { name: 'Suresh', age: 35 },
		nested: { deep: { value: 42 } }
	};

	it('resolves a top-level key', () => {
		expect(getValueByPath(answers, 'loanType')).toBe('New Loan');
	});

	it('resolves a one-level dot path', () => {
		expect(getValueByPath(answers, 'applicant.name')).toBe('Suresh');
	});

	it('resolves a multi-level dot path', () => {
		expect(getValueByPath(answers, 'nested.deep.value')).toBe(42);
	});

	it('returns undefined when an intermediate key is missing', () => {
		expect(getValueByPath(answers, 'applicant.missing.subkey')).toBeUndefined();
	});

	it('returns undefined for an empty / non-string path', () => {
		expect(getValueByPath(answers, '')).toBeUndefined();
		expect(getValueByPath(answers, null)).toBeUndefined();
		expect(getValueByPath(answers, 42)).toBeUndefined();
	});
});

// ────────────────────────────────────────────────────────────────────────────
// evaluateCustomCondition — bespoke ShowWhenCondition tree evaluator
// ────────────────────────────────────────────────────────────────────────────

describe('evaluateCustomCondition — primitive operators', () => {
	const answers: AnswersMap = { loanType: 'New Loan', amount: 5000000, city: 'Mumbai' };

	it('returns true when condition is null / undefined', () => {
		expect(evaluateCustomCondition(null, answers)).toBe(true);
		expect(evaluateCustomCondition(undefined, answers)).toBe(true);
	});

	it('==: matches equal values', () => {
		expect(evaluateCustomCondition({ '==': ['loanType', 'New Loan'] }, answers)).toBe(true);
		expect(evaluateCustomCondition({ '==': ['loanType', 'BT'] }, answers)).toBe(false);
	});

	it('!=: returns false when the LHS field is unanswered (unanswered = hide)', () => {
		const rule: ShowWhenCondition = { '!=': ['unsetField', 'New Loan'] };
		expect(evaluateCustomCondition(rule, answers)).toBe(false);
	});

	it('!=: returns true when the LHS is answered and differs', () => {
		expect(evaluateCustomCondition({ '!=': ['loanType', 'BT'] }, answers)).toBe(true);
	});

	it('!=: returns false when answered and equal', () => {
		expect(evaluateCustomCondition({ '!=': ['loanType', 'New Loan'] }, answers)).toBe(false);
	});

	it('in: returns true when value is in the list', () => {
		const rule: ShowWhenCondition = { in: ['city', ['Mumbai', 'Delhi']] };
		expect(evaluateCustomCondition(rule, answers)).toBe(true);
	});

	it('in: returns false when value is not in the list', () => {
		const rule: ShowWhenCondition = { in: ['city', ['Pune', 'Chennai']] };
		expect(evaluateCustomCondition(rule, answers)).toBe(false);
	});

	it('<, >, <=, >= work on numeric values', () => {
		expect(evaluateCustomCondition({ '<': ['amount', 10000000] }, answers)).toBe(true);
		expect(evaluateCustomCondition({ '>': ['amount', 1000000] }, answers)).toBe(true);
		expect(evaluateCustomCondition({ '<=': ['amount', 5000000] }, answers)).toBe(true);
		expect(evaluateCustomCondition({ '>=': ['amount', 5000000] }, answers)).toBe(true);
	});

	it('numeric ops return false for non-numeric values', () => {
		expect(evaluateCustomCondition({ '<': ['city', 100] }, answers)).toBe(false);
	});
});

describe('evaluateCustomCondition — logical operators', () => {
	const answers: AnswersMap = { a: 1, b: 2, c: 3 };

	it('and: all true → true', () => {
		const rule: ShowWhenCondition = {
			and: [{ '==': ['a', 1] }, { '==': ['b', 2] }]
		};
		expect(evaluateCustomCondition(rule, answers)).toBe(true);
	});

	it('and: any false → false', () => {
		const rule: ShowWhenCondition = {
			and: [{ '==': ['a', 1] }, { '==': ['b', 999] }]
		};
		expect(evaluateCustomCondition(rule, answers)).toBe(false);
	});

	it('or: any true → true', () => {
		const rule: ShowWhenCondition = {
			or: [{ '==': ['a', 999] }, { '==': ['b', 2] }]
		};
		expect(evaluateCustomCondition(rule, answers)).toBe(true);
	});

	it('or: all false → false', () => {
		const rule: ShowWhenCondition = {
			or: [{ '==': ['a', 999] }, { '==': ['b', 998] }]
		};
		expect(evaluateCustomCondition(rule, answers)).toBe(false);
	});

	it('not: inverts the inner condition', () => {
		const rule: ShowWhenCondition = { not: { '==': ['a', 1] } };
		expect(evaluateCustomCondition(rule, answers)).toBe(false);

		const rule2: ShowWhenCondition = { not: { '==': ['a', 999] } };
		expect(evaluateCustomCondition(rule2, answers)).toBe(true);
	});

	it('legacy "!" alias also negates', () => {
		const rule: ShowWhenCondition = { '!': { '==': ['a', 1] } };
		expect(evaluateCustomCondition(rule, answers)).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// CLAUDE.md Pitfall #1 — JSON Logic != / !== override
// ────────────────────────────────────────────────────────────────────────────
//
// These tests pin down the global override behaviour. Standard json-logic
// returns true for `null != "anything"`. Our override returns false so that
// questions with `!=` showWhen rules stay HIDDEN until their dependency is
// answered, instead of flashing visible during initial form load.

describe('JSON Logic != override (CLAUDE.md pitfall #1)', () => {
	it('null != "anything" returns false (unanswered = hide)', () => {
		const rule: RulesLogic = { '!=': [{ var: 'unsetField' }, 'anything'] };
		expect(isVisible(rule, {})).toBe(false);
	});

	it('undefined != "anything" returns false', () => {
		const rule: RulesLogic = { '!=': [{ var: 'unsetField' }, 'anything'] };
		expect(isVisible(rule, { unsetField: undefined })).toBe(false);
	});

	it('empty-string != "anything" returns false', () => {
		const rule: RulesLogic = { '!=': [{ var: 'field' }, 'anything'] };
		expect(isVisible(rule, { field: '' })).toBe(false);
	});

	it('whitespace-only string != "anything" returns false (treated as unanswered)', () => {
		const rule: RulesLogic = { '!=': [{ var: 'field' }, 'anything'] };
		expect(isVisible(rule, { field: '   ' })).toBe(false);
	});

	it('answered != different value returns true (visible)', () => {
		const rule: RulesLogic = { '!=': [{ var: 'loanType' }, 'New Loan'] };
		expect(isVisible(rule, { loanType: 'BT' })).toBe(true);
	});

	it('answered != same value returns false (not visible)', () => {
		const rule: RulesLogic = { '!=': [{ var: 'loanType' }, 'New Loan'] };
		expect(isVisible(rule, { loanType: 'New Loan' })).toBe(false);
	});

	it('!== operator follows the same override semantics', () => {
		const rule: RulesLogic = { '!==': [{ var: 'unsetField' }, 'anything'] };
		expect(isVisible(rule, {})).toBe(false);

		const ruleAnswered: RulesLogic = { '!==': [{ var: 'loanType' }, 'New Loan'] };
		expect(isVisible(ruleAnswered, { loanType: 'BT' })).toBe(true);
	});

	it('"!" operator (negation) treats unset values as falsy → returns true', () => {
		// Recommended pattern from CLAUDE.md for unset-checks.
		const rule: RulesLogic = { '!': { var: 'unsetFlag' } };
		expect(isVisible(rule, {})).toBe(true);
		expect(isVisible(rule, { unsetFlag: false })).toBe(true);
		expect(isVisible(rule, { unsetFlag: true })).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// isVisible — auto-detection between formats
// ────────────────────────────────────────────────────────────────────────────

describe('isVisible — auto-detection', () => {
	it('returns true for null / undefined / empty rule (no constraint)', () => {
		expect(isVisible(null, {})).toBe(true);
		expect(isVisible(undefined, {})).toBe(true);
		expect(isVisible({}, {})).toBe(true);
	});

	it('detects JSON Logic by { var: "..." } operand', () => {
		// JSON Logic format with var-wrapped reference.
		const rule: RulesLogic = { '==': [{ var: 'flag' }, 'on'] };
		expect(isVisible(rule, { flag: 'on' })).toBe(true);
		expect(isVisible(rule, { flag: 'off' })).toBe(false);
	});

	it('detects custom ShowWhenCondition by plain-string operand', () => {
		const rule: ShowWhenCondition = { '==': ['flag', 'on'] };
		expect(isVisible(rule, { flag: 'on' })).toBe(true);
		expect(isVisible(rule, { flag: 'off' })).toBe(false);
	});

	it('JSON Logic and custom variants of the same rule produce same result', () => {
		const jsonLogicRule: RulesLogic = { '==': [{ var: 'loanType' }, 'New Loan'] };
		const customRule: ShowWhenCondition = { '==': ['loanType', 'New Loan'] };
		const answers: AnswersMap = { loanType: 'New Loan' };

		expect(isVisible(jsonLogicRule, answers)).toBe(isVisible(customRule, answers));
	});
});

// ────────────────────────────────────────────────────────────────────────────
// Public API entries — wraps with field-aware semantics
// ────────────────────────────────────────────────────────────────────────────

describe('isQuestionVisible', () => {
	it('returns true when question has no showWhen', () => {
		const q = { id: 'q1' } as unknown as RawSchemaQuestion;
		expect(isQuestionVisible(q, {})).toBe(true);
	});

	it('evaluates custom showWhen', () => {
		const q = {
			id: 'q1',
			showWhen: { '==': ['loanType', 'New Loan'] }
		} as unknown as RawSchemaQuestion;
		expect(isQuestionVisible(q, { loanType: 'New Loan' })).toBe(true);
		expect(isQuestionVisible(q, { loanType: 'BT' })).toBe(false);
	});

	it('evaluates JSON Logic showWhen', () => {
		const q = {
			id: 'q1',
			showWhen: { '==': [{ var: 'loanType' }, 'New Loan'] }
		} as unknown as RawSchemaQuestion;
		expect(isQuestionVisible(q, { loanType: 'New Loan' })).toBe(true);
	});
});

describe('isPageVisible', () => {
	it('returns true when page has no showWhen', () => {
		expect(isPageVisible({}, {})).toBe(true);
	});

	it('evaluates JSON Logic page rule', () => {
		const page = { showWhen: { '==': [{ var: 'loanType' }, 'New Loan'] } as RulesLogic };
		expect(isPageVisible(page, { loanType: 'New Loan' })).toBe(true);
		expect(isPageVisible(page, { loanType: 'BT' })).toBe(false);
	});

	it('returns true (fail-open) when rule throws', () => {
		// Malformed rule — json-logic will throw. We expect fail-open (visible).
		const page = { showWhen: { __nonsense: ['x'] } as unknown as RulesLogic };
		expect(isPageVisible(page, {})).toBe(true);
	});
});

describe('isOptionVisible', () => {
	it('returns true when option has no showWhen', () => {
		expect(isOptionVisible({}, {})).toBe(true);
	});

	it('evaluates custom-format option rule', () => {
		const opt = { showWhen: { '==': ['city', 'Mumbai'] } as ShowWhenCondition };
		expect(isOptionVisible(opt, { city: 'Mumbai' })).toBe(true);
		expect(isOptionVisible(opt, { city: 'Delhi' })).toBe(false);
	});

	it('evaluates JSON Logic option rule', () => {
		const opt = { showWhen: { in: [{ var: 'city' }, ['Mumbai', 'Pune']] } as RulesLogic };
		expect(isOptionVisible(opt, { city: 'Mumbai' })).toBe(true);
		expect(isOptionVisible(opt, { city: 'Bengaluru' })).toBe(false);
	});
});
