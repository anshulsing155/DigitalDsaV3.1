/**
 * Income Profile Types
 * ═══════════════════════════════════════════════════════════════════
 * Defines the multi-source income profile system where an applicant
 * can have multiple income sources (salaried + director + rental etc.)
 *
 * Each income source has:
 *   1. A profile type (category)
 *   2. Specifics (yes/no confirmations + details)
 *   3. Income fields (amounts, frequency)
 *   4. Evidence flags
 *
 * Data is stored per-entry (not per-category) because the same person
 * can be Director in 3 companies with different specifics for each.
 * ═══════════════════════════════════════════════════════════════════
 */

// ============================================================================
// INCOME PROFILE CATEGORIES
// ============================================================================

/**
 * All available income profile types.
 * These appear as selectable cards/chips in Tab 1.
 */
export type IncomeProfileType =
	| 'salaried_regular'
	| 'salaried_contractual'
	| 'business_proprietorship'
	| 'business_partnership'
	| 'director_company'
	| 'professional_practice'
	| 'pension'
	| 'rental_income'
	| 'freelance_consulting'
	| 'agriculture_income'
	| 'investment_income'
	| 'no_current_income';

/**
 * Category grouping for table separation:
 * - 'employment_business' → Table 1 (structured/regular income)
 * - 'other_income' → Table 2 (supplementary/passive income)
 */
export type IncomeCategory = 'employment_business' | 'other_income';

/**
 * Maps each profile type to its display category (which table it goes into)
 */
export const PROFILE_CATEGORY_MAP: Record<IncomeProfileType, IncomeCategory> = {
	salaried_regular: 'employment_business',
	salaried_contractual: 'employment_business',
	business_proprietorship: 'employment_business',
	business_partnership: 'employment_business',
	director_company: 'employment_business',
	professional_practice: 'employment_business',
	pension: 'employment_business',
	rental_income: 'other_income',
	freelance_consulting: 'other_income',
	agriculture_income: 'other_income',
	investment_income: 'other_income',
	no_current_income: 'other_income'
};

// ============================================================================
// INCOME PROFILE CARD DEFINITION (Tab 1 selection)
// ============================================================================

/**
 * Definition for each selectable income profile card in Tab 1
 */
export interface IncomeProfileCard {
	/** Unique profile type identifier */
	type: IncomeProfileType;
	/** Display label shown on the card */
	label: string;
	/** Short description below the label */
	description: string;
	/** Icon identifier (from lucide icon registry) */
	icon: string;
	/** Which table category this belongs to */
	category: IncomeCategory;
	/** Whether cash income field is allowed for this profile */
	allowsCashIncome: boolean;
	/**
	 * If true, this profile cannot be combined with earning profiles.
	 * Only 'no_current_income' has this set to true.
	 */
	exclusive: boolean;
	/**
	 * showWhen condition — profile card visibility based on applicant answers.
	 * If undefined, always visible.
	 */
	showWhen?: Record<string, unknown>;
}

// ============================================================================
// INCOME SOURCE ENTRY (The actual data stored per entry)
// ============================================================================

/**
 * A single income source entry as stored in the applicant's data.
 * Each entry represents ONE specific source (e.g., Director at Company X).
 *
 * The `specifics` object holds the yes/no confirmations,
 * and the `income` object holds the financial amounts.
 */
export interface IncomeSourceEntry {
	/** Auto-generated unique ID for this entry */
	id: string;
	/** Which profile type this entry belongs to */
	profileType: IncomeProfileType;
	/** Entity/employer/source name (company name, property description, etc.) */
	entityName: string;
	/** Profile-specific details (varies by profileType) */
	specifics: Record<string, unknown>;
	/** Income amounts and frequency */
	income: IncomeEntryAmounts;
	/** Evidence availability flags */
	evidence: IncomeEvidence;
	/** Timestamp when this entry was created */
	createdAt: string;
	/** Timestamp of last modification */
	updatedAt: string;
	/** Who filled this entry: 'dsa' or 'applicant' (for shared form tracking) */
	filledBy: 'dsa' | 'applicant';

	// ── Director Auto-Income Fields ─────────────────────────────────
	/** true = system-generated from director data, non-deletable while source company is active */
	autoCreated?: boolean;
	/** Which company created this entry (for multi-company directors) */
	sourceCompanyId?: string;
	/** true = source company was deleted from application OR its companyType
	 *  changed to one that maps to a different income profile; either way, the
	 *  entry becomes fully editable and the DSA can keep or delete it. */
	orphaned?: boolean;
	/** Preserved company name for display when company record is gone */
	orphanedCompanyName?: string;
	/** Why this entry was orphaned. Drives the UI label on the income card.
	 *  - `'company_deleted'` (implicit when absent for backward compat) — Company applicant removed
	 *  - `'company_type_changed'` — Company applicant's companyType moved to a different profile */
	orphanedReason?: 'company_deleted' | 'company_type_changed';

	// ── Cross-Applicant Company Link ──────────────────────────────────
	/** Key linking this entry to the same company across co-applicants.
	 * Format: normalizedName|profileType. When set, company-level specifics
	 * (type, profitability, financials) are synced across all entries with this key. */
	linkedEntityKey?: string;
}

/**
 * Income amounts for a source entry.
 * Different profile types use different subsets of these fields.
 */
export interface IncomeEntryAmounts {
	// ── Salaried fields ──────────────────────────────────────────────
	grossMonthlySalary?: number;
	netMonthlySalary?: number;

	// ── Bonus / Incentive fields (salaried) ──────────────────────────
	bonusFrequency?: BonusFrequency;
	bonusTimesReceived?: string;
	averageBonusAmount?: number;

	// ── Director / Partner fields ────────────────────────────────────
	drawsSalary?: boolean;
	monthlySalaryAmount?: number;
	receivesProfit?: boolean;
	profitFrequency?: ProfitFrequency;
	averageProfitPerWithdrawal?: number;

	// ── Professional Practice fields ─────────────────────────────────
	averageMonthlyReceipts?: number;
	averageMonthlyExpenses?: number;
	netProfessionalIncome?: number;

	// ── Business (Proprietorship) fields ─────────────────────────────
	/** Financial table: P&L data for up to 3 years */
	financialsTable?: FinancialsTableData;
	averageBankBalance?: number;
	cashAmount?: number;

	// ── Pension fields ───────────────────────────────────────────────
	monthlyPensionAmount?: number;

	// ── Rental fields ────────────────────────────────────────────────
	monthlyRentAmount?: number;

	// ── Freelance fields ─────────────────────────────────────────────
	averageMonthlyFreelanceIncome?: number;

	// ── Agriculture fields ───────────────────────────────────────────
	averageAnnualAgricultureIncome?: number;

	// ── Investment fields ────────────────────────────────────────────
	averageAnnualInvestmentIncome?: number;

	// ── Generic ──────────────────────────────────────────────────────
	otherMonthlyIncome?: number;
}

export type ProfitFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'annual' | 'as_and_when';

export type BonusFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'annually';

/**
 * Financials table data — reuses the existing pattern from businessOtherQuestions
 * with net profit, depreciation, and turnover arrays for multiple financial years
 */
export interface FinancialsTableData {
	itrFiled?: boolean[];
	netProfitArray?: (number | string)[];
	depreciationArray?: (number | string)[];
	turnOverArray?: (number | string)[];
	grossReceipts?: (number | string)[];
}

/**
 * Evidence availability flags for a source entry
 */
export interface IncomeEvidence {
	/** Is this income reflected in ITR? */
	itrFiled: boolean;
	/** Can produce documentary proof accepted by lenders? */
	hasDocumentaryEvidence: boolean;
	/** Which bank account receives this income? (optional) */
	receivingBankName?: string;
	/** How long has this income been active? */
	vintageYears?: number;
}

// ============================================================================
// NO CURRENT INCOME — ADDITIONAL CONTEXT
// ============================================================================

/**
 * Additional context captured when "No Current Income" is selected.
 * Handles scenarios like maternity break, VRS, etc.
 */
export interface NoIncomeContext {
	/** Was the applicant earning before? */
	wasEarningBefore: boolean;
	/** If yes, what was their previous income source? */
	previousIncomeSource?: string;
	/** Reason for current break */
	breakReason?: BreakReason;
	/** Expected to resume earning? */
	expectedToResume?: ResumeExpectation;
	/** Does the applicant own any property/assets? */
	ownsPropertyOrAssets?: boolean;
}

export type BreakReason =
	| 'maternity'
	| 'health'
	| 'sabbatical'
	| 'retired_without_pension'
	| 'vrs'
	| 'between_jobs'
	| 'other';

export type ResumeExpectation = 'within_6_months' | 'within_1_year' | 'unlikely' | 'not_sure';

// ============================================================================
// ENHANCED OBLIGATION ENTRY (extends existing LoanEntry)
// ============================================================================

/**
 * Enhanced loan obligation entry with role, EMI source, and capacity tracking.
 * Extends the existing LoanEntry interface.
 */
export interface EnhancedLoanEntry {
	// ── Existing fields (from LoanEntry) ─────────────────────────────
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
	utilizedAmount?: string;
	utilizedAmountFormatted?: string;
	sanctionedLimit?: string;
	sanctionedLimitFormatted?: string;
	sanctionedTenure?: string;

	// ── NEW fields ───────────────────────────────────────────────────
	/** Applicant's role on this loan */
	loanRole: ObligationRole;
	/** Is EMI debited from applicant's account? */
	emiFromOwnAccount: EmiSourceType;
	/** If not from own account, who pays? */
	emiPaidBy?: EmiPaidByType;
	/** In what capacity was this loan taken? */
	loanCapacity: LoanCapacityType;
	/** If capacity is director/partner, which entity? */
	loanCapacityEntityName?: string;
}

export type ObligationRole = 'primary_borrower' | 'co_borrower' | 'guarantor' | 'on_paper_only';

export type EmiSourceType = 'yes_direct_debit' | 'yes_manual_transfer' | 'no_paid_by_others';

export type EmiPaidByType = 'spouse' | 'parent' | 'co_borrower' | 'business_account' | 'other';

export type LoanCapacityType = 'individual' | 'as_director' | 'as_partner' | 'as_proprietor';

// ============================================================================
// SHAREABLE FORM TYPES
// ============================================================================

/**
 * Share link record stored in the database
 */
export interface FormShareLink {
	/** Unique token for the share link */
	token: string;
	/** The application this link is for */
	applicationId: string;
	/** Which applicant index in the application */
	applicantIndex: number;
	/** DSA who generated this link */
	createdBy: string;
	/** When the link was created */
	createdAt: string;
	/** When the link expires */
	expiresAt: string;
	/** Maximum number of times this link can be used */
	maxUses: number;
	/** How many times the link has been accessed */
	useCount: number;
	/** Whether the link is still active (can be revoked) */
	isActive: boolean;
	/** Sections the applicant can fill */
	sections: string[];
	/** Fields that are pre-filled and read-only */
	readOnlyFields: string[];
	/** Custom title shown to applicant */
	customTitle: string;
	/** Custom subtitle shown to applicant */
	customSubtitle: string;
	/** Whether OTP verification is required */
	requiresOtp: boolean;
	/** Link expiry duration in hours */
	expiryHours: number;
	/** Pre-filled applicant data (name, age, gender) */
	prefilledData: Record<string, unknown>;
	/** Submission status */
	submissionStatus: 'pending' | 'in_progress' | 'completed';
	/** When the applicant last saved/submitted */
	lastSubmittedAt?: string;
	/** DSA branding info for white-label display */
	branding?: {
		firmName?: string;
		logoUrl?: string;
		primaryColor?: string;
	};
}

/**
 * Domain configuration for white-label form.
 * Allows DSA to use custom domain that hides DigitalDSA branding.
 */
export interface ShareFormDomainConfig {
	/** The base URL for shared forms. Defaults to current domain. */
	baseUrl: string;
	/** Path prefix for shared form routes */
	pathPrefix: string;
}

// IncomeSummary removed — income aggregation is the Rule Engine's responsibility.
// The form layer stores raw IncomeSourceEntry[] data only.
