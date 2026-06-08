/**
 * Core types for test data management system
 */

import { LOAN_NAMES, EMPLOYMENT_TYPES, GENDERS, MARITAL_STATUSES } from '../schema/schemaExtractor';

// ==================== FILTER TYPES ====================

export interface TestDataFilters {
	// Applicant filters
	employmentTypes?: EmploymentType[];
	applicantTypes?: ('Individual' | 'Company')[];
	companyTypes?: CompanyType[];
	ageRanges?: AgeRange[];
	cibilRanges?: CibilRange[];
	incomeRanges?: IncomeRange[];

	// Property filters
	propertyTypes?: PropertyType[];
	cityTiers?: CityTier[];
	propertyStatus?: ('Ready' | 'UnderConstruction')[];
	propertyCostRanges?: PropertyCostRange[];

	// Loan filters
	loanNames?: LoanName[];
	loanAmountRanges?: LoanAmountRange[];
	tenureRanges?: TenureRange[];

	// Special cases
	includeEdgeCases?: boolean;
	includeNRI?: boolean;
	includeJointApplicants?: boolean;
	includeMultipleObligations?: boolean;
	includeLowCibil?: boolean;
	includeHighFOIR?: boolean;

	// Relationship filters (for joint applications)
	relationships?: RelationshipType[];
}

// ==================== ENUM TYPES ====================

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export type CompanyType =
	| 'Proprietorship'
	| 'Partnership Firm'
	| 'Private Limited'
	| 'LLP'
	| 'Public Limited'
	| 'One Person Company (OPC)';

export type AgeRange = '18-25' | '26-35' | '36-50' | '51-65' | '66-80';

export type CibilRange = '300-550' | '551-650' | '651-750' | '751-900';

export type IncomeRange = '0-25k' | '25-50k' | '50-100k' | '100-200k' | '200k+';

export type PropertyType = 'Flat' | 'House' | 'Villa' | 'Plot' | 'Commercial' | 'Industrial';

export type CityTier = 'Metro' | 'Tier1' | 'Tier2' | 'Tier3' | 'Rural';

export type PropertyCostRange = '0-25L' | '25-50L' | '50L-1Cr' | '1-2Cr' | '2Cr+';

/**
 * Canonical loan-product name ("Home Loan", "LAP", "Plot Loan", etc.).
 * Derived from formSchema.json q1_loanName via the LOAN_NAMES extractor.
 * Per ADR-0020: `loanName` = product, `loanType` = scope.
 */
export type LoanName = (typeof LOAN_NAMES)[number];

export type LoanAmountRange = '0-25L' | '25-50L' | '50L-1Cr' | '1-2Cr' | '2Cr+';

export type TenureRange = '1-5yr' | '5-10yr' | '10-15yr' | '15-20yr' | '20yr+';

export type RelationshipType =
	| 'Spouse'
	| 'Father'
	| 'Mother'
	| 'Son'
	| 'Daughter'
	| 'Brother'
	| 'Sister'
	| 'Father-in-law'
	| 'Mother-in-law';

// ==================== PROFILE TYPES ====================

export interface ApplicantProfile {
	profileId: string;
	profileName: string;
	tier: 1 | 2 | 3; // Acceptance tier
	tags: string[]; // e.g., ['salaried', 'prime', 'young']

	// Basic details
	applicantType: 'Individual' | 'Company';
	title?: string;
	fullName: string;
	age: number;
	gender?: (typeof GENDERS)[number];
	maritalStatus?: (typeof MARITAL_STATUSES)[number];

	// Employment
	employmentType: string;
	isNRI?: boolean;

	// Financial
	creditScore: number;
	grossIncome?: number;
	netIncome?: number;
	monthlyOtherIncome?: number;

	// Employment-specific profiles
	salariedProfile?: SalariedProfile;
	governmentProfile?: GovernmentProfile;
	businessProfile?: BusinessProfile;
	professionalProfile?: ProfessionalProfile;
	pensionProfile?: PensionProfile;

	// Company-specific (if applicantType is Company)
	companyDetails?: CompanyDetails;

	// Obligations
	hasExistingObligations?: boolean;
	totalMonthlyEMI?: number;
	existingLoans?: ExistingLoan[];

	// Low credit reasons (if creditScore < 750)
	lowCreditReasons?: LowCreditReason[];

	// Metadata
	expectedAcceptance: 'High' | 'Medium' | 'Low';
	description: string;
}

export interface PropertyProfile {
	profileId: string;
	profileName: string;
	tags: string[]; // e.g., ['metro', 'ready', 'affordable']

	// Location
	propertyState: string;
	propertyCity: string;
	cityTier: CityTier;

	// Property details
	propertyType: string;
	propertyIdentified: boolean;
	constructionStatus: 'Ready to Move' | 'Under Construction' | 'Plot Only';
	propertyStage?: string;

	// Legal
	propertyComplianceStatus: 'fully_compliant' | 'authorized_not_per_plan' | 'not_authorized';
	propertyRegistered?: boolean;

	// Financial
	propertyCost: number;
	atsValue?: number;
	downPayment?: number;

	// Metadata
	expectedLTV: number; // e.g., 80, 75, 70
	description: string;
}

// ==================== SUB-PROFILE TYPES ====================

export interface SalariedProfile {
	worksForReputedOrg?: boolean;
	companyHas100PlusEmployees?: boolean;
	employerIsProprietorship?: boolean;
	employerSharesFinancials?: boolean;
	isPermanentEmployee?: boolean;
	twoYearsWithSameEmployer?: boolean;
	threeYearsTotalExperience?: boolean;
	hasProvidentFund?: boolean;
	salaryInBankAccount?: boolean;
	receivesBonus?: boolean;
	receivesSalarySlip?: boolean;
	hasHigherEducation?: boolean;
}

export interface GovernmentProfile {
	isCentralGovt?: boolean;
	isDefense?: boolean;
	isStateGovt?: boolean;
	isPermanent?: boolean;
	isContractual?: boolean;
	probationCompleted?: boolean;
	twoYearsService?: boolean;
	noDisciplinaryAction?: boolean;
	receivesBonus?: boolean;
	pensionEligible?: boolean;
	receivesSalarySlip?: boolean;
	filesITR?: boolean;
}

export interface BusinessProfile {
	professionType?: string;
	businessType?: string;
	gstRegistered?: boolean;
	gstRegistrationDate?: string;
	hasCurrentAccount?: boolean;
	filesITRRegularly?: boolean;
	profitableLast3Years?: boolean;
	majorCashSales?: boolean;
	businessVintageYears: number;
	averageBankBalance?: number;
	averageCashAmount?: number;
}

export interface ProfessionalProfile extends BusinessProfile {
	hasBarCouncilChamber?: boolean;
	hasProfessionalLicense?: boolean;
	hasCommercialPremises?: boolean;
	ownsPremises?: boolean;
	enrolledWithProfessionalBody?: boolean;
	priorExperience?: boolean;
}

export interface PensionProfile {
	pensionInBankAccount?: boolean;
	pensionRegular?: boolean;
	isGovernmentPension?: boolean;
	isPSUDefensePension?: boolean;
	isLifelongPension?: boolean;
	isFamilyPension?: boolean;
	continuesBeyond75?: boolean;
	receivesPensionSlip?: boolean;
	noPensionLoanDeduction?: boolean;
	hasOtherIncome?: boolean;
}

export interface CompanyDetails {
	companyName: string;
	companyType: string;
	companyAge: number;
	numberOfDirectors?: number;
	directors?: Director[];
	gstNumber?: string;
	panNumber?: string;
}

export interface Director {
	fullName: string;
	age: number;
	designation: string;
	director_income: number;
	director_cibilScore: number;
}

export interface ExistingLoan {
	loanType: string;
	bankName: string;
	emi: number;
	totalLimit?: number;
	tenure: number;
	interestRate: number;
	remainingTenure: number;
	selectedToClose: 'Yes' | 'No';
}

export interface LowCreditReason {
	delayedEMI?: boolean;
	highCreditUtilization?: boolean;
	noCreditHistory?: boolean;
	minimumDueOnly?: boolean;
	multipleEnquiries?: boolean;
	coApplicantDefault?: boolean;
	loanDefault?: boolean;
	onlyUnsecuredLoans?: boolean;
}

// ==================== TEST CASE TYPES ====================

export interface TestCase {
	id: string;
	name: string;
	description: string;
	tags: string[];

	// Core data
	loanName: LoanName;
	applicants: ApplicantProfile[];
	property?: PropertyProfile; // Only for secured loans

	// Loan transaction details
	loanAmount: number;
	tenureYears: number;
	loanPurpose?: 'New Loan' | 'Balance Transfer' | 'Top-up';

	// Expected outcomes
	expectedResult: 'Pass' | 'Fail' | 'Warning';
	expectedIssues?: string[];

	// Metadata
	createdAt: string;
	createdBy: 'manual' | 'automated';
	source?: string; // e.g., 'filter:salaried+nri' or 'manual:user123'
}

export interface TestSuite {
	id: string;
	name: string;
	description: string;
	testCases: TestCase[];
	filters?: TestDataFilters; // The filters that generated this suite
	createdAt: string;
	totalCount: number;
}

// ==================== GENERATION CONFIG ====================

export interface GenerationConfig {
	mode: 'manual' | 'filtered' | 'full';
	filters?: TestDataFilters;
	limits?: {
		maxCombinations?: number;
		includeVariations?: boolean; // Generate multiple variants of same profile
		variationCount?: number; // How many variations per profile
	};
	seed?: number; // For reproducible random generation
}

// ==================== STORAGE TYPES ====================

export interface StoredTestCase {
	testCase: TestCase;
	filePath: string;
	storedAt: string;
}

export interface TestCaseQuery {
	tags?: string[];
	loanNames?: LoanName[];
	employmentTypes?: EmploymentType[];
	cibilRange?: { min: number; max: number };
	ageRange?: { min: number; max: number };
	createdAfter?: string;
	createdBefore?: string;
	limit?: number;
	offset?: number;
}

// ==================== RESULT TYPES ====================

export interface GenerationResult {
	success: boolean;
	totalGenerated: number;
	testCases: TestCase[];
	savedTo?: string;
	errors?: string[];
	summary: {
		byLoanName: Record<string, number>;
		byEmploymentType: Record<string, number>;
		byTier: Record<number, number>;
	};
}
