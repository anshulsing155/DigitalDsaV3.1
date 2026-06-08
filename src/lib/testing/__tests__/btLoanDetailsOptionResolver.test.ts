/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: shared BT-loan-details select questions must have option resolvers
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * User-reported 2026-05-28 (Plot Loan BT-only screenshot): the "Which lender
 * holds the current loan?" dropdown rendered empty. Selecting "Select an
 * option" showed no banks. The form was blocked with "Missing: Which lender
 * holds the current loan?".
 *
 * ROOT CAUSE
 * ──────────
 * `qBankName` (and any other select question) in
 * `src/lib/config/schema/btLoanDetailsQuestions.ts` declares no static
 * `options` array — it relies on the dynamic option resolver registry in
 * `src/lib/server/formEngine/optionResolver.ts`. The resolver is keyed by
 * question ID. For `qBankName` the id is `q1_bankName`, which was MISSING
 * from the `dynamicGenerators` map. The resolver returned an empty options
 * array, the dropdown rendered "Select an option" with zero entries, and
 * the form was unfillable.
 *
 * Plot Loan BT-only and LAP BT-only both consume this shared page (via
 * `buildBtLoanDetailsPage`), so both flows had the same silent bug. Home
 * Loan BT works because it uses its own `q9_selectSingleBank` question
 * which IS registered.
 *
 * FIX (2026-05-28)
 * ────────────────
 * Added a `q1_bankName` entry to `dynamicGenerators` mirroring
 * `q9_selectSingleBank` — all-banks-and-NBFCs option set. (BT loans
 * commonly originate at NBFCs and refinance into LAP / Plot, so filtering
 * NBFCs out would block legitimate cases.)
 *
 * THIS TEST
 * ─────────
 * Static-scan: for every `select` / `multiple-select` question exported
 * from `btLoanDetailsQuestions.ts` whose definition has no `options:`
 * array, assert that the same question ID is present as a key in
 * `dynamicGenerators` in `optionResolver.ts`. Prevents any future shared
 * BT question being added without its resolver wiring.
 *
 * Companion: CLAUDE.md §3 Pitfall (Shared BT page bank dropdown empty,
 * 2026-05-28).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('btLoanDetails option resolver wiring — Pitfall: empty dropdown', () => {
	const btQuestionsPath = resolve(
		process.cwd(),
		'src/lib/config/schema/btLoanDetailsQuestions.ts'
	);
	const resolverPath = resolve(process.cwd(), 'src/lib/server/formEngine/optionResolver.ts');

	const btSource = readFileSync(btQuestionsPath, 'utf-8');
	const resolverSource = readFileSync(resolverPath, 'utf-8');

	// Extract every question's `id:` value where its declaration block also
	// contains `type: 'select'` or `type: 'multiple-select'` AND has NO
	// `options:` array within its block.
	function extractDynamicSelectIds(source: string): string[] {
		const ids: string[] = [];
		// Match each `export const qSomething: RawSchemaQuestion = { ... };` block.
		const blockPattern = /export\s+const\s+\w+\s*:\s*RawSchemaQuestion\s*=\s*\{([\s\S]*?)\n\};/g;
		let m: RegExpExecArray | null;
		while ((m = blockPattern.exec(source)) !== null) {
			const body = m[1];
			const idMatch = body.match(/\bid\s*:\s*['"]([^'"]+)['"]/);
			const typeMatch = body.match(/\btype\s*:\s*['"]([^'"]+)['"]/);
			if (!idMatch || !typeMatch) continue;
			const type = typeMatch[1];
			if (type !== 'select' && type !== 'multiple-select') continue;
			// If the block declares its own `options:` array, it's static — skip.
			if (/\boptions\s*:\s*\[/.test(body)) continue;
			ids.push(idMatch[1]);
		}
		return ids;
	}

	it('every dynamic-select question in btLoanDetailsQuestions.ts is registered in optionResolver', () => {
		const dynamicIds = extractDynamicSelectIds(btSource);
		expect(dynamicIds.length, 'no dynamic-select questions extracted — test glob may need updating').toBeGreaterThan(0);

		const missing: string[] = [];
		for (const id of dynamicIds) {
			// Look for `<id>:` as a key within the dynamicGenerators object.
			// Allow alphanumeric + underscore on the key.
			const keyPattern = new RegExp(`\\b${id.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*:`);
			if (!keyPattern.test(resolverSource)) {
				missing.push(id);
			}
		}

		expect(
			missing,
			`The following btLoanDetailsQuestions select question IDs have no entry in ` +
				`dynamicGenerators in optionResolver.ts: ${missing.join(', ')}. ` +
				`The dropdown will render empty and block the form. ` +
				`See CLAUDE.md §3 Pitfall (Shared BT page bank dropdown empty).`
		).toEqual([]);
	});

	it('q1_bankName specifically is registered (regression guard for the original bug)', () => {
		expect(
			/\bq1_bankName\s*:/.test(resolverSource),
			'q1_bankName is missing from dynamicGenerators — Plot Loan BT-only and LAP BT-only ' +
				'will both show empty lender dropdowns. ' +
				'See CLAUDE.md §3 Pitfall (Shared BT page bank dropdown empty).'
		).toBe(true);
	});
});
