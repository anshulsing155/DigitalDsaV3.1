/**
 * QBC — Auto-unblock helper for quota-blocked cases
 * ══════════════════════════════════════════════════════════════════════
 * Fired by two triggers:
 *
 *   1. Plan upgrade (S2) — after change-plan flips plan_id to a higher
 *      tier, the new caseLimit creates fresh capacity. Pull blocked cases
 *      FIFO until the new quota is saturated. Each pulled case transitions
 *      stage 'quota_blocked' -> 'intake' and gets a scheduled offer
 *      computation (the cron in S3 picks them up and runs the rule engine).
 *
 *   2. Monthly cycle reset (S3) — at the billing anchor, the DSA's
 *      activeCount effectively resets (last cycle's cases stay but the
 *      DSA gets a fresh "month's worth" of new capacity). Same FIFO
 *      pull logic applies.
 *
 * Atomicity: each transition uses findOneAndUpdate with a conditional
 * filter on `stage='quota_blocked'`. A concurrent unblock (e.g., two
 * cron firings on the same DSA) cannot double-process the same case
 * — whichever ran first wins, the loser's filter doesn't match.
 *
 * Notification: a DSA email is sent after the batch transitions, with a
 * count + list of unblocked case IDs. Template chosen by `reason`:
 *   - 'upgrade' → "Your saved cases are processing — upgrade thanks you"
 *   - 'cycle_reset' → "Your new cycle started, saved cases are processing"
 *
 * Spec: docs/specs/QUOTA-BLOCKED-CASES-SPEC.md §6.
 */

import type { ObjectId } from 'mongodb';
import { Cases } from '$lib/database/mongo';
import { PLANS, type PlanId } from '$lib/config/billing';
import logger from '$lib/server/logger';
import { recomputeOffersForUnblockedCase } from './recomputeOffersForUnblockedCase';
import { resolveDsaEmailRecipient, sendAutoUnblockEmail } from './quotaBlockedEmails';

export type UnblockReason = 'upgrade' | 'cycle_reset';

export interface UnblockResult {
	/** Number of quota_blocked cases auto-transitioned to 'intake'. */
	unblockedCount: number;
	/** case_id strings of the cases that were unblocked, FIFO order (oldest first). */
	unblockedCaseIds: string[];
	/** Capacity that was available BEFORE the batch (caseLimit - activeCount). May be Infinity for Enterprise. */
	capacityAvailable: number;
	/** Total blocked cases the DSA had before the batch. */
	blockedBefore: number;
	/** Reason this batch fired (drives the notification template). */
	reason: UnblockReason;
}

/**
 * Process the DSA's quota-blocked cases FIFO until the new plan's quota
 * is saturated. Returns a summary of what was unblocked (caller sends
 * the DSA notification email with the count + list).
 *
 * Caller should invoke this AFTER the plan_id flip is durable
 * (post-upgrade) or after the cycle anchor advances (cron). If the
 * caller invokes it pre-flip, the helper reads the OLD plan's caseLimit
 * and may under-unblock — invariant: pass the EFFECTIVE plan_id at
 * call-time.
 *
 * Telemetry (OQ-3): logs an `app.quota_blocked.auto_unblock` event with
 * the batch count + reason. Promoting to a full OTel span is a follow-up
 * once a counter dashboard is built.
 */
export async function processBlockedCasesAfter(
	dsaId: ObjectId,
	effectivePlanId: PlanId,
	reason: UnblockReason
): Promise<UnblockResult> {
	const { caseLimit } = PLANS[effectivePlanId];

	// 1. Count current ACTIVE (non-blocked, non-archived) cases.
	const activeCount = await Cases.countDocuments({
		dsa_id: dsaId,
		is_archived: { $ne: true },
		stage: { $ne: 'quota_blocked' }
	});

	// 2. Compute capacity. Infinity (Enterprise) → unblock everything.
	const capacity =
		caseLimit === Infinity ? Infinity : Math.max(0, caseLimit - activeCount);

	// 3. Count total blocked cases for the result summary.
	const blockedBefore = await Cases.countDocuments({
		dsa_id: dsaId,
		stage: 'quota_blocked'
	});

	if (capacity === 0 || blockedBefore === 0) {
		// No work to do — log + return a zero-count result. Caller can
		// skip notifications.
		logger.info(
			{ dsaId, effectivePlanId, reason, capacity, blockedBefore },
			'[QBC] No blocked cases to unblock (capacity=0 or blocked=0)'
		);
		return {
			unblockedCount: 0,
			unblockedCaseIds: [],
			capacityAvailable: capacity,
			blockedBefore,
			reason
		};
	}

	// 4. Fetch blocked cases FIFO (oldest first) up to capacity.
	const fetchLimit = capacity === Infinity ? blockedBefore : capacity;
	const blockedCases = await Cases.find(
		{ dsa_id: dsaId, stage: 'quota_blocked' },
		{
			sort: { created_at: 1 }, // FIFO: oldest first
			limit: fetchLimit,
			projection: { case_id: 1, loan: 1 }
		}
	).toArray();

	// 5. For each case: atomic stage transition + INLINE offer computation.
	//    Per case: conditional update on `stage='quota_blocked'` so a
	//    concurrent unblock (rare) doesn't double-process the same row.
	//    After the transition lands, run the rule engine and persist the
	//    LenderResultsSnapshot — best-effort so a single eval failure
	//    doesn't dead-end the batch. Failed cases stay at stage='intake'
	//    without offers; DSA's "Edit form" path re-runs the normal flow.
	const now = new Date();
	const unblockedCaseIds: string[] = [];
	for (const c of blockedCases) {
		const transitionResult = await Cases.findOneAndUpdate(
			{ case_id: c.case_id, stage: 'quota_blocked' },
			{
				$set: {
					stage: 'intake',
					unblocked_at: now,
					updated_at: now
				},
				$push: {
					stage_history: {
						from: 'quota_blocked',
						to: 'intake',
						timestamp: now,
						notes: `Auto-unblocked by ${reason} (QBC §6)`
					}
				}
			},
			{ returnDocument: 'after', projection: { case_id: 1 } }
		);
		if (!transitionResult?.case_id) {
			// Lost the race against a concurrent unblock — skip this case.
			continue;
		}
		unblockedCaseIds.push(transitionResult.case_id);

		// Inline offer computation. Best-effort: catches all errors and
		// logs them per-case so the batch keeps moving on a single failure.
		try {
			const recompute = await recomputeOffersForUnblockedCase(
				c.case_id,
				dsaId,
				c.loan?.type ?? ''
			);
			if (recompute.status !== 'success') {
				logger.warn(
					{ case_id: c.case_id, status: recompute.status, error: recompute.error },
					'[QBC] Inline offer recompute failed — case stays at intake without offers'
				);
			}
		} catch (err) {
			logger.warn(
				{ case_id: c.case_id, err: (err as Error).message },
				'[QBC] Inline offer recompute threw — case stays at intake without offers'
			);
		}
	}

	// 6. Telemetry signal — emits as a structured log event for now;
	//    promotable to an OTel span when the dashboards land.
	logger.info(
		{
			event: 'quota_blocked.auto_unblock',
			dsa_id: dsaId,
			effective_plan_id: effectivePlanId,
			unblocked_count: unblockedCaseIds.length,
			capacity_available: capacity === Infinity ? -1 : capacity,
			blocked_before: blockedBefore,
			reason
		},
		'[QBC] Auto-unblock batch complete'
	);

	// 7. DSA notification — one email per batch (regardless of case count).
	//    Best-effort: email failure cannot roll back the stage transitions
	//    above. Skipped when nothing actually moved.
	if (unblockedCaseIds.length > 0) {
		try {
			const recipient = await resolveDsaEmailRecipient(dsaId);
			if (recipient) {
				const emailResult = await sendAutoUnblockEmail({
					recipient,
					planName: PLANS[effectivePlanId].name,
					unblockedCount: unblockedCaseIds.length,
					reason
				});
				if (!emailResult.success) {
					logger.warn(
						{ dsa_id: String(dsaId), reason, error: emailResult.error },
						'[QBC] Auto-unblock email dispatch returned failure'
					);
				}
			}
		} catch (mailErr) {
			logger.warn(
				{ dsa_id: String(dsaId), reason, err: (mailErr as Error).message },
				'[QBC] Auto-unblock email threw — stage transitions already committed'
			);
		}
	}

	return {
		unblockedCount: unblockedCaseIds.length,
		unblockedCaseIds,
		capacityAvailable: capacity,
		blockedBefore,
		reason
	};
}
