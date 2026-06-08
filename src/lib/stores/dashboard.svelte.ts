/**
 * Dashboard State — Svelte 5 Runes
 * ══════════════════════════════════════════════════════════════════
 * Manages sample data visibility per role with localStorage persistence.
 * ══════════════════════════════════════════════════════════════════
 */

import { browser } from '$app/environment';

const STORAGE_KEY = 'dashboard-sample-visible';

interface SampleDataVisibility {
	dsa: boolean;
	rm: boolean;
}

function getInitialValue(): SampleDataVisibility {
	if (browser) {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				return { dsa: parsed.dsa ?? true, rm: parsed.rm ?? true };
			} catch {
				// ignore parse errors
			}
		}
	}
	return { dsa: true, rm: true };
}

class DashboardState {
	private _initial = getInitialValue();
	dsa = $state(this._initial.dsa);
	rm = $state(this._initial.rm);

	constructor() {
		if (browser) {
			$effect.root(() => {
				$effect(() => {
					localStorage.setItem(STORAGE_KEY, JSON.stringify({ dsa: this.dsa, rm: this.rm }));
				});
			});
		}
	}

	dismiss() {
		this.dsa = false;
	}
	dismissRm() {
		this.rm = false;
	}
	reset() {
		this.dsa = true;
		this.rm = true;
	}
}

export const dashboardState = new DashboardState();
