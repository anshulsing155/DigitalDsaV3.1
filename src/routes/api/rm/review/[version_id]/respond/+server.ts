/**
 * POST /api/rm/review/[version_id]/respond
 * RM approves or requests corrections on a policy version.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { requireRoleApi, requireRmLenderAccess, blockDemoWrite } from '$lib/server/guards.js';
import {
	rmApplications,
	PolicyVersions,
	PolicyRules,
	PolicyAuditLogs,
	ReviewComments
} from '$lib/database/mongo.js';
import { isValidStatusTransition } from '$lib/types/policyEngine.js';
import { parseJsonBody, apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { getLenderNameFromDomain } from '$lib/config/lenderDomains.js';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';

export const POST: RequestHandler = async ({ request, locals, params }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const user = locals.user!;
		let rmDoc;
		try {
			rmDoc = await rmApplications.findOne({ _id: new ObjectId(user.id) });
		} catch {
			// SEC-2: encrypted-first lookup; decrypt for downstream reads.
			const rmDocRaw = await findUserByMobile(rmApplications, user.mobileNumber);
			rmDoc = await decryptUserPii(rmDocRaw);
		}
		if (!rmDoc?._id) {
			return apiError('RM profile not found', 404);
		}

		const versionId = params.version_id;
		if (!versionId || !ObjectId.isValid(versionId)) {
			return apiError('Invalid version_id', 400);
		}

		const version = await PolicyVersions.findOne({ _id: new ObjectId(versionId) });
		if (!version) {
			return apiError('Version not found', 404);
		}

		if (version.status !== 'pending_rm_review') {
			return apiError('This version is not pending RM review', 400);
		}

		// BOLA gate (Finding M1, resolved 2026-05-15): legacy review-respond previously
		// let any RM approve/reject any lender's policy version regardless of
		// assignment. Now scoped to {rmUserId, lenderId, status: 'active'} —
		// matches the PMS pattern. Admin bypasses inside the guard.
		const rule = await PolicyRules.findOne({ policy_rule_id: version.policy_rule_id });
		if (!rule) {
			return apiError('Associated rule not found', 404);
		}
		const [denied2] = await requireRmLenderAccess(locals, rule.lender_id);
		if (denied2) return denied2;

		const bodyParsed = await parseJsonBody<Record<string, unknown>>(request);
		if (!bodyParsed.ok) return bodyParsed.response;
		const body = bodyParsed.data;
		const action = body.action as string | undefined; // 'approve' or 'request_corrections'

		if (!action || !['approve', 'request_corrections'].includes(action)) {
			return apiError('action must be "approve" or "request_corrections"', 400);
		}

		// Parse optional per-field validations from the interactive review form
		const fieldValidations:
			| Record<string, { status: 'correct' | 'wrong'; note?: string }>
			| undefined =
			body.field_validations && typeof body.field_validations === 'object'
				? (body.field_validations as Record<string, { status: 'correct' | 'wrong'; note?: string }>)
				: undefined;

		const now = new Date();
		const rmId = rmDoc._id.toString();
		const rmName =
			rmDoc.name ||
			rmDoc.bankName ||
			getLenderNameFromDomain(rmDoc.rmOfficialEmail || (rmDoc as any).officialEmail || '') ||
			'RM';

		if (action === 'approve') {
			const newStatus = 'pending_admin_final';
			if (!isValidStatusTransition(version.status, newStatus)) {
				return apiError('Invalid status transition', 400);
			}

			const approveSet: Record<string, unknown> = {
				status: newStatus,
				'provenance.confirmation_method': 'portal',
				'provenance.confirmation_date': now,
				'provenance.confirmation_notes': body.notes || undefined,
				updated_at: now
			};
			if (fieldValidations) {
				approveSet['provenance.field_validations'] = fieldValidations;
			}

			await PolicyVersions.updateOne({ _id: new ObjectId(versionId) }, { $set: approveSet });

			await PolicyAuditLogs.insertOne({
				target_type: 'policy_version',
				target_id: versionId,
				action: 'version_status_changed',
				actor_id: rmId,
				actor_name: rmName,
				actor_role: 'rm',
				details: { from: 'pending_rm_review', to: newStatus, method: 'portal' },
				created_at: now
			} as any);

			return apiOk({ version_id: versionId, status: newStatus, action: 'approved' });
		} else {
			// request_corrections
			const newStatus = 'rm_corrections_requested';
			if (!isValidStatusTransition(version.status, newStatus)) {
				return apiError('Invalid status transition', 400);
			}

			// Comment required unless field_validations has wrong entries (auto-generates summary)
			const hasWrongFields =
				fieldValidations &&
				Object.values(fieldValidations).some((v) => (v as { status: string }).status === 'wrong');
			const commentText =
				body.comment && typeof body.comment === 'string' ? body.comment.trim() : '';

			if (!hasWrongFields && commentText.length < 5) {
				return apiError('A comment is required when requesting corrections (min 5 chars)', 400);
			}

			// Auto-generate comment from field validations if needed
			let finalComment = commentText;
			if (!finalComment && hasWrongFields) {
				const wrongEntries = Object.entries(fieldValidations!).filter(
					([, v]) => (v as { status: string }).status === 'wrong'
				);
				finalComment =
					'Fields marked for correction:\n' +
					wrongEntries
						.map(([key, v]) => {
							const note = (v as { note?: string }).note;
							return note ? `- ${key}: ${note}` : `- ${key}: Marked as incorrect`;
						})
						.join('\n');
			}

			await PolicyVersions.updateOne(
				{ _id: new ObjectId(versionId) },
				{ $set: { status: newStatus, updated_at: now } }
			);

			// Create a review comment (with field validations attached)
			await ReviewComments.insertOne({
				target_type: 'policy_version',
				target_id: new ObjectId(versionId),
				author_id: rmId,
				author_name: rmName,
				author_role: 'rm',
				text: finalComment,
				attachment_ids: body.attachment_ids || [],
				field_validations: fieldValidations || undefined,
				is_resolved: false,
				created_at: now
			} as any);

			const wrongCount = fieldValidations
				? Object.values(fieldValidations).filter(
						(v) => (v as { status: string }).status === 'wrong'
					).length
				: 0;

			await PolicyAuditLogs.insertOne({
				target_type: 'policy_version',
				target_id: versionId,
				action: 'version_status_changed',
				actor_id: rmId,
				actor_name: rmName,
				actor_role: 'rm',
				details: {
					from: 'pending_rm_review',
					to: newStatus,
					comment_preview: finalComment.slice(0, 100),
					fields_wrong: wrongCount
				},
				created_at: now
			} as any);

			return apiOk({ version_id: versionId, status: newStatus, action: 'corrections_requested' });
		}
	} catch (err) {
		return apiServerError(err, 'Failed to process review response');
	}
};
