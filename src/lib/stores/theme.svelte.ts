/**
 * Theme State — Svelte 5 Runes
 * ══════════════════════════════════════════════════════════════════
 * Manages light/dark/system theme + color schemes with localStorage.
 * ══════════════════════════════════════════════════════════════════
 */

import { browser } from '$app/environment';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export type ColorScheme = 'bronze' | 'ocean' | 'forest' | 'slate' | 'rose' | 'amber';

export const COLOR_SCHEMES = [
	{ id: 'bronze' as ColorScheme, label: 'Warm Bronze', swatch: '#cb997e' },
	{ id: 'ocean' as ColorScheme, label: 'Ocean Blue', swatch: '#3b82f6' },
	{ id: 'forest' as ColorScheme, label: 'Forest Green', swatch: '#10b981' },
	{ id: 'slate' as ColorScheme, label: 'Slate Modern', swatch: '#6366f1' },
	{ id: 'rose' as ColorScheme, label: 'Rose Pink', swatch: '#f43f5e' },
	{ id: 'amber' as ColorScheme, label: 'Amber Gold', swatch: '#f59e0b' }
] as const;

const STORAGE_KEY = 'ddsa-theme';
const SCHEME_KEY = 'ddsa-scheme';
const VALID_SCHEMES: ColorScheme[] = ['bronze', 'ocean', 'forest', 'slate', 'rose', 'amber'];

function getSystemPreference(): ResolvedTheme {
	// `browser` from $app/environment is the Vite-aware guard — it's false on the
	// server even when Vite 7 SSR exposes a partial `window` object. Still
	// double-check matchMedia exists in case browser supports it via polyfill.
	if (!browser || typeof window.matchMedia !== 'function') return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
	if (mode === 'system') return getSystemPreference();
	return mode;
}

function applyTheme(resolved: ResolvedTheme) {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	if (resolved === 'dark') {
		root.classList.add('dark');
	} else {
		root.classList.remove('dark');
	}
}

function applyScheme(scheme: ColorScheme) {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	if (scheme === 'bronze') {
		root.removeAttribute('data-scheme');
	} else {
		root.setAttribute('data-scheme', scheme);
	}
}

class ThemeState {
	mode = $state<ThemeMode>('system');
	resolved = $state<ResolvedTheme>(resolveTheme('system'));
	scheme = $state<ColorScheme>('bronze');

	init() {
		if (!browser) return;

		// Restore theme mode
		const storedMode = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
		this.mode =
			storedMode && ['light', 'dark', 'system'].includes(storedMode) ? storedMode : 'system';
		this.resolved = resolveTheme(this.mode);
		applyTheme(this.resolved);

		// Restore color scheme
		const storedScheme = localStorage.getItem(SCHEME_KEY) as ColorScheme | null;
		this.scheme = storedScheme && VALID_SCHEMES.includes(storedScheme) ? storedScheme : 'bronze';
		applyScheme(this.scheme);

		// Listen for system preference changes
		const mql = window.matchMedia('(prefers-color-scheme: dark)');
		mql.addEventListener('change', () => {
			if (this.mode !== 'system') return;
			this.resolved = getSystemPreference();
			applyTheme(this.resolved);
		});
	}

	setTheme(mode: ThemeMode) {
		this.mode = mode;
		this.resolved = resolveTheme(mode);
		applyTheme(this.resolved);
		// Use `browser` from $app/environment — Vite 7 SSR can expose a partial
		// `localStorage` object so `typeof localStorage !== 'undefined'` is unreliable
		// (CLAUDE.md pitfall #9).
		if (browser) {
			localStorage.setItem(STORAGE_KEY, mode);
		}
	}

	setScheme(scheme: ColorScheme) {
		this.scheme = scheme;
		applyScheme(scheme);
		if (browser) {
			localStorage.setItem(SCHEME_KEY, scheme);
		}
	}

	toggleTheme() {
		const order: ThemeMode[] = ['light', 'dark', 'system'];
		const currentIndex = order.indexOf(this.mode);
		const nextMode = order[(currentIndex + 1) % order.length];
		this.setTheme(nextMode);
	}
}

export const themeState = new ThemeState();
