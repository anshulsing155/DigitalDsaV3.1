import type { RequestHandler } from '@sveltejs/kit';
import { Applicant } from '$lib/database/mongo.js';
import { dev } from '$app/environment';
import { blockDemoWrite, requireAuthApi } from '$lib/server/guards.js';
import logger from '$lib/server/logger.js';
import { parseJsonBody, apiOk, apiError } from '$lib/server/apiResponse.js';
import { findUserByMobile } from '$lib/server/csfle/index.js';
import { ensureRmProfile } from '$lib/server/rmHelpers.js';

// Roles any user can switch to
const BASE_ROLES = ['dsa'];
// Additional roles only admins can switch to (for testing DSA/RM dashboards)
const ADMIN_EXTRA_ROLES = ['admin', 'rm'];

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	// Auth guard — unauthenticated users must not set role cookies
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const parsed = await parseJsonBody<{ role: string }>(request);
	if (!parsed.ok) return parsed.response;
	const { role } = parsed.data;

	const isAdmin = locals.user?.roles?.admin === true;

	// Validate role - prevent privilege escalation
	if (!BASE_ROLES.includes(role)) {
		if (ADMIN_EXTRA_ROLES.includes(role) && !isAdmin) {
			return apiError('Unauthorized', 403);
		}
		if (!ADMIN_EXTRA_ROLES.includes(role)) {
			return apiError('Invalid role', 400);
		}
	}

	if (locals.user) {
		locals.user.role = role as typeof locals.user.role;
		locals.user.activeRole = role as typeof locals.user.activeRole;
	}

	// Update activeRole in Applicant collection if user is authenticated.
	// SEC-2: find first via the dual-query helper (handles encrypted +
	// plaintext rows), then update by _id — the encrypted-mobile filter
	// can't be used inline once the field is ciphertext.
	const mobile = locals.user?.mobileNumber || cookies.get('verifiedMobile');
	if (mobile) {
		try {
			const applicant = await findUserByMobile(Applicant, mobile);
			if (applicant?._id) {
				await Applicant.updateOne(
					{ _id: applicant._id },
					{ $set: { activeRole: role, updatedAt: new Date() } }
				);
			}
		} catch (e) {
			logger.error({ err: e }, 'Failed to update activeRole in DB');
		}
	}

	// A.1 — auto-provision: a user granted the RM role may not have an
	// rmApplications doc (admin-mirror / role-granted users never did). Ensure
	// one exists now so the RM dashboard + Settings page always have a profile
	// to load. Non-fatal — a provisioning hiccup must not block the role switch
	// (Settings load also lazily provisions as a backstop).
	if (role === 'rm' && locals.user) {
		try {
			await ensureRmProfile(locals.user);
		} catch (e) {
			logger.error({ err: e }, 'ensureRmProfile failed during set-role (non-fatal)');
		}
	}

	// Set activeRole cookie (primary)
	cookies.set('activeRole', role, {
		path: '/',
		httpOnly: false, // Client-side JS reads this for role-switching UI
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 7,
		secure: !dev
	});

	// Also set legacy 'role' cookie for backward compat
	cookies.set('role', role, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24,
		secure: !dev
	});

	return apiOk();
};
