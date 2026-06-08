/**
 * PMS Key Registry — Append-Only
 * ══════════════════════════════════════════════════════════════════
 * Maps every valid JSON-Logic `var` path to its type, products,
 * and lifecycle metadata. Used by:
 *   - AI pipeline Passes 1–3 (injected as schema context)
 *   - Condition builder (dropdown options)
 *   - Conflict checker (field path validation)
 *   - Registry integrity checker (stale key detection)
 *
 * RULES (enforced by CI — see scripts/check-registry-integrity.cjs):
 *   1. NEVER delete a row — mark deprecated instead
 *   2. Every change requires a matching entry in registryChangelog.ts
 *   3. Active keys whose bindsTo is absent from form config → CI fails
 *
 * See: docs/specs/PMS-IMPLEMENTATION-PLAN.md §Phase 11
 * ══════════════════════════════════════════════════════════════════
 */

import type { LoanProduct } from '$lib/config/lenderPolicies/types';

export interface KeyRegistryEntry {
	/** JSON-Logic var path — e.g. "creditScore", "EmploymentType", "propCost" */
	path: string;
	type: 'string' | 'number' | 'boolean' | 'enum' | 'string[]';
	/** Valid enum values — only for type: 'enum' */
	enumValues?: string[];
	/** Enum values that are deprecated but still present in published policies */
	deprecatedEnumValues?: string[];
	/** Which loan products this key is valid for */
	products: LoanProduct[] | 'all';
	/**
	 * form   = value comes from buildLoanPayload() / form answers
	 * computed = added by payloadEnricher.ts (derived, not a direct form answer)
	 * CI Rule B only scans form-sourced keys for bindsTo presence
	 */
	source: 'form' | 'computed';
	/**
	 * The form question's bindsTo key — used by CI Rule B to detect orphaned active keys.
	 * Leave as '' for computed keys (source: 'computed').
	 */
	bindsTo: string;
	/** ISO date string — when this key was first added */
	addedAt: string;
	/** ISO date string — when deprecated. null = currently active */
	deprecatedAt: string | null;
	deprecationReason: string | null;
	/** Path of the replacement key when deprecated due to rename/replacement */
	replacedBy: string | null;
}

// ── Secured loan product shorthand ───────────────────────────────────────────
const SECURED: LoanProduct[] = ['Home Loan', 'Loan Against Property', 'Plot and Construction Loan'];
const ALL_PRODUCTS = 'all' as const;

/**
 * The registry. Append-only — never remove entries.
 *
 * Sourced from: termDictionary.ts canonicalVar list + buildLoanPayload() +
 * payloadEnricher.ts enriched fields.
 *
 * Add new entries at the BOTTOM of this array. Never remove or reorder.
 */
export const KEY_REGISTRY: KeyRegistryEntry[] = [

	// ── Loan-level fields ─────────────────────────────────────────────────────

	{
		path: 'loanAmount',
		type: 'number',
		products: ALL_PRODUCTS,
		source: 'form',
		bindsTo: 'loanAmount',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},
	{
		path: 'loanTenure',
		type: 'number',
		products: ALL_PRODUCTS,
		source: 'form',
		bindsTo: 'loanTenure',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},

	// ── Property fields (secured loans only) ──────────────────────────────────

	{
		path: 'propCost',
		type: 'number',
		products: SECURED,
		source: 'form',
		// Form key is `propCost` (declared in homeLoan/questionBank/dealFinancials.ts
		// `bindsTo_template`). The earlier value `propertyCost` matched only the
		// legacy homeLoanSchema.json and would have failed CI Rule B.
		bindsTo: 'propCost',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},
	{
		path: 'dealValue',
		type: 'number',
		products: SECURED,
		source: 'form',
		bindsTo: 'dealValue',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},
	{
		path: 'propertyValueAsPerATS',
		type: 'number',
		products: ['Home Loan', 'Loan Against Property'],
		source: 'form',
		bindsTo: 'propertyValueAsPerATS',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},
	{
		path: 'purchaseType',
		type: 'enum',
		enumValues: ['new_construction', 'resale_normal', 'resale_premium', 'self_construction', 'plot_only'],
		products: SECURED,
		source: 'form',
		bindsTo: 'purchaseType',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},
	{
		path: 'constructionType',
		type: 'enum',
		enumValues: ['Flat', 'House', 'Floor', 'Villa', 'Plot', 'Commercial'],
		products: SECURED,
		source: 'form',
		bindsTo: 'constructionType',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},
	{
		path: 'PropertyStage',
		type: 'enum',
		enumValues: ['Under Construction', 'Ready to Move', 'Plot'],
		products: ['Home Loan'],
		source: 'form',
		bindsTo: 'PropertyStage',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},
	{
		path: 'propertyStateName',
		type: 'string',
		products: SECURED,
		source: 'form',
		bindsTo: 'propertyStateName',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},
	{
		path: 'propertyCityName',
		type: 'string',
		products: SECURED,
		source: 'form',
		bindsTo: 'propertyCityName',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},

	// ── Applicant credit fields ───────────────────────────────────────────────

	{
		path: 'creditScore',
		type: 'number',
		products: ALL_PRODUCTS,
		// Highest CIBIL across all applicants — enriched by payloadEnricher.ts
		source: 'computed',
		bindsTo: '',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},
	{
		path: 'isDefaulter',
		// payloadEnricher writes 'Yes' / 'No' strings (see derivation from
		// creditHistoryStatus + per-applicant creditHistory). Declared as enum so
		// the AI pipeline emits {"==":[{"var":"isDefaulter"},"Yes"]} not
		// {"==":[{"var":"isDefaulter"}, true]}.
		type: 'enum',
		enumValues: ['Yes', 'No'],
		products: ALL_PRODUCTS,
		// Derived in payloadEnricher.ts from creditHistoryStatus / creditHistory —
		// not a direct form bindsTo. CI Rule B skips computed keys.
		source: 'computed',
		bindsTo: '',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},

	// ── Applicant income fields ───────────────────────────────────────────────

	{
		path: 'netIncome',
		type: 'number',
		products: ALL_PRODUCTS,
		// Total assessed net income — computed by incomeAssessor.ts
		source: 'computed',
		bindsTo: '',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},
	{
		path: 'grossIncome',
		type: 'number',
		products: ALL_PRODUCTS,
		// Total gross income before haircuts — computed by incomeAssessor.ts
		source: 'computed',
		bindsTo: '',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},

	// ── Applicant personal fields ─────────────────────────────────────────────

	{
		path: 'age',
		type: 'number',
		products: ALL_PRODUCTS,
		// Per-applicant age in years — computed from each applicant's DOB by
		// payloadEnricher.ts. PMS rules like {">=":[{"var":"age"},21]} are
		// evaluated against each applicant's payload row. (The youngest applicant
		// across the case is held in `_primary_age`, a separate field.)
		source: 'computed',
		bindsTo: '',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},
	{
		path: 'EmploymentType',
		type: 'enum',
		enumValues: [
			'Salaried(Private)',
			'Salaried(Government)',
			'Self-employed(Professional)',
			'Self-employed(Businessman)',
			'Self-employed(Other)'
		],
		products: ALL_PRODUCTS,
		source: 'form',
		bindsTo: 'employmentType',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},
	{
		path: 'ApplicantIsNRI',
		type: 'boolean',
		products: SECURED,
		source: 'form',
		bindsTo: 'isNRI',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},
	{
		path: 'gender',
		type: 'enum',
		enumValues: ['Male', 'Female', 'Other'],
		products: ALL_PRODUCTS,
		source: 'form',
		bindsTo: 'gender',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},

	// ── Co-applicant relationship fields ──────────────────────────────────────

	{
		path: 'relationshipType',
		type: 'enum',
		enumValues: ['Spouse', 'Parent', 'Child', 'Sibling', 'Other'],
		products: ALL_PRODUCTS,
		source: 'form',
		// Form key is `yourRelationship` (declared in applicantQuestion.json
		// `bindsTo_template`). The earlier value `relationshipToMainApplicant`
		// matched no actual form field and would have failed CI Rule B.
		bindsTo: 'yourRelationship',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},
	{
		path: 'onProperty',
		type: 'enum',
		enumValues: ['Yes', 'No'],
		products: SECURED,
		source: 'form',
		bindsTo: 'onProperty',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},
	{
		path: 'onEMI',
		type: 'enum',
		enumValues: ['Yes', 'No'],
		products: ALL_PRODUCTS,
		source: 'form',
		bindsTo: 'onEMI',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},

	// ── Computed aggregate fields (payloadEnricher.ts) ────────────────────────

	{
		path: '_computed._is_salaried_file',
		type: 'boolean',
		products: ALL_PRODUCTS,
		// True when all income-contributing applicants are salaried. Used for FOIR branching.
		source: 'computed',
		bindsTo: '',
		addedAt: '2026-04-25',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},

	// ── Plot & Equity Loan canonical fields (LEND-1 Phase 1c, ADR-0025) ──
	// Aliased in payload builder from existing form answers (propCost,
	// agreementSellValue). Source is 'computed' because Plot Loan form has no
	// direct bindsTo for these names — CI Rule B correctly skips them. Engine
	// (Phase 2) and AI parser consume them as the unambiguous canonical names.
	{
		path: 'marketValue',
		type: 'number',
		products: ['Plot and Construction Loan'],
		source: 'computed',
		bindsTo: '',
		addedAt: '2026-06-02',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},
	{
		path: 'registryValue',
		type: 'number',
		products: ['Plot and Construction Loan'],
		source: 'computed',
		bindsTo: '',
		addedAt: '2026-06-02',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	},
	{
		path: 'sellerCashComponent',
		type: 'number',
		products: ['Plot and Construction Loan'],
		// Derived in payload builder: marketValue − registryValue. Surfaces
		// the off-paper cash demand from seller in Plot & Equity Loan deals.
		source: 'computed',
		bindsTo: '',
		addedAt: '2026-06-02',
		deprecatedAt: null,
		deprecationReason: null,
		replacedBy: null
	}

];

/**
 * Returns only active (non-deprecated) keys, optionally filtered by product.
 */
export function getActiveKeys(product?: LoanProduct): KeyRegistryEntry[] {
	return KEY_REGISTRY.filter(
		(entry) =>
			entry.deprecatedAt === null &&
			(product === undefined ||
				entry.products === 'all' ||
				(entry.products as LoanProduct[]).includes(product))
	);
}

/**
 * Returns the entry for a given path, or null if not found.
 */
export function getKeyEntry(path: string): KeyRegistryEntry | null {
	return KEY_REGISTRY.find((entry) => entry.path === path) ?? null;
}

/**
 * Checks whether a path is valid and active for a given product.
 * Used by conflict checker and condition builder validation.
 */
export function isValidActiveKey(path: string, product?: LoanProduct): boolean {
	const entry = getKeyEntry(path);
	if (!entry || entry.deprecatedAt !== null) return false;
	if (!product) return true;
	return entry.products === 'all' || (entry.products as LoanProduct[]).includes(product);
}
