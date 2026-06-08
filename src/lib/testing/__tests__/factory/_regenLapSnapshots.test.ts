/**
 * One-off regeneration of LAP BT/Top-up pre-migration snapshots.
 *
 * Runs under vitest because vitest has SvelteKit's alias resolution wired
 * (unlike a standalone tsx script which can't resolve $env / $lib / $app).
 *
 * Conditional: only runs when REGEN_LAP_SNAPSHOTS=1. Default behaviour is a
 * no-op skip test so this file stays in the suite without ever rewriting
 * snapshots during normal CI.
 *
 * Usage:  REGEN_LAP_SNAPSHOTS=1 pnpm test:unit -- --run _regenLapSnapshots
 *
 * After regen, this file can be deleted (or left as documentation of how to
 * regenerate in the future).
 */

import { describe, it, expect } from 'vitest';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { toScenario } from '$lib/testing/factory/schemaFixtureFactory';
import {
	LAP_BT_TERM_JOURNEY,
	LAP_TOPUP_TERM_JOURNEY,
	LAP_BT_TOPUP_JOURNEY
} from '$lib/testing/journeys/lapLoan';
import { PLOT_BT_JOURNEY } from '$lib/testing/journeys/plotLoan';

const REGEN = process.env.REGEN_LAP_SNAPSHOTS === '1';

const SNAPSHOTS_DIR = join(
	process.cwd(),
	'src/lib/testing/__tests__/factory/__snapshots__'
);

const SHIFT_NOTE = [
	'S78_btCanonicalBank (2026-05-26): LAP and Plot Loan migrated to the canonical',
	'btLoanDetailsQuestions bank shared with Home Loan. Net effect on this payload:',
	'(a) NEW canonical fields now emitted — disbursedAmount, originalTenure,',
	'loanDisbursementDate, interestRateType, btEmisPaid, emiBounceHistory (most of',
	'these existed already on HL; the migration extended the same set to LAP + Plot);',
	'(b) RENAMED for LAP — originalRemainingTenure → remainingTenure (this also',
	'fixes the long-standing payload-builder typo `orignalRemaningTenure` that',
	'silently dropped remainingTenure for LAP); (c) RENAMED for Plot — btCurrentEmi',
	'→ includedCurrentEMIsAmount, btExistingInterestRate → existingInterestRate,',
	'btInterestRateType → interestRateType, btRemainingTenure (string enum `<1` /',
	'`10` / `11-15`) → remainingTenure (numeric months); (d) DROPPED for LAP —',
	'loanVintage and repaymentTrack (replaced by the more precise',
	'loanDisbursementDate + btEmisPaid + emiBounceHistory triplet which is what',
	'lender BT-eligibility actually evaluates). HL was intentionally NOT migrated',
	'in this pass — its question IDs are referenced by E2E specs + optionResolver +',
	'form/homeLoan/options.ts and the HL-specific blast was scoped out per ADR-0015',
	'Strategy B-restricted. HL migration to follow as a separate clean-up pass.'
].join(' ');

const TARGETS = [
	{ id: 'LAP-BT-TERM', journey: LAP_BT_TERM_JOURNEY },
	{ id: 'LAP-TOPUP-TERM', journey: LAP_TOPUP_TERM_JOURNEY },
	{ id: 'LAP-BT-TOPUP', journey: LAP_BT_TOPUP_JOURNEY },
	{ id: 'PLOT-BT', journey: PLOT_BT_JOURNEY }
];

describe('_regenLapSnapshots (no-op unless REGEN_LAP_SNAPSHOTS=1)', () => {
	if (!REGEN) {
		it('skipped — set REGEN_LAP_SNAPSHOTS=1 to regenerate', () => {
			expect(true).toBe(true);
		});
		return;
	}

	for (const { id, journey } of TARGETS) {
		it(`regenerates ${id}`, () => {
			const filePath = join(SNAPSHOTS_DIR, `${id}.pre-migration.json`);
			expect(existsSync(filePath)).toBe(true);

			const existing = JSON.parse(readFileSync(filePath, 'utf-8'));
			const fresh = toScenario(journey).payload;

			const updated = {
				...existing,
				_shift_notes_S78_btCanonicalBank: SHIFT_NOTE,
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
