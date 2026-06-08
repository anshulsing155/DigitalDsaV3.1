/**
 * One-off regeneration of pre-migration snapshots affected by LEND-1 Phase 1b
 * (ADR-0025, 2026-06-02) and the propertyIdentified fix for Plot Loan + LAP
 * landed in the same session.
 *
 * WHY THIS EXISTS
 * ───────────────
 * Same vitest-with-SvelteKit-aliases problem as `_regenLapSnapshots.test.ts`
 * and `_regenBugAFixSnapshots.test.ts` — a standalone tsx script can't
 * resolve `$lib` / `$env` / `$app`, but vitest has the alias wiring already.
 * Pattern: vitest test that writes the snapshot on disk when an env var flips.
 *
 * WHAT CHANGED — TWO CONCURRENT FIXES
 * ────────────────────────────────────
 *
 * (1) Plot & Equity canonical-field aliasing (ADR-0025) in
 *     `src/lib/utils/payloadBuilder/loanTransaction.ts`:
 *
 *       loanAnswers.propCost            → payload.marketValue
 *       loanAnswers.agreementSellValue  → payload.registryValue
 *       derived                         → payload.sellerCashComponent
 *                                          (= marketValue − registryValue,
 *                                           only when both present and market > registry)
 *
 *     Gated on `loanVariant === 'Plot & Equity Loan'`. Affects only PLOT-EQUITY.
 *
 * (2) propertyIdentified force-true for Plot Loan + LAP in the same file:
 *     neither form asks the "is property identified" question, so the payload
 *     used to coerce undefined → false, hiding real Plot/LAP deals from
 *     downstream consumers that read the boolean as "is there a real property?".
 *     Now forced to `true` for both loan families. Home Loan's explicit
 *     Yes/No answer (which drives the sanction-letter view) is unchanged.
 *     Affects all snapshots with loanName === 'Loan Against Property' or
 *     loanName === 'Plot Loan' whose journey doesn't already answer "Yes".
 *
 * AFFECTED SNAPSHOTS
 * ──────────────────
 *
 *   PLOT-EQUITY        +marketValue, +registryValue, +sellerCashComponent (Fix 1)
 *   LAP-BT-TERM        propertyIdentified false → true (Fix 2)
 *   LAP-BT-TOPUP       propertyIdentified false → true (Fix 2)
 *   LAP-DOD-NEW        propertyIdentified false → true (Fix 2)
 *   LAP-NEW-TERM       propertyIdentified false → true (Fix 2)
 *   LAP-TOPUP-TERM     propertyIdentified false → true (Fix 2)
 *   EDGE-AGE-68        propertyIdentified false → true (Fix 2 — LAP edge case)
 *   EDGE-GOVT-SAL      propertyIdentified false → true (Fix 2 — LAP edge case)
 *
 * Plot snapshots that already had propertyIdentified=true (journey fixtures
 * answer the question via propertyIdentificationPage) are unaffected by Fix 2
 * — the forced true matches the journey-set true.
 *
 * Conditional: only runs when REGEN_LEND_PHASE_1B_SNAPSHOTS=1. Default
 * behaviour is a no-op skip test so this file stays in the suite without
 * ever rewriting snapshots during normal CI.
 *
 * Usage: REGEN_LEND_PHASE_1B_SNAPSHOTS=1 pnpm test:unit -- --run _regenLendPhase1bSnapshots
 *
 * After regen, this file stays as documentation of how + why the snapshots
 * were updated (same convention as the two prior regen files).
 */

import { describe, it, expect } from 'vitest';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { toScenario } from '$lib/testing/factory/schemaFixtureFactory';
import { PLOT_EQUITY_JOURNEY } from '$lib/testing/journeys/plotLoan';
import {
	LAP_BT_TERM_JOURNEY,
	LAP_BT_TOPUP_JOURNEY,
	LAP_DOD_NEW_JOURNEY,
	LAP_NEW_TERM_JOURNEY,
	LAP_TOPUP_TERM_JOURNEY
} from '$lib/testing/journeys/lapLoan';
import { EDGE_AGE_68_JOURNEY, EDGE_GOVT_SAL_JOURNEY } from '$lib/testing/journeys/edge';

const REGEN = process.env.REGEN_LEND_PHASE_1B_SNAPSHOTS === '1';

const SNAPSHOTS_DIR = join(process.cwd(), 'src/lib/testing/__tests__/factory/__snapshots__');

const SHIFT_NOTE = [
	'LEND-1 session 2026-06-02 — two concurrent payload-builder fixes:',
	'(1) Phase 1b (ADR-0025): Plot & Equity Loan canonical-field aliasing —',
	'propCost → marketValue, agreementSellValue → registryValue,',
	'derived sellerCashComponent (= marketValue − registryValue). Gated on',
	'loanVariant === "Plot & Equity Loan", affects PLOT-EQUITY only.',
	'(2) propertyIdentified force-true for Plot Loan + LAP — neither form asks',
	'the question, so the prior coercion to false hid real Plot/LAP deals from',
	'downstream consumers. Affects 5 LAP snapshots + 2 LAP-EDGE snapshots.',
	'Plot snapshots already had propertyIdentified=true (set via journey',
	'fixtures) so they need no field-value flip — but PLOT-EQUITY still needs',
	'regen for the new aliased fields. Home Loan paths are unaffected by both.'
].join(' ');

const TARGETS: Array<{ id: string; journey: unknown }> = [
	{ id: 'PLOT-EQUITY', journey: PLOT_EQUITY_JOURNEY },
	{ id: 'LAP-BT-TERM', journey: LAP_BT_TERM_JOURNEY },
	{ id: 'LAP-BT-TOPUP', journey: LAP_BT_TOPUP_JOURNEY },
	{ id: 'LAP-DOD-NEW', journey: LAP_DOD_NEW_JOURNEY },
	{ id: 'LAP-NEW-TERM', journey: LAP_NEW_TERM_JOURNEY },
	{ id: 'LAP-TOPUP-TERM', journey: LAP_TOPUP_TERM_JOURNEY },
	{ id: 'EDGE-AGE-68', journey: EDGE_AGE_68_JOURNEY },
	{ id: 'EDGE-GOVT-SAL', journey: EDGE_GOVT_SAL_JOURNEY }
];

describe('_regenLendPhase1bSnapshots (no-op unless REGEN_LEND_PHASE_1B_SNAPSHOTS=1)', () => {
	if (!REGEN) {
		it('skipped — set REGEN_LEND_PHASE_1B_SNAPSHOTS=1 to regenerate', () => {
			expect(true).toBe(true);
		});
		return;
	}

	for (const { id, journey } of TARGETS) {
		it(`regenerates ${id}`, () => {
			const filePath = join(SNAPSHOTS_DIR, `${id}.pre-migration.json`);
			expect(existsSync(filePath)).toBe(true);

			const existing = JSON.parse(readFileSync(filePath, 'utf-8'));
			const fresh = toScenario(journey as never).payload;

			const updated = {
				...existing,
				_shift_notes_lend_2026_06_02: SHIFT_NOTE,
				payload: fresh
			};

			writeFileSync(filePath, JSON.stringify(updated, null, '\t') + '\n', 'utf-8');

			// Sanity: all LAP + Plot Loan snapshots must now have
			// propertyIdentified=true (the Fix 2 contract).
			const loanTransaction = (fresh as unknown as Record<string, unknown>)
				.loanTransaction as Record<string, unknown>;
			if (
				loanTransaction.loanName === 'Loan Against Property' ||
				loanTransaction.loanName === 'Plot Loan'
			) {
				expect(loanTransaction.propertyIdentified, `${id} propertyIdentified`).toBe(true);
			}
			// PLOT-EQUITY additionally must have the canonical aliased market value
			// (Fix 1 contract). registryValue + sellerCashComponent are conditional
			// on the journey playing through ATSReady — PLOT_EQUITY_JOURNEY stops
			// earlier, so those stay undefined here. The end-to-end gold-standard
			// mapping is covered in plotEquityCanonicalFields.test.ts.
			if (id === 'PLOT-EQUITY') {
				expect(loanTransaction.marketValue).toBeDefined();
			}
		});
	}
});
