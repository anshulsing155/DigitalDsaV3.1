/**
 * SNS validator — behavioral tests for the SES bounce webhook
 * ══════════════════════════════════════════════════════════════════
 * Locks the core invariants:
 *   - isValidCertHost rejects non-AWS hosts (the primary forgery defense)
 *   - parseSesEvent recognizes Bounce / Complaint / Delivery shapes,
 *     returns null for anything else
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
	isValidCertHost,
	parseSesEvent
} from '$lib/server/emailProviders/snsValidator';

describe('isValidCertHost — cert URL allowlist', () => {
	it('accepts canonical SNS cert hosts (sns.{region}.amazonaws.com)', () => {
		expect(isValidCertHost('https://sns.ap-south-1.amazonaws.com/cert.pem')).toBe(true);
		expect(isValidCertHost('https://sns.us-east-1.amazonaws.com/cert.pem')).toBe(true);
		expect(isValidCertHost('https://sns.eu-west-2.amazonaws.com/cert.pem')).toBe(true);
	});

	it('rejects http (must be https)', () => {
		expect(isValidCertHost('http://sns.ap-south-1.amazonaws.com/cert.pem')).toBe(false);
	});

	it('rejects look-alike domains', () => {
		expect(isValidCertHost('https://sns-ap-south-1.amazonaws.com.evil.com/cert.pem')).toBe(false);
		expect(isValidCertHost('https://amazonaws.com.evil.com/cert.pem')).toBe(false);
		expect(isValidCertHost('https://sns.amazonaws.com/cert.pem')).toBe(false); // no region
		expect(isValidCertHost('https://sns.region.amazonaws.com.attacker.io/cert.pem')).toBe(false);
	});

	it('rejects unparseable URLs', () => {
		expect(isValidCertHost('not a url')).toBe(false);
		expect(isValidCertHost('')).toBe(false);
	});

	it('rejects other AWS services (only sns. prefix is valid)', () => {
		expect(isValidCertHost('https://s3.amazonaws.com/some-cert.pem')).toBe(false);
		expect(isValidCertHost('https://ses.ap-south-1.amazonaws.com/cert.pem')).toBe(false);
	});
});

describe('parseSesEvent — payload recognition', () => {
	it('recognizes Bounce (notificationType)', () => {
		const payload = JSON.stringify({
			notificationType: 'Bounce',
			bounce: {
				bounceType: 'Permanent',
				bounceSubType: 'General',
				bouncedRecipients: [{ emailAddress: 'gone@example.com' }]
			}
		});
		const evt = parseSesEvent(payload);
		expect(evt).not.toBeNull();
		expect(evt?.notificationType).toBe('Bounce');
		expect(evt?.bounce?.bounceType).toBe('Permanent');
	});

	it('recognizes Complaint', () => {
		const payload = JSON.stringify({
			notificationType: 'Complaint',
			complaint: {
				complainedRecipients: [{ emailAddress: 'angry@example.com' }],
				complaintFeedbackType: 'abuse'
			}
		});
		const evt = parseSesEvent(payload);
		expect(evt?.notificationType).toBe('Complaint');
	});

	it('recognizes Delivery (informational)', () => {
		const payload = JSON.stringify({ notificationType: 'Delivery' });
		const evt = parseSesEvent(payload);
		expect(evt?.notificationType).toBe('Delivery');
	});

	it('also accepts the SES "event publishing" eventType field', () => {
		const payload = JSON.stringify({ eventType: 'Bounce' });
		const evt = parseSesEvent(payload);
		expect(evt?.eventType).toBe('Bounce');
	});

	it('returns null for malformed JSON', () => {
		expect(parseSesEvent('not json')).toBeNull();
		expect(parseSesEvent('{broken')).toBeNull();
	});

	it('returns null for JSON with no recognized event type', () => {
		expect(parseSesEvent(JSON.stringify({ someOtherField: 'x' }))).toBeNull();
		expect(parseSesEvent('{}')).toBeNull();
	});
});
