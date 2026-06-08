/**
 * ═══════════════════════════════════════════════════════════════════════════
 * S77e — LAP (Loan Against Property) Journeys
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Canonical Loan Against Property journey declarations. Played through the
 * form engine by `toScenario()` to produce FormPathScenarios byte-matching
 * the committed pre-migration snapshots (FM-1 §2).
 *
 * Five journeys (all single Individual applicant, secured LAP):
 *   - LAP-NEW-TERM   — New LAP Term, Self-employed Trader, Ahmedabad
 *   - LAP-BT-TERM    — Balance Transfer Only, Salaried, Mumbai
 *   - LAP-TOPUP-TERM — Top-up Only, Self-employed Professional (Doctor), Chennai
 *   - LAP-BT-TOPUP   — Balance Transfer With Top-up, Self-employed Manufacturer, Mumbai
 *   - LAP-DOD-NEW    — New Drop-line Overdraft, Self-employed B2C Services, Bangalore
 *
 * Prelude answers (from how-can-we-help):
 *   - loanType: New Loan / Balance Transfer Only / Top-up Only / Balance Transfer With Top-up
 *   - facilityType:  Term Loan / Drop-line OverDraft (DOD)
 *
 * Schema: composeLapLoanSchema() — 15 pages. Key page order:
 *   1. caseIntake_lapLoan
 *   2. loanRequirementPage         (New Loan only — gated by loanType)
 *   3. propertyIdentificationPage
 *   4. propertyLocation_LAP
 *   5. propertyCharacter_LAP
 *   6. propertyCondition_LAP
 *   7. propertyLegal_LAP
 *   8. tellUsApplyingPage          (custom component — applicant added next)
 *   9–13. applicant custom pages   (profile/income/credit/obligations — empty
 *         questions; FM-5 bypasses bindsTo validation)
 *   14. existingDetailsPage        (BT/Top-up only)
 *   15. topUpDetailsPage           (BT/Top-up only)
 *
 * Key builder mappings to remember (see payloadBuilder/loanTransaction.ts):
 *   - `propCost`                → `propertyCost` (and loanAmount fallback)
 *   - `RequiredLoanAmount`      → `loanAmount` (New Loan only; BT/TopUp have no
 *                                  RequiredLoanAmount question → loanAmount
 *                                  derives from propertyCost minus deposit,
 *                                  which for LAP BT is 0 → loanAmount = propCost)
 *   - `mortgageYear`            → `tenureYears`
 *   - `numberOfDirectorOrApplicant` → `numberOfApplicants`
 *   - `propertyStateName/CityName`  → `propertyState/City`
 *   - `constructionType`        → `constructionStatus` (values: House / Flat /
 *                                  Floor / Shop / Office / Building / Warehouse /
 *                                  Factory / Industrial Shed / Plot / Row House)
 *   - LAP hardcodes `propertyRegistered: true` in builder (line ~48)
 *   - `propertyType` output key is NOT populated from any LAP schema question —
 *     LAP's `q3_propertyType` binds to the same `propertyType` key but stores
 *     ownership-type values ("Free Hold"/"Lease Hold"), which flow directly
 *     through the builder's `if (loanAnswers.propertyType) payload.propertyType`
 *   - `existingEncumbrance`: schema option values are 'No' / 'Yes' (not 'None')
 *   - `selectSingleBank` is read by builder but LAP schema writes `bankName`
 *     → builder's `currentBank` field stays undefined for LAP (absent from payload)
 *   - `remainingTenure` is read by builder; LAP schema writes `originalRemainingTenure`
 *     → `remainingTenure` stays undefined for LAP
 *   - `ObligationsRunning: 'Yes'` on applicant + obligations[] array flows through
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
// LAP-NEW-TERM — New LAP Term Loan, Self-employed Trader
// ─────────────────────────────────────────────────────────────────────────────
// Rajesh Patel, 42yo Married, Ahmedabad, CIBIL 730, ₹25L loan on ₹50L property.
// Running Business Loan obligation (Bank of Baroda, ₹15K EMI).

export const LAP_NEW_TERM_JOURNEY: Journey = journey({
	id: 'LAP-NEW-TERM',
	description: 'LAP Term New — Trader business expansion, Ahmedabad, CIBIL 730, ₹25L',
	tags: ['lap', 'new-loan', 'term', 'self-employed', 'trader', 'business-expansion'],
	seed: 101,
	loanName: 'Loan Against Property',
	expectedRoute: '/form/lap',
	initialAnswers: {
		loanType: 'New Loan',
		facilityType: 'Term Loan'
	},
	steps: [
		page('caseIntake_lapLoan', {
			assessmentStatus: 'fresh'
		}),

		// Loan Requirement (New Loan only) — propCost & RequiredLoanAmount set here.
		page('loanRequirementPage', {
			mortgageYear: '12',
			loanPurpose: 'BUSINESS_EXPANSION',
			propCost: 5000000,
			RequiredLoanAmount: 2500000
		}),

		// Property Identification — state, city, applicant residing
		page('propertyIdentificationPage', {
			propertyStateName: 'Gujarat',
			propertyCityName: 'Ahmedabad',
			applicantResidingInProperty: 'Yes'
		}),

		// Property Location — PLANNED_AUTHORITY + society/dues + flood zone
		page('propertyLocation_LAP', {
			propertyAreaType: 'PLANNED_AUTHORITY',
			societyStatus: 'NONE',
			floodDisasterZone: 'No'
		}),

		// Property Character — Residential / House (Independent)
		page('propertyCharacter_LAP', {
			categoryOfProperty: 'Residential',
			constructionType: 'House',
			propertyType: 'Free Hold',
			propertyAge: '6-10',
			carpetArea: 1200
		}),

		// Property Condition — planned compliance + municipal tax + zone
		page('propertyCondition_LAP', {
			propertyComplianceStatus: 'fully_compliant',
			zoneClassification: 'RESIDENTIAL',
			municipalTaxStatus: 'PAID_REGULAR',
			municipalApproval: 'APPROVED'
		}),

		// Property Legal — self-purchased with clean chain
		page('propertyLegal_LAP', {
			propertyAcquisitionMethod: 'self_purchased',
			originalDocumentsAvailable: 'Yes',
			ownershipChainComplete: 'CLEAR',
			existingEncumbrance: 'No',
			noLegalDispute: 'Yes',
			encumbranceCertificateVerified: 'Yes'
		}),

		// Applicant Info (custom) — set applicant count here
		page('tellUsApplyingPage', {
			numberOfDirectorOrApplicant: 1
		}),

		// Primary Applicant — Self-employed (Other), Trader
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Rajesh Patel',
			age: 42,
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
				business_3plus_years: true
			},
			GSTRegistrationYear: '2018-06',
			averageBankBalance: 400000,
			creditScore: 730,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: 'lap-new-term-ob-1',
					obligationType: 'term_loan',
					loanType: 'Business Loan',
					bankName: 'Bank of Baroda',
					selectedToClose: 'Keep running',
					emi: '15000',
					tenure: '60',
					interestRate: '12.5',
					remainingTenure: '24'
				}
			]
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// LAP-BT-TERM — Balance Transfer Only, Salaried, Mumbai
// ─────────────────────────────────────────────────────────────────────────────
// Sanjay Mehta, 40yo Married Salaried, Mumbai, CIBIL 760.
// Flat + BT from Axis Bank (₹30L outstanding, ~38K EMI, 120mo remaining).

export const LAP_BT_TERM_JOURNEY: Journey = journey({
	id: 'LAP-BT-TERM',
	description: 'LAP Term BT Only — Salaried BT from Axis Bank, Mumbai, CIBIL 760, ₹30L',
	tags: ['lap', 'balance-transfer', 'term', 'salaried'],
	seed: 102,
	loanName: 'Loan Against Property',
	expectedRoute: '/form/lap',
	initialAnswers: {
		loanType: 'Balance Transfer Only',
		facilityType: 'Term Loan'
	},
	steps: [
		page('caseIntake_lapLoan', {
			assessmentStatus: 'fresh'
		}),

		// loanRequirementPage HIDDEN for non-New Loan.

		page('propertyIdentificationPage', {
			propertyStateName: 'Maharashtra',
			propertyCityName: 'Mumbai',
			applicantResidingInProperty: 'Yes'
		}),

		page('propertyLocation_LAP', {
			propertyAreaType: 'PLANNED_AUTHORITY',
			societyStatus: 'COOPERATIVE',
			pendingSocietyDues: 'CLEAR',
			floodDisasterZone: 'No'
		}),

		page('propertyCharacter_LAP', {
			categoryOfProperty: 'Residential',
			constructionType: 'Flat',
			propertyType: 'Free Hold',
			propertyAge: '6-10',
			carpetArea: 850
		}),

		page('propertyCondition_LAP', {
			propertyComplianceStatus: 'fully_compliant',
			zoneClassification: 'RESIDENTIAL',
			municipalTaxStatus: 'PAID_REGULAR',
			ocCcAvailable: 'BOTH',
			municipalApproval: 'APPROVED'
		}),

		page('propertyLegal_LAP', {
			propertyAcquisitionMethod: 'self_purchased',
			originalDocumentsAvailable: 'Yes',
			ownershipChainComplete: 'CLEAR',
			existingEncumbrance: 'Yes',
			noLegalDispute: 'Yes',
			encumbranceCertificateVerified: 'Yes'
		}),

		page('tellUsApplyingPage', {
			numberOfDirectorOrApplicant: 1
		}),

		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Sanjay Mehta',
			age: 40,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Salaried(Private)',
			TypeOfResidence: 'Owned',
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
			grossIncome: 130000,
			netIncome: 100000,
			creditScore: 760,
			ObligationsRunning: 'No'
		}),

		// Existing loan details — BT fields (canonical schema)
		page('existingDetailsPage', {
			bankName: 'Axis Bank',
			disbursedAmount: 4500000,
			loanDisbursementDate: '2021-05',
			originalTenure: 240,
			principalOutstanding: 3000000,
			existingInterestRate: 11.5,
			interestRateType: 'floating',
			remainingTenure: 120,
			includedCurrentEMIsAmount: 38000,
			btEmisPaid: 60,
			emiBounceHistory: 'clean'
		}),

		// Top-up page — for BT Only, only propCost + tenure are visible
		page('topUpDetailsPage', {
			propCost: 8000000,
			mortgageYear: '12'
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// LAP-TOPUP-TERM — Top-up Only, Self-employed Professional (Doctor)
// ─────────────────────────────────────────────────────────────────────────────
// Dr Venkatesh Iyer, 45yo, Chennai, CIBIL 780.
// Commercial property + existing LAP with HDFC, ₹20L top-up for clinic expansion.

export const LAP_TOPUP_TERM_JOURNEY: Journey = journey({
	id: 'LAP-TOPUP-TERM',
	description: 'LAP Term Top-up Only — Doctor clinic expansion, Chennai, CIBIL 780',
	tags: ['lap', 'top-up', 'term', 'self-employed-professional', 'doctor'],
	seed: 103,
	loanName: 'Loan Against Property',
	expectedRoute: '/form/lap',
	initialAnswers: {
		loanType: 'Top-up Only',
		facilityType: 'Term Loan'
	},
	steps: [
		page('caseIntake_lapLoan', {
			assessmentStatus: 'fresh'
		}),

		page('propertyIdentificationPage', {
			propertyStateName: 'Tamil Nadu',
			propertyCityName: 'Chennai',
			applicantResidingInProperty: 'No',
			propertyOccupancyStatus: 'commercial_use'
		}),

		page('propertyLocation_LAP', {
			propertyAreaType: 'PLANNED_AUTHORITY',
			// For Commercial, q2_societyStatus' showWhen filters out Commercial
			// (categoryOfProperty in Residential|Mixed|'') — but we haven't set it yet here.
			// Defer — set societyStatus anyway; property character page sets category.
			// Actually societyStatus is visible at this point because categoryOfProperty is
			// unset (== ''). We set it for a deterministic play.
			societyStatus: 'AOA',
			pendingSocietyDues: 'CLEAR',
			floodDisasterZone: 'No'
		}),

		page('propertyCharacter_LAP', {
			categoryOfProperty: 'Commercial',
			constructionType: 'Shop',
			propertyType: 'Free Hold',
			propertyAge: '6-10',
			carpetArea: 2000
		}),

		page('propertyCondition_LAP', {
			propertyComplianceStatus: 'fully_compliant',
			zoneClassification: 'COMMERCIAL',
			municipalTaxStatus: 'PAID_REGULAR',
			shopEstablishmentLicense: 'VALID'
		}),

		page('propertyLegal_LAP', {
			propertyAcquisitionMethod: 'self_purchased',
			originalDocumentsAvailable: 'Yes',
			ownershipChainComplete: 'CLEAR',
			existingEncumbrance: 'Yes',
			noLegalDispute: 'Yes',
			encumbranceCertificateVerified: 'Yes'
		}),

		page('tellUsApplyingPage', {
			numberOfDirectorOrApplicant: 1
		}),

		addApplicant({
			applicantType: 'Individual',
			title: 'Dr.',
			fullName: 'Venkatesh Iyer',
			age: 45,
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
				has_other_income: true,
				has_professional_license: true,
				has_commercial_premises: true,
				owns_premises: true,
				business_3plus_years: true,
				enrolled_professional_body: true,
				prior_experience: true
			},
			averageBankBalance: 800000,
			creditScore: 780,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: 'lap-topup-term-ob-1',
					obligationType: 'term_loan',
					loanType: 'LAP',
					bankName: 'HDFC Bank',
					selectedToClose: 'Keep running',
					emi: '65000',
					tenure: '120',
					interestRate: '10.5',
					remainingTenure: '96'
				}
			]
		}),

		page('existingDetailsPage', {
			bankName: 'HDFC Bank',
			disbursedAmount: 7500000,
			loanDisbursementDate: '2018-08',
			originalTenure: 240,
			principalOutstanding: 5000000,
			existingInterestRate: 10.5,
			interestRateType: 'floating',
			remainingTenure: 96,
			includedCurrentEMIsAmount: 65000,
			btEmisPaid: 96,
			emiBounceHistory: 'clean'
		}),

		page('topUpDetailsPage', {
			propCost: 12000000,
			loanPurpose: 'BUSINESS_EXPANSION',
			topUpAmount: 2000000,
			mortgageYear: '10'
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// LAP-BT-TOPUP — Balance Transfer With Top-up, Self-employed (Other) Manufacturer
// ─────────────────────────────────────────────────────────────────────────────
// Hemant Shah, 48yo, Mumbai, CIBIL 720. Flat + BT from Kotak + ₹10L top-up.

export const LAP_BT_TOPUP_JOURNEY: Journey = journey({
	id: 'LAP-BT-TOPUP',
	description: 'LAP Term BT+Topup — Manufacturer, Mumbai, CIBIL 720, BT+10L topup',
	tags: ['lap', 'balance-transfer', 'top-up', 'term', 'self-employed', 'manufacturer'],
	seed: 104,
	loanName: 'Loan Against Property',
	expectedRoute: '/form/lap',
	initialAnswers: {
		loanType: 'Balance Transfer With Top-up',
		facilityType: 'Term Loan'
	},
	steps: [
		page('caseIntake_lapLoan', {
			assessmentStatus: 'fresh'
		}),

		page('propertyIdentificationPage', {
			propertyStateName: 'Maharashtra',
			propertyCityName: 'Mumbai',
			applicantResidingInProperty: 'Yes'
		}),

		page('propertyLocation_LAP', {
			propertyAreaType: 'PLANNED_AUTHORITY',
			societyStatus: 'COOPERATIVE',
			pendingSocietyDues: 'CLEAR',
			floodDisasterZone: 'No'
		}),

		page('propertyCharacter_LAP', {
			categoryOfProperty: 'Residential',
			constructionType: 'Flat',
			propertyType: 'Free Hold',
			propertyAge: '6-10',
			carpetArea: 900
		}),

		page('propertyCondition_LAP', {
			propertyComplianceStatus: 'fully_compliant',
			zoneClassification: 'RESIDENTIAL',
			municipalTaxStatus: 'PAID_REGULAR',
			ocCcAvailable: 'BOTH',
			municipalApproval: 'APPROVED'
		}),

		page('propertyLegal_LAP', {
			propertyAcquisitionMethod: 'self_purchased',
			originalDocumentsAvailable: 'Yes',
			ownershipChainComplete: 'CLEAR',
			existingEncumbrance: 'Yes',
			noLegalDispute: 'Yes',
			encumbranceCertificateVerified: 'Yes'
		}),

		page('tellUsApplyingPage', {
			numberOfDirectorOrApplicant: 1
		}),

		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Hemant Shah',
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
				profit_since_starting: true,
				has_cc_od: true,
				has_commercial_premises: true,
				owns_premises: true,
				business_3plus_years: true,
				prior_experience: true
			},
			GSTRegistrationYear: '2016-04',
			averageBankBalance: 600000,
			creditScore: 720,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: 'lap-bt-topup-ob-1',
					obligationType: 'term_loan',
					loanType: 'LAP',
					bankName: 'Kotak Mahindra Bank',
					selectedToClose: 'Keep running',
					emi: '42000',
					tenure: '144',
					interestRate: '11.0',
					remainingTenure: '96'
				}
			]
		}),

		page('existingDetailsPage', {
			bankName: 'Kotak Mahindra Bank',
			disbursedAmount: 4500000,
			loanDisbursementDate: '2022-02',
			originalTenure: 180,
			principalOutstanding: 3000000,
			existingInterestRate: 11.0,
			interestRateType: 'floating',
			remainingTenure: 96,
			includedCurrentEMIsAmount: 42000,
			btEmisPaid: 36,
			emiBounceHistory: 'clean'
		}),

		page('topUpDetailsPage', {
			propCost: 9000000,
			loanPurpose: 'BUSINESS_EXPANSION',
			topUpAmount: 1000000,
			mortgageYear: '12'
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// LAP-DOD-NEW — Drop-line OverDraft, New, Self-employed (Other) B2C
// ─────────────────────────────────────────────────────────────────────────────
// Prasad Kulkarni, 38yo, Bangalore, CIBIL 740. Flat + DOD ₹20L, ₹2L monthly.

export const LAP_DOD_NEW_JOURNEY: Journey = journey({
	id: 'LAP-DOD-NEW',
	description: 'LAP DOD New — B2C services, Bangalore, CIBIL 740, ₹20L DOD',
	tags: ['lap', 'new-loan', 'dod', 'self-employed', 'b2c-services'],
	seed: 105,
	loanName: 'Loan Against Property',
	expectedRoute: '/form/lap',
	initialAnswers: {
		loanType: 'New Loan',
		facilityType: 'Drop-line OverDraft (DOD)'
	},
	steps: [
		page('caseIntake_lapLoan', {
			assessmentStatus: 'fresh'
		}),

		// Loan Requirement — DOD exposes dodMonthlyWithdrawal extra.
		page('loanRequirementPage', {
			mortgageYear: '10',
			loanPurpose: 'BUSINESS_EXPANSION',
			propCost: 6000000,
			RequiredLoanAmount: 2000000,
			dodMonthlyWithdrawal: 200000
		}),

		page('propertyIdentificationPage', {
			propertyStateName: 'Karnataka',
			propertyCityName: 'Bengaluru',
			applicantResidingInProperty: 'Yes'
		}),

		page('propertyLocation_LAP', {
			propertyAreaType: 'PLANNED_AUTHORITY',
			societyStatus: 'AOA',
			pendingSocietyDues: 'CLEAR',
			floodDisasterZone: 'No'
		}),

		page('propertyCharacter_LAP', {
			categoryOfProperty: 'Residential',
			constructionType: 'Flat',
			propertyType: 'Free Hold',
			propertyAge: '6-10',
			carpetArea: 1000
		}),

		page('propertyCondition_LAP', {
			propertyComplianceStatus: 'fully_compliant',
			zoneClassification: 'RESIDENTIAL',
			municipalTaxStatus: 'PAID_REGULAR',
			ocCcAvailable: 'BOTH',
			municipalApproval: 'APPROVED'
		}),

		page('propertyLegal_LAP', {
			propertyAcquisitionMethod: 'self_purchased',
			originalDocumentsAvailable: 'Yes',
			ownershipChainComplete: 'CLEAR',
			existingEncumbrance: 'No',
			noLegalDispute: 'Yes',
			encumbranceCertificateVerified: 'Yes'
		}),

		page('tellUsApplyingPage', {
			numberOfDirectorOrApplicant: 1
		}),

		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Prasad Kulkarni',
			age: 38,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Self-employed(Other)',
			TypeOfResidence: 'Owned',
			businessType: 'B2C Services',
			businessActivityDetailsVisible: {
				gst_registered: true,
				has_current_account: true,
				itr_filed_regularly: true,
				profit_last_3_years: true,
				profit_since_starting: true,
				has_cc_od: true,
				has_commercial_premises: true,
				business_3plus_years: true,
				prior_experience: true
			},
			GSTRegistrationYear: '2019-01',
			averageBankBalance: 350000,
			creditScore: 740,
			ObligationsRunning: 'No'
		})
	]
});
