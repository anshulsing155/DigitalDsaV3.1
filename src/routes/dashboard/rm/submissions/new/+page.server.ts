import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { Lenders, LenderProducts, GeoScopes, rmApplications } from '$lib/database/mongo.js';
import { getLenderNameFromDomain } from '$lib/config/lenderDomains.js';
import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'rm');

	const user = locals.user!;

	// Load RM profile to get their bank name
	let rmDoc;
	try {
		rmDoc = await rmApplications.findOne(
			{ _id: new ObjectId(user.id) },
			{ projection: { bankName: 1, officialEmail: 1, rmOfficialEmail: 1 } }
		);
	} catch {
		rmDoc = await rmApplications.findOne(
			{ mobileNumber: { $in: [Number(user.mobileNumber), user.mobileNumber] } as any },
			{ projection: { bankName: 1, officialEmail: 1, rmOfficialEmail: 1 } }
		);
	}

	const rmBankName =
		rmDoc?.bankName ||
		getLenderNameFromDomain((rmDoc as any)?.officialEmail || rmDoc?.rmOfficialEmail || '') ||
		'';

	const [lenders, products, geoStates] = await Promise.all([
		Lenders.find({ status: 'active' }).sort({ lender_name: 1 }).toArray(),
		LenderProducts.find({ is_active: true }).sort({ product_id: 1 }).toArray(),
		GeoScopes.find({ level: 'state' }).sort({ label: 1 }).toArray()
	]);

	// Try to find the RM's bank in the lenders list for auto-selection
	const rmLenderId = rmBankName
		? lenders.find((l) => l.lender_name.toLowerCase() === rmBankName.toLowerCase())?.lender_id || ''
		: '';

	return {
		rmBankName,
		rmLenderId,
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
		geoStates: geoStates.map((g) => ({
			geo_scope_id: g.geo_scope_id,
			label: g.label
		}))
	};
};
