/**
 * D.1 S6 M7 — Manage subscription integration locks
 * ══════════════════════════════════════════════════════════════════
 * Cross-module invariants that span M3+M4+M6 and would otherwise
 * only surface in the smoke runbook (D1-S6-MANAGE-SUBSCRIPTION-SMOKE.md).
 * Locking them here so a future refactor that breaks one of these
 * combinations fails CI instead of waiting for the next smoke session.
 *
 * Cases:
 *   1. update-payment-method → cron tick during lock window: charge
 *      engine skips (R6 advisory lock)
 *   2. update-payment-method abandonment: after lock expiry, the OLD
 *      mandate is used for the next charge (no degradation)
 *   3. change-plan UPGRADE that exceeds existing mandate cap: 409
 *      NEEDS_REMANDATE — NO DB write
 *   4. change-plan DOWNGRADE deferred to anchor: cron flips plan_id
 *      BEFORE computing charge amount, clears flag
 *   5. pause-sweep cron does NOT touch a sub that's not paused
 *
 * Mongo + provider mocked. Each test exercises the real engine + store
 * code paths (no engine stubbing), only the persistence layer is mocked.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type {
	BillingSubscriptionDoc,
	SubscriptionState
} from '$lib/types/billingSubscription';
import type { PlanId } from '$lib/config/billing';

const TEST_DSA_OID = new ObjectId();
const TEST_SUB_OID = new ObjectId();

const mockSubsFind = vi.fn();
const mockSubsFindOne = vi.fn();
const mockSubsFindOneAndUpdate = vi.fn();
const mockSubsUpdateOne = vi.fn();
const mockAuditInsertOne = vi.fn();
const mockChargeAttemptsFindOne = vi.fn();
const mockChargeAttemptsInsertOne = vi.fn();
const mockChargeAttemptsUpdateOne = vi.fn();
const mockBillingTxInsertOne = vi.fn();
const mockChargeMandate = vi.fn();
const mockRevokeMandate = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	BillingSubscriptions: {
		find: (...args: unknown[]) => mockSubsFind(...args),
		findOne: (...args: unknown[]) => mockSubsFindOne(...args),
		findOneAndUpdate: (...args: unknown[]) => mockSubsFindOneAndUpdate(...args),
		updateOne: (...args: unknown[]) => mockSubsUpdateOne(...args),
		insertOne: vi.fn()
	},
	BillingAuditLogs: {
		insertOne: (...args: unknown[]) => mockAuditInsertOne(...args)
	},
	ProcessedWebhookEvents: { insertOne: vi.fn() },
	DsaApplications: {
		// Provides a minimal DSA doc so generateInvoice's buyer-info lookup
		// doesn't throw. The exact GSTIN/state values don't matter for the
		// charge-path assertions; integration tests focus on subscription
		// state, not invoice content.
		findOne: vi
			.fn()
			.mockResolvedValue({ gstNumber: undefined, state: 'MH', name: 'Test DSA' })
	},
	ChargeAttempts: {
		findOne: (...args: unknown[]) => mockChargeAttemptsFindOne(...args),
		insertOne: (...args: unknown[]) => mockChargeAttemptsInsertOne(...args),
		updateOne: (...args: unknown[]) => mockChargeAttemptsUpdateOne(...args)
	},
	BillingTransactions: {
		findOne: vi.fn(),
		insertOne: (...args: unknown[]) => mockBillingTxInsertOne(...args)
	},
	// D.2 — generateInvoice is called from chargeEngine.handleSuccess.
	// Stubbed here so the integration tests' charge path doesn't hit
	// real Invoices/InvoiceCounters lookups. Returning empty
	// findOneAndUpdate/insertOne values is enough — generateInvoice's
	// own E11000 catch handles the empty `Invoices` lookup gracefully.
	Invoices: {
		findOne: vi.fn().mockResolvedValue(null),
		insertOne: vi.fn().mockResolvedValue({ insertedId: undefined })
	},
	InvoiceCounters: {
		findOneAndUpdate: vi.fn().mockResolvedValue({ _id: 'fy_2026-27', value: 1 })
	}
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

vi.mock('$lib/server/rateLimiter', () => ({
	rateLimit: vi.fn(async () => false)
}));

vi.mock('$lib/server/guards', () => ({
	requireRoleApi: vi.fn(() => null),
	blockDemoWrite: vi.fn(() => null)
}));

vi.mock('$lib/server/billing/providerRegistry', () => ({
	getBillingProvider: () => ({
		name: 'mock',
		registerMandate: vi.fn(),
		chargeMandate: mockChargeMandate,
		revokeMandate: mockRevokeMandate,
		refundCharge: vi.fn(),
		queryMandateStatus: vi.fn(),
		fetchSettlements: vi.fn(),
		verifyWebhookSignature: vi.fn(() => true),
		parseWebhookEvent: vi.fn()
	})
}));

vi.mock('$lib/server/email', () => ({
	sendEmail: vi.fn(async () => ({ success: true }))
}));

function makeSub(
	state: SubscriptionState = 'active',
	plan_id: PlanId = 'pro',
	overrides: Partial<BillingSubscriptionDoc> = {}
): BillingSubscriptionDoc {
	const capByPlan: Record<PlanId, number> = {
		basic: 149_850,
		pro: 599_850,
		enterprise: 1_499_850
	};
	return {
		_id: TEST_SUB_OID,
		dsa_id: TEST_DSA_OID,
		state,
		plan_id,
		billing_cycle: 'monthly',
		provider: 'razorpay',
		max_amount_paise: capByPlan[plan_id],
		failed_attempt_count: 0,
		state_history: [],
		created_at: new Date(),
		updated_at: new Date(),
		mandate_token: 'tok_existing',
		anchor_day: 5,
		next_charge_at: new Date(Date.now() - 60 * 1000),
		customer_email: 'test@digitaldsa.com',
		customer_mobile: '+919811556664',
		...overrides
	} as BillingSubscriptionDoc;
}

beforeEach(() => {
	mockSubsFind.mockReset();
	mockSubsFindOne.mockReset();
	mockSubsFindOneAndUpdate.mockReset();
	mockSubsUpdateOne.mockReset();
	mockAuditInsertOne.mockReset().mockResolvedValue({ insertedId: new ObjectId() });
	mockChargeAttemptsFindOne.mockReset().mockResolvedValue(null);
	mockChargeAttemptsInsertOne.mockReset().mockResolvedValue({ insertedId: new ObjectId() });
	mockChargeAttemptsUpdateOne.mockReset().mockResolvedValue({});
	// D.2 — chargeEngine reads txInsert.insertedId after BillingTransactions.insertOne
	// to pass to generateInvoice; default to a valid id so the call doesn't throw.
	mockBillingTxInsertOne.mockReset().mockResolvedValue({ insertedId: new ObjectId() });
	mockChargeMandate.mockReset();
	mockRevokeMandate.mockReset();
});

// ── Integration: M3 lock + charge cron ──────────────────────────

describe('S6 integration — update-payment-method lock blocks charge cron', () => {
	it('cron skips while lock is held; resumes after lock expires (OLD mandate stays in force)', async () => {
		const { processOneSubscription } = await import('../../../server/billing/chargeEngine');

		// Phase 1: lock IS held. Charge cron sees the sub and skips.
		const lockedSub = makeSub('active', 'pro', {
			mandate_update_lock_until: new Date(Date.now() + 60 * 1000), // +1 min
			pending_replacement_registration_id: 'pr_inflight'
		});

		const skipOutcome = await processOneSubscription(lockedSub, {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			provider: { chargeMandate: mockChargeMandate } as any,
			sendConfirmationEmail: false
		});
		expect(skipOutcome.kind).toBe('skipped_mandate_update_lock');
		expect(mockChargeMandate).not.toHaveBeenCalled();

		// Phase 2: DSA abandoned the flow. Lock expired. OLD mandate still on doc.
		// Cron processes normally — charges the ORIGINAL token.
		const abandonedSub = makeSub('active', 'pro', {
			mandate_update_lock_until: new Date(Date.now() - 60 * 1000), // expired
			pending_replacement_registration_id: 'pr_abandoned',
			mandate_token: 'tok_original'
		});

		mockChargeMandate.mockResolvedValue({
			status: 'succeeded',
			provider_payment_id: 'pay_after_abandon',
			raw_response: {}
		});
		mockSubsFindOne.mockResolvedValue(abandonedSub);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...abandonedSub, state: 'active' });

		const chargedOutcome = await processOneSubscription(abandonedSub, {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			provider: { chargeMandate: mockChargeMandate } as any,
			sendConfirmationEmail: false
		});

		expect(chargedOutcome.kind).toBe('succeeded');
		// The cron called chargeMandate with the ORIGINAL mandate_token —
		// confirms "old mandate stays in force on abandonment" semantics.
		expect(mockChargeMandate).toHaveBeenCalledOnce();
		const chargeReq = mockChargeMandate.mock.calls[0][0] as { mandate_token: string };
		expect(chargeReq.mandate_token).toBe('tok_original');
	});
});

// ── Integration: M4 deferred downgrade applied by charge cron ──

describe('S6 integration — change-plan downgrade is applied at next anchor by charge cron', () => {
	it('cron flips plan_id BEFORE computing amount; clears pending_downgrade_to', async () => {
		const { processOneSubscription } = await import('../../../server/billing/chargeEngine');

		// Sub is on enterprise but downgrade pending to pro. Cron tick fires.
		const sub = makeSub('active', 'enterprise', {
			pending_downgrade_to: 'pro',
			max_amount_paise: 1_499_850 // enterprise mandate cap
		});

		mockSubsFindOne.mockResolvedValue(sub);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...sub, state: 'active' });
		// Two updateOne calls expected:
		//   1. plan_id flip + $unset pending_downgrade_to
		//   2. (none — applyTransition uses findOneAndUpdate for the actual transition)
		mockSubsUpdateOne.mockResolvedValue({ acknowledged: true });
		mockChargeMandate.mockResolvedValue({
			status: 'succeeded',
			provider_payment_id: 'pay_after_downgrade',
			raw_response: {}
		});

		const outcome = await processOneSubscription(sub, {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			provider: { chargeMandate: mockChargeMandate } as any,
			sendConfirmationEmail: false
		});

		expect(outcome.kind).toBe('succeeded');

		// chargeMandate was called with the PRO amount (399900), not enterprise's (999900).
		const chargeReq = mockChargeMandate.mock.calls[0][0] as { amount_paise: number };
		expect(chargeReq.amount_paise).toBe(399900);

		// The pre-charge updateOne flipped plan_id + cleared the pending flag.
		const flipCall = mockSubsUpdateOne.mock.calls.find(
			(c) => (c[1] as { $set?: { plan_id?: string } }).$set?.plan_id === 'pro'
		);
		expect(flipCall).toBeDefined();
		const flipOps = flipCall![1] as { $set: Record<string, unknown>; $unset: Record<string, ''> };
		expect(flipOps.$set.plan_id).toBe('pro');
		expect(flipOps.$unset.pending_downgrade_to).toBe('');
	});
});

// ── Integration: change-plan upgrade with cap exceeded — NO DB WRITE ──

describe('S6 integration — change-plan NEEDS_REMANDATE does not mutate', () => {
	it('endpoint returns 409 + writes nothing', async () => {
		const mod = await import('../../../../routes/api/billing/subscription/change-plan/+server');
		const handler = mod.POST;

		mockSubsFindOne.mockResolvedValue(
			makeSub('active', 'basic', { max_amount_paise: 149_850 })
		);

		const req = new Request('http://x', {
			method: 'POST',
			body: JSON.stringify({ new_plan_id: 'enterprise', change_kind: 'upgrade' }),
			headers: { 'content-type': 'application/json' }
		});
		const res = await handler({
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			request: req,
			locals: { user: { id: TEST_DSA_OID.toString(), role: 'dsa' } },
			url: new URL('http://x')
		} as any);

		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('NEEDS_REMANDATE');
		// CRITICAL: no DB mutation attempted.
		expect(mockSubsFindOneAndUpdate).not.toHaveBeenCalled();
		expect(mockSubsUpdateOne).not.toHaveBeenCalled();
	});
});

// ── Integration: pause-sweep ignores non-paused subs ───────────

describe('S6 integration — pause-sweep ignores non-paused subs', () => {
	it('active subs are not touched even if state_history shows old paused entries', async () => {
		const { processPauseSweepBatch } = await import(
			'../../../server/billing/pauseSweepEngine'
		);

		// An active sub that was paused 100 days ago and resumed — still in
		// state=active. pause-sweep eligibility filter is state=paused only,
		// so this should never even be returned by the find cursor.
		const formerPause = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
		const resumedAt = new Date(formerPause.getTime() + 50 * 24 * 60 * 60 * 1000);
		const sub = makeSub('active', 'pro', {
			state_history: [
				{ from: 'active', to: 'paused', at: formerPause, reason: 'first pause' },
				{ from: 'paused', to: 'active', at: resumedAt, reason: 'resumed' }
			]
		});

		// The find query must filter on state=paused; mock enforces that by
		// returning empty when filter doesn't match.
		mockSubsFind.mockImplementation((filter: { state?: string }) => ({
			limit: () => ({
				toArray: async () => (filter.state === 'paused' ? [sub] : [])
			})
		}));

		const summary = await processPauseSweepBatch({
			now: new Date(),
			sendReminderEmail: vi.fn(async () => {})
		});

		// Mongo would not return a non-paused row for state=paused — but if it
		// somehow does (bug in the eligibility query), the engine still
		// short-circuits via evaluatePause's `state !== 'paused' → null`.
		// In this test mockSubsFind returns the sub anyway, so the engine
		// will see it and must safely no-op.
		expect(summary.reminders_sent).toBe(0);
		expect(summary.auto_cancelled).toBe(0);
	});
});
