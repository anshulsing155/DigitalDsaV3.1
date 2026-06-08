/**
 * DATA-4 — Privacy contract: no PII field name may appear in analytics code.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md §5 "Fields that NEVER
 * appear" + §9 privacy contract test.
 *
 * The analytics warehouse is non-PII by construction. This static scan walks
 * every file under src/lib/server/analytics/ — the only code that builds rows
 * destined for `analytics_cases` — and fails if any forbidden field name
 * appears. Belt-and-suspenders: it stops a future contributor from quietly
 * widening the de-identified schema to carry a real name, mobile, PAN, etc.
 *
 * Mirror of DATA-1/DATA-2's vaultWritePathCheck — static, runs in <100 ms,
 * no Mongo or SvelteKit runtime needed.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ANALYTICS_ROOT = join(process.cwd(), 'src', 'lib', 'server', 'analytics');

/**
 * Forbidden field-name tokens (spec §5). Matched as exact snake_case tokens so
 * prose like "employer name" or a camelCase param `employerName` does NOT
 * false-positive — only the actual stored-field spellings are banned.
 */
const FORBIDDEN_TOKENS = [
	'borrower_name',
	'borrower_mobile',
	'borrower_email',
	'borrower_pan',
	'borrower_aadhaar',
	'borrower_bank_account',
	'borrower_address_line1',
	'employer_name',
	'optional_contact'
];

function walkTsFiles(dir: string): string[] {
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
			out.push(...walkTsFiles(full));
		} else if (entry.endsWith('.ts')) {
			out.push(full);
		}
	}
	return out;
}

function rel(p: string): string {
	return relative(process.cwd(), p).replace(/\\/g, '/');
}

describe('DATA-4: analytics code carries no forbidden PII field names', () => {
	it('scans a non-empty set of analytics source files', () => {
		// Guard against the scan silently passing because the directory moved.
		expect(walkTsFiles(ANALYTICS_ROOT).length).toBeGreaterThan(0);
	});

	it('contains none of the forbidden field tokens', () => {
		const files = walkTsFiles(ANALYTICS_ROOT);
		const violations: string[] = [];

		for (const file of files) {
			let content: string;
			try {
				content = readFileSync(file, 'utf-8');
			} catch {
				continue;
			}
			for (const token of FORBIDDEN_TOKENS) {
				if (content.includes(token)) {
					violations.push(`${rel(file)} contains forbidden token "${token}"`);
				}
			}
		}

		expect(
			violations,
			`Privacy regression — forbidden PII field name(s) found in analytics code:\n${violations.join(
				'\n'
			)}\n→ analytics_cases is non-PII by construction (spec §5). Remove the field, or if it is genuinely de-identified, give it a non-PII name.`
		).toEqual([]);
	});
});
