import type { PageServerLoad } from './$types';
import { requireRole, requireAdminPermissionPage } from '$lib/server/guards.js';
import { Lenders, LenderProducts, GeoScopes } from '$lib/database/mongo.js';
import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'admin');
	requireAdminPermissionPage(locals, 'rule_authoring');

	const [lenders, products, geoStates] = await Promise.all([
		Lenders.find({ status: 'active' }).sort({ lender_name: 1 }).toArray(),
		LenderProducts.find({ is_active: true }).sort({ product_id: 1 }).toArray(),
		GeoScopes.find({ level: 'state' }).sort({ label: 1 }).toArray()
	]);

	return {
		lenders: lenders.map((l) => ({
			lender_id: l.lender_id,
			lender_name: l.lender_name,
			classification: l.classification
		})),
		products: products.map((p) => ({
			product_id: p.product_id,
			lender_id: p.lender_id,
			product_type: p.product_type,
			product_label: PRODUCT_TYPE_LABELS[p.product_type] || p.product_type
		})),
		geoStates: geoStates.map((g) => ({ geo_scope_id: g.geo_scope_id, label: g.label }))
	};
};
