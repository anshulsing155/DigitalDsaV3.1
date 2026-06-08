/**
 * POST /api/onboarding/team-member-onboarding
 * ═══════════════════════════════════════════════════════════════════
 * Simplified onboarding for team members (sub-DSAs).
 * Only requires: name, age, gender (no GST, no PAN, no DSA code).
 *
 * After creation, automatically joins the team using the invite code.
 * ═══════════════════════════════════════════════════════════════════
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { DsaApplications, Teams } from '$lib/database/mongo.js';
import { generateTokenPair } from '$lib/services/jwtService';
import { ensureApplicantProfile } from '$lib/services/ensureApplicantProfile';
import { blockDemoWrite } from '$lib/server/guards.js';
import { REFRESH_COOKIE_MAX_AGE, ACCESS_COOKIE_MAX_AGE } from '$lib/server/sessionConstants.js';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { parseJsonBody, apiServerError, apiError, apiValidationError } from '$lib/server/apiResponse.js';
import { findUserByMobile, encryptUserPii } from '$lib/server/csfle/index.js';

const teamMemberOnboardingSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100),
	age: z.number().int().min(18, 'Must be at least 18').max(100),
	gender: z.enum(['male', 'female', 'other'], { message: 'Gender is required' }),
	invite_code: z.string().length(6, 'Invite code must be 6 characters')
});

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const isProd = import.meta.env.PROD;
		// Only trust server-resolved verifiedMobile (from hooks.server.ts signed JWT)
		// or the authenticated user's mobile — never a raw unsigned cookie
		const mobile =
			locals.verifiedMobile || (locals.user?.mobileNumber ? String(locals.user.mobileNumber) : '');

		if (!mobile) {
			throw error(401, 'Unauthorized. Please login again.');
		}

		const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
		if (!jsonParsed.ok) return jsonParsed.response;
		const parsed = teamMemberOnboardingSchema.safeParse(jsonParsed.data);

		if (!parsed.success) {
			const errors: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const key = issue.path[0] as string;
				if (!errors[key]) errors[key] = issue.message;
			}
			return apiValidationError('Validation failed', errors);
		}

		const { name, age, gender, invite_code } = parsed.data;
		const mobileNumber = Number(mobile);

		if (isNaN(mobileNumber) || String(mobileNumber).length < 10) {
			return apiError('Invalid mobile number', 400);
		}

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

		// Verify the mobile number matches the invite
		if (member.mobile_number !== mobileNumber) {
			return apiError('This invite was sent to a different phone number', 403);
		}

		// Ensure a base user (Applicant) profile exists
		await ensureApplicantProfile({
			name,
			email: '',
			gender,
			mobileNumber,
			age,
			roleBooleanKey: 'dsa'
		});

		const now = new Date();

		// SEC-2: encrypted-first lookup. We don't need to decrypt — only
		// `_id` is read below. Update by _id; insert via encryptUserPii.
		const existing = await findUserByMobile(DsaApplications, mobileNumber);
		let dsaId: ObjectId;

		if (existing) {
			dsaId = existing._id!;
			const updateFields = {
				name,
				age,
				gender,
				team_owner_id: team.owner_dsa_id,
				onboardingCompleted: true,
				role: 'dsa' as const,
				updatedAt: now
			};
			const encryptedUpdate = await encryptUserPii(updateFields);
			await DsaApplications.updateOne({ _id: dsaId }, { $set: encryptedUpdate });
		} else {
			const newDoc = await encryptUserPii({
				name,
				email: '',
				mobileNumber,
				gender,
				age,
				role: 'dsa',
				onboardingCompleted: true,
				accountStatus: 'active',
				lastActiveAt: now,
				team_owner_id: team.owner_dsa_id,
				usedCoins: 0,
				availableCoins: 0,
				createdAt: now
			});
			const insertResult = await DsaApplications.insertOne(newDoc as any);
			dsaId = insertResult.insertedId;
		}

		// Update team member: link user_id, set status active
		await Teams.updateOne(
			{
				_id: team._id,
				'members.invite_code': invite_code,
				'members.status': 'invited'
			},
			{
				$set: {
					'members.$.user_id': dsaId,
					'members.$.status': 'active',
					'members.$.name': name,
					'members.$.joined_at': now,
					updated_at: now
				}
			}
		);

		// Generate tokens
		const tokenId = crypto.randomUUID();
		const { accessToken, refreshToken } = generateTokenPair(
			dsaId.toString(),
			'',
			mobileNumber,
			name,
			tokenId
		);

		// Store refresh token — derive expiry from the same constant used for cookie maxAge
		const refreshTokenExpiry = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE * 1000);
		await DsaApplications.updateOne(
			{ _id: dsaId },
			{ $set: { refreshToken, refreshTokenExpiry, activeTokenId: tokenId, updatedAt: now } }
		);

		// Set cookies
		cookies.set('accessToken', accessToken, {
			httpOnly: true,
			path: '/',
			maxAge: ACCESS_COOKIE_MAX_AGE,
			sameSite: 'lax',
			secure: isProd
		});

		cookies.set('refreshToken', refreshToken, {
			httpOnly: true,
			path: '/',
			maxAge: REFRESH_COOKIE_MAX_AGE,
			sameSite: 'lax',
			secure: isProd
		});

		cookies.set('activeRole', 'dsa', {
			httpOnly: false, // Client-side JS reads this for role-switching UI
			path: '/',
			maxAge: REFRESH_COOKIE_MAX_AGE,
			secure: isProd,
			sameSite: 'lax'
		});

		cookies.delete('verifiedMobile', { path: '/' });
		cookies.delete('role', { path: '/' });

		return json({ success: true, redirect: '/dashboard/dsa' });
	} catch (err) {
		return apiServerError(err, 'Failed to team member onboarding');
	}
};
