/**
 * D.1 S2 — RazorpayProvider scaffold tests
 * ══════════════════════════════════════════════════════════════════
 * Covers the parts of RazorpayProvider that ARE implemented in the
 * scaffold:
 *   - Env-var validation (constructor throws on missing config)
 *   - HMAC webhook signature verification
 *   - Webhook event parsing (Razorpay → NormalizedEvent shape)
 *   - Failure-code translation table
 *   - NotImplementedError is thrown by unfilled methods (so accidents
 *     during S2 build are LOUD, not silent)
 *
 * Tests that need live Razorpay API calls (registerMandate,
 * chargeMandate, etc.) are NOT here — those land in S2 alongside the
 * real implementations.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { RazorpayProvider, validateRazorpayConfig } from '$lib/server/billing/providers/razorpay';
import {
	RAZORPAY_REASON_BY_FAILURE_CODE,
	translateRazorpayFailure
} from '$lib/server/billing/providers/failureCodeTranslation';

// ── Test fixtures ──────────────────────────────────────────────

const TEST_WEBHOOK_SECRET = 'test-webhook-secret-do-not-use-in-prod';
const TEST_KEY_ID = 'rzp_test_xxxxxxxxxxxxxx';
const TEST_KEY_SECRET = 'test_key_secret_yyyyyy';

function newProvider() {
	return new RazorpayProvider({
		keyId: TEST_KEY_ID,
		keySecret: TEST_KEY_SECRET,
		webhookSecret: TEST_WEBHOOK_SECRET
	});
}

/**
 * Build a Razorpay SDK stub that captures calls and returns programmed
 * responses. Used to verify orchestration without hitting the real API.
 */
type SDKStub = {
	customers: { create: ReturnType<typeof vi.fn> };
	subscriptions: { createRegistrationLink: ReturnType<typeof vi.fn> };
	orders: { create: ReturnType<typeof vi.fn> };
	payments: {
		createRecurringPayment: ReturnType<typeof vi.fn>;
		refund: ReturnType<typeof vi.fn>;
	};
	tokens: { fetch: ReturnType<typeof vi.fn> };
	settlements: { all: ReturnType<typeof vi.fn> };
};

function makeSDKStub(): SDKStub {
	return {
		customers: { create: vi.fn() },
		subscriptions: { createRegistrationLink: vi.fn() },
		orders: { create: vi.fn() },
		payments: {
			createRecurringPayment: vi.fn(),
			refund: vi.fn()
		},
		tokens: { fetch: vi.fn() },
		settlements: { all: vi.fn() }
	};
}

/**
 * Build a RazorpayProvider with a stubbed SDK client. Cast through unknown
 * because the SDK's real `Razorpay` constructor signature is opaque and the
 * stub doesn't implement every method (it implements the ones the tests
 * exercise, which is enough for the verification we want).
 */
function newProviderWithStub(stub: SDKStub) {
	const RazorpayClass = stub as unknown as ConstructorParameters<typeof RazorpayProvider>[1];
	return new RazorpayProvider(
		{
			keyId: TEST_KEY_ID,
			keySecret: TEST_KEY_SECRET,
			webhookSecret: TEST_WEBHOOK_SECRET
		},
		RazorpayClass
	);
}

// ── Env validation ─────────────────────────────────────────────

describe('validateRazorpayConfig', () => {
	it('passes with all 3 fields set', () => {
		expect(() =>
			validateRazorpayConfig({
				keyId: 'k',
				keySecret: 's',
				webhookSecret: 'w'
			})
		).not.toThrow();
	});

	it('throws and names every missing field', () => {
		try {
			validateRazorpayConfig({ keyId: '', keySecret: 's', webhookSecret: '' });
			throw new Error('should have thrown');
		} catch (err) {
			expect((err as Error).message).toContain('RAZORPAY_KEY_ID');
			expect((err as Error).message).toContain('RAZORPAY_WEBHOOK_SECRET');
			expect((err as Error).message).not.toContain('RAZORPAY_KEY_SECRET'); // this one was set
		}
	});

	it('error message points at the spec security checklist', () => {
		try {
			validateRazorpayConfig({});
			throw new Error('should have thrown');
		} catch (err) {
			expect((err as Error).message).toContain('§6');
		}
	});
});

// ── HMAC signature verification ────────────────────────────────

describe('RazorpayProvider — verifyWebhookSignature', () => {
	it('accepts a correctly-signed payload', () => {
		const provider = newProvider();
		const body = '{"event":"subscription.charged"}';
		const sig = createHmac('sha256', TEST_WEBHOOK_SECRET).update(body).digest('hex');
		expect(provider.verifyWebhookSignature(body, sig)).toBe(true);
	});

	it('rejects a signature created with a different secret', () => {
		const provider = newProvider();
		const body = '{"event":"subscription.charged"}';
		const forged = createHmac('sha256', 'wrong-secret').update(body).digest('hex');
		expect(provider.verifyWebhookSignature(body, forged)).toBe(false);
	});

	it('rejects a replayed body (signature was for different content)', () => {
		const provider = newProvider();
		const original = '{"event":"subscription.charged","amount":1000}';
		const tampered = '{"event":"subscription.charged","amount":99999}';
		const sig = createHmac('sha256', TEST_WEBHOOK_SECRET).update(original).digest('hex');
		expect(provider.verifyWebhookSignature(tampered, sig)).toBe(false);
	});

	it('rejects empty signature without throwing', () => {
		const provider = newProvider();
		expect(provider.verifyWebhookSignature('{}', '')).toBe(false);
	});

	it('rejects malformed signature (length mismatch short-circuits)', () => {
		const provider = newProvider();
		expect(provider.verifyWebhookSignature('{}', 'too-short')).toBe(false);
	});
});

// ── Webhook event parsing ──────────────────────────────────────

describe('RazorpayProvider — parseWebhookEvent', () => {
	it('normalizes subscription.charged → charge.succeeded', () => {
		const provider = newProvider();
		const event = provider.parseWebhookEvent({
			id: 'evt_abc123',
			event: 'subscription.charged',
			payload: {
				payment: {
					entity: {
						id: 'pay_xxx',
						amount: 399_900,
						status: 'captured'
					}
				},
				subscription: {
					entity: {
						id: 'sub_yyy',
						token_id: 'token_zzz'
					}
				}
			},
			created_at: 1716100000
		});
		expect(event).not.toBeNull();
		expect(event?.event_type).toBe('charge.succeeded');
		expect(event?.provider_event_id).toBe('evt_abc123');
		expect(event?.provider_payment_id).toBe('pay_xxx');
		expect(event?.amount_paise).toBe(399_900);
		expect(event?.mandate_token).toBe('token_zzz');
		expect(event?.occurred_at).toEqual(new Date(1716100000 * 1000));
	});

	it('normalizes payment.failed and translates failure code', () => {
		const provider = newProvider();
		const event = provider.parseWebhookEvent({
			id: 'evt_fail',
			event: 'payment.failed',
			payload: {
				payment: {
					entity: {
						id: 'pay_zzz',
						amount: 100,
						status: 'failed',
						error_reason: 'insufficient_funds',
						error_description: 'Customer has insufficient balance in the account'
					}
				}
			},
			created_at: 1716100100
		});
		expect(event?.event_type).toBe('charge.failed');
		expect(event?.failure_code).toBe('INSUFFICIENT_FUNDS');
	});

	it('normalizes token.confirmed → mandate.authorized', () => {
		const provider = newProvider();
		const event = provider.parseWebhookEvent({
			id: 'evt_token',
			event: 'token.confirmed',
			payload: {
				token: {
					entity: {
						id: 'token_abc'
					}
				}
			},
			created_at: 1716100200
		});
		expect(event?.event_type).toBe('mandate.authorized');
		expect(event?.mandate_token).toBe('token_abc');
	});

	it('returns null for events we do not subscribe to', () => {
		const provider = newProvider();
		const event = provider.parseWebhookEvent({
			id: 'evt_x',
			event: 'order.paid', // not in our RAZORPAY_EVENT_MAP
			payload: {}
		});
		expect(event).toBeNull();
	});

	it('falls back to composite event id when top-level id is absent', () => {
		const provider = newProvider();
		const event = provider.parseWebhookEvent({
			event: 'subscription.charged',
			payload: {
				payment: { entity: { id: 'pay_legacy', amount: 100 } }
			}
		});
		expect(event?.provider_event_id).toBe('subscription.charged:pay_legacy');
	});

	it('returns null for non-object input', () => {
		const provider = newProvider();
		expect(provider.parseWebhookEvent(null)).toBeNull();
		expect(provider.parseWebhookEvent('string')).toBeNull();
	});

	it('returns null when event field is missing', () => {
		const provider = newProvider();
		expect(provider.parseWebhookEvent({ payload: {} })).toBeNull();
	});
});

// ── SDK orchestration via stubs (verifies the 5 implemented methods) ──

describe('RazorpayProvider — registerMandate', () => {
	it('creates customer + registration link, returns pending_registration_id + customer_id + auth URL', async () => {
		const stub = makeSDKStub();
		stub.customers.create.mockResolvedValue({ id: 'cust_xyz' });
		stub.subscriptions.createRegistrationLink.mockResolvedValue({
			id: 'inv_link_abc',
			short_url: 'https://rzp.io/i/auth_abc'
		});
		const provider = newProviderWithStub(stub);

		const result = await provider.registerMandate({
			dsa_id: 'dsa_123',
			plan_id: 'pro',
			max_amount_paise: 599_800,
			frequency: 'monthly',
			customer_name: 'Test DSA',
			customer_email: 'test@example.com',
			customer_mobile: '+919811556664'
		});

		expect(result.pending_registration_id).toBe('inv_link_abc');
		expect(result.customer_id).toBe('cust_xyz');
		expect(result.authorization_url).toBe('https://rzp.io/i/auth_abc');
		// 24h TTL
		const ttlMs = result.expires_at.getTime() - Date.now();
		expect(ttlMs).toBeGreaterThan(24 * 60 * 60 * 1000 - 5_000);
		expect(ttlMs).toBeLessThan(24 * 60 * 60 * 1000 + 5_000);

		// Verify the SDK calls used the right shape
		expect(stub.customers.create).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Test DSA',
				email: 'test@example.com',
				contact: '+919811556664',
				fail_existing: 0
			})
		);
		expect(stub.subscriptions.createRegistrationLink).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'link',
				currency: 'INR',
				// MUST be 0 for eMandate registration — Razorpay's API rejects
				// non-zero values with "The amount must be 0 for eMandate
				// registration". The earlier 100-paise value (a misreading of
				// spec §11.1's "₹1 verification charge" — a Card/UPI-Autopay
				// concept that doesn't apply to eNACH) surfaced as a 400 in
				// the first end-to-end test-mode smoke on 2026-06-01.
				// Re-locked to the canonical value per CLAUDE.md §16 Rule 16.
				amount: 0,
				subscription_registration: expect.objectContaining({
					method: 'emandate',
					max_amount: 599_800,
					first_payment_amount: 0
				})
			})
		);
	});

	it('throws on missing short_url (cannot redirect DSA without URL)', async () => {
		const stub = makeSDKStub();
		stub.customers.create.mockResolvedValue({ id: 'cust_x' });
		stub.subscriptions.createRegistrationLink.mockResolvedValue({
			id: 'inv_link',
			short_url: undefined
		});
		const provider = newProviderWithStub(stub);
		await expect(
			provider.registerMandate({
				dsa_id: 'd',
				plan_id: 'pro',
				max_amount_paise: 100,
				frequency: 'monthly',
				customer_name: 'X',
				customer_email: 'x@x.com',
				customer_mobile: '+910000000000'
			})
		).rejects.toThrow(/missing short_url/);
	});
});

describe('RazorpayProvider — chargeMandate', () => {
	it('creates order + recurring payment, returns succeeded', async () => {
		const stub = makeSDKStub();
		stub.orders.create.mockResolvedValue({ id: 'order_xyz' });
		stub.payments.createRecurringPayment.mockResolvedValue({
			razorpay_payment_id: 'pay_xyz'
		});
		const provider = newProviderWithStub(stub);

		const result = await provider.chargeMandate({
			mandate_token: 'token_abc',
			amount_paise: 399_900,
			attempt_id: 'attempt-1',
			description: 'Pro monthly',
			customer_id: 'cust_xyz',
			customer_email: 'x@x.com',
			customer_mobile: '+919811556664'
		});

		expect(result.status).toBe('succeeded');
		expect(result.provider_payment_id).toBe('pay_xyz');
		// Order receipt = attempt_id (idempotency key)
		expect(stub.orders.create).toHaveBeenCalledWith(
			expect.objectContaining({
				amount: 399_900,
				currency: 'INR',
				receipt: 'attempt-1'
			})
		);
		// Recurring payment uses the order + token + customer details
		expect(stub.payments.createRecurringPayment).toHaveBeenCalledWith(
			expect.objectContaining({
				order_id: 'order_xyz',
				token: 'token_abc',
				customer_id: 'cust_xyz',
				recurring: true,
				amount: 399_900
			})
		);
	});

	it('returns pending when payment id is absent (async eNACH outcome)', async () => {
		const stub = makeSDKStub();
		stub.orders.create.mockResolvedValue({ id: 'order_x' });
		stub.payments.createRecurringPayment.mockResolvedValue({}); // no payment_id
		const provider = newProviderWithStub(stub);

		const result = await provider.chargeMandate({
			mandate_token: 't',
			amount_paise: 100,
			attempt_id: 'a',
			description: 'x',
			customer_id: 'c',
			customer_email: 'e@e.com',
			customer_mobile: '+910000000000'
		});

		expect(result.status).toBe('pending');
	});

	it('fails fast (without SDK call) when customer_id is missing', async () => {
		const stub = makeSDKStub();
		const provider = newProviderWithStub(stub);
		const result = await provider.chargeMandate({
			mandate_token: 't',
			amount_paise: 100,
			attempt_id: 'a',
			description: 'x'
		});
		expect(result.status).toBe('failed');
		expect(result.failure_code).toBe('UNKNOWN');
		expect(result.failure_message).toContain('customer_id');
		expect(stub.orders.create).not.toHaveBeenCalled();
	});

	it('translates Razorpay error into normalized FailureCode', async () => {
		const stub = makeSDKStub();
		stub.orders.create.mockResolvedValue({ id: 'order_x' });
		// Razorpay SDK throws errors with `.error` envelope
		stub.payments.createRecurringPayment.mockRejectedValue({
			statusCode: 400,
			error: {
				code: 'BAD_REQUEST_ERROR',
				description: 'Customer has insufficient balance',
				reason: 'insufficient_funds'
			}
		});
		const provider = newProviderWithStub(stub);

		const result = await provider.chargeMandate({
			mandate_token: 't',
			amount_paise: 100,
			attempt_id: 'a',
			description: 'x',
			customer_id: 'c',
			customer_email: 'e@e.com',
			customer_mobile: '+910000000000'
		});

		expect(result.status).toBe('failed');
		expect(result.failure_code).toBe('INSUFFICIENT_FUNDS');
	});
});

describe('RazorpayProvider — refundCharge', () => {
	it('refunds an existing payment', async () => {
		const stub = makeSDKStub();
		stub.payments.refund.mockResolvedValue({ id: 'rfnd_xyz' });
		const provider = newProviderWithStub(stub);

		const result = await provider.refundCharge({
			provider_payment_id: 'pay_xyz',
			amount_paise: 399_900,
			reason: 'mandate_verification',
			attempt_id: 'r1'
		});

		expect(result.status).toBe('succeeded');
		expect(result.provider_refund_id).toBe('rfnd_xyz');
		expect(stub.payments.refund).toHaveBeenCalledWith(
			'pay_xyz',
			expect.objectContaining({
				amount: 399_900,
				notes: expect.objectContaining({
					reason: 'mandate_verification',
					attempt_id: 'r1'
				})
			})
		);
	});

	it('returns failed on Razorpay error', async () => {
		const stub = makeSDKStub();
		stub.payments.refund.mockRejectedValue({
			error: { code: 'BAD_REQUEST_ERROR', description: 'Refund window expired' }
		});
		const provider = newProviderWithStub(stub);
		const result = await provider.refundCharge({
			provider_payment_id: 'p',
			amount_paise: 100,
			reason: 'x',
			attempt_id: 'r'
		});
		expect(result.status).toBe('failed');
	});
});

describe('RazorpayProvider — queryMandateStatus', () => {
	it('maps confirmed/active → active', async () => {
		const stub = makeSDKStub();
		stub.tokens.fetch.mockResolvedValue({ recurring_status: 'confirmed' });
		const provider = newProviderWithStub(stub);
		expect(await provider.queryMandateStatus('t')).toBe('active');
	});

	it('maps initiated → pending_authorization', async () => {
		const stub = makeSDKStub();
		stub.tokens.fetch.mockResolvedValue({ status: 'initiated' });
		const provider = newProviderWithStub(stub);
		expect(await provider.queryMandateStatus('t')).toBe('pending_authorization');
	});

	it('maps cancelled/rejected/failed/revoked → revoked', async () => {
		const stub = makeSDKStub();
		stub.tokens.fetch.mockResolvedValue({ status: 'rejected' });
		const provider = newProviderWithStub(stub);
		expect(await provider.queryMandateStatus('t')).toBe('revoked');
	});

	it('maps unknown status → halted (operator-investigable)', async () => {
		const stub = makeSDKStub();
		stub.tokens.fetch.mockResolvedValue({ status: 'something_new' });
		const provider = newProviderWithStub(stub);
		expect(await provider.queryMandateStatus('t')).toBe('halted');
	});

	it('SDK error → expired (safer than guessing active)', async () => {
		const stub = makeSDKStub();
		stub.tokens.fetch.mockRejectedValue(new Error('Token not found'));
		const provider = newProviderWithStub(stub);
		expect(await provider.queryMandateStatus('t')).toBe('expired');
	});
});

describe('RazorpayProvider — fetchSettlements', () => {
	it('returns SettlementEntry for each Razorpay settlement item', async () => {
		const stub = makeSDKStub();
		stub.settlements.all.mockResolvedValue({
			items: [
				{ id: 'setl_1', amount: 100_000, status: 'processed', created_at: 1716100000 },
				{ id: 'setl_2', amount: 200_000, status: 'processed', created_at: 1716101000 }
			]
		});
		const provider = newProviderWithStub(stub);
		const result = await provider.fetchSettlements(new Date('2026-05-25T12:00:00Z'));
		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({
			provider_payment_id: 'setl_1',
			amount_paise: 100_000,
			type: 'charge'
		});
	});

	it('passes IST-day-bounded from/to to Razorpay API', async () => {
		const stub = makeSDKStub();
		stub.settlements.all.mockResolvedValue({ items: [] });
		const provider = newProviderWithStub(stub);
		await provider.fetchSettlements(new Date('2026-05-25T12:00:00Z'));
		const callArgs = stub.settlements.all.mock.calls[0][0];
		expect(callArgs).toHaveProperty('from');
		expect(callArgs).toHaveProperty('to');
		// 86399s = 24h - 1s (we floor and subtract 1ms to bound [00:00, 23:59:59.999])
		expect(callArgs.to - callArgs.from).toBeGreaterThanOrEqual(86_399);
		expect(callArgs.to - callArgs.from).toBeLessThanOrEqual(86_400);
	});
});

// ── Failure code translation ───────────────────────────────────

describe('translateRazorpayFailure', () => {
	it('returns UNKNOWN for null/undefined error', () => {
		expect(translateRazorpayFailure(null)).toBe('UNKNOWN');
		expect(translateRazorpayFailure(undefined)).toBe('UNKNOWN');
		expect(translateRazorpayFailure({})).toBe('UNKNOWN');
	});

	describe('maps INSUFFICIENT_FUNDS', () => {
		for (const reason of RAZORPAY_REASON_BY_FAILURE_CODE.INSUFFICIENT_FUNDS) {
			it(`reason='${reason}' → INSUFFICIENT_FUNDS`, () => {
				expect(translateRazorpayFailure({ reason })).toBe('INSUFFICIENT_FUNDS');
			});
		}
		it('description fallback: "insufficient balance"', () => {
			expect(translateRazorpayFailure({ description: 'Account has insufficient balance' })).toBe(
				'INSUFFICIENT_FUNDS'
			);
		});
	});

	describe('maps MANDATE_INVALID', () => {
		for (const reason of RAZORPAY_REASON_BY_FAILURE_CODE.MANDATE_INVALID) {
			it(`reason='${reason}' → MANDATE_INVALID`, () => {
				expect(translateRazorpayFailure({ reason })).toBe('MANDATE_INVALID');
			});
		}
		it('description fallback: "mandate has been revoked"', () => {
			expect(
				translateRazorpayFailure({ description: 'The mandate has been revoked by customer' })
			).toBe('MANDATE_INVALID');
		});
	});

	describe('maps BANK_DECLINED', () => {
		for (const reason of RAZORPAY_REASON_BY_FAILURE_CODE.BANK_DECLINED) {
			it(`reason='${reason}' → BANK_DECLINED`, () => {
				expect(translateRazorpayFailure({ reason })).toBe('BANK_DECLINED');
			});
		}
	});

	describe('maps PROVIDER_TIMEOUT', () => {
		for (const reason of RAZORPAY_REASON_BY_FAILURE_CODE.PROVIDER_TIMEOUT) {
			it(`reason='${reason}' → PROVIDER_TIMEOUT`, () => {
				expect(translateRazorpayFailure({ reason })).toBe('PROVIDER_TIMEOUT');
			});
		}
	});

	it('unknown reasons default to UNKNOWN (operator alert)', () => {
		expect(translateRazorpayFailure({ reason: 'some_brand_new_reason' })).toBe('UNKNOWN');
		expect(translateRazorpayFailure({ description: 'unspecified error from bank' })).toBe(
			'UNKNOWN'
		);
	});

	it('case-insensitive matching', () => {
		expect(translateRazorpayFailure({ reason: 'INSUFFICIENT_FUNDS' })).toBe('INSUFFICIENT_FUNDS');
		expect(translateRazorpayFailure({ reason: 'Mandate_Revoked' })).toBe('MANDATE_INVALID');
	});
});
