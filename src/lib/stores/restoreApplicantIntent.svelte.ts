/**
 * Restore Applicant Intent State — Svelte 5 Runes
 * ══════════════════════════════════════════════════════════════════
 * Tracks the state of the restore-deleted-applicant UI flow.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RecoveryScope } from '$lib/state/applicant.svelte';

export type RestoreIntentMatch = {
	uuid: string;
	displayName: string;
	deletedAt: number;
	data: Record<string, unknown>;
	/** 'recovery' = previously deleted, 'live' = already in form. Default: 'recovery' */
	matchSource?: 'recovery' | 'live';
	/** Index in formState.applicants (only for live matches) */
	liveIndex?: number;
	/** True if this is a director-linked auto-added Individual */
	isDirectorLinked?: boolean;
	/** Company name for "Director of X" badge (only for director-linked) */
	linkedCompanyName?: string;
	/** Company entity type (e.g. "Private Limited", "LLP") at save time. Used to
	 *  decide whether ownership % can be restored when target/recovered company
	 *  UUIDs differ but the company is effectively the same by name + entity. */
	linkedCompanyEntityType?: string;
	summary?: {
		incomeSources: Array<{ entityName: string; profileType: string }>;
		obligations: Array<{ bankName: string; loanType: string; emi?: string }>;
		cibilScore?: number;
		totalActiveIncomeSources: number;
		totalObligations: number;
	};
	// Context fields for disambiguation (Phase 1 restore redesign)
	directorRole?: string;
	loanProduct?: string;
	employmentType?: string;
	// Role validation warning (Phase 2 restore redesign)
	roleWarning?: string;
	/** True when this match comes from a different loan scope (cross-loan suggestion) */
	isCrossLoan?: boolean;
};

/** Director restore context — set when restore is triggered from DirectorFormModal.
 *  companyName + companyEntityType allow cross-session ownership restore when the
 *  in-memory company UUID differs from the one captured at save time, but the
 *  company is "effectively the same" by name + entity type (Issue #2 / Option B). */
export type DirectorRestoreContext = {
	companyId: string;
	directorIdx: number;
	companyName?: string;
	companyEntityType?: string;
};

export type RestoreIntent = {
	open: boolean;
	currentIndex?: number;
	matches?: RestoreIntentMatch[];
	detectionKey?: string;
	/** Recovery scope for scoped deny — set by the component opening the modal */
	recoveryScope?: RecoveryScope;
	/** Set when restore is triggered from DirectorFormModal — tells the page-level
	 *  handler to apply restored data to the director form instead of applicants */
	directorRestore?: DirectorRestoreContext;
	/** The applicantType of the SLOT we're filling — even when no existingSlot
	 *  exists (`currentIndex === applicants.length`, i.e. push-new). The Restore
	 *  guard cross-checks this against `match.data.applicantType` to refuse
	 *  cross-type restores (Pitfall #32). Burns: pre-S104 the guard only fired
	 *  when an existing slot's type differed — for a push-new restore the guard
	 *  silently passed because slot.applicantType was undefined, and an
	 *  Individual record got pushed into a Company form session as a ghost. */
	slotApplicantType?: 'Individual' | 'Company';
	/** For Company slots, the companyType the user has already picked
	 *  (Pvt Ltd / OPC / LLP / Partnership / Public Ltd / Section 8). Used by
	 *  the Restore guard to refuse mismatched legal entities — restoring an
	 *  LLP record into an OPC slot makes no DSA-comprehensible sense. */
	slotCompanyType?: string;
};

class RestoreApplicantIntentState {
	open = $state(false);
	currentIndex = $state<number | undefined>(undefined);
	matches = $state<RestoreIntentMatch[] | undefined>(undefined);
	detectionKey = $state<string | undefined>(undefined);
	recoveryScope = $state<RecoveryScope | undefined>(undefined);
	/** Set to true by onConfirm before reset — allows the composable effect to
	 *  distinguish confirm from cancel when the modal closes. */
	wasConfirmed = $state(false);
	/** Preserved across reset() so the composable $effect can read it after modal closes */
	confirmedIndex = $state<number | undefined>(undefined);
	/** Monotonic counter bumped whenever a PendingRestoreBanner Cancel completes
	 *  via cancelApplicantRestore(). Lets components with their own buffer state
	 *  (Business sole-prop's inline Proprietor form) resync from the now-rewound
	 *  formState slot — Pitfall #40. */
	cancelledAt = $state(0);
	/** Slot index whose pending-restore was just cancelled. Read alongside
	 *  cancelledAt so subscribers know which applicant to resync. */
	cancelledIndex = $state<number | undefined>(undefined);
	/** When set, the manager should open this live applicant for editing instead of restoring */
	liveEditIndex = $state<number | undefined>(undefined);
	/** Director restore context — tells page handler to route restore to director form */
	directorRestore = $state<DirectorRestoreContext | undefined>(undefined);
	/** Slot's applicantType the restore is targeting (set by caller — even when
	 *  applicants[currentIndex] doesn't exist yet, i.e. push-new). Pitfall #32. */
	slotApplicantType = $state<'Individual' | 'Company' | undefined>(undefined);
	/** Slot's companyType for Company slots — guards against cross-companyType
	 *  restore (Pvt Ltd record into OPC slot, etc.). Pitfall #32. */
	slotCompanyType = $state<string | undefined>(undefined);

	set(intent: RestoreIntent) {
		this.open = intent.open;
		this.currentIndex = intent.currentIndex;
		this.matches = intent.matches;
		this.detectionKey = intent.detectionKey;
		this.recoveryScope = intent.recoveryScope;
		this.directorRestore = intent.directorRestore;
		this.slotApplicantType = intent.slotApplicantType;
		this.slotCompanyType = intent.slotCompanyType;
		this.wasConfirmed = false;
		this.confirmedIndex = undefined;
		this.liveEditIndex = undefined;
	}

	/** Call this in the onConfirm handler BEFORE calling reset() */
	markConfirmed() {
		this.wasConfirmed = true;
		this.confirmedIndex = this.currentIndex;
	}

	/** Call this for live matches — sets the liveEditIndex for the manager to act on */
	markLiveEdit(liveIndex: number) {
		this.wasConfirmed = true;
		this.liveEditIndex = liveIndex;
	}

	reset() {
		this.open = false;
		this.currentIndex = undefined;
		this.matches = undefined;
		this.detectionKey = undefined;
		this.recoveryScope = undefined;
		this.directorRestore = undefined;
		this.slotApplicantType = undefined;
		this.slotCompanyType = undefined;
		// Note: wasConfirmed and confirmedIndex are intentionally NOT reset here —
		// the effect reads them after open transitions to false
	}

	/** Called after the effect has consumed the wasConfirmed flag */
	clearConfirmed() {
		this.wasConfirmed = false;
		this.confirmedIndex = undefined;
		this.liveEditIndex = undefined;
	}

	/** Call from cancelApplicantRestore() once formState has been rewound. The
	 *  bumped counter wakes any subscribers that hold buffer state derived from
	 *  the restored slot (Business sole-prop's formApplicant) so they can resync. */
	markCancelled(index: number | undefined) {
		this.cancelledIndex = index;
		this.cancelledAt = this.cancelledAt + 1;
	}

	/** Called after the effect has consumed the cancelledAt signal. */
	clearCancelled() {
		this.cancelledIndex = undefined;
	}
}

export const restoreIntentState = new RestoreApplicantIntentState();
