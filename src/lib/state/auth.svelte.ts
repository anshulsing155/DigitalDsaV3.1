// Svelte 5 Runes-based authentication state
// Replaces authStore.ts with modern reactive primitives

import { browser } from '$app/environment';
import type { AuthState, User } from '$lib/types/auth';
import { secureFetch, stopTokenRefreshScheduler } from '$lib/utils/csrf';
import { ROLE_PERMISSIONS } from '$lib/config/permissions';

/**
 * Svelte 5 Runes-based Authentication State
 *
 * Usage in components:
 * ```svelte
 * <script lang="ts">
 *   import { authState } from '$lib/state/auth.svelte';
 *
 *   // Direct access to reactive state
 *   const isLoggedIn = $derived(authState.isAuthenticated);
 *   const user = $derived(authState.user);
 *
 *   // Permission check
 *   const canCreateCase = $derived(authState.hasPermission('cases.create'));
 * </script>
 * ```
 */
class AuthStateManager {
	// Core reactive state using $state rune
	private _isAuthenticated = $state(false);
	private _user = $state<User | null>(null);
	private _token = $state<string | null>(null);
	private _loading = $state(false);
	private _error = $state<string | null>(null);
	private _sessionExpiry = $state<number | null>(null);

	// Public getters for reactive access (replaces derived stores)
	get isAuthenticated(): boolean {
		return this._isAuthenticated;
	}

	get user(): User | null {
		return this._user;
	}

	get token(): string | null {
		return this._token;
	}

	get loading(): boolean {
		return this._loading;
	}

	get error(): string | null {
		return this._error;
	}

	get sessionExpiry(): number | null {
		return this._sessionExpiry;
	}

	// Computed properties (replaces derived stores)
	get currentUser(): User | null {
		return this._user;
	}

	get userRole(): string | null {
		return this._user?.role || null;
	}

	get isEmailVerified(): boolean {
		return this._user?.isEmailVerified || false;
	}

	get isAdmin(): boolean {
		return this._user?.role === 'admin';
	}

	get isAgent(): boolean {
		return this._user?.role === 'agent';
	}

	get isUser(): boolean {
		return this._user?.role === 'user';
	}

	get sessionStatus(): 'active' | 'expired' | 'unknown' {
		if (!this._sessionExpiry) return 'unknown';
		const now = Math.floor(Date.now() / 1000);
		if (this._sessionExpiry > now) return 'active';
		if (this._sessionExpiry <= now) return 'expired';
		return 'unknown';
	}

	// Get full state snapshot (for compatibility)
	get state(): AuthState {
		return {
			isAuthenticated: this._isAuthenticated,
			user: this._user,
			token: this._token,
			loading: this._loading,
			error: this._error,
			sessionExpiry: this._sessionExpiry
		};
	}

	// Initialize authentication state from stored session
	async init(): Promise<void> {
		if (!browser) return;

		try {
			this._loading = true;

			const response = await secureFetch('/api/auth/validate-token', { method: 'GET' });

			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data?.valid && result.data?.user) {
					this._isAuthenticated = true;
					this._user = result.data.user;
					this._token = null; // rely on httpOnly cookie
					this._sessionExpiry = result.data.tokenInfo?.expiresAt ?? null;
					this._error = null;
				}
			}
		} catch {
			this._error = 'Failed to restore session';
		} finally {
			this._loading = false;
		}
	}

	// NOTE: `login()` and `register()` methods were removed (2026-05-13 review M5).
	// They were never called from production routes — the actual login/signup flows
	// live in src/routes/(auth)/login/+page.svelte and partner-signup/+page.svelte,
	// which call /api/auth/* directly via secureFetch. The dead methods also pulled
	// in sessionService → clientSession.ts, which wrote PII to localStorage.
	// See src/lib/services/_archive/sessionService.ts + src/lib/utils/_archive/clientSession.ts.

	// Logout action
	async logout(): Promise<void> {
		// Pitfall #54: cancel the proactive refresh timer BEFORE the network
		// call so it can't fire a renew against a session we're tearing down.
		stopTokenRefreshScheduler();
		try {
			await secureFetch('/api/auth/logout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
		} catch {
			// Silently handle logout errors
		} finally {
			this.reset();
		}
	}

	// Refresh authentication
	async refreshAuth(): Promise<void> {
		if (!this._token) return;

		try {
			const response = await secureFetch('/api/auth/refresh-token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data) {
					this._user = result.data.user;
					this._token = result.data.accessToken ?? this._token;
					this._error = null;
				}
			}
		} catch {
			// Silently handle refresh errors
		}
	}

	// Clear error
	clearError(): void {
		this._error = null;
	}

	// Update user data (only works when already authenticated)
	updateUser(userData: Partial<User>): void {
		if (this._user) {
			this._user = { ...this._user, ...userData };
		}
	}

	/**
	 * Set session state directly from external auth data.
	 *
	 * This is a bridge method for legacy code that calls setAuthData()
	 * after receiving tokens from API responses. It sets the canonical
	 * auth state so bridged stores reflect the change immediately.
	 *
	 * @deprecated Prefer using authState.login() or authState.init() instead.
	 * This method will be removed when all legacy setAuthData callers are migrated.
	 */
	setSession(user: User, token?: string | null): void {
		this._isAuthenticated = true;
		this._user = user;
		this._token = token ?? null;
		this._error = null;
		this._loading = false;
	}

	/**
	 * Seed auth state synchronously from server-provided layout data.
	 * Accepts the partial user shape from +layout.server.ts (locals.user)
	 * so CTAs can check isAuthenticated without waiting for async init().
	 * The full init() call will later enrich with complete user details.
	 */
	seedFromServer(serverUser: Record<string, any>): void {
		if (this._isAuthenticated) return; // already initialized, don't overwrite
		this._isAuthenticated = true;
		this._user = serverUser as User;
		this._error = null;
		this._loading = false;
	}

	// Reset to initial state
	reset(): void {
		this._isAuthenticated = false;
		this._user = null;
		this._token = null;
		this._loading = false;
		this._error = null;
		this._sessionExpiry = null;
	}

	// Role checking helper
	hasRole(role: string): boolean {
		return this._user?.role === role;
	}

	/**
	 * Get all permissions for the current user's role.
	 *
	 * Returns a flat array of permission strings like:
	 *   ['cases.create', 'cases.view_own', 'form.create', ...]
	 *
	 * The permission set is determined by the user's active role (dsa/rm/admin/user).
	 * Admin gets full access. DSA gets case + form + file permissions.
	 * RM gets read-only case access + broadcast + policy features.
	 */
	getPermissions(): string[] {
		const role = this._user?.role ?? 'user';
		return [...(ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.user)];
	}

	/**
	 * Check if the current user has a specific permission.
	 *
	 * @param permission — e.g. 'cases.create', 'rm.broadcast', 'admin.users'
	 * @returns true if the user's role includes this permission
	 *
	 * @example
	 * ```ts
	 * if (authState.hasPermission('cases.create')) { ... }
	 * ```
	 */
	hasPermission(permission: string): boolean {
		const role = this._user?.role ?? 'user';
		const perms = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.user;
		return perms.includes(permission);
	}

	// Session time remaining
	async getSessionTimeRemaining(): Promise<number> {
		if (!this._sessionExpiry) return 0;
		const now = Math.floor(Date.now() / 1000);
		return Math.max(0, this._sessionExpiry - now);
	}

	// Check for active session
	async hasActiveSession(): Promise<boolean> {
		return this._isAuthenticated && this.sessionStatus === 'active';
	}

	// Get active sessions — Phase 2: requires /api/auth/sessions endpoint
	// Returns empty array until multi-device session management is implemented.
	async getActiveSessions(): Promise<any[]> {
		return [];
	}

	// Logout from all devices
	async logoutAllDevices(): Promise<void> {
		try {
			await secureFetch('/api/auth/logout-all', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
		} catch {
			// Silently handle errors
		} finally {
			this.reset();
		}
	}
}

// Export singleton instance
export const authState = new AuthStateManager();

// Export type for external use
export type { AuthStateManager };
