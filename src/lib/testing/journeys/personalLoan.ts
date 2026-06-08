/**
 * ═══════════════════════════════════════════════════════════════════════════
 * S77e — Personal Loan Journeys (Step 4)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Personal Loan is an unsecured loan — no property pages.
 * Schema pages (personalLoan/pages.ts):
 *   - caseIntake_personalLoan
 *   - loanRequirementPage  (loanPurpose, loanTenure, loanAmount)
 *   - locationPage / locationPageDC (residence)
 *   - applicantPage        (custom component)
 *   - incomeProfilesPage   (custom)
 *   - incomeDetailsPage    (custom)
 *   - creditScorePage      (custom)
 *   - obligationsPage      (custom)
 *
 * The payload builder (loanTransaction.ts) does NOT read `loanTenure` — it
 * reads `mortgageYear` / `tenure`. We pass `mortgageYear` via
 * `initialAnswers` (which skip schema bindsTo validation) to set
 * `tenureYears` on the payload without polluting a loanRequirementPage set.
 *
 * We deliberately do NOT set `facilityType`, `urgencyLevel`, or
 * `existingBankRelationship` in journeys — the hand-written scenarios
 * used invalid enum values (e.g. 'STANDARD', 'YES') that the schema
 * never produces. The Step-4 classification (i) FIXTURE-WAS-WRONG:
 * scenario payloads are rewritten to match actual builder output and
 * those fields are dropped. See snapshot `_shift_notes_S77e_step4`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	journey,
	page,
	addApplicant
} from '$lib/testing/factory/journeyHarness.js';
import type { Journey } from '$lib/testing/factory/journeyTypes.js';

// ─────────────────────────────────────────────────────────────────────────────
// PL-FRESH-YES-OBLIG — Salaried with 1 obligation, Bangalore, CIBIL 750
// ─────────────────────────────────────────────────────────────────────────────

export const PL_FRESH_YES_OBLIG_JOURNEY: Journey = journey({
	id: 'PL-FRESH-YES-OBLIG',
	description: 'Personal Loan Start Fresh — Salaried with obligations, Bangalore, CIBIL 750',
	tags: ['personal-loan', 'start-fresh', 'yes-obligations', 'salaried'],
	seed: 101,
	loanName: 'Personal Loan',

	// prelude: loanType from how-can-we-help; mortgageYear bypasses schema to
	// feed the buildLoanTransactionPayload tenureYears read.
	initialAnswers: {
		loanType: 'New Loan',
		mortgageYear: 3
	},

	steps: [
		page('caseIntake_personalLoan', {
			assessmentStatus: 'fresh'
		}),

		// loanRequirementPage — loanAmount is the only key needed for builder.
		// loanPurpose/loanTenure are required for live submit but not for
		// payload shape; omitting them avoids polluting output with fields
		// the hand-written scenarios don't carry.
		page('loanRequirementPage', {
			loanAmount: 500000
		}),

		// Applicant — raw form-engine keys (TypeOfResidence, salariedActivityDetailsVisible).
		// ObligationsRunning 'Yes' → hasExistingObligations: true; obligations array
		// is cleaned via cleanObligationEntries() which adds defaults (remainingLimit: '0', etc.).
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Rahul Nair',
			age: 30,
			gender: 'Male',
			maritalStatus: 'Single',
			employmentType: 'Salaried(Private)',
			TypeOfResidence: 'Rented',
			salariedActivityDetailsVisible: {
				works_for_reputed_org: true,
				company_100plus_employees: true,
				holds_permanent_position: true,
				employed_2plus_years: true,
				total_experience_3plus_years: true,
				provides_staff_benefits: true,
				salary_credited_regularly: true,
				receives_bonus: true,
				receives_salary_slip_form16: true,
				has_professional_qualification: true
			},
			grossIncome: 80000,
			netIncome: 65000,
			creditScore: 750,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: 'obl-pl-fresh-1',
					obligationType: 'term_loan',
					loanType: 'Car Loan',
					bankName: 'HDFC Bank',
					selectedToClose: 'Keep running',
					emi: '12000',
					totalLimit: '0',
					tenure: '48',
					interestRate: '9.5',
					remainingTenure: '24'
				}
			]
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// PL-CONSOL — Debt Consolidation with extra funds, 2 obligations, Delhi, 710
// ─────────────────────────────────────────────────────────────────────────────

export const PL_CONSOL_JOURNEY: Journey = journey({
	id: 'PL-CONSOL',
	description:
		'Personal Loan Debt Consolidation — Salaried with multiple obligations, Delhi, CIBIL 710',
	tags: ['personal-loan', 'debt-consolidation', 'yes-obligations', 'salaried'],
	seed: 102,
	loanName: 'Personal Loan',

	initialAnswers: {
		loanType: 'Debt Consolidation with Extra Funds',
		mortgageYear: 4
	},

	steps: [
		page('caseIntake_personalLoan', {
			assessmentStatus: 'fresh'
		}),

		page('loanRequirementPage', {
			loanAmount: 800000
		}),

		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Deepak Verma',
			age: 35,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Salaried(Private)',
			TypeOfResidence: 'Rented',
			salariedActivityDetailsVisible: {
				works_for_reputed_org: true,
				company_100plus_employees: true,
				holds_permanent_position: true,
				employed_2plus_years: true,
				total_experience_3plus_years: true,
				provides_staff_benefits: true,
				salary_credited_regularly: true,
				receives_salary_slip_form16: true,
				has_professional_qualification: true
			},
			grossIncome: 90000,
			netIncome: 72000,
			creditScore: 710,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: 'obl-pl-consol-1',
					obligationType: 'term_loan',
					loanType: 'Personal Loan',
					bankName: 'Bajaj Finserv',
					selectedToClose: 'Keep running',
					emi: '18000',
					totalLimit: '0',
					tenure: '36',
					interestRate: '14.0',
					remainingTenure: '18'
				},
				{
					id: 'obl-pl-consol-2',
					obligationType: 'credit_line',
					loanType: 'Credit Card',
					bankName: 'ICICI Bank',
					selectedToClose: 'Keep running',
					emi: '0',
					totalLimit: '200000',
					tenure: '',
					interestRate: '36.0'
				}
			]
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// PL-NO-OBLIG — Self-employed Doctor, no obligations, Hyderabad, 780
// ─────────────────────────────────────────────────────────────────────────────

export const PL_NO_OBLIG_JOURNEY: Journey = journey({
	id: 'PL-NO-OBLIG',
	description:
		'Personal Loan No Obligations — Doctor, Hyderabad, CIBIL 780 (auto-rule sets Start Fresh)',
	tags: ['personal-loan', 'no-obligations', 'auto-rule', 'self-employed-professional', 'doctor'],
	seed: 103,
	loanName: 'Personal Loan',

	initialAnswers: {
		loanType: 'New Loan',
		mortgageYear: 5
	},

	steps: [
		page('caseIntake_personalLoan', {
			assessmentStatus: 'fresh'
		}),

		page('loanRequirementPage', {
			loanAmount: 1000000
		}),

		// Self-employed(Professional) Doctor — businessActivityDetailsVisible +
		// averageBankBalance; no obligations.
		addApplicant({
			applicantType: 'Individual',
			title: 'Dr.',
			fullName: 'Anand Kumar',
			age: 38,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Self-employed(Professional)',
			TypeOfResidence: 'Owned',
			professionType: 'MBBS Doctor',
			businessActivityDetailsVisible: {
				gst_registered: true,
				has_current_account: true,
				itr_filed_regularly: true,
				profit_last_3_years: true,
				profit_since_starting: true,
				has_professional_license: true,
				has_commercial_premises: true,
				owns_premises: true,
				business_3plus_years: true,
				enrolled_with_professional_body: true,
				two_years_experience_before_practice: true
			},
			averageBankBalance: 600000,
			creditScore: 780,
			ObligationsRunning: 'No'
		})
	]
});
