/**
 * POST /api/leads/[lead_id]/convert — Convert lead to Case
 * ═══════════════════════════════════════════════════════════════════
 * Creates a new Case from the lead data and links them.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { Leads, Cases } from '$lib/database/mongo.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { requireTeamPermission } from '$lib/server/guards.js';
import {
	resolveEffectiveDsaId,
	generateCaseId,
	createTimelineEvent
} from '$lib/server/caseHelpers.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';

export const POST: RequestHandler = async ({ params, locals }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;
	const permDenied = requireTeamPermission(locals, 'cases_create');
	if (permDenied) return permDenied;

	try {
		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) return apiError(result.error, 404);

		const lead = await Leads.findOne({
			lead_id: params.lead_id,
			dsa_id: result.dsaId
		});

		if (!lead) {
			return apiError('Lead not found', 404);
		}

		if (lead.status === 'converted') {
			// left: error response carries an extra top-level `data` key (case_id) —
			// not the clean apiError shape; the client reads data.case_id off the 409.
			return json(
				{
					success: false,
					error: 'Lead already converted',
					data: { case_id: lead.converted_case_id }
				},
				{ status: 409 }
			);
		}

		const now = new Date();
		const loanType = lead.loan_type || 'Home Loan';
		const caseId = await generateCaseId(loanType, result.dsaId);

		// Create a new case from the lead
		await Cases.insertOne({
			case_id: caseId,
			dsa_id: result.dsaId,
			label: lead.label,
			loan: {
				type: loanType,
				amount_required: lead.estimated_amount
			},
			stage: 'intake',
			stage_history: [{ from: 'intake' as any, to: 'intake', timestamp: now }],
			lender_applications: [],
			optional_contact: lead.optional_contact,
			source: lead.source_id ? { source_contact_id: lead.source_id.toString() } : undefined,
			notes: lead.notes,
			created_at: now,
			updated_at: now,
			is_archived: false,
			is_sample: false
		});

		// Update lead: mark as converted
		await Leads.updateOne(
			{ _id: lead._id },
			{
				$set: {
					status: 'converted',
					converted_case_id: caseId,
					updated_at: now
				},
				$push: {
					status_history: {
						from: lead.status,
						to: 'converted' as const,
						timestamp: now,
						notes: `Converted to case ${caseId}`
					}
				} as any
			}
		);

		logger.info(
			{ leadId: lead.lead_id, caseId, dsaId: result.dsaId.toString() },
			'Lead converted to case'
		);

		// Timeline event
		await createTimelineEvent(caseId, 'case_created', `Case created from lead ${lead.lead_id}`);

		return apiOk({ case_id: caseId, lead_id: lead.lead_id }, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to convert lead');
	}
};
