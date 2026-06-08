/**
 * D.1 S5 M4 — Dunning banner wiring static-scan
 * ══════════════════════════════════════════════════════════════════
 * Locks the root +layout.server.ts + +layout.svelte wiring so a
 * refactor cannot silently drop the persistent banner:
 *
 *   1. +layout.server.ts imports + calls loadDunningBannerState and
 *      returns the result on the load data
 *   2. +layout.svelte imports DunningBanner and renders it conditionally
 *      from data.dunningBanner
 *
 * Without either, DSAs in dunning states would never see the in-app
 * banner — silent funnel loss until they receive an email (which by
 * the spec is the BACKUP signal, not the primary).
 *
 * Same enforcement model as preSubmitConfirmWiring (Pitfall #47) and
 * directorAutoIncomeWiring (Pitfall #46).
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LAYOUT_SERVER_PATH = 'src/routes/+layout.server.ts';
const LAYOUT_SVELTE_PATH = 'src/routes/+layout.svelte';

describe('root +layout.server.ts wires loadDunningBannerState', () => {
	const src = readFileSync(resolve(process.cwd(), LAYOUT_SERVER_PATH), 'utf8');

	it('imports loadDunningBannerState from $lib/server/billing/dunningBannerState', () => {
		expect(
			src.includes('loadDunningBannerState') &&
				src.includes("from '$lib/server/billing/dunningBannerState'"),
			"Root +layout.server.ts must import loadDunningBannerState — without it the banner never renders. See D.1 S5 M4."
		).toBe(true);
	});

	it('calls loadDunningBannerState(locals) in the load function', () => {
		expect(
			/loadDunningBannerState\(\s*locals\s*\)/.test(src),
			'Must invoke loadDunningBannerState(locals) so the banner state is available on every nav.'
		).toBe(true);
	});

	it('returns dunningBanner on the load data', () => {
		// Both the unauthenticated branch + the authenticated branch must
		// surface `dunningBanner` so the +layout.svelte conditional render
		// has a consistent shape to check. The helper returns null for
		// non-DSA / unauth callers, so it's safe to include both ways.
		const dunningBannerKeyMatches = src.match(/dunningBanner/g) ?? [];
		expect(
			dunningBannerKeyMatches.length,
			'dunningBanner key must appear at least 3 times: 1 const + 2 return-shape branches.'
		).toBeGreaterThanOrEqual(3);
	});
});

describe('root +layout.svelte renders DunningBanner', () => {
	const src = readFileSync(resolve(process.cwd(), LAYOUT_SVELTE_PATH), 'utf8');

	it('imports DunningBanner from $lib/components', () => {
		expect(
			src.includes("import DunningBanner from '$lib/components/DunningBanner.svelte'"),
			'Root +layout.svelte must import DunningBanner.'
		).toBe(true);
	});

	it('renders <DunningBanner> conditionally on data.dunningBanner', () => {
		// The condition must be on `data.dunningBanner` (the load data shape)
		// — not on a different store or a hardcoded flag. The pattern is
		// `{#if data?.dunningBanner}` followed by the DunningBanner tag.
		expect(src).toMatch(/\{#if\s+data\??\.dunningBanner\s*\}/);
		expect(src).toContain('<DunningBanner');
	});

	it('passes bannerState + dunningStartedAtIso through to the component', () => {
		// Both props must be wired — without `bannerState` the banner can't
		// pick its copy variant; without `dunningStartedAtIso` the "X days
		// of access left" math is wrong.
		expect(src).toMatch(/bannerState=\{data\.dunningBanner\.state\}/);
		expect(src).toMatch(/dunningStartedAtIso=\{data\.dunningBanner\.dunningStartedAtIso\}/);
	});
});
