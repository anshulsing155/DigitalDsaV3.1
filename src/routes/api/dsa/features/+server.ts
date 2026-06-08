/**
 * GET  /api/dsa/features
 * ══════════════════════════════════════════════════════════════════
 * Returns the authenticated DSA's feature flags, subscription tier,
 * and the full flag registry so the client can render upgrade prompts.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { DsaApplications } from '$lib/database/mongo.js';
import { resolveDsaId } from '$lib/server/caseHelpers.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { FEATURE_FLAGS, hasFeature, isSubscriptionActive } from '$lib/server/featureFlags.js';

// ── GET — Feature flags for the authenticated DSA ───────────────

export const GET: RequestHandler = async ({ locals }) => {
	// Auth + role guard
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;

	try {
		const result = await resolveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}

		// Fetch subscription & feature_flags from DSA document
		const dsaDoc = await DsaApplications.findOne(
			{ _id: result.dsaId },
			{ projection: { subscription: 1, feature_flags: 1 } }
		);

		const subscription = (dsaDoc as any)?.subscription ?? undefined;
		const featureFlags = (dsaDoc as any)?.feature_flags ?? undefined;

		const profile = { subscription, feature_flags: featureFlags };
		const tier = subscription?.tier ?? 'free';
		const is_active = isSubscriptionActive(subscription);

		// Build feature map: featureId → boolean
		const features: Record<string, boolean> = {};
		for (const flag of FEATURE_FLAGS) {
			features[flag.id] = hasFeature(profile, flag.id);
		}

		return apiOk({
			tier,
			is_active,
			features,
			all_flags: FEATURE_FLAGS
		});
	} catch (error) {
		return apiServerError(error, 'Internal server error');
	}
};
