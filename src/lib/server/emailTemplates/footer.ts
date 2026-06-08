/**
 * Shared transactional email footer (SEC-8)
 * ══════════════════════════════════════════════════════════════════════
 * Single source of truth for the 5-element footer DigitalDSA committed to
 * AWS SES on 2026-06-01 as part of the production-access case
 * `177987930900751`. Every transactional email MUST render this footer so
 * we stay consistent with the commitment. Drift = integrity problem with
 * the support case.
 *
 * The 5 elements, in order:
 *   1. Recipient's own email address (where this was sent)
 *   2. Link to Notification Preferences page (mute non-essential mail)
 *   3. Link to Close Account (full suppression)
 *   4. Company legal name + registered Indian office postal address
 *   5. Reply-To `support@digitaldsa.com`
 *
 * Reference memory: ~/.claude/.../memory/project_ses_production_request.md
 * ══════════════════════════════════════════════════════════════════════
 */

import {
	PUBLIC_NOTIFICATION_PREFERENCES_URL,
	PUBLIC_CLOSE_ACCOUNT_URL
} from '$lib/config/publicAppUrl';
import { escapeHtml } from '$lib/utils/sanitize';

/** Registered legal name as filed with AWS in the v3 reply. */
export const SENDER_LEGAL_NAME = 'DigitalDSA Technologies Private Limited';

/** Registered Indian office postal address committed to AWS. */
export const SENDER_REGISTERED_ADDRESS = 'G202, Sector 63, Noida, Uttar Pradesh, India - 201301';

/** Reply-To address pointed at the monitored support inbox. */
export const SUPPORT_EMAIL = 'support@digitaldsa.com';

export interface TransactionalFooterArgs {
	/** The address this specific message was sent to (rendered into element 1). */
	recipientEmail: string;
}

/**
 * Render the HTML footer block. The recipient address is HTML-escaped at
 * the boundary; all other fields are compile-time constants.
 *
 * Style: inline only (email clients strip <style>). Muted gray on neutral
 * background to keep the body content visually primary.
 */
export function buildTransactionalFooterHtml(args: TransactionalFooterArgs): string {
	const recipientSafe = escapeHtml(args.recipientEmail);
	return `<div style="border-top: 1px solid #eaeaea; margin-top: 32px; padding-top: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; line-height: 1.6; color: #6b7280;">
  <p style="margin: 0 0 8px 0;">This email was sent to <strong>${recipientSafe}</strong>.</p>
  <p style="margin: 0 0 8px 0;">
    <a href="${PUBLIC_NOTIFICATION_PREFERENCES_URL}" style="color: #4b5563; text-decoration: underline;">Notification preferences</a>
    &nbsp;·&nbsp;
    <a href="${PUBLIC_CLOSE_ACCOUNT_URL}" style="color: #4b5563; text-decoration: underline;">Close account</a>
    &nbsp;·&nbsp;
    Reply to <a href="mailto:${SUPPORT_EMAIL}" style="color: #4b5563; text-decoration: underline;">${SUPPORT_EMAIL}</a>
  </p>
  <p style="margin: 0; color: #9ca3af;">${SENDER_LEGAL_NAME}<br/>${SENDER_REGISTERED_ADDRESS}</p>
</div>`;
}

/** Plain-text version, same five elements. Newline-separated. */
export function buildTransactionalFooterText(args: TransactionalFooterArgs): string {
	return [
		'',
		'—',
		`This email was sent to ${args.recipientEmail}.`,
		`Notification preferences: ${PUBLIC_NOTIFICATION_PREFERENCES_URL}`,
		`Close account: ${PUBLIC_CLOSE_ACCOUNT_URL}`,
		`Reply to ${SUPPORT_EMAIL}`,
		'',
		SENDER_LEGAL_NAME,
		SENDER_REGISTERED_ADDRESS
	].join('\n');
}
