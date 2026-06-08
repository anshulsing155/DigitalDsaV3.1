// ============================================================================
// RE-2: EVALUATION ENGINE — Core Orchestrator
// ============================================================================
// Main entry point: evaluatePayload(payload) returns LenderResultsData.
//
// Pipeline per lender:
//   1. Pre-checks (loan type match, applicant data)
//   2. Hard gates (eligibility, cibil, property, etc.)
//   3. Parameters (ROI, tenure, fees, LTV, FOIR caps)
//   4. Income assessment (multi-applicant, per-source haircuts)
//   5. Obligation load (term loans, credit lines, closing treatment)
//   6. Compute amounts (FOIR-eligible, LTV-capped, offered, EMI)
//   7. Deviations (failed gate recovery → RED to AMBER)
//   8. Traffic light assignment
// ============================================================================

import jsonLogic from 'json-logic-js';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder.js';
import type { LenderResultsData } from '$lib/types/lenderResults.js';
import { LenderRuleArtifacts } from '$lib/database/mongo.js';

import type {
	ParsedLenderRuleDocument,
	ParsedRule,
	ParsedDeviation,
	ParsedObligationRule,
	GateResult,
	AppliedDeviation,
	LenderEvaluation,
	GuarantorAssessment
} from './types.js';
import { ENRICHER_CREDIT_LINE_FACTOR } from './systemConfig.js';
import { HARD_GATE_SECTIONS, PARAMETER_SECTIONS } from './types.js';

import {
	isSecuredLoan,
	getMinimumLoanAmount,
	canonicalLoanName,
	REQUIRED_PARAMS,
	REQUIRED_PARAMS_SECURED,
	getFacilityConfig
} from './systemConfig.js';

import {
	calculateEMI,
	calculateFoirEligibleAmount,
	calculateCreditLineFoirEligibleLimit,
	calculateLtvCappedAmount,
	calculateOfferedAmount,
	determineEffectiveTenure
} from './emiCalculator.js';

import { computeObligationLoad, determineFoirCap } from './incomeAssessor.js';

import { assessIncomeV2 } from './incomeAssessorV2.js';
import { enrichPayload, type EnrichedPayload } from './payloadEnricher.js';
import { evaluateClassificationsForLender } from './lenderClassificationEvaluator.js';
import type { LenderClassification } from '$lib/types/policyEngine.js';
import { getCategoryDefaults } from '$lib/config/lenderPolicies/categoryDefaults.js';
import { applyOverride, LENDER_OVERRIDES } from '$lib/config/lenderPolicies/lenderOverrides.js';
import { suggestPrimaryApplicant } from './suggestPrimaryApplicant.js';
import { selectYoungest } from './applicantSelectors.js';

import { assignRatings, buildLenderResult, buildSummary } from './resultBuilder.js';
import logger from '$lib/server/logger.js';

// ============================================================================
// 0-A. PMS POLICY OVERRIDE — replace legacy rule docs with PMS published docs
// ============================================================================

/**
 * In-process TTL cache for PMS-derived rule docs.
 *
 * Key: `${lenderId}:${loanProduct}` (e.g. "hdfc-bank:Home Loan")
 * Value: { doc, cachedAt (ms epoch) }
 *
 * Why in-process and not Redis: this is the v1 approach. Serverless instances
 * don't share memory, so each instance caches independently. A 60-second TTL
 * keeps staleness bounded without hammering MongoDB on every request.
 *
 * Invalidation beyond TTL: `invalidatePmsCache()` is exported so that
 * policyService.ts can call it immediately after a publish or approve, giving
 * the first evaluation after publish a fresh lookup on this instance.
 */
interface PmsCacheEntry {
	doc: ParsedLenderRuleDocument;
	cachedAt: number;
}

const PMS_CACHE_TTL_MS = 60_000; // 60 seconds
const pmsCache = new Map<string, PmsCacheEntry>();

/** Evict cached entries for a specific lender+product pair (call on publish). */
export function invalidatePmsCache(lenderId: string, loanProduct: string): void {
	pmsCache.delete(`${lenderId}:${loanProduct}`);
}

/** Evict the entire PMS cache (call on admin bulk-approve or cron promotion). */
export function invalidateAllPmsCache(): void {
	pmsCache.clear();
}

/**
 * Batch-resolve published PMS policies for a set of lender IDs and replace
 * the corresponding entries in `ruleDocs` with PMS-derived rule documents.
 *
 * ONE MongoDB query for all lenders (uses $in on lenderId) — O(1) round-trips
 * regardless of how many lenders are in the batch.
 *
 * Cache-first: entries within TTL are served from the in-process cache without
 * hitting MongoDB. Only uncached lenders trigger a DB read.
 *
 * Preserves `lender_name` and `classification` from the legacy rule doc so
 * the adapter doesn't have to guess them from the lenderId string.
 *
 * Graceful: any error in PMS lookup falls back silently to the legacy doc —
 * the evaluation continues with zero regression for that lender.
 */
async function applyPmsOverrides(
	ruleDocs: ParsedLenderRuleDocument[],
	loanProduct: string
): Promise<ParsedLenderRuleDocument[]> {
	if (ruleDocs.length === 0) return ruleDocs;

	const now = Date.now();

	// Split lenders into cached vs. uncached
	const cachedByLenderId = new Map<string, ParsedLenderRuleDocument>();
	const uncachedLenderIds: string[] = [];

	for (const doc of ruleDocs) {
		const cacheKey = `${doc.lender_id}:${loanProduct}`;
		const entry = pmsCache.get(cacheKey);
		if (entry && now - entry.cachedAt < PMS_CACHE_TTL_MS) {
			cachedByLenderId.set(doc.lender_id, entry.doc);
		} else {
			uncachedLenderIds.push(doc.lender_id);
		}
	}

	// Batch-fetch uncached entries from PMS
	const pmsByLenderId = new Map<string, ParsedLenderRuleDocument>(cachedByLenderId);

	if (uncachedLenderIds.length > 0) {
		try {
			const { PmsLenderPolicies } = await import('$lib/database/mongo.js');
			const { pmsToEnginePolicy } = await import('$lib/server/pms/pmsToEngineAdapter.js');

			const pmsDocs = await PmsLenderPolicies.find(
				{
					lenderId: { $in: uncachedLenderIds },
					loanProduct: loanProduct as import('$lib/config/pms/policyTypes.js').PolicyDocument['loanProduct'],
					status: 'published'
				},
				{
					// Exclude large pipeline state — we only need sections + overrides + metadata
					projection: { pipelineState: 0, sourceDocument: 0 }
				}
			).toArray();

			for (const pmsDoc of pmsDocs) {
				// Find the legacy rule doc to preserve lender_name + classification
				const legacyDoc = ruleDocs.find((d) => d.lender_id === pmsDoc.lenderId);
				const lenderMeta = legacyDoc
					? { lender_name: legacyDoc.lender_name, classification: legacyDoc.classification }
					: undefined;

				const engineDoc = pmsToEnginePolicy(
					pmsDoc as import('$lib/config/pms/policyTypes.js').PolicyDocument,
					lenderMeta
				);

				// Populate cache
				const cacheKey = `${pmsDoc.lenderId}:${loanProduct}`;
				pmsCache.set(cacheKey, { doc: engineDoc, cachedAt: now });
				pmsByLenderId.set(pmsDoc.lenderId, engineDoc);

				logger.info(
					{ lenderId: pmsDoc.lenderId, loanProduct, pmsVersion: pmsDoc.version },
					'[EvaluationEngine] PMS policy override applied'
				);
			}
		} catch (err) {
			// Non-fatal: fall through to legacy rule docs for all uncached lenders
			logger.error({ err, loanProduct }, '[EvaluationEngine] PMS policy batch lookup failed');
		}
	}

	// Replace legacy docs with PMS-derived docs where available
	return ruleDocs.map((legacyDoc) => pmsByLenderId.get(legacyDoc.lender_id) ?? legacyDoc);
}

// ============================================================================
// 0. AUTO-SEED: Persist real bank rules to DB on first evaluation
// ============================================================================

/**
 * Track whether we've already attempted to auto-seed this process.
 * Only runs once per server restart — avoids repeated DB checks.
 */
let autoSeedAttempted = false;

/**
 * If the DB has no active rule documents, auto-seed the 7 real bank
 * lender rule docs in the background. This ensures a fresh DB gets
 * persisted rules without requiring an explicit admin action.
 *
 * Safe to call multiple times — gated by `autoSeedAttempted` flag
 * and the seed function itself uses upsert (idempotent).
 */
async function autoSeedIfEmpty(): Promise<void> {
	if (autoSeedAttempted) return;
	autoSeedAttempted = true;

	try {
		// Quick check: are there ANY active rule documents?
		const existingCount = await LenderRuleArtifacts.countDocuments({ status: 'active' });
		if (existingCount > 0) return; // DB already has rules — nothing to do

		// Lazy-import to avoid loading 2K+ lines of bank rules at startup
		const { seedRealBankRuleDocuments } = await import('./realBankRuleDocs.js');
		const result = await seedRealBankRuleDocuments();

		logger.info(
			{ inserted: result.inserted, skipped: result.skipped },
			'[EvaluationEngine] Auto-seeded real bank rule documents into empty DB'
		);
	} catch (seedError) {
		// Non-fatal: fallback to static docs will still work
		logger.warn(
			{ err: seedError },
			'[EvaluationEngine] Auto-seed failed (non-fatal — static fallback active)'
		);
	}
}

// ============================================================================
// 1. LOAD ACTIVE RULE DOCUMENTS
// ============================================================================

/**
 * In-process cache for legacy lender rule documents, keyed by loanName.
 * Mirrors the PMS cache pattern above:
 *   - 60-second TTL (same as PMS cache for consistency)
 *   - Per-instance (each warm Vercel function has its own copy)
 *   - Explicit invalidation via invalidateLenderRuleDocsCache(loanName)
 *     so admin writes that publish/edit a LenderRuleArtifact can purge
 *     the affected loanType immediately on this instance
 *
 * Why this matters for the 504 fight:
 *   loadActiveRuleDocuments was running on EVERY evaluation, hitting
 *   MongoDB for ~30 rule docs per call. With ~80-200ms cold round-trip
 *   on Atlas, that's a real slice of the cold path. After this cache,
 *   warm invocations skip the round-trip entirely and the second
 *   evaluation on the same warm instance saves 100-300ms.
 *
 * Why in-process and not Redis: v1, matches PMS cache rationale.
 * Serverless instances don't share memory; the TTL bounds staleness.
 */
interface LenderRuleDocsCacheEntry {
	docs: ParsedLenderRuleDocument[];
	cachedAt: number;
}

const LENDER_RULE_DOCS_CACHE_TTL_MS = 60_000; // 60 seconds
const lenderRuleDocsCache = new Map<string, LenderRuleDocsCacheEntry>();

/**
 * Evict cached rule docs for a specific loanName (call on publish/edit).
 * Pass no argument to clear everything.
 */
export function invalidateLenderRuleDocsCache(loanName?: string): void {
	if (loanName) {
		lenderRuleDocsCache.delete(loanName);
	} else {
		lenderRuleDocsCache.clear();
	}
}

/**
 * Query MongoDB for active rule artifacts that match the given loan type.
 * Returns parsed rule documents ready for evaluation.
 *
 * Cache-first: within TTL the same loanName returns immediately without
 * a MongoDB round-trip. Cold start still pays the full read (cache is
 * per-instance and warm-only). Admin writes that publish a new artifact
 * MUST call invalidateLenderRuleDocsCache(loanName) so the next eval
 * sees the fresh doc.
 */
export async function loadActiveRuleDocuments(
	loanName: string
): Promise<ParsedLenderRuleDocument[]> {
	const now = Date.now();
	const cached = lenderRuleDocsCache.get(loanName);
	if (cached && now - cached.cachedAt < LENDER_RULE_DOCS_CACHE_TTL_MS) {
		return cached.docs;
	}

	const artifacts = await LenderRuleArtifacts.find({
		status: 'active',
		loan_types: loanName
	}).toArray();

	const docs: ParsedLenderRuleDocument[] = [];

	for (const artifact of artifacts) {
		if (!artifact.json_logic) continue;
		const raw = artifact.json_logic as unknown as Partial<ParsedLenderRuleDocument>;
		// Ensure essential identity fields from artifact level (json_logic may not duplicate them)
		const doc: ParsedLenderRuleDocument = {
			...raw,
			lender_id: raw.lender_id || artifact.lender_id,
			lender_name: raw.lender_name || artifact.lender_name,
			classification: raw.classification || artifact.classification || 'PVT',
			loan_types: raw.loan_types || artifact.loan_types || []
		} as ParsedLenderRuleDocument;
		// Skip malformed rule documents — must have essential fields
		if (!doc.lender_id || !doc.lender_name || !doc.sections) continue;
		docs.push(doc);
	}

	lenderRuleDocsCache.set(loanName, { docs, cachedAt: now });
	return docs;
}

// ============================================================================
// 1b. FALLBACK: Static Rule Documents (when DB is empty)
// ============================================================================

/**
 * Load static sample + real-bank rule documents as a fallback.
 * Filters by loan type to match the same contract as loadActiveRuleDocuments.
 *
 * Tries real bank docs first (more realistic), then sample docs.
 * Both are gracefully optional — if their modules aren't available, skip.
 */
async function loadFallbackRuleDocuments(loanName: string): Promise<ParsedLenderRuleDocument[]> {
	const docs: ParsedLenderRuleDocument[] = [];

	// Try loading real bank rule documents (HDFC, ICICI, Axis, SBI, Bajaj, Tata, LIC)
	try {
		const realBankModule = await import('./realBankRuleDocs.js');
		const realBanks = realBankModule.ALL_REAL_BANK_RULE_DOCS as
			| ParsedLenderRuleDocument[]
			| undefined;
		if (realBanks) {
			for (const doc of realBanks) {
				if (doc.loan_types?.includes(loanName)) {
					docs.push(doc);
				}
			}
		}
	} catch {
		// Module not available — skip
	}

	// Try loading sample rule documents (Sample PVT, GOV, NBFC).
	// C.7: gated behind `dev`. In production these 3 hardcoded "Sample X
	// Bank" entries leaked into every evaluation result, sitting alongside
	// real lenders as if they were genuine — the audit's exact complaint
	// ("a real DSA could mistake xyz bank for a real lender"). The sample
	// docs are useful for dev exploration + unit tests, so they stay loaded
	// in dev environments.
	const { dev: isDev } = await import('$app/environment');
	if (isDev) {
		try {
			const sampleModule = await import('./sampleRuleDocs.js');
			const sampleDocs = [
				sampleModule.SAMPLE_PVT_BANK,
				sampleModule.SAMPLE_GOV_BANK,
				sampleModule.SAMPLE_NBFC
			] as ParsedLenderRuleDocument[];
			for (const doc of sampleDocs) {
				if (doc.loan_types?.includes(loanName)) {
					// Avoid duplicating a lender_id already loaded from real bank docs
					const alreadyLoaded = docs.some((d) => d.lender_id === doc.lender_id);
					if (!alreadyLoaded) {
						docs.push(doc);
					}
				}
			}
		} catch {
			// Module not available — skip
		}
	}

	return docs;
}

// ============================================================================
// 2. HARD GATE EVALUATION
// ============================================================================

/**
 * Evaluate all hard_gate rules across gate sections.
 * Returns per-rule pass/fail results.
 */
function evaluateHardGates(
	payload: LoanApplicationPayload,
	ruleDoc: ParsedLenderRuleDocument
): GateResult[] {
	const results: GateResult[] = [];

	for (const sectionName of HARD_GATE_SECTIONS) {
		const rules = ruleDoc.sections[sectionName as keyof typeof ruleDoc.sections] as
			| ParsedRule[]
			| null;
		if (!rules) continue;

		for (const rule of rules) {
			if (rule.tier !== 'hard_gate') continue;

			// Check applies_when condition — skip rule if condition not met
			if (rule.applies_when != null) {
				try {
					const applies = jsonLogic.apply(rule.applies_when, payload);
					if (!applies) continue;
				} catch (err) {
					logger.warn(
						{ err, rule_id: rule.rule_id, section: sectionName, check: 'applies_when' },
						'jsonLogic.apply failed on hard gate applies_when'
					);
					continue;
				}
			}

			// Evaluate the gate logic
			let passed = false;
			try {
				const result = jsonLogic.apply(rule.logic, payload);
				passed = !!result;
			} catch (err) {
				logger.warn(
					{ err, rule_id: rule.rule_id, section: sectionName, check: 'logic' },
					'jsonLogic.apply failed on hard gate logic'
				);
				passed = false;
			}

			results.push({
				rule_id: rule.rule_id,
				section: sectionName,
				passed,
				fail_message: passed ? undefined : rule.fail_message,
				fail_category: passed ? undefined : rule.fail_category,
				description: rule.description
			});
		}
	}

	return results;
}

// ============================================================================
// 3. PARAMETER EXTRACTION
// ============================================================================

/** Parameters extracted from rule documents. `undefined` = not provided by rules. */
interface ExtractedParameters {
	roi: number | undefined;
	maxLtv: number | undefined;
	maxLcr: number | undefined;
	maxFoir: number | undefined;
	maxTenureMonths: number | undefined;
	maxAgeAtMaturity: number | undefined;
	processingFeePercent: number | undefined;
	// ── Plot & Equity Loan 3-cap structure (LEND-1 Phase 2, ADR-0021) ──────
	// All three optional — absence means this lender doesn't offer Plot & Equity
	// Loan and the 3-cap math is skipped. Generic LTV/LCR still apply as fallback.
	/** X% of marketValue — overall sanction (Rule 1) */
	plotEquityOverallSanctionLtv: number | undefined;
	/** Y% of registryValue — seller disbursement cap (Rule 2) */
	plotEquitySellerDisbursementCapPercentOfRegistry: number | undefined;
	/** Z% of marketValue — LAP-on-plot cap for buyer cash (Rule 3) */
	plotEquityLapOnPlotCapPercentOfMarket: number | undefined;
}

/** Validated parameters — all required fields guaranteed present. */
interface ValidatedParameters {
	roi: number;
	maxLtv: number;
	maxFoir: number;
	maxTenureMonths: number;
	maxAgeAtMaturity: number;
	processingFeePercent: number | undefined;
}

/**
 * Extract parameter values from parameter-tier rules.
 * Last matching rule wins (most specific override).
 * Returns undefined for params not set by any rule — caller validates.
 */
function extractParameters(
	payload: LoanApplicationPayload,
	ruleDoc: ParsedLenderRuleDocument
): ExtractedParameters {
	// Start with undefined — no hardcoded defaults
	const params: ExtractedParameters = {
		roi: undefined,
		maxLtv: undefined,
		maxLcr: undefined,
		maxFoir: undefined,
		maxTenureMonths: undefined,
		maxAgeAtMaturity: undefined,
		processingFeePercent: undefined,
		plotEquityOverallSanctionLtv: undefined,
		plotEquitySellerDisbursementCapPercentOfRegistry: undefined,
		plotEquityLapOnPlotCapPercentOfMarket: undefined
	};

	for (const sectionName of PARAMETER_SECTIONS) {
		const rules = ruleDoc.sections[sectionName as keyof typeof ruleDoc.sections] as
			| ParsedRule[]
			| null;
		if (!rules) continue;

		for (const rule of rules) {
			if (rule.tier !== 'parameter') continue;

			// Check applies_when
			if (rule.applies_when != null) {
				try {
					const applies = jsonLogic.apply(rule.applies_when, payload);
					if (!applies) continue;
				} catch (err) {
					logger.warn(
						{ err, rule_id: rule.rule_id, section: sectionName, check: 'applies_when' },
						'jsonLogic.apply failed on parameter applies_when'
					);
					continue;
				}
			}

			// Evaluate logic — if it returns truthy, use parameter_value
			let logicResult: unknown;
			try {
				logicResult = jsonLogic.apply(rule.logic, payload);
			} catch (err) {
				logger.warn(
					{ err, rule_id: rule.rule_id, section: sectionName, check: 'logic' },
					'jsonLogic.apply failed on parameter logic'
				);
				continue;
			}

			if (!logicResult) continue;

			// Apply the parameter
			const key = rule.parameter_key;
			const value = rule.parameter_value;

			if (key === 'roi' && typeof value === 'number') {
				params.roi = value;
			} else if (key === 'max_ltv' && typeof value === 'number') {
				params.maxLtv = value;
			} else if (key === 'max_lcr' && typeof value === 'number') {
				params.maxLcr = value;
			} else if (key === 'max_foir' && typeof value === 'number') {
				params.maxFoir = value;
			} else if (key === 'max_tenure_months' && typeof value === 'number') {
				params.maxTenureMonths = value;
			} else if (key === 'max_age_at_maturity' && typeof value === 'number') {
				params.maxAgeAtMaturity = value;
			} else if (key === 'processing_fee_percent' && typeof value === 'number') {
				params.processingFeePercent = value;
			} else if (key === 'plot_equity_overall_sanction_ltv' && typeof value === 'number') {
				params.plotEquityOverallSanctionLtv = value;
			} else if (
				key === 'plot_equity_seller_disbursement_cap' &&
				typeof value === 'number'
			) {
				params.plotEquitySellerDisbursementCapPercentOfRegistry = value;
			} else if (key === 'plot_equity_lap_on_plot_cap' && typeof value === 'number') {
				params.plotEquityLapOnPlotCapPercentOfMarket = value;
			}
		}
	}

	// Also check FOIR rules via the dedicated evaluator
	const foirCap = determineFoirCap(payload, ruleDoc.sections.foir);
	if (foirCap !== null) {
		params.maxFoir = foirCap;
	}

	return params;
}

/**
 * Maps snake_case REQUIRED_PARAMS names to camelCase ExtractedParameters keys.
 * This mapping ensures validateParameters can look up the correct property.
 */
const PARAM_NAME_TO_KEY: Record<string, keyof ExtractedParameters> = {
	roi: 'roi',
	max_foir: 'maxFoir',
	max_tenure_months: 'maxTenureMonths',
	max_age_at_maturity: 'maxAgeAtMaturity',
	max_ltv: 'maxLtv'
};

/**
 * Validate that all required parameters were provided by rule documents.
 * Returns missing param names if any are undefined.
 */
function validateParameters(params: ExtractedParameters, secured: boolean): string[] {
	const missing: string[] = [];
	for (const paramName of REQUIRED_PARAMS) {
		const key = PARAM_NAME_TO_KEY[paramName];
		if (key && params[key] === undefined) {
			missing.push(paramName);
		}
	}
	if (secured) {
		for (const paramName of REQUIRED_PARAMS_SECURED) {
			const key = PARAM_NAME_TO_KEY[paramName];
			if (key && params[key] === undefined) {
				missing.push(paramName);
			}
		}
	}
	return missing;
}

// ============================================================================
// 4. DEVIATION CHECKING
// ============================================================================

/**
 * For each failed gate, check if any deviation covers it.
 * Returns list of applicable deviations.
 */
function checkDeviations(
	payload: LoanApplicationPayload,
	failedGateIds: string[],
	deviations: ParsedDeviation[] | null
): AppliedDeviation[] {
	if (!deviations || deviations.length === 0 || failedGateIds.length === 0) {
		return [];
	}

	const applied: AppliedDeviation[] = [];

	for (const deviation of deviations) {
		// Only consider deviations that cover a failed gate
		if (!failedGateIds.includes(deviation.deviates_from)) continue;

		// Evaluate deviation condition
		let conditionMet = false;
		try {
			conditionMet = !!jsonLogic.apply(deviation.condition, payload);
		} catch (err) {
			logger.warn(
				{ err, deviation_id: deviation.deviation_id, check: 'condition' },
				'jsonLogic.apply failed on deviation condition'
			);
			conditionMet = false;
		}

		if (!conditionMet) continue;

		applied.push({
			deviation_id: deviation.deviation_id,
			deviates_from: deviation.deviates_from,
			description: deviation.description,
			probability_modifier: deviation.probability_modifier,
			approval_authority: deviation.approval_authority
		});
	}

	return applied;
}

// ============================================================================
// 5. SINGLE LENDER EVALUATION
// ============================================================================

/**
 * Evaluate a single lender rule document against a payload.
 * This is a pure function (no DB access) — all data passed in.
 *
 * Optional `preEnrichedPayload`: when called from the batch evaluator,
 * enrichment is done once and passed in to avoid N redundant enrichPayload() calls.
 * External callers (tests, admin test page) omit this — enrichment runs per-call.
 */
export function evaluateLender(
	payload: LoanApplicationPayload,
	ruleDoc: ParsedLenderRuleDocument,
	preEnrichedPayload?: EnrichedPayload
): LenderEvaluation {
	const loanName = payload.loanTransaction.loanName;
	const applicants = payload.allApplicantDetails;
	const secured = isSecuredLoan(loanName);

	// -- Pre-check: loan type match --
	if (!ruleDoc.loan_types || !ruleDoc.loan_types.includes(loanName)) {
		return buildGreyEvaluation(ruleDoc, 'Loan type not supported by this lender');
	}

	// -- Pre-check: must have applicants --
	if (!applicants || applicants.length === 0) {
		return buildGreyEvaluation(ruleDoc, 'No applicant data available');
	}

	// -- Enrichment: reuse pre-enriched payload if provided, otherwise compute fresh --
	// Clone _computed for per-lender mutations (CIBIL scope override)
	const enrichedPayload = preEnrichedPayload
		? { ...preEnrichedPayload, _computed: { ...preEnrichedPayload._computed } }
		: enrichPayload(payload);

	// -- Per-lender classification: override stored classifications for this lender --
	const classificationOverrides = evaluateClassificationsForLender(
		applicants as unknown as Array<Record<string, unknown>>,
		ruleDoc.classification as LenderClassification,
		secured
	);

	// -- Post-enrichment: recompute _min_cibil based on lender's cibilScope --
	// The enricher computes _min_cibil from ALL applicants (including guarantors).
	// Most lenders only check co-applicants' CIBIL, so we always recompute here.
	// Default scope: 'all_co_applicants' (excludes guarantors).
	const cibilScope = ruleDoc.cibilScope ?? 'all_co_applicants';
	if (enrichedPayload._computed) {
		let scopeMinCibil = Infinity;
		for (let i = 0; i < applicants.length; i++) {
			const a = applicants[i];
			const cls =
				classificationOverrides.get(i) ??
				((a as unknown as Record<string, unknown>).applicantClassification as string | undefined);
			const cibil = a.creditScore ?? 0;
			if (cibil === 0) continue;

			const isFinancial =
				!cls ||
				cls === 'co_applicant_financial' ||
				cls === 'guarantor_financial' ||
				cls === 'non_applicant_full_financial';
			const isCoApplicant =
				!cls || cls === 'co_applicant_financial' || cls === 'co_applicant_non_financial';
			const isGuarantor = cls === 'guarantor_financial' || cls === 'guarantor_non_financial';
			const isNonApplicant =
				cls === 'non_applicant_full_financial' || cls === 'non_applicant_cibil_only';

			let include = false;
			if (cibilScope === 'financial_only') {
				include = isFinancial;
			} else if (cibilScope === 'all_including_guarantors') {
				include = true;
			} else {
				// Default: 'all_co_applicants' — includes financial + non-financial co-applicants,
				// excludes guarantors and non-applicants (they're not on the loan agreement)
				include = isCoApplicant && !isGuarantor && !isNonApplicant;
			}

			if (include && cibil < scopeMinCibil) {
				scopeMinCibil = cibil;
			}
		}
		if (scopeMinCibil !== Infinity) {
			enrichedPayload._computed._min_cibil = scopeMinCibil;
		}
	}

	// -- Pre-check: RERA gate for Under Construction without registration --
	// Banks (GOV/PVT) cannot process non-RERA under-construction properties.
	// Only NBFCs, HFCs, and SFBs can handle these cases.
	const BANK_CLASSIFICATIONS = new Set(['GOV', 'PVT']);
	if (enrichedPayload.isNonRERA_UC === 'Yes' && BANK_CLASSIFICATIONS.has(ruleDoc.classification)) {
		return buildGreyEvaluation(
			ruleDoc,
			'Under-construction property without RERA registration — banks cannot process (only NBFCs/HFCs)'
		);
	}

	// -- Pre-step: CIBIL floor from policy field --
	// If the rule doc specifies a cibil_floor, enforce it as a synthetic hard gate.
	// This allows per-lender CIBIL thresholds via the policy engine (not just JSON-Logic rules).
	const cibilFloor = ruleDoc.cibil_floor;
	const currentMinCibil = enrichedPayload._computed?._min_cibil ?? 0;
	if (cibilFloor && currentMinCibil > 0 && currentMinCibil < cibilFloor) {
		return buildGreyEvaluation(
			ruleDoc,
			`Minimum CIBIL score ${cibilFloor} required (applicant score: ${currentMinCibil})`
		);
	}

	// -- Step 1: Hard gates (use enriched payload so rules can reference _computed.*) --
	const gateResults = evaluateHardGates(enrichedPayload, ruleDoc);
	const failedGates = gateResults.filter((g) => !g.passed);
	const failedGateIds = failedGates.map((g) => g.rule_id);
	const allGatesPassed = failedGates.length === 0;

	// -- Step 2: Parameters --
	const rawParams = extractParameters(enrichedPayload, ruleDoc);

	// -- Step 2b: Validate required params — GREY if missing --
	const missingParams = validateParameters(rawParams, secured);
	if (missingParams.length > 0) {
		return buildGreyEvaluation(
			ruleDoc,
			`Incomplete lender configuration — missing ${missingParams.join(', ')} rules`
		);
	}
	// Safe cast: all required params are now guaranteed non-undefined
	const params: ValidatedParameters = {
		roi: rawParams.roi!,
		maxLtv: rawParams.maxLtv ?? 0,
		maxFoir: rawParams.maxFoir!,
		maxTenureMonths: rawParams.maxTenureMonths!,
		maxAgeAtMaturity: rawParams.maxAgeAtMaturity!,
		processingFeePercent: rawParams.processingFeePercent
	};

	// -- Step 3: Income assessment (V2 — per-entry multi-source) --
	const { totalAssessed, sources: incomeSources } = assessIncomeV2(
		applicants,
		ruleDoc.sections.income_assessment,
		enrichedPayload,
		classificationOverrides
	);

	// -- Step 4: Obligation load --
	const { totalMonthly: obligationMonthly, details: obligationDetails } = computeObligationLoad(
		applicants,
		ruleDoc.sections.obligation_treatment
	);

	// -- Step 5: Effective tenure --
	// Credit-line facilities have different tenure semantics:
	//   - OD/CC: annual renewal (12 months default)
	//   - DOD: drop-line period (typically 60 months)
	//   - Term Loan: standard age-at-maturity calculation
	// Use youngest applicant for age-at-maturity — maximizes available tenure
	const primaryAge =
		Number(selectYoungest(applicants as unknown as Record<string, unknown>[])?.age) || 30;
	const facilityType = enrichedPayload?._computed?._facility_type || '';
	const facilityConfig = getFacilityConfig(facilityType);
	const isCreditLine = enrichedPayload?._computed?._is_credit_line_facility === true;

	// Resolve the effective requested tenure (in years) for this evaluation.
	//
	// PITFALL: the payload builder stores `tenureYears` as `toNumber(mortgageYear)`,
	// which evaluates to `null` (or `NaN`) for the string `'MAX'`. The enricher
	// stamps `effectiveMortgageYear = 'MAX'` for that case — but the engine used
	// to read raw `tenureYears` only, so a DSA picking "Max possible" got a
	// silent 0 → MIN_TENURE_MONTHS floor (12 months) for every lender. Read
	// `effectiveMortgageYear` first; only fall back to raw `tenureYears` when
	// the enriched value is missing (Pitfall: MAX tenure silently 12mo, 2026-05-28).
	const ltExt = payload.loanTransaction as typeof payload.loanTransaction & {
		effectiveMortgageYear?: number | 'MAX';
	};
	const rawEffective = ltExt.effectiveMortgageYear;
	const rawTenureYears = payload.loanTransaction.tenureYears;
	const requestedYears: number =
		rawEffective === 'MAX'
			? params.maxTenureMonths / 12
			: typeof rawEffective === 'number' && Number.isFinite(rawEffective) && rawEffective > 0
				? rawEffective
				: typeof rawTenureYears === 'number' && Number.isFinite(rawTenureYears)
					? rawTenureYears
					: 0;

	let tenureMonths: number;
	if (isCreditLine && !facilityConfig.hasFixedEmi) {
		// For revolving facilities, tenure = facility period (not borrower age limited)
		// Use requested tenure if provided, otherwise use facility default
		const requestedTenureMonths = requestedYears * 12;
		tenureMonths = Math.min(
			requestedTenureMonths > 0 ? requestedTenureMonths : facilityConfig.defaultMaxTenureMonths,
			params.maxTenureMonths
		);
	} else {
		tenureMonths = determineEffectiveTenure(
			requestedYears,
			primaryAge,
			params.maxAgeAtMaturity,
			params.maxTenureMonths
		);
	}

	// -- Step 5b: Property age adjustment (secured loans only) --
	// Total property life (age + remaining tenure) shouldn't exceed 40 years.
	// Only applies to Home Loan and LAP where the property backs the loan.
	// Plot loans are new construction so property age is irrelevant.
	const PROPERTY_AGE_APPLICABLE_LOANS = ['Home Loan', 'Loan Against Property'];
	if (PROPERTY_AGE_APPLICABLE_LOANS.includes(loanName)) {
		const propertyAgeStr = payload.loanTransaction.propertyAge;
		if (propertyAgeStr) {
			// Map age range labels to midpoint estimates (years)
			const ageRangeMidpoints: Record<string, number> = {
				'0-5': 2,
				'6-10': 8,
				'11-15': 13,
				'16-20': 18,
				'21-25': 23,
				'26-30': 28,
				'30+': 35
			};
			const estimatedPropertyAge = ageRangeMidpoints[propertyAgeStr] ?? 0;

			// Typical lender limit: property life shouldn't exceed 40 years at loan maturity
			const maxPropertyLifeYears = 40;
			const maxTenureByPropertyAge = Math.max(5, maxPropertyLifeYears - estimatedPropertyAge) * 12; // convert to months

			if (tenureMonths > maxTenureByPropertyAge) {
				tenureMonths = maxTenureByPropertyAge;
			}
		}
	}

	// -- Step 6: Compute amounts --
	// Extract per-lender credit line factor from obligation rules; fallback to 5% default
	const creditLineRule = (ruleDoc.sections.obligation_treatment ?? []).find(
		(r: ParsedObligationRule) => r.obligation_type === 'credit_line'
	);
	const creditLineFactor =
		creditLineRule?.treatment.credit_line_factor ??
		(facilityConfig.defaultFoirFactor || ENRICHER_CREDIT_LINE_FACTOR);

	// Flexi DOD (P8): the first 2 years are interest-only, so the FOIR-relevant
	// monthly burden is just interest on the limit (≈ limit × monthly rate) — NOT
	// the flat 5%-of-limit proxy used for OD/CC/DOD. Use the monthly interest rate
	// as the effective factor so BOTH eligibility (headroom ÷ factor) and the EMI
	// proxy reflect interest-only. For every other facility this is unchanged.
	const isFlexiDod = facilityType === 'Flexi Drop-line OverDraft (Flexi DOD)';
	const effectiveCreditLineFactor =
		isFlexiDod && params.roi > 0 ? params.roi / 100 / 12 : creditLineFactor;

	// ╔════════════════════════════════════════════════════════════════════════
	// ║ KNOWN LIMITATION — current engine assumes UNIFORM dual-tenure for all
	// ║ BT+Top-up lenders. Real lenders differ. See PITFALLS.md #67 + ADR-0024.
	// ║
	// ║ The dual-tenure block below was introduced by Audit BUG-E (2026-05-28)
	// ║ to fix a real ~₹12k/mo EMI under-statement at lenders whose BACKEND
	// ║ keeps the BT portion and Top-up portion as TWO SEPARATE LOANS with
	// ║ different tenures. For those lenders dual-tenure math is correct and
	// ║ this fix lights cases AMBER/RED that single-tenure math missed.
	// ║
	// ║ HOWEVER — per ADR-0024 (S213, 2026-06-02) the bank-side reality is
	// ║ NOT universal. Some lenders open ONE combined backend loan with a
	// ║ single tenure → single-tenure math is correct for them and the
	// ║ current code OVER-states EMI by the same delta in the opposite
	// ║ direction. And some lenders pick conditionally per case (e.g. when
	// ║ the customer's base tenure fits within the top-up tenure cap, they
	// ║ collapse to single; when it exceeds, they split).
	// ║
	// ║ FUTURE FIX (deferred — not implemented in S213, design preserved):
	// ║ Add `bt_topup_treatment` to `ParsedLenderRuleDocument` (top-level,
	// ║ alongside `cibilScope` / `cibil_floor` / `guarantor_acceptance`):
	// ║
	// ║   bt_topup_treatment?:
	// ║     | 'single_tenure'
	// ║     | 'dual_tenure'
	// ║     | { single_when: object /* JSON-Logic over payload */ };
	// ║
	// ║ Resolve to a static mode per (case, lender) pair before computing
	// ║ `dualTenureEligible`. Static string forms are sugar for static
	// ║ "always single" / "always dual" lenders; the object form lets a
	// ║ lender express its conditional collapse rule (most commonly: collapse
	// ║ when `loanTransaction.newTenure ≤ loanTransaction.topUpTenure * 12`).
	// ║ Default to current behavior (`'dual_tenure'`) when missing, with an
	// ║ info-level log per lender so operators can identify which lenders
	// ║ still need audit classification.
	// ║
	// ║ Why deferred: the field is only useful once each lender's actual
	// ║ backend treatment is audited and recorded. Until that lender-policy
	// ║ audit happens, the flag does nothing but add a complexity scaffold.
	// ║ Logged to TECH-DEBT-CLEANUP-2026-05-31 §6 (incoming debt) with the
	// ║ full design preserved so a future session can ship the engine change
	// ║ as a focused refactor alongside the lender audit.
	// ╚════════════════════════════════════════════════════════════════════════
	//
	// Audit BUG-E (2026-05-28): dual-tenure modeling for hybrid BT+Top-up.
	// The BT base portion (= principalOutstanding, inherited verbatim by the
	// takeover lender) and the Top-up portion (= topUpAmount, lender's
	// discretion) typically amortize over DIFFERENT tenures — base over
	// remainingTenure / newTenure (usually 15-20 yr), top-up over
	// topUpTenure (usually 3-7 yr). Today's engine squishes the combined
	// principal under one tenureMonths, which under-states EMI (and thus
	// over-states FOIR eligibility) when the top-up runs shorter than the
	// base. The fix splits both the FOIR-eligible reverse-solve and the
	// final EMI into two pieces and sums them.
	//
	// Gating: applies ONLY when loanType === 'Balance Transfer With Top-up' AND all four
	// inputs (principalOutstanding, topUpAmount, base tenure, top-up
	// tenure) are present and positive. Any missing input falls back to
	// today's single-tenure code path with a `logger.warn` so the operator
	// sees if the fallback is firing in prod (which means a payload-builder
	// bug, not a normal scenario). Defensive — never worse than today.
	//
	// Unit notes:
	//   • remainingTenure / newTenure are stored in MONTHS (schema gates
	//     12-420 months in homeLoanSchemaV2.json q8_remainingTenure)
	//   • topUpTenure is stored in YEARS (schema options "10 yrs" /
	//     "15 yrs" / "20 yrs" in q4_topUpTenure)
	const lt = payload.loanTransaction;
	// Canonical post-2026-05-31-rename scope value emitted by the form +
	// payload builder (see loanTransaction.ts:70). The pre-rename string
	// 'BT + Top-up' was a UI abbreviation (see CaseRouteSummary.svelte:15)
	// that never matched the stored scope, so the dual-tenure path was
	// silently dead in production until this fix.
	const isBTTopUp = String(lt.loanType ?? '') === 'Balance Transfer With Top-up';
	const baseBtPrincipal = lt.principalOutstanding ?? 0;
	const topUpAmountReq = lt.topUpAmount ?? 0;
	// Prefer newTenure (the DSA-chosen extended tenure for the takeover loan)
	// over remainingTenure (the residual under the current lender). Both
	// are months; either suffices for the base BT amortization curve.
	const newTenureMonthsLt =
		typeof lt.newTenure === 'number' && lt.newTenure > 0 ? lt.newTenure : undefined;
	const remainingTenureMonthsLt =
		typeof lt.remainingTenure === 'number' && lt.remainingTenure > 0 ? lt.remainingTenure : undefined;
	const baseBtTenureMonths = newTenureMonthsLt ?? remainingTenureMonthsLt;
	const topUpTenureYearsLt =
		typeof lt.topUpTenure === 'number' && lt.topUpTenure > 0 ? lt.topUpTenure : undefined;
	const topUpTenureMonths =
		topUpTenureYearsLt !== undefined ? Math.round(topUpTenureYearsLt * 12) : undefined;

	const dualTenureEligible =
		isBTTopUp &&
		!isCreditLine &&
		baseBtPrincipal > 0 &&
		topUpAmountReq > 0 &&
		baseBtTenureMonths !== undefined &&
		topUpTenureMonths !== undefined;

	if (isBTTopUp && !isCreditLine && !dualTenureEligible) {
		// Surface the fallback so operator notices if a payload-builder
		// regression starts dropping these fields. Silent fallback would
		// over-state eligibility on BT+Top-up cases without a trace.
		const missing: string[] = [];
		if (baseBtPrincipal <= 0) missing.push('principalOutstanding');
		if (topUpAmountReq <= 0) missing.push('topUpAmount');
		if (baseBtTenureMonths === undefined) missing.push('newTenure/remainingTenure');
		if (topUpTenureMonths === undefined) missing.push('topUpTenure');
		logger.warn(
			{ lender_id: ruleDoc.lender_id, loanType: 'Balance Transfer With Top-up', missing },
			'[EvaluationEngine] BUG-E: BT+Top-up dual-tenure inputs incomplete — falling back to single-tenure FOIR/EMI'
		);
	}

	// Base-BT EMI is also reused in the EMI step below; compute once.
	const baseBtEmi = dualTenureEligible
		? calculateEMI(baseBtPrincipal, params.roi, baseBtTenureMonths!)
		: 0;

	let foirEligibleAmount: number;
	if (isCreditLine) {
		// OD/CC/DOD: FOIR eligible = headroom / credit line factor
		// DOD could use declining balance, but banks still count % of limit in FOIR.
		// Flexi DOD uses the monthly-rate factor (interest-only) via effectiveCreditLineFactor.
		foirEligibleAmount = calculateCreditLineFoirEligibleLimit(
			totalAssessed,
			params.maxFoir,
			obligationMonthly,
			effectiveCreditLineFactor
		);
	} else if (dualTenureEligible) {
		// BT+Top-up dual-tenure: base BT principal is FIXED (lender inherits
		// principalOutstanding exactly). Its EMI loads against FOIR before
		// the lender can extend any top-up. The top-up portion is the
		// lender's discretion — reverse-solve over topUpTenure with the
		// base BT EMI added to obligations.
		//
		// If baseBtEmi alone exceeds FOIR headroom, calculateFoirEligibleAmount
		// returns 0 → foirEligibleAmount = baseBtPrincipal. Combined with the
		// requested = baseBtPrincipal + topUpAmount, offered gets capped at
		// baseBtPrincipal, the case lights AMBER (or RED via the floor), and
		// the lender effectively says "BT only, no top-up". Correct outcome.
		const topUpFoirEligible = calculateFoirEligibleAmount(
			totalAssessed,
			params.maxFoir,
			obligationMonthly + baseBtEmi,
			params.roi,
			topUpTenureMonths!
		);
		foirEligibleAmount = baseBtPrincipal + topUpFoirEligible;
	} else {
		// Term Loan single-tenure: standard reverse-EMI from FOIR headroom.
		// Hit for every non-BT+Top-up term loan AND for BT+Top-up cases
		// where the dual-tenure inputs are incomplete (warn-logged above).
		foirEligibleAmount = calculateFoirEligibleAmount(
			totalAssessed,
			params.maxFoir,
			obligationMonthly,
			params.roi,
			tenureMonths
		);
	}

	let ltvCappedAmount: number | undefined;
	let ltv: number | undefined;
	if (secured) {
		const propertyCost = payload.loanTransaction.propertyCost ?? 0;
		// V2 three-cost model: use marketValue for LTV; V1/LAP fallback: use atsValue
		const marketValue = payload.loanTransaction.marketValue;
		const atsValue = payload.loanTransaction.atsValue;
		const comparisonValue = marketValue && marketValue > 0 ? marketValue : atsValue;
		ltvCappedAmount = calculateLtvCappedAmount(params.maxLtv, propertyCost, comparisonValue);

		// Audit BUG-F (2026-05-28): Top-up Only total-exposure subtraction.
		// For Top-up Only, the existing loan with the EXISTING lender STAYS in
		// place — the top-up disbursement is ON TOP of the outstanding principal.
		// Total exposure (existing + new top-up) must stay within the property's
		// LTV cap, so the cap available to the top-up is
		// `overallLtvCap - principalOutstanding`. Request a ₹20L top-up on a ₹60L
		// property with ₹30L outstanding at 80% maxLtv: available headroom is
		// ₹48L − ₹30L = ₹18L, not ₹48L; engine must offer 18L (AMBER) not 20L.
		//
		// NOT applied to BT-Only (the new loan REPLACES the outstanding —
		// exposure is a swap, not an addition) or BT+Top-up (the takeover pays
		// off the existing principal, so the new combined loan is the only
		// exposure — Session 2's loanAmount fix already sums it as
		// principalOutstanding + topUpAmount, and standard LTV applies). The
		// audit's recommendation text grouped BT+Top-up here but the audit's own
		// spot-check math doesn't subtract for BT+Top-up — followed the math.
		//
		// Plot Loan Top-up: routed via `loanType = 'Top-up Only'` too, so the
		// same branch catches every loan family — scope is unified under loanType
		// post-rename (no PlotLoanActivity special-case needed).
		const ltLower = String(payload.loanTransaction.loanType ?? '');
		const isPureTopUpOnly = ltLower === 'Top-up Only';
		if (isPureTopUpOnly && ltvCappedAmount !== undefined) {
			const baseOutstanding = payload.loanTransaction.principalOutstanding ?? 0;
			ltvCappedAmount = Math.max(0, ltvCappedAmount - baseOutstanding);
		}

		// Compute actual LTV ratio: propertyValue = min(marketValue/atsValue, propertyCost)
		const propertyValue =
			comparisonValue && comparisonValue > 0
				? Math.min(propertyCost, comparisonValue)
				: propertyCost;
		if (propertyValue > 0) {
			ltv = payload.loanTransaction.loanAmount / propertyValue;
		}
	}

	// -- Step 6b: LCR computation (mirrors LTV for registry-based cap) --
	const registryValue = payload.loanTransaction.registryValue ?? 0;
	// LCR: use rule doc value, else failsafe 90%. Never exceed max_ltv.
	const LCR_FAILSAFE = 90;
	const lcrFromRuleDoc = rawParams.maxLcr;
	const lcrIsFailsafe = lcrFromRuleDoc === undefined;
	let effectiveLcr: number | undefined;
	if (lcrFromRuleDoc !== undefined) {
		effectiveLcr =
			rawParams.maxLtv !== undefined ? Math.min(lcrFromRuleDoc, rawParams.maxLtv) : lcrFromRuleDoc;
	} else if (rawParams.maxLtv !== undefined) {
		effectiveLcr = Math.min(LCR_FAILSAFE, rawParams.maxLtv);
	} else {
		effectiveLcr = undefined; // no LTV either → can't compute LCR
	}
	let lcrCappedAmount: number | undefined;
	const advanceInAgreement = payload.loanTransaction.advanceInAgreement ?? 0;
	if (secured && registryValue > 0 && effectiveLcr !== undefined && effectiveLcr > 0) {
		// LCR amount = (registryValue × lcrPercent) - advanceInAgreement
		const rawLcrAmount = Math.round(registryValue * (effectiveLcr / 100));
		lcrCappedAmount = Math.max(0, rawLcrAmount - advanceInAgreement);
	}

	// -- Step 6c: Plot & Equity Loan 3-cap structure (LEND-1 Phase 2, ADR-0021) --
	//
	// Plot & Equity Loan is structurally TWO lender loan files (a Plot Loan against
	// registry value paying the seller + a LAP against the just-purchased plot
	// giving the buyer cash to satisfy the seller's off-paper demand). The deal is
	// bounded by three INDEPENDENT caps per spec §2:
	//
	//   Rule 1 — Headline sanction        = X% × marketValue
	//   Rule 2 — Seller disbursement      = min(Y% × registryValue, sanction)
	//   Rule 3 — Buyer cash (LAP file)    = min(Z% × marketValue, sanction − seller)
	//
	// Plus the derived buyer net out-of-pocket — the DSA's headline conversation
	// number — = (registry − seller) + (market − registry) − buyerCash.
	//
	// This block is ADDITIVE — it does NOT override the legacy LTV/LCR offered
	// amount math above. Phase 4 offer-card UI will read these four fields
	// directly and replace the single-number display when the variant matches.
	// Until Phase 4 ships, the four numbers travel through the result payload
	// silently. Gated tightly: variant must be 'Plot & Equity Loan' AND lender
	// must supply all three caps AND marketValue + registryValue must be present.
	let plotEquitySanctionHeadline: number | undefined;
	let plotEquitySellerDisbursement: number | undefined;
	let plotEquityBuyerCashComponent: number | undefined;
	let plotEquityBuyerNetOutOfPocket: number | undefined;
	// Market + registry inputs surfaced alongside the 4 outputs so the UI can
	// render the buyer-margin-on-registered sub-note (registry − seller, due
	// on registration day). Only set when the 3-cap branch actually fires.
	let plotEquityMarketValue: number | undefined;
	let plotEquityRegistryValue: number | undefined;

	const loanVariant = payload.loanTransaction.loanVariant;
	const marketValueForCaps = payload.loanTransaction.marketValue ?? 0;
	const registryValueForCaps = payload.loanTransaction.registryValue ?? 0;

	// The three Plot & Equity caps are OPTIONAL — they live on `rawParams`
	// (the pre-validation source) rather than `params` (the validated
	// always-present-or-defaulted view) because we want absence to mean
	// "this lender doesn't offer Plot & Equity Loan, skip the 3-cap math",
	// not "use a default". Reading from rawParams keeps that distinction clean.
	if (
		loanVariant === 'Plot & Equity Loan' &&
		marketValueForCaps > 0 &&
		registryValueForCaps > 0 &&
		rawParams.plotEquityOverallSanctionLtv !== undefined &&
		rawParams.plotEquitySellerDisbursementCapPercentOfRegistry !== undefined &&
		rawParams.plotEquityLapOnPlotCapPercentOfMarket !== undefined
	) {
		const X = rawParams.plotEquityOverallSanctionLtv;
		const Y = rawParams.plotEquitySellerDisbursementCapPercentOfRegistry;
		const Z = rawParams.plotEquityLapOnPlotCapPercentOfMarket;

		// Rule 1: total lender commitment
		const sanction = Math.round(marketValueForCaps * (X / 100));

		// Rule 2: seller's plot-loan disbursement — registry-bounded, can never
		// exceed the overall sanction even if Y% × registry would suggest more.
		const sellerLimitByRegistry = Math.round(registryValueForCaps * (Y / 100));
		const sellerPortion = Math.min(sellerLimitByRegistry, sanction);

		// Rule 3: buyer's LAP cash — market-bounded by Z%, sanction-bounded by
		// whatever's left after the seller portion. Combined caps guarantee
		// seller + buyer cannot cross the sanction headline.
		const remainingSanction = Math.max(0, sanction - sellerPortion);
		const buyerLimitByMarket = Math.round(marketValueForCaps * (Z / 100));
		const buyerCashPortion = Math.min(buyerLimitByMarket, remainingSanction);

		// Buyer net out-of-pocket — the DSA conversation number.
		// = (what buyer owes on registry beyond seller portion)
		//   + (off-paper cash demand the seller wants)
		//   − (LAP cash the lender hands buyer)
		// Equivalent: registryValue + (marketValue − registryValue) − sellerPortion − buyerCashPortion
		//           = marketValue − totalDisbursed
		// Both forms preserved for documentation; we use the spec §3 form for
		// readability and easier audit against the ₹1Cr / ₹20L worked example.
		const buyerMarginOnRegistered = Math.max(0, registryValueForCaps - sellerPortion);
		const sellerOffPaperDemand = Math.max(0, marketValueForCaps - registryValueForCaps);
		const buyerNet = Math.max(
			0,
			buyerMarginOnRegistered + sellerOffPaperDemand - buyerCashPortion
		);

		plotEquitySanctionHeadline = sanction;
		plotEquitySellerDisbursement = sellerPortion;
		plotEquityBuyerCashComponent = buyerCashPortion;
		plotEquityBuyerNetOutOfPocket = buyerNet;
		plotEquityMarketValue = marketValueForCaps;
		plotEquityRegistryValue = registryValueForCaps;
	}

	const requestedAmount = payload.loanTransaction.loanAmount;
	// PITFALL: lcrCappedAmount used to be computed above but never passed to
	// calculateOfferedAmount — Resale / Direct Sale with under-registered
	// property over-offered by ₹3-4L, causing customer funding shortfall at
	// registry day. Fixed 2026-05-28.
	let offeredAmount = calculateOfferedAmount(
		requestedAmount,
		foirEligibleAmount,
		ltvCappedAmount,
		lcrCappedAmount
	);

	// Sanction-letter view: no property is identified yet, so there is no requested
	// amount to cap against (and no property cost / LTV cap in the payload). The
	// sanctionable figure is the applicant's income-based eligibility — surface that
	// as the offered amount so Amount/EMI/ROI/Tenure reflect the pre-approval, not zero.
	// Guard on the ABSENCE of propertyCost too: LAP/Plot carry propertyIdentified=false
	// by coercion (the question is never asked) yet always have a real property cost, so
	// this must not fire for them — only for a genuine no-property home loan.
	if (
		secured &&
		payload.loanTransaction.propertyIdentified === false &&
		!payload.loanTransaction.propertyCost
	) {
		offeredAmount = foirEligibleAmount;
	}
	// EMI computation varies by facility type:
	//   - Term Loan: standard EMI formula (P × r × (1+r)^n / ((1+r)^n - 1))
	//   - BT+Top-up (dual-tenure): base BT EMI over base tenure + top-up EMI over top-up tenure
	//   - OD/CC: no fixed EMI — proxy = creditLineFactor × limit
	//   - DOD: declining balance — limit drops monthly, so monthly installment ≈ limit/months + interest
	let emi: number;
	if (!isCreditLine && dualTenureEligible) {
		// BUG-E dual-tenure EMI: split the offer between base BT (= min of
		// principalOutstanding and offeredAmount) and top-up (= remainder).
		// When offeredAmount < baseBtPrincipal (LTV / LCR cap binds below the
		// outstanding), cappedTopUp = 0 and the engine effectively says the
		// lender can only fund part of the BT — offeredAmount < requested
		// already pushes the traffic light AMBER/RED via the standard path.
		const cappedBasePrincipal = Math.min(baseBtPrincipal, offeredAmount);
		const cappedTopUpPrincipal = Math.max(0, offeredAmount - baseBtPrincipal);
		const baseEmiForOffer = calculateEMI(cappedBasePrincipal, params.roi, baseBtTenureMonths!);
		const topUpEmiForOffer = calculateEMI(cappedTopUpPrincipal, params.roi, topUpTenureMonths!);
		emi = baseEmiForOffer + topUpEmiForOffer;
	} else if (!isCreditLine) {
		emi = calculateEMI(offeredAmount, params.roi, tenureMonths);
	} else if (facilityType === 'Drop-line OverDraft (DOD)' && tenureMonths > 0) {
		// DOD: approximate monthly obligation as principal reduction + average interest
		// Principal portion = limit / tenure months
		// Interest approximation = average outstanding × monthly rate
		const principalPortion = offeredAmount / tenureMonths;
		const monthlyRate = params.roi / 100 / 12;
		const averageOutstanding = offeredAmount / 2; // average over declining balance
		const interestPortion = averageOutstanding * monthlyRate;
		emi = Math.round(principalPortion + interestPortion);
	} else {
		// OD/CC: proxy EMI = factor × sanctioned limit.
		// Flexi DOD: effectiveCreditLineFactor is the monthly rate, so this yields
		// the interest-only monthly burden (limit × monthly rate) for its 2-year window.
		emi = Math.round(offeredAmount * effectiveCreditLineFactor);
	}

	// Compute actual FOIR
	const actualFoir = totalAssessed > 0 ? (obligationMonthly + emi) / totalAssessed : 0;

	// -- Step 7: Deviations --
	const deviationsApplied = checkDeviations(enrichedPayload, failedGateIds, ruleDoc.deviations);

	// -- Step 8: Traffic light --
	let trafficLight: 'green' | 'amber' | 'red' | 'grey';
	let trafficLightMessage = '';

	if (!allGatesPassed) {
		// Check if all failed gates are covered by deviations
		const coveredGateIds = new Set(deviationsApplied.map((d) => d.deviates_from));
		const uncoveredFailures = failedGateIds.filter((id) => !coveredGateIds.has(id));

		if (uncoveredFailures.length > 0) {
			trafficLight = 'red';
		} else {
			trafficLight = 'amber';
		}
	} else if (secured && payload.loanTransaction.propertyIdentified === false) {
		// Property-not-identified flow: there is no requested loan amount yet
		// (the DSA hasn't found a property), so offeredAmount is 0 by construction
		// — min(requestedAmount=0, eligible). Judging the light on offeredAmount
		// would paint every income-eligible lender red and hide the affordability
		// overview. Here eligibility is income-based: the lender is GREEN if it can
		// lend anything on income alone (FOIR-eligible amount > 0), RED only if the
		// applicant's income genuinely supports nothing.
		trafficLight = foirEligibleAmount > 0 ? 'green' : 'red';
	} else if (offeredAmount <= 0) {
		trafficLight = 'red';
	} else if (offeredAmount < requestedAmount) {
		trafficLight = 'amber';
	} else {
		trafficLight = 'green';
	}

	// -- Step 8b: minimum-loan-amount floor (P9) --
	// If the applicant is only eligible for an amount below this product's
	// practical minimum (Business/Professional ₹5L, Personal ₹2L, Home/LAP/Plot
	// ₹10L), that is not a bookable offer — flag RED rather than surfacing a tiny
	// figure as amber/green. The property-not-identified flow is judged on the
	// income-based eligible amount (offeredAmount is 0 there by construction).
	const minLoanAmount = getMinimumLoanAmount(loanName);
	const amountForFloor =
		secured && payload.loanTransaction.propertyIdentified === false
			? foirEligibleAmount
			: offeredAmount;
	if (trafficLight !== 'red' && amountForFloor > 0 && amountForFloor < minLoanAmount) {
		trafficLight = 'red';
		trafficLightMessage = `Eligible amount ₹${amountForFloor.toLocaleString('en-IN')} is below the ₹${minLoanAmount.toLocaleString('en-IN')} minimum for ${loanName}`;
	}

	// -- Step 8c: Guarantor eligibility assessment --
	// Per docs/specs/GUARANTOR-ELIGIBILITY-ASSESSMENT-SPEC.md:
	//   - At most ONE guarantor per case (singleGuarantorRule enforces upstream)
	//   - Identify by classification: 'guarantor_financial' OR 'guarantor_non_financial'
	//   - capacity % = (guarantorIncome × maxFOIR − guarantorObligations) / proposed_EMI × 100
	//   - Age-at-maturity gate mirrors borrower's
	//   - Default threshold 80% when lender hasn't set guarantor_acceptance
	//   - guarantor_acceptance.min_emi_capacity_percent === null → lender refuses
	//     guarantors entirely (automatic reject regardless of capacity)
	//   - Demotes GREEN → AMBER only; never escalates a non-green; never causes RED
	let guarantorAssessment: GuarantorAssessment | undefined;
	const GUARANTOR_DEFAULT_THRESHOLD = 80; // HFC norm per spec §"RM-side data"

	// Find the single guarantor by classification (first wins; rule enforces ≤1).
	let guarantorIdx = -1;
	for (let i = 0; i < applicants.length; i++) {
		const a = applicants[i];
		const cls =
			classificationOverrides.get(i) ??
			((a as unknown as Record<string, unknown>).applicantClassification as string | undefined);
		if (cls === 'guarantor_financial' || cls === 'guarantor_non_financial') {
			guarantorIdx = i;
			break;
		}
	}

	if (guarantorIdx !== -1) {
		const g = applicants[guarantorIdx] as unknown as Record<string, unknown>;
		const gName = String(g.fullName ?? g.companyName ?? '');
		const policyThreshold = ruleDoc.guarantor_acceptance?.min_emi_capacity_percent;

		if (policyThreshold === null) {
			// Lender does not accept guarantors at all — automatic reject.
			guarantorAssessment = {
				applicant_index: guarantorIdx,
				name: gName,
				capacity_percent: 0,
				required_percent: 0,
				accepted_by_lender: false,
				failure_reason: 'not_accepted'
			};
		} else if (emi > 0) {
			const requiredPct = policyThreshold ?? GUARANTOR_DEFAULT_THRESHOLD;

			// Guarantor's assessed income: sum the per-source assessments for this
			// applicant. NOTE we use `assessed_amount` (gross after haircut), NOT
			// `final_amount` which is 0 for guarantors by design (income not pooled
			// into the borrower's eligibility — see incomeAssessorV2.ts:146).
			const guarantorIncome = incomeSources
				.filter((s) => s.applicant_index === guarantorIdx)
				.reduce((sum, s) => sum + (s.assessed_amount ?? 0), 0);

			// Guarantor's own obligation load — sum counted_amount for this applicant.
			// computeObligationLoad already applied ownership splits + per-lender
			// treatment, so this is the lender-adjusted burden the guarantor would
			// carry independently of the borrower.
			const guarantorObligations = obligationDetails
				.filter((o) => o.applicant_index === guarantorIdx)
				.reduce((sum, o) => sum + (o.counted_amount ?? 0), 0);

			// FOIR headroom available to the guarantor.
			const guarantorHeadroom = Math.max(
				0,
				guarantorIncome * params.maxFoir - guarantorObligations
			);
			const capacityPercent = Math.round((guarantorHeadroom / emi) * 100);

			// Age-at-maturity gate — mirrors borrower's. Guarantee must be legally
			// valid at maturity (lender can't enforce against a deceased guarantor).
			const guarantorAge = Number(g.age ?? 0);
			const tenureYears = tenureMonths / 12;
			const ageOk =
				guarantorAge > 0 && guarantorAge + tenureYears <= params.maxAgeAtMaturity;

			let accepted: boolean;
			let failureReason: GuarantorAssessment['failure_reason'];
			if (!ageOk) {
				accepted = false;
				failureReason = 'age_at_maturity';
			} else if (capacityPercent < requiredPct) {
				accepted = false;
				failureReason = 'capacity';
			} else {
				accepted = true;
			}

			guarantorAssessment = {
				applicant_index: guarantorIdx,
				name: gName,
				capacity_percent: capacityPercent,
				required_percent: requiredPct,
				accepted_by_lender: accepted,
				...(failureReason ? { failure_reason: failureReason } : {})
			};
		}

		// Demote GREEN → AMBER only when guarantor rejected. Never escalates; never RED.
		if (
			guarantorAssessment &&
			!guarantorAssessment.accepted_by_lender &&
			trafficLight === 'green'
		) {
			trafficLight = 'amber';
			trafficLightMessage = trafficLightMessage
				? `${trafficLightMessage}; Guarantor verification needed`
				: 'Guarantor verification needed';
		}
	}

	// -- Assemble evaluation --
	const evaluation: LenderEvaluation = {
		lender_id: ruleDoc.lender_id,
		lender_name: ruleDoc.lender_name,
		classification: ruleDoc.classification ?? 'PVT',

		gate_results: gateResults,
		all_gates_passed: allGatesPassed,
		failed_gate_ids: failedGateIds,

		assessed_income: totalAssessed,
		income_sources: incomeSources,
		obligation_load_monthly: obligationMonthly,
		obligation_details: obligationDetails,

		foir: actualFoir,
		max_foir: params.maxFoir,
		foir_eligible_amount: foirEligibleAmount,

		ltv,
		max_ltv: secured ? params.maxLtv / 100 : undefined,
		ltv_capped_amount: ltvCappedAmount,

		max_lcr: effectiveLcr !== undefined ? effectiveLcr / 100 : undefined,
		lcr_capped_amount: lcrCappedAmount,
		lcr_is_failsafe: lcrIsFailsafe && lcrCappedAmount !== undefined,
		advance_in_agreement: advanceInAgreement > 0 ? advanceInAgreement : undefined,

		// Plot & Equity Loan 3-cap structure (LEND-1 Phase 2). All six are
		// undefined unless the variant matches AND the lender supplied all
		// three caps AND market + registry values are both present.
		plot_equity_sanction_headline: plotEquitySanctionHeadline,
		plot_equity_seller_disbursement: plotEquitySellerDisbursement,
		plot_equity_buyer_cash_component: plotEquityBuyerCashComponent,
		plot_equity_buyer_net_out_of_pocket: plotEquityBuyerNetOutOfPocket,
		plot_equity_market_value: plotEquityMarketValue,
		plot_equity_registry_value: plotEquityRegistryValue,

		roi: params.roi,
		tenure_months: tenureMonths,
		processing_fee_percent: params.processingFeePercent,

		eligible_amount: foirEligibleAmount,
		offered_amount: offeredAmount,
		emi,

		deviations_applied: deviationsApplied,

		traffic_light: trafficLight,
		traffic_light_message: trafficLightMessage,
		approval_probability: 0,

		policies: ruleDoc.policies ?? [],

		is_credit_line: isCreditLine || undefined,
		credit_line_factor: isCreditLine ? effectiveCreditLineFactor : undefined,
		facility_type: facilityType || undefined,

		guarantor: guarantorAssessment
	};

	return evaluation;
}

// ============================================================================
// 6. BUILD FINAL RESULTS
// ============================================================================

/**
 * Convert intermediate evaluations into final LenderResultsData output.
 * Assigns ratings, sorts results, builds summary.
 */
export function buildResults(
	evaluations: LenderEvaluation[],
	payload: LoanApplicationPayload
): LenderResultsData {
	// Assign relative ratings across all evaluations
	const ratings = assignRatings(evaluations);

	// Build individual lender results
	// Dedup IDs for same lender_id + classification (e.g., two Axis Bank PVT products)
	const idCounts = new Map<string, number>();
	const results = evaluations.map((ev) => {
		const key = `${ev.lender_id}-${(ev.classification ?? 'pvt').toLowerCase()}`;
		const count = idCounts.get(key) ?? 0;
		idCounts.set(key, count + 1);
		return buildLenderResult(ev, ratings, count, payload);
	});

	// Sort: GREEN → AMBER → RED → GREY
	const lightOrder: Record<string, number> = {
		green: 0,
		amber: 1,
		red: 2,
		grey: 3
	};
	results.sort((a, b) => {
		const orderDiff = lightOrder[a.traffic_light] - lightOrder[b.traffic_light];
		if (orderDiff !== 0) return orderDiff;
		// Within same light, sort by offered amount descending
		return b.offered_amount - a.offered_amount;
	});

	// Build summary
	const summary = buildSummary(results, payload);

	// Suggest better primary applicant if current [0] isn't optimal
	const applicants = payload.allApplicantDetails ?? [];
	const loanName = payload.loanTransaction.loanName ?? '';
	const suggestion = suggestPrimaryApplicant(
		applicants as unknown as Record<string, unknown>[],
		loanName
	);

	return {
		summary,
		results,
		cross_sell: [],
		// Only include the advisory fields (not internal scores array)
		applicant_suggestion: suggestion
			? {
					suggestedIndex: suggestion.suggestedIndex,
					suggestedName: suggestion.suggestedName,
					currentName: suggestion.currentName,
					reason: suggestion.reason
				}
			: undefined,
		computed_at: new Date().toISOString()
	};
}

// ============================================================================
// 7. MAIN ENTRY POINT
// ============================================================================

/**
 * Evaluate a loan application payload against all active lender rules.
 * This is the main entry point for RE-2.
 *
 * Falls back to static sample/real-bank rule documents when the DB has
 * no active rules for this loan type (fresh deployment, un-seeded DB,
 * or offline Capacitor use).
 *
 * @param payload - Complete loan application payload
 * @returns LenderResultsData with per-lender results, summary, and metadata
 */
export async function evaluatePayload(payload: LoanApplicationPayload): Promise<LenderResultsData> {
	// Normalize form-facing loan-name aliases to the engine-canonical form
	// (e.g. 'Plot Loan' → 'Plot and Construction Loan') ONCE at engine entry.
	// All downstream code paths (rule-doc filter, evaluateLender's own
	// ruleDoc.loan_types.includes check, isSecuredLoan calls, payload
	// serialization, result-builder loan_type echo) read this field, so
	// rewriting it here means none of them need their own alias logic.
	// Mutation is safe — the payload is owned by this function for the
	// duration of evaluation and is not reused after return.
	payload.loanTransaction.loanName = canonicalLoanName(payload.loanTransaction.loanName);
	const loanName = payload.loanTransaction.loanName;

	// Defensive: reject zero/negative loanAmount at engine level.
	// The API endpoint already validates this, but evaluatePayload() should be self-defending
	// for direct callers (tests, batch jobs, future integrations).
	//
	// EXEMPTION: secured loans where the property isn't identified yet legitimately
	// arrive with loanAmount = 0 (no property cost to derive from). These must NOT
	// short-circuit — the affordability back-calculator (RE-7) below depends on this
	// path running so it can compute max affordable property from income + DP.
	const loanAmount = payload.loanTransaction.loanAmount;
	const isUnidentifiedSecured =
		payload.loanTransaction.propertyIdentified === false && isSecuredLoan(loanName);
	if ((!loanAmount || loanAmount <= 0) && !isUnidentifiedSecured) {
		logger.warn({ loanName, loanAmount }, 'evaluatePayload called with loanAmount <= 0');
		return {
			summary: {
				total_lenders: 0,
				green_count: 0,
				amber_count: 0,
				red_count: 0,
				best_amount: { value: 0, lender: '' },
				best_roi: { value: 0, lender: '' },
				best_emi: { value: 0, lender: '' },
				requested_amount: 0,
				loan_type: loanName
			},
			results: [],
			cross_sell: [],
			computed_at: new Date().toISOString()
		};
	}

	// Load all active rule documents for this loan type from MongoDB
	let ruleDocs = await loadActiveRuleDocuments(loanName);

	// Fallback: when DB has no active rules, use static fixture rule docs
	// so evaluation still produces results before RM policies are seeded
	if (ruleDocs.length === 0) {
		ruleDocs = await loadFallbackRuleDocuments(loanName);

		// Background: auto-seed real bank rules into DB for future evaluations.
		// Non-blocking — doesn't delay this evaluation (fallback already loaded).
		autoSeedIfEmpty().catch(() => {});
	}

	// PMS override: for any lender that has a published PMS policy for this
	// loan product, replace the legacy rule doc with a PMS-derived one.
	// Lenders without a published PMS policy are untouched (graceful fallback).
	ruleDocs = await applyPmsOverrides(ruleDocs, loanName);

	// Filter out excluded banks if specified
	const excludedBanks = payload.loanTransaction.excludedBanks ?? [];
	const filteredDocs =
		excludedBanks.length > 0
			? ruleDocs.filter((doc) => !excludedBanks.includes(doc.lender_name))
			: ruleDocs;

	// Enrich payload ONCE before the per-lender loop — avoids N redundant enrichPayload() calls.
	// Each evaluateLender() call clones _computed for per-lender CIBIL scope mutations.
	const batchEnrichedPayload = enrichPayload(payload);

	// Evaluate each lender (passing pre-enriched payload to skip re-enrichment)
	const evaluations = filteredDocs.map((doc) => evaluateLender(payload, doc, batchEnrichedPayload));

	// Apply NBFC negative area filter — RED-light lenders whose excluded areas match
	try {
		const { NbfcNegativeAreas } = await import('$lib/database/mongo.js');
		const tx = payload.loanTransaction;
		const propertyState = (tx?.propertyState || tx?.residenceState || tx?.businessState || '')
			.toLowerCase()
			.trim();
		const propertyCity = (tx?.propertyCity || tx?.residenceCity || tx?.businessCity || '')
			.toLowerCase()
			.trim();

		if (propertyState) {
			const lenderIds = evaluations.map((ev) => ev.lender_id);
			const negativeAreaDocs = await NbfcNegativeAreas.find({
				lender_id: { $in: lenderIds }
			}).toArray();

			for (const negDoc of negativeAreaDocs) {
				const isExcluded = negDoc.negative_areas.some((area) => {
					const stateMatch = area.state.toLowerCase().trim() === propertyState;
					if (!stateMatch) return false;
					// If no cities specified, entire state is excluded
					if (!area.cities?.length) return true;
					// Check if the specific city is excluded
					return area.cities.some((c) => c.toLowerCase().trim() === propertyCity);
				});

				if (isExcluded) {
					const ev = evaluations.find((e) => e.lender_id === negDoc.lender_id);
					if (ev && ev.traffic_light !== 'red') {
						ev.traffic_light = 'red';
						ev.traffic_light_message = `Property location is in ${negDoc.lender_name}'s excluded area`;
						ev.all_gates_passed = false;
						ev.failed_gate_ids.push('negative_area');
						ev.gate_results.push({
							rule_id: 'negative_area',
							section: 'property',
							passed: false,
							fail_message: `${propertyState}${propertyCity ? ` / ${propertyCity}` : ''} is in this lender's negative area list`,
							fail_category: 'negative_area',
							description: 'NBFC negative area check'
						});
					}
				}
			}
		}
	} catch (err) {
		// Graceful fallback — if negative area check fails, don't block evaluation
		logger.warn({ err }, 'NBFC negative area check failed — skipping');
	}

	// Enrich evaluations with DB-resolved policies — batched (S77a-3E).
	// Previously called resolvePoliciesForLender N times in Promise.all (3N DB queries
	// total: N× ProductVariations + N× PolicyRules + N× PolicyVersions). The batched
	// path collapses this to a fixed 3 DB queries regardless of N. Per-lender output
	// is byte-equivalent — same sort, merge, provenance, and graceful-fallback semantics.
	try {
		const { resolvePoliciesForLenders, mergePolicies } = await import(
			'./policyResolverBridge.js'
		);
		const productType =
			payload.loanTransaction?.loanType || payload.loanTransaction?.loanName || '';
		const tx = payload.loanTransaction;
		// Legacy fallback: some old payloads may have a top-level `property` object
		const legacyProperty = (
			payload as unknown as Record<string, Record<string, string> | undefined>
		).property;
		const geoContext = {
			state: tx?.propertyState || tx?.residenceState || tx?.businessState || legacyProperty?.state,
			city: tx?.propertyCity || tx?.residenceCity || tx?.businessCity || legacyProperty?.city
		};

		const lenderIds = evaluations.map((ev) => ev.lender_id);
		const policiesByLender = await resolvePoliciesForLenders(
			lenderIds,
			productType,
			geoContext,
			payload as unknown as Record<string, unknown>
		);

		for (const ev of evaluations) {
			const dbPolicies = policiesByLender.get(ev.lender_id) ?? [];
			ev.policies = mergePolicies(dbPolicies, ev.policies || []);
		}
	} catch (err) {
		// Graceful fallback — static policies preserved
		logger.warn({ err }, 'Policy enrichment failed — using static policies');
	}

	// -- RE-7: Affordability back-calculation for secured loans where property is not yet identified --
	// When propertyIdentified is false, the DSA hasn't found a property yet.
	// We back-calculate the max affordable property cost per lender using their
	// assessed income, FOIR headroom, ROI, and tenure.
	const tx = payload.loanTransaction;
	const isPropertyUnidentified = tx.propertyIdentified === false;
	const isSecured = isSecuredLoan(loanName);

	if (isPropertyUnidentified && isSecured) {
		try {
			const { calculateAffordability, selectAffordabilityScenarios } = await import(
				'./affordabilityCalculator.js'
			);

			// Select best applicant for PL bridge scenario (Mode C).
			// Computed once, shared across all lender evaluations — the applicant's
			// eligibility is lender-independent (CIBIL, age, income, employment type).
			const { selectBestPlApplicant } = await import('./plApplicantSelector.js');
			const applicants = payload.allApplicantDetails ?? [];
			const plAssignment = selectBestPlApplicant(
				applicants as unknown as Record<string, unknown>[]
			);

			for (const ev of evaluations) {
				// Skip grey/broken evaluations — they have no meaningful income or params
				if (ev.traffic_light === 'grey') continue;
				// Skip if no assessed income (nothing to calculate from)
				if (ev.assessed_income <= 0) continue;

				// Look up PL rate & tenure using per-lender merged policy.
				// Start with category defaults (PSB/PVT/HFC/NBFC bucket), then deep-merge
				// the lender-specific override (e.g. SBI 13.5%, HDFC 16.0%) on top.
				// Falls back to pure category defaults when no override exists for this lender.
				// Uses baseRate (CIBIL 700-749 tier) — conservative since PL bridge needs CIBIL >= 700.
				// Cap tenure at 60 months — PL bridge is short-term by design.
				// Defensive `?? 'PVT'` — same fallback used in discomfortAnalyzer.ts:432
				// in case classification is ever missing.
				const plBase = getCategoryDefaults((ev.classification ?? 'PVT') as LenderClassification);
				const plOverride = LENDER_OVERRIDES[ev.lender_id];
				const plPolicy = plOverride ? applyOverride(plBase, plOverride) : plBase;
				const plRate = plPolicy.roi.personalLoan.baseRate;
				const plTenure = Math.min(plPolicy.tenure.personalLoan.maxTenureMonths, 60);

				const affordabilityParams = {
					assessedIncome: ev.assessed_income,
					maxFoir: ev.max_foir,
					existingObligationMonthly: ev.obligation_load_monthly,
					securedRate: ev.roi,
					tenureMonths: ev.tenure_months,
					availableDP: Number(tx.downPayment) || 0,
					unsecuredRate: plRate,
					unsecuredTenureMonths: plTenure,
					// Use FOIR-eligible amount as loan cap (max the lender would approve based on income)
					maxLoanCap: ev.foir_eligible_amount > 0 ? ev.foir_eligible_amount : undefined
				};

				// Compute the full math, then surface only the scenarios the DSA
				// asked for (eligibility-only vs down-payment vs +PL bridge).
				const fullAffordability = calculateAffordability(affordabilityParams);
				ev.affordability = selectAffordabilityScenarios(fullAffordability, {
					sanctionType: tx.sanctionType,
					wantsPlBridge: tx.withPersonalLoan === 'Yes'
				});

				// Attach PL assignment so downstream consumers know which applicant
				// should be evaluated for the PL bridge (Mode C)
				ev.plAssignment = plAssignment;
			}
		} catch (err) {
			// Graceful fallback — affordability is advisory, don't break evaluation
			logger.warn({ err }, 'Affordability back-calculation failed — skipping');
		}
	}

	// Build final results
	return buildResults(evaluations, payload);
}

// ============================================================================
// HELPERS
// ============================================================================

/** Build a GREY evaluation for cases where evaluation cannot proceed */
function buildGreyEvaluation(ruleDoc: ParsedLenderRuleDocument, message: string): LenderEvaluation {
	return {
		lender_id: ruleDoc.lender_id,
		lender_name: ruleDoc.lender_name,
		classification: ruleDoc.classification ?? 'PVT',

		gate_results: [],
		all_gates_passed: false,
		failed_gate_ids: [],

		assessed_income: 0,
		income_sources: [],
		obligation_load_monthly: 0,
		obligation_details: [],

		foir: 0,
		max_foir: 0,
		foir_eligible_amount: 0,

		roi: 0,
		tenure_months: 0,

		eligible_amount: 0,
		offered_amount: 0,
		emi: 0,

		deviations_applied: [],

		traffic_light: 'grey',
		traffic_light_message: message,
		approval_probability: 0,

		policies: ruleDoc.policies ?? []
	};
}
