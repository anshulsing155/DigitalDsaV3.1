import type { Writable } from 'svelte/store';
import type { BackHistoryEntry } from '$lib/types/form';

// ── Types ──────────────────────────────────────────────────────────────────

export type { Applicant, ApplicantErrors as ApplicantError } from '$lib/types/form';
export type { BackHistoryEntry, BackHistoryData } from '$lib/types/form';

export type LegacyApplicant = {
	id?: string;
	applicantType?: string;
	fullName?: string;
	age?: string;
	applicantAge?: string | number;
	gender?: string;
	employmentType?: string;
	relationship?: string;
	relationwith?: string;
	otherBloodRelation?: string;
	companyName?: string;
	companyType?: string;
	businessType?: string;
	onEMI?: boolean;
	onProperty?: boolean;
	hasError?: boolean;
	shake?: boolean;
	isCompleted?: boolean;
	financialCompleted?: boolean;
	isFinancialInfoComplete?: boolean;
	isCompanyInfoComplete?: boolean;
	touchedFields?: Record<string, boolean>;
	maritalStatus?: string;
	validationActive?: boolean;
	businessActivityDetails?: Record<string, boolean>;
	age?: number;
	selectedBusinessType?: string;
	[key: string]: any;
};

export interface ApplicationData {
	loanName?: string;
	LoanType?: string;
	loanType?: string;
	existingLoan?: string;
	pageName?: string;
	checkUnsecureData?: any;
	rmDetails?: any;
	[key: string]: any;
}

export interface LoanDataStore {
	[key: string]: any;
}

export interface PageIndexItem {
	currentPageIndex?: number;
	initialPoint?: number;
	[key: string]: any;
}

// ── Store-compatible bridges ───────────────────────────────────────────────

export declare const loanData: Writable<LoanDataStore>;
export declare const applicationData: Writable<ApplicationData>;
export declare const existingUser: Writable<Record<string, any>>;
export declare const backHistory: Writable<BackHistoryEntry>;
export declare const applicantStepTouched: Writable<boolean>;
export declare const pageIndexObject: Writable<PageIndexItem[]>;
export declare const homeLoanPageIndex: Writable<number>;
export declare const lapPageIndex: Writable<number>;
export declare const plotLoanPageIndex: Writable<number>;
export declare const businessLoanPageIndex: Writable<number>;
export declare const personalLoanPageIndex: Writable<number>;
export declare const professionalLoanPageIndex: Writable<number>;
export declare const applicantPagesIndexNumber: Writable<number>;
export declare const applicantsStore: Writable<LegacyApplicant[]>;
export declare const applicantsStorePayload: Writable<LegacyApplicant[]>;
export declare const applicantErrors: Writable<Record<number, Record<string, string>>>;

// ── Helper functions ───────────────────────────────────────────────────────

export declare function updateOtherBloodRelation(index: number, value: string): void;
export declare function updateRelationship(index: number, value: string): void;
export declare function updateRelationWith(index: number, value: string): void;
