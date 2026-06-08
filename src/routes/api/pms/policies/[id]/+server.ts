/**
 * GET  /api/pms/policies/[id]   — Single policy detail (full document)
 * PATCH /api/pms/policies/[id]  — Update draft sections/overrides (requires lockVersion)
 */

import type { RequestHandler } from './$types';
import {
	apiOk,
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { RmLenderAssignments } from '$lib/database/mongo.js';
import {
	getPolicyById,
	updateDraftPolicy,
	patchDraftSections,
	PolicyNotFoundError,
	PolicyStatusError,
	PolicyLockConflictError
} from '$lib/server/pms/policyService.js';
import type { PolicyDocument } from '$lib/config/pms/policyTypes.js';
import { z } from 'zod';

// DX-2: Zod schema for PATCH body. `sections`/`conditionalOverrides`/
// `bankCardNotes`/`pipelineState` are deeply-structured per PolicyDocument;
// keeping them as `unknown` here defers detailed validation to the service
// layer (which already enforces typed updates and PendingChange diffs).
// The schema's job is to lock `lockVersion`, gate the boolean flag, and
// reject obviously-malformed bodies — not to re-validate the whole policy
// tree (admin-json-edit/+server.ts owns that). Future work: extract the
// 9-section schema from admin-json-edit into a shared module and use it here.
const patchRequestSchema = z.object({
	lockVersion: z.number().int().min(0),
	rmEdit: z.boolean().optional(),
	sections: z.unknown().optional(),
	conditionalOverrides: z.unknown().optional(),
	bankCardNotes: z.unknown().optional(),
	pipelineState: z.unknown().optional(),
	reconciliationAssignedTo: z.string().optional()
});

// ── GET /api/pms/policies/[id] ────────────────────────────────────────────────

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireRoleApi(locals, ['rm', 'admin']);
	if (denied) return denied;

	const { id } = params;

	try {
		const policy = await getPolicyById(id);

		// Admin bypass — true when the underlying user is an admin, regardless
		// of which activeRole they switched to. locals.adminPermissions is set
		// in hooks.server.ts for any admin user, even when their activeRole
		// cookie is 'rm' (i.e., admin switched to RM mode via top-right
		// switcher). This lets admins edit any bank's policy from any mode.
		const isAdmin =
			locals.user!.activeRole === 'admin' || locals.adminPermissions !== undefined;
		const userId = locals.user!.id;

		// RM can only read policies for their active assignments
		if (!isAdmin) {
			const assignment = await RmLenderAssignments.findOne({
				rmUserId: userId,
				lenderId: policy.lenderId,
				status: 'active'
			});
			if (!assignment) return apiError('Access denied — no active assignment for this lender', 403);
		}

		return apiOk(serializePolicy(policy));
	} catch (err) {
		if (err instanceof PolicyNotFoundError) return apiError('Policy not found', 404);
		return apiServerError(err, 'pms policy GET');
	}
};

// ── PATCH /api/pms/policies/[id] ─────────────────────────────────────────────

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const denied = requireRoleApi(locals, ['rm', 'admin']);
	if (denied) return denied;

	const { id } = params;

	const body = await parseJsonBody<Record<string, unknown>>(request);
	if (!body.ok) return body.response;

	const validated = patchRequestSchema.safeParse(body.data);
	if (!validated.success) {
		return apiValidationError('Invalid request body', validated.error.flatten());
	}

	// Cast the validated unknowns back to PolicyDocument shapes for the service.
	// Zod here only gates the wrapper shape; the service layer applies deeper
	// invariants when writing.
	const {
		lockVersion,
		rmEdit,
		sections,
		conditionalOverrides,
		bankCardNotes,
		pipelineState,
		reconciliationAssignedTo
	} = validated.data;
	const updates = {
		sections: sections as PolicyDocument['sections'] | undefined,
		conditionalOverrides: conditionalOverrides as
			| PolicyDocument['conditionalOverrides']
			| undefined,
		bankCardNotes: bankCardNotes as PolicyDocument['bankCardNotes'] | undefined,
		pipelineState: pipelineState as PolicyDocument['pipelineState'] | undefined,
		reconciliationAssignedTo
	};

	const userId = locals.user!.id;

	try {
		const policy = await getPolicyById(id);

		// RM access check. Admin bypass — true when the underlying user is
		// an admin, regardless of which activeRole they switched to. See
		// the GET handler above for the full rationale. The narrow
		// `activeRole !== 'admin'` check previously here would have
		// blocked admins-in-RM-mode from PATCHing policies; sibling PMS
		// routes (GET, submit, revise, apply-delta) all use the wide
		// `isAdmin` derivation. Bringing PATCH to parity.
		const isAdmin =
			locals.user!.activeRole === 'admin' || locals.adminPermissions !== undefined;
		if (!isAdmin) {
			const assignment = await RmLenderAssignments.findOne({
				rmUserId: userId,
				lenderId: policy.lenderId,
				status: 'active'
			});
			if (!assignment) return apiError('Access denied — no active assignment for this lender', 403);
		}

		// Phase 5 edit mode: diff sections and append PendingChange records
		if (rmEdit && updates.sections) {
			const { appendedChanges, newLockVersion } = await patchDraftSections(
				id,
				updates.sections,
				lockVersion,
				userId
			);
			return apiOk({
				lockVersion: newLockVersion,
				appendedChanges: appendedChanges.map((pc) => ({
					...pc,
					changedAt: pc.changedAt.toISOString(),
					rmAcknowledgedAt: pc.rmAcknowledgedAt ? pc.rmAcknowledgedAt.toISOString() : null
				}))
			});
		}

		await updateDraftPolicy(id, updates, lockVersion, userId);

		// Return updated lockVersion
		const updated = await getPolicyById(id);

		return apiOk({ lockVersion: updated.lockVersion, updatedAt: updated.updatedAt.toISOString() });
	} catch (err) {
		if (err instanceof PolicyNotFoundError) return apiError('Policy not found', 404);
		if (err instanceof PolicyStatusError) return apiError(err.message, 422);
		if (err instanceof PolicyLockConflictError) return apiError(err.message, 409);
		return apiServerError(err, 'pms policy PATCH');
	}
};

// ── Serializer — strips sourceDocument.text for listing responses ─────────────

function serializePolicy(policy: PolicyDocument) {
	return {
		_id: policy._id.toString(),
		lenderId: policy.lenderId,
		loanProduct: policy.loanProduct,
		version: policy.version,
		hash: policy.hash,
		status: policy.status,
		validFrom: policy.validFrom.toISOString(),
		validTo: policy.validTo ? policy.validTo.toISOString() : null,
		lockVersion: policy.lockVersion,
		reconciliationAssignedTo: policy.reconciliationAssignedTo,
		sections: policy.sections,
		conditionalOverrides: policy.conditionalOverrides.map((o) => ({
			...o,
			addedAt: o.addedAt.toISOString(),
			conflictCheck: o.conflictCheck
				? { ...o.conflictCheck, ranAt: o.conflictCheck.ranAt.toISOString() }
				: null
		})),
		bankCardNotes: policy.bankCardNotes.map((n) => ({
			...n,
			addedAt: n.addedAt.toISOString()
		})),
		pendingChanges: (policy.pendingChanges ?? []).map((pc) => ({
			...pc,
			changedAt: pc.changedAt.toISOString(),
			rmAcknowledgedAt: pc.rmAcknowledgedAt ? pc.rmAcknowledgedAt.toISOString() : null
		})),
		sourceDocument: {
			text: policy.sourceDocument.text,
			fileName: policy.sourceDocument.fileName,
			uploadedAt: policy.sourceDocument.uploadedAt.toISOString(),
			uploadedBy: policy.sourceDocument.uploadedBy
		},
		pipelineState: policy.pipelineState
			? {
					...policy.pipelineState,
					lastSavedAt: policy.pipelineState.lastSavedAt.toISOString()
				}
			: null,
		reconciliation: {
			...policy.reconciliation,
			completedAt: policy.reconciliation.completedAt
				? policy.reconciliation.completedAt.toISOString()
				: null
		},
		aiPipelineRun: policy.aiPipelineRun
			? { ...policy.aiPipelineRun, ranAt: policy.aiPipelineRun.ranAt.toISOString() }
			: null,
		adminRejectionNote: policy.adminRejectionNote,
		adminRejectedAt: policy.adminRejectedAt ? policy.adminRejectedAt.toISOString() : null,
		adminClauseComments: policy.adminClauseComments,
		createdBy: policy.createdBy,
		createdAt: policy.createdAt.toISOString(),
		updatedBy: policy.updatedBy,
		updatedAt: policy.updatedAt.toISOString(),
		submittedAt: policy.submittedAt ? policy.submittedAt.toISOString() : null,
		approvedAt: policy.approvedAt ? policy.approvedAt.toISOString() : null,
		scheduledPublishAt: policy.scheduledPublishAt ? policy.scheduledPublishAt.toISOString() : null,
		publishedAt: policy.publishedAt ? policy.publishedAt.toISOString() : null
	};
}
