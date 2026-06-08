/**
 * Evidence Flags — Company Documentation Requirements
 * ═══════════════════════════════════════════════════════════════════
 * Evaluates all applicants' income entries to determine which
 * company financial documents lenders will need for income verification.
 *
 * This is a documentation requirement, NOT a co-applicant requirement.
 * Companies are only co-applicants when DSA explicitly adds them.
 * ═══════════════════════════════════════════════════════════════════
 */

import {
	evaluateCompanyFinancialsNeeded,
	type CompanyFinancialsEvaluation
} from '$lib/utils/companyAutoDerive';
import type { IncomeProfileType, IncomeSourceEntry } from '$lib/types/incomeProfile';

/** A flag indicating company financials are needed for documentation */
export interface EvidenceFlag {
	/** Applicant index in the applicants array */
	applicantIndex: number;
	/** Applicant's name */
	applicantName: string;
	/** Company/firm name */
	entityName: string;
	/** Company/firm type (e.g. "Private Limited", "LLP") */
	entityType: string;
	/** Human-readable reason */
	reason: string;
	/** Income treatment classification */
	treatment: string;
}

/**
 * Scan all applicants' income entries and derive which company
 * financials are needed for lender documentation.
 *
 * @param applicants - The full applicants array from formState
 * @returns Array of evidence flags, one per company that needs financials
 */
export function deriveEvidenceFlags(applicants: Array<Record<string, unknown>>): EvidenceFlag[] {
	const flags: EvidenceFlag[] = [];
	// Dedup by entity name (case-insensitive) — one flag per company
	const seenEntities = new Set<string>();

	for (let i = 0; i < applicants.length; i++) {
		const applicant = applicants[i];
		if (applicant.applicantType !== 'Individual') continue;

		const entries = (applicant.incomeEntries as IncomeSourceEntry[]) ?? [];
		const applicantName = (applicant.fullName as string) || 'Applicant';

		for (const entry of entries) {
			const profileType = entry.profileType as IncomeProfileType;
			if (profileType !== 'director_company' && profileType !== 'business_partnership') continue;

			const evaluation = evaluateCompanyFinancialsNeeded(
				profileType,
				(entry.specifics as Record<string, unknown>) ?? {},
				entry.entityName
			);

			if (!evaluation.financialsNeeded) continue;

			const key = evaluation.entityName.toLowerCase().trim();
			if (seenEntities.has(key)) continue;
			seenEntities.add(key);

			flags.push({
				applicantIndex: i,
				applicantName,
				entityName: evaluation.entityName,
				entityType: evaluation.entityType,
				reason: evaluation.reason,
				treatment: evaluation.treatment
			});
		}
	}

	return flags;
}
