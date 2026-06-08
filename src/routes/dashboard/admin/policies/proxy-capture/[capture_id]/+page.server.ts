import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole, requireAdminPermissionPage } from '$lib/server/guards.js';
import { PolicyCaptures } from '$lib/database/mongo.js';
import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals, 'admin');
	requireAdminPermissionPage(locals, 'rule_authoring');

	// Only proxy captures are editable through the admin route.
	const capture = await PolicyCaptures.findOne({
		capture_id: params.capture_id,
		'provenance.source_type': 'admin_manual_proxy'
	});
	if (!capture) throw error(404, 'Proxy capture not found');

	return {
		capture: {
			capture_id: capture.capture_id,
			rm_name: capture.rm_name,
			arrival_channel: capture.provenance?.arrival_channel || null,
			lender_name: capture.lender_name,
			lender_id: capture.lender_id,
			classification: capture.classification,
			product_type: capture.product_type,
			product_type_label: PRODUCT_TYPE_LABELS[capture.product_type] || capture.product_type,
			geo_state: capture.geo_state || null,
			status: capture.status,
			current_step: capture.current_step,
			completed_steps: capture.completed_steps,
			completion_percent: capture.completion_percent,
			data: capture.data,
			unknown_fields: capture.unknown_fields,
			created_at: capture.created_at.toISOString(),
			updated_at: capture.updated_at.toISOString()
		}
	};
};
