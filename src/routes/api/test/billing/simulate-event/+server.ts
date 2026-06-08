/**
 * D.1 Recurring Billing — R11 simulate-event test driver
 * ══════════════════════════════════════════════════════════════════
 * POST /api/test/billing/simulate-event
 *
 * Body: { state_from: SubscriptionState, state_to: SubscriptionState,
 *         reason: string, meta?: object }
 *
 * Exercises the pure transitionSubscription() against a fresh in-memory
 * subscription doc and returns the resulting shape. Used by tests + the
 * eventual admin "simulate" UI to drive the state machine without a real
 * mandate/charge.
 *
 * Dev-only gate: `import { dev } from '$app/environment'` (per critique
 * P1-7 — NOT process.env.NODE_ENV, which is true on Vercel preview
 * deploys that are NOT real-production but also NOT real-dev).
 *
 * Spec: D-1 §4 S1 (R11 driver) + §6 (dev/prod gating).
 * S1 scope: in-memory only. S2+ may wire to DB so admin can simulate
 * transitions on real (test_only) subscription rows.
 * ══════════════════════════════════════════════════════════════════
 */

import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse';
import {
	IllegalSubscriptionTransitionError,
	makeFreshSubscription,
	transitionSubscription
} from '$lib/server/billing/subscriptionState';
import { firstChargeAtForSubscribe, assignAnchor } from '$lib/server/billing/anchorAssignment';
import type { SubscriptionState } from '$lib/types/billingSubscription';
import { ObjectId } from 'mongodb';
import logger from '$lib/server/logger';

const VALID_STATES: ReadonlySet<SubscriptionState> = new Set([
	'not_subscribed',
	'pending_mandate',
	'active',
	'paused',
	'dunning_t0',
	'dunning_grace',
	'dunning_final',
	'downgraded',
	'cancelled'
]);

interface SimulatePayload {
	state_from: SubscriptionState;
	state_to: SubscriptionState;
	reason: string;
	meta?: Record<string, unknown>;
}

function isValidState(s: unknown): s is SubscriptionState {
	return typeof s === 'string' && VALID_STATES.has(s as SubscriptionState);
}

export const POST: RequestHandler = async (event) => {
	// Hard dev-only gate per §6 + critique P1-7.
	// Returns 404 (not 403) so the endpoint looks non-existent in prod.
	if (!dev) {
		return new Response(null, { status: 404 });
	}

	const parsed = await parseJsonBody<SimulatePayload>(event.request);
	if (!parsed.ok) return parsed.response;
	const body = parsed.data;

	if (!isValidState(body?.state_from)) {
		return apiError('Invalid state_from', 400);
	}
	if (!isValidState(body?.state_to)) {
		return apiError('Invalid state_to', 400);
	}
	if (typeof body?.reason !== 'string' || body.reason.length === 0) {
		return apiError('reason is required', 400);
	}

	try {
		// Build a synthetic subscription in the requested `from` state.
		// We use makeFreshSubscription then jump to the requested from-state
		// via a controlled bootstrap path (this is a SIMULATION, not real persistence).
		const fresh = makeFreshSubscription(new ObjectId(), 'pro', 599_800);

		// Bootstrap to from-state by jumping through legal transitions where possible.
		// For arbitrary from-states (dunning_t0, paused, etc.) the simulator allows
		// a direct seed since this is a test driver, NOT production code.
		const seeded = {
			...fresh,
			state: body.state_from,
			// Populate dunning bookkeeping if we're seeding into a dunning state.
			dunning_started_at:
				body.state_from.startsWith('dunning_') || body.state_from === 'downgraded'
					? new Date(Date.now() - 60_000)
					: undefined,
			// Anchor / charge bookkeeping if we're seeding into active.
			anchor_day: body.state_from === 'active' ? assignAnchor(new Date()) : undefined,
			next_charge_at:
				body.state_from === 'active' ? firstChargeAtForSubscribe(new Date()) : undefined
		};

		const transitioned = transitionSubscription(seeded, body.state_to, {
			reason: body.reason,
			meta: body.meta
		});

		logger.info(
			{
				dsa_id: String(fresh.dsa_id),
				from: body.state_from,
				to: body.state_to,
				reason: body.reason
			},
			'simulate-event: transition succeeded'
		);

		return apiOk({
			before: seeded,
			after: transitioned,
			transition: {
				from: body.state_from,
				to: body.state_to,
				reason: body.reason
			}
		});
	} catch (err) {
		if (err instanceof IllegalSubscriptionTransitionError) {
			return apiError(err.message, 422);
		}
		logger.error({ err }, 'simulate-event: unexpected error');
		return apiServerError('simulate-event failed');
	}
};
