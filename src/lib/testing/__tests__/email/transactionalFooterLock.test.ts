/**
 * SEC-8 — Transactional email footer 5-element lock
 * ══════════════════════════════════════════════════════════════════════
 * Locks the AWS SES production-access commitment (case 177987930900751,
 * 2026-06-01 v3 reply): EVERY transactional email rendered by an in-tree
 * sender includes the 5 footer elements:
 *
 *   1. Recipient's own email address
 *   2. Link to Notification Preferences page
 *   3. Link to Close Account
 *   4. DigitalDSA Technologies Private Limited + Noida postal address
 *   5. Reply-To support@digitaldsa.com
 *
 * Plus: every sendEmail call from a transactional sender passes
 * `replyTo: 'support@digitaldsa.com'` so SES sets the Reply-To header
 * (independent of body text).
 *
 * If a future sender skips the shared footer or omits replyTo, this
 * test fails — keeps the AWS commitment from silently drifting.
 *
 * Reference: ~/.claude/.../memory/project_ses_production_request.md
 * ══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type { BillingSubscriptionDoc } from '$lib/types/billingSubscription';
import type { InvoiceDoc } from '$lib/types/invoice';

const mockSendEmail = vi.fn();
vi.mock('$lib/server/email', () => ({
	sendEmail: (...args: unknown[]) => mockSendEmail(...args)
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { sendOTPEmail } from '$lib/services/emailService';
import { sendInvoiceReadyEmail } from '$lib/server/billing/invoiceEmail';
import {
	sendDunningT0Email,
	sendDunningGraceEmail,
	sendDunningFinalEmail,
	sendDowngradedEmail,
	sendPauseReminderEmail
} from '$lib/server/billing/dunningEmails';
import { sendTeamInviteEmail } from '$lib/server/emailTemplates/teamInviteEmail';
import {
	buildTransactionalFooterHtml,
	buildTransactionalFooterText,
	SENDER_LEGAL_NAME,
	SENDER_REGISTERED_ADDRESS,
	SUPPORT_EMAIL
} from '$lib/server/emailTemplates/footer';

const TEST_EMAIL = 'auditee@example.com';

function makeSub(overrides: Partial<BillingSubscriptionDoc> = {}): BillingSubscriptionDoc {
	return {
		_id: new ObjectId(),
		dsa_id: new ObjectId(),
		state: 'dunning_t0',
		plan_id: 'pro',
		billing_cycle: 'monthly',
		provider: 'razorpay',
		max_amount_paise: 599850,
		customer_email: TEST_EMAIL,
		failed_attempt_count: 1,
		state_history: [],
		created_at: new Date(),
		updated_at: new Date(),
		...overrides
	} as BillingSubscriptionDoc;
}

function makeInvoice(): InvoiceDoc {
	// Email path only reads _id, invoice_number, total_paise, issue_date.
	// Casting through unknown to skip the 15+ unrelated fields the doc
	// carries in real use.
	return {
		_id: new ObjectId(),
		dsa_id: new ObjectId(),
		invoice_number: 'DDSA/2026-27/00042',
		total_paise: 499900,
		subtotal_paise: 423644,
		tax_paise: 76256,
		issue_date: new Date('2026-06-05T00:00:00Z'),
		created_at: new Date()
	} as unknown as InvoiceDoc;
}

/**
 * Assert all 5 footer elements appear in the rendered HTML + text.
 * Element wording matches the constants — checking literal strings keeps
 * the lock honest if a future contributor "refactors" the labels.
 */
function expectFiveElementFooter(args: {
	html: string;
	text: string;
	recipient: string;
}) {
	const { html, text, recipient } = args;
	// 1. Recipient email
	expect(html).toContain(recipient);
	expect(text).toContain(recipient);
	// 2. Notification preferences link (path, host-agnostic so test passes
	//    regardless of PUBLIC_APP_BASE_URL env)
	expect(html).toContain('/dashboard/dsa/settings/notifications');
	expect(text).toContain('/dashboard/dsa/settings/notifications');
	// 3. Close account link
	expect(html).toContain('/dashboard/dsa/settings/account/close');
	expect(text).toContain('/dashboard/dsa/settings/account/close');
	// 4. Legal name + postal address committed to AWS
	expect(html).toContain(SENDER_LEGAL_NAME);
	expect(html).toContain(SENDER_REGISTERED_ADDRESS);
	expect(text).toContain(SENDER_LEGAL_NAME);
	expect(text).toContain(SENDER_REGISTERED_ADDRESS);
	// 5. Reply-To support email mentioned in body (header is asserted separately)
	expect(html).toContain(SUPPORT_EMAIL);
	expect(text).toContain(SUPPORT_EMAIL);
}

beforeEach(() => {
	mockSendEmail.mockReset().mockResolvedValue({ success: true, messageId: 'test-msg-id' });
});

// ── Footer module — pure-function contract ─────────────────────

describe('buildTransactionalFooter', () => {
	it('HTML renders all 5 elements with the recipient HTML-escaped', () => {
		const html = buildTransactionalFooterHtml({ recipientEmail: 'a@b.com' });
		expect(html).toContain('a@b.com');
		expect(html).toContain('/dashboard/dsa/settings/notifications');
		expect(html).toContain('/dashboard/dsa/settings/account/close');
		expect(html).toContain(SENDER_LEGAL_NAME);
		expect(html).toContain(SENDER_REGISTERED_ADDRESS);
		expect(html).toContain(SUPPORT_EMAIL);
	});

	it('HTML escapes recipient email to block attribute breakout', () => {
		const html = buildTransactionalFooterHtml({
			recipientEmail: 'evil"><script>alert(1)</script>@x.com'
		});
		expect(html).not.toContain('<script>alert(1)</script>');
		expect(html).toContain('&quot;');
		expect(html).toContain('&lt;script&gt;');
	});

	it('text version renders all 5 elements (no escaping needed)', () => {
		const text = buildTransactionalFooterText({ recipientEmail: 'a@b.com' });
		expect(text).toContain('a@b.com');
		expect(text).toContain('/dashboard/dsa/settings/notifications');
		expect(text).toContain('/dashboard/dsa/settings/account/close');
		expect(text).toContain(SENDER_LEGAL_NAME);
		expect(text).toContain(SENDER_REGISTERED_ADDRESS);
		expect(text).toContain(SUPPORT_EMAIL);
	});
});

// ── OTP — sendOTPEmail (signup, once) ──────────────────────────

describe('sendOTPEmail (template A — OTP)', () => {
	it('includes the 5-element footer and sets replyTo to support@', async () => {
		await sendOTPEmail(TEST_EMAIL, '123456', 'Test User');
		expect(mockSendEmail).toHaveBeenCalledTimes(1);
		const args = mockSendEmail.mock.calls[0][0];
		expect(args.replyTo).toBe(SUPPORT_EMAIL);
		expectFiveElementFooter({ html: args.html, text: args.text, recipient: TEST_EMAIL });
	});

	it('no longer contains the "Please do not reply" line', async () => {
		await sendOTPEmail(TEST_EMAIL, '123456', 'Test User');
		const args = mockSendEmail.mock.calls[0][0];
		expect(args.html).not.toContain('Please do not reply');
		expect(args.text).not.toContain('Please do not reply');
	});
});

// ── Invoice ready — sendInvoiceReadyEmail (template B — renewal receipt) ──

describe('sendInvoiceReadyEmail (template B — renewal receipt)', () => {
	it('includes the 5-element footer and sets replyTo to support@', async () => {
		await sendInvoiceReadyEmail({ invoice: makeInvoice(), to: TEST_EMAIL, dsaName: 'Tester' });
		expect(mockSendEmail).toHaveBeenCalledTimes(1);
		const args = mockSendEmail.mock.calls[0][0];
		expect(args.replyTo).toBe(SUPPORT_EMAIL);
		expectFiveElementFooter({ html: args.html, text: args.text, recipient: TEST_EMAIL });
	});
});

// ── Team invite — sendTeamInviteEmail (template D — team invite) ──

describe('sendTeamInviteEmail (template D — team invite)', () => {
	it('includes the 5-element footer and sets replyTo to support@', async () => {
		await sendTeamInviteEmail({
			to: TEST_EMAIL,
			inviterName: 'Alice Owner',
			inviteeName: 'Bob Invitee',
			inviteCode: 'ABC234',
			teamRole: 'data_entry'
		});
		expect(mockSendEmail).toHaveBeenCalledTimes(1);
		const args = mockSendEmail.mock.calls[0][0];
		expect(args.replyTo).toBe(SUPPORT_EMAIL);
		expectFiveElementFooter({ html: args.html, text: args.text, recipient: TEST_EMAIL });
	});

	it('includes the inviter name, invite code, and join URL', async () => {
		await sendTeamInviteEmail({
			to: TEST_EMAIL,
			inviterName: 'Alice Owner',
			inviteeName: 'Bob Invitee',
			inviteCode: 'XYZ789',
			teamRole: 'admin'
		});
		const args = mockSendEmail.mock.calls[0][0];
		expect(args.html).toContain('Alice Owner');
		expect(args.html).toContain('XYZ789');
		expect(args.html).toContain('/team-invite/XYZ789');
		expect(args.text).toContain('Alice Owner');
		expect(args.text).toContain('XYZ789');
	});
});

// ── Dunning ×5 — every template flows through the shared frame ─────

describe('Dunning templates (template C — failed payment / dunning)', () => {
	const cases: Array<{
		name: string;
		send: (sub: BillingSubscriptionDoc) => Promise<unknown>;
	}> = [
		{ name: 'sendDunningT0Email', send: sendDunningT0Email },
		{ name: 'sendDunningGraceEmail', send: sendDunningGraceEmail },
		{ name: 'sendDunningFinalEmail', send: sendDunningFinalEmail },
		{ name: 'sendDowngradedEmail', send: sendDowngradedEmail },
		{ name: 'sendPauseReminderEmail', send: sendPauseReminderEmail }
	];

	for (const c of cases) {
		it(`${c.name}: includes the 5-element footer and sets replyTo to support@`, async () => {
			await c.send(makeSub());
			expect(mockSendEmail).toHaveBeenCalledTimes(1);
			const args = mockSendEmail.mock.calls[0][0];
			expect(args.replyTo).toBe(SUPPORT_EMAIL);
			expectFiveElementFooter({ html: args.html, text: args.text, recipient: TEST_EMAIL });
		});
	}
});
