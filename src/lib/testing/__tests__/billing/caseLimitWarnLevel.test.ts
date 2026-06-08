/**
 * ═══════════════════════════════════════════════════════════════════════════
 * QBC (2026-05-30) — Case-limit warn-level + quota-blocked branching
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * REPLACES the pre-2026-05-29 D.6 Slice 2 lock-tests that covered the
 * "one-extra-case gesture" model (hardLimit = caseLimit + 1, two warn levels
 * 'approaching' + 'at_gesture'). That model was retired in favor of the
 * quota-blocked-cases save buffer — see docs/specs/QUOTA-BLOCKED-CASES-SPEC.md.
 *
 * THIS TEST locks the new structure:
 *
 * Layer 1 — Source-pattern scan of the case-limit block in
 *   /api/evaluate-and-persist/+server.ts:
 *
 *   • 'quota_buffer_available' code path renders the save-prompt
 *   • 'quota_fully_exhausted' code path renders the upgrade-required modal
 *   • single 'approaching' warn level (at 80% utilization, post-spec
 *     unified ladder — 'at_gesture' is gone with the gesture mechanism)
 *   • Enterprise (Infinity caseLimit) is exempt
 *
 * Layer 2 — Pure-math verification of the boundary conditions on the
 *   three concrete plans (Basic 10+1, Pro 50+5, Enterprise ∞+0).
 *
 * Companion: docs/specs/QUOTA-BLOCKED-CASES-SPEC.md §5.1 + §11.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PLANS, type PlanId } from '$lib/config/billing';

const ROUTE_PATH = resolve('src/routes/api/evaluate-and-persist/+server.ts');

describe('QBC — case-limit warn-level + quota-blocked branching', () => {
	const src = readFileSync(ROUTE_PATH, 'utf-8');

	// ── Layer 1: source-pattern locks on the new structure ──────────────

	describe('evaluate-and-persist — case-limit block structure (post-QBC)', () => {
		const blockMatch = src.match(/\/\/ 5b\. Case limit gate[\s\S]+?\} catch \(limitErr\) \{/);

		it('case-limit block is present', () => {
			expect(
				blockMatch,
				'Case-limit block missing from evaluate-and-persist — gate has been removed or refactored'
			).not.toBeNull();
		});

		const block = blockMatch?.[0] ?? '';

		it("returns 'quota_buffer_available' code when buffer has space", () => {
			expect(block).toMatch(/code:\s*['"]quota_buffer_available['"]/);
		});

		it("returns 'quota_fully_exhausted' code when buffer is full", () => {
			expect(block).toMatch(/code:\s*['"]quota_fully_exhausted['"]/);
		});

		it("warn ladder has ONE level — 'approaching' only ('at_gesture' retired)", () => {
			// USAGE shape per Pitfall #66 — match the warn_level value
			// assignment shape, not the bare word "approaching" (which
			// could trip on doc comments).
			expect(block).toMatch(/warn_level:\s*['"]approaching['"]/);
			expect(block).not.toMatch(/warn_level:\s*['"]at_gesture['"]/);
		});

		it('80% threshold uses Math.ceil(planLimit * 0.8) — locked at 80', () => {
			expect(block).toMatch(/Math\.ceil\(\s*planLimit\s*\*\s*0\.8\s*\)/);
		});

		it('Enterprise (Infinity caseLimit) is exempt from exhaustion + warn ladder', () => {
			expect(block).toMatch(/planLimit !== Infinity/);
		});

		it("hard-limit math no longer uses the gesture rule (no 'planLimit + 1')", () => {
			// Negative-check per Pitfall #66 — usage shape. The gesture
			// mechanism (hardLimit = planLimit + 1) is retired; the new
			// model is exhaustion at `activeCount >= planLimit` and
			// buffer at `blockedCount < saveBuffer`.
			expect(block).not.toMatch(/planLimit \+ 1/);
			expect(block).not.toMatch(/hardLimit\s*=\s*planLimit/);
		});

		it('save_to_buffer query param is honored on the request body', () => {
			expect(block).toMatch(/req\.save_to_buffer/);
		});

		it('reads PLANS[planId].saveBuffer for buffer capacity', () => {
			expect(block).toMatch(/PLANS\[planId\]\.saveBuffer/);
		});

		it('returns next_cycle_at on both quota 402 codes', () => {
			expect(block).toMatch(/next_cycle_at:/);
		});
	});

	// ── Layer 2: pure-math boundary verification (new model) ─────────────

	describe('warn-level + exhaustion boundaries — pure-math replica', () => {
		type Outcome =
			| 'none'
			| 'approaching'
			| 'buffer_available'
			| 'fully_exhausted';

		function decideOutcome(
			planId: PlanId,
			activeCount: number,
			blockedCount: number
		): Outcome {
			const { caseLimit, saveBuffer } = PLANS[planId];
			const isExhausted = caseLimit !== Infinity && activeCount >= caseLimit;
			if (isExhausted) {
				return blockedCount >= saveBuffer ? 'fully_exhausted' : 'buffer_available';
			}
			if (caseLimit === Infinity) return 'none';
			const postCreateCount = activeCount + 1;
			if (postCreateCount >= Math.ceil(caseLimit * 0.8)) return 'approaching';
			return 'none';
		}

		// Basic — caseLimit 10, saveBuffer 1
		it('Basic at 7 active → approaching (post-create 8 = 80% threshold)', () => {
			expect(decideOutcome('basic', 7, 0)).toBe('approaching');
		});

		it('Basic at 9 active → approaching (post-create 10 = exact cap, still under)', () => {
			expect(decideOutcome('basic', 9, 0)).toBe('approaching');
		});

		it('Basic at 10 active + 0 blocked → buffer_available (exhausted, buffer empty)', () => {
			expect(decideOutcome('basic', 10, 0)).toBe('buffer_available');
		});

		it('Basic at 10 active + 1 blocked → fully_exhausted (buffer at 1/1 capacity)', () => {
			expect(decideOutcome('basic', 10, 1)).toBe('fully_exhausted');
		});

		// Pro — caseLimit 50, saveBuffer 5
		it('Pro at 50 active + 0 blocked → buffer_available (exhausted, 5 slots free)', () => {
			expect(decideOutcome('pro', 50, 0)).toBe('buffer_available');
		});

		it('Pro at 50 active + 4 blocked → buffer_available (1 slot left)', () => {
			expect(decideOutcome('pro', 50, 4)).toBe('buffer_available');
		});

		it('Pro at 50 active + 5 blocked → fully_exhausted (buffer full)', () => {
			expect(decideOutcome('pro', 50, 5)).toBe('fully_exhausted');
		});

		// Enterprise — caseLimit Infinity, saveBuffer 0 (N/A)
		it('Enterprise at any active count → none (Infinity cap never exhausts)', () => {
			expect(decideOutcome('enterprise', 0, 0)).toBe('none');
			expect(decideOutcome('enterprise', 10_000, 0)).toBe('none');
		});

		// Per-plan saveBuffer config integrity
		it('Basic.saveBuffer = 1 per spec §2.1', () => {
			expect(PLANS.basic.saveBuffer).toBe(1);
		});

		it('Pro.saveBuffer = 5 per spec §2.1', () => {
			expect(PLANS.pro.saveBuffer).toBe(5);
		});

		it('Enterprise.saveBuffer = 0 (N/A — buffer concept does not apply)', () => {
			expect(PLANS.enterprise.saveBuffer).toBe(0);
		});
	});
});
