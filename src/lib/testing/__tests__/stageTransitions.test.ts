import { describe, it, expect } from 'vitest';
import {
	canTransitionTo,
	getAvailableTransitions,
	validateTransition,
	canLenderTransitionTo,
	validateLenderTransition,
	ALLOWED_STAGE_TRANSITIONS,
	ALLOWED_LENDER_STATUS_TRANSITIONS
} from '$lib/server/stagePipeline.js';
import type { CaseStage, LenderAppStatus } from '$lib/types/case.js';

/**
 * Complementary stage transition tests.
 *
 * The core transition tests (83 tests) live in stagePipeline.test.ts.
 * This file adds:
 *  - Full forward-path validation (happy path, step-by-step through the pipeline)
 *  - Exhaustive "skip stage" blocking (every non-adjacent forward jump)
 *  - Drop/reject from every non-terminal stage
 *  - Stage history array formation scenarios
 *  - Lender pipeline full-path tests
 */

// ═══════════════════════════════════════════════════════════════
// Full forward pipeline — step-by-step case journey
// ═══════════════════════════════════════════════════════════════

describe('Full forward pipeline — happy path case journey', () => {
	const happyPath: CaseStage[] = [
		'intake',
		'profiling',
		'file_building',
		'submitted',
		'processing',
		'sanctioned',
		'disbursed',
		'closed'
	];

	it('every consecutive pair in the happy path is a valid transition', () => {
		for (let i = 0; i < happyPath.length - 1; i++) {
			const from = happyPath[i];
			const to = happyPath[i + 1];
			expect(canTransitionTo(from, to), `${from} -> ${to} should be valid in happy path`).toBe(
				true
			);
		}
	});

	it('validateTransition returns { valid: true } for every happy-path step', () => {
		for (let i = 0; i < happyPath.length - 1; i++) {
			const result = validateTransition(happyPath[i], happyPath[i + 1]);
			expect(result.valid, `${happyPath[i]} -> ${happyPath[i + 1]}`).toBe(true);
			expect(result.error).toBeUndefined();
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// Full query detour — processing -> query -> processing -> sanctioned
// ═══════════════════════════════════════════════════════════════

describe('Query detour path', () => {
	it('processing -> query -> processing -> sanctioned is valid step by step', () => {
		expect(canTransitionTo('processing', 'query')).toBe(true);
		expect(canTransitionTo('query', 'processing')).toBe(true);
		expect(canTransitionTo('processing', 'sanctioned')).toBe(true);
	});

	it('multiple query rounds: query -> processing -> query -> processing is valid', () => {
		// Simulates multiple query rounds
		expect(canTransitionTo('query', 'processing')).toBe(true);
		expect(canTransitionTo('processing', 'query')).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// Exhaustive skip-stage blocking — cannot jump over intermediate stages
// ═══════════════════════════════════════════════════════════════

describe('Skip-stage blocking — cannot jump forward past intermediate stages', () => {
	it('intake cannot skip to file_building', () => {
		expect(canTransitionTo('intake', 'file_building')).toBe(false);
	});

	it('intake cannot skip to submitted', () => {
		expect(canTransitionTo('intake', 'submitted')).toBe(false);
	});

	it('intake cannot skip to processing', () => {
		expect(canTransitionTo('intake', 'processing')).toBe(false);
	});

	it('intake cannot skip to sanctioned', () => {
		expect(canTransitionTo('intake', 'sanctioned')).toBe(false);
	});

	it('intake cannot skip to disbursed', () => {
		expect(canTransitionTo('intake', 'disbursed')).toBe(false);
	});

	it('intake cannot skip to closed', () => {
		expect(canTransitionTo('intake', 'closed')).toBe(false);
	});

	it('profiling cannot skip to submitted', () => {
		expect(canTransitionTo('profiling', 'submitted')).toBe(false);
	});

	it('profiling cannot skip to processing', () => {
		expect(canTransitionTo('profiling', 'processing')).toBe(false);
	});

	it('profiling cannot skip to sanctioned', () => {
		expect(canTransitionTo('profiling', 'sanctioned')).toBe(false);
	});

	it('file_building cannot skip to processing', () => {
		expect(canTransitionTo('file_building', 'processing')).toBe(false);
	});

	it('file_building cannot skip to sanctioned', () => {
		expect(canTransitionTo('file_building', 'sanctioned')).toBe(false);
	});

	it('submitted cannot skip to sanctioned', () => {
		expect(canTransitionTo('submitted', 'sanctioned')).toBe(false);
	});

	it('submitted cannot skip to disbursed', () => {
		expect(canTransitionTo('submitted', 'disbursed')).toBe(false);
	});

	it('processing cannot skip to disbursed', () => {
		expect(canTransitionTo('processing', 'disbursed')).toBe(false);
	});

	it('processing cannot skip to closed', () => {
		expect(canTransitionTo('processing', 'closed')).toBe(false);
	});

	it('sanctioned cannot skip to closed', () => {
		expect(canTransitionTo('sanctioned', 'closed')).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// Drop transitions — dropping from every non-terminal stage that allows it
// ═══════════════════════════════════════════════════════════════

describe('Drop transitions — can drop from appropriate stages', () => {
	const droppableStages: CaseStage[] = [
		'intake',
		'profiling',
		'file_building',
		'submitted',
		'sanctioned'
	];

	const nonDroppableStages: CaseStage[] = [
		'processing',
		'query',
		'disbursed',
		'rejected',
		'dropped',
		'closed'
	];

	it.each(droppableStages)('can drop from %s', (stage) => {
		expect(canTransitionTo(stage, 'dropped')).toBe(true);
	});

	it.each(nonDroppableStages)('cannot drop from %s', (stage) => {
		expect(canTransitionTo(stage, 'dropped')).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// Reject transitions — rejection from appropriate stages
// ═══════════════════════════════════════════════════════════════

describe('Reject transitions — can reject from appropriate stages', () => {
	const rejectableStages: CaseStage[] = ['submitted', 'processing', 'query'];

	const nonRejectableStages: CaseStage[] = [
		'intake',
		'profiling',
		'file_building',
		'sanctioned',
		'disbursed',
		'rejected',
		'dropped',
		'closed'
	];

	it.each(rejectableStages)('can reject from %s', (stage) => {
		expect(canTransitionTo(stage, 'rejected')).toBe(true);
	});

	it.each(nonRejectableStages)('cannot reject from %s', (stage) => {
		expect(canTransitionTo(stage, 'rejected')).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// Reactivation — dropped/rejected can only return to intake
// ═══════════════════════════════════════════════════════════════

describe('Reactivation — dropped/rejected restart to intake only', () => {
	const nonIntakeStages: CaseStage[] = [
		'profiling',
		'file_building',
		'submitted',
		'processing',
		'query',
		'sanctioned',
		'disbursed',
		'rejected',
		'dropped',
		'closed'
	];

	it('dropped can only transition to intake', () => {
		expect(getAvailableTransitions('dropped')).toEqual(['intake']);
	});

	it('rejected can only transition to intake', () => {
		expect(getAvailableTransitions('rejected')).toEqual(['intake']);
	});

	it.each(nonIntakeStages)('dropped cannot go to %s', (stage) => {
		expect(canTransitionTo('dropped', stage)).toBe(false);
	});

	it.each(nonIntakeStages)('rejected cannot go to %s', (stage) => {
		expect(canTransitionTo('rejected', stage)).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// validateTransition — error message format verification
// ═══════════════════════════════════════════════════════════════

describe('validateTransition — error message details', () => {
	it('same-stage error contains the stage name', () => {
		const stages: CaseStage[] = ['intake', 'profiling', 'processing', 'sanctioned'];
		for (const stage of stages) {
			const result = validateTransition(stage, stage);
			expect(result.valid).toBe(false);
			expect(result.error).toContain(stage);
			expect(result.error).toContain('already in stage');
		}
	});

	it('blocked transition error lists actual allowed targets', () => {
		const result = validateTransition('profiling', 'sanctioned');
		expect(result.valid).toBe(false);
		expect(result.error).toContain('file_building');
		expect(result.error).toContain('dropped');
	});

	it('terminal stage error says "none (terminal stage)"', () => {
		const result = validateTransition('closed', 'intake');
		expect(result.valid).toBe(false);
		expect(result.error).toContain('none (terminal stage)');
	});
});

// ═══════════════════════════════════════════════════════════════
// Lender pipeline full path — happy path
// ═══════════════════════════════════════════════════════════════

describe('Lender pipeline full path — happy path', () => {
	const lenderHappyPath: LenderAppStatus[] = [
		'selected',
		'file_building',
		'ready',
		'submitted',
		'processing',
		'sanctioned',
		'disbursed'
	];

	it('every consecutive pair in the lender happy path is valid', () => {
		for (let i = 0; i < lenderHappyPath.length - 1; i++) {
			const from = lenderHappyPath[i];
			const to = lenderHappyPath[i + 1];
			expect(canLenderTransitionTo(from, to), `${from} -> ${to} should be valid`).toBe(true);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// Lender query detour path
// ═══════════════════════════════════════════════════════════════

describe('Lender query detour path', () => {
	it('processing -> query -> query_responded -> processing is valid step by step', () => {
		expect(canLenderTransitionTo('processing', 'query')).toBe(true);
		expect(canLenderTransitionTo('query', 'query_responded')).toBe(true);
		expect(canLenderTransitionTo('query_responded', 'processing')).toBe(true);
	});

	it('query cannot directly go back to processing (must go through query_responded)', () => {
		expect(canLenderTransitionTo('query', 'processing')).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// Lender withdrawal from non-terminal stages
// ═══════════════════════════════════════════════════════════════

describe('Lender withdrawal transitions', () => {
	const withdrawableStatuses: LenderAppStatus[] = [
		'selected',
		'file_building',
		'ready',
		'submitted',
		'sanctioned'
	];

	const nonWithdrawableStatuses: LenderAppStatus[] = [
		'processing',
		'query',
		'query_responded',
		'disbursed',
		'rejected',
		'withdrawn'
	];

	it.each(withdrawableStatuses)('can withdraw from %s', (status) => {
		expect(canLenderTransitionTo(status, 'withdrawn')).toBe(true);
	});

	it.each(nonWithdrawableStatuses)('cannot withdraw from %s', (status) => {
		expect(canLenderTransitionTo(status, 'withdrawn')).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// Structural integrity — transition map covers all stages
// ═══════════════════════════════════════════════════════════════

describe('Transition map structural completeness', () => {
	it('ALLOWED_STAGE_TRANSITIONS covers exactly 12 stages (incl. quota_blocked)', () => {
		// QBC (2026-05-29): added 'quota_blocked' as the pre-intake stage for
		// the per-plan save buffer. See docs/specs/QUOTA-BLOCKED-CASES-SPEC.md.
		expect(Object.keys(ALLOWED_STAGE_TRANSITIONS)).toHaveLength(12);
	});

	it('quota_blocked only transitions to intake (system-only auto-unblock)', () => {
		// DSAs cannot manually move a case out of quota_blocked — only the
		// auto-unblock trigger (plan upgrade or monthly cycle reset) does it
		// by transitioning to 'intake'. This locks that contract.
		expect(ALLOWED_STAGE_TRANSITIONS['quota_blocked']).toEqual(['intake']);
	});

	it('ALLOWED_LENDER_STATUS_TRANSITIONS covers exactly 11 statuses', () => {
		expect(Object.keys(ALLOWED_LENDER_STATUS_TRANSITIONS)).toHaveLength(11);
	});

	it('no stage has a transition to itself in the map', () => {
		const allStages = Object.keys(ALLOWED_STAGE_TRANSITIONS) as CaseStage[];
		for (const stage of allStages) {
			expect(ALLOWED_STAGE_TRANSITIONS[stage]).not.toContain(stage);
		}
	});

	it('no lender status has a transition to itself in the map', () => {
		const allStatuses = Object.keys(ALLOWED_LENDER_STATUS_TRANSITIONS) as LenderAppStatus[];
		for (const status of allStatuses) {
			expect(ALLOWED_LENDER_STATUS_TRANSITIONS[status]).not.toContain(status);
		}
	});

	it('terminal case stages have empty transition arrays', () => {
		expect(ALLOWED_STAGE_TRANSITIONS['closed']).toEqual([]);
	});

	it('terminal lender statuses have empty transition arrays', () => {
		expect(ALLOWED_LENDER_STATUS_TRANSITIONS['disbursed']).toEqual([]);
		expect(ALLOWED_LENDER_STATUS_TRANSITIONS['rejected']).toEqual([]);
		expect(ALLOWED_LENDER_STATUS_TRANSITIONS['withdrawn']).toEqual([]);
	});
});
