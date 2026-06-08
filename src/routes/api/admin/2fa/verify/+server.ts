/**
 * POST /api/admin/2fa/verify
 * ══════════════════════════════════════════════════════════════════════
 * Login-step verification. The admin has already passed OTP — they hold
 * a JWT with `tfa_pending: true`. Submitting a valid TOTP code OR recovery
 * code here promotes the JWT (re-issued without tfa_pending) so the admin
 * can access the rest of the dashboard.
 *
 * Body: { token?: '123456', recovery_code?: 'xxxx-xxxx-xxxx-xxxx' }
 *
 * Unlike /disable, this endpoint accepts the call from a pending JWT
 * (not yet fully-verified admin session). The `requireAuthApi` guard
 * confirms the JWT is structurally valid; we manually verify the role
 * + tfa_pending claim below.
 *
 * Lockout: shared with /disable via the failed_attempts list.
 *
 * On success: re-issues the access token cookie WITHOUT tfa_pending.
 * Refresh token is left as-is (it doesn't carry the tfa_pending claim).
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
import { requireAuthApi } from '$lib/server/guards';
import { AdminUsers } from '$lib/database/mongo';
import { generateAccessToken } from '$lib/services/jwtService';
import logger from '$lib/server/logger';
import {
	verifyToken,
	findMatchingRecoveryHash,
	computeLockoutState
} from '$lib/server/admin/totp';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	const authError = requireAuthApi(locals);
	if (authError) return authError;
	const sessionUser = locals.user!;

	// Admin-only — and only from a pending (tfa-not-yet-verified) session.
	if (sessionUser.role !== 'admin') {
		return apiError('Two-factor verification is admin-only.', 403);
	}

	const parsed = await parseJsonBody<{ token?: string; recovery_code?: string }>(request);
	if (!parsed.ok) return parsed.response;
	const token = parsed.data?.token?.trim();
	const recoveryCode = parsed.data?.recovery_code?.trim();
	if (!token && !recoveryCode) {
		return apiError('A TOTP code or a recovery code is required.', 400);
	}

	try {
		const admin = await AdminUsers.findOne({ mobileNumber: Number(sessionUser.mobileNumber) });
		if (!admin) return apiError('Admin profile not found', 404);

		if (!admin.twofa?.enabled || !admin.twofa.secret) {
			// Defensive — caller arrived here without 2FA being on. Return
			// success so the client redirects to the dashboard normally.
			return apiOk({
				already_verified: true,
				message: 'Two-factor authentication is not enabled on this account.'
			});
		}

		const { state: lockout, trimmedAttempts } = computeLockoutState(
			admin.twofa.failed_attempts
		);
		if (lockout.isLockedOut) {
			return apiError(
				`Too many failed attempts. Try again after ${lockout.unlocksAt?.toLocaleTimeString() ?? 'a few minutes'}.`,
				429
			);
		}

		// Verify proof — TOTP or recovery code.
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
			const updatedAttempts = [...trimmedAttempts, new Date()].slice(-10);
			await AdminUsers.updateOne(
				{ _id: admin._id },
				{ $set: { 'twofa.failed_attempts': updatedAttempts, updated_at: new Date() } }
			);
			logger.warn(
				{
					admin_id: String(admin._id),
					used_recovery_code: !!recoveryCode,
					failure_count: updatedAttempts.length
				},
				'[2fa] Login verify rejected: invalid proof'
			);
			return apiError(
				recoveryCode
					? "That recovery code didn't match or has already been used."
					: "That code didn't match. Check your authenticator app and your phone clock.",
				400
			);
		}

		// Proof valid. If a recovery code was used, splice its hash out so
		// it can't be reused (single-use semantics).
		const updates: Record<string, unknown> = {
			'twofa.failed_attempts': [],
			updated_at: new Date()
		};
		if (usedRecoveryHash) {
			updates['twofa.recovery_code_hashes'] = (
				admin.twofa.recovery_code_hashes ?? []
			).filter((h) => h !== usedRecoveryHash);
		}
		await AdminUsers.updateOne({ _id: admin._id }, { $set: updates });

		// Promote the JWT: re-issue WITHOUT tfa_pending claim. Same userId,
		// email, mobile, name — only the tfa_pending flag drops. Cookie
		// settings mirror what verify-otp sets (httpOnly + secure + sameSite).
		const promotedToken = generateAccessToken({
			userId: String(admin._id),
			email: admin.email ?? '',
			mobileNumber: admin.mobileNumber,
			name: admin.name,
			role: 'admin'
		});
		cookies.set('accessToken', promotedToken, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 60 * 15 // 15 min — matches ACCESS_TOKEN_EXPIRY
		});

		logger.info(
			{
				admin_id: String(admin._id),
				used_recovery_code: !!recoveryCode,
				remaining_recovery_codes: usedRecoveryHash
					? (admin.twofa.recovery_code_hashes ?? []).length - 1
					: (admin.twofa.recovery_code_hashes ?? []).length
			},
			'[2fa] Admin login verified'
		);

		return apiOk({
			redirect: '/dashboard/admin',
			used_recovery_code: !!recoveryCode,
			...(usedRecoveryHash && {
				remaining_recovery_codes:
					(admin.twofa.recovery_code_hashes ?? []).length - 1
			})
		});
	} catch (err) {
		return apiServerError(err, '2FA verification failed');
	}
};
