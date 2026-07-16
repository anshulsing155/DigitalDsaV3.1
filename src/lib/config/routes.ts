/**
 * Centralized Route Constants
 * ══════════════════════════════════════════════════════════════════
 * Single source of truth for ALL navigation paths in the application.
 *
 * WHY: Eliminates 100+ hardcoded route strings scattered across 56+ files.
 * Routes are renamed in ONE place (here) and all consumers update automatically.
 *
 * CONVENTION: All routes use kebab-case (SvelteKit standard).
 * ══════════════════════════════════════════════════════════════════
 */

// ============================================================================
// ROUTE CONSTANTS
// ============================================================================

export const ROUTES = {
	HOME: '/',
	LOGIN: '/login',
	PARTNER_SIGNUP: '/partner-signup',



	// ── Evaluating ───────────────────────────────────────────────
	EVALUATING: '/evaluating',

	// ── Legal ────────────────────────────────────────────────────
	LEGAL: {
		TERMS: '/terms',
		PRIVACY: '/privacy'
	},

	// ── Dev-only ─────────────────────────────────────────────────
} as const;

export const LOAN_TYPE_FORM_ROUTES: Record<string, string> = {};

export function howCanWeHelpRoute(loanName: string): string {
	return `/contact?loan=${encodeURIComponent(loanName)}`;
}
