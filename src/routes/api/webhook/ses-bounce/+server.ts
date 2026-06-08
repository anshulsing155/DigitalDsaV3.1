/**
 * POST /api/webhook/ses-bounce
 * ══════════════════════════════════════════════════════════════════
 * SNS HTTPS endpoint that receives SES Bounce + Complaint + Delivery
 * notifications. Updates `email_status` on DsaApplications +
 * rmApplications matching the bounced/complained address so the
 * sendEmail() guard skips future sends to that recipient.
 *
 * AUTH: SNS signature verification (verifySnsSignature) + TopicArn
 * match against env.SES_BOUNCE_TOPIC_ARN. CSRF is skipped at the
 * hooks.server.ts /api/webhook/ prefix; that is intentional — third-
 * party providers cannot present our CSRF token.
 *
 * IDEMPOTENCY: SNS may redeliver. The ProcessedWebhookEvents
 * collection's `_id`-based insertOne dedup pattern (used by the
 * Razorpay webhook) is reused here, keyed on SNS MessageId.
 *
 * SUBSCRIPTION CONFIRMATION (one-time handshake): when AWS first
 * subscribes our endpoint to the topic, it POSTs a SubscriptionConfirmation
 * message with a SubscribeURL. We GET that URL to confirm. Must be done
 * AFTER signature verification so a forged confirmation can't trick
 * us into subscribing to an attacker-controlled topic.
 *
 * Operator wiring:
 *   1. AWS Console → SES → Configuration Sets → create a set, add
 *      an "SNS destination" event handler emitting Bounce + Complaint
 *   2. AWS Console → SNS → create topic, set HTTPS subscription
 *      pointing at https://www.rinn.in/api/webhook/ses-bounce
 *   3. Vercel env: SES_BOUNCE_TOPIC_ARN = the topic's ARN
 *   4. Bring up sendEmail with the Configuration Set name in
 *      SES_CONFIGURATION_SET so SES routes events through the set
 *
 * Today's safeguard while this is being wired: SES account-level
 * suppression list catches permanent bounces server-side at AWS.
 * This webhook adds OUR-side per-user suppression for observability
 * + recovery UX (admin tool can flip email_status back to 'active'
 * after the underlying issue is fixed).
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §11 R15 (SEC-8 territory)
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiOk, apiServerError } from '$lib/server/apiResponse';
import logger from '$lib/server/logger';
import { env } from '$env/dynamic/private';
import { DsaApplications, rmApplications, ProcessedWebhookEvents } from '$lib/database/mongo';
import {
	verifySnsSignature,
	confirmSnsSubscription,
	parseSesEvent,
	type SnsMessage
} from '$lib/server/emailProviders/snsValidator';

const EXPECTED_TOPIC_ARN = env.SES_BOUNCE_TOPIC_ARN || '';

export const POST: RequestHandler = async ({ request }) => {
	let msg: SnsMessage;
	try {
		// SNS sends content-type: text/plain (it's a JSON body but with
		// a text mime type per AWS spec). Always parse the raw body.
		const raw = await request.text();
		msg = JSON.parse(raw) as SnsMessage;
	} catch (err) {
		logger.warn(
			{ err: (err as Error).message },
			'ses-bounce webhook: malformed JSON body'
		);
		// 400 — body wasn't even JSON. Not an SNS message we can act on.
		return new Response('Bad Request', { status: 400 });
	}

	// ── 1. TopicArn allowlist ──
	if (!EXPECTED_TOPIC_ARN) {
		logger.error(
			{},
			'ses-bounce webhook: SES_BOUNCE_TOPIC_ARN env var not set — refusing to process'
		);
		// 503 — config is missing. Don't 200 here; that would lie to AWS.
		return new Response('Not configured', { status: 503 });
	}
	if (msg.TopicArn !== EXPECTED_TOPIC_ARN) {
		logger.warn(
			{ received: msg.TopicArn, expected: EXPECTED_TOPIC_ARN },
			'ses-bounce webhook: TopicArn mismatch — rejecting'
		);
		// 403 — caller is on the right URL but wrong topic. Refuse.
		return new Response('Forbidden', { status: 403 });
	}

	// ── 2. Signature verification ──
	const sigOk = await verifySnsSignature(msg);
	if (!sigOk) {
		// 401 — message signature didn't verify. Could be forged or
		// could be a transient cert-fetch failure; either way we refuse.
		return new Response('Unauthorized', { status: 401 });
	}

	// ── 3. Idempotency dedup ──
	// SNS may redeliver the same MessageId; reuse the ProcessedWebhookEvents
	// pattern (atomic insertOne on _id; duplicate-key = already processed).
	const eventId = `sns:${msg.MessageId}`;
	try {
		await ProcessedWebhookEvents.insertOne({
			_id: eventId,
			processed_at: new Date()
		} as unknown as { _id: string; processed_at: Date });
	} catch (err) {
		const e = err as { code?: number };
		if (e.code === 11000) {
			logger.info(
				{ messageId: msg.MessageId },
				'ses-bounce webhook: duplicate SNS delivery — already processed, 200 no-op'
			);
			return apiOk({ duplicate: true, messageId: msg.MessageId });
		}
		throw err;
	}

	// ── 4. SubscriptionConfirmation handshake ──
	if (msg.Type === 'SubscriptionConfirmation') {
		const confirmed = await confirmSnsSubscription(msg.SubscribeURL ?? '');
		logger.info(
			{ topic: msg.TopicArn, confirmed },
			'ses-bounce webhook: SubscriptionConfirmation handled'
		);
		return apiOk({ subscription_confirmed: confirmed });
	}

	// ── 5. Notification — parse SES event + suppress recipients ──
	if (msg.Type !== 'Notification') {
		logger.info(
			{ type: msg.Type, messageId: msg.MessageId },
			'ses-bounce webhook: ignoring non-Notification message'
		);
		return apiOk({ ignored: true });
	}

	const sesEvent = parseSesEvent(msg.Message);
	if (!sesEvent) {
		logger.warn(
			{ messageId: msg.MessageId },
			'ses-bounce webhook: SES event payload not recognized — skipping'
		);
		return apiOk({ ignored: true, reason: 'unrecognized_payload' });
	}

	const kind = sesEvent.notificationType ?? sesEvent.eventType;

	// Delivery events are informational only; we don't store them.
	// (Future enhancement: track delivery success rate per recipient.)
	if (kind === 'Delivery') {
		return apiOk({ event: 'Delivery', stored: false });
	}

	try {
		let suppressed = 0;

		if (kind === 'Bounce' && sesEvent.bounce) {
			// Only Permanent bounces flip suppression. Transient bounces
			// retry naturally — flagging them would lose legitimate users
			// who fixed a temporary mailbox-full situation.
			if (sesEvent.bounce.bounceType === 'Permanent') {
				const emails = sesEvent.bounce.bouncedRecipients
					.map((r) => r.emailAddress?.toLowerCase().trim())
					.filter(Boolean);
				suppressed = await markSuppressed(emails, 'suppressed_bounce');
			}
		}

		if (kind === 'Complaint' && sesEvent.complaint) {
			// Every Complaint is a hard signal regardless of feedback type —
			// the user clicked "this is spam" or similar. Suppress.
			const emails = sesEvent.complaint.complainedRecipients
				.map((r) => r.emailAddress?.toLowerCase().trim())
				.filter(Boolean);
			suppressed = await markSuppressed(emails, 'suppressed_complaint');
		}

		logger.info(
			{ kind, suppressed, messageId: msg.MessageId },
			'ses-bounce webhook: processed event'
		);
		return apiOk({ event: kind, suppressed });
	} catch (err) {
		return apiServerError(err, 'ses-bounce webhook failed');
	}
};

/**
 * Update DSA + RM records whose email matches the bounced/complained
 * address. Updates BOTH collections in case the same email is used
 * across roles (rare but possible). Returns total rows touched.
 */
async function markSuppressed(
	emails: string[],
	status: 'suppressed_bounce' | 'suppressed_complaint'
): Promise<number> {
	if (emails.length === 0) return 0;
	const now = new Date();
	// Mongo's case-insensitive update would need a collation per query;
	// we lowercase the email at this layer so a simple $in works. The
	// snsValidator parsing already lowercased the bounced address.
	const dsaResult = await DsaApplications.updateMany(
		{ email: { $in: emails } },
		{ $set: { email_status: status, email_suppressed_at: now } }
	);
	const rmResult = await rmApplications.updateMany(
		{ email: { $in: emails } },
		{ $set: { email_status: status, email_suppressed_at: now } }
	);
	return (dsaResult.modifiedCount ?? 0) + (rmResult.modifiedCount ?? 0);
}
