/**
 * One-off regeneration of pre-migration snapshots affected by Session 2's
 * Audit BUG-A / BUG-B / BUG-D / Plot Construction sizing fix (2026-05-28).
 *
 * WHY THIS EXISTS
 * ───────────────
 * The same vitest-with-SvelteKit-aliases problem as `_regenLapSnapshots.test.ts`
 * — a standalone tsx script can't resolve `$lib` / `$env` / `$app`, but vitest
 * has the alias wiring already, so the simplest regen mechanism is a vitest
 * test that writes the snapshots on disk when an env var flips.
 *
 * WHAT THE FIX CHANGED
 * ────────────────────
 * `src/lib/utils/payloadBuilder/loanTransaction.ts` now derives `loanAmount`
 * + `propertyCost` in a type-aware way for BT / Top-up / BT+Top-up / Plot
 * Construction / Construction Only scenarios. Before the fix, BT/Top-up
 * loanAmount fell back to `sanctionAmount` or `propertyCost - downPayment`
 * (evaluated the wrong amount); Plot Construction propertyCost was just
 * `propCost` (ignored construction cost). See the commit body for the
 * full audit citation.
 *
 * 8 affected snapshot fixtures (loanAmount + sometimes propertyCost differ
 * from the pre-fix locked value; field SHAPE unchanged):
 *
 *   HL-BT-TOPUP            loanAmount was 3,500,000 (sanctionAmount), now
 *                          4,000,000 (principalOutstanding + topUpAmount)
 *   PLOT-CONSTRUCTION      loanAmount + propertyCost both include the
 *                          requiredExtraAmount construction cost now
 *   PLOT-CONSTRUCTION-ONLY  loanAmount = constructionCost - dp (not plot
 *                          value - dp); propertyCost = constructionCost
 *   PLOT-BT                loanAmount = principalOutstanding via the new
 *                          PlotLoanActivity-aware sizing branch
 *   LAP-BT-TERM            loanAmount = principalOutstanding (was 0/fallback)
 *   LAP-TOPUP-TERM         loanAmount = topUpAmount (was sanctionAmount)
 *   LAP-BT-TOPUP           loanAmount = principalOutstanding + topUpAmount
 *   EDGE-BT-CREDIT-LINES   loanAmount = principalOutstanding
 *
 * Conditional: only runs when REGEN_BUG_A_FIX_SNAPSHOTS=1. Default behaviour
 * is a no-op skip test so this file stays in the suite without ever rewriting
 * snapshots during normal CI.
 *
 * Usage: REGEN_BUG_A_FIX_SNAPSHOTS=1 pnpm test:unit -- --run _regenBugAFixSnapshots
 *
 * After regen, this file stays as documentation of how + why the snapshots
 * were updated (same convention as `_regenLapSnapshots.test.ts`).
 */

import { describe, it, expect } from 'vitest';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { toScenario } from '$lib/testing/factory/schemaFixtureFactory';
import { HL_BT_TOPUP_JOURNEY } from '$lib/testing/journeys/homeLoan';
import {
	PLOT_CONSTRUCTION_JOURNEY,
	PLOT_CONSTRUCTION_ONLY_JOURNEY,
	PLOT_BT_JOURNEY,
	PLOT_ONLY_JOURNEY,
	PLOT_EQUITY_JOURNEY
} from '$lib/testing/journeys/plotLoan';
import {
	LAP_BT_TERM_JOURNEY,
	LAP_TOPUP_TERM_JOURNEY,
	LAP_BT_TOPUP_JOURNEY,
	LAP_NEW_TERM_JOURNEY,
	LAP_DOD_NEW_JOURNEY
} from '$lib/testing/journeys/lapLoan';
import {
	EDGE_BT_CREDIT_LINES_JOURNEY,
	EDGE_AGE_68_JOURNEY,
	EDGE_GOVT_SAL_JOURNEY
} from '$lib/testing/journeys/edge';

const REGEN = process.env.REGEN_BUG_A_FIX_SNAPSHOTS === '1';

const SNAPSHOTS_DIR = join(process.cwd(), 'src/lib/testing/__tests__/factory/__snapshots__');

const SHIFT_NOTE = [
	'Session 2 BUG-A / Plot Construction sizing fix (2026-05-28 late-evening):',
	'`buildLoanTransactionPayload` in payloadBuilder/loanTransaction.ts now',
	'derives loanAmount in a type-aware way:',
	'  • Balance Transfer Only        → principalOutstanding',
	'  • Top-up Only                  → topUpAmount',
	'  • Balance Transfer With Top-up → principalOutstanding + topUpAmount',
	'  • Plot Loan BT (via PlotLoanActivity flag) → principalOutstanding',
	'  • Construction Loan Only       → requiredExtraAmount - downPayment',
	'  • Plot & Construction Loan     → (propCost + requiredExtraAmount) - downPayment',
	'  • everything else              → existing RequiredLoanAmount / loanAmount / sanctionAmount chain',
	'Before the fix, BT-Only/Top-up-Only/BT+Topup all fell through to either',
	'sanctionAmount (Top-up) or the propertyCost-downPayment fallback (BT-Only),',
	'evaluating the customer against the wrong amount → false RED rejections',
	'across every lender. Plot Construction loans were similarly mis-sized,',
	'either under-requesting (Construction Only) or under-valuing the LTV base',
	'(Plot & Construction). For Plot Construction variants, propertyCost now',
	'also includes the construction cost so LTV caps fire against the full',
	'project value. Field SHAPE unchanged — only loanAmount + propertyCost',
	'VALUES move.'
].join(' ');

const TARGETS: Array<{ id: string; journey: unknown }> = [
	{ id: 'HL-BT-TOPUP', journey: HL_BT_TOPUP_JOURNEY },
	{ id: 'PLOT-CONSTRUCTION', journey: PLOT_CONSTRUCTION_JOURNEY },
	{ id: 'PLOT-CONSTRUCTION-ONLY', journey: PLOT_CONSTRUCTION_ONLY_JOURNEY },
	{ id: 'PLOT-BT', journey: PLOT_BT_JOURNEY },
	{ id: 'LAP-BT-TERM', journey: LAP_BT_TERM_JOURNEY },
	{ id: 'LAP-TOPUP-TERM', journey: LAP_TOPUP_TERM_JOURNEY },
	{ id: 'LAP-BT-TOPUP', journey: LAP_BT_TOPUP_JOURNEY },
	{ id: 'EDGE-BT-CREDIT-LINES', journey: EDGE_BT_CREDIT_LINES_JOURNEY },
	// Added 2026-05-31 alongside the loan-field nomenclature rename — these
	// snapshots froze pre-rename and need regeneration so the live payload
	// (now using facilityType / loanVariant) matches the saved expected.
	{ id: 'PLOT-ONLY', journey: PLOT_ONLY_JOURNEY },
	{ id: 'PLOT-EQUITY', journey: PLOT_EQUITY_JOURNEY },
	{ id: 'LAP-NEW-TERM', journey: LAP_NEW_TERM_JOURNEY },
	{ id: 'LAP-DOD-NEW', journey: LAP_DOD_NEW_JOURNEY },
	{ id: 'EDGE-AGE-68', journey: EDGE_AGE_68_JOURNEY },
	{ id: 'EDGE-GOVT-SAL', journey: EDGE_GOVT_SAL_JOURNEY }
];

describe('_regenBugAFixSnapshots (no-op unless REGEN_BUG_A_FIX_SNAPSHOTS=1)', () => {
	if (!REGEN) {
		it('skipped — set REGEN_BUG_A_FIX_SNAPSHOTS=1 to regenerate', () => {
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
				_shift_notes_bugA_fix_2026_05_28: SHIFT_NOTE,
				payload: fresh
			};

			writeFileSync(filePath, JSON.stringify(updated, null, '\t') + '\n', 'utf-8');

			// Sanity: the new payload must have a loanTransaction block (non-empty).
			const ltKeys = Object.keys(
				(fresh as unknown as Record<string, unknown>).loanTransaction ?? {}
			);
			expect(ltKeys.length).toBeGreaterThan(20);
		});
	}
});
