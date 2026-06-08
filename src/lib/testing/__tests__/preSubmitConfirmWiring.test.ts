/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: every loan submit goes through the pre-submit ConfirmModal,
 * and the offer page guards browser-back to the form.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * Under the (in-progress) monthly-quota billing model, every form submission
 * — whether brand-new or an edit of an existing case — consumes one case
 * from the DSA's monthly plan. The only no-cost adjustments live on the
 * offer page (loan tenure slider, down-payment slider on Home / Plot).
 *
 * To make the cost visible BEFORE the network call commits the case, two
 * UX surfaces must always be in place:
 *
 *   1. Every loan +page.svelte's submit handler MUST route through
 *      `confirmAndSubmit` (which opens the pre-submit ConfirmModal). It
 *      must NOT call `submitFormForEvaluation` directly, because that
 *      bypasses the modal and the DSA loses the last-look confirmation.
 *
 *   2. The dashboard offer page (.../cases/[case_id]/results) MUST register
 *      a `beforeNavigate` guard that opens a "going back will cost another
 *      submission" ConfirmModal whenever the DSA tries to leave for any
 *      /form/* route — whether via browser-back, sidebar nav, or an
 *      in-page Edit-Application link.
 *
 * Either omission silently re-introduces the original UX: a DSA clicks
 * "Show Offers" or browser-back, and the case is created (and a slot
 * consumed under the new billing model) without the warning that the
 * design contract requires.
 *
 * THIS TEST
 * ─────────
 * Static source-code scan. Three groups of assertions:
 *
 *   • All 6 loan +page.svelte files import `confirmAndSubmit` AND call it
 *     AND do NOT call `submitFormForEvaluation` directly.
 *   • formSubmitHandler.ts continues to export `submitFormForEvaluation` —
 *     because the wrapper consumes it internally. (Smoke check that the
 *     refactor didn't accidentally delete the underlying call.)
 *   • The results page imports `beforeNavigate` and `dialogState`, AND
 *     contains both a `beforeNavigate(` registration and a `/form/`
 *     pathname check inside it.
 *
 * Source-pattern tests catch refactors that re-introduce the regression
 * (same approach as `directorAutoIncomeWiring.test.ts` for Pitfall #46).
 *
 * Companion: CLAUDE.md Pitfall #47 (added with this work); ADR follow-up
 * when monthly-quota billing lands.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── The six loan +page.svelte files ─────────────────────────────────────
const LOAN_PAGES: Array<{ label: string; path: string }> = [
	{ label: 'Home Loan', path: 'src/routes/(app)/form/home-loan/+page.svelte' },
	{ label: 'LAP', path: 'src/routes/(app)/form/lap/+page.svelte' },
	{ label: 'Plot Loan', path: 'src/routes/(app)/form/plot-loan/+page.svelte' },
	{
		label: 'Personal Loan',
		path: 'src/routes/(app)/form/unsecure-loan/personal-loan/+page.svelte'
	},
	{
		label: 'Business Loan',
		path: 'src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte'
	},
	{
		label: 'Professional Loan',
		path: 'src/routes/(app)/form/unsecure-loan/professional-loan/+page.svelte'
	}
];

const RESULTS_PAGE = 'src/routes/dashboard/dsa/cases/[case_id]/results/+page.svelte';
const FORM_SUBMIT_HANDLER = 'src/lib/utils/formSubmitHandler.ts';

// ── Helpers ────────────────────────────────────────────────────────────
function read(path: string): string {
	return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Pre-submit ConfirmModal wiring on all 6 loan forms', () => {
	for (const { label, path } of LOAN_PAGES) {
		describe(label, () => {
			const src = read(path);

			it('imports confirmAndSubmit from $lib/utils/confirmAndSubmit', () => {
				// Match the exact import line so a renamed/aliased import still
				// triggers a clear failure rather than silently passing because
				// the function name happens to appear in a comment.
				expect(
					src.includes(`from '$lib/utils/confirmAndSubmit'`),
					`${label} (${path}) must import from $lib/utils/confirmAndSubmit so the pre-submit ConfirmModal fires before /api/evaluate-and-persist runs. Without this, the DSA loses the last-look confirmation and a case slot is consumed without warning under the monthly-quota billing model. See CLAUDE.md Pitfall #47.`
				).toBe(true);
				expect(
					src.includes('confirmAndSubmit'),
					`${label} (${path}) must reference confirmAndSubmit by name.`
				).toBe(true);
			});

			it('calls confirmAndSubmit(...) in the submit handler', () => {
				// `confirmAndSubmit(` distinguishes the call site from the import.
				expect(
					src.includes('confirmAndSubmit('),
					`${label} (${path}) must call confirmAndSubmit(...) — the import alone is not enough; the submit handler has to invoke it. Pitfall #47.`
				).toBe(true);
			});

			it('does NOT call submitFormForEvaluation directly (bypasses the modal)', () => {
				// The wrapper consumes submitFormForEvaluation internally — the
				// loan page must not. Calling it directly skips the pre-submit
				// modal AND breaks the parity contract this test exists to lock.
				expect(
					src.includes('submitFormForEvaluation('),
					`${label} (${path}) must NOT call submitFormForEvaluation(...) directly — use confirmAndSubmit(...) instead. Direct calls bypass the pre-submit ConfirmModal and silently consume a case slot. Pitfall #47.`
				).toBe(false);
			});

			it('handles the cancelled-result early-return path', () => {
				// confirmAndSubmit resolves with `{ cancelled: true }` when the
				// DSA dismisses the modal — the form MUST short-circuit on this
				// before the !success branch, otherwise an empty error message
				// surfaces and isSubmitting may be misreported.
				expect(
					/result\.cancelled/.test(src),
					`${label} (${path}) must check \`result.cancelled\` after confirmAndSubmit() returns, so dismissing the modal returns silently instead of surfacing an empty submitError. Pitfall #47.`
				).toBe(true);
			});
		});
	}
});

describe('Wrapper / underlying-call contract', () => {
	it('formSubmitHandler.ts still exports submitFormForEvaluation', () => {
		const src = read(FORM_SUBMIT_HANDLER);
		expect(
			/export\s+async\s+function\s+submitFormForEvaluation/.test(src),
			'formSubmitHandler.ts must continue to export submitFormForEvaluation — the confirmAndSubmit wrapper consumes it internally. Removing the export breaks the modal-confirm → real-submit chain.'
		).toBe(true);
	});

	it('confirmAndSubmit.ts is the ONLY caller of submitFormForEvaluation outside its own module', () => {
		// Scan all .ts and .svelte under src/ and assert no caller other than
		// confirmAndSubmit.ts uses submitFormForEvaluation. The handler module
		// itself defines it (export line above) — that's allowed.
		const { execSync } = require('node:child_process') as typeof import('node:child_process');
		const out = execSync(
			'git grep -lE "submitFormForEvaluation\\(" -- src/',
			{ encoding: 'utf8' }
		).trim();
		const callers = out
			.split(/\r?\n/)
			.filter((p) => p.length > 0)
			.map((p) => p.replace(/\\/g, '/'));
		// formSubmitHandler.ts is the DEFINER (`export async function
		// submitFormForEvaluation(...)`) — the regex matches its function
		// signature. That's the one allowed self-reference. confirmAndSubmit
		// is the ONE allowed caller. This test file ALSO matches because its
		// comments + assertion messages contain the literal string
		// `submitFormForEvaluation(` — that's documenter, not caller.
		// Any other file is a Pitfall #47 leak.
		const allowed = new Set([
			'src/lib/utils/formSubmitHandler.ts',
			'src/lib/utils/confirmAndSubmit.ts',
			'src/lib/testing/__tests__/preSubmitConfirmWiring.test.ts'
		]);
		const stray = callers.filter((p) => !allowed.has(p));
		expect(
			stray,
			`Only confirmAndSubmit.ts may invoke submitFormForEvaluation(...). Stray callers found: ${JSON.stringify(stray)}. Route them through confirmAndSubmit(...) instead (Pitfall #47).`
		).toEqual([]);
	});
});

describe('Offer page back-to-form navigation guard', () => {
	const src = read(RESULTS_PAGE);

	it('imports beforeNavigate from $app/navigation', () => {
		expect(
			/import\s*{[^}]*beforeNavigate[^}]*}\s*from\s*['"]\$app\/navigation['"]/.test(src),
			`${RESULTS_PAGE} must import \`beforeNavigate\` from \`$app/navigation\` so it can intercept browser-back / link clicks heading to the form. Pitfall #47.`
		).toBe(true);
	});

	it('imports dialogState (the modal-open surface)', () => {
		expect(
			src.includes(`from '$lib/state/dialog.svelte'`),
			`${RESULTS_PAGE} must import dialogState — the back-to-form ConfirmModal is opened through dialogState.openConfirmModal. Pitfall #47.`
		).toBe(true);
	});

	it('registers a beforeNavigate handler that filters on /form/ paths', () => {
		// The exact filter shape ("/form/") is the load-bearing piece — without
		// it, EVERY nav off the offer page would prompt, including dashboard
		// links, logout, etc. The test asserts both the registration and the
		// pathname check appear in the file.
		expect(
			/beforeNavigate\s*\(/.test(src),
			`${RESULTS_PAGE} must call beforeNavigate(...) to register the guard. Pitfall #47.`
		).toBe(true);
		expect(
			src.includes(`'/form/'`) || src.includes(`"/form/"`),
			`${RESULTS_PAGE} beforeNavigate handler must check pathname.startsWith('/form/') so only form-bound navigations trigger the modal — dashboard nav, logout, sidebar links must pass through untouched. Pitfall #47.`
		).toBe(true);
	});

	it('cancels the original navigation and opens the confirm modal', () => {
		// nav.cancel() is what blocks the immediate navigation; openConfirmModal
		// is what surfaces the warning. Both must coexist in the same file.
		expect(
			/\.cancel\s*\(\s*\)/.test(src),
			`${RESULTS_PAGE} beforeNavigate handler must call nav.cancel() to block the original navigation before opening the modal. Pitfall #47.`
		).toBe(true);
		expect(
			src.includes('openConfirmModal('),
			`${RESULTS_PAGE} must open the back-to-form ConfirmModal via dialogState.openConfirmModal(...) inside the beforeNavigate handler. Pitfall #47.`
		).toBe(true);
	});
});
