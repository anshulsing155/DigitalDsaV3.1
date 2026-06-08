/**
 * CasePayload — Categorical Loan Application Data
 * ═══════════════════════════════════════════════════════════════════
 * Organizes all form data into logical categories for easy access.
 * NO visibility filtering — all raw answers included.
 * Progressive — builds up as user fills each form page.
 * ═══════════════════════════════════════════════════════════════════
 */

import type {
	RelationshipEntry,
	CleanIncomeEntry,
	ObligationEntry,
	FinancialsData
} from '$lib/utils/payloadBuilder';

// ============================================================================
// TOP-LEVEL CASE PAYLOAD
// ============================================================================

export interface CasePayload {
	/** Pre-qualification screening answers */
	screening: CaseScreening;
	/** Property details (secured loans only) */
	property: {
		location: CasePropertyLocation;
		technical: CasePropertyTechnical;
		legal: CasePropertyLegal;
		financial: CasePropertyFinancial;
	};
	/** Seller/builder information */
	seller: CaseSeller;
	/** Loan request details */
	loan: CaseLoanDetails;
	/** Balance transfer details (null if N/A) */
	balanceTransfer: CaseBalanceTransfer | null;
	/** Top-up details (null if N/A) */
	topUp: CaseTopUp | null;
	/** All applicants with categorical sub-objects */
	applicants: CaseApplicant[];
	/** Inter-applicant relationships */
	relationships: RelationshipEntry[];
	/** Computed intelligence for credit decision-making */
	derived: CaseDerivedInsights;
	/** Complete unfiltered dump — safety net */
	_raw: {
		loanAnswers: Record<string, unknown>;
		applicants: Record<string, unknown>[];
		applicationData: Record<string, unknown>;
	};
}

// ============================================================================
// SCREENING
// ============================================================================

export interface CaseScreening {
	/** Has any applicant been declared a defaulter by any bank/financial institution? */
	isDefaulter: boolean | null;
	/** Has any applicant been made a guarantor for a defaulted loan? */
	madeGuarantor: boolean | null;
	/** Has the applicant applied for a similar loan before? (for unsecured) */
	priorApplication: string | null;
	/** Is the property in a flood-prone/disaster zone? (secured loans) */
	floodProne: boolean | null;
	/** Are recent payslips available? */
	payslipsAvailable: boolean | null;
}

// ============================================================================
// PROPERTY — LOCATION
// ============================================================================

export interface CasePropertyLocation {
	/** Has the applicant identified a property? */
	identified: boolean | null;
	/** State where the property is located */
	state: string | null;
	/** City where the property is located */
	city: string | null;
	/** Property pincode */
	pincode: string | null;
	/** Is the applicant's current residence same as property location? (Home/Plot) */
	residenceSameAsProperty: boolean | null;
	/** Are any applicants residing in the mortgaged property? (LAP) */
	applicantResidingInProperty: boolean | null;
	/** Current occupancy status if no applicant resides there (LAP) */
	propertyOccupancyStatus: string | null;
	/** Residence state (if different from property) */
	residenceState: string | null;
	/** Residence city (if different from property) */
	residenceCity: string | null;
}

// ============================================================================
// PROPERTY — TECHNICAL
// ============================================================================

export interface CasePropertyTechnical {
	/** Type: Flat, Independent House, Villa, Plot, Commercial */
	type: string | null;
	/** Transaction: Direct Sale, Resale */
	purchaseType: string | null;
	/** Construction: Ready to Move, Under Construction, Plot + Construction */
	constructionStatus: string | null;
	/** Stage: Foundation, Plinth, Superstructure, Finishing, Complete */
	stage: string | null;
	/** Age of property in years */
	age: number | null;
	/** Area classification: PLANNED_AUTHORITY, CONVERTED_RESIDENTIAL, etc. */
	areaType: string | null;
	/** Built-up/carpet area (normalized to sq ft) */
	carpetArea: number | null;
	/** Original area unit: Feet, Meter, Yard */
	carpetAreaUnit: string | null;
	/** Original area value before normalization */
	carpetAreaRaw: number | null;
	/** Approved by local authority (MC/HUDA/etc.) */
	approvedByAuthority: boolean | null;
	/** Construction as per approved map */
	asPerApprovedMap: boolean | null;
}

// ============================================================================
// PROPERTY — LEGAL
// ============================================================================

export interface CasePropertyLegal {
	/** Whether property is registered */
	registered: boolean | null;
	/** Occupancy status */
	occupancyStatus: string | null;
	/** Is property currently on loan / mortgaged */
	onLoan: boolean | null;
	/** Builder registered with RERA */
	reraRegistered: boolean | null;
	/** Builder type: National, Local, Authority */
	builderType: string | null;
	/** OC/CC availability: BOTH, CC_ONLY, NONE, UNKNOWN */
	ocCcAvailable: string | null;
	/** Municipal building plan approval: APPROVED, PARTIAL, NO_PLAN, UNKNOWN */
	municipalApproval: string | null;
	/** Remaining lease period for leasehold properties */
	leaseRemainingPeriod: string | null;
	/** Existing encumbrance/mortgage on property */
	existingEncumbrance: string | null;
	/** Is it an auctioned property? */
	auctionedProperty: boolean | null;
	/** Buyer understands as-is basis for auction property */
	understandsAsIsBasis: boolean | null;

	// ── Area-Specific Compliance & Legal ──
	/** RERA registration status */
	reraRegistrationStatus: string | null;
	/** NA conversion order status */
	naConversionStatus: string | null;
	/** Zone classification */
	zoneClassification: string | null;
	/** Municipal tax payment status */
	municipalTaxStatus: string | null;
	/** Unauthorized additions extent */
	unauthorizedAdditions: string | null;
	/** Revenue records (7/12) status */
	revenueRecordStatus: string | null;
	/** Colony regularization status */
	colonyRegularizationStatus: string | null;
	/** Gram Panchayat permission */
	gramPanchayatPermission: string | null;
	/** Title chain status */
	titleChainStatus: string | null;
	/** Encumbrance certificate status */
	encumbranceCertStatus: string | null;
	/** Succession documentation status */
	successionStatus: string | null;
	/** Revenue record mutation status */
	revenueRecordMutation: string | null;
}

// ============================================================================
// PROPERTY — FINANCIAL
// ============================================================================

export interface CasePropertyFinancial {
	/** Property cost / deal value */
	cost: number | null;
	/** Value as per ATS (Agreement to Sell) */
	atsValue: number | null;
	/** Is there a difference between ATS value and property cost */
	isDifferentAtsAndCost: boolean | null;
	/** Is ATS document ready */
	isAtsReady: boolean | null;
	/** Down payment by applicant */
	downPayment: number | null;
	/** Monthly rental income from property */
	rentalIncome: number | null;
	/** Current market value (used in BT/LAP) */
	currentValue: number | null;
	/** Market value for LTTV calculation (Home Loan Redesign) */
	marketValue: number | null;
	/** Registry/documented value for LCR calculation (Home Loan Redesign) */
	registryValue: number | null;
}

// ============================================================================
// SELLER
// ============================================================================

export interface CaseSeller {
	/** Who is selling: Individual, Builder, Authority */
	purchasedFrom: string | null;
	/** Builder's full name */
	builderName: string | null;
	/** Authority's full name */
	authorityName: string | null;
	/** Is the seller an NRI? */
	isNRI: boolean | null;
	/** Does seller's property have an existing loan? */
	propertyOnLoan: boolean | null;
	/** Bank name if seller's property is on loan */
	loanBankName: string | null;
	/** Foreclosure amount if seller's property has loan */
	foreclosureAmount: number | null;
	/** Seller type: SOLE_OWNER, JOINT_OWNERS, INHERITED, POA_HOLDER */
	ownershipType: string | null;
	/** POA registration status: REGISTERED, NOT_REGISTERED, UNKNOWN */
	poaRegistrationStatus: string | null;
	/** How seller acquired: PURCHASED, INHERITED, GIFT_DEED, GOVT_ALLOTMENT, AGREEMENT_POA */
	acquisitionMethod: string | null;
	/** Agreement+POA: willing to register first? YES / NO */
	agreementPoaRegistryWilling: string | null;
	/** Agreement+POA: DSA knows NBFC? Yes / No */
	agreementPoaNbfcKnown: string | null;
	/** Agreement+POA: NBFC name (free text) */
	agreementPoaNbfcName: string | null;
	/** When was registry done */
	lastRegistryDuration: string | null;
	/** Is builder demand pending */
	isAnyBuilderDemand: string | null;
}

// ============================================================================
// LOAN DETAILS
// ============================================================================

export interface CaseLoanDetails {
	/** Loan product: Home Loan, LAP, Plot Loan, Personal Loan, Business Loan, Professional Loan */
	name: string;
	/** Loan variant: New Loan, Balance Transfer, Top-up, Balance Transfer With Top-up */
	type: string;
	/** Requested loan amount */
	amount: number | null;
	/** Requested tenure in years */
	tenureYears: number | null;
	/** Purpose of loan: BUSINESS_EXPANSION, PERSONAL_NEEDS, DEBT_CONSOLIDATION, etc. */
	purpose: string | null;
	/** Who is applying: Individual, Couple, Family */
	applicationStructure: string | null;
	/** Number of applicants */
	numberOfApplicants: number;
	/** Expected monthly withdrawal for Drop-line OD */
	dodMonthlyWithdrawal: number | null;
	/** Any applicant is NRI */
	hasNRIApplicant: boolean;
	/** Banks selected by user */
	preferredBanks: string[];
}

// ============================================================================
// BALANCE TRANSFER
// ============================================================================

export interface CaseBalanceTransfer {
	/** Current bank holding the loan */
	currentBank: string | null;
	/** Outstanding principal on existing loan */
	principalOutstanding: number | null;
	/** Current interest rate */
	interestRate: number | null;
	/** Remaining tenure in months */
	remainingTenure: number | null;
	/** Current EMI amount */
	currentEMI: number | null;
	/** 6 months passed after property registration? */
	sixMonthsAfterRegistry: boolean | null;
	/** Current property market value */
	currentPropertyValue: number | null;
	/** New tenure requested */
	newTenure: number | null;
	/** How long loan has been with current lender */
	loanVintage: string | null;
	/** Repayment track: CLEAN, MINOR_IRREGULAR, MAJOR_IRREGULAR */
	repaymentTrack: string | null;
	/** Interest rate type: FLOATING / FIXED / UNKNOWN (Home Loan Redesign) */
	interestRateType: string | null;
	/** EMI bounce history on BT loan: 0 / 1 / 2 / 3+ (Home Loan Redesign) */
	emiBounceHistory: string | null;
	/** Original disbursement date YYYY-MM (Home Loan Redesign) */
	loanDisbursementDate: string | null;
	/** Derived: months since disbursement (Home Loan Redesign) */
	loanVintageMonths: number | null;
	/** Original sanction amount (Home Loan Redesign) */
	sanctionAmount: number | null;
}

// ============================================================================
// TOP-UP
// ============================================================================

export interface CaseTopUp {
	/** Top-up amount requested */
	amount: number | null;
	/** Top-up tenure in years */
	tenureYears: number | null;
	/** Top-up purpose: RENOVATION / EXTENSION / FURNISHING / etc. (Home Loan Redesign) */
	purpose: string | null;
}

// ============================================================================
// APPLICANT (CATEGORICAL)
// ============================================================================

export interface CaseApplicant {
	/** Personal / identity details */
	personal: CaseApplicantPersonal;
	/** Income details */
	income: CaseApplicantIncome;
	/** Existing obligations / EMIs */
	obligations: CaseApplicantObligations;
	/** Credit score and reasons */
	cibil: CaseApplicantCibil;
}

// ============================================================================
// APPLICANT — PERSONAL
// ============================================================================

export interface CaseApplicantPersonal {
	/** Individual or Company */
	applicantType: 'Individual' | 'Company';
	/** Derived title: Mr., Ms., Mrs. */
	title: string | null;
	/** Full name */
	fullName: string;
	/** Age in years */
	age: number;
	/** Gender */
	gender: string;
	/** Marital status */
	maritalStatus: string;
	/** Role: Primary, Co-applicant, Guarantor */
	role: string;
	/** Relationship with primary (for co-applicants) */
	relationship: string | null;
	/** Other relationship description */
	otherRelationship: string | null;
	/** Type of residence: Owned, Rented, Company Provided, Family Owned */
	residenceType: string | null;
	/** Is applicant NRI? */
	isNRI: boolean;
	/** Company name (company applicants) */
	companyName: string | null;
	/** Company type: Private Limited, LLP, etc. */
	companyType: string | null;
	/** Company age in years */
	companyAge: number | null;
	/** Company office proximity to property: SAME_CITY / DIFFERENT_CITY / DIFFERENT_STATE */
	companyOfficeProximity: string | null;
	/** Properties owned by the company: 0 / 1 / 2 / 3+ */
	companyOwnedProperties: string | null;
	/** Directors list (company applicants) */
	directors: Array<{
		name: string;
		age: number;
		designation?: string;
		sharePercent?: number | null;
		location?: string;
		isCoApplicant?: boolean;
		cibil?: number;
	}>;
	/** GPA holder details (NRI applicants) */
	gpaDetails: { fullName: string; age: number; relationship: string; address?: string } | null;
	/** Education level */
	education: string | null;
	/** Religion */
	religion: string | null;
	/** SC/ST category: General / OBC / SC / ST (null if not Hindu) */
	casteCategory: string | null;
	/** Person with disability: Yes / No */
	hasDisability: string | null;
	/** Residence pattern: SAME_CITY / DIFFERENT_CITY / DIFFERENT_STATE */
	applicantResidencePattern: string | null;
	/** Owned residential properties: 0 / 1 / 2 / 3+ */
	ownedResidentialProperties: string | null;
	/** Applicant residence state (when not same city) */
	applicantResidenceState: string | null;
	/** Applicant residence city (when not same city) */
	applicantResidenceCity: string | null;
	/** Applicant residence pincode (when not same city) */
	applicantResidencePincode: string | null;
	/** Company office state (when not same city) */
	companyOfficeState: string | null;
	/** Company office city (when not same city) */
	companyOfficeCity: string | null;
	/** Company office pincode (when not same city) */
	companyOfficePincode: string | null;
	/** NRI country of residence */
	nriCountry: string | null;
}

// ============================================================================
// APPLICANT — INCOME
// ============================================================================

export interface CaseApplicantIncome {
	/** Primary employment category */
	employmentType: string;
	/** Monthly gross income (salaried) */
	grossIncome: number | null;
	/** Monthly net income (salaried) */
	netIncome: number | null;
	/** Monthly other income */
	monthlyOtherIncome: number | null;
	/** Average bank balance (self-employed) */
	averageBankBalance: number | null;
	/** Average cash amount (self-employed) */
	averageCashAmount: number | null;
	/** Structured income entries from income profiling */
	incomeEntries: CleanIncomeEntry[];
	/** Salaried (Private) activity profile */
	salariedProfile: Record<string, boolean> | null;
	/** Government employee activity profile */
	governmentProfile: Record<string, boolean> | null;
	/** Business/Professional activity profile */
	businessProfile: Record<string, boolean> | null;
	/** Pensioner activity profile */
	pensionProfile: Record<string, boolean> | null;
	/** Profession type (Self-employed Professional) */
	professionType: string | null;
	/** Business type (Self-employed Other) */
	businessType: string | null;
	/** GST registration date */
	gstRegistrationDate: string | null;
	/** Has Bar Council chamber (lawyers) */
	hasBarCouncilChamber: boolean | null;
	/** Year-wise financials (self-employed) */
	financials: FinancialsData | null;
}

// ============================================================================
// APPLICANT — OBLIGATIONS
// ============================================================================

export interface CaseApplicantObligations {
	/** Whether applicant has running obligations */
	hasExisting: boolean;
	/** All obligation entries (term loans + credit lines) */
	entries: ObligationEntry[];
}

// ============================================================================
// APPLICANT — CIBIL
// ============================================================================

export interface CaseApplicantCibil {
	/** CIBIL score (300-900, 0 = no history) */
	score: number;
	/** Reasons for low credit score */
	lowScoreReasons: Record<string, boolean> | null;
	/** Per-applicant credit history: clean / defaulter / guarantor / both */
	creditHistoryStatus: string | null;
	/** EMI bounce count: 0 / 1 / 2 / 3+ */
	emiBounceCount: string | null;
	/** Default/settlement status: CLEAN / SETTLED / WRITTEN_OFF / ACTIVE_DEFAULT */
	defaultSettlementStatus: string | null;
	/** Recent enquiry count (last 2 months): 0 / 1_2 / 3_5 / 6+ */
	recentEnquiryCount: string | null;
	/** Bounce reason explanation */
	bounceReason: string | null;
	/** Default reason explanation */
	defaultReason: string | null;
	/** Enquiry reason explanation */
	enquiryReason: string | null;
}

// ============================================================================
// DERIVED INSIGHTS — PER APPLICANT
// ============================================================================

export interface CaseDerivedApplicant {
	// ── Income Analysis ─────────────────────────────
	/** Sum of all income entries (gross monthly) */
	totalMonthlyIncome: number | null;
	/** Number of active income sources */
	incomeSourceCount: number;
	/** Dominant income profile type (e.g. "salaried_regular") */
	primaryIncomeType: string | null;
	/** All income entries have documentary evidence */
	hasDocumentaryEvidence: boolean;
	/** All income entries have ITR filed */
	itrCompliance: boolean;

	// ── Obligation / FOIR Analysis ──────────────────
	/** Sum of all monthly EMIs + 5% of credit line limits */
	totalMonthlyObligations: number | null;
	/** Number of active obligations */
	obligationCount: number;
	/** Fixed Obligation to Income Ratio (0.00-1.00) */
	foir: number | null;
	/** Income minus obligations */
	netDisposableIncome: number | null;
	/** How much monthly obligations drop if "selectedToClose" items removed */
	closureRelief: number | null;

	// ── Age & Tenure ────────────────────────────────
	/** age + tenureYears */
	ageAtMaturity: number | null;
	/** retirementAge - age (58 salaried, 65 self-emp, 70 pension) */
	yearsToRetirement: number | null;
	/** min(30, retirementAge - age) */
	maxTenureByAge: number | null;

	// ── Credit Risk Band ────────────────────────────
	/** Derived from CIBIL score */
	creditRiskBand: 'excellent' | 'good' | 'fair' | 'poor' | 'no_history' | null;
	/** No existing obligations = first time borrower */
	isFirstTimeBorrower: boolean;

	// ── Stability Signals ───────────────────────────
	/** Salaried: permanent + 2yr same employer + reputed org + salary in bank */
	isSalariedStable: boolean;
	/** Business: 3yr+ + GST + ITR + profitable last 3 years */
	isBusinessEstablished: boolean;
	/** Pension: govt pension + lifelong + pension in bank */
	isPensionSecure: boolean;
	/** All income sources have documentary evidence + ITR */
	hasVerifiableIncome: boolean;
}

// ============================================================================
// DERIVED INSIGHTS — LOAN LEVEL
// ============================================================================

export interface CaseDerivedInsights {
	/** Per-applicant computed metrics */
	applicants: CaseDerivedApplicant[];

	// ── Combined (all applicants) ───────────────────
	/** Sum of all applicants' totalMonthlyIncome */
	combinedMonthlyIncome: number | null;
	/** Sum of all applicants' totalMonthlyObligations */
	combinedMonthlyObligations: number | null;
	/** Combined obligations / combined income */
	combinedFOIR: number | null;
	/** Approximate EMI for requested loan at 9% (indicative) */
	estimatedEMI: number | null;
	/** (combinedObligations + estimatedEMI) / combinedIncome */
	proposedFOIR: number | null;

	// ── Property / LTV ─────────────────────────────
	/** loanAmount / propertyCost (0.00-1.00) */
	ltv: number | null;
	/** LTV > 0.80 */
	isHighLTV: boolean;
	/** ATS value differs from property cost */
	hasPropertyValueGap: boolean;
	/** (propertyCost - atsValue) / propertyCost * 100 */
	propertyValueGapPercent: number | null;

	// ── Balance Transfer ────────────────────────────
	/** currentInterestRate - assumed market rate */
	btRateDifferential: number | null;
	/** currentEMI - estimatedNewEMI */
	btEstimatedMonthlySaving: number | null;

	// ── Complexity / Risk Flags ─────────────────────
	/** Any applicant is NRI */
	hasNRIApplicant: boolean;
	/** Seller is NRI + property has loan = higher risk */
	hasSellerRisk: boolean;
	/** More than 1 applicant */
	multipleApplicants: boolean;
}
