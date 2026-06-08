/**
 * D.1 S3 — reminderEngine behavioral tests
 * ══════════════════════════════════════════════════════════════════
 * What's tested:
 *   - dedupe: skip when last_reminder_sent_at is within the current cycle's window
 *   - skip_no_email: skip when customer_email is missing
 *   - successful send: email dispatched, last_reminder_sent_at updated
 *   - failed send: outcome 'failed', last_reminder_sent_at NOT touched
 *     (so next tick retries)
 *
 * Mongo + sendEmail + audit fully mocked.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type { BillingSubscriptionDoc } from '$lib/types/billingSubscription';

const mockSubsFind = vi.fn();
const mockSubsUpdateOne = vi.fn();
const mockAuditInsertOne = vi.fn();
const mockSendEmail = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	BillingSubscriptions: {
		find: (...args: unknown[]) => mockSubsFind(...args),
		updateOne: (...args: unknown[]) => mockSubsUpdateOne(...args)
	},
	BillingAuditLogs: {
		insertOne: (...args: unknown[]) => mockAuditInsertOne(...args)
	}
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

vi.mock('$lib/server/email', () => ({
	sendEmail: (...args: unknown[]) => mockSendEmail(...args)
}));

import { sendReminderForSubscription } from '$lib/server/billing/reminderEngine';

function activeSub(overrides: Partial<BillingSubscriptionDoc> = {}): BillingSubscriptionDoc {
	const now = new Date('2026-06-01T12:00:00Z');
	return {
		_id: new ObjectId(),
		dsa_id: new ObjectId(),
		state: 'active',
		plan_id: 'pro',
		billing_cycle: 'monthly',
		provider: 'mock',
		mandate_token: 'mock_mandate_xxx',
		customer_email: 'dsa@example.com',
		max_amount_paise: 599_800,
		anchor_day: 5,
		next_charge_at: new Date('2026-06-04T18:30:00Z'), // 5th 00:00 IST (~3.25 days out)
		failed_attempt_count: 0,
		state_history: [],
		created_at: now,
		updated_at: now,
		...overrides
	};
}

beforeEach(() => {
	mockSubsFind.mockReset();
	mockSubsUpdateOne.mockReset();
	mockAuditInsertOne.mockReset();
	mockSendEmail.mockReset();
	mockSubsUpdateOne.mockResolvedValue({ acknowledged: true });
	mockAuditInsertOne.mockResolvedValue({ insertedId: new ObjectId() });
});

describe('reminderEngine.sendReminderForSubscription', () => {
	it('sends the email and stamps last_reminder_sent_at on success', async () => {
		const sub = activeSub();
		mockSendEmail.mockResolvedValue(undefined);

		const outcome = await sendReminderForSubscription(sub);

		expect(outcome.status).toBe('sent');
		expect(mockSendEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'dsa@example.com',
				subject: expect.stringContaining('₹3999')
			})
		);
		expect(mockSubsUpdateOne).toHaveBeenCalledWith(
			{ _id: sub._id },
			expect.objectContaining({
				$set: expect.objectContaining({ last_reminder_sent_at: expect.any(Date) })
			})
		);
	});

	it('skips when last_reminder_sent_at is within the current cycle window', async () => {
		const sub = activeSub({
			// next_charge_at is June 4 18:30 UTC; 4 days earlier = May 31 18:30 UTC.
			// A reminder sent on June 1 falls inside that window — already done this cycle.
			last_reminder_sent_at: new Date('2026-06-01T00:00:00Z')
		});

		const outcome = await sendReminderForSubscription(sub);

		expect(outcome.status).toBe('skipped_dedup');
		expect(mockSendEmail).not.toHaveBeenCalled();
		expect(mockSubsUpdateOne).not.toHaveBeenCalled();
	});

	it('does NOT skip when last_reminder_sent_at is from a PRIOR cycle', async () => {
		const sub = activeSub({
			// Reminder from last month's cycle (May 1). Current cycle window
			// opens May 31; May 1 is well before, so this is a fresh cycle.
			last_reminder_sent_at: new Date('2026-05-01T00:00:00Z')
		});
		mockSendEmail.mockResolvedValue(undefined);

		const outcome = await sendReminderForSubscription(sub);

		expect(outcome.status).toBe('sent');
		expect(mockSendEmail).toHaveBeenCalled();
	});

	it('skips when customer_email is missing', async () => {
		const sub = activeSub({ customer_email: undefined });

		const outcome = await sendReminderForSubscription(sub);

		expect(outcome.status).toBe('skipped_no_email');
		expect(mockSendEmail).not.toHaveBeenCalled();
	});

	it('does NOT update last_reminder_sent_at when sendEmail fails (so next tick retries)', async () => {
		const sub = activeSub();
		mockSendEmail.mockRejectedValue(new Error('SMTP timeout'));

		const outcome = await sendReminderForSubscription(sub);

		expect(outcome.status).toBe('failed');
		expect(outcome.error).toContain('SMTP timeout');
		expect(mockSubsUpdateOne).not.toHaveBeenCalled();
	});
});
