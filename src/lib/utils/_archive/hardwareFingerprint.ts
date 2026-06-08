/**
 * Hardware-Only Device Fingerprint (Client-Side)
 *
 * Generates a fingerprint using ONLY browser-independent hardware signals.
 * This hash is identical across Chrome, Firefox, Edge on the same physical device,
 * but different across different devices (laptop vs phone vs tablet).
 *
 * Used for single-device enforcement: logging in on a different device nukes
 * all sessions on the old device.
 *
 * Signals used (all browser-independent):
 * - screen.width × screen.height (monitor resolution)
 * - screen.colorDepth (hardware property)
 * - navigator.platform ("Win32", "MacIntel", "Linux x86_64", etc.)
 * - Intl timezone (OS-level setting)
 * - navigator.hardwareConcurrency (CPU cores — may vary slightly between browsers)
 *
 * Signals NOT used (browser-dependent):
 * - User agent string (different per browser)
 * - WebGL renderer (different per browser)
 * - Canvas fingerprint (different per browser)
 * - AudioContext (different per browser)
 */

import { browser } from '$app/environment';

/**
 * Generate a hardware-only fingerprint that's stable across browsers on the same device.
 * Returns a hex-encoded SHA-256 hash.
 */
export async function getHardwareFingerprint(): Promise<string> {
	if (!browser) return '';

	const signals: string[] = [];

	// Screen resolution (same across all browsers on same monitor)
	signals.push(`${screen.width}x${screen.height}`);
	signals.push(`cd:${screen.colorDepth}`);

	// Platform string (OS-level, browser-independent)
	signals.push(`p:${navigator.platform || 'unknown'}`);

	// Timezone (OS-level setting)
	try {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		signals.push(`tz:${tz}`);
	} catch {
		signals.push('tz:unknown');
	}

	// Hardware concurrency (CPU cores)
	// Note: may be capped in some privacy-focused browsers, but generally stable
	if (navigator.hardwareConcurrency) {
		signals.push(`cores:${navigator.hardwareConcurrency}`);
	}

	// Device pixel ratio (hardware-dependent)
	if (window.devicePixelRatio) {
		signals.push(`dpr:${window.devicePixelRatio}`);
	}

	const raw = signals.join('|');

	// SHA-256 hash
	const encoder = new TextEncoder();
	const data = encoder.encode(raw);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
