/**
 * CSRF Token Utility — native crypto replacement for the deprecated `csrf` package.
 *
 * Uses HMAC-SHA256 (stronger than the old package's SHA1) with a random salt.
 * Token format: `{salt}-{hmac}` where salt is 16 random hex bytes.
 *
 * Zero external dependencies — Node.js crypto only.
 */
import crypto from 'crypto';

/**
 * Create a CSRF token bound to the given secret.
 * Each call produces a unique token (different random salt).
 */
export function createCsrfToken(secret: string): string {
	const salt = crypto.randomBytes(16).toString('hex');
	const hmac = crypto.createHmac('sha256', secret).update(salt).digest('hex');
	return `${salt}-${hmac}`;
}

/**
 * Verify a CSRF token against the secret it was created with.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyCsrfToken(secret: string, token: string): boolean {
	if (!token || typeof token !== 'string') return false;

	const separatorIndex = token.indexOf('-');
	if (separatorIndex === -1) return false;

	const salt = token.slice(0, separatorIndex);
	const providedHmac = token.slice(separatorIndex + 1);

	// Salt must be 32 hex chars (16 bytes), HMAC must be 64 hex chars (32 bytes SHA-256)
	if (salt.length !== 32 || providedHmac.length !== 64) return false;

	const expectedHmac = crypto.createHmac('sha256', secret).update(salt).digest('hex');

	try {
		return crypto.timingSafeEqual(
			Buffer.from(providedHmac, 'hex'),
			Buffer.from(expectedHmac, 'hex')
		);
	} catch {
		// Buffer length mismatch (shouldn't happen with length checks above, but be safe)
		return false;
	}
}
