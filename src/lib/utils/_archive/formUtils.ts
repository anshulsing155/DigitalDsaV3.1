// form-utils.ts

interface VarInput {
	var: string;
}

interface ConcatBindsTo {
	concat: unknown[];
}

interface Condition {
	in?: [unknown, unknown[]];
	'=='?: [unknown, unknown];
	and?: Condition[];
	or?: Condition[];
}

interface Question {
	id: string;
	bindsTo: string | ConcatBindsTo;
	showWhen?: Condition;
	[key: string]: unknown;
}

interface Page {
	questions: Question[];
	[key: string]: unknown;
}

export function resolveVar(input: unknown, answers: Record<string, unknown>): unknown {
	if (typeof input === 'object' && input !== null && 'var' in input) {
		return answers[(input as VarInput).var];
	}
	return input;
}

export function resolveBindsTo(
	bindsTo: string | ConcatBindsTo,
	answers: Record<string, unknown>
): string {
	if (typeof bindsTo === 'string') return bindsTo;
	if ('concat' in bindsTo && bindsTo.concat) {
		return bindsTo.concat.map((part: unknown) => resolveVar(part, answers)).join('');
	}
	return '';
}

export function evaluateCondition(condition: Condition, answers: Record<string, unknown>): boolean {
	if ('in' in condition && condition.in) {
		const [left, right] = condition.in;
		return right.includes(resolveVar(left, answers));
	}
	if ('==' in condition && condition['==']) {
		const [left, right] = condition['=='];
		return resolveVar(left, answers) === right;
	}
	if ('and' in condition && condition.and) {
		return condition.and.every((c: Condition) => evaluateCondition(c, answers));
	}
	if ('or' in condition && condition.or) {
		return condition.or.some((c: Condition) => evaluateCondition(c, answers));
	}
	return false;
}

export function isQuestionVisible(question: Question, answers: Record<string, unknown>): boolean {
	if (!question.showWhen) return true;
	return evaluateCondition(question.showWhen, answers);
}

export function buildNestedOutput(
	pages: Page[],
	answers: Record<string, unknown>
): Record<string, unknown> {
	const output: Record<string, unknown> = {};
	pages.forEach((page: Page) => {
		page.questions.forEach((q: Question) => {
			const value = answers[q.id];
			if (value === undefined) return;

			const path = resolveBindsTo(q.bindsTo, answers);
			const segments = path.split('.');

			let current = output as Record<string, unknown>;
			for (let i = 0; i < segments.length - 1; i++) {
				const key = segments[i];
				if (!current[key]) current[key] = {};
				current = current[key] as Record<string, unknown>;
			}

			current[segments[segments.length - 1]] = value;
		});
	});
	return output;
}
