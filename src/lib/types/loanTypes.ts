export interface LoanOffer {
	SanctionAmount: number;
	emi: number;
	tenure: number;
	annualRate: number;
	maximumEligibleEmi: number;
	suggestionMsg: string[];
	suggestions?: string[];
	error?: {
		status: string;
		reasons: string[];
		message?: string;
	};
	requiredDocuments: string[];
	loanCharges: string[];
	feature: {
		[key: string]: string[];
	};
	checkEligibilityData: {
		error?: {
			status: string;
			reasons: string[];
		};
		maxEligibleLoanAmount: number;
		foir: number;
		emi: number;
		maximumTenure: Array<{
			maxTenure: number;
			reasonValue: number;
			reason: string;
		}>;
		minimumInterestRate: Array<{
			minInterestRate: number;
			reasonValue: number;
			reason: string;
		}>;
		highestFOIR: Array<{
			maxFOIR: number;
			reasonValue: number;
			reason: string;
		}>;
		interestRate: number;
		eligibleTenure: number;
		tenure: number;
		RequiredLoanAmount: number;
		maximumLoanCapacity: number;
		loanCharges: string[];
		totalMonthlyIncome: number;
		requiredDocument: string[];
		bank_feature: {
			[key: string]: string[];
		};
	};
	// Additional fields for display purposes
	bankName?: string;
	productName?: string;
	loanType?: string;
	topDetails?: Record<string, any>;
	principalOutstandingDetail?: Record<string, any>;
	loanData?: Record<string, any>;
	showDetails?: boolean;
	downPayment?: number;
	message?: string;
	// Properties used in offer pages
	propertyValue?: number;
	estimatedEmi?: number;
	requiredDeposit?: number;
	shortDownPayment?: number;
}

// Removed 2026-05-31 (S208 — TECH-DEBT-CLEANUP D3):
//   - `LoanApplication` interface (PascalCase field names, `unSecureLoanType` retired-field reference)
//   - `LimitEntry` interface (only used inside the removed `LoanApplication`)
//   - `ApplicantDetail` interface (only used inside the removed `LoanApplication`)
// All three were carry-overs from the dormant bank-loan-management API surface.
// Per owner decision 2026-05-31 that surface will not be revived; ADR-0020
// Batch 1 explicitly flagged this interface for post-rename cleanup. Verified
// zero live consumers via `pnpm check` before deletion. `LoanEntry` (below)
// stays — used by `src/lib/types/form.ts` and re-exported via formTypes.

export interface LoanEntry {
	loanType: string;
	bankName: string;
	selectedToClose: string;
	emi: string;
	emiFormatted: string;
	totalLimit: string;
	totalLimitFormatted: string;
	tenure: string;
	interestRate: string;
	remainingLimit: string;
	remainingLimitFormatted: string;
	remainingTenure: string;
	utilizedAmount: string;
	utilizedAmountFormatted: string;
}

