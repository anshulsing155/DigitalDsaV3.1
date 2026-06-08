/**
 * F.1 — Referral reward crediting
 * ══════════════════════════════════════════════════════════════════════
 * Called from chargeEngine.handleSuccess on every successful charge.
 * The function itself decides whether the charge is eligible — by
 * checking for a Referrals row with status='pending' for this DSA.
 * Idempotent: subsequent calls find status='credited' and skip.
 *
 * Reward: push next_charge_at forward by REFERRAL_REWARD_DAYS (30 days)
 * on BOTH the referrer's AND the referee's BillingSubscriptions. The
 * effect is "1 free month" expressed as a billing-anchor delay, which
 * works regardless of monthly vs (future) annual cycles.
 *
 * Best-effort end-to-end: a failure anywhere in this function logs but
 * does NOT throw — the charge has already succeeded, and the audit row
 * survives. Ops can investigate via the pending-rewards index.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §F.1
 */

import type { ObjectId } from 'mongodb';
import { Referrals, BillingSubscriptions } from '$lib/database/mongo';
import logger from '$lib/server/logger';
import { REFERRAL_REWARD_DAYS } from '$lib/types/referral';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface CreditRewardResult {
	credited: boolean;
	skipped_reason?:
		| 'no_referral'
		| 'already_credited'
		| 'voided'
		| 'referrer_sub_missing'
		| 'error';
	referrer_dsa_id?: string;
}

/**
 * Try to credit a referral reward for this DSA's successful charge.
 * Safe to call on every charge — does its own eligibility gating.
 */
export async function creditReferralRewardIfEligible(
	refereeDsaId: ObjectId,
	now: Date = new Date()
): Promise<CreditRewardResult> {
	try {
		// 1. Look for a pending referral for this referee.
		const referral = await Referrals.findOne({ referred_dsa_id: refereeDsaId });
		if (!referral) return { credited: false, skipped_reason: 'no_referral' };
		if (referral.reward_status === 'credited') {
			return { credited: false, skipped_reason: 'already_credited' };
		}
		if (referral.reward_status === 'void') {
			return { credited: false, skipped_reason: 'voided' };
		}

		const rewardMs = REFERRAL_REWARD_DAYS * MS_PER_DAY;

		// 2. Push referee's next_charge_at forward. We require the referee's
		// sub to exist; the success path that called us guarantees this.
		const refereeUpdate = await BillingSubscriptions.findOneAndUpdate(
			{ dsa_id: refereeDsaId },
			[
				{
					// Aggregation-pipeline update so we can add Days using
					// $dateAdd — handles month-boundary correctly via the
					// MongoDB server's date arithmetic.
					$set: {
						next_charge_at: {
							$dateAdd: {
								startDate: '$next_charge_at',
								unit: 'day',
								amount: REFERRAL_REWARD_DAYS
							}
						},
						updated_at: now
					}
				}
			] as Parameters<typeof BillingSubscriptions.findOneAndUpdate>[1],
			{ returnDocument: 'after' }
		);
		if (!refereeUpdate?._id) {
			// Defensive: subscription should exist (we got here via its charge).
			logger.warn(
				{ referee_dsa_id: String(refereeDsaId) },
				'[referral-credit] referee subscription missing — reward not applied'
			);
			return { credited: false, skipped_reason: 'referrer_sub_missing' };
		}

		// 3. Push referrer's next_charge_at forward. Skip silently if the
		// referrer's sub doesn't exist (they may have cancelled in the
		// meantime — the referee still got their +30 days, but the
		// referrer's reward voids quietly). The Referrals row records
		// the partial credit so an operator can investigate later.
		const referrerUpdate = await BillingSubscriptions.findOneAndUpdate(
			{ dsa_id: referral.referrer_dsa_id, state: 'active' },
			[
				{
					$set: {
						next_charge_at: {
							$dateAdd: {
								startDate: '$next_charge_at',
								unit: 'day',
								amount: REFERRAL_REWARD_DAYS
							}
						},
						updated_at: now
					}
				}
			] as Parameters<typeof BillingSubscriptions.findOneAndUpdate>[1],
			{ returnDocument: 'after' }
		);

		// 4. Flip the Referrals row to credited. Even when the referrer's
		// sub was missing we mark credited (with only the referee-credit
		// timestamp set) — the reward fired for one side, and we don't
		// want a future retry to double-credit the referee.
		await Referrals.updateOne(
			{ _id: referral._id },
			{
				$set: {
					reward_status: 'credited',
					subscribed_at: now,
					reward_credited_to_referee_at: now,
					...(referrerUpdate?._id && { reward_credited_to_referrer_at: now })
				}
			}
		);

		logger.info(
			{
				referee_dsa_id: String(refereeDsaId),
				referrer_dsa_id: String(referral.referrer_dsa_id),
				code: referral.code,
				referrer_credited: !!referrerUpdate?._id,
				reward_days: REFERRAL_REWARD_DAYS
			},
			'[referral-credit] reward credited'
		);

		return {
			credited: true,
			referrer_dsa_id: String(referral.referrer_dsa_id)
		};
	} catch (err) {
		logger.error(
			{ err, referee_dsa_id: String(refereeDsaId) },
			'[referral-credit] threw — charge already succeeded, reward not applied'
		);
		return { credited: false, skipped_reason: 'error' };
	}
}
