/**
 * POST /api/billing/subscription/pause (D.1 S6 §4 S6)
 * ══════════════════════════════════════════════════════════════════
 * DSA-initiated subscription pause. Legal from `active` and any
 * `dunning_*` state. Records `paused_from_state` so resume can
 * restore correctly (preserves the dunning clock if pausing
 * mid-dunning per §11.2 #12).
 *
 *   active        → paused (cancels next_charge_at)
 *   dunning_t0    → paused (preserves dunning_started_at + count)
 *   dunning_grace → paused (same)
 *   dunning_final → paused (same)
 *
 * Mandate stays alive at provider. 90-day auto-cancel runs via a
 * separate cron (S6-M6).
 *
 * Auth: requireRoleApi('dsa') + CSRF (via secureFetch) + rate-limit
 * 10/hr/user. These are legitimate DSA actions, not abuse vectors —
 * the rate limit just protects against the buggy-client retry loop.
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

/**
 * States legal to pause FROM. Includes all dunning_* per §11.2 #12 lock-down
 * (pause-from-dunning preserves dunning state for resume).
 */
const PAUSABLE_STATES = ['active', 'dunning_t0', 'dunning_grace', 'dunning_final'] as const;
type PausableState = (typeof PAUSABLE_STATES)[number];

function isPausableState(state: string): state is PausableState {
	return (PAUSABLE_STATES as readonly string[]).includes(state);
}

export const POST: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const userId = locals.user!.id;

	// Rate-limit: 10/hr is generous; the only legitimate path is "DSA
	// hits Pause then changes their mind once or twice." Burst higher
	// than that is a UI bug we want to surface, not silently absorb.
	const limited = await rateLimit(userId, {
		identifier: `billing-pause:${userId}`,
		maxRequests: 10,
		windowMs: 60 * 60 * 1000
	});
	if (limited) {
		return apiError('Too many pause attempts. Please wait an hour.', 429);
	}

	try {
		const sub = await findByDsaId(userId);
		if (!sub) return apiError('No subscription found', 404);

		if (!isPausableState(sub.state)) {
			return apiError(
				`Subscription cannot be paused from state: ${sub.state}`,
				409
			);
		}

		// applyTransition handles the side-effects:
		//   - records paused_from_state via state-machine side-effect
		//   - preserves dunning_started_at + failed_attempt_count (state
		//     machine only clears those on dunning_*→active recovery)
		//
		// Cancel next_charge_at on pause from active. For dunning_*→paused,
		// next_charge_at may be the retry schedule from S4; we leave it as
		// the state machine handles the eligibility filter (paused subs are
		// excluded from the charge cron's state filter).
		const patch =
			sub.state === 'active' ? { next_charge_at: undefined } : {};

		const updated = await applyTransition(
			sub.dsa_id,
			sub.state,
			'paused',
			'DSA paused subscription',
			patch
		);

		if (!updated) {
			// State precondition mismatch — concurrent writer beat us.
			return apiError(
				'Subscription state changed during request. Please refresh and try again.',
				409
			);
		}

		await writeBillingAuditLog({
			event_class: 'subscription_transition',
			event_name: `${sub.state}->paused`,
			subscription_id: updated._id,
			dsa_id: updated.dsa_id,
			actor: 'dsa',
			payload: {
				source: 'pause-endpoint',
				from_state: sub.state,
				paused_from_state: updated.paused_from_state
			}
		});

		logger.info(
			{ userId, from_state: sub.state, paused_from_state: updated.paused_from_state },
			'pause: subscription paused'
		);

		return apiOk({
			state: 'paused',
			paused_from_state: updated.paused_from_state,
			message: 'Your subscription is paused. Resume anytime from the Billing page.'
		});
	} catch (err) {
		return apiServerError(err, 'pause failed');
	}
};
