// Security monitoring service for authentication system
import type { AuthEvent, DeviceInfo } from '$lib/types/auth';
import { browser } from '$app/environment';
import logger from '$lib/utils/clientLogger';

export interface SecurityAlert {
	id: string;
	type:
		| 'suspicious_login'
		| 'multiple_failures'
		| 'device_change'
		| 'session_hijack'
		| 'rate_limit_exceeded';
	severity: 'low' | 'medium' | 'high' | 'critical';
	message: string;
	userId?: string;
	ipAddress?: string;
	deviceInfo?: DeviceInfo;
	timestamp: Date;
	metadata?: Record<string, any>;
}

export interface SecurityMetrics {
	totalLogins: number;
	failedLogins: number;
	suspiciousActivities: number;
	blockedIPs: number;
	activeDevices: number;
	lastSecurityEvent?: Date;
}

class SecurityMonitorService {
	private events: AuthEvent[] = [];
	private alerts: SecurityAlert[] = [];
	private blockedIPs: Set<string> = new Set();
	private failureCount: Map<string, { count: number; lastAttempt: number }> = new Map();
	private deviceSessions: Map<string, DeviceInfo[]> = new Map();

	// Configuration
	private readonly MAX_FAILED_ATTEMPTS = 5;
	private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
	private readonly SUSPICIOUS_THRESHOLD = 3;
	private readonly MAX_EVENTS_STORED = 1000;

	/**
	 * Log authentication event
	 */
	logAuthEvent(event: Omit<AuthEvent, 'id' | 'timestamp'>): void {
		const authEvent: AuthEvent = {
			...event,
			id: this.generateEventId(),
			timestamp: new Date()
		};

		this.events.push(authEvent);

		// Keep only recent events
		if (this.events.length > this.MAX_EVENTS_STORED) {
			this.events = this.events.slice(-this.MAX_EVENTS_STORED);
		}

		// Analyze event for security concerns
		this.analyzeEvent(authEvent);

		// Store in browser storage for persistence
		if (browser) {
			this.persistEvents();
		}
	}

	/**
	 * Check if IP is blocked
	 */
	isIPBlocked(ipAddress: string): boolean {
		return this.blockedIPs.has(ipAddress);
	}

	/**
	 * Check if user/IP has exceeded failure threshold
	 */
	checkFailureThreshold(identifier: string): {
		blocked: boolean;
		remainingAttempts: number;
		lockoutTime?: number;
	} {
		const failures = this.failureCount.get(identifier);

		if (!failures) {
			return { blocked: false, remainingAttempts: this.MAX_FAILED_ATTEMPTS };
		}

		// Check if lockout period has expired
		if (Date.now() - failures.lastAttempt > this.LOCKOUT_DURATION) {
			this.failureCount.delete(identifier);
			return { blocked: false, remainingAttempts: this.MAX_FAILED_ATTEMPTS };
		}

		const blocked = failures.count >= this.MAX_FAILED_ATTEMPTS;
		const remainingAttempts = Math.max(0, this.MAX_FAILED_ATTEMPTS - failures.count);
		const lockoutTime = blocked ? failures.lastAttempt + this.LOCKOUT_DURATION : undefined;

		return { blocked, remainingAttempts, lockoutTime };
	}

	/**
	 * Record failed authentication attempt
	 */
	recordFailedAttempt(identifier: string, ipAddress: string): void {
		const current = this.failureCount.get(identifier) || { count: 0, lastAttempt: 0 };
		current.count++;
		current.lastAttempt = Date.now();

		this.failureCount.set(identifier, current);

		// Block IP if too many failures
		if (current.count >= this.MAX_FAILED_ATTEMPTS) {
			this.blockedIPs.add(ipAddress);

			this.createAlert({
				type: 'multiple_failures',
				severity: 'high',
				message: `IP ${ipAddress} blocked due to ${current.count} failed login attempts`,
				ipAddress,
				metadata: { failureCount: current.count, identifier }
			});
		}
	}

	/**
	 * Clear failed attempts for identifier
	 */
	clearFailedAttempts(identifier: string): void {
		this.failureCount.delete(identifier);
	}

	/**
	 * Track device for user
	 */
	trackUserDevice(userId: string, deviceInfo: DeviceInfo): void {
		const userDevices = this.deviceSessions.get(userId) || [];

		// Check if device is already known
		const existingDevice = userDevices.find((d) => d.fingerprint === deviceInfo.fingerprint);

		if (!existingDevice) {
			userDevices.push(deviceInfo);
			this.deviceSessions.set(userId, userDevices);

			// Alert for new device if user has other devices
			if (userDevices.length > 1) {
				this.createAlert({
					type: 'device_change',
					severity: 'medium',
					message: `New device detected for user ${userId}`,
					userId,
					deviceInfo,
					metadata: { totalDevices: userDevices.length }
				});
			}
		}
	}

	/**
	 * Detect session anomalies
	 */
	detectSessionAnomalies(
		userId: string,
		currentDevice: DeviceInfo,
		_sessionData: any
	): SecurityAlert[] {
		const alerts: SecurityAlert[] = [];
		const userDevices = this.deviceSessions.get(userId) || [];

		// Check for device fingerprint mismatch
		const knownDevice = userDevices.find((d) => d.fingerprint === currentDevice.fingerprint);
		if (!knownDevice && userDevices.length > 0) {
			alerts.push({
				id: this.generateAlertId(),
				type: 'device_change',
				severity: 'high',
				message: 'Session accessed from unknown device',
				userId,
				deviceInfo: currentDevice,
				timestamp: new Date(),
				metadata: { knownDevices: userDevices.length }
			});
		}

		// Check for rapid location changes (if IP geolocation available)
		// This would require IP geolocation service integration

		// Check for unusual access patterns
		const recentEvents = this.getRecentEvents(userId, 1 * 60 * 60 * 1000); // 1 hour
		const loginEvents = recentEvents.filter((e) => e.type === 'login' && e.success);

		if (loginEvents.length > 5) {
			// More than 5 logins in an hour
			alerts.push({
				id: this.generateAlertId(),
				type: 'suspicious_login',
				severity: 'medium',
				message: 'Unusual login frequency detected',
				userId,
				timestamp: new Date(),
				metadata: { loginCount: loginEvents.length, timeWindow: '1 hour' }
			});
		}

		return alerts;
	}

	/**
	 * Get security metrics
	 */
	getSecurityMetrics(): SecurityMetrics {
		const now = Date.now();
		const last24Hours = now - 24 * 60 * 60 * 1000;

		const recentEvents = this.events.filter((e) => e.timestamp.getTime() > last24Hours);
		const totalLogins = recentEvents.filter((e) => e.type === 'login' && e.success).length;
		const failedLogins = recentEvents.filter((e) => e.type === 'login' && !e.success).length;

		const suspiciousActivities = this.alerts.filter(
			(a) =>
				a.timestamp.getTime() > last24Hours &&
				['suspicious_login', 'session_hijack'].includes(a.type)
		).length;

		const activeDevices = Array.from(this.deviceSessions.values()).reduce(
			(total, devices) => total + devices.length,
			0
		);

		const lastSecurityEvent =
			this.events.length > 0 ? this.events[this.events.length - 1].timestamp : undefined;

		return {
			totalLogins,
			failedLogins,
			suspiciousActivities,
			blockedIPs: this.blockedIPs.size,
			activeDevices,
			lastSecurityEvent
		};
	}

	/**
	 * Get recent alerts
	 */
	getRecentAlerts(limit: number = 10): SecurityAlert[] {
		return this.alerts
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
			.slice(0, limit);
	}

	/**
	 * Get events for specific user
	 */
	getUserEvents(userId: string, limit: number = 50): AuthEvent[] {
		return this.events
			.filter((e) => e.userId === userId)
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
			.slice(0, limit);
	}

	cleanup(): void {
		const now = Date.now();
		const cutoffTime = now - 7 * 24 * 60 * 60 * 1000; // 7 days

		// Clean old events
		this.events = this.events.filter((e) => e.timestamp.getTime() > cutoffTime);

		// Clean old alerts
		this.alerts = this.alerts.filter((a) => a.timestamp.getTime() > cutoffTime);

		// Clean expired failure counts
		for (const [key, failure] of this.failureCount.entries()) {
			if (now - failure.lastAttempt > this.LOCKOUT_DURATION) {
				this.failureCount.delete(key);
			}
		}
	}

	/**
	 * Export security report
	 */
	generateSecurityReport(): {
		summary: SecurityMetrics;
		recentAlerts: SecurityAlert[];
		topFailedIPs: Array<{ ip: string; attempts: number }>;
		deviceSummary: Array<{ userId: string; deviceCount: number }>;
	} {
		const summary = this.getSecurityMetrics();
		const recentAlerts = this.getRecentAlerts(20);

		// Analyze failed login attempts by IP
		const ipFailures = new Map<string, number>();
		this.events
			.filter((e) => e.type === 'failed_login' && e.ipAddress)
			.forEach((e) => {
				const count = ipFailures.get(e.ipAddress!) || 0;
				ipFailures.set(e.ipAddress!, count + 1);
			});

		const topFailedIPs = Array.from(ipFailures.entries())
			.map(([ip, attempts]) => ({ ip, attempts }))
			.sort((a, b) => b.attempts - a.attempts)
			.slice(0, 10);

		const deviceSummary = Array.from(this.deviceSessions.entries())
			.map(([userId, devices]) => ({ userId, deviceCount: devices.length }))
			.sort((a, b) => b.deviceCount - a.deviceCount);

		return {
			summary,
			recentAlerts,
			topFailedIPs,
			deviceSummary
		};
	}

	// Private methods
	private analyzeEvent(event: AuthEvent): void {
		// Analyze failed login patterns
		if (event.type === 'failed_login' && event.ipAddress) {
			this.recordFailedAttempt(event.userId || event.ipAddress, event.ipAddress);
		}

		// Clear failures on successful login
		if (event.type === 'login' && event.success && event.userId) {
			this.clearFailedAttempts(event.userId);
			if (event.ipAddress) {
				this.clearFailedAttempts(event.ipAddress);
			}
		}

		// Detect suspicious patterns
		if (event.userId) {
			const recentEvents = this.getRecentEvents(event.userId, 10 * 60 * 1000); // 10 minutes
			const suspiciousCount = recentEvents.filter((e) => !e.success).length;

			if (suspiciousCount >= this.SUSPICIOUS_THRESHOLD) {
				this.createAlert({
					type: 'suspicious_login',
					severity: 'high',
					message: `Suspicious activity detected for user ${event.userId}`,
					userId: event.userId,
					ipAddress: event.ipAddress,
					metadata: { suspiciousEventCount: suspiciousCount }
				});
			}
		}
	}

	private createAlert(alertData: Omit<SecurityAlert, 'id' | 'timestamp'>): void {
		const alert: SecurityAlert = {
			...alertData,
			id: this.generateAlertId(),
			timestamp: new Date()
		};

		this.alerts.push(alert);

		// Keep only recent alerts
		if (this.alerts.length > 500) {
			this.alerts = this.alerts.slice(-500);
		}

		// Log critical alerts — severity tagged in the message so log filters
		// can route on it (we don't have a `fatal` level in this logger).
		if (alert.severity === 'critical') {
			logger.error('SecurityMonitor: CRITICAL alert', alert);
		}
	}

	private getRecentEvents(userId: string, timeWindow: number): AuthEvent[] {
		const cutoff = Date.now() - timeWindow;
		return this.events.filter((e) => e.userId === userId && e.timestamp.getTime() > cutoff);
	}

	private generateEventId(): string {
		return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private generateAlertId(): string {
		return `alt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private persistEvents(): void {
		try {
			const data = {
				events: this.events.slice(-100), // Store only recent events
				alerts: this.alerts.slice(-50), // Store only recent alerts
				timestamp: Date.now()
			};
			sessionStorage.setItem('security_monitor_data', JSON.stringify(data));
		} catch (error) {
			logger.error('SecurityMonitor: failed to persist security data', error);
		}
	}

	private loadPersistedData(): void {
		if (!browser) return;

		try {
			const dataStr = sessionStorage.getItem('security_monitor_data');
			if (dataStr) {
				const data = JSON.parse(dataStr);

				// Only load recent data (within 24 hours)
				const cutoff = Date.now() - 24 * 60 * 60 * 1000;
				if (data.timestamp > cutoff) {
					this.events = data.events.map((e: any) => ({
						...e,
						timestamp: new Date(e.timestamp)
					}));
					this.alerts = data.alerts.map((a: any) => ({
						...a,
						timestamp: new Date(a.timestamp)
					}));
				}
			}
		} catch (error) {
			logger.error('SecurityMonitor: failed to load persisted security data', error);
		}
	}

	// Initialize service
	constructor() {
		this.loadPersistedData();

		// Set up periodic cleanup
		if (browser) {
			setInterval(() => this.cleanup(), 60 * 60 * 1000); // Every hour
		}
	}
}

// Export singleton instance
export const securityMonitor = new SecurityMonitorService();
