/**
 * POST /api/admin/2fa/disable
 * ══════════════════════════════════════════════════════════════════════
 * Turn off 2FA for the calling admin. Requires either a valid current
 * TOTP token OR a valid recovery code — proves the admin still has
 * access to the second factor (so a hijacked OTP session can't disable
 * it on its own).
 *
 * Body: { token?: '123456', recovery_code?: 'xxxx-xxxx-xxxx-xxxx' }
 *       — exactly one is required.
 *
 * On success: removes the entire `twofa` sub-document. To re-enable,
 * admin starts a fresh /enroll cycle.
 *
 * Lockout: 5 wrong codes in 15 min → temporarily blocked from /disable
 * (and /verify — they share the failed_attempts list).
 *
 * Auth: admin role only.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §E.2
 */

import type { RequestHandler } from './$types';
import {
	apiOk,
	apiError,
	apiServerError,
	parseJsonBody
} from '$lib/server/apiResponse';
import { requireRoleApi } from '$lib/server/guards';
import { AdminUsers } from '$lib/database/mongo';
import logger from '$lib/server/logger';
import {
	verifyToken,
	findMatchingRecoveryHash,
	computeLockoutState
} from '$lib/server/admin/totp';

export const POST: RequestHandler = async ({ request, locals }) => {
	const authError = requireRoleApi(locals, 'admin');
	if (authError) return authError;
	const sessionUser = locals.user!;

	const parsed = await parseJsonBody<{ token?: string; recovery_code?: string }>(request);
	if (!parsed.ok) return parsed.response;
	const token = parsed.data?.token?.trim();
	const recoveryCode = parsed.data?.recovery_code?.trim();
	if (!token && !recoveryCode) {
		return apiError('A current TOTP code or a recovery code is required.', 400);
	}

	try {
		const admin = await AdminUsers.findOne({ mobileNumber: Number(sessionUser.mobileNumber) });
		if (!admin) return apiError('Admin profile not found', 404);

		if (!admin.twofa?.enabled || !admin.twofa.secret) {
			return apiError('Two-factor authentication is not enabled on this account.', 400);
		}

		// Lockout check first — don't even attempt verification if blocked.
		const { state: lockout, trimmedAttempts } = computeLockoutState(
			admin.twofa.failed_attempts
		);
		if (lockout.isLockedOut) {
			return apiError(
				`Too many failed attempts. Try again after ${lockout.unlocksAt?.toLocaleTimeString() ?? 'a few minutes'}.`,
				429
			);
		}

		// Verify the proof — TOTP token OR recovery code. Recovery code wins
		// if both supplied (defensive — caller shouldn't, but harmless).
		let proofValid = false;
		let usedRecoveryHash: string | null = null;

		if (recoveryCode) {
			usedRecoveryHash = findMatchingRecoveryHash(
				recoveryCode,
				admin.twofa.recovery_code_hashes ?? []
			);
			proofValid = usedRecoveryHash !== null;
		} else if (token) {
			proofValid = verifyToken(admin.twofa.secret, token);
		}

		if (!proofValid) {
			// Record the failure for lockout tracking. Cap the array at the
			// lockout threshold + 1 so we don't grow unbounded.
			const updatedAttempts = [...trimmedAttempts, new Date()].slice(-10);
			await AdminUsers.updateOne(
				{ _id: admin._id },
				{
					$set: { 'twofa.failed_attempts': updatedAttempts, updated_at: new Date() }
				}
			);
			logger.warn(
				{
					admin_id: String(admin._id),
					used_recovery_code: !!recoveryCode,
					failure_count: updatedAttempts.length
				},
				'[2fa] Disable rejected: invalid proof'
			);
			return apiError(
				recoveryCode
					? "That recovery code didn't match or has already been used."
					: "That code didn't match. Check your authenticator app and your phone clock.",
				400
			);
		}

		// Proof valid — remove the entire twofa sub-document.
		await AdminUsers.updateOne(
			{ _id: admin._id },
			{
				$unset: { twofa: '' },
				$set: { updated_at: new Date() }
			}
		);

		logger.info(
			{
				admin_id: String(admin._id),
				disabled_via: recoveryCode ? 'recovery_code' : 'totp_token'
			},
			'[2fa] Admin disabled 2FA'
		);

		return apiOk({
			message: 'Two-factor authentication has been turned off for this account.'
		});
	} catch (err) {
		return apiServerError(err, '2FA disable failed');
	}
};
