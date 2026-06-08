import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/guards.js';
import { PolicyCaptures } from '$lib/database/mongo.js';
import { resolveRmDoc } from '$lib/server/rmHelpers.js';
import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals, 'rm');

	const user = locals.user!;
	// SEC-2/CSFLE-aware resolution (see list +page.server.ts for rationale).
	const rmDoc = await resolveRmDoc(user);

	if (!rmDoc?._id) {
		throw error(404, 'RM profile not found');
	}

	const capture = await PolicyCaptures.findOne({
		capture_id: params.capture_id,
		rm_id: rmDoc._id.toString()
	});

	if (!capture) {
		throw error(404, 'Policy capture not found');
	}

	return {
		capture: {
			capture_id: capture.capture_id,
			lender_name: capture.lender_name,
			lender_id: capture.lender_id,
			classification: capture.classification,
			product_type: capture.product_type,
			product_type_label: PRODUCT_TYPE_LABELS[capture.product_type] || capture.product_type,
			geo_state: capture.geo_state || null,
			geo_city: capture.geo_city || null,
			status: capture.status,
			current_step: capture.current_step,
			completed_steps: capture.completed_steps,
			completion_percent: capture.completion_percent,
			data: capture.data,
			unknown_fields: capture.unknown_fields,
			// A.2 Slice 3 — proxy provenance drives the "entered by admin" banner + Confirm action.
			provenance: capture.provenance
				? {
						source_type: capture.provenance.source_type,
						arrival_channel: capture.provenance.arrival_channel ?? null,
						reference_note: capture.provenance.reference_note ?? null,
						captured_at: capture.provenance.captured_at
							? new Date(capture.provenance.captured_at).toISOString()
							: null,
						confirmed_at: capture.provenance.confirmed_at
							? new Date(capture.provenance.confirmed_at).toISOString()
							: null
					}
				: null,
			created_at: capture.created_at.toISOString(),
			updated_at: capture.updated_at.toISOString()
		}
	};
};
