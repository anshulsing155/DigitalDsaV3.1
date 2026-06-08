/**
 * SEC-8 — Settings pages targeted by the transactional email footer
 * ══════════════════════════════════════════════════════════════════
 * Locks the two routes the footer links resolve to per the 2026-06-01
 * AWS commitment (case 177987930900751):
 *
 *   /dashboard/dsa/settings/notifications — element #2 target
 *   /dashboard/dsa/settings/account/close — element #3 target
 *
 * AND locks that the user-facing deletion-confirmation email (sent by
 * /api/auth/delete-account on close) renders the shared 5-element
 * footer, so the post-close email stays consistent with the rest of
 * the transactional set.
 *
 * Static-source assertions only — these pages and the email body are
 * easy to "edit and forget"; behavioral tests against a Svelte 5
 * component would need a JSDOM/playwright harness that's overkill for
 * the SEC-8 invariants we actually care about.
 *
 * Reference: ~/.claude/.../memory/project_ses_production_request.md
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const notificationsPagePath = resolve(
	process.cwd(),
	'src/routes/dashboard/dsa/settings/notifications/+page.svelte'
);
const closeAccountPagePath = resolve(
	process.cwd(),
	'src/routes/dashboard/dsa/settings/account/close/+page.svelte'
);
const deleteAccountEndpointPath = resolve(
	process.cwd(),
	'src/routes/api/auth/delete-account/+server.ts'
);
const teamInviteEndpointPath = resolve(
	process.cwd(),
	'src/routes/api/team/invite/+server.ts'
);
const sesProviderPath = resolve(
	process.cwd(),
	'src/lib/server/emailProviders/sesProvider.ts'
);

describe('Notification preferences page (footer link target — element #2)', () => {
	it('exists at the URL committed to AWS', () => {
		expect(existsSync(notificationsPagePath)).toBe(true);
	});

	it('explains the transactional-only stance and points at Close account', () => {
		const src = readFileSync(notificationsPagePath, 'utf8');
		// We promised AWS we don't run marketing — the page must say so.
		expect(src.toLowerCase()).toMatch(/transactional/);
		// Must surface the close-account escape hatch.
		expect(src).toContain('/dashboard/dsa/settings/account/close');
	});
});

describe('Close account page (footer link target — element #3)', () => {
	it('exists at the URL committed to AWS', () => {
		expect(existsSync(closeAccountPagePath)).toBe(true);
	});

	it('uses secureFetch to POST to /api/auth/delete-account', () => {
		const src = readFileSync(closeAccountPagePath, 'utf8');
		expect(src).toContain("import { secureFetch } from '$lib/utils/csrf'");
		expect(src).toContain("'/api/auth/delete-account'");
		expect(src).toMatch(/method:\s*'POST'/);
	});

	it('gates submission on a typed confirm phrase to prevent accidental close', () => {
		const src = readFileSync(closeAccountPagePath, 'utf8');
		expect(src).toMatch(/CONFIRM_PHRASE/);
		expect(src).toMatch(/confirmText\s*===\s*CONFIRM_PHRASE/);
	});

	it('redirects to /login on success so the user sees they are signed out', () => {
		const src = readFileSync(closeAccountPagePath, 'utf8');
		expect(src).toMatch(/window\.location\.href\s*=\s*'\/login\?account_closed=1'/);
	});
});

describe('delete-account endpoint renders the shared SEC-8 footer in the user email', () => {
	it("imports buildTransactionalFooterHtml/Text + SUPPORT_EMAIL from the shared module", () => {
		const src = readFileSync(deleteAccountEndpointPath, 'utf8');
		expect(src).toContain("from '$lib/server/emailTemplates/footer'");
		expect(src).toContain('buildTransactionalFooterHtml');
		expect(src).toContain('buildTransactionalFooterText');
		expect(src).toContain('SUPPORT_EMAIL');
	});

	it('passes replyTo: SUPPORT_EMAIL on the user-facing deletion-confirmation send', () => {
		const src = readFileSync(deleteAccountEndpointPath, 'utf8');
		// The user-confirm helper is sendUserDeletionConfirmEmail — locate
		// its function body and assert replyTo + footer call appear inside.
		const fnStart = src.indexOf('async function sendUserDeletionConfirmEmail');
		expect(fnStart).toBeGreaterThan(-1);
		const fnBody = src.slice(fnStart);
		expect(fnBody).toMatch(/replyTo:\s*SUPPORT_EMAIL/);
		expect(fnBody).toMatch(/buildTransactionalFooterHtml\(\{\s*recipientEmail:/);
	});
});

// ── Gap #1 — close-account revokes Sessions instantly ────────────

describe('delete-account immediately revokes every active session (SEC-8 gap #1)', () => {
	const src = readFileSync(deleteAccountEndpointPath, 'utf8');

	it('imports the Sessions collection', () => {
		expect(src).toMatch(/import\s*\{[^}]*\bSessions\b[^}]*\}\s*from\s*'\$lib\/database\/mongo'/);
	});

	it('calls Sessions.updateMany on the user_id with revoke_reason: account_closed', () => {
		expect(src).toMatch(/Sessions\.updateMany/);
		expect(src).toMatch(/revoke_reason:\s*'account_closed'/);
		// The update filter must include user_id so we only revoke THIS user's
		// rows. Bare updateMany({}) would revoke every session in the system —
		// regression lock against that mistake.
		const updateBlock = src.slice(src.indexOf('Sessions.updateMany'));
		expect(updateBlock).toMatch(/user_id:\s*userId/);
	});
});

// ── Gap #2 — team-invite email_sent reflects actual SES result ───

describe('team-invite endpoint reports honest email_sent status (SEC-8 gap #2)', () => {
	const src = readFileSync(teamInviteEndpointPath, 'utf8');

	it('awaits sendTeamInviteEmail (not fire-and-forget)', () => {
		expect(src).toMatch(/await\s+sendTeamInviteEmail\(/);
	});

	it("derives email_sent from the send result's success, not from email-provided", () => {
		// Before the fix: `email_sent: Boolean(email)` — a lie when SES rejected.
		// After:           `email_sent: emailSent` where emailSent <- sendResult.success.
		expect(src).not.toMatch(/email_sent:\s*Boolean\(email\)/);
		expect(src).toMatch(/email_sent:\s*emailSent/);
		expect(src).toMatch(/emailSent\s*=\s*sendResult\.success/);
	});
});

// ── Gap #3 — sesProvider forwards replyTo to ReplyToAddresses ────

describe('SES provider forwards replyTo to ReplyToAddresses (SEC-8 gap #3)', () => {
	const src = readFileSync(sesProviderPath, 'utf8');

	it('maps options.replyTo onto SendEmailCommand ReplyToAddresses', () => {
		// Pattern: ...(options.replyTo ? { ReplyToAddresses: [options.replyTo] } : {})
		// Without this, every replyTo: SUPPORT_EMAIL we added across the
		// SEC-8 pre-flip work would be silently dropped on the production
		// SES path — which is exactly the path AWS was told about.
		expect(src).toMatch(/options\.replyTo/);
		expect(src).toMatch(/ReplyToAddresses:\s*\[options\.replyTo\]/);
	});
});
