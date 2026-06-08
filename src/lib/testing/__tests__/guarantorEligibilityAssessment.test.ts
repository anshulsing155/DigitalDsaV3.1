/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: per-lender guarantor eligibility assessment
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * Per `docs/specs/GUARANTOR-ELIGIBILITY-ASSESSMENT-SPEC.md` (APPROVED
 * 2026-05-28), the rule engine must answer "will this guarantor actually
 * be ACCEPTED by Lender X?" not just "is guarantor income verified?".
 *
 * Until this assessment, the engine handled guarantor income correctly
 * (assessed independently, NOT pooled, final_amount=0 per income_assessor)
 * but said NOTHING about whether the lender's policy threshold would
 * accept the guarantor's independent capacity to service the EMI.
 *
 * The implementation (Step 8c in evaluationEngine.ts) computes:
 *   guarantor_capacity_% = (g_income × max_foir − g_obligations) / emi × 100
 * compares it to lender's `guarantor_acceptance.min_emi_capacity_percent`
 * (default 80%), AND runs the same age-at-maturity gate the borrower runs.
 *
 * Two states only — accepted or rejected. When rejected, traffic light
 * demotes GREEN → AMBER. Hidden entirely on cases with no guarantor.
 *
 * THIS TEST
 * ─────────
 * Layer 1 — Source-pattern scan locks 9 structural invariants in
 *   `evaluationEngine.ts` Step 8c (gate exact, default 80, age gate,
 *   capacity formula reads assessed_income, null=not_accepted branch,
 *   GREEN→AMBER demote, never escalates beyond AMBER, single-find loop,
 *   classification scan exact strings).
 *
 * Layer 2 — Source-pattern scan locks 3 UI invariants in
 *   `LenderResultCard.svelte` (row hidden when no guarantor, capacity %
 *   shown on accepted, age_at_maturity / not_accepted / default-capacity
 *   branches all rendered).
 *
 * Layer 3 — Pure-math verification (4 tests) replicates the spec formula
 *   with known inputs to confirm capacity-%, threshold default, and the
 *   spec's worked example come out as advertised.
 *
 * Companion: docs/specs/GUARANTOR-ELIGIBILITY-ASSESSMENT-SPEC.md,
 * singleGuarantorRule.test.ts (form validation side), CLAUDE.md §4 grep
 * recipe to be added.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENGINE_PATH = resolve('src/lib/ruleEngine/evaluationEngine.ts');
const CARD_PATH = resolve('src/lib/components/dashboard/results/LenderResultCard.svelte');
const TYPES_PATH = resolve('src/lib/ruleEngine/types.ts');
const RESULT_TYPES_PATH = resolve('src/lib/types/lenderResults.ts');

describe('Guarantor eligibility assessment (spec compliance)', () => {
	const engineSrc = readFileSync(ENGINE_PATH, 'utf-8');
	const cardSrc = readFileSync(CARD_PATH, 'utf-8');
	const enginTypesSrc = readFileSync(TYPES_PATH, 'utf-8');
	const resultTypesSrc = readFileSync(RESULT_TYPES_PATH, 'utf-8');

	// ── Layer 1: engine source-pattern locks ──────────────────────────────

	describe('engine Step 8c — structural invariants', () => {
		// Isolate the Step 8c block: from the header comment through the
		// assembled evaluation field. Spans the classification scan, branches,
		// and demotion logic.
		const stepBlockMatch = engineSrc.match(
			/\/\/ -- Step 8c: Guarantor eligibility assessment[\s\S]+?\/\/ -- Assemble evaluation --/
		);

		it('Step 8c block is present in evaluationEngine.ts', () => {
			expect(
				stepBlockMatch,
				'Step 8c guarantor block missing — engine no longer performs the assessment'
			).not.toBeNull();
		});

		const block = stepBlockMatch?.[0] ?? '';

		it('classification scan matches BOTH guarantor_financial AND guarantor_non_financial', () => {
			// Spec: identify guarantor via classification. Missing either string
			// silently skips real guarantors whose income status varies.
			expect(block).toMatch(/['"]guarantor_financial['"]/);
			expect(block).toMatch(/['"]guarantor_non_financial['"]/);
		});

		it('uses HFC default threshold of 80 when lender has no per-lender data', () => {
			// Spec §"RM-side data": "v1 ships with 80% as the default". Any change
			// requires owner sign-off because it shifts every lender's calculation
			// until per-lender values are gathered.
			expect(block).toMatch(/GUARANTOR_DEFAULT_THRESHOLD\s*=\s*80/);
		});

		it('runs an age-at-maturity gate using params.maxAgeAtMaturity + tenure', () => {
			// Spec §3: "If guarantor.age + tenure_years > lender.max_age_at_maturity,
			// the guarantee is legally invalid at maturity — mark accepted_by_lender
			// = false regardless of capacity." Must mirror borrower-side gate.
			expect(block).toMatch(/maxAgeAtMaturity/);
			expect(block).toMatch(/age_at_maturity/);
		});

		it('treats min_emi_capacity_percent === null as automatic reject (not_accepted)', () => {
			// Spec §1: "null = lender does not accept guarantors at all". The
			// engine must branch on `=== null` specifically — `undefined` means
			// "no per-lender data, use default", which is a different decision.
			expect(block).toMatch(/policyThreshold === null/);
			expect(block).toMatch(/['"]not_accepted['"]/);
		});

		it('capacity formula reads assessed_amount (not final_amount=0 for guarantors)', () => {
			// Subtle: guarantor income_sources have final_amount=0 by design (not
			// pooled into borrower eligibility, see incomeAssessorV2.ts:146).
			// Using final_amount would always give 0% capacity → every guarantor
			// rejected. Must use assessed_amount.
			expect(block).toMatch(/assessed_amount/);
			expect(block).not.toMatch(/s\.final_amount/);
		});

		it('demotion is GREEN → AMBER only — never escalates beyond AMBER, never RED', () => {
			// Spec §4 traffic-light impact: "Borrower passes AND guarantor rejected
			// → AMBER". The check must explicitly gate on `trafficLight === 'green'`
			// to avoid clobbering an existing RED (which could happen if a future
			// change reordered the steps).
			expect(block).toMatch(/trafficLight === ['"]green['"]/);
			expect(block).toMatch(/trafficLight = ['"]amber['"]/);
			// Negative check — must not have any `trafficLight = 'red'` inside
			// the guarantor block.
			expect(block).not.toMatch(/trafficLight\s*=\s*['"]red['"]/);
		});

		it('finds AT MOST ONE guarantor (loop breaks on first match)', () => {
			// Spec §"Domain rules" + singleGuarantorRule.test.ts: at most one
			// guarantor per case. The engine must break out of the find loop
			// rather than scan further — defensive against a future form-side
			// regression that lets a second slip through.
			expect(block).toMatch(/break;/);
		});
	});

	// ── Layer 1.5: engine types lock ──────────────────────────────────────

	describe('engine + result types', () => {
		it('ParsedLenderRuleDocument exposes guarantor_acceptance.min_emi_capacity_percent', () => {
			expect(enginTypesSrc).toMatch(/guarantor_acceptance\??:\s*\{/);
			expect(enginTypesSrc).toMatch(/min_emi_capacity_percent:\s*number \| null/);
		});

		it('GuarantorAssessment interface includes the spec fields', () => {
			expect(enginTypesSrc).toMatch(/export interface GuarantorAssessment/);
			expect(enginTypesSrc).toMatch(/capacity_percent:\s*number/);
			expect(enginTypesSrc).toMatch(/required_percent:\s*number/);
			expect(enginTypesSrc).toMatch(/accepted_by_lender:\s*boolean/);
			// failure_reason union must cover all three rejection paths
			expect(enginTypesSrc).toMatch(/['"]capacity['"]/);
			expect(enginTypesSrc).toMatch(/['"]age_at_maturity['"]/);
			expect(enginTypesSrc).toMatch(/['"]not_accepted['"]/);
		});

		it('LenderResult re-exports the same guarantor shape (no type drift)', () => {
			expect(resultTypesSrc).toMatch(/export interface GuarantorResultRow/);
			expect(resultTypesSrc).toMatch(/guarantor\?:\s*GuarantorResultRow/);
		});
	});

	// ── Layer 2: UI source-pattern locks ──────────────────────────────────

	describe('LenderResultCard — guarantor row rendering', () => {
		it('row is conditionally rendered on result.guarantor (hidden when no guarantor)', () => {
			// Spec §4 result-tile surfacing: "Hide the row entirely if no guarantor
			// on the case." Two states only — never a "no guarantor" placeholder.
			expect(cardSrc).toMatch(/\{#if result\.guarantor\}/);
		});

		it('shows capacity % on accepted state', () => {
			expect(cardSrc).toMatch(/Accepted \({result\.guarantor\.capacity_percent\}% capacity\)/);
		});

		it('renders age_at_maturity + not_accepted + default-capacity branches', () => {
			// All three rejection reasons must produce distinct messages so the
			// DSA understands WHY the guarantor failed.
			expect(cardSrc).toMatch(/age_at_maturity/);
			expect(cardSrc).toMatch(/not_accepted/);
			// Default-capacity branch shows current% vs required%
			expect(cardSrc).toMatch(/required_percent/);
		});
	});

	// ── Layer 3: pure-math verification ──────────────────────────────────

	describe('capacity formula — pure math sanity', () => {
		// Replicates the engine's inline calc with known inputs so the math
		// is independently locked. Engine uses:
		//   headroom = max(0, income × max_foir − obligations)
		//   capacity_% = round(headroom / emi × 100)

		function capacityPercent(
			income: number,
			maxFoir: number,
			obligations: number,
			emi: number
		): number {
			const headroom = Math.max(0, income * maxFoir - obligations);
			return emi > 0 ? Math.round((headroom / emi) * 100) : 0;
		}

		it('100K income, 0.5 FOIR, 0 obligations, 50K EMI → exactly 100% capacity', () => {
			expect(capacityPercent(100_000, 0.5, 0, 50_000)).toBe(100);
		});

		it('100K income, 0.5 FOIR, 10K obligations, 50K EMI → 80% (meets HFC default)', () => {
			// Headroom = 50_000 − 10_000 = 40_000; 40_000 / 50_000 = 80%. This is
			// the spec's worked example — exact 80% at the HFC threshold = accept.
			expect(capacityPercent(100_000, 0.5, 10_000, 50_000)).toBe(80);
		});

		it('50K income, 0.5 FOIR, 0 obligations, 50K EMI → 50% (below 80%, would reject)', () => {
			expect(capacityPercent(50_000, 0.5, 0, 50_000)).toBe(50);
		});

		it('headroom clamps non-negative — obligations > income×FOIR returns 0%', () => {
			// Without the max(0, ...) clamp, the negative headroom would produce
			// a negative capacity %, which would compare false against any
			// positive threshold but is meaningless. Clamp to 0.
			expect(capacityPercent(50_000, 0.5, 100_000, 50_000)).toBe(0);
		});
	});
});
