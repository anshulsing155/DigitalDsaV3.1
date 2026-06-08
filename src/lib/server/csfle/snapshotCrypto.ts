/**
 * SEC-2 Phase C.2 — formSnapshots.payload document-level encryption.
 *
 * Encrypts the entire `payload` JSON blob as one Binary value using the
 * dedicated `payload-key` (random algorithm). One encrypt/decrypt call
 * per snapshot — no per-field walker, no path registry to maintain.
 *
 * Why this design (Approach B per the plan):
 *   - Payload is structurally nested (applicants[].coBorrowers[].fullName,
 *     directors[].companyName, etc.) — per-field encryption would need a
 *     path registry that would drift as the form evolves.
 *   - Payload is NEVER queried by value (grep audit 2026-05-19 confirmed
 *     every consumer fetches by case_id + version then reads fields
 *     client-side). So random-algorithm is fine — no need for determinism.
 *   - payload_hash continues to be computed over the plaintext payload
 *     BEFORE encryption. Read path verifies the hash AFTER decryption.
 *     Tampering of either the ciphertext OR a tampered plaintext (e.g.
 *     via a future migration mistake) fails the hash check.
 *
 * Passthrough mode:
 *   - When CSFLE is disabled, `encryptSnapshotPayload` returns null and
 *     `decryptSnapshotPayload` is a no-op on null inputs.
 *   - Callers should always populate `payload` (plaintext) and OPTIONALLY
 *     populate `payload_encrypted` (when encryption is active). The
 *     `resolveSnapshotPayload` reader prefers encrypted over plaintext.
 *
 * Reference: docs/specs/SEC-2-PHASE-C-PLAN.md §4.4 (Approach B).
 */

import { Binary } from 'mongodb';
import { encryptValue, decryptValue, isEncryptedBinary } from './helpers.js';
import { MongoClientInstance } from '$lib/database/mongo.js';
import { env } from '$env/dynamic/private';

const PAYLOAD_KEY_ALT_NAME = 'payload-key';

/**
 * Encrypt a payload object for storage in `payload_encrypted`.
 *
 * - When CSFLE is disabled, returns `null` — the caller should set
 *   `payload_encrypted: null` on the document, leaving plaintext
 *   `payload` as the sole source of truth.
 * - When CSFLE is enabled, JSON.stringify the payload then encrypt the
 *   resulting string with the payload-key random DEK. Returns the
 *   encrypted Binary (BSON subtype 6).
 *
 * Throws if CSFLE is enabled but the encryption provider can't be
 * initialized — fail-loud, never silently fall back to plaintext.
 */
export async function encryptSnapshotPayload(
	payload: Record<string, unknown>
): Promise<unknown | null> {
	if (env.CSFLE_ENABLED !== 'true') return null;
	const serialized = JSON.stringify(payload);
	return await encryptValue(MongoClientInstance, serialized, PAYLOAD_KEY_ALT_NAME);
}

/**
 * Decrypt a previously-encrypted payload back to a plain object.
 *
 * - When CSFLE is disabled OR the input is null/undefined, returns null.
 *   Caller should fall through to plaintext `payload`.
 * - When the input is encrypted Binary, decrypt to string then JSON.parse.
 *
 * Throws on:
 *   - Malformed ciphertext (decryptValue throws).
 *   - Invalid JSON after decrypt (corruption or wrong key — should never
 *     happen under correct DEK rotation).
 *
 * Both throw cases are fail-loud — silently falling back to plaintext
 * would hide a serious key-management issue.
 */
export async function decryptSnapshotPayload(
	encrypted: unknown | null | undefined
): Promise<Record<string, unknown> | null> {
	if (encrypted === null || encrypted === undefined) return null;
	if (env.CSFLE_ENABLED !== 'true') {
		// CSFLE disabled but the field is set — this means the row was
		// written when encryption WAS active and someone is trying to
		// read it back without the provider. Fail loud.
		if (isEncryptedBinary(encrypted)) {
			throw new Error(
				'[snapshotCrypto] payload_encrypted is ciphertext but CSFLE_ENABLED is unset — cannot decrypt'
			);
		}
		return null;
	}
	const serialized = await decryptValue(MongoClientInstance, encrypted as Binary);
	if (typeof serialized !== 'string') {
		throw new Error(
			'[snapshotCrypto] decrypted payload was not a string — DEK or storage corruption'
		);
	}
	return JSON.parse(serialized) as Record<string, unknown>;
}

/**
 * Read helper — single entry point for snapshot consumers. Prefer the
 * encrypted payload when present; fall through to the plaintext
 * `payload` field for un-backfilled rows. After Phase C.2 cutover
 * completes (plaintext field dropped), all reads return the decrypted
 * encrypted form.
 *
 * Use this at every read site rather than reaching into `snapshot.payload`
 * directly. That way, the eventual cleanup migration that drops the
 * plaintext field is a one-line config change — read sites stay stable.
 *
 * @example
 * const snapshot = await FormSnapshots.findOne({ case_id, version });
 * if (!snapshot) return null;
 * const payload = await resolveSnapshotPayload(snapshot);
 */
export async function resolveSnapshotPayload(snapshot: {
	payload?: Record<string, unknown> | null;
	payload_encrypted?: unknown | null;
}): Promise<Record<string, unknown> | null> {
	if (snapshot.payload_encrypted !== null && snapshot.payload_encrypted !== undefined) {
		const decrypted = await decryptSnapshotPayload(snapshot.payload_encrypted);
		if (decrypted !== null) return decrypted;
	}
	return snapshot.payload ?? null;
}
