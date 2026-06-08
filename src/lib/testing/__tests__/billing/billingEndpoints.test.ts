/**
 * D.1 S2.1 — Endpoint smoke tests
 * ══════════════════════════════════════════════════════════════════
 * Order-of-operations contracts for the 4 S2.1 endpoints. Mongo +
 * provider + auth all mocked so we exercise the handler orchestration
 * without live integration.
 *
 *   POST /api/billing/subscribe-recurring   — DSA-initiated subscribe
 *   POST /api/billing/webhook/razorpay      — webhook dispatch
 *   POST /api/cron/billing-pending-cleanup  — 24h TTL sweep
 *   GET  /api/billing/subscription/status   — polling endpoint
 *
 * Sibling file billing/subscriptionStore.test.ts covers the helpers
 * underneath; this file's job is the endpoint-level wiring.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { createHmac } from 'node:crypto';

// ── Mock setup ─────────────────────────────────────────────────

const TEST_DSA_OID = new ObjectId();
const TEST_WEBHOOK_SECRET = 'test-webhook-secret-fixture';

const mockDsaApplicationsFindOne = vi.fn();
const mockSubsFindOne = vi.fn();
const mockSubsFind = vi.fn();
const mockSubsFindOneAndUpdate = vi.fn();
const mockWebhookInsertOne = vi.fn();
// S3 M5 — webhook handlers now consult ChargeAttempts + BillingTransactions +
// BillingAuditLogs. Default return is null/empty so existing tests keep passing
// (the new charge.succeeded/failed handlers no-op when no prior attempt exists).
const mockChargeAttemptsFindOne = vi.fn();
const mockBillingTxFindOne = vi.fn();
const mockBillingTxInsertOne = vi.fn();
const mockBillingAuditInsertOne = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	DsaApplications: {
		findOne: (...args: unknown[]) => mockDsaApplicationsFindOne(...args)
	},
	BillingSubscriptions: {
		findOne: (...args: unknown[]) => mockSubsFindOne(...args),
		insertOne: vi.fn(),
		updateOne: vi.fn(),
		findOneAndUpdate: (...args: unknown[]) => mockSubsFindOneAndUpdate(...args),
		find: (...args: unknown[]) => mockSubsFind(...args)
	},
	ProcessedWebhookEvents: {
		insertOne: (...args: unknown[]) => mockWebhookInsertOne(...args)
	},
	ChargeAttempts: {
		findOne: (...args: unknown[]) => mockChargeAttemptsFindOne(...args),
		// Added for S4 retry-now endpoint tests — processOneSubscription
		// inserts a pending row and updates it after the provider call.
		insertOne: vi.fn(async () => ({ insertedId: new ObjectId() })),
		updateOne: vi.fn(async () => ({ acknowledged: true, modifiedCount: 1 }))
	},
	BillingTransactions: {
		findOne: (...args: unknown[]) => mockBillingTxFindOne(...args),
		insertOne: (...args: unknown[]) => mockBillingTxInsertOne(...args)
	},
	BillingAuditLogs: {
		insertOne: (...args: unknown[]) => mockBillingAuditInsertOne(...args)
	},
	// D.2 — generateInvoice is called from chargeEngine.handleSuccess.
	// Stubbed here so the retry-now test's charge path doesn't hit real
	// Invoices/InvoiceCounters lookups.
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
	rateLimit: vi.fn(async () => false) // never limited in tests
}));

vi.mock('$lib/server/guards', () => ({
	requireRoleApi: vi.fn((locals: { user?: { id: string } }) => {
		if (!locals.user) return new Response('Unauthorized', { status: 401 });
		return null;
	}),
	blockDemoWrite: vi.fn(() => null)
}));

// Mock the provider registry to return a programmable stub.
const mockProvider = {
	name: 'mock' as const,
	registerMandate: vi.fn(),
	chargeMandate: vi.fn(),
	refundCharge: vi.fn(),
	queryMandateStatus: vi.fn(),
	fetchSettlements: vi.fn(),
	verifyWebhookSignature: vi.fn(),
	parseWebhookEvent: vi.fn()
};
vi.mock('$lib/server/billing/providerRegistry', () => ({
	getBillingProvider: () => mockProvider
}));

// Mock env for CRON_SECRET
vi.mock('$env/dynamic/private', () => ({
	env: { CRON_SECRET: 'test-cron-secret-fixture' }
}));

// Mutable $app/environment.dev — flipped per-test to exercise both
// the dev-mode admin bypass and the production block on subscribe-
// recurring + status endpoints. Default is `true` because the broader
// suite (e.g. trialEligibility.getPepper) requires dev semantics: it
// throws in production when TRIAL_PEPPER env isn't set, and the test
// env doesn't set it. Tests that exercise the USER_NOT_DSA production
// path explicitly assign `mockDev = false` and rely on beforeEach to
// reset.
let mockDev = true;
vi.mock('$app/environment', () => ({
	get dev() {
		return mockDev;
	}
}));

// Import handlers AFTER mocks.
import { POST as subscribeRecurringPOST } from '../../../../routes/api/billing/subscribe-recurring/+server';
import { POST as webhookPOST } from '../../../../routes/api/billing/webhook/razorpay/+server';
import { POST as cronPOST } from '../../../../routes/api/cron/billing-pending-cleanup/+server';
import { GET as statusGET } from '../../../../routes/api/billing/subscription/status/+server';
import { POST as retryNowPOST } from '../../../../routes/api/billing/subscription/retry-now/+server';

// ── Test helpers ───────────────────────────────────────────────

function makeRequest(url: string, body: unknown, headers: Record<string, string> = {}): Request {
	return new Request(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
}

function authedLocals() {
	return {
		user: { id: TEST_DSA_OID.toHexString() }
	} as unknown as App.Locals;
}

beforeEach(() => {
	mockDev = true; // suite default — see $app/environment mock above
	mockDsaApplicationsFindOne.mockReset();
	// Default: caller's JWT user.id maps to a real DSA doc. The subscribe
	// and status endpoints both gate on this lookup so a non-DSA identity
	// (admin / RM with a different _id) returns USER_NOT_DSA. Real flows
	// always satisfy this (auth requires the doc to exist), so the default
	// here mirrors production. Tests that exercise the USER_NOT_DSA path
	// override with `.mockResolvedValueOnce(null)`.
	mockDsaApplicationsFindOne.mockResolvedValue({
		_id: TEST_DSA_OID,
		name: 'Test DSA',
		mobileNumber: 9999999999,
		email: 'test-dsa@example.com'
	});
	mockSubsFindOne.mockReset();
	mockSubsFind.mockReset();
	mockSubsFindOneAndUpdate.mockReset();
	mockWebhookInsertOne.mockReset();
	// D.2 — chargeEngine reads txInsert.insertedId after BillingTransactions.insertOne
	// to pass to generateInvoice. Default to a real ObjectId so the retry-now test
	// (which exercises the success path via processOneSubscription) doesn't throw.
	mockBillingTxInsertOne.mockReset().mockResolvedValue({ insertedId: new ObjectId() });
	for (const fn of Object.values(mockProvider)) {
		if (typeof fn === 'function' && 'mockReset' in fn) (fn as { mockReset: () => void }).mockReset();
	}
});

// ══ POST /api/billing/subscribe-recurring ════════════════════════════

describe('subscribe-recurring endpoint', () => {
	it('rejects with 401 when caller is not authenticated', async () => {
		const event = {
			request: makeRequest('http://test/api/billing/subscribe-recurring', { plan_id: 'pro' }),
			locals: {} as App.Locals
		};
		const res = await subscribeRecurringPOST(event as Parameters<typeof subscribeRecurringPOST>[0]);
		expect(res.status).toBe(401);
	});

	it('rejects invalid plan_id with 400', async () => {
		const event = {
			request: makeRequest('http://test/api/billing/subscribe-recurring', {
				plan_id: 'nonexistent'
			}),
			locals: authedLocals()
		};
		const res = await subscribeRecurringPOST(event as Parameters<typeof subscribeRecurringPOST>[0]);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toContain('Invalid plan');
	});

	// ── USER_NOT_DSA identity gate (added S216 2026-06-02) ─────────
	//
	// The endpoint gates on DsaApplications.findOne BEFORE the trial /
	// plan / provider flow. Two paths must be locked so a future refactor
	// can't silently drop them: production returns structured 403; dev
	// falls through to the JWT payload so admin testers can drive the
	// Razorpay test-mode flow end-to-end.

	it('returns structured 403 USER_NOT_DSA in production when caller is not a DSA', async () => {
		mockDev = false;
		mockDsaApplicationsFindOne.mockResolvedValueOnce(null);
		const event = {
			request: makeRequest('http://test/api/billing/subscribe-recurring', { plan_id: 'pro' }),
			locals: authedLocals()
		};
		const res = await subscribeRecurringPOST(event as Parameters<typeof subscribeRecurringPOST>[0]);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.code).toBe('USER_NOT_DSA');
		expect(body.error).toMatch(/non-DSA identity/i);
		// Provider must NOT be called when the gate trips — orphan Razorpay
		// customer records are the failure mode this gate prevents.
		expect(mockProvider.registerMandate).not.toHaveBeenCalled();
	});

	it('dev-mode bypass: when !dsaDoc && dev, falls through to JWT payload and calls provider', async () => {
		mockDev = true;
		mockDsaApplicationsFindOne.mockResolvedValueOnce(null);
		mockProvider.registerMandate.mockResolvedValueOnce({
			pending_registration_id: 'inv_test_dev_bypass',
			customer_id: 'cust_dev',
			authorization_url: 'https://rzp.test/auth',
			expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
		});
		mockSubsFindOne.mockResolvedValueOnce(null); // no existing sub
		mockSubsFindOneAndUpdate.mockResolvedValueOnce({ value: { _id: new ObjectId() } });

		const event = {
			request: makeRequest('http://test/api/billing/subscribe-recurring', { plan_id: 'pro' }),
			locals: {
				user: {
					id: TEST_DSA_OID.toHexString(),
					name: 'Admin Tester',
					email: 'admin@example.com',
					mobileNumber: '9999999999'
				}
			} as unknown as App.Locals
		};
		const res = await subscribeRecurringPOST(event as Parameters<typeof subscribeRecurringPOST>[0]);
		// Should NOT 403 in dev — bypass active.
		expect(res.status).not.toBe(403);
		// Provider was called with JWT-payload-derived customer fields.
		expect(mockProvider.registerMandate).toHaveBeenCalledTimes(1);
		const call = mockProvider.registerMandate.mock.calls[0][0];
		expect(call.customer_name).toBe('Admin Tester');
		expect(call.customer_email).toBe('admin@example.com');
		// E.164 normalization of the JWT mobile.
		expect(call.customer_mobile).toBe('+919999999999');
	});

	it('email fallback uses example.com (RFC 2606) when JWT lacks email — never .placeholder', async () => {
		// Locks the fix for the dev-mode Razorpay 500 — `.placeholder` TLD
		// failed Razorpay validation; `example.com` is RFC-reserved and
		// always passes format validators. Regression here = re-introducing
		// the 500 surfaced 2026-06-01.
		mockDev = true;
		mockDsaApplicationsFindOne.mockResolvedValueOnce(null);
		mockProvider.registerMandate.mockResolvedValueOnce({
			pending_registration_id: 'inv_fallback',
			customer_id: 'cust_fb',
			authorization_url: 'https://rzp.test/fb',
			expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
		});
		mockSubsFindOne.mockResolvedValueOnce(null);
		mockSubsFindOneAndUpdate.mockResolvedValueOnce({ value: { _id: new ObjectId() } });

		const event = {
			request: makeRequest('http://test/api/billing/subscribe-recurring', { plan_id: 'pro' }),
			locals: {
				user: {
					id: TEST_DSA_OID.toHexString(),
					name: 'Anon Admin',
					// email intentionally omitted — triggers the fallback path
					mobileNumber: '9999999999'
				}
			} as unknown as App.Locals
		};
		await subscribeRecurringPOST(event as Parameters<typeof subscribeRecurringPOST>[0]);
		const call = mockProvider.registerMandate.mock.calls[0][0];
		expect(call.customer_email).toBe(`${TEST_DSA_OID.toHexString()}@example.com`);
		expect(call.customer_email).not.toMatch(/\.placeholder$/);
	});

	it('rejects 409 when DSA already has an active subscription', async () => {
		mockDsaApplicationsFindOne.mockResolvedValue({
			_id: TEST_DSA_OID,
			name: 'Test DSA',
			email: 'test@example.com',
			mobileNumber: 9811556664
		});
		mockSubsFindOne.mockResolvedValue({
			_id: new ObjectId(),
			dsa_id: TEST_DSA_OID,
			state: 'active',
			plan_id: 'pro',
			max_amount_paise: 599_800,
			billing_cycle: 'monthly',
			provider: 'razorpay',
			failed_attempt_count: 0,
			state_history: [],
			created_at: new Date(),
			updated_at: new Date()
		});

		const event = {
			request: makeRequest('http://test/api/billing/subscribe-recurring', { plan_id: 'pro' }),
			locals: authedLocals()
		};
		const res = await subscribeRecurringPOST(event as Parameters<typeof subscribeRecurringPOST>[0]);
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('ACTIVE_SUBSCRIPTION_EXISTS');
		expect(body.currentState).toBe('active');
	});

	it('happy path: returns auth URL + disclosure copy for first-time subscriber', async () => {
		mockDsaApplicationsFindOne.mockResolvedValue({
			_id: TEST_DSA_OID,
			name: 'Smoke Test DSA',
			email: 'smoke@example.com',
			mobileNumber: 9811556664
		});
		mockSubsFindOne.mockResolvedValue(null); // no existing subscription
		mockProvider.registerMandate.mockResolvedValue({
			pending_registration_id: 'inv_test_abc',
			customer_id: 'cust_test_xyz',
			authorization_url: 'https://rzp.io/i/test_auth',
			expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
		});

		const event = {
			request: makeRequest('http://test/api/billing/subscribe-recurring', { plan_id: 'pro' }),
			locals: authedLocals()
		};
		const res = await subscribeRecurringPOST(event as Parameters<typeof subscribeRecurringPOST>[0]);
		expect(res.status).toBe(200);
		const { data } = await res.json();
		expect(data.authorization_url).toBe('https://rzp.io/i/test_auth');
		expect(data.pending_registration_id).toBe('inv_test_abc');
		expect(data.first_charge_at).toBeDefined();
		expect(data.free_days_count).toBeGreaterThan(0);
		// Disclosure copy locked per §11.1 + §4 S2
		expect(data.disclosure.verification_charge).toContain('₹1 debit and ₹1 refund');
		expect(data.disclosure.free_access).toContain('free access');

		// Provider was called with correct shape
		const regCall = mockProvider.registerMandate.mock.calls[0][0];
		expect(regCall.plan_id).toBe('pro');
		expect(regCall.max_amount_paise).toBe(Math.round(399900 * 1.5));
		expect(regCall.verification_charge_paise).toBe(100);
	});
});

// ══ POST /api/billing/webhook/razorpay ════════════════════════════════

describe('webhook/razorpay endpoint', () => {
	function signedRequest(body: object, secret = TEST_WEBHOOK_SECRET): Request {
		const raw = JSON.stringify(body);
		const sig = createHmac('sha256', secret).update(raw).digest('hex');
		return makeRequest('http://test/api/billing/webhook/razorpay', raw, {
			'x-razorpay-signature': sig
		});
	}

	it('returns 401 when signature is invalid', async () => {
		mockProvider.verifyWebhookSignature.mockReturnValue(false);
		const event = {
			request: makeRequest('http://test/api/billing/webhook/razorpay', { event: 'subscription.charged' }, {
				'x-razorpay-signature': 'forged'
			}),
			locals: {} as App.Locals
		};
		const res = await webhookPOST(event as Parameters<typeof webhookPOST>[0]);
		expect(res.status).toBe(401);
	});

	it('returns 200 ignored when event_type is unknown', async () => {
		mockProvider.verifyWebhookSignature.mockReturnValue(true);
		mockProvider.parseWebhookEvent.mockReturnValue(null); // unknown event
		const event = {
			request: signedRequest({ event: 'order.paid' }) as unknown,
			locals: {} as App.Locals
		};
		const wrappedEvent = {
			request: event.request as Request,
			locals: {} as App.Locals
		};
		const res = await webhookPOST(wrappedEvent as Parameters<typeof webhookPOST>[0]);
		expect(res.status).toBe(200);
		const { data } = await res.json();
		expect(data.ignored).toBe(true);
	});

	it('returns 200 duplicate when event id was already processed', async () => {
		mockProvider.verifyWebhookSignature.mockReturnValue(true);
		mockProvider.parseWebhookEvent.mockReturnValue({
			provider_event_id: 'evt_dup',
			event_type: 'charge.succeeded',
			provider_payment_id: 'pay_x',
			occurred_at: new Date(),
			raw: {}
		});
		mockWebhookInsertOne.mockRejectedValue({ code: 11000 }); // dup key

		const event = {
			request: signedRequest({ event: 'subscription.charged', id: 'evt_dup' }),
			locals: {} as App.Locals
		};
		const res = await webhookPOST(event as Parameters<typeof webhookPOST>[0]);
		expect(res.status).toBe(200);
		const { data } = await res.json();
		expect(data.duplicate).toBe(true);
	});

	it('mandate.authorized triggers state transition', async () => {
		mockProvider.verifyWebhookSignature.mockReturnValue(true);
		mockProvider.parseWebhookEvent.mockReturnValue({
			provider_event_id: 'evt_auth_1',
			event_type: 'mandate.authorized',
			mandate_token: 'token_new',
			occurred_at: new Date(),
			raw: {
				payload: {
					token: { entity: { entity_id: 'inv_reg_abc' } }
				}
			}
		});
		mockWebhookInsertOne.mockResolvedValue({ insertedId: 'evt_auth_1' });

		// findByPendingRegistrationId resolves to a pending sub
		const pendingSub = {
			_id: new ObjectId(),
			dsa_id: TEST_DSA_OID,
			state: 'pending_mandate',
			plan_id: 'pro',
			billing_cycle: 'monthly',
			provider: 'razorpay',
			max_amount_paise: 599_800,
			failed_attempt_count: 0,
			pending_registration_id: 'inv_reg_abc',
			state_history: [],
			created_at: new Date(),
			updated_at: new Date()
		};
		// First findOne (findByPendingRegistrationId) returns the pending sub.
		// Subsequent findOne calls (applyTransition's precondition check) also return it.
		mockSubsFindOne.mockResolvedValue(pendingSub);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...pendingSub, state: 'active' });

		const event = {
			request: signedRequest({
				event: 'token.confirmed',
				id: 'evt_auth_1',
				payload: { token: { entity: { id: 'token_new', entity_id: 'inv_reg_abc' } } }
			}),
			locals: {} as App.Locals
		};
		const res = await webhookPOST(event as Parameters<typeof webhookPOST>[0]);
		expect(res.status).toBe(200);
		expect(mockSubsFindOneAndUpdate).toHaveBeenCalled();
		const updateCall = mockSubsFindOneAndUpdate.mock.calls[0];
		expect(updateCall[1].$set.state).toBe('active');
		expect(updateCall[1].$set.mandate_token).toBe('token_new');
		expect(updateCall[1].$set.anchor_day).toBeDefined();
		expect(updateCall[1].$set.next_charge_at).toBeInstanceOf(Date);
	});

	it('charge.succeeded is acknowledged but not authoritative (S3 cron owns)', async () => {
		mockProvider.verifyWebhookSignature.mockReturnValue(true);
		mockProvider.parseWebhookEvent.mockReturnValue({
			provider_event_id: 'evt_charge_1',
			event_type: 'charge.succeeded',
			provider_payment_id: 'pay_x',
			occurred_at: new Date(),
			raw: {}
		});
		mockWebhookInsertOne.mockResolvedValue({ insertedId: 'evt_charge_1' });

		const event = {
			request: signedRequest({ event: 'subscription.charged', id: 'evt_charge_1' }),
			locals: {} as App.Locals
		};
		const res = await webhookPOST(event as Parameters<typeof webhookPOST>[0]);
		expect(res.status).toBe(200);
		const { data } = await res.json();
		expect(data.processed).toBe(true);
		// No state transition was triggered (S3 cron is authoritative for renewal).
		expect(mockSubsFindOneAndUpdate).not.toHaveBeenCalled();
	});
});

// ══ POST /api/cron/billing-pending-cleanup ═══════════════════════════

describe('billing-pending-cleanup cron endpoint', () => {
	it('rejects with 401 when x-cron-secret is missing', async () => {
		const event = {
			request: makeRequest('http://test/api/cron/billing-pending-cleanup', {}),
			locals: {} as App.Locals
		};
		const res = await cronPOST(event as Parameters<typeof cronPOST>[0]);
		expect(res.status).toBe(401);
	});

	it('rejects with 401 when x-cron-secret is wrong', async () => {
		const event = {
			request: makeRequest('http://test/api/cron/billing-pending-cleanup', {}, {
				'x-cron-secret': 'wrong'
			}),
			locals: {} as App.Locals
		};
		const res = await cronPOST(event as Parameters<typeof cronPOST>[0]);
		expect(res.status).toBe(401);
	});

	it('happy path: returns swept count when secret is correct', async () => {
		mockSubsFind.mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });
		const event = {
			request: makeRequest('http://test/api/cron/billing-pending-cleanup', {}, {
				'x-cron-secret': 'test-cron-secret-fixture'
			}),
			locals: {} as App.Locals
		};
		const res = await cronPOST(event as Parameters<typeof cronPOST>[0]);
		expect(res.status).toBe(200);
		const { data } = await res.json();
		expect(data.swept).toBe(0);
		expect(data.started_at).toBeDefined();
		expect(data.completed_at).toBeDefined();
	});
});

// ══ GET /api/billing/subscription/status ═════════════════════════════

describe('subscription/status endpoint', () => {
	it('returns not_subscribed when DSA has no doc', async () => {
		mockSubsFindOne.mockResolvedValue(null);
		const event = { locals: authedLocals() };
		const res = await statusGET(event as Parameters<typeof statusGET>[0]);
		expect(res.status).toBe(200);
		const { data } = await res.json();
		expect(data.state).toBe('not_subscribed');
		expect(data.plan_id).toBeNull();
	});

	it('returns sanitized fields (no mandate_token or provider_customer_id) when DSA has active sub', async () => {
		mockSubsFindOne.mockResolvedValue({
			_id: new ObjectId(),
			dsa_id: TEST_DSA_OID,
			state: 'active',
			plan_id: 'pro',
			billing_cycle: 'monthly',
			provider: 'razorpay',
			mandate_token: 'token_secret_xyz', // should NOT leak
			provider_customer_id: 'cust_secret_xyz', // should NOT leak
			anchor_day: 5,
			next_charge_at: new Date('2026-06-05T00:00:00Z'),
			max_amount_paise: 599_800,
			failed_attempt_count: 0,
			state_history: [
				{
					from: 'pending_mandate',
					to: 'active',
					at: new Date('2026-05-25T00:00:00Z'),
					reason: 'webhook'
				}
			],
			created_at: new Date(),
			updated_at: new Date()
		});

		const event = { locals: authedLocals() };
		const res = await statusGET(event as Parameters<typeof statusGET>[0]);
		const { data } = await res.json();
		expect(data.state).toBe('active');
		expect(data.plan_id).toBe('pro');
		expect(data.plan_name).toBe('Pro');
		expect(data.anchor_day).toBe(5);
		// PII redaction
		expect(data.mandate_token).toBeUndefined();
		expect(data.provider_customer_id).toBeUndefined();
		// History is included (last 3 entries)
		expect(data.recent_history).toHaveLength(1);
		expect(data.recent_history[0].to).toBe('active');
	});

	it('rejects unauthenticated callers', async () => {
		const event = { locals: {} as App.Locals };
		const res = await statusGET(event as Parameters<typeof statusGET>[0]);
		expect(res.status).toBe(401);
	});

	// ── USER_NOT_DSA identity gate (added S216 2026-06-02) ─────────
	//
	// Pre-S216 the status endpoint silently returned state='not_subscribed'
	// for non-DSA callers, which made the billing page render the Subscribe
	// button that would then 403 on click. Locking the production-mode gate
	// so a future refactor can't reintroduce that silent-degradation path.

	it('returns structured 403 USER_NOT_DSA in production when caller is not a DSA', async () => {
		mockDev = false;
		mockDsaApplicationsFindOne.mockResolvedValueOnce(null);
		const event = { locals: authedLocals() };
		const res = await statusGET(event as Parameters<typeof statusGET>[0]);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.code).toBe('USER_NOT_DSA');
		// findByDsaId must NOT be queried when the gate trips — pre-S216
		// the silent fall-through was exactly findByDsaId returning null
		// and the endpoint reporting 'not_subscribed' to a non-DSA caller.
		expect(mockSubsFindOne).not.toHaveBeenCalled();
	});
});

// ══ POST /api/billing/subscription/retry-now (D.1 S4) ═══════════════════

describe('retry-now endpoint', () => {
	const TEST_USER_ID = TEST_DSA_OID.toString();

	function authedEvent() {
		return {
			locals: { user: { id: TEST_USER_ID, role: 'dsa' } } as App.Locals
		};
	}

	it('rejects unauthenticated callers with 401', async () => {
		const event = { locals: {} as App.Locals };
		const res = await retryNowPOST(event as Parameters<typeof retryNowPOST>[0]);
		expect(res.status).toBe(401);
	});

	it('404 when DSA has no subscription', async () => {
		mockSubsFindOne.mockResolvedValue(null);
		const res = await retryNowPOST(authedEvent() as Parameters<typeof retryNowPOST>[0]);
		expect(res.status).toBe(404);
	});

	it('404 when subscription is active (not in dunning) — UI should not expose the button here', async () => {
		mockSubsFindOne.mockResolvedValue({
			_id: new ObjectId(),
			dsa_id: TEST_DSA_OID,
			state: 'active',
			plan_id: 'pro',
			billing_cycle: 'monthly',
			provider: 'mock',
			mandate_token: 'tok',
			max_amount_paise: 599_800,
			failed_attempt_count: 0,
			state_history: [],
			created_at: new Date(),
			updated_at: new Date()
		});
		const res = await retryNowPOST(authedEvent() as Parameters<typeof retryNowPOST>[0]);
		expect(res.status).toBe(404);
	});

	it('proceeds when subscription is in dunning_t0 and returns the engine outcome', async () => {
		const sub = {
			_id: new ObjectId(),
			dsa_id: TEST_DSA_OID,
			state: 'dunning_t0',
			plan_id: 'pro',
			billing_cycle: 'monthly',
			provider: 'mock',
			mandate_token: 'tok',
			provider_customer_id: 'cust',
			customer_email: 'dsa@example.com',
			customer_mobile: '+919999999999',
			max_amount_paise: 599_800,
			anchor_day: 5,
			next_charge_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // +1d (scheduled cron retry)
			failed_attempt_count: 1,
			dunning_started_at: new Date(Date.now() - 6 * 60 * 60 * 1000),
			state_history: [],
			created_at: new Date(),
			updated_at: new Date()
		};
		mockSubsFindOne.mockResolvedValue(sub);
		mockSubsFindOneAndUpdate.mockImplementation(async (_filter, update) => ({
			...sub,
			...(update as { $set?: object }).$set
		}));
		mockProvider.chargeMandate.mockResolvedValue({
			status: 'succeeded',
			provider_payment_id: 'pay_recover',
			raw_response: {}
		});

		const res = await retryNowPOST(authedEvent() as Parameters<typeof retryNowPOST>[0]);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.result).toBe('succeeded');
		// chargeMandate was called (the manual retry actually hits the provider).
		expect(mockProvider.chargeMandate).toHaveBeenCalled();
	});
});
