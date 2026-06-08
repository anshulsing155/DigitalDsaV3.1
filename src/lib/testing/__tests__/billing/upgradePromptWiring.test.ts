/**
 * ═══════════════════════════════════════════════════════════════════════════
 * QBC (2026-05-30) — Upgrade-modal + save-prompt wiring on case-creation 402
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * REPLACES the pre-2026-05-29 D.6 Slice 4 lock-tests that covered the
 * single `case_limit_reached` code + single `showUpgradeModal` helper. The
 * quota-blocked-cases model splits this into TWO codes (save-prompt and
 * upgrade-required) and TWO helper modals — see
 * docs/specs/QUOTA-BLOCKED-CASES-SPEC.md §3.2 + §7.
 *
 * Layer 1 — Server-side structured 402 codes:
 *   quota_buffer_available + quota_fully_exhausted carry upgrade + buffer +
 *   next_cycle_at payloads.
 * Layer 2 — formSubmitHandler parses both codes; SubmitResult exposes
 *   bufferState + nextCycleAt + quotaBlocked flags.
 * Layer 3 — confirmAndSubmit has TWO private helpers:
 *   showSavePromptModal (Save/No on buffer_available) and
 *   showUpgradeRequiredModal (upgrade-only on fully_exhausted).
 * Layer 4 — SubscribeRecurringSection ?recommend= flow unchanged (deep-link
 *   to billing with the recommended plan pre-selected).
 *
 * Companion: docs/specs/QUOTA-BLOCKED-CASES-SPEC.md.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROUTE_PATH = resolve('src/routes/api/evaluate-and-persist/+server.ts');
const PHASE2_PATH = resolve('src/routes/api/cases/[case_id]/evaluate-offers/+server.ts');
const SHARED_PATH = resolve('src/lib/server/evaluateAndPersistShared.ts');
const HANDLER_PATH = resolve('src/lib/utils/formSubmitHandler.ts');
const CONFIRM_PATH = resolve('src/lib/utils/confirmAndSubmit.ts');
const EVALUATING_PATH = resolve('src/routes/(app)/evaluating/+page.svelte');
const PANEL_PATH = resolve('src/lib/components/billing/SubscribeRecurringSection.svelte');

describe('QBC — upgrade-modal + save-prompt wiring', () => {
	const routeSrc = readFileSync(ROUTE_PATH, 'utf-8');
	const phase2Src = readFileSync(PHASE2_PATH, 'utf-8');
	const sharedSrc = readFileSync(SHARED_PATH, 'utf-8');
	const handlerSrc = readFileSync(HANDLER_PATH, 'utf-8');
	const confirmSrc = readFileSync(CONFIRM_PATH, 'utf-8');
	const evaluatingSrc = readFileSync(EVALUATING_PATH, 'utf-8');
	const panelSrc = readFileSync(PANEL_PATH, 'utf-8');

	// ── Layer 1: server-side structured 402 codes ──────────────────────

	describe('evaluate-and-persist — structured 402 for QBC', () => {
		it('imports apiStructuredError (the only way to send a typed 402)', () => {
			expect(routeSrc).toMatch(/apiStructuredError/);
		});

		it('returns code "quota_buffer_available" when buffer has space', () => {
			expect(routeSrc).toMatch(/code:\s*['"]quota_buffer_available['"]/);
		});

		it('returns code "quota_fully_exhausted" when buffer is full', () => {
			expect(routeSrc).toMatch(/code:\s*['"]quota_fully_exhausted['"]/);
		});

		it('upgrade payload includes all six fields the modal renders', () => {
			expect(routeSrc).toMatch(/plan_id:/);
			expect(routeSrc).toMatch(/plan_name:/);
			expect(routeSrc).toMatch(/plan_limit:/);
			expect(routeSrc).toMatch(/current_count:/);
			expect(routeSrc).toMatch(/recommended_plan:/);
			expect(routeSrc).toMatch(/recommended_plan_name:/);
			expect(routeSrc).toMatch(/recommended_plan_limit:/);
		});

		it('buffer payload includes used + capacity + remaining', () => {
			expect(routeSrc).toMatch(/used:/);
			expect(routeSrc).toMatch(/capacity:/);
			expect(routeSrc).toMatch(/remaining:/);
		});

		it('next_cycle_at is included on both quota 402 responses (OQ-1)', () => {
			// Two occurrences expected — one on each code path.
			const matches = routeSrc.match(/next_cycle_at:/g) ?? [];
			expect(matches.length).toBeGreaterThanOrEqual(2);
		});

		it('Infinity caseLimit normalizes to null in the recommended_plan_limit', () => {
			expect(routeSrc).toMatch(/=== Infinity[\s\S]{0,80}?\? null/);
		});
	});

	// ── Layer 2: formSubmitHandler parses both codes + new fields ──────

	describe('formSubmitHandler — UpgradePrompt + BufferState + nextCycleAt', () => {
		it('UpgradePrompt interface exported with the six payload fields', () => {
			expect(handlerSrc).toMatch(/export interface UpgradePrompt/);
			expect(handlerSrc).toMatch(/plan_name:\s*string/);
			expect(handlerSrc).toMatch(/plan_limit:\s*number/);
			expect(handlerSrc).toMatch(/current_count:\s*number/);
			expect(handlerSrc).toMatch(/recommended_plan:\s*string/);
			expect(handlerSrc).toMatch(/recommended_plan_name:\s*string/);
			expect(handlerSrc).toMatch(/recommended_plan_limit:\s*number \| null/);
		});

		it('BufferState interface exported with used + capacity + remaining', () => {
			expect(handlerSrc).toMatch(/export interface BufferState/);
			expect(handlerSrc).toMatch(/used:\s*number/);
			expect(handlerSrc).toMatch(/capacity:\s*number/);
			expect(handlerSrc).toMatch(/remaining:\s*number/);
		});

		it('SubmitResult exposes upgradePrompt + bufferState + nextCycleAt + quotaBlocked', () => {
			expect(handlerSrc).toMatch(/upgradePrompt\?:\s*UpgradePrompt/);
			expect(handlerSrc).toMatch(/bufferState\?:\s*BufferState/);
			expect(handlerSrc).toMatch(/nextCycleAt\?:\s*string \| null/);
			expect(handlerSrc).toMatch(/quotaBlocked\?:\s*boolean/);
		});

		it('parse path gates on 402 AND (quota_buffer_available OR quota_fully_exhausted)', () => {
			// Both new codes share the upgrade-payload parse path; subscription-
			// required 402s (different shape) must NOT spread garbage into the
			// fields.
			expect(handlerSrc).toMatch(
				/serverCode === ['"]quota_buffer_available['"][\s\S]{0,80}?serverCode === ['"]quota_fully_exhausted['"]/
			);
		});

		it('SubmitOptions exposes saveToBuffer for the re-submit path', () => {
			// Save-prompt confirmation re-fires submitFormForEvaluation with
			// saveToBuffer=true → server persists at stage='quota_blocked'.
			expect(handlerSrc).toMatch(/saveToBuffer\?:\s*boolean/);
		});

		it('save_to_buffer wire-name is honored on the request body', () => {
			expect(handlerSrc).toMatch(/save_to_buffer:\s*true/);
		});

		it('quota_blocked flag is recognized by callEvaluateAndPersist', () => {
			expect(handlerSrc).toMatch(/quota_blocked/);
		});

		it('submitFormForEvaluation is the UX-inversion shim — stash + nav, no API call', () => {
			// USAGE shape: PENDING_SUBMISSION_KEY + goto('/evaluating') in
			// submitFormForEvaluation's body. The function should NOT call
			// secureFetch directly — that lives in callEvaluateAndPersist.
			expect(handlerSrc).toMatch(/PENDING_SUBMISSION_KEY/);
			expect(handlerSrc).toMatch(
				/export async function submitFormForEvaluation[\s\S]+?goto\(['"]\/evaluating['"]\)/
			);
		});

		it('callEvaluateAndPersist is exported (used by /evaluating)', () => {
			expect(handlerSrc).toMatch(/export async function callEvaluateAndPersist/);
		});

		it('recommended_plan_limit preserves null (vs being coerced to 0)', () => {
			expect(handlerSrc).toMatch(
				/recommended_plan_limit:[\s\S]{0,80}?=== null[\s\S]{0,20}?\? null/
			);
		});
	});

	// ── Layer 3a: confirmAndSubmit — simplified to thin pre-submit modal ──

	describe('confirmAndSubmit — pre-submit gate only (UX inversion 2026-05-30)', () => {
		it('does NOT import the QBC modal helpers (they moved to /evaluating)', () => {
			// Post-inversion the file is a thin wrapper around ConfirmModal.
			// showSavePromptModal + showUpgradeRequiredModal moved to /evaluating
			// as inline VIEWS, not modals. Their reappearance here would mean
			// the inversion got reverted.
			expect(confirmSrc).not.toMatch(/function showSavePromptModal\(/);
			expect(confirmSrc).not.toMatch(/function showUpgradeRequiredModal\(/);
		});

		it('calls submitFormForEvaluation on confirm (which stashes + navigates)', () => {
			expect(confirmSrc).toMatch(/submitFormForEvaluation\(options\)/);
		});

		it('main submit path no longer branches on the 402 codes', () => {
			// The branching moved to /evaluating's handleFreshSubmission.
			expect(confirmSrc).not.toMatch(/result\.code === ['"]quota_buffer_available['"]/);
			expect(confirmSrc).not.toMatch(/result\.code === ['"]quota_fully_exhausted['"]/);
		});
	});

	// ── Layer 3b: /evaluating page — owns the new flow ─────────────────

	describe('/evaluating page — UX-inversion orchestrator', () => {
		it('imports callEvaluateAndPersist + PENDING_SUBMISSION_KEY from formSubmitHandler', () => {
			expect(evaluatingSrc).toMatch(/callEvaluateAndPersist/);
			expect(evaluatingSrc).toMatch(/PENDING_SUBMISSION_KEY/);
		});

		it('reads PENDING_SUBMISSION_KEY from sessionStorage on mount', () => {
			// safeSessionStorage wraps raw sessionStorage with try/catch for
			// Safari private browsing / full quota / corporate policy edge
			// cases. Either form is acceptable for the lock; what matters is
			// the KEY (PENDING_SUBMISSION_KEY) is being read.
			expect(evaluatingSrc).toMatch(
				/(safeSessionStorage|sessionStorage)\.getItem\(\s*PENDING_SUBMISSION_KEY\s*\)/
			);
		});

		it('renders four distinct view states (loading / animation / save-prompt / upgrade-required / saved-to-buffer)', () => {
			// USAGE shape: each currentView equality check appears in the template.
			expect(evaluatingSrc).toMatch(/currentView === ['"]loading['"]/);
			expect(evaluatingSrc).toMatch(/currentView === ['"]animation['"]/);
			expect(evaluatingSrc).toMatch(/currentView === ['"]save-prompt['"]/);
			expect(evaluatingSrc).toMatch(/currentView === ['"]upgrade-required['"]/);
			expect(evaluatingSrc).toMatch(/currentView === ['"]saved-to-buffer['"]/);
		});

		it('save-prompt "Save this case" button calls handleSavePromptYes', () => {
			expect(evaluatingSrc).toMatch(/onclick=\{handleSavePromptYes\}/);
		});

		it('save-prompt "No, I\'ll handle it" button calls handleSavePromptNo', () => {
			expect(evaluatingSrc).toMatch(/onclick=\{handleSavePromptNo\}/);
			expect(evaluatingSrc).toMatch(/No, I['\\u2019]ll handle it/);
		});

		it('handleSavePromptYes re-fires callEvaluateAndPersist with saveToBuffer=true', () => {
			expect(evaluatingSrc).toMatch(
				/callEvaluateAndPersist\(\{[\s\S]{0,80}?saveToBuffer:\s*true[\s\S]{0,40}?\}\)/
			);
		});

		it('upgrade-required Upgrade CTA navigates to /dashboard/dsa/billing with ?recommend=', () => {
			expect(evaluatingSrc).toMatch(
				/goto\(\s*[\s\S]{0,30}?\/dashboard\/dsa\/billing\?recommend=\$\{encodeURIComponent\(upgradePrompt\.recommended_plan\)\}/
			);
		});

		it('formatNextCycleDate is defined with graceful fallback', () => {
			expect(evaluatingSrc).toMatch(/function formatNextCycleDate\(/);
			expect(evaluatingSrc).toMatch(/on your next billing date/);
		});

		it('quota_blocked success path transitions to saved-to-buffer view + navs to dashboard cases', () => {
			// USAGE shape: branches on result.quotaBlocked, sets currentView,
			// then navigates. Both the view-set and the goto must be present.
			expect(evaluatingSrc).toMatch(/quotaBlocked/);
			expect(evaluatingSrc).toMatch(/currentView = ['"]saved-to-buffer['"]/);
			expect(evaluatingSrc).toMatch(/\/dashboard\/dsa\/cases/);
		});

		it('legacy evaluationPayload path is preserved for back-compat', () => {
			// External tools or old code that stash evaluationPayload directly
			// (instead of going through PENDING_SUBMISSION_KEY) should still
			// land at the animation flow. safeSessionStorage wrapper is
			// transparent at the API level — accepts either form.
			expect(evaluatingSrc).toMatch(
				/(safeSessionStorage|sessionStorage)\.getItem\(\s*['"]evaluationPayload['"]\s*\)/
			);
		});
	});

	// ── Layer 3c: 2-phase split — security invariants (2026-06-03) ─────
	//
	// Canonical architecture: phase 1 persists case, phase 2 evaluates offers.
	// Each phase runs under Vercel's 10s Hobby ceiling. The split has THREE
	// hard security invariants that prevent the rule engine from being
	// exposed via probing:
	//   1. Phase 2 takes caseId from URL ONLY — never a request body payload
	//   2. Phase 2 calls verifyCaseOwnership before any work (BOLA defense)
	//   3. Phase 2 is idempotent — returns cached LenderResultsSnapshot
	//      when source_form_snapshot_version matches the case's current
	//      form_snapshot_version. The engine runs ONCE per snapshot version,
	//      defeating the timing-oracle / fuzzing attack on repeat calls.

	describe('2-phase split — security invariants', () => {
		it('phase 1 does NOT call the rule engine (evaluatePayload)', () => {
			// The rule engine moves to phase 2. If phase 1 imports or calls
			// evaluatePayload, the 10s ceiling problem returns.
			expect(routeSrc).not.toMatch(/import .{0,80}evaluatePayload/);
			expect(routeSrc).not.toMatch(/\bevaluatePayload\s*\(/);
		});

		it('phase 1 returns needs_evaluation flag (signals phase 2 to client)', () => {
			expect(routeSrc).toMatch(/needs_evaluation:/);
		});

		it('phase 1 stashes relationships into formState before snapshot insert', () => {
			// Phase 2 reads them back from FormSnapshot.payload — they're
			// never re-sent over the wire in phase 2's request.
			expect(routeSrc).toMatch(/FORM_STATE_RELATIONSHIPS_KEY/);
		});

		it('phase 2 endpoint exists at /api/cases/[case_id]/evaluate-offers', () => {
			expect(phase2Src).toMatch(/export const POST: RequestHandler/);
		});

		it('phase 2 takes caseId from params.case_id (URL), NEVER from body', () => {
			// Security invariant: client cannot supply a payload to phase 2.
			// If phase 2 ever starts reading req.body for formState/loanType/
			// etc., the rule engine becomes fuzzable.
			expect(phase2Src).toMatch(/params\.case_id/);
			expect(phase2Src).not.toMatch(/parseJsonBody/);
			expect(phase2Src).not.toMatch(/await request\.json\(\)/);
		});

		it('phase 2 calls verifyCaseOwnership (BOLA defense)', () => {
			expect(phase2Src).toMatch(/verifyCaseOwnership\(\s*caseId\s*,\s*dsaId\s*\)/);
		});

		it('phase 2 refuses to run for quota_blocked cases', () => {
			expect(phase2Src).toMatch(/stage === ['"]quota_blocked['"]/);
		});

		it('phase 2 idempotency: returns cached LenderResultsSnapshot when versions match', () => {
			// THE critical mitigation: same snapshot version always returns
			// the SAME results without re-running the engine. Repeated calls
			// from the same client get the same answer, no fresh evaluation.
			expect(phase2Src).toMatch(/source_form_snapshot_version:\s*currentFormVersion/);
			expect(phase2Src).toMatch(/cached:\s*true/);
		});

		it('phase 2 calls evaluatePayload (the actual rule-engine call)', () => {
			expect(phase2Src).toMatch(/evaluatePayload\(/);
		});

		it('phase 2 persists results via persistResults helper', () => {
			expect(phase2Src).toMatch(/persistResults\(/);
		});

		it('shared helpers file exists and exports the three pieces', () => {
			expect(sharedSrc).toMatch(/export function _buildPayloadFromFormState/);
			expect(sharedSrc).toMatch(/export async function createFormSnapshot/);
			expect(sharedSrc).toMatch(/export async function persistResults/);
			expect(sharedSrc).toMatch(/export const FORM_STATE_RELATIONSHIPS_KEY/);
		});

		it('client callEvaluateAndPersist chains phase 2 after phase 1 success', () => {
			expect(handlerSrc).toMatch(
				/secureFetch\(\s*`\/api\/cases\/\$\{encodeURIComponent\(caseId\)\}\/evaluate-offers`/
			);
		});

		it('client phase 2 request body is empty (security invariant)', () => {
			// The body MUST be empty (or absent) — never the formState. If a
			// future refactor passes formState/loanType/payload here, the
			// rule engine becomes client-driven and the moat leaks.
			expect(handlerSrc).toMatch(/body:\s*['"]\{\}['"]/);
		});

		it('client skips phase 2 when phase 1 returned quota_blocked or needs_evaluation=false', () => {
			expect(handlerSrc).toMatch(/quota_blocked \|\| needs_evaluation === false/);
		});
	});

	// ── Layer 4: SubscribeRecurringSection ?recommend= flow unchanged ──

	describe('SubscribeRecurringSection — ?recommend= query param', () => {
		it('reads recommend from URLSearchParams', () => {
			expect(panelSrc).toMatch(/params\.get\(['"]recommend['"]\)/);
		});

		it('validates against PlanId union (rejects malformed values)', () => {
			expect(panelSrc).toMatch(/VALID_PLAN_IDS/);
			expect(panelSrc).toMatch(/VALID_PLAN_IDS\.has\(recommend as PlanId\)/);
		});

		it('valid recommend overrides BOTH the badge AND the radio selection', () => {
			expect(panelSrc).toMatch(/recommendedPlanId = recommend as PlanId/);
			expect(panelSrc).toMatch(/selectedPlanId = recommend as PlanId/);
		});

		it('recommendedPlanId is reactive ($state) so the override actually re-renders', () => {
			expect(panelSrc).toMatch(/let recommendedPlanId = \$state<PlanId>\(['"]pro['"]\)/);
		});
	});
});
