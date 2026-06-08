/**
 * Comprehensive TypeScript types for the loan application form system.
 * These types consolidate the previously scattered definitions from:
 * - loanData.ts (Applicant type)
 * - applicationDataSchema.ts (ApplicationData via Zod)
 * - stores.ts (ApplicationData interface)
 * - types/index.ts (partial definitions)
 */

// ============================================================================
// EMPLOYMENT & COMPANY TYPES
// ============================================================================

export type EmploymentType = 'salaried' | 'self-employed' | 'student' | 'retired';

export type CompanyType =
	| 'private-limited'
	| 'public-limited'
	| 'partnership'
	| 'proprietorship'
	| 'llp'
	| 'government'
	| 'psu'
	| 'other';

export type BusinessType =
	| 'manufacturing'
	| 'trading'
	| 'services'
	| 'retail'
	| 'professional'
	| 'other';

// ============================================================================
// APPLICANT TYPES
// ============================================================================

export type ApplicantRole = 'primary' | 'co-applicant' | 'guarantor';

// Entity type - Individual or Company
export type ApplicantType = 'Individual' | 'Company';

export type Gender = 'male' | 'female' | 'other';

export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed' | 'separated';

export type Relationship =
	// Male relationships
	| 'Father'
	| 'Brother'
	| 'Son'
	| 'Husband'
	| 'Grandfather'
	| 'Grandson'
	// Female relationships
	| 'Mother'
	| 'Sister'
	| 'Daughter'
	| 'Wife'
	| 'Grandmother'
	| 'Granddaughter'
	// Extended family (in-laws)
	| 'Uncle'
	| 'Aunty'
	| 'Brother-in-law'
	| 'Sister-in-law'
	| 'Father-in-law'
	| 'Mother-in-law'
	| 'Son-in-law'
	| 'Daughter-in-law'
	| 'Nephew'
	| 'Niece'
	| 'Cousin'
	| 'Friend'
	// Other
	| 'Not in Blood Relation'
	| 'other';

/**
 * Applicant personal details
 */
export interface ApplicantDetails {
	name: string;
	age: number;
	gender?: Gender;
	maritalStatus?: MaritalStatus;
	cibilScore: number;
	income: number;
	employmentType: EmploymentType;
	email?: string;
	phone?: string;
	pan?: string;
	aadhaar?: string;
	address?: AddressInfo;
}

/**
 * Applicant document information
 */
export interface ApplicantDocuments {
	pan?: string;
	aadhaar?: string;
	proofTypesSubmitted?: string[];
	hasSurrogateIncomeLogicUsed?: boolean;
	salarySlips?: string[];
	bankStatements?: string[];
	itrReturns?: string[];
	propertyDocs?: string[];
}

/**
 * Obligation type discriminator.
 * - 'term_loan': Fixed EMI loans (Home Loan, Personal Loan, etc.)
 * - 'credit_line': Revolving credit (CC Limit, OD Limit, Dropline OD)
 */
export type ObligationType = 'term_loan' | 'credit_line';

/**
 * Loan Entry - represents an existing loan/limit entry for an applicant.
 * Used in the unified `obligations[]` array.
 */
export interface LoanEntry {
	/** Unique identifier for this entry */
	id: string;
	/** Whether this is a term loan or credit line */
	obligationType: ObligationType;
	loanType: string;
	bankName: string;
	selectedToClose: string;
	emi?: string;
	emiFormatted?: string;
	totalLimit?: string;
	totalLimitFormatted?: string;
	tenure: string;
	interestRate: string;
	remainingLimit?: string;
	remainingLimitFormatted?: string;
	remainingTenure?: string;
	/** Per-obligation EMI delay history: NONE / 1 / 2+ */
	emiDelayHistory?: string;
	utilizedAmount?: string;
	utilizedAmountFormatted?: string;
	sanctionedLimit?: string;
	sanctionedLimitFormatted?: string;
	sanctionedTenure?: string;
	/** WHO actually provides money for this EMI (relationship) */
	emiPaidBy?: string;
	/** HOW the payment is arranged when someone else pays */
	emiPaymentMode?: string;
	/** Name of the person/entity paying (optional) */
	emiPaidByName?: string;
	/** Role on this loan: Primary Borrower / Co-Borrower / Guarantor / Name Lender */
	role?: string;
	/** Capacity: Individual / As Director / As Partner / As Proprietor */
	capacity?: string;
	/** Total borrowers on this loan: '1' / '2' / '3' / '4+' */
	borrowerCount?: string;
	/** EMI deduction method: Full from my account / Full from co-borrower / etc. */
	emiMethod?: string;
	/** Is any co-borrower also an applicant in this application? */
	coApplicantInApp?: string;
	/** Index of linked applicant (when co-borrower is in this application) */
	linkedApplicant?: string;
	/** User-provided monthly EMI share (proof-based override) */
	monthlyShare?: string;
	/** Whether user has proof of a different EMI split */
	hasProofOverride?: boolean;
	/** Computed applicant EMI share for FOIR (auto-calculated or overridden) */
	applicantEmiShare?: number;
}

/**
 * Business Activity State - properties for business activity tracking
 * (Consolidated from businessTypes.ts to avoid circular dependencies)
 */
export interface BusinessActivityState {
	selectedBusinessType?: string;
	businessActivityDetails?: (string | number)[] | Record<string, boolean>;
	allBusinessActivitySelections?: Record<string, (string | number)[]>;
	globalBusinessSelections?: Record<string, boolean>;
}

// ============================================================================
// DIRECTOR / PARTNER TYPES (Company co-applicant architecture)
// ============================================================================

/** Director/Partner/Trustee info — stored on Company applicant's directors[] */
export interface DirectorInfo {
	id: string;
	fullName: string;
	gender: 'male' | 'female';
	age: number;
	maritalStatus: MaritalStatus;
	ownershipPercent: number; // 1-100
	location: 'same_city' | 'same_state' | 'different_state';
	isCoApplicant: boolean; // Derived: true if onProperty or onEMI is true
	isNRI: 'Yes' | 'No';
	onProperty: boolean | undefined;
	onEMI: boolean | undefined;
	linkedCompanyId: string;
	/** All company IDs this director is linked to (multi-company support) */
	linkedCompanyIds?: string[];
	role: 'director' | 'partner';
	/** Designation within the company — auto-set to 'managing_director' for OPC */
	designation?: DirectorDesignation;
	/** Role in the loan — only for PvtLtd/OPC directors in unsecured loans */
	loanRole?: 'co_borrower' | 'guarantor' | 'information_only';
}

/** Director role type (for Individual applicants linked to a Company) */
export type DirectorRole = 'director' | 'partner';

/** Director designation within a company */
export type DirectorDesignation =
	| 'managing_director'
	| 'director'
	| 'partner'
	| 'designated_partner'
	| '';

/** Family-control derivation result — computed from director relationship graph */
export interface FamilyControlResult {
	familyControlled: boolean;
	familyStakePercent: number;
	familyDominance: 'HIGH' | 'MEDIUM' | 'LOW';
	familyClusterSize: number;
	totalDirectors: number;
	outsiderCount: number;
	familyClusterIds: string[];
}

/**
 * Unified Applicant type — historically consolidated from:
 *   - applicantSchema.ts (Individual/Company fields, UI helpers — now archived)
 *   - formTypes.ts (Financial properties, loan entries, BusinessActivityState)
 *   - form.ts (Additional legacy properties)
 *
 * This is the CANONICAL Applicant type. All other files should import from here.
 */
export interface Applicant extends BusinessActivityState {
	// ============================================================================
	// IDENTITY & BASIC INFO
	// ============================================================================
	id?: string;
	applicantType?: ApplicantType;
	// Marks this applicant as the designated primary for rule engine + display.
	// Array order is NOT changed — use this flag instead of relying on index 0.
	isPrimaryApplicant?: boolean;
	fullName?: string;
	title?: string;

	// Age — canonical key (previously also used selectedAge)
	age?: string | number;
	applicantAge?: string | number;

	// Personal details
	gender?: Gender | 'others'; // 'others' originally from applicantSchema.ts (archived)
	maritalStatus?: MaritalStatus;

	// ── Home Loan Redesign: New Per-Applicant Fields ──
	/** Education level */
	education?: string;
	/** Religion */
	religion?: string;
	/** SC/ST category (Hindu only): General / OBC / SC / ST */
	casteCategory?: string;
	/** Person with disability: Yes / No */
	hasDisability?: string;
	/** Residence pattern relative to property: SAME_CITY / DIFFERENT_CITY / DIFFERENT_STATE */
	applicantResidencePattern?: string;
	/** Owned residential properties: 0 / 1 / 2 / 3+ */
	ownedResidentialProperties?: string;
	/** Per-applicant credit history: clean / defaulter / guarantor / both */
	creditHistoryStatus?: string;
	/** EMI bounce count: 0 / 1 / 2 / 3+ */
	emiBounceCount?: string;
	/** Default/settlement status: CLEAN / SETTLED / WRITTEN_OFF / ACTIVE_DEFAULT */
	defaultSettlementStatus?: string;
	/** Recent enquiry count (last 2 months): 0 / 1_2 / 3_5 / 6+ */
	recentEnquiryCount?: string;
	/** Bounce reason explanation */
	bounceReason?: string;
	/** Default reason explanation */
	defaultReason?: string;
	/** Enquiry reason explanation */
	enquiryReason?: string;

	// ============================================================================
	// EMPLOYMENT & COMPANY INFO
	// ============================================================================
	employmentType?: EmploymentType | string;
	companyName?: string;
	companyType?: CompanyType | string;
	businessType?: BusinessType | string;
	numberOfDirectorsOrPartners?: number | string;
	registrationCountry?: string;

	// ── Company Director Architecture (Step 0 + 0.5) ──
	/** Priming question: are any directors/partners related? */
	hasRelatedDirectors?: 'yes' | 'no';
	/** All directors/partners (co-applicant + non-co-applicant) */
	directors?: DirectorInfo[];

	// ── Company Business Profile (Step 3) ──
	industrySector?: string;
	businessVintage?: string;
	gstRegistered?: 'yes' | 'no' | 'exempted';
	gstRegistrationDate?: string;
	annualTurnover?: string;
	employeeCount?: string;
	financialIndicators?: string[];
	operationalIndicators?: string[];

	// ── Individual → Company link fields (when director/partner) ──
	linkedCompanyId?: string;
	/** All company IDs this applicant is linked to (multi-company support) */
	linkedCompanyIds?: string[];
	ownershipPercent?: number;
	directorRole?: DirectorRole;

	// ============================================================================
	// RELATIONSHIP INFO
	// ============================================================================
	relationship?: Relationship | string;
	relationwith?: string;
	yourRelationship?: string;
	otherBloodRelation?: string;
	existingRoleOfPerson?: string;
	roleOfPerson?: string;

	// ============================================================================
	// FINANCIAL DETAILS
	// ============================================================================
	// Income
	monthlyIncome?: number;
	fixedSalary?: number;
	netIncome?: number;
	grossIncome?: number;
	monthlyOtherIncome?: number;

	// Existing obligations
	existingEMIs?: number;
	obligation?: string;
	cibilScore?: number;

	// Unified obligations array (replaces tableLoanEntries + tableLimitEntries)
	obligations?: LoanEntry[];

	// @deprecated — kept as optional aliases during migration, use obligations[] instead
	tableLoanEntries?: LoanEntry[];
	tableLimitEntries?: LoanEntry[];
	totalEMIs?: number;
	totalLimit?: number;

	// Current loan form fields (temporary state during loan entry)
	currentLoanType?: string;
	currentBankName?: string;
	currentSelectedToClose?: string;
	currentEmi?: string;
	currentTotalLimit?: string;
	currentTenure?: string;
	currentInterestRate?: string;
	currentRemainingLimit?: string;
	currentUtilizedAmount?: string;
	currentSanctionedLimit?: string;
	currentSanctionedTenure?: string;
	utilizedAmount?: string;

	// ============================================================================
	// NRI & GPA DETAILS
	// ============================================================================
	isNRI?: boolean;
	whichApplicantIsNRI?: string;
	isGPA?: string;
	GPAarray?: Record<string, unknown>[];
	GPADetails?: Record<string, unknown>[];

	// ============================================================================
	// FORM STATE FLAGS
	// ============================================================================
	onEMI?: boolean;
	onProperty?: boolean;
	/** Reason for no income (when no_current_income is selected) */
	noIncomeReason?: string;
	isGuarantor?: string; // 'Yes' | 'No' — shown when Individual has onEMI=false, onProperty=false and Company exists
	/** 6-way classification: auto-derived from onEMI/onProperty/family/companyType */
	applicantClassification?: string;
	hasError?: boolean;
	shake?: boolean;
	isCompleted?: boolean;
	financialCompleted?: boolean;
	isFinancialInfoComplete?: boolean;
	isCompanyInfoComplete?: boolean;
	allStatementAnswered?: boolean;
	validationActive?: boolean;
	touchedFields?: Record<string, boolean>;
	error?: string;

	// ============================================================================
	// LOAN PURPOSE & FINANCIAL YEAR
	// ============================================================================
	purposeOfApplyingLoan?: string;
	financialYearDecision?: string;

	// ============================================================================
	// INDEX SIGNATURE
	// ============================================================================
	// Using unknown instead of any for better type safety
	// This allows additional dynamic properties while encouraging type narrowing
	[key: string]: any;
}

/**
 * Applicant with full details (from applicationDataSchema.ts)
 */
export interface SchemaApplicant {
	details: ApplicantDetails;
	documents: Partial<ApplicantDocuments>;
}

// ============================================================================
// PROPERTY TYPES
// ============================================================================

export type PropertyType = 'flat' | 'house' | 'villa' | 'plot' | 'commercial' | 'industrial';

export type PropertyTypeDetail =
	| 'new'
	| 'resale'
	| 'under-construction'
	| 'plot'
	| 'plot+construction';

export type OwnershipType = 'single' | 'joint' | 'inherited';

export type RegistrationStatus = 'registered' | 'under-process' | 'not-registered';

/**
 * Property information
 */
export interface PropertyInfo {
	city: string;
	type: string;
	cost: number;
	coOwned?: boolean;
	ownershipType?: OwnershipType;
	landAreaSqFt?: number;
	builtUpAreaSqFt?: number;
	approvalAuthority?: string;
	registrationStatus?: RegistrationStatus;
	isAgriculturalLand?: boolean;
	locationPinCode?: string;
	propertyTypeDetail?: PropertyTypeDetail;
}

/**
 * Address information
 */
export interface AddressInfo {
	line1: string;
	line2?: string;
	city: string;
	state: string;
	pincode: string;
	country?: string;
}

// ============================================================================
// LOAN TYPES
// ============================================================================

export type LoanType =
	| 'home-loan'
	| 'personal-loan'
	| 'business-loan'
	| 'car-loan'
	| 'education-loan'
	| 'gold-loan'
	| 'loan-against-property'
	| 'working-capital'
	| 'other';

export type LoanPurpose =
	| 'purchase'
	| 'construction'
	| 'renovation'
	| 'balance-transfer'
	| 'top-up'
	| 'business-expansion'
	| 'debt-consolidation'
	| 'other';

export type LoanStatus =
	| 'initiated'
	| 'incomplete'
	| 'submitted'
	| 'processing'
	| 'approved_simulated'
	| 'conditional_simulated'
	| 'rejected_simulated'
	| 'bank_approved'
	| 'bank_rejected'
	| 'verified';

export type LoanHistoryStatus = 'approved' | 'rejected' | 'disbursed' | 'cancelled';

// ============================================================================
// DOCUMENT & VERIFICATION TYPES
// ============================================================================

export type EKYCStatus = 'pending' | 'verified' | 'failed';

export type LoanUrgency = 'high' | 'medium' | 'low';

/**
 * Document profile for the application
 */
export interface DocumentProfile {
	hasPAN?: boolean;
	hasAadhaar?: boolean;
	hasSalarySlip?: boolean;
	hasITR?: boolean;
	hasBankStatement?: boolean;
	hasPropertyDocs?: boolean;
	eKYCStatus?: EKYCStatus;
}

/**
 * Loan history information
 */
export interface LoanHistory {
	hasPastRejections?: boolean;
	pastLenders?: string[];
	lastAppliedAmount?: number;
	lastApprovedAmount?: number;
	lastLoanStatus?: LoanHistoryStatus;
}

/**
 * User preferences for loan
 */
export interface LoanPreferences {
	preferredBanks?: string[];
	excludeBanks?: string[];
	minTenure?: number;
	maxInterestRate?: number;
	noProcessingFeePreferred?: boolean;
	schemesToSkip?: string[];
}

/**
 * User metadata
 */
export interface UserMetadata {
	preferredLanguage?: string;
	sessionStartTime?: string;
	sessionEndTime?: string;
	intentConfidenceScore?: number;
	selfDeclaredLoanUrgency?: LoanUrgency;
}

/**
 * AI-generated insights
 */
export interface AIInsights {
	cibilAnalysis?: string;
	riskFlagsGenerated?: string[];
	recommendedSchemes?: string[];
	rejectionReasons?: string[];
}

/**
 * Risk flags for the application
 */
export interface RiskFlags {
	missingCriticalDocs?: boolean;
	incomeMismatch?: boolean;
	inconsistentAnswers?: boolean;
	AIConfidenceLow?: boolean;
	highFraudRiskZone?: boolean;
	highDTIRatio?: boolean;
}

/**
 * Derived metrics calculated from application data
 */
export interface DerivedMetrics {
	foir?: number;
	foirGroupVsBankMaxAllowed?: Record<string, number>;
	totalFOIRIndividual?: number;
	totalFOIRGroup?: number;
	netIncomePerApplicant?: number[];
	combinedNetIncome?: number;
	combinedExistingEMIs?: number;
	calculatedLTV?: number;
	totalCreditExposure?: number;
	discretionScore?: number;
	confidenceScore?: number;
	proxyCreditRiskScore?: number;
	relationshipScore?: number;
	probabilityOfApproval?: number;
	lowestCibilScore?: number;
}

/**
 * Verification details
 */
export interface VerificationDetails {
	incomeVerified?: boolean;
	propertyVerified?: boolean;
	documentsVerified?: boolean;
	cibilVerified?: boolean;
}

/**
 * Internal status tracking
 */
export interface InternalStatus {
	status?: LoanStatus;
	lastUpdated?: string;
	processedBy?: string;
	reviewByHuman?: boolean;
	verificationDetails?: VerificationDetails;
	rejectionReasons?: string[];
}

// ============================================================================
// MAIN APPLICATION DATA TYPES
// ============================================================================

/**
 * Schema-validated application data (from applicationDataSchema.ts)
 * This is the primary data structure for loan applications
 */
export interface ApplicationData {
	loanType: string;
	purpose?: string;
	applicants?: SchemaApplicant[];
	property?: PropertyInfo;
	flags?: Record<string, boolean>;
	documentProfile?: DocumentProfile;
	loanHistory?: LoanHistory;
	preferences?: LoanPreferences;
	userMetadata?: UserMetadata;
	aiInsights?: AIInsights;
	riskFlags?: RiskFlags;
	derivedMetrics?: DerivedMetrics;
	internalStatus?: InternalStatus;
	// Allow additional properties
	[key: string]: any;
}

/**
 * Legacy application data structure (from stores.ts)
 * Kept for backward compatibility during migration
 */
export interface LegacyApplicationData {
	allApplicantDetails: Applicant[];
	allExistingApplicantDetails: Applicant[];
	approvedBankForSelectedByUser: string[];
}

// ============================================================================
// FORM STATE TYPES
// ============================================================================

/**
 * Back-history entry — unified type for navigation history.
 *
 * Covers BOTH use-cases:
 * 1. Legacy page-snapshot (pageName, pageNumber, PageData, visiblePagesData, payLoadsData, etc.)
 *    Used by the legacy `backHistory` persisted store in loanData.ts and
 *    consumed by form route pages (home-loan, lap, plot-loan, unsecure-loan/*).
 * 2. New URL-based navigation history (url, timestamp)
 *    Used by FormStateManager.addToHistory / popHistory in form.svelte.ts.
 *
 * During migration both shapes coexist. The index signature keeps backward
 * compatibility with legacy code that accesses arbitrary properties.
 */
export interface BackHistoryEntry {
	// --- New navigation fields (form.svelte.ts) ---
	url?: string;
	timestamp?: number;

	// --- Legacy page-snapshot fields (loanData.ts / route pages) ---
	pageName?: string;
	pageNumber?: number;
	PageData?: any;
	visiblePagesData?: any;
	payLoadsData?: any;
	financialsTableVisible?: boolean;

	// Allow additional dynamic properties for backward compatibility
	[key: string]: any;
}

/**
 * @deprecated Use `BackHistoryEntry` instead. Kept as an alias during migration.
 */
export type PageNavigationHistory = BackHistoryEntry;

/**
 * @deprecated Use `BackHistoryEntry` instead. Kept as an alias during migration.
 */
export type BackHistoryData = BackHistoryEntry;

/**
 * Form validation errors by field
 */
export type FormErrors = Record<string, string>;

/**
 * Applicant-specific errors
 */
export type ApplicantErrors = Record<number, Record<string, string>>;

/**
 * Page index tracking for multi-step forms
 */
export interface PageIndexObject {
	pageId: string;
	index: number;
	completed: boolean;
}

/**
 * Consolidated form state - combines all form-related state
 */
export interface FormState {
	// Main loan data (dynamic, from JSON questions)
	loanData: Record<string, unknown>;

	// Validated application data
	applicationData: ApplicationData;

	// Legacy data for backward compatibility
	legacyData: LegacyApplicationData;

	// Applicants management
	applicants: Applicant[];
	applicantsPayload: Applicant[];
	applicantErrors: ApplicantErrors;

	// Navigation state
	backHistory: BackHistoryEntry[];
	pageIndexObject: PageIndexObject[];
	currentPageIndex: number;
	applicantPageIndex: number;

	// Form state flags
	applicantStepTouched: boolean;
	formErrors: FormErrors;
	isLoading: boolean;
	isDirty: boolean;

	// Navigation URLs
	backURL: string;
	nextURL: string;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast notification message
 */
export interface ToastMessage {
	id: number;
	type: ToastType;
	message: string;
	duration?: number;
}

/**
 * UI state - non-form related UI state
 */
export interface UIState {
	isMobile: boolean;
	showDrawer: boolean;
	alertNotification: string | null;
	toasts: ToastMessage[];
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

export const STORAGE_KEYS = {
	LOAN_DATA: 'home-loan-data',
	APPLICATION_DATA: 'home-application-data',
	BACK_HISTORY: 'home-back-history',
	APPLICANT_STEP_TOUCHED: 'home-applicant-step-touched',
	PAGE_INDEX_OBJECT: 'home-page-index-object',
	LOAN_PAGE_INDEX: 'home-loan-page-index',
	APPLICANT_INDEX_NUMBER: 'home-applicant-index-number',
	APPLICANTS_STORE: 'home-applicants-store',
	APPLICANTS_PAYLOAD: 'home-applicants-store-payload'
} as const;

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_APPLICANT_DETAILS: ApplicantDetails = {
	name: '',
	age: 18,
	cibilScore: 300,
	income: 0,
	employmentType: 'salaried'
};

export const DEFAULT_PROPERTY: PropertyInfo = {
	city: '',
	type: '',
	cost: 0
};

export const DEFAULT_APPLICATION_DATA: ApplicationData = {
	loanType: ''
};

export const DEFAULT_LEGACY_DATA: LegacyApplicationData = {
	allApplicantDetails: [],
	allExistingApplicantDetails: [],
	approvedBankForSelectedByUser: []
};

export const DEFAULT_FORM_STATE: FormState = {
	loanData: {},
	applicationData: { ...DEFAULT_APPLICATION_DATA },
	legacyData: { ...DEFAULT_LEGACY_DATA },
	applicants: [],
	applicantsPayload: [],
	applicantErrors: {},
	backHistory: [],
	pageIndexObject: [],
	currentPageIndex: 0,
	applicantPageIndex: 0,
	applicantStepTouched: false,
	formErrors: {},
	isLoading: false,
	isDirty: false,
	backURL: '',
	nextURL: ''
};

export const DEFAULT_UI_STATE: UIState = {
	isMobile: false,
	showDrawer: false,
	alertNotification: null,
	toasts: []
};
