/**
 * GET /api/leads — List leads (filtered by status, paginated)
 * POST /api/leads — Create a new lead
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { Leads, Cases, LeadIdCounters } from '$lib/database/mongo.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { requireTeamPermission } from '$lib/server/guards.js';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers.js';
import { leadCreateSchema, leadStatusEnum } from '$lib/schemas/lead.schema.js';
import type { Lead } from '$lib/types/lead.js';
import { ObjectId } from 'mongodb';
import {
	parseJsonBody,
	apiOk,
	apiError,
	apiValidationError,
	apiServerError
} from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';

/** Valid lead status values for query filtering */
const VALID_LEAD_STATUSES = new Set(leadStatusEnum.options);

/** Generate a sequential lead ID atomically: LD-{YEAR}-{SEQ} */
async function generateLeadId(dsaId: ObjectId): Promise<string> {
	const year = new Date().getFullYear();
	const counterKey = `${dsaId.toString()}-${year}`;

	// Atomic increment prevents race conditions under concurrent requests
	const result = await LeadIdCounters.findOneAndUpdate(
		{ _id: counterKey },
		{ $inc: { seq: 1 } },
		{ upsert: true, returnDocument: 'after' }
	);

	const seq = result?.seq ?? 1;
	return `LD-${year}-${String(seq).padStart(4, '0')}`;
}

export const GET: RequestHandler = async ({ locals, url }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;
	const permDenied = requireTeamPermission(locals, 'leads_view');
	if (permDenied) return permDenied;

	const result = await resolveEffectiveDsaId(locals);
	if (!result.ok) return apiError(result.error, 404);

	const status = url.searchParams.get('status');
	const archived = url.searchParams.get('archived') === 'true';
	const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100);
	const skip = Number(url.searchParams.get('skip')) || 0;

	const filter: any = { dsa_id: result.dsaId, is_archived: archived };
	if (status) {
		// Validate status against known enum to prevent arbitrary query values
		if (!VALID_LEAD_STATUSES.has(status as any)) {
			return apiError(`Invalid status: ${status}`, 400);
		}
		filter.status = status;
	}

	const [leads, total] = await Promise.all([
		Leads.find(filter).sort({ updated_at: -1 }).skip(skip).limit(limit).toArray(),
		Leads.countDocuments(filter)
	]);

	return apiOk({
		leads: leads.map((l) => ({
			...l,
			_id: l._id!.toString(),
			dsa_id: l.dsa_id.toString(),
			source_id: l.source_id?.toString() || null,
			created_by_member_id: l.created_by_member_id?.toString() || null
		})),
		total,
		limit,
		skip
	});
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;
	const permDenied = requireTeamPermission(locals, 'leads_create');
	if (permDenied) return permDenied;

	try {
		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) return apiError(result.error, 404);

		const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
		if (!jsonParsed.ok) return jsonParsed.response;
		const parsed = leadCreateSchema.safeParse(jsonParsed.data);
		if (!parsed.success) {
			const errors: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const key = issue.path[0] as string;
				if (!errors[key]) errors[key] = issue.message;
			}
			return apiValidationError('Validation failed', errors);
		}

		const data = parsed.data;
		const now = new Date();
		const leadId = await generateLeadId(result.dsaId);

		// If the user is a team member, record their ID
		let createdByMemberId: ObjectId | undefined;
		if (locals.user?.teamContext && !locals.user.teamContext.isOwner) {
			createdByMemberId = new ObjectId(locals.user.id);
		}

		const newLead: Omit<Lead, '_id'> = {
			lead_id: leadId,
			dsa_id: result.dsaId,
			created_by_member_id: createdByMemberId,
			label: data.label,
			loan_type: data.loan_type,
			estimated_amount: data.estimated_amount,
			source_id: data.source_id ? new ObjectId(data.source_id) : undefined,
			optional_contact: data.optional_contact,
			status: 'new',
			status_history: [],
			follow_up_date: data.follow_up_date,
			notes: data.notes,
			created_at: now,
			updated_at: now,
			is_archived: false
		};

		const insertResult = await Leads.insertOne(newLead);

		logger.info(
			{ leadId, dsaId: result.dsaId.toString(), loanType: data.loan_type },
			'Lead created'
		);

		return apiOk({ lead_id: leadId, _id: insertResult.insertedId.toString() }, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to create lead');
	}
};
