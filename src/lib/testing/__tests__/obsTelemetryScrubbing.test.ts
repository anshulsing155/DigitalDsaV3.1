/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: telemetry spans never export PII (user IDs, mobile, PAN, etc.)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * OBS-2 (S103) wires OpenTelemetry traces so production debugging answers
 * "where is time being spent?" with span data. The auto-instrumentation
 * for MongoDB + Undici captures URL query strings, MongoDB filters, and
 * fetch URLs — all of which CAN contain PII in this app (phone numbers
 * in OTP routes, user IDs in MongoDB filters, etc.).
 *
 * `scrubSpanAttributes` walks every span's attributes before export and
 * redacts known PII-bearing keys / URL patterns. This test pins the
 * scrubbing contract so a future change to the PII_ATTR_KEYS set OR an
 * auto-instrumentation that surfaces a new attribute can't silently leak
 * PII to the observability backend.
 *
 * Companion: CLAUDE.md §3 Pitfall #27.
 */

import { describe, it, expect } from 'vitest';
import { scrubSpanAttributes } from '$lib/server/telemetry';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';

// Minimal ReadableSpan stand-in — scrubSpanAttributes only touches `.attributes`,
// so we don't need to fake the full ReadableSpan surface.
function makeSpan(attrs: Record<string, unknown>): ReadableSpan {
	return { attributes: attrs } as unknown as ReadableSpan;
}

describe('scrubSpanAttributes', () => {
	it('redacts user identity attributes', () => {
		const span = makeSpan({
			'user.id': '60a7b3c2f1d2c8001234abcd',
			'user.email': 'dsa@example.com',
			'user.mobileNumber': '9999999999',
			'other.attr': 'safe'
		});
		scrubSpanAttributes(span);
		const attrs = span.attributes as Record<string, unknown>;
		expect(attrs['user.id']).toBe('[REDACTED]');
		expect(attrs['user.email']).toBe('[REDACTED]');
		expect(attrs['user.mobileNumber']).toBe('[REDACTED]');
		expect(attrs['other.attr']).toBe('safe');
	});

	it('redacts auth headers that can carry tokens', () => {
		const span = makeSpan({
			'http.request.header.authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9...',
			'http.request.header.cookie': 'accessToken=secret; refreshToken=secret',
			'http.response.header.set-cookie': 'accessToken=new; HttpOnly'
		});
		scrubSpanAttributes(span);
		const attrs = span.attributes as Record<string, unknown>;
		expect(attrs['http.request.header.authorization']).toBe('[REDACTED]');
		expect(attrs['http.request.header.cookie']).toBe('[REDACTED]');
		expect(attrs['http.response.header.set-cookie']).toBe('[REDACTED]');
	});

	it('redacts MongoDB filter / statement attributes (auto-instrumentation surface)', () => {
		const span = makeSpan({
			'db.statement': '{"mobile":"9999999999"}',
			'db.mongodb.filter': '{"_id":"60a7..."}',
			'db.system': 'mongodb',
			'db.name': 'digitaldsa-prod'
		});
		scrubSpanAttributes(span);
		const attrs = span.attributes as Record<string, unknown>;
		expect(attrs['db.statement']).toBe('[REDACTED]');
		expect(attrs['db.mongodb.filter']).toBe('[REDACTED]');
		// db.system and db.name are NOT PII — useful for grouping by collection
		expect(attrs['db.system']).toBe('mongodb');
		expect(attrs['db.name']).toBe('digitaldsa-prod');
	});

	it('redacts URLs containing OTP / mobile / admin paths', () => {
		const span = makeSpan({
			'http.url': 'https://api.example.com/otp/9999999999/send'
		});
		scrubSpanAttributes(span);
		expect((span.attributes as Record<string, unknown>)['http.url']).toBe('[REDACTED-PII-URL]');
	});

	it('redacts URLs with embedded phone numbers (with or without 91 prefix)', () => {
		const span1 = makeSpan({ 'http.url': 'https://api.example.com/users/9999999999' });
		scrubSpanAttributes(span1);
		expect((span1.attributes as Record<string, unknown>)['http.url']).toBe('[REDACTED-PII-URL]');

		const span2 = makeSpan({ 'url.full': 'https://api.example.com/users/919999999999' });
		scrubSpanAttributes(span2);
		expect((span2.attributes as Record<string, unknown>)['url.full']).toBe('[REDACTED-PII-URL]');
	});

	it('leaves URLs without PII alone (route templates, asset paths)', () => {
		const span = makeSpan({
			'http.url': 'https://api.example.com/api/cases',
			'http.route': '/api/cases/[case_id]',
			'url.path': '/dashboard/dsa'
		});
		scrubSpanAttributes(span);
		const attrs = span.attributes as Record<string, unknown>;
		expect(attrs['http.url']).toBe('https://api.example.com/api/cases');
		expect(attrs['http.route']).toBe('/api/cases/[case_id]');
		expect(attrs['url.path']).toBe('/dashboard/dsa');
	});

	it('redacts application-domain identifiers (case_id, applicant_id, dsa_id, rm_id)', () => {
		const span = makeSpan({
			'app.case_id': 'CASE-2026-001234',
			'app.applicant_id': 'APP-abc-xyz',
			'app.dsa_id': '60a7b3c2f1d2c8001234abcd',
			'app.rm_id': '60a7b3c2f1d2c8001234efgh',
			'app.lender_id': 'hdfc-bank'
		});
		scrubSpanAttributes(span);
		const attrs = span.attributes as Record<string, unknown>;
		expect(attrs['app.case_id']).toBe('[REDACTED]');
		expect(attrs['app.applicant_id']).toBe('[REDACTED]');
		expect(attrs['app.dsa_id']).toBe('[REDACTED]');
		expect(attrs['app.rm_id']).toBe('[REDACTED]');
		// Lender ID is public business data, not PII
		expect(attrs['app.lender_id']).toBe('hdfc-bank');
	});

	it('handles missing / null attributes gracefully', () => {
		// scrubSpanAttributes should never throw on a span with no attributes —
		// some auto-instrumentation paths may emit attribute-less spans.
		const span1 = { attributes: undefined } as unknown as ReadableSpan;
		expect(() => scrubSpanAttributes(span1)).not.toThrow();

		const span2 = makeSpan({});
		expect(() => scrubSpanAttributes(span2)).not.toThrow();
	});
});
