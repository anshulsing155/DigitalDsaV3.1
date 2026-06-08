/**
 * POST /api/billing/subscribe-recurring
 * ══════════════════════════════════════════════════════════════════
 * DSA-initiated subscription to recurring billing per D.1 §4 S2.
 *
 * Flow:
 *   1. Auth + rate-limit
 *   2. Look up DSA + check existing subscription state
 *      - in active/paused/dunning_* → 409 (use change-plan instead)
 *      - in pending_mandate with prior still live → 409 (per §4 S2)
 *   3. Call provider.registerMandate() → returns pending_registration_id +
 *      customer_id + auth URL
 *   4. createOrRefreshPending() persists the pending_mandate doc
 *   5. Return auth URL + first-charge date + free-days count for the
 *      subscribe modal disclosure
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S2 + §11.1
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { ObjectId } from 'mongodb';
import { dev } from '$app/environment';
import {
	apiOk,
	apiError,
	apiServerError,
	apiStructuredError,
	parseJsonBody
} from '$lib/server/apiResponse';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards';
import { rateLimit } from '$lib/server/rateLimiter';
import logger from '$lib/server/logger';
import { PLANS, TRIAL_DAYS, TRIAL_PLAN, type PlanId } from '$lib/config/billing';
import { getBillingProvider } from '$lib/server/billing/providerRegistry';
import {
	createOrRefreshPending,
	findByDsaId
} from '$lib/server/billing/subscriptionStore';
import {
	daysUntilFirstCharge,
	firstChargeAtForSubscribe
} from '$lib/server/billing/anchorAssignment';
import { checkTrialEligibility, hashIdentifier } from '$lib/server/billing/trialEligibility';
import { DsaApplications } from '$lib/database/mongo';

/**
 * Trial duration + plan now read from the shared constants in
 * `$lib/config/billing` (TRIAL_DAYS, TRIAL_PLAN) — the single source of
 * truth across API handlers AND landing-page copy. Previously shadowed
 * locally; consolidated 2026-05-28 to eliminate drift.
 */
const TRIAL_PLAN_ID: PlanId = TRIAL_PLAN;

interface SubscribeBody {
	plan_id: PlanId;
	/**
	 * When true, the DSA is requesting the free-trial path. Server checks
	 * eligibility (one-trial-per-DSA across mobile/PAN/GST/device) and
	 * either grants OR returns 409 with code: TRIAL_INELIGIBLE.
	 *
	 * The server FORCES plan_id to 'pro' when trial is granted — the
	 * `plan_id` in the body is ignored on the trial path.
	 */
	trial?: boolean;
	/**
	 * Client-supplied device ID (stable UUID from localStorage). Only
	 * inspected when `trial: true`. Optional — clients in incognito mode
	 * or locked-down environments may not be able to supply one; the gate
	 * gracefully degrades to the 3 PII identifiers in that case.
	 */
	device_id?: string;
}

// Per §11 Q3: per-debit cap = monthly × 1.5
function maxAmountFor(plan: (typeof PLANS)[PlanId]): number {
	return Math.round(plan.amountPaise * 1.5);
}

export const POST: RequestHandler = async ({ request, locals }) => {
	// Auth: DSA-only
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const userId = locals.user!.id;

	// Rate limit: 5/hr/user per §6 security checklist
	const limited = await rateLimit(userId, {
		identifier: `billing-subscribe-recurring:${userId}`,
		maxRequests: 5,
		windowMs: 60 * 60 * 1000
	});
	if (limited) return apiError('Too many subscribe attempts. Please wait before trying again.', 429);

	// Parse body
	const parsed = await parseJsonBody<SubscribeBody>(request);
	if (!parsed.ok) return parsed.response;
	const {
		plan_id: requestedPlanId,
		trial: trialRequested = false,
		device_id: clientDeviceId
	} = parsed.data;

	const dsaObjectId = new ObjectId(userId);

	// ── Identity resolution ─────────────────────────────────────────
	//
	// Both the trial path AND the paid path below need DSA fields (name,
	// mobile, email) for the Razorpay customer record. Production: require
	// a DsaApplications row — non-DSA identities (admin / RM with mismatched
	// _id) hit a structured 403 so they don't create orphan subscription
	// docs. Dev: fall back to the JWT payload so admin testers can exercise
	// the full Razorpay-test-mode flow without first impersonating a DSA.
	// The fallback subscription row stores `dsa_id = admin._id` — quirky
	// but harmless in a dev DB. (Admin impersonation in BOTH environments
	// is unaffected — during impersonation hooks.server.ts sets
	// locals.user.id to the target DSA's _id, so the lookup succeeds.)
	const dsaDoc = await DsaApplications.findOne(
		{ _id: dsaObjectId },
		{ projection: { name: 1, mobileNumber: 1, email: 1 } }
	);
	if (!dsaDoc && !dev) {
		logger.warn(
			{
				jwt_user_id: userId,
				user_role: locals.user!.role,
				active_role: locals.user!.activeRole,
				roles: locals.user!.roles
			},
			'billing-subscribe-recurring: JWT user is not a DSA (production block)'
		);
		return apiStructuredError(
			"You're signed in under a non-DSA identity (likely RM or admin). Sign out and log in as a DSA to set up auto-pay.",
			{ code: 'USER_NOT_DSA' },
			403
		);
	}
	if (!dsaDoc) {
		logger.warn(
			{
				jwt_user_id: userId,
				user_role: locals.user!.role,
				active_role: locals.user!.activeRole
			},
			'billing-subscribe-recurring: dev-mode bypass — non-DSA identity proceeding with JWT payload data'
		);
	}
	// Effective customer fields for Razorpay — DSA doc when present, JWT
	// payload otherwise. The JWT payload is populated in hooks.server.ts
	// from whichever collection resolved the user (DSA / RM / Admin), so
	// `locals.user.name / email / mobileNumber` is always present for any
	// authenticated session.
	const customerName = dsaDoc?.name || locals.user!.name || `User ${userId}`;
	// Fallback uses example.com — RFC 2606 reserved TLD that always passes
	// email-format validators (including Razorpay's). The previous
	// .placeholder TLD failed Razorpay validation, surfacing as a 500
	// during the dev-mode admin-bypass smoke test 2026-06-01.
	const customerEmail = dsaDoc?.email || locals.user!.email || `${userId}@example.com`;
	const customerMobileRaw = dsaDoc?.mobileNumber ?? locals.user!.mobileNumber;

	// ── Trial eligibility check (server is authoritative) ───────────
	//
	// If the DSA asked for trial, verify eligibility. Server overrides
	// plan_id to TRIAL_PLAN_ID (pro) if granted. If they're ineligible
	// (mobile/PAN/GST/device matches a prior trial), return a structured
	// 409. We deliberately expose `blocking_identifier: 'device'` in the
	// response when device was the matching layer — telling the DSA "this
	// device has been used for a trial" doesn't leak anything they don't
	// already know (they're literally using the device). For mobile/PAN/
	// GST matches we keep the response generic ("Trials are once-per-DSA")
	// so abusers can't iterate identifiers and learn which one tripped.
	let grantTrial = false;
	let effectivePlanId: PlanId = requestedPlanId;
	// Pre-compute the device hash once so we can pass it through to
	// recordTrialGrant via the pending sub doc (avoids the webhook needing
	// to receive plaintext device_id, which would require an extra round-trip).
	const deviceIdHash = trialRequested ? hashIdentifier('device', clientDeviceId) : null;

	if (trialRequested) {
		const eligibility = await checkTrialEligibility(dsaObjectId, {
			device_id: clientDeviceId
		});
		if (eligibility.eligible) {
			grantTrial = true;
			effectivePlanId = TRIAL_PLAN_ID;
		} else {
			const code =
				eligibility.reason === 'pan_missing'
					? 'TRIAL_PAN_REQUIRED'
					: eligibility.reason === 'dsa_not_found'
						? 'DSA_NOT_FOUND'
						: 'TRIAL_INELIGIBLE';
			const isDeviceMatch = eligibility.blockingIdentifier === 'device';
			return apiStructuredError(
				eligibility.reason === 'pan_missing'
					? 'Please complete onboarding (including PAN) to start your free trial.'
					: isDeviceMatch
						? 'This device has already been used for a free trial. Free trials are once-per-DSA — pick a plan to continue.'
						: 'Trials are once-per-DSA. Pick a plan to continue with auto-pay.',
				{
					code,
					// Only expose `blocking_identifier` when device matched —
					// for PII matches we deliberately don't say which one.
					...(isDeviceMatch && { blocking_identifier: 'device' as const })
				},
				409
			);
		}
	}

	const plan = PLANS[effectivePlanId];
	if (!plan) return apiError('Invalid plan', 400);

	try {
		// Customer fields resolved above — DSA doc when present, JWT payload
		// otherwise (dev-mode bypass for admin/RM testers).

		// Normalize mobile to E.164 (+91XXXXXXXXXX). Mongo stores it as a
		// number; strip non-digits + ensure 10-digit body + prefix +91.
		const mobileStr = String(customerMobileRaw ?? '').replace(/\D/g, '');
		const mobileE164 = mobileStr.length === 10 ? `+91${mobileStr}` : `+${mobileStr}`;

		// Check existing subscription state — block re-subscribe from
		// active/paused/dunning states (caller should use change-plan
		// or update-payment-method instead).
		const existing = await findByDsaId(dsaObjectId);
		if (existing) {
			if (
				existing.state === 'active' ||
				existing.state === 'paused' ||
				existing.state === 'dunning_t0' ||
				existing.state === 'dunning_grace' ||
				existing.state === 'dunning_final'
			) {
				return apiStructuredError(
					'You already have a live subscription. Use Change Plan or Update Payment Method instead.',
					{ code: 'ACTIVE_SUBSCRIPTION_EXISTS', currentState: existing.state },
					409
				);
			}

			// Pending re-subscribe policy (§4 S2): block ANY re-subscribe while
			// there's a live pending_mandate. Pre-fix, this only fired when
			// existing.mandate_token was set — but for a normal pending_mandate
			// doc the token is undefined (only set when the webhook arrives),
			// so the 409 path was effectively dead code. The code fell through
			// to createOrRefreshPending() which overwrote the pending, creating
			// orphan Razorpay invoices on every retry. Surfaced during D.1 S2
			// smoke 2026-05-26 (we accumulated 3+ orphan inv_* records).
			//
			// Since the cleanup cron (Test 14) sweeps stale pending_mandate →
			// not_subscribed after 24h, any pending_mandate currently in the DB
			// is by definition "still live within the window" — no provider
			// roundtrip needed to confirm.
			//
			// Edge: if existing.mandate_token IS set (shouldn't happen in normal
			// flow), we still 409 to be safe — caller's use-case is the same.
			if (existing.state === 'pending_mandate') {
				return apiStructuredError(
					'A subscription authorization is already pending. Complete it or wait for it to expire.',
					{ code: 'PENDING_AUTHORIZATION', currentState: existing.state },
					409
				);
			}
		}

		// Call provider.registerMandate
		const provider = getBillingProvider();
		const mandateResult = await provider.registerMandate({
			dsa_id: userId,
			plan_id: effectivePlanId,
			max_amount_paise: maxAmountFor(plan),
			frequency: 'monthly',
			customer_name: customerName,
			customer_email: customerEmail,
			customer_mobile: mobileE164,
			verification_charge_paise: 100 // ₹1 per §11.1 (forced to 0 in razorpay.ts for eMandate)
		});

		// Persist pending_mandate state — carry the trial flag through so
		// the webhook handler can branch on it at pending → active. Also
		// persist the device hash so the async webhook can insert the
		// 'device' blocklist row without needing the original plaintext id.
		await createOrRefreshPending({
			dsa_id: dsaObjectId,
			plan_id: effectivePlanId,
			max_amount_paise: maxAmountFor(plan),
			provider: provider.name,
			pending_registration_id: mandateResult.pending_registration_id,
			provider_customer_id: mandateResult.customer_id,
			pending_expires_at: mandateResult.expires_at,
			...(grantTrial && { is_trial: true }),
			...(grantTrial && deviceIdHash && { pending_device_id_hash: deviceIdHash })
		});

		// Compute first-charge date for subscribe-modal disclosure
		const now = new Date();
		const firstCharge = grantTrial
			? new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
			: firstChargeAtForSubscribe(now);
		const freeDays = grantTrial ? TRIAL_DAYS : daysUntilFirstCharge(now);

		logger.info(
			{
				dsa_id: userId,
				plan_id: effectivePlanId,
				is_trial: grantTrial,
				pending_registration_id: mandateResult.pending_registration_id
			},
			grantTrial
				? 'billing-subscribe-recurring: trial pending mandate created'
				: 'billing-subscribe-recurring: pending mandate created'
		);

		return apiOk({
			authorization_url: mandateResult.authorization_url,
			pending_registration_id: mandateResult.pending_registration_id,
			expires_at: mandateResult.expires_at.toISOString(),
			first_charge_at: firstCharge.toISOString(),
			free_days_count: freeDays,
			is_trial: grantTrial,
			plan_id: effectivePlanId,
			plan_name: plan.name,
			// Subscribe modal disclosure copy. Trial path swaps the second
			// line to set the TRIAL_DAYS-day free-then-charge expectation;
			// the ₹1 verification copy stays unchanged either way. Duration
			// always reads from the SSOT `TRIAL_DAYS` constant — never a
			// hardcoded literal, so a promotional flip stays in lockstep.
			disclosure: {
				verification_charge:
					'Your bank may show a ₹1 debit and ₹1 refund — that is the standard authorization step for recurring payments. No money is moved.',
				free_access: grantTrial
					? `Free for ${TRIAL_DAYS} days. On ${firstCharge.toDateString()} we will charge ₹${plan.priceMonthly.toLocaleString('en-IN')} for your first ${plan.name} cycle. Cancel anytime before then and you will not be charged.`
					: `Your first charge of ₹${plan.priceMonthly.toLocaleString('en-IN')} will be on ${firstCharge.toDateString()}. You have ${freeDays} day${freeDays === 1 ? '' : 's'} of free access until then.`
			}
		});
	} catch (err) {
		return apiServerError(err, 'Subscription service unavailable');
	}
};
