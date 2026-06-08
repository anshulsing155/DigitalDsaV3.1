import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { error } from '@sveltejs/kit';
import {
	PolicyVersions,
	PolicyRules,
	Lenders,
	LenderProducts,
	ProductVariations,
	GeoScopes,
	ReviewComments,
	PolicyAuditLogs
} from '$lib/database/mongo.js';
import { PRODUCT_TYPE_LABELS, POLICY_FIELD_LABELS } from '$lib/types/policyEngine.js';
import type { PolicyFieldKey } from '$lib/types/policyEngine.js';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals, 'admin');

	const { policy_rule_id } = params;

	// Load the policy rule
	const rule = await PolicyRules.findOne({ policy_rule_id });
	if (!rule) throw error(404, 'Policy rule not found');

	// Parallel: load all versions, related entities, audit log
	const [versions, lender, product, variation, geoScope, auditEntries] = await Promise.all([
		PolicyVersions.find({ policy_rule_id }).sort({ version_number: -1 }).toArray(),
		Lenders.findOne({ lender_id: rule.lender_id }),
		LenderProducts.findOne({ product_id: rule.product_id }),
		ProductVariations.findOne({ variation_id: rule.variation_id }),
		GeoScopes.findOne({ geo_scope_id: rule.geo_scope_id }),
		PolicyAuditLogs.find({
			target_type: 'policy_version',
			target_id: { $regex: `^${policy_rule_id}` }
		})
			.sort({ created_at: -1 })
			.limit(50)
			.toArray()
	]);

	// Get comment counts per version
	const versionIds = versions.map((v) => v._id);
	const commentCounts =
		versionIds.length > 0
			? await ReviewComments.aggregate([
					{ $match: { target_type: 'policy_version', target_id: { $in: versionIds } } },
					{ $group: { _id: '$target_id', count: { $sum: 1 } } }
				]).toArray()
			: [];
	const commentCountMap = new Map(commentCounts.map((c) => [c._id.toString(), c.count]));

	const productLabel = product
		? PRODUCT_TYPE_LABELS[product.product_type] || product.product_type
		: 'Unknown';

	return {
		rule: {
			policy_rule_id: rule.policy_rule_id,
			lender_id: rule.lender_id,
			product_id: rule.product_id,
			variation_id: rule.variation_id,
			geo_scope_id: rule.geo_scope_id,
			is_cross_variation: rule.is_cross_variation,
			is_active: rule.is_active,
			active_version_number: rule.active_version_number
		},
		context: {
			lender_name: lender?.lender_name || rule.lender_id,
			product_label: productLabel,
			variation_label: variation?.label || rule.variation_id,
			geo_scope_label: geoScope
				? `${geoScope.level}: ${geoScope.label || geoScope.geo_scope_id}`
				: rule.geo_scope_id,
			geo_level: geoScope?.level || 'pan_india'
		},
		versions: versions.map((v) => ({
			_id: v._id.toString(),
			version_number: v.version_number,
			status: v.status,
			policy_fields: Object.entries(v.policy_fields || {}).map(([key, value]) => ({
				key,
				label: POLICY_FIELD_LABELS[key as PolicyFieldKey] || key,
				value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
			})),
			field_count: Object.keys(v.policy_fields || {}).length,
			overlay_count: (v.rule_overlays || []).length,
			provenance: {
				source_type: v.provenance?.source_type || 'unknown',
				source_rm_name: v.provenance?.source_rm_name || null,
				confirmation_method: v.provenance?.confirmation_method || null,
				confirmation_date: v.provenance?.confirmation_date
					? new Date(v.provenance.confirmation_date).toISOString()
					: null,
				artifact_id: v.provenance?.artifact_id || null
			},
			changelog: (v.changelog || []).map((c) => ({
				field: c.field,
				field_label: POLICY_FIELD_LABELS[c.field as PolicyFieldKey] || c.field,
				old_value: c.old_value != null ? String(c.old_value) : null,
				new_value: c.new_value != null ? String(c.new_value) : null,
				description: c.description
			})),
			effective_from: v.effective_from ? new Date(v.effective_from).toISOString() : null,
			effective_until: v.effective_until ? new Date(v.effective_until).toISOString() : null,
			comment_count: commentCountMap.get(v._id.toString()) || 0,
			created_by: v.created_by || 'Unknown',
			created_at: v.created_at ? new Date(v.created_at).toISOString() : null,
			updated_at: v.updated_at ? new Date(v.updated_at).toISOString() : null
		})),
		auditEntries: auditEntries.map((e) => ({
			_id: e._id.toString(),
			action: e.action,
			actor_name: e.actor_name,
			actor_role: e.actor_role,
			details: e.details || {},
			created_at: e.created_at ? new Date(e.created_at).toISOString() : null
		})),
		counts: {
			total_versions: versions.length,
			active: versions.filter((v) => v.status === 'active').length,
			draft: versions.filter((v) => v.status === 'draft').length,
			pending: versions.filter((v) =>
				['pending_rm_review', 'pending_admin_final', 'approved'].includes(v.status)
			).length
		}
	};
};
