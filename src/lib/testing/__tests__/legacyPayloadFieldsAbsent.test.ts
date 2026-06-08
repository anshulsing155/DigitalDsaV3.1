/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: 3 retired payload symbols stay gone from active code
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * The 2026-05-31 loan-field-nomenclature rename and supporting batches
 * removed three symbols from the active code surface, in each case after
 * a documented grep audit showed zero consumers:
 *
 *   1. `lapType` payload field — dropped from LoanTransactionPayload
 *      (Batch 6, commit `b0ea9210`). The new shape uses `facilityType`.
 *
 *   2. `PRODUCT_TYPE_MAP` constant — deleted as dead code
 *      (Batch 1, commit `d969e1b5`). Was in src/lib/types/policyEngine.ts.
 *
 *   3. `bank-loan-management` external API import paths — retired with
 *      ADR + integration-doc amendments (Batch 11, commit `e0a9af42`).
 *
 * Three "no-consumer" claims landing in the same workstream warrants a
 * standing static-scan lock so a future regression — someone re-introducing
 * any of these via copy-paste from old code, a stale snippet in a generated
 * file, or an unreviewed AI-assisted suggestion — fails CI fast. Review
 * finding L-N4, 2026-05-30.
 *
 * THIS TEST
 * ─────────
 * Walks every .ts / .svelte file under src/ (excluding _archive* / _archived*
 * folders — those are 410 stubs and retired histories) and asserts none of
 * the three retired names appear in USAGE form.
 *
 * Per Pitfall #66, every regex targets a USAGE shape, never a bare
 * identifier — so this test does NOT trip on:
 *   - This test file's own documentation strings (the names appear in code
 *     fences and explanatory text, not as the matched usage forms below)
 *   - Removal-decision comments in PITFALLS.md / ADR-0020 / spec docs
 *     (those live under docs/, never scanned here)
 *   - String literals that happen to contain the substring
 *
 * Excluded paths:
 *   - **\/_archive*\/**
 *   - **\/_archived*\/**
 *   - This test file itself (regex strings would otherwise self-match)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const ROOT = resolve(process.cwd(), 'src');
const SELF_PATH = resolve(
	process.cwd(),
	'src/lib/testing/__tests__/legacyPayloadFieldsAbsent.test.ts'
);

/**
 * Walk a directory tree and yield every file path matching the predicate.
 * Skips directory names that include `_archive` or `_archived` (those are
 * retired-route 410-stubs and historical components per project convention).
 */
function* walk(dir: string): Generator<string> {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		// Skip archive folders at any depth.
		if (entry.includes('_archive') || entry.includes('_archived')) continue;
		// Skip node_modules safety net (shouldn't appear under src/ but defensive)
		if (entry === 'node_modules') continue;

		let stat;
		try {
			stat = statSync(full);
		} catch {
			continue;
		}

		if (stat.isDirectory()) {
			yield* walk(full);
		} else if (stat.isFile() && (full.endsWith('.ts') || full.endsWith('.svelte'))) {
			yield full;
		}
	}
}

/**
 * Build the file list once at module scope — every test reuses it.
 * Roughly 800-1000 files; readSync on each is ~ms total.
 */
const FILES: Array<{ path: string; src: string }> = (() => {
	const out: Array<{ path: string; src: string }> = [];
	for (const path of walk(ROOT)) {
		if (path === SELF_PATH) continue; // never scan this test file
		out.push({ path, src: readFileSync(path, 'utf8') });
	}
	return out;
})();

function relPath(absPath: string): string {
	return relative(process.cwd(), absPath).split(sep).join('/');
}

describe('Retired payload symbols — static absence lock (review L-N4)', () => {
	it('FILES list is non-empty (sanity — the walker actually found source files)', () => {
		expect(FILES.length, 'walker yielded zero files under src/').toBeGreaterThan(100);
	});

	it('`lapType:` / `lapType?:` field decl + `.lapType` member access absent', () => {
		// USAGE shapes: type/interface field declaration and object-property
		// access. Excludes bare `lapType` so removal-history comments
		// referencing the name don't false-fire.
		const usage = /\blapType\s*[:?]|\.lapType\b/;
		const hits = FILES.filter(({ src }) => usage.test(src));

		expect(
			hits.length,
			`'lapType' usage forms detected — these were dropped from LoanTransactionPayload in commit b0ea9210 (Batch 6, 2026-05-31). The new field is 'facilityType' (see ADR-0020). Hits:\n${hits.map((h) => `  - ${relPath(h.path)}`).join('\n')}`
		).toBe(0);
	});

	it('`PRODUCT_TYPE_MAP[` / `PRODUCT_TYPE_MAP.` / `PRODUCT_TYPE_MAP =` / import absent', () => {
		// USAGE shapes: subscript, member access, assignment, import. The
		// bare-identifier form is intentionally NOT scanned so commentary in
		// removal-history comments doesn't trip the lock.
		const usage = /\bPRODUCT_TYPE_MAP\s*[\[\.\(=]|import\s*{[^}]*\bPRODUCT_TYPE_MAP\b[^}]*}/;
		const hits = FILES.filter(({ src }) => usage.test(src));

		expect(
			hits.length,
			`'PRODUCT_TYPE_MAP' usage detected — this dead constant was deleted in commit d969e1b5 (Batch 1, 2026-05-31). If a new caller needs a product-type mapping, derive from loanTypeLabel() / loanName instead. Hits:\n${hits.map((h) => `  - ${relPath(h.path)}`).join('\n')}`
		).toBe(0);
	});

	it("import path 'bank-loan-management' absent (static and dynamic forms)", () => {
		// USAGE shapes: ES `from '...bank-loan-management...'` and dynamic
		// `import('...bank-loan-management...')`. The external integration
		// was retired in commit e0a9af42 (Batch 11, 2026-05-31).
		const staticImport = /from\s+['"][^'"]*bank-loan-management/;
		const dynamicImport = /import\s*\(\s*['"][^'"]*bank-loan-management/;
		const hits = FILES.filter(
			({ src }) => staticImport.test(src) || dynamicImport.test(src)
		);

		expect(
			hits.length,
			`'bank-loan-management' import detected — this external API integration was retired in commit e0a9af42 (Batch 11, 2026-05-31, see ADR-0020). Hits:\n${hits.map((h) => `  - ${relPath(h.path)}`).join('\n')}`
		).toBe(0);
	});

	it("import path '$lib/services/homeLoanApi' absent (S214 — D7 archival)", () => {
		// TECH-DEBT-CLEANUP §3 D7 — the homeLoanApi.ts service was archived
		// in S214 (2026-06-02) per ADR-0020 + ADR-0024 after investigation
		// confirmed:
		//   1. The 3 submit functions (submitHomeLoanApplication / BT / Topup)
		//      were never called from anywhere in the live tree.
		//   2. The 6 storage helpers (getStored*Offers / clearStored*Offers)
		//      were called only by 2 offer routes (topup-loan-offers,
		//      balance-transfer-offers) whose localStorage keys had no writer.
		// File now lives at src/lib/services/_archive/homeLoanApi-S214.ts.
		// This negative lock prevents a future session from reintroducing a
		// live importer of the archived module (which would defeat the
		// archival + revive the dead surface).
		const staticImport = /from\s+['"]\$lib\/services\/homeLoanApi['"]/;
		const dynamicImport = /import\s*\(\s*['"]\$lib\/services\/homeLoanApi['"]/;
		const hits = FILES.filter(
			({ src }) => staticImport.test(src) || dynamicImport.test(src)
		);

		expect(
			hits.length,
			`'$lib/services/homeLoanApi' import detected — this module was archived in S214 (2026-06-02, TECH-DEBT-CLEANUP D7, see ADR-0020 + ADR-0024). Use the live offers pipeline instead — see docs/OFFERS-ARCHITECTURE.md. Hits:\n${hits.map((h) => `  - ${relPath(h.path)}`).join('\n')}`
		).toBe(0);
	});
});
