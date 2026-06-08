/**
 * PATCH / DELETE  /api/cases/[case_id]/lender-applications/[lender_app_id]
 * ══════════════════════════════════════════════════════════════════
 * PATCH  — Update a lender application: status, tracking, sanction,
 *          disbursement, or rejection details.
 * DELETE — Remove a lender application from the case.
 * ══════════════════════════════════════════════════════════════════
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { Cases } from '$lib/database/mongo.js';
import {
	lenderAppStatusEnum,
	technicalStatusEnum,
	legalStatusEnum,
	creditApprovalEnum
} from '$lib/schemas/case.schema.js';
import { validateLenderTransition } from '$lib/server/stagePipeline.js';
import {
	resolveEffectiveDsaId,
	verifyCaseOwnership,
	createTimelineEvent
} from '$lib/server/caseHelpers.js';
import { bankData } from '$lib/config/bankSelection/bankName.js';
import { blockDemoWrite, requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import logger from '$lib/server/logger.js';
import {
	apiOk,
	apiError,
	apiValidationError,
	apiServerError,
	parseJsonBody
} from '$lib/server/apiResponse.js';

// ── Validation schema for lender application updates ────────────

const lenderAppUpdateSchema = z.object({
	status: lenderAppStatusEnum.optional(),
	lender_tracking: z
		.object({
			login_number: z.string().optional(),
			login_date: z.coerce.date().optional(),
			technical_status: technicalStatusEnum.optional(),
			legal_status: legalStatusEnum.optional(),
			credit_approval: creditApprovalEnum.optional(),
			conditions: z.array(z.string()).optional()
		})
		.optional(),
	sanction: z
		.object({
			amount: z.number().positive().optional(),
			roi: z.number().min(0).optional(),
			tenure_months: z.number().int().positive().optional(),
			sanction_date: z.coerce.date().optional(),
			sanction_letter_ref: z.string().optional(),
			conditions: z.array(z.string()).optional()
		})
		.optional(),
	disbursement: z
		.object({
			total_amount: z.number().positive().optional(),
			tranches: z
				.array(
					z.object({
						tranche_number: z.number().int().positive(),
						amount: z.number().positive(),
						date: z.coerce.date(),
						reference: z.string().optional()
					})
				)
				.optional()
		})
		.optional(),
	rejection: z
		.object({
			reason_category: z.string().optional(),
			reason_detail: z.string().optional(),
			rejection_date: z.coerce.date().optional()
		})
		.optional(),
	notes: z.string().optional()
});

// ── PATCH — Update lender application ───────────────────────────

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'cases_edit');
	if (permDenied) return permDenied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		// Validate input
		const parsed = lenderAppUpdateSchema.safeParse(jsonParsed.data);
		if (!parsed.success) {
			return apiValidationError('Validation failed', parsed.error.flatten());
		}

		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}

		const ownership = await verifyCaseOwnership(params.case_id, result.dsaId);
		if (!ownership.ok) {
			const status = ownership.error === 'Case not found' ? 404 : 403;
			return apiError(ownership.error, status);
		}

		const caseDoc = ownership.caseDoc;
		const lenderAppId = params.lender_app_id;

		// Find the lender application
		const lenderAppIndex = caseDoc.lender_applications.findIndex(
			(la) => la.lender_application_id === lenderAppId
		);

		if (lenderAppIndex === -1) {
			return apiError('Lender application not found', 404);
		}

		const lenderApp = caseDoc.lender_applications[lenderAppIndex];
		const data = parsed.data;
		const now = new Date();
		const prefix = `lender_applications.${lenderAppIndex}`;

		// ── Build update ────────────────────────────────────────
		const $set: Record<string, any> = {
			[`${prefix}.updated_at`]: now,
			updated_at: now
		};
		const $push: Record<string, any> = {};

		// Status change validation
		if (data.status && data.status !== lenderApp.status) {
			const transition = validateLenderTransition(lenderApp.status, data.status);
			if (!transition.valid) {
				// left: transition.error is `string | undefined`; apiError requires a
				// definite string. Coercing would change output when error is undefined.
				return json({ success: false, error: transition.error }, { status: 400 });
			}

			$set[`${prefix}.status`] = data.status;
			$push[`${prefix}.status_history`] = {
				from: lenderApp.status,
				to: data.status,
				timestamp: now,
				notes: data.notes
			};

			// Create timeline event for status change
			await createTimelineEvent(
				params.case_id,
				'lender_status_changed',
				`${lenderApp.lender_name}: status changed from ${lenderApp.status} to ${data.status}`,
				{
					lender_name: lenderApp.lender_name,
					lender_application_id: lenderAppId,
					from: lenderApp.status,
					to: data.status
				}
			);
		}

		// Tracking updates
		if (data.lender_tracking) {
			for (const [key, value] of Object.entries(data.lender_tracking)) {
				if (value !== undefined) {
					$set[`${prefix}.lender_tracking.${key}`] = value;
				}
			}
		}

		// Sanction updates
		if (data.sanction) {
			for (const [key, value] of Object.entries(data.sanction)) {
				if (value !== undefined) {
					$set[`${prefix}.sanction.${key}`] = value;
				}
			}

			// Create sanction timeline event if amount is provided
			if (data.sanction.amount) {
				await createTimelineEvent(
					params.case_id,
					'sanction',
					`Sanction received from ${lenderApp.lender_name}: Rs ${data.sanction.amount.toLocaleString('en-IN')}`,
					{
						lender_name: lenderApp.lender_name,
						amount: data.sanction.amount,
						roi: data.sanction.roi
					}
				);
			}
		}

		// Disbursement updates
		if (data.disbursement) {
			for (const [key, value] of Object.entries(data.disbursement)) {
				if (value !== undefined) {
					$set[`${prefix}.disbursement.${key}`] = value;
				}
			}

			// Create disbursement timeline event if total_amount is provided
			if (data.disbursement.total_amount) {
				await createTimelineEvent(
					params.case_id,
					'disbursement',
					`Disbursement from ${lenderApp.lender_name}: Rs ${data.disbursement.total_amount.toLocaleString('en-IN')}`,
					{
						lender_name: lenderApp.lender_name,
						total_amount: data.disbursement.total_amount
					}
				);
			}
		}

		// Rejection updates + auto-generate reroute suggestions
		if (data.rejection) {
			for (const [key, value] of Object.entries(data.rejection)) {
				if (value !== undefined) {
					$set[`${prefix}.rejection.${key}`] = value;
				}
			}

			// Auto-generate reroute suggestions: suggest 2-3 lenders not already in this case
			const existingLenderNames = new Set(caseDoc.lender_applications.map((la) => la.lender_name));
			const suggestions = bankData
				.filter((bank) => !existingLenderNames.has(bank.value))
				.slice(0, 3)
				.map((bank) => bank.value);

			$set[`${prefix}.rejection.reroute_suggestions`] = suggestions;

			// Create rejection timeline event
			await createTimelineEvent(
				params.case_id,
				'rejection',
				`${lenderApp.lender_name} rejected: ${data.rejection.reason_category || 'No reason specified'}`,
				{
					lender_name: lenderApp.lender_name,
					reason_category: data.rejection.reason_category,
					reason_detail: data.rejection.reason_detail,
					reroute_suggestions: suggestions
				}
			);
		}

		// ── Execute update ──────────────────────────────────────
		const update: Record<string, any> = { $set };
		if (Object.keys($push).length > 0) {
			update.$push = $push;
		}

		await Cases.updateOne({ case_id: params.case_id, dsa_id: result.dsaId }, update);

		// Fetch and return updated lender application
		const updatedCase = await Cases.findOne({ case_id: params.case_id, dsa_id: result.dsaId });
		const updatedLenderApp = updatedCase?.lender_applications.find(
			(la) => la.lender_application_id === lenderAppId
		);

		return apiOk(updatedLenderApp);
	} catch (err) {
		return apiServerError(err, 'Failed to update lender application');
	}
};

// ── DELETE — Remove lender application ──────────────────────────

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'cases_edit');
	if (permDenied) return permDenied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}

		const ownership = await verifyCaseOwnership(params.case_id, result.dsaId);
		if (!ownership.ok) {
			const status = ownership.error === 'Case not found' ? 404 : 403;
			return apiError(ownership.error, status);
		}

		const caseDoc = ownership.caseDoc;
		const lenderAppId = params.lender_app_id;

		// Find the lender application to remove
		// Try primary search by lender_application_id
		let lenderApp = caseDoc.lender_applications.find(
			(la) => la.lender_application_id === lenderAppId
		);

		// Fallback: if lender_application_id doesn't exist or doesn't match, try array index
		// (for backward compatibility with old lender applications)
		if (!lenderApp && !isNaN(Number(lenderAppId))) {
			const idx = Number(lenderAppId);
			if (idx >= 0 && idx < caseDoc.lender_applications.length) {
				lenderApp = caseDoc.lender_applications[idx];
			}
		}

		if (!lenderApp) {
			logger.warn(
				{
					caseId: params.case_id,
					lenderAppId,
					lenderCount: caseDoc.lender_applications.length,
					lenderIds: caseDoc.lender_applications.map((la) => la.lender_application_id)
				},
				'[DELETE Lender] Lender application not found'
			);
			return apiError('Lender application not found', 404);
		}

		const now = new Date();

		// Remove the lender application using $pull
		// If we found by index, we need to also match by other fields since we may not have lender_application_id
		const pullFilter: Record<string, any> = lenderApp.lender_application_id
			? { lender_application_id: lenderApp.lender_application_id }
			: { lender_id: lenderApp.lender_id, created_at: lenderApp.created_at };

		await Cases.updateOne(
			{ case_id: params.case_id, dsa_id: result.dsaId },
			{
				$pull: { lender_applications: pullFilter } as any,
				$set: { updated_at: now }
			}
		);

		// If the removed lender was the primary, auto-set to the first remaining or null
		if (
			caseDoc.primary_lender_id === lenderAppId ||
			caseDoc.primary_lender_id === lenderApp.lender_application_id
		) {
			const remaining = caseDoc.lender_applications.filter(
				(la) => la.lender_application_id !== lenderAppId && la.lender_id !== lenderApp.lender_id
			);
			const newPrimary = remaining.length > 0 ? remaining[0].lender_application_id : undefined;

			await Cases.updateOne(
				{ case_id: params.case_id, dsa_id: result.dsaId },
				{ $set: { primary_lender_id: newPrimary } }
			);
		}

		// Create timeline event
		await createTimelineEvent(
			params.case_id,
			'case_updated',
			`Lender removed: ${lenderApp.lender_name}`,
			{
				action: 'lender_removed',
				lender_name: lenderApp.lender_name,
				lender_application_id: lenderAppId
			}
		);

		// Fetch and return updated lender_applications array
		const updatedCase = await Cases.findOne({ case_id: params.case_id, dsa_id: result.dsaId });
		const updatedLenderApps = updatedCase?.lender_applications || [];

		return apiOk(updatedLenderApps);
	} catch (err) {
		return apiServerError(err, 'Failed to remove lender application');
	}
};
