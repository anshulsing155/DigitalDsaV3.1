/**
 * Consolidated Form State using Svelte 5 Runes
 *
 * This replaces the scattered stores from:
 * - loanData.ts (loanData, applicationData, applicantsStore, etc.)
 * - applicationData.ts (validated applicationData)
 * - stores.ts (form-related portions)
 *
 * Uses Svelte 5 runes for reactivity with proper TypeScript types.
 */

import { browser } from '$app/environment';
import clientLogger from '$lib/utils/clientLogger';
import { getPreferences } from '$lib/utils/capacitorPreferences';
import type {
	FormState,
	ApplicationData,
	LegacyApplicationData,
	Applicant,
	ApplicantErrors,
	BackHistoryEntry,
	PageIndexObject,
	FormErrors
} from '$lib/types/form';
import {
	STORAGE_KEYS,
	DEFAULT_APPLICATION_DATA,
	DEFAULT_LEGACY_DATA
} from '$lib/types/form';
import { applicationDataSchema } from '$lib/schemas/applicationDataSchema';
import { clearAllRelationships } from '$lib/components/relationship-capture/relationshipStore';
import { incomeProfileStore } from '$lib/stores/incomeProfileStore';
import { applicantState, buildMatchSignature, type RecoveryScope } from '$lib/state/applicant.svelte';

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

/**
 * Load data from sessionStorage with fallback
 */
function loadFromStorage<T>(key: string, defaultValue: T): T {
	if (!browser) return defaultValue;

	try {
		const stored = sessionStorage.getItem(key);
		if (stored) {
			return JSON.parse(stored) as T;
		}
	} catch {
		clientLogger.error(`[FormState] Failed to load "${key}" from storage`);
	}
	return defaultValue;
}

/**
 * Flag indicating sessionStorage save failed due to quota exceeded.
 * Read by FormShell to show a non-blocking warning banner.
 */
let storageQuotaWarning = $state<string | null>(null);

/** Expose the storage warning for FormShell to read */
export function getStorageWarning(): string | null {
	return storageQuotaWarning;
}

/** Clear the storage warning (e.g., after user acknowledges it) */
export function clearStorageWarning(): void {
	storageQuotaWarning = null;
}

/**
 * Save data to sessionStorage.
 * On QuotaExceededError, tries cleanup of stale keys and retries once.
 * If still fails, sets storageQuotaWarning for UI display.
 */
function saveToStorage<T>(key: string, value: T): void {
	if (!browser) return;

	try {
		sessionStorage.setItem(key, JSON.stringify(value));
		// Clear any previous warning on successful save
		if (storageQuotaWarning) storageQuotaWarning = null;
	} catch (err) {
		// Detect storage quota exceeded specifically
		if (err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22)) {
			// Try to free space by removing stale/old keys
			try {
				const staleKeyPrefixes = ['__old_', '_expired_', '__debug_', '__tmp_'];
				const keysToRemove: string[] = [];
				for (let i = 0; i < sessionStorage.length; i++) {
					const k = sessionStorage.key(i);
					if (k && staleKeyPrefixes.some((prefix) => k.startsWith(prefix))) {
						keysToRemove.push(k);
					}
				}
				for (const k of keysToRemove) sessionStorage.removeItem(k);

				// Retry once after cleanup
				sessionStorage.setItem(key, JSON.stringify(value));
				return; // Success after cleanup
			} catch {
				// Cleanup didn't help — storage is genuinely full
			}

			storageQuotaWarning =
				'Browser storage is full. Your form progress may not be saved. Please submit your form soon.';
			clientLogger.error(`[FormState] Storage quota exceeded for "${key}"`);
			return;
		}

		clientLogger.error(`[FormState] Failed to save "${key}" to storage`);
	}
}

/**
 * Load data from Capacitor Preferences (for mobile)
 */
async function loadFromPreferences<T>(key: string, defaultValue: T): Promise<T> {
	if (!browser) return defaultValue;

	try {
		const prefs = await getPreferences();
		if (!prefs) return defaultValue;
		const { Preferences } = prefs;
		const result = await Preferences.get({ key });
		if (result.value) {
			return JSON.parse(result.value) as T;
		}
	} catch (err) {
		clientLogger.error({ err }, `[FormState] Failed to load "${key}" from Preferences`);
	}
	return defaultValue;
}

/**
 * Save data to Capacitor Preferences (for mobile)
 */
async function saveToPreferences<T>(key: string, value: T): Promise<void> {
	if (!browser) return;

	try {
		const prefs = await getPreferences();
		if (!prefs) return;
		const { Preferences } = prefs;
		await Preferences.set({ key, value: JSON.stringify(value) });
	} catch (err) {
		clientLogger.error({ err }, `[FormState] Failed to save "${key}" to Preferences`);
	}
}

// ============================================================================
// PER-LOAN PAGE INDEX STORAGE KEYS
// ============================================================================

const LOAN_PAGE_INDEX_KEYS = {
	LAP: 'lap-page-index',
	PLOT: 'plot-loan-page-index',
	BUSINESS: 'business-loan-page-index',
	PERSONAL: 'personal-loan-page-index',
	PROFESSIONAL: 'professional-loan-page-index'
} as const;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Derive a RecoveryScope from the old loanCategory + applicantType.
 * Used when saving applicants to the recovery bin on loan-type switch so the
 * cross-loan suggestion system knows what origin loan each entry came from.
 *
 * Directors in Business Loans have applicantType='Individual' but carry a
 * linkedCompanyId — they get the 'business::director' scope so they surface
 * correctly in cross-loan modals.
 */
function _scopeFromCategory(
	category: string,
	applicantType: string,
	isLinkedDirector: boolean
): RecoveryScope {
	if (category === 'personal') return 'personal::individual';

	if (category === 'business') {
		if (applicantType === 'Company') return 'business::company';
		if (isLinkedDirector) return 'business::director';
		return 'business::individual';
	}

	if (category === 'professional') {
		if (applicantType === 'Company') return 'professional::company';
		return 'professional::individual';
	}

	// 'secured' covers Home / LAP / Plot
	return applicantType === 'Company' ? 'secured::company' : 'secured::individual';
}

// ============================================================================
// FORM STATE CLASS
// ============================================================================

/**
 * Cheap structural equality check used by the idempotent replace*() methods
 * below. Used on small POJOs (loanData, applicationData) so a stable stringify
 * is fast enough and avoids pulling in a deep-equal dependency.
 *
 * Plain JSON.stringify preserves insertion order, which means two objects with
 * the same keys/values but built in different orders compare as unequal. That
 * would cause spurious "dirty" writes if a future call site builds the
 * replacement object via a different code path (e.g. parsed from storage vs
 * constructed inline). _stableStringify normalises by sorting object keys
 * recursively before serialising, so equality is order-independent.
 */
function _stableStringify(v: unknown): string {
	return JSON.stringify(v, (_key, val) => {
		if (val && typeof val === 'object' && !Array.isArray(val)) {
			const sorted: Record<string, unknown> = {};
			for (const k of Object.keys(val).sort()) {
				sorted[k] = (val as Record<string, unknown>)[k];
			}
			return sorted;
		}
		return val;
	});
}

function _jsonEquals(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	try {
		return _stableStringify(a) === _stableStringify(b);
	} catch {
		return false;
	}
}

class FormStateManager {
	// Main form data (dynamic, from JSON questions)
	loanData = $state<Record<string, unknown>>({});

	// Validated application data (from schema)
	applicationData = $state<ApplicationData>(structuredClone(DEFAULT_APPLICATION_DATA));

	// Legacy data for backward compatibility
	legacyData = $state<LegacyApplicationData>(structuredClone(DEFAULT_LEGACY_DATA));

	// Applicants management
	applicants = $state<Applicant[]>([]);
	applicantsPayload = $state<Applicant[]>([]);
	applicantErrors = $state<ApplicantErrors>({});

	// Navigation state — new array-based history (for future use)
	backHistory = $state<BackHistoryEntry[]>([]);
	// Navigation state — legacy single-object history (used by 74+ consumers via bridge)
	legacyBackHistory = $state<BackHistoryEntry>({});
	pageIndexObject = $state<PageIndexObject[]>([]);
	currentPageIndex = $state(0);
	applicantPageIndex = $state(0);

	// Per-loan page indices (used by form route +page.ts files)
	lapPageIndex = $state(0);
	plotLoanPageIndex = $state(0);
	businessLoanPageIndex = $state(0);
	personalLoanPageIndex = $state(0);
	professionalLoanPageIndex = $state(0);

	// Form state flags
	applicantStepTouched = $state(false);
	formErrors = $state<FormErrors>({});
	isLoading = $state(false);
	isDirty = $state(false);

	// Navigation URLs
	backURL = $state('');
	nextURL = $state('');

	// Internal state
	private _initialized = false;
	private _saveTimer: ReturnType<typeof setTimeout> | null = null;

	constructor() {
		if (browser) {
			this._loadFromSessionStorage(); // Synchronous load for bridge compatibility
		}
	}

	// ============================================================================
	// SYNCHRONOUS STORAGE LOAD (for constructor — bridges need data immediately)
	// ============================================================================

	private _loadFromSessionStorage(): void {
		this.loanData = loadFromStorage(STORAGE_KEYS.LOAN_DATA, {});
		this.legacyBackHistory = loadFromStorage(STORAGE_KEYS.BACK_HISTORY, {});
		this.applicantStepTouched = loadFromStorage(STORAGE_KEYS.APPLICANT_STEP_TOUCHED, false);
		this.pageIndexObject = loadFromStorage(STORAGE_KEYS.PAGE_INDEX_OBJECT, []);
		this.currentPageIndex = loadFromStorage(STORAGE_KEYS.LOAN_PAGE_INDEX, 0);
		this.applicantPageIndex = loadFromStorage(STORAGE_KEYS.APPLICANT_INDEX_NUMBER, 0);
		this.applicants = loadFromStorage(STORAGE_KEYS.APPLICANTS_STORE, []);
		this.applicantsPayload = loadFromStorage(STORAGE_KEYS.APPLICANTS_PAYLOAD, []);

		// Load applicationData from storage (validation happens on submit, not on load)
		const storedAppData = loadFromStorage<ApplicationData | null>(
			STORAGE_KEYS.APPLICATION_DATA,
			null
		);
		if (storedAppData) {
			this.applicationData = { ...structuredClone(DEFAULT_APPLICATION_DATA), ...storedAppData };
		}

		// Per-loan page indices
		this.lapPageIndex = loadFromStorage(LOAN_PAGE_INDEX_KEYS.LAP, 0);
		this.plotLoanPageIndex = loadFromStorage(LOAN_PAGE_INDEX_KEYS.PLOT, 0);
		this.businessLoanPageIndex = loadFromStorage(LOAN_PAGE_INDEX_KEYS.BUSINESS, 0);
		this.personalLoanPageIndex = loadFromStorage(LOAN_PAGE_INDEX_KEYS.PERSONAL, 0);
		this.professionalLoanPageIndex = loadFromStorage(LOAN_PAGE_INDEX_KEYS.PROFESSIONAL, 0);

		this._initialized = true;
	}

	// ============================================================================
	// GETTERS (Derived State)
	// ============================================================================

	/**
	 * Check if form has any applicants
	 */
	get hasApplicants(): boolean {
		return this.applicants.length > 0;
	}

	/**
	 * Get the primary applicant.
	 *
	 * Resolution order:
	 *   1. Explicit `isPrimaryApplicant` flag (set via `setPrimaryApplicant()`)
	 *   2. Legacy role marker (`existingRoleOfPerson` / `roleOfPerson === 'primary'`)
	 *   3. Fallback: first applicant in the array
	 */
	get primaryApplicant(): Applicant | undefined {
		return (
			this.applicants.find((a) => a.isPrimaryApplicant === true) ||
			this.applicants.find(
				(a) => a.existingRoleOfPerson === 'primary' || a.roleOfPerson === 'primary'
			) ||
			this.applicants[0]
		);
	}

	/**
	 * Get co-applicants
	 */
	get coApplicants(): Applicant[] {
		return this.applicants.filter(
			(a) => a.existingRoleOfPerson === 'co-applicant' || a.roleOfPerson === 'co-applicant'
		);
	}

	/**
	 * Check if form has validation errors
	 */
	get hasErrors(): boolean {
		return (
			Object.keys(this.formErrors).length > 0 ||
			Object.keys(this.applicantErrors).length > 0 ||
			this.applicants.some((a) => a.hasError)
		);
	}

	/**
	 * Get the current step completion status
	 */
	get isCurrentStepComplete(): boolean {
		// Check if all applicants are complete
		return this.applicants.every((a) => a.isCompleted);
	}

	/**
	 * Get total number of completed applicants
	 */
	get completedApplicantsCount(): number {
		return this.applicants.filter((a) => a.isCompleted).length;
	}

	// ============================================================================
	// INITIALIZATION
	// ============================================================================

	/**
	 * Initialize form state — async part (Capacitor Preferences for mobile).
	 * Synchronous sessionStorage loads happen in the constructor via _loadFromSessionStorage().
	 * This method only needs to be called once from root +layout.svelte onMount.
	 */
	async init(): Promise<void> {
		if (!browser) return;

		try {
			// Also try Capacitor Preferences for mobile (overwrites sessionStorage if present)
			const prefsAppData = await loadFromPreferences<ApplicationData | null>(
				STORAGE_KEYS.APPLICATION_DATA,
				null
			);
			if (prefsAppData) {
				this.applicationData = { ...structuredClone(DEFAULT_APPLICATION_DATA), ...prefsAppData };
			}
		} catch {
			clientLogger.error('[FormState] Failed to initialize from Capacitor Preferences');
		}
	}

	// ============================================================================
	// LOAN DATA METHODS
	// ============================================================================

	/**
	 * Set a field in loan data
	 */
	setLoanField(key: string, value: unknown): void {
		this.loanData = { ...this.loanData, [key]: value };
		this.isDirty = true;
		this._scheduleSave();
	}

	/**
	 * Get a field from loan data
	 */
	getLoanField<T = unknown>(key: string, defaultValue?: T): T {
		return (this.loanData[key] as T) ?? (defaultValue as T);
	}

	/**
	 * Set multiple loan data fields at once
	 */
	setLoanData(data: Record<string, unknown>): void {
		this.loanData = { ...this.loanData, ...data };
		this.isDirty = true;
		this._scheduleSave();
	}

	/**
	 * Reset loan data
	 */
	resetLoanData(): void {
		this.loanData = {};
		this.isDirty = true;
		this._scheduleSave();
	}

	// ============================================================================
	// APPLICATION DATA METHODS
	// ============================================================================

	/**
	 * Update application data with validation
	 */
	setApplicationData(data: Partial<ApplicationData>): void {
		const updated = { ...this.applicationData, ...data };
		try {
			this.applicationData = applicationDataSchema.parse(updated);
			this.isDirty = true;
			this._scheduleSave();
		} catch {
			clientLogger.error('[FormState] Invalid application data update — Zod validation failed');
		}
	}

	/**
	 * Update a specific field in application data
	 */
	setApplicationField<K extends keyof ApplicationData>(key: K, value: ApplicationData[K]): void {
		this.setApplicationData({ [key]: value } as Partial<ApplicationData>);
	}

	// ============================================================================
	// APPLICANT METHODS
	// ============================================================================

	/**
	 * Add a new applicant
	 */
	addApplicant(applicant: Applicant): void {
		const id = applicant.id || `applicant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		this.applicants = [...this.applicants, { ...applicant, id }];
		this.isDirty = true;
		this._scheduleSave();
	}

	/**
	 * Update an applicant by index
	 */
	updateApplicant(index: number, updates: Partial<Applicant>): void {
		if (index < 0 || index >= this.applicants.length) return;

		const updated = [...this.applicants];
		updated[index] = { ...updated[index], ...updates };
		this.applicants = updated;
		this.isDirty = true;
		this._scheduleSave();
	}

	/**
	 * Update an applicant by ID
	 */
	updateApplicantById(id: string, updates: Partial<Applicant>): void {
		const index = this.applicants.findIndex((a) => a.id === id);
		if (index !== -1) {
			this.updateApplicant(index, updates);
		}
	}

	/**
	 * Remove an applicant by index
	 */
	removeApplicant(index: number): void {
		if (index < 0 || index >= this.applicants.length) return;

		this.applicants = this.applicants.filter((_, i) => i !== index);

		// Clean up errors for this applicant
		const { [index]: _, ...remainingErrors } = this.applicantErrors;
		this.applicantErrors = remainingErrors;

		this.isDirty = true;
		this._scheduleSave();
	}

	/**
	 * Update relationship for an applicant (from loanData.ts helper)
	 */
	updateRelationship(index: number, value: string): void {
		if (index < 0 || index >= this.applicants.length) return;

		const updated = [...this.applicants];
		updated[index] = {
			...updated[index],
			relationship: value as Applicant['relationship']
		};

		if (value !== 'Not in Blood Relation') {
			updated[index].otherBloodRelation = '';
		}

		this.applicants = updated;
		this.isDirty = true;
		this._scheduleSave();
	}

	/**
	 * Update other blood relation for an applicant (from loanData.ts helper)
	 */
	updateOtherBloodRelation(index: number, value: string): void {
		if (index < 0 || index >= this.applicants.length) return;

		const updated = [...this.applicants];
		updated[index] = {
			...updated[index],
			otherBloodRelation: value,
			relationwith: value
		};
		this.applicants = updated;
		this.isDirty = true;
		this._scheduleSave();
	}

	/**
	 * Update relation with for an applicant (from loanData.ts helper)
	 */
	updateRelationWith(index: number, value: string): void {
		if (index < 0 || index >= this.applicants.length) return;

		const updated = [...this.applicants];
		updated[index] = {
			...updated[index],
			otherBloodRelation: value
		};
		this.applicants = updated;
		this.isDirty = true;
		this._scheduleSave();
	}

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	/**
	 * Set form-level error
	 */
	setFormError(field: string, message: string): void {
		this.formErrors = { ...this.formErrors, [field]: message };
	}

	/**
	 * Clear form-level error
	 */
	clearFormError(field: string): void {
		const { [field]: _, ...rest } = this.formErrors;
		this.formErrors = rest;
	}

	/**
	 * Set applicant-level error
	 */
	setApplicantError(applicantIndex: number, field: string, message: string): void {
		const current = this.applicantErrors[applicantIndex] || {};
		this.applicantErrors = {
			...this.applicantErrors,
			[applicantIndex]: { ...current, [field]: message }
		};
	}

	/**
	 * Clear applicant-level error
	 */
	clearApplicantError(applicantIndex: number, field: string): void {
		const current = this.applicantErrors[applicantIndex];
		if (!current) return;

		const { [field]: _, ...rest } = current;
		if (Object.keys(rest).length === 0) {
			const { [applicantIndex]: __, ...remaining } = this.applicantErrors;
			this.applicantErrors = remaining;
		} else {
			this.applicantErrors = { ...this.applicantErrors, [applicantIndex]: rest };
		}
	}

	/**
	 * Clear all errors
	 */
	clearAllErrors(): void {
		this.formErrors = {};
		this.applicantErrors = {};
		this.applicants = this.applicants.map((a) => ({ ...a, hasError: false }));
	}

	// ============================================================================
	// NAVIGATION METHODS
	// ============================================================================

	/**
	 * Set navigation URLs
	 */
	setNavigation(back: string, next: string): void {
		this.backURL = back;
		this.nextURL = next;
	}

	/**
	 * Add to back history
	 */
	addToHistory(url: string): void {
		this.backHistory = [...this.backHistory, { url, timestamp: Date.now() }];
		this._scheduleSave();
	}

	/**
	 * Pop from back history
	 */
	popHistory(): BackHistoryEntry | undefined {
		const last = this.backHistory[this.backHistory.length - 1];
		this.backHistory = this.backHistory.slice(0, -1);
		this._scheduleSave();
		return last;
	}

	/**
	 * Set current page index
	 */
	setPageIndex(index: number): void {
		this.currentPageIndex = index;
		this._scheduleSave();
	}

	/**
	 * Set applicant page index
	 */
	setApplicantPageIndex(index: number): void {
		this.applicantPageIndex = index;
		this._scheduleSave();
	}

	// ============================================================================
	// STATE FLAGS
	// ============================================================================

	/**
	 * Set loading state
	 */
	setLoading(loading: boolean): void {
		this.isLoading = loading;
	}

	/**
	 * Mark applicant step as touched
	 */
	touchApplicantStep(): void {
		this.applicantStepTouched = true;
		this._scheduleSave();
	}

	// ============================================================================
	// PER-LOAN PAGE INDEX METHODS
	// ============================================================================

	setLapPageIndex(index: number): void {
		this.lapPageIndex = index;
		this._scheduleSave();
	}

	setPlotLoanPageIndex(index: number): void {
		this.plotLoanPageIndex = index;
		this._scheduleSave();
	}

	setBusinessLoanPageIndex(index: number): void {
		this.businessLoanPageIndex = index;
		this._scheduleSave();
	}

	setPersonalLoanPageIndex(index: number): void {
		this.personalLoanPageIndex = index;
		this._scheduleSave();
	}

	setProfessionalLoanPageIndex(index: number): void {
		this.professionalLoanPageIndex = index;
		this._scheduleSave();
	}

	// ============================================================================
	// BRIDGE REPLACE METHODS (used by compatibility bridges in loanData.ts)
	// ============================================================================

	/** @internal Used by compatibility bridges to replace entire loanData.
	 *  Idempotent w.r.t. isDirty: a write that produces structurally equal
	 *  data does NOT re-mark dirty or schedule a save. This matters because
	 *  several routes have a `$effect` that mirrors derived answers back into
	 *  loanData/applicationData; without idempotency, a no-op write inside
	 *  that effect (which happens after Clear Form when the cleared state
	 *  cascades through derived values) re-flips isDirty=true in the same
	 *  microtask flush as SvelteKit's beforeNavigate, causing the unsavedGuard
	 *  to cancel the navigation. The user then has to click Clear Form a
	 *  second time. Detected 2026-05-05.
	 */
	replaceLoanData(data: Record<string, unknown>): void {
		if (_jsonEquals(this.loanData, data)) return;
		this.loanData = data;
		this.isDirty = true;
		this._scheduleSave();
	}

	/** @internal Replace entire applicationData (bypasses Zod validation for bridge compatibility).
	 *  Same idempotency guarantee as replaceLoanData. */
	replaceApplicationData(data: ApplicationData): void {
		if (_jsonEquals(this.applicationData, data)) return;
		this.applicationData = data;
		this.isDirty = true;
		this._scheduleSave();
	}

	/**
	 * Remove specific keys from applicationData.
	 * Used by secured loan routes on mount to evict stale fields from a prior
	 * secured product (e.g. Home Loan's builderName surviving into LAP).
	 */
	clearApplicationFields(keys: readonly string[]): void {
		const data = { ...(this.applicationData as Record<string, unknown>) };
		for (const key of keys) {
			delete data[key];
		}
		this.applicationData = data as ApplicationData;
		this.isDirty = true;
		this._scheduleSave();
	}

	/**
	 * Immediately flush any pending debounced save to sessionStorage.
	 * Call before navigation to ensure in-memory state is persisted.
	 */
	flushSave(): void {
		if (this._saveTimer) {
			clearTimeout(this._saveTimer);
			this._saveTimer = null;
		}
		this._persistAll();
	}

	/**
	 * Trigger a debounced persist to sessionStorage.
	 * Use when applicant data is mutated via direct proxy (bind:) instead of replaceApplicants().
	 */
	scheduleSave(): void {
		this.isDirty = true;
		this._scheduleSave();
	}

	/**
	 * Mark one applicant as primary without changing array order.
	 * Clears isPrimaryApplicant from all others, sets it on the chosen index.
	 * Use this instead of reordering — array position is used by legacy consumers.
	 */
	setPrimaryApplicant(index: number): void {
		if (index < 0 || index >= this.applicants.length) return;
		this.applicants = this.applicants.map((a, i) => ({
			...a,
			isPrimaryApplicant: i === index
		})) as typeof this.applicants;
		this.isDirty = true;
		this._scheduleSave();
	}

	/** @internal Replace entire applicants array */
	replaceApplicants(applicants: Applicant[]): void {
		// Dedup by id — prevent each_key_duplicate Svelte crash
		const seen = new Set<string>();
		this.applicants = applicants.filter((a) => {
			const id = (a as any).id as string;
			if (!id) return true; // keep entries without id (shouldn't happen)
			if (seen.has(id)) return false;
			seen.add(id);
			return true;
		});
		this.isDirty = true;
		this._scheduleSave();
	}

	/** @internal Replace entire applicantsPayload */
	replaceApplicantsPayload(payload: Applicant[]): void {
		this.applicantsPayload = payload;
		this.isDirty = true;
		this._scheduleSave();
	}

	/** @internal Replace legacy back history (single object) */
	replaceLegacyBackHistory(history: BackHistoryEntry): void {
		this.legacyBackHistory = history;
		this.isDirty = true;
		this._scheduleSave();
	}

	/** @internal Replace entire pageIndexObject */
	replacePageIndexObject(indexes: PageIndexObject[]): void {
		this.pageIndexObject = indexes;
		this.isDirty = true;
		this._scheduleSave();
	}

	/** @internal Replace applicantErrors */
	replaceApplicantErrors(errors: ApplicantErrors): void {
		this.applicantErrors = errors;
		this.isDirty = true;
	}

	/** @internal Replace applicantStepTouched */
	replaceApplicantStepTouched(touched: boolean): void {
		this.applicantStepTouched = touched;
		this._scheduleSave();
	}

	// ============================================================================
	// RESET METHODS
	// ============================================================================

	/**
	 * Reset all form state
	 */
	reset(): void {
		this.loanData = {};
		this.applicationData = structuredClone(DEFAULT_APPLICATION_DATA);
		this.legacyData = structuredClone(DEFAULT_LEGACY_DATA);
		this.applicants = [];
		this.applicantsPayload = [];
		this.applicantErrors = {};
		this.backHistory = [];
		this.legacyBackHistory = {};
		this.pageIndexObject = [];
		this.currentPageIndex = 0;
		this.applicantPageIndex = 0;
		this.lapPageIndex = 0;
		this.plotLoanPageIndex = 0;
		this.businessLoanPageIndex = 0;
		this.personalLoanPageIndex = 0;
		this.professionalLoanPageIndex = 0;
		this.applicantStepTouched = false;
		this.formErrors = {};
		this.isLoading = false;
		this.isDirty = false;
		this.backURL = '';
		this.nextURL = '';

		// Clear storage
		this._clearAllStorage();
	}

	/**
	 * Clear applicant data when switching between loan types.
	 * If the stored loanCategory differs from the target, clears applicants,
	 * dependent stores (relationships, income profiles), AND resets
	 * applicationData back to defaults. 'secured' covers Home/LAP/Plot —
	 * applicants and applicationData are preserved when switching within
	 * the secured family. Within-secured stale keys are handled by each
	 * secured route's clearApplicationFields() call on mount.
	 */
	clearForLoanType(targetCategory: 'personal' | 'business' | 'professional' | 'secured'): void {
		const currentCategory = (this.applicationData as any)?.loanCategory as string | undefined;
		if (currentCategory && currentCategory !== targetCategory) {
			// Save every current applicant to the recovery bin BEFORE wiping.
			// Without this, cross-loan name-match suggestions have nothing to query —
			// the recovery bin stays empty and findCrossLoanSuggestions() returns [].
			// The restore handler (prefillApplicantRestore) already sets onEMI/onProperty
			// correctly for the target loan, so no extra mapping is needed here.
			for (const applicant of this.applicants) {
				const applicantId = applicant.id as string | undefined;
				const displayName =
					((applicant.fullName as string) || (applicant.companyName as string) || '').trim();
				if (!applicantId || !displayName) continue;

				const matchSignature = buildMatchSignature(applicant as Record<string, unknown>);
				if (!matchSignature) continue;

				const scope = _scopeFromCategory(
					currentCategory,
					(applicant.applicantType as string) ?? 'Individual',
					!!(applicant.linkedCompanyId as string | undefined)
				);

				applicantState.removeToRecovery(
					applicantId,
					applicant as Record<string, unknown>,
					displayName,
					matchSignature,
					scope
				);
			}

			this.applicants = [];
			this.applicantsPayload = [];
			this.applicantErrors = {};
			this.applicantPageIndex = 0;
			this.applicantStepTouched = false;
			// Blank-slate applicationData on cross-category switch.
			// The calling route sets loanCategory + loanName immediately after.
			// Applicants suited for the new category are recoverable via the
			// recovery bin + name matching — no applicationData field survives
			// a secured↔unsecured switch because nothing carries meaningful
			// value across fundamentally different loan shapes.
			this.applicationData = structuredClone(DEFAULT_APPLICATION_DATA);
			this.isDirty = true;
			this._scheduleSave();
			// Clear stores that reference the now-deleted applicant IDs.
			// Stale entries would surface as ghost data in the new loan's UI.
			clearAllRelationships();
			incomeProfileStore.clearAll();
		}
	}

	/**
	 * Reset only applicant data (keep loan type selection, etc.)
	 */
	resetApplicants(): void {
		this.applicants = [];
		this.applicantsPayload = [];
		this.applicantErrors = {};
		this.applicantStepTouched = false;
		this.applicantPageIndex = 0;
		this.isDirty = true;
		this._scheduleSave();
	}

	// ============================================================================
	// PERSISTENCE (PRIVATE)
	// ============================================================================

	private _scheduleSave(): void {
		if (!browser) return;
		if (this._saveTimer) clearTimeout(this._saveTimer);
		this._saveTimer = setTimeout(() => {
			this._saveTimer = null;
			this._persistAll();
		}, 300);
	}

	private _persistAll(): void {
		if (!browser) return;

		// Save to sessionStorage
		saveToStorage(STORAGE_KEYS.LOAN_DATA, this.loanData);
		saveToStorage(STORAGE_KEYS.APPLICATION_DATA, this.applicationData);
		saveToStorage(STORAGE_KEYS.BACK_HISTORY, this.legacyBackHistory);
		saveToStorage(STORAGE_KEYS.APPLICANT_STEP_TOUCHED, this.applicantStepTouched);
		saveToStorage(STORAGE_KEYS.PAGE_INDEX_OBJECT, this.pageIndexObject);
		saveToStorage(STORAGE_KEYS.LOAN_PAGE_INDEX, this.currentPageIndex);
		saveToStorage(STORAGE_KEYS.APPLICANT_INDEX_NUMBER, this.applicantPageIndex);
		saveToStorage(STORAGE_KEYS.APPLICANTS_STORE, this.applicants);
		saveToStorage(STORAGE_KEYS.APPLICANTS_PAYLOAD, this.applicantsPayload);

		// Per-loan page indices
		saveToStorage(LOAN_PAGE_INDEX_KEYS.LAP, this.lapPageIndex);
		saveToStorage(LOAN_PAGE_INDEX_KEYS.PLOT, this.plotLoanPageIndex);
		saveToStorage(LOAN_PAGE_INDEX_KEYS.BUSINESS, this.businessLoanPageIndex);
		saveToStorage(LOAN_PAGE_INDEX_KEYS.PERSONAL, this.personalLoanPageIndex);
		saveToStorage(LOAN_PAGE_INDEX_KEYS.PROFESSIONAL, this.professionalLoanPageIndex);

		// Also save to Capacitor Preferences for mobile
		saveToPreferences(STORAGE_KEYS.APPLICATION_DATA, this.applicationData).catch(() => {
			// Silent fail for Capacitor
		});

		this.isDirty = false;
	}

	private _clearAllStorage(): void {
		if (!browser) return;

		// Clear main storage keys
		Object.values(STORAGE_KEYS).forEach((key) => {
			try {
				sessionStorage.removeItem(key);
			} catch {
				// Silent fail
			}
		});

		// Clear per-loan page index keys
		Object.values(LOAN_PAGE_INDEX_KEYS).forEach((key) => {
			try {
				sessionStorage.removeItem(key);
			} catch {
				// Silent fail
			}
		});

		// Clear Capacitor Preferences (fire-and-forget)
		void (async () => {
			const prefs = await getPreferences();
			if (!prefs) return;
			const { Preferences } = prefs;
			try {
				await Preferences.remove({ key: STORAGE_KEYS.APPLICATION_DATA });
			} catch {
				// Silent fail
			}
		})();
	}

	// ============================================================================
	// SERIALIZATION (for debugging/export)
	// ============================================================================

	/**
	 * Export current state as JSON
	 */
	toJSON(): FormState {
		return {
			loanData: this.loanData,
			applicationData: this.applicationData,
			legacyData: this.legacyData,
			applicants: this.applicants,
			applicantsPayload: this.applicantsPayload,
			applicantErrors: this.applicantErrors,
			backHistory: this.backHistory,
			pageIndexObject: this.pageIndexObject,
			currentPageIndex: this.currentPageIndex,
			applicantPageIndex: this.applicantPageIndex,
			applicantStepTouched: this.applicantStepTouched,
			formErrors: this.formErrors,
			isLoading: this.isLoading,
			isDirty: this.isDirty,
			backURL: this.backURL,
			nextURL: this.nextURL
		};
	}

	/**
	 * Import state from JSON (for debugging/restore)
	 */
	fromJSON(state: Partial<FormState>): void {
		if (state.loanData) this.loanData = state.loanData;
		if (state.applicationData) {
			try {
				this.applicationData = applicationDataSchema.parse(state.applicationData);
			} catch {
				clientLogger.warn('[FormState] Invalid applicationData in import — Zod validation failed');
			}
		}
		if (state.legacyData) this.legacyData = state.legacyData;
		if (state.applicants) this.applicants = state.applicants;
		if (state.applicantsPayload) this.applicantsPayload = state.applicantsPayload;
		if (state.applicantErrors) this.applicantErrors = state.applicantErrors;
		if (state.backHistory) this.backHistory = state.backHistory;
		if (state.pageIndexObject) this.pageIndexObject = state.pageIndexObject;
		if (state.currentPageIndex !== undefined) this.currentPageIndex = state.currentPageIndex;
		if (state.applicantPageIndex !== undefined) this.applicantPageIndex = state.applicantPageIndex;
		if (state.applicantStepTouched !== undefined)
			this.applicantStepTouched = state.applicantStepTouched;
		if (state.formErrors) this.formErrors = state.formErrors;
		if (state.backURL !== undefined) this.backURL = state.backURL;
		if (state.nextURL !== undefined) this.nextURL = state.nextURL;

		this.isDirty = true;
		this._scheduleSave();
	}
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Global form state instance
 * Import this in components to access form state
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { formState } from '$lib/state/form.svelte';
 *
 *   const loanType = $derived(formState.getLoanField('loanType', ''));
 *   const applicants = $derived(formState.applicants);
 * </script>
 * ```
 */
export const formState = new FormStateManager();

// ============================================================================
// COMPATIBILITY EXPORTS
// ============================================================================

// These provide backward compatibility with the old store API
// They create derived values that can be used in place of store subscriptions

/**
 * Get current loan data (for backward compatibility)
 * Use formState.loanData directly for new code
 */
export function getLoanData(): Record<string, unknown> {
	return formState.loanData;
}

/**
 * Get current applicants (for backward compatibility)
 * Use formState.applicants directly for new code
 */
export function getApplicants(): Applicant[] {
	return formState.applicants;
}

/**
 * Get current application data (for backward compatibility)
 * Use formState.applicationData directly for new code
 */
export function getApplicationData(): ApplicationData {
	return formState.applicationData;
}
