/**
 * Plot & Equity Loan payload-patch absence lock.
 *
 * Per CLAUDE.md §16 Rule #16: this lock guards CANONICAL state, not the
 * transitional state that previously ratified a never-reached-engine bug.
 *
 * Background (S215, 2026-06-02):
 *   Before S215, `plot-loan/+page.svelte` had two payload-patch conditionals
 *   that mutated a local `payload` variable just before the validation block:
 *
 *     if ((currentAnswers as any).purchaseType === 'Resale') {
 *       (payload.loanTransaction as any).differentATSandPV = 'Yes';
 *     }
 *     if ((currentAnswers as any).loanVariant === 'Plot & Equity Loan') {
 *       (payload.loanTransaction as any).purchaseType = 'Direct Sale';
 *       (payload.loanTransaction as any).differentATSandPV = 'Yes';
 *     }
 *
 *   Investigation showed the patches NEVER reached the rule engine: the
 *   submission path (line ~1145) calls
 *     confirmAndSubmit({ formStateJson: formState.toJSON(), ... })
 *   The local `payload` variable is only used for client-side validation
 *   that follows, then discarded. Patch #1 was additionally dead from
 *   inception (case mismatch — form values are lowercase 'resale' / etc.,
 *   the comparison checked engine-canonical capitalized 'Resale').
 *
 *   The semantic intent (Plot & Equity ALWAYS has a different ATS vs PV;
 *   purchaseType is constrained by the two-file structure per ADR-0021)
 *   is the right thing to model at the form / builder / enricher layer
 *   inside LEND-1 Phase 2 (Plot & Equity engine + offer card), NOT as a
 *   local-payload mutation in the form +page.svelte.
 *
 * What this lock asserts:
 *   - Neither patch block re-appears in plot-loan/+page.svelte.
 *   - confirmAndSubmit is still called with loanType: 'Plot Loan' — this
 *     check is independent of the patches and protects against shape drift.
 *
 * If a future change wants to re-introduce purchaseType / differentATSandPV
 * overrides for Plot & Equity, do it at the canonical layer:
 *   - Form: set the value via formState (so formState.toJSON() carries it)
 *   - Builder: src/lib/utils/payloadBuilder/loanTransaction.ts
 *   - Enricher: src/lib/ruleEngine/payloadEnricher.ts
 *
 * Same source-pattern-scan style as:
 *   - dualTenureBTTopup.test.ts (BUG-E gate)
 *   - btTopupStringMatching.test.ts
 *   - loanFieldNomenclatureLock.test.ts
 *   - legacyPayloadFieldsAbsent.test.ts (a sibling canonical-absence lock)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGE_PATH = resolve(
	__dirname,
	'../../../routes/(app)/form/plot-loan/+page.svelte'
);

describe('plot-loan +page.svelte — Plot & Equity payload-patch absence', () => {
	const source = readFileSync(PAGE_PATH, 'utf-8');

	it('no `purchaseType === "Resale"` patch block mutates payload.loanTransaction', () => {
		// Pattern: any conditional that checks currentAnswers.purchaseType
		// (any cast) against the engine-canonical capitalized 'Resale' and
		// assigns to payload.loanTransaction.<field>. This is the form of
		// patch #1 that this lock guards against re-introduction of.
		const deadPattern =
			/\(\s*currentAnswers[\s\S]{0,40}?\)\.purchaseType\s*===\s*['"]Resale['"][\s\S]{0,200}?\(\s*payload\.loanTransaction[\s\S]{0,40}?\)\s*\.\w+\s*=/;
		expect(
			source,
			'Patch #1 (purchaseType === "Resale" → mutate payload.loanTransaction) must not be re-introduced. ' +
				'The local payload variable never reaches the engine; mutate formState ' +
				'or the canonical builder / enricher instead. See test header.'
		).not.toMatch(deadPattern);
	});

	it('no `loanVariant === "Plot & Equity Loan"` patch block mutates payload.loanTransaction', () => {
		// Pattern: any conditional that checks currentAnswers.loanVariant
		// (any cast) against 'Plot & Equity Loan' and assigns to
		// payload.loanTransaction.<field>. This is the form of patch #2.
		const deadPattern =
			/\(\s*currentAnswers[\s\S]{0,40}?\)\.loanVariant\s*===\s*['"]Plot & Equity Loan['"][\s\S]{0,400}?\(\s*payload\.loanTransaction[\s\S]{0,40}?\)\s*\.\w+\s*=/;
		expect(
			source,
			'Patch #2 (loanVariant === "Plot & Equity Loan" → mutate payload.loanTransaction) must not be re-introduced. ' +
				'Semantic intent belongs in LEND-1 Phase 2 (engine-level redesign). See test header.'
		).not.toMatch(deadPattern);
	});

	it('no live `loanType === "Plot & Equity Loan"` reference anywhere in the file', () => {
		// Belt-and-suspenders: post-2026-05-31 rename, `loanType` for Plot
		// carries SCOPE only ('New Loan' / 'Balance Transfer Only'); variant
		// values live in `loanVariant`. A copy-paste re-introduction of the
		// pre-rename pattern would silently never fire.
		const deadPattern =
			/\(\s*currentAnswers[\s\S]{0,40}?\)\.loanType\s*===\s*['"]Plot & Equity Loan['"]/g;
		const matches = source.match(deadPattern);
		expect(
			matches,
			'No reference to `currentAnswers.loanType === "Plot & Equity Loan"` should exist — `loanType` for Plot carries SCOPE only post-rename'
		).toBeNull();
	});

	it('confirmAndSubmit is called with loanType: "Plot Loan" (the loan-name, not a scope)', () => {
		// Independent of the patches — this protects the submission-call
		// shape. `confirmAndSubmit({ loanType })` historically expects the
		// loan-name. Verified consistent across all 6 loan pages
		// (lap/+page.svelte, home-loan/+page.svelte, etc.).
		const submitCallMatch = source.match(
			/confirmAndSubmit\s*\(\s*\{[\s\S]+?loanType\s*:\s*['"]([^'"]+)['"]/
		);
		expect(
			submitCallMatch,
			'confirmAndSubmit call shape changed — verify loanType is still passed as a literal loan-name'
		).not.toBeNull();
		expect(submitCallMatch?.[1]).toBe('Plot Loan');
	});
});
