/**
 * POST /api/billing/subscription/resume (D.1 S6 §4 S6)
 * ══════════════════════════════════════════════════════════════════
 * Resume a paused subscription back to the state recorded in
 * `paused_from_state`. Per §11.2 #12:
 *
 *   paused → active (if paused from active or paused_from_state unset)
 *          → dunning_t0 / dunning_grace / dunning_final (preserves
 *            dunning clock from before the pause)
 *
 * next_charge_at handling:
 *   - paused → active: set to today (cron picks it up on next tick)
 *   - paused → dunning_*: NOT recomputed here. The dunning-advance
 *     cron uses dunning_started_at directly, not next_charge_at, so
 *     the state-machine fields are sufficient. The charge cron's
 *     S4 retry schedule will fire whenever it next sees the row,
 *     which is correct — resume doesn't bypass the retry sequence.
 *
 * Auth: requireRoleApi('dsa') + CSRF + rate-limit 10/hr/user.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S6
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards';
import { rateLimit } from '$lib/server/rateLimiter';
import logger from '$lib/server/logger';
import { findByDsaId, applyTransition } from '$lib/server/billing/subscriptionStore';
import { writeBillingAuditLog } from '$lib/server/billing/billingAuditLog';
import type { SubscriptionState } from '$lib/types/billingSubscription';

/** Resume targets the state machine accepts FROM paused. */
const VALID_RESUME_TARGETS: SubscriptionState[] = [
	'active',
	'dunning_t0',
	'dunning_grace',
	'dunning_final'
];

export const POST: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const userId = locals.user!.id;

	const limited = await rateLimit(userId, {
		identifier: `billing-resume:${userId}`,
		maxRequests: 10,
		windowMs: 60 * 60 * 1000
	});
	if (limited) {
		return apiError('Too many resume attempts. Please wait an hour.', 429);
	}

	try {
		const sub = await findByDsaId(userId);
		if (!sub) return apiError('No subscription found', 404);

		if (sub.state !== 'paused') {
			return apiError(
				`Subscription is not paused. Current state: ${sub.state}`,
				409
			);
		}

		// Resume target = paused_from_state if it's a legal resume target,
		// otherwise 'active' (defensive fallback — paused_from_state should
		// always be one of the four legal targets but a corrupted doc
		// shouldn't permanently strand the user).
		const requestedTarget = sub.paused_from_state ?? 'active';
		const target: SubscriptionState = VALID_RESUME_TARGETS.includes(
			requestedTarget as SubscriptionState
		)
			? (requestedTarget as SubscriptionState)
			: 'active';

		if (target !== requestedTarget) {
			logger.warn(
				{ userId, paused_from_state: sub.paused_from_state, fallback: 'active' },
				'resume: paused_from_state was not a valid resume target — defaulting to active'
			);
		}

		// For resume → active: schedule a fresh charge today. The cron's
		// eligibility filter (next_charge_at <= now AND mandate_token
		// present) picks it up on the next tick.
		// For resume → dunning_*: leave next_charge_at alone. The S4
		// retry schedule, if any, is still valid (dunning_started_at +
		// offset doesn't change because we're back in the same dunning
		// state with the same clock).
		const patch =
			target === 'active' ? { next_charge_at: new Date() } : {};

		const updated = await applyTransition(
			sub.dsa_id,
			'paused',
			target,
			`DSA resumed subscription → ${target}`,
			patch
		);

		if (!updated) {
			return apiError(
				'Subscription state changed during request. Please refresh and try again.',
				409
			);
		}

		await writeBillingAuditLog({
			event_class: 'subscription_transition',
			event_name: `paused->${target}`,
			subscription_id: updated._id,
			dsa_id: updated.dsa_id,
			actor: 'dsa',
			payload: {
				source: 'resume-endpoint',
				resumed_to: target,
				paused_from_state_at_resume: sub.paused_from_state
			}
		});

		logger.info(
			{ userId, resumed_to: target, paused_from_state: sub.paused_from_state },
			'resume: subscription resumed'
		);

		// Message tone differs by target — DSA going back to active hears
		// "you're good"; DSA going back to dunning hears "still need to fix it".
		const message =
			target === 'active'
				? 'Your subscription is active again. The next charge will fire today.'
				: 'Your subscription is resumed. The previous payment issue is still being processed — please make sure your payment method is up to date.';

		return apiOk({
			state: target,
			message
		});
	} catch (err) {
		return apiServerError(err, 'resume failed');
	}
};
