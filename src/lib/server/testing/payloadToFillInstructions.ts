/**
 * Payload-to-Fill-Instructions Converter
 * ══════════════════════════════════════════════════════════════════
 * Converts a LoanApplicationPayload (used by both fixtures and
 * synthetics) into page-ordered fill instructions for Playwright
 * E2E form filling.
 *
 * Two-step process:
 *   1. payloadToFormAnswers() — flatten structured payload to bindsTo keys
 *   2. generateFillConfig()   — match flat keys to reverse schema map
 * ══════════════════════════════════════════════════════════════════
 */

import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder.js';
import {
	buildReverseMap,
	type ReverseMap,
	type ReverseMapEntry
} from '$lib/server/formEngine/reverseSchemaMap.js';

// ============================================================================
// Types
// ============================================================================

export interface FillInstruction {
	questionId: string;
	type: 'radio' | 'text' | 'select' | 'number' | 'date' | 'currency' | 'multiple-select';
	value: string | number | string[];
}

export interface PageFillConfig {
	pageId: string;
	pageIndex: number;
	fills: FillInstruction[];
}

export type CustomPageStrategy =
	| 'applicant-add'
	| 'applicant-profile'
	| 'income-profiles'
	| 'income-details'
	| 'credit-score'
	| 'obligations';

export interface CustomPageFill {
	pageId: string;
	strategy: CustomPageStrategy;
	data: Record<string, unknown>;
}

export interface E2eFillConfig {
	/** Loan-product name ("Home Loan", "LAP", "Plot Loan", etc.) — canonical `loanName`. */
	loanName: string;
	/** Scope-axis value ("New Loan", "Balance Transfer Only", etc.) — canonical `loanType`. */
	loanType?: string;
	pages: PageFillConfig[];
	customPages: CustomPageFill[];
	unmappedKeys: string[];
}

// ============================================================================
// Step 1: LoanApplicationPayload -> flat form answer keys
// ============================================================================

/**
 * Convert a boolean to the Yes/No string used by form radio buttons.
 */
function boolToYesNo(val: unknown): string | undefined {
	if (val === true) return 'Yes';
	if (val === false) return 'No';
	return undefined;
}

/**
 * Flatten a LoanApplicationPayload into a Record of bindsTo keys -> form values.
 * This is the reverse of buildLoanPayload() / buildLoanTransactionPayload() / buildApplicantPayload().
 */
export function payloadToFormAnswers(payload: LoanApplicationPayload): Record<string, unknown> {
	const answers: Record<string, unknown> = {};
	const lt = payload.loanTransaction;
	const primary = payload.allApplicantDetails?.[0];

	// ── Loan transaction fields ─────────────────────────────────

	// Case intake (shared page 0 — all loan types)
	// assessmentStatus is REQUIRED on page 0; default to 'fresh' when missing
	answers['assessmentStatus'] = lt.assessmentStatus || 'fresh';
	if (lt.assessmentLenders) answers['assessmentLenders'] = lt.assessmentLenders;
	if (lt.rejectionReasons) answers['rejectionReasons'] = lt.rejectionReasons;
	if (lt.sanctionNotDisbursedReasons)
		answers['sanctionNotDisbursedReasons'] = lt.sanctionNotDisbursedReasons;

	// Loan identification
	if (lt.loanName) answers['loanName'] = lt.loanName;
	if (lt.loanType) answers['loanType'] = lt.loanType;
	if (lt.numberOfApplicants) answers['numberOfDirectorOrApplicant'] = String(lt.numberOfApplicants);

	// Property boolean flags (reverse of toBoolean)
	if (lt.propertyIdentified !== undefined)
		answers['propertyIdentified'] = boolToYesNo(lt.propertyIdentified);
	if (lt.propertyComplianceStatus)
		answers['propertyComplianceStatus'] = lt.propertyComplianceStatus;
	if (lt.propertyRegistered !== undefined)
		answers['ifPropertyRegistered'] = boolToYesNo(lt.propertyRegistered);

	// Property location
	if (lt.propertyState) answers['propertyStateName'] = lt.propertyState;
	if (lt.propertyCity) answers['propertyCityName'] = lt.propertyCity;
	if (lt.propertyPincode) answers['propertyPincode'] = lt.propertyPincode;

	// Property details
	if (lt.propertyType) answers['propertyType'] = lt.propertyType;
	if (lt.purchaseType) answers['purchaseType'] = lt.purchaseType;
	if (lt.constructionStatus) answers['constructionType'] = lt.constructionStatus;
	if (lt.propertyStage) answers['PropertyStage'] = lt.propertyStage;

	// Financial amounts — schemas use different bindsTo keys for HL vs LAP/Plot
	if (lt.propertyCost) {
		answers['propertyCost'] = String(lt.propertyCost); // LAP/Plot schemas
		answers['propCost'] = String(lt.propertyCost); // HL dealFinancials bindsTo
	}
	if (lt.atsValue) answers['propertyValueAsPerATS'] = String(lt.atsValue);
	if (lt.downPayment) {
		answers['downPayment'] = String(lt.downPayment); // LAP/Plot schemas
		answers['deposit'] = String(lt.downPayment); // HL dealFinancials bindsTo
	}
	// Loan amount: schemas use different keys (RequiredLoanAmount, loanAmount, sanctionAmount)
	// Set all three so the reverse mapper can match whichever the schema uses
	if (lt.loanAmount) {
		answers['RequiredLoanAmount'] = String(lt.loanAmount);
		answers['loanAmount'] = String(lt.loanAmount);
	}
	// sanctionAmount is separate for BT (original sanction, not current loan request)
	if (lt.sanctionAmount) answers['sanctionAmount'] = String(lt.sanctionAmount);
	else if (lt.loanAmount) answers['sanctionAmount'] = String(lt.loanAmount);
	if (lt.tenureYears) answers['mortgageYear'] = String(lt.tenureYears);

	// HL Redesign: Three-Cost Model
	if (lt.marketValue) answers['marketValue'] = String(lt.marketValue);
	if (lt.registryValue) answers['registryValue'] = String(lt.registryValue);
	if (lt.advanceInAgreement) answers['advanceInAgreement'] = String(lt.advanceInAgreement);

	// HL Redesign: New Signals
	if (lt.priorAssessmentHistory) answers['priorAssessmentHistory'] = lt.priorAssessmentHistory;
	if (lt.auctionPropertyStatus) answers['auctionPropertyStatus'] = lt.auctionPropertyStatus;
	if (lt.registryTimeline) answers['registryTimeline'] = lt.registryTimeline;
	if (lt.propertyUsageIntent) answers['propertyUsageIntent'] = lt.propertyUsageIntent;

	// Residence
	if (lt.residenceSameAsProperty !== undefined)
		answers['residenceOptionSame'] = boolToYesNo(lt.residenceSameAsProperty);
	if (lt.applicantResidingInProperty !== undefined)
		answers['applicantResidingInProperty'] = boolToYesNo(lt.applicantResidingInProperty);
	if (lt.propertyOccupancyStatus) answers['propertyOccupancyStatus'] = lt.propertyOccupancyStatus;
	if (lt.residenceState) answers['residenceStateName'] = lt.residenceState;
	if (lt.residenceCity) answers['residenceCityName'] = lt.residenceCity;

	// LAP-specific
	if (lt.carpetAreaRaw) answers['carpetArea'] = String(lt.carpetAreaRaw);
	if (lt.carpetAreaUnit) answers['carpetAreaUnit'] = lt.carpetAreaUnit;
	if (lt.propertyAreaType) answers['propertyAreaType'] = lt.propertyAreaType;
	if (lt.societyStatus) answers['societyStatus'] = lt.societyStatus;
	if (lt.pendingSocietyDues) answers['pendingSocietyDues'] = lt.pendingSocietyDues;
	if (lt.approachRoadWidth) answers['approachRoadWidth'] = lt.approachRoadWidth;
	if (lt.restrictedZone) answers['restrictedZone'] = lt.restrictedZone;
	if (lt.floodDisasterZone) answers['floodDisasterZone'] = lt.floodDisasterZone;
	if (lt.leaseRemainingPeriod) answers['leaseRemainingPeriod'] = lt.leaseRemainingPeriod;
	if (lt.existingEncumbrance) answers['existingEncumbrance'] = lt.existingEncumbrance;
	if (lt.ocCcAvailable) answers['ocCcAvailable'] = lt.ocCcAvailable;
	if (lt.municipalApproval) answers['municipalApproval'] = lt.municipalApproval;
	if (lt.rentalIncome) answers['rentalIncome'] = String(lt.rentalIncome);
	if (lt.loanPurpose) answers['loanPurpose'] = lt.loanPurpose;

	// LAP legal details
	if (lt.originalDocumentsAvailable)
		answers['originalDocumentsAvailable'] = lt.originalDocumentsAvailable;
	if (lt.ownershipChainComplete) answers['ownershipChainComplete'] = lt.ownershipChainComplete;
	if (lt.noLegalDispute) answers['noLegalDispute'] = lt.noLegalDispute;
	if (lt.encumbranceCertificateVerified)
		answers['encumbranceCertificateVerified'] = lt.encumbranceCertificateVerified;
	if (lt.rentalAgreementType) answers['rentalAgreementType'] = lt.rentalAgreementType;
	if (lt.propertyAcquisitionMethod)
		answers['propertyAcquisitionMethod'] = lt.propertyAcquisitionMethod;
	if (lt.sellerOwnershipType) answers['sellerOwnershipType'] = lt.sellerOwnershipType;

	// Balance Transfer
	if (lt.currentBank) answers['selectSingleBank'] = lt.currentBank;
	if (lt.principalOutstanding) answers['principalOutstanding'] = String(lt.principalOutstanding);
	if (lt.currentInterestRate) answers['existingInterestRate'] = String(lt.currentInterestRate);
	if (lt.remainingTenure) answers['remainingTenure'] = String(lt.remainingTenure);
	if (lt.currentEMI) answers['includedCurrentEMIsAmount'] = String(lt.currentEMI);
	if (lt.sixMonthsAfterRegistry !== undefined)
		answers['sixMonthsPassedAfterRegistry'] = boolToYesNo(lt.sixMonthsAfterRegistry);
	if (lt.currentPropertyValue) answers['currentPropertyValue'] = String(lt.currentPropertyValue);
	if (lt.newTenure) answers['newTenure'] = String(lt.newTenure);

	// BT track record
	if (lt.loanVintage) answers['loanVintage'] = lt.loanVintage;
	if (lt.repaymentTrack) answers['repaymentTrack'] = lt.repaymentTrack;

	// BT existing loan details
	if (lt.interestRateType) answers['interestRateType'] = lt.interestRateType;
	if (lt.emiBounceHistory) answers['emiBounceHistory'] = lt.emiBounceHistory;
	if (lt.loanDisbursementDate) answers['loanDisbursementDate'] = lt.loanDisbursementDate;
	if (lt.btEmisPaid) answers['btEmisPaid'] = String(lt.btEmisPaid);
	if (lt.loanAccountNumber) answers['loanAccountNumber'] = lt.loanAccountNumber;

	// Top-up
	if (lt.topUpAmount) answers['requiredTopupAmount'] = String(lt.topUpAmount);
	if (lt.topUpTenure) answers['topupTerm'] = String(lt.topUpTenure);
	if (lt.topUpPurpose) answers['topUpPurpose'] = lt.topUpPurpose;

	// DOD
	if (lt.dodMonthlyWithdrawal) answers['dodMonthlyWithdrawal'] = String(lt.dodMonthlyWithdrawal);

	// Area-specific property compliance & legal
	if (lt.reraRegistrationStatus) answers['reraRegistrationStatus'] = lt.reraRegistrationStatus;
	if (lt.naConversionStatus) answers['naConversionStatus'] = lt.naConversionStatus;
	if (lt.zoneClassification) answers['zoneClassification'] = lt.zoneClassification;
	if (lt.municipalTaxStatus) answers['municipalTaxStatus'] = lt.municipalTaxStatus;
	if (lt.unauthorizedAdditions) answers['unauthorizedAdditions'] = lt.unauthorizedAdditions;
	if (lt.revenueRecordStatus) answers['revenueRecordStatus'] = lt.revenueRecordStatus;
	if (lt.colonyRegularizationStatus)
		answers['colonyRegularizationStatus'] = lt.colonyRegularizationStatus;
	if (lt.gramPanchayatPermission) answers['gramPanchayatPermission'] = lt.gramPanchayatPermission;
	if (lt.titleChainStatus) answers['titleChainStatus'] = lt.titleChainStatus;
	if (lt.encumbranceCertStatus) answers['encumbranceCertStatus'] = lt.encumbranceCertStatus;
	if (lt.successionStatus) answers['successionStatus'] = lt.successionStatus;
	if (lt.revenueRecordMutation) answers['revenueRecordMutation'] = lt.revenueRecordMutation;

	// Documentation & legal readiness
	if (lt.documentationReadiness) answers['documentationReadiness'] = lt.documentationReadiness;
	if (lt.nocFromPreviousLender) answers['nocFromPreviousLender'] = lt.nocFromPreviousLender;

	// Unsecured loan common fields
	if (lt.urgencyLevel) answers['urgencyLevel'] = lt.urgencyLevel;
	if (lt.existingBankRelationship)
		answers['existingBankRelationship'] = lt.existingBankRelationship;
	if (lt.dcExistingBank) answers['dcExistingBank'] = lt.dcExistingBank;

	// ── Primary applicant fields ────────────────────────────────

	if (primary) {
		if (primary.employmentType) answers['employmentType'] = primary.employmentType;
		// applicantQuestion.json uses "age" as bindsTo_template, not "ageOfApplicant"
		if (primary.age) {
			answers['age'] = String(primary.age);
			answers['ageOfApplicant'] = String(primary.age); // legacy alias
		}
		if (primary.gender) answers['gender'] = primary.gender;
		if (primary.maritalStatus) answers['maritalStatus'] = primary.maritalStatus;
		if (primary.fullName) answers['fullName'] = primary.fullName;
		if (primary.creditScore) answers['creditScore'] = String(primary.creditScore);
		if (primary.residenceType) answers['TypeOfResidence'] = primary.residenceType;
		// NRI key: PL uses "ApplicantIsNRI", BL/Prof use "applicantIsNRI"
		// Set both variants so the reverse mapper matches whichever the schema uses
		if (primary.isNRI !== undefined) {
			answers['isNRI'] = boolToYesNo(primary.isNRI);
			answers['ApplicantIsNRI'] = boolToYesNo(primary.isNRI);
			answers['applicantIsNRI'] = boolToYesNo(primary.isNRI);
		}

		// Applicant type
		if (primary.applicantType) answers['applicantType'] = primary.applicantType;

		// Income
		if (primary.grossIncome) answers['grossIncome'] = String(primary.grossIncome);
		if (primary.netIncome) answers['netIncome'] = String(primary.netIncome);
		if (primary.monthlyOtherIncome)
			answers['monthlyOtherIncome'] = String(primary.monthlyOtherIncome);

		// Self-employed specifics
		if (primary.professionType) answers['professionType'] = primary.professionType;
		if (primary.businessType) answers['businessType'] = primary.businessType;
		if (primary.gstRegistrationDate) answers['GSTRegistrationYear'] = primary.gstRegistrationDate;
		if (primary.averageBankBalance) {
			answers['averageBankBalance'] = String(primary.averageBankBalance);
			answers['tenMonthsAverageBalance'] = String(primary.averageBankBalance); // applicantQuestion key
		}
		if (primary.averageCashAmount) {
			answers['cashAmount'] = String(primary.averageCashAmount);
			answers['cashSale'] = String(primary.averageCashAmount); // applicantQuestion key
		}

		// Obligations
		if (primary.hasExistingObligations !== undefined) {
			answers['ObligationsRunning'] = boolToYesNo(primary.hasExistingObligations);
		}

		// Unsecured business profile fields
		if (primary.businessEntityType) answers['businessEntityType'] = primary.businessEntityType;
		if (primary.businessIndustrySector)
			answers['businessIndustrySector'] = primary.businessIndustrySector;
		if (primary.businessVintage) answers['businessVintage'] = primary.businessVintage;
		if (primary.gstRegistrationStatus)
			answers['gstRegistrationStatus'] = primary.gstRegistrationStatus;
		if (primary.annualTurnoverRange) answers['annualTurnoverRange'] = primary.annualTurnoverRange;
		if (primary.numberOfEmployees) answers['numberOfEmployees'] = primary.numberOfEmployees;
		if (primary.banksOfCurrentAccount)
			answers['banksOfCurrentAccount'] = primary.banksOfCurrentAccount;

		// Company-specific
		if (primary.applicantType === 'Company') {
			if (primary.companyName) answers['companyName'] = primary.companyName;
			if (primary.companyType) answers['companyType'] = primary.companyType;
			if (primary.companyAge) answers['companyAge'] = String(primary.companyAge);
		}
	}

	return answers;
}

// ============================================================================
// Step 2: Flat answers + reverse map -> page-ordered fill instructions
// ============================================================================

/**
 * Convert a reverse map entry + value into a FillInstruction.
 * Handles type coercion (numbers to strings for selects, etc.)
 */
function toFillInstruction(entry: ReverseMapEntry, value: unknown): FillInstruction | null {
	if (value === undefined || value === null || value === '') return null;

	const type = normalizeFillType(entry.questionType);

	// Multiple-select: pass array values directly
	if (type === 'multiple-select' && Array.isArray(value)) {
		return { questionId: entry.questionId, type, value: value.map(String) };
	}

	const strValue = String(value);

	// For radio/select, verify the value is a valid option if options exist
	if ((type === 'radio' || type === 'select') && entry.options) {
		const match = entry.options.find((opt) => opt.value === strValue || opt.label === strValue);
		if (match) {
			return { questionId: entry.questionId, type, value: match.value };
		}
		// No match in known options — still attempt it (option lists may be dynamic)
	}

	return { questionId: entry.questionId, type, value: strValue };
}

/**
 * Normalize schema question types to fill instruction types.
 */
function normalizeFillType(schemaType: string): FillInstruction['type'] {
	switch (schemaType) {
		case 'radio':
			return 'radio';
		case 'select':
		case 'derivedSelect':
			return 'select';
		case 'multiple-select':
			return 'multiple-select';
		case 'currency':
			return 'currency';
		case 'number':
			return 'number';
		case 'date':
			return 'date';
		default:
			return 'text';
	}
}

/**
 * Generate a complete E2E fill configuration from a LoanApplicationPayload.
 *
 * Flow: payload -> payloadToFormAnswers() -> flat keys -> buildReverseMap() ->
 *       page-ordered FillInstruction[]
 */
export function generateFillConfig(payload: LoanApplicationPayload): E2eFillConfig {
	const rawLoanName = payload.loanTransaction.loanName;
	const scope = payload.loanTransaction.loanType;

	// Normalize loanName: generators may use "Plot and Construction Loan" but
	// the form and schema loader uses "Plot Loan"
	const LOAN_NAME_ALIASES: Record<string, string> = {
		'Plot and Construction Loan': 'Plot Loan'
	};
	const loanName = LOAN_NAME_ALIASES[rawLoanName] || rawLoanName;

	// Build flat answers from structured payload
	const flatAnswers = payloadToFormAnswers(payload);

	// Build reverse map for the loan product (uses normalized name)
	const reverseMap: ReverseMap = buildReverseMap(loanName);

	// Track which keys couldn't be mapped
	const unmappedKeys: string[] = [];

	// Group fill instructions by page
	const pageMap = new Map<string, PageFillConfig>();

	for (const [key, value] of Object.entries(flatAnswers)) {
		const entry = reverseMap.get(key);
		if (!entry) {
			unmappedKeys.push(key);
			continue;
		}

		const instruction = toFillInstruction(entry, value);
		if (!instruction) continue;

		let pageConfig = pageMap.get(entry.pageId);
		if (!pageConfig) {
			pageConfig = {
				pageId: entry.pageId,
				pageIndex: entry.pageIndex,
				fills: []
			};
			pageMap.set(entry.pageId, pageConfig);
		}
		pageConfig.fills.push(instruction);
	}

	// Sort pages by pageIndex, and fills within each page by question order
	const pages = Array.from(pageMap.values()).sort((a, b) => a.pageIndex - b.pageIndex);

	// loanType (scope) for the how-can-we-help page navigation.
	// This is the q4_loanType value (or what the auto-rule would set).
	// navigateToLoanForm handles the normalization to form-specific values.
	const loanType = scope || 'New Loan';

	// Generate custom page fills for component pages (applicant, income, etc.)
	const customPages = generateCustomPageFills(payload, loanName);

	return {
		loanName,
		loanType,
		pages,
		customPages,
		unmappedKeys
	};
}

// ============================================================================
// Step 3: Custom page fill instructions (non-schema component pages)
// ============================================================================

/** Map employmentType → income profile card type */
const EMPLOYMENT_TO_PROFILE: Record<string, string> = {
	'Salaried(Private)': 'salaried_regular',
	'Salaried(Government)': 'salaried_regular',
	'Self-employed(Professional)': 'professional_practice',
	'Self-employed(Other)': 'business_proprietorship',
	Pensioner: 'pension'
};

/**
 * Generate fill instructions for custom component pages
 * (applicant, profile, income, credit, obligations).
 */
function generateCustomPageFills(
	payload: LoanApplicationPayload,
	loanName: string
): CustomPageFill[] {
	const fills: CustomPageFill[] = [];
	const primary = payload.allApplicantDetails?.[0];
	if (!primary) return fills;

	const SECURED = ['Home Loan', 'Loan Against Property', 'LAP', 'Plot Loan'];
	const isSecured = SECURED.includes(loanName);

	// Determine the applicant page ID based on loan type.
	// These MUST match the actual page IDs in each loan type's pages.ts:
	//   Home Loan:              tellUs_homeLoan      (pages.ts:163)
	//   LAP:                    tellUsApplyingPage   (lapLoan/pages.ts:83)
	//   Plot Loan:              tellUsApplyingPage   (plotLoan/pages.ts:109)
	//   Personal/Business/Prof: applicantPage        (pages.ts — sharedApplicantPage)
	const APPLICANT_PAGE_IDS: Record<string, string> = {
		'Home Loan': 'tellUs_homeLoan',
		'Loan Against Property': 'tellUsApplyingPage',
		LAP: 'tellUsApplyingPage',
		'Plot Loan': 'tellUsApplyingPage',
		'Personal Loan': 'applicantPage',
		'Business Loan': 'applicantPage',
		'Professional Loan': 'applicantPage'
	};
	const tellUsPageId = APPLICANT_PAGE_IDS[loanName] || 'applicantPage';

	// 1. Applicant page — add applicants with basic details
	fills.push({
		pageId: tellUsPageId,
		strategy: 'applicant-add',
		data: {
			applicants: payload.allApplicantDetails.map((a) => ({
				applicantType: a.applicantType || 'Individual',
				applicantSubType: a.applicantType === 'Company' ? undefined : 'individual',
				fullName: a.fullName,
				gender: a.gender,
				maritalStatus: a.maritalStatus,
				age: String(a.age),
				isNRI: a.isNRI ? 'Yes' : 'No',
				onProperty: isSecured ? 'Yes' : undefined,
				onEMI: isSecured ? 'Yes' : undefined,
				// Company fields
				companyName: a.companyName,
				companyType: a.companyType
			})),
			relationships: payload.relationships || []
		}
	});

	// 2. Income profiles page — select the right profile card
	const profileType = EMPLOYMENT_TO_PROFILE[primary.employmentType] || 'salaried_regular';
	fills.push({
		pageId: 'incomeProfilesPage',
		strategy: 'income-profiles',
		data: { profileType, employmentType: primary.employmentType }
	});

	// 3. Income details page — enter income figures
	fills.push({
		pageId: 'incomeDetailsPage',
		strategy: 'income-details',
		data: {
			profileType,
			grossIncome: primary.grossIncome ? String(primary.grossIncome) : undefined,
			netIncome: primary.netIncome ? String(primary.netIncome) : undefined,
			employmentType: primary.employmentType
		}
	});

	// 4. Credit score page
	fills.push({
		pageId: 'creditScorePage',
		strategy: 'credit-score',
		data: { creditScore: String(primary.creditScore) }
	});

	// 5. Obligations page
	fills.push({
		pageId: 'obligationsPage',
		strategy: 'obligations',
		data: {
			hasExistingObligations: primary.hasExistingObligations,
			obligations: primary.obligations || []
		}
	});

	return fills;
}
