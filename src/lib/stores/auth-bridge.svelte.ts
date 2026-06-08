/**
 * Auth Bridge: Svelte 5 runes -> Svelte 4 readable stores
 *
 * This file creates Svelte 4-compatible readable stores that reactively
 * read from the canonical authState (Svelte 5 runes class).
 *
 * These bridged stores maintain $store auto-subscription compatibility
 * for existing components that haven't migrated to direct authState access.
 *
 * This bridge will be removed in Phase 7 when all components migrate
 * to direct authState access.
 *
 * @module auth-bridge
 */

import { readable } from 'svelte/store';
import { authState } from '$lib/state/auth.svelte';
import type { User } from '$lib/types/auth';

/**
 * Create a Svelte 4 readable store that reactively tracks a getter
 * from the authState runes class.
 *
 * Uses $effect.root + $effect to subscribe to runes reactivity
 * and push updates into the Svelte 4 store contract.
 */
function fromRune<T>(getter: () => T): { subscribe: (run: (value: T) => void) => () => void } {
	return readable<T>(getter(), (set) => {
		const cleanup = $effect.root(() => {
			$effect(() => {
				set(getter());
			});
		});
		return cleanup;
	});
}

// ── Bridged Auth Stores ─────────────────────────────────────────────────────
// These mirror the legacy stores from stores.ts but read from authState

/** @deprecated Use authState.user from '$lib/state/auth.svelte' instead */
export const currentUser = fromRune<User | null>(() => authState.user);

/** @deprecated Use authState.token from '$lib/state/auth.svelte' instead */
export const accessToken = fromRune<string | null>(() => authState.token);

/**
 * Refresh token bridge.
 * Note: In the new auth system, refresh tokens are httpOnly cookies
 * and not available client-side. This always returns null.
 * @deprecated Refresh tokens are now httpOnly cookies managed server-side
 */
export const refreshToken = fromRune<string | null>(() => null);

/** @deprecated Use authState.isAuthenticated from '$lib/state/auth.svelte' instead */
export const isAuthenticated = fromRune<boolean>(() => authState.isAuthenticated);

/** @deprecated Use authState.isEmailVerified from '$lib/state/auth.svelte' instead */
export const isEmailVerified = fromRune<boolean>(() => authState.isEmailVerified);

/** @deprecated Use authState.userRole from '$lib/state/auth.svelte' instead */
export const userRole = fromRune<string | null>(() => authState.userRole);

/** @deprecated Use authState.isAdmin from '$lib/state/auth.svelte' instead */
export const isAdmin = fromRune<boolean>(() => authState.isAdmin);
