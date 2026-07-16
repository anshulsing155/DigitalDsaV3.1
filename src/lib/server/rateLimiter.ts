import logger from './logger.js';

const DEFAULT_RATE_LIMIT = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10');
const DEFAULT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'); // 1 minute

const ipBuckets: Record<string, { count: number; windowStart: number }> = {};

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_WINDOW_MS = 10 * 60 * 1000;

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
		logger.debug(`[RateLimiter] Cleaned up ${removed} expired rate limit buckets.`);
	}
}, CLEANUP_INTERVAL_MS).unref();

function inMemoryRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
	const now = Date.now();

	if (!ipBuckets[identifier] || now - ipBuckets[identifier].windowStart > windowMs) {
		ipBuckets[identifier] = { count: 1, windowStart: now };
		return false;
	}

	ipBuckets[identifier].count++;
	return ipBuckets[identifier].count > maxRequests;
}

export async function rateLimit(
	ip: string,
	options: {
		maxRequests?: number;
		windowMs?: number;
		identifier?: string;
	} = {}
): Promise<boolean> {
	const maxRequests = options.maxRequests ?? DEFAULT_RATE_LIMIT;
	const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
	const identifier = options.identifier ?? ip;
	return inMemoryRateLimit(identifier, maxRequests, windowMs);
}

export function rateLimitSync(ip: string): boolean {
	return inMemoryRateLimit(ip, DEFAULT_RATE_LIMIT, DEFAULT_WINDOW_MS);
}

export async function getRateLimitStatus(identifier: string): Promise<{
	allowed: boolean;
	remaining: number;
	resetTime: number;
	total: number;
}> {
	const maxRequests = DEFAULT_RATE_LIMIT;
	const windowMs = DEFAULT_WINDOW_MS;
	const bucket = ipBuckets[identifier];
	const now = Date.now();

	if (!bucket || now - bucket.windowStart > windowMs) {
		return { allowed: true, remaining: maxRequests, resetTime: now + windowMs, total: maxRequests };
	}

	const remaining = Math.max(0, maxRequests - bucket.count);
	return {
		allowed: bucket.count <= maxRequests,
		remaining,
		resetTime: bucket.windowStart + windowMs,
		total: maxRequests
	};
}

export async function clearRateLimit(identifier: string): Promise<void> {
	delete ipBuckets[identifier];
}
