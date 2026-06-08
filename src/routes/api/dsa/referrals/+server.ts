/**
 * GET /api/dsa/referrals
 * ══════════════════════════════════════════════════════════════════════
 * Return the calling DSA's referral stats for the "Refer & earn"
 * dashboard section. Counts:
 *   invited_count    — total Referrals rows where this DSA is referrer
 *   joined_count     — same (every row implies a successful signup)
 *   subscribed_count — rows where reward_status='credited'
 *   pending_count    — rows where reward_status='pending'
 *   rewards_credited — count of credited (= months earned for referrer)
 *
 * Plus a list of the most-recent 20 referrals with mobile partials
 * (e.g. "+91 98XXXX1234" — last 4 visible, middle redacted) and
 * status. Mobile is masked because the referrer doesn't need the full
 * number, just enough to recognise their own contact.
 *
 * Auth: DSA-only.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §F.1
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse';
import { requireRoleApi } from '$lib/server/guards';
import {
	DsaApplications,
	Referrals
} from '$lib/database/mongo';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle';
import { PUBLIC_APP_BASE_URL } from '$lib/config/publicAppUrl';
import type { ReferralRewardStatus } from '$lib/types/referral';

/** "+91 98XXXX1234" — keep first 2 + last 4, mask middle. */
function maskMobile(raw: string | number | undefined | null): string {
	if (raw === undefined || raw === null) return '';
	const s = String(raw).replace(/\D/g, '');
	if (s.length < 6) return s;
	return `+91 ${s.slice(0, 2)}XXXX${s.slice(-4)}`;
}

export const GET: RequestHandler = async ({ locals }) => {
	const authError = requireRoleApi(locals, 'dsa');
	if (authError) return authError;
	const sessionUser = locals.user!;

	try {
		const dsa = await findUserByMobile(DsaApplications, sessionUser.mobileNumber);
		if (!dsa?._id) return apiError('DSA profile not found', 404);
		const dsaPlain = (await decryptUserPii(dsa)) ?? dsa;
		const refCode = dsaPlain.referral_code as string | undefined;

		// Aggregate counts in one $facet query — single round-trip.
		const [agg] = await Referrals.aggregate([
			{ $match: { referrer_dsa_id: dsa._id } },
			{
				$facet: {
					counts: [
						{
							$group: {
								_id: null,
								invited: { $sum: 1 },
								credited: {
									$sum: { $cond: [{ $eq: ['$reward_status', 'credited'] }, 1, 0] }
								},
								pending: {
									$sum: { $cond: [{ $eq: ['$reward_status', 'pending'] }, 1, 0] }
								}
							}
						}
					],
					recent: [
						{ $sort: { joined_at: -1 } },
						{ $limit: 20 },
						{
							$project: {
								_id: 0,
								code: 1,
								joined_at: 1,
								subscribed_at: 1,
								reward_status: 1,
								referred_dsa_id: 1
							}
						}
					]
				}
			}
		]).toArray();

		const counts = (agg?.counts?.[0] as
			| { invited?: number; credited?: number; pending?: number }
			| undefined) ?? { invited: 0, credited: 0, pending: 0 };

		// Decorate recent referrals with masked mobile for the UI. One
		// lookup per recent (≤20) — fine; the alternative ($lookup) would
		// drag CSFLE-encrypted fields through aggregation which is fragile.
		const recentRaw = (agg?.recent ?? []) as Array<{
			code: string;
			joined_at: Date;
			subscribed_at?: Date;
			reward_status: ReferralRewardStatus;
			referred_dsa_id: import('mongodb').ObjectId;
		}>;
		const decorated = await Promise.all(
			recentRaw.map(async (r) => {
				const referee = await DsaApplications.findOne(
					{ _id: r.referred_dsa_id },
					{ projection: { mobileNumber: 1 } }
				);
				const refereePlain = referee ? (await decryptUserPii(referee)) ?? referee : null;
				return {
					code: r.code,
					joined_at: r.joined_at.toISOString(),
					subscribed_at: r.subscribed_at?.toISOString() ?? null,
					reward_status: r.reward_status,
					mobile_masked: maskMobile(refereePlain?.mobileNumber)
				};
			})
		);

		const link = refCode ? `${PUBLIC_APP_BASE_URL}/r/${refCode}` : null;

		return apiOk({
			referral_code: refCode ?? null,
			referral_link: link,
			invited_count: counts.invited ?? 0,
			joined_count: counts.invited ?? 0, // every Referrals row = a signup
			pending_count: counts.pending ?? 0,
			subscribed_count: counts.credited ?? 0,
			rewards_credited: counts.credited ?? 0,
			recent: decorated
		});
	} catch (err) {
		return apiServerError(err, 'Failed to load referral stats');
	}
};
