/**
 * GET  /api/cases/[case_id]/snapshots — List snapshots for a case
 * POST /api/cases/[case_id]/snapshots — Create a new snapshot
 * ══════════════════════════════════════════════════════════════════
 * Form snapshots are immutable, versioned records of form submission
 * data. Each snapshot includes a SHA-256 hash for tamper detection.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { FormSnapshots, Cases } from '$lib/database/mongo.js';
import { formSnapshotCreateSchema } from '$lib/schemas/formSnapshot.schema.js';
import {
	resolveEffectiveDsaId,
	verifyCaseOwnership,
	createTimelineEvent
} from '$lib/server/caseHelpers.js';
import { computePayloadHash } from '$lib/server/snapshotHelpers.js';
import { encryptSnapshotPayload, resolveSnapshotPayload } from '$lib/server/csfle/index.js';
import { blockDemoWrite, requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import {
	apiOk,
	apiError,
	apiValidationError,
	apiServerError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';

// ── GET — List snapshots ────────────────────────────────────────

export const GET: RequestHandler = async ({ params, locals, url }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'form_view');
	if (permDenied) return permDenied;

	try {
		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}

		const ownership = await verifyCaseOwnership(params.case_id, result.dsaId);
		if (!ownership.ok) {
			const status = ownership.error === 'Case not found' ? 404 : 403;
			return apiError(ownership.error, status);
		}

		// ── Parse query params ──────────────────────────────────
		const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)));
		const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));

		// ── Fetch snapshots ─────────────────────────────────────
		const [snapshots, total] = await Promise.all([
			FormSnapshots.find({ case_id: params.case_id })
				.sort({ version: -1 })
				.skip(offset)
				.limit(limit)
				.toArray(),
			FormSnapshots.countDocuments({ case_id: params.case_id })
		]);

		// SEC-2 Phase C.2: resolve each snapshot's payload via the
		// helper (encrypted preferred, plaintext fallback) and strip
		// the encrypted Binary field from the wire response. Binary
		// would JSON-serialize to bulky EJSON and leak the ciphertext
		// to clients with no benefit. After the cleanup migration
		// (plaintext field dropped), resolveSnapshotPayload remains
		// the only correct way to read.
		//
		// RESILIENCE (2026-06-02): wrap per-snapshot in try/catch. A single
		// stale-ciphertext row (Pitfall #68 fallout — snapshot written when
		// CSFLE_ENABLED was true, now reading with it unset) used to 500 the
		// entire list because Promise.all surfaces the first rejection. With
		// the per-row catch, the consumer gets the rest of the snapshots +
		// a `decrypt_error` marker on the bad one — graceful degradation
		// instead of total endpoint failure. The fail-loud principle still
		// applies inside resolveSnapshotPayload; we just don't let one bad
		// row blast the whole "Load from Previous Case" modal.
		const resolvedSnapshots = await Promise.all(
			snapshots.map(async (s) => {
				const { payload_encrypted: _ignored, ...rest } = s as Record<string, unknown>;
				try {
					const payload = await resolveSnapshotPayload(s);
					return { ...rest, payload };
				} catch (decryptErr) {
					// Stale-ciphertext fallback: snapshots written during the CSFLE-on
					// window (2026-05-18 → 2026-06-01) carry both payload_encrypted
					// (now-undecryptable) AND plaintext payload (dual-write was
					// active during that window). resolveSnapshotPayload is fail-loud
					// per design, but in the listing endpoint we'd rather degrade to
					// plaintext than 500 the whole "Load from Previous Case" modal.
					// If the row has plaintext, use it — that's the source of truth
					// in passthrough mode. If it doesn't, surface decrypt_error so
					// the client can render a "snapshot can't be loaded" affordance.
					const plaintextFallback =
						(s as { payload?: Record<string, unknown> | null }).payload ?? null;
					// M-PM1 (code-review 2026-06-02 PM): don't surface the raw
					// decrypt error message to the client — the underlying crypto
					// library can throw errors carrying key IDs, algorithm names, or
					// MongoDB CSFLE metadata. Auth-gated, but still infrastructure
					// detail that doesn't belong in a DSA-visible response. Log the
					// real error server-side and return a fixed enum string.
					logger.warn(
						{
							err: decryptErr,
							case_id: params.case_id,
							snapshot_version: (s as { version?: number }).version
						},
						'[snapshots] per-row decrypt fallback fired'
					);
					return {
						...rest,
						payload: plaintextFallback,
						decrypt_error:
							plaintextFallback !== null
								? 'snapshot_decrypt_failed_used_plaintext'
								: 'snapshot_decrypt_failed_no_fallback',
						used_plaintext_fallback: plaintextFallback !== null
					};
				}
			})
		);

		return apiOk({
			snapshots: resolvedSnapshots,
			pagination: {
				limit,
				offset,
				total,
				has_more: offset + snapshots.length < total
			}
		});
	} catch (err) {
		return apiServerError(err, 'Failed to fetch snapshots');
	}
};

// ── POST — Create a new snapshot ────────────────────────────────

export const POST: RequestHandler = async ({ params, locals, request }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'form_view');
	if (permDenied) return permDenied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}

		const ownership = await verifyCaseOwnership(params.case_id, result.dsaId);
		if (!ownership.ok) {
			const status = ownership.error === 'Case not found' ? 404 : 403;
			return apiError(ownership.error, status);
		}

		// ── Parse & validate body ───────────────────────────────
		const parsed = formSnapshotCreateSchema.safeParse({
			...jsonParsed.data,
			case_id: params.case_id
		});

		if (!parsed.success) {
			return apiValidationError('Validation failed', parsed.error.flatten());
		}

		const { payload, change_summary } = parsed.data;

		// ── Determine next version ──────────────────────────────
		const latestSnapshot = await FormSnapshots.findOne(
			{ case_id: params.case_id },
			{ sort: { version: -1 }, projection: { version: 1 } }
		);
		const version = latestSnapshot ? latestSnapshot.version + 1 : 1;

		// ── Compute hash ────────────────────────────────────────
		const payload_hash = computePayloadHash(payload);

		// ── Build snapshot document ─────────────────────────────
		// SEC-2 Phase C.2: dual-write — populate both plaintext `payload`
		// and encrypted `payload_encrypted`. encryptSnapshotPayload
		// returns null when CSFLE is disabled (safe pre-DEK-init deploy).
		// Read sites currently use plaintext; resolveSnapshotPayload
		// helper will be wired up in the read-migration commit.
		const now = new Date();
		const payload_encrypted = await encryptSnapshotPayload(payload as Record<string, unknown>);
		const snapshot = {
			case_id: params.case_id,
			version,
			payload,
			payload_encrypted,
			payload_hash,
			created_by: result.dsaId,
			created_at: now,
			...(change_summary ? { change_summary } : {})
		};

		// ── Insert snapshot ─────────────────────────────────────
		const insertResult = await FormSnapshots.insertOne(snapshot as any);

		// ── Update case with latest snapshot info ────────────────
		await Cases.updateOne(
			{ case_id: params.case_id },
			{
				$set: {
					form_snapshot_version: version,
					form_snapshot_hash: payload_hash,
					updated_at: now
				}
			}
		);

		// ── Create timeline event ───────────────────────────────
		await createTimelineEvent(params.case_id, 'form_updated', `Form snapshot v${version} created`, {
			version,
			payload_hash,
			change_summary: change_summary || undefined
		});

		return apiOk({ ...snapshot, _id: insertResult.insertedId }, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to create snapshot');
	}
};
