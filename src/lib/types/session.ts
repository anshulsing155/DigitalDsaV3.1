/**
 * Sessions — active-session registry for the "Active devices" UI
 * ══════════════════════════════════════════════════════════════════════
 * One row per refresh-token issuance. `session_id` ties back to the
 * `tokenId` claim in the refresh JWT — when /api/auth/refresh-token
 * checks the stored refresh token, it ALSO checks Sessions.revoked_at
 * and rejects if set. Revoking = setting revoked_at; the device's
 * already-issued access token still works for up to 15 minutes (= ACCESS_
 * TOKEN_EXPIRY), then refresh fails, then re-login required. Owner-
 * decided 2026-05-30: "natural" semantics — no per-request blacklist
 * check on the hot path.
 *
 * Stored fields are deliberately low-PII:
 *   - user_agent is the raw UA string (forensic value, no PII beyond what
 *     the browser already advertises to every site)
 *   - device_label is the UI-friendly parse ("Chrome on Windows")
 *   - ip_city / ip_country come from Vercel auto-injected geo headers
 *     (free, no external API). Null in dev or when Vercel can't resolve.
 *
 * Admin impersonation: when an admin uses /api/admin/impersonate/start,
 * NO Sessions row is created for the impersonated user — per spec, those
 * appear in the impersonation audit log, not the impersonated user's
 * session list.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §E.3
 */

import type { ObjectId } from 'mongodb';

export type SessionUserRole = 'dsa' | 'rm' | 'admin' | 'applicant';

export interface SessionDoc {
	_id?: ObjectId;
	/**
	 * Stable session identifier — equals the `tokenId` claim in the
	 * refresh-token JWT. Cookie rotation creates a new tokenId, so a
	 * device that refreshes spawns a new Sessions row (which is correct:
	 * the prior token is invalidated server-side anyway).
	 */
	session_id: string;
	user_id: ObjectId;
	user_role: SessionUserRole;
	/** Raw User-Agent string for forensic lookup. */
	user_agent: string;
	/** UI-friendly device label parsed from user_agent — e.g. "Chrome on Windows". */
	device_label: string;
	/**
	 * SEC-10: stable device fingerprint (SHA-256 hex, 64 chars). Derived
	 * client-side from non-volatile signals — platform + timezone +
	 * screen geometry + OS family — then hashed before sending. The
	 * server only ever sees the opaque hex digest, never the raw signals.
	 * Optional during dual-write: pre-SEC-10 Sessions rows lack this
	 * field. The conflict-detection helper treats missing fingerprints
	 * as "never conflicts" (so legacy rows don't accidentally kick a
	 * fresh login). Set to the literal 'legacy' by the SEC-10 backfill
	 * script for audit continuity.
	 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §3.1 + §8
	 */
	device_fingerprint?: string;
	/**
	 * SEC-10: stable browser fingerprint (SHA-256 hex, 64 chars). Derived
	 * client-side from UA family + UA major version + OS — major version
	 * only so routine browser auto-updates don't trigger false-positive
	 * conflicts. Same optional + legacy treatment as device_fingerprint.
	 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §3.1 + §8
	 */
	browser_fingerprint?: string;
	/**
	 * SEC-10: which client class this session was issued to. 'web' for
	 * normal browser sessions, 'android' for the Capacitor app. The
	 * conflict-detection helper NEVER treats a web session as conflicting
	 * with an android session — they're independent surfaces by design.
	 * Optional during dual-write; pre-SEC-10 rows default to 'web' in
	 * the conflict matrix (matching the only surface that existed before
	 * MOB-1).
	 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §3.1 + §4
	 */
	client_class?: 'web' | 'android';
	/** ISO country code (e.g. 'IN') from Vercel's x-vercel-ip-country header. Null when unknown (dev or unresolvable). */
	ip_country?: string | null;
	/** Country region / state code (e.g. 'MH') from Vercel's x-vercel-ip-country-region header. */
	ip_country_region?: string | null;
	/** City (e.g. 'Mumbai') from Vercel's x-vercel-ip-city header. */
	ip_city?: string | null;
	created_at: Date;
	/** Updated on every successful refresh-token rotation. */
	last_seen_at: Date;
	/** Set on revoke (manual or "Sign out all other devices"). Refresh path rejects when this is present. */
	revoked_at?: Date | null;
	/**
	 * Why the session was revoked — surfaced to the user only via the
	 * "you signed out at X" timeline; primarily for ops debugging.
	 *
	 * SEC-10 adds 'kicked_by_new_login' — emitted when the SEC-10
	 * confirm-and-kick flow at /api/auth/login-confirm marks a previous
	 * session revoked because the user chose "continue here" on the
	 * session-conflict modal. Distinct from 'revoke_others' (a user's
	 * explicit "sign out all other devices" action) because the kicked
	 * session was kicked at *new-login time*, not by the surviving
	 * session's owner.
	 *
	 * SEC-10 also adds 'rotated_same_browser' (2026-06-05) — emitted by
	 * the conflict gate (evaluateLoginConflict) when the incoming login
	 * matches an existing row on client_class + device_fingerprint +
	 * browser_fingerprint but with a different session_id. That's the
	 * "same browser, re-login" case: the user's cookie has been replaced
	 * by the new session's JWT, so the old session_id is functionally
	 * unreachable. Marking it revoked keeps Atlas honest (no ghost rows
	 * inflating `revoked_at == null` counts in the active-sessions UI or
	 * future conflict-detection runs). Distinct from 'kicked_by_new_login'
	 * because there's NO user-visible UX (no modal, no toast) — the user
	 * never knew there was a prior row to kick.
	 */
	revoke_reason?:
		| 'user_action'
		| 'revoke_others'
		| 'token_reuse_detected'
		| 'kicked_by_new_login'
		| 'rotated_same_browser'
		| 'account_closed'
		| null;
}
