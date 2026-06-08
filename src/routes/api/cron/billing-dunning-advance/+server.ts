/**
 * POST /api/cron/billing-dunning-advance
 * ══════════════════════════════════════════════════════════════════
 * Daily cron (D.1 S5 §4 S5): walks subscriptions in dunning_* states
 * one step further on day-N escalation:
 *
 *   dunning_t0    + 3 days → dunning_grace
 *   dunning_grace + 7 days → dunning_final
 *   dunning_final + 8 days → downgraded
 *
 * Day-N math is anchored on `dunning_started_at` (NOT on the most
 * recent transition) per spec — set when the FIRST `* → dunning_t0`
 * transition fires; survives retries within dunning; cleared only on
 * recovery to active.
 *
 * Recommended schedule: ONCE daily at 03:00 IST (= 21:30 UTC), AFTER
 * the renewal-charge cron at 02:00 IST. Order matters: if a sub's
 * charge succeeds at 02:00 → state recovers to active → no dunning
 * advance is due at 03:00. Reverse the order and you could advance a
 * subscription that's about to recover, sending a needless escalation
 * email and confusing the DSA.
 *
 * Authentication: `x-cron-secret` header (same pattern as billing-charge
 * et al). Operator wires the external scheduler (cron-job.org) to hit
 * this endpoint daily — see scripts/setup-cron-jobs.mjs.
 *
 * Concurrency: protected by cronLock 'billing-dunning-advance' so two
 * simultaneous invocations (deploy-time region race, external scheduler
 * retry on 5xx) cannot both advance the same subscription. The
 * applyTransition state precondition is a second line of defense — if
 * the lock somehow released between the read and the write, the atomic
 * findOneAndUpdate on the from-state prevents double-application.
 *
 * Email dispatch: M3 wires the real templates via dispatchDunningAdvanceEmail,
 * which maps DunningEmailKind → corresponding sendDunning*Email function.
 * Email routes through src/lib/server/email.ts → SES on production, log-only
 * in dev with no creds. A send failure does NOT roll back the state
 * transition (operator can re-send; a missed state advance is unrecoverable).
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S5
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse';
import logger from '$lib/server/logger';
import { env } from '$env/dynamic/private';
import {
	processDunningAdvanceBatch,
	DEFAULT_DUNNING_BATCH_SIZE
} from '$lib/server/billing/dunningEngine';
import { dispatchDunningAdvanceEmail } from '$lib/server/billing/dunningEmails';
import { withCronLock } from '$lib/server/billing/cronLock';

const CRON_SECRET = env.CRON_SECRET || '';

/**
 * Batch size — env-var tunable. Default 50 (higher than charge cron's 25
 * because dunning-advance is a pure state-walk: no provider call, no
 * payment round-trip, just Mongo writes). Raise via BILLING_DUNNING_BATCH_SIZE
 * once production volume warrants.
 */
const BATCH_SIZE = (() => {
	const raw = env.BILLING_DUNNING_BATCH_SIZE;
	if (!raw) return DEFAULT_DUNNING_BATCH_SIZE;
	const n = Number.parseInt(raw, 10);
	if (!Number.isFinite(n) || n < 1 || n > 1000) {
		logger.warn(
			{ raw, fallback: DEFAULT_DUNNING_BATCH_SIZE },
			'billing-dunning-advance: BILLING_DUNNING_BATCH_SIZE out of range — using default'
		);
		return DEFAULT_DUNNING_BATCH_SIZE;
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

		const lockResult = await withCronLock('billing-dunning-advance', async () => {
			return await processDunningAdvanceBatch({
				batchSize: BATCH_SIZE,
				now: startedAt,
				sendEmail: async (kind, sub) => {
					// Engine catches + logs errors thrown here so a transient SES
					// blip cannot roll back a state transition. We surface the
					// EmailResult failure case to logger here so operator triage
					// has both signals in the same trail.
					const result = await dispatchDunningAdvanceEmail(kind, sub);
					if (!result.success) {
						logger.warn(
							{ kind, dsa_id: String(sub.dsa_id), error: result.error },
							'dunning-advance: email dispatch returned failure (state transition kept)'
						);
					}
				}
			});
		});

		if (!lockResult.acquired) {
			// Another invocation has the lock — this one exits clean. NOT an
			// error condition; the cron is designed to handle contention.
			logger.info(
				{ started_at: startedAt.toISOString() },
				'billing-dunning-advance: lock contention — another invocation running'
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
				advanced: summary.advanced,
				no_advancement_due: summary.no_advancement_due,
				skipped: summary.skipped,
				errors: summary.errors,
				started_at: startedAt.toISOString()
			},
			'billing-dunning-advance: batch complete'
		);

		return apiOk({
			total: summary.total,
			advanced: summary.advanced,
			no_advancement_due: summary.no_advancement_due,
			skipped: summary.skipped,
			errors: summary.errors,
			batch_size: BATCH_SIZE,
			started_at: startedAt.toISOString(),
			completed_at: new Date().toISOString()
		});
	} catch (err) {
		return apiServerError(err, 'billing-dunning-advance cron failed');
	}
};
