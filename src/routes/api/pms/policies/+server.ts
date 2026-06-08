/**
 * GET  /api/pms/policies  — Filtered policy listing
 * POST /api/pms/policies  — Create a new draft policy
 *
 * GET query params:
 *   lenderId     Filter by lender (required for RM; optional for admin)
 *   loanProduct  Filter by loan product
 *   status       Filter by status (comma-separated for multiple)
 *   page         Page number (default: 1)
 *   limit        Results per page (default: 20, max: 50)
 *
 * POST body:
 *   lenderId                    string (required)
 *   loanProduct                 LoanProduct (required)
 *   sourceText                  string — raw extracted policy text
 *   sourceFileName              string — filename shown in audit trail
 *   reconciliationAssignedTo    string — rmUserId to do reconciliation
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { RmLenderAssignments } from '$lib/database/mongo.js';
import {
	getPoliciesForLender,
	getPoliciesForRm,
	createDraftPolicy,
	PolicyStatusError
} from '$lib/server/pms/policyService.js';
import type { LoanProduct } from '$lib/config/lenderPolicies/types.js';

const VALID_LOAN_PRODUCTS = new Set<string>([
	'Home Loan',
	'Loan Against Property',
	'Plot and Construction Loan',
	'Personal Loan',
	'Business Loan',
	'Professional Loan'
]);

const VALID_STATUSES = new Set<string>([
	'draft',
	'submitted',
	'approved_scheduled',
	'approved',
	'published',
	'archived'
]);

// ── GET /api/pms/policies ─────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireRoleApi(locals, ['rm', 'admin']);
	if (denied) return denied;

	// Admin bypass — true when the underlying user is an admin regardless of
	// activeRole. See /api/pms/policies/[id]/+server.ts for full rationale.
	const isAdmin =
		locals.user!.activeRole === 'admin' || locals.adminPermissions !== undefined;
	const rmUserId = locals.user!.id;

	const lenderIdParam = url.searchParams.get('lenderId') || '';
	const loanProductParam = url.searchParams.get('loanProduct') || '';
	const statusParam = url.searchParams.get('status') || '';
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));

	const requestedStatuses = statusParam
		? statusParam.split(',').filter((s) => VALID_STATUSES.has(s))
		: [];

	try {
		let policies;

		if (isAdmin) {
			// Admin: can see all lenders
			const { PmsLenderPolicies } = await import('$lib/database/mongo.js');
			const filter: Record<string, unknown> = { status: { $ne: 'archived' } };
			if (lenderIdParam) filter.lenderId = lenderIdParam;
			if (requestedStatuses.length > 0) filter.status = { $in: requestedStatuses };
			if (loanProductParam && VALID_LOAN_PRODUCTS.has(loanProductParam)) {
				filter.loanProduct = loanProductParam;
			}
			policies = await PmsLenderPolicies.find(filter, {
				sort: { lenderId: 1, loanProduct: 1, version: -1 }
			}).toArray();
		} else {
			// RM: can only see policies for their active assignments
			const assignments = await RmLenderAssignments.find(
				{ rmUserId, status: 'active' },
				{ projection: { lenderId: 1 } }
			).toArray();

			const assignedLenderIds = assignments.map((a) => a.lenderId);

			if (lenderIdParam) {
				// RM requesting a specific lender they're assigned to
				if (!assignedLenderIds.includes(lenderIdParam)) {
					return apiError('You are not assigned to this lender', 403);
				}
				policies = await getPoliciesForLender(lenderIdParam);
			} else {
				policies = await getPoliciesForRm(assignedLenderIds);
			}
		}

		// Apply additional filters
		let filtered = policies;
		if (requestedStatuses.length > 0) {
			filtered = filtered.filter((p) => requestedStatuses.includes(p.status));
		}
		if (loanProductParam && VALID_LOAN_PRODUCTS.has(loanProductParam)) {
			filtered = filtered.filter((p) => p.loanProduct === loanProductParam);
		}

		const total = filtered.length;
		const paginated = filtered.slice((page - 1) * limit, page * limit);

		// Serialize — strip large fields (sourceDocument.text, pipelineState) from listing
		const serialized = paginated.map((p) => ({
			_id: p._id.toString(),
			lenderId: p.lenderId,
			loanProduct: p.loanProduct,
			version: p.version,
			status: p.status,
			validFrom: p.validFrom.toISOString(),
			validTo: p.validTo ? p.validTo.toISOString() : null,
			lockVersion: p.lockVersion,
			overrideCount: p.conditionalOverrides.length,
			reconciliationStatus: p.reconciliation.status,
			aiPipelineRan: p.aiPipelineRun !== null,
			finalScore: p.aiPipelineRun?.finalScore ?? null,
			sourceFileName: p.sourceDocument.fileName,
			uploadedAt: p.sourceDocument.uploadedAt.toISOString(),
			uploadedBy: p.sourceDocument.uploadedBy,
			submittedAt: p.submittedAt ? p.submittedAt.toISOString() : null,
			approvedAt: p.approvedAt ? p.approvedAt.toISOString() : null,
			publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
			scheduledPublishAt: p.scheduledPublishAt ? p.scheduledPublishAt.toISOString() : null,
			adminRejectionNote: p.adminRejectionNote,
			createdAt: p.createdAt.toISOString(),
			updatedAt: p.updatedAt.toISOString()
		}));

		return apiOk({
			policies: serialized,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit)
		});
	} catch (err) {
		return apiServerError(err, 'pms policies GET');
	}
};

// ── POST /api/pms/policies ────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ locals, request }) => {
	const denied = requireRoleApi(locals, ['rm', 'admin']);
	if (denied) return denied;

	const body = await parseJsonBody<{
		lenderId: string;
		loanProduct: string;
		sourceText: string;
		sourceFileName: string;
		reconciliationAssignedTo?: string;
	}>(request);
	if (!body.ok) return body.response;

	const { lenderId, loanProduct, sourceText, sourceFileName } = body.data;

	if (!lenderId) return apiError('lenderId is required', 400);
	if (!loanProduct) return apiError('loanProduct is required', 400);
	if (!VALID_LOAN_PRODUCTS.has(loanProduct)) return apiError('Invalid loanProduct', 400);
	if (!sourceText?.trim()) return apiError('sourceText is required', 400);
	if (!sourceFileName?.trim()) return apiError('sourceFileName is required', 400);

	// Admin bypass — true when the underlying user is an admin regardless of
	// activeRole. See /api/pms/policies/[id]/+server.ts for full rationale.
	const isAdmin =
		locals.user!.activeRole === 'admin' || locals.adminPermissions !== undefined;
	const userId = locals.user!.id;

	// RM must have an active assignment for this lender
	if (!isAdmin) {
		const assignment = await RmLenderAssignments.findOne({
			rmUserId: userId,
			lenderId,
			status: 'active'
		});
		if (!assignment) {
			return apiError('You must have an active assignment for this lender to create a policy', 403);
		}
	}

	const reconciliationAssignedTo = body.data.reconciliationAssignedTo || userId;

	try {
		const policy = await createDraftPolicy({
			lenderId,
			loanProduct: loanProduct as LoanProduct,
			sourceText: sourceText.trim(),
			sourceFileName: sourceFileName.trim(),
			uploadedBy: userId,
			reconciliationAssignedTo
		});

		logger.info(
			{ policyId: policy._id.toString(), lenderId, loanProduct, createdBy: userId },
			'PMS draft policy created'
		);

		return apiOk({
			policyId: policy._id.toString(),
			lenderId: policy.lenderId,
			loanProduct: policy.loanProduct,
			status: policy.status,
			lockVersion: policy.lockVersion
		});
	} catch (err) {
		if (err instanceof PolicyStatusError) {
			return apiError(err.message, 409);
		}
		return apiServerError(err, 'pms policies POST');
	}
};
