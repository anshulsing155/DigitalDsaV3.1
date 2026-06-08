/**
 * Case Lock — Fingerprint Computation
 * ══════════════════════════════════════════════════════════════════
 * Computes a SHA-256 fingerprint that answers "is this the same loan?"
 * from a billing perspective. Two cases with the same fingerprint are
 * considered identical — locking a case that already has the same
 * fingerprint is a no-op (don't double-charge).
 *
 * Formula: SHA-256(loan_type :: sorted_pan_hashes :: amount_bucket)
 *
 * // 🟡 PHASE-3-DESIGN-DECISIONS Decision 3.2 may change post-beta
 * // — see docs/specs/PHASE-3-DESIGN-DECISIONS.md §2
 * // Current formula uses 3 inputs. Beta data may show that subtype
 * // or property.state need to participate in lock identity.
 *
 * See: docs/specs/DOCUMENT-PARSER-FORM-INTEGRATION.md §4.1
 * Decision 3.1 — ₹5L bucket size
 * Decision 3.2 🟡 — fingerprint inputs (3-input formula)
 * Decision D-009 — original fingerprint formula definition
 * ══════════════════════════════════════════════════════════════════
 */

import { createHash } from 'crypto';

// ── Types ───────────────────────────────────────────────────────

export interface FingerprintInput {
	/** The loan type (e.g. 'home_loan', 'lap', 'personal_loan') */
	loan_type: string;
	/** All applicants with their PAN numbers (raw, uppercase) */
	applicants: Array<{ pan: string }>;
	/** The loan amount in INR (e.g. 3500000 for ₹35L) */
	loan_amount: number;
}

export interface FingerprintResult {
	/** The computed SHA-256 fingerprint (hex string, 64 chars) */
	fingerprint_sha256: string;
	/**
	 * The amount bucket — floor(loan_amount / 5_00_000) * 5_00_000.
	 * Example: ₹37L → bucket ₹35L. DSA can adjust within the bucket
	 * without triggering a re-lock.
	 *
	 * Decision 3.1 — ₹5L bucket size.
	 */
	amount_bucket: number;
	/** SHA-256 hashes of each applicant's PAN (sorted alphabetically) */
	pan_hashes: string[];
}

// ── Constants ───────────────────────────────────────────────────

/**
 * Amount bucket size in INR (₹5,00,000 = ₹5 lakh).
 * DSA can adjust loan amount within a bucket without re-locking.
 * Example: ₹35L and ₹39.99L are in the same bucket (₹35L bucket).
 *
 * Decision 3.1 — ₹5L bucket confirmed.
 */
const AMOUNT_BUCKET_SIZE = 500_000;

/** Separator between fingerprint ingredients (unlikely in real data) */
const INGREDIENT_SEPARATOR = '::';

/** Separator between PAN hashes (unlikely in real data) */
const PAN_HASH_SEPARATOR = '|';

// ── Core Function ───────────────────────────────────────────────

/**
 * Compute the case fingerprint from loan identity inputs.
 *
 * The fingerprint determines "is this still the same loan?" for
 * billing purposes. Same fingerprint = same loan = don't charge again.
 *
 * Properties:
 * - Deterministic: same inputs always produce same output
 * - Order-independent: PAN hashes are sorted (adding co-app at slot 2
 *   vs slot 3 doesn't matter if the PAN set is identical)
 * - Bucket-tolerant: ₹35L and ₹39.99L produce the same fingerprint
 *   (within the same ₹5L bucket)
 *
 * @param input - The loan identity components
 * @returns The fingerprint + derived values for storage
 */
export function computeCaseFingerprint(input: FingerprintInput): FingerprintResult {
	// Step 1: Compute the amount bucket
	// floor(amount / 5L) * 5L — e.g. ₹37L → ₹35L bucket
	const amount_bucket = Math.floor(input.loan_amount / AMOUNT_BUCKET_SIZE) * AMOUNT_BUCKET_SIZE;

	// Step 2: Hash each PAN individually then sort
	// Sorting makes the fingerprint order-independent — the same set of
	// PANs produces the same fingerprint regardless of applicant slot order.
	const pan_hashes = input.applicants
		.map((a) => createHash('sha256').update(a.pan.toUpperCase().trim()).digest('hex'))
		.sort();

	// Step 3: Combine ingredients and hash
	// Format: "loan_type::pan_hash_1|pan_hash_2|...|pan_hash_n::amount_bucket"
	const ingredients = [
		input.loan_type.toLowerCase().trim(),
		pan_hashes.join(PAN_HASH_SEPARATOR),
		String(amount_bucket)
	].join(INGREDIENT_SEPARATOR);

	const fingerprint_sha256 = createHash('sha256').update(ingredients).digest('hex');

	return { fingerprint_sha256, amount_bucket, pan_hashes };
}

/**
 * Check if two fingerprints are identical (same loan identity).
 * Used for idempotent lock detection — don't double-charge.
 */
export function fingerprintsMatch(a: string, b: string): boolean {
	return a === b;
}
