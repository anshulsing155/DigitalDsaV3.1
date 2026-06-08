import { redisService } from '../services/redisService.js';
import logger from './logger.js';

// Rate limiting configuration
const DEFAULT_RATE_LIMIT = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10');
const DEFAULT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'); // 1 minute

// In-memory fallback for when Redis is unavailable
const ipBuckets: Record<string, { count: number; windowStart: number }> = {};

// Periodic cleanup of expired in-memory rate limit entries to prevent unbounded growth.
// Runs every 5 minutes, removes entries whose window has expired.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_WINDOW_MS = 10 * 60 * 1000; // Assume no window exceeds 10 minutes

setInterval(() => {
	const now = Date.now();
	let removed = 0;
	for (const key of Object.keys(ipBuckets)) {
		if (now - ipBuckets[key].windowStart > MAX_WINDOW_MS) {
			delete ipBuckets[key];
			removed++;
		}
	}
	if (removed > 0) {
		logger.debug({ removed, remaining: Object.keys(ipBuckets).length }, 'Rate limiter cleanup');
	}
}, CLEANUP_INTERVAL_MS).unref(); // unref() so the timer doesn't prevent Node.js from exiting

/**
 * Enhanced rate limiter with Redis support and in-memory fallback
 * @param ip - Client IP address
 * @param options - Rate limiting options
 * @returns true if rate limited, false if allowed
 */
export async function rateLimit(
	ip: string,
	options: {
		maxRequests?: number;
		windowMs?: number;
		identifier?: string;
	} = {}
): Promise<boolean> {
	const maxRequests = options.maxRequests || DEFAULT_RATE_LIMIT;
	const windowMs = options.windowMs || DEFAULT_WINDOW_MS;
	const identifier = options.identifier || ip;

	try {
		// Use in-memory storage service for rate limiting
		const result = await redisService.checkRateLimit(identifier, maxRequests, windowMs);

		if (!result.allowed) {
			logger.warn(
				{
					ip,
					identifier,
					remaining: result.remaining,
					resetTime: new Date(result.resetTime)
				},
				'Rate limit exceeded'
			);
		}

		return !result.allowed;
	} catch (error) {
		logger.error({ error, ip }, 'Rate limiting failed, falling back to in-memory');
		// Fallback to in-memory rate limiting
		return inMemoryRateLimit(identifier, maxRequests, windowMs);
	}
}

/**
 * In-memory rate limiter fallback
 * @param identifier - Unique identifier (usually IP)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if rate limited, false if allowed
 */
function inMemoryRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
	const now = Date.now();

	// Window expired or first request — start a fresh window
	if (!ipBuckets[identifier] || now - ipBuckets[identifier].windowStart > windowMs) {
		ipBuckets[identifier] = { count: 1, windowStart: now };
		return false; // not rate limited
	}

	// Within existing window — increment count but do NOT slide windowStart
	ipBuckets[identifier].count++;

	if (ipBuckets[identifier].count > maxRequests) {
		logger.warn(
			{
				identifier,
				count: ipBuckets[identifier].count,
				maxRequests
			},
			'Rate limit exceeded (in-memory)'
		);
		return true; // rate limited
	}

	return false;
}

/**
 * Synchronous rate limiter for backward compatibility
 * @param ip - Client IP address
 * @returns true if rate limited, false if allowed
 */
export function rateLimitSync(ip: string): boolean {
	return inMemoryRateLimit(ip, DEFAULT_RATE_LIMIT, DEFAULT_WINDOW_MS);
}

/**
 * Get rate limit status for an identifier
 * @param identifier - Unique identifier
 * @returns Rate limit information
 */
export async function getRateLimitStatus(identifier: string): Promise<{
	allowed: boolean;
	remaining: number;
	resetTime: number;
	total: number;
}> {
	const maxRequests = DEFAULT_RATE_LIMIT;
	const windowMs = DEFAULT_WINDOW_MS;

	try {
		const result = await redisService.checkRateLimit(identifier, maxRequests, windowMs);

		return {
			allowed: result.allowed,
			remaining: result.remaining,
			resetTime: result.resetTime,
			total: maxRequests
		};
	} catch (error) {
		logger.error({ error, identifier }, 'Failed to get rate limit status from storage');
	}

	// Fallback to in-memory status
	const bucket = ipBuckets[identifier];
	const now = Date.now();

	if (!bucket || now - bucket.windowStart > windowMs) {
		return {
			allowed: true,
			remaining: maxRequests,
			resetTime: now + windowMs,
			total: maxRequests
		};
	}

	const remaining = Math.max(0, maxRequests - bucket.count);
	return {
		allowed: bucket.count <= maxRequests,
		remaining,
		resetTime: bucket.windowStart + windowMs,
		total: maxRequests
	};
}

/**
 * Clear rate limit for an identifier (admin function)
 * @param identifier - Unique identifier to clear
 */
export async function clearRateLimit(identifier: string): Promise<void> {
	try {
		await redisService.del(`rate_limit:${identifier}`);
	} catch (error) {
		logger.error({ error, identifier }, 'Failed to clear rate limit from storage');
	}

	// Also clear from in-memory fallback
	delete ipBuckets[identifier];

	logger.info({ identifier }, 'Rate limit cleared');
}
