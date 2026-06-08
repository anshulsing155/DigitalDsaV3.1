/**
 * /api/pms/suggestions
 *
 * GET  — DSA: list own pending suggestions.
 *         RM: list pending suggestions for their assigned lenders (query ?lenderId=X&loanProduct=Y).
 * POST — DSA or RM submits a new policy suggestion.
 *
 * Deduplication: unique sparse index on { lenderId, loanProduct, fieldPath, submittedBy }.
 * One suggestion per DSA per field per lender per 30-day TTL window.
 */

import type { RequestHandler } from './$types';
import { requireRoleApi, requireRmLenderAccess } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import logger from '$lib/server/logger.js';
import { PolicySuggestions } from '$lib/database/mongo.js';
import type { LoanProduct } from '$lib/config/lenderPolicies/types.js';

// Cap on currentValue/suggestedValue length when stored as a string. Body field
// previously accepted arbitrary JS values (deep objects, large strings). Limit
// applies to the post-stringify form; arrays/objects are rejected entirely.
const VALUE_FIELD_MAX_LENGTH = 200;

function coerceValueField(raw: unknown): string | null {
	if (raw === null || raw === undefined) return null;
	if (typeof raw === 'string') return raw.slice(0, VALUE_FIELD_MAX_LENGTH);
	if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
	// Reject objects/arrays — these fields are intended for scalar displays only.
	return null;
}

// ── GET — list suggestions ─────────────────────────────────────────────────

export const GET: RequestHandler = async ({ locals, url }) => {
	// Both DSA and RM can list; admin can query freely
	const guard = requireRoleApi(locals, ['dsa', 'rm', 'admin']);
	if (guard) return guard;

	try {
		const user = locals.user!;
		const activeRole = user.activeRole ?? user.role;

		let query: Record<string, unknown>;

		if (activeRole === 'dsa') {
			// DSA sees only their own suggestions
			query = { submittedBy: user.id, status: 'pending' };
		} else {
			// RM or admin can filter by lender + optional product
			const lenderId = url.searchParams.get('lenderId');
			const loanProduct = url.searchParams.get('loanProduct');
			const status = url.searchParams.get('status') ?? 'pending';

			if (!lenderId && activeRole === 'rm') {
				return apiError('lenderId query param required for RM role', 400);
			}

			// RM must have an active assignment for the queried lender — without this
			// check, any authenticated RM could enumerate suggestions for any lender
			// by iterating lenderId. Admin bypasses via the synthetic-assignment path
			// inside requireRmLenderAccess.
			if (lenderId && activeRole === 'rm') {
				const [denied] = await requireRmLenderAccess(locals, lenderId);
				if (denied) return denied;
			}

			query = { status };
			if (lenderId) query.lenderId = lenderId;
			if (loanProduct) query.loanProduct = loanProduct;
		}

		const suggestions = await PolicySuggestions.find(query, {
			sort: { submittedAt: -1 },
			limit: 100
		}).toArray();

		// Serialize ObjectIds and Dates for JSON transport
		const serialized = suggestions.map((s) => ({
			...s,
			_id: s._id.toString(),
			submittedAt: s.submittedAt.toISOString()
		}));

		return apiOk(serialized);
	} catch (err) {
		logger.error({ err }, 'GET /api/pms/suggestions failed');
		return apiServerError('Failed to load suggestions');
	}
};

// ── POST — submit a suggestion ─────────────────────────────────────────────

const VALID_PRODUCTS: LoanProduct[] = [
	'Home Loan',
	'Loan Against Property',
	'Plot and Construction Loan',
	'Personal Loan',
	'Business Loan',
	'Professional Loan'
];

export const POST: RequestHandler = async ({ request, locals }) => {
	const guard = requireRoleApi(locals, ['dsa', 'rm', 'admin']);
	if (guard) return guard;

	// Per-user rate limit: prevents a single account from spam-submitting
	// suggestions (UI-side click guard alone is insufficient).
	const userId = locals.user!.id;
	const limited = await rateLimit(userId, {
		maxRequests: 5,
		windowMs: 60_000,
		identifier: `pms_suggestion_submit:${userId}`
	});
	if (limited) {
		return apiError('Rate limit: please wait before submitting another suggestion.', 429);
	}

	const bodyResult = await parseJsonBody(request);
	if (!bodyResult.ok) return bodyResult.response;

	const body = bodyResult.data as Record<string, unknown>;

	// ── Validate required fields ──────────────────────────────────────────

	const lenderId = String(body.lenderId ?? '').trim();
	const loanProduct = String(body.loanProduct ?? '').trim() as LoanProduct;
	const dsaNote = String(body.dsaNote ?? '').trim();

	if (!lenderId) return apiError('lenderId is required', 400);
	if (!loanProduct) return apiError('loanProduct is required', 400);
	if (!VALID_PRODUCTS.includes(loanProduct)) {
		return apiError(`Invalid loanProduct: ${loanProduct}`, 400);
	}

	// Note: min 20 / max 500 chars enforced here (spec §1.5 Review finding #17)
	if (dsaNote.length < 20) return apiError('dsaNote must be at least 20 characters', 400);
	if (dsaNote.length > 500) return apiError('dsaNote must not exceed 500 characters', 400);

	// RM submitting suggestions must be assigned to the lender — same constraint
	// as the GET endpoint. DSAs and admins are not subject to this check.
	const activeRole = locals.user!.activeRole ?? locals.user!.role;
	if (activeRole === 'rm') {
		const [denied] = await requireRmLenderAccess(locals, lenderId);
		if (denied) return denied;
	}

	const fieldPath = body.fieldPath ? String(body.fieldPath).trim() : null;
	const currentValue = coerceValueField(body.currentValue);
	const suggestedValue = coerceValueField(body.suggestedValue);
	const caseReference = body.caseReference ? String(body.caseReference).trim() : null;
	const branchCity = body.branchCity ? String(body.branchCity).trim() : null;

	const submittedBy = userId;

	try {
		const now = new Date();
		const doc = {
			lenderId,
			loanProduct,
			clauseId: null as string | null,
			fieldPath,
			currentValue,
			suggestedValue,
			dsaNote,
			caseReference,
			branchCity,
			status: 'pending' as const,
			reviewedBy: null as string | null,
			reviewNote: null as string | null,
			submittedBy,
			submittedAt: now
		};

		// Attempt insert — if the unique sparse index fires, return a friendly dedup error
		try {
			const result = await PolicySuggestions.insertOne(doc as Parameters<typeof PolicySuggestions.insertOne>[0]);
			return apiOk({ id: result.insertedId.toString() }, 201);
		} catch (dbErr: unknown) {
			// MongoDB duplicate key error code 11000
			if (typeof dbErr === 'object' && dbErr !== null && 'code' in dbErr && (dbErr as { code: number }).code === 11000) {
				return apiError(
					'You already have a pending suggestion for this field on this lender. Wait for the RM to review it.',
					409
				);
			}
			throw dbErr;
		}
	} catch (err) {
		logger.error({ err, lenderId, loanProduct }, 'POST /api/pms/suggestions failed');
		return apiServerError('Failed to submit suggestion');
	}
};
