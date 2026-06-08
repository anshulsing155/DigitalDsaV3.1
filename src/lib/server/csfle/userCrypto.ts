/**
 * CSFLE — Per-collection encrypt/decrypt helpers for user collections.
 *
 * Covers the four collections that hold individual-identity PII:
 *   - Applicant         (userApplications)
 *   - DsaApplications
 *   - rmApplications
 *   - AdminUsers
 *
 * The encrypted-field set per collection:
 *
 *   | Field          | Algorithm        | Why                                |
 *   |----------------|------------------|-------------------------------------|
 *   | mobileNumber   | deterministic    | Login + duplicate-check lookups    |
 *   | email          | deterministic    | Login + duplicate-check lookups    |
 *   | panNumber      | deterministic    | Duplicate-check lookups            |
 *   | rmOfficialEmail| deterministic    | RM bank-identity lookups           |
 *   | name (any)     | random           | Display only; never queried        |
 *   | aadhaarNumber  | random           | Never queried                       |
 *   | dateOfBirth    | random           | Never queried                       |
 *   | gstNumber      | random           | Rarely queried by value             |
 *
 * Type normalization rule:
 *   `mobileNumber` is stored historically as both `number` and `string`.
 *   CSFLE deterministic encryption is type-sensitive (encrypt(int) !=
 *   encrypt(str) for the same digits). We standardize on STRING at the
 *   encryption boundary — `encryptUserMobile(123)` and
 *   `encryptUserMobile('123')` produce the same ciphertext.
 *
 * Migration safety:
 *   `findUserByMobile()` tries the encrypted-string query first (matches
 *   new rows), then falls back to the legacy `$in: [string, number]` dual
 *   query (matches plaintext rows). After backfill completes the fallback
 *   becomes dead code but doesn't break anything.
 *
 * Reference: docs/specs/SEC-2-CSFLE-PLAN.md
 */

import type { Collection, Document, WithId } from 'mongodb';
import { MongoClientInstance } from '$lib/database/mongo.js';
import { encryptValue, decryptValue, isEncryptedBinary } from './helpers.js';

// ── Field keys: which logical DEK encrypts each field ──────────────────

const FIELD_KEY_DETERMINISTIC: Record<string, string> = {
	mobileNumber: 'mobile-key',
	email: 'email-key',
	panNumber: 'pan-key',
	rmOfficialEmail: 'rm-official-email-key'
};

const FIELD_KEY_RANDOM: Record<string, string> = {
	name: 'name-key',
	fullName: 'name-key',
	firstName: 'name-key',
	middleName: 'name-key',
	lastName: 'name-key',
	aadhaarNumber: 'aadhaar-key',
	dateOfBirth: 'dob-key',
	currentAddress: 'address-key',
	permanentAddress: 'address-key',
	gstNumber: 'gst-key'
};

const ALL_ENCRYPTED_FIELDS = new Set<string>([
	...Object.keys(FIELD_KEY_DETERMINISTIC),
	...Object.keys(FIELD_KEY_RANDOM)
]);

// ── Encrypt a complete user document before insertOne / replaceOne ──

/**
 * Walks `doc` and replaces every recognized PII field value with its
 * encrypted ciphertext. Fields not in the encrypted-field registry are
 * passed through unchanged. Numbers in `mobileNumber` are coerced to
 * string before encryption (type normalization).
 *
 * Safe to call when CSFLE is disabled — helpers passthrough.
 * Idempotent — values that are already encrypted Binary subtype 6 are
 * passed through without re-encrypting (don't double-encrypt).
 */
export async function encryptUserPii<T extends object>(
	doc: T
): Promise<T> {
	const out: Record<string, unknown> = { ...(doc as Record<string, unknown>) };

	for (const [field, value] of Object.entries(doc as Record<string, unknown>)) {
		if (value === null || value === undefined) continue;
		if (isEncryptedBinary(value)) continue;

		if (FIELD_KEY_DETERMINISTIC[field]) {
			const normalized = field === 'mobileNumber' ? String(value) : value;
			out[field] = await encryptValue(
				MongoClientInstance,
				normalized,
				FIELD_KEY_DETERMINISTIC[field]
			);
		} else if (FIELD_KEY_RANDOM[field]) {
			out[field] = await encryptValue(MongoClientInstance, value, FIELD_KEY_RANDOM[field]);
		}
	}

	return out as T;
}

// ── Backfill helper — encrypt ONLY the changed fields ──

/**
 * Compute the `$set` patch needed to bring a plaintext row to ciphertext.
 * Returns an object of just the fields that need to change (i.e., the
 * registered PII fields that are currently plaintext) — empty/null fields
 * are skipped, and fields already stored as encrypted Binary(subtype=6)
 * are passed over without re-encryption.
 *
 * Returns `null` when the row needs no updates (every PII field is either
 * missing, null, or already encrypted). Letting the caller skip the
 * `updateOne` entirely is the per-row idempotency guarantee — running
 * the backfill a second time on an already-converted collection is a
 * no-op modulo MongoDB pagination cost.
 *
 * This is the backfill counterpart to `encryptUserPii()`. The difference:
 *   - `encryptUserPii` walks the doc and returns the FULL re-encrypted
 *     doc, suitable for insertOne / replaceOne paths.
 *   - `computeBackfillPatch` walks the doc and returns ONLY the changed
 *     fields, suitable for `updateOne({_id}, {$set: patch})` — preserves
 *     the rest of the doc's existing state untouched, including fields
 *     that don't appear in the PII registry.
 */
export async function computeBackfillPatch<T extends object>(
	doc: T
): Promise<Record<string, unknown> | null> {
	const src = doc as Record<string, unknown>;
	const patch: Record<string, unknown> = {};

	for (const [field, value] of Object.entries(src)) {
		if (value === null || value === undefined) continue;
		if (isEncryptedBinary(value)) continue;

		if (FIELD_KEY_DETERMINISTIC[field]) {
			const normalized = field === 'mobileNumber' ? String(value) : value;
			patch[field] = await encryptValue(
				MongoClientInstance,
				normalized,
				FIELD_KEY_DETERMINISTIC[field]
			);
		} else if (FIELD_KEY_RANDOM[field]) {
			patch[field] = await encryptValue(MongoClientInstance, value, FIELD_KEY_RANDOM[field]);
		}
	}

	return Object.keys(patch).length > 0 ? patch : null;
}

/**
 * Return the set of fields this row would touch on backfill — useful
 * for the audit-log entry that records which fields a backfill run
 * actually converted. Lighter than `computeBackfillPatch` since it
 * doesn't run encryption; meant for accounting after a real run.
 */
export function listBackfillableFields<T extends object>(doc: T): string[] {
	const src = doc as Record<string, unknown>;
	const fields: string[] = [];
	for (const [field, value] of Object.entries(src)) {
		if (value === null || value === undefined) continue;
		if (isEncryptedBinary(value)) continue;
		if (FIELD_KEY_DETERMINISTIC[field] || FIELD_KEY_RANDOM[field]) {
			fields.push(field);
		}
	}
	return fields;
}

// ── Decrypt a user document after findOne / find ──

/**
 * Walks `doc` and replaces every recognized PII field's value with the
 * decrypted plaintext when the stored value is Binary subtype 6. Plain
 * values (legacy plaintext rows during the migration window) pass through.
 *
 * Safe to call when CSFLE is disabled — but if any field is actually
 * encrypted, `decryptValue` will throw (per Phase A design — strict mode).
 */
export async function decryptUserPii<T extends object>(
	doc: T | null | undefined
): Promise<T | null> {
	if (!doc) return null;
	const src = doc as Record<string, unknown>;
	const out: Record<string, unknown> = { ...src };

	for (const field of Object.keys(src)) {
		if (!ALL_ENCRYPTED_FIELDS.has(field)) continue;
		const value = src[field];
		if (value === null || value === undefined) continue;
		out[field] = await decryptValue(MongoClientInstance, value as never);
	}

	return out as T;
}

// ── Field-level helpers for query building ──

/**
 * Encrypt a mobile value for use in a query predicate. Always normalizes
 * to string before encrypting. Returns the input unchanged when CSFLE is
 * disabled, which preserves the existing plaintext query semantics.
 */
export async function encryptMobileForQuery(mobile: string | number): Promise<unknown> {
	return encryptValue(MongoClientInstance, String(mobile), 'mobile-key');
}

/**
 * Encrypt an email value for use in a query predicate. Returns the input
 * unchanged when CSFLE is disabled.
 */
export async function encryptEmailForQuery(email: string): Promise<unknown> {
	return encryptValue(MongoClientInstance, email, 'email-key');
}

/**
 * Encrypt a PAN value for use in a query predicate.
 */
export async function encryptPanForQuery(pan: string): Promise<unknown> {
	return encryptValue(MongoClientInstance, pan, 'pan-key');
}

// ── High-level dual-query lookups (migration-safe) ──

/**
 * Find a user document by mobile, transparently handling both encrypted
 * (new) and plaintext (legacy) rows during the migration window.
 *
 * Strategy:
 *   1. Encrypt the mobile string and try a direct match on ciphertext.
 *      Matches every row written via `encryptUserPii()`.
 *   2. If no match, fall back to the legacy `$in: [string, number]` query.
 *      Matches rows written before encryption was enabled, regardless of
 *      whether they stored mobile as int or string.
 *
 * Once the Phase C backfill is complete, every row is ciphertext and the
 * fallback never matches. Safe to leave in place permanently.
 */
export async function findUserByMobile<T extends Document>(
	collection: Collection<T>,
	mobile: string | number
): Promise<WithId<T> | null> {
	const mobileStr = String(mobile);
	const encMobile = await encryptMobileForQuery(mobileStr);

	// Strategy 1: encrypted match (new rows)
	const encResult = await collection.findOne({ mobileNumber: encMobile } as never);
	if (encResult) return encResult as WithId<T>;

	// Strategy 2: legacy plaintext dual-query (pre-encryption rows)
	const mobileNum = Number(mobileStr);
	return (await collection.findOne({
		mobileNumber: { $in: [mobileStr, mobileNum] }
	} as never)) as WithId<T> | null;
}

/**
 * Find a user document by email, transparently handling both encrypted
 * and plaintext rows. Same strategy as `findUserByMobile`.
 */
export async function findUserByEmail<T extends Document>(
	collection: Collection<T>,
	email: string
): Promise<WithId<T> | null> {
	const encEmail = await encryptEmailForQuery(email);

	const encResult = await collection.findOne({ email: encEmail } as never);
	if (encResult) return encResult as WithId<T>;

	return (await collection.findOne({ email } as never)) as WithId<T> | null;
}

/**
 * Find a user document by PAN, transparently handling both encrypted
 * and plaintext rows.
 */
export async function findUserByPan<T extends Document>(
	collection: Collection<T>,
	pan: string
): Promise<WithId<T> | null> {
	const encPan = await encryptPanForQuery(pan);

	const encResult = await collection.findOne({ panNumber: encPan } as never);
	if (encResult) return encResult as WithId<T>;

	return (await collection.findOne({ panNumber: pan } as never)) as WithId<T> | null;
}
