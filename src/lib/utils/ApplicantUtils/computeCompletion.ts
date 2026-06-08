// import { shouldShow } from '$lib/config/showWhenEngine';

// export function computeCompletion({
// 	questions,
// 	answers,
// 	extraCheck = () => true
// }: {
// 	questions: any[];
// 	answers: any;
// 	extraCheck?: () => boolean;
// }): boolean {
// 	if (!answers) return false;

// 	// 1. Visible questions
// 	const visible = questions.filter((q) => shouldShow(q.showWhen, answers));

// 	// 2. Required keys
// 	const requiredKeys = visible.map((q) => {
// 		if (q.type === 'multiple-select' && q.key === 'whyPrimaryLowCredit') {
// 			return 'whyPrimaryLowCreditValidate';
// 		}
// 		if (q.type === 'multiple-select') {
// 			return `${q.key}Validate`;
// 		}
// 		if (q.type === 'table') {
// 			return `${q.key}Validate`;
// 		}
// 		return q.key;
// 	});

// 	// 3. Missing values
// 	const missing = requiredKeys.some((key) => {
// 		const v = answers[key];
// 		return v === undefined || v === null || v === '' || v === false;
// 	});

// 	if (missing) return false;

// 	// 4. Errors
// 	const hasErrors = Object.keys(answers).some(
// 		(k) => k.endsWith('Error') && typeof answers[k] === 'string' && answers[k].trim() !== ''
// 	);

// 	if (hasErrors) return false;

// 	// 5. Extra structural checks (tables, obligations, etc.)
// 	if (!extraCheck()) return false;

// 	return true;
// }
import { shouldShow } from '$lib/config/showWhenEngine';

interface QuestionItem {
	key: string;
	type?: string;
	showWhen?: Record<string, unknown>;
	[key: string]: unknown;
}

interface RequiredKeyItem {
	key: string;
	type: string;
}

export function computeCompletion({
	questions,
	answers,
	extraCheck = () => true
}: {
	questions: QuestionItem[];
	answers: Record<string, unknown>;
	extraCheck?: () => boolean;
}): boolean {
	if (!answers) return false;

	// 1. Visible questions
	const visible = questions.filter((q: QuestionItem) => shouldShow(q.showWhen, answers));

	// 2. Required keys with proper handling
	const requiredKeys: RequiredKeyItem[] = visible.map((q: QuestionItem) => {
		if (q.type === 'multiple-select' && q.key === 'whyPrimaryLowCredit') {
			return { key: 'whyPrimaryLowCreditValidate', type: 'validate' };
		}
		if (q.type === 'multiple-select') {
			return { key: `${q.key}Validate`, type: 'validate' };
		}
		if (q.type === 'table') {
			return { key: `${q.key}Validate`, type: 'validate' };
		}
		return { key: q.key, type: q.type || 'text' };
	});

	// 3. ✅ FIXED: Check for missing values with proper type handling
	const missing = requiredKeys.some((item: RequiredKeyItem) => {
		const v = answers[item.key];

		// Undefined or null is always missing
		if (v === undefined || v === null) return true;

		// For validate fields (multiple-select, tables), must be true
		if (item.type === 'validate') {
			return v !== true;
		}

		// For arrays (multiple-select without validate), check length
		if (Array.isArray(v)) {
			return v.length === 0;
		}

		// For strings, check if empty
		if (typeof v === 'string') {
			return v.trim() === '';
		}

		// For numbers, 0 is valid, only NaN is invalid
		if (typeof v === 'number') {
			return isNaN(v);
		}

		// For booleans, both true and false are valid
		// Don't treat false as missing!
		if (typeof v === 'boolean') {
			return false;
		}

		// For objects (dates, etc), check if they exist
		return false;
	});

	if (missing) {
		return false;
	}

	// 4. Check for validation errors
	const hasErrors = Object.keys(answers).some(
		(k) => k.endsWith('Error') && typeof answers[k] === 'string' && answers[k].trim() !== ''
	);

	if (hasErrors) {
		return false;
	}

	// 5. Extra structural checks (tables, obligations, etc.)
	if (!extraCheck()) {
		return false;
	}

	return true;
}
