/**
 * DATA-2 — Mobile-number hash for revocation-token input.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * The revocation token binds to a HASH of the customer's mobile, not the raw
 * mobile. Two reasons:
 *   1. Defense in depth — if a revocation token were ever leaked to logs (it
 *      shouldn't be — middleware redaction in CLAUDE.md §15), recomputing the
 *      original mobile would require breaking SHA-256.
 *   2. The token-generation function takes deterministic inputs; we have the
 *      plaintext mobile only briefly at vault-write time, but we need the
 *      same input at verify time (when the public revoke endpoint looks up
 *      by token). Storing the hash on the vault entry gives us a stable
 *      verify input without re-decrypting the CSFLE mobile field.
 *
 * The hash is plain SHA-256 (no pepper). The HMAC's own pepper provides the
 * unforgeability; the hash here is just a deterministic transform of input.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from 'node:crypto';

/** Normalize + hash a mobile number for use as a revocation-token input. */
export function mobileHashForToken(mobile: string): string {
	// Normalize: strip whitespace + leading + or 91 country code so the same
	// number entered as "+91 98765 43210" or "919876543210" or "9876543210"
	// always hashes to the same value.
	const normalized = String(mobile)
		.replace(/\s+/g, '')
		.replace(/^\+?91/, '')
		.replace(/^0/, '');
	return createHash('sha256').update(normalized).digest('hex');
}
