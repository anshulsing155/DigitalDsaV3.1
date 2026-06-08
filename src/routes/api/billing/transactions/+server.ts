/**
 * GET /api/billing/transactions (D.1 S6 §4 S6 M5 — Transactions tab)
 * ══════════════════════════════════════════════════════════════════
 * Paginated BillingTransactions for the calling DSA — feeds the
 * "Transaction history" tab in the Manage subscription panel.
 *
 * Query params:
 *   page          — 1-indexed page number (default 1)
 *   page_size     — rows per page (default 20, max 100)
 *   status        — filter by status: 'succeeded' | 'failed' | 'refunded' | 'completed' | 'cancelled'
 *   from_date     — ISO date string lower bound on created_at
 *   to_date       — ISO date string upper bound on created_at
 *   include_test_auth — '1' to include ₹1 verification debits + refunds
 *                       (default hidden per spec — these aren't real revenue)
 *
 * Returns: { items: [...], page, page_size, total }
 *
 * Auth: DSA-only — every query is scoped by dsa_id from the session.
 * No cross-DSA reads possible.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S6 M5 (Transactions tab)
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { ObjectId } from 'mongodb';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse';
import { requireRoleApi } from '$lib/server/guards';
import { rateLimit } from '$lib/server/rateLimiter';
import { BillingTransactions, Invoices } from '$lib/database/mongo';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export const GET: RequestHandler = async ({ url, locals }) => {
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;

	const userId = locals.user!.id;

	const limited = await rateLimit(userId, {
		identifier: `billing-transactions:${userId}`,
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
		const status = url.searchParams.get('status');
		const fromDate = url.searchParams.get('from_date');
		const toDate = url.searchParams.get('to_date');
		const includeTestAuth = url.searchParams.get('include_test_auth') === '1';

		const dsaObjectId = new ObjectId(userId);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const query: Record<string, any> = { dsa_id: dsaObjectId };

		if (status) {
			query.status = status;
		}
		if (fromDate || toDate) {
			query.created_at = {};
			if (fromDate) {
				const d = new Date(fromDate);
				if (!isNaN(d.getTime())) query.created_at.$gte = d;
			}
			if (toDate) {
				const d = new Date(toDate);
				if (!isNaN(d.getTime())) query.created_at.$lte = d;
			}
		}

		// ₹1 verification debits + their matching refunds are stamped
		// `is_test_auth: true` per spec §11.1 / §6. Hide by default — they're
		// authorization plumbing, not revenue. DSAs can opt-in via toggle.
		if (!includeTestAuth) {
			query.is_test_auth = { $ne: true };
		}

		// D.1 S8 (skipped) cleanup: legacy one-time-pay rows are stamped with
		// `archived_at` and excluded by default — they pre-date the recurring
		// billing model and aren't relevant to the new UI. Rows persist on
		// disk for 6-year audit compliance but never surface here.
		query.archived_at = { $exists: false };

		const total = await BillingTransactions.countDocuments(query);
		const cursor = BillingTransactions.find(query, {
			sort: { created_at: -1 },
			skip: (page - 1) * page_size,
			limit: page_size
		});
		const rows = await cursor.toArray();

		// D.2 — Fetch invoice ids for the txns on this page so the UI can render
		// a per-row Download Invoice link. One additional query, indexed on
		// billing_transaction_id (unique). Could be merged via $lookup but
		// two simple queries are clearer + fast.
		const txnIds = rows
			.map((tx) => tx._id)
			.filter((id): id is NonNullable<typeof id> => !!id);
		const invoiceLookup = new Map<string, string>(); // billing_transaction_id → invoice _id (both as hex strings)
		if (txnIds.length > 0) {
			const invoiceRows = await Invoices.find(
				{ billing_transaction_id: { $in: txnIds } },
				{ projection: { _id: 1, billing_transaction_id: 1 } }
			).toArray();
			for (const inv of invoiceRows) {
				if (inv._id && inv.billing_transaction_id) {
					invoiceLookup.set(inv.billing_transaction_id.toString(), inv._id.toString());
				}
			}
		}

		// Project to the client view — no raw provider responses, no
		// subscription_id leaks. attempt_id is internal too.
		const items = rows.map((tx) => {
			const invoiceId = tx._id ? invoiceLookup.get(tx._id.toString()) ?? null : null;
			// Discriminate by `kind` to narrow the BillingTransactionDoc union.
			// Legacy one-time rows have no kind field; treat as legacy.
			if ('kind' in tx && (tx.kind === 'recurring_charge' || tx.kind === 'webhook_confirmation')) {
				return {
					id: tx._id?.toString(),
					kind: tx.kind,
					plan_id: tx.plan_id,
					amount_paise: tx.amount_paise,
					amount_rupees: tx.amount_paise / 100,
					status: tx.status,
					failure_code: tx.failure_code ?? null,
					provider_payment_id: tx.provider_payment_id ?? null,
					charged_at: tx.charged_at?.toISOString() ?? null,
					created_at: tx.created_at?.toISOString() ?? null,
					cycle_anchor: tx.cycle_anchor?.toISOString() ?? null,
					invoice_id: invoiceId
				};
			}
			// Legacy one-time shape.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const legacy = tx as any;
			return {
				id: legacy._id?.toString(),
				kind: 'legacy_one_time' as const,
				plan_id: legacy.plan ?? null,
				amount_paise: legacy.amount_paise ?? legacy.amount * 100,
				amount_rupees: legacy.amount ?? (legacy.amount_paise ?? 0) / 100,
				status: legacy.status,
				failure_code: null,
				provider_payment_id: legacy.razorpay_payment_id ?? null,
				charged_at: legacy.created_at?.toISOString() ?? null,
				created_at: legacy.created_at?.toISOString() ?? null,
				cycle_anchor: null,
				invoice_id: invoiceId
			};
		});

		return apiOk({
			items,
			page,
			page_size,
			total,
			has_more: page * page_size < total
		});
	} catch (err) {
		return apiServerError(err, 'transactions list failed');
	}
};
