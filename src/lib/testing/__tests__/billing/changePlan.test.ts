/**
 * D.1 S6 M4 — change-plan endpoint
 * ══════════════════════════════════════════════════════════════════
 * Locks the contract of:
 *
 *   POST /api/billing/subscription/change-plan
 *     - DSA-only, rate-limited
 *     - Body validation: new_plan_id ∈ PLANS, change_kind ∈ {upgrade,downgrade}
 *     - Only from state=active (paused/dunning_* → 409)
 *     - Same-plan target → 400
 *     - Server-validated kind: caller's "upgrade" must match the
 *       price ordering vs current plan (KIND_MISMATCH otherwise)
 *     - UPGRADE: flips plan_id + max_amount_paise immediately, anchor
 *       preserved, audit emitted. Returns kind=upgrade.
 *     - UPGRADE with cap-exceeded: 409 NEEDS_REMANDATE — no DB write.
 *     - DOWNGRADE: stamps pending_downgrade_to, plan_id unchanged.
 *       chargeEngine step 2 applies the flip at next anchor (covered
 *       by chargeEngine tests, not duplicated here).
 *
 * Mongo + auth + rate-limiter mocked.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type { BillingSubscriptionDoc, SubscriptionState } from '$lib/types/billingSubscription';
import type { PlanId } from '$lib/config/billing';

const TEST_DSA_OID = new ObjectId();
const TEST_SUB_OID = new ObjectId();

const mockSubsFindOne = vi.fn();
const mockSubsFindOneAndUpdate = vi.fn();
const mockAuditInsertOne = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	BillingSubscriptions: {
		findOne: (...args: unknown[]) => mockSubsFindOne(...args),
		findOneAndUpdate: (...args: unknown[]) => mockSubsFindOneAndUpdate(...args),
		updateOne: vi.fn(),
		insertOne: vi.fn(),
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
	requireRoleApi: vi.fn((locals: { user?: { id: string; role?: string } }) => {
		if (!locals.user) return new Response('Unauthorized', { status: 401 });
		if (locals.user.role && locals.user.role !== 'dsa')
			return new Response('Forbidden', { status: 403 });
		return null;
	}),
	blockDemoWrite: vi.fn(() => null)
}));

function makeSub(
	state: SubscriptionState,
	plan_id: PlanId,
	overrides: Partial<BillingSubscriptionDoc> = {}
): BillingSubscriptionDoc {
	// Pro plan: 3999 × 100 paise × 1.5 = 599_850 (matches current sub's mandate cap)
	const baseCapByPlan: Record<PlanId, number> = {
		basic: 999 * 100 * 1.5,
		pro: 3999 * 100 * 1.5,
		enterprise: 9999 * 100 * 1.5
	};
	return {
		_id: TEST_SUB_OID,
		dsa_id: TEST_DSA_OID,
		state,
		plan_id,
		billing_cycle: 'monthly',
		provider: 'razorpay',
		max_amount_paise: baseCapByPlan[plan_id],
		failed_attempt_count: 0,
		state_history: [],
		created_at: new Date(),
		updated_at: new Date(),
		mandate_token: 'tok_abc',
		anchor_day: 5,
		next_charge_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
		...overrides
	} as BillingSubscriptionDoc;
}

function locals(role: string | undefined = 'dsa') {
	if (!role) return {};
	return { user: { id: TEST_DSA_OID.toString(), role } };
}

function mockEvent(body: unknown, localsOverride?: ReturnType<typeof locals>) {
	const req = new Request('http://x', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'content-type': 'application/json' }
	});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return {
		locals: localsOverride ?? locals(),
		request: req,
		url: new URL('http://x')
	} as any;
}

beforeEach(() => {
	mockSubsFindOne.mockReset();
	mockSubsFindOneAndUpdate.mockReset();
	mockAuditInsertOne.mockReset().mockResolvedValue({ insertedId: new ObjectId() });
});

async function getEndpoint() {
	const mod = await import(
		'../../../../routes/api/billing/subscription/change-plan/+server'
	);
	return mod.POST;
}

// ── Auth + body validation ──────────────────────────────────────

describe('POST /api/billing/subscription/change-plan — auth + body', () => {
	it('401s for unauthenticated requests', async () => {
		const handler = await getEndpoint();
		const res = await handler(mockEvent({ new_plan_id: 'enterprise', change_kind: 'upgrade' }, {}));
		expect(res.status).toBe(401);
	});

	it('403s for non-DSA roles', async () => {
		const handler = await getEndpoint();
		const res = await handler(
			mockEvent(
				{ new_plan_id: 'enterprise', change_kind: 'upgrade' },
				{ user: { id: TEST_DSA_OID.toString(), role: 'admin' } }
			)
		);
		expect(res.status).toBe(403);
	});

	it('400s on invalid new_plan_id', async () => {
		const handler = await getEndpoint();
		const res = await handler(
			mockEvent({ new_plan_id: 'platinum' as PlanId, change_kind: 'upgrade' })
		);
		expect(res.status).toBe(400);
	});

	it('400s on invalid change_kind', async () => {
		const handler = await getEndpoint();
		const res = await handler(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			mockEvent({ new_plan_id: 'pro', change_kind: 'sidegrade' as any })
		);
		expect(res.status).toBe(400);
	});

	it('404s when DSA has no subscription', async () => {
		mockSubsFindOne.mockResolvedValue(null);
		const handler = await getEndpoint();
		const res = await handler(mockEvent({ new_plan_id: 'enterprise', change_kind: 'upgrade' }));
		expect(res.status).toBe(404);
	});
});

// ── State precondition ─────────────────────────────────────────

describe('POST /api/billing/subscription/change-plan — state guard', () => {
	it('409s from paused (DSA must resume first)', async () => {
		mockSubsFindOne.mockResolvedValue(makeSub('paused', 'pro'));
		const handler = await getEndpoint();
		const res = await handler(mockEvent({ new_plan_id: 'enterprise', change_kind: 'upgrade' }));
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('INVALID_STATE');
	});

	it('409s from dunning_t0 (resolve failure first)', async () => {
		mockSubsFindOne.mockResolvedValue(makeSub('dunning_t0', 'pro'));
		const handler = await getEndpoint();
		const res = await handler(mockEvent({ new_plan_id: 'enterprise', change_kind: 'upgrade' }));
		expect(res.status).toBe(409);
	});
});

// ── Same-plan rejection + kind validation ──────────────────────

describe('POST /api/billing/subscription/change-plan — kind validation', () => {
	it('400s when target plan equals current plan', async () => {
		mockSubsFindOne.mockResolvedValue(makeSub('active', 'pro'));
		const handler = await getEndpoint();
		const res = await handler(mockEvent({ new_plan_id: 'pro', change_kind: 'upgrade' }));
		expect(res.status).toBe(400);
	});

	it('400s with KIND_MISMATCH when caller claims upgrade but target is cheaper', async () => {
		mockSubsFindOne.mockResolvedValue(makeSub('active', 'pro'));
		const handler = await getEndpoint();
		const res = await handler(mockEvent({ new_plan_id: 'basic', change_kind: 'upgrade' }));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('KIND_MISMATCH');
		expect(body.detected_kind).toBe('downgrade');
	});

	it('400s with KIND_MISMATCH when caller claims downgrade but target is more expensive', async () => {
		mockSubsFindOne.mockResolvedValue(makeSub('active', 'pro'));
		const handler = await getEndpoint();
		const res = await handler(mockEvent({ new_plan_id: 'enterprise', change_kind: 'downgrade' }));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('KIND_MISMATCH');
	});
});

// ── UPGRADE ────────────────────────────────────────────────────

describe('POST /api/billing/subscription/change-plan — upgrade', () => {
	it('flips plan_id + max_amount_paise immediately, anchor preserved', async () => {
		// DSA previously re-mandated with a cap that covers enterprise (1_499_850).
		const sub = makeSub('active', 'pro', { max_amount_paise: 1_499_850 });
		mockSubsFindOne.mockResolvedValue(sub);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...sub, plan_id: 'enterprise', max_amount_paise: 1_499_850 });

		const handler = await getEndpoint();
		const res = await handler(mockEvent({ new_plan_id: 'enterprise', change_kind: 'upgrade' }));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.kind).toBe('upgrade');
		expect(body.data.new_plan_id).toBe('enterprise');
		expect(body.data.effective_from).toBe('immediately');

		// Verify the update operations.
		const updateOps = mockSubsFindOneAndUpdate.mock.calls[0][1] as {
			$set: Record<string, unknown>;
			$unset: Record<string, ''>;
		};
		expect(updateOps.$set.plan_id).toBe('enterprise');
		// Enterprise: 9999 × 100 × 1.5 = 1_499_850
		expect(updateOps.$set.max_amount_paise).toBe(1_499_850);
		// Critical: anchor + next_charge_at NOT in $set (preserved).
		expect(updateOps.$set.anchor_day).toBeUndefined();
		expect(updateOps.$set.next_charge_at).toBeUndefined();
		// pending_downgrade_to cleared in case of a reverse-course scenario.
		expect(updateOps.$unset.pending_downgrade_to).toBe('');
	});

	it('writes a plan_upgrade audit row', async () => {
		// basic → pro needs cap 599_850; pre-mandate with that cap.
		const sub = makeSub('active', 'basic', { max_amount_paise: 599_850 });
		mockSubsFindOne.mockResolvedValue(sub);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...sub, plan_id: 'pro' });

		const handler = await getEndpoint();
		await handler(mockEvent({ new_plan_id: 'pro', change_kind: 'upgrade' }));

		expect(mockAuditInsertOne).toHaveBeenCalled();
		const row = mockAuditInsertOne.mock.calls[0][0];
		expect(row.event_name).toBe('plan_upgrade');
		expect(row.actor).toBe('dsa');
		expect(row.payload.from_plan).toBe('basic');
		expect(row.payload.to_plan).toBe('pro');
	});

	it('409s NEEDS_REMANDATE when new tier cap exceeds existing mandate cap', async () => {
		// DSA is on basic (cap 149_850) and tries to upgrade to enterprise (needs 1_499_850).
		// The existing mandate can't carry the larger debits → must re-mandate first.
		const sub = makeSub('active', 'basic'); // cap 149_850
		mockSubsFindOne.mockResolvedValue(sub);

		const handler = await getEndpoint();
		const res = await handler(mockEvent({ new_plan_id: 'enterprise', change_kind: 'upgrade' }));
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('NEEDS_REMANDATE');
		expect(body.needs_remandate).toBe(true);
		expect(body.required_mandate_cap_paise).toBe(1_499_850);

		// No DB write attempted.
		expect(mockSubsFindOneAndUpdate).not.toHaveBeenCalled();
	});

	it('upgrade succeeds within mandate cap when current sub was previously upgraded', async () => {
		// DSA was upgraded basic→pro previously; max_amount_paise=599_850.
		// Now they go pro→enterprise which would need 1_499_850. Cap exceeded.
		const sub = makeSub('active', 'pro');
		mockSubsFindOne.mockResolvedValue(sub);

		const handler = await getEndpoint();
		const res = await handler(mockEvent({ new_plan_id: 'enterprise', change_kind: 'upgrade' }));
		expect(res.status).toBe(409);
		expect(mockSubsFindOneAndUpdate).not.toHaveBeenCalled();
	});

	it('409s when state moves out of active during the request (race)', async () => {
		const sub = makeSub('active', 'basic');
		mockSubsFindOne.mockResolvedValue(sub);
		// Precondition mismatch — findOneAndUpdate returns null.
		mockSubsFindOneAndUpdate.mockResolvedValue(null);

		const handler = await getEndpoint();
		const res = await handler(mockEvent({ new_plan_id: 'pro', change_kind: 'upgrade' }));
		expect(res.status).toBe(409);
	});
});

// ── DOWNGRADE ──────────────────────────────────────────────────

describe('POST /api/billing/subscription/change-plan — downgrade', () => {
	it('stamps pending_downgrade_to + leaves plan_id unchanged', async () => {
		const sub = makeSub('active', 'enterprise');
		mockSubsFindOne.mockResolvedValue(sub);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...sub, pending_downgrade_to: 'pro' });

		const handler = await getEndpoint();
		const res = await handler(mockEvent({ new_plan_id: 'pro', change_kind: 'downgrade' }));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.kind).toBe('downgrade');
		expect(body.data.current_plan_id).toBe('enterprise');
		expect(body.data.pending_downgrade_to).toBe('pro');

		const updateOps = mockSubsFindOneAndUpdate.mock.calls[0][1] as {
			$set: Record<string, unknown>;
		};
		expect(updateOps.$set.pending_downgrade_to).toBe('pro');
		// plan_id is NOT changed in the $set (deferred to next anchor).
		expect(updateOps.$set.plan_id).toBeUndefined();
		// max_amount_paise also unchanged (the smaller plan fits the existing cap).
		expect(updateOps.$set.max_amount_paise).toBeUndefined();
	});

	it('writes a plan_downgrade_scheduled audit row', async () => {
		const sub = makeSub('active', 'pro');
		mockSubsFindOne.mockResolvedValue(sub);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...sub, pending_downgrade_to: 'basic' });

		const handler = await getEndpoint();
		await handler(mockEvent({ new_plan_id: 'basic', change_kind: 'downgrade' }));

		expect(mockAuditInsertOne).toHaveBeenCalled();
		const row = mockAuditInsertOne.mock.calls[0][0];
		expect(row.event_name).toBe('plan_downgrade_scheduled');
		expect(row.payload.from_plan).toBe('pro');
		expect(row.payload.to_plan).toBe('basic');
	});
});
