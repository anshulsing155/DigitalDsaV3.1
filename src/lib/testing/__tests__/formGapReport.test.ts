/**
 * =============================================================================
 * FORM GAP REPORT — Evidence Collector for Form Improvement Pipeline
 * =============================================================================
 *
 * This test runs all 25 scenarios through the gap reporter and collects
 * evidence about:
 *   1. Payload keys with no matching form question (needs new form questions)
 *   2. Form questions that scenarios don't fill (missing scenario data)
 *   3. Coverage % per scenario (how much of the form each scenario exercises)
 *
 * This is an INFORMATIONAL test — it logs evidence but doesn't fail on gaps.
 * The evidence output drives the Form Improvement Pipeline (next plan).
 *
 * =============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
	generateFullGapReport,
	generateGapReport
} from '$lib/testing/scenarios/formPathAuditor.js';
import { ALL_SCENARIOS } from '$lib/testing/scenarios/formPathScenarios.js';
import type { ScenarioGapReport } from '$lib/testing/scenarios/formPathAuditor.js';

// Generate full report once for all tests
const allReports = generateFullGapReport(ALL_SCENARIOS);

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURAL TESTS — These must pass
// ─────────────────────────────────────────────────────────────────────────────

describe('Gap Report — Structural Validation', () => {
	it('generates a report for each scenario', () => {
		expect(allReports.length).toBe(ALL_SCENARIOS.length);
	});

	it('every report has a valid scenarioId matching a scenario', () => {
		const scenarioIds = new Set(ALL_SCENARIOS.map((s) => s.id));
		for (const report of allReports) {
			expect(scenarioIds.has(report.scenarioId)).toBe(true);
		}
	});

	it('every report has loanName and loanType populated', () => {
		for (const report of allReports) {
			expect(report.loanName.length).toBeGreaterThan(0);
			expect(report.loanType.length).toBeGreaterThan(0);
		}
	});

	it('every report has valid coveragePercent (0-100)', () => {
		for (const report of allReports) {
			expect(report.coveragePercent).toBeGreaterThanOrEqual(0);
			expect(report.coveragePercent).toBeLessThanOrEqual(100);
		}
	});

	it('missingFromForm entries have required fields', () => {
		for (const report of allReports) {
			for (const missing of report.missingFromForm) {
				expect(missing.key.length).toBeGreaterThan(0);
				expect(missing.assessmentPurpose.length).toBeGreaterThan(0);
			}
		}
	});

	it('unansweredFormQuestions entries have required fields', () => {
		for (const report of allReports) {
			for (const unanswered of report.unansweredFormQuestions) {
				expect(unanswered.questionId.length).toBeGreaterThan(0);
				expect(unanswered.pageId.length).toBeGreaterThan(0);
				expect(unanswered.questionType.length).toBeGreaterThan(0);
			}
		}
	});

	it('individual scenario report matches full report', () => {
		const singleReport = generateGapReport(ALL_SCENARIOS[0]);
		const matchInFull = allReports.find((r) => r.scenarioId === ALL_SCENARIOS[0].id);
		expect(matchInFull).toBeDefined();
		expect(singleReport.coveragePercent).toBe(matchInFull!.coveragePercent);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// COVERAGE BENCHMARKS — Track improvement over time
// ─────────────────────────────────────────────────────────────────────────────

describe('Gap Report — Coverage Benchmarks', () => {
	it('average coverage across all scenarios is above 15%', () => {
		// Current baseline: ~20%. As form improvements add questions, this should rise.
		// Target: 50%+ after Form Improvement Pipeline.
		const avgCoverage =
			allReports.reduce((sum, r) => sum + r.coveragePercent, 0) / allReports.length;
		expect(avgCoverage).toBeGreaterThanOrEqual(15);
	});

	it('at least one scenario has 25%+ coverage', () => {
		const highCoverage = allReports.filter((r) => r.coveragePercent >= 25);
		expect(highCoverage.length).toBeGreaterThan(0);
	});

	it('no scenario has 0% coverage (all schemas load)', () => {
		const zeroCoverage = allReports.filter((r) => r.coveragePercent === 0);
		if (zeroCoverage.length > 0) {
			const names = zeroCoverage.map((r) => r.scenarioId).join(', ');
			throw new Error(`Scenarios with 0% coverage (schema load failed?): ${names}`);
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE COLLECTION — Log detailed gap data (informational)
// ─────────────────────────────────────────────────────────────────────────────

describe('Gap Report — Evidence Collection (informational)', () => {
	it('logs coverage summary table', () => {
		const sortedByLoan = [...allReports].sort((a, b) => {
			const loanOrder = [
				'Home Loan',
				'Loan Against Property',
				'Plot Loan',
				'Personal Loan',
				'Business Loan',
				'Professional Loan'
			];
			return loanOrder.indexOf(a.loanName) - loanOrder.indexOf(b.loanName);
		});

		console.log(
			'\n┌────────────────────────────────────┬─────────┬──────────────┬─────────────────┐'
		);
		console.log(
			'│ Scenario                           │ Coverage│ Missing Keys │ Unanswered Qs   │'
		);
		console.log(
			'├────────────────────────────────────┼─────────┼──────────────┼─────────────────┤'
		);

		for (const report of sortedByLoan) {
			const id = report.scenarioId.padEnd(36);
			const cov = String(report.coveragePercent + '%').padStart(7);
			const missing = String(report.missingFromForm.length).padStart(12);
			const unanswered = String(report.unansweredFormQuestions.length).padStart(15);
			console.log(`│ ${id}│ ${cov} │ ${missing} │ ${unanswered} │`);
		}

		console.log(
			'└────────────────────────────────────┴─────────┴──────────────┴─────────────────┘'
		);

		// Average coverage
		const avg = Math.round(
			allReports.reduce((sum, r) => sum + r.coveragePercent, 0) / allReports.length
		);
		console.log(`\nAverage coverage: ${avg}%`);

		// This test always passes — it's for evidence collection
		expect(true).toBe(true);
	});

	it('logs missing-from-form keys grouped by loan type', () => {
		const byLoan: Record<string, Set<string>> = {};

		for (const report of allReports) {
			if (!byLoan[report.loanName]) byLoan[report.loanName] = new Set();
			for (const missing of report.missingFromForm) {
				byLoan[report.loanName].add(missing.key);
			}
		}

		console.log('\n═══ Missing from Form (needs new form questions) ═══');
		for (const [loanName, keys] of Object.entries(byLoan)) {
			if (keys.size > 0) {
				console.log(`  ${loanName}: ${Array.from(keys).join(', ')}`);
			}
		}

		// This test always passes — evidence only
		expect(true).toBe(true);
	});

	it('logs unanswered form questions grouped by loan type', () => {
		const byLoan: Record<string, Set<string>> = {};

		for (const report of allReports) {
			if (!byLoan[report.loanName]) byLoan[report.loanName] = new Set();
			for (const unanswered of report.unansweredFormQuestions) {
				byLoan[report.loanName].add(`${unanswered.questionId} (${unanswered.pageId})`);
			}
		}

		console.log('\n═══ Unanswered Form Questions (scenarios missing data) ═══');
		for (const [loanName, questions] of Object.entries(byLoan)) {
			if (questions.size > 0) {
				console.log(`  ${loanName} (${questions.size} questions):`);
				for (const q of questions) {
					console.log(`    - ${q}`);
				}
			}
		}

		// This test always passes — evidence only
		expect(true).toBe(true);
	});

	it('logs high-priority gaps (required unanswered questions)', () => {
		const highPriority: { scenarioId: string; questionId: string; pageId: string }[] = [];

		for (const report of allReports) {
			for (const unanswered of report.unansweredFormQuestions) {
				if (unanswered.required) {
					highPriority.push({
						scenarioId: report.scenarioId,
						questionId: unanswered.questionId,
						pageId: unanswered.pageId
					});
				}
			}
		}

		if (highPriority.length > 0) {
			console.log(
				`\n⚠️  HIGH-PRIORITY GAPS: ${highPriority.length} required questions not filled by scenarios`
			);
			for (const gap of highPriority.slice(0, 20)) {
				console.log(`  ${gap.scenarioId} → ${gap.questionId} (${gap.pageId})`);
			}
			if (highPriority.length > 20) {
				console.log(`  ... and ${highPriority.length - 20} more`);
			}
		} else {
			console.log('\n✅ No high-priority gaps — all required questions are answered by scenarios');
		}

		// This test always passes — evidence only
		expect(true).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// PER-LOAN-TYPE COVERAGE — Detailed breakdown
// ─────────────────────────────────────────────────────────────────────────────

describe('Gap Report — Per-Loan-Type Coverage', () => {
	const loanTypes = [
		'Home Loan',
		'Loan Against Property',
		'Plot Loan',
		'Personal Loan',
		'Business Loan',
		'Professional Loan'
	];

	it.each(loanTypes)('%s has at least one scenario with coverage > 0%', (loanType) => {
		const reports = allReports.filter((r) => r.loanName === loanType);
		expect(reports.length).toBeGreaterThan(0);

		const maxCoverage = Math.max(...reports.map((r) => r.coveragePercent));
		expect(maxCoverage).toBeGreaterThan(0);
	});

	it('all 6 loan types are represented in the gap report', () => {
		const representedLoanTypes = new Set(allReports.map((r) => r.loanName));
		for (const lt of loanTypes) {
			expect(representedLoanTypes.has(lt)).toBe(true);
		}
	});
});
