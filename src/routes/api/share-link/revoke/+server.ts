/**
 * POST /api/share-link/revoke
 * ═══════════════════════════════════════════════════════════════════
 * Deactivates a share link. Requires authenticated DSA user.
 *
 * Request body:
 *   - token: string
 *
 * Response:
 *   - success: boolean
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { revokeShareLink } from '$lib/server/shareLinks';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { apiOkMessage, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Auth + role guard
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const jsonParsed = await parseJsonBody<{ token: string }>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		const { token } = jsonParsed.data;

		if (!token) {
			return apiError('Token is required', 400);
		}

		const userId = (locals.user as any)._id?.toString() || (locals.user as any).userId || '';
		const revoked = await revokeShareLink(token, userId);

		if (!revoked) {
			return apiError('Link not found or you do not have permission to revoke it', 404);
		}

		return apiOkMessage('Share link has been deactivated');
	} catch (error) {
		return apiServerError(error, 'Failed to revoke share link');
	}
};
