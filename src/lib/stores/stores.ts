/**
 * Legacy Svelte Stores (for backward compatibility)
 *
 * MIGRATION NOTE:
 * This file is being gradually migrated to Svelte 5 runes.
 * For new code, import from:
 * - '$lib/state/auth.svelte' for auth state
 * - '$lib/state/form.svelte' for form state
 * - '$lib/state/ui.svelte' for UI state
 *
 * These legacy exports are maintained for existing code that hasn't been migrated yet.
 *
 * AUTH STORES (Phase 2 — Store Redesign):
 * Auth stores (currentUser, accessToken, refreshToken, isAuthenticated, isEmailVerified)
 * are now bridged readable stores that reactively read from the canonical
 * authState runes class in '$lib/state/auth.svelte'.
 * Auth functions (setAuthData, clearAuthData, initializeAuth) now delegate
 * to authState methods.
 * The bridge is in '$lib/stores/auth-bridge.svelte.ts'.
 */

import { writable, type Writable } from 'svelte/store';
import type { ApplicationData, ToastMessage, User } from '$lib/types/index.js';
import { browser } from '$app/environment';
import { authState } from '$lib/state/auth.svelte';

// Re-export from new runes-based state managers for gradual migration
// Components can import addToast from either location during migration
export { addToast, initMobileDetection } from '$lib/state/ui.svelte';

// ── Auth Stores (bridged from authState runes) ──────────────────────────────
// These are reactive readable stores that proxy to the canonical authState.
// They maintain Svelte 4 $store auto-subscription compatibility.
// Import from '$lib/stores/auth-bridge.svelte' or use authState directly.
export {
	currentUser,
	accessToken,
	refreshToken,
	isAuthenticated,
	isEmailVerified,
	userRole,
	isAdmin
} from '$lib/stores/auth-bridge.svelte';

// UI/UX stores (legacy - use uiState from '$lib/state/ui.svelte' instead)
export const toasts: Writable<ToastMessage[]> = writable([]);
export const isMobile: Writable<boolean> = writable(false);
export const showDrawer: Writable<boolean> = writable(false);
export const alertNotification: Writable<string | null> = writable(null);
export const hostName: Writable<string> = writable("Digital DSA");

// Application specific stores (legacy - use formState from '$lib/state/form.svelte' instead)
export const applicationData: Writable<ApplicationData> = writable({
	allApplicantDetails: [],
	allExistingApplicantDetails: [],
	approvedBankForSelectedByUser: []
});

// Navigation stores (legacy - use formState.backURL/nextURL instead)
export const backURL: Writable<string> = writable('');
export const nextURL: Writable<string> = writable('');

// Form and validation stores (legacy - use formState.formErrors/isLoading instead)
export const formErrors: Writable<Record<string, string>> = writable({});
export const isLoading: Writable<boolean> = writable(false);

// ── Auth Functions (delegating to authState) ────────────────────────────────

/**
 * Set auth data after successful login/signup.
 * Delegates to authState.setSession() so the canonical state is updated.
 * The bridged stores will automatically reflect the change.
 *
 * @deprecated Use authState.login() or authState methods from '$lib/state/auth.svelte' instead
 */
export function setAuthData(
	user: User,
	tokens: { accessToken: string; refreshToken: string }
): void {
	// Set the canonical authState — bridged stores react automatically.
	// Cast user to auth User type (index.ts User has optional fields
	// that auth.ts User requires, but at runtime the server provides them).
	authState.setSession(user as any, tokens.accessToken);
}

/**
 * Clear all auth data and log out.
 * Delegates to authState.logout() which handles the server call and state reset.
 *
 * @deprecated Use authState.logout() from '$lib/state/auth.svelte' instead
 */
export function clearAuthData(): void {
	// Reset canonical state — bridged stores react automatically
	authState.reset();

	// Also call the server logout (authState.logout() does this too,
	// but reset() doesn't, and we want to match the old behavior
	// without awaiting the promise)
	if (browser) {
		import('$lib/utils/csrf').then(({ secureFetch }) => {
			secureFetch('/api/auth/logout', { method: 'POST' }).catch(() => {
				// Silent fail - cookies will expire anyway
			});
		});
	}
}

/**
 * Initialize authentication state on app load.
 * Delegates to authState.init() which validates the session via httpOnly cookies.
 *
 * @deprecated Use authState.init() from '$lib/state/auth.svelte' instead
 */
export async function initializeAuth(): Promise<void> {
	if (!browser) return;

	await authState.init();
}

/**
 * Validate and refresh token if needed.
 * Delegates to authState.init() which handles validation and refresh.
 *
 * @deprecated Use authState.init() from '$lib/state/auth.svelte' instead
 */
export async function validateAndRefreshToken(): Promise<boolean> {
	if (!browser) return false;

	await authState.init();
	return authState.isAuthenticated;
}

// Feedback tracking stores
export const feedbackYes: Writable<number> = writable(0);

// Appointment wizard store
export const appointmentData: Writable<Record<string, any>> = writable({});




