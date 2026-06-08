/**
 * RM Analytics Page — Server Load (6.13 + 6.14)
 * ══════════════════════════════════════════════════════════════════
 * Loads policy feedback aggregates and reputation score for the RM.
 * ══════════════════════════════════════════════════════════════════
 */

import type { PageServerLoad } from './$types';
import { rmApplications, CommunicationThreads, Cases, AccuracyRatings } from '$lib/database/mongo';
import { ObjectId } from 'mongodb';
import { computePolicyFeedback } from '$lib/server/policyFeedback';
import { computeReputation } from '$lib/server/rmReputation';
import logger from '$lib/server/logger.js';
import { getLenderNameFromDomain } from '$lib/config/lenderDomains.js';
import type { PolicyFeedbackAggregate } from '$lib/types/rmPortal';
import type { RMReputationScore } from '$lib/types/rmPortal';

export const load: PageServerLoad = async ({ parent }) => {
	const parentData = await parent();
	const user = parentData.user;

	const empty = {
		feedbackAggregates: [] as PolicyFeedbackAggregate[],
		reputation: null as RMReputationScore | null,
		hasData: false
	};

	if (!user?.id) return empty;

	try {
		let rmDoc;
		try {
			rmDoc = await rmApplications.findOne({ _id: new ObjectId(user.id) });
		} catch {
			rmDoc = await rmApplications.findOne({
				mobileNumber: {
					$in: [Number(user.mobileNumber), user.mobileNumber]
				} as any
			});
		}

		if (!rmDoc?._id) return empty;

		const rmId = rmDoc._id;
		const officialEmail = rmDoc.rmOfficialEmail || (rmDoc as any).officialEmail || '';
		const rmBankName = rmDoc.bankName || getLenderNameFromDomain(officialEmail) || '';

		// Load data in parallel (with projections to limit payload)
		const [threads, ratingsRaw, threadCaseRefs] = await Promise.all([
			CommunicationThreads.find(
				{ rm_id: rmId },
				{
					projection: {
						'messages.sender_role': 1,
						'messages.created_at': 1,
						updated_at: 1,
						case_id: 1
					}
				}
			).toArray(),
			AccuracyRatings.find(
				{ rm_id: rmId },
				{
					projection: {
						category: 1,
						lender_name: 1,
						rating: 1,
						created_at: 1
					}
				}
			).toArray(),
			CommunicationThreads.find({ rm_id: rmId }, { projection: { case_id: 1 } }).toArray()
		]);

		const uniqueCaseIds = [...new Set(threadCaseRefs.map((t) => t.case_id))];
		const cases =
			uniqueCaseIds.length > 0
				? await Cases.find(
						{ case_id: { $in: uniqueCaseIds } },
						{
							projection: {
								case_id: 1,
								'lender_applications.queries.status': 1,
								'lender_applications.queries.raised_at': 1,
								'lender_applications.queries.response.responded_at': 1
							}
						}
					).toArray()
				: [];

		// Compute feedback aggregates
		const feedbackAggregates = computePolicyFeedback(
			ratingsRaw.map((r) => ({
				category: r.category,
				lender_name: r.lender_name || rmBankName,
				rating: r.rating,
				created_at: r.created_at
			}))
		);

		// Compute reputation
		const reputation = computeReputation(
			threads.map((t) => ({
				messages: t.messages.map((m) => ({
					sender_role: m.sender_role,
					created_at: m.created_at
				})),
				updated_at: t.updated_at
			})),
			cases.map((c) => ({
				lender_applications: c.lender_applications.map((la) => ({
					queries: la.queries.map((q) => ({
						status: q.status,
						raised_at: q.raised_at,
						response: q.response ? { responded_at: q.response.responded_at } : undefined
					}))
				}))
			})),
			ratingsRaw.map((r) => ({ rating: r.rating }))
		);

		return {
			feedbackAggregates,
			reputation,
			hasData: threads.length > 0 || ratingsRaw.length > 0
		};
	} catch (error) {
		logger.error({ err: error }, 'RM analytics load error');
		return empty;
	}
};
