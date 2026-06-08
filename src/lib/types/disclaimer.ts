/**
 * Disclaimer Types — Multi-layered legal safeguard system
 *
 * @see AD-11 in DEVELOPMENT-PLAN.md for full design
 */

// ── Disclaimer Configuration ─────────────────────────────────

export type DisclaimerPlacement =
	| 'onboarding' // One-time, blocking (RM onboarding)
	| 'inline' // Shown every time (per-rating)
	| 'footer' // Auto-appended by server (broadcast)
	| 'tag' // Visual badge (DSA-side RM content)
	| 'persistent' // Always visible, can't dismiss (eligibility)
	| 'pdf' // On PDF generation (file preview)
	| 'tos'; // Terms of Service (legal + summary)

export interface DisclaimerConfig {
	/** Unique identifier, e.g. 'rm_onboarding_v1', 'broadcast_footer_v1' */
	id: string;

	/** Version number — increment on content changes */
	version: number;

	/** Where this disclaimer appears */
	placement: DisclaimerPlacement;

	/** true = blocking checkbox required, false = visible-only */
	requires_acceptance: boolean;

	/** true = injected by API, cannot be bypassed by client */
	server_enforced: boolean;

	/** i18n key for the disclaimer content (resolved via t() function) */
	title_key: string;

	/** i18n key for the main body text */
	body_key: string;

	/** i18n key for the checkbox label (only if requires_acceptance is true) */
	checkbox_key?: string;

	/** When this version became effective */
	effective_from: Date;

	/** ID of the previous version this supersedes */
	supersedes?: string;
}

// ── User Acceptance Tracking ─────────────────────────────────

export interface DisclaimerAcceptance {
	/** User who accepted (DSA or RM ObjectId as string) */
	user_id: string;

	/** Which disclaimer was accepted */
	disclaimer_id: string;

	/** Version at time of acceptance */
	disclaimer_version: number;

	/** When the user accepted */
	accepted_at: Date;

	/** IP address at time of acceptance (for audit) */
	ip_address?: string;

	/** Browser user agent (for audit) */
	user_agent?: string;
}

// ── Pre-defined Disclaimer Registry ──────────────────────────

/**
 * All 7 disclaimer configs as defined in AD-11.
 * Content is stored as i18n keys — actual text comes from translation files.
 */
export const DISCLAIMER_REGISTRY: DisclaimerConfig[] = [
	{
		id: 'rm_onboarding_v1',
		version: 1,
		placement: 'onboarding',
		requires_acceptance: true,
		server_enforced: false,
		title_key: 'disclaimer.rm_onboarding_title',
		body_key: 'disclaimer.rm_onboarding_body',
		checkbox_key: 'disclaimer.rm_onboarding_checkbox',
		effective_from: new Date('2026-02-12')
	},
	{
		id: 'per_rating_v1',
		version: 1,
		placement: 'inline',
		requires_acceptance: false,
		server_enforced: false,
		title_key: 'disclaimer.rating_notice',
		body_key: 'disclaimer.rating_notice',
		effective_from: new Date('2026-02-12')
	},
	{
		id: 'broadcast_footer_v1',
		version: 1,
		placement: 'footer',
		requires_acceptance: false,
		server_enforced: true,
		title_key: 'disclaimer.broadcast_footer',
		body_key: 'disclaimer.broadcast_footer',
		effective_from: new Date('2026-02-12')
	},
	{
		id: 'rm_content_tag_v1',
		version: 1,
		placement: 'tag',
		requires_acceptance: false,
		server_enforced: false,
		title_key: 'disclaimer.rm_content_tag',
		body_key: 'disclaimer.rm_content_notice',
		effective_from: new Date('2026-02-12')
	},
	{
		id: 'eligibility_result_v1',
		version: 1,
		placement: 'persistent',
		requires_acceptance: false,
		server_enforced: false,
		title_key: 'disclaimer.eligibility_result',
		body_key: 'disclaimer.eligibility_result',
		effective_from: new Date('2026-02-12')
	},
	{
		id: 'pdf_review_footer_v1',
		version: 1,
		placement: 'pdf',
		requires_acceptance: false,
		server_enforced: true,
		title_key: 'disclaimer.pdf_review_footer',
		body_key: 'disclaimer.pdf_review_footer',
		effective_from: new Date('2026-02-12')
	},
	{
		id: 'pdf_submission_footer_v1',
		version: 1,
		placement: 'pdf',
		requires_acceptance: false,
		server_enforced: true,
		title_key: 'disclaimer.pdf_submission_footer',
		body_key: 'disclaimer.pdf_submission_footer',
		effective_from: new Date('2026-02-12')
	}
];

// ── Helper Functions ─────────────────────────────────────────

/**
 * Get a disclaimer config by its ID
 */
export function getDisclaimer(id: string): DisclaimerConfig | undefined {
	return DISCLAIMER_REGISTRY.find((d) => d.id === id);
}

/**
 * Get all disclaimers for a specific placement
 */
export function getDisclaimersByPlacement(placement: DisclaimerPlacement): DisclaimerConfig[] {
	return DISCLAIMER_REGISTRY.filter((d) => d.placement === placement);
}

/**
 * Get all server-enforced disclaimers (cannot be bypassed by client)
 */
export function getServerEnforcedDisclaimers(): DisclaimerConfig[] {
	return DISCLAIMER_REGISTRY.filter((d) => d.server_enforced);
}

/**
 * Check if a user needs to re-accept a disclaimer (version mismatch)
 */
export function needsReAcceptance(
	disclaimerId: string,
	lastAcceptedVersion: number | undefined
): boolean {
	const disclaimer = getDisclaimer(disclaimerId);
	if (!disclaimer || !disclaimer.requires_acceptance) return false;
	if (lastAcceptedVersion === undefined) return true;
	return disclaimer.version > lastAcceptedVersion;
}
