import { describe, it, expect } from 'vitest';
import {
	FEATURE_FLAGS,
	hasFeature,
	getFeaturesForTier,
	getFeaturesByCategory,
	isSubscriptionActive,
	type FeatureFlagProfile
} from '$lib/server/featureFlags';

// ═══════════════════════════════════════════════════════════════
// Helpers — reusable profile fixtures
// ═══════════════════════════════════════════════════════════════

function freeProfile(overrides: Partial<FeatureFlagProfile> = {}): FeatureFlagProfile {
	return {
		subscription: { tier: 'free' },
		...overrides
	};
}

function proProfile(overrides: Partial<FeatureFlagProfile> = {}): FeatureFlagProfile {
	return {
		subscription: { tier: 'pro' },
		...overrides
	};
}

function enterpriseProfile(overrides: Partial<FeatureFlagProfile> = {}): FeatureFlagProfile {
	return {
		subscription: { tier: 'enterprise' },
		...overrides
	};
}

function expiredProProfile(now: Date): FeatureFlagProfile {
	const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	return {
		subscription: { tier: 'pro', expires_at: yesterday }
	};
}

function activeProProfile(now: Date): FeatureFlagProfile {
	const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	return {
		subscription: { tier: 'pro', expires_at: tomorrow }
	};
}

// ═══════════════════════════════════════════════════════════════
// FEATURE_FLAGS registry — basic sanity checks
// ═══════════════════════════════════════════════════════════════

describe('FEATURE_FLAGS registry', () => {
	it('contains at least one flag for each tier', () => {
		const tiers = new Set(FEATURE_FLAGS.map((f) => f.tier));
		expect(tiers.has('free')).toBe(true);
		expect(tiers.has('pro')).toBe(true);
		expect(tiers.has('enterprise')).toBe(true);
	});

	it('all flags have unique IDs', () => {
		const ids = FEATURE_FLAGS.map((f) => f.id);
		const unique = new Set(ids);
		expect(unique.size).toBe(ids.length);
	});

	it('all flags have required fields', () => {
		for (const flag of FEATURE_FLAGS) {
			expect(flag.id).toBeTruthy();
			expect(flag.name).toBeTruthy();
			expect(flag.description).toBeTruthy();
			expect(['free', 'pro', 'enterprise']).toContain(flag.tier);
			expect(typeof flag.default_enabled).toBe('boolean');
			expect(['core', 'communication', 'analytics', 'documents', 'automation']).toContain(
				flag.category
			);
		}
	});

	it('has 4 free-tier flags', () => {
		const free = FEATURE_FLAGS.filter((f) => f.tier === 'free');
		expect(free).toHaveLength(4);
	});

	it('has 6 pro-tier flags', () => {
		const pro = FEATURE_FLAGS.filter((f) => f.tier === 'pro');
		expect(pro).toHaveLength(6);
	});

	it('has 5 enterprise-tier flags', () => {
		const enterprise = FEATURE_FLAGS.filter((f) => f.tier === 'enterprise');
		expect(enterprise).toHaveLength(5);
	});
});

// ═══════════════════════════════════════════════════════════════
// isSubscriptionActive
// ═══════════════════════════════════════════════════════════════

describe('isSubscriptionActive', () => {
	const now = new Date('2026-06-15T12:00:00Z');

	it('returns true when no subscription (free tier)', () => {
		expect(isSubscriptionActive(undefined, now)).toBe(true);
	});

	it('returns true when subscription has no expires_at', () => {
		expect(isSubscriptionActive({ tier: 'pro' }, now)).toBe(true);
	});

	it('returns true when expires_at is in the future', () => {
		const future = new Date('2027-01-01T00:00:00Z');
		expect(isSubscriptionActive({ tier: 'pro', expires_at: future }, now)).toBe(true);
	});

	it('returns false when expires_at is in the past', () => {
		const past = new Date('2025-01-01T00:00:00Z');
		expect(isSubscriptionActive({ tier: 'pro', expires_at: past }, now)).toBe(false);
	});

	it('returns false when expires_at equals now (not strictly greater)', () => {
		expect(isSubscriptionActive({ tier: 'pro', expires_at: now }, now)).toBe(false);
	});

	it('handles expires_at as ISO string (coerced to Date)', () => {
		const future = '2027-01-01T00:00:00Z' as unknown as Date;
		expect(isSubscriptionActive({ tier: 'enterprise', expires_at: future }, now)).toBe(true);
	});

	it('handles expires_at as past ISO string', () => {
		const past = '2025-01-01T00:00:00Z' as unknown as Date;
		expect(isSubscriptionActive({ tier: 'enterprise', expires_at: past }, now)).toBe(false);
	});

	it('uses current time when now is not provided', () => {
		// Subscription that expires far in the future should be active
		const farFuture = new Date('2099-01-01T00:00:00Z');
		expect(isSubscriptionActive({ tier: 'pro', expires_at: farFuture })).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// hasFeature
// ═══════════════════════════════════════════════════════════════

describe('hasFeature', () => {
	const now = new Date('2026-06-15T12:00:00Z');

	// ── Free tier features always available ─────────────────────

	describe('free tier features', () => {
		it('free profile can access case_management', () => {
			expect(hasFeature(freeProfile(), 'case_management', now)).toBe(true);
		});

		it('free profile can access basic_pipeline', () => {
			expect(hasFeature(freeProfile(), 'basic_pipeline', now)).toBe(true);
		});

		it('free profile can access single_lender', () => {
			expect(hasFeature(freeProfile(), 'single_lender', now)).toBe(true);
		});

		it('free profile can access document_checklist', () => {
			expect(hasFeature(freeProfile(), 'document_checklist', now)).toBe(true);
		});
	});

	// ── Free tier cannot access pro/enterprise ──────────────────

	describe('free tier restrictions', () => {
		it('free profile cannot access multi_lender (pro)', () => {
			expect(hasFeature(freeProfile(), 'multi_lender', now)).toBe(false);
		});

		it('free profile cannot access communication_hub (pro)', () => {
			expect(hasFeature(freeProfile(), 'communication_hub', now)).toBe(false);
		});

		it('free profile cannot access analytics_scorecard (enterprise)', () => {
			expect(hasFeature(freeProfile(), 'analytics_scorecard', now)).toBe(false);
		});

		it('free profile cannot access bulk_operations (enterprise)', () => {
			expect(hasFeature(freeProfile(), 'bulk_operations', now)).toBe(false);
		});
	});

	// ── Pro tier features ───────────────────────────────────────

	describe('pro tier features', () => {
		it('pro profile can access all free features', () => {
			expect(hasFeature(proProfile(), 'case_management', now)).toBe(true);
			expect(hasFeature(proProfile(), 'basic_pipeline', now)).toBe(true);
			expect(hasFeature(proProfile(), 'single_lender', now)).toBe(true);
			expect(hasFeature(proProfile(), 'document_checklist', now)).toBe(true);
		});

		it('pro profile can access multi_lender', () => {
			expect(hasFeature(proProfile(), 'multi_lender', now)).toBe(true);
		});

		it('pro profile can access communication_hub', () => {
			expect(hasFeature(proProfile(), 'communication_hub', now)).toBe(true);
		});

		it('pro profile can access smart_reminders', () => {
			expect(hasFeature(proProfile(), 'smart_reminders', now)).toBe(true);
		});

		it('pro profile can access pdf_generation', () => {
			expect(hasFeature(proProfile(), 'pdf_generation', now)).toBe(true);
		});

		it('pro profile can access rejection_analysis', () => {
			expect(hasFeature(proProfile(), 'rejection_analysis', now)).toBe(true);
		});

		it('pro profile can access crm_basic', () => {
			expect(hasFeature(proProfile(), 'crm_basic', now)).toBe(true);
		});

		it('pro profile cannot access enterprise features', () => {
			expect(hasFeature(proProfile(), 'analytics_scorecard', now)).toBe(false);
			expect(hasFeature(proProfile(), 'policy_alerts', now)).toBe(false);
			expect(hasFeature(proProfile(), 'bulk_operations', now)).toBe(false);
			expect(hasFeature(proProfile(), 'export_reports', now)).toBe(false);
			expect(hasFeature(proProfile(), 'rm_database', now)).toBe(false);
		});
	});

	// ── Enterprise tier features ────────────────────────────────

	describe('enterprise tier features', () => {
		it('enterprise profile can access all features', () => {
			for (const flag of FEATURE_FLAGS) {
				expect(
					hasFeature(enterpriseProfile(), flag.id, now),
					`enterprise should have access to ${flag.id}`
				).toBe(true);
			}
		});
	});

	// ── Per-DSA overrides (feature_flags) ───────────────────────

	describe('per-DSA overrides via feature_flags', () => {
		it('override grants access to a pro feature on free tier', () => {
			const profile = freeProfile({ feature_flags: { multi_lender: true } });
			expect(hasFeature(profile, 'multi_lender', now)).toBe(true);
		});

		it('override denies access to a free feature on pro tier', () => {
			const profile = proProfile({ feature_flags: { case_management: false } });
			expect(hasFeature(profile, 'case_management', now)).toBe(false);
		});

		it('override grants enterprise feature on free tier', () => {
			const profile = freeProfile({ feature_flags: { analytics_scorecard: true } });
			expect(hasFeature(profile, 'analytics_scorecard', now)).toBe(true);
		});

		it('override denies enterprise feature on enterprise tier', () => {
			const profile = enterpriseProfile({ feature_flags: { bulk_operations: false } });
			expect(hasFeature(profile, 'bulk_operations', now)).toBe(false);
		});

		it('override does not affect other features', () => {
			const profile = freeProfile({ feature_flags: { multi_lender: true } });
			// multi_lender is overridden to true
			expect(hasFeature(profile, 'multi_lender', now)).toBe(true);
			// communication_hub is NOT overridden, so free tier cannot access it
			expect(hasFeature(profile, 'communication_hub', now)).toBe(false);
		});
	});

	// ── Expired subscription falls back to free ─────────────────

	describe('expired subscription behavior', () => {
		it('expired pro subscription loses pro features', () => {
			const profile = expiredProProfile(now);
			expect(hasFeature(profile, 'multi_lender', now)).toBe(false);
			expect(hasFeature(profile, 'communication_hub', now)).toBe(false);
			expect(hasFeature(profile, 'smart_reminders', now)).toBe(false);
		});

		it('expired pro subscription retains free features', () => {
			const profile = expiredProProfile(now);
			expect(hasFeature(profile, 'case_management', now)).toBe(true);
			expect(hasFeature(profile, 'basic_pipeline', now)).toBe(true);
		});

		it('active pro subscription retains pro features', () => {
			const profile = activeProProfile(now);
			expect(hasFeature(profile, 'multi_lender', now)).toBe(true);
			expect(hasFeature(profile, 'smart_reminders', now)).toBe(true);
		});

		it('override still works on expired subscription', () => {
			const profile: FeatureFlagProfile = {
				...expiredProProfile(now),
				feature_flags: { multi_lender: true }
			};
			expect(hasFeature(profile, 'multi_lender', now)).toBe(true);
		});
	});

	// ── Edge cases ──────────────────────────────────────────────

	describe('edge cases', () => {
		it('unknown feature ID returns false', () => {
			expect(hasFeature(proProfile(), 'nonexistent_feature', now)).toBe(false);
		});

		it('empty string feature ID returns false', () => {
			expect(hasFeature(proProfile(), '', now)).toBe(false);
		});

		it('null profile → only free features available', () => {
			expect(hasFeature(null, 'case_management', now)).toBe(true);
			expect(hasFeature(null, 'multi_lender', now)).toBe(false);
		});

		it('undefined profile → only free features available', () => {
			expect(hasFeature(undefined, 'case_management', now)).toBe(true);
			expect(hasFeature(undefined, 'multi_lender', now)).toBe(false);
		});

		it('profile with no subscription → treated as free tier', () => {
			const profile: FeatureFlagProfile = {};
			expect(hasFeature(profile, 'case_management', now)).toBe(true);
			expect(hasFeature(profile, 'multi_lender', now)).toBe(false);
		});

		it('profile with unknown tier → treated as free tier', () => {
			const profile: FeatureFlagProfile = { subscription: { tier: 'platinum' } };
			expect(hasFeature(profile, 'case_management', now)).toBe(true);
			expect(hasFeature(profile, 'multi_lender', now)).toBe(false);
		});

		it('profile with empty feature_flags record → uses tier defaults', () => {
			const profile = proProfile({ feature_flags: {} });
			expect(hasFeature(profile, 'multi_lender', now)).toBe(true);
			expect(hasFeature(profile, 'analytics_scorecard', now)).toBe(false);
		});
	});
});

// ═══════════════════════════════════════════════════════════════
// getFeaturesForTier
// ═══════════════════════════════════════════════════════════════

describe('getFeaturesForTier', () => {
	it('free tier returns only free features (4)', () => {
		const features = getFeaturesForTier('free');
		expect(features).toHaveLength(4);
		for (const f of features) {
			expect(f.tier).toBe('free');
		}
	});

	it('pro tier returns free + pro features (10)', () => {
		const features = getFeaturesForTier('pro');
		expect(features).toHaveLength(10);
		const tiers = new Set(features.map((f) => f.tier));
		expect(tiers.has('free')).toBe(true);
		expect(tiers.has('pro')).toBe(true);
		expect(tiers.has('enterprise')).toBe(false);
	});

	it('enterprise tier returns all features (15)', () => {
		const features = getFeaturesForTier('enterprise');
		expect(features).toHaveLength(15);
	});

	it('unknown tier returns only free features', () => {
		const features = getFeaturesForTier('platinum');
		expect(features).toHaveLength(4);
		for (const f of features) {
			expect(f.tier).toBe('free');
		}
	});

	it('empty string tier returns only free features', () => {
		const features = getFeaturesForTier('');
		expect(features).toHaveLength(4);
	});

	it('returned features are a subset of FEATURE_FLAGS', () => {
		for (const tier of ['free', 'pro', 'enterprise']) {
			const features = getFeaturesForTier(tier);
			for (const f of features) {
				expect(FEATURE_FLAGS).toContainEqual(f);
			}
		}
	});

	it('higher tiers include all features from lower tiers', () => {
		const free = getFeaturesForTier('free');
		const pro = getFeaturesForTier('pro');
		const enterprise = getFeaturesForTier('enterprise');

		// All free features are in pro
		for (const f of free) {
			expect(pro).toContainEqual(f);
		}

		// All pro features are in enterprise
		for (const f of pro) {
			expect(enterprise).toContainEqual(f);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// getFeaturesByCategory
// ═══════════════════════════════════════════════════════════════

describe('getFeaturesByCategory', () => {
	it('free tier groups features correctly', () => {
		const grouped = getFeaturesByCategory('free');
		// Free tier has: core (3), documents (1)
		expect(Object.keys(grouped).sort()).toEqual(['core', 'documents']);
		expect(grouped['core']).toHaveLength(3);
		expect(grouped['documents']).toHaveLength(1);
	});

	it('pro tier includes communication and analytics categories', () => {
		const grouped = getFeaturesByCategory('pro');
		expect(grouped['communication']).toBeDefined();
		expect(grouped['analytics']).toBeDefined();
		expect(grouped['automation']).toBeDefined();
	});

	it('enterprise tier has all 5 categories', () => {
		const grouped = getFeaturesByCategory('enterprise');
		const categories = Object.keys(grouped).sort();
		expect(categories).toEqual(['analytics', 'automation', 'communication', 'core', 'documents']);
	});

	it('total features across categories equals getFeaturesForTier count', () => {
		for (const tier of ['free', 'pro', 'enterprise']) {
			const grouped = getFeaturesByCategory(tier);
			const totalGrouped = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
			const flat = getFeaturesForTier(tier);
			expect(totalGrouped).toBe(flat.length);
		}
	});

	it('each feature appears in exactly one category', () => {
		const grouped = getFeaturesByCategory('enterprise');
		const allIds: string[] = [];
		for (const features of Object.values(grouped)) {
			for (const f of features) {
				allIds.push(f.id);
			}
		}
		const unique = new Set(allIds);
		expect(unique.size).toBe(allIds.length);
	});

	it('unknown tier returns only free-tier categories', () => {
		const grouped = getFeaturesByCategory('gold');
		const totalGrouped = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
		expect(totalGrouped).toBe(4); // only free-tier features
	});

	it('omits empty categories', () => {
		const grouped = getFeaturesByCategory('free');
		// Free tier should NOT have 'communication', 'analytics', or 'automation' keys
		expect(grouped['communication']).toBeUndefined();
		expect(grouped['analytics']).toBeUndefined();
		expect(grouped['automation']).toBeUndefined();
	});
});
