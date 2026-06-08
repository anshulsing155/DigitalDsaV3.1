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

	// ── Form Routes ──────────────────────────────────────────────
	FORM: {
		ROOT: '/form',
		HOW_CAN_WE_HELP: '/form/how-can-we-help',
		HOME_LOAN: '/form/home-loan',
		LAP: '/form/lap',
		PLOT_LOAN: '/form/plot-loan',
		UNSECURE_LOAN: {
			ROOT: '/form/unsecure-loan',
			PERSONAL: '/form/unsecure-loan/personal-loan',
			BUSINESS: '/form/unsecure-loan/business-loan',
			PROFESSIONAL: '/form/unsecure-loan/professional-loan'
		}
	},

	// ── Offer Pages ──────────────────────────────────────────────
	OFFERS: {
		HOME_LOAN: '/home-loan-offers',
		LAP: '/lap-offers',
		PLOT: '/plot-offers',
		PERSONAL: '/personal-loan-offers',
		BUSINESS: '/business-offers',
		PROFESSIONAL: '/professional-offers'
		// TOPUP + BALANCE_TRANSFER constants removed in S214 (TECH-DEBT-CLEANUP
		// D7, ADR-0020 + ADR-0024) — the routes they pointed at were dead UI
		// (no writer for their localStorage keys, no caller for the URL constants)
		// and have been archived to _archived_topup-loan-offers/ and
		// _archived_balance-transfer-offers/. See docs/OFFERS-ARCHITECTURE.md §6.
	},

	// ── Application Pages ────────────────────────────────────────
	APPLICATION: {
		HOME_LOAN: '/home-loan-application',
		LAP: '/lap-loan-application',
		PLOT: '/plot-loan-application',
		PERSONAL: '/personal-loan-application',
		BUSINESS: '/business-loan-application',
		PROFESSIONAL: '/professional-loan-application',
		GENERIC: '/loan-application'
	},

	// ── Dashboard ────────────────────────────────────────────────
	DASHBOARD: {
		ROOT: '/dashboard',
		DSA: {
			ROOT: '/dashboard/dsa',
			CASES: '/dashboard/dsa/cases',
			ANALYTICS: '/dashboard/dsa/analytics',
			PROFILE: '/dashboard/dsa/profile',
			CRM: '/dashboard/dsa/crm',
			COMMUNICATION: '/dashboard/dsa/communication',
			TEAM: '/dashboard/dsa/team',
			RM_CONTACTS: '/dashboard/dsa/rm-contacts',
			SHARED_LINKS: '/dashboard/dsa/shared-links',
			BILLING: '/dashboard/dsa/billing'
		},
		RM: {
			ROOT: '/dashboard/rm',
			CASES: '/dashboard/rm/cases',
			ANALYTICS: '/dashboard/rm/analytics',
			DSA_SEARCH: '/dashboard/rm/dsa-search',
			SUBMISSIONS: '/dashboard/rm/submissions',
			POLICY_CAPTURE: '/dashboard/rm/policy-capture',
			PMS: {
				ROOT: '/dashboard/rm/policies',
				ONBOARD_LENDER: '/dashboard/rm/policies/onboard-lender'
			}
		},
		ADMIN: {
			ROOT: '/dashboard/admin',
			AUDIT: '/dashboard/admin/audit',
			QA: '/dashboard/admin/qa',
			QA_COVERAGE: '/dashboard/admin/qa/coverage',
			RM_ASSIGNMENTS: '/dashboard/admin/rm-assignments'
		}
	},

	// ── Onboarding ───────────────────────────────────────────────
	ONBOARDING: {
		DSA: '/dsa-onboarding',
		RM: '/rm-onboarding'
	},

	// ── Tools (Calculators & Planners) ──────────────────────────
	TOOLS: {
		CALCULATORS: {
			ROOT: '/calculators',
			EMI: '/calculators/emi-calculator',
			ELIGIBILITY: '/calculators/eligibility-calculator',
			AFFORDABILITY: '/calculators/affordability-calculator',
			BALANCE_TRANSFER: '/calculators/balance-transfer-calculator',
			STAMP_DUTY: '/calculators/stamp-duty-calculator'
		},
		PLANNERS: {
			ROOT: '/planners',
			PART_PAYMENT: '/planners/part-payment-planner',
			FLEXIBLE_EMI: '/planners/flexible-emi-planner',
			BOTH: '/planners/both',
			RATE_RIPPLE: '/planners/rate-ripple-planner'
		},
		DASHBOARD: {
			ROOT: '/dashboard/dsa/tools',
			EMI: '/dashboard/dsa/tools/emi-calculator',
			ELIGIBILITY: '/dashboard/dsa/tools/eligibility-calculator',
			AFFORDABILITY: '/dashboard/dsa/tools/affordability-calculator',
			BALANCE_TRANSFER: '/dashboard/dsa/tools/balance-transfer-calculator',
			STAMP_DUTY: '/dashboard/dsa/tools/stamp-duty-calculator',
			PART_PAYMENT: '/dashboard/dsa/tools/part-payment-planner',
			FLEXIBLE_EMI: '/dashboard/dsa/tools/flexible-emi-planner',
			BOTH: '/dashboard/dsa/tools/both',
			RATE_RIPPLE: '/dashboard/dsa/tools/rate-ripple-planner'
		}
	},

	// ── Evaluating ───────────────────────────────────────────────
	EVALUATING: '/evaluating',

	// ── Legal ────────────────────────────────────────────────────
	LEGAL: {
		TERMS: '/terms',
		PRIVACY: '/privacy'
	},

	// ── Dev-only ─────────────────────────────────────────────────
	TEST_DASHBOARD: '/test-dashboard',

	// ── PMS API Routes ───────────────────────────────────────────
	API_PMS: {
		OTP_SEND: '/api/pms/otp/send',
		OTP_VERIFY: '/api/pms/otp/verify',
		LENDER_ASSIGNMENTS: '/api/pms/lender-assignments',
		LENDER_ASSIGNMENTS_ONBOARD: '/api/pms/lender-assignments/onboard',
		LENDER_ASSIGNMENTS_TRANSFER: '/api/pms/lender-assignments/transfer',
		POLICIES: '/api/pms/policies',
		PIPELINE: '/api/pms/pipeline',
		// Moved 2026-05-27 to /api/cron/* prefix so the CSRF skip in
		// hooks.server.ts applies — external schedulers cannot present a
		// CSRF token. The cron-secret header is the auth mechanism.
		CRON_RENEWAL_CHECK: '/api/cron/pms-renewal-check',
		CRON_PUBLISH_SCHEDULED: '/api/cron/pms-publish-scheduled'
	}
} as const;

// ============================================================================
// LOAN TYPE → FORM ROUTE MAPPING
// ============================================================================

/**
 * Maps display loan type names to their form route paths.
 * Used by caseHelpers (server) and navigation (client).
 */
export const LOAN_TYPE_FORM_ROUTES: Record<string, string> = {
	'Home Loan': ROUTES.FORM.HOME_LOAN,
	'Loan Against Property': ROUTES.FORM.LAP,
	'Plot and Construction Loan': ROUTES.FORM.PLOT_LOAN,
	'Plot Loan': ROUTES.FORM.PLOT_LOAN,
	'Personal Loan': ROUTES.FORM.UNSECURE_LOAN.PERSONAL,
	'Business Loan': ROUTES.FORM.UNSECURE_LOAN.BUSINESS,
	'Business Loan - Unsecured': ROUTES.FORM.UNSECURE_LOAN.BUSINESS,
	'Professional Loan': ROUTES.FORM.UNSECURE_LOAN.PROFESSIONAL
};

// ============================================================================
// HOW-CAN-WE-HELP ROUTE BUILDER
// ============================================================================

/**
 * Builds the how-can-we-help URL with a loan type query parameter.
 * Used by landing page config.
 */
export function howCanWeHelpRoute(loanName: string): string {
	return `${ROUTES.FORM.HOW_CAN_WE_HELP}?loan=${encodeURIComponent(loanName)}`;
}
