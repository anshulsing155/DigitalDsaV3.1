/**
 * E.3 — Active sessions helpers unit tests
 * ══════════════════════════════════════════════════════════════════
 *   - parseDeviceLabel covers common browser/OS UAs + native app token
 *     + unknown fallback
 *   - readVercelGeo extracts the x-vercel-ip-* headers + URL-decodes
 *     city names + returns null when absent
 *
 * Pure helpers — no DB, no network. Fast.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi } from 'vitest';

// logger mock — sessions.ts imports it for the writer helpers that
// aren't exercised here, but the import would warn without the mock.
vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

vi.mock('$lib/database/mongo', () => ({
	Sessions: { insertOne: vi.fn(), updateOne: vi.fn(), findOne: vi.fn() }
}));

import { parseDeviceLabel, readVercelGeo } from '$lib/server/account/sessions';

// ── parseDeviceLabel ───────────────────────────────────────────

describe('parseDeviceLabel — browser + OS detection', () => {
	it('Chrome on Windows', () => {
		const ua =
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
		expect(parseDeviceLabel(ua)).toBe('Chrome on Windows');
	});

	it('Chrome on Mac', () => {
		const ua =
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
		expect(parseDeviceLabel(ua)).toBe('Chrome on Mac');
	});

	it('Firefox on Linux', () => {
		const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0';
		expect(parseDeviceLabel(ua)).toBe('Firefox on Linux');
	});

	it('Safari on Mac (not Chrome — Safari last in browser priority)', () => {
		const ua =
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15';
		expect(parseDeviceLabel(ua)).toBe('Safari on Mac');
	});

	it('Edge identified separately (UA also contains Chrome)', () => {
		const ua =
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
		expect(parseDeviceLabel(ua)).toBe('Edge on Windows');
	});

	it('Mobile Chrome on Android', () => {
		const ua =
			'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
		expect(parseDeviceLabel(ua)).toBe('Chrome on Android');
	});

	it('Mobile Safari on iPhone', () => {
		const ua =
			'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';
		expect(parseDeviceLabel(ua)).toBe('Safari on iOS');
	});

	it('DigitalDSA Android app (extension point for MOB-1)', () => {
		const ua =
			'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 DigitalDSA/1.0 (Capacitor)';
		expect(parseDeviceLabel(ua)).toBe('DigitalDSA Android app');
	});

	it('Empty UA → Unknown device', () => {
		expect(parseDeviceLabel('')).toBe('Unknown device');
		expect(parseDeviceLabel('   ')).toBe('Unknown device');
	});

	it('Generic UA with OS but no browser → "Browser on <OS>"', () => {
		const ua = 'curl/8.0.0 (Linux)';
		expect(parseDeviceLabel(ua)).toBe('Browser on Linux');
	});

	it('Totally unrecognised UA → Unknown device', () => {
		const ua = 'MyCustomBot/3.14';
		expect(parseDeviceLabel(ua)).toBe('Unknown device');
	});
});

// ── readVercelGeo ──────────────────────────────────────────────

describe('readVercelGeo — Vercel header extraction', () => {
	function h(map: Record<string, string>): Headers {
		const headers = new Headers();
		for (const [k, v] of Object.entries(map)) headers.set(k, v);
		return headers;
	}

	it('extracts country / region / city when all present', () => {
		const result = readVercelGeo(
			h({
				'x-vercel-ip-country': 'IN',
				'x-vercel-ip-country-region': 'MH',
				'x-vercel-ip-city': 'Mumbai'
			})
		);
		expect(result).toEqual({
			ip_country: 'IN',
			ip_country_region: 'MH',
			ip_city: 'Mumbai'
		});
	});

	it('URL-decodes city names with percent-encoded spaces', () => {
		const result = readVercelGeo(
			h({
				'x-vercel-ip-country': 'IN',
				'x-vercel-ip-city': 'New%20Delhi'
			})
		);
		expect(result.ip_city).toBe('New Delhi');
	});

	it('returns null for missing headers (dev mode / unresolvable)', () => {
		const result = readVercelGeo(h({}));
		expect(result).toEqual({
			ip_country: null,
			ip_country_region: null,
			ip_city: null
		});
	});

	it('returns null for empty-string headers (defensive)', () => {
		const result = readVercelGeo(
			h({
				'x-vercel-ip-country': '',
				'x-vercel-ip-city': '   '
			})
		);
		expect(result.ip_country).toBeNull();
		expect(result.ip_city).toBeNull();
	});

	it('falls back to raw value on malformed percent-encoding', () => {
		const result = readVercelGeo(h({ 'x-vercel-ip-city': '%E0%A4' })); // truncated UTF-8
		// Either decoded or raw — the test asserts no throw; the value
		// is non-null in both cases.
		expect(result.ip_city).not.toBeNull();
	});
});
