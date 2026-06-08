/**
 * DATA-4 — `person_id` one-way bridge.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md §3 (the one-way bridge).
 *
 * The analytics warehouse must be able to answer "how many unique borrowers"
 * without ever knowing WHO a borrower is. `person_id` is the structural
 * guarantee behind that: it lets two analytics rows be recognised as the
 * same person, but cannot be reversed to a real PAN.
 *
 * How it works, plainly:
 *   - Every operational borrower record has a `pan_hash` — a SHA-256 of their
 *     PAN salted with an operational pepper.
 *   - The analytics row stores `person_id = HMAC-SHA256(ANALYTICS_PEPPER, pan_hash)`.
 *   - `ANALYTICS_PEPPER` is a SEPARATE secret from any other pepper in the
 *     system, held only by the ETL job — not by app routes, not by anyone
 *     reading the warehouse.
 *
 * What this buys us:
 *   - Operational DB leaked → attacker has `pan_hash`, but cannot compute
 *     `person_id` without `ANALYTICS_PEPPER` → cannot correlate analytics
 *     rows back to operational rows.
 *   - Analytics DB leaked → attacker has `person_id`, but HMAC is one-way →
 *     cannot reach `pan_hash`, let alone the PAN.
 *
 * `ANALYTICS_PEPPER` must NOT be rotated routinely — rotation gives the same
 * borrower a new `person_id`, breaking unique-person continuity across the
 * boundary. See spec §8 "Pepper rotation".
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { createHmac } from 'node:crypto';

// 32 hex chars = 16 bytes / 128-bit space. Chosen over the spec draft's 16
// because `person_id` powers unique-borrower counts: a 64-bit space starts
// seeing birthday-paradox collisions in the low millions of borrowers, which
// would silently inflate "unique people" accuracy. 128 bits is collision-safe
// at any realistic platform scale. Matches DATA-2's revocation-token width.
const PERSON_ID_LENGTH_HEX = 32;

/**
 * Read the analytics pepper from env. Throws if missing or too short —
 * refusing to derive a `person_id` without a strong pepper is the safe
 * default (a weak/empty pepper would make `person_id` reversible). The env
 * var is set in `.env.local` (dev) and Vercel project secrets (production).
 */
function getAnalyticsPepper(): string {
	const pepper = process.env.ANALYTICS_PEPPER;
	if (!pepper || pepper.length < 32) {
		throw new Error(
			'[analytics] ANALYTICS_PEPPER is not set or too short (need ≥ 32 chars). ' +
				'Generate with `openssl rand -hex 32`.'
		);
	}
	return pepper;
}

/**
 * Derive the analytics `person_id` from an operational `pan_hash`.
 *
 * Deterministic: the same `pan_hash` always yields the same `person_id`, so
 * two cases for the same borrower land on the same id (that is the whole
 * point — unique-person counts). One-way: the HMAC cannot be reversed to the
 * `pan_hash` without the pepper.
 *
 * @param panHash - the operational SHA-256 PAN hash (hex string). Must be a
 *   non-empty string; an empty or non-string value throws rather than
 *   silently producing a "person_id of nothing".
 */
export function personIdFromPanHash(panHash: string): string {
	if (typeof panHash !== 'string' || panHash.length === 0) {
		throw new Error('[analytics] personIdFromPanHash requires a non-empty pan_hash string.');
	}
	const pepper = getAnalyticsPepper();
	return createHmac('sha256', pepper).update(panHash).digest('hex').slice(0, PERSON_ID_LENGTH_HEX);
}

export { PERSON_ID_LENGTH_HEX };
