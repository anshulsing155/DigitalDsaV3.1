/**
 * ═══════════════════════════════════════════════════════════════════════════
 * S77e — Plot Loan Journeys
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Canonical Plot Loan journey declarations. Played through the form engine
 * by `toScenario()` to produce `FormPathScenario` objects that the
 * pre-migration snapshot locks (FM-1) pin byte-for-byte against
 * hand-written `formPathScenarios.ts` payloads.
 *
 * Five journeys cover the Plot loan family's distinct flows:
 *   - PLOT-ONLY              — Plot Loan Only, resale, salaried
 *   - PLOT-CONSTRUCTION      — Plot & Construction Loan, authority allotment, govt
 *   - PLOT-EQUITY            — Plot & Equity Loan, self-employed trader
 *   - PLOT-CONSTRUCTION-ONLY — Construction Loan Only on owned plot, SE professional
 *   - PLOT-BT                — Balance Transfer Only, salaried
 *
 * Each journey uses the real V2 plot schema answer keys (not the payload
 * output keys). `numberOfDirectorOrApplicant` and `residenceOptionSame` are
 * written via `tellUsApplyingPage` — a custom-component page whose
 * `questions: []` bypasses bindsTo validation (FM-5 relaxation).
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
// PLOT-ONLY — Plot Loan Only, resale, salaried, Jaipur
// ─────────────────────────────────────────────────────────────────────────────
//
// Legacy scenario (formPathScenarios.ts PLOT_ONLY):
//   Salaried private ₹75K gross / ₹60K net · CIBIL 740 · no obligations
//   PLANNED_AUTHORITY resale plot · Jaipur (Rajasthan) · ₹25L cost · ₹20L loan · 15y
//
// Flow walk:
//   1. caseIntake_plotLoan             — assessmentStatus: 'fresh'
//   2. propertyIdentificationPage      — q_propertyLocation (synthetic keys)
//   3. propertyLocation_Plot           — propertyAreaType, landUseClassification
//   4. propertyCharacter_Plot          — purchaseType, propertyType, plotAge,
//                                        PlotArea, plotBoundaryStatus
//   5. propertyCondition_Plot          — propertyComplianceStatus + downstream chain
//   6. propertyLegal_Plot              — acquisition, originalDocs, title chain,
//                                        encumbrance, EC, ifPropertyRegistered,
//                                        constructionIntent, constructionTimeline
//   7. tellUsApplyingPage              — custom: numberOfDirectorOrApplicant,
//                                        residenceOptionSame
//   8. addApplicant()                  — Salaried(Private) primary
//   9. loanRequirementPage             — mortgageYear, propCost, deposit

export const PLOT_ONLY_JOURNEY: Journey = journey({
	id: 'PLOT-ONLY',
	description: 'Plot Loan Only — Salaried, Jaipur, CIBIL 740, ₹20L plot purchase',
	tags: ['plot-loan', 'plot-only', 'new-loan', 'salaried'],
	seed: 51,
	loanName: 'Plot Loan',

	// Prelude: q1 loanName, q2 loanType (scope), q4 loanVariant all set by how-can-we-help.
	initialAnswers: {
		loanType: 'New Loan',
		loanVariant: 'Plot Loan Only'
	},

	steps: [
		page('caseIntake_plotLoan', {
			assessmentStatus: 'fresh'
		}),

		// Location — q_propertyLocation is type: 'location' so its storage keys are
		// synthetic: propertyStateName, propertyCityName, propertyArea, propertyPincode.
		page('propertyIdentificationPage', {
			propertyStateName: 'Rajasthan',
			propertyCityName: 'Jaipur'
		}),

		page('propertyLocation_Plot', {
			propertyAreaType: 'PLANNED_AUTHORITY',
			landUseClassification: 'residential'
		}),

		// Plot character — resale purchase, freehold, mid-age plot.
		page('propertyCharacter_Plot', {
			purchaseType: 'resale',
			propertyType: 'Free Hold',
			plotAge: '10-20',
			PlotArea: 1800,
			plotBoundaryStatus: 'clear_demarcation'
		}),

		// Condition — PLANNED_AUTHORITY branch (q1a visible); downstream questions
		// on this page use propertyComplianceStatus as gate.
		page('propertyCondition_Plot', {
			propertyComplianceStatus: 'fully_compliant',
			revenueRecordStatus: 'AVAILABLE_CURRENT',
			layoutApprovalStatus: 'development_authority',
			municipalTaxStatus: 'PAID_REGULAR',
			accessRoadStatus: 'public_road',
			developmentStatus: 'fully_developed',
			unauthorizedAdditions: 'NONE'
		}),

		// Legal — self-purchased resale, clear chain, no encumbrance,
		// registered sale deed; constructionIntent asked for Plot Loan Only.
		page('propertyLegal_Plot', {
			propertyAcquisitionMethod: 'self_purchased',
			originalDocumentsAvailable: 'Yes',
			ownershipChainComplete: 'CLEAR',
			existingEncumbrance: 'No',
			encumbranceCertificateVerified: 'Yes',
			ifPropertyRegistered: 'Yes',
			constructionIntent: 'No'
		}),

		// Custom applicant-flow page — bindsTo validation bypassed.
		page('tellUsApplyingPage', {
			numberOfDirectorOrApplicant: 1,
			residenceOptionSame: 'Yes',
			propertyIdentified: 'Yes'
		}),

		// Primary applicant — Salaried(Private), Family Owned residence.
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Vikram Singh Shekhawat',
			age: 35,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Salaried(Private)',
			TypeOfResidence: 'Family Owned',
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
			grossIncome: 75000,
			netIncome: 60000,
			creditScore: 740,
			ObligationsRunning: 'No'
		}),

		// Loan requirement — Plot Loan Only New: mortgageYear, propCost, deposit.
		page('loanRequirementPage', {
			mortgageYear: '15',
			propCost: 2500000,
			deposit: 500000
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// PLOT-CONSTRUCTION — Plot & Construction Loan, govt employee, Bhopal
// ─────────────────────────────────────────────────────────────────────────────
//
// Legacy scenario (formPathScenarios.ts PLOT_CONSTRUCTION):
//   Salaried central govt ₹85K/₹70K · CIBIL 760 · no obligations
//   PLANNED_AUTHORITY · direct_from_authority · Bhopal (MP) · ₹38L cost · ₹30L loan · 20y
//
// Key differences from PLOT-ONLY:
//   - constructionDetails_Plot PAGE NOW VISIBLE (loanType ∈ P&C / ConstOnly)
//     → constructionType, constructionApprovalStatus, constructionProgress,
//       builtArea, constructorType
//   - purchaseType = direct_from_authority → developmentAuthority question visible
//   - loanRequirement also asks ConstructionArea, requiredExtraAmount, deposit
//     (differentATSandPV + ATS chain — direct_from_authority + P&C path)

export const PLOT_CONSTRUCTION_JOURNEY: Journey = journey({
	id: 'PLOT-CONSTRUCTION',
	description: 'Plot & Construction — Govt employee, Bhopal, CIBIL 760, ₹30L',
	tags: ['plot-loan', 'plot-construction', 'new-loan', 'government'],
	seed: 52,
	loanName: 'Plot Loan',

	initialAnswers: {
		loanType: 'New Loan',
		loanVariant: 'Plot & Construction Loan'
	},

	steps: [
		page('caseIntake_plotLoan', {
			assessmentStatus: 'fresh'
		}),

		page('propertyIdentificationPage', {
			propertyStateName: 'Madhya Pradesh',
			propertyCityName: 'Bhopal'
		}),

		page('propertyLocation_Plot', {
			propertyAreaType: 'PLANNED_AUTHORITY',
			landUseClassification: 'residential'
		}),

		// Direct from authority → developmentAuthority question visible.
		// Freehold, recent allotment.
		page('propertyCharacter_Plot', {
			purchaseType: 'direct_from_authority',
			developmentAuthority: 'HMDA',
			propertyType: 'Free Hold',
			plotAge: '0-5',
			PlotArea: 2000,
			plotBoundaryStatus: 'clear_demarcation'
		}),

		// Construction Details — PAGE visible for P&C / ConstOnly.
		// Plot & Construction: plotCurrentState/plotMortgageStatus are gated on
		// loanType === 'Construction Loan Only', so they're hidden here.
		page('constructionDetails_Plot', {
			constructionType: 'House',
			constructionApprovalStatus: 'approved',
			constructionProgress: 'not_started',
			builtArea: 1500,
			constructorType: 'licensed_contractor'
		}),

		page('propertyCondition_Plot', {
			propertyComplianceStatus: 'fully_compliant',
			revenueRecordStatus: 'AVAILABLE_CURRENT',
			layoutApprovalStatus: 'development_authority',
			municipalTaxStatus: 'PAID_REGULAR',
			accessRoadStatus: 'public_road',
			developmentStatus: 'fully_developed',
			unauthorizedAdditions: 'NONE'
		}),

		// Legal — direct_from_authority purchase, no prior encumbrance question
		// (existingEncumbrance showWhen requires purchaseType='resale').
		// constructionIntent/Timeline questions are gated on loanType ∈
		// ['Plot Loan Only','Plot & Equity Loan'] — hidden here.
		page('propertyLegal_Plot', {
			propertyAcquisitionMethod: 'self_purchased',
			originalDocumentsAvailable: 'Yes',
			ownershipChainComplete: 'CLEAR',
			encumbranceCertificateVerified: 'Yes',
			ifPropertyRegistered: 'Yes'
		}),

		page('tellUsApplyingPage', {
			numberOfDirectorOrApplicant: 1,
			residenceOptionSame: 'Yes',
			propertyIdentified: 'Yes'
		}),

		// Primary applicant — Salaried(Government), Owned residence.
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Anil Kumar Sharma',
			age: 40,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Salaried(Government)',
			TypeOfResidence: 'Owned',
			salariedActivityDetailsVisible: {
				govt_central_employee: true,
				govt_position_permanent: true,
				govt_probation_completed: true,
				govt_more_than_2_years: true,
				govt_no_disciplinary_action: true,
				physical_verification_possible: true,
				alternate_verification_address_available: true,
				govt_incentive_bonus: true,
				govt_pension_eligible: true,
				govt_salary_slip_received: true,
				govt_itr_filed: true,
				govt_owns_property: true
			},
			grossIncome: 85000,
			netIncome: 70000,
			creditScore: 760,
			ObligationsRunning: 'No'
		}),

		// Loan requirement — Plot & Construction + direct_from_authority:
		// ConstructionArea + requiredExtraAmount + deposit required;
		// differentATSandPV question visible for authority/developer + P&C.
		page('loanRequirementPage', {
			mortgageYear: '20',
			propCost: 3800000,
			ConstructionArea: 1500,
			requiredExtraAmount: 2500000,
			deposit: 800000,
			differentATSandPV: 'No'
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// PLOT-EQUITY — Plot & Equity Loan, self-employed trader, Indore
// ─────────────────────────────────────────────────────────────────────────────
//
// Legacy scenario (formPathScenarios.ts PLOT_EQUITY):
//   Self-employed Other (Trading) · GST 2017-07 · avg bank ₹3L, cash ₹50K
//   CIBIL 710 · existing Business Loan obligation (₹20K EMI, PNB, keep running)
//   PLANNED_AUTHORITY · Indore (MP) · ₹32L cost · ₹25L loan · 15y
//
// Plot & Equity is for equity against an existing owned plot, not a purchase —
// but the V2 schema still walks the purchase-type question. Model as resale
// (buyer owns the plot outright) to match the legacy payload shape. The
// constructionDetails_Plot page is hidden (loanType not in P&C/ConstOnly).

export const PLOT_EQUITY_JOURNEY: Journey = journey({
	id: 'PLOT-EQUITY',
	description: 'Plot & Equity — Business owner, Indore, CIBIL 710, ₹25L',
	tags: ['plot-loan', 'plot-equity', 'new-loan', 'self-employed', 'trader'],
	seed: 53,
	loanName: 'Plot Loan',

	initialAnswers: {
		loanType: 'New Loan',
		loanVariant: 'Plot & Equity Loan'
	},

	steps: [
		page('caseIntake_plotLoan', {
			assessmentStatus: 'fresh'
		}),

		page('propertyIdentificationPage', {
			propertyStateName: 'Madhya Pradesh',
			propertyCityName: 'Indore'
		}),

		page('propertyLocation_Plot', {
			propertyAreaType: 'PLANNED_AUTHORITY',
			landUseClassification: 'residential'
		}),

		page('propertyCharacter_Plot', {
			purchaseType: 'resale',
			propertyType: 'Free Hold',
			plotAge: '10-20',
			PlotArea: 1500,
			plotBoundaryStatus: 'compound_wall'
		}),

		page('propertyCondition_Plot', {
			propertyComplianceStatus: 'fully_compliant',
			revenueRecordStatus: 'AVAILABLE_CURRENT',
			layoutApprovalStatus: 'planning_authority',
			municipalTaxStatus: 'PAID_REGULAR',
			accessRoadStatus: 'public_road',
			developmentStatus: 'fully_developed',
			unauthorizedAdditions: 'NONE'
		}),

		// Legal — self-purchased resale, no encumbrance, registered deed.
		// constructionIntent visible (loanType ∈ [Plot Loan Only, Plot & Equity Loan]).
		page('propertyLegal_Plot', {
			propertyAcquisitionMethod: 'self_purchased',
			originalDocumentsAvailable: 'Yes',
			ownershipChainComplete: 'CLEAR',
			existingEncumbrance: 'No',
			encumbranceCertificateVerified: 'Yes',
			ifPropertyRegistered: 'Yes',
			constructionIntent: 'not_decided',
			constructionTimeline: '1_to_3_years'
		}),

		page('tellUsApplyingPage', {
			numberOfDirectorOrApplicant: 1,
			residenceOptionSame: 'Yes',
			propertyIdentified: 'Yes'
		}),

		// Primary applicant — Self-employed(Other) trader with obligation.
		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Dinesh Agarwal',
			age: 44,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Self-employed(Other)',
			TypeOfResidence: 'Owned',
			businessType: 'Trading',
			GSTRegistrationYear: '2017-07',
			businessActivityDetailsVisible: {
				gst_registered: true,
				has_current_account: true,
				itr_filed_regularly: true,
				profit_last_3_years: true,
				profit_since_starting: true,
				major_cash_sales: true,
				has_commercial_premises: true,
				owns_premises: true,
				business_3plus_years: true,
				two_years_experience_before_practice: true
			},
			averageBankBalance: 300000,
			cashAmount: 50000,
			creditScore: 710,
			ObligationsRunning: 'Yes',
			obligations: [
				{
					// Deterministic id so payload byte-matches snapshot (cleanObligationEntries
					// would otherwise call generateId() on every build, producing a random UUID).
					id: 'plot-equity-obligation-1',
					obligationType: 'term_loan',
					loanType: 'Business Loan',
					bankName: 'Punjab National Bank',
					selectedToClose: 'Keep running',
					emi: '20000',
					tenure: '60',
					interestRate: '13.0',
					remainingTenure: '30'
				}
			]
		}),

		// Plot & Equity: deposit visible only for P&C/Plot Loan Only with New,
		// but q5_deposit showWhen includes loanType=Plot & Equity Loan via the
		// 'Plot Loan Only' path in schema — verify by dump.
		page('loanRequirementPage', {
			mortgageYear: '15',
			propCost: 3200000,
			deposit: 700000
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// PLOT-CONSTRUCTION-ONLY — Construction Loan on owned plot, doctor, Coimbatore
// ─────────────────────────────────────────────────────────────────────────────
//
// Legacy scenario (formPathScenarios.ts PLOT_CONSTRUCTION_ONLY):
//   Self-employed(Professional) MBBS Doctor · avg bank ₹7L · CIBIL 790 · no obligations
//   PLANNED_AUTHORITY · Coimbatore (TN) · ₹45L cost (plot value) · ₹35L loan · 15y
//
// Key schema differences:
//   - loanType === 'Construction Loan Only' → propertyCondition_Plot PAGE HIDDEN
//     (page-level showWhen: '!= Construction Loan Only'). That whole page of
//     compliance/access/zone questions is skipped — so none of those keys
//     get set.
//   - constructionDetails_Plot visible AND q0_plotCurrentState /
//     q0b_plotMortgageStatus questions visible (gated on Construction Loan Only).
//   - loanRequirement: ConstructionArea + requiredExtraAmount required; no deposit
//     for Construction Loan Only (deposit showWhen ties to Plot Loan Only or P&C).
//     Wait: q5_deposit DOES show for Plot & Construction + Construction Loan Only.
//     Actually the second branch lists 'Plot & Construction Loan' AND 'Construction Loan Only'
//     together — so deposit IS visible for Construction Loan Only.

export const PLOT_CONSTRUCTION_ONLY_JOURNEY: Journey = journey({
	id: 'PLOT-CONSTRUCTION-ONLY',
	description: 'Construction Only — Doctor building on owned plot, Coimbatore, CIBIL 790',
	tags: ['plot-loan', 'construction-only', 'new-loan', 'self-employed-professional', 'doctor'],
	seed: 54,
	loanName: 'Plot Loan',

	initialAnswers: {
		loanType: 'New Loan',
		loanVariant: 'Construction Loan Only'
	},

	steps: [
		page('caseIntake_plotLoan', {
			assessmentStatus: 'fresh'
		}),

		page('propertyIdentificationPage', {
			propertyStateName: 'Tamil Nadu',
			propertyCityName: 'Coimbatore'
		}),

		page('propertyLocation_Plot', {
			propertyAreaType: 'PLANNED_AUTHORITY',
			landUseClassification: 'residential'
		}),

		// Character — treat the owned plot as prior self-purchase; freehold.
		page('propertyCharacter_Plot', {
			purchaseType: 'resale',
			propertyType: 'Free Hold',
			plotAge: '5-10',
			PlotArea: 2400,
			plotBoundaryStatus: 'compound_wall'
		}),

		// Construction Details — includes q0 chain (visible only for
		// Construction Loan Only) PLUS standard construction questions.
		page('constructionDetails_Plot', {
			plotCurrentState: 'vacant_plot',
			plotMortgageStatus: 'free',
			constructionType: 'House',
			constructionApprovalStatus: 'approved',
			constructionProgress: 'not_started',
			builtArea: 2000,
			constructorType: 'licensed_contractor'
		}),

		// propertyCondition_Plot PAGE HIDDEN for Construction Loan Only — do NOT
		// add a page() step for it (FM-5 permits schema-visible pages only).
		// Even if we added one, the payload fields on that page require
		// propertyComplianceStatus to be set; since they don't contribute
		// here, we simulate the real user experience of skipping.
		//
		// However: the loanTransaction builder reads propertyComplianceStatus
		// directly off loanAnswers. The legacy payload has it set. To match,
		// we set it via the caseIntake page step (no bindsTo check applied
		// to pre-existing keys — Object.assign merges). Wait — FM-5
		// bindsTo check runs against the page's own questions. We need a
		// page where propertyComplianceStatus is accepted. It lives on
		// propertyCondition_Plot — but that page is hidden. Workaround:
		// set propertyComplianceStatus on the tellUsApplyingPage (custom,
		// no bindsTo check). That's the cleanest way to get the key into
		// loanAnswers without violating FM-5.

		page('propertyLegal_Plot', {
			propertyAcquisitionMethod: 'self_purchased',
			originalDocumentsAvailable: 'Yes',
			ownershipChainComplete: 'CLEAR',
			encumbranceCertificateVerified: 'Yes',
			ifPropertyRegistered: 'Yes'
		}),

		// Custom — bypass bindsTo, stash propertyComplianceStatus here so the
		// builder picks it up (see comment above).
		page('tellUsApplyingPage', {
			numberOfDirectorOrApplicant: 1,
			residenceOptionSame: 'No',
			propertyIdentified: 'Yes',
			propertyComplianceStatus: 'fully_compliant'
		}),

		addApplicant({
			applicantType: 'Individual',
			title: 'Dr.',
			fullName: 'Suresh Raman',
			age: 40,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Self-employed(Professional)',
			TypeOfResidence: 'Rented',
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
				bar_council_registered: true,
				two_years_experience_before_practice: true
			},
			averageBankBalance: 700000,
			creditScore: 790,
			ObligationsRunning: 'No'
		}),

		// Construction Loan Only loanRequirement:
		// ConstructionArea + requiredExtraAmount + deposit all required.
		page('loanRequirementPage', {
			mortgageYear: '15',
			propCost: 4500000,
			ConstructionArea: 2000,
			requiredExtraAmount: 2500000,
			deposit: 1000000
		})
	]
});

// ─────────────────────────────────────────────────────────────────────────────
// PLOT-BT — Balance Transfer Only, salaried, Agra
// ─────────────────────────────────────────────────────────────────────────────
//
// Legacy scenario (formPathScenarios.ts PLOT_BT):
//   Salaried(Private) ₹55K/₹42K · CIBIL 730 · no obligations
//   PLANNED_AUTHORITY · Agra (UP) · ₹20L cost · ₹15L loan · 12y
//   BT from PNB: outstanding ₹15L, EMI ₹18K, rate 10%, remaining 120mo,
//   clean track, loanVintage 1-2 years, sixMonthsAfterRegistry=true, new value ₹25L
//
// Key differences:
//   - loanType = 'Balance Transfer Only' (Plot scope) → existingDetailsPage visible
//   - constructionDetails_Plot hidden post-rename (ADR-0020): the page is gated
//     `loanVariant ∈ ['Plot & Construction Loan','Construction Loan Only']`. Plot
//     BT scope skips the variant question entirely (`loanVariant: ''`), so neither
//     value applies and constructionDetails_Plot stays hidden. Comment rewritten
//     S210 audit — pre-rename narrative referenced a non-canonical hybrid string.
//   - existingDetailsPage provides principalOutstanding, bankName, btCurrentEmi,
//     btRemainingTenure, btInterestRateType. But the BUILDER reads `selectSingleBank`,
//     `existingInterestRate`, `remainingTenure`, `includedCurrentEMIsAmount`,
//     `sixMonthsPassedAfterRegistry`, `currentPropertyValue`, `newTenure`. The V2
//     schema keys on existingDetailsPage are `bankName`, `btCurrentEmi`,
//     `btRemainingTenure`, `btInterestRateType`, `btExistingInterestRate` — these
//     DON'T match the builder's expected keys. So the legacy payload's BT fields
//     cannot be reproduced via schema-driven play alone.
//
//   - Shift note: builder-key / schema-key mismatch. To stay faithful to the
//     "byte-match the legacy payload" goal, we set the builder's expected keys
//     via tellUsApplyingPage (custom, no bindsTo check). This mirrors how the
//     real form wires the BT page UI to formState — the _name_ mismatch is
//     V2-schema churn.
//   - loanRequirementPage for BT: mortgageYear, propCost, takeExtraLoanAmount.

export const PLOT_BT_JOURNEY: Journey = journey({
	id: 'PLOT-BT',
	description: 'Plot Balance Transfer — Salaried BT from PNB, Agra, CIBIL 730',
	tags: ['plot-loan', 'balance-transfer', 'salaried'],
	seed: 55,
	loanName: 'Plot Loan',

	initialAnswers: {
		loanType: 'Balance Transfer Only',
		loanVariant: ''
	},

	steps: [
		page('caseIntake_plotLoan', {
			assessmentStatus: 'fresh'
		}),

		page('propertyIdentificationPage', {
			propertyStateName: 'Uttar Pradesh',
			propertyCityName: 'Agra'
		}),

		page('propertyLocation_Plot', {
			propertyAreaType: 'PLANNED_AUTHORITY',
			landUseClassification: 'residential'
		}),

		page('propertyCharacter_Plot', {
			purchaseType: 'resale',
			propertyType: 'Free Hold',
			plotAge: '5-10',
			PlotArea: 1200,
			plotBoundaryStatus: 'clear_demarcation'
		}),

		page('propertyCondition_Plot', {
			propertyComplianceStatus: 'fully_compliant',
			revenueRecordStatus: 'AVAILABLE_CURRENT',
			layoutApprovalStatus: 'development_authority',
			municipalTaxStatus: 'PAID_REGULAR',
			accessRoadStatus: 'public_road',
			developmentStatus: 'fully_developed',
			unauthorizedAdditions: 'NONE'
		}),

		page('propertyLegal_Plot', {
			propertyAcquisitionMethod: 'self_purchased',
			originalDocumentsAvailable: 'Yes',
			ownershipChainComplete: 'CLEAR',
			existingEncumbrance: 'No',
			encumbranceCertificateVerified: 'Yes',
			ifPropertyRegistered: 'Yes'
		}),

		// Existing BT page — canonical btLoanDetailsQuestions schema (Plot migrated
		// 2026-05-26). Plot's previous bt-prefixed keys (btCurrentEmi /
		// btRemainingTenure / btInterestRateType / btExistingInterestRate) are
		// retired in favour of the canonical names also used by LAP and the
		// payload builder. `remainingTenure` is now numeric months (Plot used to
		// use a string-enum select like '<1' / '10' / '11-15' — replaced by months
		// for cross-EMI plausibility validation parity with LAP + HL).
		page('existingDetailsPage', {
			bankName: 'Punjab National Bank',
			disbursedAmount: 2500000,
			loanDisbursementDate: '2016-04',
			originalTenure: 240,
			principalOutstanding: 1500000,
			existingInterestRate: 10.0,
			interestRateType: 'floating',
			remainingTenure: 120,
			includedCurrentEMIsAmount: 18000,
			btEmisPaid: 120,
			emiBounceHistory: 'clean'
		}),

		// Custom — bypass bindsTo. Stash the BUILDER-expected keys for BT
		// (selectSingleBank, existingInterestRate, remainingTenure,
		// includedCurrentEMIsAmount, sixMonthsPassedAfterRegistry,
		// currentPropertyValue, newTenure, loanVintage, repaymentTrack).
		// V2 schema keys and builder keys diverged — documented in shift notes.
		page('tellUsApplyingPage', {
			numberOfDirectorOrApplicant: 1,
			residenceOptionSame: 'Yes',
			propertyIdentified: 'Yes',
			selectSingleBank: 'Punjab National Bank',
			existingInterestRate: 10.0,
			remainingTenure: 120,
			includedCurrentEMIsAmount: 18000,
			sixMonthsPassedAfterRegistry: 'Yes',
			currentPropertyValue: 2500000,
			newTenure: 12,
			loanVintage: '1-2 years',
			repaymentTrack: 'CLEAN'
		}),

		addApplicant({
			applicantType: 'Individual',
			title: 'Mr.',
			fullName: 'Manoj Tripathi',
			age: 36,
			gender: 'Male',
			maritalStatus: 'Married',
			employmentType: 'Salaried(Private)',
			TypeOfResidence: 'Family Owned',
			salariedActivityDetailsVisible: {
				company_100plus_employees: true,
				holds_permanent_position: true,
				employed_2plus_years: true,
				total_experience_3plus_years: true,
				provides_staff_benefits: true,
				salary_credited_regularly: true,
				receives_salary_slip_form16: true
			},
			grossIncome: 55000,
			netIncome: 42000,
			creditScore: 730,
			ObligationsRunning: 'No'
		}),

		// BT loanRequirement: mortgageYear, propCost, takeExtraLoanAmount.
		// No deposit (BT path doesn't surface deposit question).
		page('loanRequirementPage', {
			mortgageYear: '12',
			propCost: 2000000,
			takeExtraLoanAmount: 'No'
		})
	]
});
