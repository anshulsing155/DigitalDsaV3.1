/**
 * CSFLE — Encrypt / decrypt helpers.
 *
 * Thin wrappers around the ClientEncryption singleton that:
 *   - resolve the algorithm from the keyAltName (via the CSFLE_KEYS registry)
 *   - pass through plaintext when CSFLE is disabled (migration safety)
 *   - pass through already-encrypted Binary values on the read path (Phase B
 *     window when some rows are encrypted and others are not)
 *
 * Per-collection helpers (encryptDsa, decryptDsa, etc.) will be built on top
 * of these in Phase B. Phase A only ships the primitives.
 *
 * Reference: docs/specs/SEC-2-CSFLE-PLAN.md §4
 */

import type { MongoClient } from 'mongodb';
import { Binary } from 'mongodb';
import { getClientEncryption } from './client.js';
import { getKeyDef } from './keys.js';

/**
 * Encrypt a plaintext value using the named DEK.
 *
 * If CSFLE is disabled (CSFLE_ENABLED !== 'true'), returns the input
 * unchanged. This lets callers wire encryption into routes safely during
 * the Phase A/B/C migration — turn the flag on when DEKs exist and the
 * helpers are ready.
 *
 * @param mongoClient The unencrypted MongoDB client.
 * @param plaintext The value to encrypt (any BSON-serializable type).
 * @param keyAltName One of CSFLE_KEYS — see keys.ts.
 * @returns The encrypted Binary subtype 6, or the plaintext if disabled.
 */
export async function encryptValue<T>(
	mongoClient: MongoClient,
	plaintext: T,
	keyAltName: string
): Promise<T | Binary> {
	if (plaintext === null || plaintext === undefined) return plaintext;

	const ce = getClientEncryption(mongoClient);
	if (!ce) return plaintext;

	const { algorithm } = getKeyDef(keyAltName);
	const encrypted = await ce.encrypt(plaintext, {
		keyAltName,
		algorithm
	});
	return encrypted;
}

/**
 * Decrypt a value if it is a Binary subtype 6 (CSFLE ciphertext). Returns
 * the input unchanged for any other type — this is the passthrough behavior
 * needed during the Phase B/C migration window where some rows are still
 * plaintext.
 *
 * @param mongoClient The unencrypted MongoDB client.
 * @param value The (possibly encrypted) value to decrypt.
 * @returns Plaintext value, or the input unchanged if not encrypted.
 */
export async function decryptValue<T>(
	mongoClient: MongoClient,
	value: T | Binary
): Promise<T> {
	if (value === null || value === undefined) return value as T;
	if (!isEncryptedBinary(value)) return value as T;

	const ce = getClientEncryption(mongoClient);
	if (!ce) {
		// CSFLE disabled but we hit ciphertext — fail loudly. Reading
		// ciphertext without the ability to decrypt is a configuration
		// error, not something to silently pass through.
		throw new Error(
			'[csfle] encountered encrypted value but CSFLE_ENABLED is not "true" — refusing to return ciphertext'
		);
	}

	return (await ce.decrypt(value)) as T;
}

/**
 * Type guard: BSON Binary with subtype 6 (CSFLE ciphertext).
 * Used by decryptValue() and by per-collection helpers that walk objects.
 */
export function isEncryptedBinary(v: unknown): v is Binary {
	return v instanceof Binary && (v as Binary).sub_type === 6;
}
