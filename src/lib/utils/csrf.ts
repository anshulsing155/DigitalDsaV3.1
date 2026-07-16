/**
 * CSRF Token Helper + Secure Fetch Wrapper
 * ══════════════════════════════════════════════════════════════════
 * Use `secureFetch` instead of raw `fetch()` for ALL API calls.
 *
 * Features:
 *   1. Automatic CSRF token injection for state-changing methods
 *   2. Automatic JWT refresh on 401 — retries the original request once
 *   3. Serialized refresh — concurrent 401s trigger only ONE refresh call
 *   4. Always includes credentials (for HttpOnly cookies)
 * ══════════════════════════════════════════════════════════════════
 */

import { browser } from '$app/environment';

// ── CSRF Token ──────────────────────────────────────────────────

/**
 * Get CSRF token from cookie
 */
export function getCSRFToken(): string | null {
	if (!browser) return null;

	const cookies = document.cookie.split(';');
	const csrfCookie = cookies.find((c) => c.trim().startsWith('csrf-token='));

	if (!csrfCookie) return null;

	// Use slice instead of split to handle tokens containing '=' (e.g., base64 padding)
	const trimmed = csrfCookie.trim();
	const eqIndex = trimmed.indexOf('=');
	return eqIndex >= 0 ? trimmed.slice(eqIndex + 1) : null;
}

// ── JWT Auto-Refresh ────────────────────────────────────────────

/**
 * Shared promise to serialize concurrent refresh attempts.
 * When multiple requests hit 401 at the same time, only one
 * refresh call fires — all others await the same promise.
 */
let refreshInFlight: Promise<boolean> | null = null;

/**
 * Attempt to refresh the JWT access token via the refresh endpoint.
 * Returns true if refresh succeeded (new cookies set by server).
 *
 * Internal — call `requestTokenRefresh()` instead, which coalesces
 * concurrent calls via the `refreshInFlight` singleton. Without
 * coalescing, the scheduler + a parallel `secureFetch` 401-retry
 * could race: both POST the same (now-stale) refresh token, the
 * second hits the endpoint's token-reuse detection (which nukes ALL
 * sessions for the user — see /api/auth/refresh-token line 99-128).
 */
async function attemptTokenRefresh(): Promise<boolean> {
	try {
		const csrfToken = getCSRFToken();
		const response = await fetch('/api/auth/refresh-token', {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
			}
		});

		if (!response.ok) return false;

		const result = await response.json();
		return result.success === true;
	} catch {
		// Network error during refresh — token stays expired
		return false;
	}
}

/**
 * Public refresh wrapper. Coalesces concurrent callers through
 * `refreshInFlight` so the scheduler and `secureFetch` 401-retry can
 * safely race without triggering token-reuse detection on the server.
 *
 * Pitfall #59: this MUST be the only entry point external code uses to
 * trigger a refresh. Calling `attemptTokenRefresh` directly bypasses
 * the singleton and re-opens the race.
 */
export function requestTokenRefresh(): Promise<boolean> {
	if (!refreshInFlight) {
		refreshInFlight = attemptTokenRefresh().finally(() => {
			refreshInFlight = null;
		});
	}
	return refreshInFlight;
}

// ── Proactive Refresh Scheduler ─────────────────────────────────

/**
 * Access token TTL in seconds (mirrors src/lib/server/sessionConstants.ts).
 * Hardcoded here because client-side code can't import server modules and
 * the value is small / rarely changes. If server constant changes, update both.
 */
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
/** Refresh this many seconds before expiry — gives a comfortable buffer. */
const REFRESH_LEAD_SECONDS = 120;

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Start a recurring proactive token refresh — fires ~2 min before the access
 * token would expire, keeps the session alive transparently. Without this,
 * a DSA on a long form-fill session (>15 min) hits a hard 401 on their next
 * page navigation and lands on the "Session expired" error page mid-flow
 * (user-reported 2026-05-26 in BL form testing).
 *
 * Pitfall #59 (initial-refresh race): the OLD implementation waited the full
 * 13 minutes (15 min TTL − 2 min lead) before the FIRST refresh fired. So if
 * the (app) layout mounted ≥3 minutes after login (e.g. the user landed on
 * the public dashboard first, then opened the form), the access token expired
 * BEFORE the scheduler's first tick. The next SvelteKit navigation hit a
 * server-side 401 on `requireAuth` and dumped the user on the "Session
 * expired" error page — exactly the user's reported repro on
 * `/form/how-can-we-help`.
 *
 * Fix: fire an eager refresh on FIRST CALL (immediately on mount), THEN
 * schedule the next at T+13min from that successful refresh. The eager
 * refresh goes through `requestTokenRefresh()` which coalesces with any
 * in-flight `secureFetch` 401-retry → no token-reuse race against the
 * server's rotation.
 *
 * Safe to call multiple times — each call cancels the prior timer.
 * Stops automatically if a refresh fails (server-side hooks will redirect
 * to /login on the next request anyway).
 */
export function startTokenRefreshScheduler(): void {
	if (!browser) return;
	stopTokenRefreshScheduler();

	// Fire an immediate refresh BEFORE scheduling the recurring timer.
	// async-IIFE so the function itself stays sync (matches the prior
	// signature; callers expect no awaitable from this).
	void (async () => {
		const ok = await requestTokenRefresh();
		// On failure here, do not schedule — the user is probably already
		// past refresh-token expiry. The next navigation will be redirected
		// to /login by hooks.server.ts the normal way.
		if (!ok) return;
		scheduleNextRefresh();
	})();
}

/** Internal — queue the next periodic refresh from `now + (TTL − lead)`. */
function scheduleNextRefresh(): void {
	if (!browser) return;
	stopTokenRefreshScheduler();
	const delayMs = (ACCESS_TOKEN_TTL_SECONDS - REFRESH_LEAD_SECONDS) * 1000;
	refreshTimer = setTimeout(async () => {
		const ok = await requestTokenRefresh();
		if (ok) scheduleNextRefresh();
	}, delayMs);
}

/**
 * Cancel any pending proactive refresh. Call on logout to avoid trying to
 * refresh a session that's intentionally being torn down.
 */
export function stopTokenRefreshScheduler(): void {
	if (refreshTimer !== null) {
		clearTimeout(refreshTimer);
		refreshTimer = null;
	}
}

// ── Secure Fetch ────────────────────────────────────────────────

/**
 * Extra options recognized by `secureFetch` beyond `RequestInit`.
 *
 * `timeoutMs` aborts the request after the given number of milliseconds via
 * `AbortController`. If the caller passes their own `signal`, it is preserved
 * and combined with the timeout signal — whichever fires first wins.
 */
export interface SecureFetchInit extends RequestInit {
	timeoutMs?: number;
}

/**
 * Fetch wrapper with automatic CSRF token injection and JWT auto-refresh.
 *
 * Use this instead of raw fetch() for all API calls.
 *
 * On 401:
 *   1. Calls /api/auth/refresh-token to rotate the JWT
 *   2. If refresh succeeds, re-reads CSRF token and retries the original request
 *   3. If refresh fails, returns the 401 response (session is dead)
 *   4. Concurrent 401s share a single refresh call (no thundering herd)
 *
 * Optional `timeoutMs` aborts the request via AbortController.
 */
export async function secureFetch(
	url: string | URL,
	options: SecureFetchInit = {}
): Promise<Response> {
	// SEC-10 short-circuit. Once /api/auth/session-status has detected
	// this tab is revoked, the kicked-modal is displaying and we're
	// counting down to redirect. Background fetches during that 5-second
	// window would all 401 — surfacing as console errors from whatever
	// component invoked them. Silently return a synthetic 401 so callers
	// resolve cleanly without network noise. The component-level error
	// handlers downstream see a normal 401 and bail without logging.


	const { timeoutMs, signal: callerSignal, ...rest } = options;
	const fetchOptions: RequestInit = { ...rest };

	const method = fetchOptions.method?.toUpperCase() || 'GET';

	// For state-changing methods, add CSRF token
	if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
		const csrfToken = getCSRFToken();

		if (!csrfToken) {
			throw new Error('CSRF token not found. Please refresh the page.');
		}

		fetchOptions.headers = {
			...fetchOptions.headers,
			'X-CSRF-Token': csrfToken
		};
	}

	// Always include credentials (for HttpOnly cookies)
	fetchOptions.credentials = 'include';

	// Wire the timeout signal — combine with caller's signal if both are present
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	if (timeoutMs && timeoutMs > 0 && browser) {
		const timeoutController = new AbortController();
		timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

		if (callerSignal) {
			// Forward an existing abort from the caller
			if (callerSignal.aborted) {
				timeoutController.abort();
			} else {
				callerSignal.addEventListener('abort', () => timeoutController.abort(), { once: true });
			}
		}
		fetchOptions.signal = timeoutController.signal;
	} else if (callerSignal) {
		fetchOptions.signal = callerSignal;
	}

	try {
		const response = await fetch(url, fetchOptions);

		// ── Auto-refresh on 401 (expired JWT) ──
		if (response.status === 401 && browser) {
			// Pitfall #59: coalesce via requestTokenRefresh() so this path and
			// the proactive scheduler share one refresh round-trip — prevents
			// the server's token-reuse detection from nuking the session when
			// both fire near-simultaneously.
			const refreshed = await requestTokenRefresh();

			if (refreshed) {
				// CSRF token may have been rotated — re-read from cookie
				if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
					const freshCsrfToken = getCSRFToken();
					if (freshCsrfToken) {
						fetchOptions.headers = {
							...fetchOptions.headers,
							'X-CSRF-Token': freshCsrfToken
						};
					}
				}

				// Retry the original request exactly once
				return await fetch(url, fetchOptions);
			}

			// Refresh failed — session is truly dead, return the original 401
		}

		return response;
	} finally {
		if (timeoutId !== null) clearTimeout(timeoutId);
	}
}
