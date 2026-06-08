/**
 * D.1 Recurring Billing — Dunning escalation engine (S5)
 * ══════════════════════════════════════════════════════════════════
 * Pure day-N math for the dunning state machine. The cron at
 * `/api/cron/billing-dunning-advance` (M2) wraps this with the
 * subscription read + applyTransition + email + audit-log calls.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S5
 *
 * Day-N rule (literal from spec):
 *   N = floor((now - first_failure_at) / 24h)
 *
 * The spec says "evaluated in IST" — but because the formula is
 * elapsed-milliseconds-÷-24h (not calendar-day differences), the
 * answer is identical regardless of timezone. IST has no DST and a
 * fixed +5:30 offset, so any clock arithmetic over 24h boundaries is
 * timezone-invariant. (Verified by the boundary tests below.)
 *
 * `first_failure_at` = `subscription.dunning_started_at` per the
 * state-machine side-effects in `subscriptionState.ts` (set on the
 * initial `* → dunning_t0` transition, cleared only on recovery to
 * active).
 *
 * Thresholds (spec §4 S5):
 *   dunning_t0     + 3 days → dunning_grace
 *   dunning_grace  + 7 days → dunning_final
 *   dunning_final  + 8 days → downgraded
 *
 * (All thresholds count from `dunning_started_at`, NOT from the most
 * recent transition. dunning_started_at survives retries within dunning;
 * the day-N math is anchored to the *original* failure moment.)
 *
 * ══════════════════════════════════════════════════════════════════
 */

import type {
	BillingSubscriptionDoc,
	SubscriptionState
} from '$lib/types/billingSubscription';
import { BillingSubscriptions } from '$lib/database/mongo';
import { applyTransition } from './subscriptionStore';
import { writeBillingAuditLog } from './billingAuditLog';
import logger from '$lib/server/logger';

/** States the dunning-advance engine acts on. Everything else is a no-op. */
export type DunningSourceState = 'dunning_t0' | 'dunning_grace' | 'dunning_final';

/** States the engine can transition to. */
export type DunningTargetState = 'dunning_grace' | 'dunning_final' | 'downgraded';

/** Email kinds wired to each escalation step. Keyed off target state. */
export type DunningEmailKind = 'dunning_grace' | 'dunning_final' | 'downgraded';

/**
 * Result of evaluating a subscription against the current `now`.
 * `null` means "no advancement due yet" — the cron leaves the row alone.
 */
export interface DunningAdvancement {
	nextState: DunningTargetState;
	emailKind: DunningEmailKind;
	/** Days elapsed since `dunning_started_at`, included for audit-log payloads. */
	daysSinceFailure: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Days elapsed from `dunningStartedAt` to `now` per the spec's literal
 * formula. Returns a non-negative integer.
 *
 * Defensive zero-floor: if `now < dunningStartedAt` (clock skew, manual
 * back-dating, test fixture), return 0 rather than negative — keeps the
 * advancement check safe under unexpected inputs.
 */
export function daysSinceFirstFailure(dunningStartedAt: Date, now: Date): number {
	const diffMs = now.getTime() - dunningStartedAt.getTime();
	if (diffMs <= 0) return 0;
	return Math.floor(diffMs / MS_PER_DAY);
}

/**
 * Per-state threshold lookup. Exposed so the cron's audit-log payload
 * can record `{state, threshold, daysSinceFailure}` consistently and so
 * tests can pin the contract by name rather than magic numbers.
 */
export const DUNNING_ADVANCE_THRESHOLDS: Readonly<Record<DunningSourceState, number>> = {
	dunning_t0: 3,
	dunning_grace: 7,
	dunning_final: 8
};

/**
 * Per-source target lookup — same shape, same purpose as thresholds.
 * Keeps `computeDunningAdvancement` table-driven rather than three
 * parallel `if` blocks.
 */
export const DUNNING_ADVANCE_TARGETS: Readonly<Record<DunningSourceState, DunningTargetState>> = {
	dunning_t0: 'dunning_grace',
	dunning_grace: 'dunning_final',
	dunning_final: 'downgraded'
};

/**
 * Decide whether a subscription in `state` (must be a dunning_* state)
 * has crossed its day-N threshold and should escalate. Returns the
 * target state + email kind, or `null` if no advancement is due.
 *
 * Pure function: no I/O, no clock-reads — `now` is injected by the cron
 * for testability + accelerated-clock smoke runs.
 *
 * Pre-condition: caller has already filtered to dunning_* states. If a
 * non-dunning state slips through, returns `null` (defensive — same
 * effect as "no advancement", lets the cron skip silently rather than
 * throwing on data drift).
 */
export function computeDunningAdvancement(
	state: SubscriptionState,
	dunningStartedAt: Date | undefined,
	now: Date
): DunningAdvancement | null {
	if (state !== 'dunning_t0' && state !== 'dunning_grace' && state !== 'dunning_final') {
		return null;
	}
	// dunning_started_at MUST be set for any dunning_* state per the
	// subscriptionState.ts side-effect on entering dunning_t0. Missing it
	// is a data-integrity issue, not an escalation event — let the cron
	// log + skip rather than escalate with a bogus daysSince=Infinity.
	if (!dunningStartedAt) return null;

	const daysSinceFailure = daysSinceFirstFailure(dunningStartedAt, now);
	const threshold = DUNNING_ADVANCE_THRESHOLDS[state];
	if (daysSinceFailure < threshold) return null;

	const nextState = DUNNING_ADVANCE_TARGETS[state];
	return {
		nextState,
		emailKind: nextState,
		daysSinceFailure
	};
}

// ──────────────────────────────────────────────────────────────────
// Batch driver — wraps the pure helpers with Mongo + transition + email
// ──────────────────────────────────────────────────────────────────

/** Default batch cap for the dunning cron — same conservative size as charge cron. */
export const DEFAULT_DUNNING_BATCH_SIZE = 50;

/** Outcome of advancing one subscription. */
export type DunningAdvanceOutcome =
	| { kind: 'advanced'; dsa_id: string; from: DunningSourceState; to: DunningTargetState; daysSinceFailure: number }
	| { kind: 'no_advancement_due'; dsa_id: string; state: SubscriptionState }
	| { kind: 'skipped_paused'; dsa_id: string }
	| { kind: 'skipped_missing_dunning_started_at'; dsa_id: string }
	| { kind: 'transition_race'; dsa_id: string; expected: SubscriptionState }
	| { kind: 'error'; dsa_id: string; message: string };

export interface DunningBatchOutcome {
	total: number;
	advanced: number;
	no_advancement_due: number;
	skipped: number;
	errors: number;
	outcomes: DunningAdvanceOutcome[];
}

export interface ProcessDunningOptions {
	batchSize?: number;
	now?: Date;
	/**
	 * Email-send hook. M3 plugs the real `sendDunningEmail` here; M2 leaves
	 * it injectable so the cron can be unit-tested without a live mailer.
	 * Called AFTER applyTransition succeeds — failures inside the hook are
	 * logged + counted but do not roll back the state transition (an email
	 * we couldn't send is recoverable; a missed state advance is not).
	 */
	sendEmail?: (
		kind: DunningEmailKind,
		sub: BillingSubscriptionDoc
	) => Promise<void>;
}

/**
 * Find subscriptions eligible for dunning advancement evaluation.
 * Filter is INTENTIONALLY broader than chargeEngine's `findEligibleSubscriptions`:
 * dunning-advance does not care about `next_charge_at` (it advances based on
 * day-counting from `dunning_started_at`), nor does it require a live mandate
 * token (a sub with revoked mandate still walks to downgraded — the user just
 * never gets retried).
 *
 * Paused subscriptions are excluded by the state filter (paused is its own
 * state, not a dunning_* state). Per spec: "While paused, dunning-advance cron
 * skips the row (no day-counting)."
 */
export async function findEligibleDunningSubscriptions(
	limit: number
): Promise<BillingSubscriptionDoc[]> {
	return await BillingSubscriptions.find({
		state: { $in: ['dunning_t0', 'dunning_grace', 'dunning_final'] }
	})
		.limit(limit)
		.toArray();
}

/**
 * Process a single dunning subscription: compute advancement, apply the
 * state transition atomically, fire the email hook, write the audit log.
 *
 * Exported for fine-grained tests + smoke runbook driver. The cron path
 * goes through `processDunningAdvanceBatch` which loops over this.
 */
export async function processOneDunningAdvance(
	sub: BillingSubscriptionDoc,
	options: ProcessDunningOptions
): Promise<DunningAdvanceOutcome> {
	const now = options.now ?? new Date();
	const dsaIdStr = String(sub.dsa_id);

	// Defensive: a paused sub should be filtered by the query, but if the
	// caller invoked this directly (or a race left the doc paused between
	// query + process), skip without touching state.
	if (sub.state === 'paused') {
		return { kind: 'skipped_paused', dsa_id: dsaIdStr };
	}

	const advancement = computeDunningAdvancement(sub.state, sub.dunning_started_at, now);

	if (!advancement) {
		if (!sub.dunning_started_at) {
			// dunning_* state without dunning_started_at = data drift.
			// Log loudly so operators notice; do not auto-repair.
			logger.error(
				{ dsa_id: dsaIdStr, state: sub.state },
				'dunning-advance: subscription in dunning state but dunning_started_at is missing — data integrity issue'
			);
			return { kind: 'skipped_missing_dunning_started_at', dsa_id: dsaIdStr };
		}
		return { kind: 'no_advancement_due', dsa_id: dsaIdStr, state: sub.state };
	}

	// Atomic transition with state precondition. If another caller (a webhook,
	// the retry-now endpoint, or a parallel cron region) already moved this
	// subscription out from under us, the precondition fails and we no-op.
	const updated = await applyTransition(
		sub.dsa_id,
		sub.state,
		advancement.nextState,
		`Dunning escalation (day ${advancement.daysSinceFailure})`,
		{},
		{
			source: 'dunning-advance-cron',
			daysSinceFailure: advancement.daysSinceFailure,
			from: sub.state,
			to: advancement.nextState,
			threshold: DUNNING_ADVANCE_THRESHOLDS[sub.state as DunningSourceState]
		}
	);

	if (!updated) {
		// Lost the precondition race — another writer beat us. Not an error.
		return { kind: 'transition_race', dsa_id: dsaIdStr, expected: sub.state };
	}

	// Email AFTER the transition lands. A failure inside the email hook is
	// recoverable (operator can re-send) but a rolled-back transition would
	// leave us stuck. Catch + log + count.
	if (options.sendEmail) {
		try {
			await options.sendEmail(advancement.emailKind, updated);
		} catch (err) {
			logger.error(
				{ dsa_id: dsaIdStr, emailKind: advancement.emailKind, err: (err as Error)?.message },
				'dunning-advance: email send failed (state transition succeeded; recoverable)'
			);
		}
	}

	// Audit row for this transition. The state-history entry on the
	// subscription doc captures the same fact but BillingAuditLogs is the
	// long-retention (6yr) trail and is what the operator dashboards query.
	await writeBillingAuditLog({
		event_class: 'subscription_transition',
		event_name: `${sub.state}->${advancement.nextState}`,
		subscription_id: updated._id,
		dsa_id: updated.dsa_id,
		actor: 'cron',
		payload: {
			source: 'dunning-advance-cron',
			daysSinceFailure: advancement.daysSinceFailure,
			threshold: DUNNING_ADVANCE_THRESHOLDS[sub.state as DunningSourceState],
			from: sub.state,
			to: advancement.nextState
		}
	});

	return {
		kind: 'advanced',
		dsa_id: dsaIdStr,
		from: sub.state as DunningSourceState,
		to: advancement.nextState,
		daysSinceFailure: advancement.daysSinceFailure
	};
}

/**
 * Cron entry point: find eligible subscriptions, advance each by one step
 * if its day-N threshold has been crossed, return aggregate counts.
 *
 * Sequential within the batch (same as chargeEngine — concurrency tuning
 * is deferred until v1 volume warrants it).
 */
export async function processDunningAdvanceBatch(
	options: ProcessDunningOptions = {}
): Promise<DunningBatchOutcome> {
	const now = options.now ?? new Date();
	const batchSize = options.batchSize ?? DEFAULT_DUNNING_BATCH_SIZE;
	const subs = await findEligibleDunningSubscriptions(batchSize);

	logger.info(
		{ now, batchSize, found: subs.length },
		'dunning-advance: processing batch'
	);

	const outcomes: DunningAdvanceOutcome[] = [];
	let advanced = 0;
	let no_advancement_due = 0;
	let skipped = 0;
	let errors = 0;

	for (const sub of subs) {
		try {
			const outcome = await processOneDunningAdvance(sub, { ...options, now });
			outcomes.push(outcome);
			switch (outcome.kind) {
				case 'advanced':
					advanced++;
					break;
				case 'no_advancement_due':
					no_advancement_due++;
					break;
				case 'skipped_paused':
				case 'skipped_missing_dunning_started_at':
				case 'transition_race':
					skipped++;
					break;
				case 'error':
					errors++;
					break;
			}
		} catch (err) {
			// Per-subscription failure must NOT abort the batch — log + count + continue.
			const message = (err as Error)?.message ?? String(err);
			logger.error(
				{ dsa_id: String(sub.dsa_id), err: message },
				'dunning-advance: per-subscription error'
			);
			outcomes.push({ kind: 'error', dsa_id: String(sub.dsa_id), message });
			errors++;
		}
	}

	await writeBillingAuditLog({
		event_class: 'cron_run',
		event_name: 'billing-dunning-advance',
		actor: 'cron',
		payload: {
			now,
			batchSize,
			total: subs.length,
			advanced,
			no_advancement_due,
			skipped,
			errors
		}
	});

	return {
		total: subs.length,
		advanced,
		no_advancement_due,
		skipped,
		errors,
		outcomes
	};
}

