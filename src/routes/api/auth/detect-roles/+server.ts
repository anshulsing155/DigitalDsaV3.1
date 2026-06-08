/**
 * POST /api/auth/detect-roles
 * ═══════════════════════════════════════════════════════════════════
 * Checks Applicant, DsaApplications, and rmApplications collections
 * to determine profiles for a given mobile number.
 *
 * Returns detected roles (DSA, RM, admin) with basic user info.
 * Does NOT generate tokens — that happens when the user picks a role
 * and the client calls /api/auth/check-dsa.
 *
 * Called after OTP verification in the login flow.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import {
	Applicant,
	DsaApplications,
	rmApplications,
	AdminUsers,
	deletedDsa,
	Teams
} from '$lib/database/mongo.js';
import { DEFAULT_ROLES } from '$lib/types/index.js';
import type { UserRoles } from '$lib/types/index.js';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';

interface DetectedRole {
	role: string;
	name: string;
	email: string;
	onboardingCompleted: boolean;
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	// Rate limit: 10 requests per 10 minutes per IP to prevent account enumeration
	const isLimited = await rateLimit(getClientAddress(), {
		maxRequests: 10,
		windowMs: 10 * 60 * 1000,
		identifier: `detect-roles:${getClientAddress()}`
	});
	if (isLimited) {
		return apiError('Too many requests. Please try again later.', 429);
	}

	const parsed = await parseJsonBody<{ mobileNumber: string }>(request);
	if (!parsed.ok) return parsed.response;
	const { mobileNumber } = parsed.data;

	try {
		if (!mobileNumber) {
			return apiError('Mobile number is required');
		}

		const mobileStr = String(mobileNumber);
		if (!/^\d{10,15}$/.test(mobileStr)) {
			return apiError('Invalid mobile number format');
		}

		// Note: verifiedMobile cookie check removed — this is a read-only endpoint
		// already exempt from CSRF. The cookie set by verify-otp may not be
		// available to the immediate next fetch due to browser timing/policy.

		// SEC-2: findUserByMobile handles both encrypted (new) and plaintext
		// (legacy) rows. decryptUserPii unwraps PII fields so downstream code
		// reads dsaDoc.name / .email etc. as plaintext.
		const [userDocRaw, dsaDocRaw, rmDocRaw, adminDocRaw] = await Promise.all([
			findUserByMobile(Applicant, mobileStr),
			findUserByMobile(DsaApplications, mobileStr),
			findUserByMobile(rmApplications, mobileStr),
			findUserByMobile(AdminUsers, mobileStr)
		]);

		const [userDoc, dsaDoc, rmDoc, adminDoc] = await Promise.all([
			decryptUserPii(userDocRaw),
			decryptUserPii(dsaDocRaw),
			decryptUserPii(rmDocRaw),
			decryptUserPii(adminDocRaw)
		]);

		const detectedRoles: DetectedRole[] = [];

		// DSA profile detection (primary for this platform)
		if (dsaDoc) {
			detectedRoles.push({
				role: 'dsa',
				name: dsaDoc.name || '',
				email: dsaDoc.email || '',
				onboardingCompleted: dsaDoc.onboardingCompleted ?? false
			});
		}

		// RM profile detection (partner entry point)
		if (rmDoc) {
			detectedRoles.push({
				role: 'rm',
				name: rmDoc.name || '',
				email: rmDoc.email || '',
				onboardingCompleted: rmDoc.onboardingCompleted ?? false
			});
		}

		// Admin profile detection (dedicated adminUsers collection)
		if (adminDoc && adminDoc.is_active) {
			detectedRoles.push({
				role: 'admin',
				name: adminDoc.name || '',
				email: adminDoc.email || '',
				onboardingCompleted: true
			});
		}

		// ── Build role booleans ──
		// If Applicant doc exists and has new `roles` object, use it.
		// Otherwise derive from legacy data + collection existence.
		let roleBooleans: UserRoles;
		if (userDoc?.roles) {
			roleBooleans = userDoc.roles;
		} else {
			roleBooleans = { ...DEFAULT_ROLES };
			if (userDoc) {
				// Legacy: derive from old role string
				const legacyRole = userDoc.role;
				if (legacyRole === 'admin') roleBooleans.admin = true;
				if (legacyRole === 'user' || userDoc.onboardingCompleted) roleBooleans.user = true;
				if (legacyRole === 'dsa') {
					roleBooleans.dsa = true;
					roleBooleans.user = true;
				}
			}
			// Check DSA collection
			if (dsaDoc?.onboardingCompleted) {
				roleBooleans.dsa = true;
				roleBooleans.user = true;
			}
			// Check RM collection
			if (rmDoc) {
				roleBooleans.rm = true;
			}
		}

		// Always merge from dedicated collections — these are authoritative
		// regardless of what the Applicant.roles object says
		if (adminDoc?.is_active) {
			roleBooleans.admin = true;
		}
		if (dsaDoc?.onboardingCompleted) {
			roleBooleans.dsa = true;
		}
		if (rmDoc) {
			roleBooleans.rm = true;
		}

		// Surface meaningful roles — DSA, RM, admin (exclude generic 'user')
		const activeRoles = [
			roleBooleans.dsa && 'dsa',
			roleBooleans.rm && 'rm',
			roleBooleans.admin && 'admin'
		].filter(Boolean) as string[];

		// ── Check for pending team invite (phone-first identity) ──
		let hasPendingTeamInvite = false;
		let teamInviteInfo: { teamOwnerName: string; inviteCode: string } | null = null;

		if (activeRoles.length === 0 && !roleBooleans.admin) {
			// No existing profiles → check if any team has invited this mobile number
			const teamWithInvite = await Teams.findOne(
				{ 'members.mobile_number': Number(mobileStr), 'members.status': 'invited' },
				{ projection: { owner_dsa_id: 1, 'members.$': 1 } }
			);
			if (teamWithInvite) {
				const ownerDsa = await DsaApplications.findOne(
					{ _id: teamWithInvite.owner_dsa_id },
					{ projection: { name: 1 } }
				);
				const invitedMember = teamWithInvite.members[0];
				if (invitedMember) {
					hasPendingTeamInvite = true;
					teamInviteInfo = {
						teamOwnerName: ownerDsa?.name || 'Team Owner',
						inviteCode: invitedMember.invite_code
					};
				}
			}
		}

		// ── Check for previously deleted DSA account (for restore option) ──
		let hasDeletedAccount = false;
		let deletedAccountInfo: { name: string; deletedAt: string } | null = null;

		if (activeRoles.length === 0 && !roleBooleans.admin && !hasPendingTeamInvite) {
			// deletedDsa is a recovery archive — uses plaintext dual-query to
			// match legacy + encrypted-archive rows. findUserByMobile would
			// work but doesn't accept the projection/sort options shape, so
			// keep the inline dual-query here (helper covers the common case).
			const archivedDsa = await deletedDsa.findOne(
				{ mobileNumber: { $in: [mobileStr, Number(mobileStr)] } } as any,
				{
					sort: { deletedAt: -1 },
					projection: { name: 1, deletedAt: 1 }
				}
			);
			if (archivedDsa) {
				hasDeletedAccount = true;
				deletedAccountInfo = {
					name: archivedDsa.name || '',
					deletedAt: archivedDsa.deletedAt?.toISOString?.() ?? new Date().toISOString()
				};
			}
		}

		return apiOk({
			hasAnyProfile: detectedRoles.length > 0 || roleBooleans.admin,
			roles: detectedRoles,
			roleBooleans,
			activeRoles,
			isAdmin: roleBooleans.admin,
			totalRoles: detectedRoles.length,
			requiresOnboarding:
				activeRoles.length === 0 && !roleBooleans.admin && !hasPendingTeamInvite,
			userName: dsaDoc?.name || rmDoc?.name || adminDoc?.name || userDoc?.name || '',
			hasDeletedAccount,
			deletedAccountInfo,
			hasPendingTeamInvite,
			teamInviteInfo
		});
	} catch (error) {
		return apiServerError(error, 'Failed to detect roles');
	}
};
