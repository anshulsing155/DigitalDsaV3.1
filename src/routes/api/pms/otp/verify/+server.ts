/**
 * POST /api/pms/otp/verify
 * Verifies a PMS OTP and issues a short-lived pmsOtpToken bound to the
 * policy + draft hash AND a 15-min time window. This token is required on
 * submit/publish endpoints.
 *
 * Token: HMAC-SHA256(rmUserId:lenderId:policyId:draftHash:windowSlot, PMS_SIGNING_SECRET)
 * encoded as base64url. Callers pass it as `x-pms-otp-token` header.
 *
 * Rate limits:
 *   - per IP: 3 attempts / 15 min  (defence in depth, bypassable by IP rotation)
 *   - per bankEmail: 3 attempts / 15 min  (the load-bearing limit — bound to the OTP target)
 *   - otpStore.maxAttempts: 5 per OTP record (final backstop, invalidates the OTP)
 */
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { otpStore } from '$lib/services/otpStore.js';
import { getPmsSigningKey, issuePmsOtpToken } from '$lib/server/pms/signingKey.js';
import { LENDER_BY_ID } from '$lib/config/lenderPolicies/lenderDirectory.js';
import type { PmsOtpContext } from '$lib/config/pms/policyTypes.js';

export const POST: RequestHandler = async ({ locals, request, getClientAddress }) => {
	const denied = requireRoleApi(locals, ['rm', 'admin']);
	if (denied) return denied;

	// Admin impersonation bypass — issue token directly without OTP check
	if (locals.adminActingAs) {
		const body = await parseJsonBody<{
			bankEmail: string;
			otp: string;
			context: PmsOtpContext;
		}>(request);
		if (!body.ok) return body.response;
		const { context } = body.data;

		let signingKey: string;
		try {
			signingKey = getPmsSigningKey();
		} catch (err) {
			logger.error({ err }, 'PMS signing key unavailable during admin impersonation OTP bypass');
			return apiError('Server configuration error', 500);
		}

		const token = issuePmsOtpToken(
			{
				rmUserId: locals.user!.id,
				lenderId: context?.lenderId || '',
				policyId: context?.policyId || '',
				draftHash: context?.draftHash || ''
			},
			signingKey
		);

		logger.info(
			{ adminId: locals.adminActingAs.id, rmId: locals.user!.id },
			'PMS OTP verify bypassed for admin impersonation — token issued'
		);
		return apiOk({ pmsOtpToken: token });
	}

	// IP-bound limit (defence in depth)
	const ip = getClientAddress();
	const limitedByIp = await rateLimit(ip, {
		maxRequests: 3,
		windowMs: 15 * 60_000,
		identifier: `pms_otp_verify:${ip}`
	});
	if (limitedByIp) return apiError('Too many verification attempts. Please wait 15 minutes.', 429);

	const body = await parseJsonBody<{
		bankEmail: string;
		otp: string;
		context: PmsOtpContext;
	}>(request);
	if (!body.ok) return body.response;

	const { bankEmail, otp, context } = body.data;

	if (!bankEmail || !otp || !context?.purpose || !context?.lenderId) {
		return apiError('bankEmail, otp, and context (purpose, lenderId) are required', 400);
	}

	// Dev-only test RM shortcut: testddsa@<lender-official-domain> + OTP "000000"
	// issues a token directly. Domain must still match the lender (mirrors prod
	// validation). `dev` is a compile-time constant — Vite tree-shakes this block
	// from production builds, so it is impossible to reach in prod.
	if (dev && bankEmail.toLowerCase().startsWith('testddsa@') && otp === '000000') {
		const lender = LENDER_BY_ID.get(context.lenderId);
		const expectedDomain = lender?.officialEmailDomain?.toLowerCase();
		const actualDomain = bankEmail.split('@')[1]?.toLowerCase();
		if (!lender || !expectedDomain || actualDomain !== expectedDomain) {
			return apiError('DEV bypass requires testddsa@<lender-official-domain>', 422);
		}

		let signingKey: string;
		try {
			signingKey = getPmsSigningKey();
		} catch (err) {
			logger.error({ err }, 'DEV: PMS signing key unavailable for testddsa bypass');
			return apiError('Server configuration error', 500);
		}

		const token = issuePmsOtpToken(
			{
				rmUserId: locals.user!.id,
				lenderId: context.lenderId,
				policyId: context.policyId || '',
				draftHash: context.draftHash || ''
			},
			signingKey
		);

		logger.info(
			{ rmUserId: locals.user!.id, lenderId: context.lenderId, bankEmail },
			'DEV: PMS OTP verify bypassed for testddsa@ + OTP "000000" — token issued'
		);
		return apiOk({ pmsOtpToken: token, devBypass: true });
	}

	// Per-email limit — the load-bearing brute-force defence. IP rotation can
	// bypass the IP limiter; rotating bankEmail invalidates the OTP attempt
	// because OTPs are issued per-email.
	const limitedByEmail = await rateLimit(bankEmail, {
		maxRequests: 3,
		windowMs: 15 * 60_000,
		identifier: `pms_otp_verify_email:${bankEmail}`
	});
	if (limitedByEmail) {
		return apiError(
			'Too many verification attempts for this email. Please wait 15 minutes.',
			429
		);
	}

	try {
		const result = await otpStore.verifyWithContext(bankEmail, otp, context);

		if (!result.success) {
			return apiError(result.message, 401);
		}
	} catch (err) {
		return apiServerError(err, 'pms otp verify');
	}

	let signingKey: string;
	try {
		signingKey = getPmsSigningKey();
	} catch (err) {
		logger.error({ err }, 'PMS signing key unavailable — cannot issue pmsOtpToken');
		return apiError('Server configuration error', 500);
	}

	const token = issuePmsOtpToken(
		{
			rmUserId: locals.user!.id,
			lenderId: context.lenderId,
			policyId: context.policyId || '',
			draftHash: context.draftHash || ''
		},
		signingKey
	);

	logger.info(
		{ rmUserId: locals.user!.id, lenderId: context.lenderId, purpose: context.purpose },
		'PMS OTP verified — token issued'
	);

	return apiOk({ pmsOtpToken: token });
};
