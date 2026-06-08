/**
 * ═══════════════════════════════════════════════════════════════════════════
 * S77e — Business Loan Journeys (Step 4)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Business Loan is an unsecured loan — no property pages.
 * Schema (businessLoan/pages.ts):
 *   - caseIntake_businessLoan
 *   - loanRequirementPage
 *   - locationPage / locationPageDC
 *   - applicantPage (custom — captures businessEntityType via the Who's
 *                    Applying entity-type tile selector)
 *   - businessProfilePage (industrySector, vintage, gstRegistrationStatus,
 *                          turnoverRange, employees) — HIDDEN for proprietorship
 *                          (data captured under business_proprietorship income
 *                          profile on Income Details instead)
 *   - incomeProfilesPage / incomeDetailsPage  (Individual only, custom)
 *   - companyFinancialsPage  (Company only, custom)
 *   - creditScorePage, obligationsPage (custom)
 *
 * Builder reads `mortgageYear` / `tenure`, not `loanTenure`. We bypass via
 * `initialAnswers.mortgageYear` for tenureYears.
 *
 * FIXTURE-WAS-WRONG (S77e Step-4): hand-written scenarios used legacy
 * option values (`3-5yr`, `REGISTERED`, `1CR_5CR`, `11_50`, `Proprietorship`,
 * `Trading`, `Manufacturing`) that the current V2 schema doesn't produce.
 * Journeys use current V2 option values (`3_to_5`, `registered`, `1cr_to_5cr`,
 * `6_to_20`, `proprietorship`, `trading`, `manufacturing`).
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
// BL-FRESH-YES-OBLIG — Trading proprietor with obligations, Surat, 720
// ─────────────────────────────────────────────────────────────────────────────

export const BL_FRESH_YES_OBLIG_JOURNEY: Journey = journey({
	id: 'BL-FRESH-YES-OBLIG',
	description: 'Business Loan Start Fresh — Trading firm with obligations, Surat, CIBIL 720',
	tags: ['business-loan', 'start-fresh', 'yes-obligations', 'self-employed', 'trader'],
	seed: 201,
	loanName: 'Business Loan',

	initialAnswers: {
		loanType: 'New Loan',
		mortgageYear: 5
	},

	steps: [
		page('caseIntake_businessLoan', {
			assessmentStatus: 'fresh'
		}),

		page('loanRequirementPage', {
			loanAmount: 3000000
		}),

		// businessEntityType is captured on the Who's Applying page via
		// the entity-type tile selector (AddApplicantBusiness.svelte), not
		// on businessProfilePage. We tag it under applicantPage to match
		// the production write site.
		page('applicantPage', {
			businessEntityType: 'proprietorship'
		}),

		// businessProfilePage is HIDDEN for proprietorship (showWhen gate in
		// businessLoan/pages.ts). Industry, vintage, GST status and turnover
		// are captured in richer form on Income Details under the
		// business_proprietorship income profile. No journey step needed here.

		// Self-employed(Other) Trader. businessType flows directly onto
		// the applicant (no schema question binds it). GSTRegistrationYear
		// is the `gstRegistrationDate` source on the applicant payload.
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Mahesh Doshi',
			age: 45,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Self-employed(Other)',
			TypeOfResidence: 'Owned',
			businessType: 'Trading',
			businessActivityDetailsVisible: {
				gst_registered: true,
				has_current_account: true,
				itr_filed_regularly: true,
				profit_last_3_years: true,
				profit_since_starting: true,
				has_cc_od: true,
				has_commercial_premises: true,
				owns_premises: true,
				business_3plus_years: true,
				two_years_experience_before_practice: true
			},
			GSTRegistrationYear: '2015-04',
			averageBankBalance: 500000,
			creditScore: 720,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: 'obl-bl-fresh-1',
					obligationType: 'term_loan',
					loanType: 'Business Loan',
					bankName: 'State Bank of India',
					selectedToClose: 'Keep running',
					emi: '25000',
					totalLimit: '0',
					tenure: '60',
					interestRate: '12.0',
					remainingTenure: '24'
				}
			]
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// BL-CONSOL — Manufacturer DC with extra funds, 2 obligations, Indore, 700
// ─────────────────────────────────────────────────────────────────────────────

export const BL_CONSOL_JOURNEY: Journey = journey({
	id: 'BL-CONSOL',
	description:
		'Business Loan Debt Consolidation — Manufacturer with multiple loans, Indore, CIBIL 700',
	tags: ['business-loan', 'debt-consolidation', 'yes-obligations', 'self-employed', 'manufacturer'],
	seed: 202,
	loanName: 'Business Loan',

	initialAnswers: {
		loanType: 'Debt Consolidation with Extra Funds',
		mortgageYear: 5
	},

	steps: [
		page('caseIntake_businessLoan', {
			assessmentStatus: 'fresh'
		}),

		page('loanRequirementPage', {
			loanAmount: 5000000
		}),

		// businessEntityType is captured on Who's Applying (applicantPage),
		// not businessProfilePage.
		page('applicantPage', {
			businessEntityType: 'proprietorship'
		}),

		// businessProfilePage is HIDDEN for proprietorship — see
		// BL_FRESH_YES_OBLIG_JOURNEY for the rationale.

		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Prakash Saxena',
			age: 48,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Self-employed(Other)',
			TypeOfResidence: 'Owned',
			businessType: 'Manufacturing',
			businessActivityDetailsVisible: {
				gst_registered: true,
				has_current_account: true,
				itr_filed_regularly: true,
				profit_last_3_years: true,
				very_few_clients: true,
				has_cc_od: true,
				has_commercial_premises: true,
				owns_premises: true,
				business_3plus_years: true,
				two_years_experience_before_practice: true
			},
			GSTRegistrationYear: '2014-01',
			averageBankBalance: 700000,
			creditScore: 700,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: 'obl-bl-consol-1',
					obligationType: 'term_loan',
					loanType: 'Business Loan',
					bankName: 'IDBI Bank',
					selectedToClose: 'Keep running',
					emi: '40000',
					totalLimit: '0',
					tenure: '60',
					interestRate: '13.0',
					remainingTenure: '30'
				},
				{
					id: 'obl-bl-consol-2',
					obligationType: 'credit_line',
					loanType: 'CC/OD',
					bankName: 'Bank of India',
					selectedToClose: 'Keep running',
					emi: '0',
					totalLimit: '1000000',
					tenure: '',
					interestRate: '12.5'
				}
			]
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// BL-NO-OBLIG — Company Pvt Ltd (Zenith), no obligations, Delhi, 740
// ─────────────────────────────────────────────────────────────────────────────

export const BL_NO_OBLIG_JOURNEY: Journey = journey({
	id: 'BL-NO-OBLIG',
	description:
		'Business Loan No Obligations — Company Pvt Ltd, Delhi, CIBIL 740 (auto-rule sets Start Fresh)',
	tags: ['business-loan', 'no-obligations', 'auto-rule', 'company', 'pvt-ltd'],
	seed: 203,
	loanName: 'Business Loan',

	initialAnswers: {
		loanType: 'New Loan',
		mortgageYear: 5
	},

	steps: [
		page('caseIntake_businessLoan', {
			assessmentStatus: 'fresh'
		}),

		page('loanRequirementPage', {
			loanAmount: 5000000
		}),

		// businessEntityType is captured on Who's Applying (applicantPage).
		// businessProfilePage is RETIRED — a company captures business profile inside
		// the applicant modal (Identity/Character), so those form-level keys no longer
		// exist. The engine reads company data from the Company applicant object below.
		page('applicantPage', {
			businessEntityType: 'private_limited'
		}),

		// Company applicant — financials + directors array forwarded by
		// applicantPayload.ts Company branch.
		addApplicant({
			applicantType: 'Company',
			fullName: 'Zenith Engineering Pvt Ltd',
			companyName: 'Zenith Engineering Pvt Ltd',
			companyType: 'Private Limited',
			companyAge: 8,
			age: 8,
			gender: 'Male',
			maritalStatus: 'Single',
			employmentType: 'Self-employed(Other)',
			businessType: 'B2B Services',
			businessActivityDetailsVisible: {
				gst_registered: true,
				has_current_account: true,
				itr_filed_regularly: true,
				profit_last_3_years: true,
				profit_since_starting: true,
				has_cc_od: true,
				has_commercial_premises: true,
				owns_premises: true,
				business_3plus_years: true
			},
			financialsTableVisible: {
				grossReceipts: [42000000, 48000000, 55000000],
				netProfit: [3500000, 4200000, 5100000],
				depreciation: [400000, 450000, 500000],
				itrFiled: ['FY21-22', 'FY22-23', 'FY23-24']
			},
			directors: [
				{ name: 'Harish Joshi', age: 45, designation: 'Managing Director' },
				{ name: 'Meera Joshi', age: 42, designation: 'Director' }
			],
			creditScore: 740,
			ObligationsRunning: 'No'
		})
	]
});
