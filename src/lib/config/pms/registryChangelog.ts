/**
 * PMS Registry Changelog — Append-Only Audit Log
 * ══════════════════════════════════════════════════════════════════
 * Records every change to keyRegistry.ts with who, when, and why.
 * Read by: /dashboard/admin/registry-health (changelog panel).
 * Enforced by: scripts/check-registry-integrity.cjs (CI Rule C).
 *
 * RULES:
 *   - One entry required per keyRegistry.ts change (add or deprecate)
 *   - Same commit as the registry change — CI fails if missing
 *   - Never delete entries — this is the permanent audit trail
 *   - Oldest entries first, newest last
 *
 * See: docs/specs/PMS-IMPLEMENTATION-PLAN.md §11.3
 * ══════════════════════════════════════════════════════════════════
 */

import type { LoanProduct } from '$lib/config/lenderPolicies/types';

export interface RegistryChangeEntry {
	/** The key path that was changed */
	key: string;
	action: 'added' | 'deprecated' | 'renamed' | 'enum_value_deprecated';
	/** ISO date string */
	at: string;
	/** Developer email or GitHub handle */
	by: string;
	/** Mandatory explanation — why was this change made */
	note: string;
	/** For deprecated/renamed — what key to use instead */
	replacedBy?: string;
	/** Which products are affected */
	affectedProducts?: LoanProduct[] | 'all';
	/** For enum_value_deprecated — the old value that is no longer valid */
	oldEnumValue?: string;
	/** For enum_value_deprecated — the new canonical value */
	newEnumValue?: string;
}

/**
 * The changelog. Append-only — never remove entries.
 * Add an entry here in the same commit as any keyRegistry.ts change.
 */
export const REGISTRY_CHANGELOG: RegistryChangeEntry[] = [

	// ── 2026-04-25 — Phase 11 founding entries ───────────────────────────────
	// All keys populated as part of Phase 11 (Form Key Lifecycle Management).
	// Sources: termDictionary.ts canonicalVar list + buildLoanPayload() + payloadEnricher.ts.

	{
		key: 'loanAmount',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — requested loan amount from form',
		affectedProducts: 'all'
	},
	{
		key: 'loanTenure',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — requested loan tenure in months from form',
		affectedProducts: 'all'
	},
	{
		key: 'propCost',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — full property cost for secured loans',
		affectedProducts: ['Home Loan', 'Loan Against Property', 'Plot and Construction Loan']
	},
	{
		key: 'dealValue',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — agreed deal value (sale deed value) for secured loans',
		affectedProducts: ['Home Loan', 'Loan Against Property', 'Plot and Construction Loan']
	},
	{
		key: 'propertyValueAsPerATS',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — Agreement to Sale value for valuation-based LTV rules',
		affectedProducts: ['Home Loan', 'Loan Against Property']
	},
	{
		key: 'purchaseType',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — property transaction type (new / resale / self-construction)',
		affectedProducts: ['Home Loan', 'Loan Against Property', 'Plot and Construction Loan']
	},
	{
		key: 'constructionType',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — structural type of the property',
		affectedProducts: ['Home Loan', 'Loan Against Property', 'Plot and Construction Loan']
	},
	{
		key: 'PropertyStage',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — construction progress stage (Home Loan only)',
		affectedProducts: ['Home Loan']
	},
	{
		key: 'propertyStateName',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — state name for geo eligibility rules in secured loans',
		affectedProducts: ['Home Loan', 'Loan Against Property', 'Plot and Construction Loan']
	},
	{
		key: 'propertyCityName',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — city name for geo eligibility rules in secured loans',
		affectedProducts: ['Home Loan', 'Loan Against Property', 'Plot and Construction Loan']
	},
	{
		key: 'creditScore',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — highest CIBIL score across all applicants (computed by payloadEnricher)',
		affectedProducts: 'all'
	},
	{
		key: 'isDefaulter',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — true if any applicant has a defaulter flag',
		affectedProducts: 'all'
	},
	{
		key: 'netIncome',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — total assessed net income after haircuts (computed by incomeAssessor)',
		affectedProducts: 'all'
	},
	{
		key: 'grossIncome',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — total gross income before haircuts (computed by incomeAssessor)',
		affectedProducts: 'all'
	},
	{
		key: 'age',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — per-applicant age in years (computed from DOB by payloadEnricher). The youngest applicant across the case lives in `_primary_age`.',
		affectedProducts: 'all'
	},
	{
		key: 'EmploymentType',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — primary applicant employment classification',
		affectedProducts: 'all'
	},
	{
		key: 'ApplicantIsNRI',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — true if any applicant is NRI (secured loans only)',
		affectedProducts: ['Home Loan', 'Loan Against Property', 'Plot and Construction Loan']
	},
	{
		key: 'gender',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — primary applicant gender (used for woman borrower rate concessions)',
		affectedProducts: 'all'
	},
	{
		key: 'relationshipType',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — co-applicant relationship to primary applicant',
		affectedProducts: 'all'
	},
	{
		key: 'onProperty',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — whether co-applicant is on the property title (secured loans)',
		affectedProducts: ['Home Loan', 'Loan Against Property', 'Plot and Construction Loan']
	},
	{
		key: 'onEMI',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — whether co-applicant contributes to EMI servicing',
		affectedProducts: 'all'
	},
	{
		key: '_computed._is_salaried_file',
		action: 'added',
		at: '2026-04-25',
		by: 'tech@digitaldsa.com',
		note: 'Phase 11 founding — true when all income-contributing applicants are salaried; drives FOIR branch selection in PMS adapter',
		affectedProducts: 'all'
	},

	// ── 2026-06-02 — LEND-1 Phase 1c (ADR-0025) ──────────────────────────────
	// Plot & Equity Loan canonical field names. Aliased in payload builder
	// from existing form answers (propCost, agreementSellValue) — see ADR-0025.
	{
		key: 'marketValue',
		action: 'added',
		at: '2026-06-02',
		by: 'tech@digitaldsa.com',
		note: 'LEND-1 Phase 1c (ADR-0025) — appraised market value for Plot & Equity Loan; aliased from propCost in payload builder',
		affectedProducts: ['Plot and Construction Loan']
	},
	{
		key: 'registryValue',
		action: 'added',
		at: '2026-06-02',
		by: 'tech@digitaldsa.com',
		note: 'LEND-1 Phase 1c (ADR-0025) — registry/stamp-duty value for Plot & Equity Loan; aliased from agreementSellValue in payload builder',
		affectedProducts: ['Plot and Construction Loan']
	},
	{
		key: 'sellerCashComponent',
		action: 'added',
		at: '2026-06-02',
		by: 'tech@digitaldsa.com',
		note: 'LEND-1 Phase 1c (ADR-0025) — off-paper cash demand from seller (= marketValue − registryValue); derived in payload builder for Plot & Equity Loan',
		affectedProducts: ['Plot and Construction Loan']
	}

];
