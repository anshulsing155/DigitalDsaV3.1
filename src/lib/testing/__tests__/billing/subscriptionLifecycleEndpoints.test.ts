/**
 * D.1 S6 M1+M2 — pause / resume / cancel endpoint behavioral tests
 * ══════════════════════════════════════════════════════════════════
 * Locks the contract of the three DSA-initiated lifecycle endpoints:
 *
 *   POST /api/billing/subscription/pause   — active/dunning_* → paused
 *   POST /api/billing/subscription/resume  — paused → paused_from_state
 *   POST /api/billing/subscription/cancel  — active → cancel_at_cycle_end
 *                                            paused → cancelled immediately
 *
 * Mongo + auth + rate-limiter mocked. The actual state-machine + Mongo
 * round-trip is covered by subscriptionState.test.ts and subscriptionStore.test.ts;
 * this file focuses on the endpoint orchestration + state guards.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type { BillingSubscriptionDoc, SubscriptionState } from '$lib/types/billingSubscription';

const TEST_DSA_OID = new ObjectId();

const mockSubsFindOne = vi.fn();
const mockSubsFindOneAndUpdate = vi.fn();
const mockAuditInsertOne = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	BillingSubscriptions: {
		findOne: (...args: unknown[]) => mockSubsFindOne(...args),
		findOneAndUpdate: (...args: unknown[]) => mockSubsFindOneAndUpdate(...args),
		insertOne: vi.fn(),
		updateOne: vi.fn(),
		find: vi.fn()
	},
	BillingAuditLogs: {
		insertOne: (...args: unknown[]) => mockAuditInsertOne(...args)
	},
	ProcessedWebhookEvents: { insertOne: vi.fn() },
	DsaApplications: { findOne: vi.fn() },
	ChargeAttempts: { findOne: vi.fn(), insertOne: vi.fn(), updateOne: vi.fn() },
	BillingTransactions: { findOne: vi.fn(), insertOne: vi.fn() }
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

vi.mock('$lib/server/rateLimiter', () => ({
	rateLimit: vi.fn(async () => false)
}));

vi.mock('$lib/server/guards', () => ({
	requireRoleApi: vi.fn((locals: { user?: { id: string } }) => {
		if (!locals.user) return new Response('Unauthorized', { status: 401 });
		return null;
	}),
	blockDemoWrite: vi.fn(() => null)
}));

// Import handlers AFTER mocks are set up
import { POST as pauseHandler } from '../../../../routes/api/billing/subscription/pause/+server';
import { POST as resumeHandler } from '../../../../routes/api/billing/subscription/resume/+server';
import { POST as cancelHandler } from '../../../../routes/api/billing/subscription/cancel/+server';

function makeSub(
	state: SubscriptionState,
	overrides: Partial<BillingSubscriptionDoc> = {}
): BillingSubscriptionDoc {
	return {
		_id: new ObjectId(),
		dsa_id: TEST_DSA_OID,
		state,
		plan_id: 'pro',
		billing_cycle: 'monthly',
		provider: 'razorpay',
		max_amount_paise: 599850,
		failed_attempt_count: 0,
		state_history: [],
		created_at: new Date(),
		updated_at: new Date(),
		...overrides
	} as BillingSubscriptionDoc;
}

function locals() {
	return { user: { id: TEST_DSA_OID.toString(), role: 'dsa' } };
}

// Cast to `any` because the same mock event is fed to three handlers whose
// RouteParams generics differ (pause vs resume vs cancel). Locking to one
// handler's parameter type broke svelte-check at the call sites for the
// other two.
function mockEvent() {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return { locals: locals(), request: new Request('http://x'), url: new URL('http://x') } as any;
}

beforeEach(() => {
	mockSubsFindOne.mockReset();
	mockSubsFindOneAndUpdate.mockReset();
	mockAuditInsertOne.mockReset().mockResolvedValue({ insertedId: new ObjectId() });
});

// ── PAUSE ──────────────────────────────────────────────────────

describe('POST /api/billing/subscription/pause', () => {
	it('transitions active → paused + cancels next_charge_at + writes audit', async () => {
		const sub = makeSub('active', { next_charge_at: new Date() });
		mockSubsFindOne.mockResolvedValue(sub);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...sub, state: 'paused' });

		const res = await pauseHandler(mockEvent());
		const body = await res.json();
		expect(res.status).toBe(200);
		expect(body.data.state).toBe('paused');
		expect(mockAuditInsertOne).toHaveBeenCalled();
		expect(mockAuditInsertOne.mock.calls[0][0].event_name).toBe('active->paused');
	});

	it('transitions dunning_t0 → paused (preserves dunning clock)', async () => {
		const sub = makeSub('dunning_t0', { dunning_started_at: new Date() });
		mockSubsFindOne.mockResolvedValue(sub);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...sub, state: 'paused' });

		const res = await pauseHandler(mockEvent());
		expect(res.status).toBe(200);
		expect(mockAuditInsertOne.mock.calls[0][0].event_name).toBe('dunning_t0->paused');
	});

	it('returns 409 when called from a non-pausable state (downgraded)', async () => {
		mockSubsFindOne.mockResolvedValue(makeSub('downgraded'));

		const res = await pauseHandler(mockEvent());
		expect(res.status).toBe(409);
		expect(mockSubsFindOneAndUpdate).not.toHaveBeenCalled();
	});

	it('returns 404 when no subscription exists', async () => {
		mockSubsFindOne.mockResolvedValue(null);

		const res = await pauseHandler(mockEvent());
		expect(res.status).toBe(404);
	});
});

// ── RESUME ─────────────────────────────────────────────────────

describe('POST /api/billing/subscription/resume', () => {
	it('paused (paused_from_state=active) → active + sets next_charge_at=today', async () => {
		const sub = makeSub('paused', { paused_from_state: 'active' });
		mockSubsFindOne.mockResolvedValue(sub);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...sub, state: 'active' });

		const res = await resumeHandler(mockEvent());
		const body = await res.json();
		expect(res.status).toBe(200);
		expect(body.data.state).toBe('active');
		expect(mockAuditInsertOne.mock.calls[0][0].event_name).toBe('paused->active');
	});

	it('paused (paused_from_state=dunning_grace) → dunning_grace (no next_charge_at change)', async () => {
		const sub = makeSub('paused', { paused_from_state: 'dunning_grace' });
		mockSubsFindOne.mockResolvedValue(sub);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...sub, state: 'dunning_grace' });

		const res = await resumeHandler(mockEvent());
		const body = await res.json();
		expect(res.status).toBe(200);
		expect(body.data.state).toBe('dunning_grace');
		expect(mockAuditInsertOne.mock.calls[0][0].event_name).toBe('paused->dunning_grace');
	});

	it('falls back to active when paused_from_state is missing (defensive)', async () => {
		const sub = makeSub('paused', { paused_from_state: undefined });
		mockSubsFindOne.mockResolvedValue(sub);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...sub, state: 'active' });

		const res = await resumeHandler(mockEvent());
		const body = await res.json();
		expect(res.status).toBe(200);
		expect(body.data.state).toBe('active');
	});

	it('returns 409 when called from a non-paused state', async () => {
		mockSubsFindOne.mockResolvedValue(makeSub('active'));

		const res = await resumeHandler(mockEvent());
		expect(res.status).toBe(409);
		expect(mockSubsFindOneAndUpdate).not.toHaveBeenCalled();
	});
});

// ── CANCEL ─────────────────────────────────────────────────────

describe('POST /api/billing/subscription/cancel', () => {
	it('active → sets cancel_at_cycle_end (no state change)', async () => {
		const sub = makeSub('active', { next_charge_at: new Date() });
		mockSubsFindOne.mockResolvedValue(sub);
		mockSubsFindOneAndUpdate.mockResolvedValue({
			...sub,
			cancel_at_cycle_end: true
		});

		const res = await cancelHandler(mockEvent());
		const body = await res.json();
		expect(res.status).toBe(200);
		expect(body.data.state).toBe('active');
		expect(body.data.cancel_at_cycle_end).toBe(true);
		expect(mockAuditInsertOne.mock.calls[0][0].event_name).toBe('cancel_at_cycle_end_set');
	});

	it('idempotent — re-cancelling an already-cancel-flagged active sub returns 200', async () => {
		mockSubsFindOne.mockResolvedValue(
			makeSub('active', { cancel_at_cycle_end: true, next_charge_at: new Date() })
		);

		const res = await cancelHandler(mockEvent());
		const body = await res.json();
		expect(res.status).toBe(200);
		expect(body.data.cancel_at_cycle_end).toBe(true);
		// No state-change update should fire on the idempotent path
		expect(mockSubsFindOneAndUpdate).not.toHaveBeenCalled();
	});

	it('paused → cancelled immediately (no scheduled wait)', async () => {
		const sub = makeSub('paused');
		mockSubsFindOne.mockResolvedValue(sub);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...sub, state: 'cancelled' });

		const res = await cancelHandler(mockEvent());
		const body = await res.json();
		expect(res.status).toBe(200);
		expect(body.data.state).toBe('cancelled');
		expect(mockAuditInsertOne.mock.calls[0][0].event_name).toBe('paused->cancelled');
	});

	it('returns 409 from any non-cancellable state (downgraded)', async () => {
		mockSubsFindOne.mockResolvedValue(makeSub('downgraded'));

		const res = await cancelHandler(mockEvent());
		expect(res.status).toBe(409);
	});
});
