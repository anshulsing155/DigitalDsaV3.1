/**
 * F.1 — Referral codes (DSA-acquires-DSA growth loop)
 * ══════════════════════════════════════════════════════════════════════
 * Every DSA gets a unique 8-char referral_code at signup. When someone
 * signs up via /r/<code> → /signup?ref=<code>, the new DSA's
 * referred_by is set to the referrer's code AND a Referrals row is
 * inserted. When the new DSA completes their FIRST PAID subscription
 * (D.1 chargeEngine.handleSuccess), both DSAs get a 1-month reward
 * — 30 days pushed onto their next_charge_at.
 *
 * Self-referral block: at signup, we reject if the referrer's mobile
 * matches the new DSA's mobile. Device fingerprint is a secondary
 * defense (out of scope v1 — mobile dedup catches the common case).
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §F.1
 */

import type { ObjectId } from 'mongodb';

export type ReferralRewardStatus = 'pending' | 'credited' | 'void';

export interface ReferralDoc {
	_id?: ObjectId;
	/** The referrer's DSA _id (who shared the link). */
	referrer_dsa_id: ObjectId;
	/** The new DSA's _id (who signed up via the link). */
	referred_dsa_id: ObjectId;
	/** The referrer's referral_code at the time of signup. */
	code: string;
	/** When the referred DSA signed up. */
	joined_at: Date;
	/** When the referred DSA's FIRST PAID subscription succeeded. Absent until then. */
	subscribed_at?: Date;
	/**
	 * pending  — referred user joined but hasn't paid for a subscription yet
	 * credited — first paid sub fired; both DSAs got their reward
	 * void     — invalidated (self-referral detected late, fraud, manual op)
	 */
	reward_status: ReferralRewardStatus;
	/** Always 'free_month' in v1; future variants like 'da_topup' would extend here. */
	reward_type: 'free_month';
	/** When the reward was credited to the referrer. */
	reward_credited_to_referrer_at?: Date;
	/** When the reward was credited to the referee. */
	reward_credited_to_referee_at?: Date;
	/** Operator-set reason when status === 'void'. */
	void_reason?: string;
}

/** Cookie name for ?ref= capture between landing and signup. 30-day max-age. */
export const REFERRAL_COOKIE_NAME = 'dsa_referral_code';
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** Reward duration. 30 days = 1 free month, the simplest representation that
 * works for any subscription cycle. ChargeEngine pushes next_charge_at by this. */
export const REFERRAL_REWARD_DAYS = 30;
