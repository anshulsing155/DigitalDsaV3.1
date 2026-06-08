import logger from '../server/logger.js';

/**
 * In-memory storage service (Redis replacement)
 * Provides caching, session storage, and rate limiting using in-memory storage
 */
class InMemoryStorageService {
	private storage = new Map<string, { value: any; expiry?: number }>();
	private connected = true;

	/**
	 * Initialize the service (no-op for in-memory storage)
	 */
	async connect(): Promise<void> {
		logger.info('In-memory storage service initialized');
		this.connected = true;
	}

	/**
	 * Disconnect (cleanup in-memory storage)
	 */
	async disconnect(): Promise<void> {
		this.storage.clear();
		this.connected = false;
		logger.info('In-memory storage cleared');
	}

	/**
	 * Check if service is connected
	 */
	isRedisConnected(): boolean {
		return this.connected;
	}

	/**
	 * Set a key-value pair with optional expiration
	 */
	async set(key: string, value: any, expirationSeconds?: number): Promise<boolean> {
		try {
			const expiry = expirationSeconds ? Date.now() + expirationSeconds * 1000 : undefined;
			this.storage.set(key, { value, expiry });
			return true;
		} catch (error) {
			logger.error({ error, key }, 'Failed to set storage key');
			return false;
		}
	}

	/**
	 * Get a value by key
	 */
	async get(key: string): Promise<any> {
		try {
			const item = this.storage.get(key);
			if (!item) return null;

			// Check if expired
			if (item.expiry && Date.now() > item.expiry) {
				this.storage.delete(key);
				return null;
			}

			return item.value;
		} catch (error) {
			logger.error({ error, key }, 'Failed to get storage key');
			return null;
		}
	}

	/**
	 * Delete a key
	 */
	async del(key: string): Promise<boolean> {
		try {
			return this.storage.delete(key);
		} catch (error) {
			logger.error({ error, key }, 'Failed to delete storage key');
			return false;
		}
	}

	/**
	 * Check if key exists
	 */
	async exists(key: string): Promise<boolean> {
		try {
			const item = this.storage.get(key);
			if (!item) return false;

			// Check if expired
			if (item.expiry && Date.now() > item.expiry) {
				this.storage.delete(key);
				return false;
			}

			return true;
		} catch (error) {
			logger.error({ error, key }, 'Failed to check storage key existence');
			return false;
		}
	}

	/**
	 * Increment a numeric value
	 */
	async incr(key: string): Promise<number> {
		try {
			const current = (await this.get(key)) || 0;
			const newValue = Number(current) + 1;
			await this.set(key, newValue);
			return newValue;
		} catch (error) {
			logger.error({ error, key }, 'Failed to increment storage key');
			return 0;
		}
	}

	/**
	 * Set expiration for a key
	 */
	async expire(key: string, seconds: number): Promise<boolean> {
		try {
			const item = this.storage.get(key);
			if (!item) return false;

			item.expiry = Date.now() + seconds * 1000;
			this.storage.set(key, item);
			return true;
		} catch (error) {
			logger.error({ error, key, seconds }, 'Failed to set storage key expiration');
			return false;
		}
	}

	/**
	 * Get time to live for a key
	 */
	async ttl(key: string): Promise<number> {
		try {
			const item = this.storage.get(key);
			if (!item) return -2; // Key doesn't exist
			if (!item.expiry) return -1; // Key exists but has no expiry

			const remaining = Math.ceil((item.expiry - Date.now()) / 1000);
			return remaining > 0 ? remaining : -2;
		} catch (error) {
			logger.error({ error, key }, 'Failed to get storage key TTL');
			return -2;
		}
	}

	/**
	 * Rate limiting functionality
	 */
	async checkRateLimit(
		identifier: string,
		limit: number,
		windowMs: number
	): Promise<{
		allowed: boolean;
		remaining: number;
		resetTime: number;
		totalHits: number;
	}> {
		try {
			const key = `rate_limit:${identifier}`;
			const now = Date.now();
			const windowStart = now - windowMs;

			// Get current hits data
			const hitsData = (await this.get(key)) || { hits: [], count: 0 };

			// Filter out old hits outside the window
			const validHits = hitsData.hits.filter((timestamp: number) => timestamp > windowStart);

			// Add current hit
			validHits.push(now);

			// Update storage
			const newData = { hits: validHits, count: validHits.length };
			await this.set(key, newData, Math.ceil(windowMs / 1000));

			const allowed = validHits.length <= limit;
			const remaining = Math.max(0, limit - validHits.length);
			const resetTime = now + windowMs;

			return {
				allowed,
				remaining,
				resetTime,
				totalHits: validHits.length
			};
		} catch (error) {
			logger.error({ error, identifier }, 'Rate limiting failed');
			// Fail open - allow request if rate limiting fails
			return {
				allowed: true,
				remaining: limit,
				resetTime: Date.now() + windowMs,
				totalHits: 0
			};
		}
	}

	/**
	 * Health check for the service
	 */
	async healthCheck(): Promise<{
		status: 'healthy' | 'unhealthy';
		responseTime?: number;
		connected: boolean;
		error?: string;
	}> {
		try {
			const start = Date.now();

			// Test basic operations
			const testKey = 'health_check_test';
			await this.set(testKey, 'test_value', 1);
			const value = await this.get(testKey);
			await this.del(testKey);

			const responseTime = Date.now() - start;

			if (value === 'test_value') {
				return {
					status: 'healthy',
					responseTime,
					connected: this.connected
				};
			} else {
				return {
					status: 'unhealthy',
					connected: this.connected,
					error: 'Health check test failed'
				};
			}
		} catch (error) {
			logger.error({ error }, 'Storage health check failed');
			return {
				status: 'unhealthy',
				connected: this.connected,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Clean up expired keys (maintenance function)
	 */
	cleanupExpired(): void {
		const now = Date.now();
		for (const [key, item] of this.storage.entries()) {
			if (item.expiry && now > item.expiry) {
				this.storage.delete(key);
			}
		}
	}

	/**
	 * Get storage statistics
	 */
	getStats(): { totalKeys: number; expiredKeys: number } {
		const now = Date.now();
		let expiredKeys = 0;

		for (const [, item] of this.storage.entries()) {
			if (item.expiry && now > item.expiry) {
				expiredKeys++;
			}
		}

		return {
			totalKeys: this.storage.size,
			expiredKeys
		};
	}
}

// Export singleton instance
export const redisService = new InMemoryStorageService();

// Start periodic cleanup of expired keys
if (typeof setInterval !== 'undefined') {
	setInterval(() => {
		redisService.cleanupExpired();
	}, 60000); // Clean up every minute
}
