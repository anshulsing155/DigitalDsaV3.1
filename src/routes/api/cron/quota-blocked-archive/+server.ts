/**
 * POST /api/cron/quota-blocked-archive (QBC S3)
 * ══════════════════════════════════════════════════════════════════════
 * Daily cron: walks quota_blocked cases and archives those that have sat
 * for more than 30 days. Owner-locked threshold (OQ-2): 30 days = one
 * full billing cycle, so a still-sitting case means the DSA missed
 * BOTH auto-process triggers (the plan-upgrade hook AND their own monthly
 * cycle reset). Possible scenarios: subscription cancelled, account
 * dormant, notification emails ignored.
 *
 * Archive policy:
 *   - Sets is_archived=true + archived_at + archived_reason='quota_blocked_expired'
 *   - Stage stays 'quota_blocked' (so the case is forever visible as
 *     "Awaiting Processing (archived)" in case the DSA ever comes back)
 *   - FormSnapshot stays intact (no data loss)
 *   - No LenderResultsSnapshot exists by construction
 *
 * Recommended schedule: 04:30 IST daily — runs AFTER billing-reconcile
 * at 04:00 IST. Keeps all billing/cleanup crons in the 02:00-05:00 IST
 * window. Provision via scripts/setup-cron-jobs.mjs.
 *
 * Authentication: x-cron-secret header (same pattern as billing-charge).
 * Concurrency: protected by cronLock 'qbc-archive' — two simultaneous
 * invocations cannot double-archive the same row (the conditional filter
 * on is_archived=false is a second line of defense).
 *
 * Spec: docs/specs/QUOTA-BLOCKED-CASES-SPEC.md §13 OQ-2.
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse';
import logger from '$lib/server/logger';
import { env } from '$env/dynamic/private';
import { ObjectId } from 'mongodb';
import { Cases, DsaApplications } from '$lib/database/mongo';
import { withCronLock } from '$lib/server/billing/cronLock';
import { sendArchiveExpiredEmail } from '$lib/server/billing/quotaBlockedEmails';

const CRON_SECRET = env.CRON_SECRET || '';
const ARCHIVE_AGE_DAYS = 30;

export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('x-cron-secret') ?? '';
	if (!CRON_SECRET || authHeader !== CRON_SECRET) {
		return apiError('Unauthorized', 401);
	}

	try {
		const result = await withCronLock('qbc-archive', async () => {
			const now = new Date();
			const cutoff = new Date(now.getTime() - ARCHIVE_AGE_DAYS * 24 * 60 * 60 * 1000);

			// Find candidates first for the per-DSA notification breakdown.
			// updateMany returns total count but not per-row identifiers.
			const candidates = await Cases.find(
				{
					stage: 'quota_blocked',
					is_archived: { $ne: true },
					created_at: { $lt: cutoff }
				},
				{
					projection: { case_id: 1, dsa_id: 1, label: 1, created_at: 1 }
				}
			).toArray();

			if (candidates.length === 0) {
				logger.info('[QBC-archive] No expired quota_blocked cases to archive');
				return { archived: 0, candidates: 0, dsas_affected: 0 };
			}

			// Atomic bulk archive with a conditional filter — second line of
			// defense against double-archive on concurrent invocation (despite
			// the cronLock above).
			const updateResult = await Cases.updateMany(
				{
					stage: 'quota_blocked',
					is_archived: { $ne: true },
					created_at: { $lt: cutoff }
				},
				{
					$set: {
						is_archived: true,
						archived_at: now,
						archived_reason: 'quota_blocked_expired',
						updated_at: now
					}
				}
			);

			// Per-DSA breakdown for telemetry + email dispatch.
			const byDsa = new Map<string, number>();
			for (const c of candidates) {
				const key = c.dsa_id.toString();
				byDsa.set(key, (byDsa.get(key) ?? 0) + 1);
			}

			logger.info(
				{
					event: 'quota_blocked.archive_expired',
					archived: updateResult.modifiedCount,
					candidates: candidates.length,
					dsas_affected: byDsa.size,
					cutoff_iso: cutoff.toISOString(),
					age_days: ARCHIVE_AGE_DAYS
				},
				'[QBC-archive] Archived expired quota_blocked cases'
			);

			// Per-DSA notification — one email per affected DSA. Batched email
			// recipient lookup (single $in query) so a 100-DSA archive run
			// doesn't fan out into 100 round-trips. Best-effort: failures log
			// without rolling back the archive transition above.
			const dsaIds = [...byDsa.keys()].map((id) => new ObjectId(id));
			let emailsSent = 0;
			if (dsaIds.length > 0) {
				try {
					const dsaDocs = await DsaApplications.find(
						{ _id: { $in: dsaIds } },
						{ projection: { _id: 1, email: 1, name: 1 } }
					).toArray();

					for (const dsa of dsaDocs) {
						const archivedCount = byDsa.get(dsa._id.toString()) ?? 0;
						const to = dsa.email?.trim();
						if (!to || archivedCount === 0) continue;
						try {
							const r = await sendArchiveExpiredEmail({
								recipient: { to, name: dsa.name },
								archivedCount
							});
							if (r.success) emailsSent++;
							else {
								logger.warn(
									{ dsa_id: dsa._id.toString(), error: r.error },
									'[QBC-archive] Email dispatch returned failure'
								);
							}
						} catch (innerErr) {
							logger.warn(
								{ dsa_id: dsa._id.toString(), err: (innerErr as Error).message },
								'[QBC-archive] Per-DSA email send threw'
							);
						}
					}
				} catch (lookupErr) {
					logger.warn(
						{ err: (lookupErr as Error).message },
						'[QBC-archive] DSA recipient lookup failed — emails skipped'
					);
				}
			}

			return {
				archived: updateResult.modifiedCount,
				candidates: candidates.length,
				dsas_affected: byDsa.size,
				emails_sent: emailsSent
			};
		});

		if (result === null) {
			// Cron lock held by another run — skip cleanly.
			return apiOk({ skipped: true, reason: 'cron-lock-held' });
		}

		return apiOk(result);
	} catch (err) {
		return apiServerError(err, 'QBC archive cron failed');
	}
};
