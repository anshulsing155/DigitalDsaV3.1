/**
 * ═══════════════════════════════════════════════════════════════════════════
 * S77e — Home Loan Journeys
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Canonical Home Loan journey declarations. Played through the form engine
 * by `toScenario()` to produce `FormPathScenario` objects that downstream
 * consumers (fixtureProfiles, formPathScenarios, syntheticGenerator) read.
 *
 * Step 4 (full-fidelity):
 *   - `HL_NEW_SAL_CLEAN_JOURNEY` — full page coverage with correct answer
 *     keys. `toScenario(HL_NEW_SAL_CLEAN_JOURNEY).payload` byte-matches the
 *     committed `HL-NEW-SAL-CLEAN.pre-migration.json` snapshot (FM-1 §2).
 *
 * Step 4 will add the remaining 5 Home Loan journeys:
 *   - HL-NEW-SE-PRO, HL-BT, HL-TOPUP, HL-PRE-SANCTION, HL-EDGE-*
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
// HL-NEW-SAL-CLEAN — Home Loan, New Loan, Salaried, no obligations
// ─────────────────────────────────────────────────────────────────────────────
//
// Legacy scenario (formPathScenarios.ts HL_NEW_SAL_CLEAN):
//   Salaried ₹80K net / 100K gross · CIBIL 780 · no obligations
//   RTM flat · Pune (Maharashtra) · ₹75L cost · ₹60L loan · 20y tenure
//
// Journey walk (Step 4 — full fidelity, byte-matches pre-migration snapshot):
//   1. caseIntake_homeLoan       — assessmentStatus: 'fresh'
//   2. propertyLocation_homeLoan — propertyIdentified, areaType, purchaseType,
//                                  state/city, usageIntent.
//                                  PropertyStage: 'Ready To Move' also set here
//                                  to model the flagKey the client auto-sets when
//                                  purchaseType='resale_normal' is selected.
//   3. propertyCharacter_homeLoan — constructionType, carpetArea.
//                                   PropertyStage question is hidden for resale_normal
//                                   (its showWhen excludes resale) so it is NOT set here.
//   4. complianceLegal_homeLoan  — MERGED page (getPropertyConditionQuestions() +
//                                  getLegalQuestions()). For PLANNED_AUTHORITY + RTM Flat:
//                                  propertyComplianceStatus, ocCcAvailable, reraRegistrationStatus,
//                                  documentationReadiness visible.
//                                  titleChainStatus/encumbranceCertStatus/successionStatus/
//                                  revenueRecordMutation are hidden (their showWhen requires
//                                  CONVERTED_RESIDENTIAL/OLD_MUNICIPAL/LOCAL_COLONY/UNKNOWN).
//   5. sellerTransaction_homeLoan — resale seller questions:
//                                   sellerOwnershipType, propertyAcquisitionMethod,
//                                   sellerOnLoan, ifPropertyRegistered, lastRegistryDuration,
//                                   isAnyBuilderDemand.
//   6. tellUs_homeLoan            — custom component page (questions: []).
//                                   Sets residenceOptionSame (→ residenceSameAsProperty in
//                                   payload) and numberOfDirectorOrApplicant.
//                                   FM-5 bypasses bindsTo validation on custom pages.
//   7. addApplicant()             — primary salaried applicant.
//                                   Raw keys use form-engine names:
//                                   TypeOfResidence (not residenceType),
//                                   salariedActivityDetailsVisible with snake_case option keys
//                                   (not salariedProfile with camelCase booleans),
//                                   ObligationsRunning: 'No' (not hasExistingObligations).
//   8. dealFinancials_homeLoan    — auctionPropertyStatus, mortgageYear, marketValue,
//                                   propCost, registryValue, deposit, registryTimeline.

export const HL_NEW_SAL_CLEAN_JOURNEY: Journey = journey({
	id: 'HL-NEW-SAL-CLEAN',
	description: 'Home Loan New — Salaried 80K, CIBIL 780, no obligations, RTM flat Pune ₹60L',
	tags: ['home-loan', 'new-loan', 'salaried', 'no-obligations', 'rtm'],
	seed: 42,
	loanName: 'Home Loan',

	// how-can-we-help prelude: loanType chosen at q4 before the Home Loan form.
	initialAnswers: {
		loanType: 'New Loan'
	},

	steps: [
		// Page 1 — Case Intake
		page('caseIntake_homeLoan', {
			assessmentStatus: 'fresh'
		}),

		// Page 2 — Property Location
		// PropertyStage: 'Ready To Move' is a flagKey side-effect of purchaseType='resale_normal':
		// the client auto-sets it when the option is selected. The journey models this explicitly
		// so the accumulated answers are correct for downstream showWhen evaluations.
		page('propertyLocation_homeLoan', {
			propertyIdentified: 'Yes',
			propertyAreaType: 'PLANNED_AUTHORITY',
			purchaseType: 'resale_normal',
			propertyStateName: 'Maharashtra',
			propertyCityName: 'Pune',
			propertyUsageIntent: 'SELF_USE',
			PropertyStage: 'Ready To Move'
		}),

		// Page 3 — Property Character
		// PropertyStage question (q2) has showWhen that excludes purchaseType='resale_normal',
		// so it is NOT set here — the flagKey value from page 2 is already in state.
		page('propertyCharacter_homeLoan', {
			constructionType: 'Flat',
			carpetArea: 650
		}),

		// Page 4 — Compliance & Legal Verification (merged page)
		// Visible questions for PLANNED_AUTHORITY + resale_normal + Flat + RTM:
		//   propertyComplianceStatus (q1a), ocCcAvailable (q2), reraRegistrationStatus (q5),
		//   documentationReadiness (q1a from legal — shown for PLANNED_AUTHORITY).
		// Hidden: titleChainStatus/encumbranceCertStatus/successionStatus/revenueRecordMutation
		//   (all require propertyAreaType in CONVERTED_RESIDENTIAL/OLD_MUNICIPAL/LOCAL_COLONY/UNKNOWN).
		// reraRegistrationStatus: q5 defined in propertyCondition.ts but excluded from
		// getPropertyConditionQuestions() export — not on any schema page, so not set here.
		page('complianceLegal_homeLoan', {
			propertyComplianceStatus: 'fully_compliant',
			ocCcAvailable: 'BOTH',
			documentationReadiness: ['SALE_DEED', 'EC']
		}),

		// Page 5 — Seller & Transaction Details (resale_normal)
		// sellerOnLoan: 'No' → ifPropertyRegistered visible, sellerOutstandingAmount hidden.
		// ifPropertyRegistered: 'Yes' → lastRegistryDuration visible.
		// poaRegistrationStatus hidden (sellerOwnershipType is SOLE_OWNER, not POA_HOLDER).
		page('sellerTransaction_homeLoan', {
			sellerOwnershipType: 'SOLE_OWNER',
			propertyAcquisitionMethod: 'PURCHASED',
			sellerOnLoan: 'No',
			ifPropertyRegistered: 'Yes',
			lastRegistryDuration: 'moreThanTwoYears',
			isAnyBuilderDemand: 'No'
		}),

		// Page 7 — Applicant Details (custom component — bindsTo keys bypassed by FM-5)
		// residenceOptionSame: 'Yes' → residenceSameAsProperty: true in loanTransaction payload.
		// numberOfDirectorOrApplicant: 1 → numberOfApplicants: 1 in payload
		//   (builder: toNumber(loanAnswers.numberOfDirectorOrApplicant) ?? 1).
		page('tellUs_homeLoan', {
			numberOfDirectorOrApplicant: 1,
			residenceOptionSame: 'Yes'
		}),

		// Applicant — raw form-engine keys (NOT payload output keys)
		// TypeOfResidence → residenceType in payload (applicantPayload.ts line ~103)
		// salariedActivityDetailsVisible + snake_case keys → salariedProfile camelCase booleans
		//   via buildSalariedProfile(extractSelectedOptions(...)) in activityProfiles.ts
		// ObligationsRunning: 'No' → hasExistingObligations: false in payload (line ~72)
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Amit Deshmukh',
			age: 34,
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
			grossIncome: 100000,
			netIncome: 80000,
			creditScore: 780,
			ObligationsRunning: 'No'
		}),

		// Page 13 — Deal & Financials
		// auctionPropertyStatus must be answered first — all other questions have
		// showWhen chains that start with `auctionPropertyStatus != ''`.
		// deposit key (q6) → downPayment in payload (via downPayment ?? downpaymentByOwn ?? deposit).
		// registryTimeline: '1_3_MONTHS' — valid option value (WITHIN_3_MONTHS was never valid).
		page('dealFinancials_homeLoan', {
			auctionPropertyStatus: 'STANDARD',
			mortgageYear: '20',
			marketValue: 8000000,
			propCost: 7500000,
			registryValue: 7500000,
			deposit: 1500000,
			registryTimeline: '1_3_MONTHS'
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// HL-NEW-SE-PRO — Home Loan, New Loan, Self-employed Chartered Accountant
// ─────────────────────────────────────────────────────────────────────────────
//
// Exercises a different payload shape than SAL-CLEAN:
//   - Self-employed(Professional) applicant → businessProfile + financials
//     (vs. salariedProfile in SAL-CLEAN)
//   - Under-construction Flat from builder (direct_from_builder purchaseType)
//     - PropertyStage: 'Under Construction' (not flagKey'd — only resale_normal is)
//     - builderName/projectNameSelected/builderRole/reraStatus required on
//       propertyCharacter for direct_from_builder + UC + Flat
//   - sellerTransaction_homeLoan HIDDEN (direct_from_builder, not resale)
//   - ocCcAvailable / municipalApproval / isPossessionOfferedByAuthority all
//     HIDDEN on complianceLegal (all require RTM or direct_from_authority)
//
// Scenario: Ketan Bhatt, 38yo married CA, Ahmedabad UC flat ₹65L, ₹50L loan, 15y.
//           CIBIL 750, no obligations, owned residence, average bank balance ₹5L,
//           3-yr financials declared.

export const HL_NEW_SE_PRO_JOURNEY: Journey = journey({
	id: 'HL-NEW-SE-PRO',
	description: 'Home Loan New — Self-employed CA, CIBIL 750, under-construction flat Ahmedabad ₹50L',
	tags: ['home-loan', 'new-loan', 'self-employed-professional', 'ca', 'under-construction'],
	seed: 43,
	loanName: 'Home Loan',

	initialAnswers: {
		loanType: 'New Loan'
	},

	steps: [
		page('caseIntake_homeLoan', {
			assessmentStatus: 'fresh'
		}),

		// Property Location — direct_from_builder (no PropertyStage flagKey here;
		// PropertyStage is answered on propertyCharacter page instead).
		page('propertyLocation_homeLoan', {
			propertyIdentified: 'Yes',
			propertyAreaType: 'PLANNED_AUTHORITY',
			purchaseType: 'direct_from_builder',
			propertyStateName: 'Gujarat',
			propertyCityName: 'Ahmedabad',
			propertyUsageIntent: 'SELF_USE'
		}),

		// Property Character — UC Flat requires dynamic builder chain:
		//   builderName ('__other__' → builderNameManual) → projectNameSelected
		//   ('__other__' → projectNameManual) → builderRole → reraStatus.
		// Using '__other__' path avoids depending on live RERA option data.
		// None of these keys are read by the loan-transaction builder, so they
		// stay in state.answers but do not appear in the output payload.
		page('propertyCharacter_homeLoan', {
			constructionType: 'Flat',
			carpetArea: 900,
			PropertyStage: 'Under Construction',
			builderName: '__other__',
			builderNameManual: 'Acme Builders',
			projectNameSelected: '__other__',
			projectNameManual: 'Acme Heights',
			builderRole: 'developer',
			reraStatus: 'rera_registered'
		}),

		// Compliance & Legal — for UC + direct_from_builder + Flat + PLANNED_AUTHORITY:
		// only propertyComplianceStatus and documentationReadiness are visible.
		// ocCcAvailable hidden (requires RTM), municipalApproval hidden (requires House),
		// isPossessionOfferedByAuthority hidden (requires RTM), reraRegistrationStatus
		// orphan (not exported from getPropertyConditionQuestions), legal chain hidden
		// (PLANNED_AUTHORITY not in the allowed area types for titleChainStatus).
		page('complianceLegal_homeLoan', {
			propertyComplianceStatus: 'fully_compliant',
			documentationReadiness: ['SALE_DEED', 'BUILDER_AGREEMENT', 'ALLOTMENT_LETTER']
		}),

		// Custom component — residenceOptionSame and numberOfDirectorOrApplicant
		// flow straight through to loanAnswers (FM-5 bypass on custom pages).
		page('tellUs_homeLoan', {
			numberOfDirectorOrApplicant: 1,
			residenceOptionSame: 'Yes'
		}),

		// Applicant — Self-employed(Professional) CA
		// businessActivityDetailsVisible snake_case keys → businessProfile camelCase
		// booleans via buildBusinessProfile(extractSelectedOptions(...)).
		// financialsTableVisible arrays → financials via extractFinancials().
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Ketan Bhatt',
			age: 38,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Self-employed(Professional)',
			TypeOfResidence: 'Owned',
			professionType: 'Chartered Accountant(CA)',
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
				bar_council_registered: true,
				two_years_experience_before_practice: true
			},
			financialsTableVisible: {
				grossReceipts: [2800000, 3200000, 3600000],
				netProfit: [1000000, 1200000, 1400000],
				depreciation: [80000, 90000, 100000],
				itrFiled: ['FY21-22', 'FY22-23', 'FY23-24']
			},
			averageBankBalance: 500000,
			creditScore: 750,
			ObligationsRunning: 'No'
		}),

		page('dealFinancials_homeLoan', {
			auctionPropertyStatus: 'STANDARD',
			mortgageYear: '15',
			marketValue: 7000000,
			propCost: 6500000,
			registryValue: 6500000,
			deposit: 1500000,
			registryTimeline: '3_6_MONTHS'
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// HL-NEW-PENS — Home Loan, New Loan, Pensioner, OLD_MUNICIPAL resale house
// ─────────────────────────────────────────────────────────────────────────────
//
// Exercises: Pensioner employment path (pensionProfile from pensionActivityDetailsVisible;
// only netIncome is set, no grossIncome). OLD_MUNICIPAL area activates a different
// compliance+legal question chain (municipalTaxStatus, unauthorizedAdditions,
// titleChainStatus, encumbranceCertStatus, successionStatus, revenueRecordMutation).
// Construction type 'House' skips ocCcAvailable and surfaces municipalApproval instead.

export const HL_NEW_PENS_JOURNEY: Journey = journey({
	id: 'HL-NEW-PENS',
	description: 'Home Loan New — Pensioner 40K, CIBIL 800, resale house Bhopal ₹15L',
	tags: ['home-loan', 'new-loan', 'pensioner', 'resale', 'rtm'],
	seed: 44,
	loanName: 'Home Loan',
	initialAnswers: { loanType: 'New Loan' },
	steps: [
		page('caseIntake_homeLoan', { assessmentStatus: 'fresh' }),
		page('propertyLocation_homeLoan', {
			propertyIdentified: 'Yes',
			propertyAreaType: 'OLD_MUNICIPAL',
			purchaseType: 'resale_normal',
			propertyStateName: 'Madhya Pradesh',
			propertyCityName: 'Bhopal',
			propertyUsageIntent: 'SELF_USE',
			PropertyStage: 'Ready To Move'
		}),
		page('propertyCharacter_homeLoan', {
			constructionType: 'House',
			carpetArea: 1200
		}),
		// OLD_MUNICIPAL + House + RTM: propertyComplianceStatus (q1c_municipal),
		// municipalApproval (House+RTM), municipalTaxStatus, unauthorizedAdditions,
		// documentationReadiness (q1c_municipal), titleChainStatus, encumbranceCertStatus,
		// successionStatus (resale+OLD_MUNICIPAL), revenueRecordMutation (OLD_MUNICIPAL).
		// ocCcAvailable hidden (House), isPossessionOfferedByAuthority hidden (resale).
		page('complianceLegal_homeLoan', {
			propertyComplianceStatus: 'fully_compliant',
			municipalApproval: 'APPROVED',
			municipalTaxStatus: 'PAID_REGULAR',
			unauthorizedAdditions: 'NONE',
			documentationReadiness: ['SALE_DEED', 'TAX_RECEIPTS', 'EC'],
			titleChainStatus: 'CLEAR',
			encumbranceCertStatus: 'CLEAR',
			successionStatus: 'NOT_INHERITED',
			revenueRecordMutation: 'MUTATED'
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
		// Pensioner — pensionActivityDetailsVisible with snake_case keys → pensionProfile
		// via buildPensionProfile(extractSelectedOptions(...)) in activityProfiles.ts.
		// Only netIncome set (Pensioner path does not set grossIncome).
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Ramesh Tiwari',
			age: 62,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Pensioner',
			TypeOfResidence: 'Owned',
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
			netIncome: 40000,
			creditScore: 800,
			ObligationsRunning: 'No'
		}),
		page('dealFinancials_homeLoan', {
			auctionPropertyStatus: 'STANDARD',
			mortgageYear: '10',
			marketValue: 2140000,
			propCost: 2000000,
			registryValue: 1940000,
			deposit: 500000,
			registryTimeline: '1_3_MONTHS'
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// HL-BT-ONLY — Home Loan, Balance Transfer Only, Flat RTM Chennai
// ─────────────────────────────────────────────────────────────────────────────
//
// Exercises: BT loan flow (btExistingLoan page). propertyLocation's purchaseType
// question is hidden for BT/Top-up (showWhen includes loanType == New Loan).
// sellerTransaction_homeLoan hidden (showWhen requires New Loan).
// btExistingLoan visible with: bank, principalOutstanding, interestRate, tenure,
// EMI, registry-6mo flag, property value, new tenure, vintage, track.

export const HL_BT_ONLY_JOURNEY: Journey = journey({
	id: 'HL-BT-ONLY',
	description: 'Home Loan BT Only — Salaried 90K, CIBIL 770, Outstanding 40L from HDFC',
	tags: ['home-loan', 'balance-transfer', 'salaried', 'clean-track'],
	seed: 45,
	loanName: 'Home Loan',
	initialAnswers: { loanType: 'Balance Transfer Only' },
	steps: [
		page('caseIntake_homeLoan', { assessmentStatus: 'fresh' }),
		// BT: no purchaseType question. PropertyStage visible for BT when registry done.
		// Set isRegistryDone: 'Yes' so the BT-specific RTM branch for ocCcAvailable/etc.
		page('propertyLocation_homeLoan', {
			propertyIdentified: 'Yes',
			propertyAreaType: 'PLANNED_AUTHORITY',
			propertyStateName: 'Tamil Nadu',
			propertyCityName: 'Chennai',
			propertyUsageIntent: 'SELF_USE',
			isRegistryDone: 'Yes'
		}),
		page('propertyCharacter_homeLoan', {
			constructionType: 'Flat',
			carpetArea: 1100,
			PropertyStage: 'Ready To Move'
		}),
		// nocFromPreviousLender lives on complianceLegal (legal.ts q3), not loanRequirements,
		// and is gated by loanType in BT/Top-up.
		// Orphan keys in V2 for HL BT: sixMonthsPassedAfterRegistry (removed — Form Optimization
		// Tier 1.2), currentPropertyValue, newTenure, loanVintage, repaymentTrack (none
		// surfaced on any page). None can be set via schema-driven journey steps.
		page('complianceLegal_homeLoan', {
			propertyComplianceStatus: 'fully_compliant',
			ocCcAvailable: 'BOTH',
			documentationReadiness: ['SALE_DEED', 'OC', 'CC', 'EC'],
			nocFromPreviousLender: 'Yes'
		}),
		// btExistingLoan_homeLoan — only include keys actually in V2 schema.
		// sanctionAmount: sourced here; builder line 52 falls back to it for loanAmount.
		page('btExistingLoan_homeLoan', {
			selectSingleBank: 'HDFC Bank',
			sanctionAmount: 4000000,
			principalOutstanding: 4000000,
			existingInterestRate: 9.5,
			remainingTenure: 180,
			includedCurrentEMIsAmount: 42000,
			interestRateType: 'FLOATING',
			emiBounceHistory: '0'
		}),
		// loanRequirements_homeLoan — BT/Top-up tenure + top-up amount.
		// HL V2 loanRequirements only surfaces mortgageYear/mortgageYearCustom/topUpAmount/topUpTenure/topUpPurpose.
		page('loanRequirements_homeLoan', {
			mortgageYear: '18'
		}),
		page('tellUs_homeLoan', {
			numberOfDirectorOrApplicant: 1,
			residenceOptionSame: 'Yes'
		}),
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Arun Krishnan',
			age: 38,
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
			netIncome: 90000,
			creditScore: 770,
			ObligationsRunning: 'No'
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// HL-BT-TOPUP — Home Loan, BT + Top-up, Couple Joint, Hyderabad
// ─────────────────────────────────────────────────────────────────────────────
//
// Exercises: two applicants with spouse relationship; topUpAmount/topUpTenure
// fields (requiredTopupAmount/topupTerm in form); residenceSameAsProperty false
// (different state city for residence). applicationStructure: 'Couple' — set via
// numberOfDirectorOrApplicant=2 + tellUsWhoIsApplying.

export const HL_BT_TOPUP_JOURNEY: Journey = journey({
	id: 'HL-BT-TOPUP',
	description: 'Home Loan BT+Topup — Couple joint, CIBIL 750/740, Outstanding 35L SBI + 5L topup',
	tags: ['home-loan', 'balance-transfer', 'top-up', 'couple', 'salaried'],
	seed: 46,
	loanName: 'Home Loan',
	initialAnswers: { loanType: 'Balance Transfer With Top-up', tellUsWhoIsApplying: 'Couple' },
	steps: [
		page('caseIntake_homeLoan', { assessmentStatus: 'fresh' }),
		page('propertyLocation_homeLoan', {
			propertyIdentified: 'Yes',
			propertyAreaType: 'PLANNED_AUTHORITY',
			propertyStateName: 'Telangana',
			propertyCityName: 'Hyderabad',
			propertyUsageIntent: 'SELF_USE',
			isRegistryDone: 'Yes'
		}),
		page('propertyCharacter_homeLoan', {
			constructionType: 'Flat',
			carpetArea: 1000,
			PropertyStage: 'Ready To Move'
		}),
		page('complianceLegal_homeLoan', {
			propertyComplianceStatus: 'fully_compliant',
			ocCcAvailable: 'BOTH',
			documentationReadiness: ['SALE_DEED', 'OC', 'CC', 'EC'],
			nocFromPreviousLender: 'Yes'
		}),
		page('btExistingLoan_homeLoan', {
			selectSingleBank: 'SBI',
			sanctionAmount: 3500000,
			principalOutstanding: 3500000,
			existingInterestRate: 9.25,
			remainingTenure: 180,
			includedCurrentEMIsAmount: 36000,
			interestRateType: 'FLOATING',
			emiBounceHistory: '0'
		}),
		// topUpAmount and topUpTenure are the schema keys (not requiredTopupAmount/topupTerm).
		page('loanRequirements_homeLoan', {
			mortgageYear: '20',
			topUpAmount: 500000,
			topUpTenure: 15
		}),
		// residenceOptionSame: 'No' + residence state/city — populates residenceState/City
		// in the payload (builder lines 284-289).
		page('tellUs_homeLoan', {
			numberOfDirectorOrApplicant: 2,
			residenceOptionSame: 'No',
			residenceStateName: 'Telangana',
			residenceCityName: 'Hyderabad'
		}),
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Naveen Reddy',
			age: 36,
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
			grossIncome: 95000,
			netIncome: 75000,
			creditScore: 750,
			ObligationsRunning: 'No'
		}),
		// Co-applicant spouse. Index > 0 → roleInApplication taken from existingRoleOfPerson
		// (defaults 'Co-applicant'); relationship resolved from rawApplicant.relationship.
		addApplicant({
			applicantType: 'Individual',
			title: 'Mrs.',
			fullName: 'Priya Reddy',
			age: 33,
			gender: 'Female',
			maritalStatus: 'Married',
			employmentType: 'Salaried(Private)',
			TypeOfResidence: 'Rented',
			relationship: 'Spouse',
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
			grossIncome: 65000,
			netIncome: 50000,
			creditScore: 740,
			ObligationsRunning: 'No'
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// HL-TOPUP — Home Loan, Top-up Only, Salaried with existing obligation
// ─────────────────────────────────────────────────────────────────────────────
//
// Exercises: Top-up Only loan flow, applicant with an obligation entry.
// ObligationsRunning: 'Yes' triggers obligations: [...] in payload.
// No newTenure for Top-up Only (expectedSkipped in old scenario).

export const HL_TOPUP_JOURNEY: Journey = journey({
	id: 'HL-TOPUP',
	description: 'Home Loan Top-up Only — Salaried 70K, CIBIL 740, existing HL at ICICI',
	tags: ['home-loan', 'top-up', 'salaried', 'obligations'],
	seed: 47,
	loanName: 'Home Loan',
	initialAnswers: { loanType: 'Top-up Only' },
	steps: [
		page('caseIntake_homeLoan', { assessmentStatus: 'fresh' }),
		page('propertyLocation_homeLoan', {
			propertyIdentified: 'Yes',
			propertyAreaType: 'PLANNED_AUTHORITY',
			propertyStateName: 'West Bengal',
			propertyCityName: 'Kolkata',
			propertyUsageIntent: 'SELF_USE',
			isRegistryDone: 'Yes'
		}),
		page('propertyCharacter_homeLoan', {
			constructionType: 'Flat',
			carpetArea: 950,
			PropertyStage: 'Ready To Move'
		}),
		page('complianceLegal_homeLoan', {
			propertyComplianceStatus: 'fully_compliant',
			ocCcAvailable: 'BOTH',
			documentationReadiness: ['SALE_DEED', 'OC', 'CC', 'EC'],
			nocFromPreviousLender: 'Yes'
		}),
		page('btExistingLoan_homeLoan', {
			selectSingleBank: 'ICICI Bank',
			sanctionAmount: 800000,
			principalOutstanding: 2500000,
			existingInterestRate: 8.75,
			remainingTenure: 144,
			includedCurrentEMIsAmount: 28000,
			interestRateType: 'FLOATING',
			emiBounceHistory: '0'
		}),
		page('loanRequirements_homeLoan', {
			mortgageYear: '10',
			topUpAmount: 800000,
			topUpTenure: 10
		}),
		page('tellUs_homeLoan', {
			numberOfDirectorOrApplicant: 1,
			residenceOptionSame: 'Yes'
		}),
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Soumya Banerjee',
			age: 42,
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
			grossIncome: 90000,
			netIncome: 70000,
			creditScore: 740,
			ObligationsRunning: 'Yes',
			// cleanObligationEntries reads rawApplicant.obligations[] and writes payload.obligations.
			// The obligationType is derived from loanType (credit_line for CC/OD/DOD, else term_loan).
			obligations: [
				{
					// Deterministic id: cleanObligationEntries uses entry.id ?? generateId();
					// set explicitly so the snapshot is stable across test runs.
					id: 'obl-hl-topup-1',
					loanType: 'Home Loan',
					bankName: 'ICICI Bank',
					selectedToClose: 'Keep running',
					emi: '28000',
					tenure: '240',
					interestRate: '8.75',
					remainingTenure: '144'
				}
			]
		})
	]
});
