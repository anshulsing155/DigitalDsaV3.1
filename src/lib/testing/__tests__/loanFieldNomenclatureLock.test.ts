/**
 * Loan Field Nomenclature — regression lock.
 *
 * The 2026-05-31 rename retired three legacy field names in favor of the
 * four-field model (loanName / loanType / facilityType / loanVariant):
 *
 *   - PlotLoanActivity → loanType (Plot scope)
 *   - LAPType          → facilityType (LAP facility)
 *   - unSecureLoanType → facilityType (PL/BL/Prof facility)
 *
 * This test locks the post-rename state: no live form-config code should
 * reuse the legacy names as JSON-Logic var refs.
 *
 * Regex shape (per CLAUDE.md Pitfall #66): target USAGE patterns, not
 * bare identifiers. Bare-identifier matches would trip on
 * institutional-memory comments and ADR cross-references — which we
 * want to PRESERVE.
 *
 * Allowed (intentional):
 *   - Archived schema/route directories (_archive/, _archived/) — historical
 *   - Pre-migration snapshot fixtures (*.pre-migration.json) — record old shape
 *   - Comments anywhere (institutional memory)
 *
 * Forbidden (regression):
 *   - { var: 'LegacyName' } in TS JSON-Logic in src/lib/config/
 *   - { "var": "LegacyName" } in JSON JSON-Logic in src/lib/config/
 *
 * If this test fails, the rename has regressed. Either flip the new ref
 * to the new field name, or — if there's an explicit reason to
 * reintroduce the legacy name (lender rule doc compat, etc.) — extend
 * the allowlist here with a comment explaining why.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const CONFIG_DIR = join(REPO_ROOT, 'src/lib/config');

const LEGACY_NAMES = ['PlotLoanActivity', 'LAPType', 'unSecureLoanType'] as const;

/** Walks a directory tree and yields every .ts and .json file, skipping archives. */
function* walkConfigFiles(dir: string): Generator<string> {
	for (const entry of readdirSync(dir)) {
		// Skip archived subdirectories.
		if (entry === '_archive' || entry === '_archived') continue;
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			yield* walkConfigFiles(full);
		} else if (stat.isFile() && (entry.endsWith('.ts') || entry.endsWith('.json'))) {
			yield full;
		}
	}
}

/** Builds a regex matching { var: 'NAME' } and { "var": "NAME" } in JSON-Logic. */
function makeJsonLogicVarPattern(name: string): RegExp {
	return new RegExp(`["']var["']\\s*:\\s*["']${name}["']`);
}

describe('loan field nomenclature — regression lock', () => {
	it.each(LEGACY_NAMES)(
		"no live JSON-Logic { var: '%s' } reference in src/lib/config",
		(legacyName) => {
			const pattern = makeJsonLogicVarPattern(legacyName);
			const hits: string[] = [];
			for (const file of walkConfigFiles(CONFIG_DIR)) {
				const content = readFileSync(file, 'utf8');
				if (pattern.test(content)) {
					hits.push(file.replace(REPO_ROOT, '.'));
				}
			}
			if (hits.length > 0) {
				throw new Error(
					`Legacy JSON-Logic { var: '${legacyName}' } found in live config:\n` +
						hits.map((h) => `  - ${h}`).join('\n') +
						"\n\nThe 2026-05-31 rename retired this field. Flip to the new " +
						'name (PlotLoanActivity -> loanType, LAPType/unSecureLoanType -> ' +
						'facilityType) or move the file to _archive/.'
				);
			}
			expect(hits.length).toBe(0);
		}
	);
});
