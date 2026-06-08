/**
 * D.1 S3 — Pre-charge reminder engine
 * ══════════════════════════════════════════════════════════════════
 * Daily cron that emails DSAs 3-4 days before their next debit fires.
 * Spec §4 S3 + §11.2 #14 — locked window 3-4 days (inclusive of both
 * ends), in IST.
 *
 * QUERY
 * ─────
 * MongoDB: { state: 'active', next_charge_at: { $gte: now+3d, $lte: now+4d } }
 * The {state, next_charge_at} compound index (M1) makes this O(log n).
 *
 * DEDUPE
 * ──────
 * `last_reminder_sent_at` field on the subscription doc (M1 addition).
 * Skip if `last_reminder_sent_at >= next_charge_at - 4 days` — that
 * means the cron already sent a reminder for THIS upcoming cycle. After
 * a successful charge, `next_charge_at` advances ~30 days, so the
 * dedup gate naturally re-opens 4 days before the next charge.
 *
 * EMAIL
 * ─────
 * Inline via sendEmail (Nodemailer for now; SEC-8 swaps to SES without
 * touching this file). Failures are logged and swallowed — the
 * `last_reminder_sent_at` is updated AFTER a successful send, so a
 * failed send won't accidentally suppress the next day's retry.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S3, §11.2 #14
 * ══════════════════════════════════════════════════════════════════
 */

import { ObjectId } from 'mongodb';
import { BillingSubscriptions } from '$lib/database/mongo';
import type { BillingSubscriptionDoc } from '$lib/types/billingSubscription';
import { PLANS } from '$lib/config/billing';
import { sendEmail } from '$lib/server/email';
import logger from '$lib/server/logger';
import { writeBillingAuditLog } from './billingAuditLog';

/** Window start: 3 days from now. */
const REMINDER_WINDOW_START_MS = 3 * 24 * 60 * 60 * 1000;
/** Window end: 4 days from now (inclusive). */
const REMINDER_WINDOW_END_MS = 4 * 24 * 60 * 60 * 1000;

export interface ReminderOutcome {
	subscription_id: string;
	dsa_id: string;
	status: 'sent' | 'skipped_dedup' | 'skipped_no_email' | 'failed';
	error?: string;
}

export interface ReminderBatchResult {
	total: number;
	sent: number;
	skipped: number;
	failed: number;
	outcomes: ReminderOutcome[];
}

/**
 * Find subscriptions whose next_charge_at falls in the [now+3d, now+4d]
 * window. Limit guards against runaway query at scale.
 */
export async function findEligibleForReminder(
	now: Date,
	limit = 500
): Promise<BillingSubscriptionDoc[]> {
	const start = new Date(now.getTime() + REMINDER_WINDOW_START_MS);
	const end = new Date(now.getTime() + REMINDER_WINDOW_END_MS);
	return await BillingSubscriptions.find({
		state: 'active',
		next_charge_at: { $gte: start, $lte: end }
	})
		.limit(limit)
		.toArray();
}

/**
 * Returns true if we already sent a reminder for THIS upcoming cycle.
 * Dedup gate: last_reminder_sent_at >= next_charge_at - 4d. (The 4d
 * threshold matches the window end; before that, we haven't entered
 * the reminder window yet for this cycle.)
 */
function alreadyRemindedThisCycle(sub: BillingSubscriptionDoc): boolean {
	if (!sub.last_reminder_sent_at || !sub.next_charge_at) return false;
	const cycleOpenAt = new Date(sub.next_charge_at.getTime() - REMINDER_WINDOW_END_MS);
	return sub.last_reminder_sent_at >= cycleOpenAt;
}

/**
 * Send the reminder for one subscription. Returns the outcome. Never throws.
 */
export async function sendReminderForSubscription(
	sub: BillingSubscriptionDoc
): Promise<ReminderOutcome> {
	const subscription_id = sub._id!.toString();
	const dsa_id = sub.dsa_id.toString();

	if (alreadyRemindedThisCycle(sub)) {
		return { subscription_id, dsa_id, status: 'skipped_dedup' };
	}
	if (!sub.customer_email) {
		return { subscription_id, dsa_id, status: 'skipped_no_email' };
	}

	const plan = PLANS[sub.plan_id];
	const debitDateStr = formatIstDate(sub.next_charge_at!);

	// Trial users get a different copy at T-N days because the framing is
	// "your free trial ends" not "we're renewing your subscription". The
	// debit amount + date logic is identical — only the subject line + body
	// copy differ.
	const isTrialEnding = sub.is_trial === true;

	try {
		await sendEmail({
			to: sub.customer_email,
			subject: isTrialEnding
				? `Your DigitalDSA trial ends on ${debitDateStr} — ₹${plan.priceMonthly} will be charged`
				: `Reminder: ₹${plan.priceMonthly} will debit on ${debitDateStr}`,
			html: isTrialEnding
				? buildTrialEndingEmailHtml(plan.name, plan.priceMonthly, debitDateStr)
				: buildReminderEmailHtml(plan.name, plan.priceMonthly, debitDateStr),
			text: isTrialEnding
				? buildTrialEndingEmailText(plan.name, plan.priceMonthly, debitDateStr)
				: buildReminderEmailText(plan.name, plan.priceMonthly, debitDateStr)
		});

		// Only mark sent AFTER a successful send. A failed send leaves
		// last_reminder_sent_at untouched so the next cron tick retries.
		await BillingSubscriptions.updateOne(
			{ _id: sub._id },
			{ $set: { last_reminder_sent_at: new Date(), updated_at: new Date() } }
		);

		await writeBillingAuditLog({
			event_class: 'subscription_transition',
			event_name: isTrialEnding ? 'trial_ending_reminder.sent' : 'pre_charge_reminder.sent',
			subscription_id: sub._id as ObjectId,
			dsa_id: sub.dsa_id,
			actor: 'cron',
			payload: {
				next_charge_at: sub.next_charge_at,
				plan_id: sub.plan_id,
				amount_paise: plan.amountPaise,
				is_trial: isTrialEnding
			}
		});

		return { subscription_id, dsa_id, status: 'sent' };
	} catch (err) {
		const e = err as Error;
		logger.error(
			{ subscription_id, dsa_id, err: e.message },
			'reminderEngine: sendEmail failed (will retry on next tick)'
		);
		return { subscription_id, dsa_id, status: 'failed', error: e.message };
	}
}

/**
 * Process the full reminder batch. Sequential within batch; the email
 * dispatch is the slow step but volume is low (≈ 1/30 of active subs
 * per day) so a concurrency knob is overkill for v1.
 */
export async function processRemindersBatch(now: Date = new Date()): Promise<ReminderBatchResult> {
	const subs = await findEligibleForReminder(now);
	const outcomes: ReminderOutcome[] = [];
	let sent = 0;
	let skipped = 0;
	let failed = 0;

	for (const sub of subs) {
		const outcome = await sendReminderForSubscription(sub);
		outcomes.push(outcome);
		switch (outcome.status) {
			case 'sent':
				sent++;
				break;
			case 'skipped_dedup':
			case 'skipped_no_email':
				skipped++;
				break;
			case 'failed':
				failed++;
				break;
		}
	}

	await writeBillingAuditLog({
		event_class: 'cron_run',
		event_name: 'billing-charge-reminder',
		actor: 'cron',
		payload: { now, total: subs.length, sent, skipped, failed }
	});

	return { total: subs.length, sent, skipped, failed, outcomes };
}

// ── Email body helpers (parallel to chargeEngine's confirmation email) ──

function buildReminderEmailHtml(planName: string, priceMonthly: number, debitDateStr: string): string {
	return `<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; max-width: 560px; margin: 0 auto; padding: 24px;">
<h2>Subscription renewal reminder</h2>
<p>Hi,</p>
<p>Your DigitalDSA <strong>${escapeHtml(planName)}</strong> subscription will renew automatically:</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr><td style="padding: 4px 12px 4px 0;">Amount</td><td style="padding: 4px 0;"><strong>₹${priceMonthly}</strong></td></tr>
  <tr><td style="padding: 4px 12px 4px 0;">Debit on</td><td style="padding: 4px 0;">${escapeHtml(debitDateStr)}</td></tr>
</table>
<p>No action needed — the debit will happen automatically through your registered bank mandate.</p>
<p style="color: #666; font-size: 12px;">Want to change plan or cancel? Visit your DigitalDSA billing dashboard before the debit date.</p>
</body></html>`;
}

function buildReminderEmailText(planName: string, priceMonthly: number, debitDateStr: string): string {
	return `Subscription renewal reminder\n\nHi,\n\nYour DigitalDSA ${planName} subscription will renew automatically:\n\nAmount: ₹${priceMonthly}\nDebit on: ${debitDateStr}\n\nNo action needed — the debit will happen automatically through your registered bank mandate.\n\nWant to change plan or cancel? Visit your DigitalDSA billing dashboard before the debit date.`;
}

/**
 * Trial-ending email (2026-05-28 free-trial feature).
 *
 * Sent T-4 days before trial_until (the existing reminder cron's eligibility
 * window). Tone differs from the renewal reminder: this is the DSA's first
 * paid charge after the free period, so the call-to-action is "cancel now if
 * you don't want to be charged" rather than "no action needed."
 */
function buildTrialEndingEmailHtml(
	planName: string,
	priceMonthly: number,
	debitDateStr: string
): string {
	return `<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; max-width: 560px; margin: 0 auto; padding: 24px;">
<h2>Your free trial ends on ${escapeHtml(debitDateStr)}</h2>
<p>Hi,</p>
<p>You're 4 days away from the end of your DigitalDSA <strong>${escapeHtml(planName)}</strong> free trial.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr><td style="padding: 4px 12px 4px 0;">First charge</td><td style="padding: 4px 0;"><strong>₹${priceMonthly}</strong></td></tr>
  <tr><td style="padding: 4px 12px 4px 0;">Charge date</td><td style="padding: 4px 0;">${escapeHtml(debitDateStr)}</td></tr>
</table>
<p>If you want to continue, no action needed — the charge will happen automatically and your subscription continues uninterrupted.</p>
<p style="background:#fffbeb;border:1px solid #fde68a;padding:12px 14px;border-radius:8px;color:#92400e;font-size:14px;">
  <strong>Want to cancel?</strong> Visit your DigitalDSA billing dashboard before ${escapeHtml(debitDateStr)} and click "Cancel subscription." No charge will fire.
</p>
<p style="color: #666; font-size: 12px;">Thanks for trying DigitalDSA. Questions? Reply to this email.</p>
</body></html>`;
}

function buildTrialEndingEmailText(
	planName: string,
	priceMonthly: number,
	debitDateStr: string
): string {
	return `Your free trial ends on ${debitDateStr}\n\nHi,\n\nYou're 4 days away from the end of your DigitalDSA ${planName} free trial.\n\nFirst charge: ₹${priceMonthly}\nCharge date: ${debitDateStr}\n\nIf you want to continue, no action needed — the charge will happen automatically and your subscription continues uninterrupted.\n\nWant to cancel? Visit your DigitalDSA billing dashboard before ${debitDateStr} and click "Cancel subscription." No charge will fire.\n\nThanks for trying DigitalDSA. Questions? Reply to this email.`;
}

function formatIstDate(d: Date): string {
	const istOffsetMs = 5.5 * 60 * 60 * 1000;
	const shifted = new Date(d.getTime() + istOffsetMs);
	const day = shifted.getUTCDate();
	const month = shifted.toLocaleString('en-IN', { month: 'long', timeZone: 'UTC' });
	const year = shifted.getUTCFullYear();
	return `${day} ${month} ${year}`;
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
