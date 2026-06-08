/**
 * PMS Legacy Comparison — field-by-field diff of PMS vs legacy rule doc
 * ══════════════════════════════════════════════════════════════════════
 * PURE FUNCTION — no DB writes. Loads the legacy ParsedLenderRuleDocument
 * for a given (lenderId, loanProduct), converts the PMS policy to the same
 * engine shape, and returns a LegacyDiscrepancy[] for each field that differs.
 *
 * Used by POST /api/pms/policies/[id]/legacy-compare.
 * Admin resolves discrepancies via POST /api/pms/policies/[id]/legacy-resolve.
 *
 * Comparison scope:
 *   - eligibility: CIBIL floor
 *   - foir: salaried cap, self-employed cap
 *   - roi: offer rate (midpoint)
 *   - tenure: max months, max age at maturity
 *   - fees: processing fee %
 *   - income: haircut per profile type
 *   - ltv: max LTV across all amount tiers
 * ══════════════════════════════════════════════════════════════════════
 */

import { LenderRuleArtifacts } from '$lib/database/mongo.js';
import type { PolicyDocument, LegacyDiscrepancy } from '$lib/config/pms/policyTypes.js';
import type {
	ParsedLenderRuleDocument,
	ParsedRule,
	ParsedIncomeRule
} from '$lib/ruleEngine/types.js';
import { pmsToEnginePolicy } from './pmsToEngineAdapter.js';
import logger from '$lib/server/logger.js';

// ─── Extracted parameter shape ────────────────────────────────────────────────

/**
 * Flat, comparable parameters extracted from a ParsedLenderRuleDocument.
 * All values are numbers (percentages, months, etc.) or null when absent.
 */
interface PolicyParams {
	cibilFloor: number | null;
	foirSalaried: number | null;
	foirSelfEmployed: number | null;
	roiOfferRate: number | null;
	maxTenureMonths: number | null;
	maxAgeAtMaturity: number | null;
	processingFeePercent: number | null;
	/** Map from income_profile_type to haircut_percent */
	incomeHaircuts: Record<string, number>;
	/** Max LTV values across amount tiers; each entry is the maxLtv for that tier */
	ltvTierMaxes: number[];
}

// ─── Parameter extraction helpers ────────────────────────────────────────────

/**
 * Find all parameter rules in a section matching a given parameter_key.
 */
function findParamRules(rules: ParsedRule[] | null, paramKey: string): ParsedRule[] {
	if (!rules) return [];
	return rules.filter((r) => r.tier === 'parameter' && r.parameter_key === paramKey);
}

/**
 * Returns the numeric parameter_value for the first matching rule, or null.
 */
function firstParamValue(rules: ParsedRule[] | null, paramKey: string): number | null {
	const match = findParamRules(rules, paramKey)[0];
	if (!match || typeof match.parameter_value !== 'number') return null;
	return match.parameter_value;
}

/**
 * Detects whether a FOIR parameter rule applies to salaried files.
 * The PMS adapter emits: { "==": [{ "var": "_computed._is_salaried_file" }, true] }
 * Some legacy docs use similar patterns. Heuristic: if applies_when JSON contains
 * the `_is_salaried_file` key and the `==` operator, it's the salaried cap.
 */
function isSalariedFoirRule(rule: ParsedRule): boolean {
	if (!rule.applies_when) return false;
	const json = JSON.stringify(rule.applies_when);
	return json.includes('_is_salaried_file') && json.includes('"=="');
}

/**
 * Detects whether a FOIR parameter rule applies to self-employed files.
 * Looks for `!=` or `!` operators on the same key.
 */
function isSelfEmployedFoirRule(rule: ParsedRule): boolean {
	if (!rule.applies_when) return false;
	const json = JSON.stringify(rule.applies_when);
	// Matches both the PMS "!=" form and legacy "!" negation forms
	return json.includes('_is_salaried_file') && (json.includes('"!="') || json.includes('"!"'));
}

/**
 * Extracts FOIR caps from the foir section.
 * - If two conditional rules exist and are distinguishable → returns separate values.
 * - If only one unconditional rule → uses it for both salaried and SE.
 * - Returns values as decimals (0.50 = 50%), matching the engine's parameter_value.
 */
function extractFoir(foirRules: ParsedRule[] | null): { salaried: number | null; se: number | null } {
	if (!foirRules) return { salaried: null, se: null };

	const caps = findParamRules(foirRules, 'max_foir');
	if (caps.length === 0) return { salaried: null, se: null };

	// Try to identify split salaried vs SE rules
	const salariedRule = caps.find(isSalariedFoirRule);
	const seRule = caps.find(isSelfEmployedFoirRule);

	if (salariedRule && seRule) {
		const salaried = typeof salariedRule.parameter_value === 'number' ? salariedRule.parameter_value : null;
		const se = typeof seRule.parameter_value === 'number' ? seRule.parameter_value : null;
		return { salaried, se };
	}

	// Single unconditional FOIR rule — same cap for all file types
	if (caps.length === 1) {
		const val = typeof caps[0].parameter_value === 'number' ? caps[0].parameter_value : null;
		return { salaried: val, se: val };
	}

	// Multiple rules but not distinguishable — pick min/max by convention (salaried is higher)
	const sorted = caps
		.filter((r) => typeof r.parameter_value === 'number')
		.sort((a, b) => (b.parameter_value as number) - (a.parameter_value as number));
	return {
		salaried: sorted[0] ? (sorted[0].parameter_value as number) : null,
		se: sorted[sorted.length - 1] ? (sorted[sorted.length - 1].parameter_value as number) : null
	};
}

/**
 * Extracts max LTV values from the ltv section, returning just the numeric caps.
 * Sorted ascending so tier-by-tier comparison aligns.
 */
function extractLtvMaxes(ltvRules: ParsedRule[] | null): number[] {
	if (!ltvRules) return [];
	return findParamRules(ltvRules, 'max_ltv')
		.filter((r) => typeof r.parameter_value === 'number')
		.map((r) => r.parameter_value as number)
		.sort((a, b) => a - b);
}

/**
 * Extracts income haircut percentages keyed by income_profile_type.
 * Excludes the '*' wildcard (not a specific profile type).
 */
function extractIncomeHaircuts(incomeRules: ParsedIncomeRule[] | null): Record<string, number> {
	if (!incomeRules) return {};
	const result: Record<string, number> = {};
	for (const rule of incomeRules) {
		if (rule.income_profile_type === '*') continue;
		result[rule.income_profile_type] = rule.haircut_percent;
	}
	return result;
}

/**
 * Extracts all comparable parameters from a ParsedLenderRuleDocument.
 */
function extractParams(doc: ParsedLenderRuleDocument): PolicyParams {
	const foir = extractFoir(doc.sections.foir);
	return {
		cibilFloor: doc.cibil_floor ?? null,
		foirSalaried: foir.salaried,
		foirSelfEmployed: foir.se,
		roiOfferRate: firstParamValue(doc.sections.roi, 'roi'),
		maxTenureMonths: firstParamValue(doc.sections.tenure, 'max_tenure_months'),
		maxAgeAtMaturity: firstParamValue(doc.sections.tenure, 'max_age_at_maturity'),
		processingFeePercent: firstParamValue(doc.sections.fees, 'processing_fee_percent'),
		incomeHaircuts: extractIncomeHaircuts(doc.sections.income_assessment),
		ltvTierMaxes: extractLtvMaxes(doc.sections.ltv)
	};
}

// ─── Discrepancy builder ──────────────────────────────────────────────────────

/**
 * Creates a LegacyDiscrepancy with status='pending' and no resolution.
 */
function makeDiscrepancy(field: string, legacyValue: unknown, pmsValue: unknown): LegacyDiscrepancy {
	return {
		field,
		legacyValue,
		pmsValue,
		resolution: 'pending',
		resolvedBy: null,
		resolvedAt: null,
		note: null
	};
}

/**
 * Rounds a number to 4 decimal places so floating-point drift doesn't create
 * false discrepancies (e.g. 0.5000000001 vs 0.5).
 */
function round4(n: number): number {
	return Math.round(n * 10000) / 10000;
}

function numericsDiffer(a: number | null, b: number | null): boolean {
	if (a === null && b === null) return false;
	if (a === null || b === null) return true;
	return round4(a) !== round4(b);
}

/**
 * Builds the discrepancy list by comparing legacy and PMS params field by field.
 * Only fields that differ produce a record — identical fields are omitted.
 */
function buildDiscrepancies(
	legacy: PolicyParams,
	pms: PolicyParams
): LegacyDiscrepancy[] {
	const out: LegacyDiscrepancy[] = [];

	// ── Scalar fields ──────────────────────────────────────────────────────────

	if (numericsDiffer(legacy.cibilFloor, pms.cibilFloor)) {
		out.push(makeDiscrepancy('eligibility.cibil_floor', legacy.cibilFloor, pms.cibilFloor));
	}

	if (numericsDiffer(legacy.foirSalaried, pms.foirSalaried)) {
		out.push(makeDiscrepancy('foir.salaried', legacy.foirSalaried, pms.foirSalaried));
	}

	if (numericsDiffer(legacy.foirSelfEmployed, pms.foirSelfEmployed)) {
		out.push(makeDiscrepancy('foir.selfEmployed', legacy.foirSelfEmployed, pms.foirSelfEmployed));
	}

	if (numericsDiffer(legacy.roiOfferRate, pms.roiOfferRate)) {
		out.push(makeDiscrepancy('roi.offerRate', legacy.roiOfferRate, pms.roiOfferRate));
	}

	if (numericsDiffer(legacy.maxTenureMonths, pms.maxTenureMonths)) {
		out.push(makeDiscrepancy('tenure.maxMonths', legacy.maxTenureMonths, pms.maxTenureMonths));
	}

	if (numericsDiffer(legacy.maxAgeAtMaturity, pms.maxAgeAtMaturity)) {
		out.push(makeDiscrepancy('tenure.maxAgeAtMaturity', legacy.maxAgeAtMaturity, pms.maxAgeAtMaturity));
	}

	if (numericsDiffer(legacy.processingFeePercent, pms.processingFeePercent)) {
		out.push(makeDiscrepancy('fees.processingFeePercent', legacy.processingFeePercent, pms.processingFeePercent));
	}

	// ── Income haircuts per profile type ───────────────────────────────────────

	const allProfileTypes = new Set([
		...Object.keys(legacy.incomeHaircuts),
		...Object.keys(pms.incomeHaircuts)
	]);

	for (const profileType of allProfileTypes) {
		const legacyHaircut = legacy.incomeHaircuts[profileType] ?? null;
		const pmsHaircut = pms.incomeHaircuts[profileType] ?? null;
		if (numericsDiffer(legacyHaircut, pmsHaircut)) {
			out.push(makeDiscrepancy(`income.haircut.${profileType}`, legacyHaircut, pmsHaircut));
		}
	}

	// ── LTV tiers — compare as a sorted array ───────────────────────────────────
	// Only flag if tier count or values differ. Reported as a single compound field.

	const ltvsDiffer =
		legacy.ltvTierMaxes.length !== pms.ltvTierMaxes.length ||
		legacy.ltvTierMaxes.some((v, i) => numericsDiffer(v, pms.ltvTierMaxes[i]));

	if (ltvsDiffer && (legacy.ltvTierMaxes.length > 0 || pms.ltvTierMaxes.length > 0)) {
		out.push(makeDiscrepancy('ltv.tierMaxValues', legacy.ltvTierMaxes, pms.ltvTierMaxes));
	}

	return out;
}

// ─── Legacy rule doc loader ───────────────────────────────────────────────────

/**
 * Loads the legacy ParsedLenderRuleDocument for a specific lender + loan product.
 *
 * Priority order:
 *   1. LenderRuleArtifacts MongoDB collection (live DB, active status)
 *   2. realBankRuleDocs.ts static fallback (covers the 7 seeded banks)
 *
 * Returns null if no legacy doc is found — caller should skip comparison.
 */
async function loadLegacyDoc(
	lenderId: string,
	loanProduct: string
): Promise<ParsedLenderRuleDocument | null> {
	// Try DB first — lender may have a compiled artifact
	try {
		const artifact = await LenderRuleArtifacts.findOne({
			lender_id: lenderId,
			status: 'active',
			loan_types: loanProduct
		});

		if (artifact?.json_logic) {
			const raw = artifact.json_logic as unknown as Partial<ParsedLenderRuleDocument>;
			const doc: ParsedLenderRuleDocument = {
				...raw,
				lender_id: raw.lender_id || artifact.lender_id,
				lender_name: raw.lender_name || artifact.lender_name,
				classification: raw.classification || artifact.classification || 'PVT',
				loan_types: raw.loan_types || artifact.loan_types || []
			} as ParsedLenderRuleDocument;
			if (doc.lender_id && doc.sections) return doc;
		}
	} catch (err) {
		logger.warn({ lenderId, loanProduct, err }, '[legacyCompare] DB lookup failed — trying static fallback');
	}

	// Try static bank rule docs (realBankRuleDocs.ts — 7 seeded banks)
	try {
		const realBankModule = await import('$lib/ruleEngine/realBankRuleDocs.js');
		const realBanks = realBankModule.ALL_REAL_BANK_RULE_DOCS as ParsedLenderRuleDocument[] | undefined;
		if (realBanks) {
			const match = realBanks.find(
				(d) => d.lender_id === lenderId && d.loan_types?.includes(loanProduct)
			);
			if (match) return match;
		}
	} catch {
		// Static module not available — expected in test environments
	}

	return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compares a published PMS policy against the legacy TS rule doc for the same
 * lender + product. Returns a LegacyDiscrepancy for each field that differs.
 *
 * Returns an empty array (not an error) when no legacy doc is found — caller
 * should surface this as "no legacy entry to compare against".
 */
export async function compareLegacyVsPms(
	lenderId: string,
	loanProduct: string,
	pmsDoc: PolicyDocument
): Promise<{ discrepancies: LegacyDiscrepancy[]; legacyFound: boolean }> {
	const legacyDoc = await loadLegacyDoc(lenderId, loanProduct);

	if (!legacyDoc) {
		logger.info(
			{ lenderId, loanProduct },
			'[legacyCompare] No legacy rule doc found — skipping comparison'
		);
		return { discrepancies: [], legacyFound: false };
	}

	// Convert PMS policy → engine shape (preserve lender meta from legacy)
	const pmsEngineDoc = pmsToEnginePolicy(pmsDoc, {
		lender_name: legacyDoc.lender_name,
		classification: legacyDoc.classification
	});

	const legacyParams = extractParams(legacyDoc);
	const pmsParams = extractParams(pmsEngineDoc);

	const discrepancies = buildDiscrepancies(legacyParams, pmsParams);

	logger.info(
		{ lenderId, loanProduct, discrepancyCount: discrepancies.length },
		'[legacyCompare] Comparison complete'
	);

	return { discrepancies, legacyFound: true };
}
