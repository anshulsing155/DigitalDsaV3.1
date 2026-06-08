/**
 * =============================================================================
 * CASE PAYLOAD BUILDER — Categorical, Unfiltered, Progressive
 * =============================================================================
 *
 * Builds a CasePayload from raw form stores. Unlike cleanPayload which filters
 * by visibility and flattens everything, this builder:
 *
 *   1. Reads ALL raw answers (no visibility filtering)
 *   2. Organizes into categorical sub-objects
 *   3. Computes derived intelligence for credit decision-making
 *   4. Includes _raw dump as safety net
 *
 * Usage:
 *   import { buildCasePayload } from '$lib/utils/casePayloadBuilder';
 *   const payload = buildCasePayload(loanAnswers, applicants, applicationData, relationships);
 *
 * =============================================================================
 */

import type {
	CasePayload,
	CaseScreening,
	CasePropertyLocation,
	CasePropertyTechnical,
	CasePropertyLegal,
	CasePropertyFinancial,
	CaseSeller,
	CaseLoanDetails,
	CaseBalanceTransfer,
	CaseTopUp,
	CaseApplicant,
	CaseApplicantPersonal,
	CaseApplicantIncome,
	CaseApplicantObligations,
	CaseApplicantCibil,
	CaseDerivedInsights,
	CaseDerivedApplicant
} from '$lib/types/casePayload';

import type { RelationshipEntry } from '$lib/utils/payloadBuilder';

import {
	toNumber,
	toBoolean,
	deriveTitle,
	extractIncomeEntries,
	resolveRelationship,
	extractSelectedOptions,
	hasAnySelected,
	buildSalariedProfile,
	buildGovernmentProfile,
	buildBusinessProfile,
	buildPensionProfile,
	buildLowCreditReasons,
	extractFinancials,
	CREDIT_LINE_TYPES,
	cleanObligationEntries
} from '$lib/utils/payloadBuilder';

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the complete CasePayload from raw store data.
 *
 * @param loanAnswers    - Raw loan form answers (from loanData store, keyed by question ID)
 * @param applicants     - Raw applicant data array (from applicantsStore)
 * @param applicationData - Application metadata (loanName, tellUsWhoIsApplying, etc.)
 * @param relationships   - Relationship entries between applicants
 */
/**
 * `opts.now` lets callers inject the "current time" used by time-derived
 * fields (`loanVintageMonths` on the BT loan sub-object). Production omits
 * it (defaults to real `new Date()`); tests pass a frozen date. Locked by
 * `payloadBuilderTimeInjection.test.ts` per CLAUDE.md §16.16. Added
 * 2026-06-01 (S210, TECH-DEBT-CLEANUP D-incoming-4 Level-3 fix).
 */
export function buildCasePayload(
	loanAnswers: Record<string, unknown>,
	applicants: Record<string, unknown>[],
	applicationData: Record<string, unknown>,
	relationships?: Array<{ fromId: string; toId: string; relationType: string; category?: string }>,
	opts?: { now?: Date }
): CasePayload {
	const loanName = String(applicationData.loanName ?? loanAnswers.loanName ?? '');
	const loanType = String(loanAnswers.loanType ?? loanAnswers.LoanType ?? 'New Loan');

	// Resolve relationship IDs → indices
	const resolvedRels: RelationshipEntry[] = (relationships ?? [])
		.map((r) => {
			const fromIdx = applicants.findIndex((a) => String(a.id) === r.fromId);
			const toIdx = applicants.findIndex((a) => String(a.id) === r.toId);
			return {
				fromIndex: fromIdx,
				toIndex: toIdx,
				relationType: r.relationType,
				category: r.category ?? ''
			};
		})
		.filter((r) => r.fromIndex >= 0 && r.toIndex >= 0);

	// Build categorical sections
	const screening = buildScreening(loanAnswers);
	const property = {
		location: buildPropertyLocation(loanAnswers),
		technical: buildPropertyTechnical(loanAnswers),
		legal: buildPropertyLegal(loanAnswers),
		financial: buildPropertyFinancial(loanAnswers)
	};
	const seller = buildSeller(loanAnswers);
	const loan = buildLoan(loanAnswers, applicationData, loanName, loanType);
	const balanceTransfer = buildBalanceTransfer(loanAnswers, loanType, opts);
	const topUp = buildTopUp(loanAnswers, loanType);

	// Build applicants
	const caseApplicants = applicants.map((raw, index) =>
		buildApplicant(raw, index, resolvedRels, loan.tenureYears)
	);

	// Build derived insights (AFTER all other sections)
	const derived = buildDerivedInsights(
		caseApplicants,
		loan,
		property.financial,
		balanceTransfer,
		seller
	);

	return {
		screening,
		property,
		seller,
		loan,
		balanceTransfer,
		topUp,
		applicants: caseApplicants,
		relationships: resolvedRels,
		derived,
		_raw: {
			loanAnswers: { ...loanAnswers },
			applicants: applicants.map((a) => ({ ...a })),
			applicationData: { ...applicationData }
		}
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREENING
// ─────────────────────────────────────────────────────────────────────────────

function buildScreening(answers: Record<string, unknown>): CaseScreening {
	return {
		isDefaulter: answers.isDefaulter != null ? toBoolean(answers.isDefaulter) : null,
		madeGuarantor: answers.madeGuarantor != null ? toBoolean(answers.madeGuarantor) : null,
		priorApplication: answers.priorApplication != null ? String(answers.priorApplication) : null,
		floodProne: answers.floodProne != null ? toBoolean(answers.floodProne) : null,
		payslipsAvailable: answers.payslips != null ? toBoolean(answers.payslips) : null
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTY — LOCATION
// ─────────────────────────────────────────────────────────────────────────────

function buildPropertyLocation(answers: Record<string, unknown>): CasePropertyLocation {
	return {
		identified: answers.propertyIdentified != null ? toBoolean(answers.propertyIdentified) : null,
		state: answers.propertyStateName != null ? String(answers.propertyStateName) : null,
		city: answers.propertyCityName != null ? String(answers.propertyCityName) : null,
		pincode: answers.pincode != null ? String(answers.pincode) : null,
		residenceSameAsProperty:
			answers.residenceOptionSame != null ? answers.residenceOptionSame === 'Yes' : null,
		applicantResidingInProperty:
			answers.applicantResidingInProperty != null
				? answers.applicantResidingInProperty === 'Yes'
				: null,
		propertyOccupancyStatus:
			answers.propertyOccupancyStatus != null ? String(answers.propertyOccupancyStatus) : null,
		residenceState: answers.residenceStateName != null ? String(answers.residenceStateName) : null,
		residenceCity: answers.residenceCityName != null ? String(answers.residenceCityName) : null
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTY — TECHNICAL
// ─────────────────────────────────────────────────────────────────────────────

function buildPropertyTechnical(answers: Record<string, unknown>): CasePropertyTechnical {
	const rawArea = toNumber(answers.carpetArea);
	const areaUnit = answers.carpetAreaUnit != null ? String(answers.carpetAreaUnit) : null;

	// Normalize to sq ft
	let normalizedArea: number | null = null;
	if (rawArea != null) {
		if (areaUnit === 'Meter') normalizedArea = Math.round(rawArea * 10.7639);
		else if (areaUnit === 'Yard') normalizedArea = Math.round(rawArea * 9);
		else normalizedArea = rawArea;
	}

	return {
		type:
			answers.propertyType != null
				? String(answers.propertyType)
				: answers.constructionType != null
					? String(answers.constructionType)
					: null,
		purchaseType: answers.purchaseType != null ? String(answers.purchaseType) : null,
		constructionStatus: answers.constructionType != null ? String(answers.constructionType) : null,
		stage: answers.PropertyStage != null ? String(answers.PropertyStage) : null,
		age: toNumber(answers.propertyAge),
		areaType: answers.propertyAreaType != null ? String(answers.propertyAreaType) : null,
		carpetArea: normalizedArea,
		carpetAreaUnit: areaUnit,
		carpetAreaRaw: rawArea,
		approvedByAuthority:
			answers.approvedByAuthority != null ? toBoolean(answers.approvedByAuthority) : null,
		asPerApprovedMap: answers.asPerMap != null ? toBoolean(answers.asPerMap) : null
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTY — LEGAL
// ─────────────────────────────────────────────────────────────────────────────

function buildPropertyLegal(answers: Record<string, unknown>): CasePropertyLegal {
	return {
		registered:
			answers.ifPropertyRegistered != null ? toBoolean(answers.ifPropertyRegistered) : null,
		occupancyStatus: answers.occupancyStatus != null ? String(answers.occupancyStatus) : null,
		onLoan: answers.isPropertyOnLoan != null ? toBoolean(answers.isPropertyOnLoan) : null,
		reraRegistered:
			answers.RERARegisterBuilder != null ? toBoolean(answers.RERARegisterBuilder) : null,
		builderType: answers.builderType != null ? String(answers.builderType) : null,
		ocCcAvailable: answers.ocCcAvailable != null ? String(answers.ocCcAvailable) : null,
		municipalApproval: answers.municipalApproval != null ? String(answers.municipalApproval) : null,
		leaseRemainingPeriod:
			answers.leaseRemainingPeriod != null ? String(answers.leaseRemainingPeriod) : null,
		existingEncumbrance:
			answers.existingEncumbrance != null ? String(answers.existingEncumbrance) : null,
		auctionedProperty:
			answers.auctionedProperty != null ? toBoolean(answers.auctionedProperty) : null,
		understandsAsIsBasis:
			answers.understandsAsIsBasis != null ? toBoolean(answers.understandsAsIsBasis) : null,

		// ── Area-Specific Compliance & Legal ──
		reraRegistrationStatus:
			answers.reraRegistrationStatus != null ? String(answers.reraRegistrationStatus) : null,
		naConversionStatus:
			answers.naConversionStatus != null ? String(answers.naConversionStatus) : null,
		zoneClassification:
			answers.zoneClassification != null ? String(answers.zoneClassification) : null,
		municipalTaxStatus:
			answers.municipalTaxStatus != null ? String(answers.municipalTaxStatus) : null,
		unauthorizedAdditions:
			answers.unauthorizedAdditions != null ? String(answers.unauthorizedAdditions) : null,
		revenueRecordStatus:
			answers.revenueRecordStatus != null ? String(answers.revenueRecordStatus) : null,
		colonyRegularizationStatus:
			answers.colonyRegularizationStatus != null
				? String(answers.colonyRegularizationStatus)
				: null,
		gramPanchayatPermission:
			answers.gramPanchayatPermission != null ? String(answers.gramPanchayatPermission) : null,
		titleChainStatus: answers.titleChainStatus != null ? String(answers.titleChainStatus) : null,
		encumbranceCertStatus:
			answers.encumbranceCertStatus != null ? String(answers.encumbranceCertStatus) : null,
		successionStatus: answers.successionStatus != null ? String(answers.successionStatus) : null,
		revenueRecordMutation:
			answers.revenueRecordMutation != null ? String(answers.revenueRecordMutation) : null
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTY — FINANCIAL
// ─────────────────────────────────────────────────────────────────────────────

function buildPropertyFinancial(answers: Record<string, unknown>): CasePropertyFinancial {
	return {
		cost: toNumber(answers.propertyCost ?? answers.propCost ?? answers.dealValue),
		atsValue: toNumber(answers.propertyValueAsPerATS),
		isDifferentAtsAndCost:
			answers.isDifferATSAndPropertyValue != null
				? toBoolean(answers.isDifferATSAndPropertyValue)
				: null,
		isAtsReady: answers.isATSReady != null ? toBoolean(answers.isATSReady) : null,
		downPayment: toNumber(answers.downPayment ?? answers.downpaymentByOwn ?? answers.deposit),
		rentalIncome: toNumber(answers.rentalIncome),
		currentValue: toNumber(answers.currentPropertyValue),
		// ── Home Loan Redesign: Three-Cost Model ──
		marketValue: toNumber(answers.marketValue),
		registryValue: toNumber(answers.registryValue)
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// SELLER
// ─────────────────────────────────────────────────────────────────────────────

function buildSeller(answers: Record<string, unknown>): CaseSeller {
	return {
		purchasedFrom: answers.purchasedFrom != null ? String(answers.purchasedFrom) : null,
		builderName: answers.fullNameOfBuilder != null ? String(answers.fullNameOfBuilder) : null,
		authorityName: answers.fullNameOfAuthority != null ? String(answers.fullNameOfAuthority) : null,
		isNRI:
			(answers.isSellerNRI ?? answers.ifSellerNri) != null
				? toBoolean(answers.isSellerNRI ?? answers.ifSellerNri)
				: null,
		propertyOnLoan:
			(answers.isPropertyOnLoan ?? answers.ifSellerOnLoan ?? answers.sellerOnLoan) != null
				? toBoolean(answers.isPropertyOnLoan ?? answers.ifSellerOnLoan ?? answers.sellerOnLoan)
				: null,
		loanBankName:
			(answers.sellerLoanBankName ?? answers.sellerCurrentLender) != null
				? String(answers.sellerLoanBankName ?? answers.sellerCurrentLender)
				: null,
		foreclosureAmount: toNumber(answers.foreclosureAmount ?? answers.sellerOutstandingAmount),
		ownershipType: answers.sellerOwnershipType != null ? String(answers.sellerOwnershipType) : null,
		poaRegistrationStatus:
			answers.poaRegistrationStatus != null ? String(answers.poaRegistrationStatus) : null,
		acquisitionMethod:
			answers.propertyAcquisitionMethod != null ? String(answers.propertyAcquisitionMethod) : null,
		agreementPoaRegistryWilling:
			answers.agreementPoaRegistryWilling != null
				? String(answers.agreementPoaRegistryWilling)
				: null,
		agreementPoaNbfcKnown:
			answers.agreementPoaNbfcKnown != null ? String(answers.agreementPoaNbfcKnown) : null,
		agreementPoaNbfcName:
			answers.agreementPoaNbfcName != null ? String(answers.agreementPoaNbfcName) : null,
		lastRegistryDuration:
			answers.lastRegistryDuration != null ? String(answers.lastRegistryDuration) : null,
		isAnyBuilderDemand:
			answers.isAnyBuilderDemand != null ? String(answers.isAnyBuilderDemand) : null
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAN DETAILS
// ─────────────────────────────────────────────────────────────────────────────

function buildLoan(
	answers: Record<string, unknown>,
	appData: Record<string, unknown>,
	loanName: string,
	loanType: string
): CaseLoanDetails {
	const banks = answers.approvedBankForSelectedByUser;
	let preferredBanks: string[] = [];
	if (Array.isArray(banks)) {
		preferredBanks = banks.filter((b): b is string => typeof b === 'string');
	} else if (typeof banks === 'string' && banks) {
		preferredBanks = [banks];
	}

	// Audit BUG-A (2026-05-28): mirror the same loanAmount sizing used in
	// loanTransaction.ts. Without the type-aware branch, BT-Only / Top-up
	// Only / BT+Top-up all fall back to `sanctionAmount` (original sanction)
	// or zero, evaluating the customer for the wrong amount. The case-level
	// payload is what evaluate-and-persist + case routes read, so the same
	// fix must land here as in the engine-side payload builder.
	const amount = ((): number => {
		// Post-rename: scope is unified under loanType for every loan family.
		const lt = String(loanType ?? '');
		if (lt === 'Balance Transfer Only') {
			return toNumber(answers.principalOutstanding) ?? 0;
		}
		if (lt === 'Top-up Only') {
			return toNumber(answers.topUpAmount) ?? 0;
		}
		if (lt === 'Balance Transfer With Top-up') {
			const outstanding = toNumber(answers.principalOutstanding) ?? 0;
			const topup = toNumber(answers.topUpAmount) ?? 0;
			return outstanding + topup;
		}
		return toNumber(answers.RequiredLoanAmount ?? answers.loanAmount ?? answers.sanctionAmount) ?? 0;
	})();

	return {
		name: loanName,
		type: loanType,
		amount,
		tenureYears: toNumber(answers.loanTenure ?? answers.mortgageYear ?? answers.tenure),
		purpose: answers.loanPurpose != null ? String(answers.loanPurpose) : null,
		applicationStructure:
			appData.tellUsWhoIsApplying != null ? String(appData.tellUsWhoIsApplying) : null,
		numberOfApplicants: toNumber(answers.numberOfDirectorOrApplicant) ?? 1,
		dodMonthlyWithdrawal: toNumber(answers.dodMonthlyWithdrawal),
		hasNRIApplicant: appData.ApplicantIsNRI === 'Yes' || toBoolean(appData.hasNRIApplicant),
		preferredBanks
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// BALANCE TRANSFER
// ─────────────────────────────────────────────────────────────────────────────

function buildBalanceTransfer(
	answers: Record<string, unknown>,
	loanType: string,
	opts?: { now?: Date }
): CaseBalanceTransfer | null {
	// Existing loan details are captured for BT, BT+TopUp, AND TopUp Only
	if (
		!loanType.includes('Balance Transfer') &&
		!loanType.includes('Top-up') &&
		!loanType.includes('Topup')
	)
		return null;

	// Derive loan vintage months from disbursement date.
	// Time injection per S210: `opts.now` makes this deterministic for tests;
	// production defaults to real `new Date()`. Threaded from `buildCasePayload`.
	let loanVintageMonths: number | null = null;
	if (answers.loanDisbursementDate && typeof answers.loanDisbursementDate === 'string') {
		const parts = answers.loanDisbursementDate.split('-').map(Number);
		if (parts.length >= 2 && parts[0] > 0 && parts[1] > 0) {
			const now = opts?.now ?? new Date();
			loanVintageMonths = (now.getFullYear() - parts[0]) * 12 + (now.getMonth() + 1 - parts[1]);
		}
	}

	return {
		currentBank: answers.selectSingleBank != null ? String(answers.selectSingleBank) : null,
		principalOutstanding: toNumber(answers.principalOutstanding),
		interestRate: toNumber(answers.existingInterestRate),
		remainingTenure: toNumber(answers.remainingTenure ?? answers.orignalRemaningTenure),
		currentEMI: toNumber(answers.includedCurrentEMIsAmount),
		sixMonthsAfterRegistry:
			answers.sixMonthsPassedAfterRegistry != null
				? toBoolean(answers.sixMonthsPassedAfterRegistry)
				: null,
		currentPropertyValue: toNumber(answers.currentPropertyValue),
		newTenure: toNumber(answers.newTenure),
		loanVintage: answers.loanVintage != null ? String(answers.loanVintage) : null,
		repaymentTrack: answers.repaymentTrack != null ? String(answers.repaymentTrack) : null,
		// ── Home Loan Redesign: BT Existing Loan Signals ──
		interestRateType: answers.interestRateType != null ? String(answers.interestRateType) : null,
		emiBounceHistory: answers.emiBounceHistory != null ? String(answers.emiBounceHistory) : null,
		loanDisbursementDate:
			answers.loanDisbursementDate != null ? String(answers.loanDisbursementDate) : null,
		loanVintageMonths,
		sanctionAmount: toNumber(answers.sanctionAmount)
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP-UP
// ─────────────────────────────────────────────────────────────────────────────

function buildTopUp(answers: Record<string, unknown>, loanType: string): CaseTopUp | null {
	if (!loanType.includes('Top-up') && !loanType.includes('Topup')) return null;

	return {
		amount: toNumber(answers.requiredTopupAmount ?? answers.topUpAmount),
		tenureYears: toNumber(answers.topupTerm ?? answers.topUpTenure),
		purpose: answers.topUpPurpose != null ? String(answers.topUpPurpose) : null
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICANT BUILDER (composite)
// ─────────────────────────────────────────────────────────────────────────────

function buildApplicant(
	raw: Record<string, unknown>,
	index: number,
	relationships: RelationshipEntry[],
	loanTenure: number | null
): CaseApplicant {
	return {
		personal: buildPersonal(raw, index, relationships),
		income: buildIncome(raw),
		obligations: buildObligations(raw),
		cibil: buildCibil(raw)
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICANT — PERSONAL
// ─────────────────────────────────────────────────────────────────────────────

function buildPersonal(
	raw: Record<string, unknown>,
	index: number,
	relationships: RelationshipEntry[]
): CaseApplicantPersonal {
	const applicantType = String(raw.applicantType ?? 'Individual') as 'Individual' | 'Company';
	const gender = String(raw.gender ?? '');
	const maritalStatus = String(raw.maritalStatus ?? '');

	// Role
	let role: string;
	if (index > 0) {
		role = String(raw.existingRoleOfPerson ?? raw.roleOfPerson ?? 'Co-applicant');
	} else {
		role = 'Primary';
	}

	// Relationship
	const relationship = index > 0 ? resolveRelationship(index, raw, relationships) : null;
	const otherRelationship = raw.otherBloodRelation ? String(raw.otherBloodRelation) : null;

	// Directors
	let directors: Array<{
		name: string;
		age: number;
		designation?: string;
		sharePercent?: number | null;
		location?: string;
		isCoApplicant?: boolean;
		cibil?: number;
	}> = [];
	if (applicantType === 'Company' && Array.isArray(raw.directors)) {
		directors = (raw.directors as Record<string, unknown>[])
			.map((d) => ({
				name: String(d.name ?? d.directorName ?? ''),
				age: toNumber(d.age ?? d.directorAge) ?? 0,
				...(d.designation ? { designation: String(d.designation) } : {}),
				sharePercent: d.shareNotSure === true ? null : (toNumber(d.sharePercent) ?? undefined),
				...(d.location ? { location: String(d.location) } : {}),
				isCoApplicant: d.isCoApplicant === true,
				...(d.cibil ? { cibil: toNumber(d.cibil) ?? undefined } : {})
			}))
			.filter((d) => d.name);
	}

	// GPA details
	let gpaDetails: CaseApplicantPersonal['gpaDetails'] = null;
	if (raw.GPA && typeof raw.GPA === 'object') {
		const gpa = raw.GPA as Record<string, unknown>;
		gpaDetails = {
			fullName: String(gpa.fullName ?? gpa.name ?? ''),
			age: toNumber(gpa.age) ?? 0,
			relationship: String(gpa.relationship ?? ''),
			...(gpa.address ? { address: String(gpa.address) } : {})
		};
	}

	return {
		applicantType,
		title: (raw.title as string) || deriveTitle(gender, maritalStatus) || null,
		fullName: String(raw.fullName ?? ''),
		age: toNumber(raw.age ?? raw.age ?? raw.applicantAge) ?? 0,
		gender,
		maritalStatus,
		role,
		relationship,
		otherRelationship,
		residenceType: raw.TypeOfResidence != null ? String(raw.TypeOfResidence) : null,
		isNRI: raw.isNRI === 'Yes' || raw.isNRI === true,
		companyName: applicantType === 'Company' && raw.companyName ? String(raw.companyName) : null,
		companyType: applicantType === 'Company' && raw.companyType ? String(raw.companyType) : null,
		companyAge: applicantType === 'Company' ? toNumber(raw.companyAge) : null,
		companyOfficeProximity:
			applicantType === 'Company' && raw.companyOfficeProximity
				? String(raw.companyOfficeProximity)
				: null,
		companyOwnedProperties:
			applicantType === 'Company' && raw.companyOwnedProperties
				? String(raw.companyOwnedProperties)
				: null,
		directors,
		gpaDetails,
		// ── Home Loan Redesign: New Per-Applicant Fields ──
		education: raw.education != null ? String(raw.education) : null,
		religion: raw.religion != null ? String(raw.religion) : null,
		casteCategory: raw.casteCategory != null ? String(raw.casteCategory) : null,
		hasDisability: raw.hasDisability != null ? String(raw.hasDisability) : null,
		applicantResidencePattern:
			raw.applicantResidencePattern != null ? String(raw.applicantResidencePattern) : null,
		ownedResidentialProperties:
			raw.ownedResidentialProperties != null ? String(raw.ownedResidentialProperties) : null,
		// ── Profile Page: Residence/Office Location Fields ──
		applicantResidenceState:
			raw.applicantResidenceState != null ? String(raw.applicantResidenceState) : null,
		applicantResidenceCity:
			raw.applicantResidenceCity != null ? String(raw.applicantResidenceCity) : null,
		applicantResidencePincode:
			raw.applicantResidencePincode != null ? String(raw.applicantResidencePincode) : null,
		companyOfficeState:
			applicantType === 'Company' && raw.companyOfficeState ? String(raw.companyOfficeState) : null,
		companyOfficeCity:
			applicantType === 'Company' && raw.companyOfficeCity ? String(raw.companyOfficeCity) : null,
		companyOfficePincode:
			applicantType === 'Company' && raw.companyOfficePincode
				? String(raw.companyOfficePincode)
				: null,
		nriCountry: raw.nriCountry != null ? String(raw.nriCountry) : null
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICANT — INCOME
// ─────────────────────────────────────────────────────────────────────────────

function buildIncome(raw: Record<string, unknown>): CaseApplicantIncome {
	const employmentType = String(raw.employmentType ?? '');

	// Activity profiles — extract regardless of employment type (no filtering)
	const salariedSelections = extractSelectedOptions(
		raw.salariedActivityDetailsVisible as Record<string, unknown>
	);
	const businessSelections = extractSelectedOptions(
		raw.businessActivityDetailsVisible as Record<string, unknown>
	);
	const pensionSelections = extractSelectedOptions(
		(raw.pensionActivityDetailsVisible ?? raw.salariedActivityDetailsVisible) as Record<
			string,
			unknown
		>
	);

	// Build profiles (null if no selections)
	let salariedProfile: Record<string, boolean> | null = null;
	let governmentProfile: Record<string, boolean> | null = null;
	let businessProfile: Record<string, boolean> | null = null;
	let pensionProfile: Record<string, boolean> | null = null;

	if (hasAnySelected(salariedSelections)) {
		if (employmentType === 'Salaried(Government)') {
			governmentProfile = buildGovernmentProfile(salariedSelections) ?? null;
		} else {
			salariedProfile = buildSalariedProfile(salariedSelections) ?? null;
		}
	}
	if (hasAnySelected(businessSelections)) {
		businessProfile = buildBusinessProfile(businessSelections) ?? null;
	}
	if (hasAnySelected(pensionSelections) && employmentType === 'Pensioner') {
		pensionProfile = buildPensionProfile(pensionSelections) ?? null;
	}

	// Income entries
	const incomeEntries = extractIncomeEntries(raw);

	// Backfill gross/net from income entries if not directly available
	let grossIncome = toNumber(raw.grossIncome);
	let netIncome = toNumber(raw.netIncome);
	if (grossIncome == null && incomeEntries.length > 0) {
		const sal = incomeEntries.find((e) =>
			['salaried_regular', 'salaried_contractual'].includes(e.profileType)
		);
		if (sal) {
			grossIncome = toNumber(sal.income.grossMonthlySalary);
			netIncome = toNumber(sal.income.netMonthlySalary);
		}
	}

	return {
		employmentType,
		grossIncome,
		netIncome,
		monthlyOtherIncome: toNumber(raw.monthlyOtherIncome),
		averageBankBalance: toNumber(raw.averageBankBalance),
		averageCashAmount: toNumber(raw.cashAmount),
		incomeEntries,
		salariedProfile,
		governmentProfile,
		businessProfile,
		pensionProfile,
		professionType: raw.professionType != null ? String(raw.professionType) : null,
		businessType: raw.businessType != null ? String(raw.businessType) : null,
		gstRegistrationDate: raw.GSTRegistrationYear != null ? String(raw.GSTRegistrationYear) : null,
		hasBarCouncilChamber: raw.isLawyerBarCouncil != null ? raw.isLawyerBarCouncil === 'Yes' : null,
		financials: extractFinancials(raw.financialsTableVisible as Record<string, unknown>) ?? null
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICANT — OBLIGATIONS
// ─────────────────────────────────────────────────────────────────────────────

function buildObligations(raw: Record<string, unknown>): CaseApplicantObligations {
	const hasExisting = raw.ObligationsRunning === 'Yes';
	// Always extract entries — don't gate on hasExisting (data completeness)
	const entries = cleanObligationEntries(raw);

	return {
		hasExisting,
		entries
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICANT — CIBIL
// ─────────────────────────────────────────────────────────────────────────────

function buildCibil(raw: Record<string, unknown>): CaseApplicantCibil {
	const creditReasons = extractSelectedOptions(
		raw.whyPrimaryLowCreditVisible as Record<string, unknown>
	);

	return {
		score: toNumber(raw.creditScore) ?? 0,
		lowScoreReasons: hasAnySelected(creditReasons)
			? (buildLowCreditReasons(creditReasons) ?? null)
			: null,
		// ── Home Loan Redesign: Graduated Credit Questions ──
		creditHistoryStatus: raw.creditHistoryStatus != null ? String(raw.creditHistoryStatus) : null,
		emiBounceCount: raw.emiBounceCount != null ? String(raw.emiBounceCount) : null,
		defaultSettlementStatus:
			raw.defaultSettlementStatus != null ? String(raw.defaultSettlementStatus) : null,
		recentEnquiryCount: raw.recentEnquiryCount != null ? String(raw.recentEnquiryCount) : null,
		bounceReason: raw.bounceReason != null ? String(raw.bounceReason) : null,
		defaultReason: raw.defaultReason != null ? String(raw.defaultReason) : null,
		enquiryReason: raw.enquiryReason != null ? String(raw.enquiryReason) : null
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// DERIVED INSIGHTS
// ─────────────────────────────────────────────────────────────────────────────

function buildDerivedInsights(
	applicants: CaseApplicant[],
	loan: CaseLoanDetails,
	propertyFinancial: CasePropertyFinancial,
	bt: CaseBalanceTransfer | null,
	seller: CaseSeller
): CaseDerivedInsights {
	// Per-applicant derived
	const derivedApplicants = applicants.map((a) => buildDerivedApplicant(a, loan.tenureYears));

	// Combined income & obligations
	const incomes = derivedApplicants
		.map((d) => d.totalMonthlyIncome)
		.filter((v): v is number => v != null);
	const obligations = derivedApplicants
		.map((d) => d.totalMonthlyObligations)
		.filter((v): v is number => v != null);

	const combinedMonthlyIncome = incomes.length > 0 ? incomes.reduce((a, b) => a + b, 0) : null;
	const combinedMonthlyObligations =
		obligations.length > 0 ? obligations.reduce((a, b) => a + b, 0) : null;

	const combinedFOIR =
		combinedMonthlyIncome != null && combinedMonthlyIncome > 0 && combinedMonthlyObligations != null
			? round(combinedMonthlyObligations / combinedMonthlyIncome, 4)
			: null;

	// Estimated EMI (reducing balance at 9% indicative)
	const estimatedEMI =
		loan.amount != null && loan.tenureYears != null && loan.tenureYears > 0
			? calculateEMI(loan.amount, 9, loan.tenureYears * 12)
			: null;

	// Proposed FOIR
	const proposedFOIR =
		combinedMonthlyIncome != null && combinedMonthlyIncome > 0 && estimatedEMI != null
			? round(((combinedMonthlyObligations ?? 0) + estimatedEMI) / combinedMonthlyIncome, 4)
			: null;

	// LTV
	const loanAmount = loan.amount;
	const propertyCost = propertyFinancial.cost;
	const ltv =
		loanAmount != null && propertyCost != null && propertyCost > 0
			? round(loanAmount / propertyCost, 4)
			: null;

	// Property value gap
	const atsValue = propertyFinancial.atsValue;
	const hasPropertyValueGap = propertyCost != null && atsValue != null && propertyCost !== atsValue;
	const propertyValueGapPercent =
		hasPropertyValueGap && propertyCost != null && propertyCost > 0 && atsValue != null
			? round(((propertyCost - atsValue) / propertyCost) * 100, 2)
			: null;

	// BT metrics
	let btRateDifferential: number | null = null;
	let btEstimatedMonthlySaving: number | null = null;
	if (bt != null) {
		const currentRate = bt.interestRate;
		const marketRate = 9; // indicative
		if (currentRate != null) {
			btRateDifferential = round(currentRate - marketRate, 2);
		}
		if (bt.currentEMI != null && estimatedEMI != null) {
			btEstimatedMonthlySaving = Math.round(bt.currentEMI - estimatedEMI);
		}
	}

	// Risk flags
	const hasNRIApplicant = applicants.some((a) => a.personal.isNRI);
	const hasSellerRisk = seller.isNRI === true && seller.propertyOnLoan === true;

	return {
		applicants: derivedApplicants,
		combinedMonthlyIncome,
		combinedMonthlyObligations,
		combinedFOIR,
		estimatedEMI,
		proposedFOIR,
		ltv,
		isHighLTV: ltv != null && ltv > 0.8,
		hasPropertyValueGap,
		propertyValueGapPercent,
		btRateDifferential,
		btEstimatedMonthlySaving,
		hasNRIApplicant,
		hasSellerRisk,
		multipleApplicants: applicants.length > 1
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// DERIVED — PER APPLICANT
// ─────────────────────────────────────────────────────────────────────────────

function buildDerivedApplicant(
	applicant: CaseApplicant,
	loanTenure: number | null
): CaseDerivedApplicant {
	const { personal, income, obligations, cibil } = applicant;

	// ── Income Analysis ─────────────────────────────────────────────────
	const { totalMonthlyIncome, incomeSourceCount, primaryIncomeType } = computeIncomeMetrics(income);
	const hasDocumentaryEvidence =
		income.incomeEntries.length > 0 &&
		income.incomeEntries.every((e) => e.evidence.hasDocumentaryEvidence);
	const itrCompliance =
		income.incomeEntries.length > 0 && income.incomeEntries.every((e) => e.evidence.itrFiled);

	// ── Obligation / FOIR ───────────────────────────────────────────────
	const { totalMonthlyObligations, obligationCount, closureRelief } =
		computeObligationMetrics(obligations);

	const foir =
		totalMonthlyIncome != null && totalMonthlyIncome > 0 && totalMonthlyObligations != null
			? round(totalMonthlyObligations / totalMonthlyIncome, 4)
			: null;

	const netDisposableIncome =
		totalMonthlyIncome != null && totalMonthlyObligations != null
			? totalMonthlyIncome - totalMonthlyObligations
			: null;

	// ── Age & Tenure ────────────────────────────────────────────────────
	const age = personal.age;
	const retirementAge = getRetirementAge(income.employmentType);
	const ageAtMaturity = age > 0 && loanTenure != null ? age + loanTenure : null;
	const yearsToRetirement = age > 0 ? retirementAge - age : null;
	const maxTenureByAge =
		yearsToRetirement != null ? Math.min(30, Math.max(0, yearsToRetirement)) : null;

	// ── Credit Risk Band ────────────────────────────────────────────────
	const score = cibil.score;
	let creditRiskBand: CaseDerivedApplicant['creditRiskBand'] = null;
	if (score >= 750) creditRiskBand = 'excellent';
	else if (score >= 700) creditRiskBand = 'good';
	else if (score >= 650) creditRiskBand = 'fair';
	else if (score > 0) creditRiskBand = 'poor';
	else if (score === 0) creditRiskBand = 'no_history';

	const isFirstTimeBorrower = !obligations.hasExisting && obligations.entries.length === 0;

	// ── Stability Signals ───────────────────────────────────────────────
	const sp = income.salariedProfile;
	const isSalariedStable =
		sp != null &&
		(sp['isPermanentEmployee'] ?? sp['holds_permanent_position'] ?? false) &&
		(sp['twoYearsWithSameEmployer'] ?? sp['employed_2plus_years'] ?? false) &&
		(sp['worksForReputedOrg'] ?? sp['works_for_reputed_org'] ?? false) &&
		(sp['salaryInBankAccount'] ?? sp['salary_credited_regularly'] ?? false);

	const bp = income.businessProfile;
	const isBusinessEstablished =
		bp != null &&
		(bp['threeYearsInBusiness'] ?? bp['business_3plus_years'] ?? false) &&
		(bp['gstRegistered'] ?? bp['gst_registered'] ?? false) &&
		(bp['filesITRRegularly'] ?? bp['itr_filed_regularly'] ?? false) &&
		(bp['profitableLast3Years'] ?? bp['profit_last_3_years'] ?? false);

	const pp = income.pensionProfile;
	const isPensionSecure =
		pp != null &&
		(pp['isGovernmentPension'] ?? pp['govt_pension'] ?? false) &&
		(pp['isLifelongPension'] ?? pp['lifelong_pension'] ?? false) &&
		(pp['pensionInBankAccount'] ??
			pp['pension_credited_regularly'] ??
			pp['pension_credited_monthly'] ??
			false);

	const hasVerifiableIncome = hasDocumentaryEvidence && itrCompliance;

	return {
		totalMonthlyIncome,
		incomeSourceCount,
		primaryIncomeType,
		hasDocumentaryEvidence,
		itrCompliance,
		totalMonthlyObligations,
		obligationCount,
		foir,
		netDisposableIncome,
		closureRelief,
		ageAtMaturity,
		yearsToRetirement,
		maxTenureByAge,
		creditRiskBand,
		isFirstTimeBorrower,
		isSalariedStable,
		isBusinessEstablished,
		isPensionSecure,
		hasVerifiableIncome
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes income metrics from structured income entries + legacy flat fields.
 */
function computeIncomeMetrics(income: CaseApplicantIncome): {
	totalMonthlyIncome: number | null;
	incomeSourceCount: number;
	primaryIncomeType: string | null;
} {
	const entries = income.incomeEntries;

	if (entries.length > 0) {
		// Sum from structured entries
		let total = 0;
		const typeCounts: Record<string, number> = {};

		for (const entry of entries) {
			const inc = entry.income;
			// Try various income field names
			const amount =
				toNumber(inc.grossMonthlySalary) ??
				toNumber(inc.netMonthlySalary) ??
				toNumber(inc.monthlyPension) ??
				toNumber(inc.monthlyRentalIncome) ??
				toNumber(inc.monthlyIncome) ??
				toNumber(inc.netMonthlyProfit) ??
				toNumber(inc.averageMonthlyIncome) ??
				0;
			total += amount;
			typeCounts[entry.profileType] = (typeCounts[entry.profileType] ?? 0) + amount;
		}

		// Primary type = the one with highest total income
		let primaryType: string | null = null;
		let maxAmount = 0;
		for (const [type, amount] of Object.entries(typeCounts)) {
			if (amount > maxAmount) {
				maxAmount = amount;
				primaryType = type;
			}
		}

		return {
			totalMonthlyIncome: total > 0 ? total : null,
			incomeSourceCount: entries.length,
			primaryIncomeType: primaryType
		};
	}

	// Fallback to legacy flat fields
	const gross = income.grossIncome;
	const net = income.netIncome;
	const other = income.monthlyOtherIncome ?? 0;
	const primary = gross ?? net;
	if (primary != null) {
		return {
			totalMonthlyIncome: primary + other,
			incomeSourceCount: 1,
			primaryIncomeType: income.employmentType || null
		};
	}

	return { totalMonthlyIncome: null, incomeSourceCount: 0, primaryIncomeType: null };
}

/**
 * Computes obligation metrics from cleaned entries.
 */
function computeObligationMetrics(obligations: CaseApplicantObligations): {
	totalMonthlyObligations: number | null;
	obligationCount: number;
	closureRelief: number | null;
} {
	const entries = obligations.entries;
	if (entries.length === 0) {
		return { totalMonthlyObligations: null, obligationCount: 0, closureRelief: null };
	}

	let total = 0;
	let closureRelief = 0;

	for (const entry of entries) {
		if (entry.obligationType === 'credit_line') {
			// 5% of total limit as monthly obligation
			const limit = parseFloat(entry.totalLimit ?? '') || 0;
			total += limit * 0.05;
		} else {
			// Term loan — use EMI
			const emi = parseFloat(entry.emi) || 0;
			total += emi;

			// Closure relief = sum of EMIs for items being closed
			if (entry.selectedToClose && entry.selectedToClose !== 'Keep running') {
				closureRelief += emi;
			}
		}
	}

	return {
		totalMonthlyObligations: total > 0 ? Math.round(total) : null,
		obligationCount: entries.length,
		closureRelief: closureRelief > 0 ? Math.round(closureRelief) : null
	};
}

/**
 * Returns retirement age based on employment type.
 * Salaried: 58, Self-employed: 65, Pensioner: 70, Default: 60
 */
function getRetirementAge(employmentType: string): number {
	if (employmentType.startsWith('Salaried')) return 58;
	if (employmentType.startsWith('Self-employed')) return 65;
	if (employmentType === 'Pensioner') return 70;
	return 60;
}

/**
 * Calculates EMI using reducing balance formula.
 * EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 */
function calculateEMI(principal: number, annualRate: number, months: number): number {
	if (principal <= 0 || months <= 0) return 0;
	if (annualRate <= 0) return Math.round(principal / months);
	const r = annualRate / 12 / 100;
	const factor = Math.pow(1 + r, months);
	return Math.round((principal * r * factor) / (factor - 1));
}

/**
 * Rounds a number to specified decimal places.
 */
function round(value: number, decimals: number): number {
	const factor = Math.pow(10, decimals);
	return Math.round(value * factor) / factor;
}
