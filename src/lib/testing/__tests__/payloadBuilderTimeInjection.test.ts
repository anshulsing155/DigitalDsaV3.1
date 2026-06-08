/**
 * Payload Builder Time Injection — source-pattern lock.
 *
 * Background:
 *   The S210 refactor (2026-06-01, TECH-DEBT-CLEANUP D-incoming-4) made the
 *   payload-building chain accept `opts?: { now?: Date }` so that time-derived
 *   fields like `loanVintageMonths` can be made deterministic for snapshot
 *   tests. The principle: time is an external dependency that must be
 *   *explicitly* declared in a function's signature, not implicitly read from
 *   the global clock. Hidden time dependencies cause:
 *
 *     - Snapshot lock tests that drift every month
 *     - Production behavior that depends on what minute the request lands
 *     - Tests that must mock `vi.setSystemTime` instead of passing the input
 *
 *   This file locks the pattern. If a future change adds a payload-builder
 *   site that reads `new Date()` / `Date.now()` without the `opts?.now ?? `
 *   fallback, this test fails — forcing the author to either inject time
 *   or document why this specific site is exempt.
 *
 *   Same source-pattern-scan style as `dualTenureBTTopup.test.ts` and
 *   `loanFieldNomenclatureLock.test.ts`.
 *
 * Files under lock (payload-building chain):
 *   - src/lib/utils/payloadBuilder/loanTransaction.ts
 *   - src/lib/utils/casePayloadBuilder.ts
 *   - src/lib/ruleEngine/payloadEnricher.ts
 *
 * Allowed (NOT flagged as violations):
 *   - Comments / docstrings
 *   - Clock-reads paired with `opts?.now ??` (or `opts.now ??`) — the canonical
 *     injection pattern
 *
 * Forbidden (regression):
 *   - Bare `new Date()` / `Date.now()` in the payload-building paths above
 *     without the `opts?.now ?? ` fallback
 *   - Removing the `opts?: { now?: Date }` parameter from the public function
 *     signatures listed below
 *
 * Per CLAUDE.md §16 Rule #16: this test locks the CANONICAL post-refactor
 * state. If a future regression introduces a hidden clock-read in these
 * files, this test fails before the bad code can land.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOAN_TRANSACTION_PATH = resolve(
	__dirname,
	'../../utils/payloadBuilder/loanTransaction.ts'
);
const CASE_PAYLOAD_BUILDER_PATH = resolve(
	__dirname,
	'../../utils/casePayloadBuilder.ts'
);
const PAYLOAD_ENRICHER_PATH = resolve(__dirname, '../../ruleEngine/payloadEnricher.ts');

describe('payload builder time injection — regression lock', () => {
	describe('function signatures accept `opts?: { now?: Date }`', () => {
		it('`buildLoanTransactionPayload` declares `opts?: { now?: Date }`', () => {
			const src = readFileSync(LOAN_TRANSACTION_PATH, 'utf-8');
			// Match the signature with the opts param. Tolerates whitespace.
			const pattern =
				/export function buildLoanTransactionPayload\s*\([\s\S]+?opts\?\s*:\s*\{\s*now\?\s*:\s*Date\s*\}/;
			expect(
				src,
				'`buildLoanTransactionPayload` must accept `opts?: { now?: Date }` to keep `loanVintageMonths` deterministic. See S210 refactor.'
			).toMatch(pattern);
		});

		it('`buildLoanPayload` declares `opts?: { now?: Date }`', () => {
			const src = readFileSync(LOAN_TRANSACTION_PATH, 'utf-8');
			const pattern =
				/export function buildLoanPayload\s*\([\s\S]+?opts\?\s*:\s*\{\s*now\?\s*:\s*Date\s*\}/;
			expect(
				src,
				'`buildLoanPayload` must accept `opts?: { now?: Date }` and pass it to `buildLoanTransactionPayload`. See S210 refactor.'
			).toMatch(pattern);
		});

		it('`buildStructuredPayload` declares `opts?: { now?: Date }`', () => {
			const src = readFileSync(LOAN_TRANSACTION_PATH, 'utf-8');
			const pattern =
				/export function buildStructuredPayload\s*\([\s\S]+?opts\?\s*:\s*\{\s*now\?\s*:\s*Date\s*\}/;
			expect(
				src,
				'`buildStructuredPayload` must accept `opts?: { now?: Date }` and pass it to `buildLoanTransactionPayload`. See S210 refactor.'
			).toMatch(pattern);
		});

		it('`buildCasePayload` declares `opts?: { now?: Date }`', () => {
			const src = readFileSync(CASE_PAYLOAD_BUILDER_PATH, 'utf-8');
			const pattern =
				/export function buildCasePayload\s*\([\s\S]+?opts\?\s*:\s*\{\s*now\?\s*:\s*Date\s*\}/;
			expect(
				src,
				'`buildCasePayload` must accept `opts?: { now?: Date }` and pass it down to `buildBalanceTransfer`. See S210 refactor.'
			).toMatch(pattern);
		});

		it('`enrichPayload` declares `opts?: { now?: Date }`', () => {
			const src = readFileSync(PAYLOAD_ENRICHER_PATH, 'utf-8');
			const pattern =
				/export function enrichPayload\s*\([\s\S]+?opts\?\s*:\s*\{\s*now\?\s*:\s*Date\s*\}/;
			expect(
				src,
				'`enrichPayload` must accept `opts?: { now?: Date }` to keep enrichment-time-derived fields deterministic. See S210 refactor.'
			).toMatch(pattern);
		});
	});

	describe('clock-reads use the `opts?.now ?? new Date()` fallback', () => {
		// Strip comments + docstrings so the scan only inspects executable code.
		// Block comments first (greedy minimum-match), then line comments.
		function stripComments(src: string): string {
			return src
				.replace(/\/\*[\s\S]*?\*\//g, '')
				.replace(/^\s*\/\/.*$/gm, '');
		}

		// A "bare clock-read" is `new Date()` or `Date.now()` that is NOT
		// preceded by the `opts?.now ??` (or `opts.now ??`) fallback within a
		// short window. The short window matters because a fallback assignment
		// looks like: `const now = opts?.now ?? new Date();`
		// Pattern: any `new Date()` / `Date.now()` NOT immediately following
		// `opts?.now ??` (or `opts.now ??`) on the same logical statement.
		function findBareClockReads(src: string): string[] {
			const stripped = stripComments(src);
			const hits: string[] = [];
			// Iterate every occurrence of new Date() or Date.now()
			const regex = /(new Date\(\)|Date\.now\(\))/g;
			let m: RegExpExecArray | null;
			while ((m = regex.exec(stripped)) !== null) {
				const idx = m.index;
				// Look back ~40 chars for the `opts?.now ??` fallback pattern.
				const preceding = stripped.slice(Math.max(0, idx - 60), idx);
				if (!/opts\??\.now\s*\?\?\s*$/.test(preceding.trimEnd() + ' ')) {
					// Also allow `opts.now ?? ` (without optional chaining) for
					// inner functions where opts is non-optional in scope.
					hits.push(stripped.slice(Math.max(0, idx - 80), idx + m[0].length));
				}
			}
			return hits;
		}

		it('`loanTransaction.ts` has no bare clock-reads', () => {
			const src = readFileSync(LOAN_TRANSACTION_PATH, 'utf-8');
			const hits = findBareClockReads(src);
			if (hits.length > 0) {
				throw new Error(
					`Found ${hits.length} unguarded clock-read(s) in loanTransaction.ts. ` +
						'Every `new Date()` / `Date.now()` in payload-building code must be ' +
						'preceded by the `opts?.now ?? ` fallback so the function is ' +
						'deterministic when callers (snapshot tests) inject `now`. ' +
						'Site(s):\n' +
						hits.map((h) => `  …${h}…`).join('\n')
				);
			}
			expect(hits.length).toBe(0);
		});

		it('`casePayloadBuilder.ts` has no bare clock-reads', () => {
			const src = readFileSync(CASE_PAYLOAD_BUILDER_PATH, 'utf-8');
			const hits = findBareClockReads(src);
			if (hits.length > 0) {
				throw new Error(
					`Found ${hits.length} unguarded clock-read(s) in casePayloadBuilder.ts. ` +
						'Every `new Date()` / `Date.now()` in payload-building code must be ' +
						'preceded by the `opts?.now ?? ` fallback. Site(s):\n' +
						hits.map((h) => `  …${h}…`).join('\n')
				);
			}
			expect(hits.length).toBe(0);
		});

		it('`payloadEnricher.ts` has no bare clock-reads', () => {
			const src = readFileSync(PAYLOAD_ENRICHER_PATH, 'utf-8');
			const hits = findBareClockReads(src);
			if (hits.length > 0) {
				throw new Error(
					`Found ${hits.length} unguarded clock-read(s) in payloadEnricher.ts. ` +
						'Every `new Date()` / `Date.now()` in enrichment code must be ' +
						'preceded by the `opts?.now ?? ` fallback. Site(s):\n' +
						hits.map((h) => `  …${h}…`).join('\n')
				);
			}
			expect(hits.length).toBe(0);
		});
	});

	describe('`toScenario` defaults to `FIXTURE_NOW`', () => {
		it('`schemaFixtureFactory.ts` exports `FIXTURE_NOW` as a frozen Date', () => {
			const src = readFileSync(
				resolve(__dirname, '../factory/schemaFixtureFactory.ts'),
				'utf-8'
			);
			expect(
				src,
				'`FIXTURE_NOW` must be exported from `schemaFixtureFactory.ts` as the default time anchor for snapshot tests.'
			).toMatch(/export const FIXTURE_NOW\s*:\s*Date\s*=\s*new Date\(/);
		});

		it('`toScenario` defaults `now` to `FIXTURE_NOW` when caller omits it', () => {
			const src = readFileSync(
				resolve(__dirname, '../factory/schemaFixtureFactory.ts'),
				'utf-8'
			);
			expect(
				src,
				'`toScenario` must default `now` to `FIXTURE_NOW` so snapshot tests stay deterministic without per-test plumbing.'
			).toMatch(/now\s*:\s*opts\?\.now\s*\?\?\s*FIXTURE_NOW/);
		});
	});
});
