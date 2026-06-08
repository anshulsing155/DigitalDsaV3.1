/**
 * Feature Flag Definitions & Helpers
 * ══════════════════════════════════════════════════════════════════
 * Central registry for subscription-tier-based feature flags.
 *
 * Pure functions only — no DB calls. Designed to be imported by
 * API routes, page server loads, and tests alike.
 *
 * Tier hierarchy:  free (0)  <  pro (1)  <  enterprise (2)
 *
 * Resolution order for `hasFeature`:
 *   1. Per-DSA override (feature_flags record) — highest priority
 *   2. Tier level >= feature's minimum tier
 *   3. Expired subscription falls back to 'free'
 * ══════════════════════════════════════════════════════════════════
 */

// ============================================================================
// TYPES
// ============================================================================

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type FeatureCategory = 'core' | 'communication' | 'analytics' | 'documents' | 'automation';

export interface FeatureFlag {
	id: string;
	name: string;
	description: string;
	tier: SubscriptionTier; // minimum tier required
	default_enabled: boolean; // enabled by default for the tier?
	category: FeatureCategory;
}

/** Minimal DSA profile shape needed by feature-flag helpers. */
export interface FeatureFlagProfile {
	subscription?: { tier: string; expires_at?: Date };
	feature_flags?: Record<string, boolean>;
}

// ============================================================================
// FEATURE FLAG REGISTRY
// ============================================================================

export const FEATURE_FLAGS: FeatureFlag[] = [
	// ── Free tier (always available) ──────────────────────────────
	{
		id: 'case_management',
		name: 'Case Management',
		description: 'Create and manage loan cases',
		tier: 'free',
		default_enabled: true,
		category: 'core'
	},
	{
		id: 'basic_pipeline',
		name: 'Basic Pipeline',
		description: 'Track case stages',
		tier: 'free',
		default_enabled: true,
		category: 'core'
	},
	{
		id: 'single_lender',
		name: 'Single Lender per Case',
		description: 'Track one lender application per case',
		tier: 'free',
		default_enabled: true,
		category: 'core'
	},
	{
		id: 'document_checklist',
		name: 'Document Checklist',
		description: 'Basic document tracking',
		tier: 'free',
		default_enabled: true,
		category: 'documents'
	},

	// ── Pro tier ──────────────────────────────────────────────────
	{
		id: 'multi_lender',
		name: 'Multi-Lender Tracking',
		description: 'Track multiple lenders per case with comparison',
		tier: 'pro',
		default_enabled: true,
		category: 'core'
	},
	{
		id: 'communication_hub',
		name: 'Communication Hub',
		description: 'Templates, WhatsApp share, message composer',
		tier: 'pro',
		default_enabled: true,
		category: 'communication'
	},
	{
		id: 'smart_reminders',
		name: 'Smart Reminders',
		description: 'Automated stage-based reminders',
		tier: 'pro',
		default_enabled: true,
		category: 'automation'
	},
	{
		id: 'pdf_generation',
		name: 'PDF Generation',
		description: 'Generate review and submission PDFs',
		tier: 'pro',
		default_enabled: true,
		category: 'documents'
	},
	{
		id: 'rejection_analysis',
		name: 'Rejection Analysis',
		description: 'Re-routing suggestions on rejection',
		tier: 'pro',
		default_enabled: true,
		category: 'analytics'
	},
	{
		id: 'crm_basic',
		name: 'Basic CRM',
		description: 'Source tracking and pipeline view',
		tier: 'pro',
		default_enabled: true,
		category: 'analytics'
	},

	// ── Enterprise tier ──────────────────────────────────────────
	{
		id: 'analytics_scorecard',
		name: 'Performance Scorecard',
		description: 'DSA performance metrics and insights',
		tier: 'enterprise',
		default_enabled: true,
		category: 'analytics'
	},
	{
		id: 'policy_alerts',
		name: 'Policy Alerts',
		description: 'Lender policy change notifications',
		tier: 'enterprise',
		default_enabled: true,
		category: 'analytics'
	},
	{
		id: 'bulk_operations',
		name: 'Bulk Operations',
		description: 'Bulk document and case operations',
		tier: 'enterprise',
		default_enabled: true,
		category: 'core'
	},
	{
		id: 'export_reports',
		name: 'Export Reports',
		description: 'Export case data and reports',
		tier: 'enterprise',
		default_enabled: true,
		category: 'analytics'
	},
	{
		id: 'rm_database',
		name: 'RM Database Access',
		description: 'Full RM contact database with suggestions',
		tier: 'enterprise',
		default_enabled: true,
		category: 'core'
	}
];

// ============================================================================
// TIER HIERARCHY
// ============================================================================

const TIER_LEVELS: Record<string, number> = { free: 0, pro: 1, enterprise: 2 };

/** Returns the numeric level for a tier string (defaults to 0 / free). */
function tierLevel(tier: string | undefined): number {
	if (!tier) return 0;
	return TIER_LEVELS[tier] ?? 0;
}

// ============================================================================
// SUBSCRIPTION ACTIVE CHECK
// ============================================================================

/**
 * Determines whether a subscription is currently active.
 *
 * Rules:
 *  - No subscription → treated as active free tier
 *  - No `expires_at` → never expires (active)
 *  - `expires_at` in the future → active
 *  - `expires_at` in the past → expired
 */
export function isSubscriptionActive(
	subscription?: { tier: string; expires_at?: Date },
	now?: Date
): boolean {
	if (!subscription) return true; // no subscription = free tier, always active
	if (!subscription.expires_at) return true; // no expiry = never expires

	const currentTime = now ?? new Date();
	const expiresAt =
		subscription.expires_at instanceof Date
			? subscription.expires_at
			: new Date(subscription.expires_at);

	return expiresAt.getTime() > currentTime.getTime();
}

// ============================================================================
// HAS FEATURE
// ============================================================================

/**
 * Check if a DSA has access to a specific feature.
 *
 * Resolution:
 *  1. Per-DSA override in `feature_flags` — if explicitly set, use that value.
 *  2. Check tier: DSA's effective tier >= feature's minimum tier.
 *  3. If subscription is expired, effective tier falls back to 'free'.
 *  4. Unknown feature ID → false.
 */
export function hasFeature(
	dsaProfile: FeatureFlagProfile | null | undefined,
	featureId: string,
	now?: Date
): boolean {
	// Unknown feature → false
	const flag = FEATURE_FLAGS.find((f) => f.id === featureId);
	if (!flag) return false;

	// Null/undefined profile → only free-tier features
	if (!dsaProfile) {
		return flag.default_enabled && tierLevel(flag.tier) <= tierLevel('free');
	}

	// 1. Per-DSA override (highest priority)
	if (dsaProfile.feature_flags && typeof dsaProfile.feature_flags[featureId] === 'boolean') {
		return dsaProfile.feature_flags[featureId];
	}

	// 2. Determine effective tier (expired subscription → free)
	const sub = dsaProfile.subscription;
	const active = isSubscriptionActive(sub, now);
	const effectiveTier = active ? (sub?.tier ?? 'free') : 'free';

	// 3. Tier-level check
	return flag.default_enabled && tierLevel(effectiveTier) >= tierLevel(flag.tier);
}

// ============================================================================
// GET FEATURES FOR TIER
// ============================================================================

/**
 * Returns all features available to a given tier (including lower tiers).
 * Unknown tier → only free-tier features.
 */
export function getFeaturesForTier(tier: string): FeatureFlag[] {
	const level = tierLevel(tier);
	return FEATURE_FLAGS.filter((f) => f.default_enabled && tierLevel(f.tier) <= level);
}

// ============================================================================
// GET FEATURES BY CATEGORY
// ============================================================================

/**
 * Returns features available for a tier, grouped by category.
 * Categories with no features are omitted from the result.
 */
export function getFeaturesByCategory(tier: string): Record<string, FeatureFlag[]> {
	const features = getFeaturesForTier(tier);
	const grouped: Record<string, FeatureFlag[]> = {};

	for (const f of features) {
		if (!grouped[f.category]) {
			grouped[f.category] = [];
		}
		grouped[f.category].push(f);
	}

	return grouped;
}
