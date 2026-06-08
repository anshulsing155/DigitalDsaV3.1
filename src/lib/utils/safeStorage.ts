/**
 * Safe localStorage/sessionStorage wrappers.
 *
 * Safari private browsing (pre-iOS 14), full storage quota, and corporate
 * browser policies can all cause storage access to throw. These wrappers
 * degrade gracefully instead of crashing the page.
 */

export const safeLocalStorage = {
	getItem(key: string): string | null {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	},
	setItem(key: string, value: string): void {
		try {
			localStorage.setItem(key, value);
		} catch {
			// Storage full or disabled — silently ignore
		}
	},
	removeItem(key: string): void {
		try {
			localStorage.removeItem(key);
		} catch {
			// Storage disabled — silently ignore
		}
	},
	/** Safely iterate all keys matching a prefix */
	getKeysWithPrefix(prefix: string): string[] {
		const keys: string[] = [];
		try {
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key && key.startsWith(prefix)) {
					keys.push(key);
				}
			}
		} catch {
			// Storage disabled
		}
		return keys;
	}
};

export const safeSessionStorage = {
	getItem(key: string): string | null {
		try {
			return sessionStorage.getItem(key);
		} catch {
			return null;
		}
	},
	setItem(key: string, value: string): void {
		try {
			sessionStorage.setItem(key, value);
		} catch {
			// Storage full or disabled
		}
	},
	removeItem(key: string): void {
		try {
			sessionStorage.removeItem(key);
		} catch {
			// Storage disabled
		}
	}
};
