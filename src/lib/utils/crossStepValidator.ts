/**
 * Cross-Step Contradiction Validator
 * ═══════════════════════════════════════════════════════════════════
 * Detects contradictions between Step 0 (basic info) and data
 * entered in later steps (income profiles, relationships).
 *
 * PURE FUNCTION — no Svelte, no reactivity, no side effects.
 * Called imperatively from navigation handlers (nextFromAddApplicant).
 *
 * Reuses existing validators:
 * - shouldShow() for income profile showWhen evaluation
 * - INCOME_PROFILE_CARDS for profile rules
 * - findInvalidRelationshipIds() for relationship validity
 * ═══════════════════════════════════════════════════════════════════
 */

import { shouldShow } from '$lib/config/showWhenEngine';
import { INCOME_PROFILE_CARDS } from '$lib/config/incomeProfiles/profileCards';
import { findInvalidRelationships } from '$lib/components/relationship-capture/relationshipValidator';
import type { InvalidCheck } from '$lib/components/relationship-capture/relationshipValidator';
import type { IncomeProfileType, IncomeSourceEntry } from '$lib/types/incomeProfile';
import type { Relationship } from '$lib/components/relationship-capture/types';

// ── Local Type Aliases ──────────────────────────────────────────
// Lightweight interfaces for applicant sub-structures accessed during validation.
// These are intentionally loose — applicant data comes from formState and may
// contain legacy or optional fields.

/** Applicant data from formState — a loosely-typed record since fields vary by loan type */
type ApplicantRecord = Record<string, unknown>;

/** Obligation entry — covers both new EnhancedLoanEntry and legacy LoanEntry shapes */
interface ObligationEntry {
	emi?: string | number;
	monthlyEMI?: string | number;
	applicantEmiShare?: string | number;
	role?: string;
	emiPaidBy?: string;
	[key: string]: unknown;
}

/** Company income sub-structure (ITR + GST financials) */
interface CompanyIncomeData {
	itr?: { years?: ItrYearEntry[] };
	gst?: { years?: GstYearEntry[]; currentFYTurnover?: string | number };
}

interface ItrYearEntry {
	year?: string;
	grossReceipts?: string | number;
	[key: string]: unknown;
}

interface GstYearEntry {
	year?: string;
	turnover?: string | number;
	[key: string]: unknown;
}

/** Business category entry (company applicants) */
interface BusinessCategoryEntry {
	category?: string;
	[key: string]: unknown;
}

/** Minimal applicant shape expected by findInvalidRelationships */
interface RelationshipApplicant {
	id?: string;
	gender?: string;
	age?: string | number;
	maritalStatus?: string;
	applicantType?: string;
}

// ── Types ────────────────────────────────────────────────────────

export type ContradictionCategory =
	| 'income_profile_incompatible'
	| 'relationship_invalid'
	| 'completion_stale'
	// Cross-field validation categories (Session 45)
	| 'turnover_mismatch'
	| 'credit_obligation_mismatch'
	| 'no_income_obligations'
	| 'education_profession_mismatch'
	| 'nri_income_conflict'
	| 'premises_team_mismatch'
	| 'premises_category_mismatch'
	| 'company_no_directors'
	| 'borrower_zero_income'
	| 'obligations_exceed_income'
	| 'no_primary_borrower'
	| 'emi_spouse_no_spouse'
	| 'related_directors_no_family'
	| 'guarantor_liability_missing';

/**
 * Page where the user goes to RESOLVE a contradiction. Used by per-page
 * Next-blocking logic to filter contradictions: a page only blocks Next on
 * contradictions whose pageOwnership matches the page itself. Cross-cutting
 * issues that originate from data on multiple pages should be owned by the
 * page where the user actually fixes them.
 *
 * Why this exists: previously a guarantor-related obligation issue blocked
 * Next on the Applicant Details page even though the user couldn't add the
 * guarantor obligation entry without first navigating to the Obligations page.
 * Catch-22. Now each contradiction is scoped to where it gets fixed.
 */
export type ContradictionPageOwnership =
	| 'applicantPage'
	| 'applicantProfilePage'
	| 'incomeProfilesPage'
	| 'incomeDetailsPage'
	| 'creditScorePage'
	| 'obligationsPage'
	| 'relationshipsPage';

/**
 * Maps each contradiction category to the page that owns it (where the user
 * resolves it). When adding a new category, add it here. The Next-blocking
 * logic on each form page filters contradictions through this map.
 *
 * Reasoning per row:
 *   - income_profile_incompatible: user re-selects profiles on Income Profiles page
 *   - relationship_invalid: user removes/edits relationships on Relationships page
 *   - completion_stale: side-effect of profile changes; resolved on Income Details
 *   - turnover_mismatch: company financials tab lives under Applicant page
 *   - credit_obligation_mismatch: credit score page is where CIBIL is set
 *   - no_income_obligations: user adds income or removes obligations
 *   - education_profession_mismatch: education on Applicant Profile page
 *   - nri_income_conflict: user changes income profiles when NRI
 *   - premises_team_mismatch / premises_category_mismatch: company profile under Applicant page
 *   - company_no_directors: Applicant page (company directors block)
 *   - borrower_zero_income: user adds an income profile
 *   - obligations_exceed_income: obligations page (where EMIs are entered)
 *   - no_primary_borrower: user marks Primary on Applicant page
 *   - emi_spouse_no_spouse: emiPaidBy='spouse' set on obligations page
 *   - related_directors_no_family: relationships page
 *   - guarantor_liability_missing: user adds the Guarantor obligation entry
 */
export const CONTRADICTION_PAGE_OWNERSHIP: Record<
	ContradictionCategory,
	ContradictionPageOwnership
> = {
	income_profile_incompatible: 'incomeProfilesPage',
	relationship_invalid: 'relationshipsPage',
	completion_stale: 'incomeDetailsPage',
	turnover_mismatch: 'applicantPage',
	credit_obligation_mismatch: 'creditScorePage',
	no_income_obligations: 'obligationsPage',
	education_profession_mismatch: 'applicantProfilePage',
	nri_income_conflict: 'incomeProfilesPage',
	premises_team_mismatch: 'applicantPage',
	premises_category_mismatch: 'applicantPage',
	company_no_directors: 'applicantPage',
	borrower_zero_income: 'incomeProfilesPage',
	obligations_exceed_income: 'obligationsPage',
	no_primary_borrower: 'applicantPage',
	emi_spouse_no_spouse: 'obligationsPage',
	related_directors_no_family: 'relationshipsPage',
	guarantor_liability_missing: 'obligationsPage'
};

/** Get the resolution page for a given contradiction. */
export function getContradictionPageOwnership(
	c: Contradiction
): ContradictionPageOwnership {
	return CONTRADICTION_PAGE_OWNERSHIP[c.category];
}

/**
 * Filter a contradiction list to only those owned by the given page.
 * Use at the Next-button gate on each form page to avoid blocking the user
 * with errors that belong elsewhere in the wizard.
 */
export function filterContradictionsForPage(
	contradictions: Contradiction[],
	pageId: ContradictionPageOwnership
): Contradiction[] {
	return contradictions.filter((c) => CONTRADICTION_PAGE_OWNERSHIP[c.category] === pageId);
}

export interface Contradiction {
	/** Unique ID for deduplication */
	id: string;
	/** Category of contradiction */
	category: ContradictionCategory;
	/** Error = has filled data that will be lost; Warning = selection only */
	severity: 'error' | 'warning';
	/** Applicant display name */
	applicantName: string;
	/** Applicant index in formState.applicants */
	applicantIndex: number;
	/** Human-readable explanation */
	message: string;
	/** What will be removed if user proceeds */
	affectedData: string;
	/** Whether the user can choose to keep this item despite the violation */
	keepable: boolean;
	/** Technical details */
	detail: {
		profileType?: IncomeProfileType;
		relationshipId?: string;
		/** Which validation check failed (relationship contradictions only) */
		invalidCheck?: InvalidCheck;
	};
	/** Optional fix action that can be applied to resolve this contradiction */
	fixAction?: 'detach';
	/** Applicant ID for fix actions that need to identify a specific applicant */
	applicantId?: string;
}

export interface CrossStepValidationResult {
	hasContradictions: boolean;
	contradictions: Contradiction[];
}

// ── Profile Labels ───────────────────────────────────────────────

const PROFILE_LABELS: Record<string, string> = {
	salaried_regular: 'Salaried - Regular',
	salaried_contractual: 'Salaried - Contractual',
	business_proprietorship: 'Business Owner',
	business_partnership: 'Partner in Firm',
	director_company: 'Director in Company',
	professional_practice: 'Professional Practice',
	pension: 'Pension',
	rental_income: 'Rental Income',
	freelance_consulting: 'Freelance / Consulting',
	agriculture_income: 'Agriculture Income',
	investment_income: 'Investment Income',
	no_current_income: 'No Current Income'
};

// ── Main Detection Function ──────────────────────────────────────

/**
 * Detect contradictions between applicant basic info and downstream data.
 *
 * Called from ApplicantFormSecured.nextFromAddApplicant() AFTER
 * validateStep() passes but BEFORE navigation proceeds.
 */
export function detectCrossStepContradictions(
	applicants: ApplicantRecord[],
	relationships: Relationship[]
): CrossStepValidationResult {
	const contradictions: Contradiction[] = [];

	// 1. Income profile compatibility per applicant
	for (let i = 0; i < applicants.length; i++) {
		const ap = applicants[i];
		if (!ap?.id) continue;

		// Only Individual applicants have showWhen-gated income profiles
		if (ap.applicantType === 'Company') continue;

		const incomeContradictions = detectIncomeProfileContradictions(ap, i);
		contradictions.push(...incomeContradictions);

		// Completion staleness (only if income contradictions found)
		if (incomeContradictions.length > 0 && ap.__completion === true) {
			const name = (ap.fullName as string) || `Applicant ${i + 1}`;
			contradictions.push({
				id: `completion_${ap.id}`,
				category: 'completion_stale',
				severity: 'warning',
				applicantName: name,
				applicantIndex: i,
				message: 'Income completion status will be reset due to profile changes',
				affectedData: 'Completion status reset — income details will need review',
				keepable: false,
				detail: {}
			});
		}
	}

	// 2. Relationship validity (all applicants at once)
	if (relationships.length > 0) {
		const relContradictions = detectRelationshipContradictions(applicants, relationships);
		contradictions.push(...relContradictions);
	}

	return {
		hasContradictions: contradictions.length > 0,
		contradictions
	};
}

// ── Income Profile Detection ─────────────────────────────────────

function detectIncomeProfileContradictions(
	applicant: ApplicantRecord,
	index: number
): Contradiction[] {
	const profiles = (applicant.selectedIncomeProfiles ?? []) as IncomeProfileType[];
	if (profiles.length === 0) return [];

	const contradictions: Contradiction[] = [];
	const name = (applicant.fullName as string) || `Applicant ${index + 1}`;

	// Build showWhen context from current basic info
	const context: Record<string, unknown> = {
		isNRI: applicant.isNRI ?? 'No',
		education: applicant.education ?? '',
		age: Number(applicant.age) || 0,
		onEMI: applicant.onEMI ?? false
	};

	for (const profileType of profiles) {
		const card = INCOME_PROFILE_CARDS.find((c) => c.type === profileType);
		if (!card?.showWhen) continue;

		if (!shouldShow(card.showWhen, context)) {
			// Count income entries that will be lost
			const entries = ((applicant.incomeEntries ?? []) as IncomeSourceEntry[]).filter(
				(e) => e.profileType === profileType
			);
			const entryCount = entries.length;
			const entryNames = entries
				.map((e) => e.entityName)
				.filter(Boolean)
				.join(', ');

			const label = PROFILE_LABELS[profileType] ?? profileType;

			contradictions.push({
				id: `income_${applicant.id}_${profileType}`,
				category: 'income_profile_incompatible',
				severity: entryCount > 0 ? 'error' : 'warning',
				applicantName: name,
				applicantIndex: index,
				message: buildIncomeMessage(profileType, applicant, context),
				affectedData:
					entryCount > 0
						? `${label}: ${entryCount} income source${entryCount > 1 ? 's' : ''}${entryNames ? ` (${entryNames})` : ''} will be removed`
						: `${label} profile selection will be removed`,
				keepable: false,
				detail: { profileType }
			});
		}
	}

	return contradictions;
}

function buildIncomeMessage(
	profileType: IncomeProfileType,
	applicant: ApplicantRecord,
	context: Record<string, unknown>
): string {
	const label = PROFILE_LABELS[profileType] ?? profileType;

	switch (profileType) {
		case 'professional_practice':
		case 'business_proprietorship':
		case 'business_partnership':
		case 'director_company':
		case 'agriculture_income':
			return `${label} is not available for NRI applicants`;
		case 'no_current_income':
			if (context.onEMI) return `${label} is not available for applicants on EMI`;
			return `${label} is not available for NRI applicants`;
		default:
			return `${label} is no longer compatible with the current applicant details`;
	}
}

// ── Relationship Detection ───────────────────────────────────────

function detectRelationshipContradictions(
	applicants: ApplicantRecord[],
	relationships: Relationship[]
): Contradiction[] {
	// Cast needed: findInvalidRelationships expects a specific structural type
	const invalidMap = findInvalidRelationships(applicants as RelationshipApplicant[], relationships);
	if (invalidMap.size === 0) return [];

	const contradictions: Contradiction[] = [];
	// Track which pairs we've already reported (avoid duplicate from/to entries)
	const reportedPairs = new Set<string>();

	for (const rel of relationships) {
		const reason = invalidMap.get(rel.id);
		if (!reason) continue;

		// Deduplicate reciprocal pairs
		const pairKey = [rel.fromId, rel.toId].sort().join('::');
		if (reportedPairs.has(pairKey)) continue;
		reportedPairs.add(pairKey);

		const fromAp = applicants.find((a) => a.id === rel.fromId);
		const toAp = applicants.find((a) => a.id === rel.toId);
		const fromName = (fromAp?.fullName as string) || (fromAp?.companyName as string) || 'Applicant';
		const toName = (toAp?.fullName as string) || (toAp?.companyName as string) || 'Applicant';
		const fromIndex = applicants.findIndex((a) => a.id === rel.fromId);

		contradictions.push({
			id: `rel_${rel.id}`,
			category: 'relationship_invalid',
			severity: 'warning',
			applicantName: fromName,
			applicantIndex: fromIndex >= 0 ? fromIndex : 0,
			message: `"${rel.relationType}" relationship between ${fromName} and ${toName} is no longer valid with the updated details`,
			affectedData: reason.keepable
				? `Relationship "${rel.relationType}" may need review`
				: `Relationship "${rel.relationType}" will be removed`,
			keepable: reason.keepable,
			detail: { relationshipId: rel.id, invalidCheck: reason.check }
		});
	}

	return contradictions;
}

// ── Cleanup Executor ─────────────────────────────────────────────

/**
 * Execute cleanup for detected contradictions.
 * Returns a NEW applicant array with incompatible profiles/entries removed.
 *
 * Does NOT mutate formState — caller must call replaceApplicants().
 * Relationship cleanup is separate (use getRelationshipIdsToRemove).
 */
export function executeContradictionCleanup(
	applicants: ApplicantRecord[],
	contradictions: Contradiction[]
): Record<string, any>[] {
	const newList = applicants.map((a) => ({ ...a }));

	// Collect profile types to remove per applicant index
	const profilesToRemove = new Map<number, Set<IncomeProfileType>>();
	for (const c of contradictions) {
		if (c.category === 'income_profile_incompatible' && c.detail.profileType) {
			if (!profilesToRemove.has(c.applicantIndex)) {
				profilesToRemove.set(c.applicantIndex, new Set());
			}
			profilesToRemove.get(c.applicantIndex)!.add(c.detail.profileType);
		}
	}

	// Remove incompatible profiles and their entries
	for (const [idx, profiles] of profilesToRemove) {
		const ap = newList[idx];
		const currentProfiles = (ap.selectedIncomeProfiles ?? []) as IncomeProfileType[];
		const remaining = currentProfiles.filter((p) => !profiles.has(p));
		const entries = ((ap.incomeEntries ?? []) as IncomeSourceEntry[]).filter(
			(e) => !profiles.has(e.profileType)
		);

		newList[idx] = {
			...ap,
			selectedIncomeProfiles: remaining,
			incomeEntries: entries,
			__completion: false // Reset completion — income page will re-evaluate
		};
	}

	// Reset stale completion flags (even without profile removal)
	for (const c of contradictions) {
		if (c.category === 'completion_stale' && !profilesToRemove.has(c.applicantIndex)) {
			newList[c.applicantIndex] = {
				...newList[c.applicantIndex],
				__completion: false
			};
		}
	}

	return newList;
}

/**
 * Get relationship IDs that should be removed.
 * Includes both the invalid ID and its reciprocal pair.
 */
// ══════════════════════════════════════════════════════════════════
// CROSS-FIELD VALIDATION (Session 45)
// ══════════════════════════════════════════════════════════════════
// Advisory warnings for data inconsistencies across form sections.
// Runs imperatively on Next click / modal close. Does NOT erase data.
// ══════════════════════════════════════════════════════════════════

export interface CrossFieldValidationResult {
	errors: Contradiction[];
	warnings: Contradiction[];
	all: Contradiction[];
}

/** Turnover range → upper bound mapping */
const TURNOVER_UPPER: Record<string, number> = {
	below_25l: 2500000,
	'25l_50l': 5000000,
	'50l_1cr': 10000000,
	'1cr_5cr': 50000000,
	'5cr_10cr': 100000000,
	above_10cr: Infinity
};

/** Human-readable labels for turnover category keys */
const TURNOVER_LABELS: Record<string, string> = {
	below_25l: 'Below ₹25 Lakh',
	'25l_50l': '₹25 Lakh – ₹50 Lakh',
	'50l_1cr': '₹50 Lakh – ₹1 Crore',
	'1cr_5cr': '₹1 Crore – ₹5 Crore',
	'5cr_10cr': '₹5 Crore – ₹10 Crore',
	above_10cr: 'Above ₹10 Crore'
};

// ── Tier 1: Data Integrity ──────────────────────────────────────

function detectTurnoverMismatch(ap: ApplicantRecord, idx: number): Contradiction[] {
	if (ap.applicantType !== 'Company') return [];
	const turnoverKey = ap.annualTurnover as string;
	if (!turnoverKey || !TURNOVER_UPPER[turnoverKey]) return [];
	const upperBound = TURNOVER_UPPER[turnoverKey];
	const name = (ap.companyName as string) || `Company ${idx + 1}`;

	// Use the MOST RECENT year's data — not a max/average across all history.
	// Priority: current partial FY (if entered) > most recent completed GST year > most recent ITR year.
	const ci = ap.companyIncome as CompanyIncomeData | undefined;
	const itrYears = (ci?.itr?.years ?? []) as ItrYearEntry[];
	const gstYears = (ci?.gst?.years ?? []) as GstYearEntry[];
	const currentFYTurnover = Number(ci?.gst?.currentFYTurnover) || 0;

	// itr.years is stored most-recent-first (index 0 = FY2024-25).
	// gst.years follows the same convention. Find the first non-zero entry (= most recent year).
	const recentGST = gstYears.find((y) => Number(y.turnover) > 0);
	const recentITR = itrYears.find((y) => Number(y.grossReceipts) > 0);

	const recentActual =
		currentFYTurnover > 0
			? currentFYTurnover
			: Number(recentGST?.turnover) > 0
				? Number(recentGST?.turnover)
				: Number(recentITR?.grossReceipts) > 0
					? Number(recentITR?.grossReceipts)
					: 0;

	if (recentActual === 0) return [];

	const yearLabel =
		currentFYTurnover > 0
			? 'current FY'
			: recentGST
				? recentGST.year
				: (recentITR?.year ?? 'recent year');

	if (recentActual > upperBound * 1.5) {
		const categoryLabel = TURNOVER_LABELS[turnoverKey] ?? turnoverKey.replace(/_/g, ' ');
		const upperLabel = upperBound < Infinity ? ` (max ₹${formatLakh(upperBound)})` : '';
		return [
			{
				id: `turnover_${ap.id}`,
				category: 'turnover_mismatch',
				severity: 'warning',
				applicantName: name,
				applicantIndex: idx,
				message: `Turnover category "${categoryLabel}"${upperLabel} doesn't match ${yearLabel} actual turnover of ₹${formatLakh(recentActual)}. Either update the turnover category on Case Assessment page, or correct the financial data.`,
				affectedData: 'Turnover category may need updating',
				keepable: true,
				detail: {}
			}
		];
	}
	return [];
}

function detectCreditScoreObligationMismatch(ap: ApplicantRecord, idx: number): Contradiction[] {
	// Applies to BOTH Individual and Company — companies have CIBIL scores too
	const rawScore = ap.creditScore;
	// Skip all credit-based validations if score hasn't been entered yet
	if (rawScore === '' || rawScore === undefined || rawScore === null) return [];
	const score = Number(rawScore) || 0;
	const name = (ap.fullName as string) || (ap.companyName as string) || `Applicant ${idx + 1}`;
	const results: Contradiction[] = [];

	const obligations = (ap.obligations ?? ap.tableLoanEntries ?? []) as ObligationEntry[];
	const hasObligations = obligations.length > 0;

	// No credit history but has obligations
	if ((score === -1 || score === 0) && hasObligations) {
		results.push({
			id: `credit_obl_${ap.id}`,
			category: 'credit_obligation_mismatch',
			severity: 'warning',
			applicantName: name,
			applicantIndex: idx,
			message:
				'No credit history (score -1/0) but obligations entered — lender will cross-verify with bureau',
			affectedData: 'Credit score and obligations data inconsistency',
			keepable: true,
			detail: {}
		});
	}

	// High score but declared defaulter/guarantor for default
	const creditHistoryStatus = ap.creditHistoryStatus as string;
	if (score >= 700 && (creditHistoryStatus === 'defaulter' || creditHistoryStatus === 'both')) {
		results.push({
			id: `credit_history_${ap.id}`,
			category: 'credit_obligation_mismatch',
			severity: 'warning',
			applicantName: name,
			applicantIndex: idx,
			message: `Credit score ${score} but applicant is marked as a past defaulter — bureau check will reveal this`,
			affectedData: 'Credit score inconsistent with default history',
			keepable: true,
			detail: {}
		});
	}

	// High score but active/written-off defaults or settlements
	const defaultStatus = ap.defaultSettlementStatus as string;
	if (
		score >= 700 &&
		(defaultStatus === 'SETTLED' ||
			defaultStatus === 'WRITTEN_OFF' ||
			defaultStatus === 'ACTIVE_DEFAULT')
	) {
		results.push({
			id: `credit_default_${ap.id}`,
			category: 'credit_obligation_mismatch',
			severity: 'warning',
			applicantName: name,
			applicantIndex: idx,
			message: `Credit score ${score} but "${defaultStatus === 'WRITTEN_OFF' ? 'Written off (unpaid)' : defaultStatus === 'ACTIVE_DEFAULT' ? 'Active default' : 'Settled'}" recorded — lenders will flag the mismatch`,
			affectedData: 'Credit score inconsistent with settlement/default history',
			keepable: true,
			detail: {}
		});
	}

	return results;
}

/** Minimum years implied by each yearsWithEmployer option */
const EMPLOYER_TENURE_MIN: Record<string, number> = {
	lt_6m: 0,
	'6m_1y': 0.5,
	'1_2y': 1,
	'2_5y': 2,
	gt_5y: 5
};
/** Minimum years implied by each totalExperience option */
const TOTAL_EXP_MIN: Record<string, number> = {
	lt_1y: 0,
	'1_3y': 1,
	'3_5y': 3,
	gt_5y: 5
};
/** Maximum years implied by each totalExperience option */
const TOTAL_EXP_MAX: Record<string, number> = {
	lt_1y: 1,
	'1_3y': 3,
	'3_5y': 5,
	gt_5y: Infinity
};

/**
 * Salaried: years with current employer cannot exceed total work experience.
 * Catches both definite impossibilities and suspicious mismatches.
 */
function detectEmployerTenureExperienceMismatch(ap: ApplicantRecord, idx: number): Contradiction[] {
	if (ap.applicantType === 'Company') return [];
	const entries = (ap.incomeEntries ?? []) as IncomeSourceEntry[];
	const salariedEntries = entries.filter(
		(e) => e.profileType === 'salaried_regular' || e.profileType === 'salaried_contractual'
	);
	if (salariedEntries.length === 0) return [];

	const name = (ap.fullName as string) || `Applicant ${idx + 1}`;
	const results: Contradiction[] = [];

	for (const entry of salariedEntries) {
		const s = (entry.specifics ?? {}) as Record<string, unknown>;
		const employer = s.yearsWithEmployer as string;
		const total = s.totalExperience as string;
		if (!employer || !total) continue;

		const empMin = EMPLOYER_TENURE_MIN[employer] ?? 0;
		const totalMin = TOTAL_EXP_MIN[total] ?? 0;
		const totalMax = TOTAL_EXP_MAX[total] ?? Infinity;
		const empLabel = entry.entityName ? ` (${entry.entityName})` : '';

		// Definite impossibility: employer min > total max (e.g., 5+ years at job, <3 years total)
		if (empMin > totalMax) {
			results.push({
				id: `exp_mismatch_${ap.id}_${entry.id ?? employer}`,
				category: 'income_profile_incompatible',
				severity: 'warning',
				applicantName: name,
				applicantIndex: idx,
				message: `${name}${empLabel}: employer tenure "${employer.replace(/_/g, ' ')}" exceeds total experience "${total.replace(/_/g, ' ')}" — impossible combination`,
				affectedData: 'Employer tenure vs total work experience',
				keepable: true,
				detail: {}
			});
		} else if (empMin > totalMin) {
			// Suspicious: employer minimum > total experience minimum (likely data entry error)
			results.push({
				id: `exp_suspicious_${ap.id}_${entry.id ?? employer}`,
				category: 'income_profile_incompatible',
				severity: 'warning',
				applicantName: name,
				applicantIndex: idx,
				message: `${name}${empLabel}: ${empMin}+ years with current employer but total experience starts at only ${totalMin} year${totalMin === 1 ? '' : 's'} — please verify`,
				affectedData: 'Employer tenure vs total work experience',
				keepable: true,
				detail: {}
			});
		}
	}
	return results;
}

function detectNoIncomeWithObligations(ap: ApplicantRecord, idx: number): Contradiction[] {
	if (ap.applicantType === 'Company') return [];
	const profiles = (ap.selectedIncomeProfiles ?? []) as string[];
	if (profiles.length !== 1 || profiles[0] !== 'no_current_income') return [];
	const name = (ap.fullName as string) || `Applicant ${idx + 1}`;

	const obligations = (ap.obligations ?? ap.tableLoanEntries ?? []) as ObligationEntry[];
	const hasEMI = obligations.some((o) => Number(o.emi || o.monthlyEMI || 0) > 0);
	if (!hasEMI) return [];

	return [
		{
			id: `noincome_obl_${ap.id}`,
			category: 'no_income_obligations',
			severity: 'warning',
			applicantName: name,
			applicantIndex: idx,
			message:
				'No current income but has EMI obligations — FOIR cannot be calculated. Specify who pays the EMI.',
			affectedData: 'Income vs obligations inconsistency',
			keepable: true,
			detail: {}
		}
	];
}

function detectEducationProfessionMismatch(ap: ApplicantRecord, idx: number): Contradiction[] {
	if (ap.applicantType === 'Company') return [];
	// Non-financial / KYC-only roles don't have income profiling — skip education check
	if (
		ap.applicantClassification === 'co_applicant_non_financial' ||
		ap.applicantClassification === 'non_applicant_cibil_only' ||
		ap.applicantClassification === 'guarantor_non_financial'
	)
		return [];
	const edu = ((ap.education as string) ?? '').toLowerCase();
	const profiles = (ap.selectedIncomeProfiles ?? []) as string[];
	if (!profiles.includes('professional_practice')) return [];
	const name = (ap.fullName as string) || `Applicant ${idx + 1}`;

	const lowEdu = ['below_10th', '10th', '12th', 'below 10th', '10th pass', '12th pass'];
	if (lowEdu.some((e) => edu.includes(e) || edu === e)) {
		return [
			{
				id: `edu_prof_${ap.id}`,
				category: 'education_profession_mismatch',
				severity: 'warning',
				applicantName: name,
				applicantIndex: idx,
				message: `Education "${edu}" but "Professional Practice" income selected — lenders require professional qualification for this category`,
				affectedData: 'Education level inconsistent with income profile',
				keepable: true,
				detail: {}
			}
		];
	}
	return [];
}

function detectNriIncomeConflict(ap: ApplicantRecord, idx: number): Contradiction[] {
	if (ap.applicantType === 'Company') return [];
	if (ap.isNRI !== 'Yes') return [];
	const profiles = (ap.selectedIncomeProfiles ?? []) as string[];
	const name = (ap.fullName as string) || `Applicant ${idx + 1}`;
	const results: Contradiction[] = [];

	const nriBlocked = [
		'agriculture_income',
		'business_proprietorship',
		'business_partnership',
		'director_company'
	];
	for (const p of nriBlocked) {
		if (profiles.includes(p)) {
			results.push({
				id: `nri_${ap.id}_${p}`,
				category: 'nri_income_conflict',
				severity: 'warning',
				applicantName: name,
				applicantIndex: idx,
				message: `NRI applicant with "${PROFILE_LABELS[p] || p}" income — not available for NRI applicants`,
				affectedData: `${PROFILE_LABELS[p] || p} profile not valid for NRI`,
				keepable: true,
				detail: { profileType: p as IncomeProfileType }
			});
		}
	}
	return results;
}

// ── Tier 2: Structure Consistency ───────────────────────────────

function detectHomePremisesLargeTeam(ap: ApplicantRecord, idx: number): Contradiction[] {
	if (ap.applicantType !== 'Company') return [];
	const premises = ap.businessPremises as string;
	const employees = ap.employeeCount as string;
	const name = (ap.companyName as string) || `Company ${idx + 1}`;

	if (
		(premises === 'home_based' || premises === 'no_fixed') &&
		(employees === '21_50' || employees === 'over_50')
	) {
		return [
			{
				id: `premises_team_${ap.id}`,
				category: 'premises_team_mismatch',
				severity: 'warning',
				applicantName: name,
				applicantIndex: idx,
				message: `${premises === 'home_based' ? 'Home-based' : 'No fixed premises'} business with ${employees === '21_50' ? '21-50' : '50+'} employees — lenders will question this`,
				affectedData: 'Business premises inconsistent with team size',
				keepable: true,
				detail: {}
			}
		];
	}
	return [];
}

function detectNoFixedPremisesManufacturing(ap: ApplicantRecord, idx: number): Contradiction[] {
	if (ap.applicantType !== 'Company') return [];
	const premises = ap.businessPremises as string;
	const categories = (ap.businessCategories ?? []) as BusinessCategoryEntry[];
	const name = (ap.companyName as string) || `Company ${idx + 1}`;

	const hasManufacturing = categories.some((c) => c.category === 'manufacturing');
	if ((premises === 'home_based' || premises === 'no_fixed') && hasManufacturing) {
		return [
			{
				id: `premises_mfg_${ap.id}`,
				category: 'premises_category_mismatch',
				severity: 'warning',
				applicantName: name,
				applicantIndex: idx,
				message:
					'Manufacturing business with no fixed/home-based premises — manufacturing requires physical infrastructure',
				affectedData: 'Business premises inconsistent with manufacturing category',
				keepable: true,
				detail: {}
			}
		];
	}
	return [];
}

function detectCompanyWithoutDirectors(ap: ApplicantRecord, idx: number): Contradiction[] {
	if (ap.applicantType !== 'Company') return [];
	const directors = (ap.directors ?? []) as unknown[];
	if (directors.length > 0) return [];
	const name = (ap.companyName as string) || `Company ${idx + 1}`;

	return [
		{
			id: `no_directors_${ap.id}`,
			category: 'company_no_directors',
			severity: 'warning',
			applicantName: name,
			applicantIndex: idx,
			message:
				'Company has no directors/partners — most lenders require at least one director as co-applicant',
			affectedData: 'No directors linked to company',
			keepable: true,
			detail: {}
		}
	];
}

// ── Tier 3: Lender Readiness ────────────────────────────────────
// (Dormant director links are intentionally not flagged — they let a director
// auto-reconnect when a removed company is restored.)

function detectBorrowerZeroIncome(ap: ApplicantRecord, idx: number): Contradiction[] {
	if (ap.applicantType === 'Company') return [];

	// 6-way classification check (takes precedence when available)
	const classification = ap.applicantClassification as string | undefined;
	if (classification) {
		// Non-financial / KYC-only roles don't need income — skip the check
		if (
			classification === 'co_applicant_non_financial' ||
			classification === 'non_applicant_cibil_only' ||
			classification === 'guarantor_non_financial'
		) {
			return [];
		}
		// Financial roles (co_applicant_financial + guarantor_financial + non_applicant_full_financial) need income
		// Fall through to the income check below
	} else {
		// Legacy path: use onEMI/onProperty flags
		const onProp = ap.onProperty === true;
		const onEMI = ap.onEMI === true;
		if (!onProp && !onEMI) return []; // not on loan at all

		// onProperty-only co-applicants (not on EMI) don't need income —
		// they're on the title for security, not liable for repayment.
		if (!onEMI) return [];
	}

	const name = (ap.fullName as string) || `Applicant ${idx + 1}`;

	const profiles = (ap.selectedIncomeProfiles ?? []) as string[];
	if (profiles.length === 0 || (profiles.length === 1 && profiles[0] === 'no_current_income')) {
		const isIndependentAssessment =
			classification === 'guarantor_financial' || classification === 'non_applicant_full_financial';
		return [
			{
				id: `borrower_noincome_${ap.id}`,
				category: 'borrower_zero_income',
				severity: 'warning',
				applicantName: name,
				applicantIndex: idx,
				message: isIndependentAssessment
					? `${classification === 'non_applicant_full_financial' ? 'Non-Applicant (Full Financial)' : 'Financial Guarantor'} has no income sources — independent assessment cannot be completed`
					: 'Applicant is on EMI but has no income sources — eligibility cannot be calculated',
				affectedData: isIndependentAssessment
					? 'Independent assessment without income'
					: 'Co-applicant on EMI without income',
				keepable: true,
				detail: {}
			}
		];
	}
	return [];
}

/**
 * Cross-check: if applicant claims to be guarantor on another loan,
 * there must be at least one obligation entry with role='guarantor'.
 * CIBIL will reveal this — if missing, the lender will question the discrepancy.
 *
 * Only fires once the user has reached the Obligations page (`ObligationsRunning`
 * answered). Before that, the obligations array is naturally empty and flagging
 * the missing entry would block the user from ever navigating to the page where
 * they'd add it. Detected 2026-05-02 (Applicant Details Next blocked by this).
 */
function detectGuarantorLiabilityMissing(ap: ApplicantRecord, idx: number): Contradiction[] {
	if (ap.isGuarantorOnOtherLoan !== 'Yes') return [];

	// User hasn't reached the obligations page yet — defer the check.
	if (ap.ObligationsRunning === undefined || ap.ObligationsRunning === '') return [];

	const obligations = (ap.obligations ?? ap.tableLoanEntries ?? []) as ObligationEntry[];
	const hasGuarantorEntry = obligations.some((o) => o.role === 'guarantor');

	if (!hasGuarantorEntry) {
		const name = (ap.fullName as string) || `Applicant ${idx + 1}`;
		return [
			{
				id: `guarantor_liability_missing_${ap.id}`,
				category: 'guarantor_liability_missing',
				severity: 'error',
				applicantName: name,
				applicantIndex: idx,
				message:
					'You indicated this person is a guarantor on another loan, but no obligation with "Guarantor" role is listed',
				affectedData: 'Add the guaranteed loan as an obligation with role set to Guarantor',
				keepable: false,
				detail: {}
			}
		];
	}
	return [];
}

function detectObligationsExceedIncome(ap: ApplicantRecord, idx: number): Contradiction[] {
	if (ap.applicantType === 'Company') return [];
	const name = (ap.fullName as string) || `Applicant ${idx + 1}`;

	// Sum all obligation EMIs
	const obligations = (ap.obligations ?? ap.tableLoanEntries ?? []) as ObligationEntry[];
	const totalEMI = obligations.reduce((sum: number, o) => {
		return sum + Number(o.applicantEmiShare || o.emi || o.monthlyEMI || 0);
	}, 0);
	if (totalEMI <= 0) return [];

	// Sum all income entries (rough monthly)
	// Entries may have flat income fields (legacy) or nested .income structure — access loosely
	const entries = (ap.incomeEntries ?? []) as Record<string, unknown>[];
	const totalIncome = entries.reduce((sum: number, e: Record<string, unknown>) => {
		const monthly = Number(e.grossMonthlySalary || e.monthlyIncome || e.netMonthlyIncome || 0);
		return sum + monthly;
	}, 0);
	if (totalIncome <= 0) return []; // can't compare without income data

	if (totalEMI > totalIncome) {
		return [
			{
				id: `emi_exceeds_${ap.id}`,
				category: 'obligations_exceed_income',
				severity: 'warning',
				applicantName: name,
				applicantIndex: idx,
				message: `Monthly obligations (₹${formatLakh(totalEMI)}) exceed declared income (₹${formatLakh(totalIncome)}) — FOIR over 100%`,
				affectedData: 'Obligations exceed income capacity',
				keepable: true,
				detail: {}
			}
		];
	}
	return [];
}

function detectNoPrimaryBorrower(
	applicants: ApplicantRecord[],
	applicationData?: ApplicantRecord
): Contradiction[] {
	if (applicants.length <= 1) return [];
	// onProperty/onEMI roles only apply to secured loans (home, LAP, plot)
	const loanName = ((applicationData?.loanName as string) ?? '').toLowerCase();
	const isSecured =
		loanName.includes('home') ||
		loanName.includes('lap') ||
		loanName.includes('plot') ||
		loanName.includes('mortgage');
	if (!isSecured) return [];
	const hasPrimary = applicants.some(
		(a) => a.applicantType !== 'Company' && a.onProperty === true && a.onEMI === true
	);
	if (hasPrimary) return [];

	return [
		{
			id: 'no_primary_borrower',
			category: 'no_primary_borrower',
			severity: 'warning',
			applicantName: 'All Applicants',
			applicantIndex: -1,
			message:
				'No applicant is both on property and on EMI — at least one primary borrower expected for multi-applicant cases',
			affectedData: 'Missing primary borrower role',
			keepable: true,
			detail: {}
		}
	];
}

function detectEmiPaidBySpouseNoSpouse(ap: ApplicantRecord, idx: number): Contradiction[] {
	if (ap.applicantType === 'Company') return [];
	const name = (ap.fullName as string) || `Applicant ${idx + 1}`;
	const marital = ((ap.maritalStatus as string) ?? '').toLowerCase();
	const obligations = (ap.obligations ?? ap.tableLoanEntries ?? []) as ObligationEntry[];

	const hasSpousePayment = obligations.some(
		(o) => ((o.emiPaidBy as string) ?? '').toLowerCase() === 'spouse'
	);
	if (!hasSpousePayment) return [];

	if (marital === 'single' || marital === 'divorced' || marital === 'widowed') {
		return [
			{
				id: `spouse_emi_${ap.id}`,
				category: 'emi_spouse_no_spouse',
				severity: 'warning',
				applicantName: name,
				applicantIndex: idx,
				message: `EMI marked as "paid by spouse" but marital status is "${marital}" — no spouse available`,
				affectedData: 'EMI payment source inconsistent with marital status',
				keepable: true,
				detail: {}
			}
		];
	}
	return [];
}

// detectRelatedDirectorsNoFamily removed — hasRelatedDirectors is now auto-derived
// from the relationship page. The question is no longer asked directly, so the
// forward sync warning is no longer needed.

// ── Format Helper ───────────────────────────────────────────────

function formatLakh(value: number): string {
	if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
	if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
	return value.toLocaleString('en-IN');
}

// ── Orchestrator ────────────────────────────────────────────────

/**
 * Run all cross-field validation rules across all applicants.
 * Returns errors (block) and warnings (advisory banner).
 * Does NOT modify any data — pure read-only.
 */
export function runCrossFieldValidation(
	applicants: ApplicantRecord[],
	_applicationData?: ApplicantRecord,
	relationships?: Relationship[]
): CrossFieldValidationResult {
	const all: Contradiction[] = [];
	const rels = relationships ?? [];

	for (let i = 0; i < applicants.length; i++) {
		const ap = applicants[i];
		if (!ap?.id) continue;
		if (ap.applicantType === 'Individual') {
			all.push(...detectCreditScoreObligationMismatch(ap, i));
			all.push(...detectEmployerTenureExperienceMismatch(ap, i));
			all.push(...detectNoIncomeWithObligations(ap, i));
			all.push(...detectEducationProfessionMismatch(ap, i));
			all.push(...detectNriIncomeConflict(ap, i));
			all.push(...detectBorrowerZeroIncome(ap, i));
			all.push(...detectObligationsExceedIncome(ap, i));
			all.push(...detectEmiPaidBySpouseNoSpouse(ap, i));
			all.push(...detectGuarantorLiabilityMissing(ap, i));
		}
		if (ap.applicantType === 'Company') {
			all.push(...detectCreditScoreObligationMismatch(ap, i)); // Companies have CIBIL too
			all.push(...detectTurnoverMismatch(ap, i));
			all.push(...detectHomePremisesLargeTeam(ap, i));
			all.push(...detectNoFixedPremisesManufacturing(ap, i));
			all.push(...detectCompanyWithoutDirectors(ap, i));
			// detectRelatedDirectorsNoFamily removed — auto-derived from relationship page
		}
	}

	// Cross-applicant checks
	all.push(...detectNoPrimaryBorrower(applicants, _applicationData));

	// NBFC HFC single-applicant advisory — SECURED LOANS ONLY.
	//
	// PITFALL (2026-05-28): this warning previously fired on every UNSECURED
	// loan (Business / Personal / Professional) with a single non-Company
	// applicant, which was the inverse of the business intent. NBFC HFCs
	// (Home Loan / LAP / Plot Loan financiers) are the real population that
	// prefers ≥2 applicants for risk diversification on secured mortgages.
	// Unsecured NBFCs do not enforce this — single-applicant unsecured cases
	// are normal. Fixed to fire only on the secured-loan family.
	//
	// Skip the warning when the sole applicant is a Company: a company is its
	// own legal entity (Pvt Ltd / OPC / Partnership / LLP applying for a
	// secured loan) and doesn't need a personal co-applicant for the HFC.
	const rawLoanName = (_applicationData?.loanName as string) ?? '';
	const securedLoanNames = new Set(['home loan', 'loan against property', 'plot loan']);
	const isSecuredLoan = securedLoanNames.has(rawLoanName.trim().toLowerCase());
	const onlyApplicantIsCompany =
		applicants.length === 1 && applicants[0]?.applicantType === 'Company';
	if (isSecuredLoan && applicants.length === 1 && !onlyApplicantIsCompany) {
		all.push({
			id: 'nbfc_min_applicant',
			category: 'borrower_zero_income' as ContradictionCategory, // reuse category (advisory)
			severity: 'warning',
			applicantName: '',
			applicantIndex: -1,
			message:
				'Many HFCs and NBFCs prefer at least 2 applicants on secured loans for risk diversification. Adding a spouse or family co-applicant can improve approval odds and unlock better pricing.',
			affectedData: 'Single applicant — some HFCs/NBFCs may decline or quote at a premium',
			keepable: true,
			detail: {}
		});
	}

	// Single-guarantor rule (SECURED LOANS ONLY).
	//
	// PITFALL (2026-05-28): A loan can have AT MOST ONE guarantor. On secured
	// loans the guarantor role is auto-derived from `onEMI === false &&
	// onProperty === false` (see applicantRoleUtils.deriveIndividualClassification
	// line ~448). If two or more applicants both have that combination, the
	// case effectively has multiple guarantors — which no lender's policy
	// supports under our v1 design. Block submit with an error so the DSA
	// fixes it before reaching the rule engine.
	//
	// Each duplicate guarantor (the 2nd, 3rd, ...) is flagged individually
	// so the UI can highlight the specific applicants the DSA needs to
	// reclassify. The first onEMI=No+onProperty=No applicant is left alone
	// (it's the legitimate single guarantor).
	//
	// Unsecured loans use a different role-picker mechanism — defer their
	// equivalent validation to the v1 guarantor-assessment implementation.
	// See docs/specs/GUARANTOR-ELIGIBILITY-ASSESSMENT-SPEC.md.
	if (isSecuredLoan) {
		const guarantorIndices: number[] = [];
		for (let i = 0; i < applicants.length; i++) {
			const ap = applicants[i];
			if (!ap || ap.applicantType === 'Company') continue;
			// Normalize across boolean / 'Yes'-'No' string storage formats.
			const norm = (v: unknown): boolean | undefined => {
				if (typeof v === 'boolean') return v;
				if (v === 'Yes' || v === 'yes' || v === true) return true;
				if (v === 'No' || v === 'no' || v === false) return false;
				return undefined;
			};
			const onEmi = norm(ap.onEMI);
			const onProp = norm(ap.onProperty);
			if (onEmi === false && onProp === false) {
				guarantorIndices.push(i);
			}
		}
		if (guarantorIndices.length >= 2) {
			// Flag every duplicate beyond the first
			for (let k = 1; k < guarantorIndices.length; k++) {
				const idx = guarantorIndices[k];
				const ap = applicants[idx];
				const name =
					(ap?.fullName as string) || (ap?.companyName as string) || `Applicant ${idx + 1}`;
				all.push({
					id: 'multiple_guarantors',
					category: 'borrower_zero_income' as ContradictionCategory,
					severity: 'error',
					applicantName: name,
					applicantIndex: idx,
					message:
						'A loan can have only one guarantor. ' +
						`${name} is marked with "Not on EMI" and "Not on Property", ` +
						'which makes them a second guarantor. Set "On EMI" or "On Property" ' +
						'to Yes for this applicant, or remove the existing guarantor first.',
					affectedData: 'onEMI / onProperty flags',
					keepable: false,
					detail: {}
				});
			}
		}
	}

	return {
		errors: all.filter((c) => c.severity === 'error'),
		warnings: all.filter((c) => c.severity === 'warning'),
		all
	};
}

export function getRelationshipIdsToRemove(
	contradictions: Contradiction[],
	relationships: Relationship[]
): Set<string> {
	const ids = new Set<string>();

	for (const c of contradictions) {
		if (c.category === 'relationship_invalid' && c.detail.relationshipId) {
			const rel = relationships.find((r) => r.id === c.detail.relationshipId);
			if (!rel) continue;

			// Add the invalid relationship
			ids.add(rel.id);

			// Also add its reciprocal pair
			const reciprocal = relationships.find(
				(r) => r.id !== rel.id && r.fromId === rel.toId && r.toId === rel.fromId
			);
			if (reciprocal) {
				ids.add(reciprocal.id);
			}
		}
	}

	return ids;
}
