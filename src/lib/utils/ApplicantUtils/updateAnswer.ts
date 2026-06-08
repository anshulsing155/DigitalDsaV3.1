// import type { Writable } from 'svelte/store';

// export function updateAnswer(
// 	applicantsStore: Writable<any[]>,
// 	question: any,
// 	value: any,
// 	idx: number
// ) {
// 	applicantsStore.update((list) => {
// 		let finalValue;

// 		if (question.type === 'multiple-select') {
// 			finalValue = Array.isArray(value) ? value : [value];
// 		} else {
// 			finalValue =
// 				question.valueType === 'number'
// 					? Number(value) || 0
// 					: String(value || '');
// 		}

// 		list[idx] = {
// 			...list[idx],
// 			[question.bindsTo_template || question.bindsTo || question.id || question]: finalValue
// 		};

// 		return list;
// 	});
// }

import type { Writable } from 'svelte/store';

// utils/updateAnswer.ts
export function updateAnswer(
	applicantsStore: Writable<Record<string, unknown>[]>,
	question: Record<string, unknown>,
	value: unknown,
	idx: number
): void {
	applicantsStore.update((list) => {
		let finalValue;

		if (question.type === 'multiple-select') {
			finalValue = Array.isArray(value) ? value : [value];
		} else {
			finalValue = question.valueType === 'number' ? Number(value) || 0 : String(value || '');
		}

		const key = String(question.bindsTo_template || question.bindsTo || question.id || 'unknown');

		list[idx] = {
			...list[idx],
			[key]: finalValue
		};

		return list;
	});
}
