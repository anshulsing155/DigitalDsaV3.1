/**
 * GET /api/leads/[lead_id] — Get lead detail
 * PATCH /api/leads/[lead_id] — Update lead
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { Leads } from '$lib/database/mongo.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { requireTeamPermission } from '$lib/server/guards.js';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers.js';
import { leadUpdateSchema } from '$lib/schemas/lead.schema.js';
import type { LeadStatusChange } from '$lib/types/lead.js';
import { parseJsonBody, apiOk, apiError, apiValidationError } from '$lib/server/apiResponse.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;
	const permDenied = requireTeamPermission(locals, 'leads_view');
	if (permDenied) return permDenied;

	const result = await resolveEffectiveDsaId(locals);
	if (!result.ok) return apiError(result.error, 404);

	const lead = await Leads.findOne({
		lead_id: params.lead_id,
		dsa_id: result.dsaId
	});

	if (!lead) {
		return apiError('Lead not found', 404);
	}

	return apiOk({
		...lead,
		_id: lead._id!.toString(),
		dsa_id: lead.dsa_id.toString(),
		source_id: lead.source_id?.toString() || null,
		created_by_member_id: lead.created_by_member_id?.toString() || null
	});
};

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;
	const permDenied = requireTeamPermission(locals, 'leads_edit');
	if (permDenied) return permDenied;

	const result = await resolveEffectiveDsaId(locals);
	if (!result.ok) return apiError(result.error, 404);

	const lead = await Leads.findOne({
		lead_id: params.lead_id,
		dsa_id: result.dsaId
	});

	if (!lead) {
		return apiError('Lead not found', 404);
	}

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;
	const parsed = leadUpdateSchema.safeParse(jsonParsed.data);
	if (!parsed.success) {
		const errors: Record<string, string> = {};
		for (const issue of parsed.error.issues) {
			const key = issue.path[0] as string;
			if (!errors[key]) errors[key] = issue.message;
		}
		return apiValidationError('Validation failed', errors);
	}

	const updates = parsed.data;
	const now = new Date();
	const setFields: Record<string, any> = { updated_at: now };
	const pushFields: Record<string, any> = {};

	// Track status changes
	if (updates.status && updates.status !== lead.status) {
		const statusChange: LeadStatusChange = {
			from: lead.status,
			to: updates.status,
			timestamp: now,
			notes: updates.notes
		};
		pushFields.status_history = statusChange;
		setFields.status = updates.status;
	}

	// Copy simple fields
	if (updates.label !== undefined) setFields.label = updates.label;
	if (updates.loan_type !== undefined) setFields.loan_type = updates.loan_type;
	if (updates.estimated_amount !== undefined) setFields.estimated_amount = updates.estimated_amount;
	if (updates.optional_contact !== undefined) setFields.optional_contact = updates.optional_contact;
	if (updates.follow_up_date !== undefined) setFields.follow_up_date = updates.follow_up_date;
	if (updates.notes !== undefined) setFields.notes = updates.notes;
	if (updates.is_archived !== undefined) setFields.is_archived = updates.is_archived;
	if (updates.source_id !== undefined) {
		const { ObjectId } = await import('mongodb');
		setFields.source_id = updates.source_id ? new ObjectId(updates.source_id) : null;
	}

	const updateOp: any = { $set: setFields };
	if (Object.keys(pushFields).length > 0) {
		updateOp.$push = pushFields;
	}

	await Leads.updateOne({ _id: lead._id }, updateOp);

	return apiOk({ updated: true });
};
