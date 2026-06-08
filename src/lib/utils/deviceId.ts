/**
 * Client device identifier (free-trial abuse defense, 2026-05-28)
 * ══════════════════════════════════════════════════════════════════════
 * Returns a stable, per-device UUID used as the fourth identifier in the
 * trial-abuse defense (alongside mobile / PAN / GST). See ADR-0018.
 *
 * Strategy: lazy-generated UUIDv4 stored in localStorage under a stable
 * key, with a sessionStorage fallback for environments where localStorage
 * is blocked (Safari private mode, some corporate policies). Returns null
 * when both stores are unavailable — in that case the trial gate falls
 * back to the 3 PII identifiers only.
 *
 * Why localStorage (not a server-set cookie or Capacitor Device.getId()):
 *   - Works identically for web browser AND Capacitor WebView (in-app);
 *     the WebView's localStorage is persistent as long as the app isn't
 *     uninstalled, which matches what Capacitor's native Device.getId()
 *     would give us (it resets on factory reset / reinstall too).
 *   - No new dependency. No native sync. No platform-specific code.
 *   - Cookie-based tracking would either be HttpOnly (server can't share
 *     with the client to send back in a custom header) or need a separate
 *     CSRF-safe path. localStorage is simpler.
 *
 * Resettability — this is intentional, not a bug. A DSA who legitimately
 * clears site data shouldn't be punished forever; they'll generate a new
 * device-id on next visit, which lets them attempt a trial. The mobile /
 * PAN / GST checks STILL catch them at the same DSA-identity level.
 * Device-id is the "lazy abuser" layer, not the "determined abuser" layer.
 * ══════════════════════════════════════════════════════════════════════
 */

import { browser } from '$app/environment';
import { safeLocalStorage, safeSessionStorage } from './safeStorage';

/** localStorage key under which the device-id UUID is persisted. */
const DEVICE_ID_KEY = 'ddsa-device-id';

/**
 * Generate a UUIDv4. Uses the built-in `crypto.randomUUID()` when available
 * (modern browsers + Node.js 19+); falls back to a math-based generator
 * otherwise. The fallback is fine here because the device-id only needs
 * to be unique on this device, not cryptographically unguessable.
 */
function generateUuid(): string {
	try {
		if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
			return crypto.randomUUID();
		}
	} catch {
		// crypto.randomUUID can throw on older browsers in insecure context
	}
	// Math.random fallback — UUID v4 shape with bit-fiddling.
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

/**
 * Get (or create + persist) this device's stable UUID. Returns null when
 * called server-side OR when both localStorage and sessionStorage are
 * unavailable.
 *
 * First call on a fresh device: generates a UUID, persists it, returns it.
 * Subsequent calls: returns the persisted UUID.
 *
 * Persistence priority:
 *   1. localStorage — survives across sessions + browser restarts
 *   2. sessionStorage — survives within a session; we generate fresh on
 *      next session, which means the trial gate is weaker (a determined
 *      user can clear cookies, refresh, and look like a new device). But
 *      this is strictly better than nothing.
 *   3. None — both blocked; return null, gate degrades to 3 identifiers.
 */
export function getOrCreateDeviceId(): string | null {
	if (!browser) return null;

	// Try localStorage first (stable across sessions).
	const fromLocal = safeLocalStorage.getItem(DEVICE_ID_KEY);
	if (fromLocal) return fromLocal;

	// Fall back to sessionStorage (lasts for this session only).
	const fromSession = safeSessionStorage.getItem(DEVICE_ID_KEY);
	if (fromSession) return fromSession;

	// Neither available — generate fresh and try to persist.
	const fresh = generateUuid();

	// Try localStorage first; if that fails, sessionStorage. safeStorage
	// wrappers swallow exceptions internally, so the only signal we get
	// is "did the value actually persist?" — re-read to verify.
	safeLocalStorage.setItem(DEVICE_ID_KEY, fresh);
	if (safeLocalStorage.getItem(DEVICE_ID_KEY) === fresh) return fresh;

	safeSessionStorage.setItem(DEVICE_ID_KEY, fresh);
	if (safeSessionStorage.getItem(DEVICE_ID_KEY) === fresh) return fresh;

	// Neither store accepted the write — return the fresh value anyway
	// for this single request; it won't be remembered next time, but the
	// gate will still record a hash for this trial attempt.
	return fresh;
}
