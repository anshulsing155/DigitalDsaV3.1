/**
 * D.1 S3 — chargeEngine behavioral tests
 * ══════════════════════════════════════════════════════════════════
 * Behavioral coverage for the charge engine's branches:
 *   1. succeeded → active→active self-loop, next_charge_at extended,
 *      ChargeAttempt + BillingTransaction inserted
 *   2. failed retryable (INSUFFICIENT_FUNDS) → active→dunning_t0
 *   3. failed terminal (MANDATE_INVALID) → active→downgraded
 *   4. cancel_at_cycle_end → active→cancelled (no provider call)
 *   5. pending_downgrade → plan flips before charge, amount uses new plan
 *   6. idempotency: already-succeeded attempt → skip, NO provider call
 *   7. resume: stale pending attempt → reuse attempt_id, provider called
 *
 * Mongo is fully mocked (matching subscriptionStore.test.ts pattern).
 * Provider is MockProvider with programmed outcomes.
 *
 * The static-scan companion (chargeEngineIdempotency.test.ts) locks the
 * source-pattern invariants; this file locks runtime behavior.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type {
	BillingSubscriptionDoc,
	ChargeAttemptDoc
} from '$lib/types/billingSubscription';

// ── Mongo mocks ────────────────────────────────────────────────

const mockSubsFindOne = vi.fn();
const mockSubsFind = vi.fn();
const mockSubsUpdateOne = vi.fn();
const mockSubsFindOneAndUpdate = vi.fn();
const mockAttemptsFindOne = vi.fn();
const mockAttemptsInsertOne = vi.fn();
const mockAttemptsUpdateOne = vi.fn();
const mockTxInsertOne = vi.fn();
const mockAuditInsertOne = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	BillingSubscriptions: {
		findOne: (...args: unknown[]) => mockSubsFindOne(...args),
		find: (...args: unknown[]) => mockSubsFind(...args),
		updateOne: (...args: unknown[]) => mockSubsUpdateOne(...args),
		findOneAndUpdate: (...args: unknown[]) => mockSubsFindOneAndUpdate(...args)
	},
	ChargeAttempts: {
		findOne: (...args: unknown[]) => mockAttemptsFindOne(...args),
		insertOne: (...args: unknown[]) => mockAttemptsInsertOne(...args),
		updateOne: (...args: unknown[]) => mockAttemptsUpdateOne(...args)
	},
	BillingTransactions: {
		insertOne: (...args: unknown[]) => mockTxInsertOne(...args)
	},
	BillingAuditLogs: {
		insertOne: (...args: unknown[]) => mockAuditInsertOne(...args)
	},
	ProcessedWebhookEvents: { insertOne: vi.fn() }
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

// Email helper is fire-and-forget in the engine; mock it to no-op.
const mockSendEmail = vi.fn();
vi.mock('$lib/server/email', () => ({
	sendEmail: (...args: unknown[]) => mockSendEmail(...args)
}));

import { MockProvider } from '$lib/server/billing/providers/mock';
import { processOneSubscription } from '$lib/server/billing/chargeEngine';

// ── Fixtures ───────────────────────────────────────────────────

function activeSub(overrides: Partial<BillingSubscriptionDoc> = {}): BillingSubscriptionDoc {
	const now = new Date('2026-06-04T12:00:00Z'); // 17:30 IST — well before 5th 00:00 IST anchor
	return {
		_id: new ObjectId(),
		dsa_id: new ObjectId(),
		state: 'active',
		plan_id: 'pro',
		billing_cycle: 'monthly',
		provider: 'mock',
		mandate_token: 'mock_mandate_xxx',
		provider_customer_id: 'mock_cust_xxx',
		customer_email: 'dsa@example.com',
		customer_mobile: '+919999999999',
		max_amount_paise: 599_800,
		anchor_day: 5,
		next_charge_at: new Date('2026-06-04T18:30:00Z'), // 5th 00:00 IST
		failed_attempt_count: 0,
		state_history: [],
		created_at: now,
		updated_at: now,
		...overrides
	};
}

beforeEach(() => {
	mockSubsFindOne.mockReset();
	mockSubsFind.mockReset();
	mockSubsUpdateOne.mockReset();
	mockSubsFindOneAndUpdate.mockReset();
	mockAttemptsFindOne.mockReset();
	mockAttemptsInsertOne.mockReset();
	mockAttemptsUpdateOne.mockReset();
	mockTxInsertOne.mockReset();
	mockAuditInsertOne.mockReset();
	mockSendEmail.mockReset();

	// Default: applyTransition's precondition lookup finds the sub and
	// the atomic write succeeds. The two helper interactions are mocked
	// via the same mockSubs* functions.
	mockSubsUpdateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
	mockSubsFindOneAndUpdate.mockImplementation(async (_filter, update) => {
		// Return a synthetic post-update doc (the engine doesn't inspect it).
		return { ...update.$set, _id: new ObjectId() };
	});
	mockAttemptsInsertOne.mockResolvedValue({ insertedId: new ObjectId() });
	mockAttemptsUpdateOne.mockResolvedValue({ acknowledged: true });
	mockTxInsertOne.mockResolvedValue({ insertedId: new ObjectId() });
	mockAuditInsertOne.mockResolvedValue({ insertedId: new ObjectId() });
});

// ── Tests ──────────────────────────────────────────────────────

describe('chargeEngine.processOneSubscription', () => {
	describe('idempotency (the critical invariant)', () => {
		it('SKIPS when a succeeded ChargeAttempt already exists for (subscription_id, cycle_anchor)', async () => {
			const sub = activeSub();
			// Probe finds a prior succeeded row.
			mockAttemptsFindOne.mockImplementation(async (filter: Record<string, unknown>) => {
				if (filter.status === 'succeeded') {
					return {
						_id: new ObjectId(),
						attempt_id: 'existing-attempt-uuid',
						subscription_id: sub._id,
						dsa_id: sub.dsa_id,
						plan_id: 'pro',
						amount_paise: 399_900,
						status: 'succeeded',
						cycle_anchor: sub.next_charge_at!,
						provider_payment_id: 'pay_old',
						created_at: new Date(),
						updated_at: new Date()
					} as ChargeAttemptDoc;
				}
				return null;
			});

			const provider = new MockProvider();
			const chargeMandateSpy = vi.spyOn(provider, 'chargeMandate');

			const outcome = await processOneSubscription(sub, {
				provider,
				sendConfirmationEmail: false
			});

			expect(outcome.kind).toBe('skipped_already_charged');
			expect(chargeMandateSpy).not.toHaveBeenCalled();
			expect(mockAttemptsInsertOne).not.toHaveBeenCalled();
		});

		it('RESUMES a stale pending attempt with the original attempt_id (R2)', async () => {
			const sub = activeSub();
			const staleAttemptId = 'stale-attempt-uuid';
			// First call (succeeded probe) returns null; second call (pending probe) returns the stale row.
			mockAttemptsFindOne
				.mockResolvedValueOnce(null) // no succeeded
				.mockResolvedValueOnce({
					_id: new ObjectId(),
					attempt_id: staleAttemptId,
					subscription_id: sub._id,
					dsa_id: sub.dsa_id,
					plan_id: 'pro',
					amount_paise: 399_900,
					status: 'pending',
					cycle_anchor: sub.next_charge_at!,
					created_at: new Date(Date.now() - 60 * 60 * 1000), // 1h ago > 30m threshold
					updated_at: new Date(Date.now() - 60 * 60 * 1000)
				} as ChargeAttemptDoc);

			const provider = new MockProvider();
			// Register a mandate so the mock charge succeeds.
			await provider.registerMandate({
				dsa_id: sub.dsa_id.toString(),
				plan_id: 'pro',
				max_amount_paise: sub.max_amount_paise,
				frequency: 'monthly',
				customer_name: 'X',
				customer_email: sub.customer_email!,
				customer_mobile: sub.customer_mobile!
			});
			// Force the engine to use sub.mandate_token by overriding the
			// internal mandate registry. Easier: just spy on chargeMandate.
			const chargeMandateSpy = vi
				.spyOn(provider, 'chargeMandate')
				.mockResolvedValue({
					status: 'succeeded',
					provider_payment_id: 'pay_resumed',
					raw_response: {}
				});

			await processOneSubscription(sub, {
				provider,
				sendConfirmationEmail: false
			});

			// CRITICAL: the resumed call must use the stale attempt_id, NOT a fresh UUID.
			expect(chargeMandateSpy).toHaveBeenCalledWith(
				expect.objectContaining({ attempt_id: staleAttemptId })
			);
			// And we must NOT have inserted a new ChargeAttempt row — the
			// resume path uses updateOne to bump updated_at instead.
			expect(mockAttemptsInsertOne).not.toHaveBeenCalled();
			expect(mockAttemptsUpdateOne).toHaveBeenCalled();
		});
	});

	describe('successful charge (transition #5 active→active)', () => {
		it('extends next_charge_at to the next anchor and inserts a BillingTransaction', async () => {
			const sub = activeSub();
			mockAttemptsFindOne.mockResolvedValue(null); // no prior attempts
			const provider = new MockProvider();
			vi.spyOn(provider, 'chargeMandate').mockResolvedValue({
				status: 'succeeded',
				provider_payment_id: 'pay_new',
				raw_response: {}
			});

			const outcome = await processOneSubscription(sub, {
				provider,
				sendConfirmationEmail: false
			});

			expect(outcome.kind).toBe('succeeded');
			if (outcome.kind === 'succeeded') {
				// Next charge should be ~30 days later (same anchor in next month).
				// June 5th 00:00 IST → July 5th 00:00 IST.
				const nextIST = new Date(outcome.next_charge_at.getTime() + 5.5 * 60 * 60 * 1000);
				expect(nextIST.getUTCMonth()).toBe(6); // July (0-indexed)
				expect(nextIST.getUTCDate()).toBe(5);
				expect(outcome.amount_paise).toBe(399_900); // pro plan paise
			}
			// BillingTransaction row inserted with kind: 'recurring_charge'.
			expect(mockTxInsertOne).toHaveBeenCalledWith(
				expect.objectContaining({
					kind: 'recurring_charge',
					status: 'succeeded',
					plan_id: 'pro'
				})
			);
		});
	});

	describe('failed charge', () => {
		it('retryable failure → active→dunning_t0', async () => {
			const sub = activeSub();
			mockAttemptsFindOne.mockResolvedValue(null);
			// applyTransition's precondition probe (findOne by dsa_id) must
			// see the sub so it proceeds to the atomic findOneAndUpdate. The
			// default beforeEach reset returns undefined which short-circuits.
			mockSubsFindOne.mockResolvedValue(sub);
			const provider = new MockProvider();
			vi.spyOn(provider, 'chargeMandate').mockResolvedValue({
				status: 'failed',
				failure_code: 'INSUFFICIENT_FUNDS',
				failure_message: 'Insufficient balance',
				raw_response: {}
			});

			const outcome = await processOneSubscription(sub, {
				provider,
				sendConfirmationEmail: false
			});

			expect(outcome.kind).toBe('failed_retryable');
			// applyTransition was called targeting 'dunning_t0'.
			expect(mockSubsFindOneAndUpdate).toHaveBeenCalled();
			const transitionCall = mockSubsFindOneAndUpdate.mock.calls.find((c) => {
				const update = c[1] as { $set?: { state?: string } };
				return update?.$set?.state === 'dunning_t0';
			});
			expect(transitionCall).toBeDefined();
		});

		it('MANDATE_INVALID → active→downgraded (terminal)', async () => {
			const sub = activeSub();
			mockAttemptsFindOne.mockResolvedValue(null);
			mockSubsFindOne.mockResolvedValue(sub);
			const provider = new MockProvider();
			vi.spyOn(provider, 'chargeMandate').mockResolvedValue({
				status: 'failed',
				failure_code: 'MANDATE_INVALID',
				failure_message: 'Mandate revoked at bank',
				raw_response: {}
			});

			const outcome = await processOneSubscription(sub, {
				provider,
				sendConfirmationEmail: false
			});

			expect(outcome.kind).toBe('failed_terminal');
			const downgradeCall = mockSubsFindOneAndUpdate.mock.calls.find((c) => {
				const update = c[1] as { $set?: { state?: string } };
				return update?.$set?.state === 'downgraded';
			});
			expect(downgradeCall).toBeDefined();
		});
	});

	describe('cancel_at_cycle_end (spec §4 S6)', () => {
		it('transitions active→cancelled and skips the charge call entirely', async () => {
			const sub = activeSub({ cancel_at_cycle_end: true });
			mockSubsFindOne.mockResolvedValue(sub);
			const provider = new MockProvider();
			const chargeMandateSpy = vi.spyOn(provider, 'chargeMandate');

			const outcome = await processOneSubscription(sub, {
				provider,
				sendConfirmationEmail: false
			});

			expect(outcome.kind).toBe('skipped_cancel_at_end');
			expect(chargeMandateSpy).not.toHaveBeenCalled();
			expect(mockAttemptsInsertOne).not.toHaveBeenCalled();
			// Transition to cancelled must have been requested.
			const cancelCall = mockSubsFindOneAndUpdate.mock.calls.find((c) => {
				const update = c[1] as { $set?: { state?: string } };
				return update?.$set?.state === 'cancelled';
			});
			expect(cancelCall).toBeDefined();
		});
	});

	// ── S4 — retry timing + recovery + manual mode + in-flight race ──

	describe('S4 retry scheduling (cron mode)', () => {
		it('first failure: next_charge_at scheduled to dunning_started_at + 1d', async () => {
			const sub = activeSub({ failed_attempt_count: 0 });
			mockAttemptsFindOne.mockResolvedValue(null);
			mockSubsFindOne.mockResolvedValue(sub);
			const provider = new MockProvider();
			vi.spyOn(provider, 'chargeMandate').mockResolvedValue({
				status: 'failed',
				failure_code: 'INSUFFICIENT_FUNDS',
				failure_message: 'low balance',
				raw_response: {}
			});

			const now = new Date('2026-06-04T18:30:00Z');
			await processOneSubscription(sub, {
				provider,
				sendConfirmationEmail: false,
				now
			});

			// The transition patch must include next_charge_at = now + 1 day.
			// (For the first failure dunning_started_at gets set to `now` by the
			// state-machine transition, so retry baseline = now.)
			const transitionCall = mockSubsFindOneAndUpdate.mock.calls.find((c) => {
				const update = c[1] as { $set?: { state?: string; next_charge_at?: Date } };
				return update?.$set?.state === 'dunning_t0';
			});
			expect(transitionCall).toBeDefined();
			const patch = transitionCall![1] as { $set: { next_charge_at: Date } };
			const expected = new Date(now.getTime() + 24 * 60 * 60 * 1000);
			expect(patch.$set.next_charge_at.getTime()).toBe(expected.getTime());
		});

		it('second failure (count=2): next_charge_at = dunning_started_at + 3d', async () => {
			const dunningStart = new Date('2026-06-04T18:30:00Z');
			const sub = activeSub({
				state: 'dunning_t0',
				failed_attempt_count: 1,
				dunning_started_at: dunningStart,
				next_charge_at: new Date(dunningStart.getTime() + 24 * 60 * 60 * 1000) // +1d (today's retry)
			});
			mockAttemptsFindOne.mockResolvedValue(null);
			mockSubsFindOne.mockResolvedValue(sub);
			const provider = new MockProvider();
			vi.spyOn(provider, 'chargeMandate').mockResolvedValue({
				status: 'failed',
				failure_code: 'INSUFFICIENT_FUNDS',
				raw_response: {}
			});

			await processOneSubscription(sub, {
				provider,
				sendConfirmationEmail: false,
				now: sub.next_charge_at! // simulate cron running on day +1
			});

			// Self-loop transition dunning_t0 → dunning_t0, next_charge_at = dunningStart + 3d.
			const transitionCall = mockSubsFindOneAndUpdate.mock.calls.find((c) => {
				const update = c[1] as { $set?: { state?: string } };
				return update?.$set?.state === 'dunning_t0';
			});
			expect(transitionCall).toBeDefined();
			const patch = transitionCall![1] as { $set: { next_charge_at: Date } };
			const expected = new Date(dunningStart.getTime() + 3 * 24 * 60 * 60 * 1000);
			expect(patch.$set.next_charge_at.getTime()).toBe(expected.getTime());
		});

		it('third failure (count=3): next_charge_at = dunning_started_at + 5d', async () => {
			const dunningStart = new Date('2026-06-04T18:30:00Z');
			const sub = activeSub({
				state: 'dunning_t0',
				failed_attempt_count: 2,
				dunning_started_at: dunningStart,
				next_charge_at: new Date(dunningStart.getTime() + 3 * 24 * 60 * 60 * 1000)
			});
			mockAttemptsFindOne.mockResolvedValue(null);
			mockSubsFindOne.mockResolvedValue(sub);
			const provider = new MockProvider();
			vi.spyOn(provider, 'chargeMandate').mockResolvedValue({
				status: 'failed',
				failure_code: 'INSUFFICIENT_FUNDS',
				raw_response: {}
			});

			await processOneSubscription(sub, {
				provider,
				sendConfirmationEmail: false,
				now: sub.next_charge_at!
			});

			const transitionCall = mockSubsFindOneAndUpdate.mock.calls[mockSubsFindOneAndUpdate.mock.calls.length - 1];
			const patch = transitionCall[1] as { $set: { next_charge_at: Date } };
			const expected = new Date(dunningStart.getTime() + 5 * 24 * 60 * 60 * 1000);
			expect(patch.$set.next_charge_at.getTime()).toBe(expected.getTime());
		});

		it('fourth failure (count=4): NO next_charge_at scheduled — S5 takes over', async () => {
			// After the t+5d retry fails, count becomes 4. No further retry; S5
			// day-counting will advance state from dunning_t0 → dunning_grace.
			const dunningStart = new Date('2026-06-04T18:30:00Z');
			const sub = activeSub({
				state: 'dunning_t0',
				failed_attempt_count: 3,
				dunning_started_at: dunningStart,
				next_charge_at: new Date(dunningStart.getTime() + 5 * 24 * 60 * 60 * 1000)
			});
			mockAttemptsFindOne.mockResolvedValue(null);
			mockSubsFindOne.mockResolvedValue(sub);
			const provider = new MockProvider();
			vi.spyOn(provider, 'chargeMandate').mockResolvedValue({
				status: 'failed',
				failure_code: 'INSUFFICIENT_FUNDS',
				raw_response: {}
			});

			await processOneSubscription(sub, {
				provider,
				sendConfirmationEmail: false,
				now: sub.next_charge_at!
			});

			// The transition patch must NOT include next_charge_at (it stays put,
			// pointing at the day-5 attempt that just failed). S5 takes over.
			const transitionCall = mockSubsFindOneAndUpdate.mock.calls[mockSubsFindOneAndUpdate.mock.calls.length - 1];
			const patch = transitionCall[1] as { $set: Record<string, unknown> };
			expect(patch.$set.next_charge_at).toBeUndefined();
			// last_charge_attempt_at MUST still be patched so operators can see
			// when the most recent retry happened.
			expect(patch.$set.last_charge_attempt_at).toBeInstanceOf(Date);
		});
	});

	describe('S4 recovery (dunning_* → active)', () => {
		it('successful retry transitions dunning_t0 → active and sends a recovery email', async () => {
			const dunningStart = new Date('2026-06-04T18:30:00Z');
			const sub = activeSub({
				state: 'dunning_t0',
				failed_attempt_count: 2,
				dunning_started_at: dunningStart,
				next_charge_at: new Date(dunningStart.getTime() + 3 * 24 * 60 * 60 * 1000)
			});
			mockAttemptsFindOne.mockResolvedValue(null);
			mockSubsFindOne.mockResolvedValue(sub);
			const provider = new MockProvider();
			vi.spyOn(provider, 'chargeMandate').mockResolvedValue({
				status: 'succeeded',
				provider_payment_id: 'pay_recovery',
				raw_response: {}
			});

			const outcome = await processOneSubscription(sub, {
				provider,
				sendConfirmationEmail: true,
				now: sub.next_charge_at!
			});

			expect(outcome.kind).toBe('succeeded');
			// Transition was dunning_t0 → active (recovery path).
			const transitionCall = mockSubsFindOneAndUpdate.mock.calls.find((c) => {
				const filter = c[0] as { state?: string };
				const update = c[1] as { $set?: { state?: string } };
				return filter.state === 'dunning_t0' && update?.$set?.state === 'active';
			});
			expect(transitionCall).toBeDefined();
			// Recovery email subject differs from the standard renewal-confirmation
			// subject. (DSA mental state for "your dunning retry succeeded" is
			// materially different from "your monthly bill went through.")
			expect(mockSendEmail).toHaveBeenCalledWith(
				expect.objectContaining({
					subject: expect.stringContaining('went through')
				})
			);
			// BillingTransaction still inserted as recurring_charge.
			expect(mockTxInsertOne).toHaveBeenCalledWith(
				expect.objectContaining({ kind: 'recurring_charge', status: 'succeeded' })
			);
		});
	});

	describe('S4 manual retry mode', () => {
		it('manual mode failure: bumps state-machine self-loop but does NOT change next_charge_at', async () => {
			const dunningStart = new Date('2026-06-04T18:30:00Z');
			const scheduledRetry = new Date(dunningStart.getTime() + 3 * 24 * 60 * 60 * 1000);
			const sub = activeSub({
				state: 'dunning_t0',
				failed_attempt_count: 1,
				dunning_started_at: dunningStart,
				next_charge_at: scheduledRetry // cron's scheduled retry — must stay intact
			});
			mockAttemptsFindOne.mockResolvedValue(null);
			mockSubsFindOne.mockResolvedValue(sub);
			const provider = new MockProvider();
			vi.spyOn(provider, 'chargeMandate').mockResolvedValue({
				status: 'failed',
				failure_code: 'INSUFFICIENT_FUNDS',
				raw_response: {}
			});

			await processOneSubscription(sub, {
				provider,
				mode: 'manual',
				sendConfirmationEmail: false,
				now: new Date(dunningStart.getTime() + 2 * 60 * 60 * 1000) // 2h after dunning start, well before scheduled retry
			});

			// Self-loop transition: target state stays dunning_t0.
			const transitionCall = mockSubsFindOneAndUpdate.mock.calls.find((c) => {
				const filter = c[0] as { state?: string };
				const update = c[1] as { $set?: { state?: string } };
				return filter.state === 'dunning_t0' && update?.$set?.state === 'dunning_t0';
			});
			expect(transitionCall).toBeDefined();
			// CRITICAL: next_charge_at MUST NOT be in the patch — the cron's
			// scheduled retry stays put. Manual retries are bonus attempts.
			const patch = transitionCall![1] as { $set: Record<string, unknown> };
			expect(patch.$set.next_charge_at).toBeUndefined();
		});
	});

	describe('S4 in-flight race protection — E11000 atomic backstop', () => {
		it('skips with skipped_already_charged when partial-unique index rejects pending insert (true concurrent race)', async () => {
			// The application-layer probe catches "B starts after A's insert finished."
			// But for a TRUE concurrent race (both probes complete before either
			// insert), the probe is useless — both see no pending row. The atomic
			// backstop is the partial unique index on (subscription_id,
			// cycle_anchor) WHERE status='pending'. Mongo rejects the second
			// insert with E11000; chargeEngine maps that to skipped_already_charged.
			// Surfaced by D.1 S4 smoke Test S4-7 on 2026-05-27.
			const sub = activeSub({ failed_attempt_count: 0 });
			mockAttemptsFindOne.mockResolvedValue(null); // probe sees nothing
			mockAttemptsInsertOne.mockRejectedValueOnce({ code: 11000, message: 'E11000 duplicate key on pending_unique_subscription_cycle' });
			const provider = new MockProvider();
			const chargeMandateSpy = vi.spyOn(provider, 'chargeMandate');

			const outcome = await processOneSubscription(sub, {
				provider,
				sendConfirmationEmail: false
			});

			expect(outcome.kind).toBe('skipped_already_charged');
			// CRITICAL: provider NOT called. The whole point of the atomic
			// backstop is to bail BEFORE any chargeable side-effect.
			expect(chargeMandateSpy).not.toHaveBeenCalled();
		});

		it('re-throws non-E11000 insert errors (network, auth, etc.) — not silently swallowed', async () => {
			// E11000 is the ONLY error code that means "another caller in flight."
			// Any other error must propagate so the cron run shows it in the
			// error count and operators see it in logs.
			const sub = activeSub({ failed_attempt_count: 0 });
			mockAttemptsFindOne.mockResolvedValue(null);
			mockAttemptsInsertOne.mockRejectedValueOnce({ code: 121, message: 'document validation failed' });
			const provider = new MockProvider();

			const outcome = await processOneSubscription(sub, {
				provider,
				sendConfirmationEmail: false
			});

			expect(outcome.kind).toBe('error');
			if (outcome.kind === 'error') {
				expect(outcome.message).toContain('document validation');
			}
		});

		it('skips the charge when a fresh pending ChargeAttempt already exists', async () => {
			// Simulate: cron and manual retry-now firing simultaneously. The
			// SECOND caller's probe finds the FIRST caller's pending row and
			// must bail BEFORE inserting another row + calling provider.
			const sub = activeSub({ failed_attempt_count: 0 });
			const now = new Date('2026-06-04T18:30:00Z');
			const freshPending = {
				_id: new ObjectId(),
				attempt_id: 'first-caller-attempt-id',
				subscription_id: sub._id,
				dsa_id: sub.dsa_id,
				plan_id: 'pro',
				amount_paise: 399_900,
				status: 'pending' as const,
				cycle_anchor: sub.next_charge_at!,
				created_at: new Date(now.getTime() - 5 * 60 * 1000), // 5 min ago — well under STALE_PENDING_MS (30 min)
				updated_at: new Date(now.getTime() - 5 * 60 * 1000)
			};
			// Probe: first findOne (succeeded check) returns null; second
			// findOne (pending check) returns the fresh in-flight row.
			mockAttemptsFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce(freshPending);

			const provider = new MockProvider();
			const chargeMandateSpy = vi.spyOn(provider, 'chargeMandate');

			const outcome = await processOneSubscription(sub, {
				provider,
				sendConfirmationEmail: false,
				now
			});

			expect(outcome.kind).toBe('skipped_already_charged');
			// CRITICAL: no provider call, no new ChargeAttempt insert.
			expect(chargeMandateSpy).not.toHaveBeenCalled();
			expect(mockAttemptsInsertOne).not.toHaveBeenCalled();
		});
	});

	describe('pending_downgrade (spec §4 S6)', () => {
		it('flips plan_id before computing amount and clears the flag', async () => {
			const sub = activeSub({ plan_id: 'enterprise', pending_downgrade_to: 'pro' });
			mockAttemptsFindOne.mockResolvedValue(null);
			const provider = new MockProvider();
			const chargeSpy = vi.spyOn(provider, 'chargeMandate').mockResolvedValue({
				status: 'succeeded',
				provider_payment_id: 'pay_downgrade',
				raw_response: {}
			});

			await processOneSubscription(sub, { provider, sendConfirmationEmail: false });

			// The pre-charge updateOne must flip plan_id to 'pro' and $unset
			// pending_downgrade_to.
			const flipCall = mockSubsUpdateOne.mock.calls.find((c) => {
				const update = c[1] as {
					$set?: { plan_id?: string };
					$unset?: { pending_downgrade_to?: string };
				};
				return update?.$set?.plan_id === 'pro' && update?.$unset?.pending_downgrade_to === '';
			});
			expect(flipCall).toBeDefined();

			// And the charge was made for the PRO amount, not enterprise.
			expect(chargeSpy).toHaveBeenCalledWith(
				expect.objectContaining({ amount_paise: 399_900 })
			);
		});
	});
});
