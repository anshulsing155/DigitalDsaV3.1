/**
 * ═══════════════════════════════════════════════════════════════════════════
 * S77e — Schema Fixture Factory: backstop test
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Exercises the three critical backstops from FIXTURE-FACTORY-SPEC §7:
 *
 *   FM-1 — Pre-migration snapshot lock
 *          Two assertions per scenario guard against drift:
 *            (a) `SCENARIO_BY_ID.get(id).payload === snapshot.payload` —
 *                catches a wrong journey being wired into a scenario in
 *                formPathScenarios.ts (e.g. typo in `payload: toScenario(X).payload`).
 *            (b) `toScenario(JOURNEY).payload === snapshot.payload` —
 *                catches drift between a journey declaration and the real
 *                builder output. Together they pin both sides.
 *
 *   FM-2 — By-reference visibility import identity
 *          Assert `VISIBILITY_REF === isQuestionVisible`. Catches any
 *          future attempt to sneak in a local visibility re-implementation.
 *
 *   FM-5 — Schema round-trip validation
 *          - All 6 loan composers produce indexable schemas.
 *          - Unknown pageId in a journey throws a descriptive error.
 *          - Unknown bindsTo key on a non-custom-component page throws.
 *
 * Plus a smoke test that `toScenario(HL_NEW_SAL_CLEAN_JOURNEY)` produces
 * a well-formed `FormPathScenario` — the public contract that every
 * downstream consumer reads.
 *
 * Post-Step-5.1 status: `formPathScenarios.ts` now derives each scenario's
 * `payload` from `toScenario(JOURNEY).payload`, so (a) and (b) test the same
 * value via two different paths (scenario-declaration lookup vs. direct
 * journey reference). Both are kept — they catch different regression classes.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';

import { isQuestionVisible } from '$lib/server/formEngine/visibility.js';
import {
	toScenario,
	playJourney,
	VISIBILITY_REF
} from '$lib/testing/factory/schemaFixtureFactory.js';
import { journey, page } from '$lib/testing/factory/journeyHarness.js';
import {
	HL_NEW_SAL_CLEAN_JOURNEY,
	HL_NEW_SE_PRO_JOURNEY,
	HL_NEW_PENS_JOURNEY,
	HL_BT_ONLY_JOURNEY,
	HL_BT_TOPUP_JOURNEY,
	HL_TOPUP_JOURNEY,
	LAP_NEW_TERM_JOURNEY,
	LAP_BT_TERM_JOURNEY,
	LAP_TOPUP_TERM_JOURNEY,
	LAP_BT_TOPUP_JOURNEY,
	LAP_DOD_NEW_JOURNEY,
	PLOT_ONLY_JOURNEY,
	PLOT_CONSTRUCTION_JOURNEY,
	PLOT_EQUITY_JOURNEY,
	PLOT_CONSTRUCTION_ONLY_JOURNEY,
	PLOT_BT_JOURNEY,
	PL_FRESH_YES_OBLIG_JOURNEY,
	PL_CONSOL_JOURNEY,
	PL_NO_OBLIG_JOURNEY,
	BL_FRESH_YES_OBLIG_JOURNEY,
	BL_CONSOL_JOURNEY,
	BL_NO_OBLIG_JOURNEY,
	PROF_FRESH_YES_OBLIG_JOURNEY,
	PROF_CONSOL_JOURNEY,
	PROF_NO_OBLIG_JOURNEY,
	EDGE_AGE_23_JOURNEY,
	EDGE_AGE_68_JOURNEY,
	EDGE_BT_CREDIT_LINES_JOURNEY,
	EDGE_CIBIL_580_JOURNEY,
	EDGE_CIBIL_650_JOURNEY,
	EDGE_COMPANY_PVT_JOURNEY,
	EDGE_GOVT_SAL_JOURNEY,
	EDGE_HIGH_FOIR_JOURNEY,
	EDGE_HIGH_VALUE_JOURNEY,
	EDGE_NRI_JOURNEY,
	EDGE_PROF_LAWYER_DC_JOURNEY,
	EDGE_3_APPLICANTS_JOURNEY
} from '$lib/testing/journeys/index.js';
import { SCENARIO_BY_ID } from '$lib/testing/scenarios/formPathScenarios.js';

// Raw JSON imports of the committed pre-migration snapshots (FM-1 locks).
import preMigrationSnapshot from './__snapshots__/HL-NEW-SAL-CLEAN.pre-migration.json';
import sePreMigrationSnapshot from './__snapshots__/HL-NEW-SE-PRO.pre-migration.json';
import pensSnapshot from './__snapshots__/HL-NEW-PENS.pre-migration.json';
import btOnlySnapshot from './__snapshots__/HL-BT-ONLY.pre-migration.json';
import btTopupSnapshot from './__snapshots__/HL-BT-TOPUP.pre-migration.json';
import topupSnapshot from './__snapshots__/HL-TOPUP.pre-migration.json';
import lapNewTermSnapshot from './__snapshots__/LAP-NEW-TERM.pre-migration.json';
import lapBtTermSnapshot from './__snapshots__/LAP-BT-TERM.pre-migration.json';
import lapTopupTermSnapshot from './__snapshots__/LAP-TOPUP-TERM.pre-migration.json';
import lapBtTopupSnapshot from './__snapshots__/LAP-BT-TOPUP.pre-migration.json';
import lapDodNewSnapshot from './__snapshots__/LAP-DOD-NEW.pre-migration.json';
import plotOnlySnapshot from './__snapshots__/PLOT-ONLY.pre-migration.json';
import plotConstructionSnapshot from './__snapshots__/PLOT-CONSTRUCTION.pre-migration.json';
import plotEquitySnapshot from './__snapshots__/PLOT-EQUITY.pre-migration.json';
import plotConstructionOnlySnapshot from './__snapshots__/PLOT-CONSTRUCTION-ONLY.pre-migration.json';
import plotBtSnapshot from './__snapshots__/PLOT-BT.pre-migration.json';
import plFreshSnapshot from './__snapshots__/PL-FRESH-YES-OBLIG.pre-migration.json';
import plConsolSnapshot from './__snapshots__/PL-CONSOL.pre-migration.json';
import plNoObligSnapshot from './__snapshots__/PL-NO-OBLIG.pre-migration.json';
import blFreshSnapshot from './__snapshots__/BL-FRESH-YES-OBLIG.pre-migration.json';
import blConsolSnapshot from './__snapshots__/BL-CONSOL.pre-migration.json';
import blNoObligSnapshot from './__snapshots__/BL-NO-OBLIG.pre-migration.json';
import profFreshSnapshot from './__snapshots__/PROF-FRESH-YES-OBLIG.pre-migration.json';
import profConsolSnapshot from './__snapshots__/PROF-CONSOL.pre-migration.json';
import profNoObligSnapshot from './__snapshots__/PROF-NO-OBLIG.pre-migration.json';
import edgeAge23Snapshot from './__snapshots__/EDGE-AGE-23.pre-migration.json';
import edgeAge68Snapshot from './__snapshots__/EDGE-AGE-68.pre-migration.json';
import edgeCibil650Snapshot from './__snapshots__/EDGE-CIBIL-650.pre-migration.json';
import edgeHighFoirSnapshot from './__snapshots__/EDGE-HIGH-FOIR.pre-migration.json';
import edgeBtCreditLinesSnapshot from './__snapshots__/EDGE-BT-CREDIT-LINES.pre-migration.json';
import edgeCibil580Snapshot from './__snapshots__/EDGE-CIBIL-580.pre-migration.json';
import edgeCompanyPvtSnapshot from './__snapshots__/EDGE-COMPANY-PVT.pre-migration.json';
import edgeGovtSalSnapshot from './__snapshots__/EDGE-GOVT-SAL.pre-migration.json';
import edgeHighValueSnapshot from './__snapshots__/EDGE-HIGH-VALUE.pre-migration.json';
import edgeNriSnapshot from './__snapshots__/EDGE-NRI.pre-migration.json';
import edgeProfLawyerDcSnapshot from './__snapshots__/EDGE-PROF-LAWYER-DC.pre-migration.json';
import edge3ApplicantsSnapshot from './__snapshots__/EDGE-3-APPLICANTS.pre-migration.json';

// Canonical composer list — mirrors SCHEMA_COMPOSERS inside the player.
import { composeHomeLoanSchema } from '$lib/config/homeLoan/composer.js';
import { composeLapLoanSchema } from '$lib/config/lapLoan/composer.js';
import { composePlotLoanSchema } from '$lib/config/plotLoan/composer.js';
import { composePersonalLoanSchema } from '$lib/config/personalLoan/composer.js';
import { composeBusinessLoanSchema } from '$lib/config/businessLoan/composer.js';
import { composeProfessionalLoanSchema } from '$lib/config/professionalLoan/composer.js';

describe('schemaFixtureFactory — FM-2 identity (by-reference visibility)', () => {
	it('VISIBILITY_REF is the exact isQuestionVisible function', () => {
		// If someone introduces a local reimplementation or wrapper, this
		// triple-equality assertion fails and the test forces them to
		// either justify the split or restore the by-reference import.
		expect(VISIBILITY_REF).toBe(isQuestionVisible);
	});
});

describe('schemaFixtureFactory — FM-1 pre-migration snapshot lock', () => {
	it('committed snapshot matches live hand-written HL_NEW_SAL_CLEAN.payload', () => {
		const live = SCENARIO_BY_ID.get('HL-NEW-SAL-CLEAN');
		expect(live, 'HL-NEW-SAL-CLEAN must exist in formPathScenarios.ts').toBeDefined();

		// Assertion 1 of 2: hand-written scenario must still match the snapshot.
		// Any drift in formPathScenarios.ts during the dark-launch period fails here.
		expect(live!.payload).toEqual(preMigrationSnapshot.payload);
	});

	it('toScenario(HL_NEW_SAL_CLEAN_JOURNEY).payload matches pre-migration snapshot', () => {
		// Assertion 2 of 2 (Step-4 migration gate): the schema-driven journey must
		// produce a payload that byte-matches the committed snapshot. This proves the
		// factory is a drop-in replacement for the hand-written scenario — any
		// divergence between the journey's answer keys and the real builder surfaces here
		// before Step-5 does the in-place rewrite.
		const factoryScenario = toScenario(HL_NEW_SAL_CLEAN_JOURNEY);
		expect(factoryScenario.payload).toEqual(preMigrationSnapshot.payload);
	});

	// Second scenario lock — HL-NEW-SE-PRO exercises Self-employed(Professional):
	// businessProfile (from businessActivityDetailsVisible) and financials (from
	// financialsTableVisible) paths, plus UC + direct_from_builder property flow.
	it('committed snapshot matches live hand-written HL_NEW_SE_PRO.payload', () => {
		const live = SCENARIO_BY_ID.get('HL-NEW-SE-PRO');
		expect(live, 'HL-NEW-SE-PRO must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(sePreMigrationSnapshot.payload);
	});

	it('toScenario(HL_NEW_SE_PRO_JOURNEY).payload matches pre-migration snapshot', () => {
		const factoryScenario = toScenario(HL_NEW_SE_PRO_JOURNEY);
		expect(factoryScenario.payload).toEqual(sePreMigrationSnapshot.payload);
	});

	// HL-NEW-PENS — Pensioner (pensionProfile), OLD_MUNICIPAL resale house
	it('committed snapshot matches live hand-written HL_NEW_PENS.payload', () => {
		const live = SCENARIO_BY_ID.get('HL-NEW-PENS');
		expect(live, 'HL-NEW-PENS must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(pensSnapshot.payload);
	});
	it('toScenario(HL_NEW_PENS_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(HL_NEW_PENS_JOURNEY).payload).toEqual(pensSnapshot.payload);
	});

	// HL-BT-ONLY — Balance Transfer Only (btExistingLoan + loanRequirements flow)
	it('committed snapshot matches live hand-written HL_BT_ONLY.payload', () => {
		const live = SCENARIO_BY_ID.get('HL-BT-ONLY');
		expect(live, 'HL-BT-ONLY must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(btOnlySnapshot.payload);
	});
	it('toScenario(HL_BT_ONLY_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(HL_BT_ONLY_JOURNEY).payload).toEqual(btOnlySnapshot.payload);
	});

	// HL-BT-TOPUP — 2 applicants (couple), BT + Top-up (topUpAmount/topUpTenure schema keys)
	it('committed snapshot matches live hand-written HL_BT_TOPUP.payload', () => {
		const live = SCENARIO_BY_ID.get('HL-BT-TOPUP');
		expect(live, 'HL-BT-TOPUP must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(btTopupSnapshot.payload);
	});
	it('toScenario(HL_BT_TOPUP_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(HL_BT_TOPUP_JOURNEY).payload).toEqual(btTopupSnapshot.payload);
	});

	// HL-TOPUP — Top-up Only with existing obligation (deterministic id)
	it('committed snapshot matches live hand-written HL_TOPUP.payload', () => {
		const live = SCENARIO_BY_ID.get('HL-TOPUP');
		expect(live, 'HL-TOPUP must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(topupSnapshot.payload);
	});
	it('toScenario(HL_TOPUP_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(HL_TOPUP_JOURNEY).payload).toEqual(topupSnapshot.payload);
	});

	// ── Unsecured loan FM-1 locks (S77e Step-4, 9 journeys × 2 assertions = 18 tests) ──
	//
	// Each journey gets two FM-1 gates:
	//   (1) the live hand-written payload in formPathScenarios.ts still matches
	//       the pre-migration snapshot (catches drift in the hand-written scenarios);
	//   (2) `toScenario(journey).payload` matches the same snapshot (catches
	//       drift in the journey declaration or builder).
	// Both must pass; one failing is an early-warning signal before Step-5 rewrites.

	const UNSECURED_LOCKS = [
		{
			id: 'PL-FRESH-YES-OBLIG',
			journey: PL_FRESH_YES_OBLIG_JOURNEY,
			snapshot: plFreshSnapshot
		},
		{ id: 'PL-CONSOL', journey: PL_CONSOL_JOURNEY, snapshot: plConsolSnapshot },
		{ id: 'PL-NO-OBLIG', journey: PL_NO_OBLIG_JOURNEY, snapshot: plNoObligSnapshot },
		{
			id: 'BL-FRESH-YES-OBLIG',
			journey: BL_FRESH_YES_OBLIG_JOURNEY,
			snapshot: blFreshSnapshot
		},
		{ id: 'BL-CONSOL', journey: BL_CONSOL_JOURNEY, snapshot: blConsolSnapshot },
		{ id: 'BL-NO-OBLIG', journey: BL_NO_OBLIG_JOURNEY, snapshot: blNoObligSnapshot },
		{
			id: 'PROF-FRESH-YES-OBLIG',
			journey: PROF_FRESH_YES_OBLIG_JOURNEY,
			snapshot: profFreshSnapshot
		},
		{ id: 'PROF-CONSOL', journey: PROF_CONSOL_JOURNEY, snapshot: profConsolSnapshot },
		{ id: 'PROF-NO-OBLIG', journey: PROF_NO_OBLIG_JOURNEY, snapshot: profNoObligSnapshot }
	] as const;

	for (const { id, journey, snapshot } of UNSECURED_LOCKS) {
		it(`committed snapshot matches live hand-written ${id}.payload`, () => {
			const live = SCENARIO_BY_ID.get(id);
			expect(live, `${id} must exist in formPathScenarios.ts`).toBeDefined();
			expect(live!.payload).toEqual(snapshot.payload);
		});

		it(`toScenario(${id}).payload matches pre-migration snapshot`, () => {
			const factoryScenario = toScenario(journey);
			expect(factoryScenario.payload).toEqual(snapshot.payload);
		});
	}

	// ── Plot Loan family (5 scenarios × 2 assertions = 10) ─────────────────────

	it('committed snapshot matches live hand-written PLOT_ONLY.payload', () => {
		const live = SCENARIO_BY_ID.get('PLOT-ONLY');
		expect(live, 'PLOT-ONLY must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(plotOnlySnapshot.payload);
	});
	it('toScenario(PLOT_ONLY_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(PLOT_ONLY_JOURNEY).payload).toEqual(plotOnlySnapshot.payload);
	});

	it('committed snapshot matches live hand-written PLOT_CONSTRUCTION.payload', () => {
		const live = SCENARIO_BY_ID.get('PLOT-CONSTRUCTION');
		expect(live, 'PLOT-CONSTRUCTION must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(plotConstructionSnapshot.payload);
	});
	it('toScenario(PLOT_CONSTRUCTION_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(PLOT_CONSTRUCTION_JOURNEY).payload).toEqual(
			plotConstructionSnapshot.payload
		);
	});

	it('committed snapshot matches live hand-written PLOT_EQUITY.payload', () => {
		const live = SCENARIO_BY_ID.get('PLOT-EQUITY');
		expect(live, 'PLOT-EQUITY must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(plotEquitySnapshot.payload);
	});
	it('toScenario(PLOT_EQUITY_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(PLOT_EQUITY_JOURNEY).payload).toEqual(plotEquitySnapshot.payload);
	});

	it('committed snapshot matches live hand-written PLOT_CONSTRUCTION_ONLY.payload', () => {
		const live = SCENARIO_BY_ID.get('PLOT-CONSTRUCTION-ONLY');
		expect(live, 'PLOT-CONSTRUCTION-ONLY must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(plotConstructionOnlySnapshot.payload);
	});
	it('toScenario(PLOT_CONSTRUCTION_ONLY_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(PLOT_CONSTRUCTION_ONLY_JOURNEY).payload).toEqual(
			plotConstructionOnlySnapshot.payload
		);
	});

	it('committed snapshot matches live hand-written PLOT_BT.payload', () => {
		const live = SCENARIO_BY_ID.get('PLOT-BT');
		expect(live, 'PLOT-BT must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(plotBtSnapshot.payload);
	});
	it('toScenario(PLOT_BT_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(PLOT_BT_JOURNEY).payload).toEqual(plotBtSnapshot.payload);
	});

	// ─── LAP loan family — 5 scenarios × 2 assertions ──────────────────────

	it('committed snapshot matches live hand-written LAP_NEW_TERM.payload', () => {
		const live = SCENARIO_BY_ID.get('LAP-NEW-TERM');
		expect(live, 'LAP-NEW-TERM must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(lapNewTermSnapshot.payload);
	});
	it('toScenario(LAP_NEW_TERM_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(LAP_NEW_TERM_JOURNEY).payload).toEqual(lapNewTermSnapshot.payload);
	});

	it('committed snapshot matches live hand-written LAP_BT_TERM.payload', () => {
		const live = SCENARIO_BY_ID.get('LAP-BT-TERM');
		expect(live, 'LAP-BT-TERM must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(lapBtTermSnapshot.payload);
	});
	it('toScenario(LAP_BT_TERM_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(LAP_BT_TERM_JOURNEY).payload).toEqual(lapBtTermSnapshot.payload);
	});

	it('committed snapshot matches live hand-written LAP_TOPUP_TERM.payload', () => {
		const live = SCENARIO_BY_ID.get('LAP-TOPUP-TERM');
		expect(live, 'LAP-TOPUP-TERM must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(lapTopupTermSnapshot.payload);
	});
	it('toScenario(LAP_TOPUP_TERM_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(LAP_TOPUP_TERM_JOURNEY).payload).toEqual(lapTopupTermSnapshot.payload);
	});

	it('committed snapshot matches live hand-written LAP_BT_TOPUP.payload', () => {
		const live = SCENARIO_BY_ID.get('LAP-BT-TOPUP');
		expect(live, 'LAP-BT-TOPUP must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(lapBtTopupSnapshot.payload);
	});
	it('toScenario(LAP_BT_TOPUP_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(LAP_BT_TOPUP_JOURNEY).payload).toEqual(lapBtTopupSnapshot.payload);
	});

	it('committed snapshot matches live hand-written LAP_DOD_NEW.payload', () => {
		const live = SCENARIO_BY_ID.get('LAP-DOD-NEW');
		expect(live, 'LAP-DOD-NEW must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(lapDodNewSnapshot.payload);
	});
	it('toScenario(LAP_DOD_NEW_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(LAP_DOD_NEW_JOURNEY).payload).toEqual(lapDodNewSnapshot.payload);
	});

	// ─── Edge cases (tier-1 simpler: PL-like) ──────────────────────────────────
	// Remaining complex edges (EDGE_CIBIL_580 HL-UC, EDGE_HIGH_FOIR, EDGE_NRI,
	// EDGE_COMPANY_PVT, EDGE_3_APPLICANTS, EDGE_AGE_68 LAP, EDGE_BT_CREDIT_LINES,
	// EDGE_PROF_LAWYER_DC, EDGE_GOVT_SAL, EDGE_HIGH_VALUE) deferred.

	it('committed snapshot matches live hand-written EDGE_AGE_23.payload', () => {
		const live = SCENARIO_BY_ID.get('EDGE-AGE-23');
		expect(live, 'EDGE-AGE-23 must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(edgeAge23Snapshot.payload);
	});
	it('toScenario(EDGE_AGE_23_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(EDGE_AGE_23_JOURNEY).payload).toEqual(edgeAge23Snapshot.payload);
	});

	it('committed snapshot matches live hand-written EDGE_AGE_68.payload', () => {
		const live = SCENARIO_BY_ID.get('EDGE-AGE-68');
		expect(live, 'EDGE-AGE-68 must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(edgeAge68Snapshot.payload);
	});
	it('toScenario(EDGE_AGE_68_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(EDGE_AGE_68_JOURNEY).payload).toEqual(edgeAge68Snapshot.payload);
	});

	it('committed snapshot matches live hand-written EDGE_CIBIL_650.payload', () => {
		const live = SCENARIO_BY_ID.get('EDGE-CIBIL-650');
		expect(live, 'EDGE-CIBIL-650 must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(edgeCibil650Snapshot.payload);
	});
	it('toScenario(EDGE_CIBIL_650_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(EDGE_CIBIL_650_JOURNEY).payload).toEqual(edgeCibil650Snapshot.payload);
	});

	it('committed snapshot matches live hand-written EDGE_HIGH_FOIR.payload', () => {
		const live = SCENARIO_BY_ID.get('EDGE-HIGH-FOIR');
		expect(live, 'EDGE-HIGH-FOIR must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(edgeHighFoirSnapshot.payload);
	});
	it('toScenario(EDGE_HIGH_FOIR_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(EDGE_HIGH_FOIR_JOURNEY).payload).toEqual(edgeHighFoirSnapshot.payload);
	});

	// EDGE-BT-CREDIT-LINES — Home Loan BT Only with OD + CC (credit_line) + Car Loan
	it('committed snapshot matches live hand-written EDGE_BT_CREDIT_LINES.payload', () => {
		const live = SCENARIO_BY_ID.get('EDGE-BT-CREDIT-LINES');
		expect(live, 'EDGE-BT-CREDIT-LINES must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(edgeBtCreditLinesSnapshot.payload);
	});
	it('toScenario(EDGE_BT_CREDIT_LINES_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(EDGE_BT_CREDIT_LINES_JOURNEY).payload).toEqual(
			edgeBtCreditLinesSnapshot.payload
		);
	});

	// EDGE-CIBIL-580 — HL UC direct_from_builder, OLD_MUNICIPAL, stressed salaried
	it('committed snapshot matches live hand-written EDGE_CIBIL_580.payload', () => {
		const live = SCENARIO_BY_ID.get('EDGE-CIBIL-580');
		expect(live, 'EDGE-CIBIL-580 must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(edgeCibil580Snapshot.payload);
	});
	it('toScenario(EDGE_CIBIL_580_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(EDGE_CIBIL_580_JOURNEY).payload).toEqual(edgeCibil580Snapshot.payload);
	});

	// EDGE-COMPANY-PVT — Company applicantType (Private Ltd) + director co-applicants
	it('committed snapshot matches live hand-written EDGE_COMPANY_PVT.payload', () => {
		const live = SCENARIO_BY_ID.get('EDGE-COMPANY-PVT');
		expect(live, 'EDGE-COMPANY-PVT must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(edgeCompanyPvtSnapshot.payload);
	});
	it('toScenario(EDGE_COMPANY_PVT_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(EDGE_COMPANY_PVT_JOURNEY).payload).toEqual(edgeCompanyPvtSnapshot.payload);
	});

	// EDGE-GOVT-SAL — LAP Salaried(Government) governmentProfile path
	it('committed snapshot matches live hand-written EDGE_GOVT_SAL.payload', () => {
		const live = SCENARIO_BY_ID.get('EDGE-GOVT-SAL');
		expect(live, 'EDGE-GOVT-SAL must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(edgeGovtSalSnapshot.payload);
	});
	it('toScenario(EDGE_GOVT_SAL_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(EDGE_GOVT_SAL_JOURNEY).payload).toEqual(edgeGovtSalSnapshot.payload);
	});

	// EDGE-HIGH-VALUE — HL ₹5Cr, Self-employed(Other) businessProfile + financials
	it('committed snapshot matches live hand-written EDGE_HIGH_VALUE.payload', () => {
		const live = SCENARIO_BY_ID.get('EDGE-HIGH-VALUE');
		expect(live, 'EDGE-HIGH-VALUE must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(edgeHighValueSnapshot.payload);
	});
	it('toScenario(EDGE_HIGH_VALUE_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(EDGE_HIGH_VALUE_JOURNEY).payload).toEqual(edgeHighValueSnapshot.payload);
	});

	// EDGE-NRI — HL NRI applicant with GPA details
	it('committed snapshot matches live hand-written EDGE_NRI.payload', () => {
		const live = SCENARIO_BY_ID.get('EDGE-NRI');
		expect(live, 'EDGE-NRI must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(edgeNriSnapshot.payload);
	});
	it('toScenario(EDGE_NRI_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(EDGE_NRI_JOURNEY).payload).toEqual(edgeNriSnapshot.payload);
	});

	// EDGE-PROF-LAWYER-DC — Professional Loan Lawyer Debt Consolidation
	it('committed snapshot matches live hand-written EDGE_PROF_LAWYER_DC.payload', () => {
		const live = SCENARIO_BY_ID.get('EDGE-PROF-LAWYER-DC');
		expect(live, 'EDGE-PROF-LAWYER-DC must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(edgeProfLawyerDcSnapshot.payload);
	});
	it('toScenario(EDGE_PROF_LAWYER_DC_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(EDGE_PROF_LAWYER_DC_JOURNEY).payload).toEqual(
			edgeProfLawyerDcSnapshot.payload
		);
	});

	// EDGE-3-APPLICANTS — HL with 3 applicants (husband + wife + father)
	it('committed snapshot matches live hand-written EDGE_3_APPLICANTS.payload', () => {
		const live = SCENARIO_BY_ID.get('EDGE-3-APPLICANTS');
		expect(live, 'EDGE-3-APPLICANTS must exist in formPathScenarios.ts').toBeDefined();
		expect(live!.payload).toEqual(edge3ApplicantsSnapshot.payload);
	});
	it('toScenario(EDGE_3_APPLICANTS_JOURNEY).payload matches pre-migration snapshot', () => {
		expect(toScenario(EDGE_3_APPLICANTS_JOURNEY).payload).toEqual(edge3ApplicantsSnapshot.payload);
	});
});

describe('schemaFixtureFactory — FM-5 schema round-trip', () => {
	it('every loan composer returns a loadable, indexable schema', () => {
		const composers = [
			['Home Loan', composeHomeLoanSchema],
			['Loan Against Property', composeLapLoanSchema],
			['Plot Loan', composePlotLoanSchema],
			['Personal Loan', composePersonalLoanSchema],
			['Business Loan', composeBusinessLoanSchema],
			['Professional Loan', composeProfessionalLoanSchema]
		] as const;

		for (const [name, compose] of composers) {
			const schema = compose();
			expect(schema.pages, `${name} schema must have pages`).toBeDefined();
			expect(schema.pages.length, `${name} schema must have ≥1 page`).toBeGreaterThan(0);
			// Every page must have a non-empty string id; duplicate ids are rejected
			// by the indexer (Map semantics), so a duplicate would surface as a
			// mismatched page count against a hand-built unique-id set.
			const ids = schema.pages.map((p) => p.id);
			expect(new Set(ids).size, `${name} has duplicate page ids: ${ids.join(', ')}`).toBe(
				ids.length
			);
		}
	});

	it('throws a descriptive error for an unknown pageId', () => {
		const badJourney = journey({
			id: 'TEST-BAD-PAGE',
			description: 'intentionally-unknown pageId',
			loanName: 'Home Loan',
			steps: [page('this-page-does-not-exist', { assessmentStatus: 'fresh' })]
		});

		expect(() => playJourney(badJourney)).toThrow(
			/Unknown pageId 'this-page-does-not-exist'/
		);
	});

	it('throws a descriptive error for an unknown bindsTo key on a non-custom page', () => {
		const badJourney = journey({
			id: 'TEST-BAD-KEY',
			description: 'intentionally-unknown bindsTo key',
			loanName: 'Home Loan',
			steps: [
				page('caseIntake_homeLoan', {
					assessmentStatus: 'fresh',
					totallyFakeKey: 'whatever'
				})
			]
		});

		expect(() => playJourney(badJourney)).toThrow(/Unknown answer key 'totallyFakeKey'/);
	});

	it('allows arbitrary keys on custom-component pages (applicantProfilePage etc.)', () => {
		// tellUs_homeLoan is rendered by ApplicantForm and has questions: [].
		// A journey that sets an arbitrary key on it must NOT throw — the
		// custom component manages its own keyspace.
		const j = journey({
			id: 'TEST-CUSTOM-PAGE',
			description: 'custom component page bindsTo bypass',
			loanName: 'Home Loan',
			initialAnswers: { loanType: 'New Loan' },
			steps: [
				page('tellUs_homeLoan', {
					arbitrary_custom_key: 'some-value'
				})
			]
		});

		expect(() => playJourney(j)).not.toThrow();
		const end = playJourney(j);
		expect(end.answers.arbitrary_custom_key).toBe('some-value');
	});
});

describe('schemaFixtureFactory — toScenario() smoke test', () => {
	const scenario = toScenario(HL_NEW_SAL_CLEAN_JOURNEY);

	it('produces the legacy FormPathScenario shape', () => {
		expect(scenario.id).toBe('HL-NEW-SAL-CLEAN');
		expect(scenario.description).toBe(HL_NEW_SAL_CLEAN_JOURNEY.description);
		expect(scenario.expectedRoute).toBe('/form/home-loan');
		expect(scenario.tags).toEqual([...HL_NEW_SAL_CLEAN_JOURNEY.tags]);
	});

	it('formPath is derived from accumulated answers (not hand-written)', () => {
		expect(scenario.formPath.q1_loanName).toBe('Home Loan');
		expect(scenario.formPath.q4_loanType).toBe('New Loan');
	});

	it('payload is a well-formed LoanApplicationPayload', () => {
		expect(scenario.payload.loanTransaction).toBeDefined();
		expect(scenario.payload.loanTransaction.loanName).toBe('Home Loan');
		expect(Array.isArray(scenario.payload.allApplicantDetails)).toBe(true);
		expect(scenario.payload.allApplicantDetails.length).toBe(1);
	});

	it('expectedFill is visibility-aware and non-empty', () => {
		expect(scenario.expectedFill.expectedAsked.length).toBeGreaterThan(0);
		expect(scenario.expectedFill.expectedPageCount).toBeGreaterThan(0);

		// No key should appear in both asked and skipped.
		const askedSet = new Set(scenario.expectedFill.expectedAsked);
		for (const k of scenario.expectedFill.expectedSkipped) {
			expect(askedSet.has(k), `key '${k}' in both asked and skipped`).toBe(false);
		}
	});
});
