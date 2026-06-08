/**
 * Policy Capture → Rule Document Transformer
 * ══════════════════════════════════════════════════════════════════
 * Converts RM-submitted PolicyCapture form data into a
 * ParsedLenderRuleDocument that the evaluation engine can evaluate.
 *
 * Flow: PolicyCapture → this transformer → LenderRuleArtifact → evaluatePayload()
 * ══════════════════════════════════════════════════════════════════
 */

import type { PolicyCapture, PolicyCaptureData } from '$lib/types/policyCapture';
import type {
	ParsedLenderRuleDocument,
	ParsedRule,
	ParsedIncomeRule,
	ParsedObligationRule,
	ParsedDeviation,
	ParsedPolicy
} from '$lib/ruleEngine/types';
import type { LenderClassification } from '$lib/types/policyEngine';
import { ENRICHER_CREDIT_LINE_FACTOR } from '$lib/ruleEngine/systemConfig';

// ── Loan type mapping ───────────────────────────────────────────

const PRODUCT_TO_LOAN_TYPES: Record<string, string[]> = {
	HL_NEW: ['Home Loan'],
	HL_BT: ['Home Loan'],
	LAP_NEW: ['Loan Against Property'],
	LAP_BT: ['Loan Against Property'],
	PLOT: ['Plot and Construction Loan'],
	PL: ['Personal Loan'],
	BL_UNSECURED: ['Business Loan'],
	BL_SECURED: ['Business Loan'],
	PROF: ['Professional Loan']
};

// ── Helper: build a ParsedRule with correct field names ──────────

function makeRule(
	ruleId: string,
	description: string,
	tier: ParsedRule['tier'],
	logic: Record<string, unknown>,
	confidence: number,
	source: string,
	opts?: {
		failMessage?: string;
		failCategory?: string;
		parameterKey?: string;
		parameterValue?: unknown;
	}
): ParsedRule {
	return {
		rule_id: ruleId,
		description,
		tier,
		logic,
		fail_message: opts?.failMessage,
		fail_category: opts?.failCategory,
		parameter_key: opts?.parameterKey,
		parameter_value: opts?.parameterValue,
		confidence,
		source_excerpt: source
	};
}

// ── Main transformer ────────────────────────────────────────────

/**
 * Transform a PolicyCapture into a ParsedLenderRuleDocument.
 * Each capture step maps to one or more rule sections.
 */
export function transformCaptureToRuleDoc(capture: PolicyCapture): ParsedLenderRuleDocument {
	const data = capture.data;
	const confidence = 0.75; // RM-captured data — higher than AI-parsed, lower than verified
	const source = `RM capture ${capture.capture_id}`;

	return {
		lender_id: capture.lender_id,
		lender_name: capture.lender_name,
		classification: (capture.classification || 'PVT') as LenderClassification,
		loan_types: PRODUCT_TO_LOAN_TYPES[capture.product_type] ?? [],

		sections: {
			eligibility: buildEligibilityGates(data, confidence, source),
			cibil: buildCibilGates(data, confidence, source),
			foir: buildFoirRules(data, confidence, source),
			income_assessment: buildIncomeRules(data, confidence, source),
			ltv: buildLtvRules(data, confidence, source),
			obligation_treatment: buildObligationRules(data, confidence, source),
			property: buildPropertyGates(data, confidence, source),
			transaction: null,
			tenure: buildTenureRules(data, confidence, source),
			roi: buildRoiRules(data, confidence, source),
			fees: buildFeesRules(data, confidence, source),
			disbursement: null,
			documentation: null,
			nri: buildNriGates(data, confidence, source),
			company: null,
			balance_transfer: buildBtRules(data, confidence, source),
			top_up: null
		},

		deviations: buildDeviations(data, confidence, source),
		policies: buildPolicies(data)
	};
}

// ── Section Builders ────────────────────────────────────────────

function buildEligibilityGates(
	data: PolicyCaptureData,
	confidence: number,
	source: string
): ParsedRule[] {
	const rules: ParsedRule[] = [];
	const elig = data.eligibility;
	if (!elig) return rules;

	// Age gate
	if (elig.min_age || elig.max_age) {
		const conditions: Record<string, unknown>[] = [];
		if (elig.min_age) conditions.push({ '>=': [{ var: '_computed._primary_age' }, elig.min_age] });
		if (elig.max_age) conditions.push({ '<=': [{ var: '_computed._primary_age' }, elig.max_age] });

		rules.push(
			makeRule(
				'elig_age',
				`Age: ${elig.min_age ?? '?'}–${elig.max_age ?? '?'} years`,
				'hard_gate',
				conditions.length === 1 ? conditions[0] : { and: conditions },
				confidence,
				source,
				{
					failMessage: `Applicant age outside ${elig.min_age ?? '?'}–${elig.max_age ?? '?'} range`,
					failCategory: 'age'
				}
			)
		);
	}

	// Residency gate (NRI block)
	if (elig.residency_policy === 'indian_only') {
		rules.push(
			makeRule(
				'elig_nri_block',
				'NRI applicants not accepted',
				'hard_gate',
				{ '!=': [{ var: '_computed._has_nri_applicant' }, true] },
				confidence,
				source,
				{ failMessage: 'NRI applicants are not eligible for this product', failCategory: 'nri' }
			)
		);
	}

	return rules;
}

function buildCibilGates(
	data: PolicyCaptureData,
	confidence: number,
	source: string
): ParsedRule[] {
	const rules: ParsedRule[] = [];
	const cibil = data.credit_cibil;
	if (!cibil?.min_cibil_score) return rules;

	rules.push(
		makeRule(
			'cibil_min_score',
			`Minimum CIBIL score: ${cibil.min_cibil_score}`,
			'hard_gate',
			{ '>=': [{ var: '_computed._primary_cibil' }, cibil.min_cibil_score] },
			confidence,
			source,
			{ failMessage: `CIBIL score below minimum ${cibil.min_cibil_score}`, failCategory: 'cibil' }
		)
	);

	return rules;
}

function buildFoirRules(data: PolicyCaptureData, confidence: number, source: string): ParsedRule[] {
	const core = data.core_parameters;
	if (!core?.max_foir) return [];

	// FOIR cap stored as parameter rule — evaluation engine extracts from parameter_value
	return [
		makeRule(
			'foir_cap',
			`FOIR cap: ${core.max_foir}%`,
			'parameter',
			{ '!!': [true] }, // Always applies
			confidence,
			source,
			{ parameterKey: 'max_foir', parameterValue: core.max_foir / 100 }
		)
	];
}

function buildIncomeRules(
	data: PolicyCaptureData,
	confidence: number,
	source: string
): ParsedIncomeRule[] {
	const rules: ParsedIncomeRule[] = [];
	const income = data.income_assessment;
	if (!income) return rules;

	for (const assessment of income.assessments) {
		if (!assessment.accepted) continue;

		rules.push({
			rule_id: `income_${assessment.profile_type}`,
			income_profile_type: assessment.profile_type,
			accepted: true,
			haircut_percent: assessment.haircut_percent ?? 0,
			max_contribution_percent: assessment.max_contribution_percent ?? 100,
			computation_method: 'standard_haircut',
			confidence,
			source_excerpt: source
		});
	}

	return rules;
}

function buildLtvRules(data: PolicyCaptureData, confidence: number, source: string): ParsedRule[] {
	const core = data.core_parameters;
	if (!core?.max_ltv) return [];

	return [
		makeRule(
			'ltv_cap',
			`LTV cap: ${core.max_ltv}%`,
			'parameter',
			{ '!!': [true] },
			confidence,
			source,
			{ parameterKey: 'max_ltv', parameterValue: core.max_ltv }
		)
	];
}

function buildObligationRules(
	data: PolicyCaptureData,
	confidence: number,
	source: string
): ParsedObligationRule[] {
	const obl = data.obligations;

	// Term loan treatment
	const termFactor = obl?.term_loan_emi_factor != null ? obl.term_loan_emi_factor / 100 : 1;
	const termRule: ParsedObligationRule = {
		rule_id: 'obl_term_loan',
		obligation_type: 'term_loan',
		treatment: {
			count_factor: termFactor,
			ignore_if_closing: obl?.ignore_if_closing ?? false,
			ignore_below_amount: obl?.ignore_below_amount ?? undefined,
			guarantor_factor: obl?.guarantor_factor != null ? obl.guarantor_factor / 100 : undefined
		},
		confidence,
		source_excerpt: source
	};

	// Credit line treatment
	const creditLineFactor =
		obl?.credit_line_factor != null
			? obl.credit_line_factor / 100 // Convert 5 → 0.05
			: ENRICHER_CREDIT_LINE_FACTOR;
	const creditLineRule: ParsedObligationRule = {
		rule_id: 'obl_credit_line',
		obligation_type: 'credit_line',
		treatment: {
			count_factor: 1,
			ignore_if_closing: obl?.ignore_if_closing ?? false,
			credit_line_method: obl?.credit_line_method ?? 'percentage_of_limit',
			credit_line_factor: creditLineFactor,
			ignore_below_amount: obl?.ignore_below_amount ?? undefined,
			guarantor_factor: obl?.guarantor_factor != null ? obl.guarantor_factor / 100 : undefined
		},
		confidence,
		source_excerpt: source
	};

	return [termRule, creditLineRule];
}

function buildPropertyGates(
	data: PolicyCaptureData,
	confidence: number,
	source: string
): ParsedRule[] {
	const prop = data.property_rules;
	if (!prop?.max_property_age_years) return [];

	return [
		makeRule(
			'prop_age',
			`Max property age: ${prop.max_property_age_years} years`,
			'hard_gate',
			{
				or: [
					{ '!': [{ var: 'property.age_years' }] },
					{ '<=': [{ var: 'property.age_years' }, prop.max_property_age_years] }
				]
			},
			confidence,
			source,
			{
				failMessage: `Property exceeds maximum age of ${prop.max_property_age_years} years`,
				failCategory: 'property'
			}
		)
	];
}

function buildTenureRules(
	data: PolicyCaptureData,
	confidence: number,
	source: string
): ParsedRule[] {
	const core = data.core_parameters;
	if (!core?.max_tenure_months && !core?.max_age_at_maturity) return [];

	const rules: ParsedRule[] = [];
	if (core.max_tenure_months) {
		rules.push(
			makeRule(
				'tenure_max',
				`Max tenure: ${core.max_tenure_months} months`,
				'parameter',
				{ '!!': [true] },
				confidence,
				source,
				{ parameterKey: 'max_tenure_months', parameterValue: core.max_tenure_months }
			)
		);
	}
	if (core.max_age_at_maturity) {
		rules.push(
			makeRule(
				'age_at_maturity',
				`Max age at maturity: ${core.max_age_at_maturity}`,
				'parameter',
				{ '!!': [true] },
				confidence,
				source,
				{ parameterKey: 'max_age_at_maturity', parameterValue: core.max_age_at_maturity }
			)
		);
	}
	return rules;
}

function buildRoiRules(data: PolicyCaptureData, confidence: number, source: string): ParsedRule[] {
	const core = data.core_parameters;
	if (!core?.roi) return [];

	return [
		makeRule(
			'roi_base',
			`ROI: ${core.roi}% (${core.roi_type ?? 'floating'})`,
			'parameter',
			{ '!!': [true] },
			confidence,
			source,
			{ parameterKey: 'roi', parameterValue: core.roi }
		)
	];
}

function buildFeesRules(data: PolicyCaptureData, confidence: number, source: string): ParsedRule[] {
	const core = data.core_parameters;
	if (!core?.processing_fee_percent) return [];

	return [
		makeRule(
			'fee_processing',
			`Processing fee: ${core.processing_fee_percent}%`,
			'parameter',
			{ '!!': [true] },
			confidence,
			source,
			{ parameterKey: 'processing_fee_percent', parameterValue: core.processing_fee_percent }
		)
	];
}

function buildNriGates(
	data: PolicyCaptureData,
	confidence: number,
	source: string
): ParsedRule[] | null {
	const elig = data.eligibility;
	if (!elig || elig.residency_policy !== 'nri_with_conditions') return null;

	return [
		makeRule(
			'nri_conditions',
			`NRI allowed with conditions: ${elig.nri_conditions ?? 'See bank policy'}`,
			'parameter',
			{ '!!': [true] },
			confidence,
			source
		)
	];
}

function buildBtRules(
	data: PolicyCaptureData,
	confidence: number,
	source: string
): ParsedRule[] | null {
	const bt = data.bt_topup;
	if (!bt?.bt_min_vintage_months) return null;

	return [
		makeRule(
			'bt_vintage',
			`BT min vintage: ${bt.bt_min_vintage_months} months`,
			'hard_gate',
			{
				or: [
					{ '!': [{ var: 'loanTransaction.btExistingVintageMonths' }] },
					{ '>=': [{ var: 'loanTransaction.btExistingVintageMonths' }, bt.bt_min_vintage_months] }
				]
			},
			confidence,
			source,
			{
				failMessage: `BT requires minimum ${bt.bt_min_vintage_months} months vintage`,
				failCategory: 'bt_vintage'
			}
		)
	];
}

function buildDeviations(
	data: PolicyCaptureData,
	confidence: number,
	source: string
): ParsedDeviation[] {
	const devData = data.deviations;
	if (!devData?.entries?.length) return [];

	return devData.entries.map((entry, i) => ({
		deviation_id: `dev_${entry.gate_type}_${i}`,
		description: entry.description,
		deviates_from: `elig_${entry.gate_type}`,
		condition:
			entry.condition_value != null
				? { '>=': [{ var: `_computed._${entry.gate_type}_value` }, entry.condition_value] }
				: { '!!': [true] },
		approval_authority: entry.approval_authority ?? 'credit_manager',
		max_deviation: entry.condition_text,
		probability_modifier: -0.15,
		confidence,
		source_excerpt: source
	}));
}

function buildPolicies(data: PolicyCaptureData): ParsedPolicy[] {
	const policies: ParsedPolicy[] = [];
	const core = data.core_parameters;

	if (core?.roi) {
		policies.push({
			policy_key: 'roi',
			label: 'Interest Rate',
			value: `${core.roi}% ${core.roi_type ?? 'floating'}`,
			display_on_offer_card: true,
			category: 'interest_rate'
		});
	}

	if (core?.processing_fee_percent) {
		policies.push({
			policy_key: 'processing_fee',
			label: 'Processing Fee',
			value: `${core.processing_fee_percent}%`,
			display_on_offer_card: true,
			category: 'fees'
		});
	}

	if (core?.min_loan_amount || core?.max_loan_amount) {
		const min = core.min_loan_amount ? `₹${(core.min_loan_amount / 100000).toFixed(1)}L` : '';
		const max = core.max_loan_amount ? `₹${(core.max_loan_amount / 100000).toFixed(1)}L` : '';
		policies.push({
			policy_key: 'loan_range',
			label: 'Loan Range',
			value: `${min}${min && max ? ' – ' : ''}${max}`,
			display_on_offer_card: true,
			category: 'limits'
		});
	}

	// Add custom entries from fees/policies step
	const feesPolicies = data.fees_policies;
	if (feesPolicies?.fields) {
		for (const [key, value] of Object.entries(feesPolicies.fields)) {
			if (value == null) continue;
			policies.push({
				policy_key: key,
				label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
				value: value as string | number | boolean,
				display_on_offer_card: false,
				category: 'policy'
			});
		}
	}

	return policies;
}
