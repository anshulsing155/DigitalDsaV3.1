/**
 * Loan-type change cleanup — move applicants from the OLD loan to the recovery
 * bin and clear in-memory state, so a freshly chosen loan type starts clean.
 *
 * Fixes the cross-loan leak reported 2026-05-15 (CLAUDE.md Pitfall #20):
 *   - Plot Loan OPC company stayed visible in a freshly-started Business Loan
 *     as Sole Proprietorship.
 *   - Plot Loan director state contaminated Personal Loan's income-profile
 *     completion check (auto-created `director_company` entry forced the
 *     selectedIncomeProfiles to include it; Next stayed disabled when the
 *     user picked Salaried instead).
 *
 * The applicants aren't lost — they go to the recovery bin with their
 * OLD loan's RecoveryScope. The new loan's "Who's Applying" page surfaces
 * a restore modal by name-match so the DSA can pull them back deliberately.
 */

import { formState } from '$lib/state/form.svelte';
import {
	applicantState,
	buildMatchSignature,
	type RecoveryScope
} from '$lib/state/applicant.svelte';
import { incomeProfileStore } from '$lib/stores/incomeProfileStore';
import { clearAllRelationships } from '$lib/components/relationship-capture/relationshipStore';

/**
 * Map a loan name + applicant kind to its canonical RecoveryScope.
 * Exported so the test can pin the mapping.
 */
export function recoveryScopeForLoan(
	loanName: string,
	applicantType: 'Individual' | 'Company'
): RecoveryScope | undefined {
	const isCompany = applicantType === 'Company';
	switch (loanName) {
		case 'Home Loan':
		case 'LAP':
		case 'Plot Loan':
			return isCompany ? 'secured::company' : 'secured::individual';
		case 'Personal Loan':
			// Personal Loan has no Company-applicant flow.
			return isCompany ? undefined : 'personal::individual';
		case 'Business Loan':
			return isCompany ? 'business::company' : 'business::individual';
		case 'Professional Loan':
			return isCompany ? 'professional::company' : 'professional::individual';
		default:
			return undefined;
	}
}

/**
 * Migrate every applicant out of the OLD loan into the recovery bin and
 * clear in-memory `formState.applicants`, relationships, and income-profile
 * store. Safe to call when `oldLoanName` is empty — it's a no-op in that case.
 *
 * Pure side-effects on global singletons (formState / applicantState /
 * incomeProfileStore / relationshipStore). Tests stub those imports.
 */
export function migrateApplicantsToRecoveryOnLoanSwitch(oldLoanName: string): void {
	if (!oldLoanName) return;
	for (const applicant of formState.applicants) {
		if (!applicant.applicantType || !applicant.id) continue;
		const matchSignature = buildMatchSignature(applicant);
		if (!matchSignature) continue;
		const isCompany = applicant.applicantType === 'Company';
		const displayName = isCompany
			? (applicant.companyName as string) || 'Unnamed Company'
			: (applicant.fullName as string) || 'Unnamed';
		const scope = recoveryScopeForLoan(oldLoanName, applicant.applicantType);
		applicantState.removeToRecovery(
			applicant.id as string,
			$state.snapshot(applicant) as Record<string, unknown>,
			displayName,
			matchSignature,
			scope
		);
	}
	formState.replaceApplicants([]);
	clearAllRelationships();
	incomeProfileStore.clearAll();
}
