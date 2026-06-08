/**
 * Applicant Recovery Detection
 * ═══════════════════════════════════════════════════════════════════
 * Near-pure utilities for detecting previously-deleted applicants
 * that can be restored. Returns match data without mutating state —
 * the caller handles state updates.
 *
 * Extracted from AddApplicant.svelte for reuse and testability.
 */

import type { RecoveryScope } from '$lib/state/applicant.svelte';
import type { RestoreIntentMatch } from '$lib/stores/restoreApplicantIntent.svelte';
import {
	buildDetectionKey,
	buildMatchSignature,
	applicantState
} from '$lib/state/applicant.svelte';
import { categoryFromScope, type LoanCategory } from '$lib/utils/recoveryCompatibility.js';

/** Parameters for form-mode detection.
 *  Note (S104): `restoreAskedForKey` is no longer a param — the detector now
 *  consults `applicantState.hasRestoreAsked(detectionKey)` directly. That memory
 *  was previously component-local `$state`, which reset on remount → modal
 *  re-fired on browser back→next. See CLAUDE.md Pitfall #30. */
export interface FormDetectionParams {
	formApplicant: Record<string, unknown>;
	editingIndex: number | null;
	applicants: Record<string, unknown>[];
	getRecoveryScope: (applicantType: string | undefined) => RecoveryScope;
	/** When provided, cross-loan suggestions are appended after same-scope matches */
	targetLoanCategory?: LoanCategory;
}

/** Parameters for table-row detection */
export interface IndexDetectionParams {
	index: number;
	applicants: Record<string, unknown>[];
	getRecoveryScope: (applicantType: string | undefined) => RecoveryScope;
	/** When provided, cross-loan suggestions are appended after same-scope matches */
	targetLoanCategory?: LoanCategory;
}

/** Result of a detection — caller uses this to set state */
export interface DetectionResult {
	detectionKey: string;
	sortedMatches: RestoreIntentMatch[];
	targetIndex: number;
	recoveryScope: RecoveryScope;
}

/**
 * Sort and map recovery matches for the restore modal.
 * Shared by both form-mode and table-mode detection.
 */
export function buildSortedMatches(
	matches: Array<{
		uuid: string;
		displayName: string;
		deletedAt: number;
		data: Record<string, unknown>;
		summary?: RestoreIntentMatch['summary'];
		linkedCompanyName?: string;
		linkedCompanyEntityType?: string;
		directorRole?: string;
		loanProduct?: string;
		employmentType?: string;
		roleWarning?: string;
		isCrossLoan?: boolean;
	}>
): RestoreIntentMatch[] {
	return matches
		.sort((a, b) => b.deletedAt - a.deletedAt)
		.map((m) => ({
			uuid: m.uuid,
			displayName: m.displayName,
			deletedAt: m.deletedAt,
			data: m.data,
			matchSource: 'recovery' as const,
			summary: m.summary,
			linkedCompanyName: m.linkedCompanyName,
			linkedCompanyEntityType: m.linkedCompanyEntityType,
			directorRole: m.directorRole,
			loanProduct: m.loanProduct,
			employmentType: m.employmentType,
			roleWarning: m.roleWarning,
			isCrossLoan: m.isCrossLoan
		}));
}

/**
 * Find live applicant matches — applicants already in the form that match by name.
 * Returns RestoreIntentMatch[] with matchSource: 'live'.
 */
export function findLiveMatches(params: {
	formApplicant: Record<string, unknown>;
	editingIndex: number | null;
	applicants: Record<string, unknown>[];
}): RestoreIntentMatch[] {
	const { formApplicant, editingIndex, applicants } = params;

	const applicantType = formApplicant.applicantType as string;
	if (!applicantType) return [];

	const typedName =
		applicantType === 'Individual'
			? String(formApplicant.fullName ?? '')
					.trim()
					.toLowerCase()
			: String(formApplicant.companyName ?? '')
					.trim()
					.toLowerCase();

	if (typedName.length < 2) return [];

	const results: RestoreIntentMatch[] = [];

	for (let i = 0; i < applicants.length; i++) {
		if (i === editingIndex) continue;
		const a = applicants[i];
		if (a.applicantType !== applicantType) continue;

		const existingName =
			applicantType === 'Individual'
				? String(a.fullName ?? '')
						.trim()
						.toLowerCase()
				: String(a.companyName ?? '')
						.trim()
						.toLowerCase();

		if (!existingName || existingName.length < 2) continue;

		// Strict prefix match — typed text must be a prefix of the existing name
		const isMatch = existingName.startsWith(typedName);
		if (!isMatch) continue;

		// Build summary from live applicant data
		const incomeEntries = (a.incomeEntries as Array<Record<string, unknown>> | undefined) ?? [];
		const incomeSources = incomeEntries.map((e) => ({
			entityName: String(e.entityName ?? ''),
			profileType: String(e.profileType ?? '')
		}));

		const obligations = ((a.obligations as Array<Record<string, unknown>> | undefined) ?? []).map(
			(o) => ({
				bankName: String(o.bankName ?? ''),
				loanType: String(o.loanType ?? ''),
				emi: o.emi ? String(o.emi) : undefined
			})
		);

		// Find linked company name + entity type if director-linked.
		// Entity type is captured so cross-session ownership restore can fall back
		// to a name+entity match when company UUIDs differ (Issue #2 / Option B).
		const linkedCompanyId = a.linkedCompanyId as string | undefined;
		let linkedCompanyName: string | undefined;
		let linkedCompanyEntityType: string | undefined;
		if (linkedCompanyId) {
			const company = applicants.find(
				(c) => c.id === linkedCompanyId && c.applicantType === 'Company'
			);
			linkedCompanyName =
				(company?.companyName as string) || (company?.fullName as string) || undefined;
			linkedCompanyEntityType =
				(company?.companyType as string) ||
				(company?.businessEntityType as string) ||
				undefined;
		}

		results.push({
			uuid: (a.id as string) || `live-${i}`,
			displayName:
				applicantType === 'Individual' ? String(a.fullName ?? '') : String(a.companyName ?? ''),
			deletedAt: 0,
			data: a,
			matchSource: 'live',
			liveIndex: i,
			isDirectorLinked: !!linkedCompanyId,
			linkedCompanyName,
			linkedCompanyEntityType,
			summary: {
				incomeSources,
				obligations,
				cibilScore: (a.cibilScore as number) || undefined,
				totalActiveIncomeSources: incomeSources.length,
				totalObligations: obligations.length
			}
		});
	}

	return results;
}

/**
 * Detect cached applicant matches for the current form state.
 * Returns a DetectionResult if matches are found, null otherwise.
 * Does NOT mutate any state — caller handles restoreAskedForKey and restoreIntentState.
 *
 * Uses UUID-based denial: filters out matches whose UUIDs were previously
 * denied by the user. If all matches are denied, returns null (suppressed).
 * If some matches are new (not denied), returns only those.
 */
export function detectCachedForForm(params: FormDetectionParams): DetectionResult | null {
	const {
		formApplicant,
		editingIndex,
		applicants,
		getRecoveryScope,
		targetLoanCategory
	} = params;

	if (!formApplicant.applicantType) return null;

	const detectionKey = buildDetectionKey(formApplicant);
	if (!detectionKey) return null;
	// Session-scoped suppression — was previously a component-local $state that
	// reset on remount, causing the modal to re-fire on browser back→next. Now
	// reads from applicantState (sessionStorage-backed). Pitfall #30.
	if (applicantState.hasRestoreAsked(detectionKey)) return null;

	const nameValue =
		formApplicant.applicantType === 'Individual'
			? formApplicant.fullName
			: formApplicant.companyName;
	if (!nameValue || String(nameValue).trim().length < 2) return null;

	const scope = getRecoveryScope(formApplicant.applicantType as string);
	const namePrefix = String(nameValue).trim();

	// ── Same-scope recovery bin matches ──
	let recoveryMatches: RestoreIntentMatch[] = [];
	const cache = applicantState.recoveryBin;
	if (cache.length > 0) {
		const alreadyAddedSignatures = new Set(
			applicants
				.filter((_, i) => i !== editingIndex)
				.map((a) => buildMatchSignature(a))
				.filter(Boolean) as string[]
		);

		const nameMatches = applicantState.findRecoverableByName(formApplicant, scope);
		const notAlreadyAdded = nameMatches.filter(
			(entry) => !alreadyAddedSignatures.has(entry.matchSignature)
		);
		const nonDeniedRecovery = applicantState.filterDeniedMatches(notAlreadyAdded);
		recoveryMatches = buildSortedMatches(nonDeniedRecovery);
	}

	// ── Cross-loan suggestions (other loan scopes, compatibility-filtered) ──
	// Pass companyType so Pvt Ltd / OPC / LLP / Partnership / Public Ltd / Section 8
	// matches stay sub-filtered (CLAUDE.md Pitfall #32 — different legal entities
	// have different field shapes; restoring across companyTypes silently corrupts).
	const effectiveCategory = targetLoanCategory ?? categoryFromScope(scope);
	const crossLoanRaw = applicantState.findCrossLoanSuggestions(
		namePrefix,
		scope,
		effectiveCategory,
		formApplicant.applicantType as 'Individual' | 'Company' | undefined,
		(formApplicant.companyType as string | undefined) ?? undefined
	);
	const crossLoanDeniedFiltered = applicantState.filterDeniedMatches(crossLoanRaw);
	const crossLoanMatches = buildSortedMatches(
		crossLoanDeniedFiltered.map((e) => ({
			...e,
			roleWarning: e.compatibility?.warning,
			isCrossLoan: true
		}))
	);

	// ── Live applicant matches ──
	const liveMatches = findLiveMatches({ formApplicant, editingIndex, applicants });
	const nonDeniedLive = applicantState.filterDeniedMatches(liveMatches);

	// Order: same-scope recovery → live → cross-loan (cross-loan surfaced last, clearly separated)
	const allMatches = [...recoveryMatches, ...nonDeniedLive, ...crossLoanMatches];
	if (allMatches.length === 0) return null;

	return {
		detectionKey,
		sortedMatches: allMatches,
		targetIndex: editingIndex ?? applicants.length,
		recoveryScope: scope
	};
}

/**
 * Detect cached applicant matches for a table row at the given index.
 * Returns a DetectionResult if matches are found, null otherwise.
 * Does NOT mutate any state — caller handles restoreAskedForKey and restoreIntentState.
 */
export function detectCachedForIndex(params: IndexDetectionParams): DetectionResult | null {
	const { index, applicants, getRecoveryScope, targetLoanCategory } = params;

	const applicant = applicants[index];
	if (!applicant) return null;
	if (!applicant.applicantType) return null;

	const detectionKey = buildDetectionKey(applicant);
	if (!detectionKey) return null;
	// Session-scoped suppression — see Pitfall #30.
	if (applicantState.hasRestoreAsked(detectionKey)) return null;

	const scope = getRecoveryScope(applicant.applicantType as string);

	const nameValue =
		applicant.applicantType === 'Individual' ? applicant.fullName : applicant.companyName;
	const namePrefix = String(nameValue ?? '').trim();

	// ── Same-scope recovery bin matches ──
	let recoveryMatches: RestoreIntentMatch[] = [];
	const cache = applicantState.recoveryBin;
	if (cache.length > 0) {
		const alreadyAddedSignatures = new Set(
			applicants
				.filter((_, i) => i !== index)
				.map((a) => buildMatchSignature(a))
				.filter(Boolean) as string[]
		);

		const matches = applicantState
			.findRecoverableByName(applicant, scope)
			.filter((entry) => !alreadyAddedSignatures.has(entry.matchSignature));
		const nonDeniedRecovery = applicantState.filterDeniedMatches(matches);
		recoveryMatches = buildSortedMatches(nonDeniedRecovery);
	}

	// ── Cross-loan suggestions (other loan scopes, compatibility-filtered) ──
	if (namePrefix.length >= 2) {
		const effectiveCategory = targetLoanCategory ?? categoryFromScope(scope);
		const crossLoanRaw = applicantState.findCrossLoanSuggestions(
			namePrefix,
			scope,
			effectiveCategory,
			applicant.applicantType as 'Individual' | 'Company' | undefined,
			(applicant.companyType as string | undefined) ?? undefined
		);
		const crossLoanDeniedFiltered = applicantState.filterDeniedMatches(crossLoanRaw);
		const crossLoanMatches = buildSortedMatches(
			crossLoanDeniedFiltered.map((e) => ({
				...e,
				roleWarning: e.compatibility?.warning,
				isCrossLoan: true
			}))
		);
		recoveryMatches = [...recoveryMatches, ...crossLoanMatches];
	}

	// ── Live applicant matches ──
	const liveMatches = findLiveMatches({
		formApplicant: applicant,
		editingIndex: index,
		applicants
	});
	const nonDeniedLive = applicantState.filterDeniedMatches(liveMatches);

	const allMatches = [...recoveryMatches, ...nonDeniedLive];
	if (allMatches.length === 0) return null;

	return {
		detectionKey,
		sortedMatches: allMatches,
		targetIndex: index,
		recoveryScope: scope
	};
}
