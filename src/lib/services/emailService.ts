/**
 * Email OTP Service — OTP generation, verification, and OTP email delivery.
 *
 * Delegates actual email sending to the canonical `sendEmail()` in `$lib/server/email.ts`.
 * This file focuses on OTP business logic and the OTP-specific HTML template.
 */

import { sendEmail } from '$lib/server/email.js';
import { escapeHtml } from '$lib/utils/sanitize.js';
import logger from '$lib/server/logger.js';
import {
	buildTransactionalFooterHtml,
	buildTransactionalFooterText,
	SUPPORT_EMAIL
} from '$lib/server/emailTemplates/footer';
import crypto from 'crypto';

import type { EmailOtpData } from '$lib/types/index.js';

/** Generate a cryptographically secure 6-digit OTP. */
export function generateOTP(): string {
	return crypto.randomInt(100000, 999999).toString();
}

/** Send OTP verification email. Returns true if email was sent successfully. */
export async function sendOTPEmail(email: string, otp: string, userName: string): Promise<boolean> {
	const escapedName = escapeHtml(userName);

	const result = await sendEmail({
		to: email,
		subject: 'DigitalDSA — Email Verification Code',
		html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fb;">
        <div style="background-color: #f8f9fb; padding: 40px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto;">
            <tr>
              <td>
                <table width="100%" style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #2563eb; padding: 24px 0; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 1px;">DigitalDSA</h1>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 36px 40px; color: #333333;">
                      <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #1a1a1a;">Email Verification</h2>
                      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Hello <strong>${escapedName}</strong>,
                      </p>
                      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                        Please use the verification code below to verify your email address on <strong>DigitalDSA</strong>:
                      </p>

                      <!-- OTP Code Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                        <tr>
                          <td align="center">
                            <div style="background-color: #2563eb; color: #ffffff; font-size: 32px; font-weight: bold; padding: 18px 32px; border-radius: 8px; letter-spacing: 8px; display: inline-block;">
                              ${otp}
                            </div>
                          </td>
                        </tr>
                      </table>

                      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Enter this code in the verification form to continue.
                      </p>

                      <!-- Warning Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                        <tr>
                          <td style="background-color: #fef3cd; border: 1px solid #fde68a; border-radius: 6px; padding: 14px 18px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #92400e;">
                              <strong>Important:</strong> This code will expire in <strong>10 minutes</strong>. If you did not request this, please ignore this email.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <p style="font-size: 15px; line-height: 1.6; color: #555555; margin: 0 0 24px 0;">
                        If you need help, reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}" style="color: #2563eb; text-decoration: none;">${SUPPORT_EMAIL}</a>.
                      </p>

                      ${buildTransactionalFooterHtml({ recipientEmail: email })}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `,
		text: `Hello ${userName},\n\nPlease use the following verification code to verify your email address on DigitalDSA:\n\nYour code: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.${buildTransactionalFooterText({ recipientEmail: email })}`,
		replyTo: SUPPORT_EMAIL
	});

	if (!result.success) {
		logger.error({ error: result.error, to: email }, 'Failed to send OTP email');
	}

	return result.success;
}

export function verifyOTP(storedOtpData: EmailOtpData, providedOtp: string): boolean {
	const now = new Date();

	if (now > storedOtpData.expiresAt) {
		return false;
	}

	return storedOtpData.otp === providedOtp;
}

export function createOTPData(email: string, otp: string): EmailOtpData {
	const expiresAt = new Date();
	expiresAt.setMinutes(expiresAt.getMinutes() + 10);

	return {
		email,
		otp,
		expiresAt
	};
}
