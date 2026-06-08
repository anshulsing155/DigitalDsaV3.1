import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { Lenders, LenderProducts, GeoScopes, rmApplications } from '$lib/database/mongo.js';
import { getLenderNameFromDomain } from '$lib/config/lenderDomains.js';
import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'rm');

	const user = locals.user!;

	let rmDoc;
	try {
		rmDoc = await rmApplications.findOne(
			{ _id: new ObjectId(user.id) },
			{
				projection: {
					bankName: 1,
					officialEmail: 1,
					rmOfficialEmail: 1,
					workingCity: 1,
					city: 1
				}
			}
		);
	} catch {
		rmDoc = await rmApplications.findOne(
			{ mobileNumber: { $in: [Number(user.mobileNumber), user.mobileNumber] } as any },
			{
				projection: {
					bankName: 1,
					officialEmail: 1,
					rmOfficialEmail: 1,
					workingCity: 1,
					city: 1
				}
			}
		);
	}

	const rmBankName =
		rmDoc?.bankName ||
		getLenderNameFromDomain((rmDoc as any)?.officialEmail || rmDoc?.rmOfficialEmail || '') ||
		'';

	// PMS Phase 2.A passive intelligence (2026-05-31): RM's working city is
	// the implicit scope for any policy they author. Captured at onboarding
	// from the same segment-cities list seeded into GeoScopes, so the city
	// label is guaranteed to map to a city-level geo_scope_id row.
	const rmCity = (rmDoc as any)?.workingCity || (rmDoc as any)?.city || '';

	const [lenders, products, rmCityScope] = await Promise.all([
		Lenders.find({ status: 'active' }).sort({ lender_name: 1 }).toArray(),
		LenderProducts.find({ is_active: true }).sort({ product_id: 1 }).toArray(),
		// Resolve the working city to its geo_scope_id (e.g. "maharashtra:pune").
		// Returns null if the city row isn't seeded yet — the form handles that.
		rmCity ? GeoScopes.findOne({ level: 'city', label: rmCity }) : Promise.resolve(null)
	]);

	const rmLenderId = rmBankName
		? lenders.find((l) => l.lender_name.toLowerCase() === rmBankName.toLowerCase())?.lender_id || ''
		: '';

	return {
		rmBankName,
		rmLenderId,
		rmCity,
		rmCityScopeId: rmCityScope?.geo_scope_id ?? null,
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
		}))
	};
};
