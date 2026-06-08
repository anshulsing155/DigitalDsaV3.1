/**
 * ARCHIVED FILE — 2026-02-27
 *
 * This file has been archived because:
 * - Svelte 5 runes migration complete (canonical: device.svelte.ts)
 * - No active imports in new code
 * - Kept for backward compatibility only
 *
 * For new code: Import directly from '$lib/stores/device.svelte'
 * To restore: git mv src/lib/stores/_archive/legacy-shims/device.ts src/lib/stores/device.ts
 * To verify no imports: grep -r "from.*stores/device\.ts" src/
 */

/**
 * Device stores — backward-compatible bridge
 * ══════════════════════════════════════════════════════════════════
 * Re-exports from the canonical runes state in device.svelte.ts.
 * Import from here for Svelte 4 $ syntax; import deviceState
 * directly for Svelte 5 runes access.
 * ══════════════════════════════════════════════════════════════════
 */

import { fromRune, fromRuneReadonly } from './_bridge.svelte';
import { deviceState } from './device.svelte';

/** Viewport width (writable bridge) */
export const width = fromRune(
	() => deviceState.width,
	(v: number) => {
		deviceState.width = v;
	}
);

/** Is viewport <= 768px (read-only derived bridge) */
export const isMobile = fromRuneReadonly(() => deviceState.isMobile);

/** Is running on native platform — iOS or Android (writable bridge) */
export const isNative = fromRune(
	() => deviceState.isNative,
	(v: boolean) => {
		deviceState.isNative = v;
	}
);

/** App loader state (writable bridge) */
export const loader = fromRune(
	() => deviceState.loader,
	(v: boolean) => {
		deviceState.loader = v;
	}
);
