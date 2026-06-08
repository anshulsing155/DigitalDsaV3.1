/**
 * GET /api/admin/rm-search?q=
 * ═══════════════════════════════════════════════════════════════════
 * A.2 — typeahead for the proxy-capture RM picker.
 *
 * CSFLE constraint (SEC-2): RM `name`/`email` are encrypted, so they can't be
 * substring-matched in the query. We search the PLAINTEXT `bankName` (regex,
 * case-insensitive) and, when the query is numeric, do an exact mobile lookup.
 * Matches are decrypted for display. Name-substring search isn't supported by
 * construction — the admin searches by bank or mobile (documented limitation).
 *
 * Auth: admin role. Rate-limited 60/min/admin.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { requireRoleApi } from '$lib/server/guards.js';
import { rmApplications } from '$lib/database/mongo.js';
import { decryptUserPii, findUserByMobile } from '$lib/server/csfle/index.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';

/** Escape user input before using it in a RegExp (avoid ReDoS / injection). */
function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const GET: RequestHandler = async ({ url, locals, getClientAddress }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;

	const limited = await rateLimit(getClientAddress(), {
		maxRequests: 60,
		windowMs: 60 * 1000,
		identifier: `rm-search:${locals.user!.id}`
	});
	if (limited) return apiError('Too many searches. Slow down.', 429);

	const q = (url.searchParams.get('q') || '').trim();
	if (q.length < 2) return apiOk({ results: [] });

	try {
		const matches: Array<Record<string, unknown>> = [];

		// Bank-name substring (plaintext, safe to regex).
		const byBank = await rmApplications
			.find({ bankName: { $regex: escapeRegex(q), $options: 'i' } })
			.limit(10)
			.toArray();
		matches.push(...byBank);

		// Numeric query → exact mobile lookup (handles CSFLE deterministic field).
		if (/^\d{6,}$/.test(q) && !matches.some((m) => String(m.mobileNumber).includes(q))) {
			const byMobile = await findUserByMobile(rmApplications, q);
			if (byMobile?._id) matches.push(byMobile);
		}

		// De-dupe by _id, decrypt for display, shape minimal fields.
		const seen = new Set<string>();
		const results = [];
		for (const raw of matches) {
			const id = String((raw as { _id: { toString(): string } })._id);
			if (seen.has(id)) continue;
			seen.add(id);
			const doc = await decryptUserPii(raw);
			const mobile = String(doc?.mobileNumber ?? '');
			results.push({
				rmId: id,
				name: doc?.name || '(no name)',
				bankName: doc?.bankName || '',
				mobileLast4: mobile.slice(-4),
				profileStatus: doc?.profileStatus || 'active'
			});
		}

		return apiOk({ results: results.slice(0, 10) });
	} catch (err) {
		return apiServerError(err, 'RM search failed');
	}
};
