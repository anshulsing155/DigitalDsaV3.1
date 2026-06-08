/**
 * Chart color utilities that read from CSS variables.
 *
 * WHY CSS VARIABLES?
 * Chart.js renders to <canvas>, so it can't use `var(--ddsa-primary)` directly.
 * Instead, we read the computed CSS variable values at runtime via getComputedStyle().
 * This way charts automatically adapt to:
 * - Light / Dark mode toggle
 * - Any future theme changes
 *
 * FALLBACK: If we can't read CSS (SSR or missing root), we fall back to the
 * light-mode ddsa palette hex values.
 */

// ============================================================================
// CSS VARIABLE READER
// ============================================================================

/**
 * Read a CSS custom property value from :root.
 * Returns the fallback if the variable is unset or we're in SSR.
 */
function getCssVar(varName: string, fallback: string): string {
	if (typeof document === 'undefined') return fallback;
	const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
	return value || fallback;
}

// ============================================================================
// DYNAMIC COLOR GETTERS
// ============================================================================

/**
 * Get current chart colors by reading live CSS variables.
 *
 * Call this inside $effect or at render time — NOT at module scope.
 * This ensures colors update when the user toggles dark mode.
 *
 * IMPORTANT: For chart data to update on theme change, the parent
 * component's $derived that builds chart config must also depend on
 * themeState.scheme or themeState.resolved. Example:
 *
 *   import { themeState } from '$lib/stores/theme.svelte';
 *   let chart = $derived.by(() => {
 *     const _scheme = themeState.scheme; // track for reactivity
 *     return buildSomeChart(data);
 *   });
 *
 * Alternatively, use the useThemeVersion() helper below.
 */
export function getChartColors() {
	return {
		// --- Dataset colors ---
		principal: getCssVar('--chart-principal', '#8b9178'), // Gray (fixed)
		interest: getCssVar('--chart-interest', '#cb997e'), // Theme color (-500)
		balance: getCssVar('--chart-balance', '#8e5739'), // Darker theme tone (-700)
		info: getCssVar('--chart-info', '#d6ae99'), // Lighter theme tone (-300)
		warning: getCssVar('--chart-warning', '#d4a84e'), // Warning (semantic, fixed)
		special: getCssVar('--chart-special', '#ddbea9'), // Accent (-500)

		// --- Semi-transparent fills ---
		principalFill: getCssVar('--chart-principal-fill', 'rgba(122, 158, 126, 0.25)'),
		interestFill: getCssVar('--chart-interest-fill', 'rgba(203, 153, 126, 0.25)'),
		balanceFill: getCssVar('--chart-balance-fill', 'rgba(196, 112, 112, 0.08)'),

		// --- UI chrome ---
		labelColor: getCssVar('--chart-label-color', '#2b2d25'),
		gridColor: getCssVar('--chart-grid-color', 'rgba(0, 0, 0, 0.06)'),
		tooltipBg: getCssVar('--chart-tooltip-bg', 'rgba(43, 45, 37, 0.95)'),

		/** Card/chart background — used for segment borders and point outlines */
		cardBg: getCssVar('--dash-bg-card', '#ffffff')
	};
}

// ============================================================================
// STATIC FALLBACKS (for SSR and module-scope imports)
// ============================================================================

/**
 * Static color constants — light mode defaults.
 * Use these ONLY when you can't call getChartColors() (e.g., module scope).
 * Prefer getChartColors() in components for theme-awareness.
 */
export const CHART_COLORS = {
	primary: '#cb997e',
	secondary: '#2b2d25',
	accent: '#ddbea9',
	success: '#7a9e7e',
	warning: '#d4a84e',
	error: '#c47070',
	info: '#7a9ab8',
	lightBg: '#f5ebe5',
	darkText: '#2b2d25'
} as const;

export const CHART_COLORS_ALPHA = {
	primary: 'rgba(203, 153, 126, 0.3)',
	secondary: 'rgba(43, 45, 37, 0.15)',
	accent: 'rgba(221, 190, 169, 0.3)',
	success: 'rgba(122, 158, 126, 0.3)',
	warning: 'rgba(212, 168, 78, 0.3)',
	error: 'rgba(196, 112, 112, 0.3)',
	info: 'rgba(122, 154, 184, 0.3)'
} as const;

export const CHART_PALETTE = [
	CHART_COLORS.primary,
	CHART_COLORS.secondary,
	CHART_COLORS.success,
	CHART_COLORS.info,
	CHART_COLORS.warning,
	CHART_COLORS.accent,
	CHART_COLORS.error
] as const;
