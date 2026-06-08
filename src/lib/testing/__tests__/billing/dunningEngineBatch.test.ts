/**
 * D.1 S5 M2 — Dunning batch driver behavioral tests
 * ══════════════════════════════════════════════════════════════════
 * Behavioral coverage for processOneDunningAdvance + processDunningAdvanceBatch:
 *
 *   1. dunning_t0 at day 3 → applyTransition called with dunning_grace,
 *      audit row written, email hook fired with kind='dunning_grace'
 *   2. dunning_t0 at day 2 → no_advancement_due (no applyTransition, no email)
 *   3. dunning_grace at day 7 → escalates to dunning_final
 *   4. dunning_final at day 8 → escalates to downgraded
 *   5. paused state slipping through → skipped_paused (defensive)
 *   6. dunning_* without dunning_started_at → skipped_missing_dunning_started_at + ERROR log
 *   7. applyTransition race (returns null) → transition_race outcome, NO email
 *   8. sendEmail hook throws → state transition kept, error logged + counted
 *
 * Mongo is fully mocked (same pattern as chargeEngine.test.ts).
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type {
	BillingSubscriptionDoc,
	SubscriptionState
} from '$lib/types/billingSubscription';

// ── Mongo mocks ────────────────────────────────────────────────

const mockSubsFind = vi.fn();
const mockSubsFindOne = vi.fn();
const mockSubsFindOneAndUpdate = vi.fn();
const mockSubsUpdateOne = vi.fn();
const mockAuditInsertOne = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	BillingSubscriptions: {
		find: (...args: unknown[]) => mockSubsFind(...args),
		findOne: (...args: unknown[]) => mockSubsFindOne(...args),
		findOneAndUpdate: (...args: unknown[]) => mockSubsFindOneAndUpdate(...args),
		updateOne: (...args: unknown[]) => mockSubsUpdateOne(...args)
	},
	BillingAuditLogs: {
		insertOne: (...args: unknown[]) => mockAuditInsertOne(...args)
	},
	// Unused but required by static imports in subscriptionStore.ts
	ChargeAttempts: { findOne: vi.fn(), insertOne: vi.fn(), updateOne: vi.fn() },
	BillingTransactions: { insertOne: vi.fn() },
	ProcessedWebhookEvents: { insertOne: vi.fn() }
}));

const mockLoggerError = vi.fn();
const mockLoggerInfo = vi.fn();
const mockLoggerWarn = vi.fn();
vi.mock('$lib/server/logger', () => ({
	default: {
		info: (...args: unknown[]) => mockLoggerInfo(...args),
		warn: (...args: unknown[]) => mockLoggerWarn(...args),
		error: (...args: unknown[]) => mockLoggerError(...args),
		debug: vi.fn()
	}
}));

import {
	processOneDunningAdvance,
	processDunningAdvanceBatch
} from '$lib/server/billing/dunningEngine';

// ── Fixtures ───────────────────────────────────────────────────

const FAILURE_AT = new Date('2026-06-01T09:30:00.000Z');

function dunningSub(
	state: SubscriptionState,
	overrides: Partial<BillingSubscriptionDoc> = {}
): BillingSubscriptionDoc {
	return {
		_id: new ObjectId(),
		dsa_id: new ObjectId(),
		state,
		plan_id: 'starter',
		billing_cycle: 'monthly',
		provider: 'razorpay',
		max_amount_paise: 100000,
		dunning_started_at: FAILURE_AT,
		failed_attempt_count: 1,
		state_history: [],
		created_at: FAILURE_AT,
		updated_at: FAILURE_AT,
		...overrides
	} as BillingSubscriptionDoc;
}

const nowAt = (days: number) =>
	new Date(FAILURE_AT.getTime() + days * 24 * 3600 * 1000);

// Helper: wires applyTransition's two mongo calls so the transition
// succeeds end-to-end. findOne returns the PRE-transition doc (so the
// state precondition matches expectedFromState); findOneAndUpdate
// returns the POST-transition doc (the new state the engine sees).
function transitionSucceeds(
	pre: BillingSubscriptionDoc,
	postState: SubscriptionState
) {
	mockSubsFindOne.mockResolvedValue(pre);
	mockSubsFindOneAndUpdate.mockResolvedValue({ ...pre, state: postState });
}

beforeEach(() => {
	mockSubsFind.mockReset();
	mockSubsFindOne.mockReset();
	mockSubsFindOneAndUpdate.mockReset();
	mockSubsUpdateOne.mockReset();
	mockAuditInsertOne.mockReset().mockResolvedValue({ insertedId: new ObjectId() });
	mockLoggerError.mockReset();
	mockLoggerInfo.mockReset();
	mockLoggerWarn.mockReset();
});

// ── processOneDunningAdvance ───────────────────────────────────

describe('processOneDunningAdvance — single-row behavior', () => {
	it('escalates dunning_t0 → dunning_grace at day 3 (applyTransition + audit + email)', async () => {
		const sub = dunningSub('dunning_t0');
		transitionSucceeds(sub, 'dunning_grace');

		const sendEmail = vi.fn().mockResolvedValue(undefined);
		const result = await processOneDunningAdvance(sub, {
			now: nowAt(3),
			sendEmail
		});

		expect(result.kind).toBe('advanced');
		if (result.kind === 'advanced') {
			expect(result.from).toBe('dunning_t0');
			expect(result.to).toBe('dunning_grace');
			expect(result.daysSinceFailure).toBe(3);
		}

		// applyTransition queries the doc once + does the atomic update
		expect(mockSubsFindOne).toHaveBeenCalled();
		expect(mockSubsFindOneAndUpdate).toHaveBeenCalled();

		// Audit row written
		expect(mockAuditInsertOne).toHaveBeenCalledTimes(1);
		const auditDoc = mockAuditInsertOne.mock.calls[0][0];
		expect(auditDoc.event_class).toBe('subscription_transition');
		expect(auditDoc.event_name).toBe('dunning_t0->dunning_grace');
		expect(auditDoc.actor).toBe('cron');
		expect(auditDoc.payload.daysSinceFailure).toBe(3);

		// Email hook called with the right kind
		expect(sendEmail).toHaveBeenCalledTimes(1);
		expect(sendEmail.mock.calls[0][0]).toBe('dunning_grace');
	});

	it('no_advancement_due at day 2 — no transition, no email', async () => {
		const sub = dunningSub('dunning_t0');
		const sendEmail = vi.fn();
		const result = await processOneDunningAdvance(sub, {
			now: nowAt(2),
			sendEmail
		});

		expect(result.kind).toBe('no_advancement_due');
		expect(mockSubsFindOneAndUpdate).not.toHaveBeenCalled();
		expect(mockAuditInsertOne).not.toHaveBeenCalled();
		expect(sendEmail).not.toHaveBeenCalled();
	});

	it('escalates dunning_grace → dunning_final at day 7', async () => {
		const sub = dunningSub('dunning_grace');
		transitionSucceeds(sub, 'dunning_final');

		const sendEmail = vi.fn().mockResolvedValue(undefined);
		const result = await processOneDunningAdvance(sub, { now: nowAt(7), sendEmail });

		expect(result.kind).toBe('advanced');
		if (result.kind === 'advanced') expect(result.to).toBe('dunning_final');
		expect(sendEmail.mock.calls[0][0]).toBe('dunning_final');
	});

	it('escalates dunning_final → downgraded at day 8', async () => {
		const sub = dunningSub('dunning_final');
		transitionSucceeds(sub, 'downgraded');

		const sendEmail = vi.fn().mockResolvedValue(undefined);
		const result = await processOneDunningAdvance(sub, { now: nowAt(8), sendEmail });

		expect(result.kind).toBe('advanced');
		if (result.kind === 'advanced') expect(result.to).toBe('downgraded');
		expect(sendEmail.mock.calls[0][0]).toBe('downgraded');
	});

	it('skipped_paused if a paused doc slips through (defensive)', async () => {
		const sub = dunningSub('paused');
		const sendEmail = vi.fn();
		const result = await processOneDunningAdvance(sub, { now: nowAt(30), sendEmail });

		expect(result.kind).toBe('skipped_paused');
		expect(mockSubsFindOneAndUpdate).not.toHaveBeenCalled();
		expect(sendEmail).not.toHaveBeenCalled();
	});

	it('skipped_missing_dunning_started_at + error log on data drift', async () => {
		const sub = dunningSub('dunning_t0', { dunning_started_at: undefined });
		const sendEmail = vi.fn();
		const result = await processOneDunningAdvance(sub, { now: nowAt(30), sendEmail });

		expect(result.kind).toBe('skipped_missing_dunning_started_at');
		expect(mockLoggerError).toHaveBeenCalled();
		expect(mockSubsFindOneAndUpdate).not.toHaveBeenCalled();
		expect(sendEmail).not.toHaveBeenCalled();
	});

	it('transition_race when applyTransition returns null (concurrent writer)', async () => {
		const sub = dunningSub('dunning_t0');
		// Precondition race: subscription's state changed between find + update
		mockSubsFindOne.mockResolvedValue({ ...sub, state: 'active' });
		mockSubsFindOneAndUpdate.mockResolvedValue(null);

		const sendEmail = vi.fn();
		const result = await processOneDunningAdvance(sub, { now: nowAt(3), sendEmail });

		expect(result.kind).toBe('transition_race');
		expect(sendEmail).not.toHaveBeenCalled();
		// No audit row written when the transition didn't actually happen
		expect(mockAuditInsertOne).not.toHaveBeenCalled();
	});

	it('email-hook failure does NOT roll back the transition (state stays advanced)', async () => {
		const sub = dunningSub('dunning_t0');
		transitionSucceeds(sub, 'dunning_grace');

		const sendEmail = vi.fn().mockRejectedValue(new Error('SES rate-limited'));
		const result = await processOneDunningAdvance(sub, { now: nowAt(3), sendEmail });

		// Transition is recorded as advanced even though email threw
		expect(result.kind).toBe('advanced');
		// Audit row was still written (state truth is what matters)
		expect(mockAuditInsertOne).toHaveBeenCalledTimes(1);
		// Error was logged so operators see it
		expect(mockLoggerError).toHaveBeenCalled();
	});
});

// ── processDunningAdvanceBatch ─────────────────────────────────

describe('processDunningAdvanceBatch — batch driver', () => {
	it('mixed batch: advances eligible rows, no_advancement_due for not-yet-due rows, writes cron_run audit', async () => {
		// a: dunning_t0, dunning_started_at FAILURE_AT, at day 7 → ADVANCE to grace
		const a = dunningSub('dunning_t0');
		// b: dunning_grace, dunning_started_at FAILURE_AT, at day 7 → ADVANCE to final
		const b = dunningSub('dunning_grace');
		// c: dunning_t0 BUT dunning_started_at is the EVALUATION moment, so
		// daysSinceFailure = 0 — NOT yet due (no advancement at all)
		const c = dunningSub('dunning_t0', { dunning_started_at: nowAt(7) });

		mockSubsFind.mockReturnValue({
			limit: () => ({ toArray: () => Promise.resolve([a, b, c]) })
		});

		// Only a + b transition. c short-circuits in computeDunningAdvancement
		// before any Mongo read, so we don't need a findOne mock for it — but
		// the mock fallback below returns null for any unmatched query.
		mockSubsFindOne.mockImplementation((query: { dsa_id: ObjectId }) => {
			if (String(query.dsa_id) === String(a.dsa_id)) return Promise.resolve(a);
			if (String(query.dsa_id) === String(b.dsa_id)) return Promise.resolve(b);
			return Promise.resolve(null);
		});
		mockSubsFindOneAndUpdate.mockImplementation(
			(query: { dsa_id: ObjectId }) => {
				if (String(query.dsa_id) === String(a.dsa_id))
					return Promise.resolve({ ...a, state: 'dunning_grace' });
				if (String(query.dsa_id) === String(b.dsa_id))
					return Promise.resolve({ ...b, state: 'dunning_final' });
				return Promise.resolve(null);
			}
		);

		const sendEmail = vi.fn().mockResolvedValue(undefined);
		const summary = await processDunningAdvanceBatch({
			now: nowAt(7),
			sendEmail
		});

		expect(summary.total).toBe(3);
		expect(summary.advanced).toBe(2); // a + b
		expect(summary.no_advancement_due).toBe(1); // c
		expect(summary.errors).toBe(0);
		expect(sendEmail).toHaveBeenCalledTimes(2);

		// One cron_run audit row in addition to the 2 transition-audit rows.
		const cronRunCalls = mockAuditInsertOne.mock.calls.filter(
			(call) => (call[0] as { event_class: string }).event_class === 'cron_run'
		);
		expect(cronRunCalls).toHaveLength(1);
		expect((cronRunCalls[0][0] as { event_name: string }).event_name).toBe(
			'billing-dunning-advance'
		);
	});

	it('per-subscription error does not abort the batch', async () => {
		const a = dunningSub('dunning_t0');
		const b = dunningSub('dunning_grace');

		mockSubsFind.mockReturnValue({
			limit: () => ({ toArray: () => Promise.resolve([a, b]) })
		});

		// a fails inside applyTransition; b succeeds normally
		let call = 0;
		mockSubsFindOne.mockImplementation(() => {
			call++;
			if (call === 1) return Promise.reject(new Error('mongo blip'));
			return Promise.resolve(b);
		});
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...b, state: 'dunning_final' });

		const summary = await processDunningAdvanceBatch({
			now: nowAt(7),
			sendEmail: vi.fn().mockResolvedValue(undefined)
		});

		expect(summary.total).toBe(2);
		expect(summary.errors).toBe(1);
		expect(summary.advanced).toBe(1);
	});
});
