/**
 * GET /api/billing/invoices
 * ══════════════════════════════════════════════════════════════════════
 * Paginated invoice list for the calling DSA. Drives the "Invoices" tab
 * (or per-row download link in the Transactions tab) on the billing
 * dashboard.
 *
 * Query params:
 *   page          — 1-indexed (default 1)
 *   page_size     — rows per page (default 20, max 50)
 *
 * Returns: { items, page, page_size, total, has_more }
 *
 * Auth: DSA-only. Every query scoped by dsa_id — no cross-DSA reads possible.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §D.2
 * ══════════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { ObjectId } from 'mongodb';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse';
import { requireRoleApi } from '$lib/server/guards';
import { rateLimit } from '$lib/server/rateLimiter';
import { Invoices } from '$lib/database/mongo';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const GET: RequestHandler = async ({ url, locals }) => {
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;

	const userId = locals.user!.id;

	const limited = await rateLimit(userId, {
		identifier: `billing-invoices:${userId}`,
		maxRequests: 60,
		windowMs: 60_000
	});
	if (limited) return apiError('Too many requests. Please slow down.', 429);

	try {
		const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
		const requestedPageSize =
			parseInt(url.searchParams.get('page_size') ?? String(DEFAULT_PAGE_SIZE), 10) ||
			DEFAULT_PAGE_SIZE;
		const page_size = Math.min(MAX_PAGE_SIZE, Math.max(1, requestedPageSize));

		const dsaObjectId = new ObjectId(userId);
		const query = { dsa_id: dsaObjectId };

		const total = await Invoices.countDocuments(query);
		const rows = await Invoices.find(query, {
			sort: { issue_date: -1 },
			skip: (page - 1) * page_size,
			limit: page_size
		}).toArray();

		// Project to the client view — no internal-only fields (seller_address,
		// raw audit fields, etc. stay on the doc but aren't surfaced).
		const items = rows.map((inv) => ({
			id: inv._id?.toString(),
			invoice_number: inv.invoice_number,
			fy: inv.fy,
			issue_date: inv.issue_date?.toISOString() ?? null,
			plan_id: inv.plan_id,
			description: inv.description,
			total_paise: inv.total_paise,
			total_rupees: inv.total_paise / 100,
			taxable_paise: inv.taxable_paise,
			cgst_paise: inv.cgst_paise,
			sgst_paise: inv.sgst_paise,
			igst_paise: inv.igst_paise,
			tax_kind: inv.tax_kind,
			gstin_buyer: inv.gstin_buyer ?? null,
			billing_transaction_id: inv.billing_transaction_id?.toString() ?? null
		}));

		return apiOk({
			items,
			page,
			page_size,
			total,
			has_more: page * page_size < total
		});
	} catch (err) {
		return apiServerError(err, 'invoice list failed');
	}
};
