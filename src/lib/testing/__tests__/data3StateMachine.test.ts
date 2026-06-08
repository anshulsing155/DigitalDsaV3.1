/**
 * DATA-3 — Pure state-machine transitions.
 *
 * Every transition arrow in docs/specs/DATA-3-FILE-DELETION-SPEC.md §4 must
 * have at least one passing assertion here. Invalid transitions return the
 * current status unchanged — verified by negative cases per state.
 */

import { describe, it, expect } from 'vitest';
import { nextStatus, isTerminal, isDeletionEligible } from '$lib/server/data3/stateMachine';
import type { ExtractionStatus, ExtractionEvent } from '$lib/server/data3/types';

describe('nextStatus — extraction lifecycle', () => {
	it('uploaded → extracting on extractionStarted', () => {
		expect(nextStatus('uploaded', { type: 'extractionStarted' })).toBe('extracting');
	});

	it('failed → extracting on extractionStarted (retry path)', () => {
		expect(nextStatus('failed', { type: 'extractionStarted' })).toBe('extracting');
	});

	it('extracting → extracted on high-confidence completion', () => {
		expect(
			nextStatus('extracting', {
				type: 'extractionCompleted',
				confidence: 0.92,
				allRequiredFieldsPresent: true
			})
		).toBe('extracted');
	});

	it('extracting → partial when fields are incomplete', () => {
		expect(
			nextStatus('extracting', {
				type: 'extractionCompleted',
				confidence: 0.95,
				allRequiredFieldsPresent: false
			})
		).toBe('partial');
	});

	it('extracting → partial when confidence falls below 0.85', () => {
		expect(
			nextStatus('extracting', {
				type: 'extractionCompleted',
				confidence: 0.80,
				allRequiredFieldsPresent: true
			})
		).toBe('partial');
	});

	it('extracting → failed on extractionFailed', () => {
		expect(nextStatus('extracting', { type: 'extractionFailed', error: 'LLM 500' })).toBe(
			'failed'
		);
	});

	it('uploaded ignores extractionCompleted (not in flight)', () => {
		expect(
			nextStatus('uploaded', {
				type: 'extractionCompleted',
				confidence: 0.99,
				allRequiredFieldsPresent: true
			})
		).toBe('uploaded');
	});
});

describe('nextStatus — DSA review', () => {
	it('extracted → verified on dsaConfirmed', () => {
		expect(nextStatus('extracted', { type: 'dsaConfirmed' })).toBe('verified');
	});

	it('partial → verified on dsaConfirmed (DSA accepts gaps)', () => {
		expect(nextStatus('partial', { type: 'dsaConfirmed' })).toBe('verified');
	});

	it('failed → verified on dsaConfirmed (DSA accepts failure, will re-upload later)', () => {
		expect(nextStatus('failed', { type: 'dsaConfirmed' })).toBe('verified');
	});

	it('extracted → verified on autoVerifyFloorElapsed', () => {
		expect(nextStatus('extracted', { type: 'autoVerifyFloorElapsed' })).toBe('verified');
	});

	it('partial does NOT auto-verify (needs explicit DSA action)', () => {
		expect(nextStatus('partial', { type: 'autoVerifyFloorElapsed' })).toBe('partial');
	});

	it('dsaOptOut from any pre-deletion state → retained_indefinite', () => {
		const preDeletion: ExtractionStatus[] = [
			'uploaded',
			'extracting',
			'extracted',
			'partial',
			'failed',
			'verified'
		];
		for (const s of preDeletion) {
			expect(nextStatus(s, { type: 'dsaOptOut' })).toBe('retained_indefinite');
		}
	});

	it('dsaOptOut on a row already in deletion_pending does NOT regress to retained_indefinite', () => {
		// Once the sweep has picked it up the cancel window is closed.
		expect(nextStatus('deletion_pending', { type: 'dsaOptOut' })).toBe('deletion_pending');
	});
});

describe('nextStatus — deletion lifecycle', () => {
	it('verified → deletion_pending on verifyGatePassed', () => {
		expect(nextStatus('verified', { type: 'verifyGatePassed' })).toBe('deletion_pending');
	});

	it('extracted ignores verifyGatePassed (DSA confirm first)', () => {
		expect(nextStatus('extracted', { type: 'verifyGatePassed' })).toBe('extracted');
	});

	it('deletion_pending → deletion_in_flight on deletionStarted', () => {
		expect(nextStatus('deletion_pending', { type: 'deletionStarted' })).toBe(
			'deletion_in_flight'
		);
	});

	it('deletion_failed → deletion_in_flight on retry (deletionStarted)', () => {
		expect(nextStatus('deletion_failed', { type: 'deletionStarted' })).toBe(
			'deletion_in_flight'
		);
	});

	it('deletion_in_flight → deleted on deletionSucceeded', () => {
		expect(nextStatus('deletion_in_flight', { type: 'deletionSucceeded' })).toBe('deleted');
	});

	it('deletion_in_flight → deletion_failed on deletionFailed', () => {
		expect(nextStatus('deletion_in_flight', { type: 'deletionFailed' })).toBe(
			'deletion_failed'
		);
	});

	it('deletion_failed → deletion_abandoned after retries exhausted', () => {
		expect(nextStatus('deletion_failed', { type: 'deletionAbandoned' })).toBe(
			'deletion_abandoned'
		);
	});
});

describe('nextStatus — terminal states ignore all events', () => {
	const events: ExtractionEvent[] = [
		{ type: 'extractionStarted' },
		{
			type: 'extractionCompleted',
			confidence: 0.99,
			allRequiredFieldsPresent: true
		},
		{ type: 'dsaConfirmed' },
		{ type: 'dsaOptOut' },
		{ type: 'verifyGatePassed' },
		{ type: 'deletionStarted' },
		{ type: 'deletionSucceeded' }
	];

	it('deleted is terminal — every event leaves status unchanged', () => {
		for (const evt of events) {
			expect(nextStatus('deleted', evt)).toBe('deleted');
		}
	});

	it('deletion_abandoned is terminal — every event leaves status unchanged', () => {
		for (const evt of events) {
			expect(nextStatus('deletion_abandoned', evt)).toBe('deletion_abandoned');
		}
	});

	it('retained_indefinite is terminal w.r.t. v1 state machine', () => {
		for (const evt of events) {
			expect(nextStatus('retained_indefinite', evt)).toBe('retained_indefinite');
		}
	});
});

describe('isTerminal', () => {
	it('returns true for terminal states only', () => {
		expect(isTerminal('deleted')).toBe(true);
		expect(isTerminal('deletion_abandoned')).toBe(true);
		expect(isTerminal('retained_indefinite')).toBe(true);
	});

	it('returns false for transient states', () => {
		const transient: ExtractionStatus[] = [
			'uploaded',
			'extracting',
			'extracted',
			'partial',
			'failed',
			'verified',
			'deletion_pending',
			'deletion_in_flight',
			'deletion_failed'
		];
		for (const s of transient) {
			expect(isTerminal(s)).toBe(false);
		}
	});
});

describe('isDeletionEligible', () => {
	it('marks only verified / deletion_pending / deletion_failed as eligible', () => {
		expect(isDeletionEligible('verified')).toBe(true);
		expect(isDeletionEligible('deletion_pending')).toBe(true);
		expect(isDeletionEligible('deletion_failed')).toBe(true);
	});

	it('excludes pre-verified states', () => {
		expect(isDeletionEligible('uploaded')).toBe(false);
		expect(isDeletionEligible('extracting')).toBe(false);
		expect(isDeletionEligible('extracted')).toBe(false);
		expect(isDeletionEligible('partial')).toBe(false);
		expect(isDeletionEligible('failed')).toBe(false);
	});

	it('excludes terminal states', () => {
		expect(isDeletionEligible('deleted')).toBe(false);
		expect(isDeletionEligible('deletion_abandoned')).toBe(false);
		expect(isDeletionEligible('retained_indefinite')).toBe(false);
	});

	it('excludes deletion_in_flight (already underway, do not re-queue)', () => {
		expect(isDeletionEligible('deletion_in_flight')).toBe(false);
	});
});
