import jsonLogic from 'json-logic-js';
import { resolveBindsTo } from './schema';
import type { Question, Answers } from '$lib/types/formTypes';

interface QuestionOrGroup {
	group?: Question[];
}

export function flattenQuestions(questions: (Question | QuestionOrGroup)[]): Question[] {
	return questions.flatMap((q) => ('group' in q && q.group ? q.group : (q as Question)));
}

const validators = {
	validateMinSelections(values: unknown[]) {
		return values.length < 1 ? 'minSelections' : null;
	}
};

export function getValidationErrorMessage(
	question: Question,
	answers: Answers,
	loan: string,
	pageIndex: number
): string | null {
	const key = resolveBindsTo(question, answers, loan);
	const val = answers[key];

	if ((!val || (Array.isArray(val) && !val.length)) && pageIndex === 0) return null;

	if (question.required) {
		if (!val || (Array.isArray(val) && !val.length)) {
			return question.errorMessage?.required ?? 'This field is required';
		}
	}

	if (question.validation?.condition) {
		if (jsonLogic.apply(question.validation.condition, answers)) {
			const fn = validators[question.validation.message as keyof typeof validators];
			const validationKey = fn ? fn(val) : null;
			return validationKey
				? (question.errorMessage?.[validationKey] ?? 'Validation failed')
				: (question.errorMessage?.message ?? 'Invalid input');
		}
	}

	return null;
}
