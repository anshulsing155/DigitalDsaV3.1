/**
 * D.1 — Active plan resolver (replaces legacy DsaApplications.subscription reads)
 * ══════════════════════════════════════════════════════════════════════
 * Single source of truth for "which paid plan does this DSA currently have?"
 *
 * BEFORE D.1 the answer lived on `DsaApplications.subscription.tier` (a
 * one-time-payment field set by the legacy /api/billing/subscribe endpoint).
 * After D.1 S2-S7 shipped, every paying user comes through the recurring-
 * mandate flow, which writes a BillingSubscriptions row. S8 was supposed to
 * migrate the legacy cohort — but owner confirmed there's no real legacy
 * cohort (2026-05-28), so we wipe the legacy field and route every plan
 * read through this helper instead.
 *
 * "Active" set per spec §3.2 — a DSA still has access while in:
 *   - active                — fully paid
 *   - paused                — DSA-initiated pause, may resume
 *   - dunning_t0/grace/final — charge failed, in retry/escalation window
 *
 * NOT active:
 *   - not_subscribed / pending_mandate — never paid (or mandate never landed)
 *   - downgraded / cancelled           — terminal, no access
 *
 * Callers should default to "free tier" / "minimum case limit" when this
 * returns null. We deliberately don't carry the fallback inside this helper
 * because different consumers want different defaults (10 cases for the
 * case-create gate vs. 'free' tier for DA quota).
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §3.2 + §4 S8 (skipped)
 * ══════════════════════════════════════════════════════════════════════
 */

import { ObjectId, type ObjectId as MObjectId } from 'mongodb';
import { BillingSubscriptions, DsaApplications, AdminUsers } from '$lib/database/mongo';
import type { SubscriptionState } from '$lib/types/billingSubscription';
import type { PlanId } from '$lib/config/billing';
import logger from '$lib/server/logger';

/**
 * Synthetic cycle anchor for admin / is_test DSAs that have no real
 * BillingSubscriptions row. Returns the UTC start (00:00) of the 1st of
 * next calendar month — a stable, meaningful cycle boundary the dashboard
 * sidebar can render as the cycle-end date, and from which
 * `previousMonthlyAnchor()` derives the cycle start.
 *
 * Why calendar-month rather than 30-day rolling: synthetic accounts don't
 * have an anchor day to honor, and DSAs think in calendar months when
 * scanning their quota. Rolling-30 produces awkward "9 Jun 26 – 9 Jul 26"
 * ranges that don't map to mental models of monthly limits.
 *
 * UTC anchor matches how real BillingSubscriptions.next_charge_at is
 * stored (chargeEngine + Razorpay both use UTC).
 */
function startOfNextCalendarMonthUTC(): Date {
	const now = new Date();
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

/**
 * Subscription states that grant the DSA access to paid features.
 * Exported so callers can reuse the membership test in their own queries
 * (e.g., admin dashboards listing "currently-paying DSAs").
 */
export const ACTIVE_PLAN_STATES: ReadonlySet<SubscriptionState> = new Set<SubscriptionState>([
	'active',
	'paused',
	'dunning_t0',
	'dunning_grace',
	'dunning_final'
]);

export interface ActivePlanResolution {
	plan_id: PlanId;
	state: SubscriptionState;
	/**
	 * Pending downgrade target. The DSA still has access to `plan_id`'s features
	 * until the next anchor, when the cron applies the downgrade (§4 S6 M4).
	 * Consumers can ignore this for gating reads — `plan_id` is what they
	 * should honor today.
	 */
	pending_downgrade_to?: PlanId;
	/**
	 * When the DSA's next monthly charge fires (= when the case quota resets).
	 * Used by the quota-blocked-cases save-prompt to surface "your saved case
	 * will process on Dec 15." May be undefined for edge states (subscription
	 * just created, anchor not yet stamped) — consumers should fall back to
	 * generic "on your next billing date" copy when missing.
	 */
	next_charge_at?: Date;
}

/**
 * Returns the DSA's currently-active plan, or null when no active subscription.
 *
 * Reads ONE document (indexed by `dsa_id`) — safe to call per-request.
 * Caller is responsible for caching across multiple reads in the same handler
 * if needed (we deliberately don't cache here to avoid stale data on
 * subscription-state transitions inside the same process).
 *
 * Why a separate helper instead of inlining `findByDsaId` + state check at
 * every consumer: there are at least three of them today (evaluate-and-
 * persist case-limit gate, da-quota, da-topup) and the "is active?" rule
 * needs to stay consistent across all of them as the state machine evolves.
 */
export async function resolveActivePlanId(
	dsa_id: MObjectId | string
): Promise<ActivePlanResolution | null> {
	const id = typeof dsa_id === 'string' ? new ObjectId(dsa_id) : dsa_id;

	// Internal-profile override (admin + is_test DSA) — wrapped in try/catch
	// because resolveActivePlanId is on the hot path of every case-create
	// gate, dashboard quota read, and DA-quota call. A DB hiccup on these
	// two lookups must NEVER throw out of this helper — fall through to the
	// normal subscription lookup instead. The override is a QA quality-of-
	// life convenience, not a correctness gate; losing it for one request
	// during a transient DB blip is strictly better than 500-ing every
	// downstream consumer. The 2026-05-31 production-down incident
	// (resolveActivePlanId reverted as an auth-bisect precaution that
	// turned out innocent) is why the catch exists.
	try {
		const [adminDoc, dsaDoc] = await Promise.all([
			AdminUsers.findOne({ _id: id } as Record<string, unknown>, { projection: { _id: 1 } }),
			DsaApplications.findOne(
				{ _id: id } as Record<string, unknown>,
				{ projection: { is_test: 1 } }
			)
		]);
		const isInternalProfile =
			adminDoc !== null || (dsaDoc as { is_test?: boolean } | null)?.is_test === true;
		if (isInternalProfile) {
			// Synthetic Pro plan for admin / is_test DSAs. There's no real
			// BillingSubscription row, so no genuine next_charge_at exists.
			// We synthesize a calendar-month cycle anchor (the 1st of next
			// month at UTC midnight) so the dashboard sidebar can render a
			// meaningful "Pro Plan · 1 Jun 26 – 30 Jun 26" range and the
			// quota math has a stable cycle boundary to anchor against.
			// Real subscriptions that genuinely lack next_charge_at do NOT
			// get this synthesis — that path falls through to the regular
			// BillingSubscriptions lookup below, where an absent
			// next_charge_at is correctly surfaced as undefined (a billing-
			// setup gap to investigate, not something to mask).
			return {
				plan_id: 'pro',
				state: 'active',
				next_charge_at: startOfNextCalendarMonthUTC()
			};
		}
	} catch (err) {
		logger.warn(
			{ err, dsa_id: id.toString() },
			'[planResolver] internal-profile override lookup failed — falling through to normal subscription resolution'
		);
	}

	const sub = await BillingSubscriptions.findOne(
		{ dsa_id: id },
		{ projection: { state: 1, plan_id: 1, pending_downgrade_to: 1, next_charge_at: 1 } }
	);
	if (!sub) return null;
	if (!ACTIVE_PLAN_STATES.has(sub.state)) return null;

	const result: ActivePlanResolution = {
		plan_id: sub.plan_id,
		state: sub.state
	};
	if (sub.pending_downgrade_to) {
		result.pending_downgrade_to = sub.pending_downgrade_to;
	}
	if (sub.next_charge_at) {
		result.next_charge_at = sub.next_charge_at;
	}
	return result;
}
