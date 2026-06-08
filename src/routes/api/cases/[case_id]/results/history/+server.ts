/**
 * GET  /api/cases/[case_id]/results/history — List version history
 * ══════════════════════════════════════════════════════════════════
 * Returns metadata-only list of lender-results snapshot versions.
 * Full payloads are excluded to keep responses lightweight.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { LenderResultsSnapshots } from '$lib/database/mongo.js';
import { resolveEffectiveDsaId, verifyCaseOwnership } from '$lib/server/caseHelpers.js';
import { requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';

// ── GET — List version history (metadata only) ─────────────────

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

		// ── Parse query params ──────────────────────────────────
		const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)));
		const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));

		// ── Fetch versions (exclude heavy fields) ───────────────
		const [versions, total] = await Promise.all([
			LenderResultsSnapshots.find(
				{ case_id: params.case_id },
				{
					projection: {
						payload: 0,
						payload_hash: 0,
						source_form_snapshot_hash: 0,
						created_by: 0
					}
				}
			)
				.sort({ version: -1 })
				.skip(offset)
				.limit(limit)
				.toArray(),
			LenderResultsSnapshots.countDocuments({ case_id: params.case_id })
		]);

		return apiOk({
			versions,
			pagination: {
				limit,
				offset,
				total,
				has_more: offset + versions.length < total
			}
		});
	} catch (err) {
		return apiServerError(err, 'Failed to fetch results history');
	}
};
