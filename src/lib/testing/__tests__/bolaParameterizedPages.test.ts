/**
 * SEC-5 — BOLA regression net for parameterized SSR-load pages.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * What this guards against
 * ------------------------
 * Every parameterized `+page.server.ts` (URL contains a `[param]` segment) is
 * potentially a BOLA surface — the same risk shape as parameterized API
 * routes. The SEC-5 closure audit on 2026-05-19 walked all 23 parameterized
 * SSR loads and found exactly one real gap: `dashboard/rm/review/[version_id]`
 * loaded a `PolicyVersion` and emitted the policy fields into HTML for any
 * authenticated RM — even RMs without an active assignment for that version's
 * lender, leaking unapproved cross-bank policy drafts. That was Finding R1
 * (fix shipped in commit `443b5ca2`).
 *
 * The class of regression we're catching: a future contributor copy-pastes
 * an SSR-load function from a sibling, forgets the scoping check, and ships.
 * Type-check passes, tests pass, the page renders for everyone authenticated.
 *
 * Approach: category-based rules
 * ------------------------------
 * Different families use different (legitimate) scoping primitives. Instead
 * of one universal regex, we partition the 23 files by path prefix and assert
 * each family's expected primitive(s) are present. The test stays robust to
 * benign refactors (e.g., renaming a local variable) but catches the regression
 * shape ("the gate line disappeared").
 *
 * Categories
 * ----------
 *  - `dashboard/admin/.../[X]/`                       requireRole(locals, 'admin')  (admin = global by design)
 *  - `dashboard/dsa/cases/[case_id]/...`              Pattern 2 layout-inheritance OR own verifyCaseOwnership / Cases.findOne+dsa_id
 *  - `dashboard/dsa/team/[member_id]`                 resolveDsaId + Teams query keyed by owner_dsa_id
 *  - `dashboard/rm/cases/[case_id]`                   CommunicationThreads scope (RM must have a thread for the case)
 *  - `dashboard/rm/policies/[lenderId]/[product]/...` RmLenderAssignments + rmUserId (admin bypass allowed)
 *  - `dashboard/rm/policy-capture/[capture_id]`       PolicyCaptures filter by rm_id
 *  - `dashboard/rm/review/[version_id]`               RmLenderAssignments + rmUserId (R1 fix anchor)
 *  - `dashboard/rm/submissions/[submission_id]`       RMSubmissions filter by rm_id
 *  - `f/[token]`                                      validateShareLink (public + token validation)
 *  - `team-invite/[code]`                             invite_code lookup (public + code-bound)
 *
 * Any new parameterized SSR load added to the repo that doesn't match one of
 * these categories will fail the catch-all "unknown family" test — forcing
 * the contributor to either categorize it here or justify why it has no BOLA
 * shape (e.g., a public marketing page).
 *
 * Why not HTTP round-trip
 * -----------------------
 * Same rationale as the sibling `bolaCasesApiRoutes.test.ts`:
 *   - cheap (~150ms in CI)
 *   - catches the regression at source — the only place a copy-paste creates it
 *   - no Mongo / no SvelteKit runtime needed
 *
 * The behavior of `requireRole`, `RmLenderAssignments.findOne(...)`, etc. is
 * already covered by integration tests. This file's job is parity coverage —
 * is every parameterized page in the right family actually INVOKING its gate?
 *
 * Last audited: 2026-05-19 (SEC-5 closure at 147 routes / 23 SSR loads).
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// ── File discovery: all parameterized `+page.server.ts` files ────────────────

const ROUTES_ROOT = join(process.cwd(), 'src', 'routes');

function walkPageServerFiles(dir: string): string[] {
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
			out.push(...walkPageServerFiles(full));
		} else if (entry === '+page.server.ts') {
			out.push(full);
		}
	}
	return out;
}

const allPageServerFiles = walkPageServerFiles(ROUTES_ROOT);

/** A file is parameterized if its path contains a `[param]` segment. */
const parameterizedFiles = allPageServerFiles.filter((p) => /\[[^\]]+\]/.test(p));

function relPath(p: string): string {
	return relative(process.cwd(), p).replace(/\\/g, '/');
}

// ── Category rules ──────────────────────────────────────────────────────────

interface CategoryRule {
	/** Human label for assertion messages. */
	name: string;
	/** Path-fragment match (forward-slash form) — first match wins. */
	pathMatches: (rel: string) => boolean;
	/** Source must contain at least one of these regexes (OR semantics). */
	expectedPrimitives: { label: string; regex: RegExp }[];
	/** If true, the rule accepts files that have no own check (Pattern 2 inheritance). */
	allowLayoutInheritance?: boolean;
}

const CATEGORY_RULES: CategoryRule[] = [
	{
		name: 'admin parameterized — global admin role gate',
		pathMatches: (r) => r.startsWith('src/routes/dashboard/admin/') && /\[[^\]]+\]/.test(r),
		expectedPrimitives: [
			{
				label: "requireRole(locals, 'admin')",
				regex: /requireRole\s*\(\s*locals\s*,\s*['"]admin['"]\s*\)/
			},
			{
				label: "requireRoleApi(locals, 'admin')",
				regex: /requireRoleApi\s*\(\s*locals\s*,\s*['"]admin['"]\s*\)/
			}
		]
	},
	{
		name: 'DSA case sub-pages — Pattern 2 layout inheritance or own gate',
		pathMatches: (r) =>
			r.startsWith('src/routes/dashboard/dsa/cases/[case_id]/') &&
			r.endsWith('/+page.server.ts'),
		allowLayoutInheritance: true,
		expectedPrimitives: [
			{ label: 'verifyCaseOwnership(...)', regex: /verifyCaseOwnership\s*\(/ },
			{
				label: 'Cases.findOne({ case_id, dsa_id })',
				regex: /Cases\.findOne\s*\(\s*\{[^}]*\bcase_id\b[^}]*\bdsa_id\b/
			}
		]
	},
	{
		name: 'DSA team member detail — team-scoped lookup',
		pathMatches: (r) => r === 'src/routes/dashboard/dsa/team/[member_id]/+page.server.ts',
		expectedPrimitives: [
			{
				label: 'Teams.findOne({ owner_dsa_id })',
				regex: /Teams\.findOne\s*\(\s*\{[^}]*\bowner_dsa_id\b/
			}
		]
	},
	{
		name: 'RM case detail — CommunicationThread scope',
		pathMatches: (r) => r === 'src/routes/dashboard/rm/cases/[case_id]/+page.server.ts',
		expectedPrimitives: [
			// Either explicit thread lookup or RM-scoped case query.
			{
				label: 'CommunicationThreads filter',
				regex: /CommunicationThreads\.(findOne|find)\s*\(/
			},
			{
				label: 'Cases.findOne with rm_id scope',
				regex: /Cases\.findOne\s*\(\s*\{[^}]*\brm_id\b/
			}
		]
	},
	{
		name: 'RM policies — lender-assignment gate',
		pathMatches: (r) =>
			r.startsWith('src/routes/dashboard/rm/policies/[lenderId]/[product]') &&
			r.endsWith('/+page.server.ts'),
		expectedPrimitives: [
			{
				label: 'RmLenderAssignments.findOne({ rmUserId, lenderId })',
				regex: /RmLenderAssignments\.findOne\s*\(\s*\{[^}]*\brmUserId\b/
			}
		]
	},
	{
		name: 'RM policy-capture detail — rm-scoped lookup',
		pathMatches: (r) =>
			r === 'src/routes/dashboard/rm/policy-capture/[capture_id]/+page.server.ts',
		expectedPrimitives: [
			{
				label: 'PolicyCaptures.findOne({ rm_id })',
				regex: /PolicyCaptures\.findOne\s*\(\s*\{[^}]*\brm_id\b/
			}
		]
	},
	{
		name: 'RM review page — lender-assignment gate (R1 fix)',
		pathMatches: (r) => r === 'src/routes/dashboard/rm/review/[version_id]/+page.server.ts',
		expectedPrimitives: [
			{
				label: 'RmLenderAssignments.findOne({ rmUserId })',
				regex: /RmLenderAssignments\.findOne\s*\(\s*\{[^}]*\brmUserId\b/
			}
		]
	},
	{
		name: 'RM submission detail — rm-scoped lookup',
		pathMatches: (r) => r === 'src/routes/dashboard/rm/submissions/[submission_id]/+page.server.ts',
		expectedPrimitives: [
			{
				label: 'RMSubmissions.findOne({ rm_id })',
				regex: /RMSubmissions\.findOne\s*\(\s*\{[^}]*\brm_id\b/
			}
		]
	},
	{
		name: 'Public share link — token validation',
		pathMatches: (r) => r === 'src/routes/f/[token]/+page.server.ts',
		expectedPrimitives: [
			{ label: 'validateShareLink(token)', regex: /validateShareLink\s*\(/ }
		]
	},
	{
		name: 'Public team invite — code lookup',
		pathMatches: (r) => r === 'src/routes/team-invite/[code]/+page.server.ts',
		expectedPrimitives: [
			{
				label: 'invite_code in Teams filter',
				regex: /Teams\.findOne\s*\(\s*\{[^}]*invite_code/
			}
		]
	}
];

function findRule(rel: string): CategoryRule | undefined {
	return CATEGORY_RULES.find((r) => r.pathMatches(rel));
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('SEC-5: parameterized +page.server.ts BOLA scoping parity', () => {
	it('discovers the expected parameterized SSR surface (sanity check)', () => {
		// The SEC-5 audit recorded 23 parameterized SSR loads on 2026-05-19. If
		// this number drifts, audit the new files and update the rules below.
		expect(parameterizedFiles.length).toBeGreaterThanOrEqual(20);
	});

	it('every parameterized SSR load matches a known category (catch-all)', () => {
		const unmatched: string[] = [];
		for (const file of parameterizedFiles) {
			const rel = relPath(file);
			if (!findRule(rel)) unmatched.push(rel);
		}
		expect(
			unmatched.length,
			`Unknown parameterized SSR-load family:\n${unmatched.join(
				'\n'
			)}\n→ Either add a CATEGORY_RULES entry here with the expected scoping primitive, or document why this page has no BOLA shape.`
		).toBe(0);
	});

	// Per-file gate check.
	for (const file of parameterizedFiles) {
		const rel = relPath(file);
		const rule = findRule(rel);
		if (!rule) continue; // covered by the catch-all above

		describe(rel, () => {
			const source = readFileSync(file, 'utf-8');

			it(`invokes a recognized scoping primitive [${rule.name}]`, () => {
				const matched = rule.expectedPrimitives.find((p) => p.regex.test(source));

				if (matched) {
					expect(matched).toBeTruthy();
					return;
				}

				// No primitive matched. If the rule allows layout inheritance, the
				// file is permitted to delegate scoping to its `+layout.server.ts`.
				// We accept that only if the file ALSO contains no DB-write call
				// that could leak the resource (read-only display logic).
				if (rule.allowLayoutInheritance) {
					// Layout-inherited files should rely on `parent()` data instead
					// of re-querying. A heuristic check: if the file does NOT
					// import from `$lib/database/mongo`, it can't open a BOLA gap.
					// (Files like dsa/cases/[case_id]/+page.server.ts pass on this
					// path — they read TimelineEvents but only to supplement the
					// parent-supplied caseData, never to gate access.)
					const importsMongo = /\$lib\/database\/mongo/.test(source);
					if (!importsMongo) return; // safe: read-only, no DB access

					// Imports MongoDB but still no own gate — verify the file uses
					// `await parent()` to inherit the layout's scoped caseData.
					const usesParent = /\bawait\s+parent\s*\(/.test(source);
					if (usesParent) return; // safe: layout-inherited
				}

				// Hard failure with a useful message.
				const expectedLabels = rule.expectedPrimitives.map((p) => p.label).join(' OR ');
				expect.fail(
					`${rel} missing expected scoping primitive for category "${rule.name}". Expected one of: ${expectedLabels}.\n→ This page is parameterized but has no detectable BOLA gate. Either add the expected gate, or amend the rule if a new acceptable primitive was introduced.`
				);
			});
		});
	}

	// ── Anchor for the R1 fix shipped 2026-05-19 (commit 443b5ca2) ────────────

	describe('R1 fix anchor — rm/review/[version_id] must gate before policy disclosure', () => {
		it('RmLenderAssignments check precedes the human-readable doc render', () => {
			const file = join(
				ROUTES_ROOT,
				'dashboard',
				'rm',
				'review',
				'[version_id]',
				'+page.server.ts'
			);
			let src: string;
			try {
				src = readFileSync(file, 'utf-8');
			} catch {
				return;
			}
			const gateIdx = src.search(/RmLenderAssignments\.findOne\s*\(/);
			const renderIdx = src.search(/generatePolicyDoc\s*\(/);
			if (gateIdx > -1 && renderIdx > -1) {
				expect(
					gateIdx,
					'RmLenderAssignments gate must precede the policy-doc render — otherwise cross-RM disclosure'
				).toBeLessThan(renderIdx);
			}
		});
	});
});
