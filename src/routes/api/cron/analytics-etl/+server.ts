/**
 * POST /api/cron/analytics-etl
 * ════════════════════════════════════════════════════════════════════════
 * Nightly cron: runs the DATA-4 analytics ETL. Reads operational cases,
 * de-identifies each, and upserts into the `digitaldsa_analytics` warehouse.
 *
 * Authentication: `x-cron-secret` header — same pattern as
 * `/api/cron/data3-sweep`.
 *
 * Env flag: `ANALYTICS_ETL_ENABLED` must be the literal string `'true'` for
 * the job to do anything. Otherwise it's a no-op (dark-launch posture — the
 * warehouse stays empty until an operator flips the switch).
 *
 * See docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md §6–§8.
 * ════════════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { Cases, FormSnapshots, AnalyticsCases, AnalyticsEtlRuns } from '$lib/database/mongo.js';
import { resolveSnapshotPayload } from '$lib/server/csfle/snapshotCrypto.js';
import { enrichPayload } from '$lib/ruleEngine/payloadEnricher.js';
import { runAnalyticsEtl, type EtlSnapshot } from '$lib/server/analytics/etlJob.js';
import { env } from '$env/dynamic/private';

const CRON_SECRET = env.CRON_SECRET || '';

export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('x-cron-secret') || '';
	if (!CRON_SECRET || authHeader !== CRON_SECRET) {
		return apiError('Unauthorized', 401);
	}

	try {
		const result = await runAnalyticsEtl({
			enabled: env.ANALYTICS_ETL_ENABLED === 'true',
			now: new Date(),
			logger,

			// Incremental cursor: the most recent FINISHED run's started_at.
			findLastSuccessfulCursor: async () => {
				const last = await AnalyticsEtlRuns.find({ finished_at: { $ne: null } })
					.sort({ started_at: -1 })
					.limit(1)
					.next();
				return last?.started_at ?? null;
			},

			// Eligible = changed since cursor, not a sample, past intake stage.
			findEligibleCases: async (cursor) => {
				const filter: Record<string, unknown> = {
					is_sample: { $ne: true },
					stage: { $ne: 'intake' }
				};
				if (cursor) filter.updated_at = { $gt: cursor };
				return Cases.find(filter).toArray();
			},

			findLatestSnapshot: async (caseId): Promise<EtlSnapshot | null> => {
				const snap = await FormSnapshots.find({ case_id: caseId })
					.sort({ version: -1 })
					.limit(1)
					.next();
				if (!snap) return null;
				return {
					payload: snap.payload ?? null,
					payload_encrypted: snap.payload_encrypted ?? null,
					version: snap.version
				};
			},

			resolvePayload: (snapshot) => resolveSnapshotPayload(snapshot),
			enrich: enrichPayload,

			upsertRow: async (row) => {
				await AnalyticsCases.updateOne({ case_id: row.case_id }, { $set: row }, { upsert: true });
			},

			recordRun: async (runDoc) => {
				await AnalyticsEtlRuns.insertOne(runDoc);
			}
		});

		return apiOk(result);
	} catch (err) {
		return apiServerError(err, 'analytics-etl cron');
	}
};
