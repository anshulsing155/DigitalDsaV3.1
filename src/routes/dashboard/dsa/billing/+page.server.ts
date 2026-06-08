/**
 * Billing dashboard page — server load
 * ══════════════════════════════════════════════════════════════════
 * Auth-gated stub. The page itself is composed entirely of self-fetching
 * client components (`SubscribeRecurringSection`, `ManageSubscriptionPanel`)
 * that own their data flow against `/api/billing/subscription/status` and
 * `/api/billing/transactions`. There is no server-side state to forward.
 *
 * Pre D.1 S8-skip cleanup (2026-05-28) this load function used to read
 * `DsaApplications.subscription` and surface a legacy plan picker /
 * payment-history table. That legacy path was archived alongside the
 * one-time-pay `/api/billing/subscribe` + `/api/billing/cancel` endpoints
 * — the recurring auto-pay flow (D.1 S2 onwards) is now the only path.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S8 (skipped)
 * ══════════════════════════════════════════════════════════════════
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'dsa');
	return {};
};
