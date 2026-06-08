/**
 * SEC-5 — BOLA regression net for the admin/policy-engine + admin/policies family.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * What this guards against
 * ------------------------
 * Every route under `/api/admin/policy-engine/**` and the per-artifact
 * `/api/admin/policies/[artifact_id]/**` family uses the **Pattern 4** BOLA gate:
 *
 *     const denied = requireRoleApi(locals, 'admin');
 *     if (denied) return denied;
 *     const permDenied = requireAdminPermission(locals, '<perm>');
 *     if (permDenied) return permDenied;
 *
 * The role gate alone is necessary but not sufficient — admins without the
 * specific permission (rule_authoring / system_settings / etc.) must NOT be
 * able to mutate policy/version/capture/comment/artifact resources just by
 * authenticating. The permission layer IS the per-resource gate for this
 * admin family (per docs/ARCHITECTURE-EVOLUTION.md SEC-5 row).
 *
 * The class of regression we're catching: a future contributor copy-pastes
 * a handler from elsewhere, keeps `requireRoleApi('admin')`, and forgets the
 * `requireAdminPermission(...)` line. The role check passes for any admin
 * (including provisionally-onboarded ones with empty permission grants), and
 * the route opens up.
 *
 * Why static-scan instead of HTTP round-trip
 * ------------------------------------------
 * These handlers are thin wrappers around the guard pair + DB ops. The
 * guard pair's own behavior is already covered by guards.test.ts (which
 * asserts requireAdminPermission returns 403 when the permission is missing).
 * What's NOT covered today is whether every route in the family actually
 * INVOKES that gate — that's the gap the roadmap calls out as missing.
 *
 * A static AST-free scan is the right shape:
 *   - cheap, runs in <100ms in CI
 *   - catches every regression at the source-file level
 *   - no Mongo / no SvelteKit runtime needed
 *
 * If a future audit decides any specific route warrants a stronger gate
 * (e.g. super-admin only, or RM-assignment scope), add it as an ADDITIONAL
 * test rather than removing this one — this net catches the broadest class.
 *
 * Routes covered
 * --------------
 * - All 20 files under src/routes/api/admin/policy-engine/**\/+server.ts
 * - src/routes/api/admin/policies/[artifact_id]/**\/+server.ts (artifact family)
 *
 * Last audited: 2026-05-18 (S105 close)
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// ── File discovery (static, no glob library needed) ─────────────────────────

const ROUTES_ROOT = join(process.cwd(), 'src', 'routes', 'api', 'admin');

/** Recursive walk that returns all +server.ts files under `dir`. */
function walkServerFiles(dir: string): string[] {
	const out: string[] = [];
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return out;
	}
	for (const entry of entries) {
		const full = join(dir, entry);
		let s;
		try {
			s = statSync(full);
		} catch {
			continue;
		}
		if (s.isDirectory()) {
			out.push(...walkServerFiles(full));
		} else if (entry === '+server.ts') {
			out.push(full);
		}
	}
	return out;
}

const policyEngineFiles = walkServerFiles(join(ROUTES_ROOT, 'policy-engine'));
const artifactFamilyFiles = walkServerFiles(join(ROUTES_ROOT, 'policies'))
	// Only the per-artifact routes (parameterized) — the seed/upload/list
	// routes at /api/admin/policies/{seed,upload} are non-parameterized and
	// audited under different rubrics (DX-4 / Zod families).
	.filter((p) => p.includes('[artifact_id]'));

const allFamilyFiles = [...policyEngineFiles, ...artifactFamilyFiles];

/** Pretty path for assertion messages (relative to repo root). */
function rel(p: string): string {
	return relative(process.cwd(), p).replace(/\\/g, '/');
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('SEC-5: admin/policy-engine + admin/policies/[artifact_id] BOLA gate parity', () => {
	it('discovers the expected route family (sanity check — fails loudly if directories move)', () => {
		// If this fails, the directory structure changed — update the test, then
		// re-confirm every new route uses the canonical gate pair.
		expect(policyEngineFiles.length).toBeGreaterThanOrEqual(20);
		expect(artifactFamilyFiles.length).toBeGreaterThanOrEqual(6);
	});

	// One test per file gives crystal-clear "which route regressed" output in CI.
	for (const file of allFamilyFiles) {
		const relPath = rel(file);
		describe(relPath, () => {
			const source = readFileSync(file, 'utf-8');

			it('imports requireRoleApi from $lib/server/guards', () => {
				// Match either explicit named import or destructured import line.
				// Allows for additional imports on the same line.
				const importRegex =
					/import\s*\{[^}]*\brequireRoleApi\b[^}]*\}\s*from\s*['"]\$lib\/server\/guards(?:\.js)?['"]/;
				expect(source, `${relPath} must import requireRoleApi`).toMatch(importRegex);
			});

			it('imports requireAdminPermission from $lib/server/guards', () => {
				const importRegex =
					/import\s*\{[^}]*\brequireAdminPermission\b[^}]*\}\s*from\s*['"]\$lib\/server\/guards(?:\.js)?['"]/;
				expect(source, `${relPath} must import requireAdminPermission`).toMatch(importRegex);
			});

			it('calls requireRoleApi(locals, "admin") inside every exported handler', () => {
				// Find each handler body. Handlers are exported as
				// `export const <METHOD>: RequestHandler = async (...) => { ... };`
				// We capture from each `export const` of an HTTP method through to
				// the matching closing brace at zero nesting, then assert the body
				// contains the gate call.
				const handlerRegex = /export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*:/g;
				const matches = [...source.matchAll(handlerRegex)];
				expect(matches.length, `${relPath} has at least one HTTP handler`).toBeGreaterThan(0);

				for (const match of matches) {
					const method = match[1];
					const handlerStart = match.index!;
					// Heuristic body slice: take the next ~600 chars. Real handler
					// bodies place the gate within the first ~10 lines, so this is
					// more than enough. We then assert the gate string appears.
					const slice = source.slice(handlerStart, handlerStart + 600);
					expect(
						slice,
						`${relPath} ${method} handler must call requireRoleApi(locals, 'admin') at the top`
					).toMatch(/requireRoleApi\s*\(\s*locals\s*,\s*['"]admin['"]\s*\)/);
				}
			});

			it('calls requireAdminPermission with a recognized permission inside every handler', () => {
				const handlerRegex = /export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*:/g;
				const matches = [...source.matchAll(handlerRegex)];

				for (const match of matches) {
					const method = match[1];
					const handlerStart = match.index!;
					const slice = source.slice(handlerStart, handlerStart + 800);
					expect(
						slice,
						`${relPath} ${method} handler must call requireAdminPermission(locals, '<perm>')`
					).toMatch(
						/requireAdminPermission\s*\(\s*locals\s*,\s*['"](rule_authoring|system_settings|qa_view|qa_write|user_management)['"]\s*\)/
					);
				}
			});
		});
	}

	// ── Spot-check the two routes audited this batch (S105 close) ─────────────

	describe('S105 spot-check — newly-audited routes', () => {
		it('admin/policy-engine/comments/[id]/resolve gates POST before any DB write', () => {
			const file = join(
				ROUTES_ROOT,
				'policy-engine',
				'comments',
				'[id]',
				'resolve',
				'+server.ts'
			);
			const src = readFileSync(file, 'utf-8');
			// The role gate MUST appear BEFORE the first ReviewComments mutation.
			const gateIdx = src.indexOf("requireRoleApi(locals, 'admin')");
			const writeIdx = src.indexOf('ReviewComments.updateOne');
			expect(gateIdx, 'requireRoleApi must be present').toBeGreaterThan(-1);
			expect(writeIdx, 'ReviewComments.updateOne must be present').toBeGreaterThan(-1);
			expect(gateIdx).toBeLessThan(writeIdx);
		});

		it('admin/policies/[artifact_id] gates GET before any DB read', () => {
			const file = join(ROUTES_ROOT, 'policies', '[artifact_id]', '+server.ts');
			const src = readFileSync(file, 'utf-8');
			const gateIdx = src.indexOf("requireRoleApi(locals, 'admin')");
			const readIdx = src.indexOf('LenderRuleArtifacts.findOne');
			expect(gateIdx).toBeGreaterThan(-1);
			expect(readIdx).toBeGreaterThan(-1);
			expect(gateIdx).toBeLessThan(readIdx);
		});
	});
});
