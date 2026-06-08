/**
 * ═══════════════════════════════════════════════════════════════════════════
 * S77e — Edge case journey declarations (tier-1 simpler edges)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Edge scenarios exercise boundary behavior in the rule engine and form
 * system (low CIBIL, age boundaries, high FOIR, NRI, Company, multi-applicant).
 * This file tackles the simpler HL/PL-like edges; complex edges
 * (EDGE_NRI, EDGE_COMPANY_PVT, EDGE_3_APPLICANTS,
 * EDGE_HIGH_FOIR, EDGE_HIGH_VALUE, EDGE_PROF_LAWYER_DC, EDGE_GOVT_SAL)
 * remain deferred — each needs its own dump-reconcile loop.
 *
 * Step-4 add: EDGE_BT_CREDIT_LINES_JOURNEY — Home Loan BT Only with OD + CC
 * credit_line obligations (via CREDIT_LINE_TYPES auto-derivation in
 * cleanObligationEntries) alongside a term_loan Car Loan.
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
// EDGE-AGE-23 — Personal Loan, young salaried (23yo), no obligations
// ─────────────────────────────────────────────────────────────────────────────
// Simplest edge: small PL, fresh applicant just starting career.
// Shape mirrors PL-FRESH-YES-OBLIG: only loanAmount on loanRequirementPage,
// mortgageYear via initialAnswers (bypasses schema since HL V2 PL surfaces
// neither RequiredLoanAmount nor residenceStateName).

export const EDGE_AGE_23_JOURNEY: Journey = journey({
	id: 'EDGE-AGE-23',
	description: 'Personal Loan — Young applicant age 23, salaried first-job, CIBIL 710, Chennai ₹5L',
	tags: ['personal-loan', 'young-applicant', 'age-boundary', 'first-time', 'edge-case'],
	seed: 100,
	loanName: 'Personal Loan',
	initialAnswers: {
		loanType: 'New Loan',
		mortgageYear: 3
	},
	steps: [
		page('caseIntake_personalLoan', { assessmentStatus: 'fresh' }),
		page('loanRequirementPage', { loanAmount: 500000 }),
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Arun Kumar S',
			age: 23,
			gender: 'Male',
			maritalStatus: 'Single',
			employmentType: 'Salaried(Private)',
			TypeOfResidence: 'With Parents',
			salariedActivityDetailsVisible: {
				company_100plus_employees: true,
				provides_staff_benefits: true,
				salary_credited_regularly: true,
				receives_salary_slip_form16: true,
				has_professional_qualification: true
			},
			grossIncome: 42000,
			netIncome: 35000,
			creditScore: 710,
			ObligationsRunning: 'No'
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// EDGE-AGE-68 — LAP New Loan Term, Pensioner + Son co-borrower
// ─────────────────────────────────────────────────────────────────────────────
// Two-applicant LAP: 68yo pensioner (primary) + 38yo salaried son (co-borrower,
// relationship 'Parent'). OLD_MUNICIPAL Jaipur commercial property. ₹40L loan
// on ₹80L property, 10yr term.
//
// Exercises: pensioner pensionProfile (HL_NEW_PENS shape minus continuesBeyond75),
// co-borrower loanRole/relationship → roleInApplication: 'Co-Borrower',
// relationshipWithPrimary: 'Parent' (applicantPayload.ts lines 76-89), LAP
// commercial property with OLD_MUNICIPAL legal chain (titleChainStatus,
// encumbranceCertStatus, revenueRecordMutation, successionStatus).

export const EDGE_AGE_68_JOURNEY: Journey = journey({
	id: 'EDGE-AGE-68',
	description:
		'LAP Term New — Pensioner 68yo + son co-borrower, CIBIL 800/750, commercial shop Jaipur OLD_MUNICIPAL ₹40L',
	tags: ['lap', 'new-loan', 'term', 'pensioner', 'multi-applicant', 'elderly', 'edge-case'],
	seed: 102,
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

		page('loanRequirementPage', {
			mortgageYear: '10',
			loanPurpose: 'BUSINESS_EXPANSION',
			propCost: 8000000,
			RequiredLoanAmount: 4000000
		}),

		page('propertyIdentificationPage', {
			propertyStateName: 'Rajasthan',
			propertyCityName: 'Jaipur',
			applicantResidingInProperty: 'No',
			propertyOccupancyStatus: 'commercial_use'
		}),

		// OLD_MUNICIPAL commercial path: skip society (categoryOfProperty set later as
		// Commercial; at this point unset so societyStatus is still visible — we pick NONE).
		page('propertyLocation_LAP', {
			propertyAreaType: 'OLD_MUNICIPAL',
			societyStatus: 'NONE',
			floodDisasterZone: 'No'
		}),

		// Commercial / Shop (LAP's propertyType is ownership-type — Free Hold).
		page('propertyCharacter_LAP', {
			categoryOfProperty: 'Commercial',
			constructionType: 'Shop',
			propertyType: 'Free Hold',
			propertyAge: '6-10',
			carpetArea: 800
		}),

		// OLD_MUNICIPAL compliance branch: municipalTaxStatus + unauthorizedAdditions.
		page('propertyCondition_LAP', {
			propertyComplianceStatus: 'fully_compliant',
			zoneClassification: 'COMMERCIAL',
			municipalTaxStatus: 'PAID_REGULAR',
			unauthorizedAdditions: 'NONE'
		}),

		// LAP propertyLegal: ownershipChainComplete (not titleChainStatus), existingEncumbrance
		// (not encumbranceCertStatus). successionStatus for inherited cases.
		page('propertyLegal_LAP', {
			propertyAcquisitionMethod: 'self_purchased',
			originalDocumentsAvailable: 'Yes',
			ownershipChainComplete: 'CLEAR',
			existingEncumbrance: 'No',
			successionStatus: 'NOT_INHERITED',
			noLegalDispute: 'Yes',
			encumbranceCertificateVerified: 'Yes'
		}),

		page('tellUsApplyingPage', {
			numberOfDirectorOrApplicant: 2
		}),

		// Primary — Pensioner (Ram Kishore, 68). pensionProfile matches pre-migration
		// minus continuesBeyond75 (75+ pension continuation false).
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Ram Kishore Agarwal',
			age: 68,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Pensioner',
			TypeOfResidence: 'Owned',
			pensionActivityDetailsVisible: {
				pension_credited_regularly: true,
				govt_pension: true,
				lifelong_pension: true,
				pension_slip_available: true,
				pension_bank_nationalised: true,
				no_pension_loan_deduction: true,
				pension_owns_property: true,
				spouse_pension_applicable: true,
				pension_itr_filed: true,
				pension_physical_verification: true
			},
			netIncome: 42000,
			creditScore: 800,
			ObligationsRunning: 'No'
		}),

		// Co-Borrower — Son, Salaried(Private) (Mohit, 38). loanRole 'co_borrower' →
		// roleInApplication 'Co-Borrower'; relationship 'Parent' → relationshipWithPrimary.
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Mohit Agarwal',
			age: 38,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Salaried(Private)',
			TypeOfResidence: 'Rented',
			loanRole: 'co_borrower',
			relationship: 'Parent',
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
			grossIncome: 110000,
			netIncome: 90000,
			creditScore: 750,
			ObligationsRunning: 'No'
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// EDGE-CIBIL-650 — Personal Loan, Self-employed(Other), 2 obligations
// ─────────────────────────────────────────────────────────────────────────────
// Marginal CIBIL 650. Trader. ₹8L / 5-year term.
// 2 running obligations (home loan + car loan) as term_loan types.

export const EDGE_CIBIL_650_JOURNEY: Journey = journey({
	id: 'EDGE-CIBIL-650',
	description: 'Personal Loan — CIBIL 650, Self-employed trader, 2 obligations, Delhi ₹8L',
	tags: ['personal-loan', 'marginal-cibil', 'self-employed', 'obligations', 'edge-case'],
	seed: 101,
	loanName: 'Personal Loan',
	initialAnswers: {
		loanType: 'New Loan',
		mortgageYear: 5
	},
	steps: [
		page('caseIntake_personalLoan', { assessmentStatus: 'fresh' }),
		page('loanRequirementPage', { loanAmount: 800000 }),
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Rajendra Gupta',
			age: 45,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Self-employed(Other)',
			TypeOfResidence: 'Owned',
			businessActivityDetailsVisible: {
				gst_registered: true,
				itr_filed_regularly: true,
				has_current_account: true,
				very_few_clients: true,
				business_3plus_years: true,
				two_years_experience_before_practice: true
			},
			grossIncome: 90000,
			netIncome: 60000,
			creditScore: 650,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: 'obl-edge650-1',
					loanType: 'Home Loan',
					bankName: 'SBI',
					selectedToClose: 'Keep running',
					emi: '22000',
					tenure: '240',
					interestRate: '8.5',
					remainingTenure: '156'
				},
				{
					id: 'obl-edge650-2',
					loanType: 'Car Loan',
					bankName: 'HDFC Bank',
					selectedToClose: 'Keep running',
					emi: '12000',
					tenure: '60',
					interestRate: '9.5',
					remainingTenure: '24'
				}
			]
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// EDGE-HIGH-FOIR — Home Loan, salaried ₹1.5L/₹1.2L, 4 obligations (FOIR ~68%)
// ─────────────────────────────────────────────────────────────────────────────

export const EDGE_HIGH_FOIR_JOURNEY: Journey = journey({
	id: 'EDGE-HIGH-FOIR',
	description:
		'Home Loan — Salaried ₹1.2L but ₹82K EMI obligations, FOIR ~68%, RTM flat Noida ₹55L',
	tags: ['home-loan', 'high-foir', 'stressed', 'multiple-obligations', 'edge-case'],
	seed: 102,
	loanName: 'Home Loan',
	initialAnswers: { loanType: 'New Loan' },
	steps: [
		page('caseIntake_homeLoan', { assessmentStatus: 'fresh' }),
		page('propertyLocation_homeLoan', {
			propertyIdentified: 'Yes',
			propertyAreaType: 'PLANNED_AUTHORITY',
			purchaseType: 'resale_normal',
			propertyStateName: 'Uttar Pradesh',
			propertyCityName: 'Noida',
			propertyUsageIntent: 'SELF_USE',
			PropertyStage: 'Ready To Move'
		}),
		page('propertyCharacter_homeLoan', {
			constructionType: 'Flat',
			carpetArea: 900
		}),
		page('complianceLegal_homeLoan', {
			propertyComplianceStatus: 'fully_compliant',
			ocCcAvailable: 'BOTH',
			documentationReadiness: ['SALE_DEED', 'EC']
		}),
		page('sellerTransaction_homeLoan', {
			sellerOwnershipType: 'SOLE_OWNER',
			propertyAcquisitionMethod: 'PURCHASED',
			sellerOnLoan: 'No',
			ifPropertyRegistered: 'Yes',
			lastRegistryDuration: 'moreThanTwoYears',
			isAnyBuilderDemand: 'No'
		}),
		page('tellUs_homeLoan', {
			numberOfDirectorOrApplicant: 1,
			residenceOptionSame: 'Yes'
		}),
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Sanjay Sharma',
			age: 38,
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
				receives_bonus: true,
				receives_salary_slip_form16: true,
				has_professional_qualification: true
			},
			grossIncome: 150000,
			netIncome: 120000,
			creditScore: 740,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: 'obl-high-foir-1',
					loanType: 'Home Loan',
					bankName: 'ICICI Bank',
					selectedToClose: 'Keep running',
					emi: '35000',
					tenure: '240',
					interestRate: '8.75',
					remainingTenure: '180'
				},
				{
					id: 'obl-high-foir-2',
					loanType: 'Car Loan',
					bankName: 'Axis Bank',
					selectedToClose: 'Keep running',
					emi: '18000',
					tenure: '60',
					interestRate: '9',
					remainingTenure: '36'
				},
				{
					id: 'obl-high-foir-3',
					loanType: 'Personal Loan',
					bankName: 'Bajaj Finserv',
					selectedToClose: 'Keep running',
					emi: '15000',
					tenure: '48',
					interestRate: '14',
					remainingTenure: '30'
				},
				{
					id: 'obl-high-foir-4',
					loanType: 'Credit Card',
					bankName: 'SBI Card',
					selectedToClose: 'Keep running',
					emi: '0',
					totalLimit: '300000',
					obligationType: 'credit_line'
				}
			]
		}),
		page('dealFinancials_homeLoan', {
			auctionPropertyStatus: 'STANDARD',
			mortgageYear: '20',
			marketValue: 7000000,
			propCost: 6500000,
			registryValue: 6500000,
			deposit: 1000000,
			registryTimeline: '1_3_MONTHS'
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// EDGE-BT-CREDIT-LINES — Home Loan BT Only, salaried, OD + CC + Car Loan
// ─────────────────────────────────────────────────────────────────────────────

export const EDGE_BT_CREDIT_LINES_JOURNEY: Journey = journey({
	id: 'EDGE-BT-CREDIT-LINES',
	description:
		'Home Loan BT — Transferring HDFC HL + has OD + CC obligations, Salaried ₹95K, Mumbai ₹80L',
	tags: ['home-loan', 'balance-transfer', 'credit-lines', 'od', 'cc', 'edge-case'],
	seed: 103,
	loanName: 'Home Loan',
	initialAnswers: { loanType: 'Balance Transfer Only' },
	steps: [
		page('caseIntake_homeLoan', { assessmentStatus: 'fresh' }),
		page('propertyLocation_homeLoan', {
			propertyIdentified: 'Yes',
			propertyAreaType: 'PLANNED_AUTHORITY',
			propertyStateName: 'Maharashtra',
			propertyCityName: 'Mumbai',
			propertyUsageIntent: 'SELF_USE',
			isRegistryDone: 'Yes'
		}),
		page('propertyCharacter_homeLoan', {
			constructionType: 'Flat',
			carpetArea: 1200,
			PropertyStage: 'Ready To Move'
		}),
		page('complianceLegal_homeLoan', {
			propertyComplianceStatus: 'fully_compliant',
			ocCcAvailable: 'BOTH',
			documentationReadiness: ['SALE_DEED', 'OC', 'CC', 'EC'],
			nocFromPreviousLender: 'Yes'
		}),
		page('btExistingLoan_homeLoan', {
			selectSingleBank: 'HDFC Bank',
			sanctionAmount: 8000000,
			principalOutstanding: 7500000,
			existingInterestRate: 9.25,
			remainingTenure: 18,
			includedCurrentEMIsAmount: 68000,
			interestRateType: 'FLOATING',
			emiBounceHistory: '0'
		}),
		page('loanRequirements_homeLoan', {
			mortgageYear: '20'
		}),
		page('tellUs_homeLoan', {
			numberOfDirectorOrApplicant: 1,
			residenceOptionSame: 'Yes'
		}),
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Deepak Mehta',
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
			grossIncome: 115000,
			netIncome: 95000,
			creditScore: 770,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: 'obl-bt-cl-1',
					loanType: 'OD Limit',
					bankName: 'ICICI Bank',
					selectedToClose: 'Keep running',
					emi: '0',
					totalLimit: '500000'
				},
				{
					id: 'obl-bt-cl-2',
					loanType: 'Personal Loan',
					bankName: 'Axis Bank',
					selectedToClose: 'Keep running',
					emi: '8500',
					tenure: '48',
					interestRate: '13.5',
					remainingTenure: '24'
				},
				{
					id: 'obl-bt-cl-3',
					loanType: 'Car Loan',
					bankName: 'SBI',
					selectedToClose: 'Keep running',
					emi: '14000',
					tenure: '60',
					interestRate: '8.5',
					remainingTenure: '30'
				}
			]
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
//
// Exercises: NRI applicant path in applicantPayload.ts (line 112-126) —
//   isNRI: 'Yes' → payload.isNRI: true, nriCountry passthrough, and GPA
//   (General Power of Attorney) details via gpaFullName/gpaAge/gpaRelationship/
//   gpaAddress raw keys → payload.gpaDetails: { fullName, age, relationship, address }.
//
// Property shape mirrors HL_NEW_SAL_CLEAN (PLANNED_AUTHORITY + RTM + resale_normal)
// but uses constructionType 'House' (schema label "House/Villa") for a villa.
// residenceOptionSame: 'Yes' — applicant residence is in the property country
//   (NRI is abroad; GPA holder in Goa). Simpler shape: same state/city as property.
// Employment: Self-employed(Professional) Doctor — businessProfile path (no
//   grossIncome/netIncome emitted, only businessProfile + financials if provided).
//
// isNRI/nriCountry/gpaFullName/gpaAge/gpaRelationship are raw applicant keys
// consumed directly by applicantPayload.ts — not schema-backed questions, so
// they flow through the FM-5 bypass (addApplicant is a custom payload hop).
//
// hasNRIApplicant (loanTransaction.ts line 366) requires applicationData.ApplicantIsNRI
// which isn't threaded via the journey → omitted from snapshot (same drop pattern
// as HL-BT-TOPUP applicationStructure).

export const EDGE_NRI_JOURNEY: Journey = journey({
	id: 'EDGE-NRI',
	description: 'Home Loan — NRI Doctor, CIBIL 810, RTM villa Goa ₹1.35Cr, GPA required',
	tags: ['home-loan', 'nri', 'doctor', 'high-income', 'villa', 'edge-case'],
	seed: 102,
	loanName: 'Home Loan',
	initialAnswers: {
		loanType: 'New Loan'
	},
	steps: [
		page('caseIntake_homeLoan', { assessmentStatus: 'fresh' }),
		// RTM villa — flagKey PropertyStage set alongside purchaseType='resale_normal'.
		page('propertyLocation_homeLoan', {
			propertyIdentified: 'Yes',
			propertyAreaType: 'PLANNED_AUTHORITY',
			purchaseType: 'resale_normal',
			propertyStateName: 'Goa',
			propertyCityName: 'Panaji',
			propertyUsageIntent: 'SELF_USE',
			PropertyStage: 'Ready To Move'
		}),
		// constructionType 'House' = House/Villa schema option value.
		page('propertyCharacter_homeLoan', {
			constructionType: 'House',
			carpetArea: 2400
		}),
		// PLANNED_AUTHORITY + resale_normal + House + RTM.
		// House skips ocCcAvailable (showWhen requires Flat); municipalApproval
		// requires OLD_MUNICIPAL, so it's also hidden. Only propertyComplianceStatus
		// and documentationReadiness are visible in this branch.
		page('complianceLegal_homeLoan', {
			propertyComplianceStatus: 'fully_compliant',
			documentationReadiness: ['SALE_DEED', 'EC']
		}),
		page('sellerTransaction_homeLoan', {
			sellerOwnershipType: 'SOLE_OWNER',
			propertyAcquisitionMethod: 'PURCHASED',
			sellerOnLoan: 'No',
			ifPropertyRegistered: 'Yes',
			lastRegistryDuration: 'moreThanTwoYears',
			isAnyBuilderDemand: 'No'
		}),
		page('tellUs_homeLoan', {
			numberOfDirectorOrApplicant: 1,
			residenceOptionSame: 'Yes'
		}),
		// Self-employed(Professional) NRI Doctor.
		// isNRI/nriCountry/gpaFullName/gpaAge/gpaRelationship/gpaAddress are raw
		// keys consumed by applicantPayload.ts (lines 112-126).
		addApplicant({
			applicantType: 'Individual',
			title: 'Dr.',
			fullName: 'Anand Pai',
			age: 42,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Self-employed(Professional)',
			TypeOfResidence: 'Owned',
			isNRI: 'Yes',
			nriCountry: 'United Arab Emirates',
			gpaFullName: 'Suresh Pai',
			gpaAge: 68,
			gpaRelationship: 'Father',
			gpaAddress: 'Panaji, Goa',
			professionType: 'Doctor',
			businessActivityDetailsVisible: {
				itr_filed_regularly: true,
				has_current_account: true,
				profit_last_3_years: true,
				profit_since_starting: true,
				has_professional_license: true,
				has_commercial_premises: true,
				owns_premises: true,
				business_3plus_years: true,
				enrolled_with_medical_council: true,
				two_years_experience_before_practice: true
			},
			financialsTableVisible: {
				grossReceipts: [6000000, 6800000, 7500000],
				netProfit: [3800000, 4400000, 5000000],
				depreciation: [120000, 130000, 140000],
				itrFiled: ['FY21-22', 'FY22-23', 'FY23-24']
			},
			averageBankBalance: 1500000,
			creditScore: 810,
			ObligationsRunning: 'No'
		}),
		page('dealFinancials_homeLoan', {
			auctionPropertyStatus: 'STANDARD',
			mortgageYear: '20',
			marketValue: 19000000,
			propCost: 18000000,
			registryValue: 18000000,
			deposit: 4500000,
			registryTimeline: '1_3_MONTHS'
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// EDGE-CIBIL-650 — Personal Loan, Self-employed(Other), 2 obligations

// ─────────────────────────────────────────────────────────────────────────────
// Marginal-CIBIL Lawyer consolidating two Personal Loans. Kolkata ₹12L, 5yr.
// Self-employed(Professional) + isLawyerBarCouncil:'Yes' → the applicant
// payload builder surfaces `hasBarCouncilChamber: true` and
// `professionType: 'Lawyer'` (applicantPayload.ts line 242).
//
// loanRequirementPage carries loanAmount only; `mortgageYear` and `loanType`
// (= 'Debt Consolidation with Extra Funds') flow via initialAnswers — the
// Professional schema does not surface these as page questions.
//
// Note on dropped fields vs the original hand-written fixture:
//   - residenceState/residenceCity were never emitted by the Professional
//     payload builder (no V2 binding on residence* for PL/PROF).
//   - grossIncome/netIncome are ignored for Self-employed(Professional);
//     only `financials` (from financialsTableVisible) and
//     `averageBankBalance` are consumed — the old fixture's 120000/85000
//     values were fixture-was-wrong (FIXTURE-WAS-WRONG).

export const EDGE_PROF_LAWYER_DC_JOURNEY: Journey = journey({
	id: 'EDGE-PROF-LAWYER-DC',
	description:
		'Professional Loan DC — Lawyer, CIBIL 700, consolidating 2 PL, Kolkata ₹12L',
	tags: ['professional-loan', 'lawyer', 'debt-consolidation', 'marginal-cibil', 'edge-case'],
	seed: 102,
	loanName: 'Professional Loan',
	initialAnswers: {
		loanType: 'Debt Consolidation with Extra Funds',
		mortgageYear: 5
	},
	steps: [
		page('caseIntake_professionalLoan', { assessmentStatus: 'fresh' }),
		page('loanRequirementPage', { loanAmount: 1200000 }),
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Subhajit Bose',
			age: 36,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Self-employed(Professional)',
			TypeOfResidence: 'Owned',
			professionType: 'Lawyer',
			isLawyerBarCouncil: 'Yes',
			// businessActivityDetailsVisible — snake_case flags mirroring the
			// old hand-written businessProfile camelCase (gstRegistered:false,
			// all other positive trust flags true). No financialsTableVisible
			// → the builder does not produce a financials[] block.
			businessActivityDetailsVisible: {
				itr_filed_regularly: true,
				profit_last_3_years: true,
				profit_since_starting: true,
				has_current_account: true,
				has_professional_license: true,
				has_commercial_premises: true,
				owns_premises: true,
				business_3plus_years: true,
				bar_council_registered: true,
				two_years_experience_before_practice: true
			},
			creditScore: 700,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: 'obl-prof-lawyer-1',
					obligationType: 'term_loan',
					loanType: 'Personal Loan',
					bankName: 'HDFC Bank',
					selectedToClose: 'Keep running',
					emi: '18000',
					totalLimit: '0',
					tenure: '48',
					interestRate: '12',
					remainingTenure: '28'
				},
				{
					id: 'obl-prof-lawyer-2',
					obligationType: 'term_loan',
					loanType: 'Personal Loan',
					bankName: 'Bajaj Finserv',
					selectedToClose: 'Keep running',
					emi: '12000',
					totalLimit: '0',
					tenure: '36',
					interestRate: '15',
					remainingTenure: '18'
				}
			]
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// Company primary (Srinivas Industries Pvt Ltd) with 2 directors +
// Srinivas Reddy as linked Individual co-borrower.
// Builder mirrors BL_NO_OBLIG for the Company branch (financials,
// businessProfile, directors array) and appends the Individual as a
// second applicantType: 'Individual' entry.
//
// FIXTURE-WAS-WRONG (Classification (i)) vs hand-written EDGE_COMPANY_PVT:
//   (1) applicant-level businessEntityType/IndustrySector/Vintage were
//       authored on the applicant, but the V2 builder reads these from
//       loanAnswers (businessProfilePage). Journey sets them via the
//       page step; they stay on loanTransaction, NOT per-applicant.
//   (2) Company applicant's grossIncome/netIncome are dropped — Company
//       branch emits `financials`, not grossIncome (mirrors BL-NO-OBLIG).
//   (3) directors[].sharePercent was hand-authored but not linked to
//       Individual co-applicant; we keep sharePercent on the director
//       and rely on linkedCompanyId to pull cibil from the Individual.
//   (4) Builder injects title:'Mr.' on Company (deriveTitle default),
//       isCoApplicant:false on each director. Applicant-level
//       hasExistingObligations is auto-derived from ObligationsRunning.

export const EDGE_COMPANY_PVT_JOURNEY: Journey = journey({
	id: 'EDGE-COMPANY-PVT',
	description:
		'Business Loan — Pvt Ltd, Manufacturing, 2 directors, CIBIL 720, Hyderabad ₹25L',
	tags: [
		'business-loan',
		'company',
		'private-limited',
		'manufacturing',
		'multi-applicant',
		'edge-case'
	],
	seed: 102,
	loanName: 'Business Loan',

	initialAnswers: {
		loanType: 'New Loan',
		mortgageYear: 7,
		numberOfDirectorOrApplicant: 2
	},

	steps: [
		page('caseIntake_businessLoan', {
			assessmentStatus: 'fresh'
		}),

		page('loanRequirementPage', {
			loanAmount: 2500000
		}),

		// businessEntityType is captured on Who's Applying (applicantPage).
		// businessProfilePage is RETIRED — a company captures business profile inside
		// the applicant modal; the engine reads company data from the Company applicant.
		page('applicantPage', {
			businessEntityType: 'private_limited'
		}),

		// Company applicant — Pvt Ltd with 2 directors.
		addApplicant({
			id: 'company-edge-pvt-1',
			applicantType: 'Company',
			fullName: 'Srinivas Industries Pvt Ltd',
			companyName: 'Srinivas Industries Pvt Ltd',
			companyType: 'Private Limited',
			companyAge: 8,
			age: 8,
			gender: 'Male',
			maritalStatus: 'Single',
			employmentType: 'Self-employed(Other)',
			businessType: 'Manufacturing',
			businessActivityDetailsVisible: {
				gst_registered: true,
				has_current_account: true,
				itr_filed_regularly: true,
				profit_last_3_years: true,
				profit_since_starting: true,
				has_commercial_premises: true,
				owns_premises: true,
				business_3plus_years: true,
				two_years_experience_before_practice: true
			},
			financialsTableVisible: {
				grossReceipts: [22000000, 26000000, 30000000],
				netProfit: [1800000, 2100000, 2500000],
				depreciation: [250000, 280000, 310000],
				itrFiled: ['FY21-22', 'FY22-23', 'FY23-24']
			},
			directors: [
				{ name: 'Srinivas Reddy', age: 48, designation: 'Director', sharePercent: 60 },
				{ name: 'Lakshmi Reddy', age: 44, designation: 'Director', sharePercent: 40 }
			],
			creditScore: 720,
			ObligationsRunning: 'No'
		}),

		// Linked Individual co-borrower — director #1 as the real person.
		addApplicant({
			applicantType: 'Individual',
			linkedCompanyId: 'company-edge-pvt-1',
			title: 'Mr.',
			fullName: 'Srinivas Reddy',
			age: 48,
			gender: 'Male',
			maritalStatus: 'Married',
			roleInApplication: 'Co-Borrower',
			TypeOfResidence: 'Owned',
			employmentType: 'Self-employed(Other)',
			grossIncome: 200000,
			netIncome: 150000,
			creditScore: 730,
			ObligationsRunning: 'No'
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
//
// Scenario: Karthik Nair (32, salaried primary) + Priya Nair (30, salaried spouse co-borrower)
// + Gopinath Nair (62, pensioner parent co-borrower). Bangalore, resale RTM flat, ₹1.2Cr loan.
//
// Exercises:
//   - 3 applicants with mixed employmentType (Salaried×2 + Pensioner)
//   - loanRole: 'co_borrower' → roleInApplication 'Co-Borrower'
//   - per-applicant rawApplicant.relationship ('Spouse', 'Parent') resolves
//     relationshipWithPrimary without needing a top-level relationships array
//   - Pensioner co-applicant — pensionProfile path, only netIncome set (no grossIncome)

export const EDGE_3_APPLICANTS_JOURNEY: Journey = journey({
	id: 'EDGE-3-APPLICANTS',
	description:
		'Home Loan — 3 applicants (husband+wife+father), CIBIL 760/730/790, Bangalore ₹1.2Cr',
	tags: ['home-loan', 'multi-applicant', 'family', 'pensioner', 'high-value', 'edge-case'],
	seed: 102,
	loanName: 'Home Loan',
	initialAnswers: { loanType: 'New Loan' },
	steps: [
		page('caseIntake_homeLoan', { assessmentStatus: 'fresh' }),

		// Property Location — resale_normal sets PropertyStage: 'Ready To Move' flagKey.
		// propertyAreaType 'PLANNED_AUTHORITY' (the hand-written 'RERA_APPROVED' was NOT
		// a valid area-type option — FIXTURE-WAS-WRONG corrected during snapshot capture).
		page('propertyLocation_homeLoan', {
			propertyIdentified: 'Yes',
			propertyAreaType: 'PLANNED_AUTHORITY',
			purchaseType: 'resale_normal',
			propertyStateName: 'Karnataka',
			propertyCityName: 'Bangalore',
			propertyUsageIntent: 'SELF_USE',
			PropertyStage: 'Ready To Move'
		}),

		// Property Character — Flat, carpetArea ~1200 for ₹1.2Cr Bangalore flat.
		page('propertyCharacter_homeLoan', {
			constructionType: 'Flat',
			carpetArea: 1200
		}),

		// Compliance & Legal — PLANNED_AUTHORITY + resale + RTM: same visible set as HL-NEW-SAL-CLEAN
		// but with full documentation readiness (OC/CC).
		page('complianceLegal_homeLoan', {
			propertyComplianceStatus: 'fully_compliant',
			ocCcAvailable: 'BOTH',
			documentationReadiness: ['SALE_DEED', 'OC', 'CC', 'EC']
		}),

		// Seller & Transaction — resale_normal: same chain as HL-NEW-SAL-CLEAN.
		page('sellerTransaction_homeLoan', {
			sellerOwnershipType: 'SOLE_OWNER',
			propertyAcquisitionMethod: 'PURCHASED',
			sellerOnLoan: 'No',
			ifPropertyRegistered: 'Yes',
			lastRegistryDuration: 'moreThanTwoYears',
			isAnyBuilderDemand: 'No'
		}),

		// 3 applicants; residenceOptionSame: 'Yes' → residenceSameAsProperty true.
		page('tellUs_homeLoan', {
			numberOfDirectorOrApplicant: 3,
			residenceOptionSame: 'Yes'
		}),

		// Applicant #0 — Karthik Nair (primary, salaried private)
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Karthik Nair',
			age: 32,
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
				receives_bonus: true,
				receives_salary_slip_form16: true,
				has_professional_qualification: true
			},
			grossIncome: 180000,
			netIncome: 145000,
			creditScore: 760,
			ObligationsRunning: 'No'
		}),

		// Applicant #1 — Priya Nair (spouse, salaried co-borrower)
		// twoYearsWithSameEmployer: false, receivesBonus: false — drop employed_2plus_years
		// and receives_bonus snake_case flags.
		addApplicant({
			applicantType: 'Individual',
			title: 'Mrs.',
			fullName: 'Priya Nair',
			age: 30,
			gender: 'Female',
			maritalStatus: 'Married',
			employmentType: 'Salaried(Private)',
			TypeOfResidence: 'Rented',
			loanRole: 'co_borrower',
			relationship: 'Spouse',
			salariedActivityDetailsVisible: {
				works_for_reputed_org: true,
				company_100plus_employees: true,
				holds_permanent_position: true,
				total_experience_3plus_years: true,
				provides_staff_benefits: true,
				salary_credited_regularly: true,
				receives_salary_slip_form16: true,
				has_professional_qualification: true
			},
			grossIncome: 120000,
			netIncome: 95000,
			creditScore: 730,
			ObligationsRunning: 'No'
		}),

		// Applicant #2 — Gopinath Nair (parent, pensioner co-borrower)
		// Pensioner payload path sets only netIncome (and monthlyOtherIncome if provided),
		// NOT grossIncome — the hand-written 55000 grossIncome was FIXTURE-WAS-WRONG (i).
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Gopinath Nair',
			age: 62,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Pensioner',
			TypeOfResidence: 'Owned',
			loanRole: 'co_borrower',
			relationship: 'Parent',
			pensionActivityDetailsVisible: {
				pension_credited_regularly: true,
				govt_pension: true,
				lifelong_pension: true,
				pension_continues_75plus: true,
				pension_slip_available: true,
				pension_bank_nationalised: true,
				no_pension_loan_deduction: true,
				pension_owns_property: true,
				spouse_pension_applicable: true,
				pension_itr_filed: true,
				pension_physical_verification: true
			},
			netIncome: 50000,
			creditScore: 790,
			ObligationsRunning: 'No'
		}),

		// Deal & Financials — ₹1.2Cr property, ₹96L loan, 25y mortgage.
		// marketValue/propCost/registryValue/deposit per high-value resale.
		page('dealFinancials_homeLoan', {
			auctionPropertyStatus: 'STANDARD',
			mortgageYear: '25',
			marketValue: 12500000,
			propCost: 12000000,
			registryValue: 12000000,
			deposit: 2400000,
			registryTimeline: '1_3_MONTHS'
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// Ashok Tiwari, 50yo Married, Lucknow, CIBIL 820.
// Commercial Shop property in OLD_MUNICIPAL area (non-planned → exposes
// approachRoadWidth + restrictedZone on propertyLocation_LAP, and exposes
// the OLD_MUNICIPAL-gated compliance questions on propertyCondition_LAP).
// facilityType = 'Term Loan' (post-2026-05-31 rename, ADR-0020). The
// pre-rename `LAPType` field carried 'LAP' for the term-loan facility;
// after the rename, `LAPType` is retired and the equivalent canonical
// value lives on `facilityType` as 'Term Loan' (matching how PL/BL/Prof
// express the same concept). Current LAP schema options for facilityType:
// 'Term Loan' and 'Drop-line OverDraft (DOD)'.

export const EDGE_GOVT_SAL_JOURNEY: Journey = journey({
	id: 'EDGE-GOVT-SAL',
	description:
		'LAP Term New — Central Govt officer, Lucknow, CIBIL 820, commercial shop OLD_MUNICIPAL',
	tags: ['lap', 'new-loan', 'term', 'government', 'central-govt', 'commercial', 'edge-case'],
	seed: 200,
	loanName: 'Loan Against Property',
	expectedRoute: '/form/lap',
	initialAnswers: {
		loanType: 'New Loan',
		facilityType: 'Term Loan'
	},
	steps: [
		page('caseIntake_lapLoan', { assessmentStatus: 'fresh' }),

		page('loanRequirementPage', {
			mortgageYear: '15',
			loanPurpose: 'BUSINESS_EXPANSION',
			propCost: 6000000,
			RequiredLoanAmount: 3000000
		}),

		page('propertyIdentificationPage', {
			propertyStateName: 'Uttar Pradesh',
			propertyCityName: 'Lucknow',
			applicantResidingInProperty: 'No',
			propertyOccupancyStatus: 'commercial_use'
		}),

		// OLD_MUNICIPAL (non-planned) — surfaces approachRoadWidth + restrictedZone.
		// societyStatus still shows at this point because categoryOfProperty is
		// unset; set it deterministically.
		page('propertyLocation_LAP', {
			propertyAreaType: 'OLD_MUNICIPAL',
			societyStatus: 'NONE',
			approachRoadWidth: 'STANDARD_12_20',
			restrictedZone: 'NONE',
			floodDisasterZone: 'No'
		}),

		page('propertyCharacter_LAP', {
			categoryOfProperty: 'Commercial',
			constructionType: 'Shop',
			propertyType: 'Free Hold',
			propertyAge: '11-20',
			carpetArea: 800
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
			fullName: 'Ashok Tiwari',
			age: 50,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Salaried(Government)',
			TypeOfResidence: 'Owned',
			// Government profile flags — snake_case keys per
			// buildGovernmentProfile() in payloadBuilder/activityProfiles.ts.
			salariedActivityDetailsVisible: {
				govt_central_employee: true,
				govt_position_permanent: true,
				govt_probation_completed: true,
				govt_more_than_2_years: true,
				govt_no_disciplinary_action: true,
				physical_verification_possible: true,
				govt_incentive_bonus: true,
				govt_pension_eligible: true,
				govt_salary_slip_received: true,
				govt_itr_filed: true,
				govt_owns_property: true
			},
			grossIncome: 130000,
			netIncome: 105000,
			creditScore: 820,
			ObligationsRunning: 'No'
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
//
// Deep-subprime Home Loan edge. Exercises: low CIBIL (580) deviation path,
// stressed salaried profile (proprietor employer, minimal benefits), 2 running
// obligations (1 term_loan + 1 credit_line). Property is UC Flat in an
// OLD_MUNICIPAL area of Thane — residence differs (Mumbai). Legal chain
// questions on complianceLegal (titleChainStatus/encumbranceCertStatus/
// successionStatus) require purchaseType='resale' — HIDDEN for
// direct_from_builder. revenueRecordMutation requires OLD_MUNICIPAL — visible.
// ocCcAvailable HIDDEN for UC. municipalTaxStatus + unauthorizedAdditions
// visible for OLD_MUNICIPAL.
//
// Note (shift from old hand-written scenario): old used purchaseType 'Direct
// Sale' which in V2 had no exact equivalent — resale_normal is blocked by
// PropertyStage flagKey (forces RTM, contradicts UC). We therefore use
// direct_from_builder, which requires the builder/project/RERA chain on the
// propertyCharacter page (HL_NEW_SE_PRO pattern).

export const EDGE_CIBIL_580_JOURNEY: Journey = journey({
	id: 'EDGE-CIBIL-580',
	description: 'Home Loan — CIBIL 580, Salaried 55K, stressed applicant, UC flat Thane ₹45L',
	tags: ['home-loan', 'low-cibil', 'subprime', 'stressed', 'under-construction', 'edge-case'],
	seed: 102,
	loanName: 'Home Loan',
	initialAnswers: { loanType: 'New Loan' },
	steps: [
		page('caseIntake_homeLoan', { assessmentStatus: 'fresh' }),

		// OLD_MUNICIPAL + direct_from_builder — PropertyStage flagKey only applies
		// to resale_normal, so it's NOT set here; set on propertyCharacter instead.
		page('propertyLocation_homeLoan', {
			propertyIdentified: 'Yes',
			propertyAreaType: 'OLD_MUNICIPAL',
			purchaseType: 'direct_from_builder',
			propertyStateName: 'Maharashtra',
			propertyCityName: 'Thane',
			propertyUsageIntent: 'SELF_USE'
		}),

		// UC Flat + direct_from_builder — builder chain required (see HL_NEW_SE_PRO).
		page('propertyCharacter_homeLoan', {
			constructionType: 'Flat',
			carpetArea: 650,
			PropertyStage: 'Under Construction',
			builderName: '__other__',
			builderNameManual: 'Thane Builders',
			projectNameSelected: '__other__',
			projectNameManual: 'Thane Heights',
			builderRole: 'developer',
			reraStatus: 'rera_registered'
		}),

		// OLD_MUNICIPAL + UC + direct_from_builder + Flat: propertyComplianceStatus
		// (q1c_municipal), municipalTaxStatus, unauthorizedAdditions,
		// documentationReadiness (q1c_municipal values), revenueRecordMutation
		// (OLD_MUNICIPAL) visible. ocCcAvailable hidden (UC). Legal chain
		// (titleChainStatus/encumbranceCertStatus/successionStatus) hidden
		// (require purchaseType='resale').
		page('complianceLegal_homeLoan', {
			propertyComplianceStatus: 'authorized_not_per_plan',
			municipalTaxStatus: 'PAID_REGULAR',
			unauthorizedAdditions: 'NONE',
			documentationReadiness: ['SALE_DEED', 'TAX_RECEIPTS', 'EC'],
			revenueRecordMutation: 'MUTATED'
		}),

		// residenceOptionSame: 'No' + residence state/city populates residenceState/City.
		page('tellUs_homeLoan', {
			numberOfDirectorOrApplicant: 1,
			residenceOptionSame: 'No',
			residenceStateName: 'Maharashtra',
			residenceCityName: 'Mumbai'
		}),

		// Stressed salaried profile: only 4 TRUE flags (proprietor employer,
		// 3+yr experience, salary credited, receives slip) — mirrors legacy
		// EDGE_CIBIL_580 salariedProfile shape.
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Vikas Jadhav',
			age: 29,
			gender: 'Male',
			maritalStatus: 'Single',
			employmentType: 'Salaried(Private)',
			TypeOfResidence: 'With Parents',
			salariedActivityDetailsVisible: {
				employer_is_proprietorship_or_partnership: true,
				total_experience_3plus_years: true,
				salary_credited_regularly: true,
				receives_salary_slip_form16: true
			},
			grossIncome: 65000,
			netIncome: 55000,
			creditScore: 580,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: 'obl-cibil580-1',
					loanType: 'Personal Loan',
					bankName: 'Bajaj Finserv',
					selectedToClose: 'Keep running',
					emi: '8500',
					tenure: '36',
					interestRate: '16',
					remainingTenure: '18'
				},
				{
					// 'Credit Card' is NOT in CREDIT_LINE_TYPES (only CC Limit / OD Limit /
					// Dropline OD qualify automatically) — pass obligationType explicitly.
					id: 'obl-cibil580-2',
					loanType: 'Credit Card',
					bankName: 'HDFC Bank',
					selectedToClose: 'Keep running',
					emi: '0',
					totalLimit: '150000',
					obligationType: 'credit_line'
				}
			]
		}),

		page('dealFinancials_homeLoan', {
			auctionPropertyStatus: 'STANDARD',
			mortgageYear: '25',
			marketValue: 4800000,
			propCost: 4500000,
			registryValue: 4500000,
			deposit: 900000,
			registryTimeline: '3_6_MONTHS'
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// High-value HL. Enterprise tier. RTM Flat Delhi ₹7Cr. Self-employed(Other)
// applicant with businessProfile + 3-yr financials + 1 running Home Loan obligation.
// Shape mirrors HL-NEW-SAL-CLEAN for property, HL-NEW-SE-PRO for businessProfile+financials,
// HL-TOPUP for obligation. Uses Flat (not Independent House — classification (i)
// FIXTURE-WAS-WRONG: V2 constructionType values are Flat/House/Floor, and House
// would hide ocCcAvailable and surface municipalApproval).

export const EDGE_HIGH_VALUE_JOURNEY: Journey = journey({
	id: 'EDGE-HIGH-VALUE',
	description: 'Home Loan — ₹5Cr, Self-employed business, CIBIL 790, RTM flat Delhi ₹7Cr',
	tags: ['home-loan', 'high-value', 'self-employed', 'business', 'enterprise-tier', 'edge-case'],
	seed: 102,
	loanName: 'Home Loan',
	initialAnswers: { loanType: 'New Loan' },
	steps: [
		page('caseIntake_homeLoan', { assessmentStatus: 'fresh' }),
		page('propertyLocation_homeLoan', {
			propertyIdentified: 'Yes',
			propertyAreaType: 'PLANNED_AUTHORITY',
			purchaseType: 'resale_normal',
			propertyStateName: 'Delhi',
			propertyCityName: 'New Delhi',
			propertyUsageIntent: 'SELF_USE',
			PropertyStage: 'Ready To Move'
		}),
		page('propertyCharacter_homeLoan', {
			constructionType: 'Flat',
			carpetArea: 2500
		}),
		page('complianceLegal_homeLoan', {
			propertyComplianceStatus: 'fully_compliant',
			ocCcAvailable: 'BOTH',
			documentationReadiness: ['SALE_DEED', 'OC', 'CC', 'EC']
		}),
		page('sellerTransaction_homeLoan', {
			sellerOwnershipType: 'SOLE_OWNER',
			propertyAcquisitionMethod: 'PURCHASED',
			sellerOnLoan: 'No',
			ifPropertyRegistered: 'Yes',
			lastRegistryDuration: 'moreThanTwoYears',
			isAnyBuilderDemand: 'No'
		}),
		page('tellUs_homeLoan', {
			numberOfDirectorOrApplicant: 1,
			residenceOptionSame: 'No',
			residenceStateName: 'Delhi',
			residenceCityName: 'New Delhi'
		}),
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Vikram Malhotra',
			age: 48,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Self-employed(Other)',
			TypeOfResidence: 'Owned',
			businessActivityDetailsVisible: {
				gst_registered: true,
				itr_filed_regularly: true,
				profit_last_3_years: true,
				profit_since_starting: true,
				has_current_account: true,
				has_cc_od: true,
				has_other_income_source: true,
				has_commercial_premises: true,
				owns_premises: true,
				business_3plus_years: true,
				two_years_experience_before_practice: true
			},
			financialsTableVisible: {
				grossReceipts: [85000000, 92000000, 105000000],
				netProfit: [12000000, 14500000, 17000000],
				depreciation: [2000000, 2200000, 2500000],
				itrFiled: ['FY21-22', 'FY22-23', 'FY23-24']
			},
			creditScore: 790,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					id: 'obl-high-value-1',
					loanType: 'Home Loan',
					bankName: 'SBI',
					selectedToClose: 'Keep running',
					emi: '85000',
					tenure: '240',
					interestRate: '8.25',
					remainingTenure: '120'
				}
			]
		}),
		page('dealFinancials_homeLoan', {
			auctionPropertyStatus: 'STANDARD',
			mortgageYear: '20',
			marketValue: 72000000,
			propCost: 70000000,
			registryValue: 70000000,
			deposit: 20000000,
			registryTimeline: '1_3_MONTHS'
		})
	]
});
