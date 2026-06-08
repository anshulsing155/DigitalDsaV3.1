/**
 * GET /api/share-link/list
 * ═══════════════════════════════════════════════════════════════════
 * Lists all share links created by the authenticated DSA.
 * Supports optional status filter via query param.
 *
 * Query params:
 *   - status?: 'active' | 'expired' | 'completed' | 'revoked'
 *
 * Response:
 *   - success: boolean
 *   - data: { links: FormShareLink[] }
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { getLinksForDsa } from '$lib/server/shareLinks.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { apiOk, apiServerError } from '$lib/server/apiResponse.js';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;

	try {
		const userId = (locals.user as any)._id?.toString() || (locals.user as any).userId || '';
		const statusFilter = url.searchParams.get('status') || undefined;

		const links = await getLinksForDsa(userId, statusFilter);

		return apiOk({ links });
	} catch (error) {
		return apiServerError(error, 'Failed to load share links');
	}
};
