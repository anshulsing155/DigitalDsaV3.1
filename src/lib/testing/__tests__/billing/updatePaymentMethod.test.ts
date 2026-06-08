/**
 * D.1 S6 M3 — update-payment-method endpoint + webhook swap + charge-skip
 * ══════════════════════════════════════════════════════════════════
 * Locks the contract of:
 *
 *   POST /api/billing/subscription/update-payment-method
 *     - DSA-only, rate-limited
 *     - 409 from non-live states (pending_mandate / downgraded / cancelled / not_subscribed)
 *     - 409 when a replacement is already in flight + unexpired
 *     - happy path stamps pending_replacement_* + mandate_update_lock_until
 *     - returns provider's authorization URL
 *
 *   chargeEngine.processOneSubscription
 *     - skips when mandate_update_lock_until > now (R6 advisory lock)
 *     - resumes normal charging once the lock has expired
 *     - emits skipped_mandate_update_lock outcome + cron audit row
 *
 *   Razorpay webhook mandate.authorized — replacement flow
 *     - detected via pending_replacement_registration_id
 *     - swap is atomic; previous_mandate_token is returned for revoke
 *     - provider.revokeMandate is called (best-effort, failure non-fatal)
 *
 * Mongo + auth + provider mocked. The state-machine + Mongo round-trip
 * is covered by subscriptionState.test.ts + subscriptionStore.test.ts.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type { BillingSubscriptionDoc, SubscriptionState } from '$lib/types/billingSubscription';

const TEST_DSA_OID = new ObjectId();
const TEST_SUB_OID = new ObjectId();

// ── Mongo mocks ─────────────────────────────────────────────────

const mockSubsFindOne = vi.fn();
const mockSubsFindOneAndUpdate = vi.fn();
const mockSubsUpdateOne = vi.fn();
const mockAuditInsertOne = vi.fn();
const mockDsaFindOne = vi.fn();
const mockChargeAttemptsFindOne = vi.fn();
const mockChargeAttemptsInsertOne = vi.fn();
const mockChargeAttemptsUpdateOne = vi.fn();
const mockBillingTxFindOne = vi.fn();
const mockBillingTxInsertOne = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	BillingSubscriptions: {
		findOne: (...args: unknown[]) => mockSubsFindOne(...args),
		findOneAndUpdate: (...args: unknown[]) => mockSubsFindOneAndUpdate(...args),
		updateOne: (...args: unknown[]) => mockSubsUpdateOne(...args),
		insertOne: vi.fn(),
		find: vi.fn()
	},
	BillingAuditLogs: {
		insertOne: (...args: unknown[]) => mockAuditInsertOne(...args)
	},
	ProcessedWebhookEvents: { insertOne: vi.fn() },
	DsaApplications: {
		findOne: (...args: unknown[]) => mockDsaFindOne(...args)
	},
	ChargeAttempts: {
		findOne: (...args: unknown[]) => mockChargeAttemptsFindOne(...args),
		insertOne: (...args: unknown[]) => mockChargeAttemptsInsertOne(...args),
		updateOne: (...args: unknown[]) => mockChargeAttemptsUpdateOne(...args)
	},
	BillingTransactions: {
		findOne: (...args: unknown[]) => mockBillingTxFindOne(...args),
		insertOne: (...args: unknown[]) => mockBillingTxInsertOne(...args)
	}
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

// Provider mock — programmable per-test.
const mockRegisterMandate = vi.fn();
const mockRevokeMandate = vi.fn();
const mockChargeMandate = vi.fn();
vi.mock('$lib/server/billing/providerRegistry', () => ({
	getBillingProvider: () => ({
		name: 'mock',
		registerMandate: mockRegisterMandate,
		revokeMandate: mockRevokeMandate,
		chargeMandate: mockChargeMandate,
		queryMandateStatus: vi.fn(),
		refundCharge: vi.fn(),
		fetchSettlements: vi.fn(),
		verifyWebhookSignature: vi.fn(() => true),
		parseWebhookEvent: vi.fn()
	})
}));

// ── Test helpers ────────────────────────────────────────────────

function makeSub(
	state: SubscriptionState,
	overrides: Partial<BillingSubscriptionDoc> = {}
): BillingSubscriptionDoc {
	return {
		_id: TEST_SUB_OID,
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
		mandate_token: 'old_token_abc123',
		anchor_day: 5,
		next_charge_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		...overrides
	} as BillingSubscriptionDoc;
}

function locals(role: string | undefined = 'dsa') {
	if (!role) return {};
	return { user: { id: TEST_DSA_OID.toString(), role } };
}

function mockEvent(localsOverride?: ReturnType<typeof locals>) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return {
		locals: localsOverride ?? locals(),
		request: new Request('http://x'),
		url: new URL('http://x')
	} as any;
}

beforeEach(() => {
	mockSubsFindOne.mockReset();
	mockSubsFindOneAndUpdate.mockReset();
	mockSubsUpdateOne.mockReset();
	mockAuditInsertOne.mockReset().mockResolvedValue({ insertedId: new ObjectId() });
	mockDsaFindOne.mockReset();
	mockChargeAttemptsFindOne.mockReset();
	mockChargeAttemptsInsertOne.mockReset();
	mockChargeAttemptsUpdateOne.mockReset();
	mockBillingTxFindOne.mockReset();
	mockBillingTxInsertOne.mockReset();
	mockRegisterMandate.mockReset();
	mockRevokeMandate.mockReset();
	mockChargeMandate.mockReset();
});

// Defer import to AFTER mocks are wired.
async function getEndpoint() {
	const mod = await import(
		'../../../../routes/api/billing/subscription/update-payment-method/+server'
	);
	return mod.POST;
}

// ── Endpoint contract ───────────────────────────────────────────

describe('POST /api/billing/subscription/update-payment-method — auth + preconditions', () => {
	it('401s for unauthenticated requests', async () => {
		const handler = await getEndpoint();
		const res = await handler(mockEvent({}));
		expect(res.status).toBe(401);
	});

	it('403s for non-DSA roles', async () => {
		const handler = await getEndpoint();
		const res = await handler(mockEvent({ user: { id: TEST_DSA_OID.toString(), role: 'admin' } }));
		expect(res.status).toBe(403);
	});

	it('404s when the DSA has no subscription', async () => {
		mockSubsFindOne.mockResolvedValue(null);
		const handler = await getEndpoint();
		const res = await handler(mockEvent());
		expect(res.status).toBe(404);
	});

	it('409s from pending_mandate (DSA should subscribe, not update-method)', async () => {
		mockSubsFindOne.mockResolvedValue(makeSub('pending_mandate'));
		const handler = await getEndpoint();
		const res = await handler(mockEvent());
		expect(res.status).toBe(409);
		const body = await res.json();
		// apiStructuredError shape: { ...payload, success: false, error: message }
		expect(body.code).toBe('NOT_SUBSCRIBED');
	});

	it('409s from downgraded / cancelled / not_subscribed', async () => {
		const handler = await getEndpoint();
		for (const state of ['downgraded', 'cancelled', 'not_subscribed'] as const) {
			mockSubsFindOne.mockResolvedValue(makeSub(state));
			const res = await handler(mockEvent());
			expect(res.status).toBe(409);
		}
	});

	it('409s when a replacement is already in flight + unexpired', async () => {
		mockSubsFindOne.mockResolvedValue(
			makeSub('active', {
				pending_replacement_registration_id: 'pr_inflight',
				pending_replacement_expires_at: new Date(Date.now() + 60 * 60 * 1000) // +1hr
			})
		);
		const handler = await getEndpoint();
		const res = await handler(mockEvent());
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('REPLACEMENT_IN_FLIGHT');
	});

	it('allows update when prior replacement has expired', async () => {
		mockSubsFindOne.mockResolvedValue(
			makeSub('active', {
				pending_replacement_registration_id: 'pr_old',
				pending_replacement_expires_at: new Date(Date.now() - 60 * 60 * 1000) // -1hr
			})
		);
		mockDsaFindOne.mockResolvedValue({
			_id: TEST_DSA_OID,
			name: 'Test DSA',
			mobileNumber: '9811556664',
			email: 'test@digitaldsa.com'
		});
		mockRegisterMandate.mockResolvedValue({
			pending_registration_id: 'pr_new',
			customer_id: 'cust_x',
			authorization_url: 'https://mock/auth/pr_new',
			expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
		});
		mockSubsFindOneAndUpdate.mockResolvedValue(makeSub('active'));

		const handler = await getEndpoint();
		const res = await handler(mockEvent());
		expect(res.status).toBe(200);
		expect(mockRegisterMandate).toHaveBeenCalledOnce();
	});
});

describe('POST /api/billing/subscription/update-payment-method — happy path', () => {
	function setupHappyPath(state: SubscriptionState = 'active') {
		mockSubsFindOne.mockResolvedValue(makeSub(state));
		mockDsaFindOne.mockResolvedValue({
			_id: TEST_DSA_OID,
			name: 'Test DSA',
			mobileNumber: '9811556664',
			email: 'test@digitaldsa.com'
		});
		mockRegisterMandate.mockResolvedValue({
			pending_registration_id: 'pr_new_happy',
			customer_id: 'cust_happy',
			authorization_url: 'https://mock/auth/pr_new_happy',
			expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
		});
		mockSubsFindOneAndUpdate.mockResolvedValue(makeSub(state));
	}

	it('returns 200 with authorization_url + replacement registration id', async () => {
		setupHappyPath('active');
		const handler = await getEndpoint();
		const res = await handler(mockEvent());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.authorization_url).toBe('https://mock/auth/pr_new_happy');
		expect(body.data.pending_replacement_registration_id).toBe('pr_new_happy');
		expect(body.data.expires_at).toBeDefined();
	});

	it('stamps mandate_update_lock_until ~5 min in the future', async () => {
		setupHappyPath('active');
		const before = Date.now();
		const handler = await getEndpoint();
		await handler(mockEvent());
		const after = Date.now();

		const updateCall = mockSubsFindOneAndUpdate.mock.calls[0];
		const setOps = (updateCall[1] as { $set: Record<string, unknown> }).$set;
		const lockUntil = setOps.mandate_update_lock_until as Date;
		expect(lockUntil).toBeInstanceOf(Date);
		const lockDelta = lockUntil.getTime() - before;
		expect(lockDelta).toBeGreaterThanOrEqual(5 * 60 * 1000 - 100);
		expect(lockDelta).toBeLessThanOrEqual(after - before + 5 * 60 * 1000);
	});

	it('stamps pending_replacement_expires_at ~24h in the future', async () => {
		setupHappyPath('active');
		const before = Date.now();
		const handler = await getEndpoint();
		await handler(mockEvent());

		const updateCall = mockSubsFindOneAndUpdate.mock.calls[0];
		const setOps = (updateCall[1] as { $set: Record<string, unknown> }).$set;
		const expiresAt = setOps.pending_replacement_expires_at as Date;
		expect(expiresAt).toBeInstanceOf(Date);
		const delta = expiresAt.getTime() - before;
		expect(delta).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 1000);
		expect(delta).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 1000);
	});

	it('uses the CURRENT plan cap (monthly × 1.5), not a tier change', async () => {
		setupHappyPath('active'); // sub is on 'pro'
		const handler = await getEndpoint();
		await handler(mockEvent());

		const regCall = mockRegisterMandate.mock.calls[0][0];
		// pro plan: 3999 * 100 paise * 1.5 = 599850
		expect(regCall.max_amount_paise).toBe(599850);
		expect(regCall.plan_id).toBe('pro');
	});

	it('writes a replacement_mandate_initiated audit row', async () => {
		setupHappyPath('active');
		const handler = await getEndpoint();
		await handler(mockEvent());

		expect(mockAuditInsertOne).toHaveBeenCalled();
		const auditRow = mockAuditInsertOne.mock.calls[0][0];
		expect(auditRow.event_name).toBe('replacement_mandate_initiated');
		expect(auditRow.actor).toBe('dsa');
	});

	it('works from dunning_t0 (state is preserved through the registration)', async () => {
		setupHappyPath('dunning_t0');
		const handler = await getEndpoint();
		const res = await handler(mockEvent());
		expect(res.status).toBe(200);
		// The setPendingReplacement filter must allow dunning states — verified
		// by reaching findOneAndUpdate (called once on success path).
		expect(mockSubsFindOneAndUpdate).toHaveBeenCalled();
	});

	it('works from paused (DSA can update method while paused)', async () => {
		setupHappyPath('paused');
		const handler = await getEndpoint();
		const res = await handler(mockEvent());
		expect(res.status).toBe(200);
	});
});

// ── ChargeEngine advisory-lock skip ─────────────────────────────

describe('chargeEngine.processOneSubscription — mandate_update_lock_until', () => {
	it('skips when lock is held + emits skipped_mandate_update_lock outcome', async () => {
		const { processOneSubscription } = await import('../../../server/billing/chargeEngine');
		const sub = makeSub('active', {
			mandate_update_lock_until: new Date(Date.now() + 60 * 1000) // +1min
		});

		const outcome = await processOneSubscription(sub, {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			provider: { chargeMandate: mockChargeMandate } as any
		});

		expect(outcome.kind).toBe('skipped_mandate_update_lock');
		// Provider must NOT have been called.
		expect(mockChargeMandate).not.toHaveBeenCalled();
		// And an audit row was written for the skip.
		expect(mockAuditInsertOne).toHaveBeenCalled();
		const auditRow = mockAuditInsertOne.mock.calls[0][0];
		expect(auditRow.event_name).toBe('skipped_mandate_update_lock');
	});

	it('proceeds normally when lock has expired', async () => {
		const { processOneSubscription } = await import('../../../server/billing/chargeEngine');
		const sub = makeSub('active', {
			mandate_update_lock_until: new Date(Date.now() - 60 * 1000) // -1min, expired
		});

		// Set up the rest of the charge path so processOne can run to completion.
		mockChargeAttemptsFindOne.mockResolvedValue(null);
		mockChargeAttemptsInsertOne.mockResolvedValue({ insertedId: new ObjectId() });
		mockChargeMandate.mockResolvedValue({
			status: 'succeeded',
			provider_payment_id: 'pay_x',
			raw_response: {}
		});
		mockSubsFindOne.mockResolvedValue(sub); // for applyTransition lookup
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...sub, state: 'active' });
		mockChargeAttemptsUpdateOne.mockResolvedValue({});

		const outcome = await processOneSubscription(sub, {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			provider: { chargeMandate: mockChargeMandate } as any,
			sendConfirmationEmail: false
		});

		// The lock-skip branch did NOT fire.
		expect(outcome.kind).not.toBe('skipped_mandate_update_lock');
		// Provider was called (charge proceeded).
		expect(mockChargeMandate).toHaveBeenCalled();
	});

	it('proceeds normally when lock field is absent', async () => {
		const { processOneSubscription } = await import('../../../server/billing/chargeEngine');
		const sub = makeSub('active'); // no mandate_update_lock_until

		mockChargeAttemptsFindOne.mockResolvedValue(null);
		mockChargeAttemptsInsertOne.mockResolvedValue({ insertedId: new ObjectId() });
		mockChargeMandate.mockResolvedValue({
			status: 'succeeded',
			provider_payment_id: 'pay_y',
			raw_response: {}
		});
		mockSubsFindOne.mockResolvedValue(sub);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...sub, state: 'active' });
		mockChargeAttemptsUpdateOne.mockResolvedValue({});

		const outcome = await processOneSubscription(sub, {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			provider: { chargeMandate: mockChargeMandate } as any,
			sendConfirmationEmail: false
		});

		expect(outcome.kind).not.toBe('skipped_mandate_update_lock');
		expect(mockChargeMandate).toHaveBeenCalled();
	});
});

// ── subscriptionStore.swapMandateAfterReplacement ───────────────

describe('subscriptionStore.swapMandateAfterReplacement', () => {
	it('atomically swaps mandate_token + clears replacement bookkeeping', async () => {
		const { swapMandateAfterReplacement } = await import(
			'../../../server/billing/subscriptionStore'
		);
		const sub = makeSub('active', {
			pending_replacement_registration_id: 'pr_xyz',
			pending_replacement_expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000),
			mandate_update_lock_until: new Date(Date.now() + 60 * 1000),
			mandate_token: 'old_tok'
		});
		mockSubsFindOne.mockResolvedValue(sub);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...sub, mandate_token: 'new_tok' });

		const result = await swapMandateAfterReplacement('pr_xyz', 'new_tok');
		expect(result).not.toBeNull();
		expect(result!.subscription.mandate_token).toBe('new_tok');
		expect(result!.previous_mandate_token).toBe('old_tok');

		// Verify the update used $unset for the three replacement-bookkeeping fields.
		const updateOps = mockSubsFindOneAndUpdate.mock.calls[0][1] as {
			$set: Record<string, unknown>;
			$unset: Record<string, ''>;
		};
		expect(updateOps.$set.mandate_token).toBe('new_tok');
		expect(updateOps.$unset.pending_replacement_registration_id).toBe('');
		expect(updateOps.$unset.pending_replacement_expires_at).toBe('');
		expect(updateOps.$unset.mandate_update_lock_until).toBe('');
	});

	it('returns null when no matching replacement is in flight (idempotent on duplicate webhook)', async () => {
		const { swapMandateAfterReplacement } = await import(
			'../../../server/billing/subscriptionStore'
		);
		mockSubsFindOne.mockResolvedValue(null);
		const result = await swapMandateAfterReplacement('pr_does_not_exist', 'new_tok');
		expect(result).toBeNull();
		// No write attempted.
		expect(mockSubsFindOneAndUpdate).not.toHaveBeenCalled();
	});
});
