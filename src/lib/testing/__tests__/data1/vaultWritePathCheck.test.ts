/**
 * DATA-1 — Privacy contract: every LeadAttributionVault write site must
 * go through buildVaultEntry().
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §13 (Risks table, row 1).
 *
 * The vault's privacy guarantee depends entirely on bucketing — flat
 * numbers stripped from addresses, prices floored to ₹10k, dates reduced
 * to quarter granularity. A second insertOne call that bypassed the
 * bucketing helper (e.g., a future contributor copy-pastes an insert
 * from a different collection) would silently leak un-bucketed values.
 *
 * This static-scan test asserts the invariant:
 *   - Every `LeadAttributionVault.insertOne(...)` site in src/ also has
 *     a `buildVaultEntry(` call earlier in the same file
 *   - OR the file is on a small explicit allowlist (tests, this file itself)
 *
 * The "earlier in the same file" check is lexical, not flow-sensitive,
 * but matches the realistic regression shape: when someone adds a new
 * write path, they either start from the bucketed helper (safe) or
 * write a raw insertOne (caught here).
 *
 * Why static-scan rather than dynamic mock
 * ----------------------------------------
 * Mocking the collection's insertOne to assert it's only called from a
 * specific stack would require integration tests with the full handler
 * loaded — far heavier. The static check has the right cost profile for
 * a contract that almost never changes (the helper is the only sanctioned
 * write API, and that won't change without an ADR + this test being
 * updated).
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

/**
 * Files that are allowed to reference `LeadAttributionVault.insertOne`
 * without an accompanying `buildVaultEntry(` call. Only test files
 * (which mock the call) and this assertion file itself.
 */
const ALLOWLIST = new Set<string>([
	// Test files mocking the call shape — they don't perform real inserts.
	'src/lib/testing/__tests__/data1/leadVaultEndpoint.test.ts',
	// This file itself references the string by design.
	'src/lib/testing/__tests__/data1/vaultWritePathCheck.test.ts'
]);

function walkSourceFiles(dir: string): string[] {
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
			// Skip _archive directories — historical code never in any execution path.
			if (entry === '_archive' || entry === '_archived') continue;
			out.push(...walkSourceFiles(full));
		} else if (entry.endsWith('.ts') || entry.endsWith('.svelte')) {
			out.push(full);
		}
	}
	return out;
}

function rel(p: string): string {
	return relative(process.cwd(), p).replace(/\\/g, '/');
}

describe('DATA-1: every vault write must go through buildVaultEntry()', () => {
	it('finds the production write site at /api/dsa/lead-vault', () => {
		// Sanity: the canonical write site MUST contain both symbols.
		const handler = readFileSync(
			join(SRC_ROOT, 'routes', 'api', 'dsa', 'lead-vault', '+server.ts'),
			'utf-8'
		);
		expect(handler).toMatch(/LeadAttributionVault\.insertOne/);
		expect(handler).toMatch(/buildVaultEntry\s*\(/);
	});

	it('every non-allowlisted file with LeadAttributionVault.insertOne also calls buildVaultEntry', () => {
		const allFiles = walkSourceFiles(SRC_ROOT);
		const violations: string[] = [];

		for (const file of allFiles) {
			const relPath = rel(file);
			if (ALLOWLIST.has(relPath)) continue;

			let content: string;
			try {
				content = readFileSync(file, 'utf-8');
			} catch {
				continue;
			}

			const insertIdx = content.search(/LeadAttributionVault\.insertOne\s*\(/);
			if (insertIdx < 0) continue;

			const buildIdx = content.search(/buildVaultEntry\s*\(/);
			// Bucket-helper call must exist AND appear before the insertOne
			// (otherwise the caller is building the entry by hand and only
			// invoking the helper as a side-effect later).
			if (buildIdx < 0 || buildIdx > insertIdx) {
				violations.push(relPath);
			}
		}

		expect(
			violations,
			`Privacy regression: LeadAttributionVault.insertOne() called without buildVaultEntry() in:\n${violations.join(
				'\n'
			)}\n→ Add the file to ALLOWLIST if it's a test, or route the write through buildVaultEntry() to guarantee bucketing.`
		).toEqual([]);
	});
});
