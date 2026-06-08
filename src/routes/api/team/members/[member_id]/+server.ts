/**
 * PATCH /api/team/members/[member_id] — Update role/permissions/status
 * DELETE /api/team/members/[member_id] — Remove member
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { Teams, DsaApplications } from '$lib/database/mongo.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { resolveDsaId } from '$lib/server/caseHelpers.js';
import { teamMemberUpdateSchema } from '$lib/schemas/team.schema.js';
import { TEAM_ROLE_PRESETS } from '$lib/types/team.js';
import { ObjectId } from 'mongodb';
import { parseJsonBody, apiOk, apiError, apiValidationError } from '$lib/server/apiResponse.js';

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const result = await resolveDsaId(locals);
	if (!result.ok) return apiError(result.error, 404);

	const memberId = params.member_id;
	if (!memberId) {
		return apiError('Member ID is required', 400);
	}

	const team = await Teams.findOne({ owner_dsa_id: result.dsaId });
	if (!team) {
		return apiError('Team not found', 404);
	}

	let memberUserId: ObjectId;
	try {
		memberUserId = new ObjectId(memberId);
	} catch {
		return apiError('Invalid member ID', 400);
	}

	const memberIndex = team.members.findIndex(
		(m) => m.user_id.toString() === memberUserId.toString()
	);
	if (memberIndex === -1) {
		return apiError('Member not found', 404);
	}

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;
	const parsed = teamMemberUpdateSchema.safeParse(jsonParsed.data);
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

	if (updates.team_role) {
		setFields[`members.${memberIndex}.team_role`] = updates.team_role;
		// Apply role preset as base, then overlay any custom permissions
		const preset = { ...TEAM_ROLE_PRESETS[updates.team_role] };
		if (updates.permissions) {
			Object.assign(preset, updates.permissions);
		}
		setFields[`members.${memberIndex}.permissions`] = preset;
	} else if (updates.permissions) {
		// Merge only the provided permission keys
		for (const [key, val] of Object.entries(updates.permissions)) {
			setFields[`members.${memberIndex}.permissions.${key}`] = val;
		}
	}

	if (updates.status) {
		setFields[`members.${memberIndex}.status`] = updates.status;
	}

	await Teams.updateOne({ _id: team._id }, { $set: setFields });

	return apiOk({ updated: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const result = await resolveDsaId(locals);
	if (!result.ok) return apiError(result.error, 404);

	const memberId = params.member_id;
	if (!memberId) {
		return apiError('Member ID is required', 400);
	}

	const team = await Teams.findOne({ owner_dsa_id: result.dsaId });
	if (!team) {
		return apiError('Team not found', 404);
	}

	let memberUserId: ObjectId;
	try {
		memberUserId = new ObjectId(memberId);
	} catch {
		return apiError('Invalid member ID', 400);
	}

	const member = team.members.find((m) => m.user_id.toString() === memberUserId.toString());
	if (!member) {
		return apiError('Member not found', 404);
	}

	const now = new Date();

	// Mark as removed (soft delete, keep in array for audit trail)
	await Teams.updateOne(
		{ _id: team._id, 'members.user_id': memberUserId },
		{
			$set: {
				'members.$.status': 'removed',
				updated_at: now
			}
		}
	);

	// Clear team_owner_id from the member's DSA doc
	if (member.status === 'active') {
		await DsaApplications.updateOne(
			{ _id: memberUserId },
			{ $unset: { team_owner_id: '' }, $set: { updatedAt: now } }
		);
	}

	return apiOk({ removed: true });
};
