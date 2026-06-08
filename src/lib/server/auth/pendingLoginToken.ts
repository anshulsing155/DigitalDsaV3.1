/**
 * SEC-10 pending-login-token sign + verify helpers.
 * ────────────────────────────────────────────────────────────────────────────
 * The 2-step conflict-resolution sub-flow needs a way for check-dsa to hand
 * the client a credential it can present to /api/auth/login-confirm,
 * carrying everything login-confirm needs to mint the new session WITHOUT
 * re-querying the user collection or re-computing fingerprints.
 *
 * Shape:
 *   - Server-signed JWT, 5-minute TTL (spec §10 R5).
 *   - Same `JWT_SECRET` as the access/refresh tokens, BUT a distinct
 *     `audience` claim — `'pending-login'` instead of `'auth-client'`.
 *     Verification on either side checks the audience, so a stolen
 *     access token cannot be replayed as a pending-login token and
 *     vice versa. This is cryptographic domain separation without the
 *     operational overhead of a separate signing key + Vercel env vars
 *     across 3 environments.
 *   - Single-use enforcement (Redis or used_pending_tokens collection
 *     with TTL index per spec §10 R5) DEFERRED — Commit B follow-up.
 *     The 5-min TTL is the primary defense; the theft window is small
 *     and replay would re-hit conflict detection (likely re-conflict).
 *     If observed-replay events warrant tighter enforcement, add the
 *     single-use bookkeeping in a separate commit.
 *
 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §5 + §10 R5
 * ADR : docs/adr/0028-single-session-enforcement.md
 */

import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '$env/static/private';

/** 5 minutes — the spec's recommended TTL. Long enough for a user to */
/* read the modal + click; short enough that a stolen token expires */
/* before the attacker can build tooling. */
const PENDING_LOGIN_TTL = '5m';

/** Distinct audience claim — provides cryptographic domain separation */
/* from the access/refresh tokens which use `'auth-client'`. */
const PENDING_LOGIN_AUDIENCE = 'pending-login';
const PENDING_LOGIN_ISSUER = 'auth-system';

export type PendingLoginRole = 'dsa' | 'rm' | 'admin' | 'applicant';

/**
 * Which user collection the would-be-loggee was resolved from at check-dsa
 * time. login-confirm uses this to do a `_id`-based findOne against the
 * correct collection — the userRole field alone isn't sufficient because
 * 'admin' user_role can come from AdminUsers (branches 1+6) OR from the
 * Applicant collection with `role:'admin'` (branch 5).
 */
export type PendingLoginCollection =
	| 'DsaApplications'
	| 'rmApplications'
	| 'AdminUsers'
	| 'Applicant';

export interface PendingLoginPayload {
	/** ObjectId hex string of the would-be-loggee. */
	userId: string;
	/** Which user_role the Sessions row will carry (matches check-dsa's sessionsRole). */
	userRole: PendingLoginRole;
	/** Which collection to look the user up in at login-confirm time. */
	userCollection: PendingLoginCollection;
	/**
	 * The tokenId that WILL be issued by login-confirm. Pre-generated at
	 * check-dsa time so login-confirm can re-run conflict detection on
	 * confirm (defends against TOCTOU — a fresh login arriving between
	 * the modal showing and the user clicking Continue).
	 */
	tokenId: string;
	/**
	 * Sessions IDs the user is allowed to kick via this token. login-confirm
	 * validates the submitted kick_session_ids ⊆ this list.
	 */
	kickEligibleSessionIds: string[];
	/**
	 * Fingerprints + client_class to persist on the new Sessions row.
	 * Stored in the token so login-confirm doesn't need them in its
	 * request body — the client already sent them to check-dsa.
	 */
	incomingFingerprints: {
		device_fingerprint?: string;
		browser_fingerprint?: string;
		client_class?: 'web' | 'android';
	};
}

/**
 * Sign a pending-login-token. Throws if `JWT_SECRET` is unset (which
 * would already have broken the rest of auth — fail loudly here too).
 */
export function signPendingLoginToken(payload: PendingLoginPayload): string {
	return jwt.sign(payload, JWT_SECRET, {
		expiresIn: PENDING_LOGIN_TTL,
		issuer: PENDING_LOGIN_ISSUER,
		audience: PENDING_LOGIN_AUDIENCE
	});
}

export type PendingLoginVerifyResult =
	| { ok: true; payload: PendingLoginPayload }
	| { ok: false; reason: 'expired' | 'invalid_signature' | 'wrong_audience' | 'malformed' };

/**
 * Verify a pending-login-token. Returns a discriminated union so the
 * caller (login-confirm) can map each failure mode to a specific
 * user-facing response code without leaking crypto-library internals.
 */
export function verifyPendingLoginToken(token: string): PendingLoginVerifyResult {
	if (!token || typeof token !== 'string') {
		return { ok: false, reason: 'malformed' };
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET, {
			issuer: PENDING_LOGIN_ISSUER,
			audience: PENDING_LOGIN_AUDIENCE
		});

		// jsonwebtoken types the return as string | object — narrow.
		if (typeof decoded !== 'object' || decoded === null) {
			return { ok: false, reason: 'malformed' };
		}

		// Defensive payload shape check. A future code change that loosens
		// the payload contract should trip these — better to refuse a
		// well-signed-but-wrong-shape token than to let it through.
		const p = decoded as Record<string, unknown>;
		const VALID_COLLECTIONS = new Set<PendingLoginCollection>([
			'DsaApplications',
			'rmApplications',
			'AdminUsers',
			'Applicant'
		]);
		if (
			typeof p.userId !== 'string' ||
			typeof p.userRole !== 'string' ||
			typeof p.userCollection !== 'string' ||
			!VALID_COLLECTIONS.has(p.userCollection as PendingLoginCollection) ||
			typeof p.tokenId !== 'string' ||
			!Array.isArray(p.kickEligibleSessionIds) ||
			typeof p.incomingFingerprints !== 'object' ||
			p.incomingFingerprints === null
		) {
			return { ok: false, reason: 'malformed' };
		}

		return {
			ok: true,
			payload: {
				userId: p.userId,
				userRole: p.userRole as PendingLoginRole,
				userCollection: p.userCollection as PendingLoginCollection,
				tokenId: p.tokenId,
				kickEligibleSessionIds: (p.kickEligibleSessionIds as unknown[]).filter(
					(x): x is string => typeof x === 'string'
				),
				incomingFingerprints: p.incomingFingerprints as PendingLoginPayload['incomingFingerprints']
			}
		};
	} catch (err) {
		// jsonwebtoken errors carry a `name` field — map to typed reason
		// so the caller's response shape stays stable across library bumps.
		const errName =
			err && typeof err === 'object' && 'name' in err ? String(err.name) : 'unknown';
		if (errName === 'TokenExpiredError') {
			return { ok: false, reason: 'expired' };
		}
		// JsonWebTokenError covers: invalid signature, malformed JWT,
		// and audience/issuer mismatches. We collapse audience mismatch
		// into 'wrong_audience' since that's the most informative case
		// for a leaked access token being replayed here.
		if (
			err &&
			typeof err === 'object' &&
			'message' in err &&
			typeof err.message === 'string' &&
			err.message.includes('audience')
		) {
			return { ok: false, reason: 'wrong_audience' };
		}
		return { ok: false, reason: 'invalid_signature' };
	}
}
