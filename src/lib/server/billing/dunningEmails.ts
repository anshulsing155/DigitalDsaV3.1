/**
 * D.1 S5 M3 — Dunning escalation email templates
 * ══════════════════════════════════════════════════════════════════
 * Four DSA-facing emails sent as the dunning state machine walks:
 *
 *   sendDunningT0Email      — first failure (active → dunning_t0)
 *                              fired from chargeEngine.handleFailure
 *   sendDunningGraceEmail   — day 3 (dunning_t0 → dunning_grace)
 *                              fired from dunning-advance cron
 *   sendDunningFinalEmail   — day 7 (dunning_grace → dunning_final)
 *                              fired from dunning-advance cron
 *   sendDowngradedEmail     — day 8 (dunning_final → downgraded)
 *                              fired from dunning-advance cron
 *
 * All four route through `sendEmail` (src/lib/server/email.ts) which
 * post-SEC-8 dispatches via AWS SES on production, Nodemailer in
 * legacy/dev, or log-only when no credentials are configured. No
 * call-site needs to know which branch fires.
 *
 * English-only in v1; i18n (hi/mr) deferred to Epic H per project
 * convention. The cron + chargeEngine never branch on locale here —
 * Epic H will add a locale-aware adapter wrapper without changing
 * these template signatures.
 *
 * Razorpay sends its own failure email; ours runs in addition to that
 * (per spec, locked 2026-05-25 — "Razorpay's may not deliver or land
 * in spam; the failure email is the most important one in the funnel,
 * we don't depend on a third party for it"). Two emails reaching the
 * DSA is the accepted tradeoff for reliability.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S5
 * ══════════════════════════════════════════════════════════════════
 */

import { sendEmail, type EmailResult } from '$lib/server/email';
import { PLANS } from '$lib/config/billing';
import { PUBLIC_BILLING_URL } from '$lib/config/publicAppUrl';
import {
	buildTransactionalFooterHtml,
	buildTransactionalFooterText,
	SUPPORT_EMAIL
} from '$lib/server/emailTemplates/footer';
import type { BillingSubscriptionDoc } from '$lib/types/billingSubscription';
import logger from '$lib/server/logger';
import type { DunningEmailKind } from './dunningEngine';

// ── Helpers ────────────────────────────────────────────────────
// PUBLIC_BILLING_URL is read from $lib/config/publicAppUrl which respects
// the PUBLIC_APP_BASE_URL env var. Default value is the current canonical
// (https://www.rinn.in/dashboard/dsa/billing). Migration to digitaldsa.com
// is a single Vercel env-var change — no code edits needed in this file.

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Friendly plan name for the subscription, or 'subscription' if PLANS lookup fails. */
function planNameFor(sub: BillingSubscriptionDoc): string {
	return PLANS[sub.plan_id]?.name ?? 'subscription';
}

/**
 * Shared dunning email frame. Subject + bodyHtml are template-specific;
 * the footer + Update Payment Method CTA are shared so the four emails
 * read as a single coherent thread.
 */
function buildDunningEmailHtml(
	heading: string,
	leadParagraph: string,
	ctaLabel: string,
	recipientEmail: string,
	additionalParagraphs: string[] = []
): string {
	const extra = additionalParagraphs
		.map((p) => `<p>${p}</p>`)
		.join('\n');
	return `<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; max-width: 560px; margin: 0 auto; padding: 24px;">
<h2 style="color: #b54040;">${escapeHtml(heading)}</h2>
<p>Hi,</p>
<p>${leadParagraph}</p>
${extra}
<p style="margin: 28px 0;">
  <a href="${PUBLIC_BILLING_URL}" style="display: inline-block; background: #cb997e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">${escapeHtml(ctaLabel)}</a>
</p>
<p style="color: #666; font-size: 13px;">You can also open the Billing page directly from your DigitalDSA dashboard. If you've already updated your payment method, you can ignore this — the next retry will pick it up.</p>
<p style="color: #666; font-size: 13px;">Need help? Reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}" style="color: #4b5563;">${SUPPORT_EMAIL}</a>.</p>
${buildTransactionalFooterHtml({ recipientEmail })}
</body></html>`;
}

function buildDunningEmailText(
	heading: string,
	leadParagraph: string,
	ctaLabel: string,
	recipientEmail: string,
	additionalParagraphs: string[] = []
): string {
	const extra = additionalParagraphs.join('\n\n');
	return `${heading}

Hi,

${leadParagraph}

${extra ? `${extra}\n\n` : ''}${ctaLabel}: ${PUBLIC_BILLING_URL}

You can also open the Billing page directly from your DigitalDSA dashboard. If you've already updated your payment method, you can ignore this — the next retry will pick it up.

Need help? Reply to this email or write to ${SUPPORT_EMAIL}.${buildTransactionalFooterText({ recipientEmail })}`;
}

/**
 * Guard: every dunning email needs a recipient. customer_email is
 * populated at mandate-registration time (S2). If a subscription somehow
 * reached a dunning state without it, log + skip rather than throw —
 * the operator dashboard will surface the missing email and we don't
 * want a failed send to roll back the state transition.
 */
function recipientOf(sub: BillingSubscriptionDoc): string | null {
	const to = sub.customer_email?.trim();
	if (!to) {
		logger.error(
			{ dsa_id: String(sub.dsa_id), state: sub.state },
			'dunning email: subscription has no customer_email — skipping send'
		);
		return null;
	}
	return to;
}

// ── Template 1: first failure (active → dunning_t0) ─────────────

export async function sendDunningT0Email(
	sub: BillingSubscriptionDoc
): Promise<EmailResult> {
	const to = recipientOf(sub);
	if (!to) return { success: false, error: 'no_recipient' };

	const planName = planNameFor(sub);
	const heading = `Payment couldn't go through`;
	const lead = `We tried to charge your DigitalDSA <strong>${escapeHtml(planName)}</strong> subscription today, but the payment didn't go through.`;
	const extra = [
		`We'll try again over the next few days. <strong>You don't need to do anything if it was a temporary issue</strong> — most failures clear on the next retry.`,
		`If you know the card or bank account is the problem (changed card, low balance, expired mandate), you can fix it now to avoid further retries.`
	];

	return sendEmail({
		to,
		subject: `Payment couldn't go through — we'll retry`,
		html: buildDunningEmailHtml(heading, lead, 'Update payment method', to, extra),
		text: buildDunningEmailText(
			heading,
			`We tried to charge your DigitalDSA ${planName} subscription today, but the payment didn't go through.`,
			'Update payment method',
			to,
			[
				`We'll try again over the next few days. You don't need to do anything if it was a temporary issue — most failures clear on the next retry.`,
				`If you know the card or bank account is the problem (changed card, low balance, expired mandate), you can fix it now to avoid further retries.`
			]
		),
		replyTo: SUPPORT_EMAIL
	});
}

// ── Template 2: day 3 grace (dunning_t0 → dunning_grace) ────────

export async function sendDunningGraceEmail(
	sub: BillingSubscriptionDoc
): Promise<EmailResult> {
	const to = recipientOf(sub);
	if (!to) return { success: false, error: 'no_recipient' };

	const planName = planNameFor(sub);
	const heading = `Still can't process your payment — 4 days of access left`;
	const lead = `Three days ago we couldn't charge your DigitalDSA <strong>${escapeHtml(planName)}</strong> subscription, and the retries since haven't worked either.`;
	const extra = [
		`You have <strong>4 more days of access</strong> before the subscription is downgraded. Updating your payment method now will keep your subscription running with no interruption.`,
		`If you've already updated it, the next retry will pick up the change automatically.`
	];

	return sendEmail({
		to,
		subject: `Still can't process your payment — 4 days of access left`,
		html: buildDunningEmailHtml(heading, lead, 'Update payment method', to, extra),
		text: buildDunningEmailText(
			heading,
			`Three days ago we couldn't charge your DigitalDSA ${planName} subscription, and the retries since haven't worked either.`,
			'Update payment method',
			to,
			[
				`You have 4 more days of access before the subscription is downgraded. Updating your payment method now will keep your subscription running with no interruption.`,
				`If you've already updated it, the next retry will pick up the change automatically.`
			]
		),
		replyTo: SUPPORT_EMAIL
	});
}

// ── Template 3: day 7 final (dunning_grace → dunning_final) ─────

export async function sendDunningFinalEmail(
	sub: BillingSubscriptionDoc
): Promise<EmailResult> {
	const to = recipientOf(sub);
	if (!to) return { success: false, error: 'no_recipient' };

	const planName = planNameFor(sub);
	const heading = `Access ends tomorrow`;
	const lead = `This is the final notice before your DigitalDSA <strong>${escapeHtml(planName)}</strong> subscription is downgraded. We've been unable to charge your payment method for a week.`;
	const extra = [
		`<strong>Tomorrow your subscription will be downgraded</strong> if the payment still doesn't go through. You'll lose access to active cases and the rule engine until you re-subscribe.`,
		`Updating your payment method right now is the fastest way to keep everything running.`
	];

	return sendEmail({
		to,
		subject: `DigitalDSA access ends tomorrow — final notice`,
		html: buildDunningEmailHtml(heading, lead, 'Update payment method now', to, extra),
		text: buildDunningEmailText(
			heading,
			`This is the final notice before your DigitalDSA ${planName} subscription is downgraded. We've been unable to charge your payment method for a week.`,
			'Update payment method now',
			to,
			[
				`Tomorrow your subscription will be downgraded if the payment still doesn't go through. You'll lose access to active cases and the rule engine until you re-subscribe.`,
				`Updating your payment method right now is the fastest way to keep everything running.`
			]
		),
		replyTo: SUPPORT_EMAIL
	});
}

// ── Template 4: day 8 downgrade (dunning_final → downgraded) ────

export async function sendDowngradedEmail(
	sub: BillingSubscriptionDoc
): Promise<EmailResult> {
	const to = recipientOf(sub);
	if (!to) return { success: false, error: 'no_recipient' };

	const planName = planNameFor(sub);
	const heading = `Your subscription has been downgraded`;
	const lead = `We weren't able to charge your DigitalDSA <strong>${escapeHtml(planName)}</strong> subscription over the past 8 days. As a result, your access has been downgraded.`;
	const extra = [
		`<strong>You can re-subscribe anytime</strong> from the Billing page. Your previous work, cases, and team data are preserved — re-subscribing restores access immediately.`,
		`If this was unexpected and you'd like help, reply to this email or write to support@digitaldsa.com.`
	];

	return sendEmail({
		to,
		subject: `DigitalDSA subscription downgraded — you can resubscribe anytime`,
		html: buildDunningEmailHtml(heading, lead, 'Resubscribe', to, extra),
		text: buildDunningEmailText(
			heading,
			`We weren't able to charge your DigitalDSA ${planName} subscription over the past 8 days. As a result, your access has been downgraded.`,
			'Resubscribe',
			to,
			[
				`You can re-subscribe anytime from the Billing page. Your previous work, cases, and team data are preserved — re-subscribing restores access immediately.`,
				`If this was unexpected and you'd like help, reply to this email or write to ${SUPPORT_EMAIL}.`
			]
		),
		replyTo: SUPPORT_EMAIL
	});
}

// ── Template 5: pause reminder (S6 M6, day 60 of paused) ────────

/**
 * Sent ONCE per pause cycle when the DSA has been paused for 60 days.
 * Heads off the day-90 auto-cancel with a 30-day warning. Subject is
 * intentionally low-urgency — the DSA chose to pause, this isn't a
 * dunning escalation.
 */
export async function sendPauseReminderEmail(
	sub: BillingSubscriptionDoc
): Promise<EmailResult> {
	const to = recipientOf(sub);
	if (!to) return { success: false, error: 'no_recipient' };

	const planName = planNameFor(sub);
	const heading = `Your subscription will be cancelled in 30 days`;
	const lead = `Your DigitalDSA <strong>${escapeHtml(planName)}</strong> subscription has been paused for 60 days. If you don't resume it within the next 30 days, it will be cancelled automatically.`;
	const extra = [
		`<strong>Want to keep it going?</strong> Resume anytime from the Billing page and your next charge will fire right away.`,
		`If you're done with DigitalDSA, no action is needed — the subscription will end on its own after the 90-day mark, and we won't charge you anything more.`
	];

	return sendEmail({
		to,
		subject: `Your DigitalDSA subscription will be cancelled in 30 days`,
		html: buildDunningEmailHtml(heading, lead, 'Resume subscription', to, extra),
		text: buildDunningEmailText(
			heading,
			`Your DigitalDSA ${planName} subscription has been paused for 60 days. If you don't resume it within the next 30 days, it will be cancelled automatically.`,
			'Resume subscription',
			to,
			[
				`Want to keep it going? Resume anytime from the Billing page and your next charge will fire right away.`,
				`If you're done with DigitalDSA, no action is needed — the subscription will end on its own after the 90-day mark, and we won't charge you anything more.`
			]
		),
		replyTo: SUPPORT_EMAIL
	});
}

// ── Dispatcher (used by dunning-advance cron) ──────────────────

/**
 * Cron-side dispatcher: maps the engine's DunningEmailKind to the
 * corresponding send function. Lives here (not in the cron endpoint)
 * so the cron file can stay thin + the mapping has ONE source of truth.
 *
 * The t0 email is intentionally NOT dispatched here — the t0 transition
 * is owned by chargeEngine.handleFailure (a failed charge, not a day-
 * counting advance), and that file calls sendDunningT0Email directly.
 */
export async function dispatchDunningAdvanceEmail(
	kind: DunningEmailKind,
	sub: BillingSubscriptionDoc
): Promise<EmailResult> {
	switch (kind) {
		case 'dunning_grace':
			return await sendDunningGraceEmail(sub);
		case 'dunning_final':
			return await sendDunningFinalEmail(sub);
		case 'downgraded':
			return await sendDowngradedEmail(sub);
		default: {
			const exhaustive: never = kind;
			logger.error({ kind: exhaustive }, 'dispatchDunningAdvanceEmail: unknown kind');
			return { success: false, error: `unknown kind: ${String(exhaustive)}` };
		}
	}
}
