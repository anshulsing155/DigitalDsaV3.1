/**
 * D.1 S6 M6 — pause auto-cancel sweep engine
 * ══════════════════════════════════════════════════════════════════
 * Locks the contract of:
 *
 *   evaluatePause(sub, now) — pure day-N math
 *     - state != paused → null
 *     - missing paused_at in state_history → null
 *     - day < 60 → null
 *     - day 60-89 with no pause_reminder_sent_at → 'send_reminder'
 *     - day 60-89 with pause_reminder_sent_at already set → null
 *     - day >= 90 → 'auto_cancel' (regardless of reminder flag)
 *
 *   processPauseSweepBatch — DB walk
 *     - reminder path: stamps pause_reminder_sent_at BEFORE email send
 *     - auto-cancel path: transitions paused → cancelled + best-effort
 *       revoke + audit
 *     - idempotency: precondition on `pause_reminder_sent_at: $exists:false`
 *       so concurrent invocations can't double-send
 *     - email throw does NOT roll back the stamped field
 *     - state_history without paused entry → skipped_missing_paused_at outcome
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type { BillingSubscriptionDoc } from '$lib/types/billingSubscription';

const TEST_DSA_OID = new ObjectId();

const mockSubsFind = vi.fn();
const mockSubsFindOne = vi.fn();
const mockSubsFindOneAndUpdate = vi.fn();
const mockAuditInsertOne = vi.fn();
const mockRevokeMandate = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	BillingSubscriptions: {
		find: (...args: unknown[]) => mockSubsFind(...args),
		findOne: (...args: unknown[]) => mockSubsFindOne(...args),
		findOneAndUpdate: (...args: unknown[]) => mockSubsFindOneAndUpdate(...args),
		updateOne: vi.fn(),
		insertOne: vi.fn()
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

vi.mock('$lib/server/billing/providerRegistry', () => ({
	getBillingProvider: () => ({
		name: 'mock',
		revokeMandate: mockRevokeMandate,
		chargeMandate: vi.fn(),
		registerMandate: vi.fn(),
		refundCharge: vi.fn(),
		queryMandateStatus: vi.fn(),
		fetchSettlements: vi.fn(),
		verifyWebhookSignature: vi.fn(),
		parseWebhookEvent: vi.fn()
	})
}));

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-01T00:00:00Z');

function makeSub(
	pausedDaysAgo: number,
	overrides: Partial<BillingSubscriptionDoc> = {}
): BillingSubscriptionDoc {
	const pausedAt = new Date(NOW.getTime() - pausedDaysAgo * DAY);
	return {
		_id: new ObjectId(),
		dsa_id: TEST_DSA_OID,
		state: 'paused',
		plan_id: 'pro',
		billing_cycle: 'monthly',
		provider: 'razorpay',
		max_amount_paise: 599850,
		failed_attempt_count: 0,
		mandate_token: 'tok_paused_xyz',
		state_history: [
			{
				from: 'active',
				to: 'paused',
				at: pausedAt,
				reason: 'DSA paused subscription'
			}
		],
		created_at: new Date(pausedAt.getTime() - 30 * DAY),
		updated_at: pausedAt,
		...overrides
	} as BillingSubscriptionDoc;
}

beforeEach(() => {
	mockSubsFind.mockReset();
	mockSubsFindOne.mockReset();
	mockSubsFindOneAndUpdate.mockReset();
	mockAuditInsertOne.mockReset().mockResolvedValue({ insertedId: new ObjectId() });
	mockRevokeMandate.mockReset().mockResolvedValue({ status: 'succeeded', raw_response: {} });
});

// ── evaluatePause ───────────────────────────────────────────────

describe('evaluatePause (pure day-N math)', () => {
	it('returns null for non-paused subs', async () => {
		const { evaluatePause } = await import('../../../server/billing/pauseSweepEngine');
		const sub = makeSub(70, { state: 'active' });
		expect(evaluatePause(sub, NOW)).toBeNull();
	});

	it('returns null when no `* → paused` entry exists in state_history', async () => {
		const { evaluatePause } = await import('../../../server/billing/pauseSweepEngine');
		const sub = makeSub(70, { state_history: [] });
		expect(evaluatePause(sub, NOW)).toBeNull();
	});

	it('returns null for days < 60', async () => {
		const { evaluatePause } = await import('../../../server/billing/pauseSweepEngine');
		const sub = makeSub(59);
		expect(evaluatePause(sub, NOW)).toBeNull();
	});

	it('returns send_reminder at day 60 (boundary)', async () => {
		const { evaluatePause } = await import('../../../server/billing/pauseSweepEngine');
		const sub = makeSub(60);
		expect(evaluatePause(sub, NOW)).toEqual({ kind: 'send_reminder' });
	});

	it('returns send_reminder at day 89', async () => {
		const { evaluatePause } = await import('../../../server/billing/pauseSweepEngine');
		const sub = makeSub(89);
		expect(evaluatePause(sub, NOW)).toEqual({ kind: 'send_reminder' });
	});

	it('returns null when day in 60-89 range but pause_reminder_sent_at already set', async () => {
		const { evaluatePause } = await import('../../../server/billing/pauseSweepEngine');
		const sub = makeSub(75, { pause_reminder_sent_at: new Date(NOW.getTime() - 5 * DAY) });
		expect(evaluatePause(sub, NOW)).toBeNull();
	});

	it('returns auto_cancel at day 90 (boundary)', async () => {
		const { evaluatePause } = await import('../../../server/billing/pauseSweepEngine');
		const sub = makeSub(90);
		expect(evaluatePause(sub, NOW)).toEqual({ kind: 'auto_cancel' });
	});

	it('returns auto_cancel at day 100 regardless of reminder flag', async () => {
		const { evaluatePause } = await import('../../../server/billing/pauseSweepEngine');
		const sub = makeSub(100, { pause_reminder_sent_at: new Date(NOW.getTime() - 40 * DAY) });
		expect(evaluatePause(sub, NOW)).toEqual({ kind: 'auto_cancel' });
	});

	it('picks the MOST RECENT paused transition when multiple exist', async () => {
		const { evaluatePause } = await import('../../../server/billing/pauseSweepEngine');
		const oldPause = new Date(NOW.getTime() - 200 * DAY);
		const recentResume = new Date(NOW.getTime() - 150 * DAY);
		const recentPause = new Date(NOW.getTime() - 10 * DAY); // only 10 days ago
		const sub = makeSub(10, {
			state_history: [
				{ from: 'active', to: 'paused', at: oldPause, reason: 'first pause' },
				{ from: 'paused', to: 'active', at: recentResume, reason: 'resumed' },
				{ from: 'active', to: 'paused', at: recentPause, reason: 'paused again' }
			]
		});
		// Most-recent paused is 10 days ago → no action.
		expect(evaluatePause(sub, NOW)).toBeNull();
	});
});

// ── processPauseSweepBatch ──────────────────────────────────────

describe('processPauseSweepBatch', () => {
	function mockFindCursor(rows: BillingSubscriptionDoc[]) {
		mockSubsFind.mockReturnValue({
			limit: () => ({ toArray: async () => rows })
		});
	}

	it('aggregates outcomes across a mixed batch', async () => {
		const { processPauseSweepBatch } = await import('../../../server/billing/pauseSweepEngine');
		const newlyPaused = makeSub(30);
		const reminderDue = makeSub(60);
		// Auto-cancel sub uses a DIFFERENT dsa_id so applyTransition's
		// findOne({dsa_id}) is unambiguous in the mock.
		const otherDsa = new ObjectId();
		const autoCancelDue = makeSub(95, { dsa_id: otherDsa });
		mockFindCursor([newlyPaused, reminderDue, autoCancelDue]);

		// Dispatch mock by filter shape:
		//   - has _id + pause_reminder_sent_at $exists:false → reminder stamp path
		//   - has dsa_id + state preconditions → applyTransition path
		mockSubsFindOneAndUpdate.mockImplementation(
			async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
				if (filter._id && (filter as { pause_reminder_sent_at?: unknown }).pause_reminder_sent_at) {
					// Reminder stamp call.
					if ((filter._id as ObjectId).equals(reminderDue._id!)) {
						return { ...reminderDue, pause_reminder_sent_at: NOW };
					}
					return null;
				}
				// applyTransition call — filter has dsa_id + state.
				const setOps = (update.$set ?? {}) as Record<string, unknown>;
				if ((filter.dsa_id as ObjectId).equals(otherDsa) && setOps.state === 'cancelled') {
					return { ...autoCancelDue, state: 'cancelled' };
				}
				return null;
			}
		);

		// applyTransition's findOne lookup keyed by dsa_id.
		mockSubsFindOne.mockImplementation(async (filter: { dsa_id?: ObjectId }) => {
			if (filter.dsa_id && filter.dsa_id.equals(otherDsa)) return autoCancelDue;
			return null;
		});

		const sendReminder = vi.fn(async () => {});
		const summary = await processPauseSweepBatch({ now: NOW, sendReminderEmail: sendReminder });

		expect(summary.total).toBe(3);
		expect(summary.no_action).toBe(1);
		expect(summary.reminders_sent).toBe(1);
		expect(summary.auto_cancelled).toBe(1);
		expect(sendReminder).toHaveBeenCalledOnce();
		expect(mockRevokeMandate).toHaveBeenCalledWith('tok_paused_xyz');
	});

	it('skips_missing_paused_at when state_history lacks a paused entry', async () => {
		const { processPauseSweepBatch } = await import('../../../server/billing/pauseSweepEngine');
		const broken = makeSub(70, { state_history: [] });
		mockFindCursor([broken]);
		const summary = await processPauseSweepBatch({
			now: NOW,
			sendReminderEmail: vi.fn(async () => {})
		});
		expect(summary.skipped).toBe(1);
		expect(summary.outcomes[0].kind).toBe('skipped_missing_paused_at');
	});

	it('reminder path: stamps pause_reminder_sent_at BEFORE the email send', async () => {
		const { processPauseSweepBatch } = await import('../../../server/billing/pauseSweepEngine');
		const sub = makeSub(65);
		mockFindCursor([sub]);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...sub, pause_reminder_sent_at: NOW });

		const sendOrder: string[] = [];
		mockSubsFindOneAndUpdate.mockImplementation(async () => {
			sendOrder.push('field_stamped');
			return { ...sub, pause_reminder_sent_at: NOW };
		});
		const sendReminder = vi.fn(async () => {
			sendOrder.push('email_sent');
		});

		await processPauseSweepBatch({ now: NOW, sendReminderEmail: sendReminder });
		expect(sendOrder).toEqual(['field_stamped', 'email_sent']);
	});

	it('reminder email throw does NOT roll back the stamped field', async () => {
		const { processPauseSweepBatch } = await import('../../../server/billing/pauseSweepEngine');
		const sub = makeSub(65);
		mockFindCursor([sub]);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...sub, pause_reminder_sent_at: NOW });
		const sendReminder = vi.fn(async () => {
			throw new Error('SES outage');
		});

		const summary = await processPauseSweepBatch({
			now: NOW,
			sendReminderEmail: sendReminder
		});
		// Engine catches the throw — outcome is still reminder_sent (field is
		// stamped; we'd rather skip a duplicate send than re-send on retry).
		expect(summary.reminders_sent).toBe(1);
		expect(summary.errors).toBe(0);
	});

	it('reminder path: concurrent precondition mismatch → no_action', async () => {
		const { processPauseSweepBatch } = await import('../../../server/billing/pauseSweepEngine');
		const sub = makeSub(65);
		mockFindCursor([sub]);
		// Another invocation stamped the field first.
		mockSubsFindOneAndUpdate.mockResolvedValue(null);

		const sendReminder = vi.fn(async () => {});
		const summary = await processPauseSweepBatch({
			now: NOW,
			sendReminderEmail: sendReminder
		});
		expect(summary.reminders_sent).toBe(0);
		expect(summary.no_action).toBe(1);
		expect(sendReminder).not.toHaveBeenCalled();
	});

	it('auto-cancel path: revoke failure does NOT abort the cancel transition', async () => {
		const { processPauseSweepBatch } = await import('../../../server/billing/pauseSweepEngine');
		const sub = makeSub(95);
		mockFindCursor([sub]);
		mockSubsFindOne.mockResolvedValue(sub);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...sub, state: 'cancelled' });
		mockRevokeMandate.mockRejectedValue(new Error('Razorpay 503'));

		const summary = await processPauseSweepBatch({
			now: NOW,
			sendReminderEmail: vi.fn(async () => {})
		});

		expect(summary.auto_cancelled).toBe(1);
		const outcome = summary.outcomes[0];
		if (outcome.kind !== 'auto_cancelled') throw new Error('expected auto_cancelled');
		expect(outcome.revoke_status).toBe('threw');
	});

	it('auto-cancel path: skips revoke when mandate_token is absent', async () => {
		const { processPauseSweepBatch } = await import('../../../server/billing/pauseSweepEngine');
		const sub = makeSub(95, { mandate_token: undefined });
		mockFindCursor([sub]);
		mockSubsFindOne.mockResolvedValue(sub);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...sub, state: 'cancelled' });

		const summary = await processPauseSweepBatch({
			now: NOW,
			sendReminderEmail: vi.fn(async () => {})
		});

		expect(summary.auto_cancelled).toBe(1);
		const outcome = summary.outcomes[0];
		if (outcome.kind !== 'auto_cancelled') throw new Error('expected auto_cancelled');
		expect(outcome.revoke_status).toBe('skipped_no_token');
		expect(mockRevokeMandate).not.toHaveBeenCalled();
	});
});
