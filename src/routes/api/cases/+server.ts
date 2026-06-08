/**
 * GET / POST  /api/cases
 * ══════════════════════════════════════════════════════════════════
 * Cases list & creation for the authenticated DSA.
 *
 * GET:  List cases with filtering, search, and pagination.
 * POST: Create a new case.
 * ══════════════════════════════════════════════════════════════════
 */

import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { Cases, DsaApplications } from '$lib/database/mongo.js';
import { caseCreateSchema } from '$lib/schemas/case.schema.js';
import {
	resolveEffectiveDsaId,
	generateCaseId,
	createTimelineEvent
} from '$lib/server/caseHelpers.js';
import { escapeRegex } from '$lib/server/utils.js';
import type { Case } from '$lib/types/case.js';
import { blockDemoWrite, requireAuthApi, requireTeamPermission } from '$lib/server/guards.js';
import logger from '$lib/server/logger.js';
import {
	apiOk,
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { getActiveCaseLimit } from '$lib/config/billing.js';
import { ObjectId } from 'mongodb';

// ── GET — List cases ─────────────────────────────────────────────

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'cases_view');
	if (permDenied) return permDenied;

	try {
		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}
		const dsaId = result.dsaId;

		// ── Parse query params ──────────────────────────────────
		const stage = url.searchParams.get('stage');
		const loanType = url.searchParams.get('loan_type');
		const lender = url.searchParams.get('lender');
		const search = url.searchParams.get('search');
		const hasSnapshot = url.searchParams.get('has_snapshot') === 'true';
		const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
		const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
		const skip = (page - 1) * limit;

		// ── Build filter ────────────────────────────────────────
		const filter: Record<string, any> = {
			dsa_id: dsaId,
			is_archived: { $in: [false, null] }
		};

		if (stage) {
			filter.stage = stage;
		}

		if (loanType) {
			filter['loan.type'] = loanType;
		}

		if (lender) {
			filter['lender_applications.lender_name'] = lender;
		}

		if (search) {
			// Fuzzy match on label or case_id — escape user input to prevent regex injection
			const searchRegex = { $regex: escapeRegex(search), $options: 'i' };
			filter.$or = [{ label: searchRegex }, { case_id: searchRegex }];
		}

		// ── Execute query ───────────────────────────────────────
		let cases: any[];
		let total: number;

		if (hasSnapshot) {
			// Only return cases that have at least one formSnapshot
			const pipeline = [
				{ $match: filter },
				{
					$lookup: {
						from: 'formSnapshots',
						localField: 'case_id',
						foreignField: 'case_id',
						pipeline: [{ $project: { _id: 1 } }, { $limit: 1 }],
						as: '_snapshots'
					}
				},
				{ $match: { '_snapshots.0': { $exists: true } } },
				{ $project: { _snapshots: 0 } },
				{ $sort: { updated_at: -1 as const } },
				{ $facet: { data: [{ $skip: skip }, { $limit: limit }], count: [{ $count: 'n' }] } }
			];
			const [agg] = await Cases.aggregate(pipeline).toArray();
			cases = agg?.data ?? [];
			total = agg?.count?.[0]?.n ?? 0;
		} else {
			[cases, total] = await Promise.all([
				Cases.find(filter).sort({ updated_at: -1 }).skip(skip).limit(limit).toArray(),
				Cases.countDocuments(filter)
			]);
		}

		return apiOk({
			cases,
			pagination: {
				page,
				limit,
				total,
				total_pages: Math.ceil(total / limit)
			}
		});
	} catch (err) {
		return apiServerError(err, 'Failed to fetch cases');
	}
};

// ── POST — Create a new case ────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const permDenied = requireTeamPermission(locals, 'cases_create');
	if (permDenied) return permDenied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		// Validate with caseCreateSchema
		const parsed = caseCreateSchema.safeParse(jsonParsed.data);
		if (!parsed.success) {
			return apiValidationError('Validation failed', parsed.error.flatten());
		}

		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) {
			return apiError(result.error, 404);
		}
		const dsaId = result.dsaId;

		// ── Subscription case limit check (skip in dev) ────────
		// Prevents DSAs on lower plans from exceeding their case allocation.
		// Sample cases (is_sample: true) are excluded — they're seeded
		// during onboarding and shouldn't count against the user's limit.
		if (!dev) {
			try {
				const dsaDoc = await DsaApplications.findOne(
					{ _id: new ObjectId(dsaId.toString()) },
					{ projection: { subscription: 1 } }
				);

				const allowedCaseLimit = getActiveCaseLimit(dsaDoc?.subscription);

				// allowedCaseLimit === 0 means no active subscription at all
				if (allowedCaseLimit === 0) {
					return apiError(
						'Active subscription required. Please subscribe to a plan to create cases.',
						402
					);
				}

				// Count real (non-sample, non-archived) cases for this DSA
				const activeCaseCount = await Cases.countDocuments({
					dsa_id: dsaId,
					is_sample: { $ne: true },
					is_archived: { $ne: true }
				});

				if (activeCaseCount >= allowedCaseLimit) {
					logger.warn(
						{ dsaId: dsaId.toString(), activeCaseCount, allowedCaseLimit },
						'Case creation blocked — subscription case limit reached'
					);
					return apiError(
						`Case limit reached (${activeCaseCount}/${allowedCaseLimit}). ` +
							'Please upgrade your plan or archive existing cases.',
						403
					);
				}
			} catch (limitCheckError) {
				// Fail-closed: if we can't verify the limit, deny the request.
				// This prevents unlimited case creation when the DB is unavailable.
				logger.error(
					{ err: limitCheckError, dsaId: dsaId.toString() },
					'Case limit check failed — denying case creation for safety'
				);
				return apiServerError(limitCheckError, 'Unable to verify subscription. Please try again.');
			}
		}

		const data = parsed.data;

		// ── Insert case with duplicate-key retry ────────────────
		// Counter can drift out of sync (manual inserts, seed data, etc.)
		// so retry with a fresh ID on E11000 duplicate key conflict.
		const MAX_RETRIES = 5;
		let lastErr: unknown;

		for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
			const caseId = await generateCaseId(data.loan.type, dsaId);
			const now = new Date();

			const newCase: Case = {
				case_id: caseId,
				dsa_id: dsaId,
				label: data.label,
				loan: data.loan,
				stage: 'intake',
				stage_history: [
					{
						from: 'intake',
						to: 'intake',
						timestamp: now,
						notes: 'Case created'
					}
				],
				lender_applications: [],
				optional_contact: data.optional_contact,
				source: data.source,
				notes: data.notes,
				created_at: now,
				updated_at: now,
				is_archived: false,
				is_sample: false
			};

			try {
				await Cases.insertOne(newCase);

				// ── Create timeline event ───────────────────────
				await createTimelineEvent(caseId, 'case_created', `Case created: ${data.label}`, {
					loan_type: data.loan.type,
					amount: data.loan.amount_required
				});

				if (attempt > 0) {
					logger.warn({ caseId, attempts: attempt + 1 }, 'Case created after duplicate-key retry');
				}

				return apiOk(newCase, 201);
			} catch (insertErr: any) {
				if (insertErr?.code === 11000 && attempt < MAX_RETRIES - 1) {
					logger.warn(
						{ caseId, attempt: attempt + 1 },
						'Duplicate case_id — counter out of sync, retrying'
					);
					lastErr = insertErr;
					continue;
				}
				throw insertErr;
			}
		}

		// Should not reach here, but just in case all retries exhausted
		throw lastErr;
	} catch (err) {
		return apiServerError(err, 'Failed to create case');
	}
};
