import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards';
import { resolveDsaId } from '$lib/server/caseHelpers';
import { Teams, DsaApplications } from '$lib/database/mongo';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'dsa');

	const result = await resolveDsaId(locals);
	if (!result.ok) throw error(404, result.error);

	// Only team owners can access this page
	const dsaDoc = await DsaApplications.findOne(
		{ _id: result.dsaId },
		{ projection: { is_team_owner: 1, name: 1, subscription: 1 } }
	);

	const team = await Teams.findOne({ owner_dsa_id: result.dsaId });

	const members =
		team?.members
			.filter((m) => m.status !== 'removed')
			.map((m) => ({
				user_id: m.user_id.toString(),
				mobile_number: m.mobile_number,
				name: m.name,
				team_role: m.team_role,
				permissions: m.permissions,
				status: m.status,
				invited_at: m.invited_at.toISOString(),
				joined_at: m.joined_at?.toISOString() || null
			})) ?? [];

	const ownerTier = dsaDoc?.subscription?.tier || 'free';

	return {
		isTeamOwner: Boolean(dsaDoc?.is_team_owner),
		hasTeam: Boolean(team),
		teamId: team?._id?.toString() || null,
		members,
		ownerTier,
		ownerName: dsaDoc?.name || ''
	};
};
