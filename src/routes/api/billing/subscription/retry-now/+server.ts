/**
 * POST /api/billing/subscription/retry-now
 * ══════════════════════════════════════════════════════════════════════
 * DSA-triggered manual retry of a failed recurring charge (D.1 S4 / §4 S5).
 *
 * Use case: a DSA's mandate failed (e.g. insufficient funds), they're
 * sitting in dunning_t0/grace/final with the persistent banner. They top
 * up their bank account and want to retry RIGHT NOW instead of waiting
 * for the next cron-scheduled retry day. This endpoint runs the same
 * chargeEngine path the cron uses, but with `mode: 'manual'` so:
 *
 *   - failed_attempt_count still bumps via the state-machine self-loop
 *     (the failure counts; tracking is consistent)
 *   - next_charge_at is NOT overridden — the cron's scheduled retry stays
 *     intact. Manual retries are BONUS attempts, not replacements for
 *     the cron schedule. (Spec: "manual retries are bonus attempts, not
 *     replacements for the cron schedule.")
 *
 * On success → standard dunning_* → active recovery path → recovery email
 * → banner clears.
 *
 * Auth: requireRoleApi('dsa') + CSRF (no /api/cron/ skip — this is a DSA
 * action) + rate-limit 3/hr/user (legitimate use is rare; 3/hr is enough
 * for "they forgot they had insufficient funds, topped up, retried").
 *
 * State validation: 404 unless the DSA's subscription is in one of
 * dunning_t0 / dunning_grace / dunning_final. The endpoint is invisible
 * to DSAs whose sub is active/cancelled/etc — the UI only renders the
 * "Retry now" button on the dunning banner.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S5 ("/retry-now")
 * ══════════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards';
import { rateLimit } from '$lib/server/rateLimiter';
import logger from '$lib/server/logger';
import { findByDsaId } from '$lib/server/billing/subscriptionStore';
import { processOneSubscription } from '$lib/server/billing/chargeEngine';
import { getBillingProvider } from '$lib/server/billing/providerRegistry';

const DUNNING_STATES = ['dunning_t0', 'dunning_grace', 'dunning_final'] as const;
type DunningState = (typeof DUNNING_STATES)[number];

function isDunningState(state: string): state is DunningState {
	return (DUNNING_STATES as readonly string[]).includes(state);
}

export const POST: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const userId = locals.user!.id;

	// Rate-limit: 3 manual retries per hour per DSA. Legitimate use is rare;
	// abuse vector is "DSA retries 100 times to burn through their failed
	// charges" which doesn't help them anyway because the provider returns
	// the same INSUFFICIENT_FUNDS until their bank balance changes.
	const limited = await rateLimit(userId, {
		identifier: `billing-retry-now:${userId}`,
		maxRequests: 3,
		windowMs: 60 * 60 * 1000
	});
	if (limited) {
		return apiError('Too many manual retry attempts. Please wait an hour or contact support.', 429);
	}

	try {
		const sub = await findByDsaId(userId);
		if (!sub) {
			// No subscription doc → DSA has never subscribed, or it's in
			// `not_subscribed`. Either way, this endpoint doesn't apply.
			return apiError('No active subscription found', 404);
		}

		if (!isDunningState(sub.state)) {
			// Sub exists but isn't in dunning. Hide the endpoint — the UI
			// shouldn't be exposing the retry button here.
			return apiError(
				`Manual retry only available during dunning. Current state: ${sub.state}.`,
				404
			);
		}

		// Run the same charge engine the cron uses, with mode: 'manual'.
		// chargeEngine.handleFailure detects mode === 'manual' and skips
		// the next_charge_at override (so the cron's scheduled retry stays
		// intact) while still bumping the counter via the state-machine
		// self-loop.
		const provider = getBillingProvider();
		const outcome = await processOneSubscription(sub, {
			provider,
			mode: 'manual',
			sendConfirmationEmail: true
		});

		logger.info(
			{ userId, sub_state_before: sub.state, outcome_kind: outcome.kind },
			'retry-now: manual retry processed'
		);

		// Map engine outcome → response.
		switch (outcome.kind) {
			case 'succeeded':
				return apiOk({
					result: 'succeeded',
					attempt_id: outcome.attempt_id,
					next_charge_at: outcome.next_charge_at.toISOString(),
					message: 'Payment went through. Your subscription is active again.'
				});
			case 'failed_retryable':
				return apiOk({
					result: 'failed_retryable',
					attempt_id: outcome.attempt_id,
					failure_code: outcome.failure_code,
					message:
						'Retry failed. We will try again at the next scheduled retry. Check your bank balance or update your payment method.'
				});
			case 'failed_terminal':
				return apiOk({
					result: 'failed_terminal',
					attempt_id: outcome.attempt_id,
					failure_code: outcome.failure_code,
					message: 'Your bank mandate is no longer valid. Please update your payment method.'
				});
			case 'skipped_already_charged':
				return apiOk({
					result: 'already_charged',
					message: 'A retry attempt for this cycle has already succeeded.'
				});
			case 'skipped_no_mandate':
				return apiError('Mandate missing on subscription — contact support', 500);
			case 'skipped_cancel_at_end':
				// Shouldn't happen — cancel_at_end is active-only per M2 guards.
				return apiError('Subscription is being cancelled. Retry not applicable.', 409);
			case 'skipped_mandate_update_lock':
				// DSA hit Retry Now mid-update-payment-method flow (S6 M3). The
				// advisory lock prevents charging during the swap window — ask
				// them to finish or wait. 409 (state conflict).
				return apiError(
					'A payment method update is in progress. Please complete it or wait a few minutes before retrying.',
					409
				);
			case 'error':
				return apiServerError(new Error(outcome.message), 'retry-now engine error');
		}
	} catch (err) {
		return apiServerError(err, 'retry-now failed');
	}
};
