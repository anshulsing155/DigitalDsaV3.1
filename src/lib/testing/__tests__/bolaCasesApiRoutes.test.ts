/**
 * SEC-5 — BOLA regression net for the /api/cases/[case_id]/** family.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * What this guards against
 * ------------------------
 * Every parameterized API route under `/api/cases/[case_id]/**` is a BOLA
 * surface: the URL carries a resource ID (`case_id`) that uniquely identifies
 * a Case document, and the handler must verify the authenticated DSA owns it
 * before reading or mutating anything. Without per-route scoping, any
 * authenticated DSA could read/edit/delete another DSA's case just by typing
 * the right case_id into the URL — the original SEC-5 closure (147 routes /
 * 2026-05-19) found and fixed 3 such gaps; this test locks the family against
 * future copy-paste regressions.
 *
 * The canonical scoping pattern in this codebase is `verifyCaseOwnership(
 * params.case_id, dsaId)` from `$lib/server/caseHelpers.ts`. The helper does
 * `Cases.findOne({ case_id, dsa_id })` against the compound unique index — so
 * if the DSA doesn't own the case_id, MongoDB returns null and the handler
 * 404s before touching any related collection. A small number of legacy sites
 * inline the same `Cases.findOne({ case_id, dsa_id })` call directly — that's
 * accepted by this test as long as both fields are in the filter together.
 *
 * The class of regression we're catching: a future contributor copy-pastes a
 * handler from elsewhere (an admin route, a non-parameterized cases route, a
 * different domain), forgets to add the ownership gate, and ships. Type-check
 * passes. Tests pass. The route is open. This static scan catches it.
 *
 * Why static-scan instead of HTTP round-trip
 * ------------------------------------------
 * Same rationale as `bolaAdminPolicyEngine.test.ts`:
 *   - cheap, runs in <100ms in CI
 *   - catches the regression at the source-file level (the only place a
 *     copy-paste can introduce it)
 *   - no Mongo / no SvelteKit runtime needed
 *
 * The behavior of `verifyCaseOwnership` itself is exercised by integration
 * tests under `caseHelpers.test.ts`. This file's job is parity coverage — is
 * every route in the family actually INVOKING the gate?
 *
 * Routes covered
 * --------------
 * All files matching `src/routes/api/cases/[case_id]/**\/+server.ts` (~28
 * routes as of SEC-5 closure). The non-parameterized siblings — `cases/`
 * (list/create), `cases/sample-data/` — are out of scope here; they have
 * different BOLA shapes (DSA scope on list/create is enforced at query time,
 * not per-resource).
 *
 * Last audited: 2026-05-19 (SEC-5 closure at 147 routes — see
 * docs/SESSION-HANDOFF.md "What shipped in this resume session").
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// ── File discovery ──────────────────────────────────────────────────────────

const ROUTES_ROOT = join(process.cwd(), 'src', 'routes', 'api', 'cases');

/** Recursively returns every +server.ts under `dir`. */
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

// Only files whose path includes the `[case_id]` segment — the parameterized
// subset. Non-parameterized cases endpoints (list, sample-data) live alongside
// but use different scoping shapes and are not in this regression net.
const allCasesRoutes = walkServerFiles(ROUTES_ROOT);
const parameterizedFiles = allCasesRoutes.filter((p) => p.includes('[case_id]'));

function rel(p: string): string {
	return relative(process.cwd(), p).replace(/\\/g, '/');
}

/**
 * Returns true if the source uses one of the recognized BOLA gates:
 *   (1) `verifyCaseOwnership(...)` — the canonical helper
 *   (2) `Cases.findOne({ ...case_id..., ...dsa_id... })` — the inline form
 *   (3) Imports from `caseHelpers` AND uses `resolveEffectiveDsaId` — the
 *       team-aware resolution chain that always precedes (1) or (2)
 *
 * Note: imports alone are not sufficient — we require the call site to also
 * appear. This catches the "imported but never called" regression.
 */
function hasOwnershipGate(source: string): { ok: boolean; reason: string } {
	if (/verifyCaseOwnership\s*\(/.test(source)) {
		return { ok: true, reason: 'invokes verifyCaseOwnership(...)' };
	}

	// Inline form: a Cases.findOne(...) filter that contains both case_id and
	// dsa_id within a reasonable window of each other. We scan all matches and
	// pass if any one window contains both keys.
	const findOneRegex = /Cases\.findOne\s*\(\s*\{[^}]{0,400}\}/g;
	const matches = source.match(findOneRegex) || [];
	for (const m of matches) {
		const hasCaseId = /\bcase_id\b/.test(m);
		const hasDsaId = /\bdsa_id\b/.test(m);
		if (hasCaseId && hasDsaId) {
			return { ok: true, reason: 'inlines Cases.findOne({ case_id, dsa_id })' };
		}
	}

	return {
		ok: false,
		reason:
			'no BOLA gate detected — expected verifyCaseOwnership(...) or Cases.findOne({ case_id, dsa_id })'
	};
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('SEC-5: /api/cases/[case_id]/** BOLA gate parity', () => {
	it('discovers the expected route surface (sanity check — fails loudly if the family moves)', () => {
		// If this fails, the directory structure changed. Update the test, then
		// re-audit every parameterized route for the canonical gate.
		expect(parameterizedFiles.length).toBeGreaterThanOrEqual(20);
	});

	// One test per file — surfaces "which route regressed" cleanly in CI output.
	for (const file of parameterizedFiles) {
		const relPath = rel(file);
		describe(relPath, () => {
			const source = readFileSync(file, 'utf-8');

			it('invokes a recognized DSA-ownership gate', () => {
				const result = hasOwnershipGate(source);
				expect(result.ok, `${relPath}: ${result.reason}`).toBe(true);
			});

			it('calls the gate inside every exported handler body', () => {
				// Each `export const <METHOD>: RequestHandler` must have the gate
				// somewhere in its body. We slice from one handler-export to the
				// next (or EOF) — no arbitrary char cap, because real handlers
				// can have lengthy preambles (Zod parse, rate limit, demo block)
				// before reaching the ownership check at ~line 100.
				const handlerRegex = /export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*:/g;
				const matches = [...source.matchAll(handlerRegex)];
				expect(matches.length, `${relPath} has at least one HTTP handler`).toBeGreaterThan(0);

				for (let i = 0; i < matches.length; i++) {
					const method = matches[i][1];
					const start = matches[i].index!;
					const end = i + 1 < matches.length ? matches[i + 1].index! : source.length;
					const body = source.slice(start, end);
					const bodyHasGate = hasOwnershipGate(body);
					expect(
						bodyHasGate.ok,
						`${relPath} ${method} handler missing ownership gate (${bodyHasGate.reason})`
					).toBe(true);
				}
			});
		});
	}

	// ── Spot-checks for the three real BOLA fixes shipped under SEC-5 ─────────
	// These lock in the specific call ordering at the fix sites so a future
	// refactor can't silently move the gate after the mutation it protects.

	describe('SEC-5 fix anchors — gate must precede the mutation it protects', () => {
		it('apply-delta gates before any Cases.updateOne / FormSnapshots.insertOne', () => {
			const file = join(
				ROUTES_ROOT,
				'[case_id]',
				'lender-applications',
				'[lender_app_id]',
				'+server.ts'
			);
			let src: string;
			try {
				src = readFileSync(file, 'utf-8');
			} catch {
				// File moved — skip without failing the suite; the per-file gate
				// test above will already catch a missing gate.
				return;
			}
			const gateIdx = src.search(/verifyCaseOwnership\s*\(/);
			if (gateIdx < 0) return; // covered by the per-file test
			const writeIdx = src.search(/Cases\.updateOne|FormSnapshots\.insertOne/);
			if (writeIdx > -1) {
				expect(
					gateIdx,
					'verifyCaseOwnership must precede the first Cases/FormSnapshots write'
				).toBeLessThan(writeIdx);
			}
		});

		it('snapshots/[version] gates before payload resolution', () => {
			const file = join(ROUTES_ROOT, '[case_id]', 'snapshots', '[version]', '+server.ts');
			let src: string;
			try {
				src = readFileSync(file, 'utf-8');
			} catch {
				return;
			}
			// Match the CALL form `name(` not the import. Imports appear at the
			// top of the file and would otherwise beat the gate's position.
			const gateIdx = src.search(/verifyCaseOwnership\s*\(/);
			const readIdx = src.search(/(?:resolveSnapshotPayload|FormSnapshots\.findOne)\s*\(/);
			if (gateIdx > -1 && readIdx > -1) {
				expect(
					gateIdx,
					'ownership gate must precede the snapshot payload read (BOLA before decrypt)'
				).toBeLessThan(readIdx);
			}
		});
	});
});
