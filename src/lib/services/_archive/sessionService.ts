// Enhanced session management service
import type {
	SessionService,
	SessionData,
	SessionValidation,
	SessionInfo,
	User,
	DeviceInfo
} from '$lib/types/auth';
// Using browser localStorage with encryption for session storage
// In production, consider using more secure storage mechanisms
import { deviceFingerprinter } from '$lib/utils/deviceFingerprint';
import { securityMonitor } from '$lib/services/securityMonitor';
import { ClientSessionManager } from '$lib/utils/clientSession';
import { browser } from '$app/environment';
import logger from '$lib/utils/clientLogger';

class SessionServiceImpl implements SessionService {
	private baseUrl = '/api/auth';
	private sessionCheckInterval: number | null = null;
	private readonly SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

	async createSession(user: User, deviceInfo: DeviceInfo): Promise<SessionData> {
		try {
			// Create server-side session first to get tokens
			const response = await fetch(`${this.baseUrl}/session`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					userId: user.id,
					deviceId: deviceInfo.fingerprint,
					version: '1.0.0', // App version
					fingerprint: deviceInfo.fingerprint,
					deviceInfo
				})
			});

			let serverToken = null;
			let serverRefreshToken = null;

			if (response.ok) {
				const data = await response.json();
				serverToken = data.token;
				serverRefreshToken = data.refreshToken;
			} else {
				logger.warn('SessionService: server session creation failed, creating local session');
				// Generate simple tokens for local use
				serverToken = `local_${crypto.randomUUID()}`;
				serverRefreshToken = `refresh_${crypto.randomUUID()}`;
			}

			// Create client-side session with tokens
			const sessionData = await ClientSessionManager.createClientSession(
				user,
				serverToken,
				serverRefreshToken,
				deviceInfo
			);

			// Track device for security monitoring
			try {
				securityMonitor.trackUserDevice(user.id, deviceInfo);
			} catch (trackError) {
				logger.error('SessionService: device tracking failed', trackError);
			}

			// Log session creation event
			try {
				securityMonitor.logAuthEvent({
					userId: user.id,
					type: 'login',
					ipAddress: 'unknown', // Would be provided by server
					userAgent: navigator.userAgent,
					success: true,
					metadata: {
						deviceFingerprint: deviceInfo.fingerprint,
						sessionManager: 'client'
					}
				});
			} catch (logError) {
				logger.error('SessionService: auth event logging failed', logError);
			}

			// Start session monitoring
			this.startSessionMonitoring();

			return sessionData;
		} catch (error) {
			logger.error('SessionService: session creation error', error);
			throw error;
		}
	}

	async validateSession(token: string): Promise<SessionValidation> {
		try {
			// Use client session manager for validation
			const validation = await ClientSessionManager.validateClientSession(token);

			if (!validation.valid || !validation.sessionData) {
				await this.clearStoredSessionData();
				return { valid: false, reason: validation.reason };
			}

			// Check for session anomalies using security monitor
			const currentDeviceInfo = await deviceFingerprinter.getDeviceInfo();
			const anomalies = securityMonitor.detectSessionAnomalies(
				validation.sessionData.user.id,
				currentDeviceInfo,
				validation.sessionData
			);

			if (anomalies.length > 0) {
				// Log security alerts but don't necessarily invalidate session
				anomalies.forEach((alert) => {
					if (alert.severity === 'critical' || alert.severity === 'high') {
						logger.warn('SessionService: session security alert', alert);
					}
				});
			}

			// Validate with server (optional - client manager handles local validation)
			try {
				const response = await fetch(`${this.baseUrl}/validate`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify({
						deviceFingerprint: currentDeviceInfo.fingerprint
					})
				});

				if (response.ok) {
					// Log successful validation
					securityMonitor.logAuthEvent({
						userId: validation.sessionData.user.id,
						type: 'login',
						ipAddress: 'unknown',
						userAgent: navigator.userAgent,
						success: true,
						metadata: {
							validationType: 'client_session_validation'
						}
					});
				}
			} catch (serverError) {
				logger.warn(
					'SessionService: server validation failed, using client local validation',
					serverError
				);
			}

			return {
				valid: true,
				user: validation.sessionData.user
			};
		} catch (error) {
			logger.error('SessionService: session validation error', error);
			return { valid: false, reason: 'Validation error' };
		}
	}

	async refreshSession(refreshToken: string): Promise<SessionData> {
		try {
			// Try to refresh with server first
			let newToken = null;
			let newRefreshToken = null;

			try {
				const response = await fetch(`${this.baseUrl}/refresh`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${refreshToken}`
					}
				});

				if (response.ok) {
					const data = await response.json();
					newToken = data.token;
					newRefreshToken = data.refreshToken;
				}
			} catch (serverError) {
				logger.warn('SessionService: server refresh failed, generating local tokens', serverError);
			}

			// If server refresh failed, generate new local tokens
			if (!newToken) {
				newToken = `local_${crypto.randomUUID()}`;
				newRefreshToken = `refresh_${crypto.randomUUID()}`;
			}

			// Get current session data
			const currentSessionData = await this.getStoredSessionData();
			if (!currentSessionData) {
				throw new Error('No current session to refresh');
			}

			// Create new session data with new tokens
			const deviceInfo = await deviceFingerprinter.getDeviceInfo();
			const newSessionData = await ClientSessionManager.createClientSession(
				currentSessionData.user,
				newToken,
				newRefreshToken,
				deviceInfo
			);

			// Log session refresh event
			securityMonitor.logAuthEvent({
				userId: newSessionData.user.id,
				type: 'login',
				ipAddress: 'unknown',
				userAgent: navigator.userAgent,
				success: true,
				metadata: {
					action: 'client_session_refresh'
				}
			});

			return newSessionData;
		} catch (error) {
			logger.error('SessionService: session refresh error', error);
			throw error;
		}
	}

	async invalidateSession(token: string): Promise<void> {
		const sessionData = await this.getStoredSessionData();

		try {
			await fetch(`${this.baseUrl}/logout`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				}
			});

			// Log logout event
			if (sessionData) {
				securityMonitor.logAuthEvent({
					userId: sessionData.user.id,
					type: 'logout',
					ipAddress: 'unknown',
					userAgent: navigator.userAgent,
					success: true,
					metadata: { action: 'manual_logout' }
				});
			}
		} catch (error) {
			logger.error('SessionService: session invalidation error', error);
		} finally {
			await this.clearStoredSessionData();
			this.stopSessionMonitoring();
		}
	}

	async invalidateAllSessions(userId: string): Promise<void> {
		try {
			const localSession = await this.getStoredSessionData();
			if (!localSession) return;

			await fetch(`${this.baseUrl}/logout-all`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${localSession.token}`
				},
				body: JSON.stringify({ userId })
			});
		} catch (error) {
			logger.error('SessionService: all-sessions invalidation error', error);
		} finally {
			await this.clearStoredSessionData();
			this.stopSessionMonitoring();
		}
	}

	async getActiveSessions(userId: string): Promise<SessionInfo[]> {
		try {
			const localSession = await this.getStoredSessionData();
			if (!localSession) return [];

			const response = await fetch(`${this.baseUrl}/sessions/${userId}`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${localSession.token}`
				}
			});

			if (response.ok) {
				const data = await response.json();
				return data.sessions || [];
			}
			return [];
		} catch (error) {
			logger.error('SessionService: get active sessions error', error);
			return [];
		}
	}

	// Session persistence methods (delegated to ClientSessionManager)
	private async storeSessionData(_sessionData: SessionData): Promise<void> {
		// This is now handled by ClientSessionManager.createClientSession
		// No additional storage needed here
	}

	private async getStoredSessionData(): Promise<SessionData | null> {
		// Delegate to ClientSessionManager
		return await ClientSessionManager.getStoredSessionData();
	}

	private async clearStoredSessionData(): Promise<void> {
		// Delegate to ClientSessionManager
		await ClientSessionManager.clearSessionData();
	}

	// Session monitoring
	private startSessionMonitoring(): void {
		if (!browser || this.sessionCheckInterval) return;

		this.sessionCheckInterval = window.setInterval(async () => {
			await this.checkSessionHealth();
		}, this.SESSION_CHECK_INTERVAL);
	}

	private stopSessionMonitoring(): void {
		if (this.sessionCheckInterval) {
			clearInterval(this.sessionCheckInterval);
			this.sessionCheckInterval = null;
		}
	}

	private async checkSessionHealth(): Promise<void> {
		try {
			const sessionData = await this.getStoredSessionData();
			if (!sessionData) {
				this.stopSessionMonitoring();
				return;
			}

			// Check if session is close to expiry (within 10 minutes)
			const timeUntilExpiry = sessionData.expiresAt - Date.now();
			if (timeUntilExpiry < 10 * 60 * 1000 && timeUntilExpiry > 0) {
				// Try to refresh the session
				try {
					await this.refreshSession(sessionData.token);
				} catch (error) {
					logger.error('SessionService: auto-refresh failed', error);
					await this.clearStoredSessionData();
					this.stopSessionMonitoring();
				}
			} else if (timeUntilExpiry <= 0) {
				// Session expired
				await this.clearStoredSessionData();
				this.stopSessionMonitoring();
			}
		} catch (error) {
			logger.error('SessionService: session health check error', error);
		}
	}

	// Restore session on app initialization
	async restoreSession(): Promise<SessionData | null> {
		try {
			const sessionData = await this.getStoredSessionData();
			if (!sessionData) return null;

			// Validate the stored session
			const validation = await this.validateSession(sessionData.token);
			if (validation.valid) {
				this.startSessionMonitoring();
				return sessionData;
			} else {
				await this.clearStoredSessionData();
				return null;
			}
		} catch (error) {
			logger.error('SessionService: session restoration error', error);
			await this.clearStoredSessionData();
			return null;
		}
	}

	// Check if user has active session
	async hasActiveSession(): Promise<boolean> {
		return await ClientSessionManager.hasActiveSession();
	}

	// Get session time remaining
	async getSessionTimeRemaining(): Promise<number> {
		return await ClientSessionManager.getSessionTimeRemaining();
	}

	// Update user data in session
	async updateUserData(userData: User): Promise<void> {
		await ClientSessionManager.updateUserData(userData);
	}

	// Get session analytics (client-side)
	async getSessionAnalytics(): Promise<any> {
		return await ClientSessionManager.getSessionAnalytics();
	}

	// Force logout all user sessions (security feature)
	async forceLogoutAllUserSessions(userId: string): Promise<void> {
		try {
			await this.clearStoredSessionData();

			// Notify server
			try {
				await fetch(`${this.baseUrl}/logout-all-force`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ userId })
				});
			} catch (serverError) {
				logger.warn('SessionService: server force logout failed', serverError);
			}
		} catch (error) {
			logger.error('SessionService: force logout all sessions error', error);
		}
	}
}

// Export singleton instance
export const sessionService = new SessionServiceImpl();
