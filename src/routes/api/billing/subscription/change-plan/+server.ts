/**
 * POST /api/billing/subscription/change-plan (D.1 S6 §4 S6 M4)
 * ══════════════════════════════════════════════════════════════════
 * DSA-initiated plan change. Asymmetric handling per R8 policy
 * (locked 2026-05-25):
 *
 *   UPGRADE  → flip plan_id NOW. DSA gets immediate access to the new
 *              tier. Anchor + next_charge_at preserved. Days until
 *              next anchor are "gifted" (no proration math). Next
 *              debit fires on the same anchor at the NEW tier's rate.
 *              If the new tier's required mandate cap (monthly × 1.5)
 *              exceeds the existing mandate's cap → 409 with
 *              `needs_remandate: true`; the UI then routes through
 *              update-payment-method (M3) to register a fresh
 *              mandate with the higher cap.
 *
 *   DOWNGRADE → stamp `pending_downgrade_to`. plan_id stays put. The
 *               charge cron applies the flip at the next anchor (this
 *               hook already exists in chargeEngine.ts step 2). DSA
 *               keeps the higher tier through the current cycle —
 *               generous, simple, no proration code.
 *
 * Only allowed from `active`. dunning_* and paused are rejected —
 * resolve the failure / resume first.
 *
 * The caller passes the intended `change_kind`; the server VALIDATES
 * it against current vs requested plan tier so a client can't trick
 * a downgrade through the upgrade path (or vice versa).
 *
 * Auth: requireRoleApi('dsa') + CSRF + rate-limit 10/hr/user.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S6 M4 (line 397) + R8
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { ObjectId } from 'mongodb';
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
import { PLANS, type PlanId } from '$lib/config/billing';
import { findByDsaId } from '$lib/server/billing/subscriptionStore';
import { writeBillingAuditLog } from '$lib/server/billing/billingAuditLog';
import { processBlockedCasesAfter } from '$lib/server/billing/quotaUnblock';
import { BillingSubscriptions } from '$lib/database/mongo';

interface ChangePlanBody {
	new_plan_id: PlanId;
	change_kind: 'upgrade' | 'downgrade';
}

/** Tier ordering by monthly price — drives upgrade/downgrade detection. */
function planRank(plan_id: PlanId): number {
	return PLANS[plan_id].amountPaise;
}

function detectKind(current: PlanId, target: PlanId): 'upgrade' | 'downgrade' | 'same' {
	const cur = planRank(current);
	const tgt = planRank(target);
	if (tgt > cur) return 'upgrade';
	if (tgt < cur) return 'downgrade';
	return 'same';
}

/** monthly × 1.5 per §11 Q3. */
function requiredMandateCap(plan_id: PlanId): number {
	return Math.round(PLANS[plan_id].amountPaise * 1.5);
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const userId = locals.user!.id;

	const limited = await rateLimit(userId, {
		identifier: `billing-change-plan:${userId}`,
		maxRequests: 10,
		windowMs: 60 * 60 * 1000
	});
	if (limited) {
		return apiError('Too many plan-change attempts. Please wait an hour.', 429);
	}

	const parsed = await parseJsonBody<ChangePlanBody>(request);
	if (!parsed.ok) return parsed.response;
	const { new_plan_id, change_kind } = parsed.data;

	if (!new_plan_id || !PLANS[new_plan_id]) {
		return apiError('Invalid new_plan_id', 400);
	}
	if (change_kind !== 'upgrade' && change_kind !== 'downgrade') {
		return apiError('change_kind must be "upgrade" or "downgrade"', 400);
	}

	try {
		const dsaObjectId = new ObjectId(userId);
		const sub = await findByDsaId(dsaObjectId);
		if (!sub) return apiError('No subscription found', 404);

		// Only active subs can change plan. Dunning blocks until the failure
		// is resolved (downgrade-during-dunning would never apply per the
		// chargeEngine guard anyway). Paused blocks until resume.
		if (sub.state !== 'active') {
			return apiStructuredError(
				`Plan change not allowed from state: ${sub.state}. ` +
					(sub.state === 'paused'
						? 'Resume your subscription first.'
						: 'Resolve the payment issue first.'),
				{ code: 'INVALID_STATE', currentState: sub.state },
				409
			);
		}

		// Same-tier rejection — prevents a confusing no-op audit row.
		const detected = detectKind(sub.plan_id, new_plan_id);
		if (detected === 'same') {
			return apiError(
				`You are already on the ${PLANS[new_plan_id].name} plan.`,
				400
			);
		}

		// Validate caller's claim about the kind matches reality. If a client
		// asks for an "upgrade" but the target is actually cheaper, that's
		// either a bug or an attempt to bypass downgrade-deferral logic — reject.
		if (detected !== change_kind) {
			return apiStructuredError(
				`change_kind mismatch: requested "${change_kind}" but ${new_plan_id} is a ${detected} from ${sub.plan_id}.`,
				{
					code: 'KIND_MISMATCH',
					detected_kind: detected,
					current_plan: sub.plan_id,
					requested_plan: new_plan_id
				},
				400
			);
		}

		const now = new Date();

		if (change_kind === 'upgrade') {
			// Mandate cap check — the existing mandate may have been registered
			// with a cap that's too low to cover the new tier. Per §11 Q3 the
			// per-debit cap = monthly × 1.5. If the existing cap won't cover the
			// new tier, the DSA must re-mandate (M3 flow) first.
			const newRequiredCap = requiredMandateCap(new_plan_id);
			if (newRequiredCap > sub.max_amount_paise) {
				return apiStructuredError(
					'Your current mandate cap is too low for the new plan. Update your payment method first.',
					{
						code: 'NEEDS_REMANDATE',
						needs_remandate: true,
						current_mandate_cap_paise: sub.max_amount_paise,
						required_mandate_cap_paise: newRequiredCap
					},
					409
				);
			}

			// Atomic upgrade: flip plan_id + max_amount_paise. Precondition pins
			// on state=active + the current plan_id (so concurrent mutation can't
			// double-apply). Anchor + next_charge_at are deliberately NOT touched
			// (gift-the-days policy — current cycle stays at old amount; next
			// anchor will charge the new amount).
			//
			// Note we DO update max_amount_paise to reflect what the mandate
			// allows for the upgraded plan; the mandate at the provider keeps
			// its original cap (we already verified it covers the new tier).
			const updated = await BillingSubscriptions.findOneAndUpdate(
				{ dsa_id: dsaObjectId, state: 'active', plan_id: sub.plan_id },
				{
					$set: {
						plan_id: new_plan_id,
						max_amount_paise: newRequiredCap,
						updated_at: now
					},
					// Clear any prior pending_downgrade in case the DSA had stamped
					// one earlier in this cycle and is now reversing course with
					// an upgrade.
					$unset: { pending_downgrade_to: '' }
				},
				{ returnDocument: 'after' }
			);
			if (!updated) {
				return apiError(
					'Subscription state changed during request. Please refresh and try again.',
					409
				);
			}

			await writeBillingAuditLog({
				event_class: 'subscription_transition',
				event_name: 'plan_upgrade',
				subscription_id: updated._id,
				dsa_id: updated.dsa_id,
				actor: 'dsa',
				payload: {
					source: 'change-plan-endpoint',
					from_plan: sub.plan_id,
					to_plan: new_plan_id,
					mandate_cap_paise: newRequiredCap,
					next_charge_at: updated.next_charge_at?.toISOString()
				}
			});

			logger.info(
				{ userId, from_plan: sub.plan_id, to_plan: new_plan_id },
				'change-plan: upgrade applied immediately'
			);

			// QBC S2: auto-unblock any quota_blocked cases this DSA had
			// pending. The new tier's higher caseLimit creates fresh
			// capacity — pull blocked cases FIFO until saturated. Each
			// transitions stage='quota_blocked' -> 'intake'; the offer
			// computation runs via S3's /api/cron/process-unblocked-cases.
			// Catches errors so a quota-unblock glitch doesn't dead-end
			// the (successful) upgrade flow.
			let unblockSummary: { count: number; caseIds: string[] } = { count: 0, caseIds: [] };
			try {
				const result = await processBlockedCasesAfter(updated.dsa_id, new_plan_id, 'upgrade');
				unblockSummary = { count: result.unblockedCount, caseIds: result.unblockedCaseIds };
			} catch (unblockErr) {
				logger.warn(
					{ err: unblockErr, dsaId: updated.dsa_id, new_plan_id },
					'change-plan: auto-unblock failed after upgrade (non-fatal — cron will catch)'
				);
			}

			return apiOk({
				kind: 'upgrade',
				new_plan_id,
				state: updated.state,
				effective_from: 'immediately',
				next_charge_at: updated.next_charge_at?.toISOString(),
				...(unblockSummary.count > 0 && {
					unblocked: {
						count: unblockSummary.count,
						case_ids: unblockSummary.caseIds
					}
				}),
				message:
					`Upgraded to ${PLANS[new_plan_id].name}. New rate applies from the next billing cycle (${updated.next_charge_at?.toDateString() ?? 'soon'}).` +
					(unblockSummary.count > 0
						? ` ${unblockSummary.count} saved case${unblockSummary.count === 1 ? '' : 's'} now processing.`
						: '')
			});
		}

		// ── DOWNGRADE ────────────────────────────────────────────
		// Stamp pending_downgrade_to. plan_id stays put. chargeEngine.ts
		// step 2 reads the field at the next anchor, flips plan_id BEFORE
		// the charge call, and unsets the flag in the same updateOne.
		const updated = await BillingSubscriptions.findOneAndUpdate(
			{ dsa_id: dsaObjectId, state: 'active', plan_id: sub.plan_id },
			{
				$set: {
					pending_downgrade_to: new_plan_id,
					updated_at: now
				}
			},
			{ returnDocument: 'after' }
		);
		if (!updated) {
			return apiError(
				'Subscription state changed during request. Please refresh and try again.',
				409
			);
		}

		await writeBillingAuditLog({
			event_class: 'subscription_transition',
			event_name: 'plan_downgrade_scheduled',
			subscription_id: updated._id,
			dsa_id: updated.dsa_id,
			actor: 'dsa',
			payload: {
				source: 'change-plan-endpoint',
				from_plan: sub.plan_id,
				to_plan: new_plan_id,
				effective_at: updated.next_charge_at?.toISOString()
			}
		});

		logger.info(
			{ userId, from_plan: sub.plan_id, to_plan: new_plan_id },
			'change-plan: downgrade scheduled for next anchor'
		);

		return apiOk({
			kind: 'downgrade',
			current_plan_id: sub.plan_id,
			pending_downgrade_to: new_plan_id,
			effective_at: updated.next_charge_at?.toISOString(),
			message: `Downgrade scheduled. You keep ${PLANS[sub.plan_id].name} access through ${updated.next_charge_at?.toDateString() ?? 'the next billing date'}, then switch to ${PLANS[new_plan_id].name}.`
		});
	} catch (err) {
		return apiServerError(err, 'change-plan failed');
	}
};
