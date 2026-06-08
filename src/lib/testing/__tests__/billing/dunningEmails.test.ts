/**
 * D.1 S5 M3 — Dunning email template behavioral tests
 * ══════════════════════════════════════════════════════════════════
 * Locks the contract of each of the 4 dunning email send functions plus
 * the cron-side dispatcher:
 *
 *   - Each send function calls sendEmail with the right subject + to
 *     + plan-name interpolation
 *   - Missing customer_email returns failure WITHOUT calling sendEmail
 *     (no crash on data drift, no log noise from a downstream null deref)
 *   - dispatchDunningAdvanceEmail routes grace/final/downgraded correctly
 *
 * sendEmail itself is mocked — the template tests do NOT exercise the
 * SES/SMTP/log-only branch selection (that's email.ts's responsibility).
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type { BillingSubscriptionDoc } from '$lib/types/billingSubscription';

const mockSendEmail = vi.fn();
vi.mock('$lib/server/email', () => ({
	sendEmail: (...args: unknown[]) => mockSendEmail(...args)
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import {
	sendDunningT0Email,
	sendDunningGraceEmail,
	sendDunningFinalEmail,
	sendDowngradedEmail,
	dispatchDunningAdvanceEmail
} from '$lib/server/billing/dunningEmails';

function makeSub(overrides: Partial<BillingSubscriptionDoc> = {}): BillingSubscriptionDoc {
	return {
		_id: new ObjectId(),
		dsa_id: new ObjectId(),
		state: 'dunning_t0',
		plan_id: 'pro',
		billing_cycle: 'monthly',
		provider: 'razorpay',
		max_amount_paise: 599850, // 3999 × 1.5
		customer_email: 'dsa@example.com',
		failed_attempt_count: 1,
		state_history: [],
		created_at: new Date(),
		updated_at: new Date(),
		...overrides
	} as BillingSubscriptionDoc;
}

beforeEach(() => {
	mockSendEmail.mockReset().mockResolvedValue({ success: true, messageId: 'test-msg-id' });
});

// ── sendDunningT0Email ─────────────────────────────────────────

describe('sendDunningT0Email', () => {
	it('sends to customer_email with "couldn\'t go through" subject + Pro plan name', async () => {
		const sub = makeSub({ plan_id: 'pro' });
		await sendDunningT0Email(sub);

		expect(mockSendEmail).toHaveBeenCalledTimes(1);
		const args = mockSendEmail.mock.calls[0][0];
		expect(args.to).toBe('dsa@example.com');
		expect(args.subject).toContain("couldn't go through");
		expect(args.html).toContain('Pro'); // plan name interpolated
		expect(args.text).toContain('Pro');
	});

	it('falls back to "subscription" when plan_id is unknown', async () => {
		const sub = makeSub({ plan_id: 'unknown_plan' as never });
		await sendDunningT0Email(sub);

		const args = mockSendEmail.mock.calls[0][0];
		expect(args.html).toContain('subscription');
	});

	it('skips send + returns no_recipient when customer_email is missing', async () => {
		const sub = makeSub({ customer_email: undefined });
		const result = await sendDunningT0Email(sub);

		expect(mockSendEmail).not.toHaveBeenCalled();
		expect(result.success).toBe(false);
		expect(result.error).toBe('no_recipient');
	});

	it('skips send when customer_email is whitespace-only (defensive)', async () => {
		const sub = makeSub({ customer_email: '   ' });
		const result = await sendDunningT0Email(sub);

		expect(mockSendEmail).not.toHaveBeenCalled();
		expect(result.error).toBe('no_recipient');
	});
});

// ── sendDunningGraceEmail ──────────────────────────────────────

describe('sendDunningGraceEmail', () => {
	it('sends with grace-specific subject mentioning "4 days of access"', async () => {
		await sendDunningGraceEmail(makeSub());

		const args = mockSendEmail.mock.calls[0][0];
		expect(args.subject).toContain('4 days of access');
		expect(args.html).toContain('4 more days of access');
	});
});

// ── sendDunningFinalEmail ──────────────────────────────────────

describe('sendDunningFinalEmail', () => {
	it('sends with final-notice subject "Access ends tomorrow"', async () => {
		await sendDunningFinalEmail(makeSub());

		const args = mockSendEmail.mock.calls[0][0];
		expect(args.subject).toContain('ends tomorrow');
		expect(args.html).toContain('final notice');
	});
});

// ── sendDowngradedEmail ────────────────────────────────────────

describe('sendDowngradedEmail', () => {
	it('sends with downgrade subject mentioning "downgraded" + Resubscribe CTA', async () => {
		await sendDowngradedEmail(makeSub());

		const args = mockSendEmail.mock.calls[0][0];
		expect(args.subject).toContain('downgraded');
		expect(args.html).toContain('Resubscribe');
		expect(args.html).toContain('re-subscribe');
	});

	it('mentions data preservation (cases / team data preserved)', async () => {
		await sendDowngradedEmail(makeSub());

		const args = mockSendEmail.mock.calls[0][0];
		expect(args.html).toContain('preserved');
	});
});

// ── dispatchDunningAdvanceEmail ────────────────────────────────

describe('dispatchDunningAdvanceEmail (cron-side router)', () => {
	it('routes "dunning_grace" → sendDunningGraceEmail (subject contains "4 days")', async () => {
		await dispatchDunningAdvanceEmail('dunning_grace', makeSub());

		const args = mockSendEmail.mock.calls[0][0];
		expect(args.subject).toContain('4 days of access');
	});

	it('routes "dunning_final" → sendDunningFinalEmail (subject contains "ends tomorrow")', async () => {
		await dispatchDunningAdvanceEmail('dunning_final', makeSub());

		const args = mockSendEmail.mock.calls[0][0];
		expect(args.subject).toContain('ends tomorrow');
	});

	it('routes "downgraded" → sendDowngradedEmail (subject contains "downgraded")', async () => {
		await dispatchDunningAdvanceEmail('downgraded', makeSub());

		const args = mockSendEmail.mock.calls[0][0];
		expect(args.subject).toContain('downgraded');
	});
});

// ── Canonical-host URL invariant ──────────────────────────────

describe('canonical-host invariant (rinn.in apex would 308 in email clients)', () => {
	it('every dunning email uses https://www.rinn.in/... (NOT apex rinn.in)', async () => {
		const fns = [
			sendDunningT0Email,
			sendDunningGraceEmail,
			sendDunningFinalEmail,
			sendDowngradedEmail
		];
		for (const fn of fns) {
			mockSendEmail.mockClear();
			await fn(makeSub());
			const args = mockSendEmail.mock.calls[0][0];
			expect(args.html).toContain('https://www.rinn.in/dashboard/dsa/billing');
			// Strict: no apex-form URLs leaked anywhere in the html.
			expect(args.html).not.toMatch(/href="https:\/\/rinn\.in\b/);
		}
	});
});
