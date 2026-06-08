/**
 * D.1 S6 M6 — Pause auto-cancel sweep engine
 * ══════════════════════════════════════════════════════════════════
 * Walks subscriptions in `paused` state and acts on day-N thresholds
 * per spec §3.2.1 #20a (locked 2026-05-25 — prevents zombie subs):
 *
 *   day 60: send "paused 60d, will auto-cancel in 30d unless you resume"
 *           reminder email. Idempotent via `pause_reminder_sent_at`.
 *   day 90: transition paused → cancelled. Best-effort revoke mandate
 *           at provider. State machine already supports paused → cancelled
 *           (transition #20a).
 *
 * Day-N math anchors on the MOST RECENT `* → paused` state_history
 * entry. Walking state_history avoids a new top-level field; the
 * paused-subs population is small enough that scanning each row's
 * history (≤ ~20 entries in practice) is cheap.
 *
 * Pure logic — no HTTP, no lock acquisition. The cron endpoint at
 * `/api/cron/billing-pause-sweep` wraps this with cronLock + the
 * x-cron-secret gate.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §3.2.1 #20a + §4 S6 M6
 * ══════════════════════════════════════════════════════════════════
 */

import type { BillingSubscriptionDoc } from '$lib/types/billingSubscription';
import { BillingSubscriptions } from '$lib/database/mongo';
import { applyTransition } from './subscriptionStore';
import { writeBillingAuditLog } from './billingAuditLog';
import logger from '$lib/server/logger';
import { getBillingProvider } from './providerRegistry';

/** Day-60 threshold for the "you'll be cancelled in 30 days" reminder. */
export const REMINDER_DAYS = 60;
/** Day-90 threshold for the auto-cancel transition. */
export const AUTO_CANCEL_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const DEFAULT_PAUSE_SWEEP_BATCH_SIZE = 50;

/** Per-subscription outcome — keyed for batch aggregation. */
export type PauseSweepOutcome =
	| { kind: 'no_action'; subscription_id: string; days_paused: number }
	| { kind: 'reminder_sent'; subscription_id: string; days_paused: number }
	| { kind: 'auto_cancelled'; subscription_id: string; days_paused: number; revoke_status: string }
	| { kind: 'skipped_missing_paused_at'; subscription_id: string }
	| { kind: 'error'; subscription_id: string; message: string };

export interface PauseSweepSummary {
	total: number;
	reminders_sent: number;
	auto_cancelled: number;
	no_action: number;
	skipped: number;
	errors: number;
	outcomes: PauseSweepOutcome[];
}

/**
 * Find the most recent `* → paused` transition timestamp in state_history.
 * Returns null if none — defensive: a sub in state=paused without a paused
 * transition would be a data corruption (state set directly, history skipped).
 */
export function findPausedAt(sub: BillingSubscriptionDoc): Date | null {
	for (let i = sub.state_history.length - 1; i >= 0; i--) {
		const entry = sub.state_history[i];
		if (entry.to === 'paused') return entry.at;
	}
	return null;
}

/** Whole days elapsed (floor) — same math as dunning's day-N rule. */
export function daysPaused(pausedAt: Date, now: Date): number {
	return Math.floor((now.getTime() - pausedAt.getTime()) / MS_PER_DAY);
}

/**
 * Evaluate one subscription. Pure — no DB writes. Returns the action the
 * cron should take, or null when nothing's due.
 */
export type PauseSweepAction =
	| { kind: 'send_reminder' }
	| { kind: 'auto_cancel' }
	| null;

export function evaluatePause(sub: BillingSubscriptionDoc, now: Date): PauseSweepAction {
	if (sub.state !== 'paused') return null;
	const pausedAt = findPausedAt(sub);
	if (!pausedAt) return null;
	const days = daysPaused(pausedAt, now);

	if (days >= AUTO_CANCEL_DAYS) {
		return { kind: 'auto_cancel' };
	}
	if (days >= REMINDER_DAYS && !sub.pause_reminder_sent_at) {
		return { kind: 'send_reminder' };
	}
	return null;
}

// ── Batch processor ─────────────────────────────────────────────

export interface ProcessPauseSweepOptions {
	batchSize?: number;
	now?: Date;
	/** Send the day-60 reminder. Engine catches throws so cron stays robust. */
	sendReminderEmail: (sub: BillingSubscriptionDoc) => Promise<void>;
}

export async function processPauseSweepBatch(
	options: ProcessPauseSweepOptions
): Promise<PauseSweepSummary> {
	const now = options.now ?? new Date();
	const batchSize = options.batchSize ?? DEFAULT_PAUSE_SWEEP_BATCH_SIZE;
	const provider = getBillingProvider();

	// Eligibility: state=paused. Day-N filtering happens in-engine; the
	// paused population is small, so we don't need a Mongo-side cutoff
	// (which would require state_history $expr — slow).
	const subs = await BillingSubscriptions.find({ state: 'paused' })
		.limit(batchSize)
		.toArray();

	const summary: PauseSweepSummary = {
		total: subs.length,
		reminders_sent: 0,
		auto_cancelled: 0,
		no_action: 0,
		skipped: 0,
		errors: 0,
		outcomes: []
	};

	for (const sub of subs) {
		const subscription_id_str = sub._id!.toString();
		const pausedAt = findPausedAt(sub);
		if (!pausedAt) {
			summary.skipped++;
			summary.outcomes.push({
				kind: 'skipped_missing_paused_at',
				subscription_id: subscription_id_str
			});
			logger.warn(
				{ subscription_id: subscription_id_str, dsa_id: String(sub.dsa_id) },
				'pause-sweep: state=paused but no `* → paused` in state_history — data corruption'
			);
			continue;
		}
		const days = daysPaused(pausedAt, now);
		const action = evaluatePause(sub, now);

		if (!action) {
			summary.no_action++;
			summary.outcomes.push({
				kind: 'no_action',
				subscription_id: subscription_id_str,
				days_paused: days
			});
			continue;
		}

		try {
			if (action.kind === 'send_reminder') {
				// Stamp `pause_reminder_sent_at` BEFORE the email send so a cron
				// crash mid-send can't re-trigger the email on the next tick.
				// Email failure is logged but doesn't roll the field back —
				// duplicate sends are worse than a missed reminder (and the day-90
				// auto-cancel email still fires).
				const result = await BillingSubscriptions.findOneAndUpdate(
					{ _id: sub._id, state: 'paused', pause_reminder_sent_at: { $exists: false } },
					{ $set: { pause_reminder_sent_at: now, updated_at: now } },
					{ returnDocument: 'after' }
				);
				if (!result) {
					// Another tick stamped it first — exit clean.
					summary.no_action++;
					summary.outcomes.push({
						kind: 'no_action',
						subscription_id: subscription_id_str,
						days_paused: days
					});
					continue;
				}
				try {
					await options.sendReminderEmail(result);
				} catch (err) {
					logger.error(
						{ subscription_id: subscription_id_str, err: (err as Error).message },
						'pause-sweep: reminder email throw — field stamped, transition NOT rolled back'
					);
				}
				await writeBillingAuditLog({
					event_class: 'cron_run',
					event_name: 'pause_reminder_sent',
					subscription_id: sub._id,
					dsa_id: sub.dsa_id,
					actor: 'cron',
					payload: { days_paused: days, paused_at: pausedAt.toISOString() }
				});
				summary.reminders_sent++;
				summary.outcomes.push({
					kind: 'reminder_sent',
					subscription_id: subscription_id_str,
					days_paused: days
				});
				continue;
			}

			// action.kind === 'auto_cancel'
			const updated = await applyTransition(
				sub.dsa_id,
				'paused',
				'cancelled',
				`paused ${days}d → auto-cancel (90d threshold)`
			);
			if (!updated) {
				// Concurrent transition — another path already moved it. Skip.
				summary.no_action++;
				summary.outcomes.push({
					kind: 'no_action',
					subscription_id: subscription_id_str,
					days_paused: days
				});
				continue;
			}

			// Best-effort revoke at provider (R3 lesson — failing to revoke
			// wastes future attempts). Failure is non-fatal.
			let revokeStatus = 'skipped_no_token';
			if (sub.mandate_token) {
				try {
					const revokeResult = await provider.revokeMandate(sub.mandate_token);
					revokeStatus = revokeResult.status;
				} catch (err) {
					revokeStatus = 'threw';
					logger.error(
						{ subscription_id: subscription_id_str, err: (err as Error).message },
						'pause-sweep: provider.revokeMandate threw on auto-cancel — operator follow-up'
					);
				}
			}

			await writeBillingAuditLog({
				event_class: 'subscription_transition',
				event_name: 'paused->cancelled (90d auto)',
				subscription_id: sub._id,
				dsa_id: sub.dsa_id,
				actor: 'cron',
				payload: {
					days_paused: days,
					paused_at: pausedAt.toISOString(),
					revoke_status: revokeStatus
				}
			});

			summary.auto_cancelled++;
			summary.outcomes.push({
				kind: 'auto_cancelled',
				subscription_id: subscription_id_str,
				days_paused: days,
				revoke_status: revokeStatus
			});
		} catch (err) {
			const e = err as Error;
			logger.error(
				{ subscription_id: subscription_id_str, err: e.message },
				'pause-sweep: error processing sub'
			);
			summary.errors++;
			summary.outcomes.push({
				kind: 'error',
				subscription_id: subscription_id_str,
				message: e.message
			});
		}
	}

	return summary;
}
