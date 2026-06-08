/**
 * Cross-loan Applicant Recovery Compatibility
 * ═══════════════════════════════════════════════════════════════════
 * Determines whether a recovery bin entry from loan A is a valid
 * suggestion when the DSA is working on loan B.
 *
 * Signal used: selectedIncomeProfiles (most reliable — these are the
 * profiles the DSA explicitly selected, reflecting the person's real
 * employment/business nature). Falls back to summary.incomeSources.
 *
 * Compatibility levels:
 *   strong     — profile is a natural fit, surface prominently
 *   compatible — works but not the primary use case
 *   warn       — mismatch; excluded from cross-loan suggestions
 *   incompatible — never surface (e.g. Company entry in Personal Loan)
 *
 * Decision (2026-04-23): warn-level entries are NOT surfaced even with
 * a warning. The signal is reliable enough that a warn means wrong fit.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RecoverableApplicant } from '$lib/state/applicant.svelte';
import type { IncomeProfileType } from '$lib/types/incomeProfile';

export type CompatibilityLevel = 'strong' | 'compatible' | 'warn' | 'incompatible';

export interface CompatibilityResult {
	level: CompatibilityLevel;
	/** Shown in RestoreApplicantModal roleWarning slot when level is 'compatible' with mixed signals */
	warning?: string;
	/** Human-readable origin label, e.g. "Secured Loan" */
	originLabel?: string;
}

export type LoanCategory = 'secured' | 'personal' | 'business' | 'professional';

// ── Per-profile compatibility matrix ────────────────────────────────────────
// Rows = income profile type. Columns = target loan category.
// Logic: a person's compatibility for a target loan is the HIGHEST level
// across all their selected profiles.

const PROFILE_COMPAT: Record<IncomeProfileType, Record<LoanCategory, CompatibilityLevel>> = {
	salaried_regular:        { secured: 'strong',      personal: 'strong',     business: 'warn',       professional: 'compatible' },
	salaried_contractual:    { secured: 'strong',      personal: 'strong',     business: 'warn',       professional: 'compatible' },
	pension:                 { secured: 'strong',      personal: 'strong',     business: 'warn',       professional: 'warn'       },
	professional_practice:   { secured: 'strong',      personal: 'compatible', business: 'compatible', professional: 'strong'     },
	business_proprietorship: { secured: 'strong',      personal: 'compatible', business: 'strong',     professional: 'warn'       },
	business_partnership:    { secured: 'strong',      personal: 'compatible', business: 'strong',     professional: 'warn'       },
	director_company:        { secured: 'strong',      personal: 'compatible', business: 'strong',     professional: 'warn'       },
	rental_income:           { secured: 'compatible',  personal: 'compatible', business: 'compatible', professional: 'compatible' },
	freelance_consulting:    { secured: 'compatible',  personal: 'compatible', business: 'compatible', professional: 'compatible' },
	agriculture_income:      { secured: 'strong',      personal: 'compatible', business: 'compatible', professional: 'warn'       },
	investment_income:       { secured: 'compatible',  personal: 'compatible', business: 'compatible', professional: 'compatible' },
	no_current_income:       { secured: 'incompatible',personal: 'incompatible',business:'incompatible',professional:'incompatible'},
};

const LEVEL_RANK: Record<CompatibilityLevel, number> = {
	strong: 4, compatible: 3, warn: 2, incompatible: 1
};

const PROFILE_LABELS: Partial<Record<IncomeProfileType, string>> = {
	salaried_regular: 'Salaried',
	salaried_contractual: 'Contractual Salaried',
	pension: 'Pension',
	business_proprietorship: 'Proprietor',
	business_partnership: 'Partner in Firm',
	director_company: 'Company Director',
	agriculture_income: 'Agriculture',
	professional_practice: 'Professional Practice',
};

const LOAN_NAMES: Record<LoanCategory, string> = {
	secured: 'secured loan',
	personal: 'Personal Loan',
	business: 'Business Loan',
	professional: 'Professional Loan',
};

// ── Extract income profiles from a recovery bin entry ───────────────────────

function extractProfiles(entry: RecoverableApplicant): IncomeProfileType[] {
	const fromData = (entry.data as Record<string, unknown>)?.selectedIncomeProfiles;
	if (Array.isArray(fromData) && fromData.length > 0) {
		return fromData as IncomeProfileType[];
	}
	const fromSummary = entry.summary?.incomeSources?.map((s) => s.profileType) ?? [];
	if (fromSummary.length > 0) {
		return fromSummary as IncomeProfileType[];
	}
	return [];
}

// ── Score a single entry against a target loan ───────────────────────────────

export function scoreCompatibility(
	entry: RecoverableApplicant,
	targetCategory: LoanCategory
): CompatibilityResult {
	// Companies: only valid in business or secured flows
	if (entry.applicantType === 'Company') {
		if (targetCategory === 'business' || targetCategory === 'secured') {
			return { level: 'compatible', originLabel: entry.loanProduct };
		}
		return { level: 'incompatible' };
	}

	const profiles = extractProfiles(entry);

	// No profile data saved — offer as compatible with a note
	if (profiles.length === 0) {
		return {
			level: 'compatible',
			originLabel: entry.loanProduct,
			warning: 'No income profile on record — verify employment type before restoring.'
		};
	}

	let bestLevel: CompatibilityLevel = 'incompatible';
	const warnProfileLabels: string[] = [];

	for (const profile of profiles) {
		const row = PROFILE_COMPAT[profile];
		if (!row) continue;
		const level = row[targetCategory];
		if (LEVEL_RANK[level] > LEVEL_RANK[bestLevel]) bestLevel = level;
		if (level === 'warn') {
			warnProfileLabels.push(PROFILE_LABELS[profile] ?? profile);
		}
	}

	// Build a warning for mixed-signal entries (best is compatible but some profiles warn)
	let warning: string | undefined;
	if ((bestLevel === 'compatible' || bestLevel === 'warn') && warnProfileLabels.length > 0) {
		warning = `Profile (${warnProfileLabels.join(', ')}) may not suit ${LOAN_NAMES[targetCategory]}. Verify before restoring.`;
	}

	return { level: bestLevel, warning, originLabel: entry.loanProduct };
}

// ── Derive loan category from a RecoveryScope string ─────────────────────────

export function categoryFromScope(scope: string | undefined): LoanCategory {
	if (!scope) return 'secured';
	if (scope.startsWith('personal')) return 'personal';
	if (scope.startsWith('business')) return 'business';
	if (scope.startsWith('professional')) return 'professional';
	return 'secured';
}

// ── Main cross-loan filter ────────────────────────────────────────────────────

/**
 * Filter and annotate recovery bin entries for cross-loan suggestion.
 *
 * Returns entries from OTHER loan scopes whose income profile is 'strong'
 * or 'compatible' with the target loan. warn-level entries are excluded
 * (too noisy; the signal is reliable enough that warn means wrong fit).
 * Same-scope entries are excluded (handled by existing same-scope query).
 *
 * Results are sorted strong-first, compatible-second.
 */
export function filterCrossLoanMatches(
	allEntries: RecoverableApplicant[],
	currentScope: string | undefined,
	targetCategory: LoanCategory,
	namePrefix: string,
	currentApplicantType?: 'Individual' | 'Company',
	currentCompanyType?: string
): Array<RecoverableApplicant & { compatibility: CompatibilityResult }> {
	const prefix = namePrefix.trim().toLowerCase();
	if (prefix.length < 2) return [];

	const wantCompanyType = (currentCompanyType ?? '').trim();

	return allEntries
		.filter((entry) => {
			// Exclude same-scope entries — already handled by same-scope query
			if (entry.recoveryScope === currentScope) return false;
			// Type must match — never suggest an Individual when the user is filling a
			// Company slot (or vice versa). Their fields are completely different and
			// the restore would silently fail to populate. When currentApplicantType
			// isn't provided, fall back to permissive behavior for backward compat.
			if (currentApplicantType && entry.applicantType !== currentApplicantType) return false;
			// CompanyType sub-filter — Pvt Ltd / OPC / LLP / Partnership Firm / Public
			// Limited / Section 8 are different legal entities with different field
			// shapes. Mixing them in the suggestion list makes wrong-restore likely.
			// Only filter when BOTH sides have a known companyType — empty values
			// stay permissive so an in-progress entry can still match a complete one.
			if (
				currentApplicantType === 'Company' &&
				wantCompanyType &&
				entry.applicantType === 'Company'
			) {
				const entryCompanyType = (entry.companyType ?? '').trim();
				if (entryCompanyType && entryCompanyType !== wantCompanyType) return false;
			}
			// Name prefix match (same logic as matchesByName)
			const entryName = (
				entry.applicantType === 'Company'
					? entry.companyName
					: entry.fullName
			)?.trim().toLowerCase() ?? '';
			return entryName.startsWith(prefix);
		})
		.map((entry) => ({ ...entry, compatibility: scoreCompatibility(entry, targetCategory) }))
		.filter((e) => e.compatibility.level === 'strong' || e.compatibility.level === 'compatible')
		.sort((a, b) => LEVEL_RANK[b.compatibility.level] - LEVEL_RANK[a.compatibility.level]);
}
