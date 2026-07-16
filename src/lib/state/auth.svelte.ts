// Svelte 5 Runes-based authentication state (simplified for website-only guest mode)
import type { AuthState, User } from '$lib/types/auth';

class AuthStateManager {
	get isAuthenticated(): boolean {
		return false;
	}

	get user(): User | null {
		return null;
	}

	get token(): string | null {
		return null;
	}

	get loading(): boolean {
		return false;
	}

	get error(): string | null {
		return null;
	}

	get sessionExpiry(): number | null {
		return null;
	}

	get currentUser(): User | null {
		return null;
	}

	get userRole(): string | null {
		return null;
	}

	get isEmailVerified(): boolean {
		return false;
	}

	get isAdmin(): boolean {
		return false;
	}

	get isAgent(): boolean {
		return false;
	}

	get isUser(): boolean {
		return false;
	}

	get sessionStatus(): 'active' | 'expired' | 'unknown' {
		return 'unknown';
	}

	get state(): AuthState {
		return {
			isAuthenticated: false,
			user: null,
			token: null,
			loading: false,
			error: null,
			sessionExpiry: null
		};
	}

	async init(): Promise<void> {}
	async logout(): Promise<void> {}
	async refreshAuth(): Promise<void> {}
	clearError(): void {}
	updateUser(userData: Partial<User>): void {}
	setSession(user: User, token?: string | null): void {}
	seedFromServer(serverUser: Record<string, any>): void {}
	reset(): void {}
	hasRole(role: string): boolean {
		return false;
	}

	getPermissions(): string[] {
		return [];
	}

	hasPermission(permission: string): boolean {
		return false;
	}

	async getSessionTimeRemaining(): Promise<number> {
		return 0;
	}

	async hasActiveSession(): Promise<boolean> {
		return false;
	}

	async getActiveSessions(): Promise<any[]> {
		return [];
	}

	async logoutAllDevices(): Promise<void> {}
}

export const authState = new AuthStateManager();
export type { AuthStateManager };
