/**
 * POST /api/cases/[case_id]/unlock-and-relock
 * ═════════════════════════════��════════════════════════════════════
 * Handles the "major edit" path: unlocks the current case lock,
 * recomputes the fingerprint from the new identity, and relocks —
 * consuming 1 additional DA quota.
 *
 * This endpoint is called when classifyEdit() returns 'major' and
 * the DSA confirms they want to proceed with the edit.
 *
 * Request body:
 * {
 *   tier: DaTierId,
 *   loan_type: string,       // NEW loan type after edit
 *   loan_amount: number,     // NEW amount after edit
 *   applicants: Array<{
 *     pan: string,
 *     role: 'primary' | 'co_applicant' | 'guarantor',
 *     relationship: string
 *   }>,
 *   reasons: string[]        // From classifyEdit().reasons
 * }
 *
 * Response:
 * - 200: { success: true, lock: CaseLockState }
 * - 400: validation error / case not locked
 * - 402: quota exhausted
 *
 * See: docs/specs/DOCUMENT-PARSER-FORM-INTEGRATION.md §5.1
 * ═════════════���═══════════════════════════════════���════════════════
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { resolveEffectiveDsaId, verifyCaseOwnership } from '$lib/server/caseHelpers.js';
import { blockDemoWrite, requireRoleApi, requireTeamPermission } from '$lib/server/guards.js';
import {
	apiOk,
	apiError,
	apiServerError,
	apiStructuredError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { unlockAndRelockCase } from '$lib/server/caseLock/operations.js';
import { DsaApplications } from '$lib/database/mongo.js';
import { tierAllowsDocAssessment, type TierId } from '$lib/config/billing.js';
import type { DaTierId } from '$lib/types/monthlyAssessmentUsage.js';

// ── Request Validation Schema ──────────────────────────────────

const unlockRelockRequestSchema = z.object({
	loan_type: z.string().min(1),
	loan_amount: z.number().positive(),
	applicants: z
		.array(
			z.object({
				pan: z.string().min(10).max(10),
				role: z.enum(['primary', 'co_applicant', 'guarantor']),
				relationship: z.string().min(1)
			})
		)
		.min(1),
	reasons: z.array(z.string().min(1)).min(1)
});

// ── POST Handler ───────────────────────────────────────────────

export const POST: RequestHandler = async ({ params, request, locals, getClientAddress }) => {
	// Auth guard — DSA role required (mirrors da-topup pattern)
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'cases_edit');
	if (permDenied) return permDenied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	// Rate limit: 10 unlock-and-relock calls per minute per user. Each call
	// consumes 1 DA quota (and enterprise_da overage bills per call), so we
	// cap call rate to protect against runaway client retries.
	const userId = locals.user!.id;
	const limited = await rateLimit(getClientAddress(), {
		identifier: `case-unlock-relock:${userId}`,
		maxRequests: 10,
		windowMs: 60_000
	});
	if (limited) {
		return apiError('Too many unlock requests. Please wait before trying again.', 429);
	}

	// Parse request body
	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	// Validate input
	const parsed = unlockRelockRequestSchema.safeParse(jsonParsed.data);
	if (!parsed.success) {
		return apiValidationError('Validation failed', parsed.error.flatten());
	}

	try {
		// Resolve DSA identity + verify case ownership
		const dsaResult = await resolveEffectiveDsaId(locals);
		if (!dsaResult.ok) {
			return apiError(dsaResult.error, 404);
		}

		const ownership = await verifyCaseOwnership(params.case_id, dsaResult.dsaId);
		if (!ownership.ok) {
			const status = ownership.error === 'Case not found' ? 404 : 403;
			return apiError(ownership.error, status);
		}

		// Server-side tier lookup — never trust client-supplied tier
		const dsaDoc = await DsaApplications.findOne(
			{ _id: dsaResult.dsaId },
			{ projection: { subscription: 1 } }
		);
		const tier = ((dsaDoc?.subscription as any)?.tier as TierId) || 'free';

		if (!tierAllowsDocAssessment(tier)) {
			return apiError(
				'Your subscription plan does not include Document Assessment. Please upgrade to a DA plan first.',
				403
			);
		}

		// Execute the unlock-and-relock operation
		const result = await unlockAndRelockCase({
			caseId: params.case_id,
			dsaId: dsaResult.dsaId,
			tier: tier as DaTierId,
			loanType: parsed.data.loan_type,
			loanAmount: parsed.data.loan_amount,
			applicants: parsed.data.applicants,
			reasons: parsed.data.reasons
		});

		if (!result.ok) {
			switch (result.reason) {
				case 'quota_exhausted':
					return apiStructuredError(
						'DA quota exhausted',
						{
							consumed: result.consumed,
							total: result.total,
							can_topup: result.can_topup
						},
						402
					);
				case 'case_not_locked':
					return apiError(
						'Case is not currently locked. Use the lock endpoint first.',
						400
					);
				case 'case_not_found':
					return apiError('Case not found', 404);
				case 'not_doc_upload_mode':
					return apiError('Case is not in doc-upload mode', 400);
				default:
					return apiError('Unlock-and-relock failed', 500);
			}
		}

		return apiOk({ lock: result.lock });
	} catch (err) {
		return apiServerError(err, 'Failed to unlock and relock case');
	}
};
