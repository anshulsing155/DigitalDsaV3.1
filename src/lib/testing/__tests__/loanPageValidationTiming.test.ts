/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: every loan page wires cross-field validation correctly.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * Schema questions can carry `validation.condition` JSON-Logic rules that
 * reference DERIVED variables (e.g. `_maxPossibleEmis`, computed from
 * `loanDisbursementDate`). These rules ONLY fire on the server (engine.ts
 * validatePage), so the client must round-trip through `/api/form/evaluate`
 * to surface them.
 *
 * S103 (2026-05-15) discovered Pitfall #21: cross-field rules silently let
 * users advance with invalid data — the error appeared only after
 * Next-then-Back. S103 over-corrected by wiring `debouncedEvaluate` into
 * `updateAnswerByKey` on every keystroke with a 300ms window. That caused
 * typing lag + mid-input resets — the server response clobbered in-progress
 * input. S104 (2026-05-16) reverted the per-keystroke wiring entirely:
 * cross-field validation now fires ONLY on Next-click via
 * `await evaluateOnServer + tick`, which is sufficient because:
 *
 *   • Field-level validation (max/min, format, required) is client-side
 *     and instant — no server needed.
 *   • Within-page progressive disclosure (showWhen) is client-side via
 *     `deriveVisibleQuestions` → `shouldShowEncoded`, evaluated against
 *     the latest `formState.loanData`. No per-keystroke server call.
 *   • Cross-field rules ARE checked before navigation — onNext awaits
 *     evaluateOnServer + tick, then checks `isNextEnabled` which consults
 *     `serverPage.validationErrors`. Invalid data blocks Next.
 *
 * THE CORRECT CONTRACT (post-S104)
 * ─────────────────────────────────
 *   1. `isNextEnabled` blocks Next when `serverPage.validationErrors.length > 0`
 *   2. `onNext` flushes `evaluateOnServer + tick` BEFORE consulting `isNextEnabled`
 *   3. `updateAnswerByKey` does NOT call the server (no debouncedEvaluate
 *      from input). The function may still exist for the Next-click flush
 *      path but must NOT be invoked per-keystroke.
 *
 * Source-pattern testing is fragile to refactor, but it pins the contract
 * that pure unit tests can't reach without spinning up Svelte + a full
 * form session. If a future refactor changes the pattern, this test forces
 * an updated check that reflects the new shape.
 *
 * Companion: CLAUDE.md §3 Pitfall #21, §4 grep recipe.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGES: Array<{ loanType: string; path: string }> = [
	{
		loanType: 'Home Loan',
		path: 'src/routes/(app)/form/home-loan/+page.svelte'
	},
	{
		loanType: 'LAP',
		path: 'src/routes/(app)/form/lap/+page.svelte'
	},
	{
		loanType: 'Plot Loan',
		path: 'src/routes/(app)/form/plot-loan/+page.svelte'
	},
	{
		loanType: 'Personal Loan',
		path: 'src/routes/(app)/form/unsecure-loan/personal-loan/+page.svelte'
	},
	{
		loanType: 'Business Loan',
		path: 'src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte'
	},
	{
		loanType: 'Professional Loan',
		path: 'src/routes/(app)/form/unsecure-loan/professional-loan/+page.svelte'
	}
];

/** Extracts the body of a function/block opened by a header substring. */
function extractBlock(src: string, header: string): string | null {
	const headerIdx = src.indexOf(header);
	if (headerIdx === -1) return null;
	const open = src.indexOf('{', headerIdx);
	if (open === -1) return null;
	let depth = 0;
	for (let i = open; i < src.length; i++) {
		const ch = src[i];
		if (ch === '{') depth++;
		else if (ch === '}') {
			depth--;
			if (depth === 0) return src.slice(open + 1, i);
		}
	}
	return null;
}

describe('loan-page validation-timing contract', () => {
	for (const { loanType, path } of PAGES) {
		describe(loanType, () => {
			const src = readFileSync(resolve(process.cwd(), path), 'utf8');

			it('updateAnswerByKey does NOT call debouncedEvaluate per-keystroke', () => {
				// S104 reversal: the per-keystroke server call (debouncedEvaluate
				// invoked from updateAnswerByKey) caused typing lag + mid-input
				// resets. Cross-field validation now fires only on Next-click.
				const body = extractBlock(src, 'function updateAnswerByKey');
				expect(body, `updateAnswerByKey not found in ${path}`).not.toBeNull();
				expect(
					body!.includes('debouncedEvaluate('),
					`updateAnswerByKey in ${path} must NOT call debouncedEvaluate(...) per-keystroke. The 300ms window clobbers in-progress input; the 1500ms hot-fix only delays the same symptom. Cross-field validation fires on Next-click via the await evaluateOnServer + tick flush in onNext. See CLAUDE.md Pitfall #21 (S104 design note).`
				).toBe(false);
			});

			it('updateAnswerByKey clears stale cross-field errors on edit', () => {
				// Pitfall #21 follow-up: serverPage.validationErrors is a server
				// snapshot refreshed only on Next-click. Once shown, editing the
				// offending field left the stale error in place, so isNextEnabled
				// kept Next disabled until a Previous-then-back re-evaluation. Each
				// page must optimistically clear the snapshot on edit so a corrected
				// field re-enables Next immediately. The authoritative re-check still
				// runs on Next-click (the test above), so this does not weaken
				// validation.
				const body = extractBlock(src, 'function updateAnswerByKey');
				expect(body, `updateAnswerByKey not found in ${path}`).not.toBeNull();
				expect(
					body!.includes('clearStaleValidationErrors('),
					`updateAnswerByKey in ${path} must call clearStaleValidationErrors(serverPage) so a corrected field reactively re-enables Next. Without it, a stale cross-field error lingers and Next stays disabled until Previous-then-back. See CLAUDE.md Pitfall #21.`
				).toBe(true);
			});

			it('isNextEnabled blocks Next on serverPage.validationErrors', () => {
				const body = extractBlock(src, 'let isNextEnabled = $derived');
				expect(body, `isNextEnabled not found in ${path}`).not.toBeNull();
				expect(
					/serverPage\?\.validationErrors\?\.length/.test(body!),
					`isNextEnabled in ${path} must check serverPage.validationErrors. Otherwise Next enables on invalid data. See CLAUDE.md Pitfall #21.`
				).toBe(true);
			});

			it('onNext flushes pending evaluate before navigating', () => {
				// onNext is an inline arrow in JSX — find the prop and check the body
				// includes a guarded `await evaluateOnServer(...)` + `await tick()` pair.
				// This is the SOLE remaining cross-field validation trigger after S104.
				const onNextStart = src.indexOf('onNext={async ');
				expect(
					onNextStart,
					`onNext in ${path} must be async (so it can await evaluateOnServer). See CLAUDE.md Pitfall #21.`
				).toBeGreaterThan(-1);
				// Grab a generous slice and check for the flush pattern
				const onNextSlice = src.slice(onNextStart, onNextStart + 2500);
				expect(
					/await\s+evaluateOnServer\s*\(/.test(onNextSlice) && /await\s+tick\s*\(/.test(onNextSlice),
					`onNext in ${path} must await evaluateOnServer + tick before consulting isNextEnabled. This is the sole cross-field validation trigger after S104 stripped the per-keystroke wiring. See CLAUDE.md Pitfall #21.`
				).toBe(true);
			});
		});
	}
});
