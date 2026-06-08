/**
 * Schema Bridge — Single source of truth for test data option values.
 *
 * Imports JSON config files and extracts valid option values at build time.
 * All generators import from here instead of using hardcoded values.
 *
 * JSON Schemas ──→ schemaExtractor.ts ──→ typed constants ──→ generators
 */

// Import from $lib/config/ (browser-safe mirror) so this module can be used
// in client-side code (e.g. test-dashboard). The server-side canonical copies
// under $lib/server/formEngine/schemas/ are kept in sync atomically.
import formSchema from '$lib/config/formSchema.json';
import applicantQuestion from '$lib/config/applicantQuestion.json';
import homeLoanSchema from '$lib/config/homeLoanSchema.json';

// ==================== HELPERS ====================

interface SchemaOption {
	label: string;
	value: string;
	flagKey?: Record<string, boolean>;
	showWhen?: unknown;
	[key: string]: unknown;
}

interface SchemaQuestion {
	id: string;
	options?: SchemaOption[];
	[key: string]: unknown;
}

interface SchemaPage {
	id: string;
	questions: SchemaQuestion[];
	[key: string]: unknown;
}

/**
 * Extract option values from a question by its ID within a questions array.
 */
function extractOptions(questions: SchemaQuestion[], questionId: string): string[] {
	const question = questions.find((q) => q.id === questionId);
	if (!question?.options) return [];
	return question.options.map((opt) => opt.value);
}

/**
 * Extract options with their flagKey metadata (for secured/unsecured classification).
 */
function extractOptionsWithFlags(questions: SchemaQuestion[], questionId: string): SchemaOption[] {
	const question = questions.find((q) => q.id === questionId);
	return question?.options ?? [];
}

// ==================== SCHEMA REFERENCES ====================

const formQuestions = formSchema.pages[0].questions as SchemaQuestion[];
const applicantQuestions = (applicantQuestion as { questions: SchemaQuestion[] }).questions;

// homeLoanSchema has nested pages — find the page containing q1_propertyType
const homeLoanQuestions = (homeLoanSchema as { pages: SchemaPage[] }).pages.flatMap(
	(page) => page.questions
) as SchemaQuestion[];

// ==================== LOAN NAMES ====================
// Canonical vocabulary (post-2026-05-31 rename — see ADR-0020):
//   loanName = the loan-product name ("Home Loan", "LAP", "Plot Loan", etc.)
//   loanType = the scope ("New Loan", "Balance Transfer Only", etc.)
// These constants list loan PRODUCT NAMES — extracted from q1_loanName.

/** All loan-product name values from formSchema.json q1_loanName */
export const LOAN_NAMES = extractOptions(formQuestions, 'q1_loanName') as readonly string[];

const loanOptionsWithFlags = extractOptionsWithFlags(formQuestions, 'q1_loanName');

/** Loan-product names flagged with isSecuredLoan: true */
export const SECURED_LOAN_NAMES = loanOptionsWithFlags
	.filter((opt) => opt.flagKey?.isSecuredLoan === true)
	.map((opt) => opt.value) as readonly string[];

/** Loan-product names flagged with isUnsecuredLoan: true */
export const UNSECURED_LOAN_NAMES = loanOptionsWithFlags
	.filter((opt) => opt.flagKey?.isUnsecuredLoan === true)
	.map((opt) => opt.value) as readonly string[];

// ==================== EMPLOYMENT TYPES ====================

/** All employment type values from applicantQuestion.json q_employmentType */
export const EMPLOYMENT_TYPES = extractOptions(
	applicantQuestions,
	'q_employmentType'
) as readonly string[];

/** Salaried employment types (start with "Salaried") */
export const SALARIED_TYPES = EMPLOYMENT_TYPES.filter((t) =>
	t.startsWith('Salaried')
) as readonly string[];

/** Self-employed employment types (start with "Self-employed") */
export const SELF_EMPLOYED_TYPES = EMPLOYMENT_TYPES.filter((t) =>
	t.startsWith('Self-employed')
) as readonly string[];

// ==================== GENDER ====================

/** Gender values from applicantQuestion.json q_gender */
export const GENDERS = extractOptions(applicantQuestions, 'q_gender') as readonly string[];

// ==================== MARITAL STATUS ====================

/** Marital status values from applicantQuestion.json q_maritalStatus */
export const MARITAL_STATUSES = extractOptions(
	applicantQuestions,
	'q_maritalStatus'
) as readonly string[];

// ==================== PROPERTY OWNERSHIP ====================

/** Property ownership type values from homeLoanSchema.json q1_propertyType */
export const PROPERTY_OWNERSHIP_TYPES = extractOptions(
	homeLoanQuestions,
	'q1_propertyType'
) as readonly string[];

// ==================== BUSINESS & PROFESSION TYPES ====================

/** Business type values from applicantQuestion.json q_businessType */
export const BUSINESS_TYPES = extractOptions(
	applicantQuestions,
	'q_businessType'
) as readonly string[];

/** Profession type values from applicantQuestion.json q_yourProfession */
export const PROFESSION_TYPES = extractOptions(
	applicantQuestions,
	'q_yourProfession'
) as readonly string[];

// ==================== RUNTIME DRIFT VALIDATION ====================

/**
 * Validates that schema-extracted values are non-empty and internally consistent.
 * Call from the Test Dashboard UI to detect unexpected schema changes.
 *
 * @returns Array of issues found. Empty array means no drift detected.
 */
export function validateSchemaAlignment(): { field: string; issue: string }[] {
	const issues: { field: string; issue: string }[] = [];

	// Check all constants are non-empty
	const checks: [string, readonly string[]][] = [
		['LOAN_NAMES', LOAN_NAMES],
		['SECURED_LOAN_NAMES', SECURED_LOAN_NAMES],
		['UNSECURED_LOAN_NAMES', UNSECURED_LOAN_NAMES],
		['EMPLOYMENT_TYPES', EMPLOYMENT_TYPES],
		['GENDERS', GENDERS],
		['MARITAL_STATUSES', MARITAL_STATUSES],
		['PROPERTY_OWNERSHIP_TYPES', PROPERTY_OWNERSHIP_TYPES],
		['BUSINESS_TYPES', BUSINESS_TYPES],
		['PROFESSION_TYPES', PROFESSION_TYPES]
	];

	for (const [field, values] of checks) {
		if (values.length === 0) {
			issues.push({
				field,
				issue: `No values extracted — schema question may have been removed or renamed`
			});
		}
	}

	// Secured + Unsecured should cover all loan names
	const classifiedLoans = [...SECURED_LOAN_NAMES, ...UNSECURED_LOAN_NAMES];
	for (const loan of LOAN_NAMES) {
		if (!classifiedLoans.includes(loan)) {
			issues.push({
				field: 'LOAN_NAMES',
				issue: `"${loan}" is not classified as secured or unsecured`
			});
		}
	}

	// Salaried + Self-employed should be subsets of EMPLOYMENT_TYPES
	for (const t of SALARIED_TYPES) {
		if (!EMPLOYMENT_TYPES.includes(t)) {
			issues.push({ field: 'SALARIED_TYPES', issue: `"${t}" not found in EMPLOYMENT_TYPES` });
		}
	}
	for (const t of SELF_EMPLOYED_TYPES) {
		if (!EMPLOYMENT_TYPES.includes(t)) {
			issues.push({ field: 'SELF_EMPLOYED_TYPES', issue: `"${t}" not found in EMPLOYMENT_TYPES` });
		}
	}

	return issues;
}
