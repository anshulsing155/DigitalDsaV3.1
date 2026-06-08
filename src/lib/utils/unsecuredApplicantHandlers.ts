/**
 * Unsecured Applicant Handlers — Shared Store Operations
 * ═══════════════════════════════════════════════════════════════════
 * PARTIALLY DEPRECATED: The following are no longer used by any loan page
 * after the unified applicant system migration (all 6 loan types now use
 * ApplicantFormSecured + AddApplicant + applicantBasicDetailsUnsecuredLoans.json):
 *   - initializeApplicantStore() — replaced by ApplicantFormSecured's own init
 *   - BUSINESS_ENTITY_OPTIONS — moved to unsecured JSON config as formLevelQuestion
 *   - MULTI_APPLICANT_ENTITIES — replaced by auto-derive in AddApplicant.updateFormLevelField()
 *   - persistBusinessEntityType() — replaced by AddApplicant.updateFormLevelField()
 *
 * STILL ACTIVE (used by flattened single-applicant income pages):
 *   - handleProfileSelectionChange()
 *   - handleAddEntry() / handleUpdateEntry() / handleDeleteEntry()
 *   - handleCreditScoreChange()
 *   - handleObligationUpdate()
 * ═══════════════════════════════════════════════════════════════════
 */

import { formState } from '$lib/state/form.svelte';
import { deriveLegacyEmploymentType } from '$lib/config/incomeProfiles';
import type { IncomeProfileType, IncomeSourceEntry } from '$lib/types/incomeProfile';

/** Always index 0 for single-applicant unsecured flow */
import clientLogger from '$lib/utils/clientLogger';

const APPLICANT_INDEX = 0;

// ── Dev-only logger ──────────────────────────────────────────────
// clientLogger.debug auto-gates to dev (see $lib/utils/clientLogger).
function devLog(label: string, ...args: unknown[]) {
	clientLogger.debug({ args }, `[unsecuredHandlers] ${label}`);
}

// ═══════════════════════════════════════════════════════════════════
// STORE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Creates a default applicant object for a given loan type.
 * Employment type is set for Professional and Business loans; for Personal Loan it auto-derives from income profile selection.
 */
export function getDefaultApplicant(loanName: string): Record<string, unknown> {
	switch (loanName) {
		case 'Personal Loan':
			return { applicantType: 'Individual' };
		case 'Professional Loan':
			return { applicantType: 'Individual', employmentType: 'Self-employed(Professional)' };
		case 'Business Loan':
			return { employmentType: 'Self-employed(Other)' };
		default:
			return { applicantType: 'Individual' };
	}
}

/**
 * Checks whether an existing applicant's employment type is compatible
 * with the current loan type. Prevents stale data from a different loan
 * route from persisting (e.g. switching from Personal → Business).
 */
export function isApplicantCompatible(applicant: any, loanName: string): boolean {
	const empType = applicant?.employmentType;
	switch (loanName) {
		case 'Personal Loan':
			return empType !== 'Self-employed(Other)' && empType !== 'Self-employed(Professional)';
		case 'Business Loan':
			return empType === 'Self-employed(Other)' || !empType;
		case 'Professional Loan':
			return empType === 'Self-employed(Professional)' || !empType;
		default:
			return true;
	}
}

/**
 * @deprecated Replaced by ApplicantFormSecured's own applicant initialization.
 * Initializes applicantsStore with exactly one applicant with correct
 * defaults for this loan type. Call in route page's onMount.
 *
 * Handles:
 *   - Empty store → create default applicant
 *   - Existing compatible applicant → keep it
 *   - Incompatible applicant → reset to defaults
 *   - Multiple applicants → filter to compatible, take first
 *
 * @returns The business entity type if present (for session resume)
 */
export function initializeApplicantStore(loanName: string): string {
	const appData = formState.applicationData;
	const effectiveLoanName: string =
		loanName || ((appData as Record<string, unknown>).loanName as string) || '';
	const store = formState.applicants ?? [];

	devLog('init', { loanName: effectiveLoanName, storeLength: store.length });

	const defaults = getDefaultApplicant(effectiveLoanName);
	let businessEntityType = '';

	if (store.length === 0) {
		devLog('init → creating default applicant');
		formState.replaceApplicants([defaults]);
	} else if (store.length === 1) {
		const existing = store[0];
		if (!isApplicantCompatible(existing, effectiveLoanName)) {
			devLog('init → existing incompatible, resetting');
			formState.replaceApplicants([defaults]);
		} else {
			devLog('init → existing compatible, keeping');
			// Hydrate business entity type from existing data (session resume)
			if (effectiveLoanName === 'Business Loan' && existing.businessApplicantType) {
				businessEntityType = existing.businessApplicantType as string;
			}
		}
	} else {
		const compatible = store.filter((a: any) => isApplicantCompatible(a, effectiveLoanName));
		devLog('init → multiple applicants, filtering', {
			total: store.length,
			compatible: compatible.length
		});
		formState.replaceApplicants(compatible.length > 0 ? [compatible[0]] : [defaults]);
	}

	return businessEntityType;
}

// ═══════════════════════════════════════════════════════════════════
// BUSINESS ENTITY TYPE
// ═══════════════════════════════════════════════════════════════════

/** @deprecated Moved to applicantBasicDetailsUnsecuredLoans.json as a formLevelQuestion */
export const BUSINESS_ENTITY_OPTIONS = [
	{ label: 'Sole Proprietorship', value: 'Sole Proprietorship' },
	{ label: 'One Person Company (OPC)', value: 'One Person Company (OPC)' },
	{ label: 'Private Limited', value: 'Private Limited' },
	{ label: 'Partnership Firm', value: 'Partnership Firm' },
	{ label: 'LLP', value: 'LLP' }
];

/** @deprecated Replaced by auto-derive in AddApplicant.updateFormLevelField() */
export const MULTI_APPLICANT_ENTITIES = new Set(['Private Limited', 'Partnership Firm', 'LLP']);

/**
 * @deprecated Replaced by AddApplicant.updateFormLevelField() with auto-derive.
 * Persists the business entity type selection in the store.
 * Returns true if the selected entity requires multi-applicant mode.
 */
export function persistBusinessEntityType(value: string): boolean {
	if (!value) return false;

	devLog('entityTypeChange', { value, isMulti: MULTI_APPLICANT_ENTITIES.has(value) });

	const updated = [...formState.applicants];
	if (value === 'Sole Proprietorship') {
		updated[APPLICANT_INDEX] = {
			...updated[APPLICANT_INDEX],
			applicantType: 'Individual',
			businessApplicantType: value
		};
	} else {
		updated[APPLICANT_INDEX] = {
			...updated[APPLICANT_INDEX],
			applicantType: (MULTI_APPLICANT_ENTITIES.has(value) ? 'company' : 'Individual') as any,
			businessApplicantType: value,
			companyType: MULTI_APPLICANT_ENTITIES.has(value) ? value : undefined
		};
	}
	formState.replaceApplicants(updated);

	return MULTI_APPLICANT_ENTITIES.has(value);
}

// ═══════════════════════════════════════════════════════════════════
// INCOME PROFILE HANDLER (Tab 1 equivalent)
// ═══════════════════════════════════════════════════════════════════

/**
 * Profile selection changed.
 *
 * Two concerns, both handled here:
 *
 *  1. **Drop on deselect** (Pitfall #24): when a profile is removed, its
 *     entries must not linger as orphans in `incomeEntries`. The submitted
 *     payload would otherwise carry data for profiles the user no longer
 *     claims, and downstream UI would surface entries the user doesn't
 *     expect to see.
 *
 *  2. **Auto-restore on reselect** (S104 — Issue 2 from 2026-05-16): if a
 *     user deselected Salaried, filled new entries, then realized the
 *     mistake and reselected Salaried, the original entries must come
 *     back. The deselect-reselect cycle is overwhelmingly an "oops"
 *     correction; the prior implementation discarded outright and forced
 *     the user to re-enter everything.
 *
 * Implementation: the dropped entries are stashed under
 * `applicant._stashedIncomeEntries[profileType]`. On a re-add of that
 * profile, the stash entries are popped back into `incomeEntries` and
 * the stash key is cleared. The 3 secured pages have the same shape via
 * a page-local `$state` stash; using an applicant-level field here means
 * the stash survives whatever component remounting the form does.
 *
 * Parity reference: `IncomePageNew.handleProfileSelectionChange` reaches
 * the same outcome via `applicantDataStore.softDelete` +
 * `restoreProfileEntries` (multi-applicant path).
 */
export function handleProfileSelectionChange(profiles: IncomeProfileType[]): void {
	const newList = [...formState.applicants];
	const current = newList[APPLICANT_INDEX] as Record<string, unknown>;
	const prevProfiles = (current?.selectedIncomeProfiles ?? []) as IncomeProfileType[];
	const existingEntries = (current?.incomeEntries as IncomeSourceEntry[] | undefined) ?? [];
	const stash = (current?._stashedIncomeEntries as Record<string, IncomeSourceEntry[]> | undefined)
		? { ...(current._stashedIncomeEntries as Record<string, IncomeSourceEntry[]>) }
		: {};

	// Stash entries whose profile is being removed in this change.
	const removedProfiles = prevProfiles.filter((p) => !profiles.includes(p));
	for (const removed of removedProfiles) {
		const toStash = existingEntries.filter((e) => e.profileType === removed);
		if (toStash.length > 0) {
			stash[removed] = toStash;
		}
	}

	// Drop deselected entries from the active list (Pitfall #24).
	let updatedEntries = existingEntries.filter((e) => profiles.includes(e.profileType));

	// Pop stashed entries for newly-added profiles back into the active list.
	const addedProfiles = profiles.filter((p) => !prevProfiles.includes(p));
	for (const added of addedProfiles) {
		const stashed = stash[added];
		if (stashed && stashed.length > 0) {
			// De-dup by id in case the user added an entry with the same id
			// in between deselect and reselect (rare but possible).
			const existingIds = new Set(updatedEntries.map((e) => e.id));
			const toRestore = stashed.filter((e) => !existingIds.has(e.id));
			updatedEntries = [...updatedEntries, ...toRestore];
			delete stash[added];
		}
	}

	newList[APPLICANT_INDEX] = {
		...current,
		selectedIncomeProfiles: profiles,
		employmentType: deriveLegacyEmploymentType(profiles),
		incomeEntries: updatedEntries,
		_stashedIncomeEntries: stash
	};
	formState.replaceApplicants(newList);
}

// ═══════════════════════════════════════════════════════════════════
// NRI INCOME STASH (Pitfall #57)
// ═══════════════════════════════════════════════════════════════════

/**
 * Stash an applicant's NRI-incompatible business income entries when their
 * isNRI flips from "No" to "Yes" (and pop them back on the reverse flip).
 *
 * WHY: User reported (2026-05-26) that flipping an existing Business Loan
 * applicant to NRI hides the business income profile cards (their
 * `showWhen` evaluates false), but the previously-entered income ENTRIES
 * persisted in `formState.applicants[id].incomeEntries`. The submitted
 * payload then carried director-company / proprietorship entries against
 * an isNRI=Yes applicant — invalid per the product rule that NRIs are
 * only supported as salaried. The user's framing: "if any income type is
 * hidden then related income should go to bin (because user can remove
 * NRI status and want to see earlier entered details)".
 *
 * DESIGN: This is the unsecured-loan parallel to
 * `applicantFormManager.applyNriCleanup` (secured-loan path). The secured
 * version routes through `applicantDataStore.updateSelectedProfiles`,
 * which auto-soft-deletes the dropped profiles' entries via
 * `softDeleteProfileEntries` — i.e., entries move to
 * `data.incomeEntries.deleted[profileType]` and can be restored later.
 *
 * For unsecured single-applicant flows (Personal Loan, Business Loan
 * proprietor, Professional Loan single applicant), the data lives at
 * `formState.applicants[idx].incomeEntries` (not in applicantDataStore).
 * We stash to `_stashedIncomeEntries[profileType]` — same pattern as
 * `handleProfileSelectionChange` (Pitfall #24) so a later isNRI=No flip
 * can pop the entries back.
 *
 * Caller responsibility: call this AFTER persisting the new isNRI value
 * to the applicant. The helper reads the current selectedIncomeProfiles
 * from the applicant entry, filters out NRI-incompatible ones (when
 * becomingNRI=true), and rewrites the entry with the stashed delta.
 *
 * Idempotent: safe to call on isNRI=Yes when no business profiles exist
 * (no-op), and safe to call on isNRI=No when no stash exists (no-op).
 */
export function applyNriIncomeStashForApplicant(
	applicantId: string,
	becomingNRI: boolean
): void {
	const idx = formState.applicants.findIndex(
		(a) => (a as Record<string, unknown>).id === applicantId
	);
	if (idx < 0) return;

	const current = formState.applicants[idx] as Record<string, unknown>;
	const selectedProfiles = (current.selectedIncomeProfiles as IncomeProfileType[] | undefined) ?? [];
	const existingEntries = (current.incomeEntries as IncomeSourceEntry[] | undefined) ?? [];
	const stash = (current._stashedIncomeEntries as Record<string, IncomeSourceEntry[]> | undefined)
		? { ...(current._stashedIncomeEntries as Record<string, IncomeSourceEntry[]>) }
		: {};

	// Local copy of the canonical NRI-incompatible profile list — kept inline
	// to avoid a circular import with applicantVisibility.ts (which imports
	// from $lib/types). Source of truth: NRI_INCOMPATIBLE_BUSINESS_PROFILES.
	const NRI_INCOMPATIBLE: IncomeProfileType[] = [
		'business_proprietorship' as IncomeProfileType,
		'business_partnership' as IncomeProfileType,
		'director_company' as IncomeProfileType,
		'professional_practice' as IncomeProfileType
	];

	if (becomingNRI) {
		// Stash incompatible profile entries into _stashedIncomeEntries.
		const toStash = selectedProfiles.filter((p) => NRI_INCOMPATIBLE.includes(p));
		if (toStash.length === 0) return; // nothing to do — applicant had only NRI-compatible profiles

		for (const profileType of toStash) {
			const entries = existingEntries.filter((e) => e.profileType === profileType);
			if (entries.length > 0) {
				stash[profileType] = entries;
			}
		}
		const remainingEntries = existingEntries.filter(
			(e) => !NRI_INCOMPATIBLE.includes(e.profileType as IncomeProfileType)
		);
		const remainingProfiles = selectedProfiles.filter((p) => !NRI_INCOMPATIBLE.includes(p));

		const newList = [...formState.applicants];
		newList[idx] = {
			...current,
			selectedIncomeProfiles: remainingProfiles,
			employmentType: deriveLegacyEmploymentType(remainingProfiles),
			incomeEntries: remainingEntries,
			_stashedIncomeEntries: stash
		};
		formState.replaceApplicants(newList);
		devLog('NRI stash applied', { applicantId, stashedProfiles: toStash });
		return;
	}

	// becomingNRI === false → pop stashed incompatible entries back
	const stashedKeys = Object.keys(stash).filter((k) =>
		NRI_INCOMPATIBLE.includes(k as IncomeProfileType)
	) as IncomeProfileType[];
	if (stashedKeys.length === 0) return;

	const existingIds = new Set(existingEntries.map((e) => e.id));
	let restoredEntries: IncomeSourceEntry[] = [...existingEntries];
	const restoredProfiles = [...selectedProfiles];
	const newStash = { ...stash };

	for (const profileType of stashedKeys) {
		const entries = newStash[profileType] ?? [];
		const fresh = entries.filter((e) => !existingIds.has(e.id));
		restoredEntries = [...restoredEntries, ...fresh];
		if (!restoredProfiles.includes(profileType)) restoredProfiles.push(profileType);
		delete newStash[profileType];
	}

	const newList = [...formState.applicants];
	newList[idx] = {
		...current,
		selectedIncomeProfiles: restoredProfiles,
		employmentType: deriveLegacyEmploymentType(restoredProfiles),
		incomeEntries: restoredEntries,
		_stashedIncomeEntries: newStash
	};
	formState.replaceApplicants(newList);
	devLog('NRI stash restored', { applicantId, restoredProfiles: stashedKeys });
}

// ═══════════════════════════════════════════════════════════════════
// INCOME ENTRY HANDLERS (Tab 2 equivalent)
// ═══════════════════════════════════════════════════════════════════

/** Add a new income source entry */
export function handleAddEntry(entry: IncomeSourceEntry): void {
	const newList = [...formState.applicants];
	const current = newList[APPLICANT_INDEX];
	const entries = [...((current.incomeEntries as IncomeSourceEntry[]) ?? []), entry];
	newList[APPLICANT_INDEX] = { ...current, incomeEntries: entries };
	formState.replaceApplicants(newList);
}

/** Update an existing income source entry (edit mode) */
export function handleUpdateEntry(entry: IncomeSourceEntry): void {
	const newList = [...formState.applicants];
	const current = newList[APPLICANT_INDEX];
	const entries = ((current.incomeEntries as IncomeSourceEntry[]) ?? []).map(
		(e: IncomeSourceEntry) => (e.id === entry.id ? entry : e)
	);
	newList[APPLICANT_INDEX] = { ...current, incomeEntries: entries };
	formState.replaceApplicants(newList);
}

/** Delete an income source entry */
export function handleDeleteEntry(entryId: string): void {
	const newList = [...formState.applicants];
	const current = newList[APPLICANT_INDEX];
	const entries = ((current.incomeEntries as IncomeSourceEntry[]) ?? []).filter(
		(e: IncomeSourceEntry) => e.id !== entryId
	);
	newList[APPLICANT_INDEX] = { ...current, incomeEntries: entries };
	formState.replaceApplicants(newList);
}

// ═══════════════════════════════════════════════════════════════════
// CREDIT SCORE HANDLER (Tab 3 equivalent)
// ═══════════════════════════════════════════════════════════════════

/**
 * Credit score data changed.
 * Maps CreditScoreSection's prop names to store field names:
 *   creditScore → creditScore
 *   whyLowCredit → whyPrimaryLowCredit
 *   + all graduated credit signal fields for persistence
 */
export function handleCreditScoreChange(answers: Record<string, unknown>): void {
	const newList = [...formState.applicants];
	const mapped: Record<string, unknown> = {};
	if ('creditScore' in answers) mapped.creditScore = answers.creditScore;
	if ('whyLowCredit' in answers) mapped.whyPrimaryLowCredit = answers.whyLowCredit;

	if ('creditFactorsAnswered' in answers)
		mapped.creditFactorsAnswered = answers.creditFactorsAnswered;
	if ('creditFactorAnswers' in answers) mapped.creditFactorAnswers = answers.creditFactorAnswers;
	if ('creditFactorReasons' in answers) mapped.creditFactorReasons = answers.creditFactorReasons;
	// Graduated credit signal fields — persist for navigation restore
	if ('creditHistoryStatus' in answers) mapped.creditHistoryStatus = answers.creditHistoryStatus;
	if ('emiBounceCount' in answers) mapped.emiBounceCount = answers.emiBounceCount;
	if ('defaultSettlementStatus' in answers)
		mapped.defaultSettlementStatus = answers.defaultSettlementStatus;
	if ('recentEnquiryCount' in answers) mapped.recentEnquiryCount = answers.recentEnquiryCount;
	if ('bounceReason' in answers) mapped.bounceReason = answers.bounceReason;
	if ('defaultReason' in answers) mapped.defaultReason = answers.defaultReason;
	if ('enquiryReason' in answers) mapped.enquiryReason = answers.enquiryReason;

	newList[APPLICANT_INDEX] = { ...newList[APPLICANT_INDEX], ...mapped };
	formState.replaceApplicants(newList);
}

// ═══════════════════════════════════════════════════════════════════
// OBLIGATION HANDLER (Tab 4 equivalent)
// ═══════════════════════════════════════════════════════════════════

/** Obligation data updated (loan entries, limit entries, totals) */
export function handleObligationUpdate(data: Record<string, any>): void {
	const newList = [...formState.applicants];
	newList[APPLICANT_INDEX] = { ...newList[APPLICANT_INDEX], ...data };
	formState.replaceApplicants(newList);
}
