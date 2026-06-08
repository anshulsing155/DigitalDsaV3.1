/**
 * D.1 S3 — Global cron lock with heartbeat extension
 * ══════════════════════════════════════════════════════════════════
 * Prevents two simultaneous cron runs from processing the same eligible
 * subscriptions. Important because:
 *   - Vercel can invoke a scheduled function from multiple regions on a
 *     re-deploy or warm-up race
 *   - An external scheduler (per S3 I-5 owner decision: Free-tier Vercel
 *     means we hit /api/cron/* from cron-job.org or equivalent) may
 *     retry on a 5xx response
 *   - The charge cron is the ONE place double-execution = double-charge,
 *     so belt-and-suspenders matters: ChargeAttempts (subscription_id,
 *     cycle_anchor) catches a duplicate at the application layer, AND
 *     this lock catches it at the cron-batch layer.
 *
 * HEARTBEAT PATTERN (spec R14)
 * ──────────────────────────────
 * A static long TTL (say 30 min) holds the lock past cron completion if
 * the process crashes — the next tick has to wait it out. A static short
 * TTL (say 30 s) releases mid-cron if the batch runs long. Neither is
 * acceptable for charge cron. Instead:
 *
 *   1. acquireCronLock acquires with a SHORT TTL (5 min default)
 *   2. The caller starts a heartbeat (setInterval) that calls
 *      extendCronLock every ~60 s to push expires_at forward
 *   3. On normal completion the caller releases the lock
 *   4. On crash, the lock expires within 5 min and the next tick can
 *      acquire — no permanent stuck-lock scenario
 *
 * The atomic findOneAndUpdate with a precondition on (released_at OR
 * expires_at < now) is what makes acquire safe under concurrency: only
 * one caller observes the success path; the rest get null and exit clean.
 * ══════════════════════════════════════════════════════════════════
 */

import { randomUUID } from 'node:crypto';
import { CronLocks } from '$lib/database/mongo';
import type { CronLockDoc } from '$lib/types/billingSubscription';
import logger from '$lib/server/logger';

/**
 * Default lock TTL — long enough that a 60s heartbeat keeps us comfortably
 * ahead, short enough that a crashed cron unblocks within 5 min.
 */
export const DEFAULT_LOCK_TTL_MS = 5 * 60 * 1000;

/**
 * Default heartbeat cadence — every 60 s the holder extends the lock by
 * another DEFAULT_LOCK_TTL_MS. Caller starts/stops the interval; this
 * module only knows about the extend call.
 */
export const DEFAULT_HEARTBEAT_MS = 60 * 1000;

/** Opaque handle returned by acquireCronLock — pass back to extend/release. */
export interface CronLockHandle {
	name: string;
	holder_id: string;
}

/**
 * Try to acquire a named cron lock. Returns the handle on success, null
 * if another holder currently has it.
 *
 * Concurrency model:
 *   - findOneAndUpdate with upsert
 *   - The filter matches if the lock doesn't exist OR is released OR is
 *     past its expires_at (orphaned by a crashed cron)
 *   - The $set installs a fresh holder_id + a fresh expires_at
 *   - If the filter doesn't match (another live holder), the upsert path
 *     would try to insert a duplicate `name` — that's caught by the
 *     unique index and we treat it as "someone else has it"
 *
 * The unique index on `name` is what makes the race safe — two callers
 * cannot both insert; one wins, the other sees E11000 and returns null.
 */
export async function acquireCronLock(
	name: string,
	ttlMs: number = DEFAULT_LOCK_TTL_MS,
	now: Date = new Date()
): Promise<CronLockHandle | null> {
	const holder_id = randomUUID();
	const expires_at = new Date(now.getTime() + ttlMs);

	try {
		const result = await CronLocks.findOneAndUpdate(
			{
				name,
				$or: [
					{ released_at: { $ne: null } },
					{ released_at: null, expires_at: { $lt: now } }
				]
			},
			{
				$set: {
					holder_id,
					acquired_at: now,
					expires_at,
					released_at: null
				},
				$setOnInsert: { name }
			},
			{ upsert: true, returnDocument: 'after' }
		);

		if (result && result.holder_id === holder_id) {
			logger.info({ name, holder_id, expires_at }, 'cronLock: acquired');
			return { name, holder_id };
		}

		// findOneAndUpdate matched + updated but assigned a different holder
		// (theoretical interleaving). Treat as contention.
		logger.info({ name, current_holder: result?.holder_id }, 'cronLock: contention');
		return null;
	} catch (err) {
		const e = err as { code?: number; message?: string };
		// E11000 — the unique index on `name` blocked our upsert because
		// another live holder beat us to it. This is the expected race.
		if (e.code === 11000) {
			logger.info({ name }, 'cronLock: contention (E11000)');
			return null;
		}
		logger.error({ name, err: e.message }, 'cronLock: acquire error');
		throw err;
	}
}

/**
 * Extend a held lock's expires_at. The holder MUST call this periodically
 * (DEFAULT_HEARTBEAT_MS = 60 s) for the lifetime of the batch. Returns
 * false if the lock is no longer ours (stale heartbeat after crash + new
 * acquire by another process); caller should treat as fatal and abort
 * the in-progress batch — another process is processing it.
 */
export async function extendCronLock(
	handle: CronLockHandle,
	ttlMs: number = DEFAULT_LOCK_TTL_MS,
	now: Date = new Date()
): Promise<boolean> {
	const new_expires_at = new Date(now.getTime() + ttlMs);
	const result = await CronLocks.findOneAndUpdate(
		{ name: handle.name, holder_id: handle.holder_id, released_at: null },
		{ $set: { expires_at: new_expires_at } },
		{ returnDocument: 'after' }
	);
	if (!result) {
		logger.warn(
			{ name: handle.name, holder_id: handle.holder_id },
			'cronLock: heartbeat extend FAILED — lock no longer ours'
		);
		return false;
	}
	return true;
}

/**
 * Release a held lock. Sets released_at; the row stays for the next
 * acquire's precondition probe. Returns false if the lock was not ours
 * (e.g. already released, or hijacked) — non-fatal, just log.
 */
export async function releaseCronLock(
	handle: CronLockHandle,
	now: Date = new Date()
): Promise<boolean> {
	const result = await CronLocks.findOneAndUpdate(
		{ name: handle.name, holder_id: handle.holder_id, released_at: null },
		{ $set: { released_at: now } },
		{ returnDocument: 'after' }
	);
	if (!result) {
		logger.info(
			{ name: handle.name, holder_id: handle.holder_id },
			'cronLock: release no-op (lock not ours)'
		);
		return false;
	}
	logger.info({ name: handle.name, holder_id: handle.holder_id }, 'cronLock: released');
	return true;
}

/**
 * Helper for the common cron pattern:
 *   const lock = await acquireCronLock('billing-charge')
 *   if (!lock) return early
 *   const interval = setInterval(() => extendCronLock(lock), 60_000)
 *   try { ...batch... } finally { clearInterval(interval); await releaseCronLock(lock) }
 *
 * `withCronLock` wraps that boilerplate. The work function receives a
 * `shouldAbort()` callback so long batches can self-check on heartbeat
 * failure (e.g. between subscription-row processing iterations).
 */
export async function withCronLock<T>(
	name: string,
	work: (ctx: { shouldAbort: () => boolean }) => Promise<T>,
	options: {
		ttlMs?: number;
		heartbeatMs?: number;
		now?: Date;
	} = {}
): Promise<{ acquired: false } | { acquired: true; result: T }> {
	const ttlMs = options.ttlMs ?? DEFAULT_LOCK_TTL_MS;
	const heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
	const handle = await acquireCronLock(name, ttlMs, options.now);
	if (!handle) return { acquired: false };

	let abort = false;
	const interval: NodeJS.Timeout = setInterval(() => {
		extendCronLock(handle, ttlMs).then(
			(ok) => {
				if (!ok) abort = true;
			},
			(err) => {
				logger.error({ name, err: (err as Error).message }, 'cronLock: heartbeat error');
				abort = true;
			}
		);
	}, heartbeatMs);

	try {
		const result = await work({ shouldAbort: () => abort });
		return { acquired: true, result };
	} finally {
		clearInterval(interval);
		await releaseCronLock(handle).catch((err: unknown) => {
			logger.error(
				{ name, err: (err as Error).message },
				'cronLock: release error (non-fatal)'
			);
		});
	}
}
