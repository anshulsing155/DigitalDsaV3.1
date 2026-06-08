/**
 * =============================================================================
 * S77d Phase 1.6 — Server-Side Folded Parity Regression Tests
 * =============================================================================
 *
 * The server-side twin of the client-side submission filter (S77c). Verifies
 * that the POST /api/evaluate-and-persist handler projects raw formState
 * through `buildFilteredAnswers()` BEFORE invoking `buildLoanPayload()`, so
 * that stale-branch data can never reach the rule engine via a direct server
 * hit (e.g., replayed session, scripted client).
 *
 * THROWAWAY FIXTURES — these inline payloads will be replaced by the
 * schema-driven fixture factory (next-session work, see SESSION-HANDOFF
 * "Fixture Overhaul" entry). The 6-loan breadth sweep remains intact after
 * migration; only the fixture construction changes.
 *
 * TEST STRATEGY
 * ─────────────
 * `buildLoanPayload` is mocked so the test can inspect what the filter
 * produces without needing a fully-valid loan payload per loan type. The
 * assertion surface is the filter wiring, not the rule-engine output.
 *
 *   _buildPayloadFromFormState(formState, loanType, relationships)
 *      ↓
 *   buildFilteredAnswers(null, rawLoanAnswers, rawApplicants)  ← the fix
 *      ↓
 *   buildLoanPayload(view.loanAnswers, view.applicants, ...)   ← captured
 *
 * COVERAGE
 * ────────
 *   Thorough breadth: all 6 loan paths (home, LAP, plot, personal, business,
 *   professional) confirm the filter runs end-to-end per loan type.
 *
 *   Cross-cutting integrity:
 *     - Layer A passthrough (schema=null → loanAnswers reach unchanged)
 *     - Non-mutation invariant (raw formState + applicants untouched)
 *     - Legacy split-array normalization (tableLoanEntries/tableLimitEntries
 *       folded into unified obligations when in guarantor-only mode)
 *
 * =============================================================================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Hoisted mock spy — captures args passed to buildLoanPayload so we can
// inspect the output of the filter layer without needing a valid minimal
// loan payload per loan type.
// ─────────────────────────────────────────────────────────────────────────────

const { buildLoanPayloadSpy } = vi.hoisted(() => ({
	buildLoanPayloadSpy: vi.fn()
}));

vi.mock('$lib/utils/payloadBuilder/index.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/utils/payloadBuilder/index.js')>();
	return {
		...actual,
		buildLoanPayload: buildLoanPayloadSpy
	};
});

// Import AFTER vi.mock — the mock is hoisted, so the handler will see the spy.
import { _buildPayloadFromFormState } from '../../../../routes/api/evaluate-and-persist/+server.js';

// ─────────────────────────────────────────────────────────────────────────────
// Fixture helpers (inline — throwaway until schema-driven factory lands)
// ─────────────────────────────────────────────────────────────────────────────

type LoanAnswers = Record<string, unknown>;
type Applicant = Record<string, unknown>;
type FormState = {
	loanData: Record<string, unknown>;
	applicationData: Record<string, unknown>;
	applicants: Applicant[];
};

function makeFormState(loanName: string, applicants: Applicant[], answers?: LoanAnswers): FormState {
	return {
		loanData: {
			[loanName]: answers ?? { loanAmount: 1_000_000, tenureYears: 10 }
		},
		applicationData: { loanName },
		applicants
	};
}

/**
 * Applicant in "guarantor-only mode" with stale non-guarantor obligation
 * rows + a deselected rental-income entry. Exercises both Layer B gates.
 */
function guarantorOnlyApplicantWithStaleIncome(): Applicant {
	return {
		applicantType: 'Individual',
		ObligationsRunning: 'No',
		isGuarantorOnOtherLoan: 'Yes',
		obligations: [
			{ id: 'G1', role: 'guarantor', loanType: 'Home Loan', emi: '15000' },
			{ id: 'P1', role: 'primary', loanType: 'Personal Loan', emi: '8000' },
			{ id: 'CB1', role: 'co_borrower', loanType: 'Car Loan', emi: '12000' }
		],
		selectedIncomeProfiles: ['salaried'],
		incomeEntries: [
			{ profileType: 'salaried', entityName: 'Acme Corp', income: { monthly: 80000 } },
			{ profileType: 'rental_income', entityName: 'Flat A-1', income: { monthly: 25000 } }
		]
	};
}

/** All 6 loan types — loanType (rule-engine key) + loanName (form-state key). */
const LOAN_PATHS: ReadonlyArray<{ loanType: string; loanName: string }> = [
	{ loanType: 'Home Loan', loanName: 'Home Loan' },
	{ loanType: 'Loan Against Property', loanName: 'Loan Against Property' },
	{ loanType: 'Plot Loan', loanName: 'Plot Loan' },
	{ loanType: 'Personal Loan', loanName: 'Personal Loan' },
	{ loanType: 'Business Loan', loanName: 'Business Loan' },
	{ loanType: 'Professional Loan', loanName: 'Professional Loan' }
];

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('S77d Phase 1.6 — /api/evaluate-and-persist server-side folded parity', () => {
	beforeEach(() => {
		// Reset capture history; install the default stub return shape.
		buildLoanPayloadSpy.mockReset();
		buildLoanPayloadSpy.mockImplementation(
			(_loanAnswers: unknown, applicants: unknown[], _appData: unknown, _rels: unknown) => ({
				loanTransaction: { loanName: 'stub', loanAmount: 100, tenureYears: 10 },
				allApplicantDetails: applicants
			})
		);
	});

	// ── Per-loan-path breadth sweep ──────────────────────────────────────────
	// Layer B gates are loan-type-agnostic (they read applicant state, not
	// loanAnswers), but we assert wiring works end-to-end per loan type so
	// that any loanName-specific dispatch in `_buildPayloadFromFormState`
	// keeps the filter on the hot path.

	describe('Layer B gates active for all 6 loan paths', () => {
		for (const { loanType, loanName } of LOAN_PATHS) {
			it(`${loanType} — strips non-guarantor obligations + deselected income entries`, () => {
				const formState = makeFormState(loanName, [guarantorOnlyApplicantWithStaleIncome()]);

				_buildPayloadFromFormState(formState, loanType);

				expect(buildLoanPayloadSpy).toHaveBeenCalledTimes(1);
				const call = buildLoanPayloadSpy.mock.calls[0];
				const applicants = call[1] as Applicant[];
				expect(applicants).toHaveLength(1);

				// includeGuarantorObligations: only the guarantor row survives.
				const obligations = applicants[0].obligations as Array<{ id: string; role: string }>;
				expect(obligations).toHaveLength(1);
				expect(obligations[0].id).toBe('G1');
				expect(obligations[0].role).toBe('guarantor');

				// includeSelectedIncomeProfiles: rental_income was deselected.
				const incomeEntries = applicants[0].incomeEntries as Array<{
					profileType: string;
				}>;
				expect(incomeEntries).toHaveLength(1);
				expect(incomeEntries[0].profileType).toBe('salaried');
			});
		}
	});

	// ── Layer A passthrough (Phase 1.6 posture — schema=null) ───────────────

	describe('Layer A passthrough (schema=null)', () => {
		it('loanAnswers reach buildLoanPayload unchanged — no hidden-key stripping', () => {
			// Keys that WOULD be dropped if Layer A were active (e.g., after a
			// user switched from self_employed to salaried). With schema=null,
			// the filter must preserve them and let downstream consumers ignore.
			const formState = makeFormState('Home Loan', [guarantorOnlyApplicantWithStaleIncome()], {
				loanAmount: 2_500_000,
				propertyCost: 5_000_000,
				employmentType: 'salaried',
				businessVintage: '3-5yr',
				gstRegistrationStatus: 'REGISTERED'
			});

			_buildPayloadFromFormState(formState, 'Home Loan');

			expect(buildLoanPayloadSpy).toHaveBeenCalledTimes(1);
			const loanAnswers = buildLoanPayloadSpy.mock.calls[0][0] as LoanAnswers;
			expect(loanAnswers).toMatchObject({
				loanAmount: 2_500_000,
				propertyCost: 5_000_000,
				employmentType: 'salaried',
				businessVintage: '3-5yr',
				gstRegistrationStatus: 'REGISTERED'
			});
		});
	});

	// ── Non-mutation invariant ──────────────────────────────────────────────

	describe('non-mutation invariant', () => {
		it('raw formState + applicants + obligations arrays are untouched post-call', () => {
			const applicant = guarantorOnlyApplicantWithStaleIncome();
			const formState = makeFormState('Home Loan', [applicant]);
			const snapshot = JSON.parse(JSON.stringify(formState));

			_buildPayloadFromFormState(formState, 'Home Loan');

			// Whole formState identical to pre-call snapshot.
			expect(formState).toEqual(snapshot);

			// Applicant's own arrays retain every original row — back-navigation
			// UX depends on this.
			expect((applicant.obligations as unknown[]).length).toBe(3);
			expect((applicant.incomeEntries as unknown[]).length).toBe(2);
			expect((applicant.selectedIncomeProfiles as unknown[]).length).toBe(1);
		});
	});

	// ── Legacy split-array normalization (guarantor-only mode) ──────────────

	describe('legacy split-array normalization', () => {
		it('tableLoanEntries + tableLimitEntries collapse into unified obligations', () => {
			const legacyApplicant: Applicant = {
				applicantType: 'Individual',
				ObligationsRunning: 'No',
				isGuarantorOnOtherLoan: 'Yes',
				// Legacy persisted shape: split arrays, no unified `obligations`.
				tableLoanEntries: [
					{ id: 'L1', role: 'guarantor', loanType: 'Home Loan', emi: '15000' },
					{ id: 'L2', role: 'primary', loanType: 'Personal Loan', emi: '8000' }
				],
				tableLimitEntries: [
					{ id: 'C1', role: 'co_borrower', loanType: 'CC Limit', totalLimit: '100000' }
				]
			};
			const formState = makeFormState('Home Loan', [legacyApplicant]);

			_buildPayloadFromFormState(formState, 'Home Loan');

			expect(buildLoanPayloadSpy).toHaveBeenCalledTimes(1);
			const applicants = buildLoanPayloadSpy.mock.calls[0][1] as Applicant[];
			const obligations = applicants[0].obligations as Array<{ id: string; role: string }>;

			// Only the guarantor row survives, and it's in the unified array.
			expect(obligations).toHaveLength(1);
			expect(obligations[0].id).toBe('L1');
			expect(obligations[0].role).toBe('guarantor');
		});
	});
});
