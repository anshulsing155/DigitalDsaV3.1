/**
 * Form State Helpers
 * ============================================================================
 * Utility functions for managing form state persistence.
 * Moved from src/lib/stores/formState.ts (was never a store).
 * ============================================================================
 */

import { browser } from '$app/environment';
import clientLogger from '$lib/utils/clientLogger';
import { getPreferences } from '$lib/utils/capacitorPreferences';

const STORAGE_KEY = 'application_data';
const FORM_DATA_KEY = 'formData';

/**
 * Clears form state from both Capacitor Preferences and sessionStorage.
 * Capacitor Preferences clear is fire-and-forget.
 */
export function clearFormState(): void {
	if (!browser) return;
	try {
		sessionStorage.removeItem(FORM_DATA_KEY);
	} catch (err) {
		clientLogger.error({ err }, 'Failed to clear sessionStorage form state:');
	}
	void (async () => {
		const prefs = await getPreferences();
		if (!prefs) return;
		const { Preferences } = prefs;
		try {
			await Preferences.remove({ key: STORAGE_KEY });
		} catch (err) {
			clientLogger.error({ err }, 'Failed to clear Capacitor Preferences form state:');
		}
	})();
}
