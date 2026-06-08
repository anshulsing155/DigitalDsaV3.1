import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { PolicyCaptures } from '$lib/database/mongo.js';
import { resolveRmDoc } from '$lib/server/rmHelpers.js';
import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'rm');

	const user = locals.user!;
	// SEC-2/CSFLE-aware resolution: handles both ObjectId user ids and the
	// encrypted-mobile fallback. The naive findOne({_id}) used previously
	// returned null (never tried mobile) for RMs whose session id isn't their
	// rmApplications._id — they couldn't see their own captures.
	const rmDoc = await resolveRmDoc(user);

	if (!rmDoc?._id) {
		return { captures: [], productTypeLabels: PRODUCT_TYPE_LABELS };
	}

	const captures = await PolicyCaptures.find({ rm_id: rmDoc._id.toString() })
		.sort({ updated_at: -1 })
		.limit(50)
		.toArray();

	return {
		captures: captures.map((c) => ({
			capture_id: c.capture_id,
			lender_name: c.lender_name,
			product_type: c.product_type,
			status: c.status,
			completion_percent: c.completion_percent,
			current_step: c.current_step,
			unknown_fields_count: c.unknown_fields.length,
			// A.2 Slice 3 — proxy provenance drives the "entered by admin" / "confirmed" chip.
			provenance_source: c.provenance?.source_type ?? null,
			created_at: c.created_at.toISOString(),
			updated_at: c.updated_at.toISOString()
		})),
		productTypeLabels: PRODUCT_TYPE_LABELS
	};
};
