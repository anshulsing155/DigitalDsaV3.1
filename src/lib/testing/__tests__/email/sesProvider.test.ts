/**
 * SEC-8 — SES provider unit tests
 * ══════════════════════════════════════════════════════════════════════
 * Mocks @aws-sdk/client-sesv2 to verify:
 *   - isSesConfigured() honors the EMAIL_PROVIDER=ses + creds + from-email gate
 *   - sendEmailViaSes builds the right SendEmailCommand payload
 *   - Errors propagate as EmailResult.success=false (not thrown)
 *   - Attachments are dropped with a warning (SES v2 simple content limitation)
 * ══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────
// vi.mock factories are hoisted above imports, so any variable they
// reference must be created via vi.hoisted() (also hoisted) to be in
// scope when the factory runs.

const hoisted = vi.hoisted(() => {
	const mockSesSend = vi.fn();
	const mockSendEmailCommand = vi.fn((input: unknown) => ({ __cmd: 'SendEmailCommand', input }));
	const mockEnv: Record<string, string | undefined> = {};
	return { mockSesSend, mockSendEmailCommand, mockEnv };
});

const mockSesSend = hoisted.mockSesSend;
const mockSendEmailCommand = hoisted.mockSendEmailCommand;
const mockEnv = hoisted.mockEnv;

vi.mock('@aws-sdk/client-sesv2', () => ({
	SESv2Client: vi.fn(() => ({ send: hoisted.mockSesSend })),
	SendEmailCommand: hoisted.mockSendEmailCommand
}));

vi.mock('$env/dynamic/private', () => ({
	env: new Proxy(hoisted.mockEnv, {
		get(target, prop: string) {
			return target[prop];
		}
	})
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import {
	isSesConfigured,
	sendEmailViaSes,
	_resetSesClientForTests
} from '$lib/server/emailProviders/sesProvider';

beforeEach(() => {
	mockSesSend.mockReset();
	mockSendEmailCommand.mockClear();
	for (const k of Object.keys(mockEnv)) delete mockEnv[k];
	_resetSesClientForTests();
});

afterEach(() => {
	for (const k of Object.keys(mockEnv)) delete mockEnv[k];
	_resetSesClientForTests();
});

// ── isSesConfigured ──────────────────────────────────────────────

describe('isSesConfigured', () => {
	it('returns false when EMAIL_PROVIDER is unset', () => {
		mockEnv.AWS_ACCESS_KEY_ID = 'AKIATEST';
		mockEnv.AWS_SECRET_ACCESS_KEY = 'secret';
		mockEnv.SES_FROM_EMAIL = 'noreply@digitaldsa.com';
		expect(isSesConfigured()).toBe(false);
	});

	it('returns false when EMAIL_PROVIDER is not "ses"', () => {
		mockEnv.EMAIL_PROVIDER = 'nodemailer';
		mockEnv.AWS_ACCESS_KEY_ID = 'AKIATEST';
		mockEnv.AWS_SECRET_ACCESS_KEY = 'secret';
		mockEnv.SES_FROM_EMAIL = 'noreply@digitaldsa.com';
		expect(isSesConfigured()).toBe(false);
	});

	it('returns false when AWS creds are missing even with EMAIL_PROVIDER=ses', () => {
		mockEnv.EMAIL_PROVIDER = 'ses';
		mockEnv.SES_FROM_EMAIL = 'noreply@digitaldsa.com';
		expect(isSesConfigured()).toBe(false);
	});

	it('returns false when SES_FROM_EMAIL is missing', () => {
		mockEnv.EMAIL_PROVIDER = 'ses';
		mockEnv.AWS_ACCESS_KEY_ID = 'AKIATEST';
		mockEnv.AWS_SECRET_ACCESS_KEY = 'secret';
		expect(isSesConfigured()).toBe(false);
	});

	it('returns true when all three conditions are satisfied (case-insensitive provider)', () => {
		mockEnv.EMAIL_PROVIDER = 'SES';
		mockEnv.AWS_ACCESS_KEY_ID = 'AKIATEST';
		mockEnv.AWS_SECRET_ACCESS_KEY = 'secret';
		mockEnv.SES_FROM_EMAIL = 'noreply@digitaldsa.com';
		expect(isSesConfigured()).toBe(true);
	});
});

// ── sendEmailViaSes — happy path ─────────────────────────────────

describe('sendEmailViaSes — happy path', () => {
	function withFullSesEnv() {
		mockEnv.EMAIL_PROVIDER = 'ses';
		mockEnv.AWS_REGION = 'ap-south-1';
		mockEnv.AWS_ACCESS_KEY_ID = 'AKIATEST';
		mockEnv.AWS_SECRET_ACCESS_KEY = 'secret';
		mockEnv.SES_FROM_EMAIL = 'noreply@digitaldsa.com';
	}

	it('returns success with a messageId on a successful send', async () => {
		withFullSesEnv();
		mockSesSend.mockResolvedValue({ MessageId: '0000018d-abc-message-id' });

		const result = await sendEmailViaSes({
			to: 'dsa@example.com',
			subject: 'Test',
			html: '<p>Hi</p>',
			text: 'Hi'
		});

		expect(result.success).toBe(true);
		expect(result.messageId).toBe('0000018d-abc-message-id');
		expect(mockSesSend).toHaveBeenCalledOnce();
	});

	it('builds the right SendEmailCommand input (single recipient + subject + html)', async () => {
		withFullSesEnv();
		mockSesSend.mockResolvedValue({ MessageId: 'msg1' });

		await sendEmailViaSes({
			to: 'dsa@example.com',
			subject: 'Welcome',
			html: '<h1>Welcome</h1>',
			text: 'Welcome (plain)'
		});

		const cmd = mockSendEmailCommand.mock.calls[0][0] as {
			FromEmailAddress: string;
			Destination: { ToAddresses: string[] };
			Content: { Simple: { Subject: { Data: string }; Body: { Html: { Data: string }; Text?: { Data: string } } } };
		};
		expect(cmd.FromEmailAddress).toBe('noreply@digitaldsa.com');
		expect(cmd.Destination.ToAddresses).toEqual(['dsa@example.com']);
		expect(cmd.Content.Simple.Subject.Data).toBe('Welcome');
		expect(cmd.Content.Simple.Body.Html.Data).toBe('<h1>Welcome</h1>');
		expect(cmd.Content.Simple.Body.Text?.Data).toBe('Welcome (plain)');
	});

	it('supports multiple recipients + cc + bcc + replyTo', async () => {
		withFullSesEnv();
		mockSesSend.mockResolvedValue({ MessageId: 'msg2' });

		await sendEmailViaSes({
			to: ['a@example.com', 'b@example.com'],
			cc: ['c@example.com'],
			bcc: ['d@example.com'],
			replyTo: 'support@digitaldsa.com',
			subject: 'Multi',
			html: '<p>x</p>'
		});

		const cmd = mockSendEmailCommand.mock.calls[0][0] as {
			Destination: { ToAddresses: string[]; CcAddresses?: string[]; BccAddresses?: string[] };
			ReplyToAddresses?: string[];
		};
		expect(cmd.Destination.ToAddresses).toEqual(['a@example.com', 'b@example.com']);
		expect(cmd.Destination.CcAddresses).toEqual(['c@example.com']);
		expect(cmd.Destination.BccAddresses).toEqual(['d@example.com']);
		expect(cmd.ReplyToAddresses).toEqual(['support@digitaldsa.com']);
	});

	it('options.from overrides SES_FROM_EMAIL when provided', async () => {
		withFullSesEnv();
		mockSesSend.mockResolvedValue({ MessageId: 'msg3' });

		await sendEmailViaSes({
			to: 'x@example.com',
			from: 'campaigns@digitaldsa.com',
			subject: 's',
			html: 'h'
		});

		const cmd = mockSendEmailCommand.mock.calls[0][0] as { FromEmailAddress: string };
		expect(cmd.FromEmailAddress).toBe('campaigns@digitaldsa.com');
	});
});

// ── sendEmailViaSes — error paths ────────────────────────────────

describe('sendEmailViaSes — error paths', () => {
	it('returns success=false when SES client cannot be initialized', async () => {
		// No AWS creds at all
		mockEnv.EMAIL_PROVIDER = 'ses';
		mockEnv.SES_FROM_EMAIL = 'noreply@digitaldsa.com';

		const result = await sendEmailViaSes({
			to: 'x@example.com',
			subject: 's',
			html: 'h'
		});

		expect(result.success).toBe(false);
		expect(result.error).toContain('not initialized');
		expect(mockSesSend).not.toHaveBeenCalled();
	});

	it('returns success=false (does NOT throw) on SDK error', async () => {
		mockEnv.EMAIL_PROVIDER = 'ses';
		mockEnv.AWS_ACCESS_KEY_ID = 'AKIATEST';
		mockEnv.AWS_SECRET_ACCESS_KEY = 'secret';
		mockEnv.SES_FROM_EMAIL = 'noreply@digitaldsa.com';
		mockSesSend.mockRejectedValue(
			Object.assign(new Error('MessageRejected: Email address is not verified'), {
				name: 'MessageRejected'
			})
		);

		const result = await sendEmailViaSes({
			to: 'x@example.com',
			subject: 's',
			html: 'h'
		});

		expect(result.success).toBe(false);
		expect(result.error).toContain('not verified');
	});

	it('drops attachments with a warning (SES v2 simple content limitation)', async () => {
		mockEnv.EMAIL_PROVIDER = 'ses';
		mockEnv.AWS_ACCESS_KEY_ID = 'AKIATEST';
		mockEnv.AWS_SECRET_ACCESS_KEY = 'secret';
		mockEnv.SES_FROM_EMAIL = 'noreply@digitaldsa.com';
		mockSesSend.mockResolvedValue({ MessageId: 'msg-no-attach' });

		const result = await sendEmailViaSes({
			to: 'x@example.com',
			subject: 's',
			html: 'h',
			attachments: [{ filename: 'report.pdf', content: Buffer.from('pdf-bytes') }]
		});

		expect(result.success).toBe(true);
		// The Command still went out — attachments were silently dropped.
		const cmd = mockSendEmailCommand.mock.calls[0][0];
		expect(cmd).toBeDefined();
		// Ensure no attachment key was passed (SES v2 SimpleContent has no Attachments field anyway).
		expect((cmd as Record<string, unknown>).Attachments).toBeUndefined();
	});
});
