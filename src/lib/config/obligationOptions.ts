/**
 * Obligation Capture Options & Helpers
 * ══════════════════════════════════════════════════════════════════
 * Loan type lists, role options, evidence levels, closure plans,
 * and facility type derivation.
 * ══════════════════════════════════════════════════════════════════
 */

import type { FacilityType, EvidenceLevel, EmiPaidBy, ObligationRole } from '$lib/types/obligation';

// ── Loan Types per Applicant Type ───────────────────────────────

export interface LoanTypeOption {
	label: string;
	value: string;
	icon: string; // Lucide icon name
	facility: FacilityType;
	individualOnly?: boolean;
	companyOnly?: boolean;
}

export const LOAN_TYPE_OPTIONS: LoanTypeOption[] = [
	// ── Term Loans (both Individual + Company unless marked) ──
	{ label: 'Home Loan', value: 'Home Loan', icon: 'Home', facility: 'term_loan' },
	{
		label: 'Plot & Construction',
		value: 'Plot and Construction Loan',
		icon: 'MapPin',
		facility: 'term_loan'
	},
	{
		label: 'Loan Against Property',
		value: 'Loan Against Property',
		icon: 'Building',
		facility: 'term_loan'
	},
	{
		label: 'Personal Loan',
		value: 'Personal Loan',
		icon: 'User',
		facility: 'term_loan',
		individualOnly: true
	},
	{ label: 'Vehicle Loan', value: 'Vehicle Loan', icon: 'Car', facility: 'term_loan' },
	{
		label: 'Gold Loan',
		value: 'Gold Loan',
		icon: 'Gem',
		facility: 'term_loan',
		individualOnly: true
	},
	{
		label: 'Credit Card Loan',
		value: 'Credit Card Loan',
		icon: 'CreditCard',
		facility: 'term_loan',
		individualOnly: true
	},
	{
		label: 'Consumer Durable',
		value: 'Consumer Durable Loan',
		icon: 'Tv',
		facility: 'term_loan',
		individualOnly: true
	},
	{
		label: 'Education Loan',
		value: 'Education Loan',
		icon: 'GraduationCap',
		facility: 'term_loan',
		individualOnly: true
	},
	{
		label: 'Insta Loan',
		value: 'Insta Loan',
		icon: 'Zap',
		facility: 'term_loan',
		individualOnly: true
	},
	{
		label: 'Business Loan (Unsecured)',
		value: 'Business Loan - Unsecured',
		icon: 'Briefcase',
		facility: 'term_loan'
	},
	{
		label: 'Business Loan (Secured)',
		value: 'Business Loan - Secured',
		icon: 'Shield',
		facility: 'term_loan',
		companyOnly: true
	},
	{
		label: 'Machinery Loan',
		value: 'Machinery Loan',
		icon: 'Cog',
		facility: 'term_loan',
		companyOnly: true
	},

	// ── Credit Lines ──
	{ label: 'OD Limit', value: 'OD Limit', icon: 'ArrowDownUp', facility: 'credit_line' },
	{
		label: 'CC Limit',
		value: 'CC Limit',
		icon: 'Landmark',
		facility: 'credit_line',
		companyOnly: true
	},
	{ label: 'Dropline OD', value: 'Dropline OD', icon: 'TrendingDown', facility: 'dropline' },

	// ── Catch-all ──
	{ label: 'Other', value: 'Other Type Loan', icon: 'CircleDot', facility: 'term_loan' }
];

/** Get loan types filtered by applicant type */
export function getLoanTypesForApplicant(
	applicantType: 'Individual' | 'Company'
): LoanTypeOption[] {
	if (applicantType === 'Company') {
		return LOAN_TYPE_OPTIONS.filter((o) => !o.individualOnly);
	}
	return LOAN_TYPE_OPTIONS.filter((o) => !o.companyOnly);
}

/** Derive facility type from loan type string */
export function deriveFacilityType(loanType: string): FacilityType {
	const match = LOAN_TYPE_OPTIONS.find((o) => o.value === loanType);
	return match?.facility ?? 'term_loan';
}

/** Check if a loan type is Insta Loan */
export function isInstaLoan(loanType: string): boolean {
	return loanType === 'Insta Loan';
}

// ── Role Options ────────────────────────────────────────────────

export const ROLE_OPTIONS: Array<{ label: string; value: ObligationRole; description: string }> = [
	{
		label: 'Co-Applicant',
		value: 'co_applicant',
		description: 'Signed the loan agreement — legally liable'
	},
	{
		label: 'Guarantor',
		value: 'guarantor',
		description: 'Fallback only — liable if borrower defaults'
	}
];

// ── Evidence Level Options ──────────────────────────────────────

export const EVIDENCE_OPTIONS: Array<{ label: string; value: EvidenceLevel }> = [
	{ label: 'Sanction Letter + Bank Statement', value: 'sanction_and_statement' },
	{ label: 'Bank Statement Only', value: 'statement_only' },
	{ label: 'Sanction Letter Only', value: 'sanction_only' },
	{ label: 'CIBIL Report Only', value: 'cibil_only' },
	{ label: 'No Documents Yet', value: 'no_documents' }
];

// ── Closure Plan Options ────────────────────────────────────────

// Closure options — values match old system strings for payload compatibility
export const CLOSURE_OPTIONS: Array<{ label: string; value: string; icon: string }> = [
	{ label: 'Keep Running', value: 'Keep running', icon: 'Play' },
	{
		label: 'Close — Self Funded',
		value: 'Self-funded closure before disbursement',
		icon: 'CircleCheck'
	},
	{
		label: 'Close — From Top-up / BT',
		value: 'Will be closed by Top-up amount',
		icon: 'ArrowRightLeft'
	},
	{
		label: 'Not My Liability',
		value: 'Not my actual liability (Guarantor/Paper only)',
		icon: 'ShieldOff'
	}
];

/**
 * Get closure options filtered by context.
 * - Guarantors: only "Not my liability"
 * - Insta Loan: no "Close from top-up" (lenders won't DC for insta loans)
 * - New Loan (not BT/DC): no "Close from top-up"
 * - Pitfall #58: DC route where the case has a Company applicant — only the
 *   Company's own obligations can be "closed by this loan". Director/Partner
 *   personal obligations on the SAME case must NOT offer the close option:
 *   a corporate loan cannot close a director's personal debt.
 *
 * @param applicantType - the applicant whose obligation is being captured
 *   (Individual or Company). Defaults to 'Individual' so existing callers
 *   keep working without code changes.
 * @param caseHasCompany - whether the broader case has any Company applicant.
 *   When true + DC route + applicantType !== 'Company', "Close by this loan"
 *   is filtered out.
 */
export function getClosureOptionsFiltered(
	role: ObligationRole,
	loanType: string,
	loanScope: string,
	applicantType: 'Individual' | 'Company' = 'Individual',
	caseHasCompany: boolean = false
): typeof CLOSURE_OPTIONS {
	// Guarantors can only select "Not my liability"
	if (role === 'guarantor') {
		return CLOSURE_OPTIONS.filter((o) => o.value.startsWith('Not my'));
	}

	// LAP is commonly used to close existing loans (secured or unsecured) —
	// the closure option should ALWAYS be available for LAP, regardless of variant
	const isLAP = loanType === 'Loan Against Property';

	// Variants where the NEW loan disburses extra funds beyond the original
	// purchase amount, so they can pay off a separate obligation. PITFALL: the
	// previous implementation used `loanScope.includes('Balance Transfer')`,
	// a loose substring match that caught BOTH 'Balance Transfer Only' (which
	// should NOT show the option — BT-only just refinances the existing loan,
	// no extra cash) AND 'Balance Transfer With Top-up' (which should). Same
	// with `.includes('Top-up')` matching both 'Top-up Only' and
	// 'Balance Transfer With Top-up'. Switched to exact membership in a Set
	// so future variant additions can't silently widen the gate (Pitfall:
	// BT-only wrongly offering Close-by-loan, 2026-05-28).
	//
	// LAP is exempt — handled separately by the `isLAP` flag above. LAP is
	// always against property collateral, so even a LAP BT releases cash
	// against the asset and can close other obligations.
	// Canonical post-2026-05-31-rename scope values that legitimately fund a
	// closure of other obligations. The six 'OD/DOD/CC Takeover[ + Enhancement]'
	// entries that used to be here have been removed — they were never canonical
	// scope values (per commonPage.json the OD/DOD/CC distinction lives on
	// `facilityType`, while takeover semantics are subsumed by the
	// `Debt Consolidation` / `Debt Consolidation with Extra Funds` scope values
	// which are already in the Set). Dead entries were misleading future
	// maintainers into thinking a finer takeover axis existed here.
	const CLOSURE_ALLOWED_VARIANTS = new Set([
		'Debt Consolidation',
		'Debt Consolidation with Extra Funds',
		'Balance Transfer With Top-up',
		'Top-up Only'
	]);
	const isDcOrBt = isLAP || CLOSURE_ALLOWED_VARIANTS.has(loanScope);

	const isDcVariant =
		loanScope === 'Debt Consolidation' ||
		loanScope === 'Debt Consolidation with Extra Funds';

	// Pitfall #58: corporate DC — directors' personal obligations cannot be
	// consolidated into a company loan. Drop "Will be closed" for any
	// Individual applicant on a DC route when the case has a Company.
	const isCorporateDcOnIndividual =
		isDcVariant && caseHasCompany && applicantType !== 'Company';

	return CLOSURE_OPTIONS.filter((o) => {
		// "Not my liability" only for guarantors
		if (o.value.startsWith('Not my')) return false;
		// "Close by new loan" only for BT/DC, never for Insta Loan, and never
		// on a director/partner under a corporate DC case.
		if (o.value.startsWith('Will be closed')) {
			if (isCorporateDcOnIndividual) return false;
			return isDcOrBt && !isInstaLoan(loanType);
		}
		return true;
	}).map((o) => {
		// For DC, BT, and Top-up routes: relabel to clarify the new loan closes the old one
		if (isDcOrBt && o.value.startsWith('Will be closed')) {
			return { ...o, label: 'Close by this new loan' };
		}
		return o;
	});
}

// ── EMI Paid By Options ─────────────────────────────────────────

export const EMI_PAID_BY_OPTIONS: Array<{ label: string; value: EmiPaidBy }> = [
	{ label: 'Self (own account)', value: 'self' },
	{ label: 'Co-Applicant', value: 'co_applicant' },
	{ label: 'Spouse', value: 'spouse' },
	{ label: 'Business Account', value: 'business_account' },
	{ label: 'Other', value: 'other' }
];

// ── Co-Applicant Count Options ──────────────────────────────────

export const CO_APPLICANT_COUNT_OPTIONS = [
	{ label: 'Just me', value: 1 },
	{ label: '2', value: 2 },
	{ label: '3', value: 3 },
	{ label: '4+', value: 4 }
];

// ── EMI Delay Options ───────────────────────────────────────────

export const EMI_DELAY_OPTIONS = [
	{ label: 'No delays', value: 'none' },
	{ label: '1 delay', value: '1_delay' },
	{ label: '2+ delays', value: '2_plus' }
];

// ── Display Helpers ─────────────────────────────────────────────

/** Get short evidence label for card display */
export function shortEvidence(evidence: EvidenceLevel): string {
	switch (evidence) {
		case 'sanction_and_statement':
			return 'SL+BS';
		case 'statement_only':
			return 'BS';
		case 'sanction_only':
			return 'SL';
		case 'cibil_only':
			return 'CIBIL';
		case 'no_documents':
			return 'No docs';
		default:
			return '';
	}
}

/** Get icon for loan type */
export function getLoanTypeIcon(loanType: string): string {
	return LOAN_TYPE_OPTIONS.find((o) => o.value === loanType)?.icon ?? 'CircleDot';
}

/** Format currency for display (₹45,000) */
export function formatObligationAmount(amount: number | undefined): string {
	if (!amount) return '—';
	return `₹${amount.toLocaleString('en-IN')}`;
}
