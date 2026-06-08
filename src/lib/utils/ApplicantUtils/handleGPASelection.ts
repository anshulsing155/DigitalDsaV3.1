// export function handleGPASelection(val, idx, applicantsStore, updateAnswer) {
// 	updateAnswer('isGPA', val, idx);

// 	if (val === 'Add New') return applicantsStore;

// 	if (val.startsWith('Yes-')) {
// 		const gpaName = val.replace('Yes-', '');

// 		for (let i = 0; i < applicantsStore.length; i++) {
// 			if (i === idx) continue;

// 			const gpaMatch = applicantsStore[i]?.GPAarray?.find(
// 				(gpa) => gpa.GPAfullName === gpaName
// 			);

// 			if (gpaMatch) {
// 				const updatedApplicants = [...applicantsStore];
// 				const currentApplicant = updatedApplicants[idx];

// 				updatedApplicants[idx] = {
// 					...currentApplicant,
// 					GPAarray: [...(currentApplicant.GPAarray ?? []), { ...gpaMatch }]
// 				};

// 				return updatedApplicants;
// 			}
// 		}
// 	}

// 	return applicantsStore;
// }

import type { Writable } from 'svelte/store';
import { updateAnswer } from './updateAnswer'; // adjust path

export function handleGPASelection(
	val: string,
	idx: number,
	applicantsStore: Writable<Record<string, unknown>[]>
) {
	// Update the 'isGPA' field first
	updateAnswer(applicantsStore, { id: 'isGPA' }, val, idx);

	if (val === 'Add New') return;

	if (val.startsWith('Yes-')) {
		const gpaName = val.replace('Yes-', '');

		applicantsStore.update((list) => {
			for (let i = 0; i < list.length; i++) {
				if (i === idx) continue;

				const gpaArray = list[i]?.GPAarray as Record<string, unknown>[] | undefined;
				const gpaMatch = gpaArray?.find(
					(gpa: Record<string, unknown>) => gpa.GPAfullName === gpaName
				);

				if (gpaMatch) {
					const currentApplicant = list[idx];
					const currentGPAarray = currentApplicant.GPAarray as
						| Record<string, unknown>[]
						| undefined;

					list[idx] = {
						...currentApplicant,
						GPAarray: [...(currentGPAarray ?? []), { ...gpaMatch }]
					};

					break;
				}
			}

			return list;
		});
	}
}
