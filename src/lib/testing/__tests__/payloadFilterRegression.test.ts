/**
 * Regression tests for the submission-pipeline filter.
 * ═══════════════════════════════════════════════════════════════════
 *
 * Three correctness guarantees are asserted here. Each was documented as
 * a real bug class in SESSION-HANDOFF.md §S77c:
 *
 *   (a) Layer A drops loan-answer keys for questions whose page/showWhen
 *       hides them — ensuring stale business answers do not leak into the
 *       submission payload after the user switches branches.
 *
 *   (b) Layer B strips non-guarantor obligation rows when an applicant is
 *       in guarantor-only mode (ObligationsRunning=No + isGuarantorOnOtherLoan=Yes),
 *       preventing inflated EMI/FOIR from stale co-borrower rows.
 *
 *   (c) Layer B drops income entries whose `profileType` is not in
 *       `selectedIncomeProfiles` — deselecting rental income must remove
 *       its contribution to gross income derivations.
 *
 * In addition, we assert the filter never mutates its inputs. The raw
 * store is load-bearing for back-navigation UX and must stay pristine.
 * ═══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
	buildFilteredAnswers,
	explainFilter,
	APPLICANT_GATES,
	LOAN_ANSWERS_GATES
} from '$lib/utils/payloadFilter';
import type { Schema } from '$lib/types/formTypes';

// ────────────────────────────────────────────────────────────────────
// Layer A — schema-driven floor
// ────────────────────────────────────────────────────────────────────

describe('buildFilteredAnswers — Layer A (schema-driven)', () => {
	/**
	 * Minimal schema: employmentType gates whether businessVintage is visible.
	 * Mirrors the real-world "user flipped from Business to Salaried" scenario.
	 */
	const schema: Schema = {
		pages: [
			{
				id: 'employmentPage',
				questions: [{ id: 'q_et', bindsTo: 'employmentType', type: 'radio' }]
			},
			{
				id: 'businessProfilePage',
				questions: [
					{
						id: 'q_bv',
						bindsTo: 'businessVintage',
						type: 'select',
						showWhen: { '==': [{ var: 'employmentType' }, 'self_employed'] }
					},
					{
						id: 'q_gst',
						bindsTo: 'gstRegistrationStatus',
						type: 'select',
						showWhen: { '==': [{ var: 'employmentType' }, 'self_employed'] }
					}
				]
			},
			{
				id: 'loanRequirementPage',
				questions: [{ id: 'q_la', bindsTo: 'loanAmount', type: 'number' }]
			}
		]
	};

	it('drops stale business keys when user has switched to salaried', () => {
		const raw = {
			employmentType: 'salaried',
			// Stale answers from a previous Business branch — the user filled these,
			// then flipped employment type. Raw memory keeps them for restoration;
			// the submission filter must drop them.
			businessVintage: '3-5yr',
			gstRegistrationStatus: 'REGISTERED',
			loanAmount: 2500000
		};

		const view = buildFilteredAnswers(schema, raw, []);

		expect(view.loanAnswers.employmentType).toBe('salaried');
		expect(view.loanAnswers.loanAmount).toBe(2500000);
		expect(view.loanAnswers).not.toHaveProperty('businessVintage');
		expect(view.loanAnswers).not.toHaveProperty('gstRegistrationStatus');
	});

	it('keeps business keys when the branch is currently visible', () => {
		const raw = {
			employmentType: 'self_employed',
			businessVintage: '3-5yr',
			gstRegistrationStatus: 'REGISTERED',
			loanAmount: 2500000
		};

		const view = buildFilteredAnswers(schema, raw, []);

		expect(view.loanAnswers.businessVintage).toBe('3-5yr');
		expect(view.loanAnswers.gstRegistrationStatus).toBe('REGISTERED');
	});

	it('passthrough when schema is null (Layer A disabled — Phase 1.6)', () => {
		const raw = {
			employmentType: 'salaried',
			businessVintage: '3-5yr'
		};

		const view = buildFilteredAnswers(null, raw, []);

		// Without schema, Layer A cannot run; keys remain. Layer B (applicant
		// gates) is the only enforcement until client schema plumbing lands.
		expect(view.loanAnswers).toEqual(raw);
	});

	it('reports dropped keys via explainFilter', () => {
		const raw = {
			employmentType: 'salaried',
			businessVintage: '3-5yr',
			gstRegistrationStatus: 'REGISTERED',
			loanAmount: 2500000
		};

		const explanation = explainFilter(schema, raw, []);

		expect(explanation.layerADropped).toEqual(
			expect.arrayContaining(['businessVintage', 'gstRegistrationStatus'])
		);
		expect(explanation.layerADropped).not.toContain('employmentType');
		expect(explanation.layerADropped).not.toContain('loanAmount');
	});
});

// ────────────────────────────────────────────────────────────────────
// Layer B — guarantor-only mode gate
// ────────────────────────────────────────────────────────────────────

describe('buildFilteredAnswers — includeGuarantorObligations gate', () => {
	it('strips non-guarantor rows when in guarantor-only mode', () => {
		const applicant = {
			applicantType: 'Individual',
			ObligationsRunning: 'No',
			isGuarantorOnOtherLoan: 'Yes',
			obligations: [
				{ id: '1', role: 'guarantor', loanType: 'Home Loan', emi: '15000' },
				{ id: '2', role: 'primary', loanType: 'Personal Loan', emi: '8000' },
				{ id: '3', role: 'co_borrower', loanType: 'Car Loan', emi: '12000' }
			]
		};

		const view = buildFilteredAnswers(null, {}, [applicant]);
		const filtered = view.applicants[0];

		expect(filtered.obligations).toHaveLength(1);
		expect((filtered.obligations as Array<{ id: string }>)[0].id).toBe('1');
	});

	it('leaves obligations untouched when NOT in guarantor-only mode', () => {
		const applicant = {
			applicantType: 'Individual',
			ObligationsRunning: 'Yes',
			isGuarantorOnOtherLoan: 'No',
			obligations: [
				{ id: '1', role: 'guarantor', loanType: 'Home Loan', emi: '15000' },
				{ id: '2', role: 'primary', loanType: 'Personal Loan', emi: '8000' }
			]
		};

		const view = buildFilteredAnswers(null, {}, [applicant]);
		const filtered = view.applicants[0];

		expect(filtered.obligations).toHaveLength(2);
	});

	it('normalises legacy split-arrays into unified obligations in guarantor-only mode', () => {
		const applicant = {
			applicantType: 'Individual',
			ObligationsRunning: 'No',
			isGuarantorOnOtherLoan: 'Yes',
			// Legacy shape: no `obligations` field, instead split arrays.
			tableLoanEntries: [
				{ id: 'L1', role: 'guarantor', loanType: 'Home Loan', emi: '15000' },
				{ id: 'L2', role: 'primary', loanType: 'Personal Loan', emi: '8000' }
			],
			tableLimitEntries: [
				{ id: 'C1', role: 'co_borrower', loanType: 'CC Limit', totalLimit: '100000' }
			]
		};

		const view = buildFilteredAnswers(null, {}, [applicant]);
		const filtered = view.applicants[0];

		// Only the guarantor row survives, and it's in the unified array.
		expect(filtered.obligations).toHaveLength(1);
		expect((filtered.obligations as Array<{ id: string }>)[0].id).toBe('L1');
	});
});

// ────────────────────────────────────────────────────────────────────
// Layer B — selected income profiles gate
// ────────────────────────────────────────────────────────────────────

describe('buildFilteredAnswers — includeSelectedIncomeProfiles gate', () => {
	it('drops income entries whose profileType is deselected', () => {
		const applicant = {
			applicantType: 'Individual',
			selectedIncomeProfiles: ['salaried'],
			incomeEntries: [
				{ profileType: 'salaried', entityName: 'Acme Corp', income: { monthly: 80000 } },
				{ profileType: 'rental_income', entityName: 'Flat A-1', income: { monthly: 25000 } }
			]
		};

		const view = buildFilteredAnswers(null, {}, [applicant]);
		const entries = view.applicants[0].incomeEntries as Array<{ profileType: string }>;

		expect(entries).toHaveLength(1);
		expect(entries[0].profileType).toBe('salaried');
	});

	it('retains all entries when selectedIncomeProfiles is empty (legacy-safe)', () => {
		const applicant = {
			applicantType: 'Individual',
			incomeEntries: [
				{ profileType: 'salaried', entityName: 'Acme', income: {} },
				{ profileType: 'rental_income', entityName: 'Flat', income: {} }
			]
		};

		const view = buildFilteredAnswers(null, {}, [applicant]);
		const entries = view.applicants[0].incomeEntries as Array<unknown>;
		expect(entries).toHaveLength(2);
	});
});

// ────────────────────────────────────────────────────────────────────
// Non-mutation invariant
// ────────────────────────────────────────────────────────────────────

describe('buildFilteredAnswers — non-mutation invariant', () => {
	it('never mutates the raw loan-answers object', () => {
		const raw = {
			employmentType: 'salaried',
			businessVintage: '3-5yr',
			loanAmount: 1000000
		};
		const snapshot = JSON.parse(JSON.stringify(raw));

		const schema: Schema = {
			pages: [
				{
					id: 'employmentPage',
					questions: [{ id: 'q', bindsTo: 'employmentType', type: 'radio' }]
				},
				{
					id: 'business',
					questions: [
						{
							id: 'q_bv',
							bindsTo: 'businessVintage',
							type: 'select',
							showWhen: { '==': [{ var: 'employmentType' }, 'self_employed'] }
						}
					]
				}
			]
		};

		buildFilteredAnswers(schema, raw, []);

		expect(raw).toEqual(snapshot);
	});

	it('never mutates applicant records or their obligation arrays', () => {
		const applicant = {
			applicantType: 'Individual',
			ObligationsRunning: 'No',
			isGuarantorOnOtherLoan: 'Yes',
			obligations: [
				{ id: '1', role: 'guarantor' },
				{ id: '2', role: 'primary' }
			]
		};
		const snapshot = JSON.parse(JSON.stringify(applicant));

		buildFilteredAnswers(null, {}, [applicant]);

		expect(applicant).toEqual(snapshot);
		// And the original array still has both entries (we filtered a copy).
		expect((applicant.obligations as Array<unknown>).length).toBe(2);
	});

	it('preserves applicant array length even when each applicant is filtered', () => {
		const applicants = [
			{ applicantType: 'Individual', ObligationsRunning: 'No', isGuarantorOnOtherLoan: 'Yes' },
			{ applicantType: 'Individual', ObligationsRunning: 'Yes' },
			{ applicantType: 'Company' }
		];
		const view = buildFilteredAnswers(null, {}, applicants);
		expect(view.applicants).toHaveLength(3);
	});
});

// ────────────────────────────────────────────────────────────────────
// Registry sanity
// ────────────────────────────────────────────────────────────────────

describe('payloadFilter — gate registry sanity', () => {
	it('every applicant gate has a name and description', () => {
		for (const gate of APPLICANT_GATES) {
			expect(gate.name).toBeTruthy();
			expect(gate.description).toBeTruthy();
			expect(typeof gate.apply).toBe('function');
		}
	});

	it('every loan-answers gate has a name and description', () => {
		for (const gate of LOAN_ANSWERS_GATES) {
			expect(gate.name).toBeTruthy();
			expect(gate.description).toBeTruthy();
			expect(typeof gate.apply).toBe('function');
		}
	});

	it('applicant gates include the two seeded from inline builders', () => {
		const names = APPLICANT_GATES.map((g) => g.name);
		expect(names).toContain('includeGuarantorObligations');
		expect(names).toContain('includeSelectedIncomeProfiles');
	});
});
