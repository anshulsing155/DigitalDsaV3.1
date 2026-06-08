/**
 * PMS → Evaluation Engine Adapter
 * ══════════════════════════════════════════════════════════════════
 * Converts a published PMS `PolicyDocument` into the
 * `ParsedLenderRuleDocument` shape that `evaluationEngine.ts` expects.
 *
 * This is a PURE FUNCTION — no DB access, no config file reads.
 * All inputs come exclusively from the PolicyDocument argument.
 *
 * Input is Zod-validated up front to catch schema drift early
 * (see `validateAdapterInput` below) — a malformed numeric field surfaces as a
 * loud configuration error rather than a silent NaN cascade through the engine.
 *
 * Design decisions:
 *   - PMS stores flat numeric configs (e.g. foir.salaried = 50).
 *     The engine expects JSON-Logic rules. We generate simple rules
 *     that always evaluate to a constant — no complex conditions.
 *   - income_assessment uses a '*' wildcard rule as the SE default
 *     so new profile types added to the system automatically get
 *     the configured haircut without requiring a PMS re-publish.
 *   - ConditionalOverrides are injected as custom JSON-Logic rules
 *     in their respective sections where a section mapping exists,
 *     otherwise logged and skipped (unsupported_overrides_count).
 *   - lender classification (PVT/GOV/NBFC) is NOT stored in PMS.
 *     Callers should merge the legacy lender_name and classification
 *     from the existing rule doc when one exists (see evaluationEngine.ts).
 * ══════════════════════════════════════════════════════════════════
 */

import type { PolicyDocument, ConditionalOverride } from '$lib/config/pms/policyTypes.js';
import type {
	ParsedLenderRuleDocument,
	ParsedRule,
	ParsedIncomeRule,
	ParsedObligationRule,
	ParsedPolicy
} from '$lib/ruleEngine/types.js';
import logger from '$lib/server/logger.js';
import { z } from 'zod';

// ─── Income profile type catalogue ───────────────────────────────────────────

/**
 * Every income profile type the system knows about, grouped by haircut category.
 * When PMS says haircutBySalaried=0, we generate accepted=true rules for all
 * salaried types. When a type isn't in allowedIncomeSources, accepted=false.
 */
const SALARIED_PROFILE_TYPES = [
	'salaried_regular',
	'salaried_government',
	'salaried_contractual'
] as const;

const SELF_EMPLOYED_PROFILE_TYPES = [
	'business_proprietorship',
	'business_partnership',
	'professional_practice'
] as const;

const OTHER_PROFILE_TYPES = ['pension', 'rental_income', 'no_current_income'] as const;

// Sentinel: "*" catches any profile type not listed above (future additions)
const WILDCARD_SE_PROFILE = '*' as const;

// ─── Section builders ─────────────────────────────────────────────────────────

/**
 * Age and employment eligibility hard gates from PMS eligibility config.
 * Does NOT include CIBIL gate — that goes into the `cibil` section.
 */
function buildEligibilityRules(
	prefix: string,
	eligibility: PolicyDocument['sections']['eligibility']
): ParsedRule[] {
	const rules: ParsedRule[] = [];
	const individualOnly = { '==': [{ var: 'allApplicantDetails.0.applicantType' }, 'Individual'] };

	// Age range gate (individuals only — companies have vintage checks, not age)
	rules.push({
		rule_id: `${prefix}-elig-age`,
		description: `Primary applicant age ${eligibility.minAge}–${eligibility.maxAge}`,
		tier: 'hard_gate',
		logic: {
			and: [
				{ '>=': [{ var: 'allApplicantDetails.0.age' }, eligibility.minAge] },
				{ '<=': [{ var: 'allApplicantDetails.0.age' }, eligibility.maxAge] }
			]
		},
		applies_when: individualOnly,
		fail_message: `Primary applicant age must be ${eligibility.minAge}–${eligibility.maxAge} years`,
		fail_category: 'age_limit',
		confidence: 0.9,
		source_excerpt: `PMS eligibility: age ${eligibility.minAge}–${eligibility.maxAge}`
	});

	// Defaulter gate — most lenders reject applicants with defaults
	if (!eligibility.isDefaulterAllowed) {
		rules.push({
			rule_id: `${prefix}-elig-defaulter`,
			description: 'No active defaulter status',
			tier: 'hard_gate',
			logic: { '!=': [{ var: 'allApplicantDetails.0.isDefaulter' }, true] },
			fail_message: 'Applicants with active defaults are not eligible',
			fail_category: 'defaulter',
			confidence: 0.85,
			source_excerpt: 'PMS eligibility: defaulter not allowed'
		});
	}

	return rules;
}

/**
 * CIBIL minimum score hard gate. Also sets `cibil_floor` on the rule doc.
 */
function buildCibilRules(
	prefix: string,
	eligibility: PolicyDocument['sections']['eligibility']
): ParsedRule[] {
	return [
		{
			rule_id: `${prefix}-cibil-min`,
			description: `Minimum CIBIL score ${eligibility.minCreditScore}`,
			tier: 'hard_gate',
			logic: { '>=': [{ var: 'allApplicantDetails.0.creditScore' }, eligibility.minCreditScore] },
			fail_message: `CIBIL score must be ${eligibility.minCreditScore} or above`,
			fail_category: 'cibil_threshold',
			confidence: 0.9,
			source_excerpt: `PMS CIBIL: min ${eligibility.minCreditScore}`
		}
	];
}

/**
 * FOIR cap rules — salaried and self-employed paths via _computed._is_salaried_file.
 * Both values stored as percentage in PMS (e.g. 50), converted to decimal here (0.50).
 *
 * Uses `parameter` tier so extractParameters() picks them up.
 * The logic is always true (unconditional cap), filtered by applies_when.
 */
function buildFoirRules(
	prefix: string,
	foir: PolicyDocument['sections']['foir']
): ParsedRule[] {
	const alwaysTrue = { '==': [1, 1] };
	const isSalariedFile = { '==': [{ var: '_computed._is_salaried_file' }, true] };
	const isSeFile = { '!=': [{ var: '_computed._is_salaried_file' }, true] };

	const salariedFoir = foir.salaried / 100;
	const seFoir = foir.selfEmployed / 100;

	const rules: ParsedRule[] = [];

	// Salaried FOIR cap — applies when primary file is salaried
	rules.push({
		rule_id: `${prefix}-foir-sal`,
		description: `FOIR ${foir.salaried}% for salaried applicants`,
		tier: 'parameter',
		logic: alwaysTrue,
		parameter_key: 'max_foir',
		parameter_value: salariedFoir,
		applies_when: isSalariedFile,
		confidence: 0.9,
		source_excerpt: `PMS FOIR salaried: ${foir.salaried}%`
	});

	// Self-employed FOIR cap — applies for SE/professional/business files
	rules.push({
		rule_id: `${prefix}-foir-se`,
		description: `FOIR ${foir.selfEmployed}% for self-employed applicants`,
		tier: 'parameter',
		logic: alwaysTrue,
		parameter_key: 'max_foir',
		parameter_value: seFoir,
		applies_when: isSeFile,
		confidence: 0.9,
		source_excerpt: `PMS FOIR SE: ${foir.selfEmployed}%`
	});

	return rules;
}

/**
 * Income assessment rules. Generates one ParsedIncomeRule per profile type.
 *
 * - Salaried types → haircutBySalaried (usually 0%)
 * - SE types + wildcard → haircutBySelfEmployed
 * - Rental → haircutByRental
 * - Others (pension, etc.) → haircutByOther
 * - Wildcard '*' catches future profile types as SE-equivalent
 *
 * `accepted` is true unless allowedIncomeSources is non-empty and doesn't
 * contain the profile type. Empty allowedIncomeSources = accept all.
 */
function buildIncomeRules(
	prefix: string,
	income: PolicyDocument['sections']['income']
): ParsedIncomeRule[] {
	const rules: ParsedIncomeRule[] = [];
	const allowed = income.allowedIncomeSources;
	const acceptAll = allowed.length === 0;

	function isAccepted(profileType: string): boolean {
		return acceptAll || allowed.includes(profileType);
	}

	// Salaried types
	for (const profileType of SALARIED_PROFILE_TYPES) {
		rules.push({
			rule_id: `${prefix}-inc-${profileType}`,
			income_profile_type: profileType,
			accepted: isAccepted(profileType),
			haircut_percent: income.haircutBySalaried,
			computation_method: 'net_salary',
			confidence: 0.9,
			source_excerpt: `PMS income: ${profileType}, haircut ${income.haircutBySalaried}%`
		});
	}

	// Self-employed types
	for (const profileType of SELF_EMPLOYED_PROFILE_TYPES) {
		rules.push({
			rule_id: `${prefix}-inc-${profileType}`,
			income_profile_type: profileType,
			accepted: isAccepted(profileType),
			haircut_percent: income.haircutBySelfEmployed,
			computation_method: 'avg_net_profit',
			confidence: 0.85,
			source_excerpt: `PMS income: ${profileType}, haircut ${income.haircutBySelfEmployed}%`
		});
	}

	// Pension
	rules.push({
		rule_id: `${prefix}-inc-pension`,
		income_profile_type: 'pension',
		accepted: isAccepted('pension'),
		haircut_percent: income.haircutByOther,
		computation_method: 'pension_amount',
		confidence: 0.85,
		source_excerpt: `PMS income: pension, haircut ${income.haircutByOther}%`
	});

	// Rental income
	rules.push({
		rule_id: `${prefix}-inc-rental`,
		income_profile_type: 'rental_income',
		accepted: isAccepted('rental_income'),
		haircut_percent: income.haircutByRental,
		computation_method: 'rent_amount',
		confidence: 0.85,
		source_excerpt: `PMS income: rental, haircut ${income.haircutByRental}%`
	});

	// No income — never accepted
	rules.push({
		rule_id: `${prefix}-inc-no-income`,
		income_profile_type: 'no_current_income',
		accepted: false,
		haircut_percent: 100,
		computation_method: 'none',
		confidence: 0.95,
		source_excerpt: 'No income: not accepted'
	});

	// Wildcard catch-all for SE/professional types not explicitly listed.
	// Comes last so exact matches above take priority.
	rules.push({
		rule_id: `${prefix}-inc-wildcard`,
		income_profile_type: WILDCARD_SE_PROFILE,
		accepted: acceptAll,
		haircut_percent: income.haircutBySelfEmployed,
		computation_method: 'avg_net_profit',
		confidence: 0.7,
		source_excerpt: `PMS income: wildcard SE default, haircut ${income.haircutBySelfEmployed}%`
	});

	return rules;
}

/**
 * LTV parameter rules — one rule per loan-amount tier, then a property-type fallback.
 * Skipped when ltv is null (unsecured products).
 */
function buildLtvRules(
	prefix: string,
	ltv: NonNullable<PolicyDocument['sections']['ltv']>
): ParsedRule[] {
	const rules: ParsedRule[] = [];

	// Loan-amount tiers (lower tiers get higher LTV, last tier gets the lowest)
	const tiers = [...ltv.maxLtvByLoanAmount].sort((a, b) => a.upTo - b.upTo);

	for (let i = 0; i < tiers.length; i++) {
		const tier = tiers[i];
		const prevUpTo = i === 0 ? 0 : tiers[i - 1].upTo;

		const logic =
			i < tiers.length - 1
				? // All tiers except the last: exact range condition
				  {
						and: [
							{ '>=': [{ var: 'loanTransaction.loanAmount' }, prevUpTo] },
							{ '<': [{ var: 'loanTransaction.loanAmount' }, tier.upTo] }
						]
					}
				: // Last tier: anything >= previous upTo
				  { '>=': [{ var: 'loanTransaction.loanAmount' }, prevUpTo] };

		rules.push({
			rule_id: `${prefix}-ltv-tier-${i + 1}`,
			description: `LTV ${tier.maxLtv}% for loans up to ₹${(tier.upTo / 100000).toFixed(0)}L`,
			tier: 'parameter',
			logic,
			parameter_key: 'max_ltv',
			parameter_value: tier.maxLtv,
			confidence: 0.9,
			source_excerpt: `PMS LTV: ${tier.maxLtv}% for loans < ₹${(tier.upTo / 100000).toFixed(0)}L`
		});
	}

	// Property-type based LTV overrides (if configured)
	for (const [propertyType, maxLtv] of Object.entries(ltv.maxLtvByPropertyType)) {
		rules.push({
			rule_id: `${prefix}-ltv-prop-${propertyType.replace(/\s+/g, '-').toLowerCase()}`,
			description: `LTV ${maxLtv}% for ${propertyType}`,
			tier: 'parameter',
			logic: { '==': [{ var: 'loanTransaction.propertyType' }, propertyType] },
			parameter_key: 'max_ltv',
			parameter_value: maxLtv,
			confidence: 0.85,
			source_excerpt: `PMS LTV by type: ${propertyType} = ${maxLtv}%`
		});
	}

	return rules;
}

/**
 * Obligation treatment rules — one for term loans, one for credit lines.
 * Maps PMS creditCardFoirMethod to the engine's credit_line_method enum.
 */
function buildObligationRules(
	prefix: string,
	obligations: PolicyDocument['sections']['obligations']
): ParsedObligationRule[] {
	// PMS → engine method mapping
	const creditLineMethodMap: Record<string, 'percentage_of_limit' | 'actual_emi' | 'minimum_payment'> = {
		utilization: 'actual_emi', // treat actual EMI / utilization-based
		limit_percentage: 'percentage_of_limit',
		full_limit: 'percentage_of_limit'
	};

	const creditLineMethod =
		creditLineMethodMap[obligations.creditCardFoirMethod] ?? 'percentage_of_limit';

	// Credit line factor: if full_limit, use 100%; else use configured percentage or default 5%
	const creditLineFactor =
		obligations.creditCardFoirMethod === 'full_limit'
			? 1.0
			: obligations.creditCardLimitPercentage !== null
				? obligations.creditCardLimitPercentage / 100
				: 0.05;

	return [
		{
			rule_id: `${prefix}-obl-term`,
			obligation_type: 'term_loan',
			treatment: {
				count_factor: 1.0,
				ignore_if_closing: true // standard treatment: closing term loans are excluded
			},
			confidence: 0.9,
			source_excerpt: 'PMS obligations: term loans at 100%, ignore if closing'
		},
		{
			rule_id: `${prefix}-obl-credit`,
			obligation_type: 'credit_line',
			treatment: {
				count_factor: 1.0,
				ignore_if_closing: false,
				credit_line_method: creditLineMethod,
				credit_line_factor: creditLineFactor
			},
			confidence: 0.85,
			source_excerpt: `PMS obligations: credit line method=${obligations.creditCardFoirMethod}, factor=${(creditLineFactor * 100).toFixed(0)}%`
		}
	];
}

/**
 * Tenure parameter rules: max tenure, min tenure (as a hard gate constraint),
 * and max age at maturity.
 */
function buildTenureRules(
	prefix: string,
	tenure: PolicyDocument['sections']['tenure']
): ParsedRule[] {
	const rules: ParsedRule[] = [];

	rules.push({
		rule_id: `${prefix}-tenure-max`,
		description: `Maximum tenure ${tenure.maxTenureMonths} months`,
		tier: 'parameter',
		logic: { '==': [1, 1] },
		parameter_key: 'max_tenure_months',
		parameter_value: tenure.maxTenureMonths,
		confidence: 0.9,
		source_excerpt: `PMS tenure: max ${tenure.maxTenureMonths} months`
	});

	rules.push({
		rule_id: `${prefix}-tenure-maturity`,
		description: `Max age at maturity ${tenure.maxAgeAtMaturity} years`,
		tier: 'parameter',
		logic: { '==': [1, 1] },
		parameter_key: 'max_age_at_maturity',
		parameter_value: tenure.maxAgeAtMaturity,
		confidence: 0.9,
		source_excerpt: `PMS tenure: max age at maturity ${tenure.maxAgeAtMaturity}`
	});

	return rules;
}

/**
 * ROI parameter rule — uses the midpoint of minRoi/maxRoi as the offer rate.
 * The engine expects a single ROI value for computation; mid-point is a
 * reasonable default. RMs can override via ConditionalOverrides in PMS.
 */
function buildRoiRules(
	prefix: string,
	roi: PolicyDocument['sections']['roi']
): ParsedRule[] {
	// Use the midpoint as the default offer rate
	const midpointRoi = (roi.minRoi + roi.maxRoi) / 2;
	const offerRoi = midpointRoi > 0 ? midpointRoi : roi.minRoi;

	return [
		{
			rule_id: `${prefix}-roi-base`,
			description: `ROI ${roi.minRoi}%–${roi.maxRoi}% (offer at ${offerRoi.toFixed(2)}%)`,
			tier: 'parameter',
			logic: { '==': [1, 1] },
			parameter_key: 'roi',
			parameter_value: offerRoi,
			confidence: 0.85,
			source_excerpt: `PMS ROI: ${roi.minRoi}%–${roi.maxRoi}%`
		}
	];
}

/**
 * Fees parameter rule — processing fee as a percent of loan amount.
 * Flat fee is recorded as a note only (engine expects a percentage).
 */
function buildFeeRules(
	prefix: string,
	fees: PolicyDocument['sections']['fees']
): ParsedRule[] {
	const rules: ParsedRule[] = [];

	if (fees.processingFeePercent !== null) {
		rules.push({
			rule_id: `${prefix}-fee-processing`,
			description: `Processing fee ${fees.processingFeePercent}%`,
			tier: 'parameter',
			logic: { '==': [1, 1] },
			parameter_key: 'processing_fee_percent',
			parameter_value: fees.processingFeePercent,
			confidence: 0.85,
			source_excerpt: `PMS fees: processing fee ${fees.processingFeePercent}%`
		});
	}

	return rules;
}

/**
 * Geo hard gates — applied only when the PMS geo config is non-trivially restrictive.
 *
 * - allowedStates: if non-empty, property/residence state must be in the list
 * - excludedCities: if non-empty, property/residence city must NOT be in the list
 *
 * We generate `property` section rules here since geo restriction is a
 * property/location hard gate in the engine's taxonomy.
 */
function buildGeoRules(
	prefix: string,
	geo: PolicyDocument['sections']['geo']
): ParsedRule[] | null {
	const rules: ParsedRule[] = [];

	if (geo.allowedStates.length > 0) {
		// Lender only operates in specific states
		// Checks propertyState first (secured), falls back to residenceState (unsecured)
		rules.push({
			rule_id: `${prefix}-geo-states`,
			description: `Lender operates in: ${geo.allowedStates.join(', ')}`,
			tier: 'hard_gate',
			logic: {
				or: [
					{ in: [{ var: 'loanTransaction.propertyState' }, geo.allowedStates] },
					{ in: [{ var: 'loanTransaction.residenceState' }, geo.allowedStates] }
				]
			},
			fail_message: `Lender does not operate in the applicant's state`,
			fail_category: 'geo_restriction',
			confidence: 0.9,
			source_excerpt: `PMS geo: allowed states [${geo.allowedStates.join(', ')}]`
		});
	}

	if (geo.excludedCities.length > 0) {
		rules.push({
			rule_id: `${prefix}-geo-cities`,
			description: `Excluded cities: ${geo.excludedCities.slice(0, 3).join(', ')}${geo.excludedCities.length > 3 ? '...' : ''}`,
			tier: 'hard_gate',
			logic: {
				'!': {
					or: [
						{ in: [{ var: 'loanTransaction.propertyCity' }, geo.excludedCities] },
						{ in: [{ var: 'loanTransaction.residenceCity' }, geo.excludedCities] }
					]
				}
			},
			fail_message: 'Lender does not serve this city',
			fail_category: 'geo_restriction',
			confidence: 0.85,
			source_excerpt: `PMS geo: excluded cities`
		});
	}

	return rules.length > 0 ? rules : null;
}

/**
 * Display policies for the offer card — key terms extracted from PMS sections.
 */
function buildPolicies(
	pmsDoc: PolicyDocument
): ParsedPolicy[] {
	const s = pmsDoc.sections;
	const policies: ParsedPolicy[] = [];

	if (s.roi.minRoi > 0 || s.roi.maxRoi > 0) {
		policies.push({
			policy_key: 'roi_range',
			label: 'Interest Rate',
			value: `${s.roi.minRoi}% – ${s.roi.maxRoi}%`,
			display_on_offer_card: true,
			category: 'interest_rate'
		});
	}

	if (s.fees.processingFeePercent !== null) {
		policies.push({
			policy_key: 'processing_fee',
			label: 'Processing Fee',
			value: `${s.fees.processingFeePercent}%`,
			display_on_offer_card: true,
			category: 'fees'
		});
	}

	if (s.tenure.maxTenureMonths > 0) {
		policies.push({
			policy_key: 'max_tenure',
			label: 'Max Tenure',
			value: `${Math.round(s.tenure.maxTenureMonths / 12)} years`,
			display_on_offer_card: true,
			category: 'eligibility'
		});
	}

	if (!s.fees.prepaymentAllowed) {
		policies.push({
			policy_key: 'prepayment',
			label: 'Prepayment',
			value: 'Not allowed',
			display_on_offer_card: true,
			category: 'terms'
		});
	} else if (s.fees.prepaymentChargePercent !== null && s.fees.prepaymentChargePercent > 0) {
		policies.push({
			policy_key: 'prepayment_charge',
			label: 'Prepayment Charge',
			value: `${s.fees.prepaymentChargePercent}%`,
			display_on_offer_card: true,
			category: 'terms'
		});
	}

	return policies;
}

/**
 * Inject accepted ConditionalOverrides from PMS as JSON-Logic rules in the
 * appropriate engine section. Only overrides with adminCoApproved=true (for
 * custom_json mode) or template/rm_confirmed overrides are included.
 *
 * Each override modifies a `parameter_key` — supported effects:
 *   set(roi|max_foir|max_ltv|max_tenure_months|max_age_at_maturity|processing_fee_percent)
 *
 * Overrides for unsupported fieldPaths are skipped with a warning logged.
 *
 * Returns the injected rules grouped by engine section name.
 */
function buildOverrideRules(
	prefix: string,
	overrides: PolicyDocument['conditionalOverrides']
): { sectionName: string; rule: ParsedRule }[] {
	const FIELD_TO_SECTION: Record<string, string> = {
		roi: 'roi',
		max_foir: 'foir',
		max_ltv: 'ltv',
		max_tenure_months: 'tenure',
		max_age_at_maturity: 'tenure',
		processing_fee_percent: 'fees'
	};

	const FIELD_TO_PARAM_KEY: Record<string, string> = {
		roi: 'roi',
		max_foir: 'max_foir',
		max_ltv: 'max_ltv',
		max_tenure_months: 'max_tenure_months',
		max_age_at_maturity: 'max_age_at_maturity',
		processing_fee_percent: 'processing_fee_percent'
	};

	const injected: { sectionName: string; rule: ParsedRule }[] = [];

	for (const override of overrides) {
		// Skip custom_json overrides that haven't been co-approved by admin
		if (override.authoringMode === 'custom_json' && !override.adminCoApproved) {
			continue;
		}

		// Only 'set' operation is directly translatable to a parameter_value
		if (override.effect.operation !== 'set') {
			continue;
		}

		const fieldPath = override.effect.fieldPath;
		const sectionName = FIELD_TO_SECTION[fieldPath];
		const paramKey = FIELD_TO_PARAM_KEY[fieldPath];

		if (!sectionName || !paramKey) {
			logger.warn(
				{ policyId: String(override.id), fieldPath },
				'[pmsToEngineAdapter] ConditionalOverride fieldPath has no engine section mapping — skipped'
			);
			continue;
		}

		// PolicyEffect.value is typed `number | string | boolean`. The engine
		// only meaningfully consumes numeric parameter_value (extractParameters
		// guards `typeof value === 'number'` before applying). Without this
		// runtime check, a string ROI like "10" passes the `as number` cast,
		// the engine silently ignores it, and the DSA sees the unmodified rate
		// with no indication the override failed.
		if (typeof override.effect.value !== 'number' || !Number.isFinite(override.effect.value)) {
			logger.warn(
				{
					overrideId: String(override.id),
					fieldPath,
					value: override.effect.value,
					valueType: typeof override.effect.value
				},
				'[pmsToEngineAdapter] ConditionalOverride effect.value is not a finite number — skipped'
			);
			continue;
		}

		injected.push({
			sectionName,
			rule: {
				rule_id: `${prefix}-override-${override.id}`,
				description: override.label,
				tier: 'parameter',
				logic: override.condition,
				parameter_key: paramKey,
				parameter_value: override.effect.value,
				confidence: override.aiConfidence ?? override.confidence,
				source_excerpt: `PMS override: ${override.label}`
			}
		});
	}

	return injected;
}

// ─── Lender name formatter ────────────────────────────────────────────────────

/**
 * Derives a human-readable lender name from the lenderId slug.
 * e.g. "hdfc-bank" → "HDFC Bank", "sbi" → "SBI"
 * Callers should prefer merging the legacy lender_name when it exists.
 */
function formatLenderName(lenderId: string): string {
	return lenderId
		.split('-')
		.map((part) => {
			// Common acronyms to keep uppercase
			const acronyms = ['hdfc', 'icici', 'sbi', 'lic', 'pnb', 'bob', 'boi', 'iob', 'nbfc', 'dsc'];
			return acronyms.includes(part.toLowerCase())
				? part.toUpperCase()
				: part.charAt(0).toUpperCase() + part.slice(1);
		})
		.join(' ');
}

// ─── Input validation ─────────────────────────────────────────────────────────

/**
 * Reusable building blocks. Range bounds are deliberately tight so a stored
 * value outside the plausible range (e.g. negative haircut, 4-digit ROI) fails
 * validation rather than silently producing wrong eligibility downstream.
 */
const PercentField = z.number().finite().min(0).max(100); // 0-100% — FOIR, haircut, LTV, fees
const NullablePercentField = PercentField.nullable();
const NonNegativeField = z.number().finite().min(0); // flat fee amounts in INR
const NullableNonNegativeField = NonNegativeField.nullable();

/**
 * Numeric and enum fields the engine consumes from `PolicyDocument.sections`.
 *
 * MongoDB does not enforce types — a field declared `number` in TypeScript
 * could be stored as a string `"50"` if a write path forgot to coerce. The
 * arithmetic in `buildFoirRules` (`foir.salaried / 100`) silently produces
 * `NaN` for a string input, which propagates through the engine into
 * `offeredAmount` and `emi`. Because `NaN < requestedAmount` is `false`, the
 * lender then resolves to `traffic_light: 'green'` — a wrong-answer path the
 * DSA cannot tell from a real green.
 *
 * Range bounds are enforced (not just `finite()`) so stored values outside
 * plausible ranges (e.g. ROI of 999, negative tenure) also fail validation.
 *
 * This schema is intentionally PARTIAL — we only validate the fields the
 * adapter actually reads. Fields the engine never touches (e.g. `notes`,
 * `allowedIncomeSources` element validity) are left untouched.
 */
const NumericSectionsSchema = z.object({
	eligibility: z.object({
		// Age bounds: 18 (legal contract age) to 100 (defensive upper bound).
		minAge: z.number().finite().min(18).max(100),
		maxAge: z.number().finite().min(18).max(100),
		// CIBIL score range: 300-900 (NTC accounts may report -1 but that's
		// handled separately as a flag, not stored as the gate value).
		minCreditScore: z.number().finite().min(300).max(900)
	}),
	income: z.object({
		haircutBySalaried: PercentField,
		haircutBySelfEmployed: PercentField,
		haircutByRental: PercentField,
		haircutByOther: PercentField
	}),
	foir: z.object({
		salaried: PercentField,
		selfEmployed: PercentField
	}),
	// LTV can be null for unsecured products (Personal/Business/Professional).
	// When non-null, every nested LTV value must be a valid percent and every
	// loan-amount tier must have a positive `upTo`.
	ltv: z
		.object({
			maxLtvByPropertyType: z.record(z.string(), PercentField),
			maxLtvByLoanAmount: z.array(
				z.object({
					upTo: z.number().finite().positive(),
					maxLtv: PercentField
				})
			)
		})
		.nullable(),
	obligations: z.object({
		// Enum used by buildObligationRules to map to engine credit_line_method.
		creditCardFoirMethod: z.enum(['utilization', 'limit_percentage', 'full_limit']),
		creditCardLimitPercentage: NullablePercentField
	}),
	tenure: z.object({
		// 1-360 months covers all real-world products from short-term PL (12mo)
		// through 30-year home loans. Anything outside this range is data drift.
		minTenureMonths: z.number().finite().min(1).max(360),
		maxTenureMonths: z.number().finite().min(1).max(360),
		// Same 18-100 envelope as applicant age.
		maxAgeAtMaturity: z.number().finite().min(18).max(100)
	}),
	roi: z.object({
		// 0-50% covers all real ROIs (current Indian home loans ~8.5-11%, NBFC PLs
		// up to ~30%). Anything beyond 50% indicates data corruption.
		minRoi: z.number().finite().min(0).max(50),
		maxRoi: z.number().finite().min(0).max(50)
	}),
	fees: z.object({
		processingFeePercent: NullablePercentField,
		processingFeeFlat: NullableNonNegativeField,
		processingFeeMin: NullableNonNegativeField,
		processingFeeMax: NullableNonNegativeField,
		prepaymentChargePercent: NullablePercentField
	})
});

/**
 * Validates that all numeric and enum fields the adapter consumes are within
 * expected ranges and types. Throws a descriptive error on type drift so a
 * malformed PMS document fails loud at adapter time rather than producing
 * silent NaN cascades or wrong enum mapping downstream.
 *
 * Callers should treat a thrown error here as a configuration emergency for the
 * affected lender — the lender should be evicted from the cache and evaluation
 * should fall back to the legacy rule doc (handled by `policyResolverBridge`).
 */
function validateAdapterInput(pmsDoc: PolicyDocument): void {
	const result = NumericSectionsSchema.safeParse(pmsDoc.sections);
	if (!result.success) {
		const issues = result.error.issues
			.map((i) => `${i.path.join('.')}: ${i.message}`)
			.join('; ');
		throw new Error(
			`[pmsToEngineAdapter] Policy ${pmsDoc.lenderId}/${pmsDoc.loanProduct} has malformed input — ${issues}`
		);
	}
}

// ─── Main adapter function ────────────────────────────────────────────────────

/**
 * Converts a published PMS PolicyDocument into a ParsedLenderRuleDocument
 * ready for the evaluation engine.
 *
 * `existingLenderMeta` — optional metadata from the legacy rule doc for this
 * lender. If provided, `lender_name` and `classification` are preserved from
 * the legacy doc (PMS doesn't store these fields). If absent, we derive them.
 */
export function pmsToEnginePolicy(
	pmsDoc: PolicyDocument,
	existingLenderMeta?: { lender_name: string; classification: string }
): ParsedLenderRuleDocument {
	// Fail loud on type drift before any arithmetic. The header docstring
	// (line 10) promised this guard — it was never wired up until now.
	validateAdapterInput(pmsDoc);

	const prefix = `pms-${pmsDoc.lenderId}-v${pmsDoc.version}`;
	const s = pmsDoc.sections;

	// Build section rules
	const eligibilityRules = buildEligibilityRules(prefix, s.eligibility);
	const cibilRules = buildCibilRules(prefix, s.eligibility);
	const foirRules = buildFoirRules(prefix, s.foir);
	const incomeRules = buildIncomeRules(prefix, s.income);
	const ltvRules = s.ltv ? buildLtvRules(prefix, s.ltv) : null;
	const obligationRules = buildObligationRules(prefix, s.obligations);
	const tenureRules = buildTenureRules(prefix, s.tenure);
	const roiRules = buildRoiRules(prefix, s.roi);
	const feeRules = buildFeeRules(prefix, s.fees);
	const geoRules = buildGeoRules(prefix, s.geo);

	// Build override injection map
	const overrideRules = buildOverrideRules(prefix, pmsDoc.conditionalOverrides);
	const overridesBySectionName = new Map<string, ParsedRule[]>();
	for (const { sectionName, rule } of overrideRules) {
		const existing = overridesBySectionName.get(sectionName) ?? [];
		overridesBySectionName.set(sectionName, [...existing, rule]);
	}

	// Merge overrides into the relevant section arrays
	function withOverrides(sectionName: string, base: ParsedRule[] | null): ParsedRule[] | null {
		const extras = overridesBySectionName.get(sectionName);
		if (!extras || extras.length === 0) return base;
		return [...(base ?? []), ...extras];
	}

	const lenderName = existingLenderMeta?.lender_name ?? formatLenderName(pmsDoc.lenderId);
	const classification = (existingLenderMeta?.classification ?? 'PVT') as 'PVT' | 'GOV' | 'NBFC';

	const doc: ParsedLenderRuleDocument = {
		lender_id: pmsDoc.lenderId,
		lender_name: lenderName,
		classification,
		loan_types: [pmsDoc.loanProduct],

		sections: {
			eligibility: eligibilityRules,
			cibil: cibilRules,
			foir: withOverrides('foir', foirRules),
			income_assessment: incomeRules,
			ltv: withOverrides('ltv', ltvRules),
			obligation_treatment: obligationRules,
			// Geo restrictions go into the `property` section — hard gates there
			property: geoRules,
			transaction: null,
			tenure: withOverrides('tenure', tenureRules),
			roi: withOverrides('roi', roiRules),
			fees: withOverrides('fees', feeRules),
			disbursement: null,
			documentation: null,
			nri: null,
			company: null,
			balance_transfer: null,
			top_up: null
		},

		deviations: null,
		policies: buildPolicies(pmsDoc),

		// Synthetic CIBIL floor for the engine's synth hard gate
		cibil_floor: s.eligibility.minCreditScore
	};

	return doc;
}
