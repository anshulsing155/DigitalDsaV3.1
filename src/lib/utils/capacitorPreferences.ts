/**
 * Lazy loader for @capacitor/preferences
 * ════════════════════════════════════════════════════════════════════
 * Static `import { Preferences } from '@capacitor/preferences'` at module
 * scope crashes Vite SSR with `window.addEventListener is not a function` —
 * the @capacitor plugin's CJS init runs at module-load time and references
 * browser globals that don't exist in the Node SSR runtime.
 *
 * This helper defers the import until first use. Always returns null on the
 * server so callers can short-circuit without an `if (browser)` wrapper at
 * every call site.
 *
 * THENABLE TRAP
 * ─────────────
 * Capacitor's `Preferences` API is a Proxy that intercepts every property
 * access — including `.then`. If we returned the raw proxy from an async
 * function, JavaScript's `await` machinery would detect `.then` and try to
 * unwrap the proxy as if it were a Promise. The proxy responds by treating
 * `.then` as a plugin method call, and Capacitor throws
 * `"Preferences.then()" is not implemented on web`.
 *
 * To prevent that, we wrap the Preferences object in a `{ Preferences }`
 * envelope. Callers destructure it: `const { Preferences } = await getPreferences()`.
 * The envelope is a plain object with no `then` property, so the await
 * resolves cleanly without invoking the proxy.
 *
 * Usage:
 *   const result = await getPreferences();
 *   if (!result) return; // server-side, load failed, or not available
 *   const { Preferences } = result;
 *   await Preferences.set({ key, value });
 * ════════════════════════════════════════════════════════════════════
 */
import { browser } from '$app/environment';
import clientLogger from '$lib/utils/clientLogger';

type PreferencesApi = typeof import('@capacitor/preferences')['Preferences'];

interface PreferencesEnvelope {
	Preferences: PreferencesApi;
}

let cached: PreferencesEnvelope | null = null;

export async function getPreferences(): Promise<PreferencesEnvelope | null> {
	if (!browser) return null;
	if (cached) return cached;
	try {
		const mod = await import('@capacitor/preferences');
		cached = { Preferences: mod.Preferences };
		return cached;
	} catch (err) {
		clientLogger.error({ err }, '[capacitorPreferences] Failed to load @capacitor/preferences');
		return null;
	}
}
