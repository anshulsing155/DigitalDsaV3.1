/**
 * E.3 — Active sessions: device + geo helpers + session-row writers
 * ══════════════════════════════════════════════════════════════════════
 * Three small surfaces:
 *
 *   parseDeviceLabel(ua)
 *     Returns a human-friendly browser+OS or native-app label from a
 *     User-Agent string. Hand-rolled regex set (no `ua-parser-js` or
 *     similar — that'd add 50KB to the server bundle for our 6 cases).
 *     Falls back to "Unknown browser" on totally unknown UAs.
 *
 *   readVercelGeo(headers)
 *     Pulls the x-vercel-ip-* headers Vercel auto-injects on every
 *     request to a deployed function. Free, no setup, no API key. In
 *     local dev these headers are absent — the function returns
 *     {country: null, region: null, city: null} and the UI shows "—".
 *
 *   recordSession({ session_id, user_id, user_role, headers, getClientAddress })
 *     The single insert path. Called from check-dsa once per successful
 *     login (= per refresh-token issuance). Captures UA + Vercel geo +
 *     timestamps. Returns the inserted doc (caller doesn't usually need
 *     it but tests do).
 *
 *   updateSessionLastSeen(session_id)
 *     Called from the refresh-token endpoint on every successful refresh.
 *     Bumps last_seen_at so the UI's "active 2h ago" stays fresh.
 *
 *   isSessionRevoked(session_id)
 *     The hot-path check the refresh-token endpoint runs to enforce
 *     revoke. Returns true when the session's revoked_at is set.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §E.3
 */

import type { ObjectId } from 'mongodb';
import { Sessions } from '$lib/database/mongo';
import type { SessionDoc, SessionUserRole } from '$lib/types/session';
import logger from '$lib/server/logger';

// ── Device-label parsing ───────────────────────────────────────

/**
 * Hand-rolled browser + OS detection. Cases the UI cares about:
 *   • DigitalDSA Android app (Capacitor WebView, identifiable by app token)
 *   • Major desktop browsers on macOS / Windows / Linux
 *   • Major mobile browsers on iOS / Android
 *   • Generic "Browser on <OS>" fallback
 *   • "Unknown device" final fallback
 *
 * Order matters — narrowest tests first so a mobile Safari UA doesn't
 * fall into the generic "Safari" branch.
 */
export function parseDeviceLabel(userAgent: string): string {
	const ua = (userAgent ?? '').trim();
	if (!ua) return 'Unknown device';

	// DigitalDSA native (Capacitor) apps — set their own UA token at
	// build time. Today none is configured; this branch is the
	// extension point when MOB-1 lands. Match on "DigitalDSA/<ver>".
	if (/DigitalDSA\/[\d.]+/i.test(ua)) {
		if (/Android/i.test(ua)) return 'DigitalDSA Android app';
		if (/iPhone|iPad|iOS/i.test(ua)) return 'DigitalDSA iOS app';
		return 'DigitalDSA app';
	}

	// OS detection — order matters. iPhone UAs contain "Mac OS X"
	// ("like Mac OS X") so iOS must be checked BEFORE Mac. Same for
	// Android UAs which contain "Linux" — Android before Linux.
	let os = '';
	if (/iPhone|iPad|iPod/i.test(ua) || /\bCPU.*iOS/i.test(ua)) os = 'iOS';
	else if (/Android/i.test(ua)) os = 'Android';
	else if (/Windows NT/i.test(ua)) os = 'Windows';
	else if (/Mac OS X|Macintosh/i.test(ua)) os = 'Mac';
	else if (/Linux/i.test(ua)) os = 'Linux';

	// Browser detection — Edge/Opera/Brave first since they all
	// include "Chrome" or "Safari" in their UA.
	let browser = '';
	if (/Edg\//i.test(ua)) browser = 'Edge';
	else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
	else if (/Brave/i.test(ua)) browser = 'Brave';
	else if (/Firefox/i.test(ua)) browser = 'Firefox';
	else if (/Chrome\//i.test(ua)) browser = 'Chrome';
	else if (/Safari\//i.test(ua)) browser = 'Safari';

	if (browser && os) return `${browser} on ${os}`;
	if (browser) return browser;
	if (os) return `Browser on ${os}`;
	return 'Unknown device';
}

// ── Vercel geo header extraction ───────────────────────────────

export interface VercelGeo {
	ip_country: string | null;
	ip_country_region: string | null;
	ip_city: string | null;
}

/**
 * Pull Vercel's auto-injected geo headers. URL-decoded — Vercel sends
 * x-vercel-ip-city as percent-encoded for city names with spaces
 * (e.g. "New%20Delhi"). Trim + return null on empty strings so the UI
 * doesn't render "country: " entries.
 */
export function readVercelGeo(headers: Headers): VercelGeo {
	const decode = (raw: string | null): string | null => {
		if (!raw) return null;
		const trimmed = raw.trim();
		if (!trimmed) return null;
		try {
			return decodeURIComponent(trimmed);
		} catch {
			// Malformed percent-encoding — fall back to the raw value.
			return trimmed;
		}
	};
	return {
		ip_country: decode(headers.get('x-vercel-ip-country')),
		ip_country_region: decode(headers.get('x-vercel-ip-country-region')),
		ip_city: decode(headers.get('x-vercel-ip-city'))
	};
}

// ── Session writers ────────────────────────────────────────────

export interface RecordSessionInput {
	session_id: string;
	user_id: ObjectId;
	user_role: SessionUserRole;
	headers: Headers;
	/**
	 * SEC-10: stable per-device hash from the client. Optional — pre-SEC-10
	 * callers (check-dsa today) don't pass this and the row is written
	 * without it. The Commit B conflict-detection helper treats absence
	 * as "never conflicts" so legacy rows can't kick a fresh login.
	 */
	device_fingerprint?: string;
	/**
	 * SEC-10: stable per-browser hash from the client. Same optional /
	 * legacy treatment as device_fingerprint.
	 */
	browser_fingerprint?: string;
	/**
	 * SEC-10: which client class this login came from. 'web' (default
	 * mental model) or 'android' (Capacitor app). Web and android sessions
	 * are NEVER treated as conflicting — they're independent surfaces.
	 */
	client_class?: 'web' | 'android';
}

/**
 * Insert a fresh session row. Called from check-dsa once per successful
 * login (= once per new refresh-token issuance). Best-effort: a failed
 * insert logs but does NOT bubble — the login itself should still
 * succeed. The user would just not see this session in their UI list
 * (they can still revoke via "Sign out all other devices" once they
 * realize); not a security regression.
 *
 * SEC-10 extension: when the caller passes device_fingerprint,
 * browser_fingerprint, or client_class, those values are persisted on
 * the row. When absent, the fields are simply omitted from the inserted
 * document — Mongo stores the row without them and the conflict-detection
 * helper handles the absence gracefully. This lets us roll the feature
 * out one call site at a time without breaking existing flows.
 */
export async function recordSession(input: RecordSessionInput): Promise<void> {
	const { session_id, user_id, user_role, headers } = input;
	const { device_fingerprint, browser_fingerprint, client_class } = input;
	const userAgent = headers.get('user-agent') ?? '';
	const geo = readVercelGeo(headers);
	const now = new Date();

	try {
		// Build the doc in two phases so SEC-10 fields only appear in the
		// inserted document when the caller actually supplied them.
		// Writing `device_fingerprint: undefined` would persist as a null
		// or absent field depending on Mongo driver version; explicit
		// conditional spreads keep the on-disk shape exactly what we mean.
		const doc: SessionDoc = {
			session_id,
			user_id,
			user_role,
			user_agent: userAgent,
			device_label: parseDeviceLabel(userAgent),
			ip_country: geo.ip_country,
			ip_country_region: geo.ip_country_region,
			ip_city: geo.ip_city,
			created_at: now,
			last_seen_at: now,
			...(device_fingerprint ? { device_fingerprint } : {}),
			...(browser_fingerprint ? { browser_fingerprint } : {}),
			...(client_class ? { client_class } : {})
		};
		await Sessions.insertOne(doc);
	} catch (err) {
		logger.warn(
			{ err, session_id, user_id: String(user_id), user_role },
			'[sessions] recordSession failed — login proceeds without session row'
		);
	}
}

/**
 * Bump last_seen_at on the matching session row. Called from the
 * refresh-token endpoint after a successful rotation. Quiet no-op when
 * no row matches (admins onboarded before E.3 shipped won't have one
 * for their existing sessions until they re-login).
 */
export async function updateSessionLastSeen(session_id: string): Promise<void> {
	if (!session_id) return;
	try {
		await Sessions.updateOne(
			{ session_id },
			{ $set: { last_seen_at: new Date() } }
		);
	} catch (err) {
		logger.warn({ err, session_id }, '[sessions] updateSessionLastSeen failed');
	}
}

/**
 * Hot-path check the refresh-token endpoint runs. Returns true when
 * the session has been revoked (= revoked_at field is set). False when
 * not found — pre-E.3 sessions aren't tracked, must keep working.
 */
export async function isSessionRevoked(session_id: string): Promise<boolean> {
	if (!session_id) return false;
	try {
		const row = await Sessions.findOne(
			{ session_id },
			{ projection: { revoked_at: 1 } }
		);
		return row?.revoked_at != null;
	} catch (err) {
		// On DB error: fail-open (don't block refresh on a transient blip).
		// Per spec the revoke is informational/forensic; logging here so an
		// operator can investigate if it persists.
		logger.warn({ err, session_id }, '[sessions] isSessionRevoked failed — failing open');
		return false;
	}
}
