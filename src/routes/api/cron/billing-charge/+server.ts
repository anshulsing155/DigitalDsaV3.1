/**
 * POST /api/cron/billing-charge
 * ══════════════════════════════════════════════════════════════════
 * Daily cron (D.1 S3 §4 S3): runs the renewal charge engine against
 * subscriptions whose `next_charge_at` has arrived. Sequential within
 * the batch; safe to invoke daily because the {state, next_charge_at}
 * compound index makes the eligibility query a covered O(log n)
 * regardless of whether today is an anchor day (1/5/10/15/20/25 IST)
 * or not.
 *
 * Recommended schedule: ONCE daily at 02:00 IST (= 20:30 UTC). On
 * non-anchor days the engine processes zero subscriptions and the
 * cron returns in <50 ms. On anchor days the eligible batch fires.
 *
 * Owner is on Vercel FREE tier (S3 I-5 decision) which caps cron jobs
 * at 2/day. Wire an external scheduler (cron-job.org or equivalent)
 * to hit this endpoint with the x-cron-secret header. The scheduler
 * config is the runbook's job.
 *
 * Authentication: `x-cron-secret` header (same pattern as
 * billing-pending-cleanup, data2-revoke-sweep, etc).
 *
 * Concurrency: protected by cronLock 'billing-charge' so two
 * simultaneous invocations (deploy-time region race, external
 * scheduler retry on 5xx) cannot both process the same eligible
 * batch. The application-layer ChargeAttempts (subscription_id,
 * cycle_anchor) probe is a second line of defense — together they
 * make double-charge impossible.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S3, §11 R14
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse';
import logger from '$lib/server/logger';
import { env } from '$env/dynamic/private';
import {
	processChargesBatch,
	DEFAULT_BATCH_SIZE
} from '$lib/server/billing/chargeEngine';
import { withCronLock } from '$lib/server/billing/cronLock';
import { getBillingProvider } from '$lib/server/billing/providerRegistry';

const CRON_SECRET = env.CRON_SECRET || '';

/**
 * Batch size — env-var tunable per S3 I-2 default. 25 is the conservative
 * launch value (well within Vercel's 10s default function timeout × 5
 * provider RTT margin). Raise via BILLING_CHARGE_BATCH_SIZE once production
 * volume warrants it.
 */
const BATCH_SIZE = (() => {
	const raw = env.BILLING_CHARGE_BATCH_SIZE;
	if (!raw) return DEFAULT_BATCH_SIZE;
	const n = Number.parseInt(raw, 10);
	if (!Number.isFinite(n) || n < 1 || n > 1000) {
		// Defensive: don't trust an out-of-range env var to pick a sensible
		// batch size. Fall back to default + log so operators notice.
		logger.warn(
			{ raw, fallback: DEFAULT_BATCH_SIZE },
			'billing-charge: BILLING_CHARGE_BATCH_SIZE out of range — using default'
		);
		return DEFAULT_BATCH_SIZE;
	}
	return n;
})();

export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('x-cron-secret') ?? '';
	if (!CRON_SECRET || authHeader !== CRON_SECRET) {
		return apiError('Unauthorized', 401);
	}

	try {
		const startedAt = new Date();
		const provider = getBillingProvider();

		const lockResult = await withCronLock('billing-charge', async () => {
			return await processChargesBatch({
				provider,
				batchSize: BATCH_SIZE,
				now: startedAt,
				sendConfirmationEmail: true
			});
		});

		if (!lockResult.acquired) {
			// Another invocation has the lock — this one exits clean. NOT an
			// error condition; the cron is designed to handle contention.
			logger.info(
				{ started_at: startedAt.toISOString() },
				'billing-charge: lock contention — another invocation running'
			);
			return apiOk({
				skipped: 'lock_contention',
				started_at: startedAt.toISOString()
			});
		}

		const summary = lockResult.result;
		logger.info(
			{
				total: summary.total,
				succeeded: summary.succeeded,
				failed_retryable: summary.failed_retryable,
				failed_terminal: summary.failed_terminal,
				skipped: summary.skipped,
				errors: summary.errors,
				started_at: startedAt.toISOString()
			},
			'billing-charge: batch complete'
		);

		return apiOk({
			total: summary.total,
			succeeded: summary.succeeded,
			failed_retryable: summary.failed_retryable,
			failed_terminal: summary.failed_terminal,
			skipped: summary.skipped,
			errors: summary.errors,
			batch_size: BATCH_SIZE,
			started_at: startedAt.toISOString(),
			completed_at: new Date().toISOString()
		});
	} catch (err) {
		return apiServerError(err, 'billing-charge cron failed');
	}
};
