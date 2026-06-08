/**
 * D.1 S7 — Reconciliation drift admin email
 * ══════════════════════════════════════════════════════════════════
 * Sent ONCE per daily reconcile cron run, only when drift is detected.
 * Recipient is the operator inbox (ALERT_RECIPIENT_EMAIL env var,
 * default tech@digitaldsa.com — same routing as errorAlert.ts so
 * staging vs prod can split). NOT a DSA-facing email; uses a
 * different visual frame from the dunning templates.
 *
 * Subject conveys severity:
 *   - critical_drift (any missing-our-side row) → "🚨 CRITICAL: ..."
 *   - drift (any other discrepancy) → "Daily reconciliation drift: ..."
 *
 * The body is operator-readable: per-discrepancy detail with
 * provider_payment_id, amount, dsa_id, age, so the operator can
 * search Razorpay dashboard + our MongoDB without first opening the
 * admin view.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S7 (line 428)
 * ══════════════════════════════════════════════════════════════════
 */

import { sendEmail, type EmailResult } from '$lib/server/email';
import { env } from '$env/dynamic/private';
import { PUBLIC_APP_BASE_URL } from '$lib/config/publicAppUrl';
import type {
	Discrepancy,
	ReconciliationRunDoc
} from '$lib/types/reconciliation';

const ALERT_RECIPIENT = env.ALERT_RECIPIENT_EMAIL || 'tech@digitaldsa.com';

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function formatRupees(paise: number): string {
	return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function discrepancyToRow(d: Discrepancy): { html: string; text: string } {
	switch (d.kind) {
		case 'missing-our-side':
			return {
				html: `<tr><td><strong style="color: #b54040;">CRITICAL: missing-our-side</strong></td><td><code>${escapeHtml(d.provider_payment_id)}</code></td><td>${formatRupees(d.settled_amount_paise)}</td><td>${escapeHtml(d.type)}</td><td>${escapeHtml(d.settled_at)}</td><td>—</td></tr>`,
				text: `CRITICAL missing-our-side  payment_id=${d.provider_payment_id}  amount=${formatRupees(d.settled_amount_paise)}  type=${d.type}  settled_at=${d.settled_at}`
			};
		case 'missing-provider-side':
			return {
				html: `<tr><td>missing-provider-side</td><td><code>${escapeHtml(d.provider_payment_id)}</code></td><td>${formatRupees(d.our_amount_paise)}</td><td>charge</td><td>recorded ${escapeHtml(d.our_recorded_at)}</td><td>dsa=${escapeHtml(d.dsa_id)}</td></tr>`,
				text: `missing-provider-side  payment_id=${d.provider_payment_id}  amount=${formatRupees(d.our_amount_paise)}  recorded_at=${d.our_recorded_at}  dsa=${d.dsa_id}`
			};
		case 'amount-mismatch':
			return {
				html: `<tr><td><strong>amount-mismatch</strong></td><td><code>${escapeHtml(d.provider_payment_id)}</code></td><td>settled ${formatRupees(d.settled_amount_paise)} / ours ${formatRupees(d.our_amount_paise)}</td><td>—</td><td>—</td><td>dsa=${escapeHtml(d.dsa_id)}</td></tr>`,
				text: `amount-mismatch  payment_id=${d.provider_payment_id}  settled=${formatRupees(d.settled_amount_paise)}  ours=${formatRupees(d.our_amount_paise)}  dsa=${d.dsa_id}`
			};
		case 'unmatched-test-auth':
			return {
				html: `<tr><td>unmatched-test-auth</td><td><code>${escapeHtml(d.provider_payment_id)}</code></td><td>${formatRupees(d.our_amount_paise)}</td><td>verification</td><td>${d.age_hours.toFixed(1)}h old</td><td>dsa=${escapeHtml(d.dsa_id)}</td></tr>`,
				text: `unmatched-test-auth  payment_id=${d.provider_payment_id}  amount=${formatRupees(d.our_amount_paise)}  age=${d.age_hours.toFixed(1)}h  dsa=${d.dsa_id}`
			};
	}
}

/**
 * Send the daily reconcile-drift alert to the operator inbox. Returns
 * the EmailResult — caller logs but does NOT throw on failure (the
 * reconcile run already wrote its ReconciliationRuns row; the operator
 * can read it from the admin view if email failed).
 */
export async function sendReconciliationDriftEmail(
	run: ReconciliationRunDoc
): Promise<EmailResult> {
	if (run.discrepancies.length === 0) {
		// Defensive: caller shouldn't even invoke us in this case.
		return { success: false, error: 'no_discrepancies' };
	}

	const isCritical = run.status === 'critical_drift';
	const subject = isCritical
		? `🚨 CRITICAL reconciliation drift — ${run.run_date} (${run.counts.missing_our_side} missing-our-side)`
		: `Reconciliation drift — ${run.run_date} (${run.discrepancies.length} discrepancies)`;

	const adminUrl = `${PUBLIC_APP_BASE_URL.replace(/\/$/, '')}/dashboard/admin/billing/reconciliation`;

	const summaryHtml = `
		<ul>
			<li><strong>Missing on our side:</strong> ${run.counts.missing_our_side}${isCritical ? ' ⚠️ investigate first' : ''}</li>
			<li>Missing provider-side: ${run.counts.missing_provider_side} (usually timing)</li>
			<li>Amount mismatch: ${run.counts.amount_mismatch}</li>
			<li>Unmatched ₹1 auth-pair: ${run.counts.unmatched_test_auth}</li>
		</ul>
	`;

	const rows = run.discrepancies.map(discrepancyToRow);
	const tableHtml = `
		<table style="border-collapse: collapse; width: 100%; font-size: 13px;" border="1" cellpadding="6">
			<thead>
				<tr style="background: #f3f4f6;"><th align="left">Kind</th><th align="left">Payment ID</th><th align="left">Amount</th><th align="left">Type</th><th align="left">When</th><th align="left">DSA</th></tr>
			</thead>
			<tbody>${rows.map((r) => r.html).join('\n')}</tbody>
		</table>
	`;

	const html = `<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; max-width: 760px; margin: 0 auto; padding: 24px;">
<h2 style="color: ${isCritical ? '#b54040' : '#374151'};">Daily reconciliation drift — ${escapeHtml(run.run_date)}</h2>
<p>Reconcile window: ${escapeHtml(run.window_from.toISOString())} → ${escapeHtml(run.window_to.toISOString())} (IST calendar day).<br>
Provider entries: <strong>${run.provider_entries}</strong> &nbsp;·&nbsp; Our transactions: <strong>${run.our_transactions}</strong> &nbsp;·&nbsp; Matched: <strong>${run.matched}</strong></p>
${summaryHtml}
<h3>Discrepancies</h3>
${tableHtml}
<p style="margin: 28px 0;">
  <a href="${adminUrl}" style="display: inline-block; background: #cb997e; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">Open admin reconciliation view</a>
</p>
<p style="color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 16px; margin-top: 28px;">
  Automated reconciliation alert from DigitalDSA (D.1 S7). Generated at ${escapeHtml(run.run_at.toISOString())}.
</p>
</body></html>`;

	const text = `Daily reconciliation drift — ${run.run_date}

Window: ${run.window_from.toISOString()} → ${run.window_to.toISOString()} (IST day)
Provider entries: ${run.provider_entries}    Our transactions: ${run.our_transactions}    Matched: ${run.matched}

Summary:
- Missing-our-side: ${run.counts.missing_our_side}${isCritical ? ' [CRITICAL]' : ''}
- Missing-provider-side: ${run.counts.missing_provider_side} (usually timing)
- Amount mismatch: ${run.counts.amount_mismatch}
- Unmatched ₹1 auth-pair: ${run.counts.unmatched_test_auth}

Discrepancies:
${rows.map((r) => '  - ' + r.text).join('\n')}

Open admin view: ${adminUrl}

—
Automated reconciliation alert from DigitalDSA (D.1 S7). Generated at ${run.run_at.toISOString()}.`;

	return sendEmail({ to: ALERT_RECIPIENT, subject, html, text });
}
