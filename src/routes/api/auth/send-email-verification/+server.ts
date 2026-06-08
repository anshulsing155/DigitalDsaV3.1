import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateOTP, sendOTPEmail } from '$lib/services/emailService.js';
import { otpStore } from '$lib/services/otpStore.js';
import { Applicant, DsaApplications } from '$lib/database/mongo.js';
import { apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	// Rate limit: 5 requests per 10 minutes per IP to prevent email spam
	const isLimited = await rateLimit(getClientAddress(), {
		maxRequests: 5,
		windowMs: 10 * 60 * 1000,
		identifier: `send-email-verify:${getClientAddress()}`
	});
	if (isLimited) {
		return apiError('Too many requests. Please try again later.', 429);
	}

	const parsed = await parseJsonBody<{ email: string; role?: string }>(request);
	if (!parsed.ok) return parsed.response;
	const { email, role } = parsed.data;

	try {
		if (!email) {
			return apiError('Email is required');
		}

		// DSA-only platform: check DSA or Applicant collection
		const effectiveRole = role === 'dsa' ? 'dsa' : 'user';

		// Select collection based on role
		const Collection = effectiveRole === 'dsa' ? DsaApplications : Applicant;

		const existingUser = await Collection.findOne({ email });
		const userName = existingUser?.name || 'User';
		const otp = generateOTP();
		await otpStore.generateAndStore(email, otp);
		const emailSent = await sendOTPEmail(email, otp, userName);

		if (!emailSent) {
			await otpStore.remove(email);
			return apiError('Failed to send verification email. Please try again.', 500);
		}

		return json({
			success: true,
			message: 'Verification email sent successfully',
			data: {
				email,
				otpSent: true
			}
		});
	} catch (error) {
		return apiServerError(error, 'Failed to send verification email');
	}
};
