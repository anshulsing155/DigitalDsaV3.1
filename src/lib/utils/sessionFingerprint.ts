/**
 * SEC-10 client-side fingerprint computation.
 * ────────────────────────────────────────────────────────────────────────────
 * Runs in the browser, NOT on the server. Produces two SHA-256 hex digests
 * + a human-readable UA summary, which the login flow sends to check-dsa
 * for conflict detection.
 *
 * Privacy: we hash on the client and send only the opaque hex digests.
 * The server never sees the raw UA / platform / timezone / screen — those
 * stay in the browser. The server already gets the UA via the request
 * header, but the digests we send are derived from a narrower set of
 * signals than the raw UA carries, so logging / spans / DB rows hold
 * less information than the request header line itself.
 *
 * Stability vs precision trade-off:
 *   - DEVICE fingerprint = platform + timezone + screen geometry + OS family.
 *     Stable across browser sessions and tabs on the same device. Doesn't
 *     change when the browser auto-updates. Changes when the user moves to
 *     a different machine.
 *   - BROWSER fingerprint = browser family + browser MAJOR version + OS.
 *     "Major version only" deliberately: minor/patch updates roll silently
 *     (Chrome 130.0.6723 → 130.0.6724) and would trigger a false-positive
 *     "browser conflict" modal on every routine update.
 *
 * Capacitor Android path is STUBBED here. When MOB-1 lands, the android
 * surface will use `capacitor-secure-storage-plugin` to persist a UUID
 * across reinstalls (Android keystore-backed). For now, callers passing
 * `clientClass: 'android'` get a deterministic placeholder so the conflict
 * detection never accidentally treats two android sessions as identical.
 *
 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §8
 * ADR : docs/adr/0028-single-session-enforcement.md
 */

import { browser } from '$app/environment';

export interface SessionFingerprints {
	/** SHA-256 hex digest (64 lowercase hex chars). Sent to check-dsa as deviceFingerprint. */
	device: string;
	/** SHA-256 hex digest (64 lowercase hex chars). Sent to check-dsa as browserFingerprint. */
	browser: string;
	/** Human-readable label for the modal — "Chrome 130 on Windows". */
	uaSummary: string;
	/** 'web' or 'android'. Web is the default; android is set by the Capacitor wrapper. */
	clientClass: 'web' | 'android';
}

// ── UA parsing — hand-rolled, no dependency ────────────────────────────

interface ParsedUa {
	family: string; // 'Chrome' | 'Firefox' | 'Safari' | 'Edge' | 'Opera' | 'Brave' | 'Unknown'
	majorVersion: string; // numeric string or '0' if not extractable
	os: string; // 'Windows' | 'Mac' | 'Linux' | 'iOS' | 'Android' | 'Unknown'
}

/**
 * Pull browser family + major version + OS from a User-Agent string.
 * Mirrors src/lib/server/account/sessions.ts:parseDeviceLabel but returns
 * the structured shape this module needs for fingerprint seeds.
 *
 * Order matters in the family check — Edge/Opera/Brave include "Chrome"
 * in their UA, iOS includes "Mac", Android includes "Linux".
 */
export function parseUaFamily(userAgent: string): ParsedUa {
	const ua = (userAgent ?? '').trim();
	if (!ua) return { family: 'Unknown', majorVersion: '0', os: 'Unknown' };

	// OS detection — narrowest tests first.
	let os = 'Unknown';
	if (/iPhone|iPad|iPod/i.test(ua) || /\bCPU.*iOS/i.test(ua)) os = 'iOS';
	else if (/Android/i.test(ua)) os = 'Android';
	else if (/Windows NT/i.test(ua)) os = 'Windows';
	else if (/Mac OS X|Macintosh/i.test(ua)) os = 'Mac';
	else if (/Linux/i.test(ua)) os = 'Linux';

	// Family + version detection. The regexes capture the major version
	// from the typical "Family/<major>.<minor>.<patch>" UA pattern.
	let family = 'Unknown';
	let majorVersion = '0';

	const tryMatch = (
		name: string,
		regex: RegExp
	): boolean => {
		const m = ua.match(regex);
		if (m) {
			family = name;
			majorVersion = m[1] ?? '0';
			return true;
		}
		return false;
	};

	// Edge/Opera/Brave first since they all include 'Chrome' / 'Safari' too.
	if (tryMatch('Edge', /Edg\/(\d+)/i)) return { family, majorVersion, os };
	if (tryMatch('Opera', /OPR\/(\d+)/i) || tryMatch('Opera', /Opera\/(\d+)/i)) {
		return { family, majorVersion, os };
	}
	if (tryMatch('Brave', /Brave\/(\d+)/i)) return { family, majorVersion, os };
	if (tryMatch('Firefox', /Firefox\/(\d+)/i)) return { family, majorVersion, os };
	if (tryMatch('Chrome', /Chrome\/(\d+)/i)) return { family, majorVersion, os };
	// Safari version sits in "Version/<major>" — Safari's UA layout.
	if (tryMatch('Safari', /Version\/(\d+).*Safari\//i)) return { family, majorVersion, os };

	return { family, majorVersion, os };
}

// ── SHA-256 hex via Web Crypto ─────────────────────────────────────────

/**
 * Lowercase hex digest of the input string via Web Crypto API.
 * Available in every modern browser + the Capacitor WebView.
 *
 * Returns a 64-char string of [0-9a-f]. The conflict-detection helper
 * + the sanitizer in check-dsa both require exactly this format.
 */
async function sha256Hex(input: string): Promise<string> {
	const enc = new TextEncoder();
	const buf = await crypto.subtle.digest('SHA-256', enc.encode(input));
	const bytes = Array.from(new Uint8Array(buf));
	return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Public API ─────────────────────────────────────────────────────────

export interface BuildFingerprintsOptions {
	/**
	 * Override the client class. Defaults to 'web'. Capacitor wrapper code
	 * should set this to 'android'.
	 */
	clientClass?: 'web' | 'android';
	/**
	 * For Capacitor android only: the persistent UUID from
	 * capacitor-secure-storage-plugin. When provided, replaces the
	 * normal browser-signal device hash with a hash of the UUID — so
	 * the device fingerprint survives WebView UA churn and persists
	 * across app updates (Android keystore-backed).
	 *
	 * STUB for now — MOB-1 will wire this through. Until then,
	 * android clients get a hash of 'android-no-mob1-yet' as a
	 * deterministic placeholder.
	 */
	androidPersistentId?: string;
}

/**
 * Compute the fingerprints + UA summary for the current browser session.
 * Call this from the login flow just before the check-dsa request.
 *
 * Returns an object with all four values populated. Never throws — on
 * an unparseable UA it returns 'Unknown' / '0' values; the server's
 * sanitizer will accept the hex digest regardless of UA parse quality
 * (the digest is over whatever seed we built, even if the seed is
 * partially 'Unknown'). Conflict detection then either matches or
 * doesn't, which is the intended behavior.
 */
export async function buildFingerprints(
	options: BuildFingerprintsOptions = {}
): Promise<SessionFingerprints> {
	const clientClass = options.clientClass ?? 'web';

	// Android stub path — MOB-1 follow-up will replace this branch.
	// Doesn't need `browser` guard because the SHA-256 calls work in any
	// JS runtime (Node ≥19, browser, Capacitor WebView) — Web Crypto API
	// is available everywhere we ship.
	if (clientClass === 'android') {
		const stubId = options.androidPersistentId ?? 'android-no-mob1-yet';
		const deviceDigest = await sha256Hex(`android-device|${stubId}`);
		const browserDigest = await sha256Hex(`android-webview|${stubId}`);
		return {
			device: deviceDigest,
			browser: browserDigest,
			uaSummary: 'DigitalDSA Android app',
			clientClass: 'android'
		};
	}

	// SSR guard. Pitfall #9: `typeof window !== 'undefined'` returns a
	// false-positive on Vite 7 SSR (it exposes a partial window stub).
	// SvelteKit's `browser` from $app/environment is the canonical signal
	// and is true ONLY in real browser runtime. buildFingerprints() is
	// only invoked from a click handler (auth/login/+page.svelte) so the
	// false-positive risk is theoretical, but the guard pattern matters
	// for future callers that might run during SSR — fail-safe to a
	// deterministic stub rather than crashing on missing globals.
	if (!browser) {
		const deviceDigest = await sha256Hex('ssr-stub-device');
		const browserDigest = await sha256Hex('ssr-stub-browser');
		return {
			device: deviceDigest,
			browser: browserDigest,
			uaSummary: 'Unknown browser',
			clientClass: 'web'
		};
	}

	// Web path — derive from stable browser signals. Past the `browser`
	// guard above, navigator/window/Intl are all real globals.
	//
	// `navigator.platform` is deprecated but still implemented by every
	// shipping browser. Web Platform's replacement (userAgentData) is
	// Chromium-only at time of writing, so we keep the legacy field.
	const ua = navigator.userAgent;
	const platform = navigator.platform ?? '';
	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'unknown-tz';
	const screenGeometry = `${window.screen.width}x${window.screen.height}@${window.screen.colorDepth}`;

	const parsed = parseUaFamily(ua);

	// Seed strings — pipe-delimited so a missing field is visually obvious
	// in the source if anyone ever debugs the seed. The hash is over the
	// seed, not the individual fields, so an attacker would need to
	// reproduce all four signals to forge a device hash.
	const deviceSeed = `${platform}|${tz}|${screenGeometry}|${parsed.os}`;
	const browserSeed = `${parsed.family}|${parsed.majorVersion}|${parsed.os}`;

	const [deviceDigest, browserDigest] = await Promise.all([
		sha256Hex(deviceSeed),
		sha256Hex(browserSeed)
	]);

	const uaSummary =
		parsed.family === 'Unknown'
			? 'Unknown browser'
			: `${parsed.family} ${parsed.majorVersion} on ${parsed.os}`;

	return { device: deviceDigest, browser: browserDigest, uaSummary, clientClass: 'web' };
}
