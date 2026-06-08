import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards';
import { resolveDsaId } from '$lib/server/caseHelpers';
import { Teams, DsaApplications } from '$lib/database/mongo';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals, 'dsa');

	const result = await resolveDsaId(locals);
	if (!result.ok) throw error(404, result.error);

	const team = await Teams.findOne({ owner_dsa_id: result.dsaId });
	if (!team) throw error(404, 'Team not found');

	const member = team.members.find(
		(m) => m.user_id.toString() === params.member_id && m.status !== 'removed'
	);
	if (!member) throw error(404, 'Member not found');

	const dsaDoc = await DsaApplications.findOne(
		{ _id: result.dsaId },
		{ projection: { subscription: 1 } }
	);

	return {
		member: {
			user_id: member.user_id.toString(),
			mobile_number: member.mobile_number,
			name: member.name,
			team_role: member.team_role,
			permissions: member.permissions,
			status: member.status,
			invited_at: member.invited_at.toISOString(),
			joined_at: member.joined_at?.toISOString() || null
		},
		ownerTier: dsaDoc?.subscription?.tier || 'free'
	};
};
