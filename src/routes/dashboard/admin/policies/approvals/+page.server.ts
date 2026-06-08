import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import {
	PolicyVersions,
	PolicyRules,
	Lenders,
	LenderProducts,
	ProductVariations,
	RMSubmissions,
	LenderRuleArtifacts,
	ReviewComments,
	PolicyCaptures
} from '$lib/database/mongo.js';
import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'admin');

	// Parallel queries
	const [pendingVersions, pendingSubmissions, parsingArtifacts, recentlyActivated, pendingCaptures] =
		await Promise.all([
			// Policy versions needing action
			PolicyVersions.find({
				status: { $in: ['pending_rm_review', 'pending_admin_final'] }
			})
				.sort({ updated_at: -1 })
				.limit(50)
				.toArray(),

			// RM submissions needing review
			RMSubmissions.find({
				status: { $in: ['submitted', 'under_review', 'clarification_needed'] }
			})
				.sort({ created_at: -1 })
				.limit(50)
				.toArray(),

			// Currently parsing artifacts
			LenderRuleArtifacts.find({ status: 'parsing' })
				.project({ artifact_id: 1, lender_name: 1, lender_id: 1, updated_at: 1 })
				.toArray(),

			// Recently activated versions (last 10)
			PolicyVersions.find({
				status: { $in: ['approved', 'active'] }
			})
				.sort({ updated_at: -1 })
				.limit(10)
				.toArray(),

			// A.2 Slice 4 — structured policy captures awaiting admin review.
			// Covers BOTH RM self-captures and admin proxy captures (same
			// collection); the activate endpoint converts them to live artifacts.
			PolicyCaptures.find({
				status: { $in: ['submitted', 'under_review'] }
			})
				.sort({ updated_at: -1 })
				.limit(50)
				.toArray()
		]);

	// Enrich versions with lender/product names
	// Collect unique policy_rule_ids from pending + recently activated
	const allVersions = [...pendingVersions, ...recentlyActivated];
	const ruleIds = [...new Set(allVersions.map((v) => v.policy_rule_id))];

	// Batch load rules, then lenders/products
	const rules =
		ruleIds.length > 0
			? await PolicyRules.find({ policy_rule_id: { $in: ruleIds } }).toArray()
			: [];
	const ruleMap = new Map(rules.map((r) => [r.policy_rule_id, r]));

	const lenderIds = [...new Set(rules.map((r) => r.lender_id))];
	const productIds = [...new Set(rules.map((r) => r.product_id))];
	const variationIds = [...new Set(rules.map((r) => r.variation_id))];

	const [lenders, products, variations] = await Promise.all([
		lenderIds.length > 0 ? Lenders.find({ lender_id: { $in: lenderIds } }).toArray() : [],
		productIds.length > 0 ? LenderProducts.find({ product_id: { $in: productIds } }).toArray() : [],
		variationIds.length > 0
			? ProductVariations.find({ variation_id: { $in: variationIds } }).toArray()
			: []
	]);

	const lenderMap = new Map(lenders.map((l) => [l.lender_id, l.lender_name]));
	const productMap = new Map(products.map((p) => [p.product_id, p.product_type]));
	const variationMap = new Map(variations.map((v) => [v.variation_id, v.label]));

	// Get comment counts per version
	const versionIds = pendingVersions.map((v) => v._id);
	const commentCounts =
		versionIds.length > 0
			? await ReviewComments.aggregate([
					{ $match: { target_type: 'policy_version', target_id: { $in: versionIds } } },
					{ $group: { _id: '$target_id', count: { $sum: 1 } } }
				]).toArray()
			: [];
	const commentCountMap = new Map(commentCounts.map((c) => [c._id.toString(), c.count]));

	function enrichVersion(v: any) {
		const rule = ruleMap.get(v.policy_rule_id);
		const productType = rule ? productMap.get(rule.product_id) : null;
		return {
			_id: v._id.toString(),
			policy_rule_id: v.policy_rule_id,
			version_number: v.version_number,
			status: v.status,
			lender_name: rule ? lenderMap.get(rule.lender_id) || rule.lender_id : 'Unknown',
			product_label: productType ? PRODUCT_TYPE_LABELS[productType] || productType : 'Unknown',
			variation_label: rule ? variationMap.get(rule.variation_id) || rule.variation_id : 'Unknown',
			geo_scope_id: rule?.geo_scope_id || 'pan_india',
			field_count: Object.keys(v.policy_fields || {}).length,
			source_type: v.provenance?.source_type || 'unknown',
			source_rm_name: v.provenance?.source_rm_name || null,
			confirmation_method: v.provenance?.confirmation_method || null,
			comment_count: commentCountMap.get(v._id.toString()) || 0,
			created_by: v.created_by || 'Unknown',
			created_at: v.created_at ? new Date(v.created_at).toISOString() : null,
			updated_at: v.updated_at ? new Date(v.updated_at).toISOString() : null
		};
	}

	return {
		pendingVersions: pendingVersions.map(enrichVersion),
		recentlyActivated: recentlyActivated.map(enrichVersion),
		pendingSubmissions: pendingSubmissions.map((s) => ({
			_id: s._id.toString(),
			submission_id: s.submission_id,
			rm_name: s.rm_name,
			lender_name: s.lender_name,
			lender_id: s.lender_id,
			product_type: s.product_type || null,
			variation_slug: s.variation_slug || null,
			geo_state: s.geo_state || null,
			status: s.status,
			urgency: s.urgency,
			description: s.description,
			document_count: s.document_ids?.length || 0,
			created_at: s.created_at ? new Date(s.created_at).toISOString() : null,
			updated_at: s.updated_at ? new Date(s.updated_at).toISOString() : null
		})),
		parsingArtifacts: parsingArtifacts.map((a) => ({
			_id: a._id.toString(),
			artifact_id: a.artifact_id,
			lender_name: a.lender_name,
			updated_at: a.updated_at ? new Date(a.updated_at).toISOString() : null
		})),
		pendingCaptures: pendingCaptures.map((c) => ({
			capture_id: c.capture_id,
			lender_name: c.lender_name,
			product_type: c.product_type,
			product_label: PRODUCT_TYPE_LABELS[c.product_type] || c.product_type,
			geo_state: c.geo_state || null,
			status: c.status,
			completion_percent: c.completion_percent,
			unknown_fields_count: c.unknown_fields?.length || 0,
			rm_name: c.rm_name,
			provenance_source: c.provenance?.source_type ?? 'rm_self',
			updated_at: c.updated_at ? new Date(c.updated_at).toISOString() : null
		})),
		counts: {
			pendingVersions: pendingVersions.length,
			pendingSubmissions: pendingSubmissions.length,
			parsingArtifacts: parsingArtifacts.length,
			recentlyActivated: recentlyActivated.length,
			pendingCaptures: pendingCaptures.length
		}
	};
};
