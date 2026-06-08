/**
 * Offer Transformer
 * ══════════════════════════════════════════════════════════════════
 * Converts the external API's LoanOffer[] format into our internal
 * LenderResultsData format for persistence in LenderResultsSnapshots.
 *
 * Pure function — no DB calls, no side effects, easily testable.
 * ══════════════════════════════════════════════════════════════════
 */

import type { LoanOffer } from '$lib/types/loanTypes';
import type {
	LenderResult,
	LenderResultsData,
	ResultsSummary,
	DecisionFactor,
	MetricRating
} from '$lib/types/lenderResults';

// ============================================================================
// HELPERS
// ============================================================================

function sanitizeName(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

function deriveTrafficLight(offer: LoanOffer): 'green' | 'amber' | 'red' | 'grey' {
	const status = offer.error?.status || offer.checkEligibilityData?.error?.status;
	if (!status) return offer.SanctionAmount > 0 ? 'green' : 'grey';

	const lower = status.toLowerCase();
	if (lower === 'eligible' || lower === 'fully eligible') return 'green';
	if (lower.includes('partial')) return 'amber';
	if (lower === 'not eligible' || lower === 'rejected') return 'red';
	return 'grey';
}

function deriveRating(light: 'green' | 'amber' | 'red' | 'grey'): MetricRating {
	if (light === 'green') return 'good';
	if (light === 'amber') return 'average';
	return 'poor';
}

function deriveApprovalProbability(light: 'green' | 'amber' | 'red' | 'grey'): number {
	if (light === 'green') return 0.8;
	if (light === 'amber') return 0.5;
	if (light === 'red') return 0.2;
	return 0;
}

function deriveMetricRating(
	value: number,
	benchmarks: { good: number; avg: number },
	higher: boolean
): MetricRating {
	if (higher) {
		if (value >= benchmarks.good) return 'good';
		if (value >= benchmarks.avg) return 'average';
		return 'poor';
	}
	// Lower is better (e.g., ROI, EMI)
	if (value <= benchmarks.good) return 'good';
	if (value <= benchmarks.avg) return 'average';
	return 'poor';
}

function buildFactors(offer: LoanOffer): DecisionFactor[] {
	const factors: DecisionFactor[] = [];

	// Error reasons as factors
	const reasons = offer.error?.reasons || offer.checkEligibilityData?.error?.reasons || [];
	reasons.forEach((reason, i) => {
		factors.push({
			id: `reason-${i}`,
			label: 'Eligibility Factor',
			impact: 'negative',
			description: reason,
			category: 'policy'
		});
	});

	// Suggestion messages as factors
	const suggestions = offer.suggestionMsg || offer.suggestions || [];
	suggestions.forEach((msg, i) => {
		factors.push({
			id: `suggestion-${i}`,
			label: 'Recommendation',
			impact: 'neutral',
			description: msg,
			category: 'policy'
		});
	});

	// FOIR metric
	const foir = offer.checkEligibilityData?.foir;
	if (foir !== undefined && foir > 0) {
		factors.push({
			id: 'foir',
			label: 'FOIR',
			impact: foir <= 0.5 ? 'positive' : foir <= 0.65 ? 'neutral' : 'negative',
			description: `Fixed Obligation to Income Ratio is ${(foir * 100).toFixed(0)}%`,
			metric: {
				label: 'FOIR',
				value: `${(foir * 100).toFixed(0)}%`,
				benchmark: 'max 50-65%'
			},
			category: 'obligation'
		});
	}

	return factors;
}

// ============================================================================
// MAIN TRANSFORMER
// ============================================================================

/**
 * Converts external API LoanOffer[] into internal LenderResultsData.
 */
export function transformOffersToResults(
	rawOffers: LoanOffer[],
	loanType: string,
	requestedAmount?: number
): LenderResultsData {
	const now = new Date().toISOString();

	const results: LenderResult[] = rawOffers.map((offer, index) => {
		const name = offer.bankName || offer.productName || `Lender ${index + 1}`;
		const light = deriveTrafficLight(offer);
		const eligibleAmount = offer.checkEligibilityData?.maxEligibleLoanAmount || 0;
		const offeredAmount = offer.SanctionAmount || 0;
		const roi = offer.annualRate || offer.checkEligibilityData?.interestRate || 0;
		const emi = offer.emi || offer.checkEligibilityData?.emi || 0;
		const tenure = offer.tenure || offer.checkEligibilityData?.eligibleTenure || 0;
		const foir = offer.checkEligibilityData?.foir || 0;
		const netIncome = offer.checkEligibilityData?.totalMonthlyIncome || 0;

		return {
			lender_application_id: `lender-${index}-${sanitizeName(name)}`,
			lender_id: sanitizeName(name),
			lender_name: name,
			traffic_light: light,
			traffic_light_message:
				offer.error?.message ||
				offer.error?.status ||
				(light === 'green'
					? 'Eligible'
					: light === 'amber'
						? 'Partially Eligible'
						: 'Not Eligible'),

			eligible_amount: eligibleAmount,
			offered_amount: offeredAmount,
			roi,
			emi,
			tenure_months: tenure,
			processing_fee_percent: undefined,

			rating: deriveRating(light),
			metric_ratings: {
				amount: deriveMetricRating(
					offeredAmount,
					{ good: (requestedAmount || 0) * 0.9, avg: (requestedAmount || 0) * 0.7 },
					true
				),
				roi: deriveMetricRating(roi, { good: 9, avg: 11 }, false),
				emi: deriveMetricRating(emi, { good: netIncome * 0.4, avg: netIncome * 0.55 }, false),
				tenure: deriveMetricRating(tenure, { good: 240, avg: 180 }, true)
			},

			factors: buildFactors(offer),
			suggestions: [],
			corporate_dsas: [],

			key_metrics: {
				foir,
				net_income: netIncome,
				cibil: 0,
				approval_probability: deriveApprovalProbability(light)
			},

			computed_at: now
		};
	});

	// ── Build summary ──
	const greenResults = results.filter((r) => r.traffic_light === 'green');
	const amberResults = results.filter((r) => r.traffic_light === 'amber');
	const redResults = results.filter((r) => r.traffic_light === 'red');

	const bestAmount = results.reduce(
		(best, r) =>
			r.offered_amount > best.value ? { value: r.offered_amount, lender: r.lender_name } : best,
		{ value: 0, lender: '' }
	);
	const bestRoi = results
		.filter((r) => r.roi > 0)
		.reduce(
			(best, r) =>
				r.roi < best.value || best.value === 0 ? { value: r.roi, lender: r.lender_name } : best,
			{ value: 0, lender: '' }
		);
	const bestEmi = results
		.filter((r) => r.emi > 0)
		.reduce(
			(best, r) =>
				r.emi < best.value || best.value === 0 ? { value: r.emi, lender: r.lender_name } : best,
			{ value: 0, lender: '' }
		);

	const summary: ResultsSummary = {
		total_lenders: results.length,
		green_count: greenResults.length,
		amber_count: amberResults.length,
		red_count: redResults.length,
		best_amount: bestAmount,
		best_roi: bestRoi,
		best_emi: bestEmi,
		requested_amount: requestedAmount || 0,
		loan_type: loanType
	};

	return {
		summary,
		results,
		cross_sell: [],
		computed_at: now
	};
}
