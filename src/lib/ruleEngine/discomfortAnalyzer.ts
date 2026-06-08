// ============================================================================
// RE-3: DISCOMFORT ANALYZER — Detect, Quantify, and Solve Eligibility Gaps
// ============================================================================
// Pure function module (no DB access). Takes a LenderEvaluation + Payload,
// returns DiscomfortAnalysis with:
//   1. Discomfort Zones — what's blocking/limiting, quantified gap
//   2. Quick Solutions — calculated (not hardcoded) fixes ranked by impact
//   3. Async Hints — whether deep analysis (inverse solver, cross-lender) is warranted
//
// Philosophy: Every credit rejection comes from discomfort on 2 axes:
//   - ABILITY: Can the applicant(s) repay? (FOIR, income, age, obligations)
//   - INTENT:  Will they repay? (CIBIL, LTV/down payment, business vintage)
// ============================================================================

import type { LenderEvaluation } from './types.js';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder.js';
import type {
	DiscomfortZone,
	QuickSolution,
	DiscomfortAnalysis,
	DiscomfortSeverity
} from '$lib/types/lenderResults.js';
import { calculateEMI } from './emiCalculator.js';
import { selectYoungest, selectHighestCibil } from './applicantSelectors.js';
import type { LenderClassification } from '$lib/types/policyEngine.js';
import { getCategoryDefaults } from '$lib/config/lenderPolicies/categoryDefaults.js';
import { applyOverride, LENDER_OVERRIDES } from '$lib/config/lenderPolicies/lenderOverrides.js';

// ============================================================================
// 1. ZONE DETECTORS — Each detects one type of discomfort
// ============================================================================

/**
 * Detect FOIR breach or marginal FOIR.
 * FOIR = (obligations + EMI) / income. If > max_foir → blocking.
 * If within 5% of max_foir → marginal (lender may still be uncomfortable).
 */
function detectFoirZone(ev: LenderEvaluation): DiscomfortZone | null {
	if (ev.max_foir <= 0 || ev.assessed_income <= 0) return null;

	const foirPercent = Math.round(ev.foir * 100);
	const maxFoirPercent = Math.round(ev.max_foir * 100);

	if (ev.foir > ev.max_foir) {
		const gapPercent = foirPercent - maxFoirPercent;
		const gapMonthly = Math.round((ev.foir - ev.max_foir) * ev.assessed_income);
		return {
			zone_id: 'foir_breach',
			category: 'ability',
			label: 'FOIR Breach',
			severity: 'blocking',
			current_value: ev.foir,
			required_value: ev.max_foir,
			gap: gapPercent,
			gap_unit: '%',
			explanation: `FOIR is ${foirPercent}%, needs to be ≤${maxFoirPercent}%. Gap: ${gapPercent}% (≈₹${gapMonthly.toLocaleString('en-IN')}/month excess obligations)`
		};
	}

	// Marginal — within 5 percentage points of the cap
	const marginThreshold = ev.max_foir * 0.95;
	if (ev.foir > marginThreshold) {
		const headroomPercent = maxFoirPercent - foirPercent;
		return {
			zone_id: 'foir_marginal',
			category: 'ability',
			label: 'FOIR Near Limit',
			severity: 'marginal',
			current_value: ev.foir,
			required_value: ev.max_foir,
			gap: headroomPercent,
			gap_unit: '%',
			explanation: `FOIR is ${foirPercent}%, only ${headroomPercent}% below the ${maxFoirPercent}% limit. Credit managers may seek additional comfort.`
		};
	}

	return null;
}

/**
 * Detect LTV shortfall — when LTV cap reduces the offered amount below FOIR-eligible.
 * This means the applicant can AFFORD more loan, but the property value doesn't support it.
 */
function detectLtvZone(
	ev: LenderEvaluation,
	payload: LoanApplicationPayload
): DiscomfortZone | null {
	if (ev.ltv_capped_amount === undefined || ev.foir_eligible_amount <= 0) return null;

	// LTV is the bottleneck only when LTV-capped < FOIR-eligible
	if (ev.ltv_capped_amount < ev.foir_eligible_amount) {
		const shortfall = ev.foir_eligible_amount - ev.ltv_capped_amount;
		const propertyCost = payload.loanTransaction.propertyCost ?? 0;
		const maxLtvPercent = ev.max_ltv !== undefined ? Math.round(ev.max_ltv * 100) : 0;

		return {
			zone_id: 'ltv_shortfall',
			category: 'intent',
			label: 'LTV Shortfall',
			severity: shortfall > ev.ltv_capped_amount * 0.2 ? 'blocking' : 'limiting',
			current_value: ev.ltv_capped_amount,
			required_value: ev.foir_eligible_amount,
			gap: shortfall,
			gap_unit: '₹',
			explanation: `LTV cap (${maxLtvPercent}%) limits loan to ₹${ev.ltv_capped_amount.toLocaleString('en-IN')}, but income supports ₹${ev.foir_eligible_amount.toLocaleString('en-IN')}. Gap: ₹${shortfall.toLocaleString('en-IN')}. ${propertyCost > 0 ? `Property cost: ₹${propertyCost.toLocaleString('en-IN')}` : ''}`
		};
	}

	return null;
}

/**
 * Detect CIBIL below threshold from failed gate results.
 */
function detectCibilZone(
	ev: LenderEvaluation,
	payload: LoanApplicationPayload
): DiscomfortZone | null {
	const cibilGate = ev.gate_results.find((g) => g.section === 'cibil' && !g.passed);
	if (!cibilGate) return null;

	// Use highest CIBIL — shows strongest credit position for gap analysis
	const applicants = payload.allApplicantDetails ?? [];
	const applicantCibil =
		Number(selectHighestCibil(applicants as unknown as Record<string, unknown>[])?.creditScore) ||
		0;

	// Try to extract the threshold from the fail message (pattern: "must be XXX or above")
	const thresholdMatch = cibilGate.fail_message?.match(/(\d{3})/);
	const threshold = thresholdMatch ? parseInt(thresholdMatch[1]) : 700; // reasonable default

	const gap = threshold - applicantCibil;

	return {
		zone_id: 'cibil_below_threshold',
		category: 'intent',
		label: 'CIBIL Below Threshold',
		severity: gap > 100 ? 'blocking' : gap > 50 ? 'limiting' : 'marginal',
		current_value: applicantCibil,
		required_value: threshold,
		gap,
		gap_unit: 'points',
		explanation: `CIBIL score ${applicantCibil} is ${gap} points below the ${threshold} minimum. ${gap <= 50 ? 'A deviation may be possible for strong income profiles.' : 'Significant score improvement needed.'}`
	};
}

/**
 * Detect age at maturity constraint — when effective tenure is reduced due to age cap.
 */
function detectAgeZone(
	ev: LenderEvaluation,
	payload: LoanApplicationPayload
): DiscomfortZone | null {
	const requestedTenureMonths = payload.loanTransaction.tenureYears * 12;
	if (ev.tenure_months >= requestedTenureMonths || ev.tenure_months <= 0) return null;

	const requestedYears = payload.loanTransaction.tenureYears;
	const effectiveYears = Math.round(ev.tenure_months / 12);
	const reducedByYears = requestedYears - effectiveYears;

	// Only flag if tenure was reduced by more than 2 years
	if (reducedByYears <= 2) return null;

	// Use youngest applicant — matches the age used in tenure calculation
	const primaryAge =
		Number(
			selectYoungest((payload.allApplicantDetails ?? []) as unknown as Record<string, unknown>[])
				?.age
		) || 0;

	return {
		zone_id: 'age_maturity_limit',
		category: 'ability',
		label: 'Age Limits Tenure',
		severity: reducedByYears > 10 ? 'blocking' : 'limiting',
		current_value: effectiveYears,
		required_value: requestedYears,
		gap: reducedByYears,
		gap_unit: 'years',
		explanation: `Requested ${requestedYears}yr tenure reduced to ${effectiveYears}yr due to age-at-maturity cap. Primary applicant age: ${primaryAge}. This increases EMI significantly.`
	};
}

/**
 * Detect income insufficiency — offered amount is much less than requested.
 */
function detectIncomeZone(
	ev: LenderEvaluation,
	payload: LoanApplicationPayload
): DiscomfortZone | null {
	const requestedAmount = payload.loanTransaction.loanAmount;
	if (requestedAmount <= 0 || ev.offered_amount <= 0) return null;

	const ratio = ev.offered_amount / requestedAmount;

	// Only flag if offered is less than 80% of requested (significant shortfall)
	if (ratio >= 0.8) return null;

	const shortfall = requestedAmount - ev.offered_amount;

	let severity: DiscomfortSeverity;
	if (ratio < 0.5) severity = 'blocking';
	else if (ratio < 0.7) severity = 'limiting';
	else severity = 'marginal';

	return {
		zone_id: 'income_insufficiency',
		category: 'ability',
		label: 'Income Shortfall',
		severity,
		current_value: ev.offered_amount,
		required_value: requestedAmount,
		gap: shortfall,
		gap_unit: '₹',
		explanation: `Offered ₹${ev.offered_amount.toLocaleString('en-IN')} is ${Math.round(ratio * 100)}% of requested ₹${requestedAmount.toLocaleString('en-IN')}. Shortfall: ₹${shortfall.toLocaleString('en-IN')}.`
	};
}

/**
 * Detect obligation overload — obligations consume too much of assessed income.
 */
function detectObligationZone(ev: LenderEvaluation): DiscomfortZone | null {
	if (ev.assessed_income <= 0 || ev.obligation_load_monthly <= 0) return null;

	const oblRatio = ev.obligation_load_monthly / ev.assessed_income;

	// Flag if obligations consume > 30% of income (leaving little room for new EMI)
	if (oblRatio <= 0.3) return null;

	const oblPercent = Math.round(oblRatio * 100);

	return {
		zone_id: 'obligation_overload',
		category: 'ability',
		label: 'High Existing Obligations',
		severity: oblRatio > 0.5 ? 'blocking' : 'limiting',
		current_value: ev.obligation_load_monthly,
		required_value: Math.round(ev.assessed_income * 0.3),
		gap: Math.round(ev.obligation_load_monthly - ev.assessed_income * 0.3),
		gap_unit: '₹',
		explanation: `Existing obligations of ₹${ev.obligation_load_monthly.toLocaleString('en-IN')}/month consume ${oblPercent}% of assessed income. This severely limits FOIR headroom for new EMI.`
	};
}

/**
 * Detect failed eligibility gates (age, company vintage, NRI, etc.)
 */
function detectGateFailureZones(ev: LenderEvaluation): DiscomfortZone[] {
	const zones: DiscomfortZone[] = [];

	for (const gate of ev.gate_results) {
		if (gate.passed) continue;
		// Skip CIBIL gates — handled by detectCibilZone with quantified gap
		if (gate.section === 'cibil') continue;

		zones.push({
			zone_id: `gate_${gate.rule_id}`,
			category: gate.section === 'company' ? 'intent' : 'ability',
			label: `Failed: ${gate.description.length > 50 ? gate.description.substring(0, 47) + '...' : gate.description}`,
			severity: 'blocking',
			current_value: 0,
			required_value: 0,
			gap: 0,
			gap_unit: '',
			explanation: gate.fail_message || gate.description
		});
	}

	return zones;
}

// ============================================================================
// 2. SOLUTION GENERATORS — Calculate (not hardcode) solutions per zone
// ============================================================================

/**
 * Generate solutions for FOIR breach.
 */
function solveFoirBreach(
	ev: LenderEvaluation,
	payload: LoanApplicationPayload,
	zone: DiscomfortZone
): QuickSolution[] {
	const solutions: QuickSolution[] = [];

	// Solution 1: Extend tenure (if applicable)
	const isSecured = ev.ltv !== undefined || ev.ltv_capped_amount !== undefined;
	if (isSecured && ev.tenure_months < 360) {
		const extendedTenure = Math.min(360, ev.tenure_months + 60); // +5 years
		const currentEMI = ev.emi;
		const newEMI = calculateEMI(ev.offered_amount, ev.roi, extendedTenure);
		const newFoir =
			ev.assessed_income > 0 ? (ev.obligation_load_monthly + newEMI) / ev.assessed_income : 0;

		if (newEMI < currentEMI) {
			solutions.push({
				id: 'extend-tenure-foir',
				zone_id: zone.zone_id,
				title: `Extend tenure to ${Math.round(extendedTenure / 12)} years`,
				description: `Increasing tenure from ${Math.round(ev.tenure_months / 12)} to ${Math.round(extendedTenure / 12)} years reduces EMI, lowering FOIR.`,
				impact: {
					metric: 'foir',
					before: ev.foir,
					after: newFoir,
					improvement: `FOIR drops from ${Math.round(ev.foir * 100)}% to ${Math.round(newFoir * 100)}%`
				},
				effort: 'easy',
				timeframe: 'immediate',
				intent_risk: 'none'
			});
		}
	}

	// Solution 2: Close specific obligations (biggest impact first)
	if (ev.obligation_details.length > 0) {
		// Sort by counted_amount descending — closing the biggest obligation has most impact
		const sortedObligations = [...ev.obligation_details]
			.filter((d) => d.counted_amount > 0)
			.sort((a, b) => b.counted_amount - a.counted_amount);

		if (sortedObligations.length > 0) {
			const topObl = sortedObligations[0];
			const reducedObligations = ev.obligation_load_monthly - topObl.counted_amount;
			const newFoir =
				ev.assessed_income > 0 ? (reducedObligations + ev.emi) / ev.assessed_income : 0;

			solutions.push({
				id: `close-obligation-${topObl.obligation_index}`,
				zone_id: zone.zone_id,
				title: `Close ₹${topObl.counted_amount.toLocaleString('en-IN')}/month obligation`,
				description: `Closing the ${topObl.type === 'term_loan' ? 'loan' : 'credit line'} (₹${topObl.counted_amount.toLocaleString('en-IN')}/month) frees up FOIR headroom.`,
				impact: {
					metric: 'foir',
					before: ev.foir,
					after: newFoir,
					improvement: `FOIR drops from ${Math.round(ev.foir * 100)}% to ${Math.round(newFoir * 100)}%`
				},
				effort: 'significant',
				timeframe: 'weeks',
				intent_risk: 'none'
			});
		}
	}

	// Solution 3: Add co-applicant income
	if (payload.loanTransaction.numberOfApplicants === 1 && ev.assessed_income > 0) {
		// Calculate how much additional income is needed to bring FOIR within cap
		const totalEmiPlusObl = ev.obligation_load_monthly + ev.emi;
		const requiredIncome = totalEmiPlusObl / ev.max_foir;
		const additionalIncomeNeeded = requiredIncome - ev.assessed_income;

		if (additionalIncomeNeeded > 0) {
			solutions.push({
				id: 'add-coapplicant-income',
				zone_id: zone.zone_id,
				title: 'Add co-applicant with income',
				description: `Additional ₹${Math.round(additionalIncomeNeeded).toLocaleString('en-IN')}/month income from a co-applicant brings FOIR within the ${Math.round(ev.max_foir * 100)}% limit.`,
				impact: {
					metric: 'foir',
					before: ev.foir,
					after: ev.max_foir,
					improvement: `FOIR drops from ${Math.round(ev.foir * 100)}% to within ${Math.round(ev.max_foir * 100)}% with additional income`
				},
				effort: 'moderate',
				timeframe: 'weeks',
				intent_risk: 'none'
			});
		}
	}

	// Solution 4: Reduce loan amount
	if (ev.foir_eligible_amount > 0 && ev.foir_eligible_amount < payload.loanTransaction.loanAmount) {
		const newEMI = calculateEMI(ev.foir_eligible_amount, ev.roi, ev.tenure_months);
		solutions.push({
			id: 'reduce-loan-amount',
			zone_id: zone.zone_id,
			title: `Reduce loan to ₹${(ev.foir_eligible_amount / 100000).toFixed(1)}L`,
			description: `Reducing loan from ₹${(payload.loanTransaction.loanAmount / 100000).toFixed(1)}L to ₹${(ev.foir_eligible_amount / 100000).toFixed(1)}L brings FOIR within the limit.`,
			impact: {
				metric: 'emi',
				before: ev.emi,
				after: newEMI,
				improvement: `EMI drops from ₹${ev.emi.toLocaleString('en-IN')} to ₹${newEMI.toLocaleString('en-IN')}`
			},
			effort: 'easy',
			timeframe: 'immediate',
			intent_risk: 'none'
		});
	}

	return solutions;
}

/**
 * Generate solutions for LTV shortfall (down payment gap).
 */
function solveLtvShortfall(
	ev: LenderEvaluation,
	payload: LoanApplicationPayload,
	zone: DiscomfortZone
): QuickSolution[] {
	const solutions: QuickSolution[] = [];
	const propertyCost = payload.loanTransaction.propertyCost ?? 0;
	const ltvCapped = ev.ltv_capped_amount ?? 0;

	// Solution 1: Increase own contribution
	if (propertyCost > 0 && ltvCapped > 0) {
		const requiredDP = propertyCost - ltvCapped;

		solutions.push({
			id: 'increase-dp',
			zone_id: zone.zone_id,
			title: `Arrange ₹${(requiredDP / 100000).toFixed(1)}L down payment`,
			description: `Minimum down payment of ₹${requiredDP.toLocaleString('en-IN')} required per LTV regulation. This demonstrates your genuine interest in the property.`,
			impact: {
				metric: 'eligible_amount',
				before: ltvCapped,
				after: ltvCapped,
				improvement: `LTV-compliant loan amount: ₹${ltvCapped.toLocaleString('en-IN')}`
			},
			effort: 'significant',
			timeframe: 'weeks',
			intent_risk: 'none'
		});
	}

	// Solution 2: PL bridge (with intent risk warning)
	if (zone.gap > 0 && ev.foir_eligible_amount > ltvCapped) {
		const plAmount = zone.gap;
		// Use per-lender PL rate: category defaults (PSB/PVT/HFC/NBFC bucket) merged with
		// lender-specific override. Same lookup pattern as evaluationEngine.ts affordability calc.
		// Defensive fallback to 'PVT' — evaluationEngine populates classification when
		// building the rule doc, but other call paths could leave it null/undefined,
		// in which case getCategoryDefaults(undefined) returns undefined and the
		// `.roi.personalLoan` access below crashes.
		const plBase = getCategoryDefaults((ev.classification ?? 'PVT') as LenderClassification);
		const plOverride = LENDER_OVERRIDES[ev.lender_id];
		const plPolicy = plOverride ? applyOverride(plBase, plOverride) : plBase;
		const plROI = plPolicy.roi.personalLoan.baseRate;
		// Cap at 60 months — PL bridge is short-term by design, even if lender allows longer
		const plTenure = Math.min(plPolicy.tenure.personalLoan.maxTenureMonths, 60);
		const plEMI = calculateEMI(plAmount, plROI, plTenure);
		const combinedFoir =
			ev.assessed_income > 0
				? (ev.obligation_load_monthly + ev.emi + plEMI) / ev.assessed_income
				: 0;
		const feasible = combinedFoir <= ev.max_foir;

		solutions.push({
			id: 'pl-bridge',
			zone_id: zone.zone_id,
			title: `Personal Loan bridge: ₹${(plAmount / 100000).toFixed(1)}L`,
			description: `A PL of ₹${plAmount.toLocaleString('en-IN')} can cover the down payment gap. PL EMI: ₹${plEMI.toLocaleString('en-IN')}/month. Combined FOIR: ${Math.round(combinedFoir * 100)}%. ${feasible ? 'Feasible within FOIR.' : 'WARNING: Combined FOIR exceeds limit.'}`,
			impact: {
				metric: 'foir',
				before: ev.foir,
				after: combinedFoir,
				improvement: feasible
					? `PL bridge feasible — combined FOIR ${Math.round(combinedFoir * 100)}% within limit`
					: `PL bridge NOT feasible — combined FOIR ${Math.round(combinedFoir * 100)}% exceeds ${Math.round(ev.max_foir * 100)}% limit`
			},
			effort: 'moderate',
			timeframe: 'weeks',
			intent_risk: 'high',
			intent_risk_note:
				'Credit managers may see PL inquiry in CIBIL, indicating down payment is not from earned savings — creates discomfort on intent/interest assessment.'
		});
	}

	// Solution 3: Find cheaper property (inverse solve hint)
	if (propertyCost > 0 && ev.max_ltv !== undefined && ev.max_ltv > 0) {
		const maxPropertyAtCurrentLoan = ltvCapped / ev.max_ltv;
		if (maxPropertyAtCurrentLoan < propertyCost) {
			solutions.push({
				id: 'cheaper-property',
				zone_id: zone.zone_id,
				title: `Max property: ₹${(maxPropertyAtCurrentLoan / 100000).toFixed(1)}L`,
				description: `At ${Math.round(ev.max_ltv * 100)}% LTV, the maximum property cost supported by this loan amount is ₹${Math.round(maxPropertyAtCurrentLoan).toLocaleString('en-IN')}.`,
				impact: {
					metric: 'eligible_amount',
					before: propertyCost,
					after: maxPropertyAtCurrentLoan,
					improvement: `Property budget needs to be within ₹${Math.round(maxPropertyAtCurrentLoan).toLocaleString('en-IN')}`
				},
				effort: 'significant',
				timeframe: 'months',
				intent_risk: 'none'
			});
		}
	}

	return solutions;
}

/**
 * Generate solutions for CIBIL below threshold.
 */
function solveCibilBelow(
	ev: LenderEvaluation,
	_payload: LoanApplicationPayload,
	zone: DiscomfortZone
): QuickSolution[] {
	const solutions: QuickSolution[] = [];

	// Solution 1: Add strong co-applicant
	solutions.push({
		id: 'add-strong-coapplicant',
		zone_id: zone.zone_id,
		title: 'Add co-applicant with CIBIL 750+',
		description: `A co-applicant with strong CIBIL (750+) can strengthen the case. Some lenders consider the highest CIBIL among applicants.`,
		impact: {
			metric: 'cibil',
			before: zone.current_value,
			after: 750,
			improvement: `Co-applicant CIBIL 750+ may compensate for primary's ${zone.current_value}`
		},
		effort: 'moderate',
		timeframe: 'immediate',
		intent_risk: 'none'
	});

	// Solution 2: Score improvement (if gap is small)
	if (zone.gap <= 70) {
		solutions.push({
			id: 'improve-cibil-score',
			zone_id: zone.zone_id,
			title: 'Improve CIBIL score',
			description: `Pay down credit card utilization below 30%, clear any overdue payments. Estimated improvement: +20-40 points in 45-60 days.`,
			impact: {
				metric: 'cibil',
				before: zone.current_value,
				after: zone.current_value + 30,
				improvement: `Estimated +20-40 points by reducing CC utilization`
			},
			effort: 'moderate',
			timeframe: 'months',
			intent_risk: 'none'
		});
	}

	return solutions;
}

/**
 * Generate solutions for age-limited tenure.
 */
function solveAgeLimit(
	ev: LenderEvaluation,
	payload: LoanApplicationPayload,
	zone: DiscomfortZone
): QuickSolution[] {
	const solutions: QuickSolution[] = [];
	// Use youngest applicant — consistent with tenure calculation
	const primaryAge =
		Number(
			selectYoungest((payload.allApplicantDetails ?? []) as unknown as Record<string, unknown>[])
				?.age
		) || 0;

	// Solution: Add younger co-applicant
	const idealCoAppAge = Math.max(25, primaryAge - 15);
	const maxTenureWithYounger = Math.min(360, (65 - idealCoAppAge) * 12); // assuming 65 maturity
	const currentEMI = ev.emi;
	const newEMI = calculateEMI(ev.offered_amount, ev.roi, maxTenureWithYounger);

	if (maxTenureWithYounger > ev.tenure_months && newEMI < currentEMI) {
		solutions.push({
			id: 'add-younger-coapplicant',
			zone_id: zone.zone_id,
			title: `Add co-applicant aged ~${idealCoAppAge}`,
			description: `A younger co-applicant (age ~${idealCoAppAge}) extends the effective tenure from ${Math.round(ev.tenure_months / 12)}yr to ${Math.round(maxTenureWithYounger / 12)}yr, reducing EMI.`,
			impact: {
				metric: 'emi',
				before: currentEMI,
				after: newEMI,
				improvement: `EMI drops from ₹${currentEMI.toLocaleString('en-IN')} to ₹${newEMI.toLocaleString('en-IN')}`
			},
			effort: 'moderate',
			timeframe: 'immediate',
			intent_risk: 'none'
		});
	}

	return solutions;
}

// ============================================================================
// 3. MAIN ANALYZER — Orchestrates zone detection + solution generation
// ============================================================================

/**
 * Analyze a lender evaluation for discomfort zones and generate solutions.
 *
 * This is a pure function — no database access, no side effects.
 * Called once per lender evaluation during result building.
 *
 * @param evaluation - The intermediate LenderEvaluation from evaluateLender()
 * @param payload - The original loan application payload
 * @returns DiscomfortAnalysis with zones, solutions, and async hints
 */
export function analyzeDiscomfort(
	evaluation: LenderEvaluation,
	payload: LoanApplicationPayload
): DiscomfortAnalysis {
	// GREY evaluations have no meaningful analysis
	if (evaluation.traffic_light === 'grey') {
		return {
			discomfort_zones: [],
			quick_solutions: [],
			async_hints: { needs_inverse_solve: false, needs_cross_lender: false, needs_pl_bridge: false }
		};
	}

	// GREEN with full amount — no discomfort
	if (
		evaluation.traffic_light === 'green' &&
		evaluation.offered_amount >= payload.loanTransaction.loanAmount
	) {
		// Still check for marginal FOIR to add advisory zones
		const foirZone = detectFoirZone(evaluation);
		const zones = foirZone ? [foirZone] : [];
		return {
			discomfort_zones: zones,
			quick_solutions: [],
			async_hints: { needs_inverse_solve: false, needs_cross_lender: false, needs_pl_bridge: false }
		};
	}

	// ── Detect all discomfort zones ──────────────────────────────────────
	const zones: DiscomfortZone[] = [];

	const foirZone = detectFoirZone(evaluation);
	if (foirZone) zones.push(foirZone);

	const ltvZone = detectLtvZone(evaluation, payload);
	if (ltvZone) zones.push(ltvZone);

	const cibilZone = detectCibilZone(evaluation, payload);
	if (cibilZone) zones.push(cibilZone);

	const ageZone = detectAgeZone(evaluation, payload);
	if (ageZone) zones.push(ageZone);

	const incomeZone = detectIncomeZone(evaluation, payload);
	if (incomeZone) zones.push(incomeZone);

	const oblZone = detectObligationZone(evaluation);
	if (oblZone) zones.push(oblZone);

	// Gate failure zones (non-CIBIL)
	const gateZones = detectGateFailureZones(evaluation);
	zones.push(...gateZones);

	// Sort by severity: blocking > limiting > marginal
	const severityOrder: Record<DiscomfortSeverity, number> = {
		blocking: 0,
		limiting: 1,
		marginal: 2
	};
	zones.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

	// ── Generate solutions for each zone ────────────────────────────────
	const allSolutions: QuickSolution[] = [];

	for (const zone of zones) {
		let zoneSolutions: QuickSolution[] = [];

		switch (zone.zone_id) {
			case 'foir_breach':
			case 'foir_marginal':
				zoneSolutions = solveFoirBreach(evaluation, payload, zone);
				break;
			case 'ltv_shortfall':
				zoneSolutions = solveLtvShortfall(evaluation, payload, zone);
				break;
			case 'cibil_below_threshold':
				zoneSolutions = solveCibilBelow(evaluation, payload, zone);
				break;
			case 'age_maturity_limit':
				zoneSolutions = solveAgeLimit(evaluation, payload, zone);
				break;
			case 'obligation_overload':
				// Use FOIR solutions (closing obligations is the main lever)
				zoneSolutions = solveFoirBreach(evaluation, payload, zone);
				break;
			// Gate failure zones don't have quick solutions (they're hard blocks)
			default:
				break;
		}

		allSolutions.push(...zoneSolutions);
	}

	// Deduplicate solutions by id (same solution may be generated for multiple zones)
	const uniqueSolutions = new Map<string, QuickSolution>();
	for (const s of allSolutions) {
		if (!uniqueSolutions.has(s.id)) {
			uniqueSolutions.set(s.id, s);
		}
	}

	// Top 5 solutions only — keep it actionable
	const topSolutions = [...uniqueSolutions.values()].slice(0, 5);

	// ── Async hints ─────────────────────────────────────────────────────
	const asyncHints = {
		// Need inverse solve when there's an LTV or income gap
		needs_inverse_solve: !!ltvZone || !!incomeZone,
		// Need cross-lender when a gate fails (another lender might pass)
		needs_cross_lender: gateZones.length > 0 || !!cibilZone,
		// Need PL bridge when LTV gap exists and income can support PL EMI
		needs_pl_bridge: !!ltvZone && evaluation.foir < evaluation.max_foir * 0.9
	};

	return {
		discomfort_zones: zones,
		quick_solutions: topSolutions,
		async_hints: asyncHints
	};
}
