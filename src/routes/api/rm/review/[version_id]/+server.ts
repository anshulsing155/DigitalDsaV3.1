/**
 * GET /api/rm/review/[version_id]
 * Get a policy version's human-readable doc for RM review.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { requireRoleApi, requireRmLenderAccess } from '$lib/server/guards.js';
import {
	rmApplications,
	PolicyVersions,
	PolicyRules,
	ProductVariations,
	Lenders,
	GeoScopes
} from '$lib/database/mongo.js';
import { generatePolicyDoc } from '$lib/server/policyDocGenerator.js';
import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;

	try {
		const versionId = params.version_id;
		if (!versionId || !ObjectId.isValid(versionId)) {
			return apiError('Invalid version_id', 400);
		}

		const version = await PolicyVersions.findOne({ _id: new ObjectId(versionId) });
		if (!version) {
			return apiError('Version not found', 404);
		}

		// Only show versions in pending_rm_review status
		if (version.status !== 'pending_rm_review') {
			return apiError('This version is not pending RM review', 400);
		}

		// Load context for doc generation
		const rule = await PolicyRules.findOne({ policy_rule_id: version.policy_rule_id });
		if (!rule) {
			return apiError('Associated rule not found', 404);
		}

		// BOLA gate (Finding M1, resolved 2026-05-15): legacy review flow previously
		// let any RM read any pending version regardless of lender assignment. Now
		// scoped to {rmUserId, lenderId, status: 'active'} — matches the PMS pattern.
		// Admin bypasses inside the guard.
		const [denied2] = await requireRmLenderAccess(locals, rule.lender_id);
		if (denied2) return denied2;

		const [variation, lender, geoScope] = await Promise.all([
			ProductVariations.findOne({ variation_id: rule.variation_id }),
			Lenders.findOne({ lender_id: rule.lender_id }),
			GeoScopes.findOne({ geo_scope_id: rule.geo_scope_id })
		]);

		// Generate human-readable doc
		const doc = generatePolicyDoc({
			lender_name: lender?.lender_name || rule.lender_id,
			product_label:
				PRODUCT_TYPE_LABELS[
					variation?.product_id?.split(':')[1] as keyof typeof PRODUCT_TYPE_LABELS
				] || 'Unknown Product',
			variation_label: variation?.label || 'Standard',
			geo_label: geoScope?.label || 'PAN India',
			policy_fields: version.policy_fields,
			version_number: version.version_number,
			effective_from: version.effective_from,
			source_type: version.provenance?.source_type
		});

		return apiOk({
			version_id: versionId,
			policy_rule_id: version.policy_rule_id,
			version_number: version.version_number,
			status: version.status,
			policy_fields: version.policy_fields,
			human_readable_doc: doc,
			lender_name: lender?.lender_name || rule.lender_id,
			variation_label: variation?.label || 'Standard',
			geo_label: geoScope?.label || 'PAN India',
			provenance: version.provenance,
			created_at: version.created_at
		});
	} catch (err) {
		return apiServerError(err, 'Failed to get review document');
	}
};
