/**
 * POST /api/cron/billing-charge-reminder
 * ══════════════════════════════════════════════════════════════════
 * Daily cron (D.1 S3): notifies DSAs 3-4 days before their next debit.
 *
 * Schedule: ONCE daily at ~02:30 IST (= 21:00 UTC). The 30 min offset
 * from billing-charge (02:00 IST) is intentional — reminder traffic
 * is async to charge traffic, no contention.
 *
 * Auth: x-cron-secret header (same as billing-charge).
 *
 * Concurrency: NOT lock-protected — reminder is idempotent at the
 * application layer via `last_reminder_sent_at` on the subscription
 * doc, and the cost of a duplicate-send race is "one extra email" not
 * "double charge". The charge cron's lock is overkill for this path.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S3, §11.2 #14
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse';
import logger from '$lib/server/logger';
import { env } from '$env/dynamic/private';
import { processRemindersBatch } from '$lib/server/billing/reminderEngine';

const CRON_SECRET = env.CRON_SECRET || '';

export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('x-cron-secret') ?? '';
	if (!CRON_SECRET || authHeader !== CRON_SECRET) {
		return apiError('Unauthorized', 401);
	}

	try {
		const startedAt = new Date();
		const summary = await processRemindersBatch(startedAt);

		logger.info(
			{
				total: summary.total,
				sent: summary.sent,
				skipped: summary.skipped,
				failed: summary.failed,
				started_at: startedAt.toISOString()
			},
			'billing-charge-reminder: batch complete'
		);

		return apiOk({
			total: summary.total,
			sent: summary.sent,
			skipped: summary.skipped,
			failed: summary.failed,
			started_at: startedAt.toISOString(),
			completed_at: new Date().toISOString()
		});
	} catch (err) {
		return apiServerError(err, 'billing-charge-reminder cron failed');
	}
};
