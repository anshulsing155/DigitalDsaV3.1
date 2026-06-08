import { describe, it, expect } from 'vitest';
import {
	canTransitionTo,
	getAvailableTransitions,
	validateTransition,
	canLenderTransitionTo,
	getAvailableLenderTransitions,
	validateLenderTransition,
	ALLOWED_STAGE_TRANSITIONS,
	ALLOWED_LENDER_STATUS_TRANSITIONS
} from '$lib/server/stagePipeline';
import type { CaseStage, LenderAppStatus } from '$lib/types/case';

// ═══════════════════════════════════════════════════════════════
// canTransitionTo — case stage transitions
// ═══════════════════════════════════════════════════════════════

describe('canTransitionTo — case stage transitions', () => {
	it('intake → profiling: true', () => {
		expect(canTransitionTo('intake', 'profiling')).toBe(true);
	});

	it('intake → dropped: true', () => {
		expect(canTransitionTo('intake', 'dropped')).toBe(true);
	});

	it('intake → submitted: false (cannot skip stages)', () => {
		expect(canTransitionTo('intake', 'submitted')).toBe(false);
	});

	it('intake → closed: false', () => {
		expect(canTransitionTo('intake', 'closed')).toBe(false);
	});

	it('profiling → file_building: true', () => {
		expect(canTransitionTo('profiling', 'file_building')).toBe(true);
	});

	it('profiling → dropped: true', () => {
		expect(canTransitionTo('profiling', 'dropped')).toBe(true);
	});

	it('file_building → submitted: true', () => {
		expect(canTransitionTo('file_building', 'submitted')).toBe(true);
	});

	it('submitted → processing: true', () => {
		expect(canTransitionTo('submitted', 'processing')).toBe(true);
	});

	it('submitted → rejected: true', () => {
		expect(canTransitionTo('submitted', 'rejected')).toBe(true);
	});

	it('processing → sanctioned: true', () => {
		expect(canTransitionTo('processing', 'sanctioned')).toBe(true);
	});

	it('processing → query: true', () => {
		expect(canTransitionTo('processing', 'query')).toBe(true);
	});

	it('processing → rejected: true', () => {
		expect(canTransitionTo('processing', 'rejected')).toBe(true);
	});

	it('query → processing: true (after query resolved)', () => {
		expect(canTransitionTo('query', 'processing')).toBe(true);
	});

	it('query → rejected: true', () => {
		expect(canTransitionTo('query', 'rejected')).toBe(true);
	});

	it('sanctioned → disbursed: true', () => {
		expect(canTransitionTo('sanctioned', 'disbursed')).toBe(true);
	});

	it('sanctioned → dropped: true', () => {
		expect(canTransitionTo('sanctioned', 'dropped')).toBe(true);
	});

	it('disbursed → closed: true', () => {
		expect(canTransitionTo('disbursed', 'closed')).toBe(true);
	});

	it('disbursed → intake: false', () => {
		expect(canTransitionTo('disbursed', 'intake')).toBe(false);
	});

	it('closed → anything: false (terminal state)', () => {
		const allStages: CaseStage[] = [
			'intake',
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
		for (const target of allStages) {
			expect(canTransitionTo('closed', target), `closed → ${target} should be false`).toBe(false);
		}
	});

	it('rejected → intake: true (restart)', () => {
		expect(canTransitionTo('rejected', 'intake')).toBe(true);
	});

	it('rejected → profiling: false (can only restart to intake)', () => {
		expect(canTransitionTo('rejected', 'profiling')).toBe(false);
	});

	it('dropped → intake: true (reactivate)', () => {
		expect(canTransitionTo('dropped', 'intake')).toBe(true);
	});

	it('dropped → profiling: false (can only restart to intake)', () => {
		expect(canTransitionTo('dropped', 'profiling')).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// getAvailableTransitions — case stages
// ═══════════════════════════════════════════════════════════════

describe('getAvailableTransitions — case stages', () => {
	it('intake returns [profiling, dropped]', () => {
		const transitions = getAvailableTransitions('intake');
		expect(transitions).toEqual(['profiling', 'dropped']);
	});

	it('profiling returns [file_building, dropped]', () => {
		const transitions = getAvailableTransitions('profiling');
		expect(transitions).toEqual(['file_building', 'dropped']);
	});

	it('file_building returns [submitted, dropped]', () => {
		const transitions = getAvailableTransitions('file_building');
		expect(transitions).toEqual(['submitted', 'dropped']);
	});

	it('submitted returns [processing, rejected, dropped]', () => {
		const transitions = getAvailableTransitions('submitted');
		expect(transitions).toEqual(['processing', 'rejected', 'dropped']);
	});

	it('processing returns [query, sanctioned, rejected]', () => {
		const transitions = getAvailableTransitions('processing');
		expect(transitions).toEqual(['query', 'sanctioned', 'rejected']);
	});

	it('query returns [processing, rejected]', () => {
		const transitions = getAvailableTransitions('query');
		expect(transitions).toEqual(['processing', 'rejected']);
	});

	it('sanctioned returns [disbursed, dropped]', () => {
		const transitions = getAvailableTransitions('sanctioned');
		expect(transitions).toEqual(['disbursed', 'dropped']);
	});

	it('disbursed returns [closed]', () => {
		const transitions = getAvailableTransitions('disbursed');
		expect(transitions).toEqual(['closed']);
	});

	it('rejected returns [intake]', () => {
		const transitions = getAvailableTransitions('rejected');
		expect(transitions).toEqual(['intake']);
	});

	it('dropped returns [intake]', () => {
		const transitions = getAvailableTransitions('dropped');
		expect(transitions).toEqual(['intake']);
	});

	it('closed returns [] (terminal)', () => {
		const transitions = getAvailableTransitions('closed');
		expect(transitions).toEqual([]);
	});
});

// ═══════════════════════════════════════════════════════════════
// validateTransition — case stages
// ═══════════════════════════════════════════════════════════════

describe('validateTransition — case stages', () => {
	it('valid transition returns { valid: true }', () => {
		const result = validateTransition('intake', 'profiling');
		expect(result).toEqual({ valid: true });
	});

	it('invalid transition returns { valid: false } with error containing allowed transitions', () => {
		const result = validateTransition('intake', 'sanctioned');
		expect(result.valid).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toContain('intake');
		expect(result.error).toContain('sanctioned');
		expect(result.error).toContain('profiling');
		expect(result.error).toContain('dropped');
	});

	it('same-stage transition returns error', () => {
		const result = validateTransition('processing', 'processing');
		expect(result.valid).toBe(false);
		expect(result.error).toContain('already in stage');
	});

	it('terminal stage returns error mentioning "none (terminal stage)"', () => {
		const result = validateTransition('closed', 'intake');
		expect(result.valid).toBe(false);
		expect(result.error).toContain('none (terminal stage)');
	});

	it('valid transition from rejected to intake', () => {
		const result = validateTransition('rejected', 'intake');
		expect(result).toEqual({ valid: true });
	});

	it('valid transition from dropped to intake', () => {
		const result = validateTransition('dropped', 'intake');
		expect(result).toEqual({ valid: true });
	});

	it('invalid transition from rejected to profiling includes allowed list', () => {
		const result = validateTransition('rejected', 'profiling');
		expect(result.valid).toBe(false);
		expect(result.error).toContain('intake');
	});
});

// ═══════════════════════════════════════════════════════════════
// ALLOWED_STAGE_TRANSITIONS — structural integrity
// ═══════════════════════════════════════════════════════════════

describe('ALLOWED_STAGE_TRANSITIONS — structural integrity', () => {
	const allStages: CaseStage[] = [
		'intake',
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

	it('has an entry for every stage', () => {
		for (const stage of allStages) {
			expect(ALLOWED_STAGE_TRANSITIONS).toHaveProperty(stage);
			expect(Array.isArray(ALLOWED_STAGE_TRANSITIONS[stage])).toBe(true);
		}
	});

	it('all target stages in transition lists are valid stages', () => {
		for (const stage of allStages) {
			for (const target of ALLOWED_STAGE_TRANSITIONS[stage]) {
				expect(allStages, `target "${target}" from "${stage}" is not a valid stage`).toContain(
					target
				);
			}
		}
	});

	it('no stage transitions to itself', () => {
		for (const stage of allStages) {
			expect(
				ALLOWED_STAGE_TRANSITIONS[stage],
				`stage "${stage}" should not transition to itself`
			).not.toContain(stage);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// canLenderTransitionTo — lender status transitions
// ═══════════════════════════════════════════════════════════════

describe('canLenderTransitionTo — lender status transitions', () => {
	it('selected → file_building: true', () => {
		expect(canLenderTransitionTo('selected', 'file_building')).toBe(true);
	});

	it('selected → withdrawn: true', () => {
		expect(canLenderTransitionTo('selected', 'withdrawn')).toBe(true);
	});

	it('selected → sanctioned: false (cannot skip)', () => {
		expect(canLenderTransitionTo('selected', 'sanctioned')).toBe(false);
	});

	it('selected → disbursed: false (cannot skip)', () => {
		expect(canLenderTransitionTo('selected', 'disbursed')).toBe(false);
	});

	it('file_building → ready: true', () => {
		expect(canLenderTransitionTo('file_building', 'ready')).toBe(true);
	});

	it('file_building → withdrawn: true', () => {
		expect(canLenderTransitionTo('file_building', 'withdrawn')).toBe(true);
	});

	it('ready → submitted: true', () => {
		expect(canLenderTransitionTo('ready', 'submitted')).toBe(true);
	});

	it('submitted → processing: true', () => {
		expect(canLenderTransitionTo('submitted', 'processing')).toBe(true);
	});

	it('submitted → rejected: true', () => {
		expect(canLenderTransitionTo('submitted', 'rejected')).toBe(true);
	});

	it('processing → query: true', () => {
		expect(canLenderTransitionTo('processing', 'query')).toBe(true);
	});

	it('processing → sanctioned: true', () => {
		expect(canLenderTransitionTo('processing', 'sanctioned')).toBe(true);
	});

	it('query → query_responded: true', () => {
		expect(canLenderTransitionTo('query', 'query_responded')).toBe(true);
	});

	it('query_responded → processing: true', () => {
		expect(canLenderTransitionTo('query_responded', 'processing')).toBe(true);
	});

	it('sanctioned → disbursed: true', () => {
		expect(canLenderTransitionTo('sanctioned', 'disbursed')).toBe(true);
	});

	it('sanctioned → withdrawn: true', () => {
		expect(canLenderTransitionTo('sanctioned', 'withdrawn')).toBe(true);
	});

	// Terminal states
	it('disbursed → anything: false (terminal)', () => {
		const allStatuses: LenderAppStatus[] = [
			'selected',
			'file_building',
			'ready',
			'submitted',
			'processing',
			'query',
			'query_responded',
			'sanctioned',
			'disbursed',
			'rejected',
			'withdrawn'
		];
		for (const target of allStatuses) {
			expect(
				canLenderTransitionTo('disbursed', target),
				`disbursed → ${target} should be false`
			).toBe(false);
		}
	});

	it('rejected → anything: false (terminal)', () => {
		const allStatuses: LenderAppStatus[] = [
			'selected',
			'file_building',
			'ready',
			'submitted',
			'processing',
			'query',
			'query_responded',
			'sanctioned',
			'disbursed',
			'rejected',
			'withdrawn'
		];
		for (const target of allStatuses) {
			expect(
				canLenderTransitionTo('rejected', target),
				`rejected → ${target} should be false`
			).toBe(false);
		}
	});

	it('withdrawn → anything: false (terminal)', () => {
		const allStatuses: LenderAppStatus[] = [
			'selected',
			'file_building',
			'ready',
			'submitted',
			'processing',
			'query',
			'query_responded',
			'sanctioned',
			'disbursed',
			'rejected',
			'withdrawn'
		];
		for (const target of allStatuses) {
			expect(
				canLenderTransitionTo('withdrawn', target),
				`withdrawn → ${target} should be false`
			).toBe(false);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// getAvailableLenderTransitions
// ═══════════════════════════════════════════════════════════════

describe('getAvailableLenderTransitions', () => {
	it('selected returns [file_building, withdrawn]', () => {
		expect(getAvailableLenderTransitions('selected')).toEqual(['file_building', 'withdrawn']);
	});

	it('file_building returns [ready, withdrawn]', () => {
		expect(getAvailableLenderTransitions('file_building')).toEqual(['ready', 'withdrawn']);
	});

	it('ready returns [submitted, withdrawn]', () => {
		expect(getAvailableLenderTransitions('ready')).toEqual(['submitted', 'withdrawn']);
	});

	it('submitted returns [processing, rejected, withdrawn]', () => {
		expect(getAvailableLenderTransitions('submitted')).toEqual([
			'processing',
			'rejected',
			'withdrawn'
		]);
	});

	it('processing returns [query, sanctioned, rejected]', () => {
		expect(getAvailableLenderTransitions('processing')).toEqual([
			'query',
			'sanctioned',
			'rejected'
		]);
	});

	it('query returns [query_responded]', () => {
		expect(getAvailableLenderTransitions('query')).toEqual(['query_responded']);
	});

	it('query_responded returns [processing, rejected]', () => {
		expect(getAvailableLenderTransitions('query_responded')).toEqual(['processing', 'rejected']);
	});

	it('sanctioned returns [disbursed, withdrawn]', () => {
		expect(getAvailableLenderTransitions('sanctioned')).toEqual(['disbursed', 'withdrawn']);
	});

	it('disbursed returns [] (terminal)', () => {
		expect(getAvailableLenderTransitions('disbursed')).toEqual([]);
	});

	it('rejected returns [] (terminal)', () => {
		expect(getAvailableLenderTransitions('rejected')).toEqual([]);
	});

	it('withdrawn returns [] (terminal)', () => {
		expect(getAvailableLenderTransitions('withdrawn')).toEqual([]);
	});
});

// ═══════════════════════════════════════════════════════════════
// validateLenderTransition
// ═══════════════════════════════════════════════════════════════

describe('validateLenderTransition', () => {
	it('valid transition returns { valid: true }', () => {
		const result = validateLenderTransition('selected', 'file_building');
		expect(result).toEqual({ valid: true });
	});

	it('invalid transition returns { valid: false } with error', () => {
		const result = validateLenderTransition('selected', 'sanctioned');
		expect(result.valid).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toContain('selected');
		expect(result.error).toContain('sanctioned');
	});

	it('same-status transition returns error', () => {
		const result = validateLenderTransition('processing', 'processing');
		expect(result.valid).toBe(false);
		expect(result.error).toContain('already in status');
	});

	it('terminal status returns error mentioning "none (terminal status)"', () => {
		const result = validateLenderTransition('disbursed', 'selected');
		expect(result.valid).toBe(false);
		expect(result.error).toContain('none (terminal status)');
	});

	it('rejected terminal returns error mentioning "none (terminal status)"', () => {
		const result = validateLenderTransition('rejected', 'selected');
		expect(result.valid).toBe(false);
		expect(result.error).toContain('none (terminal status)');
	});

	it('withdrawn terminal returns error mentioning "none (terminal status)"', () => {
		const result = validateLenderTransition('withdrawn', 'selected');
		expect(result.valid).toBe(false);
		expect(result.error).toContain('none (terminal status)');
	});
});

// ═══════════════════════════════════════════════════════════════
// ALLOWED_LENDER_STATUS_TRANSITIONS — structural integrity
// ═══════════════════════════════════════════════════════════════

describe('ALLOWED_LENDER_STATUS_TRANSITIONS — structural integrity', () => {
	const allStatuses: LenderAppStatus[] = [
		'selected',
		'file_building',
		'ready',
		'submitted',
		'processing',
		'query',
		'query_responded',
		'sanctioned',
		'disbursed',
		'rejected',
		'withdrawn'
	];

	it('has an entry for every lender status', () => {
		for (const status of allStatuses) {
			expect(ALLOWED_LENDER_STATUS_TRANSITIONS).toHaveProperty(status);
			expect(Array.isArray(ALLOWED_LENDER_STATUS_TRANSITIONS[status])).toBe(true);
		}
	});

	it('all target statuses in transition lists are valid statuses', () => {
		for (const status of allStatuses) {
			for (const target of ALLOWED_LENDER_STATUS_TRANSITIONS[status]) {
				expect(allStatuses, `target "${target}" from "${status}" is not a valid status`).toContain(
					target
				);
			}
		}
	});

	it('no status transitions to itself', () => {
		for (const status of allStatuses) {
			expect(
				ALLOWED_LENDER_STATUS_TRANSITIONS[status],
				`status "${status}" should not transition to itself`
			).not.toContain(status);
		}
	});

	it('all terminal states have empty transition arrays', () => {
		const terminalStatuses: LenderAppStatus[] = ['disbursed', 'rejected', 'withdrawn'];
		for (const status of terminalStatuses) {
			expect(
				ALLOWED_LENDER_STATUS_TRANSITIONS[status],
				`terminal status "${status}" should have empty transitions`
			).toEqual([]);
		}
	});
});
