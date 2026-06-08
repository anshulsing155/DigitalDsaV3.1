/**
 * F.3 — UTM attribution helpers
 * ══════════════════════════════════════════════════════════════════
 * Pure functions — no DB, no cookies; tests verify the parse + round-trip.
 *
 * Critical contracts:
 *   - parseUtmFromUrl returns null when NO utm_* params (organic visit)
 *   - All 5 UTM params + landing_page captured when present
 *   - parseFromCookie is defensive (returns null on malformed input,
 *     never throws — cookies are client-mutable)
 *   - parseFromCookie applies an allow-list (length-bounded strings
 *     only) so a hostile cookie can't smuggle in extra fields
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
	parseUtmFromUrl,
	serializeForCookie,
	parseFromCookie,
	UTM_COOKIE_NAME,
	UTM_COOKIE_MAX_AGE_SECONDS,
	type UtmAttribution
} from '$lib/server/attribution/utm';

const FIXED_NOW = new Date('2026-06-15T12:00:00.000Z');

describe('parseUtmFromUrl', () => {
	it('returns null for an organic visit (no UTM params)', () => {
		const url = new URL('https://www.rinn.in/');
		expect(parseUtmFromUrl(url, FIXED_NOW)).toBeNull();
	});

	it('returns null even with other non-UTM query params', () => {
		const url = new URL('https://www.rinn.in/?ref=somecode&utm_irrelevant=x');
		expect(parseUtmFromUrl(url, FIXED_NOW)).toBeNull();
	});

	it('captures all 5 UTM params + landing_page when present', () => {
		const url = new URL(
			'https://www.rinn.in/welcome-hdfc?utm_source=fb&utm_medium=paid&utm_campaign=festive2026&utm_content=carousel&utm_term=home_loan'
		);
		const result = parseUtmFromUrl(url, FIXED_NOW);
		expect(result).toEqual({
			utm_source: 'fb',
			utm_medium: 'paid',
			utm_campaign: 'festive2026',
			utm_content: 'carousel',
			utm_term: 'home_loan',
			landing_page: '/welcome-hdfc',
			first_seen_at: FIXED_NOW.toISOString()
		});
	});

	it('captures partial UTM (just source) — still attribution', () => {
		const url = new URL('https://www.rinn.in/?utm_source=organic_referral');
		const result = parseUtmFromUrl(url, FIXED_NOW);
		expect(result?.utm_source).toBe('organic_referral');
		expect(result?.utm_medium).toBeUndefined();
		expect(result?.landing_page).toBe('/');
	});

	it('clips UTM param values to 200 chars (defense)', () => {
		const huge = 'x'.repeat(500);
		const url = new URL(`https://www.rinn.in/?utm_source=${huge}`);
		const result = parseUtmFromUrl(url, FIXED_NOW);
		expect(result?.utm_source?.length).toBe(200);
	});

	it('clips landing_page to 500 chars', () => {
		const longPath = '/' + 'a'.repeat(800);
		const url = new URL(`https://www.rinn.in${longPath}?utm_source=fb`);
		const result = parseUtmFromUrl(url, FIXED_NOW);
		expect(result?.landing_page?.length).toBe(500);
	});
});

describe('serializeForCookie / parseFromCookie — round-trip', () => {
	it('round-trips a full attribution', () => {
		const attr: UtmAttribution = {
			utm_source: 'fb',
			utm_medium: 'paid',
			utm_campaign: 'festive2026',
			utm_content: 'carousel',
			utm_term: 'home_loan',
			landing_page: '/welcome-hdfc',
			first_seen_at: '2026-06-15T12:00:00.000Z'
		};
		const cookie = serializeForCookie(attr);
		expect(parseFromCookie(cookie)).toEqual(attr);
	});

	it('round-trips a partial attribution (only source + landing)', () => {
		const attr: UtmAttribution = {
			utm_source: 'organic',
			landing_page: '/',
			first_seen_at: '2026-06-15T12:00:00.000Z'
		};
		const cookie = serializeForCookie(attr);
		expect(parseFromCookie(cookie)).toEqual(attr);
	});

	it('serialized cookie omits undefined fields (compact)', () => {
		const attr: UtmAttribution = {
			utm_source: 'fb',
			first_seen_at: '2026-06-15T12:00:00.000Z'
		};
		const cookie = serializeForCookie(attr);
		expect(cookie).not.toContain('undefined');
		expect(cookie).not.toContain('utm_medium');
	});
});

describe('parseFromCookie — defensive', () => {
	it('returns null on undefined / empty', () => {
		expect(parseFromCookie(undefined)).toBeNull();
		expect(parseFromCookie('')).toBeNull();
	});

	it('returns null on non-JSON garbage', () => {
		expect(parseFromCookie('not-json')).toBeNull();
	});

	it('returns null on JSON that is not an object', () => {
		expect(parseFromCookie('"a string"')).toBeNull();
		expect(parseFromCookie('42')).toBeNull();
		expect(parseFromCookie('null')).toBeNull();
	});

	it('returns null when first_seen_at is missing or not a string', () => {
		expect(parseFromCookie('{}')).toBeNull();
		expect(parseFromCookie('{"first_seen_at": 42}')).toBeNull();
	});

	it('ignores unknown fields (allow-list scrub) — prevents cookie smuggle', () => {
		const malicious = JSON.stringify({
			first_seen_at: '2026-06-15T12:00:00.000Z',
			utm_source: 'fb',
			__proto__: { isAdmin: true },
			role: 'admin',
			'extra-field': 'should-not-appear'
		});
		const result = parseFromCookie(malicious);
		expect(result).toEqual({
			first_seen_at: '2026-06-15T12:00:00.000Z',
			utm_source: 'fb'
		});
		// Confirm no proto pollution leaked
		expect((result as unknown as { role?: string }).role).toBeUndefined();
	});

	it('rejects overly-long string values (>500 chars)', () => {
		const malicious = JSON.stringify({
			first_seen_at: '2026-06-15T12:00:00.000Z',
			utm_source: 'x'.repeat(1000)
		});
		const result = parseFromCookie(malicious);
		expect(result?.utm_source).toBeUndefined();
	});
});

describe('Cookie constants — locked', () => {
	it('UTM_COOKIE_NAME is dsa_attribution', () => {
		expect(UTM_COOKIE_NAME).toBe('dsa_attribution');
	});

	it('UTM_COOKIE_MAX_AGE_SECONDS is 30 days', () => {
		expect(UTM_COOKIE_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
	});
});
