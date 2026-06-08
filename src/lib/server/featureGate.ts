/**
 * Feature Gating Helper
 * ═══════════════════════════════════════════════════════════════════
 * Checks whether a feature is enabled for a given DSA, considering:
 *   1. System-wide config toggle (admin can disable globally)
 *   2. DSA-level feature_flags override (per-user enable/disable)
 *   3. Subscription tier gating (free vs pro/enterprise)
 *
 * Reusable for any feature key.
 * ═══════════════════════════════════════════════════════════════════
 */

import { SystemConfigs, DsaApplications } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';

export interface FeatureGateResult {
	enabled: boolean;
	reason?: string;
}

// In-memory TTL cache for SystemConfigs (5-minute TTL)
// These configs rarely change and are read on every feature check
const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000;
const configCache = new Map<string, { value: unknown; expiresAt: number }>();

async function getCachedSystemConfig(configKey: string) {
	const cached = configCache.get(configKey);
	if (cached && Date.now() < cached.expiresAt) {
		return cached.value;
	}

	const doc = await SystemConfigs.findOne({ config_key: configKey });
	const value = doc?.value ?? null;
	configCache.set(configKey, { value, expiresAt: Date.now() + CONFIG_CACHE_TTL_MS });
	return value;
}

/**
 * Invalidate cached system config — use when admin changes feature toggles.
 * Pass a specific key to clear one entry, or omit to flush the entire cache.
 * This ensures emergency kill switches take effect immediately instead of
 * waiting up to 5 minutes for TTL expiry.
 */
export function invalidateConfigCache(configKey?: string): void {
	if (configKey) {
		configCache.delete(configKey);
	} else {
		configCache.clear();
	}
}

/**
 * Check if a feature is enabled for a given DSA.
 *
 * @param featureKey - The system config key (e.g. 'share_links_enabled')
 * @param dsaId - The DSA's ObjectId (string or ObjectId)
 * @returns Whether the feature is enabled and why if not
 */
export async function isFeatureEnabled(
	featureKey: string,
	dsaId: string | ObjectId
): Promise<FeatureGateResult> {
	// 1. Check system-wide config (cached — 5-min TTL)
	const systemConfigValue = await getCachedSystemConfig(featureKey);
	if (systemConfigValue === false) {
		return { enabled: false, reason: 'This feature is currently disabled by the administrator' };
	}

	// 2. Check DSA-level feature_flags override
	const oid = typeof dsaId === 'string' ? new ObjectId(dsaId) : dsaId;
	const dsaDoc = await DsaApplications.findOne(
		{ _id: oid },
		{ projection: { feature_flags: 1, subscription: 1 } }
	);

	if (dsaDoc?.feature_flags) {
		// Strip the '_enabled' suffix to get the flag key
		const flagKey = featureKey.replace(/_enabled$/, '');
		if (dsaDoc.feature_flags[flagKey] === false) {
			return { enabled: false, reason: 'This feature is not available for your account' };
		}
	}

	// 3. Check subscription tier (free tier blocks premium features)
	const tier = dsaDoc?.subscription?.tier || 'free';
	const PREMIUM_FEATURES = ['share_links_enabled'];

	if (PREMIUM_FEATURES.includes(featureKey) && tier === 'free') {
		return {
			enabled: false,
			reason: 'Share links require a Pro or Enterprise subscription'
		};
	}

	return { enabled: true };
}
