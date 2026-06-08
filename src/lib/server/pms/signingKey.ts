/**
 * PMS signing key + token helpers
 * ════════════════════════════════════════════════════════════════════
 * Single source of truth for the secret used to sign:
 *   • PMS OTP tokens issued at /api/pms/otp/verify and consumed at submit/onboard
 *   • Admin impersonation cookies (HMAC over { adminId, rmId })
 *
 * Two functions are exposed:
 *   getPmsSigningKey()           — preferred secret with one-time CRON_SECRET fallback warning
 *   getPmsSigningKeyStrict()     — throws unless PMS_SIGNING_SECRET is set
 *
 * The strict variant is used for admin impersonation where falling back to
 * CRON_SECRET creates a privilege-escalation path: CRON_SECRET is sent as a
 * bearer token to external cron schedulers, and an attacker who observes one
 * of those requests could forge impersonation cookies. The OTP path is less
 * exploitable (per-policy bound) but should also migrate off the fallback.
 *
 * Tokens are also windowed by time. A token issued at T is valid until the
 * next 15-minute boundary; verifyPmsOtpToken accepts the current and previous
 * window so a near-boundary clock skew of <15min still verifies. This caps the
 * replay window at ~15-30 minutes — without it, captured tokens were valid
 * indefinitely (until draftHash changed, and forever for onboard tokens).
 * ════════════════════════════════════════════════════════════════════
 */
import crypto from 'crypto';
import { env } from '$env/dynamic/private';
import logger from '$lib/server/logger.js';

/** OTP token lifetime — tokens accepted within current or previous 15-min window. */
export const PMS_OTP_TOKEN_WINDOW_MS = 15 * 60 * 1000;

let warnedAboutFallback = false;

/**
 * Returns the secret used to sign PMS OTP tokens. Prefers PMS_SIGNING_SECRET.
 * Falls back to CRON_SECRET (with a one-time logged warning) for environments
 * that haven't yet provisioned the dedicated secret. Throws if neither is set
 * — an empty key would let anyone forge tokens.
 */
export function getPmsSigningKey(): string {
	const dedicated = env.PMS_SIGNING_SECRET;
	if (dedicated) return dedicated;

	const fallback = env.CRON_SECRET;
	if (fallback) {
		if (!warnedAboutFallback) {
			warnedAboutFallback = true;
			logger.warn(
				'[security] PMS_SIGNING_SECRET unset — using CRON_SECRET fallback. This is a cross-trust-domain risk; provision PMS_SIGNING_SECRET in env.'
			);
		}
		return fallback;
	}

	throw new Error('PMS signing key unavailable: set PMS_SIGNING_SECRET');
}

/**
 * Strict variant — used for admin impersonation cookie signing where the
 * CRON_SECRET fallback is unacceptable (privilege-escalation path).
 */
export function getPmsSigningKeyStrict(): string {
	const dedicated = env.PMS_SIGNING_SECRET;
	if (!dedicated) {
		throw new Error('PMS_SIGNING_SECRET is required (no CRON_SECRET fallback for this code path)');
	}
	return dedicated;
}

// ─── PMS OTP token (windowed HMAC) ───────────────────────────────────────────

export interface PmsOtpTokenParts {
	rmUserId: string;
	lenderId: string;
	policyId: string;
	draftHash: string;
}

/**
 * Returns the integer slot number for a given timestamp. Two events within the
 * same window produce the same slot. Used as a coarse-grained timestamp inside
 * the HMAC payload so tokens become invalid after ~15-30 minutes.
 */
function tokenWindowSlot(now: number = Date.now()): number {
	return Math.floor(now / PMS_OTP_TOKEN_WINDOW_MS);
}

function computeOtpToken(parts: PmsOtpTokenParts, slot: number, signingKey: string): string {
	const payload = `${parts.rmUserId}:${parts.lenderId}:${parts.policyId}:${parts.draftHash}:${slot}`;
	return crypto.createHmac('sha256', signingKey).update(payload).digest('base64url');
}

/**
 * Issues a fresh PMS OTP token bound to the given parts and the current
 * window slot. Caller must pass the signing key explicitly so test fixtures
 * can override it.
 */
export function issuePmsOtpToken(parts: PmsOtpTokenParts, signingKey: string): string {
	return computeOtpToken(parts, tokenWindowSlot(), signingKey);
}

/**
 * Constant-time verification of a PMS OTP token. Accepts the token if it
 * matches the HMAC for the current OR previous window slot — gives ~15-30 min
 * of validity, with the lower bound covering clock skew at slot boundaries.
 */
export function verifyPmsOtpToken(
	token: string,
	parts: PmsOtpTokenParts,
	signingKey: string
): boolean {
	let tokenBuf: Buffer;
	try {
		tokenBuf = Buffer.from(token, 'base64url');
	} catch {
		return false;
	}

	const currentSlot = tokenWindowSlot();
	for (const slot of [currentSlot, currentSlot - 1]) {
		const expected = computeOtpToken(parts, slot, signingKey);
		const expectedBuf = Buffer.from(expected, 'base64url');
		if (
			tokenBuf.length === expectedBuf.length &&
			crypto.timingSafeEqual(tokenBuf, expectedBuf)
		) {
			return true;
		}
	}
	return false;
}
