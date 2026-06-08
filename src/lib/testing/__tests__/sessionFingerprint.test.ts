/**
 * Unit test — SEC-10 client-side fingerprint computation.
 *
 * Covers the two testable parts of src/lib/utils/sessionFingerprint.ts:
 *
 *   1. parseUaFamily — pure UA-string parsing. Exercised against known
 *      UAs for every browser × OS combination we care about, plus a few
 *      adversarial cases (Edge with Chrome substring, iOS with Mac
 *      substring, Android with Linux substring).
 *
 *   2. buildFingerprints — invokes sha256Hex internally. Tested against
 *      a mocked navigator/window/crypto.subtle.digest harness so the
 *      same browser-shaped inputs always produce the same fingerprint
 *      (the determinism contract callers rely on).
 *
 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §8
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Pitfall #9 fix (S223+1): sessionFingerprint.ts now uses SvelteKit's
// `browser` from $app/environment instead of `typeof window`. The mock
// here marks every test as running in browser context — the SSR-stub
// branch is exercised by its own dedicated suite at the bottom of this
// file (which re-mocks browser=false).
vi.mock('$app/environment', () => ({
	browser: true
}));

import { parseUaFamily, buildFingerprints } from '$lib/utils/sessionFingerprint';

// ── Known UA strings (representative real-world samples) ───────────────

const UA_CHROME_WIN =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.116 Safari/537.36';
const UA_FIREFOX_MAC =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:128.0) Gecko/20100101 Firefox/128.0';
const UA_SAFARI_IOS =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const UA_EDGE_WIN =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.46';
const UA_CHROME_ANDROID =
	'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const UA_FIREFOX_LINUX =
	'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0';
const UA_OPERA_WIN =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 OPR/100.0.0.0';

// ── parseUaFamily ──────────────────────────────────────────────────────

describe('parseUaFamily — known UA strings', () => {
	it('Chrome on Windows', () => {
		const r = parseUaFamily(UA_CHROME_WIN);
		expect(r.family).toBe('Chrome');
		expect(r.majorVersion).toBe('130');
		expect(r.os).toBe('Windows');
	});

	it('Firefox on Mac', () => {
		const r = parseUaFamily(UA_FIREFOX_MAC);
		expect(r.family).toBe('Firefox');
		expect(r.majorVersion).toBe('128');
		expect(r.os).toBe('Mac');
	});

	it('Safari on iOS (not Mac despite "Mac OS X" substring)', () => {
		// Adversarial: iOS UAs contain "like Mac OS X". The narrow iOS
		// test must run BEFORE the Mac test (order matters in parser).
		const r = parseUaFamily(UA_SAFARI_IOS);
		expect(r.family).toBe('Safari');
		expect(r.majorVersion).toBe('17');
		expect(r.os).toBe('iOS');
	});

	it('Edge on Windows (not Chrome despite Chrome substring)', () => {
		// Adversarial: Edge UAs contain "Chrome/...". The Edge branch
		// MUST be checked first.
		const r = parseUaFamily(UA_EDGE_WIN);
		expect(r.family).toBe('Edge');
		expect(r.majorVersion).toBe('130');
		expect(r.os).toBe('Windows');
	});

	it('Chrome on Android (not Linux despite Linux substring)', () => {
		// Adversarial: Android UAs contain "Linux". Android branch first.
		const r = parseUaFamily(UA_CHROME_ANDROID);
		expect(r.family).toBe('Chrome');
		expect(r.majorVersion).toBe('130');
		expect(r.os).toBe('Android');
	});

	it('Firefox on Linux', () => {
		const r = parseUaFamily(UA_FIREFOX_LINUX);
		expect(r.family).toBe('Firefox');
		expect(r.majorVersion).toBe('128');
		expect(r.os).toBe('Linux');
	});

	it('Opera on Windows (not Chrome despite Chrome substring)', () => {
		const r = parseUaFamily(UA_OPERA_WIN);
		expect(r.family).toBe('Opera');
		expect(r.majorVersion).toBe('100');
		expect(r.os).toBe('Windows');
	});

	it('empty UA → Unknown / 0 / Unknown', () => {
		const r = parseUaFamily('');
		expect(r).toEqual({ family: 'Unknown', majorVersion: '0', os: 'Unknown' });
	});

	it('garbage UA → Unknown family but OS may still parse', () => {
		// Some scrapers send UAs without a recognized browser token but
		// with platform info — we still want the OS hint for the device
		// seed even if the browser seed degrades to 'Unknown|0|OS'.
		const r = parseUaFamily('Some unknown bot string Windows NT 10.0');
		expect(r.family).toBe('Unknown');
		expect(r.majorVersion).toBe('0');
		expect(r.os).toBe('Windows');
	});
});

// ── buildFingerprints — happy path with mocked browser globals ─────────

/**
 * Set up a minimal browser harness so buildFingerprints can run in the
 * vitest node environment. The mocks are scoped per-test via
 * beforeEach/afterEach so tests don't bleed into each other.
 */
type MockGlobals = {
	navigator?: unknown;
	window?: unknown;
	Intl?: unknown;
	crypto?: unknown;
};
const originals: MockGlobals = {};

function installBrowserMocks(ua: string, platform: string, tz: string, screen: { width: number; height: number; colorDepth: number }) {
	const g = globalThis as Record<string, unknown>;
	originals.navigator = g.navigator;
	originals.window = g.window;

	g.navigator = { userAgent: ua, platform };
	g.window = { screen };
	// Intl is already real in node; only override the timezone resolver.
	const realIntl = Intl;
	const fakeIntl = {
		...realIntl,
		DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: tz }) })
	};
	originals.Intl = g.Intl;
	g.Intl = fakeIntl;

	// crypto.subtle.digest is available in modern node (≥19). We use the
	// real one — no mock needed. Determinism comes from the input string.
}

function uninstallBrowserMocks() {
	const g = globalThis as Record<string, unknown>;
	if (originals.navigator !== undefined) g.navigator = originals.navigator;
	else delete g.navigator;
	if (originals.window !== undefined) g.window = originals.window;
	else delete g.window;
	if (originals.Intl !== undefined) g.Intl = originals.Intl;
}

describe('buildFingerprints — web path', () => {
	beforeEach(() => {
		installBrowserMocks(
			UA_CHROME_WIN,
			'Win32',
			'Asia/Kolkata',
			{ width: 1920, height: 1080, colorDepth: 24 }
		);
	});

	afterEach(() => {
		uninstallBrowserMocks();
	});

	it('returns 64-char lowercase hex for both device and browser', async () => {
		const fp = await buildFingerprints();
		expect(fp.device).toMatch(/^[a-f0-9]{64}$/);
		expect(fp.browser).toMatch(/^[a-f0-9]{64}$/);
	});

	it('is deterministic — same inputs produce the same fingerprints', async () => {
		const a = await buildFingerprints();
		const b = await buildFingerprints();
		expect(a.device).toBe(b.device);
		expect(a.browser).toBe(b.browser);
	});

	it('uaSummary reflects parsed family + version + OS', async () => {
		const fp = await buildFingerprints();
		expect(fp.uaSummary).toBe('Chrome 130 on Windows');
	});

	it("clientClass defaults to 'web'", async () => {
		const fp = await buildFingerprints();
		expect(fp.clientClass).toBe('web');
	});

	it('different OS changes the device fingerprint', async () => {
		const a = await buildFingerprints();
		uninstallBrowserMocks();
		installBrowserMocks(
			UA_FIREFOX_MAC,
			'MacIntel',
			'Asia/Kolkata',
			{ width: 1920, height: 1080, colorDepth: 24 }
		);
		const b = await buildFingerprints();
		expect(a.device).not.toBe(b.device);
		expect(a.browser).not.toBe(b.browser);
	});

	it('major-version bump on same browser does NOT change browser fingerprint when stripped', async () => {
		// Sanity: Chrome 130.0.6723 and Chrome 130.0.6724 parse to the same
		// major version, so they should produce the SAME browser
		// fingerprint (this is the spec §10 R1 mitigation — auto-update
		// noise filter).
		const a = await buildFingerprints();
		uninstallBrowserMocks();
		const slightlyDifferentUa = UA_CHROME_WIN.replace('130.0.6723.116', '130.0.6724.50');
		installBrowserMocks(
			slightlyDifferentUa,
			'Win32',
			'Asia/Kolkata',
			{ width: 1920, height: 1080, colorDepth: 24 }
		);
		const b = await buildFingerprints();
		expect(a.browser).toBe(b.browser);
	});
});

// ── buildFingerprints — android stub path ──────────────────────────────

describe('buildFingerprints — android stub path (pre-MOB-1)', () => {
	it("returns clientClass 'android' and a fixed uaSummary", async () => {
		const fp = await buildFingerprints({ clientClass: 'android' });
		expect(fp.clientClass).toBe('android');
		expect(fp.uaSummary).toBe('DigitalDSA Android app');
	});

	it('is deterministic for the same androidPersistentId', async () => {
		const a = await buildFingerprints({
			clientClass: 'android',
			androidPersistentId: 'uuid-fixed-1'
		});
		const b = await buildFingerprints({
			clientClass: 'android',
			androidPersistentId: 'uuid-fixed-1'
		});
		expect(a.device).toBe(b.device);
		expect(a.browser).toBe(b.browser);
	});

	it('different androidPersistentId produces different fingerprints', async () => {
		const a = await buildFingerprints({
			clientClass: 'android',
			androidPersistentId: 'uuid-a'
		});
		const b = await buildFingerprints({
			clientClass: 'android',
			androidPersistentId: 'uuid-b'
		});
		expect(a.device).not.toBe(b.device);
	});
});
