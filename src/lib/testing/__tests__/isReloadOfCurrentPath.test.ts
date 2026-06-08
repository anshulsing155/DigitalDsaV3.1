/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: `isReloadOfCurrentPath()` returns true ONLY when the current
 * document was loaded via a browser reload AND the reload happened on the
 * CURRENT path. (Pitfall #42.)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Pre-fix, all 6 loan +page.svelte files inlined:
 *
 *     const navEntries = performance.getEntriesByType('navigation') as ...
 *     const isBrowserReload = navEntries.length > 0 && navEntries[0].type === 'reload';
 *
 * Because the document navigation entry is frozen at tab-load time and never
 * mutated by SvelteKit's client router, a single F5 anywhere in the session
 * caused every subsequent client-side mount of a loan page to read
 * `isBrowserReload === true`. That falsely cleared `__resumeHandledHere` and
 * re-fired the 3-option SessionResumeModal on normal Home → picker → Next
 * navigation.
 *
 * The fixed util compares the entry's `name` (URL frozen at document load
 * time) with `window.location.pathname` (live, updated by SvelteKit on every
 * client nav). Matching ⇒ user F5'd on this page; mismatch ⇒ F5 happened on
 * an earlier page and we client-navigated here, so it's NOT a reload of this
 * mount.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// The util short-circuits to false when SvelteKit's `browser` flag is false,
// which is the case in vitest+jsdom by default. Mock it as true so the util
// exercises its real reload-detection logic against the stubbed performance
// + window.location below.
vi.mock('$app/environment', () => ({ browser: true }));

import { isReloadOfCurrentPath } from '$lib/utils/isReloadOfCurrentPath';

type FakeNavEntry = Pick<PerformanceNavigationTiming, 'type' | 'name'>;

function stubNavEntries(entries: FakeNavEntry[]): void {
	vi.spyOn(performance, 'getEntriesByType').mockImplementation((type: string) => {
		if (type === 'navigation') return entries as unknown as PerformanceEntry[];
		return [];
	});
}

function stubLocation(pathname: string): void {
	Object.defineProperty(window, 'location', {
		value: { pathname, href: 'https://example.test' + pathname },
		writable: true,
		configurable: true
	});
}

describe('isReloadOfCurrentPath (Pitfall #42)', () => {
	beforeEach(() => {
		stubLocation('/form/unsecure-loan/business-loan');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns true when navigation type is reload AND entry path matches current path', () => {
		stubNavEntries([
			{
				type: 'reload',
				name: 'https://example.test/form/unsecure-loan/business-loan'
			}
		]);
		expect(isReloadOfCurrentPath()).toBe(true);
	});

	it('returns FALSE when reloaded on a different path then client-nav here (the regression case)', () => {
		// User F5'd on Home, then SvelteKit-navigated to business-loan.
		// navEntries[0].type stays 'reload' but the URL is the home page.
		stubNavEntries([{ type: 'reload', name: 'https://example.test/' }]);
		expect(isReloadOfCurrentPath()).toBe(false);
	});

	it('returns false on a normal navigate even when path matches', () => {
		stubNavEntries([
			{
				type: 'navigate',
				name: 'https://example.test/form/unsecure-loan/business-loan'
			}
		]);
		expect(isReloadOfCurrentPath()).toBe(false);
	});

	it('returns false on back_forward navigation', () => {
		stubNavEntries([
			{
				type: 'back_forward',
				name: 'https://example.test/form/unsecure-loan/business-loan'
			}
		]);
		expect(isReloadOfCurrentPath()).toBe(false);
	});

	it('returns false when no navigation entries exist', () => {
		stubNavEntries([]);
		expect(isReloadOfCurrentPath()).toBe(false);
	});

	it('returns false (and does not throw) when entry name is not a parseable URL', () => {
		stubNavEntries([{ type: 'reload', name: 'not a url at all' }]);
		expect(isReloadOfCurrentPath()).toBe(false);
	});

	it('compares path only — query string changes on the same path still count as reload', () => {
		stubLocation('/form/unsecure-loan/business-loan');
		stubNavEntries([
			{
				type: 'reload',
				name: 'https://example.test/form/unsecure-loan/business-loan?edit=abc123'
			}
		]);
		expect(isReloadOfCurrentPath()).toBe(true);
	});

	it('returns false when entry path is a different loan page', () => {
		stubLocation('/form/unsecure-loan/business-loan');
		stubNavEntries([
			{
				type: 'reload',
				name: 'https://example.test/form/unsecure-loan/personal-loan'
			}
		]);
		expect(isReloadOfCurrentPath()).toBe(false);
	});
});
