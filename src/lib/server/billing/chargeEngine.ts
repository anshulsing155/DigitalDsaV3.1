/**
 * D.1 S3 — Renewal charge engine
 * ══════════════════════════════════════════════════════════════════
 * The orchestration layer for the charge cron. Pure logic — no HTTP, no
 * lock-acquisition, no schedule (those live in cronLock + the +server.ts
 * endpoint). Exposed via:
 *   - `processChargesBatch(now, options)` — find eligible subs, process up
 *     to `batchSize`, return counts. Used by the cron endpoint AND the
 *     R11 simulate-charge test driver.
 *   - `processOneSubscription(sub, now)` — drives a single subscription
 *     through the charge attempt. Exported for fine-grained tests.
 *
 * CRITICAL INVARIANT (Pitfall candidate locked by chargeEngineIdempotency.test.ts):
 *
 *   The engine MUST query ChargeAttempts for a SUCCEEDED row matching
 *   (subscription_id, cycle_anchor) BEFORE calling provider.chargeMandate.
 *
 *   Without this probe, a cron firing twice (two Vercel regions, retry
 *   on 5xx) generates a fresh attempt_id on the second run. Razorpay's
 *   per-receipt dedup catches the SAME attempt_id but NOT a fresh one,
 *   so the second run creates a second order and double-charges. The
 *   ChargeAttempts (subscription_id, cycle_anchor) index makes this
 *   probe O(1).
 *
 * RESUME PATH (spec R2):
 *
 *   If a `pending` ChargeAttempt exists for the same (subscription_id,
 *   cycle_anchor) and is older than 30 min, a prior cron crashed between
 *   the two-phase persist and the provider response. The engine REUSES
 *   that attempt_id (same UUID) so Razorpay's per-receipt dedup returns
 *   the original payment status. The engine then updates the row to its
 *   actual final status.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S3, §11 R1+R2+R14
 * ══════════════════════════════════════════════════════════════════
 */

import { ObjectId } from 'mongodb';
import { randomUUID } from 'node:crypto';
import {
	BillingSubscriptions,
	ChargeAttempts,
	BillingTransactions
} from '$lib/database/mongo';
import type {
	BillingSubscriptionDoc,
	ChargeAttemptDoc,
	RecurringBillingTransactionDoc
} from '$lib/types/billingSubscription';
import {
	nextChargeAtForAnchor,
	anchorDayOf,
	type AnchorDay
} from './anchorAssignment';
import { applyTransition } from './subscriptionStore';
import type { BillingProvider, ChargeRequest, ChargeResult } from './providers/BillingProvider';
import { PLANS, type PlanId } from '$lib/config/billing';
import { sendEmail } from '$lib/server/email';
import { sendDunningT0Email } from './dunningEmails';
import logger from '$lib/server/logger';
import { writeBillingAuditLog } from './billingAuditLog';
import { generateInvoice } from './invoiceEngine';
import { sendInvoiceReadyEmail } from './invoiceEmail';

// ── Configuration ──────────────────────────────────────────────

/** Stale-pending resume threshold — 30 min per spec R2. */
const STALE_PENDING_MS = 30 * 60 * 1000;

/** Default batch size if not overridden — env-var tunable per S3 I-2 owner default. */
export const DEFAULT_BATCH_SIZE = 25;

// ── Result types ───────────────────────────────────────────────

/** Per-subscription outcome, returned for cron logging + the simulate driver. */
export type SubscriptionChargeOutcome =
	| { kind: 'skipped_already_charged'; subscription_id: string; cycle_anchor: Date }
	| { kind: 'skipped_cancel_at_end'; subscription_id: string }
	| { kind: 'skipped_no_mandate'; subscription_id: string }
	| { kind: 'skipped_mandate_update_lock'; subscription_id: string; lock_until: Date }
	| {
			kind: 'succeeded';
			subscription_id: string;
			attempt_id: string;
			provider_payment_id: string;
			amount_paise: number;
			next_charge_at: Date;
	  }
	| {
			kind: 'failed_retryable';
			subscription_id: string;
			attempt_id: string;
			failure_code: string;
	  }
	| {
			kind: 'failed_terminal';
			subscription_id: string;
			attempt_id: string;
			failure_code: string;
	  }
	| { kind: 'error'; subscription_id: string; message: string };

export interface BatchOutcome {
	total: number;
	succeeded: number;
	failed_retryable: number;
	failed_terminal: number;
	skipped: number;
	errors: number;
	outcomes: SubscriptionChargeOutcome[];
}

// ── Eligibility query ─────────────────────────────────────────

/**
 * Find subscriptions eligible for charging at `now`. Covers BOTH fresh
 * anchor charges (state=active) AND S4 retry attempts (state=dunning_*).
 *
 * The compound index {state: 1, next_charge_at: 1} (M1) makes this a
 * covered query. The $in clause is index-friendly — Mongo scans the
 * matching prefix for each state value.
 *
 * S4 single-cron design (per Q2 owner decision): one batch of up to
 * BILLING_CHARGE_BATCH_SIZE covers both classes. The 25-cap is the
 * safety knob; on peak days raise via env var. A retry uses the same
 * eligibility predicate as a fresh charge — next_charge_at <= now AND
 * mandate_token present. handleFailure schedules the next retry's
 * next_charge_at at +1d/+3d/+5d cumulative from dunning_started_at.
 *
 * After the 4th attempt within dunning_t0 (failed_attempt_count >= 4),
 * handleFailure leaves next_charge_at unset; S5's day-counting cron
 * advances state from there.
 */
export async function findEligibleSubscriptions(
	now: Date,
	limit: number
): Promise<BillingSubscriptionDoc[]> {
	return await BillingSubscriptions.find({
		state: { $in: ['active', 'dunning_t0', 'dunning_grace', 'dunning_final'] },
		next_charge_at: { $lte: now },
		mandate_token: { $exists: true }
	})
		.limit(limit)
		.toArray();
}

// ── S4 retry schedule ─────────────────────────────────────────

/**
 * Retry schedule per spec §4 S4: attempts at t+1d, t+3d, t+5d cumulative
 * from dunning_started_at. The original failure is attempt 1; the 3
 * retries are attempts 2/3/4. After attempt 4 fails, no further retry is
 * scheduled — S5 takes over via day-counting from dunning_started_at.
 *
 * Indexed by failed_attempt_count AFTER the increment (so count=1 means
 * "the first failure just happened; schedule the second attempt").
 *
 * Q1 owner decision 2026-05-27: post-4th-attempt has NO next_charge_at;
 * S5 owns escalation from there.
 */
const RETRY_OFFSET_DAYS: Record<number, number> = {
	1: 1, // after attempt 1 (the original failure) → retry at +1d
	2: 3, // after attempt 2 (first retry failed) → +3d
	3: 5 // after attempt 3 (second retry failed) → +5d (final retry)
	// count >= 4: no scheduled retry (S5 takes over)
};

/**
 * Compute the next retry's next_charge_at, or null if no further retry
 * should be scheduled (caller clears the field via $unset).
 *
 * `dunningStartedAt` is the source-of-truth clock. For the first failure
 * (state was active, now becoming dunning_t0), the caller passes `now`
 * as dunningStartedAt because the transition is about to set it.
 */
export function computeNextRetryAt(
	dunningStartedAt: Date,
	attemptCountAfter: number
): Date | null {
	const offsetDays = RETRY_OFFSET_DAYS[attemptCountAfter];
	if (offsetDays === undefined) return null;
	return new Date(dunningStartedAt.getTime() + offsetDays * 24 * 60 * 60 * 1000);
}

// ── Idempotency probe ─────────────────────────────────────────

/**
 * Look up an existing ChargeAttempt for the same (subscription_id,
 * cycle_anchor). Returns:
 *   - `{ kind: 'already_succeeded', row }` — DO NOT call provider; this
 *     cycle was already charged. Skip and move on.
 *   - `{ kind: 'resume_pending', row }` — a prior crash left a pending
 *     attempt; REUSE its attempt_id so provider-side dedup catches the
 *     duplicate.
 *   - `{ kind: 'none' }` — clean slate; generate a fresh attempt_id.
 */
async function probeExistingAttempt(
	subscription_id: ObjectId,
	cycle_anchor: Date,
	now: Date
): Promise<
	| { kind: 'already_succeeded'; row: ChargeAttemptDoc }
	| { kind: 'resume_pending'; row: ChargeAttemptDoc }
	| { kind: 'in_flight'; row: ChargeAttemptDoc }
	| { kind: 'none' }
> {
	// First check for a succeeded row — that's the strongest signal.
	const succeeded = await ChargeAttempts.findOne({
		subscription_id,
		cycle_anchor,
		status: 'succeeded'
	});
	if (succeeded) return { kind: 'already_succeeded', row: succeeded };

	// Then check for any pending row. Distinguish by age:
	//   - older than STALE_PENDING_MS (30 min) → prior cron crashed mid-call;
	//     RESUME with the original attempt_id so provider-side dedup catches
	//     the duplicate. (Spec R2.)
	//   - fresher than that → another caller is mid-charge for this cycle
	//     (S4 race: cron + manual retry-now firing simultaneously). SKIP this
	//     attempt entirely; the other caller's path will resolve the cycle.
	//     Without this branch, both callers would insert their own pending
	//     row + call provider.chargeMandate with different attempt_ids,
	//     bypassing Razorpay's per-receipt dedup → double-charge.
	const pending = await ChargeAttempts.findOne({
		subscription_id,
		cycle_anchor,
		status: 'pending'
	});
	if (pending) {
		const ageMs = now.getTime() - pending.created_at.getTime();
		if (ageMs > STALE_PENDING_MS) {
			return { kind: 'resume_pending', row: pending };
		}
		return { kind: 'in_flight', row: pending };
	}

	return { kind: 'none' };
}

// ── Single-subscription orchestration ─────────────────────────

export interface ProcessOneOptions {
	provider: BillingProvider;
	now?: Date;
	/**
	 * Inline post-success email side-effect. Per S3 I-3 owner default,
	 * the cron sends a charge-confirmation email inline with try/catch +
	 * log-and-continue on failure. Tests can disable via `false`.
	 */
	sendConfirmationEmail?: boolean;
	/**
	 * Source of this charge attempt (S4):
	 *   - 'cron' (default): scheduled retry from the billing-charge cron.
	 *     handleFailure schedules the NEXT retry's next_charge_at per the
	 *     retry schedule. handleSuccess advances next_charge_at to the next
	 *     anchor (recovery).
	 *   - 'manual': DSA-triggered via POST /api/billing/subscription/retry-now.
	 *     handleFailure bumps the counter via state-machine self-loop but
	 *     does NOT override next_charge_at (manual retries are bonus
	 *     attempts, NOT replacements for the cron schedule).
	 */
	mode?: 'cron' | 'manual';
}

/**
 * Process a single eligible subscription. Returns the outcome for batch
 * aggregation; never throws (errors are caught and returned as outcomes).
 *
 * Side effects in execution order:
 *   1. cancel_at_cycle_end guard → transition active→cancelled, skip
 *   2. pending_downgrade apply → patch plan_id on the next charge
 *   3. Idempotency probe → may skip (already_succeeded) or reuse attempt_id (resume_pending)
 *   4. Insert pending ChargeAttempt (two-phase persist)
 *   5. Call provider.chargeMandate
 *   6. Update ChargeAttempt to succeeded/failed
 *   7. Transition subscription state via applyTransition
 *   8. On success: insert BillingTransaction (kind: recurring_charge),
 *      send confirmation email
 *   9. Always: writeBillingAuditLog
 */
export async function processOneSubscription(
	sub: BillingSubscriptionDoc,
	options: ProcessOneOptions
): Promise<SubscriptionChargeOutcome> {
	const now = options.now ?? new Date();
	const subscription_id = sub._id!;
	const subscription_id_str = subscription_id.toString();

	try {
		// ── Step 1: cancel_at_cycle_end guard ──
		// DSA hit Cancel sometime during the prior cycle. Spec §4 S6 says
		// the cron processes the cancel at next anchor — that's now.
		// active→cancelled is legal (transition #9). Skip the charge.
		// Only applies to active subs; cancel_at_cycle_end is a no-op during
		// dunning (per spec, cancel during dunning goes via /cancel endpoint).
		if (sub.cancel_at_cycle_end && sub.state === 'active') {
			await applyTransition(
				sub.dsa_id,
				'active',
				'cancelled',
				'cancel_at_cycle_end honored at next anchor',
				{ cancel_at_cycle_end: false }
			);
			await writeBillingAuditLog({
				event_class: 'subscription_transition',
				event_name: 'active->cancelled (cancel_at_cycle_end)',
				subscription_id,
				dsa_id: sub.dsa_id,
				actor: 'cron',
				payload: { reason: 'cancel_at_cycle_end honored at next anchor' }
			});
			return { kind: 'skipped_cancel_at_end', subscription_id: subscription_id_str };
		}

		// ── Step 1.5: update-payment-method advisory lock (S6 M3, R6) ──
		// While the DSA is mid-mandate-swap, skip charging. Prevents the
		// race where the cron fires moments before the webhook lands and
		// charges the OLD mandate when we're about to swap to a new one.
		// Lock is short (5 min); the field auto-expires via `> now` check,
		// no TTL index or sweep cron needed. If the DSA abandons, the lock
		// expires and the cron resumes normal charging on the old mandate
		// (spec: "old mandate stays in force" on abandonment).
		if (sub.mandate_update_lock_until && sub.mandate_update_lock_until > now) {
			logger.info(
				{
					subscription_id: subscription_id_str,
					lock_until: sub.mandate_update_lock_until
				},
				'chargeEngine: skipping — mandate update in progress (R6 advisory lock)'
			);
			await writeBillingAuditLog({
				event_class: 'cron_run',
				event_name: 'skipped_mandate_update_lock',
				subscription_id,
				dsa_id: sub.dsa_id,
				actor: 'cron',
				payload: { lock_until: sub.mandate_update_lock_until.toISOString() }
			});
			return {
				kind: 'skipped_mandate_update_lock',
				subscription_id: subscription_id_str,
				lock_until: sub.mandate_update_lock_until
			};
		}

		// ── Step 2: pending_downgrade apply ──
		// DSA hit Change Plan (downgrade) sometime in the prior cycle. Spec
		// §4 S6: applied at next anchor by flipping plan_id, clearing the
		// flag. The charge below uses the new plan's amount. Only fires when
		// the sub is active (downgrades during dunning are not allowed —
		// resolve the failure first via /retry-now or update-payment-method).
		let effective_plan_id: PlanId = sub.plan_id;
		if (sub.pending_downgrade_to && sub.pending_downgrade_to !== sub.plan_id && sub.state === 'active') {
			effective_plan_id = sub.pending_downgrade_to;
			// Persist the plan flip atomically before the charge — keeps the
			// pre-charge state correct in case of a crash before provider call.
			await BillingSubscriptions.updateOne(
				{ _id: subscription_id, state: 'active' },
				{
					$set: { plan_id: effective_plan_id, updated_at: now },
					$unset: { pending_downgrade_to: '' }
				}
			);
			await writeBillingAuditLog({
				event_class: 'subscription_transition',
				event_name: 'pending_downgrade applied',
				subscription_id,
				dsa_id: sub.dsa_id,
				actor: 'cron',
				payload: {
					from_plan: sub.plan_id,
					to_plan: effective_plan_id
				}
			});
		}

		// Sanity guards.
		if (!sub.mandate_token) {
			return { kind: 'skipped_no_mandate', subscription_id: subscription_id_str };
		}
		const anchor = anchorDayOf(sub);
		// next_charge_at is required for the cron-driven path; the manual
		// retry-now path also requires it because we use it as the
		// cycle_anchor for the per-cycle idempotency probe. anchor_day is
		// also required for handleSuccess's nextChargeAtForAnchor call when
		// recovering from dunning back to active.
		if (!anchor || !sub.next_charge_at) {
			return { kind: 'error', subscription_id: subscription_id_str, message: 'missing anchor_day or next_charge_at' };
		}

		const cycle_anchor = sub.next_charge_at;
		const plan = PLANS[effective_plan_id];
		const amount_paise = plan.amountPaise;

		// ── Step 3: idempotency probe ──
		const probe = await probeExistingAttempt(subscription_id, cycle_anchor, now);
		if (probe.kind === 'already_succeeded') {
			logger.info(
				{
					subscription_id: subscription_id_str,
					cycle_anchor,
					existing_attempt_id: probe.row.attempt_id
				},
				'chargeEngine: skipping — succeeded attempt already exists for this cycle'
			);
			return {
				kind: 'skipped_already_charged',
				subscription_id: subscription_id_str,
				cycle_anchor
			};
		}
		if (probe.kind === 'in_flight') {
			// Another caller (cron OR manual retry-now) is mid-charge for this
			// cycle. Bail before insert/provider-call. Prevents the double-charge
			// race when cron + manual fire within the same 30-min window.
			logger.info(
				{
					subscription_id: subscription_id_str,
					cycle_anchor,
					in_flight_attempt_id: probe.row.attempt_id,
					in_flight_age_ms: now.getTime() - probe.row.created_at.getTime()
				},
				'chargeEngine: skipping — in-flight pending attempt detected (concurrent caller)'
			);
			return {
				kind: 'skipped_already_charged',
				subscription_id: subscription_id_str,
				cycle_anchor
			};
		}

		// ── Step 4: prepare attempt_id (fresh or resumed) ──
		const attempt_id = probe.kind === 'resume_pending' ? probe.row.attempt_id : randomUUID();
		const isResuming = probe.kind === 'resume_pending';

		// ── Step 5: two-phase persist — insert/update pending row BEFORE provider call ──
		if (!isResuming) {
			const attemptDoc: ChargeAttemptDoc = {
				attempt_id,
				subscription_id,
				dsa_id: sub.dsa_id,
				plan_id: effective_plan_id,
				amount_paise,
				status: 'pending',
				cycle_anchor,
				created_at: now,
				updated_at: now
			};
			try {
				await ChargeAttempts.insertOne(attemptDoc);
			} catch (err) {
				// Atomic in-flight backstop. The partial unique index on
				// (subscription_id, cycle_anchor) WHERE status='pending' rejects
				// a second concurrent insert with E11000 when two callers race
				// past the probe simultaneously. We treat that as "another
				// caller is mid-charge for this cycle" — exit clean without a
				// provider call. Surfaced by S4 smoke Test S4-7 on 2026-05-27;
				// the application-layer probe alone can't catch the true
				// concurrent race (both reads complete before either write).
				const e = err as { code?: number; message?: string };
				if (e.code === 11000) {
					logger.info(
						{
							subscription_id: subscription_id_str,
							cycle_anchor,
							attempt_id_attempted: attempt_id
						},
						'chargeEngine: skipping — E11000 on pending insert (concurrent in-flight caller)'
					);
					return {
						kind: 'skipped_already_charged',
						subscription_id: subscription_id_str,
						cycle_anchor
					};
				}
				throw err;
			}
		} else {
			// Resume path — bump updated_at so the next "stale pending" probe
			// doesn't immediately re-fire if THIS cron also crashes.
			await ChargeAttempts.updateOne(
				{ attempt_id },
				{ $set: { updated_at: now } }
			);
			logger.warn(
				{ subscription_id: subscription_id_str, attempt_id, cycle_anchor },
				'chargeEngine: RESUMING stale pending attempt — prior cron crashed mid-call'
			);
		}

		// ── Step 6: call provider ──
		const chargeReq: ChargeRequest = {
			mandate_token: sub.mandate_token,
			amount_paise,
			attempt_id,
			description: `DigitalDSA ${plan.name} — ${formatCycleDescription(cycle_anchor)}`,
			customer_id: sub.provider_customer_id,
			customer_email: sub.customer_email,
			customer_mobile: sub.customer_mobile
		};
		let chargeResult: ChargeResult;
		try {
			chargeResult = await options.provider.chargeMandate(chargeReq);
		} catch (err) {
			const e = err as Error;
			logger.error(
				{ subscription_id: subscription_id_str, attempt_id, err: e.message },
				'chargeEngine: provider.chargeMandate THREW — treating as UNKNOWN retryable'
			);
			chargeResult = {
				status: 'failed',
				failure_code: 'UNKNOWN',
				failure_message: e.message,
				raw_response: { engine_caught_throw: true, message: e.message }
			};
		}

		// ── Step 7: persist final attempt status ──
		const attemptUpdate: Partial<ChargeAttemptDoc> = {
			status: chargeResult.status === 'succeeded' ? 'succeeded' : 'failed',
			provider_payment_id: chargeResult.provider_payment_id,
			failure_code: chargeResult.failure_code,
			failure_message: chargeResult.failure_message,
			provider_raw_response: chargeResult.raw_response,
			updated_at: new Date()
		};
		// 'pending' provider status is treated like 'failed' for the attempt
		// row's terminal status, but does NOT advance subscription state — the
		// reconcile cron (S7) resolves it later.
		if (chargeResult.status === 'pending') {
			attemptUpdate.status = 'pending';
		}
		await ChargeAttempts.updateOne({ attempt_id }, { $set: attemptUpdate });

		// ── Step 8: branch on outcome ──
		if (chargeResult.status === 'succeeded') {
			return await handleSuccess(
				sub,
				anchor,
				attempt_id,
				chargeResult,
				amount_paise,
				effective_plan_id,
				options.sendConfirmationEmail !== false,
				now
			);
		}
		if (chargeResult.status === 'failed') {
			return await handleFailure(sub, attempt_id, chargeResult, options.mode ?? 'cron', now);
		}
		// 'pending' — leave subscription state at active; reconcile cron resolves.
		await writeBillingAuditLog({
			event_class: 'charge_attempt',
			event_name: 'charge.pending',
			subscription_id,
			dsa_id: sub.dsa_id,
			actor: 'cron',
			event_id: attempt_id,
			payload: {
				attempt_id,
				amount_paise,
				note: 'provider returned pending; subscription state unchanged; reconcile cron will resolve'
			}
		});
		return {
			kind: 'error',
			subscription_id: subscription_id_str,
			message: 'provider returned pending — reconcile cron will resolve'
		};
	} catch (err) {
		const e = err as Error;
		logger.error(
			{ subscription_id: subscription_id_str, err: e.message, stack: e.stack },
			'chargeEngine: processOneSubscription error'
		);
		return { kind: 'error', subscription_id: subscription_id_str, message: e.message };
	}
}

// ── Outcome handlers ──────────────────────────────────────────

async function handleSuccess(
	sub: BillingSubscriptionDoc,
	anchor: AnchorDay,
	attempt_id: string,
	chargeResult: ChargeResult,
	amount_paise: number,
	plan_id: PlanId,
	sendConfirmationEmail: boolean,
	now: Date
): Promise<SubscriptionChargeOutcome> {
	const subscription_id = sub._id!;
	const cycle_anchor = sub.next_charge_at!;
	const next_charge_at = nextChargeAtForAnchor(cycle_anchor, anchor);

	// S4: this handler now covers two recovery paths:
	//   - active → active (transition #5): renewal of the normal cycle
	//   - dunning_* → active (transitions #10/#13/#16): retry recovery
	// transitionSubscription's recovery side-effect (subscriptionState.ts)
	// clears dunning_started_at and resets failed_attempt_count to 0 on
	// any dunning_* → active transition.
	const isRecovery = sub.state !== 'active';
	const fromState = sub.state;

	// If this was a trial subscription, the first successful charge is the
	// trial-end charge — flag for the unset below. Reason string is augmented
	// so audit history clearly distinguishes trial-end from a normal renewal.
	const wasTrial = sub.is_trial === true;

	await applyTransition(
		sub.dsa_id,
		fromState,
		'active',
		isRecovery
			? `retry succeeded — recovery from ${fromState}`
			: wasTrial
				? 'charge succeeded — trial ended, first paid cycle'
				: 'charge succeeded — cycle renewed',
		{
			next_charge_at,
			last_charge_attempt_at: now,
			last_charge_succeeded_at: now
		}
	);

	// Trial graduated to paid. Clear is_trial + trial_until so:
	//   - the Manage panel's "Trial — ends in N days" banner stops showing
	//   - downstream consumers (admin, support tooling) see a normal paid sub
	//   - the next trial-ending-reminder cron pass doesn't try to email again
	// We deliberately do this AFTER applyTransition so the state-history row
	// from the transition is what audit consumers see; this $unset is a
	// quiet bookkeeping cleanup, not a state change.
	if (wasTrial) {
		await BillingSubscriptions.updateOne(
			{ _id: sub._id! },
			{ $unset: { is_trial: '', trial_until: '' } }
		);
	}

	// Insert the BillingTransaction (kind: recurring_charge). Idempotent on
	// (subscription_id, provider_payment_id) — but we don't enforce that via
	// index; the webhook handler in M5 will use upsert semantics.
	const tx: RecurringBillingTransactionDoc = {
		kind: 'recurring_charge',
		dsa_id: sub.dsa_id,
		subscription_id,
		attempt_id,
		plan_id,
		amount_paise,
		status: 'succeeded',
		provider: sub.provider,
		provider_payment_id: chargeResult.provider_payment_id,
		cycle_anchor,
		charged_at: now,
		created_at: now
	};
	const txInsert = await BillingTransactions.insertOne(tx);

	// QBC S3: cycle-reset auto-unblock. After a successful renewal, the
	// DSA's monthly cycle has effectively rolled over — any quota_blocked
	// cases they have are pulled FIFO until the plan's quota is saturated.
	// Best-effort: failures are logged but don't roll back the charge.
	// On the recovery path (dunning_* → active) we don't unblock because
	// the DSA already had access during dunning — the cycle isn't new.
	if (!isRecovery && !wasTrial) {
		try {
			const { processBlockedCasesAfter } = await import('./quotaUnblock');
			await processBlockedCasesAfter(sub.dsa_id, plan_id, 'cycle_reset');
		} catch (err) {
			logger.warn(
				{
					subscription_id: subscription_id.toString(),
					dsa_id: sub.dsa_id.toString(),
					err: (err as Error).message
				},
				'chargeEngine: QBC cycle-reset unblock failed (charge succeeded; non-fatal — reconcile cron will catch)'
			);
		}
	}

	// F.1 — referral reward credit. Fires on every successful charge but
	// gates itself internally on Referrals.reward_status='pending', so
	// renewals/recoveries are a no-op. Best-effort: a failure here can't
	// roll back the charge, and the audit log preserves the success.
	try {
		const { creditReferralRewardIfEligible } = await import(
			'$lib/server/referrals/creditReward'
		);
		await creditReferralRewardIfEligible(sub.dsa_id, now);
	} catch (err) {
		logger.warn(
			{ subscription_id: subscription_id.toString(), err: (err as Error).message },
			'[referral-credit] dynamic import / call threw — non-fatal'
		);
	}

	// D.2 — Generate the GST invoice for this successful charge. Best-effort:
	// failures are logged loudly but don't roll back the charge (per spec R10
	// — invoices are issued AFTER the charge succeeds; the BillingTransaction
	// + audit row are the legal proof of the charge itself, not the invoice).
	// The reconcile cron (S7) will surface invoice-count vs charge-count drift
	// for operator follow-up if generation persistently fails.
	//
	// Skipped automatically for refund / failed rows because handleSuccess
	// only runs on the success path.
	try {
		const invoiceResult = await generateInvoice({
			billing_transaction_id: txInsert.insertedId,
			dsa_id: sub.dsa_id,
			subscription_id: sub._id,
			attempt_id,
			plan_id,
			amount_paise,
			cycle_start: cycle_anchor,
			cycle_end: next_charge_at,
			issue_date: now
		});

		// Send the invoice-ready email — also best-effort. The confirmation
		// email below stays distinct (different tone: "renewed/recovery").
		if (sub.customer_email && invoiceResult.ok) {
			void sendInvoiceReadyEmail({
				invoice: invoiceResult.invoice,
				to: sub.customer_email
			});
		}
	} catch (err) {
		logger.error(
			{
				subscription_id: subscription_id.toString(),
				billing_transaction_id: txInsert.insertedId.toString(),
				err: (err as Error).message
			},
			'chargeEngine: invoice generation failed (charge succeeded; non-fatal — reconcile cron will surface drift)'
		);
	}

	// Inline email — try/catch + log-and-continue per S3 I-3 default.
	// S4: distinct subject + body for the recovery case vs the standard
	// renewal-confirmation case — the DSA's mental state at "your dunning
	// retry succeeded" is materially different from "your monthly bill
	// went through."
	if (sendConfirmationEmail && sub.customer_email) {
		try {
			const plan = PLANS[plan_id];
			if (isRecovery) {
				await sendEmail({
					to: sub.customer_email,
					subject: `Your DigitalDSA payment went through — thanks!`,
					html: buildRecoveryEmailHtml(plan.name, plan.priceMonthly, next_charge_at),
					text: buildRecoveryEmailText(plan.name, plan.priceMonthly, next_charge_at)
				});
			} else {
				await sendEmail({
					to: sub.customer_email,
					subject: `Your DigitalDSA subscription was renewed — ₹${plan.priceMonthly}`,
					html: buildConfirmationEmailHtml(plan.name, plan.priceMonthly, next_charge_at),
					text: buildConfirmationEmailText(plan.name, plan.priceMonthly, next_charge_at)
				});
			}
		} catch (err) {
			logger.error(
				{
					subscription_id: subscription_id.toString(),
					recovery: isRecovery,
					err: (err as Error).message
				},
				'chargeEngine: success email failed (charge succeeded; non-fatal)'
			);
		}
	}

	await writeBillingAuditLog({
		event_class: 'charge_attempt',
		event_name: isRecovery ? 'charge.recovery' : 'charge.succeeded',
		subscription_id,
		dsa_id: sub.dsa_id,
		actor: 'cron',
		event_id: attempt_id,
		payload: {
			attempt_id,
			amount_paise,
			provider_payment_id: chargeResult.provider_payment_id,
			next_charge_at,
			recovered_from: isRecovery ? fromState : undefined
		}
	});

	return {
		kind: 'succeeded',
		subscription_id: subscription_id.toString(),
		attempt_id,
		provider_payment_id: chargeResult.provider_payment_id!,
		amount_paise,
		next_charge_at
	};
}

async function handleFailure(
	sub: BillingSubscriptionDoc,
	attempt_id: string,
	chargeResult: ChargeResult,
	mode: 'cron' | 'manual',
	now: Date
): Promise<SubscriptionChargeOutcome> {
	const subscription_id = sub._id!;
	const failure_code = chargeResult.failure_code ?? 'UNKNOWN';
	const isTerminal = failure_code === 'MANDATE_INVALID';

	// S4: determine target state based on source state + failure type.
	//   - MANDATE_INVALID from ANY state → downgraded (terminal)
	//   - retryable from active → dunning_t0 (transition #6)
	//   - retryable from dunning_t0 → dunning_t0 (S4 self-loop)
	//   - retryable from dunning_grace → dunning_grace (S4 self-loop)
	//   - retryable from dunning_final → dunning_final (S4 self-loop)
	const fromState = sub.state;
	let target: 'dunning_t0' | 'downgraded' | 'dunning_grace' | 'dunning_final';
	if (isTerminal) {
		target = 'downgraded';
	} else if (fromState === 'active') {
		target = 'dunning_t0';
	} else if (
		fromState === 'dunning_t0' ||
		fromState === 'dunning_grace' ||
		fromState === 'dunning_final'
	) {
		target = fromState; // self-loop — stay put, count bumps via state-machine side-effect
	} else {
		// Defensive: failure received on a non-chargeable state (paused /
		// cancelled / etc.) — log and bail.
		logger.warn(
			{ subscription_id: subscription_id.toString(), from_state: fromState },
			'chargeEngine: failure on non-chargeable state — no transition'
		);
		return {
			kind: 'error',
			subscription_id: subscription_id.toString(),
			message: `failure received but state=${fromState} is not chargeable`
		};
	}

	// S4: compute the next retry's next_charge_at (cron mode only).
	// transitionSubscription will bump failed_attempt_count via its
	// isFreshFailure side-effect; for the retry-schedule math we need the
	// POST-increment count.
	//
	// For the first failure (active → dunning_t0), dunning_started_at hasn't
	// been set yet — the transition itself sets it to `now`. So we use `now`
	// as the dunning-clock baseline for the retry-schedule math; that's
	// equivalent to "1 day from when dunning started" when the transition
	// applies.
	const nextAttemptCount = (sub.failed_attempt_count ?? 0) + 1;
	const dunningClock = sub.dunning_started_at ?? now;
	const scheduledRetryAt =
		!isTerminal && mode === 'cron'
			? computeNextRetryAt(dunningClock, nextAttemptCount)
			: null;

	// Patch shape varies by mode + retry availability:
	//   - terminal failure (MANDATE_INVALID): no retry. last_charge_attempt_at only.
	//   - manual retry: bump last_charge_attempt_at only — DO NOT change next_charge_at.
	//     Manual retries are bonus attempts; the cron's scheduled retry stays put.
	//   - cron retryable with a scheduled retry (count 1/2/3): patch next_charge_at.
	//   - cron retryable past the 4th attempt (count 4): no scheduled retry —
	//     leave next_charge_at as-is. S5 takes over via day-counting from
	//     dunning_started_at. Per Q1 owner decision 2026-05-27.
	const patch: Record<string, unknown> = { last_charge_attempt_at: now };
	if (!isTerminal && mode === 'cron' && scheduledRetryAt) {
		patch.next_charge_at = scheduledRetryAt;
	}
	// failed_attempt_count is incremented by transitionSubscription itself
	// (state-machine-managed field — see subscriptionState.ts isFreshFailure
	// branch). Don't include it in the patch here; applyTransition would
	// stamp the state-machine-managed value over our patch anyway.
	await applyTransition(
		sub.dsa_id,
		fromState,
		target,
		`charge failed — ${failure_code}${mode === 'manual' ? ' (manual retry)' : ''}`,
		patch,
		{
			attempt_id,
			failure_code,
			failure_message: chargeResult.failure_message,
			mode,
			next_attempt_count: nextAttemptCount,
			scheduled_retry_at: scheduledRetryAt ?? undefined
		}
	);

	await writeBillingAuditLog({
		event_class: 'charge_attempt',
		event_name: isTerminal ? 'charge.failed.terminal' : 'charge.failed.retryable',
		subscription_id,
		dsa_id: sub.dsa_id,
		actor: mode === 'manual' ? 'dsa' : 'cron',
		event_id: attempt_id,
		payload: {
			attempt_id,
			failure_code,
			failure_message: chargeResult.failure_message,
			from_state: fromState,
			transitioned_to: target,
			mode,
			next_attempt_count: nextAttemptCount,
			scheduled_retry_at: scheduledRetryAt ?? undefined
		}
	});

	// S5 M3: first-failure email. Fires ONLY on the active → dunning_t0
	// transition (the moment the DSA enters dunning at all). Self-loops
	// within dunning_* don't send a fresh t0 email — those DSAs already
	// got the t0 message; the next user-facing email comes from the
	// dunning-advance cron at day 3 (grace). Terminal MANDATE_INVALID
	// doesn't send a t0 email either — those go straight to downgraded
	// without retries, so the downgraded email (from the advance cron OR
	// directly here on terminal) is the right next signal.
	//
	// Email failure is caught + logged but never throws — a state-
	// transition rollback over a transient SES blip would be worse than
	// a delayed notification.
	if (fromState === 'active' && target === 'dunning_t0') {
		try {
			// Re-read the subscription so the email has the post-transition
			// state + bookkeeping (dunning_started_at now set, etc.).
			const refreshed = await BillingSubscriptions.findOne({ _id: subscription_id });
			if (refreshed) {
				await sendDunningT0Email(refreshed);
			}
		} catch (err) {
			logger.error(
				{
					subscription_id: subscription_id.toString(),
					err: (err as Error).message
				},
				'chargeEngine: sendDunningT0Email failed (state transition kept)'
			);
		}
	}

	return {
		kind: isTerminal ? 'failed_terminal' : 'failed_retryable',
		subscription_id: subscription_id.toString(),
		attempt_id,
		failure_code
	};
}

// ── Batch driver ──────────────────────────────────────────────

export interface ProcessBatchOptions {
	provider: BillingProvider;
	batchSize?: number;
	now?: Date;
	sendConfirmationEmail?: boolean;
	/** Batch driver always runs in 'cron' mode; manual retries don't go through here. */
}

/**
 * Find + process up to `batchSize` eligible subscriptions. Returns the
 * aggregate outcome. Sequential within the batch by default — concurrency
 * is a future tuning knob; the spec's 100 × ~500ms ≈ 50s is acceptable
 * for v1 launch volume.
 */
export async function processChargesBatch(
	options: ProcessBatchOptions
): Promise<BatchOutcome> {
	const now = options.now ?? new Date();
	const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
	const subs = await findEligibleSubscriptions(now, batchSize);

	logger.info(
		{ now, batchSize, found: subs.length, provider: options.provider.name },
		'chargeEngine: processing batch'
	);

	const outcomes: SubscriptionChargeOutcome[] = [];
	let succeeded = 0;
	let failed_retryable = 0;
	let failed_terminal = 0;
	let skipped = 0;
	let errors = 0;

	for (const sub of subs) {
		const outcome = await processOneSubscription(sub, {
			provider: options.provider,
			now,
			sendConfirmationEmail: options.sendConfirmationEmail
		});
		outcomes.push(outcome);
		switch (outcome.kind) {
			case 'succeeded':
				succeeded++;
				break;
			case 'failed_retryable':
				failed_retryable++;
				break;
			case 'failed_terminal':
				failed_terminal++;
				break;
			case 'skipped_already_charged':
			case 'skipped_cancel_at_end':
			case 'skipped_no_mandate':
			case 'skipped_mandate_update_lock':
				skipped++;
				break;
			case 'error':
				errors++;
				break;
		}
	}

	// Audit the batch run for operator visibility.
	await writeBillingAuditLog({
		event_class: 'cron_run',
		event_name: 'billing-charge',
		actor: 'cron',
		payload: {
			now,
			batchSize,
			total: subs.length,
			succeeded,
			failed_retryable,
			failed_terminal,
			skipped,
			errors
		}
	});

	return {
		total: subs.length,
		succeeded,
		failed_retryable,
		failed_terminal,
		skipped,
		errors,
		outcomes
	};
}

// ── Email body helpers (kept small + inline; SES swap in SEC-8 doesn't touch this) ──

function buildRecoveryEmailHtml(
	planName: string,
	priceMonthly: number,
	next_charge_at: Date
): string {
	const nextDateStr = formatIstDate(next_charge_at);
	return `<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; max-width: 560px; margin: 0 auto; padding: 24px;">
<h2>Your payment went through — thanks!</h2>
<p>Hi,</p>
<p>Your DigitalDSA <strong>${escapeHtml(planName)}</strong> subscription is back on track. The retry charge of ₹${priceMonthly} cleared, and your access continues without interruption.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr><td style="padding: 4px 12px 4px 0;">Amount charged</td><td style="padding: 4px 0;"><strong>₹${priceMonthly}</strong></td></tr>
  <tr><td style="padding: 4px 12px 4px 0;">Next charge</td><td style="padding: 4px 0;">${escapeHtml(nextDateStr)}</td></tr>
</table>
<p>You can manage your subscription anytime from your DigitalDSA dashboard.</p>
<p style="color: #666; font-size: 12px;">If you didn't expect this charge, contact support immediately.</p>
</body></html>`;
}

function buildRecoveryEmailText(planName: string, priceMonthly: number, next_charge_at: Date): string {
	const nextDateStr = formatIstDate(next_charge_at);
	return `Your payment went through — thanks!\n\nHi,\n\nYour DigitalDSA ${planName} subscription is back on track. The retry charge of ₹${priceMonthly} cleared, and your access continues without interruption.\n\nAmount charged: ₹${priceMonthly}\nNext charge: ${nextDateStr}\n\nYou can manage your subscription anytime from your DigitalDSA dashboard.\n\nIf you didn't expect this charge, contact support immediately.`;
}

function buildConfirmationEmailHtml(planName: string, priceMonthly: number, next_charge_at: Date): string {
	const nextDateStr = formatIstDate(next_charge_at);
	return `<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; max-width: 560px; margin: 0 auto; padding: 24px;">
<h2>Subscription renewed</h2>
<p>Hi,</p>
<p>Your DigitalDSA <strong>${escapeHtml(planName)}</strong> subscription has been renewed.</p>
<table style="border-collapse: collapse; margin: 16px 0;">
  <tr><td style="padding: 4px 12px 4px 0;">Amount charged</td><td style="padding: 4px 0;"><strong>₹${priceMonthly}</strong></td></tr>
  <tr><td style="padding: 4px 12px 4px 0;">Next charge</td><td style="padding: 4px 0;">${escapeHtml(nextDateStr)}</td></tr>
</table>
<p>You can manage your subscription anytime from your DigitalDSA dashboard.</p>
<p style="color: #666; font-size: 12px;">If you didn't expect this charge, contact support immediately.</p>
</body></html>`;
}

function buildConfirmationEmailText(planName: string, priceMonthly: number, next_charge_at: Date): string {
	const nextDateStr = formatIstDate(next_charge_at);
	return `Subscription renewed\n\nHi,\n\nYour DigitalDSA ${planName} subscription has been renewed.\n\nAmount charged: ₹${priceMonthly}\nNext charge: ${nextDateStr}\n\nYou can manage your subscription anytime from your DigitalDSA dashboard.\n\nIf you didn't expect this charge, contact support immediately.`;
}

function formatCycleDescription(cycle_anchor: Date): string {
	const istOffsetMs = 5.5 * 60 * 60 * 1000;
	const shifted = new Date(cycle_anchor.getTime() + istOffsetMs);
	const month = shifted.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' });
	const year = shifted.getUTCFullYear();
	return `${month} ${year} cycle`;
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
