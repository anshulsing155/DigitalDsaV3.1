/**
 * DATA-3 — Audit-log writes for `ArtifactDeletionLog`.
 *
 * Two operations:
 *
 *   `recordDeletionStart(payload)`   — write the audit row with status='in_flight'
 *                                       BEFORE the ImageKit call (spec §8).
 *                                       Returns the inserted _id for follow-up.
 *
 *   `recordDeletionOutcome(id, ...)` — update the row to status='success' or
 *                                       'failed' after the ImageKit call returns.
 *
 * Audit-log-first ordering is the spec's anti-loss guarantee: if Mongo
 * succeeds + ImageKit fails, we know exactly what to retry. If Mongo fails
 * before we call ImageKit, we never start the destructive operation. The
 * inverse (file gone, no record) is the failure mode we cannot recover from.
 *
 * Idempotency is enforced by a compound unique index on
 * `(case_id, document_checklist_id, attempt_n)`. Callers passing the same
 * tuple twice receive a duplicate-key error — callers handle it as
 * "already in flight, skip" rather than retrying.
 *
 * The collection is registered in `src/lib/database/mongo.ts` as
 * `ArtifactDeletionLogs`, with the unique compound index ensured at startup.
 *
 * All I/O goes through an injected `collection` arg so tests can pass a
 * fake. The default is the real exported collection — see `dbInstance.ts`.
 */

import type { Collection, MongoServerError } from 'mongodb';
import type { ArtifactDeletionLog, ExtractionStatus, DocumentTier } from './types.js';

/** Minimal collection shape we use. Lets tests inject a fake. */
export interface ArtifactDeletionLogCollection {
	insertOne: Collection<ArtifactDeletionLog>['insertOne'];
	updateOne: Collection<ArtifactDeletionLog>['updateOne'];
	findOne: Collection<ArtifactDeletionLog>['findOne'];
}

/** Args for the "I'm about to call ImageKit" pre-write. */
export interface RecordDeletionStartArgs {
	case_id: string;
	lender_application_id: string;
	document_checklist_id: string;
	doc_type: string;
	tier: DocumentTier;
	file_id: string;
	file_size: number;
	file_type: string;
	uploaded_at: Date;

	reason: ArtifactDeletionLog['reason'];
	extraction_status_at_delete: ExtractionStatus;
	verified_at: Date | null;
	retention_floor_days: number;

	actor: ArtifactDeletionLog['actor'];
	actor_id: string | null;

	attempt_n: number;
	now: Date;
}

/**
 * Write the in-flight audit row. Returns:
 *   { ok: true, id }       — row written, caller may now call ImageKit
 *   { ok: false, reason: 'duplicate' }   — (case_id, doc_id, attempt_n)
 *                                           already exists; skip the call
 *   { ok: false, reason: 'mongo_error' } — propagate to caller, NEVER call ImageKit
 *
 * Caller pattern:
 *   const pre = await recordDeletionStart(...)
 *   if (!pre.ok) { ...handle... return }
 *   const result = await imagekitDelete(file_id)
 *   await recordDeletionOutcome(pre.id, result.success, ...)
 */
export async function recordDeletionStart(
	collection: ArtifactDeletionLogCollection,
	args: RecordDeletionStartArgs
): Promise<
	| { ok: true; id: unknown }
	| { ok: false; reason: 'duplicate' | 'mongo_error'; error?: unknown }
> {
	const doc: ArtifactDeletionLog = {
		case_id: args.case_id,
		lender_application_id: args.lender_application_id,
		document_checklist_id: args.document_checklist_id,
		doc_type: args.doc_type,
		tier: args.tier,
		file_id: args.file_id,
		file_size: args.file_size,
		file_type: args.file_type,
		uploaded_at: args.uploaded_at,

		reason: args.reason,
		extraction_status_at_delete: args.extraction_status_at_delete,
		verified_at: args.verified_at,
		retention_floor_days: args.retention_floor_days,

		actor: args.actor,
		actor_id: args.actor_id,

		attempt_n: args.attempt_n,
		status: 'in_flight',
		imagekit_response: null,
		error_code: null,
		started_at: args.now,
		completed_at: null
	};

	try {
		const r = await collection.insertOne(doc);
		return { ok: true, id: r.insertedId };
	} catch (err) {
		if (isDuplicateKeyError(err)) {
			return { ok: false, reason: 'duplicate' };
		}
		return { ok: false, reason: 'mongo_error', error: err };
	}
}

/**
 * Args for the post-ImageKit outcome write. Either success (with optional
 * `imagekit_response` payload for forensic record-keeping) or failure
 * (with `error_code` + scrubbed `imagekit_response`).
 */
export interface RecordDeletionOutcomeArgs {
	id: unknown; // _id returned from recordDeletionStart
	now: Date;
	outcome:
		| { status: 'success'; imagekit_response: string | null }
		| { status: 'failed'; error_code: string; imagekit_response: string | null };
}

/**
 * Flip the audit row from `in_flight` → `success` / `failed`. Returns
 * `{ ok: true }` if the row was updated. `{ ok: false }` if the row was
 * not found (caller logs but does not retry — the audit is best-effort
 * once the destructive op has run).
 */
export async function recordDeletionOutcome(
	collection: ArtifactDeletionLogCollection,
	args: RecordDeletionOutcomeArgs
): Promise<{ ok: boolean; error?: unknown }> {
	const update =
		args.outcome.status === 'success'
			? {
					$set: {
						status: 'success' as const,
						completed_at: args.now,
						imagekit_response: args.outcome.imagekit_response
					}
				}
			: {
					$set: {
						status: 'failed' as const,
						completed_at: args.now,
						error_code: args.outcome.error_code,
						imagekit_response: args.outcome.imagekit_response
					}
				};

	try {
		const r = await collection.updateOne({ _id: args.id as never }, update);
		return { ok: r.matchedCount === 1 };
	} catch (err) {
		return { ok: false, error: err };
	}
}

/**
 * Scrub an arbitrary error/response into a string safe to persist. Caps
 * length so a giant stack trace doesn't bloat the audit collection.
 *
 * - Stringifies Error → `name: message`
 * - Stringifies object → JSON.stringify (best-effort)
 * - Truncates to 2 KB
 */
export function scrubResponse(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	let out: string;
	if (value instanceof Error) {
		out = `${value.name}: ${value.message}`;
	} else if (typeof value === 'string') {
		out = value;
	} else {
		try {
			out = JSON.stringify(value);
		} catch {
			out = String(value);
		}
	}
	// Cap at 2 KB. Audit log doesn't need full payload bodies.
	return out.length > 2048 ? out.slice(0, 2045) + '...' : out;
}

// ============================================================================
// Helpers
// ============================================================================

/** MongoDB duplicate-key error code (11000) detection across driver versions. */
function isDuplicateKeyError(err: unknown): err is MongoServerError {
	if (!err || typeof err !== 'object') return false;
	const e = err as { code?: number; codeName?: string };
	return e.code === 11000 || e.codeName === 'DuplicateKey';
}
