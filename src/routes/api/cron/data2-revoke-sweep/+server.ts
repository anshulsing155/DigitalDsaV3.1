/**
 * POST /api/cron/data2-revoke-sweep
 * ══════════════════════════════════════════════════════════════════
 * Daily cron: hard-deletes OutreachVault entries whose 90-day grace
 * period has elapsed. Mirrors the DATA-3 sweep pattern.
 *
 * Authentication: `x-cron-secret` header (same as data3-sweep).
 *
 * Env flag: `DATA2_SWEEP_ENABLED` must be the literal string `'true'`
 * for hard-deletions to actually run. Otherwise the sweep collects
 * candidates and logs queue depth — same dark-launch pattern as DATA-3.
 *
 * Spec: docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md §9.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { OutreachVault, ConsentRevocationLogs } from '$lib/database/mongo.js';
import imagekit from '$lib/imagekit/server.js';
import { runGracePeriodSweep } from '$lib/server/data2/gracePeriodSweep.js';
import { env } from '$env/dynamic/private';

const CRON_SECRET = env.CRON_SECRET || '';

export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('x-cron-secret') || '';
	if (!CRON_SECRET || authHeader !== CRON_SECRET) {
		return apiError('Unauthorized', 401);
	}

	try {
		const enabled = env.DATA2_SWEEP_ENABLED === 'true';

		if (!enabled) {
			// Dark-launch mode: just count what WOULD have been swept.
			const now = new Date();
			const candidateCount = await OutreachVault.countDocuments({
				consent_status: 'revoked',
				grace_period_ends_at: { $lte: now }
			});

			logger.info(
				{ candidates: candidateCount, enabled: false },
				'DATA-2 sweep: dark-launch — no deletions performed'
			);

			return apiOk({
				enabled: false,
				candidates: candidateCount,
				hard_deleted: 0,
				imagekit_already_gone: 0,
				imagekit_abandoned: 0,
				errored: 0
			});
		}

		const result = await runGracePeriodSweep({
			vault: OutreachVault,
			revocationLog: ConsentRevocationLogs,
			imagekit,
			now: new Date(),
			logger
		});

		return apiOk({
			enabled: true,
			candidates: result.processed,
			hard_deleted: result.hard_deleted,
			imagekit_already_gone: result.imagekit_already_gone,
			imagekit_abandoned: result.imagekit_abandoned,
			errored: result.errored
		});
	} catch (err) {
		return apiServerError(err, 'data2 revoke-sweep cron');
	}
};
