/**
 * POST /api/team/invite — Invite a member by mobile number
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { Teams, DsaApplications } from '$lib/database/mongo.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { resolveDsaId } from '$lib/server/caseHelpers.js';
import { teamInviteSchema } from '$lib/schemas/team.schema.js';
import { TEAM_ROLE_PRESETS } from '$lib/types/team.js';
import type { TeamMember } from '$lib/types/team.js';
import {
	parseJsonBody,
	apiOk,
	apiError,
	apiValidationError,
	apiServerError
} from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { decryptUserPii } from '$lib/server/csfle/index.js';
import { sendTeamInviteEmail } from '$lib/server/emailTemplates/teamInviteEmail.js';

/** Generate a 6-char alphanumeric invite code */
function generateInviteCode(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 to avoid confusion
	let code = '';
	const bytes = crypto.getRandomValues(new Uint8Array(6));
	for (let i = 0; i < 6; i++) {
		code += chars[bytes[i] % chars.length];
	}
	return code;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const result = await resolveDsaId(locals);
		if (!result.ok) return apiError(result.error, 404);

		// Only team owners can invite new members
		if (locals.user?.teamContext && !locals.user.teamContext.isOwner) {
			return apiError('Only team owners can invite members', 403);
		}

		const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
		if (!jsonParsed.ok) return jsonParsed.response;
		const parsed = teamInviteSchema.safeParse(jsonParsed.data);
		if (!parsed.success) {
			const errors: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const key = issue.path[0] as string;
				if (!errors[key]) errors[key] = issue.message;
			}
			return apiValidationError('Validation failed', errors);
		}

		const { mobile_number, name, team_role, email } = parsed.data;

		// Ensure team exists (auto-create if not)
		let team = await Teams.findOne({ owner_dsa_id: result.dsaId });
		if (!team) {
			const now = new Date();
			const insertResult = await Teams.insertOne({
				owner_dsa_id: result.dsaId,
				members: [],
				created_at: now,
				updated_at: now
			});
			await DsaApplications.updateOne(
				{ _id: result.dsaId },
				{ $set: { is_team_owner: true, updatedAt: now } }
			);
			team = await Teams.findOne({ _id: insertResult.insertedId });
			if (!team) {
				return apiError('Failed to create team', 500);
			}
		}

		// Cannot invite yourself — SEC-2: ownerDsa.mobileNumber is
		// ciphertext when encryption is active, so we decrypt before
		// the comparison. Without this, the self-invite guard would
		// silently pass and a DSA could invite themselves.
		const ownerDsaRaw = await DsaApplications.findOne({ _id: result.dsaId });
		const ownerDsa = await decryptUserPii(ownerDsaRaw);
		if (ownerDsa && Number(ownerDsa.mobileNumber) === Number(mobile_number)) {
			return apiError('Cannot invite yourself', 400);
		}

		// Check if already invited/active
		const existingMember = team.members.find(
			(m) => m.mobile_number === mobile_number && (m.status === 'invited' || m.status === 'active')
		);
		if (existingMember) {
			return apiError(
				existingMember.status === 'active'
					? 'This person is already an active member'
					: 'This person already has a pending invite',
				409
			);
		}

		const inviteCode = generateInviteCode();
		const now = new Date();

		// Placeholder ObjectId for user_id (will be linked when they join)
		const { ObjectId } = await import('mongodb');
		const placeholderId = new ObjectId();

		const newMember: TeamMember = {
			user_id: placeholderId,
			mobile_number,
			name,
			team_role,
			permissions: { ...TEAM_ROLE_PRESETS[team_role] },
			status: 'invited',
			invited_at: now,
			invite_code: inviteCode,
			...(email ? { email } : {})
		};

		await Teams.updateOne(
			{ _id: team._id },
			{
				$push: { members: newMember as any },
				$set: { updated_at: now }
			}
		);

		logger.info(
			{
				teamId: team._id!.toString(),
				mobileLast4: String(mobile_number).slice(-4),
				role: team_role,
				email_provided: Boolean(email)
			},
			'Team member invited'
		);

		// SEC-8 template D — send the invite email if the inviter supplied
		// one. We AWAIT the send so the API response reflects whether SES
		// actually accepted the email; the UI shows "We emailed it" only
		// when this is true. A failed send does NOT roll back the invite
		// (the code is the source of truth and is also shown on the
		// inviter's dashboard for out-of-band sharing) — but the UI
		// affordance honestly tells the inviter they need to share the
		// code manually. ownerDsa was already decrypted above for the
		// self-invite guard — reuse its name for the inviter context.
		let emailSent = false;
		if (email) {
			try {
				const sendResult = await sendTeamInviteEmail({
					to: email,
					inviterName: (ownerDsa?.name as string | undefined) ?? 'A teammate',
					inviteeName: name,
					inviteCode,
					teamRole: team_role
				});
				emailSent = sendResult.success;
			} catch (err) {
				logger.warn(
					{ err: (err as Error).message, invite_code: inviteCode },
					'team invite email: unexpected throw — invite code created, email NOT delivered'
				);
			}
		}

		return apiOk(
			{
				invite_code: inviteCode,
				mobile_number,
				name,
				team_role,
				email_sent: emailSent
			},
			201
		);
	} catch (err) {
		return apiServerError(err, 'Failed to invite team member');
	}
};
