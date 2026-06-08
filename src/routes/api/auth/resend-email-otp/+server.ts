import { Applicant } from '$lib/database/mongo.js';
import { generateOTP, sendOTPEmail } from '$lib/services/emailService.js';
import { otpStore } from '$lib/services/otpStore.js';
import type { RequestHandler } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { apiError, apiServerError, apiOkMessage, parseJsonBody } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';

interface ResendEmailOtpRequest {
	userId: string;
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	// Rate limit: 5 requests per 10 minutes per IP to prevent email spam
	const isLimited = await rateLimit(getClientAddress(), {
		maxRequests: 5,
		windowMs: 10 * 60 * 1000,
		identifier: `resend-email-otp:${getClientAddress()}`
	});
	if (isLimited) {
		return apiError('Too many requests. Please try again later.', 429);
	}

	const parsed = await parseJsonBody<ResendEmailOtpRequest>(request);
	if (!parsed.ok) return parsed.response;
	const { userId } = parsed.data;

	try {
		// Validate required fields
		if (!userId) {
			return apiError('User ID is required');
		}

		// Find user by ID
		const user = await Applicant.findOne({
			_id: new ObjectId(userId)
		});

		if (!user) {
			return apiError('User not found', 404);
		}

		// Check if email is already verified
		if (user.isEmailVerified) {
			return apiError('Email is already verified');
		}

		const userEmail = user.email || '';
		const userName = user.name || '';

		if (!userEmail) {
			return apiError('No email address found for this user');
		}

		// Check if OTP already exists (rate limiting)
		if (await otpStore.exists(userEmail)) {
			return apiError(
				'An OTP is already active for this email. Please wait for it to expire or use the existing one.',
				429
			);
		}

		// Generate new OTP
		const otp = generateOTP();

		// Store OTP securely on server (MongoDB-backed)
		await otpStore.generateAndStore(userEmail, otp);

		// Send OTP email
		const emailSent = await sendOTPEmail(userEmail, otp, userName);

		if (!emailSent) {
			// Remove OTP from store if email sending failed
			await otpStore.remove(userEmail);
			return apiError('Failed to send OTP email. Please try again.', 500);
		}

		return apiOkMessage(
			`New OTP sent to ${userEmail}. Please check your email and enter the 6-digit code.`
		);
	} catch (error) {
		return apiServerError(error, 'Something went wrong. Please try again.');
	}
};
