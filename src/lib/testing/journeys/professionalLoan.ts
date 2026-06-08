/**
 * ═══════════════════════════════════════════════════════════════════════════
 * S77e — Professional Loan Journeys (Step 4)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Professional Loan — unsecured, but with its own professional profile page
 * and a `professionalApplicantType` radio on loanRequirementPage that drives
 * applicationStructure in the payload. We deliberately do NOT set
 * `professionalApplicantType` (hand-written scenarios don't carry
 * `applicationStructure`) — tasks that submit the journey would fail the
 * required-answer check, but Step-4 journeys don't submit().
 *
 * Schema pages (professionalLoan/pages.ts):
 *   - caseIntake_professionalLoan
 *   - loanRequirementPage
 *   - locationPage / locationPageDC
 *   - applicantPage / applicantProfilePage (custom)
 *   - professionalProfilePage (qualification, council, vintage, practiceType, status)
 *   - incomeProfilesPage / incomeDetailsPage / companyFinancialsPage (custom)
 *   - creditScorePage / obligationsPage (custom)
 *
 * Builder reads `mortgageYear` / `tenure` for tenureYears — passed via
 * `initialAnswers`.
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
// PROF-FRESH-YES-OBLIG — CA with 1 obligation, Pune, CIBIL 760
// ─────────────────────────────────────────────────────────────────────────────

export const PROF_FRESH_YES_OBLIG_JOURNEY: Journey = journey({
	id: 'PROF-FRESH-YES-OBLIG',
	description: 'Professional Loan Start Fresh — CA with obligations, Pune, CIBIL 760',
	tags: ['professional-loan', 'start-fresh', 'yes-obligations', 'ca'],
	seed: 301,
	loanName: 'Professional Loan',

	initialAnswers: {
		loanType: 'New Loan',
		mortgageYear: 5
	},

	steps: [
		page('caseIntake_professionalLoan', {
			assessmentStatus: 'fresh'
		}),

		// loanRequirementPage — loanAmount needed for payload.
		// professionalCategory is also set on this page in live flow (shared
		// bindsTo with q1 on professionalProfilePage). Builder passes
		// professionalCategory string through via applicantPayload only if
		// rawApplicant has it — here the applicant doesn't carry it, so the
		// loan-level answer doesn't surface to the applicant block. Builder
		// does NOT copy professionalCategory from loanAnswers to loanTransaction.
		page('loanRequirementPage', {
			loanAmount: 1500000
		}),

		// Note: professionalProfilePage is defined in the builder file but
		// NOT included in getAllPages() — professional profile fields live
		// only on the shared applicantProfilePage (custom component) in the
		// active schema. Keys not read by payload builder are skipped.

		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Nitin Kulkarni',
			age: 34,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Self-employed(Professional)',
			TypeOfResidence: 'Rented',
			professionType: 'Chartered Accountant(CA)',
			businessActivityDetailsVisible: {
				gst_registered: true,
				has_current_account: true,
				itr_filed_regularly: true,
				profit_last_3_years: true,
				profit_since_starting: true,
				has_professional_license: true,
				has_commercial_premises: true,
				business_3plus_years: true,
				bar_council_registered: true,
				two_years_experience_before_practice: true
			},
			averageBankBalance: 400000,
			creditScore: 760,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: 'obl-prof-fresh-1',
					obligationType: 'term_loan',
					loanType: 'Personal Loan',
					bankName: 'ICICI Bank',
					selectedToClose: 'Keep running',
					emi: '10000',
					totalLimit: '0',
					tenure: '36',
					interestRate: '11.0',
					remainingTenure: '12'
				}
			]
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// PROF-CONSOL — Lawyer DC with obligations, Delhi, CIBIL 730
// ─────────────────────────────────────────────────────────────────────────────

export const PROF_CONSOL_JOURNEY: Journey = journey({
	id: 'PROF-CONSOL',
	description: 'Professional Loan Debt Consolidation — Lawyer with obligations, Delhi, CIBIL 730',
	tags: ['professional-loan', 'debt-consolidation', 'yes-obligations', 'lawyer'],
	seed: 302,
	loanName: 'Professional Loan',

	initialAnswers: {
		loanType: 'Debt Consolidation with Extra Funds',
		mortgageYear: 5
	},

	steps: [
		page('caseIntake_professionalLoan', {
			assessmentStatus: 'fresh'
		}),

		page('loanRequirementPage', {
			loanAmount: 2000000
		}),

		// Lawyer — isLawyerBarCouncil: 'Yes' → hasBarCouncilChamber: true
		// in applicant payload.
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Advocate Rajendra Singh',
			age: 42,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Self-employed(Professional)',
			TypeOfResidence: 'Owned',
			professionType: 'Lawyer',
			isLawyerBarCouncil: 'Yes',
			businessActivityDetailsVisible: {
				gst_registered: true,
				has_current_account: true,
				itr_filed_regularly: true,
				profit_last_3_years: true,
				profit_since_starting: true,
				has_professional_license: true,
				has_commercial_premises: true,
				business_3plus_years: true,
				bar_council_registered: true,
				two_years_experience_before_practice: true
			},
			averageBankBalance: 350000,
			creditScore: 730,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: 'obl-prof-consol-1',
					obligationType: 'term_loan',
					loanType: 'Personal Loan',
					bankName: 'Axis Bank',
					selectedToClose: 'Keep running',
					emi: '15000',
					totalLimit: '0',
					tenure: '48',
					interestRate: '12.0',
					remainingTenure: '24'
				}
			]
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// PROF-NO-OBLIG — Architect, Bangalore, CIBIL 770, no obligations
// ─────────────────────────────────────────────────────────────────────────────

export const PROF_NO_OBLIG_JOURNEY: Journey = journey({
	id: 'PROF-NO-OBLIG',
	description:
		'Professional Loan No Obligations — Architect, Bangalore, CIBIL 770 (auto-rule sets Start Fresh)',
	tags: ['professional-loan', 'no-obligations', 'auto-rule', 'architect'],
	seed: 303,
	loanName: 'Professional Loan',

	initialAnswers: {
		loanType: 'New Loan',
		mortgageYear: 4
	},

	steps: [
		page('caseIntake_professionalLoan', {
			assessmentStatus: 'fresh'
		}),

		page('loanRequirementPage', {
			loanAmount: 1200000
		}),

		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Arjun Menon',
			age: 36,
			gender: 'Male',
			maritalStatus: 'Single',
			employmentType: 'Self-employed(Professional)',
			TypeOfResidence: 'Rented',
			professionType: 'Architect',
			businessActivityDetailsVisible: {
				gst_registered: true,
				has_current_account: true,
				itr_filed_regularly: true,
				profit_last_3_years: true,
				profit_since_starting: true,
				has_professional_license: true,
				has_commercial_premises: true,
				business_3plus_years: true,
				bar_council_registered: true,
				two_years_experience_before_practice: true
			},
			averageBankBalance: 300000,
			creditScore: 770,
			ObligationsRunning: 'No'
		})
	]
});
