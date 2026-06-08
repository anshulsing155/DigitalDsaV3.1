/**
 * File Configurator
 * ══════════════════════════════════════════════════════════════════
 * Core logic for the File Builder feature. DSAs control presentation
 * (sections, display modes, notes) but NEVER edit numbers/amounts.
 *
 * Two file versions:
 *   - Review (v1): PII always stripped — system-enforced guarantee.
 *   - Submission (v2): Full data including contact details.
 *
 * Key functions:
 *   - getDefaultFileConfig: default config for a case
 *   - buildFilePayload: applies config to form data
 *   - stripPII: deep-redacts personally identifiable information
 *   - validateFileIntegrity: SHA-256 tamper detection
 * ══════════════════════════════════════════════════════════════════
 */

import type { FileConfig } from '$lib/types/case.js';
import type { LenderResult } from '$lib/types/lenderResults.js';
import { computePayloadHash } from '$lib/server/snapshotHelpers.js';

// ============================================================================
// LOCAL TYPE ALIASES
// ============================================================================

/** Loosely-typed form data coming from the client or database */
type FormDataRecord = Record<string, unknown>;

/** Shape expected by income reducers — all fields optional, coerced via Number() */
interface IncomeReducerItem {
	amount?: unknown;
	monthly_income?: unknown;
	annual_income?: unknown;
}

/** Shape expected by obligation reducers — all fields optional, coerced via Number() */
interface ObligationReducerItem {
	emi?: unknown;
	monthly_emi?: unknown;
	amount?: unknown;
	outstanding?: unknown;
	outstanding_amount?: unknown;
}

// ============================================================================
// DEFAULT SECTION ORDER
// ============================================================================

const SECURED_SECTIONS = [
	'applicant_details',
	'income_details',
	'obligation_details',
	'property_details',
	'loan_details',
	'lender_offer',
	'documents',
	'eligibility_summary'
];

/** Unsecured loans (Personal, Business, Professional) don't have property */
const UNSECURED_SECTIONS = [
	'applicant_details',
	'income_details',
	'obligation_details',
	'business_details',
	'loan_details',
	'lender_offer',
	'documents',
	'eligibility_summary'
];

/** Personal Loan has no business or property section */
const PERSONAL_LOAN_SECTIONS = [
	'applicant_details',
	'income_details',
	'obligation_details',
	'loan_details',
	'lender_offer',
	'documents',
	'eligibility_summary'
];

/** Unsecured loan names that should NOT show property_details */
const UNSECURED_LOAN_NAMES = ['Personal Loan', 'Business Loan', 'Professional Loan'];

/** Business/Professional loans show business_details instead of property_details */
const BUSINESS_LOAN_NAMES = ['Business Loan', 'Professional Loan'];

/**
 * Get the appropriate section list for a given loan type.
 * - Secured loans: include property_details
 * - Business/Professional: include business_details instead
 * - Personal Loan: no property or business sections
 */
function getSectionsForLoanType(loanType?: string): string[] {
	if (!loanType) return SECURED_SECTIONS; // Default to secured if unknown

	if (BUSINESS_LOAN_NAMES.includes(loanType)) return UNSECURED_SECTIONS;
	if (UNSECURED_LOAN_NAMES.includes(loanType)) return PERSONAL_LOAN_SECTIONS;
	return SECURED_SECTIONS;
}

// ============================================================================
// GET DEFAULT FILE CONFIG
// ============================================================================

/**
 * Returns a sensible default FileConfig for a case.
 * All sections visible, consolidated views, PII stripped, empty notes.
 *
 * @param caseId - The case ID
 * @param loanType - Optional loan type to determine which sections apply.
 *   Unsecured loans exclude property_details; Business/Professional add business_details.
 */
export function getDefaultFileConfig(caseId: string, loanType?: string): FileConfig {
	const sections = getSectionsForLoanType(loanType);

	const sectionsVisibility: Record<string, boolean> = {};
	for (const section of sections) {
		sectionsVisibility[section] = true;
	}

	return {
		source_payload_hash: '',
		source_snapshot_version: 0,
		sections_visibility: sectionsVisibility,
		display_mode: {
			income: 'consolidated',
			obligations: 'consolidated',
			applicants: 'consolidated'
		},
		dsa_notes: {},
		section_order: [...sections],
		pii_mode: 'stripped',
		updated_at: new Date()
	};
}

/** Section labels for UI display (covers all loan types) */
export const SECTION_LABELS: Record<string, string> = {
	applicant_details: 'Applicant Details',
	income_details: 'Income Details',
	obligation_details: 'Existing Obligations',
	property_details: 'Property Details',
	business_details: 'Business Details',
	loan_details: 'Loan Details',
	lender_offer: 'Lender Offer',
	documents: 'Documents',
	eligibility_summary: 'Eligibility Summary'
};

// ============================================================================
// NORMALIZE FORM DATA
// ============================================================================

/**
 * Transforms form submission structure to file builder section structure.
 * Handles both raw form state and pre-structured section data.
 *
 * Raw form state: { loanData: { ...allFields }, applicants, applicationData, ... }
 * Expected sections: { applicant_details, income_details, property_details, ... }
 *
 * Strategy: Extract all loanData fields and organize into logical sections
 */
function normalizeFormData(formData: FormDataRecord): FormDataRecord {
	// If already has the section structure, return as-is
	if (formData.applicant_details || formData.income_details || formData.property_details) {
		return formData;
	}

	// Get all form data from loanData (contains all questions answered)
	const loanData = (formData.loanData as FormDataRecord) || {};

	// Group loanData fields by likely categories for the PDF sections
	const normalized: FormDataRecord = {
		applicant_details: formData.applicants || [],

		// Income: extract income-related fields from loanData
		income_details: {
			...Object.fromEntries(
				Object.entries(loanData).filter(
					([key]) =>
						key.toLowerCase().includes('income') ||
						key.toLowerCase().includes('salary') ||
						key.toLowerCase().includes('employment') ||
						key.toLowerCase().includes('income_profile')
				)
			)
		},

		// Property: extract property-related fields
		property_details: {
			...Object.fromEntries(
				Object.entries(loanData).filter(
					([key]) =>
						key.toLowerCase().includes('property') ||
						key.toLowerCase().includes('address') ||
						key.toLowerCase().includes('location') ||
						key.toLowerCase().includes('cost') ||
						key.toLowerCase().includes('age')
				)
			)
		},

		// Obligations: extract obligation/liability fields
		obligation_details: {
			...Object.fromEntries(
				Object.entries(loanData).filter(
					([key]) =>
						key.toLowerCase().includes('obligation') ||
						key.toLowerCase().includes('emi') ||
						key.toLowerCase().includes('liability') ||
						key.toLowerCase().includes('running_loan')
				)
			)
		},

		// Loan: extract loan-specific fields
		loan_details: {
			...Object.fromEntries(
				Object.entries(loanData).filter(
					([key]) =>
						key.toLowerCase().includes('loan') ||
						key.toLowerCase().includes('amount') ||
						key.toLowerCase().includes('tenure') ||
						key.toLowerCase().includes('purpose') ||
						key.toLowerCase().includes('credit')
				)
			)
		},

		documents: (formData.loanData as FormDataRecord)?.documents || [],

		// Eligibility: extract from application data or loanData
		eligibility_summary: {
			...(formData.applicationData as FormDataRecord),
			...Object.fromEntries(
				Object.entries(loanData).filter(
					([key]) =>
						key.toLowerCase().includes('eligible') || key.toLowerCase().includes('sanction')
				)
			)
		}
	};

	return normalized;
}

// ============================================================================
// BUILD FILE PAYLOAD
// ============================================================================

/**
 * Takes raw form submission data and a FileConfig, then:
 *   1. Filters sections based on sections_visibility
 *   2. Reorders sections based on section_order
 *   3. Applies display_mode (consolidated vs detailed) for income, obligations, applicants
 *   4. Attaches dsa_notes to relevant sections
 *
 * Returns a structured payload ready for PDF generation.
 */
export function buildFilePayload(
	formData: FormDataRecord,
	config: FileConfig,
	lenderResult?: LenderResult
): FormDataRecord {
	const payload: FormDataRecord = {};

	// Normalize form data to expected section structure
	const normalizedData = normalizeFormData(formData);

	// Inject the lender-offer section when a LenderResult is provided.
	// Presence-check on plot_equity_* fields is the variant gate — engine only
	// populates those four when loanVariant === 'Plot & Equity Loan'.
	if (lenderResult) {
		normalizedData.lender_offer = buildLenderOfferSection(lenderResult);
	}

	// Determine ordered list of sections to include
	const orderedSections = config.section_order.length > 0 ? config.section_order : SECURED_SECTIONS;

	// Filter to only visible sections and build in order
	for (const section of orderedSections) {
		// Skip sections that are explicitly hidden
		if (config.sections_visibility[section] === false) {
			continue;
		}

		// Pull section data from form submission (may be undefined if section doesn't exist)
		const sectionData = normalizedData[section];
		if (sectionData === undefined) {
			continue;
		}

		// Apply display mode transformations
		payload[section] = applyDisplayMode(section, sectionData, config);

		// Attach DSA notes if present for this section
		if (config.dsa_notes[section]) {
			const sectionValue = payload[section];
			if (
				typeof sectionValue === 'object' &&
				sectionValue !== null &&
				!Array.isArray(sectionValue)
			) {
				payload[section] = {
					...(sectionValue as FormDataRecord),
					_dsa_note: config.dsa_notes[section]
				};
			} else {
				// For non-object section data, wrap it
				payload[section] = {
					data: sectionValue,
					_dsa_note: config.dsa_notes[section]
				};
			}
		}
	}

	// Carry over top-level metadata fields that are not sections
	// (e.g., case_id, loan info, timestamps)
	const metadataKeys = ['case_id', 'loan', 'created_at', 'updated_at', 'form_version'];
	for (const key of metadataKeys) {
		if (formData[key] !== undefined) {
			payload[key] = formData[key];
		}
	}

	return payload;
}

// ============================================================================
// LENDER OFFER SECTION BUILDER
// ============================================================================

/**
 * Builds the lender_offer payload section from a LenderResult.
 *
 * Standard fields render for every loan type. For Plot & Equity Loan, the
 * engine additionally populates four breakdown fields (sanction headline /
 * seller disbursement / buyer cash / buyer net out-of-pocket) — when present,
 * a nested "Plot & Equity Breakdown" sub-section surfaces them.
 *
 * Returns a plain key/value record consumed by the generic PDF renderer.
 * Numbers stay raw — the PDF generator's formatValue handles currency display.
 */
function buildLenderOfferSection(lenderResult: LenderResult): Record<string, unknown> {
	const section: Record<string, unknown> = {
		Lender: lenderResult.lender_name,
		'Sanction Amount': lenderResult.offered_amount,
		'Interest Rate (ROI)': `${lenderResult.roi}%`,
		'Monthly EMI': lenderResult.emi,
		'Tenure (months)': lenderResult.tenure_months
	};

	// Plot & Equity 4-number breakdown — only present when the lender's rule
	// doc supplies all three caps AND loanVariant === 'Plot & Equity Loan'.
	// The four fields land together or not at all (engine guarantee), but the
	// per-field guard reads cleanly in code review.
	if (
		lenderResult.plot_equity_sanction_headline !== undefined &&
		lenderResult.plot_equity_seller_disbursement !== undefined &&
		lenderResult.plot_equity_buyer_cash_component !== undefined &&
		lenderResult.plot_equity_buyer_net_out_of_pocket !== undefined
	) {
		section['Plot & Equity Breakdown'] = {
			'Sanction Headline': lenderResult.plot_equity_sanction_headline,
			'Seller Payment (plot-loan file)': lenderResult.plot_equity_seller_disbursement,
			'Buyer Cash (LAP file)': lenderResult.plot_equity_buyer_cash_component,
			'Buyer Net Cash Needed (out of pocket)': lenderResult.plot_equity_buyer_net_out_of_pocket
		};
	}

	return section;
}

// ============================================================================
// DISPLAY MODE HELPERS
// ============================================================================

/**
 * Applies the appropriate display mode to a section's data.
 * - income: 'consolidated' sums all income sources, 'detailed' keeps breakdown
 * - obligations: 'consolidated' sums all EMIs/liabilities, 'detailed' keeps breakdown
 * - applicants: 'consolidated' combines all applicants, 'individual' keeps separate
 */
function applyDisplayMode(section: string, data: unknown, config: FileConfig): unknown {
	if (section === 'income_details' && config.display_mode.income === 'consolidated') {
		return consolidateIncome(data);
	}

	if (section === 'obligation_details' && config.display_mode.obligations === 'consolidated') {
		return consolidateObligations(data);
	}

	if (section === 'applicant_details' && config.display_mode.applicants === 'consolidated') {
		return consolidateApplicants(data);
	}

	// 'detailed' or 'individual' mode — return data as-is
	return data;
}

/**
 * Consolidate income: sums all income sources into a single total.
 * Preserves the original data under `_detailed` for reference.
 */
function consolidateIncome(data: unknown): unknown {
	if (!data || typeof data !== 'object') return data;

	// If data is an array of income items, sum them
	if (Array.isArray(data)) {
		const total = data.reduce((sum: number, item: IncomeReducerItem) => {
			return (
				sum +
				(Number(item.amount) || Number(item.monthly_income) || Number(item.annual_income) || 0)
			);
		}, 0);
		return {
			display_mode: 'consolidated',
			total_income: total,
			source_count: data.length,
			_detailed: data
		};
	}

	// If data is an object with income arrays/fields, consolidate
	const dataRecord = data as FormDataRecord;
	if (dataRecord.sources && Array.isArray(dataRecord.sources)) {
		const total = (dataRecord.sources as IncomeReducerItem[]).reduce(
			(sum: number, item: IncomeReducerItem) => {
				return (
					sum +
					(Number(item.amount) || Number(item.monthly_income) || Number(item.annual_income) || 0)
				);
			},
			0
		);
		return {
			...dataRecord,
			display_mode: 'consolidated',
			total_income: total,
			source_count: (dataRecord.sources as unknown[]).length,
			_detailed: dataRecord.sources
		};
	}

	// If data has a total already, just mark it
	return { ...dataRecord, display_mode: 'consolidated' };
}

/**
 * Consolidate obligations: sums all EMIs/liabilities into a single total.
 */
function consolidateObligations(data: unknown): unknown {
	if (!data || typeof data !== 'object') return data;

	if (Array.isArray(data)) {
		const totalEmi = data.reduce((sum: number, item: ObligationReducerItem) => {
			return sum + (Number(item.emi) || Number(item.monthly_emi) || Number(item.amount) || 0);
		}, 0);
		const totalOutstanding = data.reduce((sum: number, item: ObligationReducerItem) => {
			return sum + (Number(item.outstanding) || Number(item.outstanding_amount) || 0);
		}, 0);
		return {
			display_mode: 'consolidated',
			total_monthly_emi: totalEmi,
			total_outstanding: totalOutstanding,
			obligation_count: data.length,
			_detailed: data
		};
	}

	const dataRecord = data as FormDataRecord;
	if (dataRecord.obligations && Array.isArray(dataRecord.obligations)) {
		const obligations = dataRecord.obligations as ObligationReducerItem[];
		const totalEmi = obligations.reduce((sum: number, item: ObligationReducerItem) => {
			return sum + (Number(item.emi) || Number(item.monthly_emi) || Number(item.amount) || 0);
		}, 0);
		const totalOutstanding = obligations.reduce((sum: number, item: ObligationReducerItem) => {
			return sum + (Number(item.outstanding) || Number(item.outstanding_amount) || 0);
		}, 0);
		return {
			...dataRecord,
			display_mode: 'consolidated',
			total_monthly_emi: totalEmi,
			total_outstanding: totalOutstanding,
			obligation_count: obligations.length,
			_detailed: dataRecord.obligations
		};
	}

	return { ...dataRecord, display_mode: 'consolidated' };
}

/**
 * Consolidate applicants: merges all applicant records into a combined view.
 */
function consolidateApplicants(data: unknown): unknown {
	if (!data || typeof data !== 'object') return data;

	if (Array.isArray(data)) {
		return {
			display_mode: 'consolidated',
			applicant_count: data.length,
			applicants: data
		};
	}

	const dataRecord = data as FormDataRecord;
	if (dataRecord.applicants && Array.isArray(dataRecord.applicants)) {
		return {
			...dataRecord,
			display_mode: 'consolidated',
			applicant_count: (dataRecord.applicants as unknown[]).length
		};
	}

	return { ...dataRecord, display_mode: 'consolidated' };
}

// ============================================================================
// STRIP PII
// ============================================================================

/**
 * PII field mapping: field name → redaction strategy.
 * This is the system-enforced guarantee: Review files NEVER leak PII.
 */
const PII_FIELDS: Record<string, (value: unknown) => unknown> = {
	// Names → "[REDACTED]"
	full_name: () => '[REDACTED]',
	name: () => '[REDACTED]',
	first_name: () => '[REDACTED]',
	last_name: () => '[REDACTED]',
	applicant_name: () => '[REDACTED]',
	fullName: () => '[REDACTED]',
	fullNameOfDirector: () => '[REDACTED]',
	GPAfullName: () => '[REDACTED]',
	directorName: () => '[REDACTED]',

	// PAN → "XXXXX####X" (keep last 4 digits pattern)
	pan: redactPan,
	pan_number: redactPan,

	// Aadhaar → "XXXX XXXX ####" (keep last 4)
	aadhaar: redactAadhaar,
	aadhaar_number: redactAadhaar,

	// Phone → "XXXXXX####" (keep last 4)
	mobile: redactPhone,
	phone: redactPhone,
	mobile_number: redactPhone,
	phone_number: redactPhone,

	// Email → "r*****d@*****.com" pattern
	email: redactEmail,
	email_address: redactEmail,

	// Address → "[Address Redacted]"
	address: () => '[Address Redacted]',
	current_address: () => '[Address Redacted]',
	permanent_address: () => '[Address Redacted]',

	// DOB → "[DOB Redacted]"
	dob: () => '[DOB Redacted]',
	date_of_birth: () => '[DOB Redacted]'
};

function redactPan(value: unknown): string {
	const str = String(value || '');
	if (str.length >= 4) {
		const last4 = str.slice(-4);
		return `XXXXX${last4}X`;
	}
	return 'XXXXXXXXXX';
}

function redactAadhaar(value: unknown): string {
	const str = String(value || '').replace(/\s/g, '');
	if (str.length >= 4) {
		const last4 = str.slice(-4);
		return `XXXX XXXX ${last4}`;
	}
	return 'XXXX XXXX XXXX';
}

function redactPhone(value: unknown): string {
	const str = String(value || '').replace(/\s/g, '');
	if (str.length >= 4) {
		const last4 = str.slice(-4);
		return `XXXXXX${last4}`;
	}
	return 'XXXXXXXXXX';
}

function redactEmail(value: unknown): string {
	const str = String(value || '');
	const atIndex = str.indexOf('@');
	if (atIndex > 0) {
		const localPart = str.slice(0, atIndex);
		const domainPart = str.slice(atIndex + 1);
		const dotIndex = domainPart.lastIndexOf('.');
		const ext = dotIndex > 0 ? domainPart.slice(dotIndex + 1) : 'com';
		const firstChar = localPart[0] || 'x';
		const lastChar = localPart.length > 1 ? localPart[localPart.length - 1] : firstChar;
		return `${firstChar}*****${lastChar}@*****.${ext}`;
	}
	return 'r*****d@*****.com';
}

/**
 * Deep clones the payload and recursively strips PII fields.
 * This is the system-enforced guarantee: Review files NEVER leak PII.
 */
export function stripPII(payload: FormDataRecord): FormDataRecord {
	return deepStripPII(structuredClone(payload)) as FormDataRecord;
}

function deepStripPII(obj: unknown): unknown {
	if (obj === null || obj === undefined) return obj;

	if (Array.isArray(obj)) {
		return obj.map((item) => deepStripPII(item));
	}

	if (typeof obj === 'object') {
		const result: FormDataRecord = {};
		for (const [key, value] of Object.entries(obj as FormDataRecord)) {
			if (PII_FIELDS[key] !== undefined) {
				// Apply the appropriate redaction function
				result[key] = PII_FIELDS[key](value);
			} else if (typeof value === 'object' && value !== null) {
				// Recurse into nested objects and arrays
				result[key] = deepStripPII(value);
			} else {
				result[key] = value;
			}
		}
		return result;
	}

	return obj;
}

// ============================================================================
// VALIDATE FILE INTEGRITY
// ============================================================================

/**
 * Recomputes SHA-256 of JSON.stringify(payload) and compares with expected hash.
 * Uses computePayloadHash from snapshotHelpers.
 * Returns true if hashes match (no tampering detected).
 */
export function validateFileIntegrity(payload: FormDataRecord, expectedHash: string): boolean {
	const computedHash = computePayloadHash(payload);
	return computedHash === expectedHash;
}
