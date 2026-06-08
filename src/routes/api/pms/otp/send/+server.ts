/**
 * POST /api/pms/otp/send
 * Sends a PMS OTP to the RM's official bank email address.
 *
 * The OTP is bound to a PmsOtpContext (purpose + lenderId + optional policyId/draftHash).
 * Domain validation is enforced here: the email domain must match lenderDirectory.
 *
 * Rate limiting via MSG91 and the existing OTP cooldown (one active OTP per email).
 */
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { otpStore } from '$lib/services/otpStore.js';
import { LENDER_BY_ID } from '$lib/config/lenderPolicies/lenderDirectory.js';
import { sendEmail } from '$lib/server/email.js';
import crypto from 'crypto';
import type { PmsOtpContext } from '$lib/config/pms/policyTypes.js';

export const POST: RequestHandler = async ({ locals, request, getClientAddress }) => {
	const denied = requireRoleApi(locals, ['rm', 'admin']);
	if (denied) return denied;

	// Admin impersonation bypass — skip OTP entirely, no email sent
	if (locals.adminActingAs) {
		logger.info(
			{ adminId: locals.adminActingAs.id, rmId: locals.user?.id },
			'PMS OTP send bypassed for admin impersonation'
		);
		return apiOk({ message: 'Admin bypass — no OTP required', adminBypass: true });
	}

	// 5 OTP sends per minute per IP — prevents email flooding
	const ip = getClientAddress();
	const limited = await rateLimit(ip, { maxRequests: 5, windowMs: 60_000, identifier: `pms_otp_send:${ip}` });
	if (limited) return apiError('Too many OTP requests. Please wait before trying again.', 429);

	const body = await parseJsonBody<{
		bankEmail: string;
		context: PmsOtpContext;
	}>(request);
	if (!body.ok) return body.response;

	const { bankEmail, context } = body.data;

	if (!bankEmail || !context?.purpose || !context?.lenderId) {
		return apiError('bankEmail and context (purpose, lenderId) are required', 400);
	}

	// Validate email domain against lenderDirectory
	const lender = LENDER_BY_ID.get(context.lenderId);
	if (!lender) {
		return apiError(`Lender '${context.lenderId}' not found`, 404);
	}
	if (!lender.officialEmailDomain) {
		return apiError('This lender has no official email domain configured', 422);
	}

	const emailDomain = bankEmail.split('@')[1]?.toLowerCase();
	if (emailDomain !== lender.officialEmailDomain.toLowerCase()) {
		return apiError(
			`Email domain must be @${lender.officialEmailDomain} for ${lender.lenderName}`,
			422
		);
	}

	// Dev-only test RM shortcut: testddsa@<lender-official-domain> skips email
	// send entirely. Pair with fixed OTP "000000" on /api/pms/otp/verify.
	// `dev` is a compile-time constant; this entire block is tree-shaken from
	// production builds, so it is impossible to reach in prod.
	if (dev && bankEmail.toLowerCase().startsWith('testddsa@')) {
		logger.info(
			{ rmUserId: locals.user?.id, lenderId: context.lenderId, bankEmail },
			'DEV: PMS OTP send bypassed for testddsa@ — submit verify with OTP "000000"'
		);
		return apiOk({
			message: 'DEV mode — email skipped. Use OTP 000000 on verify.',
			devBypass: true
		});
	}

	// Check if an active OTP already exists (cooldown)
	const alreadyActive = await otpStore.exists(bankEmail);
	if (alreadyActive) {
		return apiError('An OTP was recently sent to this email. Please wait before requesting again.', 429);
	}

	// Generate 6-digit OTP using CSPRNG (Math.random is not cryptographically secure)
	const otp = String(crypto.randomInt(100000, 1000000));

	try {
		await otpStore.generateAndStoreWithContext(bankEmail, otp, context);
	} catch (err) {
		return apiServerError(err, 'pms otp store');
	}

	// Send via email
	try {
		await sendEmail({
			to: bankEmail,
			subject: `DigitalDSA — PMS Verification Code`,
			html: `
				<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
					<div style="font-size: 22px; font-weight: bold; color: #cb997e; margin-bottom: 16px;">DigitalDSA</div>
					<p>Your verification code for <strong>${lender.lenderName}</strong>:</p>
					<div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a; padding: 20px 0;">${otp}</div>
					<p style="color: #666; font-size: 14px;">This code expires in 10 minutes. Do not share it with anyone.</p>
					<p style="color: #666; font-size: 14px; margin-top: 16px;">Purpose: ${context.purpose.replace(/_/g, ' ')}</p>
				</div>
			`,
			text: `Your DigitalDSA PMS verification code for ${lender.lenderName}: ${otp}. Expires in 10 minutes.`
		});
	} catch (err) {
		// Roll back the stored OTP so the RM can retry
		await otpStore.remove(bankEmail);
		logger.error({ err, lenderId: context.lenderId }, 'Failed to send PMS OTP email');
		return apiServerError(err, 'pms otp email send');
	}

	logger.info(
		{ rmUserId: locals.user?.id, lenderId: context.lenderId, purpose: context.purpose },
		'PMS OTP sent'
	);

	return apiOk({ message: `Verification code sent to ${bankEmail}` });
};
