/**
 * POST /api/cases/[case_id]/lock
 * ════════════���═════════════════════��═══════════════════════════════
 * Locks a case for document assessment, consuming 1 DA quota.
 * The case must have assessment_mode = 'doc_upload' and not already
 * be locked (or same fingerprint = idempotent no-op).
 *
 * Request body:
 * {
 *   tier: DaTierId,         // DSA's current DA tier
 *   loan_type: string,      // Current loan type
 *   loan_amount: number,    // Current loan amount
 *   applicants: Array<{
 *     pan: string,
 *     role: 'primary' | 'co_applicant' | 'guarantor',
 *     relationship: string
 *   }>
 * }
 *
 * Response:
 * - 200: { success: true, lock: CaseLockState, was_idempotent: boolean }
 * - 400: validation error
 * - 402: quota exhausted
 * - 409: already locked with different fingerprint
 *
 * See: docs/specs/DOCUMENT-PARSER-FORM-INTEGRATION.md §5.1
 * ═════════════════════��═══════════════════════════════��════════════
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
import { lockCase } from '$lib/server/caseLock/operations.js';
import { DsaApplications } from '$lib/database/mongo.js';
import { tierAllowsDocAssessment, type TierId } from '$lib/config/billing.js';
import type { DaTierId } from '$lib/types/monthlyAssessmentUsage.js';

// ── Request Validation Schema ─────────────────��────────────────

const lockRequestSchema = z.object({
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
		.min(1)
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

	// Rate limit: 10 lock calls per minute per user. Each successful lock
	// consumes 1 DA quota, and enterprise_da overage bills per call, so we
	// cap call rate to prevent runaway client retries from burning quota.
	const userId = locals.user!.id;
	const limited = await rateLimit(getClientAddress(), {
		identifier: `case-lock:${userId}`,
		maxRequests: 10,
		windowMs: 60_000
	});
	if (limited) {
		return apiError('Too many lock requests. Please wait before trying again.', 429);
	}

	// Parse request body
	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	// Validate input
	const parsed = lockRequestSchema.safeParse(jsonParsed.data);
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

		// Execute the lock operation
		const result = await lockCase({
			caseId: params.case_id,
			dsaId: dsaResult.dsaId,
			tier: tier as DaTierId,
			loanType: parsed.data.loan_type,
			loanAmount: parsed.data.loan_amount,
			applicants: parsed.data.applicants
		});

		if (!result.ok) {
			// Map failure reasons to HTTP status codes
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
				case 'already_locked_different_fingerprint':
					return apiError(
						'Case is already locked with a different identity. Use unlock-and-relock.',
						409
					);
				case 'case_not_found':
					return apiError('Case not found', 404);
				case 'not_doc_upload_mode':
					return apiError('Case is not in doc-upload mode', 400);
				default:
					return apiError('Lock failed', 500);
			}
		}

		return apiOk({
			lock: result.lock,
			was_idempotent: result.was_idempotent
		});
	} catch (err) {
		return apiServerError(err, 'Failed to lock case');
	}
};
