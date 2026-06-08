/**
 * Shared applicant restore logic for all 6 loan pages.
 * Ensures consistent behavior across secured and unsecured loans.
 *
 * Fixes applied:
 * - Clear stale selectedIncomeProfiles (prevents wrong profiles on income page)
 * - Remove stale linkedCompanyId/linkedCompanyIds (prevents orphan director errors)
 * - Remove restored entry from recovery bin (prevents double-modal)
 * - Set __restoredFrom tag consistently
 */

import { v4 as uuidv4 } from 'uuid';
import { formState } from '$lib/state/form.svelte';
import { applicantDataStore } from '$lib/stores/applicantDataStore.svelte';
import { applicantState } from '$lib/state/applicant.svelte';
import { restoreIntentState } from '$lib/stores/restoreApplicantIntent.svelte';
import { restoreRelationshipsForApplicant } from '$lib/utils/restoreRelationships';
import { scrubObligationsForJourney } from '$lib/utils/obligationClosureScrub';

export interface RestoreMatchData {
	uuid: string;
	displayName: string;
	data: Record<string, unknown>;
	matchSource?: string;
	liveIndex?: number;
}

/** Pending restore state — holds deferred structured data until user confirms */
export interface PendingRestore {
	matchUuid: string;
	displayName: string;
	cardId: string;
	currentIndex: number;
	structured?: Record<string, unknown>;
	savedRelationships?: unknown[];
	/** Pre-restore snapshot for undo */
	previousSlot?: Record<string, unknown>;
	previousApplicantData?: Record<string, unknown>;
}

/**
 * Phase 1: Pre-fill basic identity fields only. Does NOT wire income/obligations/company links.
 * Returns a PendingRestore that can be committed or cancelled.
 *
 * @returns { cardId, pending } or null if not handled (live match).
 */
export function prefillApplicantRestore(
	match: RestoreMatchData
): { cardId: string; pending: PendingRestore } | null {
	// Live match — handled by the manager, not here
	if (match.matchSource === 'live' && match.liveIndex !== undefined) {
		restoreIntentState.markLiveEdit(match.liveIndex);
		restoreIntentState.reset();
		return null;
	}

	const restoredData = match.data;
	const currentIndex = restoreIntentState.currentIndex;
	if (currentIndex === undefined || !restoredData) {
		// Defensive bail — the modal was opened with a director-slot context
		// (DirectorFormModal → `restoreIntentState.set({ directorRestore: ... })`)
		// and routed here without going through `handleRestoreModalConfirm`.
		// In that case the page-level handler should have intercepted and routed
		// the confirm to `applyDirectorRestore` on the form ref.
		//
		// The unsecured-loan pages (business / personal / professional) used to
		// only call `prefillApplicantRestore` for ALL confirms — when the intent
		// had `directorRestore` set, `currentIndex` was undefined and this guard
		// returned null without resetting the modal, leaving the UI silently
		// frozen with no toast / error / console output (user-reported
		// 2026-05-23 in the Pvt Ltd → OPC → Pvt Ltd re-add-rajeev repro).
		//
		// Reset the intent so the modal closes instead of hanging. Pages now
		// route director restores through `handleRestoreModalConfirm` BEFORE
		// reaching here — this branch is the belt-and-suspenders safety net.
		if (restoreIntentState.directorRestore) {
			restoreIntentState.reset();
		}
		return null;
	}

	const newList = [...formState.applicants];
	const existingSlot = newList[currentIndex];
	const currentCardId = (existingSlot?.id as string) ?? uuidv4();

	// Defensive guard: refuse cross-type restores. CLAUDE.md Pitfall #32.
	//
	// Two cases:
	//   1. existingSlot has a known applicantType → check against restoredType.
	//   2. NO existingSlot (push-new restore, currentIndex === applicants.length)
	//      → fall back to the caller-supplied hint `slotApplicantType` so a
	//      Company-form session can't silently push an Individual ghost
	//      (the user-reported S104 bug: Restore appeared to do nothing but
	//      added a row visible on the next page).
	//
	// Also check companyType when both sides are Companies — restoring a Pvt Ltd
	// record into an OPC slot makes no DSA-comprehensible sense (different legal
	// entities, different field shapes, downstream rule engine produces nonsense).
	const slotType =
		(existingSlot?.applicantType as 'Individual' | 'Company' | undefined) ??
		restoreIntentState.slotApplicantType;
	const restoredType = restoredData.applicantType as 'Individual' | 'Company' | undefined;
	if (slotType && restoredType && slotType !== restoredType) {
		restoreIntentState.reset();
		return null;
	}
	if (slotType === 'Company' && restoredType === 'Company') {
		const slotCompanyType =
			((existingSlot?.companyType as string | undefined) ??
				restoreIntentState.slotCompanyType ??
				'').trim();
		const restoredCompanyType = ((restoredData.companyType as string | undefined) ?? '').trim();
		// Only block when BOTH sides have a known companyType and they differ.
		// If either side is empty (slot in early flow, legacy data) be permissive —
		// the cross-loan detector already filters by companyType when known.
		if (slotCompanyType && restoredCompanyType && slotCompanyType !== restoredCompanyType) {
			restoreIntentState.reset();
			return null;
		}
	}

	const structured = restoredData._structured as Record<string, unknown> | undefined;
	const savedRelationships = restoredData._savedRelationships;

	// Snapshot previous state for undo
	const previousSlot = existingSlot ? { ...existingSlot } : undefined;
	const previousApplicantData = currentCardId ? applicantDataStore.get(currentCardId) : undefined;

	const restoredEntry: Record<string, unknown> = {
		...restoredData,
		id: currentCardId,
		touchedFields: {}
	};

	// Clean internal/stale fields
	delete restoredEntry._structured;
	delete restoredEntry._savedRelationships;

	// Clear stale income profiles — income page must re-evaluate from scratch
	restoredEntry.selectedIncomeProfiles = [];
	restoredEntry.__completion = false;

	// Reset secured-loan participation flags when restoring into unsecured loans.
	// onEMI/onProperty are explicit DSA answers for secured loans but are always
	// hardcoded (onEMI=true, onProperty=false) for unsecured. The saveApplicant()
	// path in each unsecured component sets these — but restore bypasses it.
	// Reading the current loanCategory from formState is reliable here because
	// clearForLoanType() runs before any restore can be triggered on a new loan.
	const targetCategory = (formState.applicationData as Record<string, unknown>)
		?.loanCategory as string | undefined;
	const isUnsecuredTarget =
		targetCategory === 'personal' ||
		targetCategory === 'business' ||
		targetCategory === 'professional';
	if (isUnsecuredTarget) {
		restoredEntry.onEMI = true;
		restoredEntry.onProperty = false;
	}

	// Clear stale company links if the linked company no longer exists in this case.
	// Without this, the applicant table hides director-linked entries, so a restored
	// director whose company was deleted would be invisible in the UI.
	// Save the original link for Phase 2 re-linking (Gap 3: company may be restored later).
	const linkedId = restoredEntry.linkedCompanyId as string | undefined;
	if (linkedId) {
		restoredEntry.__pendingCompanyLink = linkedId;
		const companyStillExists = newList.some(
			(a) => a.id === linkedId && a.applicantType === 'Company'
		);
		if (!companyStillExists) {
			delete restoredEntry.linkedCompanyId;
			restoredEntry.linkedCompanyIds = [];
		}
	}

	// Tag for edit-or-new detection
	restoredEntry.__restoredFrom = { ...restoredEntry };

	// Insert into applicant list (basic identity fields only)
	if (existingSlot) {
		newList[currentIndex] = restoredEntry;
	} else {
		newList.push(restoredEntry);
	}
	formState.replaceApplicants(newList);

	// Clear stale validation errors for the restored slot
	const { [currentIndex]: _, ...cleanErrors } = formState.applicantErrors;
	formState.replaceApplicantErrors(cleanErrors);

	// Don't apply structured data yet — defer to commitApplicantRestore()
	const pending: PendingRestore = {
		matchUuid: match.uuid,
		displayName: match.displayName,
		cardId: currentCardId,
		currentIndex,
		structured,
		savedRelationships: Array.isArray(savedRelationships) ? savedRelationships : undefined,
		previousSlot,
		previousApplicantData: previousApplicantData
			? (structuredClone(previousApplicantData) as unknown as Record<string, unknown>)
			: undefined
	};

	restoreIntentState.markConfirmed();
	restoreIntentState.reset();

	return { cardId: currentCardId, pending };
}

/**
 * Phase 2: Commit the pending restore — wire income/obligations/CIBIL and relationships.
 * Call this when user clicks "Confirm & Load Financial Data".
 *
 * Handles 4 restoration gaps:
 *   Gap 1: Rebuild selectedIncomeProfiles from structured income entries
 *   Gap 2: Re-link directors to companies after restoration
 *   Gap 3: Re-establish company links that were cleared in Phase 1 (timing fix)
 *   Gap 4: Detect and resolve contradicting income profiles (e.g., no_current_income + earning profile)
 */
export function commitApplicantRestore(pending: PendingRestore): void {
	const { cardId, structured, savedRelationships, matchUuid } = pending;

	// Apply structured income/obligation/CIBIL data — but first scrub any
	// obligation closure plans that aren't valid for the CURRENT journey.
	//
	// Pitfall #31: a cross-loan restore can bring obligations whose
	// `selectedToClose` was set in the source journey (e.g. "Will be closed by
	// Top-up amount" from a Personal-Loan DC flow). If the target journey is
	// Plot-Loan New, that option isn't visible — the Saved Obligations chip
	// shows a stale label, the form has no option selected, and Next-disabled
	// validators silently pass. Scrub stale values to '' so the form re-asks.
	if (structured && cardId) {
		// The journey's SCOPE (e.g. "New Loan" / "Debt Consolidation" /
		// "Top-up Only") decides which closure options are visible. Read from
		// `applicationData.loanType` which post-2026-05-31-rename (ADR-0020)
		// consistently stores SCOPE across all 6 loans. Variable renamed from
		// `journeyVariant` → `journeyScope` 2026-06-01 (S209, TECH-DEBT-CLEANUP
		// D1/D2) along with the matching prop in IncomePageNew + ObligationCapture.
		const journeyScope =
			((formState.applicationData as Record<string, unknown> | undefined)?.loanType as
				| string
				| undefined) ?? '';
		const scrubbed = scrubStructuredObligations(structured, journeyScope);
		applicantDataStore.fromJSON({
			...applicantDataStore.toJSON(),
			[cardId]: scrubbed as any
		});
	}

	// ── Gap 1 + 4: Rebuild selectedIncomeProfiles from restored income data ──
	// Phase 1 clears selectedIncomeProfiles=[]. Rebuild from the structured
	// income entries so the income page shows the correct profiles selected.
	if (structured && cardId) {
		const restoredProfiles = rebuildSelectedIncomeProfiles(structured);
		if (restoredProfiles.length > 0) {
			const newList = [...formState.applicants];
			const entry = newList[pending.currentIndex];
			if (entry && entry.id === cardId) {
				newList[pending.currentIndex] = {
					...entry,
					selectedIncomeProfiles: restoredProfiles
				};
				formState.replaceApplicants(newList);
			}
		}
	}

	// ── Gap 2 + 3: Re-link directors and companies ──
	relinkDirectorsAndCompanies(cardId, pending.currentIndex);

	// Restore relationships (synchronous to ensure wizard state sees them immediately)
	if (Array.isArray(savedRelationships) && savedRelationships.length > 0) {
		const currentEntry = formState.applicants[pending.currentIndex];
		if (currentEntry) {
			restoreRelationshipsForApplicant(
				cardId,
				currentEntry as Record<string, unknown>,
				savedRelationships as any[],
				formState.applicants as Record<string, unknown>[]
			);
		}
	}

	// Re-evaluate completion for the restored applicant so sub-pages unlock
	const restoredApplicant = formState.applicants[pending.currentIndex];
	if (restoredApplicant) {
		const hasName = !!(restoredApplicant.fullName || restoredApplicant.name);
		const hasAge = !!(restoredApplicant.age || restoredApplicant.dateOfBirth);
		if (hasName && hasAge) {
			const newList = [...formState.applicants];
			newList[pending.currentIndex] = {
				...newList[pending.currentIndex],
				__completion: true,
				allRequiredAnswered: true
			};
			formState.replaceApplicants(newList);
		}
	}

	// Remove from recovery bin (prevents double-modal)
	applicantState.restoreFromRecoveryBin(matchUuid);
}

/**
 * Walk the restored structured-data envelope and scrub stale closure-plan
 * values from `obligations.active[]` against the current journey. Returns
 * either the same reference (nothing scrubbed) or a shallow-cloned envelope
 * with a fresh `obligations.active` array.
 *
 * Exported for unit tests; production callers should use the side-effecting
 * branch inside `commitApplicantRestore`.
 *
 * See `$lib/utils/obligationClosureScrub.ts` for the per-obligation logic.
 */
export function scrubStructuredObligations(
	structured: Record<string, unknown>,
	journeyLoanVariant: string
): Record<string, unknown> {
	const obligations = structured.obligations as
		| { active?: Array<Record<string, unknown>>; deleted?: unknown[] }
		| undefined;
	const active = obligations?.active;
	if (!Array.isArray(active) || active.length === 0) return structured;
	const scrubbed = scrubObligationsForJourney(active, journeyLoanVariant);
	if (scrubbed === active) return structured;
	return {
		...structured,
		obligations: {
			...(obligations ?? {}),
			active: scrubbed
		}
	};
}

/**
 * Gap 1 + 4: Extract income profile types from structured data and resolve contradictions.
 *
 * Reads `incomeProfiles.selectedProfiles` first (explicit selection).
 * Falls back to deriving from `incomeEntries.active` keys (implicit from data).
 * Removes `no_current_income` if actual earning profiles exist (Gap 4 contradiction).
 */
export function rebuildSelectedIncomeProfiles(structured: Record<string, unknown>): string[] {
	const profiles = new Set<string>();

	// Source 1: Explicit selectedProfiles saved in structured data
	const incomeProfiles = structured.incomeProfiles as { selectedProfiles?: string[] } | undefined;
	if (incomeProfiles?.selectedProfiles?.length) {
		for (const p of incomeProfiles.selectedProfiles) profiles.add(p);
	}

	// Source 2: Derive from income entry keys (covers cases where selectedProfiles wasn't saved)
	const incomeEntries = structured.incomeEntries as
		| { active?: Record<string, unknown[]> }
		| undefined;
	if (incomeEntries?.active) {
		for (const profileType of Object.keys(incomeEntries.active)) {
			const entries = incomeEntries.active[profileType];
			if (Array.isArray(entries) && entries.length > 0) {
				profiles.add(profileType);
			}
		}
	}

	const result = [...profiles];

	// Gap 4: Resolve contradiction — no_current_income alongside actual earning profiles
	const hasEarningProfiles = result.some((p) => p !== 'no_current_income');
	if (hasEarningProfiles && result.includes('no_current_income')) {
		return result.filter((p) => p !== 'no_current_income');
	}

	return result;
}

/**
 * Gap 2 + 3: Re-establish director-company links after restoration.
 *
 * Two scenarios handled:
 * A) Restored Individual was a director — check if company now exists and re-link
 * B) Restored Company has directors — find matching Individuals and re-link them
 */
function relinkDirectorsAndCompanies(restoredCardId: string, restoredIndex: number): void {
	const applicants = formState.applicants;
	const restoredEntry = applicants[restoredIndex];
	if (!restoredEntry) return;

	let newList = [...applicants];
	let changed = false;

	// Scenario A: Restored Individual had a company link cleared in Phase 1
	const pendingLink = restoredEntry.__pendingCompanyLink as string | undefined;
	if (pendingLink && restoredEntry.applicantType === 'Individual') {
		const companyExists = newList.some(
			(a) => a.id === pendingLink && a.applicantType === 'Company'
		);
		if (companyExists && !restoredEntry.linkedCompanyId) {
			// Company now exists — re-establish the link
			const existingLinkedIds = (restoredEntry.linkedCompanyIds as string[] | undefined) ?? [];
			const linkedCompanyIds = [...new Set([...existingLinkedIds, pendingLink])];
			newList[restoredIndex] = {
				...restoredEntry,
				linkedCompanyId: pendingLink,
				linkedCompanyIds
			};
			changed = true;
		}
	}

	// Scenario B: Restored Company — find unlinked Individuals that were previously directors
	if (restoredEntry.applicantType === 'Company') {
		const companyId = restoredEntry.id as string;
		const directors = (restoredEntry.directors ?? []) as Array<{ fullName?: string; id?: string }>;

		for (let i = 0; i < newList.length; i++) {
			if (i === restoredIndex) continue;
			const applicant = newList[i];
			if (applicant.applicantType !== 'Individual') continue;

			// Check if this Individual had a pending link to the restored company
			const applicantPendingLink = applicant.__pendingCompanyLink as string | undefined;
			if (applicantPendingLink === companyId && !applicant.linkedCompanyId) {
				const existingLinkedIds = (applicant.linkedCompanyIds as string[] | undefined) ?? [];
				const linkedCompanyIds = [...new Set([...existingLinkedIds, companyId])];
				newList[i] = {
					...applicant,
					linkedCompanyId: companyId,
					linkedCompanyIds
				};
				changed = true;
				continue;
			}

			// Also match by director name — covers cases where the Individual was restored
			// before __pendingCompanyLink was implemented, or was never deleted.
			// Honor the user's "different applicant" Restore-modal choice: an Individual
			// flagged __independentOfSameName must NOT be auto-linked into the company's
			// director sub-row pool, regardless of name overlap.
			if (!applicant.linkedCompanyId && !applicant.__independentOfSameName) {
				const applicantName = ((applicant.fullName as string) ?? '').trim().toLowerCase();
				if (!applicantName) continue;
				const matchesDirector = directors.some(
					(d) => (d.fullName ?? '').trim().toLowerCase() === applicantName
				);
				if (matchesDirector) {
					const existingLinkedIds = (applicant.linkedCompanyIds as string[] | undefined) ?? [];
					const linkedCompanyIds = [...new Set([...existingLinkedIds, companyId])];
					newList[i] = {
						...applicant,
						linkedCompanyId: companyId,
						linkedCompanyIds
					};
					changed = true;
				}
			}
		}
	}

	// Clean up __pendingCompanyLink from the restored entry
	if (newList[restoredIndex].__pendingCompanyLink) {
		newList[restoredIndex] = { ...newList[restoredIndex] };
		delete newList[restoredIndex].__pendingCompanyLink;
		changed = true;
	}

	if (changed) {
		formState.replaceApplicants(newList);
	}
}

/**
 * Cancel a pending restore — revert pre-filled fields, keep entry in recovery bin.
 */
export function cancelApplicantRestore(pending: PendingRestore): void {
	const newList = [...formState.applicants];

	if (pending.previousSlot) {
		// If the previous slot was essentially empty (just skeleton from Add Applicant
		// modal), remove it entirely — user rejected the restore, not just the data
		const prev = pending.previousSlot;
		const hasUserData = prev.fullName || prev.age || prev.education;
		if (hasUserData) {
			newList[pending.currentIndex] = prev;
		} else {
			newList.splice(pending.currentIndex, 1);
		}
	} else {
		// Was a new slot — remove it
		newList.splice(pending.currentIndex, 1);
	}
	formState.replaceApplicants(newList);

	// Revert applicant data store
	if (pending.previousApplicantData && pending.cardId) {
		applicantDataStore.fromJSON({
			...applicantDataStore.toJSON(),
			[pending.cardId]: pending.previousApplicantData as any
		});
	}

	// Pitfall #40: notify subscribers that hold buffer state derived from the
	// restored slot. Business-Loan Sole-Prop's inline Proprietor form keeps a
	// local `formApplicant` copy populated on confirm; without this signal it
	// would keep showing the restored values even though formState was rewound.
	restoreIntentState.markCancelled(pending.currentIndex);
}

/** Undo state for reverting a committed restore */
export interface UndoableRestore {
	displayName: string;
	cardId: string;
	currentIndex: number;
	previousSlot?: Record<string, unknown>;
	previousApplicantData?: Record<string, unknown>;
	/** The recovery entry to put back in bin on undo */
	matchUuid: string;
	recoveryEntrySnapshot: Record<string, unknown>;
	timestamp: number;
}

/**
 * Undo a committed restore — revert applicant slot and put entry back in recovery bin.
 */
export function undoApplicantRestore(undo: UndoableRestore): void {
	const newList = [...formState.applicants];

	if (undo.previousSlot) {
		newList[undo.currentIndex] = undo.previousSlot;
	} else {
		newList.splice(undo.currentIndex, 1);
	}
	formState.replaceApplicants(newList);

	// Revert applicant data store
	if (undo.previousApplicantData && undo.cardId) {
		applicantDataStore.fromJSON({
			...applicantDataStore.toJSON(),
			[undo.cardId]: undo.previousApplicantData as any
		});
	} else if (undo.cardId) {
		applicantDataStore.remove(undo.cardId);
	}

	// Note: recovery bin entry is already removed by commitApplicantRestore.
	// We'd need to re-add it, but the bin uses removeToRecovery() which does
	// complex variant management. For now, the entry is gone — user can re-delete
	// and it will be re-captured. This is acceptable for the undo flow.
}

/**
 * Handle a confirmed applicant restore from the RestoreApplicantModal.
 * This is the LEGACY single-phase restore for backward compatibility.
 * New code should use prefillApplicantRestore() + commitApplicantRestore().
 *
 * @returns The restored applicant's card ID (for scroll-to-row), or null if not handled.
 */
export function handleApplicantRestore(match: RestoreMatchData): string | null {
	const result = prefillApplicantRestore(match);
	if (!result) return null;

	// Immediately commit (legacy single-phase behavior)
	commitApplicantRestore(result.pending);
	return result.cardId;
}
