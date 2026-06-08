/**
 * POST /api/admin/2fa/confirm
 * ══════════════════════════════════════════════════════════════════════
 * Complete 2FA enrollment by verifying the admin can produce a valid
 * TOTP code from the secret minted by /enroll. On success:
 *   1. Generate 8 plaintext recovery codes
 *   2. SHA-256 hash each → store hashes in twofa.recovery_code_hashes
 *   3. Flip twofa.enabled = true + set enrolled_at
 *   4. Return the PLAINTEXT codes ONCE — caller MUST show + tell the
 *      admin to save them; they're never recoverable from the server
 *
 * Body: { token: '123456' }
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
	generateRecoveryCodes,
	hashRecoveryCode
} from '$lib/server/admin/totp';

export const POST: RequestHandler = async ({ request, locals }) => {
	const authError = requireRoleApi(locals, 'admin');
	if (authError) return authError;
	const sessionUser = locals.user!;

	const parsed = await parseJsonBody<{ token?: string }>(request);
	if (!parsed.ok) return parsed.response;
	const token = parsed.data?.token;
	if (typeof token !== 'string' || !token.trim()) {
		return apiError('Token is required', 400);
	}

	try {
		const admin = await AdminUsers.findOne({ mobileNumber: Number(sessionUser.mobileNumber) });
		if (!admin) return apiError('Admin profile not found', 404);

		if (admin.twofa?.enabled) {
			return apiError(
				'Two-factor authentication is already enabled. To re-enroll, disable it first.',
				409
			);
		}

		if (!admin.twofa?.secret) {
			return apiError(
				'No enrollment in progress. Start enrollment first via /enroll.',
				400
			);
		}

		if (!verifyToken(admin.twofa.secret, token)) {
			logger.warn(
				{ admin_id: String(admin._id) },
				'[2fa] Confirm rejected: invalid token'
			);
			return apiError(
				"That code didn't match. Check your authenticator app is showing the right account and that your phone clock is correct, then try again.",
				400
			);
		}

		// Token verified — mint recovery codes + flip the enabled bit.
		const recoveryCodes = generateRecoveryCodes();
		const recoveryHashes = recoveryCodes.map(hashRecoveryCode);

		await AdminUsers.updateOne(
			{ _id: admin._id },
			{
				$set: {
					'twofa.enabled': true,
					'twofa.recovery_code_hashes': recoveryHashes,
					'twofa.enrolled_at': new Date(),
					'twofa.failed_attempts': [],
					updated_at: new Date()
				}
			}
		);

		logger.info(
			{ admin_id: String(admin._id), recovery_codes_generated: recoveryCodes.length },
			'[2fa] Admin completed enrollment'
		);

		return apiOk({
			// CRITICAL: these are shown ONCE. The server only stores hashes;
			// no recovery is possible if the admin doesn't save these.
			recovery_codes: recoveryCodes,
			recovery_codes_count: recoveryCodes.length,
			message:
				'Two-factor authentication is now active. Save these recovery codes somewhere safe — they will not be shown again. Each code works once.'
		});
	} catch (err) {
		return apiServerError(err, '2FA confirmation failed');
	}
};
