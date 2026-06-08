// Client-side session management utilities
import type { SessionData, DeviceInfo, User } from '$lib/types/auth';
import clientLogger from '$lib/utils/clientLogger';
import { deviceFingerprinter } from '$lib/utils/deviceFingerprint';
import { browser } from '$app/environment';

interface JWTPayload {
	exp?: number;
	[key: string]: unknown;
}

/**
 * Simple JWT utilities for client-side use (no sensitive operations)
 */
export function parseJWTPayload(token: string): JWTPayload | null {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return null;

		const payload = JSON.parse(atob(parts[1])) as JWTPayload;
		return payload;
	} catch (error) {
		clientLogger.error({ err: error }, 'JWT parsing error:');
		return null;
	}
}

export function isJWTExpired(token: string): boolean {
	try {
		const payload = parseJWTPayload(token);
		if (!payload || !payload.exp) return true;

		const now = Math.floor(Date.now() / 1000);
		return payload.exp < now;
	} catch (error) {
		return true;
	}
}

/**
 * Client-side session manager (safe for browser use)
 */
export class ClientSessionManager {
	private static readonly SESSION_PREFIX = 'dsa_session_';
	private static readonly DEVICE_PREFIX = 'dsa_device_';

	/**
	 * Create session data with device binding (client-side only)
	 */
	static async createClientSession(
		user: User,
		token: string,
		refreshToken: string,
		deviceInfo?: DeviceInfo
	): Promise<SessionData> {
		const currentDeviceInfo = deviceInfo || (await deviceFingerprinter.getDeviceInfo());

		const sessionData: SessionData = {
			token,
			refreshToken,
			expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
			user,
			deviceFingerprint: currentDeviceInfo.fingerprint
		};

		// Store session data
		await this.storeSessionData(sessionData, currentDeviceInfo);

		return sessionData;
	}

	/**
	 * Validate session with device fingerprint (client-side checks only)
	 * Note: Token validation is now handled server-side via httpOnly cookies
	 */
	static async validateClientSession(_token?: string): Promise<{
		valid: boolean;
		sessionData?: SessionData;
		reason?: string;
	}> {
		try {
			if (!browser) {
				return { valid: false, reason: 'Not in browser environment' };
			}

			// Get stored session metadata (tokens are in httpOnly cookies)
			const sessionData = await this.getStoredSessionData();
			if (!sessionData) {
				return { valid: false, reason: 'No session found' };
			}

			// Check local expiry
			if (Date.now() >= sessionData.expiresAt) {
				await this.clearSessionData();
				return { valid: false, reason: 'Session expired locally' };
			}

			// Verify device fingerprint
			const currentDeviceInfo = await deviceFingerprinter.getDeviceInfo();
			if (currentDeviceInfo.fingerprint !== sessionData.deviceFingerprint) {
				await this.clearSessionData();
				return { valid: false, reason: 'Device fingerprint mismatch' };
			}

			return { valid: true, sessionData };
		} catch (error) {
			clientLogger.error({ err: error }, 'Client session validation error:');
			return { valid: false, reason: 'Validation error' };
		}
	}

	/**
	 * Store session data in browser storage
	 */
	private static async storeSessionData(
		sessionData: SessionData,
		deviceInfo: DeviceInfo
	): Promise<void> {
		if (!browser) return;

		try {
			// SECURITY: Do NOT store tokens in localStorage - use httpOnly cookies only
			// localStorage.setItem(`${this.SESSION_PREFIX}token`, sessionData.token);
			// localStorage.setItem(`${this.SESSION_PREFIX}refresh_token`, sessionData.refreshToken);

			// Store only non-sensitive session metadata for client-side session management
			localStorage.setItem(`${this.SESSION_PREFIX}expires_at`, sessionData.expiresAt.toString());
			localStorage.setItem(`${this.SESSION_PREFIX}user`, JSON.stringify(sessionData.user));
			localStorage.setItem(
				`${this.SESSION_PREFIX}device_fingerprint`,
				sessionData.deviceFingerprint
			);
			localStorage.setItem(`${this.DEVICE_PREFIX}info`, JSON.stringify(deviceInfo));
			localStorage.setItem(`${this.SESSION_PREFIX}created_at`, Date.now().toString());
		} catch (error) {
			clientLogger.error({ err: error }, 'Failed to store session data:');
		}
	}

	/**
	 * Get stored session data from browser storage
	 */
	static async getStoredSessionData(): Promise<SessionData | null> {
		if (!browser) return null;

		try {
			// SECURITY: Tokens are now stored in httpOnly cookies, not localStorage
			// We only retrieve non-sensitive session metadata here
			const expiresAtStr = localStorage.getItem(`${this.SESSION_PREFIX}expires_at`);
			const userStr = localStorage.getItem(`${this.SESSION_PREFIX}user`);
			const deviceFingerprint = localStorage.getItem(`${this.SESSION_PREFIX}device_fingerprint`);

			if (!expiresAtStr || !userStr || !deviceFingerprint) {
				return null;
			}

			return {
				token: '', // Token is in httpOnly cookie, not accessible from JS
				refreshToken: '', // Refresh token is in httpOnly cookie, not accessible from JS
				expiresAt: parseInt(expiresAtStr),
				user: JSON.parse(userStr),
				deviceFingerprint
			};
		} catch (error) {
			clientLogger.error({ err: error }, 'Failed to get stored session data:');
			return null;
		}
	}

	/**
	 * Clear session data from browser storage
	 */
	static async clearSessionData(): Promise<void> {
		if (!browser) return;

		try {
			// SECURITY: Tokens are in httpOnly cookies (cleared server-side)
			// Clear only the session metadata from localStorage
			localStorage.removeItem(`${this.SESSION_PREFIX}expires_at`);
			localStorage.removeItem(`${this.SESSION_PREFIX}user`);
			localStorage.removeItem(`${this.SESSION_PREFIX}device_fingerprint`);
			localStorage.removeItem(`${this.DEVICE_PREFIX}info`);
			localStorage.removeItem(`${this.SESSION_PREFIX}created_at`);
		} catch (error) {
			clientLogger.error({ err: error }, 'Failed to clear session data:');
		}
	}

	/**
	 * Update user data in session
	 */
	static async updateUserData(userData: User): Promise<void> {
		if (!browser) return;

		try {
			const sessionData = await this.getStoredSessionData();
			if (sessionData) {
				sessionData.user = userData;
				const deviceInfoStr = localStorage.getItem(`${this.DEVICE_PREFIX}info`);
				const deviceInfo = deviceInfoStr
					? JSON.parse(deviceInfoStr)
					: await deviceFingerprinter.getDeviceInfo();
				await this.storeSessionData(sessionData, deviceInfo);
			}
		} catch (error) {
			clientLogger.error({ err: error }, 'Failed to update user data in session:');
		}
	}

	/**
	 * Get session time remaining
	 */
	static async getSessionTimeRemaining(): Promise<number> {
		const sessionData = await this.getStoredSessionData();
		if (!sessionData) return 0;

		return Math.max(0, sessionData.expiresAt - Date.now());
	}

	/**
	 * Check if user has active session
	 * Note: Full token validation is done server-side; this checks local session metadata
	 */
	static async hasActiveSession(): Promise<boolean> {
		const sessionData = await this.getStoredSessionData();
		if (!sessionData) return false;

		// Only check local expiry; token validation is done server-side via httpOnly cookies
		return Date.now() < sessionData.expiresAt;
	}

	/**
	 * Get basic session analytics (client-side only)
	 */
	static async getSessionAnalytics(): Promise<{
		sessionAge: number;
		timeRemaining: number;
		deviceConsistency: boolean;
		isExpired: boolean;
	}> {
		try {
			const sessionData = await this.getStoredSessionData();
			if (!sessionData) {
				return {
					sessionAge: 0,
					timeRemaining: 0,
					deviceConsistency: false,
					isExpired: true
				};
			}

			const createdAtStr = localStorage.getItem(`${this.SESSION_PREFIX}created_at`);
			const createdAt = createdAtStr ? parseInt(createdAtStr) : Date.now();
			const sessionAge = Date.now() - createdAt;
			const timeRemaining = Math.max(0, sessionData.expiresAt - Date.now());

			const currentDeviceInfo = await deviceFingerprinter.getDeviceInfo();
			const deviceConsistency = currentDeviceInfo.fingerprint === sessionData.deviceFingerprint;
			// Token validation is done server-side; check local expiry only
			const isExpired = timeRemaining <= 0;

			return {
				sessionAge,
				timeRemaining,
				deviceConsistency,
				isExpired
			};
		} catch (error) {
			clientLogger.error({ err: error }, 'Session analytics error:');
			return {
				sessionAge: 0,
				timeRemaining: 0,
				deviceConsistency: false,
				isExpired: true
			};
		}
	}
}
