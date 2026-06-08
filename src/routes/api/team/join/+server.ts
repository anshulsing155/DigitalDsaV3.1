/**
 * POST /api/team/join — Accept a team invite by code
 * ═══════════════════════════════════════════════════════════════════
 * Called after the team member has completed simplified onboarding.
 * Links the new DsaApplications doc to the team.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { Teams, DsaApplications } from '$lib/database/mongo.js';
import { requireAuthApi, blockDemoWrite } from '$lib/server/guards.js';
import { teamJoinSchema } from '$lib/schemas/team.schema.js';
import { ObjectId } from 'mongodb';
import { parseJsonBody, apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	const authDenied = requireAuthApi(locals);
	if (authDenied) return authDenied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
		if (!jsonParsed.ok) return jsonParsed.response;
		const parsed = teamJoinSchema.safeParse(jsonParsed.data);
		if (!parsed.success) {
			return apiError('Invalid invite code', 400);
		}

		const { invite_code } = parsed.data;

		// Find the team with this invite code
		const team = await Teams.findOne({
			'members.invite_code': invite_code,
			'members.status': 'invited'
		});

		if (!team) {
			return apiError('Invalid or expired invite code', 404);
		}

		const member = team.members.find(
			(m) => m.invite_code === invite_code && m.status === 'invited'
		);

		if (!member) {
			return apiError('Invite not found', 404);
		}

		// Verify the current user's mobile matches the invited mobile
		const userMobile = Number(locals.user!.mobileNumber);
		if (member.mobile_number !== userMobile) {
			return apiError('This invite was sent to a different phone number', 403);
		}

		const userId = new ObjectId(locals.user!.id);
		const now = new Date();

		// Update the member entry: link user_id, set status active
		await Teams.updateOne(
			{
				_id: team._id,
				'members.invite_code': invite_code,
				'members.status': 'invited'
			},
			{
				$set: {
					'members.$.user_id': userId,
					'members.$.status': 'active',
					'members.$.joined_at': now,
					updated_at: now
				}
			}
		);

		// Set team_owner_id on the member's DsaApplications doc
		await DsaApplications.updateOne(
			{ _id: userId },
			{ $set: { team_owner_id: team.owner_dsa_id, updatedAt: now } }
		);

		return apiOk({
			teamId: team._id!.toString(),
			ownerDsaId: team.owner_dsa_id.toString(),
			role: member.team_role
		});
	} catch (err) {
		return apiServerError(err, 'Failed to join team');
	}
};
