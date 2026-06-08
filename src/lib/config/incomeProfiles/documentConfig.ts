/**
 * Document Upload Configuration
 * ═══════════════════════════════════════════════════════════════════
 * Maps income profile types and obligation types to their relevant
 * supporting documents. Each document has:
 *   - id: unique key for storage
 *   - label: display name
 *   - description: short explanation of what's needed
 *   - category: groups documents visually
 *   - required: whether it's mandatory (all are optional for applicant)
 *   - maxFiles: maximum number of files per document type
 *   - acceptedTypes: MIME types or extensions accepted
 *
 * DSA can toggle document upload visibility when generating share links.
 * All uploads are OPTIONAL and individually skippable by the applicant.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { IncomeProfileType } from '$lib/types/incomeProfile';

// ============================================================================
// DOCUMENT DEFINITION
// ============================================================================

export interface DocumentSpec {
	id: string;
	label: string;
	description: string;
	category:
		| 'income_proof'
		| 'tax_returns'
		| 'bank_statements'
		| 'business_docs'
		| 'obligation_docs'
		| 'identity';
	required: boolean;
	maxFiles: number;
	acceptedTypes: string[];
}

// ============================================================================
// COMMON ACCEPTED FILE TYPES
// ============================================================================

const PDF_IMAGE = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const PDF_ONLY = ['application/pdf'];
const PDF_IMAGE_EXCEL = [
	...PDF_IMAGE,
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// ============================================================================
// DOCUMENT SPECS PER INCOME PROFILE TYPE
// ============================================================================

const SALARIED_DOCUMENTS: DocumentSpec[] = [
	{
		id: 'salary_slips',
		label: 'Salary Slips (Last 3 months)',
		description: 'Monthly pay slips showing gross salary, deductions, and net pay',
		category: 'income_proof',
		required: false,
		maxFiles: 3,
		acceptedTypes: PDF_IMAGE
	},
	{
		id: 'form_16',
		label: 'Form 16 (Latest)',
		description: 'Annual TDS certificate from employer',
		category: 'tax_returns',
		required: false,
		maxFiles: 2,
		acceptedTypes: PDF_IMAGE
	},
	{
		id: 'itr_acknowledgement',
		label: 'ITR Acknowledgement',
		description: 'Income Tax Return filing acknowledgement (last 2 years)',
		category: 'tax_returns',
		required: false,
		maxFiles: 2,
		acceptedTypes: PDF_IMAGE
	},
	{
		id: 'bank_statement_salary',
		label: 'Salary Account Bank Statement',
		description: 'Last 6 months bank statement showing salary credits',
		category: 'bank_statements',
		required: false,
		maxFiles: 6,
		acceptedTypes: PDF_ONLY
	},
	{
		id: 'employment_letter',
		label: 'Employment / Offer Letter',
		description: 'Current employment confirmation or offer letter',
		category: 'income_proof',
		required: false,
		maxFiles: 1,
		acceptedTypes: PDF_IMAGE
	}
];

const BUSINESS_DOCUMENTS: DocumentSpec[] = [
	{
		id: 'itr_business',
		label: 'ITR with Computation (Last 2-3 years)',
		description: 'Income Tax Returns with computation of income',
		category: 'tax_returns',
		required: false,
		maxFiles: 3,
		acceptedTypes: PDF_ONLY
	},
	{
		id: 'balance_sheet',
		label: 'Balance Sheet & P/L Account',
		description: 'Audited or certified financial statements (last 2-3 years)',
		category: 'business_docs',
		required: false,
		maxFiles: 3,
		acceptedTypes: PDF_IMAGE_EXCEL
	},
	{
		id: 'gst_returns',
		label: 'GST Returns (Last 12 months)',
		description: 'GSTR-3B monthly returns',
		category: 'business_docs',
		required: false,
		maxFiles: 12,
		acceptedTypes: PDF_IMAGE_EXCEL
	},
	{
		id: 'bank_statement_business',
		label: 'Current Account Bank Statement',
		description: 'Last 12 months bank statement of business account',
		category: 'bank_statements',
		required: false,
		maxFiles: 12,
		acceptedTypes: PDF_ONLY
	},
	{
		id: 'business_registration',
		label: 'Business Registration Certificate',
		description: 'Shop & Establishment / Udyam / MSME certificate',
		category: 'business_docs',
		required: false,
		maxFiles: 1,
		acceptedTypes: PDF_IMAGE
	},
	{
		id: 'gst_certificate',
		label: 'GST Registration Certificate',
		description: 'GST registration certificate (if GST registered)',
		category: 'business_docs',
		required: false,
		maxFiles: 1,
		acceptedTypes: PDF_IMAGE
	}
];

const DIRECTOR_PARTNER_DOCUMENTS: DocumentSpec[] = [
	{
		id: 'itr_director',
		label: 'Personal ITR (Last 2-3 years)',
		description: 'Director/Partner personal income tax returns',
		category: 'tax_returns',
		required: false,
		maxFiles: 3,
		acceptedTypes: PDF_ONLY
	},
	{
		id: 'company_itr',
		label: 'Company/Firm ITR (Last 2-3 years)',
		description: 'Company or firm income tax returns',
		category: 'tax_returns',
		required: false,
		maxFiles: 3,
		acceptedTypes: PDF_ONLY
	},
	{
		id: 'company_financials',
		label: 'Audited Balance Sheet & P/L',
		description: 'Company/firm audited financial statements',
		category: 'business_docs',
		required: false,
		maxFiles: 3,
		acceptedTypes: PDF_IMAGE_EXCEL
	},
	{
		id: 'board_resolution',
		label: 'Board Resolution / Partnership Deed',
		description: 'Authorization to borrow or director appointment letter',
		category: 'business_docs',
		required: false,
		maxFiles: 1,
		acceptedTypes: PDF_IMAGE
	},
	{
		id: 'bank_statement_company',
		label: 'Company/Firm Bank Statement',
		description: 'Last 12 months bank statement',
		category: 'bank_statements',
		required: false,
		maxFiles: 12,
		acceptedTypes: PDF_ONLY
	}
];

const PROFESSIONAL_DOCUMENTS: DocumentSpec[] = [
	{
		id: 'practice_certificate',
		label: 'Practice Certificate / License',
		description: 'Professional license (e.g., Bar Council, MCI, ICAI certificate)',
		category: 'business_docs',
		required: false,
		maxFiles: 1,
		acceptedTypes: PDF_IMAGE
	},
	{
		id: 'itr_professional',
		label: 'ITR with Computation (Last 2-3 years)',
		description: 'Income Tax Returns showing professional income',
		category: 'tax_returns',
		required: false,
		maxFiles: 3,
		acceptedTypes: PDF_ONLY
	},
	{
		id: 'professional_financials',
		label: 'Balance Sheet & P/L (if applicable)',
		description: 'Financial statements of practice',
		category: 'business_docs',
		required: false,
		maxFiles: 3,
		acceptedTypes: PDF_IMAGE_EXCEL
	},
	{
		id: 'bank_statement_professional',
		label: 'Bank Statement (Last 12 months)',
		description: 'Primary bank account showing professional income',
		category: 'bank_statements',
		required: false,
		maxFiles: 12,
		acceptedTypes: PDF_ONLY
	}
];

const PENSION_DOCUMENTS: DocumentSpec[] = [
	{
		id: 'pension_letter',
		label: 'Pension Letter / PPO',
		description: 'Pension Payment Order or pension sanction letter',
		category: 'income_proof',
		required: false,
		maxFiles: 1,
		acceptedTypes: PDF_IMAGE
	},
	{
		id: 'pension_slip',
		label: 'Pension Slip (Last 3 months)',
		description: 'Monthly pension credit slips',
		category: 'income_proof',
		required: false,
		maxFiles: 3,
		acceptedTypes: PDF_IMAGE
	},
	{
		id: 'bank_statement_pension',
		label: 'Bank Statement showing Pension Credits',
		description: 'Last 6 months bank statement',
		category: 'bank_statements',
		required: false,
		maxFiles: 6,
		acceptedTypes: PDF_ONLY
	}
];

const RENTAL_DOCUMENTS: DocumentSpec[] = [
	{
		id: 'rent_agreement',
		label: 'Rent Agreement / Lease Deed',
		description: 'Registered or notarized rental agreement',
		category: 'income_proof',
		required: false,
		maxFiles: 2,
		acceptedTypes: PDF_IMAGE
	},
	{
		id: 'bank_statement_rent',
		label: 'Bank Statement showing Rent Credits',
		description: 'Last 6 months showing rental income credits',
		category: 'bank_statements',
		required: false,
		maxFiles: 6,
		acceptedTypes: PDF_ONLY
	}
];

const FREELANCE_DOCUMENTS: DocumentSpec[] = [
	{
		id: 'freelance_contracts',
		label: 'Contracts / Work Orders',
		description: 'Client contracts or work orders (any recent)',
		category: 'income_proof',
		required: false,
		maxFiles: 5,
		acceptedTypes: PDF_IMAGE
	},
	{
		id: 'freelance_invoices',
		label: 'Invoices (Last 6 months)',
		description: 'Invoices raised to clients',
		category: 'income_proof',
		required: false,
		maxFiles: 6,
		acceptedTypes: PDF_IMAGE
	},
	{
		id: 'bank_statement_freelance',
		label: 'Bank Statement (Last 6 months)',
		description: 'Showing freelance income credits',
		category: 'bank_statements',
		required: false,
		maxFiles: 6,
		acceptedTypes: PDF_ONLY
	}
];

const AGRICULTURE_DOCUMENTS: DocumentSpec[] = [
	{
		id: 'land_records',
		label: 'Land Ownership Records',
		description: '7/12 extract, Khata, Patta, or land registration',
		category: 'income_proof',
		required: false,
		maxFiles: 3,
		acceptedTypes: PDF_IMAGE
	},
	{
		id: 'crop_sale_receipts',
		label: 'Crop Sale Receipts / Mandi Records',
		description: 'Receipts from APMC mandi or direct buyers',
		category: 'income_proof',
		required: false,
		maxFiles: 5,
		acceptedTypes: PDF_IMAGE
	}
];

const INVESTMENT_DOCUMENTS: DocumentSpec[] = [
	{
		id: 'investment_statements',
		label: 'Investment Statements',
		description: 'Demat holding, mutual fund, FD statements',
		category: 'income_proof',
		required: false,
		maxFiles: 5,
		acceptedTypes: PDF_IMAGE
	},
	{
		id: 'dividend_certificates',
		label: 'Dividend / Interest Certificates',
		description: 'TDS certificates or dividend statements',
		category: 'income_proof',
		required: false,
		maxFiles: 5,
		acceptedTypes: PDF_IMAGE
	}
];

// ============================================================================
// OBLIGATION DOCUMENTS (common across all profiles)
// ============================================================================

export const OBLIGATION_DOCUMENTS: DocumentSpec[] = [
	{
		id: 'loan_statement',
		label: 'Loan Account Statement',
		description: 'Current outstanding statement from existing lender',
		category: 'obligation_docs',
		required: false,
		maxFiles: 5,
		acceptedTypes: PDF_IMAGE
	},
	{
		id: 'sanction_letter',
		label: 'Sanction Letter',
		description: 'Original sanction / approval letter of existing loan',
		category: 'obligation_docs',
		required: false,
		maxFiles: 5,
		acceptedTypes: PDF_IMAGE
	},
	{
		id: 'emi_debit_proof',
		label: 'EMI Debit Proof',
		description: 'Bank statement page showing EMI debits (last 6 months)',
		category: 'obligation_docs',
		required: false,
		maxFiles: 5,
		acceptedTypes: PDF_IMAGE
	},
	{
		id: 'foreclosure_letter',
		label: 'Foreclosure / NOC Letter',
		description: 'If any loan was recently closed, provide NOC',
		category: 'obligation_docs',
		required: false,
		maxFiles: 3,
		acceptedTypes: PDF_IMAGE
	}
];

// ============================================================================
// PROFILE → DOCUMENT MAPPING
// ============================================================================

/**
 * Get the list of relevant documents for a given income profile type.
 */
export function getDocumentsForProfile(profileType: IncomeProfileType): DocumentSpec[] {
	switch (profileType) {
		case 'salaried_regular':
		case 'salaried_contractual':
			return SALARIED_DOCUMENTS;

		case 'business_proprietorship':
			return BUSINESS_DOCUMENTS;

		case 'director_company':
		case 'business_partnership':
			return DIRECTOR_PARTNER_DOCUMENTS;

		case 'professional_practice':
			return PROFESSIONAL_DOCUMENTS;

		case 'pension':
			return PENSION_DOCUMENTS;

		case 'rental_income':
			return RENTAL_DOCUMENTS;

		case 'freelance_consulting':
			return FREELANCE_DOCUMENTS;

		case 'agriculture_income':
			return AGRICULTURE_DOCUMENTS;

		case 'investment_income':
			return INVESTMENT_DOCUMENTS;

		case 'no_current_income':
			return []; // No income documents needed

		default:
			return [];
	}
}

/**
 * Get ALL unique documents needed across all selected income profiles.
 * Deduplicates by document ID.
 */
export function getDocumentsForProfiles(profileTypes: IncomeProfileType[]): DocumentSpec[] {
	const seen = new Set<string>();
	const result: DocumentSpec[] = [];

	for (const type of profileTypes) {
		for (const doc of getDocumentsForProfile(type)) {
			if (!seen.has(doc.id)) {
				seen.add(doc.id);
				result.push(doc);
			}
		}
	}

	return result;
}

/**
 * Get category label for display
 */
export function getCategoryLabel(category: DocumentSpec['category']): string {
	const labels: Record<DocumentSpec['category'], string> = {
		income_proof: 'Income Proof',
		tax_returns: 'Tax Returns',
		bank_statements: 'Bank Statements',
		business_docs: 'Business Documents',
		obligation_docs: 'Obligation Documents',
		identity: 'Identity Documents'
	};
	return labels[category] || category;
}

/**
 * Group documents by category for display
 */
export function groupDocumentsByCategory(docs: DocumentSpec[]): Record<string, DocumentSpec[]> {
	const groups: Record<string, DocumentSpec[]> = {};

	for (const doc of docs) {
		const label = getCategoryLabel(doc.category);
		if (!groups[label]) groups[label] = [];
		groups[label].push(doc);
	}

	return groups;
}
