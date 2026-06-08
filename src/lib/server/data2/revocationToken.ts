/**
 * DATA-2 — Revocation-token HMAC helpers.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md §3 (revocation channel) + §9 (self-revoke flow).
 *
 * Every vault entry carries a `revocation_token` — a non-guessable string
 * embedded in the case PDF footer. When a customer clicks the link in
 * the PDF, they hit a public (unauthenticated) endpoint that verifies
 * the token and performs the revocation. The token itself IS the auth
 * factor; no OTP, no account, no login.
 *
 * The token is an HMAC-SHA256 over `(vault_entry_id, dsa_id,
 * mobile_hash)` using a server-side secret pepper. Properties:
 *   - Deterministic: same inputs → same token (so we can recompute and
 *     compare, no need to store the secret part of the token in Mongo
 *     beyond the token string itself).
 *   - Non-guessable: 32 hex chars of entropy → infeasible to brute force.
 *   - Tamper-evident: changing any input changes the token; we compare
 *     in constant time to prevent timing attacks.
 *
 * The pepper lives in an env var (`DATA2_TOKEN_PEPPER`) — separate from
 * any other pepper in the system so a compromise of one secret doesn't
 * compromise revocation tokens.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const TOKEN_LENGTH_HEX = 32; // 32 hex chars = 16 bytes of HMAC output

/**
 * Read the pepper from env. Throws if missing — refusing to mint or
 * verify tokens without it is the safest default. The env var is set
 * in `.env.local` (dev) and Vercel secrets (production).
 */
function getPepper(): string {
	const pepper = process.env.DATA2_TOKEN_PEPPER;
	if (!pepper || pepper.length < 32) {
		throw new Error(
			'[data2] DATA2_TOKEN_PEPPER is not set or too short (need ≥ 32 chars). ' +
				'Generate with `openssl rand -hex 32`.'
		);
	}
	return pepper;
}

/**
 * The set of inputs the token binds to. Changing any of these changes
 * the token, so a token captured from one entry cannot be replayed
 * against another.
 */
export interface RevocationTokenInputs {
	vault_entry_id: string; // ObjectId.toString()
	dsa_id: string; // ObjectId.toString()
	mobile_hash: string; // SHA-256 of the customer mobile (not the raw mobile)
}

/**
 * Generate the revocation token for the inputs. Same inputs always
 * produce the same token — call this at vault entry creation and store
 * the result on the entry's `revocation_token` field.
 *
 * Why we store the token rather than recomputing on every verify:
 *   - The mobile_hash input would have to be recomputed at verify time
 *     from the encrypted mobile field — adds CSFLE decrypt cost to every
 *     unauthenticated request. Storing the token lets us look up the
 *     entry by token-equality first, then verify the HMAC against the
 *     found entry's other fields.
 */
export function generateRevocationToken(inputs: RevocationTokenInputs): string {
	const pepper = getPepper();
	const message = `${inputs.vault_entry_id}|${inputs.dsa_id}|${inputs.mobile_hash}`;
	return createHmac('sha256', pepper).update(message).digest('hex').slice(0, TOKEN_LENGTH_HEX);
}

/**
 * Verify a token against the inputs it should encode. Returns true iff
 * the recomputed token matches the supplied one in constant time.
 *
 * Typical use: the public revoke endpoint receives `{ token }`, looks
 * up the vault entry by token-equality, recomputes the expected token
 * from the found entry's fields, and calls this to confirm.
 */
export function verifyRevocationToken(
	suppliedToken: string,
	expectedInputs: RevocationTokenInputs
): boolean {
	if (typeof suppliedToken !== 'string' || suppliedToken.length !== TOKEN_LENGTH_HEX) {
		return false;
	}
	let expectedToken: string;
	try {
		expectedToken = generateRevocationToken(expectedInputs);
	} catch {
		// Pepper missing or malformed — fail closed.
		return false;
	}
	// Constant-time comparison so timing differences can't leak which
	// part of the token diverged.
	const a = Buffer.from(suppliedToken, 'utf8');
	const b = Buffer.from(expectedToken, 'utf8');
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
