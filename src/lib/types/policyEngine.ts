/**
 * Policy Engine Type Definitions
 * ══════════════════════════════════════════════════════════════════
 * Complete type system for the two-axis policy management system:
 *   Product axis: Lender > Product Type > Variation
 *   Geography axis: PAN India > State > City > Zone
 *
 * CSS-specificity resolution: most specific rule wins per field,
 * with inheritance from parent geographic levels.
 *
 * See: docs/DEVELOPMENT-PLAN.md — Policy Management System
 * ══════════════════════════════════════════════════════════════════
 */

import type { ObjectId } from 'mongodb';

// ============================================================================
// ENUMS
// ============================================================================

/** Canonical product type codes — maps form loanName + loanType to these */
export type ProductType =
	| 'HL_NEW'
	| 'HL_BT'
	| 'HL_TOPUP'
	| 'HL_BT_TOPUP'
	| 'LAP_NEW'
	| 'LAP_BT'
	| 'PLOT_CONST'
	| 'PL'
	| 'BL_UNSECURED'
	| 'BL_SECURED'
	| 'PROF';

/** Human-readable labels for product types */
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
	HL_NEW: 'Home Loan — New Purchase',
	HL_BT: 'Home Loan — Balance Transfer',
	HL_TOPUP: 'Home Loan — Top Up',
	HL_BT_TOPUP: 'Home Loan — BT + Top Up',
	LAP_NEW: 'Loan Against Property — New',
	LAP_BT: 'Loan Against Property — BT',
	PLOT_CONST: 'Plot + Construction Loan',
	PL: 'Personal Loan',
	BL_UNSECURED: 'Business Loan — Unsecured',
	BL_SECURED: 'Business Loan — Secured',
	PROF: 'Professional Loan'
};

/** Geography hierarchy levels — higher specificity wins */
export type GeoLevel = 'pan_india' | 'state' | 'city' | 'zone';

/** Specificity scores for geo levels — used in resolution ordering */
export const GEO_SPECIFICITY: Record<GeoLevel, number> = {
	pan_india: 0,
	state: 10,
	city: 20,
	zone: 30
};

/** Zone types within a city */
export type ZoneType = 'urban' | 'rural' | 'semi_urban';

/** Lender classification — single source of truth for all classification references */
export type LenderClassification = 'PVT' | 'GOV' | 'NBFC' | 'HFC' | 'SFB';

/** Lender operational status */
export type LenderStatus = 'active' | 'inactive' | 'archived';

/** ProductVariation category — determines how variations are grouped */
export type VariationCategory =
	| 'standard'
	| 'borrower_type' // Women, SC-ST, Senior Citizen, NRI
	| 'employment_type' // Salaried, Self-Employed, Government
	| 'property_type' // Flat, Plot, Under-Construction
	| 'special_scheme' // Festive, PMAY
	| 'custom';

/** PolicyVersion lifecycle status */
export type PolicyVersionStatus =
	| 'draft'
	| 'pending_rm_review'
	| 'rm_corrections_requested'
	| 'pending_admin_final'
	| 'approved'
	| 'active'
	| 'superseded'
	| 'rejected';

/** How the RM confirmed the policy content */
export type ConfirmationMethod = 'portal' | 'verbal' | 'email' | 'whatsapp';

/** RM submission urgency levels */
export type UrgencyLevel = 'normal' | 'urgent' | 'critical';

/** RM submission status */
export type RMSubmissionStatus =
	| 'submitted'
	| 'under_review'
	| 'clarification_needed'
	| 'accepted'
	| 'rejected';

/** Rule overlay action — how an overlay modifies the base rule set */
export type RuleOverlayAction = 'replace' | 'add' | 'remove';

/** Audit log action types */
export type AuditAction =
	| 'version_created'
	| 'version_status_changed'
	| 'version_activated'
	| 'version_superseded'
	| 'rule_created'
	| 'rule_updated'
	| 'lender_created'
	| 'lender_updated'
	| 'product_created'
	| 'variation_created'
	| 'geo_scope_created'
	| 'rm_submission_created'
	| 'rm_submission_status_changed'
	| 'comment_added'
	| 'document_uploaded'
	| 'impersonation_start'
	| 'impersonation_exit'
	// C.5 — user / admin / payment actions surfaced in the same Audit Log
	| 'user_suspended'
	| 'user_reactivated'
	| 'role_changed'
	| 'permission_granted'
	| 'permission_revoked';

/** Review comment target types */
export type ReviewTargetType = 'policy_version' | 'rm_submission';

// ============================================================================
// 25 UNIVERSAL POLICY FIELD KEYS
// ============================================================================
// These are the canonical display fields for any lender policy.
// Must stay in sync with POLICY_KEYS in ruleValidator.ts.

export type PolicyFieldKey =
	| 'roi_type'
	| 'roi_benchmark'
	| 'roi_spread'
	| 'roi_range'
	| 'teaser_rate'
	| 'processing_fee_percent'
	| 'processing_fee_flat'
	| 'processing_fee_waiver'
	| 'prepayment_charge_floating'
	| 'prepayment_charge_fixed'
	| 'lock_in_period_months'
	| 'insurance_mandatory'
	| 'insurance_type'
	| 'login_to_sanction_days'
	| 'login_to_disbursal_days'
	| 'max_age_at_maturity'
	| 'min_loan_amount'
	| 'max_loan_amount'
	| 'women_borrower_discount'
	| 'festive_offer'
	| 'stamp_duty_info'
	| 'legal_technical_fee'
	| 'cersai_charge'
	| 'moratorium_available'
	| 'part_disbursement_allowed'
	| 'tranche_disbursement_info';

/** All 25 policy field keys as an array for iteration */
export const POLICY_FIELD_KEYS: PolicyFieldKey[] = [
	'roi_type',
	'roi_benchmark',
	'roi_spread',
	'roi_range',
	'teaser_rate',
	'processing_fee_percent',
	'processing_fee_flat',
	'processing_fee_waiver',
	'prepayment_charge_floating',
	'prepayment_charge_fixed',
	'lock_in_period_months',
	'insurance_mandatory',
	'insurance_type',
	'login_to_sanction_days',
	'login_to_disbursal_days',
	'max_age_at_maturity',
	'min_loan_amount',
	'max_loan_amount',
	'women_borrower_discount',
	'festive_offer',
	'stamp_duty_info',
	'legal_technical_fee',
	'cersai_charge',
	'moratorium_available',
	'part_disbursement_allowed',
	'tranche_disbursement_info'
];

/** Human-readable labels for policy fields */
export const POLICY_FIELD_LABELS: Record<PolicyFieldKey, string> = {
	roi_type: 'Interest Rate Type',
	roi_benchmark: 'ROI Benchmark',
	roi_spread: 'ROI Spread',
	roi_range: 'ROI Range',
	teaser_rate: 'Teaser Rate',
	processing_fee_percent: 'Processing Fee (%)',
	processing_fee_flat: 'Processing Fee (Flat)',
	processing_fee_waiver: 'Processing Fee Waiver',
	prepayment_charge_floating: 'Prepayment Charge (Floating)',
	prepayment_charge_fixed: 'Prepayment Charge (Fixed)',
	lock_in_period_months: 'Lock-in Period (Months)',
	insurance_mandatory: 'Insurance Mandatory',
	insurance_type: 'Insurance Type',
	login_to_sanction_days: 'Login to Sanction (Days)',
	login_to_disbursal_days: 'Login to Disbursal (Days)',
	max_age_at_maturity: 'Max Age at Maturity',
	min_loan_amount: 'Min Loan Amount',
	max_loan_amount: 'Max Loan Amount',
	women_borrower_discount: 'Women Borrower Discount',
	festive_offer: 'Festive Offer',
	stamp_duty_info: 'Stamp Duty Info',
	legal_technical_fee: 'Legal & Technical Fee',
	cersai_charge: 'CERSAI Charge',
	moratorium_available: 'Moratorium Available',
	part_disbursement_allowed: 'Part Disbursement Allowed',
	tranche_disbursement_info: 'Tranche Disbursement Info'
};

/** Type for the policy_fields object — partial set of 25 universal keys */
export type PolicyFields = Partial<Record<PolicyFieldKey, unknown>>;

// ============================================================================
// COLLECTION DOCUMENT INTERFACES
// ============================================================================

// ── Lender ──────────────────────────────────────────────────────────────

export interface Lender {
	_id: ObjectId;
	/** URL-safe slug, e.g. "hdfc-bank", "state-bank-of-india" */
	lender_id: string;
	/** Display name, e.g. "HDFC Bank" */
	lender_name: string;
	classification: LenderClassification;
	status: LenderStatus;
	/** Original bankName.ts value for mapping */
	bank_name_value: string;
	/** Optional metadata */
	meta?: {
		website?: string;
		logo_url?: string;
		notes?: string;
	};
	created_at: Date;
	updated_at: Date;
}

// ── LenderProduct ────────────────────────────────────────────────────────

export interface LenderProduct {
	_id: ObjectId;
	/** Composite: "{lender_id}:{product_type}", e.g. "hdfc-bank:HL_NEW" */
	product_id: string;
	lender_id: string;
	product_type: ProductType;
	/** Whether this product is actively offered */
	is_active: boolean;
	/** Optional product-specific notes */
	notes?: string;
	created_at: Date;
	updated_at: Date;
}

// ── ProductVariation ─────────────────────────────────────────────────────

export interface ProductVariation {
	_id: ObjectId;
	/** Composite: "{product_id}:{slug}", e.g. "hdfc-bank:HL_NEW:standard" */
	variation_id: string;
	product_id: string;
	lender_id: string;
	/** Human-readable label, e.g. "Standard", "Women Borrower", "SC-ST" */
	label: string;
	/** URL-safe slug for the variation, e.g. "standard", "women", "sc-st" */
	slug: string;
	category: VariationCategory;
	/** JSON-Logic condition that determines when this variation applies.
	 * Evaluated against the form payload. null = always matches (standard). */
	match_condition: Record<string, unknown> | null;
	/** Higher priority wins when multiple variations match (default: 0) */
	match_priority: number;
	is_active: boolean;
	created_at: Date;
	updated_at: Date;
}

// ── GeoScope ─────────────────────────────────────────────────────────────

export interface GeoScope {
	_id: ObjectId;
	/** Hierarchical ID: "pan_india", "UP", "UP:lucknow", "UP:lucknow:urban" */
	geo_scope_id: string;
	level: GeoLevel;
	/** Specificity score: pan_india=0, state=10, city=20, zone=30 */
	specificity: number;
	/** Display label, e.g. "PAN India", "Uttar Pradesh", "Lucknow" */
	label: string;
	/** Parent scope reference (null for pan_india) */
	parent_geo_scope_id: string | null;
	/** GST state code (for state-level scopes) */
	gst_state_code?: string;
	/** Zone type (for zone-level scopes) */
	zone_type?: ZoneType;
	created_at: Date;
}

// ── PolicyRule ────────────────────────────────────────────────────────────
// A PolicyRule is a matrix slot: the intersection of a ProductVariation and a GeoScope.
// It points to one active PolicyVersion at any time.

export interface PolicyRule {
	_id: ObjectId;
	/** Composite: "{variation_id}@{geo_scope_id}",
	 * e.g. "hdfc-bank:HL_NEW:women@UP:lucknow" */
	policy_rule_id: string;
	variation_id: string;
	geo_scope_id: string;
	lender_id: string;
	product_id: string;
	/** Reference to the currently active PolicyVersion (null if none activated yet) */
	active_version_id: ObjectId | null;
	active_version_number: number | null;
	/** Cross-variation rules apply to ALL variations of the same product at this geo level.
	 * They are layered BEFORE variation-specific rules in resolution. */
	is_cross_variation: boolean;
	is_active: boolean;
	created_at: Date;
	updated_at: Date;
}

// ── RuleOverlay ─────────────────────────────────────────────────────────
// Rule overlays let a policy version modify the base rule set from json_logic.
// An overlay can replace a specific rule, add a new one, or remove one.

export interface RuleOverlay {
	action: RuleOverlayAction;
	/** For 'replace'/'remove': the rule_id being targeted */
	target_rule_id?: string;
	/** For 'replace'/'add': the new rule definition (JSON-Logic) */
	rule?: Record<string, unknown>;
	reason: string;
}

// ── PolicyVersion ─────────────────────────────────────────────────────────
// Immutable record — every edit creates a new version. Never mutated after creation
// (except status transitions which are append-only state changes).

export interface PolicyVersion {
	_id: ObjectId;
	policy_rule_id: string;
	version_number: number;
	status: PolicyVersionStatus;

	/** The 25 universal policy fields — partial, only set fields are stored */
	policy_fields: PolicyFields;

	/** Rule overlays that modify the base rule set */
	rule_overlays: RuleOverlay[];

	/** Human-readable policy document (generated by policyDocGenerator) */
	human_readable_doc?: string;

	// ── Provenance ──
	provenance: {
		/** How the data entered the system */
		source_type: 'admin_manual' | 'ai_parsed' | 'rm_submission' | 'migration';
		/** RM who provided/confirmed the data (ObjectId as string) */
		source_rm_id?: string;
		source_rm_name?: string;
		/** Evidence document IDs */
		document_ids: string[];
		/** How RM confirmed (null if not yet confirmed) */
		confirmation_method?: ConfirmationMethod;
		confirmation_date?: Date;
		confirmation_notes?: string;
		/** For AI-parsed: reference to original LenderRuleArtifact */
		artifact_id?: string;
	};

	/** Structured changelog — what changed from previous version */
	changelog: ChangelogEntry[];

	/** When this version becomes/became effective */
	effective_from?: Date;
	/** When this version was superseded (null if still active) */
	effective_until?: Date;

	created_by: string;
	created_at: Date;
	updated_at: Date;
}

export interface ChangelogEntry {
	field: string;
	old_value?: unknown;
	new_value?: unknown;
	description: string;
}

// ── PolicyEvidenceDocument ───────────────────────────────────────────────

export interface PolicyEvidenceDocument {
	_id: ObjectId;
	/** Unique document identifier */
	document_id: string;
	lender_id: string;
	/** MIME type: application/pdf, image/jpeg, etc. */
	mime_type: string;
	/** Original filename */
	original_name: string;
	/** ImageKit URL */
	url: string;
	/** ImageKit file ID for management */
	imagekit_file_id?: string;
	/** File size in bytes */
	size_bytes: number;
	/** Who uploaded */
	uploaded_by: string;
	uploaded_by_role: 'admin' | 'rm';
	/** Optional description */
	description?: string;
	created_at: Date;
}

// ── RMSubmission ─────────────────────────────────────────────────────────
// Raw submissions from RMs before admin review/processing.

export interface RMSubmission {
	_id: ObjectId;
	/** Unique submission identifier */
	submission_id: string;
	rm_id: string;
	rm_name: string;

	/** What the submission is about */
	lender_id: string;
	lender_name: string;
	product_type?: ProductType;
	variation_slug?: string;
	/** Geography context ("Not Sure" stored as null) */
	geo_state?: string;
	geo_city?: string;
	geo_zone_type?: ZoneType;

	status: RMSubmissionStatus;
	urgency: UrgencyLevel;

	/** Free text description from the RM */
	description: string;

	/** Evidence document IDs */
	document_ids: string[];

	/** Admin processing: which PolicyVersion was created from this submission */
	resulting_version_id?: ObjectId;

	/** Admin notes */
	admin_notes?: string;

	created_at: Date;
	updated_at: Date;
}

// ── ReviewComment ────────────────────────────────────────────────────────
// Comment threads attached to PolicyVersions or RMSubmissions.

export interface ReviewComment {
	_id: ObjectId;
	target_type: ReviewTargetType;
	/** ObjectId of the PolicyVersion or RMSubmission */
	target_id: ObjectId;
	/** Who posted */
	author_id: string;
	author_name: string;
	author_role: 'admin' | 'rm';
	/** Comment content */
	text: string;
	/** Optional file attachment IDs */
	attachment_ids: string[];
	/** Whether this comment thread item is resolved */
	is_resolved: boolean;
	resolved_by?: string;
	resolved_at?: Date;
	created_at: Date;
}

// ── PolicyAuditLog ───────────────────────────────────────────────────────
// Immutable log of all state transitions. 2-year TTL.

export interface PolicyAuditLog {
	_id: ObjectId;
	target_type:
		| 'lender'
		| 'product'
		| 'variation'
		| 'geo_scope'
		| 'policy_rule'
		| 'policy_version'
		| 'rm_submission'
		| 'comment'
		| 'user'
		// C.5 — non-policy targets surfaced in the same Audit Log. `payment` +
		// `refund` rows need 6-year retention (Epic E); the 2-year TTL on
		// PolicyAuditLogs must be adjusted before money-events ship.
		| 'payment'
		| 'refund'
		| 'permission_change';
	/** The ID of the target document */
	target_id: string;
	action: AuditAction;
	/** Who performed the action */
	actor_id: string;
	actor_name: string;
	actor_role: 'admin' | 'rm' | 'system';
	/** Additional context about the action */
	details?: Record<string, unknown>;
	created_at: Date;
}

// ============================================================================
// RESOLUTION TYPES
// ============================================================================
// Used by policyResolver.ts to return resolved policy data.

/** Input to the policy resolution engine */
export interface PolicyResolutionQuery {
	lender_id: string;
	product_type: ProductType;
	/** Variation IDs that matched the form payload (from match_condition evaluation) */
	matched_variation_ids: string[];
	/** From property location — used to build geo scope chain */
	property_state?: string;
	property_city?: string;
	zone_type?: ZoneType;
}

/** Source provenance for a single resolved field */
export interface FieldSource {
	policy_rule_id: string;
	version_number: number;
	geo_scope_id: string;
	geo_level: GeoLevel;
	specificity: number;
	is_cross_variation: boolean;
	/**
	 * PMS Phase 2.C cold-start fallback (2026-05-31): true when this field
	 * came from a city-level rule via the "exactly one city has rules"
	 * fallback rather than an explicit match for the case's own geo chain.
	 * Lets consumers distinguish "RM in your city wrote this" from
	 * "someone in another city wrote it, no one in yours has yet".
	 */
	inherited_from_cold_start?: boolean;
}

/** Output from the policy resolution engine */
export interface ResolvedPolicy {
	lender_id: string;
	product_type: ProductType;
	/** Merged policy fields — most specific value wins per field */
	resolved_fields: PolicyFields;
	/** Provenance: which policy rule contributed each field */
	field_sources: Partial<Record<PolicyFieldKey, FieldSource>>;
	/** All rule overlays collected from the resolution chain */
	resolved_rule_overlays: RuleOverlay[];
	/** The resolution chain — ordered list of policy rules that were merged */
	resolution_chain: {
		policy_rule_id: string;
		geo_scope_id: string;
		geo_level: GeoLevel;
		specificity: number;
		is_cross_variation: boolean;
		version_number: number;
		fields_contributed: PolicyFieldKey[];
		/** PMS Phase 2.C: true when this rule was reached via the
		 * cold-start fallback rather than the case's natural geo chain. */
		inherited_from_cold_start?: boolean;
	}[];
	/** Timestamp of resolution */
	resolved_at: Date;
}

// ============================================================================
// VALID STATUS TRANSITIONS
// ============================================================================
// Used to enforce the PolicyVersion state machine.

export const VALID_STATUS_TRANSITIONS: Record<PolicyVersionStatus, PolicyVersionStatus[]> = {
	draft: ['pending_rm_review', 'rejected'],
	pending_rm_review: ['pending_admin_final', 'rm_corrections_requested', 'rejected'],
	rm_corrections_requested: ['pending_rm_review', 'rejected'],
	pending_admin_final: ['approved', 'rejected'],
	approved: ['active', 'rejected'],
	active: ['superseded'],
	superseded: [],
	rejected: []
};

/** Check if a status transition is valid */
export function isValidStatusTransition(
	from: PolicyVersionStatus,
	to: PolicyVersionStatus
): boolean {
	return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// ============================================================================
// HELPER: Slug generation
// ============================================================================

/** Convert a display name to a URL-safe slug.
 * "HDFC Bank" -> "hdfc-bank", "State Bank of India" -> "state-bank-of-india" */
export function toLenderSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[&]/g, 'and')
		.replace(/[()]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

// ============================================================================
// SETTINGS: API KEYS + SYSTEM CONFIGURATION
// ============================================================================

/** Supported API key provider categories */
export type ApiKeyProvider =
	| 'openai'
	| 'anthropic'
	| 'google_gemini'
	| 'imagekit'
	| 'msg91'
	| 'razorpay'
	| 'credit_bureau'
	| 'other';

export const API_KEY_PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
	openai: 'OpenAI',
	anthropic: 'Anthropic',
	google_gemini: 'Google Gemini',
	imagekit: 'ImageKit',
	msg91: 'MSG91',
	razorpay: 'Razorpay',
	credit_bureau: 'Credit Bureau',
	other: 'Other'
};

export interface ApiKey {
	_id: ObjectId;
	key_id: string;
	provider: ApiKeyProvider;
	label: string;
	/** AES-256-GCM encrypted value (base64: iv:authTag:ciphertext) */
	encrypted_value: string;
	/** Last 4 characters for masked display */
	last_four: string;
	is_active: boolean;
	last_used: Date | null;
	created_by: string;
	created_at: Date;
	updated_at: Date;
}

/** System configuration entry — key-value settings */
export interface SystemConfig {
	_id: ObjectId;
	config_key: string;
	value: unknown;
	label: string;
	description: string;
	group: SystemConfigGroup;
	value_type: 'boolean' | 'number' | 'string';
	updated_by: string;
	updated_at: Date;
}

export type SystemConfigGroup = 'platform' | 'features' | 'thresholds';

export const SYSTEM_CONFIG_GROUP_LABELS: Record<SystemConfigGroup, string> = {
	platform: 'Platform Toggles',
	features: 'Feature Flags',
	thresholds: 'Thresholds & Limits'
};

/** Default system config definitions */
export const DEFAULT_SYSTEM_CONFIGS: Omit<SystemConfig, '_id' | 'updated_by' | 'updated_at'>[] = [
	// Platform toggles
	{
		config_key: 'demo_mode',
		value: false,
		label: 'Demo Mode',
		description: 'Enable demo mode for the platform',
		group: 'platform',
		value_type: 'boolean'
	},
	{
		config_key: 'maintenance_mode',
		value: false,
		label: 'Maintenance Mode',
		description: 'Put the platform in maintenance mode',
		group: 'platform',
		value_type: 'boolean'
	},
	{
		config_key: 'new_user_registration',
		value: true,
		label: 'New User Registration',
		description: 'Allow new DSA registrations',
		group: 'platform',
		value_type: 'boolean'
	},
	// Feature flags
	{
		config_key: 'ai_parsing_enabled',
		value: true,
		label: 'AI Parsing',
		description: 'Enable AI-powered rule parsing',
		group: 'features',
		value_type: 'boolean'
	},
	{
		config_key: 'rm_portal_enabled',
		value: true,
		label: 'RM Portal',
		description: 'Enable the RM partner portal',
		group: 'features',
		value_type: 'boolean'
	},
	{
		config_key: 'share_links_enabled',
		value: true,
		label: 'Applicant Share Links',
		description: 'Enable DSA form sharing with applicants',
		group: 'features',
		value_type: 'boolean'
	},
	{
		config_key: 'policy_cache_ttl_minutes',
		value: 60,
		label: 'Policy Cache TTL (min)',
		description: 'How long resolved policies are cached',
		group: 'features',
		value_type: 'number'
	},
	// Thresholds
	{
		config_key: 'max_upload_size_mb',
		value: 10,
		label: 'Max Upload Size (MB)',
		description: 'Maximum file upload size in megabytes',
		group: 'thresholds',
		value_type: 'number'
	},
	{
		config_key: 'otp_rate_limit_per_hour',
		value: 10,
		label: 'OTP Rate Limit (per hour)',
		description: 'Max OTP requests per IP per hour',
		group: 'thresholds',
		value_type: 'number'
	},
	{
		config_key: 'inactive_user_threshold_days',
		value: 90,
		label: 'Inactive User Threshold (days)',
		description: 'Days of inactivity before user is flagged',
		group: 'thresholds',
		value_type: 'number'
	}
];
