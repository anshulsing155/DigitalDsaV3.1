/**
 * GET  /api/cases/[case_id]/timeline
 * ══════════════════════════════════════════════════════════════════
 * Get paginated timeline events for a case, sorted by created_at
 * descending (most recent first).
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { TimelineEvents } from '$lib/database/mongo.js';
import { resolveEffectiveDsaId, verifyCaseOwnership } from '$lib/server/caseHelpers.js';
import { requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';

// ── GET — Get timeline events ───────────────────────────────────

export const GET: RequestHandler = async ({ params, locals, url }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'cases_view');
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
		const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
		const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));

		// ── Fetch events ────────────────────────────────────────
		const [events, total] = await Promise.all([
			TimelineEvents.find({ case_id: params.case_id })
				.sort({ created_at: -1 })
				.skip(offset)
				.limit(limit)
				.toArray(),
			TimelineEvents.countDocuments({ case_id: params.case_id })
		]);

		return apiOk({
			events,
			pagination: {
				limit,
				offset,
				total,
				has_more: offset + events.length < total
			}
		});
	} catch (err) {
		return apiServerError(err, 'Failed to fetch timeline events');
	}
};
