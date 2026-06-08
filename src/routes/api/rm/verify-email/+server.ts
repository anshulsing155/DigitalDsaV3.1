/**
 * POST /api/rm/verify-email
 * ============================================================================
 * Monthly email OTP verification for RMs.
 *
 * Two actions distinguished by body.action:
 *   "send"   — Generate OTP, store hashed version, email to RM's official email
 *   "verify" — Validate OTP, update email_verified_at timestamp
 * ============================================================================
 */

import type { RequestHandler } from './$types';
import { rmApplications } from '$lib/database/mongo.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { generateOTP, sendOTPEmail } from '$lib/services/emailService.js';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import { parseJsonBody, apiOkMessage, apiError, apiServerError } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { dev } from '$app/environment';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';

/** SHA-256 hash a string (for OTP storage — never store plaintext). */
function hashOtp(otp: string): string {
	return crypto.createHash('sha256').update(otp).digest('hex');
}

/** Timing-safe comparison of two hex strings. */
function timingSafeCompare(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	const bufA = Buffer.from(a, 'hex');
	const bufB = Buffer.from(b, 'hex');
	return crypto.timingSafeEqual(bufA, bufB);
}

export const POST: RequestHandler = async ({ request, locals }) => {
	// Auth + role guard
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const bodyParsed = await parseJsonBody<{ action?: string; otp?: string }>(request);
		if (!bodyParsed.ok) return bodyParsed.response;
		const body = bodyParsed.data;

		const { action } = body;

		if (action !== 'send' && action !== 'verify') {
			return apiError('Invalid action. Use "send" or "verify".');
		}

		// Resolve RM document
		let rmDoc;
		try {
			rmDoc = await rmApplications.findOne({ _id: new ObjectId(locals.user!.id) });
		} catch {
			// SEC-2: encrypted-first lookup; decrypt for downstream reads
			// (the rmOfficialEmail / officialEmail fields are used below).
			const rmDocRaw = await findUserByMobile(rmApplications, locals.user!.mobileNumber);
			rmDoc = await decryptUserPii(rmDocRaw);
		}

		if (!rmDoc) {
			return apiError('RM not found', 404);
		}

		const rmId = rmDoc._id!;

		// ══════════════════════════════════════════════════════════════
		// ACTION: SEND OTP
		// ══════════════════════════════════════════════════════════════
		if (action === 'send') {
			const rmOfficialEmail = rmDoc.rmOfficialEmail || (rmDoc as any).officialEmail;
			if (!rmOfficialEmail) {
				return apiError('No official email set. Please update your profile first.');
			}

			// Check if too many failed attempts (cooldown: reset after 15 min from last OTP send)
			const failures = rmDoc.email_verification_failures ?? 0;
			if (failures >= 3) {
				// Allow retry after existing OTP expires (10 min), so check emailOtpExpiry
				const otpExpiry = rmDoc.emailOtpExpiry ? new Date(rmDoc.emailOtpExpiry) : null;
				if (otpExpiry && otpExpiry.getTime() > Date.now()) {
					return apiError('Too many failed attempts. Please wait and try again later.', 429);
				}
				// OTP expired, allow new attempt — reset failures
				await rmApplications.updateOne({ _id: rmId }, { $set: { email_verification_failures: 0 } });
			}

			const otp = generateOTP();
			const hashedOtp = hashOtp(otp);
			const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

			// Store hashed OTP + expiry on the RM document
			await rmApplications.updateOne(
				{ _id: rmId },
				{
					$set: {
						emailOtp: hashedOtp,
						emailOtpExpiry: expiry
					}
				}
			);

			// Dev mode: log OTP so testers can verify without real SMTP
			if (dev) {
				logger.info(
					{ email: rmOfficialEmail, otp },
					'RM email verification OTP generated (dev mode)'
				);
			}

			// Send email (in dev mode, may fail if SMTP not configured — OTP is in logs above)
			const sent = await sendOTPEmail(rmOfficialEmail, otp, rmDoc.name || 'RM');
			if (!sent && !dev) {
				return apiError('Failed to send verification email. Please try again.', 500);
			}

			return apiOkMessage(
				dev && !sent
					? 'OTP logged to server logs (dev mode — SMTP not configured).'
					: 'OTP sent to your registered email.'
			);
		}

		// ══════════════════════════════════════════════════════════════
		// ACTION: VERIFY OTP
		// ══════════════════════════════════════════════════════════════
		if (action === 'verify') {
			const { otp } = body;

			if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
				return apiError('Please enter a valid 6-digit OTP.');
			}

			// Check failure count
			const failures = rmDoc.email_verification_failures ?? 0;
			if (failures >= 3) {
				return apiError('Too many failed attempts. Please request a new OTP.', 429);
			}

			// Check OTP exists and not expired
			const storedHash = rmDoc.emailOtp;
			const otpExpiry = rmDoc.emailOtpExpiry ? new Date(rmDoc.emailOtpExpiry) : null;

			if (!storedHash || !otpExpiry) {
				return apiError('No OTP found. Please request a new one.');
			}

			if (otpExpiry.getTime() < Date.now()) {
				return apiError('OTP has expired. Please request a new one.');
			}

			// Timing-safe comparison
			const providedHash = hashOtp(otp);
			const isMatch = timingSafeCompare(storedHash, providedHash);

			if (!isMatch) {
				// Increment failures
				const newFailures = failures + 1;
				await rmApplications.updateOne(
					{ _id: rmId },
					{ $set: { email_verification_failures: newFailures } }
				);

				if (newFailures >= 3) {
					return apiError('Too many failed attempts. Please request a new OTP.', 429);
				}

				return apiError('Invalid OTP. Please try again.');
			}

			// OTP is correct — update email_verified_at, clear OTP fields, reset failures
			await rmApplications.updateOne(
				{ _id: rmId },
				{
					$set: {
						email_verified_at: new Date(),
						email_verification_failures: 0
					},
					$unset: {
						emailOtp: '',
						emailOtpExpiry: ''
					}
				}
			);

			return apiOkMessage('Email verified successfully.');
		}

		// Fallback (should never reach here)
		return apiError('Unknown action');
	} catch (err) {
		return apiServerError(err, 'verify-email');
	}
};
