/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: every archived `+server.ts` is a self-contained 410 stub.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * SvelteKit's `_`-prefix on a route folder prevents the URL from being
 * REGISTERED (no route record in the manifest), but Vite/Rollup still
 * discovers and bundles every `+server.ts` under `src/routes/` during
 * `vite build`. A `@ts-nocheck` directive silences svelte-check (so
 * `pnpm check` stays green) but does NOT silence Rollup's import
 * resolution. The result: a missing import in an archived handler
 * compiles fine locally, then explodes in production `vite build` on
 * Vercel.
 *
 * On 2026-05-28 this bit production HARD — four consecutive Vercel
 * deploys failed because `_archived_da_topup/+server.ts` still imported
 * the retired `purchaseTopup` symbol. Local `pnpm check` was green
 * every push. Local `pnpm build` was never run. See PITFALLS.md #63.
 *
 * THIS TEST
 * ─────────
 * Static source-code scan. Walks every `+server.ts` whose path contains
 * a `_archive` segment and asserts the file imports ONLY from:
 *   - './$types'                       (SvelteKit-generated route types)
 *   - '$lib/server/apiResponse.js'    (apiOk / apiError / etc.)
 *
 * Any other import — `$lib/server/billing/*`, `$lib/database/*`,
 * `$env/static/private`, an npm package, anything — is a violation.
 * Archived handlers must be IMMUNE to upstream symbol retirements.
 *
 * The husky pre-push hook (`.husky/pre-push`) enforces the same
 * invariant with a 10ms shell grep — this vitest test mirrors it for
 * CI / branch / non-push contexts (same approach as
 * `directorAutoIncomeWiring.test.ts` for Pitfall #46).
 *
 * Companion: CLAUDE.md Pitfall #63, PITFALLS.md #63, the §4 grep recipe.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, sep, posix } from 'node:path';

// ── Discovery ──────────────────────────────────────────────────────────
// Walk src/routes/ and collect every +server.ts whose path contains a
// folder segment matching /^_archive/. We don't hard-code paths because
// future archivals shouldn't require updating this test — discovery
// should pick them up automatically.

const ROUTES_ROOT = resolve(process.cwd(), 'src/routes');

function findArchivedServerFiles(dir: string, acc: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			findArchivedServerFiles(full, acc);
		} else if (entry === '+server.ts') {
			// Normalise to posix for stable segment matching across Win/POSIX.
			const rel = full.replace(ROUTES_ROOT, '').split(sep).join(posix.sep);
			// Any segment starting with `_archive` (covers `_archive`,
			// `_archived`, `_archived_da_topup`, etc.) qualifies.
			if (rel.split(posix.sep).some((seg) => seg.startsWith('_archive'))) {
				acc.push(full);
			}
		}
	}
	return acc;
}

const ARCHIVED_FILES = findArchivedServerFiles(ROUTES_ROOT);

// ── Allowed imports ─────────────────────────────────────────────────────
// Anchored on the import-source string (the part between the quotes).
// './$types' is the SvelteKit generated `RequestHandler` type. Anything
// in $lib/server/apiResponse is the standard response builder family.
// Adding to this list expands the surface every archived stub may touch
// — do not loosen casually.
const ALLOWED_SOURCES = new Set<string>(['./$types', '$lib/server/apiResponse.js']);

// Extract every `from '...'` source string in the file. Type-only imports
// (`import type X from ...`) count too — they still go through Rollup's
// graph. Side-effect imports (`import './x.js'`) are scanned with a second
// regex below.
function extractImportSources(src: string): string[] {
	const sources: string[] = [];
	// Static + dynamic: `import [...] from '...'`, with or without curly
	// braces or default name. Multi-line tolerated via `[\s\S]*?`.
	const fromRe = /import\s+(?:type\s+)?[\s\S]*?from\s+['"]([^'"]+)['"]/g;
	let match: RegExpExecArray | null;
	while ((match = fromRe.exec(src)) !== null) {
		sources.push(match[1]);
	}
	// Side-effect: `import 'x'` (no `from`)
	const sideRe = /^\s*import\s+['"]([^'"]+)['"]\s*;?\s*$/gm;
	while ((match = sideRe.exec(src)) !== null) {
		sources.push(match[1]);
	}
	return sources;
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('Archived route stub invariant (Pitfall #63)', () => {
	it('discovers at least one archived +server.ts (sanity)', () => {
		// Discovery returning zero would silently pass every per-file test
		// below. Lock the floor — if every archive disappears this test
		// must be re-evaluated, not silently retired.
		expect(
			ARCHIVED_FILES.length,
			'No archived +server.ts files found under src/routes/. Either the convention changed (rename `_archived_*` → something else) or discovery is broken. Update findArchivedServerFiles().'
		).toBeGreaterThan(0);
	});

	for (const filePath of ARCHIVED_FILES) {
		const relPath = filePath.replace(resolve(process.cwd()) + sep, '').split(sep).join('/');

		describe(relPath, () => {
			const src = readFileSync(filePath, 'utf8');
			const sources = extractImportSources(src);

			it('imports ONLY from ./$types and $lib/server/apiResponse.js', () => {
				const violations = sources.filter((s) => !ALLOWED_SOURCES.has(s));
				expect(
					violations,
					`${relPath} imports from disallowed sources: ${JSON.stringify(violations)}.\n` +
						`Archived handlers must be self-contained 410 stubs that import ONLY from\n` +
						`'./$types' and '$lib/server/apiResponse.js'. Any other import is a latent\n` +
						`Vercel build break (Pitfall #63) — the moment the imported symbol is\n` +
						`retired, vite build fails on Vercel even though pnpm check stays green.\n` +
						`Convert the file to a 410 stub per PITFALLS.md #63. The original handler\n` +
						`is recoverable from git history at the retirement SHA.`
				).toEqual([]);
			});

			it('does NOT contain @ts-nocheck (the false-confidence directive)', () => {
				// @ts-nocheck only silences svelte-check — Rollup ignores it.
				// Its presence in an archived file is the exact misconception
				// that caused Pitfall #63 to ship to production.
				expect(
					/@ts-nocheck/.test(src),
					`${relPath} contains @ts-nocheck. This directive silences svelte-check but NOT Rollup — leaving broken imports in place breaks vite build on Vercel. Convert to a 410 stub instead (Pitfall #63).`
				).toBe(false);
			});

			it('exports a request handler (POST | GET | PUT | DELETE | PATCH)', () => {
				// Smoke check: every +server.ts must still expose at least one
				// HTTP method handler. A stub that exports nothing is a dead
				// file — should be moved out of src/routes/ entirely. Keeping
				// the export contract means the file is still legitimately a
				// route module, just one that returns 410.
				expect(
					/export\s+const\s+(POST|GET|PUT|DELETE|PATCH)\s*:/.test(src),
					`${relPath} must export at least one HTTP method handler (POST/GET/PUT/DELETE/PATCH). A stub with no exports is a dead file — move it outside src/routes/ instead.`
				).toBe(true);
			});
		});
	}
});
