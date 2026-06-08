/**
 * sameCompanySync.ts — Cross-applicant same-company detection and sync
 * ═══════════════════════════════════════════════════════════════════
 * When two co-applicants are directors/partners at the same company,
 * their company-level data (profitability, financials, type) should
 * be consistent. This module detects same-company entries by name
 * and syncs company-level specifics across linked entries.
 *
 * Pure utility functions — no Svelte state or side effects.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { IncomeSourceEntry, IncomeProfileType } from '$lib/types/incomeProfile';

// ============================================================================
// 1. CONSTANTS
// ============================================================================

/**
 * Profile types where same-company detection applies.
 * Government employees use salaried_regular, so only director/partner
 * profiles can represent the same company across co-applicants.
 */
export const LINKABLE_PROFILE_TYPES = new Set<IncomeProfileType>([
	'director_company',
	'business_partnership'
]);

/**
 * Specifics keys that describe the COMPANY (not the person).
 * These are synced across co-applicants at the same company.
 *
 * Excluded (person-level):
 *   hasEquity, designation, partnerType, shareholding, capitalContribution,
 *   activeInOperations, profitShareExceedsThreshold, itrReflectsIncome
 */
export const COMPANY_LEVEL_KEYS = new Set([
	// director_company specifics
	'registeredInIndia',
	'foreignCountry',
	'companyType',
	'companyProfitable',
	'companySharesFinancials',
	'cin',
	// business_partnership specifics
	'firmType',
	'firmGstRegistered',
	'firmProfitable',
	'llpin'
]);

// ============================================================================
// 2. NAME NORMALIZATION
// ============================================================================

/**
 * Normalize a company/firm name for comparison.
 * Lowercases, trims, and collapses multiple spaces into one.
 */
export function normalizeEntityName(name: string): string {
	return (name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Build a key for linking entries across applicants.
 * Format: "normalizedname|profiletype" — e.g. "digitaldsa|director_company".
 * Profile type is included because a Pvt Ltd and a Partnership are different legal entities.
 */
export function buildLinkedEntityKey(entityName: string, profileType: string): string {
	return `${normalizeEntityName(entityName)}|${profileType}`;
}

// ============================================================================
// 3. DETECTION — Find matching entries from other applicants
// ============================================================================

export interface SameCompanyMatch {
	/** The other applicant's display name */
	applicantName: string;
	/** The other applicant's index in formState.applicants */
	applicantIndex: number;
	/** The matching income entry from the other applicant */
	entry: IncomeSourceEntry;
}

/**
 * Search all OTHER applicants for a director/partner income entry
 * with the same company name and profile type.
 *
 * Returns the first match found, or null if no match.
 * Skips the current applicant (by index) to avoid self-matching.
 * Only matches within the same profile type (director ≠ partner).
 */
export function findSameCompanyMatch(
	entityName: string,
	profileType: string,
	currentApplicantIndex: number,
	applicants: Array<Record<string, unknown>>
): SameCompanyMatch | null {
	if (!LINKABLE_PROFILE_TYPES.has(profileType as IncomeProfileType)) return null;

	const normalizedName = normalizeEntityName(entityName);
	if (!normalizedName || normalizedName.length < 2) return null;

	// Directors of the same Company co-applicant share company info by design —
	// no sync dialog needed. Only prompt when two standalone Individuals
	// independently declare the same company name.
	const currentApplicant = applicants[currentApplicantIndex];
	const currentLinkedCompanyId = currentApplicant?.linkedCompanyId as string | undefined;

	for (let i = 0; i < applicants.length; i++) {
		// Skip current applicant — don't match against own entries
		if (i === currentApplicantIndex) continue;

		const applicant = applicants[i];
		// Only check Individual applicants (Company applicants don't have personal income)
		if (applicant.applicantType !== 'Individual') continue;

		// Skip if both are directors of the same Company co-applicant —
		// they share company data structurally, not by user choice
		if (currentLinkedCompanyId && applicant.linkedCompanyId === currentLinkedCompanyId) continue;

		const entries = (applicant.incomeEntries ?? []) as IncomeSourceEntry[];
		for (const entry of entries) {
			// Must be same profile type (director_company or business_partnership)
			if (entry.profileType !== profileType) continue;

			const entryName = normalizeEntityName(entry.entityName);
			if (entryName === normalizedName) {
				return {
					applicantName: (applicant.fullName as string) || `Applicant ${i + 1}`,
					applicantIndex: i,
					entry
				};
			}
		}
	}

	return null;
}

// ============================================================================
// 4. SPECIFICS EXTRACTION AND APPLICATION
// ============================================================================

/**
 * Extract only company-level fields from a specifics object.
 * Returns a new object with only the keys in COMPANY_LEVEL_KEYS.
 */
export function extractCompanySpecifics(
	specifics: Record<string, unknown>
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const key of COMPANY_LEVEL_KEYS) {
		if (key in specifics) {
			result[key] = specifics[key];
		}
	}
	return result;
}

/**
 * Merge company-level fields from a source into a target specifics object.
 * Person-level fields in the target are preserved.
 * Returns a new object (never mutates the target).
 */
export function applyCompanySpecifics(
	targetSpecifics: Record<string, unknown>,
	sourceSpecifics: Record<string, unknown>
): Record<string, unknown> {
	const companyFields = extractCompanySpecifics(sourceSpecifics);
	return { ...targetSpecifics, ...companyFields };
}

// ============================================================================
// 5. ONGOING SYNC — Keep linked entries consistent
// ============================================================================

/**
 * Sync company-level specifics across all entries that share a linkedEntityKey.
 *
 * For each group of linked entries, the most recently updated entry is the
 * source of truth. All other entries in the group get their company-level
 * specifics patched to match.
 *
 * @returns Same reference if nothing changed, or a new array with updated applicants.
 */
export function syncLinkedEntriesAcrossApplicants(
	applicants: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
	// Step 1: Collect all linked entries across all applicants, grouped by key
	const groups = new Map<
		string,
		Array<{
			applicantIndex: number;
			entryIndex: number;
			entry: IncomeSourceEntry;
		}>
	>();

	for (let ai = 0; ai < applicants.length; ai++) {
		const entries = (applicants[ai].incomeEntries ?? []) as IncomeSourceEntry[];
		for (let ei = 0; ei < entries.length; ei++) {
			const entry = entries[ei];
			if (!entry.linkedEntityKey) continue;
			const group = groups.get(entry.linkedEntityKey) ?? [];
			group.push({ applicantIndex: ai, entryIndex: ei, entry });
			groups.set(entry.linkedEntityKey, group);
		}
	}

	// Step 2: For each group, find the source (most recently updated) and sync others
	let anyChanges = false;
	let result = applicants;

	for (const [, group] of groups) {
		if (group.length < 2) continue;

		// Find the most recently updated entry as the source of truth
		const source = group.reduce((latest, current) =>
			(current.entry.updatedAt ?? '') > (latest.entry.updatedAt ?? '') ? current : latest
		);
		const sourceCompanySpecifics = extractCompanySpecifics(source.entry.specifics);

		// Check if any other entry in the group has different company-level values
		for (const member of group) {
			if (member === source) continue;

			const memberCompanySpecifics = extractCompanySpecifics(member.entry.specifics);
			const needsSync = Object.keys(sourceCompanySpecifics).some(
				(key) => memberCompanySpecifics[key] !== sourceCompanySpecifics[key]
			);

			if (needsSync) {
				// Lazy-copy the applicants array on first change
				if (!anyChanges) {
					result = [...applicants];
					anyChanges = true;
				}

				// Clone the applicant and update the specific entry.
				// Stamp updatedAt so later source-of-truth elections don't accidentally
				// pick a stale member over the entry that just received the sync.
				const applicant = result[member.applicantIndex];
				const entries = [...((applicant.incomeEntries ?? []) as IncomeSourceEntry[])];
				entries[member.entryIndex] = {
					...entries[member.entryIndex],
					specifics: applyCompanySpecifics(
						entries[member.entryIndex].specifics,
						sourceCompanySpecifics
					),
					updatedAt: new Date().toISOString()
				};
				result[member.applicantIndex] = { ...applicant, incomeEntries: entries };
			}
		}
	}

	return result;
}

/**
 * Stamp a linkedEntityKey on a specific entry of a specific applicant.
 * Returns a new applicants array with the entry updated.
 * Used when the "source" entry (the one that was there first) needs to be
 * retroactively linked when the second applicant confirms same company.
 */
export function stampLinkedKeyOnEntry(
	applicants: Array<Record<string, unknown>>,
	applicantIndex: number,
	entryId: string,
	linkedEntityKey: string
): Array<Record<string, unknown>> {
	const result = [...applicants];
	const applicant = result[applicantIndex];
	const entries = ((applicant.incomeEntries ?? []) as IncomeSourceEntry[]).map((e) =>
		e.id === entryId ? { ...e, linkedEntityKey } : e
	);
	result[applicantIndex] = { ...applicant, incomeEntries: entries };
	return result;
}

// ============================================================================
// 6. CROSS-APPLICANT VALIDATION (stake %, OPC single-director)
// ============================================================================

export interface LinkedShareholding {
	applicantName: string;
	applicantIndex: number;
	shareholding: number;
	entryId: string;
}

/**
 * Collect shareholding values from all entries sharing the same linkedEntityKey.
 * Returns one record per linked entry across all applicants.
 */
export function getLinkedShareholdings(
	linkedEntityKey: string,
	applicants: Array<Record<string, unknown>>
): LinkedShareholding[] {
	if (!linkedEntityKey) return [];

	const results: LinkedShareholding[] = [];
	for (let i = 0; i < applicants.length; i++) {
		const a = applicants[i];
		if (a.applicantType !== 'Individual') continue;
		const entries = (a.incomeEntries ?? []) as IncomeSourceEntry[];
		for (const entry of entries) {
			if (entry.linkedEntityKey !== linkedEntityKey) continue;
			const shareholding = Number((entry.specifics as Record<string, unknown>)?.shareholding) || 0;
			results.push({
				applicantName: (a.fullName as string) || `Applicant ${i + 1}`,
				applicantIndex: i,
				shareholding,
				entryId: entry.id
			});
		}
	}
	return results;
}

export interface LinkedStakeValidation {
	total: number;
	isInvalid: boolean;
	warning: string;
	breakdown: Array<{ applicantName: string; shareholding: number }>;
}

/**
 * Validate total shareholding across co-applicants at the same company.
 *
 * Always uses max_100 semantics: the company is NOT on the loan, so we only see
 * the people who applied. Other shareholders/partners may exist but aren't
 * on this loan. We can only flag when the visible total exceeds 100%.
 */
export function validateLinkedCompanyStake(
	linkedEntityKey: string,
	applicants: Array<Record<string, unknown>>
): LinkedStakeValidation | null {
	const holders = getLinkedShareholdings(linkedEntityKey, applicants);
	if (holders.length < 2) return null;

	const total = holders.reduce((sum, h) => sum + h.shareholding, 0);
	const breakdown = holders.map((h) => ({
		applicantName: h.applicantName,
		shareholding: h.shareholding
	}));

	const isInvalid = total > 100;
	const warning = isInvalid
		? `Total shareholding is ${total}% (max 100%). ${breakdown.map((b) => `${b.applicantName}: ${b.shareholding}%`).join(', ')}.`
		: '';

	return { total, isInvalid, warning, breakdown };
}

export interface LinkedOpcValidation {
	isInvalid: boolean;
	warning: string;
	directorNames: string[];
}

/**
 * Validate OPC single-director rule: an OPC can have only one director by law.
 * If two co-applicants both claim director role at the same OPC, flag it.
 *
 * Checks BOTH linked entries (via linkedEntityKey) AND unlinked entries
 * that share the same normalized entity name + profile type. This catches
 * the case where two applicants entered the same OPC but haven't confirmed
 * the same-company link dialog yet.
 */
export function validateLinkedOpcDirectorCount(
	linkedEntityKey: string,
	applicants: Array<Record<string, unknown>>
): LinkedOpcValidation | null {
	if (!linkedEntityKey) return null;

	// Find all entries with this key to check company type
	const holders = getLinkedShareholdings(linkedEntityKey, applicants);

	// Also find entries that match by entity name but aren't yet linked.
	// This closes the gap where entries haven't been formally linked but
	// clearly refer to the same company (same normalized name + profileType).
	const keyParts = linkedEntityKey.split('|');
	const normalizedName = keyParts[0] ?? '';
	const profileType = keyParts[1] ?? '';

	if (normalizedName && profileType) {
		for (let i = 0; i < applicants.length; i++) {
			const a = applicants[i];
			if (a.applicantType !== 'Individual') continue;
			const entries = (a.incomeEntries ?? []) as IncomeSourceEntry[];
			for (const entry of entries) {
				// Skip entries already counted via linkedEntityKey
				if (entry.linkedEntityKey === linkedEntityKey) continue;
				// Match by normalized name + profile type
				if (
					entry.profileType === profileType &&
					normalizeEntityName(entry.entityName) === normalizedName
				) {
					const alreadyCounted = holders.some(
						(h) => h.applicantIndex === i && h.entryId === entry.id
					);
					if (!alreadyCounted) {
						holders.push({
							applicantName: (a.fullName as string) || `Applicant ${i + 1}`,
							applicantIndex: i,
							shareholding: Number((entry.specifics as Record<string, unknown>)?.shareholding) || 0,
							entryId: entry.id
						});
					}
				}
			}
		}
	}

	if (holders.length < 2) return null;

	// Check company type from any entry (company-level field, identical across all)
	let companyType = '';
	for (let i = 0; i < applicants.length; i++) {
		const entries = (applicants[i].incomeEntries ?? []) as IncomeSourceEntry[];
		const matched = entries.find(
			(e) =>
				e.linkedEntityKey === linkedEntityKey ||
				(e.profileType === profileType && normalizeEntityName(e.entityName) === normalizedName)
		);
		if (matched) {
			companyType = String((matched.specifics as Record<string, unknown>)?.companyType ?? '');
			break;
		}
	}

	if (companyType !== 'opc') return null;

	const directorNames = holders.map((h) => h.applicantName);
	return {
		isInvalid: true,
		warning: `OPC can only have one director. ${directorNames.join(' and ')} both have director entries for this company.`,
		directorNames
	};
}

export interface LinkedEntryValidation {
	stakeWarning: string;
	opcWarning: string;
	hasAnyWarning: boolean;
}

/**
 * Aggregate cross-applicant validation for a linked entry.
 * Checks both shareholding totals and OPC director count.
 */
export function validateLinkedEntries(
	linkedEntityKey: string,
	applicants: Array<Record<string, unknown>>
): LinkedEntryValidation {
	const stake = validateLinkedCompanyStake(linkedEntityKey, applicants);
	const opc = validateLinkedOpcDirectorCount(linkedEntityKey, applicants);

	return {
		stakeWarning: stake?.warning ?? '',
		opcWarning: opc?.warning ?? '',
		hasAnyWarning: (stake?.isInvalid ?? false) || (opc?.isInvalid ?? false)
	};
}

// ============================================================================
// 7. COMPANY-LEVEL AGGREGATE OWNERSHIP (post-commit invariant)
// ============================================================================

export interface CompanyOwnershipBreakdownEntry {
	applicantName: string;
	applicantIndex: number;
	ownershipPercent: number;
}

export interface CompanyOwnershipViolation {
	companyId: string;
	companyName: string;
	total: number;
	breakdown: CompanyOwnershipBreakdownEntry[];
	/** Human-readable message suitable for an error banner or Next-disabled reason. */
	message: string;
}

/**
 * Walk every Company applicant on the loan and sum ownership across the
 * Individual applicants linked to it. Returns a violation entry for each
 * Company whose declared total exceeds 100%.
 *
 * Why this exists: DirectorCards.svelte enforces total <= 100% only at the
 * "Director Setup" sub-step. Once past that step, data can drift through
 * three paths that all skip the check — adding standalone Individuals
 * matched by name + auto-linked, inline edits via the Applicants table
 * pencil, or case restore. Without a post-commit invariant the user can
 * land on Profile & Financials with a 200% total and Next merely greys
 * out without a reason.
 *
 * Linkage: an Individual contributes to a Company's total when its
 * `linkedCompanyIds` array includes the Company id, OR (legacy path) its
 * primary `linkedCompanyId` matches.
 *
 * Semantics: max_100. The Company is on the loan so the visible total
 * should account for every shareholder; if it exceeds 100% the input is
 * definitively wrong. (Compare to validateLinkedCompanyStake which is
 * weaker — that path applies when the Company is NOT on the loan, so
 * unseen shareholders may exist and only > 100% is flaggable.)
 */
export function validateCompanyOwnershipTotals(
	applicants: Array<Record<string, unknown>>
): CompanyOwnershipViolation[] {
	const violations: CompanyOwnershipViolation[] = [];

	for (const company of applicants) {
		if (company.applicantType !== 'Company') continue;
		const companyId = (company.id as string) ?? '';
		if (!companyId) continue;

		const breakdown: CompanyOwnershipBreakdownEntry[] = [];
		for (let i = 0; i < applicants.length; i++) {
			const a = applicants[i];
			if (a.applicantType !== 'Individual') continue;

			const ids = (a.linkedCompanyIds as string[] | undefined) ?? [];
			const primaryId = a.linkedCompanyId as string | undefined;
			const linksToCompany = ids.includes(companyId) || primaryId === companyId;
			if (!linksToCompany) continue;

			const pct = Number(a.ownershipPercent) || 0;
			if (pct <= 0) continue;

			breakdown.push({
				applicantName: (a.fullName as string) || `Applicant ${i + 1}`,
				applicantIndex: i,
				ownershipPercent: pct
			});
		}

		if (breakdown.length === 0) continue;
		const total = breakdown.reduce((sum, b) => sum + b.ownershipPercent, 0);
		if (total <= 100) continue;

		const companyName = (company.companyName as string) || (company.fullName as string) || 'Company';
		const detail = breakdown.map((b) => `${b.applicantName} ${b.ownershipPercent}%`).join(', ');
		violations.push({
			companyId,
			companyName,
			total,
			breakdown,
			message: `${companyName}: total ownership declared by linked applicants is ${total}% (${detail}). Total cannot exceed 100% — please adjust ownership percentages.`
		});
	}

	return violations;
}
