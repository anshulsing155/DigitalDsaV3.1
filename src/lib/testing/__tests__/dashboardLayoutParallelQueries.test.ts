/**
 * Lock test — src/routes/dashboard/+layout.server.ts must keep its DSA-path
 * MongoDB queries parallelized.
 *
 * S219 (2026-06-02) collapsed a 4-await serial chain in this layout to a single
 * Promise.all fan-out (onboarding + merged subscription/signup-date doc + case
 * count). Each round-trip on Vercel ap-south-1 ↔ Atlas adds 30-200ms, and the
 * layout sits in the cold-start path for EVERY dashboard navigation, so a
 * regression here is silent but expensive.
 *
 * This test asserts the CANONICAL state — not the historical state. If
 * someone later adds a 5th query, they must either fold it into the existing
 * Promise.all or trip this test and consciously document why a serial await
 * is necessary (e.g. dependent on a prior result).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LAYOUT_PATH = resolve(process.cwd(), 'src/routes/dashboard/+layout.server.ts');
const source = readFileSync(LAYOUT_PATH, 'utf8');

describe('dashboard/+layout.server.ts — parallel query lock', () => {
	it('uses Promise.all to fan out DSA-path queries', () => {
		// The canonical parallelization marker. If this disappears, someone
		// reverted to the serial-await pattern.
		expect(source).toContain('Promise.all(');
	});

	it('has at most one top-level await DsaApplications.findOne outside Promise.all', () => {
		// Strip block + line comments so the regex can't false-match a code
		// snippet someone documented inside a JSDoc.
		const stripped = source
			.replace(/\/\*[\s\S]*?\*\//g, '') // block comments
			.replace(/\/\/.*$/gm, ''); // line comments

		const matches = stripped.match(/\bawait\s+DsaApplications\.findOne\s*\(/g) ?? [];

		// Canonical: one and only one — the team-owner-name lookup inside the
		// teamContext conditional. Both DSA-path findOnes (onboarding +
		// merged subscription/signup-date) live inside Promise.all and use
		// the bare `DsaApplications.findOne(...)` form (no `await` prefix —
		// Promise.all awaits the array).
		expect(matches.length).toBeLessThanOrEqual(1);
	});

	it('imports ObjectId statically — no per-request dynamic mongodb import', () => {
		// Hoisted from `await import('mongodb')` calls during S219. The
		// dynamic-import cost is small but multiplied by every layout
		// execution; static hoist makes this free.
		const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
		expect(stripped).toMatch(/from\s+['"]mongodb['"]/);
		// And: no dynamic mongodb import remains.
		expect(stripped).not.toMatch(/await\s+import\(['"]mongodb['"]\)/);
	});

	it('imports getActiveNpsWindow statically — no per-request dynamic surveys import', () => {
		// Same rationale as ObjectId — this layout runs on every authenticated
		// dashboard navigation. Static import + tree-shaking gives the same
		// payload at zero per-request cost.
		const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
		expect(stripped).toMatch(/from\s+['"]\$lib\/server\/account\/surveys['"]/);
		expect(stripped).not.toMatch(/await\s+import\(['"]\$lib\/server\/account\/surveys['"]\)/);
	});

	// ── Onboarding-redirect path lock (code-review 2026-06-02 PM, Action #4) ──
	//
	// The S219 parallelization trade-off is documented: on the onboarding-
	// incomplete redirect path, the merged dsaDocQuery + caseCountQuery do a
	// small amount of wasted work before the redirect fires. The common path
	// (onboarding completed) wins; the redirect path pays one extra cheap
	// round-trip. Acceptable.
	//
	// This is acceptable ONLY because the redirect sits AFTER Promise.all. If
	// a future cleanup moves the redirect ABOVE the Promise.all (the obvious
	// "don't waste queries" simplification), the queries re-serialize: the
	// fan-out becomes serial again because the redirect short-circuits before
	// the parallel awaits ever fire. The win this test was added to preserve
	// would silently vanish.
	//
	// These two tests lock the redirect's position relative to Promise.all so
	// that obvious-looking optimization can't land without an audit.
	describe('onboarding-redirect path', () => {
		// Pre-strip comments for both tests below.
		const strippedSource = source
			.replace(/\/\*[\s\S]*?\*\//g, '')
			.replace(/\/\/.*$/gm, '');

		it('still throws the dsa-onboarding redirect on the DSA path', () => {
			// If this disappears, the gate is gone — any non-onboarded DSA gets
			// to walk straight into the dashboard load. That's a regression of
			// the onboarding flow itself, not just the parallelization.
			expect(strippedSource).toMatch(
				/throw\s+redirect\s*\(\s*302\s*,\s*['"]\/dsa-onboarding['"]\s*\)/
			);
		});

		it('places the dsa-onboarding redirect AFTER Promise.all (not before)', () => {
			// Find the FIRST Promise.all on the DSA path. The redirect must
			// come at a later character offset; otherwise the fan-out is dead
			// code on the redirect path and the parallelization regressed.
			const promiseAllIdx = strippedSource.indexOf('Promise.all(');
			const redirectMatch = strippedSource.match(
				/throw\s+redirect\s*\(\s*302\s*,\s*['"]\/dsa-onboarding['"]\s*\)/
			);

			expect(promiseAllIdx).toBeGreaterThan(-1);
			expect(redirectMatch).not.toBeNull();

			const redirectIdx = redirectMatch ? strippedSource.indexOf(redirectMatch[0]) : -1;
			expect(redirectIdx).toBeGreaterThan(promiseAllIdx);
		});
	});
});
