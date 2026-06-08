/**
 * BRIDGE FILE — Re-exports device.svelte.ts
 *
 * Exists only for backward compatibility with archived code.
 * New code should import from '$lib/stores/device.svelte'
 *
 * This file exists to prevent type errors in src/_archived/ routes that
 * still import from this location.
 *
 * @deprecated Use deviceState from '$lib/stores/device.svelte' instead.
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
