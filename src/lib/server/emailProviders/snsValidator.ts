/**
 * AWS SNS message signature verifier
 * ══════════════════════════════════════════════════════════════════
 * Validates that an incoming SNS POST really came from AWS. Without
 * this check, anyone who knows our webhook URL could POST a fake
 * "permanent bounce" against any DSA's email and suppress their
 * inbox — silent denial-of-service against our notification funnel.
 *
 * AWS SNS signs every message with the topic owner's private key and
 * publishes the matching cert at SigningCertURL. We:
 *
 *   1. Validate SigningCertURL is on amazonaws.com (so we never fetch
 *      a cert from an attacker-controlled host)
 *   2. Build the canonical string AWS specifies (different field set
 *      for Notification vs SubscriptionConfirmation)
 *   3. Fetch the cert (cached per URL — certs rotate but URLs change
 *      with them, so URL is a stable cache key)
 *   4. Verify the base64 Signature against the canonical string using
 *      RSA-SHA1 (SignatureVersion 1) or RSA-SHA256 (v2)
 *
 * References:
 *   https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
 *
 * We do NOT use a third-party library — the spec is small (~80 LOC),
 * pinning the algorithm here means we know exactly what we trust.
 * ══════════════════════════════════════════════════════════════════
 */

import { createVerify, createPublicKey, type KeyObject } from 'node:crypto';
import logger from '$lib/server/logger';

export type SnsMessageType =
	| 'SubscriptionConfirmation'
	| 'Notification'
	| 'UnsubscribeConfirmation';

/** Minimal shape of the JSON body AWS POSTs. */
export interface SnsMessage {
	Type: SnsMessageType;
	MessageId: string;
	TopicArn: string;
	Subject?: string;
	Message: string;
	Timestamp: string;
	SignatureVersion: '1' | '2';
	Signature: string;
	SigningCertURL: string;
	UnsubscribeURL?: string;
	SubscribeURL?: string; // present on SubscriptionConfirmation
	Token?: string; // present on SubscriptionConfirmation
}

/**
 * In-memory cert cache. Certs rotate infrequently (~monthly) and the
 * URL changes when they rotate, so URL → public key is a stable mapping.
 * Cache lives for the process lifetime — Vercel's serverless functions
 * are short-lived enough that we don't need TTL eviction.
 */
const certCache = new Map<string, KeyObject>();

/**
 * Fetch + cache the SNS signing certificate as a node:crypto KeyObject.
 * The URL MUST be on amazonaws.com (validated by the caller before this
 * runs) — if AWS ever changes the cert URL pattern, the validation
 * needs explicit updating, not silent relaxation.
 */
async function fetchCert(certUrl: string): Promise<KeyObject> {
	const cached = certCache.get(certUrl);
	if (cached) return cached;

	const res = await fetch(certUrl);
	if (!res.ok) {
		throw new Error(`SNS cert fetch failed: HTTP ${res.status} for ${certUrl}`);
	}
	const pem = await res.text();
	const key = createPublicKey(pem);
	certCache.set(certUrl, key);
	return key;
}

/**
 * AWS-prescribed canonical string for Notification messages. Newline-
 * separated `Key\nValue\n` pairs in ASCII byte order of the keys.
 * The Subject line is OMITTED entirely (not "Subject\n\n") when the
 * field is absent — this is a real gotcha.
 */
function canonicalStringForNotification(msg: SnsMessage): string {
	const parts: string[] = ['Message', msg.Message, 'MessageId', msg.MessageId];
	if (msg.Subject !== undefined) parts.push('Subject', msg.Subject);
	parts.push('Timestamp', msg.Timestamp);
	parts.push('TopicArn', msg.TopicArn);
	parts.push('Type', msg.Type);
	return parts.join('\n') + '\n';
}

/**
 * AWS-prescribed canonical string for SubscriptionConfirmation +
 * UnsubscribeConfirmation. Different field set than Notification.
 */
function canonicalStringForSubscription(msg: SnsMessage): string {
	if (!msg.Token || !msg.SubscribeURL) {
		throw new Error('SubscriptionConfirmation missing Token or SubscribeURL');
	}
	return (
		'Message\n' + msg.Message + '\n' +
		'MessageId\n' + msg.MessageId + '\n' +
		'SubscribeURL\n' + msg.SubscribeURL + '\n' +
		'Timestamp\n' + msg.Timestamp + '\n' +
		'Token\n' + msg.Token + '\n' +
		'TopicArn\n' + msg.TopicArn + '\n' +
		'Type\n' + msg.Type + '\n'
	);
}

/**
 * Validate the SigningCertURL host. AWS publishes certs on subdomains
 * of amazonaws.com — specifically sns.<region>.amazonaws.com. Reject
 * anything else outright (lookalike domain, attacker-hosted cert).
 */
export function isValidCertHost(certUrl: string): boolean {
	let url: URL;
	try {
		url = new URL(certUrl);
	} catch {
		return false;
	}
	if (url.protocol !== 'https:') return false;
	// Match sns.{region}.amazonaws.com — region is alphanumeric + hyphens.
	return /^sns\.[a-z0-9-]+\.amazonaws\.com$/i.test(url.hostname);
}

/**
 * Verify an SNS message's signature against the SigningCertURL key.
 * Returns true if valid; false (with logger.warn) on any failure.
 * Never throws on signature-verification path — log + return false
 * so the caller can 401 cleanly.
 */
export async function verifySnsSignature(msg: SnsMessage): Promise<boolean> {
	try {
		if (!isValidCertHost(msg.SigningCertURL)) {
			logger.warn(
				{ certUrl: msg.SigningCertURL, topic: msg.TopicArn },
				'SNS: SigningCertURL is not a valid AWS host'
			);
			return false;
		}

		const algorithm = msg.SignatureVersion === '2' ? 'RSA-SHA256' : 'RSA-SHA1';
		const canonical =
			msg.Type === 'Notification'
				? canonicalStringForNotification(msg)
				: canonicalStringForSubscription(msg);

		const key = await fetchCert(msg.SigningCertURL);
		const verifier = createVerify(algorithm);
		verifier.update(canonical, 'utf8');
		const valid = verifier.verify(key, msg.Signature, 'base64');

		if (!valid) {
			logger.warn(
				{
					topic: msg.TopicArn,
					messageId: msg.MessageId,
					signatureVersion: msg.SignatureVersion
				},
				'SNS: signature verification failed'
			);
		}
		return valid;
	} catch (err) {
		logger.error(
			{ err: (err as Error).message, topic: msg.TopicArn },
			'SNS: signature verification threw'
		);
		return false;
	}
}

/**
 * Confirm an SNS subscription by GETting its SubscribeURL. AWS requires
 * this one-time handshake before notifications start flowing. Same host
 * validation as the cert fetch — reject non-amazonaws URLs.
 */
export async function confirmSnsSubscription(subscribeUrl: string): Promise<boolean> {
	try {
		const url = new URL(subscribeUrl);
		if (url.protocol !== 'https:') return false;
		if (!/^sns\.[a-z0-9-]+\.amazonaws\.com$/i.test(url.hostname)) {
			logger.warn(
				{ host: url.hostname },
				'SNS: SubscribeURL host is not a valid AWS endpoint'
			);
			return false;
		}
		const res = await fetch(subscribeUrl);
		if (!res.ok) {
			logger.warn(
				{ status: res.status },
				'SNS: SubscribeURL GET failed — subscription not confirmed'
			);
			return false;
		}
		return true;
	} catch (err) {
		logger.error(
			{ err: (err as Error).message },
			'SNS: SubscribeURL confirmation threw'
		);
		return false;
	}
}

// ── SES event payload shape (Message field, parsed JSON) ─────────

/** Top-level SES notification we care about. */
export interface SesEvent {
	notificationType?: 'Bounce' | 'Complaint' | 'Delivery';
	eventType?: 'Bounce' | 'Complaint' | 'Delivery'; // SES "event publishing" vs "notification" formats differ
	bounce?: {
		bounceType: 'Permanent' | 'Transient' | 'Undetermined';
		bounceSubType: string;
		bouncedRecipients: Array<{ emailAddress: string }>;
		timestamp?: string;
	};
	complaint?: {
		complainedRecipients: Array<{ emailAddress: string }>;
		complaintFeedbackType?: string;
		timestamp?: string;
	};
}

/**
 * Parse the SES JSON payload from the SNS Message field (which is a
 * STRING containing JSON, not a nested object). Returns null when the
 * payload isn't JSON or doesn't have a recognized event type.
 */
export function parseSesEvent(messageStr: string): SesEvent | null {
	try {
		const parsed = JSON.parse(messageStr) as SesEvent;
		const kind = parsed.notificationType ?? parsed.eventType;
		if (kind !== 'Bounce' && kind !== 'Complaint' && kind !== 'Delivery') return null;
		return parsed;
	} catch {
		return null;
	}
}
