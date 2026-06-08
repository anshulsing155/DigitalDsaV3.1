/**
 * E.2 — Admin TOTP 2FA helpers
 * ══════════════════════════════════════════════════════════════════════
 * Pure-ish helpers wrapping `otplib` + `qrcode`. No DB I/O; callers
 * persist the secret + hashed recovery codes themselves. Settings here
 * are locked at common, interoperable values so every authenticator app
 * (Google Authenticator, Authy, 1Password, Microsoft Authenticator,
 * iOS Settings, etc.) accepts the generated otpauth:// URL.
 *
 *   Algorithm     SHA-1 (the only one universally supported by mobile
 *                 authenticator apps — SHA-256 / SHA-512 work in code
 *                 but a meaningful fraction of apps still don't honor
 *                 them in the otpauth URL).
 *   Period        30 seconds
 *   Digits        6
 *   Drift window  ±1 step (= ±30s) — covers normal clock skew without
 *                 widening the brute-force search space appreciably.
 *
 * Recovery codes
 *   8 codes, generated from crypto.randomBytes(8) → 16 hex chars,
 *   formatted as `xxxx-xxxx-xxxx-xxxx`. Stored as SHA-256 hex digests.
 *   Verifying a code is constant-time (timingSafeEqual on the digest).
 *
 * Owner decisions (2026-05-30): voluntary rollout v1; no grace-period
 * enforcement flag yet; 8 recovery codes per spec example.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §E.2
 */

import { generateSecret as otplibGenerateSecret, generateURI, verifySync } from 'otplib';
import qrcode from 'qrcode';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// otplib v13 uses a functional API with options-per-call. Wrapped here
// so the rest of the codebase calls our typed helpers, not raw otplib
// (cheaper migration cost if otplib breaks API again).

/** Issuer shown in the authenticator app and embedded in the QR URL. */
export const TOTP_ISSUER = 'DigitalDSA';

/** Number of recovery codes minted on /confirm. Owner-locked at 8. */
export const RECOVERY_CODE_COUNT = 8;

/** Lockout config — owner-locked at 5 fails / 15 min. */
export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

// ── Secret + token primitives ──────────────────────────────────

/**
 * Generate a fresh base32 TOTP secret. ~160 bits of entropy.
 * Returned as a plain string ready for embedding in an otpauth URL.
 */
export function generateSecret(): string {
	// 20 bytes = 160 bits of entropy (otplib default; RFC 4226 recommends ≥128).
	return otplibGenerateSecret();
}

/**
 * Build the otpauth:// URL the QR encodes. The account label is the
 * admin's email when available, falling back to `admin:<mobile>` so
 * the QR is still scannable for admins onboarded before email capture.
 *
 *   Example: otpauth://totp/DigitalDSA:admin@example.com?secret=...&issuer=DigitalDSA
 */
export function buildOtpauthUrl(accountLabel: string, secret: string): string {
	return generateURI({
		strategy: 'totp',
		issuer: TOTP_ISSUER,
		label: accountLabel,
		secret,
		algorithm: 'sha1',
		digits: 6,
		period: 30
	});
}

/**
 * Render the otpauth URL as a base64 data: URL the browser can render
 * inline via `<img src="...">`. ~2KB payload at the default size.
 */
export async function generateQrDataUrl(otpauthUrl: string): Promise<string> {
	return qrcode.toDataURL(otpauthUrl, {
		errorCorrectionLevel: 'M',
		margin: 2,
		width: 200
	});
}

/**
 * Constant-time verify of a user-submitted 6-digit token against the
 * stored secret. Returns false on any malformed input — never throws.
 *
 * `otplib.check` already runs constant-time internally and honours the
 * ±1 step window we configured above.
 */
export function verifyToken(secret: string, token: string): boolean {
	if (typeof secret !== 'string' || !secret) return false;
	if (typeof token !== 'string') return false;
	// Normalize: strip whitespace + dashes so "123 456" / "123-456" work.
	const normalized = token.replace(/[\s-]/g, '');
	if (!/^\d{6}$/.test(normalized)) return false;
	try {
		const result = verifySync({
			strategy: 'totp',
			secret,
			token: normalized,
			algorithm: 'sha1',
			digits: 6,
			period: 30,
			// ±1 step drift tolerance. otplib v13 measures epochTolerance
			// in SECONDS (not steps), so ±30s expressed as the period value.
			// Covers normal clock skew without meaningfully widening the
			// brute-force surface (6-digit token × 3 windows = 3-in-a-million).
			epochTolerance: 30
		});
		return result.valid === true;
	} catch {
		return false;
	}
}

// ── Recovery codes ─────────────────────────────────────────────

/**
 * Generate N fresh recovery codes formatted as `xxxx-xxxx-xxxx-xxxx`
 * (16 hex chars, dashed every 4 for readability when typed by hand).
 * Returns plaintext codes — caller is responsible for hashing before
 * persisting and for showing the plaintext to the user EXACTLY ONCE.
 */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
	const codes: string[] = [];
	for (let i = 0; i < count; i++) {
		const hex = randomBytes(8).toString('hex'); // 16 chars
		codes.push(`${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`);
	}
	return codes;
}

/**
 * SHA-256 hex digest of a recovery code. Codes are normalized to lowercase
 * with dashes stripped BEFORE hashing so a user typing `ABCD EFGH...`
 * still matches the stored hash for `abcd-efgh-...`.
 */
export function hashRecoveryCode(code: string): string {
	const normalized = code.replace(/[\s-]/g, '').toLowerCase();
	return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Find a recovery code in the stored hash list, constant-time. Returns
 * the matching hash (so the caller can splice it out for single-use
 * semantics) OR null if no match.
 *
 * Constant-time across the entire list: we walk every hash and compute
 * timingSafeEqual against each. Does NOT short-circuit on first match
 * — a timing attack would otherwise reveal list position.
 */
export function findMatchingRecoveryHash(
	submittedCode: string,
	storedHashes: string[]
): string | null {
	const candidate = hashRecoveryCode(submittedCode);
	const candidateBuf = Buffer.from(candidate, 'hex');
	if (candidateBuf.length !== 32) return null; // not a valid hash shape

	let match: string | null = null;
	for (const stored of storedHashes) {
		try {
			const storedBuf = Buffer.from(stored, 'hex');
			if (storedBuf.length !== 32) continue;
			// timingSafeEqual throws on mismatched lengths — guarded above.
			if (timingSafeEqual(candidateBuf, storedBuf)) {
				match = stored;
				// Do NOT break — keep walking for constant-time.
			}
		} catch {
			// Malformed hash in storage — skip silently. Caller should
			// audit / clean up.
		}
	}
	return match;
}

// ── Lockout window math ────────────────────────────────────────

export interface LockoutState {
	isLockedOut: boolean;
	/** Failed attempts inside the current rolling window. */
	recentFailureCount: number;
	/** When the lockout (if active) will lift. Absent when not locked out. */
	unlocksAt?: Date;
}

/**
 * Inspect the failed-attempts list and decide if the admin is currently
 * locked out. Returns the trimmed list (only entries inside the rolling
 * window) so callers can rewrite the stored array without unbounded growth.
 */
export function computeLockoutState(
	failedAttempts: Date[] | undefined,
	now: Date = new Date()
): { state: LockoutState; trimmedAttempts: Date[] } {
	const cutoff = now.getTime() - LOCKOUT_WINDOW_MS;
	const trimmed = (failedAttempts ?? []).filter((d) => d.getTime() > cutoff);
	const isLockedOut = trimmed.length >= LOCKOUT_THRESHOLD;

	const state: LockoutState = {
		isLockedOut,
		recentFailureCount: trimmed.length,
		...(isLockedOut && {
			// Unlocks when the OLDEST attempt in the window slides out.
			unlocksAt: new Date(trimmed[0].getTime() + LOCKOUT_WINDOW_MS)
		})
	};
	return { state, trimmedAttempts: trimmed };
}
