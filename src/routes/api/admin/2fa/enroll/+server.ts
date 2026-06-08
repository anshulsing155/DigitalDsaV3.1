/**
 * POST /api/admin/2fa/enroll
 * ══════════════════════════════════════════════════════════════════════
 * Start 2FA enrollment for the calling admin. Generates a fresh TOTP
 * secret, persists it with `enabled: false` (enrollment-in-progress),
 * and returns the QR data URL + manual key for the admin to set up
 * their authenticator app.
 *
 * The secret is NOT active until /confirm verifies the admin can produce
 * a valid TOTP code from it. Calling /enroll again before /confirm
 * overwrites the in-progress secret — admins can retry without ops help
 * if they mis-scan the QR.
 *
 * Auth: admin role only. No additional permission check — enrolling 2FA
 * is account-self-management, not a privileged action.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §E.2
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse';
import { requireRoleApi } from '$lib/server/guards';
import { AdminUsers } from '$lib/database/mongo';
import logger from '$lib/server/logger';
import {
	generateSecret,
	buildOtpauthUrl,
	generateQrDataUrl
} from '$lib/server/admin/totp';

export const POST: RequestHandler = async ({ locals }) => {
	const authError = requireRoleApi(locals, 'admin');
	if (authError) return authError;
	const sessionUser = locals.user!;

	try {
		const admin = await AdminUsers.findOne({ mobileNumber: Number(sessionUser.mobileNumber) });
		if (!admin) return apiError('Admin profile not found', 404);

		// Reject double-enrollment — admin must explicitly /disable an enabled
		// 2FA before re-enrolling (prevents accidentally orphaning recovery
		// codes by a stray /enroll click).
		if (admin.twofa?.enabled) {
			return apiError(
				'Two-factor authentication is already enabled. Disable it first if you need to re-enroll with a new authenticator.',
				409
			);
		}

		const secret = generateSecret();
		const accountLabel = admin.email || `admin:${admin.mobileNumber}`;
		const otpauthUrl = buildOtpauthUrl(accountLabel, secret);
		const qrDataUrl = await generateQrDataUrl(otpauthUrl);

		// Persist enrollment-in-progress. Overwrites any previous unconfirmed
		// secret (admin retried the QR). Recovery codes minted on /confirm.
		await AdminUsers.updateOne(
			{ _id: admin._id },
			{
				$set: {
					twofa: {
						enabled: false,
						secret,
						recovery_code_hashes: []
					},
					updated_at: new Date()
				}
			}
		);

		logger.info(
			{ admin_id: String(admin._id) },
			'[2fa] Admin started enrollment'
		);

		return apiOk({
			qr_data_url: qrDataUrl,
			otpauth_url: otpauthUrl,
			// Manual key for admins typing into apps that don't scan QRs.
			manual_key: secret
		});
	} catch (err) {
		return apiServerError(err, '2FA enrollment failed');
	}
};
