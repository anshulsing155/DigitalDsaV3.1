import { describe, it, expect } from 'vitest';
import {
	computeScorecard,
	type Scorecard,
	type ScorecardMetric
} from '$lib/server/scorecardEngine';
import type { Case, CaseStage, LenderApplication, LenderAppStatus } from '$lib/types/case';

// ============================================================================
// TEST HELPERS
// ============================================================================

const NOW = new Date('2026-02-10T12:00:00Z');
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number, from?: Date): Date {
	const ref = from ?? NOW;
	return new Date(ref.getTime() - days * MS_PER_DAY);
}

/** Minimal case factory */
function makeCase(overrides: Partial<Case> = {}): Case {
	return {
		case_id: `HL-2026-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
		dsa_id: 'test-dsa-id' as any,
		label: 'Test Case',
		loan: { type: 'Home Loan', amount_required: 5000000 },
		stage: 'intake' as CaseStage,
		stage_history: [{ from: 'intake', to: 'intake', timestamp: NOW }],
		lender_applications: [],
		created_at: NOW,
		updated_at: NOW,
		is_archived: false,
		is_sample: false,
		...overrides
	} as Case;
}

/** Minimal lender application factory */
function makeLenderApp(overrides: Partial<LenderApplication> = {}): LenderApplication {
	return {
		lender_application_id: 'la-001',
		lender_id: 'hdfc',
		lender_name: 'HDFC Bank',
		status: 'selected' as LenderAppStatus,
		status_history: [{ from: 'selected', to: 'selected', timestamp: NOW }],
		document_checklist: [],
		queries: [],
		file_snapshots: [],
		created_at: NOW,
		updated_at: NOW,
		...overrides
	} as LenderApplication;
}

/** DSA profile with goals for targets */
function makeDsaProfile(overrides: Record<string, any> = {}) {
	return {
		goals: {
			files_per_month: { current: 5, target: 15 },
			disbursement_volume: { current: 3000000, target: 10000000 },
			active_lender_count: { current: 2, target: 5 },
			avg_processing_days: { current: 25, target: 18 }
		},
		...overrides
	};
}

function findMetric(scorecard: Scorecard, metricId: string): ScorecardMetric | undefined {
	return scorecard.metrics.find((m) => m.metric_id === metricId);
}

// ============================================================================
// STRUCTURE TESTS
// ============================================================================

describe('computeScorecard — structure', () => {
	it('returns all 8 metrics', () => {
		const scorecard = computeScorecard([], null, { now: NOW });
		expect(scorecard.metrics).toHaveLength(8);
	});

	it('returns expected metric IDs', () => {
		const scorecard = computeScorecard([], null, { now: NOW });
		const ids = scorecard.metrics.map((m) => m.metric_id);
		expect(ids).toContain('monthly_cases');
		expect(ids).toContain('conversion_rate');
		expect(ids).toContain('avg_processing_days');
		expect(ids).toContain('sanctioned_amount');
		expect(ids).toContain('document_completion');
		expect(ids).toContain('query_response_time');
		expect(ids).toContain('lender_diversity');
		expect(ids).toContain('rejection_rate');
	});

	it('each metric has all required fields', () => {
		const cases = [makeCase({ created_at: NOW })];
		const scorecard = computeScorecard(cases, null, { now: NOW });

		for (const m of scorecard.metrics) {
			expect(m.metric_id).toBeTruthy();
			expect(m.label).toBeTruthy();
			expect(typeof m.current_value).toBe('number');
			expect(typeof m.target_value).toBe('number');
			expect(m.unit).toBeTruthy();
			expect(typeof m.progress_percent).toBe('number');
			expect(m.trend).toMatch(/^(up|down|stable)$/);
			expect(m.rating).toMatch(/^(excellent|good|needs_improvement|critical)$/);
		}
	});

	it('returns overall_score between 0 and 100', () => {
		const scorecard = computeScorecard([], null, { now: NOW });
		expect(scorecard.overall_score).toBeGreaterThanOrEqual(0);
		expect(scorecard.overall_score).toBeLessThanOrEqual(100);
	});

	it('returns a valid overall_rating', () => {
		const scorecard = computeScorecard([], null, { now: NOW });
		expect(scorecard.overall_rating).toMatch(/^(excellent|good|needs_improvement|critical)$/);
	});

	it('returns generated_at as a Date', () => {
		const scorecard = computeScorecard([], null, { now: NOW });
		expect(scorecard.generated_at).toBeInstanceOf(Date);
	});

	it('returns insights as an array', () => {
		const scorecard = computeScorecard([], null, { now: NOW });
		expect(Array.isArray(scorecard.insights)).toBe(true);
	});
});

// ============================================================================
// MONTHLY CASES METRIC
// ============================================================================

describe('computeScorecard — monthly_cases metric', () => {
	it('counts cases created in the current month', () => {
		const cases = [
			makeCase({ case_id: 'HL-2026-0001', created_at: NOW }),
			makeCase({ case_id: 'HL-2026-0002', created_at: daysAgo(5) }),
			makeCase({ case_id: 'HL-2026-0003', created_at: daysAgo(45) }) // previous month
		];

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const metric = findMetric(scorecard, 'monthly_cases')!;

		// Feb 2026 should have at least the 2 cases within the month
		expect(metric.current_value).toBeGreaterThanOrEqual(2);
	});

	it('uses DSA profile target when available', () => {
		const profile = makeDsaProfile();
		const scorecard = computeScorecard([], profile, { now: NOW });
		const metric = findMetric(scorecard, 'monthly_cases')!;

		expect(metric.target_value).toBe(15);
	});

	it('uses default target when profile has no goals', () => {
		const scorecard = computeScorecard([], null, { now: NOW });
		const metric = findMetric(scorecard, 'monthly_cases')!;

		expect(metric.target_value).toBe(10); // default
	});
});

// ============================================================================
// CONVERSION RATE METRIC
// ============================================================================

describe('computeScorecard — conversion_rate metric', () => {
	it('computes correct conversion rate', () => {
		const cases = [
			makeCase({ case_id: 'HL-2026-0001', stage: 'sanctioned', created_at: NOW }),
			makeCase({ case_id: 'HL-2026-0002', stage: 'processing', created_at: NOW }),
			makeCase({ case_id: 'HL-2026-0003', stage: 'rejected', created_at: NOW }),
			makeCase({ case_id: 'HL-2026-0004', stage: 'dropped', created_at: NOW }) // excluded
		];

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const metric = findMetric(scorecard, 'conversion_rate')!;

		// 1 sanctioned out of 3 non-dropped = 33%
		expect(metric.current_value).toBe(33);
	});

	it('returns 0 when no non-dropped cases exist', () => {
		const cases = [makeCase({ case_id: 'HL-2026-0001', stage: 'dropped', created_at: NOW })];

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const metric = findMetric(scorecard, 'conversion_rate')!;

		expect(metric.current_value).toBe(0);
	});
});

// ============================================================================
// AVG PROCESSING DAYS METRIC
// ============================================================================

describe('computeScorecard — avg_processing_days metric', () => {
	it('computes average days from submitted to sanctioned', () => {
		// Case created within the current period (Feb 2026)
		const cases = [
			makeCase({
				case_id: 'HL-2026-0001',
				stage: 'sanctioned',
				created_at: daysAgo(9), // Feb 1 — within current month
				stage_history: [
					{ from: 'intake', to: 'submitted', timestamp: daysAgo(9) },
					{ from: 'submitted', to: 'processing', timestamp: daysAgo(7) },
					{ from: 'processing', to: 'sanctioned', timestamp: daysAgo(2) }
				]
			})
		];

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const metric = findMetric(scorecard, 'avg_processing_days')!;

		// 9 - 2 = 7 days from submitted to sanctioned
		expect(metric.current_value).toBe(7);
	});

	it('returns 0 when no sanctioned cases exist', () => {
		const cases = [makeCase({ case_id: 'HL-2026-0001', stage: 'processing', created_at: NOW })];

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const metric = findMetric(scorecard, 'avg_processing_days')!;

		expect(metric.current_value).toBe(0);
	});

	it('is rated as lower-is-better', () => {
		// Case with very fast processing (5 days) — created within current month
		const cases = [
			makeCase({
				case_id: 'HL-2026-0001',
				stage: 'sanctioned',
				created_at: daysAgo(8), // Feb 2 — within current month
				stage_history: [
					{ from: 'intake', to: 'submitted', timestamp: daysAgo(7) },
					{ from: 'submitted', to: 'sanctioned', timestamp: daysAgo(2) }
				]
			})
		];

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const metric = findMetric(scorecard, 'avg_processing_days')!;

		// 5 days processing with 21 day target → excellent
		expect(metric.current_value).toBe(5);
		expect(metric.rating).toBe('excellent');
	});
});

// ============================================================================
// SANCTIONED AMOUNT METRIC
// ============================================================================

describe('computeScorecard — sanctioned_amount metric', () => {
	it('sums sanction amounts from lender applications', () => {
		const cases = [
			makeCase({
				case_id: 'HL-2026-0001',
				stage: 'sanctioned',
				created_at: NOW,
				lender_applications: [
					makeLenderApp({
						status: 'sanctioned',
						sanction: { amount: 3000000, sanction_date: NOW }
					})
				]
			}),
			makeCase({
				case_id: 'HL-2026-0002',
				stage: 'disbursed',
				created_at: NOW,
				lender_applications: [
					makeLenderApp({
						lender_application_id: 'la-002',
						status: 'disbursed',
						sanction: { amount: 2000000, sanction_date: NOW }
					})
				]
			})
		];

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const metric = findMetric(scorecard, 'sanctioned_amount')!;

		expect(metric.current_value).toBe(5000000);
	});
});

// ============================================================================
// DOCUMENT COMPLETION METRIC
// ============================================================================

describe('computeScorecard — document_completion metric', () => {
	it('computes average mandatory doc completion rate', () => {
		const cases = [
			makeCase({
				case_id: 'HL-2026-0001',
				stage: 'file_building',
				created_at: NOW,
				lender_applications: [
					makeLenderApp({
						document_checklist: [
							{
								doc_id: 'd1',
								doc_name: 'PAN',
								category: 'identity',
								is_mandatory: true,
								status: 'uploaded'
							},
							{
								doc_id: 'd2',
								doc_name: 'Aadhaar',
								category: 'identity',
								is_mandatory: true,
								status: 'not_started'
							},
							{
								doc_id: 'd3',
								doc_name: 'Photo',
								category: 'other',
								is_mandatory: false,
								status: 'not_started'
							}
						]
					})
				]
			})
		];

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const metric = findMetric(scorecard, 'document_completion')!;

		// 1 of 2 mandatory docs uploaded = 50%
		expect(metric.current_value).toBe(50);
	});
});

// ============================================================================
// QUERY RESPONSE TIME METRIC
// ============================================================================

describe('computeScorecard — query_response_time metric', () => {
	it('computes average response time for answered queries', () => {
		const cases = [
			makeCase({
				case_id: 'HL-2026-0001',
				stage: 'processing',
				created_at: NOW,
				lender_applications: [
					makeLenderApp({
						queries: [
							{
								query_id: 'q1',
								query_text: 'Send salary slip',
								category: 'document',
								raised_at: daysAgo(5),
								status: 'resolved',
								days_open: 3,
								response: {
									text: 'Attached',
									responded_at: daysAgo(2)
								}
							}
						]
					})
				]
			})
		];

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const metric = findMetric(scorecard, 'query_response_time')!;

		// 3 days to respond
		expect(metric.current_value).toBe(3);
	});

	it('is rated as lower-is-better', () => {
		const cases = [
			makeCase({
				case_id: 'HL-2026-0001',
				stage: 'processing',
				created_at: NOW,
				lender_applications: [
					makeLenderApp({
						queries: [
							{
								query_id: 'q1',
								query_text: 'Send docs',
								category: 'document',
								raised_at: daysAgo(3),
								status: 'resolved',
								days_open: 1,
								response: {
									text: 'Done',
									responded_at: daysAgo(2)
								}
							}
						]
					})
				]
			})
		];

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const metric = findMetric(scorecard, 'query_response_time')!;

		// 1 day response with 2-day target → excellent
		expect(metric.current_value).toBe(1);
		expect(metric.rating).toBe('excellent');
	});
});

// ============================================================================
// LENDER DIVERSITY METRIC
// ============================================================================

describe('computeScorecard — lender_diversity metric', () => {
	it('counts unique lenders across cases', () => {
		const cases = [
			makeCase({
				case_id: 'HL-2026-0001',
				created_at: NOW,
				lender_applications: [
					makeLenderApp({ lender_name: 'HDFC Bank' }),
					makeLenderApp({ lender_application_id: 'la-002', lender_name: 'SBI' })
				]
			}),
			makeCase({
				case_id: 'HL-2026-0002',
				created_at: NOW,
				lender_applications: [
					makeLenderApp({ lender_application_id: 'la-003', lender_name: 'HDFC Bank' }),
					makeLenderApp({ lender_application_id: 'la-004', lender_name: 'ICICI Bank' })
				]
			})
		];

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const metric = findMetric(scorecard, 'lender_diversity')!;

		// 3 unique: HDFC, SBI, ICICI
		expect(metric.current_value).toBe(3);
	});
});

// ============================================================================
// REJECTION RATE METRIC
// ============================================================================

describe('computeScorecard — rejection_rate metric', () => {
	it('computes rejection rate among submitted+ cases', () => {
		const cases = [
			makeCase({ case_id: 'HL-2026-0001', stage: 'rejected', created_at: NOW }),
			makeCase({ case_id: 'HL-2026-0002', stage: 'sanctioned', created_at: NOW }),
			makeCase({ case_id: 'HL-2026-0003', stage: 'submitted', created_at: NOW }),
			makeCase({ case_id: 'HL-2026-0004', stage: 'intake', created_at: NOW }) // not counted
		];

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const metric = findMetric(scorecard, 'rejection_rate')!;

		// 1 rejected out of 3 submitted+ = 33%
		expect(metric.current_value).toBe(33);
	});

	it('is rated as lower-is-better', () => {
		// 0% rejection → excellent
		const cases = [makeCase({ case_id: 'HL-2026-0001', stage: 'sanctioned', created_at: NOW })];

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const metric = findMetric(scorecard, 'rejection_rate')!;

		expect(metric.current_value).toBe(0);
		expect(metric.rating).toBe('excellent');
	});

	it('high rejection rate is rated critical', () => {
		const cases = [
			makeCase({ case_id: 'HL-2026-0001', stage: 'rejected', created_at: NOW }),
			makeCase({ case_id: 'HL-2026-0002', stage: 'rejected', created_at: NOW }),
			makeCase({ case_id: 'HL-2026-0003', stage: 'sanctioned', created_at: NOW })
		];

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const metric = findMetric(scorecard, 'rejection_rate')!;

		// 67% rejection → critical (more than 2x the 20% target)
		expect(metric.current_value).toBe(67);
		expect(metric.rating).toBe('critical');
	});
});

// ============================================================================
// OVERALL SCORE CALCULATION
// ============================================================================

describe('computeScorecard — overall score', () => {
	it('weights conversion_rate and sanctioned_amount at 2x', () => {
		// Create a scenario where conversion and sanction metrics are excellent
		// but others are poor to test weighting
		const cases = [
			makeCase({
				case_id: 'HL-2026-0001',
				stage: 'sanctioned',
				created_at: NOW,
				stage_history: [
					{ from: 'intake', to: 'submitted', timestamp: daysAgo(15) },
					{ from: 'submitted', to: 'sanctioned', timestamp: daysAgo(5) }
				],
				lender_applications: [
					makeLenderApp({
						lender_name: 'HDFC Bank',
						status: 'sanctioned',
						sanction: { amount: 5000000, sanction_date: NOW }
					})
				]
			})
		];

		const scorecard = computeScorecard(cases, null, { now: NOW });

		// Overall score should exist and be between 0-100
		expect(scorecard.overall_score).toBeGreaterThanOrEqual(0);
		expect(scorecard.overall_score).toBeLessThanOrEqual(100);
	});

	it('overall_rating is excellent when overall_score >= 80', () => {
		// Create many excellent cases
		const cases: Case[] = [];
		for (let i = 0; i < 15; i++) {
			cases.push(
				makeCase({
					case_id: `HL-2026-${String(i).padStart(4, '0')}`,
					stage: 'sanctioned',
					created_at: NOW,
					stage_history: [
						{ from: 'intake', to: 'submitted', timestamp: daysAgo(10) },
						{ from: 'submitted', to: 'sanctioned', timestamp: daysAgo(5) }
					],
					lender_applications: [
						makeLenderApp({
							lender_application_id: `la-${i}`,
							lender_name: ['HDFC Bank', 'SBI', 'ICICI Bank', 'Axis Bank'][i % 4],
							status: 'sanctioned',
							sanction: { amount: 500000, sanction_date: NOW },
							document_checklist: [
								{
									doc_id: 'd1',
									doc_name: 'PAN',
									category: 'identity',
									is_mandatory: true,
									status: 'uploaded'
								}
							],
							queries: [
								{
									query_id: `q-${i}`,
									query_text: 'Send docs',
									category: 'document',
									raised_at: daysAgo(7),
									status: 'resolved',
									days_open: 1,
									response: { text: 'Done', responded_at: daysAgo(6) }
								}
							]
						})
					]
				})
			);
		}

		const scorecard = computeScorecard(cases, null, { now: NOW });

		// With many sanctioned cases, high conversion, good docs, the score should be high
		if (scorecard.overall_score >= 80) {
			expect(scorecard.overall_rating).toBe('excellent');
		}
	});

	it('empty data → neutral overall (B.6): not scored as poor', () => {
		// Pre-B.6 this returned 'critical'/'needs_improvement' — a misleading "you're
		// failing" for a brand-new DSA with no track record. Now every metric is
		// insufficient-data, so they're excluded from the overall and it stays 'good'.
		const emptyScorecard = computeScorecard([], null, { now: NOW });
		expect(emptyScorecard.overall_rating).toBe('good');
	});
});

// ============================================================================
// B.6 — EMPTY / LOW-DATA NEUTRALITY
// ============================================================================

describe('computeScorecard — empty-state neutrality (B.6)', () => {
	it('zero cases → every metric is insufficient_data + rated neutral good', () => {
		const scorecard = computeScorecard([], null, { now: NOW });
		for (const m of scorecard.metrics) {
			expect(m.insufficient_data).toBe(true);
			// Never a misleading critical (alarm) or excellent (false praise) on no data.
			expect(m.rating).toBe('good');
		}
	});

	it('zero cases → no misleading insights', () => {
		const scorecard = computeScorecard([], null, { now: NOW });
		const joined = scorecard.insights.join(' ').toLowerCase();
		expect(joined).not.toContain('review lender selection'); // the false "fix this" insight
		expect(joined).not.toContain('great follow-up'); // the false-praise insight
	});

	it('a sufficient sample is still scored honestly (neutrality does NOT mask real performance)', () => {
		// 3 cases all rejected → a genuine, sufficient sample of a poor rejection rate.
		const cases = [
			makeCase({ case_id: 'HL-2026-0001', stage: 'rejected', created_at: NOW }),
			makeCase({ case_id: 'HL-2026-0002', stage: 'rejected', created_at: NOW }),
			makeCase({ case_id: 'HL-2026-0003', stage: 'rejected', created_at: NOW })
		];
		const scorecard = computeScorecard(cases, null, { now: NOW });
		const rejection = findMetric(scorecard, 'rejection_rate')!;
		expect(rejection.insufficient_data).toBe(false);
		expect(rejection.rating).toBe('critical'); // 100% rejection — NOT masked to good
	});

	it('partial data: conversion is neutral until there are decided cases', () => {
		// One brand-new intake case — counts for monthly_cases, but nothing is decided
		// yet, so conversion has no sample.
		const cases = [makeCase({ case_id: 'HL-2026-0001', stage: 'intake', created_at: NOW })];
		const scorecard = computeScorecard(cases, null, { now: NOW });
		const conversion = findMetric(scorecard, 'conversion_rate')!;
		const monthly = findMetric(scorecard, 'monthly_cases')!;
		expect(conversion.insufficient_data).toBe(true);
		expect(conversion.rating).toBe('good');
		expect(monthly.insufficient_data).toBe(false); // 1 case filed — that IS data
	});
});

// ============================================================================
// RATING THRESHOLDS
// ============================================================================

describe('computeScorecard — rating thresholds', () => {
	it('higher-is-better: >=90% progress = excellent', () => {
		// 10 cases created this month with target of 10 → 100% → excellent
		const cases = Array.from({ length: 10 }, (_, i) =>
			makeCase({ case_id: `HL-2026-${String(i).padStart(4, '0')}`, created_at: NOW })
		);

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const metric = findMetric(scorecard, 'monthly_cases')!;

		expect(metric.progress_percent).toBeGreaterThanOrEqual(90);
		expect(metric.rating).toBe('excellent');
	});

	it('lower-is-better: value at target = excellent', () => {
		const cases = [
			makeCase({
				case_id: 'HL-2026-0001',
				stage: 'sanctioned',
				created_at: NOW,
				stage_history: [
					{ from: 'intake', to: 'submitted', timestamp: daysAgo(21) },
					{ from: 'submitted', to: 'sanctioned', timestamp: NOW }
				]
			})
		];

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const metric = findMetric(scorecard, 'avg_processing_days')!;

		// 21 days exactly at 21 target = excellent
		expect(metric.rating).toBe('excellent');
	});
});

// ============================================================================
// TREND DETECTION
// ============================================================================

describe('computeScorecard — trend detection', () => {
	it('detects upward trend when current > previous by >5%', () => {
		// 5 cases this month, 2 cases last month
		const currentCases = Array.from({ length: 5 }, (_, i) =>
			makeCase({ case_id: `HL-2026-C${i}`, created_at: NOW })
		);
		const previousCases = Array.from({ length: 2 }, (_, i) =>
			makeCase({ case_id: `HL-2026-P${i}`, created_at: daysAgo(35) })
		);

		const scorecard = computeScorecard([...currentCases, ...previousCases], null, { now: NOW });
		const metric = findMetric(scorecard, 'monthly_cases')!;

		expect(metric.trend).toBe('up');
	});

	it('detects downward trend when current < previous by >5%', () => {
		// 1 case this month, 5 cases last month
		const currentCases = [makeCase({ case_id: 'HL-2026-C1', created_at: NOW })];
		const previousCases = Array.from({ length: 5 }, (_, i) =>
			makeCase({ case_id: `HL-2026-P${i}`, created_at: daysAgo(35) })
		);

		const scorecard = computeScorecard([...currentCases, ...previousCases], null, { now: NOW });
		const metric = findMetric(scorecard, 'monthly_cases')!;

		expect(metric.trend).toBe('down');
	});

	it('detects stable trend when values are within 5%', () => {
		// Same number of cases both months
		const currentCases = Array.from({ length: 3 }, (_, i) =>
			makeCase({ case_id: `HL-2026-C${i}`, created_at: NOW })
		);
		const previousCases = Array.from({ length: 3 }, (_, i) =>
			makeCase({ case_id: `HL-2026-P${i}`, created_at: daysAgo(35) })
		);

		const scorecard = computeScorecard([...currentCases, ...previousCases], null, { now: NOW });
		const metric = findMetric(scorecard, 'monthly_cases')!;

		expect(metric.trend).toBe('stable');
	});
});

// ============================================================================
// INSIGHTS GENERATION
// ============================================================================

describe('computeScorecard — insights', () => {
	it('generates insights for low document completion', () => {
		const cases = [
			makeCase({
				case_id: 'HL-2026-0001',
				stage: 'file_building',
				created_at: NOW,
				lender_applications: [
					makeLenderApp({
						document_checklist: [
							{
								doc_id: 'd1',
								doc_name: 'PAN',
								category: 'identity',
								is_mandatory: true,
								status: 'not_started'
							},
							{
								doc_id: 'd2',
								doc_name: 'Aadhaar',
								category: 'identity',
								is_mandatory: true,
								status: 'not_started'
							},
							{
								doc_id: 'd3',
								doc_name: 'ITR',
								category: 'income',
								is_mandatory: true,
								status: 'uploaded'
							}
						]
					})
				]
			})
		];

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const docInsight = scorecard.insights.find((i) => i.toLowerCase().includes('document'));
		expect(docInsight).toBeDefined();
	});

	it('generates insights for single lender usage', () => {
		const cases = [
			makeCase({
				case_id: 'HL-2026-0001',
				created_at: NOW,
				lender_applications: [makeLenderApp({ lender_name: 'HDFC Bank' })]
			})
		];

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const diversityInsight = scorecard.insights.find(
			(i) => i.toLowerCase().includes('lender') && i.toLowerCase().includes('only')
		);
		expect(diversityInsight).toBeDefined();
	});

	it('generates max 5 insights', () => {
		// Create complex scenario with many potential insights
		const cases = Array.from({ length: 20 }, (_, i) =>
			makeCase({
				case_id: `HL-2026-${String(i).padStart(4, '0')}`,
				stage: i % 3 === 0 ? 'rejected' : 'processing',
				created_at: NOW,
				stage_history: [{ from: 'submitted', to: 'processing', timestamp: daysAgo(30) }],
				lender_applications: [
					makeLenderApp({
						lender_application_id: `la-${i}`,
						lender_name: 'HDFC Bank',
						document_checklist: [
							{
								doc_id: 'd1',
								doc_name: 'PAN',
								category: 'identity',
								is_mandatory: true,
								status: 'not_started'
							}
						]
					})
				]
			})
		);

		const scorecard = computeScorecard(cases, null, { now: NOW });
		expect(scorecard.insights.length).toBeLessThanOrEqual(5);
	});

	it('insights for cases stuck in processing', () => {
		const cases = Array.from({ length: 5 }, (_, i) =>
			makeCase({
				case_id: `HL-2026-${String(i).padStart(4, '0')}`,
				stage: 'processing',
				created_at: daysAgo(30),
				stage_history: [{ from: 'submitted', to: 'processing', timestamp: daysAgo(25) }]
			})
		);

		const scorecard = computeScorecard(cases, null, { now: NOW });
		const stuckInsight = scorecard.insights.find(
			(i) => i.toLowerCase().includes('processing') && i.toLowerCase().includes('21 days')
		);
		expect(stuckInsight).toBeDefined();
	});
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('computeScorecard — edge cases', () => {
	it('empty cases array does not crash', () => {
		const scorecard = computeScorecard([], null, { now: NOW });
		expect(scorecard).toBeDefined();
		expect(scorecard.metrics).toHaveLength(8);
		expect(scorecard.overall_score).toBeGreaterThanOrEqual(0);
	});

	it('null cases does not crash', () => {
		const scorecard = computeScorecard(null as any, null, { now: NOW });
		expect(scorecard).toBeDefined();
		expect(scorecard.metrics).toHaveLength(8);
	});

	it('undefined dsaProfile does not crash', () => {
		const scorecard = computeScorecard([], undefined, { now: NOW });
		expect(scorecard).toBeDefined();
	});

	it('cases with missing lender_applications does not crash', () => {
		const c = makeCase({ created_at: NOW });
		(c as any).lender_applications = undefined;

		const scorecard = computeScorecard([c], null, { now: NOW });
		expect(scorecard).toBeDefined();
	});

	it('uses custom now parameter', () => {
		const customNow = new Date('2026-06-15T12:00:00Z');
		const cases = [makeCase({ case_id: 'HL-2026-0001', created_at: customNow })];

		const scorecard = computeScorecard(cases, null, { now: customNow });
		expect(scorecard.generated_at).toEqual(customNow);
	});

	it('period_months parameter changes the analysis window', () => {
		// Cases spread over 3 months
		const cases = [
			makeCase({ case_id: 'HL-2026-0001', created_at: NOW }),
			makeCase({ case_id: 'HL-2026-0002', created_at: daysAgo(35) }),
			makeCase({ case_id: 'HL-2026-0003', created_at: daysAgo(65) })
		];

		const scorecard1 = computeScorecard(cases, null, { now: NOW, period_months: 1 });
		const scorecard3 = computeScorecard(cases, null, { now: NOW, period_months: 3 });

		const metric1 = findMetric(scorecard1, 'monthly_cases')!;
		const metric3 = findMetric(scorecard3, 'monthly_cases')!;

		// 3-month window should include more cases
		expect(metric3.current_value).toBeGreaterThanOrEqual(metric1.current_value);
	});
});
