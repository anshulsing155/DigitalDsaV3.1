/**
 * F.1 — Referral code generator + lookup helpers
 * ══════════════════════════════════════════════════════════════════════
 * 8-char alphanumeric codes from a curated character set that avoids
 * lookalike chars (0/O, 1/l/I) — DSAs may type these from a printed
 * card or read them over WhatsApp, so visual distinctness matters.
 *
 *   Character set: 32 chars (A-H, J-N, P-Z, 2-9) — 32^8 ≈ 1 trillion
 *   combinations; collision probability is negligible at our scale.
 *
 *   Format example: K7M2QP4N
 *
 * Pure module + DB-aware helpers. The mint helper retries on the
 * (vanishingly unlikely) collision case.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §F.1
 */

import { randomInt } from 'node:crypto';
import { DsaApplications } from '$lib/database/mongo';

/**
 * Lookalike-free character set. Skipped chars:
 *   - 'I', 'l', '1' (vertical-line confusion)
 *   - 'O', '0' (oval confusion)
 *   - lowercase letters (uppercase only — reduces format errors when
 *     reading over WhatsApp or a printed card)
 */
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

/**
 * Generate a single 8-char alphanumeric code using a cryptographically
 * secure RNG (Node's crypto.randomInt). Caller must verify uniqueness
 * separately via mintUniqueReferralCode below.
 */
export function generateReferralCode(): string {
	let out = '';
	for (let i = 0; i < CODE_LENGTH; i++) {
		out += CHARSET[randomInt(CHARSET.length)];
	}
	return out;
}

/**
 * Mint a referral code that's guaranteed unique against the existing
 * DsaApplications.referral_code values. Retries up to N times on the
 * unlikely collision case (1-in-trillion per attempt with our charset).
 *
 * Throws on max-retry exhaustion — that would indicate either a bug or
 * a multi-billion-row DSA collection, both of which are unrealistic.
 */
export async function mintUniqueReferralCode(maxRetries = 5): Promise<string> {
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		const code = generateReferralCode();
		const existing = await DsaApplications.findOne(
			{ referral_code: code },
			{ projection: { _id: 1 } }
		);
		if (!existing) return code;
	}
	throw new Error(
		`mintUniqueReferralCode: ${maxRetries} consecutive collisions — DB scan needed`
	);
}

/**
 * Look up the referrer DSA by their code. Returns null when no DSA
 * carries that code (= invalid or stale link). Tiny projection — we
 * only need the _id + mobile for the self-referral check.
 */
export async function findReferrerByCode(
	code: string
): Promise<{ _id: import('mongodb').ObjectId; mobileNumber: string | number } | null> {
	if (!code || typeof code !== 'string') return null;
	const normalized = code.trim().toUpperCase();
	if (!/^[A-Z2-9]{8}$/.test(normalized)) return null;
	const doc = await DsaApplications.findOne(
		{ referral_code: normalized },
		{ projection: { _id: 1, mobileNumber: 1 } }
	);
	return doc ?? null;
}

export const REFERRAL_CODE_REGEX = /^[A-Z2-9]{8}$/;
