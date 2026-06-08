/**
 * D.1 S2.5 — Capacitor Android mandate-auth deep-link bridge
 * ══════════════════════════════════════════════════════════════════
 * When the DSA hits Subscribe on the Billing page, we need to open
 * Razorpay's hosted authorization URL and bring the DSA back to our
 * app after they complete bank-side auth. On web this is just
 * window.location; on Android Capacitor we use a custom URL scheme
 * (`digitaldsa://billing/auth-return`) so Android can route the
 * deep-link return to our app.
 *
 * This module is the platform-aware shim. Most of it is pure helper
 * logic — the Capacitor-runtime pieces are isolated so tests cover
 * the parsing + URL building without a Capacitor environment.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S2.5 + critique P1-11
 *
 * NOTE on dependencies: this uses `@capacitor/app` (already in deps)
 * to open external URLs + listen for deep-link returns. A future
 * upgrade to `@capacitor/browser` would give us in-app Custom Tabs
 * (better UX — DSA sees they're still inside DigitalDSA brand) without
 * changing this module's external contract. TODO when @capacitor/browser
 * is added to deps.
 * ══════════════════════════════════════════════════════════════════
 */

import { browser } from '$app/environment';

// ── URL scheme constants ───────────────────────────────────────

/**
 * The custom URL scheme our Android app handles. Must match the
 * intent-filter declared in `android/app/src/main/AndroidManifest.xml`
 * (manual step — Capacitor doesn't auto-generate custom scheme intent
 * filters from capacitor.config.ts in v7).
 *
 * Required AndroidManifest.xml addition (inside the main <activity>):
 *
 *   <intent-filter android:autoVerify="false">
 *     <action android:name="android.intent.action.VIEW" />
 *     <category android:name="android.intent.category.DEFAULT" />
 *     <category android:name="android.intent.category.BROWSABLE" />
 *     <data android:scheme="digitaldsa" />
 *   </intent-filter>
 *
 * Without this, Android won't route `digitaldsa://...` deep-links to
 * the app and the auth-return callback will never fire.
 */
export const APP_URL_SCHEME = 'digitaldsa';

/**
 * Path component for the mandate-auth-return deep-link.
 * Full URL form: `digitaldsa://billing/auth-return?status=...&pending_registration_id=...`
 */
export const AUTH_RETURN_PATH = '/billing/auth-return';

/**
 * Build the full custom-scheme deep-link URL that Razorpay redirects to
 * (or that we pass as a `callback_url` if Razorpay supports it).
 *
 * Razorpay's hosted-checkout doesn't currently support custom URL
 * schemes as redirect targets — they expect HTTPS URLs. For Android,
 * the redirect URL is our HTTPS billing page, and the Android intent-
 * filter routes BOTH the https-scheme AND the custom scheme to our app.
 * See capacitor.config.ts for the intent-filter config.
 */
export function buildAuthReturnUrl(params: {
	status?: 'success' | 'cancelled' | 'unknown';
	pending_registration_id?: string;
}): string {
	const search = new URLSearchParams();
	if (params.status) search.set('status', params.status);
	if (params.pending_registration_id) {
		search.set('pending_registration_id', params.pending_registration_id);
	}
	const qs = search.toString();
	return `${APP_URL_SCHEME}://${AUTH_RETURN_PATH.replace(/^\//, '')}${qs ? `?${qs}` : ''}`;
}

// ── Return-URL parsing ────────────────────────────────────────

export interface AuthReturnPayload {
	status: 'success' | 'cancelled' | 'unknown';
	pending_registration_id?: string;
}

/**
 * Parse an inbound deep-link URL into its return payload. Accepts both
 * the custom-scheme form (`digitaldsa://billing/auth-return?...`) AND
 * the HTTPS form (`https://digitaldsa.com/billing/auth-return?...`) so
 * the same handler works for both Android (custom-scheme intent) and
 * web (https redirect).
 *
 * Returns null when the URL doesn't match the auth-return path.
 */
export function parseAuthReturnUrl(url: string): AuthReturnPayload | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}

	// Path must end with /billing/auth-return — accept both with and without
	// trailing slash, and both schemes.
	const path = parsed.pathname.replace(/\/$/, '');
	if (path !== AUTH_RETURN_PATH && parsed.host + path !== AUTH_RETURN_PATH.replace(/^\//, '')) {
		// Custom-scheme URLs put the path in different places depending on
		// URL parser. Fall back to checking the href as a substring.
		if (!url.includes(AUTH_RETURN_PATH)) return null;
	}

	const status = parsed.searchParams.get('status');
	const pending_registration_id = parsed.searchParams.get('pending_registration_id');

	return {
		status:
			status === 'success' || status === 'cancelled'
				? status
				: 'unknown',
		pending_registration_id: pending_registration_id ?? undefined
	};
}

// ── Platform detection ────────────────────────────────────────

/**
 * True when running inside Capacitor's Android shell (NOT web browser).
 * Used to branch the open-URL logic between window.location and
 * Capacitor's App.openUrl.
 *
 * Detection: `window.Capacitor` is set by Capacitor's runtime.
 * Safe-guarded for SSR (browser flag from $app/environment).
 */
export function isCapacitorAndroid(): boolean {
	if (!browser) return false;
	const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
	if (!cap) return false;
	const isNative = typeof cap.isNativePlatform === 'function' ? cap.isNativePlatform() : false;
	const platform = typeof cap.getPlatform === 'function' ? cap.getPlatform() : 'web';
	return isNative && platform === 'android';
}

// ── Capacitor-runtime side (only callable in browser/native context) ──

/**
 * Open the Razorpay authorization URL.
 *
 * v1 approach (both web AND Capacitor): `window.location.href = url`.
 * The WebView navigates to Razorpay's hosted page; user completes auth;
 * Razorpay redirects to our HTTPS Billing page; capacitor.config.ts's
 * `server.url: 'https://digitaldsa.com'` + `androidScheme: 'https'`
 * make the WebView automatically handle the return URL like a normal
 * SvelteKit navigation — no custom URL scheme needed for this path.
 *
 * v2 refinement (deferred): `@capacitor/browser` Custom Tabs gives a
 * better UX (Android security indicators, "Powered by Chrome"). The
 * deep-link return helpers below (parseAuthReturnUrl, onAuthReturn) are
 * already built for that flow — when we add `@capacitor/browser` to
 * deps, swap this function's body to `Browser.open({url})` and the
 * return handler activates automatically.
 *
 * Throws if called server-side (SSR).
 */
export async function openAuthorizationUrl(url: string): Promise<void> {
	if (!browser) throw new Error('openAuthorizationUrl must be called in browser context');
	// Unified web + WebView path for v1. See JSDoc above for v2 refinement.
	window.location.href = url;
}

/**
 * Register a callback for the deep-link return from Razorpay's auth flow.
 *
 * v1 (current): both web AND Capacitor WebView use the HTTPS-redirect
 *   path, so the auth return lands on the Billing page like any normal
 *   SvelteKit navigation. The Billing page's onMount inspects the URL
 *   search params and decides whether to trigger status polling.
 *   This function is a no-op in v1 — no listener needed.
 *
 * v2 (deferred — when @capacitor/browser lands):
 *   Capacitor's `appUrlOpen` event fires when the OS routes a
 *   `digitaldsa://billing/auth-return?...` deep-link back to the app
 *   from Custom Tabs. This function will subscribe to that event,
 *   filter for our auth-return path, parse the payload, invoke the
 *   callback. The intent-filter must be in AndroidManifest.xml (see
 *   APP_URL_SCHEME jsdoc).
 *
 * Returns: cleanup function (call onDestroy to unsubscribe).
 */
export async function onAuthReturn(
	_callback: (payload: AuthReturnPayload) => void
): Promise<() => void> {
	// v1: no-op. The HTTPS redirect path doesn't need a deep-link listener
	// since the WebView handles the redirect natively. _callback is
	// preserved in the function signature for the v2 upgrade path.
	return () => {
		/* no-op */
	};
}
