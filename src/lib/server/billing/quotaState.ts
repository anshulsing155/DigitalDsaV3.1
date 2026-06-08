/**
 * QBC — Quota state resolver for dashboard UIs
 * ══════════════════════════════════════════════════════════════════════
 * Computes a DSA's quota state (active count, blocked count, buffer
 * remaining, exhausted flag) in one indexed query pair. Consumed by:
 *
 *   - /dashboard/dsa/cases/+page.server.ts — gates the "New Case" button
 *   - /dashboard/dsa/cases/[case_id]/+layout.server.ts — gates the
 *     "Edit form" button (metadata edits stay enabled)
 *   - Future: any other UI that surfaces quota-state info to the DSA
 *
 * Single helper rather than inlining the logic at each consumer so the
 * exhaustion rule stays consistent across surfaces. The case-limit gate
 * inside /api/evaluate-and-persist re-runs the same checks at the moment
 * of submit — this helper drives the UI gating; the API is the
 * authoritative enforcement.
 *
 * Spec: docs/specs/QUOTA-BLOCKED-CASES-SPEC.md §7
 */

import { ObjectId } from 'mongodb';
import { Cases } from '$lib/database/mongo';
import { PLANS, recommendPlan, type PlanId } from '$lib/config/billing';
import { resolveActivePlanId } from '$lib/server/billing/planResolver';

/**
 * Compute the previous monthly anchor date for a given next-anchor.
 *
 * Real monthly billing cycles stay anchored on a stable day-of-month —
 * Jan 31 → Feb 28 → Mar 31 → Apr 30 — which is NOT 30 calendar days apart.
 * Naive `next.getTime() - 30 * 24 * 60 * 60 * 1000` drifts by 1-2 days at
 * months boundaries (off-by-one on May/Jul/Oct/Dec; off-by-two when Feb is
 * in play). Visible to every DSA on every page load via the sidebar pill,
 * so we use calendar arithmetic instead.
 *
 * Day-overflow handling: Jan 31 minus one month is Dec 31 (no issue), but
 * Mar 31 minus one month would land at Feb 31 — JS normalizes that to
 * Mar 3 (wrong). We snap the day to `min(original, lastDayOfPrevMonth)`
 * so Mar 31 → Feb 28 (or Feb 29 in leap years), matching what the
 * billing provider's anchor cap would have computed at the prior cycle.
 *
 * All math in UTC to avoid DST + locale surprises — billing anchors are
 * stored as UTC Date objects (Razorpay subscriptions, our chargeEngine).
 *
 * Review finding M-N2, 2026-05-30.
 */
export function previousMonthlyAnchor(next: Date): Date {
	// Step 1: shift to day-1 of the current month so the subsequent
	// setUTCMonth(-1) can't normalize a non-existent day (Feb 31) forward.
	const d = new Date(next.getTime());
	d.setUTCDate(1);
	d.setUTCMonth(d.getUTCMonth() - 1);
	// Step 2: restore the original day, capped at the previous month's
	// last day. `Date.UTC(year, month+1, 0)` gives the LAST day of `month`.
	const lastDayOfPrevMonth = new Date(
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
	).getUTCDate();
	d.setUTCDate(Math.min(next.getUTCDate(), lastDayOfPrevMonth));
	return d;
}

export interface QuotaState {
	planId: PlanId;
	planName: string;
	caseLimit: number;
	saveBuffer: number;
	activeCount: number;
	blockedCount: number;
	bufferRemaining: number;
	isExhausted: boolean;
	isBufferFull: boolean;
	/** True when the DSA can't start a new case OR edit an existing form (re-eval would also be blocked). */
	newCaseDisabled: boolean;
	/** True when the "Edit form" action on existing cases should be disabled. Same as `newCaseDisabled` — re-eval burns compute. */
	editFormDisabled: boolean;
	/** Recommended plan to upgrade to if exhausted. Same plan if Enterprise (already top). */
	recommendedPlan: PlanId;
	recommendedPlanName: string;
	recommendedPlanLimit: number | null;
	/** ISO string of the DSA's next billing anchor (when cycle resets the quota). Undefined for new subscribers. */
	nextCycleAt?: string;
	/**
	 * ISO string of when the CURRENT billing cycle started. Derived as
	 * `next_charge_at - 30 days` (annual billing was removed 2026-05-29 per
	 * ADR / DEVELOPMENT-PLAN — monthly only). Undefined when nextCycleAt is
	 * undefined. Used by the sidebar quota block to render "5 May 26 - 4 Jun 26".
	 */
	cycleStartAt?: string;
}

/**
 * Compute the DSA's current quota state.
 *
 * Two `countDocuments` queries (indexed by `dsa_id`) — typical p95 well
 * under 50ms. Safe to call from any page-server load.
 *
 * Returns a "free tier" shape when the DSA has no active subscription:
 * Basic plan's caseLimit + saveBuffer, but exhaustion math still runs
 * (so a DSA without a sub who has somehow created cases via dev mode
 * sees the right gating).
 */
export async function getQuotaState(dsaId: ObjectId | string): Promise<QuotaState> {
	const id = typeof dsaId === 'string' ? new ObjectId(dsaId) : dsaId;
	const activePlan = await resolveActivePlanId(id);
	const planId: PlanId = activePlan?.plan_id ?? 'basic';
	const plan = PLANS[planId];

	// Parallel count queries — same filters as the API gate
	// (evaluate-and-persist §5b).
	const [activeCount, blockedCount] = await Promise.all([
		Cases.countDocuments({
			dsa_id: id,
			is_archived: { $ne: true },
			stage: { $ne: 'quota_blocked' }
		}),
		Cases.countDocuments({
			dsa_id: id,
			stage: 'quota_blocked'
		})
	]);

	const isExhausted = plan.caseLimit !== Infinity && activeCount >= plan.caseLimit;
	const bufferRemaining = Math.max(0, plan.saveBuffer - blockedCount);
	const isBufferFull = plan.saveBuffer > 0 && blockedCount >= plan.saveBuffer;

	// New Case + Edit form are both disabled at exhaustion. Edit form
	// re-evaluates → burns compute that the DSA's plan doesn't cover.
	// Metadata edits (notes, stage, lender selections) stay enabled.
	const newCaseDisabled = isExhausted;
	const editFormDisabled = isExhausted;

	const recommended = recommendPlan(activeCount + 1);
	const recommendedLimit =
		PLANS[recommended].caseLimit === Infinity ? null : PLANS[recommended].caseLimit;

	return {
		planId,
		planName: plan.name,
		caseLimit: plan.caseLimit,
		saveBuffer: plan.saveBuffer,
		activeCount,
		blockedCount,
		bufferRemaining,
		isExhausted,
		isBufferFull,
		newCaseDisabled,
		editFormDisabled,
		recommendedPlan: recommended,
		recommendedPlanName: PLANS[recommended].name,
		recommendedPlanLimit: recommendedLimit,
		...(activePlan?.next_charge_at && {
			nextCycleAt: activePlan.next_charge_at.toISOString(),
			// Monthly-only billing (annual was removed 2026-05-29). Derive the
			// current cycle start as the calendar-month prior anchor — see
			// previousMonthlyAnchor above for the day-overflow semantics.
			// Drives the sidebar "5 May 26 - 4 Jun 26" range display.
			cycleStartAt: previousMonthlyAnchor(activePlan.next_charge_at).toISOString()
		})
	};
}
