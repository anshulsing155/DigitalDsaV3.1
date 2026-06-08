import { browser } from '$app/environment';
import clientLogger from '$lib/utils/clientLogger';
import { getPreferences } from '$lib/utils/capacitorPreferences';
import type { ApplicationData } from '$lib/schemas/applicationDataSchema';
import { applicationDataSchema } from '$lib/schemas/applicationDataSchema';
import type { Question } from '$lib/types/questionSchema';
import formQuestions from '$lib/data/form-questions.json';

const STORAGE_KEY = 'home-application-data';

/**
 * Ensures all questions have a schemaVersion.
 * @param questions - Raw questions from JSON.
 * @returns Questions with schemaVersion added if missing.
 */
function normalizeQuestions(questions: Question[]): Question[] {
	return questions.map((q) => ({
		...q,

		derivedLogicGroup: q.derivedLogicGroup || ''
	})) as Question[];
}

/**
 * Persists form data to Capacitor Preferences or localStorage, updating flags based on question options.
 * @param data - The ApplicationData to persist.
 * @returns Updated ApplicationData with derived flags.
 */
export function saveFormToStorage(data: ApplicationData): ApplicationData {
	const updatedData = { ...data };
	const normalizedQuestions = normalizeQuestions(formQuestions as unknown as Question[]);
	const logicGroups = new Set(
		normalizedQuestions.map((q) => q.derivedLogicGroup).filter(Boolean) as string[]
	);

	for (const group of logicGroups) {
		const groupQuestions = normalizedQuestions.filter((q) => q.derivedLogicGroup === group);
		const trueFlags = new Set<string>();

		// Step 1: Collect all flags that should be true from selected options
		for (const question of groupQuestions) {
			if (question.type === 'radio' && question.options && question.bindsTo) {
				const selectedValue = updatedData[question.bindsTo];
				const selectedOption = question.options.find((opt) => opt.value === selectedValue);
				if (selectedOption?.flagKeys) {
					selectedOption.flagKeys.forEach((flag) => trueFlags.add(flag));
				}
			}
		}

		// Step 2: Set flags to false for unselected options, only if not in trueFlags
		for (const question of groupQuestions) {
			if (question.type === 'radio' && question.options && question.bindsTo) {
				const selectedValue = updatedData[question.bindsTo];
				question.options
					.filter((opt) => opt.value !== selectedValue && opt.flagKeys)
					.flatMap((opt) => opt.flagKeys || [])
					.forEach((flag) => {
						if (!trueFlags.has(flag)) {
							updatedData[flag] = false;
						}
					});
			}
		}

		// Step 3: Set all trueFlags to true
		for (const flag of trueFlags) {
			updatedData[flag] = true;
		}
	}

	if (browser) {
		try {
			const validated = applicationDataSchema.parse(updatedData);
			// Fire-and-forget: keep saveFormToStorage synchronous for callers.
			// Falls back to localStorage if Preferences fails or isn't available.
			void (async () => {
				const result = await getPreferences();
				if (!result) {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
					return;
				}
				const { Preferences } = result;
				try {
					await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(validated) });
				} catch (err) {
					clientLogger.error({ err }, 'Failed to save to Preferences:');
					localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
				}
			})();
		} catch (err) {
			clientLogger.error({ err }, 'Invalid data for storage:');
		}
	}

	return updatedData;
}

/**
 * Loads form data from Capacitor Preferences or localStorage.
 * @returns Validated ApplicationData or null if not found.
 */
export async function loadFormFromStorage(): Promise<ApplicationData | null> {
	if (browser) {
		try {
			const prefs = await getPreferences();
			if (prefs) {
				const { Preferences } = prefs;
				const result = await Preferences.get({ key: STORAGE_KEY });
				if (result.value) {
					return applicationDataSchema.parse(JSON.parse(result.value));
				}
			}
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				return applicationDataSchema.parse(JSON.parse(stored));
			}
		} catch (err) {
			clientLogger.error({ err }, 'Failed to parse stored form data:');
		}
	}
	return null;
}
