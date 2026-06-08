/**
 * GET /api/dsa/rm-suggestions — Auto-Match RM suggestions for a DSA (6.12)
 * ═══════════════════════════════════════════════════════════════════
 * Returns top 3 RM suggestions based on city, lender, preference, reputation.
 */

import type { RequestHandler } from './$types';
import { requireRoleApi } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { rmApplications, Cases, DsaApplications } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';
import { computeAutoMatch } from '$lib/server/autoMatch.js';
import type { RMCandidate } from '$lib/server/autoMatch.js';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'dsa');
	if (denied) return denied;

	const user = locals.user!;
	let dsaOid: ObjectId;
	try {
		dsaOid = new ObjectId(user.id);
	} catch {
		return apiError('Invalid user ID');
	}

	try {
		// Get DSA profile info (city from DSA doc)
		const dsaDoc = await DsaApplications.findOne(
			{ _id: dsaOid },
			{ projection: { workingCity: 1, city: 1 } }
		);
		const dsaCity = dsaDoc?.workingCity || dsaDoc?.city || '';

		// Get lender names from DSA's cases
		const dsaCases = await Cases.find(
			{ dsa_id: dsaOid },
			{ projection: { 'lender_applications.lender_name': 1 } }
		).toArray();

		const lenderNames = new Set<string>();
		for (const c of dsaCases) {
			for (const la of c.lender_applications) {
				if (la.lender_name) lenderNames.add(la.lender_name);
			}
		}

		// Get all approved RMs as candidates
		const rmCandidates = await rmApplications
			.find(
				{ onboardingCompleted: true },
				{
					projection: {
						name: 1,
						bankName: 1,
						workingCity: 1,
						city: 1,
						preferred_dsa_ids: 1
					}
				}
			)
			.toArray();

		const suggestions = computeAutoMatch(
			{ city: dsaCity, lender_names: [...lenderNames] },
			dsaOid.toString(),
			rmCandidates as unknown as RMCandidate[]
		);

		const serialized = suggestions.map((s) => ({
			rm_id: s.rm_id.toString(),
			rm_name: s.rm_name,
			lender_name: s.lender_name,
			city: s.city || '',
			score: s.score,
			reasons: s.reasons
		}));

		return apiOk(serialized);
	} catch (error) {
		return apiServerError(error, 'Failed to compute RM suggestions');
	}
};
