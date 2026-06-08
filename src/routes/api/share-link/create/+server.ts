/**
 * POST /api/share-link/create
 * ═══════════════════════════════════════════════════════════════════
 * Creates a shareable form link for an applicant.
 * Requires authenticated DSA user.
 *
 * Request body:
 *   - applicationId: string
 *   - applicantIndex: number
 *   - sections: string[] (e.g., ['income', 'credit', 'obligations'])
 *   - customTitle?: string
 *   - customSubtitle?: string
 *   - requiresOtp?: boolean (default true)
 *   - expiryHours?: number (default 72)
 *   - maxUses?: number (default 10)
 *   - prefilledData?: Record<string, unknown>
 *
 * Response:
 *   - success: boolean
 *   - token: string
 *   - expiresAt: string
 *   - shareUrl: string
 * ═══════════════════════════════════════════════════════════════════
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createShareLink } from '$lib/server/shareLinks';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import {
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { isFeatureEnabled } from '$lib/server/featureGate.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { verifyCaseOwnership } from '$lib/server/caseHelpers.js';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers.js';
import { z } from 'zod';

/** Valid sections that can be shared via a link */
const VALID_SHARE_SECTIONS = ['income', 'credit', 'obligations', 'documents'] as const;

/** Zod schema for share link creation request */
const createShareLinkSchema = z.object({
	applicationId: z.string().min(1, 'applicationId is required'),
	applicantIndex: z.number().int().min(0),
	sections: z.array(z.enum(VALID_SHARE_SECTIONS)).min(1, 'At least one section is required'),
	customTitle: z.string().optional(),
	customSubtitle: z.string().optional(),
	requiresOtp: z.boolean().optional(),
	expiryHours: z.number().positive().optional(),
	maxUses: z.number().int().positive().optional(),
	prefilledData: z.record(z.string(), z.unknown()).optional()
});

export const POST: RequestHandler = async ({ request, locals, url, getClientAddress }) => {
	// Auth + role guard
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	// Rate limit: 20 share link creations per minute per user
	const userId = (locals.user as any)._id?.toString() || (locals.user as any).userId || '';
	const ip = getClientAddress();
	const limited = await rateLimit(ip, {
		maxRequests: 20,
		windowMs: 60_000,
		identifier: `share-link-create-${userId}`
	});
	if (limited) {
		return apiError('Rate limit exceeded. Please try again later.', 429);
	}

	try {
		// Feature gate check
		const featureCheck = await isFeatureEnabled('share_links_enabled', userId);
		if (!featureCheck.enabled) {
			return apiError(featureCheck.reason || 'Share links are currently disabled', 403);
		}

		const bodyParsed = await parseJsonBody<z.infer<typeof createShareLinkSchema>>(request);
		if (!bodyParsed.ok) return bodyParsed.response;

		const validated = createShareLinkSchema.safeParse(bodyParsed.data);
		if (!validated.success) {
			return apiValidationError('Invalid input', validated.error.issues);
		}
		const body = validated.data;

		// Verify the DSA owns this application before creating a share link
		const dsaResult = await resolveEffectiveDsaId(locals);
		if (!dsaResult.ok) {
			return apiError('Could not resolve DSA identity', 403);
		}
		const ownership = await verifyCaseOwnership(body.applicationId, dsaResult.dsaId);
		if (!ownership.ok) {
			return apiError('You do not have permission to share this application', 403);
		}

		// Create the share link
		const link = await createShareLink({
			applicationId: body.applicationId,
			applicantIndex: body.applicantIndex,
			createdBy: (locals.user as any)._id?.toString() || (locals.user as any).userId || '',
			sections: body.sections,
			customTitle: body.customTitle,
			customSubtitle: body.customSubtitle,
			requiresOtp: body.requiresOtp,
			expiryHours: body.expiryHours,
			maxUses: body.maxUses,
			prefilledData: body.prefilledData
		});

		// Build the share URL using the current domain
		const baseUrl = `${url.protocol}//${url.host}`;
		const shareUrl = `${baseUrl}/f/${link.token}`;

		// left: extra top-level token/expiresAt/shareUrl keys (not under `data`) — apiOk would nest them
		return json({
			success: true,
			token: link.token,
			expiresAt: link.expiresAt,
			shareUrl
		});
	} catch (error) {
		return apiServerError(error, 'Failed to create share link');
	}
};
