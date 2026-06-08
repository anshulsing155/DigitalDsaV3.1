/**
 * GET /api/team — Get team (or null if none exists)
 * POST /api/team — Create team (lazy, idempotent)
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { Teams, DsaApplications } from '$lib/database/mongo.js';
import { requireAuthApi, requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { resolveDsaId } from '$lib/server/caseHelpers.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';

export const GET: RequestHandler = async ({ locals }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;

	const result = await resolveDsaId(locals);
	if (!result.ok) return apiError(result.error, 404);

	const team = await Teams.findOne({ owner_dsa_id: result.dsaId });

	return apiOk({
		team: team
			? {
					_id: team._id!.toString(),
					owner_dsa_id: team.owner_dsa_id.toString(),
					members: team.members.map((m) => ({
						user_id: m.user_id.toString(),
						mobile_number: m.mobile_number,
						name: m.name,
						team_role: m.team_role,
						permissions: m.permissions,
						status: m.status,
						invited_at: m.invited_at,
						joined_at: m.joined_at
					})),
					created_at: team.created_at,
					updated_at: team.updated_at
				}
			: null
	});
};

export const POST: RequestHandler = async ({ locals }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const result = await resolveDsaId(locals);
		if (!result.ok) return apiError(result.error, 404);

		// Idempotent: return existing team if already created
		const existing = await Teams.findOne({ owner_dsa_id: result.dsaId });
		if (existing) {
			return apiOk({ teamId: existing._id!.toString(), created: false });
		}

		const now = new Date();
		const insertResult = await Teams.insertOne({
			owner_dsa_id: result.dsaId,
			members: [],
			created_at: now,
			updated_at: now
		});

		// Mark DSA as team owner
		await DsaApplications.updateOne(
			{ _id: result.dsaId },
			{ $set: { is_team_owner: true, updatedAt: now } }
		);

		logger.info(
			{ teamId: insertResult.insertedId.toString(), dsaId: result.dsaId.toString() },
			'Team created'
		);

		return apiOk({ teamId: insertResult.insertedId.toString(), created: true }, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to create team');
	}
};
