/**
 * applicationData keys that are EXCLUSIVE to each secured loan product.
 *
 * When mounting a secured loan route, clear the other two products' keys so
 * stale answers from a previous product don't survive as payload noise.
 *
 * These lists are derived from the bindsTo/bindsTo_template values in each
 * product's questionBank/ directory. Keys shared between two or more products
 * are intentionally excluded — they represent data the DSA may legitimately
 * reuse across secured-product switches (e.g. propCost, propertyStateName).
 *
 * Usage (each secured route onMount):
 *   import { LAP_ONLY_KEYS, PLOT_ONLY_KEYS } from '$lib/config/securedLoanKeys.js';
 *   formState.clearApplicationFields([...LAP_ONLY_KEYS, ...PLOT_ONLY_KEYS]);
 */

export const HOME_ONLY_KEYS = [
	'PropertyStage',
	'advanceInAgreement',
	'agreementPoaNbfcKnown',
	'agreementPoaNbfcName',
	'agreementPoaRegistryWilling',
	'allotmentDate',
	'allotmentLetterStatus',
	'auctionPropertyStatus',
	'authorityName',
	'authorityPaymentStatus',
	'btEmisPaid',
	'bt_outstandingDemandAmount',
	'bt_possessionAndDemandStatus',
	'builderName',
	'builderNameManual',
	'builderRole',
	'documentationReadiness',
	'emiBounceHistory',
	'encumbranceCertStatus',
	'expectedCompletionDate',
	'intendedCityDecided',
	'interestRateType',
	'isAnyBuilderDemand',
	'isPossessionOfferedByAuthority',
	'isRegistryDone',
	'lastRegistryDuration',
	'loanAccountNumber',
	'loanDisbursementDate',
	'marketValue',
	'mortgageYearCustom',
	'nocFromPreviousLender',
	'poaRegistrationStatus',
	'possessionCertificateStatus',
	'priorAssessmentHistory',
	'projectLenders',
	'projectNameManual',
	'projectNameSelected',
	'propertyIdentified',
	'propertyUsageIntent',
	'registryDateReason',
	'registryPlannedDate',
	'registryTimeline',
	'registryValue',
	'remainingTenure',
	'reraStatus',
	'revenueRecordMutation',
	'sanctionAmount',
	'sanctionType',
	'selectSingleBank',
	'sellerCurrentLender',
	'sellerOnLoan',
	'sellerOutstandingAmount',
	'sellerOwnershipType',
	'titleChainStatus',
	'topUpPurpose',
	'topUpTenure',
	'withPersonalLoan'
] as const;

export const LAP_ONLY_KEYS = [
	'RequiredLoanAmount',
	'applicantResidingInProperty',
	'approachRoadWidth',
	'categoryOfProperty',
	'cteCtoStatus',
	'dodMonthlyWithdrawal',
	'factoryPlanApproval',
	'fireNocStatus',
	'floodDisasterZone',
	'industrialLicenseStatus',
	'loanPurpose',
	'pendingSocietyDues',
	'propertyOccupancyStatus',
	'rentalAgreementType',
	'rentalIncome',
	'restrictedZone',
	'shopEstablishmentLicense',
	'societyStatus'
	// Removed (now shared via canonical btLoanDetailsQuestions.ts):
	//   - loanVintage, repaymentTrack: replaced by the shared loanDisbursementDate +
	//     btEmisPaid + emiBounceHistory questions (all 3 used to be LAP-only).
	//   - originalRemainingTenure: renamed to the canonical `remainingTenure`
	//     (Home Loan already used this key; the rename eliminates a 3-way drift).
] as const;

export const PLOT_ONLY_KEYS = [
	'ATSReady',
	'ATSvalue',
	'ConstructionArea',
	'PlotArea',
	'accessRoadStatus',
	'agreementSellValue',
	'boundaryDemarcation',
	'btConstructionStatus',
	// Removed (2026-05-26): bt-prefixed BT-page keys retired when Plot migrated
	// to the canonical btLoanDetailsQuestions bank.
	//   - btCurrentEmi → includedCurrentEMIsAmount (shared)
	//   - btExistingInterestRate → existingInterestRate (shared)
	//   - btInterestRateType → interestRateType (shared)
	//   - btRemainingTenure (string enum) → remainingTenure (numeric months, shared)
	'constructionApprovalStatus',
	'constructionIntent',
	'constructionTimeline',
	'constructorType',
	'creditHistoryStatus',
	'depositAsPerATS',
	'developmentAuthority',
	'developmentStatus',
	'differentATSandPV',
	'landUseClassification',
	'layoutApprovalStatus',
	'plotAge',
	'plotBoundaryStatus',
	'plotCurrentState',
	'plotLoanLender',
	'plotMortgageStatus',
	'requiredExtraAmount',
	'sellerForeclosureAmount',
	'sellerIsNRI',
	'sellerLenderNOC',
	'sellerLoanLender',
	'takeExtraLoanAmount'
] as const;
