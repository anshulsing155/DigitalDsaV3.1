/**
 * POST /api/cron/data3-sweep
 * ════════════════════════════════════════════════════════════════════════
 * Daily cron: runs the DATA-3 file-deletion sweep. Deletes ImageKit
 * artifacts for documents that are `verified` and past their retention
 * floor (spec §6), provided the verify gate (§5) still holds.
 *
 * Authentication: `x-cron-secret` header — same pattern as
 * `/api/pms/cron/publish-scheduled`.
 *
 * Env flag: `DATA3_DELETION_ENABLED` must be the literal string `'true'`
 * for deletions to actually run. Otherwise the sweep collects candidates
 * and logs queue depth — useful for dark-launching the feature before
 * flipping the switch in production.
 *
 * See docs/specs/DATA-3-FILE-DELETION-SPEC.md and ADR-0006.
 * ════════════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import {
	Cases,
	ArtifactDeletionLogs,
	DocumentRetentionOverrides
} from '$lib/database/mongo.js';
import imagekit from '$lib/imagekit/server.js';
import { runSweep } from '$lib/server/data3/sweepJob.js';
import { env } from '$env/dynamic/private';

const CRON_SECRET = env.CRON_SECRET || '';

export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('x-cron-secret') || '';
	if (!CRON_SECRET || authHeader !== CRON_SECRET) {
		return apiError('Unauthorized', 401);
	}

	try {
		const result = await runSweep({
			cases: Cases,
			auditLogs: ArtifactDeletionLogs,
			overrides: DocumentRetentionOverrides,
			imagekit,
			logger,
			enabledFlag: env.DATA3_DELETION_ENABLED,
			now: new Date()
		});

		return apiOk({
			enabled: result.enabled,
			candidates: result.candidates,
			deleted: result.deleted,
			already_deleted: result.already_deleted,
			skipped_gate: result.skipped_gate,
			skipped_override: result.skipped_override,
			abandoned: result.abandoned,
			errors: result.errors
		});
	} catch (err) {
		return apiServerError(err, 'data3 sweep cron');
	}
};
