/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: money collections never carry a short TTL index (E.4)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * Per Income Tax Act §44AA(3) + CGST §36, financial records must be
 * retained for 6 years from the end of the relevant financial year.
 * The 2-year audit-log TTL (BillingAuditLogs used to share that pattern)
 * and DATA-3 document floors don't cover this. A regression that adds
 * `expireAfterSeconds: <less than 6yr>` to ANY money collection would
 * silently violate the statutory window — invisible until a GST audit
 * asks for an invoice the TTL already deleted.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §E.4
 * ADR:  docs/adr/0023-money-retention-6-years.md
 *
 * THIS TEST
 * ─────────
 * Static source-code scan of src/lib/database/mongo.ts. For each money-
 * collection variable name (MONEY_COLLECTION_VAR_NAMES), find every
 * `<VarName>.createIndex(...)` call and assert its options argument
 * does NOT contain `expireAfterSeconds` set to anything less than
 * 6 years in seconds (~189 million).
 *
 * Per Pitfall #66, the regex targets a USAGE shape (`Collection.createIndex(`
 * + the literal `expireAfterSeconds` keyword inside its options) rather
 * than the bare identifier `expireAfterSeconds` (which appears in
 * comments + this very test file's docstrings without being a real
 * violation).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	MONEY_COLLECTION_VAR_NAMES,
	MONEY_RETENTION_YEARS
} from '$lib/server/retention/moneyRetention';

const MONGO_PATH = 'src/lib/database/mongo.ts';
const SIX_YEARS_IN_SECONDS = MONEY_RETENTION_YEARS * 365 * 24 * 60 * 60;

function stripComments(src: string): string {
	// Same shape as in the ruleEngine shape-lock tests — strip block then line.
	return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

const rawSrc = readFileSync(resolve(process.cwd(), MONGO_PATH), 'utf8');
const codeOnly = stripComments(rawSrc);

interface CreateIndexCall {
	collectionVar: string;
	/** Source slice from after `(` to the matching `)` — used for arg inspection. */
	argSlice: string;
	/** Absolute offset of the `(` in codeOnly — for error-reporting. */
	openParenOffset: number;
}

/**
 * Find every `<CollectionVar>.createIndex(...)` call in the source.
 * Naively pairs parens — sufficient because mongo.ts's createIndex
 * arguments are always object literals + maybe one comment, never
 * nested function calls deep enough to mismatch.
 */
function findCreateIndexCalls(
	src: string,
	collectionVar: string
): CreateIndexCall[] {
	const results: CreateIndexCall[] = [];
	const needle = `${collectionVar}.createIndex(`;
	let searchFrom = 0;
	while (true) {
		const idx = src.indexOf(needle, searchFrom);
		if (idx === -1) break;
		const openParenOffset = idx + needle.length - 1;
		// Walk forward from openParenOffset, counting paren depth, until
		// depth returns to 0.
		let depth = 1;
		let i = openParenOffset + 1;
		while (i < src.length && depth > 0) {
			const ch = src[i];
			if (ch === '(') depth++;
			else if (ch === ')') depth--;
			i++;
		}
		// i now points one past the matching `)` — argSlice is between.
		const argSlice = src.slice(openParenOffset + 1, i - 1);
		results.push({ collectionVar, argSlice, openParenOffset });
		searchFrom = i;
	}
	return results;
}

/**
 * Extract every numeric value associated with `expireAfterSeconds`
 * inside the given options-slice. Handles both bare numbers and
 * arithmetic expressions (e.g. `90 * 24 * 60 * 60`).
 *
 * Returns an array of {seconds, raw} pairs. Empty array when no
 * expireAfterSeconds is present.
 */
function extractExpireAfterSecondsValues(
	argSlice: string
): Array<{ seconds: number; raw: string }> {
	const results: Array<{ seconds: number; raw: string }> = [];
	// Match: expireAfterSeconds : <expression up to , or }>
	// The expression body captures arithmetic + parens.
	const re = /expireAfterSeconds\s*:\s*([^,}\n)]+)/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(argSlice)) !== null) {
		const raw = m[1].trim();
		// Whitelist: digits, whitespace, * / + - ( ) only. Anything else
		// (identifiers, string lookups, function calls) we conservatively
		// flag as a violation — call sites need to be explicit so we can
		// statically verify the bound.
		if (!/^[\d\s*+\-/().]+$/.test(raw)) {
			// Mark as "unknown — must be inspected manually" by reporting
			// NaN; the assertion below treats NaN as a violation so the
			// owner can either inline the value or document.
			results.push({ seconds: Number.NaN, raw });
			continue;
		}
		try {
			// eslint-disable-next-line no-new-func
			const value = Number(new Function(`return (${raw})`)());
			results.push({ seconds: value, raw });
		} catch {
			results.push({ seconds: Number.NaN, raw });
		}
	}
	return results;
}

describe('Money collections — no short TTL (E.4 §6-year retention)', () => {
	it('MONEY_COLLECTION_VAR_NAMES is non-empty (sanity)', () => {
		expect(MONEY_COLLECTION_VAR_NAMES.length).toBeGreaterThan(0);
	});

	for (const collectionVar of MONEY_COLLECTION_VAR_NAMES) {
		describe(collectionVar, () => {
			const calls = findCreateIndexCalls(codeOnly, collectionVar);

			it('every createIndex call lacks expireAfterSeconds OR sets it ≥6 years', () => {
				// Tolerate collections with zero createIndex calls (some money
				// collections may not be indexed yet) — that's not a violation.
				for (const call of calls) {
					const expiries = extractExpireAfterSecondsValues(call.argSlice);
					for (const { seconds, raw } of expiries) {
						if (Number.isNaN(seconds)) {
							throw new Error(
								`${collectionVar}.createIndex at offset ${call.openParenOffset} ` +
									`uses a non-literal expireAfterSeconds value: "${raw}". ` +
									`Per Pitfall #66 + E.4 retention policy, money-collection ` +
									`TTL values must be inlined literals so this static-scan can ` +
									`verify ≥${SIX_YEARS_IN_SECONDS}s (6 years). Replace the ` +
									`reference with the resolved number or add the collection ` +
									`to a deny-list with a documented exemption.`
							);
						}
						expect(
							seconds,
							`${collectionVar}.createIndex at offset ${call.openParenOffset} ` +
								`sets expireAfterSeconds: ${raw} (= ${seconds}s), which is less ` +
								`than 6 years (${SIX_YEARS_IN_SECONDS}s). Money records have a ` +
								`statutory 6-year retention obligation under the Income Tax ` +
								`Act + GST. Either raise the TTL to ≥${SIX_YEARS_IN_SECONDS}s, ` +
								`remove the TTL entirely (preferred), or remove this collection ` +
								`from MONEY_COLLECTION_VAR_NAMES if it's no longer a money record.`
						).toBeGreaterThanOrEqual(SIX_YEARS_IN_SECONDS);
					}
				}
			});
		});
	}
});
