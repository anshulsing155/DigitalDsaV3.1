/**
 * POST /api/pms/policies/[id]/admin-json-edit
 *
 * Admin escape valve — directly replaces a published policy's sections with
 * admin-edited JSON, then auto-advances to 'submitted' so the admin can approve
 * on the standard review page.
 *
 * Security:
 *   - Admin-gated (requireRoleApi)
 *   - lockVersion echoed to detect concurrent edits
 *   - Zod validation on the incoming sections before any DB write
 *
 * Side effects:
 *   - Forks published → new 'submitted' draft (new _id, pendingChanges populated)
 *   - Returns { draftId } — client redirects to /dashboard/admin/policies/pms/[draftId]
 */

import { z } from 'zod';
import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import logger from '$lib/server/logger.js';
import {
	adminJsonEditPolicy,
	PolicyNotFoundError,
	PolicyStatusError,
	PolicyLockConflictError
} from '$lib/server/pms/policyService.js';

// ── Zod schema for the 9 policy sections ──────────────────────────────────────
// Mirrors PolicyDocument['sections'] — keeps validation close to the endpoint.

const EligibilitySchema = z.object({
	minAge: z.number().int().min(18).max(80),
	maxAge: z.number().int().min(18).max(90),
	minCreditScore: z.number().int().min(300).max(900),
	allowedEmploymentTypes: z.array(z.string()),
	allowedNationalities: z.array(z.string()),
	isDefaulterAllowed: z.boolean(),
	notes: z.string().nullable()
});

const IncomeSchema = z.object({
	allowedIncomeSources: z.array(z.string()),
	haircutBySalaried: z.number().min(0).max(1),
	haircutBySelfEmployed: z.number().min(0).max(1),
	haircutByRental: z.number().min(0).max(1),
	haircutByOther: z.number().min(0).max(1),
	minNetIncome: z.number().nullable(),
	minGrossIncome: z.number().nullable(),
	notes: z.string().nullable()
});

const FoirSchema = z.object({
	salaried: z.number().min(0).max(1),
	selfEmployed: z.number().min(0).max(1),
	notes: z.string().nullable()
});

const LtvSchema = z
	.object({
		maxLtvByPropertyType: z.record(z.string(), z.number()),
		maxLtvByLoanAmount: z.array(z.object({ upTo: z.number(), maxLtv: z.number() })),
		notes: z.string().nullable()
	})
	.nullable();

const ObligationSchema = z.object({
	deductFromFoir: z.boolean(),
	creditCardFoirMethod: z.enum(['utilization', 'limit_percentage', 'full_limit']),
	creditCardLimitPercentage: z.number().nullable(),
	notes: z.string().nullable()
});

const TenureSchema = z.object({
	minTenureMonths: z.number().int().min(1),
	maxTenureMonths: z.number().int().min(1),
	maxAgeAtMaturity: z.number().int().min(18).max(100),
	notes: z.string().nullable()
});

const RoiSchema = z.object({
	minRoi: z.number().min(0).max(100),
	maxRoi: z.number().min(0).max(100),
	spreadOverRepo: z.number().nullable(),
	roiType: z.enum(['fixed', 'floating', 'both']),
	notes: z.string().nullable()
});

const GeoSchema = z.object({
	allowedStates: z.array(z.string()),
	excludedCities: z.array(z.string()),
	notes: z.string().nullable()
});

const FeesSchema = z.object({
	processingFeePercent: z.number().nullable(),
	processingFeeFlat: z.number().nullable(),
	processingFeeMin: z.number().nullable(),
	processingFeeMax: z.number().nullable(),
	prepaymentAllowed: z.boolean(),
	prepaymentChargePercent: z.number().nullable(),
	notes: z.string().nullable()
});

const SectionsSchema = z.object({
	eligibility: EligibilitySchema,
	income: IncomeSchema,
	foir: FoirSchema,
	ltv: LtvSchema,
	obligations: ObligationSchema,
	tenure: TenureSchema,
	roi: RoiSchema,
	geo: GeoSchema,
	fees: FeesSchema
});

// Outer body schema — sections + lockVersion. Previously the body was only
// TS-cast, so a non-numeric lockVersion would slip through and a missing one
// would silently disable the optimistic-lock check.
const BodySchema = z.object({
	sections: SectionsSchema,
	lockVersion: z.number().int().min(0)
});

// ── Handler ───────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ locals, request, params }) => {
	const denied = requireRoleApi(locals, ['admin']);
	if (denied) return denied;

	const adminUserId = locals.user!.id;
	const { id: policyId } = params;

	// Rate limit: this endpoint forks a published policy and writes a new draft.
	// 5 / minute / admin matches the qa-run pattern and is generous for normal use.
	const limited = await rateLimit(adminUserId, {
		maxRequests: 5,
		windowMs: 60_000,
		identifier: `pms_admin_json_edit:${adminUserId}`
	});
	if (limited) {
		return apiError('Rate limit: please wait before submitting another JSON edit.', 429);
	}

	const body = await parseJsonBody<unknown>(request);
	if (!body.ok) return body.response;

	const parsed = BodySchema.safeParse(body.data);
	if (!parsed.success) {
		const firstError = parsed.error.issues[0];
		const path = firstError.path.join('.');
		return apiError(
			`Validation failed at ${path || 'body'}: ${firstError.message}`,
			422
		);
	}

	const { sections, lockVersion } = parsed.data;

	logger.info(
		{ policyId, adminUserId, lockVersion },
		'[PMS json-editor] Admin JSON edit — forking policy'
	);

	try {
		const draftId = await adminJsonEditPolicy(policyId, sections, adminUserId, lockVersion);

		logger.info({ policyId, draftId, adminUserId }, '[PMS json-editor] Draft created and submitted');

		return apiOk({ draftId });
	} catch (err) {
		if (err instanceof PolicyNotFoundError) return apiError('Policy not found', 404);
		if (err instanceof PolicyStatusError) return apiError(err.message, 422);
		if (err instanceof PolicyLockConflictError) {
			return apiError('This policy was modified by someone else. Please reload and try again.', 409);
		}
		return apiServerError(err);
	}
};
