/**
 * AWS SES v2 email provider (SEC-8)
 * ══════════════════════════════════════════════════════════════════════
 * Production-grade email delivery via AWS Simple Email Service v2.
 *
 * Why SES over the existing Nodemailer SMTP:
 *   - Built-in DKIM signing on the domain identity (vs none from generic SMTP)
 *   - 99.99% uptime SLA; warm sender reputation managed by AWS
 *   - Cheap (~$0.10 / 1000 emails)
 *   - First-class bounce / complaint tracking via SNS (future SEC-8 phase 2)
 *   - Removes the need to keep SMTP creds in .env (which were leaked in
 *     19 commits per CLAUDE.md §8 production blocker #1)
 *
 * Region: ap-south-1 (Mumbai) per owner decision 2026-05-27 — co-located
 * with the user base for lowest latency. AWS_REGION env var overrides.
 *
 * Backward compat: this provider is INVOKED FROM email.ts as one of three
 * branches (SES → Nodemailer → log-only). Call sites continue to use the
 * existing sendEmail() facade with the same EmailOptions/EmailResult
 * interface — no churn anywhere else.
 *
 * Spec: docs/specs/EMAIL-HARDENING-PLAN.md
 * ══════════════════════════════════════════════════════════════════════
 */

import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { env } from '$env/dynamic/private';
import logger from '$lib/server/logger';
import type { EmailOptions, EmailResult } from '../email';

/**
 * Lazily-constructed SES client. Cached at module scope so we reuse the
 * connection pool across calls. Returns null if AWS env is incomplete —
 * caller (email.ts) decides whether to fall back to Nodemailer or log-only.
 */
let cachedClient: SESv2Client | null = null;

function getSesClient(): SESv2Client | null {
	if (cachedClient) return cachedClient;

	const region = env.AWS_REGION || 'ap-south-1';
	const accessKeyId = env.AWS_ACCESS_KEY_ID;
	const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;

	if (!accessKeyId || !secretAccessKey) {
		return null;
	}

	cachedClient = new SESv2Client({
		region,
		credentials: { accessKeyId, secretAccessKey }
	});
	return cachedClient;
}

/**
 * Test-only escape hatch: reset the cached client so a test setting env
 * vars before calling sendEmailViaSes gets a fresh client with the new creds.
 * Not exported in production builds (no functional impact).
 */
export function _resetSesClientForTests(): void {
	cachedClient = null;
}

/**
 * Indicates whether SES is properly configured. Used by the email.ts
 * facade to decide between SES, Nodemailer, and log-only paths.
 *
 * Conditions:
 *   - EMAIL_PROVIDER=ses (operator opt-in; opt-in to avoid unexpectedly
 *     billing AWS during dev)
 *   - AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY present
 *   - SES_FROM_EMAIL present (the verified-domain From address)
 */
export function isSesConfigured(): boolean {
	const providerOptIn = (env.EMAIL_PROVIDER || '').toLowerCase() === 'ses';
	const hasCreds = !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);
	const hasFrom = !!env.SES_FROM_EMAIL;
	return providerOptIn && hasCreds && hasFrom;
}

/**
 * Send a single email via SES v2 SendEmailCommand.
 *
 * Notes on the SES v2 API shape:
 *   - Destination accepts ToAddresses / CcAddresses / BccAddresses arrays
 *   - Content.Simple accepts Subject + Body.{Text,Html} as Content objects
 *     with `Data` and optional `Charset` (default UTF-8)
 *   - FromEmailAddress must be a verified identity (domain or address)
 *   - ReplyToAddresses is optional and accepts an array
 *
 * Error handling: any SDK error is logged + returned as EmailResult with
 * success=false. The caller (sendEmail in email.ts) decides whether to
 * retry, fall through to another provider, or surface to the user.
 *
 * Attachments: SES v2 SimpleContent does NOT support attachments. For the
 * v1 launch our outbound emails (OTP, verification, recovery, dunning) are
 * all attachment-free. If we ever need attachments we'll need to switch to
 * SES v2's Raw content (MIME-encode ourselves) OR keep Nodemailer for that
 * specific path. Documented + accepted scope limit for v1.
 */
export async function sendEmailViaSes(options: EmailOptions): Promise<EmailResult> {
	const client = getSesClient();
	if (!client) {
		return {
			success: false,
			error: 'SES client not initialized (missing AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY)'
		};
	}

	const fromAddress = options.from || env.SES_FROM_EMAIL || 'noreply@digitaldsa.com';
	const toArray = Array.isArray(options.to) ? options.to : [options.to];

	if (options.attachments && options.attachments.length > 0) {
		logger.warn(
			{ to: toArray, subject: options.subject, attachmentCount: options.attachments.length },
			'sesProvider: attachments not supported on SES v2 SimpleContent path — dropping. ' +
				'If this matters, switch to RawContent or use Nodemailer for this call.'
		);
	}

	// Configuration set (optional, env-var-gated). When SES_CONFIGURATION_SET
	// is set in the environment, every send is tagged with that config set
	// name. SES then routes bounce + complaint + delivery events for the
	// send through whatever event destinations the set has wired (SNS topic
	// in our case; see /api/webhook/ses-bounce). Without this, only sends
	// that explicitly select the config set (e.g. SES console "Send test
	// email") generate events — so production traffic would bypass our
	// suppression-list pipeline. SES_BOUNCE_TOPIC_ARN env var should be
	// set in parallel so the webhook can validate the inbound TopicArn.
	const configurationSetName = env.SES_CONFIGURATION_SET;

	const command = new SendEmailCommand({
		FromEmailAddress: fromAddress,
		Destination: {
			ToAddresses: toArray,
			...(options.cc && options.cc.length > 0 ? { CcAddresses: options.cc } : {}),
			...(options.bcc && options.bcc.length > 0 ? { BccAddresses: options.bcc } : {})
		},
		...(options.replyTo ? { ReplyToAddresses: [options.replyTo] } : {}),
		...(configurationSetName ? { ConfigurationSetName: configurationSetName } : {}),
		Content: {
			Simple: {
				Subject: { Data: options.subject, Charset: 'UTF-8' },
				Body: {
					Html: { Data: options.html, Charset: 'UTF-8' },
					...(options.text ? { Text: { Data: options.text, Charset: 'UTF-8' } } : {})
				}
			}
		}
	});

	try {
		const response = await client.send(command);
		const messageId = response.MessageId ?? `ses-${Date.now()}`;
		logger.info(
			{
				provider: 'ses',
				messageId,
				to: toArray,
				subject: options.subject
			},
			'Email sent via SES'
		);
		return { success: true, messageId };
	} catch (err) {
		const e = err as { name?: string; message?: string };
		logger.error(
			{
				provider: 'ses',
				err: e.message,
				errType: e.name,
				to: toArray,
				subject: options.subject
			},
			'sesProvider: SendEmailCommand failed'
		);
		return {
			success: false,
			error: e.message ?? 'Unknown SES error'
		};
	}
}
