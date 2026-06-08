/**
 * Email Service — Production email delivery
 * ══════════════════════════════════════════════════════════════════════
 * SEC-8 (2026-05-27): refactored as a thin provider-routing facade. The
 * three branches in priority order:
 *
 *   1. AWS SES v2 — when EMAIL_PROVIDER=ses AND AWS creds + SES_FROM_EMAIL
 *      are set. Production path. Built-in DKIM signing on the SES domain
 *      identity; cheap; reliable. See src/lib/server/emailProviders/sesProvider.ts.
 *
 *   2. Nodemailer SMTP — when SMTP_USER + SMTP_PASS are set. Local dev
 *      fallback if you want to test against a real SMTP provider. Kept
 *      per S8-Q2 owner decision (Nodemailer stays as fallback, ~200KB
 *      extra in node_modules but trivial).
 *
 *   3. Log-only — no creds at all. Returns mock success with a dev-prefix
 *      messageId. Lets the rest of the app run in dev without hard
 *      dependencies.
 *
 * The sendEmail() signature is unchanged. Zero call-site changes across
 * the codebase — selection happens inside this file based on env vars.
 *
 * Spec: docs/specs/EMAIL-HARDENING-PLAN.md
 * Operator runbook (DNS / AWS setup): docs/runbooks/SEC-8-EMAIL-HARDENING-SETUP.md
 * ══════════════════════════════════════════════════════════════════════
 */

import logger from '$lib/server/logger';
import nodemailer from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } from '$env/static/private';
import { escapeHtml } from '$lib/utils/sanitize';
import { isSesConfigured, sendEmailViaSes } from './emailProviders/sesProvider';
import { filterSuppressedRecipients } from './emailProviders/suppressionList';

/**
 * Sanitize a URL for safe inclusion in an HTML `href` attribute.
 * Rejects `javascript:` / `data:` / other non-http(s) protocols by returning '#'.
 * HTML-entity-escapes the result to block attribute-breakout (e.g. `"><script>`).
 */
function safeHref(url: string): string {
	if (typeof url !== 'string') return '#';
	const trimmed = url.trim();
	if (!/^https?:\/\//i.test(trimmed)) return '#';
	return escapeHtml(trimmed);
}

function createTransporter() {
	const port = parseInt(SMTP_PORT || '587');
	const secure = SMTP_SECURE === 'true' || port === 465;

	return nodemailer.createTransport({
		host: SMTP_HOST || 'smtp.gmail.com',
		port,
		secure,
		auth: {
			user: SMTP_USER,
			pass: SMTP_PASS
		}
	});
}

export interface EmailAttachment {
	filename: string;
	path?: string;
	content?: Buffer | string;
}

export interface EmailOptions {
	to: string | string[];
	subject: string;
	html: string;
	text?: string;
	from?: string;
	replyTo?: string;
	cc?: string[];
	bcc?: string[];
	attachments?: EmailAttachment[];
}

export interface EmailResult {
	success: boolean;
	messageId?: string;
	error?: string;
}

/**
 * Send an email through the configured provider.
 *
 * Provider selection (in priority order):
 *   1. SES if isSesConfigured() — production path post-SEC-8
 *   2. Nodemailer if SMTP_USER + SMTP_PASS present — legacy / local
 *   3. Log-only — dev mode with no creds
 *
 * Same EmailOptions / EmailResult interface as before; call sites unchanged.
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
	try {
		// Validate options
		if (!options.to || !options.subject || !options.html) {
			logger.warn(
				{
					to: options.to,
					subject: options.subject,
					hasHtml: !!options.html
				},
				'Invalid email options'
			);
			return {
				success: false,
				error: 'Missing required fields: to, subject, html'
			};
		}

		// ── Suppression gate (SNS-M2) ──
		// Drop recipients that AWS SES has reported as permanent bounce or
		// complaint via /api/webhook/ses-bounce. Saves SES API quota +
		// gives us per-user observability (admin tool can flip back to
		// 'active' after the user fixes the issue).
		const originalRecipients = Array.isArray(options.to) ? options.to : [options.to];
		const { allowed, dropped } = await filterSuppressedRecipients(originalRecipients);
		if (dropped.length > 0) {
			logger.info(
				{ dropped, allowed_count: allowed.length, subject: options.subject },
				'sendEmail: dropped suppressed recipients'
			);
		}
		if (allowed.length === 0) {
			// All recipients are suppressed — nothing to send. Return failure
			// so the caller knows. Single-recipient calls (the common case)
			// hit this branch when the lone address is suppressed.
			return {
				success: false,
				error: 'all_recipients_suppressed'
			};
		}
		// Replace the to field with the allowed-only list so downstream
		// provider branches send only to non-suppressed recipients.
		const filteredOptions: EmailOptions =
			dropped.length > 0
				? { ...options, to: allowed.length === 1 ? allowed[0] : allowed }
				: options;

		// ── Branch 1: AWS SES (preferred when configured) ──
		if (isSesConfigured()) {
			return await sendEmailViaSes(filteredOptions);
		}

		// ── Branch 2: Nodemailer SMTP (legacy / fallback) ──
		const smtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;
		if (smtpConfigured) {
			const transporter = createTransporter();
			const toArray = Array.isArray(filteredOptions.to)
				? filteredOptions.to
				: [filteredOptions.to];
			const info = await transporter.sendMail({
				from: filteredOptions.from || process.env.SMTP_USER || 'noreply@digitaldsa.com',
				to: toArray.join(', '),
				subject: filteredOptions.subject,
				html: filteredOptions.html,
				...(filteredOptions.text ? { text: filteredOptions.text } : {}),
				...(filteredOptions.replyTo ? { replyTo: filteredOptions.replyTo } : {}),
				...(filteredOptions.cc ? { cc: filteredOptions.cc.join(', ') } : {}),
				...(filteredOptions.bcc ? { bcc: filteredOptions.bcc.join(', ') } : {}),
				...(filteredOptions.attachments ? { attachments: filteredOptions.attachments } : {})
			});

			logger.info(
				{
					provider: 'nodemailer',
					messageId: info.messageId,
					to: toArray,
					subject: filteredOptions.subject
				},
				'Email sent via SMTP'
			);

			return { success: true, messageId: info.messageId };
		}

		// ── Branch 3: log-only fallback (dev mode) ──
		const toArray = Array.isArray(filteredOptions.to)
			? filteredOptions.to
			: [filteredOptions.to];
		const messageId = `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		logger.info(
			{
				provider: 'log-only',
				messageId,
				to: toArray,
				subject: filteredOptions.subject,
				htmlLength: filteredOptions.html.length,
				note: 'Set EMAIL_PROVIDER=ses + AWS creds OR SMTP_USER+SMTP_PASS to send real emails'
			},
			'[DEV MODE] Email logged (no provider configured)'
		);

		return { success: true, messageId };
	} catch (error) {
		logger.error(
			{
				err: error instanceof Error ? error.message : String(error),
				to: options.to,
				subject: options.subject
			},
			'Email send failed'
		);

		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Send OTP via email (used by authentication flows)
 *
 * @param to Email address
 * @param otp One-time password (6 digits)
 * @param type Purpose: 'signup' | 'login' | 'password-reset'
 */
export async function sendOTPEmail(
	to: string,
	otp: string,
	type: 'signup' | 'login' | 'password-reset' = 'login'
): Promise<EmailResult> {
	const subjectMap = {
		signup: 'Verify your DigitalDSA account — OTP',
		login: 'Login verification code',
		'password-reset': 'Reset your DigitalDSA password'
	};

	const messageMap = {
		signup: 'Welcome to DigitalDSA! Your verification code is:',
		login: 'Your login verification code is:',
		'password-reset': 'To reset your password, use this code:'
	};

	const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
          .container { max-width: 500px; margin: 0 auto; padding: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #cb997e; margin-bottom: 20px; }
          .code { font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 30px 0; background: #f5f5f5; padding: 20px; border-radius: 8px; color: #000; }
          .footer { font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">DigitalDSA</div>
          <p>${messageMap[type]}</p>
          <div class="code">${otp}</div>
          <p>This code will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
          <div class="footer">
            <p>&copy; 2026 DigitalDSA. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

	return sendEmail({
		to,
		subject: subjectMap[type],
		html,
		text: `${messageMap[type]} ${otp} (expires in 10 minutes)`
	});
}

/**
 * Send email verification link
 *
 * @param to Email address
 * @param verificationUrl Verification link (should include token)
 */
export async function sendVerificationEmail(
	to: string,
	verificationUrl: string
): Promise<EmailResult> {
	const safeUrl = safeHref(verificationUrl);
	const safeUrlText = escapeHtml(verificationUrl);
	const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
          .container { max-width: 500px; margin: 0 auto; padding: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #cb997e; margin-bottom: 20px; }
          .button { display: inline-block; background: #cb997e; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
          .footer { font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">DigitalDSA</div>
          <p>Click the button below to verify your email:</p>
          <a href="${safeUrl}" class="button">Verify Email</a>
          <p>Or copy this link if the button doesn't work:</p>
          <p><code>${safeUrlText}</code></p>
          <p>This link will expire in 24 hours. If you didn't create this account, please ignore this email.</p>
          <div class="footer">
            <p>&copy; 2026 DigitalDSA. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

	return sendEmail({
		to,
		subject: 'Verify your DigitalDSA email',
		html,
		text: `Verify your email at: ${verificationUrl} (expires in 24 hours)`
	});
}

/**
 * Send password reset email
 *
 * @param to Email address
 * @param resetUrl Password reset link
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<EmailResult> {
	const safeUrl = safeHref(resetUrl);
	const safeUrlText = escapeHtml(resetUrl);
	const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
          .container { max-width: 500px; margin: 0 auto; padding: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #cb997e; margin-bottom: 20px; }
          .button { display: inline-block; background: #cb997e; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
          .warning { background: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 20px 0; }
          .footer { font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">DigitalDSA</div>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <a href="${safeUrl}" class="button">Reset Password</a>
          <p>Or copy this link:</p>
          <p><code>${safeUrlText}</code></p>
          <div class="warning">
            <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
          </div>
          <div class="footer">
            <p>&copy; 2026 DigitalDSA. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

	return sendEmail({
		to,
		subject: 'Reset your DigitalDSA password',
		html,
		text: `Reset your password at: ${resetUrl} (expires in 1 hour)`
	});
}

/**
 * Mask an email address for log output. Matches the redactEmail convention
 * in src/lib/utils/fileConfigurator.ts:537-550 (PDF-export redaction family)
 * — `j*****x@*****.com` shape, first + last char of local part, domain
 * extension only.
 *
 * Kept file-local rather than extracted to a shared utility. fileConfigurator
 * owns a family of redactors (PAN / phone / email) for PDF export; pulling one
 * out for a single call site would be over-engineering — if a third caller
 * appears, that's the right time to extract a shared module (review finding
 * L5, 2026-05-30).
 */
function maskEmailForLog(value: unknown): string {
	const s = String(value ?? '');
	const at = s.indexOf('@');
	if (at <= 0) return 'r*****d@*****.com';
	const local = s.slice(0, at);
	const domain = s.slice(at + 1);
	const dot = domain.lastIndexOf('.');
	const ext = dot > 0 ? domain.slice(dot + 1) : 'com';
	const first = local[0] ?? 'x';
	const last = local.length > 1 ? local[local.length - 1] : first;
	return `${first}*****${last}@*****.${ext}`;
}

// Exported for testing only. Production bounce handling lives in
// /api/webhook/ses-bounce — see src/routes/api/webhook/ses-bounce/+server.ts
// for the canonical SNS-driven flow (signature verification, idempotency,
// per-recipient suppression on DsaApplications + rmApplications). This mask
// stays here as a general PII helper for any future log site that needs to
// emit an email address safely.
export const _maskEmailForLog = maskEmailForLog;

/**
 * Configuration and status — reflects which branch sendEmail will take.
 * Useful for an admin health-check endpoint.
 */
export const emailConfig = {
	get provider(): 'ses' | 'nodemailer' | 'log-only' {
		if (isSesConfigured()) return 'ses';
		if (process.env.SMTP_USER && process.env.SMTP_PASS) return 'nodemailer';
		return 'log-only';
	},
	get isConfigured(): boolean {
		return isSesConfigured() || !!(process.env.SMTP_USER && process.env.SMTP_PASS);
	},
	get isDevelopmentMode(): boolean {
		return !this.isConfigured;
	},
	fromEmail: process.env.SES_FROM_EMAIL || process.env.SMTP_USER || 'noreply@digitaldsa.com',
	region: process.env.AWS_REGION || 'ap-south-1'
};
