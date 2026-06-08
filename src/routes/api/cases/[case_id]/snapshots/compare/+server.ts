/**
 * GET  /api/cases/[case_id]/snapshots/compare?v1=1&v2=2
 * ══════════════════════════════════════════════════════════════════
 * Compare two snapshot versions for a case. Reports top-level key
 * differences (added, removed, changed) and verifies payload hash
 * integrity for both versions.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { FormSnapshots } from '$lib/database/mongo.js';
import { resolveEffectiveDsaId, verifyCaseOwnership } from '$lib/server/caseHelpers.js';
import { requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import { resolveSnapshotPayload } from '$lib/server/csfle/index.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { computePayloadHash, computeSnapshotDiff } from '$lib/server/snapshotHelpers.js';

// ── GET — Compare two snapshot versions ─────────────────────────

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
		const v1Param = url.searchParams.get('v1');
		const v2Param = url.searchParams.get('v2');

		if (!v1Param || !v2Param) {
			return apiError('Both v1 and v2 query parameters are required', 400);
		}

		const v1 = parseInt(v1Param, 10);
		const v2 = parseInt(v2Param, 10);

		if (isNaN(v1) || isNaN(v2) || v1 < 1 || v2 < 1) {
			return apiError('v1 and v2 must be positive integers', 400);
		}

		// ── Load both snapshots ─────────────────────────────────
		const [snapshot1, snapshot2] = await Promise.all([
			FormSnapshots.findOne({ case_id: params.case_id, version: v1 }),
			FormSnapshots.findOne({ case_id: params.case_id, version: v2 })
		]);

		if (!snapshot1) {
			return apiError(`Snapshot version ${v1} not found`, 404);
		}

		if (!snapshot2) {
			return apiError(`Snapshot version ${v2} not found`, 404);
		}

		// SEC-2 Phase C.2: resolve encrypted payload (or fall through
		// to plaintext for unbackfilled rows). Hash verification still
		// works because payload_hash is computed over the PLAINTEXT
		// payload — verifying after decrypt preserves AD-05 tamper
		// detection.
		const payload1 = await resolveSnapshotPayload(snapshot1);
		const payload2 = await resolveSnapshotPayload(snapshot2);

		// ── Verify hash integrity ───────────────────────────────
		const v1_hash_valid =
			payload1 !== null && computePayloadHash(payload1) === snapshot1.payload_hash;
		const v2_hash_valid =
			payload2 !== null && computePayloadHash(payload2) === snapshot2.payload_hash;

		// ── Compute diff ────────────────────────────────────────
		const diff = computeSnapshotDiff(payload1 ?? {}, payload2 ?? {});

		return apiOk({
			v1_version: v1,
			v2_version: v2,
			v1_hash_valid,
			v2_hash_valid,
			diff
		});
	} catch (err) {
		return apiServerError(err, 'Failed to compare snapshots');
	}
};
