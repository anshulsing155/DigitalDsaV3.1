/**
 * Applicant Data — Structured Storage Format
 * ═══════════════════════════════════════════════════════════════════
 * Defines the per-applicant data structure organized by form page.
 *
 * Key principles:
 *   1. Data is organized by page (meta, incomeProfiles, incomeEntries, etc.)
 *   2. Income entries are grouped by profile type with active/deleted arrays
 *   3. Loan obligations are stored with full form data per entry
 *   4. Soft-delete enables restore when profiles are re-selected
 *   5. Each entry is self-contained (specifics, income, evidence inside)
 * ═══════════════════════════════════════════════════════════════════
 */

import type { IncomeProfileType, IncomeSourceEntry, EnhancedLoanEntry } from './incomeProfile.js';
import { generateId } from '$lib/utils.js';

// ============================================================================
// PAGE 1: APPLICANT META (Basic Details)
// ============================================================================

/**
 * Basic applicant information captured on the first page.
 * This is identity + relationship data — no financial info here.
 */
export interface ApplicantMeta {
	/** Unique applicant ID (stable across sessions) */
	id: string;
	/** Applicant type: Individual or Company */
	applicantType: 'Individual' | 'Company';
	/** Full name */
	fullName?: string;
	/** Age */
	age?: number;
	/** Gender */
	gender?: 'male' | 'female' | 'other';
	/** Marital status */
	maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
	/** Relationship to primary applicant (for co-applicants/guarantors) */
	relationship?: string;
	/** Existing property role */
	existingPropertyRole?: string;
	/** Company-specific fields */
	companyType?: string;
	businessType?: string;
}

// ============================================================================
// PAGE 2 TAB 1: INCOME PROFILE SELECTION
// ============================================================================

/**
 * Tracks which income profiles are currently selected.
 */
export interface IncomeProfileSelection {
	/** Currently active profile types */
	selectedProfiles: IncomeProfileType[];
}

// ============================================================================
// PAGE 2 TAB 2: INCOME ENTRIES (Active + Deleted)
// ============================================================================

/**
 * Stores all income entries organized by profile type.
 *
 * Active entries are what the applicant currently has.
 * Deleted entries are preserved for restore capability.
 *
 * Example structure:
 * ```
 * active: {
 *   salaried_regular: [entry1, entry2],       // 2 salaried jobs
 *   business_proprietorship: [entry3],          // 1 business
 *   pension: [entry4]                           // 1 pension
 * },
 * deleted: {
 *   rental_income: [entry5]                     // Was deleted, can restore
 * }
 * ```
 */
export interface IncomeEntriesStore {
	/** Active entries grouped by profile type */
	active: Partial<Record<IncomeProfileType, IncomeSourceEntry[]>>;
	/** Soft-deleted entries grouped by profile type (for restore) */
	deleted: Partial<Record<IncomeProfileType, IncomeSourceEntry[]>>;
	/**
	 * Profile types where user declined restore in the current editing session.
	 * When a profile is deselected and re-selected, this flag is cleared
	 * so the restore prompt shows again.
	 */
	restoreDenied: IncomeProfileType[];
}

// ============================================================================
// PAGE 2 TAB 3: CREDIT SCORE
// ============================================================================

/**
 * Credit score data for the applicant.
 */
export interface CreditScoreData {
	/** CIBIL score (300-900) */
	cibilScore?: number;
	/** Reasons for low credit score (if < 750) */
	lowScoreReasons?: string[];
	/** Has the applicant checked their CIBIL recently? */
	hasRecentCibil?: boolean;
	/** Obligations running (triggers Tab 4) */
	obligationsRunning?: boolean;
}

// ============================================================================
// PAGE 2 TAB 4: OBLIGATIONS (Loans + Limits)
// ============================================================================

/**
 * Stores all loan/limit obligation entries.
 * Each entry contains the FULL form data (not just table columns).
 *
 * Multiple loans of the same type are supported (e.g., 3 Home Loans).
 */
export interface ObligationsStore {
	/** Active obligation entries */
	active: EnhancedLoanEntry[];
	/** Soft-deleted entries (for restore when obligationsRunning toggles) */
	deleted: EnhancedLoanEntry[];
}

// ============================================================================
// COMPLETE APPLICANT DATA (All pages combined)
// ============================================================================

/**
 * Complete structured data for one applicant.
 * Organized by form page for easy access and clear data boundaries.
 */
export interface ApplicantData {
	/** Unique applicant ID (matches ApplicantMeta.id) */
	id: string;
	/** Page 1: Basic details */
	meta: ApplicantMeta;
	/** Page 2 Tab 1: Selected income profiles */
	incomeProfiles: IncomeProfileSelection;
	/** Page 2 Tab 2: Income entries with active/deleted tracking */
	incomeEntries: IncomeEntriesStore;
	/** Page 2 Tab 3: Credit score */
	creditScore: CreditScoreData;
	/** Page 2 Tab 4: Loan obligations with active/deleted tracking */
	obligations: ObligationsStore;
	/** Completion state flags (derived, not stored) */
	completion: ApplicantCompletion;
	/** Timestamps */
	createdAt: string;
	updatedAt: string;
}

/**
 * Tracks completion state per section.
 * These are derived from the data — not manually set.
 */
export interface ApplicantCompletion {
	basicDetails: boolean;
	incomeProfiles: boolean;
	incomeDetails: boolean;
	creditScore: boolean;
	obligations: boolean;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/** Create a new empty ApplicantData structure */
export function createEmptyApplicantData(id?: string): ApplicantData {
	const now = new Date().toISOString();
	return {
		id: id ?? generateId(),
		meta: {
			id: id ?? generateId(),
			applicantType: 'Individual'
		},
		incomeProfiles: {
			selectedProfiles: []
		},
		incomeEntries: {
			active: {},
			deleted: {},
			restoreDenied: []
		},
		creditScore: {},
		obligations: {
			active: [],
			deleted: []
		},
		completion: {
			basicDetails: false,
			incomeProfiles: false,
			incomeDetails: false,
			creditScore: false,
			obligations: false
		},
		createdAt: now,
		updatedAt: now
	};
}

/** Create empty IncomeEntriesStore */
export function createEmptyIncomeEntries(): IncomeEntriesStore {
	return {
		active: {},
		deleted: {},
		restoreDenied: []
	};
}

/** Create empty ObligationsStore */
export function createEmptyObligations(): ObligationsStore {
	return {
		active: [],
		deleted: []
	};
}
