/**
 * D.2 — Invoice-ready email
 * ══════════════════════════════════════════════════════════════════════
 * Short notification sent to the DSA after a successful charge: "Your
 * invoice DDSA/2026-27/00042 is ready. Download it from your billing
 * dashboard."
 *
 * We deliberately DO NOT attach the PDF to the email. Reasons:
 *   1. PDFs as email attachments inflate SES bandwidth + cost
 *   2. Spam filters dislike attachments (the dunning runbook already
 *      documents SES sender-reputation as a real concern)
 *   3. The download link routes through `/api/billing/invoices/[id]/pdf`
 *      which regenerates the PDF on demand — always current with the
 *      invoice row's data, no stale-cache risk
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §D.2
 * ══════════════════════════════════════════════════════════════════════
 */

import { sendEmail } from '$lib/server/email';
import { PUBLIC_APP_BASE_URL } from '$lib/config/publicAppUrl';
import {
	buildTransactionalFooterHtml,
	buildTransactionalFooterText,
	SUPPORT_EMAIL
} from '$lib/server/emailTemplates/footer';
import type { InvoiceDoc } from '$lib/types/invoice';
import logger from '$lib/server/logger';

/**
 * Send the invoice-ready notification. Returns `{ success: true }` on
 * accepted send, `{ success: false, error }` on failure. Caller (chargeEngine)
 * treats failure as non-fatal — the invoice row is already persisted and
 * the DSA can find it on the billing dashboard.
 */
export async function sendInvoiceReadyEmail(args: {
	invoice: InvoiceDoc;
	to: string;
	dsaName?: string;
}): Promise<{ success: boolean; error?: string }> {
	const { invoice, to, dsaName } = args;
	const totalRupees = (invoice.total_paise / 100).toLocaleString('en-IN', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
	const issueDate = invoice.issue_date.toLocaleDateString('en-IN', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
	const downloadUrl = `${PUBLIC_APP_BASE_URL}/dashboard/dsa/billing?invoice=${invoice._id?.toString() ?? ''}`;
	const greeting = dsaName ? `Hi ${escapeHtml(dsaName)},` : 'Hi,';

	const subject = `Your invoice ${invoice.invoice_number} is ready — ₹${totalRupees}`;

	const html = `<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; max-width: 560px; margin: 0 auto; padding: 24px;">
<h2 style="color: #111;">Your invoice is ready</h2>
<p>${greeting}</p>
<p>Your DigitalDSA invoice <strong>${escapeHtml(invoice.invoice_number)}</strong> has been generated for your recent payment.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr><td style="padding: 4px 12px 4px 0; color: #666;">Amount</td><td style="padding: 4px 0;"><strong>₹${totalRupees}</strong> (inclusive of GST)</td></tr>
  <tr><td style="padding: 4px 12px 4px 0; color: #666;">Issued</td><td style="padding: 4px 0;">${escapeHtml(issueDate)}</td></tr>
  <tr><td style="padding: 4px 12px 4px 0; color: #666;">Invoice Number</td><td style="padding: 4px 0;">${escapeHtml(invoice.invoice_number)}</td></tr>
</table>
<p><a href="${downloadUrl}" style="display: inline-block; background: #0d92f4; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Download PDF</a></p>
<p style="color: #666; font-size: 12px; margin-top: 24px;">Need help or want to update your GSTIN? Reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}" style="color: #4b5563;">${SUPPORT_EMAIL}</a>. Invoices are retained per record-keeping rules (6 years).</p>
${buildTransactionalFooterHtml({ recipientEmail: to })}
</body></html>`;

	const text = `Your DigitalDSA invoice ${invoice.invoice_number} is ready.

Amount: ₹${totalRupees} (inclusive of GST)
Issued: ${issueDate}

Download PDF: ${downloadUrl}

Need help? Reply to this email or write to ${SUPPORT_EMAIL}.${buildTransactionalFooterText({ recipientEmail: to })}`;

	try {
		await sendEmail({ to, subject, html, text, replyTo: SUPPORT_EMAIL });
		logger.info(
			{ invoice_number: invoice.invoice_number, dsa_id: invoice.dsa_id.toString() },
			'invoice email: sent'
		);
		return { success: true };
	} catch (err) {
		const message = (err as Error).message;
		logger.warn(
			{ invoice_number: invoice.invoice_number, err: message },
			'invoice email: send failed (non-fatal — invoice row is the source of truth)'
		);
		return { success: false, error: message };
	}
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
