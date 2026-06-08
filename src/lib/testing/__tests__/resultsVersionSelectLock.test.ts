/**
 * Lock test — results-page version selector must refetch after URL update.
 *
 * Background (S221+1, 2026-06-03):
 * After the S220 CSR rewrite (commit be732a80), the heavy data fetch on
 * `/dashboard/dsa/cases/[id]/results` moved from `+page.server.ts` into
 * `onMount → fetchResultsData()` on the client. The version selector
 * (`handleVersionSelect`) was updating the URL via `goto({invalidateAll:true})`
 * and assuming the page would re-fetch — but `goto` doesn't re-mount the
 * component, so `onMount` never re-fired, so `fetchResultsData()` never
 * ran again, so clicking v1 did nothing visible. URL changed silently,
 * data stayed on whatever version loaded first.
 *
 * Fix: handleVersionSelect now calls `fetchResultsData()` explicitly after
 * the `goto`. This test asserts that pattern so a future refactor can't
 * silently strip the explicit call and re-introduce the dead-click bug.
 *
 * Owner-reported repro: HL-2026-0072, v1 → v2 → click v1, nothing happens.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RESULTS_PAGE_PATH = resolve(
	process.cwd(),
	'src/routes/dashboard/dsa/cases/[case_id]/results/+page.svelte'
);

describe('results-page version selector — locked to explicit refetch', () => {
	const src = readFileSync(RESULTS_PAGE_PATH, 'utf8');

	// Pull the body of handleVersionSelect for narrow assertions.
	const handlerMatch = src.match(
		/async function handleVersionSelect\([^)]*\)\s*\{([\s\S]*?)\n\t\}/
	);

	it('handleVersionSelect exists', () => {
		expect(handlerMatch).not.toBeNull();
	});

	it('handleVersionSelect updates the version search param', () => {
		expect(handlerMatch![1]).toMatch(/searchParams\.set\(\s*['"]version['"]/);
	});

	it('handleVersionSelect calls goto with invalidateAll', () => {
		// invalidateAll keeps any layout-level data fresh (parent +layout.server.ts
		// loads case metadata that's version-independent — invalidating is cheap +
		// keeps the URL bar honest).
		expect(handlerMatch![1]).toMatch(/goto\([^)]*invalidateAll\s*:\s*true/);
	});

	it('handleVersionSelect calls fetchResultsData() explicitly after goto', () => {
		// THE LOCK — without this explicit call, the version click is a no-op
		// because onMount only fires once and goto doesn't re-mount.
		expect(handlerMatch![1]).toMatch(/await\s+fetchResultsData\(\s*\)/);

		// The order matters: goto first (so URL is current), then fetch (so
		// the version param read inside fetchResultsData picks up the new value).
		const gotoIdx = handlerMatch![1].indexOf('goto(');
		const fetchIdx = handlerMatch![1].indexOf('fetchResultsData(');
		expect(gotoIdx).toBeGreaterThan(-1);
		expect(fetchIdx).toBeGreaterThan(gotoIdx);
	});

	it('fetchResultsData reads version from $page.url.searchParams (not a stale closure)', () => {
		// The explicit refetch only works if fetchResultsData re-reads the
		// version param at call time. If a future refactor caches the version
		// in a closure (e.g. captured at onMount), the explicit call would
		// fetch the wrong version.
		const fetcherMatch = src.match(/async function fetchResultsData\([^)]*\)\s*\{([\s\S]*?)\n\t\}/);
		expect(fetcherMatch).not.toBeNull();
		expect(fetcherMatch![1]).toMatch(
			/\$page\.url\.searchParams\.get\(\s*['"]version['"]\s*\)/
		);
	});
});
