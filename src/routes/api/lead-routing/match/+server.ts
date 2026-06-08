/**
 * GET /api/lead-routing/match
 * ══════════════════════════════════════════════════════════════════
 * DATA-1 — Lead-routing query. Returns up to 5 ranked DSA candidates
 * for an inbound customer's loan + geography + price intent.
 *
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §6 (API surface).
 *
 * Auth: requireAuthApi (any authenticated user — DSA / RM / admin all
 * have legitimate use cases). DSA role is NOT required because future
 * intake flows may call this from an RM-facing or admin context.
 *
 * Rate limiting: tighter than standard. Per-user identifier with a
 * 60-request-per-minute cap. This endpoint could be probed to map
 * DSA geographic coverage; the rate limit + max-5-results + count
 * obfuscation in `LeadRoutingCandidate.case_count_in_area` (when count
 * < 3, the spec recommends returning "1-2 cases" as a string) make
 * such probing slow + low-yield. v1 returns the exact count; the
 * 1-2-cases obfuscation is deferred to a v2 once we see real probing
 * patterns.
 *
 * Query params:
 *   loan_type    — "Home Loan" | "LAP" | "Plot Loan" (string)
 *   pincode      — 6-digit string
 *   locality     — raw free text (bucketized inside)
 *   target_price — number in rupees
 *
 * Response:
 *   { candidates: LeadRoutingCandidate[] }
 *   where dsa_id is an ObjectId hex string. Caller hydrates display name +
 *   profile via DsaApplications.findOne.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { LeadAttributionVault } from '$lib/database/mongo.js';
import { requireAuthApi } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError, apiValidationError } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { findLeadCandidates, isSecuredLoanV1 } from '$lib/server/data1/index.js';
import logger from '$lib/server/logger.js';

const querySchema = z.object({
	loan_type: z.string().min(1),
	pincode: z.string().regex(/^\d{6}$/, 'pincode must be 6 digits'),
	locality: z.string().min(1),
	target_price: z.coerce.number().positive()
});

export const GET: RequestHandler = async ({ url, locals, getClientAddress }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const userId = locals.user!.id;

	// Tighter rate limit — 60 requests per minute per user. Probing
	// attempts to map geographic coverage hit this cap quickly.
	const limited = await rateLimit(getClientAddress(), {
		identifier: `lead-routing:${userId}`,
		maxRequests: 60,
		windowMs: 60_000
	});
	if (limited) {
		return apiError('Too many routing queries. Please wait before trying again.', 429);
	}

	const parsed = querySchema.safeParse({
		loan_type: url.searchParams.get('loan_type') ?? '',
		pincode: url.searchParams.get('pincode') ?? '',
		locality: url.searchParams.get('locality') ?? '',
		target_price: url.searchParams.get('target_price') ?? ''
	});

	if (!parsed.success) {
		return apiValidationError('Validation failed', parsed.error.flatten());
	}

	// v1 only routes secured loans — the vault doesn't store residence/
	// business geography in v1, so an unsecured query would always match
	// nothing through Pass 1/2 and degrade to Pass 3. Failing loudly is
	// clearer than silently returning loan-type-only results.
	if (!isSecuredLoanV1(parsed.data.loan_type)) {
		return apiError('Loan type not supported by v1 lead routing', 400);
	}

	try {
		const candidates = await findLeadCandidates(
			{
				loan_type: parsed.data.loan_type,
				pincode: parsed.data.pincode,
				locality: parsed.data.locality,
				target_price: parsed.data.target_price
			},
			{
				vault: LeadAttributionVault,
				now: new Date(),
				logger
			}
		);

		return apiOk({
			candidates: candidates.map((c) => ({
				dsa_id: c.dsa_id.toString(),
				match_strength: c.match_strength,
				case_count_in_area: c.case_count_in_area,
				most_recent_quarter: c.most_recent_quarter,
				avg_price_bucket: c.avg_price_bucket,
				top_lenders: c.top_lenders
			}))
		});
	} catch (err) {
		return apiServerError(err, 'Failed to find lead-routing candidates');
	}
};
