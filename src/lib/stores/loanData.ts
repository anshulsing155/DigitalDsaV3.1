/**
 * Compatibility Bridge: loanData.ts
 *
 * Source of truth: src/lib/state/form.svelte.ts (FormStateManager)
 *
 * This file re-exports store-compatible wrappers (via fromRune) so the 74+
 * consumer files that import from '$lib/stores/loanData' continue to work
 * unchanged with $store auto-subscriptions, .set(), and .update().
 *
 * Will be removed in Phase 8 when all consumers migrate to direct
 * formState / authState access.
 *
 * @deprecated Use formState from '$lib/state/form.svelte' instead.
 */

import { fromRune } from '$lib/stores/_bridge.svelte';
import { formState } from '$lib/state/form.svelte';
import { authState } from '$lib/state/auth.svelte';
import type {
	Applicant,
	BackHistoryEntry,
	PageIndexObject,
	ApplicantErrors
} from '$lib/types/form';

// ============================================================================
// Re-exported Types (consumers depend on these)
// ============================================================================

// Re-export Applicant type from consolidated types (for new code)
export type { Applicant, ApplicantErrors as ApplicantError } from '$lib/types/form';

// Import the canonical BackHistoryEntry and its legacy alias
export type { BackHistoryEntry, BackHistoryData } from '$lib/types/form';

// Legacy Applicant type (kept for backward compatibility)
export type LegacyApplicant = {
	id?: string;
	applicantType?: string;
	fullName?: string;
	age?: string | number;
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
	selectedBusinessType?: string;
	/**
	 * User explicitly declared this applicant is independent of any same-named
	 * record in the case — set when the user clicks "Not this person" /
	 * "different applicant" in RestoreApplicantModal. When true, downstream
	 * auto-link paths (DirectorCards name-merge, same-company income sync,
	 * applicantRestoreHandler director-name relink) MUST skip this applicant.
	 * Otherwise the system collapses two intentionally distinct same-named
	 * people into a single director sub-row — the standalone Individual gets
	 * stamped with `linkedCompanyId`, is then hidden by the Who's Applying
	 * table filter (sortedApplicantEntries), and the visible count drifts
	 * below `applicants.length`. See Pitfall catalog entry on this flag.
	 */
	__independentOfSameName?: boolean;
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

// ============================================================================
// Store-compatible bridges
// ============================================================================

/** @deprecated Use formState.loanData from '$lib/state/form.svelte' */
export const loanData = fromRune<LoanDataStore>(
	() => formState.loanData as LoanDataStore,
	(v) => formState.replaceLoanData(v)
);

/** @deprecated Use formState.applicationData from '$lib/state/form.svelte' */
export const applicationData = fromRune<ApplicationData>(
	() => formState.applicationData as unknown as ApplicationData,
	(v) => formState.replaceApplicationData(v as any)
);

/** @deprecated Use authState from '$lib/state/auth.svelte' for user data */
export const existingUser = fromRune<Record<string, any>>(
	() => (authState.user ?? {}) as Record<string, any>,
	(_v) => {
		/* read-only bridge -- auth changes via authState */
	}
);

/** @deprecated Use formState.legacyBackHistory from '$lib/state/form.svelte' */
export const backHistory = fromRune<BackHistoryEntry>(
	() => formState.legacyBackHistory,
	(v) => formState.replaceLegacyBackHistory(v)
);

/** @deprecated Use formState.applicantStepTouched from '$lib/state/form.svelte' */
export const applicantStepTouched = fromRune<boolean>(
	() => formState.applicantStepTouched,
	(v) => formState.replaceApplicantStepTouched(v)
);

/** @deprecated Use formState.pageIndexObject from '$lib/state/form.svelte' */
export const pageIndexObject = fromRune<PageIndexItem[]>(
	() => formState.pageIndexObject as PageIndexItem[],
	(v) => formState.replacePageIndexObject(v as PageIndexObject[])
);

/** @deprecated Use formState.currentPageIndex from '$lib/state/form.svelte' */
export const homeLoanPageIndex = fromRune<number>(
	() => formState.currentPageIndex,
	(v) => formState.setPageIndex(v)
);

/** @deprecated Use formState.lapPageIndex from '$lib/state/form.svelte' */
export const lapPageIndex = fromRune<number>(
	() => formState.lapPageIndex,
	(v) => formState.setLapPageIndex(v)
);

/** @deprecated Use formState.plotLoanPageIndex from '$lib/state/form.svelte' */
export const plotLoanPageIndex = fromRune<number>(
	() => formState.plotLoanPageIndex,
	(v) => formState.setPlotLoanPageIndex(v)
);

/** @deprecated Use formState.businessLoanPageIndex from '$lib/state/form.svelte' */
export const businessLoanPageIndex = fromRune<number>(
	() => formState.businessLoanPageIndex,
	(v) => formState.setBusinessLoanPageIndex(v)
);

/** @deprecated Use formState.personalLoanPageIndex from '$lib/state/form.svelte' */
export const personalLoanPageIndex = fromRune<number>(
	() => formState.personalLoanPageIndex,
	(v) => formState.setPersonalLoanPageIndex(v)
);

/** @deprecated Use formState.professionalLoanPageIndex from '$lib/state/form.svelte' */
export const professionalLoanPageIndex = fromRune<number>(
	() => formState.professionalLoanPageIndex,
	(v) => formState.setProfessionalLoanPageIndex(v)
);

/** @deprecated Use formState.applicantPageIndex from '$lib/state/form.svelte' */
export const applicantPagesIndexNumber = fromRune<number>(
	() => formState.applicantPageIndex,
	(v) => formState.setApplicantPageIndex(v)
);

/** @deprecated Use formState.applicants from '$lib/state/form.svelte' */
export const applicantsStore = fromRune<LegacyApplicant[]>(
	() => formState.applicants as LegacyApplicant[],
	(v) => formState.replaceApplicants(v as Applicant[])
);

/** @deprecated Use formState.applicantsPayload from '$lib/state/form.svelte' */
export const applicantsStorePayload = fromRune<LegacyApplicant[]>(
	() => formState.applicantsPayload as LegacyApplicant[],
	(v) => formState.replaceApplicantsPayload(v as Applicant[])
);

/** @deprecated Use formState.applicantErrors from '$lib/state/form.svelte' */
export const applicantErrors = fromRune<Record<number, Record<string, string>>>(
	() => formState.applicantErrors as Record<number, Record<string, string>>,
	(v) => formState.replaceApplicantErrors(v as ApplicantErrors)
);

// ============================================================================
// Helper functions (delegate to formState methods)
// ============================================================================

/**
 * @deprecated Use formState.updateOtherBloodRelation() from '$lib/state/form.svelte' instead
 */
export function updateOtherBloodRelation(index: number, value: string): void {
	formState.updateOtherBloodRelation(index, value);
}

/**
 * @deprecated Use formState.updateRelationship() from '$lib/state/form.svelte' instead
 */
export function updateRelationship(index: number, value: string): void {
	formState.updateRelationship(index, value);
}

/**
 * @deprecated Use formState.updateRelationWith() from '$lib/state/form.svelte' instead
 */
export function updateRelationWith(index: number, value: string): void {
	formState.updateRelationWith(index, value);
}
