/**
 * Scorecard Engine — Phase 4.8
 * ══════════════════════════════════════════════════════════════════
 * Pure-function module: receives case data + DSA profile, returns
 * a performance scorecard with 8 metrics, insights, and trends.
 * No database calls — fully testable and side-effect free.
 * ══════════════════════════════════════════════════════════════════
 */

import type { Case, DocumentChecklistItem } from '$lib/types/case.js';

// ============================================================================
// TYPES
// ============================================================================

export type MetricRating = 'excellent' | 'good' | 'needs_improvement' | 'critical';
export type MetricTrend = 'up' | 'down' | 'stable';
export type MetricUnit = 'cases' | 'days' | 'percent' | 'amount' | 'count';

export interface ScorecardMetric {
	metric_id: string;
	label: string;
	current_value: number;
	target_value: number;
	unit: MetricUnit;
	progress_percent: number; // 0-100+, can exceed 100
	trend: MetricTrend;
	trend_value?: number; // e.g., +15 (percentage points)
	rating: MetricRating;
	/**
	 * True when this metric had NO underlying sample in the current period (e.g. a
	 * brand-new/low-volume DSA with no decided cases yet). Such a metric is rated a
	 * benign 'good' rather than a misleading 'critical'/'excellent' (B.6, owner
	 * decision 2026-05-22), and is EXCLUDED from the overall weighted score so an
	 * empty track record isn't scored as poor performance.
	 */
	insufficient_data?: boolean;
}

export interface Scorecard {
	overall_score: number; // 0-100
	overall_rating: MetricRating;
	metrics: ScorecardMetric[];
	insights: string[];
	generated_at: Date;
}

export interface ScorecardOptions {
	period_months?: number;
	now?: Date; // for testing — override "current time"
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Default targets when DSA profile does not specify */
const DEFAULT_TARGETS = {
	monthly_cases: 10,
	conversion_rate: 40, // percent
	avg_processing_days: 21, // days (lower is better)
	sanctioned_amount: 5000000, // Rs 50 lakh
	document_completion: 90, // percent
	query_response_time: 2, // days (lower is better)
	lender_diversity: 3, // count
	rejection_rate: 20 // percent (lower is better)
};

/** Weights for overall score — conversion_rate and sanctioned_amount are 2x */
const METRIC_WEIGHTS: Record<string, number> = {
	monthly_cases: 1,
	conversion_rate: 2,
	avg_processing_days: 1,
	sanctioned_amount: 2,
	document_completion: 1,
	query_response_time: 1,
	lender_diversity: 1,
	rejection_rate: 1
};

// Note: 'avg_processing_days', 'query_response_time', 'rejection_rate' are lower-is-better metrics (reserved for future directional scoring)

// ============================================================================
// HELPERS
// ============================================================================

function getMonthRange(now: Date, monthsBack: number): { start: Date; end: Date } {
	const end = new Date(now);
	const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
	return { start, end };
}

function daysBetween(from: Date, to: Date): number {
	return Math.max(0, (to.getTime() - from.getTime()) / MS_PER_DAY);
}

function rateHigherIsBetter(progressPercent: number): MetricRating {
	if (progressPercent >= 90) return 'excellent';
	if (progressPercent >= 70) return 'good';
	if (progressPercent >= 40) return 'needs_improvement';
	return 'critical';
}

function rateLowerIsBetter(currentValue: number, targetValue: number): MetricRating {
	// For lower-is-better: if current <= target → excellent (100%+)
	// We compute an inverse progress: the less the current, the better.
	if (targetValue <= 0) return 'excellent';
	const ratio = currentValue / targetValue;
	if (ratio <= 1.0) return 'excellent'; // at or below target
	if (ratio <= 1.3) return 'good'; // up to 30% over target
	if (ratio <= 2.0) return 'needs_improvement'; // up to 2x target
	return 'critical'; // more than 2x target
}

/**
 * B.6 empty-state neutrality: when a metric had no sample to measure this period,
 * render it as a benign 'good' (owner decision 2026-05-22 — preferred over adding a
 * new "neutral" rating). Neither alarms (critical) nor falsely praises (excellent).
 */
function ratingForSample(insufficient: boolean, computed: MetricRating): MetricRating {
	return insufficient ? 'good' : computed;
}

function computeTrend(
	currentValue: number,
	previousValue: number
): { trend: MetricTrend; trend_value: number } {
	if (previousValue === 0 && currentValue === 0) {
		return { trend: 'stable', trend_value: 0 };
	}
	if (previousValue === 0) {
		return { trend: 'up', trend_value: 100 };
	}
	const changePercent = ((currentValue - previousValue) / previousValue) * 100;
	const rounded = Math.round(changePercent);
	if (changePercent > 5) return { trend: 'up', trend_value: rounded };
	if (changePercent < -5) return { trend: 'down', trend_value: rounded };
	return { trend: 'stable', trend_value: rounded };
}

function progressPercentHigherIsBetter(current: number, target: number): number {
	if (target <= 0) return current > 0 ? 100 : 0;
	return Math.round((current / target) * 100);
}

function progressPercentLowerIsBetter(current: number, target: number): number {
	// Lower is better: if current = 0, progress = 100%. If current = target, progress = 100%.
	// If current > target, progress < 100%. If current < target, progress > 100%.
	if (target <= 0) return 100;
	if (current <= 0) return 100;
	// Invert: progress = (target / current) * 100
	return Math.round(Math.min((target / current) * 100, 200));
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

// ============================================================================
// METRIC COMPUTATION FUNCTIONS
// ============================================================================

function filterCasesByPeriod(cases: Case[], start: Date, end: Date): Case[] {
	return cases.filter((c) => {
		const created = new Date(c.created_at);
		return created >= start && created <= end;
	});
}

function computeMonthlyCases(
	cases: Case[],
	currentPeriod: { start: Date; end: Date },
	previousPeriod: { start: Date; end: Date },
	target: number
): ScorecardMetric {
	const currentCases = filterCasesByPeriod(cases, currentPeriod.start, currentPeriod.end);
	const previousCases = filterCasesByPeriod(cases, previousPeriod.start, previousPeriod.end);

	const currentCount = currentCases.length;
	const previousCount = previousCases.length;

	const progress = progressPercentHigherIsBetter(currentCount, target);
	const { trend, trend_value } = computeTrend(currentCount, previousCount);
	// No cases filed this period → nothing to judge (B.6).
	const insufficient = currentCount === 0;

	return {
		metric_id: 'monthly_cases',
		label: 'Monthly Cases Filed',
		current_value: currentCount,
		target_value: target,
		unit: 'cases',
		progress_percent: progress,
		trend,
		trend_value,
		rating: ratingForSample(insufficient, rateHigherIsBetter(progress)),
		insufficient_data: insufficient
	};
}

function computeConversionRate(
	cases: Case[],
	currentPeriod: { start: Date; end: Date },
	previousPeriod: { start: Date; end: Date },
	target: number
): ScorecardMetric {
	const currentCases = filterCasesByPeriod(cases, currentPeriod.start, currentPeriod.end);
	const previousCases = filterCasesByPeriod(cases, previousPeriod.start, previousPeriod.end);

	function calcRate(caseList: Case[]): number {
		const nonDropped = caseList.filter((c) => c.stage !== 'dropped');
		if (nonDropped.length === 0) return 0;
		const sanctioned = nonDropped.filter(
			(c) => c.stage === 'sanctioned' || c.stage === 'disbursed' || c.stage === 'closed'
		);
		return Math.round((sanctioned.length / nonDropped.length) * 100);
	}

	const currentRate = calcRate(currentCases);
	const previousRate = calcRate(previousCases);

	const progress = progressPercentHigherIsBetter(currentRate, target);
	const { trend, trend_value } = computeTrend(currentRate, previousRate);
	// No DECIDED cases this period → conversion is premature, not a real 0% (B.6).
	// In-flight cases (intake/submitted/processing/query) haven't converted yet, so a
	// DSA whose cases are all still in progress must not be shown a 0% "critical".
	const insufficient =
		currentCases.filter((c) =>
			['sanctioned', 'disbursed', 'closed', 'rejected'].includes(c.stage)
		).length === 0;

	return {
		metric_id: 'conversion_rate',
		label: 'Conversion Rate',
		current_value: currentRate,
		target_value: target,
		unit: 'percent',
		progress_percent: progress,
		trend,
		trend_value,
		rating: ratingForSample(insufficient, rateHigherIsBetter(progress)),
		insufficient_data: insufficient
	};
}

function computeAvgProcessingDays(
	cases: Case[],
	currentPeriod: { start: Date; end: Date },
	previousPeriod: { start: Date; end: Date },
	target: number,
	_now: Date
): ScorecardMetric {
	function calcAvg(caseList: Case[]): number {
		const sanctionedCases = caseList.filter(
			(c) => c.stage === 'sanctioned' || c.stage === 'disbursed'
		);
		if (sanctionedCases.length === 0) return 0;

		let totalDays = 0;
		let count = 0;

		for (const c of sanctionedCases) {
			// Find when case was submitted
			const submittedTs = c.stage_history.find((h) => h.to === 'submitted');
			const sanctionedTs = c.stage_history.find((h) => h.to === 'sanctioned');
			if (submittedTs && sanctionedTs) {
				const days = daysBetween(new Date(submittedTs.timestamp), new Date(sanctionedTs.timestamp));
				totalDays += days;
				count++;
			}
		}

		return count > 0 ? Math.round(totalDays / count) : 0;
	}

	const currentCases = filterCasesByPeriod(cases, currentPeriod.start, currentPeriod.end);
	const previousCases = filterCasesByPeriod(cases, previousPeriod.start, previousPeriod.end);

	const currentAvg = calcAvg(currentCases);
	const previousAvg = calcAvg(previousCases);

	const progress = progressPercentLowerIsBetter(currentAvg, target);
	// For "lower is better" trend: going down is good (trend = 'up' in terms of performance)
	const rawTrend = computeTrend(currentAvg, previousAvg);
	// Invert trend direction: if value went down, that's 'up' performance
	let trend: MetricTrend = rawTrend.trend;
	if (rawTrend.trend === 'up') trend = 'down';
	else if (rawTrend.trend === 'down') trend = 'up';
	// No sanctioned/disbursed cases this period → processing time is unmeasurable,
	// so a 0-day "excellent" would be false praise (B.6).
	const insufficient =
		currentCases.filter((c) => c.stage === 'sanctioned' || c.stage === 'disbursed').length === 0;

	return {
		metric_id: 'avg_processing_days',
		label: 'Avg Processing Time',
		current_value: currentAvg,
		target_value: target,
		unit: 'days',
		progress_percent: progress,
		trend,
		trend_value: rawTrend.trend_value ? -rawTrend.trend_value : 0,
		rating: ratingForSample(insufficient, rateLowerIsBetter(currentAvg, target)),
		insufficient_data: insufficient
	};
}

function computeSanctionedAmount(
	cases: Case[],
	currentPeriod: { start: Date; end: Date },
	previousPeriod: { start: Date; end: Date },
	target: number
): ScorecardMetric {
	function calcAmount(caseList: Case[]): number {
		let total = 0;
		for (const c of caseList) {
			for (const la of c.lender_applications || []) {
				if ((la.status === 'sanctioned' || la.status === 'disbursed') && la.sanction?.amount) {
					total += la.sanction.amount;
				}
			}
		}
		return total;
	}

	const currentCases = filterCasesByPeriod(cases, currentPeriod.start, currentPeriod.end);
	const previousCases = filterCasesByPeriod(cases, previousPeriod.start, previousPeriod.end);

	const currentAmount = calcAmount(currentCases);
	const previousAmount = calcAmount(previousCases);

	const progress = progressPercentHigherIsBetter(currentAmount, target);
	const { trend, trend_value } = computeTrend(currentAmount, previousAmount);
	// Nothing sanctioned this period → no amount to judge (B.6).
	const insufficient = currentAmount === 0;

	return {
		metric_id: 'sanctioned_amount',
		label: 'Total Sanctioned Amount',
		current_value: currentAmount,
		target_value: target,
		unit: 'amount',
		progress_percent: progress,
		trend,
		trend_value,
		rating: ratingForSample(insufficient, rateHigherIsBetter(progress)),
		insufficient_data: insufficient
	};
}

function computeDocumentCompletion(
	cases: Case[],
	currentPeriod: { start: Date; end: Date },
	previousPeriod: { start: Date; end: Date },
	target: number
): ScorecardMetric {
	function calcCompletion(caseList: Case[]): number {
		const activeCases = caseList.filter(
			(c) => !['closed', 'dropped', 'rejected'].includes(c.stage)
		);
		if (activeCases.length === 0) return 0;

		let totalPercent = 0;
		let caseCount = 0;

		for (const c of activeCases) {
			for (const la of c.lender_applications || []) {
				const mandatoryDocs = (la.document_checklist || []).filter(
					(d: DocumentChecklistItem) => d.is_mandatory
				);
				if (mandatoryDocs.length === 0) continue;
				const uploaded = mandatoryDocs.filter(
					(d: DocumentChecklistItem) => d.status === 'uploaded' || d.status === 'received'
				);
				totalPercent += (uploaded.length / mandatoryDocs.length) * 100;
				caseCount++;
			}
		}

		return caseCount > 0 ? Math.round(totalPercent / caseCount) : 0;
	}

	const currentCases = filterCasesByPeriod(cases, currentPeriod.start, currentPeriod.end);
	const previousCases = filterCasesByPeriod(cases, previousPeriod.start, previousPeriod.end);

	const currentCompletion = calcCompletion(currentCases);
	const previousCompletion = calcCompletion(previousCases);

	const progress = progressPercentHigherIsBetter(currentCompletion, target);
	const { trend, trend_value } = computeTrend(currentCompletion, previousCompletion);
	// No active case has a mandatory-doc checklist this period → nothing to measure
	// (B.6). Matches calcCompletion's denominator (it only counts active cases whose
	// lender applications carry mandatory docs).
	const insufficient = !currentCases.some(
		(c) =>
			!['closed', 'dropped', 'rejected'].includes(c.stage) &&
			(c.lender_applications || []).some((la) =>
				(la.document_checklist || []).some((d: DocumentChecklistItem) => d.is_mandatory)
			)
	);

	return {
		metric_id: 'document_completion',
		label: 'Document Completion Rate',
		current_value: currentCompletion,
		target_value: target,
		unit: 'percent',
		progress_percent: progress,
		trend,
		trend_value,
		rating: ratingForSample(insufficient, rateHigherIsBetter(progress)),
		insufficient_data: insufficient
	};
}

function computeQueryResponseTime(
	cases: Case[],
	currentPeriod: { start: Date; end: Date },
	previousPeriod: { start: Date; end: Date },
	target: number
): ScorecardMetric {
	function calcAvgResponseDays(caseList: Case[]): number {
		let totalDays = 0;
		let count = 0;

		for (const c of caseList) {
			for (const la of c.lender_applications || []) {
				for (const q of la.queries || []) {
					if (q.response?.responded_at && q.raised_at) {
						const days = daysBetween(new Date(q.raised_at), new Date(q.response.responded_at));
						totalDays += days;
						count++;
					}
				}
			}
		}

		return count > 0 ? Math.round((totalDays / count) * 10) / 10 : 0;
	}

	const currentCases = filterCasesByPeriod(cases, currentPeriod.start, currentPeriod.end);
	const previousCases = filterCasesByPeriod(cases, previousPeriod.start, previousPeriod.end);

	const currentAvg = calcAvgResponseDays(currentCases);
	const previousAvg = calcAvgResponseDays(previousCases);

	const progress = progressPercentLowerIsBetter(currentAvg, target);
	const rawTrend = computeTrend(currentAvg, previousAvg);
	let trend: MetricTrend = rawTrend.trend;
	if (rawTrend.trend === 'up') trend = 'down';
	else if (rawTrend.trend === 'down') trend = 'up';
	// No answered queries this period → response time is unmeasurable (B.6).
	const insufficient = !currentCases.some((c) =>
		(c.lender_applications || []).some((la) =>
			(la.queries || []).some((q) => q.response?.responded_at && q.raised_at)
		)
	);

	return {
		metric_id: 'query_response_time',
		label: 'Avg Query Response Time',
		current_value: currentAvg,
		target_value: target,
		unit: 'days',
		progress_percent: progress,
		trend,
		trend_value: rawTrend.trend_value ? -rawTrend.trend_value : 0,
		rating: ratingForSample(insufficient, rateLowerIsBetter(currentAvg, target)),
		insufficient_data: insufficient
	};
}

function computeLenderDiversity(
	cases: Case[],
	currentPeriod: { start: Date; end: Date },
	previousPeriod: { start: Date; end: Date },
	target: number
): ScorecardMetric {
	function calcUniqueLenders(caseList: Case[]): number {
		const lenderSet = new Set<string>();
		for (const c of caseList) {
			for (const la of c.lender_applications || []) {
				lenderSet.add(la.lender_name);
			}
		}
		return lenderSet.size;
	}

	const currentCases = filterCasesByPeriod(cases, currentPeriod.start, currentPeriod.end);
	const previousCases = filterCasesByPeriod(cases, previousPeriod.start, previousPeriod.end);

	const currentCount = calcUniqueLenders(currentCases);
	const previousCount = calcUniqueLenders(previousCases);

	const progress = progressPercentHigherIsBetter(currentCount, target);
	const { trend, trend_value } = computeTrend(currentCount, previousCount);
	// No lender applications this period → diversity is unmeasurable (B.6).
	const insufficient = currentCount === 0;

	return {
		metric_id: 'lender_diversity',
		label: 'Lender Diversity',
		current_value: currentCount,
		target_value: target,
		unit: 'count',
		progress_percent: progress,
		trend,
		trend_value,
		rating: ratingForSample(insufficient, rateHigherIsBetter(progress)),
		insufficient_data: insufficient
	};
}

function computeRejectionRate(
	cases: Case[],
	currentPeriod: { start: Date; end: Date },
	previousPeriod: { start: Date; end: Date },
	target: number
): ScorecardMetric {
	function calcRate(caseList: Case[]): number {
		// Only count cases that were at least submitted
		const submittedOrBeyond = caseList.filter((c) =>
			[
				'submitted',
				'processing',
				'query',
				'sanctioned',
				'disbursed',
				'rejected',
				'closed'
			].includes(c.stage)
		);
		if (submittedOrBeyond.length === 0) return 0;
		const rejected = submittedOrBeyond.filter((c) => c.stage === 'rejected');
		return Math.round((rejected.length / submittedOrBeyond.length) * 100);
	}

	const currentCases = filterCasesByPeriod(cases, currentPeriod.start, currentPeriod.end);
	const previousCases = filterCasesByPeriod(cases, previousPeriod.start, previousPeriod.end);

	const currentRate = calcRate(currentCases);
	const previousRate = calcRate(previousCases);

	const progress = progressPercentLowerIsBetter(currentRate, target);
	const rawTrend = computeTrend(currentRate, previousRate);
	// Invert: lower rejection is better
	let trend: MetricTrend = rawTrend.trend;
	if (rawTrend.trend === 'up') trend = 'down';
	else if (rawTrend.trend === 'down') trend = 'up';
	// No submitted-or-beyond cases this period → rejection rate is unmeasurable, so a
	// 0% "excellent" would be false praise (B.6).
	const insufficient =
		currentCases.filter((c) =>
			['submitted', 'processing', 'query', 'sanctioned', 'disbursed', 'rejected', 'closed'].includes(
				c.stage
			)
		).length === 0;

	return {
		metric_id: 'rejection_rate',
		label: 'Rejection Rate',
		current_value: currentRate,
		target_value: target,
		unit: 'percent',
		progress_percent: progress,
		trend,
		trend_value: rawTrend.trend_value ? -rawTrend.trend_value : 0,
		rating: ratingForSample(insufficient, rateLowerIsBetter(currentRate, target)),
		insufficient_data: insufficient
	};
}

// ============================================================================
// INSIGHTS GENERATION
// ============================================================================

function generateInsights(metrics: ScorecardMetric[], cases: Case[], now: Date): string[] {
	const insights: string[] = [];

	const metricsMap = new Map(metrics.map((m) => [m.metric_id, m]));

	// 1. Conversion rate trends
	const conversion = metricsMap.get('conversion_rate');
	if (conversion) {
		if (conversion.trend === 'up' && conversion.trend_value && conversion.trend_value > 0) {
			insights.push(
				`Your conversion rate improved ${Math.abs(conversion.trend_value)}% this month — keep it up!`
			);
		} else if (conversion.rating === 'critical') {
			insights.push(
				`Conversion rate is at ${conversion.current_value}% — review lender selection and case profiling to improve approvals.`
			);
		}
	}

	// 2. Processing time insights
	const processing = metricsMap.get('avg_processing_days');
	if (processing) {
		// Cases stuck in processing > 21 days
		const stuckCases = cases.filter((c) => {
			if (c.stage !== 'processing') return false;
			const submittedTs = c.stage_history.find((h) => h.to === 'processing');
			if (!submittedTs) return false;
			return daysBetween(new Date(submittedTs.timestamp), now) > 21;
		});
		if (stuckCases.length > 0) {
			insights.push(
				`${stuckCases.length} case${stuckCases.length > 1 ? 's have' : ' has'} been in processing for over 21 days — consider following up with lenders.`
			);
		} else if (processing.rating === 'excellent') {
			insights.push(
				`Average processing time of ${processing.current_value} days is well within target — great follow-up discipline!`
			);
		}
	}

	// 3. Document completion
	const docCompletion = metricsMap.get('document_completion');
	if (docCompletion && docCompletion.current_value > 0 && docCompletion.current_value < 60) {
		insights.push(
			`Document completion rate is low (${docCompletion.current_value}%) — upload pending documents to speed up processing.`
		);
	} else if (docCompletion && docCompletion.rating === 'excellent') {
		insights.push(
			`Excellent document completion at ${docCompletion.current_value}% — this helps speed up lender processing.`
		);
	}

	// 4. Lender diversity
	const diversity = metricsMap.get('lender_diversity');
	if (diversity && diversity.current_value <= 1 && diversity.current_value > 0) {
		insights.push(
			`You've been using only ${diversity.current_value} lender — diversifying could improve approval chances and get better rates.`
		);
	} else if (diversity && diversity.rating === 'excellent') {
		insights.push(
			`Working with ${diversity.current_value} lenders gives your clients more options — well diversified!`
		);
	}

	// 5. Rejection rate
	const rejection = metricsMap.get('rejection_rate');
	if (rejection && rejection.current_value > 30) {
		insights.push(
			`Rejection rate is ${rejection.current_value}% — review rejection patterns and consider pre-screening cases before submission.`
		);
	} else if (rejection && rejection.trend === 'up' && rejection.current_value < 15) {
		insights.push(
			`Rejection rate improved to ${rejection.current_value}% — your case selection is paying off.`
		);
	}

	// 6. Monthly cases target
	const monthlyCases = metricsMap.get('monthly_cases');
	if (monthlyCases) {
		if (monthlyCases.progress_percent >= 100) {
			insights.push(
				`You've hit your monthly case target of ${monthlyCases.target_value} — outstanding performance!`
			);
		} else if (monthlyCases.progress_percent >= 70) {
			insights.push(
				`${monthlyCases.current_value} of ${monthlyCases.target_value} monthly case target reached — you're on track!`
			);
		}
	}

	// 7. Query response time
	const queryTime = metricsMap.get('query_response_time');
	if (queryTime && queryTime.current_value > 3) {
		insights.push(
			`Average query response time is ${queryTime.current_value} days — faster responses lead to quicker sanctions.`
		);
	}

	// Return top 5 insights
	return insights.slice(0, 5);
}

// ============================================================================
// EXTRACT TARGETS FROM DSA PROFILE
// ============================================================================

function extractTargets(dsaProfile: any): typeof DEFAULT_TARGETS {
	const targets = { ...DEFAULT_TARGETS };

	if (!dsaProfile) return targets;

	// Look for goals from onboarding V2 structure
	const goals = dsaProfile.goals || dsaProfile.section_b || dsaProfile;

	if (goals.files_per_month?.target) {
		targets.monthly_cases = goals.files_per_month.target;
	}
	if (goals.target_monthly_cases) {
		targets.monthly_cases = goals.target_monthly_cases;
	}

	if (goals.disbursement_volume?.target) {
		targets.sanctioned_amount = goals.disbursement_volume.target;
	}

	if (goals.active_lender_count?.target) {
		targets.lender_diversity = goals.active_lender_count.target;
	}

	if (goals.avg_processing_days?.target) {
		targets.avg_processing_days = goals.avg_processing_days.target;
	}

	return targets;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Compute a full performance scorecard for a DSA based on their cases and profile.
 *
 * @param cases - Array of case documents
 * @param dsaProfile - DSA profile (from DsaApplications), used for targets
 * @param options - Optional: period_months (default 1), now (override current time)
 */
export function computeScorecard(
	cases: any[],
	dsaProfile: any,
	options?: ScorecardOptions
): Scorecard {
	const now = options?.now ?? new Date();
	const periodMonths = options?.period_months ?? 1;

	// Safely cast
	const typedCases = (cases || []) as Case[];

	// Compute period ranges
	const currentPeriod = getMonthRange(now, 0);
	// Adjust current period start to N months back
	currentPeriod.start = new Date(now.getFullYear(), now.getMonth() - (periodMonths - 1), 1);

	const previousPeriod = {
		start: new Date(
			currentPeriod.start.getFullYear(),
			currentPeriod.start.getMonth() - periodMonths,
			1
		),
		end: new Date(currentPeriod.start.getTime() - 1) // 1ms before current period
	};

	// Extract targets from DSA profile
	const targets = extractTargets(dsaProfile);

	// Compute all 8 metrics
	const metrics: ScorecardMetric[] = [
		computeMonthlyCases(typedCases, currentPeriod, previousPeriod, targets.monthly_cases),
		computeConversionRate(typedCases, currentPeriod, previousPeriod, targets.conversion_rate),
		computeAvgProcessingDays(
			typedCases,
			currentPeriod,
			previousPeriod,
			targets.avg_processing_days,
			now
		),
		computeSanctionedAmount(typedCases, currentPeriod, previousPeriod, targets.sanctioned_amount),
		computeDocumentCompletion(
			typedCases,
			currentPeriod,
			previousPeriod,
			targets.document_completion
		),
		computeQueryResponseTime(
			typedCases,
			currentPeriod,
			previousPeriod,
			targets.query_response_time
		),
		computeLenderDiversity(typedCases, currentPeriod, previousPeriod, targets.lender_diversity),
		computeRejectionRate(typedCases, currentPeriod, previousPeriod, targets.rejection_rate)
	];

	// Compute weighted overall score.
	// B.6: EXCLUDE insufficient-data metrics — scoring an empty track record (e.g. a
	// new DSA with no decided cases) as 0% would paint the overall red unfairly. Only
	// metrics with an actual sample contribute.
	let totalWeight = 0;
	let weightedSum = 0;

	for (const metric of metrics) {
		if (metric.insufficient_data) continue;
		const weight = METRIC_WEIGHTS[metric.metric_id] || 1;
		// Cap individual metric progress at 100 for overall calculation
		const cappedProgress = clamp(metric.progress_percent, 0, 100);
		weightedSum += cappedProgress * weight;
		totalWeight += weight;
	}

	// No metric had data → nothing to score yet. Stay neutral ('good') rather than
	// defaulting to 0/'critical'.
	const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

	// Overall rating
	let overallRating: MetricRating;
	if (totalWeight === 0) overallRating = 'good';
	else if (overallScore >= 80) overallRating = 'excellent';
	else if (overallScore >= 60) overallRating = 'good';
	else if (overallScore >= 35) overallRating = 'needs_improvement';
	else overallRating = 'critical';

	// Generate insights
	const insights = generateInsights(metrics, typedCases, now);

	return {
		overall_score: overallScore,
		overall_rating: overallRating,
		metrics,
		insights,
		generated_at: now
	};
}
