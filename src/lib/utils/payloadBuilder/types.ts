/**
 * =============================================================================
 * PAYLOAD TYPE DEFINITIONS
 * =============================================================================
 * All type definitions for the loan application payload system.
 * =============================================================================
 */

/**
 * Multi-select activity details - stores which options the user selected
 * Each key is an option ID, value is true if selected
 */
export interface ActivitySelections {
	[optionId: string]: boolean;
}

/**
 * Existing obligation entry in the unified obligations[] array
 */
export interface ObligationEntry {
	/** Unique identifier for this entry */
	id: string;
	/** Whether this is a term loan or a credit line (CC/OD) */
	obligationType: 'term_loan' | 'credit_line';
	/** Type of loan: Home Loan, Personal Loan, CC Limit, OD Limit, etc. */
	loanType: string;
	/** Name of the bank/NBFC providing the loan */
	bankName: string;
	/** Closure plan: Self-funded, Top-up, Keep running, Not my liability */
	selectedToClose: string;
	/** Monthly EMI amount (numeric string, term loans only) */
	emi: string;
	/** Total sanctioned limit (numeric string, credit lines only — omitted for term loans) */
	totalLimit?: string;
	/** Original loan tenure in months */
	tenure: string;
	/** Interest rate percentage */
	interestRate: string;
	/** Remaining available limit (numeric string) */
	remainingLimit?: string;
	/** Remaining tenure in months */
	remainingTenure?: string;
	/** Per-obligation EMI delay history: NONE / 1 / 2+ */
	emiDelayHistory?: string;
	/** Amount currently utilized (for credit lines) */
	utilizedAmount?: string;
	/** Sanctioned limit (for Dropline OD) */
	sanctionedLimit?: string;
	/** Sanctioned tenure in months (for Dropline OD) */
	sanctionedTenure?: string;
	/** Role on this loan: Primary Borrower / Co-Borrower / Guarantor / Name Lender */
	role?: string;
	/** Total borrowers on this loan (numeric for lender API: 1, 2, 3, 4) */
	borrowerCount?: number;
	/** EMI responsibility split: 'full' / 'shared' */
	emiResponsibility?: string;
	/** Documentation evidence status */
	evidence?: string;
	/** Outstanding principal balance (term loans only) */
	principalOutstanding?: string;
	/** EMI deduction method */
	emiMethod?: string;
	/** Computed applicant EMI/limit share for FOIR */
	applicantEmiShare?: number;
	/** WHO actually provides money for this EMI */
	emiPaidBy?: string;
	/** HOW the payment is arranged */
	emiPaymentMode?: string;
	/** Name of the person/entity paying */
	emiPaidByName?: string;
	/** Loan capacity: as_individual, as_director, as_partner */
	loanCapacity?: string;
	/** Ownership percentage for proportional split */
	ownershipPercent?: number;
}

/**
 * Financial table data for self-employed applicants
 * Contains year-wise financial information for last 2-3 years
 */
export interface FinancialsData {
	/** Gross receipts/turnover for each financial year */
	grossReceipts: number[];
	/** Net profit after expenses for each financial year */
	netProfit: number[];
	/** Depreciation + Interest amounts for each financial year */
	depreciation: number[];
	/** Which financial years ITR was filed: ["FY23-24", "FY22-23"] */
	itrFiled: string[];
}

/**
 * Director information for company applicants
 */
export interface DirectorInfo {
	/** Director's full name */
	name: string;
	/** Director's age */
	age: number;
	/** Director's designation */
	designation?: string;
	/** DIN (Director Identification Number) if applicable */
	din?: string;
	/** Ownership share percentage in the company (null = "Not sure") */
	sharePercent?: number | null;
	/** Director's location relative to property (SAME_CITY, DIFFERENT_CITY, DIFFERENT_STATE) */
	location?: string;
	/** Whether this director is also a co-applicant on this loan */
	isCoApplicant?: boolean;
	/** Director's CIBIL score */
	cibil?: number;
}

/**
 * GPA (General Power of Attorney) holder details for NRI applicants
 */
export interface GPADetails {
	/** GPA holder's full name */
	fullName: string;
	/** GPA holder's age */
	age: number;
	/** Relationship with NRI applicant */
	relationship: string;
	/** GPA holder's address */
	address?: string;
}

/**
 * Structured income entry for the clean payload.
 * Supports multiple entries per profile type (e.g. director in multiple companies).
 */
export interface CleanIncomeEntry {
	profileType: string;
	entityName: string;
	income: Record<string, unknown>;
	evidence: { itrFiled: boolean; hasDocumentaryEvidence: boolean; vintageYears?: number };
}

/**
 * Relationship between two applicants (by index).
 * Top-level array, not per-applicant.
 */
export interface RelationshipEntry {
	fromIndex: number;
	toIndex: number;
	relationType: string;
	category: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// INDIVIDUAL APPLICANT PAYLOAD (Clean Structure)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Complete applicant details in the final payload
 * This represents ONE applicant (individual or company)
 */
export interface ApplicantPayload {
	// ═══════════════════════════════════════════════════════════════════════
	// IDENTITY & BASIC DETAILS
	// ═══════════════════════════════════════════════════════════════════════

	applicantType: 'Individual' | 'Company';
	title?: string;
	fullName: string;
	age: number;
	gender: string;
	maritalStatus: string;

	// ═══════════════════════════════════════════════════════════════════════
	// ROLE & RELATIONSHIP
	// ═══════════════════════════════════════════════════════════════════════

	roleInApplication?: string;
	/** 6-way classification: co_applicant_financial | co_applicant_non_financial | guarantor_financial | non_applicant_full_financial | non_applicant_cibil_only | guarantor_non_financial */
	applicantClassification?: string;
	relationshipWithPrimary?: string;
	otherRelationship?: string;

	// ═══════════════════════════════════════════════════════════════════════
	// RESIDENCE DETAILS
	// ═══════════════════════════════════════════════════════════════════════

	residenceType?: string;
	yearsAtCurrentAddress?: number;
	isNRI?: boolean;

	// ═══════════════════════════════════════════════════════════════════════
	// HOME LOAN REDESIGN: NEW PER-APPLICANT FIELDS
	// ═══════════════════════════════════════════════════════════════════════

	education?: string;
	religion?: string;
	casteCategory?: string;
	hasDisability?: string;
	applicantResidencePattern?: string;
	ownedResidentialProperties?: string;
	applicantResidenceState?: string;
	applicantResidenceCity?: string;
	applicantResidencePincode?: string;
	nriCountry?: string;
	creditHistoryStatus?: string;
	emiBounceCount?: string;
	defaultSettlementStatus?: string;
	recentEnquiryCount?: string;
	bounceReason?: string;
	defaultReason?: string;
	enquiryReason?: string;

	// ═══════════════════════════════════════════════════════════════════════
	// PROFESSIONAL LOAN FIELDS
	// ═══════════════════════════════════════════════════════════════════════

	professionalCategory?: string;
	practiceType?: string;
	registrationStatus?: string;

	// ═══════════════════════════════════════════════════════════════════════
	// DIRECTOR / COMPANY LINKAGE
	// ═══════════════════════════════════════════════════════════════════════

	linkedCompanyId?: string;
	ownershipPercent?: number;
	directorRole?: string;
	onEMI?: boolean;
	onProperty?: boolean;

	// ═══════════════════════════════════════════════════════════════════════
	// EMPLOYMENT DETAILS
	// ═══════════════════════════════════════════════════════════════════════

	employmentType: string;

	salariedProfile?: {
		worksForReputedOrg: boolean;
		companyHas100PlusEmployees: boolean;
		employerIsProprietorship: boolean;
		employerSharesFinancials: boolean;
		isPermanentEmployee: boolean;
		twoYearsWithSameEmployer: boolean;
		threeYearsTotalExperience: boolean;
		hasProvidentFund: boolean;
		salaryInBankAccount: boolean;
		receivesBonus: boolean;
		receivesSalarySlip: boolean;
		hasHigherEducation: boolean;
	};

	governmentProfile?: {
		isCentralGovt: boolean;
		isDefense: boolean;
		isStateGovt: boolean;
		isPermanent: boolean;
		isContractual: boolean;
		probationCompleted: boolean;
		twoYearsService: boolean;
		noDisciplinaryAction: boolean;
		nonAccessiblePosting: boolean;
		verificationPossible: boolean;
		alternateAddressAvailable: boolean;
		receivesBonus: boolean;
		pensionEligible: boolean;
		receivesSalarySlip: boolean;
		filesITR: boolean;
		ownsProperty: boolean;
		hasOtherIncome: boolean;
	};

	professionType?: string;
	hasBarCouncilChamber?: boolean;
	businessType?: string;

	businessProfile?: {
		gstRegistered: boolean;
		hasCurrentAccount: boolean;
		usesSavingsAccount: boolean;
		filesITRRegularly: boolean;
		profitableLast3Years: boolean;
		profitableSinceStart: boolean;
		majorCashSales: boolean;
		fewKeyClients: boolean;
		hasCCOD: boolean;
		hasOtherIncome: boolean;
		hasProfessionalLicense: boolean;
		hasCommercialPremises: boolean;
		ownsPremises: boolean;
		threeYearsInBusiness: boolean;
		enrolledWithProfessionalBody: boolean;
		priorExperience: boolean;
		seasonalBusiness: boolean;
	};

	gstRegistrationDate?: string;

	pensionProfile?: {
		pensionInBankAccount: boolean;
		pensionRegular: boolean;
		isGovernmentPension: boolean;
		isPSUDefensePension: boolean;
		isLifelongPension: boolean;
		isFamilyPension: boolean;
		continuesBeyond75: boolean;
		receivesPensionSlip: boolean;
		nationalizedBankAccount: boolean;
		noPensionLoanDeduction: boolean;
		hasOtherIncome: boolean;
		ownsProperty: boolean;
		spousePensionApplicable: boolean;
		filesITR: boolean;
		verificationPossible: boolean;
	};

	// ═══════════════════════════════════════════════════════════════════════
	// INCOME DETAILS
	// ═══════════════════════════════════════════════════════════════════════

	grossIncome?: number;
	netIncome?: number;
	monthlyOtherIncome?: number;
	incomeEntries?: CleanIncomeEntry[];
	financials?: FinancialsData;
	averageBankBalance?: number;
	averageCashAmount?: number;

	// ═══════════════════════════════════════════════════════════════════════
	// CREDIT PROFILE
	// ═══════════════════════════════════════════════════════════════════════

	creditScore: number;

	lowCreditReasons?: {
		delayedEMI: boolean;
		highCreditUtilization: boolean;
		noCreditHistory: boolean;
		minimumDueOnly: boolean;
		multipleEnquiries: boolean;
		coApplicantDefault: boolean;
		loanDefault: boolean;
		onlyUnsecuredLoans: boolean;
	};

	// ═══════════════════════════════════════════════════════════════════════
	// EXISTING OBLIGATIONS
	// ═══════════════════════════════════════════════════════════════════════

	hasExistingObligations: boolean;
	obligations?: ObligationEntry[];

	/** Whether applicant has no_current_income selected */
	isNonEarning?: boolean;
	/** Reason for no income (homemaker, student, retired_no_pension, between_jobs, dependent_minor) */
	noIncomeReason?: string;

	// ═══════════════════════════════════════════════════════════════════════
	// COMPANY SPECIFIC
	// ═══════════════════════════════════════════════════════════════════════

	// ═══════════════════════════════════════════════════════════════════════
	// UNSECURED BUSINESS / PROFESSIONAL PROFILE (E2E fill)
	// ═══════════════════════════════════════════════════════════════════════

	/** Business entity type: Proprietorship, Partnership, LLP, Pvt Ltd, etc. */
	businessEntityType?: string;
	/** Industry sector: Trading, Manufacturing, Services, etc. */
	businessIndustrySector?: string;
	/** Business vintage: <1yr, 1-3yr, 3-5yr, 5-10yr, 10+yr */
	businessVintage?: string;
	/** GST registration status: REGISTERED, NOT_REGISTERED, EXEMPT */
	gstRegistrationStatus?: string;
	/** Annual turnover range: BELOW_50L, 50L_1CR, 1CR_5CR, etc. */
	annualTurnoverRange?: string;
	/** Employee count range: 1_10, 11_50, 51_200, 200+ */
	numberOfEmployees?: string;
	/** Banks where current account is held (multi-select) */
	banksOfCurrentAccount?: string[];

	// ═══════════════════════════════════════════════════════════════════════
	// COMPANY SPECIFIC
	// ═══════════════════════════════════════════════════════════════════════

	companyName?: string;
	companyType?: string;
	companyAge?: number;
	companyOfficeProximity?: string;
	companyOwnedProperties?: string;
	companyOfficeState?: string;
	companyOfficeCity?: string;
	companyOfficePincode?: string;
	directors?: DirectorInfo[];

	/** Derived family-control analysis (populated by payloadEnricher) */
	companyProfile?: {
		familyControlled: boolean;
		familyStakePercent: number;
		familyDominance: 'HIGH' | 'MEDIUM' | 'LOW';
		familyClusterSize: number;
		totalDirectors: number;
		outsiderCount: number;
		familyClusterIds: string[];
	};

	// ═══════════════════════════════════════════════════════════════════════
	// NRI SPECIFIC
	// ═══════════════════════════════════════════════════════════════════════

	gpaDetails?: GPADetails;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAN TRANSACTION PAYLOAD
// ─────────────────────────────────────────────────────────────────────────────

export interface LoanTransactionPayload {
	loanName: string;
	loanType: string;
	numberOfApplicants: number;
	applicationStructure?: string;

	// Case intake (shared page 0 — all 6 loan types)
	/** fresh | rejected | sanctioned_not_disbursed | unknown */
	assessmentStatus?: string;
	/** Lenders involved (when rejected or sanctioned) */
	assessmentLenders?: string[];
	/** Rejection reasons (when rejected) */
	rejectionReasons?: string[];
	/** Sanction-not-disbursed reasons */
	sanctionNotDisbursedReasons?: string[];

	/**
	 * Facility type — drives obligation classification + UI mapping.
	 * "Term Loan" | "Overdraft (OD)" | "Drop-line OverDraft (DOD)"
	 *   | "Flexi Drop-line OverDraft (Flexi DOD)" | "Cash Credit (CC)"
	 * Set by LAP and the three unsecured loans (Personal / Business / Professional)
	 * via the shared first page. Undefined for Home Loan and Plot Loan (which don't
	 * have a facility-structure axis).
	 */
	facilityType?: string;

	/**
	 * Loan variant — subproduct axis. Currently used only by Plot Loan.
	 * "Plot Loan Only" | "Plot & Construction Loan" | "Plot & Equity Loan"
	 *   | "Construction Loan Only"
	 * Empty / undefined for every other loan family.
	 */
	loanVariant?: string;

	// Property details (secured loans)
	propertyIdentified?: boolean;
	propertyState?: string;
	propertyCity?: string;
	propertyPincode?: string;
	propertyType?: string;
	purchaseType?: string;
	constructionStatus?: string;
	propertyStage?: string;
	propertyComplianceStatus?: 'fully_compliant' | 'authorized_not_per_plan' | 'not_authorized';
	propertyRegistered?: boolean;
	propertyCost?: number;
	atsValue?: number;
	downPayment?: number;
	/** Pre-sanction basis (property not identified): "Based On Eligibility" | "Based on Downpayment" */
	sanctionType?: string;
	/** Pre-sanction PL-bridge opt-in (property not identified): "Yes" | "No" */
	withPersonalLoan?: string;
	/** Age range of the property: "0-5", "6-10", "11-15", "16-20", "21-25", "26-30", "30+" */
	propertyAge?: string;

	// Residence
	residenceSameAsProperty?: boolean;
	/** Are any applicants residing in the mortgaged property? (LAP) */
	applicantResidingInProperty?: boolean;
	/** Property occupancy status when no applicant resides there (LAP) */
	propertyOccupancyStatus?: string;
	residenceState?: string;
	residenceCity?: string;
	/** Business/practice location state (Business + Professional loans) */
	businessState?: string;
	/** Business/practice location city (Business + Professional loans) */
	businessCity?: string;

	// Loan amount & tenure
	loanAmount: number;
	tenureYears: number;

	// Balance transfer
	currentBank?: string;
	principalOutstanding?: number;
	currentInterestRate?: number;
	remainingTenure?: number;
	currentEMI?: number;
	sixMonthsAfterRegistry?: boolean;
	currentPropertyValue?: number;
	newTenure?: number;

	// Top-up
	topUpAmount?: number;
	topUpTenure?: number;

	// NRI
	hasNRIApplicant?: boolean;

	// Bank preferences
	preferredBanks?: string[];
	excludedBanks?: string[];

	// LAP-specific
	carpetArea?: number;
	carpetAreaUnit?: string;
	carpetAreaRaw?: number;
	propertyAreaType?: string;
	/** Society/association status in planned areas (LAP) */
	societyStatus?: string;
	/** Pending society/authority dues (LAP) */
	pendingSocietyDues?: string;
	/** Approach road width — non-planned areas (LAP) */
	approachRoadWidth?: string;
	/** Restricted/negative zone classification — non-planned areas (LAP) */
	restrictedZone?: string;
	/** Flood/disaster zone status (LAP) */
	floodDisasterZone?: string;
	leaseRemainingPeriod?: string;
	existingEncumbrance?: string;
	ocCcAvailable?: string;
	municipalApproval?: string;
	rentalIncome?: number;
	loanPurpose?: string;

	// LAP-specific
	categoryOfProperty?: string;
	builtArea?: number;

	// Plot-specific
	plotAge?: string;
	plotArea?: number;
	plotAreaUnit?: string;
	plotAreaRaw?: number;
	plotBoundaryStatus?: string;
	landUseClassification?: string;
	developmentAuthority?: string;

	// BT track record
	loanVintage?: string;
	repaymentTrack?: string;

	// DOD
	dodMonthlyWithdrawal?: number;

	// ── Home Loan Redesign: Three-Cost Model ──
	/** Current market value (for LTTV calculation) */
	marketValue?: number;
	/** Registry/documented value (for LCR calculation) */
	registryValue?: number;
	/**
	 * Plot & Equity Loan only: off-paper cash demand from seller
	 * (= marketValue − registryValue). Derived in payload builder.
	 * Surfaces the gap that drives the buyer's net out-of-pocket calc.
	 * Engine (Phase 2) + offer-card UI (Phase 4) consume this. See ADR-0025.
	 */
	sellerCashComponent?: number;
	/** Advance already paid to seller per agreement (deducted from LCR disbursement) */
	advanceInAgreement?: number;

	// ── Home Loan Redesign: BT Existing Loan Signals ──
	/** BT: Floating / Fixed / Unknown */
	interestRateType?: string;
	/** BT loan-specific EMI bounce track: 0 / 1 / 2 / 3+ */
	emiBounceHistory?: string;
	/** Original sanction amount of existing loan */
	sanctionAmount?: number;
	/** Top-up purpose: RENOVATION / EXTENSION / FURNISHING / etc. */
	topUpPurpose?: string;
	/** Derived: months since loan disbursement */
	loanVintageMonths?: number;

	// ── Home Loan Redesign: New Signals ──
	/** When is property registration planned */
	registryTimeline?: string;
	/** STANDARD / AUCTION_AWARE / AUCTION_UNAWARE */
	auctionPropertyStatus?: string;
	/** First assessment / 1-2 lenders / 3+ / Previously rejected */
	priorAssessmentHistory?: string;

	// ── Area-Specific Property Compliance & Legal ──
	/** RERA registration: REGISTERED, NOT_REGISTERED, EXEMPT, UNKNOWN */
	reraRegistrationStatus?: string;
	/** NA conversion: REGISTERED, APPLIED, NOT_STARTED (derived from Q1b for CONVERTED_RESIDENTIAL) */
	naConversionStatus?: string;
	/** Zone: RESIDENTIAL, COMMERCIAL, MIXED_USE */
	zoneClassification?: string;
	/** Municipal tax: PAID_REGULAR, PAID_IRREGULAR, UNPAID, UNKNOWN */
	municipalTaxStatus?: string;
	/** Unauthorized additions: NONE, MINOR, MAJOR, UNKNOWN */
	unauthorizedAdditions?: string;
	/** Revenue records: AVAILABLE_CURRENT, AVAILABLE_OUTDATED, NOT_AVAILABLE, UNKNOWN */
	revenueRecordStatus?: string;
	/** Colony regularization: REGULARIZED, PENDING, NOT_REGULARIZED, UNKNOWN */
	colonyRegularizationStatus?: string;
	/** GP permission: YES, NO, NOT_REQUIRED, UNKNOWN */
	gramPanchayatPermission?: string;
	/** Title chain: CLEAR, PARTIAL_GAPS, UNCLEAR, UNKNOWN */
	titleChainStatus?: string;
	/** EC status: CLEAR, ENCUMBERED, NOT_OBTAINED, UNKNOWN */
	encumbranceCertStatus?: string;
	/** Succession: NOT_INHERITED, SUCCESSION_COMPLETE, SUCCESSION_PENDING, UNKNOWN */
	successionStatus?: string;
	/** Revenue mutation: MUTATED, MUTATION_PENDING, NOT_MUTATED, NOT_REQUIRED */
	revenueRecordMutation?: string;

	// ── Seller & Transaction Details ──
	/** Who is selling: SOLE_OWNER, JOINT_OWNERS, INHERITED, POA_HOLDER */
	sellerOwnershipType?: string;
	/** POA registration: REGISTERED, NOT_REGISTERED, UNKNOWN */
	poaRegistrationStatus?: string;
	/** How seller acquired: PURCHASED, INHERITED, GIFT_DEED, GOVT_ALLOTMENT, AGREEMENT_POA */
	propertyAcquisitionMethod?: string;
	/** Agreement+POA: both parties willing to register first? YES / NO */
	agreementPoaRegistryWilling?: string;
	/** Agreement+POA: DSA knows an NBFC? Yes / No */
	agreementPoaNbfcKnown?: string;
	/** Agreement+POA: which NBFC (free text) */
	agreementPoaNbfcName?: string;
	/** When was registry done: underSixMonths, underOneYear, underTwoYears, moreThanTwoYears */
	lastRegistryDuration?: string;
	/** Is any demand from builder due? Yes / No */
	isAnyBuilderDemand?: string;

	// ── Documentation & Legal Readiness (E2E fill) ──
	/** Multi-select: document readiness codes per area type */
	documentationReadiness?: string[];
	/** NOC from previous lender obtained (BT/Top-up) */
	nocFromPreviousLender?: string;
	/** When was the BT loan originally disbursed (YYYY-MM) */
	loanDisbursementDate?: string;
	/** Number of EMIs paid on BT loan */
	btEmisPaid?: number;
	/** BT loan account number */
	loanAccountNumber?: string;

	// ── LAP Legal Details (E2E fill) ──
	/** Are original property documents available */
	originalDocumentsAvailable?: string;
	/** Is the ownership chain complete and traceable */
	ownershipChainComplete?: string;
	/** Any legal dispute on property */
	noLegalDispute?: string;
	/** Has EC been verified by legal */
	encumbranceCertificateVerified?: string;
	/** Rental agreement type: REGISTERED / UNREGISTERED / NONE */
	rentalAgreementType?: string;

	// ── Unsecured Loan Common Fields (E2E fill) ──
	/** How urgent is the loan need */
	urgencyLevel?: string;
	/** Does applicant have existing bank relationship */
	existingBankRelationship?: string;
	/** Which bank for debt consolidation */
	dcExistingBank?: string;

	// ── Authority Purchase Fields (direct_from_authority) ──
	/** Which development authority issued the allotment */
	authorityName?: string;
	/** Original allotment letter status: ORIGINAL / COPY / PENDING / NOT_AVAILABLE */
	allotmentLetterStatus?: string;
	/** When was the property allotted by the authority */
	allotmentDate?: string;
	/** Authority payment status: FULLY_PAID / PARTIALLY_PAID / NOT_PAID */
	authorityPaymentStatus?: string;
	/** Possession certificate status: POSSESSION_CERT / TDR / NOT_ISSUED */
	possessionCertificateStatus?: string;
	/** Authority dues status: NO_DUES / MINOR / MAJOR / UNKNOWN */
	authorityDuesStatus?: string;

	// ── Property Usage ──
	/** Intended use of the property: SELF_USE / INVESTMENT / RENTAL / COMMERCIAL */
	propertyUsageIntent?: string;

	// ── V2 Seller Loan Fields (enricher reads for backward compat derivations) ──
	/** Is the seller's property currently on loan? Yes / No */
	sellerOnLoan?: string;
	/** Seller's outstanding loan amount (numeric) */
	sellerOutstandingAmount?: number;
	/** Which bank holds the seller's loan */
	sellerCurrentLender?: string;

	// ── V2 BT Merged Question (enricher splits into possession + demand) ──
	/** Combined possession & demand status for BT authority purchases */
	bt_possessionAndDemandStatus?: string;

	// ── Mortgage Year Customization ──
	/** Custom mortgage year when mortgageYear = "OTHER" */
	mortgageYearCustom?: string;
	/** Unsecured loan tenure (alias — enricher normalizes to mortgageYear) */
	loanTenure?: number;

	// ── Property Dispute (V2 merged — enricher derives noLegalDispute) ──
	/** Property dispute status: CLEAR / PENDING / DISPUTED */
	propertyDisputeStatus?: string;

	// ── Enricher-Derived Fields (written back to loanTransaction for backward compat) ──
	/** Derived: is property currently on loan (from sellerOnLoan) */
	isPropertyOnLoan?: string;
	/** Derived: foreclosure amount needed (from sellerOutstandingAmount) */
	foreclosureAmount?: number;
	/** Derived: seller's current lender name (from sellerCurrentLender) */
	sellerLoanBankName?: string;
	/** Derived: is authority possession offered (from bt_possessionAndDemandStatus) */
	isPossessionOfferedByAuthority?: string;
	/** Derived: resolved mortgage year (from mortgageYear + mortgageYearCustom) */
	effectiveMortgageYear?: number | string;
	/** Derived: is defaulter (from applicant creditHistoryStatus) */
	isDefaulter?: string;
	/** Derived: was made guarantor (from applicant creditHistoryStatus) */
	madeGuarantor?: string;
	/** Derived: approved by authority (from propertyComplianceStatus) */
	approvedByAuthority?: string;
	/** Derived: as per approved map (from propertyComplianceStatus) */
	asPerMap?: string;
	/** Derived: payslips available (from incomeDocAvailable) */
	payslips?: string;
	/** Derived: Form 16 available (from incomeDocAvailable) */
	Form16Available?: string;
	/** Derived: ATS differs from property value */
	isDifferATSAndPropertyValue?: boolean;
	/** Derived: is non-RERA under construction */
	isNonRERA_UC?: boolean;
	/** Derived: is authority purchase */
	isAuthorityPurchase?: boolean;
	/** Derived: is endorsement purchase */
	isEndorsement?: boolean;
	/** Derived: auction property flag (Yes/No from auctionPropertyStatus) */
	auctionedProperty?: string;
	/** Derived: understands as-is basis for auction (from auctionPropertyStatus) */
	understandsAsIsBasis?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FINAL PAYLOAD STRUCTURES
// ─────────────────────────────────────────────────────────────────────────────

export interface LoanApplicationPayload {
	loanTransaction: LoanTransactionPayload;
	allApplicantDetails: ApplicantPayload[];
	/** Relationships between applicants/directors (optional — used for family control derivation) */
	relationships?: RelationshipEntry[];
}

/**
 * Structured payload — schema-driven answer groups + computed derivations.
 * Groups are dynamic Records (driven by page IDs), not fixed interfaces.
 */
export interface StructuredPayload {
	/** Schema-driven answer groups (e.g. property, loanRequirements, balanceTransfer) */
	[group: string]: Record<string, unknown> | unknown;
	/** Per-applicant structured data */
	applicants: ApplicantPayload[];
	/** Top-level relationships array */
	relationships: RelationshipEntry[];
	/** @deprecated Flat backward-compat — will be removed */
	loanTransaction: LoanTransactionPayload;
}
