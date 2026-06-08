/**
 * POST /api/rm/ratings — Create a new accuracy rating
 * GET  /api/rm/ratings — List RM's ratings (optional ?case_id=X filter)
 * ═══════════════════════════════════════════════════════════════════
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { rmApplications, AccuracyRatings, CommunicationThreads } from '$lib/database/mongo.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { ObjectId } from 'mongodb';
import type { RatingCategory } from '$lib/types/rmPortal.js';
import { parseJsonBody, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';

// ── Valid rating categories ──────────────────────────────────
const VALID_CATEGORIES: RatingCategory[] = [
	'income_estimation',
	'property_valuation',
	'eligibility_check',
	'documentation',
	'overall'
];

// ── Resolve RM document (ObjectId first, mobile fallback) ────
// SEC-2: mobile fallback is encrypted-aware; result decrypted for use.
async function resolveRm(userId: string, mobileNumber?: string) {
	let rmDoc;
	try {
		rmDoc = await rmApplications.findOne({ _id: new ObjectId(userId) });
	} catch {
		// ObjectId parse failed — try mobile fallback
	}

	if (!rmDoc && mobileNumber) {
		rmDoc = await findUserByMobile(rmApplications, mobileNumber);
	}

	return decryptUserPii(rmDoc);
}

// ============================================================================
// POST — Create new rating
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	// Auth + role guard
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	// Parse body
	const bodyParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!bodyParsed.ok) return bodyParsed.response;
	const body = bodyParsed.data;

	const { case_id, lender_app_id, lender_name, rating, category, comment, disclaimer_accepted } =
		body;

	// ── Validate required fields ─────────────────────────────
	if (!case_id || typeof case_id !== 'string') {
		return apiError('case_id is required', 400);
	}

	if (!lender_app_id || typeof lender_app_id !== 'string') {
		return apiError('lender_app_id is required', 400);
	}

	if (!lender_name || typeof lender_name !== 'string') {
		return apiError('lender_name is required', 400);
	}

	if (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
		return apiError('rating must be an integer between 1 and 5', 400);
	}

	if (!category || !VALID_CATEGORIES.includes(category as RatingCategory)) {
		return apiError(`category must be one of: ${VALID_CATEGORIES.join(', ')}`, 400);
	}

	if (disclaimer_accepted !== true) {
		return apiError('disclaimer_accepted must be true', 400);
	}

	// Validate optional comment
	if (comment !== undefined && comment !== null) {
		if (typeof comment !== 'string' || comment.length > 500) {
			return apiError('comment must be a string (max 500 chars)', 400);
		}
	}

	try {
		// ── Resolve RM ──────────────────────────────────────
		const rmDoc = await resolveRm(locals.user!.id, locals.user!.mobileNumber);
		if (!rmDoc?._id) {
			return apiError('RM not found', 404);
		}
		const rmId = rmDoc._id;

		// ── Verify RM has access to this case ───────────────
		const thread = await CommunicationThreads.findOne({
			rm_id: rmId,
			case_id: case_id as string
		});

		if (!thread) {
			return apiError('Access denied: no communication thread for this case', 403);
		}

		// ── Check uniqueness: one rating per RM + case + lender_app ──
		const existing = await AccuracyRatings.findOne({
			rm_id: rmId,
			case_id: case_id as string,
			lender_app_id: lender_app_id as string
		});

		if (existing) {
			return apiError('You have already rated this assessment', 409);
		}

		// ── Insert rating ───────────────────────────────────
		const result = await AccuracyRatings.insertOne({
			case_id: case_id as string,
			rm_id: rmId,
			lender_app_id: lender_app_id as string,
			lender_name: lender_name as string,
			rating: rating as number,
			category: category as RatingCategory,
			comment: comment ? (comment as string).trim() : undefined,
			disclaimer_accepted: true,
			created_at: new Date()
		});

		// NOTE: top-level `rating_id` (not under `data`) — left as raw json() to
		// preserve the exact client-facing shape (DX-4 byte-identical rule).
		return json({
			success: true,
			rating_id: result.insertedId.toString()
		});
	} catch (error) {
		return apiServerError(error, 'Failed to create rating');
	}
};

// ============================================================================
// GET — List RM's ratings
// ============================================================================

export const GET: RequestHandler = async ({ url, locals }) => {
	// Auth + role guard
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;

	try {
		// ── Resolve RM ──────────────────────────────────────
		const rmDoc = await resolveRm(locals.user!.id, locals.user!.mobileNumber);
		if (!rmDoc?._id) {
			return apiError('RM not found', 404);
		}
		const rmId = rmDoc._id;

		// ── Build query filter ──────────────────────────────
		const filter: Record<string, unknown> = { rm_id: rmId };
		const caseIdParam = url.searchParams.get('case_id');
		if (caseIdParam) {
			filter.case_id = caseIdParam;
		}

		// ── Fetch ratings ───────────────────────────────────
		const ratings = await AccuracyRatings.find(filter).sort({ created_at: -1 }).limit(50).toArray();

		const serialized = ratings.map((r) => ({
			_id: r._id?.toString(),
			case_id: r.case_id,
			lender_app_id: r.lender_app_id,
			lender_name: r.lender_name,
			rating: r.rating,
			category: r.category,
			comment: r.comment,
			created_at:
				r.created_at instanceof Date
					? r.created_at.toISOString()
					: new Date(r.created_at).toISOString()
		}));

		// NOTE: top-level `ratings` (not under `data`) — left as raw json() to
		// preserve the exact client-facing shape (DX-4 byte-identical rule).
		return json({ success: true, ratings: serialized });
	} catch (error) {
		return apiServerError(error, 'Failed to load ratings');
	}
};
