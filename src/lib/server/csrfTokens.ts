import crypto from 'crypto';

/**
 * Creates a signed CSRF token using HMAC-SHA256
 */
export function createCsrfToken(secret: string): string {
	const salt = crypto.randomBytes(8).toString('hex');
	const hmac = crypto.createHmac('sha256', secret);
	hmac.update(salt);
	return `${salt}.${hmac.digest('hex')}`;
}

/**
 * Verifies a signed CSRF token against the secret
 */
export function verifyCsrfToken(secret: string, token: string): boolean {
	try {
		if (!token) return false;
		const parts = token.split('.');
		if (parts.length !== 2) return false;
		const [salt, hash] = parts;
		const hmac = crypto.createHmac('sha256', secret);
		hmac.update(salt);
		const expectedHash = hmac.digest('hex');
		
		// Timing-safe comparison to prevent timing attacks
		return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
	} catch {
		return false;
	}
}
