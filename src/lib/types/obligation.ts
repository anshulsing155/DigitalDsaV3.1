/**
 * Obligation Capture Types (Redesign)
 * ══════════════════════════════════════════════════════════════════
 * Clean data model for capturing existing obligations.
 * Keys deliberately match the old system (selectedToClose, borrowerCount,
 * hasProofOverride) so the payload builder and rule engine keep working.
 *
 * Terminology:
 * - Co-Applicant: anyone who signed the loan agreement (regardless of EMI/property)
 * - Guarantor: separate from co-applicants, fallback recovery only
 * - No "primary borrower" or "name lender" — those are lender-internal terms
 * ══════════════════════════════════════════════════════════════════
 */

// ── Facility Classification (derived from loanType, not user-selected) ──

export type FacilityType = 'term_loan' | 'credit_line' | 'dropline';

// ── Evidence Level (single dropdown) ──

export type EvidenceLevel =
	| 'sanction_and_statement'
	| 'statement_only'
	| 'sanction_only'
	| 'cibil_only'
	| 'no_documents';

// ── Closure Plan (stored as selectedToClose for backward compat) ──

export type ClosurePlan =
	| 'Keep running'
	| 'Self-funded closure before disbursement'
	| 'Will be closed by Top-up amount'
	| 'Not my actual liability (Guarantor/Paper only)';

// ── EMI Payment Source ──

export type EmiPaidBy = 'self' | 'co_applicant' | 'spouse' | 'business_account' | 'other';

// ── EMI Delay History ──

export type EmiDelayHistory = 'none' | '1_delay' | '2_plus';

// ── Role on existing obligation ──
// Maps to old ObligationRole values for payload compatibility

export type ObligationRole = 'co_applicant' | 'guarantor';

// ── Main Obligation Entry ──
// Keys match old system: loanType, bankName, selectedToClose, emi,
// totalLimit, tenure, interestRate, role, borrowerCount, emiPaidBy,
// applicantEmiShare, hasProofOverride, monthlyShare

export interface ObligationEntry {
	id: string;

	// ── Loan Identity (same keys as old system) ──
	loanType: string;
	bankName: string;

	// ── Amounts (same keys as old system) ──
	emi?: string; // String for backward compat with old form fields
	totalLimit?: string; // Used by OD/CC (same key as old system)
	tenure?: string; // Months as string
	interestRate?: string;
	principalOutstanding?: string; // Remaining principal balance
	sanctionedLimit?: string; // OD/CC/Dropline
	utilizedAmount?: string; // OD/CC/Dropline

	// ── Role & Co-applicants ──
	role: ObligationRole;
	borrowerCount: number; // Same key as old system. Total people on loan (including self)
	coApplicantNames?: string[]; // NEW — names of other co-applicants

	// ── EMI Responsibility (backward compat keys) ──
	emiResponsibility: 'full' | 'shared';
	monthlyShare?: string; // Same key as old system
	hasProofOverride: boolean; // Same key as old system
	applicantEmiShare?: number; // Computed share — same key as old system

	// ── Evidence (NEW) ──
	evidence: EvidenceLevel;

	// ── Closure (same key as old system) ──
	selectedToClose: string; // Old key name preserved

	// ── Payment & Delays ──
	emiPaidBy?: EmiPaidBy;
	emiDelayHistory?: EmiDelayHistory;

	// ── Metadata ──
	createdAt?: string;
	updatedAt?: string;
}

// ── Obligations Store (per applicant — same pattern as old system) ──

export interface ObligationsStore {
	active: ObligationEntry[];
	deleted: ObligationEntry[];
}

// ── Factory ──

export function createEmptyObligationEntry(): ObligationEntry {
	return {
		id: '',
		loanType: '',
		bankName: '',
		role: 'co_applicant',
		borrowerCount: 1,
		emiResponsibility: 'full',
		hasProofOverride: false,
		evidence: 'no_documents',
		selectedToClose: 'Keep running',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};
}
