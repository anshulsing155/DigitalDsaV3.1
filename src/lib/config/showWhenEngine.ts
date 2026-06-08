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

interface QuestionWithOptions {
	options: Array<{ showWhen?: ShowWhenCondition }>;
}

export function isInvalid(value: unknown): boolean {
	return (
		value === '' ||
		value === null ||
		value === undefined ||
		(Array.isArray(value) && value.length === 0) ||
		Number.isNaN(value)
	);
}

// export function getValueByPath(obj: any, path: string): any {
// 	if (!path) return undefined;
// 	return path.split('.').reduce((acc, key) => {
// 		if (acc == null) return undefined;
// 		return acc[key];
// 	}, obj);
// }

export function getValueByPath(obj: AnswersMap, path: unknown): unknown {
	if (!path || typeof path !== 'string') return undefined;

	return path.split('.').reduce<unknown>((acc, key) => {
		if (acc == null) return undefined;
		return (acc as Record<string, unknown>)[key];
	}, obj);
}

export function getVisibleOptions<T extends QuestionWithOptions>(
	question: T,
	answers: AnswersMap
): T['options'] {
	return question.options.filter((option) => shouldShow(option.showWhen, answers));
}

export function evaluateCondition(
	cond: ShowWhenCondition | null | undefined,
	answers: AnswersMap
): boolean {
	if (!cond || typeof cond !== 'object') {
		// String = variable reference from transformed JSON-Logic { var: 'key' }.
		// Evaluate as truthiness check: present & non-empty → true; absent → false.
		if (typeof cond === 'string') {
			return !isInvalid(getValueByPath(answers, cond));
		}
		return true;
	}

	// LOGICAL OPERATORS
	if (cond.and) {
		return cond.and.every((c: ShowWhenCondition) => evaluateCondition(c, answers));
	}

	if (cond.or) {
		return cond.or.some((c: ShowWhenCondition) => evaluateCondition(c, answers));
	}

	// Support `not`
	if (cond.not) {
		return !evaluateCondition(cond.not, answers);
	}

	// (optional) legacy support
	if (cond['!']) {
		return !evaluateCondition(cond['!'], answers);
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

export function shouldShow(
	showWhen: ShowWhenCondition | boolean | null | undefined,
	answers: AnswersMap
): boolean {
	// Explicit boolean: showWhen: false → never show, showWhen: true → always show
	if (showWhen === false) return false;
	if (!showWhen || (typeof showWhen === 'object' && Object.keys(showWhen).length === 0)) {
		return true;
	}
	return evaluateCondition(showWhen as ShowWhenCondition, answers);
}

// ============================================================================
// Production-aware variant (decodes XOR-ciphered showWhen in production)
// ============================================================================

import { decodeShowWhen } from './showWhenDecoder';

/**
 * Decode (if needed) and evaluate a showWhen condition.
 *
 * In production, showWhen is an XOR-ciphered base64 string that must be
 * decoded using the sessionId. In dev mode, it's a plain object.
 * Use this in form page components instead of shouldShow() directly.
 */
export function shouldShowEncoded(
	showWhen: unknown,
	answers: AnswersMap,
	sessionId?: string
): boolean {
	if (showWhen === false) return false;
	if (!showWhen) return true;
	if (typeof showWhen === 'object' && Object.keys(showWhen as object).length === 0) return true;

	const decoded = typeof showWhen === 'string' ? decodeShowWhen(showWhen, sessionId) : showWhen;

	return evaluateCondition(decoded as ShowWhenCondition, answers);
}
