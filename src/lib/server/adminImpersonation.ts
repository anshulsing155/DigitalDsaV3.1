/**
 * Admin Impersonation — cookie signing and verification
 *
 * Cookie name : adminImpersonating
 * Cookie value: base64url( JSON({ adminId, targetId, targetRole, startedAt }) )
 *               + '.' + HMAC-SHA256(payload, secret)
 *
 * The HMAC binds the cookie to actor + target + start time so it can't be
 * tampered to impersonate a different user or forge the admin identity.
 * `startedAt` (Unix ms) is part of the signed payload so the exit endpoint
 * can compute session duration without trusting client-side state.
 *
 * Signing key: PMS_SIGNING_SECRET only — no CRON_SECRET fallback. CRON_SECRET
 * is sent as a bearer token to external cron schedulers; reusing it here would
 * mean an attacker who observes a single cron request could forge impersonation
 * cookies and gain full RM/DSA access. Fails closed when the env var is missing
 * rather than silently falling back to the unsafe key.
 */

import crypto from 'crypto';
import { getPmsSigningKeyStrict } from '$lib/server/pms/signingKey.js';

export const IMPERSONATION_COOKIE = 'adminImpersonating';

/** Max session lifetime in seconds (4 hours). Exit endpoint uses startedAt
 *  from the signed payload to compute actual duration for the audit row. */
export const IMPERSONATION_SESSION_MAX_AGE_SECONDS = 60 * 60 * 4;

export type ImpersonationTargetRole = 'dsa' | 'rm';

export interface ImpersonationPayload {
	adminId: string;
	targetId: string;
	targetRole: ImpersonationTargetRole;
	/** Unix milliseconds when impersonation began. */
	startedAt: number;
}

export function signImpersonationCookie(payload: ImpersonationPayload): string {
	const key = getPmsSigningKeyStrict();
	const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
	const sig = crypto.createHmac('sha256', key).update(encoded).digest('base64url');
	return `${encoded}.${sig}`;
}

export function verifyImpersonationCookie(cookie: string): ImpersonationPayload | null {
	try {
		const dotIndex = cookie.lastIndexOf('.');
		if (dotIndex === -1) return null;

		const payload = cookie.slice(0, dotIndex);
		const sig = cookie.slice(dotIndex + 1);

		const key = getPmsSigningKeyStrict();
		const expected = crypto.createHmac('sha256', key).update(payload).digest('base64url');

		// Length check before timingSafeEqual — the function throws RangeError on
		// mismatched lengths, and an attacker controls `sig`. Without this guard
		// the throw is caught below but produces noisy logs on every malformed
		// cookie. Fast deterministic null return on length mismatch.
		const sigBuf = Buffer.from(sig, 'base64url');
		const expectedBuf = Buffer.from(expected, 'base64url');
		if (sigBuf.length !== expectedBuf.length) return null;
		if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

		const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<
			ImpersonationPayload
		>;

		// Shape-validate: refuse anything that doesn't carry all 4 expected keys
		// with the right types. Protects against rolling out a new shape while
		// stale cookies from the old shape are still in browsers.
		if (
			typeof parsed.adminId !== 'string' ||
			typeof parsed.targetId !== 'string' ||
			(parsed.targetRole !== 'dsa' && parsed.targetRole !== 'rm') ||
			typeof parsed.startedAt !== 'number' ||
			!Number.isFinite(parsed.startedAt)
		) {
			return null;
		}

		return parsed as ImpersonationPayload;
	} catch {
		return null;
	}
}
