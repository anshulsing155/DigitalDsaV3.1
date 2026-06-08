/**
 * ShowWhen XOR Decoder
 *
 * In production, the server XOR-encodes showWhen conditions using the
 * sessionId as key, then base64-encodes the result. This module decodes
 * them back to the original ShowWhenCondition objects.
 *
 * In dev mode, showWhen conditions are sent as plain objects — the
 * decode function passes them through unchanged.
 */

/**
 * Decode a XOR-ciphered showWhen condition using the session ID.
 * If the input is already an object (dev mode), returns it as-is.
 */
export function decodeShowWhen(encoded: unknown, sessionId: string | undefined): unknown {
	// Dev mode: conditions are already plain objects
	if (typeof encoded !== 'string') return encoded;
	if (!sessionId) return encoded;

	try {
		const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
		const keyBytes = new TextEncoder().encode(sessionId);
		const result = new Uint8Array(bytes.length);
		for (let i = 0; i < bytes.length; i++) {
			result[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
		}
		return JSON.parse(new TextDecoder().decode(result));
	} catch {
		// If decode fails (malformed data), return null so shouldShow treats as "always visible"
		return null;
	}
}
