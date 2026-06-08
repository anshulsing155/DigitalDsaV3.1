/**
 * POST /api/cron/billing-reconcile (D.1 S7)
 * ══════════════════════════════════════════════════════════════════
 * Daily reconciliation: compares the provider's settlement report for
 * the prior IST calendar day against our BillingTransactions in the
 * same window. Persists a ReconciliationRuns row + emails admin on
 * drift > 0.
 *
 * Schedule: 04:00 IST = 22:30 UTC. Razorpay's settlement batch closes
 * at ~23:30 IST per spec §4 S7; running at 04:00 IST gives a healthy
 * 4.5-hour buffer past the cutoff.
 *
 * Auth: x-cron-secret header (same pattern as billing-charge et al).
 *
 * Concurrency: cronLock 'billing-reconcile' prevents double-runs from
 * region race or external scheduler retry. The unique index on
 * `(run_date, provider)` in ReconciliationRuns is a second line of
 * defense — a duplicate insert returns E11000 which we treat as
 * "already reconciled" and exit clean.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S7
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse';
import logger from '$lib/server/logger';
import { env } from '$env/dynamic/private';
import { withCronLock } from '$lib/server/billing/cronLock';
import {
	reconcileSettlements,
	priorIstDayWindow
} from '$lib/server/billing/reconcileEngine';
import { sendReconciliationDriftEmail } from '$lib/server/billing/reconciliationEmail';
import { getBillingProvider } from '$lib/server/billing/providerRegistry';
import { BillingTransactions, ReconciliationRuns } from '$lib/database/mongo';
import {
	severityOf,
	type ReconciliationRunDoc
} from '$lib/types/reconciliation';
import { writeBillingAuditLog } from '$lib/server/billing/billingAuditLog';

const CRON_SECRET = env.CRON_SECRET || '';

export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('x-cron-secret') ?? '';
	if (!CRON_SECRET || authHeader !== CRON_SECRET) {
		return apiError('Unauthorized', 401);
	}

	try {
		const runAt = new Date();
		const window = priorIstDayWindow(runAt);

		const lockResult = await withCronLock('billing-reconcile', async () => {
			const provider = getBillingProvider();

			// Idempotency: if a run for today's (date, provider) already
			// exists, exit clean. The unique index also enforces this at
			// the DB level — this check is just to avoid the provider fetch.
			const existing = await ReconciliationRuns.findOne({
				run_date: window.date_iso,
				provider: provider.name
			});
			if (existing) {
				return {
					skipped: 'already_run',
					run_date: window.date_iso,
					prior_run_id: existing._id?.toString()
				};
			}

			// Fetch the provider's settlement report for the IST day. The
			// provider's fetchSettlements helper computes the same window
			// internally; we pass any timestamp inside the target IST day.
			// Use the window midpoint so DST-style edge cases (n/a for IST,
			// but defensive) all converge.
			const istMidpoint = new Date((window.from.getTime() + window.to.getTime()) / 2);
			const settlements = await provider.fetchSettlements(istMidpoint);

			// Load our BillingTransactions whose created_at falls in the same
			// window. Index on created_at would help here at scale; for v1
			// volumes a collection scan is fine and a future migration can
			// add it without changing the engine.
			const transactions = await BillingTransactions.find({
				created_at: { $gte: window.from, $lte: window.to }
			}).toArray();

			const result = reconcileSettlements({
				settlements,
				transactions,
				now: runAt
			});

			const status = severityOf(result.discrepancies);

			// Persist the run BEFORE attempting the email so a transient
			// email failure doesn't lose the reconciliation record.
			const runDoc: ReconciliationRunDoc = {
				run_date: window.date_iso,
				run_at: runAt,
				window_from: window.from,
				window_to: window.to,
				status,
				provider_entries: result.provider_entries,
				our_transactions: result.our_transactions,
				matched: result.matched,
				counts: result.counts,
				discrepancies: result.discrepancies,
				drift_email_sent: false,
				provider: provider.name
			};
			try {
				await ReconciliationRuns.insertOne(runDoc);
			} catch (err) {
				// E11000 — concurrent invocation beat us to the insert.
				const e = err as { code?: number };
				if (e.code === 11000) {
					logger.info(
						{ run_date: window.date_iso },
						'billing-reconcile: concurrent insert lost race — exit clean'
					);
					return {
						skipped: 'concurrent_insert',
						run_date: window.date_iso
					};
				}
				throw err;
			}

			// Email admin on drift only.
			let driftEmailSent = false;
			if (status !== 'clean') {
				try {
					const emailResult = await sendReconciliationDriftEmail(runDoc);
					driftEmailSent = emailResult.success;
					if (!emailResult.success) {
						logger.warn(
							{ run_date: window.date_iso, error: emailResult.error },
							'billing-reconcile: drift email failed (run row persisted; admin can read from view)'
						);
					} else {
						// Stamp the flag so the admin view shows "email sent".
						await ReconciliationRuns.updateOne(
							{ _id: runDoc._id },
							{ $set: { drift_email_sent: true } }
						);
					}
				} catch (err) {
					logger.error(
						{ run_date: window.date_iso, err: (err as Error).message },
						'billing-reconcile: drift email threw — run row persisted, operator must read view'
					);
				}
			}

			await writeBillingAuditLog({
				event_class: 'cron_run',
				event_name: 'billing-reconcile',
				actor: 'cron',
				payload: {
					run_date: window.date_iso,
					status,
					provider_entries: result.provider_entries,
					our_transactions: result.our_transactions,
					matched: result.matched,
					counts: result.counts,
					drift_email_sent: driftEmailSent
				}
			});

			return {
				run_date: window.date_iso,
				status,
				provider_entries: result.provider_entries,
				our_transactions: result.our_transactions,
				matched: result.matched,
				counts: result.counts,
				drift_email_sent: driftEmailSent
			};
		});

		if (!lockResult.acquired) {
			logger.info(
				{ run_at: runAt.toISOString() },
				'billing-reconcile: lock contention — another invocation running'
			);
			return apiOk({
				skipped: 'lock_contention',
				started_at: runAt.toISOString()
			});
		}

		logger.info(
			{ ...lockResult.result, started_at: runAt.toISOString() },
			'billing-reconcile: batch complete'
		);

		return apiOk({
			...lockResult.result,
			started_at: runAt.toISOString(),
			completed_at: new Date().toISOString()
		});
	} catch (err) {
		return apiServerError(err, 'billing-reconcile cron failed');
	}
};
