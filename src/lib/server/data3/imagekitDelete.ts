/**
 * DATA-3 — ImageKit delete wrapper with retry / backoff / classification.
 *
 * Wraps `imagekit.files.delete(fileId)` in our retry policy (3 attempts,
 * exponential 10s / 60s / 300s). Translates SDK outcomes into a discriminated
 * union the sweep job can pattern-match on:
 *
 *   { kind: 'success' }                  — 200 from ImageKit (file gone)
 *   { kind: 'already_deleted' }          — 404 from ImageKit. Spec §8: treat as success.
 *   { kind: 'transient_failure' }        — 5xx, network error, timeout. Retry-eligible.
 *   { kind: 'permanent_failure', code }  — 4xx other than 404. Abandon immediately.
 *
 * The function takes the ImageKit client as an argument so tests can pass a
 * fake. The default-export `imagekit` from `$lib/imagekit/server.ts` is the
 * production injection.
 *
 * The retry loop itself respects the policy but uses an injectable `sleep`
 * so tests can run without burning real seconds. Production passes
 * `(ms) => new Promise(r => setTimeout(r, ms))`.
 */

import { scrubResponse } from './auditLog.js';

/** Discriminated outcome of a single ImageKit delete attempt. */
export type ImagekitDeleteOutcome =
	| { kind: 'success'; imagekit_response: string | null }
	| { kind: 'already_deleted'; imagekit_response: string | null }
	| { kind: 'transient_failure'; imagekit_response: string | null; error_code: string }
	| { kind: 'permanent_failure'; imagekit_response: string | null; error_code: string };

/** Minimal client shape we need — lets us pass a fake in tests. */
export interface ImagekitDeleteClient {
	files: { delete: (fileId: string) => Promise<unknown> };
}

/** Outcome after the retry policy resolves (success / already-deleted / abandoned). */
export type FinalDeletionOutcome =
	| { kind: 'success'; attempts: number; imagekit_response: string | null }
	| { kind: 'already_deleted'; attempts: number; imagekit_response: string | null }
	| { kind: 'abandoned'; attempts: number; lastError: string; error_code: string };

/** Default retry delays in ms — 10s / 60s / 300s = ~6 minutes total. */
export const DEFAULT_RETRY_DELAYS_MS = [10_000, 60_000, 300_000] as const;

/** Default sleeper for production. */
const realSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export interface DeleteWithRetryOpts {
	client: ImagekitDeleteClient;
	fileId: string;
	/** Per-attempt outcome hook. Sweep job uses this to write audit rows. */
	onAttempt?: (attempt: number, outcome: ImagekitDeleteOutcome) => Promise<void> | void;
	/** Override for tests. Default: 10s / 60s / 300s. */
	retryDelaysMs?: readonly number[];
	/** Sleep implementation (tests pass a no-op). */
	sleep?: (ms: number) => Promise<void>;
}

/**
 * Single attempt — classify the SDK call's outcome.
 *
 * Status code detection across `@imagekit/nodejs` v7: the SDK throws on
 * non-2xx. The thrown error usually carries `status` (HTTP code) on the
 * Error object. We're defensive — if the shape doesn't match, fall back to
 * "transient" so the retry loop has a chance.
 */
export async function attemptDelete(
	client: ImagekitDeleteClient,
	fileId: string
): Promise<ImagekitDeleteOutcome> {
	try {
		const r = await client.files.delete(fileId);
		return { kind: 'success', imagekit_response: scrubResponse(r) };
	} catch (err) {
		const status = readStatus(err);
		const responseText = scrubResponse(err);

		// 404 → file already gone. Spec §8: treat as success for idempotency.
		if (status === 404) {
			return { kind: 'already_deleted', imagekit_response: responseText };
		}

		// 5xx + network errors → retryable.
		if (status === null || status === 0 || status >= 500) {
			return {
				kind: 'transient_failure',
				imagekit_response: responseText,
				error_code: status === null ? 'NETWORK' : `IMAGEKIT_${status}`
			};
		}

		// Other 4xx (401/403 = bad credentials, 400 = malformed fileId) →
		// no point retrying. Abandon immediately.
		return {
			kind: 'permanent_failure',
			imagekit_response: responseText,
			error_code: `IMAGEKIT_${status}`
		};
	}
}

/**
 * Driver: tries up to `retryDelaysMs.length + 1` times (initial + retries),
 * pausing between attempts. Returns the final outcome.
 *
 * Each attempt's classified outcome is reported to `onAttempt(n, outcome)`
 * synchronously so the caller can write audit rows in lockstep. The caller
 * is responsible for transitioning the checklist row's state.
 *
 * @example
 *   const result = await deleteWithRetry({
 *     client: imagekit,
 *     fileId: 'IK-abc',
 *     onAttempt: async (n, outcome) => {
 *       // Write start row, then update with outcome
 *       const pre = await recordDeletionStart(..., { attempt_n: n })
 *       if (pre.ok) await recordDeletionOutcome(..., ...)
 *     }
 *   })
 *   if (result.kind === 'success' || result.kind === 'already_deleted') {
 *     // $unset upload + flip status to 'deleted'
 *   } else {
 *     // status → deletion_abandoned, page ops
 *   }
 */
export async function deleteWithRetry(opts: DeleteWithRetryOpts): Promise<FinalDeletionOutcome> {
	const {
		client,
		fileId,
		onAttempt,
		retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
		sleep = realSleep
	} = opts;

	const maxAttempts = retryDelaysMs.length + 1;
	let lastOutcome: ImagekitDeleteOutcome | null = null;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const outcome = await attemptDelete(client, fileId);
		lastOutcome = outcome;

		// Report to caller for audit-log write.
		if (onAttempt) await onAttempt(attempt, outcome);

		// Terminal-success outcomes resolve immediately.
		if (outcome.kind === 'success') {
			return {
				kind: 'success',
				attempts: attempt,
				imagekit_response: outcome.imagekit_response
			};
		}
		if (outcome.kind === 'already_deleted') {
			return {
				kind: 'already_deleted',
				attempts: attempt,
				imagekit_response: outcome.imagekit_response
			};
		}

		// Permanent failure — abandon immediately (no further retries).
		if (outcome.kind === 'permanent_failure') {
			return {
				kind: 'abandoned',
				attempts: attempt,
				lastError: outcome.imagekit_response ?? 'permanent_failure',
				error_code: outcome.error_code
			};
		}

		// Transient failure — sleep before next attempt (if any remain).
		if (attempt < maxAttempts) {
			await sleep(retryDelaysMs[attempt - 1]);
		}
	}

	// Exhausted retries on transient failures.
	return {
		kind: 'abandoned',
		attempts: maxAttempts,
		lastError: lastOutcome?.imagekit_response ?? 'retries_exhausted',
		error_code:
			(lastOutcome &&
				(lastOutcome.kind === 'transient_failure'
					? lastOutcome.error_code
					: lastOutcome.kind === 'permanent_failure'
						? lastOutcome.error_code
						: 'UNKNOWN')) ??
			'UNKNOWN'
	};
}

// ============================================================================
// Internals
// ============================================================================

/**
 * Extract HTTP status from a thrown SDK error. The ImageKit SDK and our
 * wrapping fetch errors both surface `status` on the Error object, but
 * across versions / network failures the shape varies — be defensive.
 *
 * Returns:
 *   - integer status if found (e.g. 404, 500)
 *   - `null` for network errors (no status — connect failed, etc.)
 */
function readStatus(err: unknown): number | null {
	if (!err || typeof err !== 'object') return null;
	const e = err as { status?: unknown; statusCode?: unknown; response?: { status?: unknown } };
	if (typeof e.status === 'number') return e.status;
	if (typeof e.statusCode === 'number') return e.statusCode;
	if (e.response && typeof e.response.status === 'number') return e.response.status;
	return null;
}
