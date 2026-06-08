/**
 * GET /api/billing/subscription/status
 * ══════════════════════════════════════════════════════════════════
 * Polling endpoint for the subscribe modal's return-from-auth UX.
 * Client polls this for up to 60s after redirecting back from
 * Razorpay's hosted authorization page, waiting for the webhook
 * to advance state pending_mandate → active.
 *
 * Returns: current subscription state + key user-visible fields.
 * Sensitive fields (mandate_token, provider customer id) are NEVER
 * surfaced to the client.
 *
 * Auth: DSA-only (own subscription only).
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S2 (status polling)
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { ObjectId } from 'mongodb';
import { apiOk, apiError, apiStructuredError } from '$lib/server/apiResponse';
import { requireRoleApi } from '$lib/server/guards';
import { rateLimit } from '$lib/server/rateLimiter';
import { findByDsaId } from '$lib/server/billing/subscriptionStore';
import { checkTrialEligibility } from '$lib/server/billing/trialEligibility';
import { PLANS } from '$lib/config/billing';
import { DsaApplications } from '$lib/database/mongo';
import logger from '$lib/server/logger';
import { dev } from '$app/environment';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;

	const userId = locals.user!.id;

	// Rate limit: generous ceiling because the subscribe-return flow
	// polls this endpoint at 2s intervals for up to 60s (≈30 hits).
	// 60 req / 60s covers that polling burst with headroom.
	const isLimited = await rateLimit(userId, {
		identifier: `billing-status:${userId}`,
		maxRequests: 60,
		windowMs: 60_000
	});
	if (isLimited) return apiError('Too many requests. Please wait a moment.', 429);
	const dsaObjectId = new ObjectId(userId);

	// Identity check — production blocks non-DSA identities so the billing
	// UI surfaces the mismatch cleanly instead of silently returning
	// 'not_subscribed' (which would render the Subscribe button → 403 on
	// click). Dev bypasses the block: admin testers proceed through the
	// normal subscribe/manage flow against their own _id, which is fine in
	// a dev DB and matches the dev-bypass in /api/billing/subscribe-recurring.
	// Admin impersonation passes the check in BOTH environments because
	// locals.user.id is the target DSA's _id during impersonation.
	const dsaExists = await DsaApplications.findOne(
		{ _id: dsaObjectId },
		{ projection: { _id: 1 } }
	);
	if (!dsaExists && !dev) {
		logger.warn(
			{
				jwt_user_id: userId,
				user_role: locals.user!.role,
				active_role: locals.user!.activeRole
			},
			'billing-subscription-status: JWT user is not a DSA (production block)'
		);
		return apiStructuredError(
			"You're signed in under a non-DSA identity. Sign out and log in as a DSA to manage auto-pay.",
			{ code: 'USER_NOT_DSA' },
			403
		);
	}

	const doc = await findByDsaId(dsaObjectId);

	if (!doc) {
		// Never subscribed. Check trial eligibility so the Subscribe section
		// can show the right CTA without an extra round-trip.
		const eligibility = await checkTrialEligibility(dsaObjectId);
		return apiOk({
			state: 'not_subscribed' as const,
			plan_id: null,
			next_charge_at: null,
			anchor_day: null,
			trial_eligible: eligibility.eligible,
			trial_ineligible_reason: eligibility.eligible ? null : eligibility.reason ?? 'prior_trial'
		});
	}

	// Project safe fields only — NEVER leak mandate_token or
	// provider_customer_id to the client.
	const pendingDowngradePlanName = doc.pending_downgrade_to
		? PLANS[doc.pending_downgrade_to]?.name ?? null
		: null;

	// Trial countdown for the Manage panel's "Trial — ends in N days" banner.
	// Only meaningful while is_trial is set AND trial_until is in the future.
	// On the trial-end charge success, chargeEngine clears both fields so
	// this falls through to false / null cleanly.
	const trialActive = doc.is_trial === true && !!doc.trial_until && doc.trial_until > new Date();
	const trialDaysRemaining = trialActive
		? Math.max(0, Math.ceil((doc.trial_until!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
		: null;

	// Re-subscribe eligibility — only meaningful for terminal-state subs.
	// Drives the UI when someone who cancelled or downgraded returns: can
	// they get a fresh trial? (Per the abuse defense, no — they consumed
	// it the first time.) Skip the check for live subs (active/paused/
	// dunning/pending) since it's irrelevant there.
	let trialEligible = false;
	let trialIneligibleReason: string | null = null;
	if (doc.state === 'cancelled' || doc.state === 'downgraded' || doc.state === 'not_subscribed') {
		const eligibility = await checkTrialEligibility(dsaObjectId);
		trialEligible = eligibility.eligible;
		trialIneligibleReason = eligibility.eligible ? null : eligibility.reason ?? 'prior_trial';
	}

	return apiOk({
		state: doc.state,
		plan_id: doc.plan_id,
		plan_name: doc.plan_id ? PLANS[doc.plan_id]?.name ?? null : null,
		anchor_day: doc.anchor_day ?? null,
		next_charge_at: doc.next_charge_at?.toISOString() ?? null,
		paused_from_state: doc.paused_from_state ?? null,
		dunning_started_at: doc.dunning_started_at?.toISOString() ?? null,
		failed_attempt_count: doc.failed_attempt_count,
		// S6 — Manage panel display fields. Plan management state:
		cancel_at_cycle_end: doc.cancel_at_cycle_end ?? false,
		pending_downgrade_to: doc.pending_downgrade_to ?? null,
		pending_downgrade_to_plan_name: pendingDowngradePlanName,
		// Mandate display — token itself NEVER surfaced, only the cap (which
		// drives the UI's "cap allows upgrade to X" check):
		max_amount_paise: doc.max_amount_paise,
		mandate_present: !!doc.mandate_token,
		// Replacement-in-flight (M3 advisory lock window):
		pending_replacement_in_flight:
			!!doc.pending_replacement_registration_id &&
			!!doc.pending_replacement_expires_at &&
			doc.pending_replacement_expires_at > new Date(),
		pending_replacement_expires_at: doc.pending_replacement_expires_at?.toISOString() ?? null,
		// Trial fields (2026-05-28 free-trial feature):
		is_trial: trialActive,
		trial_until: doc.trial_until?.toISOString() ?? null,
		trial_days_remaining: trialDaysRemaining,
		// For terminal-state DSAs returning: can they get a new trial?
		trial_eligible: trialEligible,
		trial_ineligible_reason: trialIneligibleReason,
		// Last 3 history entries — for in-app status timeline if needed
		recent_history: doc.state_history.slice(-3).map((h) => ({
			from: h.from,
			to: h.to,
			at: h.at.toISOString(),
			reason: h.reason
		}))
	});
};
