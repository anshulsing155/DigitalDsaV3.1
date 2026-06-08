/**
 * QBC notification email template behavioral tests
 * ══════════════════════════════════════════════════════════════════
 * Locks the contract of the 3 QBC send functions:
 *
 *   - Each function calls sendEmail with the right recipient, subject,
 *     and key interpolated values (plan name, count, cycle date, etc.)
 *   - Plural vs singular wording for the count-driven templates
 *   - upgrade vs cycle_reset wording divergence in the auto-unblock template
 *
 * sendEmail is mocked — these tests do NOT exercise the SES/SMTP branch
 * selection (that's email.ts's responsibility). DsaApplications is not
 * exercised either — the recipient is passed in by the call site, so
 * template tests do not need a DB mock.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSendEmail = vi.fn();
vi.mock('$lib/server/email', () => ({
	sendEmail: (...args: unknown[]) => mockSendEmail(...args)
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import {
	sendBufferSaveEmail,
	sendAutoUnblockEmail,
	sendArchiveExpiredEmail,
	type DsaEmailRecipient
} from '$lib/server/billing/quotaBlockedEmails';

const recipient: DsaEmailRecipient = { to: 'dsa@example.com', name: 'Test DSA' };

beforeEach(() => {
	mockSendEmail.mockReset().mockResolvedValue({ success: true, messageId: 'test-msg-id' });
});

// ── sendBufferSaveEmail ────────────────────────────────────────

describe('sendBufferSaveEmail', () => {
	it('sends to recipient.to with subject mentioning the cycle date + saved case', async () => {
		await sendBufferSaveEmail({
			recipient,
			planName: 'Pro',
			caseLabel: 'Home Loan — Ghaziabad — SENP case',
			nextCycleAtIso: '2026-07-04T10:00:00.000Z'
		});

		expect(mockSendEmail).toHaveBeenCalledTimes(1);
		const args = mockSendEmail.mock.calls[0][0];
		expect(args.to).toBe('dsa@example.com');
		expect(args.subject).toContain('saved to buffer');
		expect(args.subject).toContain('4 Jul 2026');
		expect(args.html).toContain('Pro');
		expect(args.html).toContain('Home Loan — Ghaziabad — SENP case');
		expect(args.html).toContain('4 Jul 2026');
		expect(args.text).toContain('Pro');
	});

	it('falls back to raw ISO when the date is unparseable (defensive)', async () => {
		await sendBufferSaveEmail({
			recipient,
			planName: 'Basic',
			caseLabel: 'Foo',
			nextCycleAtIso: 'not-a-date'
		});

		const args = mockSendEmail.mock.calls[0][0];
		expect(args.subject).toContain('not-a-date');
	});

	it('HTML-escapes the case label so a label with markup never breaks the message', async () => {
		await sendBufferSaveEmail({
			recipient,
			planName: 'Pro',
			caseLabel: '<script>alert(1)</script>',
			nextCycleAtIso: '2026-07-04T10:00:00.000Z'
		});

		const args = mockSendEmail.mock.calls[0][0];
		expect(args.html).not.toContain('<script>alert(1)</script>');
		expect(args.html).toContain('&lt;script&gt;');
	});
});

// ── sendAutoUnblockEmail ───────────────────────────────────────

describe('sendAutoUnblockEmail', () => {
	it('upgrade + count 1 → subject says "Upgrade processed" and uses singular "1 saved case"', async () => {
		await sendAutoUnblockEmail({
			recipient,
			planName: 'Pro',
			unblockedCount: 1,
			reason: 'upgrade'
		});

		const args = mockSendEmail.mock.calls[0][0];
		expect(args.subject).toContain('Upgrade processed');
		expect(args.subject).toContain('1 saved case');
		expect(args.html).toContain('upgrade freed up capacity');
	});

	it('cycle_reset + count 3 → subject says "New cycle" and uses plural "3 saved cases"', async () => {
		await sendAutoUnblockEmail({
			recipient,
			planName: 'Basic',
			unblockedCount: 3,
			reason: 'cycle_reset'
		});

		const args = mockSendEmail.mock.calls[0][0];
		expect(args.subject).toContain('New cycle');
		expect(args.subject).toContain('3 saved cases');
		expect(args.html).toContain('cycle reset on');
		expect(args.html).toContain('Basic');
	});
});

// ── sendArchiveExpiredEmail ────────────────────────────────────

describe('sendArchiveExpiredEmail', () => {
	it('count 1 → singular wording', async () => {
		await sendArchiveExpiredEmail({ recipient, archivedCount: 1 });

		const args = mockSendEmail.mock.calls[0][0];
		expect(args.subject).toContain('1 saved case');
		expect(args.html).toContain('1 saved case');
	});

	it('count 5 → plural wording', async () => {
		await sendArchiveExpiredEmail({ recipient, archivedCount: 5 });

		const args = mockSendEmail.mock.calls[0][0];
		expect(args.subject).toContain('5 saved cases');
		expect(args.html).toContain('archived');
	});

	it('reassures the DSA that data is not deleted', async () => {
		await sendArchiveExpiredEmail({ recipient, archivedCount: 2 });

		const args = mockSendEmail.mock.calls[0][0];
		expect(args.html).toContain('Nothing was deleted');
	});
});
