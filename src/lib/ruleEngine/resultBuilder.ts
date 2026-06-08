// ============================================================================
// RE-2 RESULT BUILDER
// Converts intermediate LenderEvaluation objects into final LenderResult output.
// ============================================================================

import type { LenderEvaluation, AppliedDeviation, ParsedPolicy } from './types.js';
import { SECTION_TO_CATEGORY as sectionCategoryMap } from './types.js';
import type {
	LenderResult,
	DecisionFactor,
	ImprovementSuggestion,
	MetricRating,
	ResultsSummary,
	LenderResultsData,
	TrancheBreakdown,
	LoanTranche,
	BTAppreciationSignal,
	PolicyDisplayField
} from '$lib/types/lenderResults.js';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder.js';
import { analyzeDiscomfort } from './discomfortAnalyzer.js';
import { selectHighestCibil } from './applicantSelectors.js';
import { mapRejectionReasonsToTips } from './rejectionTipMapper.js';
import { scoreLenderGeoPresence } from '$lib/config/lenderPolicies/geoFilter.js';
import { LENDER_BY_NAME, LENDER_BY_ID } from '$lib/config/lenderPolicies/lenderDirectory.js';
import {
	RATING_WEIGHTS,
	RATING_PERCENTILE_THRESHOLDS,
	RATING_NUMERIC_THRESHOLDS,
	PROBABILITY_BASE,
	FOIR_PROXIMITY_PENALTIES,
	CIBIL_FAILURE_PENALTY
} from './systemConfig.js';

// ============================================================================
// HELPERS
// ============================================================================

/** Convert a rule_id or section name to a human-readable label */
function sectionToLabel(section: string): string {
	const labels: Record<string, string> = {
		eligibility: 'Age Eligibility',
		cibil: 'CIBIL Score',
		property: 'Property Approval',
		transaction: 'Transaction Validity',
		documentation: 'Documentation',
		nri: 'NRI Eligibility',
		company: 'Company Profile',
		foir: 'FOIR',
		income_assessment: 'Income Assessment',
		ltv: 'Loan to Value',
		obligation_treatment: 'Obligation Treatment',
		tenure: 'Tenure',
		roi: 'Interest Rate',
		fees: 'Processing Fees',
		disbursement: 'Disbursement',
		balance_transfer: 'Balance Transfer',
		top_up: 'Top-up'
	};
	return labels[section] || section.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Map a percentile (0-1) to a MetricRating using configured thresholds */
function percentileToRating(percentile: number): MetricRating {
	if (percentile >= RATING_PERCENTILE_THRESHOLDS.excellent) return 'excellent';
	if (percentile >= RATING_PERCENTILE_THRESHOLDS.good) return 'good';
	if (percentile >= RATING_PERCENTILE_THRESHOLDS.average) return 'average';
	return 'poor';
}

/** Convert MetricRating to numeric score for weighted averaging */
function ratingToNumeric(rating: MetricRating): number {
	switch (rating) {
		case 'excellent':
			return 4;
		case 'good':
			return 3;
		case 'average':
			return 2;
		case 'poor':
			return 1;
	}
}

/** Convert numeric score back to MetricRating using configured thresholds */
function numericToRating(value: number): MetricRating {
	if (value >= RATING_NUMERIC_THRESHOLDS.excellent) return 'excellent';
	if (value >= RATING_NUMERIC_THRESHOLDS.good) return 'good';
	if (value >= RATING_NUMERIC_THRESHOLDS.average) return 'average';
	return 'poor';
}

/** Convert a rule_id to kebab-case */
function toKebabCase(str: string): string {
	return str
		.replace(/[_\s]+/g, '-')
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.toLowerCase();
}

/** Map approval authority to effort level */
function authorityToEffort(authority: string): 'easy' | 'moderate' | 'significant' {
	const lower = (authority ?? '').toLowerCase().replace(/[_\s]+/g, '_');
	if (lower === 'branch_manager') return 'moderate';
	if (lower === 'regional_head' || lower === 'credit_manager') return 'moderate';
	if (lower === 'zonal_head' || lower === 'coo') return 'significant';
	return 'moderate';
}

// ============================================================================
// 1. buildFactors
// ============================================================================

/**
 * Build DecisionFactor[] from gate results and computed metrics.
 */
export function buildFactors(evaluation: LenderEvaluation): DecisionFactor[] {
	const factors: DecisionFactor[] = [];

	// -- Gate result factors --
	for (const gate of evaluation.gate_results) {
		const factor: DecisionFactor = {
			id: toKebabCase(gate.rule_id),
			label: sectionToLabel(gate.section),
			impact: gate.passed ? 'positive' : 'negative',
			description: gate.passed ? gate.description : gate.fail_message || gate.description,
			category: sectionCategoryMap[gate.section] || 'policy'
		};

		// Add CIBIL metric if this is a cibil section gate
		if (gate.section === 'cibil') {
			factor.metric = {
				label: 'CIBIL',
				value: gate.passed ? 'Meets requirement' : 'Below threshold',
				benchmark: 'min 650-700'
			};
		}

		factors.push(factor);
	}

	// -- FOIR factor --
	if (evaluation.max_foir > 0) {
		const foirPercent = Math.round(evaluation.foir * 100);
		const maxFoirPercent = Math.round(evaluation.max_foir * 100);
		const withinLimit = evaluation.foir <= evaluation.max_foir;

		factors.push({
			id: 'foir-check',
			label: 'FOIR',
			impact: withinLimit ? 'positive' : 'negative',
			description: `FOIR at ${foirPercent}% ${withinLimit ? 'is within' : 'exceeds'} the ${maxFoirPercent}% limit`,
			metric: {
				label: 'FOIR',
				value: `${foirPercent}%`,
				benchmark: `max ${maxFoirPercent}%`
			},
			category: 'obligation'
		});
	}

	// -- Income factor --
	if (evaluation.assessed_income > 0) {
		factors.push({
			id: 'income-check',
			label: 'Income Adequacy',
			impact: evaluation.offered_amount > 0 ? 'positive' : 'negative',
			description:
				evaluation.offered_amount > 0
					? `Assessed income of ${evaluation.assessed_income.toLocaleString('en-IN')} supports the loan amount`
					: `Assessed income of ${evaluation.assessed_income.toLocaleString('en-IN')} is insufficient to support the requested loan`,
			category: 'income'
		});
	}

	// -- LTV factor (secured loans only) --
	if (evaluation.ltv !== undefined && evaluation.max_ltv !== undefined && evaluation.max_ltv > 0) {
		const ltvPercent = Math.round(evaluation.ltv * 100);
		const maxLtvPercent = Math.round(evaluation.max_ltv * 100);
		const withinLimit = evaluation.ltv <= evaluation.max_ltv;

		factors.push({
			id: 'ltv-check',
			label: 'Loan to Value',
			impact: withinLimit ? 'positive' : 'negative',
			description: withinLimit
				? `LTV at ${ltvPercent}% is within the ${maxLtvPercent}% limit`
				: `LTV at ${ltvPercent}% exceeds the ${maxLtvPercent}% limit`,
			metric: {
				label: 'LTV',
				value: `${ltvPercent}%`,
				benchmark: `max ${maxLtvPercent}%`
			},
			category: 'property'
		});
	}

	// -- Minimum-loan-amount floor factor (P9) --
	// The engine sets traffic_light_message ONLY for the post-gate floor override, so
	// `red + message present` reliably identifies it. Without this factor the breakdown
	// shows income/CIBIL/FOIR all green while the lender is red, with no stated cause —
	// surfacing the engine's message here explains the real reason in "What Shaped This
	// Result". (If future overrides set the message too, this correctly surfaces those.)
	if (evaluation.traffic_light === 'red' && evaluation.traffic_light_message?.trim()) {
		factors.push({
			id: 'minimum-loan-amount',
			label: 'Minimum Loan Amount',
			impact: 'negative',
			description: evaluation.traffic_light_message,
			category: 'policy'
		});
	}

	return factors;
}

// ============================================================================
// 2. buildSuggestions
// ============================================================================

/**
 * Build ImprovementSuggestion[] from deviations and general improvement opportunities.
 */
export function buildSuggestions(
	evaluation: LenderEvaluation,
	payload: LoanApplicationPayload
): ImprovementSuggestion[] {
	const suggestions: ImprovementSuggestion[] = [];

	// -- Suggestions from deviations --
	for (const deviation of evaluation.deviations_applied) {
		suggestions.push({
			id: deviation.deviation_id,
			title:
				deviation.description.length > 80
					? deviation.description.substring(0, 77) + '...'
					: deviation.description,
			description: `Deviation possible with ${(deviation.approval_authority ?? 'manager').replace(/_/g, ' ')} approval`,
			effort: authorityToEffort(deviation.approval_authority ?? 'branch_manager')
		});
	}

	// -- General suggestions (only when applicable) --

	// Add co-applicant suggestion
	if (
		payload.loanTransaction.numberOfApplicants === 1 &&
		evaluation.assessed_income > 0 &&
		evaluation.offered_amount > 0 &&
		evaluation.assessed_income < evaluation.offered_amount * 0.02
	) {
		suggestions.push({
			id: 'add-coapplicant',
			title: 'Add a co-applicant',
			description:
				'Adding a co-applicant with income can significantly increase the eligible loan amount by combining income sources.',
			effort: 'moderate',
			potential_impact: {
				metric: 'amount',
				direction: 'increase',
				estimated_value: 'up to 30-40% more'
			}
		});
	}

	// Reduce obligations suggestion
	if (evaluation.obligation_load_monthly > 0 && evaluation.foir > 0.4) {
		suggestions.push({
			id: 'reduce-obligations',
			title: 'Close existing obligations',
			description:
				'Closing existing loans or credit lines will reduce FOIR and increase the eligible loan amount.',
			effort: 'significant',
			potential_impact: {
				metric: 'amount',
				direction: 'increase'
			}
		});
	}

	// Extend tenure suggestion (secured loans, tenure < 300 months / 25 years)
	const isSecured = evaluation.ltv !== undefined || evaluation.ltv_capped_amount !== undefined;
	if (isSecured && evaluation.tenure_months > 0 && evaluation.tenure_months < 300) {
		suggestions.push({
			id: 'extend-tenure',
			title: 'Extend tenure to reduce EMI',
			description:
				'A longer tenure reduces the monthly EMI, which lowers FOIR and may increase the eligible amount.',
			effort: 'easy',
			potential_impact: {
				metric: 'amount',
				direction: 'increase'
			}
		});
	}

	// Increase down payment suggestion (LTV caps the offer)
	if (
		evaluation.ltv_capped_amount !== undefined &&
		evaluation.foir_eligible_amount > 0 &&
		evaluation.ltv_capped_amount < evaluation.foir_eligible_amount
	) {
		suggestions.push({
			id: 'increase-downpayment',
			title: 'Increase down payment',
			description:
				'The LTV cap is limiting the offered amount. A larger down payment reduces the required loan amount relative to property value.',
			effort: 'moderate',
			potential_impact: {
				metric: 'amount',
				direction: 'increase'
			}
		});
	}

	// -- Rejection-history contextual tips --
	// When the DSA marked this case as "previously rejected", show prevention
	// tips relevant to the stated rejection reasons.
	const rejectionReasons = payload.loanTransaction?.rejectionReasons as string[] | undefined;
	const assessmentStatus = payload.loanTransaction?.assessmentStatus as string | undefined;
	if (assessmentStatus === 'rejected' && rejectionReasons && rejectionReasons.length > 0) {
		const rejectionTips = mapRejectionReasonsToTips(rejectionReasons);
		for (const tip of rejectionTips) {
			// Dedup with existing suggestions by id
			if (!suggestions.some((s) => s.id === tip.id)) {
				suggestions.push(tip);
			}
		}
	}

	return suggestions;
}

// ============================================================================
// 3. assignRatings
// ============================================================================

/** Rating result per lender */
export interface LenderRatings {
	overall: MetricRating;
	amount: MetricRating;
	roi: MetricRating;
	emi: MetricRating;
	tenure: MetricRating;
}

/**
 * Assign percentile-based relative ratings across all evaluations.
 * Returns a map keyed by lender_id.
 */
export function assignRatings(evaluations: LenderEvaluation[]): Map<string, LenderRatings> {
	const ratingsMap = new Map<string, LenderRatings>();

	// Filter to eligible evaluations (GREEN and AMBER only)
	const eligible = evaluations.filter(
		(e) => e.traffic_light === 'green' || e.traffic_light === 'amber'
	);

	// If no eligible evaluations, all get poor
	if (eligible.length === 0) {
		for (const ev of evaluations) {
			ratingsMap.set(ev.lender_id, {
				overall: 'poor',
				amount: 'poor',
				roi: 'poor',
				emi: 'poor',
				tenure: 'poor'
			});
		}
		return ratingsMap;
	}

	// Calculate percentile rank for a value in a sorted array.
	// sortedValues must be sorted in best-first order.
	function getPercentile(value: number, sortedValues: number[]): number {
		if (sortedValues.length <= 1) return 1;
		const index = sortedValues.indexOf(value);
		if (index === -1) return 0;
		// Percentile: fraction of values that are worse or equal
		return 1 - index / (sortedValues.length - 1);
	}

	// Sort arrays for each metric (best value first)
	const amounts = eligible.map((e) => e.offered_amount).sort((a, b) => b - a); // highest first
	const rois = eligible.map((e) => e.roi).sort((a, b) => a - b); // lowest first
	const emis = eligible.map((e) => e.emi).sort((a, b) => a - b); // lowest first
	const tenures = eligible.map((e) => e.tenure_months).sort((a, b) => b - a); // longest first

	// Assign ratings to eligible evaluations
	for (const ev of eligible) {
		const amountRating = percentileToRating(getPercentile(ev.offered_amount, amounts));
		const roiRating = percentileToRating(getPercentile(ev.roi, rois));
		const emiRating = percentileToRating(getPercentile(ev.emi, emis));
		const tenureRating = percentileToRating(getPercentile(ev.tenure_months, tenures));

		// Weighted average for overall using configured weights
		const weightedScore =
			ratingToNumeric(amountRating) * RATING_WEIGHTS.amount +
			ratingToNumeric(roiRating) * RATING_WEIGHTS.roi +
			ratingToNumeric(emiRating) * RATING_WEIGHTS.emi +
			ratingToNumeric(tenureRating) * RATING_WEIGHTS.tenure;

		ratingsMap.set(ev.lender_id, {
			overall: numericToRating(weightedScore),
			amount: amountRating,
			roi: roiRating,
			emi: emiRating,
			tenure: tenureRating
		});
	}

	// RED and GREY evaluations get poor for everything
	for (const ev of evaluations) {
		if (ev.traffic_light === 'red' || ev.traffic_light === 'grey') {
			ratingsMap.set(ev.lender_id, {
				overall: 'poor',
				amount: 'poor',
				roi: 'poor',
				emi: 'poor',
				tenure: 'poor'
			});
		}
	}

	return ratingsMap;
}

// ============================================================================
// 4. calculateApprovalProbability
// ============================================================================

/**
 * Calculate approval probability for a lender evaluation.
 * Returns a value between 0 and 1.
 * All constants sourced from systemConfig.ts — no hardcoded values.
 */
export function calculateApprovalProbability(evaluation: LenderEvaluation): number {
	// Base probability by traffic light (from systemConfig)
	let probability: number;
	switch (evaluation.traffic_light) {
		case 'green':
			probability = PROBABILITY_BASE.green;
			break;
		case 'amber':
			probability = PROBABILITY_BASE.amber;
			break;
		case 'red':
			probability = PROBABILITY_BASE.red;
			break;
		case 'grey':
			return PROBABILITY_BASE.grey;
	}

	// Deviation modifiers (each deviation reduces probability)
	for (const deviation of evaluation.deviations_applied) {
		probability += deviation.probability_modifier; // probability_modifier is negative
	}

	// FOIR proximity penalty (from systemConfig)
	if (evaluation.max_foir > 0) {
		const foirRatio = evaluation.foir / evaluation.max_foir;
		if (foirRatio > FOIR_PROXIMITY_PENALTIES.severe_threshold) {
			probability -= FOIR_PROXIMITY_PENALTIES.severe_penalty;
		} else if (foirRatio > FOIR_PROXIMITY_PENALTIES.moderate_threshold) {
			probability -= FOIR_PROXIMITY_PENALTIES.moderate_penalty;
		}
	}

	// CIBIL approximation from gate results
	const cibilGate = evaluation.gate_results.find((g) => g.section === 'cibil');
	if (cibilGate) {
		if (!cibilGate.passed) {
			// CIBIL gate failed — significant penalty (from systemConfig)
			probability -= CIBIL_FAILURE_PENALTY;
		}
	}

	// Clamp to [0, 1]
	return Math.max(0, Math.min(1, probability));
}

// ============================================================================
// 5. buildTrafficLightMessage
// ============================================================================

/**
 * Return a descriptive message for the traffic light status.
 */
export function buildTrafficLightMessage(evaluation: LenderEvaluation): string {
	// An engine-set traffic_light_message on a non-grey result is an authoritative
	// override that captures a reason NOT expressed as a failed gate — e.g. the
	// minimum-loan-amount floor (P9, evaluationEngine.ts), which flips a green/amber
	// result to red AFTER all gates pass. Re-deriving from gate_results below would
	// lose it and fall back to the generic "does not meet lender requirements",
	// leaving the DSA an all-green factor breakdown with no stated cause. Grey is
	// excluded: buildGreyEvaluation sets a message too, but grey deliberately
	// surfaces the generic "cannot evaluate" copy (see the switch's grey branch).
	if (
		evaluation.traffic_light !== 'grey' &&
		evaluation.traffic_light_message &&
		evaluation.traffic_light_message.trim() !== ''
	) {
		return evaluation.traffic_light_message;
	}
	switch (evaluation.traffic_light) {
		case 'green': {
			// Check if full amount was offered
			if (
				evaluation.offered_amount >= evaluation.eligible_amount &&
				evaluation.eligible_amount > 0
			) {
				return 'Eligible for full requested amount';
			}
			return 'Eligible with reduced amount due to policy constraints';
		}

		case 'amber': {
			if (evaluation.deviations_applied.length > 0) {
				// Use the first deviation authority
				const authority = (
					evaluation.deviations_applied[0].approval_authority ?? 'manager'
				).replace(/_/g, ' ');
				return `Partially eligible - deviation approval needed from ${authority}`;
			}
			return 'Partially eligible - amount reduced due to policy constraints';
		}

		case 'red': {
			// Use the first fail message from failed gates
			const failedGate = evaluation.gate_results.find((g) => !g.passed);
			if (failedGate?.fail_message) {
				return failedGate.fail_message;
			}
			return 'Not eligible - does not meet lender requirements';
		}

		case 'grey':
			return 'Cannot evaluate - insufficient application data';
	}
}

// ============================================================================
// PHASE 4: OFFER CARD ENRICHMENT FUNCTIONS
// ============================================================================

/**
 * Build tranche breakdown for New Loan with identified property and under-registration.
 * Guard: New Loan + propertyIdentified + registryValue > 0 + registryValue < propertyCost + offeredAmount > 0
 *
 * Disbursement model:
 * - HL tranche (to seller): min(offeredAmount, lcrCappedAmount) — disbursed at/before registry
 * - F&F tranche (to buyer): offeredAmount - HL tranche — disbursed after registry
 * - F&F release condition: buyer must pay remaining own contribution to seller first
 * - Own contribution: advance already paid + remaining to seller
 * - PL cross-sell hint: when own contribution > deposit (Coming Soon)
 */
export function buildTrancheBreakdown(
	evaluation: LenderEvaluation,
	payload: LoanApplicationPayload
): TrancheBreakdown | undefined {
	const tx = payload.loanTransaction;

	// Only for New Loan (not BT/top-up).
	// Audit BUG-D (2026-05-28): the actual loanType values from the form are
	// 'Balance Transfer Only' / 'Balance Transfer With Top-up' / 'Top-up Only',
	// never bare 'Balance Transfer' or 'Top-up'. Strict equality never matched,
	// so the tranche breakdown was being rendered for BT cases too (it's a
	// New-Loan-only artifact: amount delivered in tranches by stage of
	// construction). Substring match catches all 3 BT/Topup variants.
	{
		const lt = String(tx.loanType ?? '');
		if (lt.includes('Balance Transfer') || lt.includes('Top-up')) return undefined;
	}

	// Must have identified property with registry value
	if (!tx.propertyIdentified) return undefined;
	const registryValue = tx.registryValue ?? 0;
	const propertyCost = tx.propertyCost ?? 0;
	if (registryValue <= 0 || propertyCost <= 0) return undefined;

	// If registry equals deal value, no under-registration → no tranche split
	if (registryValue >= propertyCost) return undefined;

	const offeredAmount = evaluation.offered_amount;
	if (offeredAmount <= 0) return undefined;

	// ── Tranche calculation ──────────────────────────────────
	// HL tranche = min(offeredAmount, lcr_capped_amount)
	// lcr_capped_amount already has advanceInAgreement subtracted (Phase 3)
	const lcrCap = evaluation.lcr_capped_amount ?? offeredAmount;
	const homeLoanTranche = Math.min(offeredAmount, lcrCap);
	const ffTranche = offeredAmount - homeLoanTranche;

	// ── Own contribution calculation ─────────────────────────
	const advancePaid = evaluation.advance_in_agreement ?? 0;
	// Remaining to seller = propCost - HL tranche to seller - advance already paid
	const remainingToSeller = Math.max(0, propertyCost - homeLoanTranche - advancePaid);
	const totalOwnContribution = advancePaid + remainingToSeller;

	// ── Build tranches ───────────────────────────────────────
	const tranches: LoanTranche[] = [
		{
			category: 'home_loan',
			label: 'Home Loan',
			amount: homeLoanTranche,
			roi: evaluation.roi,
			timing: 'before_registry',
			timing_label: 'Disbursed at registry to seller',
			recipient: 'seller'
		}
	];

	if (ffTranche > 0) {
		const remainingFormatted = formatINRCompact(remainingToSeller);
		tranches.push({
			category: 'furniture_fixing',
			label: 'Furniture & Fixing',
			amount: ffTranche,
			roi: Math.round((evaluation.roi + 0.25) * 100) / 100,
			timing: 'after_registry',
			timing_label: 'Disbursed after registry to buyer',
			recipient: 'buyer',
			release_condition:
				remainingToSeller > 0
					? `Released after buyer pays remaining ${remainingFormatted} to seller`
					: 'Released after registry completion'
		});
	}

	// ── Post-registry gap warning ────────────────────────────
	const postRegistryGap = ffTranche;
	let mitigationGuidance: string | undefined;
	if (postRegistryGap > 0) {
		const formatted = formatINRCompact(postRegistryGap);
		mitigationGuidance = `${formatted} disbursed after registry. Buyer may arrange a cheque (preferably from spouse/family) for this amount to the seller. Once lender releases F&F funds post-registration, cheque is returned/cancelled. Inform lender about this arrangement.`;
	}

	// ── Own contribution breakdown ───────────────────────────
	const ownContribution =
		totalOwnContribution > 0
			? {
					advance_paid: advancePaid,
					remaining_to_seller: remainingToSeller,
					total: totalOwnContribution
				}
			: undefined;

	// ── PL cross-sell hint ───────────────────────────────────
	const deposit = tx.downPayment ?? 0;
	let plCrosssellHint: string | undefined;
	if (totalOwnContribution > deposit && deposit > 0) {
		const shortfall = formatINRCompact(totalOwnContribution - deposit);
		plCrosssellHint = `Own contribution (${formatINRCompact(totalOwnContribution)}) exceeds deposit (${formatINRCompact(deposit)}) by ${shortfall}. Personal Loan option — Coming Soon.`;
	}

	return {
		structure_type: 'new_loan',
		tranches,
		total_sanctioned: offeredAmount,
		post_registry_gap: postRegistryGap,
		mitigation_guidance: mitigationGuidance,
		lcr_is_failsafe: evaluation.lcr_is_failsafe,
		own_contribution: ownContribution,
		pl_crosssell_hint: plCrosssellHint
	};
}

/**
 * Extract NRI GPA policy from evaluation policies when ALL applicants are NRI.
 */
export function extractNriGpaPolicy(
	evaluation: LenderEvaluation,
	payload: LoanApplicationPayload
): string | undefined {
	const applicants = payload.allApplicantDetails;
	if (!applicants || applicants.length === 0) return undefined;

	// ALL applicants must be NRI
	const allNri = applicants.every((a) => a.isNRI === true);
	if (!allNri) return undefined;

	// Find nri_gpa_eligible_relationships policy
	const policy = evaluation.policies.find((p) => p.policy_key === 'nri_gpa_eligible_relationships');
	if (!policy) return undefined;

	const relationships = Array.isArray(policy.value)
		? (policy.value as string[]).join(', ')
		: String(policy.value);

	return `As per ${evaluation.lender_name}'s policy, ${relationships} are eligible as GPA`;
}

/**
 * Determine registry urgency from payload timeline.
 */
export function determineRegistryUrgency(
	payload: LoanApplicationPayload
): 'urgent' | 'normal' | undefined {
	const timeline = payload.loanTransaction.registryTimeline;
	if (!timeline) return undefined;
	return timeline === 'WITHIN_1_MONTH' ? 'urgent' : 'normal';
}

/**
 * Build BT appreciation signal when both market value and current property value exist.
 */
export function buildBTAppreciation(
	payload: LoanApplicationPayload
): BTAppreciationSignal | undefined {
	const tx = payload.loanTransaction;

	// Only for BT/top-up loan types.
	// Audit BUG-D (2026-05-28): mirror of the tranche-breakdown fix above —
	// strict equality on 'Balance Transfer' / 'Top-up' never matched the
	// actual form values, so the BT property-appreciation signal NEVER
	// rendered for any DSA case. Substring match restores it for all 3
	// BT/Topup variants.
	{
		const lt = String(tx.loanType ?? '');
		if (!lt.includes('Balance Transfer') && !lt.includes('Top-up')) return undefined;
	}

	const marketValue = tx.marketValue ?? 0;
	const currentPropertyValue = tx.currentPropertyValue ?? 0;
	if (marketValue <= 0 || currentPropertyValue <= 0) return undefined;

	const appreciationPercent =
		Math.round(((marketValue - currentPropertyValue) / currentPropertyValue) * 10000) / 100;

	let strength: 'strong' | 'moderate' | 'weak' | 'negative';
	if (appreciationPercent >= 20) strength = 'strong';
	else if (appreciationPercent >= 10) strength = 'moderate';
	else if (appreciationPercent >= 0) strength = 'weak';
	else strength = 'negative';

	const formatted = Math.abs(appreciationPercent).toFixed(1);
	const label =
		appreciationPercent >= 0 ? `+${formatted}% appreciation` : `-${formatted}% depreciation`;

	return {
		current_market_value: marketValue,
		reference_value: currentPropertyValue,
		appreciation_percent: appreciationPercent,
		label,
		strength
	};
}

/** Compact INR formatter for mitigation text */
function formatINRCompact(amount: number): string {
	if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
	if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
	if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
	return `₹${amount.toLocaleString('en-IN')}`;
}

// ============================================================================
// 5b. buildGeoPresence — Phase 5: Geographic advisory chip
// ============================================================================

/**
 * Build geo presence indicator from lender policy system.
 * Scores applicant's state/city against lender's geographic coverage data.
 * Tries name match first, falls back to ID match (handles naming mismatches
 * like "Bajaj Housing Finance" in rules vs "Bajaj Finserv" in directory).
 * Returns undefined when lender has no entry in the directory.
 */
function buildGeoPresence(
	evaluation: LenderEvaluation,
	payload: LoanApplicationPayload
): LenderResult['geo_presence'] {
	const lender =
		LENDER_BY_NAME.get(evaluation.lender_name) || LENDER_BY_ID.get(evaluation.lender_id);
	if (!lender?.geoCoverage) return undefined;

	// Secured loans: property location. Unsecured: residence/business location.
	const tx = payload.loanTransaction;
	const state = tx.propertyState || tx.residenceState || (tx as any).businessState;
	const city = tx.propertyCity || tx.residenceCity || (tx as any).businessCity;

	const result = scoreLenderGeoPresence(lender.geoCoverage, state, city);

	return {
		chip: result.chip,
		reason: result.reason,
		is_stronghold: result.isStronghold,
		geo_score: result.geoScore
	};
}

// ============================================================================
// 5c. buildPolicyDisplay — Convert ParsedPolicy[] to PolicyDisplayField[]
// ============================================================================

function buildPolicyDisplay(policies: ParsedPolicy[]): PolicyDisplayField[] {
	return policies
		.filter((p) => p.display_on_offer_card)
		.map((p) => ({
			key: p.policy_key,
			label: p.label,
			value: p.value,
			category: p.category
		}));
}

// ============================================================================
// 6. buildLenderResult
// ============================================================================

/**
 * Assemble the final LenderResult from an evaluation, ratings map, and payload.
 */
export function buildLenderResult(
	evaluation: LenderEvaluation,
	ratings: Map<string, LenderRatings>,
	dedupIndex: number | undefined,
	payload: LoanApplicationPayload
): LenderResult {
	// Derive lender application ID — must be unique across all results
	const classificationCode = (evaluation.classification ?? 'pvt').toLowerCase();
	let lenderAppId = `${evaluation.lender_id}-${classificationCode}`;
	// Append dedup suffix if a counter is provided (for same lender_id + classification)
	if (dedupIndex !== undefined && dedupIndex > 0) {
		lenderAppId = `${lenderAppId}-${dedupIndex}`;
	}

	// Get ratings for this lender (fallback to poor)
	const lenderRatings = ratings.get(evaluation.lender_id) || {
		overall: 'poor' as MetricRating,
		amount: 'poor' as MetricRating,
		roi: 'poor' as MetricRating,
		emi: 'poor' as MetricRating,
		tenure: 'poor' as MetricRating
	};

	// Extract primary applicant CIBIL score from payload
	// Use highest CIBIL — shows strongest credit position for result display
	const primaryCibil =
		Number(
			selectHighestCibil(
				(payload.allApplicantDetails ?? []) as unknown as Record<string, unknown>[]
			)?.creditScore
		) || 0;

	// Run discomfort analysis — detects gaps and generates calculated solutions
	const discomfort = analyzeDiscomfort(evaluation, payload);

	// Merge discomfort-driven suggestions with legacy static suggestions
	// Discomfort solutions are calculated with real numbers; legacy suggestions are generic
	const legacySuggestions = buildSuggestions(evaluation, payload);
	const discomfortSuggestions: ImprovementSuggestion[] = discomfort.quick_solutions.map((s) => ({
		id: s.id,
		title: s.title,
		description: s.description,
		potential_impact: {
			metric:
				s.impact.metric === 'foir' ||
				s.impact.metric === 'cibil' ||
				s.impact.metric === 'eligible_amount'
					? ('amount' as const)
					: (s.impact.metric as 'amount' | 'roi' | 'tenure'),
			direction: s.impact.after < s.impact.before ? 'decrease' : 'increase',
			estimated_value: s.impact.improvement
		},
		effort: s.effort
	}));

	// Discomfort suggestions first (they have calculated numbers), then legacy (dedup by id)
	const seenIds = new Set(discomfortSuggestions.map((s) => s.id));
	const mergedSuggestions = [
		...discomfortSuggestions,
		...legacySuggestions.filter((s) => !seenIds.has(s.id))
	];

	return {
		lender_application_id: lenderAppId,
		lender_id: evaluation.lender_id,
		lender_name: evaluation.lender_name,
		traffic_light: evaluation.traffic_light,
		traffic_light_message: buildTrafficLightMessage(evaluation),

		eligible_amount: evaluation.eligible_amount,
		ltv_capped_amount: evaluation.ltv_capped_amount,
		offered_amount: evaluation.offered_amount,
		roi: evaluation.roi,
		emi: evaluation.emi,
		tenure_months: evaluation.tenure_months,
		processing_fee_percent: evaluation.processing_fee_percent,

		rating: lenderRatings.overall,
		metric_ratings: {
			amount: lenderRatings.amount,
			roi: lenderRatings.roi,
			emi: lenderRatings.emi,
			tenure: lenderRatings.tenure
		},

		factors: buildFactors(evaluation),
		suggestions: mergedSuggestions,
		corporate_dsas: [],

		key_metrics: {
			foir: evaluation.foir ? Math.round(evaluation.foir * 100) : undefined,
			ltv: evaluation.ltv ? Math.round(evaluation.ltv * 100) : undefined,
			net_income: evaluation.assessed_income,
			cibil: primaryCibil,
			approval_probability: calculateApprovalProbability(evaluation)
		},

		discomfort,

		// Plot & Equity Loan 3-cap structure (LEND-1 Phase 2, ADR-0021).
		// Engine populated these only when the variant matches AND the lender
		// supplied all three caps. Phase 4 offer-card UI consumes the four
		// outputs for the breakdown; the two input fields (market + registry)
		// drive the buyer-margin-on-registered sub-note.
		plot_equity_sanction_headline: evaluation.plot_equity_sanction_headline,
		plot_equity_seller_disbursement: evaluation.plot_equity_seller_disbursement,
		plot_equity_buyer_cash_component: evaluation.plot_equity_buyer_cash_component,
		plot_equity_buyer_net_out_of_pocket: evaluation.plot_equity_buyer_net_out_of_pocket,
		plot_equity_market_value: evaluation.plot_equity_market_value,
		plot_equity_registry_value: evaluation.plot_equity_registry_value,

		// Phase 4: Offer card enrichment
		tranche_breakdown: buildTrancheBreakdown(evaluation, payload),
		nri_gpa_policy: extractNriGpaPolicy(evaluation, payload),
		registry_urgency: determineRegistryUrgency(payload),
		bt_appreciation: buildBTAppreciation(payload),

		// RE-7: Affordability back-calculation (secured loans, property not yet identified)
		affordability: evaluation.affordability,

		// Phase 5: Geographic presence advisory chip
		geo_presence: buildGeoPresence(evaluation, payload),

		// DB-resolved policy display fields
		policy_display: buildPolicyDisplay(evaluation.policies || []),

		// Guarantor eligibility assessment (per GUARANTOR-ELIGIBILITY-ASSESSMENT-SPEC.md).
		// Present only when the case has a guarantor; copied verbatim from the
		// engine evaluation. UI hides the row when undefined.
		guarantor: evaluation.guarantor,

		computed_at: new Date().toISOString()
	};
}

// ============================================================================
// 7. buildSummary
// ============================================================================

/**
 * Build ResultsSummary from sorted results and the original payload.
 */
export function buildSummary(
	results: LenderResult[],
	payload: LoanApplicationPayload
): ResultsSummary {
	const greenCount = results.filter((r) => r.traffic_light === 'green').length;
	const amberCount = results.filter((r) => r.traffic_light === 'amber').length;
	const redCount = results.filter((r) => r.traffic_light === 'red').length;

	// Non-red results for finding best values
	const nonRed = results.filter((r) => r.traffic_light !== 'red' && r.traffic_light !== 'grey');

	// Best amount: highest offered_amount among non-red
	let bestAmount: { value: number; lender: string } = { value: 0, lender: '' };
	for (const r of nonRed) {
		if (r.offered_amount > bestAmount.value) {
			bestAmount = { value: r.offered_amount, lender: r.lender_name };
		}
	}

	// Best ROI: lowest roi among non-red with roi > 0
	let bestRoi: { value: number; lender: string } = { value: 0, lender: '' };
	for (const r of nonRed) {
		if (r.roi > 0 && (bestRoi.value === 0 || r.roi < bestRoi.value)) {
			bestRoi = { value: r.roi, lender: r.lender_name };
		}
	}

	// Best EMI: lowest emi among non-red with emi > 0
	let bestEmi: { value: number; lender: string } = { value: 0, lender: '' };
	for (const r of nonRed) {
		if (r.emi > 0 && (bestEmi.value === 0 || r.emi < bestEmi.value)) {
			bestEmi = { value: r.emi, lender: r.lender_name };
		}
	}

	return {
		total_lenders: results.length,
		green_count: greenCount,
		amber_count: amberCount,
		red_count: redCount,
		best_amount: bestAmount,
		best_roi: bestRoi,
		best_emi: bestEmi,
		requested_amount: payload.loanTransaction.loanAmount,
		loan_type: payload.loanTransaction.loanName
	};
}
