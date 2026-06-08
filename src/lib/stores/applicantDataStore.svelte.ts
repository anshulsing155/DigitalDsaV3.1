/**
 * Applicant Data Store
 * ═══════════════════════════════════════════════════════════════════
 * Svelte 5 runes-based store managing structured applicant data.
 *
 * Key features:
 *   - Per-applicant data keyed by ID
 *   - Income entries organized by profile type (active/deleted)
 *   - Soft-delete on profile deselection with restore prompt logic
 *   - Obligation entries with full form data
 *   - Persistent to localStorage with debounced saves
 * ═══════════════════════════════════════════════════════════════════
 */

import type {
	IncomeProfileType,
	IncomeSourceEntry,
	EnhancedLoanEntry
} from '$lib/types/incomeProfile.js';
import type {
	ApplicantData,
	ApplicantMeta,
	CreditScoreData
} from '$lib/types/applicantData.js';
import { createEmptyApplicantData } from '$lib/types/applicantData.js';

// ============================================================================
// STORAGE KEY
// ============================================================================

const STORAGE_KEY = 'applicant-data-store';

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

class ApplicantDataStore {
	/** All applicant data keyed by applicant ID */
	applicants = $state<Record<string, ApplicantData>>({});

	/** Debounce timer for persistence */
	private saveTimer: ReturnType<typeof setTimeout> | null = null;

	constructor() {
		this.load();
	}

	// ── Persistence ─────────────────────────────────────────────

	private load() {
		try {
			const raw = sessionStorage.getItem(STORAGE_KEY);
			if (raw) {
				this.applicants = JSON.parse(raw);
			}
		} catch {
			// Corrupted data — start fresh
			this.applicants = {};
		}
	}

	private persist() {
		if (this.saveTimer) clearTimeout(this.saveTimer);
		this.saveTimer = setTimeout(() => {
			this.saveTimer = null;
			try {
				sessionStorage.setItem(STORAGE_KEY, JSON.stringify($state.snapshot(this.applicants)));
			} catch {
				// sessionStorage write failed — non-critical, app works without persistence
			}
		}, 300);
	}

	/**
	 * Immediately flush any pending debounced persist to sessionStorage.
	 * Call before navigation to ensure in-memory state is persisted.
	 */
	flushPersist() {
		if (this.saveTimer) {
			clearTimeout(this.saveTimer);
			this.saveTimer = null;
		}
		try {
			sessionStorage.setItem(STORAGE_KEY, JSON.stringify($state.snapshot(this.applicants)));
		} catch {
			// sessionStorage flush failed — non-critical, app works without persistence
		}
	}

	// ── Applicant CRUD ──────────────────────────────────────────

	/** Get or create applicant data by ID */
	getOrCreate(applicantId: string): ApplicantData {
		if (!this.applicants[applicantId]) {
			this.applicants[applicantId] = createEmptyApplicantData(applicantId);
			this.persist();
		}
		return this.applicants[applicantId];
	}

	/** Get applicant data (returns undefined if not found) */
	get(applicantId: string): ApplicantData | undefined {
		return this.applicants[applicantId];
	}

	/** Remove an applicant entirely */
	remove(applicantId: string) {
		delete this.applicants[applicantId];
		this.persist();
	}

	/** Get all applicant IDs */
	getAllIds(): string[] {
		return Object.keys(this.applicants);
	}

	// ── Meta (Page 1: Basic Details) ────────────────────────────

	/** Update basic applicant details */
	updateMeta(applicantId: string, meta: Partial<ApplicantMeta>) {
		const data = this.getOrCreate(applicantId);
		data.meta = { ...data.meta, ...meta };
		data.updatedAt = new Date().toISOString();
		this.persist();
	}

	// ── Income Profiles (Page 2 Tab 1: Selection) ───────────────

	/** Update selected income profiles. Handles soft-delete/restore triggers. */
	updateSelectedProfiles(applicantId: string, newProfiles: IncomeProfileType[]) {
		const data = this.getOrCreate(applicantId);
		const oldProfiles = data.incomeProfiles.selectedProfiles;

		// Find deselected profiles — move their entries to deleted
		const deselected = oldProfiles.filter((p) => !newProfiles.includes(p));
		for (const profileType of deselected) {
			this.softDeleteProfileEntries(applicantId, profileType);
		}

		// Find newly re-selected profiles — check for restore candidates
		const reselected = newProfiles.filter((p) => !oldProfiles.includes(p));
		for (const profileType of reselected) {
			// Clear restoreDenied for this profile (fresh selection cycle)
			const idx = data.incomeEntries.restoreDenied.indexOf(profileType);
			if (idx !== -1) {
				data.incomeEntries.restoreDenied.splice(idx, 1);
			}
		}

		data.incomeProfiles.selectedProfiles = [...newProfiles];
		data.updatedAt = new Date().toISOString();
		this.persist();
	}

	// ── Income Entries (Page 2 Tab 2) ───────────────────────────

	/** Add a new income entry */
	addIncomeEntry(applicantId: string, entry: IncomeSourceEntry) {
		const data = this.getOrCreate(applicantId);
		if (!data.incomeEntries.active[entry.profileType]) {
			data.incomeEntries.active[entry.profileType] = [];
		}
		data.incomeEntries.active[entry.profileType]!.push(entry);
		data.updatedAt = new Date().toISOString();
		this.persist();
	}

	/** Update an existing income entry by ID */
	updateIncomeEntry(applicantId: string, entry: IncomeSourceEntry) {
		const data = this.getOrCreate(applicantId);
		const entries = data.incomeEntries.active[entry.profileType];
		if (entries) {
			const idx = entries.findIndex((e) => e.id === entry.id);
			if (idx !== -1) {
				entries[idx] = entry;
				data.updatedAt = new Date().toISOString();
				this.persist();
			}
		}
	}

	/** Delete a single income entry (hard delete from active) */
	deleteIncomeEntry(applicantId: string, profileType: IncomeProfileType, entryId: string) {
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
				this.persist();
			}
		}
	}

	/** Soft-delete all entries for a profile type (moves to deleted) */
	private softDeleteProfileEntries(applicantId: string, profileType: IncomeProfileType) {
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

	/** Check if a profile type has restorable (deleted) entries */
	hasRestorableEntries(applicantId: string, profileType: IncomeProfileType): boolean {
		const data = this.get(applicantId);
		if (!data) return false;
		const deleted = data.incomeEntries.deleted[profileType];
		return !!deleted && deleted.length > 0;
	}

	/** Check if restore was already denied for this profile in current session */
	isRestoreDenied(applicantId: string, profileType: IncomeProfileType): boolean {
		const data = this.get(applicantId);
		if (!data) return false;
		return data.incomeEntries.restoreDenied.includes(profileType);
	}

	/** Should we show the restore prompt for this profile? */
	shouldPromptRestore(applicantId: string, profileType: IncomeProfileType): boolean {
		return (
			this.hasRestorableEntries(applicantId, profileType) &&
			!this.isRestoreDenied(applicantId, profileType)
		);
	}

	/** Restore deleted entries for a profile type (moves back to active) */
	restoreProfileEntries(applicantId: string, profileType: IncomeProfileType) {
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
			this.persist();
		}
	}

	/** Deny restore for a profile type (user said "No thanks") */
	denyRestore(applicantId: string, profileType: IncomeProfileType) {
		const data = this.getOrCreate(applicantId);
		if (!data.incomeEntries.restoreDenied.includes(profileType)) {
			data.incomeEntries.restoreDenied.push(profileType);
			this.persist();
		}
	}

	/** Get all active entries for an applicant (flat array) */
	getAllActiveEntries(applicantId: string): IncomeSourceEntry[] {
		const data = this.get(applicantId);
		if (!data) return [];
		return Object.values(data.incomeEntries.active).flat();
	}

	/** Get active entries for a specific profile type */
	getActiveEntriesForProfile(
		applicantId: string,
		profileType: IncomeProfileType
	): IncomeSourceEntry[] {
		const data = this.get(applicantId);
		if (!data) return [];
		return data.incomeEntries.active[profileType] || [];
	}

	// ── Credit Score (Page 2 Tab 3) ─────────────────────────────

	/** Update credit score data */
	updateCreditScore(applicantId: string, creditData: Partial<CreditScoreData>) {
		const data = this.getOrCreate(applicantId);
		data.creditScore = { ...data.creditScore, ...creditData };
		data.updatedAt = new Date().toISOString();
		this.persist();
	}

	// ── Obligations (Page 2 Tab 4) ──────────────────────────────

	/** Add a loan obligation entry */
	addObligation(applicantId: string, entry: EnhancedLoanEntry) {
		const data = this.getOrCreate(applicantId);
		data.obligations.active.push(entry);
		data.updatedAt = new Date().toISOString();
		this.persist();
	}

	/** Update a loan obligation entry by finding it by its loanType + bankName + index */
	updateObligation(applicantId: string, index: number, entry: EnhancedLoanEntry) {
		const data = this.getOrCreate(applicantId);
		if (index >= 0 && index < data.obligations.active.length) {
			data.obligations.active[index] = entry;
			data.updatedAt = new Date().toISOString();
			this.persist();
		}
	}

	/** Delete a loan obligation entry */
	deleteObligation(applicantId: string, index: number) {
		const data = this.getOrCreate(applicantId);
		if (index >= 0 && index < data.obligations.active.length) {
			data.obligations.active.splice(index, 1);
			data.updatedAt = new Date().toISOString();
			this.persist();
		}
	}

	/** Soft-delete all obligations (when obligationsRunning changes to No) */
	softDeleteAllObligations(applicantId: string) {
		const data = this.getOrCreate(applicantId);
		if (data.obligations.active.length > 0) {
			data.obligations.deleted.push(...data.obligations.active);
			data.obligations.active = [];
			data.updatedAt = new Date().toISOString();
			this.persist();
		}
	}

	/** Restore all soft-deleted obligations (when obligationsRunning toggles back to Yes) */
	restoreAllObligations(applicantId: string) {
		const data = this.getOrCreate(applicantId);
		if (data.obligations.deleted.length > 0) {
			data.obligations.active.push(...data.obligations.deleted);
			data.obligations.deleted = [];
			data.updatedAt = new Date().toISOString();
			this.persist();
		}
	}

	/** Get all active obligations */
	getActiveObligations(applicantId: string): EnhancedLoanEntry[] {
		const data = this.get(applicantId);
		if (!data) return [];
		return data.obligations.active;
	}

	// ── Bulk Operations ─────────────────────────────────────────

	/** Clear all data for all applicants */
	clearAll() {
		this.applicants = {};
		sessionStorage.removeItem(STORAGE_KEY);
	}

	/** Export full state (for debugging / payload inspection) */
	toJSON(): Record<string, ApplicantData> {
		return $state.snapshot(this.applicants);
	}

	/** Import state (for loading from server / snapshot) */
	fromJSON(data: Record<string, ApplicantData>) {
		this.applicants = data;
		this.persist();
	}
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const applicantDataStore = new ApplicantDataStore();
