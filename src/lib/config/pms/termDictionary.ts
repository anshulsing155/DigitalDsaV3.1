/**
 * PMS Term Dictionary
 * ══════════════════════════════════════════════════════════════════
 * Maps natural-language bank policy terms to their canonical JSON-Logic
 * variable paths as used in the V3 evaluation engine.
 *
 * Used by AI pipeline Pass 1 (Normalize) and Pass 3 (Encode).
 *
 * Source: LOAN_POLICY_PARSER_SPEC_V7.md §"Key Mappings" + V3 rule engine
 * schema (payloadEnricher.ts, evaluationEngine.ts).
 *
 * Each entry carries:
 *   - canonicalVar  : exact variable name for JSON-Logic {"var": "..."}
 *   - section       : top-level policy section this variable lives in (for AI guidance)
 *   - aliases       : surface forms that appear in bank policy PDFs
 *   - notes         : disambiguation notes for the AI pipeline
 * ══════════════════════════════════════════════════════════════════
 */

export interface TermEntry {
	/** Exact variable name to use in {"var": "..."} — must match V3 payload keys */
	canonicalVar: string;
	/** Top-level policy section where this variable is evaluated */
	section:
		| 'eligibilityGates'
		| 'foirRules'
		| 'ltvRules'
		| 'roiRules'
		| 'multipleAppIncomeRules'
		| 'tenureRules'
		| 'geoRules'
		| 'computed'
		| 'applicantField';
	/** Bank policy surface forms that map to this variable */
	aliases: string[];
	/** Disambiguation notes for the AI pipeline */
	notes?: string;
}

/**
 * Primary term dictionary — indexed by canonical variable name.
 * AI pipeline uses `aliases` for fuzzy matching during Pass 1 normalization.
 */
export const TERM_DICTIONARY: Record<string, TermEntry> = {
	// ── Loan-level variables ──────────────────────────────────────────────────

	loanAmount: {
		canonicalVar: 'loanAmount',
		section: 'eligibilityGates',
		aliases: [
			'loan amount',
			'loan value',
			'loan quantum',
			'sanction amount',
			'sanctioned amount',
			'disbursement amount',
			'financing amount',
			'funded amount',
			'principal amount'
		]
	},

	loanTenure: {
		canonicalVar: 'loanTenure',
		section: 'tenureRules',
		aliases: [
			'loan tenure',
			'repayment period',
			'loan term',
			'tenor',
			'tenure',
			'repayment tenure',
			'loan period',
			'maximum tenure',
			'minimum tenure'
		]
	},

	// ── Property variables ────────────────────────────────────────────────────

	propCost: {
		canonicalVar: 'propCost',
		section: 'ltvRules',
		aliases: [
			'property cost',
			'property price',
			'property value',
			'property amount',
			'builder price',
			'agreement value',
			'cost of property'
		],
		notes:
			'Use propCost for Direct Sale (new builder/authority property). ' +
			'For generic "property value" without purchase-type context, use OR: ' +
			'{"or": [{"var": "propCost"}, {"var": "dealValue"}]}. ' +
			'Note: the "market value" alias was removed 2026-06-02 (ADR-0025) ' +
			'because Plot & Equity Loan now exposes `marketValue` as its own canonical key.'
	},

	dealValue: {
		canonicalVar: 'dealValue',
		section: 'ltvRules',
		aliases: [
			'deal value',
			'resale value',
			'resale price',
			'transaction value',
			'sale deed value',
			'sale consideration',
			'purchase price',
			'registered value'
		],
		notes:
			'Use dealValue for Resale (second-hand) properties. ' +
			'Application data has EITHER propCost OR dealValue — never both. ' +
			'For generic terms use OR operator with propCost.'
	},

	propertyValueAsPerATS: {
		canonicalVar: 'propertyValueAsPerATS',
		section: 'ltvRules',
		aliases: [
			'ATS value',
			'agreement to sale value',
			'ATS amount',
			'sale agreement value',
			'agreement consideration'
		],
		notes: 'Only applies to Resale. When ATS differs from deal value, bank may use lower.'
	},

	purchaseType: {
		canonicalVar: 'purchaseType',
		section: 'eligibilityGates',
		aliases: [
			'purchase type',
			'transaction type',
			'property transaction',
			'sale type',
			'acquisition type'
		],
		notes: 'Values: "Direct Sale" (new from builder/authority) or "Resale" (second-hand)'
	},

	constructionType: {
		canonicalVar: 'constructionType',
		section: 'eligibilityGates',
		aliases: [
			'construction type',
			'property type',
			'unit type',
			'dwelling type',
			'accommodation type'
		],
		notes: 'Values include: Flat, House, Floor, Plot, Commercial'
	},

	// ── Applicant credit variables ────────────────────────────────────────────

	creditScore: {
		canonicalVar: 'creditScore',
		section: 'eligibilityGates',
		aliases: [
			'CIBIL',
			'credit score',
			'bureau score',
			'CIBIL score',
			'credit rating',
			'TransUnion score',
			'Equifax score',
			'CRIF score',
			'Experian score',
			'credit bureau score',
			'consumer credit score'
		],
		notes: 'Numeric (300–900). Use minCibil for minimum threshold in eligibility gates.'
	},

	minCibil: {
		canonicalVar: 'minCibil',
		section: 'eligibilityGates',
		aliases: [
			'minimum CIBIL',
			'minimum credit score',
			'CIBIL cutoff',
			'credit score cutoff',
			'minimum bureau score',
			'minimum credit rating'
		],
		notes: 'Hard eligibility gate — applicant credit score must meet or exceed this value.'
	},

	isDefaulter: {
		canonicalVar: 'isDefaulter',
		section: 'eligibilityGates',
		aliases: [
			'defaulter',
			'loan defaulter',
			'SMA',
			'NPA',
			'written off',
			'settled',
			'credit default',
			'loan overdue',
			'delinquency',
			'days past due'
		],
		notes: 'String "Yes" or "No" — not a boolean.'
	},

	// ── Applicant income variables ────────────────────────────────────────────

	netIncome: {
		canonicalVar: 'netIncome',
		section: 'foirRules',
		aliases: [
			'net income',
			'take home salary',
			'in-hand salary',
			'net salary',
			'net monthly income',
			'take home pay',
			'net take home',
			'monthly net income',
			'net pay',
			'in-hand pay',
			'net earnings'
		],
		notes: 'Monthly net income after deductions. Used as basis for FOIR calculation.'
	},

	grossIncome: {
		canonicalVar: 'grossIncome',
		section: 'foirRules',
		aliases: [
			'gross income',
			'CTC',
			'cost to company',
			'gross salary',
			'annual CTC',
			'monthly gross',
			'total compensation',
			'gross monthly income',
			'gross pay',
			'pre-tax income',
			'total income',
			'declared income'
		],
		notes: 'Gross monthly income before deductions. Some lenders use gross for FOIR base.'
	},

	// ── Applicant demographic variables ──────────────────────────────────────

	age: {
		canonicalVar: 'age',
		section: 'eligibilityGates',
		aliases: [
			'age',
			'applicant age',
			'age at application',
			'borrower age',
			'current age'
		]
	},

	maxAge: {
		canonicalVar: 'maxAge',
		section: 'eligibilityGates',
		aliases: [
			'maximum age',
			'age limit',
			'retirement age',
			'maximum age at maturity',
			'age at loan maturity',
			'age at loan closure',
			'upper age limit'
		],
		notes: 'Age at loan maturity = age + tenure in years. Used in max age at closure rules.'
	},

	EmploymentType: {
		canonicalVar: 'EmploymentType',
		section: 'eligibilityGates',
		aliases: [
			'employment type',
			'employment category',
			'employment status',
			'nature of employment',
			'profession type',
			'income type',
			'salaried',
			'self-employed',
			'government employee',
			'private employee',
			'PSU employee'
		],
		notes:
			'Exact values (case-sensitive): "Employed(Government)", "Employed(PSU)", ' +
			'"Employed(Private)", "Self Employed Professional", "Self Employed Non Professional". ' +
			'Do not use abbreviations like "SE" or "SAL".'
	},

	ApplicantIsNRI: {
		canonicalVar: 'ApplicantIsNRI',
		section: 'eligibilityGates',
		aliases: [
			'NRI',
			'non-resident Indian',
			'non resident',
			'NRI applicant',
			'overseas applicant',
			'foreign resident',
			'NRI status',
			'resident status'
		],
		notes: 'String "Yes" or "No" — not a boolean.'
	},

	// ── Applicant relationship + property ownership ───────────────────────────

	relationshipType: {
		canonicalVar: 'relationshipType',
		section: 'multipleAppIncomeRules',
		aliases: [
			'relationship',
			'relation',
			'co-applicant relationship',
			'relationship with primary',
			'applicant relationship',
			'family relationship',
			'kinship'
		],
		notes:
			'Do not use: "Spouse", "Self", "Primary". Check exact enum values in schema. ' +
			'Common values include: "husband", "wife", "father", "mother", "son", "daughter", "brother", "sister".'
	},

	onProperty: {
		canonicalVar: 'onProperty',
		section: 'multipleAppIncomeRules',
		aliases: [
			'on property',
			'property owner',
			'co-owner',
			'property co-owner',
			'title holder',
			'property titleholder',
			'name on property',
			'ownership'
		],
		notes: 'String "Yes" or "No". Used to determine income inclusion in co-applicant scenarios.'
	},

	onEMI: {
		canonicalVar: 'onEMI',
		section: 'foirRules',
		aliases: [
			'on EMI',
			'EMI contributor',
			'EMI payer',
			'loan repayer',
			'EMI obligation',
			'contributing to repayment',
			'participating in repayment'
		],
		notes: 'String "Yes" or "No". Determines whether co-applicant\'s obligations are counted in FOIR.'
	},

	// ── Policy section keys (not {"var": "..."} targets — used as section identifiers) ──

	foirRules: {
		canonicalVar: 'foirRules',
		section: 'foirRules',
		aliases: [
			'FOIR',
			'DTI',
			'DBR',
			'debt burden ratio',
			'debt-to-income',
			'fixed obligation to income ratio',
			'EMI to income ratio',
			'obligation ratio',
			'EMI burden',
			'loan obligation',
			'debt service ratio',
			'DSR'
		],
		notes:
			'FOIR is a section, not a variable. Rules inside foirRules return a percentage. ' +
			'Do not use {"var": "foirRules"} — encode rules inside the foirRules array.'
	},

	ltvRules: {
		canonicalVar: 'ltvRules',
		section: 'ltvRules',
		aliases: [
			'LTV',
			'loan to value',
			'loan-to-value',
			'financing percentage',
			'LTV ratio',
			'advance percentage',
			'loan percentage',
			'maximum loan percentage',
			'LTV cap',
			'maximum financing'
		],
		notes:
			'LTV is a section, not a variable. Rules inside ltvRules return a percentage (0–100). ' +
			'Do not use {"var": "ltvRules"}.'
	},

	roiRules: {
		canonicalVar: 'roiRules',
		section: 'roiRules',
		aliases: [
			'ROI',
			'rate of interest',
			'interest rate',
			'lending rate',
			'loan rate',
			'applicable rate',
			'pricing',
			'spread',
			'risk premium',
			'ROI loading',
			'interest loading',
			'MCLR',
			'repo rate',
			'base rate'
		],
		notes:
			'ROI is a section, not a variable. Rules inside roiRules return a percentage (annualised). ' +
			'Do not use {"var": "roiRules"}.'
	},

	eligibilityGates: {
		canonicalVar: 'eligibilityGates',
		section: 'eligibilityGates',
		aliases: [
			'eligibility',
			'eligible',
			'qualified',
			'minimum requirement',
			'applicant criteria',
			'borrower criteria',
			'lending criteria',
			'acceptance criteria',
			'loan criteria'
		],
		notes:
			'Eligibility gates are boolean pass/fail rules. A failed gate disqualifies the applicant. ' +
			'Each rule returns true (eligible) or false (ineligible).'
	},

	multipleAppIncomeRules: {
		canonicalVar: 'multipleAppIncomeRules',
		section: 'multipleAppIncomeRules',
		aliases: [
			'club income',
			'combined income',
			'joint income',
			'co-applicant income',
			'income clubbing',
			'income combination',
			'multiple applicant income',
			'co-borrower income',
			'joint applicant income',
			'income addition'
		],
		notes:
			'Determines how incomes of multiple co-applicants are combined. ' +
			'Rules typically use map/sum over applicantData array. Ambiguous "club income" terms ' +
			'must be flagged in confirmationRequired — never guess percentages.'
	},

	// ── Plot & Equity Loan canonical fields (LEND-1 Phase 1c, ADR-0025) ──────

	marketValue: {
		canonicalVar: 'marketValue',
		section: 'ltvRules',
		aliases: [
			'market value',
			'appraised value',
			'fair market value',
			'lender valuation',
			'lender appraisal',
			'valuer estimate',
			'assessed market value'
		],
		notes:
			'Plot & Equity Loan only. Lender-appraised market value of the plot — ' +
			'forms the base for the overall sanction LTV (Rule 1) and the LAP-on-plot ' +
			'cap (Rule 3) in the 3-cap structure. Aliased in payload builder from ' +
			'`propCost` for Plot & Equity until form gets a dedicated question. ' +
			'See ADR-0025 and docs/specs/PLOT-EQUITY-LOAN-DESIGN.md §2 for the cap structure.'
	},

	registryValue: {
		canonicalVar: 'registryValue',
		section: 'ltvRules',
		aliases: [
			'registry value',
			'registered value',
			'stamp duty value',
			'circle rate value',
			'sale deed value',
			'agreement to sell value',
			'ATS value',
			'declared value',
			'documented value'
		],
		notes:
			'Plot & Equity Loan only. Value declared on the Agreement to Sell / ' +
			'registry document — drives the seller-disbursement cap (Rule 2 of the ' +
			'3-cap structure). Aliased in payload builder from `agreementSellValue` ' +
			'for Plot & Equity until form gets a dedicated question. ' +
			'See ADR-0025 and docs/specs/PLOT-EQUITY-LOAN-DESIGN.md §2.'
	},

	sellerCashComponent: {
		canonicalVar: 'sellerCashComponent',
		section: 'computed',
		aliases: [
			'seller cash component',
			'off-paper cash',
			'off-paper amount',
			"seller's cash demand",
			'unregistered cash portion',
			'cash difference'
		],
		notes:
			'Plot & Equity Loan only. Derived in payload builder: ' +
			'marketValue − registryValue. Quantifies the off-paper cash demand the ' +
			'buyer must satisfy outside of the registered transaction. Consumed by ' +
			'engine (Phase 2) for the 3-cap calculation and offer-card UI (Phase 4) ' +
			'for the buyer-net-out-of-pocket headline number.'
	}
};

/**
 * Flat alias→canonical lookup for O(1) normalization in AI pipeline Pass 1.
 * Populated at module load from TERM_DICTIONARY.
 */
export const ALIAS_TO_CANONICAL: Record<string, string> = Object.fromEntries(
	Object.values(TERM_DICTIONARY).flatMap((entry) =>
		entry.aliases.map((alias) => [alias.toLowerCase(), entry.canonicalVar])
	)
);

/**
 * Returns the canonical variable name for a bank policy term.
 * Returns null if the term is not in the dictionary (requires confirmationRequired).
 */
export function resolveAlias(term: string): string | null {
	return ALIAS_TO_CANONICAL[term.toLowerCase()] ?? null;
}

/**
 * Returns the full TermEntry for a canonical variable name.
 */
export function getTermEntry(canonicalVar: string): TermEntry | null {
	return TERM_DICTIONARY[canonicalVar] ?? null;
}
