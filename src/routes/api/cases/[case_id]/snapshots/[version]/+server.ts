/**
 * GET  /api/cases/[case_id]/snapshots/[version]
 * ══════════════════════════════════════════════════════════════════
 * Retrieve a specific snapshot version for a case.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { FormSnapshots } from '$lib/database/mongo.js';
import { resolveEffectiveDsaId, verifyCaseOwnership } from '$lib/server/caseHelpers.js';
import { requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import { resolveSnapshotPayload } from '$lib/server/csfle/index.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';

// ── GET — Get a specific snapshot version ───────────────────────

export const GET: RequestHandler = async ({ params, locals }) => {
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

		// ── Parse version param ─────────────────────────────────
		const version = parseInt(params.version, 10);
		if (isNaN(version) || version < 1) {
			return apiError('Invalid version number', 400);
		}

		// ── Fetch snapshot ──────────────────────────────────────
		const snapshot = await FormSnapshots.findOne({
			case_id: params.case_id,
			version
		});

		if (!snapshot) {
			return apiError(`Snapshot version ${version} not found`, 404);
		}

		// SEC-2 Phase C.2: resolve encrypted payload (or fall through
		// to plaintext for unbackfilled rows) and strip the Binary
		// field from the wire response — clients have no use for the
		// raw ciphertext.
		const payload = await resolveSnapshotPayload(snapshot);
		const { payload_encrypted: _ignored, ...rest } = snapshot as Record<string, unknown>;

		return apiOk({ ...rest, payload });
	} catch (err) {
		return apiServerError(err, 'Failed to fetch snapshot');
	}
};
