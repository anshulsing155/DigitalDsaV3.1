/**
 * DATA-2 — Privacy contract: every OutreachVault write must go through
 * buildVaultEntry().
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md §2 invariant 1 — "No save
 * without uploaded consent doc — the API returns 400 if consent_doc_ref is
 * absent. No exceptions, no deferred upload."
 *
 * buildVaultEntry() is the ONLY sanctioned constructor for a vault entry —
 * it applies the C1–C3 consent gates, generates the HMAC revocation token,
 * and assembles the audit-clean schema. A second insertOne site that
 * bypassed it could silently write entries without consent → DPDP §6 violation.
 *
 * Mirror of DATA-1's vaultWritePathCheck.test.ts. Static scan, runs in <100 ms,
 * no Mongo or SvelteKit runtime needed.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

/**
 * Files allowed to reference `OutreachVault.insertOne` without an
 * accompanying `buildVaultEntry(` call. Tests + this assertion file only.
 */
const ALLOWLIST = new Set<string>([
	// Test files that mock the collection rather than performing real inserts.
	'src/lib/testing/__tests__/data2/vaultWritePathCheck.test.ts'
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

describe('DATA-2: every vault write must go through buildVaultEntry()', () => {
	it('finds the production write site at /api/dsa/btdc-vault', () => {
		const handler = readFileSync(
			join(SRC_ROOT, 'routes', 'api', 'dsa', 'btdc-vault', '+server.ts'),
			'utf-8'
		);
		expect(handler).toMatch(/OutreachVault\.insertOne/);
		expect(handler).toMatch(/buildVaultEntry\s*\(/);
	});

	it('every non-allowlisted file with OutreachVault.insertOne also calls buildVaultEntry', () => {
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

			const insertIdx = content.search(/OutreachVault\.insertOne\s*\(/);
			if (insertIdx < 0) continue;

			const buildIdx = content.search(/buildVaultEntry\s*\(/);
			if (buildIdx < 0 || buildIdx > insertIdx) {
				violations.push(relPath);
			}
		}

		expect(
			violations,
			`Privacy regression: OutreachVault.insertOne() called without buildVaultEntry() in:\n${violations.join(
				'\n'
			)}\n→ Add the file to ALLOWLIST if it's a test, or route the write through buildVaultEntry() to guarantee the consent gates fire.`
		).toEqual([]);
	});
});
