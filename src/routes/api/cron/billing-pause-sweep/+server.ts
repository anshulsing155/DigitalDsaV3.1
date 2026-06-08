/**
 * POST /api/cron/billing-pause-sweep (D.1 S6 M6)
 * ══════════════════════════════════════════════════════════════════
 * Daily cron: walks subscriptions in `paused` state and acts on
 * day-N thresholds per spec §3.2.1 #20a:
 *
 *   day 60: send "auto-cancel in 30 days" reminder email (once)
 *   day 90: transition paused → cancelled + best-effort revoke mandate
 *
 * Recommended schedule: 03:30 IST daily — runs AFTER the dunning-advance
 * cron at 03:00 IST. No strict ordering requirement (pause is independent
 * from dunning) but keeping all billing crons in the 02:00-04:00 IST
 * window keeps operator dashboards tidy.
 *
 * Authentication: `x-cron-secret` header (same pattern as billing-charge
 * et al). Provisioned by scripts/setup-cron-jobs.mjs.
 *
 * Concurrency: protected by cronLock 'billing-pause-sweep' so two
 * simultaneous invocations cannot both send the reminder or auto-cancel
 * the same row. The applyTransition state precondition + the
 * `pause_reminder_sent_at: {$exists: false}` precondition on the reminder
 * update are second lines of defense.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §3.2.1 #20a + §4 S6 M6
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse';
import logger from '$lib/server/logger';
import { env } from '$env/dynamic/private';
import {
	processPauseSweepBatch,
	DEFAULT_PAUSE_SWEEP_BATCH_SIZE
} from '$lib/server/billing/pauseSweepEngine';
import { sendPauseReminderEmail } from '$lib/server/billing/dunningEmails';
import { withCronLock } from '$lib/server/billing/cronLock';

const CRON_SECRET = env.CRON_SECRET || '';

const BATCH_SIZE = (() => {
	const raw = env.BILLING_PAUSE_SWEEP_BATCH_SIZE;
	if (!raw) return DEFAULT_PAUSE_SWEEP_BATCH_SIZE;
	const n = Number.parseInt(raw, 10);
	if (!Number.isFinite(n) || n < 1 || n > 1000) {
		logger.warn(
			{ raw, fallback: DEFAULT_PAUSE_SWEEP_BATCH_SIZE },
			'billing-pause-sweep: BILLING_PAUSE_SWEEP_BATCH_SIZE out of range — using default'
		);
		return DEFAULT_PAUSE_SWEEP_BATCH_SIZE;
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

		const lockResult = await withCronLock('billing-pause-sweep', async () => {
			return await processPauseSweepBatch({
				batchSize: BATCH_SIZE,
				now: startedAt,
				sendReminderEmail: async (sub) => {
					const result = await sendPauseReminderEmail(sub);
					if (!result.success) {
						logger.warn(
							{ dsa_id: String(sub.dsa_id), error: result.error },
							'pause-sweep: reminder email returned failure (sent-at field kept)'
						);
					}
				}
			});
		});

		if (!lockResult.acquired) {
			logger.info(
				{ started_at: startedAt.toISOString() },
				'billing-pause-sweep: lock contention — another invocation running'
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
				reminders_sent: summary.reminders_sent,
				auto_cancelled: summary.auto_cancelled,
				no_action: summary.no_action,
				skipped: summary.skipped,
				errors: summary.errors,
				started_at: startedAt.toISOString()
			},
			'billing-pause-sweep: batch complete'
		);

		return apiOk({
			total: summary.total,
			reminders_sent: summary.reminders_sent,
			auto_cancelled: summary.auto_cancelled,
			no_action: summary.no_action,
			skipped: summary.skipped,
			errors: summary.errors,
			batch_size: BATCH_SIZE,
			started_at: startedAt.toISOString(),
			completed_at: new Date().toISOString()
		});
	} catch (err) {
		return apiServerError(err, 'billing-pause-sweep cron failed');
	}
};
