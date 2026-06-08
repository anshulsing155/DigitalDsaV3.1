/**
 * Applicant Role Derivation Utilities
 * ═══════════════════════════════════════════════════════════════════
 * Derives applicant roles from onProperty/onEMI inputs.
 *
 * Business rules:
 *   - Individuals: onProperty OR onEMI → lender treats as liable → BORROWER
 *     (lenders don't let individuals be separate from loan obligation)
 *   - Companies: onProperty=Y + onEMI=N → COLLATERAL (different from individuals)
 *   - Directors: overlay based on isCoApplicant + stake %
 * ═══════════════════════════════════════════════════════════════════
 */

export type ApplicantDerivedRole =
	| 'borrower'
	| 'collateral'
	| 'cibil_only'
	| 'not_on_loan'
	| 'pending';

// ── Individual Role ──────────────────────────────────────────────
// For individuals: any involvement (property OR EMI) = BORROWER
// Lenders make property owners liable regardless of EMI preference
export function deriveIndividualRole(onProperty?: boolean, onEMI?: boolean): ApplicantDerivedRole {
	if (onProperty === true || onEMI === true) return 'borrower';
	if (onProperty === false && onEMI === false) return 'not_on_loan';
	return 'pending';
}

// ── Company Role ─────────────────────────────────────────────────
// Companies CAN be collateral-only (onProperty=Y, onEMI=N)
// Companies with both=No are added for full financial verification
// (family-owned entity, lender needs P&L/ITR/balance sheet).
// Full financials are ALWAYS required regardless of flags.
export function deriveCompanyRole(onProperty?: boolean, onEMI?: boolean): ApplicantDerivedRole {
	if (onEMI === true) return 'borrower';
	if (onProperty === true) return 'collateral';
	// Both=No: validation prevents this for Companies (must be on Property or EMI).
	// If reached, treat as not_on_loan — DSA should add people as Individuals instead.
	if (onProperty === false && onEMI === false) return 'not_on_loan';
	return 'pending';
}

// ── Generic Derivation ───────────────────────────────────────────
// Convenience wrapper that picks the right function based on type.
// For linked directors (linkedCompanyId set) not on EMI/Property → cibil_only.
export function deriveApplicantRole(
	applicantType: 'Individual' | 'Company' | string,
	onProperty?: boolean,
	onEMI?: boolean,
	linkedCompanyId?: string
): ApplicantDerivedRole {
	if (applicantType === 'Company') return deriveCompanyRole(onProperty, onEMI);
	const individualRole = deriveIndividualRole(onProperty, onEMI);
	// Linked directors not on EMI/Property → cibil_only (CIBIL + conditional obligations)
	if (linkedCompanyId && individualRole === 'not_on_loan') return 'cibil_only';
	return individualRole;
}

// ── Labels & Colors ──────────────────────────────────────────────
export function getRoleLabel(role: ApplicantDerivedRole): string {
	switch (role) {
		case 'borrower':
			return 'Borrower';
		case 'collateral':
			return 'Collateral';
		case 'cibil_only':
			return 'CIBIL Only';
		case 'not_on_loan':
			return '';
		case 'pending':
			return '';
	}
}

export function getRoleBadgeColor(role: ApplicantDerivedRole): string {
	switch (role) {
		case 'borrower':
			return 'green';
		case 'collateral':
			return 'amber';
		default:
			return 'gray';
	}
}

// ── Data Collection Requirements ─────────────────────────────────
export function needsFullFinancials(role: ApplicantDerivedRole): boolean {
	return role === 'borrower';
}

export function needsCreditOnly(role: ApplicantDerivedRole): boolean {
	return role === 'collateral' || role === 'cibil_only';
}

// ── Tab Requirements ─────────────────────────────────────────────
// Returns which income tab IDs are required for this role.
// BORROWER → all tabs (full income assessment)
// COLLATERAL → profile + credit score only (for lender CIBIL check)
// CIBIL_ONLY → credit score only (obligations added dynamically if CIBIL < 725)
// NOT_ON_LOAN / PENDING → empty (skip)
export function getRequiredTabs(role: ApplicantDerivedRole, creditScore?: number): string[] {
	switch (role) {
		case 'borrower':
			return [
				'profile',
				'income_profiles',
				'income_details',
				'credit_score',
				'obligations_details'
			];
		case 'collateral':
			return ['profile', 'credit_score'];
		case 'cibil_only': {
			const tabs = ['credit_score'];
			// If CIBIL score is entered and below 725, also require obligations
			if (creditScore !== undefined && creditScore >= 300 && creditScore < 725) {
				tabs.push('obligations_details');
			}
			return tabs;
		}
		default:
			return [];
	}
}

/** CIBIL threshold below which obligation details are required for cibil_only directors */
export const CIBIL_OBLIGATION_THRESHOLD = 725;

// ── Private Limited Director Detection ──────────────────────────
// Company types where directors get role-based assessment (unsecured loans).
// Partners in Partnership/LLP/OPC always need full financial assessment.
// OPC has a single director who is always the beneficial owner — full profiling required.
const ROLE_BASED_COMPANY_TYPES = ['Private Limited'];

// ── Stake thresholds ────────────────────────────────────────────
// TWO constants below — both equal 20 today, but they're semantically distinct
// rules and MUST stay separately named to prevent a future "normalize the
// operators" PR from silently merging them. Always pair each constant with
// the documented operator (`>` vs `>=`).

/**
 * Threshold above which a director's stake fully overrides their chosen
 * loanRole — they're treated as 'borrower' (full financials required)
 * regardless of what role they (or the form's auto-default) picked.
 *
 * **Always used with strict `>`** — at exactly 20% the override does NOT
 * kick in (the director's chosen role is honored). This is a business
 * rule, not a statutory one: a director with 20% stake is on the boundary,
 * not beyond it. P16 (2026-05-25) aligned the frontend `> 25` hardcodes
 * to this constant so the UI matches the rule engine.
 */
export const STAKE_FULL_FINANCIALS_THRESHOLD = 20;

/**
 * Income Tax Act §2(32) "substantial interest" definition: a person holding
 * 20% or more of the equity is deemed to have substantial interest in the
 * company. Used by the 6-way applicant classification to decide whether to
 * capture full personal financials (for related-party fraud / validation
 * checks, not for eligibility pooling).
 *
 * **Always used with `>=`** — at exactly 20% the rule applies. This is a
 * statutory definition — do NOT change the value or operator without legal
 * review. If RBI / IT Act amends the threshold (e.g., to 25%), only this
 * constant should change; `STAKE_FULL_FINANCIALS_THRESHOLD` is a separate
 * business rule that may not move in lockstep.
 *
 * Same numeric value as `STAKE_FULL_FINANCIALS_THRESHOLD` today by coincidence.
 * The two answer different questions — see the comments above each use site.
 */
export const STAKE_SUBSTANTIAL_INTEREST_THRESHOLD = 20;

/**
 * For unsecured loans: derive a linked director's role based on entity type,
 * stake %, and chosen loanRole.
 *
 * Priority:
 *   1. ownershipPercent > STAKE_FULL_FINANCIALS_THRESHOLD (20%) → 'borrower' (always, regardless of loanRole)
 *   2. Partnership/LLP/Trust → undefined (full assessment — no role override)
 *   3. PvtLtd/OPC + co_borrower → 'borrower'
 *   4. PvtLtd/OPC + guarantor → 'cibil_only'
 *   5. PvtLtd/OPC + information_only → 'collateral'
 *   6. PvtLtd/OPC + no loanRole (backward compat) → 'collateral'
 */
export function deriveUnsecuredDirectorRole(
	applicant: Record<string, unknown>,
	allApplicants: Record<string, unknown>[]
): ApplicantDerivedRole | undefined {
	const linkedCompanyId = applicant.linkedCompanyId as string | undefined;
	if (!linkedCompanyId) return undefined;

	const parentCompany = allApplicants.find((a) => a.id === linkedCompanyId);
	if (!parentCompany) return undefined;

	const ownershipPercent = Number(applicant.ownershipPercent) || 0;

	// 1. > threshold (20%) stake → always full financials (borrower)
	if (ownershipPercent > STAKE_FULL_FINANCIALS_THRESHOLD) {
		return 'borrower';
	}

	const companyType = parentCompany.companyType as string;

	// 2. Partnership/LLP/Trust → full assessment (no role override)
	if (!ROLE_BASED_COMPANY_TYPES.includes(companyType)) {
		return undefined;
	}

	// 3-6. PvtLtd/OPC → role-based assessment
	const loanRole = (applicant.loanRole as string) || '';
	switch (loanRole) {
		case 'co_borrower':
			return 'borrower';
		case 'guarantor':
			return 'cibil_only';
		case 'information_only':
			return 'collateral';
		default:
			return 'collateral'; // Backward compat: no role = Profile + CIBIL only
	}
}

// ── Family-Aware Director Role Derivation ────────────────────────
// Enhanced version of deriveUnsecuredDirectorRole that factors in family
// cluster membership. When a director belongs to a family cluster with
// HIGH or MEDIUM dominance, they get 'borrower' (full financials) regardless
// of their chosen loanRole — because lenders treat family-controlled
// companies differently.
import type { FamilyControlResult } from '$lib/types/form';
import type { RelationshipCategory } from '$lib/components/relationship-capture/types';

export function deriveUnsecuredDirectorRoleWithFamily(
	applicant: Record<string, unknown>,
	allApplicants: Record<string, unknown>[],
	familyControlMap?: Map<string, FamilyControlResult>
): ApplicantDerivedRole | undefined {
	const linkedCompanyId = applicant.linkedCompanyId as string | undefined;
	if (!linkedCompanyId) return undefined;

	const parentCompany = allApplicants.find((a) => a.id === linkedCompanyId);
	if (!parentCompany) return undefined;

	const ownershipPercent = Number(applicant.ownershipPercent) || 0;

	// 1. > threshold (20%) stake → always full financials
	if (ownershipPercent > STAKE_FULL_FINANCIALS_THRESHOLD) {
		return 'borrower';
	}

	// 2. Family cluster member with HIGH/MEDIUM dominance → borrower
	if (familyControlMap) {
		const familyResult = familyControlMap.get(linkedCompanyId);
		if (
			familyResult &&
			(familyResult.familyDominance === 'HIGH' || familyResult.familyDominance === 'MEDIUM')
		) {
			const applicantId = applicant.id as string;
			if (familyResult.familyClusterIds.includes(applicantId)) {
				return 'borrower';
			}
		}
	}

	const companyType = parentCompany.companyType as string;

	// 3. Partnership/LLP/Trust → full assessment (no role override)
	if (!ROLE_BASED_COMPANY_TYPES.includes(companyType)) {
		return undefined;
	}

	// 4-7. PvtLtd/OPC → role-based assessment
	const loanRole = (applicant.loanRole as string) || '';
	switch (loanRole) {
		case 'co_borrower':
			return 'borrower';
		case 'guarantor':
			return 'cibil_only';
		case 'information_only':
			return 'collateral';
		default:
			return 'collateral';
	}
}

// ── Director Skip Logic ──────────────────────────────────────────
// Returns true when a director can be auto-completed (all tabs skipped).
// Conditions: totalDirectors > 4, non-family member, stake ≤ STAKE_FULL_FINANCIALS_THRESHOLD (20%),
// and role = information_only. This reduces DSA workload for large
// companies where minor non-family directors don't affect assessment.
/** Minimum director count before skip logic activates */
export const SKIP_MINOR_DIRECTOR_THRESHOLD = 4;

export function isDirectorSkippable(
	applicant: Record<string, unknown>,
	allApplicants: Record<string, unknown>[],
	familyControlMap?: Map<string, FamilyControlResult>
): boolean {
	const linkedCompanyId = applicant.linkedCompanyId as string | undefined;
	if (!linkedCompanyId) return false;

	const parentCompany = allApplicants.find((a) => a.id === linkedCompanyId);
	if (!parentCompany) return false;

	// Count directors linked to this company
	const totalDirectors = allApplicants.filter(
		(a) => a.linkedCompanyId === linkedCompanyId && a.applicantType === 'Individual'
	).length;

	// Only skip when there are more than 4 directors
	if (totalDirectors <= SKIP_MINOR_DIRECTOR_THRESHOLD) return false;

	// Must have information_only role
	const loanRole = (applicant.loanRole as string) || '';
	if (loanRole !== 'information_only') return false;

	// Must have ≤ STAKE_FULL_FINANCIALS_THRESHOLD (20%) stake
	const ownershipPercent = Number(applicant.ownershipPercent) || 0;
	if (ownershipPercent > STAKE_FULL_FINANCIALS_THRESHOLD) return false;

	// Must NOT be a family cluster member
	if (familyControlMap) {
		const familyResult = familyControlMap.get(linkedCompanyId);
		if (familyResult) {
			const applicantId = applicant.id as string;
			if (familyResult.familyClusterIds.includes(applicantId)) {
				return false; // Family member — cannot skip
			}
		}
	}

	return true;
}

// ═════════════════════════════════════════════════════════════════════
// 6-WAY APPLICANT CLASSIFICATION
// ═════════════════════════════════════════════════════════════════════
//
// "Financial" = liable for EMI repayment → full assessment.
// "Non-Financial" = not on EMI → profile + CIBIL + conditional obligations.
//
// 4 auto-derived + 2 new non-applicant types:
//   co_applicant_financial       — on EMI, full assessment
//   co_applicant_non_financial   — on property only, profile + CIBIL
//   guarantor_financial          — independent financial assessment
//   non_applicant_full_financial — family Both=No, lender needs full verification
//   non_applicant_cibil_only     — non-family Both=No, just KYC + CIBIL check
//
// DSA override only (not auto-derived):
//   guarantor_non_financial      — police/defense/lawyer guarantor, profile only
//
// This system overlays the existing ApplicantDerivedRole. The bridge
// function classificationToLegacyRole() maps new→old so nothing
// downstream breaks until Phase 2 wires classification directly.
// ═════════════════════════════════════════════════════════════════════

export type ApplicantClassification =
	| 'co_applicant_financial'
	| 'co_applicant_non_financial'
	| 'guarantor_financial'
	| 'non_applicant_full_financial'
	| 'non_applicant_cibil_only'
	| 'guarantor_non_financial';

// ── Classification Input ────────────────────────────────────────

export interface ClassificationInput {
	/** Is this a secured loan (Home/LAP/Plot) with onEMI/onProperty questions? */
	isSecuredLoan: boolean;
	/** On EMI flag (secured loans only) */
	onEMI?: boolean;
	/** On property title flag (secured loans only) */
	onProperty?: boolean;
	/** Is this person a family member of another applicant? */
	isFamilyMember?: boolean;
	/** DSA manual override — takes precedence over auto-derivation */
	dsaOverride?: ApplicantClassification;
	/** For company directors: entity type (Partnership, PvtLtd, OPC, etc.) */
	companyType?: string;
	/** For company directors: individual ownership stake percentage */
	ownershipPercent?: number;
	/** For company directors: combined stake of ALL family members in this company.
	 *  When individual stake is <20% but combined family stake is ≥20%,
	 *  the director gets elevated classification (non_applicant_full_financial). */
	combinedFamilyStake?: number;
	/** Loan category — Professional Loan directors are non-financial co-applicants */
	loanCategory?: string;
	/** For unsecured PvtLtd directors: their chosen role (co_borrower/guarantor/information_only) */
	loanRole?: string;
}

// ── Company types where ALL directors are always co_applicant_financial ──
// In these entities, the partners/directors ARE the business.
const ALWAYS_FINANCIAL_COMPANY_TYPES = [
	'Sole Proprietorship',
	'Partnership Firm',
	'One Person Company (OPC)',
	'LLP'
];

// ── Auto-Derivation ─────────────────────────────────────────────

/**
 * Derive the 6-way classification from applicant flags + context.
 *
 * Rules (in priority order):
 *   1. Company directors: entity-specific rules (stake + family + flags)
 *   2. Secured: onEMI=Yes → financial, onProperty only → non-financial,
 *      Both=No → guarantor_financial
 *   3. Unsecured: default co_applicant_financial
 *
 * No "primary applicant" concept — all applicants classified by flags.
 */
export function deriveApplicantClassification(input: ClassificationInput): ApplicantClassification {
	// Classification is fully auto-derived from onEMI/onProperty + family status.
	// No "primary applicant" concept — all applicants are co-applicants,
	// classified equally by their actual flags.

	// 1. Company director rules (when companyType is provided)
	if (input.companyType) {
		return deriveDirectorClassification(input);
	}

	// 4. Secured loans — use onEMI/onProperty flags
	if (input.isSecuredLoan) {
		return deriveSecuredClassification(input);
	}

	// 5. Unsecured loans — default financial, no flags to check
	return 'co_applicant_financial';
}

/** Secured loan classification for standalone Individuals (not directors) */
function deriveSecuredClassification(input: ClassificationInput): ApplicantClassification {
	const { onEMI, onProperty } = input;

	// On EMI → financially liable → co_applicant_financial
	if (onEMI === true) return 'co_applicant_financial';

	// On property only (not on EMI) → non-financial co-applicant
	if (onProperty === true) return 'co_applicant_non_financial';

	// Both=No → this person is a guarantor (not on property, not on EMI).
	// Two reasons someone is added as guarantor:
	//   1. Financial support — backing low-CIBIL co-applicants (most common)
	//   2. Recovery leverage — police/defense profiles (advisory shown separately)
	// Default: guarantor_financial (full financials needed).
	// Police/defense advisory via getGuarantorAdvisory() is a separate UI hint.
	if (onEMI === false && onProperty === false) {
		return 'guarantor_financial';
	}

	// Flags not yet answered → default to financial (most common)
	return 'co_applicant_financial';
}

/** Company director classification: entity type + stake + flags */
function deriveDirectorClassification(input: ClassificationInput): ApplicantClassification {
	const {
		companyType,
		ownershipPercent = 0,
		combinedFamilyStake = 0,
		onEMI,
		onProperty,
		isFamilyMember,
		isSecuredLoan,
		loanRole
	} = input;

	// Sole Proprietorship: the proprietor IS the business entity — their financials
	// ARE the eligibility basis, so they pool. (True for both secured and unsecured.)
	if (companyType === 'Sole Proprietorship') {
		return 'co_applicant_financial';
	}

	// ── Unsecured company directors/partners (Business + Professional Loan) ──
	// Owner rule (2026-05-22, ADR-0012): a company business/professional loan is
	// sized ENTIRELY on the company entity's income / obligations / CIBIL. Directors
	// and partners NEVER pool into eligibility — their personal financials, when
	// captured, are used only for income validation and fraud checks. onEMI/onProperty
	// are meaningless on this path (no property; the firm pays the EMI), so the
	// split is driven purely by stake and family:
	//   • ≥20% individual stake (substantial interest, IT Act §2(32)) OR any family
	//     member → non_applicant_full_financial: full personal financials captured
	//     for validation/fraud, assessed independently, income NOT pooled.
	//   • <20% AND non-family → co_applicant_non_financial: on the loan (liable),
	//     KYC + CIBIL only, no income assessment.
	// An explicit guarantor designation is preserved as a separate, non-pooled role.
	if (!isSecuredLoan) {
		if (loanRole === 'guarantor') return 'guarantor_financial';

		// Effective stake: own stake, elevated to the combined family stake for a
		// family member (e.g. three relatives at 10% each = 30% family control).
		const effectiveStake =
			isFamilyMember === true ? Math.max(ownershipPercent, combinedFamilyStake) : ownershipPercent;

		// IT Act §2(32) "substantial interest" rule — must use `>=` (statutory).
		if (effectiveStake >= STAKE_SUBSTANTIAL_INTEREST_THRESHOLD || isFamilyMember === true) {
			return 'non_applicant_full_financial';
		}
		return 'co_applicant_non_financial';
	}

	// ── Secured loans (Home/LAP/Plot): UNCHANGED ──
	// Sole Prop / Partnership / OPC / LLP → always financial
	if (companyType && ALWAYS_FINANCIAL_COMPANY_TYPES.includes(companyType)) {
		return 'co_applicant_financial';
	}

	// Private Limited (secured): directors on the loan are ALWAYS full financial.
	// Unlike standalone Individuals, directors are stakeholders in the company —
	// lenders always need their full financials regardless of which flag is set.
	if (onEMI === true || onProperty === true) return 'co_applicant_financial';

	// Both=No for PvtLtd directors — use effective stake (individual OR combined family)
	if (onEMI === false && onProperty === false) {
		// Effective stake: individual stake, or combined family stake if higher.
		// Example: 3 family members with 10% each → combined 30% ≥ 20% threshold.
		// All family members get elevated classification, not just those with individual ≥20%.
		const effectiveStake = isFamilyMember
			? Math.max(ownershipPercent, combinedFamilyStake)
			: ownershipPercent;

		// Family + effective stake ≥20% → co_applicant_financial (full participant).
		// When the family controls the company that's on the loan, lenders treat
		// ALL family directors as financially liable regardless of individual flags.
		// `>=` here applies the same IT Act §2(32) substantial-interest semantics.
		if (effectiveStake >= STAKE_SUBSTANTIAL_INTEREST_THRESHOLD && isFamilyMember === true) {
			return 'co_applicant_financial';
		}
		// Non-family + significant individual stake → financial guarantor.
		// `>=` applies the IT Act §2(32) substantial-interest semantics.
		if (ownershipPercent >= STAKE_SUBSTANTIAL_INTEREST_THRESHOLD) {
			return 'guarantor_financial';
		}
		// Low stake (individual AND combined) → KYC + CIBIL only
		return 'non_applicant_cibil_only';
	}

	// Flags not answered yet → default financial
	return 'co_applicant_financial';
}

// ── Bridge to Legacy System ─────────────────────────────────────

/**
 * Map new classification to the existing ApplicantDerivedRole.
 * This bridge keeps all existing consumers working without changes.
 */
export function classificationToLegacyRole(
	classification: ApplicantClassification
): ApplicantDerivedRole {
	switch (classification) {
		case 'co_applicant_financial':
			return 'borrower';
		case 'co_applicant_non_financial':
			// Maps to cibil_only: profile + credit_score + conditional obligations
			return 'cibil_only';
		case 'guarantor_financial':
			// Full data collection needed — maps to borrower in Phase 1.
			// Phase 2 changes rule engine to assess independently (not pooled).
			return 'borrower';
		case 'non_applicant_full_financial':
			// Family Both=No — lender verifies fully, assessed like guarantor_financial
			// Independent assessment, income NOT pooled
			return 'borrower';
		case 'non_applicant_cibil_only':
			// Non-family Both=No — just KYC + CIBIL, no income assessment
			return 'cibil_only';
		case 'guarantor_non_financial':
			// DSA override only — recovery enforcement, no financial assessment
			return 'not_on_loan';
	}
}

// ── Tab Requirements (Classification-Based) ─────────────────────

/**
 * Returns required tab IDs for the new classification system.
 * Used in Phase 2 when wired into incomeTabState; available now for tests.
 */
export function getRequiredTabsForClassification(
	classification: ApplicantClassification,
	creditScore?: number
): string[] {
	switch (classification) {
		case 'co_applicant_financial':
			return [
				'profile',
				'income_profiles',
				'income_details',
				'credit_score',
				'obligations_details'
			];
		case 'co_applicant_non_financial': {
			// Profile + CIBIL, and obligations if CIBIL is low
			const tabs = ['profile', 'credit_score'];
			if (
				creditScore !== undefined &&
				creditScore >= 300 &&
				creditScore < CIBIL_OBLIGATION_THRESHOLD
			) {
				tabs.push('obligations_details');
			}
			return tabs;
		}
		case 'guarantor_financial':
			// Full independent assessment (all tabs, but income NOT pooled — Phase 2)
			return [
				'profile',
				'income_profiles',
				'income_details',
				'credit_score',
				'obligations_details'
			];
		case 'non_applicant_full_financial':
			// Family Both=No — lender verifies fully, same as guarantor_financial
			// Full assessment, income NOT pooled (independent verification)
			return [
				'profile',
				'income_profiles',
				'income_details',
				'credit_score',
				'obligations_details'
			];
		case 'non_applicant_cibil_only': {
			// Non-family Both=No — just KYC + CIBIL check, like co_applicant_non_financial
			const tabs = ['profile', 'credit_score'];
			if (
				creditScore !== undefined &&
				creditScore >= 300 &&
				creditScore < CIBIL_OBLIGATION_THRESHOLD
			) {
				tabs.push('obligations_details');
			}
			return tabs;
		}
		case 'guarantor_non_financial':
			// DSA override only — recovery enforcement, just profile for identification
			return ['profile'];
	}
}

// ── Labels & Badge Colors ───────────────────────────────────────

/**
 * Get the human-readable label for an applicant classification.
 *
 * When there is only one applicant on the file, the "Co-" prefix is dropped —
 * "Co-applicant" implies a second party, which doesn't exist in a sole-applicant case.
 * Pass `isSoleApplicant = true` from callers that know `applicants.length === 1`.
 */
export function getClassificationLabel(
	classification: ApplicantClassification,
	isSoleApplicant = false
): string {
	switch (classification) {
		case 'co_applicant_financial':
			return isSoleApplicant ? 'Applicant (Financial)' : 'Co-Applicant (Financial)';
		case 'co_applicant_non_financial':
			return isSoleApplicant ? 'Applicant (Non-Financial)' : 'Co-Applicant (Non-Financial)';
		case 'guarantor_financial':
			return 'Guarantor (Financial)';
		case 'non_applicant_full_financial':
			return 'Non-Applicant (Full Financial)';
		case 'non_applicant_cibil_only':
			return 'Non-Applicant (KYC & CIBIL)';
		case 'guarantor_non_financial':
			return 'Guarantor (Non-Financial)';
	}
}

/**
 * Priority ranking: higher number = more demanding (more tabs required).
 * When a person is a director in multiple companies, the highest wins.
 */
const CLASSIFICATION_PRIORITY: Record<ApplicantClassification, number> = {
	co_applicant_financial: 6, // All tabs — full participant
	guarantor_financial: 5, // All tabs — independent assessment
	non_applicant_full_financial: 4, // All tabs — verification entity
	co_applicant_non_financial: 3, // Profile + credit
	non_applicant_cibil_only: 2, // Profile + credit (+ obligations if low CIBIL)
	guarantor_non_financial: 1 // Profile only
};

/**
 * Pick the most demanding classification from multiple.
 * Used when a person is a director in multiple companies —
 * the UNION of requirements determines the final classification.
 */
export function pickMostDemandingClassification(
	classifications: ApplicantClassification[]
): ApplicantClassification {
	if (classifications.length === 0) return 'co_applicant_financial';
	return classifications.reduce((best, current) =>
		CLASSIFICATION_PRIORITY[current] > CLASSIFICATION_PRIORITY[best] ? current : best
	);
}

export function getClassificationBadgeColor(classification: ApplicantClassification): string {
	switch (classification) {
		case 'co_applicant_financial':
			return 'green';
		case 'co_applicant_non_financial':
			return 'blue';
		case 'guarantor_financial':
			return 'amber';
		case 'non_applicant_full_financial':
			return 'orange';
		case 'non_applicant_cibil_only':
			return 'slate';
		case 'guarantor_non_financial':
			return 'gray';
	}
}

// ── Guarantor Advisory ─────────────────────────────────────────

/**
 * Employment types where lenders may require a guarantor (e.g., senior officer).
 * Police, defense, paramilitary — recovery is difficult, so lenders seek
 * guarantee from a senior officer (CO, SHO, etc.).
 */
const GUARANTOR_ADVISORY_EMPLOYMENT_TYPES = [
	'Police',
	'Defence',
	'Defense',
	'BSF',
	'CRPF',
	'CISF',
	'ITBP',
	'SSB',
	'Paramilitary',
	'Armed Forces',
	'Navy',
	'Army',
	'Air Force'
];

/**
 * Check if an applicant's employment triggers a "guarantor may be required" advisory.
 * Returns the advisory message or null if no advisory is needed.
 *
 * @param employmentType - The applicant's employment type or employer category
 * @param profession - Optional profession/department string for broader matching
 */
export function getGuarantorAdvisory(employmentType?: string, profession?: string): string | null {
	const employment = (employmentType || '').trim();
	const prof = (profession || '').trim();
	const combined = `${employment} ${prof}`.toLowerCase();

	// Check direct employment type match
	const isAdvisoryType = GUARANTOR_ADVISORY_EMPLOYMENT_TYPES.some((type) =>
		combined.includes(type.toLowerCase())
	);

	if (isAdvisoryType) {
		return 'Guarantor may be required — lenders often seek guarantee from a senior officer (CO/SHO) for this employment type.';
	}

	// Lawyer / legal profession — some lenders prefer guarantor
	if (combined.includes('lawyer') || combined.includes('advocate') || combined.includes('legal')) {
		return 'Guarantor may be required — some lenders require additional guarantee for legal professionals.';
	}

	return null;
}

// ── Family Relationship Helper ──────────────────────────────────

/** Check if a relationship category is considered "family" for classification purposes */
export function isFamilyRelationship(category: RelationshipCategory | undefined): boolean {
	if (!category) return false;
	// Everything except 'non_family' is a family relationship
	return category !== 'non_family';
}
