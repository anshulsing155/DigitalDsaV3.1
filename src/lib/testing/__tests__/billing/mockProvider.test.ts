/**
 * D.1 S1 — MockProvider contract conformance tests
 * ══════════════════════════════════════════════════════════════════
 * These tests assert the MockProvider implements the BillingProvider
 * contract correctly. The same test suite WILL be re-run against
 * RazorpayProvider in S2 — if MockProvider passes and Razorpay fails,
 * the failure is in our adapter (we mocked something Razorpay doesn't
 * actually do), not in the orchestration.
 *
 * Critique MISS-2 is the motivation: contract tests so the mock and
 * real sandbox can't drift silently.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { MockProvider } from '$lib/server/billing/providers/mock';
import { createHmac } from 'node:crypto';

let provider: MockProvider;

beforeEach(() => {
	provider = new MockProvider({ webhookSecret: 'test-secret-shh' });
});

// ── registerMandate ─────────────────────────────────────────────

describe('MockProvider — registerMandate', () => {
	it('returns pending_registration_id + customer_id + auth URL + 24h expiry', async () => {
		const result = await provider.registerMandate({
			dsa_id: 'dsa_123',
			plan_id: 'pro',
			max_amount_paise: 599_800,
			frequency: 'monthly',
			customer_name: 'Test DSA',
			customer_email: 'test@example.com',
			customer_mobile: '+919811556664'
		});
		expect(result.pending_registration_id).toMatch(/^mock_reg_/);
		expect(result.customer_id).toMatch(/^mock_cust_/);
		expect(result.authorization_url).toContain(result.pending_registration_id);
		const ttlMs = result.expires_at.getTime() - Date.now();
		// Should be approximately 24h. Allow ±5s for clock drift.
		expect(ttlMs).toBeGreaterThan(24 * 60 * 60 * 1000 - 5_000);
		expect(ttlMs).toBeLessThan(24 * 60 * 60 * 1000 + 5_000);
	});

	it('mandate starts in pending_authorization (resolvable via test helper)', async () => {
		const { pending_registration_id } = await provider.registerMandate({
			dsa_id: 'dsa_1',
			plan_id: 'pro',
			max_amount_paise: 599_800,
			frequency: 'monthly',
			customer_name: 'X',
			customer_email: 'x@example.com',
			customer_mobile: '+910000000000'
		});
		// Mock-only escape hatch: resolve the pending registration to its token,
		// simulating what a webhook would surface in production.
		const mandate_token = provider.resolvePendingToken(pending_registration_id);
		expect(mandate_token).toBeDefined();
		expect(await provider.queryMandateStatus(mandate_token!)).toBe('pending_authorization');
	});
});

// ── chargeMandate ───────────────────────────────────────────────

describe('MockProvider — chargeMandate', () => {
	async function setupActiveMandate(maxAmount = 599_800): Promise<string> {
		const reg = await provider.registerMandate({
			dsa_id: 'dsa_x',
			plan_id: 'pro',
			max_amount_paise: maxAmount,
			frequency: 'monthly',
			customer_name: 'X',
			customer_email: 'x@example.com',
			customer_mobile: '+910000000000'
		});
		const token = provider.resolvePendingToken(reg.pending_registration_id)!;
		provider.setMandateStatus(token, 'active');
		return token;
	}

	it('returns succeeded with provider_payment_id when mandate is active', async () => {
		const token = await setupActiveMandate();
		const result = await provider.chargeMandate({
			mandate_token: token,
			amount_paise: 399_900,
			attempt_id: 'attempt-1',
			description: 'Pro monthly'
		});
		expect(result.status).toBe('succeeded');
		expect(result.provider_payment_id).toMatch(/^mock_pay_/);
	});

	it('is idempotent — same attempt_id returns the cached result', async () => {
		const token = await setupActiveMandate();
		const a = await provider.chargeMandate({
			mandate_token: token,
			amount_paise: 100,
			attempt_id: 'same-attempt',
			description: 'x'
		});
		const b = await provider.chargeMandate({
			mandate_token: token,
			amount_paise: 100,
			attempt_id: 'same-attempt',
			description: 'x'
		});
		expect(a).toBe(b); // same object reference (cached)
	});

	it('fails MANDATE_INVALID when mandate is not active', async () => {
		const reg = await provider.registerMandate({
			dsa_id: 'd',
			plan_id: 'pro',
			max_amount_paise: 599_800,
			frequency: 'monthly',
			customer_name: 'X',
			customer_email: 'x@example.com',
			customer_mobile: '+910000000000'
		});
		// Don't activate.
		const token = provider.resolvePendingToken(reg.pending_registration_id)!;
		const result = await provider.chargeMandate({
			mandate_token: token,
			amount_paise: 100,
			attempt_id: 'a',
			description: 'x'
		});
		expect(result.status).toBe('failed');
		expect(result.failure_code).toBe('MANDATE_INVALID');
	});

	it('fails MANDATE_INVALID when amount exceeds mandate cap', async () => {
		const token = await setupActiveMandate(100_000); // ₹1000 cap
		const result = await provider.chargeMandate({
			mandate_token: token,
			amount_paise: 200_000, // ₹2000 over the cap
			attempt_id: 'over',
			description: 'x'
		});
		expect(result.status).toBe('failed');
		expect(result.failure_code).toBe('MANDATE_INVALID');
	});

	it('fails MANDATE_INVALID on unknown mandate token', async () => {
		const result = await provider.chargeMandate({
			mandate_token: 'no_such_token',
			amount_paise: 100,
			attempt_id: 'a',
			description: 'x'
		});
		expect(result.status).toBe('failed');
		expect(result.failure_code).toBe('MANDATE_INVALID');
	});

	it('programmed failure outcomes are consumed FIFO and emitted on next charge', async () => {
		const token = await setupActiveMandate();
		provider.programNextOutcome(token, {
			kind: 'fail',
			failure_code: 'INSUFFICIENT_FUNDS'
		});
		const result = await provider.chargeMandate({
			mandate_token: token,
			amount_paise: 100,
			attempt_id: 'prog-1',
			description: 'x'
		});
		expect(result.status).toBe('failed');
		expect(result.failure_code).toBe('INSUFFICIENT_FUNDS');

		// Queue is now empty — next charge succeeds.
		const second = await provider.chargeMandate({
			mandate_token: token,
			amount_paise: 100,
			attempt_id: 'prog-2',
			description: 'x'
		});
		expect(second.status).toBe('succeeded');
	});

	it('programmed pending outcome → status pending', async () => {
		const token = await setupActiveMandate();
		provider.programNextOutcome(token, { kind: 'pending' });
		const result = await provider.chargeMandate({
			mandate_token: token,
			amount_paise: 100,
			attempt_id: 'p',
			description: 'x'
		});
		expect(result.status).toBe('pending');
	});
});

// ── refundCharge ────────────────────────────────────────────────

describe('MockProvider — refundCharge', () => {
	it('refunds an existing successful charge', async () => {
		const reg = await provider.registerMandate({
			dsa_id: 'd',
			plan_id: 'pro',
			max_amount_paise: 599_800,
			frequency: 'monthly',
			customer_name: 'X',
			customer_email: 'x@example.com',
			customer_mobile: '+910000000000'
		});
		const token = provider.resolvePendingToken(reg.pending_registration_id)!;
		provider.setMandateStatus(token, 'active');
		const charge = await provider.chargeMandate({
			mandate_token: token,
			amount_paise: 399_900,
			attempt_id: 'c1',
			description: 'x'
		});
		const refund = await provider.refundCharge({
			provider_payment_id: charge.provider_payment_id!,
			amount_paise: 399_900,
			reason: 'test',
			attempt_id: 'r1'
		});
		expect(refund.status).toBe('succeeded');
		expect(refund.provider_refund_id).toMatch(/^mock_refund_/);
	});

	it('rejects refund on unknown payment id', async () => {
		const result = await provider.refundCharge({
			provider_payment_id: 'no_such_payment',
			amount_paise: 100,
			reason: 'x',
			attempt_id: 'r'
		});
		expect(result.status).toBe('failed');
	});

	it('rejects refund amount exceeding original charge', async () => {
		const reg = await provider.registerMandate({
			dsa_id: 'd',
			plan_id: 'pro',
			max_amount_paise: 599_800,
			frequency: 'monthly',
			customer_name: 'X',
			customer_email: 'x@example.com',
			customer_mobile: '+910000000000'
		});
		const token = provider.resolvePendingToken(reg.pending_registration_id)!;
		provider.setMandateStatus(token, 'active');
		const charge = await provider.chargeMandate({
			mandate_token: token,
			amount_paise: 100,
			attempt_id: 'c',
			description: 'x'
		});
		const refund = await provider.refundCharge({
			provider_payment_id: charge.provider_payment_id!,
			amount_paise: 200, // double the original
			reason: 'x',
			attempt_id: 'r'
		});
		expect(refund.status).toBe('failed');
	});
});

// ── verifyWebhookSignature ──────────────────────────────────────

describe('MockProvider — verifyWebhookSignature', () => {
	it('accepts a correctly-signed payload', () => {
		const body = '{"foo":"bar"}';
		const sig = createHmac('sha256', 'test-secret-shh').update(body).digest('hex');
		expect(provider.verifyWebhookSignature(body, sig)).toBe(true);
	});

	it('rejects a forged signature', () => {
		const body = '{"foo":"bar"}';
		const forged = createHmac('sha256', 'wrong-secret').update(body).digest('hex');
		expect(provider.verifyWebhookSignature(body, forged)).toBe(false);
	});

	it('rejects mismatched body (replay with different content)', () => {
		const original = '{"foo":"bar"}';
		const replayed = '{"foo":"BAZ"}';
		const sig = createHmac('sha256', 'test-secret-shh').update(original).digest('hex');
		expect(provider.verifyWebhookSignature(replayed, sig)).toBe(false);
	});

	it('rejects malformed signature (length mismatch — short-circuits constant-time compare)', () => {
		const body = '{"foo":"bar"}';
		expect(provider.verifyWebhookSignature(body, 'short')).toBe(false);
	});
});

// ── parseWebhookEvent ───────────────────────────────────────────

describe('MockProvider — parseWebhookEvent', () => {
	it('normalizes a well-formed event', () => {
		const event = provider.parseWebhookEvent({
			provider_event_id: 'evt_123',
			event_type: 'charge.succeeded',
			mandate_token: 'mock_mandate_xyz',
			provider_payment_id: 'mock_pay_abc',
			amount_paise: 399_900,
			occurred_at: '2026-05-25T12:00:00Z'
		});
		expect(event).not.toBeNull();
		expect(event?.provider_event_id).toBe('evt_123');
		expect(event?.event_type).toBe('charge.succeeded');
		expect(event?.amount_paise).toBe(399_900);
		expect(event?.occurred_at).toBeInstanceOf(Date);
	});

	it('returns null for non-object input', () => {
		expect(provider.parseWebhookEvent(null)).toBeNull();
		expect(provider.parseWebhookEvent('string')).toBeNull();
		expect(provider.parseWebhookEvent(42)).toBeNull();
	});

	it('returns null when provider_event_id is missing', () => {
		expect(provider.parseWebhookEvent({ event_type: 'charge.succeeded' })).toBeNull();
	});

	it('returns null when event_type is missing', () => {
		expect(provider.parseWebhookEvent({ provider_event_id: 'x' })).toBeNull();
	});
});

// ── fetchSettlements ────────────────────────────────────────────

describe('MockProvider — fetchSettlements', () => {
	it('returns settled charges within the IST day', async () => {
		const reg = await provider.registerMandate({
			dsa_id: 'd',
			plan_id: 'pro',
			max_amount_paise: 599_800,
			frequency: 'monthly',
			customer_name: 'X',
			customer_email: 'x@example.com',
			customer_mobile: '+910000000000'
		});
		const token = provider.resolvePendingToken(reg.pending_registration_id)!;
		provider.setMandateStatus(token, 'active');
		await provider.chargeMandate({
			mandate_token: token,
			amount_paise: 399_900,
			attempt_id: 'a',
			description: 'x'
		});
		// Mock settles instantly so fetchSettlements for today should return it.
		const settlements = await provider.fetchSettlements(new Date());
		expect(settlements.length).toBeGreaterThanOrEqual(1);
		const ours = settlements.find((s) => s.amount_paise === 399_900);
		expect(ours).toBeDefined();
		expect(ours?.type).toBe('charge');
	});

	it('returns empty list on a future date with no activity', async () => {
		const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
		const settlements = await provider.fetchSettlements(future);
		expect(settlements).toEqual([]);
	});
});

// ── reset ───────────────────────────────────────────────────────

describe('MockProvider — reset', () => {
	it('clears all in-memory state', async () => {
		const reg = await provider.registerMandate({
			dsa_id: 'd',
			plan_id: 'pro',
			max_amount_paise: 599_800,
			frequency: 'monthly',
			customer_name: 'X',
			customer_email: 'x@example.com',
			customer_mobile: '+910000000000'
		});
		const token = provider.resolvePendingToken(reg.pending_registration_id)!;
		expect(await provider.queryMandateStatus(token)).toBe('pending_authorization');
		provider.reset();
		expect(await provider.queryMandateStatus(token)).toBe('expired');
	});
});
