/**
 * POST /api/cron/billing-pending-cleanup
 * ══════════════════════════════════════════════════════════════════
 * Daily cron (4×/day per §4 S2): sweeps subscriptions stuck in
 * pending_mandate older than 24h and transitions them to not_subscribed
 * (per §3.2.1 transition #3 — pending_mandate → not_subscribed on TTL
 * expiry). DSA can then re-subscribe cleanly.
 *
 * Authentication: `x-cron-secret` header (same pattern as
 * data2-revoke-sweep, data3-sweep, data4-analytics-etl).
 *
 * Recommended Vercel cron schedule: every 4h (0 *​/4 * * *) to keep
 * cleanup latency low without overloading Mongo.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S2
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse';
import logger from '$lib/server/logger';
import { env } from '$env/dynamic/private';
import { sweepExpiredPendingMandates } from '$lib/server/billing/subscriptionStore';

const CRON_SECRET = env.CRON_SECRET || '';

export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('x-cron-secret') ?? '';
	if (!CRON_SECRET || authHeader !== CRON_SECRET) {
		return apiError('Unauthorized', 401);
	}

	try {
		const startedAt = new Date();
		const { swept } = await sweepExpiredPendingMandates(startedAt);

		logger.info(
			{ swept, started_at: startedAt.toISOString() },
			'billing-pending-cleanup: sweep complete'
		);

		return apiOk({
			swept,
			started_at: startedAt.toISOString(),
			completed_at: new Date().toISOString()
		});
	} catch (err) {
		return apiServerError(err, 'pending-cleanup sweep failed');
	}
};
