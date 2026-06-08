/**
 * GET  /api/cases/[case_id]/results — Get latest (or specific) results snapshot
 * POST /api/cases/[case_id]/results — Store new evaluation results snapshot
 * ══════════════════════════════════════════════════════════════════
 * Lender results snapshots are immutable, versioned records of
 * eligibility evaluations. Each snapshot includes a SHA-256 hash
 * for tamper detection and per-lender change deltas from the
 * previous version.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { LenderResultsSnapshots, Cases } from '$lib/database/mongo.js';
import { lenderResultsSnapshotCreateSchema } from '$lib/schemas/lenderResultsSnapshot.schema.js';
import {
	resolveEffectiveDsaId,
	verifyCaseOwnership,
	createTimelineEvent
} from '$lib/server/caseHelpers.js';
import { computePayloadHash } from '$lib/server/snapshotHelpers.js';
import { computeChangeDeltas } from '$lib/server/lenderResultsHelpers.js';
import { blockDemoWrite, requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import type { LenderResultsData } from '$lib/types/lenderResults.js';
import {
	apiOk,
	apiError,
	apiValidationError,
	apiServerError,
	parseJsonBody
} from '$lib/server/apiResponse.js';

// ── GET — Get latest results snapshot (or specific version) ─────

export const GET: RequestHandler = async ({ params, locals, url }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'results_view');
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

		// ── Parse optional version query param ──────────────────
		const versionParam = url.searchParams.get('version');
		const version = versionParam ? parseInt(versionParam, 10) : null;

		// ── Fetch snapshot and total count ───────────────────────
		const [snapshot, total_versions] = await Promise.all([
			version !== null
				? LenderResultsSnapshots.findOne({ case_id: params.case_id, version })
				: LenderResultsSnapshots.findOne({ case_id: params.case_id }, { sort: { version: -1 } }),
			LenderResultsSnapshots.countDocuments({ case_id: params.case_id })
		]);

		// ── Load lender selections from case document ───────────
		const selections = ownership.caseDoc.lender_selections ?? [];

		if (!snapshot) {
			return apiOk({ snapshot: null, total_versions: 0, selections: [] });
		}

		return apiOk({
			snapshot,
			total_versions,
			selections
		});
	} catch (err) {
		return apiServerError(err, 'Failed to fetch results snapshot');
	}
};

// ── POST — Store new evaluation results ─────────────────────────

export const POST: RequestHandler = async ({ params, locals, request }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'results_view');
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
		const parsed = lenderResultsSnapshotCreateSchema.safeParse({
			...jsonParsed.data,
			case_id: params.case_id
		});

		if (!parsed.success) {
			return apiValidationError('Validation failed', parsed.error.flatten());
		}

		const {
			payload,
			source_form_snapshot_version,
			source_form_snapshot_hash,
			trigger,
			change_summary
		} = parsed.data;

		// ── Determine next version ──────────────────────────────
		const latestSnapshot = await LenderResultsSnapshots.findOne(
			{ case_id: params.case_id },
			{ sort: { version: -1 } }
		);
		const version = latestSnapshot ? latestSnapshot.version + 1 : 1;

		// ── Compute hash ────────────────────────────────────────
		const payload_hash = computePayloadHash(payload);

		// ── Compute change deltas ───────────────────────────────
		const prevPayload = latestSnapshot ? (latestSnapshot.payload as LenderResultsData) : null;
		const change_deltas = computeChangeDeltas(prevPayload, payload as LenderResultsData);

		// ── Build snapshot document ─────────────────────────────
		const now = new Date();
		const snapshot = {
			case_id: params.case_id,
			version,
			payload: payload as LenderResultsData,
			payload_hash,
			source_form_snapshot_version,
			source_form_snapshot_hash,
			change_deltas,
			trigger,
			created_by: result.dsaId,
			created_at: now,
			...(change_summary ? { change_summary } : {})
		};

		// ── Insert snapshot ─────────────────────────────────────
		const insertResult = await LenderResultsSnapshots.insertOne(snapshot as any);

		// ── Update case with latest results info ────────────────
		await Cases.updateOne(
			{ case_id: params.case_id, dsa_id: result.dsaId },
			{
				$set: {
					results_snapshot_version: version,
					results_snapshot_hash: payload_hash,
					updated_at: now
				}
			}
		);

		// ── Create timeline event ───────────────────────────────
		const eventType = version === 1 ? 'results_evaluated' : 'results_refreshed';
		const description =
			version === 1
				? `Lender results evaluated (v${version})`
				: `Lender results refreshed (v${version})`;

		await createTimelineEvent(params.case_id, eventType, description, {
			version,
			payload_hash,
			source_form_snapshot_version,
			trigger,
			change_deltas_count: change_deltas.length,
			change_summary: change_summary || undefined
		});

		return apiOk({ ...snapshot, _id: insertResult.insertedId }, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to create results snapshot');
	}
};
