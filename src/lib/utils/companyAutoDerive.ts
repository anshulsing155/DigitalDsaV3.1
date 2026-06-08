/**
 * Company Auto-Derive — R4 Company-Individual Income Intelligence
 * ═══════════════════════════════════════════════════════════════════
 * Pure functions to evaluate whether an income entry requires
 * company financials for lender documentation/income verification.
 *
 * IMPORTANT: This module does NOT auto-create company co-applicants.
 * Companies can only be co-applicants when the DSA explicitly adds
 * them with onEMI or onProperty. This module only flags when lenders
 * will need company financial documents (ITR, P&L, Balance Sheet).
 *
 * Key design: Zero side effects. No Svelte imports. All functions
 * are pure and testable in isolation.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { IncomeProfileType } from '$lib/types/incomeProfile';

// ============================================================================
// TYPES
// ============================================================================

/** Result of evaluating whether company financials are needed for documentation */
export interface CompanyFinancialsEvaluation {
	/** Whether lender will need this company's financial documents */
	financialsNeeded: boolean;
	/** Human-readable reason for the decision */
	reason: string;
	/** How the income should be treated in assessment */
	treatment: IncomeTreatment;
	/** Company/firm name (for banner display) */
	entityName: string;
	/** Company/firm type (for context in banner) */
	entityType: string;
}

/** Income treatment classification based on qualifying answers */
export type IncomeTreatment =
	| 'director_standard' // Indian company + equity → salary + profit from company
	| 'partner_standard' // Indian firm + active/significant → remuneration + profit
	| 'salaried_treatment' // Listed/foreign/professional director → simple salary
	| 'foreign_income' // Foreign company/firm → ITR-verified salary
	| 'passive_income'; // Sleeping partner with minor share → passive

/** Director/partner found in another applicant's income entries */
export interface LinkedDirectorInfo {
	applicantId: string;
	fullName: string;
	ownershipPercent: number;
	profileType: IncomeProfileType;
}

// ============================================================================
// SPECIFICS → DISPLAY TYPE MAPPING
// ============================================================================

/** Maps income specifics companyType/firmType values to human-readable labels */
const SPECIFICS_TO_DISPLAY_TYPE: Record<string, string> = {
	pvt_ltd: 'Private Limited',
	opc: 'One Person Company (OPC)',
	public_ltd: 'Public Limited',
	listed_large_public: 'Public Limited (Listed)',
	section_8: 'Section 8',
	partnership: 'Partnership Firm',
	llp: 'LLP'
};

// ============================================================================
// CORE EVALUATOR
// ============================================================================

/**
 * Evaluates whether a director/partner income entry requires company
 * financial documents for lender assessment.
 *
 * NOTE: This does NOT mean the company should be a co-applicant.
 * Company financials are documentation requirements for income verification.
 * A company becomes a co-applicant ONLY when the DSA explicitly adds it
 * with onEMI=true or onProperty=true.
 *
 * Decision trees:
 * - Director: foreign→No | OPC→No (inline) | Listed→No | NoEquity→No | HasEquity→Yes
 * - Partner: foreign→No | Active/Designated→Yes | Sleeping+>30%→Yes | Sleeping+<30%→No
 *
 * @param profileType - The income profile type (director_company or business_partnership)
 * @param specifics - The specifics answers for this income entry
 * @param entityName - Company/firm name from the income entry
 * @returns Evaluation result with financialsNeeded flag, reason, and treatment
 */
export function evaluateCompanyFinancialsNeeded(
	profileType: IncomeProfileType,
	specifics: Record<string, unknown>,
	entityName: string
): CompanyFinancialsEvaluation {
	if (profileType === 'director_company') {
		return evaluateDirectorEntry(specifics, entityName);
	}
	if (profileType === 'business_partnership') {
		return evaluatePartnerEntry(specifics, entityName);
	}
	// Other profile types never need company financials
	return {
		financialsNeeded: false,
		reason: 'Not a director/partner profile',
		treatment: 'salaried_treatment',
		entityName,
		entityType: ''
	};
}

/** Director decision tree */
function evaluateDirectorEntry(
	specifics: Record<string, unknown>,
	entityName: string
): CompanyFinancialsEvaluation {
	const registeredInIndia = specifics.registeredInIndia;
	const companyType = specifics.companyType as string | undefined;
	const hasEquity = specifics.hasEquity;
	const displayType = SPECIFICS_TO_DISPLAY_TYPE[companyType ?? ''] ?? 'Company';

	// Gate 1: Foreign company — income verified via ITR, no company docs needed
	if (registeredInIndia === false) {
		return {
			financialsNeeded: false,
			reason: 'Foreign company — income verified via ITR only.',
			treatment: 'foreign_income',
			entityName,
			entityType: displayType
		};
	}

	// Gate 2: OPC — sole director IS the company, financials captured inline
	// No separate banner needed — OPC data is part of the individual's income profile
	if (companyType === 'opc') {
		return {
			financialsNeeded: false,
			reason: 'OPC — sole director is the company. Financials captured inline.',
			treatment: 'director_standard',
			entityName,
			entityType: 'One Person Company (OPC)'
		};
	}

	// Gate 3: Listed/large public — treated as salaried, no company docs needed
	if (companyType === 'listed_large_public') {
		return {
			financialsNeeded: false,
			reason: 'Listed/large public company — treated as salaried employment.',
			treatment: 'salaried_treatment',
			entityName,
			entityType: displayType
		};
	}

	// Gate 4: No equity — professional/independent director, salaried treatment
	if (hasEquity === false) {
		return {
			financialsNeeded: false,
			reason: 'Professional/independent director without equity — salaried treatment.',
			treatment: 'salaried_treatment',
			entityName,
			entityType: displayType
		};
	}

	// Gate 5: Has equity — lender will need company financials for income verification
	if (hasEquity === true) {
		return {
			financialsNeeded: true,
			reason: `Equity-holding director — lender will need ${entityName} financials (ITR, P&L, Balance Sheet) for income verification.`,
			treatment: 'director_standard',
			entityName,
			entityType: displayType
		};
	}

	// Incomplete answers — can't determine yet
	return {
		financialsNeeded: false,
		reason: 'Qualifying questions incomplete',
		treatment: 'director_standard',
		entityName,
		entityType: displayType
	};
}

/** Partner decision tree */
function evaluatePartnerEntry(
	specifics: Record<string, unknown>,
	entityName: string
): CompanyFinancialsEvaluation {
	const registeredInIndia = specifics.registeredInIndia;
	const firmType = specifics.firmType as string | undefined;
	const partnerType = specifics.partnerType as string | undefined;
	const profitShareExceedsThreshold = specifics.profitShareExceedsThreshold;
	const displayType = SPECIFICS_TO_DISPLAY_TYPE[firmType ?? ''] ?? 'Firm';

	// Gate 1: Foreign firm — income verified via ITR only
	if (registeredInIndia === false) {
		return {
			financialsNeeded: false,
			reason: 'Foreign firm — income verified via ITR only.',
			treatment: 'foreign_income',
			entityName,
			entityType: displayType
		};
	}

	// Gate 2: Active/designated partner — firm financials always needed
	if (partnerType === 'active' || partnerType === 'designated') {
		return {
			financialsNeeded: true,
			reason: `Active/designated partner — lender will need ${entityName} financials (ITR, P&L, Balance Sheet) for income verification.`,
			treatment: 'partner_standard',
			entityName,
			entityType: displayType
		};
	}

	// Gate 3: Sleeping partner — check profit share significance
	if (partnerType === 'sleeping') {
		if (profitShareExceedsThreshold === true) {
			return {
				financialsNeeded: true,
				reason: `Sleeping partner with significant profit share (>30%) — lender will need ${entityName} financials.`,
				treatment: 'partner_standard',
				entityName,
				entityType: displayType
			};
		}
		if (profitShareExceedsThreshold === false) {
			return {
				financialsNeeded: false,
				reason: 'Sleeping partner with minor profit share — treated as passive income.',
				treatment: 'passive_income',
				entityName,
				entityType: displayType
			};
		}
	}

	// Incomplete answers
	return {
		financialsNeeded: false,
		reason: 'Qualifying questions incomplete',
		treatment: 'partner_standard',
		entityName,
		entityType: displayType
	};
}

// ============================================================================
// COMPANY LOOKUP (for DSA-added companies)
// ============================================================================

/** Result of searching for an existing company in the applicant list */
export interface CompanySearchResult {
	found: boolean;
	companyId?: string;
	companyIndex?: number;
}

/**
 * Searches the applicant list for an existing company by name (case-insensitive).
 * Used to check if a DSA-added company matches a director's income entry.
 */
export function findExistingCompanyApplicant(
	companyName: string,
	applicants: Array<Record<string, unknown>>
): CompanySearchResult {
	const normalizedTarget = companyName.trim().toLowerCase();
	if (!normalizedTarget) return { found: false };

	for (let i = 0; i < applicants.length; i++) {
		const applicant = applicants[i];
		if (applicant.applicantType !== 'Company') continue;

		const existingName = ((applicant.companyName as string) || '').trim().toLowerCase();
		if (existingName === normalizedTarget) {
			return {
				found: true,
				companyId: applicant.id as string,
				companyIndex: i
			};
		}
	}

	return { found: false };
}

/**
 * Scans ALL individual applicants' income entries to find other directors/partners
 * for the same company. Useful for showing DSA which directors share a company.
 *
 * @param companyName - The company name to match (case-insensitive)
 * @param applicants - Full applicant list
 * @param excludeApplicantId - ID of the current applicant (exclude from results)
 * @returns Array of other directors/partners found
 */
export function findOtherDirectorsForCompany(
	companyName: string,
	applicants: Array<Record<string, unknown>>,
	excludeApplicantId?: string
): LinkedDirectorInfo[] {
	const normalizedTarget = companyName.trim().toLowerCase();
	if (!normalizedTarget) return [];

	const results: LinkedDirectorInfo[] = [];

	for (const applicant of applicants) {
		if (applicant.applicantType !== 'Individual') continue;
		if (applicant.id === excludeApplicantId) continue;

		const entries = (applicant.incomeEntries as Array<Record<string, unknown>>) ?? [];
		for (const entry of entries) {
			const profileType = entry.profileType as IncomeProfileType;
			if (profileType !== 'director_company' && profileType !== 'business_partnership') continue;

			const entryName = ((entry.entityName as string) || '').trim().toLowerCase();
			if (entryName !== normalizedTarget) continue;

			// Found another director/partner for the same company
			const specifics = (entry.specifics as Record<string, unknown>) ?? {};
			const ownership =
				(specifics.shareholding as number) ?? (specifics.capitalContribution as number) ?? 0;

			results.push({
				applicantId: applicant.id as string,
				fullName: (applicant.fullName as string) || 'Unnamed',
				ownershipPercent: ownership,
				profileType
			});
			// Only count one entry per applicant per company
			break;
		}
	}

	return results;
}
