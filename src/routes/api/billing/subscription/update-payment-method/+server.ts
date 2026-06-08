/**
 * POST /api/billing/subscription/update-payment-method (D.1 S6 §4 S6 M3)
 * ══════════════════════════════════════════════════════════════════
 * DSA-initiated mandate replacement (card expired, bank changed,
 * etc). Registers a NEW mandate at the provider; the existing
 * mandate keeps working until the webhook arrives and swaps it.
 * Subscription state is preserved throughout — active stays active,
 * dunning stays dunning, paused stays paused.
 *
 * Flow:
 *   1. Auth + rate-limit (10/hr/user)
 *   2. Look up sub; require state ∈ {active, paused, dunning_*}
 *   3. Reject 409 if replacement already in flight (and unexpired)
 *   4. Look up DSA contact details (DsaApplications)
 *   5. provider.registerMandate() → fresh authorization URL
 *   6. Atomically stamp pending_replacement_* + mandate_update_lock_until
 *   7. Audit log; return URL
 *
 * Concurrency guards:
 *   - `mandate_update_lock_until` (5 min): chargeEngine skips this row
 *     while held → can't charge old mandate moments before webhook swap
 *   - `pending_replacement_*` (24h): blocks a second update-payment-method
 *     call until prior expires or webhook completes
 *
 * Abandonment behavior (DSA never finishes bank-side auth):
 *   - mandate_update_lock_until expires after 5 min → cron resumes normal
 *     charges on the OLD mandate (spec: "old mandate stays in force")
 *   - pending_replacement_expires_at expires after 24h; a fresh
 *     update-payment-method call from the DSA overwrites the stale fields
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S6 M3 (line 396)
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { ObjectId } from 'mongodb';
import {
	apiOk,
	apiError,
	apiServerError,
	apiStructuredError
} from '$lib/server/apiResponse';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards';
import { rateLimit } from '$lib/server/rateLimiter';
import logger from '$lib/server/logger';
import { PLANS } from '$lib/config/billing';
import { getBillingProvider } from '$lib/server/billing/providerRegistry';
import {
	findByDsaId,
	setPendingReplacement
} from '$lib/server/billing/subscriptionStore';
import { writeBillingAuditLog } from '$lib/server/billing/billingAuditLog';
import { DsaApplications } from '$lib/database/mongo';
import { dev } from '$app/environment';

/** States where a replacement mandate flow is meaningful. */
const REPLACEABLE_STATES = new Set([
	'active',
	'paused',
	'dunning_t0',
	'dunning_grace',
	'dunning_final'
]);

/** Short advisory-lock window — see Pitfall candidate "R6 update-payment-method race". */
const LOCK_DURATION_MS = 5 * 60 * 1000;
/** Provider registration-link TTL — matches the 24h Razorpay hosted-auth window. */
const REPLACEMENT_TTL_MS = 24 * 60 * 60 * 1000;

export const POST: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const userId = locals.user!.id;

	// Same 10/hr/user envelope as pause/resume/cancel — these are legitimate
	// DSA actions, not abuse vectors. The limit just catches buggy-client
	// retry storms.
	const limited = await rateLimit(userId, {
		identifier: `billing-update-payment-method:${userId}`,
		maxRequests: 10,
		windowMs: 60 * 60 * 1000
	});
	if (limited) {
		return apiError('Too many update attempts. Please wait an hour.', 429);
	}

	try {
		const dsaObjectId = new ObjectId(userId);
		const sub = await findByDsaId(dsaObjectId);
		if (!sub) return apiError('No subscription found', 404);

		if (!REPLACEABLE_STATES.has(sub.state)) {
			// pending_mandate, downgraded, cancelled, not_subscribed — the DSA
			// has no live mandate to replace. Send them to subscribe instead.
			return apiStructuredError(
				`Cannot update payment method from state: ${sub.state}. Subscribe first.`,
				{ code: 'NOT_SUBSCRIBED', currentState: sub.state },
				409
			);
		}

		const now = new Date();

		// Replacement already in flight? Reject — preserve the existing
		// registration so the DSA can complete it. Once it expires or the
		// webhook lands, a fresh call works.
		if (
			sub.pending_replacement_registration_id &&
			sub.pending_replacement_expires_at &&
			sub.pending_replacement_expires_at > now
		) {
			return apiStructuredError(
				'A payment method update is already in progress. Complete it or wait for it to expire.',
				{
					code: 'REPLACEMENT_IN_FLIGHT',
					expires_at: sub.pending_replacement_expires_at.toISOString()
				},
				409
			);
		}

		// Need contact details for the provider — same DSA lookup as
		// subscribe-recurring. DsaApplications is the dashboard-user
		// collection. Production blocks non-DSA identities; dev falls back
		// to JWT payload so admin testers can drive the Razorpay test-mode
		// update-payment flow without first impersonating a DSA. Mirrors
		// the bypass in subscribe-recurring + status (S216 2026-06-02).
		const dsaDoc = await DsaApplications.findOne(
			{ _id: dsaObjectId },
			{ projection: { name: 1, mobileNumber: 1, email: 1 } }
		);
		if (!dsaDoc && !dev) {
			logger.warn(
				{
					jwt_user_id: userId,
					user_role: locals.user!.role,
					active_role: locals.user!.activeRole
				},
				'update-payment-method: JWT user is not a DSA (production block)'
			);
			return apiError('DSA not found', 404);
		}
		const customerName = dsaDoc?.name || locals.user!.name || `User ${userId}`;
		// example.com (RFC 2606) — never .placeholder; that TLD fails Razorpay
		// format validation, surfaced as 500 during S216 dev-bypass smoke.
		const customerEmail = dsaDoc?.email || locals.user!.email || `${userId}@example.com`;
		const customerMobileRaw = dsaDoc?.mobileNumber ?? locals.user!.mobileNumber;

		const mobileStr = String(customerMobileRaw ?? '').replace(/\D/g, '');
		const mobileE164 =
			mobileStr.length === 10 ? `+91${mobileStr}` : `+${mobileStr}`;

		// Use the CURRENT plan's cap. M3 is a 1:1 mandate swap, not a tier
		// change — that's M4's job. Re-derive from PLANS so a future plan
		// price change is picked up (mandate cap = monthly × 1.5 per §11 Q3).
		const plan = PLANS[sub.plan_id];
		if (!plan) {
			return apiError(`Plan ${sub.plan_id} not found in PLANS config`, 500);
		}
		const max_amount_paise = Math.round(plan.amountPaise * 1.5);

		const provider = getBillingProvider();
		const mandateResult = await provider.registerMandate({
			dsa_id: userId,
			plan_id: sub.plan_id,
			max_amount_paise,
			frequency: 'monthly',
			customer_name: customerName,
			customer_email: customerEmail,
			customer_mobile: mobileE164,
			verification_charge_paise: 100 // ₹1 per §11.1 (overridden to 0 in razorpay.ts for eMandate)
		});

		const lock_until = new Date(now.getTime() + LOCK_DURATION_MS);
		const pending_expires_at = new Date(now.getTime() + REPLACEMENT_TTL_MS);

		const updated = await setPendingReplacement(
			dsaObjectId,
			mandateResult.pending_registration_id,
			pending_expires_at,
			lock_until
		);

		if (!updated) {
			// State moved out of REPLACEABLE_STATES between our pre-check and
			// this write (concurrent cancel etc). We've spawned a Razorpay
			// registration that we can't track now — log loudly so reconcile
			// can spot the orphan. Don't try to revoke (we may have no
			// authority to without the webhook's mandate_token).
			logger.warn(
				{
					userId,
					pending_registration_id: mandateResult.pending_registration_id,
					state_at_lookup: sub.state
				},
				'update-payment-method: state mutated during request — orphan registration created'
			);
			return apiError(
				'Subscription state changed during request. Please refresh and try again.',
				409
			);
		}

		await writeBillingAuditLog({
			event_class: 'subscription_transition',
			event_name: 'replacement_mandate_initiated',
			subscription_id: updated._id,
			dsa_id: updated.dsa_id,
			actor: 'dsa',
			payload: {
				source: 'update-payment-method-endpoint',
				current_state: sub.state,
				pending_registration_id: mandateResult.pending_registration_id,
				lock_until: lock_until.toISOString(),
				expires_at: pending_expires_at.toISOString()
			}
		});

		logger.info(
			{
				userId,
				current_state: sub.state,
				pending_registration_id: mandateResult.pending_registration_id
			},
			'update-payment-method: replacement mandate registered'
		);

		return apiOk({
			authorization_url: mandateResult.authorization_url,
			pending_replacement_registration_id: mandateResult.pending_registration_id,
			expires_at: pending_expires_at.toISOString(),
			message:
				'Complete authorization at your bank to switch to the new payment method. ' +
				'Your existing payment method continues to work until you finish.'
		});
	} catch (err) {
		return apiServerError(err, 'update-payment-method failed');
	}
};
