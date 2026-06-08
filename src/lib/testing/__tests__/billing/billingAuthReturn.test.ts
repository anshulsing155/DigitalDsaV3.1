/**
 * D.1 S2.5 — Capacitor auth-return bridge helper tests
 * ══════════════════════════════════════════════════════════════════
 * Tests for the pure helpers: buildAuthReturnUrl + parseAuthReturnUrl.
 * The Capacitor-runtime functions (openAuthorizationUrl, onAuthReturn,
 * isCapacitorAndroid) need an actual Capacitor environment + are
 * exercised by the smoke runbook on an Android emulator. Unit tests
 * here cover the parsing + URL-building logic that drives both.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, expect, it } from 'vitest';
import {
	APP_URL_SCHEME,
	AUTH_RETURN_PATH,
	buildAuthReturnUrl,
	parseAuthReturnUrl
} from '$lib/utils/billingAuthReturn';

// ── Constants ──────────────────────────────────────────────────

describe('billingAuthReturn — constants', () => {
	it('APP_URL_SCHEME is "digitaldsa" (matches AndroidManifest intent-filter)', () => {
		expect(APP_URL_SCHEME).toBe('digitaldsa');
	});

	it('AUTH_RETURN_PATH starts with /billing/auth-return', () => {
		expect(AUTH_RETURN_PATH).toBe('/billing/auth-return');
	});
});

// ── buildAuthReturnUrl ─────────────────────────────────────────

describe('buildAuthReturnUrl', () => {
	it('builds bare URL when no params', () => {
		expect(buildAuthReturnUrl({})).toBe('digitaldsa://billing/auth-return');
	});

	it('encodes status query param', () => {
		expect(buildAuthReturnUrl({ status: 'success' })).toBe(
			'digitaldsa://billing/auth-return?status=success'
		);
	});

	it('encodes pending_registration_id', () => {
		const result = buildAuthReturnUrl({
			status: 'success',
			pending_registration_id: 'inv_test_abc'
		});
		expect(result).toContain('status=success');
		expect(result).toContain('pending_registration_id=inv_test_abc');
	});

	it('handles status=cancelled', () => {
		expect(buildAuthReturnUrl({ status: 'cancelled' })).toContain('status=cancelled');
	});
});

// ── parseAuthReturnUrl ─────────────────────────────────────────

describe('parseAuthReturnUrl', () => {
	it('parses success return with pending_registration_id', () => {
		const payload = parseAuthReturnUrl(
			'digitaldsa://billing/auth-return?status=success&pending_registration_id=inv_abc'
		);
		expect(payload).toEqual({
			status: 'success',
			pending_registration_id: 'inv_abc'
		});
	});

	it('parses cancelled status', () => {
		const payload = parseAuthReturnUrl('digitaldsa://billing/auth-return?status=cancelled');
		expect(payload?.status).toBe('cancelled');
		expect(payload?.pending_registration_id).toBeUndefined();
	});

	it('parses HTTPS form (web fallback)', () => {
		const payload = parseAuthReturnUrl(
			'https://digitaldsa.com/billing/auth-return?status=success&pending_registration_id=inv_x'
		);
		expect(payload?.status).toBe('success');
		expect(payload?.pending_registration_id).toBe('inv_x');
	});

	it('defaults to "unknown" status when query param absent', () => {
		const payload = parseAuthReturnUrl('digitaldsa://billing/auth-return');
		expect(payload?.status).toBe('unknown');
	});

	it('defaults to "unknown" status when query param has unexpected value', () => {
		const payload = parseAuthReturnUrl(
			'digitaldsa://billing/auth-return?status=somethingelse'
		);
		expect(payload?.status).toBe('unknown');
	});

	it('returns null for URLs that do not match the auth-return path', () => {
		expect(parseAuthReturnUrl('digitaldsa://some/other/path')).toBeNull();
		expect(parseAuthReturnUrl('https://digitaldsa.com/dashboard')).toBeNull();
	});

	it('returns null for non-URL strings', () => {
		expect(parseAuthReturnUrl('not a url')).toBeNull();
		expect(parseAuthReturnUrl('')).toBeNull();
	});

	it('tolerates trailing slash on path', () => {
		const payload = parseAuthReturnUrl(
			'https://digitaldsa.com/billing/auth-return/?status=success'
		);
		expect(payload).not.toBeNull();
		expect(payload?.status).toBe('success');
	});
});
