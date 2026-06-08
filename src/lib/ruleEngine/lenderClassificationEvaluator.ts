/**
 * Per-Lender Classification Evaluator
 * ═══════════════════════════════════════════════════════════════════
 * Different lender types (PVT/GOV/NBFC/HFC/SFB) classify the same
 * applicant differently. The form stores a "universal" classification
 * on each applicant. During rule engine evaluation, this module
 * re-derives classification per lender type.
 *
 * Key differences:
 *   - PVT:  Strictest — Both=No + non-family = non_applicant_cibil_only
 *   - GOV:  Family Both=No with significant stake → co_applicant_financial
 *   - NBFC: Family Both=No → co_applicant_non_financial (income not pooled,
 *           but CIBIL checked and obligations considered)
 *   - HFC:  Similar to NBFC (housing-focused, lenient with family)
 *   - SFB:  Similar to GOV (small finance, community banking approach)
 *
 * Universal rules (NOT overridden per lender):
 *   - Primary applicant → always co_applicant_financial
 *   - onEMI = true → always co_applicant_financial
 *   - Professional Loan directors → always co_applicant_non_financial
 *   - Partnership/LLP/OPC/Sole Prop directors → always co_applicant_financial
 * ═══════════════════════════════════════════════════════════════════
 */

import type { LenderClassification } from '$lib/types/policyEngine';
import type { ApplicantClassification } from '$lib/utils/applicantRoleUtils';

// Stake threshold above which GOV/SFB treat family member as financial
const GOV_FAMILY_FINANCIAL_STAKE = 20;

/**
 * Re-evaluate applicant classifications for a specific lender type.
 * Returns a Map of applicant index → overridden classification.
 * Only entries that DIFFER from the stored classification are included.
 *
 * @param applicants - The applicant payload array from evaluation
 * @param lenderClassification - The lender's type (PVT/GOV/NBFC/HFC/SFB)
 * @param isSecuredLoan - Whether this is a secured loan (Home/LAP/Plot)
 * @returns Map of applicant index → overridden classification (only diffs)
 */
export function evaluateClassificationsForLender(
	applicants: Array<Record<string, unknown>>,
	lenderClassification: LenderClassification,
	isSecuredLoan: boolean
): Map<number, ApplicantClassification> {
	const overrides = new Map<number, ApplicantClassification>();

	for (let i = 0; i < applicants.length; i++) {
		const applicant = applicants[i];
		const storedClassification = applicant.applicantClassification as
			| ApplicantClassification
			| undefined;

		// Skip if no stored classification (legacy data — use as-is)
		if (!storedClassification) continue;

		// Universal rules — these NEVER change per lender
		if (i === 0) continue; // Primary always financial
		if (applicant.onEMI === true) continue; // On EMI always financial
		if (applicant.loanCategory === 'Professional Loan') continue;

		// Skip company types that are always financial
		const companyType = applicant.companyType as string | undefined;
		const ALWAYS_FINANCIAL = [
			'Sole Proprietorship',
			'Partnership Firm',
			'One Person Company (OPC)',
			'LLP'
		];
		if (companyType && ALWAYS_FINANCIAL.includes(companyType)) continue;

		// The only area where lenders differ: Both=No treatment
		const onEMI = applicant.onEMI as boolean | undefined;
		const onProperty = applicant.onProperty as boolean | undefined;
		const isFamilyMember = applicant.isFamilyMember as boolean | undefined;
		const ownershipPercent = Number(applicant.ownershipPercent) || 0;

		// Only Both=No cases need per-lender evaluation
		const isBothNo = onEMI === false && onProperty === false;
		if (!isBothNo && isSecuredLoan) continue;

		// For unsecured loans without onEMI/onProperty flags, check if the stored
		// classification indicates a non-financial/guarantor/non-applicant role
		const isNonFinancialOrGuarantor =
			storedClassification === 'co_applicant_non_financial' ||
			storedClassification === 'non_applicant_full_financial' ||
			storedClassification === 'non_applicant_cibil_only' ||
			storedClassification === 'guarantor_non_financial' ||
			storedClassification === 'guarantor_financial';
		if (!isNonFinancialOrGuarantor) continue;

		// Apply lender-specific rules for Both=No / non-financial applicants
		const overridden = classifyForLender(
			lenderClassification,
			storedClassification,
			isFamilyMember ?? false,
			ownershipPercent
		);

		if (overridden !== storedClassification) {
			overrides.set(i, overridden);
		}
	}

	return overrides;
}

/**
 * Determine classification for a specific lender type.
 *
 * @param lenderType - PVT/GOV/NBFC/HFC/SFB
 * @param storedClassification - The universal classification from form
 * @param isFamilyMember - Whether this applicant is family of the primary
 * @param ownershipPercent - Stake in a Pvt Ltd (0 if not a director)
 */
function classifyForLender(
	lenderType: LenderClassification,
	storedClassification: ApplicantClassification,
	isFamilyMember: boolean,
	ownershipPercent: number
): ApplicantClassification {
	switch (lenderType) {
		// ── PVT: Strictest — no overrides from default ──
		case 'PVT':
			return storedClassification;

		// ── GOV / SFB: Lenient with family members ──
		// Family member with significant stake → upgrade to financial
		case 'GOV':
		case 'SFB':
			if (isFamilyMember && ownershipPercent >= GOV_FAMILY_FINANCIAL_STAKE) {
				// Family + significant stake → GOV/SFB will assess full income
				if (storedClassification === 'co_applicant_non_financial') {
					return 'co_applicant_financial';
				}
				// non_applicant_full_financial (family Both=No) with significant stake
				// → GOV/SFB upgrades to co_applicant_financial
				if (storedClassification === 'non_applicant_full_financial') {
					return 'co_applicant_financial';
				}
				if (storedClassification === 'guarantor_non_financial') {
					return 'guarantor_financial';
				}
			}
			return storedClassification;

		// ── NBFC / HFC: Lenient — family Both=No stays non-financial ──
		// (Already the default behavior — no upgrade needed)
		// NBFCs accept non-financial family co-applicants without issue
		case 'NBFC':
		case 'HFC':
			return storedClassification;

		default:
			return storedClassification;
	}
}
