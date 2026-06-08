/**
 * Unified Applicant State Manager
 * ============================================================================
 *
 * Replaces:
 *   - src/lib/stores/applicantDataStore.svelte.ts  (Svelte 5 runes, per-applicant data)
 *   - src/lib/stores/applicantRecovery.ts          (deleted applicant recovery via signature)
 *   - src/lib/stores/incomeProfileStore.ts         (employment-type switching cache)
 *
 * Pattern: Svelte 5 runes class (matches auth.svelte.ts, dialog.svelte.ts, form.svelte.ts)
 *
 * Responsibilities:
 *   - Per-applicant data management (meta, income profiles, income entries,
 *     credit score, obligations)
 *   - Multi-source income entries with soft-delete/restore
 *   - Deleted applicant recovery via signature matching
 *   - Employment type switching (soft-delete/restore replaces old 45-key cache)
 *   - Persistence to sessionStorage (debounced)
 *   - Restore intent tracking (absorbed from restoreApplicantIntent.ts)
 *
 * Legacy bridge:
 *   formState.applicants (from form.svelte.ts) is the single source of truth
 *   for all applicant data. All 65+ consumers read from formState directly.
 *   No auto-sync needed — this state manager handles structured per-applicant
 *   data (income entries, soft-delete, recovery) as a complement to formState.
 * ============================================================================
 */

import { browser } from '$app/environment';
import clientLogger from '$lib/utils/clientLogger';
import type {
	IncomeProfileType,
	IncomeSourceEntry,
	EnhancedLoanEntry
} from '$lib/types/incomeProfile.js';
import type { ApplicantData, ApplicantMeta, CreditScoreData } from '$lib/types/applicantData.js';
import { createEmptyApplicantData } from '$lib/types/applicantData.js';
import {
	filterCrossLoanMatches,
	type CompatibilityResult,
	type LoanCategory
} from '$lib/utils/recoveryCompatibility.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * A deleted applicant stored in the recovery bin.
 * Contains the full snapshot + match signature for later recovery.
 * Ported from applicantRecovery.ts RecoverableApplicant.
 */
/**
 * Recovery scope keys — isolate recovery bins by loan type and entity kind.
 * Format: `{loanCategory}::{entityKind}`
 */
export type RecoveryScope =
	| 'secured::individual'
	| 'secured::company'
	| 'personal::individual'
	| 'business::individual'
	| 'business::director'
	| 'business::company'
	| 'professional::individual'
	| 'professional::partner'
	| 'professional::company';

export interface RecoverableApplicant {
	/** Unique ID for this recovery entry */
	uuid: string;
	/** Applicant type */
	applicantType: 'Individual' | 'Company';
	/** Full applicant snapshot (the ApplicantData at time of deletion) */
	data: Record<string, unknown>;
	/** When the applicant was deleted */
	deletedAt: number;
	/** Display name for UI */
	displayName: string;
	/** Computed hash for signature matching */
	matchSignature: string;
	/** Scope key for isolating recovery bins by loan type + entity kind */
	recoveryScope?: RecoveryScope;

	/** Pre-computed display summary for the restore modal */
	summary?: {
		incomeSources: Array<{ entityName: string; profileType: IncomeProfileType }>;
		obligations: Array<{ bankName: string; loanType: string; emi?: string }>;
		cibilScore?: number;
		totalActiveIncomeSources: number;
		totalObligations: number;
	};

	// Individual fields (for display/debugging)
	fullName?: string;
	gender?: string;
	maritalStatus?: string;
	age?: string;
	employmentType?: string;

	// Company fields (for display/debugging)
	companyName?: string;
	companyType?: string;
	businessType?: string;

	// Context fields (for disambiguation in restore modal)
	/** Company name if this person was a director/partner */
	linkedCompanyName?: string;
	/** Company entity type at save time (e.g. "Private Limited", "LLP").
	 *  Captured so cross-session ownership restore can match company by
	 *  name + entity when UUIDs differ (Issue #2 / Option B). */
	linkedCompanyEntityType?: string;
	/** Role in linked company: director or partner */
	directorRole?: string;
	/** Loan product label derived from recoveryScope */
	loanProduct?: string;
}

/**
 * Restore intent state — drives the restore applicant modal.
 * Absorbed from restoreApplicantIntent.ts.
 */
export interface RestoreIntentState {
	open: boolean;
	currentIndex?: number;
	matches?: RestoreIntentMatch[];
	/** The typed prefix key (e.g., "individual::ram") for deny functionality */
	detectionKey?: string;
}

export interface RestoreIntentMatch {
	uuid: string;
	displayName: string;
	deletedAt: number;
	data: Record<string, unknown>;
}

/**
 * Serializable snapshot of the entire applicant state.
 * Used for sessionStorage persistence.
 */
interface ApplicantStateSnapshot {
	applicants: Record<string, ApplicantData>;
	recoveryBin: RecoverableApplicant[];
	deniedRecoveryPrefixes: string[];
	deniedRecoveryUUIDs?: string[];
	/** Detection keys for which the restore modal has been shown in this session
	 *  but not explicitly accepted/denied. Prevents re-prompt on browser back→next
	 *  or remount. Tab-scoped (sessionStorage). See Pitfall #30. */
	restoreAskedKeys?: string[];
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = 'applicant-state';

/** Recovery entries older than this are pruned on load (90 days). */
const RECOVERY_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Max saved variants per identity group (name+age+gender+maritalStatus).
 * Prevents unbounded growth for very active applicants.
 */
const MAX_VARIANTS_PER_IDENTITY = 10;

// ============================================================================
// SIGNATURE BUILDERS (ported from applicantRecovery.ts)
// ============================================================================

/**
 * Build match signature for an Individual applicant.
 * Requires the basic info page fields: name + gender + maritalStatus + age.
 * employmentType is optional (set on a later page, not the basic info card).
 */
export function buildIndividualSignature(
	name: string | undefined,
	gender: string | undefined,
	maritalStatus: string | undefined,
	age: string | number | undefined,
	employmentType: string | undefined
): string | null {
	const n = (name || '').trim().toLowerCase();
	const g = (gender || '').trim().toLowerCase();
	const m = (maritalStatus || '').trim().toLowerCase();
	const a = age?.toString().trim() || '';
	const e = (employmentType || '').trim().toLowerCase();

	// Core 4 fields (basic info page) are required; employmentType is optional
	if (!n || !g || !m || !a) return null;

	return e ? `individual::${n}::${g}::${m}::${a}::${e}` : `individual::${n}::${g}::${m}::${a}`;
}

/**
 * Build match signature for a Company applicant.
 * Requires the basic info page fields: companyName + companyType + businessType.
 */
export function buildCompanySignature(
	companyName: string | undefined,
	companyType: string | undefined,
	businessType: string | undefined
): string | null {
	const cn = (companyName || '').trim().toLowerCase();
	const ct = (companyType || '').trim().toLowerCase();
	const bt = (businessType || '').trim().toLowerCase();

	if (!cn || !ct || !bt) return null;

	return `company::${cn}::${ct}::${bt}`;
}

/**
 * Build signature from an applicant data record.
 * Accepts the legacy flat object format used by applicantsStore.
 */
export function buildMatchSignature(
	applicant: Record<string, unknown> | null | undefined
): string | null {
	if (!applicant?.applicantType) return null;

	if (applicant.applicantType === 'Individual') {
		return buildIndividualSignature(
			applicant.fullName as string | undefined,
			applicant.gender as string | undefined,
			applicant.maritalStatus as string | undefined,
			applicant.age as string | number | undefined,
			applicant.employmentType as string | undefined
		);
	}

	if (applicant.applicantType === 'Company') {
		return buildCompanySignature(
			applicant.companyName as string | undefined,
			applicant.companyType as string | undefined,
			applicant.businessType as string | undefined
		);
	}

	return null;
}

// ============================================================================
// DETECTION HELPERS (ported from applicantRecovery.ts)
// ============================================================================

/**
 * Build name-only key for detection (triggers modal when name prefix matches).
 */
export function buildDetectionKey(
	applicant: Record<string, unknown> | null | undefined
): string | null {
	if (!applicant?.applicantType) return null;

	if (applicant.applicantType === 'Individual') {
		const name = ((applicant.fullName as string) || '').trim().toLowerCase();
		if (!name) return null;
		return `individual::${name}`;
	}

	if (applicant.applicantType === 'Company') {
		const company = ((applicant.companyName as string) || '').trim().toLowerCase();
		if (!company) return null;
		return `company::${company}`;
	}

	return null;
}

/**
 * Build identity key for grouping same-person variants.
 * Groups by: name + age + gender + maritalStatus (for Individual)
 *         or companyName + companyType (for Company)
 *
 * Variants with the same identity key are shown as slides in the restore modal.
 * Variants with different identity keys are shown as a radio list.
 */
/** Derive a human-readable loan product label from a RecoveryScope. */
export function loanProductFromScope(scope?: RecoveryScope): string | undefined {
	if (!scope) return undefined;
	if (scope.startsWith('secured::')) return 'Secured Loan';
	if (scope.startsWith('business::')) return 'Business Loan';
	if (scope.startsWith('professional::')) return 'Professional Loan';
	if (scope.startsWith('personal::')) return 'Personal Loan';
	return undefined;
}

export function buildIdentityKey(entry: RecoverableApplicant): string {
	if (entry.applicantType === 'Company') {
		const cn = (entry.companyName || '').trim().toLowerCase();
		const ct = (entry.companyType || '').trim().toLowerCase();
		return `company::${cn}::${ct}`;
	}
	const name = (entry.fullName || '').trim().toLowerCase();
	const age = (entry.age || '').toString().trim();
	const g = (entry.gender || '').trim().toLowerCase();
	const ms = (entry.maritalStatus || '').trim().toLowerCase();
	return `individual::${name}::${age}::${g}::${ms}`;
}

/**
 * Check if a recovery entry matches by name/company (strict prefix match).
 * Typing "pra" will match "Pramod", "Pradeep" — NOT unrelated names.
 * Only one-directional: typed text must be a prefix of the stored name.
 */
export function matchesByName(
	entry: RecoverableApplicant,
	currentApplicant: Record<string, unknown> | null | undefined
): boolean {
	if (!entry || !currentApplicant) return false;

	// Type must match
	if (entry.applicantType !== currentApplicant.applicantType) return false;

	if (currentApplicant.applicantType === 'Individual') {
		const entryName = (entry.fullName || '').trim().toLowerCase();
		const currentName = ((currentApplicant.fullName as string) || '').trim().toLowerCase();
		// Strict prefix: typed text must be a prefix of the stored name
		// "pra" matches "pramod", but stored "ra" does NOT match typed "rajesh"
		return currentName.length >= 2 && entryName.startsWith(currentName);
	}

	if (currentApplicant.applicantType === 'Company') {
		const entryCompany = (entry.companyName || '').trim().toLowerCase();
		const currentCompany = ((currentApplicant.companyName as string) || '').trim().toLowerCase();
		// Strict prefix: typed text must be a prefix of stored company name
		return currentCompany.length >= 2 && entryCompany.startsWith(currentCompany);
	}

	return false;
}

// ============================================================================
// APPLICANT STATE MANAGER
// ============================================================================

class ApplicantStateManager {
	// ── Core State ──────────────────────────────────────────────
	/** All applicant data keyed by applicant ID */
	applicants = $state<Record<string, ApplicantData>>({});

	// ── Recovery Bin ────────────────────────────────────────────
	/** Deleted applicants available for recovery */
	recoveryBin = $state<RecoverableApplicant[]>([]);

	/** Detection keys (name prefixes) where user has denied recovery — LEGACY, kept for migration */
	deniedRecoveryPrefixes = $state<Set<string>>(new Set());

	/** UUIDs of recovery bin entries that user has explicitly denied (clicked "Not this person") */
	deniedRecoveryUUIDs = $state<Set<string>>(new Set());

	/** Detection keys for which the restore modal has been shown in THIS browser tab
	 *  session. Suppresses re-prompt when the user navigates back→next or the form
	 *  page remounts (otherwise the same detectionKey would re-fire the modal,
	 *  burned us 2026-05-15 — see CLAUDE.md Pitfall #30). Tab-scoped (sessionStorage,
	 *  not localStorage) — restarting the browser legitimately re-arms detection. */
	restoreAskedKeys = $state<Set<string>>(new Set());

	// ── Restore Intent (absorbed from restoreApplicantIntent.ts) ──
	/** State for the restore applicant modal */
	restoreIntent = $state<RestoreIntentState>({ open: false });

	// ── Debounce ────────────────────────────────────────────────
	private _saveTimer: ReturnType<typeof setTimeout> | null = null;

	// ============================================================================
	// CONSTRUCTOR
	// ============================================================================

	constructor() {
		if (browser) {
			this._restore();
		}
	}

	// ============================================================================
	// GETTERS (Derived State)
	// ============================================================================

	/** Number of active applicants */
	get count(): number {
		return Object.keys(this.applicants).length;
	}

	/** All applicant IDs */
	get allIds(): string[] {
		return Object.keys(this.applicants);
	}

	/** All applicant records as an array */
	get all(): ApplicantData[] {
		return Object.values(this.applicants);
	}

	/** Whether there are multiple applicants */
	get hasMultiple(): boolean {
		return this.count > 1;
	}

	/** Number of items in the recovery bin */
	get recoveryCount(): number {
		return this.recoveryBin.length;
	}

	// ============================================================================
	// APPLICANT CRUD
	// ============================================================================

	/**
	 * Get or create applicant data by ID.
	 * Returns the existing record or creates a new empty one.
	 */
	getOrCreate(applicantId: string): ApplicantData {
		if (!this.applicants[applicantId]) {
			this.applicants[applicantId] = createEmptyApplicantData(applicantId);
			this._persist();
		}
		return this.applicants[applicantId];
	}

	/**
	 * Get applicant data (returns undefined if not found).
	 */
	get(applicantId: string): ApplicantData | undefined {
		return this.applicants[applicantId];
	}

	/**
	 * Remove an applicant entirely (hard delete, no recovery bin).
	 * For recoverable deletion, use removeToRecovery().
	 */
	remove(applicantId: string): void {
		delete this.applicants[applicantId];
		this._persist();
	}

	/**
	 * Remove an applicant and place it in the recovery bin.
	 * The recovery bin allows re-adding the applicant via signature matching.
	 */
	removeToRecovery(
		applicantId: string,
		legacyData: Record<string, unknown>,
		displayName: string,
		matchSignature: string,
		scope?: RecoveryScope,
		externalApplicantData?: Record<string, unknown>,
		/** Extra display context for disambiguation in restore modal */
		displayContext?: {
			linkedCompanyName?: string;
			linkedCompanyEntityType?: string;
			directorRole?: string;
		}
	): void {
		const applicantData = externalApplicantData ?? this.applicants[applicantId];
		const applicantType = (legacyData.applicantType as 'Individual' | 'Company') || 'Individual';

		// Compute summary from active income entries and obligations before deletion
		const summary = this._computeSummary(applicantData as any);

		const recoverable: RecoverableApplicant = {
			uuid: applicantId,
			applicantType,
			data: applicantData
				? {
						...legacyData,
						_structured: $state.snapshot(applicantData) as unknown as Record<string, unknown>
					}
				: legacyData,
			deletedAt: Date.now(),
			displayName,
			matchSignature,
			recoveryScope: scope,
			summary,

			// Individual fields
			fullName: legacyData.fullName as string | undefined,
			gender: legacyData.gender as string | undefined,
			maritalStatus: legacyData.maritalStatus as string | undefined,
			age: legacyData.age as string | undefined,
			employmentType: legacyData.employmentType as string | undefined,

			// Company fields
			companyName: legacyData.companyName as string | undefined,
			companyType: legacyData.companyType as string | undefined,
			businessType: legacyData.businessType as string | undefined,

			// Context fields for disambiguation
			linkedCompanyName:
				displayContext?.linkedCompanyName || (legacyData.linkedCompanyName as string | undefined),
			linkedCompanyEntityType:
				displayContext?.linkedCompanyEntityType ||
				(legacyData.linkedCompanyEntityType as string | undefined),
			directorRole: displayContext?.directorRole || (legacyData.directorRole as string | undefined),
			loanProduct: loanProductFromScope(scope)
		};

		// Accumulate income profile variants — same signature = same exact profile, overwrite.
		// Different signature but same identity = different income profile, keep both.
		// This allows the same person to have multiple saved income variants (slides in restore modal).
		const exactIdx = this.recoveryBin.findIndex((r) => r.matchSignature === matchSignature);
		if (exactIdx !== -1) {
			// Exact same profile (name+gender+maritalStatus+age+employmentType all match) — overwrite
			this.recoveryBin[exactIdx] = recoverable;
		} else {
			// New variant — append, but cap per identity group to prevent unbounded growth
			const identityKey = buildIdentityKey(recoverable);
			const sameIdentityCount = this.recoveryBin.filter(
				(r) => buildIdentityKey(r) === identityKey
			).length;

			if (sameIdentityCount >= MAX_VARIANTS_PER_IDENTITY) {
				// Drop the oldest variant for this identity to stay within cap
				let oldestIdx = -1;
				let oldestTime = Infinity;
				this.recoveryBin.forEach((r, i) => {
					if (buildIdentityKey(r) === identityKey && r.deletedAt < oldestTime) {
						oldestTime = r.deletedAt;
						oldestIdx = i;
					}
				});
				if (oldestIdx !== -1) {
					this.recoveryBin.splice(oldestIdx, 1);
				}
			}

			this.recoveryBin = [...this.recoveryBin, recoverable];
		}

		// Remove from active applicants
		delete this.applicants[applicantId];
		this._persist();
	}

	/**
	 * Compute a display summary from applicant data for the restore modal.
	 */
	private _computeSummary(data: ApplicantData | undefined): RecoverableApplicant['summary'] {
		if (!data) {
			return {
				incomeSources: [],
				obligations: [],
				cibilScore: undefined,
				totalActiveIncomeSources: 0,
				totalObligations: 0
			};
		}

		// Flatten active income entries
		const incomeSources: Array<{ entityName: string; profileType: IncomeProfileType }> = [];
		let totalActiveIncomeSources = 0;
		for (const [profileType, entries] of Object.entries(data.incomeEntries.active)) {
			if (entries) {
				for (const entry of entries) {
					incomeSources.push({
						entityName: entry.entityName || '',
						profileType: profileType as IncomeProfileType
					});
				}
				totalActiveIncomeSources += entries.length;
			}
		}

		// Map obligations
		const obligations = data.obligations.active.map((entry) => ({
			bankName: entry.bankName || '',
			loanType: entry.loanType || '',
			emi: entry.emi
		}));

		return {
			incomeSources,
			obligations,
			cibilScore: data.creditScore.cibilScore,
			totalActiveIncomeSources,
			totalObligations: data.obligations.active.length
		};
	}

	// ── Meta (Page 1: Basic Details) ────────────────────────────

	/**
	 * Update basic applicant details.
	 */
	updateMeta(applicantId: string, meta: Partial<ApplicantMeta>): void {
		const data = this.getOrCreate(applicantId);
		data.meta = { ...data.meta, ...meta };
		data.updatedAt = new Date().toISOString();
		this._persist();
	}

	// ============================================================================
	// INCOME PROFILE SELECTION (Page 2 Tab 1)
	// ============================================================================

	/**
	 * Update selected income profiles. Handles soft-delete/restore triggers.
	 * When a profile is deselected, its entries move to deleted.
	 * When a profile is re-selected, restoreDenied is cleared for fresh prompt.
	 */
	updateSelectedProfiles(applicantId: string, newProfiles: IncomeProfileType[]): void {
		const data = this.getOrCreate(applicantId);
		const oldProfiles = data.incomeProfiles.selectedProfiles;

		// Find deselected profiles -- move their entries to deleted
		const deselected = oldProfiles.filter((p) => !newProfiles.includes(p));
		for (const profileType of deselected) {
			this._softDeleteProfileEntries(applicantId, profileType);
		}

		// Find newly re-selected profiles -- clear restoreDenied
		const reselected = newProfiles.filter((p) => !oldProfiles.includes(p));
		for (const profileType of reselected) {
			const idx = data.incomeEntries.restoreDenied.indexOf(profileType);
			if (idx !== -1) {
				data.incomeEntries.restoreDenied.splice(idx, 1);
			}
		}

		data.incomeProfiles.selectedProfiles = [...newProfiles];
		data.updatedAt = new Date().toISOString();
		this._persist();
	}

	// ============================================================================
	// INCOME ENTRIES (Page 2 Tab 2)
	// ============================================================================

	/**
	 * Add a new income entry for an applicant.
	 */
	addIncomeEntry(applicantId: string, entry: IncomeSourceEntry): void {
		const data = this.getOrCreate(applicantId);
		if (!data.incomeEntries.active[entry.profileType]) {
			data.incomeEntries.active[entry.profileType] = [];
		}
		data.incomeEntries.active[entry.profileType]!.push(entry);
		data.updatedAt = new Date().toISOString();
		this._persist();
	}

	/**
	 * Update an existing income entry by ID.
	 */
	updateIncomeEntry(applicantId: string, entry: IncomeSourceEntry): void {
		const data = this.getOrCreate(applicantId);
		const entries = data.incomeEntries.active[entry.profileType];
		if (entries) {
			const idx = entries.findIndex((e) => e.id === entry.id);
			if (idx !== -1) {
				entries[idx] = entry;
				data.updatedAt = new Date().toISOString();
				this._persist();
			}
		}
	}

	/**
	 * Delete a single income entry (hard delete from active).
	 */
	deleteIncomeEntry(applicantId: string, profileType: IncomeProfileType, entryId: string): void {
		const data = this.getOrCreate(applicantId);
		const entries = data.incomeEntries.active[profileType];
		if (entries) {
			const idx = entries.findIndex((e) => e.id === entryId);
			if (idx !== -1) {
				entries.splice(idx, 1);
				if (entries.length === 0) {
					delete data.incomeEntries.active[profileType];
				}
				data.updatedAt = new Date().toISOString();
				this._persist();
			}
		}
	}

	/**
	 * Soft-delete all entries for a profile type (moves active -> deleted).
	 * Called internally when a profile is deselected.
	 */
	private _softDeleteProfileEntries(applicantId: string, profileType: IncomeProfileType): void {
		const data = this.getOrCreate(applicantId);
		const activeEntries = data.incomeEntries.active[profileType];
		if (activeEntries && activeEntries.length > 0) {
			if (!data.incomeEntries.deleted[profileType]) {
				data.incomeEntries.deleted[profileType] = [];
			}
			data.incomeEntries.deleted[profileType]!.push(...activeEntries);
			delete data.incomeEntries.active[profileType];
		}
	}

	/**
	 * Check if a profile type has restorable (soft-deleted) entries.
	 */
	hasRestorableEntries(applicantId: string, profileType: IncomeProfileType): boolean {
		const data = this.get(applicantId);
		if (!data) return false;
		const deleted = data.incomeEntries.deleted[profileType];
		return !!deleted && deleted.length > 0;
	}

	/**
	 * Check if restore was already denied for this profile in current session.
	 */
	isRestoreDenied(applicantId: string, profileType: IncomeProfileType): boolean {
		const data = this.get(applicantId);
		if (!data) return false;
		return data.incomeEntries.restoreDenied.includes(profileType);
	}

	/**
	 * Should we show the restore prompt for this profile?
	 * True if there are restorable entries AND user hasn't denied.
	 */
	shouldPromptRestore(applicantId: string, profileType: IncomeProfileType): boolean {
		return (
			this.hasRestorableEntries(applicantId, profileType) &&
			!this.isRestoreDenied(applicantId, profileType)
		);
	}

	/**
	 * Restore deleted entries for a profile type (moves deleted -> active).
	 */
	restoreProfileEntries(applicantId: string, profileType: IncomeProfileType): void {
		const data = this.getOrCreate(applicantId);
		const deletedEntries = data.incomeEntries.deleted[profileType];
		if (deletedEntries && deletedEntries.length > 0) {
			if (!data.incomeEntries.active[profileType]) {
				data.incomeEntries.active[profileType] = [];
			}
			data.incomeEntries.active[profileType]!.push(...deletedEntries);
			delete data.incomeEntries.deleted[profileType];
			// Remove from restoreDenied if present
			const idx = data.incomeEntries.restoreDenied.indexOf(profileType);
			if (idx !== -1) {
				data.incomeEntries.restoreDenied.splice(idx, 1);
			}
			data.updatedAt = new Date().toISOString();
			this._persist();
		}
	}

	/**
	 * Deny restore for a profile type (user said "No thanks").
	 */
	denyRestore(applicantId: string, profileType: IncomeProfileType): void {
		const data = this.getOrCreate(applicantId);
		if (!data.incomeEntries.restoreDenied.includes(profileType)) {
			data.incomeEntries.restoreDenied.push(profileType);
			this._persist();
		}
	}

	/**
	 * Get all active entries for an applicant (flat array).
	 */
	getAllActiveEntries(applicantId: string): IncomeSourceEntry[] {
		const data = this.get(applicantId);
		if (!data) return [];
		return Object.values(data.incomeEntries.active).flat();
	}

	/**
	 * Get active entries for a specific profile type.
	 */
	getActiveEntriesForProfile(
		applicantId: string,
		profileType: IncomeProfileType
	): IncomeSourceEntry[] {
		const data = this.get(applicantId);
		if (!data) return [];
		return data.incomeEntries.active[profileType] || [];
	}

	// ============================================================================
	// CREDIT SCORE (Page 2 Tab 3)
	// ============================================================================

	/**
	 * Update credit score data.
	 */
	updateCreditScore(applicantId: string, creditData: Partial<CreditScoreData>): void {
		const data = this.getOrCreate(applicantId);
		data.creditScore = { ...data.creditScore, ...creditData };
		data.updatedAt = new Date().toISOString();
		this._persist();
	}

	// ============================================================================
	// OBLIGATIONS (Page 2 Tab 4)
	// ============================================================================

	/**
	 * Add a loan obligation entry.
	 */
	addObligation(applicantId: string, entry: EnhancedLoanEntry): void {
		const data = this.getOrCreate(applicantId);
		data.obligations.active.push(entry);
		data.updatedAt = new Date().toISOString();
		this._persist();
	}

	/**
	 * Update a loan obligation entry by index.
	 */
	updateObligation(applicantId: string, index: number, entry: EnhancedLoanEntry): void {
		const data = this.getOrCreate(applicantId);
		if (index >= 0 && index < data.obligations.active.length) {
			data.obligations.active[index] = entry;
			data.updatedAt = new Date().toISOString();
			this._persist();
		}
	}

	/**
	 * Delete a loan obligation entry by index.
	 */
	deleteObligation(applicantId: string, index: number): void {
		const data = this.getOrCreate(applicantId);
		if (index >= 0 && index < data.obligations.active.length) {
			data.obligations.active.splice(index, 1);
			data.updatedAt = new Date().toISOString();
			this._persist();
		}
	}

	/**
	 * Soft-delete all obligations (when obligationsRunning changes to No).
	 */
	softDeleteAllObligations(applicantId: string): void {
		const data = this.getOrCreate(applicantId);
		if (data.obligations.active.length > 0) {
			data.obligations.deleted.push(...data.obligations.active);
			data.obligations.active = [];
			data.updatedAt = new Date().toISOString();
			this._persist();
		}
	}

	/**
	 * Restore all soft-deleted obligations (when obligationsRunning toggles back to Yes).
	 */
	restoreAllObligations(applicantId: string): void {
		const data = this.getOrCreate(applicantId);
		if (data.obligations.deleted.length > 0) {
			data.obligations.active.push(...data.obligations.deleted);
			data.obligations.deleted = [];
			data.updatedAt = new Date().toISOString();
			this._persist();
		}
	}

	/**
	 * Get all active obligations for an applicant.
	 */
	getActiveObligations(applicantId: string): EnhancedLoanEntry[] {
		const data = this.get(applicantId);
		if (!data) return [];
		return data.obligations.active;
	}

	// ============================================================================
	// APPLICANT RECOVERY (ported from applicantRecovery.ts)
	// ============================================================================

	/**
	 * Find recoverable applicants matching a detection key (name prefix match).
	 * When scope is provided, only entries with that exact scope are returned.
	 * Entries without a scope (legacy) are only returned when no scope is requested.
	 */
	findRecoverableByName(
		currentApplicant: Record<string, unknown> | null | undefined,
		scope?: RecoveryScope
	): RecoverableApplicant[] {
		if (!currentApplicant) return [];
		return this.recoveryBin.filter((entry) => {
			// Scope filter: match exact scope, or both undefined (legacy)
			if (scope) {
				if (entry.recoveryScope !== scope) return false;
			} else {
				if (entry.recoveryScope) return false; // scoped entry won't show in unscoped context
			}
			return matchesByName(entry, currentApplicant);
		});
	}

	/**
	 * Cross-loan suggestions: find recovery bin entries from OTHER loan scopes
	 * whose income profiles are compatible with the target loan category.
	 * Only 'strong' and 'compatible' entries are returned, sorted strong-first.
	 * warn/incompatible entries are excluded — the signal is reliable enough
	 * that a warn means wrong fit, not just a mismatch worth noting.
	 */
	findCrossLoanSuggestions(
		namePrefix: string,
		currentScope: RecoveryScope | undefined,
		targetLoanCategory: LoanCategory,
		currentApplicantType?: 'Individual' | 'Company',
		currentCompanyType?: string
	): Array<RecoverableApplicant & { compatibility: CompatibilityResult }> {
		return filterCrossLoanMatches(
			this.recoveryBin,
			currentScope,
			targetLoanCategory,
			namePrefix,
			currentApplicantType,
			currentCompanyType
		);
	}

	/**
	 * Find a single recoverable applicant by exact match signature.
	 */
	findRecoverableBySignature(signature: string): RecoverableApplicant | null {
		return this.recoveryBin.find((r) => r.matchSignature === signature) ?? null;
	}

	/**
	 * Restore an applicant from the recovery bin by UUID.
	 * Removes it from the recovery bin and returns the data.
	 */
	restoreFromRecoveryBin(uuid: string): RecoverableApplicant | null {
		const idx = this.recoveryBin.findIndex((r) => r.uuid === uuid);
		if (idx === -1) return null;

		const [recovered] = this.recoveryBin.splice(idx, 1);
		this.recoveryBin = [...this.recoveryBin]; // trigger reactivity
		this._persist();
		return recovered;
	}

	/**
	 * Deny recovery for a detection key (name prefix).
	 * @deprecated Use denyRecoveryUUIDs() instead — prefix-based denial is too broad.
	 * Kept for backward compatibility with existing page handlers during migration.
	 */
	denyRecoveryPrefix(detectionKey: string, scope?: RecoveryScope): void {
		const scopedKey = scope ? `${scope}@@${detectionKey}` : detectionKey;
		this.deniedRecoveryPrefixes = new Set([...this.deniedRecoveryPrefixes, scopedKey]);
		this._persist();
	}

	/**
	 * @deprecated Use areAllMatchesDenied() instead.
	 */
	isPrefixDenied(_detectionKey: string, _scope?: RecoveryScope): boolean {
		// Prefix-based denial disabled — UUID-based denial is now used.
		// Detection logic filters denied UUIDs directly from match results.
		return false;
	}

	/**
	 * @deprecated Use clearDeniedUUIDs() instead.
	 */
	clearDeniedPrefix(_detectionKey: string, _scope?: RecoveryScope): void {
		// No-op: UUID-based denial is now used
	}

	// ── UUID-based recovery denial ──────────────────────────────

	/**
	 * Deny recovery for specific matched applicant UUIDs.
	 * Called when user clicks "Not this person" — stores the UUIDs of ALL
	 * matches that were shown in the modal so they won't re-trigger.
	 */
	denyRecoveryByUUIDs(uuids: string[]): void {
		if (uuids.length === 0) return;
		this.deniedRecoveryUUIDs = new Set([...this.deniedRecoveryUUIDs, ...uuids]);
		this._persist();
	}

	/**
	 * Check if a specific recovery UUID has been denied.
	 */
	isUUIDDenied(uuid: string): boolean {
		return this.deniedRecoveryUUIDs.has(uuid);
	}

	/**
	 * Filter out denied UUIDs from a match list.
	 * Returns only matches that haven't been denied.
	 */
	filterDeniedMatches<T extends { uuid: string }>(matches: T[]): T[] {
		return matches.filter((m) => !this.deniedRecoveryUUIDs.has(m.uuid));
	}

	// ── Restore-already-asked tracking (suppress re-prompt on remount) ──
	//
	// Pre-S104 every form component held a local `let restoreAskedForKey = $state(null)`
	// to suppress re-opening the restore modal for the same detectionKey. That local
	// state was lost on remount — browser back→next or hard refresh re-fired the
	// modal even though the user had just dismissed it. Promoting to the store +
	// sessionStorage fixes the remount case while still resetting on tab close.
	// See CLAUDE.md Pitfall #30.

	/** Mark a detection key as "already prompted" so subsequent detection skips it. */
	markRestoreAsked(detectionKey: string): void {
		if (!detectionKey) return;
		if (this.restoreAskedKeys.has(detectionKey)) return;
		this.restoreAskedKeys = new Set([...this.restoreAskedKeys, detectionKey]);
		this._persist();
	}

	/** Check if a detection key has already been prompted in this session. */
	hasRestoreAsked(detectionKey: string): boolean {
		return !!detectionKey && this.restoreAskedKeys.has(detectionKey);
	}

	/** Clear a specific detection key (e.g., user deleted that applicant — re-arm
	 *  detection so re-adding triggers a fresh prompt). */
	clearRestoreAsked(detectionKey: string): void {
		if (!detectionKey || !this.restoreAskedKeys.has(detectionKey)) return;
		const next = new Set(this.restoreAskedKeys);
		next.delete(detectionKey);
		this.restoreAskedKeys = next;
		this._persist();
	}

	/** Clear ALL asked-keys (e.g., on case reset / loan-type change). */
	clearAllRestoreAsked(): void {
		if (this.restoreAskedKeys.size === 0) return;
		this.restoreAskedKeys = new Set();
		this._persist();
	}

	/**
	 * Check if there are any denied UUIDs that could match the current name.
	 * Used to show "Check for previous records" link.
	 */
	hasDeniedUUIDs(): boolean {
		return this.deniedRecoveryUUIDs.size > 0;
	}

	/**
	 * Clear all denied UUIDs — used when user clicks "Check for previous records"
	 * to re-trigger detection after accidental dismissal.
	 */
	clearAllDeniedUUIDs(): void {
		if (this.deniedRecoveryUUIDs.size > 0) {
			this.deniedRecoveryUUIDs = new Set();
			this._persist();
		}
	}

	/**
	 * Clear denied UUIDs for specific entries — called when an applicant
	 * is deleted so their recovery modal can fire again.
	 */
	clearDeniedUUIDs(uuids: string[]): void {
		if (uuids.length === 0) return;
		const toRemove = new Set(uuids);
		const updated = new Set([...this.deniedRecoveryUUIDs].filter((u) => !toRemove.has(u)));
		if (updated.size !== this.deniedRecoveryUUIDs.size) {
			this.deniedRecoveryUUIDs = updated;
			this._persist();
		}
	}

	// ============================================================================
	// RESTORE INTENT (absorbed from restoreApplicantIntent.ts)
	// ============================================================================

	/**
	 * Open the restore applicant modal with matches.
	 */
	openRestoreIntent(
		currentIndex: number,
		matches: RestoreIntentMatch[],
		detectionKey?: string
	): void {
		this.restoreIntent = {
			open: true,
			currentIndex,
			matches,
			detectionKey
		};
	}

	/**
	 * Close the restore applicant modal.
	 */
	closeRestoreIntent(): void {
		this.restoreIntent = { open: false };
	}

	// ============================================================================
	// BULK OPERATIONS
	// ============================================================================

	/**
	 * Clear all data for all applicants (including recovery bin).
	 */
	clearAll(): void {
		this.applicants = {};
		this.recoveryBin = [];
		this.deniedRecoveryPrefixes = new Set();
		this.deniedRecoveryUUIDs = new Set();
		this.restoreIntent = { open: false };
		if (browser) {
			sessionStorage.removeItem(STORAGE_KEY);
		}
	}

	/**
	 * Export full state (for debugging / payload inspection).
	 */
	toJSON(): Record<string, ApplicantData> {
		return $state.snapshot(this.applicants);
	}

	/**
	 * Import applicant data (for loading from server / snapshot).
	 */
	fromJSON(data: Record<string, ApplicantData>): void {
		this.applicants = data;
		this._persist();
	}

	/**
	 * Reset to initial state.
	 */
	reset(): void {
		this.applicants = {};
		this.recoveryBin = [];
		this.deniedRecoveryPrefixes = new Set();
		this.deniedRecoveryUUIDs = new Set();
		this.restoreIntent = { open: false };
		if (browser) {
			sessionStorage.removeItem(STORAGE_KEY);
		}
	}

	// ============================================================================
	// PERSISTENCE (PRIVATE)
	// ============================================================================

	/**
	 * Persist state to localStorage (debounced 300ms).
	 * Uses localStorage (not sessionStorage) so recovery bin survives tab/browser close
	 * and entries remain available for up to 90 days across sessions.
	 * Active applicant data (in-progress form) uses sessionStorage separately.
	 */
	private _persist(): void {
		if (!browser) return;

		if (this._saveTimer) clearTimeout(this._saveTimer);
		this._saveTimer = setTimeout(() => {
			try {
				const snapshot: ApplicantStateSnapshot = {
					applicants: $state.snapshot(this.applicants),
					recoveryBin: $state.snapshot(this.recoveryBin) as RecoverableApplicant[],
					deniedRecoveryPrefixes: [...this.deniedRecoveryPrefixes],
					deniedRecoveryUUIDs: [...this.deniedRecoveryUUIDs],
					restoreAskedKeys: [...this.restoreAskedKeys]
				};
				// Active applicant data (in-progress form) → sessionStorage (cleared on tab close)
				const {
					recoveryBin: _rb,
					deniedRecoveryPrefixes: _dp,
					deniedRecoveryUUIDs: _du,
					...activeOnly
				} = snapshot;
				sessionStorage.setItem(STORAGE_KEY, JSON.stringify(activeOnly));

				// Recovery bin → localStorage (persists for 90 days across sessions)
				localStorage.setItem(
					`${STORAGE_KEY}:recovery`,
					JSON.stringify({
						recoveryBin: snapshot.recoveryBin,
						deniedRecoveryPrefixes: snapshot.deniedRecoveryPrefixes,
						deniedRecoveryUUIDs: snapshot.deniedRecoveryUUIDs
					})
				);
			} catch {
				clientLogger.warn('[ApplicantStateManager] Failed to persist state');
			}
		}, 300);
	}

	/**
	 * Restore state from storage.
	 * - Active applicants: sessionStorage (tab-scoped)
	 * - Recovery bin: localStorage (90-day TTL, cross-session)
	 */
	private _restore(): void {
		try {
			// ── Active applicants (sessionStorage) ──
			const raw = sessionStorage.getItem(STORAGE_KEY);
			if (!raw) {
				this._migrateFromLegacy();
			} else {
				const parsed = JSON.parse(raw) as Partial<ApplicantStateSnapshot>;
				if (parsed.applicants && typeof parsed.applicants === 'object') {
					this.applicants = parsed.applicants;
				}
				if (Array.isArray(parsed.restoreAskedKeys)) {
					this.restoreAskedKeys = new Set(parsed.restoreAskedKeys);
				}
			}

			// ── Recovery bin (localStorage, 90-day TTL) ──
			const recoveryRaw = localStorage.getItem(`${STORAGE_KEY}:recovery`);
			if (recoveryRaw) {
				const parsedRecovery = JSON.parse(recoveryRaw) as {
					recoveryBin: RecoverableApplicant[];
					deniedRecoveryPrefixes: string[];
					deniedRecoveryUUIDs?: string[];
				};

				const cutoff = Date.now() - RECOVERY_TTL_MS;

				if (Array.isArray(parsedRecovery.recoveryBin)) {
					// Prune entries older than 90 days
					this.recoveryBin = parsedRecovery.recoveryBin.filter((r) => r.deletedAt > cutoff);
				}
				if (Array.isArray(parsedRecovery.deniedRecoveryPrefixes)) {
					this.deniedRecoveryPrefixes = new Set(parsedRecovery.deniedRecoveryPrefixes);
				}
				if (Array.isArray(parsedRecovery.deniedRecoveryUUIDs)) {
					this.deniedRecoveryUUIDs = new Set(parsedRecovery.deniedRecoveryUUIDs);
				}
			}
		} catch {
			// Corrupted data — start fresh
			this.applicants = {};
			this.recoveryBin = [];
			this.deniedRecoveryPrefixes = new Set();
			this.deniedRecoveryUUIDs = new Set();
			this.restoreAskedKeys = new Set();
		}
	}

	/**
	 * Migrate data from the old applicant-data-store key.
	 * This handles the case where the user had data in the old format.
	 */
	private _migrateFromLegacy(): void {
		try {
			// Migrate from applicant-data-store (the old ApplicantDataStore)
			const oldRaw = sessionStorage.getItem('applicant-data-store');
			if (oldRaw) {
				const oldData = JSON.parse(oldRaw) as Record<string, ApplicantData>;
				if (oldData && typeof oldData === 'object') {
					this.applicants = oldData;
				}
			}

			// Migrate from applicant-recovery (the old persisted store)
			const oldRecoveryRaw = sessionStorage.getItem('applicant-recovery');
			if (oldRecoveryRaw) {
				const oldRecovery = JSON.parse(oldRecoveryRaw) as RecoverableApplicant[];
				if (Array.isArray(oldRecovery)) {
					this.recoveryBin = oldRecovery;
				}
			}

			// Migrate from denied-applicant-recovery-prefixes
			const oldDeniedRaw = sessionStorage.getItem('denied-applicant-recovery-prefixes');
			if (oldDeniedRaw) {
				const oldDenied = JSON.parse(oldDeniedRaw) as string[];
				if (Array.isArray(oldDenied)) {
					this.deniedRecoveryPrefixes = new Set(oldDenied);
				}
			}

			// Persist the migrated data in the new format
			if (
				Object.keys(this.applicants).length > 0 ||
				this.recoveryBin.length > 0 ||
				this.deniedRecoveryPrefixes.size > 0
			) {
				this._persist();
			}
		} catch {
			// Migration failed -- start fresh
		}
	}
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Global applicant state instance.
 * Import this in components to access applicant state.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { applicantState } from '$lib/state/applicant.svelte';
 *
 *   // Get or create applicant data
 *   const data = applicantState.getOrCreate('applicant-1');
 *
 *   // Add income entry
 *   applicantState.addIncomeEntry('applicant-1', entry);
 *
 *   // Check for restorable entries
 *   const showRestore = $derived(
 *     applicantState.shouldPromptRestore('applicant-1', 'salaried_regular')
 *   );
 * </script>
 * ```
 */
export const applicantState = new ApplicantStateManager();

// Export type for external use
export type { ApplicantStateManager };
