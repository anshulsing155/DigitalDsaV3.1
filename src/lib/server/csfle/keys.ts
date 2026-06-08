/**
 * CSFLE — Data Encryption Key (DEK) registry.
 *
 * One DEK per logical PII field. Each DEK lives in the key vault collection
 * (encryption.__keyVault by default) and is referenced by `keyAltName`. The
 * application code never sees the raw DEK — it asks the ClientEncryption
 * instance to encrypt/decrypt by keyAltName, and the driver resolves the DEK.
 *
 * Algorithm choice per key:
 *   - Deterministic — same input always produces the same ciphertext. Allows
 *     equality queries (e.g. findOne({ mobileNumber: '9876543210' })) and
 *     unique-index enforcement. Slight information leak: two records with the
 *     same plaintext have identical ciphertext.
 *   - Random — same input produces different ciphertext each time. Strongest
 *     security; cannot be queried by value, cannot enforce uniqueness.
 *
 * See docs/specs/SEC-2-CSFLE-PLAN.md §3 (field inventory) for the rationale
 * behind each choice. Adding a new logical key requires (a) appending to
 * CSFLE_KEYS below, (b) re-running scripts/sec2-init-deks.ts to create the
 * DEK in the key vault.
 */

export const DETERMINISTIC = 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic';
export const RANDOM = 'AEAD_AES_256_CBC_HMAC_SHA_512-Random';

export type CsfleAlgorithm = typeof DETERMINISTIC | typeof RANDOM;

export interface CsfleKeyDef {
	/** keyAltName used in encrypt() calls. Stable across the codebase. */
	keyAltName: string;
	algorithm: CsfleAlgorithm;
	/** One-line note on what this key protects — for the audit trail. */
	purpose: string;
}

/**
 * The canonical DEK registry. The init script creates every key listed here
 * in the key vault if absent. Never remove an entry — once data is encrypted
 * with a DEK, that DEK must remain available to decrypt it. To retire a key,
 * mark it deprecated and stop using it for new writes.
 */
export const CSFLE_KEYS: readonly CsfleKeyDef[] = [
	// Equality-queryable identifiers (login/duplicate-check lookups)
	{ keyAltName: 'mobile-key', algorithm: DETERMINISTIC, purpose: 'Mobile numbers — login + duplicate-check' },
	{ keyAltName: 'email-key', algorithm: DETERMINISTIC, purpose: 'Email addresses — login + duplicate-check' },
	{ keyAltName: 'pan-key', algorithm: DETERMINISTIC, purpose: 'PAN numbers — duplicate-check' },
	{ keyAltName: 'rm-official-email-key', algorithm: DETERMINISTIC, purpose: 'RM bank email — identity lookup' },

	// Non-queryable identifiers (stronger algorithm; never searched by value)
	{ keyAltName: 'name-key', algorithm: RANDOM, purpose: 'Full / first / middle / last names across all collections' },
	{ keyAltName: 'aadhaar-key', algorithm: RANDOM, purpose: 'Aadhaar numbers' },
	{ keyAltName: 'dob-key', algorithm: RANDOM, purpose: 'Date of birth' },
	{ keyAltName: 'address-key', algorithm: RANDOM, purpose: 'Current + permanent addresses' },
	{ keyAltName: 'gst-key', algorithm: RANDOM, purpose: 'GST numbers' },

	// Phase C.2: document-level payload encryption. The entire
	// formSnapshots.payload JSON blob is serialized + encrypted as one
	// Binary value. Random algorithm: payload is never queried by value
	// (every consumer fetches by case_id + version, then reads payload
	// fields client-side). Dedicated key — the payload contains more
	// than names, so reusing name-key would be semantically wrong and
	// would entangle rotation lifecycles.
	{ keyAltName: 'payload-key', algorithm: RANDOM, purpose: 'formSnapshots.payload JSON blob (document-level encryption)' }
] as const;

/** Look up a key definition by keyAltName. Throws if unknown — fails fast. */
export function getKeyDef(keyAltName: string): CsfleKeyDef {
	const def = CSFLE_KEYS.find((k) => k.keyAltName === keyAltName);
	if (!def) {
		throw new Error(`[csfle] unknown keyAltName: ${keyAltName} — add to CSFLE_KEYS in keys.ts`);
	}
	return def;
}
