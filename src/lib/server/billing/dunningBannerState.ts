/**
 * D.1 S5 M4 — Dunning banner state loader
 * ══════════════════════════════════════════════════════════════════
 * Pure server-side helper that decides whether the DSA dashboard +
 * in-app layouts should render the persistent dunning banner.
 *
 * Returns `null` (skip rendering) for every non-DSA caller and every
 * DSA whose subscription is NOT in a dunning_* state. The role gate
 * is the first short-circuit so this is cheap on RM / admin / public-
 * page loads (no Mongo round-trip).
 *
 * Wired into the root `+layout.server.ts` so the banner state is
 * available on EVERY navigation in the app — DSA dashboard, form
 * pages, settings, etc. Per `/start` choice 2026-05-27: "server load
 * per nav" (vs. session-bootstrap-with-invalidate). The cost is one
 * Mongo find per DSA navigation, which is a covered O(log n) on the
 * `dsa_id` unique index.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S5 (in-app banner)
 * ══════════════════════════════════════════════════════════════════
 */

import { ObjectId } from 'mongodb';
import { BillingSubscriptions } from '$lib/database/mongo';
import logger from '$lib/server/logger';

/** Banner-relevant subscription states — the cron walks t0 → grace → final → downgraded. */
export type DunningBannerState = 'dunning_t0' | 'dunning_grace' | 'dunning_final';

/**
 * Serializable shape passed to the client. Dates are ISO strings so
 * SvelteKit doesn't have to deal with structured-clone of Date objects
 * across the SSR boundary.
 */
export interface DunningBannerData {
	state: DunningBannerState;
	dunningStartedAtIso: string;
	planId: string;
}

interface Locals {
	user?: { id?: string; role?: string } | null;
}

/**
 * Decide whether the banner should render. Returns null when:
 *   - no authenticated user (public page, login screen, etc.)
 *   - user is not a DSA (RM / admin pages — banner is DSA-only)
 *   - user has no subscription (never subscribed, or doc lookup failed)
 *   - subscription is not in a dunning_* state (active / paused /
 *     cancelled / downgraded — note: terminal `downgraded` has its own
 *     dedicated screen, not a banner)
 *
 * Errors are caught + logged; banner is never load-blocking — a
 * billing-collection blip should not prevent the DSA's dashboard from
 * rendering. They'll see the banner on the next navigation if the
 * subscription is still in dunning.
 */
export async function loadDunningBannerState(
	locals: Locals
): Promise<DunningBannerData | null> {
	// Short-circuit BEFORE any Mongo work for non-DSA contexts. Most page
	// loads hit one of these branches.
	if (!locals.user?.id) return null;
	if (locals.user.role !== 'dsa') return null;

	let userIdObj: ObjectId;
	try {
		userIdObj = new ObjectId(locals.user.id);
	} catch {
		// 'demo-guest' or another non-ObjectId id — no subscription to look up.
		return null;
	}

	try {
		const sub = await BillingSubscriptions.findOne(
			{ dsa_id: userIdObj },
			{ projection: { state: 1, dunning_started_at: 1, plan_id: 1 } }
		);
		if (!sub) return null;
		if (
			sub.state !== 'dunning_t0' &&
			sub.state !== 'dunning_grace' &&
			sub.state !== 'dunning_final'
		) {
			return null;
		}
		if (!sub.dunning_started_at) {
			// Data drift — same defensive log path as the cron's
			// skipped_missing_dunning_started_at branch. Without the
			// timestamp the banner can't compute "X days left" copy
			// accurately, so we skip rather than render a broken state.
			logger.warn(
				{ dsa_id: locals.user.id, state: sub.state },
				'dunningBanner: subscription in dunning state but dunning_started_at missing — skipping banner render'
			);
			return null;
		}
		return {
			state: sub.state,
			dunningStartedAtIso: sub.dunning_started_at.toISOString(),
			planId: String(sub.plan_id)
		};
	} catch (err) {
		logger.error(
			{ dsa_id: locals.user.id, err: (err as Error).message },
			'dunningBanner: load failed (banner skipped this nav)'
		);
		return null;
	}
}
