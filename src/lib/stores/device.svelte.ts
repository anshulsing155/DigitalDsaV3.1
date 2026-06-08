/**
 * Device State — Svelte 5 Runes
 * ══════════════════════════════════════════════════════════════════
 * Canonical source for device/viewport state.
 * Replaces the Svelte 4 writable/derived stores in device.ts.
 * ══════════════════════════════════════════════════════════════════
 */

import { getPlatformName } from '$lib/utils/api';
import { browser } from '$app/environment';

class DeviceState {
	width = $state<number>(browser ? window.innerWidth : 0);
	isNative = $state<boolean>(['ios', 'android'].includes(getPlatformName()));
	loader = $state<boolean>(true);

	get isMobile(): boolean {
		return this.width <= 768;
	}

	constructor() {
		if (browser) {
			// Keep width updated on resize
			window.addEventListener('resize', () => {
				this.width = window.innerWidth;
			});
		}
	}
}

export const deviceState = new DeviceState();
