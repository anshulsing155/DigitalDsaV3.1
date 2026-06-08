/**
 * POST /api/billing/subscription/cancel (D.1 S6 §4 S6)
 * ══════════════════════════════════════════════════════════════════
 * DSA-initiated subscription cancellation. Behavior depends on
 * current state:
 *
 *   active → sets `cancel_at_cycle_end: true`. The DSA keeps access
 *            through the current cycle (no premature lock-out).
 *            chargeEngine.processOneSubscription sees the flag at the
 *            next anchor and transitions active → cancelled instead
 *            of charging. (Already implemented in chargeEngine.ts —
 *            see the cancel_at_cycle_end guard.)
 *
 *   paused → immediate transition to cancelled. There's no scheduled
 *            charge to wait for; deferring would just leave the DSA
 *            in `paused` indefinitely if they don't explicitly resume.
 *
 *   other states → 409 (already cancelled / downgraded / not_subscribed
 *                  / pending_mandate — no live subscription to cancel).
 *
 * Mandate revocation at provider: per spec § 4 S6, this is operator-
 * action territory. The endpoint only flips OUR state; a follow-up
 * admin tool calls `provider.queryMandateStatus()` and revokes via
 * the provider's dashboard. Documented in the response so the DSA
 * knows their bank-side mandate stays active until operator handles it.
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
import { BillingSubscriptions } from '$lib/database/mongo';

export const POST: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const userId = locals.user!.id;

	const limited = await rateLimit(userId, {
		identifier: `billing-cancel:${userId}`,
		maxRequests: 10,
		windowMs: 60 * 60 * 1000
	});
	if (limited) {
		return apiError('Too many cancel attempts. Please wait an hour.', 429);
	}

	try {
		const sub = await findByDsaId(userId);
		if (!sub) return apiError('No subscription found', 404);

		// ── Branch 1: active → set cancel_at_cycle_end, no state change ──
		if (sub.state === 'active') {
			if (sub.cancel_at_cycle_end) {
				// Already flagged. Idempotent re-call — return the same shape
				// as a fresh cancel so the UI can show "already cancelled".
				return apiOk({
					state: 'active',
					cancel_at_cycle_end: true,
					message: 'Cancellation is already scheduled. Access continues until the next billing date.'
				});
			}

			const result = await BillingSubscriptions.findOneAndUpdate(
				{ dsa_id: sub.dsa_id, state: 'active' },
				{
					$set: {
						cancel_at_cycle_end: true,
						updated_at: new Date()
					}
				},
				{ returnDocument: 'after' }
			);

			if (!result) {
				return apiError(
					'Subscription state changed during request. Please refresh and try again.',
					409
				);
			}

			await writeBillingAuditLog({
				event_class: 'subscription_transition',
				event_name: 'cancel_at_cycle_end_set',
				subscription_id: result._id,
				dsa_id: result.dsa_id,
				actor: 'dsa',
				payload: {
					source: 'cancel-endpoint',
					next_charge_at: result.next_charge_at?.toISOString()
				}
			});

			logger.info(
				{ userId, next_charge_at: result.next_charge_at?.toISOString() },
				'cancel: cancel_at_cycle_end flag set'
			);

			return apiOk({
				state: 'active',
				cancel_at_cycle_end: true,
				next_charge_at: result.next_charge_at?.toISOString(),
				message:
					'Cancellation scheduled. Your access continues until the next billing date, after which the subscription will be cancelled.'
			});
		}

		// ── Branch 2: paused → immediate transition to cancelled ──
		if (sub.state === 'paused') {
			const updated = await applyTransition(
				sub.dsa_id,
				'paused',
				'cancelled',
				'DSA cancelled subscription while paused'
			);
			if (!updated) {
				return apiError(
					'Subscription state changed during request. Please refresh and try again.',
					409
				);
			}

			await writeBillingAuditLog({
				event_class: 'subscription_transition',
				event_name: 'paused->cancelled',
				subscription_id: updated._id,
				dsa_id: updated.dsa_id,
				actor: 'dsa',
				payload: { source: 'cancel-endpoint' }
			});

			logger.info({ userId }, 'cancel: paused subscription cancelled immediately');

			return apiOk({
				state: 'cancelled',
				message:
					'Subscription cancelled. You can re-subscribe anytime from the Billing page.'
			});
		}

		// ── Branch 3: any other state → 409 ──
		return apiError(
			`Subscription cannot be cancelled from state: ${sub.state}`,
			409
		);
	} catch (err) {
		return apiServerError(err, 'cancel failed');
	}
};
