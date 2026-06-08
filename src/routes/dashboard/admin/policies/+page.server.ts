import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import {
	LenderRuleArtifacts,
	Lenders,
	LenderProducts,
	ProductVariations,
	PolicyRules
} from '$lib/database/mongo.js';
import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';
import { getLenderCoverageStats } from '$lib/server/adminStats.js';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'admin');

	// ── Legacy: Aggregate artifacts grouped by lender ──
	const pipeline = [
		{ $sort: { version: -1 as const } },
		{
			$group: {
				_id: '$lender_id',
				lender_name: { $first: '$lender_name' },
				classification: { $first: '$classification' },
				latest_version: { $first: '$version' },
				latest_status: { $first: '$status' },
				latest_artifact_id: { $first: '$artifact_id' },
				latest_mongo_id: { $first: '$_id' },
				loan_types: { $first: '$loan_types' },
				updated_at: { $first: '$updated_at' },
				total_versions: { $sum: 1 }
			}
		},
		{ $sort: { lender_name: 1 as const } }
	];

	const lenderGroups = await LenderRuleArtifacts.aggregate(pipeline).toArray();

	const allArtifacts = await LenderRuleArtifacts.find({})
		.project({
			artifact_id: 1,
			lender_id: 1,
			lender_name: 1,
			classification: 1,
			loan_types: 1,
			version: 1,
			status: 1,
			created_at: 1,
			updated_at: 1,
			parsed_by: 1
		})
		.sort({ created_at: -1 })
		.limit(50)
		.toArray();

	// ── Policy Engine: Lenders with products, variations, rules ──
	const [peLenders, peProducts, peVariations, peRules] = await Promise.all([
		Lenders.find(
			{ status: 'active' },
			{
				projection: { lender_id: 1, lender_name: 1, classification: 1 }
			}
		)
			.sort({ lender_name: 1 })
			.toArray(),
		LenderProducts.find(
			{ is_active: true },
			{
				projection: { product_id: 1, lender_id: 1, product_type: 1 }
			}
		)
			.sort({ product_id: 1 })
			.toArray(),
		ProductVariations.find(
			{ is_active: true },
			{
				projection: { variation_id: 1, product_id: 1, label: 1, slug: 1, category: 1 }
			}
		)
			.sort({ variation_id: 1 })
			.toArray(),
		PolicyRules.find(
			{ is_active: true },
			{
				projection: { variation_id: 1, active_version_id: 1 }
			}
		)
			.sort({ policy_rule_id: 1 })
			.toArray()
	]);

	// Build tree structure for the browser
	const policyTree = peLenders.map((lender) => {
		const lenderProducts = peProducts.filter((p) => p.lender_id === lender.lender_id);
		return {
			lender_id: lender.lender_id,
			lender_name: lender.lender_name,
			classification: lender.classification,
			products: lenderProducts.map((product) => {
				const productVariations = peVariations.filter((v) => v.product_id === product.product_id);
				return {
					product_id: product.product_id,
					product_type: product.product_type,
					product_label: PRODUCT_TYPE_LABELS[product.product_type] || product.product_type,
					variations: productVariations.map((variation) => {
						const varRules = peRules.filter((r) => r.variation_id === variation.variation_id);
						return {
							variation_id: variation.variation_id,
							label: variation.label,
							slug: variation.slug,
							category: variation.category,
							rules_count: varRules.length,
							has_active_version: varRules.some((r) => r.active_version_id !== null)
						};
					})
				};
			})
		};
	});

	// ── Canonical lender coverage counts (C.6) ──────────────────
	// Loaded alongside the artifact stats so the page header can render
	// records / active / with-RM / with-published-policy unambiguously.
	const lenderCoverage = await getLenderCoverageStats();

	// ── Artifact stats for the header ──
	const artifactStatusAgg = await LenderRuleArtifacts.aggregate([
		{ $group: { _id: '$status', count: { $sum: 1 } } }
	]).toArray();

	const byStatus: Record<string, number> = {};
	for (const item of artifactStatusAgg) {
		byStatus[item._id as string] = item.count as number;
	}
	const totalArtifacts = Object.values(byStatus).reduce((a, b) => a + b, 0);
	const activeArtifactCount = byStatus['active'] ?? 0;
	const pendingReviewCount = (byStatus['in_review'] ?? 0) + (byStatus['rm_pending'] ?? 0);

	return {
		artifactStats: {
			total: totalArtifacts,
			active: activeArtifactCount,
			pending_review: pendingReviewCount,
			by_status: byStatus
		},
		lenderGroups: lenderGroups.map((g: Record<string, unknown>) => ({
			lender_id: g._id as string,
			lender_name: (g.lender_name || g._id) as string,
			classification: (g.classification || 'PVT') as string,
			latest_version: g.latest_version as number,
			latest_status: g.latest_status as string,
			latest_artifact_id: g.latest_artifact_id as string,
			latest_mongo_id: g.latest_mongo_id?.toString() || '',
			loan_types: (g.loan_types || []) as string[],
			updated_at: g.updated_at ? new Date(g.updated_at as string | number).toISOString() : null,
			total_versions: g.total_versions as number
		})),
		allArtifacts: allArtifacts.map((a) => ({
			_id: a._id.toString(),
			artifact_id: a.artifact_id,
			lender_id: a.lender_id,
			lender_name: a.lender_name,
			classification: a.classification,
			loan_types: a.loan_types || [],
			version: a.version,
			status: a.status,
			created_at: a.created_at ? new Date(a.created_at).toISOString() : null,
			updated_at: a.updated_at ? new Date(a.updated_at).toISOString() : null,
			parsed_by: a.parsed_by || ''
		})),
		policyTree,
		policyStats: {
			totalLenders: peLenders.length,
			totalProducts: peProducts.length,
			totalVariations: peVariations.length,
			totalRules: peRules.length
		},
		lenderCoverage
	};
};
