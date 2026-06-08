/**
 * GET /api/team/members — List team members
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { Teams } from '$lib/database/mongo.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { resolveDsaId } from '$lib/server/caseHelpers.js';
import { apiOk, apiError } from '$lib/server/apiResponse.js';

export const GET: RequestHandler = async ({ locals }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;

	const result = await resolveDsaId(locals);
	if (!result.ok) return apiError(result.error, 404);

	const team = await Teams.findOne({ owner_dsa_id: result.dsaId });
	if (!team) {
		return apiOk({ members: [] });
	}

	const members = team.members
		.filter((m) => m.status !== 'removed')
		.map((m) => ({
			user_id: m.user_id.toString(),
			mobile_number: m.mobile_number,
			name: m.name,
			team_role: m.team_role,
			permissions: m.permissions,
			status: m.status,
			invited_at: m.invited_at,
			joined_at: m.joined_at
		}));

	return apiOk({ members });
};
