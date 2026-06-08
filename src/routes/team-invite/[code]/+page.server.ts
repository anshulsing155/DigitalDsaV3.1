import type { PageServerLoad } from './$types';
import { Teams, DsaApplications } from '$lib/database/mongo';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const { code } = params;

	if (!code || code.length !== 6) {
		throw error(400, 'Invalid invite code');
	}

	// Find the team with this invite code
	const team = await Teams.findOne({
		'members.invite_code': code,
		'members.status': 'invited'
	});

	if (!team) {
		throw error(404, 'Invite not found or already used');
	}

	const member = team.members.find((m) => m.invite_code === code && m.status === 'invited');

	if (!member) {
		throw error(404, 'Invite not found');
	}

	// Get owner's name
	const ownerDoc = await DsaApplications.findOne(
		{ _id: team.owner_dsa_id },
		{ projection: { name: 1 } }
	);

	return {
		inviteCode: code,
		ownerName: ownerDoc?.name || 'Team Owner',
		memberName: member.name,
		role: member.team_role
	};
};
